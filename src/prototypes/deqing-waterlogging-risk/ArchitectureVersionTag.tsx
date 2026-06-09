import React from 'react';
import { Tag, Tooltip } from 'antd';

interface Props {
  versionNo?: string | null;
  empty?: React.ReactNode;
  tooltip?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/** 评价版本编号 Tag（V001…） */
export const ArchitectureVersionTag: React.FC<Props> = ({
  versionNo,
  empty = '—',
  tooltip,
  className,
  style,
}) => {
  if (!versionNo) {
    return empty === null ? null : <>{empty}</>;
  }
  const tag = (
    <Tag color="geekblue" className={className} style={style}>
      评价版本 {versionNo}
    </Tag>
  );
  if (tooltip != null) {
    return <Tooltip title={tooltip}>{tag}</Tooltip>;
  }
  return tag;
};
