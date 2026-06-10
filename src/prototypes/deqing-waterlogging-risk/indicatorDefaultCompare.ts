import {
  HAZARD_POINT_TYPE_LABEL,
  LEVEL1_FACTOR_LABEL,
  type HazardPointType,
  type RiskIndicatorInitSnapshot,
  type RiskIndicatorRow,
  type ScoreRule,
} from './types';
import { formatScoreRuleSummary } from './scoreRuleDisplay';

export interface IndicatorFieldDiff {
  field: string;
  label: string;
  defaultValue: string;
  currentValue: string;
  changed: boolean;
}

function formatTypes(types: HazardPointType[]): string {
  return types.map(t => HAZARD_POINT_TYPE_LABEL[t]).join('、');
}

function formatScoreRules(rules: ScoreRule[]): string {
  if (!rules.length) return '—';
  return rules.map(r => formatScoreRuleSummary(r)).join('；');
}

function formatSurvey(row: RiskIndicatorRow): string {
  const s = row.survey;
  if (!s) return '—';
  const parts = [
    s.collectInSurvey ? '参与普查' : '不参与普查',
    s.surveyRequired ? '必填' : '非必填',
    `字段键 ${s.fieldKey}`,
  ];
  if (s.placeholder) parts.push(`占位 ${s.placeholder}`);
  return parts.join('；');
}

function rulesEqual(a: ScoreRule[], b: ScoreRule[]): boolean {
  if (a.length !== b.length) return false;
  const norm = (rules: ScoreRule[]) =>
    [...rules]
      .map(r => `${r.label}|${r.score}`)
      .sort()
      .join(';;');
  return norm(a) === norm(b);
}

