import { describe, expect, it } from 'vitest';
import type { FormInstance } from 'antd';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initialRiskIndicators } from '../src/database/deqing-waterlogging-risk-indicators';
import {
  applyIndicatorConfigTemplate,
  buildIndicatorRowFromForm,
  listTemplatesForValueType,
  type IndicatorConfigTemplateId,
} from '../src/prototypes/deqing-waterlogging-risk/indicatorConfigTemplates';
import {
  summarizeReadinessForList,
  validateIndicatorConfig,
  validateIndicatorEnableReadiness,
} from '../src/prototypes/deqing-waterlogging-risk/indicatorConfigReadiness';
import {
  getSiblingGroup,
  isSiblingWeightSumValid,
  sumSiblingWeights,
} from '../src/prototypes/deqing-waterlogging-risk/weightBalance';
import { normalizeIndicatorRow } from '../src/prototypes/deqing-waterlogging-risk/indicatorNormalize';
import { matchScoreRuleFromValue } from '../src/prototypes/deqing-waterlogging-risk/scoreRuleMapping';
import { migrateWorkspaceBundle } from '../src/prototypes/deqing-waterlogging-risk/workspaceService';
import type { DeqingWaterloggingWorkspace } from '../src/prototypes/deqing-waterlogging-risk/workspaceTypes';
import {
  normalizeIndicatorScoringRuleMode,
  resolveScoringRuleMode,
} from '../src/prototypes/deqing-waterlogging-risk/scoringRuleMode';
import type { Level1Factor, RiskIndicatorRow, ScoringRuleMode } from '../src/prototypes/deqing-waterlogging-risk/types';

const TEMPLATE_TO_MODE: Record<IndicatorConfigTemplateId, ScoringRuleMode> = {
  enum_uniform: 'uniform',
  numeric_uniform: 'uniform',
  boolean_uniform: 'uniform',
  auxiliary_conditional: 'conditional',
  composite_appendix: 'composite',
};

/** 轻量 Form 替身，用于模拟新建向导 applyTemplate */
function createMockForm(initial: Record<string, unknown> = {}): FormInstance {
  const store: Record<string, unknown> = { ...initial };
  return {
    getFieldValue: (name: string | string[]) => {
      if (Array.isArray(name)) {
        const out: Record<string, unknown> = {};
        for (const k of name) out[k] = store[k];
        return out;
      }
      return store[name];
    },
    setFieldValue: (name: string, value: unknown) => {
      store[name] = value;
    },
    setFieldsValue: (values: Record<string, unknown>) => {
      Object.assign(store, values);
    },
    getFieldsValue: (nameList?: true | string[] | undefined) => {
      if (nameList === true || !nameList) return { ...store };
      const out: Record<string, unknown> = {};
      for (const k of nameList) out[k] = store[k];
      return out;
    },
  } as unknown as FormInstance;
}

function rowForReadiness(ind: RiskIndicatorRow, all?: RiskIndicatorRow[]): RiskIndicatorRow {
  const pool = all ?? initialRiskIndicators;
  let normalized = normalizeIndicatorRow(ind, { allIndicators: pool, baseline: ind });
  normalized = normalizeIndicatorScoringRuleMode(normalized);
  if (normalized.conditionalScoring && resolveScoringRuleMode(normalized) === 'conditional') {
    return {
      ...normalized,
      conditionalScoring: { ...normalized.conditionalScoring, enabled: true },
    };
  }
  return normalized;
}

const WIZARD_SCENARIOS: Array<{
  title: string;
  templateId: IndicatorConfigTemplateId;
  formSeed: Record<string, unknown>;
}> = [
  {
    title: '致灾·全局·下拉',
    templateId: 'enum_uniform',
    formSeed: {
      code: 'T_HZ_ENUM',
      name: '测试枚举',
      level1: 'HAZARD' as Level1Factor,
      applicableTypes: ['GLOBAL'],
      valueType: 'enum',
    },
  },
  {
    title: '致灾·全局·数值',
    templateId: 'numeric_uniform',
    formSeed: {
      code: 'T_HZ_NUM',
      name: '测试数值',
      level1: 'HAZARD' as Level1Factor,
      applicableTypes: ['GLOBAL'],
      valueType: 'numeric',
      unit: '次/年',
    },
  },
  {
    title: '致灾·全局·是/否',
    templateId: 'boolean_uniform',
    formSeed: {
      code: 'T_HZ_BOOL',
      name: '测试布尔',
      level1: 'HAZARD' as Level1Factor,
      applicableTypes: ['GLOBAL'],
    },
  },
  {
    title: '孕灾·低洼·条件赋分',
    templateId: 'auxiliary_conditional',
    formSeed: {
      code: 'T_LL_AUX',
      name: '测试收水',
      level1: 'FORMATION' as Level1Factor,
      applicableTypes: ['LOW_LYING'],
      valueType: 'enum',
    },
  },
  {
    title: '孕灾·地下·复合数值',
    templateId: 'composite_appendix',
    formSeed: {
      code: 'T_UG_COMP',
      name: '测试出入口高差',
      level1: 'FORMATION' as Level1Factor,
      applicableTypes: ['UNDERGROUND'],
      valueType: 'numeric',
      unit: 'm',
    },
  },
  {
    title: '承灾·全局·下拉',
    templateId: 'enum_uniform',
    formSeed: {
      code: 'T_BR_ENUM',
      name: '测试承灾',
      level1: 'BEARING' as Level1Factor,
      applicableTypes: ['GLOBAL'],
      valueType: 'enum',
    },
  },
  {
    title: '预防·全局·数值',
    templateId: 'numeric_uniform',
    formSeed: {
      code: 'T_PR_NUM',
      name: '测试预防',
      level1: 'PREVENTION' as Level1Factor,
      applicableTypes: ['GLOBAL'],
      valueType: 'numeric',
    },
  },
];

