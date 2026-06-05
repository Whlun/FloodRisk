/**
 * 排口详情「关联信息」反查：汇总 `linkedOutletCode` 指向本排口编码的污水厂、排水户与污染源演示台账。
 * 污染源三类使用 `config-center-data` 初始数组；与配置中心页面内编辑态列表可能短暂不一致（原型限制）。
 */
import {
  agriRuralPollutionInitial,
  industryPollutionInitial,
  ruralSewageTreatmentInitial,
} from '../韶山水环境系统管理/config-center-data';
import { dischargerDemoData } from './facility-discharger-data';
import { plantData } from './facility-points-data';

/** 关联行对应的台账类型，用于打开同源详情 */
export type LinkedOutletBackrefKind = 'plant' | 'discharger' | 'rural' | 'agri' | 'industry';

export type LinkedOutletBackrefRow = {
  key: string;
  kind: LinkedOutletBackrefKind;
  /** 台账大类（界面展示） */
  source: string;
  /** 设施/主体名称 */
  name: string;
  /** 各台账主键 */
  recordId: string;
};

export function listFacilitiesLinkedToOutlet(outletCode: string): LinkedOutletBackrefRow[] {
  const c = String(outletCode ?? '').trim();
  const out: LinkedOutletBackrefRow[] = [];
  if (!c) return out;

  for (const p of plantData) {
    if (String(p.linkedOutletCode ?? '').trim() === c) {
      out.push({ key: `plant-${p.id}`, kind: 'plant', source: '污水厂', name: p.name, recordId: p.id });
    }
  }
  for (const d of dischargerDemoData) {
    if (String(d.linkedOutletCode ?? '').trim() === c) {
      out.push({
        key: `discharger-${d.id}`,
        kind: 'discharger',
        source: '排水户',
        name: d.dischargerName,
        recordId: d.id,
      });
    }
  }
  for (const r of ruralSewageTreatmentInitial) {
    if (String(r.linkedOutletCode ?? '').trim() === c) {
      out.push({
        key: `rural-${r.id}`,
        kind: 'rural',
        source: '农村污水及集中处理设施',
        name: r.unitName,
        recordId: r.id,
      });
    }
  }
  for (const r of agriRuralPollutionInitial) {
    if (String(r.linkedOutletCode ?? '').trim() === c) {
      out.push({
        key: `agri-${r.id}`,
        kind: 'agri',
        source: '农业农村源',
        name: r.farmName,
        recordId: r.id,
      });
    }
  }
  for (const r of industryPollutionInitial) {
    if (String(r.linkedOutletCode ?? '').trim() === c) {
      out.push({
        key: `ind-${r.id}`,
        kind: 'industry',
        source: '工业企业污染源',
        name: r.unitName,
        recordId: r.id,
      });
    }
  }
  return out;
}
