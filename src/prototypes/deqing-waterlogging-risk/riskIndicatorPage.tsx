import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Form,
  type FormInstance,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
  Tabs,
  Tooltip,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  EyeOutlined,
  CalculatorOutlined,
  ApartmentOutlined,
  TableOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { NumericScoreRuleMatchFields } from './NumericScoreRuleMatchFields';
import {
  enrichNumericRuleLabels,
  formatNumericMatchLabel,
  refreshAutoNumericRuleLabels,
  shouldRefreshNumericRuleLabel,
} from './scoreRuleNumericBands';
import {
  HAZARD_POINT_TYPE_LABEL,
  LEVEL1_FACTOR_LABEL,
  type HazardPointType,
  type IndicatorRiskLevelRow,
  type Level1Factor,
  type Level1Weights,
  type RegionalPreventionConfig,
  type RegionalPreventionRecord,
  type RiskIndicatorRow,
  type ScoreRule,
} from './types';
import { ScorePreviewPage } from './scorePreviewPage';
import { validateSiblingWeights } from './scoreCalculator';
import {
  checkIndicatorDeletable,
  createInitSnapshot,
  getCompareBaseline,
  getIndicatorSource,
  isBuiltinIndicator,
  isIndicatorDataCorrected,
} from './indicatorDefaultCompare';
import { ApplicableTypesHelpTip } from './ApplicableTypesHelpTip';
import { formLabelWithHelp, INDICATOR_CODE_HELP_EDIT } from './FormLabelHelpTip';
import { IndicatorDefaultComparePanel } from './IndicatorDefaultComparePanel';
import { IndicatorTypeTree, INDICATOR_TREE_ALL_KEY } from './IndicatorTypeTree';
import { matchesIndicatorTreeKey } from './indicatorTypeTreeData';
import { getSiblingGroup, isSiblingWeightSumValid, sumSiblingWeights } from './weightBalance';
import {
  VALUE_TYPE_LABEL,
  DEFAULT_BR_AREA_IMPORTANCE_SCORE_RULES,
  createDefaultScoreRulesForValueType,
  getScoreRuleLimits,
  validateScoreRulesForValueType,
} from './indicatorValueTypeUtils';
import {
  defaultApplicableTypesForLevel1,
  formationTypeFromApplicable,
  getFormationTypeSelectOptions,
  isFormationLevel1,
  normalizeApplicableTypes,
} from './indicatorApplicableTypes';
import {
  HAZARD_POINT_TYPE_SELECT_POPUP_PROPS,
  renderHazardPointTypeSelectOption,
} from './hazardPointTypeSelect';
import {
  getLevel1FactorSelectOptions,
  LEVEL1_FACTOR_SELECT_POPUP_PROPS,
  renderLevel1FactorSelectOption,
} from './level1FactorSelect';
import { getIndicatorScoringProfile, getSurveyInputModeExtra } from './indicatorScoringProfile';
import { normalizeIndicatorForEdit } from './indicatorNormalize';
import {
  assignAutoIndicatorCodeToForm,
  generateNextIndicatorCode,
} from './indicatorCodeGenerator';
import { IndicatorSurveyScoringPanel } from './IndicatorSurveyScoringPanel';
import { IndicatorCreateWizard } from './IndicatorCreateWizard';
import { IndicatorSurveyCollectFields } from './IndicatorSurveyCollectFields';
import { IndicatorSurveyFieldKeyFields } from './IndicatorSurveyFieldKeyFields';
import {
  applyIndicatorConfigTemplate,
  buildIndicatorRowFromForm,
  isTemplateCompatibleWithValueType,
  resolveDefaultTemplateForValueType,
  resolveTemplateForRow,
} from './indicatorConfigTemplates';
import { SurveyTablePreviewModal } from './SurveyTablePreviewModal';
import {
  CONFIG_STATUS_COLOR,
  CONFIG_STATUS_LABEL,
  summarizeReadinessForList,
  validateIndicatorConfig,
} from './indicatorConfigReadiness';
import {
  createEmptyConditionalScoring,
  formatConditionalScoringSummary,
  isConditionalScoringEnabled,
  validateConditionalScoring,
} from './conditionalScoring';
import { resolveScoreExplanation } from './scoreExplanation';
import { mergeIndicatorSurveyConfig } from './indicatorSurveyUtils';
import { syncCompositeAggregateScoreRules } from './compositeAggregateScoreRules';
import {
  buildScoringRuleModePatch,
  resolveScoringRuleMode,
  SCORING_RULE_MODE_HINT,
  SCORING_RULE_MODE_LABEL,
} from './scoringRuleMode';
import type { ScoringRuleMode } from './types';
import { validateCompositePartSources } from './compositePartSource';

const { TextArea } = Input;
const { Text } = Typography;

type IndicatorModalTabKey = 'base' | 'survey_scoring' | 'compare';

/** 打开编辑弹窗时的默认 Tab（与是否导则种子无关） */
function defaultModalTabForRow(row: RiskIndicatorRow): IndicatorModalTabKey {
  if (resolveScoringRuleMode(row) !== 'uniform') return 'survey_scoring';
  return 'base';
}

/** 打开编辑弹窗前写入表单：须先 reset，避免 preserve 残留上一指标的说明等 */
function setIndicatorOnForm(
  form: FormInstance,
  row: RiskIndicatorRow,
  allIndicators: RiskIndicatorRow[],
  defaultIndicators: RiskIndicatorRow[],
) {
  const normalized = normalizeIndicatorForEdit(row, allIndicators, defaultIndicators);
  const scoringMode = normalized.scoringRuleMode ?? resolveScoringRuleMode(normalized);
  let scoreRules = normalized.scoreRules.map(r => ({ ...r }));
  if (normalized.valueType === 'numeric' && scoringMode === 'uniform') {
    scoreRules = enrichNumericRuleLabels(scoreRules, { unit: normalized.unit });
  }
  form.resetFields();
  form.setFieldsValue({
    ...normalized,
    remark: normalized.remark ?? '',
    scoreExplanation: resolveScoreExplanation(normalized),
    unit: normalized.unit ?? '',
    applicableTypes: normalizeApplicableTypes(normalized.level1, normalized.applicableTypes),
    scoreRules,
    survey: normalized.survey,
    conditionalScoring: normalized.conditionalScoring,
    scoringRuleMode: normalized.scoringRuleMode ?? resolveScoringRuleMode(normalized),
  });
}
function formatIndicatorFieldLabel(name: (string | number)[]): string {
  const path = name.map(String);
  const head = path[0];
  if (head === 'code') return '指标编码';
  if (head === 'name') return '指标名称';
  if (head === 'level1') return '一级因子';
  if (head === 'applicableTypes') return '适用隐患点类型';
  if (head === 'valueType') return '普查填报方式';
  if (head === 'unit') return '单位';
  if (head === 'survey' && path[1] === 'fieldKey') return '普查字段键';
  if (head === 'scoreRules' && path[2] === 'label') {
    return `赋分档第 ${Number(path[1]) + 1} 项·分档名称`;
  }
  if (head === 'scoreRules' && path[2] === 'tierRef') {
    return `赋分档第 ${Number(path[1]) + 1} 项·分档说明`;
  }
  if (head === 'scoreRules' && path[2] === 'score') {
    return `赋分档第 ${Number(path[1]) + 1} 项·标准分`;
  }
  if (head === 'conditionalScoring') {
    if (path.includes('label')) return '条件赋分·分支名称';
    if (path.includes('matchValues')) return '条件赋分·匹配取值';
    if (path.includes('kind')) return '条件赋分·比较符';
    if (path.includes('value')) return '条件赋分·阈值';
    return '条件赋分配置';
  }
  return path.join('·');
}

