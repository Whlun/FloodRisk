import React, { useCallback, useEffect, useMemo } from 'react';
import { Button, Col, Collapse, Divider, Form, Input, InputNumber, Row, Select, Space, Typography } from 'antd';
import { syncCompositeFormAggregateScoreRules } from './compositeFormAggregateSync';
import {
  compositePartConditionBindingKey,
  filterExclusiveCompositePartFieldOptions,
  resolveCompositePartSource,
} from './compositePartSource';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';
import type { HazardPointType, IndicatorAppendixBSurveyPart, RiskIndicatorRow } from './types';
import { DEFAULT_COMPOSITE_NUMERIC_RANGE } from './surveyTemplates';
import { getGuidelineTierBandTemplate } from './guidelineTierBandTemplates';
import { getValidTierBands } from './compositeSurveyHydration';
import {
  COMPOSITE_PART_SURVEY_FIELD_EXTRA,
  COMPOSITE_PART_SURVEY_FIELD_LABEL,
  COMPOSITE_PART_SURVEY_FIELD_PLACEHOLDER,
  COMPOSITE_PART_SURVEY_FIELD_REQUIRED,
  findAppendixBSurveyPartOption,
} from './compositePartFieldBinding';
import {
  findIndicatorBySurveyFieldKey,
  resolveAppendixBValueFieldKey,
  resolveCompositePartNumericRange,
} from './numericIndicatorConstraints';
import { resolveCompositePartUnit } from './compositePartUnit';
import {
  SURVEY_BASIC_INFO_SOURCE_LABEL,
  getCompositeIndicatorPartFieldOptions,
  getCompositeSurveyPartFieldOptions,
  isConditionSourceFilterIncomplete,
  type BasicInfoConditionFieldContext,
  type ConditionSourceFilterContext,
} from './conditionalScoring';
import { COMPOSITE_AGGREGATION_OPTIONS } from './compositeAggregation';
import type { ScoreConditionSource } from './types';
import { defaultApplicableTypesForLevel1, isFormationLevel1 } from './indicatorApplicableTypes';
import { mergeIndicatorSurveyConfig } from './indicatorSurveyUtils';
import { NumericScoreRuleMatchFields } from './NumericScoreRuleMatchFields';
import { formLabelWithHelp } from './FormLabelHelpTip';
import {
  formatNumericMatchLabel,
  refreshAutoTierBandLabels,
  shouldRefreshTierBandLabel,
} from './scoreRuleNumericBands';
import { COMPOSITE_SCORING_COPY } from './compositeScoringCopy';
import { APPENDIX_B_BOOLEAN_PREFLIGHT_FIELDS } from './compositePreflightGate';

const { Text } = Typography;


interface Props {
  form: FormInstance;
  disabled?: boolean;
  allIndicators: RiskIndicatorRow[];
  defaultIndicators?: RiskIndicatorRow[];
  selfCode?: string;
}

function resolveCompositePartSurveyFieldHelp(
  sourceType: ScoreConditionSource['type'],
  fieldExtra: string | undefined,
  rangeGuide?: ReturnType<typeof resolveCompositePartNumericRange>,
): string {
  const exclusive = '各子项条件字段不可重复选用；其它子项已占用的项不会出现在下拉中。';
  if (sourceType === 'indicator') {
    const base = rangeGuide?.rangeLabel
      ? `取值来自指标普查。配置分档阈值请参考：${rangeGuide.rangeLabel}。`
      : '仅可选择数值型指标；取值来自指标普查，不在「类型专用信息」重复填报。';
    return `${base}${exclusive}`;
  }
  return `${fieldExtra ?? COMPOSITE_PART_SURVEY_FIELD_EXTRA}${exclusive}`;
}

function applyCompositePartNumericRange(
  form: FormInstance,
  partFieldName: number,
  source: ScoreConditionSource,
  allIndicators: RiskIndicatorRow[],
  indicatorCode: string,
  partIndex: number,
): void {
  const range = resolveCompositePartNumericRange(source, allIndicators, {
    indicatorCode,
    partIndex,
  });
  const base = ['survey', 'appendixBSurveyParts', partFieldName] as const;
  if (range) {
    form.setFieldValue([...base, 'numericRange'], { ...range });
  }
}

