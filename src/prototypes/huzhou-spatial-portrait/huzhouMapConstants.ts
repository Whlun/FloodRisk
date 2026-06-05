/**
 * 湖州市空间全画像 · 地图常量与图层 id
 */
import type { Feature, FeatureCollection } from 'geojson';
import { getParcelById, MAP_FEATURE_PARCEL_IDS } from '../huzhou-lifecycle-shared/mock/demoParcels';
import { PARK_MAPLIBRE_STYLE_URL } from '../韶山水环境系统管理/park-boundary-maplibre';
import adminBoundaryRaw from './assets/geojson/huzhou-admin-boundary.geojson?raw';
import cityOutlineRaw from './assets/geojson/huzhou-city-outline.geojson?raw';
/** 用户提供：湖州土地利用测试数据（更新时覆盖 assets/geojson/huzhou-landuse-test-data.geojson） */
import landuseTestDataRaw from './assets/geojson/huzhou-landuse-test-data.geojson?raw';
import { assignCmPhaseKey } from './hzCmPhaseAssign';
import { splitLanduseByLayerTree } from './hzLanduseLayerSplit';

function enrichLanduseWithParcelIds(fc: FeatureCollection): FeatureCollection {
  return {
    ...fc,
    features: fc.features.map(f => {
      const osmId = f.properties?.osm_id != null ? String(f.properties.osm_id) : '';
      const parcelId = MAP_FEATURE_PARCEL_IDS[osmId];
      if (!parcelId) return f;
      return {
        ...f,
        properties: { ...f.properties, parcelId },
      };
    }),
  };
}

export const HUZHOU_MAP_STYLE_URL = PARK_MAPLIBRE_STYLE_URL;

export const HUZHOU_ADMIN_BOUNDARY_GEOJSON = JSON.parse(adminBoundaryRaw) as FeatureCollection;
/** 市域外轮廓（五区县 union 外环，仅描边；区县内部界线仍用 admin 源） */
export const HUZHOU_CITY_OUTLINE_GEOJSON = JSON.parse(cityOutlineRaw) as FeatureCollection;
const HUZHOU_LANDUSE_RAW_GEOJSON = enrichLanduseWithParcelIds(
  JSON.parse(landuseTestDataRaw) as FeatureCollection,
);

function enrichLanduseWithCmPhaseKey(fc: FeatureCollection): FeatureCollection {
  return {
    ...fc,
    features: fc.features.map((f, index) => {
      const osmId = f.properties?.osm_id != null ? String(f.properties.osm_id) : `anon-${index}`;
      return {
        ...f,
        properties: {
          ...f.properties,
          cmPhaseKey: assignCmPhaseKey(osmId),
        },
      };
    }),
  };
}

/** 台账地块：parcel.region → hzDistrictName，与顶栏区县 / 预警列表 / 地图 filter 同源挂接 */
function enrichLanduseWithParcelRegion(fc: FeatureCollection): FeatureCollection {
  return {
    ...fc,
    features: fc.features.map(f => {
      const parcelId = f.properties?.parcelId;
      if (typeof parcelId !== 'string' || !parcelId) return f;
      const region = getParcelById(parcelId)?.region?.trim();
      if (!region) return f;
      return {
        ...f,
        properties: { ...f.properties, hzDistrictName: region },
      };
    }),
  };
}

/** 区县 → 虚拟街道片区 → 格网碎面 → 二级 hzLayerKey + 建管阶段 cmPhaseKey */
export const HUZHOU_LANDUSE_GEOJSON = enrichLanduseWithParcelRegion(
  enrichLanduseWithCmPhaseKey(
    splitLanduseByLayerTree(HUZHOU_LANDUSE_RAW_GEOJSON, HUZHOU_ADMIN_BOUNDARY_GEOJSON),
  ),
);

export const HZ_LAYER_PREFIX = 'hz-';

export const HZ_SRC_ADMIN = `${HZ_LAYER_PREFIX}src-admin`;
export const HZ_SRC_CITY_OUTLINE = `${HZ_LAYER_PREFIX}src-city-outline`;
export const HZ_SRC_LANDUSE = `${HZ_LAYER_PREFIX}src-landuse`;

