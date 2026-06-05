import type {
  ConditionalScoringConfig,
  HazardPointType,
  IndicatorAuxiliaryConditionField,
  RiskIndicatorRow,
  ScoreConditionSource,
  ScoreRule,
  SurveyPointType,
} from './types';
import { HAZARD_POINT_TYPE_LABEL } from './types';
import { resolveBranchIndicatorValueMatch } from './conditionalScoring';
import {
  createGenericNumericBranchRules,
  hasConfiguredNumericBands,
} from './scoreRuleNumericBands';

/** 辅助条件是否纳入普查填报（默认是） */
export function shouldCollectAuxiliaryInSurvey(
  ind: Pick<RiskIndicatorRow, 'survey'> | undefined,
): boolean {
  const aux = getAuxiliaryCondition(ind);
  if (!aux) return false;
  return aux.collectInSurvey !== false;
}

/** 辅助条件是否在「基本信息」类型专用信息中填报 */
export function shouldCollectAuxiliaryInAppendixB(
  ind: Pick<RiskIndicatorRow, 'survey'> | undefined,
): boolean {
  const aux = ind?.survey?.auxiliaryCondition;
  if (!aux?.fieldKey?.trim() || aux.surveyPlacement !== 'appendix_b') return false;
  if (aux.collectInSurvey === false) return false;
  // 条件赋分同步时 inputVariant 可能被写成 default，仍按 auxiliaryCondition 识别
  if (ind?.survey?.inputVariant === 'auxiliary_then_select') return true;
  return Boolean(aux.fieldKey);
}

/** 辅助条件是否在「指标普查」Tab 单独占一行 */
export function shouldCollectAuxiliaryInIndicatorCensus(
  ind: Pick<RiskIndicatorRow, 'survey'> | undefined,
): boolean {
  if (!shouldCollectAuxiliaryInSurvey(ind)) return false;
  return !shouldCollectAuxiliaryInAppendixB(ind);
}

/** 指标是否适用于指定易涝点类型 */
export function indicatorAppliesToSurveyPointType(
  ind: Pick<RiskIndicatorRow, 'applicableTypes'>,
  pointType: SurveyPointType,
): boolean {
  return ind.applicableTypes.includes('GLOBAL') || ind.applicableTypes.includes(pointType);
}

/** 主适用点型（非 GLOBAL 的首项，用于专用信息区块文案） */
export function resolvePrimarySurveyPointType(
  applicableTypes?: HazardPointType[],
): SurveyPointType | undefined {
  const t = (applicableTypes ?? []).find(x => x !== 'GLOBAL');
  return t as SurveyPointType | undefined;
}

/** 内涝基本信息条件字段展示名 */
export function formatAppendixAuxiliaryConditionLabel(
  aux: IndicatorAuxiliaryConditionField,
  applicableTypes?: HazardPointType[],
): string {
  const pt = resolvePrimarySurveyPointType(applicableTypes);
  const suffix = pt ? `（${HAZARD_POINT_TYPE_LABEL[pt]}专用信息）` : '（类型专用信息）';
  const name = resolveAuxiliaryDisplayLabel(aux, applicableTypes);
  return `${name}${suffix}`;
}

/** 是否为当前指标自动生成的辅助条件 fieldKey（{code}_COND） */
export function isSelfAuxiliaryConditionFieldKey(
  fieldKey: string | undefined,
  indicatorCode: string | undefined,
): boolean {
  const key = fieldKey?.trim() ?? '';
  const code = indicatorCode?.trim() ?? '';
  return Boolean(code && key === `${code}_COND`);
}

/** 是否为内部字段键形态（非用户手填中文名） */
export function isInternalAuxiliaryFieldKeyLabel(
  label: string | undefined,
  fieldKey: string | undefined,
): boolean {
  const text = label?.trim() ?? '';
  const key = fieldKey?.trim() ?? '';
  if (!text) return true;
  if (key && text === key) return true;
  if (/^[A-Z][A-Z0-9_]*_COND$/.test(text)) return true;
  return false;
}

/** 辅助条件普查展示名（清洗 label 与 fieldKey 相同或内部键形态） */
export function resolveAuxiliaryDisplayLabel(
  aux: Pick<IndicatorAuxiliaryConditionField, 'fieldKey' | 'label' | 'surveyPlacement'>,
  applicableTypes: HazardPointType[] = ['GLOBAL'],
): string {
  if (aux.surveyPlacement === 'appendix_b') {
    const raw = aux.label?.trim() ?? '';
    if (!isInternalAuxiliaryFieldKeyLabel(raw, aux.fieldKey)) return raw;
    return '辅助条件';
  }
  const raw = aux.label?.trim() ?? '';
  if (isInternalAuxiliaryFieldKeyLabel(raw, aux.fieldKey)) return '辅助条件';
  return raw;
}

