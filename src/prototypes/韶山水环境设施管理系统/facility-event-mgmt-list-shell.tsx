/**
 * 设施管理 · 事件管理 · 事件列表入口
 * 挂载统一台账视图（单表 + 点位类型），与事件统计共用 eventRows 状态。
 */
import React from 'react';
import { FacilityUnifiedEventListView } from './facility-unified-event-list-view';
import type { UnifiedFacilityEventRecord } from './facility-unified-event-data';
import type { PumpStationRecord, PlantRecord } from './facility-points-data';
import type { PipeNodeDemoRow } from './pipe-network-demo-data';

export type FacilityEventMgmtListShellProps = {
  onDetail: (title: string, content: React.ReactNode, modalWidth?: number | string) => void;
  pumpStationRows: PumpStationRecord[];
  plantRecords: PlantRecord[];
  monitorPointRows: PipeNodeDemoRow[];
  eventRows: UnifiedFacilityEventRecord[];
  onEventRowsChange: React.Dispatch<React.SetStateAction<UnifiedFacilityEventRecord[]>>;
  /** 兼容旧视图键：进入时默认筛选泵站 / 污水厂 / 全部 */
  defaultFacilityTypeFilter?: 'all' | 'pump' | 'plant';
};

export const FacilityEventMgmtListShell: React.FC<FacilityEventMgmtListShellProps> = (props) => (
  <FacilityUnifiedEventListView {...props} />
);
