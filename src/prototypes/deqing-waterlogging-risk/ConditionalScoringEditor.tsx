import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Segmented,
  Select,
  Space,
  Switch,
  Typography,
  message,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, NodeIndexOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';
import type { BranchNumericMatch, ConditionalScoringConfig, HazardPointType, RiskIndicatorRow } from './types';
import {
  SURVEY_BASIC_INFO_SOURCE_LABEL,
  allowedConditionCandidateValueTypes,
  getAppendixBMatchValueOptions,
  filterExclusiveMatchValueOptions,
  reconcileExclusiveBranchMatchValues,
  getConditionSourceFieldOptions,
  getConditionSourceIndicatorCandidates,
  dedupeConditionFieldOptions,
  enrichConditionFieldOptionLabels,
  ensureConditionFieldOption,
  getSurveyBasicInfoConditionFieldOptions,
  getConditionIndicatorFieldEmptyHint,
  isConditionSourceFilterIncomplete,
  isDiscreteConditionIndicator,
  normalizeConditionSourceKey,
  prependSelfAuxiliaryConditionOption,
  resolveConditionFieldLabel,
  suggestConditionalScoringForIndicator,
  type ConditionSourceFilterContext,
} from './conditionalScoring';
import { appendixBConditionFieldUsesDiscreteMatch } from './appendixBConditionFields';
import {
  defaultApplicableTypesForLevel1,
  isFormationLevel1,
} from './indicatorApplicableTypes';
import { resolvePrimarySurveyPointType } from './compositeConditionalSurvey';
import {
  hasAuxiliaryConditionSurvey,
  isAppendixBasicInfoIndicatorValueKey,
  isSelfAuxiliaryConditionFieldKey,
  resolveAuxiliaryConditionSource,
  resolveAuxiliaryDisplayLabel,
  shouldCollectAuxiliaryInAppendixB,
} from './compositeConditionalSurvey';
import type { IndicatorConfigTemplateId } from './indicatorConfigTemplates';
import {
  buildAuxiliaryConditionalPackage,
  syncAuxiliarySurveyFromConditionalBranches,
} from './auxiliaryIndicatorDefaults';
import { mergeIndicatorSurveyConfig } from './indicatorSurveyUtils';
import { resolveCompositePartUnit } from './compositePartUnit';
import { getScoreRuleLimits } from './indicatorValueTypeUtils';
import { buildConditionalScoringFlowModel, resolveConditionalScoringForFlow } from './conditionalScoringFlow';
import { ConditionalScoringFlowView } from './ConditionalScoringFlowView';
import { NUMERIC_MATCH_KIND_SELECT_OPTIONS } from './branchNumericMatch';
import { NumericScoreRuleMatchFields } from './NumericScoreRuleMatchFields';
import { FormLabelHelpTip, formLabelWithHelp, MATCH_VALUES_EXCLUSIVE_HELP } from './FormLabelHelpTip';
import {
  createGenericNumericBranchRules,
  formatNumericMatchLabel,
  refreshAutoNumericRuleLabels,
  shouldRefreshNumericRuleLabel,
} from './scoreRuleNumericBands';

const { Text } = Typography;

/** 指标普查辅助条件：只读展示中文名（与表单存的 fieldKey 分离，避免 Ant Design 回显裸键） */
function ConditionFieldReadonlyDisplay({
  fieldKey,
  aux,
  applicableTypes,
  resolveLabel,
}: {
  fieldKey?: string;
  aux?: NonNullable<RiskIndicatorRow['survey']>['auxiliaryCondition'];
  applicableTypes: HazardPointType[];
  resolveLabel: (key: string) => string;
}) {
  const key = fieldKey?.trim() ?? aux?.fieldKey?.trim() ?? '';
  const display = key
    ? resolveLabel(key)
    : aux
      ? resolveAuxiliaryDisplayLabel(aux, applicableTypes)
      : '辅助条件';
  return <Input readOnly value={display || '辅助条件'} />;
}

const NUMERIC_MATCH_OPTIONS = NUMERIC_MATCH_KIND_SELECT_OPTIONS.filter(o => o.value !== 'between');

function hasConfiguredBranchConditions(
  branches: ConditionalScoringConfig['branches'] | undefined,
): boolean {
  return Boolean(
    branches?.some(
      branch =>
        Boolean(branch.matchValues?.length) ||
        Boolean(branch.numericMatch) ||
        branch.numericThreshold !== undefined,
    ),
  );
}

function clearBranchConditions(
  branches: ConditionalScoringConfig['branches'] | undefined,
): ConditionalScoringConfig['branches'] {
  return (branches ?? []).map(branch => ({
    ...branch,
    matchValues: [],
    numericMatch: undefined,
    numericThreshold: undefined,
  }));
}

interface Props {
  form: FormInstance;
  valueType: RiskIndicatorRow['valueType'];
  /** 当前编辑指标的作用域：易涝点普查 vs 全县防灾减灾 */
  surveyScope: 'point' | 'region';
  allIndicators: RiskIndicatorRow[];
  /** 导则预置种子，用于补全本地缓存中缺失的 auxiliaryCondition */
  defaultIndicators?: RiskIndicatorRow[];
  selfCode?: string;
  detailOnly?: boolean;
  idPrefix: string;
  /** 赋分方式 Segmented 已选「条件赋分」时不再展示「启用」开关，始终视为已开启 */
  drivenByScoringRuleMode?: boolean;
  /** 新建向导等：已选「条件赋分」场景模板（仅用于赋分方式锁定，不触发辅助条件 UX） */
  scenarioTemplateId?: IndicatorConfigTemplateId;
  /** 详情/编辑打开时的条件赋分快照，流程预览在表单字段未挂载时回退 */
  configSnapshot?: ConditionalScoringConfig;
}

