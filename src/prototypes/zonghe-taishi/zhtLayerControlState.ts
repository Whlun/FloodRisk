/**
 * 综合态势 · 图层控制状态（与工具条「图层控制」Popover 同步；部分项为接入服务占位）
 */
import {
  type ZhtWaterEnvPoiLayerControlSlice,
  type ZhtWaterEnvPoiLayers,
  WATER_ENV_POI_LAYERS_ALL_UNCHECKED,
} from './zhtWaterEnvPoiMeta';

export type ZhtLayerControlState = {
  /** 1 行政区划：行政名称提示面板（默认开启，与图层 Popover 一致） */
  showAdminDivisionHints: boolean;
  /** 2 排水管网（占位） */
  drainagePipeNetwork: boolean;
  /** 3 排水网格（占位） */
  drainageGrid: boolean;
  /** 4 排水单元（占位） */
  drainageUnit: boolean;
  /** 5 管线流向标识（占位） */
  pipelineFlowMarks: boolean;
  /** 6 水环境 POI 总开关：关则各分类及四态均不绘点、不绘提示（默认关，由用户勾选开启） */
  waterEnvPoiEnabled: boolean;
  /** 各业务类 POI：一级显隐 + 二级四态（报警/离线/在线/信息点） */
  waterEnvPoiLayers: ZhtWaterEnvPoiLayers;
  /** 设计稿中其它 POI 类（仅占位状态，不接地图） */
  poiPlaceholderDrainageUser: boolean;
  poiPlaceholderDrainageEnterprise: boolean;
  /**
   * 污染源信息三类子图层（与系统管理 `config-center-data.ts` 同源列表，地图点位同步）
   */
  pollutionSourceLayers: {
    ruralSewage: boolean;
    agriRural: boolean;
    industry: boolean;
  };
  /** 自定义标注：单层勾选，无四态子项（演示占位） */
  poiPlaceholderCustomAnnotation: boolean;
  /** 7 遥感监测（占位） */
  remoteSensing: boolean;
  remoteSensingMetric: 'chlorophyll' | 'suspended';
  /** 8 疑似问题图斑（占位） */
  suspectProblemPatches: boolean;
  /** 9 河流流向可视化（占位） */
  riverFlowVisualization: boolean;
  /** 10 生态红线标识（占位） */
  ecoRedline: boolean;
  /** 11 零直排区域标注：行政区划提示板内雨污/零直排文案显隐（图层控制 UI 挂在「行政区划」子级） */
  zeroDirectDischargeLabels: boolean;
  /** 12 河流动态模拟（占位） */
  riverDynamicSimulation: boolean;
};

export const DEFAULT_ZHT_LAYER_CONTROL: ZhtLayerControlState = {
  showAdminDivisionHints: true,
  drainagePipeNetwork: false,
  drainageGrid: false,
  drainageUnit: false,
  pipelineFlowMarks: false,
  waterEnvPoiEnabled: false,
  /** 总开关默认关时与子项「全不选」一致，避免看似全选却未生效 */
  waterEnvPoiLayers: WATER_ENV_POI_LAYERS_ALL_UNCHECKED,
  poiPlaceholderDrainageUser: false,
  poiPlaceholderDrainageEnterprise: false,
  pollutionSourceLayers: {
    ruralSewage: false,
    agriRural: false,
    industry: false,
  },
  poiPlaceholderCustomAnnotation: false,
  remoteSensing: false,
  remoteSensingMetric: 'chlorophyll',
  suspectProblemPatches: false,
  riverFlowVisualization: false,
  ecoRedline: true,
  zeroDirectDischargeLabels: true,
  riverDynamicSimulation: false,
};

/** 供地图与统一点位过滤：水环境总开关 + 各分类四态矩阵 */
export function waterEnvPoiLayerControlSlice(lc: ZhtLayerControlState): ZhtWaterEnvPoiLayerControlSlice {
  return {
    waterEnvPoiEnabled: lc.waterEnvPoiEnabled,
    waterEnvPoiLayers: lc.waterEnvPoiLayers,
  };
}
