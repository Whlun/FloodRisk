/**
 * 综合态势 · 水环境 POI 图层元数据（分类、数量、四态业务说明、与统一点位/地图台账的关联）
 */
import {
  ZHT_MONITORING_POI_DEMO,
  deriveMonitoringPoiDisplayState,
  getMonitoringMapIotOverridesSnapshot,
  mergeMonitoringPoiDemoWithIotOverrides,
} from './zhtPoiMonitoringDemo';
import type { ZhtFacilityMapKind, ZhtUnifiedSearchPoint } from './zhtSearchUnifiedData';
import {
  getZhtUnifiedSearchPointsCached,
  parseZhtFacilityUnifiedSearchId,
  parseZhtMonitorUnifiedSearchId,
} from './zhtSearchUnifiedData';
import type { ZhtStatDrawerPeekPoi } from './zhtLeftStatDrawerData';
import { getMergedFacilityLedgerRecord } from './zhtFacilityMapLedgerMerge';
import {
  facilityExplicitNoLinkedIot,
  pumpSceneSnapshotAllChannelsStopped,
  pumpSceneSnapshotHasAbnormalChannel,
  pumpFacilityAnyLinkedDeviceHasAbnormalChannel,
  pumpFacilityEveryLinkedDeviceAllChannelsStopped,
} from '../韶山水环境设施管理系统/facility-realtime-snapshot';

/** 排口台账缺省水质字段时，用入河入海排污口编码稳定派生示意化学需氧量/氨氮（与提示板一致） */
function outletDemoSeedHash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 排水户仅在显式配置了关联设备 keys 时才参与通道态聚合；避免缺省 key 误触发全图报警红 */
function dischargerLinkedDeviceKeys(record: Record<string, unknown>): string[] {
  const raw = record.iotLinkedDeviceKeys;
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
}

/** 与产品一致的四态（地图颜色：报警红、离线灰、在线绿、信息点蓝） */
export type ZhtPoiDisplayState = 'alarm' | 'offline' | 'online' | 'info';

export type ZhtPoiStateToggles = Record<ZhtPoiDisplayState, boolean>;

/** 系统管理 · 水利设施七类（各自独立图层与计数） */
export type ZhtSysHydroCategoryId =
  | 'sys_zhaba'
  | 'sys_diba'
  | 'sys_shuiku'
  | 'sys_shuizha'
  | 'sys_weiqu'
  | 'sys_yandi'
  | 'sys_shantang';

/** 水环境 POI 类型（不含「自定义标注」） */
export type ZhtWaterEnvCategoryId =
  | 'pump'
  | 'outlet'
  /** 入河（海）排污口责任主体（HJ 1314 表 A.2，与设施管理台账同源；落点取关联排口坐标） */
  | 'outlet_responsible'
  | 'plant'
  | 'discharger'
  | 'monitor'
  | 'eco_project'
  | 'eco_lake'
  | 'eco_affair'
  | 'emg_supply'
  | 'emg_team'
  | 'emg_event'
  /** 应急协同 · 风险源企业（统一点位 `zht-emg-ent-*`） */
  | 'risk_ent'
  | ZhtSysHydroCategoryId;

/** 系统管理水利子类顺序（图层 Popover 内分组展示） */
export const ZHT_SYS_HYDRO_CATEGORY_ORDER: ZhtSysHydroCategoryId[] = [
  'sys_zhaba',
  'sys_diba',
  'sys_shuiku',
  'sys_shuizha',
  'sys_weiqu',
  'sys_yandi',
  'sys_shantang',
];

export const ZHT_WATER_ENV_CATEGORY_ORDER: ZhtWaterEnvCategoryId[] = [
  'pump',
  'outlet',
  'outlet_responsible',
  'plant',
  'discharger',
  'monitor',
  'eco_project',
  'eco_lake',
  'eco_affair',
  'emg_supply',
  'emg_team',
  'emg_event',
  'risk_ent',
  ...ZHT_SYS_HYDRO_CATEGORY_ORDER,
];

/**
 * 图层无四态子勾选：仅「分类开关」；地图圆点固定为 **信息点蓝**（业务点），不参与四态过滤。
 * 含：生态整治项目/事务、社会物资/应急队伍/应急事件/风险源企业、系统管理水利七类。
 */
