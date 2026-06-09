import { describe, expect, it } from 'vitest';
import { initialRiskIndicators } from '../src/database/deqing-waterlogging-risk-indicators';
import { mergeIndicatorSurveyConfig } from '../src/prototypes/deqing-waterlogging-risk/indicatorSurveyUtils';
import {
  buildScoringRuleModePatch,
  inferScoringRuleModeFromLegacy,
  normalizeIndicatorScoringRuleMode,
  resolveScoringRuleMode,
} from '../src/prototypes/deqing-waterlogging-risk/scoringRuleMode';
import { createEmptyConditionalScoring, suggestConditionalScoringForIndicator } from '../src/prototypes/deqing-waterlogging-risk/conditionalScoring';
import type { RiskIndicatorRow } from '../src/prototypes/deqing-waterlogging-risk/types';

describe('scoringRuleMode 不变量', () => {
  it('导则种子 FM_UG_ENTRANCE_H 为复合数值赋分', () => {
    const ind = initialRiskIndicators.find(i => i.code === 'FM_UG_ENTRANCE_H');
    expect(ind).toBeTruthy();
    expect(resolveScoringRuleMode(ind!)).toBe('composite');
    expect(ind!.scoringRuleMode).toBe('composite');
  });

  it('导则种子 FM_SK_DESIGN_P 为统一赋分（须手动配区间）', () => {
    const ind = initialRiskIndicators.find(i => i.code === 'FM_SK_DESIGN_P');
    expect(ind).toBeTruthy();
    expect(resolveScoringRuleMode(ind!)).toBe('uniform');
    expect(suggestConditionalScoringForIndicator(ind!)).toBeUndefined();
  });

  it('显式 scoringRuleMode 优先于 legacy inputVariant', () => {
    const mode = resolveScoringRuleMode({
      scoringRuleMode: 'conditional',
      survey: { inputVariant: 'composite_appendix_numeric' } as RiskIndicatorRow['survey'],
      conditionalScoring: { enabled: false } as RiskIndicatorRow['conditionalScoring'],
    });
    expect(mode).toBe('conditional');
  });

  it('显式 uniform 与 composite survey 不一致时以派生为准', () => {
    expect(
      resolveScoringRuleMode({
        scoringRuleMode: 'uniform',
        survey: { inputVariant: 'composite_appendix_numeric' } as RiskIndicatorRow['survey'],
        conditionalScoring: { enabled: false } as RiskIndicatorRow['conditionalScoring'],
      }),
    ).toBe('composite');
  });

  it('显式 uniform 与已启用条件赋分不一致时以派生为准', () => {
    expect(
      resolveScoringRuleMode({
        scoringRuleMode: 'uniform',
        survey: { inputVariant: 'default' } as RiskIndicatorRow['survey'],
        conditionalScoring: { enabled: true } as RiskIndicatorRow['conditionalScoring'],
      }),
    ).toBe('conditional');
  });

  it('切换为条件赋分后 inputVariant 为 default', () => {
    const ug = initialRiskIndicators.find(i => i.code === 'FM_UG_ENTRANCE_H')!;
    const patch = buildScoringRuleModePatch(ug, 'conditional');
    expect(patch.scoringRuleMode).toBe('conditional');
    expect(patch.survey?.inputVariant).toBe('default');
    expect(patch.conditionalScoring?.enabled).toBe(true);
  });

  it('条件赋分模式下空分支的辅助指标自动补全中性分支', () => {
    const collect = initialRiskIndicators.find(i => i.code === 'FM_LL_COLLECT')!;
    const patch = buildScoringRuleModePatch(
      {
        ...collect,
        conditionalScoring: { enabled: true, mode: 'branch_rules', source: { type: 'indicator', key: '' }, branches: [] },
      },
      'conditional',
    );
    expect(patch.conditionalScoring?.source?.key).toBe('FM_LL_COLLECT_COND');
    expect(patch.conditionalScoring?.branches?.length).toBe(2);
    expect(patch.conditionalScoring?.branches?.[0]?.label).toBe('分支 1');
    expect(patch.conditionalScoring?.branches?.[0]?.numericMatch).toBeUndefined();
    expect(patch.conditionalScoring?.branches?.every(b => (b.scoreRules?.length ?? 0) > 0)).toBe(true);
  });

  it('用户选条件赋分时 merge 不再强制 composite', () => {
    const ug = initialRiskIndicators.find(i => i.code === 'FM_UG_ENTRANCE_H')!;
    const userRow: RiskIndicatorRow = {
      ...ug,
      scoringRuleMode: 'conditional',
      survey: {
        ...ug.survey,
        inputVariant: 'default',
        appendixBSurveyParts: [],
      },
      conditionalScoring: { ...createEmptyConditionalScoring(), enabled: true },
    };
    const merged = mergeIndicatorSurveyConfig(userRow, ug);
    expect(merged.inputVariant).toBe('default');
  });

  it('normalize 对齐显式字段与派生 survey/conditionalScoring', () => {
    const normalized = normalizeIndicatorScoringRuleMode({
      code: 'NEW_IND',
      valueType: 'numeric',
      survey: { collectInSurvey: true, surveyRequired: false, fieldKey: 'NEW_IND' },
    } as RiskIndicatorRow);
    expect(normalized.scoringRuleMode).toBe('uniform');
    expect(normalized.conditionalScoring?.enabled).toBe(false);
  });

  it('normalize 复合指标自动生成聚合 scoreRules', () => {
    const ug = initialRiskIndicators.find(i => i.code === 'FM_UG_ENTRANCE_H')!;
    const normalized = normalizeIndicatorScoringRuleMode(ug);
    expect(normalized.scoreRules.length).toBeGreaterThanOrEqual(2);
    expect(normalized.scoreRules.some(r => r.label.includes('聚合 ·'))).toBe(true);
  });

  it('legacy 推导与显式字段一致（全部种子）', () => {
    for (const ind of initialRiskIndicators) {
      const inferred = inferScoringRuleModeFromLegacy(ind);
      expect(ind.scoringRuleMode ?? inferred).toBe(inferred);
    }
  });
});
