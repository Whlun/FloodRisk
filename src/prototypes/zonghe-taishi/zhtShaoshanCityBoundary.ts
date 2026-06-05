/**
 * 韶山市行政边界（真实数据）
 *
 * 数据来源：`data/bianjie.geojson`（用户提供）。
 */
import shaoshanBoundaryGeojsonRaw from './data/bianjie.geojson?raw';

export const ZHT_SHAOSHAN_CITY_BOUNDARY_GEOJSON =
  JSON.parse(shaoshanBoundaryGeojsonRaw) as GeoJSON.FeatureCollection;
