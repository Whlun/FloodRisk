/**
 * 空间利用画像 · 左侧看板
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Segmented, Typography } from 'antd';
import type { EChartsOption } from 'echarts';
import * as echarts from 'echarts';
import type { HzRegionKey } from '../../../huzhou-lifecycle-shared/hzRegionScope';
import type { HuzhouSpaceMode } from '../../huzhouMapConstants';
import { getSpatialStatsForRegion } from '../../mock/regionScopedSpatialStats';
import { LEFT_PANEL_TITLE } from '../../mock/spatialStats';

const { Text, Title } = Typography;

type SupplyDistTab = 'usage' | 'spatial' | 'struct';

const SUPPLY_DIST_TABS: { label: string; value: SupplyDistTab }[] = [
  { label: '用途分布', value: 'usage' },
  { label: '空间分布', value: 'spatial' },
  { label: '结构分布', value: 'struct' },
];

/** 供地分布柱状图（用途 / 空间） */
function buildSupplyBarOption(
  rows: { name: string; value: number }[],
): EChartsOption {
  return {
    grid: { left: 8, right: 8, top: 12, bottom: 36 },
    tooltip: { trigger: 'axis', formatter: '{b}: {c}' },
    xAxis: {
      type: 'category',
      data: rows.map(r => r.name),
      axisLabel: { fontSize: 9, color: '#666', interval: 0 },
    },
    yAxis: {
      type: 'value',
      max: 1,
      splitNumber: 2,
      axisLabel: { fontSize: 9, color: '#666' },
      splitLine: { lineStyle: { color: '#eee' } },
    },
    series: [
      {
        type: 'bar',
        data: rows.map(r => r.value),
        itemStyle: { color: '#02a7f0' },
        barMaxWidth: 22,
      },
    ],
  };
}

/** 供地分布 · 结构分布饼图 */
function buildSupplyStructPieOption(
  pie: { name: string; value: number; color: string }[],
  total: number,
): EChartsOption {
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: {
      orient: 'vertical',
      right: 0,
      top: 'middle',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { fontSize: 11, color: '#555' },
    },
    series: [
      {
        type: 'pie',
        radius: ['36%', '58%'],
        center: ['38%', '50%'],
        avoidLabelOverlap: true,
        label: {
          show: true,
          formatter: '{b}\n{d}%',
          fontSize: 10,
          color: '#555',
        },
        labelLine: { length: 8, length2: 6 },
        data: pie.map(d => ({
          name: d.name,
          value: d.value,
          itemStyle: { color: d.color },
        })),
      },
    ],
    graphic: [
      {
        type: 'text',
        left: '32%',
        top: '44%',
        style: {
          text: total.toFixed(2),
          textAlign: 'center',
          fill: '#333',
          fontSize: 16,
          fontWeight: 600,
        },
      },
    ],
  } as EChartsOption;
}

function useEcharts(
  ref: React.RefObject<HTMLDivElement | null>,
  getOption: () => EChartsOption,
  deps: React.DependencyList,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const chart = echarts.init(el);
    chart.setOption(getOption());
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el);
    return () => {
      ro.disconnect();
      chart.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, ...deps]);
}

export type SpatialLeftPanelProps = {
  spaceMode: HuzhouSpaceMode;
  regionKey: HzRegionKey;
};

