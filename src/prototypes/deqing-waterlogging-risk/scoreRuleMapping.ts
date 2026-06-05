import type { HazardAssessmentPayload, RiskIndicatorRow, ScoreRule } from './types';
import {
  getIndicatorSurveyValue,
  hasFilledSurveyValue,
} from './indicatorSurveyUtils';
import { matchScoreRuleWithConditional, type ScoreMatchContext } from './conditionalScoring';
import { isCompositeAppendixNumericSurvey } from './appendixBSurveyBinding';
import { matchCompositeAppendixSurveyRule } from './compositeAppendixScoring';
import { compositePreflightGateSatisfied } from './compositePreflightGate';
import { isCompositePartValueFilled } from './compositePartSource';
import { isDesignReturnPeriodCode, matchDesignReturnPeriodRule } from './designReturnPeriod';
import { matchScoreRuleByNumericBands } from './scoreRuleNumericBands';

export type { ScoreMatchContext };

/** 根据指标原始值匹配附录 F 赋分档（仅读 scoreRules.numericMatch / 条件赋分配置） */
export function matchScoreRuleFromValue(
  ind: RiskIndicatorRow,
  raw: string | number | boolean,
  context?: ScoreMatchContext,
  indicators?: RiskIndicatorRow[],
): ScoreRule | null {
  const conditional = matchScoreRuleWithConditional(ind, raw, context, indicators);
  if (conditional) return conditional;

  const values = context?.indicatorValues;
  if (isCompositeAppendixNumericSurvey(ind) && values) {
    const composite = matchCompositeAppendixSurveyRule(ind, values, {
      pointType: context?.pointType,
      appendixB: context?.appendixB,
      indicators,
    });
    if (composite) return composite;
  }

  const rules = ind.scoreRules;
  if (ind.valueType === 'boolean') {
    const b = Boolean(raw);
    return rules.find(r => (b && r.score >= 0.9) || (!b && r.score <= 0.1)) ?? rules[b ? rules.length - 1 : 0];
  }
  if (ind.valueType === 'numeric') {
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
    if (Number.isNaN(n)) return null;
    if (isDesignReturnPeriodCode(ind.code)) {
      const area = context?.areaImportance ?? context?.appendixB?.areaImportance;
      const periodRule = matchDesignReturnPeriodRule(ind, n, area);
      if (periodRule) return periodRule;
    }
    return matchScoreRuleByNumericBands(rules, n);
  }
  const s = String(raw);
  return rules.find(r => r.label === s || r.riskTier === s || r.id === s) ?? null;
}

/** 由指标值批量推导赋分档认定（用于保存定级） */
export function deriveAssessmentItemsFromIndicatorValues(
  indicators: RiskIndicatorRow[],
  values: Record<string, string | number | boolean | null>,
  context?: ScoreMatchContext,
): HazardAssessmentPayload['items'] {
  const items: HazardAssessmentPayload['items'] = {};
  for (const ind of indicators) {
    if (isCompositeAppendixNumericSurvey(ind)) {
      const parts = ind.survey!.appendixBSurveyParts!;
      const appendixB = context?.appendixB;
      if (compositePreflightGateSatisfied(ind, appendixB)) {
        const rule = matchScoreRuleFromValue(ind, '', { ...context, indicatorValues: values }, indicators);
        if (rule) items[ind.id] = { ruleId: rule.id };
        continue;
      }
      const allFilled = parts.every(p =>
        isCompositePartValueFilled(p, values, context?.appendixB),
      );
      if (!allFilled) continue;
      const rule = matchScoreRuleFromValue(ind, '', { ...context, indicatorValues: values }, indicators);
      if (rule) items[ind.id] = { ruleId: rule.id };
      continue;
    }
    const raw = getIndicatorSurveyValue(values, ind.survey.fieldKey);
    if (raw === undefined || raw === null || raw === '') continue;
    const rule = matchScoreRuleFromValue(ind, raw, { ...context, indicatorValues: values }, indicators);
    if (rule) items[ind.id] = { ruleId: rule.id };
  }
  return items;
}
