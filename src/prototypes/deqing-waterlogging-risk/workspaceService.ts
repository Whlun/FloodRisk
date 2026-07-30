import { initialIndicatorRiskLevels } from '../../database/deqing-waterlogging-risk-indicators';
import { initialWaterloggingPoints } from '../../database/deqing-waterlogging-points';
import { initialRegionalPreventionRecords } from '../../database/deqing-regional-prevention';
import { initialRiskChangeLogs } from '../../database/deqing-risk-change-logs';
import { loadPersistedIndicators } from './indicatorPersistence';
import { loadPersistedRiskLevels } from './riskLevelPersistence';
import {
  ensureArchitectureIndicatorSnapshots,
  ensureArchitectureVersionNos,
  migrateLegacyArchitectureToRecords,
  refreshArchitectureConfigForNewVersion,
  validateArchitectureConfig,
} from './indicatorArchitectureUtils';
import {
  ensureRiskLevelVersionNos,
  getLevelsFromRecord,
  getRiskLevelForRating,
  migrateLegacyLevelsToRecords,
} from './riskLevelVersionUtils';
import {
  disableServerMemoryPersistence,
  enableServerMemoryPersistence,
  isServerMemoryPersistence,
  persistGetItem,
  persistSetItem,
  snapshotIndicatorMetaFromMemory,
} from './persistenceStorage';
import { getLatestRiskLogForSurvey } from './riskChangeLogUtils';
import { normalizeSurveyActiveRefs } from './waterloggingSurveyUtils';
import {
  migratePreventionRecordsForArchitecture,
  normalizePreventionActiveRefs,
} from './regionalPreventionUtils';
import { ensurePreventionVersionNos, nextPreventionVersionNo } from './preventionVersionUtils';
import {
  loadPersistedArchitectureRecords,
  loadPersistedLevel1Weights,
  loadPersistedPoints,
  loadPersistedRegionalPrevention,
  loadPersistedRiskChangeLogs,
  loadPersistedRiskLevelRecords,
  WORKSPACE_ARCHITECTURE_STORAGE_KEY,
  WORKSPACE_LEVEL1_WEIGHTS_STORAGE_KEY,
  WORKSPACE_POINT_STORAGE_KEY,
  WORKSPACE_PREVENTION_STORAGE_KEY,
  WORKSPACE_RISK_LEVEL_RECORDS_STORAGE_KEY,
  WORKSPACE_RISK_LOGS_STORAGE_KEY,
} from './workspacePersistence';
import type { DeqingWaterloggingWorkspace } from './workspaceTypes';
import { DEQING_WORKSPACE_VERSION } from './workspaceTypes';
import {
  assertValidWorkspace,
  getWorkspaceRevision,
} from './workspaceValidation';
import type {
  IndicatorArchitectureRecord,
  IndicatorRiskLevelRow,
  Level1Weights,
  RegionalPreventionRecord,
  RiskChangeLogEntry,
  RiskIndicatorRow,
  RiskLevelVersionRecord,
  WaterloggingPointRow,
} from './types';
import { cloneLevel1Weights } from './types';

const WORKSPACE_API = '/api/deqing-waterlogging/workspace';
const INDICATOR_STORAGE_KEY = 'dq-waterlogging-risk-indicators-v2';
const LEVEL_STORAGE_KEY = 'dq-waterlogging-risk-levels-v1';

export interface DeqingWorkspaceState {
  indicators: RiskIndicatorRow[];
  /** @deprecated 由 riskLevelRecords 派生；保留供 bundle 写入 */
  indicatorLevels: IndicatorRiskLevelRow[];
  riskLevelRecords: RiskLevelVersionRecord[];
  points: WaterloggingPointRow[];
  regionalPreventionRecords: RegionalPreventionRecord[];
  riskChangeLogs: RiskChangeLogEntry[];
  architectureRecords: IndicatorArchitectureRecord[];
}

