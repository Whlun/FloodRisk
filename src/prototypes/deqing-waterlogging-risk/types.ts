/** 隐患点类型（孕灾因子按类型筛选） */
export type HazardPointType =
  | 'GLOBAL'
  | 'SUNKEN'
  | 'TUNNEL'
  | 'UNDERGROUND'
  | 'LOW_LYING';

export const HAZARD_POINT_TYPE_LABEL: Record<HazardPointType, string> = {
  GLOBAL: '通用（非孕灾专用）',
  SUNKEN: '下凹式立交桥/下穿道',
  TUNNEL: '隧道',
  UNDERGROUND: '地下空间',
  LOW_LYING: '城市低洼路段',
};

export type SurveyPointType = Exclude<HazardPointType, 'GLOBAL'>;

/** 易涝点类型导则释义；组合类型按条目分行展示 */
export const HAZARD_POINT_TYPE_DESCRIPTION: Record<SurveyPointType, string[]> = {
  SUNKEN: [
    '下凹式立交桥：相交道路通过降低某一条路面标高形式实现交通立体化，其下沉道路低于周边地面。',
    '下穿道：立体交叉道路中从被交叉的道路或铁路下方穿过的道路。',
  ],
  TUNNEL: [
    '隧道：埋设于地下或开凿于山体，供机动车或行人通行的封闭式交通通道。',
  ],
  UNDERGROUND: [
    '地下空间：地下空间包括地表以下，自然形成或人工开发的空间，是地面空间的延伸和补充，包括地下轨道交通设施、地下公共人行通道、地下交通场站、地下停车设施等地下道路与交通设施，地下市政场站、地下市政管廊等。',
  ],
  LOW_LYING: [
    '城市低洼路段：除下凹式立交桥/下穿道、隧道以外，其他陡坡变缓坡、与周边道路高程相比相对低洼的城市路段。',
  ],
};

export type Level1Factor = 'HAZARD' | 'FORMATION' | 'BEARING' | 'PREVENTION';

export const LEVEL1_FACTOR_LABEL: Record<Level1Factor, string> = {
  HAZARD: '致灾因子',
  FORMATION: '孕灾因子',
  BEARING: '承灾因子',
  PREVENTION: '防灾减灾救灾因子',
};

/** 一级因子导则释义（2.0.9–2.0.12） */
export const LEVEL1_FACTOR_DESCRIPTION: Record<Level1Factor, string> = {
  HAZARD: '引起城市内涝灾害的动力因子，代表内涝灾害风险的危险性。',
  FORMATION: '孕育自然灾害的环境要素，代表内涝灾害风险的敏感性。',
  BEARING: '区域可能受到灾害影响的承灾体，包括人员和财产等社会经济状况，代表内涝灾害风险的脆弱性。',
  PREVENTION: '区域应对内涝灾害采取的各种措施，代表区域应对内涝灾害风险的抵御和恢复性。',
};

export const LEVEL1_FACTOR_ORDER: Level1Factor[] = ['HAZARD', 'FORMATION', 'BEARING', 'PREVENTION'];

export const LEVEL1_DEFAULT_WEIGHT: Record<Level1Factor, number> = {
  HAZARD: 0.258,
  FORMATION: 0.511,
  BEARING: 0.08,
  PREVENTION: 0.151,
};

/** 一级因子权重（表 5.6.1，可配置） */
export type Level1Weights = Record<Level1Factor, number>;

export function cloneLevel1Weights(source: Level1Weights = LEVEL1_DEFAULT_WEIGHT): Level1Weights {
  return { ...source };
}

export interface ScoreRule {
  id: string;
  label: string;
  riskTier: string;
  score: number;
  /** 下拉选档：普查选项附注说明（选填） */
  tierRef?: string;
  /** 数值型统一赋分：普查填报值落入该区间时命中本档（自上而下先命中先生效） */
  numericMatch?: BranchNumericMatch;
}

/** 条件赋分：条件取值来源 */
export type ScoreConditionSourceType = 'appendix_b' | 'indicator';

export interface ScoreConditionSource {
  type: ScoreConditionSourceType;
  /** appendix_b 字段键（如 areaImportance）；indicator 为指标编码 */
  key: string;
}

