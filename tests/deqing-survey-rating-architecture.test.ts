import { describe, expect, it } from 'vitest';
import { initialIndicatorRiskLevels } from '../src/database/deqing-waterlogging-risk-indicators';
import {
  calcSurveyCoverage,
  getArchitectureScopedSurveyIndicatorsForFill,
  getPointSurveyIndicatorsForScoring,
  isPointSurveyComplete,
} from '../src/prototypes/deqing-waterlogging-risk/indicatorSurveyUtils';
import { buildRatedSurveyRecord } from '../src/prototypes/deqing-waterlogging-risk/surveyRatingUtils';
import {
  cloneLevel1Weights,
  emptyAssessmentPayload,
  emptySurveyPayload,
  type IndicatorArchitectureRecord,
  type RiskIndicatorRow,
  type WaterloggingPointRow,
} from '../src/prototypes/deqing-waterlogging-risk/types';

function stubIndicator(
  partial: Partial<RiskIndicatorRow> & Pick<RiskIndicatorRow, 'id' | 'code' | 'name'>,
): RiskIndicatorRow {
  return {
    level1: 'HAZARD',
    applicableTypes: ['GLOBAL'],
    weight: 0.2,
    valueType: 'enum',
    enabled: true,
    scoreRules: [{ id: 'r1', label: '档A', score: 0.2 }],
    updatedAt: '',
    survey: {
      collectInSurvey: true,
      surveyRequired: true,
      fieldKey: partial.code,
    },
    ...partial,
  } as RiskIndicatorRow;
}

function buildDefinitionAndRating(count: number, enabledCount: number) {
  const definitionIndicators = Array.from({ length: count }, (_, i) =>
    stubIndicator({
      id: `ind-${i}`,
      code: `HZ_T${String(i).padStart(3, '0')}`,
      name: `测试指标${i}`,
    }),
  );
  const ratingIndicators = definitionIndicators.map((ind, i) => ({
    ...ind,
    enabled: i < enabledCount,
    weight: i < enabledCount ? 1 / enabledCount : 0,
  }));
  return { definitionIndicators, ratingIndicators };
}

describe('普查与定级指标引用', () => {
  const pointType = 'LOW_LYING_ROAD' as const;
  const archScope = { architectureScoped: true } as const;

  it('架构仅启用 5 项时，普查完整度与计分均按 5 项统计', () => {
    const { ratingIndicators } = buildDefinitionAndRating(10, 5);
    const enabledValues = Object.fromEntries(
      ratingIndicators.filter(i => i.enabled).map(ind => [ind.survey!.fieldKey, '档A']),
    );

    const coverage = calcSurveyCoverage(ratingIndicators, pointType, enabledValues, archScope);
    expect(coverage.applicable).toBe(5);
    expect(coverage.percent).toBe(100);
    expect(isPointSurveyComplete(ratingIndicators, pointType, enabledValues, archScope)).toBe(true);

    expect(getPointSurveyIndicatorsForScoring(ratingIndicators, pointType)).toHaveLength(5);
    expect(getArchitectureScopedSurveyIndicatorsForFill(ratingIndicators, pointType)).toHaveLength(5);
  });

  it('buildRatedSurveyRecord 写入 architectureRefId/At 与 preventionRefAt', () => {
    const { definitionIndicators, ratingIndicators } = buildDefinitionAndRating(5, 5);
    const values = Object.fromEntries(
      ratingIndicators.map(ind => [ind.survey!.fieldKey, '档A']),
    );
    const activeArchitectureRecord: IndicatorArchitectureRecord = {
      id: 'arch-test-1',
      versionNo: 'V001',
      configAt: '2026-01-15 10:00:00',
      label: '2026 考核方案',
      activeForRating: true,
      config: {
        level1Weights: cloneLevel1Weights(),
        weightSource: 'appendix_e',
        indicatorStates: {},
        status: 'completed',
      },
    };
    const pt: WaterloggingPointRow = {
      id: 'pt-test',
      registryId: 'reg-1',
      pointCode: 'DQ-001',
      name: '测试易涝点',
      pointType,
      townCode: '330521',
      address: '测试地址',
      lng: 120,
      lat: 30,
      surveyStatus: 'completed',
      surveyAt: '2026-01-01 00:00:00',
      surveyPayload: { ...emptySurveyPayload(), indicatorValues: values },
      assessmentStatus: 'none',
      assessmentPayload: emptyAssessmentPayload(),
      ratingStatus: 'none',
      activeForRating: false,
      surveyArchitectureRefId: 'arch-test-1',
      surveyArchitectureRefAt: '2026-01-15 10:00:00',
    };

    const rated = buildRatedSurveyRecord(pt, {
      indicators: ratingIndicators,
      baseIndicators: definitionIndicators,
      architectureRecords: [activeArchitectureRecord],
      indicatorLevels: initialIndicatorRiskLevels,
      level1Weights: cloneLevel1Weights(),
      regionalPrevention: {
        indicatorValues: {},
        assessmentStatus: 'completed',
        assessmentPayload: emptyAssessmentPayload(),
      },
      activeArchitectureRecord,
      preventionRefAt: '2026-01-10 09:00:00',
    });

    expect(rated).not.toBeNull();
    expect(rated!.ratingResult?.architectureRefId).toBe('arch-test-1');
    expect(rated!.ratingResult?.architectureVersionNo).toBe('V001');
    expect(rated!.ratingResult?.architectureRefAt).toBe('2026-01-15 10:00:00');
    expect(rated!.ratingResult?.preventionRefAt).toBe('2026-01-10 09:00:00');
  });
});
