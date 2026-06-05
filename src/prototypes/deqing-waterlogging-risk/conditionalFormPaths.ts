import type { FormInstance } from 'antd';
import { isAppendixBasicInfoIndicatorValueKey } from './compositeConditionalSurvey';
import type { ScoreMatchContext } from './scoreRuleMapping';

/** 条件赋分依赖的表单字段路径（风险普查 vs 防灾减灾配置） */
export type ConditionalFormVariant = 'survey' | 'prevention';

export function getIndicatorValuesPath(variant: ConditionalFormVariant): (string | number)[] {
  return variant === 'prevention' ? ['indicatorValues'] : ['surveyPayload', 'indicatorValues'];
}

export function getAppendixBFieldPath(
  variant: ConditionalFormVariant,
  key: string,
): (string | number)[] | null {
  if (variant === 'prevention') return null;
  return ['surveyPayload', 'appendixB', key];
}

export function getAreaImportancePath(variant: ConditionalFormVariant): (string | number)[] | null {
  return getAppendixBFieldPath(variant, 'areaImportance');
}

export function getConditionSourceWatchPath(
  variant: ConditionalFormVariant,
  sourceType: 'appendix_b' | 'indicator',
  sourceKey: string,
): (string | number)[] {
  if (sourceType === 'appendix_b') {
    if (isAppendixBasicInfoIndicatorValueKey(sourceKey)) {
      return variant === 'prevention'
        ? ['indicatorValues', sourceKey]
        : ['surveyPayload', 'indicatorValues', sourceKey];
    }
    return getAppendixBFieldPath(variant, sourceKey) ?? ['__invalid_appendix__'];
  }
  return variant === 'prevention'
    ? ['indicatorValues', sourceKey]
    : ['surveyPayload', 'indicatorValues', sourceKey];
}

export function buildScoreMatchContextFromForm(
  form: FormInstance,
  variant: ConditionalFormVariant,
): ScoreMatchContext {
  const indicatorValues = form.getFieldValue(getIndicatorValuesPath(variant)) as
    | Record<string, string | number | boolean | null>
    | undefined;
  if (variant === 'prevention') {
    return { indicatorValues: indicatorValues ?? {} };
  }
  const appendixB = form.getFieldValue(['surveyPayload', 'appendixB']) as ScoreMatchContext['appendixB'];
  return {
    areaImportance: appendixB?.areaImportance,
    appendixB,
    indicatorValues: indicatorValues ?? {},
  };
}
