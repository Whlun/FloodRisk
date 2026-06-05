import React from 'react';
import { Alert, Typography } from 'antd';
import type { ConditionalScoringFlowBranch, ConditionalScoringFlowModel } from './conditionalScoringFlow';
import {
  FlowArrow,
  FlowDiamond,
  FlowNode,
  FlowOutcome,
} from './scoringFlowChartPrimitives';

const { Text } = Typography;

interface Props {
  model: ConditionalScoringFlowModel;
}

const BranchPathChart: React.FC<{
  branch: ConditionalScoringFlowBranch;
}> = ({ branch }) => (
  <div className="dq-flowchart__path">
    <FlowNode kind="branch" title={`路径 ${branch.index}`} subtitle={branch.label} />
    <FlowArrow />
    <FlowDiamond text={branch.hitCondition} />
    <FlowArrow label="命中后" />

    {branch.isRulesMode ? (
      <>
        <FlowNode kind="process" title="下拉选择赋分档" subtitle="普查/配置填报" />
        <FlowArrow />
        <div className="dq-flowchart__options">
          {branch.tiers.map((tier, i) => (
            <FlowOutcome
              key={`${branch.index}-opt-${i}`}
              label={`选项 ${i + 1}`}
              tierLabel={tier.label}
              score={tier.score}
              tone="opt"
            />
          ))}
        </div>
      </>
    ) : branch.usesNumericBands ? (
      <>
        <FlowNode kind="process" title="按填报值匹配区间" subtitle="自动匹配标准分 F" />
        <FlowArrow />
        <div className="dq-flowchart__options">
          {branch.tiers.map((tier, i) => (
            <FlowOutcome
              key={`${branch.index}-band-${i}`}
              label={`档位 ${i + 1}`}
              tierLabel={tier.note ? `${tier.note} · ${tier.label}` : tier.label}
              score={tier.score}
              tone="opt"
            />
          ))}
        </div>
      </>
    ) : (
      <>
        <FlowDiamond text={branch.compareQuestion ?? '（未配置比较条件）'} />
        <div className="dq-flowchart__fork">
          <div className="dq-flowchart__fork-arm">
            <span className="dq-flowchart__fork-label">是</span>
            <FlowArrow />
            <FlowOutcome
              label="满足"
              tierLabel={branch.metTier?.label ?? '—'}
              score={branch.metTier?.score ?? 0}
              tone="yes"
            />
          </div>
          <div className="dq-flowchart__fork-arm">
            <span className="dq-flowchart__fork-label">否</span>
            <FlowArrow />
            <FlowOutcome
              label="不满足"
              tierLabel={branch.unmetTier?.label ?? '—'}
              score={branch.unmetTier?.score ?? 0}
              tone="no"
            />
          </div>
        </div>
      </>
    )}
  </div>
);

/** 条件赋分：流程图只读预览 */
export const ConditionalScoringFlowView: React.FC<Props> = ({ model }) => {
  if (!model.enabled) {
    return (
      <div className="dq-flowchart dq-flowchart--empty">
        <Text type="secondary">请先在赋分规则 Tab 选择「条件赋分」并完成分支配置后查看流程图。</Text>
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
          title="读取条件"
          subtitle={model.sourceLabel !== '—' ? model.sourceLabel : '（未配置条件来源）'}
        />
        <FlowArrow />
        <FlowDiamond
          text={
            model.branches.length
              ? `哪个分支命中？\n（共 ${model.branches.length} 条，先命中先用）`
              : '（未配置分支）'
          }
        />
        <FlowArrow label="分路径" />

        <div className="dq-flowchart__paths">
          <div className="dq-flowchart__paths-track">
            {model.branches.map(branch => (
              <BranchPathChart key={branch.index} branch={branch} />
            ))}
          </div>
        </div>

        <FlowArrow label="汇合" />
        <FlowNode kind="end" title="输出标准分" subtitle="写入本指标赋分结果并参与加权" />
      </div>

      <Text type="secondary" className="dq-flowchart__legend">
        赋分方式：{model.modeLabel} · 本页为只读预览，修改请切换到「表单配置」；菱形为判断节点
      </Text>
    </div>
  );
};
