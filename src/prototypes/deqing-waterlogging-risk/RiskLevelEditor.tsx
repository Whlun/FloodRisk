import React, { useMemo } from 'react';
import {
  Button,
  Input,
  InputNumber,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { IndicatorRiskLevelRow } from './types';
import {
  createEmptyRiskLevel,
  hasEnabledScoreRangeOverlap,
  isBuiltinRiskLevel,
  isDuplicateLevelCode,
} from './riskLevelUtils';

interface Props {
  levels: IndicatorRiskLevelRow[];
  /** 打开弹窗时的已保存基准，供「恢复默认」回退 */
  baselineLevels?: IndicatorRiskLevelRow[];
  onChange?: (levels: IndicatorRiskLevelRow[]) => void;
  readOnly?: boolean;
}

export const RiskLevelEditor: React.FC<Props> = ({
  levels,
  baselineLevels,
  onChange,
  readOnly = false,
}) => {
  const sortedLevels = useMemo(
    () => [...levels].sort((a, b) => a.sort - b.sort),
    [levels],
  );

  const patchLevels = (next: IndicatorRiskLevelRow[]) => {
    onChange?.(next);
  };

  const updateRow = (id: string, patch: Partial<IndicatorRiskLevelRow>) => {
    patchLevels(levels.map(l => (l.id === id ? { ...l, ...patch } : l)));
  };

  const commitLevelCode = (id: string, raw: string) => {
    const row = levels.find(l => l.id === id);
    if (!row) return;
    const normalized = raw.trim().toUpperCase();
    if (!normalized || normalized === row.levelCode) return;
    if (!/^[A-Z0-9_]+$/.test(normalized)) {
      message.error('等级编码仅支持大写字母、数字与下划线');
      updateRow(id, { levelCode: row.levelCode });
      return;
    }
    if (isDuplicateLevelCode(normalized, levels, id)) {
      message.error('等级编码已存在，请更换');
      updateRow(id, { levelCode: row.levelCode });
      return;
    }
    updateRow(id, { levelCode: normalized });
  };

  const commitScoreRange = (id: string) => {
    const row = levels.find(l => l.id === id);
    if (!row) return;
    if (row.scoreMin >= row.scoreMax) {
      message.error(`${row.levelName || '该等级'}：分数下限须小于分数上限`);
      return;
    }
    if (row.enabled && hasEnabledScoreRangeOverlap(row, levels)) {
      message.error(`${row.levelName || '该等级'}：分数区间与其他启用等级重叠，请调整`);
    }
  };

  const resetIndDefaults = () => {
    if (!baselineLevels?.length) return;
    patchLevels(baselineLevels.map(row => ({ ...row })));
    message.success('已恢复为上次保存的配置');
  };

  const toggleIndEnabled = (row: IndicatorRiskLevelRow) => {
    const next = levels.map(l => (l.id === row.id ? { ...l, enabled: !l.enabled } : l));
    if (!row.enabled) {
      const candidate = next.find(l => l.id === row.id)!;
      if (candidate.scoreMin >= candidate.scoreMax) {
        message.error('分数下限须小于分数上限');
        return;
      }
      if (hasEnabledScoreRangeOverlap(candidate, next)) {
        message.error('启用后分数区间与其他启用等级重叠，请先调整区间');
        return;
      }
    }
    if (next.filter(l => l.enabled).length === 0) {
      message.error('至少保留一个启用的风险等级');
      return;
    }
    patchLevels(next);
    message.success(row.enabled ? '已停用' : '已启用');
  };

  const indColumns: ColumnsType<IndicatorRiskLevelRow> = [
    {
      title: '排序',
      dataIndex: 'sort',
      width: 72,
      align: 'center',
      render: (sort: number, row) =>
        readOnly ? (
          sort
        ) : (
          <InputNumber
            size="small"
            min={1}
            max={99}
            precision={0}
            value={sort}
            onChange={v => updateRow(row.id, { sort: v ?? sort })}
            style={{ width: '100%' }}
          />
        ),
    },
    {
      title: '等级编码',
      dataIndex: 'levelCode',
      width: 120,
      render: (code: string, row) =>
        readOnly || isBuiltinRiskLevel(row) ? (
          code
        ) : (
          <Input
            size="small"
            defaultValue={code}
            key={`${row.id}-${code}`}
            onBlur={e => commitLevelCode(row.id, e.target.value)}
            placeholder="如 CUSTOM_1"
          />
        ),
    },
    {
      title: '等级名称',
      dataIndex: 'levelName',
      width: 120,
      render: (name: string, row) =>
        readOnly ? (
          name
        ) : (
          <Input
            size="small"
            value={name}
            onChange={e => updateRow(row.id, { levelName: e.target.value })}
          />
        ),
    },
    {
      title: '标签色',
      dataIndex: 'color',
      width: readOnly ? 100 : 168,
      render: (color: string, row) =>
        readOnly ? (
          <Tag color={color}>{row.levelName}</Tag>
        ) : (
          <Space size={4} align="center" className="dq-risk-level-color-cell">
            <Tag color={color}>{row.levelName || '预览'}</Tag>
            <Input
              size="small"
              value={color}
              onChange={e => updateRow(row.id, { color: e.target.value })}
              placeholder="#f5222d"
            />
          </Space>
        ),
    },
    {
      title: '分数区间',
      width: readOnly ? 160 : 200,
      render: (_, row) =>
        readOnly ? (
          `[${row.scoreMin}, ${row.scoreMax})`
        ) : (
          <Space size={4} className="dq-risk-level-score-range">
            <InputNumber
              size="small"
              min={0}
              max={1}
              step={0.05}
              value={row.scoreMin}
              onChange={v => updateRow(row.id, { scoreMin: v ?? row.scoreMin })}
              onBlur={() => commitScoreRange(row.id)}
            />
            <span>—</span>
            <InputNumber
              size="small"
              min={0}
              max={1.01}
              step={0.05}
              value={row.scoreMax}
              onChange={v => updateRow(row.id, { scoreMax: v ?? row.scoreMax })}
              onBlur={() => commitScoreRange(row.id)}
            />
          </Space>
        ),
    },
    {
      title: '说明',
      dataIndex: 'description',
      ellipsis: true,
      render: (description: string, row) =>
        readOnly ? (
          description
        ) : (
          <Input
            size="small"
            value={description}
            onChange={e => updateRow(row.id, { description: e.target.value })}
            placeholder="如 V≥0.6"
          />
        ),
    },
    {
      title: '启用状态',
      dataIndex: 'enabled',
      width: 88,
      render: (enabled: boolean, row) =>
        readOnly ? (
          enabled ? (
            <Tag color="success">启用</Tag>
          ) : (
            <Tag color="warning">停用</Tag>
          )
        ) : (
          <Switch
            size="small"
            checked={enabled}
            checkedChildren="启用"
            unCheckedChildren="停用"
            onChange={() => toggleIndEnabled(row)}
          />
        ),
    },
  ];

  return (
    <div className="dq-risk-level-editor">
      {!readOnly ? (
        <Space style={{ marginBottom: 12 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => patchLevels([...levels, createEmptyRiskLevel(levels)])}>
            新增等级
          </Button>
          <Button onClick={resetIndDefaults} disabled={!baselineLevels?.length}>
            恢复默认
          </Button>
        </Space>
      ) : null}
      <Table
        rowKey="id"
        size="small"
        columns={indColumns}
        dataSource={sortedLevels}
        pagination={false}
        scroll={{ x: readOnly ? 700 : 952 }}
      />
    </div>
  );
};