/** 赋分规则 Tab：通用条件赋分配置 */
export const ConditionalScoringEditor: React.FC<Props> = ({
  form,
  valueType,
  surveyScope,
  allIndicators,
  defaultIndicators,
  selfCode,
  detailOnly,
  idPrefix,
  drivenByScoringRuleMode = false,
  scenarioTemplateId,
  configSnapshot,
}) => {
  const enabledWatch = Form.useWatch(['conditionalScoring', 'enabled'], form) as boolean | undefined;
  const effectiveEnabled = drivenByScoringRuleMode ? true : Boolean(enabledWatch);
  const automaticMode = valueType === 'numeric' ? 'branch_threshold' : 'branch_rules';
  const watchedMode = Form.useWatch(['conditionalScoring', 'mode'], form) as
    | 'branch_threshold'
    | 'branch_rules'
    | undefined;
  const mode = automaticMode;
  const sourceType = Form.useWatch(['conditionalScoring', 'source', 'type'], form) as
    | 'appendix_b'
    | 'indicator'
    | undefined;
  const sourceKey = Form.useWatch(['conditionalScoring', 'source', 'key'], form) as string | undefined;
  const conditionalWatched = Form.useWatch('conditionalScoring', form) as ConditionalScoringConfig | undefined;
  const [editorView, setEditorView] = useState<'form' | 'flow'>(detailOnly ? 'flow' : 'form');

  useEffect(() => {
    if (detailOnly) setEditorView('flow');
  }, [detailOnly]);

  useEffect(() => {
    if (!effectiveEnabled) setEditorView('form');
  }, [effectiveEnabled]);

  const level1Watch = Form.useWatch('level1', form) as RiskIndicatorRow['level1'] | undefined;
  const applicableTypesWatch = Form.useWatch('applicableTypes', form) as HazardPointType[] | undefined;
  const surveyWatch = Form.useWatch('survey', form) as RiskIndicatorRow['survey'] | undefined;
  const unitWatch = Form.useWatch('unit', form) as string | undefined;

  const numericBranchBandRules = valueType === 'numeric';

  useEffect(() => {
    if (watchedMode === automaticMode) return;
    form.setFieldValue(['conditionalScoring', 'mode'], automaticMode);
  }, [automaticMode, form, watchedMode]);

  const syncBranchNumericRuleLabel = useCallback(
    (branchFieldName: number, ruleIndex: number) => {
      queueMicrotask(() => {
        const rules = (form.getFieldValue([
          'conditionalScoring',
          'branches',
          branchFieldName,
          'scoreRules',
        ]) ?? []) as RiskIndicatorRow['scoreRules'];
        const rule = rules[ruleIndex];
        if (!rule?.numericMatch) return;
        const unit = String(form.getFieldValue('unit') ?? unitWatch ?? '').trim() || undefined;
        if (!shouldRefreshNumericRuleLabel(rule, unit)) return;
        const auto = formatNumericMatchLabel(rule.numericMatch, { unit });
        if (!auto || auto === rule.label) return;
        form.setFieldValue(
          ['conditionalScoring', 'branches', branchFieldName, 'scoreRules'],
          rules.map((r, i) => (i === ruleIndex ? { ...r, label: auto } : r)),
        );
      });
    },
    [form, unitWatch],
  );

  useEffect(() => {
    if (!numericBranchBandRules || detailOnly) return;
    const branches = conditionalWatched?.branches ?? [];
    if (!branches.length) return;
    const unit = String(form.getFieldValue('unit') ?? unitWatch ?? '').trim() || undefined;
    let changed = false;
    const next = branches.map(b => {
      if (!b.scoreRules?.length) return b;
      const refreshed = refreshAutoNumericRuleLabels(b.scoreRules, { unit });
      const same = refreshed.every((r, i) => r.label === b.scoreRules?.[i]?.label);
      if (same) return b;
      changed = true;
      return { ...b, scoreRules: refreshed };
    });
    if (changed) {
      form.setFieldValue(['conditionalScoring', 'branches'], next);
    }
  }, [unitWatch, numericBranchBandRules, detailOnly, form]);

  const selfAuxiliaryCondKey = isSelfAuxiliaryConditionFieldKey(
    sourceKey ?? surveyWatch?.auxiliaryCondition?.fieldKey,
    selfCode ?? (form.getFieldValue('code') as string | undefined),
  );

  const isAuxiliaryScenario =
    surveyWatch?.inputVariant === 'auxiliary_then_select' ||
    Boolean(surveyWatch?.auxiliaryCondition?.fieldKey?.trim()) ||
    selfAuxiliaryCondKey;

  useEffect(() => {
    if (!isAuxiliaryScenario || detailOnly) return;
    syncAuxiliarySurveyFromConditionalBranches(form);
  }, [isAuxiliaryScenario, detailOnly, conditionalWatched, form]);

  const defaultMode = automaticMode;

  const selfDraftSurvey = useMemo(
    (): Pick<RiskIndicatorRow, 'survey'> | undefined =>
      surveyWatch ? { survey: surveyWatch } : undefined,
    [surveyWatch],
  );

  useEffect(() => {
    if (!effectiveEnabled) return;
    const cfg = form.getFieldValue('conditionalScoring') as ConditionalScoringConfig | undefined;
    if (!cfg?.source?.key?.trim()) return;
    const normalized = normalizeConditionSourceKey(
      cfg.source,
      surveyScope,
      allIndicators,
      selfCode,
      selfDraftSurvey,
    );
    if (normalized.key !== cfg.source.key || normalized.type !== cfg.source.type) {
      form.setFieldValue(['conditionalScoring', 'source'], normalized);
    }
  }, [effectiveEnabled, surveyScope, allIndicators, selfCode, selfDraftSurvey, form]);
  const isRegion = surveyScope === 'region';

  const basicInfoConditionContext = useMemo(() => {
    const level1 =
      level1Watch ?? (form.getFieldValue('level1') as RiskIndicatorRow['level1'] | undefined);
    if (!level1) return undefined;
    const typesFromWatch = applicableTypesWatch?.length ? applicableTypesWatch : undefined;
    const typesFromForm = form.getFieldValue('applicableTypes') as HazardPointType[] | undefined;
    const types = typesFromWatch?.length
      ? typesFromWatch
      : typesFromForm?.length
        ? typesFromForm
        : defaultApplicableTypesForLevel1(level1);
    return {
      level1,
      applicableTypes: isFormationLevel1(level1) ? types : (['GLOBAL'] as HazardPointType[]),
      code: ((form.getFieldValue('code') as string | undefined) ?? selfCode)?.trim() || idPrefix,
      survey:
        surveyWatch ??
        (form.getFieldValue('survey') as RiskIndicatorRow['survey'] | undefined) ?? {
          collectInSurvey: true,
          surveyRequired: false,
          fieldKey: idPrefix,
        },
    };
  }, [level1Watch, applicableTypesWatch, selfCode, surveyWatch, form, idPrefix]);

  const selfIndicatorForConditional = useMemo(() => {
    if (!basicInfoConditionContext) return undefined;
    const code = basicInfoConditionContext.code ?? '';
    const fromList = code ? allIndicators.find(i => i.code === code) : undefined;
    const draft: RiskIndicatorRow = {
      ...(fromList ?? {
        id: idPrefix,
        name: ((form.getFieldValue('name') as string) || code) || '新指标',
        weight: 0,
        enabled: true,
        updatedAt: '',
        scoreRules: (form.getFieldValue('scoreRules') as RiskIndicatorRow['scoreRules']) ?? [],
      }),
      code: code || idPrefix,
      level1: basicInfoConditionContext.level1,
      valueType: fromList?.valueType ?? valueType,
      applicableTypes: basicInfoConditionContext.applicableTypes,
      survey:
        surveyWatch ??
        fromList?.survey ?? {
          collectInSurvey: true,
          surveyRequired: false,
          fieldKey: code || idPrefix,
        },
      conditionalScoring: form.getFieldValue('conditionalScoring'),
    } as RiskIndicatorRow;
    return {
      ...draft,
      survey: mergeIndicatorSurveyConfig(draft, fromList),
    };
  }, [
    allIndicators,
    selfCode,
    form,
    valueType,
    idPrefix,
    conditionalWatched,
    surveyWatch,
    basicInfoConditionContext,
  ]);

  const selfIndicator = selfIndicatorForConditional;
  const auxiliaryIndicatorCensusMode = Boolean(
    surveyWatch?.inputVariant === 'auxiliary_then_select' &&
      hasAuxiliaryConditionSurvey(selfIndicatorForConditional) &&
      selfIndicatorForConditional?.survey?.auxiliaryCondition?.surveyPlacement !== 'appendix_b' &&
      !(selfIndicatorForConditional && shouldCollectAuxiliaryInAppendixB(selfIndicatorForConditional)),
  );

  const flowModel = useMemo(() => {
    const fromForm = (conditionalWatched ??
      form.getFieldsValue(true).conditionalScoring) as ConditionalScoringConfig | undefined;
    const forFlow = resolveConditionalScoringForFlow(
      fromForm,
      configSnapshot,
      drivenByScoringRuleMode,
    );
    return buildConditionalScoringFlowModel(forFlow, allIndicators, selfIndicatorForConditional);
  }, [
    conditionalWatched,
    configSnapshot,
    allIndicators,
    form,
    selfIndicatorForConditional,
    drivenByScoringRuleMode,
  ]);

  const conditionFilterContext = useMemo((): ConditionSourceFilterContext | undefined => {
    const level1 = level1Watch ?? selfIndicatorForConditional?.level1;
    if (!level1) return undefined;
    const types = applicableTypesWatch?.length
      ? applicableTypesWatch
      : (selfIndicatorForConditional?.applicableTypes ?? []);
    return {
      level1,
      applicableTypes: isFormationLevel1(level1) ? types : ['GLOBAL'],
      code: selfCode ?? selfIndicatorForConditional?.code ?? idPrefix,
    };
  }, [level1Watch, applicableTypesWatch, selfIndicatorForConditional, selfCode, idPrefix]);

  const conditionFilterIncomplete = isConditionSourceFilterIncomplete(
    conditionFilterContext,
    surveyScope,
  );

  const conditionCandidates = getConditionSourceIndicatorCandidates(
    surveyScope,
    allIndicators,
    selfCode,
    conditionFilterContext,
    mode,
  );

  const conditionSourceIndicator = useMemo(() => {
    if (!sourceKey || sourceType !== 'indicator') return undefined;
    return allIndicators.find(i => i.survey.fieldKey === sourceKey || i.code === sourceKey);
  }, [allIndicators, sourceKey, sourceType]);

  const conditionSourceUsesDiscreteMatch =
    sourceType === 'indicator' &&
    mode === 'branch_rules' &&
    isDiscreteConditionIndicator(conditionSourceIndicator);

  const appendixSourceUsesDiscreteMatch =
    sourceType === 'appendix_b' &&
    !isRegion &&
    Boolean(sourceKey && appendixBConditionFieldUsesDiscreteMatch(sourceKey, allIndicators));

  const branchSectionHelp = useMemo(
    () =>
      isAuxiliaryScenario
        ? '① 各分支「数值条件」决定前提如何切支；② 各分支内配置主指标赋分档。下拉分档时主指标选档，填数值时按分支内区间匹配 F。'
        : mode === 'branch_threshold'
          ? '命中分支后，按各分支内匹配区间与填报值自动匹配标准分 F。'
          : '命中分支后，普查/配置填报以下拉展示该分支下的赋分档选项。',
    [isAuxiliaryScenario, mode],
  );

  const appendixMatchValueOptions = useMemo(() => {
    if (!sourceKey) return [];
    return getAppendixBMatchValueOptions(sourceKey, allIndicators);
  }, [sourceKey, allIndicators]);

  /** 条件字段单位（如道路纵坡度 %），用于分支数值阈值输入框后缀 */
  const conditionFieldUnit = useMemo(() => {
    if (!sourceKey || !sourceType || appendixSourceUsesDiscreteMatch || conditionSourceUsesDiscreteMatch) {
      return undefined;
    }
    return resolveCompositePartUnit(
      { type: sourceType, key: sourceKey },
      allIndicators,
      { indicatorCode: selfIndicatorForConditional?.code },
    );
  }, [
    sourceKey,
    sourceType,
    allIndicators,
    selfIndicatorForConditional?.code,
    appendixSourceUsesDiscreteMatch,
    conditionSourceUsesDiscreteMatch,
  ]);

  const branchesWatch = conditionalWatched?.branches ?? [];

  const applyConditionSourceChange = useCallback(
    (nextSource: ConditionalScoringConfig['source']) => {
      const cfg = form.getFieldValue('conditionalScoring') as ConditionalScoringConfig | undefined;
      form.setFieldsValue({
        conditionalScoring: {
          ...cfg,
          source: nextSource,
          branches: clearBranchConditions(cfg?.branches),
        },
      });
    },
    [form],
  );

  const requestConditionSourceChange = useCallback(
    (nextSource: ConditionalScoringConfig['source']): boolean => {
      if (nextSource.type === sourceType && nextSource.key === sourceKey) return true;
      const cfg = form.getFieldValue('conditionalScoring') as ConditionalScoringConfig | undefined;
      if (!hasConfiguredBranchConditions(cfg?.branches)) {
        applyConditionSourceChange(nextSource);
        return true;
      }
      Modal.confirm({
        title: '切换条件字段？',
        content:
          '切换后将清空各条件分支已配置的「匹配取值 / 数值条件」，避免沿用不兼容的命中条件；本指标在各分支内的赋分选项或数值分档会保留。',
        okText: '切换并清空分支条件',
        cancelText: '取消',
        onOk: () => applyConditionSourceChange(nextSource),
      });
      return false;
    },
    [applyConditionSourceChange, form, sourceKey, sourceType],
  );

  const handleBranchMatchValuesChange = useCallback(
    (branchIndex: number, values: string[]) => {
      const branches = (form.getFieldValue(['conditionalScoring', 'branches']) ??
        []) as ConditionalScoringConfig['branches'];
      const updated = branches.map((b, i) =>
        i === branchIndex ? { ...b, matchValues: values } : b,
      );
      form.setFieldValue(
        ['conditionalScoring', 'branches'],
        reconcileExclusiveBranchMatchValues(updated, branchIndex),
      );
    },
    [form],
  );

  const resolveSourceFieldLabel = useCallback(
    (key: string) =>
      resolveConditionFieldLabel(
        key,
        surveyScope,
        allIndicators,
        selfCode,
        selfIndicatorForConditional,
      ),
    [surveyScope, allIndicators, selfCode, selfIndicatorForConditional],
  );

  const indicatorOptions = useMemo(() => {
    const base = getConditionSourceFieldOptions(
      surveyScope,
      allIndicators,
      selfCode,
      conditionFilterContext,
      mode,
      selfIndicatorForConditional,
    );
    const merged = enrichConditionFieldOptionLabels(
      prependSelfAuxiliaryConditionOption(
        dedupeConditionFieldOptions(
          !sourceKey || base.some(o => o.value === sourceKey)
            ? base
            : [
                {
                  value: sourceKey,
                  label: resolveSourceFieldLabel(sourceKey),
                },
                ...base,
              ],
        ),
        selfIndicatorForConditional,
      ),
      surveyScope,
      allIndicators,
      selfCode,
      selfIndicatorForConditional,
    );
    return ensureConditionFieldOption(merged, sourceKey, resolveSourceFieldLabel);
  }, [
    surveyScope,
    allIndicators,
    selfCode,
    sourceKey,
    conditionFilterContext,
    mode,
    selfIndicatorForConditional,
    resolveSourceFieldLabel,
  ]);

  const conditionIndicatorEmptyHint = useMemo(
    () => getConditionIndicatorFieldEmptyHint(conditionFilterIncomplete, mode),
    [conditionFilterIncomplete, mode],
  );

  useEffect(() => {
    if (!effectiveEnabled || sourceType !== 'indicator' || !sourceKey) return;
    if (indicatorOptions.some(o => o.value === sourceKey)) return;
    const selfAux = selfIndicatorForConditional?.survey?.auxiliaryCondition;
    if (selfAux?.fieldKey === sourceKey) return;
    form.setFieldValue(['conditionalScoring', 'source', 'key'], undefined);
  }, [effectiveEnabled, sourceType, sourceKey, indicatorOptions, selfIndicatorForConditional, form]);

  useEffect(() => {
    if (!effectiveEnabled || !sourceKey) return;
    const aux = selfIndicatorForConditional?.survey?.auxiliaryCondition;
    if (!aux?.fieldKey || aux.fieldKey !== sourceKey) return;
    const expected = resolveAuxiliaryConditionSource(aux);
    if (sourceType === expected.type) return;
    form.setFieldValue(['conditionalScoring', 'source'], expected);
  }, [effectiveEnabled, sourceKey, sourceType, selfIndicatorForConditional, form]);

  useEffect(() => {
    if (!effectiveEnabled || detailOnly) return;
    if (surveyWatch?.inputVariant !== 'auxiliary_then_select') return;
    const aux = surveyWatch?.auxiliaryCondition;
    if (!aux?.fieldKey?.trim()) return;
    const expected = resolveAuxiliaryConditionSource(aux);
    const cur = form.getFieldValue(['conditionalScoring', 'source']) as
      | { type?: string; key?: string }
      | undefined;
    if (cur?.type === expected.type && cur?.key === expected.key) return;
    form.setFieldValue(['conditionalScoring', 'source'], expected);
  }, [effectiveEnabled, detailOnly, surveyWatch, form]);

  useEffect(() => {
    if (!effectiveEnabled || sourceType !== 'indicator' || !sourceKey || !conditionSourceIndicator) return;
    const allowed = allowedConditionCandidateValueTypes(mode);
    if (allowed.includes(conditionSourceIndicator.valueType)) return;
    form.setFieldValue(['conditionalScoring', 'source', 'key'], undefined);
  }, [effectiveEnabled, sourceType, sourceKey, mode, conditionSourceIndicator, form]);

  const appendixConditionOptions = useMemo(
    () =>
      getSurveyBasicInfoConditionFieldOptions(
        selfIndicatorForConditional,
        allIndicators,
        basicInfoConditionContext,
        defaultIndicators,
      ),
    [selfIndicatorForConditional, allIndicators, basicInfoConditionContext, defaultIndicators],
  );

  const appendixConditionFieldOptions = useMemo(() => {
    const normalizedKey =
      sourceKey && sourceType === 'appendix_b'
        ? normalizeConditionSourceKey(
            { type: 'appendix_b', key: sourceKey },
            surveyScope,
            allIndicators,
            selfCode,
            selfIndicatorForConditional,
          ).key
        : sourceKey;
    const merged =
      normalizedKey && !appendixConditionOptions.some(o => o.value === normalizedKey)
        ? [
            {
              value: normalizedKey,
              label: resolveConditionFieldLabel(
                normalizedKey,
                surveyScope,
                allIndicators,
                selfCode,
                selfIndicatorForConditional,
              ),
            },
            ...appendixConditionOptions,
          ]
        : appendixConditionOptions;
    return ensureConditionFieldOption(
      enrichConditionFieldOptionLabels(
        prependSelfAuxiliaryConditionOption(
          dedupeConditionFieldOptions(merged),
          selfIndicatorForConditional,
        ),
        surveyScope,
        allIndicators,
        selfCode,
        selfIndicatorForConditional,
      ),
      sourceKey,
      resolveSourceFieldLabel,
    );
  }, [
    appendixConditionOptions,
    sourceKey,
    sourceType,
    surveyScope,
    allIndicators,
    selfCode,
    selfIndicatorForConditional,
    resolveSourceFieldLabel,
  ]);

  useEffect(() => {
    if (!effectiveEnabled || sourceType !== 'appendix_b' || !sourceKey) return;
    if (appendixConditionFieldOptions.some(o => o.value === sourceKey)) return;
    if (isAppendixBasicInfoIndicatorValueKey(sourceKey, allIndicators)) return;
    if (selfIndicatorForConditional?.survey?.auxiliaryCondition?.fieldKey === sourceKey) return;
    form.setFieldValue(['conditionalScoring', 'source', 'key'], undefined);
  }, [
    effectiveEnabled,
    sourceType,
    sourceKey,
    appendixConditionFieldOptions,
    allIndicators,
    selfIndicatorForConditional,
    form,
  ]);

  const auxiliaryAppendixReady = Boolean(
    selfIndicatorForConditional && shouldCollectAuxiliaryInAppendixB(selfIndicatorForConditional),
  );

  const conditionFieldHelp = useMemo(() => {
    if (conditionFilterIncomplete && (sourceType === 'indicator' || isRegion)) {
      return '请先在「基本信息」中选择适用隐患点类型；条件字段仅展示该类型下的孕灾指标及全县通用数值型指标。';
    }
    if (auxiliaryAppendixReady) {
      return (
        selfIndicatorForConditional?.remark ??
        '条件来源请选「内涝基本信息」，条件字段选对应「类型专用信息」项；取值来自普查「基本信息」专用信息区块。'
      );
    }
    if (
      selfIndicatorForConditional &&
      level1Watch &&
      isFormationLevel1(level1Watch) &&
      resolvePrimarySurveyPointType(conditionFilterContext?.applicableTypes ?? [])
    ) {
      return mode === 'branch_rules'
        ? '展示与当前隐患点类型一致的孕灾指标，以及全县通用的致灾/承灾/防灾减灾指标（数值型、下拉分档型、是/否型）。'
        : '仅展示与当前隐患点类型一致的孕灾数值型指标，以及全县通用的数值型指标。';
    }
    if ((sourceType === 'indicator' || isRegion) && level1Watch && !isFormationLevel1(level1Watch)) {
      return mode === 'branch_rules'
        ? '可引用全县通用的其它数值型、下拉分档型或是/否型指标作为条件。'
        : '致灾/承灾/防灾减灾指标仅可引用全县通用的其它数值型指标作为条件。';
    }
    return undefined;
  }, [
    conditionFilterIncomplete,
    sourceType,
    isRegion,
    auxiliaryAppendixReady,
    selfIndicatorForConditional,
    level1Watch,
    conditionFilterContext,
    mode,
  ]);

  const renderConditionFieldLabel = useCallback(
    (opt: { label?: React.ReactNode; value?: unknown }) => {
      const value = opt.value != null ? String(opt.value) : '';
      const label = opt.label != null ? String(opt.label).trim() : '';
      // 选项已带中文 label 时直接展示，避免回退成内部英文字段键
      if (label && (!value || label !== value)) return label;
      if (value) return resolveSourceFieldLabel(value);
      return label || resolveSourceFieldLabel(String(sourceKey ?? ''));
    },
    [resolveSourceFieldLabel, sourceKey],
  );

  useEffect(() => {
    if (!effectiveEnabled || detailOnly || !auxiliaryIndicatorCensusMode) return;
    const aux = selfIndicatorForConditional?.survey?.auxiliaryCondition;
    if (!aux?.fieldKey?.trim()) return;
    const expected = resolveAuxiliaryConditionSource(aux);
    if (sourceType !== expected.type) {
      form.setFieldValue(['conditionalScoring', 'source', 'type'], expected.type);
    }
    if (sourceKey !== expected.key) {
      form.setFieldValue(['conditionalScoring', 'source', 'key'], expected.key);
    }
  }, [
    effectiveEnabled,
    detailOnly,
    auxiliaryIndicatorCensusMode,
    selfIndicatorForConditional,
    sourceType,
    sourceKey,
    form,
  ]);

  useEffect(() => {
    if (detailOnly || !selfIndicatorForConditional) return;
    if (!effectiveEnabled && !drivenByScoringRuleMode) return;
    // 通用「条件赋分」允许自由切换来源；仅辅助条件工作流强制对齐默认包
    const forceAuxiliaryPackage =
      surveyWatch?.inputVariant === 'auxiliary_then_select' || auxiliaryIndicatorCensusMode;
    if (!forceAuxiliaryPackage) return;
    if (!hasAuxiliaryConditionSurvey(selfIndicatorForConditional)) return;
    const pkg = buildAuxiliaryConditionalPackage(selfIndicatorForConditional);
    const expected = pkg.conditionalScoring;
    const cfg = form.getFieldValue('conditionalScoring') as ConditionalScoringConfig | undefined;
    const branchesAligned =
      (cfg?.branches?.length ?? 0) > 0 &&
      cfg!.branches.every((b, i) => {
        const exp = expected.branches[i];
        if (!exp || !(b.scoreRules?.length ?? 0)) return false;
        return Boolean(b.label?.trim());
      });
    const aligned =
      cfg?.source?.type === expected.source.type &&
      cfg?.source?.key === expected.source.key &&
      branchesAligned;
    if (aligned) return;
    form.setFieldsValue({
      conditionalScoring: {
        ...cfg,
        ...expected,
        enabled: true,
        branches: expected.branches.map((b, i) => ({
          ...b,
          id: b.id || `${idPrefix}-cb${i}`,
          scoreRules: b.scoreRules?.map((r, j) => ({
            ...r,
            id: r.id || `${idPrefix}-cb${i}-r${j}`,
          })),
        })),
      },
    });
  }, [
    effectiveEnabled,
    drivenByScoringRuleMode,
    detailOnly,
    selfIndicatorForConditional,
    surveyWatch?.inputVariant,
    auxiliaryIndicatorCensusMode,
    form,
    idPrefix,
  ]);

  const applyDefaultConditionalScoring = () => {
    if (selfIndicator && hasAuxiliaryConditionSurvey(selfIndicator)) {
      const pkg = buildAuxiliaryConditionalPackage(selfIndicator);
      form.setFieldsValue({
        conditionalScoring: {
          ...pkg.conditionalScoring,
          enabled: true,
          branches: pkg.conditionalScoring.branches.map((b, i) => ({
            ...b,
            id: b.id || `${idPrefix}-cb${i}`,
            scoreRules: b.scoreRules?.map((r, j) => ({
              ...r,
              id: r.id || `${idPrefix}-cb${i}-r${j}`,
            })),
          })),
        },
      });
      return;
    }
    const suggested = selfIndicator ? suggestConditionalScoringForIndicator(selfIndicator) : undefined;
    if (suggested) {
      const branches = suggested.branches.map((b, i) => ({
        ...b,
        id: `${idPrefix}-cb${i}`,
        scoreRules: b.scoreRules?.map((r, j) => ({
          ...r,
          id: `${idPrefix}-cb${i}-r${j}`,
        })),
      }));
      form.setFieldsValue({
        conditionalScoring: { ...suggested, enabled: true, branches },
      });
      return;
    }
    form.setFieldsValue({
      conditionalScoring: {
        enabled: true,
        mode: defaultMode,
        source: isRegion
          ? { type: 'indicator', key: conditionCandidates[0]?.survey.fieldKey ?? undefined }
          : { type: 'appendix_b', key: 'areaImportance' },
        branches: [
          {
            id: `${idPrefix}-cb0`,
            label: '分支 1',
            matchValues: [],
            numericMatch: isRegion ? { kind: 'lte', value: 0 } : undefined,
            scoreRules:
              valueType === 'numeric'
                ? createGenericNumericBranchRules(`${idPrefix}-cb0`)
                : [{ id: `${idPrefix}-cb0-r0`, label: '', riskTier: '低', score: 0 }],
          },
        ],
      },
    });
  };

  const needsConditionalInit = (cfg: ConditionalScoringConfig | undefined): boolean => {
    if (!cfg?.branches?.length) return true;
    return cfg.branches.every(
      b =>
        !(b.matchValues?.length || b.numericMatch) &&
        !(b.scoreRules?.length) &&
        !b.indicatorValueMatch &&
        b.numericThreshold === undefined,
    );
  };

  useEffect(() => {
    if (!drivenByScoringRuleMode || detailOnly) return;
    if (isAuxiliaryScenario && !selfIndicatorForConditional) return;
    const cur = form.getFieldValue('conditionalScoring') as ConditionalScoringConfig | undefined;
    if (isAuxiliaryScenario && selfIndicatorForConditional) {
      const expected = buildAuxiliaryConditionalPackage(selfIndicatorForConditional).conditionalScoring;
      const sourceAligned =
        cur?.source?.type === expected.source.type && cur?.source?.key === expected.source.key;
      const branchesAligned = (cur?.branches?.length ?? 0) > 0;
      if (sourceAligned && branchesAligned) {
        if (!enabledWatch) {
          form.setFieldValue(['conditionalScoring', 'enabled'], true);
        }
        return;
      }
    }
    // 切换「条件来源类型」会清空 key，不应因此整表回退为默认「内涝基本信息」
    const needsInit =
      needsConditionalInit(cur) || !(cur?.branches?.length) || !cur?.source?.type;
    if (!enabledWatch) {
      form.setFieldValue(['conditionalScoring', 'enabled'], true);
    }
    if (needsInit) {
      applyDefaultConditionalScoring();
    }
  }, [
    drivenByScoringRuleMode,
    enabledWatch,
    detailOnly,
    form,
    selfIndicatorForConditional,
    isAuxiliaryScenario,
  ]);

  const sourceTypeOptions = isRegion
    ? [{ value: 'indicator' as const, label: '同组防灾减灾指标' }]
    : [
        { value: 'appendix_b' as const, label: SURVEY_BASIC_INFO_SOURCE_LABEL },
        { value: 'indicator' as const, label: '本点其他指标' },
      ];

  const scoringRuleModeWatch = Form.useWatch('scoringRuleMode', form);
  const compositeSurveyMode =
    scoringRuleModeWatch === 'composite' ||
    surveyWatch?.inputVariant === 'composite_appendix_numeric';

  if (compositeSurveyMode) {
    return (
      <Alert
        type="info"
        showIcon
        message="本指标使用「复合数值赋分」"
        description="本指标已使用「复合数值赋分」，请在赋分规则 Tab 顶部切换模式并配置子项分档。条件赋分与复合数值互斥。"
      />
    );
  }

  return (
    <div className="dq-conditional-scoring-editor">
      {drivenByScoringRuleMode ? (
        <Form.Item name={['conditionalScoring', 'enabled']} valuePropName="checked" hidden>
          <Switch />
        </Form.Item>
      ) : (
        <Form.Item
          name={['conditionalScoring', 'enabled']}
          label="启用条件赋分"
          valuePropName="checked"
          extra={
            isRegion
              ? '防灾减灾为全县统一配置，条件只能引用同组防灾减灾数值型指标。'
              : '仅当本指标需随条件字段切换不同赋分规则时再开启；否则在赋分规则 Tab 选择「统一赋分档」。'
          }
        >
          <Switch
            disabled={detailOnly}
            onChange={checked => {
              if (checked) {
                const cur = form.getFieldValue('conditionalScoring') as ConditionalScoringConfig | undefined;
                if (needsConditionalInit(cur)) {
                  applyDefaultConditionalScoring();
                }
              }
            }}
          />
        </Form.Item>
      )}

      {drivenByScoringRuleMode && isRegion ? (
        <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
          防灾减灾为全县统一配置，条件只能引用同组防灾减灾数值型指标。
        </Text>
      ) : null}

      {auxiliaryAppendixReady && !detailOnly ? (
        <Button
          type="link"
          size="small"
          style={{ paddingLeft: 0, marginTop: -4, marginBottom: 8 }}
          onClick={() => {
            applyDefaultConditionalScoring();
            message.success('已填入建议条件赋分配置');
          }}
        >
          填入建议条件赋分
        </Button>
      ) : null}

      {effectiveEnabled ? (
        <>
          <div className="dq-conditional-scoring-editor__toolbar">
            <Segmented
              value={editorView}
              onChange={v => setEditorView(v as 'form' | 'flow')}
              options={[
                { value: 'form', label: '表单配置', icon: <EditOutlined /> },
                { value: 'flow', label: '流程预览', icon: <NodeIndexOutlined /> },
              ]}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {editorView === 'flow'
                ? '只读总览；修改条件来源、分支与赋分档请切换到「表单配置」'
                : '逐步填写各字段'}
            </Text>
          </div>

          {editorView === 'flow' ? (
            <ConditionalScoringFlowView model={flowModel} />
          ) : null}

          <div
            className={
              editorView === 'flow' ? 'dq-conditional-scoring-editor__form-panel--hidden' : undefined
            }
            aria-hidden={editorView === 'flow'}
          >
          <>
          {isRegion && conditionCandidates.length === 0 ? (
            <Text type="warning" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
              同组尚无其他数值型防灾减灾指标可作条件，请先新增或关闭条件赋分。
            </Text>
          ) : null}
          <Form.Item
            name={['conditionalScoring', 'mode']}
            hidden
            initialValue={defaultMode}
          >
            <Input />
          </Form.Item>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message={
              valueType === 'numeric'
                ? '数值型指标：按条件命中分支后，再按本指标数值区间自动赋分'
                : '下拉分档 / 是·否指标：按条件命中分支后，展示该分支的可选项'
            }
            description={
              valueType === 'numeric'
                ? '「条件分支」只决定采用哪组规则；普查始终填写数值，并在该分支的“本指标数值分档”中自动匹配标准分 F。'
                : '「条件分支」只决定展示哪组选项；普查人员从该分支的“本指标分支选项”中选择，不需要再选择条件赋分方式。'
            }
          />
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item
                name={['conditionalScoring', 'source', 'type']}
                label="条件来源类型"
                rules={[{ required: true }]}
                initialValue={isRegion ? 'indicator' : 'appendix_b'}
                getValueFromEvent={(nextType: ConditionalScoringConfig['source']['type']) =>
                  requestConditionSourceChange({ type: nextType, key: '' })
                    ? nextType
                    : (sourceType ?? (isRegion ? 'indicator' : 'appendix_b'))
                }
              >
                <Select
                  disabled={detailOnly || isRegion || auxiliaryIndicatorCensusMode}
                  options={sourceTypeOptions}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
          {auxiliaryIndicatorCensusMode ? (
            <>
              <Form.Item
                name={['conditionalScoring', 'source', 'key']}
                hidden
                rules={[{ required: true, message: '请选择条件字段' }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                label={formLabelWithHelp(
                  '条件字段',
                  '辅助条件在「指标普查」填报；条件来源已固定为「本点其他指标」下的本项辅助条件。',
                  '条件字段说明',
                )}
                required
              >
                <ConditionFieldReadonlyDisplay
                  fieldKey={sourceKey}
                  aux={selfIndicatorForConditional?.survey?.auxiliaryCondition}
                  applicableTypes={selfIndicatorForConditional?.applicableTypes ?? ['GLOBAL']}
                  resolveLabel={resolveSourceFieldLabel}
                />
              </Form.Item>
            </>
          ) : (
            <Form.Item
              name={['conditionalScoring', 'source', 'key']}
              label={formLabelWithHelp('条件字段', conditionFieldHelp, '条件字段说明')}
              rules={[{ required: true, message: '请选择条件字段' }]}
              getValueFromEvent={(nextKey: string) =>
                requestConditionSourceChange({
                  type: sourceType === 'indicator' || isRegion ? 'indicator' : 'appendix_b',
                  key: nextKey,
                })
                  ? nextKey
                  : sourceKey
              }
            >
              {sourceType === 'indicator' || isRegion ? (
                <Select
                  disabled={detailOnly || conditionFilterIncomplete}
                  placeholder={
                    conditionFilterIncomplete
                      ? '请先选择适用隐患点类型'
                      : mode === 'branch_rules'
                        ? '选择本点其它指标作为条件'
                        : '选择数值型指标作为条件'
                  }
                  options={indicatorOptions}
                  optionFilterProp="label"
                  optionLabelProp="label"
                  labelRender={renderConditionFieldLabel}
                  optionRender={opt => renderConditionFieldLabel(opt.data)}
                  showSearch
                  notFoundContent={
                    <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', lineHeight: 1.5 }}>
                      {conditionIndicatorEmptyHint}
                    </span>
                  }
                />
              ) : (
                <Select
                  disabled={detailOnly}
                  placeholder="选择内涝基本信息中的条件字段"
                  options={appendixConditionFieldOptions}
                  optionFilterProp="label"
                  optionLabelProp="label"
                  labelRender={renderConditionFieldLabel}
                  optionRender={opt => renderConditionFieldLabel(opt.data)}
                  showSearch
                />
              )}
            </Form.Item>
          )}
            </Col>
          </Row>

          <Divider plain style={{ margin: '4px 0 12px' }}>
            <span>
              第一步：配置条件分支
              <FormLabelHelpTip title={branchSectionHelp} ariaLabel="条件分支说明" />
            </span>
          </Divider>

          <Form.List name={['conditionalScoring', 'branches']}>
            {(fields, { add, remove }) => (
              <>
                {fields.map((field, branchIndex) => (
                  <div key={field.key} className="dq-conditional-branch-card">
                    {!detailOnly && (
                      <div className="dq-conditional-branch-card__toolbar">
                        <Button
                          type="link"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => remove(field.name)}
                        >
                          删除分支
                        </Button>
                      </div>
                    )}

                    <Row gutter={16} className="dq-conditional-branch-card__fields">
                      <Col xs={24} sm={12}>
                        <Form.Item
                          name={[field.name, 'label']}
                          label="分支名称"
                          rules={[{ required: true, message: '请填写分支名称' }]}
                        >
                          <Input
                            placeholder={branchIndex === 0 ? '如：条件 A' : `如：条件 ${branchIndex + 1}`}
                            disabled={detailOnly}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        {appendixSourceUsesDiscreteMatch || conditionSourceUsesDiscreteMatch ? (
                          <Form.Item
                            name={[field.name, 'matchValues']}
                            label={formLabelWithHelp(
                              '匹配取值',
                              appendixSourceUsesDiscreteMatch
                                ? `在「${SURVEY_BASIC_INFO_SOURCE_LABEL}」中取哪些值时命中本分支。${MATCH_VALUES_EXCLUSIVE_HELP}`
                                : `选择条件指标的匹配取值。${MATCH_VALUES_EXCLUSIVE_HELP}`,
                              '匹配取值说明',
                            )}
                            rules={[{ required: true, message: '请选择匹配取值' }]}
                          >
                            <Select
                              mode="multiple"
                              disabled={detailOnly}
                              placeholder="选择命中本分支的选项"
                              options={filterExclusiveMatchValueOptions(
                                appendixMatchValueOptions,
                                branchesWatch,
                                branchIndex,
                                form.getFieldValue([
                                  'conditionalScoring',
                                  'branches',
                                  field.name,
                                  'matchValues',
                                ]) as string[] | undefined,
                              )}
                              onChange={values =>
                                handleBranchMatchValuesChange(field.name as number, values as string[])
                              }
                              notFoundContent={
                                sourceKey
                                  ? '无可选匹配项，请检查条件字段或改用「分档列表」方式'
                                  : '请先选择条件字段'
                              }
                            />
                          </Form.Item>
                        ) : (
                          <Form.Item label="数值条件" required>
                            <Space.Compact style={{ width: '100%' }}>
                              <Form.Item
                                name={[field.name, 'numericMatch', 'kind']}
                                noStyle
                                rules={[{ required: true, message: '请选择比较符' }]}
                              >
                                <Select
                                  disabled={detailOnly}
                                  options={NUMERIC_MATCH_OPTIONS}
                                  style={{ width: 72 }}
                                />
                              </Form.Item>
                              <Form.Item
                                name={[field.name, 'numericMatch', 'value']}
                                noStyle
                                rules={[{ required: true, message: '请填写阈值' }]}
                              >
                                <InputNumber
                                  disabled={detailOnly}
                                  placeholder="阈值"
                                  style={{ width: 'calc(100% - 72px)' }}
                                  addonAfter={conditionFieldUnit || undefined}
                                />
                              </Form.Item>
                            </Space.Compact>
                          </Form.Item>
                        )}
                      </Col>
                    </Row>
                    {sourceType === 'appendix_b' &&
                    !isRegion &&
                    sourceKey &&
                    !appendixSourceUsesDiscreteMatch ? (
                      <Text type="secondary" className="dq-conditional-branch-card__hint">
                        按「{SURVEY_BASIC_INFO_SOURCE_LABEL}」专用信息中的数值与阈值比较命中本分支
                      </Text>
                    ) : null}

                    <Form.Item name={[field.name, 'id']} hidden>
                      <Input />
                    </Form.Item>

                    <div className="dq-conditional-branch-card__footer">
                      {(mode === 'branch_threshold' || mode === 'branch_rules') && (
                        <Form.Item
                          label={
                            valueType === 'numeric'
                              ? '第二步：配置本指标数值分档'
                              : '第二步：配置本指标分支选项'
                          }
                          style={{ marginBottom: 0 }}
                        >
                          <Form.List name={[field.name, 'scoreRules']}>
                            {(ruleFields, { add: addRule, remove: removeRule }) => {
                              const limits =
                                numericBranchBandRules
                                  ? getScoreRuleLimits('numeric')
                                  : { min: 1, max: 20 };
                              const atMin = ruleFields.length <= limits.min;
                              const atMax = ruleFields.length >= limits.max;
                              return (
                              <>
                                {numericBranchBandRules ? (
                                  <Row gutter={8} style={{ marginBottom: 4 }}>
                                    <Col span={10}>
                                      <Text type="secondary" style={{ fontSize: 12 }}>
                                        匹配区间（本分支）
                                      </Text>
                                    </Col>
                                    <Col span={4}>
                                      <Text type="secondary" style={{ fontSize: 12 }}>
                                        标准分 F
                                      </Text>
                                    </Col>
                                    <Col span={7}>
                                      <Text type="secondary" style={{ fontSize: 12 }}>
                                        分档描述（展示，可改）
                                      </Text>
                                    </Col>
                                  </Row>
                                ) : null}
                                {ruleFields.map(rf => (
                                  <Row key={rf.key} gutter={8} align="middle" style={{ marginBottom: 8 }}>
                                    {numericBranchBandRules ? (
                                      <Col span={10}>
                                        <NumericScoreRuleMatchFields
                                          field={rf}
                                          disabled={detailOnly}
                                          listPath={[
                                            'conditionalScoring',
                                            'branches',
                                            field.name,
                                            'scoreRules',
                                          ]}
                                          onMatchChange={() =>
                                            syncBranchNumericRuleLabel(field.name, rf.name as number)
                                          }
                                        />
                                      </Col>
                                    ) : (
                                      <Col flex="auto">
                                        <Form.Item
                                          name={[rf.name, 'label']}
                                          rules={[{ required: true, message: '请填写分档描述' }]}
                                          noStyle
                                        >
                                          <Input placeholder="分档描述" disabled={detailOnly} />
                                        </Form.Item>
                                      </Col>
                                    )}
                                    <Col span={numericBranchBandRules ? 4 : undefined} style={numericBranchBandRules ? undefined : { width: 88 }}>
                                      <Form.Item
                                        name={[rf.name, 'score']}
                                        rules={[{ required: true, message: '请填写分值' }]}
                                        noStyle
                                      >
                                        <InputNumber
                                          min={0}
                                          max={1}
                                          step={0.05}
                                          placeholder="分值"
                                          style={{ width: '100%' }}
                                          disabled={detailOnly}
                                        />
                                      </Form.Item>
                                    </Col>
                                    {numericBranchBandRules ? (
                                      <Col span={7}>
                                        <Form.Item
                                          name={[rf.name, 'label']}
                                          rules={[{ required: true, message: '请填写分档描述' }]}
                                          noStyle
                                        >
                                          <Input
                                            placeholder="配置区间后自动生成，可修改"
                                            disabled={detailOnly}
                                          />
                                        </Form.Item>
                                      </Col>
                                    ) : null}
                                    {!detailOnly && (
                                      <Col flex="none">
                                        <Button
                                          type="link"
                                          danger
                                          size="small"
                                          disabled={atMin}
                                          onClick={() => removeRule(rf.name)}
                                        >
                                          删除
                                        </Button>
                                      </Col>
                                    )}
                                    <Form.Item name={[rf.name, 'id']} hidden>
                                      <Input />
                                    </Form.Item>
                                    <Form.Item name={[rf.name, 'riskTier']} hidden>
                                      <Input />
                                    </Form.Item>
                                  </Row>
                                ))}
                                {!detailOnly && (
                                  <Button
                                    type="dashed"
                                    block
                                    size="small"
                                    icon={<PlusOutlined />}
                                    disabled={atMax}
                                    onClick={() => {
                                      const nextIdx = ruleFields.length;
                                      addRule({
                                        id: `${idPrefix}-br${field.name}-r${nextIdx}`,
                                        label: '',
                                        riskTier: '',
                                        score: 0,
                                        numericMatch: { kind: 'lt', value: 0 },
                                      });
                                      syncBranchNumericRuleLabel(field.name, nextIdx);
                                    }}
                                  >
                                    添加赋分档
                                  </Button>
                                )}
                              </>
                              );
                            }}
                          </Form.List>
                        </Form.Item>
                      )}
                    </div>
                  </div>
                ))}
                {!detailOnly && (
                  <Button
                    type="dashed"
                    block
                    icon={<PlusOutlined />}
                    onClick={() =>
                      add({
                        id: `${idPrefix}-cb${fields.length}`,
                        label: `分支 ${fields.length + 1}`,
                        matchValues: [],
                        numericMatch:
                          sourceType === 'indicator' || isRegion
                            ? { kind: 'lte', value: 0 }
                            : undefined,
                        scoreRules:
                          mode === 'branch_threshold' || mode === 'branch_rules'
                            ? valueType === 'numeric'
                              ? createGenericNumericBranchRules(`${idPrefix}-cb${fields.length}`)
                              : [{ id: `${idPrefix}-cb${fields.length}-r0`, label: '', riskTier: '低', score: 0 }]
                            : undefined,
                      })
                    }
                  >
                    添加条件分支
                  </Button>
                )}
              </>
            )}
          </Form.List>

          </>
          </div>
        </>
      ) : null}
    </div>
  );
};
