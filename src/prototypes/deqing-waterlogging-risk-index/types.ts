/** 内涝点物联预警等级（三级） */
export type AlertLevel = 'low' | 'medium' | 'high';

export type AlertLevelLabel = '低风险' | '中风险' | '高风险';

/** 综合内涝风险指数等级 */
export type RiskIndexTier = '低' | '中' | '高';

export type RiskTrend = '上升' | '平稳' | '下降';

/** 水位相对上一次采集的变化趋势 */
export type WaterDepthTrend = 'up' | 'down' | 'flat';

/** 物联预警流水 */
export type WaterloggingIotAlert = {
  id: string;
  monitorPointId: string;
  registryId: string;
  level: AlertLevel;
  levelLabel: AlertLevelLabel;
  /** 触发时积水深度 cm */
  triggerDepthCm: number;
  /** 对应等级阈值 cm */
  thresholdCm: number;
  startedAt: string;
  /** 退水/解除时刻（可选；演示数据用于趋势回落，页面列表仍展示期内曾预警点位） */
  endedAt?: string | null;
  alertCount: number;
  /** 预警期次 ID：同一期内各点位开始/结束时间可不同，期与期间隔也不固定 */
  episodeId?: string;
};

/** 一次内涝预警过程（一期） */
export type AlertEpisode = {
  episodeId: string;
  /** 从 1 起，按开始时间排序 */
  sequence: number;
  startAt: Date;
  /** 为空表示本期预警未结束（仅展示发布时刻） */
  endAt: Date | null;
  alerts: WaterloggingIotAlert[];
  /** 期内预警点位（去重） */
  pointCount: number;
  /** 期内综合指数 */
  index: number;
};

/** 本期 vs 上一期：按距各自预警开始的相对小时对齐的仍处预警点位 */
export type EpisodeComparePoint = {
  hourLabel: string;
  hoursFromStart: number;
  /** 该时刻仍处预警的内涝点数（退水/解除后回落） */
  currentActiveCount: number;
  previousActiveCount: number;
};

/** 本期 vs 上一期：相对小时对齐的综合指数过程曲线 */
export type EpisodeIndexTrendPoint = {
  hourLabel: string;
  hoursFromStart: number;
  currentIndex: number;
  previousIndex: number;
  currentBaseIndex: number;
  currentDurationBonus: number;
  /** 是否为当前时刻（与左侧仪表盘对齐） */
  isNow?: boolean;
  /** 晚于当前时刻的推算点（基于未来降雨预测各点水位后重算指数） */
  isProjected?: boolean;
  /** 12h / 24h 持续加重里程碑 */
  isDurationMilestone?: boolean;
};

/** 级别权重默认值（实际计算读取页面「指数参数配置」） */
export const ALERT_LEVEL_WEIGHT: Record<AlertLevel, number> = {
  low: 1,
  medium: 2,
  high: 5,
};

export const ALERT_LEVEL_COLOR: Record<AlertLevel, string> = {
  low: '#52c41a',
  medium: '#faad14',
  high: '#ff4d4f',
};

/** 等级简称（等级变化路径展示用） */
export const ALERT_LEVEL_SHORT: Record<AlertLevel, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

export const RISK_TIER_COLOR: Record<RiskIndexTier, string> = {
  低: '#52c41a',
  中: '#faad14',
  高: '#ff7d00',
};

/** 持续加重命中档位：none 或已满 N 小时（如 12h、24h） */
export type DurationSeverityTier = 'none' | `${number}h`;

export type RiskIndexResult = {
  index: number;
  /** 仅由 W×系数 得到的基础分 */
  baseIndex: number;
  /** 12h/24h 持续内涝附加分 */
  durationBonus: number;
  durationTier: DurationSeverityTier;
  /** 距本期预警发布已过小时数 */
  hoursSincePublish: number;
  tier: RiskIndexTier;
  trend: RiskTrend;
  summary: string;
  indexDelta: number;
  w12: number;
  w24: number;
  wPrev: number;
  /** 当前预警期加权总分 W */
  wEpisode: number;
  /** 发布后 12h 内发生预警的内涝点数（去重，自本期预警发布起计） */
  pointCount12: number;
  /** 发布后 24h 内发生预警的内涝点数（去重） */
  pointCount24: number;
  /** 发布后 12h 内最高等级为高风险的内涝点数 */
  highPointCount12: number;
  /** 发布后 12h 内最高等级为中风险的内涝点数 */
  mediumPointCount12: number;
  /** 发布后 12h 内最高等级为低风险的内涝点数 */
  lowPointCount12: number;
  /** 当前预警期（若有） */
  currentEpisode: AlertEpisode | null;
  /** 上一预警期（若有） */
  previousEpisode: AlertEpisode | null;
};

/** 逐时趋势桶：新增点位 + 窗口内过程累积（单观察窗，不做日环比） */
export type HourlyTrendBucket = {
  hourLabel: string;
  /** 该小时段内新增超限报警点位（去重） */
  newPointCount: number;
  /** 观察窗口起点至该小时段末，累计出现预警的点位数（去重） */
  cumulativePointCount: number;
};

/** @deprecated 使用 HourlyTrendBucket */
export type HourlyAlertBucket = HourlyTrendBucket;

/** 内涝点预警聚合（窗口内同一点位只计一次，等级取最高） */
export type PointAlertAggregate = {
  registryId: string;
  pointName: string;
  peakLevel: AlertLevel;
  peakLevelLabel: AlertLevelLabel;
  peakWeight: number;
  /** 该点位在窗口内的预警流水条数（明细用，不参与汇总统计） */
  episodeCount: number;
  latestStartedAt: string;
};

/** 单次预警等级变化记录（窗口内相邻两次触发等级不同） */
export type AlertLevelChangeLog = {
  id: string;
  registryId: string;
  pointName: string;
  changedAt: string;
  fromLevel: AlertLevel;
  fromLevelLabel: AlertLevelLabel;
  toLevel: AlertLevel;
  toLevelLabel: AlertLevelLabel;
  /** 升级 / 降级 */
  direction: 'up' | 'down';
  triggerDepthCm: number;
};

/** 窗口内积水点：预警等级 + 水位 */
export type PointWaterStatusRow = {
  registryId: string;
  pointName: string;
  peakLevel: AlertLevel;
  peakLevelLabel: AlertLevelLabel;
  peakWeight: number;
  /** 当前水位 cm（监测实时值优先，否则取窗口内最近触发水深） */
  waterDepthCm: number;
  /** 上一次水位 cm */
  previousWaterDepthCm: number | null;
  waterDepthTrend: WaterDepthTrend | null;
  /** 窗口内首次触发预警时间 */
  firstAlertAt: string;
  lastReportAt: string | null;
  /** 自窗口内首次预警至当前时刻的持续时间（毫秒） */
  alertDurationMs: number;
  /** 是否为近期新增超限报警点位（与逐时「新增超限报警点位」口径一致：最近 1 小时内首次触发） */
  isNewAlert: boolean;
};

/** 内涝点排行（按窗口内最高预警等级排序） */
export type PointAlertRankRow = {
  registryId: string;
  pointName: string;
  peakLevel: AlertLevel;
  peakLevelLabel: AlertLevelLabel;
  peakWeight: number;
};

export type MonitorPointOverviewRow = {
  registryId: string;
  monitorPointId: string | null;
  pointName: string;
  pointType: string;
  online: boolean;
  hasMonitoring: boolean;
  currentDepthCm: number | null;
  thresholds: { low: number; medium: number; high: number } | null;
  alertCount12: number;
  alertCount24: number;
};
