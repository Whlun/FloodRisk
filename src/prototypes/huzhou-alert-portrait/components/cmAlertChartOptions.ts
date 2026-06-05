/**
 * 预警工程画像 · 左侧统计图（主题对齐空间利用画像 spatialChartTheme）
 */
import type { EChartsOption } from 'echarts';
import type { CmAlertDaysBucketStat, CmAlertLevelStat } from '../../huzhou-construction-portrait/cmAlertStats';
import type { CmPhaseAlertLevel } from '../../huzhou-construction-portrait/types';
import { HZ_CHART } from '../../huzhou-spatial-portrait/components/spatial/spatialChartTheme';

export const CM_ALERT_LEVEL_COLORS: Record<CmPhaseAlertLevel, string> = {
  serious: '#ff4d4f',
  warning: '#fa8c16',
  hint: '#faad14',
};

const DAYS_BUCKET_COLORS = ['#faad14', '#fa8c16', '#ff7875', '#ff4d4f'];

const baseTooltip = {
  backgroundColor: HZ_CHART.tooltipBg,
  borderColor: HZ_CHART.tooltipBorder,
  borderWidth: 1,
  padding: [8, 12],
  textStyle: { color: HZ_CHART.text, fontSize: 12 },
  extraCssText: 'box-shadow: 0 4px 12px rgba(30, 91, 181, 0.12); border-radius: 6px;',
};

function selectedOpacity(active: boolean, selected: boolean): number {
  if (!active) return 1;
  return selected ? 1 : 0.38;
}

export function buildAlertLevelPieOption(
  levelStats: CmAlertLevelStat[],
  totalCount: number,
  selectedLevel: CmPhaseAlertLevel | null,
): EChartsOption {
  const hasFilter = selectedLevel != null;
  const showCenter = totalCount > 0;
  return {
    tooltip: { ...baseTooltip, trigger: 'item', formatter: '{b}<br/>{c} 个 ({d}%)' },
    legend: {
      orient: 'vertical',
      right: 4,
      top: 'middle',
      selectedMode: false,
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 8,
      textStyle: { fontSize: 11, color: HZ_CHART.textSecondary },
    },
    series: [
      {
        type: 'pie',
        radius: ['44%', '66%'],
        center: ['34%', '50%'],
        avoidLabelOverlap: true,
        padAngle: 2,
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
        label: {
          show: showCenter,
          position: 'center',
          formatter: () => `{n|${totalCount}}\n{s|预警}`,
          rich: {
            n: {
              fontSize: 15,
              fontWeight: 700,
              color: HZ_CHART.primary,
              lineHeight: 18,
            },
            s: {
              fontSize: 10,
              color: HZ_CHART.textMuted,
              lineHeight: 14,
            },
          },
        },
        labelLine: { show: false },
        emphasis: { scale: true, scaleSize: 4, label: { show: showCenter } },
        data: levelStats.map(item => ({
          name: item.label,
          value: item.count,
          itemStyle: {
            color: CM_ALERT_LEVEL_COLORS[item.level],
            opacity: selectedOpacity(hasFilter, item.level === selectedLevel),
            borderWidth: item.level === selectedLevel ? 2 : 0,
            borderColor: '#1677ff',
          },
        })),
      },
    ],
  };
}

export function buildAlertDaysBarOption(daysBuckets: CmAlertDaysBucketStat[]): EChartsOption {
  const maxVal = Math.max(...daysBuckets.map(b => b.count), 1);
  return {
    grid: { left: 2, right: 6, top: 6, bottom: 4, containLabel: true },
    tooltip: { ...baseTooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: {
      type: 'category',
      data: daysBuckets.map(b => b.label),
      axisLabel: { fontSize: 9, color: HZ_CHART.textSecondary, interval: 0 },
      axisTick: { alignWithLabel: true, length: 3 },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      max: maxVal <= 4 ? 4 : undefined,
      splitNumber: maxVal <= 6 ? 3 : 4,
      axisLabel: { fontSize: 9, color: HZ_CHART.textSecondary, margin: 4 },
      splitLine: { lineStyle: { type: 'dashed', color: HZ_CHART.splitLine } },
    },
    series: [
      {
        type: 'bar',
        data: daysBuckets.map((b, i) => ({
          value: b.count,
          itemStyle: { color: DAYS_BUCKET_COLORS[i] ?? HZ_CHART.blue, borderRadius: [3, 3, 0, 0] },
        })),
        barMaxWidth: 28,
      },
    ],
  };
}
