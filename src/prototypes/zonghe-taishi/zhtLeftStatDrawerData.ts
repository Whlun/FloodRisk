/**
 * 左侧指标项 → 右侧抽屉卡片数据：与统一点位 / 设施管理 / 生态整治 / 应急协同 / 系统管理 演示数据同源字段语义。
 */
import {
  pumpStationData,
  outletData,
  plantData,
  PLANT_OPTS_FACILITY_TYPE,
  PLANT_OPTS_SLUDGE_DISPOSAL,
  PLANT_OPTS_TREATMENT_LEVEL,
  PLANT_OPTS_TREATMENT_METHOD,
  formatOutletApprovalReg,
  formatOutletEmissionState,
  formatOutletDischargeMode,
  formatOutletGateForm,
  formatOutletLevel1,
  formatOutletLevel2,
  plantLabelFromOptions,
  pustEngScalLabel,
  pustEngStatLabel,
  pustTypeLabel,
} from '../韶山水环境设施管理系统/facility-points-data';
import {
  ADMIN_LEVEL_LABEL,
  CONTACT_ROLE_LABEL,
  formatShaoshanAdminDivisionDisplay,
  getShaoshanAddvcdLabel,
  initialLakeWaterBodyData,
  initialRiverChannelMasterData,
  initialRiverChiefContacts,
  initialRiverGuardAffairs,
  initialRiverSectionData,
  LAKE_LK_RANK_OPTIONS,
  LAKE_SAL_FRE_WAT_OPTIONS,
  RIVER_SIDE_LABEL,
  SECTION_TYPE_LABEL,
  USER_TYPE_LABEL,
  type RiverChiefContactRow,
  type RiverChannelMasterRow,
} from '../生态整治/riverChiefDb4401';
import {
  initialEcoProjectArchiveData,
  type EcoProjectArchiveRow,
} from '../生态整治/eco-project-archive-demo';
import { initialRiskData } from '../应急协同/riskIdentification';
import {
  getZhtUnifiedEmergencyDemoEvent,
  getZhtUnifiedSearchPointsCached,
  type ZhtUnifiedSearchPoint,
} from './zhtSearchUnifiedData';
import {
  getAllPollutionMapPoints,
  ZHT_POLLUTION_KIND_LABEL,
  type ZhtPollutionMapPoint,
} from './zhtPollutionSourceLayerData';
import {
  dischargerDemoData,
  dischargerLabelDataSource,
  dischargerLabelYesNo,
} from '../韶山水环境设施管理系统/facility-discharger-data';
import {
  formatResponsiblePartyType,
  outletResponsiblePartyInitial,
} from '../韶山水环境设施管理系统/facility-outlet-responsible-data';
import {
  DKE_GRAD_OPTIONS,
  DIKE_PATT_OPTIONS,
  DIKE_TYPE_OPTIONS,
  ENG_GRAD_OPTIONS,
  ENG_SCAL_OPTIONS,
  ENG_STAT_OPTIONS,
  hillpondInitial,
  RES_TYPE_OPTIONS,
  hydroInitial,
  leveeInitial,
  MAIN_BUILD_GRAD_OPTIONS,
  POLD_CLAS_OPTIONS,
  POLD_PROP_OPTIONS,
  polderInitial,
  sluiceInitial,
  waterGateInitial,
  weirInitial,
  WAG_TYPE_OPTIONS,
  WFW_TYPE_OPTIONS,
  type HydroRecord,
} from '../韶山水环境系统管理/config-center-data';

/** 图层隐藏时，点击抽屉地址临时揭开对应地图 POI（统一点位 id 或污染源业务 id） */
export type ZhtStatDrawerPeekPoi =
  | { kind: 'unified'; unifiedId: string }
  | { kind: 'pollution'; pollutionKind: ZhtPollutionMapPoint['kind']; pollutionId: string };

/** 抽屉整卡点击：与地图对应 POI 一致打开详情 */
export type ZhtStatDrawerPoiClick =
  | { type: 'unified'; unifiedId: string }
  | { type: 'pollution'; kind: ZhtPollutionMapPoint['kind']; id: string }
  /** 生态整治 · 河流主表详情 */
  | { type: 'riverChannel'; riverObjectId: string }
  /** 生态整治 · 河长通讯录（无统一点位 id，与 `RiverChiefContactReadonlyDetailContent` 同源） */
  | { type: 'riverChiefContact'; contactId: string }
  /** 应急协同风险识库：与 `initialRiskData` 同源，无地图统一点位 id 时由抽屉显式声明 */
  | { type: 'emergencyExpert'; id: string }
  | { type: 'emergencyPlan'; id: string }
  | { type: 'emergencySupply'; id: string };

/** 指标抽屉卡片 → 地图定位（点或包络框） */
export type ZhtStatDrawerMapFocus =
  | { kind: 'point'; lng: number; lat: number; zoom?: number; peekPoi?: ZhtStatDrawerPeekPoi }
  | {
      kind: 'bounds';
      west: number;
      south: number;
      east: number;
      north: number;
      /** 视口留白（像素） */
      padding?: number;
      peekPoi?: ZhtStatDrawerPeekPoi;
    };

function safePointMapFocus(lng: unknown, lat: unknown): ZhtStatDrawerMapFocus | undefined {
  const lo = Number(typeof lng === 'number' ? lng : String(lng ?? '').trim());
  const la = Number(typeof lat === 'number' ? lat : String(lat ?? '').trim());
  if (Number.isFinite(lo) && Number.isFinite(la)) return { kind: 'point', lng: lo, lat: la };
  return undefined;
}

/** SL/T 809 码表值 → 选项中文标签（无匹配则回退原码） */
function hydroCodeLabel(options: readonly { value: string; label: string }[], code: string | null | undefined): string {
  const v = code?.trim();
  if (!v) return '—';
  return options.find(o => o.value === v)?.label ?? v;
}

/** 堤防型式 DIKE_PATT：允许多码逗号拼接，逐项转中文 */
function leveeDikePatternDisplay(patt: string | null | undefined): string {
  const raw = patt?.trim();
  if (!raw) return '—';
  const segs = raw.split(/[,，]/).map(s => s.trim()).filter(Boolean);
  if (segs.length === 0) return '—';
  return segs.map(s => hydroCodeLabel(DIKE_PATT_OPTIONS, s)).join('、');
}

/** 抽屉内单卡指标：展示层优先状态/枚举/统计/时间，排除监测类 */
export type ZhtStatDrawerMetric = {
  label: string;
  value: string;
  /**
   * stat 数值；enum 分类；status 运行/处置状态；time 时间字段；
   * monitoring 水质监测项（展示时过滤）；省略为 plain
   */
  kind?: 'stat' | 'enum' | 'status' | 'time' | 'monitoring' | 'plain';
  /** 若指定，展示排序时优先按此升序（如排口固定字段序）；未指定则仍按 kind 优先级 */
  order?: number;
};

/** 全宽纵向行（如专家：擅长方向长文本），与上方 metrics 网格可并存 */
export type ZhtStatDrawerDetailRow = {
  label: string;
  value: string;
};

/** 应急专家卡片顶区：左头像 + 姓名与电话同行 + 橙边职称标签 */
export type ZhtStatDrawerExpertPerson = {
  /** 头像 URL；缺省时组件内用姓名首字蓝底占位 */
  avatarUrl?: string;
  /** 主色描边胶囊标签，一般为职称 */
  accentTag: string;
  /** 与姓名同一行、靠右，仅号码 */
  phone: string;
};

