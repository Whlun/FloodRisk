import { describe, expect, it } from 'vitest';
import {
  buildArchitectureSnapshot,
  configToMergedIndicators,
  getActiveArchitectureRecord,
  getArchitectureForRating,
  getArchitectureRatingReferenceIssue,
  mergeArchitectureOntoIndicators,
  migrateLegacyArchitectureToRecords,
  setActiveArchitectureRecord,
  summarizeArchitectureRecord,
  validateArchitectureConfig,
} from '../src/prototypes/deqing-waterlogging-risk/indicatorArchitectureUtils';
import type { RiskIndicatorRow } from '../src/prototypes/deqing-waterlogging-risk/types';
import { cloneLevel1Weights } from '../src/prototypes/deqing-waterlogging-risk/types';

function sampleIndicator(overrides: Partial<RiskIndicatorRow> = {}): RiskIndicatorRow {
  return {
    id: 'ind-1',
    code: 'HZ_U001',
    name: '测试指标',
    level1: 'HAZARD',
    applicableTypes: ['GLOBAL'],
    weight: 1,
    valueType: 'enum',
    scoreRules: [{ id: 'r1', label: 'A', riskTier: '低', score: 0.5 }],
    enabled: true,
    updatedAt: '2026-01-01 00:00:00',
    survey: { fieldKey: 'HZ_U001', label: '测试', required: false },
    ...overrides,
  };
}

describe('indicatorArchitectureUtils', () => {
  it('mergeArchitectureOntoIndicators overlays enabled and weight', () => {
    const base = [sampleIndicator({ id: 'a', enabled: false, weight: 0.2 })];
    const merged = mergeArchitectureOntoIndicators(base, {
      indicatorStates: { a: { enabled: true, weight: 0.8 } },
    });
    expect(merged[0].enabled).toBe(true);
    expect(merged[0].weight).toBe(0.8);
  });

  it('missing snapshot entry defaults to disabled', () => {
    const base = [sampleIndicator({ id: 'x', enabled: true })];
    const merged = mergeArchitectureOntoIndicators(base, { indicatorStates: {} });
    expect(merged[0].enabled).toBe(false);
  });

  it('setActiveArchitectureRecord enforces single active', () => {
    const records = migrateLegacyArchitectureToRecords(
      [sampleIndicator()],
      cloneLevel1Weights(),
      'appendix_e',
    );
    const second = {
      ...records[0],
      id: 'arch-2',
      activeForRating: false,
    };
    const list = setActiveArchitectureRecord([records[0], second], 'arch-2');
    expect(getActiveArchitectureRecord(list)?.id).toBe('arch-2');
    expect(list.filter(r => r.activeForRating)).toHaveLength(1);
  });

  it('buildArchitectureSnapshot marks completed when weights valid', () => {
    const ind = sampleIndicator();
    const config = buildArchitectureSnapshot([ind], cloneLevel1Weights(), 'appendix_e');
    expect(config.status).toBe('completed');
    expect(config.indicatorStates[ind.id].enabled).toBe(true);
  });

  it('uses the frozen indicator snapshot as the statistics denominator', () => {
    const ind = sampleIndicator();
    const config = buildArchitectureSnapshot([ind], cloneLevel1Weights(), 'manual');
    const record = {
      id: 'arch-snapshot',
      versionNo: 'V001',
      configAt: '2026-01-01 00:00:00',
      activeForRating: false,
      config,
    };
    const currentCatalog = [
      ind,
      sampleIndicator({ id: 'new-after-publish', code: 'NEW_AFTER_PUBLISH' }),
    ];
    expect(summarizeArchitectureRecord(currentCatalog, record).totalCount).toBe(1);
  });

  it('validateArchitectureConfig detects invalid level1 sum', () => {
    const ind = sampleIndicator();
    const config = buildArchitectureSnapshot([ind], cloneLevel1Weights(), 'manual');
    config.level1Weights.HAZARD = 0.5;
    const result = validateArchitectureConfig(config, [ind]);
    expect(result.ok).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('校验拆分权重与指标问题，启用指标不可计算时不得 completed/active', () => {
    const invalid = sampleIndicator({
      valueType: 'numeric',
      scoreRules: [
        { id: 'r1', label: '低', riskTier: '低', score: 0.2, numericMatch: { kind: 'lte', value: 10 } },
        { id: 'r2', label: '高', riskTier: '高', score: 1, numericMatch: { kind: 'gte', value: 9 } },
      ],
    });
    const config = buildArchitectureSnapshot([invalid], cloneLevel1Weights());
    expect(config.status).toBe('draft');
    const validation = validateArchitectureConfig(config, [invalid]);
    expect(validation.weightIssues).toEqual([]);
    expect(validation.indicatorIssues.join('；')).toContain('匹配区间不可重叠');

    const record = {
      ...migrateLegacyArchitectureToRecords([invalid], cloneLevel1Weights())[0],
      activeForRating: false,
      config: { ...config, status: 'completed' as const },
    };
    expect(getArchitectureRatingReferenceIssue(record)).toContain('指标校验未通过');
    expect(setActiveArchitectureRecord([record], record.id)[0].activeForRating).toBe(false);
    expect(getArchitectureForRating([{ ...record, activeForRating: true }])).toBeNull();
  });

  it('缺少冻结指标快照的 completed 历史版本不可设为定级引用', () => {
    const record = {
      ...migrateLegacyArchitectureToRecords(
        [sampleIndicator()],
        cloneLevel1Weights(),
      )[0],
      activeForRating: true,
    };
    const withoutDefinitions = {
      ...record,
      config: {
        ...record.config,
        status: 'completed' as const,
        indicatorDefinitions: undefined,
      },
    };
    expect(getArchitectureRatingReferenceIssue(withoutDefinitions)).toContain('缺少冻结');
    expect(getArchitectureForRating([withoutDefinitions])).toBeNull();
    expect(
      setActiveArchitectureRecord(
        [{ ...withoutDefinitions, activeForRating: false }],
        withoutDefinitions.id,
      )[0].activeForRating,
    ).toBe(false);
  });

  it('configToMergedIndicators round-trips through snapshot', () => {
    const indicators = [
      sampleIndicator({ id: 'a', weight: 0.6, enabled: true }),
      sampleIndicator({ id: 'b', code: 'HZ_U002', weight: 0.4, enabled: true }),
    ];
    const config = buildArchitectureSnapshot(indicators, cloneLevel1Weights(), 'manual');
    const merged = configToMergedIndicators(indicators, config);
    expect(merged.find(i => i.id === 'a')?.weight).toBe(0.6);
    expect(merged.find(i => i.id === 'b')?.enabled).toBe(true);
  });
});
