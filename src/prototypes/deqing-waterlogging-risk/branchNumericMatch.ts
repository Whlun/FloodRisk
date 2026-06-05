import type { BranchNumericMatch } from './types';

/** 数值是否满足分支比较条件（条件赋分、复合子项分档共用） */
export function matchNumericCondition(raw: number, match: BranchNumericMatch): boolean {
  switch (match.kind) {
    case 'eq':
      return raw === match.value;
    case 'lte':
      return raw <= match.value;
    case 'lt':
      return raw < match.value;
    case 'gte':
      return raw >= match.value;
    case 'gt':
      return raw > match.value;
    case 'between': {
      const minOk = match.minInclusive !== false ? raw >= match.min : raw > match.min;
      const maxOk = match.maxInclusive !== false ? raw <= match.max : raw < match.max;
      return minOk && maxOk;
    }
    default:
      return false;
  }
}

const COMPARE_KIND_SYMBOL: Record<BranchNumericMatch['kind'], string> = {
  eq: '=',
  lte: '≤',
  lt: '<',
  gte: '≥',
  gt: '>',
  between: '～',
};

/** 数值匹配区间 · 比较符下拉（赋分档、复合子项等共用） */
export const NUMERIC_MATCH_KIND_SELECT_OPTIONS: {
  value: BranchNumericMatch['kind'];
  label: string;
}[] = [
  { value: 'eq', label: '=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '≤' },
  { value: 'between', label: '区间' },
  { value: 'gte', label: '≥' },
  { value: 'gt', label: '>' },
];

export function formatBranchNumericMatch(match: BranchNumericMatch): string {
  if (match.kind === 'between') {
    const left = match.minInclusive !== false ? '≤' : '<';
    const right = match.maxInclusive !== false ? '≤' : '<';
    return `${match.min} ${left} 值 ${right} ${match.max}`;
  }
  return `${COMPARE_KIND_SYMBOL[match.kind]} ${match.value}`;
}
