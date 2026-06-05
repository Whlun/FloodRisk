/**
 * 水环境 POI 圆点中心图标（自定义 SVG；与图层控制图例一致）
 */
import type { ZhtWaterEnvCategoryId } from './zhtWaterEnvPoiMeta';
import { appendPoiSvgDotIcon, getWaterEnvCategorySvgKey } from './zhtPoiSvgIcons';

/** 在圆点容器内挂载中心图标 */
export function appendWaterEnvPoiDotIcon(dot: HTMLElement, cat: ZhtWaterEnvCategoryId): void {
  appendPoiSvgDotIcon(dot, getWaterEnvCategorySvgKey(cat));
}
