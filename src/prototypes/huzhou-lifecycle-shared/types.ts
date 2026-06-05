/**
 * 地块全生命周期 · 核心类型
 */
import type { MatterStageKey } from './parcelMatterStages';

export type MatterStageRecord = Record<string, string | number | null>;

export type StageStatus = 'done' | 'active' | 'pending';

/** 建管 9 阶段 key（与 cmPhaseAccent.CmPhaseAccentKey 一致） */
export type CmPhaseKey =
  | 'pre-review'
  | 'farmland'
  | 'land-supply'
  | 'land-permit'
  | 'first-reg'
  | 'eng-permit'
  | 'con-permit'
  | 'land-review'
  | 'plan-verify';

export type CmPhaseAcceptTimeMap = Partial<Record<CmPhaseKey, string>>;

export type ParcelProcessEvent = {
  stageName: string;
  matterName: string;
  time: string;
  status: string;
};

export type ParcelAttachment = {
  name: string;
  type: string;
  date: string;
  fileSize?: string;
  uploader?: string;
  /** 关联事项名称（档案 Tab 按当前阶段筛选） */
  matterName?: string;
};

/** 地块对象（演示） */
export type ParcelLifecycle = {
  /** qsmzq_guid */
  id: string;
  projectCode: string;
  name: string;
  region: string;
  address: string;
  /** 空间利用画像标签（只读展示） */
  spatialTags?: string[];
  currentStageKey: MatterStageKey;
  stageStatus: Partial<Record<MatterStageKey, StageStatus>>;
  /** 各事项阶段属性值，key 为字段 code（单条时与 stageRecords 首条同步） */
  stages: Partial<Record<MatterStageKey, MatterStageRecord>>;
  /** 同一事项多条填报记录（如预审与选址一/二）；缺省时用 stages 单条 */
  stageRecords?: Partial<Record<MatterStageKey, MatterStageRecord[]>>;
  /** 建管 9 阶段受理时间（演示 / 接口回填；缺省时可从 stages、processEvents 推导） */
  cmPhaseAcceptTimes?: CmPhaseAcceptTimeMap;
  processEvents: ParcelProcessEvent[];
  attachments: ParcelAttachment[];
  /** 关联地图 feature（osm_id 或自定义 id） */
  mapFeatureId?: string;
  /** 地块范围示意（演示 bbox） */
  mapBounds?: [[number, number], [number, number]];
};
