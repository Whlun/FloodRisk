import React from 'react';
import { Alert, Typography } from 'antd';
import type { CompositeScoringFlowModel, CompositeScoringFlowPart } from './compositeScoringFlow';
import {
  FlowArrow,
  FlowDiamond,
  FlowNode,
  FlowOutcome,
} from './scoringFlowChartPrimitives';

const { Text } = Typography;

interface Props {
  model: CompositeScoringFlowModel;
  /** 嵌入可视化预览卡片时缩短页脚说明 */
  compactLegend?: boolean;
}

const PartPathChart: React.FC<{ part: CompositeScoringFlowPart }> = ({ part }) => (
  <div className="dq-flowchart__path">
    <FlowNode kind="branch" title={`子项 ${part.index}`} subtitle={part.label} />
    <FlowArrow />
    <FlowNode kind="process" title="读取数值" subtitle={part.sourceLabel} />
    <FlowArrow />
    <FlowNode kind="process" title="按区间匹配" subtitle="先命中先生效" />
    <FlowArrow label="判出 F" />
    {part.tiers.length ? (
      <div className="dq-flowchart__options">
        {part.tiers.map((tier, i) => (
          <FlowOutcome
            key={`${part.index}-tier-${i}`}
            label={`档位 ${i + 1}`}
            tierLabel={tier.note ? `${tier.note} · ${tier.label}` : tier.label}
            score={tier.score}
            tone="opt"
          />
        ))}
      </div>
    ) : (
      <FlowNode kind="process" title="（未配置分档）" />
    )}
  </div>
);

/** 复合数值赋分：流程图只读预览 */
export const CompositeScoringFlowView: React.FC<Props> = ({ model, compactLegend }) => {
  if (!model.configured) {
    return (
      <div className="dq-flowchart dq-flowchart--empty">
        <Text type="secondary">请配置数值子项与分档后查看赋分流程。</Text>
      </div>
    );
  }

  return (
    <div className="dq-flowchart">
      {model.incomplete.length > 0 ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="流程图预览：配置尚未完整"
          description={model.incomplete.join('；')}
        />
      ) : null}

      <div className="dq-flowchart__canvas">
        <FlowNode kind="start" title="开始" subtitle="本指标参与定级/试算" />
        <FlowArrow />
        <FlowNode
          kind="process"
          title="读取各子项数值"
          subtitle={
            model.parts.length
              ? model.parts.map(p => p.label).join('、')
              : '（未配置子项）'
          }
        />
        <FlowArrow label="分路径" />

        <div className="dq-flowchart__paths">
          <div className="dq-flowchart__paths-track">
            {model.parts.map(part => (
              <PartPathChart key={part.index} part={part} />
            ))}
          </div>
        </div>

        <FlowArrow label="汇合" />
        <FlowDiamond text={`各子项 F 如何合并？\n${model.aggregationLabel}`} />
        <FlowArrow label="聚合后" />
        <FlowNode kind="process" title="本指标标准分 F" subtitle="由子项 F 按聚合方式得出" />
        <FlowArrow />
        {model.aggregateTiers.length ? (
          <div className="dq-flowchart__options">
            {model.aggregateTiers.map((tier, i) => (
              <FlowOutcome
                key={`agg-${i}`}
                label={`可能档位 ${i + 1}`}
                tierLabel={tier.displayLabel}
                score={tier.score}
                tone="opt"
              />
            ))}
          </div>
        ) : (
          <FlowNode kind="process" title="（聚合档位待生成）" />
        )}
        <FlowArrow />
        <FlowNode kind="end" title="输出标准分" subtitle="写入本指标赋分结果并参与加权" />
      </div>

      {!compactLegend ? (
        <Text type="secondary" className="dq-flowchart__legend">
          赋分方式：复合数值赋分 · 各子项先按区间判出 F，再{model.aggregationLabel}作为本指标 F；本图为只读预览
        </Text>
      ) : null}
    </div>
  );
};
