import React from 'react';
import { HAZARD_POINT_TYPE_DESCRIPTION, HAZARD_POINT_TYPE_LABEL, type SurveyPointType } from './types';

export const SURVEY_POINT_TYPES: SurveyPointType[] = ['SUNKEN', 'TUNNEL', 'UNDERGROUND', 'LOW_LYING'];

export type HazardPointTypeSelectOption = {
  value: SurveyPointType;
  label: string;
  descLines: string[];
};

/** 隐患点类型下拉：标签 + 导则释义行 */
export function getHazardPointTypeSelectOptions(): HazardPointTypeSelectOption[] {
  return SURVEY_POINT_TYPES.map(value => ({
    value,
    label: HAZARD_POINT_TYPE_LABEL[value],
    descLines: HAZARD_POINT_TYPE_DESCRIPTION[value],
  }));
}

const optionDescStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'rgba(0, 0, 0, 0.45)',
  marginTop: 4,
  lineHeight: 1.5,
};

/** 下拉项：主标题 + 灰色释义（可多行） */
export function renderHazardPointTypeSelectOption(opt: {
  label?: React.ReactNode;
  data?: HazardPointTypeSelectOption;
}) {
  const lines = opt.data?.descLines ?? [];
  return (
    <div style={{ whiteSpace: 'normal', padding: '4px 0' }}>
      <div style={{ fontWeight: 500 }}>{opt.label}</div>
      {lines.map((line, i) => (
        <div key={i} style={optionDescStyle}>
          {line}
        </div>
      ))}
    </div>
  );
}

export const HAZARD_POINT_TYPE_SELECT_POPUP_PROPS = {
  popupMatchSelectWidth: 520,
  listHeight: 520,
} as const;
