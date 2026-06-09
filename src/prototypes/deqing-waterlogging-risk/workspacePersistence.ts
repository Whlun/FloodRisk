import { persistGetItem, persistSetItem } from './persistenceStorage';
import { initialWaterloggingPoints } from '../../database/deqing-waterlogging-points';
import { initialRegionalPreventionRecords } from '../../database/deqing-regional-prevention';
import { initialRiskChangeLogs } from '../../database/deqing-risk-change-logs';
import { ensureArchitectureVersionNos } from './indicatorArchitectureUtils';
import { ensureRiskLevelVersionNos } from './riskLevelVersionUtils';
import {
  cloneLevel1Weights,
  LEVEL1_DEFAULT_WEIGHT,
  type IndicatorArchitectureRecord,
  type Level1Factor,
  type Level1Weights,
  type RegionalPreventionRecord,
  type RiskChangeLogEntry,
  type RiskLevelVersionRecord,
  type WaterloggingPointRow,
} from './types';

const POINTS_KEY = 'dq-waterlogging-points-v1';
const PREVENTION_KEY = 'dq-regional-prevention-v1';
const RISK_LOGS_KEY = 'dq-risk-change-logs-v1';
const LEVEL1_WEIGHTS_KEY = 'dq-level1-weights-v1';
const ARCHITECTURE_KEY = 'dq-indicator-architecture-v1';
const RISK_LEVEL_RECORDS_KEY = 'dq-waterlogging-risk-level-records-v1';

const LEVEL1_FACTORS: Level1Factor[] = ['HAZARD', 'FORMATION', 'BEARING', 'PREVENTION'];

function isLevel1Weights(value: unknown): value is Level1Weights {
  if (!value || typeof value !== 'object') return false;
  const w = value as Record<string, unknown>;
  return LEVEL1_FACTORS.every(k => typeof w[k] === 'number' && Number.isFinite(w[k] as number));
}

function isWaterloggingPointRow(value: unknown): value is WaterloggingPointRow {
  if (!value || typeof value !== 'object') return false;
  const row = value as WaterloggingPointRow;
  return (
    typeof row.id === 'string' &&
    typeof row.registryId === 'string' &&
    typeof row.pointCode === 'string' &&
    typeof row.surveyStatus === 'string' &&
    row.surveyPayload != null &&
    typeof row.surveyAt === 'string'
  );
}

function isRegionalPreventionRecord(value: unknown): value is RegionalPreventionRecord {
  if (!value || typeof value !== 'object') return false;
  const row = value as RegionalPreventionRecord;
  return typeof row.id === 'string' && typeof row.configAt === 'string' && row.config != null;
}

function isIndicatorArchitectureRecord(value: unknown): value is IndicatorArchitectureRecord {
  if (!value || typeof value !== 'object') return false;
  const row = value as IndicatorArchitectureRecord;
  return typeof row.id === 'string' && typeof row.configAt === 'string' && row.config != null;
}

function isRiskLevelVersionRecord(value: unknown): value is RiskLevelVersionRecord {
  if (!value || typeof value !== 'object') return false;
  const row = value as RiskLevelVersionRecord;
  return typeof row.id === 'string' && typeof row.configAt === 'string' && row.config != null;
}

function isRiskChangeLogEntry(value: unknown): value is RiskChangeLogEntry {
  if (!value || typeof value !== 'object') return false;
  const row = value as RiskChangeLogEntry;
  return typeof row.id === 'string' && typeof row.pointCode === 'string' && typeof row.changeAt === 'string';
}

function parseJsonArray<T>(
  raw: string | null,
  guard: (value: unknown) => value is T,
): T[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    if (!parsed.every(guard)) return null;
    return parsed.map(item => ({ ...item }));
  } catch {
    return null;
  }
}

export function loadPersistedPoints(): WaterloggingPointRow[] {
  const saved = parseJsonArray(persistGetItem(POINTS_KEY), isWaterloggingPointRow);
  return saved ?? initialWaterloggingPoints.map(row => ({ ...row }));
}

export function savePersistedPoints(rows: WaterloggingPointRow[]): void {
  persistSetItem(POINTS_KEY, JSON.stringify(rows.map(row => ({ ...row }))));
}

export function loadPersistedRegionalPrevention(): RegionalPreventionRecord[] {
  const saved = parseJsonArray(persistGetItem(PREVENTION_KEY), isRegionalPreventionRecord);
  return saved ?? initialRegionalPreventionRecords.map(row => ({ ...row }));
}

export function savePersistedRegionalPrevention(rows: RegionalPreventionRecord[]): void {
  persistSetItem(PREVENTION_KEY, JSON.stringify(rows.map(row => ({ ...row }))));
}

export function loadPersistedRiskChangeLogs(): RiskChangeLogEntry[] {
  const saved = parseJsonArray(persistGetItem(RISK_LOGS_KEY), isRiskChangeLogEntry);
  return saved ?? initialRiskChangeLogs.map(row => ({ ...row }));
}

export function savePersistedRiskChangeLogs(rows: RiskChangeLogEntry[]): void {
  persistSetItem(RISK_LOGS_KEY, JSON.stringify(rows.map(row => ({ ...row }))));
}

export function loadPersistedLevel1Weights(): Level1Weights {
  const raw = persistGetItem(LEVEL1_WEIGHTS_KEY);
  if (!raw) return cloneLevel1Weights();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isLevel1Weights(parsed)) return { ...parsed };
  } catch {
    /* 忽略 */
  }
  return cloneLevel1Weights(LEVEL1_DEFAULT_WEIGHT);
}

export function savePersistedLevel1Weights(weights: Level1Weights): void {
  persistSetItem(LEVEL1_WEIGHTS_KEY, JSON.stringify(weights));
}

export function loadPersistedArchitectureRecords(): IndicatorArchitectureRecord[] {
  const saved = parseJsonArray(persistGetItem(ARCHITECTURE_KEY), isIndicatorArchitectureRecord);
  return saved ? ensureArchitectureVersionNos(saved) : [];
}

export function savePersistedArchitectureRecords(rows: IndicatorArchitectureRecord[]): void {
  persistSetItem(ARCHITECTURE_KEY, JSON.stringify(rows.map(row => ({ ...row }))));
}

export function loadPersistedRiskLevelRecords(): RiskLevelVersionRecord[] {
  const saved = parseJsonArray(persistGetItem(RISK_LEVEL_RECORDS_KEY), isRiskLevelVersionRecord);
  return saved ? ensureRiskLevelVersionNos(saved) : [];
}

export function savePersistedRiskLevelRecords(rows: RiskLevelVersionRecord[]): void {
  persistSetItem(RISK_LEVEL_RECORDS_KEY, JSON.stringify(rows.map(row => ({ ...row }))));
}

export const WORKSPACE_POINT_STORAGE_KEY = POINTS_KEY;
export const WORKSPACE_PREVENTION_STORAGE_KEY = PREVENTION_KEY;
export const WORKSPACE_RISK_LOGS_STORAGE_KEY = RISK_LOGS_KEY;
export const WORKSPACE_LEVEL1_WEIGHTS_STORAGE_KEY = LEVEL1_WEIGHTS_KEY;
export const WORKSPACE_ARCHITECTURE_STORAGE_KEY = ARCHITECTURE_KEY;
export const WORKSPACE_RISK_LEVEL_RECORDS_STORAGE_KEY = RISK_LEVEL_RECORDS_KEY;
