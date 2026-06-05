/**
 * 设施台账查找 + 地图侧物联关联覆盖（`iotLinkedDeviceKeys`）合并解析。
 * 注册 merge 后，`deriveDisplayStateForUnifiedPoint` 等与 DOM 台账 POI 同源，避免叠两层点时外层仍用静态台账。
 */
import type { ZhtFacilityMapKind } from './zhtSearchUnifiedData';
import {
  outletData,
  plantData,
  pumpStationData,
} from '../韶山水环境设施管理系统/facility-points-data';
import { dischargerDemoData } from '../韶山水环境设施管理系统/facility-discharger-data';

export function findFacilityLedgerRecord(kind: ZhtFacilityMapKind, id: string): Record<string, unknown> | null {
  if (kind === 'pump') return pumpStationData.find(r => r.id === id) ?? null;
  if (kind === 'outlet') return outletData.find(r => r['入河入海排污口编码'] === id) ?? null;
  if (kind === 'plant') return plantData.find(r => r.id === id) ?? null;
  const d = dischargerDemoData.find(r => r.id === id);
  return d ? (d as unknown as Record<string, unknown>) : null;
}

type LedgerMergeFn = (kind: ZhtFacilityMapKind, id: string) => Record<string, unknown> | null;

let facilityLedgerMergeRef: LedgerMergeFn | null = null;

/** 综合态势地图在挂载 DOM POI 的 effect 中注册 / 卸载 */
export function registerFacilityMapLedgerMerge(fn: LedgerMergeFn | null): void {
  facilityLedgerMergeRef = fn;
}

/** 优先地图合并台账（含物联关联原型覆盖）；未注册时回退静态台账 */
export function getMergedFacilityLedgerRecord(kind: ZhtFacilityMapKind, id: string): Record<string, unknown> | null {
  if (facilityLedgerMergeRef) return facilityLedgerMergeRef(kind, id);
  return findFacilityLedgerRecord(kind, id);
}