/**
 * branch_threshold：各分支配置填报值比较条件（indicatorValueMatch）与本分支赋分档
 * branch_rules：各分支配置独立赋分档（枚举/下拉随条件切换选项）
 */
export type ConditionalScoringMode = 'branch_threshold' | 'branch_rules';

/** 当条件来源为数值型指标时的分支匹配 */
export type BranchNumericMatch =
  | { kind: 'eq'; value: number }
  | { kind: 'lte'; value: number }
  | { kind: 'lt'; value: number }
  | { kind: 'gte'; value: number }
  | { kind: 'gt'; value: number }
  | {
      kind: 'between';
      min: number;
      max: number;
      minInclusive?: boolean;
      maxInclusive?: boolean;
    };

export interface ConditionalScoreBranch {
  id: string;
  label: string;
  /** 离散条件（附录 B 等）命中取值列表 */
  matchValues?: string[];
  /** 数值型条件指标：按比较符匹配（用于命中分支） */
  numericMatch?: BranchNumericMatch;
  /** branch_threshold：本指标填报值与阈值的比较条件（满足时取低分档） */
  indicatorValueMatch?: BranchNumericMatch;
  /** @deprecated 使用 indicatorValueMatch（默认为 ≥） */
  numericThreshold?: number;
  /** branch_threshold / branch_rules：该分支下的赋分档 */
  scoreRules?: ScoreRule[];
}

export interface ConditionalScoringConfig {
  enabled: boolean;
  mode: ConditionalScoringMode;
  source: ScoreConditionSource;
  branches: ConditionalScoreBranch[];
}

/** point=易涝点普查；region=全县统一防灾减灾配置（不按点位重复填报） */
export type IndicatorSurveyScope = 'point' | 'region';

/** 普查控件形态 */
export type IndicatorSurveyInputVariant =
  | 'default'
  | 'auxiliary_then_select'
  | 'composite_appendix_numeric';

/** 附录 B 子项数值分档（有序，先命中先生效） */
export interface IndicatorAppendixBTierBand {
  riskTier: string;
  score: number;
  match: BranchNumericMatch;
}

/** 复合子项聚合：按各子项判档后的 F 取较大或较小者 */
export type CompositeAppendixAggregation = 'max_f' | 'min_f';

/** @deprecated 使用 max_f */
export type LegacyCompositeAppendixAggregation = 'worst_score';

/** 赋分规则 Tab 三选一（显式存储，避免从 survey / conditionalScoring 推导冲突） */
export type ScoringRuleMode = 'uniform' | 'conditional' | 'composite';

/** 辅助条件数值的合理区间（普查校验与 ? 提示） */
export interface AuxiliaryNumericRange {
  min: number;
  max: number;
  step?: number;
  precision?: number;
  rangeLabel: string;
  hint: string;
}

/** 条件赋分依赖的辅助数值（非独立二级指标，写入 indicatorValues[fieldKey]） */
export interface IndicatorAuxiliaryConditionField {
  fieldKey: string;
  label: string;
  unit?: string;
  /** 数值分界（% 等），用于条件分支；未填时从条件赋分分支解析 */
  thresholdPct?: number;
  /** 普查数值合理范围（新增/预置指标均在配置中声明，不在代码里按编码写死） */
  numericRange?: AuxiliaryNumericRange;
  /** 历史字段键迁移（可选） */
  legacyFieldKeys?: string[];
  /** 是否在指标普查中单独占一行填报（默认 true；不参与架构图 ω 汇总） */
  collectInSurvey?: boolean;
  /** 填报说明（? 悬停，用于区分与其它类型「纵坡度」等指标） */
  hint?: string;
  /**
   * 填报位置：appendix_b=基本信息 Tab 类型专用信息；indicator_census=指标普查 Tab（默认）
   */
  surveyPlacement?: 'appendix_b' | 'indicator_census';
}

/** 一指标对应多个数值子项（复合数值赋分） */
export interface IndicatorAppendixBSurveyPart {
  /** 子项取值来源；缺省时由 appendixBFieldKey 视为 appendix_b */
  source?: ScoreConditionSource;
  /** appendix_b 时与 source.key 一致；indicator 时为占位/兼容字段 */
  appendixBFieldKey: string;
  valueFieldKey: string;
  label: string;
  numericRange?: AuxiliaryNumericRange;
  /** 本子项数值 → 低/中/高分档（有序，先命中先生效） */
  tierBands: IndicatorAppendixBTierBand[];
}

