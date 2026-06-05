import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Steps,
  Typography,
  message,
} from 'antd';
import type { FormInstance } from 'antd';
import {
  HAZARD_POINT_TYPE_SELECT_POPUP_PROPS,
  renderHazardPointTypeSelectOption,
} from './hazardPointTypeSelect';
import {
  type HazardPointType,
  type Level1Factor,
  type RiskIndicatorRow,
} from './types';
import { IndicatorTemplatePicker } from './IndicatorTemplatePicker';
import { IndicatorSurveyScoringPanel } from './IndicatorSurveyScoringPanel';
import { IndicatorConfigReadinessAlert } from './IndicatorConfigReadinessAlert';
import { SurveyFieldPreview } from './SurveyFieldPreview';
import { ScoringPreviewTable } from './ScoringPreviewTable';
import {
  applyIndicatorConfigTemplate,
  buildIndicatorRowFromForm,
  type IndicatorConfigTemplateId,
} from './indicatorConfigTemplates';
import { createEmptyConditionalScoring } from './conditionalScoring';
import {
  defaultApplicableTypesForLevel1,
  formationTypeFromApplicable,
  getFormationTypeSelectOptions,
  isFormationLevel1,
} from './indicatorApplicableTypes';
import {
  getLevel1FactorSelectOptions,
  LEVEL1_FACTOR_SELECT_POPUP_PROPS,
  renderLevel1FactorSelectOption,
} from './level1FactorSelect';
import { ApplicableTypesHelpTip } from './ApplicableTypesHelpTip';
import { formLabelWithHelp, INDICATOR_CODE_HELP_WIZARD } from './FormLabelHelpTip';
import { suggestWeightForNewIndicator, validateIndicatorConfig } from './indicatorConfigReadiness';
import { assignAutoIndicatorCodeToForm } from './indicatorCodeGenerator';
import { IndicatorSurveyCollectFields } from './IndicatorSurveyCollectFields';
import { IndicatorSurveyFieldKeyFields } from './IndicatorSurveyFieldKeyFields';
import {
  DEFAULT_WIZARD_DRAFT,
  resolveWizardScoringFromValueType,
  type IndicatorWizardDraft,
} from './indicatorWizardDraft';
import { refreshAutoNumericRuleLabels } from './scoreRuleNumericBands';

const { Text } = Typography;

interface Props {
  open: boolean;
  form: FormInstance;
  defaultIndicators: RiskIndicatorRow[];
  indicators: RiskIndicatorRow[];
  scoreRulesSection: React.ReactNode;
  onCancel: () => void;
  onSave: () => Promise<void>;
}

const STEP_ITEMS = [{ title: '基本信息' }, { title: '赋分规则' }, { title: '确认' }];

const VALUE_TYPE_OPTIONS = [
  { value: 'enum' as const, label: '下拉分档' },
  { value: 'numeric' as const, label: '填数值' },
  { value: 'boolean' as const, label: '是 / 否' },
];

