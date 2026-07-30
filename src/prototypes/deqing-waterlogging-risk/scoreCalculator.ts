import {
  LEVEL1_DEFAULT_WEIGHT,
  type HazardPointType,
  type Level1Factor,
  type Level1Weights,
  type RiskIndicatorRow,
  type IndicatorRiskLevelRow,
} from './types';
import { isSiblingWeightSumValid } from './weightBalance';

/** 按隐患点类型筛选参与计算的二级指标 */
export function filterIndicatorsForHazard(
  indicators: RiskIndicatorRow[],
  hazardType: HazardPointType,
): RiskIndicatorRow[] {
  return indicators.filter(ind => {
    if (!ind.enabled) return false;
    if (ind.level1 !== 'FORMATION') {
      return ind.applicableTypes.includes('GLOBAL');
    }
    return ind.applicableTypes.includes(hazardType);
  });
}

/** 计算某一级因子得分（二级加权） */
export function calcLevel1Score(
  indicators: RiskIndicatorRow[],
  level1: Level1Factor,
  selectedRuleIds: Record<string, string>,
): number {
  const group = indicators.filter(i => i.level1 === level1);
  if (group.length === 0) return 0;

  let sum = 0;
  let weightSum = 0;
  for (const ind of group) {
    const ruleId = selectedRuleIds[ind.id];
    const rule = ind.scoreRules.find(r => r.id === ruleId);
    if (!rule) continue;
    sum += ind.weight * rule.score;
    weightSum += ind.weight;
  }
  if (weightSum <= 0) return 0;
  return sum / weightSum;
}

/** 计算综合风险分 V（一级加权，公式 5.6.1） */
export function calcTotalScore(
  indicators: RiskIndicatorRow[],
  hazardType: HazardPointType,
  selectedRuleIds: Record<string, string>,
  level1Weights: Level1Weights = LEVEL1_DEFAULT_WEIGHT,
): { v: number; v1: number; v2: number; v3: number; v4: number } {
  const filtered = filterIndicatorsForHazard(indicators, hazardType);
  const v1 = calcLevel1Score(filtered, 'HAZARD', selectedRuleIds);
  const v2 = calcLevel1Score(filtered, 'FORMATION', selectedRuleIds);
  const v3 = calcLevel1Score(filtered, 'BEARING', selectedRuleIds);
  const v4 = calcLevel1Score(filtered, 'PREVENTION', selectedRuleIds);

  const v =
    level1Weights.HAZARD * v1 +
    level1Weights.FORMATION * v2 +
    level1Weights.BEARING * v3 +
    level1Weights.PREVENTION * v4;

  return { v, v1, v2, v3, v4 };
}

/** 根据 V 映射风险等级 */
export function mapScoreToLevel(
  v: number,
  levels: IndicatorRiskLevelRow[],
): IndicatorRiskLevelRow | undefined {
  if (!Number.isFinite(v) || v < 0 || v > 1) return undefined;
  const enabled = levels.filter(l => l.enabled).sort((a, b) => a.sort - b.sort);
  const matched = enabled.find(l => v >= l.scoreMin && v < l.scoreMax);
  if (matched) return matched;

  // 所有区间默认采用 [min, max)；综合分的定义域终点 1 仅允许命中最后一档。
  if (v === 1) {
    const finalLevel = [...enabled].sort(
      (a, b) => a.scoreMax - b.scoreMax || a.scoreMin - b.scoreMin,
    )[enabled.length - 1];
    if (finalLevel && v >= finalLevel.scoreMin && v <= finalLevel.scoreMax) {
      return finalLevel;
    }
  }
  return undefined;
}

/** 同级权重合计校验 */
export function validateSiblingWeights(
  indicators: RiskIndicatorRow[],
  level1: Level1Factor,
  hazardType?: HazardPointType,
): { valid: boolean; sum: number } {
  let group = indicators.filter(i => i.enabled && i.level1 === level1);
  if (level1 === 'FORMATION' && hazardType) {
    group = group.filter(i => i.applicableTypes.includes(hazardType));
  } else if (level1 !== 'FORMATION') {
    group = group.filter(i => i.applicableTypes.includes('GLOBAL'));
  }
  const sum = group.reduce((s, i) => s + i.weight, 0);
  return { valid: group.length === 0 || isSiblingWeightSumValid(sum), sum };
}
