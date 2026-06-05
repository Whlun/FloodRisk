/**
 * 综合态势左侧「雨水/污水管网」与底部管线列表抽屉的关联常量。
 */

/**
 * 是否打开底部「管网/管点」表：雨水/污水为管线表，检查井为检查井管点表（与设施管理台账同源）
 */
export function isZhtPipeLineLeftStatLabel(label: string | undefined | null): boolean {
  return label === '雨水管网(km)' || label === '污水管网(km)' || label === '检查井';
}

/** 左侧指标文案 → 排水管线台账 `lineCategory`（1 雨水 / 2 污水） */
export function zhtPipeLineCategoryFromItemLabel(itemLabel: string): '1' | '2' {
  return itemLabel === '雨水管网(km)' ? '1' : '2';
}
