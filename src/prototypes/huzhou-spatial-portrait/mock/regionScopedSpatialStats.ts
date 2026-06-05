/**
 * 空间利用画像 · 按壳层区县缩放看板演示数据
 */
import type { HzRegionKey } from '../../huzhou-lifecycle-shared/hzRegionScope';
import { hzRegionToDistrictName } from '../../huzhou-lifecycle-shared/hzRegionScope';
import { HUZHOU_LANDUSE_GEOJSON } from '../huzhouMapConstants';
import {
  AVAILABLE_DONUT,
  AVAILABLE_TOTAL,
  INEFFICIENT_LAND,
  INDUSTRIAL_ROWS,
  PUBLIC_DONUT,
  PUBLIC_DONUT_TOTAL,
  RESIDENTIAL_BARS,
  SUPPLY_SPATIAL_BARS,
  SUPPLY_STRUCT_PIE,
  SUPPLY_STRUCT_TOTAL,
  SUPPLY_TREND_VALUES,
  SUPPLY_TREND_YEARS,
  SUPPLY_USAGE_BARS,
} from './spatialStats';

const LANDUSE_FEATURES = HUZHOU_LANDUSE_GEOJSON.features;
const CITY_LANDUSE_TOTAL = LANDUSE_FEATURES.length;

function landuseRatioForRegion(regionKey: HzRegionKey): number {
  if (regionKey === 'all') return 1;
  const district = hzRegionToDistrictName(regionKey);
  if (!district) return 1;
  const count = LANDUSE_FEATURES.filter(
    f => String(f.properties?.hzDistrictName ?? '') === district,
  ).length;
  return CITY_LANDUSE_TOTAL > 0 ? count / CITY_LANDUSE_TOTAL : 1;
}

function scaleValue(value: number, ratio: number): number {
  return value * ratio;
}

function scaleRows(rows: { name: string; value: number }[], ratio: number) {
  return rows.map(r => ({ ...r, value: scaleValue(r.value, ratio) }));
}

function scaleDonutRows(rows: { name: string; value: number; color: string }[], ratio: number) {
  return rows.map(r => ({ ...r, value: scaleValue(r.value, ratio) }));
}

function spatialBarsForRegion(regionKey: HzRegionKey) {
  if (regionKey === 'all') return SUPPLY_SPATIAL_BARS;
  const district = hzRegionToDistrictName(regionKey);
  if (!district) return SUPPLY_SPATIAL_BARS;
  const hit = SUPPLY_SPATIAL_BARS.find(
    b => b.name === district || b.name.includes(district.replace(/[区县]$/, '')),
  );
  return [{ name: hit?.name ?? district, value: 1 }];
}

export type RegionScopedSpatialStats = {
  supplyUsageBars: typeof SUPPLY_USAGE_BARS;
  supplySpatialBars: { name: string; value: number }[];
  supplyStructPie: typeof SUPPLY_STRUCT_PIE;
  supplyStructTotal: number;
  supplyTrendYears: typeof SUPPLY_TREND_YEARS;
  supplyTrendValues: number[];
  inefficientLand: typeof INEFFICIENT_LAND;
  availableTotal: number;
  availableDonut: typeof AVAILABLE_DONUT;
  residentialBars: typeof RESIDENTIAL_BARS;
  industrialRows: typeof INDUSTRIAL_ROWS;
  publicDonutTotal: number;
  publicDonut: typeof PUBLIC_DONUT;
};

export function getSpatialStatsForRegion(regionKey: HzRegionKey): RegionScopedSpatialStats {
  const ratio = landuseRatioForRegion(regionKey);
  const supplyStructPie = SUPPLY_STRUCT_PIE.map(d => ({
    ...d,
    value: scaleValue(d.value, ratio),
  }));
  return {
    supplyUsageBars: SUPPLY_USAGE_BARS,
    supplySpatialBars: spatialBarsForRegion(regionKey),
    supplyStructPie,
    supplyStructTotal: scaleValue(SUPPLY_STRUCT_TOTAL, ratio),
    supplyTrendYears: SUPPLY_TREND_YEARS,
    supplyTrendValues: SUPPLY_TREND_VALUES.map(v => scaleValue(v, ratio)),
    inefficientLand: {
      ...INEFFICIENT_LAND,
      area: scaleValue(INEFFICIENT_LAND.area, ratio),
      industrial: scaleValue(INEFFICIENT_LAND.industrial, ratio),
      rectify: scaleValue(INEFFICIENT_LAND.rectify, ratio),
    },
    availableTotal: scaleValue(AVAILABLE_TOTAL, ratio),
    availableDonut: scaleDonutRows(AVAILABLE_DONUT, ratio),
    residentialBars: scaleRows(RESIDENTIAL_BARS, ratio),
    industrialRows: scaleRows(INDUSTRIAL_ROWS, ratio),
    publicDonutTotal: scaleValue(PUBLIC_DONUT_TOTAL, ratio),
    publicDonut: scaleDonutRows(PUBLIC_DONUT, ratio),
  };
}
