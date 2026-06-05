import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { HourlyTrendBucket } from './types';

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

type Props = {
  buckets: HourlyTrendBucket[];
  /** 柱状图：发布后逐时；折线：过程累积 */
  variant?: 'bar' | 'line';
  /** X 轴标签间隔 */
  labelInterval?: number;
  /** 横轴为距预警发布的小时（+0h、+1h…） */
  postPublishAxis?: boolean;
};

export const PointHourlyTrendChart: React.FC<Props> = ({
  buckets,
  variant = 'bar',
  labelInterval = 0,
  postPublishAxis = false,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    const isLine = variant === 'line';

    chart.setOption({
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const items = params as { seriesName: string; value: number; axisValue: string }[];
          if (!items?.length) return '';
          const hour = items[0].axisValue;
          const timePrefix = postPublishAxis ? `距预警发布 ${hour}` : hour;
          if (isLine) {
            return `${timePrefix}<br/>过程累积点位：${items[0].value} 个`;
          }
          return `${timePrefix}<br/>新增超限报警点位：${items[0].value} 个`;
        },
      },
      grid: { left: 48, right: 16, top: 20, bottom: 36 },
      xAxis: {
        type: 'category',
        data: buckets.map(b => b.hourLabel),
        axisLabel: { fontSize: 11, interval: labelInterval },
        name: postPublishAxis ? '距发布' : undefined,
        nameTextStyle: { fontSize: 11, color: '#94a3b8' },
      },
      yAxis: { type: 'value', minInterval: 1, name: '点位' },
      series: isLine
        ? [
            {
              name: '过程累积点位',
              type: 'line',
              smooth: true,
              symbol: 'circle',
              symbolSize: 5,
              lineStyle: { width: 2, color: '#1e5bb5' },
              itemStyle: { color: '#1e5bb5' },
              areaStyle: { color: 'rgba(30, 91, 181, 0.08)' },
              data: buckets.map(b => b.cumulativePointCount),
            },
          ]
        : [
            {
              name: '新增超限报警点位',
              type: 'bar',
              data: buckets.map(b => b.newPointCount),
              barMaxWidth: 24,
              itemStyle: { color: '#1e5bb5', borderRadius: [4, 4, 0, 0] },
            },
          ],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [buckets, labelInterval, postPublishAxis, variant]);

  return <div ref={ref} className="eco-stat-echart-host" />;
};
