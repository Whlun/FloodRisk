import type { RiskIndicatorRow, ScoreRule } from './types';
import { validateConditionalScoring } from './conditionalScoring';
import {
  requiresNumericBandConfig,
  validateNumericUniformBands,
} from './scoreRuleNumericBands';

export const VALUE_TYPE_LABEL: Record<RiskIndicatorRow['valueType'], string> = {
  enum: '枚举',
  numeric: '数值',
  boolean: '布尔',
};

/** 布尔型默认两档：普查填 true/false，按 score 映射（≤0.1 / ≥0.9） */
export const DEFAULT_BOOLEAN_SCORE_RULES: Omit<ScoreRule, 'id'>[] = [
  { label: '否（取 false）', riskTier: '低', score: 0 },
  { label: '是（取 true）', riskTier: '高', score: 1 },
];

export function getScoreRuleLimits(valueType: RiskIndicatorRow['valueType']): { min: number; max: number } {
  switch (valueType) {
    case 'boolean':
      return { min: 2, max: 2 };
    case 'numeric':
      return { min: 2, max: 8 };
    default:
      return { min: 1, max: 20 };
  }
}

export function getValueTypeSurveyHint(valueType: RiskIndicatorRow['valueType']): string {
  switch (valueType) {
    case 'boolean':
      return '普查/配置填报为「是、否」；系统按赋分规则中 score≤0.1 与 score≥0.9 两档映射。';
    case 'numeric':
      return '普查/配置填报为数值；定级时按各赋分档配置的「匹配区间」自动命中标准分 F（自上而下先命中先生效）。';
    default:
      return '普查/配置填报为下拉，选项来自赋分规则中的分档描述（label）。';
  }
}

export function getValueTypeRulesHint(valueType: RiskIndicatorRow['valueType']): string {
  const { min, max } = getScoreRuleLimits(valueType);
  if (valueType === 'boolean') {
    return '布尔型须恰好 2 档赋分（通常 score 为 0 与 1），与普查「是/否」一一对应。';
  }
  if (valueType === 'numeric') {
    return `数值型建议 ${min}～${max} 档赋分；每档须配置匹配区间，分档描述用于普查结果展示。`;
  }
  return `枚举型须 ${min}～${max} 档赋分，每档 label 即普查下拉选项文案。`;
}

/** 导则「地区重要性」四档（枚举 label = 普查下拉文案） */
export const DEFAULT_BR_AREA_IMPORTANCE_SCORE_RULES: Omit<ScoreRule, 'id'>[] = [
  { label: '其他区域', riskTier: '低', score: 0.25 },
  { label: '其他行车道路、附近具有丙类民用建筑工程的区域', riskTier: '中', score: 0.5 },
  { label: '交通干道、附近具有乙类民用建筑工程的区域', riskTier: '较高', score: 0.75 },
  { label: '中心商业、附近具有甲类民用建筑工程的区域', riskTier: '高', score: 1 },
];

export function createDefaultScoreRulesForValueType(
  valueType: RiskIndicatorRow['valueType'],
  idPrefix = 'rule',
  indicatorCode?: string,
): ScoreRule[] {
  if (valueType === 'boolean') {
    return DEFAULT_BOOLEAN_SCORE_RULES.map((r, i) => ({ ...r, id: `${idPrefix}-b${i}` }));
  }
  if (valueType === 'enum' && indicatorCode === 'BR_AREA_IMPORTANCE') {
    return DEFAULT_BR_AREA_IMPORTANCE_SCORE_RULES.map((r, i) => ({
      ...r,
      id: `${idPrefix}-br${i}`,
    }));
  }
  return [{ label: '', riskTier: '', score: 0, id: `${idPrefix}-0` }];
}

export function validateScoreRulesForValueType(
  valueType: RiskIndicatorRow['valueType'],
  scoreRules: ScoreRule[],
  indicatorCode?: string,
  conditionalScoring?: RiskIndicatorRow['conditionalScoring'],
  rowForScope?: RiskIndicatorRow,
  allIndicators?: RiskIndicatorRow[],
): string | null {
  const condErr = validateConditionalScoring(
    rowForScope
      ? { ...rowForScope, valueType, scoreRules, conditionalScoring }
      : { valueType, scoreRules, conditionalScoring, level1: 'HAZARD' as const, survey: { fieldKey: indicatorCode ?? '' } },
    allIndicators,
  );
  if (condErr) return condErr;
  if (conditionalScoring?.enabled) {
    if (conditionalScoring.mode === 'branch_rules') return null;
    if (conditionalScoring.mode === 'branch_threshold') return null;
  }
  const { min, max } = getScoreRuleLimits(valueType);
  const n = scoreRules.length;
  if (n < min || n > max) {
    if (valueType === 'boolean') {
      return '布尔型指标须配置恰好 2 档赋分规则';
    }
    return `当前值类型要求赋分档数量为 ${min}～${max} 档，当前为 ${n} 档`;
  }
  if (valueType === 'boolean') {
    const scores = scoreRules.map(r => r.score);
    const hasLow = scores.some(s => s <= 0.1);
    const hasHigh = scores.some(s => s >= 0.9);
    if (!hasLow || !hasHigh) {
      return '布尔型两档赋分建议分别使用 score≤0.1（对应「否」）与 score≥0.9（对应「是」）';
    }
  }
  if (
    valueType === 'numeric' &&
    rowForScope &&
    requiresNumericBandConfig(rowForScope)
  ) {
    const bandErr = validateNumericUniformBands(scoreRules);
    if (bandErr) return bandErr;
  }
  return null;
}
