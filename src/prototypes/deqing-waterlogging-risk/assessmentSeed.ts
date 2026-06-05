import type { HazardAssessmentPayload, RiskIndicatorRow, SurveyPayload, SurveyPointType } from './types';
import { getPointSurveyIndicatorsForPoint, getRegionalPreventionIndicators } from './indicatorSurveyUtils';
import { deriveAssessmentItemsFromIndicatorValues } from './scoreRuleMapping';

/** 演示样例：易涝点普查值 → 赋分档 */
export function seedAssessmentItemsFromSurvey(
  pointType: SurveyPointType,
  surveyPayload: SurveyPayload,
  indicators: RiskIndicatorRow[],
): HazardAssessmentPayload['items'] {
  const list = getPointSurveyIndicatorsForPoint(indicators, pointType);
  return deriveAssessmentItemsFromIndicatorValues(list, surveyPayload.indicatorValues, {
    areaImportance: surveyPayload.appendixB?.areaImportance,
  });
}

/** 演示样例：全县防灾减灾配置值 → 赋分档 */
export function seedAssessmentItemsFromRegionalValues(
  values: Record<string, string | number | boolean | null>,
  indicators: RiskIndicatorRow[],
): HazardAssessmentPayload['items'] {
  const list = getRegionalPreventionIndicators(indicators);
  return deriveAssessmentItemsFromIndicatorValues(list, values);
}
