import type { WaterloggingMonitorPoint } from '../../database/deqing-waterlogging-iot-monitoring';
import { waterloggingAlertEpisodeMap } from '../../database/deqing-waterlogging-alert-episodes';
import { waterloggingPointRegistry } from '../../database/deqing-waterlogging-point-registry';
import { HAZARD_POINT_TYPE_LABEL } from '../deqing-waterlogging-risk/types';
import type {
  AlertEpisode,
  AlertLevel,
  EpisodeComparePoint,
  EpisodeIndexTrendPoint,
  HourlyTrendBucket,
  MonitorPointOverviewRow,
  PointAlertAggregate,
  PointAlertRankRow,
  PointWaterStatusRow,
  AlertLevelChangeLog,
  DurationSeverityTier,
  RiskIndexResult,
  RiskIndexTier,
  RiskTrend,
  WaterDepthTrend,
  WaterloggingIotAlert,
} from './types';
import {
  formatDurationSeverityRulesSummary,
  getEnabledDurationRules,
  getEnabledDurationRulesAsc,
  getRiskIndexConfig,
} from './riskIndexConfig';

export {
  formatDurationSeverityRulesSummary,
  getEnabledDurationRules,
  getEnabledDurationRulesAsc,
  getRiskIndexConfig,
  loadRiskIndexConfig,
  saveRiskIndexConfig,
} from './riskIndexConfig';
export type { RiskIndexConfig, DurationSeverityRule } from './riskIndexConfig';

/** 从持续加重档位解析小时数 */
export function parseDurationTierHours(tier: DurationSeverityTier): number | null {
  if (tier === 'none') return null;
  const n = parseInt(tier.replace(/h$/, ''), 10);
  return Number.isFinite(n) ? n : null;
}

export const DEMO_NOW = new Date('2026-05-25T14:00:00+08:00');

export function getLevelWeight(level: AlertLevel): number {
  return getRiskIndexConfig().levelWeights[level];
}

export function calcIndexFromWeightedSum(w: number, cfg = getRiskIndexConfig()): number {
  return Math.min(cfg.indexMax, Math.round(w * cfg.indexScale));
}

/** 距预警发布的小时数 */
export function calcHoursSincePublish(publishedAt: Date, now: Date = DEMO_NOW): number {
  return Math.max(0, (now.getTime() - publishedAt.getTime()) / MS_HOUR);
}

/** 在发布后 N 小时窗口内是否曾出现预警（用于持续加重：内涝在该时段内发生过即成立） */
function hadAlertsInPostPublishWindow(
  episode: AlertEpisode,
  windowHours: number,
  evalAt: Date,
): boolean {
  const milestone = new Date(
    Math.min(evalAt.getTime(), episode.startAt.getTime() + windowHours * MS_HOUR),
  );
  const inWindow = filterAlertsInPostPublishWindow(episode, windowHours, milestone);
  return aggregateAlertsByPoint(inWindow).length > 0;
}

/** 持续内涝加重：距发布已满 N h 且发布后 N h 内曾出现预警（取已启用规则中 hours 最大且满足的档位） */
export function resolveDurationSeverity(
  episode: AlertEpisode,
  now: Date = DEMO_NOW,
  cfg = getRiskIndexConfig(),
): { hoursSincePublish: number; tier: DurationSeverityTier; bonus: number } {
  const evalAt = getEpisodeEffectiveEnd(episode, now);
  const hours = calcHoursSincePublish(episode.startAt, evalAt);

  if (!cfg.durationSeverityEnabled) {
    return { hoursSincePublish: hours, tier: 'none', bonus: 0 };
  }

  for (const rule of getEnabledDurationRules(cfg)) {
    if (hours >= rule.hours && hadAlertsInPostPublishWindow(episode, rule.hours, evalAt)) {
      return {
        hoursSincePublish: hours,
        tier: `${rule.hours}h` as DurationSeverityTier,
        bonus: rule.bonus,
      };
    }
  }
  return { hoursSincePublish: hours, tier: 'none', bonus: 0 };
}

/** 综合指数 = 基础分（W×系数）+ 持续内涝加重分 */
export function calcEpisodeCompositeIndex(
  episode: AlertEpisode,
  now: Date = DEMO_NOW,
  cfg = getRiskIndexConfig(),
): {
  w: number;
  baseIndex: number;
  durationBonus: number;
  durationTier: DurationSeverityTier;
  hoursSincePublish: number;
  index: number;
} {
  const evalAt = getEpisodeEffectiveEnd(episode, now);
  const w = sumWeightedActivePointsAtMoment(episode.alerts, evalAt);
  const baseIndex = calcIndexFromWeightedSum(w, cfg);
  const duration = resolveDurationSeverity(episode, now, cfg);
  const index = Math.min(cfg.indexMax, baseIndex + duration.bonus);
  return {
    w,
    baseIndex,
    durationBonus: duration.bonus,
    durationTier: duration.tier,
    hoursSincePublish: duration.hoursSincePublish,
    index,
  };
}

const MS_HOUR = 60 * 60 * 1000;
/** 无 episodeId 时，相邻预警间隔超过该小时数则划为新一期 */
const EPISODE_GAP_HOURS = 3;

const LEVEL_RANK: Record<AlertLevel, number> = { low: 1, medium: 2, high: 3 };

