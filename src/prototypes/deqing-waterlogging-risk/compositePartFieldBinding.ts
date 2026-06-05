import { APPENDIX_B_CONDITION_FIELDS_BY_POINT_TYPE, COMMON_APPENDIX_CONDITION_FIELDS } from './appendixBConditionFields';

/** 复合子项「普查字段」表单项文案（与条件赋分「内涝基本信息 / 条件字段」口径一致） */
export const COMPOSITE_PART_SURVEY_FIELD_LABEL = '条件字段';
export const COMPOSITE_PART_SURVEY_FIELD_PLACEHOLDER = '请选择现场普查字段';
export const COMPOSITE_PART_SURVEY_FIELD_REQUIRED = '请选择普查字段';
export const COMPOSITE_PART_SURVEY_FIELD_EXTRA =
  '与条件赋分「内涝基本信息 → 条件字段」选项一致（仅数值型）；须先在基本信息中确认一级因子与适用隐患点类型。';

/** 复合子项可选的现场普查字段（面向配置人员的中文选项） */
export interface AppendixBSurveyPartOption {
  value: string;
  label: string;
  /** 选中后若显示名称为空或仍为「子项 N」，可自动填入 */
  defaultPartLabel?: string;
}

const UNDERGROUND_APPENDIX_B_PART_OPTIONS: AppendixBSurveyPartOption[] = [
  {
    value: 'pedestrianEntranceElevationDiffM',
    label: '人行出入口与室外地面高程差（m）',
    defaultPartLabel: '人行出入口与室外地面高程差（H/m）',
  },
  {
    value: 'vehicleEntranceElevationDiffM',
    label: '车行出入口与室外地面高程差（m）',
    defaultPartLabel: '车行出入口与室外地面高程差（H/m）',
  },
];

/** 下凹式等类型专用现场项（与条件赋分来源一致；复合子项仅数值型） */
const SUNKEN_APPENDIX_B_PART_OPTIONS: AppendixBSurveyPartOption[] = (
  APPENDIX_B_CONDITION_FIELDS_BY_POINT_TYPE.SUNKEN ?? []
)
  .filter(f => f.kind === 'numeric')
  .map(f => ({ value: f.key, label: f.label }));

const LOW_LYING_APPENDIX_B_PART_OPTIONS: AppendixBSurveyPartOption[] = (
  APPENDIX_B_CONDITION_FIELDS_BY_POINT_TYPE.LOW_LYING ?? []
)
  .filter(f => f.kind === 'numeric')
  .map(f => ({ value: f.key, label: f.label, defaultPartLabel: f.label }));

export const APPENDIX_B_SURVEY_PART_SELECT_OPTIONS: AppendixBSurveyPartOption[] = [
  ...COMMON_APPENDIX_CONDITION_FIELDS.map(f => ({
    value: f.key,
    label: f.label,
    defaultPartLabel: f.label,
  })),
  ...UNDERGROUND_APPENDIX_B_PART_OPTIONS,
  ...SUNKEN_APPENDIX_B_PART_OPTIONS,
  ...LOW_LYING_APPENDIX_B_PART_OPTIONS,
];

export function listAppendixBSurveyPartSelectOptions(
  currentKey?: string,
): AppendixBSurveyPartOption[] {
  const key = currentKey?.trim();
  if (!key || APPENDIX_B_SURVEY_PART_SELECT_OPTIONS.some(o => o.value === key)) {
    return APPENDIX_B_SURVEY_PART_SELECT_OPTIONS;
  }
  return [
    ...APPENDIX_B_SURVEY_PART_SELECT_OPTIONS,
    { value: key, label: `已保存的自定义项（${key}）` },
  ];
}

export function findAppendixBSurveyPartOption(
  appendixBFieldKey: string,
): AppendixBSurveyPartOption | undefined {
  return APPENDIX_B_SURVEY_PART_SELECT_OPTIONS.find(o => o.value === appendixBFieldKey);
}
