/**
 * 预警工程画像 · 左侧看板统计（前三未预警）
 */
import {
  listCmIndustrialLandAlerts,
  CM_ALERT_TYPE_LABEL,
  CM_INDUSTRIAL_LEVEL_LABEL,
  type CmProjectWithIndustrialLandAlert,
} from './cmIndustrialLandAlert';
import { cmRegionToDistrictName, type CmRegionKey } from './cmRegionFilter';
import { getRegionAlertProjects } from './mock/regionAlertProjects';
import type { CmAlertType, CmPhaseAlertLevel } from './types';

export type CmAlertLevelCounts = Record<CmPhaseAlertLevel, number>;

export type CmAlertLevelStat = {
  level: CmPhaseAlertLevel;
  label: string;
  count: number;
};

export type CmAlertTypeStat = {
  alertType: CmAlertType;
  label: string;
  count: number;
  /** 总用地面积（公顷，与阶段分布卡片口径一致） */
  areaHa: number;
  sharePct: number;
  levelCounts: CmAlertLevelCounts;
  avgDelayDays?: number;
  maxDelayDays?: number;
  avgUnusedAreaMu?: number;
  avgBuiltRatio?: number;
};

function resolveProjectAreaMu(project: CmProjectWithIndustrialLandAlert['project']): number {
  return project.totalAreaMu ?? project.landAreaMu ?? 0;
}

function muToAreaHa(mu: number): number {
  return (mu * 666.67) / 10000;
}

export type CmAlertDaysBucketStat = {
  key: string;
  label: string;
  count: number;
};

export type CmAlertTypeMetricGroup = {
  count: number;
  areaHa: number;
};

export type CmAlertDistrictTypeItem = {
  key: Exclude<CmRegionKey, 'all'>;
  label: string;
  'approved-not-supplied': CmAlertTypeMetricGroup;
  'supplied-not-used': CmAlertTypeMetricGroup;
  'used-not-complete': CmAlertTypeMetricGroup;
};

const DISTRICT_REGION_KEYS = [
  'wuxing',
  'nanxun',
  'changxing',
  'anji',
  'deqing',
] as const satisfies readonly Exclude<CmRegionKey, 'all'>[];

export type CmAlertRegionStats = {
  rows: CmProjectWithIndustrialLandAlert[];
  totalCount: number;
  /** 预警项目总用地面积（公顷，与阶段分布卡片口径一致） */
  totalAreaHa: number;
  seriousCount: number;
  maxDelayDays: number;
  levelStats: CmAlertLevelStat[];
  typeStats: CmAlertTypeStat[];
  /** 超期天数区间（工作台等备用，左栏 UI 不再使用） */
  daysBuckets: CmAlertDaysBucketStat[];
};

const LEVEL_ORDER: CmPhaseAlertLevel[] = ['serious', 'warning', 'hint'];

const TYPE_ORDER: CmAlertType[] = [
  'approved-not-supplied',
  'supplied-not-used',
  'used-not-complete',
];

const DAYS_BUCKETS: { key: string; label: string; match: (days: number) => boolean }[] = [
  { key: '30-89', label: '30–89天', match: d => d >= 30 && d < 90 },
  { key: '90-179', label: '90–179天', match: d => d >= 90 && d < 180 },
  { key: '180-364', label: '180–364天', match: d => d >= 180 && d < 365 },
  { key: '365+', label: '≥365天', match: d => d >= 365 },
];

function emptyLevelCounts(): CmAlertLevelCounts {
  return { serious: 0, warning: 0, hint: 0 };
}

/** 与建管阶段卡片 `getPhaseCountPercent` 同规则 */
function buildAlertTypeSharePercents(typeCounts: number[], totalCount: number): number[] {
  if (totalCount <= 0) return typeCounts.map(() => 0);
  let allocated = 0;
  return typeCounts.map((count, index) => {
    if (index === typeCounts.length - 1) {
      return Math.max(0, 100 - allocated);
    }
    const pct = Math.round((count / totalCount) * 100);
    allocated += pct;
    return pct;
  });
}

function buildDaysBuckets(rows: CmProjectWithIndustrialLandAlert[]): CmAlertDaysBucketStat[] {
  const counts = new Map(DAYS_BUCKETS.map(b => [b.key, 0]));
  for (const { alert } of rows) {
    const days = alert.delayDays;
    if (days == null) continue;
    const bucket = DAYS_BUCKETS.find(b => b.match(days));
    if (bucket) counts.set(bucket.key, (counts.get(bucket.key) ?? 0) + 1);
  }
  return DAYS_BUCKETS.map(b => ({
    key: b.key,
    label: b.label,
    count: counts.get(b.key) ?? 0,
  }));
}

