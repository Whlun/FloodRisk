/**
 * 指标行统一规范化（加载 / 编辑 / 保存前唯一入口）
 */
import { alignAuxiliaryConditionalOnRow } from './auxiliaryIndicatorDefaults';
import { migrateIndicatorConditionalScoring } from './conditionalScoring';
import { hasAuxiliaryConditionSurvey, normalizeAuxiliaryConditionLabel } from './compositeConditionalSurvey';
import { syncCompositeAggregateScoreRules } from './compositeAggregateScoreRules';
import { fillCompositeSurveyPartsTierBands } from './compositeSurveyHydration';
import { enrichIndicatorSurvey } from './indicatorSurveyUtils';
import { normalizeIndicatorScoringRuleMode } from './scoringRuleMode';
import { enrichNumericScoreRules } from './scoreRuleNumericBands';
import type { RiskIndicatorRow } from './types';

export type NormalizeIndicatorOptions = {
  allIndicators?: RiskIndicatorRow[];
  baseline?: Pick<
    RiskIndicatorRow,
    | 'survey'
    | 'code'
    | 'level1'
    | 'scoringRuleMode'
    | 'conditionalScoring'
    | 'scoreRules'
    | 'scoreExplanation'
  >;
};

/** 单条指标：survey → 条件赋分 → 赋分方式 → 复合聚合 */
export function normalizeIndicatorRow(
  row: RiskIndicatorRow,
  options: NormalizeIndicatorOptions = {},
): RiskIndicatorRow {
  const all = options.allIndicators ?? [row];
  const baseline = options.baseline;

  let next = enrichIndicatorSurvey(row, baseline);
  next = migrateIndicatorConditionalScoring(next, all);

  if (next.survey?.auxiliaryCondition?.fieldKey) {
    const normalizedAux = normalizeAuxiliaryConditionLabel(
      next.survey.auxiliaryCondition,
      next.applicableTypes,
    );
    if (normalizedAux.label !== next.survey.auxiliaryCondition.label) {
      next = {
        ...next,
        survey: { ...next.survey, auxiliaryCondition: normalizedAux },
      };
    }
  }

  if (hasAuxiliaryConditionSurvey(next)) {
    next = alignAuxiliaryConditionalOnRow(next);
    next = migrateIndicatorConditionalScoring(next, all);
  }

  next = normalizeIndicatorScoringRuleMode(next);
  next = enrichNumericScoreRules(next);

  if (next.survey?.inputVariant === 'composite_appendix_numeric') {
    next = {
      ...next,
      survey: {
        ...next.survey,
        appendixBSurveyParts: fillCompositeSurveyPartsTierBands(
          next.survey.appendixBSurveyParts,
          baseline?.survey?.appendixBSurveyParts,
        ),
      },
    };
    next = syncCompositeAggregateScoreRules(next);
  }

  if (
    next.survey?.auxiliaryCondition?.fieldKey?.trim() &&
    next.survey.auxiliaryCondition.surveyPlacement === 'appendix_b' &&
    next.survey.inputVariant === 'default'
  ) {
    next = {
      ...next,
      survey: { ...next.survey, inputVariant: 'auxiliary_then_select' },
    };
  }

  return next;
}

/** 编辑弹窗打开前：以 row 自身为准，baseline 仅补缺 */
export function normalizeIndicatorForEdit(
  row: RiskIndicatorRow,
  allIndicators: RiskIndicatorRow[],
  defaultIndicators: RiskIndicatorRow[],
): RiskIndicatorRow {
  const baseline = defaultIndicators.find(i => i.id === row.id || i.code === row.code);
  return normalizeIndicatorRow(row, { allIndicators, baseline });
}

/** 批量规范化（持久化加载后） */
export function normalizeIndicatorList(
  rows: RiskIndicatorRow[],
  baseline: RiskIndicatorRow[],
): RiskIndicatorRow[] {
  const baselineByCode = new Map(baseline.map(b => [b.code, b]));
  const baselineById = new Map(baseline.map(b => [b.id, b]));
  return rows.map(row => {
    const base = baselineById.get(row.id) ?? baselineByCode.get(row.code);
    return normalizeIndicatorRow(row, { allIndicators: rows, baseline: base });
  });
}

/** 从种子构建冷启动列表（全量重置用） */
export function buildNormalizedBaseline(baseline: RiskIndicatorRow[]): RiskIndicatorRow[] {
  const normalized = baseline.map(b =>
    normalizeIndicatorRow(b, { allIndicators: baseline, baseline: b }),
  );
  return normalizeIndicatorList(normalized, baseline);
}
