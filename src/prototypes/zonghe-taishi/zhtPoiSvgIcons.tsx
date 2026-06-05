/**
 * 水环境 POI 自定义 SVG 图标（图层控制图例 + 地图圆点中心；资源见 assets/poi-icons）
 */
import React from 'react';
import type { ZhtWaterEnvCategoryId } from './zhtWaterEnvPoiMeta';
import type { ZhtPollutionSourceKind } from './zhtPollutionSourceLayerData';
import {
  ZHT_POI_SVG_ICON_URL,
  ZHT_POLLUTION_KIND_SVG_KEY,
  ZHT_WATER_ENV_CAT_SVG_KEY,
  type ZhtPoiSvgIconKey,
} from './zhtPoiSvgAssets';

export type { ZhtPoiSvgIconKey } from './zhtPoiSvgAssets';

export function getWaterEnvCategorySvgKey(cat: ZhtWaterEnvCategoryId): ZhtPoiSvgIconKey {
  return ZHT_WATER_ENV_CAT_SVG_KEY[cat] ?? 'monitor';
}

export function getPollutionKindSvgKey(kind: ZhtPollutionSourceKind): ZhtPoiSvgIconKey {
  return ZHT_POLLUTION_KIND_SVG_KEY[kind];
}

function iconUrl(key: ZhtPoiSvgIconKey): string {
  return ZHT_POI_SVG_ICON_URL[key] ?? '';
}

/** 图层控制等小图例 */
export function ZhtPoiSvgIcon({ iconKey, size = 14 }: { iconKey: ZhtPoiSvgIconKey; size?: number }) {
  const src = iconUrl(iconKey);
  if (!src) return null;
  return (
    <img
      className="zht-poi-svg-icon-img"
      src={src}
      width={size}
      height={size}
      alt=""
      draggable={false}
    />
  );
}

/** 在圆点容器内挂载中心图标 */
export function appendPoiSvgDotIcon(dot: HTMLElement, key: ZhtPoiSvgIconKey, size = 18): void {
  const src = iconUrl(key);
  if (!src) return;
  const wrap = document.createElement('span');
  wrap.className = 'zht-map-poi-dot-icon';
  wrap.setAttribute('aria-hidden', 'true');
  const img = document.createElement('img');
  img.className = 'zht-poi-svg-icon-img zht-poi-svg-icon-img--map';
  img.src = src;
  img.width = size;
  img.height = size;
  img.alt = '';
  img.draggable = false;
  wrap.appendChild(img);
  dot.appendChild(wrap);
}
