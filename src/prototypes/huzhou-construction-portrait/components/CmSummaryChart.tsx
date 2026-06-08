/**
 * 建设工程画像 · 建设总览汇总统计图
 * - 全市：五区县 × 立项 / 供地 / 竣工对比
 * - 区县：立项 / 供地 / 竣工（个数 + 面积）
 * - 支持柱图 / 饼图切换
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Segmented } from 'antd';
import * as echarts from 'echarts';
import { setChartOptionWithAnimation } from '../../../common/chartAnimation';
import type { CmRegionKey } from '../cmRegionFilter';
import {
  getDistrictMilestoneComparisonForTime,
  type CmSummaryMetricGroup,
} from '../mock/regionScopedData';
import { CmCityMilestoneBarSummary } from './CmCityMilestoneBarSummary';
import { buildCityPieCells, CmCityMilestonePieGrid } from './CmCityMilestonePieGrid';
import {
  buildCmSummaryChartOption,
  createDefaultLegendSelection,
  getCmSummaryBarLegendItems,
  getCmSummaryCityBarLegendItems,
  getCmSummaryPieLegendItems,
  type CmSummaryChartInput,
  type CmSummaryChartVisual,
  type CmSummaryLegendItem,
  type CmSummaryLegendSelection,
} from './cmSummaryChartOptions';

export type CmSummaryChartProps = {
  regionKey: CmRegionKey;
  dateFrom?: string;
  dateTo?: string;
  initiation: CmSummaryMetricGroup;
  supply: CmSummaryMetricGroup;
  completion: CmSummaryMetricGroup;
};

const CHART_VISUAL_OPTIONS: { label: string; value: CmSummaryChartVisual }[] = [
  { label: '柱图', value: 'bar' },
  { label: '饼图', value: 'pie' },
];

type CmSummaryChartLegendProps = {
  items: CmSummaryLegendItem[];
  selection: CmSummaryLegendSelection;
  onToggle: (key: string) => void;
};

function CmSummaryChartLegend({ items, selection, onToggle }: CmSummaryChartLegendProps) {
  return (
    <div className="hz-cm-summary-chart__legend" role="list" aria-label="图表图例">
      {items.map(item => {
        const active = selection[item.key] !== false;
        return (
          <button
            key={item.key}
            type="button"
            role="listitem"
            className={`hz-cm-summary-chart__legend-item${
              active ? '' : ' hz-cm-summary-chart__legend-item--inactive'
            }`}
            aria-pressed={active}
            onClick={() => onToggle(item.key)}
          >
            <i
              className="hz-cm-summary-chart__legend-swatch"
              style={{ backgroundColor: active ? item.color : undefined }}
            />
            <span className="hz-cm-summary-chart__legend-label">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export const CmSummaryChart: React.FC<CmSummaryChartProps> = ({
  regionKey,
  dateFrom,
  dateTo,
  initiation,
  supply,
  completion,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartVisual, setChartVisual] = useState<CmSummaryChartVisual>('bar');
  const isCityView = regionKey === 'all';
  const useCityPieGrid = isCityView && chartVisual === 'pie';
  const useCityBarSummary = isCityView && chartVisual === 'bar';

  const chartInput = useMemo<CmSummaryChartInput>(() => {
    if (isCityView) {
      return {
        mode: 'district-milestone',
        items: getDistrictMilestoneComparisonForTime(dateFrom, dateTo),
        cityMilestone: { initiation, supply, completion },
      };
    }
    return {
      mode: 'milestone',
      items: [
        { key: 'initiation', label: '立项', metrics: initiation },
        { key: 'supply', label: '供地', metrics: supply },
        { key: 'completion', label: '竣工', metrics: completion },
      ],
    };
  }, [completion, dateFrom, dateTo, initiation, isCityView, supply]);

  const cityPieCells = useMemo(() => {
    if (chartInput.mode !== 'district-milestone') return [];
    return buildCityPieCells(chartInput.items, chartInput.cityMilestone);
  }, [chartInput]);

  const legendItems = useMemo(() => {
    if (chartInput.mode === 'district-milestone') {
      return getCmSummaryCityBarLegendItems();
    }
    return chartVisual === 'bar'
      ? getCmSummaryBarLegendItems()
      : getCmSummaryPieLegendItems(chartInput.items);
  }, [chartInput, chartVisual]);

  const legendKeySignature = legendItems.map(item => item.key).join('|');

  const [legendSelection, setLegendSelection] = useState<CmSummaryLegendSelection>(() =>
    createDefaultLegendSelection(legendItems),
  );

  useEffect(() => {
    setLegendSelection(prev => {
      const next: CmSummaryLegendSelection = {};
      for (const item of legendItems) {
        next[item.key] = prev[item.key] ?? true;
      }
      return next;
    });
  }, [legendKeySignature, legendItems]);

  const handleLegendToggle = useCallback(
    (key: string) => {
      setLegendSelection(prev => {
        const nextVisible = prev[key] === false;
        if (nextVisible) {
          return { ...prev, [key]: true };
        }
        const visibleCount = legendItems.filter(item => item.key !== key && prev[item.key] !== false)
          .length;
        if (visibleCount === 0) {
          return prev;
        }
        return { ...prev, [key]: false };
      });
    },
    [legendItems],
  );

  const ariaLabel = useMemo(() => {
    if (isCityView) {
      return chartVisual === 'pie'
        ? '全市及各区县立项、供地、竣工结构占比'
        : '各区县立项、供地、竣工的个数与面积对比';
    }
    return chartVisual === 'pie'
      ? '立项、供地、竣工的项目个数与面积占比'
      : '立项、供地、竣工的个数与面积';
  }, [chartVisual, isCityView]);

  useEffect(() => {
    if (useCityPieGrid) return;

    const el = chartRef.current;
    if (!el) return;

    const chart = echarts.init(el);
    const apply = (animate = true) => {
      const { clientWidth, clientHeight } = el;
      const option = buildCmSummaryChartOption(chartInput, chartVisual, {
        width: clientWidth,
        height: clientHeight,
      }, legendSelection);
      if (animate) {
        setChartOptionWithAnimation(chart, option);
        return;
      }
      chart.setOption({ ...option, animation: false }, { notMerge: true, lazyUpdate: true });
    };
    apply(true);

    const ro = new ResizeObserver(() => {
      chart.resize();
      if (chartVisual === 'pie') {
        apply(false);
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [chartInput, chartVisual, legendSelection, useCityPieGrid]);

  return (
    <div
      className={`hz-cm-summary-chart-wrap${
        chartVisual === 'pie' ? ' hz-cm-summary-chart-wrap--pie' : ''
      }${isCityView ? ' hz-cm-summary-chart-wrap--city' : ''}${
        !isCityView && chartVisual === 'pie' ? ' hz-cm-summary-chart-wrap--district-pie' : ''
      }${useCityBarSummary ? ' hz-cm-summary-chart-wrap--city-bar' : ''}`}
    >
      <div className="hz-cm-summary-chart__toolbar">
        <CmSummaryChartLegend
          items={legendItems}
          selection={legendSelection}
          onToggle={handleLegendToggle}
        />
        <Segmented<CmSummaryChartVisual>
          size="small"
          className="hz-cm-summary-chart__visual-tabs"
          options={CHART_VISUAL_OPTIONS}
          value={chartVisual}
          onChange={value => setChartVisual(value)}
        />
      </div>
      {useCityPieGrid ? (
        <CmCityMilestonePieGrid cells={cityPieCells} legendSelection={legendSelection} />
      ) : (
        <>
          {useCityBarSummary ? (
            <>
              <CmCityMilestoneBarSummary
                initiation={initiation}
                supply={supply}
                completion={completion}
                legendSelection={legendSelection}
              />
            </>
          ) : null}
          <div
            className="hz-cm-summary-chart"
            ref={chartRef}
            role="img"
            aria-label={`汇总统计图表：${ariaLabel}`}
          />
        </>
      )}
    </div>
  );
};
