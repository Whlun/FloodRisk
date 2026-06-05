import type { FormInstance } from 'antd';
import type { IndicatorAppendixBSurveyPart } from './types';
import { deriveCompositeAggregateScoreRules } from './compositeAggregateScoreRules';
/** 复合模式：根据子项分档刷新表单内 scoreRules（供预览与保存前一致） */
export function syncCompositeFormAggregateScoreRules(form: FormInstance): void {
  const scoringRuleMode = form.getFieldValue('scoringRuleMode');
  const survey = form.getFieldValue('survey');
  if (scoringRuleMode !== 'composite' && survey?.inputVariant !== 'composite_appendix_numeric') {
    return;
  }
  const code = String(form.getFieldValue('code') ?? '').trim() || 'IND';
  const parts = (survey?.appendixBSurveyParts ?? []) as IndicatorAppendixBSurveyPart[];
  const scoreRules = deriveCompositeAggregateScoreRules(
    parts,
    code,
    form.getFieldValue('scoreRules'),
  );
  form.setFieldValue('scoreRules', scoreRules);
}
