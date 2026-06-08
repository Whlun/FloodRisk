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
  /** @deprecated 时间轴与项目卡同源，优先使用 message + typeTag */
  timelineMessage?: string;
  enteredAt: string;
  levelTone: HzPhaseAlertLevelTone;
  /** 预警所属阶段（详情时间轴节点对齐） */
  phaseKey: CmPhaseAccentKey;
  /** 前三未类型标签（展示在文案前，与预警工程画像项目卡一致） */
  typeTag?: string;
  typeTagClassName?: string;
};

export type HzPhaseAlertLineProps = HzPhaseAlertData & {
  compact?: boolean;
  className?: string;
  /** 是否展示前置感叹号图标，时间轴节点下方预警条默认不展示 */
  showIcon?: boolean;
  /** 前三未类型标签（展示在感叹号后、文案前） */
  typeTag?: string;
  typeTagClassName?: string;
};

export const HzPhaseAlertLine: React.FC<HzPhaseAlertLineProps> = ({
  message,
  enteredAt,
  levelTone,
  compact = false,
  className,
  showIcon = true,
  typeTag,
  typeTagClassName,
}) => {
  const useTypeTone = Boolean(typeTag && typeTagClassName);
  const line = (
    <div
      className={`hz-phase-alert-line${
        useTypeTone
          ? ` hz-phase-alert-line--type-tone ${typeTagClassName}`
          : ` hz-phase-alert-line--${levelTone}`
      }${compact ? ' hz-phase-alert-line--compact' : ''}${!showIcon ? ' hz-phase-alert-line--no-icon' : ''}${
        typeTag ? ' hz-phase-alert-line--has-type-tag' : ''
      }${className ? ` ${className}` : ''}`}
    >
      {showIcon ? (
        <ExclamationCircleFilled className="hz-phase-alert-line__icon" aria-hidden />
      ) : null}
      {typeTag ? (
        <span
          className={[
            'hz-phase-alert-line__type-tag',
            'zht-stat-drawer-card__tag',
            'hz-cm-project-card__alert-type-tag',
            typeTagClassName ?? '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {typeTag}
        </span>
      ) : null}
      <span className="hz-phase-alert-line__text">{message}</span>
    </div>
  );

  if (enteredAt || typeTag) {
    const dateCaption = enteredAt
      ? typeTagClassName?.includes('hz-cm-phase-card')
        ? `进入当前阶段：${enteredAt}`
        : typeTag
          ? `参考日期：${enteredAt}`
          : `进入当前阶段：${enteredAt}`
      : null;
    const tooltipTitle = dateCaption ? (
      <>
        <div>{message}</div>
        <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>{dateCaption}</div>
      </>
    ) : (
      message
    );

    return (
      <Tooltip title={tooltipTitle} placement="topLeft" mouseEnterDelay={0.35}>
        {line}
      </Tooltip>
    );
  }

  return line;
};
