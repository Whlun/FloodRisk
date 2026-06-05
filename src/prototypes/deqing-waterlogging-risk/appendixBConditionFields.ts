import type { HazardPointType, RiskIndicatorRow, SurveyPointType } from './types';
import { HAZARD_POINT_TYPE_LABEL } from './types';
import { getAppendixBSurveyParts } from './appendixBSurveyBinding';
import { appendixBFieldCollectableAtPointType } from './appendixBFieldPointTypes';
import { indicatorAppliesToPoint } from './indicatorSurveyUtils';

/** 附录 B 类型专用信息中可作为条件赋分来源的字段（与 appendixBSurveyFields 表单项一致） */
export type AppendixBConditionFieldKind = 'enum' | 'numeric' | 'boolean';

export interface AppendixBConditionFieldDef {
  key: string;
  label: string;
  kind: AppendixBConditionFieldKind;
  unit?: string;
}

const SUNKEN_FIELDS: AppendixBConditionFieldDef[] = [
  { key: 'elevationM', label: '高程 (m)', kind: 'numeric' },
  { key: 'sunkenDepthCm', label: '下凹深度 (cm)', kind: 'numeric' },
  { key: 'catchmentAreaM2', label: '汇水面积 (m²)', kind: 'numeric' },
  { key: 'rainInletMeetsStandard', label: '雨水口/沟满足规范', kind: 'boolean' },
];

/** 地下空间附录 B 固定专用字段（表 5.3.7 人行/车行出入口高程差） */
const UNDERGROUND_FIELDS: AppendixBConditionFieldDef[] = [
  {
    key: 'pedestrianEntranceElevationDiffM',
    label: '人行出入口与室外地面高程差 H（m）',
    kind: 'numeric',
  },
  {
    key: 'vehicleEntranceElevationDiffM',
    label: '车行出入口与室外地面高程差 H（m）',
    kind: 'numeric',
  },
];

/** 城市低洼路段附录 B 固定专用字段（表 5.3.11 道路纵坡 S） */
const LOW_LYING_FIELDS: AppendixBConditionFieldDef[] = [
  { key: 'roadLongitudinalSlope', label: '道路纵坡度 S（%）', kind: 'numeric', unit: '%' },
];

/** 四种易涝点类型共用的附录 B「历史灾情」数值字段 */
export const COMMON_APPENDIX_CONDITION_FIELDS: AppendixBConditionFieldDef[] = [
  { key: 'historicalDeathCount', label: '人员死亡（人）', kind: 'numeric', unit: '人' },
  { key: 'historicalSeriousInjuryCount', label: '人员重伤（人）', kind: 'numeric', unit: '人' },
  { key: 'historicalTrappedCount', label: '人员被困（人）', kind: 'numeric', unit: '人' },
  {
    key: 'historicalDirectEconomicLossWan',
    label: '直接经济损失（万元）',
    kind: 'numeric',
    unit: '万元',
  },
];

export const HISTORICAL_DISASTER_SECTION_LABEL = '历史灾情';

/** 各隐患点类型附录 B 固定专用字段（不含指标 auxiliaryCondition 动态项） */
export const APPENDIX_B_CONDITION_FIELDS_BY_POINT_TYPE: Partial<
  Record<SurveyPointType, AppendixBConditionFieldDef[]>
> = {
  SUNKEN: SUNKEN_FIELDS,
  UNDERGROUND: UNDERGROUND_FIELDS,
  LOW_LYING: LOW_LYING_FIELDS,
};

/** 指标附录 B 绑定字段：可作为条件赋分来源 */
function listAppendixBIndicatorBoundConditionFields(
  indicators: RiskIndicatorRow[] | undefined,
  pointType: SurveyPointType,
  options?: { onlyEnabledIndicators?: boolean },
): AppendixBConditionFieldDef[] {
  if (!indicators?.length) return [];
  const out: AppendixBConditionFieldDef[] = [];
  for (const i of indicators) {
    if (options?.onlyEnabledIndicators && !i.enabled) continue;
    if (!indicatorAppliesToPoint(i, pointType)) continue;
    const parts = getAppendixBSurveyParts(i);
    if (!parts.length) continue;
    for (const part of parts) {
      if (!appendixBFieldCollectableAtPointType(part.appendixBFieldKey, pointType)) continue;
      out.push({ key: part.appendixBFieldKey, label: part.label, kind: 'numeric' });
    }
  }
  return out;
}

