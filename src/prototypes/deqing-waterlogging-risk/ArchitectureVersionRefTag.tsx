import React from 'react';
import { Tag } from 'antd';
import { formatArchitectureRecordTitle } from './indicatorArchitectureUtils';
import type { IndicatorArchitectureRecord } from './types';
import { ArchitectureVersionTag } from './ArchitectureVersionTag';

interface Props {
  record: IndicatorArchitectureRecord | null | undefined;
  emptyLabel?: string;
}

/** 定级引用的评价版本（紧凑 Tag） */
export const ArchitectureVersionRefTag: React.FC<Props> = ({
  record,
  emptyLabel = '未定级引用',
}) => {
  if (!record?.versionNo) {
    return <Tag color="warning">评价版本：{emptyLabel}</Tag>;
  }
  return (
    <ArchitectureVersionTag
      versionNo={record.versionNo}
      tooltip={`定级引用：${formatArchitectureRecordTitle(record)}`}
    />
  );
};
