import type { FormInstance } from 'antd';
import type { RiskIndicatorRow, ScoreRule } from './types';
import { buildDefaultScoreExplanation } from './defaultScoreExplanation';
import { applyScoringRuleMode } from './scoringRuleMode';
import { createDefaultScoreRulesForValueType } from './indicatorValueTypeUtils';
import { createGenericNumericUniformRules, enrichNumericRuleLabels } from './scoreRuleNumericBands';
import { resolveAppendixBValueFieldKey } from './numericIndicatorConstraints';
import { DEFAULT_COMPOSITE_NUMERIC_RANGE } from './surveyTemplates';
import type { ScoringRuleMode } from './types';

/** 填报与赋分场景模板（用户可见） */
export type IndicatorConfigTemplateId =
  | 'enum_uniform'
  | 'numeric_uniform'
  | 'boolean_uniform'
  | 'auxiliary_conditional'
  | 'composite_appendix';

export interface IndicatorConfigTemplateMeta {
  id: IndicatorConfigTemplateId;
  title: string;
  description: string;
  /** 与基本信息 valueType 的兼容提示 */
  valueTypes: RiskIndicatorRow['valueType'][];
  scoringRuleMode: ScoringRuleMode;
}

export const INDICATOR_CONFIG_TEMPLATES: IndicatorConfigTemplateMeta[] = [
  {
    id: 'enum_uniform',
    title: '下拉选档',
    description: '普查时下拉选择分档，按选项直接匹配标准分 F。',
    valueTypes: ['enum'],
    scoringRuleMode: 'uniform',
  },
  {
    id: 'numeric_uniform',
    title: '数值分档',
    description: '普查时填写数值，为每档配置匹配区间后按填报值自动赋分。',
    valueTypes: ['numeric'],
    scoringRuleMode: 'uniform',
  },
  {
    id: 'boolean_uniform',
    title: '是 / 否',
    description: '普查时选择是或否，对应两档标准分。',
    valueTypes: ['boolean'],
    scoringRuleMode: 'uniform',
  },
  {
    id: 'auxiliary_conditional',
    title: '条件赋分',
    description:
      '先选条件来源（内涝基本信息 / 本点其他指标）与条件字段，再配置各分支赋分档或数值分界。',
    valueTypes: ['enum', 'numeric'],
    scoringRuleMode: 'conditional',
  },
  {
    id: 'composite_appendix',
    title: '多数值聚合赋分',
    description:
      '在赋分规则中为多个条件字段（内涝基本信息或本点数值型指标）各配数值分档，聚合为本指标 F；本指标不在指标普查手填。',
    valueTypes: ['enum', 'numeric'],
    scoringRuleMode: 'composite',
  },
];

export function getIndicatorConfigTemplateMeta(
  id: IndicatorConfigTemplateId,
): IndicatorConfigTemplateMeta | undefined {
  return INDICATOR_CONFIG_TEMPLATES.find(t => t.id === id);
}

/** 枚举型默认两档（新建通用） */
export function createDefaultEnumUniformRules(idPrefix = 'rule'): ScoreRule[] {
  return [
    { id: `${idPrefix}-e0`, label: '低风险档', riskTier: '低', score: 0.25 },
    { id: `${idPrefix}-e1`, label: '高风险档', riskTier: '高', score: 1 },
  ];
}

/** 数值型默认四档（含可编辑区间示意） */
export function createDefaultNumericUniformRules(idPrefix = 'rule'): ScoreRule[] {
  return createGenericNumericUniformRules(idPrefix);
}

export function resolveTemplateForRow(
  row: Pick<RiskIndicatorRow, 'valueType' | 'scoringRuleMode' | 'survey' | 'conditionalScoring'>,
): IndicatorConfigTemplateId | undefined {
  const mode = row.scoringRuleMode;
  if (mode === 'composite' || row.survey?.inputVariant === 'composite_appendix_numeric') {
    return 'composite_appendix';
  }
  if (mode === 'conditional' || row.survey?.inputVariant === 'auxiliary_then_select') {
    return 'auxiliary_conditional';
  }
  if (row.valueType === 'boolean') return 'boolean_uniform';
  if (row.valueType === 'numeric') return 'numeric_uniform';
  if (row.valueType === 'enum') return 'enum_uniform';
  return undefined;
}

