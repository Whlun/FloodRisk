/**
 * 综合态势 · 地图左侧纵向工具条（与设计稿 **13** 项一致；**图层控制** 为树形折叠 + 勾选，说明文案在标题后 **?** 的 **`Tooltip`** 内（`zhtLayerControlPopover`）；**地图样式** 为 **`Popover`**：上区 **地图透明度** 滑块（**`map.getCanvas()`** `opacity`；**DOM Marker** 不变；**WebGL 行政界**与底图同 canvas 会一起变淡）、下区 **影像地图 / 默认**；**POI提示配置** 仅影响 **水环境 POI** HTML 提示板；**行政区划名称**由图层单独控制；Lucide 线框图标占位）
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Button, Checkbox, message, Popover, Select, Slider, Tooltip, Typography } from 'antd';
import type { ZhtPoiHintFontPreset } from './zhtPoiHintFont';
import { ZHT_POI_HINT_FONT_OPTIONS } from './zhtPoiHintFont';
import { ZhtLayerControlPopover } from './zhtLayerControlPopover';
import type { ZhtLayerControlState } from './zhtLayerControlState';
import type { Map } from 'maplibre-gl';
import { ZHT_MAP_STYLE_PAIR, type ZhtBasemapKind } from './zhtMapStylePresets';
import { ZhtMapViewPresetsPopoverContent } from './zhtMapViewPresetsPopover';
import { ZhtMapViewExportPopoverContent } from './zhtMapViewExportPopover';

const { Text } = Typography;
import {
  Compass,
  ImageDown,
  Layers,
  LocateFixed,
  Maximize2,
  MessageSquare,
  Minus,
  Map as MapIcon,
  Pencil,
  Plus,
  Ruler,
  Search,
  Video,
  View,
} from 'lucide-react';

const ICON_SIZE = 18;
const ICON_STROKE = 1.75;

/** 各引擎全屏状态变更事件，与 getFullscreenElement 前缀成对使用 */
const FULLSCREEN_CHANGE_EVENTS = [
  'fullscreenchange',
  'webkitfullscreenchange',
  'mozfullscreenchange',
  'MSFullscreenChange',
] as const;

/** 读取当前全屏节点（含 WebKit / Firefox / 旧版 Edge 前缀） */
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

/** 请求元素全屏（带浏览器前缀；旧 WebKit 可能不返回 Promise） */
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

/** 退出文档全屏（带前缀） */
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

export interface ZhtMapVerticalToolbarProps {
  mapRef: React.MutableRefObject<Map | null>;
  /** 与 `zhtMaplibreBoard` 中 `map.once('load')` 对齐；用于在地图实例就绪后订阅方位角等 */
  mapIsReady: boolean;
  /** 仅地图画布宿主（`zht-maplibre-host`），用于导出 PNG 时临时改尺寸 */
  mapHostRef: React.RefObject<HTMLElement | null> | React.MutableRefObject<HTMLElement | null>;
  /** 进入全屏的 DOM（地图栈容器，含工具条） */
  fullscreenTargetRef: React.RefObject<HTMLElement | null>;
  /** 打开「地图搜索」弹窗；未传入时搜索按钮为占位提示 */
  onSearchClick?: () => void;
  layerControl: ZhtLayerControlState;
  onLayerControlChange: (patch: Partial<ZhtLayerControlState>) => void;
  /** 设施与水质监测站 POI 提示板：站名/标题显示（关时设施仍可仅展示「数值显示」下的指标行；监测站同理） */
  poiFacilityTitle: boolean;
  onPoiFacilityTitleChange: (v: boolean) => void;
  /** 监测类 POI 提示板：监测指标（最多 4 行）；站名由「标题显示」控制 */
  poiMonitorValues: boolean;
  onPoiMonitorValuesChange: (v: boolean) => void;
  /** 设施类标题字号档位 */
  poiFacilityTitleFont: ZhtPoiHintFontPreset;
  onPoiFacilityTitleFontChange: (v: ZhtPoiHintFontPreset) => void;
  /** 监测类数值区字号档位 */
  poiMonitorValuesFont: ZhtPoiHintFontPreset;
  onPoiMonitorValuesFontChange: (v: ZhtPoiHintFontPreset) => void;
  /** 将 POI 提示勾选与字号恢复为页面默认值 */
  onPoiHintsReset?: () => void;
  /** 与地图初始视图一致（与园区常量同源，由父组件传入） */
  defaultCenter: [number, number];
  defaultZoom: number;
  /** 底图类型：浅色矢量（默认）/ 影像 */
  basemapKind: ZhtBasemapKind;
  onBasemapKindChange: (kind: ZhtBasemapKind) => void;
  /** 地图透明度 0–100（0 底图不透明，100 底图全透明） */
  mapTransparencyPercent: number;
  onMapTransparencyPercentChange: (percent: number) => void;
}

