/**
 * 湖州空间全画像 · MapLibre 地图（行政界 + 土地利用面，无 POI）
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  bboxFromFeatureCollection,
  HUZHOU_ADMIN_BOUNDARY_GEOJSON,
  HUZHOU_CITY_DEFAULT_CENTER,
  HUZHOU_CITY_DEFAULT_ZOOM,
  HUZHOU_CITY_OUTLINE_GEOJSON,
  HUZHOU_DEFAULT_BOUNDS,
  HUZHOU_LANDUSE_GEOJSON,
  HUZHOU_MAP_STYLE_URL,
  getLanduseFeatureBoundsByOsmId,
  HZ_CITY_OUTLINE_HALO_COLOR,
  HZ_CITY_OUTLINE_HALO_OFFSET,
  HZ_CITY_OUTLINE_HALO_WIDTH,
  HZ_CITY_OUTLINE_LINE_COLOR,
  HZ_CITY_OUTLINE_LINE_WIDTH,
  HZ_LYR_ADMIN_FILL,
  HZ_LYR_ADMIN_LINE,
  HZ_LYR_CITY_OUTLINE_HALO,
  HZ_LYR_CITY_OUTLINE_LINE,
  HZ_LYR_DISTRICT_OUTLINE_HALO,
  HZ_LYR_DISTRICT_OUTLINE_LINE,
  HZ_LYR_LANDUSE_FILL,
  HZ_LYR_LANDUSE_LINE,
  HZ_LYR_PROJECT_HIGHLIGHT_FILL,
  HZ_LYR_PROJECT_HIGHLIGHT_LINE,
  HZ_SRC_ADMIN,
  HZ_SRC_CITY_OUTLINE,
  HZ_SRC_LANDUSE,
} from '../huzhouMapConstants';
import type { HzMapProjectHighlight } from '../hzMapProjectHighlight';
import { FCLASS_LABEL_ZH } from '../hzLandUseLayers';
import {
  buildLanduseFillColorExpr,
  buildLanduseLayerKeyFilter,
  getSpaceSubLayerByKey,
  resolveVisibleLayerKeys,
} from '../hzLanduseLayerSplit';
import type { HzLayerControlState } from '../hzLayerControlState';
import {
  normalizeMapFeatureProps,
  PRIMARY_DEMO_PARCEL_ID,
  resolveParcelIdFromFeatureProps,
} from '../../huzhou-lifecycle-shared/mock/demoParcels';
import type { ParcelLifecycle } from '../../huzhou-lifecycle-shared/types';
import { HzMapVerticalToolbar } from './HzMapVerticalToolbar';
import {
  zhtBasemapStyleForKind,
  type ZhtBasemapKind,
} from '../../zonghe-taishi/zhtMapStylePresets';
import { clearMapMaxBounds, fitMapToBounds } from '../hzMapRegionCamera';
import {
  rebuildBasemapOpacityCache,
  syncBasemapOpacity,
  type BasemapOpacityCache,
} from '../hzBasemapOpacity';

export type HuzhouMapBoardProps = {
  layerControl: HzLayerControlState;
  onLayerControlChange: (next: HzLayerControlState) => void;
  /** 点击地块打开全生命周期详情（无台账时走演示案例兜底） */
  onParcelClick?: (parcelId: string) => void;
  /** 注册地块定位（详情内「在地图上定位」） */
  registerParcelFlyTo?: (fn: (parcel: ParcelLifecycle) => void) => void;
  /**
   * 演示项目地块高亮；传入该 prop 时启用（建管画像阶段联动）。
   * `null` 表示清除高亮。
   */
  projectHighlight?: HzMapProjectHighlight | null;
  /** 建管画像：启用区县范围（过滤 + 视野锁定） */
  regionScopeEnabled?: boolean;
  /** 建管画像：仅展示该区县全称的地块；null 为全市 */
  districtFilter?: string | null;
  /** 区县切换时地图视野定位（通常与 districtFilter 相同） */
  districtFocus?: string | null;
  /**
   * 预警画像等：仅展示这些 osm_id 的地块（传 `[]` 则隐藏全部土地利用面）。
   * 传入后与图层控制叠加；预警地块经 parcel.region 挂接 hzDistrictName，与空间图层同样按区县过滤。
   * 视野切换与建管画像一致（全市 / 区县 fitBounds）。
   */
  exclusiveLanduseFeatureIds?: string[];
  /** 预警画像：按 osm_id 着色（与前三未类型标签一致）；未传时沿用默认预警色 */
  exclusiveLanduseFeatureFillColors?: Record<string, string>;
  exclusiveLanduseFeatureLineColors?: Record<string, string>;
  /** 地图工具条全屏按钮下方的扩展项 */
  mapToolbarExtraAfterFullscreen?: React.ReactNode;
};

function buildPhaseHighlightFilter(highlight: HzMapProjectHighlight): maplibregl.FilterSpecification {
  const prop = highlight.phasePropertyKey ?? 'cmPhaseKey';
  return ['==', ['get', prop], highlight.phaseKey ?? ''];
}

function buildFeatureIdFilter(highlight: HzMapProjectHighlight): maplibregl.FilterSpecification {
  const key = highlight.featureKey ?? 'osm_id';
  return buildOsmIdInFilter(highlight.featureIds ?? [], key);
}

function buildOsmIdInFilter(
  featureIds: string[],
  propertyKey = 'osm_id',
): maplibregl.FilterSpecification {
  return ['in', ['to-string', ['get', propertyKey]], ['literal', featureIds]];
}