function pickHigherLevel(a: AlertLevel, b: AlertLevel): AlertLevel {
  return LEVEL_RANK[a] >= LEVEL_RANK[b] ? a : b;
}

const nameMap = () => new Map(waterloggingPointRegistry.map(r => [r.id, r.name]));

/** 时间窗内按内涝点聚合：同一点位只计一次，等级取窗口内最高 */
export function aggregateAlertsByPoint(alerts: WaterloggingIotAlert[]): PointAlertAggregate[] {
  const map = new Map<
    string,
    {
      peakLevel: AlertLevel;
      episodeCount: number;
      latestStartedAt: string;
    }
  >();

  for (const alert of alerts) {
    const current = map.get(alert.registryId);
    if (!current) {
      map.set(alert.registryId, {
        peakLevel: alert.level,
        episodeCount: 1,
        latestStartedAt: alert.startedAt,
      });
      continue;
    }
    current.peakLevel = pickHigherLevel(current.peakLevel, alert.level);
    current.episodeCount += 1;
    if (new Date(alert.startedAt).getTime() > new Date(current.latestStartedAt).getTime()) {
      current.latestStartedAt = alert.startedAt;
    }
  }

  const names = nameMap();
  return [...map.entries()]
    .map(([registryId, stat]) => ({
      registryId,
      pointName: names.get(registryId) ?? registryId,
      peakLevel: stat.peakLevel,
      peakLevelLabel:
        stat.peakLevel === 'high' ? '高风险' : stat.peakLevel === 'medium' ? '中风险' : '低风险',
      peakWeight: getLevelWeight(stat.peakLevel),
      episodeCount: stat.episodeCount,
      latestStartedAt: stat.latestStartedAt,
    }))
    .sort((a, b) => b.peakWeight - a.peakWeight || b.latestStartedAt.localeCompare(a.latestStartedAt));
}

export function countPointsByPeakLevel(
  aggregates: PointAlertAggregate[],
  level: AlertLevel,
): number {
  return aggregates.filter(a => a.peakLevel === level).length;
}

/** 某一时刻仍处预警中的流水（已退水/解除则不计入） */
export function filterActiveAlertsAtMoment(
  alerts: WaterloggingIotAlert[],
  moment: Date,
): WaterloggingIotAlert[] {
  const ms = moment.getTime();
  return alerts.filter(a => {
    const startMs = new Date(a.startedAt).getTime();
    if (startMs > ms) return false;
    if (a.endedAt != null && new Date(a.endedAt).getTime() <= ms) return false;
    return true;
  });
}

/** 某一时刻仍处预警中的加权总分 W */
export function sumWeightedActivePointsAtMoment(
  alerts: WaterloggingIotAlert[],
  moment: Date,
): number {
  return sumWeightedPointCount(filterActiveAlertsAtMoment(alerts, moment));
}

/** 综合指数加权：每个点位只计一次，取窗口内最高等级权重后求和 */
export function sumWeightedPointCount(alerts: WaterloggingIotAlert[]): number {
  return aggregateAlertsByPoint(alerts).reduce((sum, row) => sum + row.peakWeight, 0);
}

export function getDemoNow(): Date {
  return DEMO_NOW;
}

export function isAlertInWindow(alert: WaterloggingIotAlert, start: Date, end: Date): boolean {
  const t = new Date(alert.startedAt).getTime();
  return t >= start.getTime() && t < end.getTime();
}

export function filterAlertsInWindow(
  alerts: WaterloggingIotAlert[],
  start: Date,
  end: Date,
): WaterloggingIotAlert[] {
  return alerts.filter(a => isAlertInWindow(a, start, end));
}

/** 本期预警未结束（无结束时间） */
export function isEpisodeOngoing(episode: AlertEpisode): boolean {
  return episode.endAt == null;
}

/** 统计窗口上界：进行中用 now；已结束期在 now 早于 endAt 时用 now（趋势图按相对时刻重算），否则用 endAt */
export function getEpisodeEffectiveEnd(episode: AlertEpisode, now: Date = DEMO_NOW): Date {
  if (episode.endAt == null) return now;
  return now.getTime() < episode.endAt.getTime() ? now : episode.endAt;
}

/** 发布后 N 小时内的统计窗口（不超过有效结束时刻） */
export function resolvePostPublishWindow(
  episode: AlertEpisode,
  hours: number,
  now: Date = DEMO_NOW,
): { windowStart: Date; windowEnd: Date } {
  const windowStart = episode.startAt;
  const effectiveEnd = getEpisodeEffectiveEnd(episode, now);
  const windowEndMs = Math.min(
    effectiveEnd.getTime(),
    windowStart.getTime() + hours * MS_HOUR,
  );
  return { windowStart, windowEnd: new Date(windowEndMs) };
}

/** 发布后 N 小时内的报警流水（无当前预警期则返回空） */
export function filterAlertsInPostPublishWindow(
  episode: AlertEpisode | null,
  hours: number,
  now: Date = DEMO_NOW,
): WaterloggingIotAlert[] {
  if (!episode) return [];
  const { windowStart, windowEnd } = resolvePostPublishWindow(episode, hours, now);
  return filterAlertsInWindow(episode.alerts, windowStart, windowEnd);
}

