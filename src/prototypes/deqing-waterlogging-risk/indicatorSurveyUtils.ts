import type {
  IndicatorAppendixBSurveyPart,
  Level1Factor,
  RegionalPreventionConfig,
  RiskIndicatorRow,
  SurveyPointType,
} from './types';
import { migrateIndicatorConditionalScoring } from './conditionalScoring';
import {
  getAuxiliaryNumericFromValues,
  hasAuxiliaryConditionSurvey,
  shouldCollectAuxiliaryInSurvey,
} from './compositeConditionalSurvey';
import {
  getAppendixBSurveyParts,
  hasAppendixBSurveyBinding,
  isCompositeAppendixNumericSurvey,
} from './appendixBSurveyBinding';
import { normalizeCompositeAggregation } from './compositeAggregation';
import {
  filterCompositePartsForPointType,
  normalizeCompositeSurveyPart,
  resolveCompositePartSource,
} from './compositePartSource';
import { appendixBFieldCollectableAtPointType } from './appendixBFieldPointTypes';
import { isCompositeAppendixSurveyFilled } from './compositeAppendixScoring';
import { fillCompositeSurveyPartsTierBands, getValidTierBands } from './compositeSurveyHydration';
import { resolveScoreExplanation } from './scoreExplanation';

export function getIndicatorSurveyScope(ind: RiskIndicatorRow): 'point' | 'region' {
  if (ind.level1 === 'PREVENTION') return 'region';
  if (ind.survey?.scope) return ind.survey.scope;
  return 'point';
}

export function defaultSurveyConfig(ind: Pick<RiskIndicatorRow, 'code' | 'level1'>): RiskIndicatorRow['survey'] {
  const scope = ind.level1 === 'PREVENTION' ? 'region' : 'point';
  return {
    collectInSurvey: scope === 'point',
    surveyRequired: false,
    fieldKey: ind.code,
    scope,
  };
}

/** 合并导则预置与本地保存的普查配置，避免丢失 inputVariant / auxiliaryCondition */
export function mergeIndicatorSurveyConfig(
  hit: RiskIndicatorRow,
  base?: Pick<RiskIndicatorRow, 'survey' | 'code' | 'level1' | 'scoringRuleMode'>,
): RiskIndicatorRow['survey'] {
  const scope =
    hit.level1 === 'PREVENTION'
      ? 'region'
      : (hit.survey?.scope ?? base?.survey?.scope ?? 'point');
  const baseComposite = base?.survey?.inputVariant === 'composite_appendix_numeric';
  const hitParts = hit.survey?.appendixBSurveyParts;
  const partsIncomplete =
    !hitParts?.length || hitParts.some(p => getValidTierBands(p.tierBands).length < 2);
  const explicitMode = hit.scoringRuleMode ?? base?.scoringRuleMode;
  const userChoseNonComposite = explicitMode === 'conditional' || explicitMode === 'uniform';

  let inputVariant = hit.survey?.inputVariant ?? base?.survey?.inputVariant;
  let appendixBSurveyParts = hit.survey?.appendixBSurveyParts ?? base?.survey?.appendixBSurveyParts;
  if (baseComposite && partsIncomplete && !userChoseNonComposite) {
    appendixBSurveyParts = base?.survey?.appendixBSurveyParts ?? hitParts;
    inputVariant = 'composite_appendix_numeric';
  }

  const merged: RiskIndicatorRow['survey'] = {
    ...defaultSurveyConfig(hit),
    ...base?.survey,
    ...hit.survey,
    scope,
    fieldKey: hit.survey?.fieldKey ?? base?.survey?.fieldKey ?? hit.code,
    collectInSurvey:
      hit.survey?.collectInSurvey ?? base?.survey?.collectInSurvey ?? scope === 'point',
    surveyRequired: hit.survey?.surveyRequired ?? base?.survey?.surveyRequired ?? false,
    inputVariant,
    auxiliaryCondition: mergeAuxiliaryCondition(hit.survey?.auxiliaryCondition, base?.survey?.auxiliaryCondition),
    appendixBSurveyParts,
    appendixBFieldKey: hit.survey?.appendixBFieldKey ?? base?.survey?.appendixBFieldKey,
    compositeAggregation: normalizeCompositeAggregation(
      hit.survey?.compositeAggregation ?? base?.survey?.compositeAggregation,
    ),
  };
  if (inputVariant === 'composite_appendix_numeric') {
    const code = merged.fieldKey ?? hit.code;
    const parts = (merged.appendixBSurveyParts ?? [])
      .filter((p): p is IndicatorAppendixBSurveyPart => Boolean(p))
      .map((p, i) => normalizeCompositeSurveyPart(p, code, i));
    return {
      ...merged,
      appendixBSurveyParts: fillCompositeSurveyPartsTierBands(parts, base?.survey?.appendixBSurveyParts),
    };
  }
  return merged;
}

