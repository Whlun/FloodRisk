import type { FormInstance } from 'antd';
import type {
  ConditionalScoringConfig,
  HazardPointType,
  IndicatorAuxiliaryConditionField,
  Level1Factor,
  RiskIndicatorRow,
} from './types';
import { isFormationLevel1 } from './indicatorApplicableTypes';
import {
  buildAuxiliaryConditionalFromIndicator,
  formatAppendixAuxiliaryConditionLabel,
  normalizeAuxiliaryConditionLabel,
  resolveAuxiliaryConditionSource,
  resolveAuxiliaryDisplayLabel,
  resolvePrimarySurveyPointType,
} from './compositeConditionalSurvey';
import { listAppendixBConditionFieldsForPointType } from './appendixBConditionFields';
import { createGenericNumericUniformRules } from './scoreRuleNumericBands';

const DEFAULT_NUMERIC_RANGE: IndicatorAuxiliaryConditionField['numericRange'] = {
  min: 0,
  max: 100,
  step: 1,
  precision: 2,
  rangeLabel: '合理范围 0～100',
  hint: '辅助条件数值；用于本分档判定。',
};

export interface AuxiliaryDefaultsContext {
  code: string;
  name?: string;
  id?: string;
  level1?: Level1Factor;
  applicableTypes?: HazardPointType[];
  valueType?: RiskIndicatorRow['valueType'];
  scoreRules?: RiskIndicatorRow['scoreRules'];
  /** 已有辅助条件时保留用户改过的 label / fieldKey 等 */
  existingAux?: Partial<IndicatorAuxiliaryConditionField>;
}

export interface AuxiliaryConditionalPackage {
  survey: RiskIndicatorRow['survey'];
  conditionalScoring: ConditionalScoringConfig;
  scoringRuleMode: 'conditional';
  scoreRules: RiskIndicatorRow['scoreRules'];
  valueType: RiskIndicatorRow['valueType'];
}

/** 按一级因子与适用类型解析辅助条件默认配置（通用默认；导则特例仅存在于种子数据） */
export function resolveAuxiliaryDefaults(ctx: AuxiliaryDefaultsContext): IndicatorAuxiliaryConditionField {
  const code = String(ctx.code ?? '').trim() || 'IND';
  const existing = ctx.existingAux ?? {};
  const fieldKey = `${code}_COND`;
  const merged: IndicatorAuxiliaryConditionField = {
    fieldKey: String(existing.fieldKey ?? fieldKey).trim() || fieldKey,
    label: String(existing.label ?? '辅助条件').trim() || '辅助条件',
    unit: existing.unit ?? '%',
    thresholdPct: existing.thresholdPct,
    collectInSurvey: existing.collectInSurvey !== false,
    surveyPlacement: existing.surveyPlacement ?? 'indicator_census',
    hint: existing.hint ?? '辅助条件数值；用于本分档判定。',
    legacyFieldKeys: existing.legacyFieldKeys,
    numericRange: existing.numericRange ?? { ...DEFAULT_NUMERIC_RANGE },
  };
  return normalizeAuxiliaryConditionLabel(merged, ctx.applicableTypes ?? ['GLOBAL']);
}

