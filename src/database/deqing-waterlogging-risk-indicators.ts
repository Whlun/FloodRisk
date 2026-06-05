import type { IndicatorRiskLevelRow, RiskIndicatorRow, ScoreRule } from '../prototypes/deqing-waterlogging-risk/types';
import { buildDefaultScoreExplanation } from '../prototypes/deqing-waterlogging-risk/defaultScoreExplanation';
import { inferScoringRuleModeFromLegacy } from '../prototypes/deqing-waterlogging-risk/scoringRuleMode';
import {
  APPENDIX_F_LL_COLLECT_SLOPE_GT_LABELS,
  APPENDIX_F_LL_COLLECT_SLOPE_LE_LABELS,
  APPENDIX_F_UG_DESIGN_P_LABELS,
  appendixFDrainTypeRules,
  appendixFInterceptRules,
} from '../prototypes/deqing-waterlogging-risk/guidelineSeedBuilders';
import { createGuidelineHistoricalLossEnumRules } from '../prototypes/deqing-waterlogging-risk/guidelineEnumTierTemplates';
import {
  DEFAULT_COMPOSITE_NUMERIC_RANGE,
  TEMPLATE_PEDESTRIAN_ENTRANCE_TIER_BANDS,
  TEMPLATE_VEHICLE_ENTRANCE_TIER_BANDS,
} from '../prototypes/deqing-waterlogging-risk/surveyTemplates';
import { mergePresetNumericBands } from '../prototypes/deqing-waterlogging-risk/scoreRuleNumericBands';

const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

function rules(...items: Omit<ScoreRule, 'id'>[]): ScoreRule[] {
  return items.map((item, i) => ({ ...item, id: `r${i}` }));
}

/** 导则预置数值指标：写入 scoreRules 后补全附录 F 匹配区间 */
function presetNumericRules(code: string, ...items: Omit<ScoreRule, 'id'>[]): ScoreRule[] {
  return mergePresetNumericBands(code, rules(...items));
}

function ind(
  partial: Omit<RiskIndicatorRow, 'updatedAt' | 'enabled' | 'survey'> & {
    enabled?: boolean;
    survey?: RiskIndicatorRow['survey'];
    conditionalScoring?: RiskIndicatorRow['conditionalScoring'];
  },
): RiskIndicatorRow {
  const { scoreRules, survey, scoreExplanation, conditionalScoring, ...rest } = partial;
  const resolvedSurvey =
    survey ?? {
      collectInSurvey: true,
      surveyRequired: false,
      fieldKey: partial.code,
    };
  const rowForExplain = {
    code: partial.code,
    valueType: partial.valueType,
    scoreRules,
    remark: partial.remark,
    survey: resolvedSurvey,
  };
  const base: RiskIndicatorRow = {
    enabled: true,
    updatedAt: now(),
    ...rest,
    scoreExplanation:
      scoreExplanation?.trim() || buildDefaultScoreExplanation(rowForExplain),
    survey: resolvedSurvey,
    scoreRules: scoreRules.map((r, i) => ({ ...r, id: `${partial.id}-r${i}` })),
    conditionalScoring,
    scoringRuleMode: inferScoringRuleModeFromLegacy({
      survey: resolvedSurvey,
      conditionalScoring,
    }),
  };
  return base;
}