function mergeAuxiliaryCondition(
  hit: RiskIndicatorRow['survey']['auxiliaryCondition'],
  base: RiskIndicatorRow['survey']['auxiliaryCondition'],
): RiskIndicatorRow['survey']['auxiliaryCondition'] {
  if (!hit && !base) return undefined;
  if (!hit) return base;
  if (!base) return hit;
  return {
    ...base,
    ...hit,
    legacyFieldKeys: hit.legacyFieldKeys ?? base.legacyFieldKeys,
    surveyPlacement: hit.surveyPlacement ?? base.surveyPlacement,
    numericRange: hit.numericRange ?? base.numericRange,
  };
}

/** 与导则预置合并普查配置（避免本地缓存丢失 auxiliaryCondition / surveyPlacement） */
export function enrichIndicatorsWithBaseline(
  indicators: RiskIndicatorRow[],
  baseline: RiskIndicatorRow[],
): RiskIndicatorRow[] {
  const baselineByCode = new Map(baseline.map(row => [row.code, row]));
  return indicators.map(ind => enrichIndicatorSurvey(ind, baselineByCode.get(ind.code)));
}

export function enrichIndicatorSurvey(
  ind: RiskIndicatorRow,
  baseline?: Pick<RiskIndicatorRow, 'survey' | 'code' | 'level1' | 'scoringRuleMode'>,
): RiskIndicatorRow {
  const withSurvey: RiskIndicatorRow = {
    ...ind,
    survey: mergeIndicatorSurveyConfig(ind, baseline),
  };
  const migrated = migrateIndicatorConditionalScoring(withSurvey);
  return {
    ...migrated,
    scoreExplanation: resolveScoreExplanation(migrated),
  };
}

/** 是否纳入单点普查填报（指标定义：参与普查/必填；不含架构启用过滤） */
export function participatesInPointSurvey(ind: RiskIndicatorRow): boolean {
  const s = ind.survey;
  if (!s) return false;
  return s.collectInSurvey !== false || s.surveyRequired === true;
}

function filterPointSurveyIndicatorsByPointType(
  indicators: RiskIndicatorRow[],
  pointType: SurveyPointType,
): RiskIndicatorRow[] {
  return indicators
    .filter(i => getIndicatorSurveyScope(i) === 'point')
    .filter(i => {
      if (i.level1 === 'FORMATION') return i.applicableTypes.includes(pointType);
      return i.applicableTypes.includes('GLOBAL');
    });
}

/** 单点普查填报范围（指标定义层；不含架构启用过滤） */
export function getPointSurveyIndicatorsForFill(
  indicators: RiskIndicatorRow[],
  pointType: SurveyPointType,
): RiskIndicatorRow[] {
  return filterPointSurveyIndicatorsByPointType(indicators, pointType).filter(participatesInPointSurvey);
}

/** 架构确定的单点普查范围（参与普查 + 架构已启用） */
export function getArchitectureScopedSurveyIndicatorsForFill(
  indicators: RiskIndicatorRow[],
  pointType: SurveyPointType,
): RiskIndicatorRow[] {
  return getPointSurveyIndicatorsForFill(indicators, pointType).filter(i => i.enabled);
}

