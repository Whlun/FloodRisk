import { describe, expect, it } from 'vitest';
import {
  createGenericNumericUniformRules,
  enrichNumericRuleLabels,
  formatNumericMatchLabel,
  refreshAutoNumericRuleLabels,
  refreshAutoTierBandLabels,
  shouldRefreshNumericRuleLabel,
} from '../src/prototypes/deqing-waterlogging-risk/scoreRuleNumericBands';

describe('formatNumericMatchLabel', () => {
  it('生成通用区间展示文案', () => {
    expect(formatNumericMatchLabel({ kind: 'lt', value: 5 })).toBe('值<5');
    expect(
      formatNumericMatchLabel({
        kind: 'between',
        min: 5,
        max: 7,
        minInclusive: true,
        maxInclusive: false,
      }),
    ).toBe('5≤值<7');
    expect(formatNumericMatchLabel({ kind: 'gte', value: 10 }, { unit: '%' })).toBe('值≥10%');
  });

  it('通用数值模板不预填纵坡度示意区间', () => {
    const rules = createGenericNumericUniformRules('t');
    expect(rules).toHaveLength(4);
    expect(rules.map(r => r.score)).toEqual([0.25, 0.5, 0.75, 1]);
    expect(rules.some(r => r.numericMatch)).toBe(false);
  });

  it('识别旧自动生成描述并在区间变更后刷新', () => {
    const rules = refreshAutoNumericRuleLabels(
      [
        {
          id: 'r0',
          label: '值<0',
          riskTier: '',
          score: 0.25,
          numericMatch: { kind: 'lt', value: 5 },
        },
      ],
      { unit: '%' },
    );
    expect(rules[0]?.label).toBe('值<5%');
  });

  it('单位写入自动生成的分档描述', () => {
    const rules = refreshAutoNumericRuleLabels(
      [
        {
          id: 'r0',
          label: '值<0',
          riskTier: '',
          score: 0.25,
          numericMatch: { kind: 'lt', value: 0 },
        },
        {
          id: 'r1',
          label: '自定义文案',
          riskTier: '',
          score: 0.5,
          numericMatch: { kind: 'lte', value: 1 },
        },
      ],
      { unit: '%' },
    );
    expect(rules[0]?.label).toBe('值<0%');
    expect(rules[1]?.label).toBe('自定义文案');
    expect(shouldRefreshNumericRuleLabel(rules[1]!, '%')).toBe(false);
  });

  it('空描述时按 numericMatch 补全', () => {
    const rules = enrichNumericRuleLabels([
      {
        id: 'r0',
        label: '',
        riskTier: '',
        score: 0.25,
        numericMatch: { kind: 'lt', value: 5 },
      },
    ]);
    expect(rules[0]?.label).toBe('值<5');
  });

  it('导则预置档位名可随单位刷新为区间描述', () => {
    const bands = refreshAutoTierBandLabels(
      [{ riskTier: '低', score: 0.2, match: { kind: 'gt', value: 0.45 } }],
      { unit: 'm' },
    );
    expect(bands[0]?.riskTier).toBe('值>0.45m');
  });
});
