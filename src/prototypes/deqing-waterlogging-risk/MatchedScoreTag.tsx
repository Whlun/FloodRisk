import React from 'react';
import { Tag } from 'antd';
import type { AreaImportance, RiskIndicatorRow } from './types';
import { matchScoreRuleFromValue } from './scoreRuleMapping';
import { getNumericRangeError } from './numericIndicatorConstraints';
import { formatMatchedScoreHint } from './scoreRuleDisplay';
import { getConditionMissingMessage, isConditionalScoringEnabled } from './conditionalScoring';
import type { ScoreMatchContext } from './scoreRuleMapping';
import { isCompositeAppendixNumericSurvey } from './appendixBSurveyBinding';
import { isCompositeAppendixSurveyFilled } from './compositeAppendixScoring';

/** 赋分匹配结果标签统一样式 */
const MATCHED_TAG_STYLE: React.CSSProperties = {
  marginLeft: 0,
  fontWeight: 400,
  fontSize: 12,
};

export type MatchedScoreState =
  | { kind: 'empty' }
  | { kind: 'matched'; label: string; scoreText: string }
  | { kind: 'warn'; message: string };

export function resolveMatchedScoreState(
  ind: RiskIndicatorRow,
  raw: string | number | boolean | null | undefined,
  context?: ScoreMatchContext | AreaImportance,
): MatchedScoreState {
  const matchContext: ScoreMatchContext | undefined =
    typeof context === 'string' || context === undefined
      ? context === undefined
        ? undefined
        : { areaImportance: context }
      : context;

  if (isCompositeAppendixNumericSurvey(ind)) {
    const compositeParts = ind.survey!.appendixBSurveyParts!;
    const values = matchContext?.indicatorValues;
    if (!values || !isCompositeAppendixSurveyFilled(ind, values)) {
      return { kind: 'empty' };
    }
    for (const part of compositeParts) {
      const partRaw = values[part.valueFieldKey];
      if (getNumericRangeError(part.appendixBFieldKey, partRaw)) {
        return { kind: 'empty' };
      }
    }
    const rule = matchScoreRuleFromValue(ind, '', matchContext);
    if (!rule) {
      return { kind: 'warn', message: '无法匹配赋分' };
    }
    return {
      kind: 'matched',
      label: rule.label,
      scoreText: formatMatchedScoreHint(rule),
    };
  }

  if (raw === undefined || raw === null || raw === '') {
    return { kind: 'empty' };
  }
  if (ind.valueType === 'numeric' && getNumericRangeError(ind.code, raw)) {
    return { kind: 'empty' };
  }
  const rule = matchScoreRuleFromValue(ind, raw, matchContext);
  if (!rule) {
    const message = isConditionalScoringEnabled(ind)
      ? getConditionMissingMessage(ind)
      : '无法匹配赋分';
    return { kind: 'warn', message };
  }
  return {
    kind: 'matched',
    label: rule.label,
    scoreText: formatMatchedScoreHint(rule),
  };
}

/** 标题后实时展示的赋分档标签（样式统一） */
export const MatchedScoreTag: React.FC<{
  ind: RiskIndicatorRow;
  raw: string | number | boolean | null | undefined;
  areaImportance?: AreaImportance;
  indicatorValues?: Record<string, string | number | boolean | null>;
  /** full：分档描述 + 分数；scoreOnly：仅「评估指标分数 x」 */
  displayMode?: 'full' | 'scoreOnly';
}> = ({ ind, raw, areaImportance, indicatorValues, displayMode = 'full' }) => {
  const state = resolveMatchedScoreState(ind, raw, { areaImportance, indicatorValues });
  if (state.kind === 'empty') return null;
  if (state.kind === 'warn') {
    return (
      <Tag color="warning" className="dq-matched-score-tag" style={MATCHED_TAG_STYLE}>
        {state.message}
      </Tag>
    );
  }
  const text = displayMode === 'scoreOnly' ? state.scoreText : `${state.label} · ${state.scoreText}`;
  return (
    <Tag color="blue" className="dq-matched-score-tag" style={MATCHED_TAG_STYLE}>
      {text}
    </Tag>
  );
};
