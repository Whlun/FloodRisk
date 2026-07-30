import type {
  IndicatorArchitectureRecord,
  IndicatorRiskLevelRow,
  Level1Weights,
  RegionalPreventionConfig,
  RegionalPreventionRecord,
  RiskChangeLogEntry,
  RiskIndicatorRow,
  RiskLevelVersionRecord,
  WaterloggingPointRow,
} from './types';
import { getLatestRiskLogForSurvey } from './riskChangeLogUtils';
import {
  getArchitectureForRating,
  getRatingLevel1Weights,
  mergeIndicatorsForArchitectureRecord,
} from './indicatorArchitectureUtils';
import {
  getLevelsFromRecord,
  getRiskLevelForRating,
} from './riskLevelVersionUtils';
import {
  getActiveRegionalPreventionRecord,
  getRegionalPreventionForLockedRating,
  getRegionalPreventionForRating,
  getRegionalPreventionRecordForLockedRating,
} from './regionalPreventionUtils';
import {
  calcSurveyCoverage,
  getPointSurveyIndicatorsForScoring,
  getRegionalPreventionIndicators,
  isPointSurveyComplete,
} from './indicatorSurveyUtils';
import { canRatePoint, mergeRatingRuleSelections } from './deriveRuleSelectionsForRating';
import { ratePointFromSelections } from './scoreCalculatorPartial';
import { seedAssessmentItemsFromSurvey } from './assessmentSeed';
import { mapScoreToLevel } from './scoreCalculator';
import { validateIndicatorConfig } from './indicatorConfigReadiness';

const ARCH_SCOPE = { architectureScoped: true } as const;

export interface SurveyRatingPreview {
  ok: boolean;
  errors: string[];
  result: {
    v: number;
    v1: number;
    v2: number;
    v3: number;
    v4: number;
    partial: boolean;
  } | null;
  level: IndicatorRiskLevelRow | null;
  matchedCount: number;
  totalCount: number;
  /** 确认定级后写入台账的行 */
  ratedRow: WaterloggingPointRow | null;
}

export type SurveyRatingMode = 'initial' | 'update';

export interface SurveyRatingContext {
  /** 定级计分用指标（架构 merge 后） */
  indicators: RiskIndicatorRow[];
  /** 指标定义层（用于解析普查绑定架构） */
  baseIndicators?: RiskIndicatorRow[];
  architectureRecords?: IndicatorArchitectureRecord[];
  indicatorLevels: IndicatorRiskLevelRow[];
  level1Weights: Level1Weights;
  regionalPrevention: RegionalPreventionConfig | null;
  /** 本次计分采用的指标架构版本 */
  activeArchitectureRecord?: IndicatorArchitectureRecord | null;
  /** 本次计分采用的风险等级版本 */
  activeRiskLevelRecord?: RiskLevelVersionRecord | null;
  /** 防灾减灾记录配置时间 */
  preventionRefAt?: string;
  /** 防灾减灾版本编号 */
  preventionVersionNo?: string;
  /** 本次计分实际采用的 V₄ 数据引用记录（与右侧「防灾减灾引用」展示一致） */
  activePreventionRecord?: RegionalPreventionRecord | null;
  /** 首次定级用当前定级引用；更新定级锁定上次定级方案 */
  mode?: SurveyRatingMode;
}

export interface BuildRatingContextInput {
  pt: WaterloggingPointRow;
  baseIndicators: RiskIndicatorRow[];
  architectureRecords: IndicatorArchitectureRecord[];
  riskLevelRecords: RiskLevelVersionRecord[];
  regionalPreventionRecords: RegionalPreventionRecord[];
  riskChangeLogs?: RiskChangeLogEntry[];
  /** 当前定级引用（仅首次定级使用） */
  currentArchitectureRecord: IndicatorArchitectureRecord | null;
  currentRiskLevelRecord: RiskLevelVersionRecord | null;
}

