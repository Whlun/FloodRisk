/**
 * 综合态势 · 地图「搜索」统一点位数据集
 * 聚合：设施管理、生态整治、应急协同、系统管理 四个原型中的演示数据（与各自源表字段语义一致，不接后端）。
 */
import {
  pumpStationData,
  outletData,
  plantData,
  formatOutletApprovalReg,
  pustEngStatLabel,
} from '../韶山水环境设施管理系统/facility-points-data';
import { dischargerDemoData, dischargerLabelYesNo } from '../韶山水环境设施管理系统/facility-discharger-data';
import {
  formatResponsiblePartyType,
  getResponsiblePartyContactMapCoords,
  outletResponsiblePartyInitial,
} from '../韶山水环境设施管理系统/facility-outlet-responsible-data';
import {
  formatShaoshanAdminDivisionDisplay,
  initialLakeWaterBodyData,
  initialRiverGuardAffairs,
  initialRiverSectionData,
} from '../生态整治/riverChiefDb4401';
import { initialEcoProjectArchiveData } from '../生态整治/eco-project-archive-demo';
import { initialRiskData } from '../应急协同/riskIdentification';
import {
  hillpondInitial,
  hydroInitial,
  leveeInitial,
  polderInitial,
  sluiceInitial,
  waterGateInitial,
  weirInitial,
} from '../韶山水环境系统管理/config-center-data';
import {
  ZHT_MONITORING_POI_DEMO,
  deriveMonitoringPoiDisplayState,
  getMonitoringMapIotOverridesSnapshot,
  mergeMonitoringPoiDemoWithIotOverrides,
} from './zhtPoiMonitoringDemo';

/** 来源项目（与产品口径一致） */
export type ZhtSearchSourceProject = '设施管理' | '生态整治' | '应急协同' | '系统管理';

/** 统一查询/导出用的一条「点位」 */
export interface ZhtUnifiedSearchPoint {
  /** 全局唯一键（跨项目拼接） */
  id: string;
  /** 业务主键或编码（与源台账一致时可反查） */
  code: string;
  name: string;
  /** 设施类型 / 业务类型（下拉筛选用） */
  pointType: string;
  status: string;
  region: string;
  /** 与源台账一致的具体地址，供结果卡片等；缺省由界面用区划+名称回退 */
  address?: string;
  lng: number;
  lat: number;
  sourceProject: ZhtSearchSourceProject;
}

/** 与应急协同原型 `initialEmergencyEvents` 前两条一致（避免整包引入 index.tsx） */
const EMERGENCY_DEMO_EVENTS = [
  {
    id: 'evt-1',
    eventCode: '水应〔2025〕0312-01',
    eventTitle: '湘江湘潭段不明油污带漂移',
    addvcd: '430382100000',
    region: '清溪镇',
    longitude: '112.942000',
    latitude: '27.831000',
    disposalStatus: '现场处置',
    /** 抽屉卡片等指标用（演示字段） */
    problemType: '水上漂移油污',
    pollutionLevel: '一般',
    alertLevel: 'Ⅲ级',
    reporterName: '李某',
    reportTime: '2025-10-10 09:20:00',
  },
  {
    id: 'evt-2',
    eventCode: '水应〔2025〕0128-02',
    eventTitle: '韶山河流域暴雨后面源高浊度冲击',
    addvcd: '430382101000',
    region: '银田镇',
    longitude: '112.526000',
    latitude: '27.915000',
    disposalStatus: '后期跟踪',
    problemType: '面源高浊度',
    pollutionLevel: '较重',
    alertLevel: 'Ⅱ级',
    reporterName: '王某',
    reportTime: '2025-09-28 14:05:00',
  },
] as const;

function inferOutletRegion(r: (typeof outletData)[0]): string {
  const reg = r['所在行政区域']?.trim();
  if (reg) return reg;
  if (r['入河入海排污口名称']?.includes('韶河')) return '湖南省湘潭市韶山市韶山乡';
  return '湖南省湘潭市韶山市高新区';
}