function syncCompositePartFieldBinding(
  form: FormInstance,
  partFieldName: number,
  partIndex: number,
  source: ScoreConditionSource,
  indicatorCode: string,
  allIndicators: RiskIndicatorRow[],
) {
  const base = ['survey', 'appendixBSurveyParts', partFieldName] as const;
  form.setFieldValue([...base, 'source'], source);
  if (source.type === 'indicator') {
    form.setFieldValue([...base, 'appendixBFieldKey'], source.key);
    form.setFieldValue([...base, 'valueFieldKey'], source.key);
    const ref = findIndicatorBySurveyFieldKey(source.key, allIndicators);
    if (ref) {
      const label = form.getFieldValue([...base, 'label']) as string | undefined;
      if (!label?.trim() || /^子项\s*\d+$/.test(label.trim())) {
        form.setFieldValue([...base, 'label'], ref.name);
      }
    }
    applyCompositePartNumericRange(form, partFieldName, source, allIndicators, indicatorCode, partIndex);
    refreshPartTierBandLabels(form, partFieldName, source, allIndicators, indicatorCode, partIndex);
    return;
  }
  const appendixBFieldKey = source.key;
  form.setFieldValue([...base, 'appendixBFieldKey'], appendixBFieldKey);
  form.setFieldValue(
    [...base, 'valueFieldKey'],
    resolveAppendixBValueFieldKey(appendixBFieldKey, indicatorCode, partIndex),
  );
  const preset = findAppendixBSurveyPartOption(appendixBFieldKey);
  if (preset?.defaultPartLabel) {
    const label = form.getFieldValue([...base, 'label']) as string | undefined;
    if (!label?.trim() || /^子项\s*\d+$/.test(label.trim())) {
      form.setFieldValue([...base, 'label'], preset.defaultPartLabel);
    }
  }
  const tmpl = getGuidelineTierBandTemplate(appendixBFieldKey);
  const currentBands = form.getFieldValue([...base, 'tierBands']);
  if (tmpl && getValidTierBands(currentBands).length < 2) {
    form.setFieldValue(
      [...base, 'tierBands'],
      tmpl.tierBands.map(b => ({ ...b, match: { ...b.match } })),
    );
    syncCompositeFormAggregateScoreRules(form);
  }
  applyCompositePartNumericRange(
    form,
    partFieldName,
    { type: 'appendix_b', key: appendixBFieldKey },
    allIndicators,
    indicatorCode,
    partIndex,
  );
  refreshPartTierBandLabels(
    form,
    partFieldName,
    { type: 'appendix_b', key: appendixBFieldKey },
    allIndicators,
    indicatorCode,
    partIndex,
  );
}

function refreshPartTierBandLabels(
  form: FormInstance,
  partFieldName: number,
  source: ScoreConditionSource,
  allIndicators: RiskIndicatorRow[],
  indicatorCode: string,
  partIndex: number,
): void {
  const tierBandsListPath = ['survey', 'appendixBSurveyParts', partFieldName, 'tierBands'] as const;
  const bands = form.getFieldValue([...tierBandsListPath]) as IndicatorAppendixBSurveyPart['tierBands'];
  if (!bands?.length) return;
  const unit = resolveCompositePartUnit(source, allIndicators, { indicatorCode, partIndex });
  const next = refreshAutoTierBandLabels(bands, { unit });
  form.setFieldValue([...tierBandsListPath], next);
  syncCompositeFormAggregateScoreRules(form);
}

/** 某子项改选条件字段后，清空其它子项上的重复绑定 */
function reconcileExclusiveCompositePartFields(
  form: FormInstance,
  parts: IndicatorAppendixBSurveyPart[] | undefined,
  changedPartIndex: number,
): void {
  const list = parts ?? [];
  const changed = list[changedPartIndex];
  if (!changed) return;
  const source = resolveCompositePartSource(changed);
  if (!source.key) return;
  const claimed = compositePartConditionBindingKey(source.type, source.key);
  list.forEach((part, i) => {
    if (i === changedPartIndex) return;
    const other = resolveCompositePartSource(part);
    if (!other.key) return;
    if (compositePartConditionBindingKey(other.type, other.key) !== claimed) return;
    const base = ['survey', 'appendixBSurveyParts', i] as const;
    form.setFieldValue([...base, 'source'], { type: other.type, key: '' });
    form.setFieldValue([...base, 'appendixBFieldKey'], undefined);
    form.setFieldValue([...base, 'valueFieldKey'], undefined);
    form.setFieldValue([...base, 'numericRange'], undefined);
  });
}

