import dayjs, { Dayjs } from 'dayjs';
import { dischargerDemoData } from './facility-discharger-data';
import { plantData } from './facility-points-data';
import {
  agriRuralPollutionInitial,
  industryPollutionInitial,
  ruralSewageTreatmentInitial,
} from '../韶山水环境系统管理/config-center-data';
import {
  buildSewerTraceDemo,
  normalizeAlarmMetric,
  type SewerTraceDemoResult,
} from './facility-sewer-trace-demo';

export type { SewerTraceDemoResult };
export { normalizeAlarmMetric } from './facility-sewer-trace-demo';

export type LinkedAnalysisMetricKey = 'COD' | 'NH3N' | 'TP' | 'TN';
export type LinkedAnalysisEventScene = 'plant' | 'pump';

export type LinkedAnalysisMetricPoint = {
  time: string;
  COD: number;
  NH3N: number;
  TP: number;
  TN: number;
};

export type LinkedAnalysisDischargerRow = {
  key: string;
  source: string;
  name: string;
  status: '正常排放' | '超标排放' | '高负荷排放';
  peakCod: number;
  peakNh3n: number;
  note: string;
};

export type LinkedAnalysisEquipmentRow = {
  key: string;
  name: string;
  status: '运行' | '停机' | '异常';
  alarm: string;
};

export type LinkedAnalysisDemoResult = {
  windowStart: Dayjs;
  windowEnd: Dayjs;
  series: LinkedAnalysisMetricPoint[];
  dischargerRows: LinkedAnalysisDischargerRow[];
  equipmentRows: LinkedAnalysisEquipmentRow[];
  insights: string[];
  /** 水质管网溯源（仅污水厂 + 已配置进水接驳映射时） */
  sewerTrace: SewerTraceDemoResult | null;
};

export type LinkedAnalysisInput = {
  scene: LinkedAnalysisEventScene;
  eventId: string;
  facilityCode: string;
  facilityName: string;
  eventType: string;
  eventTime: string;
  /** 厂进口告警指标（溯源排序与监测吻合演示） */
  告警指标?: string;
};

const hourLabels = Array.from({ length: 31 }, (_, idx) => idx - 24);
const toSeed = (text: string) =>
  Array.from(text).reduce((sum, ch, idx) => sum + ch.charCodeAt(0) * (idx + 1), 0);

const getPlantOutletCode = (plantCode: string): string | undefined =>
  plantData.find(item => item.id === plantCode)?.linkedOutletCode;

const buildInfluentSeries = (seedText: string, eventType: string, eventTime: Dayjs): LinkedAnalysisMetricPoint[] => {
  const seed = toSeed(seedText);
  const emphasis = /水质|超标/.test(eventType);
  const centerOffset = emphasis ? 2 : 0;
  return hourLabels.map(offset => {
    const current = eventTime.add(offset, 'hour');
    const waveA = Math.sin((offset + (seed % 7)) / 3) * 0.8;
    const waveB = Math.cos((offset + (seed % 11)) / 4) * 0.6;
    const noise = ((seed + offset * 13) % 9) / 10;
    const nearEvent = Math.abs(offset - centerOffset) <= 2;
    const bump = nearEvent ? (emphasis ? 7.5 : 3.5) : 0;
    return {
      time: current.format('MM-DD HH:mm'),
      COD: Number((43 + waveA * 4 + noise * 2 + bump).toFixed(1)),
      NH3N: Number((3.8 + waveB * 0.9 + noise * 0.3 + (nearEvent ? 1 : 0)).toFixed(2)),
      TP: Number((0.44 + waveA * 0.08 + noise * 0.03 + (nearEvent ? 0.08 : 0)).toFixed(2)),
      TN: Number((16 + waveB * 1.2 + noise * 0.7 + (nearEvent ? 2 : 0)).toFixed(1)),
    };
  });
};

const statusByIndex = (idx: number): LinkedAnalysisDischargerRow['status'] => {
  const mod = idx % 3;
  if (mod === 0) return '正常排放';
  if (mod === 1) return '超标排放';
  return '高负荷排放';
};

const buildDischargerRows = (outletCode: string | undefined, eventType: string): LinkedAnalysisDischargerRow[] => {
  if (!outletCode) return [];
  const rows: LinkedAnalysisDischargerRow[] = [];
  dischargerDemoData
    .filter(item => String(item.linkedOutletCode || '').trim() === outletCode)
    .slice(0, 4)
    .forEach((item, idx) => {
      rows.push({
        key: `d-${item.id}`,
        source: '排水户',
        name: item.dischargerName,
        status: statusByIndex(idx),
        peakCod: 42 + idx * 8,
        peakNh3n: Number((3.4 + idx * 0.6).toFixed(1)),
        note: `关联排口 ${outletCode}，${/水质|超标/.test(eventType) && idx === 1 ? '事件前后负荷上行明显' : '维持常规排放'}`,
      });
    });

  ruralSewageTreatmentInitial
    .filter(item => String(item.linkedOutletCode || '').trim() === outletCode)
    .slice(0, 1)
    .forEach(item => {
      rows.push({
        key: `r-${item.id}`,
        source: '农村污水及集中处理设施',
        name: item.unitName,
        status: '正常排放',
        peakCod: 36,
        peakNh3n: 2.8,
        note: '乡镇集中处理设施，排放波动较小',
      });
    });

  industryPollutionInitial
    .filter(item => String(item.linkedOutletCode || '').trim() === outletCode)
    .slice(0, 1)
    .forEach(item => {
      rows.push({
        key: `i-${item.id}`,
        source: '工业企业污染源',
        name: item.unitName,
        status: '高负荷排放',
        peakCod: 58,
        peakNh3n: 4.9,
        note: '工业来源需重点核查工况切换时段',
      });
    });

  agriRuralPollutionInitial
    .filter(item => String(item.linkedOutletCode || '').trim() === outletCode)
    .slice(0, 1)
    .forEach(item => {
      rows.push({
        key: `a-${item.id}`,
        source: '农业农村源',
        name: item.farmName,
        status: '正常排放',
        peakCod: 34,
        peakNh3n: 2.2,
        note: '农业面源受降雨影响明显',
      });
    });
  return rows.slice(0, 6);
};

