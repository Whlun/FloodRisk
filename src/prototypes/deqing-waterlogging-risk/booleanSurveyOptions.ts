import type { RiskIndicatorRow } from './types';
import { getScoreExplanationTooltipLines } from './scoreExplanation';

/** 布尔型指标下拉：选项文案取自赋分规则（低分档→false，高分档→true） */
export function buildBooleanSurveyOptions(ind: RiskIndicatorRow): { value: boolean; label: string }[] {
  const sorted = [...ind.scoreRules].sort((a, b) => a.score - b.score);
  if (sorted.length >= 2) {
    const low = sorted[0];
    const high = sorted[sorted.length - 1];
    return [
      { value: false, label: low.label },
      { value: true, label: high.label },
    ];
  }
  return [
    { value: false, label: '否' },
    { value: true, label: '是' },
  ];
}

export function getBooleanFieldTooltipLines(ind: RiskIndicatorRow): string[] {
  return getScoreExplanationTooltipLines(ind);
}