export function formatCommonAppendixConditionLabel(field: AppendixBConditionFieldDef): string {
  return `${field.label}（${HISTORICAL_DISASTER_SECTION_LABEL}）`;
}

export function listAppendixBConditionFieldsForPointType(
  pointType: SurveyPointType,
  indicators?: RiskIndicatorRow[],
  options?: { onlyEnabledIndicators?: boolean },
): AppendixBConditionFieldDef[] {
  const fixed = APPENDIX_B_CONDITION_FIELDS_BY_POINT_TYPE[pointType] ?? [];
  const bound = listAppendixBIndicatorBoundConditionFields(indicators, pointType, options);
  const seen = new Set([...COMMON_APPENDIX_CONDITION_FIELDS, ...fixed].map(f => f.key));
  return [
    ...COMMON_APPENDIX_CONDITION_FIELDS,
    ...fixed,
    ...bound.filter(f => !seen.has(f.key)),
  ];
}

export function findAppendixBConditionField(
  key: string,
  pointType?: SurveyPointType,
): AppendixBConditionFieldDef | undefined {
  const common = COMMON_APPENDIX_CONDITION_FIELDS.find(f => f.key === key);
  if (common) return common;
  if (pointType) {
    return listAppendixBConditionFieldsForPointType(pointType).find(f => f.key === key);
  }
  for (const fields of Object.values(APPENDIX_B_CONDITION_FIELDS_BY_POINT_TYPE)) {
    const hit = fields?.find(f => f.key === key);
    if (hit) return hit;
  }
  return undefined;
}

export function isAppendixPointTypeConditionFieldKey(key: string): boolean {
  return Boolean(findAppendixBConditionField(key));
}

export function formatAppendixPointTypeConditionLabel(
  field: AppendixBConditionFieldDef,
  pointType: HazardPointType,
): string {
  return `${field.label}（${HAZARD_POINT_TYPE_LABEL[pointType]}专用信息）`;
}

/** 附录 B 固定专用字段的中文展示名（无 pointType 时按字段定义反查类型） */
export function resolveAppendixBFixedFieldLabel(
  key: string,
  pointType?: SurveyPointType,
): string | undefined {
  const field = findAppendixBConditionField(key, pointType);
  if (!field) return undefined;
  if (COMMON_APPENDIX_CONDITION_FIELDS.some(f => f.key === key)) {
    return formatCommonAppendixConditionLabel(field);
  }
  const pt =
    pointType ??
    (Object.entries(APPENDIX_B_CONDITION_FIELDS_BY_POINT_TYPE).find(([, fields]) =>
      fields?.some(f => f.key === key),
    )?.[0] as SurveyPointType | undefined);
  if (pt) return formatAppendixPointTypeConditionLabel(field, pt);
  return field.label;
}

/** 指标 auxiliaryCondition 登记在附录 B 的数值型辅助条件（如道路纵坡 S） */
export function findAppendixBAuxiliaryNumericConditionField(
  key: string,
  indicators?: RiskIndicatorRow[],
): AppendixBConditionFieldDef | undefined {
  if (!key || !indicators?.length) return undefined;
  for (const i of indicators) {
    const aux = i.survey?.auxiliaryCondition;
    if (aux?.fieldKey !== key || aux.surveyPlacement !== 'appendix_b') continue;
    return { key: aux.fieldKey, label: aux.label?.trim() || '辅助条件', kind: 'numeric' };
  }
  return undefined;
}

/** 条件分支用「匹配取值」而非数值比较 */
export function appendixBConditionFieldUsesDiscreteMatch(
  key: string,
  indicators?: RiskIndicatorRow[],
): boolean {
  if (key === 'areaImportance') return true;
  if (findAppendixBAuxiliaryNumericConditionField(key, indicators)) return false;
  const field = findAppendixBConditionField(key);
  if (field) return field.kind === 'enum' || field.kind === 'boolean';
  return false;
}
