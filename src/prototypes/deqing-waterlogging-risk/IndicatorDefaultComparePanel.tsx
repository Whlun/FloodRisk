import React, { useMemo } from 'react';
import { Alert, Button, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  buildIndicatorFieldDiffs,
  countChangedFields,
  getIndicatorSource,
  type IndicatorFieldDiff,
} from './indicatorDefaultCompare';
import type { RiskIndicatorRow } from './types';

const { Text } = Typography;

interface Props {
  current: RiskIndicatorRow;
  baseline?: RiskIndicatorRow;
  defaultIndicators: RiskIndicatorRow[];
  onRestoreDefault?: () => void;
  onSaveAsPreset?: () => void;
}

export const IndicatorDefaultComparePanel: React.FC<Props> = ({
  current,
  baseline,
  defaultIndicators,
  onRestoreDefault,
  onSaveAsPreset,
}) => {
  const diffs = useMemo(() => buildIndicatorFieldDiffs(current, baseline), [current, baseline]);
  const changedCount = countChangedFields(diffs);
  const isNewSource = getIndicatorSource(current, defaultIndicators) === 'new';
  const hasBaseline = Boolean(baseline);
  const canSetAsDefault = Boolean(onSaveAsPreset) && (!hasBaseline || changedCount > 0);

  const columns: ColumnsType<IndicatorFieldDiff> = [
    {
      title: '字段',
      dataIndex: 'label',
      width: 110,
      render: (label: string, row) => (
        <Space size={4}>
          <span>{label}</span>
          {row.changed && <Tag color="orange">已改</Tag>}
        </Space>
      ),
    },
    {
      title: '默认值（初始化）',
      dataIndex: 'defaultValue',
      ellipsis: true,
      render: (v: string, row) => (
        <Text type={row.changed ? 'secondary' : undefined} delete={row.changed}>
          {v}
        </Text>
      ),
    },
    {
      title: '修正值（当前）',
      dataIndex: 'currentValue',
      ellipsis: true,
      render: (v: string, row) => (
        <Text strong={row.changed} type={row.changed ? 'warning' : undefined}>
          {v}
        </Text>
      ),
    },
  ];

  return (
    <div className="dq-indicator-compare">
      {isNewSource && !hasBaseline ? (
        <Alert
          type="info"
          showIcon
          message="该指标为新增项，尚未设置初始化默认值"
          description="可将当前配置设置为默认值，作为后续「默认与修正」对比的初始化基准。"
          style={{ marginBottom: 12 }}
          action={
            canSetAsDefault ? (
              <Button size="small" type="primary" onClick={onSaveAsPreset}>
                设置为默认值
              </Button>
            ) : undefined
          }
        />
      ) : changedCount === 0 ? (
        <Alert type="success" showIcon message="当前配置与初始化默认值一致。" style={{ marginBottom: 12 }} />
      ) : (
        <Alert
          type="warning"
          showIcon
          message={`共 ${changedCount} 项字段相对初始化默认值已修正`}
          description="下表列出初始化默认值与当前修正值，便于核对调整是否符合德清本地化管理要求。"
          style={{ marginBottom: 12 }}
          action={
            <Space size={8}>
              {canSetAsDefault ? (
                <Button size="small" type="primary" onClick={onSaveAsPreset}>
                  设置为默认值
                </Button>
              ) : null}
              {onRestoreDefault ? (
                <Button size="small" onClick={onRestoreDefault}>
                  恢复默认
                </Button>
              ) : null}
            </Space>
          }
        />
      )}
      {hasBaseline ? (
        <Table
          rowKey="field"
          size="small"
          pagination={false}
          columns={columns}
          dataSource={diffs}
          rowClassName={row => (row.changed ? 'dq-indicator-compare-row-changed' : '')}
        />
      ) : null}
    </div>
  );
};
