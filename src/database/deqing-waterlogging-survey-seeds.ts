/**
 * 内涝普查演示数据：附录 B 与「指标普查」字段对齐，保证完整度与表单展示一致。
 */
import type {
  AppendixBSurvey,
  SurveyPayload,
  SurveyPointType,
} from '../prototypes/deqing-waterlogging-risk/types';
import {
  APPENDIX_F_DRAIN_TYPE_LABELS,
  APPENDIX_F_INTERCEPT_LABELS,
  APPENDIX_F_UG_DESIGN_P_LABELS,
} from '../prototypes/deqing-waterlogging-risk/guidelineSeedBuilders';

/** 附录 B 共性字段（四种类型均需） */
function commonAppendixB(overrides: Partial<AppendixBSurvey> = {}): AppendixBSurvey {
  return {
    areaImportance: 'COUNTY_KEY',
    hasHistoricalDisaster: true,
    historicalDeathCount: 0,
    historicalSeriousInjuryCount: 0,
    historicalTrappedCount: 0,
    historicalDirectEconomicLossWan: 12.5,
    maxHistoricalDepthCm: 35,
    hasStorageTank: false,
    hasDrainagePump: true,
    pumpCapacityM3H: 120,
    hasMonitoring: true,
    alarmDeviceNormal: true,
    hasEmergencyPlan: true,
    collectorName: '王豪伦',
    collectorUnit: '德清县住建局',
    ...overrides,
  };
}

/** 下凹式：指标普查 10 项（致灾 3 + 孕灾 4 + 承灾 3） */
export function sunkenIndicatorValues(variant: 'current' | 'early' = 'current'): Record<string, string | number | boolean> {
  if (variant === 'early') {
    return {
      HZ_RAIN_ALERT_FREQ: 8,
      HZ_GUEST_WATER: false,
      HZ_BACKWATER: false,
      FM_SK_LONG_SLOPE: 5,
      FM_SK_DESIGN_P: 30,
      FM_SK_DRAIN_TYPE: '重力自排',
      FM_SK_INTERCEPT: APPENDIX_F_INTERCEPT_LABELS.fair,
      BR_AREA_IMPORTANCE: '其他行车道路、附近具有丙类民用建筑工程的区域',
      BR_ROAD_CLASS: '主干路',
      BR_HIST_LOSS: '较低',
    };
  }
  return {
    HZ_RAIN_ALERT_FREQ: 12,
    HZ_GUEST_WATER: false,
    HZ_BACKWATER: false,
    FM_SK_LONG_SLOPE: 6,
    FM_SK_DESIGN_P: 35,
    FM_SK_DRAIN_TYPE: '重力自排',
    FM_SK_INTERCEPT: APPENDIX_F_INTERCEPT_LABELS.fair,
    BR_AREA_IMPORTANCE: '交通干道、附近具有乙类民用建筑工程的区域',
    BR_ROAD_CLASS: '主干路',
    BR_HIST_LOSS: '较低',
  };
}

/** 隧道：指标普查 9 项 */
export function tunnelIndicatorValues(): Record<string, string | number | boolean> {
  return {
    HZ_RAIN_ALERT_FREQ: 10,
    HZ_GUEST_WATER: false,
    HZ_BACKWATER: false,
    FM_TN_LONG_SLOPE: 2,
    FM_TN_DRAIN_TYPE: '重力自排',
    FM_TN_INTERCEPT: APPENDIX_F_INTERCEPT_LABELS.fair,
    BR_AREA_IMPORTANCE: '其他区域',
    BR_ROAD_CLASS: '次干路',
    BR_HIST_LOSS: '无历史灾情',
  };
}

/** 地下空间：指标普查 10 项 */
export function undergroundIndicatorValues(): Record<string, string | number | boolean> {
  return {
    HZ_RAIN_ALERT_FREQ: 14,
    HZ_GUEST_WATER: false,
    HZ_BACKWATER: true,
    FM_UG_ENTRANCE_H_PED: 0.52,
    FM_UG_ENTRANCE_H_VEH: 0.52,
    FM_UG_DESIGN_P: APPENDIX_F_UG_DESIGN_P_LABELS.meet,
    FM_UG_DRAIN_TYPE: APPENDIX_F_DRAIN_TYPE_LABELS.pumpStorage,
    FM_UG_INTERCEPT: APPENDIX_F_INTERCEPT_LABELS.fair,
    BR_AREA_IMPORTANCE: '中心商业、附近具有甲类民用建筑工程的区域',
    BR_ROAD_CLASS: '次干路',
    BR_HIST_LOSS: '中',
  };
}

