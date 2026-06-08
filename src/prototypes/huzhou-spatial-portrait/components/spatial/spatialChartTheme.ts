/**
 * 空间利用画像 · 看板图表主题（对齐 zonghe-taishi 白底蓝系）
 */
import type { EChartsOption } from 'echarts';
import { withChartAnimation } from '../../../../common/chartAnimation';

export const HZ_CHART = {
  primary: '#1e5bb5',
  blue: '#1677ff',
  blueLight: '#69b1ff',
  bluePale: '#91caff',
  teal: '#08cc91',
  orange: '#fa8c16',
  text: '#333333',
  textSecondary: '#666666',
  textMuted: '#8c8c8c',
  splitLine: '#eef1f5',
  tooltipBg: 'rgba(255,255,255,0.96)',
  tooltipBorder: '#d6e8ff',
} as const;

export const AVAILABLE_DONUT_COLORS = ['#1677ff', '#1e5bb5', '#08cc91'] as const;
export const PUBLIC_DONUT_COLORS = ['#1677ff', '#08cc91', '#fa8c16', '#91caff'] as const;
export const RESIDENTIAL_BAR_GRADIENT = {
  type: 'linear' as const,
  x: 0,
  y: 0,
  x2: 1,
  y2: 0,
  colorStops: [
    { offset: 0, color: '#1e5bb5' },
    { offset: 1, color: '#69b1ff' },
  ],
};

export const INDUSTRIAL_ROW_COLORS = ['#1e5bb5', '#1677ff', '#69b1ff'] as const;

const baseTooltip = {
  backgroundColor: HZ_CHART.tooltipBg,
  borderColor: HZ_CHART.tooltipBorder,
  borderWidth: 1,
  padding: [8, 12],
  textStyle: { color: HZ_CHART.text, fontSize: 12 },
  extraCssText: 'box-shadow: 0 4px 12px rgba(30, 91, 181, 0.12); border-radius: 6px;',
};

export function buildAvailableDonutOption(
  rows: { name: string; value: number }[],
  total: number,
): EChartsOption {
  return withChartAnimation({
    tooltip: { ...baseTooltip, trigger: 'item', formatter: '{b}<br/>{c} 公顷 ({d}%)' },
    legend: {
      orient: 'vertical',
      right: 0,
      top: 'middle',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 10,
      textStyle: { fontSize: 11, color: HZ_CHART.textSecondary },
    },
    series: [
      {
        type: 'pie',
        radius: ['46%', '68%'],
        center: ['36%', '50%'],
        avoidLabelOverlap: true,
        padAngle: 2,
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        labelLine: { show: false },
        emphasis: { scale: true, scaleSize: 4 },
        data: rows.map((d, i) => ({
          name: d.name,
          value: d.value,
          itemStyle: { color: AVAILABLE_DONUT_COLORS[i % AVAILABLE_DONUT_COLORS.length] },
        })),
      },
    ],
    graphic: [
      {
        type: 'text',
        left: '28%',
        top: '40%',
        style: {
          text: '总面积',
          textAlign: 'center',
          fill: HZ_CHART.textSecondary,
          fontSize: 11,
          fontWeight: 500,
        },
      },
      {
        type: 'text',
        left: '28%',
        top: '50%',
        style: {
          text: total.toFixed(2),
          textAlign: 'center',
          fill: HZ_CHART.primary,
          fontSize: 15,
          fontWeight: 700,
        },
      },
      {
        type: 'text',
        left: '28%',
        top: '60%',
        style: {
          text: '公顷',
          textAlign: 'center',
          fill: HZ_CHART.textMuted,
          fontSize: 10,
        },
      },
    ],
  });
}

export function buildResidentialBarOption(rows: { name: string; value: number }[]): EChartsOption {
  return withChartAnimation({
    grid: { left: 4, right: 16, top: 8, bottom: 4, containLabel: true },
    tooltip: { ...baseTooltip, trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: '{b}<br/>{c} 公顷' },
    xAxis: {
      type: 'value',
      axisLabel: { fontSize: 10, color: HZ_CHART.textSecondary },
      splitLine: { lineStyle: { type: 'dashed', color: HZ_CHART.splitLine } },
    },
    yAxis: {
      type: 'category',
      data: rows.map(r => r.name),
      axisLabel: { fontSize: 10, color: HZ_CHART.textSecondary },
      axisTick: { show: false },
      axisLine: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: rows.map(r => r.value),
        itemStyle: {
          color: RESIDENTIAL_BAR_GRADIENT,
          borderRadius: [0, 4, 4, 0],
        },
        barMaxWidth: 10,
        showBackground: true,
        backgroundStyle: { color: '#f0f4f8', borderRadius: [0, 4, 4, 0] },
      },
    ],
  });
}

export function buildPublicDonutOption(
  rows: { name: string; value: number }[],
  total: number,
): EChartsOption {
  return withChartAnimation({
    tooltip: { ...baseTooltip, trigger: 'item', formatter: '{b}<br/>{c} 公顷 ({d}%)' },
    legend: {
      bottom: 0,
      left: 'center',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 12,
      textStyle: { fontSize: 10, color: HZ_CHART.textSecondary },
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '58%'],
        center: ['50%', '40%'],
        avoidLabelOverlap: true,
        padAngle: 2,
        itemStyle: { borderRadius: 3, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        labelLine: { show: false },
        emphasis: { scale: true, scaleSize: 4 },
        data: rows.map((d, i) => ({
          name: d.name,
          value: d.value,
          itemStyle: { color: PUBLIC_DONUT_COLORS[i % PUBLIC_DONUT_COLORS.length] },
        })),
      },
    ],
    graphic: [
      {
        type: 'text',
        left: 'center',
        top: '32%',
        style: {
          text: '总面积',
          textAlign: 'center',
          fill: HZ_CHART.textSecondary,
          fontSize: 10,
          fontWeight: 500,
        },
      },
      {
        type: 'text',
        left: 'center',
        top: '40%',
        style: {
          text: total.toFixed(2),
          textAlign: 'center',
          fill: HZ_CHART.primary,
          fontSize: 14,
          fontWeight: 700,
        },
      },
      {
        type: 'text',
        left: 'center',
        top: '48%',
        style: {
          text: '公顷',
          textAlign: 'center',
          fill: HZ_CHART.textMuted,
          fontSize: 9,
        },
      },
    ],
  });
}
