import React, { useMemo } from 'react';
import { Select } from 'antd';
import type { IndicatorArchitectureRecord } from './types';
import { formatArchitectureRecordTitle, sortArchitectureRecords } from './indicatorArchitectureUtils';

interface Props {
  records: IndicatorArchitectureRecord[];
  /** 当前定级引用（非筛选模式下作为默认选中项） */
  activeRecord?: IndicatorArchitectureRecord | null;
  value: string;
  onChange: (architectureId: string) => void;
  /** 筛选模式：可不选（占位提示），清空表示不过滤 */
  allowAll?: boolean;
  placeholder?: string;
  style?: React.CSSProperties;
}

/** 评价版本下拉：筛选列表 / 新建记录绑定方案 */
export const ArchitectureVersionSelect: React.FC<Props> = ({
  records,
  activeRecord = null,
  value,
  onChange,
  allowAll = false,
  placeholder = '筛选评价版本',
  style,
}) => {
  const sorted = useMemo(() => sortArchitectureRecords(records), [records]);

  const options = useMemo(
    () =>
      sorted.map(r => ({
        value: r.id,
        label: formatArchitectureRecordTitle(r),
      })),
    [sorted],
  );

  const selectValue = value || (allowAll ? undefined : activeRecord?.id);

  return (
    <Select
      style={{ width: '100%', ...style }}
      placeholder={placeholder}
      allowClear={allowAll}
      value={selectValue}
      options={options}
      onChange={v => onChange(v ?? '')}
    />
  );
};

/** 解析下拉选中 id 对应的架构记录 */
export function resolveSelectedArchitectureRecord(
  records: IndicatorArchitectureRecord[],
  selectedId: string | undefined,
  fallback: IndicatorArchitectureRecord | null,
): IndicatorArchitectureRecord | null {
  if (!selectedId) return fallback;
  return records.find(r => r.id === selectedId) ?? fallback;
}