function syncIndicatorLevelsFromRecords(
  records: RiskLevelVersionRecord[],
  fallback: IndicatorRiskLevelRow[],
): IndicatorRiskLevelRow[] {
  const active = getRiskLevelForRating(records);
  const levels = getLevelsFromRecord(active);
  return levels.length > 0 ? levels : fallback;
}

function nowIso(): string {
  return new Date().toISOString();
}

function repairCurrentCatalogForRatingIntegrity(
  indicators: RiskIndicatorRow[],
): RiskIndicatorRow[] {
  return indicators.map(ind => {
    if (ind.code === 'FM_U005' && ind.valueType === 'numeric' && ind.scoreRules.length >= 3) {
      const scoreRules = ind.scoreRules.map((rule, index) =>
        index === 2
          ? {
              ...rule,
              label: '值≥4%',
              numericMatch: { kind: 'gte' as const, value: 4 },
            }
          : rule,
      );
      const scoreExplanation = '· 值<1% → 低风险\n· 1%≤值<4% → 中风险\n· 值≥4% → 高风险';
      return {
        ...ind,
        scoreRules,
        scoreExplanation,
        initSnapshot: ind.initSnapshot
          ? {
              ...ind.initSnapshot,
              scoreRules: JSON.parse(JSON.stringify(scoreRules)),
              scoreExplanation,
            }
          : ind.initSnapshot,
      };
    }
    if (ind.code === 'HZ_U001' && ind.scoreRules.length >= 4) {
      return {
        ...ind,
        scoreRules: ind.scoreRules.map((rule, index) => ({
          ...rule,
          numericMatch:
            index === 0
              ? { kind: 'lte' as const, value: 8 }
              : index === 1
                ? { kind: 'between' as const, min: 8, max: 16, minInclusive: false, maxInclusive: true }
                : index === 2
                  ? { kind: 'between' as const, min: 16, max: 24, minInclusive: false, maxInclusive: true }
                  : { kind: 'gt' as const, value: 24 },
        })),
      };
    }
    if (ind.code === 'FM_U012' && ind.scoreRules.length >= 3) {
      return {
        ...ind,
        scoreRules: ind.scoreRules.map((rule, index) => ({
          ...rule,
          numericMatch:
            index === 0
              ? { kind: 'lte' as const, value: 0.45 }
              : index === 1
                ? { kind: 'between' as const, min: 0.45, max: 0.6, minInclusive: false, maxInclusive: true }
                : { kind: 'gt' as const, value: 0.6 },
        })),
      };
    }
    if (ind.code === 'FM_U008' && ind.survey?.appendixBSurveyParts?.length) {
      return {
        ...ind,
        survey: {
          ...ind.survey,
          appendixBSurveyParts: ind.survey.appendixBSurveyParts.map(part => ({
            ...part,
            tierBands: part.tierBands?.map(band =>
              band.match.kind === 'between'
                ? {
                    ...band,
                    match: {
                      ...band.match,
                      minInclusive: true,
                      maxInclusive: true,
                    },
                  }
                : band,
            ),
          })),
        },
      };
    }
    return ind;
  });
}

/**
 * 一次性评分完整性迁移：
 * - 只修当前指标目录，绝不改写 V001–V003 的定义快照；
 * - 从 V003 状态 + 当前目录生成 V004；
 * - 克隆 P007 的现有 V₄ 数据为绑定 V004 的新 P 版本，并显式设为引用。
 */
