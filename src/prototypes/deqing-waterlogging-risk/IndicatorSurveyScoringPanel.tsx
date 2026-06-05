import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Col,
  Divider,
  Form,
  Input,
  Row,
} from 'antd';
import type { FormInstance } from 'antd';
import type { RiskIndicatorRow, Level1Factor, HazardPointType } from './types';
import { IndicatorSurveyConfigFields } from './IndicatorSurveyConfigFields';
import { ScoringRulesTabPanel } from './ScoringRulesTabPanel';
import { SurveyFieldPreview } from './SurveyFieldPreview';
import { ScoringPreviewTable } from './ScoringPreviewTable';
import { IndicatorConfigReadinessAlert } from './IndicatorConfigReadinessAlert';
import { IndicatorTemplatePicker } from './IndicatorTemplatePicker';
import {
  applyIndicatorConfigTemplate,
  buildIndicatorRowFromForm,
  requiresTemplateSwitchConfirm,
  resolveTemplateForRow,
  type IndicatorConfigTemplateId,
} from './indicatorConfigTemplates';
import { syncAuxiliaryConditionalToForm } from './auxiliaryIndicatorDefaults';

interface Props {
  form: FormInstance;
  editing?: RiskIndicatorRow | null;
  defaultIndicators: RiskIndicatorRow[];
  indicators: RiskIndicatorRow[];
  detailOnly?: boolean;
  idPrefix: string;
  scoreRulesSection: React.ReactNode;
  /** 是否展示场景模板切换（新建向导在步骤内顶部单独展示） */
  showTemplatePicker?: boolean;
  /** 是否展示可视化预览（新建向导确认步已有预览） */
  showPreview?: boolean;
  /** 是否展示配置就绪/缺项提示（新建向导在点「下一步」时再校验） */
  showReadinessAlert?: boolean;
  /** 新建向导：隐藏「赋分规则」分割线与赋分方式说明文案 */
  compactScoringLayout?: boolean;
  /** 向导等场景：已选模板 id，用于锁定赋分方式 Segmented */
  scenarioTemplateId?: IndicatorConfigTemplateId;
  conditionalSurveyScope: 'point' | 'region';
}

