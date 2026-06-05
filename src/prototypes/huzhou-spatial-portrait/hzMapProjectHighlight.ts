/** 地图演示项目地块高亮（建管画像阶段联动等） */
export type HzMapProjectHighlight = {
  /**
   * 按 GeoJSON 属性过滤（建管画像：properties.cmPhaseKey，覆盖全图地块）
   * 与 featureIds 二选一，优先 phaseKey
   */
  phaseKey?: string;
  phasePropertyKey?: string;
  /** 按 osm_id 等精确 id 列表过滤（遗留，建管画像已改用 phaseKey） */
  featureKey?: string;
  featureIds?: string[];
  /** 区县范围（建管画像：hzDistrictName 全称，如「吴兴区」） */
  districtName?: string | null;
  districtPropertyKey?: string;
  lineColor: string;
  fillColor: string;
};
