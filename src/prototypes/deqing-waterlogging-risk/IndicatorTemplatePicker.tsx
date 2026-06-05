import React from 'react';
import { Card, Col, Row, Typography } from 'antd';
import type { RiskIndicatorRow } from './types';
import {
  listTemplatesForValueType,
  SURVEY_VALUE_TYPE_LABEL,
  type IndicatorConfigTemplateId,
} from './indicatorConfigTemplates';

const { Text, Paragraph } = Typography;

interface Props {
  valueType?: RiskIndicatorRow['valueType'];
  selected?: IndicatorConfigTemplateId;
  onSelect: (id: IndicatorConfigTemplateId) => void;
  disabled?: boolean;
}

/** 场景模板大卡片：仅展示与当前「普查填报方式」兼容的赋分规则 */
export const IndicatorTemplatePicker: React.FC<Props> = ({
  valueType = 'enum',
  selected,
  onSelect,
  disabled,
}) => {
  const templates = listTemplatesForValueType(valueType);
  const colSpan = templates.length <= 1 ? 24 : templates.length === 2 ? 12 : 8;

  return (
    <div>
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
        当前普查填报方式为「{SURVEY_VALUE_TYPE_LABEL[valueType]}」，可选以下赋分规则场景：
      </Text>
      <Row gutter={[12, 12]} align="stretch">
        {templates.map(t => {
          const active = selected === t.id;
          return (
            <Col xs={24} sm={colSpan} key={t.id} style={{ display: 'flex' }}>
              <Card
                size="small"
                hoverable={!disabled}
                className={active ? 'dq-template-card dq-template-card--active' : 'dq-template-card'}
                onClick={() => !disabled && onSelect(t.id)}
                style={{
                  borderColor: active ? 'var(--ant-color-primary)' : undefined,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.65 : 1,
                  flex: 1,
                  width: '100%',
                }}
                styles={{
                  body: {
                    height: '100%',
                    minHeight: 88,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                  },
                }}
              >
                <Text strong>{t.title}</Text>
                <Paragraph
                  type="secondary"
                  style={{ fontSize: 12, marginBottom: 0, marginTop: 6, flex: 1 }}
                >
                  {t.description}
                </Paragraph>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};
