import type { RiskIndicatorRow, ScoreRule, SurveyPointType } from './types';
import type { IndicatorSurveyValues } from './indicatorSurveyUtils';
import { matchNumericCondition } from './branchNumericMatch';
import {
  getAppendixBSurveyParts,
  getCompositePartsForPoint,
  isCompositeAppendixNumericSurvey,
} from './appendixBSurveyBinding';
import { normalizeCompositeAggregation } from './compositeAggregation';
import {
  isCompositePartAppendixB,
  isCompositePartValueFilled,
  resolveCompositePartRawValue,
} from './compositePartSource';
import type { IndicatorAppendixBSurveyPart } from './types';
import {
  compositePreflightGateSatisfied,
  resolveCompositePreflightRule,
} from './compositePreflightGate';

function pickRule(rules: ScoreRule[], targetScore: number): ScoreRule | null {
  return rules.reduce<ScoreRule | null>((best, r) => {
    if (!best) return r;
    return Math.abs(r.score - targetScore) < Math.abs(best.score - targetScore) ? r : best;
  }, null);
}

function matchPartTierScore(part: IndicatorAppendixBSurveyPart, n: number): number | null {
  if (!part.tierBands?.length) return null;
  for (const band of part.tierBands) {
    if (!band?.match) continue;
    if (matchNumericCondition(n, band.match)) return band.score;
  }
  return null;
}

export type CompositeScoringContext = {
  pointType?: SurveyPointType;
  appendixB?: Record<string, string | number | boolean | null | undefined>;
  indicators?: RiskIndicatorRow[];
};

function resolveApplicableParts(
  ind: RiskIndicatorRow,
  ctx?: CompositeScoringContext,
): IndicatorAppendixBSurveyPart[] {
  if (ctx?.pointType) {
    return getCompositePartsForPoint(ind, ctx.pointType, ctx.indicators);
  }
  return getAppendixBSurveyParts(ind);
}

/** 复合数值指标：各子项按 tierBands 判档后按 max_f / min_f 聚合 */
export function matchCompositeAppendixSurveyRule(
  ind: RiskIndicatorRow,
  values: IndicatorSurveyValues | undefined | null,
  ctx?: CompositeScoringContext,
): ScoreRule | null {
  if (!isCompositeAppendixNumericSurvey(ind) || !values) return null;

  const preflight = resolveCompositePreflightRule(ind, ctx?.appendixB);
  if (preflight) return preflight;

  const parts = resolveApplicableParts(ind, ctx);
  if (parts.length === 0) return null;

  const aggregation = normalizeCompositeAggregation(ind.survey?.compositeAggregation);
  const rules = ind.scoreRules;
  let chosen = aggregation === 'max_f' ? -Infinity : Infinity;
  let matched: ScoreRule | null = null;

  for (const part of parts) {
    const n = resolveCompositePartRawValue(part, values, ctx?.appendixB);
    if (n === null) return null;
    const partScore = matchPartTierScore(part, n);
    if (partScore === null) return null;
    const better =
      aggregation === 'max_f' ? partScore > chosen : partScore < chosen;
    if (better) {
      chosen = partScore;
      matched = pickRule(rules, partScore);
    }
  }

  return matched;
}

export function isCompositeAppendixSurveyFilled(
  ind: RiskIndicatorRow,
  values: IndicatorSurveyValues | undefined | null,
  ctx?: CompositeScoringContext,
): boolean {
  if (!isCompositeAppendixNumericSurvey(ind)) return false;
  if (compositePreflightGateSatisfied(ind, ctx?.appendixB)) return true;
  const parts = resolveApplicableParts(ind, ctx);
  if (parts.length === 0) return true;
  return parts.every(p => isCompositePartValueFilled(p, values, ctx?.appendixB));
}

/** 普查表单仅展示 appendix_b 子项 */
export function getCompositeAppendixBSurveyParts(
  ind: RiskIndicatorRow,
  pointType?: SurveyPointType,
  indicators?: RiskIndicatorRow[],
): IndicatorAppendixBSurveyPart[] {
  const parts = pointType
    ? getCompositePartsForPoint(ind, pointType, indicators)
    : getAppendixBSurveyParts(ind);
  return parts.filter(isCompositePartAppendixB);
}