export function formatPostPublishWindowLabel(hours: number): string {
  return `发布后 ${hours} 小时内`;
}

export function sumWeightedCount(alerts: WaterloggingIotAlert[]): number {
  return sumWeightedPointCount(alerts);
}

export function calcIndexFromAlerts(alerts12: WaterloggingIotAlert[]): number {
  return calcIndexFromWeightedSum(sumWeightedPointCount(alerts12));
}

export function mapIndexToTier(index: number): RiskIndexTier {
  const { tierLowMax, tierMediumMax } = getRiskIndexConfig();
  if (index <= tierLowMax) return '低';
  if (index <= tierMediumMax) return '中';
  return '高';
}

export function computeTrend(w12: number, wPrev: number): RiskTrend {
  const rate12 = w12 / 12;
  const ratePrev = wPrev / 12;
  if (ratePrev === 0 && w12 > 0) return '上升';
  if (rate12 > ratePrev * 1.2) return '上升';
  if (rate12 < ratePrev * 0.8) return '下降';
  return '平稳';
}

/** 两期预警按持续时长归一化后的强度变化 */
export function computeEpisodeTrend(
  wCurrent: number,
  hoursCurrent: number,
  wPrevious: number,
  hoursPrevious: number,
): RiskTrend {
  const rateCurrent = hoursCurrent > 0 ? wCurrent / hoursCurrent : 0;
  const ratePrevious = hoursPrevious > 0 ? wPrevious / hoursPrevious : 0;
  if (ratePrevious === 0 && wCurrent > 0) return '上升';
  if (rateCurrent > ratePrevious * 1.2) return '上升';
  if (rateCurrent < ratePrevious * 0.8) return '下降';
  return '平稳';
}

function buildEpisodeFromAlerts(
  episodeId: string,
  sequence: number,
  alerts: WaterloggingIotAlert[],
  now: Date = DEMO_NOW,
): AlertEpisode {
  const meta = waterloggingAlertEpisodeMap.get(episodeId);
  const startMs = meta
    ? new Date(meta.startAt).getTime()
    : Math.min(...alerts.map(a => new Date(a.startedAt).getTime()));
  const endMs = meta?.endAt
    ? new Date(meta.endAt).getTime()
    : null;
  const points = aggregateAlertsByPoint(alerts);
  const startAt = new Date(startMs);
  const endAt = endMs != null ? new Date(endMs) : null;
  const draft: AlertEpisode = {
    episodeId,
    sequence,
    startAt,
    endAt,
    alerts,
    pointCount: points.length,
    index: 0,
  };
  const evalAt = endAt ?? now;
  const composite = calcEpisodeCompositeIndex(draft, evalAt);
  return { ...draft, index: composite.index };
}

/** 按 episodeId 或时间间隔聚类，得到按时间排序的预警期列表 */
export function buildAlertEpisodes(
  alerts: WaterloggingIotAlert[],
  now: Date = DEMO_NOW,
): AlertEpisode[] {
  void now;
  if (alerts.length === 0) return [];

  const allHaveEpisodeId = alerts.every(a => a.episodeId);
  if (allHaveEpisodeId) {
    const groups = new Map<string, WaterloggingIotAlert[]>();
    for (const alert of alerts) {
      const id = alert.episodeId!;
      const list = groups.get(id) ?? [];
      list.push(alert);
      groups.set(id, list);
    }
    return [...groups.entries()]
      .map(([episodeId, group]) => buildEpisodeFromAlerts(episodeId, 0, group, now))
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
      .map((ep, i) => ({ ...ep, sequence: i + 1 }));
  }

  const gapMs = EPISODE_GAP_HOURS * MS_HOUR;
  const sorted = [...alerts].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
  );

  const clusters: WaterloggingIotAlert[][] = [];
  let currentCluster: WaterloggingIotAlert[] = [];
  let clusterEnd = 0;

  for (const alert of sorted) {
    const start = new Date(alert.startedAt).getTime();
    if (currentCluster.length === 0 || start - clusterEnd > gapMs) {
      if (currentCluster.length > 0) clusters.push(currentCluster);
      currentCluster = [alert];
      clusterEnd = start;
      continue;
    }
    currentCluster.push(alert);
    clusterEnd = Math.max(clusterEnd, start);
  }
  if (currentCluster.length > 0) clusters.push(currentCluster);

  return clusters.map((group, i) => buildEpisodeFromAlerts(`auto-${i + 1}`, i + 1, group, now));
}

/** 解析当前期与上一期：当前期 = 无结束时间的进行中预警；已结束期不作为当前期 */
export function resolveCurrentAndPreviousEpisodes(
  episodes: AlertEpisode[],
  now: Date = DEMO_NOW,
): { current: AlertEpisode | null; previous: AlertEpisode | null } {
  if (episodes.length === 0) return { current: null, previous: null };

  const nowMs = now.getTime();
  const ongoing = episodes.find(
    ep => ep.endAt == null && ep.startAt.getTime() <= nowMs,
  );
  if (ongoing) {
    const idx = episodes.indexOf(ongoing);
    const endedBefore = episodes
      .slice(0, idx)
      .filter(ep => ep.endAt != null && ep.endAt.getTime() <= nowMs);
    return {
      current: ongoing,
      previous:
        endedBefore.length > 0 ? endedBefore[endedBefore.length - 1] : null,
    };
  }

  const ended = episodes.filter(ep => ep.endAt != null && ep.endAt.getTime() <= nowMs);
  return {
    current: null,
    previous: ended.length > 0 ? ended[ended.length - 1] : null,
  };
}

