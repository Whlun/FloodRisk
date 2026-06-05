import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { GaugeChart } from 'echarts/charts';
import { TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { Tag, Typography } from 'antd';
import type { RiskIndexResult } from './types';
import { RISK_TIER_COLOR } from './types';
import {
  formatDurationIndexHint,
  formatEpisodePublishLabel,
  getDemoNow,
  getRiskIndexConfig,
  tierLabelFull,
} from './riskIndexUtils';
import { RiskIndexGaugeHelpTip } from './RiskIndexGaugeHelpTip';

echarts.use([GaugeChart, TooltipComponent, CanvasRenderer]);

type Props = {
  result: RiskIndexResult;
  /** 与页面统计一致的当前时刻 */
  now?: Date;
  /** 嵌入 eco-stat 卡片时隐藏重复标题 */
  compact?: boolean;
  /** 顶部通栏横向布局 */
  layout?: 'vertical' | 'horizontal';
};

export const RiskIndexGauge: React.FC<Props> = ({
  result,
  now: nowProp,
  compact = false,
  layout = 'vertical',
}) => {
  const now = nowProp ?? getDemoNow();
  const ref = useRef<HTMLDivElement>(null);
  const color = RISK_TIER_COLOR[result.tier];
  const cfg = getRiskIndexConfig();

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    const lowRatio = cfg.tierLowMax / cfg.indexMax;
    const mediumRatio = cfg.tierMediumMax / cfg.indexMax;
    const isWideGauge = layout === 'horizontal';
    chart.setOption({
      series: [
        {
          type: 'gauge',
          startAngle: 200,
          endAngle: -20,
          min: 0,
          max: cfg.indexMax,
          splitNumber: 5,
          // 横向半圆表盘：圆心下移，减少容器下方空白
          center: isWideGauge ? ['50%', '78%'] : ['50%', '50%'],
          radius: isWideGauge ? '98%' : '88%',
          axisLine: {
            lineStyle: {
              width: 12,
              color: [
                [lowRatio, '#52c41a'],
                [mediumRatio, '#faad14'],
                [1, '#ff7d00'],
              ],
            },
          },
          pointer: { width: 4, length: '58%', itemStyle: { color } },
          axisTick: { show: false },
          splitLine: { length: 8, lineStyle: { color: '#d9d9d9' } },
          axisLabel: { distance: 16, fontSize: 10, color: 'rgba(0,0,0,0.45)' },
          detail: { show: false },
          data: [{ value: result.index }],
        },
      ],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [result.index, color, layout, cfg.indexMax, cfg.tierLowMax, cfg.tierMediumMax]);

  const deltaSign = result.indexDelta > 0 ? '↑' : result.indexDelta < 0 ? '↓' : '→';
  const deltaText =
    result.indexDelta === 0
      ? result.previousEpisode
        ? '与上一期持平'
        : '较上次持平'
      : result.previousEpisode
        ? `较上一期 ${result.indexDelta > 0 ? '+' : ''}${result.indexDelta}`
        : `较上次 ${result.indexDelta > 0 ? '+' : ''}${result.indexDelta}`;

  const isHorizontal = layout === 'horizontal';

  return (
    <div
      className={`risk-index-gauge-panel${compact ? ' risk-index-gauge-panel--compact' : ''}${isHorizontal ? ' risk-index-gauge-panel--horizontal' : ''}`}
    >
      {!compact && !isHorizontal ? (
        <div className="risk-index-gauge-head">
          <span className="risk-index-gauge-title">内涝风险指数</span>
          <span
            className="risk-index-gauge-badge"
            style={{ background: `${color}14`, color, borderColor: `${color}55` }}
          >
            {tierLabelFull(result.tier)}
          </span>
        </div>
      ) : null}
      <div
        ref={ref}
        className={`eco-stat-echart-host risk-index-gauge-chart${isHorizontal ? ' risk-index-gauge-chart--horizontal' : ''}`}
      />
      <div className={isHorizontal ? 'risk-index-gauge-side' : undefined}>
        {isHorizontal ? (
          <div className="risk-index-gauge-head risk-index-gauge-head--horizontal">
            <span className="risk-index-gauge-title">
              内涝风险指数
              <RiskIndexGaugeHelpTip />
            </span>
            <span
              className="risk-index-gauge-badge"
              style={{ background: `${color}14`, color, borderColor: `${color}55` }}
            >
              {tierLabelFull(result.tier)}
            </span>
          </div>
        ) : null}
        <div className="risk-index-gauge-value-row">
          <span className="risk-index-gauge-value" style={{ color }}>
            {result.index}
          </span>
          <span className="risk-index-gauge-tier">{tierLabelFull(result.tier)}</span>
        </div>
        {isHorizontal ? (
          <Typography.Text type="secondary" className="risk-index-gauge-duration-hint">
            {formatDurationIndexHint({
              baseIndex: result.baseIndex,
              durationBonus: result.durationBonus,
              durationTier: result.durationTier,
              hoursSincePublish: result.hoursSincePublish,
            })}
          </Typography.Text>
        ) : null}
        <div
          className="risk-index-gauge-trend"
          style={{ color: result.indexDelta > 0 ? '#ff7d00' : 'rgba(0,0,0,0.45)' }}
        >
          {deltaSign} {deltaText} · 趋势 {result.trend}
        </div>
        {isHorizontal && result.currentEpisode ? (
          <div className="risk-index-gauge-episode-row">
            <Typography.Text type="secondary" className="risk-index-gauge-episode-range">
              {formatEpisodePublishLabel(result.currentEpisode, now)}
            </Typography.Text>
            <div className="risk-index-gauge-episode-tags">
              <Tag bordered={false} color="processing">
                期内 {result.currentEpisode.pointCount} 点
              </Tag>
              <Tag bordered={false}>加权 W = {result.wEpisode}</Tag>
              <Tag bordered={false} color="default">
                W×{cfg.indexScale} = {result.baseIndex}
                {result.durationBonus > 0 ? ` +${result.durationBonus}` : ''} → {result.index}
              </Tag>
            </div>
          </div>
        ) : null}
        {!isHorizontal ? (
          <div className="risk-index-gauge-foot">
            <span>过去 12h 预警点位 {result.pointCount12} 个</span>
            <span>过去 24h 预警点位 {result.pointCount24} 个</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};
