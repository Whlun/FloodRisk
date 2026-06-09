import { describe, expect, it } from 'vitest';
import { getCompositeSurveyPartFieldOptions } from '../src/prototypes/deqing-waterlogging-risk/conditionalScoring';
import { getCompositePartsForPoint } from '../src/prototypes/deqing-waterlogging-risk/appendixBSurveyBinding';
import { indicatorAppliesToPoint } from '../src/prototypes/deqing-waterlogging-risk/indicatorSurveyUtils';
import { matchCompositeAppendixSurveyRule } from '../src/prototypes/deqing-waterlogging-risk/compositeAppendixScoring';
import { appendixBFieldCollectableAtPointType } from '../src/prototypes/deqing-waterlogging-risk/appendixBFieldPointTypes';
import { normalizeCompositeAggregation } from '../src/prototypes/deqing-waterlogging-risk/compositeAggregation';
import type { RiskIndicatorRow } from '../src/prototypes/deqing-waterlogging-risk/types';

function compositeHazardTest(
  aggregation: 'max_f' | 'min_f' = 'max_f',
  parts?: RiskIndicatorRow['survey']['appendixBSurveyParts'],
): RiskIndicatorRow {
  return {
    id: 'test-hazard-composite',
    code: 'TEST_HAZARD_COMP',
    name: '测试致灾复合',
    level1: 'HAZARD',
    applicableTypes: ['GLOBAL'],
    weight: 0.1,
    enabled: true,
    valueType: 'numeric',
    updatedAt: '',
    scoringRuleMode: 'composite',
    survey: {
      collectInSurvey: true,
      surveyRequired: false,
      fieldKey: 'TEST_HAZARD_COMP',
      inputVariant: 'composite_appendix_numeric',
      compositeAggregation: aggregation,
      appendixBSurveyParts: parts ?? [
        {
          source: { type: 'appendix_b', key: 'pedestrianEntranceElevationDiffM' },
          appendixBFieldKey: 'pedestrianEntranceElevationDiffM',
          valueFieldKey: 'TEST_PED',
          label: '人行出入口高程差',
          tierBands: [
            { riskTier: '低', score: 0.2, match: { kind: 'gt', value: 0.45 } },
            { riskTier: '高', score: 1, match: { kind: 'lte', value: 0.45 } },
          ],
        },
      ],
    },
    scoreRules: [
      { id: 'r-low', label: '低', riskTier: '低', score: 0.2 },
      { id: 'r-high', label: '高', riskTier: '高', score: 1 },
    ],
  };
}

const slopeIndicator: RiskIndicatorRow = {
  id: 'fm-slope',
  code: 'FM_SK_LONG_SLOPE',
  name: '纵坡度',
  level1: 'FORMATION',
  applicableTypes: ['SUNKEN'],
  weight: 0.1,
  enabled: true,
  valueType: 'numeric',
  updatedAt: '',
  survey: { collectInSurvey: true, surveyRequired: false, fieldKey: 'FM_SK_LONG_SLOPE' },
  scoreRules: [],
};