const buildEquipmentRows = (facilityName: string, eventType: string): LinkedAnalysisEquipmentRow[] => {
  const isDeviceEvent = /设备|故障|停机/.test(eventType);
  return [
    {
      key: 'eq-1',
      name: `${facilityName} 进水提升泵组`,
      status: isDeviceEvent ? '异常' : '运行',
      alarm: isDeviceEvent ? '事件时段出现高温告警，持续 32 分钟' : '运行平稳，未见明显告警',
    },
    {
      key: 'eq-2',
      name: `${facilityName} 预处理加药系统`,
      status: /水质|超标/.test(eventType) ? '异常' : '运行',
      alarm: /水质|超标/.test(eventType) ? '加药量短时上调，疑似进水冲击导致' : '加药曲线在控制区间内',
    },
    {
      key: 'eq-3',
      name: `${facilityName} 出水在线监测仪`,
      status: '运行',
      alarm: '采样与上传链路正常',
    },
  ];
};

const buildInsights = (
  result: Omit<LinkedAnalysisDemoResult, 'windowStart' | 'windowEnd' | 'sewerTrace'>,
  eventType: string,
): string[] => {
  const codPeak = result.series.reduce((acc, item) => Math.max(acc, item.COD), 0);
  const nh3nPeak = result.series.reduce((acc, item) => Math.max(acc, item.NH3N), 0);
  const hasDischargeRisk = result.dischargerRows.some(item => item.status !== '正常排放');
  const hasEquipRisk = result.equipmentRows.some(item => item.status !== '运行');
  const out: string[] = [];
  if (codPeak > 50 || nh3nPeak > 4.6) {
    out.push(
      `时间维：进水指标在事件窗口内出现异常峰值（COD 峰值 ${codPeak.toFixed(1)}，氨氮峰值 ${nh3nPeak.toFixed(2)}）；建议与上游纳管水质监测过程及接驳户排放节律对照。`,
    );
  }
  if (hasDischargeRisk) {
    const hit = result.dischargerRows.filter(item => item.status !== '正常排放').slice(0, 2).map(item => item.name).join('、');
    out.push(`关联纳管主体存在高风险排放迹象，建议优先复核：${hit}。`);
  }
  if (hasEquipRisk) {
    const hit = result.equipmentRows.filter(item => item.status !== '运行').map(item => item.name).join('、');
    out.push(`设备链路发现异常状态，建议结合告警日志排查：${hit}。`);
  }
  if (/水质|超标/.test(eventType) && hasDischargeRisk) {
    out.push('该事件更符合“进水冲击 + 上游排放波动”的复合诱因。');
  } else if (/设备|故障/.test(eventType)) {
    out.push('该事件以设备运行异常为主因，建议同步核对维护记录与备件寿命。');
  }
  if (!out.length) {
    out.push('未识别到明显异常链路，建议扩大时间窗并补充更高频率监测数据。');
  }
  return out;
};

export const buildEventLinkedAnalysisDemo = (input: LinkedAnalysisInput): LinkedAnalysisDemoResult => {
  const eventTime = dayjs(input.eventTime);
  const safeEventTime = eventTime.isValid() ? eventTime : dayjs();
  const windowStart = safeEventTime.subtract(24, 'hour');
  const windowEnd = safeEventTime.add(6, 'hour');
  const outletCode = input.scene === 'plant' ? getPlantOutletCode(input.facilityCode) : undefined;
  const series = buildInfluentSeries(`${input.scene}-${input.eventId}-${input.facilityCode}`, input.eventType, safeEventTime);
  const dischargerRows = buildDischargerRows(outletCode, input.eventType);
  const equipmentRows = buildEquipmentRows(input.facilityName, input.eventType);

  let sewerTrace: SewerTraceDemoResult | null = null;
  if (input.scene === 'plant') {
    sewerTrace = buildSewerTraceDemo({
      plantCode: input.facilityCode,
      eventId: input.eventId,
      alarmMetric: normalizeAlarmMetric(input.告警指标),
      eventOccurredAt: safeEventTime.format('YYYY-MM-DD HH:mm:ss'),
    });
  }

  const insightBase = buildInsights({ series, dischargerRows, equipmentRows, insights: [] }, input.eventType);
  const insights = sewerTrace ? [...sewerTrace.summaryLines, ...insightBase] : insightBase;

  return {
    windowStart,
    windowEnd,
    series,
    dischargerRows,
    equipmentRows,
    insights,
    sewerTrace,
  };
};

export const buildUpdatedAnalysisByWindow = (
  input: LinkedAnalysisInput,
  windowStart: Dayjs,
  windowEnd: Dayjs,
): LinkedAnalysisDemoResult => {
  const center = windowStart.add(windowEnd.diff(windowStart, 'hour') / 2, 'hour');
  const merged = buildEventLinkedAnalysisDemo({
    ...input,
    eventTime: center.format('YYYY-MM-DD HH:mm:ss'),
  });
  return {
    ...merged,
    windowStart,
    windowEnd,
  };
};
