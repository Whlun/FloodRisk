import React, { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, MarkLineComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { Typography } from 'antd';
import type { EpisodeIndexTrendPoint } from './types';
import { getEnabledDurationRulesAsc, getRiskIndexConfig } from './riskIndexUtils';

echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, CanvasRenderer]);

/** 图例：蓝虚线推算段（与本期实线系列区分） */
const PROJECTED_LEGEND = '推算';

type Props = {
  points: EpisodeIndexTrendPoint[];
  currentLabel: string;
  previousLabel: string;
  hasPrevious: boolean;
  currentIndex: number;
  hoursSincePublish: number;
};

/** 通栏右侧：本期 vs 上期综合指数变化趋势（每期一条线） */
export const RiskIndexTrendChart: React.FC<Props> = ({
  points,
  currentLabel,
  previousLabel,
  hasPrevious,
  currentIndex,
  hoursSincePublish,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const cfg = getRiskIndexConfig();
  const indexMax = cfg.indexMax;

  const labelInterval = useMemo(() => {
    if (points.length <= 13) return 0;
    return Math.ceil(points.length / 12) - 1;
  }, [points.length]);

  const nowPoint = useMemo(() => points.find(p => p.isNow), [points]);
  const nowLabel = nowPoint?.hourLabel;

  const durationMarkRules = useMemo(
    () => (cfg.durationSeverityEnabled ? getEnabledDurationRulesAsc(cfg) : []),
    [cfg],
  );

  const footnote = useMemo(() => {
    const h =
      Math.round(hoursSincePublish * 10) / 10 === Math.round(hoursSincePublish)
        ? String(Math.round(hoursSincePublish))
        : hoursSincePublish.toFixed(1);
    const bonusText =
      nowPoint && nowPoint.currentDurationBonus > 0
        ? `（基础 ${nowPoint.currentBaseIndex} + 持续 ${nowPoint.currentDurationBonus}）`
        : nowPoint
          ? `（基础 ${nowPoint.currentBaseIndex}，暂无持续加重）`
          : '';
    const ruleHint =
      durationMarkRules.length > 0
        ? durationMarkRules.map(r => `满 ${r.hours}h +${r.bonus}`).join(' · ')
        : '未配置持续加重';
    return `当前 ${h}h · 综合 ${currentIndex}${bonusText} · 蓝实线已发生、蓝虚线推算 · ${ruleHint}`;
  }, [currentIndex, durationMarkRules, hoursSincePublish, nowPoint]);

  useEffect(() => {
    if (!ref.current || points.length === 0) return;
    const chart = echarts.init(ref.current);

    const currentActual = points.map(p => ({
      value: p.isProjected ? null : p.currentIndex,
      symbolSize: p.isNow ? 7 : 4,
      itemStyle: { color: p.isNow ? '#ff7d00' : '#1e5bb5' },
    }));
    const currentProjected = points.map(p => {
      if (p.isProjected) return p.currentIndex;
      if (p.isNow) return p.currentIndex;
      return null;
    });

    chart.setOption({
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const items = params as {
            seriesName: string;
            value: number | null;
            dataIndex: number;
          }[];
          if (!items?.length) return '';
          const idx = items[0].dataIndex;
          const point = points[idx];
          if (!point) return '';

          const lines: string[] = [
            `距预警发布 ${point.hourLabel}${point.isProjected ? '（推算）' : point.isNow ? '（当前）' : ''}`,
            `${currentLabel}：${point.currentIndex}`,
            `　基础 ${point.currentBaseIndex} + 持续 ${point.currentDurationBonus > 0 ? point.currentDurationBonus : 0}`,
          ];

          if (hasPrevious) {
            lines.push(`${previousLabel}：${point.previousIndex}`);
          }

          return lines.join('<br/>');
        },
      },
      legend: {
        top: 0,
        right: 0,
        itemWidth: 14,
        itemHeight: 8,
        textStyle: { fontSize: 11 },
        data: hasPrevious
          ? [currentLabel, PROJECTED_LEGEND, previousLabel]
          : [currentLabel, PROJECTED_LEGEND],
      },
      grid: { left: 40, right: 12, top: 32, bottom: 40 },
      xAxis: {
        type: 'category',
        data: points.map(p => p.hourLabel),
        axisLabel: { fontSize: 10, interval: labelInterval },
        boundaryGap: false,
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: indexMax,
        splitNumber: 4,
        axisLabel: { fontSize: 10 },
      },
      series: [
        {
          name: currentLabel,
          type: 'line',
          smooth: true,
          symbol: 'circle',
          lineStyle: { width: 2, color: '#1e5bb5' },
          areaStyle: { color: 'rgba(30, 91, 181, 0.08)' },
          data: currentActual,
          markLine: {
            symbol: 'none',
            silent: true,
            lineStyle: { type: 'dashed', color: '#faad14', width: 1 },
            label: { position: 'insideEndTop', fontSize: 10, color: '#d46b08' },
            data: [
              ...(nowLabel
                ? [{ xAxis: nowLabel, label: { formatter: '当前', fontSize: 10 } }]
                : []),
              ...durationMarkRules.map(rule => ({
                xAxis: `${rule.hours}h`,
                label: { formatter: `+${rule.bonus}` },
              })),
            ],
          },
        },
        {
          name: PROJECTED_LEGEND,
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 3,
          lineStyle: { width: 2, type: 'dashed', color: '#69b1ff' },
          itemStyle: { color: '#69b1ff' },
          data: currentProjected,
        },
        ...(hasPrevious
          ? [
              {
                name: previousLabel,
                type: 'line' as const,
                smooth: true,
                symbol: 'circle',
                symbolSize: 4,
                lineStyle: { width: 2, color: '#94a3b8' },
                itemStyle: { color: '#94a3b8' },
                data: points.map(p => p.previousIndex),
              },
            ]
          : []),
      ],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [currentLabel, durationMarkRules, hasPrevious, indexMax, labelInterval, nowLabel, points, previousLabel]);

  return (
    <div className="dq-risk-index-trend-chart-wrap">
      <div ref={ref} className="dq-risk-index-hero-trend-chart" />
      <Typography.Text type="secondary" className="dq-risk-index-trend-footnote">
        {footnote}
      </Typography.Text>
    </div>
  );
};