function resolveLockedPreventionRefAt(
  pt: WaterloggingPointRow,
  riskChangeLogs: RiskChangeLogEntry[],
): string | undefined {
  return (
    pt.ratingResult?.preventionRefAt ??
    getLatestRiskLogForSurvey(pt.id, riskChangeLogs)?.preventionRefAt
  );
}

function resolveLockedPreventionVersionNo(
  pt: WaterloggingPointRow,
  riskChangeLogs: RiskChangeLogEntry[],
): string | undefined {
  return (
    pt.ratingResult?.preventionVersionNo ??
    getLatestRiskLogForSurvey(pt.id, riskChangeLogs)?.preventionVersionNo
  );
}

function resolveLockedArchitectureForUpdate(
  pt: WaterloggingPointRow,
  architectureRecords: IndicatorArchitectureRecord[],
  regionalPreventionRecords: RegionalPreventionRecord[],
  riskChangeLogs: RiskChangeLogEntry[],
): IndicatorArchitectureRecord | null {
  const rr = pt.ratingResult;
  if (!rr) return null;

  const byId = resolveArchitectureRecordById(architectureRecords, rr.architectureRefId);
  if (byId?.config.status === 'completed') return byId;

  if (rr.architectureVersionNo) {
    const byVersion = architectureRecords.find(r => r.versionNo === rr.architectureVersionNo);
    if (byVersion?.config.status === 'completed') return byVersion;
  }

  if (pt.surveyArchitectureRefId) {
    const bySurvey = resolveArchitectureRecordById(architectureRecords, pt.surveyArchitectureRefId);
    if (bySurvey?.config.status === 'completed') return bySurvey;
  }

  const preventionRefAt = resolveLockedPreventionRefAt(pt, riskChangeLogs);
  const preventionVersionNo = resolveLockedPreventionVersionNo(pt, riskChangeLogs);
  if (preventionVersionNo) {
    const prevRec = regionalPreventionRecords.find(r => r.versionNo === preventionVersionNo);
    if (prevRec?.architectureRefId) {
      const byPrevention = resolveArchitectureRecordById(
        architectureRecords,
        prevRec.architectureRefId,
      );
      if (byPrevention?.config.status === 'completed') {
        return byPrevention;
      }
    }
  }
  if (preventionRefAt) {
    const prevRec = regionalPreventionRecords.find(r => r.configAt === preventionRefAt);
    if (prevRec?.architectureRefId) {
      const byPrevention = resolveArchitectureRecordById(
        architectureRecords,
        prevRec.architectureRefId,
      );
      if (byPrevention?.config.status === 'completed') {
        return byPrevention;
      }
    }
  }

  const log = getLatestRiskLogForSurvey(pt.id, riskChangeLogs);
  if (log?.architectureVersionNo) {
    const byLog = architectureRecords.find(r => r.versionNo === log.architectureVersionNo);
    if (byLog?.config.status === 'completed') return byLog;
  }

  return null;
}

function resolveLockedRiskLevelForUpdate(
  pt: WaterloggingPointRow,
  riskLevelRecords: RiskLevelVersionRecord[],
  riskChangeLogs: RiskChangeLogEntry[],
): RiskLevelVersionRecord | null {
  const rr = pt.ratingResult;
  if (!rr) return null;

  const byStored = resolveRiskLevelRecordForRating(
    riskLevelRecords,
    rr.riskLevelRefId,
    rr.riskLevelVersionNo,
  );
  if (byStored?.config.status === 'completed') return byStored;

  const log = getLatestRiskLogForSurvey(pt.id, riskChangeLogs);
  if (log?.riskLevelVersionNo) {
    const byLog = resolveRiskLevelRecordForRating(
      riskLevelRecords,
      undefined,
      log.riskLevelVersionNo,
    );
    return byLog?.config.status === 'completed' ? byLog : null;
  }

  return null;
}

