import type { WorkspaceIndicatorMeta } from './workspaceTypes';

/** 浏览器 localStorage 与本地服务工作区文件（内存 KV）双模式 */
let serverMemoryMode = false;
const memoryStore = new Map<string, string>();

export function isServerMemoryPersistence(): boolean {
  return serverMemoryMode;
}

export function enableServerMemoryPersistence(meta?: WorkspaceIndicatorMeta): void {
  serverMemoryMode = true;
  memoryStore.clear();
  if (meta?.userEmptyMode) memoryStore.set('dq-indicators-user-empty-v1', '1');
  if (meta?.userEmptyIntentional) memoryStore.set('dq-indicators-user-empty-intentional-v1', '1');
  if (meta?.fullResetMigration) memoryStore.set('dq-indicators-full-reset-v2', '1');
  if (meta?.scratchEmptyOnce) memoryStore.set('dq-indicators-scratch-empty-v1', '1');
  if (meta?.condSourceFix) memoryStore.set('dq-indicators-cond-source-fix-v1', '1');
  if (meta?.auxLabelFix) memoryStore.set('dq-indicators-aux-label-fix-v1', '1');
  if (meta?.presetNumericMatchRepair) {
    memoryStore.set('dq-indicators-preset-numeric-match-repair-v1', '1');
  }
  if (meta?.blankSlateIndicators) {
    memoryStore.set('dq-indicators-blank-slate-v1', '1');
  }
}

export function disableServerMemoryPersistence(): void {
  serverMemoryMode = false;
  memoryStore.clear();
}

export function persistGetItem(key: string): string | null {
  if (serverMemoryMode) {
    return memoryStore.get(key) ?? null;
  }
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function persistSetItem(key: string, value: string): void {
  if (serverMemoryMode) {
    memoryStore.set(key, value);
    return;
  }
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* 忽略 */
  }
}

export function persistRemoveItem(key: string): void {
  if (serverMemoryMode) {
    memoryStore.delete(key);
    return;
  }
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* 忽略 */
  }
}

export function snapshotIndicatorMetaFromMemory(): WorkspaceIndicatorMeta {
  return {
    userEmptyMode: persistGetItem('dq-indicators-user-empty-v1') === '1' || undefined,
    userEmptyIntentional:
      persistGetItem('dq-indicators-user-empty-intentional-v1') === '1' || undefined,
    fullResetMigration: persistGetItem('dq-indicators-full-reset-v2') === '1' || undefined,
    scratchEmptyOnce: persistGetItem('dq-indicators-scratch-empty-v1') === '1' || undefined,
    condSourceFix: persistGetItem('dq-indicators-cond-source-fix-v1') === '1' || undefined,
    auxLabelFix: persistGetItem('dq-indicators-aux-label-fix-v1') === '1' || undefined,
    presetNumericMatchRepair:
      persistGetItem('dq-indicators-preset-numeric-match-repair-v1') === '1' || undefined,
    blankSlateIndicators: persistGetItem('dq-indicators-blank-slate-v1') === '1' || undefined,
  };
}

export function hydrateIndicatorRowsToMemory(indicatorsJson: string): void {
  memoryStore.set('dq-waterlogging-risk-indicators-v2', indicatorsJson);
}
