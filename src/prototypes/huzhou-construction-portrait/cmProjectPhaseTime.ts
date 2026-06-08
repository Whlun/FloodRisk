import {
  buildCmPhaseAcceptTimes,
  resolveProjectCurrentPhaseEnteredAt,
} from './mock/constructionProjectParcel';
import type { ConstructionProject } from './types';

/** 演示日期归一化为 YYYY-MM-DD（闭区间比较） */
export function normalizeCmProjectDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (/^\d{6}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-01`;
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return null;
}

/** 前三未预警项目 · 用于申报时间筛选的关键节点日期 */
function resolveIndustrialLandMilestoneDate(project: ConstructionProject): string | null {
  const raw =
    project.nongzhuanDate ??
    project.supplyDate ??
    project.contractStartDate ??
    project.constructDate ??
    project.applyDate;
  return raw ? normalizeCmProjectDate(raw) : null;
}

/** 当前阶段时间节点：优先 phaseEnteredAt，否则前三未关键节点 / 时间轴受理日期 */
export function resolveProjectCurrentPhaseTime(project: ConstructionProject): string | null {
  const entered = resolveProjectCurrentPhaseEnteredAt(project);
  if (entered) return normalizeCmProjectDate(entered);

  const milestone = resolveIndustrialLandMilestoneDate(project);
  if (milestone) return milestone;

  const phaseTime = buildCmPhaseAcceptTimes(project)[project.phaseKey];
  if (phaseTime) return normalizeCmProjectDate(String(phaseTime));

  return null;
}

export function projectCurrentPhaseTimeInRange(
  project: ConstructionProject,
  dateFrom?: string,
  dateTo?: string,
): boolean {
  if (!dateFrom && !dateTo) return true;

  const d = resolveProjectCurrentPhaseTime(project);
  if (!d) return false;
  if (dateFrom && d < dateFrom) return false;
  if (dateTo && d > dateTo) return false;
  return true;
}
