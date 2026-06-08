/**
 * 建设工程画像 · 建设总览汇总图（柱图 / 饼图）
 */
import type { EChartsOption } from 'echarts';
import { withChartAnimation } from '../../../common/chartAnimation';
import { HZ_CHART } from '../../huzhou-spatial-portrait/components/spatial/spatialChartTheme';
import type {
  CmDistrictMilestoneItem,
  CmSummaryMetricGroup,
} from '../mock/regionScopedData';

export type CmSummaryChartItem = {
  key: string;
  label: string;
  metrics: CmSummaryMetricGroup;
};

export type CmSummaryChartVisual = 'bar' | 'pie';
export type CmSummaryChartSize = {
  width: number;
  height: number;
};

export type CmSummaryChartInput =
  | { mode: 'milestone'; items: CmSummaryChartItem[] }
  | {
      mode: 'district-milestone';
      items: CmDistrictMilestoneItem[];
      cityMilestone: {
        initiation: CmSummaryMetricGroup;
        supply: CmSummaryMetricGroup;
        completion: CmSummaryMetricGroup;
      };
    };

const PIE_SLICE_COLORS = [
  '#1677ff',
  '#1e5bb5',
  '#08cc91',
  '#fa8c16',
  '#91caff',
  '#69b1ff',
] as const;

export const CM_SUMMARY_MILESTONE_META = [
  { key: 'initiation' as const, label: '立项', color: '#1677ff' },
  { key: 'supply' as const, label: '供地', color: '#1e5bb5' },
  { key: 'completion' as const, label: '竣工', color: '#08cc91' },
] as const;

const MILESTONE_SERIES = CM_SUMMARY_MILESTONE_META;

const baseTooltip = {
  backgroundColor: HZ_CHART.tooltipBg,
  borderColor: HZ_CHART.tooltipBorder,
  borderWidth: 1,
  padding: [8, 12],
  textStyle: { color: HZ_CHART.text, fontSize: 12 },
  extraCssText: 'box-shadow: 0 4px 12px rgba(30, 91, 181, 0.12); border-radius: 6px;',
  confine: true,
};

/** 柱图 tooltip：靠绘图区上方展示，避免遮挡柱子 */
function barTooltipPosition(
  point: number[],
  _params: unknown,
  _dom: HTMLElement,
  rect: { x: number; y: number; width: number; height: number } | null,
  size: { contentSize: [number, number]; viewSize?: [number, number] },
): [number, number] {
  const pad = 8;
  const contentW = size?.contentSize?.[0] ?? 120;
  const viewW = rect?.width ?? size?.viewSize?.[0] ?? 280;
  const topY = (rect?.y ?? 0) + pad;
  const anchorX = point?.[0] ?? viewW / 2;

  let x = anchorX - contentW / 2;
  x = Math.max(pad, Math.min(x, viewW - contentW - pad));
  return [x, topY];
}

const axisNameStyle = {
  fontSize: 10,
  color: HZ_CHART.textMuted,
};

const BAR_GRID_TOP = 20;
const barCountYAxis = {
  type: 'value' as const,
  name: '个',
  nameLocation: 'end' as const,
  nameGap: 4,
  nameTextStyle: { ...axisNameStyle, align: 'right' as const, padding: [0, 0, 2, 0] },
  axisLabel: {
    fontSize: 10,
    color: HZ_CHART.textSecondary,
    formatter: (value: number) => (value >= 10000 ? `${value / 10000}万` : String(value)),
  },
  splitLine: { lineStyle: { type: 'dashed' as const, color: HZ_CHART.splitLine } },
};

const barAreaYAxis = {
  type: 'value' as const,
  name: '公顷',
  nameLocation: 'end' as const,
  nameGap: 4,
  nameTextStyle: { ...axisNameStyle, align: 'left' as const, padding: [0, 0, 2, 0] },
  axisLabel: {
    fontSize: 10,
    color: HZ_CHART.textSecondary,
    formatter: (value: number) =>
      value >= 10000 ? `${(value / 10000).toFixed(1)}万` : String(value),
  },
  splitLine: { show: false },
};

function formatCount(value: number): string {
  return value.toLocaleString('zh-CN');
}

function formatArea(value: number): string {
  return value.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}

const COUNT_SERIES = '个数（个）';
const AREA_SERIES = '面积（公顷）';

export type CmSummaryLegendItem = {
  key: string;
  label: string;
  color: string;
};

export function getCmSummaryBarLegendItems(): CmSummaryLegendItem[] {
  return [
    { key: 'count', label: COUNT_SERIES, color: HZ_CHART.blue },
    { key: 'area', label: AREA_SERIES, color: HZ_CHART.teal },
  ];
}

export function getCmSummaryCityBarLegendItems(): CmSummaryLegendItem[] {
  return CM_SUMMARY_MILESTONE_META.map(item => ({
    key: item.key,
    label: item.label,
    color: item.color,
  }));
}

