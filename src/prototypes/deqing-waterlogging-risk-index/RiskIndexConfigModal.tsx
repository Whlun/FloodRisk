import React, { useEffect, useMemo } from 'react';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Col, Divider, Form, InputNumber, Modal, Row, Space, Switch, Typography, message } from 'antd';
import { RiskIndexFormulaContent } from './RiskIndexFormulaContent';
import {
  DEFAULT_RISK_INDEX_CONFIG,
  createDurationRuleId,
  getRiskIndexConfig,
  saveRiskIndexConfig,
  validateRiskIndexConfig,
  type DurationSeverityRule,
  type RiskIndexConfig,
} from './riskIndexConfig';
import type { RiskIndexResult } from './types';

type DurationRuleFormRow = {
  hours: number;
  bonus: number;
};

type FormValues = {
  weightLow: number;
  weightMedium: number;
  weightHigh: number;
  indexScale: number;
  indexMax: number;
  tierLowMax: number;
  tierMediumMax: number;
  durationSeverityEnabled: boolean;
  durationRules: DurationRuleFormRow[];
};

function configToFormValues(cfg: RiskIndexConfig): FormValues {
  return {
    weightLow: cfg.levelWeights.low,
    weightMedium: cfg.levelWeights.medium,
    weightHigh: cfg.levelWeights.high,
    indexScale: cfg.indexScale,
    indexMax: cfg.indexMax,
    tierLowMax: cfg.tierLowMax,
    tierMediumMax: cfg.tierMediumMax,
    durationSeverityEnabled: cfg.durationSeverityEnabled,
    durationRules: cfg.durationSeverityRules
      .filter(r => r.enabled)
      .map(r => ({
        hours: r.hours,
        bonus: r.bonus,
      })),
  };
}

function formValuesToConfig(values: FormValues, existingRules: DurationSeverityRule[]): RiskIndexConfig {
  return {
    levelWeights: {
      low: values.weightLow,
      medium: values.weightMedium,
      high: values.weightHigh,
    },
    indexScale: values.indexScale,
    indexMax: values.indexMax,
    tierLowMax: values.tierLowMax,
    tierMediumMax: values.tierMediumMax,
    durationSeverityEnabled: values.durationSeverityEnabled,
    durationSeverityRules: values.durationRules.map((row, i) => ({
      id: existingRules[i]?.id ?? createDurationRuleId(),
      enabled: true,
      hours: row.hours,
      bonus: row.bonus,
    })),
  };
}

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  result: RiskIndexResult;
};

