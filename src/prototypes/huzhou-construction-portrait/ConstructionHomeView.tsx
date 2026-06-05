/**
 * 建设工程画像 · 首页三栏（克隆综合态势交互，地图与空间利用画像一致）
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { DEFAULT_HZ_LAYER_CONTROL, type HzLayerControlState } from '../huzhou-spatial-portrait/hzLayerControlState';
import type { HzMapProjectHighlight } from '../huzhou-spatial-portrait/hzMapProjectHighlight';
import {
  HuzhouMapWithParcelDetail,
  type LocateParcelOnMapFn,
  type OpenParcelDetailFn,
  type OpenParcelDetailOptions,
} from '../huzhou-spatial-portrait/components/HuzhouMapWithParcelDetail';
import { getParcelById } from '../huzhou-lifecycle-shared/mock/demoParcels';
import {
  buildConstructionOpenOptions,
  resolveCmContextFromParcel,
  resolveCmDetailParcel,
} from './cmParcelDetailResolution';
import { CmProjectAlertRailPanel } from './components/CmProjectAlertRailPanel';
import { CmProjectFavoriteStar } from './components/CmProjectFavoriteStar';
import { CmProjectLeftPanel } from './components/CmProjectLeftPanel';
import { useCmProjectFavorites } from './useCmProjectFavorites';
import { useCmProjectListPanelState } from './useCmProjectListPanelState';
import { CmPhaseDistributionPanel } from './components/CmPhaseDistributionPanel';
import { HzCmPanelLayoutSwapToolBtn } from './components/HzCmPanelLayoutSwapToolBtn';
import { useHzCmPanelLayoutSwap } from './useHzCmPanelLayoutSwap';
import { useHzShellRegion } from '../湖州市空间全画像/hzShellRegionContext';
import { cmRegionToDistrictName } from './cmRegionFilter';
import { buildFocusedParcelHighlight, buildHzMapProjectHighlight } from './hzCmMapHighlight';
import { resolveProjectParcelId } from './mock/projects';
import type { ConstructionProject, PhaseKey } from './types';
import { zhtResolveDetailModalContainer } from '../zonghe-taishi/zhtDetailModalShared';

/** 与 `.zht-stat-drawer-map-host .zht-stat-drawer--overlay` transition 时长一致 */
const STAT_DRAWER_SLIDE_MS = 420;

