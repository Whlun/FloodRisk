/**
 * 预警总览 · 全市单类型五区县个数与面积对比柱图
 */
import type { EChartsOption } from 'echarts';
import { withChartAnimation } from '../../../common/chartAnimation';
import { CM_ALERT_TYPE_CHART_META } from '../cmAlertTypeAccent';
import type { CmAlertDistrictTypeItem } from '../cmAlertStats';
import type { CmAlertType } from '../types';
import { HZ_CHART } from '../../huzhou-spatial-portrait/components/spatial/spatialChartTheme';

const baseTooltip = {
  backgroundColor: HZ_CHART.tooltipBg,
  borderColor: HZ_CHART.tooltipBorder,
  borderWidth: 1,
  padding: [8, 12],
  textStyle: { color: HZ_CHART.text, fontSize: 12 },
  extraCssText: 'box-shadow: 0 4px 12px rgba(30, 91, 181, 0.12); border-radius: 6px;',
  confine: true,
};

const BAR_GRID_TOP = 20;
export const ALERT_DISTRICT_COUNT_SERIES = '个数（个）';
export const ALERT_DISTRICT_AREA_SERIES = '面积（公顷）';
const COUNT_SERIES = ALERT_DISTRICT_COUNT_SERIES;
const AREA_SERIES = ALERT_DISTRICT_AREA_SERIES;

function formatCount(value: number): string {
  return value.toLocaleString('zh-CN');
}

function formatArea(value: number): string {
  return value.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}

export function buildAlertDistrictSingleTypeBarOption(
  items: CmAlertDistrictTypeItem[],
  activeType: CmAlertType,
): EChartsOption {
  const typeMeta = CM_ALERT_TYPE_CHART_META.find(item => item.key === activeType);
  const accent = typeMeta?.color ?? HZ_CHART.blue;
  const labels = items.map(item => item.label);
  const counts = items.map(item => item[activeType].count);
  const areas = items.map(item => item[activeType].areaHa);

  return withChartAnimation({
    grid: { left: 4, right: 4, top: BAR_GRID_TOP, bottom: 2, containLabel: true },
    legend: { show: false },
    tooltip: {
      ...baseTooltip,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: params => {
        const rows = Array.isArray(params) ? params : [params];
        if (rows.length === 0) return '';
        const title = String((rows[0] as { axisValue?: string | number }).axisValue ?? '');
        const lines = rows.map(row => {
          const isCount = row.seriesName === COUNT_SERIES;
          const value = Number(row.value ?? 0);
          return `${row.marker}${row.seriesName}：${isCount ? formatCount(value) : formatArea(value)}`;
        });
        return [title, ...lines].join('<br/>');
      },
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: {
        fontSize: 10,
        color: HZ_CHART.textSecondary,
        interval: 0,
        rotate: 28,
        margin: 6,
      },
      axisTick: { alignWithLabel: true },
      axisLine: { lineStyle: { color: '#e8e8e8' } },
    },
    yAxis: [
      {
        type: 'value',
        name: '个',
        nameLocation: 'end',
        nameGap: 4,
        minInterval: 1,
        nameTextStyle: { fontSize: 10, color: HZ_CHART.textMuted, align: 'right' },
        axisLabel: { fontSize: 10, color: HZ_CHART.textSecondary },
        splitLine: { lineStyle: { type: 'dashed', color: HZ_CHART.splitLine } },
      },
      {
        type: 'value',
        name: '公顷',
        nameLocation: 'end',
        nameGap: 4,
        nameTextStyle: { fontSize: 10, color: HZ_CHART.textMuted, align: 'left' },
        axisLabel: { fontSize: 10, color: HZ_CHART.textSecondary },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: COUNT_SERIES,
        type: 'bar',
        yAxisIndex: 0,
        data: counts,
        barMaxWidth: 14,
        itemStyle: { color: accent, borderRadius: [3, 3, 0, 0] },
        label: { show: false },
      },
      {
        name: AREA_SERIES,
        type: 'bar',
        yAxisIndex: 1,
        data: areas,
        barMaxWidth: 14,
        itemStyle: { color: accent, opacity: 0.55, borderRadius: [3, 3, 0, 0] },
        label: { show: false },
      },
    ],
  } as EChartsOption);
}
