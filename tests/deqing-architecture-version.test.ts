import { describe, expect, it } from 'vitest';
import {
  ensureArchitectureVersionNos,
  mergeIndicatorsForArchitectureRecord,
  nextArchitectureVersionNo,
  parseArchitectureVersionNo,
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

describe('逐条绑定指标架构版本', () => {
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
