/**
 * 综合态势 · 地图视角预设 Popover 内容：保存当前相机、网格一键恢复
 */
import React, { useCallback, useMemo, useState } from 'react';
import { message } from 'antd';
import type { Map } from 'maplibre-gl';
import { Mountain, X } from 'lucide-react';
import {
  ZHT_MAP_VIEW_PRESETS_MAX,
  loadMapViewPresets,
  newPresetId,
  nextDefaultPresetLabel,
  presetToFlyToOptions,
  saveMapViewPresets,
  type ZhtMapViewPreset,
} from './zhtMapViewPresets';

export interface ZhtMapViewPresetsPopoverContentProps {
  mapRef: React.MutableRefObject<Map | null>;
}

function readCameraFromMap(map: Map): Omit<ZhtMapViewPreset, 'id' | 'label' | 'createdAt'> {
  const c = map.getCenter();
  return {
    center: [c.lng, c.lat],
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  };
}

export const ZhtMapViewPresetsPopoverContent: React.FC<ZhtMapViewPresetsPopoverContentProps> = ({
  mapRef,
}) => {
  const [presets, setPresets] = useState<ZhtMapViewPreset[]>(() => loadMapViewPresets());

  const onSaveClick = useCallback(() => {
    const map = mapRef.current;
    if (!map) {
      message.warning('地图未就绪，请稍后再试');
      return;
    }
    setPresets(cur => {
      if (cur.length >= ZHT_MAP_VIEW_PRESETS_MAX) {
        message.warning(`最多保存 ${ZHT_MAP_VIEW_PRESETS_MAX} 个视角，请先删除不常用的项`);
        return cur;
      }
      let cam: ReturnType<typeof readCameraFromMap>;
      try {
        cam = readCameraFromMap(map);
      } catch {
        message.error('无法读取当前地图视角');
        return cur;
      }
      const label = nextDefaultPresetLabel(cur);
      const next: ZhtMapViewPreset[] = [
        ...cur,
        {
          id: newPresetId(),
          label,
          ...cam,
          createdAt: Date.now(),
        },
      ];
      saveMapViewPresets(next);
      message.success(`已保存「${label}」`);
      return next;
    });
  }, [mapRef]);

  const onApply = useCallback(
    (p: ZhtMapViewPreset) => {
      const map = mapRef.current;
      if (!map) {
        message.warning('地图未就绪');
        return;
      }
      try {
        map.flyTo({
          ...presetToFlyToOptions(p),
          essential: true,
        });
      } catch {
        message.error('切换视角失败');
      }
    },
    [mapRef],
  );

  const onRemove = useCallback((id: string, e: React.SyntheticEvent) => {
    e.stopPropagation();
    setPresets(prev => {
      const next = prev.filter(x => x.id !== id);
      saveMapViewPresets(next);
      return next;
    });
    message.info('已删除该视角');
  }, []);

  const onRemoveKey = useCallback((id: string, e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    e.stopPropagation();
    onRemove(id, e);
  }, [onRemove]);

  const cells = useMemo(() => {
    const list: React.ReactNode[] = [];
    list.push(
      <button
        key="save"
        type="button"
        className="zht-map-view-presets__save-card"
        aria-label="保存当前地图为视角预设"
        onClick={onSaveClick}
      >
        <span className="zht-map-view-presets__save-text">保存地图视角</span>
      </button>,
    );
    for (const p of presets) {
      list.push(
        <div
          key={p.id}
          role="button"
          tabIndex={0}
          className="zht-map-view-presets__preset-card"
          aria-label={`切换到${p.label}`}
          onClick={() => onApply(p)}
          onKeyDown={e => {
            if (e.target !== e.currentTarget) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onApply(p);
            }
          }}
        >
          <span
            role="button"
            tabIndex={0}
            className="zht-map-view-presets__preset-remove"
            aria-label={`删除${p.label}`}
            onClick={e => onRemove(p.id, e)}
            onKeyDown={e => onRemoveKey(p.id, e)}
          >
            <X size={12} strokeWidth={2.25} aria-hidden />
          </span>
          <span className="zht-map-view-presets__preset-thumb" aria-hidden>
            <Mountain size={22} strokeWidth={1.6} />
          </span>
          <span className="zht-map-view-presets__preset-label" title={p.label}>
            {p.label}
          </span>
        </div>,
      );
    }
    return list;
  }, [onApply, onRemove, onRemoveKey, onSaveClick, presets]);

  return (
    <div className="zht-map-view-presets" onClick={e => e.stopPropagation()}>
      <div className="zht-map-view-presets__head">
        <span className="zht-map-view-presets__head-title">地图视角</span>
      </div>
      <div className="zht-map-view-presets__grid">{cells}</div>
    </div>
  );
};