function resolveIndicatorFieldTab(name: (string | number)[]): IndicatorModalTabKey {
  const head = String(name[0] ?? '');
  if (head === 'survey' || head === 'scoreRules' || head === 'conditionalScoring') {
    return 'survey_scoring';
  }
  return 'base';
}

function showIndicatorFormValidationErrors(
  errorFields: { name: (string | number)[]; errors: string[] }[],
  setModalTabKey: (tab: IndicatorModalTabKey) => void,
): void {
  if (!errorFields.length) {
    message.warning('请检查表单必填项');
    return;
  }
  setModalTabKey(resolveIndicatorFieldTab(errorFields[0].name));
  const lines = errorFields.slice(0, 8).map(field => {
    const label = formatIndicatorFieldLabel(field.name);
    const detail = field.errors[0]?.trim();
    return detail && !detail.includes(label) ? `${label}：${detail}` : detail || label;
  });
  message.error({
    content: (
      <div>
        <div style={{ marginBottom: 6 }}>请完善以下内容后再保存：</div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {lines.map(line => (
            <li key={line} style={{ marginBottom: 4 }}>
              {line}
            </li>
          ))}
        </ul>
        {errorFields.length > 8 ? (
          <div style={{ marginTop: 6, color: 'rgba(0,0,0,0.45)' }}>
            另有 {errorFields.length - 8} 项未列出，请切换 Tab 查看标红字段
          </div>
        ) : null}
      </div>
    ),
    duration: 8,
  });
}

/** 从表单合并结果读取可选文本：字段存在时以表单为准（含清空），否则回退编辑前快照 */
function readOptionalTextField(
  allValues: Record<string, unknown>,
  values: Record<string, unknown>,
  key: string,
  fallback?: string,
): string | undefined {
  if (Object.prototype.hasOwnProperty.call(values, key)) {
    const raw = values[key];
    return raw === undefined || raw === null ? undefined : String(raw).trim() || undefined;
  }
  if (Object.prototype.hasOwnProperty.call(allValues, key)) {
    const raw = allValues[key];
    return raw === undefined || raw === null ? undefined : String(raw).trim() || undefined;
  }
  return fallback;
}

interface Props {
  indicators: RiskIndicatorRow[];
  defaultIndicators: RiskIndicatorRow[];
  onChange: (rows: RiskIndicatorRow[]) => void;
  indicatorLevels: IndicatorRiskLevelRow[];
  level1Weights: Level1Weights;
  regionalPrevention: RegionalPreventionConfig | null;
  activePreventionRecord: RegionalPreventionRecord | null;
  /** editMode：为 true 时进入架构图编辑模式（调权重/启用）；默认只读浏览 */
  onOpenArchitecture?: (options?: { editMode?: boolean }) => void;
}

