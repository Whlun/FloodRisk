/**
 * 河湖管护事务 disposal 嵌套对象是否有实质内容，用于列表「处置填报」/「填报信息」分支。
 */

import type { RiverGuardAffairRow } from './riverChiefDb4401';

function hasDisposalText(v: unknown): boolean {
  return String(v ?? '').trim().length > 0;
}

export function hasRiverGuardAffairDisposalFilled(
  row: Pick<RiverGuardAffairRow, 'disposal'> | null | undefined,
): boolean {
  const d = row?.disposal;
  if (!d) return false;
  if (
    hasDisposalText(d.disposalLeader) ||
    hasDisposalText(d.contactPhone) ||
    hasDisposalText(d.disposalDescribe) ||
    hasDisposalText(d.completedTime)
  ) {
    return true;
  }
  return Array.isArray(d.images) && d.images.length > 0;
}
