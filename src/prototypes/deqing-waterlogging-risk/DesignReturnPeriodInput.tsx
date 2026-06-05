import React from 'react';
import { Form, InputNumber } from 'antd';
import type { AreaImportance, RiskIndicatorRow } from './types';
import { getNumericConstraint } from './numericIndicatorConstraints';

interface Props {
  ind: RiskIndicatorRow;
}

/** 排水系统设计重现期：输入 P（年）；阈值说明见标签 ? */
export const DesignReturnPeriodInput: React.FC<Props> = ({ ind }) => {
  const area = Form.useWatch(['surveyPayload', 'appendixB', 'areaImportance']) as
    | AreaImportance
    | undefined;
  const c = getNumericConstraint(ind.code);

  return (
    <InputNumber
      className="dq-survey-control-full"
      disabled={!area}
      placeholder={area ? '重现期 P' : '请先在基本信息中填写地区重要程度'}
      min={c?.min}
      max={c?.max}
      step={c?.step ?? 1}
      precision={c?.precision ?? 0}
    />
  );
};
