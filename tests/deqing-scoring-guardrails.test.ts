import { describe, expect, it } from 'vitest';
import { validateIndicatorConfig } from '../src/prototypes/deqing-waterlogging-risk/indicatorConfigReadiness';
import { matchScoreRuleFromValue } from '../src/prototypes/deqing-waterlogging-risk/scoreRuleMapping';
import { validateNumericMatchCoverage } from '../src/prototypes/deqing-waterlogging-risk/scoreRuleNumericBands';
import type { RiskIndicatorRow } from '../src/prototypes/deqing-waterlogging-risk/types';

function indicator(overrides: Partial<RiskIndicatorRow> = {}): RiskIndicatorRow {
  return {
    id: 'i1',
    code: 'TEST',
    name: '测试指标',
    level1: 'HAZARD',
    applicableTypes: ['GLOBAL'],
    weight: 1,
    valueType: 'boolean',
    enabled: true,
    scoreRules: [
      { id: 'low', label: '否', riskTier: '低', score: 0 },
      { id: 'high', label: '是', riskTier: '高', score: 1 },
    ],
    updatedAt: '',
    survey: { collectInSurvey: true, surveyRequired: true, fieldKey: 'TEST' },
    ...overrides,
  };
}

describe('计分与配置安全护栏', () => {
  it('布尔字符串 false 命中低档，并兼容历史分档文案', () => {
    const ind = indicator();
    expect(matchScoreRuleFromValue(ind, 'false')?.id).toBe('low');
    expect(matchScoreRuleFromValue(ind, '是')?.id).toBe('high');
  });

  it('条件赋分未命中分支时不得回退统一规则', () => {
    const ind = indicator({
      scoringRuleMode: 'conditional',
      conditionalScoring: {
        enabled: true,
        mode: 'branch_rules',
        source: { type: 'appendix_b', key: 'areaImportance' },
        branches: [
          {
            id: 'b1',
            label: '城区',
            matchValues: ['城区'],
            scoreRules: [{ id: 'branch-high', label: '是', riskTier: '高', score: 0.8 }],
          },
        ],
      },
    });
    expect(matchScoreRuleFromValue(ind, true, { areaImportance: '乡村' })).toBeNull();
  });

  it('数值档拦截正宽度重叠与空档', () => {
    expect(validateNumericMatchCoverage([
      { numericMatch: { kind: 'lte', value: 10 } },
      { numericMatch: { kind: 'gte', value: 9 } },
    ])).toContain('重叠');
    expect(validateNumericMatchCoverage([
      { numericMatch: { kind: 'lte', value: 10 } },
      { numericMatch: { kind: 'gte', value: 11 } },
    ])).toContain('空档');
    expect(validateNumericMatchCoverage([
      { numericMatch: { kind: 'lte', value: 10 } },
      { numericMatch: { kind: 'gte', value: 10 } },
    ])).toContain('重叠');
    expect(validateNumericMatchCoverage([
      { numericMatch: { kind: 'lt', value: 10 } },
      { numericMatch: { kind: 'gt', value: 10 } },
    ])).toContain('空档');
  });

  it('重复 fieldKey 与不参与普查的启用加权指标均阻断配置', () => {
    const sibling = indicator({ id: 'i2', code: 'OTHER' });
    const duplicate = validateIndicatorConfig(indicator(), [indicator(), sibling]);
    expect(duplicate.blockers.join('；')).toContain('普查字段键重复');

    const detached = indicator({
      id: 'i3',
      code: 'DETACHED',
      survey: { collectInSurvey: false, surveyRequired: false, fieldKey: 'DETACHED' },
    });
    expect(validateIndicatorConfig(detached, [detached]).blockers.join('；')).toContain('必须参与普查');
  });
});
