import type { SurveyPointType } from './types';

/** 四种易涝点类型共用的附录 B「历史灾情」数值字段 key（与 appendixBConditionFields 保持一致） */
const COMMON_APPENDIX_NUMERIC_KEYS = new Set([
  'historicalDeathCount',
  'historicalSeriousInjuryCount',
  'historicalTrappedCount',
  'historicalDirectEconomicLossWan',
]);

/** 下凹立交附录 B 固定数值专用项 */
const SUNKEN_APPENDIX_B_NUMERIC_KEYS = new Set([
  'elevationM',
  'sunkenDepthCm',
  'catchmentAreaM2',
]);

/** 地下空间附录 B 固定数值专用项（与 compositePartFieldBinding 一致） */
export const UNDERGROUND_APPENDIX_B_NUMERIC_KEYS = new Set([
  'pedestrianEntranceElevationDiffM',
  'vehicleEntranceElevationDiffM',
]);

/** 城市低洼路段附录 B 固定数值专用项 */
export const LOW_LYING_APPENDIX_B_NUMERIC_KEYS = new Set(['roadLongitudinalSlope']);

/** 普查点型下该附录 B 字段是否应展示/计分/同步 */
export function appendixBFieldCollectableAtPointType(
  fieldKey: string,
  pointType: SurveyPointType,
): boolean {
  const key = fieldKey?.trim();
  if (!key) return false;
  if (COMMON_APPENDIX_NUMERIC_KEYS.has(key)) return true;
  if (pointType === 'SUNKEN' && SUNKEN_APPENDIX_B_NUMERIC_KEYS.has(key)) return true;
  if (pointType === 'UNDERGROUND' && UNDERGROUND_APPENDIX_B_NUMERIC_KEYS.has(key)) return true;
  if (pointType === 'LOW_LYING' && LOW_LYING_APPENDIX_B_NUMERIC_KEYS.has(key)) return true;
  return false;
}

export { filterCompositePartsForPointType } from './compositePartSource';
