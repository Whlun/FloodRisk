import { describe, expect, it } from 'vitest';
import { initialRiskIndicators } from '../src/database/deqing-waterlogging-risk-indicators';
import {
  deriveCompositeAggregateScoreRules,
  syncCompositeAggregateScoreRules,
} from '../src/prototypes/deqing-waterlogging-risk/compositeAggregateScoreRules';
import {
  fillCompositeSurveyPartsTierBands,
  getValidTierBands,
} from '../src/prototypes/deqing-waterlogging-risk/compositeSurveyHydration';
import { GUIDELINE_537_PEDESTRIAN_APPENDIX_KEY } from '../src/prototypes/deqing-waterlogging-risk/surveyTemplates';
import { buildScoringRuleModePatch } from '../src/prototypes/deqing-waterlogging-risk/scoringRuleMode';
import type { IndicatorAppendixBSurveyPart } from '../src/prototypes/deqing-waterlogging-risk/types';

describe('deriveCompositeAggregateScoreRules', () => {
  it('两子项含 0.2/0.6/1 时输出 3 档', () => {
    const parts: IndicatorAppendixBSurveyPart[] = [
      {
        appendixBFieldKey: 'a',
        valueFieldKey: 'A',
        label: '子项 A',
        tierBands: [
          { riskTier: '低', score: 0.2, match: { kind: 'gt', value: 0 } },
          { riskTier: '高', score: 1, match: { kind: 'lt', value: 0 } },
        ],
      },
      {
        appendixBFieldKey: 'b',
        valueFieldKey: 'B',
        label: '子项 B',
        tierBands: [{ riskTier: '中', score: 0.6, match: { kind: 'gte', value: 1 } }],
      },
    ];
    const rules = deriveCompositeAggregateScoreRules(parts, 'TEST');
    expect(rules).toHaveLength(3);
    expect(rules.map(r => r.score)).toEqual([0.2, 0.6, 1]);
    expect(rules[0].label).toContain('0.20');
  });

  it('仅两档 score 时输出 2 档', () => {
    const parts: IndicatorAppendixBSurveyPart[] = [
      {
        appendixBFieldKey: 'a',
        valueFieldKey: 'A',
        label: '子项',
        tierBands: [
          { riskTier: '低', score: 0.2, match: { kind: 'gt', value: 0 } },
          { riskTier: '高', score: 1, match: { kind: 'lt', value: 0 } },
        ],
      },
    ];
    const rules = deriveCompositeAggregateScoreRules(parts, 'T');
    expect(rules).toHaveLength(2);
    expect(rules.map(r => r.score)).toEqual([0.2, 1]);
  });

  it('无分档时不生成聚合档位', () => {
    const rules = deriveCompositeAggregateScoreRules([], 'T');
    expect(rules).toHaveLength(0);
  });

  it('稀疏 tierBands（含 undefined）不抛错', () => {
    const parts = [
      {
        appendixBFieldKey: 'a',
        valueFieldKey: 'A',
        label: '子项',
        tierBands: [
          { riskTier: '低', score: 0.2, match: { kind: 'gt', value: 0 } },
          undefined,
          { riskTier: '高', score: 1, match: { kind: 'lt', value: 0 } },
        ],
      },
    ] as IndicatorAppendixBSurveyPart[];
    const rules = deriveCompositeAggregateScoreRules(parts, 'T');
    expect(rules).toHaveLength(2);
    expect(rules.map(r => r.score)).toEqual([0.2, 1]);
  });

  it('syncCompositeAggregateScoreRules 覆盖复合指标 scoreRules', () => {
    const ug = initialRiskIndicators.find(i => i.code === 'FM_UG_ENTRANCE_H')!;
    const synced = syncCompositeAggregateScoreRules({
      ...ug,
      scoreRules: [{ id: 'x', label: '旧文案', riskTier: '低', score: 0.2 }],
    });
    expect(synced.scoreRules.length).toBeGreaterThanOrEqual(2);
    expect(synced.scoreRules.some(r => r.label.includes('聚合 ·'))).toBe(true);
  });

  it('人行出入口普查字段可自动填入标准分档', () => {
    const filled = fillCompositeSurveyPartsTierBands([
      {
        appendixBFieldKey: GUIDELINE_537_PEDESTRIAN_APPENDIX_KEY,
        valueFieldKey: 'PED',
        label: '人行出入口与室外地面高程差（H/m）',
        tierBands: [],
      },
    ]);
    expect(getValidTierBands(filled[0]?.tierBands).length).toBe(3);
    expect(filled[0]?.tierBands?.[0]?.match?.kind).toBe('gt');
  });

  it('切换为复合模式后 patch 子项可推导 scoreRules', () => {
    const patch = buildScoringRuleModePatch(
      { code: 'NEW', valueType: 'numeric', survey: { collectInSurvey: true, surveyRequired: false, fieldKey: 'NEW' } },
      'composite',
    );
    const rules = deriveCompositeAggregateScoreRules(patch.survey?.appendixBSurveyParts, 'NEW');
    expect(rules.length).toBeGreaterThanOrEqual(2);
  });
});
