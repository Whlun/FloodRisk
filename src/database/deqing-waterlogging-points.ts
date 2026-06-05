import {
  emptyAssessmentPayload,
  emptySurveyPayload,
  LEVEL1_DEFAULT_WEIGHT,
  type HazardAssessmentPayload,
  type SurveyPayload,
  type SurveyPointType,
  type WaterloggingPointRow,
} from '../prototypes/deqing-waterlogging-risk/types';
import {
  initialIndicatorRiskLevels,
  initialRiskIndicators,
} from './deqing-waterlogging-risk-indicators';
import { enrichIndicatorSurvey } from '../prototypes/deqing-waterlogging-risk/indicatorSurveyUtils';
import { buildNormalizedBaseline } from '../prototypes/deqing-waterlogging-risk/indicatorNormalize';
import { seedAssessmentItemsFromSurvey } from '../prototypes/deqing-waterlogging-risk/assessmentSeed';
import { buildRatedSurveyRecord } from '../prototypes/deqing-waterlogging-risk/surveyRatingUtils';
import { initialRegionalPrevention } from './deqing-regional-prevention';
import {
  buildSurveyPayload,
  lowLyingIndicatorValues,
  sunkenIndicatorValues,
  tunnelIndicatorValues,
  undergroundIndicatorValues,
} from './deqing-waterlogging-survey-seeds';

const indicators = buildNormalizedBaseline(initialRiskIndicators).map(enrichIndicatorSurvey);

const ratingCtx = {
  indicators,
  indicatorLevels: initialIndicatorRiskLevels,
  level1Weights: LEVEL1_DEFAULT_WEIGHT,
  regionalPrevention: initialRegionalPrevention,
};

function buildDemoAssessment(
  pointType: SurveyPointType,
  surveyPayload: SurveyPayload,
): HazardAssessmentPayload {
  return {
    ...emptyAssessmentPayload(),
    assessor: '王豪伦',
    assessorUnit: '德清县住建局',
    assessedAt: surveyPayload.appendixB.collectedAt ?? '2026-05-19 16:00:00',
    conclusion: '现场核查与普查数据一致，按认定赋分档参与定级。',
    hasAssessmentSheet: true,
    hasSitePhotos: true,
    hasElevationMap: false,
    items: seedAssessmentItemsFromSurvey(pointType, surveyPayload, indicators),
  };
}

/** 普查已完成且写入定级结果（与试算逻辑一致） */
function asRatedSurveyRow(row: WaterloggingPointRow): WaterloggingPointRow {
  const rated = buildRatedSurveyRecord(row, ratingCtx);
  return rated ?? row;
}

const pt001Survey = buildSurveyPayload('SUNKEN', {
  collectedAt: '2026-05-18 10:00:00',
  indicatorValues: sunkenIndicatorValues('current'),
});

const pt001SurveyEarly = buildSurveyPayload('SUNKEN', {
  collectedAt: '2026-04-10 09:00:00',
  appendixOverrides: {
    maxHistoricalDepthCm: 28,
    sunkenDepthCm: 80,
    catchmentAreaM2: 8200,
  },
  indicatorValues: sunkenIndicatorValues('early'),
});

const pt002Survey = buildSurveyPayload('TUNNEL', {
  collectedAt: '2026-05-19 14:30:00',
  indicatorValues: tunnelIndicatorValues(),
});

const pt003Survey = buildSurveyPayload('UNDERGROUND', {
  collectedAt: '2026-05-20 09:00:00',
  indicatorValues: undergroundIndicatorValues(),
});

const pt004SurveyPartial = buildSurveyPayload('LOW_LYING', {
  collectedAt: '2026-05-19 11:00:00',
  appendixOverrides: {
    areaImportance: 'TOWN_GENERAL',
    hasHistoricalDisaster: false,
    maxHistoricalDepthCm: 15,
    hasMonitoring: false,
    hasDrainagePump: false,
    roadLongitudinalSlope: 4.5,
    collectorName: undefined,
    collectorUnit: undefined,
  },
  indicatorValues: lowLyingIndicatorValues(true),
});

