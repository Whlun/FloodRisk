import React from 'react';
import { Tag, Tooltip } from 'antd';

interface Props {
  versionNo?: string | null;
  empty?: React.ReactNode;
  tooltip?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/** 等级版本编号 Tag（L001…） */
export const RiskLevelVersionTag: React.FC<Props> = ({
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
    <Tag color="purple" className={className} style={style}>
      等级版本 {versionNo}
    </Tag>
  );
  if (tooltip != null) {
    return <Tooltip title={tooltip}>{tag}</Tooltip>;
  }
  return tag;
};
