import React from 'react';
import { Tag, Tooltip } from 'antd';

interface Props {
  versionNo?: string | null;
  empty?: React.ReactNode;
  tooltip?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/** 防灾减灾版本编号 Tag（P001…） */
export const PreventionVersionTag: React.FC<Props> = ({
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
    <Tag color="cyan" className={className} style={style}>
      防灾减灾版本 {versionNo}
    </Tag>
  );
  if (tooltip != null) {
    return <Tooltip title={tooltip}>{tag}</Tooltip>;
  }
  return tag;
};
