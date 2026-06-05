import React, { useMemo } from 'react';
import { Tag, Typography } from 'antd';
import type { RiskIndexConfig } from './riskIndexConfig';
import { formatDurationSeverityRulesSummary, getRiskIndexConfig } from './riskIndexConfig';
import { parseDurationTierHours } from './riskIndexUtils';
import type { RiskIndexResult } from './types';
import { RISK_TIER_COLOR } from './types';
import {
  aggregateAlertsByPoint,
  countPointsByPeakLevel,
  tierLabelFull,
} from './riskIndexUtils';

type Props = {
  /** 用于本期演算展示 */
  result: RiskIndexResult | null;
  /** 表单预览配置（未保存时与表单同步） */
  previewConfig?: RiskIndexConfig;
};

/** 指数计算公式说明（用于参数配置弹窗） */
export const RiskIndexFormulaContent: React.FC<Props> = ({ result, previewConfig }) => {
  const cfg = previewConfig ?? getRiskIndexConfig();

  const episodeBreakdown = useMemo(() => {
    if (!result?.currentEpisode) return null;
    const points = aggregateAlertsByPoint(result.currentEpisode.alerts);
    const high = countPointsByPeakLevel(points, 'high');
    const medium = countPointsByPeakLevel(points, 'medium');
    const low = countPointsByPeakLevel(points, 'low');
    const parts: string[] = [];
    if (high > 0) parts.push(`${high}×${cfg.levelWeights.high}`);
    if (medium > 0) parts.push(`${medium}×${cfg.levelWeights.medium}`);
    if (low > 0) parts.push(`${low}×${cfg.levelWeights.low}`);
    return { parts, w: result.wEpisode };
  }, [result, cfg.levelWeights]);

  const rawProduct = (result?.wEpisode ?? 0) * cfg.indexScale;
  const demoBaseIndex = episodeBreakdown
    ? Math.min(cfg.indexMax, Math.round(episodeBreakdown.w * cfg.indexScale))
    : 0;
  const demoIndex = result?.index ?? demoBaseIndex;
  const tierColor = result ? RISK_TIER_COLOR[result.tier] : undefined;

  return (
    <div className="dq-risk-index-formula">
      <Typography.Text strong className="dq-risk-index-formula-title">
        指数计算公式
      </Typography.Text>

      <div className="dq-risk-index-formula-steps">
        <div className="dq-risk-index-formula-step">
          <span className="dq-risk-index-formula-step-no">①</span>
          <span>
            加权总分 <Typography.Text code>W</Typography.Text> = 期内各内涝点
            <strong>最高报警等级权重</strong>之和（每点只计 1 次）
          </span>
        </div>
        <div className="dq-risk-index-formula-weights">
          <Tag bordered={false} color="success">
            低风险 = {cfg.levelWeights.low}
          </Tag>
          <Tag bordered={false} color="warning">
            中风险 = {cfg.levelWeights.medium}
          </Tag>
          <Tag bordered={false} color="error">
            高风险 = {cfg.levelWeights.high}
          </Tag>
        </div>

        <div className="dq-risk-index-formula-step">
          <span className="dq-risk-index-formula-step-no">②</span>
          <span>
            基础分 = min({cfg.indexMax}, round(<Typography.Text code>W</Typography.Text> ×{' '}
            {cfg.indexScale}))
          </span>
        </div>

        <div className="dq-risk-index-formula-step">
          <span className="dq-risk-index-formula-step-no">③</span>
          <span>持续内涝加重：{formatDurationSeverityRulesSummary(cfg)}</span>
        </div>

        <div className="dq-risk-index-formula-step">
          <span className="dq-risk-index-formula-step-no">④</span>
          <span>
            综合指数 = min({cfg.indexMax}, 基础分 + 持续加重分)
          </span>
        </div>

        <div className="dq-risk-index-formula-step">
          <span className="dq-risk-index-formula-step-no">⑤</span>
          <span>
            风险等级：0–{cfg.tierLowMax} 低 · {cfg.tierLowMax + 1}–{cfg.tierMediumMax} 中 ·{' '}
            {cfg.tierMediumMax + 1}–{cfg.indexMax} 高
          </span>
        </div>
      </div>

      {episodeBreakdown && result ? (
        <div className="dq-risk-index-formula-demo">
          <Typography.Text type="secondary" className="dq-risk-index-formula-demo-label">
            本期演算
            {result.currentEpisode ? `（第 ${result.currentEpisode.sequence} 期）` : ''}
          </Typography.Text>
          <div className="dq-risk-index-formula-demo-line">
            <Typography.Text code>
              W = {episodeBreakdown.parts.length ? episodeBreakdown.parts.join(' + ') : '0'} ={' '}
              {episodeBreakdown.w}
            </Typography.Text>
          </div>
          <div className="dq-risk-index-formula-demo-line">
            <Typography.Text code>
              基础分 = round({episodeBreakdown.w} × {cfg.indexScale}) = round({rawProduct}) = {demoBaseIndex}
            </Typography.Text>
          </div>
          <div className="dq-risk-index-formula-demo-line">
            <Typography.Text code>
              持续加重 = {result.durationBonus > 0 ? `+${result.durationBonus}` : '0'}
              {parseDurationTierHours(result.durationTier) != null
                ? `（已满 ${parseDurationTierHours(result.durationTier)}h）`
                : `（距发布 ${Math.round(result.hoursSincePublish * 10) / 10}h，未命中加重档）`}
            </Typography.Text>
          </div>
          <div className="dq-risk-index-formula-demo-line">
            <Typography.Text code>
              综合指数 = {demoBaseIndex}
              {result.durationBonus > 0 ? ` + ${result.durationBonus}` : ''} = {demoIndex}
            </Typography.Text>
            {tierColor ? (
              <Tag bordered={false} style={{ marginLeft: 8, color: tierColor, background: `${tierColor}14` }}>
                {tierLabelFull(result.tier)}
              </Tag>
            ) : null}
          </div>
          {previewConfig ? (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              演算按上方表单当前值预览；保存配置后页面指数将按新参数重算。
            </Typography.Text>
          ) : null}
        </div>
      ) : (
        <Typography.Text type="secondary" className="dq-risk-index-formula-empty">
          当前无进行中的预警期，暂无本期演算示例。
        </Typography.Text>
      )}
    </div>
  );
};
