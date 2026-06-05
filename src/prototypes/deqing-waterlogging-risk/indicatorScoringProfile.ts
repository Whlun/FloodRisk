import { COMPOSITE_SCORING_COPY } from './compositeScoringCopy';
import type { RiskIndicatorRow } from './types';
import { hasAuxiliaryConditionSurvey } from './compositeConditionalSurvey';
import { isDesignReturnPeriodCode } from './designReturnPeriod';

/** 指标赋分/填报形态（导则预置 vs 可自定义） */
export type IndicatorScoringProfile =
  | 'editable_enum'
  | 'editable_numeric'
  | 'editable_boolean'
  | 'design_period_by_area'
  | 'area_importance_enum'
  | 'auxiliary_then_select'
  | 'composite_appendix_numeric';

export interface IndicatorScoringLinkage {
  /** 定级/赋分须结合附录 B「地区重要程度」 */
  dependsOnAppendixBAreaImportance: boolean;
  /** 须先填辅助条件字段再选本分档（非独立二级指标） */
  dependsOnAuxiliaryCondition: boolean;
  /** 辅助条件字段展示名 */
  auxiliaryConditionLabel?: string;
}

export function getIndicatorScoringProfile(
  ind: Pick<RiskIndicatorRow, 'code' | 'valueType' | 'survey'> | undefined,
): IndicatorScoringProfile {
  if (!ind?.code) {
    return ind?.valueType === 'numeric'
      ? 'editable_numeric'
      : ind?.valueType === 'boolean'
        ? 'editable_boolean'
        : 'editable_enum';
  }
  if (isDesignReturnPeriodCode(ind.code)) return 'design_period_by_area';
  if (ind.code === 'BR_AREA_IMPORTANCE') return 'area_importance_enum';
  if (ind.survey?.inputVariant === 'composite_appendix_numeric') return 'composite_appendix_numeric';
  if (hasAuxiliaryConditionSurvey(ind)) return 'auxiliary_then_select';
  if (ind.valueType === 'numeric') return 'editable_numeric';
  if (ind.valueType === 'boolean') return 'editable_boolean';
  return 'editable_enum';
}

/** 是否「特殊赋分形态」（与指标来源无关） */
export function isSpecialScoringShape(profile: IndicatorScoringProfile): boolean {
  return (
    profile !== 'editable_enum' &&
    profile !== 'editable_numeric' &&
    profile !== 'editable_boolean' &&
    profile !== 'composite_appendix_numeric'
  );
}

/** 普查关联 Tab 是否展示填报形态下拉（与导则种子无关） */
export function canEditSurveyInputMode(_profile: IndicatorScoringProfile): boolean {
  return true;
}

/** 基本信息 Tab：普查填报方式展示文案 */
export function getSurveyInputModeLabel(
  profile: IndicatorScoringProfile,
  ind?: Pick<RiskIndicatorRow, 'name' | 'survey'>,
): string {
  switch (profile) {
    case 'design_period_by_area':
      return '数值 · 重现期 P（年）';
    case 'area_importance_enum':
      return '下拉分档 · 地区重要性（四档）';
    case 'composite_appendix_numeric':
      return '多数值子项 · 聚合赋分（内涝基本信息）';
    case 'auxiliary_then_select': {
      const auxLabel = ind?.survey?.auxiliaryCondition?.label ?? '条件指标';
      return `${auxLabel} + ${ind?.name ?? '分档选择'}`;
    }
    case 'editable_numeric':
      return '数值';
    case 'editable_boolean':
      return '是 / 否';
    default:
      return '下拉分档';
  }
}

export function getSurveyInputModeExtra(profile: IndicatorScoringProfile): string {
  if (profile === 'composite_appendix_numeric') {
    return COMPOSITE_SCORING_COPY.basicTabExtra;
  }
  if (isSpecialScoringShape(profile)) {
    return '本指标已预置标准配置；可在「赋分规则」Tab 切换赋分方式，在「普查关联」调整填报形态与字段映射。';
  }
  switch (profile) {
    case 'editable_numeric':
      return '风险普查填数字；赋分规则 Tab 配置 2～8 档区间（或依赖指标编码的预置区间逻辑）。';
    case 'editable_boolean':
      return '风险普查选「是/否」；赋分规则 Tab 固定 2 档（低/高）。';
    default:
      return '风险普查为下拉选项；赋分规则 Tab 中每档 label 即下拉文案。';
  }
}

export function getIndicatorScoringLinkage(
  profile: IndicatorScoringProfile,
  ind?: Pick<RiskIndicatorRow, 'survey'>,
): IndicatorScoringLinkage {
  return {
    dependsOnAppendixBAreaImportance: profile === 'design_period_by_area',
    dependsOnAuxiliaryCondition: profile === 'auxiliary_then_select',
    auxiliaryConditionLabel: ind?.survey?.auxiliaryCondition?.label,
  };
}

/** 是否显示「单位」表单项 */
export function shouldShowUnitField(
  profile: IndicatorScoringProfile,
  valueType?: RiskIndicatorRow['valueType'],
): boolean {
  if (profile === 'design_period_by_area') return true;
  if (profile === 'auxiliary_then_select' || profile === 'area_importance_enum') return false;
  return valueType === 'numeric';
}

export function getDefaultUnitForProfile(profile: IndicatorScoringProfile): string | undefined {
  if (profile === 'design_period_by_area') return '年';
  return undefined;
}

export function getRulesTabHint(
  profile: IndicatorScoringProfile,
  ind?: Pick<RiskIndicatorRow, 'remark' | 'survey'>,
): string | null {
  switch (profile) {
    case 'design_period_by_area':
      return '重现期 P（年）：按附录 B 地区重要程度自动匹配低/高档；条件分支在下方配置。';
    case 'area_importance_enum':
      return '地区重要性：固定四档枚举，赋分档 label 与普查下拉一致。';
    case 'auxiliary_then_select':
      return `须先在普查关联配置辅助条件字段，再在本指标选分档；可选启用「条件赋分」。`;
    case 'composite_appendix_numeric':
      return COMPOSITE_SCORING_COPY.rulesTabHint;
    default:
      return null;
  }
}
