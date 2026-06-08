/**
 * 预警总览 · 分类型等级柱图（每类型独立小图）
 */
import type { EChartsOption } from 'echarts';
import { withChartAnimation } from '../../../common/chartAnimation';
import {
  ALERT_LEVEL_ORDER,
  getAlertTypeLevelColors,
} from '../cmAlertTypeAccent';
import { CM_INDUSTRIAL_LEVEL_LABEL } from '../cmIndustrialLandAlert';
import type { CmAlertTypeStat } from '../cmAlertStats';
import type { CmAlertType, CmPhaseAlertLevel } from '../types';
import { HZ_CHART } from '../../huzhou-spatial-portrait/components/spatial/spatialChartTheme';

export { ALERT_LEVEL_ORDER };

const baseTooltip = {
  backgroundColor: HZ_CHART.tooltipBg,
  borderColor: HZ_CHART.tooltipBorder,
  borderWidth: 1,
  padding: [8, 12],
  textStyle: { color: HZ_CHART.text, fontSize: 12 },
  extraCssText: 'box-shadow: 0 4px 12px rgba(30, 91, 181, 0.12); border-radius: 6px;',
};

function segmentOpacity(
  alertType: CmAlertType,
  level: CmPhaseAlertLevel,
  selectedAlertType: CmAlertType | null,
  selectedLevel: CmPhaseAlertLevel | null,
): number {
  const hasFilter = selectedAlertType != null || selectedLevel != null;
  if (!hasFilter) return 1;
  const typeMatch = selectedAlertType == null || selectedAlertType === alertType;
  const levelMatch = selectedLevel == null || selectedLevel === level;
  if (typeMatch && levelMatch) return 1;
  if (selectedAlertType === alertType && selectedLevel == null) return 0.88;
  return 0.32;
}

export function resolveSharedTypeLevelYMax(typeStats: CmAlertTypeStat[]): number | undefined {
  const maxTotal = Math.max(...typeStats.map(t => t.count), 1);
  return maxTotal <= 4 ? 4 : undefined;
}

export function buildSingleTypeLevelBarOption(
  typeStat: CmAlertTypeStat,
  selectedAlertType: CmAlertType | null,
  selectedLevel: CmPhaseAlertLevel | null,
  yMax?: number,
): EChartsOption {
  const labels = ALERT_LEVEL_ORDER.map(l => CM_INDUSTRIAL_LEVEL_LABEL[l]);
  const values = ALERT_LEVEL_ORDER.map(l => typeStat.levelCounts[l]);
  const levelColors = getAlertTypeLevelColors(typeStat.alertType);

  return withChartAnimation({
    animation: false,
    grid: { left: 2, right: 4, top: 6, bottom: 2, containLabel: true },
    tooltip: {
      ...baseTooltip,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: params => {
        const row = Array.isArray(params) ? params[0] : params;
        if (!row) return '';
        return `${typeStat.label}<br/>${row.name}：${row.value} 个`;
      },
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: { fontSize: 10, color: HZ_CHART.textSecondary, interval: 0 },
      axisTick: { alignWithLabel: true, length: 2 },
      axisLine: { lineStyle: { color: '#e8ecf0' } },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      max: yMax,
      splitNumber: yMax != null && yMax <= 4 ? 2 : 3,
      axisLabel: { fontSize: 9, color: HZ_CHART.textMuted, margin: 4 },
      splitLine: { lineStyle: { type: 'dashed', color: HZ_CHART.splitLine } },
    },
    series: [
      {
        name: typeStat.label,
        type: 'bar',
        barMaxWidth: 28,
        data: values.map((value, index) => {
          const level = ALERT_LEVEL_ORDER[index]!;
          return {
            value,
            itemStyle: {
              color: levelColors[level],
              opacity: segmentOpacity(
                typeStat.alertType,
                level,
                selectedAlertType,
                selectedLevel,
              ),
              borderRadius: [3, 3, 0, 0],
            },
          };
        }),
      },
    ],
  });
}

export function resolveLevelFromMiniBarClick(dataIndex: number): CmPhaseAlertLevel | null {
  return ALERT_LEVEL_ORDER[dataIndex] ?? null;
}