export function applyRatingIntegrityV1Migration(
  bundle: DeqingWaterloggingWorkspace,
  architectureRecords: IndicatorArchitectureRecord[],
): {
  indicators: RiskIndicatorRow[];
  architectureRecords: IndicatorArchitectureRecord[];
  regionalPreventionRecords: RegionalPreventionRecord[];
  indicatorMeta: DeqingWaterloggingWorkspace['indicatorMeta'];
} {
  const existingV004 = architectureRecords.find(
    record => record.id === 'arch-rating-integrity-v1' && record.versionNo === 'V004',
  );
  const existingDefinitions = Object.values(existingV004?.config.indicatorDefinitions ?? {});
  const existingP = (bundle.regionalPreventionRecords ?? []).find(
    record =>
      record.id === 'prevention-rating-integrity-v1' &&
      record.activeForRating &&
      record.architectureRefId === existingV004?.id &&
      record.config.assessmentStatus === 'completed',
  );
  const existingFm = bundle.indicators.find(ind => ind.code === 'FM_U005');
  const existingFmRule = existingFm?.scoreRules[2];
  const existingFmInitRule = existingFm?.initSnapshot?.scoreRules[2];
  const existingArtifactsValid =
    existingV004?.activeForRating === true &&
    existingV004.config.status === 'completed' &&
    existingDefinitions.length > 0 &&
    validateArchitectureConfig(existingV004.config, existingDefinitions).ok &&
    Boolean(existingP) &&
    existingFmRule?.numericMatch?.kind === 'gte' &&
    existingFmRule.numericMatch.value === 4 &&
    existingFmInitRule?.numericMatch?.kind === 'gte' &&
    existingFmInitRule.numericMatch.value === 4 &&
    existingFm?.scoreExplanation?.includes('值≥4%');

  if (bundle.indicatorMeta?.ratingIntegrityV1 && existingArtifactsValid) {
    return {
      indicators: bundle.indicators,
      architectureRecords,
      regionalPreventionRecords: bundle.regionalPreventionRecords ?? [],
      indicatorMeta: bundle.indicatorMeta,
    };
  }

  const indicators = repairCurrentCatalogForRatingIntegrity(bundle.indicators ?? []);
  let nextArchitectures = architectureRecords;
  const sourceV003 = architectureRecords.find(record => record.versionNo === 'V003');
  let targetV004 = architectureRecords.find(record => record.versionNo === 'V004');

  if (
    sourceV003 &&
    (!targetV004 || targetV004.id === 'arch-rating-integrity-v1')
  ) {
    const refreshed = refreshArchitectureConfigForNewVersion(sourceV003.config, indicators);
    const mergedForValidation = Object.values(refreshed.indicatorDefinitions ?? {});
    const validation = validateArchitectureConfig(refreshed, mergedForValidation);
    const config = {
      ...refreshed,
      status: validation.ok ? ('completed' as const) : ('draft' as const),
      updatedAt: nowIso(),
      updatedBy: '系统迁移 · ratingIntegrityV1',
    };
    targetV004 = {
      id: 'arch-rating-integrity-v1',
      versionNo: 'V004',
      configAt: nowIso().slice(0, 19).replace('T', ' '),
      label: '评分完整性修复',
      activeForRating: validation.ok,
      config,
    };
    nextArchitectures = architectureRecords
      .filter(record => record.id !== targetV004!.id)
      .map(record => ({
        ...record,
        activeForRating: validation.ok ? false : record.activeForRating,
      }));
    nextArchitectures.push(targetV004);
  }

  let prevention = bundle.regionalPreventionRecords ?? [];
  const existingMigratedPrevention = prevention.find(
    record => record.id === 'prevention-rating-integrity-v1',
  );
  if (
    targetV004?.config.status === 'completed' &&
    !existingMigratedPrevention
  ) {
    const sourceP007 =
      prevention.find(record => record.versionNo === 'P007') ??
      prevention.find(
        record =>
          record.activeForRating &&
          record.architectureRefId === sourceV003?.id &&
          record.config.assessmentStatus === 'completed',
      );
    if (sourceP007) {
      const createdAt = nowIso().slice(0, 19).replace('T', ' ');
      prevention = [
        ...prevention,
        {
          ...JSON.parse(JSON.stringify(sourceP007)) as RegionalPreventionRecord,
          id: 'prevention-rating-integrity-v1',
          versionNo: nextPreventionVersionNo(prevention),
          configAt: createdAt,
          label: '评分完整性修复',
          activeForRating: true,
          architectureRefId: targetV004.id,
          architectureRefAt: targetV004.configAt,
          architectureVersionNo: targetV004.versionNo,
        },
      ];
    }
  }

  const migrationComplete =
    targetV004?.config.status === 'completed' &&
    targetV004.activeForRating &&
    prevention.some(
      record =>
        record.id === 'prevention-rating-integrity-v1' &&
        record.activeForRating &&
        record.architectureRefId === targetV004?.id &&
        record.config.assessmentStatus === 'completed',
    );

  return {
    indicators,
    architectureRecords: nextArchitectures,
    regionalPreventionRecords: prevention,
    indicatorMeta: {
      ...bundle.indicatorMeta,
      ratingIntegrityV1: migrationComplete
        ? true
        : bundle.indicatorMeta?.ratingIntegrityV1,
    },
  };
}