export const HZ_LYR_ADMIN_FILL = `${HZ_LAYER_PREFIX}lyr-admin-fill`;
export const HZ_LYR_ADMIN_LINE = `${HZ_LAYER_PREFIX}lyr-admin-line`;
/** 湖州市域外轮廓双层描边（仅外环，不作用于区县内部界线） */
export const HZ_LYR_CITY_OUTLINE_HALO = `${HZ_LAYER_PREFIX}lyr-city-outline-halo`;
export const HZ_LYR_CITY_OUTLINE_LINE = `${HZ_LAYER_PREFIX}lyr-city-outline-line`;
/** 选中区县时的外轮廓（与市域同样式；源 polygon 为 CW，光晕 offset 取反） */
export const HZ_LYR_DISTRICT_OUTLINE_HALO = `${HZ_LAYER_PREFIX}lyr-district-outline-halo`;
export const HZ_LYR_DISTRICT_OUTLINE_LINE = `${HZ_LAYER_PREFIX}lyr-district-outline-line`;

export const HZ_CITY_OUTLINE_LINE_COLOR = '#1677ff';
/** 外轮廓外侧光晕（CCW 外环 + 正 offset，不向内渗透） */
export const HZ_CITY_OUTLINE_HALO_COLOR = 'rgba(22, 119, 255, 0.42)';
export const HZ_CITY_OUTLINE_HALO_WIDTH = 7;
export const HZ_CITY_OUTLINE_HALO_OFFSET = HZ_CITY_OUTLINE_HALO_WIDTH / 2;
export const HZ_CITY_OUTLINE_LINE_WIDTH = 3.5;
export const HZ_LYR_LANDUSE_FILL = `${HZ_LAYER_PREFIX}lyr-landuse-fill`;
export const HZ_LYR_LANDUSE_LINE = `${HZ_LAYER_PREFIX}lyr-landuse-line`;
/** 建管画像等：按阶段高亮演示项目地块 */
export const HZ_LYR_PROJECT_HIGHLIGHT_FILL = `${HZ_LAYER_PREFIX}lyr-project-hl-fill`;
export const HZ_LYR_PROJECT_HIGHLIGHT_LINE = `${HZ_LAYER_PREFIX}lyr-project-hl-line`;

/** 湖州全市默认视野（与 `fitMapToBounds` city 范围一致，避免刷新后再动画缩放） */
export const HUZHOU_CITY_DEFAULT_CENTER: [number, number] = [120.086, 30.894];
export const HUZHOU_CITY_DEFAULT_ZOOM = 10.2;

/** @deprecated 使用 HUZHOU_CITY_DEFAULT_* */
export const HUZHOU_FALLBACK_CENTER = HUZHOU_CITY_DEFAULT_CENTER;
/** @deprecated 使用 HUZHOU_CITY_DEFAULT_* */
export const HUZHOU_FALLBACK_ZOOM = HUZHOU_CITY_DEFAULT_ZOOM;

export type HuzhouSpaceMode = 'planned' | 'utilized' | 'available';

export function bboxFromFeatureCollection(fc: FeatureCollection): [[number, number], [number, number]] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const walkCoords = (coords: unknown): void => {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      const [x, y] = coords as [number, number];
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      return;
    }
    coords.forEach(walkCoords);
  };

  fc.features.forEach(f => {
    if (!f.geometry) return;
    walkCoords((f.geometry as { coordinates: unknown }).coordinates);
  });

  if (!Number.isFinite(minX)) {
    return [
      [HUZHOU_FALLBACK_CENTER[0] - 0.5, HUZHOU_FALLBACK_CENTER[1] - 0.5],
      [HUZHOU_FALLBACK_CENTER[0] + 0.5, HUZHOU_FALLBACK_CENTER[1] + 0.5],
    ];
  }
  return [
    [minX, minY],
    [maxX, maxY],
  ];
}

export const HUZHOU_DEFAULT_BOUNDS = bboxFromFeatureCollection(HUZHOU_ADMIN_BOUNDARY_GEOJSON);

/** 按 osm_id 取土地利用要素（详情图形 Tab / 高亮） */
export function getLanduseFeatureByOsmId(osmId: string): Feature | null {
  const id = osmId.trim();
  if (!id) return null;
  return (
    HUZHOU_LANDUSE_GEOJSON.features.find(f => String(f.properties?.osm_id ?? '') === id) ?? null
  );
}

/** 按 osm_id 取土地利用面外接矩形（项目卡定位 / 高亮与 GeoJSON 对齐） */
export function getLanduseFeatureBoundsByOsmId(
  osmId: string,
): [[number, number], [number, number]] | null {
  const feature = getLanduseFeatureByOsmId(osmId);
  if (!feature) return null;
  return bboxFromFeatureCollection({ type: 'FeatureCollection', features: [feature] });
}
