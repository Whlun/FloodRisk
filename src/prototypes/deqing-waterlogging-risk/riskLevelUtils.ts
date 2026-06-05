import { initialIndicatorRiskLevels } from '../../database/deqing-waterlogging-risk-indicators';
import type { IndicatorRiskLevelRow } from './types';

const BUILTIN_IDS = new Set(initialIndicatorRiskLevels.map(l => l.id));

const LEGACY_LEVEL_SORT: Record<string, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
};

/** 导则预置等级不可删除 */
export function isBuiltinRiskLevel(row: IndicatorRiskLevelRow): boolean {
  return row.builtin === true || BUILTIN_IDS.has(row.id);
}

/** 用于变更类型推断：sort 越大表示风险越高 */
export function getLevelSortRank(code: string | undefined, levels: IndicatorRiskLevelRow[]): number {
  if (!code) return 0;
  const hit = levels.find(l => l.levelCode === code);
  if (hit) return hit.sort;
  return LEGACY_LEVEL_SORT[code] ?? 0;
}

export function hasEnabledScoreRangeOverlap(
  row: Pick<IndicatorRiskLevelRow, 'id' | 'scoreMin' | 'scoreMax' | 'enabled'>,
  levels: IndicatorRiskLevelRow[],
): boolean {
  if (!row.enabled) return false;
  const others = levels.filter(l => l.enabled && l.id !== row.id);
  return others.some(o => !(row.scoreMax <= o.scoreMin || row.scoreMin >= o.scoreMax));
}

export function isDuplicateLevelCode(
  code: string,
  levels: IndicatorRiskLevelRow[],
  excludeId?: string,
): boolean {
  const normalized = code.trim().toUpperCase();
  return levels.some(
    l => l.id !== excludeId && l.levelCode.trim().toUpperCase() === normalized,
  );
}

export function createEmptyRiskLevel(existing: IndicatorRiskLevelRow[]): IndicatorRiskLevelRow {
  const maxSort = existing.reduce((m, l) => Math.max(m, l.sort), 0);
  const seq = existing.filter(l => !isBuiltinRiskLevel(l)).length + 1;
  return {
    id: `lvl-custom-${Date.now()}`,
    levelCode: `CUSTOM_${seq}`,
    levelName: `自定义等级 ${seq}`,
    color: '#1677ff',
    scoreMin: 0,
    scoreMax: 1,
    sort: maxSort + 1,
    description: '',
    enabled: false,
    builtin: false,
  };
}
