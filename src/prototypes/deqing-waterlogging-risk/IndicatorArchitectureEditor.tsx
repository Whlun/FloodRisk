import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  InputNumber,
  Popconfirm,
  Progress,
  Radio,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { EditOutlined } from '@ant-design/icons';
import {
  HAZARD_POINT_TYPE_LABEL,
  LEVEL1_FACTOR_LABEL,
  type HazardPointType,
  type IndicatorArchitectureConfig,
  type Level1Factor,
  type Level1Weights,
  type RiskIndicatorRow,
  type SurveyPointType,
} from './types';
import { HazardPointTypeHelpTip } from './HazardPointTypeHelpTip';
import { IndicatorArchitectureLegend } from './IndicatorArchitectureLegend';
import { IndicatorRemarkHelpTip } from './IndicatorRemarkHelpTip';
import { Level1FactorHelpTip } from './Level1FactorHelpTip';
import { isBuiltinIndicator } from './indicatorDefaultCompare';
import { validateIndicatorConfig } from './indicatorConfigReadiness';
import {
  buildConfigFromEditedIndicators,
  configToMergedIndicators,
  syncConfigWithIndicatorCatalog,
} from './indicatorArchitectureUtils';
import {
  applyWeightMap,
  collectArchitectureWeightIssues,
  formatLevel1Formula,
  getSiblingGroup,
  isLevel1WeightSumValid,
  isSiblingWeightSumValid,
  normalizeLevel1Weights,
  normalizeSiblingWeightMap,
  applyColumnRestoreFromDefaults,
  setSingleIndicatorWeightMap,
  setSingleLevel1Weight,
  sumLevel1Weights,
  sumSiblingWeights,
} from './weightBalance';

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

