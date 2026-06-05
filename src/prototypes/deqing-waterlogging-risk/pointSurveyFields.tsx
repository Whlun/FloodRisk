import React from 'react';
import { Form, InputNumber } from 'antd';
import type { FormInstance } from 'antd';
import type { RiskIndicatorRow } from './types';
import {
  getAuxiliaryCondition,
  getAuxiliaryNumericFromValues,
  shouldCollectAuxiliaryInIndicatorCensus,
  shouldCollectAuxiliaryInSurvey,
} from './compositeConditionalSurvey';
import { AuxiliarySurveyFieldLabel } from './AuxiliarySurveyFieldLabel';
import { SurveyFieldLabel } from './SurveyFieldLabel';
import { SurveyFieldRangeError } from './SurveyFieldRangeError';
import { SurveyValueInput } from './SurveyValueInput';
import {
  createNumericSurveyFormRules,
  createNumericSurveyFormRulesByFieldKey,
  getNumericConstraint,
} from './numericIndicatorConstraints';
import { createDesignPeriodFormRules, isDesignReturnPeriodCode } from './designReturnPeriod';
import { isConditionalScoringEnabled } from './conditionalScoring';
import { renderSurveyFieldGrid } from './surveyFieldLayout';

export type PointSurveyFieldSlot =
  | { kind: 'auxiliary'; ind: RiskIndicatorRow }
  | { kind: 'main'; ind: RiskIndicatorRow };

/** 展开为普查行：辅助条件字段（若配置）+ 主指标 */
export function expandPointSurveyFieldSlots(list: RiskIndicatorRow[]): PointSurveyFieldSlot[] {
  const slots: PointSurveyFieldSlot[] = [];
  for (const ind of list) {
    if (shouldCollectAuxiliaryInIndicatorCensus(ind)) {
      slots.push({ kind: 'auxiliary', ind });
    }
    slots.push({ kind: 'main', ind });
  }
  return slots;
}

function indicatorValuesPath(fieldKey: string): (string | number)[] {
  return ['surveyPayload', 'indicatorValues', fieldKey];
}

function renderAuxiliarySurveyField(
  ind: RiskIndicatorRow,
  readOnly: boolean | undefined,
): React.ReactNode {
  const aux = getAuxiliaryCondition(ind);
  if (!aux) return null;
  const path = indicatorValuesPath(aux.fieldKey);
  const constraint = getNumericConstraint(aux.fieldKey, aux);

  return (
    <Form.Item
      name={path}
      required={ind.survey.surveyRequired}
      label={<AuxiliarySurveyFieldLabel owner={ind} />}
      extra={<SurveyFieldRangeError ind={ind} numericFieldKey={aux.fieldKey} valueNamePath={path} />}
      rules={[
        ...(ind.survey.surveyRequired
          ? [{ required: true, message: `请填写${aux.label}` }]
          : []),
        ...createNumericSurveyFormRulesByFieldKey(aux.fieldKey),
      ]}
    >
      <InputNumber
        className="dq-survey-control-full"
        disabled={readOnly}
        placeholder={constraint?.rangeLabel ?? aux.label}
        min={constraint?.min}
        max={constraint?.max}
        step={constraint?.step}
        precision={constraint?.precision}
        addonAfter={aux.unit || undefined}
      />
    </Form.Item>
  );
}

function needsDesignPeriodSurveyRules(ind: RiskIndicatorRow): boolean {
  if (isDesignReturnPeriodCode(ind.code)) return true;
  return (
    isConditionalScoringEnabled(ind) &&
    ind.conditionalScoring?.source.type === 'appendix_b' &&
    ind.conditionalScoring.source.key === 'areaImportance'
  );
}

function renderMainSurveyField(
  ind: RiskIndicatorRow,
  indicators: RiskIndicatorRow[],
  readOnly: boolean | undefined,
  form: FormInstance,
): React.ReactNode {
  const path = indicatorValuesPath(ind.survey.fieldKey);

  return (
    <Form.Item
      name={path}
      required={ind.survey.surveyRequired}
      label={<SurveyFieldLabel ind={ind} showMatchedScoreTag={false} />}
      extra={<SurveyFieldRangeError ind={ind} valueNamePath={path} />}
      rules={[
        ...(ind.survey.surveyRequired
          ? [{ required: true, message: `请填写${ind.name}或选择暂无数据` }]
          : []),
        ...(shouldCollectAuxiliaryInSurvey(ind)
          ? [
              {
                validator: async () => {
                  const values = form.getFieldValue(['surveyPayload', 'indicatorValues']) as Record<
                    string,
                    string | number | boolean | null
                  > | undefined;
                  if (getAuxiliaryNumericFromValues(values, ind) === undefined) {
                    const auxLabel = ind.survey.auxiliaryCondition?.label ?? '条件字段';
                    throw new Error(`请先填写「${auxLabel}」`);
                  }
                },
              },
            ]
          : []),
        ...(needsDesignPeriodSurveyRules(ind)
          ? createDesignPeriodFormRules(ind, form)
          : createNumericSurveyFormRules(ind)),
      ]}
    >
      <SurveyValueInput
        ind={ind}
        allIndicators={indicators}
        disabled={readOnly}
        auxiliaryInputMode="separate"
      />
    </Form.Item>
  );
}

function renderPointSurveyFieldItem(
  ind: RiskIndicatorRow,
  indicators: RiskIndicatorRow[],
  readOnly: boolean | undefined,
  form: FormInstance,
): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  if (shouldCollectAuxiliaryInIndicatorCensus(ind)) {
    nodes.push(renderAuxiliarySurveyField(ind, readOnly));
  }
  nodes.push(renderMainSurveyField(ind, indicators, readOnly, form));
  return nodes.length === 1 ? nodes[0] : <>{nodes}</>;
}

/** 易涝点指标普查表单项（含辅助条件；遵循整行/成对栅格规则） */
export function renderPointSurveyFieldGrid(
  list: RiskIndicatorRow[],
  indicators: RiskIndicatorRow[],
  readOnly: boolean | undefined,
  form: FormInstance,
): React.ReactNode {
  return renderSurveyFieldGrid(list, ind =>
    renderPointSurveyFieldItem(ind, indicators, readOnly, form),
  );
}
