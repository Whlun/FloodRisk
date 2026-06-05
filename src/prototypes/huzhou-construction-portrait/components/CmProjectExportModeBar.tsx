/**
 * 建设工程画像 · 导出模式顶栏（独立于筛选区，勾选 + 确认/取消）
 */
import React from 'react';
import { DownloadOutlined } from '@ant-design/icons';
import { Button, Checkbox } from 'antd';

export type CmProjectExportModeBarProps = {
  /** 当前列表可见条数 */
  totalCount: number;
  /** 跨阶段累计已选条数 */
  totalSelectedCount: number;
  /** 当前列表内已选条数 */
  displaySelectedCount: number;
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: (checked: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export const CmProjectExportModeBar: React.FC<CmProjectExportModeBarProps> = ({
  totalCount,
  totalSelectedCount,
  displaySelectedCount,
  allSelected,
  someSelected,
  onToggleAll,
  onCancel,
  onConfirm,
}) => (
  <div className="hz-cm-export-mode-bar" role="region" aria-label="导出模式">
    <div className="hz-cm-export-mode-bar__main">
      <div className="hz-cm-export-mode-bar__left">
        <Checkbox
          indeterminate={someSelected}
          checked={allSelected}
          disabled={totalCount === 0}
          onChange={e => onToggleAll(e.target.checked)}
        >
          全选
        </Checkbox>
        <span className="hz-cm-export-mode-bar__count">
          {totalSelectedCount > displaySelectedCount ? (
            <>
              已选 <strong>{totalSelectedCount}</strong> 项（当前列表{' '}
              <strong>{displaySelectedCount}</strong> / {totalCount}）
            </>
          ) : (
            <>
              已选 <strong>{totalSelectedCount}</strong> / {totalCount} 项
            </>
          )}
        </span>
      </div>
      <div className="hz-cm-export-mode-bar__actions">
        <Button size="small" onClick={onCancel}>
          取消
        </Button>
        <Button
          type="primary"
          size="small"
          icon={<DownloadOutlined />}
          disabled={totalSelectedCount === 0}
          onClick={onConfirm}
        >
          确认导出
        </Button>
      </div>
    </div>
  </div>
);
