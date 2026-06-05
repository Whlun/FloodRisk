import type { ZhtMonitoringPoiDemo } from './zhtPoiMonitoringDemo';
import { riverOutletVerificationInitial } from '../韶山水环境设施管理系统/facility-river-outlet-verification-data';
import { outletResponsiblePartyInitial } from '../韶山水环境设施管理系统/facility-outlet-responsible-data';

export type SectionTraceMetricKey = 'COD' | 'NH3N' | 'TP' | 'TN' | 'PH';

export type SectionTraceSeriesPoint = {
  time: string;
  waterTemp: number;
  rainfall: number;
  flowSpeed: number;
  pollutionIndex: number;
};

export type SectionTraceSourceHit = {
  rank: number;
  outletCode: string;
  outletName: string;
  waterBodyCode: string;
  waterBodyName: string;
  partyName: string;
  matchMetric: string;
  score: number;
  reason: string;
  outletLng: number;
  outletLat: number;
  occurredAt: string;
};

export type SectionTraceAnalysisResult = {
  traceId: string;
  stationId: string;
  stationName: string;
  stationLng: number;
  stationLat: number;
  alarmOccurredAt: string;
  metricKey: SectionTraceMetricKey;
  metricLabel: string;
  waterBodyCode: string;
  waterBodyName: string;
  flowDirection: string;
  pollutionLevel: '轻度' | '中度' | '重度';
  flowSpeedNow: number;
  rainfallStationName: string;
  series48h: SectionTraceSeriesPoint[];
  topSources: SectionTraceSourceHit[];
  resultLines: string[];
};

type SectionTraceBinding = {
  waterBodyCode: string;
  waterBodyName: string;
  flowDirection: string;
  flowSpeedBase: number;
  rainfallStationName: string;
};

const SECTION_TRACE_BINDINGS: Record<string, SectionTraceBinding> = {
  'mon-1': {
    waterBodyCode: 'ROV-430382-SHAOHE',
    waterBodyName: '韶河',
    flowDirection: '由南向北',
    flowSpeedBase: 0.14,
    rainfallStationName: '湘溪闸内港',
  },
  'mon-2': {
    waterBodyCode: 'ROV-430382-SHAOHE',
    waterBodyName: '韶河',
    flowDirection: '由南向北',
    flowSpeedBase: 0.17,
    rainfallStationName: '湘溪闸内港',
  },
  'mon-3': {
    waterBodyCode: 'ROV-430382-SHAOHE',
    waterBodyName: '韶河',
    flowDirection: '由南向北',
    flowSpeedBase: 0.12,
    rainfallStationName: '湘溪闸内港',
  },
};

const METRIC_ALIAS: Record<SectionTraceMetricKey, string[]> = {
  COD: ['化学需氧量', 'cod'],
  NH3N: ['氨氮', 'nh3', 'nh3n'],
  TP: ['总磷', 'tp'],
  TN: ['总氮', 'tn'],
  PH: ['ph', '酸碱度'],
};

function metricFromDemo(mon: ZhtMonitoringPoiDemo): SectionTraceMetricKey {
  for (const row of mon.metrics) {
    if (row.tone !== 'danger') continue;
    const n = row.name.toLowerCase();
    if (n.includes('cod')) return 'COD';
    if (n.includes('氨')) return 'NH3N';
    if (n.includes('总磷')) return 'TP';
    if (n.includes('总氮')) return 'TN';
    if (n.includes('ph')) return 'PH';
  }
  for (const row of mon.metrics) {
    const n = row.name.toLowerCase();
    if (n.includes('cod')) return 'COD';
    if (n.includes('氨')) return 'NH3N';
    if (n.includes('总磷')) return 'TP';
    if (n.includes('总氮')) return 'TN';
    if (n.includes('ph')) return 'PH';
  }
  return 'COD';
}

function metricLabel(metric: SectionTraceMetricKey): string {
  if (metric === 'NH3N') return '氨氮';
  return metric;
}

function metricMatches(metric: SectionTraceMetricKey, pollutantName: string): boolean {
  const key = pollutantName.toLowerCase();
  return METRIC_ALIAS[metric].some(alias => key.includes(alias));
}

function metricInterpretationLabel(metric: SectionTraceMetricKey): string {
  if (metric === 'COD') return '化学需氧量';
  if (metric === 'NH3N') return '氨氮';
  if (metric === 'TP') return '总磷';
  if (metric === 'TN') return '总氮';
  return 'pH';
}

