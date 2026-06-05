/**
 * 土地利用：在用户提供 GeoJSON 原貌上挂属性（区县 / 虚拟街道 / 二级图层）
 * 不生成格网方块，几何与源数据一致（仅 MultiPolygon 拆成多个 Polygon）
 */
import type { Feature, FeatureCollection, Polygon, Position } from 'geojson';
import type { FilterSpecification } from 'maplibre-gl';
import type { HuzhouSpaceMode } from './huzhouMapConstants';
import { SPACE_LAYER_TREE, type SpaceLayerSubItem } from './hzLandUseLayers';
import type { HzLayerControlState } from './hzLayerControlState';
import { HUZHOU_SPACE_MODES } from './hzLayerControlState';
import {
  assignVirtualStreet,
  buildDistrictZones,
  locateDistrict,
  ringCentroid,
  type DistrictZone,
} from './hzLanduseGeoSplit';

export const HZ_LAYER_KEY_SEP = ':';

export function toHzLayerKey(mode: HuzhouSpaceMode, subKey: string): string {
  return `${mode}${HZ_LAYER_KEY_SEP}${subKey}`;
}

export function parseHzLayerKey(key: string): { mode: HuzhouSpaceMode; subKey: string } | null {
  const i = key.indexOf(HZ_LAYER_KEY_SEP);
  if (i < 0) return null;
  const mode = key.slice(0, i) as HuzhouSpaceMode;
  const subKey = key.slice(i + 1);
  if (!HUZHOU_SPACE_MODES.includes(mode) || !subKey) return null;
  return { mode, subKey };
}

export function getSpaceSubLayerByKey(layerKey: string): SpaceLayerSubItem | null {
  const parsed = parseHzLayerKey(layerKey);
  if (!parsed) return null;
  return SPACE_LAYER_TREE[parsed.mode].subLayers.find(s => s.key === parsed.subKey) ?? null;
}

const FCLASS_FALLBACK_LAYER_KEY = 'available:public';

const FCLASS_FALLBACK_MAP: Record<string, string> = {
  scrub: FCLASS_FALLBACK_LAYER_KEY,
  nature_reserve: FCLASS_FALLBACK_LAYER_KEY,
  recreation_ground: FCLASS_FALLBACK_LAYER_KEY,
  military: FCLASS_FALLBACK_LAYER_KEY,
  meadow: FCLASS_FALLBACK_LAYER_KEY,
  cemetery: FCLASS_FALLBACK_LAYER_KEY,
  orchard: FCLASS_FALLBACK_LAYER_KEY,
};

function stableHash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function collectLayerKeyCandidates(fclass: string): string[] {
  const keys: string[] = [];
  for (const mode of HUZHOU_SPACE_MODES) {
    for (const sub of SPACE_LAYER_TREE[mode].subLayers) {
      if (sub.fclasses.includes(fclass)) {
        keys.push(toHzLayerKey(mode, sub.key));
      }
    }
  }
  keys.sort();
  return keys;
}

function pickExclusiveLayerKey(osmId: string, partIndex: number, fclass: string): string {
  const candidates = collectLayerKeyCandidates(fclass);
  if (candidates.length) {
    const idx = stableHash(`${osmId}:${partIndex}`) % candidates.length;
    return candidates[idx]!;
  }
  return FCLASS_FALLBACK_MAP[fclass] ?? FCLASS_FALLBACK_LAYER_KEY;
}

function explodeToPolygonFeatures(raw: Feature): Feature<Polygon>[] {
  const geom = raw.geometry;
  if (!geom) return [];

  if (geom.type === 'Polygon') {
    return [
      {
        type: 'Feature',
        properties: { ...raw.properties },
        geometry: geom,
      },
    ];
  }

  if (geom.type === 'MultiPolygon') {
    return geom.coordinates.map(
      (rings, partIndex): Feature<Polygon> => ({
        type: 'Feature',
        properties: { ...raw.properties, hzPartIndex: partIndex },
        geometry: { type: 'Polygon', coordinates: rings },
      }),
    );
  }

  return [];
}

function attachAdminProps(
  base: Record<string, unknown>,
  lng: number,
  lat: number,
  zones: DistrictZone[],
): Record<string, unknown> {
  const zone = locateDistrict(lng, lat, zones);
  if (!zone) {
    return {
      ...base,
      hzDistrictId: '',
      hzDistrictName: '湖州市域',
      hzStreetId: '',
      hzStreetName: '未落区',
    };
  }
  const street = assignVirtualStreet(lng, lat, zone);
  return {
    ...base,
    hzDistrictId: zone.id,
    hzDistrictName: zone.name,
    hzStreetId: street.streetId,
    hzStreetName: street.streetName,
  };
}

/**
 * 源 GeoJSON 原几何 + 区县/街道 + 二级 hzLayerKey（每面独占一个图层键）
 */
export function splitLanduseByLayerTree(
  fc: FeatureCollection,
  adminBoundary?: FeatureCollection,
): FeatureCollection {
  const zones = adminBoundary ? buildDistrictZones(adminBoundary) : [];
  const features: Feature[] = [];

  for (const raw of fc.features) {
    const fclass = String(raw.properties?.fclass ?? '');
    if (!fclass) continue;

    const osmId = raw.properties?.osm_id != null ? String(raw.properties.osm_id) : `anon-${features.length}`;
    const parts = explodeToPolygonFeatures(raw);

    parts.forEach((part, partIndex) => {
      const [lng, lat] = ringCentroid(part.geometry.coordinates);
      const hzLayerKey = pickExclusiveLayerKey(osmId, partIndex, fclass);
      const props = attachAdminProps(
        {
          ...part.properties,
          hzLayerKey,
          hzFragmentId: `${osmId}#${partIndex}`,
          hzSource: 'huzhou-landuse-test-data',
        },
        lng,
        lat,
        zones,
      );

      features.push({
        type: 'Feature',
        properties: props,
        geometry: part.geometry,
      });
    });
  }

  return { type: 'FeatureCollection', features };
}

export function resolveVisibleLayerKeys(state: HzLayerControlState): string[] {
  const keys: string[] = [];
  for (const mode of HUZHOU_SPACE_MODES) {
    const group = state.modes[mode];
    for (const sub of SPACE_LAYER_TREE[mode].subLayers) {
      if (group.subs[sub.key]) {
        keys.push(toHzLayerKey(mode, sub.key));
      }
    }
  }
  return keys;
}

export function buildLanduseLayerKeyFilter(layerKeys: string[]): FilterSpecification {
  if (!layerKeys.length) {
    return ['==', ['get', 'hzLayerKey'], ''];
  }
  return ['in', ['get', 'hzLayerKey'], ['literal', layerKeys]];
}

const LANDUSE_FALLBACK_FILL = 'rgba(148, 163, 184, 0.35)';

export function buildLanduseFillColorExprByLayerKey(state: HzLayerControlState): unknown[] {
  const pairs: [string, string][] = [];
  for (const mode of HUZHOU_SPACE_MODES) {
    const group = state.modes[mode];
    for (const sub of SPACE_LAYER_TREE[mode].subLayers) {
      if (!group.subs[sub.key]) continue;
      pairs.push([toHzLayerKey(mode, sub.key), sub.color]);
    }
  }
  if (!pairs.length) {
    return LANDUSE_FALLBACK_FILL;
  }
  return ['match', ['get', 'hzLayerKey'], ...pairs.flat(), LANDUSE_FALLBACK_FILL];
}

export { buildLanduseFillColorExprByLayerKey as buildLanduseFillColorExpr };
