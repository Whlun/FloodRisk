import { normalizeCompositeAggregation } from './compositeAggregation';
import { deriveCompositeAggregateScoreRules } from './compositeAggregateScoreRules';
import { formatConditionSourceLabel } from './conditionalScoring';
import { getValidTierBands } from './compositeSurveyHydration';
import { resolveCompositePartSource } from './compositePartSource';
import { resolveCompositePartUnit } from './compositePartUnit';
import { formatNumericMatchLabel } from './scoreRuleNumericBands';
import type { RiskIndicatorRow } from './types';

export interface CompositeScoringFlowTier {
  label: string;
  score: number;
  note?: string;
}

export interface CompositeScoringFlowPart {
  index: number;
  label: string;
  sourceLabel: string;
  tiers: CompositeScoringFlowTier[];
}

export interface CompositeScoringFlowAggregateTier {
  label: string;
  score: number;
  displayLabel: string;
}

export interface CompositeScoringFlowModel {
  configured: boolean;
  aggregationLabel: string;
  parts: CompositeScoringFlowPart[];
  aggregateTiers: CompositeScoringFlowAggregateTier[];
  incomplete: string[];
}

/** 由指标配置构建复合数值赋分流程图数据 */
export function buildCompositeScoringFlowModel(
  ind: Pick<RiskIndicatorRow, 'code' | 'survey' | 'scoreRules'>,
  allIndicators?: RiskIndicatorRow[],
): CompositeScoringFlowModel {
  const parts = ind.survey?.appendixBSurveyParts ?? [];
  const incomplete: string[] = [];
  const aggregation = normalizeCompositeAggregation(ind.survey?.compositeAggregation);
  const aggregationLabel = aggregation === 'min_f' ? '取 F 较小' : '取 F 较大';

  const flowParts = parts.map((part, i) => {
    const source = resolveCompositePartSource(part);
    const partLabel = part.label?.trim() || `子项 ${i + 1}`;
    if (!source.key) incomplete.push(`子项「${partLabel}」未选择条件字段`);
    const bands = getValidTierBands(part.tierBands);
    if (bands.length < 2) incomplete.push(`子项「${partLabel}」须至少 2 档数值分档`);
    const unit = source.key
      ? resolveCompositePartUnit(source, allIndicators ?? [], {
          indicatorCode: ind.code,
          partIndex: i,
        })
      : undefined;
    return {
      index: i + 1,
      label: partLabel,
      sourceLabel: source.key
        ? formatConditionSourceLabel(source, allIndicators)
        : '（未配置条件字段）',
      tiers: bands.map((band, bi) => {
        const interval = band.match ? formatNumericMatchLabel(band.match, { unit }) : '';
        const label = band.riskTier?.trim() || interval || `档位 ${bi + 1}`;
        return {
          label,
          score: band.score,
          note: interval && interval !== label ? interval : undefined,
        };
      }),
    };
  });

  if (!parts.length) incomplete.push('须至少配置 1 个子项');

  const idPrefix = String(ind.code ?? 'agg').trim() || 'agg';
  const aggregateRules = deriveCompositeAggregateScoreRules(parts, idPrefix, ind.scoreRules);

  return {
    configured: parts.length > 0,
    aggregationLabel,
    parts: flowParts,
    aggregateTiers: aggregateRules.map(rule => ({
      label: rule.riskTier?.trim() || rule.label,
      score: rule.score,
      displayLabel: rule.label,
    })),
    incomplete,
  };
}

function hasPopulatedCompositeParts(survey: RiskIndicatorRow['survey'] | undefined): boolean {
  const parts = survey?.appendixBSurveyParts ?? [];
  if (!parts.length) return false;
  return parts.some(part => {
    const source = resolveCompositePartSource(part);
    return Boolean(source.key?.trim()) && getValidTierBands(part.tierBands).length >= 2;
  });
}

/** 流程图预览：表单取值不完整时回退到指标快照 */
export function resolveCompositeIndicatorForFlow(
  formValues: Pick<RiskIndicatorRow, 'code' | 'survey' | 'scoreRules'>,
  snapshot?: Pick<RiskIndicatorRow, 'code' | 'survey' | 'scoreRules'> | null,
): Pick<RiskIndicatorRow, 'code' | 'survey' | 'scoreRules'> {
  const formSurvey = formValues.survey;
  const snapSurvey = snapshot?.survey;
  const survey = hasPopulatedCompositeParts(formSurvey)
    ? formSurvey
    : hasPopulatedCompositeParts(snapSurvey)
      ? snapSurvey
      : formSurvey ?? snapSurvey;
  return {
    code: formValues.code ?? snapshot?.code,
    survey,
    scoreRules: formValues.scoreRules ?? snapshot?.scoreRules,
  };
}