function normalizePumpStatus(s: string): string {
  const t = pustEngStatLabel(s);
  return t === '—' ? s : t;
}

function normalizePlantStatus(s: string | undefined): string {
  if (s === '1') return '运行';
  const t = (s ?? '').trim();
  return t !== '' ? t : '—';
}

/** 排口：审批登记备案情况（表 A.1）→ 搜索列表展示文案 */
function normalizeOutletStatus(s: string | number | undefined): string {
  return formatOutletApprovalReg(s);
}

function addvcdToRegionLabel(addvcd: string): string {
  if (addvcd.startsWith('430382')) return '韶山市';
  if (addvcd.startsWith('430104')) return '岳麓区';
  if (addvcd.startsWith('430181')) return '浏阳市';
  if (addvcd.startsWith('430121')) return '长沙县';
  if (addvcd.startsWith('430112')) return '望城区';
  return '其它行政区';
}

/** 线段中点（堤防、水闸/闸坝轴线等） */
function segmentMidLngLat(
  aLng: number | null | undefined,
  aLat: number | null | undefined,
  bLng: number | null | undefined,
  bLat: number | null | undefined,
): [number, number] | null {
  if (aLng == null || aLat == null || bLng == null || bLat == null) return null;
  if (![aLng, aLat, bLng, bLat].every(Number.isFinite)) return null;
  return [(aLng + bLng) / 2, (aLat + bLat) / 2];
}

/** 矩形范围中心（水库、圩区、山塘等 bbox） */
function rectCenterLngLat(
  llLng: number | null | undefined,
  llLat: number | null | undefined,
  urLng: number | null | undefined,
  urLat: number | null | undefined,
): [number, number] | null {
  if (llLng == null || llLat == null || urLng == null || urLat == null) return null;
  if (![llLng, llLat, urLng, urLat].every(Number.isFinite)) return null;
  return [(llLng + urLng) / 2, (llLat + urLat) / 2];
}

/** 配置中心水利工程 engStat 码值 → 展示文案 */
function hydroEngStatLabel(engStat: string): string {
  if (engStat === '1') return '在用';
  if (engStat === '0') return '在建';
  return engStat ? `状态码 ${engStat}` : '—';
}

