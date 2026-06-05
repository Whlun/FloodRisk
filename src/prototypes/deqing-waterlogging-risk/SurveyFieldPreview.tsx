import React, { useMemo } from 'react';
import { Card, Form, Typography } from 'antd';
import type { RiskIndicatorRow } from './types';
import { SurveyValueInput } from './SurveyValueInput';
import {
  getAuxiliaryCondition,
  shouldCollectAuxiliaryInIndicatorCensus,
} from './compositeConditionalSurvey';
import { AuxiliarySurveyFieldLabel } from './AuxiliarySurveyFieldLabel';
import { InputNumber } from 'antd';
import { buildIndicatorRowFromForm } from './indicatorConfigTemplates';
import type { FormInstance } from 'antd';

const { Text } = Typography;

interface Props {
  form: FormInstance;
  editing?: RiskIndicatorRow | null;
  allIndicators: RiskIndicatorRow[];
}

/** 左侧：普查填报控件预览（演示模式，不写入真实普查） */
export const SurveyFieldPreview: React.FC<Props> = ({ form, editing, allIndicators }) => {
  const [previewForm] = Form.useForm();
  const ind = useMemo(() => buildIndicatorRowFromForm(form, editing), [form, editing]);

  const aux = getAuxiliaryCondition(ind);
  const showAuxRow = aux && shouldCollectAuxiliaryInIndicatorCensus(ind);

  const demoValues = useMemo(() => {
    const values: Record<string, string | number | boolean | null> = {};
    if (aux) values[aux.fieldKey] = aux.thresholdPct ?? 5;
    if (ind.survey?.fieldKey) {
      if (ind.valueType === 'enum' && ind.scoreRules[0]?.label) {
        values[ind.survey.fieldKey] = ind.scoreRules[0].label;
      } else if (ind.valueType === 'boolean') {
        values[ind.survey.fieldKey] = false;
      } else if (ind.valueType === 'numeric') {
        values[ind.survey.fieldKey] = 1;
      }
    }
    return values;
  }, [ind, aux]);

  return (
    <Card size="small" title="普查填报预览" className="dq-indicator-preview-card">
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
        示意当前指标在「指标普查」中的填报形态（演示数据，不影响真实记录）。
      </Text>
      <Form form={previewForm} layout="vertical" initialValues={{ surveyPayload: { indicatorValues: demoValues } }}>
        {showAuxRow && aux ? (
          <Form.Item label={<AuxiliarySurveyFieldLabel owner={ind} />}>
            <InputNumber
              className="dq-survey-control-full"
              value={demoValues[aux.fieldKey] as number}
              disabled
              addonAfter={aux.unit || undefined}
            />
          </Form.Item>
        ) : null}
        <Form.Item label={ind.name || '主指标'}>
          <SurveyValueInput
            ind={ind}
            allIndicators={allIndicators}
            disabled
            value={demoValues[ind.survey?.fieldKey ?? '']}
            auxiliaryInputMode={showAuxRow ? 'separate' : 'inline'}
          />
        </Form.Item>
      </Form>
    </Card>
  );
};
