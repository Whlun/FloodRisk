import React, { useEffect, useMemo } from 'react';
import {
  Alert,
  Button,
  Col,
  Collapse,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Switch,
  Typography,
} from 'antd';
import type { FormInstance } from 'antd';
import type {
  HazardPointType,
  IndicatorSurveyInputVariant,
  Level1Factor,
  RiskIndicatorRow,
  ScoringRuleMode,
} from './types';
import { buildAuxiliaryConditionFieldKeyOptions } from './auxiliaryIndicatorDefaults';
import { isCompositeSurveyConfigured } from './compositeSurveyHydration';
import { COMPOSITE_SCORING_COPY } from './compositeScoringCopy';
import { DEFAULT_COMPOSITE_NUMERIC_RANGE } from './surveyTemplates';
import { resolveAppendixBValueFieldKey } from './numericIndicatorConstraints';

const { Text } = Typography;

const INPUT_VARIANT_OPTIONS: { value: IndicatorSurveyInputVariant; label: string }[] = [
  { value: 'default', label: '常规（单控件填报）' },
  { value: 'auxiliary_then_select', label: '先填条件字段，再选本分档' },
];

const SURVEY_PLACEMENT_OPTIONS = [
  { value: 'appendix_b', label: '内涝基本信息 · 类型专用信息' },
  { value: 'indicator_census', label: '指标普查 Tab' },
] as const;

interface Props {
  form: FormInstance;
  disabled?: boolean;
  defaultIndicators?: RiskIndicatorRow[];
  onGoRulesTab?: () => void;
  /** 填报形态由场景模板选择，此处仅展示辅助条件等高级项 */
  advancedOnly?: boolean;
  /** 辅助条件主表单项已在父级展示时，此处仅保留字段键等高级项 */
  auxiliaryPrimaryExternal?: boolean;
  /** 辅助条件字段键变更后同步条件赋分来源 */
  onAuxiliaryFieldKeyChange?: () => void;
  indicators?: RiskIndicatorRow[];
}

