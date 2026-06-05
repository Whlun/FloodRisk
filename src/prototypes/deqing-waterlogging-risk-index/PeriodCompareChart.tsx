import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EpisodeComparePoint } from './types';

echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

type Props = {
  points: EpisodeComparePoint[];
  currentLabel: string;
  previousLabel: string;
};

export const PeriodCompareChart: React.FC<Props> = ({ points, currentLabel, previousLabel }) => {
  const ref = useRef<HTMLDivElement>(null);
  const labelInterval = points.length > 13 ? Math.ceil(points.length / 13) - 1 : 0;

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);

    chart.setOption({
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const items = params as { seriesName: string; value: number; axisValue: string }[];
          if (!items?.length) return '';
          const hour = items[0].axisValue;
          return items
            .map(item => `${item.seriesName}：${item.value} 个`)
            .join('<br/>')
            .replace(/^/, `距各自预警开始 ${hour}<br/>`);
        },
      },
      legend: {
        bottom: 0,
        itemWidth: 14,
        itemHeight: 8,
        textStyle: { fontSize: 11 },
      },
      grid: { left: 48, right: 16, top: 20, bottom: 48 },
      xAxis: {
        type: 'category',
        data: points.map(p => p.hourLabel),
        axisLabel: { fontSize: 11, interval: labelInterval },
        name: '相对起点',
        nameTextStyle: { fontSize: 11, color: '#94a3b8' },
      },
      yAxis: { type: 'value', minInterval: 1, name: '仍处超限报警点位' },
      series: [
        {
          name: currentLabel,
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          lineStyle: { width: 2, color: '#1e5bb5' },
          itemStyle: { color: '#1e5bb5' },
          data: points.map(p => p.currentActiveCount),
        },
        {
          name: previousLabel,
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          lineStyle: { width: 2, color: '#94a3b8' },
          itemStyle: { color: '#94a3b8' },
          data: points.map(p => p.previousActiveCount),
        },
      ],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [currentLabel, labelInterval, points, previousLabel]);

  return <div ref={ref} className="eco-stat-echart-host" />;
};
