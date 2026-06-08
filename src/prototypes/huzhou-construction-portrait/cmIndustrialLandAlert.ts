/**
 * 工业用地「前三未」预警：批而未供 / 供而未用 / 用而未尽
 */
import dayjs from 'dayjs';
import type {
  CmAlertType,
  CmIndustrialLandAlert,
  CmPhaseAlertLevel,
  ConstructionProject,
  PhaseKey,
} from './types';

/** 演示固定「今天」，与阶段滞留预警同源 */
export const CM_INDUSTRIAL_ALERT_AS_OF = dayjs('2026-06-02');

export const CM_ALERT_TYPE_LABEL: Record<CmAlertType, string> = {
  'approved-not-supplied': '批而未供',
  'supplied-not-used': '供而未用',
  'used-not-complete': '用而未尽',
};

/** 前三未预警等级（I 级最重，III 级最轻） */
export const CM_INDUSTRIAL_LEVEL_LABEL: Record<CmPhaseAlertLevel, string> = {
  serious: 'I级',
  warning: 'II级',
  hint: 'III级',
};

const LEVEL_RANK: Record<CmPhaseAlertLevel, number> = {
  serious: 3,
  warning: 2,
  hint: 1,
};

const ALERT_TYPE_PHASE_KEY: Record<CmAlertType, PhaseKey> = {
  'approved-not-supplied': 'farmland',
  'supplied-not-used': 'land-supply',
  'used-not-complete': 'eng-permit',
};

/** 前三未预警在时间轴上的固定锚点节点（大阶段转变关键节点） */
export const CM_ALERT_ANCHOR_PHASE_KEYS: readonly PhaseKey[] = [
  ALERT_TYPE_PHASE_KEY['approved-not-supplied'],
  ALERT_TYPE_PHASE_KEY['supplied-not-used'],
  ALERT_TYPE_PHASE_KEY['used-not-complete'],
] as const;

const SUGGEST_ACTION: Record<CmAlertType, Record<CmPhaseAlertLevel, string>> = {
  'approved-not-supplied': {
    hint: '提醒加快土地供应手续办理',
    warning: '督办推进供地方案编制与挂牌出让',
    serious: '列入批而未供专项整治，限期完成供地',
  },
  'supplied-not-used': {
    hint: '督促按合同约定筹备开工',
    warning: '约谈建设单位，明确开工时间节点',
    serious: '启动闲置土地处置，收回或置换盘活',
  },
  'used-not-complete': {
    hint: '跟踪建设进度，防止建设停滞',
    warning: '督促加大投资强度，推进未开发区域建设',
    serious: '开展低效用地再开发，限期提升建设比例',
  },
};

function diffDays(from: string): number | null {
  const start = dayjs(from);
  if (!start.isValid()) return null;
  const days = CM_INDUSTRIAL_ALERT_AS_OF.diff(start, 'day');
  return days < 0 ? null : days;
}

function resolveLevelByDelay(
  delayDays: number,
  thresholds: { hintMin: number; hintMax: number; warningMax: number },
): CmPhaseAlertLevel | null {
  if (delayDays >= thresholds.warningMax + 1) return 'serious';
  if (delayDays >= thresholds.hintMax) return 'warning';
  if (delayDays >= thresholds.hintMin) return 'hint';
  return null;
}

function evalApprovedNotSupplied(project: ConstructionProject): CmIndustrialLandAlert | null {
  const { nongzhuanDate, supplyDate } = project;
  if (!nongzhuanDate || supplyDate) return null;
  const delayDays = diffDays(nongzhuanDate);
  if (delayDays == null) return null;
  const level = resolveLevelByDelay(delayDays, {
    hintMin: 90,
    hintMax: 180,
    warningMax: 364,
  });
  if (!level) return null;
  const typeLabel = CM_ALERT_TYPE_LABEL['approved-not-supplied'];
  const levelLabel = CM_INDUSTRIAL_LEVEL_LABEL[level];
  return {
    projectId: project.id,
    alertType: 'approved-not-supplied',
    level,
    delayDays,
    suggestAction: SUGGEST_ACTION['approved-not-supplied'][level],
    referenceDate: nongzhuanDate,
    phaseKey: ALERT_TYPE_PHASE_KEY['approved-not-supplied'],
    message: `${typeLabel}超期 ${delayDays} 天（${levelLabel}）`,
  };
}

function evalSuppliedNotUsed(project: ConstructionProject): CmIndustrialLandAlert | null {
  const { supplyDate, constructDate, contractStartDate } = project;
  if (!supplyDate || constructDate || !contractStartDate) return null;
  const delayDays = diffDays(contractStartDate);
  if (delayDays == null) return null;
  const level = resolveLevelByDelay(delayDays, {
    hintMin: 30,
    hintMax: 90,
    warningMax: 364,
  });
  if (!level) return null;
  const typeLabel = CM_ALERT_TYPE_LABEL['supplied-not-used'];
  const levelLabel = CM_INDUSTRIAL_LEVEL_LABEL[level];
  return {
    projectId: project.id,
    alertType: 'supplied-not-used',
    level,
    delayDays,
    suggestAction: SUGGEST_ACTION['supplied-not-used'][level],
    referenceDate: contractStartDate,
    phaseKey: ALERT_TYPE_PHASE_KEY['supplied-not-used'],
    message: `${typeLabel}超期 ${delayDays} 天（${levelLabel}）`,
  };
}