export function listTemplatesForValueType(
  valueType: RiskIndicatorRow['valueType'],
): IndicatorConfigTemplateMeta[] {
  return INDICATOR_CONFIG_TEMPLATES.filter(t => t.valueTypes.includes(valueType));
}

/** 第二步场景选择器固定展示的 4 种主场景（与 valueType 过滤无关） */
export const PRIMARY_SCENARIO_TEMPLATE_IDS: IndicatorConfigTemplateId[] = [
  'enum_uniform',
  'numeric_uniform',
  'auxiliary_conditional',
  'composite_appendix',
];

/** 普查填报方式在 UI 上的文案（与新建向导 Select 一致） */
export const SURVEY_VALUE_TYPE_LABEL: Record<RiskIndicatorRow['valueType'], string> = {
  enum: '下拉分档',
  numeric: '填数值',
  boolean: '是 / 否',
};

/** 各场景模板点选后将同步的普查填报方式（复合/条件场景保留当前 enum|numeric） */
export const TEMPLATE_PRIMARY_VALUE_TYPE: Partial<
  Record<IndicatorConfigTemplateId, RiskIndicatorRow['valueType']>
> = {
  enum_uniform: 'enum',
  numeric_uniform: 'numeric',
  boolean_uniform: 'boolean',
};

/** 普查填报方式 → 默认统一赋分场景（条件/复合不在此映射） */
export const VALUE_TYPE_DEFAULT_TEMPLATE: Record<
  RiskIndicatorRow['valueType'],
  IndicatorConfigTemplateId
> = {
  enum: 'enum_uniform',
  numeric: 'numeric_uniform',
  boolean: 'boolean_uniform',
};

export function isTemplateCompatibleWithValueType(
  templateId: IndicatorConfigTemplateId,
  valueType: RiskIndicatorRow['valueType'],
): boolean {
  return listTemplatesForValueType(valueType).some(t => t.id === templateId);
}

export function resolveDefaultTemplateForValueType(
  valueType: RiskIndicatorRow['valueType'],
): IndicatorConfigTemplateId {
  return VALUE_TYPE_DEFAULT_TEMPLATE[valueType];
}

/** 切换场景是否会改变赋分方式（统一 / 条件 / 复合），需二次确认 */
export function requiresTemplateSwitchConfirm(
  fromId: IndicatorConfigTemplateId | undefined,
  toId: IndicatorConfigTemplateId,
): boolean {
  if (!fromId || fromId === toId) return false;
  const from = getIndicatorConfigTemplateMeta(fromId);
  const to = getIndicatorConfigTemplateMeta(toId);
  if (!from || !to) return false;
  return from.scoringRuleMode !== to.scoringRuleMode;
}

/** 场景卡片上展示的「所需填报方式」说明 */
export function getTemplateRequiredSurveyLabel(id: IndicatorConfigTemplateId): string {
  switch (id) {
    case 'enum_uniform':
      return `需：${SURVEY_VALUE_TYPE_LABEL.enum}`;
    case 'numeric_uniform':
      return `需：${SURVEY_VALUE_TYPE_LABEL.numeric}`;
    case 'boolean_uniform':
      return `需：${SURVEY_VALUE_TYPE_LABEL.boolean}`;
    case 'auxiliary_conditional':
      return `兼容：${SURVEY_VALUE_TYPE_LABEL.enum} / ${SURVEY_VALUE_TYPE_LABEL.numeric}`;
    case 'composite_appendix':
      return `兼容：${SURVEY_VALUE_TYPE_LABEL.enum} / ${SURVEY_VALUE_TYPE_LABEL.numeric}`;
    default:
      return '';
  }
}

