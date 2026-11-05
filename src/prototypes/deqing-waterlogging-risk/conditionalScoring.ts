import type {
  AreaImportance,
  BranchNumericMatch,
  ConditionalScoreBranch,
  ConditionalScoringConfig,
  ConditionalScoringMode,
  HazardPointType,
  SurveyPointType,
  RiskIndicatorRow,
  ScoreConditionSource,
  ScoreRule,
} from './types';
import { AREA_IMPORTANCE_LABEL } from './types';
import {
  buildAuxiliaryConditionalFromIndicator,
  findIndicatorByAuxiliaryFieldKey,
  formatAppendixAuxiliaryConditionLabel,
  getAuxiliaryCondition,
  getAuxiliaryConditionOption,
  getAuxiliaryNumericFromValues,
  hasAuxiliaryConditionSurvey,
  indicatorAppliesToSurveyPointType,
  listAppendixAuxiliaryConditionSources,
  isAppendixBasicInfoIndicatorValueKey,
  isAppendixBasicInfoNumericAuxiliaryKey,
  isAuxiliaryConditionFieldKey,
  resolveAuxiliaryConditionSource,
  isSelfAuxiliaryConditionFieldKey,
  resolveAuxiliaryDisplayLabel,
  resolveAuxiliaryFieldLabel,
  resolvePrimarySurveyPointType,
  shouldCollectAuxiliaryInAppendixB,
} from './compositeConditionalSurvey';
import { HAZARD_POINT_TYPE_LABEL } from './types';
import { alignAuxiliaryConditionalOnRow } from './auxiliaryIndicatorDefaults';
import { isFormationLevel1 } from './indicatorApplicableTypes';
import {
  appendixBConditionFieldUsesDiscreteMatch,
  COMMON_APPENDIX_CONDITION_FIELDS,
  findAppendixBConditionField,
  formatAppendixPointTypeConditionLabel,
  formatCommonAppendixConditionLabel,
  isAppendixPointTypeConditionFieldKey,
  listAppendixBConditionFieldsForPointType,
  resolveAppendixBFixedFieldLabel,
} from './appendixBConditionFields';
import { buildBooleanSurveyOptions } from './booleanSurveyOptions';
import { createDesignPeriodBranchScoreRules, isDesignReturnPeriodCode } from './designReturnPeriod';
import { getScoreRuleLimits } from './indicatorValueTypeUtils';
import {
  enrichIndicatorSurvey,
  getIndicatorSurveyScope,
  getRegionalPreventionIndicators,
  mergeIndicatorSurveyConfig,
} from './indicatorSurveyUtils';
import type { ConditionalFormVariant } from './conditionalFormPaths';
import { getConditionSourceWatchPath } from './conditionalFormPaths';
import { formatBranchNumericMatch, matchNumericCondition } from './branchNumericMatch';
import {
  hasConfiguredNumericBands,
  matchScoreRuleByNumericBands,
  validateNumericMatchCoverage,
  validateNumericUniformBands,
} from './scoreRuleNumericBands';

/** 条件赋分方式（通用文案） */
export const CONDITIONAL_SCORING_MODE_LABEL: Record<ConditionalScoringMode, string> = {
  branch_threshold: '按条件数值切换分档表',
  branch_rules: '按条件取值选不同下拉项',
};

export const CONDITIONAL_SCORING_MODE_HINT: Record<ConditionalScoringMode, string> = {
  branch_threshold:
    '先根据条件字段命中分支，再按本指标填报值与各档匹配区间自动匹配标准分 F（与数值分档一致）。',
  branch_rules: '先根据条件字段取值命中分支，普查/配置填报展示该分支下的下拉选项。',
};

/** 分支条件数值比较（辅助条件 numericMatch、填报值 indicatorValueMatch、旧 numericThreshold） */
export function resolveBranchIndicatorValueMatch(
  branch: ConditionalScoreBranch,
): BranchNumericMatch | undefined {
  if (branch.numericMatch) return branch.numericMatch;
  if (branch.indicatorValueMatch) return branch.indicatorValueMatch;
  if (branch.numericThreshold !== undefined && !Number.isNaN(branch.numericThreshold)) {
    return { kind: 'gte', value: branch.numericThreshold };
  }
  return undefined;
}

export function formatBranchIndicatorValueMatch(match: BranchNumericMatch): string {
  return `填报值 ${formatBranchNumericMatch(match)}`;
}

/** 数值比较条件赋分：各分支默认可编辑的两档（与具体指标无关） */
export const DEFAULT_BRANCH_THRESHOLD_SCORE_RULES: Omit<ScoreRule, 'id'>[] = [
  { label: '满足比较条件', riskTier: '低', score: 0 },
  { label: '不满足比较条件', riskTier: '高', score: 1 },
];

/** 新建条件分支时的默认赋分档 */
export function createDefaultBranchThresholdScoreRules(branchId: string): ScoreRule[] {
  return DEFAULT_BRANCH_THRESHOLD_SCORE_RULES.map((r, i) => ({
    ...r,
    id: `${branchId}-th${i}`,
  }));
}

/** 补齐分支内填报值比较字段 */
export function normalizeBranchIndicatorValueMatch(
  branch: ConditionalScoreBranch,
): ConditionalScoreBranch {
  const match = resolveBranchIndicatorValueMatch(branch);
  if (!match) return branch;
  return {
    ...branch,
    indicatorValueMatch: match,
    numericThreshold: undefined,
  };
}
/** 风险普查「基本信息」Tab 中可作为条件来源的字段 */
export const SURVEY_BASIC_INFO_CONDITION_FIELDS: { key: string; label: string }[] = [
  { key: 'areaImportance', label: '地区重要程度' },
];

/** @deprecated 使用 SURVEY_BASIC_INFO_CONDITION_FIELDS */
export const APPENDIX_B_CONDITION_FIELDS = SURVEY_BASIC_INFO_CONDITION_FIELDS;

export const SURVEY_BASIC_INFO_SOURCE_LABEL = '内涝基本信息';

/** 条件字段解析上下文（新建指标可无编码，仅凭一级因子与适用类型） */
export type BasicInfoConditionFieldContext = Pick<
  RiskIndicatorRow,
  'level1' | 'applicableTypes' | 'code' | 'survey'
>;

/** 解析当前编辑指标（表单/列表中的 survey 为准，与指标库同编码行合并） */
function resolveSelfForBasicInfoConditions(
  self: BasicInfoConditionFieldContext | undefined,
  allIndicators?: RiskIndicatorRow[],
  fallback?: BasicInfoConditionFieldContext,
): RiskIndicatorRow | undefined {
  const merged: BasicInfoConditionFieldContext | undefined = self
    ? {
        level1: self.level1 ?? fallback?.level1,
        applicableTypes: self.applicableTypes?.length
          ? self.applicableTypes
          : fallback?.applicableTypes ?? [],
        code: self.code ?? fallback?.code,
        survey: self.survey ?? fallback?.survey,
      }
    : fallback;
  if (!merged?.level1) return undefined;
  const hit = merged.code ? allIndicators?.find(i => i.code === merged.code) : undefined;
  const types = merged.applicableTypes?.length
    ? merged.applicableTypes
    : hit?.applicableTypes ?? [];
  if (!hit) {
    return { ...merged, applicableTypes: types } as RiskIndicatorRow;
  }
  return {
    ...hit,
    ...merged,
    applicableTypes: types,
    survey: mergeIndicatorSurveyConfig(
      { ...hit, ...merged, applicableTypes: types } as RiskIndicatorRow,
      hit,
    ),
  };
}

