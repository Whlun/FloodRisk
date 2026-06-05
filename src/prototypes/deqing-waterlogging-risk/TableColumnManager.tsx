import React, { useState } from 'react';
import { Button, Checkbox, Popover, Space, Typography, message } from 'antd';
import { SettingOutlined } from '@ant-design/icons';

const { Text } = Typography;

export interface TableColumnConfig {
  key: string;
  title: string;
  defaultVisible?: boolean;
  /** 不可隐藏（如操作列） */
  locked?: boolean;
}

interface Props {
  columns: TableColumnConfig[];
  visibleColumns: string[];
  onChange: (keys: string[]) => void;
}

/** 列表字段显示管理 */
export const TableColumnManager: React.FC<Props> = ({ columns, visibleColumns, onChange }) => {
  const [open, setOpen] = useState(false);

  const defaultKeys = columns.filter(c => c.defaultVisible !== false).map(c => c.key);

  const content = (
    <div style={{ width: 220 }}>
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
        勾选要在列表中显示的字段
      </Text>
      <Checkbox.Group
        value={visibleColumns}
        style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
        onChange={vals => {
          const keys = vals as string[];
          const locked = columns.filter(c => c.locked).map(c => c.key);
          onChange([...new Set([...keys, ...locked])]);
        }}
      >
        {columns.map(col => (
          <Checkbox key={col.key} value={col.key} disabled={col.locked}>
            {col.title}
            {col.locked ? '（固定）' : ''}
          </Checkbox>
        ))}
      </Checkbox.Group>
      <Button
        type="link"
        size="small"
        style={{ padding: 0, marginTop: 8 }}
        onClick={() => {
          onChange(defaultKeys);
          message.success('已恢复默认字段');
        }}
      >
        恢复默认
      </Button>
    </div>
  );

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomRight"
      content={content}
    >
      <Button icon={<SettingOutlined />}>字段管理</Button>
    </Popover>
  );
};

export function getDefaultVisibleColumnKeys(columns: TableColumnConfig[]): string[] {
  return columns.filter(c => c.defaultVisible !== false).map(c => c.key);
}

export function pickTableColumns<T extends { key?: React.Key }>(
  allColumns: T[],
  visibleColumns: string[],
): T[] {
  return allColumns
    .filter(col => {
      const key = String(col.key ?? '');
      return visibleColumns.includes(key) || key === 'operation';
    })
    .sort((a, b) => {
      const ka = String(a.key ?? '');
      const kb = String(b.key ?? '');
      if (ka === 'operation') return 1;
      if (kb === 'operation') return -1;
      return visibleColumns.indexOf(ka) - visibleColumns.indexOf(kb);
    });
}
