/**
 * 预警总览 · 「等级构成」标题 + 等级说明问号
 */
import React from 'react';
import { CmAlertLevelHelpTip } from './CmAlertLevelHelpTip';

export const CmAlertLevelChartTitle: React.FC = () => (
  <span className="hz-cm-alert-panel__chart-title-wrap">
    <span className="hz-cm-alert-panel__chart-title">等级构成</span>
    <CmAlertLevelHelpTip />
  </span>
);