export interface IndicatorSurveyConfig {
  collectInSurvey: boolean;
  surveyRequired: boolean;
  fieldKey: string;
  /**
   * 在附录 B「类型专用信息」填报，值同步至 fieldKey；不计入指标普查 Tab 列表，仍计入完整度。
   */
  appendixBFieldKey?: string;
  /** 多附录 B 子项（composite_appendix_numeric；与 appendixBFieldKey / auxiliary 互斥） */
  appendixBSurveyParts?: IndicatorAppendixBSurveyPart[];
  /** 多子项聚合：max_f / min_f = 各子项 F 取较大或较小者 */
  compositeAggregation?: CompositeAppendixAggregation;
  /**
   * 复合赋分前置门控（可选）：当附录 B 某布尔字段为指定值时，直接取标准分 F，不再要求各数值子项已填。
   * 例：有历史灾情=否 → F=0。
   */
  compositePreflightGate?: {
    appendixBField: string;
    when: boolean;
    score: number;
    ruleLabel?: string;
  };
  placeholder?: string;
  scope?: IndicatorSurveyScope;
  /** 普查填报形态；默认单控件 */
  inputVariant?: IndicatorSurveyInputVariant;
  /** 与 inputVariant=auxiliary_then_select 配合：先填辅助条件再选本分档 */
  auxiliaryCondition?: IndicatorAuxiliaryConditionField;
}

/** 用户新增指标「保存为预置」后的初始化快照，用于默认/修正对比 */
export interface RiskIndicatorInitSnapshot {
  code: string;
  name: string;
  level1: Level1Factor;
  applicableTypes: HazardPointType[];
  weight: number;
  valueType: 'enum' | 'numeric' | 'boolean';
  unit?: string;
  scoreRules: ScoreRule[];
  scoreExplanation?: string;
  scoringRuleMode?: ScoringRuleMode;
  remark?: string;
  enabled: boolean;
  survey: IndicatorSurveyConfig;
}

export interface RiskIndicatorRow {
  id: string;
  code: string;
  name: string;
  level1: Level1Factor;
  applicableTypes: HazardPointType[];
  weight: number;
  valueType: 'enum' | 'numeric' | 'boolean';
  unit?: string;
  scoreRules: ScoreRule[];
  /** 赋分说明：赋分规则 Tab 维护，普查/试算表单项 ? 悬停展示 */
  scoreExplanation?: string;
  /** 赋分方式：统一赋分档 / 条件赋分 / 复合数值赋分（与 conditionalScoring、survey.inputVariant 同步） */
  scoringRuleMode?: ScoringRuleMode;
  /** 条件赋分：按附录 B 或本点其他指标取值切换阈值/分档 */
  conditionalScoring?: ConditionalScoringConfig;
  remark?: string;
  enabled: boolean;
  updatedAt: string;
  survey: IndicatorSurveyConfig;
  /** 用户新增指标：保存为预置后的初始化基准（与内置导则预置区分） */
  initSnapshot?: RiskIndicatorInitSnapshot;
}

export interface IndicatorRiskLevelRow {
  id: string;
  levelCode: string;
  levelName: string;
  color: string;
  scoreMin: number;
  scoreMax: number;
  sort: number;
  description: string;
  enabled: boolean;
  /** 导则预置（表 5.6.1）不可删除 */
  builtin?: boolean;
}

export type AreaImportance = 'COUNTY_KEY' | 'COUNTY_GENERAL' | 'TOWN_GENERAL';

export const AREA_IMPORTANCE_LABEL: Record<AreaImportance, string> = {
  COUNTY_KEY: '德清县城重要地区及重要道路',
  COUNTY_GENERAL: '德清县城一般地区',
  TOWN_GENERAL: '其他乡镇一般地区',
};

/** 普查元信息 PDF 附件（原型：浏览器 data URL） */
export interface SurveyPdfAttachment {
  id: string;
  fileName: string;
  dataUrl: string;
  uploadedAt?: string;
}

