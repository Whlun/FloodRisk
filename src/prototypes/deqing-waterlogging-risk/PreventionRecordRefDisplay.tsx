import React from 'react';
import { Space, Typography } from 'antd';
import { PreventionVersionTag } from './PreventionVersionTag';
import type { RegionalPreventionRecord } from './types';

const { Text } = Typography;

interface Props {
  record: RegionalPreventionRecord | null | undefined;
  empty?: React.ReactNode;
}

/** 防灾减灾 V₄ 数据引用展示（与定级确认弹窗「防灾减灾引用」一致） */
export const PreventionRecordRefDisplay: React.FC<Props> = ({
  record,
  empty = '—',
}) => {
  if (!record) {
    return empty === null ? null : <>{empty}</>;
  }
  return (
    <Space size={4} wrap align="center">
      {record.versionNo ? (
        <PreventionVersionTag versionNo={record.versionNo} style={{ margin: 0 }} />
      ) : null}
      <Text type="secondary">{record.configAt}</Text>
      {record.label ? <Text type="secondary">· {record.label}</Text> : null}
    </Space>
  );
};
