/**
 * 湖州空间全画像 · 地图纵向工具条（对齐综合态势，无 POI 提示配置）
 */
import React, { useCallback, useEffect, useState } from 'react';
import { message, Popover, Slider, Tooltip, Typography } from 'antd';
import type { Map } from 'maplibre-gl';
import {
  Compass,
  ImageDown,
  Layers,
  LocateFixed,
  Maximize2,
  Minus,
  Map as MapIcon,
  Plus,
  Ruler,
  Search,
  View,
} from 'lucide-react';
import { HzLayerControlPopover } from './HzLayerControlPopover';
import type { HzLayerControlState } from '../hzLayerControlState';
import { ZHT_MAP_STYLE_PAIR, type ZhtBasemapKind } from '../../zonghe-taishi/zhtMapStylePresets';
import { ZhtMapViewPresetsPopoverContent } from '../../zonghe-taishi/zhtMapViewPresetsPopover';
import { ZhtMapViewExportPopoverContent } from '../../zonghe-taishi/zhtMapViewExportPopover';

const { Text } = Typography;

const ICON_SIZE = 18;
const ICON_STROKE = 1.75;

const FULLSCREEN_CHANGE_EVENTS = [
  'fullscreenchange',
  'webkitfullscreenchange',
  'mozfullscreenchange',
  'MSFullscreenChange',
] as const;

function getFullscreenElement(): Element | null {
  const d = document as Document & {
    webkitFullscreenElement?: Element | null;
    mozFullScreenElement?: Element | null;
    msFullscreenElement?: Element | null;
  };
  return (
    document.fullscreenElement ??
    d.webkitFullscreenElement ??
    d.mozFullScreenElement ??
    d.msFullscreenElement ??
    null
  );
}

function requestElementFullscreen(el: HTMLElement): Promise<void> {
  const v = el as HTMLElement & {
    webkitRequestFullscreen?: () => void | Promise<void>;
    mozRequestFullScreen?: () => void | Promise<void>;
    msRequestFullscreen?: () => void | Promise<void>;
  };
  const run =
    el.requestFullscreen?.bind(el) ??
    v.webkitRequestFullscreen?.bind(el) ??
    v.mozRequestFullScreen?.bind(el) ??
    v.msRequestFullscreen?.bind(el);
  if (!run) return Promise.reject(new Error('unsupported'));
  const out = run();
  return out === undefined ? Promise.resolve() : Promise.resolve(out);
}

function exitDocumentFullscreen(): Promise<void> {
  const d = document as Document & {
    webkitExitFullscreen?: () => void | Promise<void>;
    mozCancelFullScreen?: () => void | Promise<void>;
    msExitFullscreen?: () => void | Promise<void>;
  };
  const run =
    document.exitFullscreen?.bind(document) ??
    d.webkitExitFullscreen?.bind(document) ??
    d.mozCancelFullScreen?.bind(document) ??
    d.msExitFullscreen?.bind(document);
  if (!run) return Promise.reject(new Error('unsupported'));
  const out = run();
  return out === undefined ? Promise.resolve() : Promise.resolve(out);
}

function IconWrap({ children }: { children: React.ReactNode }) {
  return <span className="zht-map-tool-icon">{children}</span>;
}

export type HzMapVerticalToolbarProps = {
  mapRef: React.MutableRefObject<Map | null>;
  mapIsReady: boolean;
  mapHostRef: React.RefObject<HTMLElement | null> | React.MutableRefObject<HTMLElement | null>;
  fullscreenTargetRef: React.RefObject<HTMLElement | null>;
  layerControl: HzLayerControlState;
  onLayerControlChange: (next: HzLayerControlState) => void;
  onResetView: () => void;
  basemapKind: ZhtBasemapKind;
  onBasemapKindChange: (kind: ZhtBasemapKind) => void;
  mapTransparencyPercent: number;
  onMapTransparencyPercentChange: (percent: number) => void;
  /** 插在全屏按钮与中心恢复之间的扩展项（如建管/预警左右看板互换） */
  extraAfterFullscreen?: React.ReactNode;
};

