import React, { useMemo } from 'react';
import { Divider, Form, Input, Segmented, Typography } from 'antd';
import type { FormInstance } from 'antd';
import type { RiskIndicatorRow } from './types';
import { ConditionalScoringEditor } from './ConditionalScoringEditor';
import { CompositeAppendixRulesPanel } from './CompositeAppendixRulesPanel';
import {
  SCORING_RULE_MODE_HINT,
  SCORING_RULE_MODE_LABEL,
  applyScoringRuleMode,
  canEditScoringRuleMode,
  resolveScoringRuleMode,
  type ScoringRuleMode,
} from './scoringRuleMode';
import { getRulesTabHint, getIndicatorScoringProfile } from './indicatorScoringProfile';
import { DesignReturnPeriodScoreRulesPanel } from './DesignReturnPeriodScoreRulesPanel';
import {
  getIndicatorConfigTemplateMeta,
  type IndicatorConfigTemplateId,
} from './indicatorConfigTemplates';

const { Text } = Typography;

interface Props {
  form: FormInstance;
  defaultIndicators: RiskIndicatorRow[];
  indicators: RiskIndicatorRow[];
  valueType: RiskIndicatorRow['valueType'];
  surveyScope: 'point' | 'region';
  code?: string;
  detailOnly?: boolean;
  idPrefix: string;
  scoreRulesSection: React.ReactNode;
  /** 已在上方场景卡片选定赋分方式时，默认隐藏下方三选一，避免重复配置 */
  scenarioTemplateId?: IndicatorConfigTemplateId;
  /** 新建向导：隐藏赋分方式说明与「赋分配置」分割标题 */
  compactLayout?: boolean;
  /** 打开弹窗时的指标行，供流程预览回退读取条件赋分 */
  editing?: RiskIndicatorRow | null;
}

export const ScoringRulesTabPanel: React.FC<Props> = ({
  form,
  defaultIndicators,
  indicators,
  valueType,
  surveyScope,
  code,
  detailOnly,
  idPrefix,
  scoreRulesSection,
  scenarioTemplateId,
  compactLayout = false,
  editing,
}) => {
  const surveyWatch = Form.useWatch('survey', form);
  const conditionalWatch = Form.useWatch('conditionalScoring', form);
  const scoringRuleModeWatch = Form.useWatch('scoringRuleMode', form) as ScoringRuleMode | undefined;
  const mode = useMemo(
    () =>
      resolveScoringRuleMode({
        scoringRuleMode: scoringRuleModeWatch,
        survey: surveyWatch,
        conditionalScoring: conditionalWatch,
      }),
    [scoringRuleModeWatch, surveyWatch, conditionalWatch],
  );
  const profile = getIndicatorScoringProfile({ code: code ?? '', valueType, survey: surveyWatch });
  const rulesHint = getRulesTabHint(profile, surveyWatch ? { survey: surveyWatch } : undefined);
  const modeEditable = canEditScoringRuleMode(
    { code: code ?? '', valueType, survey: surveyWatch },
    defaultIndicators,
  );

  const scenarioMeta = scenarioTemplateId
    ? getIndicatorConfigTemplateMeta(scenarioTemplateId)
    : undefined;
  const scenarioLocksMode = Boolean(scenarioMeta && scenarioMeta.scoringRuleMode === mode);

  const modeOptions: { value: ScoringRuleMode; label: string }[] = [
    { value: 'uniform', label: SCORING_RULE_MODE_LABEL.uniform },
    { value: 'conditional', label: SCORING_RULE_MODE_LABEL.conditional },
    { value: 'composite', label: SCORING_RULE_MODE_LABEL.composite },
  ];

  const onModeChange = (next: ScoringRuleMode) => {
    if (next === mode) return;
    form.setFieldValue('configTemplateId', undefined);
    applyScoringRuleMode(form, next, valueType);
    form.setFieldValue('scoringRuleMode', next);
  };

  return (
    <>
      {!scenarioLocksMode ? (
        <>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
            赋分方式（三选一）
          </Text>
          <Segmented
            block
            disabled={detailOnly || !modeEditable}
            value={mode}
            options={modeOptions}
            onChange={v => onModeChange(v as ScoringRuleMode)}
            style={{ marginBottom: 8 }}
          />
        </>
      ) : null}

      {compactLayout ? null : (
        <>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
            {SCORING_RULE_MODE_HINT[mode]}
            {rulesHint ? ` ${rulesHint}` : ''}
          </Text>
          <Divider plain style={{ margin: '4px 0 12px' }}>
            赋分配置
          </Divider>
        </>
      )}

      {mode === 'conditional' ? (
        <>
          {profile === 'design_period_by_area' && code ? (
            <DesignReturnPeriodScoreRulesPanel code={code} form={form} idPrefix={idPrefix} />
          ) : null}
          <Divider plain style={{ margin: '0 0 8px' }}>
            条件赋分配置
          </Divider>
          <ConditionalScoringEditor
            form={form}
            valueType={valueType}
            surveyScope={surveyScope}
            allIndicators={indicators}
            defaultIndicators={defaultIndicators}
            selfCode={code}
            detailOnly={detailOnly}
            idPrefix={idPrefix}
            drivenByScoringRuleMode
            scenarioTemplateId={scenarioTemplateId}
            configSnapshot={editing?.conditionalScoring}
          />
        </>
      ) : null}

      {mode === 'composite' ? (
        <>
          <Divider plain style={{ margin: '0 0 8px' }}>
            复合数值赋分配置
          </Divider>
          <CompositeAppendixRulesPanel
            form={form}
            defaultIndicators={defaultIndicators}
            allIndicators={indicators}
            code={code}
            detailOnly={detailOnly}
            editingSnapshot={
              editing
                ? {
                    code: editing.code,
                    survey: editing.survey,
                    scoreRules: editing.scoreRules,
                  }
                : null
            }
          />
        </>
      ) : null}

      {mode === 'uniform' ? (
        <>
          {compactLayout ? (
            valueType === 'numeric' && scenarioTemplateId === 'numeric_uniform' ? (
              <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
                普查填写数值；为每档配置匹配区间后，系统按填报值自动命中标准分 F（自上而下先命中先生效）。
              </Text>
            ) : null
          ) : (
            <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
              {valueType === 'numeric'
                ? '数值型：先配置匹配区间与标准分，分档描述将自动生成（可改）；枚举/是·否仅需填写分档描述。'
                : '枚举型分档描述即普查下拉选项。'}
            </Text>
          )}
          {scoreRulesSection}
        </>
      ) : null}

      {mode === 'conditional' && !compactLayout ? (
        <Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: 12 }}>
          已开启条件赋分，赋分档请在上方各条件分支中分别配置。
        </Text>
      ) : null}
    </>
  );
};
