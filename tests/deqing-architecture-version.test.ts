import { describe, expect, it } from 'vitest';
import {
  buildArchitectureSnapshot,
  buildArchitectureActivationRegenerationPlan,
  ensureArchitectureIndicatorSnapshots,
  ensureArchitectureVersionNos,
  hasMeaningfulArchitectureCopyChanges,
  hasArchitectureCopyBaselineChange,
  getArchitectureRatingReferenceIssue,
  mergeIndicatorsForArchitectureRecord,
  nextArchitectureVersionNo,
  parseArchitectureVersionNo,
  refreshArchitectureConfigForNewVersion,
  isArchitectureVersionImmutable,
  sortArchitectureRecords,
} from '../src/prototypes/deqing-waterlogging-risk/indicatorArchitectureUtils';
import { createRiskChangeLogEntry } from '../src/prototypes/deqing-waterlogging-risk/riskChangeLogUtils';
import { summarizeRegionalPreventionRecord } from '../src/prototypes/deqing-waterlogging-risk/regionalPreventionUtils';
import type {
  IndicatorArchitectureRecord,
  RegionalPreventionRecord,
  RiskIndicatorRow,
  WaterloggingPointRow,
} from '../src/prototypes/deqing-waterlogging-risk/types';
import {
  cloneLevel1Weights,
  emptyIndicatorArchitectureConfig,
  emptyRegionalPreventionRecord,
} from '../src/prototypes/deqing-waterlogging-risk/types';

function stubRecord(partial: Partial<IndicatorArchitectureRecord> & Pick<IndicatorArchitectureRecord, 'id' | 'configAt'>): IndicatorArchitectureRecord {
  return {
    versionNo: '',
    label: '',
    activeForRating: false,
    config: emptyIndicatorArchitectureConfig(),
    ...partial,
  };
}

describe('指标架构版本编号', () => {
  it('已完成或当前引用的版本不可原地编辑', () => {
    expect(
      isArchitectureVersionImmutable(
        stubRecord({
          id: 'completed',
          configAt: '2026-01-01',
          config: { ...emptyIndicatorArchitectureConfig(), status: 'completed' },
        }),
      ),
    ).toBe(true);
    expect(
      isArchitectureVersionImmutable(
        stubRecord({ id: 'active', configAt: '2026-01-01', activeForRating: true }),
      ),
    ).toBe(true);
    expect(
      isArchitectureVersionImmutable(
        stubRecord({ id: 'draft', configAt: '2026-01-01' }),
      ),
    ).toBe(false);
  });

  it('parseArchitectureVersionNo 解析 V00n', () => {
    expect(parseArchitectureVersionNo('V001')).toBe(1);
    expect(parseArchitectureVersionNo('V012')).toBe(12);
    expect(parseArchitectureVersionNo('')).toBe(0);
  });

  it('nextArchitectureVersionNo 递增分配', () => {
    const records = [
      stubRecord({ id: 'a', configAt: '2026-01-01', versionNo: 'V001' }),
      stubRecord({ id: 'b', configAt: '2026-01-02', versionNo: 'V003' }),
    ];
    expect(nextArchitectureVersionNo(records)).toBe('V004');
  });

  it('复制版本未修改时不应生成重复记录', () => {
    const initial = {
      ...emptyIndicatorArchitectureConfig(),
      updatedAt: '2026-01-01 00:00:00',
      updatedBy: '甲',
      status: 'completed' as const,
    };
    const emittedByEditor = {
      ...initial,
      updatedAt: '2026-02-01 00:00:00',
      updatedBy: '乙',
      status: 'draft' as const,
    };

    expect(
      hasMeaningfulArchitectureCopyChanges(
        initial,
        emittedByEditor,
        '复制自 V003',
        '复制自 V003',
      ),
    ).toBe(false);
  });

  it('复制版本调整配置或批次说明后才允许生成', () => {
    const initial = emptyIndicatorArchitectureConfig();
    const changedConfig = {
      ...initial,
      level1Weights: { ...initial.level1Weights, HAZARD: 0.3 },
    };

    expect(
      hasMeaningfulArchitectureCopyChanges(
        initial,
        changedConfig,
        '复制自 V003',
        '复制自 V003',
      ),
    ).toBe(true);
    expect(
      hasMeaningfulArchitectureCopyChanges(
        initial,
        initial,
        '复制自 V003',
        '2027 年汛前方案',
      ),
    ).toBe(true);
  });

  it('ensureArchitectureVersionNos 为历史记录补编号并按版本倒序', () => {
    const records = ensureArchitectureVersionNos([
      stubRecord({ id: 'old', configAt: '2026-01-01 00:00:00' }),
      stubRecord({ id: 'new', configAt: '2026-02-01 00:00:00' }),
      stubRecord({ id: 'mid', configAt: '2026-01-15 00:00:00', versionNo: 'V005' }),
    ]);
    expect(records.find(r => r.id === 'old')?.versionNo).toBe('V001');
    expect(records.find(r => r.id === 'mid')?.versionNo).toBe('V005');
    expect(records.find(r => r.id === 'new')?.versionNo).toBe('V002');
    expect(sortArchitectureRecords(records)[0].id).toBe('mid');
  });
});

