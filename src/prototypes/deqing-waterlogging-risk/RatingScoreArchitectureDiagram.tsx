import React, { useMemo } from 'react';
import { Tag, Tooltip, Typography } from 'antd';
import {
  ARCH_LEVEL1_BORDER,
  ARCH_LEVEL1_COLOR,
  ARCH_LEVEL1_ORDER,
  buildArchitectureLevel1Nodes,
  formationTypeLabel,
  getIndicatorRuleScore,
} from './indicatorArchitectureModel';
import { formatLevel1Formula } from './weightBalance';
import type { Level1Weights, RiskIndicatorRow, SurveyPointType } from './types';

const { Text, Title } = Typography;

export interface RatingLevel1Scores {
  v: number;
  v1: number;
  v2: number;
  v3: number;
  v4: number;
}

interface Props {
  indicators: RiskIndicatorRow[];
  pointType: SurveyPointType;
  level1Weights: Level1Weights;
  selectedRuleIds: Record<string, string>;
  level1Scores: RatingLevel1Scores;
  levelName?: string;
  /** 与右侧定级摘要一致的风险等级色（指标体系等级配置 color） */
  levelColor?: string;
  compact?: boolean;
  /** 定级弹窗左右分栏：更紧凑，四级横排 */
  layout?: 'default' | 'split';
  /** 综合分 V 已在右侧展示时可隐藏顶部根节点 */
  showRoot?: boolean;
  /** 易涝点名称与编号，用于顶部蓝色标题 */
  pointName?: string;
  pointCode?: string;
}

function formatRatingRootTitle(name?: string, pointCode?: string): string {
  if (name && pointCode) {
    return `${name}（${pointCode}）内涝风险评估综合分 V`;
  }
  return '内涝风险评估综合分 V';
}

const LEVEL1_V_KEY: Record<(typeof ARCH_LEVEL1_ORDER)[number], keyof RatingLevel1Scores> = {
  HAZARD: 'v1',
  FORMATION: 'v2',
  BEARING: 'v3',
  PREVENTION: 'v4',
};