function readJsonArray<T>(key: string, fallback: T[]): T[] {
  const raw = persistGetItem(key);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

/** 为缺少版本引用的已定级记录，从风险变更日志与 V₄ 引用补全 ratingResult */
function backfillRatingResultVersionRefs(
  points: WaterloggingPointRow[],
  logs: RiskChangeLogEntry[],
  architectureRecords: IndicatorArchitectureRecord[],
  riskLevelRecords: RiskLevelVersionRecord[],
  regionalPreventionRecords: RegionalPreventionRecord[],
): WaterloggingPointRow[] {
  return points.map(pt => {
    if (pt.ratingStatus !== 'completed' || !pt.ratingResult) return pt;
    const rr = pt.ratingResult;
    if (
      rr.architectureRefId &&
      rr.riskLevelRefId &&
      rr.preventionRefAt &&
      rr.preventionVersionNo &&
      rr.architectureVersionNo &&
      rr.riskLevelVersionNo
    ) {
      return pt;
    }

    const log = getLatestRiskLogForSurvey(pt.id, logs);
    const preventionRefAt = rr.preventionRefAt ?? log?.preventionRefAt;
    let preventionVersionNo = rr.preventionVersionNo ?? log?.preventionVersionNo;

    if (!preventionVersionNo && preventionRefAt) {
      preventionVersionNo = regionalPreventionRecords.find(r => r.configAt === preventionRefAt)?.versionNo;
    }

    let architectureRefId = rr.architectureRefId;
    let architectureVersionNo = rr.architectureVersionNo;
    let architectureRefAt = rr.architectureRefAt;

    if (!architectureRefId && preventionRefAt) {
      const prev = regionalPreventionRecords.find(r => r.configAt === preventionRefAt);
      if (prev?.architectureRefId) {
        architectureRefId = prev.architectureRefId;
        architectureVersionNo = architectureVersionNo ?? prev.architectureVersionNo;
        architectureRefAt = architectureRefAt ?? prev.architectureRefAt;
      }
    }
    if (!architectureRefId && pt.surveyArchitectureRefId) {
      architectureRefId = pt.surveyArchitectureRefId;
      const arch = architectureRecords.find(r => r.id === pt.surveyArchitectureRefId);
      if (arch) {
        architectureVersionNo = architectureVersionNo ?? arch.versionNo;
        architectureRefAt = architectureRefAt ?? arch.configAt;
      }
    }
    if (!architectureRefId && log?.architectureVersionNo) {
      const arch = architectureRecords.find(r => r.versionNo === log.architectureVersionNo);
      if (arch) {
        architectureRefId = arch.id;
        architectureVersionNo = arch.versionNo;
        architectureRefAt = arch.configAt;
      }
    }

    let riskLevelRefId = rr.riskLevelRefId;
    let riskLevelVersionNo = rr.riskLevelVersionNo;
    let riskLevelRefAt = rr.riskLevelRefAt;
    if (!riskLevelRefId) {
      const versionNo = riskLevelVersionNo ?? log?.riskLevelVersionNo;
      const completed = riskLevelRecords.filter(r => r.config.status === 'completed');
      const levelRec = versionNo
        ? riskLevelRecords.find(r => r.versionNo === versionNo)
        : completed.length === 1
          ? completed[0]
          : undefined;
      if (levelRec) {
        riskLevelRefId = levelRec.id;
        riskLevelVersionNo = levelRec.versionNo;
        riskLevelRefAt = levelRec.configAt;
      }
    }

    return {
      ...pt,
      ratingResult: {
        ...rr,
        architectureRefId,
        architectureVersionNo,
        architectureRefAt,
        preventionRefAt,
        preventionVersionNo,
        riskLevelRefId,
        riskLevelVersionNo,
        riskLevelRefAt,
      },
    };
  });
}

/** v2 迁移：无 architectureRecords 时从旧根级字段生成；防灾减灾记录补 architectureRefId */
export function migrateWorkspaceBundle(
  bundle: DeqingWaterloggingWorkspace,
): DeqingWaterloggingWorkspace {
  let indicators = bundle.indicators ?? [];
  let architectureRecords = bundle.architectureRecords?.length
    ? ensureArchitectureVersionNos(bundle.architectureRecords)
    : migrateLegacyArchitectureToRecords(
        bundle.indicators,
        bundle.level1Weights ?? cloneLevel1Weights(),
      );
  architectureRecords = ensureArchitectureIndicatorSnapshots(
    architectureRecords,
    indicators,
  );

  const integrity = applyRatingIntegrityV1Migration(bundle, architectureRecords);
  indicators = integrity.indicators;
  architectureRecords = integrity.architectureRecords;

  const regionalPreventionRecords = ensurePreventionVersionNos(
    migratePreventionRecordsForArchitecture(
      normalizePreventionActiveRefs(integrity.regionalPreventionRecords),
      architectureRecords,
    ),
  );

  let riskLevelRecords = bundle.riskLevelRecords?.length
    ? ensureRiskLevelVersionNos(bundle.riskLevelRecords)
    : migrateLegacyLevelsToRecords(
        bundle.indicatorLevels?.length
          ? bundle.indicatorLevels
          : loadPersistedRiskLevels(initialIndicatorRiskLevels),
      );

  const indicatorLevels = syncIndicatorLevelsFromRecords(
    riskLevelRecords,
    bundle.indicatorLevels?.length
      ? bundle.indicatorLevels
      : initialIndicatorRiskLevels.map(row => ({ ...row, builtin: true })),
  );

  const riskChangeLogs = bundle.riskChangeLogs ?? [];
  const points = backfillRatingResultVersionRefs(
    normalizeSurveyActiveRefs(bundle.points ?? [], indicators),
    riskChangeLogs,
    architectureRecords,
    riskLevelRecords,
    regionalPreventionRecords,
  );

  if (bundle.riskLevelRecords?.length) {
    return {
      ...bundle,
      indicators,
      indicatorMeta: integrity.indicatorMeta,
      version: DEQING_WORKSPACE_VERSION,
      architectureRecords,
      regionalPreventionRecords,
      riskLevelRecords,
      indicatorLevels,
      points,
      riskChangeLogs,
    };
  }
  return {
    ...bundle,
    indicators,
    indicatorMeta: integrity.indicatorMeta,
    version: DEQING_WORKSPACE_VERSION,
    architectureRecords,
    regionalPreventionRecords,
    riskLevelRecords,
    indicatorLevels,
    points,
    riskChangeLogs,
    updatedAt: nowIso(),
  };
}

/** 将工作区快照写入内存 KV（供 loadPersisted* 读取） */
export function hydratePersistenceFromWorkspace(bundle: DeqingWaterloggingWorkspace): void {
  const migrated = migrateWorkspaceBundle(bundle);
  enableServerMemoryPersistence(migrated.indicatorMeta);
  persistSetItem(INDICATOR_STORAGE_KEY, JSON.stringify(migrated.indicators));
  persistSetItem(LEVEL_STORAGE_KEY, JSON.stringify(migrated.indicatorLevels));
  persistSetItem(WORKSPACE_POINT_STORAGE_KEY, JSON.stringify(migrated.points));
  persistSetItem(WORKSPACE_PREVENTION_STORAGE_KEY, JSON.stringify(migrated.regionalPreventionRecords));
  persistSetItem(WORKSPACE_RISK_LOGS_STORAGE_KEY, JSON.stringify(migrated.riskChangeLogs));
  persistSetItem(
    WORKSPACE_ARCHITECTURE_STORAGE_KEY,
    JSON.stringify(migrated.architectureRecords),
  );
  persistSetItem(
    WORKSPACE_RISK_LEVEL_RECORDS_STORAGE_KEY,
    JSON.stringify(migrated.riskLevelRecords),
  );
  if (migrated.level1Weights) {
    persistSetItem(WORKSPACE_LEVEL1_WEIGHTS_STORAGE_KEY, JSON.stringify(migrated.level1Weights));
  }
}

/** 一次性：切换到空白自建，清空导则预置指标列表 */
export function applyBlankSlateIndicatorsMigration(
  bundle: DeqingWaterloggingWorkspace,
): DeqingWaterloggingWorkspace {
  if (bundle.indicatorMeta?.blankSlateIndicators) {
    return bundle;
  }
  return {
    ...bundle,
    indicators: [],
    architectureRecords: [],
    indicatorMeta: {
      ...bundle.indicatorMeta,
      blankSlateIndicators: true,
      userEmptyMode: true,
      userEmptyIntentional: true,
      fullResetMigration: true,
      scratchEmptyOnce: true,
      presetNumericMatchRepair: true,
    },
  };
}

export function resolveWorkspaceStateFromPersistence(): DeqingWorkspaceState {
  const indicators = loadPersistedIndicators([]);
  const riskLevelRecords = loadPersistedRiskLevelRecords();
  const legacyLevels = loadPersistedRiskLevels(initialIndicatorRiskLevels);
  const indicatorLevels = syncIndicatorLevelsFromRecords(riskLevelRecords, legacyLevels);
  const points = normalizeSurveyActiveRefs(loadPersistedPoints(), indicators);
  const architectureRecords = loadPersistedArchitectureRecords();
  const regionalPreventionRecords = ensurePreventionVersionNos(
    migratePreventionRecordsForArchitecture(
      loadPersistedRegionalPrevention(),
      architectureRecords,
    ),
  );
  return {
    indicators,
    indicatorLevels,
    riskLevelRecords,
    points,
    regionalPreventionRecords,
    riskChangeLogs: loadPersistedRiskChangeLogs(),
    architectureRecords,
  };
}

export function buildWorkspaceBundleFromPersistence(
  revision = 0,
): DeqingWaterloggingWorkspace {
  const state = resolveWorkspaceStateFromPersistence();
  return {
    version: DEQING_WORKSPACE_VERSION,
    revision,
    updatedAt: nowIso(),
    indicators: state.indicators,
    indicatorLevels: state.indicatorLevels,
    riskLevelRecords: state.riskLevelRecords,
    points: state.points,
    regionalPreventionRecords: state.regionalPreventionRecords,
    riskChangeLogs: state.riskChangeLogs,
    architectureRecords: state.architectureRecords,
    indicatorMeta: snapshotIndicatorMetaFromMemory(),
  };
}

function buildWorkspaceFromBrowserLocalStorage(): DeqingWaterloggingWorkspace | null {
  if (typeof localStorage === 'undefined') return null;
  const indicatorRaw = localStorage.getItem(INDICATOR_STORAGE_KEY);
  const hasAny =
    indicatorRaw ||
    localStorage.getItem(LEVEL_STORAGE_KEY) ||
    localStorage.getItem(WORKSPACE_POINT_STORAGE_KEY);
  if (!hasAny) return null;

  disableServerMemoryPersistence();
  const state = resolveWorkspaceStateFromPersistence();
  const indicatorsStored: RiskIndicatorRow[] = indicatorRaw
    ? (JSON.parse(indicatorRaw) as RiskIndicatorRow[])
    : state.indicators;
  const level1Weights = loadPersistedLevel1Weights();
  const architectureRecords =
    state.architectureRecords.length > 0
      ? state.architectureRecords
      : migrateLegacyArchitectureToRecords(indicatorsStored, level1Weights);
  return {
    version: DEQING_WORKSPACE_VERSION,
    revision: 0,
    updatedAt: nowIso(),
    indicators: indicatorsStored,
    indicatorLevels: state.indicatorLevels,
    riskLevelRecords: state.riskLevelRecords.length
      ? state.riskLevelRecords
      : migrateLegacyLevelsToRecords(state.indicatorLevels),
    points: state.points,
    regionalPreventionRecords: state.regionalPreventionRecords,
    riskChangeLogs: state.riskChangeLogs,
    architectureRecords,
    level1Weights,
    indicatorMeta: snapshotIndicatorMetaFromMemory(),
  };
}

export async function fetchWorkspaceFromServer(): Promise<DeqingWaterloggingWorkspace | null> {
  const res = await fetch(WORKSPACE_API, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error || `加载工作区失败（${res.status}）`,
    );
  }
  const workspace = await res.json();
  assertValidWorkspace(workspace);
  return {
    ...workspace,
    revision: getWorkspaceRevision(workspace),
  };
}