function enrichIndicatorForConditionSource(
  ind: RiskIndicatorRow,
  pool: RiskIndicatorRow[],
  baseline?: RiskIndicatorRow[],
): RiskIndicatorRow {
  const catalog = baseline?.length ? baseline : pool;
  const base = catalog.find(b => b.id === ind.id || b.code === ind.code);
  return base ? enrichIndicatorSurvey(ind, base) : enrichIndicatorSurvey(ind);
}

/** 条件下拉：同一 fieldKey 只保留一条，优先中文标签（非裸字段键） */
export function dedupeConditionFieldOptions(
  options: { value: string; label: string }[],
): { value: string; label: string }[] {
  const byValue = new Map<string, { value: string; label: string }>();
  const pickPreferred = (
    a: { value: string; label: string },
    b: { value: string; label: string },
  ) => {
    const aRaw = a.label.trim() === a.value;
    const bRaw = b.label.trim() === b.value;
    if (aRaw && !bRaw) return b;
    if (!aRaw && bRaw) return a;
    return a.label.length >= b.label.length ? a : b;
  };
  for (const opt of options) {
    const key = opt.value?.trim();
    if (!key) continue;
    const hit = byValue.get(key);
    byValue.set(key, hit ? pickPreferred(hit, opt) : opt);
  }
  return Array.from(byValue.values());
}

/** 选项标签仍为裸字段键时，解析为中文展示名 */
export function enrichConditionFieldOptionLabels(
  options: { value: string; label: string }[],
  scope: 'point' | 'region',
  indicators: RiskIndicatorRow[],
  selfCode?: string,
  selfDraft?: Pick<RiskIndicatorRow, 'survey' | 'applicableTypes' | 'code'>,
): { value: string; label: string }[] {
  return options.map(opt => {
    const value = opt.value?.trim() ?? '';
    const label = opt.label?.trim() ?? '';
    if (!value || (label && label !== value)) return opt;
    return {
      value,
      label: resolveConditionFieldLabel(value, scope, indicators, selfCode, selfDraft),
    };
  });
}

/** 保证当前 source.key 在选项中且带中文 label（Select 回显兜底） */
export function ensureConditionFieldOption(
  options: { value: string; label: string }[],
  sourceKey: string | undefined,
  resolveLabel: (key: string) => string,
): { value: string; label: string }[] {
  const key = sourceKey?.trim();
  if (!key) return options;
  const hit = options.find(o => o.value === key);
  if (hit?.label?.trim() && hit.label.trim() !== hit.value) return options;
  const label = resolveLabel(key);
  const rest = options.filter(o => o.value !== key);
  return [{ value: key, label: label.trim() || '辅助条件' }, ...rest];
}

/** 本指标辅助条件置顶，并覆盖同 fieldKey 的裸英文标签 */
export function prependSelfAuxiliaryConditionOption(
  options: { value: string; label: string }[],
  self?: Pick<RiskIndicatorRow, 'survey' | 'applicableTypes'>,
): { value: string; label: string }[] {
  const aux = self?.survey?.auxiliaryCondition;
  if (!aux?.fieldKey?.trim()) return options;
  const key = aux.fieldKey.trim();
  const label =
    aux.surveyPlacement === 'appendix_b'
      ? formatAppendixAuxiliaryConditionLabel(aux, self?.applicableTypes ?? [])
      : resolveAuxiliaryDisplayLabel(aux, self?.applicableTypes ?? ['GLOBAL']);
  const rest = options.filter(o => o.value !== key);
  return [{ value: key, label }, ...rest];
}

/** 内涝基本信息 Tab 可作为条件来源的字段 */
export function getSurveyBasicInfoConditionFieldOptions(
  self?: BasicInfoConditionFieldContext,
  allIndicators?: RiskIndicatorRow[],
  formContext?: BasicInfoConditionFieldContext,
  baselineIndicators?: RiskIndicatorRow[],
): { value: string; label: string }[] {
  const base = SURVEY_BASIC_INFO_CONDITION_FIELDS.map(f => ({ value: f.key, label: f.label }));
  const row = resolveSelfForBasicInfoConditions(self, allIndicators, formContext);
  const options = [...base];
  const seenKeys = new Set(options.map(o => o.value));
  const seenLabels = new Set(options.map(o => o.label));

  const pushAux = (aux: NonNullable<ReturnType<typeof getAuxiliaryCondition>>, types: HazardPointType[]) => {
    if (aux?.surveyPlacement !== 'appendix_b') return;
    const label = formatAppendixAuxiliaryConditionLabel(aux, types);
    if (seenKeys.has(aux.fieldKey) || seenLabels.has(label)) return;
    seenKeys.add(aux.fieldKey);
    seenLabels.add(label);
    options.push({ value: aux.fieldKey, label });
  };

  if (row?.survey && shouldCollectAuxiliaryInAppendixB(row)) {
    const aux = getAuxiliaryCondition(row) ?? row.survey.auxiliaryCondition;
    if (aux?.fieldKey && aux.surveyPlacement === 'appendix_b') pushAux(aux, row.applicableTypes);
  }

  // 四种易涝点类型共用的历史灾情数值项（单点普查指标均可引用）
  if (row?.level1 && row.level1 !== 'PREVENTION') {
    for (const field of COMMON_APPENDIX_CONDITION_FIELDS) {
      if (seenKeys.has(field.key)) continue;
      seenKeys.add(field.key);
      options.push({ value: field.key, label: formatCommonAppendixConditionLabel(field) });
    }
  }

  // 同隐患点类型：附录 B 固定专用字段 + 其它指标的辅助条件（如下凹式专用项、低洼「道路纵坡 S」）
  if (row && isFormationLevel1(row.level1)) {
    const pointType = resolvePrimarySurveyPointType(row.applicableTypes);
    if (pointType) {
      for (const field of listAppendixBConditionFieldsForPointType(pointType, allIndicators, {
        onlyEnabledIndicators: true,
      })) {
        if (seenKeys.has(field.key)) continue;
        seenKeys.add(field.key);
        options.push({
          value: field.key,
          label: formatAppendixPointTypeConditionLabel(field, pointType),
        });
      }
      if (allIndicators?.length) {
        const pool = allIndicators.map(i =>
          enrichIndicatorForConditionSource(i, allIndicators, baselineIndicators),
        );
        for (const { owner, config } of listAppendixAuxiliaryConditionSources(pool, pointType)) {
          // 本指标辅助条件已在上方 push，避免同 fieldKey/同标签出现两次
          if (row.code && owner.code === row.code) continue;
          pushAux(config, owner.applicableTypes);
        }
      }
    }
  }

  return dedupeConditionFieldOptions(options);
}


