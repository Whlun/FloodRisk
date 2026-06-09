import React from 'react';
import { Alert, Button } from 'antd';
import type { RiskLevelVersionRecord } from './types';

interface Props {
  record: RiskLevelVersionRecord | null | undefined;
  onViewDetail?: (record: RiskLevelVersionRecord) => void;
}

function formatVersionRefDetail(
  record: { label?: string; configAt?: string },
): string | undefined {
  if (record.label && record.configAt) {
    return `${record.label} · 配置于 ${record.configAt}`;
  }
  if (record.configAt) return `配置于 ${record.configAt}`;
  if (record.label) return record.label;
  return undefined;
}

/** 当前定级引用的等级版本（蓝色提示条） */
export const RiskLevelVersionRefAlert: React.FC<Props> = ({ record, onViewDetail }) => {
  if (!record?.versionNo) return null;

  const detail = formatVersionRefDetail(record);
  const message = detail
    ? `当前定级采用等级版本 ${record.versionNo} ${detail}`
    : `当前定级采用等级版本 ${record.versionNo}`;

  return (
    <Alert
      type="info"
      showIcon
      style={{ marginBottom: 12 }}
      message={message}
      action={
        onViewDetail ? (
          <Button size="small" type="primary" onClick={() => onViewDetail(record)}>
            查看详情
          </Button>
        ) : undefined
      }
    />
  );
};
