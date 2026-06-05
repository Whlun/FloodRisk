/**
 * 水质事件 · 管网溯源（演示）：一户一分支多链路、纳管接驳点至厂区；
 * 污水厂与怀疑重点排水户 POI，提示板含总量/态势、标识、超标参数与超标发生时间。
 */
import dayjs from 'dayjs';
import type { PsDischargerRecord } from './facility-discharger-data';
import { dischargerDemoData } from './facility-discharger-data';
import { getPlantSewerInletNodeId } from './facility-plant-inlet-node-map';
import { plantData } from './facility-points-data';
import { getPipeNodeById, pipeLineData, type PipeNodeDemoRow } from './pipe-network-demo-data';

export type AlarmMetricCode = 'COD' | 'NH3-N' | 'TP' | 'TN';

export type SewerTracePathStep = {
  nodeId: string;
  label: string;
  isMonitor: boolean;
  monitorMatch?: boolean;
};

export type SewerTraceRankedDischarger = {
  rank: number;
  dischargerId: string;
  name: string;
  jbdId: string;
  score: number;
  reason: string;
};

/** POI 点击提示板：对齐总量与态势、标识名称、超标参数；突出超标发生时间 */
export type SewerTracePopupBoard = {
  poiKind: 'plant' | 'discharger' | 'monitor' | 'inlet_node';
  title: string;
  subtitle?: string;
  /** 结构化标签（示例：清溪镇、重点） */
  badges?: string[];
  /** 结构化地址 */
  location?: string;
  /** 结构化宫格字段（图文卡片） */
  facts?: Array<{ label: string; value: string }>;
  /** 总量类指标（演示）：如日进水总量、许可排量等 */
  volumeSummary?: string;
  /** 态势（演示）：负荷、波动、与告警窗口关系 */
  trendSituation?: string;
  recordCode?: string;
  /** 超标或关联关注的污染物参数 */
  exceedMetrics?: string;
  /** 超标（或过程异常峰值）发生时间 — 提示板最重要字段之一 */
  exceedOccurredAt?: string;
  extraLines?: string[];
};

export type SewerTraceChainDemo = {
  chainId: string;
  rank: number;
  dischargerId: string;
  dischargerName: string;
  jbdId: string;
  score: number;
  reason: string;
  pathSteps: SewerTracePathStep[];
  pathLngLat: [number, number][];
  monitorNodeId?: string;
  monitorNodeLabel?: string;
  monitorSeries: Array<{ time: string; COD: number; NH3N: number; TP: number; TN: number }>;
  pollutantMain: string;
  pollutantClass1: string;
  pollutantClass2: string;
  alarmImpactNote: string;
  lineColor: string;
  dischargerLngLat?: [number, number];
  popupDischarger: SewerTracePopupBoard;
};

export type SewerTraceMapPack = {
  plant?: { lng: number; lat: number; popup: SewerTracePopupBoard };
  chainLines: Array<{
    chainId: string;
    coordinates: [number, number][];
    sourceCoord?: [number, number];
    color: string;
    rank: number;
    dischargerName: string;
  }>;
  suspicionRing: [number, number][];
  markers: Array<{
    markerId: string;
    lng: number;
    lat: number;
    kind: 'plant' | 'discharger' | 'monitor' | 'inlet' | 'pipe';
    /** 用于地图联动：当前点属于哪条链路（plant 无链路） */
    chainId?: string | null;
    title: string;
    popup: SewerTracePopupBoard;
  }>;
};

export type SewerTraceDemoResult = {
  alarmMetric: AlarmMetricCode;
  /** 污水厂↔多户：每户一条纳管溯源链路，需逐条排查 */
  chains: SewerTraceChainDemo[];
  /** 兼容：默认取第一条链路 */
  pathSteps: SewerTracePathStep[];
  rankedDischargers: SewerTraceRankedDischarger[];
  monitorAligned: boolean;
  summaryLines: string[];
  map: SewerTraceMapPack;
};