function resolveArchitectureRecordById(
  records: IndicatorArchitectureRecord[],
  id: string | undefined,
): IndicatorArchitectureRecord | null {
  if (!id) return null;
  return records.find(r => r.id === id) ?? null;
}

function resolveRiskLevelRecordForRating(
  records: RiskLevelVersionRecord[],
  refId: string | undefined,
  versionNo: string | undefined,
): RiskLevelVersionRecord | null {
  if (refId) {
    const byId = records.find(r => r.id === refId);
    if (byId) return byId;
  }
  if (versionNo) {
    return records.find(r => r.versionNo === versionNo) ?? null;
  }
  return null;
}

/** 按首次定级 / 更新定级构建计分上下文（更新定级锁定上次定级采用的评价与等级版本） */
export function buildRatingContextForPoint(input: BuildRatingContextInput): SurveyRatingContext {
  const {
    pt,
    baseIndicators,
    architectureRecords,
    riskLevelRecords,
    regionalPreventionRecords,
    riskChangeLogs = [],
  } = input;

  const isUpdate = pt.ratingStatus === 'completed' && Boolean(pt.ratingResult);

  if (isUpdate && pt.ratingResult) {
    const archRecord = resolveLockedArchitectureForUpdate(
      pt,
      architectureRecords,
      regionalPreventionRecords,
      riskChangeLogs,
    );
    const levelRecord = resolveLockedRiskLevelForUpdate(pt, riskLevelRecords, riskChangeLogs);
    const lockedPreventionRefAt = resolveLockedPreventionRefAt(pt, riskChangeLogs);
    const lockedPreventionVersionNo = resolveLockedPreventionVersionNo(pt, riskChangeLogs);
    const preventionRecord = getRegionalPreventionRecordForLockedRating(
      regionalPreventionRecords,
      archRecord,
      lockedPreventionRefAt,
      lockedPreventionVersionNo,
    );

    return {
      indicators: mergeIndicatorsForArchitectureRecord(baseIndicators, archRecord),
      baseIndicators,
      architectureRecords,
      indicatorLevels: getLevelsFromRecord(levelRecord),
      level1Weights: getRatingLevel1Weights(archRecord),
      regionalPrevention: getRegionalPreventionForLockedRating(
        regionalPreventionRecords,
        archRecord,
        lockedPreventionRefAt,
        lockedPreventionVersionNo,
      ),
      activeArchitectureRecord: archRecord,
      activeRiskLevelRecord: levelRecord,
      preventionRefAt: lockedPreventionRefAt ?? preventionRecord?.configAt,
      preventionVersionNo: lockedPreventionVersionNo ?? preventionRecord?.versionNo,
      activePreventionRecord: preventionRecord,
      mode: 'update',
    };
  }

  // 不信任调用方传入的原始 active 记录；最终定级从版本集合重新执行严格准入校验。
  const strictCurrentArchitectureRecord = getArchitectureForRating(architectureRecords);
  const strictCurrentRiskLevelRecord = getRiskLevelForRating(riskLevelRecords);
  const preventionRecord = getActiveRegionalPreventionRecord(
    regionalPreventionRecords,
    strictCurrentArchitectureRecord,
  );

  return {
    indicators: mergeIndicatorsForArchitectureRecord(
      baseIndicators,
      strictCurrentArchitectureRecord,
    ),
    baseIndicators,
    architectureRecords,
    indicatorLevels: getLevelsFromRecord(strictCurrentRiskLevelRecord),
    level1Weights: getRatingLevel1Weights(strictCurrentArchitectureRecord),
    regionalPrevention: getRegionalPreventionForRating(
      regionalPreventionRecords,
      strictCurrentArchitectureRecord,
    ),
    activeArchitectureRecord: strictCurrentArchitectureRecord,
    activeRiskLevelRecord: strictCurrentRiskLevelRecord,
    preventionRefAt: preventionRecord?.configAt,
    preventionVersionNo: preventionRecord?.versionNo,
    activePreventionRecord: preventionRecord,
    mode: 'initial',
  };
}

