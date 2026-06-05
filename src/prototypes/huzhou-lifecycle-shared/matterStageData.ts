/**
 * 事项阶段填报记录（单条 / 多条）
 */
import type { MatterStageKey } from './parcelMatterStages';
import type { MatterStageRecord, ParcelLifecycle } from './types';

const CN_RECORD_INDEX = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'] as const;

export function matterRecordTabLabel(matterLabel: string, index: number): string {
  const suffix = CN_RECORD_INDEX[index] ?? String(index + 1);
  return `${matterLabel}${suffix}`;
}

/** 某事项的全部填报记录；无 stageRecords 时回退 stages 单条 */
export function getMatterStageRecords(
  parcel: ParcelLifecycle,
  matterKey: MatterStageKey,
): MatterStageRecord[] {
  const multi = parcel.stageRecords?.[matterKey];
  if (multi?.length) return multi;
  const single = parcel.stages[matterKey];
  if (single && Object.keys(single).length > 0) return [single];
  return [];
}

export function matterHasData(parcel: ParcelLifecycle, key: MatterStageKey): boolean {
  return getMatterStageRecords(parcel, key).length > 0;
}
