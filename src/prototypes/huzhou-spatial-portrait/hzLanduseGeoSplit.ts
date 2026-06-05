/**
 * 土地利用 · 区县落区 + 虚拟街道片区（几何仍用源 GeoJSON，不在此做格网方块）
 */
import type { Feature, FeatureCollection, Geometry, Position } from 'geojson';

export type DistrictZone = {
  id: string;
  name: string;
  /** 区县下各面外环（含洞时为 [外环, 洞…]） */
  parts: Position[][][];
  bbox: [number, number, number, number];
  streetCols: number;
  streetRows: number;
};

export type StreetRef = {
  streetId: string;
  streetName: string;
};

/** 由湖州行政界 GeoJSON 生成区县范围 */
export function buildDistrictZones(admin: FeatureCollection): DistrictZone[] {
  return admin.features
    .map(f => {
      const parts = extractPolygonParts(f.geometry);
      if (!parts.length) return null;
      const bbox = bboxFromParts(parts);
      return {
        id: String(f.properties?.id ?? ''),
        name: String(f.properties?.name ?? '未知区县'),
        parts,
        bbox,
        streetCols: 6,
        streetRows: 6,
      };
    })
    .filter((z): z is DistrictZone => z != null);
}

function extractPolygonParts(geom: Geometry | null): Position[][][] {
  if (!geom) return [];
  if (geom.type === 'Polygon') {
    return [geom.coordinates];
  }
  if (geom.type === 'MultiPolygon') {
    return geom.coordinates;
  }
  return [];
}

function bboxFromParts(parts: Position[][][]): [number, number, number, number] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const rings of parts) {
    for (const ring of rings) {
      for (const [x, y] of ring) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (!Number.isFinite(minX)) {
    return [0, 0, 0, 0];
  }
  return [minX, minY, maxX, maxY];
}

function pointInRing(lng: number, lat: number, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]![0]!;
    const yi = ring[i]![1]!;
    const xj = ring[j]![0]!;
    const yj = ring[j]![1]!;
    const denom = yj - yi;
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (denom === 0 ? 1e-12 : denom) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** 点是否在多边形内（外环 + 洞） */
export function pointInPolygonRings(lng: number, lat: number, rings: Position[][]): boolean {
  const outer = rings[0];
  if (!outer?.length) return false;
  if (!pointInRing(lng, lat, outer)) return false;
  for (let h = 1; h < rings.length; h++) {
    const hole = rings[h];
    if (hole?.length && pointInRing(lng, lat, hole)) return false;
  }
  return true;
}

export function ringCentroid(rings: Position[][]): [number, number] {
  const outer = rings[0];
  if (!outer?.length) return [0, 0];
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const p of outer) {
    if (p.length < 2) continue;
    sx += p[0]!;
    sy += p[1]!;
    n++;
  }
  return n ? [sx / n, sy / n] : [outer[0]![0]!, outer[0]![1]!];
}

export function locateDistrict(
  lng: number,
  lat: number,
  zones: DistrictZone[],
): DistrictZone | null {
  for (const zone of zones) {
    for (const rings of zone.parts) {
      if (pointInPolygonRings(lng, lat, rings)) return zone;
    }
  }
  return null;
}

/** 区县内按均匀网格模拟「街道 / 片区」 */
export function assignVirtualStreet(
  lng: number,
  lat: number,
  zone: DistrictZone,
): StreetRef {
  const [minX, minY, maxX, maxY] = zone.bbox;
  const spanX = Math.max(maxX - minX, 1e-8);
  const spanY = Math.max(maxY - minY, 1e-8);
  const col = Math.min(
    zone.streetCols - 1,
    Math.max(0, Math.floor(((lng - minX) / spanX) * zone.streetCols)),
  );
  const row = Math.min(
    zone.streetRows - 1,
    Math.max(0, Math.floor(((lat - minY) / spanY) * zone.streetRows)),
  );
  const streetId = `${zone.id}-R${row}C${col}`;
  const streetName = `${zone.name}·${row + 1}片区${col + 1}`;
  return { streetId, streetName };
}
