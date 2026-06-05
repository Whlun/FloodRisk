import { findAppendixBConditionField } from './appendixBConditionFields';
import { findAppendixBSurveyPartOption } from './compositePartFieldBinding';
import {
  findIndicatorBySurveyFieldKey,
  getNumericConstraint,
  resolveAppendixBValueFieldKey,
} from './numericIndicatorConstraints';
import type { RiskIndicatorRow, ScoreConditionSource } from './types';

/** 从 rangeLabel 尾部解析单位，如「合理范围 0～20 %」→ % */
export function parseUnitFromRangeLabel(rangeLabel: string): string | undefined {
  const t = rangeLabel.trim();
  if (!t) return undefined;
  const m = /合理范围\s+[\d.]+\s*[～~\-]\s*[\d.]+\s+(.+)$/u.exec(t);
  if (!m) return undefined;
  const unit = m[1].trim();
  return unit === '无量纲' ? undefined : unit;
}

/** 从字段中文标签解析单位，如「下凹深度 (cm)」「H（m）」 */
export function parseUnitFromFieldLabel(label: string): string | undefined {
  const t = label.trim();
  if (!t) return undefined;
  const m = /\(([^)]+)\)|（([^）]+)）/u.exec(t);
  if (!m) return undefined;
  let unit = (m[1] ?? m[2] ?? '').trim();
  if (!unit) return undefined;
  if (unit.includes('/')) {
    unit = unit.split('/').pop()?.trim() ?? unit;
  }
  return unit || undefined;
}

/** 复合子项：按条件来源解析展示单位（用于分档描述与阈值输入） */
export function resolveCompositePartUnit(
  source: ScoreConditionSource,
  indicators: RiskIndicatorRow[],
  opts?: { indicatorCode?: string; partIndex?: number },
): string | undefined {
  const key = source.key?.trim() ?? '';
  if (!key) return undefined;

  if (source.type === 'indicator') {
    const ind = findIndicatorBySurveyFieldKey(key, indicators);
    const direct = ind?.unit?.trim();
    if (direct) return direct;
    const code = ind?.code ?? key;
    const c = getNumericConstraint(code, ind?.survey?.auxiliaryCondition);
    return c ? parseUnitFromRangeLabel(c.rangeLabel) : undefined;
  }

  for (const ind of indicators) {
    const aux = ind.survey?.auxiliaryCondition;
    if (aux?.fieldKey !== key || aux.surveyPlacement !== 'appendix_b') continue;
    const auxUnit = aux.unit?.trim();
    if (auxUnit) return auxUnit;
    if (aux.numericRange?.rangeLabel) {
      const parsed = parseUnitFromRangeLabel(aux.numericRange.rangeLabel);
      if (parsed) return parsed;
    }
  }

  const mapped = resolveAppendixBValueFieldKey(
    key,
    opts?.indicatorCode ?? 'IND',
    opts?.partIndex ?? 0,
  );
  const c = getNumericConstraint(key) ?? getNumericConstraint(mapped);
  if (c) {
    const parsed = parseUnitFromRangeLabel(c.rangeLabel);
    if (parsed) return parsed;
  }

  const option = findAppendixBSurveyPartOption(key);
  if (option?.label) {
    const parsed = parseUnitFromFieldLabel(option.label);
    if (parsed) return parsed;
  }

  const field = findAppendixBConditionField(key);
  if (field?.label) {
    const parsed = parseUnitFromFieldLabel(field.label);
    if (parsed) return parsed;
  }

  return undefined;
}