/** 规范化 auxiliaryCondition.label（存库用，保留用户合法手填中文） */
export function normalizeAuxiliaryConditionLabel(
  aux: IndicatorAuxiliaryConditionField,
  applicableTypes: HazardPointType[] = ['GLOBAL'],
): IndicatorAuxiliaryConditionField {
  return {
    ...aux,
    label: resolveAuxiliaryDisplayLabel(aux, applicableTypes),
  };
}

/** 当前点型下，配置了附录 B 辅助条件的指标（条件赋分下拉用，不要求已启用） */
export function listAppendixAuxiliaryConditionSources(
  indicators: RiskIndicatorRow[],
  pointType: SurveyPointType,
): { owner: RiskIndicatorRow; config: IndicatorAuxiliaryConditionField }[] {
  return indicators
    .filter(i => shouldCollectAuxiliaryInAppendixB(i))
    .filter(i => indicatorAppliesToSurveyPointType(i, pointType))
    .map(i => ({ owner: i, config: getAuxiliaryCondition(i)! }));
}

/** 当前点型下，在「基本信息」专用信息中填报的辅助条件（仅已启用指标参与普查） */
export function listAppendixAuxiliarySurveyFields(
  indicators: RiskIndicatorRow[],
  pointType: SurveyPointType,
): { owner: RiskIndicatorRow; config: IndicatorAuxiliaryConditionField }[] {
  return listAppendixAuxiliaryConditionSources(indicators, pointType).filter(({ owner }) => owner.enabled);
}

export function hasAuxiliaryConditionSurvey(
  ind: Pick<RiskIndicatorRow, 'survey'> | undefined,
): boolean {
  const aux = ind?.survey?.auxiliaryCondition;
  if (!aux?.fieldKey?.trim()) return false;
  if (ind?.survey?.inputVariant === 'auxiliary_then_select') return true;
  // 兼容历史数据：已配置 auxiliaryCondition 但 inputVariant 被条件赋分覆盖为 default
  return aux.collectInSurvey !== false;
}

export function getAuxiliaryCondition(
  ind: Pick<RiskIndicatorRow, 'survey'> | undefined,
): IndicatorAuxiliaryConditionField | undefined {
  if (!hasAuxiliaryConditionSurvey(ind)) return undefined;
  return ind!.survey.auxiliaryCondition;
}

export function findIndicatorByAuxiliaryFieldKey(
  fieldKey: string,
  indicators: RiskIndicatorRow[],
): RiskIndicatorRow | undefined {
  return indicators.find(
    i =>
      i.survey?.auxiliaryCondition?.fieldKey === fieldKey ||
      i.survey?.auxiliaryCondition?.legacyFieldKeys?.includes(fieldKey),
  );
}

export function isAuxiliaryConditionFieldKey(
  key: string | undefined,
  indicators?: RiskIndicatorRow[],
): boolean {
  if (!key || !indicators?.length) return false;
  return indicators.some(
    i =>
      i.survey?.auxiliaryCondition?.fieldKey === key ||
      i.survey?.auxiliaryCondition?.legacyFieldKeys?.includes(key),
  );
}

export function resolveAuxiliaryFieldLabel(
  fieldKey: string,
  indicators: RiskIndicatorRow[],
): string {
  const owner = findIndicatorByAuxiliaryFieldKey(fieldKey, indicators);
  if (owner?.survey?.auxiliaryCondition) {
    return resolveAuxiliaryDisplayLabel(
      owner.survey.auxiliaryCondition,
      owner.applicableTypes,
    );
  }
  return fieldKey;
}

/** 条件赋分：辅助条件对应的来源（内涝基本信息 vs 指标普查） */
export function resolveAuxiliaryConditionSource(
  aux: IndicatorAuxiliaryConditionField,
): ScoreConditionSource {
  if (aux.surveyPlacement === 'appendix_b') {
    return { type: 'appendix_b', key: aux.fieldKey };
  }
  return { type: 'indicator', key: aux.fieldKey };
}

/** 指标辅助条件对应的条件赋分来源（无辅助条件时返回 undefined） */
export function resolveConditionalSourceForIndicator(
  ind: Pick<RiskIndicatorRow, 'survey'> | undefined,
): ScoreConditionSource | undefined {
  if (!hasAuxiliaryConditionSurvey(ind)) return undefined;
  const aux = getAuxiliaryCondition(ind);
  if (!aux?.fieldKey?.trim()) return undefined;
  return resolveAuxiliaryConditionSource(aux);
}