/** 复合数值赋分：可选普查字段（与条件赋分 appendix_b 同源，仅数值型） */
/** 复合子项 · 本点其他数值型指标 */
export function getCompositeIndicatorPartFieldOptions(
  indicators: RiskIndicatorRow[],
  filterContext?: ConditionSourceFilterContext,
): { value: string; label: string }[] {
  return getConditionSourceFieldOptions('point', indicators, filterContext?.code, filterContext).filter(
    opt => {
      const ind = indicators.find(
        i => i.survey.fieldKey === opt.value || i.code === opt.value,
      );
      return ind?.valueType === 'numeric';
    },
  );
}

export function getCompositeSurveyPartFieldOptions(
  self?: BasicInfoConditionFieldContext,
  allIndicators?: RiskIndicatorRow[],
  formContext?: BasicInfoConditionFieldContext,
  baselineIndicators?: RiskIndicatorRow[],
): { value: string; label: string }[] {
  const row = resolveSelfForBasicInfoConditions(self, allIndicators, formContext);
  return getSurveyBasicInfoConditionFieldOptions(self, allIndicators, formContext, baselineIndicators).filter(
    opt => {
      if (opt.value === 'areaImportance') return false;
      if (appendixBConditionFieldUsesDiscreteMatch(opt.value, allIndicators)) return false;
      const pt = row ? resolvePrimarySurveyPointType(row.applicableTypes) : undefined;
      if (pt) {
        const field = listAppendixBConditionFieldsForPointType(pt, allIndicators, {
          onlyEnabledIndicators: true,
        }).find(f => f.key === opt.value);
        if (field) return field.kind === 'numeric';
      }
      if (row && isAppendixBasicInfoNumericAuxiliaryKey(opt.value, row, allIndicators)) return true;
      return isAppendixPointTypeConditionFieldKey(opt.value);
    },
  );
}

export interface ScoreMatchContext {
  pointType?: SurveyPointType;
  areaImportance?: AreaImportance;
  appendixB?: Record<string, string | number | boolean | null | undefined>;
  indicatorValues?: Record<string, string | number | boolean | null>;
}

export function isConditionalScoringEnabled(ind: RiskIndicatorRow): boolean {
  return Boolean(ind.conditionalScoring?.enabled && ind.conditionalScoring.branches.length > 0);
}

/** 全县防灾减灾 / 易涝点普查指标 */
export function isRegionalSurveyIndicator(ind: RiskIndicatorRow): boolean {
  return ind.level1 === 'PREVENTION' || getIndicatorSurveyScope(ind) === 'region';
}

function resolveIndicatorConditionRaw(
  source: ScoreConditionSource,
  context: ScoreMatchContext,
  indicators?: RiskIndicatorRow[],
): string | number | boolean | null | undefined {
  const values = context.indicatorValues;
  if (!values) return undefined;
  if (source.key in values) return values[source.key];
  const ref = indicators?.find(i => i.code === source.key || i.survey.fieldKey === source.key);
  if (ref) return values[ref.survey.fieldKey];
  return undefined;
}

export function resolveConditionValue(
  source: ScoreConditionSource,
  context?: ScoreMatchContext,
  indicators?: RiskIndicatorRow[],
): string | number | boolean | null | undefined {
  if (!context) return undefined;
  if (source.type === 'appendix_b') {
    if (source.key === 'areaImportance') return context.areaImportance ?? context.appendixB?.areaImportance;
    if (isAppendixBasicInfoIndicatorValueKey(source.key, indicators)) {
      return resolveIndicatorConditionRaw(
        { type: 'indicator', key: source.key },
        context,
        indicators,
      );
    }
    return context.appendixB?.[source.key];
  }
  return resolveIndicatorConditionRaw(source, context, indicators);
}

export function formatConditionSourceLabel(
  source: ScoreConditionSource,
  indicators?: RiskIndicatorRow[],
  self?: Pick<RiskIndicatorRow, 'survey' | 'applicableTypes' | 'code'>,
): string {
  if (source.type === 'appendix_b') {
    const selfAux = self?.survey?.auxiliaryCondition;
    if (selfAux?.fieldKey === source.key) {
      return `${SURVEY_BASIC_INFO_SOURCE_LABEL} · ${formatAppendixAuxiliaryConditionLabel(
        selfAux,
        self?.applicableTypes ?? ['GLOBAL'],
      )}`;
    }
    const owner = indicators ? findIndicatorByAuxiliaryFieldKey(source.key, indicators) : undefined;
    const aux = owner?.survey?.auxiliaryCondition;
    if (aux && aux.fieldKey === source.key) {
      return `${SURVEY_BASIC_INFO_SOURCE_LABEL} · ${formatAppendixAuxiliaryConditionLabel(aux, owner.applicableTypes)}`;
    }
    const fieldLabel = resolveConditionFieldLabel(
      source.key,
      'point',
      indicators ?? [],
      self?.code,
      self,
    );
    if (fieldLabel !== source.key) {
      return `${SURVEY_BASIC_INFO_SOURCE_LABEL} · ${fieldLabel}`;
    }
    const legacy = SURVEY_BASIC_INFO_CONDITION_FIELDS.find(x => x.key === source.key);
    if (legacy) return `${SURVEY_BASIC_INFO_SOURCE_LABEL} · ${legacy.label}`;
    const ptField = findAppendixBConditionField(source.key);
    if (ptField) return `${SURVEY_BASIC_INFO_SOURCE_LABEL} · ${ptField.label}`;
    return `${SURVEY_BASIC_INFO_SOURCE_LABEL} · ${source.key}`;
  }
  if (indicators && isAuxiliaryConditionFieldKey(source.key, indicators)) {
    return `指标 · ${resolveAuxiliaryFieldLabel(source.key, indicators)}`;
  }
  const ind = indicators?.find(i => i.code === source.key || i.survey.fieldKey === source.key);
  const name = ind?.name ?? resolveConditionFieldLabel(source.key, 'point', indicators ?? []);
  return `指标 · ${name}`;
}

/** 条件来源候选过滤上下文（与当前编辑指标的一级因子、适用类型一致） */
export type ConditionSourceFilterContext = Pick<
  RiskIndicatorRow,
  'level1' | 'applicableTypes' | 'code'
>;

/** 条件指标选项展示名（孕灾因子附隐患点类型，避免与其它子集同名指标混淆） */
export function formatConditionIndicatorOptionLabel(
  ind: RiskIndicatorRow,
  opts?: { markDisabled?: boolean },
): string {
  let label = ind.name;
  if (ind.level1 === 'FORMATION') {
    const pt = resolvePrimarySurveyPointType(ind.applicableTypes);
    if (pt) label = `${ind.name}（${HAZARD_POINT_TYPE_LABEL[pt]}）`;
  }
  if (opts?.markDisabled && !ind.enabled) {
    label += '（未启用）';
  }
  return label;
}

/** 条件字段（本点其他指标）下拉无选项时的说明 */
export function getConditionIndicatorFieldEmptyHint(
  filterIncomplete: boolean,
  mode: ConditionalScoringMode | undefined,
): string {
  if (filterIncomplete) {
    return '请先在「基本信息」中选择适用隐患点类型';
  }
  const valueTypeHint =
    mode === 'branch_rules' ? '下拉分档、是/否或数值型' : '数值型（填数值）';
  return (
    `暂无符合条件的${valueTypeHint}指标。` +
    '新建指标保存后默认为未启用，仍可选作条件（选项会标注「未启用」）；' +
    '请确认一级因子、适用隐患点类型与当前指标一致，且被引用指标在「普查关联」中纳入指标普查。' +
    '「多数值聚合赋分」类指标不在此列表。'
  );
}