function buildSourceReason(params: {
  metricKey: SectionTraceMetricKey;
  metricLabel: string;
  hitPollutantName: string | null;
  isMainPollutant: boolean;
  isFeaturePollutant: boolean;
  actualConc?: number;
  permitConc?: number;
  actualAmount?: number;
  permitAmount?: number;
  isDischarging: boolean;
  rainfall: number;
}): string {
  const {
    metricKey,
    metricLabel,
    hitPollutantName,
    isMainPollutant,
    isFeaturePollutant,
    actualConc,
    permitConc,
    actualAmount,
    permitAmount,
    isDischarging,
    rainfall,
  } = params;
  const metricBizName = metricInterpretationLabel(metricKey);
  const pollutantName = hitPollutantName || metricBizName;
  const concReady = Number.isFinite(actualConc) && Number.isFinite(permitConc) && (permitConc ?? 0) > 0;
  const amountReady = Number.isFinite(actualAmount) && Number.isFinite(permitAmount) && (permitAmount ?? 0) > 0;

  const parts: string[] = [];
  parts.push(`当前断面告警参数为${metricLabel}，责任主体排放清单命中污染物「${pollutantName}」。`);
  if (concReady) {
    const ratio = Number(((actualConc as number) / (permitConc as number)).toFixed(2));
    parts.push(
      `${pollutantName}实际排放浓度 ${(actualConc as number).toFixed(2)} mg/L（许可 ${(permitConc as number).toFixed(2)} mg/L，浓度比 ${ratio}）。`,
    );
  } else {
    parts.push(`该主体存在${pollutantName}排放记录，但当前台账缺少完整浓度对比字段。`);
  }
  if (amountReady) {
    const ratio = Number(((actualAmount as number) / (permitAmount as number)).toFixed(2));
    parts.push(
      `对应排放量 ${(actualAmount as number).toFixed(2)} t/a（许可 ${(permitAmount as number).toFixed(2)} t/a，排放量比 ${ratio}）。`,
    );
  }
  if (isMainPollutant || isFeaturePollutant) {
    const tags = [isMainPollutant ? '主要污染物' : '', isFeaturePollutant ? '特征污染物' : ''].filter(Boolean).join('、');
    parts.push(`该污染物被标注为${tags}，与本次告警参数关联度高。`);
  }
  parts.push(
    isDischarging
      ? `排口状态为排水，且近时段降雨量 ${rainfall.toFixed(2)} mm，具备入河影响传播条件。`
      : `排口当前非持续排水，但在降雨量 ${rainfall.toFixed(2)} mm 条件下存在间歇入河风险。`,
  );
  return parts.join('');
}

function timeLabel(offset: number): string {
  const now = new Date(Date.now() + offset * 3600_000);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  return `${mm}-${dd} ${hh}:00`;
}

