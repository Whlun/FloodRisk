import { useCallback, useEffect, useRef, useState } from 'react';
import { initialIndicatorRiskLevels } from '../../database/deqing-waterlogging-risk-indicators';
import { savePersistedIndicators } from './indicatorPersistence';
import { savePersistedRiskLevels } from './riskLevelPersistence';
import {
  buildWorkspaceBundleFromPersistence,
  ensureServerPersistenceActive,
  loadWorkspaceForApp,
  saveWorkspaceToServer,
  type DeqingWorkspaceState,
} from './workspaceService';
import {
  savePersistedLevel1Weights,
  savePersistedPoints,
  savePersistedRegionalPrevention,
  savePersistedRiskChangeLogs,
} from './workspacePersistence';
import { saveWeightSource, type WeightSource } from './weightSource';
import type {
  IndicatorRiskLevelRow,
  Level1Weights,
  RegionalPreventionRecord,
  RiskChangeLogEntry,
  RiskIndicatorRow,
  WaterloggingPointRow,
} from './types';

const SAVE_DEBOUNCE_MS = 400;

export function useDeqingWorkspace(): {
  ready: boolean;
  loadError: string | null;
  state: DeqingWorkspaceState | null;
  setIndicators: (next: React.SetStateAction<RiskIndicatorRow[]>) => void;
  setIndicatorLevels: (next: React.SetStateAction<IndicatorRiskLevelRow[]>) => void;
  setPoints: (next: React.SetStateAction<WaterloggingPointRow[]>) => void;
  setRegionalPreventionRecords: (next: React.SetStateAction<RegionalPreventionRecord[]>) => void;
  setRiskChangeLogs: (next: React.SetStateAction<RiskChangeLogEntry[]>) => void;
  setLevel1Weights: (weights: Level1Weights) => void;
  setWeightSource: (source: WeightSource) => void;
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
          points: [],
          regionalPreventionRecords: [],
          riskChangeLogs: [],
          level1Weights: { HAZARD: 0.258, FORMATION: 0.511, BEARING: 0.08, PREVENTION: 0.151 },
          weightSource: 'appendix_e',
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

  const setLevel1Weights = useCallback(
    (weights: Level1Weights) => {
      savePersistedLevel1Weights(weights);
      patchState({ level1Weights: weights });
    },
    [patchState],
  );

  const setWeightSource = useCallback(
    (source: WeightSource) => {
      saveWeightSource(source);
      patchState({ weightSource: source });
    },
    [patchState],
  );

  return {
    ready,
    loadError,
    state,
    setIndicators,
    setIndicatorLevels,
    setPoints,
    setRegionalPreventionRecords,
    setRiskChangeLogs,
    setLevel1Weights,
    setWeightSource,
  };
}