/** 普查关联 Tab：填报形态与字段映射（赋分方式在赋分规则 Tab 选择） */
export const IndicatorSurveyConfigFields: React.FC<Props> = ({
  form,
  disabled,
  onGoRulesTab,
  advancedOnly,
  auxiliaryPrimaryExternal,
  onAuxiliaryFieldKeyChange,
  indicators,
}) => {
  const inputVariant = Form.useWatch(['survey', 'inputVariant'], form) as
    | IndicatorSurveyInputVariant
    | undefined;
  const scoringRuleMode = Form.useWatch('scoringRuleMode', form) as ScoringRuleMode | undefined;
  const code = Form.useWatch('code', form) as string | undefined;
  const compositeEnabled =
    scoringRuleMode === 'composite' || inputVariant === 'composite_appendix_numeric';
  const auxFieldKey = Form.useWatch(['survey', 'auxiliaryCondition', 'fieldKey'], form) as
    | string
    | undefined;
  const auxLabel = Form.useWatch(['survey', 'auxiliaryCondition', 'label'], form) as string | undefined;
  const auxPlacement = Form.useWatch(['survey', 'auxiliaryCondition', 'surveyPlacement'], form) as
    | 'appendix_b'
    | 'indicator_census'
    | undefined;
  const level1 = Form.useWatch('level1', form) as Level1Factor | undefined;
  const applicableTypes = Form.useWatch('applicableTypes', form) as HazardPointType[] | undefined;
  const auxEnabled = inputVariant === 'auxiliary_then_select';

  const auxFieldKeyOptions = useMemo(
    () =>
      buildAuxiliaryConditionFieldKeyOptions({
        code,
        level1,
        applicableTypes,
        label: auxLabel,
        surveyPlacement: auxPlacement,
        currentFieldKey: auxFieldKey,
        indicators,
      }),
    [code, level1, applicableTypes, auxLabel, auxPlacement, auxFieldKey, indicators],
  );

  const renderAuxFieldKeySelect = (extra?: string) => (
    <Form.Item
      name={['survey', 'auxiliaryCondition', 'fieldKey']}
      label="条件字段"
      extra={extra ?? '选择中文名称即可，系统内部保存为字段键'}
      rules={[{ required: true, message: '请选择条件字段' }]}
    >
      <Select
        disabled={disabled}
        showSearch
        optionFilterProp="label"
        options={auxFieldKeyOptions}
        placeholder="请选择条件字段"
        onChange={() => onAuxiliaryFieldKeyChange?.()}
      />
    </Form.Item>
  );

  /** 高级项：普查展示、字段键、合理范围（方案 A：主配置在条件赋分） */
  const renderAuxiliaryAdvancedBlock = (fieldKeyExtra?: string) => (
    <>
      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            name={['survey', 'auxiliaryCondition', 'label']}
            label="条件名称（普查展示）"
            rules={[{ required: true, message: '请填写条件名称' }]}
          >
            <Input
              disabled={disabled}
              placeholder="如 道路纵坡 S"
              onBlur={() => onAuxiliaryFieldKeyChange?.()}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name={['survey', 'auxiliaryCondition', 'unit']} label="单位">
            <Input disabled={disabled} placeholder="如 %" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            name={['survey', 'auxiliaryCondition', 'surveyPlacement']}
            label="条件填报位置"
            initialValue="indicator_census"
            rules={[{ required: true, message: '请选择条件填报位置' }]}
          >
            <Select
              disabled={disabled}
              options={[...SURVEY_PLACEMENT_OPTIONS]}
              onChange={() => onAuxiliaryFieldKeyChange?.()}
            />
          </Form.Item>
        </Col>
      </Row>
      {renderAuxFieldKeySelect(fieldKeyExtra)}
      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            name={['survey', 'auxiliaryCondition', 'numericRange', 'min']}
            label="合理范围 · 最小"
          >
            <InputNumber disabled={disabled} style={{ width: '100%' }} placeholder="0" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            name={['survey', 'auxiliaryCondition', 'numericRange', 'max']}
            label="合理范围 · 最大"
          >
            <InputNumber disabled={disabled} style={{ width: '100%' }} placeholder="20" />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name={['survey', 'auxiliaryCondition', 'hint']} label="字段说明">
        <Input.TextArea disabled={disabled} rows={2} placeholder="辅助条件数值；用于本分档判定。" />
      </Form.Item>
    </>
  );

  // 复合模式缺省子项：仅补空槽，不从种子被动灌入（灌入仅在打开弹窗或用户点「恢复默认复合配置」）
  useEffect(() => {
    if (!compositeEnabled) return;
    const currentSurvey = form.getFieldValue('survey');
    if (isCompositeSurveyConfigured(currentSurvey)) return;

    const parts = form.getFieldValue(['survey', 'appendixBSurveyParts']);
    if (Array.isArray(parts) && parts.filter(Boolean).length > 0) return;

    const codeTrim = String(code ?? '').trim();
    if (!codeTrim) return;
    form.setFieldsValue({
      survey: {
        ...currentSurvey,
        inputVariant: 'composite_appendix_numeric',
        compositeAggregation: 'max_f',
        appendixBSurveyParts: [
          {
            label: '子项 1',
            appendixBFieldKey: 'appendixPart1',
            valueFieldKey: resolveAppendixBValueFieldKey('appendixPart1', codeTrim, 0),
            numericRange: { ...DEFAULT_COMPOSITE_NUMERIC_RANGE },
            tierBands: [
              { riskTier: '低', score: 0.2, match: { kind: 'gt', value: 0 } },
              { riskTier: '高', score: 1, match: { kind: 'lt', value: 0 } },
            ],
          },
        ],
      },
    });
  }, [compositeEnabled, code, form]);

  useEffect(() => {
    if (!auxEnabled) return;
    const key = String(auxFieldKey ?? '').trim();
    if (key) return;
    const codeTrim = String(code ?? '').trim();
    if (!codeTrim) return;
    form.setFieldValue(['survey', 'auxiliaryCondition', 'fieldKey'], `${codeTrim}_COND`);
  }, [auxEnabled, auxFieldKey, code, form]);

  if (advancedOnly && !auxEnabled && !compositeEnabled) {
    return null;
  }

  return (
    <>
      {!advancedOnly ? (
        <>
      <Divider plain style={{ margin: '4px 0 12px' }}>
        填报形态
      </Divider>
      {compositeEnabled ? (
        <>
          <Form.Item name={['survey', 'inputVariant']} hidden>
            <Input />
          </Form.Item>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message="当前为「复合数值赋分」"
            description={
              <>
                {COMPOSITE_SCORING_COPY.surveyTabAlertDesc}
                {onGoRulesTab ? (
                  <>
                    {' '}
                    <Button type="link" size="small" style={{ padding: 0 }} onClick={onGoRulesTab}>
                      前往赋分规则
                    </Button>
                  </>
                ) : null}
              </>
            }
          />
        </>
      ) : (
        <Form.Item
          name={['survey', 'inputVariant']}
          label="普查填报形态"
          initialValue="default"
          extra="复合数值赋分请在「赋分规则」Tab 选择；此处仅配置常规填报或「先填条件再选档」。"
        >
          <Select disabled={disabled} options={INPUT_VARIANT_OPTIONS} />
        </Form.Item>
      )}
        </>
      ) : null}

      {auxEnabled && !auxiliaryPrimaryExternal ? (
        <>
          <Divider plain style={{ margin: '4px 0 12px' }}>
            辅助条件字段
          </Divider>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
            须先填写辅助条件，再选择主指标分档；条件赋分将按辅助取值切换分支。
          </Text>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name={['survey', 'auxiliaryCondition', 'label']}
                label="条件名称"
                rules={[{ required: true, message: '请填写条件字段名称' }]}
              >
                <Input
              disabled={disabled}
              placeholder="如 道路纵坡 S"
              onBlur={() => onAuxiliaryFieldKeyChange?.()}
            />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name={['survey', 'auxiliaryCondition', 'unit']} label="单位">
                <Input disabled={disabled} placeholder="如 %" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name={['survey', 'auxiliaryCondition', 'thresholdPct']}
                label="分界值"
                extra="如 7 表示 7%"
              >
                <InputNumber disabled={disabled} min={0} style={{ width: '100%' }} placeholder="7" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name={['survey', 'auxiliaryCondition', 'surveyPlacement']}
                label="条件填报位置"
                initialValue="indicator_census"
                rules={[{ required: true, message: '请选择条件填报位置' }]}
              >
                <Select disabled={disabled} options={[...SURVEY_PLACEMENT_OPTIONS]} />
              </Form.Item>
            </Col>
          </Row>
          {advancedOnly ? (
            <Collapse
              ghost
              size="small"
              items={[
                {
                  key: 'aux-advanced',
                  label: <Text type="secondary">高级：条件字段键、合理范围与说明</Text>,
                  children: renderAuxiliaryAdvancedBlock(),
                },
              ]}
            />
          ) : (
            <>
              {renderAuxiliaryAdvancedBlock()}
              <Form.Item
                name={['survey', 'auxiliaryCondition', 'collectInSurvey']}
                label="参与普查填报"
                valuePropName="checked"
                initialValue
              >
                <Switch disabled={disabled} />
              </Form.Item>
            </>
          )}
          {advancedOnly ? (
            <Form.Item
              name={['survey', 'auxiliaryCondition', 'collectInSurvey']}
              valuePropName="checked"
              initialValue
              hidden
            >
              <Switch />
            </Form.Item>
          ) : null}
        </>
      ) : null}

      {auxEnabled && auxiliaryPrimaryExternal ? (
        <>
          <Form.Item name={['survey', 'auxiliaryCondition', 'label']} hidden>
            <Input />
          </Form.Item>
          <Form.Item name={['survey', 'auxiliaryCondition', 'fieldKey']} hidden>
            <Input />
          </Form.Item>
          <Form.Item name={['survey', 'auxiliaryCondition', 'surveyPlacement']} hidden>
            <Input />
          </Form.Item>
          <Form.Item name={['survey', 'auxiliaryCondition', 'unit']} hidden>
            <Input />
          </Form.Item>
          <Form.Item name={['survey', 'auxiliaryCondition', 'thresholdPct']} hidden>
            <InputNumber />
          </Form.Item>
          <Form.Item
            name={['survey', 'auxiliaryCondition', 'collectInSurvey']}
            valuePropName="checked"
            initialValue
            hidden
          >
            <Switch />
          </Form.Item>
          <Collapse
            ghost
            size="small"
            items={[
              {
                key: 'aux-advanced',
                label: <Text type="secondary">高级：普查展示名称、填报位置、字段键与合理范围</Text>,
                children: renderAuxiliaryAdvancedBlock(
                  '分界值请在下方「条件分支」各支的数值条件中配置',
                ),
              },
            ]}
          />
        </>
      ) : null}
    </>
  );
};
