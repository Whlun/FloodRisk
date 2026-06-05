import type { IndicatorAppendixBSurveyPart, RiskIndicatorRow, ScoreRule } from './types';

function isCompositeScoringRow(row: Pick<RiskIndicatorRow, 'scoringRuleMode' | 'survey'>): boolean {
  return (
    row.scoringRuleMode === 'composite' ||
    row.survey?.inputVariant === 'composite_appendix_numeric'
  );
}

function pickDisplayTierLabel(tiers: Iterable<string> | undefined): string | undefined {
  const list = [...(tiers ?? [])].map(t => t.trim()).filter(Boolean);
  if (!list.length) return undefined;
  return list[0];
}

function formatAggregateLabel(score: number, tierLabel?: string): string {
  const f = `F=${score.toFixed(2)}`;
  return tierLabel ? `聚合 · ${tierLabel}（${f}）` : `聚合 · ${f}`;
}

/** Form.List 可能产生稀疏数组或含 undefined 的项 */
function normalizeAppendixSurveyParts(
  parts: IndicatorAppendixBSurveyPart[] | undefined | null,
): IndicatorAppendixBSurveyPart[] {
  if (!parts) return [];
  const list = Array.isArray(parts) ? parts : Object.values(parts as Record<string, unknown>);
  return list.filter((p): p is IndicatorAppendixBSurveyPart => Boolean(p && typeof p === 'object'));
}

/** 从各子项 tierBands 的 score 去重推导聚合档位（供定级 pickRule 与只读预览） */
export function deriveCompositeAggregateScoreRules(
  parts: IndicatorAppendixBSurveyPart[] | undefined,
  idPrefix = 'agg',
  existingRules?: ScoreRule[],
): ScoreRule[] {
  const scores = new Set<number>();
  const scoreToRiskTiers = new Map<number, Set<string>>();

  for (const part of normalizeAppendixSurveyParts(parts)) {
    const bands = part.tierBands ?? [];
    const bandList = Array.isArray(bands) ? bands : Object.values(bands as Record<string, unknown>);
    for (const band of bandList) {
      if (!band || typeof band !== 'object') continue;
      if (band.score == null || Number.isNaN(Number(band.score))) continue;
      const s = Number(band.score);
      scores.add(s);
      if (!scoreToRiskTiers.has(s)) scoreToRiskTiers.set(s, new Set());
      if (band.riskTier?.trim()) scoreToRiskTiers.get(s)!.add(band.riskTier.trim());
    }
  }

  if (scores.size === 0) return [];

  const sortedScores = [...scores].sort((a, b) => a - b);

  return sortedScores.map((score, i) => {
    const tierFromBands = pickDisplayTierLabel(scoreToRiskTiers.get(score));
    const existing = existingRules?.find(
      r => r && r.score != null && Math.abs(r.score - score) < 0.0001,
    );
    const riskTier = tierFromBands ?? existing?.riskTier ?? '';
    return {
      id: existing?.id ?? `${idPrefix}-agg-${i}`,
      label: formatAggregateLabel(
        score,
        (tierFromBands ?? existing?.riskTier?.trim()) || undefined,
      ),
      riskTier,
      score,
    };
  });
}

/** 复合指标：用子项分档覆盖 scoreRules（聚合展示文案） */
export function syncCompositeAggregateScoreRules(row: RiskIndicatorRow): RiskIndicatorRow {
  if (!isCompositeScoringRow(row)) return row;
  const idPrefix = String(row.code ?? row.id ?? 'agg').trim() || 'agg';
  const parts = row.survey?.appendixBSurveyParts;
  return {
    ...row,
    scoreRules: deriveCompositeAggregateScoreRules(parts, idPrefix, row.scoreRules),
  };
}
