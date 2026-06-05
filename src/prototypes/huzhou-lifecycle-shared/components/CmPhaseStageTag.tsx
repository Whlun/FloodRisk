/**
 * 阶段标签 · 与建设工程画像项目卡阶段标签同色
 */
import React from 'react';
import type { CmPhaseAccentKey } from '../cmPhaseAccent';

export type CmPhaseStageTagProps = {
  phaseKey: CmPhaseAccentKey;
  children: React.ReactNode;
};

export const CmPhaseStageTag: React.FC<CmPhaseStageTagProps> = ({ phaseKey, children }) => (
  <span
    className={`zht-stat-drawer-card__tag hz-cm-phase-stage-tag hz-cm-phase-card--phase-${phaseKey}`}
  >
    {children}
  </span>
);