describe('风险指标管理 · 通用性验收', () => {
  it('赋分场景按普查填报方式过滤展示', () => {
    const enumIds = listTemplatesForValueType('enum').map(t => t.id);
    expect(enumIds).toEqual(['enum_uniform', 'auxiliary_conditional', 'composite_appendix']);
    expect(enumIds).not.toContain('numeric_uniform');
    const numericIds = listTemplatesForValueType('numeric').map(t => t.id);
    expect(numericIds).toEqual(['numeric_uniform', 'auxiliary_conditional', 'composite_appendix']);
    expect(listTemplatesForValueType('boolean').map(t => t.id)).toEqual(['boolean_uniform']);
  });

  it('导则种子结构合法；未手动配齐赋分区间的指标预期待完善', () => {
    const notReady: string[] = [];
    const ready: string[] = [];
    for (const ind of initialRiskIndicators) {
      const row = rowForReadiness(ind);
      const r = validateIndicatorConfig(row, initialRiskIndicators);
      if (r.ok) ready.push(ind.code);
      else notReady.push(ind.code);
      expect(ind.code?.trim()).toBeTruthy();
      expect(ind.name?.trim()).toBeTruthy();
      expect(ind.scoreRules?.length).toBeGreaterThan(0);
    }
    expect(initialRiskIndicators.length).toBeGreaterThanOrEqual(20);
    expect(notReady.length).toBeGreaterThan(0);
    expect(ready).toContain('FM_SK_LONG_SLOPE');
    expect(notReady).toContain('FM_LL_COLLECT');
    expect(ready).toContain('HZ_GUEST_WATER');
    expect(ready).toContain('FM_UG_ENTRANCE_H');
  });

  it.each(WIZARD_SCENARIOS)('新建向导 · $title · 模板就绪', ({ templateId, formSeed }) => {
    const form = createMockForm(formSeed);
    applyIndicatorConfigTemplate(form, templateId, {
      code: String(formSeed.code),
      name: String(formSeed.name),
      idPrefix: 'wiz',
      contentMode: templateId === 'numeric_uniform' ? 'structure' : undefined,
    });
    const draft = buildIndicatorRowFromForm(form, null);
    const normalized = rowForReadiness({
      ...draft,
      id: 'draft-wiz',
      enabled: false,
      weight: 0,
      updatedAt: '',
    });
    expect(resolveScoringRuleMode(normalized)).toBe(TEMPLATE_TO_MODE[templateId]);
    if (templateId === 'numeric_uniform') {
      expect(normalized.scoreRules).toHaveLength(4);
      expect(normalized.scoreRules?.some(r => r.numericMatch)).toBe(false);
      const r = validateIndicatorConfig(normalized, [...initialRiskIndicators, normalized]);
      expect(r.ok).toBe(false);
      expect(r.blockers.join('')).toMatch(/匹配区间/);
      return;
    }
    if (templateId === 'auxiliary_conditional') {
      expect(normalized.survey?.inputVariant).toBe('default');
      expect(normalized.survey?.auxiliaryCondition).toBeUndefined();
      expect(normalized.conditionalScoring?.enabled).toBe(true);
      const r = validateIndicatorConfig(normalized, [...initialRiskIndicators, normalized]);
      expect(r.ok).toBe(false);
      expect(r.blockers.join('')).toMatch(/条件分支|条件来源/);
      return;
    }
    const r = validateIndicatorConfig(normalized, [...initialRiskIndicators, normalized]);
    expect(r.ok, r.blockers.join('；')).toBe(true);
  });

  it('代表性指标可匹配赋分（枚举统一 / 复合）', () => {
    const all = initialRiskIndicators;

    const guest = all.find(i => i.code === 'HZ_GUEST_WATER')!;
    const guestRule = matchScoreRuleFromValue(
      guest,
      '存在客水接入',
      { indicatorValues: {} },
      all,
    );
    expect(guestRule?.score).toBe(1);

    const ug = rowForReadiness(all.find(i => i.code === 'FM_UG_ENTRANCE_H')!);
    expect(resolveScoringRuleMode(ug)).toBe('composite');
    const ugReadiness = validateIndicatorConfig(ug, all);
    expect(ugReadiness.ok).toBe(true);

    const designP = rowForReadiness(all.find(i => i.code === 'FM_LL_DESIGN_P')!);
    expect(resolveScoringRuleMode(designP)).toBe('uniform');
    const designReadiness = validateIndicatorConfig(designP, all);
    expect(designReadiness.ok).toBe(false);

    const collect = rowForReadiness(all.find(i => i.code === 'FM_LL_COLLECT')!);
    expect(resolveScoringRuleMode(collect)).toBe('conditional');
    const collectReadiness = validateIndicatorConfig(collect, all);
    expect(collectReadiness.ok).toBe(false);

    const slope = rowForReadiness(all.find(i => i.code === 'FM_SK_LONG_SLOPE')!);
    expect(matchScoreRuleFromValue(slope, 6, { indicatorValues: {} }, all)?.score).toBe(0.5);
  });

  it('自建数值指标可按配置的匹配区间赋分', () => {
    const custom: RiskIndicatorRow = {
      id: 'custom-slope',
      code: 'CUSTOM_LONG_SLOPE',
      name: '纵坡度',
      level1: 'FORMATION',
      applicableTypes: ['SUNKEN'],
      weight: 0.1,
      enabled: false,
      valueType: 'numeric',
      unit: '%',
      scoringRuleMode: 'uniform',
      scoreRules: [
        {
          id: 'r0',
          label: 'S<5%',
          riskTier: '低',
          score: 0.25,
          numericMatch: { kind: 'lt', value: 5 },
        },
        {
          id: 'r1',
          label: '5≤S<7%',
          riskTier: '中',
          score: 0.5,
          numericMatch: { kind: 'between', min: 5, max: 7, minInclusive: true, maxInclusive: false },
        },
        {
          id: 'r2',
          label: '7%≤S<10%',
          riskTier: '较高',
          score: 0.75,
          numericMatch: { kind: 'between', min: 7, max: 10, minInclusive: true, maxInclusive: false },
        },
        { id: 'r3', label: 'S≥10%', riskTier: '高', score: 1, numericMatch: { kind: 'gte', value: 10 } },
      ],
      survey: { collectInSurvey: true, surveyRequired: true, fieldKey: 'CUSTOM_LONG_SLOPE' },
      updatedAt: '',
    };
    expect(matchScoreRuleFromValue(custom, 4, { indicatorValues: {} })?.score).toBe(0.25);
    expect(matchScoreRuleFromValue(custom, 6, { indicatorValues: {} })?.score).toBe(0.5);
    expect(matchScoreRuleFromValue(custom, 9, { indicatorValues: {} })?.score).toBe(0.75);
    expect(matchScoreRuleFromValue(custom, 12, { indicatorValues: {} })?.score).toBe(1);
    const readiness = validateIndicatorConfig(custom, [custom]);
    expect(readiness.ok).toBe(true);
  });

  it('工作区致灾三指标：配置完整且同级权重合计为 1 时应为就绪', () => {
    const raw = migrateWorkspaceBundle(JSON.parse(
      readFileSync(
        resolve(__dirname, '../src/prototypes/deqing-waterlogging-risk/workspace-data.json'),
        'utf8',
      ),
    ) as DeqingWaterloggingWorkspace);
    const hazardCodes = ['HZ_U001', 'HZ_U002', 'HZ_U003'];
    const pool = raw.indicators.map(ind =>
      rowForReadiness(ind, raw.indicators),
    );
    const hazardEnabled = pool.filter(
      i => i.level1 === 'HAZARD' && i.enabled && hazardCodes.includes(i.code),
    );
    expect(hazardEnabled).toHaveLength(3);
    const hz001 = pool.find(i => i.code === 'HZ_U001')!;
    const siblingGroup = getSiblingGroup(pool, hz001.level1, hz001.applicableTypes);
    expect(siblingGroup.map(i => i.code)).toEqual(hazardCodes);
    const siblingSum = sumSiblingWeights(siblingGroup);
    expect(siblingSum).toBeCloseTo(1, 3);
    expect(isSiblingWeightSumValid(siblingSum), `sum=${siblingSum} round=${Math.round(siblingSum * 1000)}`).toBe(true);

    for (const code of hazardCodes) {
      const ind = pool.find(i => i.code === code)!;
      const cfg = validateIndicatorConfig(ind, pool);
      const enable = validateIndicatorEnableReadiness(ind, pool);
      const list = summarizeReadinessForList(ind, pool);
      expect(cfg.blockers, `${code} blockers`).toEqual([]);
      expect(cfg.warnings, `${code} warnings`).toEqual([]);
      expect(enable.warnings, `${code} enable warnings`).toEqual([]);
      expect(list.status, `${code} tooltip: ${list.tooltip}`).toBe('ready');
    }
  });
});
