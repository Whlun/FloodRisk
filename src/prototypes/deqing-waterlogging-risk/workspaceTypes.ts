import type { IndicatorRiskLevelRow, Level1Weights, RiskIndicatorRow } from './types';
import type { RegionalPreventionRecord, RiskChangeLogEntry, WaterloggingPointRow } from './types';
import type { WeightSource } from './weightSource';

export const DEQING_WORKSPACE_VERSION = 1 as const;

/** 指标持久化迁移标记（原 localStorage 键，现写入工作区文件） */
export interface WorkspaceIndicatorMeta {
  userEmptyMode?: boolean;
  userEmptyIntentional?: boolean;
  fullResetMigration?: boolean;
  scratchEmptyOnce?: boolean;
  condSourceFix?: boolean;
  auxLabelFix?: boolean;
  presetNumericMatchRepair?: boolean;
  /** 已切换到空白自建：不再注入导则指标种子 */
  blankSlateIndicators?: boolean;
}

export interface DeqingWaterloggingWorkspace {
  version: typeof DEQING_WORKSPACE_VERSION;
  updatedAt: string;
  indicators: RiskIndicatorRow[];
  indicatorLevels: IndicatorRiskLevelRow[];
  points: WaterloggingPointRow[];
  regionalPreventionRecords: RegionalPreventionRecord[];
  riskChangeLogs: RiskChangeLogEntry[];
  level1Weights: Level1Weights;
  weightSource: WeightSource;
  indicatorMeta?: WorkspaceIndicatorMeta;
}
