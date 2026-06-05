/**
 * 顶栏「报警」与综合态势右侧报警看板的桥接：仅在综合态势挂载时注册回调，便于与地图同屏联动。
 */
import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';

export type ShellAlarmRailBridgeRegistry = {
  /** 由综合态势页挂载时注册；卸载时传 null */
  registerAlarmRailOpener: (fn: (() => void) | null) => void;
  /** 顶栏铃铛：打开右侧报警看板（仅注册后生效） */
  requestAlarmRail: () => void;
};

const ShellAlarmRailBridgeContext = createContext<ShellAlarmRailBridgeRegistry | null>(null);

export function ShellAlarmRailBridgeProvider({ children }: { children: React.ReactNode }) {
  const openerRef = useRef<(() => void) | null>(null);

  const registerAlarmRailOpener = useCallback((fn: (() => void) | null) => {
    openerRef.current = fn;
  }, []);

  const requestAlarmRail = useCallback(() => {
    openerRef.current?.();
  }, []);

  const value = useMemo(
    () => ({ registerAlarmRailOpener, requestAlarmRail }),
    [registerAlarmRailOpener, requestAlarmRail],
  );

  return (
    <ShellAlarmRailBridgeContext.Provider value={value}>{children}</ShellAlarmRailBridgeContext.Provider>
  );
}

export function useShellAlarmRailBridge(): ShellAlarmRailBridgeRegistry {
  const ctx = useContext(ShellAlarmRailBridgeContext);
  if (!ctx) {
    throw new Error('useShellAlarmRailBridge 须在 ShellAlarmRailBridgeProvider 内使用');
  }
  return ctx;
}

/** 独立预览综合态势（不经系统壳）时为空，不注册顶栏回调 */
export function useShellAlarmRailBridgeOptional(): ShellAlarmRailBridgeRegistry | null {
  return useContext(ShellAlarmRailBridgeContext);
}
