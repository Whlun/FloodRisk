/**
 * 事件联动分析表格行 → 打开与设施管理列表同源的台账详情弹窗
 */
import React from 'react';
import { message } from 'antd';
import { buildRelatedFacilityDetailModalPack } from './facility-linked-outlet-related-detail';
import type { LinkedOutletBackrefRow } from './facility-linked-outlet-backrefs';
import { outletData, plantData } from './facility-points-data';
import { getPipeNodeById } from './pipe-network-demo-data';
import { OutletDetailContent, PlantDetailContent } from './facility-pump-outlet-plant-details';
import { PipeNodeDetailReadonlyContent, pipeNodeDetailModalTitle } from './pipeNodeDetailReadonlyContent';

export type FacilityDetailModalOpener = (title: string, content: React.ReactNode, modalWidth?: number | string) => void;

const WIDE: number | string = 'min(1200px, 96vw)';
const PIPE_DETAIL_WIDTH = 920;

export type RadiusLinkageDetailTarget =
  | { kind: 'industry'; recordId: string }
  | { kind: 'outlet'; code: string }
  | { kind: 'monitor'; nodeId: string }
  | { kind: 'plant'; id: string };

/** 由半径筛查行打开对应台账详情（找不到则 message.warning） */
export function openRadiusLinkageRowDetail(onDetail: FacilityDetailModalOpener, target: RadiusLinkageDetailTarget): void {
  switch (target.kind) {
    case 'industry': {
      const stub: LinkedOutletBackrefRow = {
        key: `radius-open-${target.recordId}`,
        kind: 'industry',
        source: '工业企业污染源',
        name: '',
        recordId: target.recordId,
      };
      const pack = buildRelatedFacilityDetailModalPack(stub);
      if (!pack) {
        message.warning('未找到工业企业污染源台账');
        return;
      }
      onDetail(pack.title, pack.content, pack.width);
      break;
    }
    case 'plant': {
      const rec = plantData.find(p => p.id === target.id);
      if (!rec) {
        message.warning('未找到污水处理厂台账');
        return;
      }
      onDetail(`污水厂详情 - ${rec.name}`, <PlantDetailContent record={rec as Record<string, unknown>} />, WIDE);
      break;
    }
    case 'outlet': {
      const rec = outletData.find(o => String(o['入河入海排污口编码']) === target.code);
      if (!rec) {
        message.warning('未找到入河排口台账');
        return;
      }
      onDetail(
        `排口详情 - ${String(rec['入河入海排污口名称'] ?? '')}`,
        <OutletDetailContent record={rec as Record<string, unknown>} />,
        WIDE,
      );
      break;
    }
    case 'monitor': {
      const rec = getPipeNodeById(target.nodeId);
      if (!rec) {
        message.warning('未找到排水管点台账');
        return;
      }
      onDetail(pipeNodeDetailModalTitle(rec), <PipeNodeDetailReadonlyContent record={rec} />, PIPE_DETAIL_WIDTH);
      break;
    }
    default:
      break;
  }
}
