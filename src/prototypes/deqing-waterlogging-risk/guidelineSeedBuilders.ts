import type { ScoreRule } from './types';

/** 附录 F：排水系统类型三档 label */
export const APPENDIX_F_DRAIN_TYPE_LABELS = {
  gravity: '重力自排',
  pumpStorage: '泵站提升与调蓄结合的非重力自排',
  pumpOnly: '仅泵站提升的非重力自排',
} as const;

/** 附录 F：外截内排措施三档 label */
export const APPENDIX_F_INTERCEPT_LABELS = {
  good: '外截内排措施完善',
  fair: '外截内排措施较完善',
  poor: '外截内排措施不足',
} as const;

/** 附录 F：地下空间排水系统设计重现期（表 5.3.8） */
export const APPENDIX_F_UG_DESIGN_P_LABELS = {
  meet: '满足设计标准',
  notMeet: '不满足设计标准',
} as const;

/** 附录 F：雨水收集设施收水能力（S≤7% 分支） */
export const APPENDIX_F_LL_COLLECT_SLOPE_LE_LABELS = {
  ok: '雨水收集设施收水能力达标',
  bad: '雨水收集设施收水能力不足',
} as const;

/** 附录 F：雨水收集设施收水能力（S>7% 分支） */
export const APPENDIX_F_LL_COLLECT_SLOPE_GT_LABELS = {
  surplus: '雨水收集设施收水能力富余，可应对瞬时高峰值流量',
  insufficient: '雨水收集设施收水能力无法应对瞬时高峰值流量',
} as const;

/** 附录 F 标准三档 enum 赋分（0.2 / 0.6 / 1） */
export function appendixFThreeTierRules(
  labels: [string, string, string],
  riskTiers: [string, string, string] = ['低', '中', '高'],
): Omit<ScoreRule, 'id'>[] {
  return [
    { label: labels[0], riskTier: riskTiers[0], score: 0.2 },
    { label: labels[1], riskTier: riskTiers[1], score: 0.6 },
    { label: labels[2], riskTier: riskTiers[2], score: 1 },
  ];
}

/** 附录 F 排水系统类型赋分档 */
export function appendixFDrainTypeRules(): Omit<ScoreRule, 'id'>[] {
  return appendixFThreeTierRules([
    APPENDIX_F_DRAIN_TYPE_LABELS.gravity,
    APPENDIX_F_DRAIN_TYPE_LABELS.pumpStorage,
    APPENDIX_F_DRAIN_TYPE_LABELS.pumpOnly,
  ]);
}

/** 附录 F 外截内排措施赋分档 */
export function appendixFInterceptRules(): Omit<ScoreRule, 'id'>[] {
  return appendixFThreeTierRules([
    APPENDIX_F_INTERCEPT_LABELS.good,
    APPENDIX_F_INTERCEPT_LABELS.fair,
    APPENDIX_F_INTERCEPT_LABELS.poor,
  ]);
}