export const ZhtMapVerticalToolbar: React.FC<ZhtMapVerticalToolbarProps> = ({
  mapRef,
  mapIsReady,
  mapHostRef,
  fullscreenTargetRef,
  onSearchClick,
  layerControl,
  onLayerControlChange,
  poiFacilityTitle,
  onPoiFacilityTitleChange,
  poiMonitorValues,
  onPoiMonitorValuesChange,
  poiFacilityTitleFont,
  onPoiFacilityTitleFontChange,
  poiMonitorValuesFont,
  onPoiMonitorValuesFontChange,
  onPoiHintsReset,
  defaultCenter,
  defaultZoom,
  basemapKind,
  onBasemapKindChange,
  mapTransparencyPercent,
  onMapTransparencyPercentChange,
}) => {
  const [layerPopoverOpen, setLayerPopoverOpen] = useState(false);
  const [poiPopoverOpen, setPoiPopoverOpen] = useState(false);
  const [stylePopoverOpen, setStylePopoverOpen] = useState(false);
  const [viewPresetsPopoverOpen, setViewPresetsPopoverOpen] = useState(false);
  const [exportPopoverOpen, setExportPopoverOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  /** 地图方位角（度，相对正北顺时针），用于指北针图标与真实地理北向对齐 */
  const [mapBearingDeg, setMapBearingDeg] = useState(0);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapIsReady || !map?.loaded?.()) return;
    const syncBearing = () => {
      try {
        setMapBearingDeg(map.getBearing());
      } catch {
        /* 地图销毁过程中可能抛错，忽略 */
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

  /** 浮层挂到地图栈（与全屏目标同一容器），避免全屏后 Tooltip/Popover 仍在 body 导致无法交互 */
  const getFsPopupContainer = useCallback(() => fullscreenTargetRef.current ?? document.body, []);

  const toolBtn = (
    label: string,
    onClick: () => void,
    node: React.ReactNode,
    extraClass = '',
  ) => (
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
    <ZhtLayerControlPopover value={layerControl} onChange={onLayerControlChange} />
  );

  const mapViewPresetsContent = <ZhtMapViewPresetsPopoverContent mapRef={mapRef} />;
  const mapViewExportContent = <ZhtMapViewExportPopoverContent mapRef={mapRef} mapHostRef={mapHostRef} />;

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
        <Text type="secondary" className="zht-map-style-popover__opacity-hint">
          0 不透明 · 100 全透（整块 WebGL 画布）；同 canvas 的行政界会一起变淡，DOM 点位不变
        </Text>
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

  const poiContent = (
    <div className="zht-map-poi-popover" onClick={e => e.stopPropagation()}>
      <div className="zht-map-poi-popover__head">
        <span className="zht-map-poi-popover__head-title">POI提示配置</span>
        {onPoiHintsReset ? (
          <Button type="link" size="small" className="zht-map-poi-popover__reset" onClick={onPoiHintsReset}>
            恢复默认
          </Button>
        ) : null}
      </div>
      <div className="zht-map-poi-popover__group">
        <div className="zht-map-poi-popover__row zht-map-poi-popover__row--with-font">
          <Checkbox checked={poiFacilityTitle} onChange={e => onPoiFacilityTitleChange(e.target.checked)}>
            标题显示
          </Checkbox>
          <Select<ZhtPoiHintFontPreset>
            size="small"
            className="zht-map-poi-popover__font-select"
            aria-label="设施标题字体"
            value={poiFacilityTitleFont}
            options={ZHT_POI_HINT_FONT_OPTIONS}
            onChange={onPoiFacilityTitleFontChange}
          />
        </div>
        <div className="zht-map-poi-popover__row zht-map-poi-popover__row--with-font">
          <Checkbox checked={poiMonitorValues} onChange={e => onPoiMonitorValuesChange(e.target.checked)}>
            数值显示
          </Checkbox>
          <Select<ZhtPoiHintFontPreset>
            size="small"
            className="zht-map-poi-popover__font-select"
            aria-label="监测数值字体"
            value={poiMonitorValuesFont}
            options={ZHT_POI_HINT_FONT_OPTIONS}
            onChange={onPoiMonitorValuesFontChange}
          />
        </div>
      </div>
    </div>
  );

  return (
    <aside className="zht-map-vertical-toolbar" aria-label="地图工具条">
      {toolBtn('搜索', () => (onSearchClick ? onSearchClick() : message.info('搜索：功能待与设计对接')), (
        <IconWrap>
          <Search size={ICON_SIZE} strokeWidth={ICON_STROKE} />
        </IconWrap>
      ))}
      <Tooltip title="POI提示配置" placement="right" getPopupContainer={getFsPopupContainer}>
        <Popover
          trigger="click"
          placement="rightTop"
          open={poiPopoverOpen}
          onOpenChange={setPoiPopoverOpen}
          getPopupContainer={getFsPopupContainer}
          content={poiContent}
        >
          <button
            type="button"
            className={`zht-map-tool-btn${poiPopoverOpen ? ' zht-map-tool-btn--on' : ''}`}
            aria-label="POI提示配置"
            aria-expanded={poiPopoverOpen}
          >
            <IconWrap>
              <MessageSquare size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            </IconWrap>
          </button>
        </Popover>
      </Tooltip>
      <Tooltip title="图层控制" placement="right" getPopupContainer={getFsPopupContainer}>
        <Popover
          trigger="click"
          placement="rightTop"
          open={layerPopoverOpen}
          onOpenChange={setLayerPopoverOpen}
          getPopupContainer={getFsPopupContainer}
          content={layerContent}
          overlayInnerStyle={{
            padding: '6px 4px 10px',
            maxWidth: 392,
            maxHeight: 'min(72vh, 580px)',
            overflowY: 'auto',
          }}
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
      {toolBtn('视频点位', () => message.info('视频点位：功能待与设计对接'), (
        <IconWrap>
          <Video size={ICON_SIZE} strokeWidth={ICON_STROKE} />
        </IconWrap>
      ))}
      <Tooltip title="地图样式" placement="right" getPopupContainer={getFsPopupContainer}>
        <Popover
          trigger="click"
          placement="rightTop"
          open={stylePopoverOpen}
          onOpenChange={setStylePopoverOpen}
          getPopupContainer={getFsPopupContainer}
          content={mapStyleContent}
          overlayInnerStyle={{
            padding: '6px 8px 8px',
            minWidth: 252,
            maxWidth: 296,
          }}
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
      {toolBtn('地图标注', () => message.info('地图标注：功能待与设计对接'), (
        <IconWrap>
          <Pencil size={ICON_SIZE} strokeWidth={ICON_STROKE} />
        </IconWrap>
      ))}
      <Tooltip title="地图视角" placement="right" getPopupContainer={getFsPopupContainer}>
        <Popover
          trigger="click"
          placement="rightTop"
          open={viewPresetsPopoverOpen}
          onOpenChange={setViewPresetsPopoverOpen}
          getPopupContainer={getFsPopupContainer}
          content={mapViewPresetsContent}
          overlayInnerStyle={{
            padding: '6px 8px 8px',
            minWidth: 260,
            maxWidth: 300,
          }}
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
          content={mapViewExportContent}
          overlayInnerStyle={{
            padding: '8px 10px 10px',
            minWidth: 268,
            maxWidth: 300,
          }}
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
      {toolBtn('量尺工具', () => message.info('量尺工具：功能待与设计对接'), (
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
      {toolBtn('地图中心恢复默认位置', () => {
        const map = getMap();
        if (!map) return;
        map.flyTo({
          center: defaultCenter,
          zoom: defaultZoom,
          bearing: 0,
          pitch: 0,
          essential: true,
        });
      }, (
        <IconWrap>
          <LocateFixed size={ICON_SIZE} strokeWidth={ICON_STROKE} />
        </IconWrap>
      ))}
      <div className="zht-map-tool-zoom" role="group" aria-label="地图缩放">
        {toolBtn(
          '放大',
          () => {
            const map = getMap();
            map?.zoomIn({ duration: 220 });
          },
          (
            <IconWrap>
              <Plus size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            </IconWrap>
          ),
          'zht-map-tool-btn--zoom',
        )}
        {toolBtn(
          '缩小',
          () => {
            const map = getMap();
            map?.zoomOut({ duration: 220 });
          },
          (
            <IconWrap>
              <Minus size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            </IconWrap>
          ),
          'zht-map-tool-btn--zoom',
        )}
      </div>
      {toolBtn(
        '指北（复位旋转）',
        () => {
          const map = getMap();
          if (!map) return;
          map.resetNorth({ duration: 320 });
        },
        (
          <IconWrap>
            <span
              className="zht-map-compass-dial"
              style={{ transform: `rotate(${-mapBearingDeg}deg)` }}
              aria-hidden
            >
              <Compass size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            </span>
          </IconWrap>
        ),
      )}
    </aside>
  );
};