/** 参与定级计分的单点指标（填报范围 + 架构图已启用） */
export function getPointSurveyIndicatorsForScoring(
  indicators: RiskIndicatorRow[],
  pointType: SurveyPointType,
): RiskIndicatorRow[] {
  return getArchitectureScopedSurveyIndicatorsForFill(indicators, pointType);
}

/**
 * 易涝点普查完整度统计用（含附录 B 填报、不在指标普查 Tab 展示的项）
 * @deprecated 语义同 getPointSurveyIndicatorsForFill，保留别名避免遗漏引用
 */
export function getPointSurveyIndicatorsForCoverage(
  indicators: RiskIndicatorRow[],
  pointType: SurveyPointType,
  options?: { architectureScoped?: boolean },
): RiskIndicatorRow[] {
  return options?.architectureScoped
    ? getArchitectureScopedSurveyIndicatorsForFill(indicators, pointType)
    : getPointSurveyIndicatorsForFill(indicators, pointType);
}

/** 指标普查 Tab 展示的指标（排除 appendixBFieldKey 绑定项） */
export function getPointSurveyIndicatorsForPoint(
  indicators: RiskIndicatorRow[],
  pointType: SurveyPointType,
  options?: { architectureScoped?: boolean },
): RiskIndicatorRow[] {
  const base = options?.architectureScoped
    ? getArchitectureScopedSurveyIndicatorsForFill(indicators, pointType)
    : getPointSurveyIndicatorsForFill(indicators, pointType);
  return base.filter(i => !hasAppendixBSurveyBinding(i));
}

/** 未出现在「指标普查」Tab 的常见原因（用于空状态提示） */
export type PointSurveyVisibilityBlockReason =
  | 'not_collect'
  | 'not_enabled_in_architecture'
  | 'appendix_b_only'
  | 'region_scope'
  | 'point_type_mismatch';

export interface PointSurveyVisibilityDiagnostic {
  indicator: RiskIndicatorRow;
  reason: PointSurveyVisibilityBlockReason;
}

function indicatorMatchesPointType(ind: RiskIndicatorRow, pointType: SurveyPointType): boolean {
  if (getIndicatorSurveyScope(ind) !== 'point') return false;
  if (ind.level1 === 'FORMATION') return ind.applicableTypes.includes(pointType);
  return ind.applicableTypes.includes('GLOBAL');
}

/** 解析哪些指标会在指标普查 Tab 展示，以及未展示的原因 */
export function getPointSurveyVisibilityDiagnostics(
  indicators: RiskIndicatorRow[],
  pointType: SurveyPointType,
  options?: { architectureScoped?: boolean },
): { visible: RiskIndicatorRow[]; blocked: PointSurveyVisibilityDiagnostic[] } {
  const visible = getPointSurveyIndicatorsForPoint(indicators, pointType, options);
  const visibleIds = new Set(visible.map(i => i.id));
  const blocked: PointSurveyVisibilityDiagnostic[] = [];

  for (const ind of indicators) {
    if (visibleIds.has(ind.id)) continue;
    if (getIndicatorSurveyScope(ind) === 'region') {
      if (participatesInPointSurvey(ind)) {
        blocked.push({ indicator: ind, reason: 'region_scope' });
      }
      continue;
    }
    if (!indicatorMatchesPointType(ind, pointType)) {
      if (participatesInPointSurvey(ind)) {
        blocked.push({ indicator: ind, reason: 'point_type_mismatch' });
      }
      continue;
    }
    if (!participatesInPointSurvey(ind)) {
      blocked.push({ indicator: ind, reason: 'not_collect' });
      continue;
    }
    if (options?.architectureScoped && !ind.enabled) {
      blocked.push({ indicator: ind, reason: 'not_enabled_in_architecture' });
      continue;
    }
    if (hasAppendixBSurveyBinding(ind)) {
      blocked.push({ indicator: ind, reason: 'appendix_b_only' });
    }
  }

  return { visible, blocked };
}