export function getCmSummaryPieLegendItems(items: CmSummaryChartItem[]): CmSummaryLegendItem[] {
  return items.map((item, index) => ({
    key: item.key,
    label: item.label,
    color: PIE_SLICE_COLORS[index % PIE_SLICE_COLORS.length],
  }));
}

export type CmSummaryLegendSelection = Record<string, boolean>;

export function createDefaultLegendSelection(items: CmSummaryLegendItem[]): CmSummaryLegendSelection {
  return Object.fromEntries(items.map(item => [item.key, true]));
}

function isLegendVisible(selection: CmSummaryLegendSelection | undefined, key: string): boolean {
  return selection?.[key] !== false;
}

export function buildCmSummaryChartOption(
  input: CmSummaryChartInput,
  visual: CmSummaryChartVisual = 'bar',
  size?: CmSummaryChartSize,
  legendSelection?: CmSummaryLegendSelection,
): EChartsOption {
  if (visual === 'pie') {
    return withChartAnimation(buildCmSummaryPieChartOption(input.items, size, legendSelection));
  }
  return withChartAnimation(
    input.mode === 'district-milestone'
      ? buildCityDistrictMilestoneBarOption(input.items, legendSelection)
      : buildCmSummaryBarChartOption(input.items, legendSelection),
  );
}

function buildCmSummaryBarChartOption(
  items: CmSummaryChartItem[],
  legendSelection?: CmSummaryLegendSelection,
): EChartsOption {
  const labels = items.map(item => item.label);
  const counts = items.map(item => item.metrics.count);
  const areas = items.map(item => item.metrics.areaHa);

  return {
    grid: { left: 4, right: 4, top: BAR_GRID_TOP, bottom: 4, containLabel: true },
    legend: { show: false },
    tooltip: {
      ...baseTooltip,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      position: barTooltipPosition,
      formatter: params => {
        const rows = Array.isArray(params) ? params : [params];
        if (rows.length === 0) return '';
        const title = String(rows[0].axisValue ?? '');
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
        fontSize: 11,
        color: HZ_CHART.textSecondary,
        interval: 0,
      },
      axisTick: { alignWithLabel: true },
      axisLine: { lineStyle: { color: '#e8e8e8' } },
    },
    yAxis: [barCountYAxis, barAreaYAxis],
    series: [
      ...(isLegendVisible(legendSelection, 'count')
        ? [
            {
              name: COUNT_SERIES,
              type: 'bar' as const,
              yAxisIndex: 0,
              data: counts,
              barMaxWidth: 18,
              barGap: '30%',
              itemStyle: { color: HZ_CHART.blue, borderRadius: [3, 3, 0, 0] },
              label: {
                show: true,
                position: 'top' as const,
                fontSize: 10,
                color: HZ_CHART.blue,
                formatter: ({ value }: { value?: number }) => formatCount(Number(value ?? 0)),
              },
            },
          ]
        : []),
      ...(isLegendVisible(legendSelection, 'area')
        ? [
            {
              name: AREA_SERIES,
              type: 'bar' as const,
              yAxisIndex: 1,
              data: areas,
              barMaxWidth: 18,
              itemStyle: { color: HZ_CHART.teal, borderRadius: [3, 3, 0, 0] },
              label: {
                show: true,
                position: 'top' as const,
                fontSize: 10,
                color: HZ_CHART.teal,
                formatter: ({ value }: { value?: number }) => formatArea(Number(value ?? 0)),
              },
            },
          ]
        : []),
    ],
  };
}