/** 条件赋分方式下，可作为「本点其他指标」来源的填报类型 */
export function allowedConditionCandidateValueTypes(
  mode: ConditionalScoringMode | undefined,
): RiskIndicatorRow['valueType'][] {
  if (mode === 'branch_rules') return ['numeric', 'enum', 'boolean'];
  return ['numeric'];
}

/** 条件来源为离散取值（下拉分档 / 是·否），分支用 matchValues 匹配 */
export function isDiscreteConditionIndicator(
  ind: Pick<RiskIndicatorRow, 'valueType'> | undefined,
): boolean {
  return ind?.valueType === 'enum' || ind?.valueType === 'boolean';
}

/** 本点其他指标：是否可作为条件来源（按一级因子与适用隐患点类型过滤） */
export function indicatorEligibleAsConditionCandidate(
  candidate: RiskIndicatorRow,
  self: ConditionSourceFilterContext | undefined,
  scope: 'point' | 'region',
): boolean {
  if (scope === 'region') {
    return isRegionalSurveyIndicator(candidate);
  }
  if (!self?.level1) return true;
  if (isFormationLevel1(self.level1)) {
    const pointType = resolvePrimarySurveyPointType(self.applicableTypes);
    if (!pointType) return false;
    if (candidate.level1 === 'FORMATION') {
      return indicatorAppliesToSurveyPointType(candidate, pointType);
    }
    return candidate.applicableTypes.includes('GLOBAL');
  }
  if (candidate.level1 === 'FORMATION') return false;
  return candidate.applicableTypes.includes('GLOBAL');
}

/** 条件字段下拉；展示指标名称，辅助条件字段排在首位 */
export function getConditionSourceFieldOptions(
  scope: 'point' | 'region',
  indicators: RiskIndicatorRow[],
  selfCode?: string,
  filterContext?: ConditionSourceFilterContext,
  conditionalMode?: ConditionalScoringMode,
  selfDraft?: Pick<RiskIndicatorRow, 'survey' | 'code'>,
): { value: string; label: string }[] {
  const code = filterContext?.code ?? selfCode ?? selfDraft?.code;
  const selfRow = code ? indicators.find(i => i.code === code) : undefined;
  const draftForAux: RiskIndicatorRow | undefined = selfRow
    ? selfRow
    : selfDraft?.survey
      ? ({ survey: selfDraft.survey } as RiskIndicatorRow)
      : undefined;
  const auxOpt = draftForAux ? getAuxiliaryConditionOption(draftForAux) : null;
  const others = getConditionSourceIndicatorCandidates(
    scope,
    indicators,
    selfCode,
    filterContext,
    conditionalMode,
  ).map(i => ({
    value: i.survey.fieldKey,
    label: formatConditionIndicatorOptionLabel(i, { markDisabled: true }),
  }));
  if (auxOpt) {
    return [auxOpt, ...others.filter(o => o.value !== auxOpt.value)];
  }
  return others;
}

/** 将存库的条件来源 key 规范为下拉选项 value（fieldKey），避免界面回显英文编码 */
export function normalizeConditionSourceKey(
  source: ScoreConditionSource,
  scope: 'point' | 'region',
  indicators: RiskIndicatorRow[],
  selfCode?: string,
  selfDraft?: Pick<RiskIndicatorRow, 'survey'>,
): ScoreConditionSource {
  if (source.type === 'appendix_b') {
    const key = source.key?.trim();
    if (!key) return { type: 'appendix_b', key: 'areaImportance' };
    const self = selfDraft ?? (selfCode ? indicators.find(i => i.code === selfCode) : undefined);
    const aux = self?.survey?.auxiliaryCondition;
    if (aux?.fieldKey) {
      const matchesSelf =
        key === aux.fieldKey ||
        key === selfCode ||
        key === self?.survey?.fieldKey ||
        aux.legacyFieldKeys?.includes(key);
      if (matchesSelf) {
        return resolveAuxiliaryConditionSource(aux);
      }
    }
    if (SURVEY_BASIC_INFO_CONDITION_FIELDS.some(x => x.key === key)) return { ...source, key };
    if (isAppendixPointTypeConditionFieldKey(key)) return { ...source, key };
    if (isAppendixBasicInfoIndicatorValueKey(key, indicators)) return { ...source, key };
    const auxOwner = findIndicatorByAuxiliaryFieldKey(key, indicators);
    if (auxOwner?.survey?.auxiliaryCondition) {
      return resolveAuxiliaryConditionSource(auxOwner.survey.auxiliaryCondition);
    }
    return { type: 'appendix_b', key: 'areaImportance' };
  }
  const self = selfDraft ?? indicators.find(i => i.code === selfCode);
  const aux = self?.survey?.auxiliaryCondition;
  if (aux && (aux.fieldKey === source.key || aux.legacyFieldKeys?.includes(source.key))) {
    return resolveAuxiliaryConditionSource(aux);
  }
  if (isAuxiliaryConditionFieldKey(source.key, indicators)) {
    const owner = findIndicatorByAuxiliaryFieldKey(source.key, indicators);
    if (owner?.survey?.auxiliaryCondition) {
      return { type: 'indicator', key: owner.survey.auxiliaryCondition.fieldKey };
    }
  }
  const ind = indicators.find(i => i.code === source.key || i.survey.fieldKey === source.key);
  if (ind) return { type: 'indicator', key: ind.survey.fieldKey };
  return source;
}

/** 条件字段展示名（下拉回显、流程图等） */
export function resolveConditionFieldLabel(
  key: string,
  scope: 'point' | 'region',
  indicators: RiskIndicatorRow[],
  selfCode?: string,
  selfDraft?: Pick<RiskIndicatorRow, 'survey' | 'applicableTypes' | 'code'>,
): string {
  const selfRow = selfDraft ?? (selfCode ? indicators.find(i => i.code === selfCode) : undefined);
  const selfIndicatorCode = selfRow?.code?.trim() ?? selfCode?.trim();
  if (selfIndicatorCode && isSelfAuxiliaryConditionFieldKey(key, selfIndicatorCode)) {
    return '辅助条件';
  }
  const selfAux = selfRow?.survey?.auxiliaryCondition;
  if (selfAux?.fieldKey === key) {
    if (selfAux.surveyPlacement === 'appendix_b') {
      return formatAppendixAuxiliaryConditionLabel(
        selfAux,
        selfRow?.applicableTypes ?? ['GLOBAL'],
      );
    }
    return resolveAuxiliaryDisplayLabel(selfAux, selfRow?.applicableTypes ?? ['GLOBAL']);
  }

  const appendix = getSurveyBasicInfoConditionFieldOptions(
    selfRow,
    indicators,
    selfRow,
  ).find(f => f.value === key);
  if (appendix) return appendix.label;
  const appendixLegacy = SURVEY_BASIC_INFO_CONDITION_FIELDS.find(f => f.key === key);
  if (appendixLegacy) return appendixLegacy.label;
  if (indicators?.length) {
    const auxOwner = findIndicatorByAuxiliaryFieldKey(key, indicators);
    if (auxOwner?.survey?.auxiliaryCondition) {
      const aux = auxOwner.survey.auxiliaryCondition;
      if (aux.surveyPlacement === 'appendix_b') {
        return formatAppendixAuxiliaryConditionLabel(aux, auxOwner.applicableTypes ?? []);
      }
      return resolveAuxiliaryDisplayLabel(aux, auxOwner.applicableTypes ?? ['GLOBAL']);
    }
    if (isAuxiliaryConditionFieldKey(key, indicators)) {
      return resolveAuxiliaryFieldLabel(key, indicators);
    }
  }
  const fixedAppendixLabel = resolveAppendixBFixedFieldLabel(
    key,
    selfRow ? resolvePrimarySurveyPointType(selfRow.applicableTypes ?? []) : undefined,
  );
  if (fixedAppendixLabel) return fixedAppendixLabel;
  const ind = indicators.find(i => i.code === key || i.survey.fieldKey === key);
  return ind?.name ?? key;
}

