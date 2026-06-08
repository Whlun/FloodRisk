/**
 * 建管 9 阶段地图/填色（与 cmPhaseStageTag.css --hz-cm-phase-accent* 一致）
 */
import type { CmPhaseAccentKey } from './cmPhaseAccent';

export type CmPhaseMapColors = {
  accent: string;
  accentDeep: string;
  accentBg: string;
  accentFill: string;
};

export const CM_PHASE_MAP_COLORS: Record<CmPhaseAccentKey, CmPhaseMapColors> = {
  'pre-review': {
    accent: '#5b6ee8',
    accentDeep: '#3d4fb8',
    accentBg: '#eef1ff',
    accentFill: '#8b9cf5',
  },
  farmland: {
    accent: '#237804',
    accentDeep: '#135200',
    accentBg: '#d9f7be',
    accentFill: '#389e0d',
  },
  'land-supply': {
    accent: '#fa8c16',
    accentDeep: '#d46b08',
    accentBg: '#fff7e6',
    accentFill: '#ffc069',
  },
  'land-permit': {
    accent: '#722ed1',
    accentDeep: '#531dab',
    accentBg: '#f9f0ff',
    accentFill: '#b37feb',
  },
  'first-reg': {
    accent: '#13c2c2',
    accentDeep: '#08979c',
    accentBg: '#e6fffb',
    accentFill: '#5cdbd3',
  },
  'eng-permit': {
    accent: '#eb2f96',
    accentDeep: '#c41d7f',
    accentBg: '#fff0f6',
    accentFill: '#ff85c0',
  },
  'land-review': {
    accent: '#faad14',
    accentDeep: '#d48806',
    accentBg: '#fffbe6',
    accentFill: '#ffd666',
  },
  'plan-verify': {
    accent: '#2f54eb',
    accentDeep: '#1d39c4',
    accentBg: '#f0f5ff',
    accentFill: '#85a5ff',
  },
  'estate-cert': {
    accent: '#d4b106',
    accentDeep: '#ad8b00',
    accentBg: '#fffbe6',
    accentFill: '#ffe58f',
  },
};

export function getCmPhaseMapColors(key: CmPhaseAccentKey): CmPhaseMapColors {
  return CM_PHASE_MAP_COLORS[key];
}

/** MapLibre 地块面：填充用 accent、描边用 accentDeep（与主地图项目高亮同源） */
export function getCmPhaseMapPaint(key: CmPhaseAccentKey): {
  fillColor: string;
  lineColor: string;
  fillOpacity: number;
} {
  const c = getCmPhaseMapColors(key);
  return {
    fillColor: c.accent,
    lineColor: c.accentDeep,
    fillOpacity: 0.38,
  };
}
