import type {
  IndicatorAppendixBSurveyPart,
  RiskIndicatorRow,
  ScoreConditionSource,
  SurveyPointType,
} from './types';
import type { IndicatorSurveyValues } from './indicatorSurveyUtils';
import { indicatorAppliesToSurveyPointType } from './compositeConditionalSurvey';
import {
  indicatorEligibleAsConditionCandidate,
  type ConditionSourceFilterContext,
} from './conditionalScoring';
import { appendixBFieldCollectableAtPointType } from './appendixBFieldPointTypes';
import { parseNumericSurveyValue } from './numericIndicatorConstraints';
import { getIndicatorSurveyValue } from './indicatorSurveyUtils';

function trimField(value: string | undefined | null): string {
  return (value ?? '').trim();
}

/** 子项条件来源（缺省 appendix_b + appendixBFieldKey） */
export function resolveCompositePartSource(part: IndicatorAppendixBSurveyPart): ScoreConditionSource {
  const type = part.source?.type ?? 'appendix_b';
  const key = trimField(part.source?.key) || trimField(part.appendixBFieldKey);
  return { type, key };
}

/** 子项条件字段绑定键（来源类型 + 字段键，用于跨子项排他） */
export function compositePartConditionBindingKey(
  sourceType: ScoreConditionSource['type'],
  fieldKey: string,
): string {
  return `${sourceType}:${fieldKey.trim()}`;
}

/** 其它子项已占用的条件字段绑定键 */
export function collectCompositePartConditionKeysUsedByOtherParts(
  parts: IndicatorAppendixBSurveyPart[] | undefined,
  partIndex: number,
): Set<string> {
  const used = new Set<string>();
  (parts ?? []).forEach((part, i) => {
    if (i === partIndex) return;
    const source = resolveCompositePartSource(part);
    if (!source.key) return;
    used.add(compositePartConditionBindingKey(source.type, source.key));
  });
  return used;
}

/** 过滤条件字段选项：其它子项已选的不出现在下拉中（本子项已选保留） */
export function filterExclusiveCompositePartFieldOptions<T extends { value: string }>(
  options: T[],
  parts: IndicatorAppendixBSurveyPart[] | undefined,
  partIndex: number,
  sourceType: ScoreConditionSource['type'],
  currentKey?: string,
): T[] {
  const usedElsewhere = collectCompositePartConditionKeysUsedByOtherParts(parts, partIndex);
  const current = currentKey?.trim();
  return options.filter(o => {
    if (current && String(o.value) === current) return true;
    const binding = compositePartConditionBindingKey(sourceType, String(o.value));
    return !usedElsewhere.has(binding);
  });
}

export function isCompositePartAppendixB(part: IndicatorAppendixBSurveyPart): boolean {
  return resolveCompositePartSource(part).type === 'appendix_b';
}

/** 规范化子项 source / appendixBFieldKey / valueFieldKey */
export function normalizeCompositeSurveyPart(
  part: IndicatorAppendixBSurveyPart,
  indicatorCode: string,
  partIndex: number,
): IndicatorAppendixBSurveyPart {
  const source = resolveCompositePartSource(part);
  if (source.type === 'indicator') {
    const key = source.key;
    return {
      ...part,
      source: { type: 'indicator', key },
      appendixBFieldKey: key || trimField(part.appendixBFieldKey),
      valueFieldKey: key || trimField(part.valueFieldKey) || `${indicatorCode}_P${partIndex + 1}`,
    };
  }
  const appKey = source.key || trimField(part.appendixBFieldKey);
  return {
    ...part,
    source: { type: 'appendix_b', key: appKey },
    appendixBFieldKey: appKey,
    valueFieldKey: trimField(part.valueFieldKey) || `${indicatorCode}_P${partIndex + 1}`,
  };
}

export function resolveCompositePartRawValue(
  part: IndicatorAppendixBSurveyPart,
  values: IndicatorSurveyValues | undefined | null,
  appendixB?: Record<string, string | number | boolean | null | undefined>,
): number | null {
  if (!values) return null;
  const source = resolveCompositePartSource(part);
  if (source.type === 'indicator') {
    return parseNumericSurveyValue(getIndicatorSurveyValue(values, source.key));
  }
  const bag = appendixB as Record<string, unknown> | undefined;
  const fromB = bag?.[source.key];
  if (fromB !== undefined && fromB !== null && fromB !== '') {
    return parseNumericSurveyValue(fromB);
  }
  return parseNumericSurveyValue(getIndicatorSurveyValue(values, part.valueFieldKey));
}

export function compositePartValueFieldKey(part: IndicatorAppendixBSurveyPart): string {
  const source = resolveCompositePartSource(part);
  return source.type === 'indicator' ? source.key : part.valueFieldKey;
}

export function compositePartAppliesAtPointType(
  part: IndicatorAppendixBSurveyPart,
  pointType: SurveyPointType,
  self: Pick<RiskIndicatorRow, 'code' | 'level1' | 'applicableTypes' | 'survey'>,
  indicators: RiskIndicatorRow[],
): boolean {
  const source = resolveCompositePartSource(part);
  if (source.type === 'appendix_b') {
    return appendixBFieldCollectableAtPointType(source.key, pointType);
  }
  const ref = indicators.find(
    i => i.survey?.fieldKey === source.key || i.code === source.key,
  );
  if (!ref || ref.valueType !== 'numeric') return false;
  if (!refIndicatorAppliesToPoint(ref, pointType)) return false;
  const filterCtx: ConditionSourceFilterContext = {
    level1: self.level1,
    applicableTypes: self.applicableTypes,
    code: self.code,
  };
  if (!indicatorEligibleAsConditionCandidate(ref, filterCtx, 'point')) return false;
  if (ref.level1 === 'FORMATION') {
    return indicatorAppliesToSurveyPointType(ref, pointType);
  }
  return true;
}

export function filterCompositePartsForPointType(
  parts: IndicatorAppendixBSurveyPart[],
  pointType: SurveyPointType,
  self: Pick<RiskIndicatorRow, 'code' | 'level1' | 'applicableTypes' | 'survey'>,
  indicators: RiskIndicatorRow[],
): IndicatorAppendixBSurveyPart[] {
  return parts.filter(p => compositePartAppliesAtPointType(p, pointType, self, indicators));
}

export function isCompositePartValueFilled(
  part: IndicatorAppendixBSurveyPart,
  values: IndicatorSurveyValues | undefined | null,
  appendixB?: Record<string, string | number | boolean | null | undefined>,
): boolean {
  return resolveCompositePartRawValue(part, values, appendixB) !== null;
}

/** 保存配置：禁止子项引用本指标 fieldKey */
function refIndicatorAppliesToPoint(ref: RiskIndicatorRow, pointType: SurveyPointType): boolean {
  const scope = ref.survey?.scope ?? (ref.level1 === 'PREVENTION' ? 'region' : 'point');
  if (scope === 'region') return true;
  if (ref.level1 === 'FORMATION') return ref.applicableTypes.includes(pointType);
  return ref.applicableTypes.includes('GLOBAL');
}

export function validateCompositePartSources(
  parts: IndicatorAppendixBSurveyPart[] | undefined,
  selfFieldKey: string,
): string | null {
  if (!parts?.length) return null;
  const fk = selfFieldKey.trim();
  for (const part of parts) {
    const source = resolveCompositePartSource(part);
    if (!source.key.trim()) return '请为每个复合子项选择条件字段';
    if (source.type === 'indicator' && source.key === fk) {
      return '复合子项不能引用本指标自身作为条件来源';
    }
  }
  return null;
}
