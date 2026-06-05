import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import datePickerZhCN from 'antd/es/date-picker/locale/zh_CN';

export type CmTimeFilterMode = 'year' | 'month' | 'quarter' | 'range';

/** 申报时间 DatePicker 中文 locale（覆盖季度 Q1/Q2 等英文默认格式） */
export const CM_DATE_PICKER_LOCALE = {
  ...datePickerZhCN,
  lang: {
    ...datePickerZhCN.lang,
    fieldYearFormat: 'YYYY年',
    fieldMonthFormat: 'YYYY年MM月',
    fieldQuarterFormat: 'YYYY年第Q季度',
    cellQuarterFormat: '第Q季度',
    fieldDateFormat: 'YYYY年MM月DD日',
  },
};

export function getCmTimeFilterDisplayFormat(mode: CmTimeFilterMode): string | undefined {
  switch (mode) {
    case 'year':
      return 'YYYY年';
    case 'month':
      return 'YYYY年MM月';
    case 'quarter':
      return 'YYYY年第Q季度';
    default:
      return undefined;
  }
}

export const CM_TIME_FILTER_MODE_OPTIONS: { value: CmTimeFilterMode; label: string }[] = [
  { value: 'year', label: '年度' },
  { value: 'month', label: '月度' },
  { value: 'quarter', label: '季度' },
  { value: 'range', label: '自定义' },
];

export function createDefaultCmTimeFilterState(): {
  mode: CmTimeFilterMode;
  periodAnchor: Dayjs;
  dateRange: [Dayjs | null, Dayjs | null] | null;
} {
  return {
    mode: 'year',
    periodAnchor: dayjs(),
    dateRange: null,
  };
}

export function resolveTimeFilterDates(
  mode: CmTimeFilterMode,
  periodAnchor: Dayjs | null,
  dateRange: [Dayjs | null, Dayjs | null] | null,
): { dateFrom?: string; dateTo?: string } {
  if (mode === 'range') {
    if (!dateRange?.[0] && !dateRange?.[1]) return {};
    return {
      dateFrom: dateRange?.[0]?.format('YYYY-MM-DD'),
      dateTo: dateRange?.[1]?.format('YYYY-MM-DD'),
    };
  }

  if (!periodAnchor) return {};

  if (mode === 'year') {
    return {
      dateFrom: periodAnchor.startOf('year').format('YYYY-MM-DD'),
      dateTo: periodAnchor.endOf('year').format('YYYY-MM-DD'),
    };
  }

  if (mode === 'month') {
    return {
      dateFrom: periodAnchor.startOf('month').format('YYYY-MM-DD'),
      dateTo: periodAnchor.endOf('month').format('YYYY-MM-DD'),
    };
  }

  return {
    dateFrom: periodAnchor.startOf('quarter').format('YYYY-MM-DD'),
    dateTo: periodAnchor.endOf('quarter').format('YYYY-MM-DD'),
  };
}
