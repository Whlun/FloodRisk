import { describe, expect, it } from 'vitest';
import { buildDesignPeriodConditional } from '../src/prototypes/deqing-waterlogging-risk/conditionalScoring';
import {
  buildConditionalScoringFlowModel,
  isFlowConfigPopulated,
  resolveConditionalScoringForFlow,
} from '../src/prototypes/deqing-waterlogging-risk/conditionalScoringFlow';
import type { ConditionalScoringConfig } from '../src/prototypes/deqing-waterlogging-risk/types';

describe('条件赋分流程图', () => {
  const fullConfig: ConditionalScoringConfig = {
    enabled: true,
    mode: 'branch_threshold',
    source: { type: 'appendix_b', key: 'areaImportance' },
    branches: [
      {
        id: 'urban',
        label: '中心城区',
        matchValues: ['COUNTY_KEY', 'COUNTY_GENERAL'],
        scoreRules: [
          {
            id: 'urban-r0',
            label: '值≥30',
            riskTier: '低',
            score: 0,
            numericMatch: { kind: 'gte', value: 30 },
          },
          {
            id: 'urban-r1',
            label: '值<30',
            riskTier: '高',
            score: 1,
            numericMatch: { kind: 'lt', value: 30 },
          },
        ],
      },
      {
        id: 'other',
        label: '其他区县',
        matchValues: ['TOWN_GENERAL'],
        scoreRules: [
          {
            id: 'other-r0',
            label: '值≥10',
            riskTier: '低',
            score: 0,
            numericMatch: { kind: 'gte', value: 10 },
          },
          {
            id: 'other-r1',
            label: '值<10',
            riskTier: '高',
            score: 1,
            numericMatch: { kind: 'lt', value: 10 },
          },
        ],
      },
    ],
  };

  it('resolveConditionalScoringForFlow：表单空壳时回退快照', () => {
    const emptyShell: ConditionalScoringConfig = {
      enabled: true,
      mode: 'branch_threshold',
      source: { type: 'appendix_b', key: '' },
      branches: [
        { id: 'b0', label: '分支 1', matchValues: [] },
        { id: 'b1', label: '分支 2', matchValues: [] },
      ],
    };
    expect(isFlowConfigPopulated(emptyShell)).toBe(false);
    const resolved = resolveConditionalScoringForFlow(emptyShell, fullConfig, true);
    expect(resolved?.source.key).toBe('areaImportance');
    expect(resolved?.branches[0].matchValues).toContain('COUNTY_KEY');
  });

  it('branch_threshold + 分支内数值分档：展示区间匹配而非二元比较', () => {
    const model = buildConditionalScoringFlowModel(fullConfig);
    expect(model.branches).toHaveLength(2);
    const urban = model.branches.find(b => b.label === '中心城区');
    const other = model.branches.find(b => b.label === '其他区县');
    expect(urban?.usesNumericBands).toBe(true);
    expect(urban?.compareQuestion).toBeUndefined();
    expect(urban?.tiers[0].note).toBe('值≥30');
    expect(other?.usesNumericBands).toBe(true);
    expect(other?.tiers[0].note).toBe('值≥10');
    expect(model.incomplete).toEqual([]);
  });

  it('旧版单阈值比较：仍展示填报值二元判断', () => {
    const cfg = buildDesignPeriodConditional('FM_SK_DESIGN_P');
    const model = buildConditionalScoringFlowModel(cfg);
    const urban = model.branches.find(b => b.label === '中心城区');
    expect(urban).toBeDefined();
    if (!urban?.compareQuestion) {
      expect(urban?.usesNumericBands).toBe(true);
      return;
    }
    expect(urban.usesNumericBands).toBe(false);
    expect(urban.compareQuestion).toContain('填报值');
    expect(urban.metTier).toBeDefined();
    expect(urban.unmetTier).toBeDefined();
  });
});