export type ZhtStatDrawerCard = {
  id: string;
  title: string;
  /** [0] 为所属行政区划末级或简称；[1] 可选业务类型（排口卡不展示类型标签；排水户台账仅重点时第二枚为「重点」） */
  tags: string[];
  /** 与 {@link tags} 等长时，对应下标为 Tooltip 完整说明（如区划全路径） */
  tagTooltips?: string[];
  /** 有真实地址文案时才传；无则省略 */
  address?: string;
  /**
   * 地图定位：点或包络框。`getZhtLeftStatDrawerCards` 返回前会经 `finalizeDrawerCard` 处理：
   * 只要最终有 `address` 展示行且此处未填，则自动补 **稳定演示落点**（保证有地址即可定位）。
   */
  mapFocus?: ZhtStatDrawerMapFocus;
  /** 副行：监测点 / 时间等（设计稿） */
  subLine?: string;
  /** 指标区下方全宽多行块（如应急专家） */
  detailRows?: ZhtStatDrawerDetailRow[];
  /** 有值时启用专家顶区横向头像布局（与默认 `__hd` 二选一） */
  expertPerson?: ZhtStatDrawerExpertPerson;
  /**
   * 整卡点击打开地图同源详情；未传时由 `finalizeDrawerCard` 根据 `mapFocus.peekPoi` 推断。
   * 污染源抽屉须显式传入（地图为独立图层 id）。
   */
  poiClick?: ZhtStatDrawerPoiClick;
  metrics: ZhtStatDrawerMetric[];
  /** 用于头部在线 / 离线 / 报警统计（演示） */
  statusBucket?: 'online' | 'offline' | 'alarm' | 'neutral';
};

/** 与左侧块一致：无底部表/无抽屉数据的项置灰；检查井已接「排水管点」同源自检表 */
const NON_INTERACTIVE_LABELS = new Set<string>([]);

export function isLeftStatItemNonInteractive(itemLabel: string): boolean {
  return NON_INTERACTIVE_LABELS.has(itemLabel);
}

/** 抽屉顶栏标题：「| 水库信息」 */
export function getZhtLeftStatDrawerHeading(itemLabel: string): string {
  if (itemLabel === '社会物资点') return '社会物资点';
  return `${itemLabel}信息`;
}

function sliceSix(m: ZhtStatDrawerMetric[]): ZhtStatDrawerMetric[] {
  return m.slice(0, 6);
}

/** 按常见水质指标名排除（与 kind:monitoring 二选一即可） */
const MONITORING_LABELS = new Set(
  ['COD', '氨氮', 'PH', 'ph', '浊度', '总氮', '总磷', '溶解氧', '高锰酸盐指数', '水温', '电导率'].map(s => s.toLowerCase()),
);

function isMonitoringMetric(m: ZhtStatDrawerMetric): boolean {
  if (m.kind === 'monitoring') return true;
  return MONITORING_LABELS.has(m.label.trim().toLowerCase());
}

function metricKindRank(m: ZhtStatDrawerMetric): number {
  const k = m.kind ?? 'plain';
  if (k === 'status') return 0;
  if (k === 'enum') return 1;
  if (k === 'stat') return 2;
  if (k === 'time') return 3;
  if (k === 'plain') return 4;
  return 5;
}

/**
 * 指标区：不展示监测类；有 `order` 时按 `order`；否则优先状态→枚举→统计→时间→普通；
 * 字段少于 4 条时最多展示 3 条，否则最多 9 条（如水库九项、闸坝八项）。
 */
export function pickDrawerMetricsForDisplay(raw: ZhtStatDrawerMetric[]): ZhtStatDrawerMetric[] {
  const filtered = raw.filter(m => !isMonitoringMetric(m));
  const sorted = [...filtered].sort((a, b) => {
    const oa = a.order;
    const ob = b.order;
    if (oa != null || ob != null) {
      return (oa ?? 1e9) - (ob ?? 1e9);
    }
    return metricKindRank(a) - metricKindRank(b) || a.label.localeCompare(b.label, 'zh-CN');
  });
  const n = sorted.length;
  if (n === 0) return [];
  /** 闸坝等卡片需展示 8 项；其余台账仍不超过 8 条 */
  const cap = n < 4 ? Math.min(3, n) : Math.min(9, n);
  return sorted.slice(0, cap);
}

/** 无实质地址时不展示地址行 */
function sanitizeDrawerAddress(addr: string | undefined): string | undefined {
  const t = addr?.trim();
  if (!t) return undefined;
  if (/^(地址：)?[—\-暂无无]\s*$/.test(t)) return undefined;
  return t;
}

