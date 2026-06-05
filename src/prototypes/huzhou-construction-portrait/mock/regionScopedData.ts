import { projectCurrentPhaseTimeInRange } from '../cmProjectPhaseTime';
import { HUZHOU_LANDUSE_GEOJSON } from '../../huzhou-spatial-portrait/huzhouMapConstants';
import {
  cmRegionToDistrictName,
  projectMatchesRegion,
  type CmRegionKey,
} from '../cmRegionFilter';
import type { PhaseKey, PhaseMetric } from '../types';
import { getPhaseCountPercent, PHASE_METRICS } from './phaseDistribution';
import { CONSTRUCTION_PROJECTS, CONSTRUCTION_PROJECT_SUMMARY } from './projects';
import type { ConstructionProject } from '../types';

const LANDUSE_FEATURES = HUZHOU_LANDUSE_GEOJSON.features;
const CITY_LANDUSE_TOTAL = LANDUSE_FEATURES.length;

function landuseInRegion(regionKey: CmRegionKey) {
  const district = cmRegionToDistrictName(regionKey);
  if (!district) return LANDUSE_FEATURES;
  return LANDUSE_FEATURES.filter(f => String(f.properties?.hzDistrictName ?? '') === district);
}

function cityPhaseFeatureCount(phaseKey: PhaseKey): number {
  return LANDUSE_FEATURES.filter(f => String(f.properties?.cmPhaseKey ?? '') === phaseKey).length;
}

function getRegionProjects(regionKey: CmRegionKey): ConstructionProject[] {
  return CONSTRUCTION_PROJECTS.filter(p => projectMatchesRegion(p.region, regionKey));
}

function getTimeScaleRatios(
  regionKey: CmRegionKey,
  dateFrom?: string,
  dateTo?: string,
): { globalRatio: number; phaseRatios: Record<PhaseKey, number> } {
  const all = getRegionProjects(regionKey);
  const phaseRatios = Object.fromEntries(
    PHASE_METRICS.map(m => [m.key, 1]),
  ) as Record<PhaseKey, number>;

  if (!dateFrom && !dateTo) {
    return { globalRatio: 1, phaseRatios };
  }

  const filtered = all.filter(p => projectCurrentPhaseTimeInRange(p, dateFrom, dateTo));
  const globalRatio = all.length > 0 ? filtered.length / all.length : 0;

  for (const m of PHASE_METRICS) {
    const phaseAll = all.filter(p => p.phaseKey === m.key);
    const phaseFiltered = phaseAll.filter(p =>
      projectCurrentPhaseTimeInRange(p, dateFrom, dateTo),
    );
    phaseRatios[m.key] = phaseAll.length > 0 ? phaseFiltered.length / phaseAll.length : 0;
  }

  return { globalRatio, phaseRatios };
}

/** 按区县缩放后的阶段分布指标 */
export function getPhaseMetricsForRegion(regionKey: CmRegionKey): PhaseMetric[] {
  if (regionKey === 'all') return PHASE_METRICS;

  const regionFeatures = landuseInRegion(regionKey);
  const regionTotal = regionFeatures.length;
  if (regionTotal <= 0) {
    return PHASE_METRICS.map(m => ({ ...m, count: 0, area: 0 }));
  }

  return PHASE_METRICS.map(m => {
    const phaseInRegion = regionFeatures.filter(
      f => String(f.properties?.cmPhaseKey ?? '') === m.key,
    ).length;
    const cityPhaseTotal = cityPhaseFeatureCount(m.key);
    const ratio = cityPhaseTotal > 0 ? phaseInRegion / cityPhaseTotal : 0;
    return {
      ...m,
      count: Math.max(phaseInRegion > 0 ? 1 : 0, Math.round(m.count * ratio)),
      area: m.area * ratio,
    };
  });
}

export function getPhaseCountPercentForRegion(regionKey: CmRegionKey): Record<string, number> {
  return getPhaseCountPercent(getPhaseMetricsForRegion(regionKey));
}

export function getSummaryForRegion(regionKey: CmRegionKey): {
  totalCount: number;
  totalAreaHa: number;
} {
  if (regionKey === 'all') return { ...CONSTRUCTION_PROJECT_SUMMARY };

  const regionFeatures = landuseInRegion(regionKey);
  const ratio = CITY_LANDUSE_TOTAL > 0 ? regionFeatures.length / CITY_LANDUSE_TOTAL : 0;
  return {
    totalCount: Math.max(1, Math.round(CONSTRUCTION_PROJECT_SUMMARY.totalCount * ratio)),
    totalAreaHa: CONSTRUCTION_PROJECT_SUMMARY.totalAreaHa * ratio,
  };
}

/** 按区县 + 当前阶段时间节点缩放后的汇总 */
export function getSummaryForRegionAndTime(
  regionKey: CmRegionKey,
  dateFrom?: string,
  dateTo?: string,
): { totalCount: number; totalAreaHa: number } {
  const base = getSummaryForRegion(regionKey);
  if (!dateFrom && !dateTo) return base;

  const { globalRatio } = getTimeScaleRatios(regionKey, dateFrom, dateTo);
  return {
    totalCount: Math.round(base.totalCount * globalRatio),
    totalAreaHa: base.totalAreaHa * globalRatio,
  };
}

/** 按区县 + 当前阶段时间节点缩放后的阶段分布指标 */
export function getPhaseMetricsForRegionAndTime(
  regionKey: CmRegionKey,
  dateFrom?: string,
  dateTo?: string,
): PhaseMetric[] {
  const base = getPhaseMetricsForRegion(regionKey);
  if (!dateFrom && !dateTo) return base;

  const { phaseRatios } = getTimeScaleRatios(regionKey, dateFrom, dateTo);
  return base.map(m => ({
    ...m,
    count: Math.round(m.count * phaseRatios[m.key]),
    area: m.area * phaseRatios[m.key],
  }));
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
