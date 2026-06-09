import React, { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Empty,
  Radio,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  HAZARD_POINT_TYPE_LABEL,
  LEVEL1_FACTOR_LABEL,
  type HazardPointType,
  type IndicatorArchitectureRecord,
  type Level1Factor,
  type Level1Weights,
  type RiskIndicatorRow,
  type SurveyPointType,
} from './types';
import { HazardPointTypeHelpTip } from './HazardPointTypeHelpTip';
import { IndicatorArchitectureLegend } from './IndicatorArchitectureLegend';
import { IndicatorRemarkHelpTip } from './IndicatorRemarkHelpTip';
import { Level1FactorHelpTip } from './Level1FactorHelpTip';
import {
  configToMergedIndicators,
  getActiveArchitectureRecord,
} from './indicatorArchitectureUtils';
import { ArchitectureVersionTag } from './ArchitectureVersionTag';
import { formatLevel1Formula, sumSiblingWeights } from './weightBalance';

const { Text, Title } = Typography;

const LEVEL1_ORDER: Level1Factor[] = ['HAZARD', 'FORMATION', 'BEARING', 'PREVENTION'];

const LEVEL1_COLOR: Record<Level1Factor, string> = {
  HAZARD: '#e6f4ff',
  FORMATION: '#fff7e6',
  BEARING: '#f6ffed',
  PREVENTION: '#fff0f6',
};

const LEVEL1_BORDER: Record<Level1Factor, string> = {
  HAZARD: '#1677ff',
  FORMATION: '#fa8c16',
  BEARING: '#52c41a',
  PREVENTION: '#eb2f96',
};

const FORMATION_TYPES: HazardPointType[] = ['SUNKEN', 'TUNNEL', 'UNDERGROUND', 'LOW_LYING'];

interface Props {
  baseIndicators: RiskIndicatorRow[];
  architectureRecords: IndicatorArchitectureRecord[];
  onGoToVersions?: () => void;
}

function sortArchChildren(children: RiskIndicatorRow[]): RiskIndicatorRow[] {
  return [...children].sort((a, b) => {
    if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
    return a.code.localeCompare(b.code, 'zh-CN');
  });
}

function filterColumnIndicators(
  indicators: RiskIndicatorRow[],
  level1: Level1Factor,
  formationType: HazardPointType,
): RiskIndicatorRow[] {
  if (level1 === 'FORMATION') {
    return indicators.filter(
      i => i.level1 === 'FORMATION' && i.applicableTypes.includes(formationType),
    );
  }
  return indicators.filter(i => i.level1 === level1 && i.applicableTypes.includes('GLOBAL'));
}

function buildArchitectureData(
  indicators: RiskIndicatorRow[],
  formationType: HazardPointType,
  level1Weights: Level1Weights,
) {
  return LEVEL1_ORDER.map(level1 => {
    const children = sortArchChildren(filterColumnIndicators(indicators, level1, formationType));
    return {
      level1,
      weight: level1Weights[level1],
      label: LEVEL1_FACTOR_LABEL[level1],
      children,
    };
  });
}