/** @deprecated 请使用 getPointSurveyIndicatorsForPoint；保留别名避免遗漏引用 */
export function getSurveyIndicatorsForPoint(
  indicators: RiskIndicatorRow[],
  pointType: SurveyPointType,
): RiskIndicatorRow[] {
  return getPointSurveyIndicatorsForPoint(indicators, pointType);
}

/** 全县防灾减灾指标 */
export function getRegionalPreventionIndicators(indicators: RiskIndicatorRow[]): RiskIndicatorRow[] {
  return indicators.filter(
    i => i.enabled && i.level1 === 'PREVENTION' && getIndicatorSurveyScope(i) === 'region',
  );
}

export function indicatorAppliesToPoint(
  ind: RiskIndicatorRow,
  pointType: SurveyPointType,
  indicators?: RiskIndicatorRow[],
): boolean {
  if (getIndicatorSurveyScope(ind) === 'region') return true;
  if (ind.level1 === 'FORMATION') {
    if (!ind.applicableTypes.includes(pointType)) return false;
  } else if (!ind.applicableTypes.includes('GLOBAL')) {
    return false;
  }

  if (hasAppendixBSurveyBinding(ind)) {
    const parts = getAppendixBSurveyParts(ind);
    if (isCompositeAppendixNumericSurvey(ind) || parts.length > 1) {
      if (indicators?.length) {
        return filterCompositePartsForPointType(parts, pointType, ind, indicators).length > 0;
      }
      return parts.some(p => {
        const src = resolveCompositePartSource(p);
        if (src.type === 'appendix_b') {
          return appendixBFieldCollectableAtPointType(src.key, pointType);
        }
        return true;
      });
    }
    const only = parts[0];
    if (only?.appendixBFieldKey) {
      return appendixBFieldCollectableAtPointType(only.appendixBFieldKey, pointType);
    }
  }
  return true;
}

export type IndicatorSurveyValues = Record<string, string | number | boolean | null>;

export function findIndicatorIdentityConflicts(
  ind: Pick<RiskIndicatorRow, 'id' | 'code' | 'survey'>,
  indicators: RiskIndicatorRow[],
): { duplicateCode: boolean; duplicateFieldKey: boolean } {
  const code = String(ind.code ?? '').trim().toUpperCase();
  const fieldKey = String(ind.survey?.fieldKey ?? '').trim();
  const others = indicators.filter(row => row.id !== ind.id);
  return {
    duplicateCode: Boolean(
      code && others.some(row => String(row.code ?? '').trim().toUpperCase() === code),
    ),
    duplicateFieldKey: Boolean(
      fieldKey &&
        others.some(row => String(row.survey?.fieldKey ?? '').trim() === fieldKey),
    ),
  };
}

export function getIndicatorSurveyValue(
  values: IndicatorSurveyValues | undefined | null,
  fieldKey: string,
): string | number | boolean | null | undefined {
  if (!values) return undefined;
  if (!(fieldKey in values)) return undefined;
  return values[fieldKey];
}

export function hasFilledSurveyValue(
  values: IndicatorSurveyValues | undefined | null,
  fieldKey: string,
): boolean {
  const v = getIndicatorSurveyValue(values, fieldKey);
  return v !== undefined && v !== null && v !== '';
}

export function isAuxiliarySurveyFieldFilled(
  ind: RiskIndicatorRow,
  values: IndicatorSurveyValues | undefined | null,
): boolean {
  if (!shouldCollectAuxiliaryInSurvey(ind)) return true;
  return (
    getAuxiliaryNumericFromValues(
      values as Record<string, string | number | boolean | null | undefined>,
      ind,
    ) !== undefined
  );
}

/** 主指标分档/数值是否已填 */
export function isMainSurveyFieldFilled(
  ind: RiskIndicatorRow,
  values: IndicatorSurveyValues | undefined | null,
): boolean {
  return hasFilledSurveyValue(values, ind.survey.fieldKey);
}

