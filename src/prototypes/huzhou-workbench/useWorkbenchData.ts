/**
 * 工作台 · 聚合空间利用 / 建管 / 预警演示数据（随壳层区县联动）
 */
import { useMemo } from 'react';
import type { HzRegionKey } from '../huzhou-lifecycle-shared/hzRegionScope';
import { buildCmAlertRegionStats } from '../huzhou-construction-portrait/cmAlertStats';
import { listCmIndustrialLandAlerts } from '../huzhou-construction-portrait/cmIndustrialLandAlert';
import {
  getPhaseMetricsForRegion,
  getProjectsByPhaseAndRegion,
  getSummaryForRegion,
} from '../huzhou-construction-portrait/mock/regionScopedData';
import { getRegionAlertProjects } from '../huzhou-construction-portrait/mock/regionAlertProjects';
import { getSpatialStatsForRegion } from '../huzhou-spatial-portrait/mock/regionScopedSpatialStats';

export function useWorkbenchData(regionKey: HzRegionKey) {
  return useMemo(() => {
    const spatial = getSpatialStatsForRegion(regionKey);
    const construction = getSummaryForRegion(regionKey);
    const alertStats = buildCmAlertRegionStats(regionKey);
    const phaseMetrics = getPhaseMetricsForRegion(regionKey)
      .slice()
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    const alertRows = listCmIndustrialLandAlerts(getRegionAlertProjects(regionKey)).slice(0, 5);
    const recentProjects = getProjectsByPhaseAndRegion(null, regionKey).slice(0, 5);
    return {
      kpis: {
        availableTotal: spatial.availableTotal,
        inefficientArea: spatial.inefficientLand.area,
        projectCount: construction.totalCount,
        projectAreaHa: construction.totalAreaHa,
        alertCount: alertStats.totalCount,
        maxDelayDays: alertStats.maxDelayDays,
      },
      supplyTrendYears: spatial.supplyTrendYears,
      supplyTrendValues: spatial.supplyTrendValues,
      phaseMetrics,
      alertRows,
      recentProjects,
    };
  }, [regionKey]);
}
