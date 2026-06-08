import type { CmAlertType, CmPhaseAlertLevel } from './types';

/** 前三未预警类型主题色（与 hz-cm-alert-card--type-* CSS 变量一致） */
export type AlertTypeAccent = {
  accent: string;
  accentDeep: string;
  accentBg: string;
  accentFill: string;
};

const ALERT_TYPE_ACCENTS: Record<CmAlertType, AlertTypeAccent> = {
  'approved-not-supplied': {
    accent: '#1677ff',
    accentDeep: '#0958d9',
    accentBg: '#e6f4ff',
    accentFill: '#69b1ff',
  },
  'supplied-not-used': {
    accent: '#13c2c2',
    accentDeep: '#08979c',
    accentBg: '#e6fffb',
    accentFill: '#5cdbd3',
  },
  'used-not-complete': {
    accent: '#722ed1',
    accentDeep: '#531dab',
    accentBg: '#f9f0ff',
    accentFill: '#b37feb',
  },
};

/** I级 → II级 → III级 色阶，与类型标签 / 进度条同源 */
export const ALERT_LEVEL_ORDER: CmPhaseAlertLevel[] = ['serious', 'warning', 'hint'];

export function getAlertTypeAccent(alertType: CmAlertType): AlertTypeAccent {
  return ALERT_TYPE_ACCENTS[alertType];
}

export function getAlertTypeLevelColors(
  alertType: CmAlertType,
): Record<CmPhaseAlertLevel, string> {
  const accent = getAlertTypeAccent(alertType);
  return {
    serious: accent.accentDeep,
    warning: accent.accent,
    hint: accent.accentFill,
  };
}

/** 全市汇总图 · 前三未类型图例/指标卡元数据 */
export const CM_ALERT_TYPE_CHART_META = [
  { key: 'approved-not-supplied' as const, label: '批而未供', color: '#1677ff' },
  { key: 'supplied-not-used' as const, label: '供而未用', color: '#13c2c2' },
  { key: 'used-not-complete' as const, label: '用而未尽', color: '#722ed1' },
] as const;
