import React, { useEffect } from 'react';
import { Form, Input, InputNumber, Table, Typography } from 'antd';
import type { FormInstance } from 'antd';
import {
  ensureDesignPeriodScoreRules,
  getDesignPeriodScoreMatrix,
} from './designReturnPeriod';

const { Text } = Typography;

interface Props {
  code: string;
  form: FormInstance;
  idPrefix: string;
}

/** 表 5.3.3：赋分规则 Tab 分区阈值表（只读），表单内保留固定 2 档 */
export const DesignReturnPeriodScoreRulesPanel: React.FC<Props> = ({ code, form, idPrefix }) => {
  const matrix = getDesignPeriodScoreMatrix(code);

  useEffect(() => {
    const current = form.getFieldValue('scoreRules') as Parameters<typeof ensureDesignPeriodScoreRules>[0];
    const next = ensureDesignPeriodScoreRules(current, idPrefix);
    const changed =
      !current?.length ||
      current.length !== 2 ||
      current[0]?.score !== next[0]?.score ||
      current[1]?.score !== next[1]?.score;
    if (changed) {
      form.setFieldsValue({ scoreRules: next });
    }
  }, [code, form, idPrefix]);

  const columns = [
    {
      title: matrix.tableTitle,
      dataIndex: 'zoneLabel',
      key: 'zone',
      width: 132,
      onCell: () => ({ className: 'dq-design-period-rules-zone' }),
    },
    {
      title: '',
      dataIndex: 'lowCondition',
      key: 'low',
      align: 'center' as const,
      onCell: () => ({ className: 'dq-design-period-rules-low' }),
    },
    {
      title: '',
      dataIndex: 'highCondition',
      key: 'high',
      align: 'center' as const,
      onCell: () => ({ className: 'dq-design-period-rules-high' }),
    },
  ];

  return (
    <div className="dq-design-period-rules-panel">
      <Table
        className="dq-design-period-rules-table"
        size="small"
        bordered
        pagination={false}
        columns={columns}
        dataSource={matrix.zones.map((z, i) => ({ ...z, key: String(i) }))}
        footer={() => (
          <div className="dq-design-period-rules-footer">
            <span className="dq-design-period-rules-footer-label">评估指标风险分级</span>
            <span>低</span>
            <span>高</span>
          </div>
        )}
      />
      <Text type="secondary" style={{ display: 'block', marginTop: 10, fontSize: 13, lineHeight: 1.6 }}>
        {matrix.appendixNote}
      </Text>
      <Form.List name="scoreRules">
        {fields =>
          fields.map(field => (
            <div key={field.key} hidden aria-hidden>
              <Form.Item {...field} name={[field.name, 'id']}>
                <Input />
              </Form.Item>
              <Form.Item {...field} name={[field.name, 'label']}>
                <Input />
              </Form.Item>
              <Form.Item {...field} name={[field.name, 'riskTier']}>
                <Input />
              </Form.Item>
              <Form.Item {...field} name={[field.name, 'score']}>
                <InputNumber />
              </Form.Item>
            </div>
          ))
        }
      </Form.List>
    </div>
  );
};
