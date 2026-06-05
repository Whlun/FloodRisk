import type { IndicatorAppendixBSurveyPart, IndicatorAppendixBTierBand, RiskIndicatorRow } from './types';
import { getGuidelineTierBandTemplate } from './guidelineTierBandTemplates';
import { mergeIndicatorSurveyConfig } from './indicatorSurveyUtils';
import { createEmptyConditionalScoring } from './conditionalScoring';

function cloneTierBands(bands: IndicatorAppendixBTierBand[]): IndicatorAppendixBTierBand[] {
  return bands.map(b => ({
    riskTier: b.riskTier,
    score: b.score,
    match: { ...b.match },
  }));
}

/** Form.List 可能产生稀疏数组，须过滤无效分档项 */
export function getValidTierBands(
  tierBands: IndicatorAppendixBSurveyPart['tierBands'] | undefined,
): IndicatorAppendixBTierBand[] {
  return (tierBands ?? []).filter(
    (band): band is IndicatorAppendixBTierBand =>
      Boolean(band && band.match && typeof band.score === 'number'),
  );
}

/** Form.List 删除后可能产生空槽，须过滤 */
export function getValidCompositeSurveyParts(
  survey: RiskIndicatorRow['survey'] | undefined,
): IndicatorAppendixBSurveyPart[] {
  return (survey?.appendixBSurveyParts ?? []).filter(
    (p): p is IndicatorAppendixBSurveyPart =>
      Boolean(p && (p.label?.trim() || p.appendixBFieldKey?.trim() || p.valueFieldKey?.trim())),
  );
}

export function isCompositeSurveyConfigured(
  survey: RiskIndicatorRow['survey'] | undefined,
): boolean {
  const parts = getValidCompositeSurveyParts(survey);
  return parts.length > 0 && parts.every(p => getValidTierBands(p.tierBands).length >= 2);
}

/**
 * 为复合子项补全数值分档：优先种子同键子项，其次标准分档模板（人行/车行出入口等）。
 */
export function fillCompositeSurveyPartsTierBands(
  parts: IndicatorAppendixBSurveyPart[] | undefined,
  seedParts?: IndicatorAppendixBSurveyPart[],
): IndicatorAppendixBSurveyPart[] {
  const seedByKey = new Map(
    (seedParts ?? []).map(p => [p.appendixBFieldKey, p] as const),
  );
  const source = (parts ?? []).filter(Boolean);
  const filled = source.map(part => {
    const valid = getValidTierBands(part.tierBands);
    if (valid.length >= 2) {
      return { ...part, tierBands: cloneTierBands(valid) };
    }
    const seedPart = seedByKey.get(part.appendixBFieldKey);
    if (seedPart && getValidTierBands(seedPart.tierBands).length >= 2) {
      return { ...part, tierBands: cloneTierBands(getValidTierBands(seedPart.tierBands)) };
    }
    const tmpl = getGuidelineTierBandTemplate(part.appendixBFieldKey);
    if (tmpl) {
      return {
        ...part,
        tierBands: cloneTierBands(tmpl.tierBands),
      };
    }
    return part;
  });

  const allValid = filled.length > 0 && filled.every(p => getValidTierBands(p.tierBands).length >= 2);
  if (allValid) return filled;

  if (seedParts?.length) {
    return seedParts.map(p => ({
      ...p,
      tierBands: cloneTierBands(getValidTierBands(p.tierBands)),
    }));
  }
  return filled;
}

/** 本地分档无效时，从导则种子灌入复合指标配置（不覆盖已有效配置） */
export function hydrateCompositeIndicatorFromSeed(
  row: RiskIndicatorRow,
  seed?: RiskIndicatorRow,
): Partial<RiskIndicatorRow> {
  if (row.scoringRuleMode === 'conditional' || row.scoringRuleMode === 'uniform') {
    return {};
  }
  if (row.conditionalScoring?.enabled) {
    return {};
  }
  if (!seed?.survey || seed.survey.inputVariant !== 'composite_appendix_numeric') {
    return {};
  }
  const mergedSurvey = mergeIndicatorSurveyConfig(row, seed);
  const filledParts = fillCompositeSurveyPartsTierBands(
    mergedSurvey.appendixBSurveyParts,
    seed.survey.appendixBSurveyParts,
  );
  const surveyWithBands = {
    ...mergedSurvey,
    inputVariant: 'composite_appendix_numeric' as const,
    compositeAggregation: mergedSurvey.compositeAggregation ?? 'max_f',
    appendixBSurveyParts: filledParts,
  };
  if (isCompositeSurveyConfigured(surveyWithBands)) {
    return {
      scoringRuleMode: 'composite',
      survey: surveyWithBands,
      conditionalScoring: {
        ...(row.conditionalScoring ?? createEmptyConditionalScoring()),
        enabled: false,
      },
    };
  }
  return {
    survey: surveyWithBands,
    scoringRuleMode: 'composite' as const,
    scoreRules: seed.scoreRules?.map(r => ({ ...r })) ?? row.scoreRules,
    scoreExplanation: seed.scoreExplanation ?? row.scoreExplanation,
    conditionalScoring: {
      ...(row.conditionalScoring ?? createEmptyConditionalScoring()),
      enabled: false,
    },
  };
}
