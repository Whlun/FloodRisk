import React, { useCallback } from 'react';
import { Button, Col, Form, Input, InputNumber, Row } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';
import type { IndicatorAppendixBSurveyPart } from './types';
import { NumericScoreRuleMatchFields } from './NumericScoreRuleMatchFields';
import {
  formatNumericMatchLabel,
  shouldRefreshTierBandLabel,
} from './scoreRuleNumericBands';

interface Props {
  form: FormInstance;
  partFieldName: number;
  partLabel?: string;
  disabled?: boolean;
  unit?: string;
}

export const CompositePartTierBandsEditor: React.FC<Props> = ({
  form,
  partFieldName,
  partLabel,
  disabled,
  unit,
}) => {
  const listPath = ['survey', 'appendixBSurveyParts', partFieldName, 'tierBands'] as const;

  const syncTierBandLabel = useCallback(
    (bandIndex: number) => {
      queueMicrotask(() => {
        const bands = (form.getFieldValue([...listPath]) ??
          []) as IndicatorAppendixBSurveyPart['tierBands'];
        const band = bands[bandIndex];
        if (!band?.match) return;
        const unitTrim = unit?.trim() || undefined;
        if (!shouldRefreshTierBandLabel(band, unitTrim)) return;
        const auto = formatNumericMatchLabel(band.match, { unit: unitTrim });
        if (!auto || auto === band.riskTier) return;
        form.setFieldValue(
          [...listPath],
          bands.map((b, i) => (i === bandIndex ? { ...b, riskTier: auto } : b)),
        );
      });
    },
    [form, listPath, unit],
  );

  return (
    <div style={{ marginBottom: 16 }}>
      {partLabel ? <div style={{ marginBottom: 8, fontWeight: 500 }}>{partLabel}</div> : null}
      <Form.List name={[...listPath]}>
        {(bandFields, { add: addBand, remove: removeBand }) => (
          <>
            {bandFields.length > 0 ? (
              <Row gutter={8} style={{ marginBottom: 4 }}>
                <Col span={10}>匹配区间（本子项）</Col>
                <Col span={4}>标准分 F</Col>
                <Col span={7}>分档描述（展示，可改）</Col>
              </Row>
            ) : null}
            {bandFields.map(bandField => (
              <Row key={`appendix-band-${partFieldName}-${bandField.key}`} gutter={8} align="middle" style={{ marginBottom: 8 }}>
                <Col span={10}>
                  <NumericScoreRuleMatchFields
                    field={bandField}
                    disabled={disabled}
                    listPath={[...listPath]}
                    matchKey="match"
                    unit={unit}
                    onMatchChange={() => syncTierBandLabel(bandField.name as number)}
                  />
                </Col>
                <Col span={4}>
                  <Form.Item
                    name={[bandField.name, 'score']}
                    rules={[{ required: true, message: '请填写标准分' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber
                      min={0}
                      max={1}
                      step={0.05}
                      disabled={disabled}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={7}>
                  <Form.Item
                    name={[bandField.name, 'riskTier']}
                    rules={[{ required: true, message: '请填写分档描述' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Input disabled={disabled} placeholder="配置区间后自动生成，可修改" />
                  </Form.Item>
                </Col>
                {!disabled ? (
                  <Col flex="none">
                    <Button type="link" danger size="small" onClick={() => removeBand(bandField.name)}>
                      删除
                    </Button>
                  </Col>
                ) : null}
              </Row>
            ))}
            {!disabled ? (
              <Button
                type="dashed"
                size="small"
                onClick={() => {
                  const nextIdx = bandFields.length;
                  addBand({ riskTier: '', score: 0, match: { kind: 'lt', value: 0 } });
                  syncTierBandLabel(nextIdx);
                }}
                icon={<PlusOutlined />}
              >
                添加赋分档
              </Button>
            ) : null}
          </>
        )}
      </Form.List>
    </div>
  );
};
