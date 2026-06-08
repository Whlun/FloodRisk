/**
 * 图表动效 · ECharts 全局动画配置（空数据 → 有数据 / 筛选切换）
 * - 柱图：先置 0 再合并真实数据，自轴基线生长
 * - 饼图：自 startAngle 顺时针旋转展开（expansion）
 */
import type { ECharts, EChartsOption, SeriesOption } from 'echarts';

export const HZ_CHART_ANIMATION = {
  animation: true,
  animationDuration: 900,
  animationDurationUpdate: 700,
  animationEasing: 'cubicOut' as const,
  animationEasingUpdate: 'cubicOut' as const,
};

const BAR_STAGGER_MS = 80;
const PIE_STAGGER_MS = 100;
const BAR_GROWTH_DURATION = 1200;

function normalizeSeries(series: EChartsOption['series']): SeriesOption[] {
  if (!series) return [];
  return Array.isArray(series) ? series : [series];
}

function zeroBarValue(dataItem: unknown): unknown {
  if (typeof dataItem === 'number') return 0;
  if (Array.isArray(dataItem)) {
    if (dataItem.length >= 2) return [dataItem[0], 0];
    return 0;
  }
  if (dataItem && typeof dataItem === 'object' && 'value' in dataItem) {
    const row = dataItem as { value?: unknown };
    const value = row.value;
    if (typeof value === 'number') return { ...row, value: 0 };
    if (Array.isArray(value) && value.length >= 2) return { ...row, value: [value[0], 0] };
    return { ...row, value: 0 };
  }
  return 0;
}

function zeroBarSeriesInOption(option: EChartsOption): EChartsOption {
  const series = normalizeSeries(option.series).map(item => {
    if (item.type !== 'bar' || !Array.isArray(item.data)) return item;
    return {
      ...item,
      data: item.data.map(zeroBarValue),
    };
  });
  return { ...option, animation: false, series };
}

function withBarSeriesAnimation(item: SeriesOption, seriesIndex: number): SeriesOption {
  const baseDelay = seriesIndex * 40;
  const delayFn = (dataIndex: number) => dataIndex * BAR_STAGGER_MS + baseDelay;

  return {
    ...item,
    animation: true,
    animationDuration: BAR_GROWTH_DURATION,
    animationEasing: 'cubicOut',
    animationDelay: delayFn,
    animationDurationUpdate: BAR_GROWTH_DURATION,
    animationEasingUpdate: 'cubicOut',
    animationDelayUpdate: delayFn,
  };
}

function withPieSeriesAnimation(item: SeriesOption, seriesIndex: number): SeriesOption {
  const baseDelay = seriesIndex * 120;
  const delayFn = (dataIndex: number) => dataIndex * PIE_STAGGER_MS + baseDelay;

  return {
    ...item,
    clockwise: item.clockwise ?? true,
    startAngle: item.startAngle ?? 90,
    animationType: 'expansion',
    animationTypeUpdate: 'expansion',
    animation: true,
    animationDuration: 1000,
    animationEasing: 'cubicInOut',
    animationDelay: delayFn,
    animationDurationUpdate: 900,
    animationEasingUpdate: 'cubicInOut',
    animationDelayUpdate: delayFn,
  };
}

function withLineSeriesAnimation(item: SeriesOption, seriesIndex: number): SeriesOption {
  const baseDelay = seriesIndex * 30;
  const delayFn = (dataIndex: number) => dataIndex * 40 + baseDelay;

  return {
    ...item,
    animation: true,
    animationDuration: 800,
    animationEasing: 'cubicOut',
    animationDelay: delayFn,
    animationDurationUpdate: 600,
    animationEasingUpdate: 'cubicOut',
    animationDelayUpdate: delayFn,
  };
}

function withSeriesAnimation(item: SeriesOption, seriesIndex: number): SeriesOption {
  const type = item.type ?? 'line';
  if (type === 'bar') return withBarSeriesAnimation(item, seriesIndex);
  if (type === 'pie') return withPieSeriesAnimation(item, seriesIndex);
  return withLineSeriesAnimation(item, seriesIndex);
}

/** 为 ECharts option 注入统一的入场 / 更新动画 */
export function withChartAnimation(option: EChartsOption): EChartsOption {
  const series = normalizeSeries(option.series);

  return {
    ...HZ_CHART_ANIMATION,
    ...option,
    series: series.map((item, index) => withSeriesAnimation(item, index)),
  };
}

function hasBarSeries(option: EChartsOption): boolean {
  return normalizeSeries(option.series).some(item => item.type === 'bar');
}

/**
 * 设置图表配置并播放动效。
 * 柱图：先以 0 值铺满，再合并真实数据触发基线生长；饼图/折线：直接入场动画。
 */
export function setChartOptionWithAnimation(chart: ECharts, option: EChartsOption): void {
  const animatedOption = withChartAnimation(option);

  if (!hasBarSeries(animatedOption)) {
    chart.setOption(animatedOption, { notMerge: true });
    return;
  }

  chart.setOption(zeroBarSeriesInOption(animatedOption), { notMerge: true });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (chart.isDisposed()) return;
      chart.setOption(animatedOption);
    });
  });
}

export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}