export function branchMatches(
  branch: ConditionalScoreBranch,
  source: ScoreConditionSource,
  conditionRaw: string | number | boolean | null | undefined,
  indicators?: RiskIndicatorRow[],
): boolean {
  if (conditionRaw === undefined || conditionRaw === null || conditionRaw === '') return false;
  if (source.type === 'appendix_b') {
    if (appendixBConditionFieldUsesDiscreteMatch(source.key, indicators)) {
      const values = branch.matchValues ?? [];
      if (values.includes(String(conditionRaw))) return true;
      if (findAppendixBConditionField(source.key)?.kind === 'boolean') {
        const key = conditionRaw === true || conditionRaw === 'true' ? 'true' : 'false';
        return values.includes(key);
      }
      return false;
    }
    const n = typeof conditionRaw === 'number' ? conditionRaw : parseFloat(String(conditionRaw));
    if (Number.isNaN(n) || !branch.numericMatch) return false;
    return matchNumericCondition(n, branch.numericMatch);
  }
  const srcInd = indicators?.find(
    i => i.survey.fieldKey === source.key || i.code === source.key,
  );
  if (isDiscreteConditionIndicator(srcInd)) {
    const values = branch.matchValues ?? [];
    if (values.includes(String(conditionRaw))) return true;
    if (srcInd?.valueType === 'boolean') {
      const key = conditionRaw === true || conditionRaw === 'true' ? 'true' : 'false';
      return values.includes(key);
    }
    return false;
  }
  const n = typeof conditionRaw === 'number' ? conditionRaw : parseFloat(String(conditionRaw));
  if (Number.isNaN(n) || !branch.numericMatch) return false;
  return matchNumericCondition(n, branch.numericMatch);
}

export function resolveActiveBranch(
  config: ConditionalScoringConfig,
  context?: ScoreMatchContext,
  indicators?: RiskIndicatorRow[],
): ConditionalScoreBranch | null {
  const raw = resolveConditionValue(config.source, context, indicators);
  if (raw === undefined || raw === null || raw === '') return null;
  return config.branches.find(b => branchMatches(b, config.source, raw, indicators)) ?? null;
}

function pickLowHighRule(rules: ScoreRule[], isLow: boolean): ScoreRule | null {
  return (
    rules.find(r => (isLow && r.score <= 0.1) || (!isLow && r.score >= 0.9)) ??
    rules[isLow ? 0 : 1] ??
    null
  );
}

export function getConditionMissingMessage(
  ind: RiskIndicatorRow,
  indicators?: RiskIndicatorRow[],
  formVariant: ConditionalFormVariant = 'survey',
): string {
  const src = ind.conditionalScoring?.source;
  if (!src) return '请先满足条件赋分所需的前置字段';
  if (isRegionalSurveyIndicator(ind) && formVariant === 'prevention' && src.type === 'appendix_b') {
    return '防灾减灾指标信息不支持以内涝基本信息作为条件';
  }
  if (src.type === 'appendix_b' && src.key === 'areaImportance') {
    return `请先在「${SURVEY_BASIC_INFO_SOURCE_LABEL}」中填写「地区重要程度」`;
  }
  if (src.type === 'appendix_b' && isAppendixBasicInfoIndicatorValueKey(src.key, indicators)) {
    const label = indicators ? resolveAuxiliaryFieldLabel(src.key, indicators) : src.key;
    const owner = indicators ? findIndicatorByAuxiliaryFieldKey(src.key, indicators) : undefined;
    const mainName = owner?.name ?? '本指标';
    const pt = owner ? resolvePrimarySurveyPointType(owner.applicableTypes) : undefined;
    const section = pt ? HAZARD_POINT_TYPE_LABEL[pt] : '类型';
    return `请先在「${SURVEY_BASIC_INFO_SOURCE_LABEL}」→「${section}专用信息」中填写「${label}」，再选择「${mainName}」分档`;
  }
  if (src.type === 'indicator') {
    if (indicators && isAuxiliaryConditionFieldKey(src.key, indicators)) {
      const label = resolveAuxiliaryFieldLabel(src.key, indicators);
      const owner = findIndicatorByAuxiliaryFieldKey(src.key, indicators);
      const mainName = owner?.name ?? '本指标';
      return `请先填写「${label}」后再选择「${mainName}」分档`;
    }
    const ref = indicators?.find(i => i.code === src.key || i.survey.fieldKey === src.key);
    const name = ref?.name ?? src.key;
    if (isRegionalSurveyIndicator(ind) && formVariant === 'prevention') {
      return `请先填写同组防灾减灾指标「${name}」`;
    }
    return `请先填写条件指标「${name}」`;
  }
  return '请先满足条件赋分所需的前置字段';
}

export function getExtraWatchPathsForConditional(
  ind: RiskIndicatorRow,
  formVariant: ConditionalFormVariant = 'survey',
): (string | number)[][] {
  const cfg = ind.conditionalScoring;
  if (!cfg?.enabled) return [];
  const p = getConditionSourceWatchPath(formVariant, cfg.source.type, cfg.source.key);
  return [p];
}

/** 条件来源候选（编辑指标时） */
export function getConditionSourceIndicatorCandidates(
  scope: 'point' | 'region',
  indicators: RiskIndicatorRow[],
  selfCode?: string,
  filterContext?: ConditionSourceFilterContext,
  conditionalMode?: ConditionalScoringMode,
): RiskIndicatorRow[] {
  const allowedTypes = allowedConditionCandidateValueTypes(conditionalMode);
  if (scope === 'region') {
    return getRegionalPreventionIndicators(indicators).filter(
      i => i.code !== selfCode && allowedTypes.includes(i.valueType),
    );
  }
  const ctx =
    filterContext ??
    (selfCode
      ? (() => {
          const row = indicators.find(i => i.code === selfCode);
          return row
            ? { level1: row.level1, applicableTypes: row.applicableTypes, code: row.code }
            : undefined;
        })()
      : undefined);
  return indicators.filter(
    i =>
      i.survey?.collectInSurvey !== false &&
      !isRegionalSurveyIndicator(i) &&
      i.code !== selfCode &&
      allowedTypes.includes(i.valueType) &&
      indicatorEligibleAsConditionCandidate(i, ctx, scope),
  );
}