/** 将辅助条件与条件赋分对齐为一致包（survey + conditionalScoring） */
export function buildAuxiliaryConditionalPackage(
  partial: Pick<
    RiskIndicatorRow,
    'id' | 'code' | 'name' | 'level1' | 'applicableTypes' | 'valueType' | 'scoreRules' | 'survey' | 'conditionalScoring'
  >,
): AuxiliaryConditionalPackage {
  const code = String(partial.code ?? '').trim() || 'IND';
  const aux = resolveAuxiliaryDefaults({
    code,
    level1: partial.level1,
    applicableTypes: partial.applicableTypes,
    existingAux: partial.survey?.auxiliaryCondition,
  });

  const idPrefix = partial.id ?? 'new';
  const resolvedValueType =
    partial.valueType === 'boolean' ? 'enum' : (partial.valueType ?? 'enum');
  const scoreRules = partial.scoreRules?.length
    ? partial.scoreRules
    : resolvedValueType === 'numeric'
      ? createGenericNumericUniformRules(idPrefix)
      : [
          { id: `${idPrefix}-e0`, label: '低风险档', riskTier: '低', score: 0.25 },
          { id: `${idPrefix}-e1`, label: '高风险档', riskTier: '高', score: 1 },
        ];

  const row: RiskIndicatorRow = {
    id: partial.id ?? 'draft',
    code,
    name: partial.name ?? '新指标',
    level1: partial.level1 ?? 'FORMATION',
    applicableTypes: partial.applicableTypes ?? ['GLOBAL'],
    weight: 0,
    valueType: resolvedValueType,
    scoreRules,
    enabled: false,
    updatedAt: '',
    survey: {
      collectInSurvey: true,
      surveyRequired: false,
      fieldKey: partial.survey?.fieldKey ?? code,
      inputVariant: 'auxiliary_then_select',
      placeholder: partial.survey?.placeholder ?? '',
      auxiliaryCondition: aux,
    },
    // 不复用半成品 conditionalScoring，避免「有分支名、无赋分档」导致就绪误报
    conditionalScoring: undefined,
  };

  const preset = buildAuxiliaryConditionalFromIndicator(row);
  const expectedSource = resolveAuxiliaryConditionSource(aux);
  const conditionalScoring: ConditionalScoringConfig = {
    ...preset,
    enabled: true,
    mode: 'branch_rules',
    source: expectedSource,
    branches: preset.branches.map((b, i) => ({
      ...b,
      id: b.id || `${row.id}-cb${i}`,
      scoreRules: b.scoreRules?.map((r, j) => ({
        ...r,
        id: r.id || `${row.id}-cb${i}-r${j}`,
      })),
    })),
  };

  return {
    survey: row.survey,
    conditionalScoring,
    scoringRuleMode: 'conditional',
    scoreRules: row.scoreRules,
    valueType: row.valueType,
  };
}

/** 指标行：辅助条件与条件赋分来源不一致时纠正 */
export function alignAuxiliaryConditionalOnRow(ind: RiskIndicatorRow): RiskIndicatorRow {
  const aux = ind.survey?.auxiliaryCondition;
  if (!ind.survey?.inputVariant && aux?.fieldKey) {
    ind = {
      ...ind,
      survey: { ...ind.survey, inputVariant: 'auxiliary_then_select' },
    };
  }
  if (ind.survey?.inputVariant !== 'auxiliary_then_select' || !aux?.fieldKey) {
    return ind;
  }

  const expectedSource = resolveAuxiliaryConditionSource(aux);
  const cur = ind.conditionalScoring;
  const sourceMismatch =
    !cur?.source?.key ||
    cur.source.type !== expectedSource.type ||
    cur.source.key !== expectedSource.key;
  const branchesMissing = !cur?.branches?.length;

  if (!sourceMismatch && !branchesMissing && cur?.enabled) {
    return ind;
  }

  const pkg = buildAuxiliaryConditionalPackage(ind);
  return {
    ...ind,
    survey: { ...ind.survey, ...pkg.survey },
    conditionalScoring: pkg.conditionalScoring,
    scoringRuleMode: 'conditional',
  };
}

/** 辅助条件字段键下拉（展示中文，存 fieldKey） */
export function buildAuxiliaryConditionFieldKeyOptions(ctx: {
  code?: string;
  level1?: Level1Factor;
  applicableTypes?: HazardPointType[];
  label?: string;
  surveyPlacement?: IndicatorAuxiliaryConditionField['surveyPlacement'];
  currentFieldKey?: string;
  indicators?: RiskIndicatorRow[];
}): { value: string; label: string }[] {
  const code = String(ctx.code ?? '').trim() || 'IND';
  const defaults = resolveAuxiliaryDefaults({
    code,
    level1: ctx.level1,
    applicableTypes: ctx.applicableTypes,
    existingAux: {
      label: ctx.label,
      fieldKey: ctx.currentFieldKey,
      surveyPlacement: ctx.surveyPlacement,
    },
  });
  const options: { value: string; label: string }[] = [];
  const seen = new Set<string>();

  const push = (fieldKey: string, display: string) => {
    const key = fieldKey.trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    options.push({ value: key, label: display });
  };

  const selfLabel = resolveAuxiliaryDisplayLabel(
    {
      fieldKey: defaults.fieldKey,
      label: ctx.label ?? defaults.label,
      surveyPlacement: ctx.surveyPlacement ?? defaults.surveyPlacement,
    },
    ctx.applicableTypes ?? ['GLOBAL'],
  );
  push(defaults.fieldKey, `${selfLabel}（推荐）`);

  if (ctx.surveyPlacement === 'appendix_b' && ctx.level1 && isFormationLevel1(ctx.level1)) {
    const pointType = resolvePrimarySurveyPointType(ctx.applicableTypes ?? []);
    if (pointType) {
      for (const field of listAppendixBConditionFieldsForPointType(pointType, ctx.indicators, {
        onlyEnabledIndicators: true,
      })) {
        push(field.key, field.label);
      }
    }
  }

  const current = String(ctx.currentFieldKey ?? '').trim();
  if (current && !seen.has(current)) {
    push(
      current,
      ctx.surveyPlacement === 'appendix_b'
        ? formatAppendixAuxiliaryConditionLabel(
            {
              fieldKey: current,
              label: selfLabel,
              unit: defaults.unit,
              thresholdPct: defaults.thresholdPct,
              collectInSurvey: true,
              surveyPlacement: 'appendix_b',
            },
            ctx.applicableTypes ?? [],
          )
        : selfLabel,
    );
  }

  return options;
}

