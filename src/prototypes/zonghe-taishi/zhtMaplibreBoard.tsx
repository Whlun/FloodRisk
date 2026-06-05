/**
 * 综合态势 · MapLibre 地图区（与页面其它 UI 解耦）
 *
 * 规范来源：https://github.com/maplibre/maplibre-agent-skills
 * 本仓库同步副本：`skills-lock.json` → `maplibre/maplibre-agent-skills` → `.agents/skills/maplibre-*`
 *
 * 底图：**默认** 为 **OpenFreeMap Liberty**（与工业园区浅色矢量一致）；**影像** 为演示栅格（Esri World Imagery，正式可换合规源）。地图样式：**地图透明度**（0 不透明、100 全透）→ **`map.getCanvas()`** CSS **`opacity = 1 - pct/100`**（整块 WebGL 画布；**韶山行政界等同 canvas 的 WebGL** 会一起变淡；**DOM Marker** 与 canvas 同级，**不受**滑块）。**ScaleControl** 在控件层不受影响。中心与默认缩放与园区导出常量一致。**默认**叠绘 **韶山市行政边界线**（`zhtShaoshanCityBoundary.ts` GeoJSON + **`line`** 层，湘潭蓝 `#1e5bb5`）。**分析看板**：全量 **设施 / 监测** DOM 圆点 + 可选 **POI 提示板**（**仅**水环境 POI，由图层控制 + **POI提示配置**）；**行政区划名称**提示为独立 Marker，**非 POI**、**不受 POI提示配置**，仅图层「行政区划 / 零直排」；**监测类**提示板：**站点名称**与设施共用 **「标题显示」**（`mon.title` 占位），**监测指标**由 **「数值显示」** 控制（最多 **`ZHT_MONITOR_POI_HINT_METRICS_MAX`** 行）；有条件/空间查询结果时，命中项叠 **橙圈+序号**，非台账点用 **WebGL 橙点**。**地图搜索面板打开**（`mapSearchPanelOpen`）：默认隐藏全量台账/监测；有 **`searchMapOverlay.results`** 时 **仅结果**：**设施 / 监测** 叠 **POI 提示板 + 台账圆点（命中橙态）**；其它统一点位在开启设施类提示标题时叠 **简要标题 + 橙点**，否则 **居中橙色序号 Marker**。**例外**：**空间 + 数据原点 + 尚无覆盖层**（`mapSearchShowDefaultPoiMarkers`）时恢复全量 DOM/POI。此「仅结果」模式 **不**叠 WebGL 结果点。空间查询另绘测地圆与原点。`spatialMapPickActive` 时选原点穿透 DOM。点位详情 **Modal** 的 **`styles` / 宽度** 与 **`韶山水环境设施管理系统/index.tsx`** 列表详情对齐；非台账内容用 **`detail-section` + `Descriptions`**（`facility-detail-panel.css`）。
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DescriptionsProps } from 'antd';
import { Button, Descriptions, Modal } from 'antd';
import { DetailTabsIfMultiple } from '../shared/detailTabsIfMultiple';
import { LeftOutlined } from '@ant-design/icons';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  PumpDetailContent,
  OutletDetailContent,
  PlantDetailContent,
} from '../韶山水环境设施管理系统/facility-pump-outlet-plant-details';
import { WaterQualityStationMonitoringTabContent } from '../韶山水环境设施管理系统/pipe-node-monitoring';
import { buildRelatedFacilityDetailModalPack } from '../韶山水环境设施管理系统/facility-linked-outlet-related-detail';
import type { LinkedOutletBackrefRow } from '../韶山水环境设施管理系统/facility-linked-outlet-backrefs';
import type { OutletResponsiblePartyRecord } from '../韶山水环境设施管理系统/facility-outlet-responsible-data';
import { OutletResponsiblePartyDetailContent } from '../韶山水环境设施管理系统/facility-outlet-responsible-view';
import { DischargerDetailContent } from '../韶山水环境设施管理系统/facility-discharger-module';
import type { PsDischargerRecord } from '../韶山水环境设施管理系统/facility-discharger-data';
import { dischargerDemoData, dischargerHasLinkedIotMonitor } from '../韶山水环境设施管理系统/facility-discharger-data';
import {
  pumpStationData,
  outletData,
  plantData,
} from '../韶山水环境设施管理系统/facility-points-data';
import { PARK_MAPLIBRE_DEFAULT_CENTER, PARK_MAPLIBRE_DEFAULT_ZOOM } from '../韶山水环境系统管理/park-boundary-maplibre';
import { zhtBasemapStyleForKind, type ZhtBasemapKind, ZHT_DEFAULT_VECTOR_STYLE_URL } from './zhtMapStylePresets';
import {
  zhtDetailModalStyles as detailModalStyles,
  ZHT_FACILITY_DETAIL_MODAL_WIDTH,
  zhtResolveDetailModalContainer,
} from './zhtDetailModalShared';
import { AddrWgs84DetailMap } from '../shared/addrWgs84MapFormBridge';
import { RiverGuardAffairDetailPanels } from '../生态整治/riverGuardAffairDetailPanels';
import { EcoProjectArchiveReadonlyDetail } from '../生态整治/ecoProjectArchiveReadonlyDetail';
import { LakeWaterBodyReadonlyDetailContent } from '../生态整治/lakeWaterBodyReadonlyDetail';
import { RiverSectionReadonlyDetailContent } from '../生态整治/riverSectionReadonlyDetail';
import { RiverChannelReadonlyDetailContent } from '../生态整治/riverChannelReadonlyDetail';
import { RiverChiefContactReadonlyDetailContent } from '../生态整治/riverChiefContactReadonlyDetail';
import {
  initialLakeWaterBodyData,
  initialRiverChiefContacts,
  initialRiverChannelMasterData,
  initialRiverGuardAffairs,
  initialRiverSectionData,
} from '../生态整治/riverChiefDb4401';
import { HydroReservoirReadonlyDetailContent } from '../韶山水环境系统管理/hydroReservoirReadonlyDetail';
import {
  HydroHillpondReadonlyDetailContent,
  HydroLeveeReadonlyDetailContent,
  HydroPolderReadonlyDetailContent,
  HydroSluiceReadonlyDetailContent,
  HydroWaterGateReadonlyDetailContent,
  HydroWeirReadonlyDetailContent,
} from '../韶山水环境系统管理/configHydroReadonlyDetails';
import {
  hillpondInitial,
  hydroInitial,
  leveeInitial,
  polderInitial,
  sluiceInitial,
  waterGateInitial,
  weirInitial,
} from '../韶山水环境系统管理/config-center-data';
import {
  EmgEmergencyPlanReadonlyMapDetailContent,
  EmgEnterpriseReadonlyMapDetailContent,
  EmgExpertReadonlyMapDetailContent,
  EmgSocialSupplyPointReadonlyMapDetailContent,
  EmgSupplyRowReadonlyMapDetailContent,
  EmgTeamReadonlyMapDetailContent,
} from '../应急协同/emgCoordReadonlyMapDetails';
import { initialRiskData } from '../应急协同/riskIdentification';
import { EmergencyEventMapReadonlyDetailContent } from '../应急协同/emergencyEventMapReadonlyDetail';
import { initialEmergencyEvents } from '../应急协同/emergencyEventInitialData';
import { initialEcoProjectArchiveData } from '../生态整治/eco-project-archive-demo';
import type { ZhtStatDrawerMapFocus, ZhtStatDrawerPeekPoi, ZhtStatDrawerPoiClick } from './zhtLeftStatDrawerData';
import { ZhtMapVerticalToolbar } from './zhtMapVerticalToolbar';
import {
  ZHT_POI_HINT_FONT_PX,
  ZHT_POI_HINT_UI_DEFAULTS,
  zhtPoiHintFontPx,
  type ZhtPoiHintFontPreset,
} from './zhtPoiHintFont';
import {
  ZHT_MONITORING_POI_DEMO,
  ZHT_MONITOR_POI_HINT_METRICS_MAX,
  deriveMonitoringPoiDisplayState,
  mergeMonitoringPoiDemoWithIotOverrides,
  monitoringMetricRowHasRealtimeData,
  monitoringExplicitNoLinkedIot,
  monitoringPoiHasRealtimeMetrics,
  registerMonitoringMapIotOverrides,
  zhtMonitorMetricNumClass,
  type ZhtMonitorMetricRow,
  type ZhtMonitoringPoiDemo,
} from './zhtPoiMonitoringDemo';
import {
  facilityHintMetricRowHasRealtimeData,
  getFacilityHintMetricRows,
  getGenericWaterIotHintRowsFromSeed,
  type ZhtFacilityHintMetricRow,
} from './zhtFacilityPoiHintMetrics';
import { unifiedPointLedgerPoiHintMetricBlock, ZHT_UNIFIED_LEDGER_POI_HINT_MAX } from './zhtUnifiedPointPoiHintLedgerMetrics';
import { ZHT_ADMIN_DIVISION_HINTS_DEMO, type ZhtAdminDivisionHintDemo } from './zhtAdminDivisionHints';
import { PollutionSourceDetailBody } from './zhtPollutionSourceDetail';
import { appendPollutionPoiDotIcon } from './zhtPollutionPoiDotIcons';
import {
  ZHT_POLLUTION_KIND_LABEL,
  getPollutionMapPointsByKind,
  type ZhtPollutionMapPoint,
  type ZhtPollutionSourceKind,
} from './zhtPollutionSourceLayerData';
import { findFacilityLedgerRecord, registerFacilityMapLedgerMerge } from './zhtFacilityMapLedgerMerge';
import { waterEnvPoiLayerControlSlice, type ZhtLayerControlState } from './zhtLayerControlState';
import {
  deriveDisplayStateForUnifiedPoint,
  deriveFacilityDisplayState,
  facilityPassesWaterEnvLayerOrPeek,
  getWaterEnvCategoryForUnifiedPoint,
  monitorDemoPassesWaterEnvLayerOrPeek,
  monitorDemoToDisplayState,
  unifiedPointPassesWaterEnvLayerOrPeek,
  type ZhtPoiDisplayState,
  type ZhtWaterEnvCategoryId,
} from './zhtWaterEnvPoiMeta';
import { appendWaterEnvPoiDotIcon } from './zhtWaterEnvPoiDotIcons';
import {
  getZhtSearchPointMapCoordinate,
  getZhtUnifiedSearchPointsCached,
  parseZhtFacilityUnifiedSearchId,
  parseZhtMonitorUnifiedSearchId,
  parseZhtOutletResponsibleUnifiedSearchId,
  zhtFacilityUnifiedSearchId,
  zhtMonitorUnifiedSearchId,
  zhtSearchOverlayMarkerLngLats,
  type ZhtUnifiedSearchPoint,
} from './zhtSearchUnifiedData';
import { ZhtOutletResponsibleMapDetail } from './zhtOutletResponsibleMapDetail';
import { outletResponsiblePartyInitial } from '../韶山水环境设施管理系统/facility-outlet-responsible-data';
import { buildSectionTraceAnalysis } from './zhtSectionTraceAnalysisData';
import { ZhtSectionTraceAnalysisPanel } from './zhtSectionTraceAnalysisPanel';
import { getUnifiedPointLedgerDescriptionSections } from './zhtUnifiedPointDetailLedger';
import {
  buildGeodesicCirclePolygon,
  isSpatialQueryPreviewEqualToCommitted,
  spatialHitPropsToUnifiedPoint,
  type ZhtSearchMapOverlay,
  type ZhtSpatialQueryPreview,
} from './zhtSpatialSearchGeo';
import { ZHT_SHAOSHAN_CITY_BOUNDARY_GEOJSON } from './zhtShaoshanCityBoundary';

type DetailTitleBadge = { label: string; tone?: 'i' | 'ii' | 'iii' | 'iv' | 'v' | 'bad-v' };

function waterQualityClassTone(klass: string | undefined): DetailTitleBadge['tone'] {
  switch (klass) {
    case 'I类':
      return 'i';
    case 'II类':
      return 'ii';
    case 'III类':
      return 'iii';
    case 'IV类':
      return 'iv';
    case 'V类':
      return 'v';
    case '劣V类':
      return 'bad-v';
    default:
      return undefined;
  }
}

/** 空间查询地图覆盖（圆、原点、序号点） */
const SRC_SR_CIRCLE = 'zht-src-spatial-circle';
const SRC_SR_ORIGIN = 'zht-src-spatial-origin';
const SRC_SR_RESULTS = 'zht-src-spatial-results';
const LYR_SR_FILL = 'zht-lyr-spatial-circle-fill';
const LYR_SR_LINE = 'zht-lyr-spatial-circle-line';
const LYR_SR_ORIGIN = 'zht-lyr-spatial-origin';
const LYR_SR_RES_PT = 'zht-lyr-spatial-res-pt';
const LYR_SR_RES_TX = 'zht-lyr-spatial-res-txt';

/** 与 OpenFreeMap Liberty 的 glyphs 栈一致，避免未声明 text-font 时回退字体发虚、边缘锯齿感重 */
const SPATIAL_RES_TEXT_FONT: string[] = ['Noto Sans Bold'];

const SPATIAL_RESULT_LAYERS = [LYR_SR_RES_TX, LYR_SR_RES_PT] as const;
const SPATIAL_RANGE_LAYERS = [LYR_SR_ORIGIN, LYR_SR_LINE, LYR_SR_FILL] as const;
const SPATIAL_RESULT_SOURCES: readonly [typeof SRC_SR_RESULTS] = [SRC_SR_RESULTS] as const;
const SPATIAL_RANGE_SOURCES: readonly [typeof SRC_SR_CIRCLE, typeof SRC_SR_ORIGIN] = [SRC_SR_CIRCLE, SRC_SR_ORIGIN] as const;

/** 空间要素查询「仅预览」图层（与查询结果覆盖 id 分离，避免互相 remove） */
const SRC_SQ_PREVIEW_CIRCLE = 'zht-src-spatial-query-preview-circle';
const SRC_SQ_PREVIEW_ORIGIN = 'zht-src-spatial-query-preview-origin';
const LYR_SQ_PREVIEW_FILL = 'zht-lyr-spatial-query-preview-fill';
const LYR_SQ_PREVIEW_LINE = 'zht-lyr-spatial-query-preview-line';
const LYR_SQ_PREVIEW_ORIGIN = 'zht-lyr-spatial-query-preview-origin';
const SQ_PREVIEW_LAYERS = [LYR_SQ_PREVIEW_ORIGIN, LYR_SQ_PREVIEW_LINE, LYR_SQ_PREVIEW_FILL] as const;
const SQ_PREVIEW_SOURCES = [SRC_SQ_PREVIEW_ORIGIN, SRC_SQ_PREVIEW_CIRCLE] as const;

/** 韶山市行政边界（底图叠面 + 线；与查询覆盖层 id 分离） */
const SRC_ZHT_SHAOSHAN_BOUNDARY = 'zht-src-shaoshan-city-boundary';
/** 乡镇 MultiPolygon 填色：低缩放「全市块面」高不透明度，放大后渐隐以突出底图瓦片 */
const LYR_ZHT_SHAOSHAN_ADM_FILL = 'zht-lyr-shaoshan-adm-fill';
const LYR_ZHT_SHAOSHAN_BOUNDARY = 'zht-lyr-shaoshan-city-boundary-line';

/**
 * 乡镇填色：比例尺放大（zoom 升高）时渐隐；MapLibre `interpolate` / linear 夹逼。
 * 行政区划 **DOM 提示板** 不用同色阶数值兜底：**初始化默认视野要不透明**，仅在 zoom **大于** `PARK_MAPLIBRE_DEFAULT_ZOOM` 时按行政面相对变淡（见 `zhtShaoshanAdmHintBoardOpacityAtZoom`）。
 */
const ZHT_SHAOSHAN_ADM_FILL_ZOOM_STOPS: ReadonlyArray<readonly [number, number]> = [
  [10, 0.58],
  [11.2, 0.52],
  [12.1, 0.32],
  [12.8, 0.14],
  [13.35, 0],
  [18, 0],
];

/** 与 `ZHT_SHAOSHAN_ADM_FILL_OPACITY` 图层表达式数值一致 */
function zhtShaoshanAdmFillOpacityAtZoom(zoom: number): number {
  const stops = ZHT_SHAOSHAN_ADM_FILL_ZOOM_STOPS;
  if (stops.length === 0) return 1;
  const [zFirst, vFirst] = stops[0]!;
  if (zoom <= zFirst) return vFirst;
  const [zLast, vLast] = stops[stops.length - 1]!;
  if (zoom >= zLast) return vLast;
  for (let i = 0; i < stops.length - 1; i++) {
    const [za, va] = stops[i]!;
    const [zb, vb] = stops[i + 1]!;
    if (zoom <= zb) {
      const t = (zoom - za) / (zb - za);
      return va + t * (vb - va);
    }
  }
  return vLast;
}

/**
 * 行政区划提示板 CSS opacity：**默认视野（及更小 zoom）为 1（不透明）**；
 * zoom 高于 `PARK_MAPLIBRE_DEFAULT_ZOOM` 时，按行政面 fill-opacity **相对默认 zoom 的比值** 衰减（与面色趋势一致，但初始化不与面色同透）。
 */
function zhtShaoshanAdmHintBoardOpacityAtZoom(zoom: number): number {
  const fill = zhtShaoshanAdmFillOpacityAtZoom(zoom);
  const ref = zhtShaoshanAdmFillOpacityAtZoom(PARK_MAPLIBRE_DEFAULT_ZOOM);
  if (ref < 1e-6) return 1;
  return Math.min(1, Math.max(0, fill / ref));
}

const ZHT_SHAOSHAN_ADM_FILL_OPACITY: maplibregl.ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['zoom'],
  ...(ZHT_SHAOSHAN_ADM_FILL_ZOOM_STOPS.flatMap(([z, o]) => [z, o]) as number[]),
];

/**
 * 韶山市乡镇界：半透明蓝色填色 + 湘潭蓝实线行政界（与早期单线层一致）；线层置于顶层。
 */
function ensureZhtShaoshanCityBoundaryOnMap(map: maplibregl.Map): void {
  if (!map?.loaded()) return;
  /** 避免在 setStyle 过渡帧 addLayer；失败由外层 `zhtSync` 重试 */
  if (typeof map.isStyleLoaded === 'function' && !map.isStyleLoaded()) return;
  try {
    if (!map.getSource(SRC_ZHT_SHAOSHAN_BOUNDARY)) {
      map.addSource(SRC_ZHT_SHAOSHAN_BOUNDARY, {
        type: 'geojson',
        data: ZHT_SHAOSHAN_CITY_BOUNDARY_GEOJSON,
      });
    }
    if (!map.getLayer(LYR_ZHT_SHAOSHAN_ADM_FILL)) {
      map.addLayer({
        id: LYR_ZHT_SHAOSHAN_ADM_FILL,
        type: 'fill',
        source: SRC_ZHT_SHAOSHAN_BOUNDARY,
        paint: {
          'fill-color': 'rgba(46, 112, 176, 0.48)',
          'fill-outline-color': 'rgba(186, 214, 252, 0.28)',
          'fill-opacity': ZHT_SHAOSHAN_ADM_FILL_OPACITY,
        },
      });
    } else {
      map.setPaintProperty(LYR_ZHT_SHAOSHAN_ADM_FILL, 'fill-opacity', ZHT_SHAOSHAN_ADM_FILL_OPACITY);
      map.setPaintProperty(LYR_ZHT_SHAOSHAN_ADM_FILL, 'fill-color', 'rgba(46, 112, 176, 0.48)');
      map.setPaintProperty(LYR_ZHT_SHAOSHAN_ADM_FILL, 'fill-outline-color', 'rgba(186, 214, 252, 0.28)');
    }
    if (!map.getLayer(LYR_ZHT_SHAOSHAN_BOUNDARY)) {
      map.addLayer({
        id: LYR_ZHT_SHAOSHAN_BOUNDARY,
        type: 'line',
        source: SRC_ZHT_SHAOSHAN_BOUNDARY,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#1e5bb5',
          'line-width': 2.5,
          'line-opacity': 0.9,
        },
      });
    } else {
      map.setPaintProperty(LYR_ZHT_SHAOSHAN_BOUNDARY, 'line-color', '#1e5bb5');
      map.setPaintProperty(LYR_ZHT_SHAOSHAN_BOUNDARY, 'line-width', 2.5);
      map.setPaintProperty(LYR_ZHT_SHAOSHAN_BOUNDARY, 'line-opacity', 0.9);
    }
  } catch {
    // GeoJSON/样式异常时不阻塞地图
  }
  /** 置顶单独 try：`moveLayer` 失败不应吞掉已 add 的线层 */
  if (map.getLayer(LYR_ZHT_SHAOSHAN_BOUNDARY)) {
    try {
      map.moveLayer(LYR_ZHT_SHAOSHAN_BOUNDARY);
    } catch {
      /* 忽略 */
    }
  }
}

