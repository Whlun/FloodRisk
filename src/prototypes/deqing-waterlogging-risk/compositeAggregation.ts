import type { CompositeAppendixAggregation } from './types';

export const COMPOSITE_AGGREGATION_OPTIONS: { value: CompositeAppendixAggregation; label: string }[] = [
  { value: 'max_f', label: '取 F 较大' },
  { value: 'min_f', label: '取 F 较小' },
];

/** 存库兼容：worst_score → max_f */
export function normalizeCompositeAggregation(
  raw?: CompositeAppendixAggregation | 'worst_score' | string | null,
): CompositeAppendixAggregation {
  if (raw === 'min_f') return 'min_f';
  return 'max_f';
}
