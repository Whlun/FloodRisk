/**
 * 综合态势 · 监测类 POI 演示数据（与设施台账无关，仅用于地图提示板样式演示）
 * 指标数值与语义色与详情「实时监测」同源：`getWaterQualityRealtimeSnapshotRows` / `WATER_QUALITY_METRIC_DEFS`。
 */
import {
  FACILITY_REALTIME_DEFAULT_DEVICE_KEY,
  WATER_QUALITY_METRIC_DEFS,
  getWaterQualityRealtimeSnapshotRows,
  getWaterQualityRealtimeSnapshotRowsAlarmFirst,
  pickFacilityHintBoardWaterSceneDeviceKey,
} from '../韶山水环境设施管理系统/facility-realtime-snapshot';

/** 监测数值语义色：绿=正常、红=超标、蓝=预警/信息（地图链路不使用橙色）、灰=无数据 */
export type ZhtMonitorMetricTone = 'normal' | 'danger' | 'warn' | 'info' | 'nodata';

export type ZhtMonitorMetricRow = {
  name: string;
  value: string;
  unit: string;
  tone: ZhtMonitorMetricTone;
};

/** 地图监测类 POI 提示板：最多展示的指标行数（站名单独由 POI「标题显示」控制） */
export const ZHT_MONITOR_POI_HINT_METRICS_MAX = 4;

/** 监测站在地图上的圆点状态：绿=正常、红=报警、蓝=普通、灰=离线（地图点位无橙色） */
export type ZhtMonitorPointState = 'normal' | 'alarm' | 'general' | 'offline';

/** 与地图外圈四态一致（报警红 / 离线灰 / 在线绿 / 信息点蓝） */
export type ZhtMonitorRingDisplayState = 'alarm' | 'offline' | 'online' | 'info';

export type ZhtMonitoringPoiDemo = {
  id: string;
  lng: number;
  lat: number;
  title: string;
  /**
   * 兼容旧演示字段；地图圆环色以 **`deriveMonitoringPoiDisplayState`** 为准（单点仅一种状态，
   * 优先级：报警＞离线＞在线＞信息点）。
   */
  pointState: ZhtMonitorPointState;
  metrics: ZhtMonitorMetricRow[];
  /**
   * 演示预留字段：与设施类一致，未关联物联（`false`）会回到「信息点蓝」；
   * 缺省 `true`；个别演示点可标 `false` 表示巡测参考或未接入平台。
   */
  hasLinkedIot?: boolean;
  /** 已关联的物联设备 key 列表，用于实时监测页初始化设备关联 */
  iotLinkedDeviceKeys?: string[];
  /** 断面监测点管控级别（国控/省控/县控），仅断面类点位在详情标题展示胶囊 */
  sectionControlLevel?: '国控' | '省控' | '县控';
  /** 断面水质目标等级（I类 ~ 劣V类），用于详情标题胶囊并与达标图例色板一致 */
  waterQualityTargetClass?: 'I类' | 'II类' | 'III类' | 'IV类' | 'V类' | '劣V类';
};

/** 与 DOM class `zht-map-poi-hint__metric-num--*` 对应 */
export function zhtMonitorMetricNumClass(tone: ZhtMonitorMetricTone): string {
  switch (tone) {
    case 'normal':
      return 'zht-map-poi-hint__metric-num--green';
    case 'danger':
      return 'zht-map-poi-hint__metric-num--red';
    case 'warn':
      return 'zht-map-poi-hint__metric-num--warn';
    case 'info':
      return 'zht-map-poi-hint__metric-num--blue';
    case 'nodata':
      return 'zht-map-poi-hint__metric-num--gray';
  }
}

/** 监测数值占位视为无效（用于判断是否展示 POI 提示板指标行） */
export function metricValueEmpty(v: string): boolean {
  const t = String(v ?? '').trim();
  return t === '' || t === '--' || t === '—' || t === '/' || /^n\/?a$/i.test(t);
}

/** 单行是否为有效实时监测数据（非 nodata 且数值非占位） */
export function monitoringMetricRowHasRealtimeData(row: ZhtMonitorMetricRow): boolean {
  if (row.tone === 'nodata') return false;
  return !metricValueEmpty(row.value);
}

