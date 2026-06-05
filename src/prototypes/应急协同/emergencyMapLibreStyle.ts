/**
 * 应急协同 MapLibre
 *
 * - **无事发坐标时默认中心**：**韶山市人民政府**一带（`EMERGENCY_MAP_SHAOSHAN_GOVERNMENT_CENTER`）。
 * - **默认缩放**：与 `park-boundary-maplibre.tsx` 再导出同源（`EMERGENCY_MAPLIBRE_DEFAULT_ZOOM`）；园区默认中心仍再导出为 `EMERGENCY_MAPLIBRE_DEFAULT_CENTER` 备查。
 * - **应急详情/编辑底图**：与 **工业园区** 严格同源，仅 **`PARK_MAPLIBRE_STYLE_URL`**（OpenFreeMap Liberty 矢量样式 URL），**不**引入 Esri、OSM、Carto 等其它底图来源。
 */
import type { Map } from 'maplibre-gl';
import { PARK_MAPLIBRE_STYLE_URL } from '../韶山水环境系统管理/park-boundary-maplibre';

export {
  PARK_MAPLIBRE_DEFAULT_CENTER as EMERGENCY_MAPLIBRE_DEFAULT_CENTER,
  PARK_MAPLIBRE_DEFAULT_ZOOM as EMERGENCY_MAPLIBRE_DEFAULT_ZOOM,
  PARK_MAPLIBRE_STYLE_URL as EMERGENCY_MAPLIBRE_VECTOR_STYLE_URL,
} from '../韶山水环境系统管理/park-boundary-maplibre';

/**
 * 无有效事发经纬时地图视图中心：**韶山市人民政府**（清溪镇城区 WGS84；与生态整治河长台账「市政府大楼」坐标量级一致，原型定点）
 */
export const EMERGENCY_MAP_SHAOSHAN_GOVERNMENT_CENTER: [number, number] = [112.5286, 27.9142];

/** 有事发经纬时略放大 */
export const EMERGENCY_MAP_INCIDENT_ZOOM = 13.2;

/** 与工业园区 `park-boundary-maplibre` 底图数据同源（仅 OpenFreeMap Liberty URL） */
export const EMERGENCY_MAPLIBRE_BASEMAP_STYLE = PARK_MAPLIBRE_STYLE_URL;

/** 矢量样式叠业务层时用：取首个 symbol 图层 id，圆点叠在注记之下 */
export function emergencyFirstSymbolLayerId(map: Map): string | undefined {
  return map.getStyle().layers?.find(l => l.type === 'symbol')?.id;
}
