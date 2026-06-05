/**
 * 空间利用画像 · 三栏主视图
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { DEFAULT_HZ_LAYER_CONTROL, type HzLayerControlState } from '../../hzLayerControlState';
import { hzRegionToDistrictName } from '../../../huzhou-lifecycle-shared/hzRegionScope';
import { useHzShellRegion } from '../../../湖州市空间全画像/hzShellRegionContext';
import {
  resolveCmContextFromParcel,
  resolveCmDetailParcel,
} from '../../../huzhou-construction-portrait/cmParcelDetailResolution';
import { zhtResolveDetailModalContainer } from '../../../zonghe-taishi/zhtDetailModalShared';
import { HuzhouMapWithParcelDetail } from '../HuzhouMapWithParcelDetail';
import { HzCmPanelLayoutSwapToolBtn } from '../../../huzhou-construction-portrait/components/HzCmPanelLayoutSwapToolBtn';
import { useHzCmPanelLayoutSwap } from '../../../huzhou-construction-portrait/useHzCmPanelLayoutSwap';
import { SpatialLeftPanel } from './SpatialLeftPanel';
import { SpatialRightPanel } from './SpatialRightPanel';

export const SpatialUtilizationView: React.FC = () => {
  const [layerControl, setLayerControl] = useState<HzLayerControlState>(DEFAULT_HZ_LAYER_CONTROL);
  const { regionKey } = useHzShellRegion();
  const districtFilter = useMemo(() => hzRegionToDistrictName(regionKey), [regionKey]);
  const mapStageRef = useRef<HTMLDivElement>(null);
  const { panelsSwapped, togglePanelsSwapped } = useHzCmPanelLayoutSwap('spatial');

  const layoutSwapToolBtn = (
    <HzCmPanelLayoutSwapToolBtn
      panelsSwapped={panelsSwapped}
      onToggle={togglePanelsSwapped}
      getPopupContainer={() => mapStageRef.current ?? document.body}
    />
  );

  const resolveConstructionContextFromParcel = useCallback(
    (parcelId: string) => resolveCmContextFromParcel(parcelId),
    [],
  );

  const resolveDetailParcel = useCallback(
    (parcelId: string, options?: Parameters<typeof resolveCmDetailParcel>[1]) =>
      resolveCmDetailParcel(parcelId, options),
    [],
  );

  return (
    <div
      className={['zht-body', 'hz-spatial-body', panelsSwapped ? 'hz-spatial-body--panels-swapped' : '']
        .filter(Boolean)
        .join(' ')}
    >
      <SpatialLeftPanel spaceMode={layerControl.activeMode} regionKey={regionKey} />
      <div ref={mapStageRef} className="zht-body-main hz-map-column">
        <HuzhouMapWithParcelDetail
          layerControl={layerControl}
          onLayerControlChange={setLayerControl}
          getParcelDetailModalContainer={() =>
            zhtResolveDetailModalContainer(mapStageRef.current)
          }
          regionScopeEnabled
          districtFilter={districtFilter}
          districtFocus={districtFilter}
          resolveConstructionContextFromParcel={resolveConstructionContextFromParcel}
          resolveDetailParcel={resolveDetailParcel}
          mapToolbarExtraAfterFullscreen={layoutSwapToolBtn}
        />
      </div>
      <SpatialRightPanel regionKey={regionKey} />
    </div>
  );
};
