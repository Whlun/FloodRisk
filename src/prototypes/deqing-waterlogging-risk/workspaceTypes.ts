import type {
  IndicatorArchitectureRecord,
  IndicatorRiskLevelRow,
  Level1Weights,
  RiskIndicatorRow,
  RiskLevelVersionRecord,
} from './types';
import type { RegionalPreventionRecord, RiskChangeLogEntry, WaterloggingPointRow } from './types';
export const DEQING_WORKSPACE_VERSION = 2 as const;

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
  /** @deprecated 由 riskLevelRecords 承载；迁移期保留 */
  indicatorLevels: IndicatorRiskLevelRow[];
  riskLevelRecords: RiskLevelVersionRecord[];
  points: WaterloggingPointRow[];
  regionalPreventionRecords: RegionalPreventionRecord[];
  riskChangeLogs: RiskChangeLogEntry[];
  architectureRecords: IndicatorArchitectureRecord[];
  /** @deprecated v2 起由 architectureRecords 承载；迁移期保留 */
  level1Weights?: Level1Weights;
  indicatorMeta?: WorkspaceIndicatorMeta;
}
