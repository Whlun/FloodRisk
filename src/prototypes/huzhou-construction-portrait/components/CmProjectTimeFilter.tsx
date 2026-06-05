/**
 * 建设工程画像 · 申报时间筛选（年度 / 月度 / 季度 / 自定义）
 * 采用 Ant Design Space.Compact 组合 Select + DatePicker / RangePicker
 */
import React, { useCallback, useMemo } from 'react';
import { DatePicker, Select, Space } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import {
  CM_DATE_PICKER_LOCALE,
  CM_TIME_FILTER_MODE_OPTIONS,
  getCmTimeFilterDisplayFormat,
  type CmTimeFilterMode,
} from '../cmTimeFilter';

const { RangePicker } = DatePicker;

export type CmProjectTimeFilterProps = {
  mode: CmTimeFilterMode;
  periodAnchor: Dayjs | null;
  dateRange: [Dayjs | null, Dayjs | null] | null;
  onModeChange: (mode: CmTimeFilterMode) => void;
  onPeriodAnchorChange: (value: Dayjs | null) => void;
  onDateRangeChange: (value: [Dayjs | null, Dayjs | null] | null) => void;
};

export const CmProjectTimeFilter: React.FC<CmProjectTimeFilterProps> = ({
  mode,
  periodAnchor,
  dateRange,
  onModeChange,
  onPeriodAnchorChange,
  onDateRangeChange,
}) => {
  const handleModeChange = useCallback(
    (next: CmTimeFilterMode) => {
      onModeChange(next);
      if (next === 'range') {
        onPeriodAnchorChange(null);
        return;
      }
      onDateRangeChange(null);
      onPeriodAnchorChange(periodAnchor ?? dayjs());
    },
    [onDateRangeChange, onModeChange, onPeriodAnchorChange, periodAnchor],
  );

  const periodPlaceholder = useMemo(() => {
    switch (mode) {
      case 'year':
        return '请选择年份';
      case 'month':
        return '请选择月份';
      case 'quarter':
        return '请选择季度';
      default:
        return undefined;
    }
  }, [mode]);

  const periodFormat = useMemo(() => getCmTimeFilterDisplayFormat(mode), [mode]);

  return (
    <Space.Compact block className="hz-cm-time-filter" aria-label="申报时间筛选">
      <Select
        className="hz-cm-time-filter__mode zht-stat-drawer__filter-item"
        value={mode}
        onChange={handleModeChange}
        options={CM_TIME_FILTER_MODE_OPTIONS}
        popupMatchSelectWidth={false}
      />
      {mode === 'range' ? (
        <RangePicker
          className="hz-cm-time-filter__picker zht-stat-drawer__filter-item"
          allowClear
          locale={CM_DATE_PICKER_LOCALE}
          format="YYYY年MM月DD日"
          placeholder={['开始日期', '结束日期']}
          value={dateRange}
          onChange={onDateRangeChange}
        />
      ) : (
        <DatePicker
          className="hz-cm-time-filter__picker zht-stat-drawer__filter-item"
          picker={mode}
          allowClear
          locale={CM_DATE_PICKER_LOCALE}
          format={periodFormat}
          placeholder={periodPlaceholder}
          value={periodAnchor}
          onChange={onPeriodAnchorChange}
        />
      )}
    </Space.Compact>
  );
};
