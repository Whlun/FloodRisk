import React from 'react';
import { Form, InputNumber } from 'antd';
import type { RiskIndicatorRow } from './types';
import { getConditionMissingMessage, resolveConditionValue } from './conditionalScoring';
import type { SurveyControlBindProps } from './SurveyValueInput';
import {
  buildScoreMatchContextFromForm,
  getConditionSourceWatchPath,
  type ConditionalFormVariant,
} from './conditionalFormPaths';
import { getNumericConstraint } from './numericIndicatorConstraints';

interface Props extends SurveyControlBindProps {
  ind: RiskIndicatorRow;
  valueNamePath?: (string | number)[];
  formVariant?: ConditionalFormVariant;
  allIndicators?: RiskIndicatorRow[];
}

/** 条件赋分 branch_threshold：须先满足条件来源再填数值 */
export const ConditionalThresholdSurveyInput: React.FC<Props> = ({
  ind,
  value,
  onChange,
  disabled: formDisabled,
  formVariant = 'survey',
  allIndicators,
}) => {
  const form = Form.useFormInstance();
  const cfg = ind.conditionalScoring;
  const source = cfg?.source ?? { type: 'appendix_b', key: 'areaImportance' };
  const sourcePath = getConditionSourceWatchPath(formVariant, source.type, source.key);

  Form.useWatch(sourcePath, form);
  const c = getNumericConstraint(ind.code);

  const context = buildScoreMatchContextFromForm(form, formVariant);
  const condVal = resolveConditionValue(source, context, allIndicators);
  const ready = condVal !== undefined && condVal !== null && condVal !== '';

  const numValue =
    value === undefined || value === null || value === ''
      ? null
      : typeof value === 'number'
        ? value
        : Number(value);

  return (
    <InputNumber
      className="dq-survey-control-full"
      value={Number.isNaN(numValue as number) ? null : numValue}
      onChange={v => onChange?.(v ?? null)}
      disabled={formDisabled || !ready}
      placeholder={
        ready ? ind.survey.placeholder ?? '请输入数值' : getConditionMissingMessage(ind, allIndicators, formVariant)
      }
      min={c?.min}
      max={c?.max}
      step={c?.step ?? 1}
      precision={c?.precision ?? 0}
    />
  );
};
