/**
 * 地块全生命周期 · 批供用建阶段与事项配置
 */
export type LifecyclePhaseKey = 'batch' | 'supply' | 'use' | 'build' | 'cert';

export type MatterStageKey =
  | 'pre-review'
  | 'farmland-conversion'
  | 'farmland-parcel'
  | 'planning-conditions'
  | 'land-supply'
  | 'land-use-permit'
  | 'design-review'
  | 'engineering-permit'
  | 'construction-permit'
  | 'project-base'
  | 'construction-project'
  | 'planning-verification'
  | 'land-review'
  | 'first-registration'
  | 'estate-certificate'
  | 'attachments'
  | 'process-events';

export type MatterStageConfig = {
  key: MatterStageKey;
  label: string;
  tableName: string;
  phase: LifecyclePhaseKey;
  /** 老地政表等，详情中默认隐藏 */
  legacy?: boolean;
  /** 不在事项 Pill 中展示，走档案/过程 Tab */
  hiddenInPills?: boolean;
};

export const LIFECYCLE_PHASES: { key: LifecyclePhaseKey; label: string }[] = [
  { key: 'batch', label: '批' },
  { key: 'supply', label: '供' },
  { key: 'use', label: '用' },
  { key: 'build', label: '建' },
  { key: 'cert', label: '证' },
];

export const MATTER_STAGES: MatterStageConfig[] = [
  { key: 'pre-review', label: '预审与选址', tableName: 't_sx_ysxz', phase: 'batch' },
  { key: 'farmland-conversion', label: '农转用报批', tableName: 't_sx_nzy_bpxmjbxx', phase: 'batch' },
  { key: 'farmland-parcel', label: '农转用地块', tableName: 't_sx_nzy_dkgl', phase: 'batch' },
  { key: 'planning-conditions', label: '规划设计条件', tableName: 't_sx_ghsjtj', phase: 'batch' },
  { key: 'land-supply', label: '土地供应', tableName: 't_sx_tdgy', phase: 'supply' },
  { key: 'land-use-permit', label: '用地规划许可', tableName: 't_sx_jsydghxk', phase: 'use' },
  { key: 'design-review', label: '设计方案审查', tableName: 't_sx_fasc', phase: 'use' },
  { key: 'engineering-permit', label: '工程规划许可', tableName: 't_sx_jsgcghxk', phase: 'use' },
  { key: 'construction-permit', label: '工程施工许可', tableName: 't_sx_jsgcsgxk', phase: 'build' },
  { key: 'first-registration', label: '土地首次登记', tableName: 't_sx_bdc', phase: 'use' },
  { key: 'project-base', label: '投资立项', tableName: 'projectdata', phase: 'build' },
  { key: 'construction-project', label: '建设工程项目', tableName: 't_xm_jsgcxm', phase: 'build' },
  { key: 'planning-verification', label: '规划核实', tableName: 't_sx_ghhs', phase: 'build' },
  { key: 'land-review', label: '用地复核验收', tableName: 't_sx_ydfhys', phase: 'build' },
  { key: 'estate-certificate', label: '不动产权证', tableName: 't_estate_certificate', phase: 'cert' },
  { key: 'attachments', label: '附件', tableName: 't_xm_fj', phase: 'build', hiddenInPills: true },
  { key: 'process-events', label: '项目过程', tableName: 't_xm_xmgc', phase: 'build', hiddenInPills: true },
];

export const MATTER_STAGE_BY_KEY = Object.fromEntries(
  MATTER_STAGES.map(m => [m.key, m]),
) as Record<MatterStageKey, MatterStageConfig>;

export const LEGACY_TABLE_NAMES = new Set([
  't_sx_nzy_bpxmjbxx_ldz',
  't_sx_nzy_xmjbxx_ldz',
  't_sx_nzy_dkgl_ldz',
]);

/** 某阶段下可切换的事项（不含 hiddenInPills） */
export function mattersForPhase(phase: LifecyclePhaseKey): MatterStageConfig[] {
  return MATTER_STAGES.filter(m => m.phase === phase && !m.hiddenInPills);
}

/** 阶段下第一个有数据的事项 */
export function firstMatterWithData(
  phase: LifecyclePhaseKey,
  hasData: (key: MatterStageKey) => boolean,
): MatterStageKey | undefined {
  return mattersForPhase(phase).find(m => hasData(m.key))?.key;
}
