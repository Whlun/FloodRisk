/**
 * 预警工程画像 · 左侧看板（薄封装 CmAlertOverviewPanel）
 */
import React from 'react';
import type { CmRegionKey } from '../../huzhou-construction-portrait/cmRegionFilter';
import { CmAlertOverviewPanel } from '../../huzhou-construction-portrait/components/CmAlertOverviewPanel';
import type { CmAlertType, CmPhaseAlertLevel } from '../../huzhou-construction-portrait/types';

export type CmAlertStatsPanelProps = {
  regionKey: CmRegionKey;
  selectedLevel: CmPhaseAlertLevel | null;
  onSelectLevel: (level: CmPhaseAlertLevel | null) => void;
  selectedAlertType: CmAlertType | null;
  onSelectAlertType: (type: CmAlertType | null) => void;
};

export const CmAlertStatsPanel: React.FC<CmAlertStatsPanelProps> = props => (
  <CmAlertOverviewPanel {...props} />
);