export const HzMapVerticalToolbar: React.FC<HzMapVerticalToolbarProps> = ({
  mapRef,
  mapIsReady,
  mapHostRef,
  fullscreenTargetRef,
  layerControl,
  onLayerControlChange,
  onResetView,
  basemapKind,
  onBasemapKindChange,
  mapTransparencyPercent,
  onMapTransparencyPercentChange,
  extraAfterFullscreen,
}) => {
  const [layerPopoverOpen, setLayerPopoverOpen] = useState(false);
  const [stylePopoverOpen, setStylePopoverOpen] = useState(false);
  const [viewPresetsPopoverOpen, setViewPresetsPopoverOpen] = useState(false);
  const [exportPopoverOpen, setExportPopoverOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [mapBearingDeg, setMapBearingDeg] = useState(0);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapIsReady || !map?.loaded?.()) return;
    const syncBearing = () => {
      try {
        setMapBearingDeg(map.getBearing());
      } catch {
        /* 地图销毁中 */
      }
    };
    syncBearing();
    map.on('rotate', syncBearing);
    map.on('moveend', syncBearing);
    return () => {
      map.off('rotate', syncBearing);
      map.off('moveend', syncBearing);
    };
  }, [mapIsReady, mapRef]);

  useEffect(() => {
    const sync = () => setFullscreen(!!getFullscreenElement());
    sync();
    FULLSCREEN_CHANGE_EVENTS.forEach(ev => document.addEventListener(ev, sync));
    return () => FULLSCREEN_CHANGE_EVENTS.forEach(ev => document.removeEventListener(ev, sync));
  }, []);

  const getMap = useCallback(() => mapRef.current, [mapRef]);
  const getFsPopupContainer = useCallback(() => fullscreenTargetRef.current ?? document.body, [fullscreenTargetRef]);

  const toolBtn = (label: string, onClick: () => void, node: React.ReactNode, extraClass = '') => (
    <Tooltip title={label} placement="right" getPopupContainer={getFsPopupContainer}>
      <button
        type="button"
        className={`zht-map-tool-btn${extraClass ? ` ${extraClass}` : ''}`}
        aria-label={label}
        onClick={onClick}
      >
        {node}
      </button>
    </Tooltip>
  );

  const layerContent = (
    <HzLayerControlPopover
      value={layerControl}
      onChange={onLayerControlChange}
    />
  );

  const mapStyleContent = (
    <div className="zht-map-style-popover" onClick={e => e.stopPropagation()}>
      <div className="zht-map-style-popover__head">
        <span className="zht-map-style-popover__head-title">地图样式</span>
      </div>
      <div className="zht-map-style-popover__section zht-map-style-popover__section--transparency">
        <div className="zht-map-style-popover__slider-row" aria-label="地图透明度">
          <Text strong className="zht-map-style-popover__slider-label">
            地图透明度
          </Text>
          <Slider
            min={0}
            max={100}
            value={mapTransparencyPercent}
            tooltip={{ open: false }}
            onChange={onMapTransparencyPercentChange}
          />
          <Text type="secondary" className="zht-map-style-popover__slider-value">
            {mapTransparencyPercent}%
          </Text>
        </div>
      </div>
      <div className="zht-map-style-popover__section zht-map-style-popover__section--basemap">
        <div className="zht-map-style-thumb-row zht-map-style-thumb-row--dual" role="listbox" aria-label="地图底图类型">
          {ZHT_MAP_STYLE_PAIR.map(p => {
            const active = basemapKind === p.kind;
            return (
              <button
                key={p.kind}
                type="button"
                role="option"
                aria-selected={active}
                className={`zht-map-style-card zht-map-style-card--dual${active ? ' zht-map-style-card--selected' : ''}`}
                onClick={() => onBasemapKindChange(p.kind)}
              >
                <span className={`zht-map-style-card__frame ${p.thumbClass}`} aria-hidden />
                <span className="zht-map-style-card__label">{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <aside className="zht-map-vertical-toolbar" aria-label="地图工具条">
      {toolBtn('搜索', () => message.info('搜索：一期未接入（无 POI 点位）'), (
        <IconWrap>
          <Search size={ICON_SIZE} strokeWidth={ICON_STROKE} />
        </IconWrap>
      ))}
      <Tooltip title="图层控制" placement="right" getPopupContainer={getFsPopupContainer}>
        <Popover
          trigger="click"
          placement="rightTop"
          open={layerPopoverOpen}
          onOpenChange={setLayerPopoverOpen}
          getPopupContainer={getFsPopupContainer}
          overlayInnerStyle={{ padding: '8px 10px', minWidth: 300, maxWidth: 360 }}
          content={layerContent}
        >
          <button
            type="button"
            className={`zht-map-tool-btn${layerPopoverOpen ? ' zht-map-tool-btn--on' : ''}`}
            aria-label="图层控制"
            aria-expanded={layerPopoverOpen}
          >
            <IconWrap>
              <Layers size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            </IconWrap>
          </button>
        </Popover>
      </Tooltip>
      <Tooltip title="地图样式" placement="right" getPopupContainer={getFsPopupContainer}>
        <Popover
          trigger="click"
          placement="rightTop"
          open={stylePopoverOpen}
          onOpenChange={setStylePopoverOpen}
          getPopupContainer={getFsPopupContainer}
          content={mapStyleContent}
          overlayInnerStyle={{ padding: '6px 8px 8px', minWidth: 252, maxWidth: 296 }}
        >
          <button
            type="button"
            className={`zht-map-tool-btn${stylePopoverOpen ? ' zht-map-tool-btn--on' : ''}`}
            aria-label="地图样式"
            aria-expanded={stylePopoverOpen}
          >
            <IconWrap>
              <MapIcon size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            </IconWrap>
          </button>
        </Popover>
      </Tooltip>
      <Tooltip title="地图视角" placement="right" getPopupContainer={getFsPopupContainer}>
        <Popover
          trigger="click"
          placement="rightTop"
          open={viewPresetsPopoverOpen}
          onOpenChange={setViewPresetsPopoverOpen}
          getPopupContainer={getFsPopupContainer}
          content={<ZhtMapViewPresetsPopoverContent mapRef={mapRef} />}
          overlayInnerStyle={{ padding: '6px 8px 8px', minWidth: 260, maxWidth: 300 }}
        >
          <button
            type="button"
            className={`zht-map-tool-btn${viewPresetsPopoverOpen ? ' zht-map-tool-btn--on' : ''}`}
            aria-label="地图视角"
            aria-expanded={viewPresetsPopoverOpen}
          >
            <IconWrap>
              <View size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            </IconWrap>
          </button>
        </Popover>
      </Tooltip>
      <Tooltip title="地图视图导出" placement="right" getPopupContainer={getFsPopupContainer}>
        <Popover
          trigger="click"
          placement="rightTop"
          open={exportPopoverOpen}
          onOpenChange={setExportPopoverOpen}
          getPopupContainer={getFsPopupContainer}
          content={<ZhtMapViewExportPopoverContent mapRef={mapRef} mapHostRef={mapHostRef} />}
          overlayInnerStyle={{ padding: '8px 10px 10px', minWidth: 268, maxWidth: 300 }}
        >
          <button
            type="button"
            className={`zht-map-tool-btn${exportPopoverOpen ? ' zht-map-tool-btn--on' : ''}`}
            aria-label="地图视图导出"
            aria-expanded={exportPopoverOpen}
          >
            <IconWrap>
              <ImageDown size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            </IconWrap>
          </button>
        </Popover>
      </Tooltip>
      {toolBtn('量尺工具', () => message.info('量尺工具：功能待对接'), (
        <IconWrap>
          <Ruler size={ICON_SIZE} strokeWidth={ICON_STROKE} />
        </IconWrap>
      ))}
      {toolBtn(fullscreen ? '退出全屏' : '地图全屏', () => {
        const el = fullscreenTargetRef.current;
        if (!el) {
          message.warning('未找到全屏容器');
          return;
        }
        if (!getFullscreenElement()) {
          void requestElementFullscreen(el).catch(() => message.error('当前环境无法全屏'));
        } else {
          void exitDocumentFullscreen().catch(() => {});
        }
      }, (
        <IconWrap>
          <Maximize2 size={ICON_SIZE} strokeWidth={ICON_STROKE} />
        </IconWrap>
      ))}
      {extraAfterFullscreen}
      {toolBtn('地图中心恢复默认位置', () => onResetView(), (
        <IconWrap>
          <LocateFixed size={ICON_SIZE} strokeWidth={ICON_STROKE} />
        </IconWrap>
      ))}
      <div className="zht-map-tool-zoom" role="group" aria-label="地图缩放">
        {toolBtn(
          '放大',
          () => getMap()?.zoomIn({ duration: 220 }),
          (
            <IconWrap>
              <Plus size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            </IconWrap>
          ),
          'zht-map-tool-btn--zoom',
        )}
        {toolBtn(
          '缩小',
          () => getMap()?.zoomOut({ duration: 220 }),
          (
            <IconWrap>
              <Minus size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            </IconWrap>
          ),
          'zht-map-tool-btn--zoom',
        )}
      </div>
      {toolBtn('指北', () => getMap()?.resetNorth({ duration: 300 }), (
        <IconWrap>
          <span className="zht-map-compass-dial" style={{ transform: `rotate(${-mapBearingDeg}deg)` }}>
            <Compass size={ICON_SIZE} strokeWidth={ICON_STROKE} />
          </span>
        </IconWrap>
      ))}
    </aside>
  );
};
