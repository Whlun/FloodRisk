import React, { useMemo } from 'react';
import { Alert, Button, Card, Col, Descriptions, Form, Row, Select, Space, Tag, Typography } from 'antd';
import {
  AREA_IMPORTANCE_LABEL,
  LEVEL1_FACTOR_LABEL,
  type AreaImportance,
  type HazardPointType,
  type IndicatorRiskLevelRow,
  type Level1Factor,
  type Level1Weights,
  type RegionalPreventionConfig,
  type RegionalPreventionRecord,
  type RiskIndicatorRow,
  type SurveyPayload,
} from './types';
import { calcTotalScore, mapScoreToLevel } from './scoreCalculator';
import { derivePreviewRuleSelections } from './deriveRuleSelectionsForRating';
import { formatMatchedScoreHint } from './scoreRuleDisplay';
import {
  buildScorePreviewDemoPayload,
  buildScorePreviewInitialPayload,
  extractRegionalIndicatorValues,
  retainRegionalIndicatorValues,
} from './surveyPreviewDefaults';
import {
  getPointSurveyIndicatorsForPoint,
  getPointSurveyIndicatorsForScoring,
  getRegionalPreventionIndicators,
} from './indicatorSurveyUtils';
import { isConditionalScoringEnabled } from './conditionalScoring';
import { SurveyValueInput } from './SurveyValueInput';
import { SurveyFieldLabel } from './SurveyFieldLabel';
import { SURVEY_MODAL_FORM_CLASS, surveyFieldGridRow } from './surveyFormLayout';
import { renderPointSurveyFieldGrid } from './pointSurveyFields';
import { SurveyFormSection } from './SurveyFormSection';
import { matchScoreRuleFromValue } from './scoreRuleMapping';
import {
  HAZARD_POINT_TYPE_SELECT_POPUP_PROPS,
  getHazardPointTypeSelectOptions,
  renderHazardPointTypeSelectOption,
} from './hazardPointTypeSelect';
import { HazardPointTypeHelpTip } from './HazardPointTypeHelpTip';
import type { SurveyPointType } from './types';

const { Text } = Typography;

const POINT_LEVEL1_ORDER: Level1Factor[] = ['HAZARD', 'FORMATION', 'BEARING'];

interface Props {
  indicators: RiskIndicatorRow[];
  indicatorLevels: IndicatorRiskLevelRow[];
  level1Weights: Level1Weights;
  /** 定级引用的全县防灾减灾配置 */
  regionalPrevention: RegionalPreventionConfig | null;
  /** 定级引用记录（展示批次说明） */
  activePreventionRecord: RegionalPreventionRecord | null;
}

function needsAreaImportanceField(list: RiskIndicatorRow[]): boolean {
  return list.some(
    ind =>
      isConditionalScoringEnabled(ind) &&
      ind.conditionalScoring?.source.type === 'appendix_b',
  );
}