export const ZHT_WATER_ENV_BLUE_BUSINESS_CATEGORIES = new Set<ZhtWaterEnvCategoryId>([
  'outlet_responsible',
  'eco_project',
  'eco_lake',
  'eco_affair',
  'emg_supply',
  'emg_team',
  'emg_event',
  'risk_ent',
  ...ZHT_SYS_HYDRO_CATEGORY_ORDER,
]);

export function isWaterEnvBlueBusinessCategory(cat: ZhtWaterEnvCategoryId): boolean {
  return ZHT_WATER_ENV_BLUE_BUSINESS_CATEGORIES.has(cat);
}

export type ZhtWaterEnvCategoryMeta = {
  id: ZhtWaterEnvCategoryId;
  /** 列表主标题（不含数据来源前缀；数量由运行时拼接） */
  label: string;
  /** 图层说明问号：含数据来源与业务说明 */
  help: string;
  /** 与 `zhtWaterEnvPoiDotIcons` / 地图圆点中心 icon 对应 */
  iconKey: ZhtWaterEnvCategoryId;
};

export const ZHT_WATER_ENV_CATEGORY_META: ZhtWaterEnvCategoryMeta[] = [
  {
    id: 'pump',
    label: '泵站',
    iconKey: 'pump',
    help: '数据来源：设施管理台账（泵站）。单点仅一种外圈色，优先级：报警（红）＞离线（灰）＞在线（绿）＞信息点（蓝）。信息点为默认；在线表示台账语义为运行且具备物联/有效工况；离线表示停运、维护或无有效监测；报警表示台账或监测语义为超标 / I～IV 级。',
  },
  {
    id: 'outlet',
    label: '排口',
    iconKey: 'outlet',
    help: '数据来源：设施管理台账（排放口）。状态规则同泵站。',
  },
  {
    id: 'outlet_responsible',
    label: '责任主体',
    iconKey: 'outlet_responsible',
    help: '数据来源：设施管理 · 排口管理 · 责任主体信息（HJ 1314—2023 表 A.2，`facility-outlet-responsible-data.ts`）。地图落点与统一点位检索一致；无四态子项，圆点为信息点蓝；**地图 POI 提示板仅显示名称**，业务字段见左侧统计抽屉「责任主体信息」卡片或点选打开详情。',
  },
  {
    id: 'plant',
    label: '污水厂',
    iconKey: 'plant',
    help: '数据来源：设施管理台账（污水处理厂）。状态规则同泵站。',
  },
  {
    id: 'discharger',
    label: '排水户',
    iconKey: 'discharger',
    help: '数据来源：设施管理台账（排水户，`facility-discharger-data.ts`）。外圈色遵循统一四态：显式未关联/解绑为信息点蓝，异常为报警红，通道全停为离线灰，其余在线绿；与四态子勾选过滤一致。',
  },
  {
    id: 'monitor',
    label: '水质监测站',
    iconKey: 'monitor',
    help: '数据来源：设施管理侧水质监测类 POI（`ZHT_MONITORING_POI_DEMO`），物联平台接入。地图外圈遵循统一四态：报警红、离线灰、在线绿、信息点蓝（未关联物联时）；图层子勾选与 `deriveMonitoringPoiDisplayState` 联动。',
  },
  {
    id: 'eco_project',
    label: '项目',
    iconKey: 'eco_project',
    help: '数据来源：生态整治 ·「项目档案」台账坐标（`eco-project-archive-demo.ts`）及责任河段中点（`initialRiverSectionData`）。图层无四态子项；地图固定为信息点蓝。',
  },
  {
    id: 'eco_lake',
    label: '湖泊',
    iconKey: 'eco_lake',
    help: '数据来源：生态整治 · `riverChiefDb4401.ts` 中 `initialLakeWaterBodyData`（湖泊信息 ATT_LK_BASE，POI 与 `poiLong`/`poiLat` 同源）。图层无四态子项；地图固定为信息点蓝。',
  },
  {
    id: 'eco_affair',
    label: '事务',
    iconKey: 'eco_affair',
    help: '数据来源：生态整治 · `riverChiefDb4401.ts` 中 `initialRiverGuardAffairs` 事务台账（经纬度与事务列表同源）。图层无四态子项；地图固定为信息点蓝。',
  },
  {
    id: 'emg_supply',
    label: '社会物资',
    iconKey: 'emg_supply',
    help: '数据来源：应急协同 · `riskIdentification.ts` 中 `initialRiskData.socialPoints`（含经纬度）。图层无四态子项；地图固定为信息点蓝。',
  },
  {
    id: 'emg_team',
    label: '应急队伍',
    iconKey: 'emg_team',
    help: '数据来源：应急协同 · `initialRiskData.teams`（队伍地址与经纬度与风险识别台账一致）。图层无四态子项；地图固定为信息点蓝。',
  },
  {
    id: 'emg_event',
    label: '应急事件',
    iconKey: 'emg_event',
    help: '数据来源：应急协同（应急事件类点位，与应急原型演示数据一致）。图层无四态子项；地图固定为信息点蓝。',
  },
  {
    id: 'risk_ent',
    label: '风险源企业',
    iconKey: 'risk_ent',
    help: '数据来源：应急协同 · `riskIdentification.ts` 中 `initialRiskData.enterprises`（含经纬度）。图层无四态子项；地图固定为信息点蓝。',
  },
  {
    id: 'sys_zhaba',
    label: '闸坝',
    iconKey: 'sys_zhaba',
    help: '数据来源：系统管理 · `config-center-data.ts` 中 `sluiceInitial`（闸坝轴线中点）。图层无四态子项；地图固定为信息点蓝。',
  },
  {
    id: 'sys_diba',
    label: '堤坝',
    iconKey: 'sys_diba',
    help: '数据来源：系统管理 · `config-center-data.ts` 中 `leveeInitial`（堤防起讫中点）。图层无四态子项；地图固定为信息点蓝。',
  },
  {
    id: 'sys_shuiku',
    label: '水库',
    iconKey: 'sys_shuiku',
    help: '数据来源：系统管理 · `config-center-data.ts` 中 `hydroInitial`（水库范围 bbox 中心）。图层无四态子项；地图固定为信息点蓝。',
  },
  {
    id: 'sys_shuizha',
    label: '水闸',
    iconKey: 'sys_shuizha',
    help: '数据来源：系统管理 · `config-center-data.ts` 中 `waterGateInitial`（水闸轴线中点）。图层无四态子项；地图固定为信息点蓝。',
  },
  {
    id: 'sys_weiqu',
    label: '圩区',
    iconKey: 'sys_weiqu',
    help: '数据来源：系统管理 · `config-center-data.ts` 中 `polderInitial`（圩区范围 bbox 中心）。图层无四态子项；地图固定为信息点蓝。',
  },
  {
    id: 'sys_yandi',
    label: '堰堤',
    iconKey: 'sys_yandi',
    help: '数据来源：系统管理 · `config-center-data.ts` 中 `weirInitial`（堰体代表坐标）。图层无四态子项；地图固定为信息点蓝。',
  },
  {
    id: 'sys_shantang',
    label: '山塘',
    iconKey: 'sys_shantang',
    help: '数据来源：系统管理 · `config-center-data.ts` 中 `hillpondInitial`（山塘范围 bbox 中心）。图层无四态子项；地图固定为信息点蓝。',
  },
];

