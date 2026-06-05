import { initialIndicatorRiskLevels } from '../../database/deqing-waterlogging-risk-indicators';
import { initialWaterloggingPoints } from '../../database/deqing-waterlogging-points';
import { initialRegionalPreventionRecords } from '../../database/deqing-regional-prevention';
import { initialRiskChangeLogs } from '../../database/deqing-risk-change-logs';
import { loadPersistedIndicators } from './indicatorPersistence';
import { loadPersistedRiskLevels } from './riskLevelPersistence';
import {
  disableServerMemoryPersistence,
  enableServerMemoryPersistence,
  isServerMemoryPersistence,
  persistGetItem,
  persistSetItem,
  snapshotIndicatorMetaFromMemory,
} from './persistenceStorage';
import { normalizeSurveyActiveRefs } from './waterloggingSurveyUtils';
import {
  loadPersistedLevel1Weights,
  loadPersistedPoints,
  loadPersistedRegionalPrevention,
  loadPersistedRiskChangeLogs,
  WORKSPACE_LEVEL1_WEIGHTS_STORAGE_KEY,
  WORKSPACE_POINT_STORAGE_KEY,
  WORKSPACE_PREVENTION_STORAGE_KEY,
  WORKSPACE_RISK_LOGS_STORAGE_KEY,
} from './workspacePersistence';
import type { DeqingWaterloggingWorkspace } from './workspaceTypes';
import { DEQING_WORKSPACE_VERSION } from './workspaceTypes';
import { loadWeightSource, WORKSPACE_WEIGHT_SOURCE_STORAGE_KEY, type WeightSource } from './weightSource';
import type {
  IndicatorRiskLevelRow,
  Level1Weights,
  RegionalPreventionRecord,
  RiskChangeLogEntry,
  RiskIndicatorRow,
  WaterloggingPointRow,
} from './types';
import { cloneLevel1Weights } from './types';

const WORKSPACE_API = '/api/deqing-waterlogging/workspace';
const INDICATOR_STORAGE_KEY = 'dq-waterlogging-risk-indicators-v2';
const LEVEL_STORAGE_KEY = 'dq-waterlogging-risk-levels-v1';

export interface DeqingWorkspaceState {
  indicators: RiskIndicatorRow[];
  indicatorLevels: IndicatorRiskLevelRow[];
  points: WaterloggingPointRow[];
  regionalPreventionRecords: RegionalPreventionRecord[];
  riskChangeLogs: RiskChangeLogEntry[];
  level1Weights: Level1Weights;
  weightSource: WeightSource;
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

/** 将工作区快照写入内存 KV（供 loadPersisted* 读取） */
export function hydratePersistenceFromWorkspace(bundle: DeqingWaterloggingWorkspace): void {
  enableServerMemoryPersistence(bundle.indicatorMeta);
  persistSetItem(INDICATOR_STORAGE_KEY, JSON.stringify(bundle.indicators));
  persistSetItem(LEVEL_STORAGE_KEY, JSON.stringify(bundle.indicatorLevels));
  persistSetItem(WORKSPACE_POINT_STORAGE_KEY, JSON.stringify(bundle.points));
  persistSetItem(WORKSPACE_PREVENTION_STORAGE_KEY, JSON.stringify(bundle.regionalPreventionRecords));
  persistSetItem(WORKSPACE_RISK_LOGS_STORAGE_KEY, JSON.stringify(bundle.riskChangeLogs));
  persistSetItem(WORKSPACE_LEVEL1_WEIGHTS_STORAGE_KEY, JSON.stringify(bundle.level1Weights));
  persistSetItem(WORKSPACE_WEIGHT_SOURCE_STORAGE_KEY, bundle.weightSource);
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
  const indicatorLevels = loadPersistedRiskLevels(initialIndicatorRiskLevels);
  const points = normalizeSurveyActiveRefs(loadPersistedPoints(), indicators);
  return {
    indicators,
    indicatorLevels,
    points,
    regionalPreventionRecords: loadPersistedRegionalPrevention(),
    riskChangeLogs: loadPersistedRiskChangeLogs(),
    level1Weights: loadPersistedLevel1Weights(),
    weightSource: loadWeightSource(),
  };
}

export function buildWorkspaceBundleFromPersistence(): DeqingWaterloggingWorkspace {
  return {
    version: DEQING_WORKSPACE_VERSION,
    updatedAt: nowIso(),
    indicators: readJsonArray<RiskIndicatorRow>(INDICATOR_STORAGE_KEY, []),
    indicatorLevels: readJsonArray<IndicatorRiskLevelRow>(LEVEL_STORAGE_KEY, []),
    points: readJsonArray<WaterloggingPointRow>(WORKSPACE_POINT_STORAGE_KEY, []),
    regionalPreventionRecords: readJsonArray<RegionalPreventionRecord>(
      WORKSPACE_PREVENTION_STORAGE_KEY,
      [],
    ),
    riskChangeLogs: readJsonArray<RiskChangeLogEntry>(WORKSPACE_RISK_LOGS_STORAGE_KEY, []),
    level1Weights: loadPersistedLevel1Weights(),
    weightSource: loadWeightSource(),
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
  return {
    version: DEQING_WORKSPACE_VERSION,
    updatedAt: nowIso(),
    indicators: indicatorsStored,
    indicatorLevels: state.indicatorLevels,
    points: state.points,
    regionalPreventionRecords: state.regionalPreventionRecords,
    riskChangeLogs: state.riskChangeLogs,
    level1Weights: state.level1Weights,
    weightSource: state.weightSource,
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
  const res = await fetch(WORKSPACE_API, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bundle),
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
      bundle = migrated;
      hydratePersistenceFromWorkspace(bundle);
      await saveWorkspaceToServer(bundle);
    }
  }
  if (bundle) {
    const migrated = applyBlankSlateIndicatorsMigration(bundle);
    const needsSave =
      migrated.indicators.length !== bundle.indicators.length ||
      !bundle.indicatorMeta?.blankSlateIndicators;
    bundle = migrated;
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
  return {
    indicators: [],
    indicatorLevels: loadPersistedRiskLevels(initialIndicatorRiskLevels),
    points: normalizeSurveyActiveRefs(
      initialWaterloggingPoints.map(row => ({ ...row })),
      [],
    ),
    regionalPreventionRecords: initialRegionalPreventionRecords.map(row => ({ ...row })),
    riskChangeLogs: initialRiskChangeLogs.map(row => ({ ...row })),
    level1Weights: cloneLevel1Weights(),
    weightSource: 'appendix_e',
  };
}

export function ensureServerPersistenceActive(): void {
  if (!isServerMemoryPersistence()) {
    enableServerMemoryPersistence();
  }
}