/**
 * 定级完整度与实际评分必须使用同一评价版本：
 * 首次定级为严格校验后的当前引用，更新定级为上次结果锁定版本。
 */
export function resolveSurveyIndicatorsForPoint(
  _pt: Pick<WaterloggingPointRow, 'surveyArchitectureRefId'>,
  ctx: SurveyRatingContext,
): RiskIndicatorRow[] {
  return ctx.indicators;
}

function getSurveyArchitectureBindingIssue(
  pt: Pick<WaterloggingPointRow, 'surveyArchitectureRefId'>,
  ctx: SurveyRatingContext,
): string | null {
  if (!pt.surveyArchitectureRefId || !ctx.architectureRecords?.length) return null;
  const bound = ctx.architectureRecords.find(record => record.id === pt.surveyArchitectureRefId);
  if (!bound) {
    return `本条普查绑定的评价版本（${pt.surveyArchitectureRefId}）已不存在，禁止回退到其他版本定级`;
  }
  const rating = ctx.activeArchitectureRecord;
  if (ctx.mode !== 'update' && rating && bound.id !== rating.id) {
    return `本条普查绑定评价版本 ${bound.versionNo}，与当前定级引用 ${rating.versionNo} 不一致，请基于当前版本重新普查`;
  }
  return null;
}