/** 主列表（不含系统管理水利分组；Popover 中水利七类单独折叠展示） */
export const ZHT_WATER_ENV_MAIN_CATEGORY_ORDER: ZhtWaterEnvCategoryId[] = [
  'pump',
  'outlet',
  'outlet_responsible',
  'plant',
  'discharger',
  'monitor',
  'eco_project',
  'eco_lake',
  'eco_affair',
  'emg_supply',
  'emg_team',
  'emg_event',
  'risk_ent',
];

export const ZHT_POI_STATE_HELP: Record<ZhtPoiDisplayState, string> = {
  alarm: '报警（红）：监测参数出现 I、II、III、IV 级报警，或演示指标为超标类（danger）。',
  offline: '离线（灰）：监测参数均无有效数据。',
  online: '在线（绿）：点位已关联物联设备，且不满足报警/离线条件。',
  info: '信息点（蓝）：默认展示；未关联物联且无报警/离线时保持蓝色。',
};

export const ALL_POI_STATES_ON: ZhtPoiStateToggles = {
  alarm: true,
  offline: true,
  online: true,
  info: true,
};

/** 统一点位 `pointType` → 系统管理水利子图层（须与演示数据一致） */
const SYS_HYDRO_POINT_TYPE_TO_CAT: Record<string, ZhtSysHydroCategoryId> = {
  闸坝: 'sys_zhaba',
  堤坝: 'sys_diba',
  水库: 'sys_shuiku',
  水闸: 'sys_shuizha',
  圩区: 'sys_weiqu',
  堰堤: 'sys_yandi',
  山塘: 'sys_shantang',
};

