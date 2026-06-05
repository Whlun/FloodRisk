/**
 * 地图图层控制 · 通用类型（一级可多选叠加 + 二级子图层）
 */

/** 二级图层项配置 */
export type LayerControlChildConfig = {
  key: string;
  label: string;
  /** 图例色点 */
  color?: string;
  /** 右侧统计文案（如面积） */
  stat?: string;
};

/** 一级图层组配置 */
export type LayerControlGroupConfig = {
  key: string;
  label: string;
  children: LayerControlChildConfig[];
  /** 一级右侧统计（如子项面积合计） */
  groupStat?: string;
};

/** 一级组内各二级的勾选状态 */
export type LayerControlGroupSubs = Record<string, boolean>;

/** 父级 Checkbox 展示态（对齐韶山 POI / 污染源分组） */
export type LayerControlGroupCheckState = {
  allChecked: boolean;
  someChecked: boolean;
  noneChecked: boolean;
  checkedCount: number;
};

/** 无子级的平铺勾选项（如「行政区划」） */
export type LayerControlFlatRowConfig = {
  key: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};
