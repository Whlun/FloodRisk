import { describe, expect, it } from 'vitest';
import { appendixBFieldCollectableAtPointType } from '../src/prototypes/deqing-waterlogging-risk/appendixBFieldPointTypes';
import { matchCompositeAppendixSurveyRule } from '../src/prototypes/deqing-waterlogging-risk/compositeAppendixScoring';
import { getGuidelineTierBandTemplate } from '../src/prototypes/deqing-waterlogging-risk/guidelineTierBandTemplates';
import type { RiskIndicatorRow } from '../src/prototypes/deqing-waterlogging-risk/types';

function buildHistoricalLossComposite(): RiskIndicatorRow {
  const deathBands = getGuidelineTierBandTemplate('historicalDeathCount')!.tierBands;
  const trappedBands = getGuidelineTierBandTemplate('historicalTrappedCount')!.tierBands;
  return {
    id: 'u-hist',
    code: 'BR_U_HIST',
    name: '历史灾情损失（自建）',
    level1: 'BEARING',
    applicableTypes: ['GLOBAL'],
    weight: 0.5,
    valueType: 'numeric',
    enabled: true,
    updatedAt: '',
    scoringRuleMode: 'composite',
    scoreRules: [
      { id: 'r0', label: '无历史灾情', riskTier: '低', score: 0 },
      { id: 'r2', label: '较低', riskTier: '较低', score: 0.2 },
      { id: 'r4', label: '中', riskTier: '中', score: 0.4 },
      { id: 'r6', label: '较高', riskTier: '较高', score: 0.6 },
      { id: 'r8', label: '高', riskTier: '高', score: 0.8 },
      { id: 'r10', label: '超高', riskTier: '超高', score: 1 },
    ],
    survey: {
      collectInSurvey: true,
      surveyRequired: false,
      fieldKey: 'BR_U_HIST',
      inputVariant: 'composite_appendix_numeric',
      compositeAggregation: 'max_f',
      compositePreflightGate: {
        appendixBField: 'hasHistoricalDisaster',
        when: false,
        score: 0,
        ruleLabel: '无历史灾情',
      },
      appendixBSurveyParts: [
        {
          appendixBFieldKey: 'historicalDeathCount',
          valueFieldKey: 'BR_U_HIST_D',
          label: '人员死亡（人）',
          tierBands: deathBands,
        },
        {
          appendixBFieldKey: 'historicalTrappedCount',
          valueFieldKey: 'BR_U_HIST_T',
          label: '人员被困（人）',
          tierBands: trappedBands,
        },
      ],
    },
  };
}

describe('复合赋分 · 多条件字段通用能力', () => {
  it('历史灾情共用字段在四种点型均可作复合子项', () => {
    expect(appendixBFieldCollectableAtPointType('historicalDeathCount', 'SUNKEN')).toBe(true);
    expect(appendixBFieldCollectableAtPointType('historicalTrappedCount', 'LOW_LYING')).toBe(true);
  });

  it('前置门控：无历史灾情时直接 F=0', () => {
    const ind = buildHistoricalLossComposite();
    const rule = matchCompositeAppendixSurveyRule(
      ind,
      {},
      {
        pointType: 'SUNKEN',
        appendixB: { hasHistoricalDisaster: false },
      },
    );
    expect(rule?.score).toBe(0);
    expect(rule?.label).toBe('无历史灾情');
  });

  it('多子项 max_f：被困 15 人 → F=0.4', () => {
    const ind = buildHistoricalLossComposite();
    const rule = matchCompositeAppendixSurveyRule(
      ind,
      {},
      {
        pointType: 'SUNKEN',
        appendixB: {
          hasHistoricalDisaster: true,
          historicalDeathCount: 0,
          historicalTrappedCount: 15,
        },
      },
    );
    expect(rule?.score).toBe(0.4);
  });
});