/** 监测演示点 → 地图外圈四态（与产品优先级一致） */
export function monitorDemoToDisplayState(mon: (typeof ZHT_MONITORING_POI_DEMO)[number]): ZhtPoiDisplayState {
  return deriveMonitoringPoiDisplayState(mon);
}

/**
 * 设施台账：单点一种外圈色，优先级 报警＞离线＞在线＞信息点（蓝为默认）。
 * 泵站 / 排口 / 污水厂在台账口径之上叠加 **`facility-realtime-snapshot`** 工况占位通道态，与 POI 提示板数值红（danger）一致。
 */
export function deriveFacilityDisplayState(
  kind: ZhtFacilityMapKind,
  record: Record<string, unknown>,
): ZhtPoiDisplayState {
  /** 泵站台账走 SL/T 809 的 ENG_STAT；其余设施仍用 status 等演示字段 */
  const status =
    kind === 'pump' ? String(record.engStat ?? '').trim() : String(record.status ?? '').trim();

  /** 设施统一：详情显式解绑 `iotLinkedDeviceKeys: []` 时优先回到信息点蓝（含排水户） */
  if (facilityExplicitNoLinkedIot(record)) return 'info';

  /** 排水户：未关联物联为信息点蓝；关联后与泵站同源工况快照推导报警/离线（与提示板一致） */
  if (kind === 'discharger') {
    const linked = String(record.linkedIot ?? '').trim();
    if (linked !== '1') return 'info';
    const keys = dischargerLinkedDeviceKeys(record);
    /**
     * 仅有 linkedIot 标记但未配置实际设备 key 时，不应套用默认 key='1' 的占位通道态，
     * 否则会把后加排水户批量误判为报警红。
     */
    if (keys.length === 0) return 'online';
    if (keys.some(k => pumpSceneSnapshotHasAbnormalChannel(k))) return 'alarm';
    if (keys.every(k => pumpSceneSnapshotAllChannelsStopped(k))) return 'offline';
    return 'online';
  }

  /** 其余设施继续走台账+快照推导 */

  let base: ZhtPoiDisplayState;

  /** 排口：HJ 1314 表 A.1 以水质指标为主；无化验字段时由入河入海排污口编码哈希派生示意值 */
  if (kind === 'outlet') {
    const id = String(record['入河入海排污口编码'] ?? record.id ?? '');
    const h = id ? outletDemoSeedHash(id) : 0;
    const codRaw = Number(record['化学需氧量'] ?? record.cod);
    const nhRaw = Number(record['氨氮'] ?? record.ammonia);
    const cod = Number.isFinite(codRaw) ? codRaw : (h % 60) + 8;
    const nh = Number.isFinite(nhRaw) ? nhRaw : ((h >> 5) % 50) / 10 + 0.2;
    if (cod >= 40 || nh >= 2.5) base = 'alarm';
    else {
      const autoMon = String(record['是否已建立自动监测站'] ?? '').trim();
      if (autoMon === '否' || autoMon === 'N' || autoMon === '0') base = 'offline';
      else base = 'online';
    }
  } else if (/报警|超标|超限|[IⅠ]\s*级|II\s*级|III\s*级|IV\s*级|Ⅱ级|Ⅲ级|Ⅳ级/i.test(status)) {
    base = 'alarm';
  } else if (kind === 'pump') {
    /**
     * 泵站 SL/T 809 ENG_STAT：1 已建；0 在建。
     * 原型中建泵站仍有物联监测演示；台账离线文案优先于快照。
     */
    if (/离线|无数据|停运|维护|停机|^--$/i.test(status)) base = 'offline';
    else base = 'online';
  } else if (/离线|无数据|停运|维护|停机|^--$/i.test(status)) {
    base = 'offline';
  } else if (/^(运行|在线|正常|良好|达标)$/i.test(status) || status === '1') {
    base = 'online';
  } else {
    base = 'info';
  }

  if (kind === 'pump' || kind === 'outlet' || kind === 'plant') {
    /** 台账已判离线时不抬升为告警；多泵时任一终端异常即设施告警（与详情横滑卡一致） */
    if (base !== 'offline' && pumpFacilityAnyLinkedDeviceHasAbnormalChannel(record)) return 'alarm';
    if (base === 'online' && pumpFacilityEveryLinkedDeviceAllChannelsStopped(record)) return 'offline';
  }

  return base;
}