/** 空间查询已提交：圆/心 WebGL 层无参 moveLayer 置顶，避免被后挂的乡镇填色等盖住 */
function bringSearchMapSpatialRangeLayersToTop(map: maplibregl.Map): void {
  if (!map.getLayer(LYR_SR_FILL)) return;
  try {
    map.moveLayer(LYR_SR_FILL);
    map.moveLayer(LYR_SR_LINE);
    map.moveLayer(LYR_SR_ORIGIN);
  } catch {
    /* 忽略 */
  }
}

/** 绿预览层置顶（顺序：面→线→点） */
function bringSpatialQueryPreviewLayersToTop(map: maplibregl.Map): void {
  try {
    if (map.getLayer(LYR_SQ_PREVIEW_FILL)) {
      map.moveLayer(LYR_SQ_PREVIEW_FILL);
      if (map.getLayer(LYR_SQ_PREVIEW_LINE)) map.moveLayer(LYR_SQ_PREVIEW_LINE);
    }
    if (map.getLayer(LYR_SQ_PREVIEW_ORIGIN)) map.moveLayer(LYR_SQ_PREVIEW_ORIGIN);
  } catch {
    /* 忽略 */
  }
}

/**
 * 行政界与乡镇面 `ensureZhtShaoshanCityBoundaryOnMap` 可能在同一帧晚于本组件 addLayer，把面叠到最上盖住圆心；
 * 在补界之后**再次**将空间圆/绿预览置顶，并保留行政**线**最顶。
 */
function afterBoundaryEnsureThenRaiseSearchSpatialOverlays(map: maplibregl.Map): void {
  if (!map?.loaded()) return;
  ensureZhtShaoshanCityBoundaryOnMap(map);
  bringSearchMapSpatialRangeLayersToTop(map);
  bringSpatialQueryPreviewLayersToTop(map);
  if (map.getLayer(LYR_ZHT_SHAOSHAN_BOUNDARY)) {
    try {
      map.moveLayer(LYR_ZHT_SHAOSHAN_BOUNDARY);
    } catch {
      /* 忽略 */
    }
  }
}

/** Map 已 remove / React Fast Refresh 卸载时 style 可能已空，getLayer 会读 undefined — 统一吞掉 */
function removeSpatialQueryPreview(map: maplibregl.Map | null | undefined) {
  if (!map) return;
  try {
    for (const lid of SQ_PREVIEW_LAYERS) {
      if (map.getLayer(lid)) map.removeLayer(lid);
    }
    for (const sid of SQ_PREVIEW_SOURCES) {
      if (map.getSource(sid)) map.removeSource(sid);
    }
  } catch {
    /* 地图实例已销毁或非就绪 */
  }
}

function removeSearchMapResultLayersOnly(map: maplibregl.Map | null | undefined) {
  if (!map) return;
  try {
    for (const lid of SPATIAL_RESULT_LAYERS) {
      if (map.getLayer(lid)) map.removeLayer(lid);
    }
    for (const sid of SPATIAL_RESULT_SOURCES) {
      if (map.getSource(sid)) map.removeSource(sid);
    }
  } catch {
    /* 同上 */
  }
}

function removeSearchMapSpatialRangeLayersOnly(map: maplibregl.Map | null | undefined) {
  if (!map) return;
  try {
    for (const lid of SPATIAL_RANGE_LAYERS) {
      if (map.getLayer(lid)) map.removeLayer(lid);
    }
    for (const sid of SPATIAL_RANGE_SOURCES) {
      if (map.getSource(sid)) map.removeSource(sid);
    }
  } catch {
    /* 同上 */
  }
}

/**
 * 整块 WebGL **`map.getCanvas()`** 设 CSS **`opacity`**（`alpha01` 为 0–1，与「地图透明度」`1 - pct/100` 一致）。
 * 与逐图层 `setPaintProperty` 相比在 Liberty/影像上最稳定；**代价**：韶山行政界、空间查询等 **同 canvas 的 WebGL** 会一起变淡；**DOM Marker** 仍在 `canvas-container` 内与 canvas 同级，**不受** canvas opacity。
 */
function applyBasemapLayerTransparency(map: maplibregl.Map, alpha01: number): void {
  // 勿用 map.loaded()：有瓦片/样式增量在途时常为 false，会导致滑块完全不生效
  const canvas = map.getCanvas?.() as HTMLCanvasElement | undefined;
  if (!canvas) return;
  const a = Math.min(1, Math.max(0, alpha01));
  if (a >= 1) canvas.style.removeProperty('opacity');
  else canvas.style.opacity = String(a);
}

/**
 * 清历史写在容器上的 opacity → 写 **canvas** 透明度 → **`isStyleLoaded` 后**再补韶山行政界（重试解决 setStyle 竞态）。
 */
function zhtSyncBasemapOpacityAndBoundary(
  map: maplibregl.Map | null,
  host: HTMLElement | null,
  mapTransparencyPercent: number,
): void {
  if (host) {
    host.querySelectorAll('.maplibregl-canvas-container canvas').forEach(node => {
      (node as HTMLCanvasElement).style.removeProperty('opacity');
    });
    (host.querySelector('.maplibregl-canvas-container') as HTMLElement | null)?.style.removeProperty('opacity');
  }
  if (!map) return;

  const a = Math.min(1, Math.max(0, 1 - mapTransparencyPercent / 100));
  applyBasemapLayerTransparency(map, a);

  const tryApply = (): boolean => {
    try {
      if (typeof map.isStyleLoaded === 'function' && !map.isStyleLoaded()) return false;
      ensureZhtShaoshanCityBoundaryOnMap(map);
      applyBasemapLayerTransparency(map, a);
      return true;
    } catch {
      return false;
    }
  };

  const run = (attempt: number) => {
    if (!map) return;
    if (tryApply()) return;
    if (attempt < 40) window.setTimeout(() => run(attempt + 1), 24);
  };
  run(0);
}

/** 台账类（泵站/排口/污水厂）与设施管理「详情」同宽；其余统一点位与管点类详情同 800px */
const ZHT_MAP_FACILITY_DETAIL_WIDTH = ZHT_FACILITY_DETAIL_MODAL_WIDTH;
const ZHT_MAP_OTHER_DETAIL_WIDTH = 800;
/** 有台账反查分段时略加宽，避免长字段换行过多 */
const ZHT_MAP_LEDGER_DETAIL_WIDTH: number | string = 'min(1040px, 96vw)';
/** 与生态整治 `index.tsx` 中各弹窗 `width` 一致 */
const ZHT_ECO_AFFAIR_MODAL_W = 960;
const ZHT_ECO_PROJ_MODAL_W = 900;
const ZHT_ECO_LAKE_MODAL_W = 1000;
/** 与配置中心 `ConfigHydroReservoirView` 水库详情弹窗宽度一致 */
const ZHT_SYS_HYDRO_RES_MODAL_W = 1000;

type DescItemList = NonNullable<DescriptionsProps['items']>;

function mapDemoMetricNameToRealtimeMetricKey(name: string): string | null {
  const normalized = String(name ?? '').trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'cod') return 'cod';
  if (normalized === '氨氮' || normalized === 'nh3n' || normalized === 'nh3-n') return 'nh3n';
  if (normalized === 'ph') return 'ph';
  if (normalized === '总磷' || normalized === 'tp') return 'tp';
  if (normalized === '总氮' || normalized === 'tn') return 'tn';
  return null;
}

function buildAlarmMetricKeysFromDemoMetrics(metrics: ZhtMonitorMetricRow[]): string[] {
  const keys = metrics
    .filter(row => row.tone === 'danger')
    .map(row => mapDemoMetricNameToRealtimeMetricKey(row.name))
    .filter(Boolean) as string[];
  return Array.from(new Set(keys));
}

/** 水质监测站物联关联覆盖：Modal 内 Consumer 与地图 DOM POI 同源刷新 */
const ZhtMapMonitorIotOverridesContext = React.createContext<Record<string, string[]>>({});

/**
 * 非台账统一点位详情：与设施管理 / 生态整治只读弹窗同结构；生态整治类点位与业务页复用同一只读组件。
 */
function UnifiedSearchPointDetailContent({
  pt,
  demo,
  showLocationMiniMap = false,
  onMonitorIotLinkedDeviceKeysChange,
}: {
  pt: ZhtUnifiedSearchPoint;
  demo?: ZhtMonitoringPoiDemo | null;
  showLocationMiniMap?: boolean;
  /** 保存物联关联 → `patchMonitorIotKeys(monId, keys)` */
  onMonitorIotLinkedDeviceKeysChange?: (monId: string, keys: string[]) => void;
}) {
  const [traceOpen, setTraceOpen] = useState(false);
  const [selectedMetricIsAlarm, setSelectedMetricIsAlarm] = useState(false);
  const monitorIotLinkOverridesFromCtx = React.useContext(ZhtMapMonitorIotOverridesContext);
  const mergedDemo = useMemo(() => {
    if (!demo) return null;
    return mergeMonitoringPoiDemoWithIotOverrides(demo.id, monitorIotLinkOverridesFromCtx) ?? demo;
  }, [demo, monitorIotLinkOverridesFromCtx]);
  const ledgerSections = useMemo(() => getUnifiedPointLedgerDescriptionSections(pt), [pt.id]);

  const basicItems: DescItemList = [
    { key: 'src', label: '来源项目', children: pt.sourceProject },
    { key: 'ptype', label: '类型', children: pt.pointType },
    { key: 'code', label: '编码', children: pt.code },
    { key: 'name', label: '名称', children: pt.name },
    { key: 'region', label: '区域', children: pt.region },
    { key: 'status', label: '状态', children: pt.status },
    {
      key: 'xy',
      label: '坐标',
      children: `${pt.lng.toFixed(6)}，${pt.lat.toFixed(6)}`,
      span: 2,
    },
  ];

  const showOuterMiniMap =
    showLocationMiniMap &&
    Number.isFinite(pt.lng) &&
    Number.isFinite(pt.lat) &&
    !/^zht-eco-(lake|affair|proj)-/.test(pt.id) &&
    !pt.id.startsWith('zht-river-sec-') &&
    !/^zht-(sys|emg)-/.test(pt.id);

  const metricItems: DescItemList | null =
    mergedDemo && mergedDemo.metrics.length > 0
      ? mergedDemo.metrics.map((row, i) => ({
          key: `m${i}`,
          label: row.name,
          children: (
            <>
              <strong className={`zht-map-poi-hint__metric-num ${zhtMonitorMetricNumClass(row.tone)}`}>
                {row.value}
              </strong>
              {row.unit ? (
                <span style={{ marginLeft: 6, color: 'rgba(0, 0, 0, 0.45)', fontWeight: 400 }}>{row.unit}</span>
              ) : null}
            </>
          ),
        }))
      : null;

  const isSectionMonitor = Boolean(mergedDemo && /断面/.test(mergedDemo.title));
  const alarmMetricKeys = useMemo(
    () => (mergedDemo ? buildAlarmMetricKeysFromDemoMetrics(mergedDemo.metrics) : []),
    [mergedDemo],
  );
  const traceAnalysis = useMemo(
    () => (mergedDemo && isSectionMonitor ? buildSectionTraceAnalysis(mergedDemo) : null),
    [mergedDemo, isSectionMonitor],
  );
  const traceButton = isSectionMonitor && selectedMetricIsAlarm ? (
    <Button type="primary" onClick={() => setTraceOpen(true)}>
      溯源分析
    </Button>
  ) : null;
  // 溯源分析按钮作为独立触发元素（用于非水质监测站场景）
  const traceTrigger = traceButton ? (
    <div className="zht-section-trace-entry zht-section-trace-entry--footer">
      {traceButton}
    </div>
  ) : null;

  // —— 生态整治：事务与 `riverGuardAffairDetailPanels` 1:1 同源（与业务弹窗同一份实现）——
  if (pt.id.startsWith('zht-eco-affair-') && !demo) {
    const affK = pt.id.slice('zht-eco-affair-'.length);
    const d = initialRiverGuardAffairs.find(a => a.key === affK);
    if (d) return <RiverGuardAffairDetailPanels detail={d} showLocationMiniMap={showLocationMiniMap} />;
    return <div className="detail-section">未找到与统一点位 id 对应的事务台账（`initialRiverGuardAffairs`）</div>;
  }

  if (pt.id.startsWith('zht-eco-proj-') && !demo) {
    const pk = pt.id.slice('zht-eco-proj-'.length);
    const r = initialEcoProjectArchiveData.find(x => x.key === pk);
    if (r) return <EcoProjectArchiveReadonlyDetail viewRecord={r} showLocationMiniMap={showLocationMiniMap} />;
    return <div className="detail-section">未找到与统一点位 id 对应的项目档案（`initialEcoProjectArchiveData`）</div>;
  }

  if (pt.id.startsWith('zht-eco-lake-') && !demo) {
    const lkK = pt.id.slice('zht-eco-lake-'.length);
    const lk = initialLakeWaterBodyData.find(x => x.key === lkK);
    if (lk) return <LakeWaterBodyReadonlyDetailContent row={lk} showLocationMiniMap={showLocationMiniMap} />;
    return <div className="detail-section">未找到与统一点位 id 对应的湖泊水体（`initialLakeWaterBodyData`）</div>;
  }

  if (pt.id.startsWith('zht-river-sec-') && !demo) {
    const secKey = pt.id.slice('zht-river-sec-'.length);
    const row = initialRiverSectionData.find(x => x.key === secKey);
    if (row) {
      return (
        <RiverSectionReadonlyDetailContent
          viewRecord={row}
          allSections={initialRiverSectionData}
          riverChannels={initialRiverChannelMasterData}
          showLocationMiniMap={showLocationMiniMap}
        />
      );
    }
    return <div className="detail-section">未找到与统一点位 id 对应的责任段（`initialRiverSectionData`）</div>;
  }

  /** 系统管理水库：与 `hydroReservoirReadonlyDetail` 同源，避免「基本信息 + 缩写台账」双轨 */
  if (pt.id.startsWith('zht-sys-hydro-') && !demo) {
    const rid = pt.id.slice('zht-sys-hydro-'.length);
    const r = hydroInitial.find(x => x.id === rid);
    if (r) return <HydroReservoirReadonlyDetailContent record={r} showLocationMiniMap={showLocationMiniMap} />;
    return <div className="detail-section">未找到与统一点位 id 对应的水库对象（`hydroInitial`）</div>;
  }

  /** 水利工程：与配置中心 `config-center-views` / `config-center-hydro-extended` 详情弹窗同源的只读 Descriptions + 地图行 */
  if (pt.id.startsWith('zht-sys-sluice-') && !demo) {
    const rid = pt.id.slice('zht-sys-sluice-'.length);
    const r = sluiceInitial.find(x => x.id === rid);
    if (r) return <HydroSluiceReadonlyDetailContent record={r} showLocationMiniMap={showLocationMiniMap} />;
    return <div className="detail-section">未找到与统一点位 id 对应闸坝（`sluiceInitial`）</div>;
  }
  if (pt.id.startsWith('zht-sys-watergate-') && !demo) {
    const rid = pt.id.slice('zht-sys-watergate-'.length);
    const r = waterGateInitial.find(x => x.id === rid);
    if (r) return <HydroWaterGateReadonlyDetailContent record={r} showLocationMiniMap={showLocationMiniMap} />;
    return <div className="detail-section">未找到与统一点位 id 对应水闸（`waterGateInitial`）</div>;
  }
  if (pt.id.startsWith('zht-sys-levee-') && !demo) {
    const rid = pt.id.slice('zht-sys-levee-'.length);
    const r = leveeInitial.find(x => x.id === rid);
    if (r) return <HydroLeveeReadonlyDetailContent record={r} showLocationMiniMap={showLocationMiniMap} />;
    return <div className="detail-section">未找到与统一点位 id 对应堤防（`leveeInitial`）</div>;
  }
  if (pt.id.startsWith('zht-sys-weir-') && !demo) {
    const rid = pt.id.slice('zht-sys-weir-'.length);
    const r = weirInitial.find(x => x.id === rid);
    if (r) return <HydroWeirReadonlyDetailContent record={r} showLocationMiniMap={showLocationMiniMap} />;
    return <div className="detail-section">未找到与统一点位 id 对应堰坝（`weirInitial`）</div>;
  }
  if (pt.id.startsWith('zht-sys-polder-') && !demo) {
    const rid = pt.id.slice('zht-sys-polder-'.length);
    const r = polderInitial.find(x => x.id === rid);
    if (r) return <HydroPolderReadonlyDetailContent record={r} showLocationMiniMap={showLocationMiniMap} />;
    return <div className="detail-section">未找到与统一点位 id 对应圩区（`polderInitial`）</div>;
  }
  if (pt.id.startsWith('zht-sys-hillpond-') && !demo) {
    const rid = pt.id.slice('zht-sys-hillpond-'.length);
    const r = hillpondInitial.find(x => x.id === rid);
    if (r) return <HydroHillpondReadonlyDetailContent record={r} showLocationMiniMap={showLocationMiniMap} />;
    return <div className="detail-section">未找到与统一点位 id 对应山塘（`hillpondInitial`）</div>;
  }

  /** 应急协同：与 `riskIdentification` / `index` 中详情弹窗同源的只读体 */
  if (pt.id.startsWith('zht-emg-ent-') && !demo) {
    return (
      <EmgEnterpriseReadonlyMapDetailContent
        id={pt.id.slice('zht-emg-ent-'.length)}
        showLocationMiniMap={showLocationMiniMap}
      />
    );
  }
  if (pt.id.startsWith('zht-emg-supply-') && !demo) {
    return (
      <EmgSocialSupplyPointReadonlyMapDetailContent
        id={pt.id.slice('zht-emg-supply-'.length)}
        showLocationMiniMap={showLocationMiniMap}
      />
    );
  }
  if (pt.id.startsWith('zht-emg-team-') && !demo) {
    return (
      <EmgTeamReadonlyMapDetailContent
        id={pt.id.slice('zht-emg-team-'.length)}
        showLocationMiniMap={showLocationMiniMap}
      />
    );
  }
  if (pt.id.startsWith('zht-emg-evt-') && !demo) {
    return (
      <EmergencyEventMapReadonlyDetailContent
        eventId={pt.id.slice('zht-emg-'.length)}
        showLocationMiniMap={showLocationMiniMap}
      />
    );
  }

  /**
   * 其余系统管理 / 应急统一点位：不展示综合态势摘要「基本信息」，仅按台账 ledger 分段。
   * 无 ledger 回退（如部分 `zht-emg-*`）仍走下方「基本信息」结构，避免空弹窗。
   */
  const zhtSysOrEmgLedgerOnly = !demo && /^zht-(sys|emg)-/.test(pt.id) && ledgerSections.length > 0;

  const basicTabBody = zhtSysOrEmgLedgerOnly
    ? (
        <>
          {ledgerSections.map((sec, i) => (
            <div key={sec.title} className="detail-section" style={{ marginTop: i === 0 ? 0 : 12 }}>
              <div className="detail-section-title">{sec.title}</div>
              <div className="detail-section-content">
                <Descriptions bordered column={2} size="small" items={sec.items} />
              </div>
            </div>
          ))}
        </>
      )
    : (
        <>
          <div className="detail-section">
            <div className="detail-section-title">基本信息</div>
            <div className="detail-section-content">
              <Descriptions bordered column={2} size="small" items={basicItems} />
            </div>
          </div>
          {showOuterMiniMap ? (
            <div className="detail-section" style={{ marginTop: 12 }}>
              <div className="detail-section-title">位置地图</div>
              <div className="detail-section-content">
                <AddrWgs84DetailMap
                  title={pt.name}
                  location={[pt.region, pt.sourceProject].filter(Boolean).join(' · ') || undefined}
                  lng={pt.lng}
                  lat={pt.lat}
                  mapAriaLabel="统一点位位置地图"
                />
              </div>
            </div>
          ) : null}
          {ledgerSections.map(sec => (
            <div key={sec.title} className="detail-section" style={{ marginTop: 12 }}>
              <div className="detail-section-title">{sec.title}</div>
              <div className="detail-section-content">
                <Descriptions bordered column={2} size="small" items={sec.items} />
              </div>
            </div>
          ))}
        </>
      );

  /** 有演示台账时：与泵站详情「实时监测」同源（物联设备横滑 + 设备信息 + 五参数大卡 + 曲线/表） */
  const wqMonitoringRecord =
    mergedDemo && mergedDemo.metrics.length > 0
      ? ({
          id: mergedDemo.id,
          name: mergedDemo.title,
          addr: [pt.region, pt.address].filter(Boolean).join(' · ') || '—',
          /** 传递已关联设备 key 列表，用于初始化实时监测页设备关联 */
          iotLinkedDeviceKeys: mergedDemo.iotLinkedDeviceKeys,
        } satisfies Record<string, unknown>)
      : null;

  const monitorTabBody = wqMonitoringRecord ? (
    <WaterQualityStationMonitoringTabContent
      record={wqMonitoringRecord}
      alarmMetricKeys={alarmMetricKeys}
      onMetricSelectionChange={({ isAlarm }) => setSelectedMetricIsAlarm(isAlarm)}
      footerAction={traceButton}
      onIotLinkedDeviceKeysChange={
        mergedDemo && onMonitorIotLinkedDeviceKeysChange
          ? keys => onMonitorIotLinkedDeviceKeysChange(mergedDemo.id, keys)
          : undefined
      }
    />
  ) : metricItems ? (
    <div className="facility-monitoring-realtime facility-monitoring-realtime--v2">
      <div className="detail-section zht-map-poi-detail-metrics">
        <div className="detail-section-title">实时监测</div>
        <div className="detail-section-content">
          <Descriptions bordered column={2} size="small" items={metricItems} />
        </div>
      </div>
    </div>
  ) : null;

  const hasMonitorTab = Boolean(monitorTabBody);
  const monitorTabsDefaultToRealtime =
    Boolean(mergedDemo && metricItems && deriveMonitoringPoiDisplayState(mergedDemo) !== 'offline');

  if (hasMonitorTab) {
    // 水质监测站场景：溯源分析按钮已通过 footerAction 传入 WaterQualityStationMonitoringTabContent
    // 其他场景：仍需要在 Tabs 下方显示 traceTrigger
    const showExternalTraceTrigger = !wqMonitoringRecord && traceTrigger;
    return (
      <>
        <DetailTabsIfMultiple
          className="facility-detail-tabs facility-mgmt-detail-tabs"
          size="small"
          style={{ marginTop: 8 }}
          defaultActiveKey={monitorTabsDefaultToRealtime ? 'monitor' : 'basic'}
          items={[
            { key: 'basic', label: '基本信息', children: basicTabBody },
            { key: 'monitor', label: '实时监测', children: monitorTabBody },
          ]}
        />
        {showExternalTraceTrigger}
        <Modal
          title="溯源分析"
          open={traceOpen}
          onCancel={() => setTraceOpen(false)}
          className="zht-section-trace-modal-fullscreen"
          width="100vw"
          style={{ top: 0, paddingBottom: 0 }}
          footer={null}
          destroyOnClose
          styles={{ body: { height: 'calc(100vh - 132px)', overflow: 'hidden' } }}
        >
          <ZhtSectionTraceAnalysisPanel analysis={traceAnalysis} />
        </Modal>
      </>
    );
  }

  return (
    <>
      {basicTabBody}
      {wqMonitoringRecord ? (
        <div style={{ marginTop: 12 }}>
          <WaterQualityStationMonitoringTabContent
            record={wqMonitoringRecord}
            footerAction={traceButton}
            onIotLinkedDeviceKeysChange={
              mergedDemo && onMonitorIotLinkedDeviceKeysChange
                ? keys => onMonitorIotLinkedDeviceKeysChange(mergedDemo.id, keys)
                : undefined
            }
          />
        </div>
      ) : metricItems ? (
        <div className="detail-section zht-map-poi-detail-metrics" style={{ marginTop: 12 }}>
          <div className="detail-section-title">演示监测数据</div>
          <div className="detail-section-content">
            <Descriptions bordered column={2} size="small" items={metricItems} />
          </div>
        </div>
      ) : null}
      {/* 水质监测站场景：溯源分析按钮已通过 footerAction 传入，不再显示外部触发器 */}
      {!wqMonitoringRecord && traceTrigger}
      <Modal
        title="溯源分析"
        open={traceOpen}
        onCancel={() => setTraceOpen(false)}
        className="zht-section-trace-modal-fullscreen"
        width="100vw"
        style={{ top: 0, paddingBottom: 0 }}
        footer={null}
        destroyOnClose
        styles={{ body: { height: 'calc(100vh - 132px)', overflow: 'hidden' } }}
      >
        <ZhtSectionTraceAnalysisPanel analysis={traceAnalysis} />
      </Modal>
    </>
  );
}