/** 某一时刻仍处预警的内涝点数（去重） */
function countActivePointsAtMoment(
  episodeAlerts: WaterloggingIotAlert[],
  episodeStart: Date,
  checkpoint: Date,
): number {
  const inEpisode = episodeAlerts.filter(
    a => new Date(a.startedAt).getTime() >= episodeStart.getTime(),
  );
  return aggregateAlertsByPoint(filterActiveAlertsAtMoment(inEpisode, checkpoint)).length;
}

/** 本期 vs 上一期：按距各自预警开始的相对小时（0h、1h、2h…）对齐的仍处预警点位曲线 */
export function buildEpisodeCompareSeries(
  current: AlertEpisode,
  previous: AlertEpisode | null,
  now: Date = DEMO_NOW,
): EpisodeComparePoint[] {
  const currentEndMs = getEpisodeEffectiveEnd(current, now).getTime();
  const currentHours = Math.ceil((currentEndMs - current.startAt.getTime()) / MS_HOUR);
  const previousHours = previous?.endAt
    ? Math.ceil((previous.endAt.getTime() - previous.startAt.getTime()) / MS_HOUR)
    : 0;
  const maxHours = Math.max(currentHours, previousHours, 1);

  const points: EpisodeComparePoint[] = [];
  for (let h = 0; h <= maxHours; h++) {
    const currentCheckpoint = new Date(
      Math.min(current.startAt.getTime() + h * MS_HOUR, currentEndMs),
    );
    const previousCheckpoint = previous?.endAt
      ? new Date(
          Math.min(previous.startAt.getTime() + h * MS_HOUR, previous.endAt.getTime()),
        )
      : null;

    points.push({
      hourLabel: `${h}h`,
      hoursFromStart: h,
      currentActiveCount: countActivePointsAtMoment(
        current.alerts,
        current.startAt,
        currentCheckpoint,
      ),
      previousActiveCount: previousCheckpoint
        ? countActivePointsAtMoment(previous.alerts, previous.startAt, previousCheckpoint)
        : 0,
    });
  }
  return points;
}

/** 趋势图横轴至少展示至 24h，以便看到 12h/24h 持续加重台阶 */
const TREND_HORIZON_HOURS = 24;

function formatTrendHourLabel(hoursFromStart: number, isNow: boolean): string {
  if (isNow) {
    const rounded = Math.round(hoursFromStart * 10) / 10;
    const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    return `当前 ${text}h`;
  }
  return `${Math.round(hoursFromStart)}h`;
}

/** 截至某一时刻的本期综合指数（与仪表盘口径一致；晚于 now 的时刻仅推算持续加重） */
export function calcEpisodeIndexAtMoment(
  episode: AlertEpisode,
  moment: Date,
  now: Date = DEMO_NOW,
  cfg = getRiskIndexConfig(),
): { baseIndex: number; durationBonus: number; index: number } {
  const effectiveNow = getEpisodeEffectiveEnd(episode, now);
  const isFutureMoment = moment.getTime() > effectiveNow.getTime();
  const evalMoment = isFutureMoment
    ? moment
    : new Date(Math.min(moment.getTime(), effectiveNow.getTime()));

  const alertsInEpisode = episode.alerts.filter(
    a => new Date(a.startedAt).getTime() >= episode.startAt.getTime(),
  );
  // 推算段：不再出现新触发，但已记录的退水时刻仍会使 W 继续下降
  const alertPool = isFutureMoment
    ? alertsInEpisode.filter(a => new Date(a.startedAt).getTime() <= effectiveNow.getTime())
    : alertsInEpisode;

  const active = filterActiveAlertsAtMoment(alertPool, evalMoment);
  const w = sumWeightedPointCount(active);
  const baseIndex = calcIndexFromWeightedSum(w, cfg);
  const duration = resolveDurationSeverity(episode, moment, cfg);
  const index = Math.min(cfg.indexMax, baseIndex + duration.bonus);
  return { baseIndex, durationBonus: duration.bonus, index };
}

