import type { RegionalPreventionConfig, RegionalPreventionRecord, RiskIndicatorRow } from './types';
import { deriveAssessmentItemsFromIndicatorValues } from './scoreRuleMapping';
import { calcRegionalPreventionCoverage, getRegionalPreventionIndicators } from './indicatorSurveyUtils';
import { calcTotalScorePartial } from './scoreCalculatorPartial';

/** 定级引用的全县防灾减灾配置（activeForRating 优先，否则最近一条已完成） */
export function getRegionalPreventionForRating(
  records: RegionalPreventionRecord[],
): RegionalPreventionConfig | null {
  if (!records.length) return null;
  const active = records.find(r => r.activeForRating);
  if (active) return active.config;
  const completed = [...records]
    .filter(r => r.config.assessmentStatus === 'completed')
    .sort((a, b) => b.configAt.localeCompare(a.configAt));
  return completed[0]?.config ?? null;
}

export function getActiveRegionalPreventionRecord(
  records: RegionalPreventionRecord[],
): RegionalPreventionRecord | null {
  if (!records.length) return null;
  return records.find(r => r.activeForRating) ?? null;
}

export function sortRegionalPreventionRecords(
  records: RegionalPreventionRecord[],
): RegionalPreventionRecord[] {
  return [...records].sort((a, b) => b.configAt.localeCompare(a.configAt));
}

export function computeRegionalPreventionV4(
  indicators: RiskIndicatorRow[],
  config: RegionalPreventionConfig,
): number | null {
  const regionalIndicators = getRegionalPreventionIndicators(indicators);
  const items = deriveAssessmentItemsFromIndicatorValues(
    regionalIndicators,
    config.indicatorValues,
  );
  const selections: Record<string, string> = {};
  for (const ind of regionalIndicators) {
    const ruleId = items[ind.id]?.ruleId;
    if (ruleId) selections[ind.id] = ruleId;
  }
  if (Object.keys(selections).length === 0) return null;
  return calcTotalScorePartial(indicators, 'SUNKEN', selections).v4;
}

export function summarizeRegionalPreventionRecord(
  indicators: RiskIndicatorRow[],
  record: RegionalPreventionRecord,
): { filled: number; applicable: number; percent: number; v4: number | null; complete: boolean } {
  const coverage = calcRegionalPreventionCoverage(indicators, record.config.indicatorValues);
  const regionalIndicators = getRegionalPreventionIndicators(indicators);
  const items = deriveAssessmentItemsFromIndicatorValues(
    regionalIndicators,
    record.config.indicatorValues,
  );
  const mapped = regionalIndicators.filter(ind => items[ind.id]?.ruleId).length;
  const complete =
    regionalIndicators.length > 0 && mapped >= regionalIndicators.length;
  return {
    ...coverage,
    v4: computeRegionalPreventionV4(indicators, record.config),
    complete,
  };
}

/** 将某条记录设为定级引用，其余取消 */
export function setActiveRegionalPreventionRecord(
  records: RegionalPreventionRecord[],
  id: string,
): RegionalPreventionRecord[] {
  return records.map(r => ({ ...r, activeForRating: r.id === id }));
}