/** 主场景列表：固定 4 项；第一步为「是/否」时追加布尔场景 */
export function listPrimaryScenarioTemplates(
  valueType?: RiskIndicatorRow['valueType'],
): IndicatorConfigTemplateMeta[] {
  const ids: IndicatorConfigTemplateId[] = [...PRIMARY_SCENARIO_TEMPLATE_IDS];
  if (valueType === 'boolean') {
    ids.splice(1, 0, 'boolean_uniform');
  }
  return ids
    .map(id => getIndicatorConfigTemplateMeta(id))
    .filter((t): t is IndicatorConfigTemplateMeta => Boolean(t));
}

export interface ApplyTemplateContext {
  code?: string;
  name?: string;
  idPrefix?: string;
  /** structure：仅切换填报/赋分形态与档位数，不预填分档描述与赋分说明 */
  contentMode?: 'structure' | 'full';
  /** 向导等场景显式传入，避免表单字段卸载后读不到 valueType */
  valueType?: RiskIndicatorRow['valueType'];
}

function createStructureScoreRules(
  templateId: IndicatorConfigTemplateId,
  idPrefix: string,
): ScoreRule[] {
  if (templateId === 'numeric_uniform') {
    return createGenericNumericUniformRules(idPrefix);
  }
  if (templateId === 'boolean_uniform') {
    return createDefaultScoreRulesForValueType('boolean', idPrefix).map(r => ({
      ...r,
      label: '',
      riskTier: '',
    }));
  }
  return createDefaultEnumUniformRules(idPrefix).map(r => ({
    ...r,
    label: '',
    riskTier: '',
  }));
}

