import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { PointAlertRankRow } from './types';
import { ALERT_LEVEL_COLOR } from './types';

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

type Props = {
  rows: PointAlertRankRow[];
};

export const Top5RankingChart: React.FC<Props> = ({ rows }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || rows.length === 0) return;
    const chart = echarts.init(ref.current);
    const sorted = [...rows].reverse();
    chart.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const item = (params as { dataIndex: number }[])[0];
          if (!item) return '';
          const row = sorted[item.dataIndex];
          return `${row.pointName}<br/>最高等级：${row.peakLevelLabel}`;
        },
      },
      grid: { left: 8, right: 56, top: 8, bottom: 8, containLabel: true },
      xAxis: {
        type: 'value',
        min: 0,
        max: 5,
        name: '等级权重',
        minInterval: 1,
      },
      yAxis: {
        type: 'category',
        data: sorted.map(r => r.pointName),
        axisLabel: { width: 120, overflow: 'truncate', fontSize: 11 },
      },
      series: [
        {
          type: 'bar',
          data: sorted.map(r => ({
            value: r.peakWeight,
            itemStyle: { color: ALERT_LEVEL_COLOR[r.peakLevel], borderRadius: [0, 4, 4, 0] },
          })),
          barMaxWidth: 16,
          label: {
            show: true,
            position: 'right',
            fontSize: 11,
            formatter: (p: { dataIndex: number }) => sorted[p.dataIndex]?.peakLevelLabel ?? '',
          },
        },
      ],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [rows]);

  return <div ref={ref} className="eco-stat-echart-host" />;
};
