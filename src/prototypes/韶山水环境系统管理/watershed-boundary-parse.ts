/**
 * 从流域边界 GeoJSON / Shapefile（zip）解析外包矩形对角两点：右上、左下（WGS84）。
 */
import getShapefile from 'shpjs';

interface BBox {
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
}

function emptyBox(): BBox {
  return { minLon: Infinity, maxLon: -Infinity, minLat: Infinity, maxLat: -Infinity };
}

function bump(box: BBox, lng: number, lat: number) {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
  box.minLon = Math.min(box.minLon, lng);
  box.maxLon = Math.max(box.maxLon, lng);
  box.minLat = Math.min(box.minLat, lat);
  box.maxLat = Math.max(box.maxLat, lat);
}

/** 递归遍历 GeoJSON geometry.coordinates：末端 [lng,lat]（可选第三维高程） */
function walkCoords(coords: unknown, box: BBox): void {
  if (!coords) return;
  if (Array.isArray(coords)) {
    if (
      coords.length >= 2 &&
      typeof coords[0] === 'number' &&
      typeof coords[1] === 'number'
    ) {
      bump(box, coords[0], coords[1]);
      return;
    }
    for (const c of coords) walkCoords(c, box);
  }
}

/** 按 GeoJSON 结构遍历几何（不含 Feature.properties，避免误扫台账数值） */
function processGeoJSON(obj: unknown, box: BBox): void {
  if (!obj || typeof obj !== 'object') return;
  const o = obj as Record<string, unknown>;
  const type = o.type as string | undefined;
  if (type === 'FeatureCollection') {
    for (const f of (o.features as unknown[]) ?? []) processGeoJSON(f, box);
    return;
  }
  if (type === 'Feature') {
    processGeoJSON(o.geometry, box);
    return;
  }
  if (type === 'GeometryCollection') {
    for (const g of (o.geometries as unknown[]) ?? []) processGeoJSON(g, box);
    return;
  }
  if (type && o.coordinates !== undefined) {
    walkCoords(o.coordinates, box);
  }
}

function boxToCorners(box: BBox) {
  if (!Number.isFinite(box.minLon) || !Number.isFinite(box.maxLon) || !Number.isFinite(box.minLat) || !Number.isFinite(box.maxLat)) {
    throw new Error('未在文件中找到有效坐标，请检查几何或坐标系');
  }
  const minLon = box.minLon;
  const maxLon = box.maxLon;
  const minLat = box.minLat;
  const maxLat = box.maxLat;
  return {
    extentNeLng: maxLon,
    extentNeLat: maxLat,
    extentSwLng: minLon,
    extentSwLat: minLat,
  };
}

export type ParsedBoundaryCorners = ReturnType<typeof boxToCorners>;

/** 根据 GeoJSON 对象计算右上、左下坐标 */
export function bboxCornersFromGeoJSONObject(root: unknown): ParsedBoundaryCorners {
  const box = emptyBox();
  processGeoJSON(root, box);
  return boxToCorners(box);
}

/** 读取 GeoJSON 文本 / Shapefile zip，解析右上、左下经纬度 */
export async function parseBoundaryFileToCorners(file: File): Promise<ParsedBoundaryCorners> {
  const name = file.name.toLowerCase();
  let root: unknown;

  if (name.endsWith('.geojson') || name.endsWith('.json')) {
    const text = await file.text();
    try {
      root = JSON.parse(text) as unknown;
    } catch {
      throw new Error('GeoJSON 文本解析失败');
    }
    const t = root && typeof root === 'object' ? (root as Record<string, unknown>).type : undefined;
    if (typeof t !== 'string') {
      throw new Error('无效的 GeoJSON（缺少 type）');
    }
    return bboxCornersFromGeoJSONObject(root);
  }

  if (name.endsWith('.zip')) {
    const buf = await file.arrayBuffer();
    root = await getShapefile(buf);
    return bboxCornersFromGeoJSONObject(root);
  }

  if (name.endsWith('.shp')) {
    throw new Error('请将 Shapefile 及配套文件打包为 zip 后上传');
  }

  throw new Error('仅支持 GeoJSON（.geojson / .json）或 Shapefile 压缩包（.zip）');
}
