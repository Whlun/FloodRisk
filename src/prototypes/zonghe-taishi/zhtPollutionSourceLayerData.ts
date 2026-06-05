/**
 * 综合态势 · 污染源图层数据（与系统管理「配置中心 · 污染源信息」`config-center-data.ts` 同源，保持同步）
 */
import type {
  AgriRuralPollutionRecord,
  IndustryPollutionRecord,
  RuralSewageTreatmentRecord,
} from '../韶山水环境系统管理/config-center-data';
import {
  agriRuralPollutionInitial,
  industryPollutionInitial,
  ruralSewageTreatmentInitial,
} from '../韶山水环境系统管理/config-center-data';

/** 三类子图层（对应侧栏：农村污水及集中处理设施 / 农业农村源 / 工业企业污染源） */
export type ZhtPollutionSourceKind = 'rural_sewage' | 'agri_rural' | 'industry';

export type ZhtPollutionMapPoint =
  | { kind: 'rural_sewage'; id: string; name: string; lng: number; lat: number; record: RuralSewageTreatmentRecord }
  | { kind: 'agri_rural'; id: string; name: string; lng: number; lat: number; record: AgriRuralPollutionRecord }
  | { kind: 'industry'; id: string; name: string; lng: number; lat: number; record: IndustryPollutionRecord };

function parseCoord(s: string): number | null {
  const n = Number.parseFloat(String(s).trim());
  return Number.isFinite(n) ? n : null;
}

/** 与图层状态键一致 */
export type ZhtPollutionSourceLayerKey = 'ruralSewage' | 'agriRural' | 'industry';

export function pollutionKindToLayerKey(kind: ZhtPollutionSourceKind): ZhtPollutionSourceLayerKey {
  if (kind === 'rural_sewage') return 'ruralSewage';
  if (kind === 'agri_rural') return 'agriRural';
  return 'industry';
}

/** 指定类型的可落图点位（坐标无效的记录会被过滤，与地图绘制一致） */
export function getPollutionMapPointsByKind(kind: ZhtPollutionSourceKind): ZhtPollutionMapPoint[] {
  if (kind === 'rural_sewage') {
    const out: ZhtPollutionMapPoint[] = [];
    for (const r of ruralSewageTreatmentInitial) {
      const lng = parseCoord(r.entLng);
      const lat = parseCoord(r.entLat);
      if (lng == null || lat == null) continue;
      out.push({ kind: 'rural_sewage', id: r.id, name: r.unitName, lng, lat, record: r });
    }
    return out;
  }
  if (kind === 'agri_rural') {
    const out: ZhtPollutionMapPoint[] = [];
    for (const r of agriRuralPollutionInitial) {
      const lng = parseCoord(r.centerLng);
      const lat = parseCoord(r.centerLat);
      if (lng == null || lat == null) continue;
      out.push({ kind: 'agri_rural', id: r.id, name: r.farmName, lng, lat, record: r });
    }
    return out;
  }
  const out: ZhtPollutionMapPoint[] = [];
  for (const r of industryPollutionInitial) {
    const lng = parseCoord(r.lng);
    const lat = parseCoord(r.lat);
    if (lng == null || lat == null) continue;
    out.push({ kind: 'industry', id: r.id, name: r.unitName, lng, lat, record: r });
  }
  return out;
}

export function countPollutionPointsByKind(kind: ZhtPollutionSourceKind): number {
  return getPollutionMapPointsByKind(kind).length;
}

/** 全量可绘点位（三类合并，用于调试或统计） */
export function getAllPollutionMapPoints(): ZhtPollutionMapPoint[] {
  return [
    ...getPollutionMapPointsByKind('rural_sewage'),
    ...getPollutionMapPointsByKind('agri_rural'),
    ...getPollutionMapPointsByKind('industry'),
  ];
}

export function findPollutionMapPoint(kind: ZhtPollutionSourceKind, id: string): ZhtPollutionMapPoint | null {
  return getPollutionMapPointsByKind(kind).find(p => p.id === id) ?? null;
}

/** 子类中文名（与系统管理侧栏一致） */
export const ZHT_POLLUTION_KIND_LABEL: Record<ZhtPollutionSourceKind, string> = {
  rural_sewage: '农村污水及集中处理设施',
  agri_rural: '农业农村源',
  industry: '工业企业污染源',
};