/** 与设施提示板同源：稳定哈希，保证同卡多次点击落点一致 */
function stableUint32(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * 抽屉卡片无台账坐标时：在韶山演示范围内生成稳定落点，
 * 保证「只要展示地址/位置类文案行，地图定位能力均可用」。
 */
function stableDemoMapFocusFromId(id: string): ZhtStatDrawerMapFocus {
  const h = stableUint32(id);
  const lng = 112.52 + ((h & 0xfff) / 0xfff) * 0.06;
  const lat = 27.9 + (((h >> 12) & 0xfff) / 0xfff) * 0.05;
  return { kind: 'point', lng, lat };
}

function finalizeDrawerCard(c: ZhtStatDrawerCard): ZhtStatDrawerCard {
  const address = sanitizeDrawerAddress(c.address);
  const metrics = pickDrawerMetricsForDisplay(c.metrics);
  let mapFocus = c.mapFocus;
  if (address && !mapFocus) {
    mapFocus = stableDemoMapFocusFromId(c.id);
  }
  const peek = mapFocus?.peekPoi;
  const poiClickDerived =
    peek?.kind === 'unified'
      ? ({ type: 'unified' as const, unifiedId: peek.unifiedId } as const)
      : peek?.kind === 'pollution'
        ? ({
            type: 'pollution' as const,
            kind: peek.pollutionKind,
            id: peek.pollutionId,
          } as const)
        : undefined;
  const poiClick = c.poiClick ?? poiClickDerived;
  return {
    ...c,
    address,
    mapFocus,
    metrics,
    poiClick,
  };
}

function statusToBucket(status: string): ZhtStatDrawerCard['statusBucket'] {
  const s = status.trim();
  if (s.includes('报警') || s.includes('超标')) return 'alarm';
  if (s.includes('离线')) return 'offline';
  if (s.includes('在线') || s.includes('运行') || s.includes('正常') || s.includes('在册') || s.includes('在管'))
    return 'online';
  return 'neutral';
}

function hydroByCode(code: string): HydroRecord | undefined {
  return hydroInitial.find(r => r.resCode === code);
}

/** 水利工程卡片：台账位置文案 + 与地图一致的经纬度（优先 POI） */
function hydroLocationAddressLine(loc: string, mapFocus: ZhtStatDrawerMapFocus): string {
  const t = loc?.trim() || '—';
  if (mapFocus.kind === 'point') {
    return `地址：${t}（${mapFocus.lng.toFixed(4)}°E，${mapFocus.lat.toFixed(4)}°N）`;
  }
  return `地址：${t}`;
}

/** 统一点位默认坐标上的点定位 */
function defaultPointFocus(p: ZhtUnifiedSearchPoint): ZhtStatDrawerMapFocus {
  return { kind: 'point', lng: p.lng, lat: p.lat };
}

/** 优先使用台账 POI，否则沿用统一点位坐标 */
function focusWithHydroPoi(
  p: ZhtUnifiedSearchPoint,
  poiLong: number | null | undefined,
  poiLat: number | null | undefined,
): ZhtStatDrawerMapFocus {
  const pf = safePointMapFocus(poiLong, poiLat);
  return pf ?? defaultPointFocus(p);
}

/** 统一点位无台账命中时：状态/类型/区划/坐标，不含监测项 */
function defaultUnifiedMetrics(p: ZhtUnifiedSearchPoint): ZhtStatDrawerMetric[] {
  return [
    { label: '状态', value: p.status, kind: 'status' },
    { label: '类型', value: p.pointType, kind: 'enum' },
    { label: '所属区划', value: p.region, kind: 'enum' },
    { label: '经度', value: `${p.lng.toFixed(4)}°E`, kind: 'stat' },
    { label: '纬度', value: `${p.lat.toFixed(4)}°N`, kind: 'stat' },
  ];
}

/** 村级区划路径取末级（村/社区），用于项目卡 tag，避免「市 / 镇 / 村」整串占宽 */
function shaoshanAdminDivisionLeafLabel(adminDivision: string | undefined): string {
  const full = formatShaoshanAdminDivisionDisplay(adminDivision);
  if (!full || full === '—') return '韶山市';
  const parts = full.split(/\s*\/\s*/).map(s => s.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1]! : full;
}

/**
 * 抽屉卡片区划标签：展示到**最末一级**（镇/乡/街道等），避免「省—市—县—镇」整串占宽。
 * 含 `/` 的路径按段取末段；否则按「市」分段取最后一段（适配「…市…市清溪镇」类写法）。
 */
function statDrawerRegionTagLeaf(region: string): string {
  const s = region.trim();
  if (!s) return s;
  if (s.includes('/')) {
    const parts = s.split(/\s*\/\s*/).map(x => x.trim()).filter(Boolean);
    return parts.length ? parts[parts.length - 1]! : s;
  }
  const chunks = s.split('市').map(x => x.trim()).filter(Boolean);
  if (chunks.length >= 2) {
    const tail = chunks[chunks.length - 1]!;
    if (tail) return tail;
  }
  return s;
}

/** 系统管理水利七类：左侧已选子类，头部只保留「所属区域」一枚 tag，不叠「闸坝/堤坝/水库…」 */
const STAT_DRAWER_HYDRO_POINT_TYPES_REGION_TAG_ONLY = new Set([
  '水库',
  '堤坝',
  '闸坝',
  '水闸',
  '圩区',
  '堰堤',
  '山塘',
]);

function unifiedPointToCard(p: ZhtUnifiedSearchPoint): ZhtStatDrawerCard {
  const regionFull = p.region.trim();
  const regionLeaf = statDrawerRegionTagLeaf(regionFull);
  const pointTypeTrim = p.pointType.trim();
  let tagTooltips: string[] | undefined;
  let tags: string[];
  if (
    pointTypeTrim === '排口' ||
    pointTypeTrim === '责任主体' ||
    pointTypeTrim === '应急队伍' ||
    STAT_DRAWER_HYDRO_POINT_TYPES_REGION_TAG_ONLY.has(pointTypeTrim)
  ) {
    tags = [regionLeaf];
    tagTooltips = regionLeaf !== regionFull && regionFull ? [regionFull] : undefined;
  } else {
    tags = [regionLeaf, pointTypeTrim];
    tagTooltips =
      regionLeaf !== regionFull && regionFull ? [regionFull, pointTypeTrim] : undefined;
  }
  let metrics = defaultUnifiedMetrics(p);
  let subLine: string | undefined;
  /** 无结构化地址台账时不生成地址行（坐标进指标或副行） */
  let address: string | undefined;
  let mapFocus: ZhtStatDrawerMapFocus = defaultPointFocus(p);

  const pump = pumpStationData.find(r => r.id === p.code);
  if (p.pointType === '泵站' && pump) {
    /** 顶栏第二枚 tag：泵站类型；悬停展示码表中文 */
    const typeLabel = pustTypeLabel(pump.pustType);
    tags = [regionLeaf, '泵站类型'];
    tagTooltips = [
      regionLeaf !== regionFull && regionFull ? regionFull : regionLeaf,
      typeLabel,
    ];
    metrics = sliceSix([
      { label: '水泵台数', value: String(pump.pumpNum), kind: 'stat' },
      { label: '工程建设情况', value: pustEngStatLabel(pump.engStat), kind: 'status' },
      {
        label: '设计流量',
        value:
          pump.desFlow != null && Number.isFinite(Number(pump.desFlow)) ? `${pump.desFlow} 立方米每秒` : '—',
        kind: 'stat',
      },
      {
        label: '设计扬程',
        value:
          pump.desHead != null && Number.isFinite(Number(pump.desHead)) ? `${pump.desHead} 米` : '—',
        kind: 'stat',
      },
      {
        label: '装机容量',
        value:
          pump.instCap != null && Number.isFinite(Number(pump.instCap)) ? `${pump.instCap} 千瓦` : '—',
        kind: 'stat',
      },
      { label: '工程规模', value: pustEngScalLabel(pump.engScal), kind: 'enum' },
    ]);
    /** 本站地址：与排口/污水厂/项目卡片一致走 `address` 行，便于地图定位 */
    address = `地址：${pump.pustLoc.trim()}（${p.lng.toFixed(4)}°E，${p.lat.toFixed(4)}°N）`;
  }

  const outlet = outletData.find(r => r['入河入海排污口编码'] === p.code);
  if (p.pointType === '排口' && outlet) {
    /** 与 HJ 1314 表 A.1 抽屉摘要口径一致（不含排污口流量） */
    metrics = [
      { label: '入河入海排污口一级分类', value: formatOutletLevel1(outlet['入河入海排污口一级分类']), kind: 'enum', order: 1 },
      { label: '入河入海排污口二级分类', value: formatOutletLevel2(outlet['入河入海排污口二级分类']), kind: 'enum', order: 2 },
      { label: '审批登记备案情况', value: formatOutletApprovalReg(outlet['审批登记备案情况']), kind: 'enum', order: 3 },
      { label: '排放状态', value: formatOutletEmissionState(outlet['排放状态']), kind: 'enum', order: 4 },
      { label: '排放方式', value: formatOutletDischargeMode(outlet['排放方式']), kind: 'enum', order: 5 },
      { label: '口门形态', value: formatOutletGateForm(outlet['口门形态']), kind: 'enum', order: 6 },
    ];
    address = `地址：${outlet['入河入海排污口详细地址']}（${p.lng.toFixed(4)}°E，${p.lat.toFixed(4)}°N）`;
  }

  const plant = plantData.find(r => r.id === p.code);
  if (p.pointType === '污水厂' && plant) {
    /** 与表 A.0.30 码表一致：设施类型 → 处理级别 → 建成日期 → 处理方法 → 设计规模 → 污泥处置 */
    metrics = [
      {
        label: '污水处理设施类型',
        value: plantLabelFromOptions(plant.facilityType, PLANT_OPTS_FACILITY_TYPE),
        kind: 'enum',
        order: 1,
      },
      {
        label: '污水处理级别',
        value: plantLabelFromOptions(plant.treatmentLevel, PLANT_OPTS_TREATMENT_LEVEL),
        kind: 'enum',
        order: 2,
      },
      {
        label: '建成日期',
        value: plant.completionDate?.trim() || '—',
        kind: 'time',
        order: 3,
      },
      {
        label: '污水处理方法',
        value: plantLabelFromOptions(plant.treatmentMethod, PLANT_OPTS_TREATMENT_METHOD),
        kind: 'enum',
        order: 4,
      },
      {
        label: '污水设计处理规模',
        value: `${plant.designCapa} 万m³/d`,
        kind: 'stat',
        order: 5,
      },
      {
        label: '污泥处置方式',
        value: plantLabelFromOptions(plant.sludgeDisposalMethod, PLANT_OPTS_SLUDGE_DISPOSAL),
        kind: 'enum',
        order: 6,
      },
    ];
    address = `地址：${plant.addr}（${p.lng.toFixed(4)}°E，${p.lat.toFixed(4)}°N）`;
  }

  const discharger = dischargerDemoData.find(r => r.id === p.code);
  if (p.pointType === '排水户' && discharger) {
    metrics = [
      { label: '排水户类型', value: discharger.dischargerType?.trim() || '—', kind: 'enum', order: 1 },
      { label: '重点排水户', value: dischargerLabelYesNo(discharger.keyDischarger), kind: 'enum', order: 2 },
      { label: '关联物联监测', value: dischargerLabelYesNo(discharger.linkedIot ?? '0'), kind: 'enum', order: 3 },
      { label: '排入城镇污水', value: dischargerLabelYesNo(discharger.townSewage), kind: 'enum', order: 4 },
      { label: '污水处理方式', value: discharger.treatmentMethod?.trim() || '—', kind: 'plain', order: 5 },
      { label: '数据来源', value: dischargerLabelDataSource(discharger.dataSource), kind: 'enum', order: 6 },
    ];
    address = `地址：${discharger.addr}（${p.lng.toFixed(4)}°E，${p.lat.toFixed(4)}°N）`;
    /** 顶栏第二枚 tag：仅重点排水户展示「重点」；一般排水户不展示类型 tag（不再显示「排水户」角标） */
    const isKeyDischarger = discharger.keyDischarger === '1';
    tags = isKeyDischarger ? [regionLeaf, '重点'] : [regionLeaf];
    tagTooltips =
      regionLeaf !== regionFull && regionFull
        ? isKeyDischarger
          ? [regionFull, '重点排水户']
          : [regionFull]
        : undefined;
  }

  const teamRow = initialRiskData.teams.find(r => r.id === p.code);
  if (p.pointType === '应急队伍' && teamRow) {
    metrics = sliceSix([
      { label: '队伍人数', value: String(teamRow.members?.length ?? 0), kind: 'stat', order: 1 },
      { label: '队伍负责人', value: teamRow.leaderName?.trim() || '—', kind: 'plain', order: 2 },
      { label: '联络方式', value: teamRow.contactPhone?.trim() || '—', kind: 'stat', order: 3 },
      { label: '主管部门', value: teamRow.competentDept?.trim() || '—', kind: 'enum', order: 4 },
      { label: '应急专长', value: teamRow.specialty?.trim() || '—', kind: 'enum', order: 5 },
      { label: '值班电话', value: teamRow.dutyPhone?.trim() || '—', kind: 'stat', order: 6 },
    ]);
    const addrTeam = teamRow.teamAddress?.trim();
    if (addrTeam) {
      address = `地址：${addrTeam}（${p.lng.toFixed(4)}°E，${p.lat.toFixed(4)}°N）`;
    }
  }

  /** 生态整治 · 项目档案（与 `eco-project-archive-demo` 同源） */
  if (p.pointType === '生态整治项目') {
    const proj = initialEcoProjectArchiveData.find(r => r.code === p.code);
    if (proj) {
      tags = [shaoshanAdminDivisionLeafLabel(proj.adminDivision), proj.type];
      tagTooltips = undefined;
      metrics = [
        { label: '项目状态', value: proj.status, kind: 'status', order: 1 },
        { label: '投资金额', value: `${proj.investment} 万元`, kind: 'stat', order: 2 },
        { label: '项目类型', value: proj.type, kind: 'enum', order: 3 },
        { label: '完成进度', value: `${proj.progress}%`, kind: 'stat', order: 4 },
        { label: '计划开始日期', value: proj.startDate, kind: 'time', order: 5 },
        { label: '计划结束日期', value: proj.endDate, kind: 'time', order: 6 },
      ];
      const loc = proj.location?.trim();
      if (loc) {
        address = `地址：${loc}（${p.lng.toFixed(4)}°E，${p.lat.toFixed(4)}°N）`;
      }
      mapFocus = defaultPointFocus(p);
    }
  }

  /** 责任河段（与 `initialRiverSectionData`、左侧「河流」抽屉一致） */
  if (p.pointType === '责任河段') {
    const riv = initialRiverSectionData.find(r => r.sectionId === p.code);
    if (riv) {
      tags = [addvcdToRegion(riv.addvcd), SECTION_TYPE_LABEL[riv.sectionType] ?? '责任河段'];
      tagTooltips = undefined;
      metrics = riverSectionDrawerMetrics(riv);
    }
  }

  /** 河湖管护事务（与左侧「事务」、`riverGuardAffairToCard` 指标一致） */
  if (p.pointType === '河湖管护事务' && p.id.startsWith('zht-eco-affair-')) {
    const affKey = p.id.slice('zht-eco-affair-'.length);
    const aff = initialRiverGuardAffairs.find(a => a.key === affKey);
    if (aff) {
      const ac = riverGuardAffairToCard(aff);
      tags = ac.tags;
      tagTooltips = ac.tagTooltips;
      metrics = ac.metrics;
      address = ac.address;
      mapFocus = ac.mapFocus ?? defaultPointFocus(p);
    }
  }

  /** 湖泊（与左侧「湖泊」、`lakeToCard` 同源；统一点位 id `zht-eco-lake-*`） */
  if (p.pointType === '湖泊' && p.id.startsWith('zht-eco-lake-')) {
    const lkKey = p.id.slice('zht-eco-lake-'.length);
    const lake = initialLakeWaterBodyData.find(l => l.key === lkKey);
    if (lake) {
      const lc = lakeToCard(lake);
      tags = lc.tags;
      tagTooltips = lc.tagTooltips;
      metrics = lc.metrics;
      address = lc.address;
      mapFocus = { kind: 'point', lng: p.lng, lat: p.lat, peekPoi: { kind: 'unified', unifiedId: p.id } };
    }
  }

  if (p.pointType === '水库') {
    const h = hydroByCode(p.code);
    if (h) {
      const levM = (v: number | null | undefined) =>
        v != null && Number.isFinite(Number(v)) ? `${v} m` : '—';
      const cap104 = (v: number | null | undefined) =>
        v != null && Number.isFinite(Number(v)) ? `${v} 万m³` : '—';
      /** ATT_RES_BASE：类型/等别/规模/特征水位/库容/建设情况/建成时间（码表转中文；库容单位 10⁴m³） */
      metrics = [
        { label: '水库类型', value: hydroCodeLabel(RES_TYPE_OPTIONS, h.resType), kind: 'enum', order: 1 },
        { label: '工程等别', value: hydroCodeLabel(ENG_GRAD_OPTIONS, h.engGrad), kind: 'enum', order: 2 },
        { label: '工程规模', value: hydroCodeLabel(ENG_SCAL_OPTIONS, h.engScal), kind: 'enum', order: 3 },
        { label: '正常蓄水位', value: levM(h.normWatLev), kind: 'stat', order: 4 },
        { label: '死水位', value: levM(h.deadLev), kind: 'stat', order: 5 },
        { label: '总库容', value: cap104(h.totCap), kind: 'stat', order: 6 },
        { label: '调洪库容', value: cap104(h.storFlCap), kind: 'stat', order: 7 },
        { label: '工程建设情况', value: hydroCodeLabel(ENG_STAT_OPTIONS, h.engStat), kind: 'enum', order: 8 },
        { label: '建成时间', value: h.compDate?.trim() || '—', kind: 'time', order: 9 },
      ];
      mapFocus = focusWithHydroPoi(p, h.poiLong, h.poiLat);
      address = hydroLocationAddressLine(h.resLoc, mapFocus);
    }
  }

  if (p.pointType === '堤坝') {
    const row = leveeInitial.find(r => r.dkeCode === p.code);
    if (row) {
      mapFocus = focusWithHydroPoi(p, row.poiLong, row.poiLat);
      address = hydroLocationAddressLine(row.dkeLoc, mapFocus);
      /** ATT_DIKE_BASE + 扩展：等级/类型/长度/型式/建设情况/防洪（潮）标准（码表转中文） */
      metrics = sliceSix([
        { label: '堤防等级', value: hydroCodeLabel(DKE_GRAD_OPTIONS, row.dkeGrad), kind: 'enum', order: 1 },
        { label: '堤防类型', value: hydroCodeLabel(DIKE_TYPE_OPTIONS, row.dikeType), kind: 'enum', order: 2 },
        {
          label: '堤长',
          value: row.dkeLen != null && Number.isFinite(Number(row.dkeLen)) ? `${row.dkeLen} m` : '—',
          kind: 'stat',
          order: 3,
        },
        { label: '堤防形式', value: leveeDikePatternDisplay(row.dikePatt), kind: 'enum', order: 4 },
        { label: '工程建设情况', value: hydroCodeLabel(ENG_STAT_OPTIONS, row.engStat), kind: 'enum', order: 5 },
        { label: '防洪（潮）标准', value: row.defSta?.trim() || '—', kind: 'enum', order: 6 },
      ]);
    }
  }

  if (p.pointType === '闸坝') {
    const row = sluiceInitial.find(r => r.wagCode === p.code);
    if (row) {
      mapFocus = focusWithHydroPoi(p, row.poiLong, row.poiLat);
      address = hydroLocationAddressLine(row.wagLoc, mapFocus);
      /** ATT_WAGA_BASE：类型/等别/规模/主要建筑物级别/流量/孔数/建设情况/建成时间（与配置中心闸坝表单字段对齐） */
      metrics = [
        { label: '水闸类型', value: hydroCodeLabel(WAG_TYPE_OPTIONS, row.wagType), kind: 'enum', order: 1 },
        { label: '工程等别', value: hydroCodeLabel(ENG_GRAD_OPTIONS, row.engGrad), kind: 'enum', order: 2 },
        { label: '工程规模', value: hydroCodeLabel(ENG_SCAL_OPTIONS, row.engScal), kind: 'enum', order: 3 },
        {
          label: '主要建筑类别',
          value: hydroCodeLabel(MAIN_BUILD_GRAD_OPTIONS, row.mainBuildGrad),
          kind: 'enum',
          order: 4,
        },
        {
          label: '设计最大过闸流量',
          value: row.desLockDisc != null ? `${row.desLockDisc} m³/s` : '—',
          kind: 'stat',
          order: 5,
        },
        { label: '闸孔数量', value: row.gaorNum != null ? String(row.gaorNum) : '—', kind: 'stat', order: 6 },
        { label: '工程建设情况', value: hydroCodeLabel(ENG_STAT_OPTIONS, row.engStat), kind: 'enum', order: 7 },
        { label: '建成时间', value: row.compDate?.trim() || '—', kind: 'time', order: 8 },
      ];
    }
  }

  if (p.pointType === '水闸') {
    const row = waterGateInitial.find(r => r.wagCode === p.code);
    if (row) {
      mapFocus = focusWithHydroPoi(p, row.poiLong, row.poiLat);
      address = hydroLocationAddressLine(row.wagLoc, mapFocus);
      metrics = sliceSix([
        { label: '工程状态', value: p.status, kind: 'status' },
        { label: '水闸类型', value: row.wagType, kind: 'enum' },
        { label: '工程等别', value: row.engGrad, kind: 'enum' },
        { label: '水闸用途', value: row.wagUse?.trim() || '—', kind: 'enum' },
        { label: '设计最大过闸流量', value: row.desLockDisc != null ? `${row.desLockDisc} m³/s` : '—', kind: 'stat' },
        { label: '闸孔数量', value: row.gaorNum != null ? String(row.gaorNum) : '—', kind: 'stat' },
      ]);
    }
  }

  if (p.pointType === '堰堤') {
    const row = weirInitial.find(r => r.wfwCode === p.code);
    if (row) {
      mapFocus = focusWithHydroPoi(p, row.poiLong, row.poiLat);
      address = hydroLocationAddressLine(row.wfwLoc, mapFocus);
      /** 与产品稿一致：堰型→工程等别→工程规模→设计泄流→工程建设情况→净宽（order 固定展示序） */
      metrics = sliceSix([
        { label: '堰型', value: hydroCodeLabel(WFW_TYPE_OPTIONS, row.wfwType), kind: 'enum', order: 1 },
        { label: '工程等别', value: hydroCodeLabel(ENG_GRAD_OPTIONS, row.engGrad), kind: 'enum', order: 2 },
        { label: '工程规模', value: hydroCodeLabel(ENG_SCAL_OPTIONS, row.engScal), kind: 'enum', order: 3 },
        { label: '设计泄流', value: row.desFlow != null ? `${row.desFlow} m³/s` : '—', kind: 'stat', order: 4 },
        { label: '工程建设情况', value: hydroCodeLabel(ENG_STAT_OPTIONS, row.engStat), kind: 'enum', order: 5 },
        { label: '净宽', value: row.weirWidth != null ? `${row.weirWidth} m` : '—', kind: 'stat', order: 6 },
      ]);
    }
  }

  if (p.pointType === '圩区') {
    const row = polderInitial.find(r => r.plsCode === p.code);
    if (row) {
      mapFocus = focusWithHydroPoi(p, row.poiLong, row.poiLat);
      address = hydroLocationAddressLine(row.plsLoc, mapFocus);
      /** 圩垸分类、平垸性质走 SL/T 809 码表中文；防洪（潮）标准用台账扩展字段 `protectStd` */
      metrics = sliceSix([
        { label: '圩垸分类', value: hydroCodeLabel(POLD_CLAS_OPTIONS, row.poldClas), kind: 'enum', order: 1 },
        { label: '平垸性质', value: hydroCodeLabel(POLD_PROP_OPTIONS, row.poldProp), kind: 'enum', order: 2 },
        { label: '圩区面积', value: row.polderArea != null ? `${row.polderArea} km²` : '—', kind: 'stat', order: 3 },
        { label: '设计排涝流量', value: row.desFlFlow != null ? `${row.desFlFlow} m³/s` : '—', kind: 'stat', order: 4 },
        { label: '防洪（潮）标准', value: row.protectStd?.trim() || '—', kind: 'enum', order: 5 },
      ]);
    }
  }

  if (p.pointType === '山塘') {
    const row = hillpondInitial.find(r => r.stuCode === p.code);
    if (row) {
      mapFocus = focusWithHydroPoi(p, row.poiLong, row.poiLat);
      address = hydroLocationAddressLine(row.stuLoc, mapFocus);
      /** 塘坝规模→集雨面积→正常水位→总容积→工程建设情况→建成时间（order 固定展示序） */
      metrics = sliceSix([
        { label: '塘坝规模', value: hydroCodeLabel(ENG_SCAL_OPTIONS, row.engScal), kind: 'enum', order: 1 },
        { label: '集雨面积', value: row.watShedArea != null ? `${row.watShedArea} km²` : '—', kind: 'stat', order: 2 },
        { label: '正常水位', value: row.normWatLev != null ? `${row.normWatLev} m` : '—', kind: 'stat', order: 3 },
        { label: '总容积', value: row.totVol != null ? `${row.totVol} 万m³` : '—', kind: 'stat', order: 4 },
        { label: '工程建设情况', value: hydroCodeLabel(ENG_STAT_OPTIONS, row.engStat), kind: 'enum', order: 5 },
        { label: '建成时间', value: row.compDate?.trim() || '—', kind: 'time', order: 6 },
      ]);
    }
  }

  if (p.pointType === '水质监测站') {
    subLine = `${p.name} · 最近数据时间 2025/10/10 11:50:00`;
  }

  const responsible = outletResponsiblePartyInitial.find(r => r.责任主体内码 === p.code);
  if (p.pointType === '责任主体' && responsible) {
    const firstOutletCode = responsible.关联排口编码列表?.[0];
    const outletRec = firstOutletCode
      ? outletData.find(o => o['入河入海排污口编码'] === String(firstOutletCode).trim())
      : undefined;
    tags = [statDrawerRegionTagLeaf(p.region)];
    tagTooltips = undefined;
    metrics = [
      { label: '责任主体类型', value: formatResponsiblePartyType(responsible.责任主体类型), kind: 'enum', order: 1 },
      { label: '统一社会信用代码', value: responsible.统一社会信用代码?.trim() || '—', kind: 'plain', order: 2 },
      { label: '法定代表人或负责人', value: responsible.法定代表人或负责人 || '—', kind: 'plain', order: 3 },
      { label: '是否为主要责任主体', value: responsible.是否为主要责任主体 || '—', kind: 'enum', order: 4 },
      {
        label: '责任期限',
        value: `${responsible.责任开始日期 || '—'} ～ ${responsible.责任结束日期?.trim() || '—'}`,
        kind: 'time',
        order: 5,
      },
    ];
    const addrBody = responsible.联系地址?.trim() || outletRec?.['入河入海排污口详细地址']?.trim();
    const coordTxt = `（${p.lng.toFixed(4)}°E，${p.lat.toFixed(4)}°N）`;
    address = addrBody ? `地址：${addrBody}${coordTxt}` : undefined;
    mapFocus = defaultPointFocus(p);
  }

  const peekPoi: ZhtStatDrawerPeekPoi = { kind: 'unified', unifiedId: p.id };
  const mapFocusWithPeek: ZhtStatDrawerMapFocus = { ...mapFocus, peekPoi };

  return {
    id: p.id,
    title: p.name,
    tags,
    ...(tagTooltips ? { tagTooltips } : {}),
    address,
    mapFocus: mapFocusWithPeek,
    subLine,
    metrics,
    statusBucket: statusToBucket(p.status),
  };
}

/** 项目档案台账卡片（与生态整治「项目管理 · 项目档案」同源） */
function projectArchiveToCard(row: EcoProjectArchiveRow): ZhtStatDrawerCard {
  const lng = Number.parseFloat(String(row.longitude ?? '').trim());
  const lat = Number.parseFloat(String(row.latitude ?? '').trim());
  const coord =
    Number.isFinite(lng) && Number.isFinite(lat)
      ? `（${lng.toFixed(4)}°E，${lat.toFixed(4)}°N）`
      : '';
  const loc = row.location?.trim();
  const region = formatShaoshanAdminDivisionDisplay(row.adminDivision);
  const address =
    loc && loc.length > 0
      ? `地址：${loc}${coord}`
      : region && region !== '—'
        ? `地址：${region}${coord}`
        : undefined;
  const mf = safePointMapFocus(lng, lat);
  const peekPoi: ZhtStatDrawerPeekPoi = { kind: 'unified', unifiedId: `zht-eco-proj-${row.key}` };
  const mapFocus =
    mf && Number.isFinite(lng) && Number.isFinite(lat) ? { ...mf, peekPoi } : mf;
  const leafRegion = shaoshanAdminDivisionLeafLabel(row.adminDivision);
  return {
    id: `drawer-eco-proj-${row.key}`,
    title: row.name,
    tags: [leafRegion, row.type],
    address,
    mapFocus,
    metrics: [
      { label: '项目状态', value: row.status, kind: 'status', order: 1 },
      { label: '投资金额', value: `${row.investment} 万元`, kind: 'stat', order: 2 },
      { label: '项目类型', value: row.type, kind: 'enum', order: 3 },
      { label: '完成进度', value: `${row.progress}%`, kind: 'stat', order: 4 },
      { label: '计划开始日期', value: row.startDate, kind: 'time', order: 5 },
      { label: '计划结束日期', value: row.endDate, kind: 'time', order: 6 },
    ],
    statusBucket: statusToBucket(row.status),
  };
}

/** 责任河段抽屉指标（左侧「河流」与地图统一点位「责任河段」共用） */
function riverSectionDrawerMetrics(row: (typeof initialRiverSectionData)[0]): ZhtStatDrawerMetric[] {
  const chiefSummary =
    [row.chiefName?.trim(), row.chiefMobile?.trim()].filter(Boolean).join(' · ') || '—';
  return [
    { label: '所属水系', value: row.riverSystem, kind: 'enum', order: 1 },
    { label: '岸别', value: RIVER_SIDE_LABEL[row.riverSide], kind: 'enum', order: 2 },
    {
      label: '河段类型',
      value: SECTION_TYPE_LABEL[row.sectionType] ?? String(row.sectionType),
      kind: 'enum',
      order: 3,
    },
    { label: '管理级别', value: ADMIN_LEVEL_LABEL[row.adminLevel], kind: 'enum', order: 4 },
    { label: '河长汇总', value: chiefSummary, kind: 'enum', order: 5 },
    { label: '汇水面积', value: `${row.basinAreaKm2} km²`, kind: 'stat', order: 6 },
  ];
}

/** 河段台账卡片：线段中点与统一点位 `zht-river-sec-${key}` 一致，整卡可开详情 */
function riverSectionToCard(row: (typeof initialRiverSectionData)[0]): ZhtStatDrawerCard {
  const lng = (row.startLgtd + row.endLgtd) / 2;
  const lat = (row.startLttd + row.endLttd) / 2;
  const unifiedId = `zht-river-sec-${row.key}`;
  const mapFocus: ZhtStatDrawerMapFocus = {
    kind: 'point',
    lng,
    lat,
    peekPoi: { kind: 'unified', unifiedId },
  };
  return {
    id: `drawer-riv-${row.key}`,
    title: row.sectionName,
    tags: [addvcdToRegion(row.addvcd), SECTION_TYPE_LABEL[row.sectionType]],
    metrics: riverSectionDrawerMetrics(row),
    statusBucket: 'online',
    mapFocus,
  };
}

function riverCrossTypeLabel(code: string | undefined): string {
  const map: Record<string, string> = {
    '0': '内流河',
    '1': '跨国河',
    '2': '跨省河',
    '3': '跨省河',
    '4': '跨市河',
    '5': '跨县河',
    '6': '本地河',
  };
  const k = String(code ?? '').trim();
  if (!k) return '—';
  return map[k] ? `${k} ${map[k]}` : k;
}

function riverGradLabel(code: string | undefined): string {
  const map: Record<string, string> = {
    '0': '干流',
    '1': '一级支流',
    '2': '二级支流',
    '3': '三级支流',
  };
  const k = String(code ?? '').trim();
  if (!k) return '—';
  return map[k] ? `${k} ${map[k]}` : k;
}

function riverTypeLabel(code: string | undefined): string {
  const map: Record<string, string> = {
    '1': '自然流域',
    '2': '人工河道',
  };
  const k = String(code ?? '').trim();
  if (!k) return '—';
  return map[k] ? `${k} ${map[k]}` : k;
}

function riverMasterToCard(row: RiverChannelMasterRow): ZhtStatDrawerCard {
  const centerLng = (Number(row.rvSourLong) + Number(row.rvMouLong)) / 2;
  const centerLat = (Number(row.rvSourLat) + Number(row.rvMouLat)) / 2;
  const mapFocus = safePointMapFocus(centerLng, centerLat);
  return {
    id: `drawer-river-master-${row.key}`,
    title: row.riverName,
    tags: [row.riverSystem?.trim() || '河流水系', '河流'],
    address: `地址：${row.rvSourLoc?.trim() || '—'} 至 ${row.rvMouLoc?.trim() || '—'}`,
    mapFocus,
    metrics: [
      { label: '河流代码', value: row.riverObjectId, kind: 'plain', order: 1 },
      { label: '跨界类型', value: riverCrossTypeLabel(row.crOverType), kind: 'enum', order: 2 },
      { label: '河流类型', value: riverTypeLabel(row.rvType), kind: 'enum', order: 3 },
      { label: '河流级别', value: riverGradLabel(row.rvGrad), kind: 'enum', order: 4 },
      { label: '河长', value: `${row.rvLen ?? '—'} 千米`, kind: 'stat', order: 5 },
      { label: '集水面积', value: `${row.rvBasArea ?? '—'} 平方千米`, kind: 'stat', order: 6 },
    ],
    statusBucket: 'online',
    poiClick: { type: 'riverChannel', riverObjectId: row.riverObjectId },
  };
}

/** 河长通讯录（河长角色）：无地址行；指标仅展示级别、职务、手机 */
function riverChiefContactToCard(c: RiverChiefContactRow): ZhtStatDrawerCard {
  const levelLabel =
    c.userType != null ? (USER_TYPE_LABEL[c.userType] ?? '—') : '—';
  return {
    id: `drawer-chief-${c.id}`,
    title: c.name,
    tags: [c.areaName, CONTACT_ROLE_LABEL[c.roleCategory]],
    metrics: [
      { label: '河长级别', value: levelLabel, kind: 'enum', order: 1 },
      { label: '职务', value: c.title?.trim() || '—', kind: 'enum', order: 2 },
      { label: '手机', value: c.mobile?.trim() || '—', kind: 'plain', order: 3 },
    ],
    statusBucket: 'online',
    poiClick: { type: 'riverChiefContact', contactId: c.id },
  };
}

/** 河湖管护事务卡片（与生态整治「河湖长制 · 事务列表」`initialRiverGuardAffairs` 同源） */
function riverGuardAffairToCard(aff: (typeof initialRiverGuardAffairs)[0]): ZhtStatDrawerCard {
  const lng = Number.parseFloat(String(aff.longitude ?? '').trim());
  const lat = Number.parseFloat(String(aff.latitude ?? '').trim());
  const coord =
    Number.isFinite(lng) && Number.isFinite(lat)
      ? `（${lng.toFixed(4)}°E，${lat.toFixed(4)}°N）`
      : '';
  const loc = aff.location?.trim();
  const region = aff.addvcd?.trim() ? getShaoshanAddvcdLabel(aff.addvcd) : aff.regionName?.trim() || '—';
  const address =
    loc && loc.length > 0
      ? `地址：${loc}${coord}`
      : region && region !== '—'
        ? `地址：${region}${coord}`
        : undefined;
  const mf = safePointMapFocus(lng, lat);
  const peekPoi: ZhtStatDrawerPeekPoi = { kind: 'unified', unifiedId: `zht-eco-affair-${aff.key}` };
  const mapFocus =
    mf && Number.isFinite(lng) && Number.isFinite(lat) ? { ...mf, peekPoi } : mf;
  return {
    id: `drawer-aff-${aff.key}`,
    title: aff.affairTitle,
    tags: [region, aff.problemType],
    address,
    mapFocus,
    metrics: sliceSix([
      { label: '问题类型', value: aff.problemType?.trim() || '—', kind: 'enum', order: 1 },
      { label: '信息来源', value: aff.infoSource?.trim() || '—', kind: 'enum', order: 2 },
      { label: '严重程度', value: aff.severity?.trim() || '—', kind: 'enum', order: 3 },
      { label: '上报人', value: aff.reporterName?.trim() || '—', kind: 'plain', order: 4 },
      { label: '上报时间', value: aff.reportTime?.trim() || '—', kind: 'time', order: 5 },
      { label: '处置状态', value: aff.handleStatus?.trim() || '—', kind: 'status', order: 6 },
    ]),
    statusBucket: statusToBucket(aff.handleStatus),
  };
}

function addvcdToRegion(addvcd: string): string {
  if (addvcd.startsWith('430382')) return '韶山市';
  if (addvcd.startsWith('430104')) return '岳麓区';
  if (addvcd.startsWith('430181')) return '浏阳市';
  if (addvcd.startsWith('430121')) return '长沙县';
  if (addvcd.startsWith('430112')) return '望城区';
  if (addvcd.startsWith('430100')) return '长沙市';
  return '其它区域';
}

function lakeToCard(lake: (typeof initialLakeWaterBodyData)[0]): ZhtStatDrawerCard {
  const vol =
    lake.storage10kM3 != null && Number.isFinite(Number(lake.storage10kM3))
      ? `${lake.storage10kM3} 万m³`
      : '—';
  const mf = safePointMapFocus(lake.poiLong, lake.poiLat);
  const peekPoi: ZhtStatDrawerPeekPoi = { kind: 'unified', unifiedId: `zht-eco-lake-${lake.key}` };
  const mapFocus =
    mf && lake.poiLong != null && lake.poiLat != null && Number.isFinite(Number(lake.poiLong)) && Number.isFinite(Number(lake.poiLat))
      ? { ...mf, peekPoi }
      : mf;
  return {
    id: `drawer-lake-${lake.key}`,
    title: lake.lakeName,
    tags: [addvcdToRegion(lake.addvcd), lake.lakeCategory],
    address: `地址：${lake.lkLoc?.trim() || lake.regionName}（水体编码 ${lake.lakeObjectId}）`,
    mapFocus,
    metrics: sliceSix([
      { label: '湖泊级别', value: hydroCodeLabel(LAKE_LK_RANK_OPTIONS, lake.lkRank), kind: 'enum', order: 1 },
      { label: '咸淡水属性', value: hydroCodeLabel(LAKE_SAL_FRE_WAT_OPTIONS, lake.salFreWat), kind: 'enum', order: 2 },
      {
        label: '平均水深',
        value: lake.avgDepthM != null && Number.isFinite(Number(lake.avgDepthM)) ? `${lake.avgDepthM} m` : '—',
        kind: 'stat',
        order: 3,
      },
      {
        label: '最大水深',
        value: lake.maxDepthM != null && Number.isFinite(Number(lake.maxDepthM)) ? `${lake.maxDepthM} m` : '—',
        kind: 'stat',
        order: 4,
      },
      { label: '水面面积', value: `${lake.surfaceAreaKm2} km²`, kind: 'stat', order: 5 },
      { label: '湖泊容积', value: vol, kind: 'stat', order: 6 },
    ]),
    statusBucket: 'online',
  };
}

function emergencyEventCardFromUnified(p: ZhtUnifiedSearchPoint): ZhtStatDrawerCard {
  const demo = getZhtUnifiedEmergencyDemoEvent(p.id);
  const regionTag = (demo?.region ?? p.region)?.trim() || '韶山市';
  const reportTime = demo?.reportTime?.trim() || '—';
  return {
    id: p.id,
    title: p.name,
    /** 仅所属区域；类型由左侧「应急事件」入口表达 */
    tags: [regionTag],
    address: `地址：${demo?.region ?? p.region}（${p.lng.toFixed(4)}°E，${p.lat.toFixed(4)}°N）`,
    mapFocus: {
      kind: 'point',
      lng: p.lng,
      lat: p.lat,
      peekPoi: { kind: 'unified', unifiedId: p.id },
    },
    subLine: `上报时间 ${reportTime}`,
    /** 副行已展示上报时间，指标区不再重复 */
    metrics: [
      { label: '问题类型', value: demo?.problemType?.trim() || '—', kind: 'enum', order: 1 },
      { label: '信息来源', value: '应急协同演示库', kind: 'enum', order: 2 },
      { label: '污染等级', value: demo?.pollutionLevel?.trim() || '—', kind: 'enum', order: 3 },
      { label: '预警级别', value: demo?.alertLevel?.trim() || '—', kind: 'enum', order: 4 },
      { label: '上报人', value: demo?.reporterName?.trim() || '—', kind: 'plain', order: 5 },
      { label: '处置状态', value: p.status, kind: 'status', order: 6 },
    ],
    statusBucket: statusToBucket(p.status),
  };
}

/** 按左侧指标项拉取卡片列表（与四大模块演示数据对齐） */
export function getZhtLeftStatDrawerCards(itemLabel: string): ZhtStatDrawerCard[] {
  const unified = getZhtUnifiedSearchPointsCached();

  const byTypes = (...types: string[]) =>
    unified.filter(p => types.includes(p.pointType)).map(unifiedPointToCard);

  let cards: ZhtStatDrawerCard[] = [];
  switch (itemLabel) {
    case '泵站':
      cards = byTypes('泵站');
      break;
    case '排口':
      cards = byTypes('排口');
      break;
    case '责任主体':
      cards = byTypes('责任主体');
      break;
    case '污水厂':
      cards = byTypes('污水厂');
      break;
    case '排水户':
      cards = byTypes('排水户');
      break;
    case '项目':
      cards = initialEcoProjectArchiveData.map(projectArchiveToCard);
      break;
    case '河流':
      cards = initialRiverChannelMasterData.map(riverMasterToCard);
      break;
    case '湖泊':
      cards = initialLakeWaterBodyData.map(lakeToCard);
      break;
    case '河长':
      cards = initialRiverChiefContacts.filter(c => c.roleCategory === 'chief').map(riverChiefContactToCard);
      break;
    case '事务':
      cards = initialRiverGuardAffairs.map(riverGuardAffairToCard);
      break;
    case '闸坝':
      cards = byTypes('闸坝');
      break;
    case '堤防':
      cards = byTypes('堤坝');
      break;
    case '水库':
      cards = byTypes('水库');
      break;
    case '水闸':
      cards = byTypes('水闸');
      break;
    case '圩区':
      cards = byTypes('圩区');
      break;
    case '堰坝':
      cards = byTypes('堰堤');
      break;
    case '山塘':
      cards = byTypes('山塘');
      break;
    case '风险源企业':
      cards = initialRiskData.enterprises.map(e => {
        const mf = safePointMapFocus(e.longitude, e.latitude);
        const lng = mf?.kind === 'point' ? mf.lng : NaN;
        const lat = mf?.kind === 'point' ? mf.lat : NaN;
        /** 与 `zhtSearchUnifiedData` 中风险源统一点位 id 一致 */
        const unifiedId = `zht-emg-ent-${e.id}`;
        const mapFocus =
          mf && Number.isFinite(lng) && Number.isFinite(lat)
            ? { ...mf, peekPoi: { kind: 'unified' as const, unifiedId } }
            : mf;
        return {
          id: `drawer-ent-${e.id}`,
          title: e.enterpriseName,
          /** 仅展示所属区域（行业类型改到下方指标「行业类型」） */
          tags: [e.region?.trim() || '韶山市'],
          address: e.address?.trim() ? `地址：${e.address.trim()}` : undefined,
          mapFocus,
          metrics: sliceSix([
            { label: '风险等级', value: e.riskLevel, kind: 'status' },
            { label: '主要污染物', value: e.mainPollutants, kind: 'enum' },
            { label: '排放规模', value: e.dischargeScale, kind: 'stat' },
            { label: '行业类型', value: e.industryType?.trim() || '—', kind: 'enum' },
            { label: '联系人', value: e.contactName },
            { label: '联系电话', value: e.contactPhone },
          ]),
          statusBucket: e.riskLevel.includes('高') ? 'alarm' : 'neutral',
        };
      });
      break;
    case '社会物资点':
      cards = initialRiskData.socialPoints.map(s => {
        const mf = safePointMapFocus(s.longitude, s.latitude);
        const lng = mf?.kind === 'point' ? mf.lng : NaN;
        const lat = mf?.kind === 'point' ? mf.lat : NaN;
        /** 与 `zhtSearchUnifiedData` 中社会物资统一点位 id 一致，供 peek / 整卡打开详情 */
        const unifiedId = `zht-emg-supply-${s.id}`;
        const mapFocus =
          mf && Number.isFinite(lng) && Number.isFinite(lat)
            ? { ...mf, peekPoi: { kind: 'unified' as const, unifiedId } }
            : mf;
        return {
          id: `drawer-sp-${s.id}`,
          title: s.name,
          /** 仅所属区域；类型由左侧「社会物资点」入口已表达 */
          tags: [s.region?.trim() || '韶山市'],
          address: s.address?.trim() ? `地址：${s.address.trim()}` : undefined,
          mapFocus,
          /** 卡片仅标题 + 标签 + 地址；指标区去掉（不在此重复区划/经纬度/电话等） */
          metrics: [],
          statusBucket: 'online' as const,
        };
      });
      break;
    case '应急物资':
      cards = initialRiskData.supplies.map(s => ({
        id: `drawer-sup-${s.id}`,
        title: s.name,
        /** 仅区域；物资大类在下方「物资类型」指标展示 */
        tags: ['韶山市'],
        address: undefined,
        /** 与 `emgCoordReadonlyMapDetails` 中单条应急物资只读体同源 */
        poiClick: { type: 'emergencySupply' as const, id: s.id },
        metrics: sliceSix([
          { label: '物资类型', value: s.materialType, kind: 'enum', order: 1 },
          { label: '储备数量', value: String(s.quantity), kind: 'stat', order: 2 },
          { label: '管理责任人', value: s.manager?.trim() || '—', kind: 'plain', order: 3 },
          { label: '所属单位', value: s.affiliatedUnit?.trim() || '—', kind: 'plain', order: 4 },
          { label: '品牌', value: s.brand?.trim() || '—', kind: 'enum', order: 5 },
          { label: '单价', value: Number.isFinite(s.unitPrice) ? `¥${s.unitPrice.toFixed(2)}` : '—', kind: 'stat', order: 6 },
        ]),
        statusBucket: 'neutral',
      }));
      break;
    case '应急预案':
      cards = initialRiskData.plans.map(p => ({
        id: `drawer-plan-${p.id}`,
        title: p.name,
        /** 仅区域；预案类型在下方指标展示 */
        tags: ['韶山市'],
        /** 预案无地理地址，不展示地址行 */
        address: undefined,
        poiClick: { type: 'emergencyPlan' as const, id: p.id },
        metrics: sliceSix([
          { label: '预案类型', value: p.planType, kind: 'enum', order: 1 },
          { label: '发布时间', value: p.publishTime, kind: 'time', order: 2 },
          { label: '编制单位', value: p.compileOrg?.trim() || '—', kind: 'enum', order: 3 },
        ]),
        statusBucket: 'neutral',
      }));
      break;
    case '应急队伍':
      cards = initialRiskData.teams.map(t => {
        const regionFull = t.region?.trim() || '韶山市';
        const regionLeaf = statDrawerRegionTagLeaf(regionFull);
        const addrText = t.teamAddress?.trim();
        const mf = safePointMapFocus(t.longitude, t.latitude);
        const lng = mf?.kind === 'point' ? mf.lng : NaN;
        const lat = mf?.kind === 'point' ? mf.lat : NaN;
        const coord =
          Number.isFinite(lng) && Number.isFinite(lat)
            ? `（${lng.toFixed(4)}°E，${lat.toFixed(4)}°N）`
            : '';
        const address =
          addrText && addrText.length > 0 ? `地址：${addrText}${coord}` : undefined;
        const mapFocus =
          mf && Number.isFinite(lng) && Number.isFinite(lat)
            ? { ...mf, peekPoi: { kind: 'unified' as const, unifiedId: `zht-emg-team-${t.id}` } }
            : undefined;
        return {
          id: `drawer-team-${t.id}`,
          title: t.name,
          tags: [regionLeaf],
          tagTooltips: regionLeaf !== regionFull ? [regionFull] : undefined,
          address,
          mapFocus,
          metrics: sliceSix([
            { label: '队伍人数', value: String(t.members?.length ?? 0), kind: 'stat', order: 1 },
            { label: '队伍负责人', value: t.leaderName?.trim() || '—', kind: 'plain', order: 2 },
            { label: '联络方式', value: t.contactPhone?.trim() || '—', kind: 'stat', order: 3 },
          ]),
          statusBucket: 'online' as const,
        };
      });
      break;
    case '应急专家':
      cards = initialRiskData.experts.map(ex => ({
        id: `drawer-ex-${ex.id}`,
        title: ex.name,
        /** 筛选仍用区划；电话在姓名行右侧展示 */
        tags: ['韶山市'],
        address: undefined,
        poiClick: { type: 'emergencyExpert' as const, id: ex.id },
        metrics: [],
        expertPerson: {
          avatarUrl: ex.avatarUrl?.trim() || undefined,
          accentTag: ex.title?.trim() || '应急专家',
          phone: ex.phone?.trim() || '—',
        },
        detailRows: [{ label: '擅长方向', value: ex.expertise?.trim() || '—' }],
        statusBucket: 'neutral',
      }));
      break;
    case '应急事件':
      cards = unified.filter(p => p.pointType === '应急事件').map(emergencyEventCardFromUnified);
      break;
    case '污染源':
      cards = pollutionSourceDrawerCards();
      break;
    default:
      cards = [];
  }
  return cards.map(finalizeDrawerCard);
}

/** 污染源卡片：乡镇/区县等区域展示（与台账字段一致） */
function pollutionRegionTag(pt: ZhtPollutionMapPoint): string {
  if (pt.kind === 'rural_sewage') {
    const tw = pt.record.township?.trim();
    if (tw) return tw;
    const ad = pt.record.admDivCode?.trim();
    return ad ? addvcdToRegion(ad) : '其它区域';
  }
  if (pt.kind === 'agri_rural') {
    const ad = pt.record.admDivCode?.trim();
    return ad ? addvcdToRegion(ad) : '其它区域';
  }
  const tw = pt.record.township?.trim();
  if (tw) return tw;
  const ad = pt.record.admDivCode?.trim();
  return ad ? addvcdToRegion(ad) : '其它区域';
}

/** 配置中心「污染源信息」三类台账合并；卡片为名称 + 区域/大类标签 + 地址（与地图同源坐标） */
function pollutionDrawerAddress(pt: ZhtPollutionMapPoint): string | undefined {
  if (pt.kind === 'rural_sewage') {
    const a = pt.record.streetAddr?.trim();
    return a ? `地址：${a}` : undefined;
  }
  if (pt.kind === 'agri_rural') {
    const a = pt.record.address?.trim();
    return a ? `地址：${a}` : undefined;
  }
  const a = pt.record.streetAddr?.trim();
  return a ? `地址：${a}` : undefined;
}

function pollutionSourceDrawerCards(): ZhtStatDrawerCard[] {
  return getAllPollutionMapPoints().map(pt => {
    const mf = safePointMapFocus(pt.lng, pt.lat);
    const lng = mf?.kind === 'point' ? mf.lng : NaN;
    const lat = mf?.kind === 'point' ? mf.lat : NaN;
    const peekPoi: ZhtStatDrawerPeekPoi = {
      kind: 'pollution',
      pollutionKind: pt.kind,
      pollutionId: pt.id,
    };
    const mapFocus =
      mf && Number.isFinite(lng) && Number.isFinite(lat) ? { ...mf, peekPoi } : mf;
    return {
      id: `drawer-poll-${pt.kind}-${pt.id}`,
      title: pt.name,
      tags: [pollutionRegionTag(pt), ZHT_POLLUTION_KIND_LABEL[pt.kind]],
      address: pollutionDrawerAddress(pt),
      mapFocus,
      poiClick: { type: 'pollution', kind: pt.kind, id: pt.id },
      metrics: [],
      statusBucket: 'neutral' as const,
    };
  });
}

export function aggregateDrawerStatusBar(cards: ZhtStatDrawerCard[]): {
  online: number;
  offline: number;
  alarm: number;
} {
  let online = 0;
  let offline = 0;
  let alarm = 0;
  for (const c of cards) {
    if (c.statusBucket === 'alarm') alarm += 1;
    else if (c.statusBucket === 'offline') offline += 1;
    else if (c.statusBucket === 'online') online += 1;
    else {
      online += 1;
    }
  }
  if (cards.length === 0) return { online: 0, offline: 0, alarm: 0 };
  return { online, offline, alarm };
}