/** 定级前试算预览（不落库） */
export function computeSurveyRatingPreview(
  pt: WaterloggingPointRow,
  ctx: SurveyRatingContext,
): SurveyRatingPreview {
  const { indicators, indicatorLevels, level1Weights, regionalPrevention, activeArchitectureRecord, activeRiskLevelRecord } =
    ctx;
  const surveyIndicators = resolveSurveyIndicatorsForPoint(pt, ctx);
  const pointInd = getPointSurveyIndicatorsForScoring(indicators, pt.pointType);
  const regionalInd = getRegionalPreventionIndicators(indicators);
  const totalCount = pointInd.length + regionalInd.length;
  const empty: SurveyRatingPreview = {
    ok: false,
    errors: [],
    result: null,
    level: null,
    matchedCount: 0,
    totalCount,
    ratedRow: null,
  };

  const bindingIssue = getSurveyArchitectureBindingIssue(pt, ctx);
  if (bindingIssue) {
    return { ...empty, errors: [bindingIssue] };
  }

  const configBlockers: string[] = [];
  for (const ind of indicators.filter(i => i.enabled)) {
    const readiness = validateIndicatorConfig(ind, indicators);
    if (!readiness.ok) {
      configBlockers.push(`「${ind.name}」：${readiness.blockers[0] ?? '配置不完整'}`);
    }
  }
  if (configBlockers.length) {
    return {
      ...empty,
      errors: ['以下启用指标须先完善配置（风险指标管理 → 编辑）', ...configBlockers.slice(0, 6)],
    };
  }

  if (pt.surveyStatus !== 'completed') {
    return { ...empty, errors: ['普查尚未完成，请先补全指标普查并保存'] };
  }
  const coverageCheck = calcSurveyCoverage(
    surveyIndicators,
    pt.pointType,
    pt.surveyPayload.indicatorValues,
    ARCH_SCOPE,
  );
  if (
    !isPointSurveyComplete(
      surveyIndicators,
      pt.pointType,
      pt.surveyPayload.indicatorValues,
      ARCH_SCOPE,
    )
  ) {
    return {
      ...empty,
      errors: [
        `指标普查数据完整度 ${coverageCheck.percent}%（${coverageCheck.filled}/${coverageCheck.applicable}），须达到 100% 后方可定级`,
      ],
    };
  }
  const mode: SurveyRatingMode =
    ctx.mode ?? (pt.ratingStatus === 'completed' && pt.ratingResult ? 'update' : 'initial');

  if (mode === 'update') {
    const archLabel =
      activeArchitectureRecord?.versionNo ?? pt.ratingResult?.architectureVersionNo ?? '—';
    const levelLabel =
      activeRiskLevelRecord?.versionNo ?? pt.ratingResult?.riskLevelVersionNo ?? '—';
    if (!activeArchitectureRecord || activeArchitectureRecord.config.status !== 'completed') {
      return {
        ...empty,
        errors: [
          `无法解析上次定级锁定的评价版本（${archLabel}）；请确认「防灾减灾指标信息」中该版本下仍有 V₄ 数据引用，或重新首次定级以写入版本信息`,
        ],
      };
    }
    if (!activeRiskLevelRecord || activeRiskLevelRecord.config.status !== 'completed') {
      return {
        ...empty,
        errors: [`上次定级采用的等级版本（${levelLabel}）不存在或未完成配置，无法更新定级`],
      };
    }
  } else {
    if (
      !activeArchitectureRecord ||
      !activeArchitectureRecord.activeForRating ||
      activeArchitectureRecord.config.status !== 'completed'
    ) {
      return {
        ...empty,
        errors: ['请先在「指标评价管理」中完成一条记录并设为定级引用（权重合计须为 1.000）'],
      };
    }
    if (
      !activeRiskLevelRecord ||
      !activeRiskLevelRecord.activeForRating ||
      activeRiskLevelRecord.config.status !== 'completed'
    ) {
      return {
        ...empty,
        errors: ['请先在「风险等级管理」中完成一条记录并设为定级引用（等级区间须校验通过）'],
      };
    }
  }

  if (!regionalPrevention || regionalPrevention.assessmentStatus !== 'completed') {
    const versionHint = activeArchitectureRecord?.versionNo
      ? mode === 'update'
        ? `上次定级锁定的评价版本 ${activeArchitectureRecord.versionNo} 下`
        : `当前定级引用架构 ${activeArchitectureRecord.versionNo} 下`
      : mode === 'update'
        ? '上次定级锁定的评价版本下'
        : '当前定级引用架构下';
    const preventionHint =
      mode === 'update' && ctx.preventionVersionNo
        ? `（须存在防灾减灾版本 ${ctx.preventionVersionNo}，或该版本下的 V₄ 数据引用）`
        : mode === 'update' && ctx.preventionRefAt
          ? `（须存在配置时间为 ${ctx.preventionRefAt} 的 V₄ 引用，或该版本下的 V₄ 数据引用）`
          : '';
    return {
      ...empty,
      errors: [
        `请先在「防灾减灾指标信息」中完成一条记录并设为 V₄ 数据引用（${versionHint}${preventionHint}）`,
      ],
    };
  }

  const { selections, errors } = mergeRatingRuleSelections(
    pt.pointType,
    pt.surveyPayload,
    regionalPrevention,
    indicators,
  );
  const matchedCount = Object.keys(selections).length;
  if (errors.length) {
    const fillComplete = isPointSurveyComplete(
      surveyIndicators,
      pt.pointType,
      pt.surveyPayload.indicatorValues,
      ARCH_SCOPE,
    );
    const scoringInd = getPointSurveyIndicatorsForScoring(indicators, pt.pointType);
    const extra: string[] = [];
    if (fillComplete && scoringInd.length === 0) {
      extra.push('请先在「指标评价管理」中启用参与定级的指标并配置同级权重（合计 1.000）');
    } else if (fillComplete && matchedCount === 0) {
      extra.push('普查数据已填齐，但尚无已启用指标可匹配赋分档，请检查评价版本启用状态与赋分规则配置');
    }
    return { ...empty, errors: [...extra, ...errors], matchedCount };
  }

  const coverage = calcSurveyCoverage(
    surveyIndicators,
    pt.pointType,
    pt.surveyPayload.indicatorValues,
    ARCH_SCOPE,
  );
  const result = ratePointFromSelections(
    indicators,
    pt.pointType,
    selections,
    indicatorLevels,
    coverage,
    level1Weights,
  );
  const level = mapScoreToLevel(result.v, indicatorLevels);
  if (!level) {
    return {
      ...empty,
      errors: ['综合分 V 无法映射到风险等级，请检查指标体系等级配置'],
      matchedCount,
      result: {
        v: result.v,
        v1: result.v1,
        v2: result.v2,
        v3: result.v3,
        v4: result.v4,
        partial: result.partial,
      },
    };
  }

  const ratedRow = buildRatedSurveyRecord({ ...pt, activeForRating: true }, ctx);
  return {
    ok: Boolean(ratedRow),
    errors: ratedRow ? [] : ['定级试算失败'],
    result: {
      v: result.v,
      v1: result.v1,
      v2: result.v2,
      v3: result.v3,
      v4: result.v4,
      partial: result.partial,
    },
    level,
    matchedCount,
    totalCount,
    ratedRow,
  };
}

