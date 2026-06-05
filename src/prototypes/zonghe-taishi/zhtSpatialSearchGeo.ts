/**
 * 地图搜索 · 查询结果覆盖：米级测地圆（可选）、命中点 GeoJSON 与类型定义
 */
import type { ZhtSearchSourceProject, ZhtUnifiedSearchPoint } from './zhtSearchUnifiedData';

const EARTH_R_M = 6371000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * 以 center 为圆心、radiusM 为半径，生成近似测地圆（多边形）
 */
export function buildGeodesicCirclePolygon(
  centerLng: number,
  centerLat: number,
  radiusM: number,
  steps = 72,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const ring: [number, number][] = [];
  const lat1 = toRad(centerLat);
  const lon1 = toRad(centerLng);
  const dr = radiusM / EARTH_R_M;

  for (let i = 0; i <= steps; i++) {
    const brng = (i / steps) * 2 * Math.PI;
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(dr) + Math.cos(lat1) * Math.sin(dr) * Math.cos(brng));
    const lon2 =
      lon1 +
      Math.atan2(
        Math.sin(brng) * Math.sin(dr) * Math.cos(lat1),
        Math.cos(dr) - Math.sin(lat1) * Math.sin(lat2),
      );
    let lng = toDeg(lon2);
    lng = ((((lng + 540) % 360) + 360) % 360) - 180;
    const lat = toDeg(lat2);
    ring.push([lng, lat]);
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [ring],
    },
  };
}

/**
 * 地图搜索结果覆盖层：与右栏列表顺序一致（序号 1…N 对应）。
 * - **条件查询**：仅传 `results`；设施类且图层可见的项由地图 **DOM 圆点** 标橙 + 序号，其余项绘 GeoJSON 橙点 + 序号。
 * - **空间要素查询**：传 `results` + `spatialRange`，地图另绘测地圆与查询原点。
 */
export type ZhtSearchMapOverlay = {
  results: ZhtUnifiedSearchPoint[];
  spatialRange?: {
    originLng: number;
    originLat: number;
    radiusM: number;
  };
};

/** 空间要素查询在点击「查询」前：地图预览原点与半径（米）；`radiusM` 缺省或非正时仅绘原点 */
export type ZhtSpatialQueryPreview = {
  originLng: number;
  originLat: number;
  radiusM?: number;
};

/**
 * 表单绿预览与已提交 `spatialRange` 是否可视为同一次查询（容差与面板 flush 一致）。
 * 为 true 时地图只叠正式蓝圈、不叠绿，避免与「有预览就隐藏蓝层」的绘制策略打架。
 */
export function isSpatialQueryPreviewEqualToCommitted(
  next: ZhtSpatialQueryPreview | null,
  committed: ZhtSearchMapOverlay['spatialRange'] | null | undefined,
): boolean {
  if (!next || !committed) return false;
  if (Math.abs(next.originLng - committed.originLng) > 1e-4) return false;
  if (Math.abs(next.originLat - committed.originLat) > 1e-4) return false;
  const nR = next.radiusM != null && Number.isFinite(Number(next.radiusM)) ? Number(next.radiusM) : null;
  const cR = Number(committed.radiusM);
  if (nR === null && !Number.isFinite(cR)) return true;
  if (nR === null || !Number.isFinite(cR)) return false;
  return Math.abs(nR - cR) < 1;
}

/** 地图命中图层 properties → 统一点位（用于点击联动） */
export function spatialHitPropsToUnifiedPoint(
  props: GeoJSON.GeoJsonProperties,
): ZhtUnifiedSearchPoint | null {
  if (!props || typeof props !== 'object') return null;
  const o = props as Record<string, unknown>;
  const id = o.id;
  const name = o.name;
  const code = o.code;
  if (typeof id !== 'string' || typeof name !== 'string' || typeof code !== 'string') return null;
  const lng = Number(o.lng);
  const lat = Number(o.lat);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  const sp = o.sourceProject;
  const allowed: ZhtSearchSourceProject[] = ['设施管理', '生态整治', '应急协同', '系统管理'];
  const sourceProject = allowed.includes(sp as ZhtSearchSourceProject)
    ? (sp as ZhtSearchSourceProject)
    : null;
  if (!sourceProject) return null;
  return {
    id,
    name,
    code,
    pointType: typeof o.pointType === 'string' ? o.pointType : '',
    status: typeof o.status === 'string' ? o.status : '',
    region: typeof o.region === 'string' ? o.region : '',
    lng,
    lat,
    sourceProject,
  };
}