/** 指数参数配置（含计算公式说明，前端维护） */
export const RiskIndexConfigModal: React.FC<Props> = ({ open, onClose, onSaved, result }) => {
  const [form] = Form.useForm<FormValues>();
  const savedRulesRef = React.useRef<DurationSeverityRule[]>(DEFAULT_RISK_INDEX_CONFIG.durationSeverityRules);

  const weightLow = Form.useWatch('weightLow', form);
  const weightMedium = Form.useWatch('weightMedium', form);
  const weightHigh = Form.useWatch('weightHigh', form);
  const indexScale = Form.useWatch('indexScale', form);
  const indexMax = Form.useWatch('indexMax', form);
  const tierLowMax = Form.useWatch('tierLowMax', form);
  const tierMediumMax = Form.useWatch('tierMediumMax', form);
  const durationSeverityEnabled = Form.useWatch('durationSeverityEnabled', form);
  const durationRules = Form.useWatch('durationRules', form);

  const previewConfig = useMemo((): RiskIndexConfig | undefined => {
    if (
      typeof weightLow !== 'number' ||
      typeof weightMedium !== 'number' ||
      typeof weightHigh !== 'number' ||
      typeof indexScale !== 'number' ||
      typeof indexMax !== 'number' ||
      typeof tierLowMax !== 'number' ||
      typeof tierMediumMax !== 'number' ||
      typeof durationSeverityEnabled !== 'boolean' ||
      !Array.isArray(durationRules) ||
      durationRules.some(r => !r || typeof r.hours !== 'number' || typeof r.bonus !== 'number')
    ) {
      return undefined;
    }
    return formValuesToConfig(
      {
        weightLow,
        weightMedium,
        weightHigh,
        indexScale,
        indexMax,
        tierLowMax,
        tierMediumMax,
        durationSeverityEnabled,
        durationRules,
      },
      savedRulesRef.current,
    );
  }, [
    weightLow,
    weightMedium,
    weightHigh,
    indexScale,
    indexMax,
    tierLowMax,
    tierMediumMax,
    durationSeverityEnabled,
    durationRules,
  ]);

  useEffect(() => {
    if (open) {
      const cfg = getRiskIndexConfig();
      savedRulesRef.current = cfg.durationSeverityRules.map(r => ({ ...r }));
      form.setFieldsValue(configToFormValues(cfg));
    }
  }, [open, form]);

  const handleSave = () => {
    form.validateFields().then(values => {
      const next = formValuesToConfig(values, savedRulesRef.current);
      const err = validateRiskIndexConfig(next);
      if (err) {
        message.error(err);
        return;
      }
      saveRiskIndexConfig(next);
      savedRulesRef.current = next.durationSeverityRules.map(r => ({ ...r }));
      message.success('指数参数已保存，页面将按新配置重新计算');
      onSaved();
      onClose();
    });
  };

  const handleResetDefault = () => {
    savedRulesRef.current = DEFAULT_RISK_INDEX_CONFIG.durationSeverityRules.map(r => ({ ...r }));
    form.setFieldsValue(configToFormValues(DEFAULT_RISK_INDEX_CONFIG));
    message.info('已填入默认参数，点击「保存配置」后生效');
  };

  return (
    <Modal
      title="指数参数配置"
      open={open}
      onCancel={onClose}
      width={880}
      destroyOnClose
      className="dq-risk-index-config-modal"
      styles={{ body: { maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', paddingTop: 16 } }}
      footer={
        <div className="dq-risk-index-config-modal-footer">
          <Space>
            <Button onClick={onClose}>取消</Button>
            <Button onClick={handleResetDefault}>恢复默认</Button>
            <Button type="primary" onClick={handleSave}>
              保存配置
            </Button>
          </Space>
        </div>
      }
    >
      <RiskIndexFormulaContent result={result} previewConfig={previewConfig} />

      <Divider style={{ margin: '16px 0' }} />

      <Typography.Paragraph type="secondary" style={{ marginBottom: 12, fontSize: 13 }}>
        修改下列参数后点击「保存配置」，写入本机浏览器并同步页面指数与趋势图。
      </Typography.Paragraph>

      <Form<FormValues> form={form} layout="vertical" className="dq-risk-index-config-form">
        <Typography.Text strong className="dq-risk-index-config-section-title">
          报警等级权重（用于计算 W）
        </Typography.Text>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="weightLow"
              label="低风险权重"
              rules={[{ required: true, message: '请输入低风险权重' }]}
            >
              <InputNumber min={0.1} max={99} step={0.1} precision={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="weightMedium"
              label="中风险权重"
              rules={[{ required: true, message: '请输入中风险权重' }]}
            >
              <InputNumber min={0.1} max={99} step={0.1} precision={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="weightHigh"
              label="高风险权重"
              rules={[{ required: true, message: '请输入高风险权重' }]}
            >
              <InputNumber min={0.1} max={99} step={0.1} precision={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '8px 0 12px' }} />

        <Typography.Text strong className="dq-risk-index-config-section-title">
          指数换算
        </Typography.Text>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="indexScale"
              label="换算系数 indexScale"
              extra="指数 = round(W × 系数)，默认 3.6"
              rules={[{ required: true, message: '请输入换算系数' }]}
            >
              <InputNumber min={0.1} max={20} step={0.1} precision={2} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="indexMax"
              label="指数上限"
              rules={[{ required: true, message: '请输入指数上限' }]}
            >
              <InputNumber min={1} max={1000} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '8px 0 12px' }} />

        <Typography.Text strong className="dq-risk-index-config-section-title">
          综合风险等级阈值
        </Typography.Text>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="tierLowMax"
              label="低风险上限（≤ 为低）"
              rules={[{ required: true, message: '请输入低风险上限' }]}
            >
              <InputNumber min={1} max={999} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="tierMediumMax"
              label="中风险上限（≤ 为中）"
              rules={[{ required: true, message: '请输入中风险上限' }]}
            >
              <InputNumber min={2} max={999} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '8px 0 12px' }} />

        <div className="dq-risk-index-duration-section">
          <div className="dq-risk-index-duration-section-head">
            <Typography.Text strong className="dq-risk-index-config-section-title">
              持续内涝加重
            </Typography.Text>
            <div className="dq-risk-index-duration-enable dq-risk-index-duration-enable--inline">
              <span className="dq-risk-index-duration-enable-label">启用</span>
              <Form.Item name="durationSeverityEnabled" valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
            </div>
          </div>
          <Typography.Paragraph type="secondary" className="dq-risk-index-config-hint">
            列表中的档位均参与计算；不需要的可删除。多档同时满足时取小时数最大的一档。
          </Typography.Paragraph>

          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) => prev.durationSeverityEnabled !== cur.durationSeverityEnabled}
          >
            {({ getFieldValue }) =>
              getFieldValue('durationSeverityEnabled') ? (
                <Form.List name="durationRules">
                  {(fields, { add, remove }) => (
                    <div className="dq-risk-index-duration-rules">
                      <div className="dq-risk-index-duration-table">
                        <div className="dq-risk-index-duration-table-head">
                          <span className="dq-risk-index-duration-col-hours">
                            <span className="dq-risk-index-duration-required">*</span> 满（小时）
                          </span>
                          <span className="dq-risk-index-duration-col-bonus">
                            <span className="dq-risk-index-duration-required">*</span> 附加分
                          </span>
                          <span className="dq-risk-index-duration-col-action">操作</span>
                        </div>
                        {fields.map(({ key, name, ...restField }) => (
                          <div key={key} className="dq-risk-index-duration-table-row">
                            <Form.Item
                              {...restField}
                              name={[name, 'hours']}
                              rules={[{ required: true, message: '请输入小时数' }]}
                              className="dq-risk-index-duration-field"
                            >
                              <InputNumber
                                min={1}
                                max={168}
                                precision={0}
                                style={{ width: '100%' }}
                                addonAfter="h"
                              />
                            </Form.Item>
                            <Form.Item
                              {...restField}
                              name={[name, 'bonus']}
                              rules={[{ required: true, message: '请输入附加分' }]}
                              className="dq-risk-index-duration-field"
                            >
                              <InputNumber min={0} max={50} precision={0} style={{ width: '100%' }} />
                            </Form.Item>
                            <div className="dq-risk-index-duration-col-action">
                              {fields.length > 1 ? (
                                <Button
                                  type="link"
                                  danger
                                  size="small"
                                  icon={<MinusCircleOutlined />}
                                  onClick={() => remove(name)}
                                >
                                  删除
                                </Button>
                              ) : (
                                <span className="dq-risk-index-duration-action-placeholder">—</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button
                        type="dashed"
                        onClick={() => add({ hours: 6, bonus: 3 })}
                        icon={<PlusOutlined />}
                        block
                        className="dq-risk-index-duration-add"
                        disabled={fields.length >= 8}
                      >
                        添加档位
                      </Button>
                    </div>
                  )}
                </Form.List>
              ) : (
                <Typography.Text type="secondary" className="dq-risk-index-duration-disabled-hint">
                  关闭后综合指数不再叠加持续加重分。
                </Typography.Text>
              )
            }
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};