/** 条件取值存于 indicatorValues、但在「内涝基本信息」专用信息中填报 */
export function isAppendixBasicInfoIndicatorValueKey(
  key: string,
  indicators?: RiskIndicatorRow[],
): boolean {
  if (!key || !indicators?.length) return false;
  return indicators.some(
    i =>
      i.survey?.auxiliaryCondition?.fieldKey === key &&
      i.survey.auxiliaryCondition.surveyPlacement === 'appendix_b',
  );
}

/** 附录 B 专用信息中的数值型辅助条件（保存校验需包含当前编辑指标上的 survey） */
export function isAppendixBasicInfoNumericAuxiliaryKey(
  key: string,
  self?: Pick<RiskIndicatorRow, 'survey'>,
  indicators?: RiskIndicatorRow[],
): boolean {
  if (!key) return false;
  if (isAppendixBasicInfoIndicatorValueKey(key, indicators)) return true;
  const aux = self?.survey?.auxiliaryCondition;
  return Boolean(aux?.fieldKey === key && aux.surveyPlacement === 'appendix_b');
}

export function getAuxiliaryConditionOption(
  ind: RiskIndicatorRow,
): { value: string; label: string } | null {
  const aux = getAuxiliaryCondition(ind);
  if (!aux || aux.surveyPlacement === 'appendix_b') return null;
  return {
    value: aux.fieldKey,
    label: resolveAuxiliaryDisplayLabel(aux, ind.applicableTypes),
  };
}

