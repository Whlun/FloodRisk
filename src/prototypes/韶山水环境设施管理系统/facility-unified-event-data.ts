/**
 * 统一事件台账：初始数据与列表/统计共用的字段聚合辅助
 */
import dayjs from 'dayjs';
import {
  hasPlantEventDisposalFilled,
  hasUnifiedFacilityEventDisposalFilled,
} from './facility-event-disposal-filled';
import { PUMP_EVENT_INITIAL, type PumpEventRecord } from './facility-pump-event-list-view';
import { PLANT_EVENT_INITIAL, type PlantEventRecord } from './facility-plant-event-list-view';
import { loadAlarmPushedEvents, type AlarmPushedUnifiedEventRecord } from '../shared/alarmEventPushStore';

export type PointKindZh = '泵站' | '污水厂' | '监测点';

/** 与事件列表 `facility-unified-event-list-view` 同源 */
export type UnifiedFacilityEventRecord = {
  id: string;
  创建时间: string;
  点位类型: PointKindZh;
  点位编码: string;
  点位名称: string;
  所属区域?: string;
  点位地址?: string;
  事件类型: string;
  事件等级: '一般' | '较大' | '重大';
  发生时间: string;
  状态: '待处置' | '处置完成' | '终止';
  责任人: string;
  更新时间: string;
  处置责任人: string;
  联系电话: string;
  处置完成图片: string[];
  处置完成时间: string;
  发生地点?: string;
  事件原因?: string;
  处理过程?: string;
  处理结果?: string;
  应急处置?: string;
  处置描述?: string;
  告警指标?: string;
};

export function pumpRowToUnified(r: PumpEventRecord): UnifiedFacilityEventRecord {
  return {
    id: r.id,
    创建时间: r.更新时间 || r.发生时间,
    点位类型: '泵站',
    点位编码: r.泵站编码,
    点位名称: r.泵站名称,
    事件类型: r.事件类型,
    事件等级: r.事件等级,
    发生时间: r.发生时间,
    状态: r.状态,
    责任人: r.责任人,
    更新时间: r.更新时间,
    处置责任人: r.处置责任人,
    联系电话: r.联系电话,
    处置完成图片: r.处置完成图片 || [],
    处置完成时间: r.处置完成时间,
    发生地点: r.发生地点,
    事件原因: r.事件原因,
    应急处置: r.应急处置,
    处理过程: r.处理过程,
    处理结果: r.处理结果,
    处置描述: r.处置描述,
  };
}

export function plantRowToUnified(r: PlantEventRecord): UnifiedFacilityEventRecord {
  return {
    id: r.id,
    创建时间: r.更新时间 || r.发生时间,
    点位类型: '污水厂',
    点位编码: r.污水厂编码,
    点位名称: r.污水厂名称,
    事件类型: r.事件类型,
    事件等级: r.事件等级,
    发生时间: r.发生时间,
    状态: r.状态,
    责任人: r.责任人,
    更新时间: r.更新时间,
    处置责任人: r.处置责任人,
    联系电话: r.联系电话,
    处置完成图片: r.处置完成图片 || [],
    处置完成时间: r.处置完成时间,
    事件原因: r.事件原因,
    应急处置: r.应急处置,
    处置描述: r.处置描述,
    告警指标: r.告警指标,
  };
}

function pushedEventToUnified(r: AlarmPushedUnifiedEventRecord, pushedAt?: string): UnifiedFacilityEventRecord {
  const pushedLocation = String(r.发生地点 || '').trim();
  return {
    id: r.id,
    创建时间: String(pushedAt || r.更新时间 || r.发生时间 || ''),
    点位类型: '监测点',
    点位编码: r.点位编码,
    点位名称: r.点位名称,
    事件类型: r.事件类型,
    事件等级: r.事件等级,
    发生时间: r.发生时间,
    状态: r.状态,
    责任人: r.责任人,
    更新时间: r.更新时间,
    处置责任人: r.处置责任人,
    联系电话: r.联系电话,
    处置完成图片: r.处置完成图片 || [],
    处置完成时间: r.处置完成时间,
    所属区域: '管网监测点',
    点位地址: pushedLocation || '—',
    发生地点: r.发生地点,
    事件原因: r.事件原因,
    处理过程: r.处理过程,
    处理结果: r.处理结果,
    应急处置: r.应急处置,
    处置描述: r.处置描述,
    告警指标: r.告警指标,
  };
}

/** 主入口初始事件台账（与列表首次挂载一致） */
export function buildInitialUnifiedFacilityEvents(): UnifiedFacilityEventRecord[] {
  return [
    ...PUMP_EVENT_INITIAL.map(pumpRowToUnified),
    ...PLANT_EVENT_INITIAL.map(plantRowToUnified),
    ...loadAlarmPushedEvents().map(item => pushedEventToUnified(item.event, item.pushedAt)),
  ];
}

/** 处置信息是否已填报（与列表操作列判定一致） */
export function hasEventRecordDisposalFilled(r: UnifiedFacilityEventRecord): boolean {
  if (r.点位类型 === '泵站') {
    return hasUnifiedFacilityEventDisposalFilled({
      设施类型: '泵站',
      处置责任人: r.处置责任人,
      联系电话: r.联系电话,
      处置描述: r.处置描述,
      处理过程: r.处理过程,
      处理结果: r.处理结果,
      处置完成图片: r.处置完成图片,
      处置完成时间: r.处置完成时间,
    });
  }
  if (r.点位类型 === '污水厂') {
    return hasUnifiedFacilityEventDisposalFilled({
      设施类型: '污水厂',
      处置责任人: r.处置责任人,
      联系电话: r.联系电话,
      处置描述: r.处置描述,
      处理过程: r.处理过程,
      处理结果: r.处理结果,
      处置完成图片: r.处置完成图片,
      处置完成时间: r.处置完成时间,
    });
  }
  return hasPlantEventDisposalFilled({
    处置责任人: r.处置责任人,
    联系电话: r.联系电话,
    处置描述: r.处置描述,
    处置完成图片: r.处置完成图片,
    处置完成时间: r.处置完成时间,
  });
}

/** 由发生时间至处置完成时间推算处置时长（小时）；无效则 null */
export function eventDisposalDurationHours(r: UnifiedFacilityEventRecord): number | null {
  const start = dayjs(String(r.发生时间 || '').replace(' ', 'T'));
  const end = dayjs(String(r.处置完成时间 || '').replace(' ', 'T'));
  if (!start.isValid() || !end.isValid()) return null;
  const h = end.diff(start, 'hour', true);
  return h >= 0 ? h : null;
}

/** 是否处置时长超过 48 小时（需有有效起止时间） */
export function isEventDisposalOver48Hours(r: UnifiedFacilityEventRecord): boolean {
  const h = eventDisposalDurationHours(r);
  return h != null && h > 48;
}
