import React from 'react';
import {
  LEVEL1_FACTOR_DESCRIPTION,
  LEVEL1_FACTOR_LABEL,
  LEVEL1_FACTOR_ORDER,
  type Level1Factor,
} from './types';

export type Level1FactorSelectOption = {
  value: Level1Factor;
  label: string;
  desc: string;
};

/** 一级因子下拉：标签 + 导则释义 */
export function getLevel1FactorSelectOptions(): Level1FactorSelectOption[] {
  return LEVEL1_FACTOR_ORDER.map(value => ({
    value,
    label: LEVEL1_FACTOR_LABEL[value],
    desc: LEVEL1_FACTOR_DESCRIPTION[value],
  }));
}

const optionDescStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'rgba(0, 0, 0, 0.45)',
  marginTop: 4,
  lineHeight: 1.5,
};

/** 下拉项：主标题 + 灰色释义 */
export function renderLevel1FactorSelectOption(opt: {
  label?: React.ReactNode;
  data?: Level1FactorSelectOption;
}) {
  const desc = opt.data?.desc?.trim();
  return (
    <div style={{ whiteSpace: 'normal', padding: '4px 0' }}>
      <div style={{ fontWeight: 500 }}>{opt.label}</div>
      {desc ? <div style={optionDescStyle}>{desc}</div> : null}
    </div>
  );
}

export const LEVEL1_FACTOR_SELECT_POPUP_PROPS = {
  popupMatchSelectWidth: 520,
  listHeight: 360,
} as const;
