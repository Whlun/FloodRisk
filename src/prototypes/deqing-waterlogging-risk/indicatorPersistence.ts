import type { RiskIndicatorRow } from './types';
import { alignAuxiliaryConditionalOnRow } from './auxiliaryIndicatorDefaults';
import { persistGetItem, persistRemoveItem, persistSetItem } from './persistenceStorage';
import { normalizeIndicatorList } from './indicatorNormalize';

const STORAGE_KEY = 'dq-waterlogging-risk-indicators-v2';
const LEGACY_STORAGE_KEY = 'dq-waterlogging-risk-indicators-v1';
const FULL_RESET_MIGRATION_KEY = 'dq-indicators-full-reset-v2';
const USER_EMPTY_MODE_KEY = 'dq-indicators-user-empty-v1';
const USER_EMPTY_INTENTIONAL_KEY = 'dq-indicators-user-empty-intentional-v1';
const SCRATCH_EMPTY_ONCE_KEY = 'dq-indicators-scratch-empty-v1';
const COND_SOURCE_FIX_KEY = 'dq-indicators-cond-source-fix-v1';
const AUX_LABEL_FIX_KEY = 'dq-indicators-aux-label-fix-v1';
const PRESET_NUMERIC_MATCH_REPAIR_KEY = 'dq-indicators-preset-numeric-match-repair-v1';

const LEGACY_MIGRATION_KEYS = [
  'dq-indicators-user-added-enabled-migration-v1',
  'dq-indicators-appendix-e-ll-v1',
  'dq-indicators-survey-config-v3',
  'dq-indicators-survey-config-composite-v1',
  'dq-indicators-survey-config-composite-v2',
  'dq-indicators-appendix-f-reinit-v1',
  'dq-indicators-scoring-rule-mode-v1',
] as const;

const REMOVED_INDICATOR_IDS = new Set(['ind-fm-ll-02b']);

function isRemovedGuidelineIndicator(row: Pick<RiskIndicatorRow, 'id' | 'code'>): boolean {
  return REMOVED_INDICATOR_IDS.has(row.id);
}

function isRiskIndicatorRow(value: unknown): value is RiskIndicatorRow {
  if (!value || typeof value !== 'object') return false;
  const row = value as RiskIndicatorRow;
  return (
    typeof row.id === 'string' &&
    typeof row.code === 'string' &&
    typeof row.name === 'string' &&
    typeof row.level1 === 'string' &&
    Array.isArray(row.applicableTypes) &&
    typeof row.weight === 'number' &&
    Array.isArray(row.scoreRules) &&
    typeof row.enabled === 'boolean'
  );
}

function parseStoredRows(raw: string): RiskIndicatorRow[] | null {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return null;
  if (parsed.length === 0) return [];
  if (!parsed.every(isRiskIndicatorRow)) return null;
  return parsed;
}

function clearLegacyStorage(): void {
  persistRemoveItem(LEGACY_STORAGE_KEY);
  for (const key of LEGACY_MIGRATION_KEYS) {
    persistRemoveItem(key);
  }
}

function markBlankSlateReady(): void {
  persistSetItem(SCRATCH_EMPTY_ONCE_KEY, '1');
  persistSetItem(FULL_RESET_MIGRATION_KEY, '1');
  persistSetItem(USER_EMPTY_MODE_KEY, '1');
  persistSetItem('dq-indicators-blank-slate-v1', '1');
}

function persistEmptyUserWorkspace(): void {
  clearLegacyStorage();
  markBlankSlateReady();
  persistSetItem(USER_EMPTY_INTENTIONAL_KEY, '1');
  persistSetItem(STORAGE_KEY, '[]');
}

function loadSavedIndicatorRows(): RiskIndicatorRow[] {
  const raw = persistGetItem(STORAGE_KEY);
  if (!raw) return [];
  const saved = parseStoredRows(raw);
  if (saved === null) return [];
  return saved.filter(row => !isRemovedGuidelineIndicator(row));
}