function buildCityDistrictMilestoneBarOption(
  items: CmDistrictMilestoneItem[],
  legendSelection?: CmSummaryLegendSelection,
): EChartsOption {
  const labels = items.map(item => item.label);
  const visibleMilestones = MILESTONE_SERIES.filter(m =>
    isLegendVisible(legendSelection, m.key),
  );

  const countSeries = visibleMilestones.map(milestone => ({
    name: `${milestone.label}（个）`,
    type: 'bar' as const,
    yAxisIndex: 0,
    data: items.map(item => item[milestone.key].count),
    barMaxWidth: 8,
    itemStyle: { color: milestone.color, borderRadius: [2, 2, 0, 0] },
    label: { show: false },
  }));

  const areaSeries = visibleMilestones.map(milestone => ({
    name: `${milestone.label}（公顷）`,
    type: 'bar' as const,
    yAxisIndex: 1,
    data: items.map(item => item[milestone.key].areaHa),
    barMaxWidth: 8,
    itemStyle: { color: milestone.color, opacity: 0.55, borderRadius: [2, 2, 0, 0] },
    label: { show: false },
  }));

  return {
    grid: { left: 4, right: 4, top: BAR_GRID_TOP, bottom: 2, containLabel: true },
    legend: { show: false },
    tooltip: {
      ...baseTooltip,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      position: barTooltipPosition,
      formatter: params => {
        const rows = Array.isArray(params) ? params : [params];
        if (rows.length === 0) return '';
        const title = String(rows[0].axisValue ?? '');
        const lines = rows.map(row => {
          const value = Number(row.value ?? 0);
          const isCount = String(row.seriesName ?? '').endsWith('（个）');
          const formatted = isCount ? formatCount(value) : formatArea(value);
          return `${row.marker}${row.seriesName}：${formatted}`;
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
    yAxis: [barCountYAxis, barAreaYAxis],
    series: [...countSeries, ...areaSeries],
  };
}

/** 区县双环饼图：紧凑尺寸，避免占满左栏汇总区 */
function resolvePieRadius(size?: CmSummaryChartSize): [number, number] {
  const width = Math.max(size?.width ?? 280, 200);
  const height = Math.max(size?.height ?? 140, 100);
  const slotWidth = width * 0.44;
  const maxByHeight = height * 0.34;
  const maxByWidth = slotWidth * 0.72;
  const outer = Math.round(Math.max(28, Math.min(maxByHeight, maxByWidth, 76)));
  const inner = Math.round(outer * (height < 120 ? 0.78 : 0.76));
  return [Math.min(inner, outer - 6), outer];
}

function resolvePiePadAngle(size?: CmSummaryChartSize): number {
  const height = size?.height ?? 140;
  return height < 120 ? 1 : height < 160 ? 1.5 : 2;
}

function resolvePieCenterRich(size: CmSummaryChartSize | undefined, isCount: boolean) {
  const scale = Math.max(0.82, Math.min(1.12, (size?.height ?? 140) / 150));
  const round = (n: number) => Math.max(9, Math.round(n * scale));
  return {
    t: {
      fontSize: round(11),
      color: HZ_CHART.textMuted,
      lineHeight: round(15),
    },
    n: {
      fontSize: round(13),
      fontWeight: 700,
      color: isCount ? HZ_CHART.blue : HZ_CHART.teal,
      lineHeight: round(17),
    },
    s: {
      fontSize: round(10),
      color: HZ_CHART.textMuted,
      lineHeight: round(13),
    },
  };
}

function buildCmSummaryPieChartOption(
  items: CmSummaryChartItem[],
  size?: CmSummaryChartSize,
  legendSelection?: CmSummaryLegendSelection,
): EChartsOption {
  const visibleItems = items.filter(item => isLegendVisible(legendSelection, item.key));
  const countTotal = visibleItems.reduce((sum, item) => sum + item.metrics.count, 0);
  const areaTotal = visibleItems.reduce((sum, item) => sum + item.metrics.areaHa, 0);
  const showCountCenter = countTotal > 0;
  const showAreaCenter = areaTotal > 0;
  const pieRadius = resolvePieRadius(size);
  const piePadAngle = resolvePiePadAngle(size);

  const pieData = (metric: 'count' | 'area') =>
    visibleItems.map((item, index) => ({
      name: item.label,
      value: metric === 'count' ? item.metrics.count : item.metrics.areaHa,
      itemStyle: { color: PIE_SLICE_COLORS[items.indexOf(item) % PIE_SLICE_COLORS.length] },
    }));

  const pieSeries = (
    metric: 'count' | 'area',
    centerX: string,
    seriesName: string,
    total: number,
    showCenter: boolean,
  ) => {
    const isCount = metric === 'count';
    const centerValue = isCount ? formatCount(total) : formatArea(total);
    const centerUnit = isCount ? '个' : '公顷';
    const title = isCount ? '个数' : '面积';

    return {
      name: seriesName,
      type: 'pie' as const,
      radius: pieRadius,
      center: [centerX, '50%'],
      avoidLabelOverlap: true,
      padAngle: piePadAngle,
      itemStyle: {
        borderRadius: Math.max(2, Math.round(pieRadius[1] * 0.06)),
        borderColor: '#fff',
        borderWidth: 2,
      },
      label: {
        show: showCenter,
        position: 'center' as const,
        formatter: () => `{t|${title}}\n{n|${centerValue}}\n{s|${centerUnit}}`,
        rich: resolvePieCenterRich(size, isCount),
      },
      labelLine: { show: false },
      emphasis: { scale: true, scaleSize: 3, label: { show: showCenter } },
      data: pieData(metric),
    };
  };

  return {
    tooltip: {
      ...baseTooltip,
      trigger: 'item',
      formatter: params => {
        const row = Array.isArray(params) ? params[0] : params;
        if (!row) return '';
        const isCount = row.seriesName === COUNT_SERIES;
        const value = Number(row.value ?? 0);
        const formatted = isCount ? formatCount(value) : formatArea(value);
        return `${row.name}<br/>${row.seriesName}：${formatted} (${row.percent ?? 0}%)`;
      },
    },
    legend: { show: false },
    series: [
      pieSeries('count', '25%', COUNT_SERIES, countTotal, showCountCenter),
      pieSeries('area', '75%', AREA_SERIES, areaTotal, showAreaCenter),
    ],
  };
}
