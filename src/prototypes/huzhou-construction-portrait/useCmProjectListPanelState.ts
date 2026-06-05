import { useCallback, useEffect, useState } from 'react';
import type { Dayjs } from 'dayjs';
import { getCmProjectTableDefaultVisibleColumnKeys } from './cmProjectTableColumns';
import {
  createDefaultCmTimeFilterState,
  resolveTimeFilterDates,
  type CmTimeFilterMode,
} from './cmTimeFilter';

const DEFAULT_TIME_FILTER = createDefaultCmTimeFilterState();

export type CmProjectQuerySnapshot = {
  nameKw: string;
  dateFrom?: string;
  dateTo?: string;
};

export const EMPTY_CM_PROJECT_QUERY: CmProjectQuerySnapshot = {
  nameKw: '',
};

export function buildCmProjectQuerySnapshot(
  nameKw: string,
  timeFilter: {
    mode: CmTimeFilterMode;
    periodAnchor: Dayjs | null;
    dateRange: [Dayjs | null, Dayjs | null] | null;
  },
): CmProjectQuerySnapshot {
  const { dateFrom, dateTo } = resolveTimeFilterDates(
    timeFilter.mode,
    timeFilter.periodAnchor,
    timeFilter.dateRange,
  );
  return {
    nameKw: nameKw.trim(),
    dateFrom,
    dateTo,
  };
}

/** 首页右栏 / overlay 铺满态共享筛选与视图状态（overlay ↔ rail 切换不丢） */
export function useCmProjectListPanelState() {
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [nameKw, setNameKw] = useState('');
  const [timeFilterMode, setTimeFilterMode] = useState<CmTimeFilterMode>(DEFAULT_TIME_FILTER.mode);
  const [periodAnchor, setPeriodAnchor] = useState<Dayjs | null>(DEFAULT_TIME_FILTER.periodAnchor);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(
    DEFAULT_TIME_FILTER.dateRange,
  );
  const [querySnapshot, setQuerySnapshot] = useState<CmProjectQuerySnapshot>(() =>
    buildCmProjectQuerySnapshot('', DEFAULT_TIME_FILTER),
  );
  const [visibleTableColumns, setVisibleTableColumns] = useState<string[]>(() =>
    getCmProjectTableDefaultVisibleColumnKeys(),
  );

  const syncDateQuery = useCallback(
    (mode: CmTimeFilterMode, anchor: Dayjs | null, range: [Dayjs | null, Dayjs | null] | null) => {
      const { dateFrom, dateTo } = resolveTimeFilterDates(mode, anchor, range);
      setQuerySnapshot(prev => ({
        ...prev,
        dateFrom,
        dateTo,
      }));
    },
    [],
  );

  useEffect(() => {
    syncDateQuery(timeFilterMode, periodAnchor, dateRange);
  }, [dateRange, periodAnchor, syncDateQuery, timeFilterMode]);

  const resetQuery = useCallback(() => {
    const defaults = createDefaultCmTimeFilterState();
    setNameKw('');
    setTimeFilterMode(defaults.mode);
    setPeriodAnchor(defaults.periodAnchor);
    setDateRange(defaults.dateRange);
    setQuerySnapshot(buildCmProjectQuerySnapshot('', defaults));
  }, []);

  const applyQuery = useCallback(
    (nameKwValue: string) => {
      setQuerySnapshot(
        buildCmProjectQuerySnapshot(nameKwValue, {
          mode: timeFilterMode,
          periodAnchor,
          dateRange,
        }),
      );
    },
    [dateRange, periodAnchor, timeFilterMode],
  );

  return {
    favoritesOnly,
    setFavoritesOnly,
    viewMode,
    setViewMode,
    nameKw,
    setNameKw,
    timeFilterMode,
    setTimeFilterMode,
    periodAnchor,
    setPeriodAnchor,
    dateRange,
    setDateRange,
    querySnapshot,
    setQuerySnapshot,
    visibleTableColumns,
    setVisibleTableColumns,
    resetQuery,
    applyQuery,
  };
}

export type CmProjectListPanelState = ReturnType<typeof useCmProjectListPanelState>;