describe('复合赋分点型适用性', () => {
  it('地下空间孕灾指标可选人行/车行出入口高程差', () => {
    const ind: RiskIndicatorRow = {
      id: 'fm-u008',
      code: 'FM_U008',
      name: '出入口与室外地面高程差',
      level1: 'FORMATION',
      applicableTypes: ['UNDERGROUND'],
      weight: 0.1,
      enabled: true,
      valueType: 'numeric',
      updatedAt: '',
      scoringRuleMode: 'composite',
      survey: {
        collectInSurvey: true,
        surveyRequired: true,
        fieldKey: 'FM_U008',
        inputVariant: 'composite_appendix_numeric',
        compositeAggregation: 'max_f',
      },
      scoreRules: [],
    };
    const opts = getCompositeSurveyPartFieldOptions(ind, [ind]);
    expect(opts.some(o => o.value === 'pedestrianEntranceElevationDiffM')).toBe(true);
    expect(opts.some(o => o.value === 'vehicleEntranceElevationDiffM')).toBe(true);
  });

  it('GLOBAL 致灾复合配置不出现地下专用普查字段', () => {
    const ind = compositeHazardTest();
    const opts = getCompositeSurveyPartFieldOptions(ind, [ind]);
    expect(opts.some(o => o.value === 'pedestrianEntranceElevationDiffM')).toBe(false);
  });

  it('非地下易涝点不适用该指标', () => {
    const ind = compositeHazardTest();
    expect(indicatorAppliesToPoint(ind, 'SUNKEN', [ind])).toBe(false);
    expect(indicatorAppliesToPoint(ind, 'UNDERGROUND', [ind])).toBe(true);
  });

  it('地下专用字段仅地下空间可采集', () => {
    expect(appendixBFieldCollectableAtPointType('pedestrianEntranceElevationDiffM', 'UNDERGROUND')).toBe(
      true,
    );
    expect(appendixBFieldCollectableAtPointType('pedestrianEntranceElevationDiffM', 'SUNKEN')).toBe(
      false,
    );
  });

  it('下凹点无适用子项时不匹配赋分', () => {
    const ind = compositeHazardTest();
    expect(getCompositePartsForPoint(ind, 'SUNKEN', [ind])).toHaveLength(0);
    const rule = matchCompositeAppendixSurveyRule(ind, { TEST_PED: 0.5 }, { pointType: 'SUNKEN', indicators: [ind] });
    expect(rule).toBeNull();
  });

  it('worst_score 迁移为 max_f', () => {
    expect(normalizeCompositeAggregation('worst_score')).toBe('max_f');
    expect(normalizeCompositeAggregation('min_f')).toBe('min_f');
  });

  it('max_f 取各子项较大 F', () => {
    const ind = compositeHazardTest('max_f', [
      {
        source: { type: 'appendix_b', key: 'pedestrianEntranceElevationDiffM' },
        appendixBFieldKey: 'pedestrianEntranceElevationDiffM',
        valueFieldKey: 'P1',
        label: '子项1',
        tierBands: [
          { riskTier: '低', score: 0.2, match: { kind: 'lte', value: 5 } },
          { riskTier: '高', score: 0.8, match: { kind: 'gt', value: 5 } },
        ],
      },
      {
        source: { type: 'appendix_b', key: 'vehicleEntranceElevationDiffM' },
        appendixBFieldKey: 'vehicleEntranceElevationDiffM',
        valueFieldKey: 'P2',
        label: '子项2',
        tierBands: [
          { riskTier: '低', score: 0.3, match: { kind: 'lte', value: 5 } },
          { riskTier: '高', score: 1, match: { kind: 'gt', value: 5 } },
        ],
      },
    ]);
    const rule = matchCompositeAppendixSurveyRule(
      ind,
      { P1: 10, P2: 10 },
      { pointType: 'UNDERGROUND', indicators: [ind] },
    );
    expect(rule?.score).toBe(1);
  });

  it('min_f 取各子项较小 F', () => {
    const ind = compositeHazardTest('min_f', [
      {
        source: { type: 'appendix_b', key: 'pedestrianEntranceElevationDiffM' },
        appendixBFieldKey: 'pedestrianEntranceElevationDiffM',
        valueFieldKey: 'P1',
        label: '子项1',
        tierBands: [
          { riskTier: '低', score: 0.2, match: { kind: 'gt', value: 0 } },
          { riskTier: '高', score: 0.9, match: { kind: 'lte', value: 0 } },
        ],
      },
      {
        source: { type: 'appendix_b', key: 'vehicleEntranceElevationDiffM' },
        appendixBFieldKey: 'vehicleEntranceElevationDiffM',
        valueFieldKey: 'P2',
        label: '子项2',
        tierBands: [
          { riskTier: '低', score: 0.5, match: { kind: 'gt', value: 0 } },
          { riskTier: '高', score: 1, match: { kind: 'lte', value: 0 } },
        ],
      },
    ]);
    const rule = matchCompositeAppendixSurveyRule(
      ind,
      { P1: 1, P2: 1 },
      { pointType: 'UNDERGROUND', indicators: [ind] },
    );
    expect(rule?.score).toBe(0.2);
  });

  it('混合 appendix_b + indicator 子项 max_f', () => {
    const ind: RiskIndicatorRow = {
      ...compositeHazardTest('max_f'),
      level1: 'FORMATION',
      applicableTypes: ['SUNKEN'],
      scoreRules: [
        { id: 'r-low', label: '低', riskTier: '低', score: 0.2 },
        { id: 'r-mid', label: '中', riskTier: '中', score: 0.7 },
        { id: 'r-high', label: '高', riskTier: '高', score: 1 },
      ],
      survey: {
        collectInSurvey: true,
        surveyRequired: false,
        fieldKey: 'TEST_FORM_COMP',
        inputVariant: 'composite_appendix_numeric',
        compositeAggregation: 'max_f',
        appendixBSurveyParts: [
          {
            source: { type: 'indicator', key: 'FM_SK_LONG_SLOPE' },
            appendixBFieldKey: 'FM_SK_LONG_SLOPE',
            valueFieldKey: 'FM_SK_LONG_SLOPE',
            label: '纵坡度',
            tierBands: [
              { riskTier: '低', score: 0.3, match: { kind: 'lt', value: 10 } },
              { riskTier: '高', score: 0.7, match: { kind: 'gte', value: 10 } },
            ],
          },
          {
            source: { type: 'indicator', key: 'FM_TN_LONG_SLOPE' },
            appendixBFieldKey: 'FM_TN_LONG_SLOPE',
            valueFieldKey: 'FM_TN_LONG_SLOPE',
            label: '另一坡度',
            tierBands: [
              { riskTier: '低', score: 0.2, match: { kind: 'lt', value: 10 } },
              { riskTier: '高', score: 1, match: { kind: 'gte', value: 10 } },
            ],
          },
        ],
      },
    };
    const tunnelSlope: RiskIndicatorRow = {
      id: 'fm-tn',
      code: 'FM_TN_LONG_SLOPE',
      name: '隧道纵坡',
      level1: 'FORMATION',
      applicableTypes: ['TUNNEL'],
      weight: 0.1,
      enabled: true,
      valueType: 'numeric',
      updatedAt: '',
      survey: { collectInSurvey: true, surveyRequired: false, fieldKey: 'FM_TN_LONG_SLOPE' },
      scoreRules: [],
    };
    const all = [ind, slopeIndicator, tunnelSlope];
    const parts = getCompositePartsForPoint(ind, 'SUNKEN', all);
    expect(parts).toHaveLength(1);
    expect(parts[0].source?.type).toBe('indicator');
    expect(parts[0].source?.key).toBe('FM_SK_LONG_SLOPE');
    const rule = matchCompositeAppendixSurveyRule(
      ind,
      { FM_SK_LONG_SLOPE: 12 },
      { pointType: 'SUNKEN', indicators: all },
    );
    expect(rule?.score).toBe(0.7);
  });
});