function cloneIndicators(rows: RiskIndicatorRow[]): RiskIndicatorRow[] {
  return rows.map(r => ({ ...r }));
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

function getArchitectureVisibleIndicators(
  indicators: RiskIndicatorRow[],
  formationType: HazardPointType,
): RiskIndicatorRow[] {
  return indicators.filter(i => {
    if (i.level1 === 'FORMATION') {
      return i.applicableTypes.includes(formationType);
    }
    return i.applicableTypes.includes('GLOBAL');
  });
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

function formationTypeForLevel1(level1: Level1Factor, formationType: HazardPointType): HazardPointType | undefined {
  return level1 === 'FORMATION' ? formationType : undefined;
}

export interface IndicatorArchitectureEditorProps {
  baseIndicators: RiskIndicatorRow[];
  defaultIndicators: RiskIndicatorRow[];
  initialConfig: IndicatorArchitectureConfig;
  onDraftChange?: (config: IndicatorArchitectureConfig) => void;
  /** 嵌入弹窗：保存/取消置于工具栏，不展示页内「校验并应用」 */
  embedded?: boolean;
  /** 只读查看：禁止修改权重、启用状态及恢复/归一化操作 */
  readOnly?: boolean;
  /** 只读模式下工具栏「编辑」入口（如评价版本详情弹窗内切换为编辑） */
  onEdit?: () => void;
  /** 嵌入弹窗时工具栏「取消」 */
  onCancel?: () => void;
  /** 嵌入弹窗时工具栏「保存」 */
  onSave?: () => void | Promise<void>;
  /** 保存请求进行中，阻止重复提交 */
  saving?: boolean;
  /** 当前内容不满足保存条件（如复制版本尚无实质修改） */
  saveDisabled?: boolean;
  saveDisabledReason?: string;
  /** 嵌入弹窗编辑已有版本时工具栏「删除」（置于保存左侧） */
  onDelete?: () => void;
  onRequestSave?: () => IndicatorArchitectureConfig | null;
}

export const IndicatorArchitectureEditor: React.FC<IndicatorArchitectureEditorProps> = ({
  baseIndicators,
  defaultIndicators,
  initialConfig,
  onDraftChange,
  embedded = false,
  readOnly = false,
  onEdit,
  onCancel,
  onSave,
  saving = false,
  saveDisabled = false,
  saveDisabledReason,
  onDelete,
}) => {
  const draftEmitBase = useMemo(
    () => syncConfigWithIndicatorCatalog(initialConfig, baseIndicators),
    [initialConfig, baseIndicators],
  );
  const syncedInitial = draftEmitBase;
  /** 打开弹窗时的已保存基准（编辑/详情进入时的 config），供「恢复默认」回退 */
  const savedIndicators = useMemo(
    () => cloneIndicators(configToMergedIndicators(baseIndicators, syncedInitial)),
    [baseIndicators, syncedInitial],
  );

  const [formationType, setFormationType] = useState<HazardPointType>('SUNKEN');
  const [draftIndicators, setDraftIndicators] = useState<RiskIndicatorRow[]>(() =>
    cloneIndicators(configToMergedIndicators(baseIndicators, syncedInitial)),
  );
  const [draftLevel1Weights, setDraftLevel1Weights] = useState<Level1Weights>(() => ({
    ...syncedInitial.level1Weights,
  }));

  const skipDraftEmitRef = useRef(true);

  useEffect(() => {
    const synced = syncConfigWithIndicatorCatalog(initialConfig, baseIndicators);
    setDraftIndicators(cloneIndicators(configToMergedIndicators(baseIndicators, synced)));
    setDraftLevel1Weights({ ...synced.level1Weights });
    skipDraftEmitRef.current = true;
  }, [initialConfig, baseIndicators]);

  useEffect(() => {
    if (!onDraftChange) return;
    if (skipDraftEmitRef.current) {
      skipDraftEmitRef.current = false;
      return;
    }
    onDraftChange(buildConfigFromEditedIndicators(draftEmitBase, draftIndicators, draftLevel1Weights));
  }, [draftIndicators, draftLevel1Weights, draftEmitBase, onDraftChange]);

  const buildDraftConfig = (
    nextIndicators: RiskIndicatorRow[],
    nextLevel1: Level1Weights,
  ): IndicatorArchitectureConfig =>
    buildConfigFromEditedIndicators(draftEmitBase, nextIndicators, nextLevel1);

  const arch = useMemo(
    () => buildArchitectureData(draftIndicators, formationType, draftLevel1Weights),
    [draftIndicators, formationType, draftLevel1Weights],
  );
  const visibleIndicators = useMemo(
    () => getArchitectureVisibleIndicators(draftIndicators, formationType),
    [draftIndicators, formationType],
  );
  const enabledCount = visibleIndicators.filter(i => i.enabled).length;
  const totalCount = visibleIndicators.length;
  const level1Sum = sumLevel1Weights(draftLevel1Weights);
  const level1Valid = isLevel1WeightSumValid(draftLevel1Weights);

  const patchGroupWeights = (weightMap: Record<string, number>) => {
    setDraftIndicators(prev => applyWeightMap(prev, weightMap));
  };

  const handleSave = () => {
    const issues = collectArchitectureWeightIssues(draftIndicators, draftLevel1Weights);
    if (issues.length > 0) {
      message.warning({
        content: (
          <div>
            <div style={{ marginBottom: 6 }}>以下权重合计须为 1.000 后方可保存：</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {issues.map((item, i) => (
                <li key={i}>
                  {item.label}：当前 {item.sum.toFixed(3)}
                </li>
              ))}
            </ul>
          </div>
        ),
        duration: 6,
      });
      return null;
    }
    return buildDraftConfig(draftIndicators, draftLevel1Weights);
  };

  const handleToggleEnabled = (ind: RiskIndicatorRow, enabled: boolean) => {
    if (enabled) {
      const readiness = validateIndicatorConfig(ind, draftIndicators);
      if (!readiness.ok) {
        message.error(readiness.blockers[0] ?? '指标配置不完整，请先在风险指标管理中完善后再启用');
        return;
      }
    }
    if (enabled && !isBuiltinIndicator(ind, defaultIndicators)) {
      message.info('用户新增指标：请设置 ω 并调整同列启用项权重合计为 1.000 后保存');
    }
    const ts = new Date().toISOString().slice(0, 19).replace('T', ' ');
    setDraftIndicators(prev =>
      prev.map(i => (i.id === ind.id ? { ...i, enabled, updatedAt: ts } : i)),
    );
    if (!enabled) {
      message.info('已标记停用：不参与赋分与同级合计，请调整同列启用指标 ω 或「按比例归一化」');
    }
  };

  const handleWeightChange = (_level1: Level1Factor, ind: RiskIndicatorRow, value: number | null) => {
    if (value == null || value === ind.weight) return;
    patchGroupWeights(setSingleIndicatorWeightMap(ind.id, value));
  };

  const handleLevel1WeightChange = (level1: Level1Factor, value: number | null) => {
    if (value == null || value === draftLevel1Weights[level1]) return;
    setDraftLevel1Weights(prev => setSingleLevel1Weight(prev, level1, value));
  };

  const handleNormalizeLevel1 = () => {
    setDraftLevel1Weights(prev => normalizeLevel1Weights(prev));
    message.success('已按当前比例归一化一级权重，合计为 1.000');
  };

  const handleRestoreLevel1 = () => {
    setDraftLevel1Weights({ ...syncedInitial.level1Weights });
    message.success('已恢复为上次保存的一级权重');
  };

  const handleRestoreAllDefaults = () => {
    setDraftLevel1Weights({ ...syncedInitial.level1Weights });
    setDraftIndicators(cloneIndicators(savedIndicators));
    message.success('已恢复为上次保存的配置');
  };

  const handleNormalizeColumn = (level1: Level1Factor) => {
    const hazardType = formationTypeForLevel1(level1, formationType);
    const group = getSiblingGroup(draftIndicators, level1, hazardType);
    if (group.length === 0) return;
    patchGroupWeights(normalizeSiblingWeightMap(group));
    message.success('已按当前比例归一化，同级合计为 1.000');
  };

  const handleRestoreColumn = (level1: Level1Factor) => {
    const columnChildren = filterColumnIndicators(draftIndicators, level1, formationType);
    if (columnChildren.length === 0) return;
    setDraftIndicators(prev =>
      applyColumnRestoreFromDefaults(
        prev,
        columnChildren.map(c => c.id),
        savedIndicators,
      ),
    );
    message.success('已恢复为上次保存的权重与启用状态');
  };

  const renderColumnFooter = (level1: Level1Factor, children: RiskIndicatorRow[]) => {
    if (readOnly) return null;

    const enabledChildren = children.filter(c => c.enabled);
    const disabledCount = children.length - enabledChildren.length;
    const sum = sumSiblingWeights(enabledChildren);
    const valid = enabledChildren.length === 0 || isSiblingWeightSumValid(sum);
    const percent = Math.min(100, Math.round(sum * 100));

    return (
      <div className={`dq-arch-col-footer${valid ? '' : ' dq-arch-col-footer-invalid'}`}>
        <div className="dq-arch-col-sum">
          <Text type="secondary">启用指标权重合计</Text>
          <Text strong type={valid ? 'success' : 'danger'}>
            {sum.toFixed(3)} / 1.000
          </Text>
        </div>
        {disabledCount > 0 && (
          <Text type="secondary" className="dq-arch-col-disabled-hint">
            含停用 {disabledCount} 条（保留 ω 预设，不参与合计与定级；停用后请调整启用项）
          </Text>
        )}
        <Progress
          percent={percent}
          size="small"
          showInfo={false}
          status={valid ? 'success' : 'exception'}
          strokeColor={valid ? '#52c41a' : '#ff4d4f'}
        />
        {!readOnly && enabledChildren.length > 0 && (
          <Space size={4} wrap className="dq-arch-col-actions">
            <Tooltip title="保持各指标当前相对比例，整体缩放使同级合计 = 1.000">
              <Button size="small" type="primary" ghost onClick={() => handleNormalizeColumn(level1)}>
                按比例归一化
              </Button>
            </Tooltip>
            <Tooltip title="将该列指标的 ω 与启用/停用恢复为上次保存（打开弹窗时）的状态">
              <Button size="small" onClick={() => handleRestoreColumn(level1)}>
                恢复默认
              </Button>
            </Tooltip>
          </Space>
        )}
      </div>
    );
  };

  return (
    <div
      className={`dq-indicator-arch${embedded ? ' dq-indicator-arch-embedded' : ''}${readOnly ? ' dq-indicator-arch-readonly' : ''}`}
    >
      {embedded ? (
        <IndicatorArchitectureLegend variant={readOnly ? 'version-readonly' : 'version-editable'} />
      ) : null}
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
          <Space size={8} className="dq-arch-toolbar-actions">
            {readOnly ? (
              onEdit ? (
                <Button type="primary" icon={<EditOutlined />} onClick={onEdit}>
                  编辑
                </Button>
              ) : null
            ) : (
              <>
                <Text type="warning" className="dq-arch-editing-hint">
                  配置中（含启用状态与 ω），保存前须使各级合计为 1.000
                </Text>
                {embedded && onCancel ? <Button onClick={onCancel}>取消</Button> : null}
                <Popconfirm
                  title="一键恢复默认"
                  description="将一级权重、全部指标 ω 及启用/停用恢复为上次保存的配置。当前未保存的修改将被覆盖。"
                  onConfirm={handleRestoreAllDefaults}
                  okText="恢复"
                  cancelText="取消"
                >
                  <Button>一键恢复默认</Button>
                </Popconfirm>
                {embedded && onDelete ? (
                  <Popconfirm title="确定删除该条评价版本？" onConfirm={onDelete}>
                    <Button danger>删除</Button>
                  </Popconfirm>
                ) : null}
                {embedded && onSave ? (
                  saveDisabled && saveDisabledReason ? (
                    <Tooltip title={saveDisabledReason}>
                      <span>
                        <Button type="primary" disabled>
                          保存
                        </Button>
                      </span>
                    </Tooltip>
                  ) : (
                    <Button type="primary" loading={saving} disabled={saving} onClick={onSave}>
                      保存
                    </Button>
                  )
                ) : !embedded ? (
                  <Button type="primary" onClick={() => handleSave()}>
                    校验并应用
                  </Button>
                ) : null}
              </>
            )}
          </Space>
        </div>
      </Card>

      <div className={`dq-arch-root${!level1Valid ? ' dq-arch-root-weight-invalid' : ''}`}>
        <div className="dq-arch-root-box">
          <Title level={4} style={{ margin: 0 }}>
            内涝风险评估综合分 V
          </Title>
          <Text type="secondary" className="dq-arch-formula">
            {formatLevel1Formula(draftLevel1Weights)}
          </Text>
          {!readOnly && (
            <div className="dq-arch-level1-global-edit">
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>一级因子权重</Text>
              <Space wrap size={[8, 8]} style={{ marginTop: 8, justifyContent: 'center' }}>
                {LEVEL1_ORDER.map((l1, idx) => (
                  <Space key={l1} size={4}>
                    <Text style={{ fontSize: 12, color: '#fff' }}>V{idx + 1}</Text>
                    <InputNumber
                      size="small"
                      min={0}
                      max={1}
                      step={0.001}
                      precision={3}
                      value={draftLevel1Weights[l1]}
                      onChange={v => handleLevel1WeightChange(l1, v)}
                      className="dq-arch-weight-input dq-arch-level1-root-input"
                    />
                  </Space>
                ))}
              </Space>
            </div>
          )}
        </div>
        {!readOnly && (
          <div
            className={`dq-arch-col-footer dq-arch-level1-footer${level1Valid ? '' : ' dq-arch-col-footer-invalid'}`}
          >
            <div className="dq-arch-col-sum">
              <Text type="secondary">一级权重合计</Text>
              <Text strong type={level1Valid ? 'success' : 'danger'}>
                {level1Sum.toFixed(3)} / 1.000
              </Text>
            </div>
            <Progress
              percent={Math.min(100, Math.round(level1Sum * 100))}
              size="small"
              showInfo={false}
              status={level1Valid ? 'success' : 'exception'}
              strokeColor={level1Valid ? '#52c41a' : '#ff4d4f'}
            />
            <Space size={4} wrap className="dq-arch-col-actions">
              <Tooltip title="保持四个一级因子当前比例，缩放使合计 = 1.000">
                <Button size="small" type="primary" ghost onClick={handleNormalizeLevel1}>
                  一级按比例归一化
                </Button>
              </Tooltip>
              <Tooltip title="恢复为上次保存的一级权重">
                <Button size="small" onClick={handleRestoreLevel1}>
                  一级恢复默认
                </Button>
              </Tooltip>
            </Space>
          </div>
        )}
        <div className="dq-arch-connector dq-arch-connector-down" />
      </div>

      <div className="dq-arch-level1-row">
        {arch.map(node => {
          const vIndex = LEVEL1_ORDER.indexOf(node.level1) + 1;
          const enabledInCol = node.children.filter(c => c.enabled);
          const maxWeightInCol = Math.max(...node.children.map(c => c.weight), 0.001);
          const colSum = sumSiblingWeights(enabledInCol);
          const colWeightValid =
            enabledInCol.length === 0 || isSiblingWeightSumValid(colSum);

          return (
            <div
              key={node.level1}
              className={`dq-arch-level1-col${!colWeightValid && enabledInCol.length > 0 ? ' dq-arch-level1-col-weight-invalid' : ''}`}
            >
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
                {readOnly ? (
                  <Tag color="blue">一级权重 ω = {node.weight.toFixed(3)}</Tag>
                ) : (
                  <Space size={4} className="dq-arch-level1-weight-edit" style={{ justifyContent: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      一级权重 ω
                    </Text>
                    <InputNumber
                      size="small"
                      min={0}
                      max={1}
                      step={0.001}
                      precision={3}
                      value={node.weight}
                      onChange={v => handleLevel1WeightChange(node.level1, v)}
                      className="dq-arch-weight-input"
                    />
                  </Space>
                )}
                <div className="dq-arch-level1-score">评估指标分数 V{vIndex}</div>
              </div>
              <div className="dq-arch-connector dq-arch-connector-down dq-arch-connector-short" />

              <div
                className={`dq-arch-level2-stack${!colWeightValid && enabledInCol.length > 0 ? ' dq-arch-level2-stack-invalid' : ''}`}
              >
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
                        {readOnly ? (
                          <Space size={8} wrap={false}>
                            <Tag color={ind.enabled ? 'success' : 'warning'}>
                              {ind.enabled ? '启用' : '停用'}
                            </Tag>
                            <span className="dq-arch-weight">ω={ind.weight.toFixed(3)}</span>
                          </Space>
                        ) : (
                          <Space wrap size={[8, 4]} className="dq-arch-level2-edit-row">
                            {(() => {
                              const enableBlockers = ind.enabled
                                ? []
                                : validateIndicatorConfig(ind, draftIndicators).blockers;
                              const enableTip =
                                enableBlockers[0] ??
                                (ind.enabled ? undefined : '配置完整后可启用');
                              return (
                                <Tooltip title={enableTip}>
                                  <Switch
                                    size="small"
                                    checked={ind.enabled}
                                    checkedChildren="启用"
                                    unCheckedChildren="停用"
                                    disabled={!ind.enabled && enableBlockers.length > 0}
                                    onChange={checked => handleToggleEnabled(ind, checked)}
                                  />
                                </Tooltip>
                              );
                            })()}
                            <Space size={4} className="dq-arch-weight-edit">
                              <Text type="secondary">ω</Text>
                              <InputNumber
                                size="small"
                                min={0}
                                max={1}
                                step={0.001}
                                precision={3}
                                value={ind.weight}
                                onChange={v => handleWeightChange(node.level1, ind, v)}
                                className="dq-arch-weight-input"
                              />
                            </Space>
                          </Space>
                        )}
                        <span className="dq-arch-rules">{ind.scoreRules.length} 档赋分</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {renderColumnFooter(node.level1, node.children)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** 供 Modal 保存时获取当前草稿 config */
export function buildEditorDraftConfig(
  baseIndicators: RiskIndicatorRow[],
  initialConfig: IndicatorArchitectureConfig,
  draftIndicators: RiskIndicatorRow[],
  level1Weights: Level1Weights,
): IndicatorArchitectureConfig {
  const synced = syncConfigWithIndicatorCatalog(initialConfig, baseIndicators);
  return buildConfigFromEditedIndicators(synced, draftIndicators, level1Weights);
}

export { collectArchitectureWeightIssues };