/** 枚举型条件指标：分支「匹配取值」选项（scoreRules.label） */
export function getConditionIndicatorMatchValueOptions(
  sourceKey: string | undefined,
  indicators: RiskIndicatorRow[],
): { value: string; label: string }[] {
  if (!sourceKey) return [];
  const ind = indicators.find(i => i.survey.fieldKey === sourceKey || i.code === sourceKey);
  if (!ind) return [];
  if (ind.valueType === 'enum') {
    return (ind.scoreRules ?? [])
      .map(r => String(r.label ?? '').trim())
      .filter(Boolean)
      .map(label => ({ value: label, label }));
  }
  if (ind.valueType === 'boolean') {
    return buildBooleanSurveyOptions(ind).map(o => ({
      value: String(o.value),
      label: o.label,
    }));
  }
  return [];
}

/** 孕灾因子未选适用类型时，条件字段不可选 */
export function isConditionSourceFilterIncomplete(
  filterContext: ConditionSourceFilterContext | undefined,
  scope: 'point' | 'region',
): boolean {
  if (scope !== 'point' || !filterContext?.level1) return false;
  if (!isFormationLevel1(filterContext.level1)) return false;
  return !resolvePrimarySurveyPointType(filterContext.applicableTypes);
}

/** 防灾减灾 vs 易涝点普查：条件来源作用域校验 */
export function validateConditionalScoringScope(
  ind: RiskIndicatorRow,
  allIndicators: RiskIndicatorRow[],
): string | null {
  const cfg = ind.conditionalScoring;
  if (!cfg?.enabled) return null;
  const regional = isRegionalSurveyIndicator(ind);
  if (regional && cfg.source.type === 'appendix_b') {
    return '防灾减灾指标不能使用「内涝基本信息」作为条件；请改用同组防灾减灾数值型指标，或不启用条件赋分';
  }
  if (cfg.source.type === 'indicator') {
    const src = allIndicators.find(i => i.code === cfg.source.key || i.survey.fieldKey === cfg.source.key);
    if (regional && (!src || !isRegionalSurveyIndicator(src))) {
      return '防灾减灾指标只能引用同组防灾减灾数值型指标作为条件，不能引用易涝点普查指标（如纵坡度等）';
    }
    if (!regional && src && isRegionalSurveyIndicator(src)) {
      return '易涝点普查指标不能以防灾减灾指标作为条件来源';
    }
  }
  return null;
}

/** 当前表单场景下条件赋分控件是否可用（配置无效时降级为普通填报） */
export function canUseConditionalScoringInForm(
  ind: RiskIndicatorRow,
  formVariant: ConditionalFormVariant,
  allIndicators: RiskIndicatorRow[],
): boolean {
  if (!isConditionalScoringEnabled(ind)) return false;
  if (validateConditionalScoringScope(ind, allIndicators)) return false;
  if (formVariant === 'prevention' && isRegionalSurveyIndicator(ind)) {
    const cfg = ind.conditionalScoring!;
    if (cfg.source.type === 'indicator') return true;
    return false;
  }
  return true;
}

/** 条件赋分匹配（启用时优先） */
export function matchScoreRuleWithConditional(
  ind: RiskIndicatorRow,
  raw: string | number | boolean,
  context?: ScoreMatchContext,
  indicators?: RiskIndicatorRow[],
): ScoreRule | null {
  const cfg = ind.conditionalScoring;
  if (!cfg?.enabled) return null;
  const isAuxiliaryConditional =
    ind.survey?.inputVariant === 'auxiliary_then_select' &&
    Boolean(ind.survey?.auxiliaryCondition?.fieldKey?.trim());

  let branch: ConditionalScoreBranch | null = null;
  if (isAuxiliaryConditional && context?.indicatorValues) {
    const auxVal = getAuxiliaryNumericFromValues(context.indicatorValues, ind);
    if (auxVal !== undefined && !Number.isNaN(auxVal)) {
      for (const b of cfg.branches) {
        const m = resolveBranchIndicatorValueMatch(b);
        if (!m) continue;
        if (matchNumericCondition(auxVal, m) && b.scoreRules?.length) {
          branch = b;
          break;
        }
      }
    }
  } else {
    branch = resolveActiveBranch(cfg, context, indicators);
  }
  if (!branch) return null;

  if (cfg.mode === 'branch_threshold' && ind.valueType === 'numeric') {
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
    if (Number.isNaN(n)) return null;
    const rules =
      branch.scoreRules?.length ? branch.scoreRules : ind.scoreRules.length ? ind.scoreRules : [];
    if (hasConfiguredNumericBands(rules)) {
      return matchScoreRuleByNumericBands(rules, n);
    }
    const valueMatch = resolveBranchIndicatorValueMatch(branch);
    if (!valueMatch) return null;
    const conditionMet = matchNumericCondition(n, valueMatch);
    return pickLowHighRule(rules, conditionMet);
  }

  if (cfg.mode === 'branch_rules') {
    const rules = branch.scoreRules ?? [];
    if (ind.valueType === 'numeric') {
      const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
      if (!Number.isNaN(n)) {
        const bandRule = matchScoreRuleByNumericBands(rules, n);
        if (bandRule) return bandRule;
      }
    }
    const s = String(raw);
    return rules.find(r => r.label === s || r.riskTier === s || r.id === s) ?? null;
  }
  return null;
}

/** 收集其它分支已占用的离散匹配取值 */
export function collectExclusiveMatchValuesUsedByOtherBranches(
  branches: ConditionalScoreBranch[] | undefined,
  excludeBranchIndex: number,
): Set<string> {
  const used = new Set<string>();
  (branches ?? []).forEach((b, i) => {
    if (i === excludeBranchIndex) return;
    for (const v of b.matchValues ?? []) {
      if (v) used.add(String(v));
    }
  });
  return used;
}

/** 为当前分支过滤匹配取值：其它分支已选的不出现在下拉中（本分支已选保留） */
export function filterExclusiveMatchValueOptions<T extends { value: string }>(
  options: T[],
  branches: ConditionalScoreBranch[] | undefined,
  branchIndex: number,
  currentValues?: string[],
): T[] {
  const usedElsewhere = collectExclusiveMatchValuesUsedByOtherBranches(branches, branchIndex);
  const current = new Set((currentValues ?? []).map(String));
  return options.filter(o => current.has(String(o.value)) || !usedElsewhere.has(String(o.value)));
}

/** 检测各分支 matchValues 是否有重复 */
export function findDuplicateBranchMatchValues(branches: ConditionalScoreBranch[] | undefined): string[] {
  const seen = new Set<string>();
  const dups: string[] = [];
  for (const b of branches ?? []) {
    for (const v of b.matchValues ?? []) {
      const key = String(v);
      if (seen.has(key)) {
        if (!dups.includes(key)) dups.push(key);
      } else {
        seen.add(key);
      }
    }
  }
  return dups;
}