export class WorkspaceRevisionConflictError extends Error {
  readonly currentRevision: number | null;
  readonly localWorkspace: DeqingWaterloggingWorkspace;

  constructor(
    message: string,
    localWorkspace: DeqingWaterloggingWorkspace,
    currentRevision: number | null,
  ) {
    super(message);
    this.name = 'WorkspaceRevisionConflictError';
    this.localWorkspace = localWorkspace;
    this.currentRevision = currentRevision;
  }
}

export async function saveWorkspaceToServer(
  bundle: DeqingWaterloggingWorkspace,
  expectedRevision = getWorkspaceRevision(bundle),
): Promise<number> {
  const migrated = {
    ...migrateWorkspaceBundle(bundle),
    revision: expectedRevision,
  };
  const res = await fetch(WORKSPACE_API, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      expectedRevision,
      workspace: migrated,
    }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      error?: string;
      currentRevision?: number;
    };
    const message = err.error || `保存工作区失败（${res.status}）`;
    if (res.status === 409) {
      throw new WorkspaceRevisionConflictError(
        message,
        migrated,
        Number.isSafeInteger(err.currentRevision) ? err.currentRevision! : null,
      );
    }
    throw new Error(message);
  }
  const result = (await res.json().catch(() => ({}))) as { revision?: number };
  if (!Number.isSafeInteger(result.revision) || result.revision! <= expectedRevision) {
    throw new Error('服务端未返回有效的新 revision');
  }
  return result.revision!;
}