const HZ_ALERT_EXCLUSIVE_FILL = '#ff4d4f';
const HZ_ALERT_EXCLUSIVE_LINE = '#cf1322';

function buildOsmIdColorMatchExpr(
  colorById: Record<string, string> | undefined,
  fallback: string,
): maplibregl.ExpressionSpecification | string {
  const entries = Object.entries(colorById ?? {});
  if (entries.length === 0) return fallback;
  return [
    'match',
    ['to-string', ['get', 'osm_id']],
    ...entries.flatMap(([id, color]) => [id, color]),
    fallback,
  ] as maplibregl.ExpressionSpecification;
}

function appendDistrictFilter(
  base: maplibregl.FilterSpecification,
  districtName: string | null | undefined,
  propertyKey = 'hzDistrictName',
): maplibregl.FilterSpecification {
  if (!districtName) return base;
  return ['all', base, ['==', ['get', propertyKey], districtName]];
}

/** 预警画像：预警地块（osm_id + 区县）+ 可选空间图层勾选 */
function buildAlertExclusiveLandFilter(
  exclusiveIds: string[],
  layerKeys: string[],
  regionScopeOn: boolean,
  regionDistrict: string | null | undefined,
): { filter: maplibregl.FilterSpecification; showLanduse: boolean } {
  const showAlerts = exclusiveIds.length > 0;
  const showLayers = layerKeys.length > 0;
  const showLanduse = showAlerts || showLayers;
  if (!showLanduse) {
    return { filter: ['==', ['get', 'osm_id'], ''], showLanduse: false };
  }

  const parts: maplibregl.FilterSpecification[] = [];
  if (showAlerts) {
    parts.push(
      appendDistrictFilter(
        buildOsmIdInFilter(exclusiveIds),
        regionScopeOn ? regionDistrict : undefined,
      ),
    );
  }
  if (showLayers) {
    parts.push(
      appendDistrictFilter(
        buildLanduseLayerKeyFilter(layerKeys),
        regionScopeOn ? regionDistrict : undefined,
      ),
    );
  }

  const filter =
    parts.length === 1 ? parts[0]! : (['any', ...parts] as maplibregl.FilterSpecification);
  return { filter, showLanduse: true };
}

function buildAlertExclusiveFillColorExpr(
  exclusiveIds: string[],
  layers: HzLayerControlState,
  fillColorById?: Record<string, string>,
): maplibregl.ExpressionSpecification | string {
  if (exclusiveIds.length === 0) {
    return buildLanduseFillColorExpr(layers) as maplibregl.ExpressionSpecification;
  }
  const normalExpr = buildLanduseFillColorExpr(layers);
  const alertColorExpr = buildOsmIdColorMatchExpr(fillColorById, HZ_ALERT_EXCLUSIVE_FILL);
  return [
    'case',
    ['in', ['to-string', ['get', 'osm_id']], ['literal', exclusiveIds]],
    alertColorExpr,
    normalExpr,
  ] as maplibregl.ExpressionSpecification;
}

function buildAlertExclusiveLineColorExpr(
  exclusiveIds: string[],
  lineColorById?: Record<string, string>,
): maplibregl.ExpressionSpecification | string {
  if (exclusiveIds.length === 0) return '#ffffff';
  const alertLineExpr = buildOsmIdColorMatchExpr(lineColorById, HZ_ALERT_EXCLUSIVE_LINE);
  return [
    'case',
    ['in', ['to-string', ['get', 'osm_id']], ['literal', exclusiveIds]],
    alertLineExpr,
    '#ffffff',
  ] as maplibregl.ExpressionSpecification;
}

function buildAlertExclusiveLineWidthExpr(
  exclusiveIds: string[],
): maplibregl.ExpressionSpecification | number {
  if (exclusiveIds.length === 0) return 0.6;
  return [
    'case',
    ['in', ['to-string', ['get', 'osm_id']], ['literal', exclusiveIds]],
    2,
    0.6,
  ] as maplibregl.ExpressionSpecification;
}

function fitAlertParcelsBounds(map: maplibregl.Map, featureIds: string[]): boolean {
  const boundsList = featureIds
    .map(id => getLanduseFeatureBoundsByOsmId(id))
    .filter((b): b is [[number, number], [number, number]] => b != null);
  if (boundsList.length === 0) return false;
  const west = Math.min(...boundsList.map(b => b[0][0]));
  const south = Math.min(...boundsList.map(b => b[0][1]));
  const east = Math.max(...boundsList.map(b => b[1][0]));
  const north = Math.max(...boundsList.map(b => b[1][1]));
  map.fitBounds(
    [
      [west, south],
      [east, north],
    ],
    { padding: 120, duration: 600, maxZoom: 14 },
  );
  return true;
}

/** 行政界 GeoJSON 使用 properties.name（如「吴兴区」） */
function buildAdminDistrictFilter(
  districtName: string | null | undefined,
): maplibregl.FilterSpecification | null {
  if (!districtName) return null;
  return ['==', ['get', 'name'], districtName];
}

function getDistrictBounds(
  districtName: string,
): [[number, number], [number, number]] | null {
  const hit = HUZHOU_ADMIN_BOUNDARY_GEOJSON.features.filter(
    f => String(f.properties?.name ?? '') === districtName,
  );
  if (!hit.length) return null;
  return bboxFromFeatureCollection({ type: 'FeatureCollection', features: hit });
}

