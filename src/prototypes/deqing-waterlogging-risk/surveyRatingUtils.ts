import type {
  IndicatorRiskLevelRow,
  Level1Weights,
  RegionalPreventionConfig,
  RiskIndicatorRow,
  WaterloggingPointRow,
} from './types';
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

export interface SurveyRatingContext {
  indicators: RiskIndicatorRow[];
  indicatorLevels: IndicatorRiskLevelRow[];
  level1Weights: Level1Weights;
  regionalPrevention: RegionalPreventionConfig | null;
}

/** 定级前试算预览（不落库） */
export function computeSurveyRatingPreview(
  pt: WaterloggingPointRow,
  ctx: SurveyRatingContext,
): SurveyRatingPreview {
  const { indicators, indicatorLevels, level1Weights, regionalPrevention } = ctx;
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
  const coverageCheck = calcSurveyCoverage(indicators, pt.pointType, pt.surveyPayload.indicatorValues);
  if (!isPointSurveyComplete(indicators, pt.pointType, pt.surveyPayload.indicatorValues)) {
    return {
      ...empty,
      errors: [
        `指标普查数据完整度 ${coverageCheck.percent}%（${coverageCheck.filled}/${coverageCheck.applicable}），须达到 100% 后方可定级`,
      ],
    };
  }
  if (!regionalPrevention || regionalPrevention.assessmentStatus !== 'completed') {
    return {
      ...empty,
      errors: ['请先在「防灾减灾指标信息」中完成一条记录并设为数据引用'],
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
      indicators,
      pt.pointType,
      pt.surveyPayload.indicatorValues,
    );
    const scoringInd = getPointSurveyIndicatorsForScoring(indicators, pt.pointType);
    const extra: string[] = [];
    if (fillComplete && scoringInd.length === 0) {
      extra.push('请先在「指标架构图」中启用参与定级的指标并配置同级权重（合计 1.000）');
    } else if (fillComplete && matchedCount === 0) {
      extra.push('普查数据已填齐，但尚无已启用指标可匹配赋分档，请检查指标架构图启用状态与赋分规则配置');
    }
    return { ...empty, errors: [...extra, ...errors], matchedCount };
  }

  const coverage = calcSurveyCoverage(indicators, pt.pointType, pt.surveyPayload.indicatorValues);
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
  const { indicators, indicatorLevels, level1Weights, regionalPrevention } = ctx;
  if (!canRatePoint(pt.pointType, pt.surveyStatus, pt.surveyPayload, regionalPrevention, indicators)) {
    return null;
  }
  const { selections, errors } = mergeRatingRuleSelections(
    pt.pointType,
    pt.surveyPayload,
    regionalPrevention,
    indicators,
  );
  if (errors.length) return null;
  const coverage = calcSurveyCoverage(indicators, pt.pointType, pt.surveyPayload.indicatorValues);
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
    },
  };
}
