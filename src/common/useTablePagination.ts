import { useEffect, useMemo, useState } from 'react';
import type { TablePaginationConfig } from 'antd/es/table';

export type UseTablePaginationOptions = {
  defaultPageSize?: number;
  pageSizeOptions?: Array<number | string>;
  showSizeChanger?: boolean;
  showTotal?: TablePaginationConfig['showTotal'];
  hideOnSinglePage?: boolean;
  size?: TablePaginationConfig['size'];
  /** 筛选条件变化时回到第 1 页 */
  resetDeps?: ReadonlyArray<unknown>;
};

export function useTablePagination(options: UseTablePaginationOptions = {}): TablePaginationConfig {
  const {
    defaultPageSize = 10,
    pageSizeOptions,
    showSizeChanger = false,
    showTotal,
    hideOnSinglePage,
    size,
    resetDeps = [],
  } = options;

  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  useEffect(() => {
    setCurrent(1);
  }, resetDeps);

  return useMemo(
    () => ({
      current,
      pageSize,
      ...(pageSizeOptions
        ? { pageSizeOptions }
        : showSizeChanger
          ? { pageSizeOptions: [10, 20, 50, 100] }
          : {}),
      showSizeChanger,
      showTotal,
      hideOnSinglePage,
      size,
      onChange: (page: number, nextPageSize: number) => {
        setCurrent(page);
        setPageSize(nextPageSize);
      },
    }),
    [current, pageSize, pageSizeOptions, showSizeChanger, showTotal, hideOnSinglePage, size],
  );
}
