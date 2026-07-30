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
  /** 已完成评分准入完整性迁移（修复当前目录并生成新的显式引用版本）。 */
  ratingIntegrityV1?: boolean;
  /** 已切换到空白自建：不再注入导则指标种子 */
  blankSlateIndicators?: boolean;
}

export interface DeqingWaterloggingWorkspace {
  version: typeof DEQING_WORKSPACE_VERSION;
  /** 服务端乐观并发版本；旧工作区缺省时按 0 迁移 */
  revision?: number;
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
