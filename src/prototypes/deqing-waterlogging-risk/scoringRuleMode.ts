import type { FormInstance } from 'antd';
import type { RiskIndicatorRow, ScoringRuleMode } from './types';
import { buildAuxiliaryConditionalPackage } from './auxiliaryIndicatorDefaults';
import { hasAuxiliaryConditionSurvey } from './compositeConditionalSurvey';
import { createEmptyConditionalScoring } from './conditionalScoring';
import { deriveCompositeAggregateScoreRules } from './compositeAggregateScoreRules';
import { fillCompositeSurveyPartsTierBands } from './compositeSurveyHydration';
import { DEFAULT_COMPOSITE_NUMERIC_RANGE } from './surveyTemplates';
import { COMPOSITE_SCORING_COPY } from './compositeScoringCopy';

export type { ScoringRuleMode };

export const SCORING_RULE_MODE_LABEL: Record<ScoringRuleMode, string> = {
  uniform: '统一赋分档',
  conditional: '条件赋分',
  composite: '复合数值赋分',
};

export const SCORING_RULE_MODE_HINT: Record<ScoringRuleMode, string> = {
  uniform: '按普查填报值直接匹配下方赋分档（枚举型 label 即下拉选项）。',
  conditional: '按条件字段取值切换分支，在各分支内配置赋分档或数值分界。',
  composite: COMPOSITE_SCORING_COPY.modeHint,
};

type ScoringRuleModeSource = Pick<RiskIndicatorRow, 'scoringRuleMode' | 'conditionalScoring' | 'survey'>;

/** 从 legacy 字段推导赋分方式（无显式 scoringRuleMode 时） */
export function inferScoringRuleModeFromLegacy(ind: ScoringRuleModeSource | undefined): ScoringRuleMode {
  if (ind?.conditionalScoring?.enabled) return 'conditional';
  if (ind?.survey?.inputVariant === 'composite_appendix_numeric') return 'composite';
  return 'uniform';
}

/**
 * 解析当前赋分方式。
 * 显式 scoringRuleMode 优先；但若仍为 uniform 而 survey/条件赋分已表明其它模式，以派生为准（避免表单未同步隐藏字段）。
 */
export function resolveScoringRuleMode(ind: ScoringRuleModeSource | undefined): ScoringRuleMode {
  const inferred = inferScoringRuleModeFromLegacy(ind);
  const explicit = ind?.scoringRuleMode;
  if (!explicit) return inferred;
  if (explicit === inferred) return explicit;
  // 陈旧 uniform：UI 已切到条件/复合，隐藏 scoringRuleMode 未写入
  if (explicit === 'uniform' && inferred !== 'uniform') return inferred;
  return explicit;
}

/** 是否可切换「统一 / 条件 / 复合」三选一（与是否导则种子无关，详情只读时不可改） */
export function canEditScoringRuleMode(
  _ind?: Pick<RiskIndicatorRow, 'code' | 'valueType' | 'survey'>,
  _seedIndicators: RiskIndicatorRow[] = [],
): boolean {
  return true;
}

/** 复合数值：子项字段与分档是否可编辑（与指标编码无关，仅详情只读） */
export function canEditCompositeSurveyParts(detailOnly?: boolean): boolean {
  return !detailOnly;
}