/** 低洼路段：指标普查项（纵坡 S 在附录 B「城市低洼路段专用信息」填报） */
export function lowLyingIndicatorValues(partial = false): Record<string, string | number | boolean> {
  if (partial) {
    return {
      HZ_RAIN_ALERT_FREQ: 6,
      FM_LL_RUNOFF_COEF: 0.52,
      FM_LL_COLLECT: '雨水收集设施收水能力达标',
    };
  }
  return {
    HZ_RAIN_ALERT_FREQ: 6,
    HZ_GUEST_WATER: false,
    HZ_BACKWATER: false,
    FM_LL_RUNOFF_COEF: 0.42,
    FM_LL_DESIGN_P: 8,
    FM_LL_COLLECT: '雨水收集设施收水能力达标',
    BR_AREA_IMPORTANCE: '其他区域',
    BR_ROAD_CLASS: '支路',
    BR_HIST_LOSS: '无历史灾情',
  };
}

export interface SurveySeedOptions {
  collectedAt: string;
  appendixOverrides?: Partial<AppendixBSurvey>;
  indicatorValues: Record<string, string | number | boolean>;
}

/** 组装 surveyPayload（附录 B + 指标普查） */
export function buildSurveyPayload(
  pointType: SurveyPointType,
  options: SurveySeedOptions,
): SurveyPayload {
  const { collectedAt, appendixOverrides = {}, indicatorValues } = options;
  const appendixBase = commonAppendixB({
    collectedAt,
    ...appendixOverrides,
  });

  if (pointType === 'SUNKEN') {
    return {
      appendixB: {
        ...appendixBase,
        elevationM: appendixOverrides.elevationM ?? 12.5,
        sunkenDepthCm: appendixOverrides.sunkenDepthCm ?? 85,
        catchmentAreaM2: appendixOverrides.catchmentAreaM2 ?? 8600,
        rainInletMeetsStandard: appendixOverrides.rainInletMeetsStandard ?? true,
      },
      indicatorValues,
    };
  }

  if (pointType === 'TUNNEL') {
    return {
      appendixB: {
        ...appendixBase,
        areaImportance: appendixOverrides.areaImportance ?? 'COUNTY_GENERAL',
        maxHistoricalDepthCm: appendixOverrides.maxHistoricalDepthCm ?? 22,
        hasDrainagePump: appendixOverrides.hasDrainagePump ?? false,
      },
      indicatorValues,
    };
  }

  if (pointType === 'UNDERGROUND') {
    const entranceH =
      appendixOverrides.pedestrianEntranceElevationDiffM ??
      (indicatorValues.FM_UG_ENTRANCE_H_PED as number | undefined) ??
      0.52;
    const vehicleH =
      appendixOverrides.vehicleEntranceElevationDiffM ??
      (indicatorValues.FM_UG_ENTRANCE_H_VEH as number | undefined) ??
      entranceH;
    return {
      appendixB: {
        ...appendixBase,
        pedestrianEntranceElevationDiffM: entranceH,
        vehicleEntranceElevationDiffM: vehicleH,
        maxHistoricalDepthCm: appendixOverrides.maxHistoricalDepthCm ?? 18,
        hasStorageTank: appendixOverrides.hasStorageTank ?? true,
        storageVolumeM3: appendixOverrides.storageVolumeM3 ?? 200,
      },
      indicatorValues: {
        ...indicatorValues,
        FM_UG_ENTRANCE_H_PED: entranceH,
        FM_UG_ENTRANCE_H_VEH: vehicleH,
      },
    };
  }

  // LOW_LYING
  const roadSlope =
    appendixOverrides.roadLongitudinalSlope ??
    (indicatorValues.FM_LL_COLLECT_SLOPE as number | undefined) ??
    (indicatorValues.FM_LL_COLLECT_COND as number | undefined) ??
    3.2;
  return {
    appendixB: {
      ...appendixBase,
      areaImportance: appendixOverrides.areaImportance ?? 'TOWN_GENERAL',
      hasHistoricalDisaster: appendixOverrides.hasHistoricalDisaster ?? false,
      maxHistoricalDepthCm: appendixOverrides.maxHistoricalDepthCm ?? 15,
      hasMonitoring: appendixOverrides.hasMonitoring ?? false,
      hasEmergencyPlan: appendixOverrides.hasEmergencyPlan ?? true,
      roadLongitudinalSlope: roadSlope,
    },
    indicatorValues,
  };
}
