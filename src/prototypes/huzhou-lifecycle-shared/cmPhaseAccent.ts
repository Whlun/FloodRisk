/**
 * 建设工程画像 · 9 阶段主题色 key（与左栏 / 项目卡 hz-cm-phase-card--phase-* 一致）
 */
import {
  findMatterDisplayField,
  formatMatterDisplayValue,
  getMatterDisplayFields,
} from './matterDisplayFields';
import { getMatterStageRecords, matterHasData } from './matterStageData';
import { MATTER_STAGE_BY_KEY, type MatterStageKey } from './parcelMatterStages';
import type { ParcelLifecycle } from './types';

export type CmPhaseAccentKey =
  | 'pre-review'
  | 'farmland'
  | 'land-supply'
  | 'land-permit'
  | 'first-reg'
  | 'eng-permit'
  | 'land-review'
  | 'plan-verify'
  | 'estate-cert';

/** 与建管左栏 PHASE_METRICS.label 对齐 */
export const CM_PHASE_LABELS: Record<CmPhaseAccentKey, string> = {
  'pre-review': '预审与选址',
  farmland: '农转用报批',
  'land-supply': '土地供应',
  'land-permit': '用地规划许可',
  'first-reg': '土地首次登记',
  'eng-permit': '工程规划许可',
  'land-review': '用地复核验收',
  'plan-verify': '规划核实',
  'estate-cert': '不动产权证',
};

/** 与建管左栏 PHASE_METRICS.label 对齐，用于按中文名匹配主题色 */
const CM_PHASE_LABEL_TO_KEY: Record<string, CmPhaseAccentKey> = Object.fromEntries(
  Object.entries(CM_PHASE_LABELS).map(([key, label]) => [label, key as CmPhaseAccentKey]),
) as Record<string, CmPhaseAccentKey>;

const MATTER_STAGE_TO_PHASE: Partial<Record<MatterStageKey, CmPhaseAccentKey>> = {
  'farmland-conversion': 'farmland',
  'farmland-parcel': 'farmland',
  'planning-conditions': 'pre-review',
  'land-use-permit': 'land-permit',
  'design-review': 'eng-permit',
  'engineering-permit': 'eng-permit',
  'first-registration': 'first-reg',
  'construction-permit': 'eng-permit',
  'project-base': 'eng-permit',
  'construction-project': 'eng-permit',
  'planning-verification': 'plan-verify',
  'estate-certificate': 'estate-cert',
  attachments: 'eng-permit',
  'process-events': 'eng-permit',
};

export function matterStageToCmPhaseAccentKey(stageKey: MatterStageKey): CmPhaseAccentKey {
  const label = MATTER_STAGE_BY_KEY[stageKey]?.label;
  if (label && CM_PHASE_LABEL_TO_KEY[label]) {
    return CM_PHASE_LABEL_TO_KEY[label];
  }
  return MATTER_STAGE_TO_PHASE[stageKey] ?? 'pre-review';
}

export type CmPhaseConfig = {
  key: CmPhaseAccentKey;
  label: string;
  matterKeys: MatterStageKey[];
};

/** 与建管左栏 PHASE_METRICS 同名同序；细项事项归并到 9 阶段 */
export const CM_PHASES: CmPhaseConfig[] = [
  { key: 'pre-review', label: CM_PHASE_LABELS['pre-review'], matterKeys: ['pre-review', 'planning-conditions'] },
  { key: 'farmland', label: CM_PHASE_LABELS.farmland, matterKeys: ['farmland-conversion', 'farmland-parcel'] },
  { key: 'land-supply', label: CM_PHASE_LABELS['land-supply'], matterKeys: ['land-supply'] },
  { key: 'land-permit', label: CM_PHASE_LABELS['land-permit'], matterKeys: ['land-use-permit'] },
  { key: 'first-reg', label: CM_PHASE_LABELS['first-reg'], matterKeys: ['first-registration'] },
  {
    key: 'eng-permit',
    label: CM_PHASE_LABELS['eng-permit'],
    matterKeys: ['design-review', 'engineering-permit', 'construction-permit', 'project-base', 'construction-project'],
  },
  { key: 'land-review', label: CM_PHASE_LABELS['land-review'], matterKeys: ['land-review'] },
  { key: 'plan-verify', label: CM_PHASE_LABELS['plan-verify'], matterKeys: ['planning-verification'] },
  { key: 'estate-cert', label: CM_PHASE_LABELS['estate-cert'], matterKeys: ['estate-certificate'] },
];

/** 详情左栏 6 大阶段分组（布局展示；交互仍为 9 个细项阶段） */
export type CmPhaseMacroKey = 'approve' | 'supply' | 'use' | 'build' | 'verify' | 'cert';

export type CmPhaseMacroGroup = {
  key: CmPhaseMacroKey;
  /** 单字大阶段名：批 / 供 / 用 / 建 / 验 / 证 */
  label: string;
  phaseKeys: readonly CmPhaseAccentKey[];
};

export const CM_PHASE_MACRO_GROUPS: readonly CmPhaseMacroGroup[] = [
  { key: 'approve', label: '批', phaseKeys: ['pre-review', 'farmland'] },
  { key: 'supply', label: '供', phaseKeys: ['land-supply'] },
  { key: 'use', label: '用', phaseKeys: ['land-permit', 'first-reg'] },
  { key: 'build', label: '建', phaseKeys: ['eng-permit'] },
  { key: 'verify', label: '验', phaseKeys: ['land-review', 'plan-verify'] },
  { key: 'cert', label: '证', phaseKeys: ['estate-cert'] },
] as const;

