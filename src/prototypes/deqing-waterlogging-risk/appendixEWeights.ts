import type { HazardPointType, Level1Factor } from './types';

/** 附录 E 一级因子权重（表 5.6.1 / 层次分析法参考） */
export const APPENDIX_E_LEVEL1_WEIGHT: Record<Level1Factor, number> = {
  HAZARD: 0.258,
  FORMATION: 0.511,
  BEARING: 0.08,
  PREVENTION: 0.151,
};

/** 附录 E 二级指标权重：按指标编码 */
export const APPENDIX_E_INDICATOR_WEIGHT: Record<string, number> = {
  // 致灾
  HZ_RAIN_ALERT_FREQ: 0.164,
  HZ_GUEST_WATER: 0.539,
  HZ_BACKWATER: 0.297,
  // 下凹式
  FM_SK_LONG_SLOPE: 0.08,
  FM_SK_DESIGN_P: 0.476,
  FM_SK_DRAIN_TYPE: 0.176,
  FM_SK_INTERCEPT: 0.268,
  // 隧道
  FM_TN_LONG_SLOPE: 0.122,
  FM_TN_DRAIN_TYPE: 0.23,
  FM_TN_INTERCEPT: 0.648,
  // 地下空间
  FM_UG_ENTRANCE_H: 0.128,
  FM_UG_DESIGN_P: 0.532,
  FM_UG_DRAIN_TYPE: 0.083,
  FM_UG_INTERCEPT: 0.257,
  // 城市低洼路段（无独立纵坡度）
  FM_LL_RUNOFF_COEF: 0.077,
  FM_LL_DESIGN_P: 0.615,
  FM_LL_COLLECT: 0.308,
  // 承灾
  BR_AREA_IMPORTANCE: 0.243,
  BR_ROAD_CLASS: 0.088,
  BR_HIST_LOSS: 0.669,
  // 防灾减灾
  PR_EMERGENCY_PLAN: 0.042,
  PR_WARNING_SYSTEM: 0.09,
  PR_INFO_CHANNEL: 0.026,
  PR_MATERIAL_RESERVE: 0.207,
  PR_PUMP_CAPACITY: 0.362,
  PR_RESPONSE_6H: 0.125,
  PR_DISPOSE_2H: 0.148,
};

/** 附录 E 各孕灾易涝点类型应出现的指标编码（顺序与导则表一致） */
export const APPENDIX_E_FORMATION_CODES: Record<HazardPointType, string[]> = {
  SUNKEN: ['FM_SK_LONG_SLOPE', 'FM_SK_DESIGN_P', 'FM_SK_DRAIN_TYPE', 'FM_SK_INTERCEPT'],
  TUNNEL: ['FM_TN_LONG_SLOPE', 'FM_TN_DRAIN_TYPE', 'FM_TN_INTERCEPT'],
  UNDERGROUND: ['FM_UG_ENTRANCE_H', 'FM_UG_DESIGN_P', 'FM_UG_DRAIN_TYPE', 'FM_UG_INTERCEPT'],
  LOW_LYING: ['FM_LL_RUNOFF_COEF', 'FM_LL_DESIGN_P', 'FM_LL_COLLECT'],
};

/** 曾误配的指标（须从架构图/预置中剔除） */
export const REMOVED_GUIDELINE_INDICATOR_CODES = ['FM_LL_LONG_SLOPE'] as const;
