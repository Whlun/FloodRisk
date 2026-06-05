import React from 'react';
import { Alert, Descriptions, Tag, Typography } from 'antd';
import type { Level1Weights, RiskIndicatorRow } from './types';
import type { SurveyRatingPreview } from './surveyRatingUtils';
import { RatingScoreArchitectureDiagram } from './RatingScoreArchitectureDiagram';
import { formatLevel1Formula } from './weightBalance';

const { Text, Title } = Typography;

interface Props {
  preview: SurveyRatingPreview;
  level1Weights: Level1Weights;
  indicators: RiskIndicatorRow[];
  pointLabel?: string;
}

/** 定级确认：左架构图 + 右评分摘要 */
export const SurveyRatingPreviewPanel: React.FC<Props> = ({
  preview,
  level1Weights,
  indicators,
  pointLabel,
}) => {
  if (!preview.ok) {
    return (
      <div className="dq-rating-confirm-layout dq-rating-confirm-layout--single">
        {pointLabel ? (
          <Text type="secondary" className="dq-rating-confirm-point-label">
            {pointLabel}
          </Text>
        ) : null}
        <Alert
          type="warning"
          showIcon
          message="暂无法完成定级试算"
          description={
            <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
              {preview.errors.map(e => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          }
        />
        {preview.result ? (
          <Descriptions column={1} size="small" bordered style={{ marginTop: 12 }}>
            <Descriptions.Item label="综合分 V（试算）">
              {preview.result.v.toFixed(4)}
            </Descriptions.Item>
            <Descriptions.Item label="已匹配指标">
              {preview.matchedCount} / {preview.totalCount}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </div>
    );
  }

  const { result, level } = preview;
  if (!result || !level) return null;

  const ratedRow = preview.ratedRow;
  const ratingResult = ratedRow?.ratingResult;
  const showArch =
    ratedRow &&
    ratingResult &&
    Object.keys(ratingResult.selectedRuleIds).length > 0;

  return (
    <div className="dq-rating-confirm-layout">
      <div className="dq-rating-confirm-left">
        <Title level={5} className="dq-rating-confirm-left-title">
          指标评分结构
        </Title>
        {showArch ? (
          <RatingScoreArchitectureDiagram
            indicators={indicators}
            pointType={ratedRow.pointType}
            level1Weights={level1Weights}
            selectedRuleIds={ratingResult.selectedRuleIds}
            level1Scores={{
              v: result.v,
              v1: result.v1,
              v2: result.v2,
              v3: result.v3,
              v4: result.v4,
            }}
            layout="split"
            showRoot
            levelName={level.levelName}
            levelColor={level.color}
            pointName={ratedRow.name}
            pointCode={ratedRow.pointCode}
          />
        ) : (
          <Text type="secondary">暂无评分结构数据</Text>
        )}
      </div>

      <div className="dq-rating-confirm-right">
        {pointLabel ? (
          <Text type="secondary" className="dq-rating-confirm-point-label">
            {pointLabel}
          </Text>
        ) : null}
        <div className="dq-score-preview-result-hero dq-rating-confirm-hero">
          <Text type="secondary" className="dq-score-preview-result-hero-label">
            风险等级
          </Text>
          <Tag color={level.color} className="dq-score-preview-level-tag" style={{ margin: 0 }}>
            {level.levelName}
          </Tag>
          <Text type="secondary" className="dq-score-preview-result-v">
            综合分 V = {result.v.toFixed(4)}
            {result.partial ? '（部分指标参与）' : ''}
          </Text>
          <Text type="secondary" className="dq-rating-confirm-formula">
            {formatLevel1Formula(level1Weights)}
          </Text>
        </div>
        <Descriptions column={1} size="small" bordered className="dq-rating-confirm-summary">
          <Descriptions.Item label="致灾因子 V₁">
            {result.v1.toFixed(4)}
            <Text type="secondary">（ω {level1Weights.HAZARD.toFixed(3)}）</Text>
          </Descriptions.Item>
          <Descriptions.Item label="孕灾因子 V₂">
            {result.v2.toFixed(4)}
            <Text type="secondary">（ω {level1Weights.FORMATION.toFixed(3)}）</Text>
          </Descriptions.Item>
          <Descriptions.Item label="承灾因子 V₃">
            {result.v3.toFixed(4)}
            <Text type="secondary">（ω {level1Weights.BEARING.toFixed(3)}）</Text>
          </Descriptions.Item>
          <Descriptions.Item label="防灾减灾 V₄">
            {result.v4.toFixed(4)}
            <Text type="secondary">（ω {level1Weights.PREVENTION.toFixed(3)}）</Text>
          </Descriptions.Item>
          <Descriptions.Item label="已匹配指标">
            {preview.matchedCount} / {preview.totalCount}
          </Descriptions.Item>
        </Descriptions>
      </div>
    </div>
  );
};