/** 只读架构图预览：展示当前定级引用版本 */
export const IndicatorArchitecturePage: React.FC<Props> = ({
  baseIndicators,
  architectureRecords,
  onGoToVersions,
}) => {
  const [formationType, setFormationType] = useState<HazardPointType>('SUNKEN');
  const activeRecord = useMemo(
    () => getActiveArchitectureRecord(architectureRecords),
    [architectureRecords],
  );

  const mergedIndicators = useMemo(() => {
    if (!activeRecord) return baseIndicators.map(i => ({ ...i, enabled: false }));
    return configToMergedIndicators(baseIndicators, activeRecord.config);
  }, [baseIndicators, activeRecord]);

  const level1Weights = activeRecord?.config.level1Weights;

  const arch = useMemo(
    () =>
      level1Weights
        ? buildArchitectureData(mergedIndicators, formationType, level1Weights)
        : [],
    [mergedIndicators, formationType, level1Weights],
  );

  const visibleIndicators = useMemo(
    () =>
      mergedIndicators.filter(i => {
        if (i.level1 === 'FORMATION') return i.applicableTypes.includes(formationType);
        return i.applicableTypes.includes('GLOBAL');
      }),
    [mergedIndicators, formationType],
  );
  const enabledCount = visibleIndicators.filter(i => i.enabled).length;
  const totalCount = visibleIndicators.length;

  if (!activeRecord || !level1Weights) {
    return (
      <div className="dq-risk-page dq-indicator-arch">
        <Card bordered={false}>
          <Empty description="尚无定级引用的评价版本">
            <Button type="primary" onClick={onGoToVersions}>
              前往指标评价管理
            </Button>
          </Empty>
        </Card>
      </div>
    );
  }

  return (
    <div className="dq-risk-page dq-indicator-arch">
      <Card bordered={false} size="small" className="dq-arch-ref-banner">
        <Space wrap align="center">
          <Tag color="blue">定级引用</Tag>
          <ArchitectureVersionTag versionNo={activeRecord.versionNo} />
          <Text>
            配置时间：<strong>{activeRecord.configAt}</strong>
          </Text>
          {activeRecord.label ? (
            <Text type="secondary">批次：{activeRecord.label}</Text>
          ) : null}
          <Tag color={activeRecord.config.status === 'completed' ? 'success' : 'warning'}>
            {activeRecord.config.status === 'completed' ? '已完成' : '草稿'}
          </Tag>
          {onGoToVersions ? (
            <Button size="small" type="link" onClick={onGoToVersions}>
              管理版本
            </Button>
          ) : null}
        </Space>
      </Card>

      <IndicatorArchitectureLegend variant="preview" />

      <Card bordered={false} className="dq-arch-toolbar">
        <div className="dq-arch-toolbar-inner">
          <Space wrap align="center" size="small" className="dq-arch-toolbar-filters">
            <Text type="secondary">孕灾因子展示类型：</Text>
            <Radio.Group
              value={formationType}
              onChange={e => setFormationType(e.target.value)}
              optionType="button"
              buttonStyle="solid"
              size="small"
            >
              {FORMATION_TYPES.map(t => (
                <Radio.Button key={t} value={t}>
                  {HAZARD_POINT_TYPE_LABEL[t]}
                </Radio.Button>
              ))}
            </Radio.Group>
            <Text type="secondary">
              当前展示 {enabledCount} 启用 / {totalCount} 共
            </Text>
          </Space>
        </div>
      </Card>

      <div className="dq-arch-root">
        <div className="dq-arch-root-box">
          <Title level={4} style={{ margin: 0 }}>
            内涝风险评估综合分 V
          </Title>
          <Text type="secondary" className="dq-arch-formula">
            {formatLevel1Formula(level1Weights)}
          </Text>
        </div>
        <div className="dq-arch-connector dq-arch-connector-down" />
      </div>

      <div className="dq-arch-level1-row">
        {arch.map(node => {
          const vIndex = LEVEL1_ORDER.indexOf(node.level1) + 1;
          const enabledInCol = node.children.filter(c => c.enabled);
          const maxWeightInCol = Math.max(...node.children.map(c => c.weight), 0.001);
          const colSum = sumSiblingWeights(enabledInCol);

          return (
            <div key={node.level1} className="dq-arch-level1-col">
              <div
                className="dq-arch-level1-card"
                style={{
                  background: LEVEL1_COLOR[node.level1],
                  borderColor: LEVEL1_BORDER[node.level1],
                }}
              >
                <div className="dq-arch-level1-title">
                  <span>{node.label}</span>
                  <Level1FactorHelpTip level1={node.level1} />
                </div>
                <Tag color="blue">一级权重 ω = {node.weight.toFixed(3)}</Tag>
                <div className="dq-arch-level1-score">评估指标分数 V{vIndex}</div>
              </div>
              <div className="dq-arch-connector dq-arch-connector-down dq-arch-connector-short" />

              <div className="dq-arch-level2-stack">
                {node.level1 === 'FORMATION' && (
                  <div className="dq-arch-type-badge">
                    <span>{HAZARD_POINT_TYPE_LABEL[formationType]}</span>
                    <HazardPointTypeHelpTip pointType={formationType as SurveyPointType} />
                  </div>
                )}
                {node.children.length === 0 ? (
                  <Text type="secondary" className="dq-arch-empty">
                    无指标
                  </Text>
                ) : (
                  node.children.map(ind => (
                    <div
                      key={ind.id}
                      className={`dq-arch-level2-card${ind.enabled ? '' : ' dq-arch-level2-card-disabled'}`}
                    >
                      <div
                        className="dq-arch-weight-bar"
                        style={{
                          width: `${(ind.weight / maxWeightInCol) * 100}%`,
                          opacity: ind.enabled ? 1 : 0.35,
                        }}
                      />
                      <div className="dq-arch-level2-name">
                        <span className="dq-arch-level2-name-text">{ind.name}</span>
                        <IndicatorRemarkHelpTip remark={ind.remark} />
                        {!ind.enabled && (
                          <Tag className="dq-arch-disabled-tag" color="warning">
                            停用
                          </Tag>
                        )}
                      </div>
                      <div className="dq-arch-level2-meta">
                        <Space size={8} wrap>
                          <Tag color={ind.enabled ? 'success' : 'warning'}>
                            {ind.enabled ? '启用' : '停用'}
                          </Tag>
                          <span className="dq-arch-weight">ω={ind.weight.toFixed(3)}</span>
                        </Space>
                        <span className="dq-arch-rules">{ind.scoreRules.length} 档赋分</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {enabledInCol.length > 0 && (
                <div className="dq-arch-col-footer">
                  <div className="dq-arch-col-sum">
                    <Text type="secondary">启用指标权重合计</Text>
                    <Text strong type="success">
                      {colSum.toFixed(3)} / 1.000
                    </Text>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
