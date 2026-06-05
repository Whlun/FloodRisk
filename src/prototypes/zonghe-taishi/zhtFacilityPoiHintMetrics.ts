/**
 * 综合态势 · 设施点位提示板「物联监测」演示行
 * 地图提示板在开启「监测类 · 数值显示」时展示；不含类型、台数、设计能力等台账基础信息，仅工况/水质类实时指标（演示数据）。**数值、顺序、格式化与详情「实时监测」同源**，见 `facility-realtime-snapshot.ts`。
 */
import {
  facilityExplicitNoLinkedIot,
  getPumpSceneRealtimeSnapshotRowsAlarmFirst,
  getWaterQualityRealtimeSnapshotRows,
  pickFacilityHintBoardPumpSceneDeviceKey,
} from '../韶山水环境设施管理系统/facility-realtime-snapshot';
import { ZHT_MONITOR_POI_HINT_METRICS_MAX } from './zhtPoiMonitoringDemo';
import type { ZhtMonitorMetricTone } from './zhtPoiMonitoringDemo';
import type {
  OutletRecord,
  PlantRecord,
  PumpStationRecord,
} from '../韶山水环境设施管理系统/facility-points-data';
import type { PsDischargerRecord } from '../韶山水环境设施管理系统/facility-discharger-data';

export type ZhtFacilityHintMetricRow = {
  name: string;
  value: string;
  unit: string;
  tone: ZhtMonitorMetricTone;
};

/** 物联监测提示行是否视为有效实时数据（无数据 / 占位不展示） */
export function facilityHintMetricRowHasRealtimeData(row: ZhtFacilityHintMetricRow): boolean {
  if (row.tone === 'nodata') return false;
  const t = String(row.value ?? '').trim();
  return !(t === '' || t === '--' || t === '—' || t === '/' || /^n\/?a$/i.test(t));
}

/** 由设施 id 生成稳定伪随机，保证同一点位刷新后演示数值不变 */
function stableHash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mapSnapshotRowsToHint(
  rows: Array<{ name: string; value: string; unit: string; tone: string }>,
): ZhtFacilityHintMetricRow[] {
  return rows.map((r) => ({
    name: r.name,
    value: r.value,
    unit: r.unit,
    tone: r.tone as ZhtMonitorMetricTone,
  }));
}

/**
 * 无台账或仅需水质演示行时：按任意稳定 id（统一点位 id、行政区划 id 等）生成指标。
 * 设备 key 由种子派生，使不同单元数值略有差异；与固定台账详情默认首台 `'1'` 不要求一致。
 */
export function getGenericWaterIotHintRowsFromSeed(seedId: string): ZhtFacilityHintMetricRow[] {
  const h = stableHash(seedId);
  const deviceKey = String((h % 5) + 1);
  const rows = getWaterQualityRealtimeSnapshotRows(deviceKey, ZHT_MONITOR_POI_HINT_METRICS_MAX);
  return mapSnapshotRowsToHint(rows);
}

/**
 * 泵站 / 排口 / 污水厂 / 排水户 → 提示板物联监测类指标（最多 {@link ZHT_MONITOR_POI_HINT_METRICS_MAX} 行）。
 * 多泵关联时优先取存在告警通道的设备，且监测项按告警优先排序（与地图 POI 红圈、红字一致）。
 */
export function getFacilityHintMetricRows(
  _kind: 'pump' | 'outlet' | 'plant' | 'discharger',
  record: PumpStationRecord | OutletRecord | PlantRecord | PsDischargerRecord,
): ZhtFacilityHintMetricRow[] {
  const rec = record as unknown as Record<string, unknown>;
  if (facilityExplicitNoLinkedIot(rec)) return [];
  const deviceKey = pickFacilityHintBoardPumpSceneDeviceKey(rec);
  const rows = getPumpSceneRealtimeSnapshotRowsAlarmFirst(deviceKey, ZHT_MONITOR_POI_HINT_METRICS_MAX);
  return mapSnapshotRowsToHint(rows);
}
