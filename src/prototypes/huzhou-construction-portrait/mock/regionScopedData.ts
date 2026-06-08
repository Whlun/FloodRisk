import { projectCurrentPhaseTimeInRange } from '../cmProjectPhaseTime';
import {
  cmRegionToDistrictName,
  projectMatchesRegion,
  type CmRegionKey,
} from '../cmRegionFilter';
import type { PhaseKey, PhaseMetric } from '../types';
import { CONSTRUCTION_PROJECTS } from './projects';
import { getPhaseCountPercent, PHASE_METRICS } from './phaseDistribution';
import type { ConstructionProject } from '../types';

export type CmSummaryMetricGroup = {
  count: number;
  areaHa: number;
};

/** 汇总条里程碑：立项（批）/ 供地 / 竣工（验）对应阶段 */
const SUMMARY_MILESTONE_PHASE_KEYS = {
  initiation: ['pre-review', 'farmland'] as const satisfies readonly PhaseKey[],
  supply: ['land-supply'] as const satisfies readonly PhaseKey[],
  completion: ['land-review', 'plan-verify'] as const satisfies readonly PhaseKey[],
};

function sumPhaseMetrics(
  metrics: PhaseMetric[],
  keys: readonly PhaseKey[],
): CmSummaryMetricGroup {
  const keySet = new Set<PhaseKey>(keys);
  return metrics
    .filter(m => keySet.has(m.key))
    .reduce(
      (acc, m) => ({
        count: acc.count + m.count,
        areaHa: acc.areaHa + m.area / 10000,
      }),
      { count: 0, areaHa: 0 },
    );
}

export function getMilestoneStatsFromPhaseMetrics(metrics: PhaseMetric[]): {
  initiation: CmSummaryMetricGroup;
  supply: CmSummaryMetricGroup;
  completion: CmSummaryMetricGroup;
} {
  return {
    initiation: sumPhaseMetrics(metrics, SUMMARY_MILESTONE_PHASE_KEYS.initiation),
    supply: sumPhaseMetrics(metrics, SUMMARY_MILESTONE_PHASE_KEYS.supply),
    completion: sumPhaseMetrics(metrics, SUMMARY_MILESTONE_PHASE_KEYS.completion),
  };
}

function resolveProjectAreaSqm(project: ConstructionProject): number {
  const mu = project.totalAreaMu ?? project.landAreaMu ?? 0;
  return mu * 666.67;
}

function getRegionProjects(regionKey: CmRegionKey): ConstructionProject[] {
  return CONSTRUCTION_PROJECTS.filter(p => projectMatchesRegion(p.region, regionKey));
}

/** 与右栏列表同源：区县 + 当前阶段时间节点（不含关键词/收藏） */
function getFilteredRegionProjects(
  regionKey: CmRegionKey,
  dateFrom?: string,
  dateTo?: string,
): ConstructionProject[] {
  const rows = getRegionProjects(regionKey);
  if (!dateFrom && !dateTo) return rows;
  return rows.filter(p => projectCurrentPhaseTimeInRange(p, dateFrom, dateTo));
}

function buildPhaseMetricsFromProjects(projects: ConstructionProject[]): PhaseMetric[] {
  return PHASE_METRICS.map(m => {
    const phaseProjects = projects.filter(p => p.phaseKey === m.key);
    return {
      ...m,
      count: phaseProjects.length,
      area: phaseProjects.reduce((sum, p) => sum + resolveProjectAreaSqm(p), 0),
    };
  });
}

export function getPhaseMetricsForRegion(regionKey: CmRegionKey): PhaseMetric[] {
  return getPhaseMetricsForRegionAndTime(regionKey);
}

export function getPhaseCountPercentForRegion(regionKey: CmRegionKey): Record<string, number> {
  return getPhaseCountPercent(getPhaseMetricsForRegion(regionKey));
}

export function getSummaryForRegion(regionKey: CmRegionKey): {
  totalCount: number;
  totalAreaHa: number;
} {
  return getSummaryForRegionAndTime(regionKey);
}

/** 汇总条：演示项目台账按区县 + 阶段时间过滤后的真实条数/面积 */
export function getSummaryForRegionAndTime(
  regionKey: CmRegionKey,
  dateFrom?: string,
  dateTo?: string,
): { totalCount: number; totalAreaHa: number } {
  const projects = getFilteredRegionProjects(regionKey, dateFrom, dateTo);
  const totalAreaSqm = projects.reduce((sum, p) => sum + resolveProjectAreaSqm(p), 0);
  return {
    totalCount: projects.length,
    totalAreaHa: totalAreaSqm / 10000,
  };
}

/** 阶段分布：与右栏 `getProjectsByPhaseAndRegion` + 时间筛选同口径 */
export function getPhaseMetricsForRegionAndTime(
  regionKey: CmRegionKey,
  dateFrom?: string,
  dateTo?: string,
): PhaseMetric[] {
  const projects = getFilteredRegionProjects(regionKey, dateFrom, dateTo);
  return buildPhaseMetricsFromProjects(projects);
}

export function getPhaseCountPercentForRegionAndTime(
  regionKey: CmRegionKey,
  dateFrom?: string,
  dateTo?: string,
): Record<string, number> {
  return getPhaseCountPercent(
    getPhaseMetricsForRegionAndTime(regionKey, dateFrom, dateTo),
  );
}

export function getProjectsByPhaseAndRegion(
  phaseKey: PhaseKey | null,
  regionKey: CmRegionKey,
): ConstructionProject[] {
  const byPhase =
    phaseKey == null
      ? CONSTRUCTION_PROJECTS
      : CONSTRUCTION_PROJECTS.filter(p => p.phaseKey === phaseKey);
  return byPhase.filter(p => projectMatchesRegion(p.region, regionKey));
}

const DISTRICT_REGION_KEYS = [
  'wuxing',
  'nanxun',
  'changxing',
  'anji',
  'deqing',
] as const satisfies readonly Exclude<CmRegionKey, 'all'>[];

export type CmDistrictCompareItem = {
  key: CmRegionKey;
  label: string;
  metrics: CmSummaryMetricGroup;
};

export type CmDistrictMilestoneItem = {
  key: CmRegionKey;
  label: string;
  initiation: CmSummaryMetricGroup;
  supply: CmSummaryMetricGroup;
  completion: CmSummaryMetricGroup;
};

/** 全市视图 · 五区县项目个数与面积对比 */
export function getDistrictComparisonForTime(
  dateFrom?: string,
  dateTo?: string,
): CmDistrictCompareItem[] {
  return DISTRICT_REGION_KEYS.map(key => {
    const summary = getSummaryForRegionAndTime(key, dateFrom, dateTo);
    return {
      key,
      label: cmRegionToDistrictName(key) ?? key,
      metrics: {
        count: summary.totalCount,
        areaHa: summary.totalAreaHa,
      },
    };
  });
}

/** 全市视图 · 五区县 × 立项 / 供地 / 竣工 */
export function getDistrictMilestoneComparisonForTime(
  dateFrom?: string,
  dateTo?: string,
): CmDistrictMilestoneItem[] {
  return DISTRICT_REGION_KEYS.map(key => {
    const metrics = getPhaseMetricsForRegionAndTime(key, dateFrom, dateTo);
    const milestone = getMilestoneStatsFromPhaseMetrics(metrics);
    return {
      key,
      label: cmRegionToDistrictName(key) ?? key,
      initiation: milestone.initiation,
      supply: milestone.supply,
      completion: milestone.completion,
    };
  });
}
