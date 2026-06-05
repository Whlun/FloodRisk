import React from 'react';
import { Alert, InputNumber, Select } from 'antd';
import type { RiskIndicatorRow } from './types';
import { buildEnumSurveySelectOptions, enumSurveySelectUsesRichOptions } from './surveyFieldHints';
import type { EnumSurveyOption } from './surveyFieldHints';
import { getNumericConstraint } from './numericIndicatorConstraints';
import { buildBooleanSurveyOptions } from './booleanSurveyOptions';
import {
  canUseConditionalScoringInForm,
  isConditionalScoringEnabled,
  validateConditionalScoringScope,
} from './conditionalScoring';
import { ConditionalEnumSurveyInput } from './ConditionalEnumSurveyInput';
import { ConditionalThresholdSurveyInput } from './ConditionalThresholdSurveyInput';
import type { ConditionalFormVariant } from './conditionalFormPaths';
import { hasAuxiliaryConditionSurvey } from './compositeConditionalSurvey';
import { CompositeConditionalSurveyInput } from './RainwaterCollectCapacityInput';

/** Form.Item 注入的受控属性，须传给底层 Select / InputNumber */
export type SurveyControlBindProps = {
  value?: string | number | boolean | null;
  onChange?: (value: string | number | boolean | null | undefined) => void;
  /** 表单 disabled（详情只读）时由 Form.Item 注入，须与条件联动 disabled 合并 */
  disabled?: boolean;
};

function SurveyEnumSelect({
  ind,
  value,
  onChange,
  disabled,
}: { ind: RiskIndicatorRow } & SurveyControlBindProps) {
  const rich = enumSurveySelectUsesRichOptions(ind);
  const options = buildEnumSurveySelectOptions(ind);
  const selectValue =
    value === undefined || value === null || value === '' ? undefined : String(value);
  const selectedRef = options.find(o => o.value === selectValue)?.ref;
  return (
    <div>
      <Select<string, EnumSurveyOption>
        className="dq-survey-control-full"
        disabled={disabled}
        allowClear
        value={selectValue}
        onChange={v => onChange?.(v ?? null)}
        placeholder={rich ? '请选择风险分级' : '请选择'}
        options={options}
        popupMatchSelectWidth={rich ? 440 : undefined}
        listHeight={rich ? 320 : undefined}
        optionRender={
          rich
            ? opt => (
                <div style={{ whiteSpace: 'normal', padding: '4px 0' }}>
                  <div style={{ fontWeight: 500 }}>{opt.label}</div>
                  {opt.data?.ref ? (
                    <div
                      style={{
                        fontSize: 12,
                        color: 'rgba(0,0,0,0.45)',
                        marginTop: 4,
                        lineHeight: 1.5,
                      }}
                    >
                      {opt.data.ref}
                    </div>
                  ) : null}
                </div>
              )
            : undefined
        }
      />
      {rich && selectedRef ? (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: 'var(--ant-color-text-secondary)',
            lineHeight: 1.55,
          }}
        >
          {selectedRef}
        </div>
      ) : null}
    </div>
  );
}

interface SurveyValueInputProps extends SurveyControlBindProps {
  ind: RiskIndicatorRow;
  formVariant?: ConditionalFormVariant;
  allIndicators?: RiskIndicatorRow[];
  valueNamePath?: (string | number)[];
  /** separate：辅助条件已在指标普查独立行填报，此处仅渲染主指标分档 */
  auxiliaryInputMode?: 'inline' | 'separate';
}

/** 按指标 valueType 渲染普查/防灾减灾填报控件 */
export const SurveyValueInput: React.FC<SurveyValueInputProps> = ({
  ind,
  value,
  onChange,
  disabled,
  formVariant = 'survey',
  allIndicators = [],
  valueNamePath: valueNamePathProp,
  auxiliaryInputMode = 'inline',
}) => {
  const valueNamePath =
    valueNamePathProp ??
    (formVariant === 'prevention'
      ? ['indicatorValues', ind.survey.fieldKey]
      : ['surveyPayload', 'indicatorValues', ind.survey.fieldKey]);

  if (hasAuxiliaryConditionSurvey(ind)) {
    return (
      <CompositeConditionalSurveyInput
        ind={ind}
        value={value}
        onChange={onChange}
        disabled={disabled}
        formVariant={formVariant}
        auxiliaryInputMode={auxiliaryInputMode}
      />
    );
  }

  const conditionalOk =
    isConditionalScoringEnabled(ind) &&
    canUseConditionalScoringInForm(ind, formVariant, allIndicators);
  const scopeError = validateConditionalScoringScope(ind, allIndicators);

  if (isConditionalScoringEnabled(ind) && !conditionalOk) {
    return (
      <>
        {scopeError ? (
          <Alert type="warning" showIcon message={scopeError} style={{ marginBottom: 8 }} />
        ) : null}
        <SurveyEnumSelect ind={ind} value={value} onChange={onChange} disabled={disabled} />
      </>
    );
  }

  if (ind.valueType === 'boolean') {
    const options = buildBooleanSurveyOptions(ind);
    const boolValue =
      value === undefined || value === null || value === ''
        ? undefined
        : value === true || value === 'true';
    return (
      <Select<boolean, { value: boolean; label: string }>
        className="dq-survey-control-full"
        disabled={disabled}
        allowClear
        value={boolValue}
        onChange={v => onChange?.(v ?? null)}
        placeholder="请选择"
        options={options}
      />
    );
  }
  if (
    ind.valueType === 'numeric' &&
    conditionalOk &&
    ind.conditionalScoring?.mode === 'branch_threshold'
  ) {
    return (
      <ConditionalThresholdSurveyInput
        ind={ind}
        value={value}
        onChange={onChange}
        disabled={disabled}
        valueNamePath={valueNamePath}
        formVariant={formVariant}
        allIndicators={allIndicators}
      />
    );
  }
  if (conditionalOk && ind.conditionalScoring?.mode === 'branch_rules') {
    return (
      <ConditionalEnumSurveyInput
        ind={ind}
        value={value}
        onChange={onChange}
        disabled={disabled}
        valueNamePath={valueNamePath}
        formVariant={formVariant}
        allIndicators={allIndicators}
      />
    );
  }
  if (ind.valueType === 'numeric') {
    const c = getNumericConstraint(ind.code);
    const numValue =
      value === undefined || value === null || value === ''
        ? null
        : typeof value === 'number'
          ? value
          : Number(value);
    return (
      <InputNumber
        className="dq-survey-control-full"
        disabled={disabled}
        value={Number.isNaN(numValue as number) ? null : numValue}
        onChange={v => onChange?.(v ?? null)}
        placeholder={c ? c.rangeLabel : ind.survey.placeholder ?? '数值'}
        min={c?.min}
        max={c?.max}
        step={c?.step}
        precision={c?.precision}
      />
    );
  }
  return <SurveyEnumSelect ind={ind} value={value} onChange={onChange} disabled={disabled} />;
};
