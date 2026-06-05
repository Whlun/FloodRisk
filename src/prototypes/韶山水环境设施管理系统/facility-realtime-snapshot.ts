/**
 * 设施详情「实时监测」与地图 POI 物联提示板共用的占位时序/数值/通道态口径。
 * 详情页 `FacilityRealtimePanel`、地图 `zhtFacilityPoiHintMetrics`、监测演示 POI 均应引用此处，避免两套哈希漂移。
 */

/** 与 pipe-node-monitoring / POI 提示板一致 */
export type DeviceLinkStatus = 'running' | 'stopped' | 'abnormal';

/** 单监测项报警占位级别（与详情大卡哈希一致） */
export type MetricAlarmLevel = 'offline' | 'normal' | 'blue' | 'yellow' | 'orange' | 'red';

/** 地图数值语义色（与 `ZhtMonitorMetricTone` 一致） */
export type FacilityRealtimePoiTone = 'normal' | 'danger' | 'warn' | 'info' | 'nodata';

/** 默认选中物联设备 key，与详情默认首台一致（`linkedDevices[0]?.key ?? '1'`） */
export const FACILITY_REALTIME_DEFAULT_DEVICE_KEY = '1';

/** 泵站 / 排口 / 污水厂详情实时监测指标定义（与 `FacilityRealtimePanel` 同源） */
export const PUMP_SCENE_METRIC_DEFS: readonly { key: string; label: string; unit: string; primary?: boolean }[] = [
  { key: 'inP', label: '总进水压力', unit: 'Mpa', primary: true },
  { key: 'preP', label: '泵前压力', unit: 'Mpa' },
  { key: 'postP', label: '泵后压力', unit: 'Mpa' },
  { key: 'flow', label: '瞬时流量', unit: 'm³/h' },
  { key: 'tank', label: '水箱液位', unit: 'm' },
];

/** 水质监测站详情实时监测指标定义 */
export const WATER_QUALITY_METRIC_DEFS: readonly { key: string; label: string; unit: string; primary?: boolean }[] = [
  { key: 'cod', label: 'COD', unit: 'mg/L', primary: true },
  { key: 'nh3n', label: '氨氮', unit: 'mg/L' },
  { key: 'ph', label: 'pH', unit: '' },
  { key: 'tp', label: '总磷', unit: 'mg/L' },
  { key: 'tn', label: '总氮', unit: 'mg/L' },
];

/** 按设备+监测项确定性生成报警级别（与详情大卡一致） */
export function getMetricAlarmLevel(deviceKey: string, metricKey: string): MetricAlarmLevel {
  const s = deviceKey + metricKey;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h + s.charCodeAt(i) * (i + 1)) % 997;
  }
  const t = h % 10;
  if (t < 5) return 'normal';
  if (t < 8) return 'offline';
  const sub = h % 4;
  if (sub === 0) return 'red';
  if (sub === 1) return 'orange';
  if (sub === 2) return 'yellow';
  return 'blue';
}

export function getMetricChannelStatus(deviceKey: string, metricKey: string): DeviceLinkStatus {
  const lv = getMetricAlarmLevel(deviceKey, metricKey);
  if (lv === 'offline') return 'stopped';
  if (lv === 'normal') return 'running';
  return 'abnormal';
}

/** 台账显式配置 `iotLinkedDeviceKeys: []` 表示已解绑全部物联设备（地图信息点蓝、不叠监测提示） */
export function facilityExplicitNoLinkedIot(record: Record<string, unknown>): boolean {
  return Array.isArray(record.iotLinkedDeviceKeys) && record.iotLinkedDeviceKeys.length === 0;
}

/** 与详情默认首台选取一致：台账可选 `iotLinkedDeviceKeys` */
export function pickFacilityRealtimeDeviceKey(record: Record<string, unknown>): string {
  const raw = record.iotLinkedDeviceKeys;
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'string') return raw[0];
  return FACILITY_REALTIME_DEFAULT_DEVICE_KEY;
}

