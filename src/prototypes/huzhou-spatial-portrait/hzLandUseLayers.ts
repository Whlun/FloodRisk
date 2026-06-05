/**
 * 空间图层树与土地利用 fclass 配色（演示映射，非真实业务库）
 */
import type { HuzhouSpaceMode } from './huzhouMapConstants';

export type SpaceLayerSubItem = {
  key: string;
  label: string;
  fclasses: string[];
  color: string;
  /** 演示面积（公顷） */
  areaHa: number;
};

export type SpaceLayerGroup = {
  label: string;
  subLayers: SpaceLayerSubItem[];
};

export const SPACE_LAYER_TREE: Record<HuzhouSpaceMode, SpaceLayerGroup> = {
  planned: {
    label: '规划建设空间',
    subLayers: [
      { key: 'urban_boundary', label: '城镇开发边界数据', fclasses: ['industrial', 'commercial'], color: '#e8dcc8', areaHa: 1286.32 },
      { key: 'parcel', label: '宗地数据', fclasses: ['residential', 'retail'], color: '#fadb14', areaHa: 892.15 },
      { key: 'supply', label: '土地供应数据', fclasses: ['farmland'], color: '#eb2f96', areaHa: 456.78 },
      { key: 'farmland_conv', label: '农转用数据', fclasses: ['grass'], color: '#9254de', areaHa: 328.44 },
    ],
  },
  utilized: {
    label: '已利用空间',
    subLayers: [
      { key: 'handover', label: '交地', fclasses: ['industrial', 'residential'], color: '#02a7f0', areaHa: 642.18 },
      { key: 'start', label: '开工', fclasses: ['commercial', 'retail'], color: '#d48806', areaHa: 518.06 },
      { key: 'accept', label: '验收', fclasses: ['farmyard', 'quarry'], color: '#52c41a', areaHa: 391.24 },
    ],
  },
  available: {
    label: '可利用空间',
    subLayers: [
      { key: 'residential', label: '居住用地', fclasses: ['residential'], color: '#eb2f96', areaHa: 1577.41 },
      { key: 'industrial', label: '工业用地', fclasses: ['industrial', 'farmland'], color: '#02a7f0', areaHa: 1019.09 },
      {
        key: 'public',
        label: '公用设施用地',
        fclasses: [
          'park',
          'grass',
          'forest',
          'scrub',
          'nature_reserve',
          'recreation_ground',
          'military',
          'meadow',
          'cemetery',
          'orchard',
        ],
        color: '#52c41a',
        areaHa: 46.03,
      },
    ],
  },
};

export const FCLASS_LABEL_ZH: Record<string, string> = {
  residential: '居住用地',
  industrial: '工业用地',
  commercial: '商业用地',
  retail: '零售用地',
  farmland: '耕地',
  forest: '林地',
  grass: '草地',
  park: '公园绿地',
  farmyard: '农家庭院',
  orchard: '果园',
  quarry: '采石场',
  military: '军事用地',
  scrub: '灌木',
  nature_reserve: '自然保护区',
  recreation_ground: '游憩用地',
};

/** @deprecated 地图已按 hzLayerKey 显隐，请用 hzLanduseLayerSplit.buildLanduseLayerKeyFilter */
export function buildLanduseFilter(fclasses: string[]): unknown[] {
  if (!fclasses.length) {
    return ['==', ['get', 'fclass'], ''];
  }
  return ['in', ['get', 'fclass'], ['literal', fclasses]];
}

export const SPACE_MODE_LABEL: Record<HuzhouSpaceMode, string> = {
  planned: '规划建设空间',
  utilized: '已利用空间',
  available: '可利用空间',
};

/** 一级图层下二级面积合计（公顷） */
export function spaceModeTotalAreaHa(mode: HuzhouSpaceMode): number {
  return SPACE_LAYER_TREE[mode].subLayers.reduce((sum, s) => sum + s.areaHa, 0);
}

/** 已勾选二级面积合计（公顷） */
export function spaceModeCheckedAreaHa(
  mode: HuzhouSpaceMode,
  subs: Record<string, boolean>,
): number {
  return SPACE_LAYER_TREE[mode].subLayers
    .filter(s => subs[s.key])
    .reduce((sum, s) => sum + s.areaHa, 0);
}