/** 本期 vs 上一期：按相对小时对齐的综合指数变化曲线（延伸至 24h，含当前时刻精确点对齐仪表盘） */
export function buildEpisodeIndexTrendSeries(
  current: AlertEpisode,
  previous: AlertEpisode | null,
  now: Date = DEMO_NOW,
): EpisodeIndexTrendPoint[] {
  const currentEnd = getEpisodeEffectiveEnd(current, now);
  const currentElapsedHours = Math.max(0, (currentEnd.getTime() - current.startAt.getTime()) / MS_HOUR);

  const hourPositions = new Set<number>();
  for (let h = 0; h <= TREND_HORIZON_HOURS; h++) {
    hourPositions.add(h);
  }
  const currentRounded = Math.round(currentElapsedHours * 10) / 10;
  if (
    currentRounded > 0 &&
    currentRounded <= TREND_HORIZON_HOURS &&
    Math.abs(currentRounded - Math.round(currentRounded)) > 0.01
  ) {
    hourPositions.add(currentRounded);
  }

  const sortedHours = [...hourPositions].sort((a, b) => a - b);
  const points: EpisodeIndexTrendPoint[] = [];

  for (const hoursFromStart of sortedHours) {
    const isNow = Math.abs(hoursFromStart - currentElapsedHours) < 0.05;
    const isProjected = hoursFromStart > currentElapsedHours + 0.001;
    const isDurationMilestone = hoursFromStart === 12 || hoursFromStart === 24;

    const currentCheckpoint = new Date(current.startAt.getTime() + hoursFromStart * MS_HOUR);
    const currentCalc = calcEpisodeIndexAtMoment(current, currentCheckpoint, now);

    let previousIndex = 0;
    if (previous?.endAt) {
      const previousCheckpoint = new Date(
        Math.min(
          previous.startAt.getTime() + hoursFromStart * MS_HOUR,
          previous.endAt.getTime(),
        ),
      );
      const previousCalc = calcEpisodeIndexAtMoment(previous, previousCheckpoint, now);
      previousIndex = previousCalc.index;
    }

    points.push({
      hourLabel: formatTrendHourLabel(hoursFromStart, isNow),
      hoursFromStart,
      currentIndex: currentCalc.index,
      previousIndex,
      currentBaseIndex: currentCalc.baseIndex,
      currentDurationBonus: currentCalc.durationBonus,
      isNow,
      isProjected,
      isDurationMilestone,
    });
  }

  return points;
}

/** 展示用：进行中仅发布时刻，已结束展示起止 */
export function formatEpisodeRange(episode: AlertEpisode): string {
  const fmt = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  if (episode.endAt == null) {
    return fmt(episode.startAt);
  }
  return `${fmt(episode.startAt)} ~ ${fmt(episode.endAt)}`;
}

/** 距预警发布已过去时长（用于进行中本期） */
export function formatHoursSincePublish(publishedAt: Date, now: Date = DEMO_NOW): string {
  const ms = Math.max(0, now.getTime() - publishedAt.getTime());
  const hours = ms / MS_HOUR;
  if (hours < 1) {
    const mins = Math.max(1, Math.round(ms / 60000));
    return `距发布已过 ${mins} 分钟`;
  }
  if (hours < 24) {
    const rounded = Math.round(hours * 10) / 10;
    const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    return `距发布已过 ${text} 小时`;
  }
  const days = Math.floor(hours / 24);
  const remainHours = Math.round(hours % 24);
  return remainHours > 0 ? `距发布已过 ${days} 天 ${remainHours} 小时` : `距发布已过 ${days} 天`;
}

/** 本期发布时刻文案（用于仪表盘等）；进行中可附带距发布时长 */
/** 仪表盘：基础分与持续内涝加重说明 */
export function formatDurationIndexHint(
  params: {
    baseIndex: number;
    durationBonus: number;
    durationTier: DurationSeverityTier;
    hoursSincePublish: number;
  },
  cfg = getRiskIndexConfig(),
): string {
  const { baseIndex, durationBonus, durationTier, hoursSincePublish } = params;
  if (!cfg.durationSeverityEnabled) {
    return `基础 ${baseIndex} · 未启用持续内涝加重`;
  }
  if (durationBonus > 0) {
    const h = parseDurationTierHours(durationTier);
    return `基础 ${baseIndex} + 持续加重 ${durationBonus}（距发布已满 ${h}h 且发布后 ${h}h 内曾出现预警）`;
  }
  const rulesAsc = getEnabledDurationRulesAsc(cfg);
  const next = rulesAsc.find(r => hoursSincePublish < r.hours);
  if (next) {
    const hints = rulesAsc.map(r => `满 ${r.hours}h/+${r.bonus}`).join('，');
    return `基础 ${baseIndex} · 未满 ${next.hours}h，暂无持续加重（${hints}）`;
  }
  return `基础 ${baseIndex} · 未命中持续加重档（期内无预警或规则未满足）`;
}

export function formatEpisodePublishLabel(episode: AlertEpisode, now: Date = DEMO_NOW): string {
  const base = `本期发布 ${formatEpisodeRange(episode)}`;
  if (isEpisodeOngoing(episode)) {
    return `${base} · ${formatHoursSincePublish(episode.startAt, now)}`;
  }
  return base;
}

export function episodeDurationHours(episode: AlertEpisode, now: Date = DEMO_NOW): number {
  const end = getEpisodeEffectiveEnd(episode, now);
  return Math.max(0.1, (end.getTime() - episode.startAt.getTime()) / MS_HOUR);
}

