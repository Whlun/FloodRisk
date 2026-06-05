/**
 * 应急事件「事件处置」嵌套对象是否有实质内容，用于列表「处置填报」/「填报信息」分支。
 * 不以顶层 disposalProgress 等为准（登记阶段可能已有值）。
 */

import type { EmergencyEventRow } from './emergencyEventTypes';

function hasDisposalText(v: unknown): boolean {
  return String(v ?? '').trim().length > 0;
}

/** 仅根据 eventDisposal 判定 */
export function hasEmergencyEventDisposalFilled(row: EmergencyEventRow | null | undefined): boolean {
  const d = row?.eventDisposal;
  if (!d) return false;
  if (
    hasDisposalText(d.contactPhone) ||
    hasDisposalText(d.disposalDescribe) ||
    hasDisposalText(d.completedTime)
  ) {
    return true;
  }
  return Array.isArray(d.images) && d.images.length > 0;
}