function preventionIndicator(id: string, fieldKey: string, score: number): RiskIndicatorRow {
  return {
    id,
    code: fieldKey,
    name: fieldKey,
    level1: 'PREVENTION',
    applicableTypes: ['GLOBAL'],
    weight: 1,
    valueType: 'enum',
    enabled: true,
    scoreRules: [{ id: 'r1', label: '档A', score }],
    updatedAt: '',
    survey: {
      collectInSurvey: true,
      scope: 'region',
      fieldKey,
    },
  } as RiskIndicatorRow;
}

function scoreableVersionIndicator(
  id: string,
  level1: RiskIndicatorRow['level1'],
  applicableTypes: RiskIndicatorRow['applicableTypes'],
): RiskIndicatorRow {
  return {
    ...preventionIndicator(id, id.toUpperCase(), 1),
    level1,
    applicableTypes,
    valueType: 'boolean',
    scoreRules: [
      { id: `${id}-low`, label: '否', riskTier: '低', score: 0 },
      { id: `${id}-high`, label: '是', riskTier: '高', score: 1 },
    ],
    survey: {
      collectInSurvey: true,
      surveyRequired: true,
      fieldKey: id.toUpperCase(),
      scope: level1 === 'PREVENTION' ? 'region' : 'point',
    },
  };
}