export function buildSummary(params: {
  pointCount: number;
  highPointCount: number;
  index: number;
  baseIndex: number;
  durationBonus: number;
  durationTier: DurationSeverityTier;
  tier: RiskIndexTier;
  trend: RiskTrend;
  indexDelta: number;
  currentEpisode: AlertEpisode | null;
  previousEpisode: AlertEpisode | null;
}): string {
  const {
    pointCount,
    highPointCount,
    index,
    baseIndex,
    durationBonus,
    durationTier,
    tier,
    trend,
    indexDelta,
    currentEpisode,
    previousEpisode,
  } = params;
  const highPart = highPointCount > 0 ? `（其中 ${highPointCount} 个点位达高风险）` : '';
  const trendPart =
    previousEpisode == null
      ? '暂无可对比的上一期预警'
      : trend === '上升'
        ? `较上一期（第 ${previousEpisode.sequence} 期）上升 ${indexDelta} 点`
        : trend === '下降'
          ? `较上一期（第 ${previousEpisode.sequence} 期）下降 ${Math.abs(indexDelta)} 点`
          : `与上一期（第 ${previousEpisode.sequence} 期）基本持平`;
  const episodePart = currentEpisode
    ? isEpisodeOngoing(currentEpisode)
      ? `当前为第 ${currentEpisode.sequence} 期预警（本期发布 ${formatEpisodeRange(currentEpisode)}，进行中），`
      : `当前为第 ${currentEpisode.sequence} 期预警（${formatEpisodeRange(currentEpisode)}），`
    : '当前无进行中的预警期，';
  const matchedHours = parseDurationTierHours(durationTier);
  const durationPart =
    matchedHours != null ? `，持续内涝已满 ${matchedHours} 小时加重` : '';
  return `${episodePart}本期内共 ${pointCount} 个内涝点发生超限报警${highPart}，综合指数 ${index}（${tier}风险，基础 ${baseIndex}${durationBonus > 0 ? `+持续 ${durationBonus}` : ''}${durationPart}），${trendPart}。`;
}

export function computeRiskIndex(
  alerts: WaterloggingIotAlert[],
  now: Date = DEMO_NOW,
): RiskIndexResult {
  const episodes = buildAlertEpisodes(alerts, now);
  const { current: currentEpisode, previous: previousEpisode } = resolveCurrentAndPreviousEpisodes(
    episodes,
    now,
  );

  const alerts12 = filterAlertsInPostPublishWindow(currentEpisode, 12, now);
  const alerts24 = filterAlertsInPostPublishWindow(currentEpisode, 24, now);

  const w12 = sumWeightedPointCount(alerts12);
  const w24 = sumWeightedPointCount(alerts24);
  const wCurrentEpisode = currentEpisode
    ? sumWeightedActivePointsAtMoment(currentEpisode.alerts, now)
    : 0;
  const wPreviousEpisode = previousEpisode ? sumWeightedPointCount(previousEpisode.alerts) : 0;

  const episodeAlerts = currentEpisode?.alerts ?? alerts12;
  const episodePoints = aggregateAlertsByPoint(episodeAlerts);
  const composite = currentEpisode ? calcEpisodeCompositeIndex(currentEpisode, now) : null;
  const index = composite?.index ?? calcIndexFromAlerts(alerts12);
  const baseIndex = composite?.baseIndex ?? index;
  const durationBonus = composite?.durationBonus ?? 0;
  const durationTier = composite?.durationTier ?? 'none';
  const hoursSincePublish = composite?.hoursSincePublish ?? 0;
  const previousEpisodeIndex = previousEpisode?.index ?? 0;
  const indexDelta = previousEpisode ? index - previousEpisodeIndex : 0;
  const tier = mapIndexToTier(index);
  const trend =
    currentEpisode && previousEpisode
      ? computeEpisodeTrend(
          wCurrentEpisode,
          episodeDurationHours(currentEpisode),
          wPreviousEpisode,
          episodeDurationHours(previousEpisode),
        )
      : '平稳';

  const points12 = aggregateAlertsByPoint(alerts12);
  const points24 = aggregateAlertsByPoint(alerts24);
  const highPointCount12 = countPointsByPeakLevel(points12, 'high');
  const mediumPointCount12 = countPointsByPeakLevel(points12, 'medium');
  const lowPointCount12 = countPointsByPeakLevel(points12, 'low');
  const episodeHighPointCount = countPointsByPeakLevel(episodePoints, 'high');
  const summary = buildSummary({
    pointCount: episodePoints.length,
    highPointCount: episodeHighPointCount,
    index,
    baseIndex,
    durationBonus,
    durationTier,
    tier,
    trend,
    indexDelta,
    currentEpisode,
    previousEpisode,
  });

  return {
    index,
    baseIndex,
    durationBonus,
    durationTier,
    hoursSincePublish,
    tier,
    trend,
    summary,
    indexDelta,
    w12,
    w24,
    wPrev: wPreviousEpisode,
    wEpisode: wCurrentEpisode,
    pointCount12: points12.length,
    pointCount24: points24.length,
    highPointCount12,
    mediumPointCount12,
    lowPointCount12,
    currentEpisode,
    previousEpisode,
  };
}

/** 发布后逐时趋势：横轴为距预警发布 +0h、+1h… */
export function buildPostPublishHourlyBuckets(
  episode: AlertEpisode,
  hours: 12 | 24,
  now: Date = DEMO_NOW,
): HourlyTrendBucket[] {
  const { windowStart, windowEnd } = resolvePostPublishWindow(episode, hours, now);
  const spanMs = Math.max(MS_HOUR, windowEnd.getTime() - windowStart.getTime());
  const bucketCount = Math.ceil(spanMs / MS_HOUR);
  const buckets: HourlyTrendBucket[] = [];

  for (let i = 0; i < bucketCount; i++) {
    const hourStart = new Date(windowStart.getTime() + i * MS_HOUR);
    const hourEnd = new Date(
      Math.min(windowStart.getTime() + (i + 1) * MS_HOUR, windowEnd.getTime()),
    );
    const inHour = filterAlertsInWindow(episode.alerts, hourStart, hourEnd);
    const periodToEnd = filterAlertsInWindow(episode.alerts, windowStart, hourEnd);
    buckets.push({
      hourLabel: `+${i}h`,
      newPointCount: aggregateAlertsByPoint(inHour).length,
      cumulativePointCount: aggregateAlertsByPoint(periodToEnd).length,
    });
  }
  return buckets;
}

