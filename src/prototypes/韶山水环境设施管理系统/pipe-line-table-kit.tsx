/**
 * 排水管线台账：字段管理与列宽工具（与「设施管理 · 排水管线」列表一致，供综合态势等复用）
 */
import React, { useState } from 'react';
import {
  Button,
  Card,
  Checkbox,
  Divider,
  Dropdown,
  Space,
  Tag,
  Tooltip,
  message,
} from 'antd';
import { ColumnHeightOutlined } from '@ant-design/icons';

/** 字段管理下拉里「显示/隐藏」模式下的列顺序 */
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
  onSort?: (newOrder: string[]) => void;
}

/** 列显示/隐藏与排序（与设施管理排水管线列表「字段」按钮同源） */
export const PipeLineColumnManager: React.FC<ColumnManagerProps> = ({ columns, visibleColumns, onChange, onSort }) => {
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
    const defaultKeys = columns
      .filter(c => c.key !== 'operation' && c.defaultVisible !== false)
      .map(c => c.key);
    onChange(defaultKeys);
    message.success('已重置为默认显示');
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newOrder = [...visibleColumns];
    [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    onChange(newOrder);
    onSort?.(newOrder);
  };

  const handleMoveDown = (index: number) => {
    if (index >= visibleColumns.length - 1) return;
    const newOrder = [...visibleColumns];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    onChange(newOrder);
    onSort?.(newOrder);
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
            <div style={{ marginBottom: 12, fontSize: 12, color: '#999' }}>
              拖拽排序（点击上下箭头调整顺序）
            </div>
            {sortableColumns.map((key, index) => {
              const col = columns.find(c => c.key === key);
              return (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid #f0f0f0',
                  }}
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
                      ↓
                    </Button>
                  </Space>
                </div>
              );
            })}
            <div
              style={{
                marginTop: 8,
                padding: '8px',
                background: '#f5f5f5',
                borderRadius: 4,
                fontSize: 12,
                color: '#666',
              }}
            >
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

/** 设施管理各台账表列配置（排水管线等） */
export interface ColumnConfig {
  key: string;
  title: string;
  dataIndex?: string;
  width?: number;
  fixed?: 'left' | 'right';
  render?: (value: any, record: any) => React.ReactNode;
  defaultVisible?: boolean;
}

/** 字段管理初始勾选：与设施管理「恢复默认」一致 */
export function getDefaultVisibleColumnKeys(cols: ColumnConfig[]): string[] {
  return cols.filter(c => c.key !== 'operation' && c.defaultVisible !== false).map(c => c.key);
}

const DEFAULT_FACILITY_COL_WIDTH = 120;

/** 可见列 width 累加作为 Table scroll.x */
export function getFacilityTableScrollX(cols: { width?: number }[]): number {
  const total = cols.reduce(
    (sum, c) => sum + (typeof c.width === 'number' ? c.width : DEFAULT_FACILITY_COL_WIDTH),
    0,
  );
  return Math.max(total, 100);
}
