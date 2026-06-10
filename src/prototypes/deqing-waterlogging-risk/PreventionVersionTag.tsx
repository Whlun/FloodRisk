import React from 'react';
import { Tag, Tooltip } from 'antd';

interface Props {
  versionNo?: string | null;
  empty?: React.ReactNode;
  tooltip?: React.ReactNode;
  /** plain：列表编号列；tag：引用/弹窗等上下文（默认） */
  variant?: 'plain' | 'tag';
  className?: string;
  style?: React.CSSProperties;
}

/** 防灾减灾版本编号（P001…） */
export const PreventionVersionTag: React.FC<Props> = ({
  versionNo,
  empty = '—',
  tooltip,
  variant = 'tag',
  className,
  style,
}) => {
  if (!versionNo) {
    return empty === null ? null : <>{empty}</>;
  }
  const content =
    variant === 'plain' ? (
      <span className={className} style={style}>
        {versionNo}
      </span>
    ) : (
      <Tag color="cyan" className={className} style={style}>
        防灾减灾版本 {versionNo}
      </Tag>
    );
  if (tooltip != null) {
    return <Tooltip title={tooltip}>{content}</Tooltip>;
  }
  return content;
};