interface CompositePartCardProps {
  form: FormInstance;
  partField: { name: number; key: React.Key };
  partIndex: number;
  indicatorCode?: string;
  selfFieldKey?: string;
  allIndicators: RiskIndicatorRow[];
  disabled?: boolean;
  fieldDisabled?: boolean;
  fieldExtra?: string;
  appendixSelectOptions: { value: string; label: string }[];
  indicatorSelectOptions: { value: string; label: string }[];
  canRemove: boolean;
  onRemove: () => void;
}

const COMPOSITE_PART_SOURCE_OPTIONS = [
  { value: 'appendix_b' as const, label: SURVEY_BASIC_INFO_SOURCE_LABEL },
  { value: 'indicator' as const, label: '本点其他指标' },
];

function CompositeAppendixPartCard({
  form,
  partField,
  partIndex,
  indicatorCode,
  selfFieldKey,
  allIndicators,
  disabled,
  fieldDisabled,
  fieldExtra,
  appendixSelectOptions,
  indicatorSelectOptions,
  canRemove,
  onRemove,
}: CompositePartCardProps) {
  const sourceTypeWatch = Form.useWatch(
    ['survey', 'appendixBSurveyParts', partField.name, 'source', 'type'],
    form,
  ) as ScoreConditionSource['type'] | undefined;
  const sourceType = sourceTypeWatch ?? 'appendix_b';
  const fieldSelectOptions =
    sourceType === 'indicator' ? indicatorSelectOptions : appendixSelectOptions;
  const fieldName =
    sourceType === 'indicator'
      ? ([partField.name, 'source', 'key'] as const)
      : ([partField.name, 'appendixBFieldKey'] as const);
  const indicatorKeyWatch = Form.useWatch(
    ['survey', 'appendixBSurveyParts', partField.name, 'source', 'key'],
    form,
  ) as string | undefined;
  const appendixKeyWatch = Form.useWatch(
    ['survey', 'appendixBSurveyParts', partField.name, 'appendixBFieldKey'],
    form,
  ) as string | undefined;
  const allPartsWatch = Form.useWatch(['survey', 'appendixBSurveyParts'], form) as
    | IndicatorAppendixBSurveyPart[]
    | undefined;
  const partSourceKey =
    sourceType === 'indicator' ? indicatorKeyWatch?.trim() : appendixKeyWatch?.trim();
  const availableFieldOptions = React.useMemo(() => {
    const base = fieldSelectOptions.filter(
      o => sourceType !== 'indicator' || o.value !== selfFieldKey,
    );
    return filterExclusiveCompositePartFieldOptions(
      base,
      allPartsWatch,
      partIndex,
      sourceType,
      partSourceKey,
    );
  }, [
    fieldSelectOptions,
    allPartsWatch,
    partIndex,
    sourceType,
    partSourceKey,
    selfFieldKey,
  ]);
  const rangeGuide = React.useMemo(() => {
    if (!partSourceKey) return undefined;
    return resolveCompositePartNumericRange(
      { type: sourceType, key: partSourceKey },
      allIndicators,
      { indicatorCode: indicatorCode ?? 'IND', partIndex },
    );
  }, [partSourceKey, sourceType, allIndicators, indicatorCode, partIndex]);
  const partUnit = React.useMemo(() => {
    if (!partSourceKey) return undefined;
    return resolveCompositePartUnit(
      { type: sourceType, key: partSourceKey },
      allIndicators,
      { indicatorCode: indicatorCode ?? 'IND', partIndex },
    );
  }, [partSourceKey, sourceType, allIndicators, indicatorCode, partIndex]);
  const guidelineTemplate = getGuidelineTierBandTemplate(appendixKeyWatch);
  const tierBandsWatch = Form.useWatch(
    ['survey', 'appendixBSurveyParts', partField.name, 'tierBands'],
    form,
  ) as unknown[] | undefined;
  const tierBandsListKey = `${appendixKeyWatch ?? ''}-${tierBandsWatch?.length ?? 0}-${getValidTierBands(tierBandsWatch as IndicatorAppendixBSurveyPart['tierBands']).length}-${partUnit ?? ''}`;
  const tierBandsListPath = useMemo(
    () => ['survey', 'appendixBSurveyParts', partField.name, 'tierBands'] as const,
    [partField.name],
  );

  const syncTierBandLabel = useCallback(
    (bandIndex: number) => {
      queueMicrotask(() => {
        const bands = (form.getFieldValue([...tierBandsListPath]) ??
          []) as IndicatorAppendixBSurveyPart['tierBands'];
        const band = bands[bandIndex];
        if (!band?.match) return;
        const unit = partUnit;
        if (!shouldRefreshTierBandLabel(band, unit)) return;
        const auto = formatNumericMatchLabel(band.match, { unit });
        if (!auto || auto === band.riskTier) return;
        form.setFieldValue(
          [...tierBandsListPath],
          bands.map((b, i) => (i === bandIndex ? { ...b, riskTier: auto } : b)),
        );
        syncCompositeFormAggregateScoreRules(form);
      });
    },
    [form, tierBandsListPath, partUnit],
  );

  useEffect(() => {
    if (disabled || !partSourceKey) return;
    const bands = form.getFieldValue([...tierBandsListPath]) as IndicatorAppendixBSurveyPart['tierBands'];
    if (!bands?.length) return;
    const unit = partUnit;
    let changed = false;
    const next = bands.map(b => {
      if (!b?.match) return b;
      const [refreshed] = refreshAutoTierBandLabels([b], { unit });
      if (!refreshed || refreshed.riskTier === b.riskTier) return b;
      changed = true;
      return refreshed;
    });
    if (!changed) return;
    form.setFieldValue([...tierBandsListPath], next);
    syncCompositeFormAggregateScoreRules(form);
  }, [disabled, form, tierBandsListPath, partSourceKey, partUnit]);

  useEffect(() => {
    if (disabled || !appendixKeyWatch?.trim()) return;
    const bands = form.getFieldValue(['survey', 'appendixBSurveyParts', partField.name, 'tierBands']);
    if (getValidTierBands(bands).length >= 2) return;
    const tmpl = getGuidelineTierBandTemplate(appendixKeyWatch);
    if (!tmpl) return;
    form.setFieldValue(
      ['survey', 'appendixBSurveyParts', partField.name, 'tierBands'],
      tmpl.tierBands.map(b => ({ ...b, match: { ...b.match } })),
    );
    refreshPartTierBandLabels(
      form,
      partField.name,
      { type: 'appendix_b', key: appendixKeyWatch },
      allIndicators,
      indicatorCode ?? 'IND',
      partIndex,
    );
  }, [appendixKeyWatch, disabled, form, partField.name, allIndicators, indicatorCode, partIndex]);

  useEffect(() => {
    if (disabled || !partSourceKey) return;
    applyCompositePartNumericRange(
      form,
      partField.name,
      { type: sourceType, key: partSourceKey },
      allIndicators,
      indicatorCode ?? 'IND',
      partIndex,
    );
  }, [
    partSourceKey,
    sourceType,
    allIndicators,
    disabled,
    form,
    partField.name,
    indicatorCode,
    partIndex,
  ]);

  return (
    <div
      style={{
        marginBottom: 16,
        padding: 12,
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 8,
      }}
    >
      <Space style={{ marginBottom: 8 }}>
        <Text strong>子项 {partIndex + 1}</Text>
        {!disabled && canRemove ? (
          <Button type="link" danger size="small" icon={<MinusCircleOutlined />} onClick={onRemove}>
            删除子项
          </Button>
        ) : null}
        {!disabled && !canRemove ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            至少保留 1 个子项
          </Text>
        ) : null}
      </Space>
      <Form.Item
        name={[partField.name, 'label']}
        label={formLabelWithHelp(
          '显示名称',
          COMPOSITE_SCORING_COPY.partDisplayNameHelp,
          '显示名称说明',
        )}
        rules={[{ required: true, message: '请填写名称' }]}
      >
        <Input disabled={disabled} placeholder="如 人行出入口与室外地面高程差（H/m）" />
      </Form.Item>
      <Row gutter={12}>
        <Col span={12}>
          <Form.Item
            name={[partField.name, 'source', 'type']}
            label="条件来源类型"
            initialValue="appendix_b"
            rules={[{ required: true, message: '请选择来源类型' }]}
          >
            <Select
              disabled={disabled}
              options={COMPOSITE_PART_SOURCE_OPTIONS}
              onChange={(t: ScoreConditionSource['type']) => {
                const base = ['survey', 'appendixBSurveyParts', partField.name] as const;
                form.setFieldValue([...base, 'source'], { type: t, key: '' });
                form.setFieldValue([...base, 'appendixBFieldKey'], undefined);
                form.setFieldValue([...base, 'valueFieldKey'], undefined);
                form.setFieldValue([...base, 'numericRange'], undefined);
                syncCompositeFormAggregateScoreRules(form);
              }}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name={fieldName}
            label={formLabelWithHelp(
              sourceType === 'indicator' ? '本点其他指标' : COMPOSITE_PART_SURVEY_FIELD_LABEL,
              resolveCompositePartSurveyFieldHelp(sourceType, fieldExtra, rangeGuide),
              '条件字段说明',
            )}
            rules={[
              {
                required: true,
                message:
                  sourceType === 'indicator'
                    ? '请选择数值型指标'
                    : COMPOSITE_PART_SURVEY_FIELD_REQUIRED,
              },
            ]}
          >
            <Select
              disabled={disabled || fieldDisabled}
              showSearch
              optionFilterProp="label"
              placeholder={
                sourceType === 'indicator'
                  ? '选择数值型指标'
                  : COMPOSITE_PART_SURVEY_FIELD_PLACEHOLDER
              }
              options={availableFieldOptions}
              onChange={v => {
                const key = String(v);
                if (sourceType === 'indicator') {
                  syncCompositePartFieldBinding(
                    form,
                    partField.name,
                    partIndex,
                    { type: 'indicator', key },
                    String(indicatorCode ?? ''),
                    allIndicators,
                  );
                } else {
                  syncCompositePartFieldBinding(
                    form,
                    partField.name,
                    partIndex,
                    { type: 'appendix_b', key },
                    String(indicatorCode ?? ''),
                    allIndicators,
                  );
                }
                const partsAfter = form.getFieldValue(['survey', 'appendixBSurveyParts']) as
                  | IndicatorAppendixBSurveyPart[]
                  | undefined;
                reconcileExclusiveCompositePartFields(form, partsAfter, partIndex);
                syncCompositeFormAggregateScoreRules(form);
              }}
            />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name={[partField.name, 'valueFieldKey']} hidden rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Collapse
        ghost
        size="small"
        style={{ marginBottom: 8 }}
        items={[
          {
            key: 'range',
            label: rangeGuide?.rangeLabel
              ? `数值合理范围 · ${rangeGuide.rangeLabel}`
              : '高级：数值合理范围（可选）',
            children: (
              <>
                {rangeGuide?.hint ? (
                  <Text
                    type="secondary"
                    style={{ display: 'block', fontSize: 12, lineHeight: 1.6, marginBottom: 8 }}
                  >
                    {rangeGuide.hint}
                  </Text>
                ) : null}
                <Space wrap>
                  <Form.Item name={[partField.name, 'numericRange', 'min']} label="最小">
                    <InputNumber disabled={disabled} />
                  </Form.Item>
                  <Form.Item name={[partField.name, 'numericRange', 'max']} label="最大">
                    <InputNumber disabled={disabled} />
                  </Form.Item>
                  <Form.Item name={[partField.name, 'numericRange', 'rangeLabel']} label="范围说明">
                    <Input disabled={disabled} style={{ width: 200 }} />
                  </Form.Item>
                  <Form.Item name={[partField.name, 'numericRange', 'hint']} label="分档参考" hidden>
                    <Input />
                  </Form.Item>
                </Space>
              </>
            ),
          },
        ]}
      />
      <Divider plain style={{ margin: '8px 0' }}>
        本子项分档（有序，先命中先生效）
      </Divider>
      {!disabled && guidelineTemplate ? (
        <Space style={{ marginBottom: 8 }}>
          <Button
            size="small"
            onClick={() => {
              form.setFieldValue(
                ['survey', 'appendixBSurveyParts', partField.name, 'tierBands'],
                guidelineTemplate.tierBands.map(b => ({ ...b, match: { ...b.match } })),
              );
              if (appendixKeyWatch) {
                refreshPartTierBandLabels(
                  form,
                  partField.name,
                  { type: 'appendix_b', key: appendixKeyWatch },
                  allIndicators,
                  indicatorCode ?? 'IND',
                  partIndex,
                );
              } else {
                syncCompositeFormAggregateScoreRules(form);
              }
            }}
          >
            填入{guidelineTemplate.label}
          </Button>
        </Space>
      ) : null}
      <Form.List key={tierBandsListKey} name={[partField.name, 'tierBands']}>
        {(bandFields, { add: addBand, remove: removeBand }) => (
          <>
            {bandFields.length > 0 ? (
              <Row gutter={8} style={{ marginBottom: 4 }}>
                <Col span={11}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    匹配区间（本子项）
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
            {bandFields.map(bandField => (
              <Row key={bandField.key} gutter={8} align="middle" style={{ marginBottom: 8 }}>
                <Col span={11}>
                  <NumericScoreRuleMatchFields
                    field={bandField}
                    disabled={disabled}
                    listPath={[...tierBandsListPath]}
                    matchKey="match"
                    unit={partUnit}
                    onMatchChange={() => syncTierBandLabel(bandField.name as number)}
                  />
                </Col>
                <Col span={4}>
                  <Form.Item
                    {...bandField}
                    name={[bandField.name, 'score']}
                    rules={[{ required: true, message: '请填写标准分' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber
                      min={0}
                      max={1}
                      step={0.05}
                      disabled={disabled}
                      style={{ width: '100%' }}
                      placeholder="标准分"
                    />
                  </Form.Item>
                </Col>
                <Col span={7}>
                  <Form.Item
                    {...bandField}
                    name={[bandField.name, 'riskTier']}
                    rules={[{ required: true, message: '请填写分档描述' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Input disabled={disabled} placeholder="配置区间后自动生成，可修改" />
                  </Form.Item>
                </Col>
                {!disabled ? (
                  <Col flex="none">
                    <Button
                      type="link"
                      danger
                      size="small"
                      onClick={() => {
                        removeBand(bandField.name);
                        syncCompositeFormAggregateScoreRules(form);
                      }}
                    >
                      删除
                    </Button>
                  </Col>
                ) : null}
              </Row>
            ))}
            {!disabled ? (
              <Button
                type="dashed"
                size="small"
                onClick={() => {
                  const nextIdx = bandFields.length;
                  addBand({ riskTier: '', score: 0, match: { kind: 'lt', value: 0 } });
                  syncTierBandLabel(nextIdx);
                  syncCompositeFormAggregateScoreRules(form);
                }}
                icon={<PlusOutlined />}
              >
                添加赋分档
              </Button>
            ) : null}
          </>
        )}
      </Form.List>
    </div>
  );
}

/** 复合附录 B 数值子项配置（赋分规则 Tab） */
export const CompositeAppendixSurveyConfigFields: React.FC<Props> = ({
  form,
  disabled,
  allIndicators,
  defaultIndicators,
  selfCode,
}) => {
  const code = Form.useWatch('code', form) as string | undefined;
  const level1Watch = Form.useWatch('level1', form) as RiskIndicatorRow['level1'] | undefined;
  const applicableTypesWatch = Form.useWatch('applicableTypes', form) as HazardPointType[] | undefined;
  const surveyWatch = Form.useWatch('survey', form) as RiskIndicatorRow['survey'] | undefined;

  const basicInfoConditionContext = useMemo((): BasicInfoConditionFieldContext | undefined => {
    const level1 = level1Watch;
    if (!level1) return undefined;
    const types = applicableTypesWatch?.length
      ? applicableTypesWatch
      : defaultApplicableTypesForLevel1(level1);
    return {
      level1,
      applicableTypes: isFormationLevel1(level1) ? types : (['GLOBAL'] as HazardPointType[]),
      code: ((form.getFieldValue('code') as string | undefined) ?? selfCode)?.trim() || undefined,
      survey: surveyWatch,
    };
  }, [level1Watch, applicableTypesWatch, selfCode, surveyWatch, form]);

  const selfRow = useMemo((): RiskIndicatorRow | undefined => {
    if (!basicInfoConditionContext?.level1) return undefined;
    const codeTrim = basicInfoConditionContext.code ?? '';
    const fromList = codeTrim ? allIndicators.find(i => i.code === codeTrim) : undefined;
    const draft: RiskIndicatorRow = {
      ...(fromList ?? {
        id: codeTrim || 'draft',
        code: codeTrim || 'draft',
        name: (form.getFieldValue('name') as string) || '新指标',
        level1: basicInfoConditionContext.level1,
        applicableTypes: basicInfoConditionContext.applicableTypes,
        weight: 0,
        enabled: true,
        valueType: 'numeric',
        updatedAt: '',
        scoreRules: [],
      }),
      level1: basicInfoConditionContext.level1,
      applicableTypes: basicInfoConditionContext.applicableTypes,
      survey: surveyWatch ?? fromList?.survey,
    } as RiskIndicatorRow;
    return mergeIndicatorSurveyConfig(draft, fromList);
  }, [allIndicators, basicInfoConditionContext, form, selfCode, surveyWatch]);

  const conditionFilterCtx = useMemo((): ConditionSourceFilterContext | undefined => {
    if (!basicInfoConditionContext?.level1) return undefined;
    return {
      level1: basicInfoConditionContext.level1,
      applicableTypes: basicInfoConditionContext.applicableTypes,
      code: basicInfoConditionContext.code,
    };
  }, [basicInfoConditionContext]);

  const partFieldOptions = useMemo(
    () =>
      getCompositeSurveyPartFieldOptions(
        selfRow ?? basicInfoConditionContext,
        allIndicators,
        basicInfoConditionContext,
        defaultIndicators,
      ),
    [selfRow, basicInfoConditionContext, allIndicators, defaultIndicators],
  );

  const indicatorPartOptions = useMemo(
    () => getCompositeIndicatorPartFieldOptions(allIndicators, conditionFilterCtx),
    [allIndicators, conditionFilterCtx],
  );

  const selfFieldKey = (surveyWatch?.fieldKey ?? code)?.trim();

  const conditionFilterIncomplete = isConditionSourceFilterIncomplete(
    basicInfoConditionContext
      ? {
          level1: basicInfoConditionContext.level1,
          applicableTypes: basicInfoConditionContext.applicableTypes,
          code: basicInfoConditionContext.code,
        }
      : undefined,
    'point',
  );

  const fieldExtra =
    conditionFilterIncomplete && level1Watch && isFormationLevel1(level1Watch)
      ? '请先在「基本信息」中选择适用隐患点类型；条件字段与条件赋分一致，仅展示该类型可填的数值项。'
      : level1Watch && isFormationLevel1(level1Watch)
        ? '选项与条件赋分「内涝基本信息 → 条件字段」一致，含类型专用数值项与历史灾情等共性项。'
        : '致灾/承灾/防灾减灾指标可选择内涝基本信息中的共性数值项（含历史灾情四项）及辅助条件（与条件赋分一致）。';

  const preflightEnabled = Form.useWatch(['survey', 'compositePreflightGate', 'appendixBField'], form);

  const partsWatch = Form.useWatch(['survey', 'appendixBSurveyParts'], form) as
    | IndicatorAppendixBSurveyPart[]
    | undefined;

  useEffect(() => {
    if (disabled || !partsWatch?.length) return;
    const allowed = new Set(partFieldOptions.map(o => o.value));
    let changed = false;
    const allowedInd = new Set(indicatorPartOptions.map(o => o.value));
    partsWatch.forEach((part, idx) => {
      const st = part?.source?.type ?? 'appendix_b';
      const key = (st === 'indicator' ? part?.source?.key : part?.appendixBFieldKey)?.trim();
      if (!key) return;
      const ok = st === 'indicator' ? allowedInd.has(key) : allowed.has(key);
      if (!ok) {
        if (st === 'indicator') {
          form.setFieldValue(['survey', 'appendixBSurveyParts', idx, 'source', 'key'], undefined);
        } else {
          form.setFieldValue(['survey', 'appendixBSurveyParts', idx, 'appendixBFieldKey'], undefined);
        }
        changed = true;
      }
    });
    if (changed) syncCompositeFormAggregateScoreRules(form);
  }, [partFieldOptions, indicatorPartOptions, partsWatch, disabled, form]);

  const selectOptions = useMemo(() => {
    const allowed = new Set(partFieldOptions.map(o => o.value));
    const extras: { value: string; label: string }[] = [];
    for (const part of partsWatch ?? []) {
      const key = part?.appendixBFieldKey?.trim();
      if (!key || allowed.has(key)) continue;
      const preset = findAppendixBSurveyPartOption(key);
      extras.push({ value: key, label: preset?.label ?? `已保存的自定义项（${key}）` });
    }
    return [...partFieldOptions, ...extras];
  }, [partFieldOptions, partsWatch]);

  return (
    <>
      <Divider plain style={{ margin: '4px 0 12px' }}>
        数值子项与分档
      </Divider>
      <Form.Item
        label={formLabelWithHelp(
          '前置门控（可选）',
          COMPOSITE_SCORING_COPY.preflightGateHelp,
          '前置门控说明',
        )}
      >
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item name={['survey', 'compositePreflightGate', 'appendixBField']} noStyle>
              <Select
                allowClear
                disabled={disabled}
                placeholder="选择布尔项"
                options={APPENDIX_B_BOOLEAN_PREFLIGHT_FIELDS}
              />
            </Form.Item>
          </Col>
          <Col span={5}>
            <Form.Item name={['survey', 'compositePreflightGate', 'when']} noStyle>
              <Select
                allowClear
                disabled={disabled || !preflightEnabled}
                placeholder="当值为"
                options={[
                  { value: true, label: '是' },
                  { value: false, label: '否' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={5}>
            <Form.Item name={['survey', 'compositePreflightGate', 'score']} noStyle>
              <InputNumber
                disabled={disabled || !preflightEnabled}
                placeholder="标准分 F"
                min={0}
                max={1}
                step={0.2}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name={['survey', 'compositePreflightGate', 'ruleLabel']} noStyle>
              <Input disabled={disabled || !preflightEnabled} placeholder="分档描述（可选）" />
            </Form.Item>
          </Col>
        </Row>
      </Form.Item>
      <Form.Item
        name={['survey', 'compositeAggregation']}
        label={formLabelWithHelp(
          '聚合方式',
          COMPOSITE_SCORING_COPY.aggregationHelp,
          '聚合方式说明',
        )}
        initialValue="max_f"
      >
        <Select disabled={disabled} options={COMPOSITE_AGGREGATION_OPTIONS} />
      </Form.Item>

      <Form.List name={['survey', 'appendixBSurveyParts']}>
        {(partFields, { add: addPart, remove: removePart }) => (
          <>
            {partFields.map((partField, partIndex) => (
              <CompositeAppendixPartCard
                key={partField.key}
                form={form}
                partField={partField}
                partIndex={partIndex}
                indicatorCode={code}
                selfFieldKey={selfFieldKey}
                allIndicators={allIndicators}
                disabled={disabled}
                fieldDisabled={conditionFilterIncomplete}
                fieldExtra={fieldExtra}
                appendixSelectOptions={selectOptions}
                indicatorSelectOptions={indicatorPartOptions}
                canRemove={partFields.length > 1}
                onRemove={() => removePart(partField.name)}
              />
            ))}
            {!disabled ? (
              <Button
                type="dashed"
                onClick={() => {
                  const n = partFields.length + 1;
                  const codeTrim = String(code ?? 'IND').trim() || 'IND';
                  const appendixBFieldKey = `appendixPart${n}`;
                  addPart({
                    label: `子项 ${n}`,
                    source: { type: 'appendix_b', key: appendixBFieldKey },
                    appendixBFieldKey,
                    valueFieldKey: resolveAppendixBValueFieldKey(appendixBFieldKey, codeTrim, n - 1),
                    numericRange: { ...DEFAULT_COMPOSITE_NUMERIC_RANGE },
                    tierBands: [
                      { riskTier: '低', score: 0.2, match: { kind: 'gt', value: 0 } },
                      { riskTier: '高', score: 1, match: { kind: 'lt', value: 0 } },
                    ],
                  });
                }}
                block
                icon={<PlusOutlined />}
              >
                添加子项
              </Button>
            ) : null}
          </>
        )}
      </Form.List>
    </>
  );
};