/** @deprecated 滚动观察窗，请使用 buildPostPublishHourlyBuckets */
export function buildHourlyTrendBuckets(
  alerts: WaterloggingIotAlert[],
  hours: number,
  now: Date = DEMO_NOW,
): HourlyTrendBucket[] {
  const buckets: HourlyTrendBucket[] = [];
  const windowStart = new Date(now.getTime() - hours * MS_HOUR);

  for (let i = hours - 1; i >= 0; i--) {
    const hourStart = new Date(now.getTime() - (i + 1) * MS_HOUR);
    const hourEnd = new Date(now.getTime() - i * MS_HOUR);
    const inHour = filterAlertsInWindow(alerts, hourStart, hourEnd);
    const periodToEnd = filterAlertsInWindow(alerts, windowStart, hourEnd);
    buckets.push({
      hourLabel: `${String(hourStart.getHours()).padStart(2, '0')}:00`,
      newPointCount: aggregateAlertsByPoint(inHour).length,
      cumulativePointCount: aggregateAlertsByPoint(periodToEnd).length,
    });
  }
  return buckets;
}

export function build12hHourlyBuckets(
  _alerts: WaterloggingIotAlert[],
  episode: AlertEpisode | null,
  now: Date = DEMO_NOW,
): HourlyTrendBucket[] {
  if (!episode) return [];
  return buildPostPublishHourlyBuckets(episode, 12, now);
}

export function build24hHourlyTrend(
  _alerts: WaterloggingIotAlert[],
  episode: AlertEpisode | null,
  now: Date = DEMO_NOW,
): HourlyTrendBucket[] {
  if (!episode) return [];
  return buildPostPublishHourlyBuckets(episode, 24, now);
}

export function buildTop5PointRanking(
  _alerts: WaterloggingIotAlert[],
  episode: AlertEpisode | null,
  now: Date = DEMO_NOW,
): PointAlertRankRow[] {
  const alerts12 = filterAlertsInPostPublishWindow(episode, 12, now);
  return aggregateAlertsByPoint(alerts12)
    .slice(0, 5)
    .map(row => ({
      registryId: row.registryId,
      pointName: row.pointName,
      peakLevel: row.peakLevel,
      peakLevelLabel: row.peakLevelLabel,
      peakWeight: row.peakWeight,
    }));
}

/** 窗口内各内涝点每次等级变化日志，按变化时间倒序 */
export function buildAlertLevelChangeLogs(
  _alerts: WaterloggingIotAlert[],
  hours: 12 | 24,
  episode: AlertEpisode | null,
  now: Date = DEMO_NOW,
): AlertLevelChangeLog[] {
  const windowAlerts = filterAlertsInPostPublishWindow(episode, hours, now);
  const names = nameMap();
  const logs: AlertLevelChangeLog[] = [];

  const byRegistry = new Map<string, WaterloggingIotAlert[]>();
  for (const alert of windowAlerts) {
    const list = byRegistry.get(alert.registryId) ?? [];
    list.push(alert);
    byRegistry.set(alert.registryId, list);
  }

  for (const [registryId, regAlerts] of byRegistry.entries()) {
    const sorted = [...regAlerts].sort(
      (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
    );
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (prev.level === curr.level) continue;
      const direction = LEVEL_RANK[curr.level] > LEVEL_RANK[prev.level] ? 'up' : 'down';
      logs.push({
        id: `${curr.id}-level-change`,
        registryId,
        pointName: names.get(registryId) ?? registryId,
        changedAt: curr.startedAt,
        fromLevel: prev.level,
        fromLevelLabel: prev.levelLabel,
        toLevel: curr.level,
        toLevelLabel: curr.levelLabel,
        direction,
        triggerDepthCm: curr.triggerDepthCm,
      });
    }
  }

  return logs.sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
}

