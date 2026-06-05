/**
 * 建设工程 / 预警工程 / 空间利用画像 · 左右看板布局互换（localStorage 持久化）
 */
import { useCallback, useEffect, useState } from 'react';

export type HzCmPanelLayoutPageKey = 'construction' | 'alert' | 'spatial';

const STORAGE_PREFIX = 'hz-cm-panel-layout-swapped';

function storageKey(pageKey: HzCmPanelLayoutPageKey): string {
  return `${STORAGE_PREFIX}:${pageKey}`;
}

function readSwapped(pageKey: HzCmPanelLayoutPageKey): boolean {
  try {
    return localStorage.getItem(storageKey(pageKey)) === '1';
  } catch {
    return false;
  }
}

function writeSwapped(pageKey: HzCmPanelLayoutPageKey, swapped: boolean): void {
  try {
    localStorage.setItem(storageKey(pageKey), swapped ? '1' : '0');
  } catch {
    /* 隐私模式等 */
  }
}

export type HzCmPanelLayoutSwapOptions = {
  /** 切换布局前收起铺满 overlay（由页面传入 setter） */
  onBeforeSwap?: () => void;
};

export function useHzCmPanelLayoutSwap(
  pageKey: HzCmPanelLayoutPageKey,
  options: HzCmPanelLayoutSwapOptions = {},
) {
  const { onBeforeSwap } = options;
  const [panelsSwapped, setPanelsSwappedState] = useState(() => readSwapped(pageKey));

  useEffect(() => {
    setPanelsSwappedState(readSwapped(pageKey));
  }, [pageKey]);

  const setPanelsSwapped = useCallback(
    (next: boolean) => {
      setPanelsSwappedState(next);
      writeSwapped(pageKey, next);
    },
    [pageKey],
  );

  const togglePanelsSwapped = useCallback(() => {
    onBeforeSwap?.();
    setPanelsSwappedState(prev => {
      const next = !prev;
      writeSwapped(pageKey, next);
      return next;
    });
  }, [onBeforeSwap, pageKey]);

  return { panelsSwapped, togglePanelsSwapped, setPanelsSwapped };
}
