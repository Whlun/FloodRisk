import React from 'react';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { Popover, Typography } from 'antd';
import { formatDurationSeverityRulesSummary } from './riskIndexConfig';
import { calcIndexFromWeightedSum, getRiskIndexConfig } from './riskIndexUtils';

/** 演示期加权总分（与演示数据第 2 期一致，用于帮助说明演算） */
const DEMO_WEIGHTED_SUM = 16;

function RiskIndexGaugeHelpContent() {
  const cfg = getRiskIndexConfig();
  const demoIndex = calcIndexFromWeightedSum(DEMO_WEIGHTED_SUM);
  const { low, medium, high } = cfg.levelWeights;

  return (
    <div className="dq-risk-index-help-content dq-risk-index-help-content--detail">
      <Typography.Paragraph className="dq-risk-index-help-section">
        <Typography.Text strong>指数含义</Typography.Text>
        <br />
        把该预警期内各积水点报警情况汇总为 0–{cfg.indexMax} 分，分值越高表示<strong>当前仍处内涝超限报警</strong>的点位越多、等级越高；退水解除后指数会回落。
      </Typography.Paragraph>

      <Typography.Paragraph className="dq-risk-index-help-section">
        <Typography.Text strong>第一步：算加权总分 W</Typography.Text>
        <br />
        期内每个内涝点只计 1 次，取该点<strong>当前仍生效</strong>的报警等级权重后相加（已退水/解除的不计）：
        <br />
        · 低风险 = {low} 分 · 中风险 = {medium} 分 · 高风险 = {high} 分
        <br />
        例：6 个点等级为高、高、中、低、中、低 → W = {high}+{high}+{medium}+{low}+{medium}+{low} ={' '}
        <strong>{DEMO_WEIGHTED_SUM}</strong>
      </Typography.Paragraph>

      <Typography.Paragraph className="dq-risk-index-help-section">
        <Typography.Text strong>第二步：换算基础分</Typography.Text>
        <br />
        基础分 = W × {cfg.indexScale}，四舍五入；超过 {cfg.indexMax} 按 {cfg.indexMax} 计。
        <br />
        · <Typography.Text code>{cfg.indexScale}</Typography.Text>（换算系数，非 W）：把加权总分 W 线性映射到{' '}
        {cfg.indexMax} 分制；默认可按业务在「指数参数配置」中调整
        <br />
        · 高风险权重（{high}）远大于低风险（{low}），少量高风险点位即可明显拉高 W
        <br />
        接上例：{DEMO_WEIGHTED_SUM} × {cfg.indexScale} = {DEMO_WEIGHTED_SUM * cfg.indexScale} → 基础分{' '}
        <strong>{demoIndex}</strong>
      </Typography.Paragraph>

      <Typography.Paragraph className="dq-risk-index-help-section">
        <Typography.Text strong>第三步：持续内涝加重</Typography.Text>
        <br />
        {cfg.durationSeverityEnabled ? (
          <>
            {formatDurationSeverityRulesSummary(cfg)}。
            <br />
            演示本期可能尚未命中加重档；内涝持续越久，指数会在基础分上按配置抬升。
          </>
        ) : (
          <>当前未启用持续内涝加重，综合指数仅含基础分。</>
        )}
      </Typography.Paragraph>

      <Typography.Paragraph className="dq-risk-index-help-section">
        <Typography.Text strong>第四步：映射风险等级</Typography.Text>
        <br />
        · 0–{cfg.tierLowMax}：低风险 · {cfg.tierLowMax + 1}–{cfg.tierMediumMax}：中风险 ·{' '}
        {cfg.tierMediumMax + 1}–{cfg.indexMax}：高风险
      </Typography.Paragraph>

      <Typography.Paragraph className="dq-risk-index-help-section">
        <Typography.Text strong>权重与系数可配置</Typography.Text>
        <br />
        等级权重（低/中/高）、换算系数、持续加重档位、等级阈值等可在页面右上角
        <strong>「指数参数配置」</strong>中维护；保存后本说明与页面指数会自动同步。
      </Typography.Paragraph>

      <Typography.Paragraph className="dq-risk-index-help-section dq-risk-index-help-section--last">
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          近 12h/24h 指<strong>本期预警发布后</strong> 12/24 小时内的辅助统计；仪表盘指数与顶部摘要以当前预警期为准。趋势对比本期与上一期，不做日环比。
        </Typography.Text>
      </Typography.Paragraph>

      <div className="dq-risk-index-help-tier-bar" aria-hidden>
        <div className="dq-risk-index-help-tier-seg dq-risk-index-help-tier-seg--low">
          <span>低风险</span>
          <span>0–{cfg.tierLowMax}</span>
        </div>
        <div className="dq-risk-index-help-tier-seg dq-risk-index-help-tier-seg--medium">
          <span>中风险</span>
          <span>
            {cfg.tierLowMax + 1}–{cfg.tierMediumMax}
          </span>
        </div>
        <div className="dq-risk-index-help-tier-seg dq-risk-index-help-tier-seg--high">
          <span>高风险</span>
          <span>
            {cfg.tierMediumMax + 1}–{cfg.indexMax}
          </span>
        </div>
      </div>
    </div>
  );
}

/** 仪表盘旁：内涝风险指数完整说明（与页面标题「统计范围」问号区分） */
export const RiskIndexGaugeHelpTip: React.FC = () => (
  <Popover
    title="内涝风险指数说明"
    content={<RiskIndexGaugeHelpContent />}
    trigger="hover"
    placement="bottomLeft"
    overlayClassName="dq-risk-index-help-popover dq-risk-index-help-popover--detail"
  >
    <QuestionCircleOutlined
      className="dq-risk-index-help-icon dq-risk-index-help-icon--compact"
      onClick={e => e.stopPropagation()}
    />
  </Popover>
);
