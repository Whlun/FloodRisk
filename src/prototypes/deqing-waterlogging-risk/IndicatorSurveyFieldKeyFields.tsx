import React from 'react';
import { Col, Form, Input, Row } from 'antd';
import { formLabelWithHelp, SURVEY_FIELD_KEY_HELP } from './FormLabelHelpTip';

interface Props {
  disabled?: boolean;
  /** 字段键是已采集数据的存储主键；编辑存量指标时禁止改名，避免历史原值失联。 */
  fieldKeyLocked?: boolean;
}

/** 普查字段键与占位说明（放在基本信息，与指标编码同级配置） */
export const IndicatorSurveyFieldKeyFields: React.FC<Props> = ({ disabled, fieldKeyLocked }) => (
  <Row gutter={16}>
    <Col xs={24} sm={12}>
      <Form.Item
        name={['survey', 'fieldKey']}
        label={formLabelWithHelp('普查字段键', SURVEY_FIELD_KEY_HELP, '普查字段键说明')}
      >
        <Input
          disabled={disabled || fieldKeyLocked}
          placeholder="与 indicatorValues 键一致"
          title={fieldKeyLocked ? '已有指标的普查字段键已锁定，避免历史采集值失联' : undefined}
        />
      </Form.Item>
    </Col>
    <Col xs={24} sm={12}>
      <Form.Item name={['survey', 'placeholder']} label="表单项占位说明">
        <Input disabled={disabled} placeholder="普查表单项内的提示文案（可选）" />
      </Form.Item>
    </Col>
  </Row>
);