/** 从条件分支 numericMatch 提取分界值（优先取 ≤ / < 支） */
export function resolveThresholdFromConditionalBranches(
  branches: ConditionalScoringConfig['branches'] | undefined,
): number | undefined {
  if (!branches?.length) return undefined;
  for (const b of branches) {
    const m = b.numericMatch;
    if (m?.kind === 'lte' || m?.kind === 'lt') return m.value;
  }
  for (const b of branches) {
    const m = b.numericMatch;
    if (m?.kind === 'gt' || m?.kind === 'gte') return m.value;
  }
  return undefined;
}

/** 条件赋分分支阈值变更后，回写 auxiliaryCondition.thresholdPct（普查 ? 提示用） */
export function syncAuxiliarySurveyFromConditionalBranches(form: FormInstance): void {
  const survey = form.getFieldValue('survey') as RiskIndicatorRow['survey'] | undefined;
  if (survey?.inputVariant !== 'auxiliary_then_select') return;
  const aux = survey.auxiliaryCondition;
  if (!aux?.fieldKey?.trim()) return;

  const cfg = form.getFieldValue('conditionalScoring') as ConditionalScoringConfig | undefined;
  const thresholdPct = resolveThresholdFromConditionalBranches(cfg?.branches);
  const source = cfg?.source;
  const surveyPlacement: IndicatorAuxiliaryConditionField['surveyPlacement'] =
    source?.type === 'appendix_b' ? 'appendix_b' : 'indicator_census';

  const patch: Partial<IndicatorAuxiliaryConditionField> = { surveyPlacement };
  if (thresholdPct !== undefined && !Number.isNaN(thresholdPct)) {
    patch.thresholdPct = thresholdPct;
  }

  form.setFieldsValue({
    survey: {
      ...survey,
      auxiliaryCondition: { ...aux, ...patch },
    },
  });
}

/** 写入表单：模板 / 向导 / 面板改辅助条件时统一调用 */
export function syncAuxiliaryConditionalToForm(
  form: FormInstance,
  ctx: AuxiliaryDefaultsContext,
): void {
  const code = String(ctx.code ?? form.getFieldValue('code') ?? '').trim() || 'IND';
  const valueType = (ctx.valueType ?? form.getFieldValue('valueType') ?? 'enum') as RiskIndicatorRow['valueType'];
  const pkg = buildAuxiliaryConditionalPackage({
    id: ctx.id ?? form.getFieldValue('id') ?? 'new',
    code,
    name: ctx.name ?? form.getFieldValue('name'),
    level1: ctx.level1 ?? form.getFieldValue('level1'),
    applicableTypes: ctx.applicableTypes ?? form.getFieldValue('applicableTypes'),
    valueType,
    scoreRules: ctx.scoreRules ?? form.getFieldValue('scoreRules'),
    survey: {
      ...(form.getFieldValue('survey') ?? {}),
      fieldKey: code,
      auxiliaryCondition: {
        ...(form.getFieldValue(['survey', 'auxiliaryCondition']) ?? {}),
        ...resolveAuxiliaryDefaults({
          code,
          level1: ctx.level1 ?? form.getFieldValue('level1'),
          applicableTypes: ctx.applicableTypes ?? form.getFieldValue('applicableTypes'),
          existingAux: form.getFieldValue(['survey', 'auxiliaryCondition']),
        }),
      },
    },
  });

  const existingRules = form.getFieldValue('scoreRules') as RiskIndicatorRow['scoreRules'] | undefined;
  form.setFieldsValue({
    valueType: pkg.valueType,
    scoreRules: existingRules?.length ? existingRules : pkg.scoreRules,
    survey: pkg.survey,
    conditionalScoring: pkg.conditionalScoring,
    scoringRuleMode: pkg.scoringRuleMode,
  });
}
