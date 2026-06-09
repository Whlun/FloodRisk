import type { RegionalPreventionConfig, RiskIndicatorRow, SurveyPayload, SurveyPointType } from './types';
import {
  getIndicatorSurveyValue,
  getPointSurveyIndicatorsForScoring,
  getRegionalPreventionIndicators,
  hasFilledSurveyValue,
  isPointSurveyComplete,
} from './indicatorSurveyUtils';
import { getCompositePartsForPoint, isCompositeAppendixNumericSurvey } from './appendixBSurveyBinding';
import { isCompositePartValueFilled } from './compositePartSource';
import { compositePreflightGateSatisfied } from './compositePreflightGate';
import { matchScoreRuleFromValue, type ScoreMatchContext } from './scoreRuleMapping';
import { getConditionMissingMessage, isConditionalScoringEnabled } from './conditionalScoring';

function deriveRuleSelectionsForIndicators(
  list: RiskIndicatorRow[],
  pointType: SurveyPointType | undefined,
  indicatorValues: SurveyPayload['indicatorValues'],
  context: ScoreMatchContext,
  indicators: RiskIndicatorRow[],
): { selections: Record<string, string>; skipped: string[]; errors: string[] } {
  const selections: Record<string, string> = {};
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const ind of list) {
    if (isCompositeAppendixNumericSurvey(ind)) {
      const parts = pointType
        ? getCompositePartsForPoint(ind, pointType, indicators)
        : ind.survey!.appendixBSurveyParts!;
      if (!parts.length) {
        skipped.push(ind.id);
        continue;
      }
      if (compositePreflightGateSatisfied(ind, context.appendixB)) {
        const rule = matchScoreRuleFromValue(ind, '', context, indicators);
        if (rule) {
          selections[ind.id] = rule.id;
          continue;
        }
      }
      const allFilled = parts.every(p =>
        isCompositePartValueFilled(p, indicatorValues, context.appendixB),
      );
      if (!allFilled) {
        skipped.push(ind.id);
        continue;
      }
      const rule = matchScoreRuleFromValue(ind, '', context, indicators);
      if (!rule) {
        const hint = isConditionalScoringEnabled(ind)
          ? `${ind.name}：无法匹配（${getConditionMissingMessage(ind, indicators)}）`
          : `${ind.name}：无法匹配评估指标分数`;
        errors.push(hint);
        continue;
      }
      selections[ind.id] = rule.id;
      continue;
    }
    const raw = getIndicatorSurveyValue(indicatorValues, ind.survey.fieldKey);
    if (raw === undefined || raw === null || raw === '') {
      skipped.push(ind.id);
      continue;
    }
    const rule = matchScoreRuleFromValue(ind, raw, context, indicators);
    if (!rule) {
      const hint = isConditionalScoringEnabled(ind)
        ? `${ind.name}：无法匹配（${getConditionMissingMessage(ind, indicators)}）`
        : `${ind.name}：无法匹配评估指标分数`;
      errors.push(hint);
      continue;
    }
    selections[ind.id] = rule.id;
  }
  return { selections, skipped, errors };
}

/** 根据风险普查指标值自动匹配附录 F 赋分档（指标体系法） */
export function derivePointRuleSelectionsFromSurvey(
  pointType: SurveyPointType,
  surveyPayload: SurveyPayload,
  indicators: RiskIndicatorRow[],
): { selections: Record<string, string>; skipped: string[]; errors: string[] } {
  return deriveRuleSelectionsForIndicators(
    getPointSurveyIndicatorsForScoring(indicators, pointType),
    pointType,
    surveyPayload.indicatorValues,
    {
      pointType,
      areaImportance: surveyPayload.appendixB?.areaImportance,
      appendixB: surveyPayload.appendixB,
      indicatorValues: surveyPayload.indicatorValues,
    },
    indicators,
  );
}

/** 等级试算：普查原始值 + 防灾减灾原始值 → 赋分档 */
export function derivePreviewRuleSelections(
  pointType: SurveyPointType,
  surveyPayload: SurveyPayload,
  indicators: RiskIndicatorRow[],
): { selections: Record<string, string>; skipped: string[]; errors: string[] } {
  const context: ScoreMatchContext = {
    areaImportance: surveyPayload.appendixB?.areaImportance,
    appendixB: surveyPayload.appendixB,
    indicatorValues: surveyPayload.indicatorValues,
  };
  const point = deriveRuleSelectionsForIndicators(
    getPointSurveyIndicatorsForScoring(indicators, pointType),
    pointType,
    surveyPayload.indicatorValues,
    { ...context, pointType },
    indicators,
  );
  const region = deriveRuleSelectionsForIndicators(
    getRegionalPreventionIndicators(indicators),
    undefined,
    surveyPayload.indicatorValues,
    context,
    indicators,
  );
  return {
    selections: { ...point.selections, ...region.selections },
    skipped: [...point.skipped, ...region.skipped],
    errors: [...point.errors, ...region.errors],
  };
}

/** 全县防灾减灾赋分档（防灾减灾配置页保存结果） */
export function deriveRegionalPreventionSelections(
  regional: RegionalPreventionConfig,
  indicators: RiskIndicatorRow[],
): { selections: Record<string, string>; skipped: string[]; errors: string[] } {
  const selections: Record<string, string> = {};
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const ind of getRegionalPreventionIndicators(indicators)) {
    const item = regional.assessmentPayload.items[ind.id];
    if (!item?.ruleId) {
      skipped.push(ind.id);
      continue;
    }
    const rule = ind.scoreRules.find(r => r.id === item.ruleId);
    if (!rule) {
      errors.push(`${ind.name}：评估指标分数无效`);
      continue;
    }
    selections[ind.id] = item.ruleId;
  }
  return { selections, skipped, errors };
}

/** 定级：普查自动映射 + 全县防灾减灾 */
export function mergeRatingRuleSelections(
  pointType: SurveyPointType,
  surveyPayload: SurveyPayload,
  regional: RegionalPreventionConfig,
  indicators: RiskIndicatorRow[],
): { selections: Record<string, string>; errors: string[] } {
  const point = derivePointRuleSelectionsFromSurvey(pointType, surveyPayload, indicators);
  const region = deriveRegionalPreventionSelections(regional, indicators);
  return {
    selections: { ...point.selections, ...region.selections },
    errors: [...point.errors, ...region.errors],
  };
}

export function canRatePoint(
  pointType: SurveyPointType,
  surveyStatus: string,
  surveyPayload: SurveyPayload,
  regional: RegionalPreventionConfig | null | undefined,
  indicators: RiskIndicatorRow[],
  /** 本条普查绑定架构 merge 后的指标；缺省与 indicators 相同 */
  surveyIndicators?: RiskIndicatorRow[],
): boolean {
  const coverage = surveyIndicators ?? indicators;
  if (surveyStatus !== 'completed') return false;
  if (
    !isPointSurveyComplete(coverage, pointType, surveyPayload.indicatorValues, {
      architectureScoped: true,
    })
  ) {
    return false;
  }
  if (!regional || regional.assessmentStatus !== 'completed') return false;
  const { selections, errors } = mergeRatingRuleSelections(pointType, surveyPayload, regional, indicators);
  return Object.keys(selections).length > 0 && errors.length === 0;
}