export interface LoadedDeqingWorkspace {
  state: DeqingWorkspaceState;
  revision: number;
}

export interface WorkspaceSaveCoordinator {
  enqueue: (bundle: DeqingWaterloggingWorkspace) => Promise<void>;
  flush: () => Promise<void>;
  getRevision: () => number;
  getPendingWorkspace: () => DeqingWaterloggingWorkspace | null;
  exportPendingWorkspace: () => string | null;
}

/**
 * 单通道保存队列：同一时刻最多一个 PUT，期间的新快照会合并为下一次保存。
 * 失败时保留最后的本地快照，可重试或导出，不会用服务端内容覆盖本地状态。
 */
export function createWorkspaceSaveCoordinator(
  initialRevision: number,
  save: (
    bundle: DeqingWaterloggingWorkspace,
    expectedRevision: number,
  ) => Promise<number> = saveWorkspaceToServer,
): WorkspaceSaveCoordinator {
  let revision = initialRevision;
  let pending: DeqingWaterloggingWorkspace | null = null;
  let inFlight: Promise<void> | null = null;

  const startDrain = (): Promise<void> => {
    if (inFlight) return inFlight;
    inFlight = (async () => {
      while (pending) {
        const snapshot = pending;
        pending = null;
        try {
          revision = await save(snapshot, revision);
        } catch (error) {
          if (!pending) pending = snapshot;
          throw error;
        }
      }
    })().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };

  return {
    enqueue(bundle) {
      pending = bundle;
      return startDrain();
    },
    flush() {
      return pending ? startDrain() : (inFlight ?? Promise.resolve());
    },
    getRevision() {
      return revision;
    },
    getPendingWorkspace() {
      return pending;
    },
    exportPendingWorkspace() {
      return pending ? `${JSON.stringify(pending, null, 2)}\n` : null;
    },
  };
}