const CHAIN_LINE_COLORS = ['#1677ff', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'];
/** 演示默认最多展示 3 条链路，便于用户逐条排查 */
const MAX_DEMO_TRACE_CHAINS = 4;

function nodeWaterMonitorFlag(n: PipeNodeDemoRow | undefined): boolean {
  if (!n || n.nodeType !== '1') return false;
  return Boolean((n as { 水质监测点?: boolean }).水质监测点);
}

function collectUpstreamSewageNodes(inletNodeId: string): Set<string> {
  const nodes = new Set<string>([inletNodeId]);
  let frontier = [inletNodeId];
  while (frontier.length) {
    const nextFrontier: string[] = [];
    for (const cur of frontier) {
      for (const line of pipeLineData) {
        if (line.lineCategory !== '2') continue;
        if (line.toNodeId !== cur) continue;
        const u = line.fromNodeId;
        if (!nodes.has(u)) {
          nodes.add(u);
          nextFrontier.push(u);
        }
      }
    }
    frontier = nextFrontier;
  }
  return nodes;
}

/** 沿污水管线从接驳点下游走向厂区进水接驳（fromNode→toNode 为流向） */
function walkDownstreamToInlet(startNodeId: string, inletNodeId: string, upstream: Set<string>): string[] | null {
  if (!upstream.has(startNodeId) || !upstream.has(inletNodeId)) return null;
  const path: string[] = [];
  let cur = startNodeId;
  const guard = new Set<string>();
  while (true) {
    if (guard.has(cur)) return null;
    guard.add(cur);
    path.push(cur);
    if (cur === inletNodeId) return path;
    const outs = pipeLineData.filter(
      l => l.lineCategory === '2' && l.fromNodeId === cur && upstream.has(String(l.toNodeId)),
    );
    if (!outs.length) return null;
    outs.sort((a, b) => a.lineId.localeCompare(b.lineId));
    cur = String(outs[0].toNodeId);
    if (path.length > upstream.size + 4) return null;
  }
}

function buildOrderedChain(inletNodeId: string, upstream: Set<string>): string[] {
  const seq: string[] = [];
  let cur = inletNodeId;
  seq.unshift(cur);
  while (true) {
    const incoming = pipeLineData
      .filter(l => l.lineCategory === '2' && l.toNodeId === cur && upstream.has(l.fromNodeId))
      .sort((a, b) => a.lineId.localeCompare(b.lineId));
    const pick = incoming[0];
    if (!pick) break;
    cur = pick.fromNodeId;
    seq.unshift(cur);
  }
  return seq;
}

const seedStr = (s: string) =>
  Array.from(s).reduce((acc, ch, i) => acc + ch.charCodeAt(0) * (i + 3), 0);

function demoMonitorMatchesAlarm(eventId: string, nodeId: string, metric: AlarmMetricCode): boolean {
  const s = seedStr(`${eventId}-${nodeId}-${metric}`);
  return s % 4 !== 0;
}

function pollutantText(d: PsDischargerRecord): string {
  return [d.grade1Pollutant, d.grade2Pollutant, d.material, d.process]
    .filter(Boolean)
    .map(x => String(x))
    .join('；');
}

function scoreDischargerAgainstAlarm(metric: AlarmMetricCode, d: PsDischargerRecord): number {
  const text = pollutantText(d).toUpperCase();
  let score = 0;
  const hit = (re: RegExp, w: number) => {
    if (re.test(text)) score += w;
  };
  if (metric === 'COD') {
    hit(/COD|化学需氧量|有机物|油脂|动植物油/, 42);
    hit(/氨氮|NH/, 14);
  } else if (metric === 'NH3-N') {
    hit(/氨氮|NH|氮/, 46);
    hit(/COD|有机物/, 18);
  } else if (metric === 'TP') {
    hit(/磷|TP|总磷/, 46);
    hit(/COD/, 12);
  } else if (metric === 'TN') {
    hit(/总氮|TN|氨氮|氮/, 46);
    hit(/COD|有机物/, 14);
  }
  if (d.keyDischarger === '1') score += 8;
  score += seedStr(d.id + metric) % 9;
  return Math.min(100, score);
}

function demoHistoryRiskScore(dischargerId: string): number {
  // 历史风险（演示）：映射“近周期超标次数、投诉、督办”等综合风险
  return 6 + (seedStr(`${dischargerId}-history`) % 13); // 6~18
}

function demoTimeLagScore(eventId: string, dischargerId: string): { score: number; lagMinutes: number } {
  // 时间维（演示）：假设最佳滞后约 45 分钟，越偏离得分越低
  const lagMinutes = 10 + (seedStr(`${eventId}-${dischargerId}-lag`) % 150); // 10~159
  const score = Math.max(0, 20 - Math.round(Math.abs(lagMinutes - 45) / 4)); // 0~20
  return { score, lagMinutes };
}

function demoSpaceDecayScore(pathHopCount: number): number {
  // 空间维（演示）：路径越短，衰减越小，得分越高
  return Math.max(4, 16 - Math.max(0, pathHopCount - 2) * 2); // 4~16
}

function buildAlarmImpactNote(metric: AlarmMetricCode, d: PsDischargerRecord): string {
  const text = pollutantText(d);
  const m = String(metric || '').toUpperCase();
  if (m === 'NH3-N') {
    return /氨|氮|餐厨|有机/.test(text)
      ? '该户排污成分含氮/有机物，可能抬高厂区 NH3-N 与 TN，触发氨氮类告警。'
      : '该户与氨氮关联度中等，更多依赖监测时序与链路位置联合判断。';
  }
  if (m === 'COD') {
    return /COD|有机|油|餐厨/.test(text)
      ? '该户有机污染物负荷可能抬高进水 COD，并伴随溶解氧消耗，易触发 COD 告警。'
      : '该户对 COD 影响可能有限，需要结合上游监测峰值进一步判定。';
  }
  if (m === 'TP') {
    return /磷|TP|总磷/.test(text)
      ? '该户含磷相关排污成分，可能推高进水 TP，存在触发总磷告警风险。'
      : '该户含磷特征不明显，需结合监测点 TP 曲线持续观察。';
  }
  return /氮|NH|氨/.test(text)
    ? '该户含氮排污成分可能推高 TN/NH3-N，存在触发总氮告警风险。'
    : '该户总氮关联度一般，建议结合历史曲线与现场采样复核。';
}

function buildMonitorHistorySeries(
  monitorNodeId: string | undefined,
  eventOccurredAt: string,
  metric: AlarmMetricCode,
  dischargerId: string,
): Array<{ time: string; COD: number; NH3N: number; TP: number; TN: number }> {
  if (!monitorNodeId) return [];
  const base = dayjs(eventOccurredAt).isValid() ? dayjs(eventOccurredAt).subtract(6, 'hour') : dayjs().subtract(6, 'hour');
  const s = seedStr(`${monitorNodeId}-${dischargerId}-${metric}`);
  const out: Array<{ time: string; COD: number; NH3N: number; TP: number; TN: number }> = [];
  for (let i = 0; i < 12; i++) {
    const t = base.add(i, 'hour');
    const ripple = ((s + i * 7) % 9) * 0.08;
    const peak = i >= 5 && i <= 7 ? 1.0 : 0.0;
    out.push({
      time: t.format('MM-DD HH:mm'),
      COD: Number((40 + i * 0.7 + ripple * 4 + (metric === 'COD' ? peak * 11 : 0)).toFixed(1)),
      NH3N: Number((2.8 + i * 0.06 + ripple + (metric === 'NH3-N' ? peak * 1.6 : 0)).toFixed(2)),
      TP: Number((0.34 + i * 0.01 + ripple * 0.12 + (metric === 'TP' ? peak * 0.24 : 0)).toFixed(2)),
      TN: Number((13.6 + i * 0.2 + ripple * 1.6 + (metric === 'TN' ? peak * 3.2 : 0)).toFixed(1)),
    });
  }
  return out;
}

function buildPathSteps(
  chainIds: string[],
  inletNodeId: string,
  eventId: string,
  metric: AlarmMetricCode,
): SewerTracePathStep[] {
  return chainIds.map(nodeId => {
    const n = getPipeNodeById(nodeId);
    const mon = nodeWaterMonitorFlag(n);
    let monitorMatch: boolean | undefined;
    if (mon) monitorMatch = demoMonitorMatchesAlarm(eventId, nodeId, metric);
    const mh =
      n && 'manholeCategory' in n && n.manholeCategory ? String(n.manholeCategory) : '管点';
    const road = n?.roadName ? `${n.roadName} · ` : '';
    const tag =
      nodeId === inletNodeId ? '污水厂进水接驳点' : mon ? `水质监测 · ${mh}` : mh;
    return {
      nodeId,
      label: `${road}${tag}（${nodeId}）`,
      isMonitor: mon,
      monitorMatch,
    };
  });
}

function pathLngLatFromSteps(steps: SewerTracePathStep[]): [number, number][] {
  const pathLngLat: [number, number][] = [];
  for (const step of steps) {
    const n = getPipeNodeById(step.nodeId);
    if (n && typeof n.x === 'number' && typeof n.y === 'number') {
      pathLngLat.push([n.x, n.y]);
    }
  }
  return pathLngLat;
}

function buildPlantPopup(params: {
  plantName: string;
  plantCode: string;
  plantAddr?: string;
  metric: AlarmMetricCode;
  eventOccurredAt: string;
  seed: number;
}): SewerTracePopupBoard {
  const vol = 7800 + (params.seed % 900);
  return {
    poiKind: 'plant',
    title: params.plantName,
    subtitle: '污水厂（纳管汇水末端）',
    location: String(params.plantAddr || '—'),
    recordCode: params.plantCode,
    volumeSummary: `昨日进水总量约 ${vol.toLocaleString()} m³（演示口径）`,
    trendSituation: `告警窗口内进水负荷偏高，与在线仪表过程态势一致（演示）。`,
    exceedMetrics: `${params.metric}（告警指标）；联动关注 NH3-N、TP（演示）`,
    exceedOccurredAt: params.eventOccurredAt,
    extraLines: ['厂区进水采样点：接驳井在线监测（演示）', '说明：以下为原型推演，非执法结论'],
  };
}

function buildDischargerPopup(params: {
  d: PsDischargerRecord;
  metric: AlarmMetricCode;
  rank: number;
  score: number;
  eventOccurredAt: string;
  chainIdx: number;
}): SewerTracePopupBoard {
  const offsetMin = (seedStr(`${params.d.id}-${params.chainIdx}`) % 120) + 5;
  const t = dayjs(params.eventOccurredAt).isValid()
    ? dayjs(params.eventOccurredAt).subtract(offsetMin, 'minute').format('YYYY-MM-DD HH:mm')
    : params.eventOccurredAt;
  const pt = pollutantText(params.d);
  const conciseFactors = pt
    .split('；')
    .map(x => x.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join('、');
  return {
    poiKind: 'discharger',
    title: params.d.dischargerName,
    subtitle: '怀疑重点排水户（经接驳点纳管）',
    badges: [String(params.d.manageCode || '—'), params.d.keyDischarger === '1' ? '重点' : '一般'],
    location: String(params.d.addr || '—'),
    facts: [
      { label: '排水户类型', value: String(params.d.dischargerType || '—') },
      { label: '重点排水户', value: params.d.keyDischarger === '1' ? '是' : '否' },
      { label: '关联物联监测', value: params.d.linkedIot === '1' ? '是' : '否' },
      { label: '排入城镇污水', value: params.d.townSewage === '1' ? '是' : '否' },
      { label: '污水处理方式', value: String(params.d.treatmentMethod || '—') },
      { label: '数据来源', value: String(params.d.dataSource || '—') },
    ],
    volumeSummary: `许可核定排量 ${params.d.dischargeQuant ?? '—'} m³/d；推算本期排放贡献度偏高（演示）`,
    trendSituation:
      seedStr(params.d.id) % 2 === 0
        ? '排放节律与厂区进水冲击时段部分重叠（演示）'
        : '接驳点旁在线水质波动加剧（演示）',
    exceedMetrics: `${params.metric}` + (conciseFactors ? `；关联因子：${conciseFactors}` : ''),
    exceedOccurredAt: t,
    extraLines: [`纳管接驳点（管点）：${params.d.jbdId ?? '—'}`, `摸排优先级：第 ${params.rank} 位 · 演示评分 ${params.score}`],
  };
}

function buildMonitorPopup(params: {
  step: SewerTracePathStep;
  metric: AlarmMetricCode;
  eventOccurredAt: string;
  chainHint: string;
}): SewerTracePopupBoard {
  const offsetMin = seedStr(`${params.step.nodeId}-mon`) % 55;
  const t = dayjs(params.eventOccurredAt).isValid()
    ? dayjs(params.eventOccurredAt).subtract(offsetMin + 15, 'minute').format('YYYY-MM-DD HH:mm')
    : params.eventOccurredAt;
  const n = getPipeNodeById(params.step.nodeId);
  const road = n?.roadName != null && String(n.roadName).trim() ? String(n.roadName).trim() : '';
  const location = road ? `湖南省湘潭市韶山市清溪镇${road}沿线检查井（演示）` : `管点 ${params.step.nodeId}（演示）`;
  const trendNote = params.step.monitorMatch
    ? '过程曲线与告警指标同类异常（演示吻合）'
    : '未见同类异常峰值（演示）';
  return {
    poiKind: 'monitor',
    title: `纳管水质监测 · ${params.step.nodeId}`,
    location,
    exceedMetrics: `${params.metric}；关联因子：${params.chainHint} · ${trendNote}`,
    exceedOccurredAt: t,
  };
}


function ringFromCoords(coords: [number, number][]): [number, number][] {
  if (coords.length < 2) return [];
  let minLng = coords[0][0];
  let maxLng = coords[0][0];
  let minLat = coords[0][1];
  let maxLat = coords[0][1];
  for (const [lng, lat] of coords) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  const pad = 0.0035;
  return [
    [minLng - pad, minLat - pad],
    [maxLng + pad, minLat - pad],
    [maxLng + pad, maxLat + pad],
    [minLng - pad, maxLat + pad],
    [minLng - pad, minLat - pad],
  ];
}

function buildMapPack(params: {
  plant?: { lng: number; lat: number; popup: SewerTracePopupBoard };
  chains: SewerTraceChainDemo[];
  inletNodeId: string;
  eventOccurredAt: string;
  alarmMetric: AlarmMetricCode;
}): SewerTraceMapPack {
  const plantCoord: [number, number] | undefined = params.plant
    ? [params.plant.lng, params.plant.lat]
    : undefined;

  const chainLines = params.chains.map(c => {
    const originalCoords = c.pathLngLat;
    const src = c.dischargerLngLat;

    // 业务关系：排水户 ->（沿线水质监测点，可选）-> 污水厂
    // - 若存在“沿线监测点”（排除该链路自己的接驳点），则实线包含三段节点：排水户 -> 监测点 -> 污水厂
    // - 若不存在，则实线仅包含两段：排水户 -> 污水厂
    const jbdId = String(c.jbdId || '').trim();
    const firstAlongMonitorIdx = c.pathSteps.findIndex(
      s => s.isMonitor && String(s.nodeId || '').trim() !== jbdId,
    );

    if (src && plantCoord) {
      if (firstAlongMonitorIdx >= 0) {
        const monitorStep = c.pathSteps[firstAlongMonitorIdx];
        const monitorNodeId = String(monitorStep?.nodeId || '').trim();
        const mn = monitorNodeId ? getPipeNodeById(monitorNodeId) : undefined;
        const monitorCoord: [number, number] | undefined =
          mn && typeof mn.x === 'number' && typeof mn.y === 'number' ? [mn.x, mn.y] : undefined;
        if (monitorCoord) {
          return {
            chainId: c.chainId,
            coordinates: [src, monitorCoord, plantCoord],
            sourceCoord: src,
            color: c.lineColor,
            rank: c.rank,
            dischargerName: c.dischargerName,
          };
        }
      }
      return {
        chainId: c.chainId,
        coordinates: [src, plantCoord],
        sourceCoord: src,
        color: c.lineColor,
        rank: c.rank,
        dischargerName: c.dischargerName,
      };
    }

    // 兜底：若缺少关键坐标，退回原始拓扑坐标
    const coordinates: [number, number][] = plantCoord ? [...originalCoords, plantCoord] : originalCoords;

    return {
      chainId: c.chainId,
      coordinates,
      sourceCoord: src,
      color: c.lineColor,
      rank: c.rank,
      dischargerName: c.dischargerName,
    };
  });

  const allCoords: [number, number][] = [];
  for (const c of params.chains) allCoords.push(...c.pathLngLat);
  if (params.plant) {
    allCoords.push([params.plant.lng, params.plant.lat]);
  }
  for (const c of params.chains) {
    const d = dischargerDemoData.find(x => x.id === c.dischargerId);
    if (d?.coordX != null && d.coordY != null) allCoords.push([d.coordX, d.coordY]);
  }

  const suspicionRing = ringFromCoords(allCoords);

  const markers: SewerTraceMapPack['markers'] = [];
  const seen = new Set<string>();

  if (params.plant) {
    const mid = `plant-${params.plant.lng}-${params.plant.lat}`;
    markers.push({
      markerId: mid,
      lng: params.plant.lng,
      lat: params.plant.lat,
      kind: 'plant',
      title: params.plant.popup.title,
      popup: params.plant.popup,
    });
  }

  for (const c of params.chains) {
    const d = dischargerDemoData.find(x => x.id === c.dischargerId);
    if (!d || d.coordX == null || d.coordY == null) continue;
    const mid = `disc-${d.id}`;
    if (seen.has(mid)) continue;
    seen.add(mid);
    markers.push({
      markerId: mid,
      lng: d.coordX,
      lat: d.coordY,
      kind: 'discharger',
      title: d.dischargerName,
      chainId: c.chainId,
      popup: c.popupDischarger,
    });
  }

  /** 沿线井位去重（多链路共用接驳井 / 监测点时只打一个点） */
  const seenPipeMarkers = new Set<string>();
  // 接驳点与排水户一一对应：地图上不再单独展示“该链路接驳点”的监测点
  for (let ci = 0; ci < params.chains.length; ci++) {
    const c = params.chains[ci];
    const hint = `链路${ci + 1} · ${c.dischargerName}`;
    for (const step of c.pathSteps) {
      if (!step.isMonitor) continue;
      // 每条链路只排除自己的接驳点监测点：保证与左侧“该链路的沿线监测点”一致
      if (String(step.nodeId || '').trim() === String(c.jbdId || '').trim()) continue;

      const markerKey = `${step.nodeId}-${c.chainId}`;
      if (seenPipeMarkers.has(markerKey)) continue;
      seenPipeMarkers.add(markerKey);

      const n = getPipeNodeById(step.nodeId);
      if (!n || n.x == null || n.y == null) continue;

      markers.push({
        markerId: `mon-${step.nodeId}-${c.chainId}`,
        lng: n.x,
        lat: n.y,
        kind: 'monitor',
        title: step.nodeId,
        chainId: c.chainId,
        popup: buildMonitorPopup({
          step,
          metric: params.alarmMetric,
          eventOccurredAt: params.eventOccurredAt,
          chainHint: hint,
        }),
      });
    }
  }

  return {
    plant: params.plant,
    chainLines,
    suspicionRing,
    markers,
  };
}

export function normalizeAlarmMetric(v?: string): AlarmMetricCode {
  const s = String(v || '')
    .trim()
    .toUpperCase();
  if (/NH|氨氮/.test(v || '')) return 'NH3-N';
  if (/总磷|TP/.test(v || '')) return 'TP';
  if (/总氮|TN/.test(v || '')) return 'TN';
  if (/COD/.test(s)) return 'COD';
  return 'COD';
}

export function buildSewerTraceDemo(params: {
  plantCode: string;
  eventId: string;
  alarmMetric: AlarmMetricCode;
  /** 事件发生时间，用于演示超标时刻与上游滞后推演 */
  eventOccurredAt: string;
}): SewerTraceDemoResult | null {
  const inlet = getPlantSewerInletNodeId(params.plantCode);
  if (!inlet) return null;

  const plantRow = plantData.find(p => p.id === params.plantCode);
  const plantLngLat =
    plantRow && typeof plantRow.x === 'number' && typeof plantRow.y === 'number'
      ? { lng: plantRow.x, lat: plantRow.y }
      : undefined;

  const upstream = collectUpstreamSewageNodes(inlet);
  const fallbackChain = buildOrderedChain(inlet, upstream);

  const keyCandidates = dischargerDemoData.filter(
    d => d.keyDischarger === '1' && String(d.jbdId || '').trim() && upstream.has(String(d.jbdId).trim()),
  );

  const rankedDischargers: SewerTraceRankedDischarger[] = keyCandidates
    .map(d => {
      const jbd = String(d.jbdId || '').trim();
      let nodeSeq = walkDownstreamToInlet(jbd, inlet, upstream);
      if (!nodeSeq || nodeSeq.length < 2) nodeSeq = [...fallbackChain];
      const pathSteps = buildPathSteps(nodeSeq, inlet, params.eventId, params.alarmMetric);
      const monitorNodes = pathSteps.filter(s => s.isMonitor);
      const monitorHitCount = monitorNodes.filter(s => s.monitorMatch).length;
      const monitorScore =
        monitorNodes.length > 0
          ? Math.round((monitorHitCount / monitorNodes.length) * 22) // 0~22
          : 6; // 无监测点时给基础分
      const metricScore = scoreDischargerAgainstAlarm(params.alarmMetric, d); // 0~100（旧规则）
      const metricNormalized = Math.round(metricScore * 0.42); // 0~42
      const { score: timeScore, lagMinutes } = demoTimeLagScore(params.eventId, d.id); // 0~20
      const spaceScore = demoSpaceDecayScore(pathSteps.length); // 4~16
      const historyScore = demoHistoryRiskScore(d.id); // 6~18
      const total = Math.min(100, metricNormalized + monitorScore + timeScore + spaceScore + historyScore);
      const reason = `参数匹配${metricNormalized}（${params.alarmMetric}）+监测吻合${monitorScore}（${monitorHitCount}/${monitorNodes.length || 0}）+时间滞后${timeScore}（约${lagMinutes}分钟）+空间衰减${spaceScore}（${pathSteps.length}跳）+历史风险${historyScore} = ${total}`;
      return { d, score: total, reason };
    })
    .sort((a, b) => b.score - a.score)
    .map((item, idx) => ({
      rank: idx + 1,
      dischargerId: item.d.id,
      name: item.d.dischargerName,
      jbdId: String(item.d.jbdId || ''),
      score: item.score,
      reason: item.reason,
    }));

  const chains: SewerTraceChainDemo[] = [];
  // 同一接驳点只保留评分最高的一户，避免链路重叠成“一条线”
  const byJbd = new Map<string, SewerTraceRankedDischarger>();
  for (const row of rankedDischargers) {
    const key = String(row.jbdId || '').trim();
    if (!key) continue;
    if (!byJbd.has(key)) byJbd.set(key, row);
  }
  const topRanked = [...byJbd.values()].slice(0, MAX_DEMO_TRACE_CHAINS);
  let idx = 0;
  for (const r of topRanked) {
    const d = dischargerDemoData.find(x => x.id === r.dischargerId);
    if (!d) continue;
    const jbd = String(d.jbdId || '').trim();
    let nodeSeq = walkDownstreamToInlet(jbd, inlet, upstream);
    if (!nodeSeq || nodeSeq.length < 2) {
      nodeSeq = [...fallbackChain];
    }
    const pathSteps = buildPathSteps(nodeSeq, inlet, params.eventId, params.alarmMetric);
    const pathLngLat = pathLngLatFromSteps(pathSteps);
    // 中间监测点是“沿线水质监测点”（排除该链路自己的接驳点监测点）
    const monitorNode = pathSteps.find(s => s.isMonitor && String(s.nodeId || '').trim() !== jbd);
    const monitorSeries = buildMonitorHistorySeries(monitorNode?.nodeId, params.eventOccurredAt, params.alarmMetric, d.id);
    const lineColor = CHAIN_LINE_COLORS[idx % CHAIN_LINE_COLORS.length];
    const popupDischarger = buildDischargerPopup({
      d,
      metric: params.alarmMetric,
      rank: r.rank,
      score: r.score,
      eventOccurredAt: params.eventOccurredAt,
      chainIdx: idx,
    });
    chains.push({
      chainId: `chain-${d.id}`,
      rank: r.rank,
      dischargerId: d.id,
      dischargerName: d.dischargerName,
      jbdId: jbd,
      score: r.score,
      reason: r.reason,
      pathSteps,
      pathLngLat,
      monitorNodeId: monitorNode?.nodeId,
      monitorNodeLabel: monitorNode?.label,
      monitorSeries,
      pollutantMain: String(d.material || d.process || '—'),
      pollutantClass1: String(d.grade1Pollutant || '—'),
      pollutantClass2: String(d.grade2Pollutant || '—'),
      alarmImpactNote: buildAlarmImpactNote(params.alarmMetric, d),
      lineColor,
      dischargerLngLat: d.coordX != null && d.coordY != null ? [d.coordX, d.coordY] : undefined,
      popupDischarger,
    });
    idx += 1;
  }

  const pathSteps = chains[0]?.pathSteps ?? [];

  const monitorAligned = chains.some(c =>
    c.pathSteps.some(s => s.isMonitor && s.monitorMatch === true),
  );

  const plantPopup =
    plantLngLat && plantRow
      ? buildPlantPopup({
          plantName: plantRow.name,
          plantCode: params.plantCode,
          plantAddr: String((plantRow as { addr?: string }).addr || ''),
          metric: params.alarmMetric,
          eventOccurredAt: params.eventOccurredAt,
          seed: seedStr(params.eventId + params.plantCode),
        })
      : undefined;

  const map = buildMapPack({
    plant: plantLngLat && plantPopup ? { ...plantLngLat, popup: plantPopup } : undefined,
    chains,
    inletNodeId: inlet,
    eventOccurredAt: params.eventOccurredAt,
    alarmMetric: params.alarmMetric,
  });

  const summaryLines: string[] = [];
  summaryLines.push(
    '研判口径（演示）：重点排水户通过接驳点「纳管」接入市政污水管网；纳管沿线布设水质监测点。污水厂联合「时间」（事件窗口内厂区进水与上游监测过程数据）与「空间」（由进水口沿管网向上的拓扑与监测点位置）溯源可疑超标排放主体。',
  );
  summaryLines.push(`告警关注指标：${params.alarmMetric}（演示推断，非执法结论）。`);
  summaryLines.push(
    monitorAligned
      ? '沿纳管上游的水质监测过程中，存在与告警指标同类异常的演示吻合，建议结合采样与执法规程复核。'
      : '沿纳管上游监测过程演示未呈现同类异常吻合，建议扩大时间窗或加密监测点位。',
  );
  summaryLines.push(
    `空间推演：上游管网可达管点 ${upstream.size} 个；纳管重点排水户 ${rankedDischargers.length} 户；当前展示前 ${chains.length} 条独立溯源链路（一户一分支），请逐条结合监测过程数据排查。`,
  );

  return {
    alarmMetric: params.alarmMetric,
    chains,
    pathSteps,
    rankedDischargers,
    monitorAligned,
    summaryLines,
    map,
  };
}
