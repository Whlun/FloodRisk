/**
 * 综合态势 · 行政区划名称提示（演示零直排指标）。
 * 名称与锚点位置由 **`zhtShaoshanCityBoundary.ts`** 乡镇界 GeoJSON 推导（面心近似），与地图边界线同源。
 * 地图挂载见 **`zhtMaplibreBoard`**：仅受图层「行政区划 / 零直排区域标注」控制，与 POI 提示配置无关。
 */
import { ZHT_SHAOSHAN_CITY_BOUNDARY_GEOJSON } from './zhtShaoshanCityBoundary';

/** 行政区划提示板一条演示数据 */
export type ZhtAdminDivisionHintDemo = {
  id: string;
  /** 提示标题（乡镇 / 街道名，与界数据 properties.name 一致） */
  name: string;
  lng: number;
  lat: number;
  /** 雨污分流是否达标（演示） */
  rainSewageDiversionOk: boolean;
  /** 污水零直排是否达标（演示） */
  zeroDirectSewageOk: boolean;
};

/** 与历史演示一致或略作区分的零直排演示值（未列出的乡镇默认双达标） */
const ZERO_DIRECT_FLAGS_BY_TOWN: Record<
  string,
  Pick<ZhtAdminDivisionHintDemo, 'rainSewageDiversionOk' | 'zeroDirectSewageOk'>
> = {
  韶山乡: { rainSewageDiversionOk: true, zeroDirectSewageOk: true },
  银田镇: { rainSewageDiversionOk: false, zeroDirectSewageOk: false },
  清溪镇: { rainSewageDiversionOk: true, zeroDirectSewageOk: false },
  大坪乡: { rainSewageDiversionOk: true, zeroDirectSewageOk: false },
  如意镇: { rainSewageDiversionOk: true, zeroDirectSewageOk: true },
  杨林乡: { rainSewageDiversionOk: false, zeroDirectSewageOk: true },
  永义乡: { rainSewageDiversionOk: true, zeroDirectSewageOk: true },
};

function ringMeanCoord(ring: GeoJSON.Position[]): { lng: number; lat: number } {
  if (!ring.length) return { lng: 0, lat: 0 };
  let last = ring.length - 1;
  if (
    last > 0 &&
    ring[0][0] === ring[last][0] &&
    ring[0][1] === ring[last][1]
  ) {
    last -= 1;
  }
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (let i = 0; i <= last; i++) {
    sx += ring[i][0];
    sy += ring[i][1];
    n++;
  }
  return { lng: sx / Math.max(1, n), lat: sy / Math.max(1, n) };
}

function polygonCentroid(coords: GeoJSON.Polygon['coordinates']): { lng: number; lat: number } {
  return ringMeanCoord(coords[0] ?? []);
}

function multipolygonCentroid(coords: GeoJSON.MultiPolygon['coordinates']): { lng: number; lat: number } {
  let bestRing: GeoJSON.Position[] | null = null;
  let bestScore = -1;
  for (const poly of coords) {
    const ring = poly[0];
    if (!ring?.length) continue;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of ring) {
      if (p[0] < minX) minX = p[0];
      if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1];
      if (p[1] > maxY) maxY = p[1];
    }
    const score = (maxX - minX) * (maxY - minY);
    if (score > bestScore) {
      bestScore = score;
      bestRing = ring;
    }
  }
  return bestRing ? ringMeanCoord(bestRing) : { lng: 112.5, lat: 27.9 };
}

function featureToHint(f: GeoJSON.Feature): ZhtAdminDivisionHintDemo | null {
  const props = (f.properties ?? {}) as Record<string, unknown>;
  const name = String(props.name ?? '').trim();
  if (!name) return null;
  const g = f.geometry;
  if (!g) return null;
  let lngLat: { lng: number; lat: number };
  if (g.type === 'Polygon') lngLat = polygonCentroid(g.coordinates);
  else if (g.type === 'MultiPolygon') lngLat = multipolygonCentroid(g.coordinates);
  else return null;

  const flags = ZERO_DIRECT_FLAGS_BY_TOWN[name] ?? {
    rainSewageDiversionOk: true,
    zeroDirectSewageOk: true,
  };

  return {
    id: String(props.id ?? name),
    name,
    lng: lngLat.lng,
    lat: lngLat.lat,
    rainSewageDiversionOk: flags.rainSewageDiversionOk,
    zeroDirectSewageOk: flags.zeroDirectSewageOk,
  };
}

/** 由韶山市乡镇界 GeoJSON 生成的行政区划提示列表（锚点落在各乡镇面内近似中心） */
export const ZHT_ADMIN_DIVISION_HINTS_DEMO: ZhtAdminDivisionHintDemo[] = (() => {
  const out: ZhtAdminDivisionHintDemo[] = [];
  for (const f of ZHT_SHAOSHAN_CITY_BOUNDARY_GEOJSON.features) {
    const row = featureToHint(f);
    if (row) out.push(row);
  }
  return out;
})();