/** 从其它分支移除与指定分支冲突的匹配取值 */
export function reconcileExclusiveBranchMatchValues(
  branches: ConditionalScoreBranch[],
  changedBranchIndex: number,
): ConditionalScoreBranch[] {
  const claimed = new Set((branches[changedBranchIndex]?.matchValues ?? []).map(String));
  return branches.map((b, i) => {
    if (i === changedBranchIndex) return b;
    const next = (b.matchValues ?? []).filter(v => !claimed.has(String(v)));
    if (next.length === (b.matchValues ?? []).length) return b;
    return { ...b, matchValues: next };
  });
}

function getDiscreteConditionValues(
  source: ScoreConditionSource,
  allIndicators?: RiskIndicatorRow[],
): string[] | null {
  if (source.type === 'appendix_b') {
    const values = getAppendixBMatchValueOptions(source.key, allIndicators).map(option => option.value);
    return values.length ? values : null;
  }
  const values = getConditionIndicatorMatchValueOptions(source.key, allIndicators ?? []).map(
    option => option.value,
  );
  return values.length ? values : null;
}

function conditionSourceUsesNumericMatch(
  source: ScoreConditionSource,
  ind: Pick<RiskIndicatorRow, 'survey'>,
  allIndicators?: RiskIndicatorRow[],
): boolean | null {
  if (source.type === 'appendix_b') {
    const numericAux = isAppendixBasicInfoNumericAuxiliaryKey(
      source.key,
      ind as RiskIndicatorRow,
      allIndicators,
    );
    if (numericAux || findAppendixBConditionField(source.key)?.kind === 'numeric') return true;
    return getDiscreteConditionValues(source, allIndicators) ? false : null;
  }
  const sourceIndicator = allIndicators?.find(
    row => row.code === source.key || row.survey.fieldKey === source.key,
  );
  if (sourceIndicator) return !isDiscreteConditionIndicator(sourceIndicator);
  // 编辑本指标的辅助条件时，来源字段尚未写回指标列表，仍按数值辅助条件处理。
  if (ind.survey?.auxiliaryCondition?.fieldKey === source.key) return true;
  return null;
}

export function validateConditionalScoring(
  ind: Pick<RiskIndicatorRow, 'conditionalScoring' | 'scoreRules' | 'valueType' | 'level1' | 'survey'>,
  allIndicators?: RiskIndicatorRow[],
): string | null {
  const cfg = ind.conditionalScoring;
  if (!cfg?.enabled) return null;
  if (allIndicators && 'code' in ind && ind.code) {
    const scopeErr = validateConditionalScoringScope(ind as RiskIndicatorRow, allIndicators);
    if (scopeErr) return scopeErr;
  }
  if (!cfg.source?.key?.trim()) return '请配置条件来源字段';
  if (!cfg.branches.length) return '请至少添加 1 个条件分支';
  const sourceNumeric = conditionSourceUsesNumericMatch(cfg.source, ind, allIndicators);
  if (sourceNumeric === null) {
    return '条件来源字段不存在或无法识别其取值类型';
  }
  for (const b of cfg.branches) {
    if (!b.label?.trim()) return '条件分支名称不能为空';
    if (cfg.source.type === 'appendix_b') {
      const selfRow = ind as RiskIndicatorRow;
      const sourceKey = cfg.source.key;
      const numericAux = isAppendixBasicInfoNumericAuxiliaryKey(
        sourceKey,
        selfRow,
        allIndicators,
      );
      const discrete =
        appendixBConditionFieldUsesDiscreteMatch(sourceKey, allIndicators) && !numericAux;
      const branchNumeric = b.numericMatch ?? resolveBranchIndicatorValueMatch(b);
      if (discrete) {
        if (!(b.matchValues?.length)) {
          return `分支「${b.label}」须配置匹配的${SURVEY_BASIC_INFO_SOURCE_LABEL}取值`;
        }
      } else if (
        branchNumeric ||
        numericAux ||
        findAppendixBConditionField(sourceKey)?.kind === 'numeric'
      ) {
        if (!branchNumeric) {
          return `分支「${b.label}」须配置数值匹配条件`;
        }
      } else if (!(b.matchValues?.length)) {
        return `分支「${b.label}」须配置匹配的${SURVEY_BASIC_INFO_SOURCE_LABEL}取值`;
      }
    }
    if (cfg.source.type === 'indicator') {
      const selfRow = ind as RiskIndicatorRow;
      const auxKey = selfRow.survey?.auxiliaryCondition?.fieldKey;
      const isAuxNumericSource =
        auxKey === cfg.source.key ||
        Boolean(isAuxiliaryConditionFieldKey(cfg.source.key, allIndicators));
      if (isAuxNumericSource) {
        if (!b.numericMatch) {
          return `分支「${b.label}」须配置数值匹配条件`;
        }
      } else {
        const src = allIndicators?.find(
          i => i.code === cfg.source.key || i.survey.fieldKey === cfg.source.key,
        );
        const srcIsDiscrete = isDiscreteConditionIndicator(src) && cfg.mode === 'branch_rules';
        if (srcIsDiscrete) {
          if (!(b.matchValues?.length)) {
            return `分支「${b.label}」须选择条件指标的匹配取值`;
          }
        } else if (!b.numericMatch) {
          return `分支「${b.label}」须配置数值匹配条件`;
        }
      }
    }
    if (cfg.mode === 'branch_threshold' && ind.valueType === 'numeric') {
      const branchRules = b.scoreRules ?? [];
      const { min, max } = getScoreRuleLimits('numeric');
      if (branchRules.length < min || branchRules.length > max) {
        return `分支「${b.label}」赋分档须 ${min}～${max} 档`;
      }
      if (!hasConfiguredNumericBands(branchRules)) {
        return `分支「${b.label}」须为每档配置匹配区间（数值分档）`;
      }
      const bandError = validateNumericUniformBands(branchRules);
      if (bandError) return `分支「${b.label}」：${bandError}`;
      if (!branchRules.every(r => String(r.label ?? '').trim())) {
        return `分支「${b.label}」每档须填写分档描述`;
      }
    }
    if (cfg.mode === 'branch_rules') {
      if (!(b.scoreRules?.length)) {
        return `分支「${b.label}」须至少 1 档赋分规则`;
      }
      if (ind.valueType === 'numeric' && !hasConfiguredNumericBands(b.scoreRules)) {
        return `分支「${b.label}」须为每档配置匹配区间（数值分档）`;
      }
      if (ind.valueType === 'numeric') {
        const bandError = validateNumericUniformBands(b.scoreRules);
        if (bandError) return `分支「${b.label}」：${bandError}`;
      }
    }
  }
  if (sourceNumeric) {
    if (cfg.branches.some(branch => !resolveBranchIndicatorValueMatch(branch))) {
      return '每个数值型条件分支都须配置数值匹配条件';
    }
    const branchCoverageError = validateNumericMatchCoverage(
      cfg.branches.map(branch => ({
        numericMatch: resolveBranchIndicatorValueMatch(branch),
      })),
    );
    if (branchCoverageError) return `条件分支${branchCoverageError}`;
  }
  const duplicateMatchValues = findDuplicateBranchMatchValues(cfg.branches);
  if (duplicateMatchValues.length) {
    const labels = duplicateMatchValues.map(v => {
      const opt = getAppendixBMatchValueOptions(cfg.source.key, allIndicators).find(o => o.value === v);
      return opt?.label ?? v;
    });
    return `条件分支匹配取值不可重复：${labels.join('、')}`;
  }
  if (!sourceNumeric) {
    const expectedValues = getDiscreteConditionValues(cfg.source, allIndicators);
    // 已能列举的离散来源必须被完整且互斥地分配，不能把未命中值留给运行时静默失败。
    if (expectedValues?.length) {
      const claimed = new Set(
        cfg.branches.flatMap(branch => (branch.matchValues ?? []).map(value => String(value))),
      );
      const missing = expectedValues.filter(value => !claimed.has(String(value)));
      if (missing.length) {
        const labels = getDiscreteConditionValues(cfg.source, allIndicators)!
          .filter(value => missing.includes(value))
          .join('、');
        return `条件分支未覆盖条件来源的取值：${labels}`;
      }
    }
  }
  return null;
}