export type FacilityMapKind = 'pump' | 'outlet' | 'plant' | 'discharger';

/** 台账坐标与展示名称（排口经度纬度字段、排水户为 coordX/Y） */
function facilityLngLatName(
  kind: FacilityMapKind,
  rec: Record<string, unknown>,
  fallbackName: string,
): { lng: number; lat: number; name: string } | null {
  if (kind === 'discharger') {
    const lng = Number(rec.coordX);
    const lat = Number(rec.coordY);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    return { lng, lat, name: String(rec.dischargerName ?? fallbackName) };
  }
  if (kind === 'outlet') {
    const lng = Number(rec['入河入海排污口经度']);
    const lat = Number(rec['入河入海排污口纬度']);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    return { lng, lat, name: String(rec['入河入海排污口名称'] ?? fallbackName) };
  }
  const lng = Number(rec.x);
  const lat = Number(rec.y);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  if (kind === 'pump') {
    return { lng, lat, name: String(rec.pustName ?? rec.name ?? fallbackName) };
  }
  return { lng, lat, name: String(rec.name ?? fallbackName) };
}

/**
 * 设施类 HTML 提示板上限（泵站/排口/厂 + 水环境统一点位 + 污染源共用此计数；监测站单独绘制不受限）。
 * 原 28 会在演示全图层开启时先被设施占满，后续统一点位仅有圆点无提示板。
 * 演示数据量级下 512 可全量展示；若接超大规模台账可改为视口裁切或分层加载。
 */
const ZHT_POI_FACILITY_HINT_CAP = 512;

/**
 * 多个 POI Marker 重叠时叠放顺序：由经纬度决定「谁在上」。
 * 正北朝上时，纬度越低（地图偏南、通常更靠近画面下方）z-index 越大，提示板越靠前；
 * 经度略作区分，减轻同纬度多点 z 值完全相同的情况。
 * 必须在「本帧全部点位」的 min/max 范围内归一化，保证 z-index 为正；若用 (minLat - lat)*系数，
 * 偏北点会得到负 z，Marker 会沉到地图画布下方而不可见。
 */
function zhtPoiMarkerZIndexFromPosition(
  lat: number,
  lng: number,
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number,
): number {
  const latSpan = Math.max(1e-6, maxLat - minLat);
  const lngSpan = Math.max(1e-6, maxLng - minLng);
  const southNorm = (maxLat - lat) / latSpan; // 南端（lat 小）更接近 1，叠放更靠前
  const eastNorm = (lng - minLng) / lngSpan;
  return Math.round(100 + southNorm * 720 + eastNorm * 80);
}

/** 水环境 POI Marker 的 z ∈ [100, ~900]；行政区划提示板须恒定叠在其上（二者 bbox 归一化口径不同，不可只 + 小增量） */
const ZHT_ADMIN_DIV_MARKER_Z_INDEX_BASE = 1000;

/** 非台账设施类水环境 POI（生态整治 / 应急 / 系统管理等统一点位） */
/** 污染源三类（与图层控制子勾选顺序一致） */
const ZHT_POLLUTION_KINDS: ZhtPollutionSourceKind[] = ['rural_sewage', 'agri_rural', 'industry'];

const ZHT_WATER_ENV_UNIFIED_ONLY: ReadonlySet<ZhtWaterEnvCategoryId> = new Set([
  'outlet_responsible',
  'eco_project',
  'eco_lake',
  'eco_affair',
  'emg_supply',
  'emg_team',
  'emg_event',
  'risk_ent',
  'sys_zhaba',
  'sys_diba',
  'sys_shuiku',
  'sys_shuizha',
  'sys_weiqu',
  'sys_yandi',
  'sys_shantang',
]);

function facilityKindToWaterEnvCategory(kind: FacilityMapKind): ZhtWaterEnvCategoryId {
  if (kind === 'pump') return 'pump';
  if (kind === 'outlet') return 'outlet';
  if (kind === 'discharger') return 'discharger';
  return 'plant';
}

/** 水环境 POI 圆点：外圈四态色 + 中心分类图标 */
function createWaterEnvCategoryDot(cat: ZhtWaterEnvCategoryId, viz: ZhtPoiDisplayState): HTMLDivElement {
  const el = document.createElement('div');
  el.className = `zht-map-point-dot zht-map-point-dot--water-env zht-map-point-dot--viz-${viz} zht-map-point-dot--cat-${cat}`;
  el.setAttribute('aria-hidden', 'true');
  appendWaterEnvPoiDotIcon(el, cat);
  return el;
}

function pollutionLayerEnabled(lc: ZhtLayerControlState, kind: ZhtPollutionSourceKind): boolean {
  if (!lc.waterEnvPoiEnabled) return false;
  const p = lc.pollutionSourceLayers;
  if (kind === 'rural_sewage') return p.ruralSewage;
  if (kind === 'agri_rural') return p.agriRural;
  return p.industry;
}

/** 指标抽屉地址 peek：子图层全关时仍临时展示与抽屉一致的污染源圆点 */
function pollutionPointPassesLayerOrPeek(
  lc: ZhtLayerControlState,
  pt: ZhtPollutionMapPoint,
  peek: ZhtStatDrawerPeekPoi | null | undefined,
): boolean {
  if (
    peek?.kind === 'pollution' &&
    peek.pollutionKind === pt.kind &&
    peek.pollutionId === pt.id
  ) {
    return true;
  }
  return pollutionLayerEnabled(lc, pt.kind);
}

/** 污染源圆点：信息点蓝圈 + 子类中心图标（与图层图例一致） */
function createPollutionDot(kind: ZhtPollutionSourceKind): HTMLDivElement {
  const el = document.createElement('div');
  el.className = `zht-map-point-dot zht-map-point-dot--water-env zht-map-point-dot--viz-info zht-map-point-dot--pollution-${kind}`;
  el.setAttribute('aria-hidden', 'true');
  appendPollutionPoiDotIcon(el, kind);
  return el;
}

/** 设施类提示板：有站名、有指标、或两者兼有；关「标题显示」时仍可仅展示指标行 */
function facilityPoiHintCardWants(
  poiFacilityTitle: boolean,
  metricBlock:
    | {
        showValues: boolean;
        valuesFontPx: number;
        rows: ZhtFacilityHintMetricRow[];
      }
    | undefined,
): boolean {
  if (poiFacilityTitle) return true;
  return Boolean(metricBlock?.showValues && metricBlock.rows.length > 0);
}

/** 设施台账提示板：可选挂载「实时监测」多行（与「监测类 · 数值显示」同开关） */
function appendFacilityPoiHint(
  root: HTMLElement,
  facilityName: string,
  titleFontPx: number,
  metricBlock?: {
    showValues: boolean;
    valuesFontPx: number;
    rows: ZhtFacilityHintMetricRow[];
  },
  opts?: { showTitle?: boolean },
): void {
  const showTitle = opts?.showTitle !== false;
  const hasMetrics = Boolean(metricBlock?.showValues && metricBlock.rows.length > 0);
  if (!showTitle && !hasMetrics) return;

  const card = document.createElement('div');
  card.className = 'zht-map-poi-hint zht-map-poi-hint--facility';
  if (showTitle) {
    const titleEl = document.createElement('div');
    titleEl.className = 'zht-map-poi-hint__title';
    titleEl.textContent = facilityName;
    titleEl.style.fontSize = `${titleFontPx}px`;
    card.appendChild(titleEl);
  }
  if (hasMetrics && metricBlock) {
    const metrics = document.createElement('div');
    metrics.className = 'zht-map-poi-hint__metrics';
    metrics.style.fontSize = `${metricBlock.valuesFontPx}px`;
    for (const row of metricBlock.rows) {
      const line = document.createElement('div');
      line.className = 'zht-map-poi-hint__metric-row';
      const nameSpan = document.createElement('span');
      nameSpan.className = 'zht-map-poi-hint__metric-name';
      nameSpan.textContent = `${row.name} `;
      const numSpan = document.createElement('span');
      numSpan.className = `zht-map-poi-hint__metric-num ${zhtMonitorMetricNumClass(row.tone)}`;
      numSpan.textContent = row.value;
      line.append(nameSpan, numSpan);
      if (row.unit) {
        const unitSpan = document.createElement('span');
        unitSpan.className = 'zht-map-poi-hint__metric-unit';
        unitSpan.textContent = row.unit;
        line.appendChild(unitSpan);
      }
      metrics.appendChild(line);
    }
    card.appendChild(metrics);
  }
  root.appendChild(card);
}

function facilityHintMetricsForRecord(
  kind: FacilityMapKind,
  rec: Record<string, unknown>,
  poiMonitorValues: boolean,
  valuesFontPx: number,
): { showValues: boolean; valuesFontPx: number; rows: ZhtFacilityHintMetricRow[] } | undefined {
  if (!poiMonitorValues) return undefined;
  if (kind === 'discharger' && !dischargerHasLinkedIotMonitor(rec as PsDischargerRecord)) return undefined;
  const rows = getFacilityHintMetricRows(kind, rec as Parameters<typeof getFacilityHintMetricRows>[1]).filter(
    facilityHintMetricRowHasRealtimeData,
  );
  if (!rows.length) return undefined;
  return { showValues: true, valuesFontPx, rows };
}

/** 统一点位 / 污染源等无台账设施记录：与污水厂同口径的水质物联演示行（由稳定 id 派生） */
function facilityHintMetricsFromSeed(
  seedId: string,
  poiMonitorValues: boolean,
  valuesFontPx: number,
): { showValues: boolean; valuesFontPx: number; rows: ZhtFacilityHintMetricRow[] } | undefined {
  if (!poiMonitorValues) return undefined;
  const rows = getGenericWaterIotHintRowsFromSeed(seedId).filter(facilityHintMetricRowHasRealtimeData);
  if (!rows.length) return undefined;
  return { showValues: true, valuesFontPx, rows };
}

/**
 * 排水户 `info`＝未关联物联 → 不叠演示监测行。
 * 泵站 / 排口 / 污水厂 的 `info` 可能来自台账其它语义（如泵站 engStat 在建），与详情「实时监测」演示仍可并存，不得据此压制提示板。
 */
function facilityHintMetricsForRecordIfLinked(
  kind: FacilityMapKind,
  rec: Record<string, unknown>,
  poiMonitorValues: boolean,
  valuesFontPx: number,
  displayState: ZhtPoiDisplayState,
): ReturnType<typeof facilityHintMetricsForRecord> {
  if (kind === 'discharger' && displayState === 'info') return undefined;
  return facilityHintMetricsForRecord(kind, rec, poiMonitorValues, valuesFontPx);
}

function facilityHintMetricsFromSeedIfLinked(
  seedId: string,
  poiMonitorValues: boolean,
  valuesFontPx: number,
  displayState: ZhtPoiDisplayState,
): ReturnType<typeof facilityHintMetricsFromSeed> {
  if (displayState === 'info') return undefined;
  return facilityHintMetricsFromSeed(seedId, poiMonitorValues, valuesFontPx);
}

/** 去掉 nodata / 占位数值行；无有效行则整块不挂载（与监测站 POI 口径一致） */
function filterRealtimeFacilityMetricBlock(
  block: { showValues: boolean; valuesFontPx: number; rows: ZhtFacilityHintMetricRow[] } | undefined,
): { showValues: boolean; valuesFontPx: number; rows: ZhtFacilityHintMetricRow[] } | undefined {
  if (!block?.rows?.length) return undefined;
  const rows = block.rows.filter(facilityHintMetricRowHasRealtimeData);
  if (!rows.length) return undefined;
  return { ...block, rows };
}

/** 监测站未关联物联（空 keys / `hasLinkedIot === false`）时提示板仅标题，不展示指标行 */
function monitoringPoiHintAllowsValues(mon: ZhtMonitoringPoiDemo, poiMonitorValues: boolean): boolean {
  return Boolean(poiMonitorValues) && !monitoringExplicitNoLinkedIot(mon);
}

/**
 * 监测点提示板：可选 **站点名称**（与设施类共用「标题显示」）+ 可选监测指标（「数值显示」，最多 ZHT_MONITOR_POI_HINT_METRICS_MAX 行）。
 * 圆点四态仍用完整 metrics 推导；**未关联物联**时不叠指标行（与信息点蓝语义一致）。
 */
function appendMonitorPoiHint(
  root: HTMLElement,
  mon: ZhtMonitoringPoiDemo,
  opts: {
    showTitle: boolean;
    titleFontPx: number;
    showValues: boolean;
    valuesFontPx: number;
    /** 默认与全局上限一致；抽屉「地址定位」时可用更大行数与侧栏卡片对齐 */
    maxMetricRows?: number;
  },
): void {
  const { showTitle, titleFontPx, showValues, valuesFontPx, maxMetricRows } = opts;
  const cap = maxMetricRows ?? ZHT_MONITOR_POI_HINT_METRICS_MAX;
  const rows = showValues ? mon.metrics.filter(monitoringMetricRowHasRealtimeData).slice(0, cap) : [];
  const titleText = (mon.title || '').trim() || '水质监测站';
  if (!showTitle && !rows.length) return;

  const card = document.createElement('div');
  card.className = 'zht-map-poi-hint zht-map-poi-hint--monitor';
  if (showTitle) {
    const titleEl = document.createElement('div');
    titleEl.className = 'zht-map-poi-hint__title';
    titleEl.textContent = titleText;
    titleEl.style.fontSize = `${titleFontPx}px`;
    card.appendChild(titleEl);
  }
  if (rows.length) {
    const metrics = document.createElement('div');
    metrics.className = 'zht-map-poi-hint__metrics';
    metrics.style.fontSize = `${valuesFontPx}px`;
    for (const row of rows) {
      const line = document.createElement('div');
      line.className = 'zht-map-poi-hint__metric-row';
      const nameSpan = document.createElement('span');
      nameSpan.className = 'zht-map-poi-hint__metric-name';
      nameSpan.textContent = `${row.name} `;
      const numSpan = document.createElement('span');
      numSpan.className = `zht-map-poi-hint__metric-num ${zhtMonitorMetricNumClass(row.tone)}`;
      numSpan.textContent = row.value;
      line.append(nameSpan, numSpan);
      if (row.unit) {
        const unitSpan = document.createElement('span');
        unitSpan.className = 'zht-map-poi-hint__metric-unit';
        unitSpan.textContent = row.unit;
        line.appendChild(unitSpan);
      }
      metrics.appendChild(line);
    }
    card.appendChild(metrics);
  }
  root.appendChild(card);
}

/**
 * 行政区划名称提示：**非水环境 POI**，仅受图层「行政区划 / 零直排区域标注」控制，
 * **不受**工具条「POI提示配置」影响；深色卡（标题 + 可选零直排文案），**不**叠地图圆点锚标。
 * 卡片 **DOM**（`.zht-map-poi-hint--admin-division`）的 **opacity** 由 **`zhtShaoshanAdmHintBoardOpacityAtZoom`** 控制（默认视野不透明，放大后相对行政面趋势变淡）；
 * **勿**写在 Marker 根节点上：`maplibregl.Marker` 会在 `_updateOpacity` 里覆写根节点 **`style.opacity`**。
 */
