/**
 * 图层控制状态（行政区划 + 空间图层树；勾选逻辑见 src/common/layer-control）
 */
import {
  createDefaultGroupSubs,
  setAllChildrenChecked,
  toggleChildChecked,
} from '../../common/layer-control';
import type { HuzhouSpaceMode } from './huzhouMapConstants';
import { SPACE_LAYER_TREE } from './hzLandUseLayers';

export type HzSpaceModeLayerState = {
  /** 与 subs 同步，保留供历史字段兼容；地图显隐以 subs 为准 */
  enabled: boolean;
  subs: Record<string, boolean>;
};

export type HzLayerControlState = {
  adminBoundary: boolean;
  activeMode: HuzhouSpaceMode;
  modes: Record<HuzhouSpaceMode, HzSpaceModeLayerState>;
};

export const HUZHOU_SPACE_MODES: HuzhouSpaceMode[] = ['planned', 'utilized', 'available'];

function defaultSubsForMode(mode: HuzhouSpaceMode, checked = true): Record<string, boolean> {
  return createDefaultGroupSubs(SPACE_LAYER_TREE[mode].subLayers, checked);
}

function defaultModes(): Record<HuzhouSpaceMode, HzSpaceModeLayerState> {
  return {
    planned: { enabled: false, subs: defaultSubsForMode('planned') },
    utilized: { enabled: false, subs: defaultSubsForMode('utilized') },
    available: { enabled: true, subs: defaultSubsForMode('available') },
  };
}

export const DEFAULT_HZ_LAYER_CONTROL: HzLayerControlState = {
  adminBoundary: true,
  activeMode: 'available',
  modes: defaultModes(),
};

/** 预警工程画像：默认不勾选空间图层，地图仅展示预警地块；用户勾选后再叠底图 */
export const ALERT_HZ_LAYER_CONTROL: HzLayerControlState = {
  adminBoundary: true,
  activeMode: 'available',
  modes: {
    planned: { enabled: false, subs: defaultSubsForMode('planned', false) },
    utilized: { enabled: false, subs: defaultSubsForMode('utilized', false) },
    available: { enabled: false, subs: defaultSubsForMode('available', false) },
  },
};

/** @deprecated 请通过 LayerControlTree 更新 subs；保留供外部直接调用 */
export function toggleSpaceModeEnabled(
  state: HzLayerControlState,
  mode: HuzhouSpaceMode,
  enabled: boolean,
): HzLayerControlState {
  const subs = setAllChildrenChecked(SPACE_LAYER_TREE[mode].subLayers, enabled);
  return {
    ...state,
    activeMode: enabled ? mode : state.activeMode,
    modes: {
      ...state.modes,
      [mode]: { enabled, subs },
    },
  };
}

/** 切换二级用地类型 */
export function toggleSpaceSubLayer(
  state: HzLayerControlState,
  mode: HuzhouSpaceMode,
  subKey: string,
  checked: boolean,
): HzLayerControlState {
  const subs = toggleChildChecked(state.modes[mode].subs, subKey, checked);
  const anyChecked = SPACE_LAYER_TREE[mode].subLayers.some(s => subs[s.key]);
  return {
    ...state,
    activeMode: mode,
    modes: {
      ...state.modes,
      [mode]: { enabled: anyChecked, subs },
    },
  };
}

/** 一级全选 / 全不选二级 */
export function setAllSpaceSubLayers(
  state: HzLayerControlState,
  mode: HuzhouSpaceMode,
  checked: boolean,
): HzLayerControlState {
  const subs = setAllChildrenChecked(SPACE_LAYER_TREE[mode].subLayers, checked);
  return {
    ...state,
    activeMode: mode,
    modes: {
      ...state.modes,
      [mode]: { enabled: checked, subs },
    },
  };
}

/** 空间图层分区标题：全部一级组二级全开或全关 */
export function setAllSpaceGroupsSubLayers(
  state: HzLayerControlState,
  checked: boolean,
): HzLayerControlState {
  const modes = { ...state.modes };
  for (const mode of HUZHOU_SPACE_MODES) {
    const subs = setAllChildrenChecked(SPACE_LAYER_TREE[mode].subLayers, checked);
    modes[mode] = { enabled: checked, subs };
  }
  return { ...state, modes };
}

export {
  buildLanduseFillColorExprByLayerKey as buildLanduseFillColorExpr,
  resolveVisibleLayerKeys as resolveVisibleFclasses,
} from './hzLanduseLayerSplit';
