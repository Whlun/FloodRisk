/**
 * 阶段滞留预警条（项目卡 / 详情弹窗共用）
 */
import React from 'react';
import { ExclamationCircleFilled } from '@ant-design/icons';
import { Tooltip } from 'antd';
import type { CmPhaseAccentKey } from '../cmPhaseAccent';
import '../hzPhaseAlertLine.css';

export type HzPhaseAlertLevelTone = 'l2' | 'l3' | 'l4';

export type HzPhaseAlertData = {
  message: string;
  /** 时间轴节点下方专用文案（不含阶段名） */
  timelineMessage?: string;
  enteredAt: string;
  levelTone: HzPhaseAlertLevelTone;
  /** 预警所属阶段（详情时间轴节点对齐） */
  phaseKey: CmPhaseAccentKey;
};

export type HzPhaseAlertLineProps = HzPhaseAlertData & {
  compact?: boolean;
  className?: string;
  /** 是否展示前置感叹号图标，时间轴节点下方预警条默认不展示 */
  showIcon?: boolean;
};

export const HzPhaseAlertLine: React.FC<HzPhaseAlertLineProps> = ({
  message,
  enteredAt,
  levelTone,
  compact = false,
  className,
  showIcon = true,
}) => {
  const line = (
    <div
      className={`hz-phase-alert-line hz-phase-alert-line--${levelTone}${
        compact ? ' hz-phase-alert-line--compact' : ''
      }${!showIcon ? ' hz-phase-alert-line--no-icon' : ''}${className ? ` ${className}` : ''}`}
    >
      {showIcon ? (
        <ExclamationCircleFilled className="hz-phase-alert-line__icon" aria-hidden />
      ) : null}
      <span className="hz-phase-alert-line__text">{message}</span>
    </div>
  );

  if (enteredAt) {
    return (
      <Tooltip title={`进入当前阶段：${enteredAt}`} placement="topLeft" mouseEnterDelay={0.35}>
        {line}
      </Tooltip>
    );
  }

  return line;
};
