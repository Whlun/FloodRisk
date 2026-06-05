/**
 * 湖州市空间全画像 · 壳层一级 Tab 跳转 Context
 */
import React, { createContext, useContext } from 'react';

export type HzShellSubKey = 'yizhangtu' | 'liyong' | 'jianguan' | 'zhongda' | 'dixiao';

type HzShellNavContextValue = {
  navigateSub: (key: HzShellSubKey) => void;
};

const HzShellNavContext = createContext<HzShellNavContextValue | null>(null);

export const HzShellNavProvider: React.FC<{
  navigateSub: (key: HzShellSubKey) => void;
  children: React.ReactNode;
}> = ({ navigateSub, children }) => (
  <HzShellNavContext.Provider value={{ navigateSub }}>{children}</HzShellNavContext.Provider>
);

export function useHzShellNav(): HzShellNavContextValue {
  const ctx = useContext(HzShellNavContext);
  if (ctx) return ctx;
  return {
    navigateSub: () => {
      /* 独立预览工作台时无壳层导航 */
    },
  };
}
