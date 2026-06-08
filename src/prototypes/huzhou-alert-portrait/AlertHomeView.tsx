/**
 * 预警工程画像 · 首页三栏（左预警统计 + 中地图 + 右预警列表）
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ALERT_HZ_LAYER_CONTROL, type HzLayerControlState } from '../huzhou-spatial-portrait/hzLayerControlState';
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
} from '../huzhou-construction-portrait/cmParcelDetailResolution';
import { CmProjectAlertRailPanel } from '../huzhou-construction-portrait/components/CmProjectAlertRailPanel';
import { CmProjectFavoriteStar } from '../huzhou-construction-portrait/components/CmProjectFavoriteStar';
import { useCmProjectFavorites } from '../huzhou-construction-portrait/useCmProjectFavorites';
import { useCmProjectListPanelState } from '../huzhou-construction-portrait/useCmProjectListPanelState';
import { cmRegionToDistrictName } from '../huzhou-construction-portrait/cmRegionFilter';
import { listCmIndustrialLandAlerts } from '../huzhou-construction-portrait/cmIndustrialLandAlert';
import type { HzMapProjectHighlight } from '../huzhou-spatial-portrait/hzMapProjectHighlight';
import { getCmIndustrialLandAlert } from '../huzhou-construction-portrait/cmIndustrialLandAlert';
import {
  buildAlertParcelColorMaps,
  buildFocusedAlertParcelHighlight,
  buildHzAlertProjectsMapHighlight,
} from '../huzhou-construction-portrait/hzCmMapHighlight';
import { getRegionAlertProjects } from '../huzhou-construction-portrait/mock/regionAlertProjects';
import { resolveProjectParcelId } from '../huzhou-construction-portrait/mock/projects';
import type { CmAlertType, CmPhaseAlertLevel, ConstructionProject } from '../huzhou-construction-portrait/types';
import { useHzShellRegion } from '../湖州市空间全画像/hzShellRegionContext';
import { zhtResolveDetailModalContainer } from '../zonghe-taishi/zhtDetailModalShared';
import { CmAlertStatsPanel } from './components/CmAlertStatsPanel';
import { HzCmPanelLayoutSwapToolBtn } from '../huzhou-construction-portrait/components/HzCmPanelLayoutSwapToolBtn';
import { useHzCmPanelLayoutSwap } from '../huzhou-construction-portrait/useHzCmPanelLayoutSwap';

export const AlertHomeView: React.FC = () => {
  const { isFavorite, toggleFavorite } = useCmProjectFavorites();
  const projectListPanelState = useCmProjectListPanelState();
  const [layerControl, setLayerControl] = useState<HzLayerControlState>(ALERT_HZ_LAYER_CONTROL);
  const { regionKey } = useHzShellRegion();
  const [selectedAlertLevel, setSelectedAlertLevel] = useState<CmPhaseAlertLevel | null>(null);
  const [selectedAlertType, setSelectedAlertType] = useState<CmAlertType | null>(null);
  const handleSelectAlertType = useCallback((type: CmAlertType | null) => {
    setSelectedAlertType(type);
    setSelectedAlertLevel(null);
  }, []);
  const [alertListExpanded, setAlertListExpanded] = useState(false);
  const [alertListSlideOpen, setAlertListSlideOpen] = useState(false);
  const collapseOverlaysBeforeSwap = useCallback(() => {
    setAlertListExpanded(false);
  }, []);
  const { panelsSwapped, togglePanelsSwapped } = useHzCmPanelLayoutSwap('alert', {
    onBeforeSwap: collapseOverlaysBeforeSwap,
  });
  const listPanelSide = panelsSwapped ? 'left' : 'right';
  const [locateHighlightedProjectId, setLocateHighlightedProjectId] = useState<string | null>(null);
  const [focusedParcelHighlight, setFocusedParcelHighlight] =
    useState<HzMapProjectHighlight | null>(null);
  const alertListExpandedRef = useRef(false);
  const locateHighlightedProjectIdRef = useRef<string | null>(null);
  const mapStageRef = useRef<HTMLDivElement>(null);
  const districtFilter = useMemo(() => cmRegionToDistrictName(regionKey), [regionKey]);

  /** 当前区县全部预警行（地图着色口径；不随左栏类型/等级/收藏筛选变化，对齐建管阶段卡片） */
  const regionAlertRows = useMemo(() => {
    const projects = getRegionAlertProjects(regionKey);
    return listCmIndustrialLandAlerts(projects);
  }, [regionKey]);

  const filteredAlertRows = useMemo(() => {
    let rows = regionAlertRows;
    if (selectedAlertLevel) {
      rows = rows.filter(({ alert }) => alert.level === selectedAlertLevel);
    }
    if (selectedAlertType) {
      rows = rows.filter(({ alert }) => alert.alertType === selectedAlertType);
    }
    if (projectListPanelState.favoritesOnly) {
      rows = rows.filter(({ project }) => isFavorite(project.id));
    }
    return rows;
  }, [regionAlertRows, selectedAlertLevel, selectedAlertType, projectListPanelState.favoritesOnly, isFavorite]);

  /** 地图仅展示预警地块并按类型着色；视野仅在区县切换时调整，左栏类型卡片点击不移动地图 */
  const alertParcelColors = useMemo(
    () => buildAlertParcelColorMaps(regionAlertRows, districtFilter),
    [regionAlertRows, districtFilter],
  );

  /** 选中类型时叠加高亮层（对齐建管阶段卡片：未选无高亮，选中按类型主题色强调） */
  const alertTypeHighlight = useMemo(() => {
    if (!selectedAlertType) return null;
    const rows = regionAlertRows.filter(({ alert }) => alert.alertType === selectedAlertType);
    return buildHzAlertProjectsMapHighlight(rows, districtFilter);
  }, [districtFilter, regionAlertRows, selectedAlertType]);

  const mapProjectHighlight = focusedParcelHighlight ?? alertTypeHighlight;

  useEffect(() => {
    setLocateHighlightedProjectId(null);
    setFocusedParcelHighlight(null);
  }, [selectedAlertLevel, selectedAlertType, regionKey, projectListPanelState.favoritesOnly]);

  useEffect(() => {
    alertListExpandedRef.current = alertListExpanded;
  }, [alertListExpanded]);

  useEffect(() => {
    locateHighlightedProjectIdRef.current = locateHighlightedProjectId;
  }, [locateHighlightedProjectId]);

  useEffect(() => {
    if (!alertListExpanded) {
      setAlertListSlideOpen(false);
      return;
    }
    setAlertListSlideOpen(false);
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setAlertListSlideOpen(true));
    });
    return () => window.cancelAnimationFrame(id);
  }, [alertListExpanded]);

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

  const handleOpenParcelFromProject = useCallback((project: ConstructionProject) => {
    openParcelDetailRef.current?.(
      resolveProjectParcelId(project),
      buildConstructionOpenOptions(project),
    );
  }, []);

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
        const alert = getCmIndustrialLandAlert(project);
        const highlight = alert
          ? buildFocusedAlertParcelHighlight(project, parcel, alert.alertType)
          : null;
        if (highlight) setFocusedParcelHighlight(highlight);
      };

      if (alertListExpandedRef.current) {
        flushSync(() => {
          setAlertListExpanded(false);
          alertListExpandedRef.current = false;
        });
        window.setTimeout(doLocate, 72);
        return;
      }
      doLocate();
    },
    [clearProjectLocateHighlight],
  );

  const alertListPanelProps = {
    regionKey,
    alertLevelFilter: selectedAlertLevel,
    alertTypeFilter: selectedAlertType,
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
    <CmProjectAlertRailPanel
      variant="rail"
      {...alertListPanelProps}
      listPanelSide={listPanelSide}
      onMapExpand={() => setAlertListExpanded(true)}
    />
  );

  return (
    <div
      className={[
        'zht-body',
        'hz-cm-body',
        'hz-alert-body',
        panelsSwapped ? 'hz-cm-body--panels-swapped' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <CmAlertStatsPanel
        regionKey={regionKey}
        selectedLevel={selectedAlertLevel}
        onSelectLevel={setSelectedAlertLevel}
        selectedAlertType={selectedAlertType}
        onSelectAlertType={handleSelectAlertType}
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
            exclusiveLanduseFeatureIds={alertParcelColors.featureIds}
            exclusiveLanduseFeatureFillColors={alertParcelColors.fillColorById}
            exclusiveLanduseFeatureLineColors={alertParcelColors.lineColorById}
            districtFilter={districtFilter}
            districtFocus={districtFilter}
            renderParcelDetailHeaderExtra={renderParcelDetailHeaderExtra}
            resolveConstructionContextFromParcel={resolveConstructionContextFromParcel}
            resolveDetailParcel={resolveDetailParcel}
            mapToolbarExtraAfterFullscreen={layoutSwapToolBtn}
          />
          {alertListExpanded ? (
            <div
              className={`zht-stat-drawer-map-host${
                alertListSlideOpen ? ' zht-stat-drawer-map-host--open' : ''
              }`}
              role="presentation"
            >
              <CmProjectAlertRailPanel
                variant="overlay"
                {...alertListPanelProps}
                listPanelSide={listPanelSide}
                onMapCollapse={() => setAlertListExpanded(false)}
              />
            </div>
          ) : null}
        </div>
      </div>

      {alertListExpanded ? (
        <aside className="zht-right-rail zht-right-rail--collapsed-for-stat-expand" aria-hidden="true" />
      ) : (
        rightRailPanel
      )}
    </div>
  );
};
