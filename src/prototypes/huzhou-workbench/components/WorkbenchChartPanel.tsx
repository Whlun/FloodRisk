import React, { useEffect, useRef } from 'react';
import { Card, Col, Row } from 'antd';
import * as echarts from 'echarts';
import { setChartOptionWithAnimation, withChartAnimation } from '../../../common/chartAnimation';
import { HZ_CHART } from '../../huzhou-spatial-portrait/components/spatial/spatialChartTheme';
import type { PhaseMetric } from '../../huzhou-construction-portrait/types';

type WorkbenchChartPanelProps = {
  supplyTrendYears: string[];
  supplyTrendValues: number[];
  phaseMetrics: PhaseMetric[];
};

export const WorkbenchChartPanel: React.FC<WorkbenchChartPanelProps> = ({
  supplyTrendYears,
  supplyTrendValues,
  phaseMetrics,
}) => {
  const trendRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = trendRef.current;
    if (!el) return;
    const chart = echarts.init(el);
    setChartOptionWithAnimation(chart, withChartAnimation({
      grid: { left: 48, right: 16, top: 32, bottom: 32 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: HZ_CHART.tooltipBg,
        borderColor: HZ_CHART.tooltipBorder,
        textStyle: { fontSize: 12, color: HZ_CHART.text },
      },
      xAxis: {
        type: 'category',
        data: supplyTrendYears,
        axisLabel: { fontSize: 11, color: HZ_CHART.textSecondary },
      },
      yAxis: {
        type: 'value',
        name: '公顷',
        nameTextStyle: { fontSize: 11, color: HZ_CHART.textMuted },
        axisLabel: { fontSize: 11, color: HZ_CHART.textSecondary },
        splitLine: { lineStyle: { type: 'dashed', color: HZ_CHART.splitLine } },
      },
      series: [
        {
          type: 'line',
          smooth: true,
          data: supplyTrendValues,
          areaStyle: { color: 'rgba(22, 119, 255, 0.12)' },
          lineStyle: { color: HZ_CHART.blue, width: 2 },
          itemStyle: { color: HZ_CHART.primary },
        },
      ],
    }));
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el);
    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [supplyTrendYears, supplyTrendValues]);

  useEffect(() => {
    const el = phaseRef.current;
    if (!el) return;
    const chart = echarts.init(el);
    const sorted = phaseMetrics
      .slice()
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    const names = sorted.map(m => m.label);
    const values = sorted.map(m => m.count);
    setChartOptionWithAnimation(chart, withChartAnimation({
      grid: { left: 8, right: 24, top: 16, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: HZ_CHART.tooltipBg,
        borderColor: HZ_CHART.tooltipBorder,
        textStyle: { fontSize: 12, color: HZ_CHART.text },
        formatter: (params: unknown) => {
          const items = params as { name: string; value: number }[];
          const p = items[0];
          return p ? `${p.name}<br/>${p.value} 个` : '';
        },
      },
      xAxis: {
        type: 'value',
        axisLabel: { fontSize: 11, color: HZ_CHART.textSecondary },
        splitLine: { lineStyle: { type: 'dashed', color: HZ_CHART.splitLine } },
      },
      yAxis: {
        type: 'category',
        data: names,
        inverse: true,
        axisLabel: { fontSize: 11, color: HZ_CHART.textSecondary },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      series: [
        {
          type: 'bar',
          data: values,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: HZ_CHART.primary },
                { offset: 1, color: HZ_CHART.blueLight },
              ],
            },
            borderRadius: [0, 4, 4, 0],
          },
          barMaxWidth: 14,
        },
      ],
    }));
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el);
    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [phaseMetrics]);

  return (
    <section className="hz-wb-section">
      <Row gutter={[12, 12]}>
        <Col xs={24} lg={12}>
          <Card className="hz-wb-chart-card" title="供地趋势" size="small" bordered>
            <div ref={trendRef} className="hz-wb-chart-host" />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card className="hz-wb-chart-card" title="建设阶段分布（Top 5）" size="small" bordered>
            <div ref={phaseRef} className="hz-wb-chart-host" />
          </Card>
        </Col>
      </Row>
    </section>
  );
};