function evalUsedNotComplete(project: ConstructionProject): CmIndustrialLandAlert | null {
  const {
    constructDate,
    verifyDate,
    buildAreaSqm,
    plannedBuiltAreaSqm,
    totalAreaMu,
    developedAreaMu,
  } = project;
  if (!constructDate || verifyDate) return null;
  if (!plannedBuiltAreaSqm || plannedBuiltAreaSqm <= 0) return null;
  if (buildAreaSqm == null || buildAreaSqm < 0) return null;
  if (totalAreaMu == null || totalAreaMu <= 0) return null;

  const builtRatio = buildAreaSqm / plannedBuiltAreaSqm;
  const developed = developedAreaMu ?? totalAreaMu * builtRatio;
  const unusedAreaMu = totalAreaMu - developed;

  const meetsRatio = builtRatio >= 1 / 3 && builtRatio <= 7 / 10;
  const meetsUnused = unusedAreaMu >= 20;
  if (!meetsRatio && !meetsUnused) return null;

  let level: CmPhaseAlertLevel | null = null;
  if (unusedAreaMu >= 50 && builtRatio < 0.5) {
    level = 'serious';
  } else if (unusedAreaMu >= 20 && builtRatio > 1 / 3) {
    level = 'warning';
  } else if (meetsRatio && unusedAreaMu < 20) {
    level = 'hint';
  }
  if (!level) return null;

  const typeLabel = CM_ALERT_TYPE_LABEL['used-not-complete'];
  const levelLabel = CM_INDUSTRIAL_LEVEL_LABEL[level];
  const ratioPct = Math.round(builtRatio * 100);
  return {
    projectId: project.id,
    alertType: 'used-not-complete',
    level,
    unusedAreaMu: Math.round(unusedAreaMu * 100) / 100,
    builtRatio,
    suggestAction: SUGGEST_ACTION['used-not-complete'][level],
    referenceDate: constructDate,
    phaseKey: ALERT_TYPE_PHASE_KEY['used-not-complete'],
    message: `${typeLabel}已建 ${ratioPct}%、未开发 ${unusedAreaMu.toFixed(1)} 亩（${levelLabel}）`,
  };
}

function pickMostSevere(candidates: CmIndustrialLandAlert[]): CmIndustrialLandAlert | null {
  if (candidates.length === 0) return null;
  return candidates.reduce((best, cur) =>
    LEVEL_RANK[cur.level] > LEVEL_RANK[best.level] ? cur : best,
  );
}

export function getCmIndustrialLandAlert(project: ConstructionProject): CmIndustrialLandAlert | null {
  return pickMostSevere(
    [
      evalApprovedNotSupplied(project),
      evalSuppliedNotUsed(project),
      evalUsedNotComplete(project),
    ].filter((a): a is CmIndustrialLandAlert => a != null),
  );
}

export type CmProjectWithIndustrialLandAlert = {
  project: ConstructionProject;
  alert: CmIndustrialLandAlert;
};

export function listCmIndustrialLandAlerts(
  projects: ConstructionProject[],
): CmProjectWithIndustrialLandAlert[] {
  const out: CmProjectWithIndustrialLandAlert[] = [];
  for (const project of projects) {
    const alert = getCmIndustrialLandAlert(project);
    if (alert) out.push({ project, alert });
  }
  out.sort((a, b) => {
    const lr = LEVEL_RANK[b.alert.level] - LEVEL_RANK[a.alert.level];
    if (lr !== 0) return lr;
    const delayA = a.alert.delayDays ?? 0;
    const delayB = b.alert.delayDays ?? 0;
    if (delayB !== delayA) return delayB - delayA;
    return (b.alert.unusedAreaMu ?? 0) - (a.alert.unusedAreaMu ?? 0);
  });
  return out;
}

export function countCmIndustrialLandAlerts(projects: ConstructionProject[]): number {
  return listCmIndustrialLandAlerts(projects).length;
}

export function formatCmIndustrialLandAlertTimelineMessage(
  alert: Pick<CmIndustrialLandAlert, 'alertType' | 'delayDays' | 'unusedAreaMu' | 'builtRatio' | 'level'>,
): string {
  const levelLabel = CM_INDUSTRIAL_LEVEL_LABEL[alert.level];
  if (alert.alertType === 'used-not-complete') {
    const ratioPct = alert.builtRatio != null ? Math.round(alert.builtRatio * 100) : '—';
    return `已建 ${ratioPct}%、未开发 ${alert.unusedAreaMu?.toFixed(1) ?? '—'} 亩（${levelLabel}）`;
  }
  return `超期 ${alert.delayDays ?? 0} 天（${levelLabel}）`;
}

/** 项目卡展示：转为 CmPhaseAlert 形态复用 HzPhaseAlertLine */
export function industrialAlertToCardDisplay(
  alert: CmIndustrialLandAlert,
): import('./types').CmPhaseAlert {
  return {
    projectId: alert.projectId,
    phaseKey: alert.phaseKey,
    level: alert.level,
    enteredAt: alert.referenceDate,
    daysInPhase: alert.delayDays ?? 0,
    message: alert.message,
  };
}

/** 对齐综合态势报警等级色阶 */
export function getCmIndustrialLandAlertLevelTone(level: CmPhaseAlertLevel): 'l2' | 'l3' | 'l4' {
  if (level === 'serious') return 'l2';
  if (level === 'warning') return 'l3';
  return 'l4';
}
