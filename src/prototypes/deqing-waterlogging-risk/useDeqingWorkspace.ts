import { useCallback, useEffect, useRef, useState } from 'react';
import { savePersistedIndicators } from './indicatorPersistence';
import { savePersistedRiskLevels } from './riskLevelPersistence';
import { getLevelsFromRecord, getRiskLevelForRating } from './riskLevelVersionUtils';
import {
  buildWorkspaceBundleFromPersistence,
  createWorkspaceSaveCoordinator,
  ensureServerPersistenceActive,
  loadWorkspaceForApp,
  WorkspaceRevisionConflictError,
  type DeqingWorkspaceState,
  type WorkspaceSaveCoordinator,
} from './workspaceService';
import {
  savePersistedArchitectureRecords,
  savePersistedPoints,
  savePersistedRegionalPrevention,
  savePersistedRiskChangeLogs,
  savePersistedRiskLevelRecords,
} from './workspacePersistence';
import type {
  IndicatorArchitectureRecord,
  IndicatorRiskLevelRow,
  RegionalPreventionRecord,
  RiskChangeLogEntry,
  RiskIndicatorRow,
  RiskLevelVersionRecord,
  WaterloggingPointRow,
} from './types';

const SAVE_DEBOUNCE_MS = 400;
export type WorkspaceSaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'conflict';

export interface DeqingWorkspaceController {
  ready: boolean;
  loadError: string | null;
  saveStatus: WorkspaceSaveStatus;
  saveError: string | null;
  state: DeqingWorkspaceState | null;
  setIndicators: (next: React.SetStateAction<RiskIndicatorRow[]>) => void;
  setIndicatorLevels: (next: React.SetStateAction<IndicatorRiskLevelRow[]>) => void;
  setRiskLevelRecords: (next: React.SetStateAction<RiskLevelVersionRecord[]>) => void;
  setPoints: (next: React.SetStateAction<WaterloggingPointRow[]>) => void;
  setRegionalPreventionRecords: (next: React.SetStateAction<RegionalPreventionRecord[]>) => void;
  setRiskChangeLogs: (next: React.SetStateAction<RiskChangeLogEntry[]>) => void;
  setArchitectureRecords: (next: React.SetStateAction<IndicatorArchitectureRecord[]>) => void;
  /** 立即提交当前本地快照；失败会 reject，业务弹窗可保持打开。 */
  flush: () => Promise<void>;
  flushWorkspaceSave: () => Promise<void>;
  /** 加载失败后重试，不会在失败时构造空工作区。 */
  retryLoad: () => Promise<void>;
  /** 明确放弃未保存的本地冲突快照并从服务端重新加载。 */
  reloadWorkspace: () => Promise<void>;
  /** 导出保存失败/冲突时仍保留在队列中的本地工作区 JSON。 */
  exportConflict: () => string | null;
  exportConflictCopy: () => string | null;
}

