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

/** 评价版本编号（V001…） */
export const ArchitectureVersionTag: React.FC<Props> = ({
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
      <Tag color="geekblue" className={className} style={style}>
        评价版本 {versionNo}
      </Tag>
    );
  if (tooltip != null) {
    return <Tooltip title={tooltip}>{content}</Tooltip>;
  }
  return content;
};
