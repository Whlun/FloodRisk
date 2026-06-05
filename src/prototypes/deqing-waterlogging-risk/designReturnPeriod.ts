import type { Rule } from 'antd/es/form';
import type { FormInstance } from 'antd/es/form';
import type { AreaImportance, RiskIndicatorRow, ScoreRule } from './types';
import {
  getConditionMissingMessage,
  isConditionalScoringEnabled,
  matchScoreRuleWithConditional,
  formatBranchIndicatorValueMatch,
  resolveBranchIndicatorValueMatch,
} from './conditionalScoring';
import { getIndicatorSurveyValue } from './indicatorSurveyUtils';
import { getNumericRangeError } from './numericIndicatorConstraints';

/** 表 5.3.3 固定两档赋分（低/高），阈值随附录 B 地区重要程度变化 */
export const DEFAULT_DESIGN_PERIOD_SCORE_RULES: Omit<ScoreRule, 'id'>[] = [
  { label: 'P≥阈值（低风险）', riskTier: '低', score: 0 },
  { label: 'P<阈值（高风险）', riskTier: '高', score: 1 },
];

export interface DesignPeriodZoneRow {
  zoneLabel: string;
  lowCondition: string;
  highCondition: string;
}

/** 赋分规则 Tab 用：按指标编码展示中心城区 / 其他区县（乡镇）阈值矩阵 */
export function getDesignPeriodScoreMatrix(code: string): {
  tableTitle: string;
  zones: DesignPeriodZoneRow[];
  appendixNote: string;
} {
  if (code === 'FM_LL_DESIGN_P') {
    return {
      tableTitle: '排水系统设计重现期',
      zones: [
        { zoneLabel: '中心城区', lowCondition: 'P≥10', highCondition: 'P<10' },
        { zoneLabel: '其他乡镇', lowCondition: 'P≥5', highCondition: 'P<5' },
      ],
      appendixNote:
        '附录 B「地区重要程度」选项 1、2 为中心城区，选项 3 为其他乡镇；普查填 P（年）后按上表自动匹配低/高档。',
    };
  }
  return {
    tableTitle: '排水系统设计重现期',
    zones: [
      { zoneLabel: '中心城区', lowCondition: 'P≥30', highCondition: 'P<30' },
      { zoneLabel: '其他区县', lowCondition: 'P≥10', highCondition: 'P<10' },
    ],
    appendixNote:
      '附录 B「地区重要程度」选项 1、2 为中心城区，选项 3 为其他区县；普查填 P（年）后按上表自动匹配低/高档。',
  };
}

export function getDesignPeriodRulesTabHint(code: string): string {
  if (code === 'FM_LL_DESIGN_P') {
    return '低洼路段：各条件分支配置低风险阈值与赋分档；填报 P 与阈值比较后匹配对应分支档位。';
  }
  return '各条件分支配置低风险阈值与赋分档；填报 P 与阈值比较后匹配对应分支档位。';
}

/** 排水重现期导则预置：单分支默认两档（含 P 表述，仅用于该指标预置数据） */
export function createDesignPeriodBranchScoreRules(branchId: string): ScoreRule[] {
  return DEFAULT_DESIGN_PERIOD_SCORE_RULES.map((r, i) => ({
    ...r,
    id: `${branchId}-dp${i}`,
  }));
}

export function createDesignPeriodScoreRules(idPrefix: string): ScoreRule[] {
  return DEFAULT_DESIGN_PERIOD_SCORE_RULES.map((r, i) => ({
    ...r,
    id: `${idPrefix}-dp${i}`,
  }));
}

/** @deprecated 条件赋分已改为各分支独立赋分档；保留供旧数据合并 */
export function ensureDesignPeriodScoreRules(
  rules: ScoreRule[] | undefined,
  idPrefix: string,
): ScoreRule[] {
  if (!rules?.length) return createDesignPeriodScoreRules(idPrefix);
  return rules.map((r, i) => ({ ...r, id: r.id || `${idPrefix}-dp${i}` }));
}

export const DESIGN_PERIOD_CODES = new Set(['FM_SK_DESIGN_P', 'FM_LL_DESIGN_P']);

export function isDesignReturnPeriodCode(code: string): boolean {
  return DESIGN_PERIOD_CODES.has(code);
}

/** 附录 B 选项 1、2 为中心城区，3 为其他区县/乡镇 */
export function isCentralUrbanArea(area: AreaImportance): boolean {
  return area === 'COUNTY_KEY' || area === 'COUNTY_GENERAL';
}

/** 表 5.3.3 / 低洼路段导则：按地区返回低风险档 P 的下限（年） */
export function getDesignPeriodThreshold(code: string, area: AreaImportance): number {
  if (code === 'FM_LL_DESIGN_P') {
    return isCentralUrbanArea(area) ? 10 : 5;
  }
  return isCentralUrbanArea(area) ? 30 : 10;
}