/** 新建指标分步向导 */
export const IndicatorCreateWizard: React.FC<Props> = ({
  open,
  form,
  defaultIndicators,
  indicators,
  scoreRulesSection,
  onCancel,
  onSave,
}) => {
  const [step, setStep] = useState(0);
  const [wizardDraft, setWizardDraft] = useState<IndicatorWizardDraft>(DEFAULT_WIZARD_DRAFT);
  const step1InitializedRef = useRef(false);

  const level1Watch = Form.useWatch('level1', form) as Level1Factor | undefined;
  const codeWatch = Form.useWatch('code', form) as string | undefined;
  const applicableTypesWatch = Form.useWatch('applicableTypes', form) as HazardPointType[] | undefined;

  const resetWizard = () => {
    setStep(0);
    setWizardDraft(DEFAULT_WIZARD_DRAFT);
    step1InitializedRef.current = false;
  };

  const handleClose = () => {
    resetWizard();
    onCancel();
  };

  /** 将草稿写入表单并应用赋分场景模板 */
  const applyWizardDraft = (draft: IndicatorWizardDraft, templateId: IndicatorConfigTemplateId) => {
    applyIndicatorConfigTemplate(form, templateId, {
      code: form.getFieldValue('code') ?? codeWatch,
      idPrefix: 'new',
      contentMode: 'structure',
      valueType: draft.valueType,
    });
    form.setFieldsValue({
      valueType: draft.valueType,
      configTemplateId: templateId,
    });
  };

  const commitDraftFromValueType = (valueType: RiskIndicatorRow['valueType']) => {
    const draft = resolveWizardScoringFromValueType(valueType);
    setWizardDraft(draft);
    applyWizardDraft(draft, draft.templateId);
    return draft;
  };

  const handleValueTypeChange = (valueType: RiskIndicatorRow['valueType']) => {
    form.setFieldValue('valueType', valueType);
    if (valueType !== 'numeric') {
      form.setFieldValue('unit', undefined);
    }
    commitDraftFromValueType(valueType);
  };

  const handleTemplateSelect = (templateId: IndicatorConfigTemplateId) => {
    let valueType = wizardDraft.valueType;
    if (templateId === 'enum_uniform') valueType = 'enum';
    else if (templateId === 'numeric_uniform') valueType = 'numeric';
    else if (templateId === 'boolean_uniform') valueType = 'boolean';
    const draft: IndicatorWizardDraft = { valueType, templateId };
    setWizardDraft(draft);
    applyWizardDraft(draft, templateId);
  };

  useEffect(() => {
    if (step === 0) step1InitializedRef.current = false;
  }, [step]);

  /** 进入赋分规则步时，按已填单位刷新仍为自动生成的分档描述 */
  useEffect(() => {
    if (step !== 1 || wizardDraft.valueType !== 'numeric') return;
    const unit = String(form.getFieldValue('unit') ?? '').trim() || undefined;
    const rules = (form.getFieldValue('scoreRules') ?? []) as RiskIndicatorRow['scoreRules'];
    const next = refreshAutoNumericRuleLabels(rules, { unit });
    if (next.some((r, i) => r.label !== rules[i]?.label)) {
      form.setFieldValue('scoreRules', next);
    }
  }, [step, wizardDraft.valueType, form]);

  /** 打开向导时与父级 reset 后的表单对齐草稿 */
  useEffect(() => {
    if (!open) return;
    const vt =
      (form.getFieldValue('valueType') as RiskIndicatorRow['valueType'] | undefined) ??
      DEFAULT_WIZARD_DRAFT.valueType;
    setWizardDraft(resolveWizardScoringFromValueType(vt));
    step1InitializedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const prepareBeforeLeaveStep = async (fromStep: number): Promise<boolean> => {
    if (fromStep === 0) {
      const level1 = form.getFieldValue('level1') as Level1Factor;
      assignAutoIndicatorCodeToForm(form, indicators, level1);
      const vt =
        (form.getFieldValue('valueType') as RiskIndicatorRow['valueType']) ?? wizardDraft.valueType;
      try {
        await form.validateFields(['name', 'level1', 'applicableTypes', 'valueType', 'code']);
      } catch {
        message.warning('请完善基本信息');
        return false;
      }
      commitDraftFromValueType(vt);
      if (vt === 'numeric') {
        const unit = String(form.getFieldValue('unit') ?? '').trim() || undefined;
        const rules = (form.getFieldValue('scoreRules') ?? []) as RiskIndicatorRow['scoreRules'];
        form.setFieldValue('scoreRules', refreshAutoNumericRuleLabels(rules, { unit }));
      }
      step1InitializedRef.current = true;
    }
    if (fromStep === 1) {
      const draft = buildIndicatorRowFromForm(form, null);
      const readiness = validateIndicatorConfig(draft, indicators);
      if (!readiness.ok) {
        message.error(readiness.blockers[0] ?? '请完善赋分规则配置');
        return false;
      }
    }
    return true;
  };

  const goToStep = async (targetStep: number) => {
    if (targetStep === step || targetStep < 0 || targetStep >= STEP_ITEMS.length) return;
    if (targetStep < step) {
      setStep(targetStep);
      return;
    }
    for (let s = step; s < targetStep; s++) {
      const ok = await prepareBeforeLeaveStep(s);
      if (!ok) {
        setStep(s);
        return;
      }
    }
    setStep(targetStep);
  };

  const nextStep = () => {
    void goToStep(step + 1);
  };

  const handleSave = async () => {
    const draft = buildIndicatorRowFromForm(form, null);
    const readiness = validateIndicatorConfig(draft, indicators);
    if (!readiness.ok) {
      message.error(readiness.blockers.join('；'));
      setStep(1);
      return;
    }
    await onSave();
    resetWizard();
  };

  return (
    <Modal
      title="新增指标"
      open={open}
      width={880}
      onCancel={handleClose}
      destroyOnClose
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={handleClose}>取消</Button>
          <Space>
            {step > 0 ? <Button onClick={() => setStep(s => s - 1)}>上一步</Button> : null}
            {step < STEP_ITEMS.length - 1 ? (
              <Button type="primary" onClick={nextStep}>
                下一步
              </Button>
            ) : (
              <Button type="primary" onClick={handleSave}>
                保存
              </Button>
            )}
          </Space>
        </div>
      }
    >
      <Steps
        current={step}
        items={STEP_ITEMS}
        size="small"
        style={{ marginBottom: 20 }}
        onChange={target => {
          void goToStep(target);
        }}
      />
      <Form form={form} layout="vertical" preserve>
        {/* 全步骤常驻：避免分步卸载导致 valueType / level1 / code 等丢失 */}
        <Form.Item name="valueType" hidden initialValue="enum">
          <Input />
        </Form.Item>
        <Form.Item name="configTemplateId" hidden initialValue="enum_uniform">
          <Input />
        </Form.Item>
        <Form.Item name="unit" hidden>
          <Input />
        </Form.Item>

        <div style={{ display: step === 0 ? 'block' : 'none' }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="level1"
                  label="一级因子"
                  rules={[{ required: true }]}
                >
                  <Select
                    options={getLevel1FactorSelectOptions()}
                    {...LEVEL1_FACTOR_SELECT_POPUP_PROPS}
                    optionRender={renderLevel1FactorSelectOption}
                    onChange={(v: Level1Factor) => {
                      assignAutoIndicatorCodeToForm(form, indicators, v);
                      const survey =
                        (form.getFieldValue('survey') as RiskIndicatorRow['survey'] | undefined) ?? {};
                      form.setFieldsValue({
                        applicableTypes: defaultApplicableTypesForLevel1(v),
                        survey: { ...survey, scope: v === 'PREVENTION' ? 'region' : 'point' },
                      });
                    }}
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
                        {level1Watch ? <ApplicableTypesHelpTip level1={level1Watch} /> : null}
                      </span>
                    }
                    rules={[{ required: true }]}
                    getValueProps={(v: HazardPointType[]) => ({ value: formationTypeFromApplicable(v) })}
                    normalize={(v: HazardPointType | HazardPointType[]) => {
                      const one = Array.isArray(v) ? v[0] : v;
                      return one ? [one] : [];
                    }}
                  >
                    <Select
                      options={getFormationTypeSelectOptions()}
                      {...HAZARD_POINT_TYPE_SELECT_POPUP_PROPS}
                      optionRender={renderHazardPointTypeSelectOption}
                    />
                  </Form.Item>
                ) : (
                  <Form.Item label="普查填报方式" required>
                    <Select
                      value={wizardDraft.valueType}
                      options={VALUE_TYPE_OPTIONS}
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
                <Form.Item name="name" label="指标名称" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="code"
                  label={formLabelWithHelp('指标编码', INDICATOR_CODE_HELP_WIZARD, '指标编码说明')}
                  rules={[{ required: true, message: '指标编码未生成' }]}
                >
                  <Input disabled readOnly />
                </Form.Item>
              </Col>
            </Row>
            {level1Watch && isFormationLevel1(level1Watch) ? (
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="普查填报方式" required>
                    <Select
                      value={wizardDraft.valueType}
                      options={VALUE_TYPE_OPTIONS}
                      onChange={handleValueTypeChange}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  {wizardDraft.valueType === 'numeric' ? (
                    <Form.Item
                      name="unit"
                      label="单位"
                      extra="选填；填写后会用于普查展示与分档描述（如 %、次/年）"
                    >
                      <Input placeholder="如 %、年、次/年" />
                    </Form.Item>
                  ) : (
                    <Form.Item name="unit" hidden>
                      <Input />
                    </Form.Item>
                  )}
                </Col>
              </Row>
            ) : (
              <Form.Item name="applicableTypes" hidden initialValue={['GLOBAL']}>
                <Select mode="multiple" />
              </Form.Item>
            )}
            {!(level1Watch && isFormationLevel1(level1Watch)) && wizardDraft.valueType === 'numeric' ? (
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="unit"
                    label="单位"
                    extra="选填；填写后会用于普查展示与分档描述（如 %、次/年）"
                  >
                    <Input placeholder="如 %、年、次/年" />
                  </Form.Item>
                </Col>
              </Row>
            ) : null}
            <IndicatorSurveyCollectFields />
            <IndicatorSurveyFieldKeyFields />
            <Form.Item name="remark" label="说明">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="weight" hidden initialValue={0}>
              <InputNumber />
            </Form.Item>
            <Form.Item name="scoreRules" hidden>
              <Input />
            </Form.Item>
            <Form.Item name="conditionalScoring" hidden initialValue={createEmptyConditionalScoring()}>
              <Input />
            </Form.Item>
            <Form.Item name="survey" hidden initialValue={{ collectInSurvey: true, surveyRequired: false }}>
              <Input />
            </Form.Item>
            <Form.Item name="scoreExplanation" hidden initialValue="">
              <Input />
            </Form.Item>
        </div>

        {step === 1 ? (
          <>
            <IndicatorTemplatePicker
              valueType={wizardDraft.valueType}
              selected={wizardDraft.templateId}
              onSelect={handleTemplateSelect}
            />
            <div style={{ marginTop: 16 }}>
              <IndicatorSurveyScoringPanel
                form={form}
                defaultIndicators={defaultIndicators}
                indicators={indicators}
                idPrefix="new"
                scoreRulesSection={scoreRulesSection}
                showTemplatePicker={false}
                showPreview={false}
                showReadinessAlert={false}
                compactScoringLayout
                scenarioTemplateId={wizardDraft.templateId}
                conditionalSurveyScope={level1Watch === 'PREVENTION' ? 'region' : 'point'}
              />
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <SurveyFieldPreview form={form} allIndicators={indicators} />
              </Col>
              <Col xs={24} md={12}>
                <ScoringPreviewTable form={form} />
              </Col>
            </Row>
            <IndicatorConfigReadinessAlert
              ind={buildIndicatorRowFromForm(form, null)}
              allIndicators={indicators}
            />
            {(() => {
              const draft = buildIndicatorRowFromForm(form, null);
              const suggested = suggestWeightForNewIndicator(draft, indicators);
              return (
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                  建议在指标架构图中为本指标设置权重约 <strong>{suggested.toFixed(3)}</strong>（与当前同级启用指标均分，合计须为
                  1.000）。
                </Text>
              );
            })()}
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
              保存后指标默认<strong>停用</strong>，请在指标架构图中配置同级权重 ω 并启用，方可参与试算与定级。
            </Text>
          </>
        ) : null}
      </Form>
    </Modal>
  );
};
