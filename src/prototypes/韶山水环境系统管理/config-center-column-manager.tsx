/**
 * 配置中心 / 报表等列表「字段管理」：列显隐、排序、恢复默认（与设施管理列表一致）
 */
import React, { useState } from 'react';
import { Button, Card, Checkbox, Divider, Dropdown, Space, Tag, Tooltip, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ColumnHeightOutlined } from '@ant-design/icons';

export interface ColumnConfig {
  key: string;
  title: string;
  dataIndex?: string;
  width?: number;
  fixed?: 'left' | 'right';
  render?: (value: unknown, record: Record<string, unknown>) => React.ReactNode;
  defaultVisible?: boolean;
  /** 数据列表元格是否省略展示，默认 true；标签/多行内容列可设为 false */
  ellipsis?: boolean;
}

/** 由字段管理列定义生成 Table 列（操作列 key 须为 `operation`） */
export function buildTableColumnsFromConfig<T extends object>(
  allColumns: ColumnConfig[],
  visibleColumns: string[],
  opRender: (record: T) => React.ReactNode
): ColumnsType<T> {
  const sorted = allColumns
    .filter(col => visibleColumns.includes(col.key) || col.key === 'operation')
    .sort((a, b) => {
      if (a.key === 'operation') return 1;
      if (b.key === 'operation') return -1;
      return visibleColumns.indexOf(a.key) - visibleColumns.indexOf(b.key);
    });
  return sorted.map(col => {
    if (col.key === 'operation') {
      return {
        title: col.title,
        key: col.key,
        fixed: (col.fixed ?? 'right') as 'right',
        width: col.width ?? 168,
        render: (_: unknown, record: T) => opRender(record)
      };
    }
    return {
      title: col.title,
      dataIndex: (col.dataIndex ?? col.key) as keyof T & string,
      key: col.key,
      width: col.width,
      ellipsis: col.ellipsis !== false,
      render: col.render
        ? (value: unknown, record: T) => col.render!(value, record as unknown as Record<string, unknown>)
        : undefined
    };
  });
}

export const getDefaultVisibleColumnKeys = (cols: ColumnConfig[]): string[] =>
  cols.filter(c => c.key !== 'operation' && c.defaultVisible !== false).map(c => c.key);

/** 字段管理下拉里「显示/隐藏」顺序与表格 / 排序模式一致 */
function getFieldManagementColumnKeys(columns: ColumnConfig[], visibleColumns: string[]): string[] {
  const op = 'operation';
  const definitionDataKeys = columns.map(c => c.key).filter(k => k !== op);
  const visibleDataKeys = visibleColumns.filter(k => k !== op);
  const hiddenKeys = definitionDataKeys.filter(k => !visibleDataKeys.includes(k));
  return [...visibleDataKeys, ...hiddenKeys, op];
}

export interface ColumnManagerProps {
  columns: ColumnConfig[];
  visibleColumns: string[];
  onChange: (visibleColumns: string[]) => void;
}

export const ColumnManager: React.FC<ColumnManagerProps> = ({ columns, visibleColumns, onChange }) => {
  const [open, setOpen] = useState(false);
  const [isSortMode, setIsSortMode] = useState(false);

  const handleToggleColumn = (key: string, checked: boolean) => {
    if (checked) {
      onChange([...visibleColumns, key]);
    } else {
      if (key === 'operation') {
        message.warning('操作列不可隐藏');
        return;
      }
      onChange(visibleColumns.filter(k => k !== key));
    }
  };

  const handleReset = () => {
    const defaultKeys = columns.filter(c => c.key !== 'operation' && c.defaultVisible !== false).map(c => c.key);
    onChange(defaultKeys);
    message.success('已重置为默认显示');
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newOrder = [...visibleColumns];
    [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    onChange(newOrder);
  };

  const handleMoveDown = (index: number) => {
    if (index >= visibleColumns.length - 1) return;
    const newOrder = [...visibleColumns];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    onChange(newOrder);
  };

  const sortableColumns = visibleColumns.filter(key => key !== 'operation');

  const dropdownContent = (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>字段管理</span>
          <Button type="link" size="small" onClick={() => setIsSortMode(!isSortMode)}>
            {isSortMode ? '完成排序' : '排序'}
          </Button>
        </div>
      }
      style={{ width: isSortMode ? 360 : 320 }}
      size="small"
    >
      <div style={{ maxHeight: 400, overflow: 'auto' }}>
        {isSortMode ? (
          <>
            <div style={{ marginBottom: 12, fontSize: 12, color: '#999' }}>点击上下箭头调整列顺序</div>
            {sortableColumns.map((key, index) => {
              const col = columns.find(c => c.key === key);
              return (
                <div
                  key={key}
                  style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}
                >
                  <span style={{ flex: 1 }}>{col?.title}</span>
                  <Space>
                    <Button type="text" size="small" disabled={index === 0} onClick={() => handleMoveUp(index)}>
                      ↑
                    </Button>
                    <Button
                      type="text"
                      size="small"
                      disabled={index === sortableColumns.length - 1}
                      onClick={() => handleMoveDown(index)}
                    >
                      {'\u2193'}
                    </Button>
                  </Space>
                </div>
              );
            })}
            <div style={{ marginTop: 8, padding: 8, background: '#f5f5f5', borderRadius: 4, fontSize: 12, color: '#666' }}>
              操作列始终固定在末尾
            </div>
          </>
        ) : (
          getFieldManagementColumnKeys(columns, visibleColumns).map(key => {
            const col = columns.find(c => c.key === key);
            if (!col) return null;
            return (
              <div key={col.key} style={{ marginBottom: 8 }}>
                <Checkbox
                  checked={visibleColumns.includes(col.key)}
                  onChange={e => handleToggleColumn(col.key, e.target.checked)}
                  disabled={col.key === 'operation'}
                >
                  <Space>
                    {col.title}
                    {col.key === 'operation' && (
                      <Tag color="blue" style={{ fontSize: 10 }}>
                        固定
                      </Tag>
                    )}
                  </Space>
                </Checkbox>
              </div>
            );
          })
        )}
      </div>
      {!isSortMode && (
        <>
          <Divider style={{ margin: '12px 0' }} />
          <Button type="link" onClick={handleReset} size="small">
            恢复默认
          </Button>
        </>
      )}
    </Card>
  );

  return (
    <Dropdown
      open={open}
      dropdownRender={() => dropdownContent}
      placement="bottomRight"
      onOpenChange={visible => {
        setOpen(visible);
        if (!visible) setIsSortMode(false);
      }}
    >
      <Tooltip title="字段管理">
        <Button icon={<ColumnHeightOutlined />}>字段</Button>
      </Tooltip>
    </Dropdown>
  );
};
