import { initialIndicatorRiskLevels } from '../../database/deqing-waterlogging-risk-indicators';
import { initialWaterloggingPoints } from '../../database/deqing-waterlogging-points';
import { initialRegionalPreventionRecords } from '../../database/deqing-regional-prevention';
import { initialRiskChangeLogs } from '../../database/deqing-risk-change-logs';
import { loadPersistedIndicators } from './indicatorPersistence';
import { loadPersistedRiskLevels } from './riskLevelPersistence';
import {
  ensureArchitectureVersionNos,
  migrateLegacyArchitectureToRecords,
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
import { ensurePreventionVersionNos } from './preventionVersionUtils';
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
  let architectureRecords = bundle.architectureRecords?.length
    ? ensureArchitectureVersionNos(bundle.architectureRecords)
    : migrateLegacyArchitectureToRecords(
        bundle.indicators,
        bundle.level1Weights ?? cloneLevel1Weights(),
      );

  const regionalPreventionRecords = ensurePreventionVersionNos(
    migratePreventionRecordsForArchitecture(
      normalizePreventionActiveRefs(bundle.regionalPreventionRecords ?? []),
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
    normalizeSurveyActiveRefs(bundle.points ?? [], bundle.indicators ?? []),
    riskChangeLogs,
    architectureRecords,
    riskLevelRecords,
    regionalPreventionRecords,
  );

  if (bundle.riskLevelRecords?.length) {
    return {
      ...bundle,
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

export function buildWorkspaceBundleFromPersistence(): DeqingWaterloggingWorkspace {
  const state = resolveWorkspaceStateFromPersistence();
  return {
    version: DEQING_WORKSPACE_VERSION,
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
    throw new Error(`加载工作区失败（${res.status}）`);
  }
  return (await res.json()) as DeqingWaterloggingWorkspace;
}

export async function saveWorkspaceToServer(bundle: DeqingWaterloggingWorkspace): Promise<void> {
  const migrated = migrateWorkspaceBundle(bundle);
  const res = await fetch(WORKSPACE_API, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(migrated),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `保存工作区失败（${res.status}）`);
  }
}

export async function loadWorkspaceForApp(): Promise<DeqingWorkspaceState> {
  let bundle = await fetchWorkspaceFromServer();
  if (!bundle) {
    const migrated = buildWorkspaceFromBrowserLocalStorage();
    if (migrated) {
      bundle = migrateWorkspaceBundle(migrated);
      hydratePersistenceFromWorkspace(bundle);
      await saveWorkspaceToServer(bundle);
    }
  }
  if (bundle) {
    const blankMigrated = applyBlankSlateIndicatorsMigration(bundle);
    bundle = migrateWorkspaceBundle(blankMigrated);
    const needsSave =
      blankMigrated.indicators.length !== bundle.indicators.length ||
      !bundle.indicatorMeta?.blankSlateIndicators ||
      (bundle.version ?? 1) < DEQING_WORKSPACE_VERSION ||
      !bundle.architectureRecords?.length ||
      !bundle.riskLevelRecords?.length;
    if (needsSave) {
      await saveWorkspaceToServer(bundle);
    }
    hydratePersistenceFromWorkspace(bundle);
    return resolveWorkspaceStateFromPersistence();
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
  };
}

export function ensureServerPersistenceActive(): void {
  if (!isServerMemoryPersistence()) {
    enableServerMemoryPersistence();
  }
}
