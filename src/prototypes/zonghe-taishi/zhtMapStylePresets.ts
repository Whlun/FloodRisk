/**
 * 综合态势 · 地图样式：默认浅色矢量（Liberty）/ 影像 二选一 + MapLibre `setStyle` 入参
 */
import type { StyleSpecification } from 'maplibre-gl';
import { PARK_MAPLIBRE_STYLE_URL } from '../韶山水环境系统管理/park-boundary-maplibre';

/** 与工业园区一致的浅色矢量（OpenFreeMap Liberty） */
export const ZHT_DEFAULT_VECTOR_STYLE_URL = PARK_MAPLIBRE_STYLE_URL;

export type ZhtBasemapKind = 'vector' | 'imagery';

/** 影像底图：演示用 Esri World Imagery 栅格（正式环境请替换为合规影像服务） */
export const ZHT_IMAGERY_MAP_STYLE_SPEC: StyleSpecification = {
  version: 8,
  name: 'zht-imagery-demo',
  sources: {
    'zht-imagery-raster': {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
      maxzoom: 19,
    },
  },
  layers: [
    {
      /** 勿用 `zht-` 前缀：透明度滑块会跳过 `zht-` 业务层，影像栅格须随滑块可调 */
      id: 'basemap-imagery-raster',
      type: 'raster',
      source: 'zht-imagery-raster',
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

export const ZHT_MAP_STYLE_PAIR: {
  kind: ZhtBasemapKind;
  label: string;
  thumbClass: string;
}[] = [
  { kind: 'imagery', label: '影像地图', thumbClass: 'zht-map-style-thumb--imagery' },
  { kind: 'vector', label: '默认', thumbClass: 'zht-map-style-thumb--vector' },
];

export function zhtBasemapStyleForKind(kind: ZhtBasemapKind): string | StyleSpecification {
  return kind === 'vector' ? ZHT_DEFAULT_VECTOR_STYLE_URL : ZHT_IMAGERY_MAP_STYLE_SPEC;
}