/** 将赋分方式同步到 survey / conditionalScoring（纯数据，供保存与迁移） */
export function buildScoringRuleModePatch(
  row: Pick<RiskIndicatorRow, 'code' | 'valueType' | 'survey' | 'conditionalScoring'>,
  mode: ScoringRuleMode,
): Pick<RiskIndicatorRow, 'scoringRuleMode' | 'survey' | 'conditionalScoring'> {
  const code = String(row.code ?? '').trim() || 'IND';
  const survey = row.survey ?? { collectInSurvey: true, surveyRequired: false, fieldKey: code };
  const valueType = row.valueType ?? 'enum';

  if (mode === 'composite') {
    const parts =
      Array.isArray(survey.appendixBSurveyParts) && survey.appendixBSurveyParts.length > 0
        ? survey.appendixBSurveyParts
        : [
            {
              label: '子项 1',
              appendixBFieldKey: 'appendixPart1',
              valueFieldKey: `${code}_PART1`,
              numericRange: { ...DEFAULT_COMPOSITE_NUMERIC_RANGE },
              tierBands: [
                { riskTier: '低', score: 0.2, match: { kind: 'gte', value: 0 } },
                { riskTier: '高', score: 1, match: { kind: 'lt', value: 0 } },
              ],
            },
          ];
    const appendixBSurveyParts = fillCompositeSurveyPartsTierBands(parts);
    return {
      scoringRuleMode: 'composite',
      survey: {
        ...survey,
        inputVariant: 'composite_appendix_numeric',
        compositeAggregation: 'max_f',
        appendixBFieldKey: undefined,
        auxiliaryCondition: undefined,
        appendixBSurveyParts,
      },
      conditionalScoring: { ...createEmptyConditionalScoring(), enabled: false },
    };
  }

  if (mode === 'conditional') {
    const empty = createEmptyConditionalScoring(
      valueType === 'numeric' ? 'branch_threshold' : 'branch_rules',
    );
    const baseConditional = row.conditionalScoring ?? empty;
    const keepAuxiliaryThenSelect =
      survey.inputVariant === 'auxiliary_then_select' ||
      Boolean(survey.auxiliaryCondition?.fieldKey?.trim());
    let conditionalScoring = {
      ...baseConditional,
      enabled: true,
      mode: baseConditional.mode ?? empty.mode,
      branches: baseConditional.branches?.length ? baseConditional.branches : empty.branches,
    };
    const draftRow = {
      code,
      valueType,
      survey,
      conditionalScoring,
      scoreRules: (row as RiskIndicatorRow).scoreRules,
      id: (row as RiskIndicatorRow).id,
      name: (row as RiskIndicatorRow).name,
      level1: (row as RiskIndicatorRow).level1,
      applicableTypes: (row as RiskIndicatorRow).applicableTypes,
    } as RiskIndicatorRow;
    if (hasAuxiliaryConditionSurvey(draftRow)) {
      const branchesIncomplete =
        !conditionalScoring.branches?.length ||
        conditionalScoring.branches.every(b => !(b.scoreRules?.length ?? 0));
      const sourceIncomplete = !conditionalScoring.source?.key?.trim();
      if (branchesIncomplete || sourceIncomplete) {
        const pkg = buildAuxiliaryConditionalPackage(draftRow);
        conditionalScoring = { ...pkg.conditionalScoring, enabled: true };
      }
    }
    return {
      scoringRuleMode: 'conditional',
      survey: {
        ...survey,
        inputVariant: keepAuxiliaryThenSelect ? 'auxiliary_then_select' : 'default',
      },
      conditionalScoring,
    };
  }

  return {
    scoringRuleMode: 'uniform',
    survey: {
      ...survey,
      inputVariant: survey.inputVariant === 'composite_appendix_numeric' ? 'default' : survey.inputVariant,
    },
    conditionalScoring: { ...createEmptyConditionalScoring(), enabled: false },
  };
}

/** 保存 / 加载时对齐显式赋分方式与派生字段 */
export function normalizeIndicatorScoringRuleMode(row: RiskIndicatorRow): RiskIndicatorRow {
  const mode = resolveScoringRuleMode(row);
  const patch = buildScoringRuleModePatch(row, mode);
  const aligned: RiskIndicatorRow = {
    ...row,
    scoringRuleMode: patch.scoringRuleMode,
    survey: { ...row.survey, ...patch.survey },
    conditionalScoring: patch.conditionalScoring ?? row.conditionalScoring,
  };
  if (mode !== 'composite') return aligned;
  const idPrefix = String(aligned.code ?? aligned.id ?? 'agg').trim() || 'agg';
  return {
    ...aligned,
    scoreRules: deriveCompositeAggregateScoreRules(
      aligned.survey?.appendixBSurveyParts,
      idPrefix,
      aligned.scoreRules,
    ),
  };
}

export function applyScoringRuleMode(
  form: FormInstance,
  mode: ScoringRuleMode,
  valueType: RiskIndicatorRow['valueType'] = 'enum',
): void {
  const code = String(form.getFieldValue('code') ?? '').trim() || 'IND';
  const survey = form.getFieldValue('survey') ?? {};
  const conditionalScoring = form.getFieldValue('conditionalScoring');
  const patch = buildScoringRuleModePatch(
    { code, valueType, survey, conditionalScoring },
    mode,
  );
  const nextValues: Record<string, unknown> = { ...patch };
  if (mode === 'composite') {
    nextValues.scoreRules = deriveCompositeAggregateScoreRules(
      patch.survey?.appendixBSurveyParts,
      code,
      form.getFieldValue('scoreRules'),
    );
  }
  form.setFieldsValue(nextValues);
}