/** 将本地已保存指标与种子合并（仅测试/遗留工具使用；运行时空白自建不合并种子） */
export function mergePersistedIndicators(
  baseline: RiskIndicatorRow[],
  saved: RiskIndicatorRow[],
): RiskIndicatorRow[] {
  const savedFiltered = saved.filter(row => !isRemovedGuidelineIndicator(row));
  const savedById = new Map(savedFiltered.map(row => [row.id, row]));
  const merged = baseline.map(base => {
    const hit = savedById.get(base.id);
    if (!hit) return { ...base };
    return { ...hit };
  });
  for (const row of savedFiltered) {
    if (!baseline.some(base => base.id === row.id)) {
      merged.push({ ...row });
    }
  }
  return merged.filter(row => !isRemovedGuidelineIndicator(row));
}

function migrateConditionalAndAuxLabelFix(rows: RiskIndicatorRow[]): RiskIndicatorRow[] {
  return normalizeIndicatorList(
    rows.map(row => alignAuxiliaryConditionalOnRow({ ...row })),
    [],
  );
}

function applyOneTimeDataFixes(rows: RiskIndicatorRow[]): RiskIndicatorRow[] {
  const needsCondFix = !persistGetItem(COND_SOURCE_FIX_KEY);
  const needsLabelFix = !persistGetItem(AUX_LABEL_FIX_KEY);
  if (!needsCondFix && !needsLabelFix) return rows;
  const normalized = migrateConditionalAndAuxLabelFix(rows);
  if (needsCondFix) persistSetItem(COND_SOURCE_FIX_KEY, '1');
  if (needsLabelFix) persistSetItem(AUX_LABEL_FIX_KEY, '1');
  persistSetItem(STORAGE_KEY, JSON.stringify(normalized.map(row => ({ ...row }))));
  return normalized;
}

function finalizeLoadedRows(rows: RiskIndicatorRow[]): RiskIndicatorRow[] {
  let normalized = normalizeIndicatorList(rows, []);
  normalized = applyOneTimeDataFixes(normalized);
  if (!persistGetItem(PRESET_NUMERIC_MATCH_REPAIR_KEY)) {
    persistSetItem(PRESET_NUMERIC_MATCH_REPAIR_KEY, '1');
  }
  return normalized;
}

/** 启动时读取指标：空白自建，不合并导则种子 */
export function loadPersistedIndicators(_baseline: RiskIndicatorRow[]): RiskIndicatorRow[] {
  try {
    markBlankSlateReady();
    return finalizeLoadedRows(loadSavedIndicatorRows());
  } catch {
    return [];
  }
}

/** 指标变更后写入工作区 */
export function savePersistedIndicators(rows: RiskIndicatorRow[]): void {
  persistSetItem(STORAGE_KEY, JSON.stringify(rows.map(row => ({ ...row }))));
  if (rows.length > 0) {
    persistSetItem(USER_EMPTY_MODE_KEY, '1');
  }
}

export function clearPersistedIndicators(): void {
  persistRemoveItem(STORAGE_KEY);
  persistRemoveItem(LEGACY_STORAGE_KEY);
  persistRemoveItem(FULL_RESET_MIGRATION_KEY);
  persistRemoveItem(USER_EMPTY_MODE_KEY);
  persistRemoveItem(USER_EMPTY_INTENTIONAL_KEY);
  persistRemoveItem(SCRATCH_EMPTY_ONCE_KEY);
  persistRemoveItem(COND_SOURCE_FIX_KEY);
  persistRemoveItem(AUX_LABEL_FIX_KEY);
  persistRemoveItem(PRESET_NUMERIC_MATCH_REPAIR_KEY);
  for (const key of LEGACY_MIGRATION_KEYS) {
    persistRemoveItem(key);
  }
}

/** 清空全部指标（空白自建） */
export function resetPersistedIndicatorsToEmpty(): RiskIndicatorRow[] {
  persistEmptyUserWorkspace();
  return [];
}

/** 与清空等价（不再恢复导则种子） */
export function resetPersistedIndicatorsToBaseline(_baseline: RiskIndicatorRow[]): RiskIndicatorRow[] {
  return resetPersistedIndicatorsToEmpty();
}