/**
 * 详情「关联物联」保存为空数组（或显式 hasLinkedIot: false）：
 * 与设施台账「未关联物联=信息点蓝」口径对齐，并禁止提示板数值行。
 */
export function monitoringExplicitNoLinkedIot(mon: ZhtMonitoringPoiDemo): boolean {
  if (Array.isArray(mon.iotLinkedDeviceKeys) && mon.iotLinkedDeviceKeys.length === 0) return true;
  if (mon.hasLinkedIot === false) return true;
  return false;
}

/** 站点是否存在至少一条可展示的实时监测项 */
export function monitoringPoiHasRealtimeMetrics(mon: ZhtMonitoringPoiDemo): boolean {
  if (monitoringExplicitNoLinkedIot(mon)) return false;
  return mon.metrics.some(monitoringMetricRowHasRealtimeData);
}

/** 监测参数是否均无有效数据（用于提示板数据行过滤，不再单独驱动灰态） */
function monitoringMetricsAllNoData(mon: ZhtMonitoringPoiDemo): boolean {
  if (!mon.metrics.length) return true;
  return mon.metrics.every(r => r.tone === 'nodata' || metricValueEmpty(r.value));
}

/** I～IV 级报警或演示「超标」类 danger 视为报警红（优先级最高） */
function monitoringHasAlarm(mon: ZhtMonitoringPoiDemo): boolean {
  for (const r of mon.metrics) {
    if (r.tone === 'danger') return true;
    const blob = `${r.name}${r.value}`;
    if (/[IⅠ]\s*级|II\s*级|III\s*级|IV\s*级|Ⅱ级|Ⅲ级|Ⅳ级|[一二三四]\s*级\s*报警/i.test(blob)) return true;
  }
  return false;
}

/**
 * 监测类 POI 外圈单色态（单点仅一种），与设施类统一四态口径：
 * - **未关联物联**（`monitoringExplicitNoLinkedIot`）：信息点蓝（优先于演示占位告警）；
 * - 报警：监测参数出现 I～IV 级报警，或演示指标 tone 为超标类 `danger`；
 * - 在线：有物联关联且无报警时统一按在线展示（包含缺数占位场景）；
 * - 离线：仅保留给后续真实接口的明确离线态（演示口径当前不使用）。
 */
export function deriveMonitoringPoiDisplayState(mon: ZhtMonitoringPoiDemo): ZhtMonitorRingDisplayState {
  if (monitoringExplicitNoLinkedIot(mon)) return 'info';
  if (monitoringHasAlarm(mon)) return 'alarm';
  if (monitoringMetricsAllNoData(mon)) return 'online';
  return 'online';
}

/** 与详情水质 Tab 一致的五项；deviceKey 选用占位哈希下能产生告警/离线的演示组合 */
function buildWQMonitoringDemoMetrics(deviceKey: string, allNoData: boolean): ZhtMonitorMetricRow[] {
  if (allNoData) {
    return WATER_QUALITY_METRIC_DEFS.map((m) => ({
      name: m.label,
      value: '--',
      unit: m.unit,
      tone: 'nodata' as const,
    }));
  }
  const rows = getWaterQualityRealtimeSnapshotRows(deviceKey, WATER_QUALITY_METRIC_DEFS.length);
  return rows.map((r) => ({
    name: r.name,
    value: r.value,
    unit: r.unit,
    tone: r.tone as ZhtMonitorMetricTone,
  }));
}