function buildTypeStats(
  rows: CmProjectWithIndustrialLandAlert[],
  totalCount: number,
): CmAlertTypeStat[] {
  const byType = new Map<
    CmAlertType,
    {
      levelCounts: CmAlertLevelCounts;
      areaMu: number;
      delayDays: number[];
      unusedAreaMu: number[];
      builtRatios: number[];
    }
  >();

  for (const type of TYPE_ORDER) {
    byType.set(type, {
      levelCounts: emptyLevelCounts(),
      areaMu: 0,
      delayDays: [],
      unusedAreaMu: [],
      builtRatios: [],
    });
  }

  for (const { project, alert } of rows) {
    const bucket = byType.get(alert.alertType)!;
    bucket.levelCounts[alert.level] += 1;
    bucket.areaMu += resolveProjectAreaMu(project);
    if (alert.delayDays != null) bucket.delayDays.push(alert.delayDays);
    if (alert.unusedAreaMu != null) bucket.unusedAreaMu.push(alert.unusedAreaMu);
    if (alert.builtRatio != null) bucket.builtRatios.push(alert.builtRatio);
  }

  const typeCounts = TYPE_ORDER.map(alertType => {
    const bucket = byType.get(alertType)!;
    return bucket.levelCounts.hint + bucket.levelCounts.warning + bucket.levelCounts.serious;
  });
  const sharePercents = buildAlertTypeSharePercents(typeCounts, totalCount);

  return TYPE_ORDER.map((alertType, index): CmAlertTypeStat => {
    const bucket = byType.get(alertType)!;
    const count = typeCounts[index] ?? 0;
    const sharePct = sharePercents[index] ?? 0;

    const stat: CmAlertTypeStat = {
      alertType,
      label: CM_ALERT_TYPE_LABEL[alertType],
      count,
      areaHa: muToAreaHa(bucket.areaMu),
      sharePct,
      levelCounts: bucket.levelCounts,
    };

    if (alertType !== 'used-not-complete' && bucket.delayDays.length > 0) {
      const sum = bucket.delayDays.reduce((a, b) => a + b, 0);
      stat.avgDelayDays = Math.round(sum / bucket.delayDays.length);
      stat.maxDelayDays = Math.max(...bucket.delayDays);
    }

    if (alertType === 'used-not-complete') {
      if (bucket.unusedAreaMu.length > 0) {
        const sum = bucket.unusedAreaMu.reduce((a, b) => a + b, 0);
        stat.avgUnusedAreaMu = Math.round((sum / bucket.unusedAreaMu.length) * 10) / 10;
      }
      if (bucket.builtRatios.length > 0) {
        const sum = bucket.builtRatios.reduce((a, b) => a + b, 0);
        stat.avgBuiltRatio = Math.round((sum / bucket.builtRatios.length) * 1000) / 1000;
      }
    }

    return stat;
  });
}

function typeStatToMetric(stat: CmAlertTypeStat): CmAlertTypeMetricGroup {
  return { count: stat.count, areaHa: stat.areaHa };
}

/** 全市视图 · 五区县 × 前三未类型个数与面积对比 */
export function getDistrictAlertTypeComparison(): CmAlertDistrictTypeItem[] {
  return DISTRICT_REGION_KEYS.map(key => {
    const stats = buildCmAlertRegionStats(key);
    const byType = new Map(stats.typeStats.map(item => [item.alertType, typeStatToMetric(item)]));
    const empty: CmAlertTypeMetricGroup = { count: 0, areaHa: 0 };
    return {
      key,
      label: cmRegionToDistrictName(key) ?? key,
      'approved-not-supplied':
        byType.get('approved-not-supplied') ?? empty,
      'supplied-not-used': byType.get('supplied-not-used') ?? empty,
      'used-not-complete': byType.get('used-not-complete') ?? empty,
    };
  });
}

export function buildCmAlertRegionStats(regionKey: CmRegionKey): CmAlertRegionStats {
  const projects = getRegionAlertProjects(regionKey);
  const rows = listCmIndustrialLandAlerts(projects);

  const levelCounts: CmAlertLevelCounts = emptyLevelCounts();

  let maxDelayDays = 0;
  for (const { alert } of rows) {
    levelCounts[alert.level] += 1;
    if (alert.delayDays != null && alert.delayDays > maxDelayDays) {
      maxDelayDays = alert.delayDays;
    }
  }

  const levelStats = LEVEL_ORDER.map(level => ({
    level,
    label: CM_INDUSTRIAL_LEVEL_LABEL[level],
    count: levelCounts[level],
  }));

  const totalCount = rows.length;
  const totalAreaMu = rows.reduce(
    (sum, { project }) => sum + resolveProjectAreaMu(project),
    0,
  );

  return {
    rows,
    totalCount,
    totalAreaHa: muToAreaHa(totalAreaMu),
    seriousCount: levelCounts.serious,
    maxDelayDays,
    levelStats,
    typeStats: buildTypeStats(rows, totalCount), // 固定 3 类，含 0 计数
    daysBuckets: buildDaysBuckets(rows),
  };
}
