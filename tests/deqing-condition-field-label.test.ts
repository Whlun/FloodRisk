import { describe, expect, it } from 'vitest';
import {
  ensureConditionFieldOption,
  enrichConditionFieldOptionLabels,
  getConditionSourceFieldOptions,
  getSurveyBasicInfoConditionFieldOptions,
  normalizeConditionSourceKey,
  prependSelfAuxiliaryConditionOption,
  resolveConditionFieldLabel,
  suggestConditionalScoringForIndicator,
} from '../src/prototypes/deqing-waterlogging-risk/conditionalScoring';
import {
  getAuxiliaryConditionOption,
  resolveAuxiliaryDisplayLabel,
  resolveConditionalSourceForIndicator,
} from '../src/prototypes/deqing-waterlogging-risk/compositeConditionalSurvey';
import { resolveAuxiliaryDefaults } from '../src/prototypes/deqing-waterlogging-risk/auxiliaryIndicatorDefaults';
import { resolveCompositePartUnit } from '../src/prototypes/deqing-waterlogging-risk/compositePartUnit';
import { normalizeIndicatorRow } from '../src/prototypes/deqing-waterlogging-risk/indicatorNormalize';
import type { RiskIndicatorRow } from '../src/prototypes/deqing-waterlogging-risk/types';