/**
 * 解析台账 `iotLinkedDeviceKeys`：未配置或非数组时与 `pickFacilityRealtimeDeviceKey` 一致，按单设备默认 key。
 * 用于多泵/多终端聚合：地图四态、提示板不得在「仅取数组首项」时掩盖其它设备的告警。
 */
export function facilityLinkedPumpStyleDeviceKeys(record: Record<string, unknown>): string[] {
  const raw = record.iotLinkedDeviceKeys;
  if (Array.isArray(raw) && raw.length > 0) {
    const keys = raw.filter((x): x is string => typeof x === 'string');
    if (keys.length > 0) return keys;
  }
  return [FACILITY_REALTIME_DEFAULT_DEVICE_KEY];
}

function sortPumpDeviceKeysNumeric(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    const aNum = Number.isFinite(na) && String(na) === a;
    const bNum = Number.isFinite(nb) && String(nb) === b;
    if (aNum && bNum) return na - nb;
    return a.localeCompare(b, 'zh-CN', { numeric: true });
  });
}

/** 关联多台时：任一设备存在异常通道则设施级视为告警（与详情横滑卡红框同源） */
export function pumpFacilityAnyLinkedDeviceHasAbnormalChannel(record: Record<string, unknown>): boolean {
  for (const dk of facilityLinkedPumpStyleDeviceKeys(record)) {
    if (pumpSceneSnapshotHasAbnormalChannel(dk)) return true;
  }
  return false;
}

/** 关联多台时：每台设备全部监测项均为停止占位，则设施级视为离线 */
export function pumpFacilityEveryLinkedDeviceAllChannelsStopped(record: Record<string, unknown>): boolean {
  const keys = facilityLinkedPumpStyleDeviceKeys(record);
  if (keys.length === 0) return false;
  return keys.every((dk) => pumpSceneSnapshotAllChannelsStopped(dk));
}

/**
 * 提示板用工况快照：在已关联设备中优先选「存在异常通道」的设备（同 key 数值序），否则取排序后首台。
 */
export function pickFacilityHintBoardPumpSceneDeviceKey(record: Record<string, unknown>): string {
  const keys = sortPumpDeviceKeysNumeric(facilityLinkedPumpStyleDeviceKeys(record));
  for (const dk of keys) {
    if (pumpSceneSnapshotHasAbnormalChannel(dk)) return dk;
  }
  return keys[0] ?? FACILITY_REALTIME_DEFAULT_DEVICE_KEY;
}

/** 工况场景：任一监测项为占位异常通道（与 POI 提示板数值 danger、大卡告警一致） */
export function pumpSceneSnapshotHasAbnormalChannel(deviceKey: string): boolean {
  for (const m of PUMP_SCENE_METRIC_DEFS) {
    if (getMetricChannelStatus(deviceKey, m.key) === 'abnormal') return true;
  }
  return false;
}

/** 工况场景：全部监测项通道均为离线占位（stopped） */
export function pumpSceneSnapshotAllChannelsStopped(deviceKey: string): boolean {
  if (PUMP_SCENE_METRIC_DEFS.length === 0) return false;
  for (const m of PUMP_SCENE_METRIC_DEFS) {
    if (getMetricChannelStatus(deviceKey, m.key) !== 'stopped') return false;
  }
  return true;
}

/** 水质五项：任一监测项为占位异常通道（与详情 COD 大卡同源哈希） */
export function waterSceneSnapshotHasAbnormalChannel(deviceKey: string): boolean {
  for (const m of WATER_QUALITY_METRIC_DEFS) {
    if (getMetricChannelStatus(deviceKey, m.key) === 'abnormal') return true;
  }
  return false;
}

/** 水质五项全部为停止占位 */
export function waterSceneSnapshotAllChannelsStopped(deviceKey: string): boolean {
  if (WATER_QUALITY_METRIC_DEFS.length === 0) return false;
  for (const m of WATER_QUALITY_METRIC_DEFS) {
    if (getMetricChannelStatus(deviceKey, m.key) !== 'stopped') return false;
  }
  return true;
}

