import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Collapse,
  Descriptions,
  InputNumber,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  calculateAhpWeights,
  setPairwiseValue,
  weightsToPairwiseMatrix,
} from './ahpCalculator';
import {
  HAZARD_POINT_TYPE_LABEL,
  LEVEL1_FACTOR_LABEL,
  type HazardPointType,
  type Level1Factor,
  type Level1Weights,
  type RiskIndicatorRow,
} from './types';
import { getSiblingGroup } from './weightBalance';
import type { WeightSource } from './weightSource';

const { Text } = Typography;

const LEVEL1_ORDER: Level1Factor[] = ['HAZARD', 'FORMATION', 'BEARING', 'PREVENTION'];

type AhpGroupKey =
  | 'level1'
  | `level2:${Level1Factor}`
  | `level2:FORMATION:${HazardPointType}`;

interface AhpGroupDef {
  key: AhpGroupKey;
  label: string;
  labels: string[];
  ids: string[];
  getWeights: () => number[];
  getDefaultWeights: () => number[];
}

interface Props {
  isEditing: boolean;
  formationType: HazardPointType;
  indicators: RiskIndicatorRow[];
  defaultIndicators: RiskIndicatorRow[];
  level1Weights: Level1Weights;
  defaultLevel1Weights: Level1Weights;
  onApplyLevel1: (weights: Level1Weights) => void;
  onApplyLevel2: (weightMap: Record<string, number>) => void;
  onWeightSourceChange: (source: WeightSource) => void;
}

function buildLevel2Group(
  level1: Level1Factor,
  formationType: HazardPointType | undefined,
  indicators: RiskIndicatorRow[],
  defaults: RiskIndicatorRow[],
): AhpGroupDef | null {
  const hazardType = level1 === 'FORMATION' ? formationType : undefined;
  const group = getSiblingGroup(indicators, level1, hazardType);
  if (group.length < 2) return null;

  const key: AhpGroupKey =
    level1 === 'FORMATION' && formationType
      ? `level2:FORMATION:${formationType}`
      : (`level2:${level1}` as AhpGroupKey);

  const labelSuffix =
    level1 === 'FORMATION' && formationType
      ? ` · ${HAZARD_POINT_TYPE_LABEL[formationType]}`
      : '';

  return {
    key,
    label: `${LEVEL1_FACTOR_LABEL[level1]}（二级）${labelSuffix}`,
    labels: group.map(i => i.name),
    ids: group.map(i => i.id),
    getWeights: () => group.map(i => i.weight),
    getDefaultWeights: () =>
      group.map(ind => {
        const base =
          defaults.find(d => d.id === ind.id) ?? defaults.find(d => d.code === ind.code);
        return base?.weight ?? ind.weight;
      }),
  };
}

function buildGroups(
  indicators: RiskIndicatorRow[],
  defaultIndicators: RiskIndicatorRow[],
  formationType: HazardPointType,
  level1Weights: Level1Weights,
  defaultLevel1Weights: Level1Weights,
): AhpGroupDef[] {
  const groups: AhpGroupDef[] = [
    {
      key: 'level1',
      label: '一级因子（致灾 / 孕灾 / 承灾 / 防灾减灾）',
      labels: LEVEL1_ORDER.map(l1 => LEVEL1_FACTOR_LABEL[l1]),
      ids: LEVEL1_ORDER,
      getWeights: () => LEVEL1_ORDER.map(l1 => level1Weights[l1]),
      getDefaultWeights: () => LEVEL1_ORDER.map(l1 => defaultLevel1Weights[l1]),
    },
  ];

  for (const l1 of ['HAZARD', 'BEARING', 'PREVENTION'] as Level1Factor[]) {
    const g = buildLevel2Group(l1, undefined, indicators, defaultIndicators);
    if (g) groups.push(g);
  }

  for (const ft of ['SUNKEN', 'TUNNEL', 'UNDERGROUND', 'LOW_LYING'] as HazardPointType[]) {
    const g = buildLevel2Group('FORMATION', ft, indicators, defaultIndicators);
    if (g) groups.push(g);
  }

  return groups;
}

