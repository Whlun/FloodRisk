import type { RiskIndicatorRow } from './types';
import {
  resolveDefaultTemplateForValueType,
  type IndicatorConfigTemplateId,
} from './indicatorConfigTemplates';

/** 新建向导：普查填报方式 + 赋分场景（单一数据源，与表单双写） */
export interface IndicatorWizardDraft {
  valueType: RiskIndicatorRow['valueType'];
  templateId: IndicatorConfigTemplateId;
}

export const DEFAULT_WIZARD_DRAFT: IndicatorWizardDraft = {
  valueType: 'enum',
  templateId: 'enum_uniform',
};

/** 由普查填报方式推导默认赋分场景（进入赋分规则步时使用） */
export function resolveWizardScoringFromValueType(
  valueType: RiskIndicatorRow['valueType'],
): IndicatorWizardDraft {
  return {
    valueType,
    templateId: resolveDefaultTemplateForValueType(valueType),
  };
}