export function getAuxiliaryNumericFromValues(
  values: Record<string, string | number | boolean | null | undefined> | undefined,
  ind: Pick<RiskIndicatorRow, 'survey'>,
): number | undefined {
  const aux = getAuxiliaryCondition(ind);
  if (!aux || !values) return undefined;
  const keys = [aux.fieldKey, ...(aux.legacyFieldKeys ?? [])];
  for (const key of keys) {
    const raw = values[key];
    if (raw === undefined || raw === null || raw === '') continue;
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}

export function resolveAuxiliaryThresholdPct(ind: RiskIndicatorRow): number | undefined {
  const aux = getAuxiliaryCondition(ind);
  if (aux?.thresholdPct !== undefined) return aux.thresholdPct;
  const cfg = ind.conditionalScoring;
  if (!cfg?.branches?.length) return undefined;
  for (const b of cfg.branches) {
    const m = resolveBranchIndicatorValueMatch(b);
    if (m?.kind === 'lte' || m?.kind === 'lt') return m.value;
    if (m?.kind === 'gt' || m?.kind === 'gte') return m.value;
  }
  return undefined;
}

function pickBranchRules(allRules: ScoreRule[], branchIndex: number, branchCount: number): ScoreRule[] {
  if (!allRules.length) return [];
  if (branchCount <= 1) return allRules;
  const per = Math.max(1, Math.floor(allRules.length / branchCount));
  const start = branchIndex * per;
  const end = branchIndex === branchCount - 1 ? allRules.length : start + per;
  const picked = allRules.slice(start, end);
  if (picked.length) return picked;
  // 主指标赋分档少于分支数时，避免末支无档（如仅 1 档却要 S≤7% / S>7% 两支）
  return [allRules[allRules.length - 1]!];
}

/** 条件分支下各支赋分档：数值主指标用区间表，枚举主指标按顶层 scoreRules 拆分 */
function pickBranchScoreRules(ind: RiskIndicatorRow, branchIndex: number, branchCount: number): ScoreRule[] {
  if (ind.valueType === 'numeric' && hasAuxiliaryConditionSurvey(ind)) {
    const existing = ind.conditionalScoring?.branches?.[branchIndex]?.scoreRules;
    if (existing?.length && hasConfiguredNumericBands(existing)) {
      return existing.map((r, j) => ({
        ...r,
        id: r.id || `${ind.id}-cb${branchIndex}-r${j}`,
      }));
    }
    return createGenericNumericBranchRules(`${ind.id}-cb${branchIndex}`);
  }
  return pickBranchRules(ind.scoreRules, branchIndex, branchCount);
}

/** 用户新建：中性两支条件分支（无数值条件，须用户配置） */
export function buildNeutralAuxiliaryConditionalBranches(
  ind: RiskIndicatorRow,
): ConditionalScoringConfig['branches'] {
  const branchCount = 2;
  return [
    {
      id: `${ind.id}-cb0`,
      label: '分支 1',
      scoreRules: pickBranchScoreRules(ind, 0, branchCount).map((r, j) => ({
        ...r,
        id: `${ind.id}-cb0-r${j}`,
      })),
    },
    {
      id: `${ind.id}-cb1`,
      label: '分支 2',
      scoreRules: pickBranchScoreRules(ind, 1, branchCount).map((r, j) => ({
        ...r,
        id: `${ind.id}-cb1-r${j}`,
      })),
    },
  ];
}

/** 由指标 scoreRules 与辅助条件配置生成条件赋分 */
export function buildAuxiliaryConditionalFromIndicator(ind: RiskIndicatorRow): ConditionalScoringConfig {
  const aux = getAuxiliaryCondition(ind);
  if (!aux) {
    return { enabled: true, mode: 'branch_rules', source: { type: 'indicator', key: '' }, branches: [] };
  }
  const existing = ind.conditionalScoring;
  const branchesHaveRules = existing?.branches?.every(b => (b.scoreRules?.length ?? 0) > 0);
  if (existing?.branches?.length && existing.source?.key && branchesHaveRules) {
    return {
      ...existing,
      enabled: true,
      mode: 'branch_rules',
      source: resolveAuxiliaryConditionSource(aux),
    };
  }

  const branches = buildNeutralAuxiliaryConditionalBranches(ind);

  return {
    enabled: true,
    mode: 'branch_rules',
    source: resolveAuxiliaryConditionSource(aux),
    branches,
  };
}

export function resolveActiveAuxiliaryBranch(
  ind: RiskIndicatorRow,
  auxiliaryValue: number | undefined,
): { branchIndex: number; rules: ScoreRule[] } | null {
  const cfg = ind.conditionalScoring;
  if (!cfg?.enabled || auxiliaryValue === undefined || Number.isNaN(auxiliaryValue)) return null;
  for (let i = 0; i < cfg.branches.length; i++) {
    const b = cfg.branches[i];
    const m = resolveBranchIndicatorValueMatch(b);
    if (!m) continue;
    const raw = auxiliaryValue;
    let hit = false;
    switch (m.kind) {
      case 'lte':
        hit = raw <= m.value;
        break;
      case 'lt':
        hit = raw < m.value;
        break;
      case 'gte':
        hit = raw >= m.value;
        break;
      case 'gt':
        hit = raw > m.value;
        break;
      default:
        break;
    }
    if (hit && b.scoreRules?.length) return { branchIndex: i, rules: b.scoreRules };
  }
  return null;
}

export function getAuxiliaryBranchSelectOptions(
  ind: RiskIndicatorRow,
  auxiliaryValue: number | undefined,
) {
  const allDisabled = ind.scoreRules.map(r => ({
    value: r.label,
    label: r.label,
    disabled: true,
  }));
  const active = resolveActiveAuxiliaryBranch(ind, auxiliaryValue);
  if (!active) return allDisabled;
  return active.rules.map(r => ({ value: r.label, label: r.label }));
}

export function isLabelValidForAuxiliaryBranch(
  ind: RiskIndicatorRow,
  label: string | undefined,
  auxiliaryValue: number | undefined,
): boolean {
  if (!label) return false;
  const active = resolveActiveAuxiliaryBranch(ind, auxiliaryValue);
  if (!active) return false;
  return active.rules.some(r => r.label === label);
}

export function migrateSurveyIndicatorValues(
  values: Record<string, string | number | boolean | null | undefined> | undefined,
  indicators?: RiskIndicatorRow[],
): Record<string, string | number | boolean | null | undefined> {
  if (!values) return {};
  let next = { ...values };
  if (!indicators?.length) return next;
  for (const ind of indicators) {
    const aux = ind.survey?.auxiliaryCondition;
    if (!aux) continue;
    for (const legacy of aux.legacyFieldKeys ?? []) {
      if (
        next[legacy] !== undefined &&
        next[legacy] !== null &&
        next[legacy] !== '' &&
        (next[aux.fieldKey] === undefined ||
          next[aux.fieldKey] === null ||
          next[aux.fieldKey] === '')
      ) {
        next[aux.fieldKey] = next[legacy];
      }
      delete next[legacy];
    }
  }
  return next;
}

/** 赋分说明 / ? 悬停：辅助条件当前值提示 */
export function formatAuxiliaryValueSurveyHint(
  ind: RiskIndicatorRow,
  auxiliaryValue: number | undefined,
): string | undefined {
  const aux = getAuxiliaryCondition(ind);
  if (!aux || auxiliaryValue === undefined || Number.isNaN(auxiliaryValue)) return undefined;
  const unit = aux.unit ? aux.unit : '';
  return `当前 ${aux.label}=${auxiliaryValue}${unit}，请从下方选择对应分档。`;
}
