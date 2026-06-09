import { describe, expect, it } from 'vitest';
import {
  buildAuxiliaryConditionalPackage,
  resolveAuxiliaryDefaults,
} from '../src/prototypes/deqing-waterlogging-risk/auxiliaryIndicatorDefaults';
import { matchScoreRuleWithConditional } from '../src/prototypes/deqing-waterlogging-risk/conditionalScoring';
import { hasConfiguredNumericBands } from '../src/prototypes/deqing-waterlogging-risk/scoreRuleNumericBands';
import type { RiskIndicatorRow } from '../src/prototypes/deqing-waterlogging-risk/types';

describe('辅助条件 + 数值主指标分支赋分', () => {
  it('numeric 主指标：各分支赋分档为四档 F，区间须用户配置', () => {
    const pkg = buildAuxiliaryConditionalPackage({
      id: 'draft',
      code: 'HZ_TEST',
      name: '测试数值条件',
      level1: 'HAZARD',
      applicableTypes: ['GLOBAL'],
      valueType: 'numeric',
    });
    expect(pkg.valueType).toBe('numeric');
    expect(pkg.conditionalScoring.branches[0].label).toBe('分支 1');
    expect(pkg.conditionalScoring.branches[0].numericMatch).toBeUndefined();
    for (const b of pkg.conditionalScoring.branches) {
      expect(hasConfiguredNumericBands(b.scoreRules)).toBe(false);
      expect(b.scoreRules?.map(r => r.score)).toEqual([0.25, 0.5, 0.75, 1]);
    }
  });

  it('branch_threshold 数值主指标：按分支内区间匹配 F', () => {
    const ind: RiskIndicatorRow = {
      id: 'cond-num',
      code: 'T_NUM',
      name: '数值条件',
      level1: 'FORMATION',
      applicableTypes: ['LOW_LYING'],
      weight: 0.1,
      valueType: 'numeric',
      enabled: true,
      scoreRules: [],
      updatedAt: '',
      survey: { collectInSurvey: true, surveyRequired: false, fieldKey: 'T_NUM', inputVariant: 'default' },
      scoringRuleMode: 'conditional',
      conditionalScoring: {
        enabled: true,
        mode: 'branch_threshold',
        source: { type: 'appendix_b', key: 'areaImportance' },
        branches: [
          {
            id: 'b0',
            label: '中心城区',
            matchValues: ['中心城区'],
            scoreRules: [
              { id: 'r0', label: '低档', score: 0.25, numericMatch: { kind: 'lt', value: 5 } },
              { id: 'r1', label: '高档', score: 1, numericMatch: { kind: 'gte', value: 5 } },
            ],
          },
        ],
      },
    };
    const rule = matchScoreRuleWithConditional(ind, 6, {
      areaImportance: '中心城区',
      indicatorValues: { T_NUM: 6 },
    });
    expect(rule?.score).toBe(1);
  });

  it('辅助值命中分支后，主指标数值按分支区间匹配 F', () => {
    const aux = resolveAuxiliaryDefaults({ code: 'T', level1: 'HAZARD', applicableTypes: ['GLOBAL'] });
    const pkg = buildAuxiliaryConditionalPackage({
      id: 'ind-t',
      code: 'T',
      name: '测试',
      level1: 'HAZARD',
      applicableTypes: ['GLOBAL'],
      valueType: 'numeric',
      survey: {
        collectInSurvey: true,
        surveyRequired: false,
        fieldKey: 'T',
        inputVariant: 'auxiliary_then_select',
        auxiliaryCondition: { ...aux, thresholdPct: 7 },
      },
    });
    const branches = pkg.conditionalScoring.branches.map((b, i) => ({
      ...b,
      numericMatch: i === 0 ? { kind: 'lte' as const, value: 7 } : { kind: 'gt' as const, value: 7 },
      scoreRules: (b.scoreRules ?? []).map((r, j) => ({
        ...r,
        numericMatch:
          i === 0
            ? j === 0
              ? { kind: 'lte' as const, value: 8 }
              : j === 1
                ? { kind: 'between' as const, min: 8, max: 16, minInclusive: false, maxInclusive: true }
                : j === 2
                  ? { kind: 'between' as const, min: 16, max: 24, minInclusive: false, maxInclusive: true }
                  : { kind: 'gt' as const, value: 24 }
            : r.numericMatch,
      })),
    }));
    const ind: RiskIndicatorRow = {
      id: 'ind-t',
      code: 'T',
      name: '测试',
      level1: 'HAZARD',
      applicableTypes: ['GLOBAL'],
      weight: 0.1,
      valueType: 'numeric',
      enabled: true,
      scoreRules: pkg.scoreRules,
      updatedAt: '',
      survey: pkg.survey,
      conditionalScoring: { ...pkg.conditionalScoring, branches },
      scoringRuleMode: 'conditional',
    };

    const rule = matchScoreRuleWithConditional(
      ind,
      6,
      {
        indicatorValues: {
          [aux.fieldKey]: 5,
          T: 6,
        },
      },
    );
    expect(rule?.score).toBe(0.25);
  });

  it('enum 主指标仍按分档 label 匹配', () => {
    const pkg = buildAuxiliaryConditionalPackage({
      id: 'draft',
      code: 'E',
      name: '枚举条件',
      level1: 'FORMATION',
      applicableTypes: ['LOW_LYING'],
      valueType: 'enum',
      scoreRules: [
        { id: 'r0', label: '低', riskTier: '低', score: 0.25 },
        { id: 'r1', label: '高', riskTier: '高', score: 1 },
      ],
    });
    const ind: RiskIndicatorRow = {
      id: 'draft',
      code: 'E',
      name: '枚举条件',
      level1: 'FORMATION',
      applicableTypes: ['LOW_LYING'],
      weight: 0.1,
      valueType: 'enum',
      enabled: true,
      scoreRules: pkg.scoreRules,
      updatedAt: '',
      survey: pkg.survey,
      conditionalScoring: {
        ...pkg.conditionalScoring,
        branches: pkg.conditionalScoring.branches.map((b, i) => ({
          ...b,
          numericMatch: i === 0 ? { kind: 'lte' as const, value: 7 } : { kind: 'gt' as const, value: 7 },
        })),
      },
      scoringRuleMode: 'conditional',
    };
    const aux = ind.survey.auxiliaryCondition!;
    const rule = matchScoreRuleWithConditional(ind, '低', {
      indicatorValues: { [aux.fieldKey]: 5, E: '低' },
    });
    expect(rule?.label).toBe('低');
  });
});
