/**
 * 排口详情「关联信息」行 → 打开对应台账详情（与设施管理列表、配置中心同源组件）
 */
import React from 'react';
import {
  agriRuralPollutionInitial,
  industryPollutionInitial,
  ruralSewageTreatmentInitial,
} from '../韶山水环境系统管理/config-center-data';
import { AgriDetail, IndDetail, RuralSewageDetail } from '../韶山水环境系统管理/config-center-pollution-extended';
import { DischargerDetailContent } from './facility-discharger-module';
import { dischargerDemoData, type PsDischargerRecord } from './facility-discharger-data';
import { PlantDetailContent } from './facility-pump-outlet-plant-details';
import { plantData } from './facility-points-data';
import type { LinkedOutletBackrefRow } from './facility-linked-outlet-backrefs';

const DEFAULT_DETAIL_MODAL_WIDTH: number | string = 'min(1200px, 96vw)';

export type RelatedFacilityDetailModalPack = {
  title: string;
  content: React.ReactNode;
  width: number | string;
};

/** 由关联反查行解析出与列表「详情」同源的弹窗内容；找不到台账时返回 null */
export function buildRelatedFacilityDetailModalPack(row: LinkedOutletBackrefRow): RelatedFacilityDetailModalPack | null {
  const id = String(row.recordId ?? '').trim();
  if (!id) return null;

  switch (row.kind) {
    case 'plant': {
      const rec = plantData.find(p => String(p.id) === id);
      if (!rec) return null;
      return {
        title: `污水厂详情 - ${rec.name}`,
        content: <PlantDetailContent record={rec as Record<string, unknown>} />,
        width: DEFAULT_DETAIL_MODAL_WIDTH,
      };
    }
    case 'discharger': {
      const rec = dischargerDemoData.find(d => String(d.id) === id);
      if (!rec) return null;
      return {
        title: `排水户详情 - ${rec.dischargerName}`,
        content: <DischargerDetailContent record={rec as PsDischargerRecord} />,
        width: DEFAULT_DETAIL_MODAL_WIDTH,
      };
    }
    case 'rural': {
      const rec = ruralSewageTreatmentInitial.find(r => String(r.id) === id);
      if (!rec) return null;
      return {
        title: `详情·农村污水及集中处理设施 - ${rec.unitName}`,
        content: <RuralSewageDetail r={rec} />,
        width: DEFAULT_DETAIL_MODAL_WIDTH,
      };
    }
    case 'agri': {
      const rec = agriRuralPollutionInitial.find(r => String(r.id) === id);
      if (!rec) return null;
      return {
        title: `详情·农业农村源 - ${rec.farmName}`,
        content: <AgriDetail r={rec} />,
        width: DEFAULT_DETAIL_MODAL_WIDTH,
      };
    }
    case 'industry': {
      const rec = industryPollutionInitial.find(r => String(r.id) === id);
      if (!rec) return null;
      return {
        title: `详情·工业企业污染源 - ${rec.unitName}`,
        content: <IndDetail r={rec} />,
        width: DEFAULT_DETAIL_MODAL_WIDTH,
      };
    }
    default:
      return null;
  }
}
