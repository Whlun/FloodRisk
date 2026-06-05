import { getHazardPointTypeSelectOptions } from './hazardPointTypeSelect';
import { type HazardPointType, type Level1Factor } from './types';

/** 孕灾因子按类型分子集；其余一级因子全县通用 */
export function isFormationLevel1(level1: Level1Factor): boolean {
  return level1 === 'FORMATION';
}

export function getApplicableTypesHint(level1: Level1Factor | undefined): string | undefined {
  if (!level1) return undefined;
  if (isFormationLevel1(level1)) {
    return '孕灾因子仅对所选隐患点类型生效；每条指标请指定一种类型（与系统孕灾因子子集一致）。';
  }
  return '致灾、承灾、防灾减灾因子为全县通用指标，固定为「通用（非孕灾专用）」，对所有隐患点类型均参与计算与定级。';
}

export function getFormationTypeSelectOptions() {
  return getHazardPointTypeSelectOptions();
}

/** 保存前规范化：非孕灾仅保留 GLOBAL；孕灾去掉 GLOBAL 并至少保留一种具体类型 */
export function normalizeApplicableTypes(
  level1: Level1Factor,
  types: HazardPointType[] | undefined,
): HazardPointType[] {
  if (isFormationLevel1(level1)) {
    const specific = (types ?? []).filter((t): t is HazardPointType => t !== 'GLOBAL');
    return specific.length > 0 ? specific : ['SUNKEN'];
  }
  return ['GLOBAL'];
}

/** 切换一级因子时重置适用类型 */
export function defaultApplicableTypesForLevel1(level1: Level1Factor): HazardPointType[] {
  if (isFormationLevel1(level1)) {
    return ['SUNKEN'];
  }
  return ['GLOBAL'];
}

/** 孕灾表单展示：取首个具体类型 */
export function formationTypeFromApplicable(types: HazardPointType[] | undefined): HazardPointType {
  return types?.find(t => t !== 'GLOBAL') ?? 'SUNKEN';
}
