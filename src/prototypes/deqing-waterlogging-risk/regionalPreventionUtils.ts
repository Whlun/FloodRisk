import type {
  IndicatorArchitectureRecord,
  RegionalPreventionConfig,
  RegionalPreventionRecord,
  RiskIndicatorRow,
} from './types';
import { deriveAssessmentItemsFromIndicatorValues } from './scoreRuleMapping';
import { calcRegionalPreventionCoverage, getRegionalPreventionIndicators } from './indicatorSurveyUtils';
import { calcTotalScorePartial } from './scoreCalculatorPartial';

function matchesRatingArchitecture(
  record: RegionalPreventionRecord,
  ratingArchitecture: IndicatorArchitectureRecord | null | undefined,
): boolean {
  if (!ratingArchitecture) return false;
  return record.architectureRefId === ratingArchitecture.id;
}

/** 校验防灾减灾记录是否绑定当前定级引用架构 */
export function validatePreventionArchitectureMatch(
  record: RegionalPreventionRecord,
  ratingArchitecture: IndicatorArchitectureRecord | null | undefined,
): { ok: boolean; message?: string } {
  if (!ratingArchitecture) {
    return { ok: false, message: '请先在「指标评价管理」中完成一条记录并设为定级引用' };
  }
  if (!matchesRatingArchitecture(record, ratingArchitecture)) {
    const versionNo = ratingArchitecture.versionNo || '当前定级引用架构';
    return {
      ok: false,
      message: `仅可引用与当前定级引用架构（${versionNo}）绑定的记录`,
    };
  }
  return { ok: true };
}

/** 当前定级引用架构下的 V₄ 数据引用（须 activeForRating 且 architectureRefId 匹配） */
export function getActiveRegionalPreventionRecord(
  records: RegionalPreventionRecord[],
  ratingArchitecture?: IndicatorArchitectureRecord | null,
): RegionalPreventionRecord | null {
  if (!records.length || !ratingArchitecture) return null;
  return (
    records.find(r => r.activeForRating && matchesRatingArchitecture(r, ratingArchitecture)) ?? null
  );
}

/** 定级计分用全县防灾减灾配置（scoped 到当前定级引用架构） */
export function getRegionalPreventionForRating(
  records: RegionalPreventionRecord[],
  ratingArchitecture?: IndicatorArchitectureRecord | null,
): RegionalPreventionConfig | null {
  const active = getActiveRegionalPreventionRecord(records, ratingArchitecture);
  return active?.config ?? null;
}

/**
 * 更新定级：优先取上次定级锁定的防灾减灾版本（preventionVersionNo），
 * 再取 preventionRefAt，否则回退该评价版本下的当前 V₄ 数据引用。
 */
export function getRegionalPreventionRecordForLockedRating(
  records: RegionalPreventionRecord[],
  architecture: IndicatorArchitectureRecord | null | undefined,
  preventionRefAt?: string,
  preventionVersionNo?: string,
): RegionalPreventionRecord | null {
  if (!architecture) return null;
  const underArch = records.filter(
    r =>
      r.architectureRefId === architecture.id && r.config.assessmentStatus === 'completed',
  );
  if (preventionVersionNo) {
    const byVersion = underArch.find(r => r.versionNo === preventionVersionNo);
    if (byVersion) return byVersion;
  }
  if (preventionRefAt) {
    const exact = underArch.find(r => r.configAt === preventionRefAt);
    if (exact) return exact;
  }
  const active = underArch.find(r => r.activeForRating);
  if (active) return active;
  return sortRegionalPreventionRecords(underArch)[0] ?? null;
}

/** 更新定级计分用 V₄（锁定评价版本 + 可选锁定 preventionVersionNo / preventionRefAt） */
export function getRegionalPreventionForLockedRating(
  records: RegionalPreventionRecord[],
  architecture: IndicatorArchitectureRecord | null | undefined,
  preventionRefAt?: string,
  preventionVersionNo?: string,
): RegionalPreventionConfig | null {
  return (
    getRegionalPreventionRecordForLockedRating(
      records,
      architecture,
      preventionRefAt,
      preventionVersionNo,
    )?.config ?? null
  );
}

/** 某定级引用架构下是否已有 completed 的 V₄ 数据引用 */
export function hasCompletedPreventionRefForArchitecture(
  records: RegionalPreventionRecord[],
  ratingArchitecture: IndicatorArchitectureRecord | null | undefined,
): boolean {
  const active = getActiveRegionalPreventionRecord(records, ratingArchitecture);
  return active?.config.assessmentStatus === 'completed';
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

/** 将某条记录设为 V₄ 数据引用（仅取消同架构下其他记录的引用） */
export function setActiveRegionalPreventionRecord(
  records: RegionalPreventionRecord[],
  id: string,
): RegionalPreventionRecord[] {
  const target = records.find(r => r.id === id);
  if (!target?.architectureRefId) {
    return records.map(r => ({ ...r, activeForRating: r.id === id }));
  }
  const archId = target.architectureRefId;
  return records.map(r => ({
    ...r,
    activeForRating:
      r.id === id ? true : r.architectureRefId === archId ? false : r.activeForRating,
  }));
}

/** 迁移/规范化：每个 architectureRefId 至多保留一条 activeForRating */
export function normalizePreventionActiveRefs(
  records: RegionalPreventionRecord[],
): RegionalPreventionRecord[] {
  const seen = new Set<string>();
  return records.map(r => {
    if (!r.activeForRating || !r.architectureRefId) return r;
    if (seen.has(r.architectureRefId)) {
      return { ...r, activeForRating: false };
    }
    seen.add(r.architectureRefId);
    return r;
  });
}

/** 工作区迁移：补全 architectureRefId，并规范化各架构下的 V₄ 数据引用 */
export function migratePreventionRecordsForArchitecture(
  records: RegionalPreventionRecord[],
  architectureRecords: IndicatorArchitectureRecord[],
): RegionalPreventionRecord[] {
  if (!records.length) return records;

  const ratingArch =
    architectureRecords.find(r => r.activeForRating) ??
    [...architectureRecords]
      .filter(r => r.config.status === 'completed')
      .sort((a, b) => b.configAt.localeCompare(a.configAt))[0] ??
    architectureRecords[0] ??
    null;

  let patched = records.map(r => {
    if (r.architectureRefId && r.architectureVersionNo) return r;
    if (!ratingArch) return r;
    return {
      ...r,
      architectureRefId: r.architectureRefId ?? ratingArch.id,
      architectureRefAt: r.architectureRefAt ?? ratingArch.configAt,
      architectureVersionNo: r.architectureVersionNo ?? ratingArch.versionNo,
    };
  });

  patched = normalizePreventionActiveRefs(patched);

  if (ratingArch) {
    const hasActiveForRating = patched.some(
      r =>
        r.activeForRating &&
        r.architectureRefId === ratingArch.id &&
        r.config.assessmentStatus === 'completed',
    );
    if (!hasActiveForRating) {
      const latestCompleted = sortRegionalPreventionRecords(patched).find(
        r => r.architectureRefId === ratingArch.id && r.config.assessmentStatus === 'completed',
      );
      if (latestCompleted) {
        patched = setActiveRegionalPreventionRecord(patched, latestCompleted.id);
      }
    }
  }

  return patched;
}