/** 构建全量演示点位（模块级单例，供条件/空间查询共用） */
export function getZhtUnifiedSearchPoints(): ZhtUnifiedSearchPoint[] {
  const out: ZhtUnifiedSearchPoint[] = [];

  for (const r of pumpStationData) {
    out.push({
      id: `zht-fac-pump-${r.id}`,
      code: r.id,
      name: r.pustName,
      pointType: '泵站',
      status: normalizePumpStatus(r.engStat),
      region: r.region ?? '',
      address: r.pustLoc?.trim() || undefined,
      lng: r.x,
      lat: r.y,
      sourceProject: '设施管理',
    });
  }
  for (const r of outletData) {
    out.push({
      id: `zht-fac-outlet-${r['入河入海排污口编码']}`,
      code: r['入河入海排污口编码'],
      name: r['入河入海排污口名称'],
      pointType: '排口',
      status: normalizeOutletStatus(r['审批登记备案情况']),
      region: inferOutletRegion(r),
      address: r['入河入海排污口详细地址']?.trim() || undefined,
      lng: r['入河入海排污口经度'],
      lat: r['入河入海排污口纬度'],
      sourceProject: '设施管理',
    });
  }
  for (const r of plantData) {
    out.push({
      id: `zht-fac-plant-${r.id}`,
      code: r.id,
      name: r.name,
      pointType: '污水厂',
      status: normalizePlantStatus(r.status),
      region: r.region?.trim() || '—',
      address: r.addr?.trim() || undefined,
      lng: r.x,
      lat: r.y,
      sourceProject: '设施管理',
    });
  }
  for (const r of dischargerDemoData) {
    const lng = Number(r.coordX);
    const lat = Number(r.coordY);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    const keyYn = dischargerLabelYesNo(r.keyDischarger);
    out.push({
      id: `zht-fac-discharger-${r.id}`,
      code: r.id,
      name: r.dischargerName,
      pointType: '排水户',
      status: keyYn === '是' ? '重点排水户' : '一般排水户',
      region: r.manageCode?.trim() || '韶山市',
      address: r.addr?.trim() || undefined,
      lng,
      lat,
      sourceProject: '设施管理',
    });
  }

  /** 排口责任主体：地图落点为联系地址坐标（HJ 1314 表 A.2） */
  for (const r of outletResponsiblePartyInitial) {
    const firstCode = r.关联排口编码列表?.[0];
    const outlet = firstCode
      ? outletData.find(o => o['入河入海排污口编码'] === String(firstCode).trim())
      : undefined;
    const { lng, lat } = getResponsiblePartyContactMapCoords(r);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    out.push({
      id: `zht-outlet-responsible-${r.责任主体内码}`,
      code: r.责任主体内码,
      name: r.责任主体名称,
      pointType: '责任主体',
      status: formatResponsiblePartyType(r.责任主体类型),
      region: outlet ? inferOutletRegion(outlet) : '韶山市',
      address: r.联系地址?.trim() || outlet?.['入河入海排污口详细地址']?.trim() || undefined,
      lng,
      lat,
      sourceProject: '设施管理',
    });
  }

  /** 与地图监测 DOM 圆点同源（含物联关联覆盖，断面类监测站亦为 `zht-mon-*` 同一份演示数据） */
  for (const mon of ZHT_MONITORING_POI_DEMO) {
    const merged =
      mergeMonitoringPoiDemoWithIotOverrides(mon.id, getMonitoringMapIotOverridesSnapshot()) ?? mon;
    const ring = deriveMonitoringPoiDisplayState(merged);
    const statusLabel =
      ring === 'alarm' ? '报警' : ring === 'offline' ? '离线' : ring === 'online' ? '在线' : '信息点';
    out.push({
      id: `zht-mon-${mon.id}`,
      code: mon.id,
      name: mon.title,
      pointType: '水质监测站',
      status: statusLabel,
      region: '高新区',
      address: `湖南省湘潭市韶山市高新区 · ${mon.title}（自动监测站，演示）`,
      lng: mon.lng,
      lat: mon.lat,
      sourceProject: '设施管理',
    });
  }

  for (const row of initialRiverSectionData) {
    const lng = (row.startLgtd + row.endLgtd) / 2;
    const lat = (row.startLttd + row.endLttd) / 2;
    out.push({
      id: `zht-river-sec-${row.key}`,
      code: row.sectionId,
      name: row.sectionName,
      pointType: '责任河段',
      status: row.remarks?.trim() ? row.remarks : '在管',
      region: addvcdToRegionLabel(row.addvcd),
      address: `起点：${row.startAddr}；讫点：${row.endAddr}`,
      lng,
      lat,
      sourceProject: '生态整治',
    });
  }

  /** 项目档案（与 `生态整治/eco-project-archive-demo` 同源；id 前缀与「责任河段」「事务」区分） */
  for (const proj of initialEcoProjectArchiveData) {
    const lng = Number.parseFloat(String(proj.longitude ?? '').trim());
    const lat = Number.parseFloat(String(proj.latitude ?? '').trim());
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    out.push({
      id: `zht-eco-proj-${proj.key}`,
      code: proj.code,
      name: proj.name,
      pointType: '生态整治项目',
      status: proj.status,
      region: formatShaoshanAdminDivisionDisplay(proj.adminDivision),
      lng,
      lat,
      sourceProject: '生态整治',
    });
  }

  /** 河湖管护事务（与 `riverChiefDb4401.initialRiverGuardAffairs` 同源；id 前缀避免落入「责任河段」图层） */
  for (const aff of initialRiverGuardAffairs) {
    const lng = Number.parseFloat(String(aff.longitude ?? '').trim());
    const lat = Number.parseFloat(String(aff.latitude ?? '').trim());
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    out.push({
      id: `zht-eco-affair-${aff.key}`,
      code: aff.affairCode,
      name: aff.affairTitle,
      pointType: '河湖管护事务',
      status: aff.handleStatus,
      region: aff.regionName?.trim() || addvcdToRegionLabel(aff.addvcd),
      lng,
      lat,
      sourceProject: '生态整治',
    });
  }

  /** 湖泊信息 POI（与生态整治「河湖长制 · 湖泊信息」`initialLakeWaterBodyData` 同源） */
  for (const lk of initialLakeWaterBodyData) {
    const lng = Number(lk.poiLong);
    const lat = Number(lk.poiLat);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    out.push({
      id: `zht-eco-lake-${lk.key}`,
      code: lk.lakeObjectId,
      name: lk.lakeName,
      pointType: '湖泊',
      status: '在册',
      region: lk.regionName?.trim() || addvcdToRegionLabel(lk.addvcd),
      lng,
      lat,
      sourceProject: '生态整治',
    });
  }

  for (const e of EMERGENCY_DEMO_EVENTS) {
    const lng = Number.parseFloat(e.longitude);
    const lat = Number.parseFloat(e.latitude);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    out.push({
      id: `zht-emg-${e.id}`,
      code: e.eventCode,
      name: e.eventTitle,
      pointType: '应急事件',
      status: e.disposalStatus,
      region: e.region,
      lng,
      lat,
      sourceProject: '应急协同',
    });
  }

  /** 社会物资点（与 `riskIdentification.initialRiskData.socialPoints` 同源，须含有效经纬度） */
  for (const sp of initialRiskData.socialPoints) {
    const lng = Number.parseFloat(String(sp.longitude ?? '').trim());
    const lat = Number.parseFloat(String(sp.latitude ?? '').trim());
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    out.push({
      id: `zht-emg-supply-${sp.id}`,
      code: sp.id,
      name: sp.name,
      pointType: '社会物资',
      status: '在册',
      region: sp.region?.trim() || '—',
      lng,
      lat,
      sourceProject: '应急协同',
    });
  }

  /** 风险源企业（与 `initialRiskData.enterprises` 同源，须含有效经纬度） */
  for (const ent of initialRiskData.enterprises) {
    const lng = Number.parseFloat(String(ent.longitude ?? '').trim());
    const lat = Number.parseFloat(String(ent.latitude ?? '').trim());
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    out.push({
      id: `zht-emg-ent-${ent.id}`,
      code: ent.id,
      name: ent.enterpriseName,
      pointType: '风险源企业',
      status: ent.riskLevel?.trim() || '—',
      region: ent.region?.trim() || '—',
      lng,
      lat,
      sourceProject: '应急协同',
    });
  }

  /** 应急队伍（与 `initialRiskData.teams` 队伍地址、经纬度同源） */
  for (const tm of initialRiskData.teams) {
    const lng = Number.parseFloat(String(tm.longitude ?? '').trim());
    const lat = Number.parseFloat(String(tm.latitude ?? '').trim());
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    out.push({
      id: `zht-emg-team-${tm.id}`,
      code: tm.id,
      name: tm.name,
      pointType: '应急队伍',
      status: '在册',
      region: tm.region?.trim() || '韶山市',
      lng,
      lat,
      sourceProject: '应急协同',
    });
  }

  /** 系统管理 · 水利七类：与 `config-center-data` 各台账几何一致（不接后端） */
  for (const r of hydroInitial) {
    const mid = rectCenterLngLat(r.lowLeftLong, r.lowLeftLat, r.upRightLong, r.upRightLat);
    if (!mid) continue;
    const [lng, lat] = mid;
    out.push({
      id: `zht-sys-hydro-${r.id}`,
      code: r.resCode,
      name: r.resName,
      pointType: '水库',
      status: hydroEngStatLabel(r.engStat),
      region: '韶山市',
      lng,
      lat,
      sourceProject: '系统管理',
    });
  }
  for (const r of leveeInitial) {
    const mid = segmentMidLngLat(r.startLong, r.startLat, r.endLong, r.endLat);
    if (!mid) continue;
    const [lng, lat] = mid;
    out.push({
      id: `zht-sys-levee-${r.id}`,
      code: r.dkeCode,
      name: r.dkeName,
      pointType: '堤坝',
      status: hydroEngStatLabel(r.engStat),
      region: '韶山市',
      lng,
      lat,
      sourceProject: '系统管理',
    });
  }
  for (const r of sluiceInitial) {
    const mid = segmentMidLngLat(r.startLong, r.startLat, r.endLong, r.endLat);
    if (!mid) continue;
    const [lng, lat] = mid;
    out.push({
      id: `zht-sys-sluice-${r.id}`,
      code: r.wagCode,
      name: r.wagName,
      pointType: '闸坝',
      status: hydroEngStatLabel(r.engStat),
      region: '韶山市',
      lng,
      lat,
      sourceProject: '系统管理',
    });
  }
  for (const r of waterGateInitial) {
    const mid = segmentMidLngLat(r.startLong, r.startLat, r.endLong, r.endLat);
    if (!mid) continue;
    const [lng, lat] = mid;
    out.push({
      id: `zht-sys-watergate-${r.id}`,
      code: r.wagCode,
      name: r.wagName,
      pointType: '水闸',
      status: hydroEngStatLabel(r.engStat),
      region: '韶山市',
      lng,
      lat,
      sourceProject: '系统管理',
    });
  }
  for (const r of weirInitial) {
    if (r.lowLeftLong == null || r.lowLeftLat == null || !Number.isFinite(r.lowLeftLong) || !Number.isFinite(r.lowLeftLat))
      continue;
    out.push({
      id: `zht-sys-weir-${r.id}`,
      code: r.wfwCode,
      name: r.wfwName,
      pointType: '堰堤',
      status: hydroEngStatLabel(r.engStat),
      region: '韶山市',
      lng: r.lowLeftLong,
      lat: r.lowLeftLat,
      sourceProject: '系统管理',
    });
  }
  for (const r of polderInitial) {
    const mid = rectCenterLngLat(r.lowLeftLong, r.lowLeftLat, r.upRightLong, r.upRightLat);
    if (!mid) continue;
    const [lng, lat] = mid;
    out.push({
      id: `zht-sys-polder-${r.id}`,
      code: r.plsCode,
      name: r.plsName,
      pointType: '圩区',
      status: '在册',
      region: '韶山市',
      lng,
      lat,
      sourceProject: '系统管理',
    });
  }
  for (const r of hillpondInitial) {
    const mid = rectCenterLngLat(r.lowLeftLong, r.lowLeftLat, r.upRightLong, r.upRightLat);
    if (!mid) continue;
    const [lng, lat] = mid;
    out.push({
      id: `zht-sys-hillpond-${r.id}`,
      code: r.stuCode,
      name: r.stuName,
      pointType: '山塘',
      status: hydroEngStatLabel(r.engStat),
      region: '韶山市',
      lng,
      lat,
      sourceProject: '系统管理',
    });
  }

  return out;
}