/** 统一点位：监测走演示表推导；设施走台账；其它业务蓝类固定信息点 */
export function deriveDisplayStateForUnifiedPoint(p: ZhtUnifiedSearchPoint): ZhtPoiDisplayState {
  const monId = parseZhtMonitorUnifiedSearchId(p.id);
  if (monId) {
    const mon = ZHT_MONITORING_POI_DEMO.find(m => m.id === monId.rawMonId);
    if (mon) {
      const merged =
        mergeMonitoringPoiDemoWithIotOverrides(mon.id, getMonitoringMapIotOverridesSnapshot()) ?? mon;
      return deriveMonitoringPoiDisplayState(merged);
    }
  }
  const fac = parseZhtFacilityUnifiedSearchId(p.id);
  if (fac) {
    const row = getMergedFacilityLedgerRecord(fac.kind, fac.rawId);
    if (row) return deriveFacilityDisplayState(fac.kind, row as Record<string, unknown>);
  }
  const catOnly = getWaterEnvCategoryForUnifiedPoint(p);
  if (catOnly && ZHT_WATER_ENV_BLUE_BUSINESS_CATEGORIES.has(catOnly)) return 'info';
  return 'info';
}

/** 统一点位所属水环境图层分类；无法识别则 null */
export function getWaterEnvCategoryForUnifiedPoint(p: ZhtUnifiedSearchPoint): ZhtWaterEnvCategoryId | null {
  if (parseZhtMonitorUnifiedSearchId(p.id)) return 'monitor';
  if (p.id.startsWith('zht-outlet-responsible-')) return 'outlet_responsible';
  const fac = parseZhtFacilityUnifiedSearchId(p.id);
  if (fac?.kind === 'pump') return 'pump';
  if (fac?.kind === 'outlet') return 'outlet';
  if (fac?.kind === 'plant') return 'plant';
  if (fac?.kind === 'discharger') return 'discharger';
  if (p.id.startsWith('zht-eco-proj-')) return 'eco_project';
  if (p.id.startsWith('zht-river-sec-')) return 'eco_project';
  if (p.id.startsWith('zht-eco-lake-')) return 'eco_lake';
  if (p.id.startsWith('zht-eco-affair-')) return 'eco_affair';
  if (p.pointType === '社会物资' || p.id.startsWith('zht-emg-supply')) return 'emg_supply';
  if (p.pointType === '应急队伍' || p.id.startsWith('zht-emg-team-')) return 'emg_team';
  if (p.pointType === '风险源企业' || p.id.startsWith('zht-emg-ent-')) return 'risk_ent';
  if (p.sourceProject === '应急协同') return 'emg_event';
  if (p.sourceProject === '系统管理') {
    const sub = SYS_HYDRO_POINT_TYPE_TO_CAT[p.pointType];
    return sub ?? null;
  }
  return null;
}

export function countUnifiedPointsByCategory(): Record<ZhtWaterEnvCategoryId, number> {
  const pts = getZhtUnifiedSearchPointsCached();
  const out = {} as Record<ZhtWaterEnvCategoryId, number>;
  for (const id of ZHT_WATER_ENV_CATEGORY_ORDER) {
    out[id] = 0;
  }
  for (const p of pts) {
    const c = getWaterEnvCategoryForUnifiedPoint(p);
    if (c) out[c] += 1;
  }
  return out;
}

export type ZhtWaterEnvCategoryLayer = {
  enabled: boolean;
  states: ZhtPoiStateToggles;
};

export type ZhtWaterEnvPoiLayers = Record<ZhtWaterEnvCategoryId, ZhtWaterEnvCategoryLayer>;

export const DEFAULT_WATER_ENV_POI_LAYERS: ZhtWaterEnvPoiLayers = (() => {
  const layer = (enabled: boolean): ZhtWaterEnvCategoryLayer => ({
    enabled,
    states: { ...ALL_POI_STATES_ON },
  });
  return Object.fromEntries(ZHT_WATER_ENV_CATEGORY_ORDER.map(id => [id, layer(true)])) as ZhtWaterEnvPoiLayers;
})();

/** 水环境 POI 总开关「全不选」：各类关闭、四态全关（与 Popover 父级取消勾选同步） */
const ALL_POI_STATES_OFF: ZhtPoiStateToggles = {
  alarm: false,
  offline: false,
  online: false,
  info: false,
};

