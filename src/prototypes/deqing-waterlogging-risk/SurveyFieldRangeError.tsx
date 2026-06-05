import React from 'react';
import { Form, Typography } from 'antd';
import type { AuxiliaryNumericRange, RiskIndicatorRow } from './types';
import { getNumericRangeError } from './numericIndicatorConstraints';

const { Text } = Typography;

interface Props {
  ind: RiskIndicatorRow;
  valueNamePath?: (string | number)[];
  /** 辅助条件数值字段键（与 survey.auxiliaryCondition.fieldKey 一致） */
  numericFieldKey?: string;
  /** 复合子项合理范围（优先于指标编码约束表） */
  numericRange?: AuxiliaryNumericRange;
}

/** 表单项下方仅展示数值超范围等错误（赋分结果见标题后标签） */
function SurveyFieldRangeErrorBody({
  path,
  rangeKey,
  auxForRange,
}: {
  path: (string | number)[];
  rangeKey?: string;
  auxForRange?: Pick<import('./types').IndicatorAuxiliaryConditionField, 'fieldKey' | 'numericRange'>;
}) {
  const form = Form.useFormInstance();
  Form.useWatch(path, form);
  const raw = form.getFieldValue(path);
  const rangeErr = rangeKey ? getNumericRangeError(rangeKey, raw, auxForRange) : null;
  if (!rangeErr) return null;
  return (
    <Text type="danger" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
      {rangeErr}
    </Text>
  );
}

export const SurveyFieldRangeError: React.FC<Props> = ({
  ind,
  valueNamePath,
  numericFieldKey,
  numericRange,
}) => {
  const path =
    valueNamePath ?? ['surveyPayload', 'indicatorValues', ind.survey.fieldKey];
  const rangeKey = numericFieldKey ?? (ind.valueType === 'numeric' ? ind.code : undefined);
  const aux = ind.survey?.auxiliaryCondition;
  const auxForRange = numericRange
    ? { fieldKey: rangeKey ?? '', numericRange }
    : rangeKey && aux?.fieldKey === rangeKey
      ? aux
      : undefined;

  return (
    <SurveyFieldRangeErrorBody path={path} rangeKey={rangeKey} auxForRange={auxForRange} />
  );
};