/** 附录 E/F 预置风险指标（附录 F 相等间隔法赋分档） */
const RAW_INITIAL_RISK_INDICATORS: RiskIndicatorRow[] = [
  // —— 致灾因子 ——
  ind({
    id: 'ind-hz-01',
    code: 'HZ_RAIN_ALERT_FREQ',
    name: '暴雨预警频次',
    level1: 'HAZARD',
    applicableTypes: ['GLOBAL'],
    weight: 0.164,
    valueType: 'numeric',
    unit: '次/年',
    scoreRules: presetNumericRules(
      'HZ_RAIN_ALERT_FREQ',
      { label: 'N≤8', riskTier: '低', score: 0.25 },
      { label: '8<N≤16', riskTier: '中', score: 0.5 },
      { label: '16<N≤24', riskTier: '较高', score: 0.75 },
      { label: 'N>24', riskTier: '高', score: 1 },
    ),
    remark: '渝气规发〔2023〕1号，以市级应急管理部门暴雨预警频次为评估指标',
  }),
  ind({
    id: 'ind-hz-02',
    code: 'HZ_GUEST_WATER',
    name: '客水接入情况',
    level1: 'HAZARD',
    applicableTypes: ['GLOBAL'],
    weight: 0.539,
    valueType: 'boolean',
    scoreRules: rules(
      { label: '无客水接入', riskTier: '低', score: 0 },
      { label: '存在客水接入', riskTier: '高', score: 1 },
    ),
  }),
  ind({
    id: 'ind-hz-03',
    code: 'HZ_BACKWATER',
    name: '下游顶托情况',
    level1: 'HAZARD',
    applicableTypes: ['GLOBAL'],
    weight: 0.297,
    valueType: 'boolean',
    scoreRules: rules(
      { label: '无下游顶托', riskTier: '低', score: 0 },
      { label: '存在下游顶托', riskTier: '高', score: 1 },
    ),
  }),

  // —— 孕灾：下凹式立交桥/下穿道 ——
  ind({
    id: 'ind-fm-sk-01',
    code: 'FM_SK_LONG_SLOPE',
    name: '纵坡度',
    level1: 'FORMATION',
    applicableTypes: ['SUNKEN'],
    weight: 0.08,
    valueType: 'numeric',
    unit: '%',
    scoreRules: presetNumericRules(
      'FM_SK_LONG_SLOPE',
      { label: 'S<5%', riskTier: '低', score: 0.25 },
      { label: '5≤S<7%', riskTier: '中', score: 0.5 },
      { label: '7%≤S<10%', riskTier: '较高', score: 0.75 },
      { label: 'S≥10%', riskTier: '高', score: 1 },
    ),
  }),
  ind({
    id: 'ind-fm-sk-02',
    code: 'FM_SK_DESIGN_P',
    name: '排水系统设计重现期',
    level1: 'FORMATION',
    applicableTypes: ['SUNKEN'],
    weight: 0.476,
    valueType: 'numeric',
    unit: '年',
    scoreRules: rules(
      { label: 'P≥阈值（低）', riskTier: '低', score: 0 },
      { label: 'P<阈值（高）', riskTier: '高', score: 1 },
    ),
    remark: '表 5.3.3：填重现期年数 P，按附录 B 地区重要程度判定（中心城区 P≥30，其他区县 P≥10）',
  }),
  ind({
    id: 'ind-fm-sk-03',
    code: 'FM_SK_DRAIN_TYPE',
    name: '排水系统类型',
    level1: 'FORMATION',
    applicableTypes: ['SUNKEN'],
    weight: 0.176,
    valueType: 'enum',
    scoreRules: rules(...appendixFDrainTypeRules()),
  }),
  ind({
    id: 'ind-fm-sk-04',
    code: 'FM_SK_INTERCEPT',
    name: '外截内排措施',
    level1: 'FORMATION',
    applicableTypes: ['SUNKEN'],
    weight: 0.268,
    valueType: 'enum',
    scoreRules: rules(...appendixFInterceptRules()),
  }),

  // —— 孕灾：隧道 ——
  ind({
    id: 'ind-fm-tn-01',
    code: 'FM_TN_LONG_SLOPE',
    name: '纵坡度',
    level1: 'FORMATION',
    applicableTypes: ['TUNNEL'],
    weight: 0.122,
    valueType: 'numeric',
    unit: '%',
    scoreRules: presetNumericRules(
      'FM_TN_LONG_SLOPE',
      { label: 'S<1%', riskTier: '低', score: 0.2 },
      { label: '1%≤S<4%', riskTier: '中', score: 0.6 },
      { label: 'S≥4%', riskTier: '高', score: 1 },
    ),
  }),
  ind({
    id: 'ind-fm-tn-02',
    code: 'FM_TN_DRAIN_TYPE',
    name: '排水系统类型',
    level1: 'FORMATION',
    applicableTypes: ['TUNNEL'],
    weight: 0.23,
    valueType: 'enum',
    scoreRules: rules(...appendixFDrainTypeRules()),
  }),
  ind({
    id: 'ind-fm-tn-03',
    code: 'FM_TN_INTERCEPT',
    name: '外截内排措施',
    level1: 'FORMATION',
    applicableTypes: ['TUNNEL'],
    weight: 0.648,
    valueType: 'enum',
    scoreRules: rules(...appendixFInterceptRules()),
  }),

  // —— 孕灾：地下空间 ——
  ind({
    id: 'ind-fm-ug-01',
    code: 'FM_UG_ENTRANCE_H',
    name: '出入口与室外地面高程差',
    level1: 'FORMATION',
    applicableTypes: ['UNDERGROUND'],
    weight: 0.128,
    valueType: 'numeric',
    unit: 'm',
    survey: {
      collectInSurvey: true,
      surveyRequired: true,
      fieldKey: 'FM_UG_ENTRANCE_H',
      inputVariant: 'composite_appendix_numeric',
      compositeAggregation: 'max_f',
      appendixBSurveyParts: [
        {
          appendixBFieldKey: 'pedestrianEntranceElevationDiffM',
          valueFieldKey: 'FM_UG_ENTRANCE_H_PED',
          label: '人行出入口与室外地面高程差（H/m）',
          numericRange: DEFAULT_COMPOSITE_NUMERIC_RANGE,
          tierBands: TEMPLATE_PEDESTRIAN_ENTRANCE_TIER_BANDS,
        },
        {
          appendixBFieldKey: 'vehicleEntranceElevationDiffM',
          valueFieldKey: 'FM_UG_ENTRANCE_H_VEH',
          label: '车行出入口与室外地面高程差（H/m）',
          numericRange: DEFAULT_COMPOSITE_NUMERIC_RANGE,
          tierBands: TEMPLATE_VEHICLE_ENTRANCE_TIER_BANDS,
        },
      ],
    },
    scoreRules: rules(
      { label: '人行/车行均达低风险阈值（取不利档为低）', riskTier: '低', score: 0.2 },
      { label: '人行/车行之一为中风险（取不利档为中）', riskTier: '中', score: 0.6 },
      { label: '人行/车行之一为高风险（取不利档为高）', riskTier: '高', score: 1 },
    ),
  }),
  ind({
    id: 'ind-fm-ug-02',
    code: 'FM_UG_DESIGN_P',
    name: '排水系统设计重现期',
    level1: 'FORMATION',
    applicableTypes: ['UNDERGROUND'],
    weight: 0.532,
    valueType: 'enum',
    scoreRules: rules(
      { label: APPENDIX_F_UG_DESIGN_P_LABELS.meet, riskTier: '低', score: 0 },
      { label: APPENDIX_F_UG_DESIGN_P_LABELS.notMeet, riskTier: '高', score: 1 },
    ),
    remark: '表 5.3.8：按地下空间类型结合相关设计规范判定是否满足设计标准',
  }),
  ind({
    id: 'ind-fm-ug-03',
    code: 'FM_UG_DRAIN_TYPE',
    name: '排水系统类型',
    level1: 'FORMATION',
    applicableTypes: ['UNDERGROUND'],
    weight: 0.083,
    valueType: 'enum',
    scoreRules: rules(...appendixFDrainTypeRules()),
  }),
  ind({
    id: 'ind-fm-ug-04',
    code: 'FM_UG_INTERCEPT',
    name: '外截内排措施',
    level1: 'FORMATION',
    applicableTypes: ['UNDERGROUND'],
    weight: 0.257,
    valueType: 'enum',
    scoreRules: rules(...appendixFInterceptRules()),
  }),

  // —— 孕灾：城市低洼路段 ——
  ind({
    id: 'ind-fm-ll-01',
    code: 'FM_LL_RUNOFF_COEF',
    name: '综合径流系数',
    level1: 'FORMATION',
    applicableTypes: ['LOW_LYING'],
    weight: 0.077,
    valueType: 'numeric',
    unit: '无量纲',
    scoreRules: presetNumericRules(
      'FM_LL_RUNOFF_COEF',
      { label: 'Ψ≤0.45', riskTier: '低', score: 0.5 },
      { label: '0.45<Ψ≤0.6', riskTier: '中', score: 0.75 },
      { label: 'Ψ>0.6', riskTier: '高', score: 1 },
    ),
  }),
  ind({
    id: 'ind-fm-ll-02',
    code: 'FM_LL_DESIGN_P',
    name: '排水系统设计重现期',
    level1: 'FORMATION',
    applicableTypes: ['LOW_LYING'],
    weight: 0.615,
    valueType: 'numeric',
    unit: '年',
    scoreRules: rules(
      { label: 'P≥阈值（低）', riskTier: '低', score: 0 },
      { label: 'P<阈值（高）', riskTier: '高', score: 1 },
    ),
    remark: '填重现期年数 P，按附录 B 地区重要程度判定（中心城区 P≥10，其他乡镇 P≥5）',
  }),
  ind({
    id: 'ind-fm-ll-03',
    code: 'FM_LL_COLLECT',
    name: '雨水收集设施收水能力',
    level1: 'FORMATION',
    applicableTypes: ['LOW_LYING'],
    weight: 0.308,
    valueType: 'enum',
    scoreRules: rules(
      { label: APPENDIX_F_LL_COLLECT_SLOPE_LE_LABELS.ok, riskTier: '低', score: 0 },
      { label: APPENDIX_F_LL_COLLECT_SLOPE_LE_LABELS.bad, riskTier: '高', score: 1 },
      { label: APPENDIX_F_LL_COLLECT_SLOPE_GT_LABELS.surplus, riskTier: '低', score: 0 },
      { label: APPENDIX_F_LL_COLLECT_SLOPE_GT_LABELS.insufficient, riskTier: '高', score: 1 },
    ),
    remark:
      '表 5.3.11：须先填辅助条件再选收水能力分档；条件与赋分须在指标配置中手动完善。',
    survey: {
      collectInSurvey: true,
      surveyRequired: false,
      fieldKey: 'FM_LL_COLLECT',
      inputVariant: 'auxiliary_then_select',
      auxiliaryCondition: {
        fieldKey: 'FM_LL_COLLECT_COND',
        label: '辅助条件',
        unit: '%',
        collectInSurvey: true,
        surveyPlacement: 'indicator_census',
        hint: '辅助条件数值；用于本分档判定。',
        numericRange: {
          min: 0,
          max: 100,
          step: 1,
          precision: 2,
          rangeLabel: '合理范围 0～100',
          hint: '辅助条件数值；用于本分档判定。',
        },
      },
    },
    scoringRuleMode: 'conditional',
  }),

  // —— 承灾因子 ——
  ind({
    id: 'ind-br-01',
    code: 'BR_AREA_IMPORTANCE',
    name: '地区重要性',
    level1: 'BEARING',
    applicableTypes: ['GLOBAL'],
    weight: 0.243,
    valueType: 'enum',
    scoreRules: rules(
      { label: '其他区域', riskTier: '低', score: 0.25 },
      { label: '其他行车道路、附近具有丙类民用建筑工程的区域', riskTier: '中', score: 0.5 },
      { label: '交通干道、附近具有乙类民用建筑工程的区域', riskTier: '较高', score: 0.75 },
      { label: '中心商业、附近具有甲类民用建筑工程的区域', riskTier: '高', score: 1 },
    ),
  }),
  ind({
    id: 'ind-br-02',
    code: 'BR_ROAD_CLASS',
    name: '道路等级',
    level1: 'BEARING',
    applicableTypes: ['GLOBAL'],
    weight: 0.088,
    valueType: 'enum',
    scoreRules: rules(
      { label: '支路', riskTier: '低', score: 0.25 },
      { label: '次干路', riskTier: '中', score: 0.5 },
      { label: '主干路', riskTier: '较高', score: 0.75 },
      { label: '快速路', riskTier: '高', score: 1 },
    ),
  }),
  ind({
    id: 'ind-br-03',
    code: 'BR_HIST_LOSS',
    name: '历史内涝灾情损失',
    level1: 'BEARING',
    applicableTypes: ['GLOBAL'],
    weight: 0.669,
    valueType: 'enum',
    scoreRules: createGuidelineHistoricalLossEnumRules('br-hist'),
    remark: '分级依据历史内涝灾情损失风险等级划分标准（人员死亡/伤亡、重伤、被困、直接经济损失）',
  }),

  // —— 防灾减灾救灾因子 ——
  ind({
    id: 'ind-pr-01',
    code: 'PR_EMERGENCY_PLAN',
    name: '内涝应急预案编制情况',
    level1: 'PREVENTION',
    applicableTypes: ['GLOBAL'],
    weight: 0.042,
    valueType: 'enum',
    scoreRules: rules(
      {
        label: '已编制完善三级应急预案，并形成针对易涝积水点的单点应急预案',
        riskTier: '低',
        score: 0.2,
      },
      { label: '三级应急预案已完成其中两个层级预案编制', riskTier: '中', score: 0.6 },
      { label: '仅完成单一层级排水防涝应急预案编制', riskTier: '高', score: 1 },
    ),
  }),
  ind({
    id: 'ind-pr-02',
    code: 'PR_WARNING_SYSTEM',
    name: '内涝防治预警系统建设情况',
    level1: 'PREVENTION',
    applicableTypes: ['GLOBAL'],
    weight: 0.09,
    valueType: 'enum',
    scoreRules: rules(
      {
        label: '已安装前端物联网监测设备并设置有水位尺和警示标志',
        riskTier: '低',
        score: 0.2,
      },
      { label: '已设置有水位尺和警示标志', riskTier: '中', score: 0.6 },
      { label: '暂无内涝预警相关设施', riskTier: '高', score: 1 },
    ),
  }),
  ind({
    id: 'ind-pr-03',
    code: 'PR_INFO_CHANNEL',
    name: '应急信息发布通道通畅程度',
    level1: 'PREVENTION',
    applicableTypes: ['GLOBAL'],
    weight: 0.026,
    valueType: 'enum',
    scoreRules: rules(
      {
        label: '有权威性的内涝信息发布平台及渠道，信息发布及时、渠道通畅',
        riskTier: '低',
        score: 0.2,
      },
      { label: '内涝信息发布存在延迟', riskTier: '中', score: 0.6 },
      { label: '无权威性的灾害信息发布平台及渠道', riskTier: '高', score: 1 },
    ),
  }),
  ind({
    id: 'ind-pr-04',
    code: 'PR_MATERIAL_RESERVE',
    name: '应急物资储备情况',
    level1: 'PREVENTION',
    applicableTypes: ['GLOBAL'],
    weight: 0.207,
    valueType: 'enum',
    scoreRules: rules(
      { label: '应急物资储备充足', riskTier: '低', score: 0.2 },
      { label: '应急物资储备不足', riskTier: '中', score: 0.6 },
      { label: '无应急物资储备', riskTier: '高', score: 1 },
    ),
  }),
  ind({
    id: 'ind-pr-05',
    code: 'PR_PUMP_CAPACITY',
    name: '城市建成区每平方公里应急强排能力',
    level1: 'PREVENTION',
    applicableTypes: ['GLOBAL'],
    weight: 0.362,
    valueType: 'numeric',
    unit: 'm³/h/km²',
    remark: '数据来源：内涝风险管理-泵站信息-泵站信息-雨水排放能力之和。支持手工修正。',
    scoreRules: presetNumericRules(
      'PR_PUMP_CAPACITY',
      { label: 'B≥60', riskTier: '低', score: 0.2 },
      { label: '20≤B<60', riskTier: '中', score: 0.6 },
      { label: 'B<20', riskTier: '高', score: 1 },
    ),
  }),
  ind({
    id: 'ind-pr-06',
    code: 'PR_RESPONSE_6H',
    name: '6小时响应完成率',
    level1: 'PREVENTION',
    applicableTypes: ['GLOBAL'],
    weight: 0.125,
    valueType: 'numeric',
    unit: '%',
    remark:
      '数据来源：内涝处置-内涝处置管理-积水事件任务-处置信息；各事件处置时长去最短/最长时间后取平均。支持手工修正。',
    scoreRules: presetNumericRules(
      'PR_RESPONSE_6H',
      { label: 'R≥90%', riskTier: '低', score: 0 },
      { label: 'R<90%', riskTier: '高', score: 1 },
    ),
  }),
  ind({
    id: 'ind-pr-07',
    code: 'PR_DISPOSE_2H',
    name: '2小时处置完成率',
    level1: 'PREVENTION',
    applicableTypes: ['GLOBAL'],
    weight: 0.148,
    valueType: 'numeric',
    unit: '%',
    remark:
      '数据来源：内涝处置-内涝处置管理-积水事件任务-处置信息；各事件处置时长去最短/最长时间后取平均。支持手工修正。',
    scoreRules: presetNumericRules(
      'PR_DISPOSE_2H',
      { label: 'D≥90%', riskTier: '低', score: 0 },
      { label: 'D<90%', riskTier: '高', score: 1 },
    ),
  }),
];

