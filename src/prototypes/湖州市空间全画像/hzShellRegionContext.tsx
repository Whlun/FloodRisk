/**
 * 湖州市空间全画像 · 壳层全局区县 Context
 */
import React, { createContext, useContext, useMemo, useState } from 'react';
import type { HzRegionKey } from '../huzhou-lifecycle-shared/hzRegionScope';

type HzShellRegionContextValue = {
  regionKey: HzRegionKey;
  setRegionKey: (key: HzRegionKey) => void;
};

const HzShellRegionContext = createContext<HzShellRegionContextValue | null>(null);

export const HzShellRegionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [regionKey, setRegionKey] = useState<HzRegionKey>('all');
  const value = useMemo(() => ({ regionKey, setRegionKey }), [regionKey]);
  return (
    <HzShellRegionContext.Provider value={value}>{children}</HzShellRegionContext.Provider>
  );
};

export function useHzShellRegion(): HzShellRegionContextValue {
  const ctx = useContext(HzShellRegionContext);
  const [fallbackKey, setFallbackKey] = useState<HzRegionKey>('all');
  if (ctx) return ctx;
  return { regionKey: fallbackKey, setRegionKey: setFallbackKey };
}
