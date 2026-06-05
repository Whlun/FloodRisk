/**
 * 预警工程画像 · 左侧看板统计（同源 cmProjectPhaseAlert）
 */
import { listCmProjectAlerts, type CmProjectWithPhaseAlert } from './cmProjectPhaseAlert';
import type { CmRegionKey } from './cmRegionFilter';
import { getPhaseMetric } from './mock/phaseDistribution';
import { getRegionAlertProjects } from './mock/regionAlertProjects';
import type { CmPhaseAlertLevel, PhaseKey } from './types';

export type CmAlertLevelStat = {
  level: CmPhaseAlertLevel;
  label: string;
  count: number;
};

export type CmAlertPhaseStat = {
  phaseKey: PhaseKey;
  label: string;
  count: number;
};

export type CmAlertDaysBucketStat = {
  key: string;
  label: string;
  count: number;
};

export type CmAlertRegionStats = {
  rows: CmProjectWithPhaseAlert[];
  totalCount: number;
  maxDaysInPhase: number;
  levelStats: CmAlertLevelStat[];
  phaseStats: CmAlertPhaseStat[];
  /** 停留天数区间（与预警阈值对齐，供左栏柱状图） */
  daysBuckets: CmAlertDaysBucketStat[];
};

const LEVEL_ORDER: CmPhaseAlertLevel[] = ['serious', 'warning', 'hint'];

const LEVEL_LABEL: Record<CmPhaseAlertLevel, string> = {
  serious: '长期滞留',
  warning: '阶段滞留',
  hint: '停留偏久',
};

const DAYS_BUCKETS: { key: string; label: string; match: (days: number) => boolean }[] = [
  { key: '60-89', label: '60–89天', match: d => d >= 60 && d < 90 },
  { key: '90-119', label: '90–119天', match: d => d >= 90 && d < 120 },
  { key: '120-364', label: '120–364天', match: d => d >= 120 && d < 365 },
  { key: '365+', label: '≥365天', match: d => d >= 365 },
];

function buildDaysBuckets(rows: CmProjectWithPhaseAlert[]): CmAlertDaysBucketStat[] {
  const counts = new Map(DAYS_BUCKETS.map(b => [b.key, 0]));
  for (const { alert } of rows) {
    const bucket = DAYS_BUCKETS.find(b => b.match(alert.daysInPhase));
    if (bucket) counts.set(bucket.key, (counts.get(bucket.key) ?? 0) + 1);
  }
  return DAYS_BUCKETS.map(b => ({
    key: b.key,
    label: b.label,
    count: counts.get(b.key) ?? 0,
  }));
}

export function buildCmAlertRegionStats(regionKey: CmRegionKey): CmAlertRegionStats {
  const projects = getRegionAlertProjects(regionKey);
  const rows = listCmProjectAlerts(projects);

  const levelCounts: Record<CmPhaseAlertLevel, number> = {
    serious: 0,
    warning: 0,
    hint: 0,
  };
  const phaseCounts = new Map<PhaseKey, number>();

  let maxDaysInPhase = 0;
  for (const { project, alert } of rows) {
    levelCounts[alert.level] += 1;
    phaseCounts.set(project.phaseKey, (phaseCounts.get(project.phaseKey) ?? 0) + 1);
    if (alert.daysInPhase > maxDaysInPhase) maxDaysInPhase = alert.daysInPhase;
  }

  const levelStats = LEVEL_ORDER.map(level => ({
    level,
    label: LEVEL_LABEL[level],
    count: levelCounts[level],
  }));

  const phaseStats = [...phaseCounts.entries()]
    .map(([phaseKey, count]) => ({
      phaseKey,
      label: getPhaseMetric(phaseKey).label,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    rows,
    totalCount: rows.length,
    maxDaysInPhase,
    levelStats,
    phaseStats,
    daysBuckets: buildDaysBuckets(rows),
  };
}