function buildHighlightFilter(
  highlight: HzMapProjectHighlight,
  landFilter: maplibregl.FilterSpecification,
  districtName?: string | null,
): maplibregl.FilterSpecification {
  const useExactFeature =
    !highlight.phaseKey && (highlight.featureIds?.length ?? 0) === 1;
  if (useExactFeature) {
    // 单地块定位：仅按 osm_id，不受二级图层勾选 / 区县 filter 限制
    return buildFeatureIdFilter(highlight);
  }
  const phaseOrIdFilter = highlight.phaseKey
    ? buildPhaseHighlightFilter(highlight)
    : buildFeatureIdFilter(highlight);
  const withPhase = ['all', landFilter, phaseOrIdFilter] as maplibregl.FilterSpecification;
  const district = districtName ?? highlight.districtName;
  const prop = highlight.districtPropertyKey ?? 'hzDistrictName';
  return appendDistrictFilter(withPhase, district, prop);
}

function highlightIsActive(highlight: HzMapProjectHighlight | null): highlight is HzMapProjectHighlight {
  if (!highlight) return false;
  if (highlight.phaseKey) return true;
  return (highlight.featureIds?.length ?? 0) > 0;
}

const HZ_EMPHASIS_OUTLINE_LAYER_IDS = [
  HZ_LYR_CITY_OUTLINE_HALO,
  HZ_LYR_CITY_OUTLINE_LINE,
  HZ_LYR_DISTRICT_OUTLINE_HALO,
  HZ_LYR_DISTRICT_OUTLINE_LINE,
] as const;

function raiseEmphasisOutlineLineLayers(map: maplibregl.Map) {
  const beforeHighlight = map.getLayer(HZ_LYR_PROJECT_HIGHLIGHT_FILL)
    ? HZ_LYR_PROJECT_HIGHLIGHT_FILL
    : undefined;
  for (const layerId of HZ_EMPHASIS_OUTLINE_LAYER_IDS) {
    if (!map.getLayer(layerId)) continue;
    try {
      if (beforeHighlight) map.moveLayer(layerId, beforeHighlight);
      else map.moveLayer(layerId);
    } catch {
      /* 样式切换重建中忽略 */
    }
  }
}

function applyEmphasisOutlineLinePaint(
  map: maplibregl.Map,
  haloLayerId: string,
  lineLayerId: string,
  haloOffset: number,
) {
  if (map.getLayer(haloLayerId)) {
    map.setPaintProperty(haloLayerId, 'line-width', HZ_CITY_OUTLINE_HALO_WIDTH);
    map.setPaintProperty(haloLayerId, 'line-offset', haloOffset);
    map.setPaintProperty(haloLayerId, 'line-color', HZ_CITY_OUTLINE_HALO_COLOR);
    map.setPaintProperty(haloLayerId, 'line-blur', 0.8);
    map.setPaintProperty(haloLayerId, 'line-opacity', 1);
  }
  if (map.getLayer(lineLayerId)) {
    map.setPaintProperty(lineLayerId, 'line-width', HZ_CITY_OUTLINE_LINE_WIDTH);
    map.setPaintProperty(lineLayerId, 'line-offset', 0);
    map.setPaintProperty(lineLayerId, 'line-color', HZ_CITY_OUTLINE_LINE_COLOR);
    map.setPaintProperty(lineLayerId, 'line-opacity', 1);
  }
}

function ensureProjectHighlightLayers(map: maplibregl.Map) {
  if (!map.getLayer(HZ_LYR_PROJECT_HIGHLIGHT_FILL)) {
    map.addLayer({
      id: HZ_LYR_PROJECT_HIGHLIGHT_FILL,
      type: 'fill',
      source: HZ_SRC_LANDUSE,
      layout: { visibility: 'none' },
      paint: {
        'fill-color': '#1677ff',
        'fill-opacity': 0.42,
      },
    });
  }
  if (!map.getLayer(HZ_LYR_PROJECT_HIGHLIGHT_LINE)) {
    map.addLayer({
      id: HZ_LYR_PROJECT_HIGHLIGHT_LINE,
      type: 'line',
      source: HZ_SRC_LANDUSE,
      layout: { visibility: 'none' },
      paint: {
        'line-color': '#1677ff',
        'line-width': 3,
        'line-opacity': 1,
      },
    });
  }
}

function applyProjectHighlight(
  map: maplibregl.Map,
  highlight: HzMapProjectHighlight | null,
  layers: HzLayerControlState,
  districtName?: string | null,
  exclusiveLanduseIds?: string[],
) {
  ensureProjectHighlightLayers(map);
  const layerKeys = resolveVisibleLayerKeys(layers);
  const exclusiveMode = exclusiveLanduseIds !== undefined;
  const exclusiveIdList = exclusiveLanduseIds ?? [];
  const showLanduse = exclusiveMode
    ? exclusiveIdList.length > 0 || layerKeys.length > 0
    : layerKeys.length > 0;
  const landFilter =
    layerKeys.length > 0
      ? buildLanduseLayerKeyFilter(layerKeys)
      : exclusiveIdList.length > 0
        ? buildOsmIdInFilter(exclusiveIdList)
        : (['==', ['get', 'osm_id'], ''] as maplibregl.FilterSpecification);
  const show = showLanduse && highlightIsActive(highlight);
  const vis = show ? 'visible' : 'none';
  const filter =
    show && highlight
      ? buildHighlightFilter(highlight, landFilter, districtName)
      : ['==', ['get', 'osm_id'], ''];

  for (const layerId of [HZ_LYR_PROJECT_HIGHLIGHT_FILL, HZ_LYR_PROJECT_HIGHLIGHT_LINE]) {
    if (!map.getLayer(layerId)) continue;
    map.setLayoutProperty(layerId, 'visibility', vis);
    map.setFilter(layerId, filter);
  }

  if (!show || !highlight) return;

  map.setPaintProperty(
    HZ_LYR_PROJECT_HIGHLIGHT_FILL,
    'fill-color',
    buildOsmIdColorMatchExpr(highlight.featureFillColorById, highlight.fillColor),
  );
  map.setPaintProperty(
    HZ_LYR_PROJECT_HIGHLIGHT_LINE,
    'line-color',
    buildOsmIdColorMatchExpr(highlight.featureLineColorById, highlight.lineColor),
  );

  // 高亮层始终叠在土地利用面之上
  for (const layerId of [HZ_LYR_PROJECT_HIGHLIGHT_FILL, HZ_LYR_PROJECT_HIGHLIGHT_LINE]) {
    if (map.getLayer(layerId)) map.moveLayer(layerId);
  }
}

