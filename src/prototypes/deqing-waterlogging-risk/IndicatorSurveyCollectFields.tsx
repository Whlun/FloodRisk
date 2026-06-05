import React from 'react';
import { Col, Form, Row, Switch, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';

interface Props {
  disabled?: boolean;
}

/** 普查参与范围：放在基本信息（与赋分规则分步） */
export const IndicatorSurveyCollectFields: React.FC<Props> = ({ disabled }) => (
  <Row gutter={16}>
    <Col xs={24} sm={12}>
      <Form.Item
        name={['survey', 'collectInSurvey']}
        label="参与内涝普查定级"
        valuePropName="checked"
        initialValue={true}
      >
        <Switch disabled={disabled} />
      </Form.Item>
    </Col>
    <Col xs={24} sm={12}>
      <Form.Item
        name={['survey', 'surveyRequired']}
        label={
          <span>
            普查时必填
            <Tooltip title="勾选后该指标必定出现在普查填报表（与架构图是否启用无关），且保存时校验必填。定级计分仅统计架构图中已启用的指标。">
              <QuestionCircleOutlined
                style={{ marginLeft: 6, color: 'rgba(0,0,0,0.45)', fontSize: 13, cursor: 'help' }}
              />
            </Tooltip>
          </span>
        }
        valuePropName="checked"
        initialValue={false}
      >
        <Switch disabled={disabled} />
      </Form.Item>
    </Col>
  </Row>
);