/** 附录 B 下凹式立交桥/下穿道等类型普查字段（资料性附录） */
export interface AppendixBSurvey {
  /** 地下空间：人行出入口与室外地面高程差 H（m） */
  pedestrianEntranceElevationDiffM?: number;
  /** 地下空间：车行出入口与室外地面高程差 H（m） */
  vehicleEntranceElevationDiffM?: number;
  /** 1.3 高程 m */
  elevationM?: number;
  /** 1.4 下凹深度 cm */
  sunkenDepthCm?: number;
  /** 1.5 汇水面积 m² */
  catchmentAreaM2?: number;
  /** 1.6 最大历史积水深度 cm */
  maxHistoricalDepthCm?: number;
  hasHistoricalFlooding?: boolean;
  /** 是否有历史灾情（勾选后展开下列损失数值项） */
  hasHistoricalDisaster?: boolean;
  /** 历史灾情：人员死亡（人） */
  historicalDeathCount?: number;
  /** 历史灾情：人员重伤（人） */
  historicalSeriousInjuryCount?: number;
  /** 历史灾情：人员被困（人） */
  historicalTrappedCount?: number;
  /** 历史灾情：直接经济损失（万元） */
  historicalDirectEconomicLossWan?: number;
  /** 1.7 雨水口/沟布置是否满足规范 */
  rainInletMeetsStandard?: boolean;
  /** 1.8 是否有调蓄池 */
  hasStorageTank?: boolean;
  storageVolumeM3?: number;
  /** 1.9 是否有排涝泵站 */
  hasDrainagePump?: boolean;
  pumpCapacityM3H?: number;
  /** 1.10 是否有监测设施 */
  hasMonitoring: boolean;
  /** 1.11 积水报警装置是否运行正常 */
  alarmDeviceNormal?: boolean;
  /** 1.12 是否有内涝应急预案 */
  hasEmergencyPlan: boolean;
  /** 城市低洼路段：道路纵坡度 S（%），表 5.3.11 */
  roadLongitudinalSlope?: number;
  /** 2.2 地区重要程度 */
  areaImportance: AreaImportance;
  /** 采集人、单位、普查时间（表尾） */
  collectorName?: string;
  collectorUnit?: string;
  /** 普查时间，格式 YYYY-MM-DD HH:mm:ss */
  collectedAt?: string;
  /** 普查附件（PDF，存于备注上方） */
  attachments?: SurveyPdfAttachment[];
  remark?: string;
}

export type AssessmentStatus = 'none' | 'draft' | 'completed';

/** 单指标隐患评估认定（对应附录 F 赋分档） */
export interface IndicatorAssessmentItem {
  ruleId: string;
  remark?: string;
}

/** 隐患评估表（附录 B 第三节「隐患评估结果」支撑材料 + 指标赋分认定） */
export interface HazardAssessmentPayload {
  assessor?: string;
  assessorUnit?: string;
  assessedAt?: string;
  /** 指标 id → 认定赋分档 */
  items: Record<string, IndicatorAssessmentItem>;
  conclusion?: string;
  hasAssessmentSheet?: boolean;
  hasSitePhotos?: boolean;
  hasElevationMap?: boolean;
  remark?: string;
}

export interface SurveyPayload {
  appendixB: AppendixBSurvey;
  indicatorValues: Record<string, string | number | boolean | null>;
}

export type SurveyStatus = 'draft' | 'completed';
export type RatingStatus = 'none' | 'completed';

export interface RatingResult {
  v: number;
  v1: number;
  v2: number;
  v3: number;
  v4: number;
  levelCode: string;
  levelName: string;
  color: string;
  selectedRuleIds: Record<string, string>;
  coverage: { filled: number; applicable: number; percent: number };
  ratedAt: string;
  partial: boolean;
  /** 定级采用的架构版本 id */
  architectureRefId?: string;
  /** 定级采用的架构版本配置时间 */
  architectureRefAt?: string;
  /** 定级采用的架构版本编号 */
  architectureVersionNo?: string;
  /** 定级采用的防灾减灾引用配置时间 */
  preventionRefAt?: string;
  /** 定级采用的防灾减灾版本编号 */
  preventionVersionNo?: string;
  /** 定级采用的风险等级版本 id */
  riskLevelRefId?: string;
  /** 定级采用的风险等级版本配置时间 */
  riskLevelRefAt?: string;
  /** 定级采用的风险等级版本编号 */
  riskLevelVersionNo?: string;
}