export function useDeqingWorkspace(): DeqingWorkspaceController {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<WorkspaceSaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [state, setState] = useState<DeqingWorkspaceState | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<DeqingWorkspaceState | null>(null);
  const saveCoordinatorRef = useRef<WorkspaceSaveCoordinator | null>(null);
  const mountedRef = useRef(true);

  const flush = useCallback(async (): Promise<void> => {
    const coordinator = saveCoordinatorRef.current;
    if (!coordinator || !stateRef.current) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    ensureServerPersistenceActive();
    const bundle = buildWorkspaceBundleFromPersistence(coordinator.getRevision());
    if (mountedRef.current) {
      setSaveStatus('saving');
      setSaveError(null);
    }
    try {
      await coordinator.enqueue(bundle);
      if (mountedRef.current) setSaveStatus('saved');
    } catch (error) {
      if (mountedRef.current) {
        setSaveStatus(error instanceof WorkspaceRevisionConflictError ? 'conflict' : 'error');
        setSaveError(error instanceof Error ? error.message : '工作区保存失败');
      }
      throw error;
    }
  }, []);

  const enqueueCurrentWorkspace = useCallback(() => {
    void flush().catch(error => {
      console.error('[deqing-workspace] 保存失败，本地快照已保留', error);
    });
  }, [flush]);

  const scheduleServerSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      enqueueCurrentWorkspace();
    }, SAVE_DEBOUNCE_MS);
  }, [enqueueCurrentWorkspace]);

  const loadLatest = useCallback(async (): Promise<void> => {
    setReady(false);
    setLoadError(null);
    try {
      const loaded = await loadWorkspaceForApp();
      if (!mountedRef.current) return;
      saveCoordinatorRef.current = createWorkspaceSaveCoordinator(loaded.revision);
      stateRef.current = loaded.state;
      setState(loaded.state);
      setSaveStatus('idle');
      setSaveError(null);
      setReady(true);
    } catch (error) {
      if (!mountedRef.current) return;
      console.error('[deqing-workspace] 加载失败', error);
      setLoadError(error instanceof Error ? error.message : '加载失败');
      // 500/损坏不能退化为空工作区，否则下一次保存会覆盖原文件。
      stateRef.current = null;
      setState(null);
      setReady(true);
      throw error;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const flushLatest = () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        enqueueCurrentWorkspace();
      }
      void saveCoordinatorRef.current?.flush().catch(error => {
        console.error('[deqing-workspace] flush 失败，本地快照已保留', error);
      });
    };
    window.addEventListener('pagehide', flushLatest);
    window.addEventListener('beforeunload', flushLatest);
    void loadLatest().catch(() => {
      // loadError 已记录，等待显式 retry。
    });
    return () => {
      mountedRef.current = false;
      window.removeEventListener('pagehide', flushLatest);
      window.removeEventListener('beforeunload', flushLatest);
      flushLatest();
    };
  }, [enqueueCurrentWorkspace, loadLatest]);

  const setIndicators = useCallback(
    (next: React.SetStateAction<RiskIndicatorRow[]>) => {
      const prev = stateRef.current;
      if (!prev) return;
      const resolved = typeof next === 'function' ? next(prev.indicators) : next;
      savePersistedIndicators(resolved);
      const merged = { ...prev, indicators: resolved };
      stateRef.current = merged;
      setState(merged);
      scheduleServerSave();
    },
    [scheduleServerSave],
  );

  const setIndicatorLevels = useCallback(
    (next: React.SetStateAction<IndicatorRiskLevelRow[]>) => {
      const prev = stateRef.current;
      if (!prev) return;
      const resolved = typeof next === 'function' ? next(prev.indicatorLevels) : next;
      savePersistedRiskLevels(resolved);
      const merged = { ...prev, indicatorLevels: resolved };
      stateRef.current = merged;
      setState(merged);
      scheduleServerSave();
    },
    [scheduleServerSave],
  );

  const setPoints = useCallback(
    (next: React.SetStateAction<WaterloggingPointRow[]>) => {
      const prev = stateRef.current;
      if (!prev) return;
      const resolved = typeof next === 'function' ? next(prev.points) : next;
      savePersistedPoints(resolved);
      const merged = { ...prev, points: resolved };
      stateRef.current = merged;
      setState(merged);
      scheduleServerSave();
    },
    [scheduleServerSave],
  );

  const setRegionalPreventionRecords = useCallback(
    (next: React.SetStateAction<RegionalPreventionRecord[]>) => {
      const prev = stateRef.current;
      if (!prev) return;
      const resolved =
        typeof next === 'function' ? next(prev.regionalPreventionRecords) : next;
      savePersistedRegionalPrevention(resolved);
      const merged = { ...prev, regionalPreventionRecords: resolved };
      stateRef.current = merged;
      setState(merged);
      scheduleServerSave();
    },
    [scheduleServerSave],
  );

  const setRiskChangeLogs = useCallback(
    (next: React.SetStateAction<RiskChangeLogEntry[]>) => {
      const prev = stateRef.current;
      if (!prev) return;
      const resolved = typeof next === 'function' ? next(prev.riskChangeLogs) : next;
      savePersistedRiskChangeLogs(resolved);
      const merged = { ...prev, riskChangeLogs: resolved };
      stateRef.current = merged;
      setState(merged);
      scheduleServerSave();
    },
    [scheduleServerSave],
  );

  const setRiskLevelRecords = useCallback(
    (next: React.SetStateAction<RiskLevelVersionRecord[]>) => {
      const prev = stateRef.current;
      if (!prev) return;
      const resolved = typeof next === 'function' ? next(prev.riskLevelRecords) : next;
      savePersistedRiskLevelRecords(resolved);
      const active = getRiskLevelForRating(resolved);
      const indicatorLevels = getLevelsFromRecord(active);
      if (indicatorLevels.length > 0) savePersistedRiskLevels(indicatorLevels);
      const merged = {
        ...prev,
        riskLevelRecords: resolved,
        indicatorLevels: indicatorLevels.length > 0 ? indicatorLevels : prev.indicatorLevels,
      };
      stateRef.current = merged;
      setState(merged);
      scheduleServerSave();
    },
    [scheduleServerSave],
  );

  const setArchitectureRecords = useCallback(
    (next: React.SetStateAction<IndicatorArchitectureRecord[]>) => {
      const prev = stateRef.current;
      if (!prev) return;
      const resolved = typeof next === 'function' ? next(prev.architectureRecords) : next;
      savePersistedArchitectureRecords(resolved);
      const merged = { ...prev, architectureRecords: resolved };
      stateRef.current = merged;
      setState(merged);
      scheduleServerSave();
    },
    [scheduleServerSave],
  );

  return {
    ready,
    loadError,
    saveStatus,
    saveError,
    state,
    setIndicators,
    setIndicatorLevels,
    setRiskLevelRecords,
    setPoints,
    setRegionalPreventionRecords,
    setRiskChangeLogs,
    setArchitectureRecords,
    flush,
    flushWorkspaceSave: flush,
    retryLoad: loadLatest,
    reloadWorkspace: loadLatest,
    exportConflict: () => saveCoordinatorRef.current?.exportPendingWorkspace() ?? null,
    exportConflictCopy: () => saveCoordinatorRef.current?.exportPendingWorkspace() ?? null,
  };
}
