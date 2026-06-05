/**
 * 综合态势 · 报警 rail：卡片与铺满列表视图共用演示数据（一条记录对应一行列表与一张卡片）
 */
import { ZHT_MONITORING_POI_DEMO } from './zhtPoiMonitoringDemo';
import type { ZhtStatDrawerMapFocus } from './zhtLeftStatDrawerData';

export type ZhtAlarmTimeScope = 'realtime' | 'history';

/** 单条报警：表格列 + 卡片展示 + 地图定位同源 */
export type ZhtAlarmRecord = {
  id: string;
  alarmCode: string;
  region: string;
  alarmName: string;
  monPointType: string;
  monPointName: string;
  monItemName: string;
  location: string;
  currentAlarmValue: string;
  currentLevel: string;
  currentAlarmTime: string;
  initialAlarmValue: string;
  initialAlarmTime: string;
  initialLevel: string;
  maxAlarmValue: string;
  maxLevel: string;
  maxAlarmTime: string;
  /**
   * 报警结束时间：实时告警进行中为空字符串（表格展示 **—**）；历史报警为已结束的演示时刻。
   */
  alarmEndTime: string;
  alarmCount: number;
  /** 卡片标题（含超限语义） */
  cardTitle: string;
  /** 卡片角标级别（与 current/max 演示一致） */
  cardLevelBadge: string;
  /** 卡片时间行 */
  cardTime: string;
  indicator: string;
  value: string;
  address: string;
  mapFocus: ZhtStatDrawerMapFocus;
};

function padAlarmCode(i: number): string {
  return `SHA-${202510100000 + i}`;
}

/**
 * @param scope 实时：演示当日附近时间戳；历史：演示更早时间戳（同源点位）
 */
export function buildAlarmDemoRecords(scope: ZhtAlarmTimeScope): ZhtAlarmRecord[] {
  const demoMon = ZHT_MONITORING_POI_DEMO;
  const isRt = scope === 'realtime';
  return Array.from({ length: 5 }, (_, i) => {
    const mon = demoMon[i % demoMon.length];
    const unifiedId = `zht-mon-${mon.id}`;
    const mapFocus: ZhtStatDrawerMapFocus = {
      kind: 'point',
      lng: mon.lng,
      lat: mon.lat,
      zoom: 15,
      peekPoi: { kind: 'unified', unifiedId },
    };
    const alarmName = `${mon.title}超限报警`;
    const region = i % 2 === 0 ? '韶山市清溪镇' : '韶山高新区';
    const currentLevels = ['I级', 'II级', 'III级', 'IV级', 'II级'];
    const currentAlarmTime = isRt ? '2025-10-10 11:50:00' : '2024-06-01 09:30:00';
    const initialAlarmTime = isRt ? '2025-10-10 08:10:00' : '2024-05-28 14:20:00';
    const maxAlarmTime = isRt ? '2025-10-10 11:48:00' : '2024-05-30 16:00:00';
    /** 历史：告警解除后的结束时刻（每条略有间隔）；实时：仍处置中，无结束时间 */
    const historyEndTimes = [
      '2024-06-02 17:45:00',
      '2024-06-03 09:12:00',
      '2024-06-04 14:30:00',
      '2024-06-05 08:55:00',
      '2024-06-06 16:20:00',
    ];
    const alarmEndTime = isRt ? '' : historyEndTimes[i % historyEndTimes.length];

    return {
      /** 与实时/历史切换无关的稳定 id，便于地图定位高亮不因 Tab 切换错位 */
      id: `alarm-rail-${i}-${mon.id}`,
      alarmCode: padAlarmCode(i),
      region,
      alarmName,
      monPointType: '水质自动站',
      monPointName: mon.title,
      monItemName: '氨氮',
      location: `${region} · ${mon.title}沿线`,
      currentAlarmValue: '100',
      currentLevel: currentLevels[i % currentLevels.length],
      currentAlarmTime,
      initialAlarmValue: '10',
      initialAlarmTime,
      initialLevel: 'IV级',
      maxAlarmValue: '120',
      maxLevel: 'I级',
      maxAlarmTime,
      alarmEndTime,
      alarmCount: 123 + i * 7,
      cardTitle: alarmName,
      /** 卡片角标显示最新级别（同 `currentLevel`） */
      cardLevelBadge: currentLevels[i % currentLevels.length],
      cardTime: isRt ? '2025/10/10 11:50:00' : '2024/06/01 09:30:00',
      indicator: '氨氮',
      value: '12 mg/L',
      address: `湖南省湘潭市韶山市 · ${mon.title}沿线监测断面（演示）`,
      mapFocus,
    };
  });
}
