import type {
  AreaImportance,
  BranchNumericMatch,
  RegionalPreventionConfig,
  RiskIndicatorRow,
  SurveyPayload,
  SurveyPointType,
} from './types';
import {
  buildSurveyPayload,
  lowLyingIndicatorValues,
  sunkenIndicatorValues,
  tunnelIndicatorValues,
  undergroundIndicatorValues,
} from '../../database/deqing-waterlogging-survey-seeds';
import { getNumericConstraint } from './numericIndicatorConstraints';
import {
  getPointSurveyIndicatorsForPoint,
  getRegionalPreventionIndicators,
} from './indicatorSurveyUtils';

/** 取能命中 numericMatch 区间的代表值（避免区间中点落在档间空隙） */
export function pickSampleNumericForMatch(match: BranchNumericMatch): number {
  switch (match.kind) {
    case 'eq':
      return match.value;
    case 'lte':
      return match.value;
    case 'lt':
      return match.value > 0 ? match.value - 0.01 : match.value;
    case 'gte':
      return match.value;
    case 'gt':
      return match.value + 0.01;
    case 'between': {
      const lo = match.minInclusive !== false ? match.min : match.min + 0.01;
      const hi = match.maxInclusive !== false ? match.max : match.max - 0.01;
      return (lo + hi) / 2;
    }
    default:
      return 0;
  }
}

function seedIndicatorValuesForPointType(
  pointType: SurveyPointType,
): Record<string, string | number | boolean> {
  switch (pointType) {
    case 'SUNKEN':
      return sunkenIndicatorValues();
    case 'TUNNEL':
      return tunnelIndicatorValues();
    case 'UNDERGROUND':
      return undergroundIndicatorValues();
    case 'LOW_LYING':
      return lowLyingIndicatorValues();
    default:
      return {};
  }
}

/** 试算/演示：按普查填报方式生成单指标默认原始值 */
export function getDefaultSurveyRawValue(ind: RiskIndicatorRow): string | number | boolean | undefined {
  if (ind.valueType === 'boolean') return false;
  if (ind.valueType === 'numeric') {
    const ruleWithBand = ind.scoreRules.find(r => r.numericMatch);
    if (ruleWithBand?.numericMatch) {
      return Math.round(pickSampleNumericForMatch(ruleWithBand.numericMatch) * 100) / 100;
    }
    const c = getNumericConstraint(ind.code);
    if (c) return Math.round(((c.min + c.max) / 2) * 100) / 100;
    return undefined;
  }
  const labeled = ind.scoreRules.find(r => String(r.label ?? '').trim());
  return labeled?.label ?? ind.scoreRules[0]?.label ?? undefined;
}

/** 仅保留防灾减灾因子键（切换隐患点类型时清空易涝点填报） */
export function retainRegionalIndicatorValues(
  values: SurveyPayload['indicatorValues'],
  regionalIndicators: RiskIndicatorRow[],
): SurveyPayload['indicatorValues'] {
  const keys = new Set(regionalIndicators.map(i => i.survey.fieldKey));
  const out: SurveyPayload['indicatorValues'] = {};
  for (const [k, v] of Object.entries(values)) {
    if (keys.has(k)) out[k] = v;
  }
  return out;
}

/** 从防灾减灾配置提取全县因子原始值（供等级试算默认引用） */
export function extractRegionalIndicatorValues(
  config: RegionalPreventionConfig | null | undefined,
  regionalIndicators: RiskIndicatorRow[],
): SurveyPayload['indicatorValues'] {
  if (!config?.indicatorValues) return {};
  const src = config.indicatorValues;
  const out: SurveyPayload['indicatorValues'] = {};
  for (const ind of regionalIndicators) {
    const raw = src[ind.survey.fieldKey] ?? src[ind.code];
    if (raw !== undefined && raw !== null && raw !== '') {
      out[ind.survey.fieldKey] = raw;
    }
  }
  return out;
}

/** 等级试算：仅易涝点指标演示默认值 */
export function buildPointDemoIndicatorValues(
  indicators: RiskIndicatorRow[],
  pointType: SurveyPointType,
): SurveyPayload['indicatorValues'] {
  const indicatorValues: SurveyPayload['indicatorValues'] = {};
  for (const ind of getPointSurveyIndicatorsForPoint(indicators, pointType)) {
    const raw = getDefaultSurveyRawValue(ind);
    if (raw !== undefined) indicatorValues[ind.survey.fieldKey] = raw;
  }
  return indicatorValues;
}

/** 等级试算初始载荷：防灾减灾引用定级配置 + 易涝点待填 */
export function buildScorePreviewInitialPayload(
  indicators: RiskIndicatorRow[],
  pointType: SurveyPointType,
  regionalConfig: RegionalPreventionConfig | null | undefined,
  areaImportance?: AreaImportance,
): SurveyPayload {
  const regional = getRegionalPreventionIndicators(indicators);
  return {
    appendixB: areaImportance ? { areaImportance } : {},
    indicatorValues: extractRegionalIndicatorValues(regionalConfig, regional),
  };
}

/** 将导则演示种子（键多为指标 code）映射到当前指标的 survey.fieldKey */
function mapSeedValuesToPointIndicators(
  indicators: RiskIndicatorRow[],
  pointType: SurveyPointType,
  seedByCode: Record<string, string | number | boolean>,
  seedPayload: SurveyPayload,
): SurveyPayload['indicatorValues'] {
  const indicatorValues: SurveyPayload['indicatorValues'] = {
    ...seedPayload.indicatorValues,
  };

  for (const ind of getPointSurveyIndicatorsForPoint(indicators, pointType)) {
    const key = ind.survey.fieldKey;
    const fromSeed =
      seedByCode[ind.code] ??
      indicatorValues[key] ??
      indicatorValues[ind.code];
    if (hasFilledPreviewValue(fromSeed)) {
      indicatorValues[key] = fromSeed;
      continue;
    }
    if (hasFilledPreviewValue(indicatorValues[key])) continue;
    const raw = getDefaultSurveyRawValue(ind);
    if (raw !== undefined) indicatorValues[key] = raw;
  }

  return indicatorValues;
}

/** 等级试算：易涝点演示 + 防灾减灾仍引用配置（含附录 B，供复合赋分与子项匹配） */
export function buildScorePreviewDemoPayload(
  indicators: RiskIndicatorRow[],
  pointType: SurveyPointType,
  regionalConfig: RegionalPreventionConfig | null | undefined,
  areaImportance: AreaImportance = 'COUNTY_KEY',
): SurveyPayload {
  const regional = getRegionalPreventionIndicators(indicators);
  const seedByCode = seedIndicatorValuesForPointType(pointType);
  const seedPayload = buildSurveyPayload(pointType, {
    collectedAt: '2026-01-01 00:00:00',
    indicatorValues: seedByCode,
    appendixOverrides: { areaImportance },
  });

  const indicatorValues: SurveyPayload['indicatorValues'] = {
    ...extractRegionalIndicatorValues(regionalConfig, regional),
    ...mapSeedValuesToPointIndicators(indicators, pointType, seedByCode, seedPayload),
  };

  return {
    appendixB: { ...seedPayload.appendixB, areaImportance },
    indicatorValues,
  };
}

function hasFilledPreviewValue(
  raw: string | number | boolean | null | undefined,
): boolean {
  return raw !== undefined && raw !== null && raw !== '';
}
