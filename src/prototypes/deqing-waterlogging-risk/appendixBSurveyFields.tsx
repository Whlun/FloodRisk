import React from 'react';
import { Col, Divider, Form, InputNumber, Row, Select, Tooltip, Typography } from 'antd';
import type { FormInstance } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { AREA_IMPORTANCE_LABEL, HAZARD_POINT_TYPE_LABEL, type SurveyPointType } from './types';
import type { AreaImportance, RiskIndicatorRow } from './types';
import { getAreaImportanceTooltipLines } from './appendixBSync';
import { listAppendixAuxiliarySurveyFields } from './compositeConditionalSurvey';
import {
  getAppendixBSurveyParts,
  isCompositeAppendixNumericSurvey,
  listAppendixBoundIndicatorsForPoint,
} from './appendixBSurveyBinding';
import { getCompositeAppendixBSurveyParts } from './compositeAppendixScoring';
import { APPENDIX_B_CONDITION_FIELDS_BY_POINT_TYPE, COMMON_APPENDIX_CONDITION_FIELDS } from './appendixBConditionFields';
import { AuxiliarySurveyFieldLabel } from './AuxiliarySurveyFieldLabel';
import { surveyFieldGridRow } from './surveyFormLayout';
import {
  createNumericSurveyFormRulesByFieldKey,
  getNumericConstraint,
} from './numericIndicatorConstraints';
import { SurveyFieldRangeError } from './SurveyFieldRangeError';

const { Text } = Typography;

/** 附录 B 共性字段：说明可优先从易涝点主数据带入 */
const AUTO_FILL_FROM_REGISTRY_HINT = '优先根据易涝点基础信息自动填充';

const HINT_ICON_STYLE: React.CSSProperties = {
  marginLeft: 6,
  color: 'rgba(0,0,0,0.45)',
  fontSize: 13,
  cursor: 'help',
};

function SectionTitleWithHint({
  title,
  hint,
}: {
  title: string;
  hint: React.ReactNode;
}) {
  return (
    <Text strong className="dq-survey-section-title">
      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
        {title}
        <Tooltip title={hint} placement="topLeft">
          <QuestionCircleOutlined style={HINT_ICON_STYLE} />
        </Tooltip>
      </span>
    </Text>
  );
}

function buildCommonInfoSectionHint(pointType?: SurveyPointType): React.ReactNode {
  return (
    <div style={{ maxWidth: 360, fontSize: 12, lineHeight: 1.55 }}>
      <div>名称、地址等基础信息来自主数据；下列共性信息四种易涝点类型均需填写。</div>
      <div style={{ marginTop: 6 }}>
        {pointType
          ? `已选类型：${HAZARD_POINT_TYPE_LABEL[pointType]}，请继续填写下方专用项。`
          : '选择易涝点后展开该类型专用表单项。'}
      </div>
    </div>
  );
}

const HISTORICAL_DISASTER_SECTION_HINT =
  '四种易涝点类型均需确认；选择「有历史灾情」为「是」后填写损失数值。';

function FieldLabelWithHint({ children }: { children: React.ReactNode }) {
  return (
    <span>
      {children}
      <Tooltip title={AUTO_FILL_FROM_REGISTRY_HINT} placement="topLeft">
        <QuestionCircleOutlined
          style={{ marginLeft: 6, color: 'rgba(0,0,0,0.45)', fontSize: 13, cursor: 'help' }}
        />
      </Tooltip>
    </span>
  );
}

function AreaImportanceLabel() {
  const area = Form.useWatch(['surveyPayload', 'appendixB', 'areaImportance']) as
    | AreaImportance
    | undefined;
  const lines = getAreaImportanceTooltipLines(area);
  return (
    <span>
      地区重要程度
      <Tooltip
        title={
          <div style={{ maxWidth: 360, fontSize: 12, lineHeight: 1.55 }}>
            {lines.map((line, i) => (
              <div key={i} style={{ marginBottom: line === '—' ? 4 : i < lines.length - 1 ? 6 : 0 }}>
                {line === '—' ? null : line}
              </div>
            ))}
          </div>
        }
        placement="topLeft"
      >
        <QuestionCircleOutlined
          style={{ marginLeft: 6, color: 'rgba(0,0,0,0.45)', fontSize: 13, cursor: 'help' }}
        />
      </Tooltip>
    </span>
  );
}

interface Props {
  pointType?: SurveyPointType;
  indicators?: RiskIndicatorRow[];
  form?: FormInstance;
}

type SurveyYesNoToken = 'yes' | 'no';

const SURVEY_YES_NO_OPTIONS: { value: SurveyYesNoToken; label: string }[] = [
  { value: 'yes', label: '是' },
  { value: 'no', label: '否' },
];