function appendAdminDivisionCard(
  root: HTMLElement,
  d: ZhtAdminDivisionHintDemo,
  titleFontPx: number,
  showZeroDirectIndicators: boolean,
): void {
  const card = document.createElement('div');
  card.className = 'zht-map-poi-hint zht-map-poi-hint--admin zht-map-poi-hint--admin-division';
  const titleEl = document.createElement('div');
  titleEl.className = 'zht-map-poi-hint__title zht-map-admin-division-title';
  titleEl.style.fontSize = `${titleFontPx}px`;
  titleEl.textContent = d.name;
  card.appendChild(titleEl);
  if (showZeroDirectIndicators) {
    const box = document.createElement('div');
    box.className = 'zht-map-admin-metric-block';
    const l1 = document.createElement('div');
    l1.className = 'zht-map-admin-metric-line';
    l1.append(document.createTextNode('雨污分流：'), mkAdminOkBadSpan(d.rainSewageDiversionOk));
    const l2 = document.createElement('div');
    l2.className = 'zht-map-admin-metric-line';
    l2.append(document.createTextNode('污水零直排：'), mkAdminOkBadSpan(d.zeroDirectSewageOk));
    box.append(l1, l2);
    card.appendChild(box);
  }
  root.appendChild(card);
}

function mkAdminOkBadSpan(ok: boolean): HTMLSpanElement {
  const s = document.createElement('span');
  s.className = ok ? 'zht-map-admin-ok' : 'zht-map-admin-bad';
  s.textContent = ok ? '达标' : '不达标';
  return s;
}

/** 地图搜索专用：单层 DOM 序号点（无台账提示板时），锚点居中便于点击出详情 */
function createMapSearchResultMarkerRoot(idx: number, selected: boolean): HTMLElement {
  const root = document.createElement('div');
  root.className = `zht-map-search-result-hit${selected ? ' zht-map-search-result-hit--selected' : ''}`;
  const dot = document.createElement('div');
  dot.className = 'zht-map-search-result-hit__dot';
  const badge = document.createElement('span');
  badge.className = 'zht-map-search-result-hit__idx';
  badge.textContent = String(idx);
  badge.setAttribute('aria-label', `查询结果序号 ${idx}`);
  root.append(dot, badge);
  return root;
}

export interface ZhtMaplibreBoardProps {
  /** 行政区划名称提示面板 */
  showAdminDivisionHints?: boolean;
  /** 行政区划提示板内：雨污分流 / 污水零直排达标文案显隐 */
  showZeroDirectIndicators?: boolean;
  /** 图层控制完整状态（工具条 Popover；含水环境 POI 各分类与四态） */
  layerControl: ZhtLayerControlState;
  onLayerControlChange: (patch: Partial<ZhtLayerControlState>) => void;
  /** 地图 load 后写入，供右侧「地图搜索」结果卡片触发 flyTo */
  mapSearchFlyToRef?: React.MutableRefObject<((point: ZhtUnifiedSearchPoint) => void) | null>;
  /** 由父级持有，与「点击结果卡片打开详情」一致；写入 `openUnifiedSearchPointDetail` */
  mapSearchOpenDetailRef?: React.MutableRefObject<((point: ZhtUnifiedSearchPoint) => void) | null>;
  /** 地图 load 后写入，供指标抽屉卡片地址/定位图标触发 flyTo / fitBounds */
  statDrawerMapFocusRef?: React.MutableRefObject<((focus: ZhtStatDrawerMapFocus) => void) | null>;
  /** 工具条「搜索」：父级切换右侧分析看板 / 地图搜索 */
  onToggleMapSearch?: () => void;
  /** 右侧「地图搜索」面板打开时为 true：地图隐藏默认台账/监测点，仅绘当前查询结果点（可点详情） */
  mapSearchPanelOpen?: boolean;
  /** 空间要素 + 数据原点 + 尚无查询覆盖层：恢复默认台账/监测 DOM，便于对照选下拉原点 */
  mapSearchShowDefaultPoiMarkers?: boolean;
  /** 为 true 时：下一次地图点击作为空间查询原点（十字光标），不打开设施详情 */
  spatialMapPickActive?: boolean;
  /** 地图选点完成（经纬度） */
  onSpatialMapPick?: (lng: number, lat: number) => void;
  /** 条件 / 空间查询结果：带序号点；空间查询另含圆与原点；null 清除 */
  searchMapOverlay?: ZhtSearchMapOverlay | null;
  /** 当前选中的结果点 id：WebGL 序号点或设施 DOM 命中态略放大（列表无高亮） */
  searchMapSelectedPointId?: string | null;
  /** 点击地图上的查询结果序号点（与列表一致） */
  onSearchMapResultClick?: (point: ZhtUnifiedSearchPoint) => void;
  /** 空间要素查询：未提交查询前，在地图上预览查询原点与半径（米） */
  spatialQueryPreview?: ZhtSpatialQueryPreview | null;
  /** 指标抽屉地址定位：POI 图层关时临时揭开对应统一点位；地图按下后由 `onClearStatDrawerPoiPeek` 清除 */
  statDrawerPoiPeek?: ZhtStatDrawerPeekPoi | null;
  onClearStatDrawerPoiPeek?: () => void;
  /**
   * 为 true 时在地图 WebGL 画布 `mousedown` 触发 `onClearStatDrawerPoiPeek`。
   * 除临时揭开 POI 外，含查询结果命中、抽屉/报警橙框定位选中等任意地图联动选中态（由父级汇总）。
   */
  mapCanvasSelectionClearActive?: boolean;
  /** 地图 load 后写入：抽屉卡片整卡点击 → 与地图 POI 一致打开详情 */
  drawerPoiClickHandlerRef?: React.MutableRefObject<((hit: ZhtStatDrawerPoiClick) => void) | null>;
  /**
   * 每帧由父级写入：指标明细铺满地图列时为 true。
   * 详情弹窗内是否展示「位置地图」小窗：铺开时主地图被遮，需小地图；侧栏时主地图可见则不重复。
   */
  zhtStatDetailEmbedMiniMapRef?: React.MutableRefObject<boolean>;
  /**
   * 浏览器全屏时的根节点（建议为「地图列 + 仅地图搜索」容器，不含分析看板）。
   * 不传则仅为 `zht-maplibre-stack`，全屏后地图搜索面板在视口外不可用。
   */
  mapFullscreenStageRef?: React.RefObject<HTMLDivElement | null>;
}