function ensureHuzhouLayers(map: maplibregl.Map, layers: HzLayerControlState) {
  if (!map.getSource(HZ_SRC_ADMIN)) {
    map.addSource(HZ_SRC_ADMIN, { type: 'geojson', data: HUZHOU_ADMIN_BOUNDARY_GEOJSON });
  }
  if (!map.getSource(HZ_SRC_CITY_OUTLINE)) {
    map.addSource(HZ_SRC_CITY_OUTLINE, { type: 'geojson', data: HUZHOU_CITY_OUTLINE_GEOJSON });
  }
  if (!map.getSource(HZ_SRC_LANDUSE)) {
    map.addSource(HZ_SRC_LANDUSE, { type: 'geojson', data: HUZHOU_LANDUSE_GEOJSON });
  }

  if (!map.getLayer(HZ_LYR_ADMIN_FILL)) {
    map.addLayer({
      id: HZ_LYR_ADMIN_FILL,
      type: 'fill',
      source: HZ_SRC_ADMIN,
      paint: {
        'fill-color': '#1e5bb5',
        'fill-opacity': 0.06,
      },
    });
  }
  if (!map.getLayer(HZ_LYR_ADMIN_LINE)) {
    map.addLayer({
      id: HZ_LYR_ADMIN_LINE,
      type: 'line',
      source: HZ_SRC_ADMIN,
      paint: {
        'line-color': '#1e5bb5',
        'line-width': 2,
      },
    });
  }
  if (!map.getLayer(HZ_LYR_CITY_OUTLINE_HALO)) {
    map.addLayer({
      id: HZ_LYR_CITY_OUTLINE_HALO,
      type: 'line',
      source: HZ_SRC_CITY_OUTLINE,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': HZ_CITY_OUTLINE_HALO_COLOR,
        'line-width': HZ_CITY_OUTLINE_HALO_WIDTH,
        'line-offset': HZ_CITY_OUTLINE_HALO_OFFSET,
        'line-blur': 0.8,
        'line-opacity': 1,
      },
    });
  }
  if (!map.getLayer(HZ_LYR_CITY_OUTLINE_LINE)) {
    map.addLayer({
      id: HZ_LYR_CITY_OUTLINE_LINE,
      type: 'line',
      source: HZ_SRC_CITY_OUTLINE,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': HZ_CITY_OUTLINE_LINE_COLOR,
        'line-width': HZ_CITY_OUTLINE_LINE_WIDTH,
        'line-offset': 0,
        'line-opacity': 1,
      },
    });
  }
  if (!map.getLayer(HZ_LYR_DISTRICT_OUTLINE_HALO)) {
    map.addLayer({
      id: HZ_LYR_DISTRICT_OUTLINE_HALO,
      type: 'line',
      source: HZ_SRC_ADMIN,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': HZ_CITY_OUTLINE_HALO_COLOR,
        'line-width': HZ_CITY_OUTLINE_HALO_WIDTH,
        'line-offset': -HZ_CITY_OUTLINE_HALO_OFFSET,
        'line-blur': 0.8,
        'line-opacity': 1,
      },
    });
  }
  if (!map.getLayer(HZ_LYR_DISTRICT_OUTLINE_LINE)) {
    map.addLayer({
      id: HZ_LYR_DISTRICT_OUTLINE_LINE,
      type: 'line',
      source: HZ_SRC_ADMIN,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': HZ_CITY_OUTLINE_LINE_COLOR,
        'line-width': HZ_CITY_OUTLINE_LINE_WIDTH,
        'line-offset': 0,
        'line-opacity': 1,
      },
    });
  }
  raiseEmphasisOutlineLineLayers(map);
  if (!map.getLayer(HZ_LYR_LANDUSE_FILL)) {
    map.addLayer({
      id: HZ_LYR_LANDUSE_FILL,
      type: 'fill',
      source: HZ_SRC_LANDUSE,
      paint: {
        'fill-color': buildLanduseFillColorExpr(layers) as maplibregl.ExpressionSpecification,
        'fill-opacity': 0.72,
      },
    });
  }
  if (!map.getLayer(HZ_LYR_LANDUSE_LINE)) {
    map.addLayer({
      id: HZ_LYR_LANDUSE_LINE,
      type: 'line',
      source: HZ_SRC_LANDUSE,
      paint: {
        'line-color': '#ffffff',
        'line-width': 0.6,
        'line-opacity': 0.35,
      },
    });
  }
  ensureProjectHighlightLayers(map);
}

function mapCanApplyLayers(
  map: maplibregl.Map | null,
  mapIsReady: boolean,
  styleReady: boolean,
): map is maplibregl.Map {
  if (!mapIsReady || !map || !styleReady) return false;
  if (typeof map.isStyleLoaded === 'function' && !map.isStyleLoaded()) return false;
  return true;
}

