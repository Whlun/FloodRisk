import {
  LEVEL1_DEFAULT_WEIGHT,
  type IndicatorRiskLevelRow,
  type Level1Factor,
  type Level1Weights,
  type RiskIndicatorRow,
  type SurveyPointType,
} from './types';
import { indicatorAppliesToPoint } from './indicatorSurveyUtils';
import { mapScoreToLevel } from './scoreCalculator';

function calcLevel1Partial(
  indicators: RiskIndicatorRow[],
  pointType: SurveyPointType,
  level1: Level1Factor,
  selectedRuleIds: Record<string, string>,
): { score: number; used: boolean } {
  const group = indicators.filter(
    i => i.enabled && i.level1 === level1 && indicatorAppliesToPoint(i, pointType) && selectedRuleIds[i.id],
  );
  if (!group.length) return { score: 0, used: false };
  let sum = 0;
  let wSum = 0;
  for (const ind of group) {
    const rule = ind.scoreRules.find(r => r.id === selectedRuleIds[ind.id]);
    if (!rule) continue;
    sum += ind.weight * rule.score;
    wSum += ind.weight;
  }
  if (wSum <= 0) return { score: 0, used: false };
  return { score: sum / wSum, used: true };
}

export function calcTotalScorePartial(
  indicators: RiskIndicatorRow[],
  pointType: SurveyPointType,
  selectedRuleIds: Record<string, string>,
  level1Weights: Level1Weights = LEVEL1_DEFAULT_WEIGHT,
): { v: number; v1: number; v2: number; v3: number; v4: number; partial: boolean } {
  const v1 = calcLevel1Partial(indicators, pointType, 'HAZARD', selectedRuleIds);
  const v2 = calcLevel1Partial(indicators, pointType, 'FORMATION', selectedRuleIds);
  const v3 = calcLevel1Partial(indicators, pointType, 'BEARING', selectedRuleIds);
  const v4 = calcLevel1Partial(indicators, pointType, 'PREVENTION', selectedRuleIds);

  const parts: { w: number; v: number }[] = [];
  if (v1.used) parts.push({ w: level1Weights.HAZARD, v: v1.score });
  if (v2.used) parts.push({ w: level1Weights.FORMATION, v: v2.score });
  if (v3.used) parts.push({ w: level1Weights.BEARING, v: v3.score });
  if (v4.used) parts.push({ w: level1Weights.PREVENTION, v: v4.score });

  const wSum = parts.reduce((s, p) => s + p.w, 0);
  const v = wSum > 0 ? parts.reduce((s, p) => s + (p.w / wSum) * p.v, 0) : 0;
  return { v, v1: v1.score, v2: v2.score, v3: v3.score, v4: v4.score, partial: parts.length < 4 };
}

export function ratePointFromSelections(
  indicators: RiskIndicatorRow[],
  pointType: SurveyPointType,
  selectedRuleIds: Record<string, string>,
  indicatorLevels: IndicatorRiskLevelRow[],
  coverage: { filled: number; applicable: number; percent: number },
  level1Weights: Level1Weights = LEVEL1_DEFAULT_WEIGHT,
): {
  v: number;
  v1: number;
  v2: number;
  v3: number;
  v4: number;
  level: IndicatorRiskLevelRow | undefined;
  partial: boolean;
} {
  const { v, v1, v2, v3, v4, partial } = calcTotalScorePartial(
    indicators,
    pointType,
    selectedRuleIds,
    level1Weights,
  );
  const level = mapScoreToLevel(v, indicatorLevels);
  return { v, v1, v2, v3, v4, level, partial: partial || coverage.percent < 100 };
}
