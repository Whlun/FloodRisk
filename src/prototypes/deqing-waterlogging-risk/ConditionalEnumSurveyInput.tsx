import React, { useEffect } from 'react';
import { Form, Select } from 'antd';
import type { RiskIndicatorRow } from './types';
import {
  SURVEY_BASIC_INFO_SOURCE_LABEL,
  resolveActiveBranch,
  resolveConditionValue,
} from './conditionalScoring';
import type { ScoreMatchContext } from './conditionalScoring';
import type { SurveyControlBindProps } from './SurveyValueInput';
import {
  buildScoreMatchContextFromForm,
  getConditionSourceWatchPath,
  type ConditionalFormVariant,
} from './conditionalFormPaths';

interface Props extends SurveyControlBindProps {
  ind: RiskIndicatorRow;
  valueNamePath: (string | number)[];
  formVariant?: ConditionalFormVariant;
  allIndicators?: RiskIndicatorRow[];
}

/** 枚举/是·否条件赋分：下拉选项随条件分支联动 */
export const ConditionalEnumSurveyInput: React.FC<Props> = ({
  ind,
  value,
  onChange,
  disabled: formDisabled,
  valueNamePath,
  formVariant = 'survey',
  allIndicators,
}) => {
  const form = Form.useFormInstance();
  const cfg = ind.conditionalScoring;
  const sourceKey = cfg?.source.key ?? 'areaImportance';
  const sourceType = cfg?.source.type ?? 'appendix_b';
  const sourcePath = getConditionSourceWatchPath(formVariant, sourceType, sourceKey);

  Form.useWatch(sourcePath, form);
  const valueRaw = Form.useWatch(valueNamePath, form);
  const boundValue = value !== undefined ? value : valueRaw;

  const context: ScoreMatchContext = buildScoreMatchContextFromForm(form, formVariant);

  const branch = cfg?.enabled ? resolveActiveBranch(cfg, context, allIndicators) : null;
  const rules = branch?.scoreRules ?? [];

  const options = rules.length
    ? rules.map(r => ({ value: r.label, label: r.label, disabled: false }))
    : (ind.scoreRules ?? []).map(r => ({ value: r.label, label: r.label, disabled: true }));

  const condVal = resolveConditionValue(
    cfg?.source ?? { type: 'appendix_b', key: 'areaImportance' },
    context,
    allIndicators,
  );
  const hasCondition =
    condVal !== undefined && condVal !== null && condVal !== '' && !Number.isNaN(Number(condVal) ? Number(condVal) : 0);

  useEffect(() => {
    if (boundValue == null || boundValue === '') return;
    if (!rules.some(r => r.label === String(boundValue))) {
      if (onChange) onChange(undefined);
      else form.setFieldValue(valueNamePath, undefined);
    }
  }, [branch?.id, boundValue, form, valueNamePath, rules, onChange]);

  const selectValue =
    boundValue === undefined || boundValue === null || boundValue === ''
      ? undefined
      : String(boundValue);

  const placeholder =
    !hasCondition && cfg?.source.type === 'appendix_b'
      ? `请先填写${SURVEY_BASIC_INFO_SOURCE_LABEL}中的「地区重要程度」`
      : !hasCondition
        ? formVariant === 'prevention'
          ? '请先填写同组防灾减灾条件指标'
          : '请先填写条件指标'
        : '请选择本分支选项';

  return (
    <Select
      className="dq-survey-control-full"
      allowClear
      value={selectValue}
      onChange={v => {
        if (onChange) onChange(v ?? null);
        else form.setFieldValue(valueNamePath, v ?? undefined);
      }}
      placeholder={placeholder}
      disabled={formDisabled || !branch || rules.length === 0}
      options={options}
      popupMatchSelectWidth={440}
      listHeight={280}
    />
  );
};
