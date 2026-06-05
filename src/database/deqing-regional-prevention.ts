import {
  emptyAssessmentPayload,
  emptyRegionalPreventionConfig,
  type RegionalPreventionRecord,
} from '../prototypes/deqing-waterlogging-risk/types';
import { initialRiskIndicators } from './deqing-waterlogging-risk-indicators';
import { enrichIndicatorSurvey } from '../prototypes/deqing-waterlogging-risk/indicatorSurveyUtils';
import { buildNormalizedBaseline } from '../prototypes/deqing-waterlogging-risk/indicatorNormalize';
import { seedAssessmentItemsFromRegionalValues } from '../prototypes/deqing-waterlogging-risk/assessmentSeed';

const indicators = buildNormalizedBaseline(initialRiskIndicators).map(enrichIndicatorSurvey);

const values2025 = {
  PR_EMERGENCY_PLAN: '三级预案完善+单点预案',
  PR_WARNING_SYSTEM: '物联网监测+水位尺+警示标志',
  PR_INFO_CHANNEL: '权威平台且及时通畅',
  PR_MATERIAL_RESERVE: '储备充足',
  PR_PUMP_CAPACITY: 42,
  PR_RESPONSE_6H: 88,
  PR_DISPOSE_2H: 85,
};

const values2026 = {
  PR_EMERGENCY_PLAN: '三级预案完善+单点预案',
  PR_WARNING_SYSTEM: '物联网监测+水位尺+警示标志',
  PR_INFO_CHANNEL: '权威平台且及时通畅',
  PR_MATERIAL_RESERVE: '储备充足',
  PR_PUMP_CAPACITY: 45,
  PR_RESPONSE_6H: 92,
  PR_DISPOSE_2H: 88,
};

function buildRecord(
  id: string,
  configAt: string,
  label: string,
  activeForRating: boolean,
  indicatorValues: Record<string, string | number | boolean | null>,
  updatedBy: string,
): RegionalPreventionRecord {
  return {
    id,
    configAt,
    label,
    activeForRating,
    config: {
      indicatorValues,
      assessmentStatus: 'completed',
      assessmentPayload: {
        ...emptyAssessmentPayload(),
        assessor: updatedBy,
        assessorUnit: '德清县住建局',
        assessedAt: configAt,
        conclusion: '全县防灾减灾能力普查与认定，供各易涝点定级共用 V₄。',
        hasAssessmentSheet: true,
        hasSitePhotos: false,
        hasElevationMap: false,
        items: seedAssessmentItemsFromRegionalValues(indicatorValues, indicators),
      },
      updatedAt: configAt,
      updatedBy,
    },
  };
}

/** 按时间维度维护的全县防灾减灾配置（演示 2 条） */
export const initialRegionalPreventionRecords: RegionalPreventionRecord[] = [
  buildRecord(
    'rp-2025',
    '2025-12-01 10:00:00',
    '2025 年度普查',
    false,
    values2025,
    '王豪伦',
  ),
  buildRecord(
    'rp-2026',
    '2026-05-19 09:00:00',
    '2026 年上半年更新',
    true,
    values2026,
    '王豪伦',
  ),
];

/** 兼容：定级等逻辑取当前引用配置 */
export const initialRegionalPrevention =
  initialRegionalPreventionRecords.find(r => r.activeForRating)?.config ??
  initialRegionalPreventionRecords[0]?.config ??
  emptyRegionalPreventionConfig();