/** 区县视野定位：首屏 load 后 mapIsReady 即可，勿依赖 isStyleLoaded（filter 后常短暂为 false） */
function mapReadyForRegionCamera(map: maplibregl.Map | null, mapIsReady: boolean): map is maplibregl.Map {
  return Boolean(mapIsReady && map);
}

export const HuzhouMapBoard: React.FC<HuzhouMapBoardProps> = ({
  layerControl,
  onLayerControlChange,
  onParcelClick,
  registerParcelFlyTo,
  projectHighlight,
  regionScopeEnabled,
  districtFilter,
  districtFocus,
  exclusiveLanduseFeatureIds,
  exclusiveLanduseFeatureFillColors,
  exclusiveLanduseFeatureLineColors,
  mapToolbarExtraAfterFullscreen,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapHostRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [mapIsReady, setMapIsReady] = useState(false);
  const [styleReady, setStyleReady] = useState(false);
  const [basemapKind, setBasemapKind] = useState<ZhtBasemapKind>('vector');
  const [mapTransparencyPercent, setMapTransparencyPercent] = useState(0);
  const layerControlRef = useRef(layerControl);
  const mapTransparencyRef = useRef(mapTransparencyPercent);
  const basemapOpacityCacheRef = useRef<BasemapOpacityCache>(new Map());
  const lastBasemapKindRef = useRef<ZhtBasemapKind>(basemapKind);
  const onParcelClickRef = useRef(onParcelClick);
  const projectHighlightRef = useRef(projectHighlight);
  const districtFilterRef = useRef(districtFilter);
  const districtFocusRef = useRef(districtFocus);
  const regionScopeEnabledRef = useRef(regionScopeEnabled);
  const exclusiveLanduseFeatureIdsRef = useRef(exclusiveLanduseFeatureIds);
  const exclusiveLanduseFillColorsRef = useRef(exclusiveLanduseFeatureFillColors);
  const exclusiveLanduseLineColorsRef = useRef(exclusiveLanduseFeatureLineColors);
  /** 首屏是否已应用区县/全市视野（避免 load 与 effect 重复 fit） */
  const regionCameraReadyRef = useRef(false);
  const lastRegionCameraKeyRef = useRef<string | null>(null);
  /** 预警画像：区分「区县切换」与「同区县内筛选」的视野策略 */
  const prevExclusiveDistrictKeyRef = useRef<string | null>(null);

  layerControlRef.current = layerControl;
  mapTransparencyRef.current = mapTransparencyPercent;
  onParcelClickRef.current = onParcelClick;
  projectHighlightRef.current = projectHighlight;
  districtFilterRef.current = districtFilter;
  districtFocusRef.current = districtFocus;
  regionScopeEnabledRef.current = regionScopeEnabled;
  exclusiveLanduseFeatureIdsRef.current = exclusiveLanduseFeatureIds;
  exclusiveLanduseFillColorsRef.current = exclusiveLanduseFeatureFillColors;
  exclusiveLanduseLineColorsRef.current = exclusiveLanduseFeatureLineColors;

  const regionCameraKey = (districtName: string | null | undefined) =>
    districtName?.trim() ? districtName.trim() : '__city__';

  const fitDefaultView = useCallback((instant = false) => {
    const map = mapRef.current;
    if (!map) return;
    clearMapMaxBounds(map);
    fitMapToBounds(map, HUZHOU_DEFAULT_BOUNDS, {
      scope: 'city',
      duration: instant ? 0 : 800,
      maxZoom: 11.5,
    });
    lastRegionCameraKeyRef.current = '__city__';
    regionCameraReadyRef.current = true;
  }, []);

  const applyDistrictMapScope = useCallback(
    (map: maplibregl.Map, districtName: string | null | undefined, instant = false) => {
      const key = regionCameraKey(districtName);
      if (!instant && lastRegionCameraKeyRef.current === key) return;
      lastRegionCameraKeyRef.current = key;
      regionCameraReadyRef.current = true;

      if (districtName) {
        const bounds = getDistrictBounds(districtName);
        if (!bounds) return;
        fitMapToBounds(map, bounds, {
          scope: 'district',
          districtName,
          duration: instant ? 0 : 800,
        });
        return;
      }
      clearMapMaxBounds(map);
      fitMapToBounds(map, HUZHOU_DEFAULT_BOUNDS, {
        scope: 'city',
        duration: instant ? 0 : 800,
        maxZoom: 11.5,
      });
    },
    [],
  );

  const applyLayerVisibility = useCallback((map: maplibregl.Map, layers: HzLayerControlState) => {
    const regionScopeOn = regionScopeEnabledRef.current === true;
    const regionDistrict = districtFilterRef.current;
    const exclusiveIds = exclusiveLanduseFeatureIdsRef.current;
    const exclusiveFillColors = exclusiveLanduseFillColorsRef.current;
    const exclusiveLineColors = exclusiveLanduseLineColorsRef.current;
    const exclusiveMode = exclusiveIds !== undefined;

    const layerKeys = resolveVisibleLayerKeys(layers);
    const exclusiveIdList = exclusiveIds ?? [];
    let showLanduse: boolean;
    let landFilter: maplibregl.FilterSpecification;

    if (exclusiveMode) {
      const alertLand = buildAlertExclusiveLandFilter(
        exclusiveIdList,
        layerKeys,
        regionScopeOn,
        regionDistrict,
      );
      showLanduse = alertLand.showLanduse;
      landFilter = alertLand.filter;
    } else {
      showLanduse = layerKeys.length > 0;
      landFilter = appendDistrictFilter(
        buildLanduseLayerKeyFilter(layerKeys),
        regionScopeOn ? regionDistrict : undefined,
      );
    }

    const landVis = showLanduse ? 'visible' : 'none';
    if (map.getLayer(HZ_LYR_LANDUSE_FILL)) {
      map.setLayoutProperty(HZ_LYR_LANDUSE_FILL, 'visibility', landVis);
      map.setFilter(HZ_LYR_LANDUSE_FILL, landFilter);
      map.setPaintProperty(
        HZ_LYR_LANDUSE_FILL,
        'fill-color',
        exclusiveMode
          ? buildAlertExclusiveFillColorExpr(exclusiveIdList, layers, exclusiveFillColors)
          : (buildLanduseFillColorExpr(layers) as maplibregl.ExpressionSpecification),
      );
      map.setPaintProperty(
        HZ_LYR_LANDUSE_FILL,
        'fill-opacity',
        exclusiveMode && layerKeys.length === 0 ? 0.62 : 0.72,
      );
    }
    if (map.getLayer(HZ_LYR_LANDUSE_LINE)) {
      map.setLayoutProperty(HZ_LYR_LANDUSE_LINE, 'visibility', landVis);
      map.setFilter(HZ_LYR_LANDUSE_LINE, landFilter);
      if (exclusiveMode) {
        map.setPaintProperty(
          HZ_LYR_LANDUSE_LINE,
          'line-color',
          buildAlertExclusiveLineColorExpr(exclusiveIdList, exclusiveLineColors),
        );
        map.setPaintProperty(
          HZ_LYR_LANDUSE_LINE,
          'line-width',
          buildAlertExclusiveLineWidthExpr(exclusiveIdList),
        );
        map.setPaintProperty(HZ_LYR_LANDUSE_LINE, 'line-opacity', 0.95);
      } else {
        map.setPaintProperty(HZ_LYR_LANDUSE_LINE, 'line-color', '#ffffff');
        map.setPaintProperty(HZ_LYR_LANDUSE_LINE, 'line-width', 0.6);
        map.setPaintProperty(HZ_LYR_LANDUSE_LINE, 'line-opacity', 0.35);
      }
    }

    const adminDistrictFilter = regionScopeOn ? buildAdminDistrictFilter(regionDistrict) : null;
    const adminVis =
      regionScopeOn && regionDistrict
        ? 'visible'
        : layers.adminBoundary
          ? 'visible'
          : 'none';
    const showDistrictEmphasis =
      layers.adminBoundary && regionScopeOn && regionDistrict;
    const showCityOutline =
      layers.adminBoundary && !(regionScopeOn && regionDistrict);

    const adminLineVis =
      adminVis === 'visible' && !showDistrictEmphasis ? 'visible' : 'none';
    for (const layerId of [HZ_LYR_ADMIN_FILL, HZ_LYR_ADMIN_LINE]) {
      if (!map.getLayer(layerId)) continue;
      if (layerId === HZ_LYR_ADMIN_LINE) {
        map.setLayoutProperty(layerId, 'visibility', adminLineVis);
      } else {
        map.setLayoutProperty(layerId, 'visibility', adminVis);
      }
      map.setFilter(layerId, adminDistrictFilter ?? null);
    }
    if (map.getLayer(HZ_LYR_ADMIN_LINE)) {
      map.setPaintProperty(HZ_LYR_ADMIN_LINE, 'line-width', 2);
      map.setPaintProperty(HZ_LYR_ADMIN_LINE, 'line-color', '#1e5bb5');
    }

    const cityOutlineVis = showCityOutline ? 'visible' : 'none';
    for (const layerId of [HZ_LYR_CITY_OUTLINE_HALO, HZ_LYR_CITY_OUTLINE_LINE]) {
      if (!map.getLayer(layerId)) continue;
      map.setLayoutProperty(layerId, 'visibility', cityOutlineVis);
    }

    const districtOutlineVis = showDistrictEmphasis ? 'visible' : 'none';
    for (const layerId of [HZ_LYR_DISTRICT_OUTLINE_HALO, HZ_LYR_DISTRICT_OUTLINE_LINE]) {
      if (!map.getLayer(layerId)) continue;
      map.setLayoutProperty(layerId, 'visibility', districtOutlineVis);
      map.setFilter(layerId, adminDistrictFilter ?? null);
    }

    applyEmphasisOutlineLinePaint(
      map,
      HZ_LYR_CITY_OUTLINE_HALO,
      HZ_LYR_CITY_OUTLINE_LINE,
      HZ_CITY_OUTLINE_HALO_OFFSET,
    );
    applyEmphasisOutlineLinePaint(
      map,
      HZ_LYR_DISTRICT_OUTLINE_HALO,
      HZ_LYR_DISTRICT_OUTLINE_LINE,
      -HZ_CITY_OUTLINE_HALO_OFFSET,
    );
    raiseEmphasisOutlineLineLayers(map);

    if (exclusiveMode) {
      applyProjectHighlight(
        map,
        projectHighlightRef.current ?? null,
        layers,
        districtFilterRef.current,
        exclusiveIdList,
      );
    } else if (projectHighlightRef.current !== undefined) {
      applyProjectHighlight(map, projectHighlightRef.current, layers, districtFilterRef.current);
    }
  }, []);

  const syncRegionScopeLayers = useCallback(
    (map: maplibregl.Map) => {
      if (!regionScopeEnabledRef.current) return;
      applyLayerVisibility(map, layerControlRef.current);
    },
    [applyLayerVisibility],
  );

  const syncRegionScope = useCallback(
    (map: maplibregl.Map, districtName: string | null, instant = false) => {
      if (!regionScopeEnabledRef.current) return;
      syncRegionScopeLayers(map);
      applyDistrictMapScope(map, districtName, instant);
    },
    [syncRegionScopeLayers, applyDistrictMapScope],
  );

  const syncOverlayLayers = useCallback(
    (map: maplibregl.Map, options?: { applyCamera?: boolean; instantCamera?: boolean }) => {
      ensureHuzhouLayers(map, layerControlRef.current);
      if (regionScopeEnabledRef.current) {
        syncRegionScopeLayers(map);
        if (options?.applyCamera !== false) {
          const focusName = districtFocusRef.current ?? districtFilterRef.current ?? null;
          applyDistrictMapScope(map, focusName, options?.instantCamera === true);
        }
      } else {
        applyLayerVisibility(map, layerControlRef.current);
      }
      if (projectHighlightRef.current !== undefined) {
        applyProjectHighlight(
          map,
          projectHighlightRef.current,
          layerControlRef.current,
          districtFilterRef.current,
          exclusiveLanduseFeatureIdsRef.current,
        );
      }
      basemapOpacityCacheRef.current = rebuildBasemapOpacityCache(map);
      syncBasemapOpacity(map, mapTransparencyRef.current, basemapOpacityCacheRef.current);
    },
    [applyLayerVisibility, syncRegionScopeLayers, applyDistrictMapScope],
  );

  const fitScopedView = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    lastRegionCameraKeyRef.current = null;
    if (exclusiveLanduseFeatureIdsRef.current !== undefined) {
      if (regionScopeEnabledRef.current) {
        prevExclusiveDistrictKeyRef.current = regionCameraKey(
          districtFocusRef.current ?? districtFilterRef.current ?? null,
        );
        applyDistrictMapScope(
          map,
          districtFocusRef.current ?? districtFilterRef.current ?? null,
          false,
        );
        return;
      }
      const ids = exclusiveLanduseFeatureIdsRef.current ?? [];
      if (ids.length === 0) return;
      fitAlertParcelsBounds(map, ids);
      return;
    }
    if (regionScopeEnabledRef.current) {
      const focusName = districtFocusRef.current ?? districtFilterRef.current ?? null;
      applyDistrictMapScope(map, focusName || null, false);
      return;
    }
    fitDefaultView(false);
  }, [applyDistrictMapScope, fitDefaultView]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const map = new maplibregl.Map({
      container: el,
      style: HUZHOU_MAP_STYLE_URL,
      center: HUZHOU_CITY_DEFAULT_CENTER,
      zoom: HUZHOU_CITY_DEFAULT_ZOOM,
      attributionControl: { compact: true },
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    mapRef.current = map;

    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');

    const onLoad = () => {
      const instantCamera = true;
      syncOverlayLayers(map, { instantCamera });
      if (!regionScopeEnabledRef.current) {
        fitDefaultView(instantCamera);
      }
      setStyleReady(true);
      setMapIsReady(true);
    };

    const onStyleLoad = () => {
      syncOverlayLayers(map);
      setStyleReady(true);
    };

    map.once('load', onLoad);
    map.on('style.load', onStyleLoad);

    const onLanduseFeatureClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      const f = e.features?.[0];
      if (!f?.properties) return;
      const props = normalizeMapFeatureProps(f.properties);

      if (onParcelClickRef.current) {
        const linkedId = resolveParcelIdFromFeatureProps(props);
        const parcelId = linkedId ?? PRIMARY_DEMO_PARCEL_ID;
        popupRef.current?.remove();
        onParcelClickRef.current(parcelId);
        return;
      }

      const fclass = String(props.fclass ?? '');
      const name = props.name ? String(props.name) : '';
      const layerKey = String(props.hzLayerKey ?? '');
      const sub = getSpaceSubLayerByKey(layerKey);
      const label = sub?.label ?? (FCLASS_LABEL_ZH[fclass] ?? (fclass || '未知'));
      const district = props.hzDistrictName ? String(props.hzDistrictName) : '';
      const street = props.hzStreetName ? String(props.hzStreetName) : '';
      const adminLine =
        district || street
          ? `<br/><span style="color:#666;font-size:12px">${[district, street].filter(Boolean).join(' · ')}</span>`
          : '';
      popupRef.current?.remove();
      popupRef.current = new maplibregl.Popup({ closeButton: true, maxWidth: '260px' })
        .setLngLat(e.lngLat)
        .setHTML(
          `<div class="hz-map-popup"><strong>${label}</strong>${adminLine}${name ? `<br/>${name}` : ''}<br/><span style="color:#888;font-size:12px">接入详情组件后，点击地块将打开全生命周期弹窗</span></div>`,
        )
        .addTo(map);
    };

    const landuseClickLayers = [HZ_LYR_LANDUSE_FILL, HZ_LYR_PROJECT_HIGHLIGHT_FILL] as const;
    landuseClickLayers.forEach(layerId => {
      map.on('click', layerId, onLanduseFeatureClick);
      map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
      });
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(el);

    return () => {
      setMapIsReady(false);
      setStyleReady(false);
      regionCameraReadyRef.current = false;
      lastRegionCameraKeyRef.current = null;
      popupRef.current?.remove();
      map.off('style.load', onStyleLoad);
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅挂载一次
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapCanApplyLayers(map, mapIsReady, styleReady)) return;
    if (regionScopeEnabled) {
      syncRegionScopeLayers(map);
      return;
    }
    applyLayerVisibility(map, layerControl);
  }, [layerControl, mapIsReady, styleReady, regionScopeEnabled, applyLayerVisibility, syncRegionScopeLayers]);

  useEffect(() => {
    if (exclusiveLanduseFeatureIds !== undefined) {
      const map = mapRef.current;
      if (mapCanApplyLayers(map, mapIsReady, styleReady)) {
        applyLayerVisibility(map, layerControl);
      }
      return;
    }
    if (projectHighlight === undefined) return;
    const map = mapRef.current;
    if (!mapCanApplyLayers(map, mapIsReady, styleReady)) return;
    applyProjectHighlight(
      map,
      projectHighlight,
      layerControl,
      districtFilter,
      exclusiveLanduseFeatureIds,
    );
  }, [
    exclusiveLanduseFeatureIds,
    exclusiveLanduseFeatureFillColors,
    exclusiveLanduseFeatureLineColors,
    projectHighlight,
    layerControl,
    districtFilter,
    mapIsReady,
    styleReady,
    applyLayerVisibility,
  ]);

  useEffect(() => {
    if (exclusiveLanduseFeatureIds === undefined) return;
    const map = mapRef.current;
    if (!mapReadyForRegionCamera(map, mapIsReady)) return;

    const ids = exclusiveLanduseFeatureIds ?? [];
    const focusName = districtFocus ?? districtFilter ?? null;
    const districtKey = regionCameraKey(focusName);

    if (regionScopeEnabled) {
      const districtChanged = prevExclusiveDistrictKeyRef.current !== districtKey;
      prevExclusiveDistrictKeyRef.current = districtKey;
      if (districtChanged) return;

      if (ids.length === 0) {
        applyDistrictMapScope(map, focusName, false);
        return;
      }
      fitAlertParcelsBounds(map, ids);
      return;
    }

    if (ids.length === 0) return;
    fitAlertParcelsBounds(map, ids);
  }, [
    exclusiveLanduseFeatureIds,
    districtFilter,
    districtFocus,
    regionScopeEnabled,
    mapIsReady,
    applyDistrictMapScope,
  ]);

  /** 建管 / 预警区县切换：过滤图层 + 视野定位 */
  useEffect(() => {
    if (!regionScopeEnabled) return;
    const map = mapRef.current;
    if (!mapReadyForRegionCamera(map, mapIsReady)) return;
    const focusName = districtFocus ?? districtFilter ?? null;
    const key = regionCameraKey(focusName);
    const instant = !regionCameraReadyRef.current;
    if (!instant && lastRegionCameraKeyRef.current === key) return;
    syncRegionScope(map, focusName, instant);
  }, [
    regionScopeEnabled,
    districtFilter,
    districtFocus,
    mapIsReady,
    syncRegionScope,
    exclusiveLanduseFeatureIds,
  ]);

  useEffect(() => {
    if (!registerParcelFlyTo) return;
    const flyToParcel = (parcel: ParcelLifecycle) => {
      const map = mapRef.current;
      if (!map) return;
      const featureId = parcel.mapFeatureId?.trim();
      const bounds =
        (featureId ? getLanduseFeatureBoundsByOsmId(featureId) : null) ??
        (parcel.mapBounds
          ? ([
              [parcel.mapBounds[0][0], parcel.mapBounds[0][1]],
              [parcel.mapBounds[1][0], parcel.mapBounds[1][1]],
            ] as [[number, number], [number, number]])
          : null);
      if (!bounds) return;
      map.fitBounds(bounds, { padding: 80, duration: 800, maxZoom: 14 });
    };
    registerParcelFlyTo(flyToParcel);
    return () => registerParcelFlyTo(() => {});
  }, [mapIsReady, registerParcelFlyTo]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapCanApplyLayers(map, mapIsReady, styleReady)) return;
    if (basemapOpacityCacheRef.current.size === 0) {
      basemapOpacityCacheRef.current = rebuildBasemapOpacityCache(map);
    }
    syncBasemapOpacity(map, mapTransparencyPercent, basemapOpacityCacheRef.current);
  }, [mapTransparencyPercent, mapIsReady, styleReady]);

  /** 仅切换底图样式；勿把 layerControl 放进依赖，否则会反复 setStyle 导致行政界闪动 */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapIsReady) return;
    if (lastBasemapKindRef.current === basemapKind) return;
    lastBasemapKindRef.current = basemapKind;
    setStyleReady(false);
    map.setStyle(zhtBasemapStyleForKind(basemapKind));
  }, [mapIsReady, basemapKind]);

  return (
    <div className="zht-map-shell hz-map-shell">
      <div className="zht-maplibre-stack hz-maplibre-stack" ref={stackRef}>
        <HzMapVerticalToolbar
          mapRef={mapRef}
          mapIsReady={mapIsReady}
          mapHostRef={mapHostRef}
          fullscreenTargetRef={stackRef}
          layerControl={layerControl}
          onLayerControlChange={onLayerControlChange}
          onResetView={fitScopedView}
          basemapKind={basemapKind}
          onBasemapKindChange={setBasemapKind}
          mapTransparencyPercent={mapTransparencyPercent}
          onMapTransparencyPercentChange={setMapTransparencyPercent}
          extraAfterFullscreen={mapToolbarExtraAfterFullscreen}
        />
        <div className="zht-maplibre-host hz-maplibre-host" ref={mapHostRef}>
          <div className="hz-maplibre-canvas-wrap" ref={containerRef} />
        </div>
      </div>
    </div>
  );
};