function fullTimeLabel(offsetHours: number): string {
  const now = new Date(Date.now() + offsetHours * 3600_000);
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function buildSeries48h(flowBase: number): SectionTraceSeriesPoint[] {
  const out: SectionTraceSeriesPoint[] = [];
  for (let i = -32; i <= 16; i += 2) {
    const rainPulse = i >= -14 && i <= -6 ? 0.42 : i >= -4 && i <= 0 ? 0.2 : 0;
    const rain = Number(Math.max(0, rainPulse + Math.sin(i / 5) * 0.03 + 0.02).toFixed(2));
    const flowSpeed = Number((flowBase + rain * 0.08 + Math.cos(i / 7) * 0.01).toFixed(2));
    const temp = Number((19.4 + Math.cos(i / 9) * 1.6 - rain * 4.5).toFixed(2));
    const pollution = Number((4.2 + rain * 2.2 + flowSpeed * 3.6 + Math.sin(i / 4) * 0.3).toFixed(2));
    out.push({
      time: timeLabel(i),
      waterTemp: temp,
      rainfall: rain,
      flowSpeed,
      pollutionIndex: pollution,
    });
  }
  return out;
}

function levelByTopScore(score: number): '轻度' | '中度' | '重度' {
  if (score >= 85) return '重度';
  if (score >= 65) return '中度';
  return '轻度';
}

export function buildSectionTraceAnalysis(mon: ZhtMonitoringPoiDemo): SectionTraceAnalysisResult | null {
  const binding = SECTION_TRACE_BINDINGS[mon.id];
  if (!binding) return null;
  const metricKey = metricFromDemo(mon);
  const metric = metricLabel(metricKey);
  const series48h = buildSeries48h(binding.flowSpeedBase);

  const sameWaterBodyOutlets = riverOutletVerificationInitial
    .filter(row => row['受纳水体（下拉单选）'] === binding.waterBodyCode)
    .map(row => ({
      outletCode: row.排口编号,
      outletName: row.排口名称,
      waterBodyCode: row['受纳水体（下拉单选）'],
      isDischarging: row['排放状态（下拉单选）'].includes('排水'),
    }));

  const scored = sameWaterBodyOutlets
    .map(outlet => {
      const outletRow = riverOutletVerificationInitial.find(row => row.排口编号 === outlet.outletCode);
      const outletLng = Number(outletRow?.经度 ?? NaN);
      const outletLat = Number(outletRow?.纬度 ?? NaN);
      const party = outletResponsiblePartyInitial.find(row => row.关联排口编码列表.includes(outlet.outletCode));
      const pollutantRows = party?.污染物排放信息列表 ?? [];
      const hitPollutant = pollutantRows.find(p => metricMatches(metricKey, String(p.污染物名称 ?? '')));
      const hasMain = pollutantRows.some(p => p.是否为主要污染物 === 'Y');
      const hasFeature = pollutantRows.some(p => p.是否为特征污染物 === 'Y');
      const rainNow = Number(series48h[series48h.length - 1]?.rainfall ?? 0);
      const scoreBase = outlet.isDischarging ? 55 : 38;
      const metricBonus = hitPollutant ? 24 : 8;
      const mainBonus = hasMain ? 8 : 0;
      const featureBonus = hasFeature ? 6 : 0;
      const rainBonus = rainNow > 0.18 ? 6 : 0;
      const score = Math.min(98, scoreBase + metricBonus + mainBonus + featureBonus + rainBonus);
      return {
        outlet,
        partyName: party?.责任主体名称 ?? '未关联责任主体',
        matchMetric: hitPollutant?.污染物名称 || (metric === 'COD' ? '化学需氧量' : metric),
        score,
        reason: buildSourceReason({
          metricKey,
          metricLabel: metric,
          hitPollutantName: hitPollutant?.污染物名称 ?? null,
          isMainPollutant: hitPollutant?.是否为主要污染物 === 'Y' || hasMain,
          isFeaturePollutant: hitPollutant?.是否为特征污染物 === 'Y' || hasFeature,
          actualConc: hitPollutant?.实际排放浓度,
          permitConc: hitPollutant?.许可排放浓度,
          actualAmount: hitPollutant?.实际排放量,
          permitAmount: hitPollutant?.许可排放量,
          isDischarging: outlet.isDischarging,
          rainfall: rainNow,
        }),
        outletLng,
        outletLat,
      };
    })
    .filter(x => Number.isFinite(x.outletLng) && Number.isFinite(x.outletLat))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((x, idx): SectionTraceSourceHit => ({
      rank: idx + 1,
      outletCode: x.outlet.outletCode,
      outletName: x.outlet.outletName,
      waterBodyCode: x.outlet.waterBodyCode,
      waterBodyName: binding.waterBodyName,
      partyName: x.partyName,
      matchMetric: x.matchMetric,
      score: x.score,
      reason: x.reason,
      outletLng: x.outletLng,
      outletLat: x.outletLat,
      occurredAt: fullTimeLabel(-(idx + 1) * 2),
    }));

  const topScore = scored[0]?.score ?? 50;
  const level = levelByTopScore(topScore);
  const flowNow = series48h[series48h.length - 1]?.flowSpeed ?? binding.flowSpeedBase;

  return {
    traceId: `SEC-${mon.id}-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')}`,
    stationId: mon.id,
    stationName: mon.title,
    stationLng: mon.lng,
    stationLat: mon.lat,
    alarmOccurredAt: fullTimeLabel(0),
    metricKey,
    metricLabel: metric,
    waterBodyCode: binding.waterBodyCode,
    waterBodyName: binding.waterBodyName,
    flowDirection: binding.flowDirection,
    pollutionLevel: level,
    flowSpeedNow: Number(flowNow.toFixed(2)),
    rainfallStationName: binding.rainfallStationName,
    series48h,
    topSources: scored,
    resultLines: [
      `近期${metric}异常，结合48小时气象与水质过程，判定当前汛期污染程度为${level}。`,
      `受纳水体 ${binding.waterBodyName} 水流方向为${binding.flowDirection}，当前流速约 ${Number(flowNow.toFixed(2))} m/s。`,
      `同受纳水体共识别上游排口 ${sameWaterBodyOutlets.length} 个，按参数匹配与责任主体排放信息输出可疑来源 ${scored.length} 个。`,
      scored[0]
        ? `优先核查 ${scored[0].outletName}（责任主体：${scored[0].partyName}），匹配污染物：${scored[0].matchMetric}。`
        : '当前未识别到明确可疑来源，请补充上游排口关联关系后重试。',
      '结论用于原型研判，不作为执法依据。',
    ],
  };
}
