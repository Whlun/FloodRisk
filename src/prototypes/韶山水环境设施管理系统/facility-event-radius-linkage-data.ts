/**
 * 事件联动分析：以锚点点位（污水厂、泵站或监测点）坐标为圆心、给定半径（米）筛选附近设施与入河排口（演示数据）。
 */
import { industryPollutionInitial } from '../韶山水环境系统管理/config-center-data';
import { haversineDistanceMeters } from './facility-geo-distance';
import { outletData, plantData, pumpStationData, OUTLET_LEVEL2_LABEL } from './facility-points-data';
import { pipeNodeData } from './pipe-network-demo-data';
import { buildAlarmDemoRecords } from '../zonghe-taishi/zhtAlarmRailDemoData';

export type PlantAnchorResult =
  | { ok: true; plantId: string; plantName: string; lng: number; lat: number }
  | { ok: false; reason: string };

function normalizeAnchorName(v: unknown): string {
  return String(v ?? '')
    .trim()
    .replace(/监测点/g, '')
    .replace(/[（(].*?[）)]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

/** 根据点位编码解析地图锚点：优先污水厂，其次泵站，最后监测点（台账 x/y 为经纬度） */
export function resolvePlantEventAnchor(facilityCode: string, facilityName?: string): PlantAnchorResult {
  const id = String(facilityCode || '').trim();
  if (!id) return { ok: false, reason: '未提供设施编码' };
  const p = plantData.find(row => row.id === id);
  if (p) {
    const lng = Number(p.x);
    const lat = Number(p.y);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return { ok: false, reason: '污水厂缺少有效经纬度' };
    return { ok: true, plantId: p.id, plantName: p.name, lng, lat };
  }
  const pump = pumpStationData.find(row => row.id === id || row.pustCode === id);
  if (pump) {
    const lng = Number(pump.x);
    const lat = Number(pump.y);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return { ok: false, reason: '泵站缺少有效经纬度' };
    return { ok: true, plantId: pump.id, plantName: pump.pustName, lng, lat };
  }
  const monitorById = pipeNodeData.find(node => String(node.nodeId || '').trim() === id);
  if (monitorById) {
    const lng = Number(monitorById.x);
    const lat = Number(monitorById.y);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return { ok: false, reason: '监测点缺少有效经纬度' };
    return { ok: true, plantId: String(monitorById.nodeId), plantName: String(monitorById.roadName || monitorById.nodeId), lng, lat };
  }

  const normalizedName = normalizeAnchorName(facilityName);
  if (normalizedName) {
    const monitorByName = pipeNodeData.find(node => {
      const candidates = [
        node.nodeId,
        node.roadName,
        (node as { name?: string }).name,
        (node as { title?: string }).title,
        (node as { 监测点名称?: string }).监测点名称,
      ];
      return candidates.some(item => normalizeAnchorName(item) === normalizedName);
    });
    if (monitorByName) {
      const lng = Number(monitorByName.x);
      const lat = Number(monitorByName.y);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return { ok: false, reason: '监测点缺少有效经纬度' };
      return {
        ok: true,
        plantId: String(monitorByName.nodeId),
        plantName: String(monitorByName.roadName || monitorByName.nodeId),
        lng,
        lat,
      };
    }
  }

  // 报警推送到事件列表时，点位编码常为 SHA-* 告警编号：尝试回退到报警演示数据中的 mapFocus 坐标
  if (/^SHA-\d+$/i.test(id)) {
    const alarmPool = [...buildAlarmDemoRecords('realtime'), ...buildAlarmDemoRecords('history')];
    const alarmHit = alarmPool.find(item => String(item.alarmCode || '').trim() === id);
    if (alarmHit) {
      const lng = Number(alarmHit.mapFocus?.lng);
      const lat = Number(alarmHit.mapFocus?.lat);
      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        return {
          ok: true,
          plantId: id,
          plantName: String(facilityName || alarmHit.monPointName || id),
          lng,
          lat,
        };
      }
    }
  }
  return { ok: false, reason: '台账中未找到该污水厂、泵站或监测点' };
}

function parseIndustryLngLat(lng: unknown, lat: unknown): { lng: number; lat: number } | null {
  const lo = Number.parseFloat(String(lng ?? '').trim());
  const la = Number.parseFloat(String(lat ?? '').trim());
  if (!Number.isFinite(lo) || !Number.isFinite(la)) return null;
  return { lng: lo, lat: la };
}

export type RadiusIndustryRow = {
  key: string;
  name: string;
  typeLabel: string;
  township: string;
  lng: number;
  lat: number;
  distanceM: number;
};

export type RadiusOutletRow = {
  key: string;
  code: string;
  name: string;
  address: string;
  receivingWater: string;
  level2: string;
  typeLabel: string;
  lng: number;
  lat: number;
  distanceM: number;
};

export type RadiusMonitorRow = {
  key: string;
  nodeId: string;
  roadName: string;
  manholeCategory: string;
  typeLabel: string;
  lng: number;
  lat: number;
  distanceM: number;
};

export type RadiusPlantRow = {
  key: string;
  id: string;
  name: string;
  typeLabel: string;
  lng: number;
  lat: number;
  distanceM: number;
};

export type EventRadiusLinkageSnapshot = {
  radiusM: number;
  anchor: PlantAnchorResult;
  /** 附近设施 */
  industries: RadiusIndustryRow[];
  enterpriseIndustrialOutlets: RadiusOutletRow[];
  waterMonitors: RadiusMonitorRow[];
  otherPlants: RadiusPlantRow[];
  /** 入河排口（二级分类分区） */
  outletsUrbanStorm: RadiusOutletRow[];
  outletsIndustrialStorm: RadiusOutletRow[];
  /** 半径内其余入河排口（既非城镇雨洪也非工业企业雨洪） */
  outletsOther: RadiusOutletRow[];
};

function outletLngLat(row: (typeof outletData)[number]): { lng: number; lat: number } | null {
  const lng = Number(row['入河入海排污口经度']);
  const lat = Number(row['入河入海排污口纬度']);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return { lng, lat };
}

function plantFacilityTypeLabel(facilityType: number | undefined): string {
  if (facilityType === 2) return '工业废水集中处理设施';
  if (facilityType === 3) return '其他污水处理设施';
  return '城镇污水处理厂';
}

/**
 * 以锚点为圆心、radiusM 为半径，聚合演示台账中的设施与排口。
 */
export function buildEventRadiusLinkageSnapshot(anchor: PlantAnchorResult, radiusM: number): EventRadiusLinkageSnapshot {
  const empty: EventRadiusLinkageSnapshot = {
    radiusM,
    anchor,
    industries: [],
    enterpriseIndustrialOutlets: [],
    waterMonitors: [],
    otherPlants: [],
    outletsUrbanStorm: [],
    outletsIndustrialStorm: [],
    outletsOther: [],
  };

  if (!anchor.ok || radiusM <= 0 || !Number.isFinite(radiusM)) return empty;

  const { lng: olng, lat: olat } = anchor;
  const within = (lng: number, lat: number) => haversineDistanceMeters(olng, olat, lng, lat) <= radiusM;
  const dist = (lng: number, lat: number) => haversineDistanceMeters(olng, olat, lng, lat);

  const industries: RadiusIndustryRow[] = [];
  for (const row of industryPollutionInitial) {
    const ll = parseIndustryLngLat(row.lng, row.lat);
    if (!ll || !within(ll.lng, ll.lat)) continue;
    industries.push({
      key: `ind-${row.id}`,
      name: row.unitName,
      typeLabel: '工业源',
      township: row.township || '—',
      lng: ll.lng,
      lat: ll.lat,
      distanceM: Math.round(dist(ll.lng, ll.lat)),
    });
  }

  const enterpriseIndustrialOutlets: RadiusOutletRow[] = [];
  const outletsUrbanStorm: RadiusOutletRow[] = [];
  const outletsIndustrialStorm: RadiusOutletRow[] = [];
  const outletsOther: RadiusOutletRow[] = [];

  for (const row of outletData) {
    const ll = outletLngLat(row);
    if (!ll || !within(ll.lng, ll.lat)) continue;
    const level2 = String(row['入河入海排污口二级分类'] ?? '').trim();
    const typeLabel = (OUTLET_LEVEL2_LABEL[level2] ?? level2) || '—';
    const base: RadiusOutletRow = {
      key: `out-${row['入河入海排污口编码']}`,
      code: String(row['入河入海排污口编码']),
      name: String(row['入河入海排污口名称'] ?? ''),
      address: String(row['入河入海排污口详细地址'] ?? ''),
      receivingWater: String(row['受纳水体'] ?? ''),
      level2,
      typeLabel,
      lng: ll.lng,
      lat: ll.lat,
      distanceM: Math.round(dist(ll.lng, ll.lat)),
    };
    if (level2 === '01') enterpriseIndustrialOutlets.push(base);
    else if (level2 === '15') outletsUrbanStorm.push(base);
    else if (level2 === '02') outletsIndustrialStorm.push(base);
    else outletsOther.push(base);
  }

  const waterMonitors: RadiusMonitorRow[] = [];
  for (const node of pipeNodeData) {
    if (!(node as { 水质监测点?: boolean }).水质监测点) continue;
    const lng = Number(node.x);
    const lat = Number(node.y);
    if (!Number.isFinite(lng) || !Number.isFinite(lat) || !within(lng, lat)) continue;
    waterMonitors.push({
      key: `mon-${node.nodeId}`,
      nodeId: node.nodeId,
      roadName: String(node.roadName ?? ''),
      manholeCategory: String(node.manholeCategory ?? ''),
      typeLabel: '水情监测',
      lng,
      lat,
      distanceM: Math.round(dist(lng, lat)),
    });
  }

  const otherPlants: RadiusPlantRow[] = [];
  for (const p of plantData) {
    if (p.id === anchor.plantId) continue;
    const lng = Number(p.x);
    const lat = Number(p.y);
    if (!Number.isFinite(lng) || !Number.isFinite(lat) || !within(lng, lat)) continue;
    otherPlants.push({
      key: `plt-${p.id}`,
      id: p.id,
      name: p.name,
      typeLabel: plantFacilityTypeLabel(p.facilityType),
      lng,
      lat,
      distanceM: Math.round(dist(lng, lat)),
    });
  }

  return {
    radiusM,
    anchor,
    industries,
    enterpriseIndustrialOutlets,
    waterMonitors,
    otherPlants,
    outletsUrbanStorm,
    outletsIndustrialStorm,
    outletsOther,
  };
}

/** 附近设施摘要句（与业务示意文案一致） */
export function buildNearbyFacilitiesSummary(s: EventRadiusLinkageSnapshot): string {
  const parts = [
    `工业源${s.industries.length}个`,
    `企业工业排口${s.enterpriseIndustrialOutlets.length}个`,
    `水情监测${s.waterMonitors.length}个`,
    `污水处理设施${s.otherPlants.length}个`,
  ];
  return `附近有 ${parts.join('；')}；`;
}

/** 入河排口面板摘要 */
export function buildRiverOutletSectionSummary(s: EventRadiusLinkageSnapshot): string {
  const parts = [`其他城镇雨洪排口${s.outletsUrbanStorm.length}个`, `工业企业雨洪排口${s.outletsIndustrialStorm.length}个`];
  if (s.outletsOther.length > 0) parts.push(`其他类型排口${s.outletsOther.length}个`);
  return `附近有 ${parts.join('；')}；`;
}

/** 导出扁平行（单表合并） */
export function flattenRadiusLinkageForExport(s: EventRadiusLinkageSnapshot): Record<string, unknown>[] {
  if (!s.anchor.ok) return [];
  const rows: Record<string, unknown>[] = [];
  const push = (板块: string, 子类: string, 名称: string, 编码: string, 距离米: number, 经度: number, 纬度: number, 备注: string) => {
    rows.push({ 板块, 子类, 名称, 编码, 距离米, 经度, 纬度, 备注 });
  };

  for (const r of s.industries) {
    push('附近设施', '工业源', r.name, r.key, r.distanceM, r.lng, r.lat, `乡镇：${r.township}`);
  }
  for (const r of s.enterpriseIndustrialOutlets) {
    push('附近设施', '企业工业排口', r.name, r.code, r.distanceM, r.lng, r.lat, `${r.address}｜受纳：${r.receivingWater}`);
  }
  for (const r of s.waterMonitors) {
    push('附近设施', '水情监测', `${r.roadName || '管点'}（${r.nodeId}）`, r.nodeId, r.distanceM, r.lng, r.lat, r.manholeCategory);
  }
  for (const r of s.otherPlants) {
    push('附近设施', '污水处理设施', r.name, r.id, r.distanceM, r.lng, r.lat, r.typeLabel);
  }
  for (const r of s.outletsUrbanStorm) {
    push('入河排口', '城镇雨洪排口', r.name, r.code, r.distanceM, r.lng, r.lat, `${r.address}｜${r.typeLabel}`);
  }
  for (const r of s.outletsIndustrialStorm) {
    push('入河排口', '工业企业雨洪排口', r.name, r.code, r.distanceM, r.lng, r.lat, `${r.address}｜${r.typeLabel}`);
  }
  for (const r of s.outletsOther) {
    push('入河排口', '其他类型', r.name, r.code, r.distanceM, r.lng, r.lat, `${r.address}｜${r.typeLabel}`);
  }
  return rows;
}