/** 风险等级变更类型（由定级更新产生） */
export type RiskChangeType = 'initial' | 'update' | 'upgrade' | 'downgrade' | 'unchanged';

export const RISK_CHANGE_TYPE_LABEL: Record<RiskChangeType, string> = {
  initial: '首次定级',
  update: '等级调整',
  upgrade: '等级升高',
  downgrade: '等级降低',
  unchanged: '结果更新',
};

/** 易涝点风险等级变更日志（内涝普查定级确认时写入） */
export interface RiskChangeLogEntry {
  id: string;
  registryId: string;
  pointCode: string;
  name: string;
  pointType: SurveyPointType;
  /** 关联普查记录 */
  surveyRecordId: string;
  surveyAt: string;
  surveyLabel?: string;
  /** 变更发生时间（与定级时间一致） */
  changeAt: string;
  changeType: RiskChangeType;
  prevLevelCode?: string;
  prevLevelName?: string;
  prevV?: number;
  newLevelCode: string;
  newLevelName: string;
  newColor: string;
  newV: number;
  v1: number;
  v2: number;
  v3: number;
  v4: number;
  partial: boolean;
  /** 是否同步推送了内涝基本信息 */
  basicInfoSynced?: boolean;
  preventionRefAt?: string;
  /** 定级引用的防灾减灾版本编号 */
  preventionVersionNo?: string;
  /** 定级引用的指标架构版本配置时间 */
  architectureRefAt?: string;
  /** 定级引用的指标架构版本编号 */
  architectureVersionNo?: string;
  /** 定级引用的风险等级版本编号 */
  riskLevelVersionNo?: string;
  operator?: string;
  remark?: string;
}

/** 单条指标在架构版本中的启用与权重快照 */
export interface IndicatorArchitectureState {
  weight: number;
  enabled: boolean;
}

/** 指标架构版本配置体 */
export interface IndicatorArchitectureConfig {
  level1Weights: Level1Weights;
  /** 按 indicatorId 快照；未出现的指标视为停用 */
  indicatorStates: Record<string, IndicatorArchitectureState>;
  updatedAt?: string;
  updatedBy?: string;
  /** draft：权重合计未达标；completed：可设为定级引用 */
  status: 'draft' | 'completed';
}

/** 按版本编号维护的指标架构（权重与启用状态）记录 */
export interface IndicatorArchitectureRecord {
  id: string;
  /** 版本编号（列表主键，如 V001） */
  versionNo: string;
  /** 配置时间 */
  configAt: string;
  /** 批次说明（可选） */
  label?: string;
  /** 全县定级引用（仅一条为 true） */
  activeForRating: boolean;
  config: IndicatorArchitectureConfig;
}

export function emptyIndicatorArchitectureConfig(): IndicatorArchitectureConfig {
  return {
    level1Weights: cloneLevel1Weights(),
    indicatorStates: {},
    status: 'draft',
  };
}

export function emptyIndicatorArchitectureRecord(): IndicatorArchitectureRecord {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  return {
    id: `arch-${Date.now()}`,
    versionNo: '',
    configAt: now,
    label: '',
    activeForRating: false,
    config: emptyIndicatorArchitectureConfig(),
  };
}

/** 风险等级版本配置体（V→等级映射快照） */
export interface RiskLevelVersionConfig {
  levels: IndicatorRiskLevelRow[];
  updatedAt?: string;
  updatedBy?: string;
  /** draft：区间校验未通过；completed：可设为定级引用 */
  status: 'draft' | 'completed';
}

/** 按版本编号维护的风险等级映射记录 */
export interface RiskLevelVersionRecord {
  id: string;
  /** 版本编号（如 L001） */
  versionNo: string;
  configAt: string;
  label?: string;
  /** 全县定级引用（仅一条为 true） */
  activeForRating: boolean;
  config: RiskLevelVersionConfig;
}