/** 将场景模板写入表单（统一走 applyScoringRuleMode，避免双写） */
export function applyIndicatorConfigTemplate(
  form: FormInstance,
  templateId: IndicatorConfigTemplateId,
  context: ApplyTemplateContext = {},
): void {
  const code = String(context.code ?? form.getFieldValue('code') ?? '').trim() || 'IND';
  const name = String(context.name ?? form.getFieldValue('name') ?? '').trim() || '新指标';
  const idPrefix = context.idPrefix ?? 'new';
  const structureOnly = context.contentMode === 'structure';

  const meta = INDICATOR_CONFIG_TEMPLATES.find(t => t.id === templateId);
  if (!meta) return;

  const existingSurvey = (form.getFieldValue('survey') as RiskIndicatorRow['survey'] | undefined) ?? {};
  let valueType: RiskIndicatorRow['valueType'] =
    context.valueType ??
    (form.getFieldValue('valueType') as RiskIndicatorRow['valueType'] | undefined) ??
    'enum';
  if (templateId === 'boolean_uniform') valueType = 'boolean';
  else if (templateId === 'numeric_uniform') valueType = 'numeric';
  else if (templateId === 'enum_uniform') valueType = 'enum';

  const surveyBase = {
    collectInSurvey: existingSurvey.collectInSurvey ?? true,
    surveyRequired: existingSurvey.surveyRequired ?? false,
    fieldKey: String(existingSurvey.fieldKey ?? '').trim() || code,
    inputVariant: 'default' as const,
    placeholder: existingSurvey.placeholder ?? '',
  };

  applyScoringRuleMode(form, meta.scoringRuleMode, valueType);

  if (templateId === 'enum_uniform') {
    const scoreRules = structureOnly
      ? createStructureScoreRules('enum_uniform', idPrefix)
      : createDefaultEnumUniformRules(idPrefix);
    form.setFieldsValue({
      valueType: 'enum',
      scoreRules,
      survey: { ...existingSurvey, ...surveyBase, inputVariant: 'default' },
    });
  } else if (templateId === 'numeric_uniform') {
    const unit = String(form.getFieldValue('unit') ?? '').trim();
    const scoreRules = enrichNumericRuleLabels(
      structureOnly
        ? createStructureScoreRules('numeric_uniform', idPrefix)
        : createDefaultNumericUniformRules(idPrefix),
      { unit },
    );
    form.setFieldsValue({
      valueType: 'numeric',
      unit: form.getFieldValue('unit') ?? '',
      scoreRules,
      survey: { ...existingSurvey, ...surveyBase, inputVariant: 'default' },
    });
  } else if (templateId === 'boolean_uniform') {
    const scoreRules = structureOnly
      ? createStructureScoreRules('boolean_uniform', idPrefix)
      : createDefaultScoreRulesForValueType('boolean', idPrefix);
    form.setFieldsValue({
      valueType: 'boolean',
      scoreRules,
      survey: { ...existingSurvey, ...surveyBase, inputVariant: 'default' },
    });
  } else if (templateId === 'auxiliary_conditional') {
    if (!form.getFieldValue('scoreRules')?.length) {
      const auxVt = valueType ?? (form.getFieldValue('valueType') as RiskIndicatorRow['valueType']);
      form.setFieldValue(
        'scoreRules',
        auxVt === 'numeric'
          ? structureOnly
            ? createStructureScoreRules('numeric_uniform', idPrefix)
            : createGenericNumericUniformRules(idPrefix)
          : structureOnly
            ? createStructureScoreRules('enum_uniform', idPrefix)
            : createDefaultEnumUniformRules(idPrefix),
      );
    }
    form.setFieldsValue({
      valueType,
      survey: {
        ...existingSurvey,
        ...surveyBase,
        inputVariant: 'default',
        auxiliaryCondition: undefined,
      },
    });
  } else if (templateId === 'composite_appendix') {
    applyScoringRuleMode(form, 'composite', valueType);
    const parts = [
      {
        label: '子项 1',
        appendixBFieldKey: 'appendixPart1',
        valueFieldKey: resolveAppendixBValueFieldKey('appendixPart1', code, 0),
        numericRange: { ...DEFAULT_COMPOSITE_NUMERIC_RANGE },
        tierBands: [
          { riskTier: '低', score: 0.2, match: { kind: 'gte' as const, value: 0 } },
          { riskTier: '高', score: 1, match: { kind: 'lt' as const, value: 0 } },
        ],
      },
    ];
    form.setFieldsValue({
      valueType,
      survey: {
        ...existingSurvey,
        ...surveyBase,
        inputVariant: 'composite_appendix_numeric',
        compositeAggregation: existingSurvey.compositeAggregation ?? 'max_f',
        appendixBSurveyParts: parts,
      },
    });
  }

  if (structureOnly) {
    form.setFieldValue('scoreExplanation', '');
  } else {
    const merged = form.getFieldsValue(true) as RiskIndicatorRow;
    form.setFieldValue(
      'scoreExplanation',
      buildDefaultScoreExplanation({
        code: merged.code ?? code,
        name: merged.name ?? name,
        valueType: merged.valueType ?? valueType,
        scoreRules: merged.scoreRules ?? [],
        survey: merged.survey,
        remark: merged.remark,
      }),
    );
  }
  form.setFieldValue('configTemplateId', templateId);
}

/** 从表单行构建用于预览/校验的临时指标行 */
export function buildIndicatorRowFromForm(
  form: FormInstance,
  editing?: RiskIndicatorRow | null,
): RiskIndicatorRow {
  const values = form.getFieldsValue(true) as Partial<RiskIndicatorRow>;
  const code = String(values.code ?? editing?.code ?? '').trim();
  return {
    ...(editing ?? {
      id: 'draft',
      enabled: false,
      weight: 0,
      updatedAt: '',
      level1: 'HAZARD',
      applicableTypes: ['GLOBAL'],
    }),
    ...values,
    code,
    name: String(values.name ?? editing?.name ?? '').trim() || '未命名',
    valueType: values.valueType ?? editing?.valueType ?? 'enum',
    scoreRules: values.scoreRules ?? editing?.scoreRules ?? [],
    survey: {
      collectInSurvey: true,
      surveyRequired: false,
      fieldKey: code,
      ...editing?.survey,
      ...values.survey,
    },
    conditionalScoring: values.conditionalScoring ?? editing?.conditionalScoring,
    scoringRuleMode: values.scoringRuleMode ?? editing?.scoringRuleMode,
  } as RiskIndicatorRow;
}
