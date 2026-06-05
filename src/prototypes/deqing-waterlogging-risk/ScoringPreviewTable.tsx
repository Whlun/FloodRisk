import React, { useMemo } from 'react';
import { Card, Table, Tag, Typography } from 'antd';
import type { RiskIndicatorRow } from './types';
import { resolveScoringRuleMode, SCORING_RULE_MODE_LABEL } from './scoringRuleMode';
import { isConditionalScoringEnabled } from './conditionalScoring';
import { isCompositeAppendixNumericSurvey } from './appendixBSurveyBinding';
import { buildIndicatorRowFromForm } from './indicatorConfigTemplates';
import { describeNumericMatch } from './scoreRuleNumericBands';
import type { FormInstance } from 'antd';

const { Text } = Typography;

interface Props {
  form: FormInstance;
  editing?: RiskIndicatorRow | null;
}

/** 右侧：赋分规则与标准分 F 对照预览 */
export const ScoringPreviewTable: React.FC<Props> = ({ form, editing }) => {
  const ind = useMemo(() => buildIndicatorRowFromForm(form, editing), [form, editing]);
  const mode = resolveScoringRuleMode(ind);
  const isComposite = isCompositeAppendixNumericSurvey(ind);

  const rows = useMemo(() => {
    if (mode === 'conditional' && isConditionalScoringEnabled(ind)) {
      return (ind.conditionalScoring?.branches ?? []).flatMap((b, bi) => {
        const rules = b.scoreRules ?? [];
        if (!rules.length) {
          return [{ key: `b${bi}`, branch: b.label, tier: '—', score: '—' }];
        }
        return rules.map((r, ri) => ({
          key: `b${bi}-r${ri}`,
          branch: b.label,
          tier: r.label,
          score: r.score.toFixed(2),
        }));
      });
    }
    if (isComposite) {
      const agg = ind.survey?.compositeAggregation === 'min_f' ? '取 F 较小' : '取 F 较大';
      return (ind.scoreRules ?? []).map((r, i) => ({
        key: `agg-${i}`,
        branch: `聚合（${agg}）`,
        tier: r.label,
        score: r.score.toFixed(2),
      }));
    }
    return (ind.scoreRules ?? []).map((r, i) => ({
      key: `u-${i}`,
      branch: '统一赋分',
      tier: r.label || '（未填写）',
      match: r.numericMatch ? describeNumericMatch(r.numericMatch) : '—',
      score: Number.isFinite(r.score) ? r.score.toFixed(2) : '—',
    }));
  }, [ind, mode, isComposite]);

  const showMatchCol = ind.valueType === 'numeric' && mode === 'uniform';

  return (
    <Card size="small" title="赋分对照预览" className="dq-indicator-preview-card">
      <div style={{ marginBottom: 8 }}>
        <Tag>{SCORING_RULE_MODE_LABEL[mode]}</Tag>
      </div>
      <Table
        size="small"
        pagination={false}
        dataSource={rows}
        locale={{ emptyText: '请配置赋分档或条件分支' }}
        columns={[
          { title: '分支', dataIndex: 'branch', width: 88, ellipsis: true },
          { title: '分档/选项', dataIndex: 'tier', ellipsis: true },
          ...(showMatchCol
            ? [{ title: '匹配区间', dataIndex: 'match', width: 120, ellipsis: true }]
            : []),
          { title: '标准分 F', dataIndex: 'score', width: 72 },
        ]}
      />
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
        {isComposite
          ? '上表为聚合后的可能档位摘要；完整判档路径请在下方「赋分规则」切换到「流程预览」。'
          : '普查填报后将按上表自动匹配评估指标分数。'}
      </Text>
    </Card>
  );
};