export async function loadWorkspaceForApp(): Promise<LoadedDeqingWorkspace> {
  let bundle = await fetchWorkspaceFromServer();
  if (!bundle) {
    const migrated = buildWorkspaceFromBrowserLocalStorage();
    if (migrated) {
      bundle = migrateWorkspaceBundle(migrated);
      hydratePersistenceFromWorkspace(bundle);
      const revision = await saveWorkspaceToServer(bundle, 0);
      bundle = { ...bundle, revision };
    }
  }
  if (bundle) {
    let revision = getWorkspaceRevision(bundle);
    const blankMigrated = applyBlankSlateIndicatorsMigration(bundle);
    const missingArchitectureSnapshots =
      blankMigrated.architectureRecords?.some(
        record => !record.config.indicatorDefinitions,
      ) ?? false;
    bundle = migrateWorkspaceBundle(blankMigrated);
    const migrationChanged = JSON.stringify(blankMigrated) !== JSON.stringify(bundle);
    const needsSave =
      migrationChanged ||
      blankMigrated.indicators.length !== bundle.indicators.length ||
      !bundle.indicatorMeta?.blankSlateIndicators ||
      !blankMigrated.indicatorMeta?.ratingIntegrityV1 ||
      missingArchitectureSnapshots ||
      (bundle.version ?? 1) < DEQING_WORKSPACE_VERSION ||
      !bundle.architectureRecords?.length ||
      !bundle.riskLevelRecords?.length;
    if (needsSave) {
      revision = await saveWorkspaceToServer(bundle, revision);
      bundle = { ...bundle, revision };
    }
    hydratePersistenceFromWorkspace(bundle);
    return {
      state: resolveWorkspaceStateFromPersistence(),
      revision,
    };
  }

  enableServerMemoryPersistence({
    blankSlateIndicators: true,
    userEmptyMode: true,
    userEmptyIntentional: true,
    fullResetMigration: true,
    scratchEmptyOnce: true,
    presetNumericMatchRepair: true,
  });
  persistSetItem(INDICATOR_STORAGE_KEY, '[]');
  persistSetItem(WORKSPACE_ARCHITECTURE_STORAGE_KEY, '[]');
  persistSetItem(WORKSPACE_RISK_LEVEL_RECORDS_STORAGE_KEY, '[]');
  const defaultRecords = migrateLegacyLevelsToRecords(
    initialIndicatorRiskLevels.map(row => ({ ...row, builtin: true })),
  );
  return {
    revision: 0,
    state: {
      indicators: [],
      indicatorLevels: getLevelsFromRecord(defaultRecords[0]),
      riskLevelRecords: defaultRecords,
      points: normalizeSurveyActiveRefs(
        initialWaterloggingPoints.map(row => ({ ...row })),
        [],
      ),
      regionalPreventionRecords: initialRegionalPreventionRecords.map(row => ({ ...row })),
      riskChangeLogs: initialRiskChangeLogs.map(row => ({ ...row })),
      architectureRecords: [],
    },
  };
}

export function ensureServerPersistenceActive(): void {
  if (!isServerMemoryPersistence()) {
    enableServerMemoryPersistence();
  }
}
