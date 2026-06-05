/**
 * 湖州地图 · 底图透明度（仅 style 内非 hz- 图层，不影响 GeoJSON 业务层）
 */
import type maplibregl from 'maplibre-gl';
import { HZ_LAYER_PREFIX } from './huzhouMapConstants';

const PAINT_OPACITY_BY_TYPE: Partial<Record<string, string[]>> = {
  fill: ['fill-opacity'],
  line: ['line-opacity'],
  raster: ['raster-opacity'],
  circle: ['circle-opacity'],
  symbol: ['icon-opacity', 'text-opacity'],
  background: ['background-opacity'],
  'fill-extrusion': ['fill-extrusion-opacity'],
  heatmap: ['heatmap-opacity'],
};

export type BasemapOpacityCache = Map<string, Map<string, number | 'expression'>>;

function isOverlayLayer(layerId: string): boolean {
  return layerId.startsWith(HZ_LAYER_PREFIX);
}

function readBaseOpacity(value: unknown): number | 'expression' {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return 'expression';
}

/** 样式切换后重建底图各图层原始 opacity 缓存 */
export function rebuildBasemapOpacityCache(map: maplibregl.Map): BasemapOpacityCache {
  const cache: BasemapOpacityCache = new Map();
  const layers = map.getStyle()?.layers ?? [];

  for (const layer of layers) {
    if (isOverlayLayer(layer.id)) continue;
    const props = PAINT_OPACITY_BY_TYPE[layer.type];
    if (!props?.length) continue;

    const layerCache = new Map<string, number | 'expression'>();
    for (const prop of props) {
      const fromMap = map.getPaintProperty(layer.id, prop);
      const fromSpec = (layer.paint as Record<string, unknown> | undefined)?.[prop];
      layerCache.set(prop, readBaseOpacity(fromMap ?? fromSpec));
    }
    cache.set(layer.id, layerCache);
  }
  return cache;
}

function clearMapCanvasOpacity(map: maplibregl.Map): void {
  map.getCanvas?.().style.removeProperty('opacity');
}

function resolveAppliedOpacity(
  base: number | 'expression' | undefined,
  alpha: number,
): number {
  if (alpha >= 1) {
    if (typeof base === 'number') return base;
    return 1;
  }
  if (typeof base === 'number') return base * alpha;
  return alpha;
}

/**
 * @param transparencyPercent 0 底图不透明，100 底图全透；仅底图 style 图层，hz- GeoJSON 层不变
 */
export function syncBasemapOpacity(
  map: maplibregl.Map,
  transparencyPercent: number,
  cache: BasemapOpacityCache,
): void {
  clearMapCanvasOpacity(map);

  const alpha = Math.min(1, Math.max(0, 1 - transparencyPercent / 100));
  const layers = map.getStyle()?.layers ?? [];

  for (const layer of layers) {
    if (isOverlayLayer(layer.id)) continue;
    const props = PAINT_OPACITY_BY_TYPE[layer.type];
    if (!props?.length) continue;
    if (!map.getLayer(layer.id)) continue;

    const layerCache = cache.get(layer.id);
    for (const prop of props) {
      const next = resolveAppliedOpacity(layerCache?.get(prop), alpha);
      try {
        map.setPaintProperty(layer.id, prop, next);
      } catch {
        /* setStyle 竞态 */
      }
    }
  }
}