function typesEqual(a: HazardPointType[], b: HazardPointType[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort().join(',');
  const sb = [...b].sort().join(',');
  return sa === sb;
}

export type IndicatorSourceKind = 'preset' | 'new';

export const INDICATOR_SOURCE_LABEL: Record<IndicatorSourceKind, string> = {
  preset: '预置',
  new: '新增',
};

export type IndicatorDataStatus = 'default' | 'corrected' | 'manual';

export const INDICATOR_DATA_STATUS_LABEL: Record<IndicatorDataStatus, string> = {
  default: '默认',
  corrected: '修正',
  manual: '手工',
};

export const INDICATOR_DATA_STATUS_COLOR: Record<IndicatorDataStatus, string | undefined> = {
  default: undefined,
  corrected: 'orange',
  manual: 'blue',
};

/** 对比与恢复用的初始化快照；写入后优先于导则预置作为对比基准 */
export function createInitSnapshot(row: RiskIndicatorRow): RiskIndicatorInitSnapshot {
  return {
    code: row.code,
    name: row.name,
    level1: row.level1,
    applicableTypes: [...row.applicableTypes],
    weight: row.weight,
    valueType: row.valueType,
    unit: row.unit,
    scoreRules: row.scoreRules.map(r => ({ ...r })),
    scoreExplanation: row.scoreExplanation,
    scoringRuleMode: row.scoringRuleMode,
    remark: row.remark,
    enabled: row.enabled,
    survey: { ...row.survey },
  };
}

export function rowFromInitSnapshot(
  current: RiskIndicatorRow,
  snapshot: RiskIndicatorInitSnapshot,
): RiskIndicatorRow {
  return {
    ...current,
    ...snapshot,
    applicableTypes: [...snapshot.applicableTypes],
    scoreRules: snapshot.scoreRules.map(r => ({ ...r })),
    survey: { ...snapshot.survey },
  };
}

/** 导则预置种子基准（不受本地 initSnapshot 影响） */
export function getGuidelineBaseline(
  current: RiskIndicatorRow,
  defaults: RiskIndicatorRow[],
): RiskIndicatorRow | undefined {
  return getBaselineIndicator(current, defaults);
}

export function getCompareBaseline(
  current: RiskIndicatorRow,
  defaults: RiskIndicatorRow[],
): RiskIndicatorRow | undefined {
  if (current.initSnapshot) {
    return rowFromInitSnapshot(current, current.initSnapshot);
  }
  return getGuidelineBaseline(current, defaults);
}

export function getIndicatorSource(
  row: RiskIndicatorRow,
  defaults: RiskIndicatorRow[],
): IndicatorSourceKind {
  return isBuiltinIndicator(row, defaults) ? 'preset' : 'new';
}

/** 列表「数据状态」：相对初始化基准是否已修正（无基准时视为默认） */
export function isIndicatorDataCorrected(
  current: RiskIndicatorRow,
  defaults: RiskIndicatorRow[],
): boolean {
  const baseline = getCompareBaseline(current, defaults);
  if (!baseline) return false;
  return isIndicatorModified(current, baseline);
}

/**
 * 列表「数据状态」三态：
 * - 手工：用户新增指标，尚未「设置为默认值」
 * - 修正：相对初始化基准已调整
 * - 默认：已与初始化基准一致（含新增指标设置默认值后）
 */
export function getIndicatorDataStatus(
  current: RiskIndicatorRow,
  defaults: RiskIndicatorRow[],
): IndicatorDataStatus {
  const isNew = getIndicatorSource(current, defaults) === 'new';
  const baseline = getCompareBaseline(current, defaults);
  if (isNew && !baseline) {
    return 'manual';
  }
  if (isIndicatorDataCorrected(current, defaults)) {
    return 'corrected';
  }
  return 'default';
}

/** 是否与初始化默认值存在差异 */
export function isIndicatorModified(current: RiskIndicatorRow, baseline: RiskIndicatorRow | undefined): boolean {
  if (!baseline) return false;
  if (current.code !== baseline.code) return true;
  if (current.name !== baseline.name) return true;
  if (current.level1 !== baseline.level1) return true;
  if (!typesEqual(current.applicableTypes, baseline.applicableTypes)) return true;
  if (current.valueType !== baseline.valueType) return true;
  if ((current.unit ?? '') !== (baseline.unit ?? '')) return true;
  if ((current.remark ?? '') !== (baseline.remark ?? '')) return true;
  if ((current.scoreExplanation ?? '') !== (baseline.scoreExplanation ?? '')) return true;
  if (!rulesEqual(current.scoreRules, baseline.scoreRules)) return true;
  const cs = current.survey;
  const bs = baseline.survey;
  if (cs.collectInSurvey !== bs.collectInSurvey) return true;
  if (cs.surveyRequired !== bs.surveyRequired) return true;
  if (cs.fieldKey !== bs.fieldKey) return true;
  if ((cs.placeholder ?? '') !== (bs.placeholder ?? '')) return true;
  return false;
}

export function getBaselineIndicator(
  current: RiskIndicatorRow,
  defaults: RiskIndicatorRow[],
): RiskIndicatorRow | undefined {
  return defaults.find(d => d.id === current.id) ?? defaults.find(d => d.code === current.code);
}

/** 是否为导则预置（内置）指标 */
export function isBuiltinIndicator(
  row: RiskIndicatorRow,
  defaults: RiskIndicatorRow[],
): boolean {
  return getBaselineIndicator(row, defaults) !== undefined;
}

export interface IndicatorDeleteCheck {
  allowed: boolean;
  reason?: string;
}

/** 用户新增指标须已停用方可删除；内置指标不可删除 */
export function checkIndicatorDeletable(
  row: RiskIndicatorRow,
  defaults: RiskIndicatorRow[],
): IndicatorDeleteCheck {
  if (isBuiltinIndicator(row, defaults)) {
    return { allowed: false, reason: '内置指标不可删除，请先在指标评价管理中停用' };
  }
  if (row.enabled) {
    return { allowed: false, reason: '请先停用该指标后再删除' };
  }
  return { allowed: true };
}

export function buildIndicatorFieldDiffs(
  current: RiskIndicatorRow,
  baseline: RiskIndicatorRow | undefined,
): IndicatorFieldDiff[] {
  if (!baseline) {
    return [];
  }

  const rows: Array<{
    field: string;
    label: string;
    def: string;
    cur: string;
    changed: boolean;
  }> = [
    { field: 'code', label: '指标编码', def: baseline.code, cur: current.code, changed: current.code !== baseline.code },
    { field: 'name', label: '指标名称', def: baseline.name, cur: current.name, changed: current.name !== baseline.name },
    {
      field: 'level1',
      label: '一级因子',
      def: LEVEL1_FACTOR_LABEL[baseline.level1],
      cur: LEVEL1_FACTOR_LABEL[current.level1],
      changed: current.level1 !== baseline.level1,
    },
    {
      field: 'applicableTypes',
      label: '适用类型',
      def: formatTypes(baseline.applicableTypes),
      cur: formatTypes(current.applicableTypes),
      changed: !typesEqual(current.applicableTypes, baseline.applicableTypes),
    },
    {
      field: 'valueType',
      label: '值类型',
      def: baseline.valueType,
      cur: current.valueType,
      changed: current.valueType !== baseline.valueType,
    },
    {
      field: 'unit',
      label: '单位',
      def: baseline.unit || '—',
      cur: current.unit || '—',
      changed: (current.unit ?? '') !== (baseline.unit ?? ''),
    },
    {
      field: 'remark',
      label: '说明',
      def: baseline.remark || '—',
      cur: current.remark || '—',
      changed: (current.remark ?? '') !== (baseline.remark ?? ''),
    },
    {
      field: 'scoreExplanation',
      label: '赋分说明',
      def: baseline.scoreExplanation || '—',
      cur: current.scoreExplanation || '—',
      changed: (current.scoreExplanation ?? '') !== (baseline.scoreExplanation ?? ''),
    },
    {
      field: 'scoreRules',
      label: '赋分规则',
      def: formatScoreRules(baseline.scoreRules),
      cur: formatScoreRules(current.scoreRules),
      changed: !rulesEqual(current.scoreRules, baseline.scoreRules),
    },
    {
      field: 'survey',
      label: '普查关联',
      def: formatSurvey(baseline),
      cur: formatSurvey(current),
      changed: formatSurvey(current) !== formatSurvey(baseline),
    },
  ];

  return rows.map(r => ({
    field: r.field,
    label: r.label,
    defaultValue: r.def,
    currentValue: r.cur,
    changed: r.changed,
  }));
}

export function countChangedFields(diffs: IndicatorFieldDiff[]): number {
  return diffs.filter(d => d.changed && d.field !== '_new').length;
}