/** 填报与赋分一体面板：合并原普查关联 + 赋分规则 Tab */
export const IndicatorSurveyScoringPanel: React.FC<Props> = ({
  form,
  editing,
  defaultIndicators,
  indicators,
  detailOnly,
  idPrefix,
  scoreRulesSection,
  showTemplatePicker = true,
  showPreview = true,
  showReadinessAlert = true,
  compactScoringLayout = false,
  scenarioTemplateId: scenarioTemplateIdProp,
  conditionalSurveyScope,
}) => {
  const valueTypeWatch = Form.useWatch('valueType', form) as RiskIndicatorRow['valueType'] | undefined;
  const codeWatch = Form.useWatch('code', form) as string | undefined;
  const codeResolved =
    codeWatch ?? (form.getFieldValue('code') as string | undefined);
  const level1Watch = Form.useWatch('level1', form) as Level1Factor | undefined;
  const level1Resolved =
    level1Watch ?? (form.getFieldValue('level1') as Level1Factor | undefined);
  const applicableTypesWatch = Form.useWatch('applicableTypes', form);
  const applicableTypesResolved =
    (applicableTypesWatch as HazardPointType[] | undefined) ??
    (form.getFieldValue('applicableTypes') as HazardPointType[] | undefined);
  const templateWatch = Form.useWatch('configTemplateId', form) as IndicatorConfigTemplateId | undefined;

  const draftRow = buildIndicatorRowFromForm(form, editing);
  const resolvedTemplate =
    scenarioTemplateIdProp ??
    templateWatch ??
    resolveTemplateForRow(draftRow) ??
    ('enum_uniform' as IndicatorConfigTemplateId);

  const [templateConfirm, setTemplateConfirm] = useState<IndicatorConfigTemplateId | null>(null);

  const inputVariantWatch = Form.useWatch(['survey', 'inputVariant'], form) as
    | RiskIndicatorRow['survey']['inputVariant']
    | undefined;
  const surveyInputVariant =
    inputVariantWatch ??
    (form.getFieldValue(['survey', 'inputVariant']) as RiskIndicatorRow['survey']['inputVariant'] | undefined);

  const isAuxiliaryThenSelect = surveyInputVariant === 'auxiliary_then_select';

  const syncAuxiliaryFromForm = useCallback(() => {
    syncAuxiliaryConditionalToForm(form, {
      code: codeResolved,
      id: editing?.id ?? idPrefix,
      level1: level1Resolved ?? editing?.level1,
      applicableTypes: applicableTypesResolved ?? editing?.applicableTypes,
      valueType: valueTypeWatch,
    });
  }, [
    form,
    codeResolved,
    editing,
    idPrefix,
    level1Resolved,
    applicableTypesResolved,
    valueTypeWatch,
  ]);

  // 仅显式 auxiliary_then_select 时同步辅助条件包（导则种子或高级配置）
  useEffect(() => {
    if (surveyInputVariant !== 'auxiliary_then_select' || detailOnly) return;
    syncAuxiliaryFromForm();
  }, [
    surveyInputVariant,
    detailOnly,
    codeResolved,
    level1Resolved,
    applicableTypesResolved,
    valueTypeWatch,
    syncAuxiliaryFromForm,
  ]);

  const applyTemplate = (id: IndicatorConfigTemplateId) => {
    applyIndicatorConfigTemplate(form, id, {
      code: codeResolved,
      idPrefix: editing?.id ?? idPrefix,
    });
    form.setFieldValue('configTemplateId', id);
    setTemplateConfirm(null);
  };

  const handleTemplateSelect = (id: IndicatorConfigTemplateId) => {
    if (id === resolvedTemplate) return;
    if (requiresTemplateSwitchConfirm(resolvedTemplate, id)) {
      setTemplateConfirm(id);
      return;
    }
    applyTemplate(id);
  };

  return (
    <>
      {showTemplatePicker ? (
        <>
          <Divider plain style={{ margin: '0 0 12px' }}>
            赋分规则场景
          </Divider>
          {templateConfirm ? (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              message="切换场景将覆盖当前赋分配置"
              action={
                <Button size="small" type="primary" onClick={() => applyTemplate(templateConfirm)}>
                  确认切换
                </Button>
              }
              closable
              onClose={() => setTemplateConfirm(null)}
            />
          ) : null}
          <IndicatorTemplatePicker
            valueType={valueTypeWatch ?? 'enum'}
            selected={resolvedTemplate}
            onSelect={handleTemplateSelect}
            disabled={detailOnly}
          />
          {showPreview ? (
            <>
              <Divider plain style={{ margin: '16px 0 12px' }}>
                可视化预览
              </Divider>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <SurveyFieldPreview form={form} editing={editing} allIndicators={indicators} />
                </Col>
                <Col xs={24} md={12}>
                  <ScoringPreviewTable form={form} editing={editing} />
                </Col>
              </Row>
            </>
          ) : null}
        </>
      ) : null}

      {showReadinessAlert ? (
        <IndicatorConfigReadinessAlert ind={draftRow} allIndicators={indicators} />
      ) : null}

      {isAuxiliaryThenSelect ? (
        <>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message="先填条件再选档"
            description={
              <>
                本指标含辅助条件字段；条件来源已固定为本项辅助条件。请在「条件赋分」配置各分支<strong>数值条件</strong>及赋分档；条件名称、填报位置等可在「高级」中调整。
              </>
            }
          />
          <Form.Item name={['survey', 'inputVariant']} hidden initialValue="auxiliary_then_select">
            <Input />
          </Form.Item>
        </>
      ) : null}

      <IndicatorSurveyConfigFields
        form={form}
        disabled={detailOnly}
        defaultIndicators={defaultIndicators}
        advancedOnly
        auxiliaryPrimaryExternal={isAuxiliaryThenSelect}
        indicators={indicators}
        onAuxiliaryFieldKeyChange={isAuxiliaryThenSelect ? syncAuxiliaryFromForm : undefined}
      />

      {compactScoringLayout ? null : (
        <Divider plain style={{ margin: '12px 0' }}>
          赋分规则
        </Divider>
      )}
      <ScoringRulesTabPanel
        form={form}
        defaultIndicators={defaultIndicators}
        indicators={indicators}
        valueType={valueTypeWatch ?? 'enum'}
        surveyScope={conditionalSurveyScope}
        code={codeResolved}
        detailOnly={detailOnly}
        idPrefix={idPrefix}
        scoreRulesSection={scoreRulesSection}
        compactLayout={compactScoringLayout}
        scenarioTemplateId={scenarioTemplateIdProp ?? templateWatch ?? resolvedTemplate}
        editing={editing}
      />
      <Form.Item name="scoreExplanation" label="赋分说明" style={{ marginTop: 12 }}>
        <Input.TextArea disabled={detailOnly} rows={3} placeholder="普查表单项 ? 悬停展示；每行一条" />
      </Form.Item>
      <Form.Item name="configTemplateId" hidden>
        <Input />
      </Form.Item>
    </>
  );
};
