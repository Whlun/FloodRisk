import { describe, expect, it } from 'vitest';
import { initialRiskIndicators } from '../src/database/deqing-waterlogging-risk-indicators';
import {
  buildAuxiliaryConditionalPackage,
  resolveAuxiliaryDefaults,
} from '../src/prototypes/deqing-waterlogging-risk/auxiliaryIndicatorDefaults';
import {
  dedupeConditionFieldOptions,
  enrichConditionFieldOptionLabels,
  getConditionSourceFieldOptions,
  getSurveyBasicInfoConditionFieldOptions,
  prependSelfAuxiliaryConditionOption,
  resolveConditionFieldLabel,
} from '../src/prototypes/deqing-waterlogging-risk/conditionalScoring';
import { validateIndicatorConfig } from '../src/prototypes/deqing-waterlogging-risk/indicatorConfigReadiness';
import { normalizeIndicatorRow } from '../src/prototypes/deqing-waterlogging-risk/indicatorNormalize';
import type { RiskIndicatorRow } from '../src/prototypes/deqing-waterlogging-risk/types';

describe('辅助条件 + 低洼路段新建流', () => {
  it('新建指标：通用默认 indicator_census 与辅助条件', () => {
    const aux = resolveAuxiliaryDefaults({
      code: 'MY_LL_TEST',
      level1: 'FORMATION',
      applicableTypes: ['LOW_LYING'],
    });
    expect(aux.surveyPlacement).toBe('indicator_census');
    expect(aux.label).toBe('辅助条件');
    expect(aux.fieldKey).toBe('MY_LL_TEST_COND');
    expect(aux.thresholdPct).toBeUndefined();
  });

  it('向导未入库指标 getConditionSourceFieldOptions 仍产出中文辅助项', () => {
    const draft = {
      code: 'FM_U002',
      survey: {
        collectInSurvey: true,
        surveyRequired: false,
        fieldKey: 'FM_U002',
        inputVariant: 'auxiliary_then_select' as const,
        auxiliaryCondition: {
          fieldKey: 'FM_U002_COND',
          label: '辅助条件',
          unit: '%',
          collectInSurvey: true,
          surveyPlacement: 'indicator_census' as const,
        },
      },
    };
    const opts = getConditionSourceFieldOptions(
      'point',
      initialRiskIndicators,
      'FM_U002',
      { code: 'FM_U002', level1: 'FORMATION', applicableTypes: ['SUNKEN'] },
      'branch_rules',
      draft,
    );
    const self = opts.find(o => o.value === 'FM_U002_COND');
    expect(self?.label).toBe('辅助条件');
    expect(self?.label).not.toBe('FM_U002_COND');
  });

  it('导则种子 FM_LL_COLLECT 使用通用辅助条件模板', () => {
    const ind = initialRiskIndicators.find(i => i.code === 'FM_LL_COLLECT');
    expect(ind).toBeTruthy();
    expect(ind!.survey.auxiliaryCondition?.surveyPlacement).toBe('indicator_census');
    expect(ind!.survey.auxiliaryCondition?.label).toBe('辅助条件');
    expect(ind!.survey.auxiliaryCondition?.fieldKey).toBe('FM_LL_COLLECT_COND');
  });

  it('两分支时各支至少 1 档赋分（主指标仅 2 档）', () => {
    const row: RiskIndicatorRow = {
      id: 'draft',
      code: 'T',
      name: '测试',
      level1: 'FORMATION',
      applicableTypes: ['LOW_LYING'],
      weight: 0,
      valueType: 'enum',
      scoreRules: [
        { id: 'r0', label: '低', riskTier: '低', score: 0 },
        { id: 'r1', label: '高', riskTier: '高', score: 1 },
      ],
      enabled: false,
      updatedAt: '',
      survey: {
        collectInSurvey: true,
        surveyRequired: false,
        fieldKey: 'T',
        inputVariant: 'auxiliary_then_select',
        auxiliaryCondition: resolveAuxiliaryDefaults({
          code: 'T',
          level1: 'FORMATION',
          applicableTypes: ['LOW_LYING'],
        }),
      },
      conditionalScoring: {
        enabled: true,
        mode: 'branch_rules',
        source: { type: 'appendix_b', key: 'T_SLOPE' },
        branches: [
          {
            id: 'cb0',
            label: '辅助条件≤7%',
            numericMatch: { kind: 'lte', value: 7 },
            scoreRules: [{ id: 'r0', label: '低', riskTier: '低', score: 0 }],
          },
          {
            id: 'cb1',
            label: '辅助条件>7%',
            numericMatch: { kind: 'gt', value: 7 },
            scoreRules: [],
          },
        ],
      },
    };
    const pkg = buildAuxiliaryConditionalPackage(row);
    expect(pkg.conditionalScoring.branches[1].scoreRules?.length).toBeGreaterThan(0);
  });

  it('buildAuxiliaryConditionalPackage 对齐条件来源与数值分支', () => {
    const row: RiskIndicatorRow = {
      id: 'draft',
      code: 'MY_LL_TEST',
      name: '测试收水能力',
      level1: 'FORMATION',
      applicableTypes: ['LOW_LYING'],
      weight: 0,
      valueType: 'enum',
      scoreRules: [
        { id: 'r0', label: '低', riskTier: '低', score: 0 },
        { id: 'r1', label: '高', riskTier: '高', score: 1 },
      ],
      enabled: false,
      updatedAt: '',
      survey: {
        collectInSurvey: true,
        surveyRequired: false,
        fieldKey: 'MY_LL_TEST',
        inputVariant: 'auxiliary_then_select',
        auxiliaryCondition: resolveAuxiliaryDefaults({
          code: 'MY_LL_TEST',
          level1: 'FORMATION',
          applicableTypes: ['LOW_LYING'],
        }),
      },
    };
    const pkg = buildAuxiliaryConditionalPackage(row);
    expect(pkg.survey.auxiliaryCondition?.surveyPlacement).toBe('indicator_census');
    expect(pkg.conditionalScoring.source).toEqual({
      type: 'indicator',
      key: 'MY_LL_TEST_COND',
    });
    expect(pkg.conditionalScoring.branches.length).toBe(2);
    expect(pkg.conditionalScoring.branches[0].label).toBe('分支 1');
    expect(pkg.conditionalScoring.branches[1].label).toBe('分支 2');
    expect(pkg.conditionalScoring.branches[0].numericMatch).toBeUndefined();
    const readiness = validateIndicatorConfig(
      { ...row, ...pkg, scoringRuleMode: 'conditional', conditionalScoring: { ...pkg.conditionalScoring, enabled: true } },
      initialRiskIndicators,
    );
    expect(readiness.ok).toBe(false);
    expect(readiness.blockers.some(b => b.includes('数值匹配条件'))).toBe(true);
  });

  it('配置数值条件后就绪校验可通过', () => {
    const row: RiskIndicatorRow = {
      id: 'draft',
      code: 'MY_LL_TEST',
      name: '测试收水能力',
      level1: 'FORMATION',
      applicableTypes: ['LOW_LYING'],
      weight: 0,
      valueType: 'enum',
      scoreRules: [
        { id: 'r0', label: '低', riskTier: '低', score: 0 },
        { id: 'r1', label: '高', riskTier: '高', score: 1 },
      ],
      enabled: false,
      updatedAt: '',
      survey: {
        collectInSurvey: true,
        surveyRequired: false,
        fieldKey: 'MY_LL_TEST',
        inputVariant: 'auxiliary_then_select',
        auxiliaryCondition: resolveAuxiliaryDefaults({
          code: 'MY_LL_TEST',
          level1: 'FORMATION',
          applicableTypes: ['LOW_LYING'],
        }),
      },
    };
    const pkg = buildAuxiliaryConditionalPackage(row);
    const ready = validateIndicatorConfig(
      {
        ...row,
        ...pkg,
        scoringRuleMode: 'conditional',
        conditionalScoring: {
          ...pkg.conditionalScoring,
          enabled: true,
          branches: pkg.conditionalScoring.branches.map((b, i) => ({
            ...b,
            numericMatch: i === 0 ? { kind: 'lte' as const, value: 7 } : { kind: 'gt' as const, value: 7 },
          })),
        },
      },
      initialRiskIndicators,
    );
    expect(ready.ok).toBe(true);
  });

  it('条件下拉同 fieldKey 去重且保留中文标签', () => {
    const deduped = dedupeConditionFieldOptions([
      { value: 'FM_LL_COLLECT_SLOPE', label: 'FM_LL_COLLECT_SLOPE' },
      { value: 'areaImportance', label: '地区重要程度' },
      {
        value: 'FM_LL_COLLECT_SLOPE',
        label: '道路纵坡 S（城市低洼路段专用信息）',
      },
    ]);
    expect(deduped).toHaveLength(2);
    const slope = deduped.find(o => o.value === 'FM_LL_COLLECT_SLOPE');
    expect(slope?.label).toContain('道路纵坡 S');
  });

  it('条件下拉含本指标辅助条件中文标签', () => {
    const row: RiskIndicatorRow = {
      id: 'draft',
      code: 'MY_LL_TEST',
      name: '测试',
      level1: 'FORMATION',
      applicableTypes: ['LOW_LYING'],
      weight: 0,
      valueType: 'enum',
      scoreRules: [],
      enabled: false,
      updatedAt: '',
      survey: {
        collectInSurvey: true,
        surveyRequired: false,
        fieldKey: 'MY_LL_TEST',
        inputVariant: 'auxiliary_then_select',
        auxiliaryCondition: resolveAuxiliaryDefaults({
          code: 'MY_LL_TEST',
          level1: 'FORMATION',
          applicableTypes: ['LOW_LYING'],
        }),
      },
    };
    const opts = prependSelfAuxiliaryConditionOption([], row);
    const self = opts.find(o => o.value === 'MY_LL_TEST_COND');
    expect(self).toBeTruthy();
    expect(self!.label).toContain('辅助条件');
  });

  it('prependSelfAuxiliaryConditionOption 覆盖裸字段键标签', () => {
    const row: RiskIndicatorRow = {
      id: 'u2',
      code: 'FM_U002',
      name: '测试',
      level1: 'FORMATION',
      applicableTypes: ['SUNKEN'],
      weight: 0,
      valueType: 'numeric',
      scoreRules: [],
      enabled: false,
      updatedAt: '',
      survey: {
        collectInSurvey: true,
        surveyRequired: false,
        fieldKey: 'FM_U002',
        inputVariant: 'auxiliary_then_select',
        auxiliaryCondition: {
          fieldKey: 'FM_U002_SLOPE',
          label: '辅助条件',
          unit: '%',
          thresholdPct: 7,
          collectInSurvey: true,
          surveyPlacement: 'appendix_b',
        },
      },
    };
    const opts = prependSelfAuxiliaryConditionOption(
      [{ value: 'FM_U002_SLOPE', label: 'FM_U002_SLOPE' }],
      row,
    );
    expect(opts[0].label).toContain('辅助条件');
    expect(opts[0].label).not.toBe('FM_U002_SLOPE');
  });

  it('enrichConditionFieldOptionLabels 将裸 fieldKey 解析为中文', () => {
    const row: RiskIndicatorRow = {
      id: 'u2',
      code: 'FM_U002',
      name: '测试',
      level1: 'FORMATION',
      applicableTypes: ['SUNKEN'],
      weight: 0,
      valueType: 'numeric',
      scoreRules: [],
      enabled: false,
      updatedAt: '',
      survey: {
        collectInSurvey: true,
        surveyRequired: false,
        fieldKey: 'FM_U002',
        inputVariant: 'auxiliary_then_select',
        auxiliaryCondition: {
          fieldKey: 'FM_U002_SLOPE',
          label: '辅助条件',
          unit: '%',
          thresholdPct: 7,
          collectInSurvey: true,
          surveyPlacement: 'appendix_b',
        },
      },
    };
    const enriched = enrichConditionFieldOptionLabels(
      [{ value: 'FM_U002_SLOPE', label: 'FM_U002_SLOPE' }],
      'point',
      [],
      'FM_U002',
      row,
    );
    expect(enriched[0].label).toContain('辅助条件');
    expect(resolveConditionFieldLabel('FM_U002_SLOPE', 'point', [], 'FM_U002', row)).toContain(
      '辅助条件',
    );
  });

  it('导则种子 FM_LL_COLLECT 未配齐条件分支时未就绪', () => {
    const raw = initialRiskIndicators.find(i => i.code === 'FM_LL_COLLECT')!;
    const ind = normalizeIndicatorRow(raw, { allIndicators: initialRiskIndicators, baseline: raw });
    const readiness = validateIndicatorConfig(
      { ...ind, conditionalScoring: { ...ind.conditionalScoring!, enabled: true } },
      initialRiskIndicators,
    );
    expect(readiness.ok).toBe(false);
    expect(readiness.blockers.some(b => b.includes('数值匹配条件'))).toBe(true);
  });
});
