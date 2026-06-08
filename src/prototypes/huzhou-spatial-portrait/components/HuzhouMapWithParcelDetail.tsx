/**
 * 湖州地图 + 地块全生命周期详情（空间利用 / 建管画像等共用）
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ParcelDetailModal } from '../../huzhou-lifecycle-shared/components/ParcelDetailModal';
import type { CmPhaseAccentKey } from '../../huzhou-lifecycle-shared/cmPhaseAccent';
import type { ConstructionProjectBasicInfoSnapshot } from '../../huzhou-lifecycle-shared/cmProjectBasicInfo';
import type { HzPhaseAlertData } from '../../huzhou-lifecycle-shared/components/HzPhaseAlertLine';
import type { ParcelLifecycle } from '../../huzhou-lifecycle-shared/types';
import type { HzLayerControlState } from '../hzLayerControlState';
import type { HzMapProjectHighlight } from '../hzMapProjectHighlight';
import { getParcelById } from '../../huzhou-lifecycle-shared/mock/demoParcels';
import { getLanduseFeatureByOsmId } from '../huzhouMapConstants';
import { HuzhouMapBoard } from './HuzhouMapBoard';

export type OpenParcelDetailPhaseAlert = HzPhaseAlertData;

export type OpenParcelDetailOptions = {
  /** 建管画像：与项目卡阶段标签同色 */
  stageAccentPhaseKey?: CmPhaseAccentKey;
  /** 建管画像：与列表表格同源的项目字段 */
  constructionProject?: ConstructionProjectBasicInfoSnapshot;
  /** 建管画像：来源建设工程项目 id（收藏等） */
  constructionProjectId?: string;
  /** 建管画像：前三未预警（农转用报批 / 土地供应 / 工程规划许可三固定节点，与项目卡同源） */
  phaseAlert?: OpenParcelDetailPhaseAlert | null;
};

export type OpenParcelDetailFn = (parcelId: string, options?: OpenParcelDetailOptions) => void;
export type LocateParcelOnMapFn = (parcel: ParcelLifecycle) => void;

export type HuzhouMapWithParcelDetailProps = {
  layerControl: HzLayerControlState;
  onLayerControlChange: (next: HzLayerControlState) => void;
  /** 供外部（如建管项目列表）复用同一套地块详情 Modal */
  onRegisterOpenParcelDetail?: (open: OpenParcelDetailFn) => void;
  /** 供外部（如建管项目列表）复用地图 flyTo 定位 */
  onRegisterLocateParcel?: (locate: LocateParcelOnMapFn) => void;
  /** 建管画像：选中阶段时高亮对应演示项目地块；传 prop 即启用，`null` 清除 */
  projectHighlight?: HzMapProjectHighlight | null;
  /** 建管画像：启用区县范围过滤与视野锁定 */
  regionScopeEnabled?: boolean;
  districtFilter?: string | null;
  districtFocus?: string | null;
  /** 详情 Modal 挂载容器（对齐综合态势 mapFullscreenStageRef） */
  getParcelDetailModalContainer?: () => HTMLElement;
  /** 建管画像：详情弹窗 header 左侧扩展（如收藏星标） */
  renderParcelDetailHeaderExtra?: (constructionProjectId: string | undefined) => React.ReactNode;
  /** 建管画像：地图点地块时补全项目 id / 基本信息（无则仅无收藏，顶栏样式仍统一） */
  resolveConstructionContextFromParcel?: (
    parcelId: string,
  ) => OpenParcelDetailOptions | undefined;
  /** 建管画像：按建设项目合并地块台账（阶段与标签对齐） */
  resolveDetailParcel?: (
    parcelId: string,
    options?: OpenParcelDetailOptions,
  ) => ParcelLifecycle | undefined;
  /** 预警画像：预警地块 osm_id 列表；regionScopeEnabled 时与建管同源区县过滤/视野 */
  exclusiveLanduseFeatureIds?: string[];
  /** 预警画像：按 osm_id 着色（与前三未类型标签 `getAlertTypeAccent` 一致） */
  exclusiveLanduseFeatureFillColors?: Record<string, string>;
  exclusiveLanduseFeatureLineColors?: Record<string, string>;
  /** 地图工具条全屏按钮下方的扩展项 */
  mapToolbarExtraAfterFullscreen?: React.ReactNode;
};

