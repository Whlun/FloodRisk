/**
 * 空间利用画像 · 左右看板演示数据（与 docx 截图量级一致）
 */
import type { HuzhouSpaceMode } from '../huzhouMapConstants';

export const SUPPLY_TREND_YEARS = ['2018', '2019', '2020', '2021', '2022', '2023'];
export const SUPPLY_TREND_VALUES = [420, 380, 510, 460, 530, 490];

/** 供地分布 · 用途分布（柱状，演示比例 0–1） */
export const SUPPLY_USAGE_BARS = [
  { name: '商服', value: 0.18 },
  { name: '住宅', value: 0.32 },
  { name: '工矿仓储', value: 0.41 },
  { name: '基础设施及其他', value: 0.09 },
];

/** 供地分布 · 空间分布（按区县） */
export const SUPPLY_SPATIAL_BARS = [
  { name: '市本级', value: 0.22 },
  { name: '吴兴区', value: 0.19 },
  { name: '南浔区', value: 0.15 },
  { name: '德清县', value: 0.17 },
  { name: '长兴县', value: 0.14 },
  { name: '安吉县', value: 0.13 },
];

/** 供地分布 · 结构分布（饼图：出让 / 划拨 / 租赁 / 其他） */
export const SUPPLY_STRUCT_PIE = [
  { name: '出让', value: 42.5, color: '#ff4d4f' },
  { name: '划拨', value: 28.3, color: '#fa8c16' },
  { name: '租赁', value: 18.6, color: '#fadb14' },
  { name: '其他', value: 10.6, color: '#95de64' },
];

export const SUPPLY_STRUCT_TOTAL = SUPPLY_STRUCT_PIE.reduce((s, d) => s + d.value, 0);

export const INEFFICIENT_LAND = {
  area: 26.0,
  industrial: 903.0,
  industrialPct: 0.57,
  rectify: 72.19,
  rectifyPct: 0.8118,
};

export const AVAILABLE_TOTAL = 2642.53;

export const AVAILABLE_DONUT = [
  { name: '居住用地', value: 1577.41, color: '#eb2f96' },
  { name: '工业用地', value: 1019.09, color: '#02a7f0' },
  { name: '公用设施用地', value: 46.03, color: '#52c41a' },
];

export const RESIDENTIAL_BARS = [
  { name: '二类居住', value: 820 },
  { name: '一类居住', value: 420 },
  { name: '商住', value: 210 },
  { name: '其他', value: 127 },
];

export const INDUSTRIAL_ROWS = [
  { name: '一类工业用地', value: 336.42 },
  { name: '二类工业用地', value: 558.46 },
  { name: '三类工业用地', value: 124.22 },
];

export const PUBLIC_DONUT_TOTAL = 45.52;
export const PUBLIC_DONUT = [
  { name: '排水设施', value: 12.09, color: '#02a7f0' },
  { name: '供电用地', value: 7.96, color: '#52c41a' },
  { name: '环境设施', value: 6.15, color: '#fa8c16' },
  { name: '其他', value: 19.32, color: '#ff4d4f' },
];

export const LEFT_PANEL_TITLE: Record<HuzhouSpaceMode, string> = {
  planned: '规划建设空间',
  utilized: '已利用空间',
  available: '可利用空间',
};