export function emptyRiskLevelVersionConfig(): RiskLevelVersionConfig {
  return { levels: [], status: 'draft' };
}

export function emptyRiskLevelVersionRecord(): RiskLevelVersionRecord {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  return {
    id: `rlvl-${Date.now()}`,
    versionNo: '',
    configAt: now,
    label: '',
    activeForRating: false,
    config: emptyRiskLevelVersionConfig(),
  };
}

/** 原有系统易涝点主数据（风险普查从此选择，不手工录入基础信息） */
export interface WaterloggingPointRegistryRow {
  id: string;
  pointCode: string;
  name: string;
  pointType: SurveyPointType;
  townCode: string;
  address: string;
  lng?: number;
  lat?: number;
}

export interface WaterloggingPointRow {
  id: string;
  /** 关联主数据 id */
  registryId: string;
  pointCode: string;
  name: string;
  pointType: SurveyPointType;
  townCode: string;
  address: string;
  lng?: number;
  lat?: number;
  surveyStatus: SurveyStatus;
  surveyPayload: SurveyPayload;
  assessmentStatus: AssessmentStatus;
  assessmentPayload: HazardAssessmentPayload;
  ratingStatus: RatingStatus;
  ratingResult?: RatingResult;
  collector?: string;
  collectedAt?: string;
  /** 普查时间（列表主键，与采集信息中的普查时间一致） */
  surveyAt: string;
  /** 批次说明（可选，如汛前复查） */
  label?: string;
  /** 易涝点定级引用的普查快照（同易涝点仅一条为 true） */
  activeForRating: boolean;
  /** 本份普查采用的指标架构版本 id */
  surveyArchitectureRefId?: string;
  /** 本份普查采用的指标架构版本配置时间 */
  surveyArchitectureRefAt?: string;
  /** 本份普查采用的指标架构版本编号 */
  surveyArchitectureVersionNo?: string;
}

/** 全县防灾减灾救灾因子统一配置（不参与单点普查） */
export interface RegionalPreventionConfig {
  indicatorValues: Record<string, string | number | boolean | null>;
  assessmentStatus: AssessmentStatus;
  assessmentPayload: HazardAssessmentPayload;
  updatedAt?: string;
  updatedBy?: string;
}

/** 按时间维度维护的全县防灾减灾配置记录 */
export interface RegionalPreventionRecord {
  id: string;
  /** 防灾减灾版本编号（如 P001） */
  versionNo: string;
  /** 配置时间（列表主键，如 2026-05-19 09:00:00） */
  configAt: string;
  /** 批次说明（可选） */
  label?: string;
  /** 全县 V₄ 数据引用版本（全县仅一条为 true） */
  activeForRating: boolean;
  /** 保存时采用的指标架构版本 id */
  architectureRefId?: string;
  /** 保存时采用的指标架构版本配置时间 */
  architectureRefAt?: string;
  /** 保存时采用的指标架构版本编号 */
  architectureVersionNo?: string;
  config: RegionalPreventionConfig;
}

export type MenuKey =
  | 'risk-indicators'
  | 'indicator-architecture-versions'
  | 'risk-levels'
  | 'prevention-config'
  | 'point-survey'
  | 'point-rating';

export function emptyRegionalPreventionConfig(): RegionalPreventionConfig {
  return {
    indicatorValues: {},
    assessmentStatus: 'none',
    assessmentPayload: emptyAssessmentPayload(),
  };
}

export function emptyRegionalPreventionRecord(): RegionalPreventionRecord {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  return {
    id: `rp-${Date.now()}`,
    versionNo: '',
    configAt: now,
    label: '',
    activeForRating: false,
    config: emptyRegionalPreventionConfig(),
  };
}

export function emptySurveyPayload(): SurveyPayload {
  return {
    appendixB: {
      areaImportance: 'COUNTY_GENERAL',
      hasMonitoring: false,
      hasEmergencyPlan: false,
    },
    indicatorValues: {},
  };
}

export function emptyAssessmentPayload(): HazardAssessmentPayload {
  return {
    items: {},
    hasAssessmentSheet: false,
    hasSitePhotos: false,
    hasElevationMap: false,
  };
}
