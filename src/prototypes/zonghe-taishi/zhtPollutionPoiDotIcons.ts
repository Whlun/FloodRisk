/**
 * 污染源三类 POI 圆点中心图标（自定义 SVG；与图层控制一致）
 */
import type { ZhtPollutionSourceKind } from './zhtPollutionSourceLayerData';
import { appendPoiSvgDotIcon, getPollutionKindSvgKey } from './zhtPoiSvgIcons';

/** 在圆点容器内挂载中心图标 */
export function appendPollutionPoiDotIcon(dot: HTMLElement, kind: ZhtPollutionSourceKind): void {
  appendPoiSvgDotIcon(dot, getPollutionKindSvgKey(kind));
}
