import { describe, expect, it, beforeEach, vi } from 'vitest';
import { initialRiskIndicators } from '../src/database/deqing-waterlogging-risk-indicators';
import {
  dedupeConditionFieldOptions,
  getSurveyBasicInfoConditionFieldOptions,
  normalizeConditionSourceKey,
  prependSelfAuxiliaryConditionOption,
} from '../src/prototypes/deqing-waterlogging-risk/conditionalScoring';
import { validateIndicatorConfig } from '../src/prototypes/deqing-waterlogging-risk/indicatorConfigReadiness';
import { normalizeIndicatorForEdit } from '../src/prototypes/deqing-waterlogging-risk/indicatorNormalize';
import {
  clearPersistedIndicators,
  loadPersistedIndicators,
  mergePersistedIndicators,
  resetPersistedIndicatorsToBaseline,
  resetPersistedIndicatorsToEmpty,
} from '../src/prototypes/deqing-waterlogging-risk/indicatorPersistence';
import { enrichNumericUniformScoreRules } from '../src/prototypes/deqing-waterlogging-risk/scoreRuleNumericBands';
import type { RiskIndicatorRow } from '../src/prototypes/deqing-waterlogging-risk/types';

function mockLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  });
  return store;
}

describe('指标持久化 · 空白自建', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    mockLocalStorage();
    clearPersistedIndicators();
  });

  it('无本地数据时 load 返回空列表', () => {
    const loaded = loadPersistedIndicators([]);
    expect(loaded).toEqual([]);
  });

  it('仅加载已保存的 v2 数据，不合并导则种子', () => {
    const custom = {
      ...initialRiskIndicators[0],
      id: 'user-persist-1',
      code: 'HZ_U777',
      name: '用户保留指标',
      enabled: false,
      updatedAt: '2026-01-01 00:00:00',
    };
    localStorage.setItem('dq-waterlogging-risk-indicators-v2', JSON.stringify([custom]));

    const loaded = loadPersistedIndicators(initialRiskIndicators);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].code).toBe('HZ_U777');
    expect(loaded.some(r => r.code === 'FM_LL_COLLECT')).toBe(false);
  });

  it('本地为空数组时保持空，不自动恢复导则预置', () => {
    localStorage.setItem('dq-indicators-full-reset-v2', '1');
    localStorage.setItem('dq-indicators-user-empty-v1', '1');
    localStorage.setItem('dq-waterlogging-risk-indicators-v2', '[]');

    const loaded = loadPersistedIndicators(initialRiskIndicators);
    expect(loaded).toEqual([]);
  });

  it('缺 numericMatch 时加载不自动补全导则区间', () => {
    const rain = initialRiskIndicators.find(i => i.code === 'HZ_RAIN_ALERT_FREQ')!;
    const stripped = {
      ...rain,
      scoreRules: rain.scoreRules.map(r => {
        const { numericMatch: _n, ...rest } = r;
        return rest;
      }),
    };
    localStorage.setItem('dq-waterlogging-risk-indicators-v2', JSON.stringify([stripped]));

    const loaded = loadPersistedIndicators([]);
    const row = loaded.find(i => i.code === 'HZ_RAIN_ALERT_FREQ')!;
    expect(row.scoreRules.some(r => r.numericMatch)).toBe(false);
    const enriched = enrichNumericUniformScoreRules(row);
    expect(enriched.scoreRules.some(r => r.numericMatch)).toBe(false);
  });

  it('resetPersistedIndicatorsToEmpty 清空且不合并种子', () => {
    localStorage.setItem(
      'dq-waterlogging-risk-indicators-v2',
      JSON.stringify(initialRiskIndicators.slice(0, 3)),
    );

    const empty = resetPersistedIndicatorsToEmpty();
    expect(empty).toEqual([]);
    const loaded = loadPersistedIndicators(initialRiskIndicators);
    expect(loaded).toEqual([]);
  });

  it('resetPersistedIndicatorsToBaseline 与清空等价', () => {
    localStorage.setItem(
      'dq-waterlogging-risk-indicators-v2',
      JSON.stringify([initialRiskIndicators[0]]),
    );

    const reset = resetPersistedIndicatorsToBaseline(initialRiskIndicators);
    expect(reset).toEqual([]);
    expect(loadPersistedIndicators([])).toEqual([]);
  });

  it('mergePersistedIndicators 仅用于显式合并（运行时不调用）', () => {
    const custom = {
      ...initialRiskIndicators[0],
      id: 'user-only',
      code: 'HZ_U888',
      name: '仅用户',
    };
    const merged = mergePersistedIndicators(initialRiskIndicators.slice(0, 2), [custom]);
    expect(merged.some(r => r.code === 'HZ_U888')).toBe(true);
    expect(merged.length).toBe(3);
  });
});