export const ConstructionHomeView: React.FC = () => {
  const { isFavorite, toggleFavorite } = useCmProjectFavorites();
  const projectListPanelState = useCmProjectListPanelState();
  const [layerControl, setLayerControl] = useState<HzLayerControlState>(DEFAULT_HZ_LAYER_CONTROL);
  const { regionKey } = useHzShellRegion();
  const [selectedPhaseKey, setSelectedPhaseKey] = useState<PhaseKey | null>(null);
  const [alertRailOpen, setAlertRailOpen] = useState(false);
  const [alertRailSlideOpen, setAlertRailSlideOpen] = useState(false);
  /** 右侧项目列表铺满地图列（与综合态势 leftStatExpanded 对齐） */
  const [projectListExpanded, setProjectListExpanded] = useState(false);
  const [projectListSlideOpen, setProjectListSlideOpen] = useState(false);
  const collapseOverlaysBeforeSwap = useCallback(() => {
    setProjectListExpanded(false);
    setAlertRailOpen(false);
  }, []);
  const { panelsSwapped, togglePanelsSwapped } = useHzCmPanelLayoutSwap('construction', {
    onBeforeSwap: collapseOverlaysBeforeSwap,
  });
  const listPanelSide = panelsSwapped ? 'left' : 'right';
  const [focusedParcelHighlight, setFocusedParcelHighlight] = useState<HzMapProjectHighlight | null>(
    null,
  );
  const [locateHighlightedProjectId, setLocateHighlightedProjectId] = useState<string | null>(null);
  const projectListExpandedRef = useRef(false);
  const locateHighlightedProjectIdRef = useRef<string | null>(null);
  const mapStageRef = useRef<HTMLDivElement>(null);
  const districtFilter = useMemo(() => cmRegionToDistrictName(regionKey), [regionKey]);
  const phaseHighlight = useMemo(
    () => buildHzMapProjectHighlight(selectedPhaseKey, regionKey),
    [selectedPhaseKey, regionKey],
  );
  const mapProjectHighlight = focusedParcelHighlight ?? phaseHighlight;

  useEffect(() => {
    setFocusedParcelHighlight(null);
    setLocateHighlightedProjectId(null);
  }, [selectedPhaseKey, regionKey]);

  useEffect(() => {
    projectListExpandedRef.current = projectListExpanded;
  }, [projectListExpanded]);

  useEffect(() => {
    locateHighlightedProjectIdRef.current = locateHighlightedProjectId;
  }, [locateHighlightedProjectId]);

  useEffect(() => {
    if (!projectListExpanded) {
      setProjectListSlideOpen(false);
      return;
    }
    setProjectListSlideOpen(false);
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setProjectListSlideOpen(true));
    });
    return () => window.cancelAnimationFrame(id);
  }, [projectListExpanded]);

  /** 预警面板：覆盖在右侧项目列表上滑入 */
  useEffect(() => {
    if (!alertRailOpen) {
      setAlertRailSlideOpen(false);
      return;
    }
    setAlertRailSlideOpen(false);
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setAlertRailSlideOpen(true));
    });
    return () => window.cancelAnimationFrame(id);
  }, [alertRailOpen]);

  const openParcelDetailRef = useRef<OpenParcelDetailFn | null>(null);
  const locateParcelRef = useRef<LocateParcelOnMapFn | null>(null);

  const handleRegisterOpenParcelDetail = useCallback((open: OpenParcelDetailFn) => {
    openParcelDetailRef.current = open;
  }, []);

  const handleRegisterLocateParcel = useCallback((locate: LocateParcelOnMapFn) => {
    locateParcelRef.current = locate;
  }, []);

  const clearProjectLocateHighlight = useCallback(() => {
    setLocateHighlightedProjectId(null);
    setFocusedParcelHighlight(null);
  }, []);

  const resolveDetailParcel = useCallback(
    (parcelId: string, options?: OpenParcelDetailOptions) =>
      resolveCmDetailParcel(parcelId, options),
    [],
  );

  const resolveConstructionContextFromParcel = useCallback(
    (parcelId: string): OpenParcelDetailOptions | undefined =>
      resolveCmContextFromParcel(parcelId, locateHighlightedProjectIdRef.current),
    [],
  );

  const dismissAlertRail = useCallback((afterClose?: () => void) => {
    setAlertRailSlideOpen(false);
    window.setTimeout(() => {
      setAlertRailOpen(false);
      afterClose?.();
    }, STAT_DRAWER_SLIDE_MS);
  }, []);

  const closeAlertRail = useCallback(() => {
    dismissAlertRail();
  }, [dismissAlertRail]);

  const handleSelectPhase = useCallback(
    (key: PhaseKey | null) => {
      if (key != null && alertRailOpen) {
        dismissAlertRail(() => setSelectedPhaseKey(key));
        return;
      }
      setSelectedPhaseKey(key);
    },
    [alertRailOpen, dismissAlertRail],
  );

  const handleOpenParcelFromProject = useCallback(
    (project: ConstructionProject) => {
      openParcelDetailRef.current?.(
        resolveProjectParcelId(project),
        buildConstructionOpenOptions(project),
      );
    },
    [],
  );

  const renderParcelDetailHeaderExtra = useCallback(
    (constructionProjectId: string | undefined) => {
      if (!constructionProjectId) return null;
      return (
        <CmProjectFavoriteStar
          active={isFavorite(constructionProjectId)}
          onToggle={() => toggleFavorite(constructionProjectId)}
        />
      );
    },
    [isFavorite, toggleFavorite],
  );

  const handleLocateProjectOnMap = useCallback(
    (project: ConstructionProject) => {
      if (locateHighlightedProjectIdRef.current === project.id) {
        clearProjectLocateHighlight();
        return;
      }
      setLocateHighlightedProjectId(project.id);

      const doLocate = () => {
        const parcel = getParcelById(resolveProjectParcelId(project));
        if (!parcel) return;
        locateParcelRef.current?.(parcel);
        const highlight = buildFocusedParcelHighlight(project, parcel);
        if (highlight) setFocusedParcelHighlight(highlight);
      };

      if (projectListExpandedRef.current) {
        flushSync(() => {
          setProjectListExpanded(false);
          projectListExpandedRef.current = false;
        });
        window.setTimeout(doLocate, 72);
        return;
      }
      doLocate();
    },
    [clearProjectLocateHighlight],
  );

  const projectListPanelProps = {
    regionKey,
    selectedPhaseKey,
    panelState: projectListPanelState,
    onOpenParcelDetail: handleOpenParcelFromProject,
    onLocateProjectOnMap: handleLocateProjectOnMap,
    locateHighlightedProjectId,
    onClearLocateHighlight: clearProjectLocateHighlight,
    isFavorite,
    onToggleFavorite: toggleFavorite,
  };

  const layoutSwapToolBtn = (
    <HzCmPanelLayoutSwapToolBtn
      panelsSwapped={panelsSwapped}
      onToggle={togglePanelsSwapped}
      getPopupContainer={() => mapStageRef.current ?? document.body}
    />
  );

  const rightRailPanel = (
    <CmProjectLeftPanel
      variant="rail"
      {...projectListPanelProps}
      listPanelSide={listPanelSide}
      onMapExpand={() => setProjectListExpanded(true)}
      stackOverlay={
        alertRailOpen ? (
          <CmProjectAlertRailPanel
            slideOpen={alertRailSlideOpen}
            regionKey={regionKey}
            onOpenParcelDetail={handleOpenParcelFromProject}
            onLocateProjectOnMap={handleLocateProjectOnMap}
            locateHighlightedProjectId={locateHighlightedProjectId}
            onClearLocateHighlight={clearProjectLocateHighlight}
            onClose={closeAlertRail}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
          />
        ) : undefined
      }
    />
  );

  return (
    <div
      className={['zht-body', 'hz-cm-body', panelsSwapped ? 'hz-cm-body--panels-swapped' : '']
        .filter(Boolean)
        .join(' ')}
    >
      <CmPhaseDistributionPanel
        regionKey={regionKey}
        selectedPhaseKey={selectedPhaseKey}
        onSelectPhase={handleSelectPhase}
        panelState={projectListPanelState}
      />

      <div ref={mapStageRef} className="zht-body-main hz-map-column hz-cm-map-stage">
        <div className="zht-map-drawer-stack">
          <HuzhouMapWithParcelDetail
            layerControl={layerControl}
            onLayerControlChange={setLayerControl}
            onRegisterOpenParcelDetail={handleRegisterOpenParcelDetail}
            onRegisterLocateParcel={handleRegisterLocateParcel}
            getParcelDetailModalContainer={() =>
              zhtResolveDetailModalContainer(mapStageRef.current)
            }
            regionScopeEnabled
            projectHighlight={mapProjectHighlight}
            districtFilter={districtFilter}
            districtFocus={districtFilter}
            renderParcelDetailHeaderExtra={renderParcelDetailHeaderExtra}
            resolveConstructionContextFromParcel={resolveConstructionContextFromParcel}
            resolveDetailParcel={resolveDetailParcel}
            mapToolbarExtraAfterFullscreen={layoutSwapToolBtn}
          />
          {projectListExpanded ? (
            <div
              className={`zht-stat-drawer-map-host${
                projectListSlideOpen ? ' zht-stat-drawer-map-host--open' : ''
              }`}
              role="presentation"
            >
              <CmProjectLeftPanel
                variant="overlay"
                {...projectListPanelProps}
                listPanelSide={listPanelSide}
                onMapCollapse={() => setProjectListExpanded(false)}
              />
            </div>
          ) : null}
        </div>
      </div>

      {projectListExpanded ? (
        <aside className="zht-right-rail zht-right-rail--collapsed-for-stat-expand" aria-hidden="true" />
      ) : (
        rightRailPanel
      )}
    </div>
  );
};