export const ZhtMaplibreBoard: React.FC<ZhtMaplibreBoardProps> = ({
  showAdminDivisionHints = true,
  showZeroDirectIndicators = true,
  layerControl,
  onLayerControlChange,
  mapSearchFlyToRef,
  mapSearchOpenDetailRef,
  statDrawerMapFocusRef,
  onToggleMapSearch,
  mapSearchPanelOpen = false,
  mapSearchShowDefaultPoiMarkers = false,
  spatialMapPickActive,
  onSpatialMapPick,
  searchMapOverlay,
  searchMapSelectedPointId,
  onSearchMapResultClick,
  spatialQueryPreview,
  statDrawerPoiPeek = null,
  onClearStatDrawerPoiPeek,
  mapCanvasSelectionClearActive = false,
  drawerPoiClickHandlerRef,
  zhtStatDetailEmbedMiniMapRef,
  mapFullscreenStageRef,
}) => {
  const poiLayerSlice = waterEnvPoiLayerControlSlice(layerControl);
  const stackRef = useRef<HTMLDivElement>(null);
  const fullscreenTargetRef = mapFullscreenStageRef ?? stackRef;
  /** 地图栈或外层舞台处于浏览器全屏时，详情 Modal 须挂进同一节点，否则仍在 body 上不可见 */
  const getDetailModalContainer = useCallback(() => {
    return zhtResolveDetailModalContainer(mapFullscreenStageRef?.current ?? stackRef.current ?? null);
  }, [mapFullscreenStageRef]);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const spatialPickActiveRef = useRef(false);
  const spatialPickConsumedRef = useRef(false);
  const onSpatialMapPickRef = useRef(onSpatialMapPick);
  onSpatialMapPickRef.current = onSpatialMapPick;
  spatialPickActiveRef.current = !!spatialMapPickActive;
  const onSearchMapResultClickRef = useRef(onSearchMapResultClick);
  onSearchMapResultClickRef.current = onSearchMapResultClick;

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTitle, setDetailTitle] = useState('');
  const [detailTitleBadges, setDetailTitleBadges] = useState<DetailTitleBadge[]>([]);
  /** 详情弹窗内位置地图显隐：侧栏不显示，铺满抽屉显示 */
  const [detailShowMiniMap, setDetailShowMiniMap] = useState(false);
  const [detailBody, setDetailBody] = useState<React.ReactNode>(null);
  const [detailKey, setDetailKey] = useState(0);
  /** 与设施管理列表详情一致：台账三件套加宽，其余 800 */
  const [detailModalWidth, setDetailModalWidth] = useState<number | string>(ZHT_MAP_OTHER_DETAIL_WIDTH);
  /** 排口详情内钻取后「返回上一层」：栈存工厂，避免恢复后仍持有过期钻取回调 */
  const detailDrilldownStackRef = useRef<
    Array<{ title: string; width: number | string; restoreBody: () => React.ReactNode }>
  >([]);
  const [detailDrilldownDepth, setDetailDrilldownDepth] = useState(0);
  const detailTitleSyncRef = useRef('');
  const detailWidthSyncRef = useRef<number | string>(ZHT_MAP_OTHER_DETAIL_WIDTH);
  useEffect(() => {
    detailTitleSyncRef.current = detailTitle;
  }, [detailTitle]);
  useEffect(() => {
    detailWidthSyncRef.current = detailModalWidth;
  }, [detailModalWidth]);

  const resetDetailDrilldownStack = useCallback(() => {
    detailDrilldownStackRef.current = [];
    setDetailDrilldownDepth(0);
  }, []);

  /** 详情「实时监测」内物联关联变更写入此处，地图 POI 与台账合并视图同源刷新（原型不接后端） */
  const [facilityIotLinkOverrides, setFacilityIotLinkOverrides] = useState<Record<string, string[]>>({});
  /** 递增以强制 DOM POI effect 重挂载（与 overrides 对象引用解耦，避免闭包/批处理边界漏刷） */
  const [facilityIotLinkEpoch, setFacilityIotLinkEpoch] = useState(0);
  /** 水质监测站演示点：`mon-*` id → 物联关联（与详情保存同步地图 POI） */
  const [monitorIotLinkOverrides, setMonitorIotLinkOverrides] = useState<Record<string, string[]>>({});

  const mergeFacilityRecord = useCallback((kind: FacilityMapKind, id: string): Record<string, unknown> | null => {
    const row = findFacilityLedgerRecord(kind, id);
    if (!row) return null;
    const key = `${kind}:${id}`;
    if (!Object.prototype.hasOwnProperty.call(facilityIotLinkOverrides, key)) return row;
    return { ...row, iotLinkedDeviceKeys: facilityIotLinkOverrides[key] };
  }, [facilityIotLinkOverrides]);

  /** 每帧指向最新合并函数，供模块级 `getMergedFacilityLedgerRecord` 调用（避免注册闭包滞后于渲染） */
  const mergeFacilityRecordRef = useRef(mergeFacilityRecord);
  mergeFacilityRecordRef.current = mergeFacilityRecord;

  /** 统一点位四态等与 DOM POI 共用合并台账：稳定注册 + ref 桥接，始终读到最新物联覆盖 */
  useEffect(() => {
    registerFacilityMapLedgerMerge((kind, id) => mergeFacilityRecordRef.current(kind, id));
    return () => registerFacilityMapLedgerMerge(null);
  }, []);

  /** 地图详情弹窗内保存物联关联 → 写入覆盖并 bump epoch */
  const patchFacilityIotKeys = useCallback((kind: FacilityMapKind, id: string, keys: string[]) => {
    setFacilityIotLinkOverrides(prev => ({ ...prev, [`${kind}:${id}`]: keys }));
    setFacilityIotLinkEpoch(e => e + 1);
  }, []);

  const patchMonitorIotKeys = useCallback((monId: string, keys: string[]) => {
    setMonitorIotLinkOverrides(prev => ({ ...prev, [monId]: keys }));
    setFacilityIotLinkEpoch(e => e + 1);
  }, []);

  const monitorIotLinkOverridesRef = useRef(monitorIotLinkOverrides);
  monitorIotLinkOverridesRef.current = monitorIotLinkOverrides;

  /** 统一点位四态：水质监测站与 DOM POI 共用物联覆盖快照 */
  useEffect(() => {
    registerMonitoringMapIotOverrides(() => monitorIotLinkOverridesRef.current);
    return () => registerMonitoringMapIotOverrides(null);
  }, []);

  const goBackMapFacilityDetail = useCallback(() => {
    const snap = detailDrilldownStackRef.current.pop();
    setDetailDrilldownDepth(detailDrilldownStackRef.current.length);
    if (!snap) return;
    setDetailKey(k => k + 1);
    setDetailTitle(snap.title);
    setDetailBody(snap.restoreBody());
    setDetailModalWidth(snap.width);
  }, []);

  /** 地图排口详情主体（含钻取）；返回时重新挂载以绑定最新 ref 与回调 */
  const renderMapOutletDetailBody = useCallback(
    (
      outletRecord: Record<string, unknown>,
      opts: {
        initialTabKey?: string;
        showMini: boolean;
        onIotLinkedDeviceKeysChange?: (keys: string[]) => void;
      },
    ) => (
      <OutletDetailContent
        key={`${String(outletRecord['入河入海排污口编码'] ?? '')}-${opts.initialTabKey ?? ''}-map`}
        record={outletRecord}
        initialTabKey={opts.initialTabKey}
        showLocationMiniMap={opts.showMini}
        onIotLinkedDeviceKeysChange={opts.onIotLinkedDeviceKeysChange}
        onOpenRelatedFacilityDetail={(row: LinkedOutletBackrefRow) => {
          const pack = buildRelatedFacilityDetailModalPack(row);
          if (!pack) return;
          detailDrilldownStackRef.current.push({
            title: detailTitleSyncRef.current,
            width: detailWidthSyncRef.current,
            restoreBody: () =>
              renderMapOutletDetailBody(outletRecord, {
                ...opts,
                showMini: zhtStatDetailEmbedMiniMapRef?.current ?? false,
              }),
          });
          setDetailDrilldownDepth(detailDrilldownStackRef.current.length);
          setDetailKey(k => k + 1);
          setDetailTitle(pack.title);
          setDetailBody(pack.content);
          setDetailModalWidth(pack.width);
        }}
        onOpenResponsiblePartyDetail={(row: OutletResponsiblePartyRecord) => {
          detailDrilldownStackRef.current.push({
            title: detailTitleSyncRef.current,
            width: detailWidthSyncRef.current,
            restoreBody: () =>
              renderMapOutletDetailBody(outletRecord, {
                ...opts,
                showMini: zhtStatDetailEmbedMiniMapRef?.current ?? false,
              }),
          });
          setDetailDrilldownDepth(detailDrilldownStackRef.current.length);
          setDetailKey(k => k + 1);
          setDetailTitle(`责任主体详情 - ${row.责任主体名称}`);
          setDetailBody(
            <OutletResponsiblePartyDetailContent
              r={row}
              showLocationMiniMap={zhtStatDetailEmbedMiniMapRef?.current ?? false}
            />,
          );
          setDetailModalWidth('min(1200px, 96vw)');
        }}
      />
    ),
    [zhtStatDetailEmbedMiniMapRef],
  );
  /** 地图 style 已 load，空间覆盖层可安全 addSource */
  const [mapIsReady, setMapIsReady] = useState(false);
  /**
   * `setStyle` 会清空本组件叠加层，但依赖 `spatialRange` 的条目不一定会变 → effect 不跑。
   * `style.load` 自增，强制重挂测地圆/绿预览与圆心 DOM。
   */
  const [mapStyleLoadEpoch, setMapStyleLoadEpoch] = useState(0);
  useEffect(() => {
    const map = mapRef.current;
    if (!mapIsReady || !map) return;
    const bump = () => setMapStyleLoadEpoch(n => n + 1);
    map.on('style.load', bump);
    return () => {
      map.off('style.load', bump);
    };
  }, [mapIsReady]);

  /** POI提示配置：仅控制 HTML 提示板；地图点位圆点图层不受此开关影响（常亮与数据源/图层控制相关） */
  const [poiFacilityTitle, setPoiFacilityTitle] = useState(ZHT_POI_HINT_UI_DEFAULTS.facilityTitle);
  const [poiMonitorValues, setPoiMonitorValues] = useState(ZHT_POI_HINT_UI_DEFAULTS.monitorValues);
  const [poiFacilityTitleFont, setPoiFacilityTitleFont] = useState<ZhtPoiHintFontPreset>(
    ZHT_POI_HINT_UI_DEFAULTS.facilityTitleFont,
  );
  const [poiMonitorValuesFont, setPoiMonitorValuesFont] = useState<ZhtPoiHintFontPreset>(
    ZHT_POI_HINT_UI_DEFAULTS.monitorValuesFont,
  );

  const resetPoiHintsToDefault = useCallback(() => {
    const d = ZHT_POI_HINT_UI_DEFAULTS;
    setPoiFacilityTitle(d.facilityTitle);
    setPoiMonitorValues(d.monitorValues);
    setPoiFacilityTitleFont(d.facilityTitleFont);
    setPoiMonitorValuesFont(d.monitorValuesFont);
  }, []);

  /** 底图：浅色矢量（默认）/ 影像栅格 */
  const [basemapKind, setBasemapKind] = useState<ZhtBasemapKind>('vector');
  /** 地图透明度 0–100：0 底图不透明（全显），100 底图全透明；`zht-` 行政界与 DOM 不受乘数影响 */
  const [mapTransparencyPercent, setMapTransparencyPercent] = useState(0);
  const mapTransparencyPercentRef = useRef(mapTransparencyPercent);
  mapTransparencyPercentRef.current = mapTransparencyPercent;
  const lastBasemapKindRef = useRef<ZhtBasemapKind>('vector');

  const poiMarkersRef = useRef<maplibregl.Marker[]>([]);
  /**
   * 空间查询圆心：WebGL 圆层在 canvas 上，查询结果用 DOM 承载时必压在 canvas 上，会挡住圆心点；
   * 用高 z-index 的 Marker 叠在结果点之上，保证从选点、提交到出结果圆心一直可见。
   */
  const spatialRangeOriginDomMarkerRef = useRef<maplibregl.Marker | null>(null);
  /** 行政区划名称 Marker（与业务 POI 分轨清理） */
  const adminDivisionMarkersRef = useRef<maplibregl.Marker[]>([]);
  const adminDivisionResizeObserversRef = useRef<ResizeObserver[]>([]);
  /** POI 提示板增删会改变 Marker 根节点高度；MapLibre 不会自动重算锚点，需在尺寸变化时 setLngLat 踢一脚 */
  const poiMarkerResizeObserversRef = useRef<ResizeObserver[]>([]);

  const openFacilityDetail = useCallback(
    (kind: FacilityMapKind, id: string) => {
      const record = mergeFacilityRecord(kind, id);
      if (!record) return;
      const showMini = zhtStatDetailEmbedMiniMapRef?.current ?? false;
      setDetailShowMiniMap(showMini);
      resetDetailDrilldownStack();
      setDetailKey(k => k + 1);
      setDetailTitleBadges([]);
      setDetailModalWidth(ZHT_MAP_FACILITY_DETAIL_WIDTH);
      /** 非离线（报警红 / 在线绿 / 信息点蓝）时默认打开「实时监测」页签 */
      const initialTabKey = deriveFacilityDisplayState(kind, record) !== 'offline' ? 'monitor' : undefined;
      const patchIotKeys = (keys: string[]) => {
        patchFacilityIotKeys(kind, id, keys);
      };
      if (kind === 'pump') {
        setDetailTitle(`泵站详情 - ${String(record.pustName ?? record.name ?? '')}`);
        setDetailBody(
          <PumpDetailContent
            record={record}
            initialTabKey={initialTabKey}
            showLocationMiniMap={showMini}
            onIotLinkedDeviceKeysChange={patchIotKeys}
          />,
        );
      } else if (kind === 'outlet') {
        setDetailTitle(`排口详情 - ${String(record['入河入海排污口名称'] ?? record.name ?? '')}`);
        setDetailBody(
          renderMapOutletDetailBody(record, {
            initialTabKey,
            showMini,
            onIotLinkedDeviceKeysChange: patchIotKeys,
          }),
        );
      } else if (kind === 'discharger') {
        setDetailTitle(`排水户详情 - ${String(record.dischargerName ?? '')}`);
        setDetailBody(<DischargerDetailContent record={record as unknown as PsDischargerRecord} />);
      } else {
        setDetailTitle(`污水厂详情 - ${String(record.name ?? '')}`);
        setDetailBody(
          <PlantDetailContent
            record={record}
            initialTabKey={initialTabKey}
            showLocationMiniMap={showMini}
            onIotLinkedDeviceKeysChange={patchIotKeys}
          />,
        );
      }
      setDetailOpen(true);
    },
    [
      mergeFacilityRecord,
      patchFacilityIotKeys,
      resetDetailDrilldownStack,
      renderMapOutletDetailBody,
      zhtStatDetailEmbedMiniMapRef,
    ],
  );

  const openFacilityDetailRef = useRef(openFacilityDetail);
  openFacilityDetailRef.current = openFacilityDetail;

  /** 统一点位：设施走台账详情 Modal；监测与其它走摘要 Modal */
  const openUnifiedSearchPointDetail = useCallback(
    (pt: ZhtUnifiedSearchPoint) => {
      const showMini = zhtStatDetailEmbedMiniMapRef?.current ?? false;
      setDetailShowMiniMap(showMini);
      resetDetailDrilldownStack();
      setDetailTitleBadges([]);
      const fac = parseZhtFacilityUnifiedSearchId(pt.id);
      if (fac) {
        openFacilityDetail(fac.kind, fac.rawId);
        return;
      }
      const respMeta = parseZhtOutletResponsibleUnifiedSearchId(pt.id);
      if (respMeta) {
        const row = outletResponsiblePartyInitial.find(x => x.责任主体内码 === respMeta.rawInnerId);
        if (row) {
          setDetailKey(k => k + 1);
          /** 与设施管理责任主体详情弹窗同宽、同内容组件 */
          setDetailModalWidth('min(1200px, 96vw)');
          setDetailTitle(`责任主体详情 - ${row.责任主体名称}`);
          setDetailBody(<ZhtOutletResponsibleMapDetail row={row} showLocationMiniMap={showMini} />);
          setDetailOpen(true);
          return;
        }
      }
      const mon = parseZhtMonitorUnifiedSearchId(pt.id);
      if (mon) {
        const demo = ZHT_MONITORING_POI_DEMO.find(m => m.id === mon.rawMonId);
        setDetailKey(k => k + 1);
        setDetailModalWidth(
          demo && demo.metrics.length > 0 ? ZHT_MAP_LEDGER_DETAIL_WIDTH : ZHT_MAP_OTHER_DETAIL_WIDTH,
        );
        setDetailTitle(demo ? `水质监测 · ${demo.title}` : `水质监测 · ${pt.name}`);
        const isSectionMonitor = !!demo && /断面/.test(demo.title);
        const badges: DetailTitleBadge[] = [];
        if (isSectionMonitor && demo.sectionControlLevel) {
          badges.push({ label: demo.sectionControlLevel });
        }
        if (isSectionMonitor && demo.waterQualityTargetClass) {
          badges.push({
            label: `目标${demo.waterQualityTargetClass}`,
            tone: waterQualityClassTone(demo.waterQualityTargetClass),
          });
        }
        setDetailTitleBadges(badges);
        setDetailBody(
          <UnifiedSearchPointDetailContent
            pt={pt}
            demo={demo ?? null}
            showLocationMiniMap={showMini}
            onMonitorIotLinkedDeviceKeysChange={patchMonitorIotKeys}
          />,
        );
        setDetailOpen(true);
        return;
      }
      setDetailKey(k => k + 1);
      const led = getUnifiedPointLedgerDescriptionSections(pt);
      const hasLedger = led.length > 0;
      let nextW: number | string = hasLedger ? ZHT_MAP_LEDGER_DETAIL_WIDTH : ZHT_MAP_OTHER_DETAIL_WIDTH;
      let nextTitle = `${pt.sourceProject} · ${pt.name}`;
      if (pt.id.startsWith('zht-eco-affair-')) {
        nextTitle = `事务详情 — ${pt.code}`;
        nextW = ZHT_ECO_AFFAIR_MODAL_W;
      } else if (pt.id.startsWith('zht-eco-proj-')) {
        nextTitle = '项目详情';
        nextW = ZHT_ECO_PROJ_MODAL_W;
      } else if (pt.id.startsWith('zht-eco-lake-')) {
        nextTitle = '湖泊信息详情';
        nextW = ZHT_ECO_LAKE_MODAL_W;
      } else if (pt.id.startsWith('zht-river-sec-')) {
        nextTitle = '河段详情';
        nextW = ZHT_MAP_LEDGER_DETAIL_WIDTH;
      } else if (pt.id.startsWith('zht-sys-hydro-')) {
        nextTitle = '水库详情';
        nextW = ZHT_SYS_HYDRO_RES_MODAL_W;
      } else if (pt.id.startsWith('zht-sys-sluice-')) {
        nextTitle = '闸坝详情';
        nextW = ZHT_SYS_HYDRO_RES_MODAL_W;
      } else if (pt.id.startsWith('zht-sys-watergate-')) {
        nextTitle = '水闸详情';
        nextW = ZHT_SYS_HYDRO_RES_MODAL_W;
      } else if (pt.id.startsWith('zht-sys-levee-')) {
        nextTitle = '堤防详情';
        nextW = ZHT_SYS_HYDRO_RES_MODAL_W;
      } else if (pt.id.startsWith('zht-sys-weir-')) {
        nextTitle = '堰坝详情';
        nextW = ZHT_SYS_HYDRO_RES_MODAL_W;
      } else if (pt.id.startsWith('zht-sys-polder-')) {
        nextTitle = '圩区详情';
        nextW = ZHT_SYS_HYDRO_RES_MODAL_W;
      } else if (pt.id.startsWith('zht-sys-hillpond-')) {
        nextTitle = '山塘详情';
        nextW = ZHT_SYS_HYDRO_RES_MODAL_W;
      } else if (pt.id.startsWith('zht-emg-ent-')) {
        nextTitle = '企业详情';
        nextW = 880;
      } else if (pt.id.startsWith('zht-emg-supply-')) {
        nextTitle = '物资点详情';
        nextW = 1100;
      } else if (pt.id.startsWith('zht-emg-team-')) {
        nextTitle = '队伍详情';
        nextW = 920;
      } else if (pt.id.startsWith('zht-emg-evt-')) {
        const eid = pt.id.slice('zht-emg-'.length);
        const ev = initialEmergencyEvents.find(x => x.id === eid);
        nextTitle = ev ? `应急事件详情 — ${ev.eventCode}` : '应急事件详情';
        nextW = 960;
      }
      setDetailModalWidth(nextW);
      setDetailTitle(nextTitle);
      setDetailBody(<UnifiedSearchPointDetailContent pt={pt} showLocationMiniMap={showMini} />);
      setDetailOpen(true);
    },
    [openFacilityDetail, patchMonitorIotKeys, resetDetailDrilldownStack, zhtStatDetailEmbedMiniMapRef],
  );

  const openUnifiedSearchPointDetailRef = useRef(openUnifiedSearchPointDetail);
  openUnifiedSearchPointDetailRef.current = openUnifiedSearchPointDetail;

  useEffect(() => {
    if (!mapSearchOpenDetailRef) return;
    mapSearchOpenDetailRef.current = openUnifiedSearchPointDetail;
    return () => {
      mapSearchOpenDetailRef.current = null;
    };
  }, [mapSearchOpenDetailRef, openUnifiedSearchPointDetail]);

  /** 污染源：配置中心同源台账详情 */
  const openPollutionDetail = useCallback(
    (pt: ZhtPollutionMapPoint) => {
      const showMini = zhtStatDetailEmbedMiniMapRef?.current ?? false;
      setDetailShowMiniMap(showMini);
      resetDetailDrilldownStack();
      setDetailKey(k => k + 1);
      setDetailTitleBadges([]);
      setDetailModalWidth(ZHT_MAP_OTHER_DETAIL_WIDTH);
      setDetailTitle(`${ZHT_POLLUTION_KIND_LABEL[pt.kind]} · ${pt.name}`);
      setDetailBody(<PollutionSourceDetailBody point={pt} showLocationMiniMap={showMini} />);
      setDetailOpen(true);
    },
    [resetDetailDrilldownStack, zhtStatDetailEmbedMiniMapRef],
  );

  const openPollutionDetailRef = useRef(openPollutionDetail);
  openPollutionDetailRef.current = openPollutionDetail;

  /** 左侧指标抽屉：整卡点击与地图圆点一致打开台账/监测/污染源详情 */
  useEffect(() => {
    if (!drawerPoiClickHandlerRef) return;
    drawerPoiClickHandlerRef.current = (hit: ZhtStatDrawerPoiClick) => {
      const showMini = zhtStatDetailEmbedMiniMapRef?.current ?? false;
      setDetailShowMiniMap(showMini);
      if (hit.type === 'riverChiefContact') {
        const row = initialRiverChiefContacts.find(c => c.id === hit.contactId);
        if (row) {
          resetDetailDrilldownStack();
          setDetailKey(k => k + 1);
          setDetailModalWidth(720);
          setDetailTitle(`联系人详情 — ${row.name}`);
          setDetailBody(<RiverChiefContactReadonlyDetailContent detail={row} />);
          setDetailOpen(true);
        }
        return;
      }
      if (hit.type === 'riverChannel') {
        const row = initialRiverChannelMasterData.find(r => r.riverObjectId === hit.riverObjectId);
        if (row) {
          resetDetailDrilldownStack();
          setDetailKey(k => k + 1);
          setDetailModalWidth(1040);
          setDetailTitle(`河流信息详情 — ${row.riverName}`);
          setDetailBody(
            <RiverChannelReadonlyDetailContent
              river={row}
              sections={initialRiverSectionData}
              showLocationMiniMap={showMini}
            />,
          );
          setDetailOpen(true);
        }
        return;
      }
      if (hit.type === 'riverChannel') {
        const row = initialRiverChannelMasterData.find(r => r.riverObjectId === hit.riverObjectId);
        if (row) {
          resetDetailDrilldownStack();
          setDetailKey(k => k + 1);
          setDetailModalWidth(1040);
          setDetailTitle(`河流信息详情 — ${row.riverName}`);
          setDetailBody(
            <RiverChannelReadonlyDetailContent
              river={row}
              sections={initialRiverSectionData}
              showLocationMiniMap={showMini}
            />,
          );
          setDetailOpen(true);
        }
        return;
      }
      if (hit.type === 'emergencyExpert') {
        const ex = initialRiskData.experts.find(x => x.id === hit.id);
        resetDetailDrilldownStack();
        setDetailKey(k => k + 1);
        setDetailModalWidth(720);
        setDetailTitle(ex ? `应急专家详情 — ${ex.name}` : '应急专家详情');
        setDetailBody(<EmgExpertReadonlyMapDetailContent id={hit.id} />);
        setDetailOpen(true);
        return;
      }
      if (hit.type === 'emergencyPlan') {
        const p = initialRiskData.plans.find(x => x.id === hit.id);
        resetDetailDrilldownStack();
        setDetailKey(k => k + 1);
        setDetailModalWidth(800);
        setDetailTitle(p ? `应急预案详情 — ${p.name}` : '应急预案详情');
        setDetailBody(<EmgEmergencyPlanReadonlyMapDetailContent id={hit.id} />);
        setDetailOpen(true);
        return;
      }
      if (hit.type === 'emergencySupply') {
        const s = initialRiskData.supplies.find(x => x.id === hit.id);
        resetDetailDrilldownStack();
        setDetailKey(k => k + 1);
        setDetailModalWidth(800);
        setDetailTitle(s ? `应急物资详情 — ${s.name}` : '应急物资详情');
        setDetailBody(<EmgSupplyRowReadonlyMapDetailContent id={hit.id} />);
        setDetailOpen(true);
        return;
      }
      if (hit.type === 'unified') {
        const pt = getZhtUnifiedSearchPointsCached().find(p => p.id === hit.unifiedId);
        if (pt) openUnifiedSearchPointDetailRef.current?.(pt);
      } else {
        const rows = getPollutionMapPointsByKind(hit.kind);
        const ppt = rows.find(p => p.id === hit.id);
        if (ppt) openPollutionDetailRef.current?.(ppt);
      }
    };
    return () => {
      drawerPoiClickHandlerRef.current = null;
    };
  }, [drawerPoiClickHandlerRef, resetDetailDrilldownStack, zhtStatDetailEmbedMiniMapRef]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const map = new maplibregl.Map({
      container: el,
      style: ZHT_DEFAULT_VECTOR_STYLE_URL,
      center: PARK_MAPLIBRE_DEFAULT_CENTER,
      zoom: PARK_MAPLIBRE_DEFAULT_ZOOM,
      attributionControl: { compact: true },
      /** 支持「地图视图导出」对 WebGL 画布 `toBlob`；略增 GPU 内存占用 */
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    mapRef.current = map;

    /** 左下角比例尺（公制） */
    map.addControl(
      new maplibregl.ScaleControl({
        maxWidth: 120,
        unit: 'metric',
      }),
      'bottom-left',
    );

    const kickResize = () => {
      map.resize();
    };
    requestAnimationFrame(kickResize);
    requestAnimationFrame(() => requestAnimationFrame(kickResize));
    const resizeTimer1 = window.setTimeout(kickResize, 80);
    const resizeTimer2 = window.setTimeout(kickResize, 400);

    const ro = new ResizeObserver(() => {
      map.resize();
    });
    ro.observe(el);

    const onMapLoad = () => {
      kickResize();
      setMapIsReady(true);
      /**
       * 左栏 + 地图列 + 右侧指标栏时，地图画布几何中心 ≠ 浏览器视口中心；
       * flyTo/fitBounds 的 offset 使目标点落在视口中心，避免 POI 看起来「偏在一边」。
       */
      const flyAlignViewportOffsetPx = (): [number, number] | undefined => {
        const host = containerRef.current;
        if (!host) return undefined;
        const rect = host.getBoundingClientRect();
        const w = host.clientWidth;
        const h = host.clientHeight;
        if (w < 64 || h < 64) return undefined;
        const mapCx = w / 2;
        const mapCy = h / 2;
        const vpX = window.innerWidth / 2 - rect.left;
        const vpY = window.innerHeight / 2 - rect.top;
        return [vpX - mapCx, vpY - mapCy];
      };

      if (mapSearchFlyToRef) {
        mapSearchFlyToRef.current = (point: ZhtUnifiedSearchPoint) => {
          if (!map.loaded()) return;
          const z = map.getZoom();
          const off = flyAlignViewportOffsetPx();
          const c = getZhtSearchPointMapCoordinate(point);
          map.flyTo({
            center: [c.lng, c.lat],
            zoom: Math.min(18, Math.max(z + 0.45, 14.6)),
            essential: true,
            ...(off ? { offset: off } : {}),
          });
        };
      }
      if (statDrawerMapFocusRef) {
        statDrawerMapFocusRef.current = (focus: ZhtStatDrawerMapFocus) => {
          if (!map.loaded()) return;
          // 指标抽屉铺满态收起后容器变宽，须先 resize；再延后一帧 fly，让 MapLibre 用上正确画布尺寸
          map.resize();
          window.requestAnimationFrame(() => {
            if (!map.loaded()) return;
            const off = flyAlignViewportOffsetPx();
            if (focus.kind === 'point') {
              const z = map.getZoom();
              map.flyTo({
                center: [focus.lng, focus.lat],
                zoom: focus.zoom ?? Math.min(18, Math.max(z + 0.45, 14.6)),
                essential: true,
                ...(off ? { offset: off } : {}),
              });
            } else {
              const b = new maplibregl.LngLatBounds([focus.west, focus.south], [focus.east, focus.north]);
              map.fitBounds(b, {
                padding: focus.padding ?? 56,
                maxZoom: 15.5,
                duration: 900,
                essential: true,
                ...(off ? { offset: off } : {}),
              });
            }
          });
        };
      }
    };

    map.once('load', onMapLoad);

    return () => {
      setMapIsReady(false);
      if (mapSearchFlyToRef) {
        mapSearchFlyToRef.current = null;
      }
      if (statDrawerMapFocusRef) {
        statDrawerMapFocusRef.current = null;
      }
      ro.disconnect();
      window.clearTimeout(resizeTimer1);
      window.clearTimeout(resizeTimer2);
      map.remove();
      mapRef.current = null;
    };
  }, [mapSearchFlyToRef, statDrawerMapFocusRef]);

  /**
   * 工具条切换底图：`setStyle` 会清空样式；除常驻 `style.load` → `zhtSync` 外，再在 **下一帧 `idle`** 补跑一次，
   * 避免「样式已 load 但瓦片/批次未稳」时行政界线偶发挂不上。
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!mapIsReady || !map?.loaded?.()) return;
    if (lastBasemapKindRef.current === basemapKind) return;
    lastBasemapKindRef.current = basemapKind;
    map.setStyle(zhtBasemapStyleForKind(basemapKind));
    map.once('idle', () => {
      zhtSyncBasemapOpacityAndBoundary(
        mapRef.current,
        containerRef.current,
        mapTransparencyPercentRef.current,
      );
    });
  }, [mapIsReady, basemapKind]);

  /**
   * 地图透明度 + 韶山行政界：单一 `style.load` 入口；`zhtSync` 内带重试，切换矢量/影像后仍补界。
   */
  useEffect(() => {
    const map = mapRef.current;
    const host = containerRef.current;
    if (!mapIsReady || !map || !host) return;

    const scheduleSync = () => {
      zhtSyncBasemapOpacityAndBoundary(
        mapRef.current,
        containerRef.current,
        mapTransparencyPercentRef.current,
      );
    };

    map.on('style.load', scheduleSync);
    scheduleSync();

    return () => {
      map.off('style.load', scheduleSync);
      const m = mapRef.current;
      if (!m?.loaded()) return;
      if (m.getLayer(LYR_ZHT_SHAOSHAN_BOUNDARY)) m.removeLayer(LYR_ZHT_SHAOSHAN_BOUNDARY);
      if (m.getLayer(LYR_ZHT_SHAOSHAN_ADM_FILL)) m.removeLayer(LYR_ZHT_SHAOSHAN_ADM_FILL);
      if (m.getSource(SRC_ZHT_SHAOSHAN_BOUNDARY)) m.removeSource(SRC_ZHT_SHAOSHAN_BOUNDARY);
    };
  }, [mapIsReady]);

  /** 滑块拖动：走同一套 `zhtSync`（内含重试） */
  useEffect(() => {
    mapTransparencyPercentRef.current = mapTransparencyPercent;
    if (!mapIsReady) return;
    zhtSyncBasemapOpacityAndBoundary(mapRef.current, containerRef.current, mapTransparencyPercent);
  }, [mapIsReady, mapTransparencyPercent]);

  /** 行政区划名称提示（演示）：与 POI 提示配置解耦，仅图层「行政区划 / 零直排」 */
  useEffect(() => {
    const map = mapRef.current;
    adminDivisionResizeObserversRef.current.forEach(o => o.disconnect());
    adminDivisionResizeObserversRef.current = [];
    adminDivisionMarkersRef.current.forEach(m => m.remove());
    adminDivisionMarkersRef.current = [];
    /** 勿仅用 map.loaded()：与 setState(mapIsReady) 同帧时可能仍为 false，导致首屏从不挂 Marker */
    if (!mapIsReady || !map || !showAdminDivisionHints) return;

    const pts = ZHT_ADMIN_DIVISION_HINTS_DEMO.map(d => ({ lng: d.lng, lat: d.lat }));
    let minLat = 90;
    let maxLat = -90;
    let minLng = 180;
    let maxLng = -180;
    for (const p of pts) {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    }

    const titlePx = ZHT_POI_HINT_FONT_PX.md;
    const next: maplibregl.Marker[] = [];
    /** Marker 内容根节点：与乡镇填色层同源 zoom→opacity 曲线 */
    const adminDivisionMarkerRoots: HTMLElement[] = [];
    for (const d of ZHT_ADMIN_DIVISION_HINTS_DEMO) {
      const root = document.createElement('div');
      appendAdminDivisionCard(root, d, titlePx, Boolean(showZeroDirectIndicators));
      /* 无 stack：仅卡片，锚点落在卡片底边，不模拟 POI 圆点 */
      root.classList.add('zht-map-poi-marker-root');
      adminDivisionMarkerRoots.push(root);
      let marker: maplibregl.Marker;
      try {
        marker = new maplibregl.Marker({ element: root, anchor: 'bottom' }).setLngLat([d.lng, d.lat]).addTo(map);
      } catch {
        adminDivisionMarkerRoots.pop();
        continue;
      }
      const z = zhtPoiMarkerZIndexFromPosition(d.lat, d.lng, minLat, maxLat, minLng, maxLng);
      marker.getElement().style.zIndex = String(ZHT_ADMIN_DIV_MARKER_Z_INDEX_BASE + z);
      next.push(marker);
      const ro = new ResizeObserver(() => {
        marker.setLngLat(marker.getLngLat());
      });
      ro.observe(marker.getElement());
      adminDivisionResizeObserversRef.current.push(ro);
    }
    adminDivisionMarkersRef.current = next;

    const syncAdminDivisionCardOpacity = () => {
      const m = mapRef.current;
      if (!m) return;
      const opacity01 = zhtShaoshanAdmHintBoardOpacityAtZoom(m.getZoom());
      const s = opacity01 >= 1 ? '' : String(opacity01);
      for (const markerRoot of adminDivisionMarkerRoots) {
        /** Marker 根节点由 MapLibre 定时写回 opacity=1，只能改内层卡片 */
        const card = markerRoot.querySelector('.zht-map-poi-hint--admin-division') as HTMLElement | null;
        if (!card) continue;
        if (s === '') card.style.removeProperty('opacity');
        else card.style.opacity = s;
      }
    };
    syncAdminDivisionCardOpacity();
    map.on('zoom', syncAdminDivisionCardOpacity);
    map.on('zoomend', syncAdminDivisionCardOpacity);
    map.on('moveend', syncAdminDivisionCardOpacity);

    requestAnimationFrame(() => {
      if (!mapRef.current?.loaded()) return;
      syncAdminDivisionCardOpacity();
      next.forEach(m => m.setLngLat(m.getLngLat()));
      mapRef.current?.triggerRepaint();
    });

    return () => {
      map.off('zoom', syncAdminDivisionCardOpacity);
      map.off('zoomend', syncAdminDivisionCardOpacity);
      map.off('moveend', syncAdminDivisionCardOpacity);
      adminDivisionResizeObserversRef.current.forEach(o => o.disconnect());
      adminDivisionResizeObserversRef.current = [];
      adminDivisionMarkersRef.current.forEach(m => m.remove());
      adminDivisionMarkersRef.current = [];
    };
  }, [mapIsReady, showAdminDivisionHints, showZeroDirectIndicators]);

  /** 空间查询：在地图空白处点击取原点（设施 DOM 圆点在选点模式下 pointer-events:none，点击穿透到地图） */
  useEffect(() => {
    if (!spatialMapPickActive) return;
    spatialPickConsumedRef.current = false;
    const map = mapRef.current;
    if (!map?.loaded()) return;

    const handler = (e: maplibregl.MapMouseEvent) => {
      if (!spatialPickActiveRef.current) return;
      if (spatialPickConsumedRef.current) return;
      spatialPickConsumedRef.current = true;
      onSpatialMapPickRef.current?.(e.lngLat.lng, e.lngLat.lat);
    };

    map.on('click', handler);
    map.getCanvas().style.cursor = 'crosshair';

    return () => {
      map.off('click', handler);
      map.getCanvas().style.cursor = '';
    };
  }, [spatialMapPickActive]);

  /** 条件 / 空间查询：WebGL 序号命中点（与下一段「测地圆+原点」effect 解耦，避免重跑时误清空间范围圈） */
  useEffect(() => {
    const map = mapRef.current;
    if (!mapIsReady || !map?.loaded()) return;

    removeSearchMapResultLayersOnly(map);

    const bumpBoundaryZ = () => {
      requestAnimationFrame(() => {
        if (mapRef.current?.loaded()) ensureZhtShaoshanCityBoundaryOnMap(mapRef.current);
      });
    };

    if (!searchMapOverlay) {
      bumpBoundaryZ();
      return;
    }

    const { results } = searchMapOverlay;

    if (!results.length) {
      bumpBoundaryZ();
      return () => {
        removeSearchMapResultLayersOnly(map);
      };
    }

    /** 与 DOM 搜索序号点一致：台账坐标 + 同经线微错开，避免 WebGL 点叠竖线 */
    const overlayMarkerLngLats = zhtSearchOverlayMarkerLngLats(results);

    /** 已在水环境图层下以 DOM 绘制的点不再叠 WebGL 序号点 */
    const slice = waterEnvPoiLayerControlSlice(layerControl);
    const geoResultEntries = results
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => !unifiedPointPassesWaterEnvLayerOrPeek(slice, p, statDrawerPoiPeek));

    /** 地图搜索打开且非「数据选点对照」时：结果点全部由 DOM Marker 承载（可点详情），不再叠 WebGL 避免点不穿 */
    if (mapSearchPanelOpen && !mapSearchShowDefaultPoiMarkers) {
      bumpBoundaryZ();
      return () => {
        removeSearchMapResultLayersOnly(map);
      };
    }

    if (geoResultEntries.length === 0) {
      bumpBoundaryZ();
      return () => {
        removeSearchMapResultLayersOnly(map);
      };
    }

    const resFeatures: GeoJSON.Feature<GeoJSON.Point, Record<string, string | number>>[] = geoResultEntries.map(
      ({ p, i }) => {
        const mc = overlayMarkerLngLats[i] ?? getZhtSearchPointMapCoordinate(p);
        return {
          type: 'Feature' as const,
          properties: {
            idx: String(i + 1),
            id: p.id,
            name: p.name,
            code: p.code,
            pointType: p.pointType,
            status: p.status,
            region: p.region,
            lng: mc.lng,
            lat: mc.lat,
            sourceProject: p.sourceProject,
          },
          geometry: { type: 'Point' as const, coordinates: [mc.lng, mc.lat] },
        };
      },
    );

    map.addSource(SRC_SR_RESULTS, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: resFeatures },
    });
    map.addLayer({
      id: LYR_SR_RES_PT,
      type: 'circle',
      source: SRC_SR_RESULTS,
      paint: {
        'circle-radius': 14,
        'circle-color': '#fa8c16',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });
    map.addLayer({
      id: LYR_SR_RES_TX,
      type: 'symbol',
      source: SRC_SR_RESULTS,
      layout: {
        'text-field': ['get', 'idx'],
        'text-font': SPATIAL_RES_TEXT_FONT,
        'text-size': 15,
        'text-offset': [0, 0],
        'text-anchor': 'center',
        'text-allow-overlap': true,
        'text-padding': 4,
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#fa8c16',
        'text-halo-width': 2,
        'text-halo-blur': 0.35,
      },
    });

    const onResClick = (e: maplibregl.MapLayerMouseEvent) => {
      if (spatialPickActiveRef.current) return;
      const f = e.features?.[0];
      const pt = spatialHitPropsToUnifiedPoint(f?.properties ?? null);
      if (pt) onSearchMapResultClickRef.current?.(pt);
    };
    const onResEnter = () => {
      if (!spatialPickActiveRef.current) map.getCanvas().style.cursor = 'pointer';
    };
    const onResLeave = () => {
      if (!spatialPickActiveRef.current) map.getCanvas().style.cursor = '';
    };

    map.on('click', LYR_SR_RES_PT, onResClick);
    map.on('click', LYR_SR_RES_TX, onResClick);
    map.on('mouseenter', LYR_SR_RES_PT, onResEnter);
    map.on('mouseleave', LYR_SR_RES_PT, onResLeave);
    map.on('mouseenter', LYR_SR_RES_TX, onResEnter);
    map.on('mouseleave', LYR_SR_RES_TX, onResLeave);

    bumpBoundaryZ();

    return () => {
      map.off('click', LYR_SR_RES_PT, onResClick);
      map.off('click', LYR_SR_RES_TX, onResClick);
      map.off('mouseenter', LYR_SR_RES_PT, onResEnter);
      map.off('mouseleave', LYR_SR_RES_PT, onResLeave);
      map.off('mouseenter', LYR_SR_RES_TX, onResEnter);
      map.off('mouseleave', LYR_SR_RES_TX, onResLeave);
      removeSearchMapResultLayersOnly(map);
    };
  }, [
    searchMapOverlay,
    mapIsReady,
    layerControl,
    mapSearchPanelOpen,
    mapSearchShowDefaultPoiMarkers,
    statDrawerPoiPeek,
    facilityIotLinkEpoch,
  ]);

  /**
   * 空间查询：已提交 `spatialRange` 的正式蓝测地圆+原点。
   * 与 `spatialQueryPreview` 解耦：绿预览存在时**仍**绘蓝圈，避免「有绿预览就清蓝层、绿又未叠上」导致整段圆与原点消失。
   * 调整半径/重选点时的绿虚线由下一 effect 叠在上方。
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!mapIsReady || !map?.loaded()) return;

    removeSearchMapSpatialRangeLayersOnly(map);
    const sr = searchMapOverlay?.spatialRange;
    if (!sr) {
      requestAnimationFrame(() => {
        if (mapRef.current?.loaded()) ensureZhtShaoshanCityBoundaryOnMap(mapRef.current);
      });
      return;
    }
    const { originLng, originLat, radiusM } = sr;
    const circleFeat = buildGeodesicCirclePolygon(originLng, originLat, radiusM);

    map.addSource(SRC_SR_CIRCLE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [circleFeat] },
    });
    map.addLayer({
      id: LYR_SR_FILL,
      type: 'fill',
      source: SRC_SR_CIRCLE,
      paint: {
        'fill-color': '#1677ff',
        'fill-opacity': 0.12,
      },
    });
    map.addLayer({
      id: LYR_SR_LINE,
      type: 'line',
      source: SRC_SR_CIRCLE,
      paint: {
        'line-color': '#1677ff',
        'line-width': 2,
        'line-dasharray': [4, 3],
      },
    });

    map.addSource(SRC_SR_ORIGIN, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: { type: 'Point', coordinates: [originLng, originLat] },
          },
        ],
      },
    });
    map.addLayer({
      id: LYR_SR_ORIGIN,
      type: 'circle',
      source: SRC_SR_ORIGIN,
      paint: {
        'circle-radius': 11,
        'circle-color': '#ff4d4f',
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff',
      },
    });

    requestAnimationFrame(() => {
      if (mapRef.current?.loaded()) {
        afterBoundaryEnsureThenRaiseSearchSpatialOverlays(mapRef.current);
      }
    });

    return () => {
      removeSearchMapSpatialRangeLayersOnly(map);
    };
  }, [
    mapIsReady,
    mapStyleLoadEpoch,
    searchMapOverlay?.spatialRange?.originLat,
    searchMapOverlay?.spatialRange?.originLng,
    searchMapOverlay?.spatialRange?.radiusM,
  ]);

  /** 空间要素查询表单：实时预览（绿虚线+蓝心），叠在已提交蓝圈之上；与已提交范围一致时不绘绿，避免与蓝重影 */
  useEffect(() => {
    const map = mapRef.current;
    if (!mapIsReady || !map?.loaded()) return;

    removeSpatialQueryPreview(map);
    if (!spatialQueryPreview) return;
    if (
      searchMapOverlay?.spatialRange &&
      isSpatialQueryPreviewEqualToCommitted(spatialQueryPreview, searchMapOverlay.spatialRange)
    ) {
      return;
    }

    const { originLng, originLat, radiusM } = spatialQueryPreview;
    /** 兼容字符串半径；勿用 Number.isFinite(radiusM) 直接判（字符串合法值会为 false） */
    const rNum = Number(radiusM);
    const hasCircle =
      radiusM !== undefined && radiusM !== null && Number.isFinite(rNum) && rNum > 0;

    if (hasCircle) {
      /** 极大半径时测地构环可能数值不稳定；过小在默认缩放下几乎不可见，仍合法绘制 */
      const MAX_PREVIEW_RADIUS_M = 2_000_000;
      const r0 = Number(radiusM);
      const rDraw = Math.min(Math.max(r0, 1), MAX_PREVIEW_RADIUS_M);
      try {
        const circleFeat = buildGeodesicCirclePolygon(originLng, originLat, rDraw);
        map.addSource(SRC_SQ_PREVIEW_CIRCLE, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [circleFeat] },
        });
        map.addLayer({
          id: LYR_SQ_PREVIEW_FILL,
          type: 'fill',
          source: SRC_SQ_PREVIEW_CIRCLE,
          paint: {
            'fill-color': '#52c41a',
            'fill-opacity': 0.07,
          },
        });
        map.addLayer({
          id: LYR_SQ_PREVIEW_LINE,
          type: 'line',
          source: SRC_SQ_PREVIEW_CIRCLE,
          paint: {
            'line-color': '#52c41a',
            'line-width': 2,
            'line-dasharray': [6, 4],
          },
        });
      } catch {
        // 构环失败时仅保留原点，避免整段预览失效
      }
    }

    map.addSource(SRC_SQ_PREVIEW_ORIGIN, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: { type: 'Point', coordinates: [originLng, originLat] },
          },
        ],
      },
    });
    map.addLayer({
      id: LYR_SQ_PREVIEW_ORIGIN,
      type: 'circle',
      source: SRC_SQ_PREVIEW_ORIGIN,
      paint: {
        'circle-radius': hasCircle ? 10 : 12,
        'circle-color': '#1677ff',
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff',
      },
    });

    requestAnimationFrame(() => {
      if (mapRef.current?.loaded()) {
        afterBoundaryEnsureThenRaiseSearchSpatialOverlays(mapRef.current);
      }
    });

    return () => removeSpatialQueryPreview(map);
  }, [mapIsReady, mapStyleLoadEpoch, spatialQueryPreview, searchMapOverlay]);

  /**
   * 空间查询圆心（DOM Markers 叠在 WebGL 之上，专用一层保证与蓝测地圆一致、不被查询结果点挡住）
   * 有已提交 `spatialRange` 且与绿预览不同：显示「调参中」蓝心；仅提交时显示红心。
   */
  useEffect(() => {
    const map = mapRef.current;
    const m = spatialRangeOriginDomMarkerRef.current;
    if (m) {
      m.remove();
      spatialRangeOriginDomMarkerRef.current = null;
    }
    if (!mapIsReady || !map?.loaded()) return;

    const sr = searchMapOverlay?.spatialRange;
    let lng: number;
    let lat: number;
    let mod: 'committed' | 'editing';
    if (sr) {
      if (spatialQueryPreview && !isSpatialQueryPreviewEqualToCommitted(spatialQueryPreview, sr)) {
        ({ originLng: lng, originLat: lat } = spatialQueryPreview);
        mod = 'editing';
      } else {
        ({ originLng: lng, originLat: lat } = sr);
        mod = 'committed';
      }
    } else if (spatialQueryPreview) {
      ({ originLng: lng, originLat: lat } = spatialQueryPreview);
      mod = 'editing';
    } else {
      return;
    }
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

    const root = document.createElement('div');
    root.className = `zht-map-spatial-range-origin zht-map-spatial-range-origin--${mod} zht-map-poi-marker-root`;
    root.setAttribute('role', 'presentation');
    const marker = new maplibregl.Marker({ element: root, anchor: 'center' })
      .setLngLat([lng, lat])
      .addTo(map);
    // 高于 .zht-map-poi-search-hit 等由 zhtPoiMarkerZIndexFromPosition 给出的 zIndex
    marker.getElement().style.zIndex = '2147482000';
    marker.getElement().setAttribute('aria-label', '空间查询圆心');
    spatialRangeOriginDomMarkerRef.current = marker;

    return () => {
      if (spatialRangeOriginDomMarkerRef.current === marker) {
        marker.remove();
        spatialRangeOriginDomMarkerRef.current = null;
      }
    };
  }, [
    mapIsReady,
    mapStyleLoadEpoch,
    searchMapOverlay?.spatialRange?.originLng,
    searchMapOverlay?.spatialRange?.originLat,
    searchMapOverlay?.spatialRange?.radiusM,
    spatialQueryPreview,
  ]);

  /** 查询结果 GeoJSON 序号点：选中项略放大（设施 DOM 命中态在 Marker effect 中处理） */
  useEffect(() => {
    const map = mapRef.current;
    if (!mapIsReady || !map?.loaded() || !map.getLayer(LYR_SR_RES_PT)) return;

    const sel = searchMapSelectedPointId ?? '';
    if (sel === '') {
      map.setPaintProperty(LYR_SR_RES_PT, 'circle-radius', 14);
      map.setPaintProperty(LYR_SR_RES_PT, 'circle-stroke-width', 2);
      map.setLayoutProperty(LYR_SR_RES_TX, 'text-size', 15);
    } else {
      map.setPaintProperty(LYR_SR_RES_PT, 'circle-radius', ['case', ['==', ['get', 'id'], sel], 20, 14]);
      map.setPaintProperty(LYR_SR_RES_PT, 'circle-stroke-width', ['case', ['==', ['get', 'id'], sel], 3.5, 2]);
      map.setLayoutProperty(LYR_SR_RES_TX, 'text-size', ['case', ['==', ['get', 'id'], sel], 18, 15]);
    }
  }, [
    searchMapSelectedPointId,
    searchMapOverlay,
    mapIsReady,
    mapSearchPanelOpen,
    mapSearchShowDefaultPoiMarkers,
  ]);

  /** 设施 / 监测：DOM 圆点（必显）+ 可选 HTML 提示板（POI提示配置） */
  useEffect(() => {
    const map = mapRef.current;
    const clearMarkers = () => {
      poiMarkersRef.current.forEach(m => m.remove());
      poiMarkersRef.current = [];
    };

    if (!mapIsReady || !map) {
      poiMarkerResizeObserversRef.current.forEach(ro => ro.disconnect());
      poiMarkerResizeObserversRef.current = [];
      clearMarkers();
      return;
    }

    poiMarkerResizeObserversRef.current.forEach(ro => ro.disconnect());
    poiMarkerResizeObserversRef.current = [];

    clearMarkers();
    const next: maplibregl.Marker[] = [];
    const passThrough = !!spatialMapPickActive;

    const bindHitHover = (el: HTMLElement) => {
      el.addEventListener('mouseenter', () => {
        if (!spatialPickActiveRef.current) map.getCanvas().style.cursor = 'pointer';
      });
      el.addEventListener('mouseleave', () => {
        map.getCanvas().style.cursor = '';
      });
    };

    /** 统一点位物联提示：与合并台账一致（避免叠在台账 POI 上仍是静态水质种子） */
    const buildUnifiedWaterEnvMetricBlock = (
      pt: ZhtUnifiedSearchPoint,
      uniDrawerAddrSel: boolean,
      st: ZhtPoiDisplayState,
      valuesFontPx: number,
    ) => {
      const facMeta = parseZhtFacilityUnifiedSearchId(pt.id);
      const mergedFacRec = facMeta ? mergeFacilityRecord(facMeta.kind, facMeta.rawId) : null;
      const facilityBlock =
        facMeta && mergedFacRec
          ? facilityHintMetricsForRecordIfLinked(
              facMeta.kind,
              mergedFacRec,
              uniDrawerAddrSel ? true : Boolean(poiMonitorValues),
              valuesFontPx,
              st,
            )
          : undefined;

      if (uniDrawerAddrSel) {
        return filterRealtimeFacilityMetricBlock(
          unifiedPointLedgerPoiHintMetricBlock(pt, valuesFontPx) ??
            facilityBlock ??
            facilityHintMetricsFromSeed(pt.id, true, valuesFontPx),
        );
      }
      return filterRealtimeFacilityMetricBlock(
        facilityBlock ?? facilityHintMetricsFromSeedIfLinked(pt.id, Boolean(poiMonitorValues), valuesFontPx, st),
      );
    };

    /** 地图搜索面板打开且非数据选点对照：仅绘查询结果；台账设施/监测叠 POI 提示板，其余在开启设施标题时可叠简要提示 */
    if (mapSearchPanelOpen && !mapSearchShowDefaultPoiMarkers) {
      const rows = searchMapOverlay?.results ?? [];
      const markerLngLats = zhtSearchOverlayMarkerLngLats(rows);
      const posList = markerLngLats;
      let minLat = 90;
      let maxLat = -90;
      let minLng = 180;
      let maxLng = -180;
      if (posList.length) {
        for (const p of posList) {
          if (p.lat < minLat) minLat = p.lat;
          if (p.lat > maxLat) maxLat = p.lat;
          if (p.lng < minLng) minLng = p.lng;
          if (p.lng > maxLng) maxLng = p.lng;
        }
      } else {
        minLat = maxLat = PARK_MAPLIBRE_DEFAULT_CENTER[1];
        minLng = maxLng = PARK_MAPLIBRE_DEFAULT_CENTER[0];
      }

      /**
       * 仅序号橙点（无提示板）：须与 `mountStackMarker` 同源——外层 `zht-map-poi-marker-root--stack` + `anchor: bottom`。
       * 若直接用 `anchor: center` 且根节点无栈式 flex，首帧/ResizeObserver 前 MapLibre 对 Marker 高度估算易偏，
       * 与开启「标题/数值显示」后走栈式 DOM 的路径不一致，会出现序号点整列「坠」到视口下方错位。
       */
      const mountSearchHit = (lng: number, lat: number, inner: HTMLElement) => {
        const wrap = document.createElement('div');
        wrap.classList.add('zht-map-poi-marker-root', 'zht-map-poi-marker-root--stack');
        wrap.appendChild(inner);
        const marker = new maplibregl.Marker({ element: wrap, anchor: 'bottom' })
          .setLngLat([lng, lat])
          .addTo(map);
        const z = zhtPoiMarkerZIndexFromPosition(lat, lng, minLat, maxLat, minLng, maxLng);
        marker.getElement().style.zIndex = String(z);
        next.push(marker);
        const ro = new ResizeObserver(() => {
          marker.setLngLat(marker.getLngLat());
        });
        ro.observe(marker.getElement());
        poiMarkerResizeObserversRef.current.push(ro);
      };

      const mountStackMarker = (lng: number, lat: number, root: HTMLElement) => {
        root.classList.add('zht-map-poi-marker-root', 'zht-map-poi-marker-root--stack');
        const marker = new maplibregl.Marker({ element: root, anchor: 'bottom' })
          .setLngLat([lng, lat])
          .addTo(map);
        const z = zhtPoiMarkerZIndexFromPosition(lat, lng, minLat, maxLat, minLng, maxLng);
        marker.getElement().style.zIndex = String(z);
        next.push(marker);
        const ro = new ResizeObserver(() => {
          marker.setLngLat(marker.getLngLat());
        });
        ro.observe(marker.getElement());
        poiMarkerResizeObserversRef.current.push(ro);
      };

      let facilityHintCount = 0;

      for (let i = 0; i < rows.length; i += 1) {
        const pt = rows[i];
        const idxStr = String(i + 1);
        const hit = { idx: idxStr, unifiedId: pt.id, point: pt };
        const disp = markerLngLats[i] ?? getZhtSearchPointMapCoordinate(pt);

        const facMeta = parseZhtFacilityUnifiedSearchId(pt.id);
        if (facMeta) {
          const mergedRec = mergeFacilityRecord(facMeta.kind, facMeta.rawId);
          const pos = mergedRec
            ? facilityLngLatName(facMeta.kind, mergedRec as Record<string, unknown>, pt.name)
            : null;
          if (
            mergedRec &&
            pos &&
            facilityPassesWaterEnvLayerOrPeek(
              poiLayerSlice,
              facMeta.kind,
              mergedRec as unknown as Record<string, unknown>,
              statDrawerPoiPeek,
            )
          ) {
            const lng = disp.lng;
            const lat = disp.lat;
            const facName = pos.name;
            const facSt = deriveFacilityDisplayState(facMeta.kind, mergedRec as unknown as Record<string, unknown>);
            const facMetricBlock = facilityHintMetricsForRecordIfLinked(
              facMeta.kind,
              mergedRec as unknown as Record<string, unknown>,
              Boolean(poiMonitorValues),
              zhtPoiHintFontPx(poiMonitorValuesFont),
              facSt,
            );
            const canShowFacilityHint =
              facilityPoiHintCardWants(Boolean(poiFacilityTitle), facMetricBlock) &&
              facilityHintCount < ZHT_POI_FACILITY_HINT_CAP;
            const root = document.createElement('div');
            if (canShowFacilityHint) {
              appendFacilityPoiHint(
                root,
                facName,
                zhtPoiHintFontPx(poiFacilityTitleFont),
                facMetricBlock,
                { showTitle: Boolean(poiFacilityTitle) },
              );
              facilityHintCount += 1;
            }
            const cat = facilityKindToWaterEnvCategory(facMeta.kind);
            const st = facSt;
            const dot = createWaterEnvCategoryDot(cat, st);
            dot.classList.add('zht-map-point-dot--search-hit');
            if (searchMapSelectedPointId === pt.id) {
              dot.classList.add('zht-map-point-dot--search-hit--selected');
            }
            const wrap = document.createElement('div');
            wrap.className = 'zht-map-poi-search-hit-wrap';
            if (passThrough) wrap.classList.add('zht-map-poi-search-hit-wrap--pass-through');
            if (searchMapSelectedPointId === pt.id) wrap.classList.add('zht-map-poi-search-hit-wrap--selected');
            wrap.appendChild(dot);
            const badge = document.createElement('span');
            badge.className = 'zht-map-search-hit-badge';
            badge.textContent = idxStr;
            badge.setAttribute('aria-label', `查询结果序号 ${idxStr}`);
            wrap.appendChild(badge);
            wrap.addEventListener('click', e => {
              e.stopPropagation();
              if (spatialPickActiveRef.current) return;
              onSearchMapResultClickRef.current?.(hit.point);
              openUnifiedSearchPointDetailRef.current?.(hit.point);
            });
            bindHitHover(wrap);
            root.appendChild(wrap);
            mountStackMarker(lng, lat, root);
            continue;
          }
        }

        const monMeta = parseZhtMonitorUnifiedSearchId(pt.id);
        if (monMeta) {
          const mon = ZHT_MONITORING_POI_DEMO.find(m => m.id === monMeta.rawMonId);
          const monM = mon
            ? mergeMonitoringPoiDemoWithIotOverrides(mon.id, monitorIotLinkOverrides) ?? mon
            : null;
          if (monM && monitorDemoPassesWaterEnvLayerOrPeek(poiLayerSlice, monM, statDrawerPoiPeek)) {
            const root = document.createElement('div');
            const monHasRt = monitoringPoiHasRealtimeMetrics(monM);
            const showTitle = Boolean(poiFacilityTitle);
            const showValues = monHasRt && monitoringPoiHintAllowsValues(monM, Boolean(poiMonitorValues));
            const showHintCard = showTitle || showValues;
            if (showHintCard) {
              appendMonitorPoiHint(root, monM, {
                showTitle,
                titleFontPx: zhtPoiHintFontPx(poiFacilityTitleFont),
                showValues,
                valuesFontPx: zhtPoiHintFontPx(poiMonitorValuesFont),
              });
            }
            const dot = createWaterEnvCategoryDot('monitor', monitorDemoToDisplayState(monM));
            dot.classList.add('zht-map-point-dot--search-hit');
            if (searchMapSelectedPointId === pt.id) {
              dot.classList.add('zht-map-point-dot--search-hit--selected');
            }
            const wrap = document.createElement('div');
            wrap.className = 'zht-map-poi-search-hit-wrap';
            if (passThrough) wrap.classList.add('zht-map-poi-search-hit-wrap--pass-through');
            if (searchMapSelectedPointId === pt.id) wrap.classList.add('zht-map-poi-search-hit-wrap--selected');
            wrap.appendChild(dot);
            const badge = document.createElement('span');
            badge.className = 'zht-map-search-hit-badge';
            badge.textContent = idxStr;
            badge.setAttribute('aria-label', `查询结果序号 ${idxStr}`);
            wrap.appendChild(badge);
            wrap.addEventListener('click', e => {
              e.stopPropagation();
              if (spatialPickActiveRef.current) return;
              onSearchMapResultClickRef.current?.(hit.point);
              openUnifiedSearchPointDetailRef.current?.(hit.point);
            });
            bindHitHover(wrap);
            root.appendChild(wrap);
            mountStackMarker(disp.lng, disp.lat, root);
            continue;
          }
        }

        const onlyCat = getWaterEnvCategoryForUnifiedPoint(pt);
        if (
          onlyCat &&
          ZHT_WATER_ENV_UNIFIED_ONLY.has(onlyCat) &&
          unifiedPointPassesWaterEnvLayerOrPeek(poiLayerSlice, pt, statDrawerPoiPeek)
        ) {
          const lng = disp.lng;
          const lat = disp.lat;
          const uniSt = deriveDisplayStateForUnifiedPoint(pt);
          const uniMetricBlock = buildUnifiedWaterEnvMetricBlock(
            pt,
            false,
            uniSt,
            zhtPoiHintFontPx(poiMonitorValuesFont),
          );
          const canShowHint =
            facilityPoiHintCardWants(Boolean(poiFacilityTitle), uniMetricBlock) &&
            facilityHintCount < ZHT_POI_FACILITY_HINT_CAP;
          const root = document.createElement('div');
          if (canShowHint) {
            appendFacilityPoiHint(
              root,
              pt.name,
              zhtPoiHintFontPx(poiFacilityTitleFont),
              uniMetricBlock,
              { showTitle: Boolean(poiFacilityTitle) },
            );
            facilityHintCount += 1;
          }
          const st = uniSt;
          const dot = createWaterEnvCategoryDot(onlyCat, st);
          dot.classList.add('zht-map-point-dot--search-hit');
          if (searchMapSelectedPointId === pt.id) {
            dot.classList.add('zht-map-point-dot--search-hit--selected');
          }
          const wrap = document.createElement('div');
          wrap.className = 'zht-map-poi-search-hit-wrap';
          if (passThrough) wrap.classList.add('zht-map-poi-search-hit-wrap--pass-through');
          if (searchMapSelectedPointId === pt.id) wrap.classList.add('zht-map-poi-search-hit-wrap--selected');
          wrap.appendChild(dot);
          const badge = document.createElement('span');
          badge.className = 'zht-map-search-hit-badge';
          badge.textContent = idxStr;
          badge.setAttribute('aria-label', `查询结果序号 ${idxStr}`);
          wrap.appendChild(badge);
          wrap.addEventListener('click', e => {
            e.stopPropagation();
            if (spatialPickActiveRef.current) return;
            onSearchMapResultClickRef.current?.(hit.point);
            openUnifiedSearchPointDetailRef.current?.(hit.point);
          });
          bindHitHover(wrap);
          root.appendChild(wrap);
          mountStackMarker(lng, lat, root);
          continue;
        }

        /** 设施/监测统一点位若未命中上方分支（图层子态等），禁止用水质种子兜底，否则会误判为排水户等有实时监测 */
        if (parseZhtFacilityUnifiedSearchId(pt.id) || parseZhtMonitorUnifiedSearchId(pt.id)) {
          const root = createMapSearchResultMarkerRoot(i + 1, searchMapSelectedPointId === pt.id);
          if (passThrough) root.classList.add('zht-map-search-result-hit--pass-through');
          root.addEventListener('click', e => {
            e.stopPropagation();
            if (spatialPickActiveRef.current) return;
            onSearchMapResultClickRef.current?.(pt);
            openUnifiedSearchPointDetailRef.current?.(pt);
          });
          bindHitHover(root);
          mountSearchHit(disp.lng, disp.lat, root);
          continue;
        }

        const genSt = deriveDisplayStateForUnifiedPoint(pt);
        const genMetricBlock = buildUnifiedWaterEnvMetricBlock(
          pt,
          false,
          genSt,
          zhtPoiHintFontPx(poiMonitorValuesFont),
        );
        const canGenHint =
          facilityPoiHintCardWants(Boolean(poiFacilityTitle), genMetricBlock) &&
          facilityHintCount < ZHT_POI_FACILITY_HINT_CAP;
        if (canGenHint) {
          const root = document.createElement('div');
          appendFacilityPoiHint(
            root,
            pt.name,
            zhtPoiHintFontPx(poiFacilityTitleFont),
            genMetricBlock,
            { showTitle: Boolean(poiFacilityTitle) },
          );
          facilityHintCount += 1;
          const wrap = document.createElement('div');
          wrap.className = 'zht-map-poi-search-hit-wrap';
          if (passThrough) wrap.classList.add('zht-map-poi-search-hit-wrap--pass-through');
          if (searchMapSelectedPointId === pt.id) wrap.classList.add('zht-map-poi-search-hit-wrap--selected');
          const innerHit = document.createElement('div');
          innerHit.className = `zht-map-search-result-hit${
            searchMapSelectedPointId === pt.id ? ' zht-map-search-result-hit--selected' : ''
          }`;
          const dotOnly = document.createElement('div');
          dotOnly.className = 'zht-map-search-result-hit__dot';
          const idxOnDot = document.createElement('span');
          idxOnDot.className = 'zht-map-search-result-hit__idx';
          idxOnDot.textContent = idxStr;
          idxOnDot.setAttribute('aria-label', `查询结果序号 ${idxStr}`);
          innerHit.append(dotOnly, idxOnDot);
          wrap.appendChild(innerHit);
          wrap.addEventListener('click', e => {
            e.stopPropagation();
            if (spatialPickActiveRef.current) return;
            onSearchMapResultClickRef.current?.(pt);
            openUnifiedSearchPointDetailRef.current?.(pt);
          });
          bindHitHover(wrap);
          root.appendChild(wrap);
          mountStackMarker(disp.lng, disp.lat, root);
          continue;
        }

        const root = createMapSearchResultMarkerRoot(i + 1, searchMapSelectedPointId === pt.id);
        if (passThrough) root.classList.add('zht-map-search-result-hit--pass-through');
        root.addEventListener('click', e => {
          e.stopPropagation();
          if (spatialPickActiveRef.current) return;
          onSearchMapResultClickRef.current?.(pt);
          openUnifiedSearchPointDetailRef.current?.(pt);
        });
        bindHitHover(root);
        mountSearchHit(disp.lng, disp.lat, root);
      }

      poiMarkersRef.current = next;
      requestAnimationFrame(() => {
        if (!map.loaded()) return;
        for (const m of next) {
          m.setLngLat(m.getLngLat());
        }
        map.triggerRepaint();
      });

      return () => {
        poiMarkerResizeObserversRef.current.forEach(ro => ro.disconnect());
        poiMarkerResizeObserversRef.current = [];
        clearMarkers();
      };
    }

    /** 本帧将要绘制的全部点位（用于同屏 z-index 基准） */
    const allPositions: { lng: number; lat: number }[] = [];
    for (const r of pumpStationData) {
      if (facilityPassesWaterEnvLayerOrPeek(poiLayerSlice, 'pump', r as unknown as Record<string, unknown>, statDrawerPoiPeek)) {
        allPositions.push({ lng: r.x, lat: r.y });
      }
    }
    for (const r of outletData) {
      if (
        facilityPassesWaterEnvLayerOrPeek(poiLayerSlice, 'outlet', r as unknown as Record<string, unknown>, statDrawerPoiPeek)
      ) {
        allPositions.push({ lng: r['入河入海排污口经度'], lat: r['入河入海排污口纬度'] });
      }
    }
    for (const r of plantData) {
      if (facilityPassesWaterEnvLayerOrPeek(poiLayerSlice, 'plant', r as unknown as Record<string, unknown>, statDrawerPoiPeek)) {
        allPositions.push({ lng: r.x, lat: r.y });
      }
    }
    for (const r of dischargerDemoData) {
      if (
        facilityPassesWaterEnvLayerOrPeek(
          poiLayerSlice,
          'discharger',
          r as unknown as Record<string, unknown>,
          statDrawerPoiPeek,
        )
      ) {
        const lng = Number(r.coordX);
        const lat = Number(r.coordY);
        if (Number.isFinite(lng) && Number.isFinite(lat)) allPositions.push({ lng, lat });
      }
    }
    for (const mon of ZHT_MONITORING_POI_DEMO) {
      const monM = mergeMonitoringPoiDemoWithIotOverrides(mon.id, monitorIotLinkOverrides) ?? mon;
      if (monitorDemoPassesWaterEnvLayerOrPeek(poiLayerSlice, monM, statDrawerPoiPeek)) {
        allPositions.push({ lng: monM.lng, lat: monM.lat });
      }
    }
    for (const pt of getZhtUnifiedSearchPointsCached()) {
      const c = getWaterEnvCategoryForUnifiedPoint(pt);
      if (!c || !ZHT_WATER_ENV_UNIFIED_ONLY.has(c)) continue;
      if (unifiedPointPassesWaterEnvLayerOrPeek(poiLayerSlice, pt, statDrawerPoiPeek)) {
        allPositions.push({ lng: pt.lng, lat: pt.lat });
      }
    }
    /** 与下方 `pushPollutionPoint` 一致：抽屉 peek 时子图层全关也要纳入 bbox，避免 z-index 归一化越界导致圆点不可见 */
    for (const pk of ZHT_POLLUTION_KINDS) {
      for (const ppt of getPollutionMapPointsByKind(pk)) {
        if (!pollutionPointPassesLayerOrPeek(layerControl, ppt, statDrawerPoiPeek)) continue;
        allPositions.push({ lng: ppt.lng, lat: ppt.lat });
      }
    }
    if (allPositions.length === 0) {
      allPositions.push({ lng: PARK_MAPLIBRE_DEFAULT_CENTER[0], lat: PARK_MAPLIBRE_DEFAULT_CENTER[1] });
    }
    let minLat = 90;
    let maxLat = -90;
    let minLng = 180;
    let maxLng = -180;
    for (const p of allPositions) {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    }

    /** 圆点在下、提示在上，锚点落在圆点底部中心（与经纬度对齐） */
    const mountMarker = (lng: number, lat: number, root: HTMLElement) => {
      root.classList.add('zht-map-poi-marker-root', 'zht-map-poi-marker-root--stack');
      const marker = new maplibregl.Marker({ element: root, anchor: 'bottom' })
        .setLngLat([lng, lat])
        .addTo(map);
      const z = zhtPoiMarkerZIndexFromPosition(lat, lng, minLat, maxLat, minLng, maxLng);
      marker.getElement().style.zIndex = String(z);
      next.push(marker);
      // 提示板显隐会改变根节点高度；须触发 MapLibre 重算 bottom 锚点，否则查询命中后改 POI 配置会出现点位与圆错位、点击偏移
      const ro = new ResizeObserver(() => {
        marker.setLngLat(marker.getLngLat());
      });
      ro.observe(marker.getElement());
      poiMarkerResizeObserversRef.current.push(ro);
    };

    let facilityHintCount = 0;

    /** 查询结果序号：按统一点位 id 索引（与右栏列表顺序一致） */
    const overlayHitByUnifiedId = new Map<string, { idx: string; unifiedId: string; point: ZhtUnifiedSearchPoint }>();
    if (searchMapOverlay?.results?.length) {
      for (let ri = 0; ri < searchMapOverlay.results.length; ri += 1) {
        const p0 = searchMapOverlay.results[ri];
        overlayHitByUnifiedId.set(p0.id, { idx: String(ri + 1), unifiedId: p0.id, point: p0 });
      }
    }

    /** 当前查询结果里、且对应地图上设施 DOM 的命中（序号与右栏列表一致） */
    const facilitySearchHitByKindId = new Map<
      string,
      { idx: string; unifiedId: string; point: ZhtUnifiedSearchPoint }
    >();
    if (searchMapOverlay?.results?.length) {
      for (let ri = 0; ri < searchMapOverlay.results.length; ri += 1) {
        const pt = searchMapOverlay.results[ri];
        const m = parseZhtFacilityUnifiedSearchId(pt.id);
        if (!m) continue;
        const recHit = mergeFacilityRecord(m.kind, m.rawId);
        if (!recHit || !facilityPassesWaterEnvLayerOrPeek(poiLayerSlice, m.kind, recHit as Record<string, unknown>, statDrawerPoiPeek))
          continue;
        facilitySearchHitByKindId.set(`${m.kind}:${m.rawId}`, {
          idx: String(ri + 1),
          unifiedId: pt.id,
          point: pt,
        });
      }
    }

    const monitorSearchHitByMonId = new Map<
      string,
      { idx: string; unifiedId: string; point: ZhtUnifiedSearchPoint }
    >();
    if (searchMapOverlay?.results?.length) {
      for (let ri = 0; ri < searchMapOverlay.results.length; ri += 1) {
        const pt = searchMapOverlay.results[ri];
        const mm = parseZhtMonitorUnifiedSearchId(pt.id);
        if (!mm) continue;
        const monHitBase = ZHT_MONITORING_POI_DEMO.find(x => x.id === mm.rawMonId);
        const monHit = monHitBase
          ? mergeMonitoringPoiDemoWithIotOverrides(monHitBase.id, monitorIotLinkOverrides) ?? monHitBase
          : null;
        if (!monHit || !monitorDemoPassesWaterEnvLayerOrPeek(poiLayerSlice, monHit, statDrawerPoiPeek)) continue;
        monitorSearchHitByMonId.set(mm.rawMonId, {
          idx: String(ri + 1),
          unifiedId: pt.id,
          point: pt,
        });
      }
    }

    const pushFacility = (lng: number, lat: number, kind: FacilityMapKind, id: string, name: string) => {
      const recObj = mergeFacilityRecord(kind, id);
      if (!recObj) return;
      if (!facilityPassesWaterEnvLayerOrPeek(poiLayerSlice, kind, recObj as Record<string, unknown>, statDrawerPoiPeek))
        return;
      const cat = facilityKindToWaterEnvCategory(kind);
      const st = deriveFacilityDisplayState(kind, recObj as Record<string, unknown>);
      const hit = facilitySearchHitByKindId.get(`${kind}:${id}`);
      const facUnifiedId = zhtFacilityUnifiedSearchId(kind, id);
      /** 指标抽屉「地址」定位：仅蓝环选中，不套搜索橙底 */
      const drawerAddrSel = !hit && searchMapSelectedPointId === facUnifiedId;
      /** 数值显示：抽屉定位时仍尊重「信息点」语义，未关联物联不叠演示水质行 */
      const facMetricBlockFull = facilityHintMetricsForRecordIfLinked(
        kind,
        recObj as Record<string, unknown>,
        drawerAddrSel ? true : Boolean(poiMonitorValues),
        zhtPoiHintFontPx(poiMonitorValuesFont),
        st,
      );
      const canShowFacilityHint = drawerAddrSel
        ? facilityPoiHintCardWants(true, facMetricBlockFull)
        : facilityPoiHintCardWants(Boolean(poiFacilityTitle), facMetricBlockFull) &&
          facilityHintCount < ZHT_POI_FACILITY_HINT_CAP;

      const root = document.createElement('div');
      if (canShowFacilityHint) {
        appendFacilityPoiHint(
          root,
          name,
          zhtPoiHintFontPx(poiFacilityTitleFont),
          facMetricBlockFull,
          { showTitle: drawerAddrSel ? true : Boolean(poiFacilityTitle) },
        );
        facilityHintCount += 1;
      }
      const dot = createWaterEnvCategoryDot(cat, st);

      if (hit) {
        dot.classList.add('zht-map-point-dot--search-hit');
        if (searchMapSelectedPointId === hit.unifiedId) {
          dot.classList.add('zht-map-point-dot--search-hit--selected');
        }
        const wrap = document.createElement('div');
        wrap.className = 'zht-map-poi-search-hit-wrap';
        if (passThrough) {
          wrap.classList.add('zht-map-poi-search-hit-wrap--pass-through');
        }
        if (searchMapSelectedPointId === hit.unifiedId) {
          wrap.classList.add('zht-map-poi-search-hit-wrap--selected');
        }
        wrap.appendChild(dot);
        const badge = document.createElement('span');
        badge.className = 'zht-map-search-hit-badge';
        badge.textContent = hit.idx;
        badge.setAttribute('aria-label', `查询结果序号 ${hit.idx}`);
        wrap.appendChild(badge);
        wrap.addEventListener('click', e => {
          e.stopPropagation();
          if (spatialPickActiveRef.current) return;
          onSearchMapResultClickRef.current?.(hit.point);
        });
        bindHitHover(wrap);
        root.appendChild(wrap);
      } else if (drawerAddrSel) {
        dot.classList.add('zht-map-point-dot--drawer-address-selected');
        if (passThrough) {
          dot.classList.add('zht-map-point-dot--pass-through');
        }
        dot.addEventListener('click', e => {
          e.stopPropagation();
          if (spatialPickActiveRef.current) return;
          openFacilityDetailRef.current(kind, id);
        });
        bindHitHover(dot);
        root.appendChild(dot);
      } else {
        if (passThrough) {
          dot.classList.add('zht-map-point-dot--pass-through');
        }
        dot.addEventListener('click', e => {
          e.stopPropagation();
          if (spatialPickActiveRef.current) return;
          openFacilityDetailRef.current(kind, id);
        });
        bindHitHover(dot);
        root.appendChild(dot);
      }
      mountMarker(lng, lat, root);
    };

    for (const r of pumpStationData) {
      pushFacility(r.x, r.y, 'pump', r.id, r.pustName);
    }
    for (const r of outletData) {
      pushFacility(
        r['入河入海排污口经度'],
        r['入河入海排污口纬度'],
        'outlet',
        r['入河入海排污口编码'],
        r['入河入海排污口名称'],
      );
    }
    for (const r of plantData) {
      pushFacility(r.x, r.y, 'plant', r.id, r.name);
    }
    for (const r of dischargerDemoData) {
      const lng = Number(r.coordX);
      const lat = Number(r.coordY);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
      pushFacility(lng, lat, 'discharger', r.id, r.dischargerName);
    }

    for (const mon of ZHT_MONITORING_POI_DEMO) {
      const monM = mergeMonitoringPoiDemoWithIotOverrides(mon.id, monitorIotLinkOverrides) ?? mon;
      if (!monitorDemoPassesWaterEnvLayerOrPeek(poiLayerSlice, monM, statDrawerPoiPeek)) continue;
      const mHit = monitorSearchHitByMonId.get(mon.id);
      const monUnifiedId = zhtMonitorUnifiedSearchId(mon.id);
      const monDrawerAddrSel = !mHit && searchMapSelectedPointId === monUnifiedId;
      const root = document.createElement('div');
      const monHasRt = monitoringPoiHasRealtimeMetrics(monM);
      const showTitle = monDrawerAddrSel || Boolean(poiFacilityTitle);
      const showValuesBase = monHasRt && monitoringPoiHintAllowsValues(monM, Boolean(poiMonitorValues));
      const showHintCard = monDrawerAddrSel || showTitle || showValuesBase;
      if (showHintCard) {
        appendMonitorPoiHint(root, monM, {
          showTitle,
          titleFontPx: zhtPoiHintFontPx(poiFacilityTitleFont),
          showValues: monDrawerAddrSel ? monHasRt : showValuesBase,
          valuesFontPx: zhtPoiHintFontPx(poiMonitorValuesFont),
          maxMetricRows: monDrawerAddrSel ? ZHT_UNIFIED_LEDGER_POI_HINT_MAX : undefined,
        });
      }
      const dot = createWaterEnvCategoryDot('monitor', monitorDemoToDisplayState(monM));
      if (mHit) {
        dot.classList.add('zht-map-point-dot--search-hit');
        if (searchMapSelectedPointId === mHit.unifiedId) {
          dot.classList.add('zht-map-point-dot--search-hit--selected');
        }
        const wrap = document.createElement('div');
        wrap.className = 'zht-map-poi-search-hit-wrap';
        if (passThrough) {
          wrap.classList.add('zht-map-poi-search-hit-wrap--pass-through');
        }
        if (searchMapSelectedPointId === mHit.unifiedId) {
          wrap.classList.add('zht-map-poi-search-hit-wrap--selected');
        }
        wrap.appendChild(dot);
        const badge = document.createElement('span');
        badge.className = 'zht-map-search-hit-badge';
        badge.textContent = mHit.idx;
        badge.setAttribute('aria-label', `查询结果序号 ${mHit.idx}`);
        wrap.appendChild(badge);
        wrap.addEventListener('click', e => {
          e.stopPropagation();
          if (spatialPickActiveRef.current) return;
          onSearchMapResultClickRef.current?.(mHit.point);
        });
        bindHitHover(wrap);
        root.appendChild(wrap);
      } else if (monDrawerAddrSel) {
        dot.classList.add('zht-map-point-dot--drawer-address-selected');
        if (passThrough) {
          dot.classList.add('zht-map-point-dot--pass-through');
        }
        dot.addEventListener('click', e => {
          e.stopPropagation();
          if (spatialPickActiveRef.current) return;
          const up = getZhtUnifiedSearchPointsCached().find(p => p.id === monUnifiedId);
          if (up) openUnifiedSearchPointDetailRef.current?.(up);
        });
        bindHitHover(dot);
        root.appendChild(dot);
      } else {
        /** 常态地图：须点击圆点打开水质监测详情（与泵站/统一点位一致；此前遗漏监听导致无法弹窗） */
        if (passThrough) {
          dot.classList.add('zht-map-point-dot--pass-through');
        }
        dot.addEventListener('click', e => {
          e.stopPropagation();
          if (spatialPickActiveRef.current) return;
          const up = getZhtUnifiedSearchPointsCached().find(p => p.id === monUnifiedId);
          if (up) openUnifiedSearchPointDetailRef.current?.(up);
        });
        bindHitHover(dot);
        root.appendChild(dot);
      }
      mountMarker(monM.lng, monM.lat, root);
    }

    const pushUnifiedOtherWaterEnv = (pt: ZhtUnifiedSearchPoint) => {
      const c = getWaterEnvCategoryForUnifiedPoint(pt);
      if (!c || !ZHT_WATER_ENV_UNIFIED_ONLY.has(c)) return;
      if (!unifiedPointPassesWaterEnvLayerOrPeek(poiLayerSlice, pt, statDrawerPoiPeek)) return;
      const hit = overlayHitByUnifiedId.get(pt.id);
      const uniDrawerAddrSel = !hit && searchMapSelectedPointId === pt.id;
      const st = deriveDisplayStateForUnifiedPoint(pt);
      const valuesFont = zhtPoiHintFontPx(poiMonitorValuesFont);
      /** 抽屉内「地址/定位」：优先台账六宫格；设施类统一点位走合并台账物联行（与解绑/再关联同步） */
      const uniMetricBlockFull = buildUnifiedWaterEnvMetricBlock(pt, uniDrawerAddrSel, st, valuesFont);
      const canShowFacilityHint = uniDrawerAddrSel
        ? true
        : facilityPoiHintCardWants(Boolean(poiFacilityTitle), uniMetricBlockFull) &&
          facilityHintCount < ZHT_POI_FACILITY_HINT_CAP;
      const root = document.createElement('div');
      if (canShowFacilityHint) {
        appendFacilityPoiHint(
          root,
          pt.name,
          zhtPoiHintFontPx(poiFacilityTitleFont),
          uniMetricBlockFull,
          { showTitle: uniDrawerAddrSel ? true : Boolean(poiFacilityTitle) },
        );
        facilityHintCount += 1;
      }
      const dot = createWaterEnvCategoryDot(c, st);
      if (hit) {
        dot.classList.add('zht-map-point-dot--search-hit');
        if (searchMapSelectedPointId === hit.unifiedId) {
          dot.classList.add('zht-map-point-dot--search-hit--selected');
        }
        const wrap = document.createElement('div');
        wrap.className = 'zht-map-poi-search-hit-wrap';
        if (passThrough) {
          wrap.classList.add('zht-map-poi-search-hit-wrap--pass-through');
        }
        if (searchMapSelectedPointId === hit.unifiedId) {
          wrap.classList.add('zht-map-poi-search-hit-wrap--selected');
        }
        wrap.appendChild(dot);
        const badge = document.createElement('span');
        badge.className = 'zht-map-search-hit-badge';
        badge.textContent = hit.idx;
        badge.setAttribute('aria-label', `查询结果序号 ${hit.idx}`);
        wrap.appendChild(badge);
        wrap.addEventListener('click', e => {
          e.stopPropagation();
          if (spatialPickActiveRef.current) return;
          onSearchMapResultClickRef.current?.(hit.point);
        });
        bindHitHover(wrap);
        root.appendChild(wrap);
      } else if (uniDrawerAddrSel) {
        dot.classList.add('zht-map-point-dot--drawer-address-selected');
        if (passThrough) {
          dot.classList.add('zht-map-point-dot--pass-through');
        }
        dot.addEventListener('click', e => {
          e.stopPropagation();
          if (spatialPickActiveRef.current) return;
          openUnifiedSearchPointDetailRef.current?.(pt);
        });
        bindHitHover(dot);
        root.appendChild(dot);
      } else {
        if (passThrough) {
          dot.classList.add('zht-map-point-dot--pass-through');
        }
        dot.addEventListener('click', e => {
          e.stopPropagation();
          if (spatialPickActiveRef.current) return;
          openUnifiedSearchPointDetailRef.current?.(pt);
        });
        bindHitHover(dot);
        root.appendChild(dot);
      }
      mountMarker(pt.lng, pt.lat, root);
    };

    for (const pt of getZhtUnifiedSearchPointsCached()) {
      pushUnifiedOtherWaterEnv(pt);
    }

    const pushPollutionPoint = (pt: ZhtPollutionMapPoint) => {
      const root = document.createElement('div');
      const canShowFacilityHint =
        facilityPoiHintCardWants(Boolean(poiFacilityTitle), undefined) &&
        facilityHintCount < ZHT_POI_FACILITY_HINT_CAP;
      if (canShowFacilityHint) {
        // 污染源圆点恒为信息点蓝，提示板仅标题（不叠演示水质行）
        appendFacilityPoiHint(root, pt.name, zhtPoiHintFontPx(poiFacilityTitleFont), undefined, {
          showTitle: Boolean(poiFacilityTitle),
        });
        facilityHintCount += 1;
      }
      const dot = createPollutionDot(pt.kind);
      if (passThrough) dot.classList.add('zht-map-point-dot--pass-through');
      dot.addEventListener('click', e => {
        e.stopPropagation();
        if (spatialPickActiveRef.current) return;
        openPollutionDetailRef.current?.(pt);
      });
      bindHitHover(dot);
      root.appendChild(dot);
      mountMarker(pt.lng, pt.lat, root);
    };

    for (const pk of ZHT_POLLUTION_KINDS) {
      for (const ppt of getPollutionMapPointsByKind(pk)) {
        if (!pollutionPointPassesLayerOrPeek(layerControl, ppt, statDrawerPoiPeek)) continue;
        pushPollutionPoint(ppt);
      }
    }

    poiMarkersRef.current = next;
    requestAnimationFrame(() => {
      if (!map.loaded()) return;
      for (const m of next) {
        m.setLngLat(m.getLngLat());
      }
      map.triggerRepaint();
    });

    return () => {
      poiMarkerResizeObserversRef.current.forEach(ro => ro.disconnect());
      poiMarkerResizeObserversRef.current = [];
      clearMarkers();
    };
  }, [
    mapIsReady,
    mapSearchPanelOpen,
    mapSearchShowDefaultPoiMarkers,
    spatialMapPickActive,
    searchMapOverlay,
    searchMapSelectedPointId,
    poiFacilityTitle,
    poiFacilityTitleFont,
    poiMonitorValues,
    poiMonitorValuesFont,
    layerControl,
    statDrawerPoiPeek,
    mergeFacilityRecord,
    facilityIotLinkEpoch,
    monitorIotLinkOverrides,
  ]);

  /** 任意地图联动选中态：在 WebGL 画布（非 DOM 点位层）按下清除，避免仅命中 DOM 点时无法点到 canvas */
  useEffect(() => {
    const map = mapRef.current;
    const canvas = map?.getCanvas?.();
    if (!mapIsReady || !map?.loaded() || !canvas || !onClearStatDrawerPoiPeek) return;
    if (!mapCanvasSelectionClearActive) return;
    const clear = () => {
      onClearStatDrawerPoiPeek();
    };
    canvas.addEventListener('mousedown', clear);
    return () => {
      canvas.removeEventListener('mousedown', clear);
    };
  }, [mapIsReady, mapCanvasSelectionClearActive, onClearStatDrawerPoiPeek]);

  return (
    <ZhtMapMonitorIotOverridesContext.Provider value={monitorIotLinkOverrides}>
      <>
      <div ref={stackRef} className="zht-maplibre-stack">
            <ZhtMapVerticalToolbar
          mapRef={mapRef}
          mapIsReady={mapIsReady}
          mapHostRef={containerRef}
          fullscreenTargetRef={fullscreenTargetRef}
          onSearchClick={() => onToggleMapSearch?.()}
          layerControl={layerControl}
          onLayerControlChange={onLayerControlChange}
          poiFacilityTitle={poiFacilityTitle}
          onPoiFacilityTitleChange={setPoiFacilityTitle}
          poiMonitorValues={poiMonitorValues}
          onPoiMonitorValuesChange={setPoiMonitorValues}
          poiFacilityTitleFont={poiFacilityTitleFont}
          onPoiFacilityTitleFontChange={setPoiFacilityTitleFont}
          poiMonitorValuesFont={poiMonitorValuesFont}
          onPoiMonitorValuesFontChange={setPoiMonitorValuesFont}
          onPoiHintsReset={resetPoiHintsToDefault}
          defaultCenter={PARK_MAPLIBRE_DEFAULT_CENTER}
          defaultZoom={PARK_MAPLIBRE_DEFAULT_ZOOM}
          basemapKind={basemapKind}
          onBasemapKindChange={setBasemapKind}
          mapTransparencyPercent={mapTransparencyPercent}
          onMapTransparencyPercentChange={setMapTransparencyPercent}
        />
        <div
          className="zht-maplibre-host"
          ref={containerRef}
          role="application"
          aria-label="MapLibre 地图"
        />
      </div>
      <Modal
        className={`zht-map-detail-modal${detailShowMiniMap ? '' : ' zht-map-detail-modal--no-mini-map'}`}
        styles={detailModalStyles}
        title={
          <div className="zht-map-detail-title">
            <div className="zht-map-detail-title__left">
              <span style={{ flex: '1 1 auto', minWidth: 0 }}>{detailTitle}</span>
              {detailTitleBadges.length > 0 ? (
                <span className="zht-map-detail-title__badges" aria-label="监测点标签">
                  {detailTitleBadges.map(b => (
                    <span
                      key={`${b.label}-${b.tone ?? 'plain'}`}
                      className={`zht-map-detail-title__badge ${b.tone ? `is-${b.tone}` : ''}`}
                    >
                      {b.label}
                    </span>
                  ))}
                </span>
              ) : null}
            </div>
            {detailDrilldownDepth > 0 && (
              <Button type="default" icon={<LeftOutlined />} onClick={goBackMapFacilityDetail}>
                返回上一层
              </Button>
            )}
          </div>
        }
        open={detailOpen}
        onCancel={() => {
          setDetailOpen(false);
          resetDetailDrilldownStack();
          setDetailTitleBadges([]);
          setDetailModalWidth(ZHT_MAP_OTHER_DETAIL_WIDTH);
        }}
        footer={null}
        width={detailModalWidth}
        getContainer={getDetailModalContainer}
        destroyOnClose
      >
        <div key={detailKey}>{detailBody}</div>
      </Modal>
      </>
    </ZhtMapMonitorIotOverridesContext.Provider>
  );
};
