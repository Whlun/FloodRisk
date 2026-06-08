/** 建设工程画像 · 类型定义 */

export type ConstructionView =
  | 'home'
  | 'project-list-full'
  | 'process-flow'
  | 'portrait-full'
  | `matter-${MatterKey}`;

export type MatterKey =
  | 'pre-review'
  | 'farmland-conversion'
  | 'planning-conditions'
  | 'land-supply'
  | 'first-registration'
  | 'land-use-permit'
  | 'design-review'
  | 'engineering-permit'
  | 'land-review'
  | 'planning-verification'
  | 'estate-certificate';

export const MATTER_KEYS: MatterKey[] = [
  'pre-review',
  'farmland-conversion',
  'planning-conditions',
  'land-supply',
  'first-registration',
  'land-use-permit',
  'design-review',
  'engineering-permit',
  'land-review',
  'planning-verification',
  'estate-certificate',
];

/** 首页左侧事项阶段 key（与 PHASE_METRICS 一致） */
export type PhaseKey =
  | 'pre-review'
  | 'farmland'
  | 'land-supply'
  | 'land-permit'
  | 'first-reg'
  | 'eng-permit'
  | 'land-review'
  | 'plan-verify'
  | 'estate-cert';

export type ConstructionProject = {
  id: string;
  name: string;
  region: string;
  /** 所属事项阶段，用于左栏阶段切换联动右侧列表 */
  phaseKey: PhaseKey;
  /** 关联地块台账 id，用于详情弹窗与地图定位 */
  parcelId?: string;
  unifiedCode?: string;
  address?: string;
  applyDate?: string;
  /** 演示：项目类型（房屋建筑 / 市政设施等） */
  projectType?: string;
  /** 演示：用地面积（亩） */
  landAreaMu?: number;
  /** 演示：建筑面积（㎡） */
  buildAreaSqm?: number;
  /** 演示：建设单位简称 */
  ownerName?: string;
  constructNature?: string;
  industry?: string;
  theIndustry?: string;
  totalFund?: string;
  fundSource?: string;
  planStart?: string;
  planEnd?: string;
  ownerLegalName?: string;
  ownerLegalCertType?: string;
  ownerLegalCertNo?: string;
  ownerAddress?: string;
  scaleContent?: string;
  /** 演示：进入当前阶段日期（ISO YYYY-MM-DD）；仅显式标记的项目参与阶段滞留预警 */
  phaseEnteredAt?: string;
  /** 前三未预警 · 农转用报批申请日期 */
  nongzhuanDate?: string;
  /** 前三未预警 · 土地供应签订日期 */
  supplyDate?: string;
  /** 前三未预警 · 工程施工许可计划开工日期 */
  constructDate?: string;
  /** 前三未预警 · 规划核实核发日期 */
  verifyDate?: string;
  /** 前三未预警 · 出让合同约定开工日期 */
  contractStartDate?: string;
  /** 前三未预警 · 总用地面积（亩） */
  totalAreaMu?: number;
  /** 前三未预警 · 规划总建筑面积（㎡） */
  plannedBuiltAreaSqm?: number;
  /** 前三未预警 · 实际已开发面积（亩，用而未尽判定） */
  developedAreaMu?: number;
};

/** 工业用地前三未预警类型 */
export type CmAlertType = 'approved-not-supplied' | 'supplied-not-used' | 'used-not-complete';

/** 项目阶段停留预警等级（前三未：黄/橙/红） */
export type CmPhaseAlertLevel = 'hint' | 'warning' | 'serious';

/** 单项目阶段停留预警 */
export type CmPhaseAlert = {
  projectId: string;
  phaseKey: PhaseKey;
  level: CmPhaseAlertLevel;
  /** 进入当前阶段日期 */
  enteredAt: string;
  /** 截至基准日的停留天数 */
  daysInPhase: number;
  message: string;
};

/** 工业用地前三未预警 */
export type CmIndustrialLandAlert = {
  projectId: string;
  alertType: CmAlertType;
  level: CmPhaseAlertLevel;
  /** 批而未供 / 供而未用：超期天数 */
  delayDays?: number;
  /** 用而未尽：未开发面积（亩） */
  unusedAreaMu?: number;
  /** 用而未尽：已建比例 0–1 */
  builtRatio?: number;
  suggestAction: string;
  message: string;
  /** 详情 Tooltip 参考日期 */
  referenceDate: string;
  /** 时间轴节点对齐 */
  phaseKey: PhaseKey;
};

export type PhaseMetric = {
  key: PhaseKey;
  label: string;
  area: number;
  count: number;
  progressPct?: number;
};

export type ProjectDrawerCard = {
  id: string;
  title: string;
  tags: string[];
  matterName: string;
  status: string;
  date?: string;
};

/** 首页右栏项目卡 · 绿色 KPI 块（对齐综合态势 metric-block） */
export type CmProjectCardMetric = {
  label: string;
  value: string;
  kind?: 'plain' | 'stat' | 'enum' | 'status' | 'time';
};
