/**
 * 建管工程画像 · 当前阶段滞留预警（演示：统一天数阈值）
 * @deprecated UI 已统一为前三未预警（cmIndustrialLandAlert.ts）；保留供后续扩展或离线统计
 */
import dayjs from 'dayjs';
import { resolveProjectCurrentPhaseEnteredAt } from './mock/constructionProjectParcel';
import { getPhaseMetric } from './mock/phaseDistribution';
import type { CmPhaseAlert, CmPhaseAlertLevel, ConstructionProject } from './types';

/** 演示固定「今天」，避免每次打开原型天数漂移 */
export const CM_PHASE_ALERT_AS_OF = dayjs('2026-06-02');

export const CM_PHASE_ALERT_THRESHOLDS = {
  hintDays: 60,
  warningDays: 90,
  seriousDays: 120,
} as const;

/** 与前三未预警等级文案一致：I 级最重，III 级最轻 */
const LEVEL_LABEL: Record<CmPhaseAlertLevel, string> = {
  serious: 'I级',
  warning: 'II级',
  hint: 'III级',
};

const LEVEL_RANK: Record<CmPhaseAlertLevel, number> = {
  serious: 3,
  warning: 2,
  hint: 1,
};

function resolveAlertLevel(daysInPhase: number): CmPhaseAlertLevel | null {
  const { hintDays, warningDays, seriousDays } = CM_PHASE_ALERT_THRESHOLDS;
  if (daysInPhase >= seriousDays) return 'serious';
  if (daysInPhase >= warningDays) return 'warning';
  if (daysInPhase >= hintDays) return 'hint';
  return null;
}

export function getCmProjectPhaseAlert(project: ConstructionProject): CmPhaseAlert | null {
  const enteredAt = resolveProjectCurrentPhaseEnteredAt(project);
  if (!enteredAt) return null;
  const start = dayjs(enteredAt);
  if (!start.isValid()) return null;
  const daysInPhase = CM_PHASE_ALERT_AS_OF.diff(start, 'day');
  if (daysInPhase < 0) return null;
  const level = resolveAlertLevel(daysInPhase);
  if (!level) return null;
  const phaseLabel = getPhaseMetric(project.phaseKey).label;
  const levelLabel = LEVEL_LABEL[level];
  return {
    projectId: project.id,
    phaseKey: project.phaseKey,
    level,
    enteredAt,
    daysInPhase,
    message: `${phaseLabel}已停留 ${daysInPhase} 天（${levelLabel}）`,
  };
}

/** 详情时间轴节点下方：阶段名已在节点上展示，仅保留停留天数与等级 */
export function formatCmPhaseAlertTimelineMessage(
  alert: Pick<CmPhaseAlert, 'daysInPhase' | 'level'>,
): string {
  return `已停留 ${alert.daysInPhase} 天（${LEVEL_LABEL[alert.level]}）`;
}

export type CmProjectWithPhaseAlert = {
  project: ConstructionProject;
  alert: CmPhaseAlert;
};

export function listCmProjectAlerts(projects: ConstructionProject[]): CmProjectWithPhaseAlert[] {
  const out: CmProjectWithPhaseAlert[] = [];
  for (const project of projects) {
    const alert = getCmProjectPhaseAlert(project);
    if (alert) out.push({ project, alert });
  }
  out.sort((a, b) => {
    const lr = LEVEL_RANK[b.alert.level] - LEVEL_RANK[a.alert.level];
    if (lr !== 0) return lr;
    return b.alert.daysInPhase - a.alert.daysInPhase;
  });
  return out;
}

export function countCmProjectAlerts(projects: ConstructionProject[]): number {
  return listCmProjectAlerts(projects).length;
}

/** 对齐综合态势报警等级色阶：hint→l4，warning→l3，serious→l2 */
export function getCmPhaseAlertLevelTone(level: CmPhaseAlertLevel): 'l2' | 'l3' | 'l4' {
  if (level === 'serious') return 'l2';
  if (level === 'warning') return 'l3';
  return 'l4';
}
