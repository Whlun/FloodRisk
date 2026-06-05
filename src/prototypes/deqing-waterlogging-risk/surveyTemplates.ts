import type { IndicatorAppendixBTierBand } from './types';

/** 表 5.3.7 人行出入口默认分档（配置表单「填入模板」用，非运行时硬编码） */
export const TEMPLATE_PEDESTRIAN_ENTRANCE_TIER_BANDS: IndicatorAppendixBTierBand[] = [
  { riskTier: '低', score: 0.2, match: { kind: 'gt', value: 0.45 } },
  {
    riskTier: '中',
    score: 0.6,
    match: { kind: 'between', min: 0.3, max: 0.45, minInclusive: true, maxInclusive: true },
  },
  { riskTier: '高', score: 1, match: { kind: 'lt', value: 0.3 } },
];

/** 表 5.3.7 车行出入口默认分档 */
export const TEMPLATE_VEHICLE_ENTRANCE_TIER_BANDS: IndicatorAppendixBTierBand[] = [
  { riskTier: '低', score: 0.2, match: { kind: 'gt', value: 0.3 } },
  {
    riskTier: '中',
    score: 0.6,
    match: { kind: 'between', min: 0.15, max: 0.3, minInclusive: true, maxInclusive: true },
  },
  { riskTier: '高', score: 1, match: { kind: 'lt', value: 0.15 } },
];

export const DEFAULT_COMPOSITE_NUMERIC_RANGE = {
  min: 0,
  max: 3,
  step: 0.01,
  precision: 2,
  rangeLabel: '合理范围 0～3 m',
  hint: '按本子项分档表判定低/中/高风险。',
};

/** 表 5.3.7 出入口高程差：附录 B 普查项键 */
export const GUIDELINE_537_PEDESTRIAN_APPENDIX_KEY = 'pedestrianEntranceElevationDiffM';
export const GUIDELINE_537_VEHICLE_APPENDIX_KEY = 'vehicleEntranceElevationDiffM';

/** 表 5.4.3 历史灾情 — 人员死亡（人）子项分档（先命中先生效，从高到低排列） */
export const TEMPLATE_HISTORICAL_DEATH_TIER_BANDS: IndicatorAppendixBTierBand[] = [
  { riskTier: '伤亡≥5人', score: 1, match: { kind: 'gte', value: 5 } },
  {
    riskTier: '3≤伤亡<5人',
    score: 0.8,
    match: { kind: 'between', min: 3, max: 4, minInclusive: true, maxInclusive: true },
  },
  {
    riskTier: '1≤伤亡<3人',
    score: 0.6,
    match: { kind: 'between', min: 1, max: 2, minInclusive: true, maxInclusive: true },
  },
  {
    riskTier: '无死亡',
    score: 0.2,
    match: { kind: 'eq', value: 0 },
  },
];

export const TEMPLATE_HISTORICAL_SERIOUS_INJURY_TIER_BANDS: IndicatorAppendixBTierBand[] = [
  { riskTier: '重伤≥30人', score: 1, match: { kind: 'gte', value: 30 } },
  {
    riskTier: '10≤重伤<30人',
    score: 0.8,
    match: { kind: 'between', min: 10, max: 29, minInclusive: true, maxInclusive: true },
  },
  {
    riskTier: '5≤重伤<10人',
    score: 0.6,
    match: { kind: 'between', min: 5, max: 9, minInclusive: true, maxInclusive: true },
  },
  {
    riskTier: '1≤重伤<5人',
    score: 0.4,
    match: { kind: 'between', min: 1, max: 4, minInclusive: true, maxInclusive: true },
  },
  {
    riskTier: '无重伤',
    score: 0.2,
    match: { kind: 'eq', value: 0 },
  },
];

export const TEMPLATE_HISTORICAL_TRAPPED_TIER_BANDS: IndicatorAppendixBTierBand[] = [
  { riskTier: '被困≥100人', score: 1, match: { kind: 'gte', value: 100 } },
  {
    riskTier: '50≤被困<100人',
    score: 0.8,
    match: { kind: 'between', min: 50, max: 99, minInclusive: true, maxInclusive: true },
  },
  {
    riskTier: '30≤被困<50人',
    score: 0.6,
    match: { kind: 'between', min: 30, max: 49, minInclusive: true, maxInclusive: true },
  },
  {
    riskTier: '10≤被困<30人',
    score: 0.4,
    match: { kind: 'between', min: 10, max: 29, minInclusive: true, maxInclusive: true },
  },
  {
    riskTier: '被困<10人',
    score: 0.2,
    match: { kind: 'between', min: 0, max: 9, minInclusive: true, maxInclusive: true },
  },
];

export const TEMPLATE_HISTORICAL_ECONOMIC_LOSS_TIER_BANDS: IndicatorAppendixBTierBand[] = [
  { riskTier: '损失≥10000万元', score: 1, match: { kind: 'gte', value: 10000 } },
  {
    riskTier: '5000≤损失<10000万元',
    score: 0.8,
    match: { kind: 'between', min: 5000, max: 9999, minInclusive: true, maxInclusive: true },
  },
  {
    riskTier: '1000≤损失<5000万元',
    score: 0.6,
    match: { kind: 'between', min: 1000, max: 4999, minInclusive: true, maxInclusive: true },
  },
  {
    riskTier: '100≤损失<1000万元',
    score: 0.4,
    match: { kind: 'between', min: 100, max: 999, minInclusive: true, maxInclusive: true },
  },
  {
    riskTier: '0<损失<100万元',
    score: 0.2,
    match: { kind: 'between', min: 0, max: 99, minInclusive: true, maxInclusive: true },
  },
];

export const GUIDELINE_HISTORICAL_DEATH_KEY = 'historicalDeathCount';
export const GUIDELINE_HISTORICAL_SERIOUS_INJURY_KEY = 'historicalSeriousInjuryCount';
export const GUIDELINE_HISTORICAL_TRAPPED_KEY = 'historicalTrappedCount';
export const GUIDELINE_HISTORICAL_ECONOMIC_KEY = 'historicalDirectEconomicLossWan';

/** 当前子项是否适用表 5.3.7 预置分档模板（仅地下空间出入口两项） */
export function resolveGuideline537TierBandTemplate(
  appendixBFieldKey?: string,
): 'pedestrian' | 'vehicle' | null {
  const key = appendixBFieldKey?.trim();
  if (key === GUIDELINE_537_PEDESTRIAN_APPENDIX_KEY) return 'pedestrian';
  if (key === GUIDELINE_537_VEHICLE_APPENDIX_KEY) return 'vehicle';
  return null;
}