export const ScorePreviewPage: React.FC<Props> = ({
  indicators,
  indicatorLevels,
  level1Weights,
  regionalPrevention,
  activePreventionRecord,
}) => {
  const [hazardType, setHazardType] = React.useState<HazardPointType>('SUNKEN');
  const [form] = Form.useForm<{ surveyPayload: SurveyPayload }>();

  const surveyPayload = Form.useWatch('surveyPayload', form) as SurveyPayload | undefined;
  const payload = surveyPayload ?? { appendixB: {}, indicatorValues: {} };

  const pointIndicators = useMemo(
    () => getPointSurveyIndicatorsForPoint(indicators, hazardType),
    [indicators, hazardType],
  );
  const regionalIndicators = useMemo(
    () => getRegionalPreventionIndicators(indicators),
    [indicators],
  );
  const scoringPointIndicators = useMemo(
    () => getPointSurveyIndicatorsForScoring(indicators, hazardType),
    [indicators, hazardType],
  );

  const allPreviewIndicators = useMemo(
    () => [...scoringPointIndicators, ...regionalIndicators],
    [scoringPointIndicators, regionalIndicators],
  );

  const regionalDefaults = useMemo(
    () => extractRegionalIndicatorValues(regionalPrevention, regionalIndicators),
    [regionalPrevention, regionalIndicators],
  );

  const initialSurveyPayload = useMemo(
    () => buildScorePreviewInitialPayload(indicators, hazardType, regionalPrevention),
    [indicators, hazardType, regionalPrevention],
  );

  const showAreaField = useMemo(
    () => needsAreaImportanceField(pointIndicators),
    [pointIndicators],
  );

  const derived = useMemo(
    () => derivePreviewRuleSelections(hazardType, payload, indicators),
    [hazardType, payload, indicators],
  );

  const result = useMemo(
    () => calcTotalScore(indicators, hazardType, derived.selections, level1Weights),
    [indicators, hazardType, derived.selections, level1Weights],
  );

  const mapped = useMemo(
    () => mapScoreToLevel(result.v, indicatorLevels),
    [result.v, indicatorLevels],
  );

  const buildPayloadForHazardType = (keepArea: boolean): SurveyPayload => {
    const prev = form.getFieldValue('surveyPayload') as SurveyPayload | undefined;
    return {
      appendixB:
        keepArea && prev?.appendixB?.areaImportance
          ? { areaImportance: prev.appendixB.areaImportance }
          : {},
      indicatorValues: retainRegionalIndicatorValues(
        prev?.indicatorValues ?? {},
        regionalIndicators,
      ),
    };
  };

  const restoreRegionalFromConfig = () => {
    const prev = form.getFieldValue('surveyPayload') as SurveyPayload | undefined;
    form.setFieldsValue({
      surveyPayload: {
        appendixB: prev?.appendixB ?? {},
        indicatorValues: {
          ...(prev?.indicatorValues ?? {}),
          ...regionalDefaults,
        },
      },
    });
  };

  const initDemoDefaults = () => {
    const prev = form.getFieldValue('surveyPayload') as SurveyPayload | undefined;
    const demo = buildScorePreviewDemoPayload(
      indicators,
      hazardType,
      regionalPrevention,
      prev?.appendixB?.areaImportance ?? 'COUNTY_KEY',
    );
    form.setFieldsValue({ surveyPayload: demo });
  };

  const handleHazardTypeChange = (v: HazardPointType) => {
    setHazardType(v);
    form.setFieldsValue({ surveyPayload: buildPayloadForHazardType(true) });
  };

  const renderIndicatorFields = (list: RiskIndicatorRow[]) =>
    renderPointSurveyFieldGrid(list, indicators, false, form);

  const preventionRefLabel = activePreventionRecord
    ? `${activePreventionRecord.label || activePreventionRecord.configAt}`
    : regionalPrevention
      ? '最近已完成配置'
      : null;

  return (
    <div className="dq-risk-page dq-score-preview-page">
      <div className="dq-score-preview-toolbar">
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="配置验收工具"
          description="按各指标「普查填报方式」录入原始值试算 V。全县防灾减灾因子默认引用「防灾减灾指标信息」定级版本，可修改且仅影响本次试算，不写入台账。"
        />
        <Card bordered={false} style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle" wrap>
            <Col>
              <Space size={4} align="center">
                <Text>点位类型：</Text>
                <Select
                  className="dq-score-preview-hazard-type-select"
                  style={{ width: 260 }}
                  value={hazardType}
                  onChange={handleHazardTypeChange}
                  options={getHazardPointTypeSelectOptions()}
                  {...HAZARD_POINT_TYPE_SELECT_POPUP_PROPS}
                  popupMatchSelectWidth={false}
                  popupClassName="dq-score-preview-hazard-type-select-dropdown"
                  optionRender={renderHazardPointTypeSelectOption}
                />
                <HazardPointTypeHelpTip pointType={hazardType as SurveyPointType} />
              </Space>
            </Col>
            <Col>
              <Button onClick={initDemoDefaults}>填充易涝点演示值</Button>
            </Col>
          </Row>
        </Card>
      </div>

      <div className="dq-score-preview-main">
        <section className="dq-score-preview-form-panel" aria-label="指标试算填报">
          <Card title="指标试算填报" bordered={false} className="dq-score-preview-form-card">
            <div className="dq-score-preview-form-scroll">
            <Form
              form={form}
              layout="vertical"
              className={SURVEY_MODAL_FORM_CLASS}
              initialValues={{ surveyPayload: initialSurveyPayload }}
            >
              {showAreaField ? (
                <SurveyFormSection
                  title="内涝基本信息（条件赋分）"
                  hint="部分指标阈值依赖「地区重要程度」，请先选择。"
                >
                  <Row {...surveyFieldGridRow}>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name={['surveyPayload', 'appendixB', 'areaImportance']}
                        label="地区重要程度"
                        rules={[{ required: true, message: '请选择地区重要程度' }]}
                      >
                        <Select<AreaImportance>
                          className="dq-survey-control-full"
                          placeholder="请选择"
                          options={(Object.keys(AREA_IMPORTANCE_LABEL) as AreaImportance[]).map(k => ({
                            value: k,
                            label: AREA_IMPORTANCE_LABEL[k],
                          }))}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </SurveyFormSection>
              ) : null}

              {POINT_LEVEL1_ORDER.map(l1 => {
                const group = pointIndicators.filter(i => i.level1 === l1);
                if (group.length === 0) return null;
                return (
                  <SurveyFormSection key={l1} title={LEVEL1_FACTOR_LABEL[l1]}>
                    {renderIndicatorFields(group)}
                  </SurveyFormSection>
                );
              })}

              {regionalIndicators.length > 0 ? (
                <SurveyFormSection
                  title={LEVEL1_FACTOR_LABEL.PREVENTION}
                  titleExtra={
                    preventionRefLabel ? (
                      <Tag color="blue" style={{ fontWeight: 400, margin: 0 }}>
                        引用：{preventionRefLabel}
                      </Tag>
                    ) : (
                      <Tag style={{ fontWeight: 400, margin: 0 }}>暂无数据引用配置</Tag>
                    )
                  }
                  headActions={
                    <Button onClick={restoreRegionalFromConfig} disabled={!regionalPrevention}>
                      恢复防灾减灾指标信息引用
                    </Button>
                  }
                  hint="默认取自「防灾减灾指标信息」数据引用版本，可直接修改以模拟不同全县 V₄，不影响正式台账。"
                >
                  {!regionalPrevention ? (
                    <Alert
                      type="warning"
                      showIcon
                      style={{ marginBottom: 8 }}
                      message="请先在防灾减灾指标信息中完成并设为数据引用"
                    />
                  ) : null}
                  {renderIndicatorFields(regionalIndicators)}
                </SurveyFormSection>
              ) : null}
            </Form>

            {derived.errors.length > 0 ? (
              <Alert
                type="warning"
                showIcon
                style={{ marginTop: 12 }}
                message="部分指标无法匹配赋分档"
                description={
                  <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                    {derived.errors.map(e => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                }
              />
            ) : null}
            </div>
          </Card>
        </section>
        <aside className="dq-score-preview-result-panel" aria-label="试算结果">
            <Card title="试算结果" bordered={false} className="dq-score-preview-result-card">
              <div className="dq-score-preview-result-hero">
                <Text type="secondary" className="dq-score-preview-result-hero-label">
                  风险等级
                </Text>
                {mapped ? (
                  <>
                    <Tag
                      color={mapped.color}
                      className="dq-score-preview-level-tag"
                      style={{ margin: 0 }}
                    >
                      {mapped.levelName}
                    </Tag>
                    <Text type="secondary" className="dq-score-preview-result-v">
                      综合分 V = {result.v.toFixed(4)}
                    </Text>
                  </>
                ) : (
                  <Text type="secondary">暂无匹配等级（请完善指标填报）</Text>
                )}
              </div>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="致灾因子 V₁">
                  {result.v1.toFixed(4)}（一级权重 {level1Weights.HAZARD.toFixed(3)}）
                </Descriptions.Item>
                <Descriptions.Item label="孕灾因子 V₂">
                  {result.v2.toFixed(4)}（一级权重 {level1Weights.FORMATION.toFixed(3)}）
                </Descriptions.Item>
                <Descriptions.Item label="承灾因子 V₃">
                  {result.v3.toFixed(4)}（一级权重 {level1Weights.BEARING.toFixed(3)}）
                </Descriptions.Item>
                <Descriptions.Item label="防灾减灾 V₄">
                  {result.v4.toFixed(4)}（一级权重 {level1Weights.PREVENTION.toFixed(3)}）
                </Descriptions.Item>
                <Descriptions.Item label="已匹配指标">
                  {Object.keys(derived.selections).length} / {allPreviewIndicators.length}
                </Descriptions.Item>
              </Descriptions>
            </Card>
        </aside>
      </div>
    </div>
  );
};