export const AhpWeightPanel: React.FC<Props> = ({
  isEditing,
  formationType,
  indicators,
  defaultIndicators,
  level1Weights,
  defaultLevel1Weights,
  onApplyLevel1,
  onApplyLevel2,
  onWeightSourceChange,
}) => {
  const groups = useMemo(
    () =>
      buildGroups(
        indicators,
        defaultIndicators,
        formationType,
        level1Weights,
        defaultLevel1Weights,
      ),
    [indicators, defaultIndicators, formationType, level1Weights, defaultLevel1Weights],
  );

  const defaultGroupKey = useMemo(() => {
    const level2 = groups.find(g => g.key === `level2:FORMATION:${formationType}`);
    return level2?.key ?? groups[0]?.key ?? 'level1';
  }, [groups, formationType]);

  const [groupKey, setGroupKey] = useState<AhpGroupKey>(defaultGroupKey);
  const activeGroup = groups.find(g => g.key === groupKey) ?? groups[0];

  const [matrix, setMatrix] = useState<number[][]>(() =>
    weightsToPairwiseMatrix(activeGroup?.getDefaultWeights() ?? [1]),
  );

  const syncMatrixFromWeights = useCallback(
    (useDefault: boolean) => {
      if (!activeGroup) return;
      const w = useDefault ? activeGroup.getDefaultWeights() : activeGroup.getWeights();
      setMatrix(weightsToPairwiseMatrix(w));
    },
    [activeGroup],
  );

  const handleGroupChange = (key: AhpGroupKey) => {
    setGroupKey(key);
    const g = groups.find(x => x.key === key);
    if (g) setMatrix(weightsToPairwiseMatrix(g.getDefaultWeights()));
  };

  const result = useMemo(() => calculateAhpWeights(matrix), [matrix]);

  const n = activeGroup?.labels.length ?? 0;

  const matrixColumns = useMemo(() => {
    const cols: {
      title: React.ReactNode;
      dataIndex: string;
      fixed?: 'left';
      width: number;
      render: (_: unknown, record: { row: number }) => React.ReactNode;
    }[] = [
      {
        title: '指标',
        dataIndex: 'name',
        fixed: 'left',
        width: 140,
        render: (_: unknown, record: { row: number }) => (
          <Text style={{ fontSize: 12 }}>{activeGroup?.labels[record.row]}</Text>
        ),
      },
    ];
    for (let j = 0; j < n; j++) {
      const colIndex = j;
      cols.push({
        title: (
          <span style={{ fontSize: 11, writingMode: 'vertical-rl' }}>
            {activeGroup?.labels[j]?.slice(0, 8)}
          </span>
        ),
        dataIndex: `c${j}`,
        width: 72,
        render: (_: unknown, record: { row: number }) => {
          const i = record.row;
          if (i === colIndex) return <Text type="secondary">1</Text>;
          if (i > colIndex) return <Text type="secondary">—</Text>;
          return (
            <InputNumber
              size="small"
              min={1 / 9}
              max={9}
              step={0.1}
              precision={3}
              value={matrix[i]?.[colIndex]}
              onChange={val => {
                if (val == null || val <= 0) return;
                setMatrix(prev => setPairwiseValue(prev, i, colIndex, val));
              }}
              style={{ width: '100%' }}
            />
          );
        },
      });
    }
    return cols;
  }, [n, activeGroup, matrix]);

  const matrixData = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => ({
        key: i,
        row: i,
      })),
    [n],
  );

  const handleApply = () => {
    if (!isEditing) {
      message.warning('请先点击「指标权重配置」进入编辑模式');
      return;
    }
    if (!result) {
      message.error('判断矩阵无效，请检查互反性与正数约束');
      return;
    }
    if (!result.consistent) {
      message.warning(`一致性比率 CR=${result.cr.toFixed(3)} > 0.1，建议调整矩阵后再应用`);
      return;
    }
    if (!activeGroup) return;

    if (activeGroup.key === 'level1') {
      const next = Object.fromEntries(
        LEVEL1_ORDER.map((l1, i) => [l1, result.weights[i]]),
      ) as Level1Weights;
      onApplyLevel1(next);
    } else {
      const map: Record<string, number> = {};
      activeGroup.ids.forEach((id, i) => {
        map[id] = result.weights[i];
      });
      onApplyLevel2(map);
    }
    onWeightSourceChange('ahp');
    message.success('AHP 权重已写入当前草稿，请确认同级合计为 1.000 后保存');
  };

  if (!activeGroup || n < 2) {
    return (
      <Collapse
        className="dq-ahp-panel"
        items={[
          {
            key: 'ahp',
            label: '层次分析法（AHP）权重推导',
            children: (
              <Alert
                type="info"
                showIcon
                message="当前所选指标组不足 2 项，无法进行两两比较。请先在架构图中启用更多同级指标。"
              />
            ),
          },
        ]}
      />
    );
  }

  return (
    <Collapse
      className="dq-ahp-panel"
      items={[
        {
          key: 'ahp',
          label: '层次分析法（AHP）权重推导',
          children: (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Alert
                type="info"
                showIcon
                message="附录 E 为编制指标体系时 AHP 得出的参考权重；此处供本地化时重新录入判断矩阵。赋分仍按相等间隔法确定，与 AHP 无关。"
              />
              <Space wrap align="center">
                <Text type="secondary">比较组：</Text>
                <Select
                  style={{ minWidth: 320 }}
                  value={groupKey}
                  onChange={handleGroupChange}
                  options={groups.filter(g => g.labels.length >= 2).map(g => ({
                    value: g.key,
                    label: g.label,
                  }))}
                />
                <Button size="small" onClick={() => syncMatrixFromWeights(false)}>
                  从当前 ω 初始化
                </Button>
                <Button size="small" onClick={() => syncMatrixFromWeights(true)}>
                  从附录 E 默认初始化
                </Button>
              </Space>

              <Text type="secondary" style={{ fontSize: 12 }}>
                录入上三角两两比较（Saaty 1–9 标度：1 同等重要，3 稍微重要，5 明显重要，7 强烈重要，9 极端重要；下三角自动取倒数）。
              </Text>

              <Table
                size="small"
                bordered
                pagination={false}
                scroll={{ x: Math.max(400, 140 + n * 72) }}
                columns={matrixColumns}
                dataSource={matrixData}
              />

              {result && (
                <Descriptions size="small" bordered column={2}>
                  <Descriptions.Item label="推导权重 ω" span={2}>
                    <Space wrap>
                      {result.weights.map((w, i) => (
                        <Tag key={i}>
                          {activeGroup.labels[i]}：{w.toFixed(3)}
                        </Tag>
                      ))}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="λ_max">{result.lambdaMax.toFixed(4)}</Descriptions.Item>
                  <Descriptions.Item label="CI">{result.ci.toFixed(4)}</Descriptions.Item>
                  <Descriptions.Item label="CR">
                    <Text type={result.consistent ? 'success' : 'danger'}>
                      {result.cr.toFixed(4)} {result.consistent ? '（通过）' : '（>0.1 未通过）'}
                    </Text>
                  </Descriptions.Item>
                </Descriptions>
              )}

              <Space>
                <Button type="primary" disabled={!isEditing || !result?.consistent} onClick={handleApply}>
                  应用至草稿
                </Button>
                {!isEditing && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    须先进入「指标权重配置」编辑模式
                  </Text>
                )}
              </Space>
            </Space>
          ),
        },
      ]}
    />
  );
};