export function createEmptyConditionalScoring(
  mode: ConditionalScoringMode = 'branch_threshold',
): ConditionalScoringConfig {
  return {
    enabled: false,
    mode,
    source: { type: 'appendix_b', key: 'areaImportance' },
    branches: [],
  };
}

function branch(
  id: string,
  label: string,
  partial: Omit<ConditionalScoreBranch, 'id' | 'label'>,
): ConditionalScoreBranch {
  return { id, label, ...partial };
}

/** 导则预置：排水设计重现期 */
export function buildDesignPeriodConditional(code: string): ConditionalScoringConfig {
  const isLl = code === 'FM_LL_DESIGN_P';
  const defaultRules = (branchId: string) => createDesignPeriodBranchScoreRules(branchId);
  return {
    enabled: true,
    mode: 'branch_threshold',
    source: { type: 'appendix_b', key: 'areaImportance' },
    branches: [
      branch('urban', isLl ? '中心城区' : '中心城区', {
        matchValues: ['COUNTY_KEY', 'COUNTY_GENERAL'],
        indicatorValueMatch: { kind: 'gte', value: isLl ? 10 : 30 },
        scoreRules: defaultRules('urban'),
      }),
      branch('other', isLl ? '其他乡镇' : '其他区县', {
        matchValues: ['TOWN_GENERAL'],
        indicatorValueMatch: { kind: 'gte', value: isLl ? 5 : 10 },
        scoreRules: defaultRules('other'),
      }),
    ],
  };
}

/** 导则预置建议：仅当用户主动开启条件赋分时填入，不在加载时自动启用 */
export function suggestConditionalScoringForIndicator(
  ind: RiskIndicatorRow,
): ConditionalScoringConfig | undefined {
  if (ind.level1 === 'PREVENTION') return undefined;
  if (hasAuxiliaryConditionSurvey(ind)) return buildAuxiliaryConditionalFromIndicator(ind);
  return undefined;
}

function normalizeConditionalBranches(
  config: ConditionalScoringConfig,
  ind: RiskIndicatorRow,
): ConditionalScoringConfig {
  const branches = config.branches.map((b, i) => {
    const branchId = b.id || `${ind.id}-cb${i}`;
    const fallbackRules =
      config.mode === 'branch_threshold' && !b.scoreRules?.length
        ? ind.scoreRules?.length
          ? ind.scoreRules
          : createDefaultBranchThresholdScoreRules(branchId)
        : b.scoreRules;
    return {
      ...b,
      id: branchId,
      scoreRules: fallbackRules?.map((r, j) => ({ ...r, id: r.id || `${branchId}-r${j}` })),
    };
  });
  return { ...config, branches: branches.map(normalizeBranchIndicatorValueMatch) };
}

function withNormalizedConditionalSource(
  ind: RiskIndicatorRow,
  config: ConditionalScoringConfig,
  allIndicators: RiskIndicatorRow[],
): ConditionalScoringConfig {
  const scope = getIndicatorSurveyScope(ind) === 'region' ? 'region' : 'point';
  return {
    ...config,
    source: normalizeConditionSourceKey(config.source, scope, allIndicators, ind.code),
  };
}

/** 补齐条件赋分结构；不自动为导则指标开启条件赋分 */
export function migrateIndicatorConditionalScoring(
  ind: RiskIndicatorRow,
  allIndicators?: RiskIndicatorRow[],
): RiskIndicatorRow {
  const indicators = allIndicators ?? [ind];
  const normalize = (cfg: ConditionalScoringConfig) =>
    withNormalizedConditionalSource(ind, cfg, indicators);

  if (hasAuxiliaryConditionSurvey(ind)) {
    const wasEnabled = ind.conditionalScoring?.enabled ?? false;
    const aligned = alignAuxiliaryConditionalOnRow(ind);
    const cfg = aligned.conditionalScoring ?? createEmptyConditionalScoring();
    const modeEnabled =
      aligned.scoringRuleMode === 'conditional' || wasEnabled;
    return {
      ...aligned,
      conditionalScoring: normalize({
        ...cfg,
        enabled: modeEnabled,
        branches: cfg.branches.map((b, i) => ({
          ...b,
          id: b.id || `${ind.id}-cb${i}`,
          scoreRules: b.scoreRules?.map((r, j) => ({
            ...r,
            id: r.id || `${ind.id}-cb${i}-r${j}`,
          })),
        })),
      }),
    };
  }

  const existing = ind.conditionalScoring;
  if (existing?.enabled && existing.branches?.length) {
    return {
      ...ind,
      conditionalScoring: normalize(normalizeConditionalBranches(existing, ind)),
    };
  }
  const cfg = existing ?? createEmptyConditionalScoring();
  return {
    ...ind,
    conditionalScoring: existing?.enabled ? normalize(cfg) : cfg,
  };
}

export function formatConditionalScoringSummary(
  ind: RiskIndicatorRow,
  indicators?: RiskIndicatorRow[],
): string[] {
  const cfg = ind.conditionalScoring;
  if (!cfg?.enabled) return [];
  const lines = [`条件来源：${formatConditionSourceLabel(cfg.source, indicators)}`];
  if (cfg.mode === 'branch_threshold') {
    cfg.branches.forEach(b => {
      const tiers = (b.scoreRules ?? []).map(r => r.label || `score=${r.score}`).join(' / ');
      const vm = resolveBranchIndicatorValueMatch(b);
      lines.push(
        `· ${b.label}：${vm ? formatBranchIndicatorValueMatch(vm) : '—'}${tiers ? `（${tiers}）` : ''}`,
      );
    });
  } else {
    cfg.branches.forEach(b => {
      lines.push(`· ${b.label}：${(b.scoreRules ?? []).map(r => r.label).join(' / ')}`);
    });
  }
  return lines;
}

export function getAppendixBMatchValueOptions(
  key: string,
  indicators?: RiskIndicatorRow[],
): { value: string; label: string }[] {
  if (indicators?.length) {
    const fromInd = getConditionIndicatorMatchValueOptions(key, indicators);
    if (fromInd.length) return fromInd;
  }
  if (key === 'areaImportance') {
    return (Object.entries(AREA_IMPORTANCE_LABEL) as [AreaImportance, string][]).map(([value, label]) => ({
      value,
      label,
    }));
  }
  const ptField = findAppendixBConditionField(key);
  if (ptField?.kind === 'boolean') {
    return [
      { value: 'true', label: '是' },
      { value: 'false', label: '否' },
    ];
  }
  return [];
}
