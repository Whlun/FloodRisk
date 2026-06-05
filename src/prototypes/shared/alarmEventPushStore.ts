import dayjs from 'dayjs';
import type { ZhtAlarmRecord } from '../zonghe-taishi/zhtAlarmRailDemoData';

const ALARM_PUSH_STORE_KEY = 'axhub:zht:alarm-pushed-events:v1';

export type AlarmPushedUnifiedEventRecord = {
  id: string;
  点位类型: '监测点';
  点位编码: string;
  点位名称: string;
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

export type AlarmPushedEventItem = {
  alarmId: string;
  pushedAt: string;
  event: AlarmPushedUnifiedEventRecord;
};

function safeWindow(): Window | null {
  if (typeof window === 'undefined') return null;
  return window;
}

function safeReadStore(): AlarmPushedEventItem[] {
  const w = safeWindow();
  if (!w) return [];
  try {
    const raw = w.localStorage.getItem(ALARM_PUSH_STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const list = parsed.filter(item => item && typeof item === 'object') as AlarmPushedEventItem[];
    return list.map(item => ({
      ...item,
      event: {
        ...item.event,
        // 兼容历史数据：系统推送事件若为空则回填“系统推送”
        责任人: String(item.event?.责任人 || '').trim() || '系统推送',
      },
    }));
  } catch {
    return [];
  }
}

function safeWriteStore(items: AlarmPushedEventItem[]) {
  const w = safeWindow();
  if (!w) return;
  try {
    w.localStorage.setItem(ALARM_PUSH_STORE_KEY, JSON.stringify(items));
  } catch {
    // 忽略浏览器存储异常，避免影响页面交互
  }
}

function toUnifiedEventLevel(level: string): AlarmPushedUnifiedEventRecord['事件等级'] {
  const v = String(level || '').trim();
  if (v.startsWith('I级')) return '重大';
  if (v.startsWith('II级')) return '较大';
  return '一般';
}

function makePointCodeFromAlarm(alarm: ZhtAlarmRecord): string {
  const fallback = String(alarm.alarmCode || '').trim();
  if (fallback) return fallback;
  return `MON-${String(alarm.id || '').slice(-8).toUpperCase()}`;
}

function generateEventId(pointCode: string, existing: AlarmPushedEventItem[]): string {
  const datePart = dayjs().format('YYYYMMDDHHmmss');
  const prefix = `${pointCode}-EVT-${datePart}`;
  const seq = existing.filter(item => String(item.event.id || '').startsWith(prefix)).length + 1;
  return `${prefix}-${String(seq).padStart(2, '0')}`;
}

function buildEventFromAlarm(
  alarm: ZhtAlarmRecord,
  existing: AlarmPushedEventItem[],
  overrides?: {
    事件类型?: string;
    事件等级?: AlarmPushedUnifiedEventRecord['事件等级'];
    发生时间?: string;
    责任人?: string;
    更新时间?: string;
    事件原因?: string;
    应急处置?: string;
  },
): AlarmPushedUnifiedEventRecord {
  const pointCode = makePointCodeFromAlarm(alarm);
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  const eventReason = String(overrides?.事件原因 ?? alarm.alarmName ?? '').trim();
  const disposalAdvice =
    String(overrides?.应急处置 ?? '').trim() || '请尽快核查告警点位并完成处置闭环';
  return {
    id: generateEventId(pointCode, existing),
    点位类型: '监测点',
    点位编码: pointCode,
    点位名称: String(alarm.monPointName || alarm.alarmName || '监测点'),
    事件类型: String(overrides?.事件类型 || '实时告警').trim() || '实时告警',
    事件等级: overrides?.事件等级 || toUnifiedEventLevel(alarm.currentLevel),
    发生时间: String(overrides?.发生时间 || alarm.currentAlarmTime || now),
    状态: '待处置',
    // 报警自动推送到事件列表，默认上报人为“系统推送”
    责任人: String(overrides?.责任人 || '系统推送').trim() || '系统推送',
    更新时间: String(overrides?.更新时间 || now),
    处置责任人: '',
    联系电话: '',
    处置完成图片: [],
    处置完成时间: '',
    发生地点: String(alarm.location || '').trim(),
    事件原因: eventReason,
    处理过程: '',
    处理结果: '',
    应急处置: disposalAdvice,
    处置描述: '',
    告警指标: String(alarm.monItemName || '').trim() || undefined,
  };
}

export function loadAlarmPushedEvents(): AlarmPushedEventItem[] {
  return safeReadStore();
}

export function getAlarmPushedEvent(alarmId: string): AlarmPushedEventItem | null {
  const id = String(alarmId || '').trim();
  if (!id) return null;
  return safeReadStore().find(item => item.alarmId === id) || null;
}

export function isAlarmPushed(alarmId: string): boolean {
  return getAlarmPushedEvent(alarmId) != null;
}

export function pushAlarmToEvent(
  alarm: ZhtAlarmRecord,
  overrides?: {
    事件类型?: string;
    事件等级?: AlarmPushedUnifiedEventRecord['事件等级'];
    发生时间?: string;
    责任人?: string;
    更新时间?: string;
    事件原因?: string;
    应急处置?: string;
  },
): { created: boolean; item: AlarmPushedEventItem } {
  const alarmId = String(alarm.id || '').trim();
  const stored = safeReadStore();
  const existed = stored.find(item => item.alarmId === alarmId);
  if (existed) return { created: false, item: existed };

  const item: AlarmPushedEventItem = {
    alarmId,
    pushedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    event: buildEventFromAlarm(alarm, stored, overrides),
  };
  safeWriteStore([item, ...stored]);
  return { created: true, item };
}