export const RiskIndicatorPage: React.FC<Props> = ({
  indicators,
  defaultIndicators,
  onChange,
  indicatorLevels,
  level1Weights,
  regionalPrevention,
  activePreventionRecord,
  onOpenArchitecture,
}) => {
  const [keyword, setKeyword] = useState('');
  const [treeSelectedKey, setTreeSelectedKey] = useState(INDICATOR_TREE_ALL_KEY);
  const [enabledFilter, setEnabledFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [tablePreviewOpen, setTablePreviewOpen] = useState(false);
  const [scorePreviewOpen, setScorePreviewOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [createWizardOpen, setCreateWizardOpen] = useState(false);
  const [postSaveGuideOpen, setPostSaveGuideOpen] = useState(false);
  const [modalTabKey, setModalTabKey] = useState<IndicatorModalTabKey>('base');
  const [editing, setEditing] = useState<RiskIndicatorRow | null>(null);
  const [detailOnly, setDetailOnly] = useState(false);
  const [form] = Form.useForm();
  const valueTypeWatch = Form.useWatch('valueType', form) as RiskIndicatorRow['valueType'] | undefined;
  const unitWatch = Form.useWatch('unit', form) as string | undefined;
  const scoringRuleModeWatch = Form.useWatch('scoringRuleMode', form);
  const codeWatch = Form.useWatch('code', form) as string | undefined;
  const level1Watch = Form.useWatch('level1', form) as RiskIndicatorRow['level1'] | undefined;

  const surveyWatch = Form.useWatch('survey', form) as RiskIndicatorRow['survey'] | undefined;
  const surveyInputVariant = surveyWatch?.inputVariant;
  const compositeSurveyMode = useMemo(() => {
    if (surveyInputVariant === 'composite_appendix_numeric') return true;
    if (surveyWatch?.appendixBSurveyParts?.length) return true;
    const seed = defaultIndicators.find(i => i.code === codeWatch);
    return seed?.survey?.inputVariant === 'composite_appendix_numeric';
  }, [surveyInputVariant, surveyWatch?.appendixBSurveyParts, codeWatch, defaultIndicators]);
  const conditionalEnabled = Form.useWatch(['conditionalScoring', 'enabled'], form) as boolean | undefined;
  const conditionalMode = Form.useWatch(['conditionalScoring', 'mode'], form) as
    | 'branch_threshold'
    | 'branch_rules'
    | undefined;

  /** 数值统一赋分：单位变更时，将仍为自动生成的分档描述补上单位 */
  useEffect(() => {
    if (valueTypeWatch !== 'numeric') return;
    const mode = resolveScoringRuleMode({
      scoringRuleMode: scoringRuleModeWatch,
      survey:
        surveyWatch ?? { collectInSurvey: true, surveyRequired: false, fieldKey: codeWatch ?? '' },
      conditionalScoring: form.getFieldValue('conditionalScoring'),
    });
    if (mode !== 'uniform') return;
    const rules = (form.getFieldValue('scoreRules') ?? []) as ScoreRule[];
    if (!rules.some(r => r.numericMatch)) return;
    const unit = String(form.getFieldValue('unit') ?? unitWatch ?? '').trim() || undefined;
    const next = refreshAutoNumericRuleLabels(rules, { unit });
    if (next.some((r, i) => r.label !== rules[i]?.label)) {
      form.setFieldValue('scoreRules', next);
    }
  }, [unitWatch, valueTypeWatch, scoringRuleModeWatch, surveyWatch, codeWatch, form]);

  const conditionalSurveyScope = useMemo<'point' | 'region'>(
    () => (level1Watch === 'PREVENTION' ? 'region' : 'point'),
    [level1Watch],
  );

  const getBaseline = (row: RiskIndicatorRow) => getCompareBaseline(row, defaultIndicators);

  const applyBrAreaDefaultRulesIfNeeded = (code?: string, valueType?: RiskIndicatorRow['valueType']) => {
    if (code !== 'BR_AREA_IMPORTANCE' || valueType !== 'enum') return false;
    const current: ScoreRule[] = form.getFieldValue('scoreRules') ?? [];
    const onlyEmpty =
      current.length === 0 ||
      (current.length === 1 && !String(current[0]?.label ?? '').trim());
    if (!onlyEmpty) return false;
    form.setFieldsValue({
      scoreRules: createDefaultScoreRulesForValueType('enum', editing?.id ?? 'new', code),
    });
    return true;
  };

  const handleValueTypeChange = (next: RiskIndicatorRow['valueType']) => {
    const limits = getScoreRuleLimits(next);
    const current: ScoreRule[] = form.getFieldValue('scoreRules') ?? [];
    const code = form.getFieldValue('code') as string | undefined;
    const draft = buildIndicatorRowFromForm(form, editing);
    const currentTemplate = resolveTemplateForRow(draft) ?? 'enum_uniform';
    if (!isTemplateCompatibleWithValueType(currentTemplate, next)) {
      const tpl = resolveDefaultTemplateForValueType(next);
      applyIndicatorConfigTemplate(form, tpl, {
        code,
        idPrefix: editing?.id ?? 'new',
      });
      form.setFieldValue('configTemplateId', tpl);
      const tplTitle =
        tpl === 'numeric_uniform' ? '数值分档' : tpl === 'boolean_uniform' ? '是/否' : '下拉选档';
      message.info(`填报与赋分场景已同步为「${tplTitle}」`);
    }
    if (current.length < limits.min || current.length > limits.max) {
      form.setFieldsValue({
        scoreRules: createDefaultScoreRulesForValueType(next, editing?.id ?? 'new', code),
      });
      message.info(
        next === 'boolean'
          ? '布尔型固定 2 档赋分，已重置为默认两档；保存后普查将变为「是/否」'
          : `已按「${VALUE_TYPE_LABEL[next]}」调整赋分档数量，请保存后生效`,
      );
    } else if (next === 'boolean') {
      message.info('保存后，内涝普查定级/防灾减灾指标信息中该指标将显示为「是/否」');
    } else if (applyBrAreaDefaultRulesIfNeeded(code, next)) {
      message.info('已填入「地区重要性」默认四档赋分');
    }
  };

  const handleLevel1Change = (level1: RiskIndicatorRow['level1']) => {
    const survey = (form.getFieldValue('survey') as RiskIndicatorRow['survey'] | undefined) ?? {};
    form.setFieldsValue({
      applicableTypes: defaultApplicableTypesForLevel1(level1),
      survey: { ...survey, scope: level1 === 'PREVENTION' ? 'region' : 'point' },
    });
  };

  const restoreDefault = (row: RiskIndicatorRow) => {
    const baseline = getBaseline(row);
    if (!baseline) {
      message.warning('请先保存为预置，或该指标无可恢复的初始化默认值');
      return;
    }
    const restored = {
      ...baseline,
      id: row.id,
      initSnapshot: row.initSnapshot,
      conditionalScoring: row.conditionalScoring,
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };
    onChange(indicators.map(i => (i.id === row.id ? restored : i)));
    message.success(
      isBuiltinIndicator(row, defaultIndicators) ? '已恢复为初始化默认值' : '已恢复为预置值',
    );
    if (editing?.id === row.id) {
      setEditing(restored);
      setIndicatorOnForm(form, restored, indicators, defaultIndicators);
    }
  };

  const saveAsInitPreset = (row: RiskIndicatorRow) => {
    const snapshot = createInitSnapshot(row);
    const next = { ...row, initSnapshot: snapshot };
    onChange(indicators.map(i => (i.id === row.id ? next : i)));
    message.success('已保存为预置，可作为初始化默认值参与对比');
    if (editing?.id === row.id) {
      setEditing(next);
    }
  };

  const resetModalForm = () => {
    if (!editing) {
      form.resetFields();
      form.setFieldsValue({
        valueType: 'enum',
        applicableTypes: ['GLOBAL'],
        level1: 'HAZARD',
        weight: 0.1,
        remark: '',
        scoreExplanation: '',
        scoreRules: [{ label: '', riskTier: '', score: 0 }],
        survey: { collectInSurvey: true, surveyRequired: false, fieldKey: '' },
      });
      message.success('已恢复为默认填写项');
      return;
    }
    const baseline = getBaseline(editing);
    if (!baseline) {
      message.warning('新增指标请先保存为预置，或无可恢复的初始化默认值');
      return;
    }
    const restored = {
      ...baseline,
      id: editing.id,
      initSnapshot: editing.initSnapshot,
      conditionalScoring: editing.conditionalScoring,
      scoreRules: baseline.scoreRules.map(r => ({ ...r })),
    };
    setEditing(restored);
    setIndicatorOnForm(form, restored, indicators, defaultIndicators);
    message.success('已恢复为初始化默认值，点击保存后生效');
  };

  const filtered = useMemo(() => {
    return indicators.filter(row => {
      if (!matchesIndicatorTreeKey(row, treeSelectedKey)) return false;
      if (enabledFilter === 'yes' && !row.enabled) return false;
      if (enabledFilter === 'no' && row.enabled) return false;
      if (keyword.trim()) {
        const k = keyword.trim().toLowerCase();
        if (!row.name.toLowerCase().includes(k) && !row.code.toLowerCase().includes(k)) return false;
      }
      return true;
    });
  }, [indicators, keyword, treeSelectedKey, enabledFilter]);

  const treeGroupWeightHint = useMemo(() => {
    if (treeSelectedKey === INDICATOR_TREE_ALL_KEY) return null;
    let level1: Level1Factor;
    let formationType: HazardPointType | undefined;
    if (treeSelectedKey.includes(':')) {
      const [l1, pt] = treeSelectedKey.split(':') as [Level1Factor, HazardPointType];
      level1 = l1;
      formationType = pt;
    } else {
      level1 = treeSelectedKey as Level1Factor;
    }
    const group = getSiblingGroup(indicators, level1, formationType);
    const sum = sumSiblingWeights(group);
    return { sum, valid: isSiblingWeightSumValid(sum), count: group.length };
  }, [indicators, treeSelectedKey]);

  const openCreate = () => {
    setEditing(null);
    setDetailOnly(false);
    form.resetFields();
    const level1: Level1Factor = 'HAZARD';
    const code = generateNextIndicatorCode(indicators, level1);
    form.setFieldsValue({
      valueType: 'enum',
      applicableTypes: ['GLOBAL'],
      level1,
      code,
      weight: 0,
      remark: '',
      scoreExplanation: '',
      scoreRules: [],
      conditionalScoring: createEmptyConditionalScoring(),
      scoringRuleMode: 'uniform',
      survey: {
        collectInSurvey: true,
        surveyRequired: false,
        fieldKey: code,
        inputVariant: 'default',
      },
      _autoCodePrev: code,
    });
    setCreateWizardOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    form.resetFields();
  };

  const openEdit = (row: RiskIndicatorRow, readonly = false) => {
    setEditing(row);
    setDetailOnly(readonly);
    setIndicatorOnForm(form, row, indicators, defaultIndicators);
    setModalTabKey(defaultModalTabForRow(row));
    setModalOpen(true);
  };

  const handleSave = async () => {
    let code = String(form.getFieldValue('code') ?? '').trim();
    if (!editing) {
      const level1 = (form.getFieldValue('level1') as Level1Factor | undefined) ?? 'HAZARD';
      if (!code) {
        code = generateNextIndicatorCode(indicators, level1);
        form.setFieldValue('code', code);
      } else if (indicators.some(i => i.code === code)) {
        code = generateNextIndicatorCode(indicators, level1, code);
        form.setFieldValue('code', code);
      }
    }
    const surveyFieldKey = String(form.getFieldValue(['survey', 'fieldKey']) ?? '').trim();
    if (code && !surveyFieldKey) {
      form.setFieldValue(['survey', 'fieldKey'], code);
    }

    let values: Awaited<ReturnType<typeof form.validateFields>>;
    try {
      values = await form.validateFields();
    } catch (err) {
      const errorFields = (err as { errorFields?: { name: (string | number)[]; errors: string[] }[] })
        ?.errorFields;
      if (errorFields?.length) {
        showIndicatorFormValidationErrors(errorFields, setModalTabKey);
      } else {
        message.warning('请检查表单必填项');
      }
      return;
    }
    // 未切换到的 Tab 可能未挂载，validateFields 不含其字段；合并全量取值与编辑前快照，避免说明等被清空
    const allValues = form.getFieldsValue(true) as typeof values;
    const merged = { ...editing, ...allValues, ...values } as typeof values;
    const scoreRulesSource =
      (allValues.scoreRules?.length ? allValues.scoreRules : null) ??
      (values.scoreRules?.length ? values.scoreRules : null) ??
      editing?.scoreRules ??
      [];
    const scoreRules: ScoreRule[] = scoreRulesSource.map((r: ScoreRule, i: number) => ({
      ...r,
      id: r.id || `rule-${Date.now()}-${i}`,
    }));
    const surveyBaseline =
      (editing && indicators.find(i => i.id === editing.id || i.code === editing.code)) ||
      defaultIndicators.find(i => i.code === merged.code);
    const surveySource = mergeIndicatorSurveyConfig(
      {
        ...(editing ?? {}),
        ...merged,
        code: merged.code,
        level1: merged.level1,
        survey:
          merged.survey ??
          editing?.survey ?? { collectInSurvey: true, surveyRequired: false, fieldKey: merged.code },
      } as RiskIndicatorRow,
      surveyBaseline ?? editing ?? undefined,
    );
    const conditionalScoring =
      merged.conditionalScoring ?? editing?.conditionalScoring ?? createEmptyConditionalScoring();
    const draftRow = {
      ...merged,
      code: merged.code,
      survey: surveySource,
      scoreRules,
      conditionalScoring,
      scoringRuleMode: (allValues.scoringRuleMode ?? merged.scoringRuleMode) as ScoringRuleMode | undefined,
    } as RiskIndicatorRow;
    const scoringRuleMode = resolveScoringRuleMode(draftRow);
    const modePatch = buildScoringRuleModePatch(draftRow, scoringRuleMode);
    const syncedSurvey = { ...draftRow.survey, ...modePatch.survey };
    const syncedConditional = modePatch.conditionalScoring ?? conditionalScoring;
    const syncedDraftRow = {
      ...draftRow,
      scoringRuleMode: modePatch.scoringRuleMode,
      survey: syncedSurvey,
      conditionalScoring: syncedConditional,
    } as RiskIndicatorRow;
    const withAggregate = syncCompositeAggregateScoreRules(syncedDraftRow);
    if (modePatch.scoringRuleMode === 'composite') {
      const compositeErr = validateCompositePartSources(
        withAggregate.survey?.appendixBSurveyParts,
        withAggregate.survey?.fieldKey ?? merged.code,
      );
      if (compositeErr) {
        setModalTabKey('survey_scoring');
        message.error(compositeErr);
        return;
      }
    }
    const finalScoreRules: ScoreRule[] = withAggregate.scoreRules.map((r: ScoreRule, i: number) => ({
      ...r,
      id: r.id || `rule-${Date.now()}-${i}`,
    }));
    const rulesError = validateScoreRulesForValueType(
      merged.valueType,
      finalScoreRules,
      merged.code,
      syncedConditional,
      withAggregate,
      indicators,
    );
    if (rulesError) {
      setModalTabKey('survey_scoring');
      message.error(rulesError);
      return;
    }
    const readiness = validateIndicatorConfig(withAggregate, indicators);
    if (!readiness.ok) {
      setModalTabKey('survey_scoring');
      message.error(readiness.blockers[0] ?? '配置不完整');
      return;
    }
    const remark = readOptionalTextField(allValues, values, 'remark', editing?.remark);
    const scoreExplanation =
      readOptionalTextField(allValues, values, 'scoreExplanation', editing?.scoreExplanation) ??
      resolveScoreExplanation(withAggregate);
    const row: RiskIndicatorRow = {
      id: editing?.id ?? `ind-${Date.now()}`,
      code: merged.code,
      name: merged.name,
      level1: merged.level1,
      applicableTypes: normalizeApplicableTypes(merged.level1, merged.applicableTypes),
      weight: editing?.weight ?? merged.weight ?? 0.1,
      valueType: merged.valueType,
      unit: merged.valueType === 'numeric' ? merged.unit : undefined,
      remark,
      scoreExplanation,
      // 启用/停用仅在指标架构图中调整；新建指标默认停用
      enabled: editing?.enabled ?? false,
      scoreRules: finalScoreRules,
      scoringRuleMode: modePatch.scoringRuleMode,
      conditionalScoring: syncedConditional,
      survey: syncedSurvey,
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      initSnapshot: editing?.initSnapshot,
    };

    const next = editing
      ? indicators.map(i => (i.id === editing.id ? row : i))
      : [...indicators, row];

    const hazardForCheck = isFormationLevel1(row.level1)
      ? formationTypeFromApplicable(row.applicableTypes)
      : undefined;
    const { valid, sum } = validateSiblingWeights(next, row.level1, hazardForCheck);
    if (!valid) {
      message.warning(`同级指标权重合计为 ${sum.toFixed(3)}，建议调整为 1.000`);
    }

    onChange(next);
    const wasCreate = !editing;
    message.success(editing ? '更新成功' : '新增成功');
    closeModal();
    setCreateWizardOpen(false);
    if (wasCreate) {
      setPostSaveGuideOpen(true);
    }
  };

  const resolveEditingRow = (): RiskIndicatorRow | null => {
    if (!editing) return null;
    return indicators.find(i => i.id === editing.id) ?? editing;
  };

  const handleDelete = (row: RiskIndicatorRow) => {
    const check = checkIndicatorDeletable(row, defaultIndicators);
    if (!check.allowed) {
      message.warning(check.reason);
      return;
    }
    onChange(indicators.filter(i => i.id !== row.id));
    message.success('删除成功');
    closeModal();
  };

  const renderEditModalDelete = () => {
    const row = resolveEditingRow();
    if (!row || detailOnly || isBuiltinIndicator(row, defaultIndicators)) return null;
    const deleteCheck = checkIndicatorDeletable(row, defaultIndicators);
    if (deleteCheck.allowed) {
      return (
        <Popconfirm
          key="delete"
          title="确认删除该指标？"
          description="删除后不可恢复，请确认该指标已停用且不再参与定级。"
          onConfirm={() => handleDelete(row)}
          okText="删除"
          okButtonProps={{ danger: true }}
          cancelText="取消"
        >
          <Button danger>删除指标</Button>
        </Popconfirm>
      );
    }
    return (
      <Tooltip key="delete" title={deleteCheck.reason}>
        <Button danger disabled>
          删除指标
        </Button>
      </Tooltip>
    );
  };

  const goConfigureInArchitecture = () => {
    message.info('请在指标架构图中切换启用/停用并调整同级权重后保存');
    onOpenArchitecture?.({ editMode: true });
  };

  const scoringRuleModeTagColor: Record<ScoringRuleMode, string> = {
    uniform: 'default',
    conditional: 'processing',
    composite: 'geekblue',
  };

  const syncAllNumericRuleLabels = () => {
    const rules = (form.getFieldValue('scoreRules') ?? []) as ScoreRule[];
    const unit = String(form.getFieldValue('unit') ?? unitWatch ?? '').trim() || undefined;
    form.setFieldValue('scoreRules', refreshAutoNumericRuleLabels(rules, { unit }));
  };

  /** 数值统一赋分：分档描述为空或仍为自动生成时，按匹配区间与单位刷新 */
  const syncNumericRuleLabel = (ruleIndex: number) => {
    queueMicrotask(() => {
      const rules = (form.getFieldValue('scoreRules') ?? []) as ScoreRule[];
      const rule = rules[ruleIndex];
      if (!rule?.numericMatch) return;
      const unit = String(form.getFieldValue('unit') ?? unitWatch ?? '').trim() || undefined;
      if (!shouldRefreshNumericRuleLabel(rule, unit)) return;
      const auto = formatNumericMatchLabel(rule.numericMatch, { unit });
      if (!auto || auto === rule.label) return;
      form.setFieldValue(
        'scoreRules',
        rules.map((r, i) => (i === ruleIndex ? { ...r, label: auto } : r)),
      );
    });
  };

  const scoreRulesSection = (
    <Form.List name="scoreRules">
      {(fields, { add, remove }) => {
        const limits = valueTypeWatch ? getScoreRuleLimits(valueTypeWatch) : { min: 1, max: 20 };
        const atMax = fields.length >= limits.max;
        const atMin = fields.length <= limits.min;
        const isBoolean = valueTypeWatch === 'boolean';
        const isNumericUniform =
          valueTypeWatch === 'numeric' &&
          resolveScoringRuleMode({
            scoringRuleMode: form.getFieldValue('scoringRuleMode'),
            survey:
              surveyWatch ?? { collectInSurvey: true, surveyRequired: false, fieldKey: codeWatch ?? '' },
            conditionalScoring: form.getFieldValue('conditionalScoring'),
          }) === 'uniform';
        const scoringMode = resolveScoringRuleMode({
          scoringRuleMode: form.getFieldValue('scoringRuleMode'),
          survey:
            surveyWatch ?? { collectInSurvey: true, surveyRequired: false, fieldKey: codeWatch ?? '' },
          conditionalScoring: form.getFieldValue('conditionalScoring'),
        });
        const isCompositeMode = scoringMode === 'composite';
        const isEnumUniform =
          valueTypeWatch === 'enum' && scoringMode === 'uniform' && !isBoolean;
        const aggregatePlaceholders = ['低风险（聚合后）', '中风险（聚合后）', '高风险（聚合后）'];
        return (
          <>
            {isNumericUniform && !isCompositeMode ? (
              <Row gutter={8} style={{ marginBottom: 4 }}>
                <Col span={10}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    匹配区间（按填报值）
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
            {isEnumUniform && !isCompositeMode ? (
              <Row gutter={8} style={{ marginBottom: 4 }}>
                <Col span={5}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    分档名称（普查选项）
                  </Text>
                </Col>
                <Col span={4}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    标准分 F
                  </Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    分档说明（选填，普查下拉附注）
                  </Text>
                </Col>
              </Row>
            ) : null}
            {fields.map((field, index) => (
              <Row key={field.key} gutter={8} align="middle" style={{ marginBottom: 8 }}>
                <Form.Item {...field} name={[field.name, 'riskTier']} hidden>
                  <Input />
                </Form.Item>
                {isNumericUniform && !isCompositeMode ? (
                  <Col span={10}>
                    <NumericScoreRuleMatchFields
                      field={field}
                      disabled={detailOnly}
                      onMatchChange={() => syncNumericRuleLabel(field.name as number)}
                    />
                  </Col>
                ) : null}
                {isNumericUniform && !isCompositeMode ? (
                  <>
                    <Col span={4}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'score']}
                        rules={[{ required: true, message: '请填写标准分' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber
                          min={0}
                          max={1}
                          step={0.05}
                          style={{ width: '100%' }}
                          placeholder="标准分"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={7}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'label']}
                        rules={[{ required: true, message: '请填写分档描述' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input placeholder="配置区间后自动生成，可修改" />
                      </Form.Item>
                    </Col>
                  </>
                ) : isEnumUniform && !isCompositeMode ? (
                  <>
                    <Col span={5}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'label']}
                        rules={[{ required: true, message: '请填写分档名称' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input placeholder="如：较低" disabled={detailOnly} />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'score']}
                        rules={[{ required: true, message: '请填写标准分' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber
                          min={0}
                          max={1}
                          step={0.05}
                          style={{ width: '100%' }}
                          placeholder="标准分"
                          disabled={detailOnly}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item {...field} name={[field.name, 'tierRef']} style={{ marginBottom: 0 }}>
                        <Input placeholder="选填：该档判定参考，普查下拉展示" disabled={detailOnly} />
                      </Form.Item>
                    </Col>
                  </>
                ) : (
                  <>
                    <Col span={14}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'label']}
                        rules={[{ required: true, message: '请填写分档描述' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input
                          placeholder={
                            isCompositeMode
                              ? aggregatePlaceholders[index] ?? '聚合结果说明'
                              : isBoolean
                                ? index === 0
                                  ? '否侧描述'
                                  : '是侧描述'
                                : '分档描述（标准表述）'
                          }
                        />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'score']}
                        rules={[{ required: true, message: '请填写标准分' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber
                          min={0}
                          max={1}
                          step={isBoolean ? 1 : 0.05}
                          style={{ width: '100%' }}
                          placeholder={isBoolean ? (index === 0 ? '0' : '1') : '标准分'}
                        />
                      </Form.Item>
                    </Col>
                  </>
                )}
                <Col span={3}>
                  {!detailOnly && !isCompositeMode ? (
                    <Button type="link" danger disabled={atMin} onClick={() => remove(field.name)}>
                      删除
                    </Button>
                  ) : null}
                </Col>
              </Row>
            ))}
            {!detailOnly && !isCompositeMode ? (
              <Button
                type="dashed"
                block
                disabled={atMax}
                onClick={() =>
                  add(
                    isNumericUniform
                      ? {
                          label: '',
                          riskTier: '',
                          score: 0,
                          numericMatch: { kind: 'lt', value: 0 },
                        }
                      : isEnumUniform
                        ? { label: '', riskTier: '', score: 0, tierRef: '' }
                        : { label: '', riskTier: '', score: 0 },
                  )
                }
              >
                {isBoolean ? '布尔型固定 2 档，不可再添加' : '添加赋分档'}
              </Button>
            ) : null}
          </>
        );
      }}
    </Form.List>
  );

  const columns: ColumnsType<RiskIndicatorRow> = [
    { title: '指标编码', dataIndex: 'code', width: 160, ellipsis: true },
    {
      title: '指标名称',
      dataIndex: 'name',
      width: 200,
      ellipsis: true,
      render: (name: string) => (
        <Text ellipsis={{ tooltip: name }} style={{ maxWidth: '100%' }}>
          {name}
        </Text>
      ),
    },
    {
      title: '赋分规则',
      width: 112,
      render: (_, row) => {
        const mode = resolveScoringRuleMode(row);
        const label = SCORING_RULE_MODE_LABEL[mode];
        const tip =
          mode === 'conditional' && isConditionalScoringEnabled(row)
            ? formatConditionalScoringSummary(row, indicators).join('\n')
            : SCORING_RULE_MODE_HINT[mode];
        return (
          <Tooltip title={tip}>
            <Tag
              bordered={false}
              color={scoringRuleModeTagColor[mode]}
              style={{ margin: 0, fontSize: 11, maxWidth: '100%' }}
            >
              <span className="dq-indicator-table-nowrap">{label}</span>
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: '一级因子',
      dataIndex: 'level1',
      width: 130,
      render: (v: Level1Factor) => LEVEL1_FACTOR_LABEL[v],
    },
    {
      title: '适用类型',
      dataIndex: 'applicableTypes',
      width: 200,
      ellipsis: true,
      render: (types: HazardPointType[]) => {
        const text = types.map(t => HAZARD_POINT_TYPE_LABEL[t]).join('、');
        return (
          <Text ellipsis={{ tooltip: text }} style={{ maxWidth: '100%' }}>
            {text}
          </Text>
        );
      },
    },
    {
      title: '权重',
      dataIndex: 'weight',
      width: 80,
      render: (w: number) => w.toFixed(3),
    },
    {
      title: '值类型',
      dataIndex: 'valueType',
      width: 88,
      render: (v: RiskIndicatorRow['valueType']) => (
        <Tag bordered={false} style={{ margin: 0 }}>
          {VALUE_TYPE_LABEL[v]}
        </Tag>
      ),
    },
    {
      title: '赋分档',
      width: 80,
      render: (_, r) => {
        const limits = getScoreRuleLimits(r.valueType);
        const n = r.scoreRules.length;
        const ok = n >= limits.min && n <= limits.max;
        return (
          <Tooltip title={`${limits.min === limits.max ? `须 ${limits.min} 档` : `${limits.min}～${limits.max} 档`}`}>
            <span style={{ color: ok ? undefined : '#ff4d4f' }}>{n}</span>
          </Tooltip>
        );
      },
    },
    {
      title: '配置状态',
      width: 88,
      render: (_, row) => {
        const { status, tooltip } = summarizeReadinessForList(row, indicators);
        return (
          <Tooltip title={tooltip}>
            <Tag bordered={false} color={CONFIG_STATUS_COLOR[status]} style={{ margin: 0 }}>
              {CONFIG_STATUS_LABEL[status]}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: '数据状态',
      width: 88,
      render: (_, row) => {
        const corrected = isIndicatorDataCorrected(row, defaultIndicators);
        return corrected ? (
          <Tag bordered={false} color="orange" style={{ margin: 0 }}>
            修正
          </Tag>
        ) : (
          <Tag bordered={false} style={{ margin: 0 }}>
            默认
          </Tag>
        );
      },
    },
    {
      title: '启用状态',
      dataIndex: 'enabled',
      width: 88,
      render: (enabled: boolean) =>
        enabled ? (
          <Tag bordered={false} color="success" style={{ margin: 0 }}>
            启用
          </Tag>
        ) : (
          <Tag bordered={false} color="warning" style={{ margin: 0 }}>
            停用
          </Tag>
        ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 168,
      render: (v: string) => (
        <span className="dq-indicator-table-nowrap" title={v}>
          {v}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'op',
      width: 168,
      fixed: 'right',
      render: (_, row) => (
        <Space size={4} wrap={false} align="center">
          <Button type="link" size="small" icon={<EyeOutlined />} className="action-btn" onClick={() => openEdit(row, true)}>
            详情
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} className="action-btn" onClick={() => openEdit(row)}>
            编辑
          </Button>
          <Tooltip
            title={`请在指标架构图中${row.enabled ? '停用' : '启用'}该指标，并调整同级权重后保存`}
          >
            <Button
              type="link"
              size="small"
              className={`action-btn ${row.enabled ? 'dq-action-disable' : 'dq-action-enable'}`}
              onClick={goConfigureInArchitecture}
            >
              {row.enabled ? '停用' : '启用'}
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="dq-risk-page dq-indicator-page">
      <div className="dq-indicator-layout">
        <Card className="dq-indicator-tree-card" bordered={false}>
          <IndicatorTypeTree
            indicators={indicators}
            selectedKey={treeSelectedKey}
            onSelect={setTreeSelectedKey}
          />
        </Card>

        <div className="dq-indicator-main">
          <Card className="filter-card" bordered={false}>
            {treeGroupWeightHint && (
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary">当前筛选组二级权重合计：</Text>
                <Tag color={treeGroupWeightHint.valid ? 'success' : 'warning'}>
                  {treeGroupWeightHint.sum.toFixed(3)} / 1.000（{treeGroupWeightHint.count} 项）
                </Tag>
                {!treeGroupWeightHint.valid && onOpenArchitecture && (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => onOpenArchitecture({ editMode: true })}
                  >
                    前往架构图调整
                  </Button>
                )}
              </div>
            )}
            <Row gutter={[12, 12]} align="middle">
              <Col xs={24} sm={12} md={8}>
                <Input
                  placeholder="指标名称/编码"
                  allowClear
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  onPressEnter={() => undefined}
                />
              </Col>
              <Col xs={24} sm={12} md={5}>
                <Select
                  style={{ width: '100%' }}
                  value={enabledFilter}
                  onChange={setEnabledFilter}
                  options={[
                    { value: 'all', label: '全部状态' },
                    { value: 'yes', label: '启用' },
                    { value: 'no', label: '停用' },
                  ]}
                />
              </Col>
              <Col flex="auto" style={{ textAlign: 'right' }}>
                <Space wrap>
                  <Button type="primary" icon={<SearchOutlined />} className="search-btn">
                    查询
                  </Button>
                  <Button
                    onClick={() => {
                      setKeyword('');
                      setTreeSelectedKey(INDICATOR_TREE_ALL_KEY);
                      setEnabledFilter('all');
                    }}
                  >
                    重置
                  </Button>
                  <Button type="primary" icon={<PlusOutlined />} className="add-btn" onClick={openCreate}>
                    新增
                  </Button>
                  {onOpenArchitecture && (
                    <Button icon={<ApartmentOutlined />} onClick={() => onOpenArchitecture()}>
                      指标架构图
                    </Button>
                  )}
                  <Button icon={<TableOutlined />} onClick={() => setTablePreviewOpen(true)}>
                    表格预览
                  </Button>
                  <Button icon={<CalculatorOutlined />} onClick={() => setScorePreviewOpen(true)}>
                    内涝等级试算
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>

          <Card bordered={false} style={{ marginTop: 12 }}>
            <Table
              rowKey="id"
              size="small"
              className="dq-indicator-table"
              scroll={{ x: 1524 }}
              columns={columns}
              dataSource={filtered}
              pagination={{ pageSize: 10, showSizeChanger: true, showTotal: t => `共 ${t} 条` }}
            />
          </Card>
        </div>
      </div>

      <Modal
        title={detailOnly ? '指标详情' : editing ? '编辑指标' : '新增指标'}
        open={modalOpen}
        onCancel={closeModal}
        width={900}
        destroyOnClose
        footer={
          detailOnly ? (
            <Button onClick={closeModal}>关闭</Button>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div>{renderEditModalDelete()}</div>
              <Space>
                {editing && getBaseline(editing) ? (
                  <Popconfirm
                    title="恢复初始化默认"
                    description="将本指标表单恢复为初始化默认值（含赋分规则、适用类型、启用状态、权重等），需点击保存后写入系统。"
                    onConfirm={resetModalForm}
                    okText="重置"
                    cancelText="取消"
                  >
                    <Button>重置</Button>
                  </Popconfirm>
                ) : (
                  <Button onClick={resetModalForm}>重置</Button>
                )}
                <Button onClick={closeModal}>取消</Button>
                <Button type="primary" onClick={handleSave}>
                  保存
                </Button>
              </Space>
            </div>
          )
        }
      >
        <Form form={form} layout="vertical" disabled={detailOnly} preserve scrollToFirstError>
          <Form.Item name="scoringRuleMode" hidden>
            <Input />
          </Form.Item>
          <Tabs
            activeKey={modalTabKey}
            onChange={key => setModalTabKey(key as IndicatorModalTabKey)}
            destroyOnHidden={false}
            items={[
              {
                key: 'base',
                label: '基本信息',
                forceRender: true,
                children: (
                  <>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          name="level1"
                          label="一级因子"
                          rules={[{ required: true, message: '请选择一级因子' }]}
                        >
                          <Select
                            options={getLevel1FactorSelectOptions()}
                            {...LEVEL1_FACTOR_SELECT_POPUP_PROPS}
                            optionRender={renderLevel1FactorSelectOption}
                            onChange={handleLevel1Change}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        {level1Watch && isFormationLevel1(level1Watch) ? (
                          <Form.Item
                            name="applicableTypes"
                            label={
                              <span>
                                适用隐患点类型
                                <ApplicableTypesHelpTip level1={level1Watch} />
                              </span>
                            }
                            rules={[{ required: true, message: '请选择隐患点类型' }]}
                            getValueProps={(value: HazardPointType[]) => ({
                              value: formationTypeFromApplicable(value),
                            })}
                            normalize={(v: HazardPointType | HazardPointType[]) => {
                              const one = Array.isArray(v) ? v[0] : v;
                              return one ? [one] : [];
                            }}
                          >
                            <Select
                              options={getFormationTypeSelectOptions()}
                              placeholder="请选择一种隐患点类型"
                              {...HAZARD_POINT_TYPE_SELECT_POPUP_PROPS}
                              optionRender={renderHazardPointTypeSelectOption}
                            />
                          </Form.Item>
                        ) : (
                          <Form.Item
                            name="valueType"
                            label="普查填报方式"
                            extra={getSurveyInputModeExtra(
                              getIndicatorScoringProfile({
                                code: codeWatch ?? '',
                                valueType: valueTypeWatch ?? 'enum',
                                survey:
                                  surveyWatch ?? {
                                    collectInSurvey: true,
                                    surveyRequired: false,
                                    fieldKey: codeWatch ?? '',
                                  },
                              }),
                            )}
                          >
                            <Select
                              options={[
                                { value: 'enum', label: '下拉分档' },
                                { value: 'numeric', label: '填数值' },
                                { value: 'boolean', label: '是 / 否' },
                              ]}
                              onChange={handleValueTypeChange}
                            />
                          </Form.Item>
                        )}
                      </Col>
                    </Row>
                    {level1Watch && !isFormationLevel1(level1Watch) ? (
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
                        致灾/承灾/防灾减灾因子对全部隐患点类型生效，无需选择适用类型。
                      </Text>
                    ) : null}
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          name="name"
                          label="指标名称"
                          rules={[{ required: true, message: '请输入指标名称' }]}
                        >
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name="code"
                          label={formLabelWithHelp('指标编码', INDICATOR_CODE_HELP_EDIT, '指标编码说明')}
                          rules={[{ required: true, message: '指标编码未生成' }]}
                        >
                          <Input disabled readOnly />
                        </Form.Item>
                      </Col>
                    </Row>
                    {level1Watch && isFormationLevel1(level1Watch) ? (
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item
                            name="valueType"
                            label="普查填报方式"
                            extra={getSurveyInputModeExtra(
                              getIndicatorScoringProfile({
                                code: codeWatch ?? '',
                                valueType: valueTypeWatch ?? 'enum',
                                survey:
                                  surveyWatch ?? {
                                    collectInSurvey: true,
                                    surveyRequired: false,
                                    fieldKey: codeWatch ?? '',
                                  },
                              }),
                            )}
                          >
                            <Select
                              options={[
                                { value: 'enum', label: '下拉分档' },
                                { value: 'numeric', label: '填数值' },
                                { value: 'boolean', label: '是 / 否' },
                              ]}
                              onChange={handleValueTypeChange}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          {valueTypeWatch === 'numeric' ? (
                            <Form.Item name="unit" label="单位" extra="选填；填写后用于普查展示与分档描述">
                              <Input placeholder="如 %、年、次/年" />
                            </Form.Item>
                          ) : (
                            <Form.Item name="unit" hidden>
                              <Input />
                            </Form.Item>
                          )}
                        </Col>
                      </Row>
                    ) : null}
                    <Row gutter={16}>
                      {!(level1Watch && isFormationLevel1(level1Watch)) && valueTypeWatch === 'numeric' ? (
                        <Col span={12}>
                          <Form.Item name="unit" label="单位" extra="选填；填写后用于普查展示与分档描述">
                            <Input placeholder="如 %、年、次/年" />
                          </Form.Item>
                        </Col>
                      ) : level1Watch && isFormationLevel1(level1Watch) ? null : (
                        <Form.Item name="unit" hidden>
                          <Input />
                        </Form.Item>
                      )}
                      <Col span={12}>
                        <Form.Item label="权重">
                          {editing ? (
                            <Space direction="vertical" size={4} style={{ width: '100%' }}>
                              <InputNumber
                                value={editing.weight}
                                disabled
                                precision={3}
                                style={{ width: '100%' }}
                              />
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                同级权重请在指标架构图中分别调整（合计须为 1.000，未达标列底标红）
                              </Text>
                              {onOpenArchitecture && !detailOnly && (
                                <Button
                                  type="link"
                                  size="small"
                                  style={{ padding: 0, height: 'auto' }}
                                  onClick={() => {
                                    closeModal();
                                    onOpenArchitecture({ editMode: true });
                                  }}
                                >
                                  前往指标架构图
                                </Button>
                              )}
                            </Space>
                          ) : (
                            <Text type="secondary">新建后请在指标架构图中配置同级权重</Text>
                          )}
                        </Form.Item>
                      </Col>
                    </Row>
                    {!level1Watch || !isFormationLevel1(level1Watch) ? (
                      <Form.Item name="applicableTypes" hidden>
                        <Select mode="multiple" options={[{ value: 'GLOBAL', label: 'GLOBAL' }]} />
                      </Form.Item>
                    ) : null}
                    <IndicatorSurveyCollectFields disabled={detailOnly} />
                    <IndicatorSurveyFieldKeyFields disabled={detailOnly} />
                    <Form.Item name="remark" label="说明">
                      <TextArea rows={2} />
                    </Form.Item>
                    <Form.Item label="启用">
                      {editing ? (
                        <Space direction="vertical" size={4}>
                          <Tag color={editing.enabled ? 'success' : 'warning'}>
                            {editing.enabled ? '启用' : '停用'}
                          </Tag>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            启用/停用在指标架构图中调整；用户新增指标须先配置同级 ω 后再启用
                          </Text>
                          {onOpenArchitecture && !detailOnly && (
                            <Button
                              type="link"
                              size="small"
                              style={{ padding: 0, height: 'auto' }}
                              onClick={() => {
                                closeModal();
                                onOpenArchitecture({ editMode: true });
                              }}
                            >
                              前往指标架构图
                            </Button>
                          )}
                        </Space>
                      ) : (
                        <Text type="secondary">
                          新建后默认停用，请在指标架构图中配置同级权重并启用
                        </Text>
                      )}
                    </Form.Item>
                  </>
                ),
              },
              {
                key: 'survey_scoring',
                label: '赋分规则',
                forceRender: true,
                children: (
                  <IndicatorSurveyScoringPanel
                    form={form}
                    editing={editing}
                    defaultIndicators={defaultIndicators}
                    indicators={indicators}
                    detailOnly={detailOnly}
                    idPrefix={editing?.id ?? 'new'}
                    scoreRulesSection={scoreRulesSection}
                    conditionalSurveyScope={conditionalSurveyScope}
                  />
                ),
              },
              ...(editing
                ? [
                    {
                      key: 'compare',
                      label: '默认与修正',
                      children: (() => {
                        const compareRow = detailOnly
                          ? editing
                          : ({
                              ...editing,
                              ...(form.getFieldsValue() as Partial<RiskIndicatorRow>),
                            } as RiskIndicatorRow);
                        const isNewSource =
                          getIndicatorSource(editing, defaultIndicators) === 'new';
                        return (
                          <IndicatorDefaultComparePanel
                            current={compareRow}
                            baseline={getBaseline(compareRow)}
                            defaultIndicators={defaultIndicators}
                            onRestoreDefault={
                              getBaseline(compareRow)
                                ? () => restoreDefault(compareRow)
                                : undefined
                            }
                            onSaveAsPreset={isNewSource ? () => saveAsInitPreset(compareRow) : undefined}
                          />
                        );
                      })(),
                    },
                  ]
                : []),
            ]}
          />
        </Form>
      </Modal>

      <IndicatorCreateWizard
        open={createWizardOpen}
        form={form}
        defaultIndicators={defaultIndicators}
        indicators={indicators}
        scoreRulesSection={scoreRulesSection}
        onCancel={() => {
          setCreateWizardOpen(false);
          form.resetFields();
        }}
        onSave={handleSave}
      />

      <Modal
        title="指标已保存"
        open={postSaveGuideOpen}
        onCancel={() => setPostSaveGuideOpen(false)}
        footer={[
          <Button key="later" onClick={() => setPostSaveGuideOpen(false)}>
            稍后
          </Button>,
          <Button
            key="arch"
            type="primary"
            onClick={() => {
              setPostSaveGuideOpen(false);
              onOpenArchitecture?.({ editMode: true });
            }}
          >
            前往架构图启用并配权重
          </Button>,
        ]}
      >
        <Text>
          新建指标默认<strong>停用</strong>（停用仅表示暂不参与 V 计分，不阻塞普查填报）。请在指标架构图中配置同级权重（启用指标合计须为
          1.000）并启用后，方可参与内涝等级试算与定级。
        </Text>
      </Modal>

      <SurveyTablePreviewModal
        open={tablePreviewOpen}
        onClose={() => setTablePreviewOpen(false)}
        indicators={indicators}
      />

      <Modal
        title="内涝等级试算"
        className="dq-score-preview-modal"
        open={scorePreviewOpen}
        onCancel={() => setScorePreviewOpen(false)}
        width={1400}
        footer={null}
        destroyOnClose
        styles={{
          container: {
            maxHeight: 'calc(100vh - 80px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
          body: {
            padding: '16px 20px',
            flex: '1 1 auto',
            minHeight: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <ScorePreviewPage
          indicators={indicators}
          indicatorLevels={indicatorLevels}
          level1Weights={level1Weights}
          regionalPrevention={regionalPrevention}
          activePreventionRecord={activePreventionRecord}
        />
      </Modal>
    </div>
  );
};