describe('逐条绑定指标架构版本', () => {
  it('历史版本优先使用冻结的指标定义，不受当前目录编辑与删除影响', () => {
    const original = preventionIndicator('p1', 'PREV_OLD', 0.8);
    const config = buildArchitectureSnapshot([original], cloneLevel1Weights());
    const record = stubRecord({
      id: 'arch-frozen',
      configAt: '2026-01-01',
      versionNo: 'V001',
      config: { ...config, status: 'completed' },
    });
    const currentEdited = {
      ...original,
      name: '已改名',
      survey: { ...original.survey, fieldKey: 'PREV_NEW' },
      scoreRules: [{ id: 'r-new', label: '新档', score: 0.1 }],
    };

    const mergedAfterEdit = mergeIndicatorsForArchitectureRecord([currentEdited], record);
    const mergedAfterDelete = mergeIndicatorsForArchitectureRecord([], record);

    expect(mergedAfterEdit[0].name).toBe('PREV_OLD');
    expect(mergedAfterEdit[0].survey.fieldKey).toBe('PREV_OLD');
    expect(mergedAfterEdit[0].scoreRules[0]).toEqual(
      expect.objectContaining({ id: 'r1', score: 0.8 }),
    );
    expect(mergedAfterDelete.map(i => i.id)).toEqual(['p1']);
  });

  it('旧版本仅补一次定义快照，后续目录变化不会重写', () => {
    const original = preventionIndicator('p1', 'PREV_OLD', 0.8);
    const legacy = stubRecord({
      id: 'legacy',
      configAt: '2026-01-01',
      config: {
        ...emptyIndicatorArchitectureConfig(),
        indicatorStates: { p1: { weight: 1, enabled: true } },
      },
    });
    const first = ensureArchitectureIndicatorSnapshots([legacy], [original]);
    const edited = { ...original, name: '目录新名称' };
    const second = ensureArchitectureIndicatorSnapshots(first, [edited]);
    expect(second[0].config.indicatorDefinitions?.p1.name).toBe('PREV_OLD');
  });

  it('复制为新版本时刷新定义快照并保留现存指标状态，新指标默认停用', () => {
    const old = preventionIndicator('p1', 'PREV_OLD', 0.8);
    const source = {
      ...buildArchitectureSnapshot([old], cloneLevel1Weights()),
      status: 'completed' as const,
    };
    const edited = {
      ...old,
      survey: { ...old.survey, fieldKey: 'PREV_NEW' },
      scoreRules: [{ id: 'r-new', label: '新档', score: 0.3 }],
    };
    const added = preventionIndicator('p2', 'PREV_ADDED', 0.5);
    const copied = refreshArchitectureConfigForNewVersion(source, [edited, added]);

    expect(copied.status).toBe('draft');
    expect(copied.indicatorDefinitions?.p1.survey.fieldKey).toBe('PREV_NEW');
    expect(copied.indicatorStates.p1).toEqual(source.indicatorStates.p1);
    expect(copied.indicatorStates.p2.enabled).toBe(false);
    expect(hasArchitectureCopyBaselineChange(source, copied)).toBe(true);
  });

  it('切换评价版本按易涝点幂等生成待复核普查，且不改写历史填报或评级', () => {
    const indicators = [
      scoreableVersionIndicator('hazard', 'HAZARD', ['GLOBAL']),
      scoreableVersionIndicator('bearing', 'BEARING', ['GLOBAL']),
      scoreableVersionIndicator('p1', 'PREVENTION', ['GLOBAL']),
      scoreableVersionIndicator('formation-sunken', 'FORMATION', ['SUNKEN']),
      scoreableVersionIndicator('formation-tunnel', 'FORMATION', ['TUNNEL']),
      scoreableVersionIndicator('formation-underground', 'FORMATION', ['UNDERGROUND']),
      scoreableVersionIndicator('formation-low-lying', 'FORMATION', ['LOW_LYING']),
    ];
    const targetConfig = {
      ...buildArchitectureSnapshot(indicators, cloneLevel1Weights()),
      status: 'completed' as const,
    };
    const sourceArchitecture = stubRecord({
      id: 'arch-v1',
      versionNo: 'V001',
      configAt: '2026-01-01 00:00:00',
      activeForRating: true,
      config: targetConfig,
    });
    const targetArchitecture = stubRecord({
      id: 'arch-v2',
      versionNo: 'V002',
      configAt: '2026-02-01 00:00:00',
      config: { ...targetConfig, status: 'completed' },
    });
    const sourcePoint: WaterloggingPointRow = {
      id: 'survey-old',
      registryId: 'registry-1',
      pointCode: 'DQ-001',
      name: '测试点',
      pointType: 'SUNKEN',
      townCode: '330521',
      address: '测试地址',
      surveyStatus: 'completed',
      surveyPayload: {
        appendixB: { areaImportance: 'COUNTY_GENERAL', hasMonitoring: true, hasEmergencyPlan: true },
        indicatorValues: { PREV_A: '档A' },
      },
      assessmentStatus: 'completed',
      assessmentPayload: { items: { p1: { ruleId: 'r1' } } },
      ratingStatus: 'completed',
      ratingResult: {
        v: 0.8,
        v1: 0.8,
        v2: 0.8,
        v3: 0.8,
        v4: 0.8,
        levelCode: 'HIGH',
        levelName: '高',
        color: 'red',
        selectedRuleIds: { p1: 'r1' },
        coverage: { filled: 1, applicable: 1, percent: 100 },
        ratedAt: '2026-02-02 00:00:00',
        partial: false,
      },
      surveyAt: '2026-02-02 00:00:00',
      activeForRating: true,
      surveyArchitectureRefId: 'arch-v1',
      surveyArchitectureRefAt: '2026-01-01 00:00:00',
      surveyArchitectureVersionNo: 'V001',
    };

    expect(getArchitectureRatingReferenceIssue(targetArchitecture)).toBeNull();

    const plan = buildArchitectureActivationRegenerationPlan(
      [sourceArchitecture, targetArchitecture],
      [sourcePoint],
      targetArchitecture.id,
      '2026-03-01 09:00:00',
    );
    expect(plan).not.toBeNull();
    expect(plan!.generatedCount).toBe(1);
    expect(plan!.nextArchitectureRecords.find(r => r.id === 'arch-v1')?.activeForRating).toBe(false);
    expect(plan!.nextArchitectureRecords.find(r => r.id === 'arch-v2')?.activeForRating).toBe(true);
    const regenerated = plan!.nextPoints.find(point => point.surveyArchitectureRefId === 'arch-v2');
    expect(regenerated).toMatchObject({
      registryId: 'registry-1',
      surveyStatus: 'draft',
      assessmentStatus: 'draft',
      ratingStatus: 'none',
      activeForRating: false,
      surveyArchitectureVersionNo: 'V002',
      surveyAt: '2026-03-01 09:00:00',
    });
    expect(regenerated?.ratingResult).toBeUndefined();
    expect(regenerated?.surveyPayload).toEqual(sourcePoint.surveyPayload);
    expect(regenerated?.surveyPayload).not.toBe(sourcePoint.surveyPayload);
    expect(sourcePoint.ratingStatus).toBe('completed');
    expect(sourcePoint.activeForRating).toBe(true);

    const retried = buildArchitectureActivationRegenerationPlan(
      plan!.nextArchitectureRecords,
      plan!.nextPoints,
      targetArchitecture.id,
      '2026-03-02 09:00:00',
    );
    expect(retried?.generatedCount).toBe(0);
    expect(retried?.existingCount).toBe(1);
    expect(retried?.nextPoints).toHaveLength(2);
  });

  it('createRiskChangeLogEntry 写入 architectureVersionNo', () => {
    const point: WaterloggingPointRow = {
      id: 'pt-1',
      registryId: 'reg-1',
      pointCode: 'P001',
      name: '测试点',
      pointType: 'SUNKEN',
      townCode: '330521',
      address: '',
      lng: 0,
      lat: 0,
      surveyPayload: { indicatorValues: {}, appendixB: {} },
      surveyStatus: 'completed',
      assessmentStatus: 'none',
      assessmentPayload: { items: {} },
      ratingStatus: 'completed',
      ratingResult: {
        levelCode: 'medium',
        levelName: '中',
        color: 'orange',
        v: 0.5,
        v1: 0.5,
        v2: 0.5,
        v3: 0.5,
        v4: 0.5,
        partial: false,
        ratedAt: '2026-06-01 10:00:00',
        architectureRefAt: '2026-05-01 09:00:00',
        architectureVersionNo: 'V002',
      },
      collectedAt: '2026-06-01 10:00:00',
      surveyAt: '2026-06-01 10:00:00',
    };
    const log = createRiskChangeLogEntry(point)!;
    expect(log.architectureVersionNo).toBe('V002');
    expect(log.architectureRefAt).toBe('2026-05-01 09:00:00');
  });

  it('防灾减灾 V₄ 按记录绑定架构 merge 后计算', () => {
    const base = [preventionIndicator('p1', 'PREV_A', 0.8), preventionIndicator('p2', 'PREV_B', 0.2)];
    const archV1: IndicatorArchitectureRecord = {
      id: 'arch-v1',
      versionNo: 'V001',
      configAt: '2026-01-01',
      label: '',
      activeForRating: false,
      config: {
        ...emptyIndicatorArchitectureConfig(),
        status: 'completed',
        indicatorStates: {
          p1: { weight: 1, enabled: true },
          p2: { weight: 0, enabled: false },
        },
      },
    };
    const archV2: IndicatorArchitectureRecord = {
      id: 'arch-v2',
      versionNo: 'V002',
      configAt: '2026-02-01',
      label: '',
      activeForRating: true,
      config: {
        ...emptyIndicatorArchitectureConfig(),
        status: 'completed',
        indicatorStates: {
          p1: { weight: 0.5, enabled: true },
          p2: { weight: 0.5, enabled: true },
        },
      },
    };
    const recordV1: RegionalPreventionRecord = {
      ...emptyRegionalPreventionRecord(),
      id: 'rp-1',
      configAt: '2026-03-01',
      architectureRefId: 'arch-v1',
      architectureVersionNo: 'V001',
      config: {
        ...emptyRegionalPreventionRecord().config,
        assessmentStatus: 'completed',
        indicatorValues: { PREV_A: '档A', PREV_B: '档A' },
      },
    };
    const mergedV1 = mergeIndicatorsForArchitectureRecord(base, archV1);
    const mergedV2 = mergeIndicatorsForArchitectureRecord(base, archV2);
    const summaryV1 = summarizeRegionalPreventionRecord(mergedV1, recordV1);
    const summaryV2 = summarizeRegionalPreventionRecord(mergedV2, recordV1);
    expect(summaryV1.v4).not.toBeNull();
    expect(summaryV2.v4).not.toBeNull();
    expect(summaryV1.v4).not.toEqual(summaryV2.v4);
  });
});