export const ZHT_MONITORING_POI_DEMO: ZhtMonitoringPoiDemo[] = [
  {
    id: 'mon-1',
    lng: 112.534,
    lat: 27.919,
    title: '清溪河控制断面监测点',
    sectionControlLevel: '省控',
    waterQualityTargetClass: 'III类',
    pointState: 'normal',
    hasLinkedIot: true,
    /** 默认关联1台物联设备；与快照 deviceKey `'1'` 一致 */
    iotLinkedDeviceKeys: ['1'],
    metrics: buildWQMonitoringDemoMetrics('1', false),
  },
  {
    id: 'mon-2',
    lng: 112.518,
    lat: 27.912,
    title: '韶河入库断面监测点',
    sectionControlLevel: '国控',
    waterQualityTargetClass: 'III类',
    pointState: 'alarm',
    hasLinkedIot: true,
    /** COD 通道占位告警，保证外圈报警态与详情大卡一致 */
    iotLinkedDeviceKeys: ['9'],
    metrics: buildWQMonitoringDemoMetrics('9', false),
  },
  /** 与其它水质自动站同口径：`UnifiedSearchPointDetailContent`「实时监测」展示 COD/氨氮/pH/总磷/总氮 */
  {
    id: 'mon-4',
    lng: 112.529,
    lat: 27.913,
    title: '河道巡测参考点',
    pointState: 'general',
    hasLinkedIot: true,
    iotLinkedDeviceKeys: ['12'],
    metrics: buildWQMonitoringDemoMetrics('12', false),
  },
  {
    id: 'mon-3',
    lng: 112.542,
    lat: 27.908,
    title: '园区下游考核断面监测点',
    sectionControlLevel: '县控',
    waterQualityTargetClass: 'IV类',
    pointState: 'offline',
    hasLinkedIot: true,
    iotLinkedDeviceKeys: ['1'],
    metrics: buildWQMonitoringDemoMetrics('1', true),
  },
];

/** 地图侧水质监测站物联关联覆盖（综合态势 `ZhtMaplibreBoard` 注册 ref，供统一点位四态读取） */
let monitoringMapIotOverridesGetter: (() => Record<string, string[]>) | null = null;

export function registerMonitoringMapIotOverrides(getter: (() => Record<string, string[]>) | null): void {
  monitoringMapIotOverridesGetter = getter;
}

export function getMonitoringMapIotOverridesSnapshot(): Record<string, string[]> {
  return monitoringMapIotOverridesGetter?.() ?? {};
}

/**
 * 合并物联关联后的演示监测站（多终端告警聚合 + 五项告警优先排序，与泵站地图覆盖同源）。
 */
export function mergeMonitoringPoiDemoWithIotOverrides(
  monId: string,
  overrides: Record<string, string[]> | undefined | null,
): ZhtMonitoringPoiDemo | undefined {
  const base = ZHT_MONITORING_POI_DEMO.find((m) => m.id === monId);
  if (!base) return undefined;
  if (!overrides || !Object.prototype.hasOwnProperty.call(overrides, monId)) {
    return base;
  }
  const keys = overrides[monId]!;
  if (keys.length === 0) {
    return {
      ...base,
      iotLinkedDeviceKeys: [],
      hasLinkedIot: false,
      metrics: buildWQMonitoringDemoMetrics(FACILITY_REALTIME_DEFAULT_DEVICE_KEY, true),
    };
  }
  const recordLike: Record<string, unknown> = { iotLinkedDeviceKeys: keys };
  const deviceKey = pickFacilityHintBoardWaterSceneDeviceKey(recordLike);
  const rowsRaw = getWaterQualityRealtimeSnapshotRowsAlarmFirst(deviceKey, WATER_QUALITY_METRIC_DEFS.length);
  return {
    ...base,
    iotLinkedDeviceKeys: [...keys],
    hasLinkedIot: true,
    metrics: rowsRaw.map((r) => ({
      name: r.name,
      value: r.value,
      unit: r.unit,
      tone: r.tone as ZhtMonitorMetricTone,
    })),
  };
}

/** 监测站 GeoJSON（地图圆点图层用） */
export function buildMonitoringPointsFeatureCollection(): GeoJSON.FeatureCollection<
  GeoJSON.Point,
  { id: string; state: ZhtMonitorRingDisplayState }
> {
  return {
    type: 'FeatureCollection',
    features: ZHT_MONITORING_POI_DEMO.map(m => ({
      type: 'Feature' as const,
      properties: { id: m.id, state: deriveMonitoringPoiDisplayState(m) },
      geometry: { type: 'Point' as const, coordinates: [m.lng, m.lat] },
    })),
  };
}