/**
 * 提示板用工况快照：在已关联终端中优先选「五项中存在异常通道」的设备（key 数值序），否则取首台。
 * 与 `pickFacilityHintBoardPumpSceneDeviceKey` 同源队列语义，`iotLinkedDeviceKeys` 为台账口径。
 */
export function pickFacilityHintBoardWaterSceneDeviceKey(record: Record<string, unknown>): string {
  const keys = sortPumpDeviceKeysNumeric(facilityLinkedPumpStyleDeviceKeys(record));
  for (const dk of keys) {
    if (waterSceneSnapshotHasAbnormalChannel(dk)) return dk;
  }
  return keys[0] ?? FACILITY_REALTIME_DEFAULT_DEVICE_KEY;
}

/** 详情大卡异常一律红色告警样式 → POI 数值语义对齐为 danger */
export function facilityChannelStatusToPoiTone(st: DeviceLinkStatus): FacilityRealtimePoiTone {
  switch (st) {
    case 'running':
      return 'normal';
    case 'stopped':
      return 'nodata';
    default:
      return 'danger';
  }
}

export function buildWQSingleSeries(metricKey: string) {
  const bases: Record<string, number> = {
    cod: 17.8,
    nh3n: 0.41,
    ph: 7.55,
    tp: 0.076,
    tn: 1.02,
  };
  const base = bases[metricKey] ?? 1;
  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
  const data = hours.map((_, i) => {
    const amp = metricKey === 'ph' ? 0.12 : metricKey === 'nh3n' || metricKey === 'tp' ? 0.06 : 1.1;
    const noise = Math.sin(i / 3) * amp + Math.cos(i / 5) * (amp * 0.5);
    let v = base + noise;
    if (metricKey === 'ph') v = Math.round(v * 10) / 10;
    else if (metricKey === 'nh3n' || metricKey === 'tp' || metricKey === 'tn') v = Math.round(v * 100) / 100;
    else v = Math.round(v * 10) / 10;
    return v;
  });
  return { hours, data };
}

export function formatWQMetricValue(metricKey: string, raw: number): string {
  if (metricKey === 'ph') return raw.toFixed(1);
  if (metricKey === 'nh3n' || metricKey === 'tp' || metricKey === 'tn') return raw.toFixed(2);
  return raw.toFixed(1);
}

export function buildSingleSeries(metricKey: string) {
  const base =
    metricKey === 'tank'
      ? 1.15
      : metricKey === 'inP' || metricKey === 'preP' || metricKey === 'postP'
        ? 0.35
        : metricKey === 'flow'
          ? 18
          : 0.35;
  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
  const data = hours.map((_, i) => {
    const noise = Math.sin(i / 3) * (metricKey === 'tank' ? 0.08 : 2) + Math.cos(i / 5);
    return Math.round((base + noise) * 10) / 10;
  });
  return { hours, data };
}

export function formatMetricValue(metricKey: string, raw: number): string {
  switch (metricKey) {
    case 'tank':
      return `${raw.toFixed(2)}`;
    case 'inP':
    case 'preP':
    case 'postP':
      return raw.toFixed(3);
    case 'flow':
      return raw.toFixed(1);
    default:
      return String(raw);
  }
}

/** 地图提示板：监测项按告警优先排序（danger → … → nodata） */
const POI_PUMP_METRIC_TONE_SORT_RANK: Record<FacilityRealtimePoiTone, number> = {
  danger: 0,
  warn: 1,
  info: 2,
  normal: 3,
  nodata: 4,
};