describe('条件字段中文回显', () => {
  const selfRow: RiskIndicatorRow = {
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
        fieldKey: 'FM_U002_COND',
        label: '辅助条件',
        unit: '%',
        collectInSurvey: true,
        surveyPlacement: 'indicator_census',
      },
    },
  };

  it('getAuxiliaryConditionOption 空 label 时回退辅助条件', () => {
    const opt = getAuxiliaryConditionOption({
      ...selfRow,
      survey: {
        ...selfRow.survey,
        auxiliaryCondition: {
          ...selfRow.survey.auxiliaryCondition!,
          label: '',
        },
      },
    });
    expect(opt?.label).toBe('辅助条件');
  });

  it('ensureConditionFieldOption 为裸 fieldKey 注入中文', () => {
    const opts = ensureConditionFieldOption(
      [{ value: 'FM_U002_COND', label: 'FM_U002_COND' }],
      'FM_U002_COND',
      key => resolveConditionFieldLabel(key, 'point', [], 'FM_U002', selfRow),
    );
    expect(opts[0].label).toBe('辅助条件');
    expect(opts[0].label).not.toBe('FM_U002_COND');
  });

  it('partial survey 时 prependSelf 仍置顶中文选项', () => {
    const partialSurvey = {
      inputVariant: 'auxiliary_then_select' as const,
      collectInSurvey: true,
      surveyRequired: false,
      fieldKey: 'FM_U002',
      auxiliaryCondition: {
        fieldKey: 'FM_U002_COND',
        label: '辅助条件',
        unit: '%',
        collectInSurvey: true,
        surveyPlacement: 'indicator_census' as const,
      },
    };
    const opts = prependSelfAuxiliaryConditionOption(
      [{ value: 'FM_U002_COND', label: 'FM_U002_COND' }],
      { survey: partialSurvey, applicableTypes: ['SUNKEN'] },
    );
    expect(opts[0].label).toContain('辅助条件');
  });

  it('enrichConditionFieldOptionLabels 解析裸 fieldKey', () => {
    const enriched = enrichConditionFieldOptionLabels(
      [{ value: 'FM_U002_COND', label: 'FM_U002_COND' }],
      'point',
      [],
      'FM_U002',
      selfRow,
    );
    expect(enriched[0].label).toBe('辅助条件');
  });

  it('resolveConditionalSourceForIndicator 返回 indicator 类型', () => {
    expect(resolveConditionalSourceForIndicator(selfRow)).toEqual({
      type: 'indicator',
      key: 'FM_U002_COND',
    });
  });

  it('normalizeConditionSourceKey 将错配的 appendix_b+_COND 改为 indicator', () => {
    const fixed = normalizeConditionSourceKey(
      { type: 'appendix_b', key: 'FM_U002_COND' },
      'point',
      [],
      'FM_U002',
      selfRow,
    );
    expect(fixed).toEqual({ type: 'indicator', key: 'FM_U002_COND' });
  });

  it('suggestConditionalScoringForIndicator 不对设计重现期自动灌入', () => {
    const designP: RiskIndicatorRow = {
      id: 'dp',
      code: 'FM_SK_DESIGN_P',
      name: '排水重现期',
      level1: 'FORMATION',
      applicableTypes: ['SUNKEN'],
      weight: 0.1,
      valueType: 'numeric',
      scoreRules: [],
      enabled: true,
      updatedAt: '',
      survey: { collectInSurvey: true, surveyRequired: false, fieldKey: 'FM_SK_DESIGN_P' },
    };
    expect(suggestConditionalScoringForIndicator(designP)).toBeUndefined();
  });

  it('label 与 fieldKey 相同时清洗为辅助条件', () => {
    const dirtyRow: RiskIndicatorRow = {
      ...selfRow,
      survey: {
        ...selfRow.survey,
        auxiliaryCondition: {
          ...selfRow.survey.auxiliaryCondition!,
          label: 'FM_U002_COND',
        },
      },
    };
    expect(
      resolveAuxiliaryDisplayLabel(dirtyRow.survey.auxiliaryCondition!, dirtyRow.applicableTypes),
    ).toBe('辅助条件');
    expect(getAuxiliaryConditionOption(dirtyRow)?.label).toBe('辅助条件');
    expect(
      resolveConditionFieldLabel('FM_U002_COND', 'point', [], 'FM_U002', dirtyRow),
    ).toBe('辅助条件');
    expect(
      resolveAuxiliaryDefaults({
        code: 'FM_U002',
        existingAux: { fieldKey: 'FM_U002_COND', label: 'FM_U002_COND' },
      }).label,
    ).toBe('辅助条件');
    const normalized = normalizeIndicatorRow(dirtyRow, { allIndicators: [dirtyRow], baseline: dirtyRow });
    expect(normalized.survey.auxiliaryCondition?.label).toBe('辅助条件');
  });

  it('用户手填合法中文名不被误洗', () => {
    const customRow: RiskIndicatorRow = {
      ...selfRow,
      survey: {
        ...selfRow.survey,
        auxiliaryCondition: {
          ...selfRow.survey.auxiliaryCondition!,
          label: '道路纵坡 S',
        },
      },
    };
    expect(
      resolveAuxiliaryDisplayLabel(customRow.survey.auxiliaryCondition!, customRow.applicableTypes),
    ).toBe('道路纵坡 S');
  });

  it('survey 未写入 auxiliaryCondition 时仍按编码解析本项 _COND', () => {
    const draftOnly = {
      code: 'FM_U002',
      survey: { collectInSurvey: true, surveyRequired: false, fieldKey: 'FM_U002' },
    };
    expect(
      resolveConditionFieldLabel('FM_U002_COND', 'point', [], 'FM_U002', draftOnly),
    ).toBe('辅助条件');
  });

  it('低洼路段道路纵坡度固定字段显示中文', () => {
    const draft = {
      code: 'FM_U014',
      level1: 'FORMATION' as const,
      applicableTypes: ['LOW_LYING'] as const,
      survey: { collectInSurvey: true, surveyRequired: true, fieldKey: 'FM_U014' },
    };
    expect(
      resolveConditionFieldLabel('roadLongitudinalSlope', 'point', [], 'FM_U014', draft),
    ).toBe('道路纵坡度 S（%）（城市低洼路段专用信息）');
  });

  it('applicableTypes 缺失时不抛错且仍能解析固定附录字段', () => {
    expect(resolveConditionFieldLabel('roadLongitudinalSlope', 'point', [], undefined, undefined)).toBe(
      '道路纵坡度 S（%）（城市低洼路段专用信息）',
    );
  });

  it('道路纵坡度条件字段单位为 %', () => {
    expect(
      resolveCompositePartUnit({ type: 'appendix_b', key: 'roadLongitudinalSlope' }, []),
    ).toBe('%');
  });

  it('历史灾情字段出现在内涝基本信息条件选项', () => {
    const draft = {
      code: 'FM_U014',
      level1: 'FORMATION' as const,
      applicableTypes: ['LOW_LYING'] as const,
      survey: { collectInSurvey: true, surveyRequired: true, fieldKey: 'FM_U014' },
    };
    const opts = getSurveyBasicInfoConditionFieldOptions(draft, [], draft);
    expect(opts.some(o => o.value === 'historicalDeathCount')).toBe(true);
    expect(resolveConditionFieldLabel('historicalDeathCount', 'point', [], 'FM_U014', draft)).toBe(
      '人员死亡（人）（历史灾情）',
    );
  });

  it('历史灾情直接经济损失单位为万元', () => {
    expect(
      resolveCompositePartUnit(
        { type: 'appendix_b', key: 'historicalDirectEconomicLossWan' },
        [],
      ),
    ).toBe('万元');
  });

  it('未启用指标仍可作为本点其他指标条件字段选项', () => {
    const self: RiskIndicatorRow = {
      id: 'self',
      code: 'HZ_U099',
      name: '当前指标',
      level1: 'FORMATION',
      applicableTypes: ['SUNKEN'],
      weight: 0,
      valueType: 'numeric',
      scoreRules: [],
      enabled: false,
      updatedAt: '',
      survey: { collectInSurvey: true, surveyRequired: false, fieldKey: 'HZ_U099' },
    };
    const peer: RiskIndicatorRow = {
      id: 'peer',
      code: 'HZ_U098',
      name: '纵坡度',
      level1: 'FORMATION',
      applicableTypes: ['SUNKEN'],
      weight: 0,
      valueType: 'numeric',
      scoreRules: [],
      enabled: false,
      updatedAt: '',
      survey: { collectInSurvey: true, surveyRequired: false, fieldKey: 'HZ_U098' },
    };
    const opts = getConditionSourceFieldOptions(
      'point',
      [self, peer],
      self.code,
      { level1: self.level1, applicableTypes: self.applicableTypes, code: self.code },
      'branch_threshold',
    );
    expect(opts.some(o => o.value === 'HZ_U098')).toBe(true);
    expect(opts.find(o => o.value === 'HZ_U098')?.label).toContain('未启用');
  });
});