export function formatDesignPeriodThresholdHint(code: string, area: AreaImportance): string {
  const t = getDesignPeriodThreshold(code, area);
  const zone = isCentralUrbanArea(area) ? '中心城区' : code === 'FM_LL_DESIGN_P' ? '其他乡镇' : '其他区县';
  return `${zone}：P≥${t} 年为低风险，P<${t} 年为高风险`;
}

export function formatDesignPeriodFieldHint(code: string): string {
  if (code === 'FM_LL_DESIGN_P') {
    return '填重现期年数 P（年）。按附录 B 地区重要程度：中心城区（选项1、2）P≥10 为低，其他乡镇（选项3）P≥5 为低。';
  }
  return '填重现期年数 P（年）。按附录 B 地区重要程度：中心城区（选项1、2）P≥30 为低，其他区县（选项3）P≥10 为低。';
}

/** 根据 P 与地区重要程度匹配赋分档 */
export function matchDesignReturnPeriodRule(
  ind: RiskIndicatorRow,
  p: number,
  areaImportance: AreaImportance | undefined,
): ScoreRule | null {
  if (isConditionalScoringEnabled(ind)) {
    return matchScoreRuleWithConditional(ind, p, { areaImportance });
  }
  if (!areaImportance) return null;
  const rules = ind.scoreRules;
  const threshold = getDesignPeriodThreshold(ind.code, areaImportance);
  const isLow = p >= threshold;
  return rules.find(r => (isLow && r.score <= 0.1) || (!isLow && r.score >= 0.9)) ?? rules[isLow ? 0 : 1] ?? null;
}

export function getDesignPeriodAreaMissingMessage(ind?: RiskIndicatorRow): string {
  if (ind && isConditionalScoringEnabled(ind)) return getConditionMissingMessage(ind);
  return '请先在「基本信息」中填写「地区重要程度」后再填重现期';
}

export function formatDesignPeriodThresholdHintForIndicator(
  ind: RiskIndicatorRow,
  area: AreaImportance,
): string {
  const cfg = ind.conditionalScoring;
  if (cfg?.enabled && cfg.mode === 'branch_threshold') {
    const branch = cfg.branches.find(b => b.matchValues?.includes(area));
    const valueMatch = branch ? resolveBranchIndicatorValueMatch(branch) : undefined;
    if (valueMatch) {
      return `${branch!.label}：${formatBranchIndicatorValueMatch(valueMatch)}`;
    }
  }
  return formatDesignPeriodThresholdHint(ind.code, area);
}

/** 重现期 / 地区重要程度条件：数值范围 + 须已填附录 B 地区重要程度 */
export function createDesignPeriodFormRules(
  ind: RiskIndicatorRow,
  form?: Pick<FormInstance, 'getFieldValue'>,
): Rule[] {
  if (!isDesignReturnPeriodCode(ind.code) && !isConditionalScoringEnabled(ind)) return [];
  if (isConditionalScoringEnabled(ind) && ind.conditionalScoring?.source.key !== 'areaImportance') {
    return [];
  }
  const rules: Rule[] = [];
  if (ind.valueType === 'numeric' || isDesignReturnPeriodCode(ind.code)) {
    rules.push({
      validateTrigger: ['onChange', 'onBlur'],
      validator: async (_, value) => {
        if (value === undefined || value === null || value === '') return;
        const err = getNumericRangeError(ind.code, value);
        if (err) throw new Error(err);
      },
    });
  }
  rules.push({
    validateTrigger: ['onChange', 'onBlur'],
    validator: async (_, value) => {
      if (value === undefined || value === null || value === '') return;
      const area = form?.getFieldValue(['surveyPayload', 'appendixB', 'areaImportance']);
      if (!area) throw new Error(getDesignPeriodAreaMissingMessage(ind));
    },
  });
  return rules;
}

/** 保存前批量校验重现期指标 */
export function collectDesignPeriodErrors(
  indicators: RiskIndicatorRow[],
  values: Record<string, string | number | boolean | null> | undefined,
  areaImportance: AreaImportance | undefined,
): string[] {
  const errors: string[] = [];
  if (!values) return errors;
  for (const ind of indicators) {
    if (!isDesignReturnPeriodCode(ind.code) && !isConditionalScoringEnabled(ind)) continue;
    const raw = getIndicatorSurveyValue(values, ind.survey.fieldKey);
    if (raw === undefined || raw === null || raw === '') continue;
    const rangeErr = getNumericRangeError(ind.code, raw);
    if (rangeErr) {
      errors.push(`${ind.name}：${rangeErr}`);
      continue;
    }
    if (!areaImportance) {
      errors.push(`${ind.name}：${getDesignPeriodAreaMissingMessage(ind)}`);
      continue;
    }
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
    if (Number.isNaN(n) || !matchDesignReturnPeriodRule(ind, n, areaImportance)) {
      errors.push(`${ind.name}：无法根据 P 与地区重要程度匹配赋分档`);
    }
  }
  return errors;
}