export const WATER_ENV_POI_LAYERS_ALL_UNCHECKED: ZhtWaterEnvPoiLayers = (() => {
  return Object.fromEntries(
    ZHT_WATER_ENV_CATEGORY_ORDER.map(id => [id, { enabled: false, states: { ...ALL_POI_STATES_OFF } }]),
  ) as ZhtWaterEnvPoiLayers;
})();

/** 图层切片（避免与 `zhtLayerControlState` 循环依赖） */
export type ZhtWaterEnvPoiLayerControlSlice = {
  waterEnvPoiEnabled: boolean;
  waterEnvPoiLayers: ZhtWaterEnvPoiLayers;
};

/** 某统一点位是否应绘制在地图（水环境总开关 + 分类开关 + 四态开关） */
export function unifiedPointPassesWaterEnvLayer(slice: ZhtWaterEnvPoiLayerControlSlice, p: ZhtUnifiedSearchPoint): boolean {
  if (!slice.waterEnvPoiEnabled) return false;
  const cat = getWaterEnvCategoryForUnifiedPoint(p);
  if (!cat) return false;
  const L = slice.waterEnvPoiLayers[cat];
  if (!L?.enabled) return false;
  if (ZHT_WATER_ENV_BLUE_BUSINESS_CATEGORIES.has(cat)) return true;
  const st = deriveDisplayStateForUnifiedPoint(p);
  return L.states[st] === true;
}

/** 设施台账记录在图层下是否显示 */
export function facilityPassesWaterEnvLayer(
  slice: ZhtWaterEnvPoiLayerControlSlice,
  kind: ZhtFacilityMapKind,
  record: Record<string, unknown>,
): boolean {
  if (!slice.waterEnvPoiEnabled) return false;
  const cat: ZhtWaterEnvCategoryId =
    kind === 'pump' ? 'pump' : kind === 'outlet' ? 'outlet' : kind === 'discharger' ? 'discharger' : 'plant';
  const L = slice.waterEnvPoiLayers[cat];
  if (!L?.enabled) return false;
  const st = deriveFacilityDisplayState(kind, record);
  return L.states[st] === true;
}

/** 监测演示点在图层下是否显示 */
export function monitorDemoPassesWaterEnvLayer(
  slice: ZhtWaterEnvPoiLayerControlSlice,
  mon: (typeof ZHT_MONITORING_POI_DEMO)[0],
): boolean {
  if (!slice.waterEnvPoiEnabled) return false;
  const L = slice.waterEnvPoiLayers.monitor;
  if (!L?.enabled) return false;
  const st = deriveMonitoringPoiDisplayState(mon);
  return L.states[st] === true;
}

/** 指标抽屉地址定位：总开关/分类关时仍临时展示与 `peekPoi.unifiedId` 对应的台账/统一点位 */
export function unifiedPointPassesWaterEnvLayerOrPeek(
  slice: ZhtWaterEnvPoiLayerControlSlice,
  p: ZhtUnifiedSearchPoint,
  peek: ZhtStatDrawerPeekPoi | null | undefined,
): boolean {
  if (peek?.kind === 'unified' && peek.unifiedId === p.id) return true;
  return unifiedPointPassesWaterEnvLayer(slice, p);
}

export function facilityPassesWaterEnvLayerOrPeek(
  slice: ZhtWaterEnvPoiLayerControlSlice,
  kind: ZhtFacilityMapKind,
  record: Record<string, unknown>,
  peek: ZhtStatDrawerPeekPoi | null | undefined,
): boolean {
  const rawId =
    kind === 'outlet'
      ? String(record['入河入海排污口编码'] ?? record.id ?? '')
      : String(record.id ?? '');
  if (peek?.kind === 'unified') {
    const m = parseZhtFacilityUnifiedSearchId(peek.unifiedId);
    if (m && m.kind === kind && m.rawId === rawId) return true;
  }
  return facilityPassesWaterEnvLayer(slice, kind, record);
}

export function monitorDemoPassesWaterEnvLayerOrPeek(
  slice: ZhtWaterEnvPoiLayerControlSlice,
  mon: (typeof ZHT_MONITORING_POI_DEMO)[0],
  peek: ZhtStatDrawerPeekPoi | null | undefined,
): boolean {
  if (peek?.kind === 'unified') {
    const mm = parseZhtMonitorUnifiedSearchId(peek.unifiedId);
    if (mm && mm.rawMonId === mon.id) return true;
  }
  return monitorDemoPassesWaterEnvLayer(slice, mon);
}
