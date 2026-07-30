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

function parseBooleanSurveyValue(raw: string | number | boolean): boolean | null {
  if (raw === true || raw === false) return raw;
  if (raw === 1 || raw === 0) return raw === 1;
  const normalized = String(raw).trim().toLowerCase();
  if (normalized === 'true' || normalized === 'yes' || normalized === '1') return true;
  if (normalized === 'false' || normalized === 'no' || normalized === '0') return false;
  return null;
}

/** 根据指标原始值匹配附录 F 赋分档（仅读 scoreRules.numericMatch / 条件赋分配置） */
export function matchScoreRuleFromValue(
  ind: RiskIndicatorRow,
  raw: string | number | boolean,
  context?: ScoreMatchContext,
  indicators?: RiskIndicatorRow[],
): ScoreRule | null {
  const conditional = matchScoreRuleWithConditional(ind, raw, context, indicators);
  if (conditional) return conditional;
  // 条件赋分启用后，缺失条件或未覆盖分支必须显式失败，不能静默换用统一赋分档。
  if (ind.conditionalScoring?.enabled) return null;

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
    // 兼容历史普查数据直接保存了分档文案/风险等级，而不是布尔字面量。
    const direct = rules.find(
      r => r.label === String(raw) || r.riskTier === String(raw) || r.id === String(raw),
    );
    if (direct) return direct;
    const b = parseBooleanSurveyValue(raw);
    if (b === null) return null;
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