export const initialRiskIndicators: RiskIndicatorRow[] = RAW_INITIAL_RISK_INDICATORS;

/** 表 5.6.1 指标体系法等级 */
export const initialIndicatorRiskLevels: IndicatorRiskLevelRow[] = [
  {
    id: 'lvl-low',
    levelCode: 'LOW',
    levelName: '低风险',
    color: '#52c41a',
    scoreMin: 0,
    scoreMax: 0.3,
    sort: 1,
    description: '内涝风险评估分数 V<0.3',
    enabled: true,
    builtin: true,
  },
  {
    id: 'lvl-med',
    levelCode: 'MEDIUM',
    levelName: '中风险',
    color: '#fa8c16',
    scoreMin: 0.3,
    scoreMax: 0.6,
    sort: 2,
    description: '0.3≤V<0.6',
    enabled: true,
    builtin: true,
  },
  {
    id: 'lvl-high',
    levelCode: 'HIGH',
    levelName: '高风险',
    color: '#f5222d',
    scoreMin: 0.6,
    scoreMax: 1.01,
    sort: 3,
    description: 'V≥0.6',
    enabled: true,
    builtin: true,
  },
];

/** 德清县级区划码（新增普查时选「德清县」表示全县易涝点） */
export const DEQING_COUNTY_CODE = '330521';

/** 德清乡镇（筛选演示） */
export const DEQING_TOWN_OPTIONS = [
  { value: '330521001', label: '武康街道' },
  { value: '330521002', label: '舞阳街道' },
  { value: '330521003', label: '乾元镇' },
  { value: '330521004', label: '新市镇' },
  { value: '330521005', label: '洛舍镇' },
  { value: '330521006', label: '钟管镇' },
  { value: '330521007', label: '雷甸镇' },
  { value: '330521008', label: '禹越镇' },
  { value: '330521009', label: '新安镇' },
  { value: '330521010', label: '莫干山镇' },
  { value: '330521011', label: '下渚湖街道' },
  { value: '330521012', label: '阜溪街道' },
];

/** 新增普查 · 所属区划（含全县） */
export const CREATE_SURVEY_DIVISION_OPTIONS = [
  { value: DEQING_COUNTY_CODE, label: '德清县' },
  ...DEQING_TOWN_OPTIONS,
];