/** 与详情「实时监测」大卡当前值一致（末点 + 通道态着色） */
export function getPumpSceneRealtimeSnapshotRows(
  deviceKey: string = FACILITY_REALTIME_DEFAULT_DEVICE_KEY,
  maxRows = 4,
): Array<{ name: string; value: string; unit: string; tone: FacilityRealtimePoiTone }> {
  const rows: Array<{ name: string; value: string; unit: string; tone: FacilityRealtimePoiTone }> = [];
  for (const m of PUMP_SCENE_METRIC_DEFS) {
    const st = getMetricChannelStatus(deviceKey, m.key);
    const { data } = buildSingleSeries(m.key);
    const lv = data[data.length - 1]!;
    rows.push({
      name: m.label,
      value: formatMetricValue(m.key, lv),
      unit: m.unit,
      tone: facilityChannelStatusToPoiTone(st),
    });
    if (rows.length >= maxRows) break;
  }
  return rows;
}

/** 同工况快照，先取全量监测项再按告警优先截断（地图 POI 提示板） */
export function getPumpSceneRealtimeSnapshotRowsAlarmFirst(
  deviceKey: string,
  maxRows: number,
): Array<{ name: string; value: string; unit: string; tone: FacilityRealtimePoiTone }> {
  const indexed = PUMP_SCENE_METRIC_DEFS.map((m, defIdx) => {
    const st = getMetricChannelStatus(deviceKey, m.key);
    const { data } = buildSingleSeries(m.key);
    const lv = data[data.length - 1]!;
    const row = {
      name: m.label,
      value: formatMetricValue(m.key, lv),
      unit: m.unit,
      tone: facilityChannelStatusToPoiTone(st),
    };
    return { defIdx, row };
  });
  indexed.sort((a, b) => {
    const d = POI_PUMP_METRIC_TONE_SORT_RANK[a.row.tone] - POI_PUMP_METRIC_TONE_SORT_RANK[b.row.tone];
    if (d !== 0) return d;
    return a.defIdx - b.defIdx;
  });
  return indexed.slice(0, maxRows).map((x) => x.row);
}

/** 水质五项：按告警优先截断（监测站地图 POI 提示板） */
export function getWaterQualityRealtimeSnapshotRowsAlarmFirst(
  deviceKey: string,
  maxRows: number,
): Array<{ name: string; value: string; unit: string; tone: FacilityRealtimePoiTone }> {
  const indexed = WATER_QUALITY_METRIC_DEFS.map((m, defIdx) => {
    const st = getMetricChannelStatus(deviceKey, m.key);
    const { data } = buildWQSingleSeries(m.key);
    const lv = data[data.length - 1]!;
    const row = {
      name: m.label,
      value: formatWQMetricValue(m.key, lv),
      unit: m.unit,
      tone: facilityChannelStatusToPoiTone(st),
    };
    return { defIdx, row };
  });
  indexed.sort((a, b) => {
    const d = POI_PUMP_METRIC_TONE_SORT_RANK[a.row.tone] - POI_PUMP_METRIC_TONE_SORT_RANK[b.row.tone];
    if (d !== 0) return d;
    return a.defIdx - b.defIdx;
  });
  return indexed.slice(0, maxRows).map((x) => x.row);
}

/** 水质监测站场景：与详情 `wqMetricDisplayFor` + 通道态一致 */
export function getWaterQualityRealtimeSnapshotRows(
  deviceKey: string = FACILITY_REALTIME_DEFAULT_DEVICE_KEY,
  maxRows = 4,
): Array<{ name: string; value: string; unit: string; tone: FacilityRealtimePoiTone }> {
  const rows: Array<{ name: string; value: string; unit: string; tone: FacilityRealtimePoiTone }> = [];
  for (const m of WATER_QUALITY_METRIC_DEFS) {
    const st = getMetricChannelStatus(deviceKey, m.key);
    const { data } = buildWQSingleSeries(m.key);
    const lv = data[data.length - 1]!;
    rows.push({
      name: m.label,
      value: formatWQMetricValue(m.key, lv),
      unit: m.unit,
      tone: facilityChannelStatusToPoiTone(st),
    });
    if (rows.length >= maxRows) break;
  }
  return rows;
}
