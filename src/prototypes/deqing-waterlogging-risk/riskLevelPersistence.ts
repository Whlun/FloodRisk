import type { IndicatorRiskLevelRow } from './types';
import { persistGetItem, persistSetItem } from './persistenceStorage';

const STORAGE_KEY = 'dq-waterlogging-risk-levels-v1';

function isRiskLevelRow(value: unknown): value is IndicatorRiskLevelRow {
  if (!value || typeof value !== 'object') return false;
  const row = value as IndicatorRiskLevelRow;
  return (
    typeof row.id === 'string' &&
    typeof row.levelCode === 'string' &&
    typeof row.levelName === 'string' &&
    typeof row.color === 'string' &&
    typeof row.scoreMin === 'number' &&
    typeof row.scoreMax === 'number' &&
    typeof row.sort === 'number' &&
    typeof row.enabled === 'boolean'
  );
}

function parseStoredRows(raw: string): IndicatorRiskLevelRow[] | null {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  if (!parsed.every(isRiskLevelRow)) return null;
  return parsed;
}

/** 将本地已保存等级与导则预置合并：同 id 用本地版，预置新增 id 仍会出现 */
export function mergePersistedRiskLevels(
  baseline: IndicatorRiskLevelRow[],
  saved: IndicatorRiskLevelRow[],
): IndicatorRiskLevelRow[] {
  const savedById = new Map(saved.map(row => [row.id, row]));
  const merged = baseline.map(base => {
    const hit = savedById.get(base.id);
    return hit ? { ...base, ...hit, builtin: true } : { ...base, builtin: true };
  });
  for (const row of saved) {
    if (!baseline.some(base => base.id === row.id)) {
      merged.push({ ...row, builtin: false });
    }
  }
  return merged.sort((a, b) => a.sort - b.sort);
}

export function loadPersistedRiskLevels(baseline: IndicatorRiskLevelRow[]): IndicatorRiskLevelRow[] {
  try {
    const raw = persistGetItem(STORAGE_KEY);
    if (!raw) return baseline.map(row => ({ ...row, builtin: true }));
    const saved = parseStoredRows(raw);
    if (!saved) return baseline.map(row => ({ ...row, builtin: true }));
    return mergePersistedRiskLevels(
      baseline.map(row => ({ ...row, builtin: true })),
      saved,
    );
  } catch {
    return baseline.map(row => ({ ...row, builtin: true }));
  }
}

export function savePersistedRiskLevels(rows: IndicatorRiskLevelRow[]): void {
  persistSetItem(STORAGE_KEY, JSON.stringify(rows.map(row => ({ ...row }))));
}