const CM_PHASE_BY_KEY = Object.fromEntries(CM_PHASES.map(p => [p.key, p])) as Record<
  CmPhaseAccentKey,
  CmPhaseConfig
>;

export function getCmPhaseConfig(key: CmPhaseAccentKey): CmPhaseConfig {
  return CM_PHASE_BY_KEY[key];
}

/** 时间轴导航进度/数据判定：仅用有属性 Tab 展示配置的事项（排除投资立项等附属台账） */
function cmPhaseNavMatterKeys(phase: CmPhaseConfig): MatterStageKey[] {
  const withDisplay = phase.matterKeys.filter(k => getMatterDisplayFields(k) != null);
  return withDisplay.length > 0 ? withDisplay : phase.matterKeys;
}

export function cmPhaseHasData(parcel: ParcelLifecycle, phaseKey: CmPhaseAccentKey): boolean {
  const phase = CM_PHASE_BY_KEY[phaseKey];
  return cmPhaseNavMatterKeys(phase).some(k => matterHasData(parcel, k));
}

export type CmPhaseButtonState = 'done' | 'active' | 'disabled';

export function cmPhaseButtonState(
  parcel: ParcelLifecycle,
  phaseKey: CmPhaseAccentKey,
): CmPhaseButtonState {
  const phase = CM_PHASE_BY_KEY[phaseKey];
  const navKeys = cmPhaseNavMatterKeys(phase);
  const statuses = navKeys.map(k => parcel.stageStatus[k]);
  if (statuses.some(s => s === 'active')) return 'active';
  if (navKeys.some(k => matterHasData(parcel, k) || parcel.stageStatus[k] === 'done')) {
    return 'done';
  }
  return 'disabled';
}

export function resolveMatterForCmPhase(
  parcel: ParcelLifecycle,
  phaseKey: CmPhaseAccentKey,
): MatterStageKey {
  const phase = CM_PHASE_BY_KEY[phaseKey];
  // 优先有产品展示字段且已有填报的事项（避免 eng-permit 误落 project-base / construction-project）
  const withDisplayAndData = phase.matterKeys.find(
    k => getMatterDisplayFields(k) != null && matterHasData(parcel, k),
  );
  if (withDisplayAndData) return withDisplayAndData;
  // 无数据时仍锚定产品字段表（属性 Tab 骨架与导航日期标签）
  const withDisplay = phase.matterKeys.find(k => getMatterDisplayFields(k) != null);
  if (withDisplay) return withDisplay;
  const withData = phase.matterKeys.find(k => matterHasData(parcel, k));
  return withData ?? phase.matterKeys[0];
}

/** 展示用：截断为 YYYY-MM-DD（保留原串若不足 10 位） */
export function formatCmPhaseAcceptTime(value: string | undefined): string {
  if (!value?.trim()) return '—';
  const trimmed = value.trim();
  if (trimmed.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  return trimmed;
}

const CM_PHASE_NAV_DATE: Record<
  CmPhaseAccentKey,
  { label: string; code?: string }
> = {
  'pre-review': { label: '受理日期', code: 'nf' },
  farmland: { label: '申请日期', code: 'sqrq' },
  'land-supply': { label: '签定日期', code: 'tdgy_qdrq' },
  'land-permit': { label: '发证时间', code: 'ydgh_fzsj' },
  'first-reg': { label: '登记日期' },
  'eng-permit': { label: '发证日期', code: 'gcgh_fzrq' },
  'land-review': { label: '拟开工时间', code: 'ydfhys_plan_starttime' },
  'plan-verify': { label: '核发日期', code: 'ghhs_hfrq' },
  'estate-cert': { label: '登记时间', code: 'djsj' },
};

export type CmPhaseNavDate = {
  label: string;
  value: string | undefined;
};

function pickNavDateFromMatterField(
  parcel: ParcelLifecycle,
  matterKey: MatterStageKey,
  code: string,
  label: string,
): string | undefined {
  const field = findMatterDisplayField(matterKey, code) ?? { code, label };
  const record = getMatterStageRecords(parcel, matterKey)[0];
  if (!record) return undefined;
  const formatted = formatMatterDisplayValue(field, record);
  if (!formatted || formatted === '—') return undefined;
  return formatted;
}

/** 左栏阶段导航日期：标签与各阶段属性 Tab 对齐；有配置 code 时仅取该字段 */
export function resolveCmPhaseNavDate(
  parcel: ParcelLifecycle,
  phaseKey: CmPhaseAccentKey,
): CmPhaseNavDate {
  const config = CM_PHASE_NAV_DATE[phaseKey];
  const matterKey = resolveMatterForCmPhase(parcel, phaseKey);

  if (config.code) {
    return {
      label: config.label,
      value: pickNavDateFromMatterField(parcel, matterKey, config.code, config.label),
    };
  }

  return { label: config.label, value: undefined };
}

/** @deprecated 使用 resolveCmPhaseNavDate */
export function resolveCmPhaseAcceptTime(
  parcel: ParcelLifecycle,
  phaseKey: CmPhaseAccentKey,
): string | undefined {
  return resolveCmPhaseNavDate(parcel, phaseKey).value;
}