export const HuzhouMapWithParcelDetail: React.FC<HuzhouMapWithParcelDetailProps> = ({
  layerControl,
  onLayerControlChange,
  onRegisterOpenParcelDetail,
  onRegisterLocateParcel,
  projectHighlight,
  regionScopeEnabled,
  districtFilter,
  districtFocus,
  getParcelDetailModalContainer,
  renderParcelDetailHeaderExtra,
  resolveConstructionContextFromParcel,
  resolveDetailParcel,
  exclusiveLanduseFeatureIds,
  exclusiveLanduseFeatureFillColors,
  exclusiveLanduseFeatureLineColors,
  mapToolbarExtraAfterFullscreen,
}) => {
  const [parcelDetailId, setParcelDetailId] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailStageAccentPhaseKey, setDetailStageAccentPhaseKey] = useState<
    CmPhaseAccentKey | undefined
  >();
  const [detailConstructionProject, setDetailConstructionProject] = useState<
    ConstructionProjectBasicInfoSnapshot | undefined
  >();
  const [detailConstructionProjectId, setDetailConstructionProjectId] = useState<
    string | undefined
  >();
  const [detailPhaseAlert, setDetailPhaseAlert] = useState<
    OpenParcelDetailPhaseAlert | null | undefined
  >();
  /** 关闭动画期间保留，避免顶栏收藏/自定义关闭与默认关闭钮切换导致位移 */
  const headerExtraProjectIdRef = useRef<string | undefined>();
  const mapFlyToRef = useRef<((parcel: ParcelLifecycle) => void) | null>(null);

  const handleParcelClick = useCallback<OpenParcelDetailFn>(
    (parcelId, options) => {
      const fromParcel = resolveConstructionContextFromParcel?.(parcelId);
      const merged: OpenParcelDetailOptions = {
        ...fromParcel,
        ...options,
        constructionProjectId:
          options?.constructionProjectId ?? fromParcel?.constructionProjectId,
        stageAccentPhaseKey:
          options?.stageAccentPhaseKey ?? fromParcel?.stageAccentPhaseKey,
        constructionProject:
          options?.constructionProject ?? fromParcel?.constructionProject,
        phaseAlert: options?.phaseAlert ?? fromParcel?.phaseAlert ?? null,
      };
      setParcelDetailId(parcelId);
      setDetailModalOpen(true);
      setDetailStageAccentPhaseKey(merged.stageAccentPhaseKey);
      setDetailConstructionProject(merged.constructionProject);
      setDetailConstructionProjectId(merged.constructionProjectId);
      setDetailPhaseAlert(merged.phaseAlert ?? null);
      headerExtraProjectIdRef.current = merged.constructionProjectId;
    },
    [resolveConstructionContextFromParcel],
  );

  useEffect(() => {
    onRegisterOpenParcelDetail?.(handleParcelClick);
  }, [onRegisterOpenParcelDetail, handleParcelClick]);

  useEffect(() => {
    if (!onRegisterLocateParcel) return;
    onRegisterLocateParcel(parcel => {
      mapFlyToRef.current?.(parcel);
    });
  }, [onRegisterLocateParcel]);

  const handleCloseDetail = useCallback(() => {
    setDetailModalOpen(false);
  }, []);

  const handleAfterCloseDetail = useCallback(() => {
    setParcelDetailId(null);
    setDetailStageAccentPhaseKey(undefined);
    setDetailConstructionProject(undefined);
    setDetailConstructionProjectId(undefined);
    setDetailPhaseAlert(undefined);
    headerExtraProjectIdRef.current = undefined;
  }, []);

  const headerExtraProjectId =
    detailModalOpen ? detailConstructionProjectId : headerExtraProjectIdRef.current;

  const parcelDetailHeaderExtra = useMemo(
    () => renderParcelDetailHeaderExtra?.(headerExtraProjectId),
    [headerExtraProjectId, renderParcelDetailHeaderExtra],
  );

  const handleLocateOnMap = useCallback((parcel: ParcelLifecycle) => {
    mapFlyToRef.current?.(parcel);
  }, []);

  const detailParcel = useMemo(() => {
    if (!parcelDetailId) return undefined;
    if (resolveDetailParcel) {
      return resolveDetailParcel(parcelDetailId, {
        constructionProjectId: detailConstructionProjectId,
        constructionProject: detailConstructionProject,
        stageAccentPhaseKey: detailStageAccentPhaseKey,
      });
    }
    return getParcelById(parcelDetailId);
  }, [
    parcelDetailId,
    resolveDetailParcel,
    detailConstructionProjectId,
    detailConstructionProject,
    detailStageAccentPhaseKey,
  ]);

  return (
    <>
      <HuzhouMapBoard
        layerControl={layerControl}
        onLayerControlChange={onLayerControlChange}
        onParcelClick={handleParcelClick}
        registerParcelFlyTo={fn => {
          mapFlyToRef.current = fn;
        }}
        projectHighlight={projectHighlight}
        regionScopeEnabled={regionScopeEnabled}
        districtFilter={districtFilter}
        districtFocus={districtFocus}
        exclusiveLanduseFeatureIds={exclusiveLanduseFeatureIds}
        exclusiveLanduseFeatureFillColors={exclusiveLanduseFeatureFillColors}
        exclusiveLanduseFeatureLineColors={exclusiveLanduseFeatureLineColors}
        mapToolbarExtraAfterFullscreen={mapToolbarExtraAfterFullscreen}
      />
      <ParcelDetailModal
        open={detailModalOpen}
        parcel={detailParcel}
        onClose={handleCloseDetail}
        afterClose={handleAfterCloseDetail}
        onLocateOnMap={handleLocateOnMap}
        getModalContainer={getParcelDetailModalContainer}
        stageAccentPhaseKey={detailStageAccentPhaseKey}
        constructionProject={detailConstructionProject}
        phaseAlert={detailPhaseAlert ?? null}
        headerExtra={parcelDetailHeaderExtra}
        resolveParcelLanduseFeature={parcel =>
          parcel.mapFeatureId ? getLanduseFeatureByOsmId(parcel.mapFeatureId) : null
        }
      />
    </>
  );
};