describe('FM_LL_COLLECT 条件字段统一', () => {
  it('legacy FM_LL_LONG_SLOPE 规范为当前辅助字段键', () => {
    const collect = initialRiskIndicators.find(i => i.code === 'FM_LL_COLLECT')!;
    const withLegacy: typeof collect = {
      ...collect,
      survey: {
        ...collect.survey,
        auxiliaryCondition: {
          ...collect.survey.auxiliaryCondition!,
          surveyPlacement: 'appendix_b',
          fieldKey: 'FM_LL_COLLECT_SLOPE',
          legacyFieldKeys: ['FM_LL_LONG_SLOPE'],
        },
      },
    };
    const normalized = normalizeConditionSourceKey(
      { type: 'appendix_b', key: 'FM_LL_LONG_SLOPE' },
      'point',
      initialRiskIndicators,
      withLegacy.code,
      withLegacy,
    );
    expect(normalized.key).toBe('FM_LL_COLLECT_SLOPE');
  });

  it('条件下拉无裸键重复项', () => {
    const collect = initialRiskIndicators.find(i => i.code === 'FM_LL_COLLECT')!;
    const opts = getSurveyBasicInfoConditionFieldOptions(collect, initialRiskIndicators, collect);
    const deduped = dedupeConditionFieldOptions([
      { value: 'FM_LL_COLLECT_COND', label: 'FM_LL_COLLECT_COND' },
      ...opts,
    ]);
    const enriched = prependSelfAuxiliaryConditionOption(deduped, collect);
    const cond = enriched.find(o => o.value === 'FM_LL_COLLECT_COND');
    expect(cond?.label).toContain('辅助条件');
    expect(enriched.filter(o => o.value === 'FM_LL_COLLECT_COND')).toHaveLength(1);
  });

  it('normalizeIndicatorForEdit 不依赖 seed 覆盖条件来源', () => {
    const collect = initialRiskIndicators.find(i => i.code === 'FM_LL_COLLECT')!;
    const dirty = {
      ...collect,
      conditionalScoring: {
        ...collect.conditionalScoring!,
        enabled: true,
        source: { type: 'indicator' as const, key: 'FM_LL_COLLECT' },
      },
    };
    const edited = normalizeIndicatorForEdit(dirty, initialRiskIndicators, initialRiskIndicators);
    expect(edited.conditionalScoring?.source?.key).toBe('FM_LL_COLLECT_COND');
    const readiness = validateIndicatorConfig(
      { ...edited, conditionalScoring: { ...edited.conditionalScoring!, enabled: true } },
      initialRiskIndicators,
    );
    expect(readiness.ok).toBe(false);
  });

  it('一次性迁移纠正 appendix_b+_COND 脏数据', () => {
    const dirty: RiskIndicatorRow = {
      id: 'wiz',
      code: 'FM_U099',
      name: '测试',
      level1: 'FORMATION',
      applicableTypes: ['SUNKEN'],
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
        fieldKey: 'FM_U099',
        inputVariant: 'auxiliary_then_select',
        auxiliaryCondition: {
          fieldKey: 'FM_U099_COND',
          label: 'FM_U099_COND',
          unit: '%',
          collectInSurvey: true,
          surveyPlacement: 'indicator_census',
        },
      },
      conditionalScoring: {
        enabled: true,
        mode: 'branch_rules',
        source: { type: 'appendix_b', key: 'FM_U099_COND' },
        branches: [
          { id: 'b0', label: '分支 1', scoreRules: [{ id: 'r0', label: '低', riskTier: '低', score: 0 }] },
          { id: 'b1', label: '分支 2', scoreRules: [{ id: 'r1', label: '高', riskTier: '高', score: 1 }] },
        ],
      },
    };
    localStorage.setItem('dq-waterlogging-risk-indicators-v2', JSON.stringify([dirty]));

    const loaded = loadPersistedIndicators([]);
    const row = loaded.find(i => i.code === 'FM_U099');
    expect(row?.conditionalScoring?.source).toEqual({ type: 'indicator', key: 'FM_U099_COND' });
    expect(row?.survey.auxiliaryCondition?.label).toBe('辅助条件');
    expect(localStorage.getItem('dq-indicators-cond-source-fix-v1')).toBe('1');
    expect(localStorage.getItem('dq-indicators-aux-label-fix-v1')).toBe('1');
  });
});
