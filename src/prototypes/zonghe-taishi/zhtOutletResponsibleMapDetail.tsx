/**
 * 综合态势地图 · 责任主体详情：与设施管理「排口管理 · 责任主体信息」详情同源（委托 `OutletResponsiblePartyDetailContent`）。
 */
import React from 'react';
import { OutletResponsiblePartyDetailContent } from '../韶山水环境设施管理系统/facility-outlet-responsible-view';
import type { OutletResponsiblePartyRecord } from '../韶山水环境设施管理系统/facility-outlet-responsible-data';

export const ZhtOutletResponsibleMapDetail: React.FC<{
  row: OutletResponsiblePartyRecord;
  /** 侧栏态关闭位置地图，铺满态显示位置地图 */
  showLocationMiniMap?: boolean;
}> = ({ row, showLocationMiniMap = true }) => (
  <OutletResponsiblePartyDetailContent r={row} showLocationMiniMap={showLocationMiniMap} />
);
