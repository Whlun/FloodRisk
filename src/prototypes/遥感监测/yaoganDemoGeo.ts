/**
 * 遥感监测 · 演示用矢量覆盖（正式环境替换为 WMS/WMTS/切片服务）
 */
import type { FeatureCollection, Polygon } from 'geojson';

const d = 0.035;

/** 河道带状近似：水质浓度栅格演示（叶绿素 / 悬浮物用不同 fill-opacity / 色相） */
export const YG_DEMO_WATER_QUALITY: FeatureCollection<Polygon> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { chlor: 12, susp: 28 },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [112.48, 27.88],
            [112.58, 27.88],
            [112.58, 27.94],
            [112.48, 27.94],
            [112.48, 27.88],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { chlor: 38, susp: 42 },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [112.52, 27.9],
            [112.56, 27.9],
            [112.56, 27.93],
            [112.52, 27.93],
            [112.52, 27.9],
          ],
        ],
      },
    },
  ],
};

/** 疑似问题图斑（橙） */
export const YG_DEMO_SHORELINE_ISSUE: FeatureCollection<Polygon> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [112.5, 27.92],
            [112.54, 27.92],
            [112.54, 27.935],
            [112.5, 27.935],
            [112.5, 27.92],
          ],
        ],
      },
    },
  ],
};

/** 河道变化面（蓝边填） */
export const YG_DEMO_SHORELINE_CHANGE: FeatureCollection<Polygon> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [112.44, 27.9],
            [112.5, 27.9],
            [112.5, 27.925],
            [112.44, 27.925],
            [112.44, 27.9],
          ],
        ],
      },
    },
  ],
};

/** NDVI 植被覆盖（半透明绿） */
export const YG_DEMO_NDVI: FeatureCollection<Polygon> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { ndvi: 0.62 },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [112.55, 27.88],
            [112.62, 27.88],
            [112.62, 27.92],
            [112.55, 27.92],
            [112.55, 27.88],
          ],
        ],
      },
    },
  ],
};

/** 地物分类：与截图色块接近 */
export const YG_LAND_CLASS_COLORS: Record<string, string> = {
  water: '#1677ff',
  built: '#722ed1',
  green: '#52c41a',
  farm: '#d4b106',
  road: '#10239e',
  other: '#8c8c8c',
};

export const YG_DEMO_LAND_CLASS: FeatureCollection<Polygon> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { cls: 'water' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [112.5 - d, 27.91],
            [112.52 - d, 27.91],
            [112.52 - d, 27.92],
            [112.5 - d, 27.92],
            [112.5 - d, 27.91],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { cls: 'built' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [112.52, 27.91],
            [112.54, 27.91],
            [112.54, 27.92],
            [112.52, 27.92],
            [112.52, 27.91],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { cls: 'green' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [112.54, 27.91],
            [112.56, 27.91],
            [112.56, 27.92],
            [112.54, 27.92],
            [112.54, 27.91],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { cls: 'farm' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [112.5 - d, 27.905],
            [112.52 - d, 27.905],
            [112.52 - d, 27.915],
            [112.5 - d, 27.915],
            [112.5 - d, 27.905],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { cls: 'road' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [112.52, 27.905],
            [112.535, 27.905],
            [112.535, 27.915],
            [112.52, 27.915],
            [112.52, 27.905],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { cls: 'other' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [112.535, 27.905],
            [112.56, 27.905],
            [112.56, 27.915],
            [112.535, 27.915],
            [112.535, 27.905],
          ],
        ],
      },
    },
  ],
};

/** 根据指标 0–50 线性插值绿→黄→红（演示） */
export function ygWaterColorForValue(
  metric: 'chlorophyll' | 'suspended',
  chlor: number,
  susp: number,
  alpha = 0.52,
): string {
  const v = metric === 'chlorophyll' ? chlor : susp;
  const t = Math.max(0, Math.min(1, v / 50));
  const g = Math.round(40 + (200 - 40) * (1 - t));
  const r = Math.round(30 + 220 * t);
  const b = Math.round(60 * (1 - t));
  return `rgba(${r},${g},${b},${alpha})`;
}