/** 与全量演示数据一致；每次调用重建（数据量小，避免 HMR 后旧缓存缺监测站等项） */
export function getZhtUnifiedSearchPointsCached(): ZhtUnifiedSearchPoint[] {
  return getZhtUnifiedSearchPoints();
}

/** Haversine 球面距离（千米） */
export function haversineKm(aLng: number, aLat: number, bLng: number, bLat: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const h = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function pointInLngLatBbox(
  lng: number,
  lat: number,
  minLng: number,
  minLat: number,
  maxLng: number,
  maxLat: number,
): boolean {
  return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
}

/** 与地图设施 DOM 圆点 kind 一致（泵站 / 排口 / 污水厂 / 排水户） */
export type ZhtFacilityMapKind = 'pump' | 'outlet' | 'plant' | 'discharger';

/**
 * 解析统一点位 id 是否为「设施管理」地图台账点（与 `facility-points-data` 主键拼接规则一致）。
 * 例如 `zht-fac-pump-PS202604010001` → pump + PS202604010001。
 */
export function parseZhtFacilityUnifiedSearchId(
  unifiedId: string,
): { kind: ZhtFacilityMapKind; rawId: string } | null {
  const m = unifiedId.match(/^zht-fac-(pump|outlet|plant|discharger)-(.+)$/);
  if (!m) return null;
  return { kind: m[1] as ZhtFacilityMapKind, rawId: m[2] };
}

/** 与台账主键拼接为统一点位 id（与 `parseZhtFacilityUnifiedSearchId` 互逆） */
export function zhtFacilityUnifiedSearchId(kind: ZhtFacilityMapKind, rawId: string): string {
  return `zht-fac-${kind}-${rawId}`;
}

/** 监测站统一点位 id */
export function zhtMonitorUnifiedSearchId(rawMonId: string): string {
  return `zht-mon-${rawMonId}`;
}

/** 统一点位 id 是否为地图监测 DOM 圆点（`zht-mon-${ZHT_MONITORING_POI_DEMO.id}`） */
export function parseZhtMonitorUnifiedSearchId(unifiedId: string): { rawMonId: string } | null {
  const m = unifiedId.match(/^zht-mon-(.+)$/);
  if (!m) return null;
  return { rawMonId: m[1] };
}

/** 责任主体统一点位 id → 表 A.2 主键（与 `zht-outlet-responsible-${责任主体内码}` 互逆） */
export function parseZhtOutletResponsibleUnifiedSearchId(unifiedId: string): { rawInnerId: string } | null {
  const m = unifiedId.match(/^zht-outlet-responsible-(.+)$/);
  if (!m) return null;
  return { rawInnerId: m[1] };
}

/** 与 `zhtMaplibreBoard` 搜索命中 Marker 所用经纬度一致（统一点位与台账/监测源表可能略有差异） */
function findZhtSearchFacilityRecordMapCoord(kind: ZhtFacilityMapKind, id: string): Record<string, unknown> | null {
  if (kind === 'pump') return pumpStationData.find(r => r.id === id) ?? null;
  if (kind === 'outlet') return outletData.find(r => r['入河入海排污口编码'] === id) ?? null;
  if (kind === 'plant') return plantData.find(r => r.id === id) ?? null;
  const d = dischargerDemoData.find(r => r.id === id);
  return d ? (d as unknown as Record<string, unknown>) : null;
}

function zhtSearchFacilityLngLatFromRecord(
  kind: ZhtFacilityMapKind,
  rec: Record<string, unknown>,
): { lng: number; lat: number } | null {
  if (kind === 'discharger') {
    const lng = Number(rec.coordX);
    const lat = Number(rec.coordY);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    return { lng, lat };
  }
  if (kind === 'outlet') {
    const lng = Number(rec['入河入海排污口经度']);
    const lat = Number(rec['入河入海排污口纬度']);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    return { lng, lat };
  }
  const lng = Number(rec.x);
  const lat = Number(rec.y);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return { lng, lat };
}

/**
 * 地图实际绘制统一点位时采用的经纬度（与空间查询/测地圆判断须一致，否则会「结果在圈外」）。
 */
export function getZhtSearchPointMapCoordinate(pt: ZhtUnifiedSearchPoint): { lng: number; lat: number } {
  const facMeta = parseZhtFacilityUnifiedSearchId(pt.id);
  if (facMeta) {
    const rec = findZhtSearchFacilityRecordMapCoord(facMeta.kind, facMeta.rawId);
    if (rec) {
      const pos = zhtSearchFacilityLngLatFromRecord(facMeta.kind, rec);
      if (pos) return pos;
    }
  }
  const respMeta = parseZhtOutletResponsibleUnifiedSearchId(pt.id);
  if (respMeta) {
    const row = outletResponsiblePartyInitial.find(x => x.责任主体内码 === respMeta.rawInnerId);
    if (row) {
      const pos = getResponsiblePartyContactMapCoords(row);
      return pos;
    }
  }
  const monMeta = parseZhtMonitorUnifiedSearchId(pt.id);
  if (monMeta) {
    const mon = ZHT_MONITORING_POI_DEMO.find(m => m.id === monMeta.rawMonId);
    if (mon) return { lng: mon.lng, lat: mon.lat };
  }
  return { lng: pt.lng, lat: pt.lat };
}

/** 经度量化键（与空间过滤同源坐标，用于「同经线」聚类） */
function zhtSearchOverlayLngQuantKey(lng: number): number {
  return Math.round(lng * 1e5);
}

/**
 * 地图搜索/查询结果 Marker 的展示经纬度：先取 `getZhtSearchPointMapCoordinate`，
 * 再对演示数据中多条落在同一经线（经度量化相同、纬度不同）的项做东西向微错开，
 * 避免序号橙点叠成一条竖线；完全同坐标的多条则用小螺旋错开。
 */
export function zhtSearchOverlayMarkerLngLats(results: ZhtUnifiedSearchPoint[]): { lng: number; lat: number }[] {
  const bases = results.map(p => getZhtSearchPointMapCoordinate(p));
  const n = bases.length;
  if (n === 0) return [];
  const out = bases.map(b => ({ lng: b.lng, lat: b.lat }));
  const STEP_LNG = 0.00012; // 约 13m，仅用于视觉分离

  const byLngKey = new Map<number, number[]>();
  for (let i = 0; i < n; i += 1) {
    const k = zhtSearchOverlayLngQuantKey(bases[i]!.lng);
    if (!byLngKey.has(k)) byLngKey.set(k, []);
    byLngKey.get(k)!.push(i);
  }

  for (const grp of byLngKey.values()) {
    if (grp.length < 2) continue;
    const b0 = bases[grp[0]!]!;
    const allExactSame = grp.every(
      i =>
        zhtSearchOverlayLngQuantKey(bases[i]!.lng) === zhtSearchOverlayLngQuantKey(b0.lng) &&
        Math.round(bases[i]!.lat * 1e5) === Math.round(b0.lat * 1e5),
    );
    if (allExactSame) {
      grp.sort((a, b) => a - b);
      const m = grp.length;
      for (let j = 0; j < m; j += 1) {
        const idx = grp[j]!;
        const ang = ((j + 0.5) / m) * 2 * Math.PI;
        const r = STEP_LNG * 0.9;
        out[idx] = {
          lng: bases[idx]!.lng + Math.cos(ang) * r,
          lat: bases[idx]!.lat + Math.sin(ang) * r * 0.75,
        };
      }
    } else {
      grp.sort((a, b) => bases[a]!.lat - bases[b]!.lat || a - b);
      const m = grp.length;
      for (let j = 0; j < m; j += 1) {
        const idx = grp[j]!;
        out[idx] = {
          lng: bases[idx]!.lng + (j - (m - 1) / 2) * STEP_LNG,
          lat: bases[idx]!.lat,
        };
      }
    }
  }

  return out;
}

/** 统一点位 id 反查应急协同内联演示事件（详情弹窗台账反查用） */
export function getZhtUnifiedEmergencyDemoEvent(
  unifiedId: string,
): (typeof EMERGENCY_DEMO_EVENTS)[number] | null {
  return EMERGENCY_DEMO_EVENTS.find(e => unifiedId === `zht-emg-${e.id}`) ?? null;
}

/** 与左侧指标区各段标题对应，用于搜索命中后高亮对应看板区块 */
export type ZhtLeftRailSectionTitle = '设施概况' | '生态整治' | '水利工程' | '应急协同';

/** 由点位来源/类型映射到左侧某一指标段（演示逻辑） */
export function mapSearchPointToLeftRailSection(p: ZhtUnifiedSearchPoint): ZhtLeftRailSectionTitle {
  if (p.sourceProject === '应急协同') return '应急协同';
  if (p.sourceProject === '生态整治') return '生态整治';
  if (p.sourceProject === '系统管理') return '水利工程';
  return '设施概况';
}
