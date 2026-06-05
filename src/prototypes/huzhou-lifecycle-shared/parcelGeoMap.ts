/**
 * 地块详情 · 图形 Tab 地图辅助（避免 lifecycle-shared ↔ spatial-portrait 循环依赖）
 */
import type { ParcelLifecycle } from './types';

export { PARK_MAPLIBRE_STYLE_URL as HZ_PARCEL_MAP_STYLE_URL } from '../韶山水环境系统管理/park-boundary-maplibre';

/** 与湖州空间利用画像默认视野一致 */
export const HZ_PARCEL_MAP_FALLBACK_CENTER: [number, number] = [120.086, 30.894];
export const HZ_PARCEL_MAP_FALLBACK_ZOOM = 10.2;

export function resolveParcelMapBounds(
  parcel: ParcelLifecycle,
): [[number, number], [number, number]] | null {
  const b = parcel.mapBounds;
  if (b?.length === 2) return b;
  return null;
}

export function boundsToPolygonFeature(bounds: [[number, number], [number, number]]): GeoJSON.Feature {
  const [[minLng, minLat], [maxLng, maxLat]] = bounds;
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [minLng, minLat],
          [maxLng, minLat],
          [maxLng, maxLat],
          [minLng, maxLat],
          [minLng, minLat],
        ],
      ],
    },
  };
}

export function boundsCenter(bounds: [[number, number], [number, number]]): [number, number] {
  const [[minLng, minLat], [maxLng, maxLat]] = bounds;
  return [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
}

/** 从单个 GeoJSON 要素计算外接矩形（支持 Polygon / MultiPolygon 等嵌套坐标） */
export function bboxFromFeature(
  feature: GeoJSON.Feature,
): [[number, number], [number, number]] | null {
  if (!feature.geometry) return null;
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  const walk = (coords: unknown): void => {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      const [lng, lat] = coords as [number, number];
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      return;
    }
    coords.forEach(walk);
  };

  walk((feature.geometry as { coordinates: unknown }).coordinates);
  if (!Number.isFinite(minLng)) return null;
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

/** 展示用地块面优先，否则 mapBounds */
export function resolveParcelViewBounds(
  parcel: ParcelLifecycle,
  displayFeature?: GeoJSON.Feature | null,
): [[number, number], [number, number]] | null {
  if (displayFeature?.geometry) {
    return bboxFromFeature(displayFeature) ?? resolveParcelMapBounds(parcel);
  }
  return resolveParcelMapBounds(parcel);
}