/** 窗口内发生预警的积水点：最高预警等级 + 当前水位 */
export function buildPointWaterStatusRows(
  _alerts: WaterloggingIotAlert[],
  monitors: WaterloggingMonitorPoint[],
  hours: 12 | 24,
  episode: AlertEpisode | null,
  now: Date = DEMO_NOW,
): PointWaterStatusRow[] {
  const windowAlerts = filterActiveAlertsAtMoment(
    filterAlertsInPostPublishWindow(episode, hours, now),
    now,
  );
  const monitorByRegistry = new Map(monitors.map(m => [m.registryId, m]));

  const rows = aggregateAlertsByPoint(windowAlerts).map(point => {
    const regAlerts = filterActiveAlertsAtMoment(
      windowAlerts.filter(a => a.registryId === point.registryId),
      now,
    ).sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
    const firstAlert = regAlerts[0];
    const latestAlert = regAlerts[regAlerts.length - 1];
    const monitor = monitorByRegistry.get(point.registryId);
    const waterDepthCm = monitor?.currentDepthCm ?? latestAlert?.triggerDepthCm ?? 0;
    const previousWaterDepthCm =
      monitor?.previousDepthCm ??
      (regAlerts.length >= 2 ? regAlerts[regAlerts.length - 2].triggerDepthCm : null);

    const firstAlertAt = firstAlert?.startedAt ?? point.latestStartedAt;
    const alertDurationMs = Math.max(0, now.getTime() - new Date(firstAlertAt).getTime());

    return {
      registryId: point.registryId,
      pointName: point.pointName,
      peakLevel: point.peakLevel,
      peakLevelLabel: point.peakLevelLabel,
      peakWeight: point.peakWeight,
      waterDepthCm,
      previousWaterDepthCm,
      waterDepthTrend: resolveWaterDepthTrend(waterDepthCm, previousWaterDepthCm),
      firstAlertAt,
      lastReportAt: monitor?.lastReportAt ?? latestAlert?.startedAt ?? null,
      alertDurationMs,
      isNewAlert: isNewAlertPoint(firstAlertAt, now),
    };
  });

  return rows.sort((a, b) => {
    if (a.isNewAlert !== b.isNewAlert) return a.isNewAlert ? -1 : 1;
    return b.peakWeight - a.peakWeight;
  });
}

/** 距当前时刻该时长内首次触发预警，展示「新增」标签（与逐时新增图最近 1h 桶一致） */
export const NEW_ALERT_LOOKBACK_MS = MS_HOUR;

/** 自首次预警至当前时刻的持续时间文案 */
export function formatAlertDuration(firstAlertAt: string, now: Date = DEMO_NOW): string {
  const diffMs = Math.max(0, now.getTime() - new Date(firstAlertAt).getTime());
  const totalMins = Math.floor(diffMs / 60000);
  if (totalMins < 60) return `${totalMins} 分钟`;
  const hours = Math.floor(totalMins / 60);
  const remainMins = totalMins % 60;
  if (hours < 24) {
    return remainMins > 0 ? `${hours} 小时 ${remainMins} 分` : `${hours} 小时`;
  }
  const days = Math.floor(hours / 24);
  const remainHours = hours % 24;
  return remainHours > 0 ? `${days} 天 ${remainHours} 小时` : `${days} 天`;
}

/** 是否为本观察窗内近期首次触发的新增超限报警点位 */
export function isNewAlertPoint(firstAlertAt: string, now: Date = DEMO_NOW): boolean {
  const t = new Date(firstAlertAt).getTime();
  return t >= now.getTime() - NEW_ALERT_LOOKBACK_MS;
}

export function formatRelativeTime(iso: string, now: Date = DEMO_NOW): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const mins = Math.max(0, Math.round(diffMs / 60000));
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

export function formatDepthDisplay(depthCm: number): string {
  if (depthCm >= 100) return `${(depthCm / 100).toFixed(1)} m`;
  return `${depthCm} cm`;
}

/** 当前水位与上一次采集值对比 */
export function resolveWaterDepthTrend(
  currentDepthCm: number,
  previousDepthCm: number | null,
): WaterDepthTrend | null {
  if (previousDepthCm == null) return null;
  if (currentDepthCm > previousDepthCm) return 'up';
  if (currentDepthCm < previousDepthCm) return 'down';
  return 'flat';
}

export function formatExceedDisplay(triggerCm: number, thresholdCm: number): string {
  const exceedCm = Math.max(0, triggerCm - thresholdCm);
  if (exceedCm >= 100) return `超 ${(exceedCm / 100).toFixed(1)} m`;
  return `超 ${exceedCm} cm`;
}

export function buildMonitorOverview(
  monitors: WaterloggingMonitorPoint[],
  alerts: WaterloggingIotAlert[],
  now: Date = DEMO_NOW,
): MonitorPointOverviewRow[] {
  const start12 = new Date(now.getTime() - 12 * MS_HOUR);
  const start24 = new Date(now.getTime() - 24 * MS_HOUR);
  const monitorByRegistry = new Map(monitors.map(m => [m.registryId, m]));

  return waterloggingPointRegistry.map(reg => {
    const mon = monitorByRegistry.get(reg.id);
    const regAlerts = alerts.filter(a => a.registryId === reg.id);
    const alerts12 = filterAlertsInWindow(regAlerts, start12, now);
    const alerts24 = filterAlertsInWindow(regAlerts, start24, now);
    const hadAlert12 = alerts12.length > 0;
    const hadAlert24 = alerts24.length > 0;
    return {
      registryId: reg.id,
      monitorPointId: mon?.id ?? null,
      pointName: reg.name,
      pointType: HAZARD_POINT_TYPE_LABEL[reg.pointType],
      online: mon?.online ?? false,
      hasMonitoring: !!mon,
      currentDepthCm: mon?.currentDepthCm ?? null,
      thresholds: mon?.thresholds ?? null,
      alertCount12: hadAlert12 ? 1 : 0,
      alertCount24: hadAlert24 ? 1 : 0,
    };
  });
}

export function getAlertsForRegistry(
  alerts: WaterloggingIotAlert[],
  registryId: string,
): WaterloggingIotAlert[] {
  return alerts
    .filter(a => a.registryId === registryId)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function tierLabelFull(tier: RiskIndexTier): string {
  return `${tier}风险`;
}