function toSurveyYesNoToken(value: boolean | undefined): SurveyYesNoToken | undefined {
  if (value === true) return 'yes';
  if (value === false) return 'no';
  return undefined;
}

function fromSurveyYesNoToken(value: SurveyYesNoToken | undefined): boolean | undefined {
  if (value === 'yes') return true;
  if (value === 'no') return false;
  return undefined;
}

/** 是/否下拉：表单存 boolean，Select 用字符串避免 antd 布尔选项异常 */
function YesNoSelect({
  value,
  onChange,
  placeholder = '请选择',
}: {
  value?: boolean;
  onChange?: (value: boolean | undefined) => void;
  placeholder?: string;
}) {
  return (
    <Select
      style={{ width: '100%' }}
      placeholder={placeholder}
      allowClear
      options={SURVEY_YES_NO_OPTIONS}
      value={toSurveyYesNoToken(value)}
      onChange={next => onChange?.(fromSurveyYesNoToken(next as SurveyYesNoToken | undefined))}
    />
  );
}

/** 附录 B：共性字段 + 按隐患点类型展开的专用字段 */
export const AppendixBSurveyFields: React.FC<Props> = ({ pointType, indicators = [], form }) => {
  const watchForm = form ?? Form.useFormInstance();
  const hasStorage = Form.useWatch(['surveyPayload', 'appendixB', 'hasStorageTank'], watchForm);
  const hasPump = Form.useWatch(['surveyPayload', 'appendixB', 'hasDrainagePump'], watchForm);
  const hasHistoricalDisaster = Form.useWatch(
    ['surveyPayload', 'appendixB', 'hasHistoricalDisaster'],
    watchForm,
  );
  const appendixAuxFields = pointType ? listAppendixAuxiliarySurveyFields(indicators, pointType) : [];

  return (
    <div>
      <SectionTitleWithHint title="共性信息" hint={buildCommonInfoSectionHint(pointType)} />
      <Row {...surveyFieldGridRow}>
        <Col span={12}>
          <Form.Item
            name={['surveyPayload', 'appendixB', 'areaImportance']}
            label={<AreaImportanceLabel />}
            rules={[{ required: true, message: '请选择地区重要程度' }]}
          >
            <Select options={Object.entries(AREA_IMPORTANCE_LABEL).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name={['surveyPayload', 'appendixB', 'maxHistoricalDepthCm']}
            label={<FieldLabelWithHint>最大历史积水深度 (cm)</FieldLabelWithHint>}
          >
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name={['surveyPayload', 'appendixB', 'hasStorageTank']}
            label={<FieldLabelWithHint>是否有调蓄池</FieldLabelWithHint>}
          >
            <YesNoSelect />
          </Form.Item>
        </Col>
        {hasStorage ? (
          <Col span={12}>
            <Form.Item name={['surveyPayload', 'appendixB', 'storageVolumeM3']} label="调蓄有效容积 (m³)">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
        ) : null}
        <Col span={12}>
          <Form.Item
            name={['surveyPayload', 'appendixB', 'hasDrainagePump']}
            label={<FieldLabelWithHint>是否有排涝泵站</FieldLabelWithHint>}
          >
            <YesNoSelect />
          </Form.Item>
        </Col>
        {hasPump ? (
          <Col span={12}>
            <Form.Item name={['surveyPayload', 'appendixB', 'pumpCapacityM3H']} label="泵排能力 (m³/h)">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
        ) : null}
        <Col span={12}>
          <Form.Item
            name={['surveyPayload', 'appendixB', 'hasMonitoring']}
            label={<FieldLabelWithHint>是否有监测设施</FieldLabelWithHint>}
          >
            <YesNoSelect />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name={['surveyPayload', 'appendixB', 'alarmDeviceNormal']}
            label={<FieldLabelWithHint>积水报警装置运行正常</FieldLabelWithHint>}
          >
            <YesNoSelect />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name={['surveyPayload', 'appendixB', 'hasEmergencyPlan']}
            label={<FieldLabelWithHint>是否有内涝应急预案</FieldLabelWithHint>}
          >
            <YesNoSelect />
          </Form.Item>
        </Col>
      </Row>

      <Divider />
      <SectionTitleWithHint title="历史灾情" hint={HISTORICAL_DISASTER_SECTION_HINT} />
      <Row {...surveyFieldGridRow}>
        <Col span={12}>
          <Form.Item
            name={['surveyPayload', 'appendixB', 'hasHistoricalDisaster']}
            label="有历史灾情"
          >
            <YesNoSelect placeholder="请选择" />
          </Form.Item>
        </Col>
        {hasHistoricalDisaster === true
          ? COMMON_APPENDIX_CONDITION_FIELDS.map(field => {
              const path = ['surveyPayload', 'appendixB', field.key] as const;
              const constraint = getNumericConstraint(field.key);
              return (
                <Col span={12} key={field.key}>
                  <Form.Item
                    name={[...path]}
                    label={field.label}
                    rules={createNumericSurveyFormRulesByFieldKey(field.key)}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      min={constraint?.min ?? 0}
                      max={constraint?.max}
                      step={constraint?.step}
                      precision={constraint?.precision}
                    />
                  </Form.Item>
                </Col>
              );
            })
          : null}
      </Row>

      {pointType ? (
        <>
          <Divider />
          <Text strong className="dq-survey-section-title">
            {HAZARD_POINT_TYPE_LABEL[pointType]}专用信息
          </Text>
          <Text type="secondary" className="dq-survey-section-hint">
            依据资料性附录「{HAZARD_POINT_TYPE_LABEL[pointType]}」信息采集表。
          </Text>
          {pointType === 'SUNKEN' ? <SunkenSpecificFields /> : null}
          {pointType === 'UNDERGROUND' ? <UndergroundSpecificFields /> : null}
          {pointType === 'LOW_LYING' ? <LowLyingSpecificFields /> : null}
          <AppendixIndicatorBoundFields pointType={pointType} indicators={indicators} />
          <AppendixAuxiliarySurveyFields fields={appendixAuxFields} />
          {pointType !== 'SUNKEN' &&
          !hasAppendixTypeSpecificContent(pointType, indicators, appendixAuxFields.length) ? (
            <OtherTypeSpecificHint pointType={pointType} />
          ) : null}
        </>
      ) : (
        <Text type="secondary" className="dq-survey-section-hint" style={{ marginTop: 8 }}>
          请在上方选择易涝点后，填写该类型专用表单项。
        </Text>
      )}
    </div>
  );
};

function hasAppendixTypeSpecificContent(
  pointType: SurveyPointType,
  indicators: RiskIndicatorRow[],
  auxiliaryCount: number,
): boolean {
  if ((APPENDIX_B_CONDITION_FIELDS_BY_POINT_TYPE[pointType] ?? []).length > 0) return true;
  if (auxiliaryCount > 0) return true;
  return listAppendixBoundIndicatorsForPoint(indicators, pointType).length > 0;
}

/** 由指标 survey.appendixBSurveyParts / appendixBFieldKey 驱动的类型专用数值项 */
function AppendixIndicatorBoundFields({
  pointType,
  indicators,
}: {
  pointType: SurveyPointType;
  indicators: RiskIndicatorRow[];
}) {
  const bound = listAppendixBoundIndicatorsForPoint(indicators, pointType);
  const fixedKeys = new Set(
    (APPENDIX_B_CONDITION_FIELDS_BY_POINT_TYPE[pointType] ?? []).map(f => f.key),
  );
  const rows: {
    ind: RiskIndicatorRow;
    partKey: string;
    label: string;
    required: boolean;
    numericRange?: import('./types').AuxiliaryNumericRange;
  }[] = [];
  for (const ind of bound) {
    const parts = isCompositeAppendixNumericSurvey(ind)
      ? getCompositeAppendixBSurveyParts(ind, pointType, indicators)
      : getAppendixBSurveyParts(ind);
    const required = ind.survey?.surveyRequired === true;
    for (const part of parts) {
      if (fixedKeys.has(part.appendixBFieldKey)) continue;
      rows.push({
        ind,
        partKey: part.appendixBFieldKey,
        label: part.label,
        required,
        numericRange: part.numericRange,
      });
    }
  }
  if (!rows.length) return null;

  return (
    <Row {...surveyFieldGridRow}>
      {rows.map(({ ind, partKey, label, required, numericRange }) => {
        const path = ['surveyPayload', 'appendixB', partKey] as const;
        const rangeSrc = numericRange ? { fieldKey: partKey, numericRange } : undefined;
        const constraint = getNumericConstraint(partKey, rangeSrc);
        return (
          <Col span={12} key={`${ind.id}-${partKey}`}>
            <Form.Item
              name={[...path]}
              label={
                <span>
                  {label}
                  {!ind.enabled ? (
                    <span style={{ marginLeft: 8, fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                      未启用·暂不计分
                    </span>
                  ) : null}
                </span>
              }
              rules={[
                ...(required ? [{ required: true, message: `请填写${label}` }] : []),
                ...createNumericSurveyFormRulesByFieldKey(partKey, rangeSrc),
              ]}
              extra={
                <SurveyFieldRangeError
                  ind={ind}
                  numericFieldKey={partKey}
                  valueNamePath={[...path]}
                  numericRange={numericRange}
                />
              }
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder={constraint?.rangeLabel ?? 'm'}
                min={constraint?.min}
                max={constraint?.max}
                step={constraint?.step}
                precision={constraint?.precision}
              />
            </Form.Item>
          </Col>
        );
      })}
    </Row>
  );
}

/** 下凹式立交桥/下穿道专用（附录 B 固定字段） */
function SunkenSpecificFields() {
  return (
    <Row {...surveyFieldGridRow}>
      <Col span={12}>
        <Form.Item name={['surveyPayload', 'appendixB', 'elevationM']} label="高程 (m)">
          <InputNumber style={{ width: '100%' }} min={0} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name={['surveyPayload', 'appendixB', 'sunkenDepthCm']} label="下凹深度 (cm)">
          <InputNumber style={{ width: '100%' }} min={0} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name={['surveyPayload', 'appendixB', 'catchmentAreaM2']} label="汇水面积 (m²)">
          <InputNumber style={{ width: '100%' }} min={0} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name={['surveyPayload', 'appendixB', 'rainInletMeetsStandard']} label="雨水口/沟满足规范">
          <YesNoSelect />
        </Form.Item>
      </Col>
    </Row>
  );
}

/** 地下空间专用（附录 B 固定字段：人行/车行出入口高程差） */
function UndergroundSpecificFields() {
  const fields = APPENDIX_B_CONDITION_FIELDS_BY_POINT_TYPE.UNDERGROUND ?? [];
  return (
    <Row {...surveyFieldGridRow}>
      {fields.map(field => {
        const path = ['surveyPayload', 'appendixB', field.key] as const;
        const constraint = getNumericConstraint(field.key);
        return (
          <Col span={12} key={field.key}>
            <Form.Item
              name={[...path]}
              label={field.label}
              rules={[
                { required: true, message: `请填写${field.label}` },
                ...createNumericSurveyFormRulesByFieldKey(field.key),
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder={constraint?.rangeLabel ?? 'm'}
                min={constraint?.min}
                max={constraint?.max}
                step={constraint?.step}
                precision={constraint?.precision}
              />
            </Form.Item>
          </Col>
        );
      })}
    </Row>
  );
}

/** 城市低洼路段专用（附录 B 固定字段：道路纵坡度 S） */
function LowLyingSpecificFields() {
  const fields = APPENDIX_B_CONDITION_FIELDS_BY_POINT_TYPE.LOW_LYING ?? [];
  return (
    <Row {...surveyFieldGridRow}>
      {fields.map(field => {
        const path = ['surveyPayload', 'appendixB', field.key] as const;
        const constraint = getNumericConstraint(field.key);
        return (
          <Col span={12} key={field.key}>
            <Form.Item
              name={[...path]}
              label={field.label}
              extra={
                constraint?.hint ? (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {constraint.hint}
                  </Text>
                ) : null
              }
              rules={createNumericSurveyFormRulesByFieldKey(field.key)}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder={constraint?.rangeLabel ?? field.unit ?? '%'}
                min={constraint?.min}
                max={constraint?.max}
                step={constraint?.step}
                precision={constraint?.precision}
                addonAfter={field.unit || undefined}
              />
            </Form.Item>
          </Col>
        );
      })}
    </Row>
  );
}

/** 由指标 auxiliaryCondition（surveyPlacement=appendix_b）驱动的专用信息字段 */
function AppendixAuxiliarySurveyFields({
  fields,
}: {
  fields: ReturnType<typeof listAppendixAuxiliarySurveyFields>;
}) {
  if (!fields.length) return null;

  return (
    <>
      <Row {...surveyFieldGridRow}>
        {fields.map(({ owner, config }) => {
          const path = ['surveyPayload', 'indicatorValues', config.fieldKey] as const;
          const constraint = getNumericConstraint(config.fieldKey, config);
          return (
            <Col span={12} key={config.fieldKey}>
              <Form.Item
                name={[...path]}
                label={<AuxiliarySurveyFieldLabel owner={owner} />}
                extra={
                  <SurveyFieldRangeError
                    ind={owner}
                    numericFieldKey={config.fieldKey}
                    valueNamePath={[...path]}
                  />
                }
                rules={createNumericSurveyFormRulesByFieldKey(config.fieldKey, config)}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder={constraint?.rangeLabel ?? config.label}
                  min={constraint?.min}
                  max={constraint?.max}
                  step={constraint?.step}
                  precision={constraint?.precision}
                />
              </Form.Item>
            </Col>
          );
        })}
      </Row>
      {fields.map(({ owner }) => (
        <Text key={owner.id} type="secondary" className="dq-survey-section-hint">
          「{owner.name}」分档请在「指标普查」Tab 填写；须先完成上方辅助条件字段。
        </Text>
      ))}
    </>
  );
}

function OtherTypeSpecificHint({ pointType }: { pointType: SurveyPointType }) {
  return (
    <Text type="secondary">
      「{HAZARD_POINT_TYPE_LABEL[pointType]}」无额外附录 B 专用扩展项，排水能力、汇流特征等请在「指标普查」Tab 中填写。
    </Text>
  );
}
