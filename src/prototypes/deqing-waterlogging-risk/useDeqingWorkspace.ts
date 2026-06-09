import { useCallback, useEffect, useRef, useState } from 'react';
import { initialIndicatorRiskLevels } from '../../database/deqing-waterlogging-risk-indicators';
import { savePersistedIndicators } from './indicatorPersistence';
import { savePersistedRiskLevels } from './riskLevelPersistence';
import { getLevelsFromRecord } from './riskLevelVersionUtils';
import {
  buildWorkspaceBundleFromPersistence,
  ensureServerPersistenceActive,
  loadWorkspaceForApp,
  saveWorkspaceToServer,
  type DeqingWorkspaceState,
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

export function useDeqingWorkspace(): {
  ready: boolean;
  loadError: string | null;
  state: DeqingWorkspaceState | null;
  setIndicators: (next: React.SetStateAction<RiskIndicatorRow[]>) => void;
  setIndicatorLevels: (next: React.SetStateAction<IndicatorRiskLevelRow[]>) => void;
  setRiskLevelRecords: (next: React.SetStateAction<RiskLevelVersionRecord[]>) => void;
  setPoints: (next: React.SetStateAction<WaterloggingPointRow[]>) => void;
  setRegionalPreventionRecords: (next: React.SetStateAction<RegionalPreventionRecord[]>) => void;
  setRiskChangeLogs: (next: React.SetStateAction<RiskChangeLogEntry[]>) => void;
  setArchitectureRecords: (next: React.SetStateAction<IndicatorArchitectureRecord[]>) => void;
} {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [state, setState] = useState<DeqingWorkspaceState | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<DeqingWorkspaceState | null>(null);

  const scheduleServerSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      if (!stateRef.current) return;
      ensureServerPersistenceActive();
      const bundle = buildWorkspaceBundleFromPersistence();
      void saveWorkspaceToServer(bundle).catch(err => {
        console.error('[deqing-workspace] 保存失败', err);
      });
    }, SAVE_DEBOUNCE_MS);
  }, []);

  const patchState = useCallback(
    (patch: Partial<DeqingWorkspaceState>) => {
      setState(prev => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        stateRef.current = next;
        return next;
      });
      scheduleServerSave();
    },
    [scheduleServerSave],
  );

  useEffect(() => {
    let cancelled = false;
    void loadWorkspaceForApp()
      .then(loaded => {
        if (cancelled) return;
        stateRef.current = loaded;
        setState(loaded);
        setLoadError(null);
        setReady(true);
      })
      .catch(err => {
        if (cancelled) return;
        console.error('[deqing-workspace] 加载失败', err);
        setLoadError(err instanceof Error ? err.message : '加载失败');
        const fallback: DeqingWorkspaceState = {
          indicators: [],
          indicatorLevels: initialIndicatorRiskLevels.map(row => ({ ...row, builtin: true })),
          riskLevelRecords: [],
          points: [],
          regionalPreventionRecords: [],
          riskChangeLogs: [],
          architectureRecords: [],
        };
        stateRef.current = fallback;
        setState(fallback);
        setReady(true);
      });
    return () => {
      cancelled = true;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const setIndicators = useCallback(
    (next: React.SetStateAction<RiskIndicatorRow[]>) => {
      setState(prev => {
        if (!prev) return prev;
        const resolved = typeof next === 'function' ? next(prev.indicators) : next;
        savePersistedIndicators(resolved);
        const merged = { ...prev, indicators: resolved };
        stateRef.current = merged;
        return merged;
      });
      scheduleServerSave();
    },
    [scheduleServerSave],
  );

  const setIndicatorLevels = useCallback(
    (next: React.SetStateAction<IndicatorRiskLevelRow[]>) => {
      setState(prev => {
        if (!prev) return prev;
        const resolved = typeof next === 'function' ? next(prev.indicatorLevels) : next;
        savePersistedRiskLevels(resolved);
        const merged = { ...prev, indicatorLevels: resolved };
        stateRef.current = merged;
        return merged;
      });
      scheduleServerSave();
    },
    [scheduleServerSave],
  );

  const setPoints = useCallback(
    (next: React.SetStateAction<WaterloggingPointRow[]>) => {
      setState(prev => {
        if (!prev) return prev;
        const resolved = typeof next === 'function' ? next(prev.points) : next;
        savePersistedPoints(resolved);
        const merged = { ...prev, points: resolved };
        stateRef.current = merged;
        return merged;
      });
      scheduleServerSave();
    },
    [scheduleServerSave],
  );

  const setRegionalPreventionRecords = useCallback(
    (next: React.SetStateAction<RegionalPreventionRecord[]>) => {
      setState(prev => {
        if (!prev) return prev;
        const resolved =
          typeof next === 'function' ? next(prev.regionalPreventionRecords) : next;
        savePersistedRegionalPrevention(resolved);
        const merged = { ...prev, regionalPreventionRecords: resolved };
        stateRef.current = merged;
        return merged;
      });
      scheduleServerSave();
    },
    [scheduleServerSave],
  );

  const setRiskChangeLogs = useCallback(
    (next: React.SetStateAction<RiskChangeLogEntry[]>) => {
      setState(prev => {
        if (!prev) return prev;
        const resolved = typeof next === 'function' ? next(prev.riskChangeLogs) : next;
        savePersistedRiskChangeLogs(resolved);
        const merged = { ...prev, riskChangeLogs: resolved };
        stateRef.current = merged;
        return merged;
      });
      scheduleServerSave();
    },
    [scheduleServerSave],
  );

  const setRiskLevelRecords = useCallback(
    (next: React.SetStateAction<RiskLevelVersionRecord[]>) => {
      setState(prev => {
        if (!prev) return prev;
        const resolved =
          typeof next === 'function' ? next(prev.riskLevelRecords) : next;
        savePersistedRiskLevelRecords(resolved);
        const active = resolved.find(r => r.activeForRating) ?? resolved[0];
        const indicatorLevels = getLevelsFromRecord(active ?? null);
        if (indicatorLevels.length > 0) {
          savePersistedRiskLevels(indicatorLevels);
        }
        const merged = {
          ...prev,
          riskLevelRecords: resolved,
          indicatorLevels: indicatorLevels.length > 0 ? indicatorLevels : prev.indicatorLevels,
        };
        stateRef.current = merged;
        return merged;
      });
      scheduleServerSave();
    },
    [scheduleServerSave],
  );

  const setArchitectureRecords = useCallback(
    (next: React.SetStateAction<IndicatorArchitectureRecord[]>) => {
      setState(prev => {
        if (!prev) return prev;
        const resolved =
          typeof next === 'function' ? next(prev.architectureRecords) : next;
        savePersistedArchitectureRecords(resolved);
        const merged = { ...prev, architectureRecords: resolved };
        stateRef.current = merged;
        return merged;
      });
      scheduleServerSave();
    },
    [scheduleServerSave],
  );

  return {
    ready,
    loadError,
    state,
    setIndicators,
    setIndicatorLevels,
    setRiskLevelRecords,
    setPoints,
    setRegionalPreventionRecords,
    setRiskChangeLogs,
    setArchitectureRecords,
  };
}
