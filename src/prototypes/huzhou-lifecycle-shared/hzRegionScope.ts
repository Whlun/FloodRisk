import type { FeatureCollection } from 'geojson';
import {
  bboxFromFeatureCollection,
  HUZHOU_ADMIN_BOUNDARY_GEOJSON,
} from '../huzhou-spatial-portrait/huzhouMapConstants';

/** 湖州市空间全画像 · 全局区县筛选（下拉展示名 → 地图 hzDistrictName） */
export type HzRegionKey = 'all' | 'wuxing' | 'nanxun' | 'changxing' | 'anji' | 'deqing';

const REGION_TO_DISTRICT: Record<Exclude<HzRegionKey, 'all'>, string> = {
  wuxing: '吴兴区',
  nanxun: '南浔区',
  changxing: '长兴县',
  anji: '安吉县',
  deqing: '德清县',
};

export const HZ_REGION_OPTIONS: { value: HzRegionKey; label: string }[] = [
  { value: 'all', label: '全市' },
  ...(Object.entries(REGION_TO_DISTRICT) as [Exclude<HzRegionKey, 'all'>, string][]).map(
    ([value, label]) => ({ value, label }),
  ),
];

/** 地图 / GeoJSON 使用的区县全称；全市为 null */
export function hzRegionToDistrictName(regionKey: HzRegionKey): string | null {
  if (regionKey === 'all') return null;
  return REGION_TO_DISTRICT[regionKey];
}

/** 演示项目 region 字段是否属于当前筛选 */
export function projectMatchesRegion(regionLabel: string, regionKey: HzRegionKey): boolean {
  if (regionKey === 'all') return true;
  const district = hzRegionToDistrictName(regionKey);
  if (!district) return true;
  const short = district.replace(/[区县]$/, '');
  return regionLabel.includes(district) || (short.length > 0 && regionLabel.includes(short));
}

/** 选中区县时地图 fitBounds 范围 */
export function getBoundsForHzRegion(
  regionKey: HzRegionKey,
): [[number, number], [number, number]] | null {
  const districtName = hzRegionToDistrictName(regionKey);
  if (!districtName) return null;
  const fc = HUZHOU_ADMIN_BOUNDARY_GEOJSON as FeatureCollection;
  const hit = fc.features.filter(f => String(f.properties?.name ?? '') === districtName);
  if (!hit.length) return null;
  return bboxFromFeatureCollection({ type: 'FeatureCollection', features: hit });
}
