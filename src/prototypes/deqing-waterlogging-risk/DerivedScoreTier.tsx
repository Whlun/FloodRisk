import React from 'react';
import type { AreaImportance, RiskIndicatorRow } from './types';
import { getIndicatorSurveyValue } from './indicatorSurveyUtils';
import { MatchedScoreTag } from './MatchedScoreTag';
import { formatScoreRuleOptionLabel } from './scoreRuleDisplay';
import type { ScoreRule } from './types';

interface Props {
  ind: RiskIndicatorRow;
  values: Record<string, string | number | boolean | null> | undefined;
  areaImportance?: AreaImportance;
}

/** @deprecated 赋分展示已移至 SurveyFieldLabel 标题后；防灾减灾等只读场景可继续用 */
export const DerivedScoreTier: React.FC<Props> = ({ ind, values, areaImportance }) => {
  const raw = values ? getIndicatorSurveyValue(values, ind.survey.fieldKey) : undefined;
  return <MatchedScoreTag ind={ind} raw={raw} areaImportance={areaImportance} />;
};

export function scoreRuleSelectOptions(ind: RiskIndicatorRow) {
  return ind.scoreRules.map((r: ScoreRule) => ({
    value: r.label,
    label: formatScoreRuleOptionLabel(r),
  }));
}