/** 定级确认：只读指标架构图，展示本点各指标赋分与一级因子合成 */
export const RatingScoreArchitectureDiagram: React.FC<Props> = ({
  indicators,
  pointType,
  level1Weights,
  selectedRuleIds,
  level1Scores,
  levelName,
  levelColor,
  compact = true,
  layout = 'default',
  showRoot = true,
  pointName,
  pointCode,
}) => {
  const rootTitle = formatRatingRootTitle(pointName, pointCode);
  const arch = useMemo(
    () => buildArchitectureLevel1Nodes(indicators, pointType, level1Weights),
    [indicators, pointType, level1Weights],
  );

  const matchedIds = useMemo(() => new Set(Object.keys(selectedRuleIds)), [selectedRuleIds]);

  const embedClass = [
    'dq-arch-rating-embed',
    compact ? 'dq-arch-rating-embed--compact' : '',
    layout === 'split' ? 'dq-arch-rating-embed--split' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={embedClass}>
      {showRoot ? (
        <>
          <div className="dq-arch-root">
            <div className="dq-arch-root-box">
              <Title level={5} className="dq-arch-root-title" style={{ margin: 0, color: '#fff' }}>
                {rootTitle}
              </Title>
              {levelName && levelColor ? (
                <Tag
                  color={levelColor}
                  className="dq-score-preview-level-tag dq-arch-root-level-tag"
                  style={{ marginTop: 8 }}
                >
                  {levelName}
                </Tag>
              ) : null}
              <Text className="dq-arch-formula">V = {level1Scores.v.toFixed(4)}</Text>
              <Text className="dq-arch-formula dq-arch-formula-sub">
                {formatLevel1Formula(level1Weights)}
              </Text>
            </div>
            <div className="dq-arch-connector dq-arch-connector-down" />
          </div>
        </>
      ) : (
        <div className="dq-arch-rating-split-top">
          <div className="dq-arch-connector dq-arch-connector-down dq-arch-connector-short" />
        </div>
      )}

      <div className="dq-arch-level1-row">
        {arch.map(node => {
          const vIndex = ARCH_LEVEL1_ORDER.indexOf(node.level1) + 1;
          const vi = level1Scores[LEVEL1_V_KEY[node.level1]];
          const participating = node.children.filter(c => matchedIds.has(c.id));
          const childContribSum = participating.reduce((s, ind) => {
            const m = getIndicatorRuleScore(ind, selectedRuleIds);
            return s + (m ? ind.weight * m.score : 0);
          }, 0);
          const vContrib = node.weight * vi;

          return (
            <div key={node.level1} className="dq-arch-level1-col">
              <div
                className="dq-arch-level1-card"
                style={{
                  background: ARCH_LEVEL1_COLOR[node.level1],
                  borderColor: ARCH_LEVEL1_BORDER[node.level1],
                }}
              >
                {layout === 'split' ? (
                  <div className="dq-arch-level1-head">
                    <span className="dq-arch-level1-title">{node.label}</span>
                    <span className="dq-arch-level1-omega">ω={node.weight.toFixed(3)}</span>
                  </div>
                ) : (
                  <>
                    <div className="dq-arch-level1-title">{node.label}</div>
                    <Tag color="blue">ω = {node.weight.toFixed(3)}</Tag>
                  </>
                )}
                <div className="dq-arch-level1-meta">
                  <Tooltip
                    title={
                      <div>
                        <div>
                          V{vIndex} 由本级 {participating.length} 项指标加权合成（Σω×F / Σω）
                        </div>
                        <div>下级 Σω×F = {childContribSum.toFixed(4)}</div>
                        <div>
                          计入综合分：一级权重 {node.weight.toFixed(3)} × V{vIndex} = {vContrib.toFixed(4)}
                        </div>
                      </div>
                    }
                  >
                    <span className="dq-arch-level1-score-line">
                      <Tag color="processing" className="dq-arch-score-tag dq-arch-level1-score-tag">
                        V{vIndex}={vi.toFixed(4)}
                      </Tag>
                      <span className="dq-arch-contrib dq-arch-level1-contrib">→ {vContrib.toFixed(4)}</span>
                    </span>
                  </Tooltip>
                </div>
              </div>
              <div className="dq-arch-connector dq-arch-connector-down dq-arch-connector-short" />

              <div className="dq-arch-level2-stack">
                {node.level1 === 'FORMATION' ? (
                  <div className="dq-arch-type-badge">{formationTypeLabel(pointType)}</div>
                ) : null}
                {participating.length === 0 ? (
                  <Text type="secondary" className="dq-arch-empty">
                    无参与指标
                  </Text>
                ) : (
                  participating.map(ind => {
                    const matched = getIndicatorRuleScore(ind, selectedRuleIds);
                    const contrib = matched ? ind.weight * matched.score : null;
                    return (
                      <Tooltip
                        key={ind.id}
                        title={
                          <div>
                            <div>{ind.code}</div>
                            {matched ? (
                              <>
                                <div>赋分档：{matched.label}</div>
                                <div>
                                  F = {matched.score.toFixed(4)}，ω×F = {contrib!.toFixed(4)}
                                </div>
                              </>
                            ) : (
                              <div>未匹配赋分档</div>
                            )}
                          </div>
                        }
                      >
                        <div className="dq-arch-level2-card dq-arch-level2-card-rated">
                          <div
                            className="dq-arch-weight-bar dq-arch-weight-bar-rated"
                            style={{
                              width: `${Math.min(100, (ind.weight / Math.max(...participating.map(p => p.weight), 0.001)) * 100)}%`,
                            }}
                          />
                          <div className="dq-arch-level2-name">{ind.name}</div>
                          <div className="dq-arch-level2-meta">
                            <span className="dq-arch-weight">ω={ind.weight.toFixed(3)}</span>
                            {matched ? (
                              <>
                                <Tag color="processing" className="dq-arch-score-tag">
                                  F={matched.score.toFixed(2)}
                                </Tag>
                                <span className="dq-arch-contrib">→ {contrib!.toFixed(4)}</span>
                              </>
                            ) : (
                              <Tag color="warning">未匹配</Tag>
                            )}
                          </div>
                        </div>
                      </Tooltip>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
      {layout !== 'split' ? (
        <Text type="secondary" className="dq-arch-rating-hint">
          二级指标分数 F 由普查/全县防灾减灾填报值匹配赋分档；一级因子 Vᵢ 为同级启用指标 ω×F 的加权平均。
        </Text>
      ) : null}
    </div>
  );
};
