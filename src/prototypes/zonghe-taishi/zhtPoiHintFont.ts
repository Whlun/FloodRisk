/**
 * POI 提示板 HTML 字体档位（与工具条 POI提示配置、地图 Marker 内联字号一致）
 */

export type ZhtPoiHintFontPreset = 'xxl' | 'xl' | 'md' | 'sm' | 'xs';

export const ZHT_POI_HINT_FONT_PX: Record<ZhtPoiHintFontPreset, number> = {
  xxl: 20,
  xl: 18,
  md: 16,
  sm: 14,
  xs: 12,
};

/** 下拉展示顺序：超大 → 超小（文案不含像素，避免干扰非技术用户；实际像素见 ZHT_POI_HINT_FONT_PX） */
export const ZHT_POI_HINT_FONT_OPTIONS: { value: ZhtPoiHintFontPreset; label: string }[] = [
  { value: 'xxl', label: '超大' },
  { value: 'xl', label: '大' },
  { value: 'md', label: '标准' },
  { value: 'sm', label: '小' },
  { value: 'xs', label: '超小' },
];

/** 设施类「标题」默认：标准 */
export const ZHT_POI_HINT_DEFAULT_FACILITY_TITLE: ZhtPoiHintFontPreset = 'md';

/** 监测类「数值」默认：小 */
export const ZHT_POI_HINT_DEFAULT_MONITOR_VALUES: ZhtPoiHintFontPreset = 'sm';

/** POI 提示配置面板：与页面初次进入一致的默认值（「恢复默认」与此同源；标题/数值两项默认不勾选） */
export type ZhtPoiHintUiDefaults = {
  facilityTitle: boolean;
  monitorValues: boolean;
  facilityTitleFont: ZhtPoiHintFontPreset;
  monitorValuesFont: ZhtPoiHintFontPreset;
};

export const ZHT_POI_HINT_UI_DEFAULTS: ZhtPoiHintUiDefaults = {
  facilityTitle: false,
  monitorValues: false,
  facilityTitleFont: ZHT_POI_HINT_DEFAULT_FACILITY_TITLE,
  monitorValuesFont: ZHT_POI_HINT_DEFAULT_MONITOR_VALUES,
};

export function zhtPoiHintFontPx(preset: ZhtPoiHintFontPreset): number {
  return ZHT_POI_HINT_FONT_PX[preset];
}
