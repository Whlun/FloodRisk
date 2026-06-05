import React, { useEffect } from 'react';
import { Form, InputNumber, Select, Typography } from 'antd';
import type { RiskIndicatorRow } from './types';
import {
  getAuxiliaryBranchSelectOptions,
  getAuxiliaryCondition,
  getAuxiliaryNumericFromValues,
  isLabelValidForAuxiliaryBranch,
} from './compositeConditionalSurvey';
import { getNumericConstraint } from './numericIndicatorConstraints';
import type { SurveyControlBindProps } from './SurveyValueInput';
import type { ConditionalFormVariant } from './conditionalFormPaths';

const { Text } = Typography;

function indicatorValuesPrefix(formVariant: ConditionalFormVariant): (string | number)[] {
  return formVariant === 'prevention' ? ['indicatorValues'] : ['surveyPayload', 'indicatorValues'];
}

/** 辅助条件 + 主指标分档；auxiliaryInputMode=separate 时纵坡等在指标普查独立行填报 */
export const CompositeConditionalSurveyInput: React.FC<
  {
    ind: RiskIndicatorRow;
    formVariant?: ConditionalFormVariant;
    auxiliaryInputMode?: 'inline' | 'separate';
  } & SurveyControlBindProps
> = ({
  ind,
  value,
  onChange,
  disabled,
  formVariant = 'survey',
  auxiliaryInputMode = 'inline',
}) => {
  const form = Form.useFormInstance();
  const aux = getAuxiliaryCondition(ind);
  const prefix = indicatorValuesPrefix(formVariant);
  const slopePath = aux ? [...prefix, aux.fieldKey] : prefix;
  const collectPath = [...prefix, ind.survey.fieldKey];

  const slopeRaw = aux ? Form.useWatch(slopePath, form) : undefined;
  const collectRaw = Form.useWatch(collectPath, form);
  const boundCollect = value !== undefined ? value : collectRaw;

  const slope =
    slopeRaw === undefined || slopeRaw === null || slopeRaw === ''
      ? undefined
      : typeof slopeRaw === 'number'
        ? slopeRaw
        : parseFloat(String(slopeRaw));

  const options = getAuxiliaryBranchSelectOptions(ind, slope);
  const slopeConstraint = aux ? getNumericConstraint(aux.fieldKey, aux) : undefined;

  useEffect(() => {
    if (ind.valueType === 'numeric') return;
    if (boundCollect == null || boundCollect === '') return;
    if (!isLabelValidForAuxiliaryBranch(ind, String(boundCollect), slope)) {
      if (onChange) onChange(undefined);
      else form.setFieldValue(collectPath, undefined);
    }
  }, [slope, boundCollect, form, collectPath, onChange, ind]);

  const auxLabel = aux?.label ?? '条件指标';
  const collectPlaceholder =
    slope === undefined || Number.isNaN(slope)
      ? `请先填写${auxLabel}`
      : `请选择${ind.name}分档`;

  const selectValue =
    boundCollect === undefined || boundCollect === null || boundCollect === ''
      ? undefined
      : String(boundCollect);

  if (!aux) {
    return (
      <Select
        className="dq-survey-control-full"
        allowClear
        disabled={disabled}
        placeholder="请选择分档"
        value={selectValue}
        onChange={v => {
          if (onChange) onChange(v ?? null);
          else form.setFieldValue(collectPath, v ?? undefined);
        }}
        options={ind.scoreRules.map(r => ({ value: r.label, label: r.label }))}
      />
    );
  }

  if (auxiliaryInputMode === 'separate') {
    if (ind.valueType === 'numeric') {
      const mainConstraint = getNumericConstraint(ind.code);
      const numValue =
        boundCollect === undefined || boundCollect === null || boundCollect === ''
          ? null
          : typeof boundCollect === 'number'
            ? boundCollect
            : Number(boundCollect);
      const mainPlaceholder =
        slope === undefined || Number.isNaN(slope)
          ? `请先填写${auxLabel}`
          : mainConstraint?.rangeLabel ?? '请输入数值';
      return (
        <InputNumber
          className="dq-survey-control-full"
          disabled={disabled || slope === undefined || Number.isNaN(slope)}
          value={Number.isNaN(numValue as number) ? null : numValue}
          onChange={v => {
            if (onChange) onChange(v ?? null);
            else form.setFieldValue(collectPath, v ?? null);
          }}
          placeholder={mainPlaceholder}
          min={mainConstraint?.min}
          max={mainConstraint?.max}
          step={mainConstraint?.step}
          precision={mainConstraint?.precision}
          addonAfter={ind.unit || undefined}
        />
      );
    }
    return (
      <Select
        className="dq-survey-control-full"
        allowClear
        placeholder={collectPlaceholder}
        disabled={disabled || slope === undefined || Number.isNaN(slope)}
        value={selectValue}
        onChange={v => {
          if (onChange) onChange(v ?? null);
          else form.setFieldValue(collectPath, v ?? undefined);
        }}
        options={options as { value: string; label: string; disabled?: boolean }[]}
        popupMatchSelectWidth={440}
        listHeight={280}
      />
    );
  }

  return (
    <div className="dq-fm-ll-collect-survey">
      <div className="dq-fm-ll-collect-survey__slope">
        <Text type="secondary" className="dq-fm-ll-collect-survey__slope-label">
          {aux.label}（条件赋分依据，非独立指标）
        </Text>
        <Form.Item name={slopePath} noStyle>
          <InputNumber
            className="dq-survey-control-full"
            disabled={disabled}
            placeholder={slopeConstraint?.rangeLabel ?? aux.label}
            min={slopeConstraint?.min}
            max={slopeConstraint?.max}
            step={slopeConstraint?.step}
            precision={slopeConstraint?.precision}
            addonAfter={aux.unit || undefined}
          />
        </Form.Item>
      </div>
      {ind.valueType === 'numeric' ? (
        <InputNumber
          className="dq-survey-control-full dq-fm-ll-collect-survey__select"
          disabled={disabled || slope === undefined || Number.isNaN(slope)}
          value={
            boundCollect === undefined || boundCollect === null || boundCollect === ''
              ? null
              : typeof boundCollect === 'number'
                ? boundCollect
                : Number(boundCollect)
          }
          onChange={v => {
            if (onChange) onChange(v ?? null);
            else form.setFieldValue(collectPath, v ?? null);
          }}
          placeholder={
            slope === undefined || Number.isNaN(slope)
              ? `请先填写${auxLabel}`
              : getNumericConstraint(ind.code)?.rangeLabel ?? '请输入数值'
          }
          min={getNumericConstraint(ind.code)?.min}
          max={getNumericConstraint(ind.code)?.max}
          step={getNumericConstraint(ind.code)?.step}
          precision={getNumericConstraint(ind.code)?.precision}
          addonAfter={ind.unit || undefined}
        />
      ) : (
        <Select
          className="dq-survey-control-full dq-fm-ll-collect-survey__select"
          allowClear
          placeholder={collectPlaceholder}
          disabled={disabled || slope === undefined || Number.isNaN(slope)}
          value={selectValue}
          onChange={v => {
            if (onChange) onChange(v ?? null);
            else form.setFieldValue(collectPath, v ?? undefined);
          }}
          options={options as { value: string; label: string; disabled?: boolean }[]}
          popupMatchSelectWidth={440}
          listHeight={280}
        />
      )}
    </div>
  );
};

export function readAuxiliaryNumericFromFormContext(
  ind: RiskIndicatorRow,
  indicatorValues: Record<string, string | number | boolean | null | undefined> | undefined,
): number | undefined {
  return getAuxiliaryNumericFromValues(indicatorValues, ind);
}