const basePoints: WaterloggingPointRow[] = [
  {
    id: 'pt-001',
    registryId: 'reg-001',
    pointCode: 'NL-DEQ-SK-001',
    name: '武康路与千秋街下凹立交',
    pointType: 'SUNKEN',
    townCode: '330521001',
    address: '德清县武康街道武康路与千秋街交叉口',
    lng: 120.0521,
    lat: 30.5412,
    surveyStatus: 'completed',
    surveyPayload: pt001Survey,
    assessmentStatus: 'completed',
    assessmentPayload: buildDemoAssessment('SUNKEN', pt001Survey),
    ratingStatus: 'none',
    collector: '王豪伦',
    collectedAt: '2026-05-18 10:00:00',
    surveyAt: '2026-05-18 10:00:00',
    label: '汛后复核',
    activeForRating: true,
  },
  {
    id: 'pt-001-hist',
    registryId: 'reg-001',
    pointCode: 'NL-DEQ-SK-001',
    name: '武康路与千秋街下凹立交',
    pointType: 'SUNKEN',
    townCode: '330521001',
    address: '德清县武康街道武康路与千秋街交叉口',
    lng: 120.0521,
    lat: 30.5412,
    surveyStatus: 'completed',
    surveyPayload: pt001SurveyEarly,
    assessmentStatus: 'completed',
    assessmentPayload: buildDemoAssessment('SUNKEN', pt001SurveyEarly),
    ratingStatus: 'none',
    collector: '王豪伦',
    collectedAt: '2026-04-10 09:00:00',
    surveyAt: '2026-04-10 09:00:00',
    label: '汛前普查',
    activeForRating: false,
  },
  {
    id: 'pt-002',
    registryId: 'reg-002',
    pointCode: 'NL-DEQ-TN-001',
    name: '乾元镇东郊路隧道',
    pointType: 'TUNNEL',
    townCode: '330521003',
    address: '德清县乾元镇东郊路隧道',
    lng: 120.0612,
    lat: 30.5288,
    surveyStatus: 'completed',
    surveyPayload: pt002Survey,
    assessmentStatus: 'completed',
    assessmentPayload: buildDemoAssessment('TUNNEL', pt002Survey),
    ratingStatus: 'none',
    collector: '王豪伦',
    collectedAt: '2026-05-19 14:30:00',
    surveyAt: '2026-05-19 14:30:00',
    activeForRating: true,
  },
  {
    id: 'pt-003',
    registryId: 'reg-003',
    pointCode: 'NL-DEQ-UG-001',
    name: '银泰城地下停车场',
    pointType: 'UNDERGROUND',
    townCode: '330521001',
    address: '德清县武康街道游子街银泰城',
    lng: 120.0488,
    lat: 30.5365,
    surveyStatus: 'completed',
    surveyPayload: pt003Survey,
    assessmentStatus: 'completed',
    assessmentPayload: buildDemoAssessment('UNDERGROUND', pt003Survey),
    ratingStatus: 'none',
    collector: '王豪伦',
    collectedAt: '2026-05-20 09:00:00',
    surveyAt: '2026-05-20 09:00:00',
    label: '地下空间专项',
    activeForRating: true,
  },
  {
    id: 'pt-004',
    registryId: 'reg-004',
    pointCode: 'NL-DEQ-LL-001',
    name: '新市镇永安街低洼段',
    pointType: 'LOW_LYING',
    townCode: '330521004',
    address: '德清县新市镇永安街中段',
    lng: 120.072,
    lat: 30.515,
    surveyStatus: 'draft',
    surveyPayload: pt004SurveyPartial,
    assessmentStatus: 'none',
    assessmentPayload: emptyAssessmentPayload(),
    ratingStatus: 'none',
    surveyAt: '2026-05-19 11:00:00',
    label: '填报中',
    activeForRating: false,
  },
];

/** 演示：已完成普查且已定级的记录（定级结果由同一套试算逻辑生成） */
function withDemoRatings(rows: WaterloggingPointRow[]): WaterloggingPointRow[] {
  const ratedAtById: Record<string, string> = {
    'pt-001-hist': '2026-04-10 10:05:00',
    'pt-001': '2026-05-18 11:30:00',
    'pt-002': '2026-05-19 15:20:00',
  };

  return rows.map(row => {
    if (row.surveyStatus !== 'completed' || row.id === 'pt-003') return row;
    const rated = asRatedSurveyRow(row);
    if (!rated.ratingResult) return row;
    const ratedAt = ratedAtById[row.id];
    if (!ratedAt) return rated;
    return {
      ...rated,
      ratingResult: { ...rated.ratingResult, ratedAt },
    };
  });
}

export const initialWaterloggingPoints: WaterloggingPointRow[] = withDemoRatings(basePoints);