/** 普查完成后计算定级结果（与易涝点定级页逻辑一致） */
export function buildRatedSurveyRecord(
  pt: WaterloggingPointRow,
  ctx: SurveyRatingContext,
): WaterloggingPointRow | null {
  const {
    indicators,
    indicatorLevels,
    level1Weights,
    regionalPrevention,
    activeArchitectureRecord,
    activeRiskLevelRecord,
    preventionRefAt,
    preventionVersionNo,
    activePreventionRecord,
  } = ctx;
  if (!regionalPrevention) return null;
  if (getSurveyArchitectureBindingIssue(pt, ctx)) return null;
  const surveyIndicators = resolveSurveyIndicatorsForPoint(pt, ctx);
  if (
    !canRatePoint(
      pt.pointType,
      pt.surveyStatus,
      pt.surveyPayload,
      regionalPrevention,
      indicators,
      surveyIndicators,
    )
  ) {
    return null;
  }
  const { selections, errors } = mergeRatingRuleSelections(
    pt.pointType,
    pt.surveyPayload,
    regionalPrevention,
    indicators,
  );
  if (errors.length) return null;
  const coverage = calcSurveyCoverage(
    surveyIndicators,
    pt.pointType,
    pt.surveyPayload.indicatorValues,
    ARCH_SCOPE,
  );
  const result = ratePointFromSelections(
    indicators,
    pt.pointType,
    selections,
    indicatorLevels,
    coverage,
    level1Weights,
  );
  if (!result.level) return null;
  const ratedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
  return {
    ...pt,
    assessmentStatus: 'completed',
    assessmentPayload: {
      ...pt.assessmentPayload,
      items: seedAssessmentItemsFromSurvey(pt.pointType, pt.surveyPayload, indicators),
      assessedAt: ratedAt,
    },
    ratingStatus: 'completed',
    ratingResult: {
      v: result.v,
      v1: result.v1,
      v2: result.v2,
      v3: result.v3,
      v4: result.v4,
      levelCode: result.level.levelCode,
      levelName: result.level.levelName,
      color: result.level.color,
      selectedRuleIds: selections,
      coverage,
      ratedAt,
      partial: result.partial,
      architectureRefId: activeArchitectureRecord?.id,
      architectureRefAt: activeArchitectureRecord?.configAt,
      architectureVersionNo: activeArchitectureRecord?.versionNo,
      preventionRefAt: preventionRefAt ?? undefined,
      preventionVersionNo: activePreventionRecord?.versionNo ?? preventionVersionNo ?? undefined,
      riskLevelRefId: activeRiskLevelRecord?.id,
      riskLevelRefAt: activeRiskLevelRecord?.configAt,
      riskLevelVersionNo: activeRiskLevelRecord?.versionNo,
    },
  };
}