export const SpatialLeftPanel: React.FC<SpatialLeftPanelProps> = ({ spaceMode, regionKey }) => {
  const stats = useMemo(() => getSpatialStatsForRegion(regionKey), [regionKey]);
  const [supplyTab, setSupplyTab] = useState<SupplyDistTab>('usage');
  const usageBarRef = useRef<HTMLDivElement>(null);
  const spatialBarRef = useRef<HTMLDivElement>(null);
  const structPieRef = useRef<HTMLDivElement>(null);
  const trendRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEcharts(
    usageBarRef,
    () => buildSupplyBarOption(stats.supplyUsageBars),
    [regionKey, stats.supplyUsageBars],
  );
  useEcharts(
    spatialBarRef,
    () => buildSupplyBarOption(stats.supplySpatialBars),
    [regionKey, stats.supplySpatialBars],
  );
  useEcharts(
    structPieRef,
    () => buildSupplyStructPieOption(stats.supplyStructPie, stats.supplyStructTotal),
    [regionKey, stats.supplyStructPie, stats.supplyStructTotal],
  );

  useEffect(() => {
    const refs = [usageBarRef, spatialBarRef, structPieRef, trendRef];
    requestAnimationFrame(() => {
      refs.forEach(ref => {
        const el = ref.current;
        if (!el) return;
        const inst = echarts.getInstanceByDom(el);
        inst?.resize();
      });
    });
  }, [supplyTab]);

  useEffect(() => {
    const host = innerRef.current;
    if (!host) return;
    const resizeAll = () => {
      [usageBarRef, spatialBarRef, structPieRef, trendRef].forEach(ref => {
        const el = ref.current;
        if (!el) return;
        echarts.getInstanceByDom(el)?.resize();
      });
    };
    const ro = new ResizeObserver(() => resizeAll());
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = trendRef.current;
    if (!el) return;
    const chart = echarts.init(el);
    chart.setOption({
      grid: { left: 36, right: 12, top: 24, bottom: 28 },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: stats.supplyTrendYears,
        axisLabel: { fontSize: 10, color: '#666' },
      },
      yAxis: {
        type: 'value',
        name: '公顷',
        nameTextStyle: { fontSize: 10, color: '#888' },
        axisLabel: { fontSize: 10, color: '#666' },
        splitLine: { lineStyle: { color: '#eee' } },
      },
      series: [
        {
          type: 'line',
          smooth: true,
          data: stats.supplyTrendValues,
          areaStyle: { color: 'rgba(2, 167, 240, 0.15)' },
          lineStyle: { color: '#02a7f0', width: 2 },
          itemStyle: { color: '#1e5bb5' },
        },
      ],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el);
    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [regionKey, stats.supplyTrendYears, stats.supplyTrendValues]);

  return (
    <aside className="zht-left hz-left-panel">
      <div className="zht-left-inner hz-left-panel-inner" ref={innerRef}>
        <Title level={5} className="zht-section-title hz-panel-title">
          {LEFT_PANEL_TITLE[spaceMode]}
        </Title>

        <section className="hz-panel-block hz-panel-block--supply">
          <div className="zht-right-widget-hd hz-panel-block-hd">
            <h3 className="zht-right-widget-title">
              <span className="zht-right-widget-pipe">|</span>
              供地分布
            </h3>
            <Segmented<SupplyDistTab>
              size="small"
              className="hz-supply-dist-tabs zht-compliance-period"
              value={supplyTab}
              onChange={setSupplyTab}
              options={SUPPLY_DIST_TABS}
            />
          </div>
          <div className="hz-panel-block-body hz-panel-block-body--chart">
            <div
              ref={usageBarRef}
              className={`hz-chart hz-chart--flex${supplyTab === 'usage' ? '' : ' hz-chart-pane--hidden'}`}
              aria-label="供地用途分布"
              aria-hidden={supplyTab !== 'usage'}
            />
            <div
              ref={spatialBarRef}
              className={`hz-chart hz-chart--flex${supplyTab === 'spatial' ? '' : ' hz-chart-pane--hidden'}`}
              aria-label="供地空间分布"
              aria-hidden={supplyTab !== 'spatial'}
            />
            <div
              ref={structPieRef}
              className={`hz-chart hz-chart--flex${supplyTab === 'struct' ? '' : ' hz-chart-pane--hidden'}`}
              aria-label="供地结构分布"
              aria-hidden={supplyTab !== 'struct'}
            />
          </div>
        </section>

        <section className="hz-panel-block">
          <div className="zht-right-widget-hd hz-panel-block-hd">
            <h3 className="zht-right-widget-title">
              <span className="zht-right-widget-pipe">|</span>
              供地趋势
            </h3>
            <Text type="secondary" className="hz-panel-block-hd__meta">
              2018—2023
            </Text>
          </div>
          <div className="hz-panel-block-body hz-panel-block-body--chart">
            <div ref={trendRef} className="hz-chart hz-chart--flex" aria-label="供地趋势" />
          </div>
        </section>

        <section className="hz-panel-block hz-panel-block--status">
          <div className="zht-right-widget-hd hz-panel-block-hd">
            <h3 className="zht-right-widget-title">
              <span className="zht-right-widget-pipe">|</span>
              用地状态
            </h3>
          </div>
          <div className="hz-panel-block-body">
            <div className="hz-status-legend">
              <span><i className="hz-status-legend__dot hz-status-legend__dot--blue" />交地</span>
              <span><i className="hz-status-legend__dot hz-status-legend__dot--orange" />开工</span>
              <span><i className="hz-status-legend__dot hz-status-legend__dot--green" />验收</span>
            </div>
          </div>
        </section>

        <section className="hz-panel-block hz-panel-block--inefficient">
          <div className="zht-right-widget-hd hz-panel-block-hd">
            <h3 className="zht-right-widget-title">
              <span className="zht-right-widget-pipe">|</span>
              低效用地
            </h3>
          </div>
          <div className="hz-panel-block-body">
            <div className="hz-inefficient">
              <div className="hz-inefficient__hero">
                <div className="hz-inefficient__hero-value">
                  {stats.inefficientLand.area.toFixed(2)}
                  <span className="hz-inefficient__unit">公顷</span>
                </div>
                <div className="hz-inefficient__hero-label">低效用地面积</div>
              </div>
              <div className="hz-inefficient__rows">
                {(
                  [
                    {
                      key: 'industrial',
                      label: '工业用地',
                      value: stats.inefficientLand.industrial,
                      pct: stats.inefficientLand.industrialPct,
                      color: '#1e5bb5',
                    },
                    {
                      key: 'rectify',
                      label: '低效用地整改面积',
                      value: stats.inefficientLand.rectify,
                      pct: stats.inefficientLand.rectifyPct,
                      color: '#08cc91',
                    },
                  ] as const
                ).map(row => {
                  const pctDisplay = (row.pct * 100).toFixed(1);
                  return (
                    <div key={row.key} className="hz-inefficient__row">
                      <div className="hz-inefficient__row-hd">
                        <span className="hz-inefficient__row-label">{row.label}</span>
                        <span className="hz-inefficient__row-value">
                          {row.value.toFixed(2)}
                          <span className="hz-inefficient__unit">公顷</span>
                        </span>
                      </div>
                      <div className="hz-inefficient__track-wrap">
                        <div
                          className="hz-inefficient__track"
                          role="progressbar"
                          aria-valuenow={Number(pctDisplay)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${row.label}占比`}
                        >
                          <span
                            className="hz-inefficient__fill"
                            style={{
                              width: `${Math.min(row.pct * 100, 100)}%`,
                              backgroundColor: row.color,
                            }}
                          />
                        </div>
                        <span className="hz-inefficient__pct">{pctDisplay}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
};