/** 单条指标是否已填齐（主字段 + 须单独填报的辅助条件） */
export function isIndicatorSurveyFilled(
  ind: RiskIndicatorRow,
  values: IndicatorSurveyValues | undefined | null,
  pointType?: SurveyPointType,
  indicators?: RiskIndicatorRow[],
): boolean {
  if (isCompositeAppendixNumericSurvey(ind)) {
    return isCompositeAppendixSurveyFilled(ind, values, {
      pointType,
      indicators,
    });
  }
  if (!isMainSurveyFieldFilled(ind, values)) return false;
  if (hasAuxiliaryConditionSurvey(ind)) {
    return isAuxiliarySurveyFieldFilled(ind, values);
  }
  return true;
}

function countApplicableSurveySlots(
  list: RiskIndicatorRow[],
): number {
  return list.reduce(
    (n, ind) => n + 1 + (shouldCollectAuxiliaryInSurvey(ind) ? 1 : 0),
    0,
  );
}

function countFilledSurveySlots(
  list: RiskIndicatorRow[],
  values: IndicatorSurveyValues | undefined | null,
  pointType: SurveyPointType,
  allIndicators: RiskIndicatorRow[],
): number {
  let filled = 0;
  for (const ind of list) {
    if (shouldCollectAuxiliaryInSurvey(ind) && isAuxiliarySurveyFieldFilled(ind, values)) {
      filled += 1;
    }
    if (isCompositeAppendixNumericSurvey(ind)) {
      if (isCompositeAppendixSurveyFilled(ind, values, { pointType, indicators: allIndicators })) {
        filled += 1;
      }
      continue;
    }
    if (isMainSurveyFieldFilled(ind, values)) filled += 1;
  }
  return filled;
}

export function validateSurveyRequired(
  indicators: RiskIndicatorRow[],
  pointType: SurveyPointType,
  values: IndicatorSurveyValues | undefined | null,
  options?: { architectureScoped?: boolean },
): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  for (const ind of getPointSurveyIndicatorsForCoverage(indicators, pointType, options)) {
    if (!ind.survey?.surveyRequired) continue;
    if (!isIndicatorSurveyFilled(ind, values, pointType, indicators)) missing.push(ind.name);
  }
  return { ok: missing.length === 0, missing };
}

export function calcSurveyCoverage(
  indicators: RiskIndicatorRow[],
  pointType: SurveyPointType,
  values: IndicatorSurveyValues | undefined | null,
  options?: { architectureScoped?: boolean },
): { filled: number; applicable: number; percent: number } {
  const applicable = getPointSurveyIndicatorsForCoverage(indicators, pointType, options);
  const applicableCount = countApplicableSurveySlots(applicable);
  const filled = countFilledSurveySlots(applicable, values, pointType, indicators);
  return {
    filled,
    applicable: applicableCount,
    percent: applicableCount ? Math.round((filled / applicableCount) * 100) : 0,
  };
}

/** 单点指标普查 Tab 是否已填齐（纳入普查的指标 100%） */
export function isPointSurveyComplete(
  indicators: RiskIndicatorRow[],
  pointType: SurveyPointType,
  values: IndicatorSurveyValues | undefined | null,
  options?: { architectureScoped?: boolean },
): boolean {
  const { percent, applicable } = calcSurveyCoverage(indicators, pointType, values, options);
  return applicable === 0 || percent === 100;
}

export function calcRegionalPreventionCoverage(
  indicators: RiskIndicatorRow[],
  values: IndicatorSurveyValues | undefined | null,
): { filled: number; applicable: number; percent: number } {
  const applicable = getRegionalPreventionIndicators(indicators);
  const filled = applicable.filter(ind => isIndicatorSurveyFilled(ind, values)).length;
  return {
    filled,
    applicable: applicable.length,
    percent: applicable.length ? Math.round((filled / applicable.length) * 100) : 0,
  };
}

const POINT_LEVEL1: Level1Factor[] = ['HAZARD', 'FORMATION', 'BEARING'];

export function isPointLevel1(level1: Level1Factor): boolean {
  return POINT_LEVEL1.includes(level1);
}
