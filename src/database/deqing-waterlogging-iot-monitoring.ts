import type { HazardPointType } from '../prototypes/deqing-waterlogging-risk/types';

export type WaterloggingMonitorMetric = 'waterDepth';

/** 三级预警阈值（单位：cm） */
export type WaterloggingThresholds = {
  low: number;
  medium: number;
  high: number;
};

export type WaterloggingMonitorPoint = {
  id: string;
  registryId: string;
  deviceCode: string;
  metric: WaterloggingMonitorMetric;
  currentDepthCm: number;
  /** 上一次采集水深 cm，用于趋势对比 */
  previousDepthCm: number | null;
  thresholds: WaterloggingThresholds;
  online: boolean;
  lastReportAt: string;
};

/** 按隐患点类型设定三级阈值：水深 ≥ 阈值触发对应等级预警 */
export function defaultThresholdsByPointType(pointType: HazardPointType): WaterloggingThresholds {
  switch (pointType) {
    case 'SUNKEN':
      return { low: 10, medium: 20, high: 30 };
    case 'TUNNEL':
      return { low: 12, medium: 22, high: 35 };
    case 'UNDERGROUND':
      return { low: 15, medium: 25, high: 40 };
    case 'LOW_LYING':
      return { low: 18, medium: 30, high: 45 };
    default:
      return { low: 12, medium: 22, high: 35 };
  }
}

/** 根据水深与阈值判定预警等级 */
export function resolveAlertLevel(
  depthCm: number,
  thresholds: WaterloggingThresholds,
): { level: 'low' | 'medium' | 'high'; levelLabel: '低风险' | '中风险' | '高风险'; thresholdCm: number } {
  if (depthCm >= thresholds.high) {
    return { level: 'high', levelLabel: '高风险', thresholdCm: thresholds.high };
  }
  if (depthCm >= thresholds.medium) {
    return { level: 'medium', levelLabel: '中风险', thresholdCm: thresholds.medium };
  }
  if (depthCm >= thresholds.low) {
    return { level: 'low', levelLabel: '低风险', thresholdCm: thresholds.low };
  }
  return { level: 'low', levelLabel: '低风险', thresholdCm: thresholds.low };
}

export const waterloggingMonitorPoints: WaterloggingMonitorPoint[] = [
  {
    id: 'mon-001',
    registryId: 'reg-001',
    deviceCode: 'IOT-NL-SK-001',
    metric: 'waterDepth',
    currentDepthCm: 32,
    previousDepthCm: 28,
    thresholds: defaultThresholdsByPointType('SUNKEN'),
    online: true,
    lastReportAt: '2026-05-25T13:58:00+08:00',
  },
  {
    id: 'mon-007',
    registryId: 'reg-007',
    deviceCode: 'IOT-NL-SK-002',
    metric: 'waterDepth',
    currentDepthCm: 18,
    previousDepthCm: 20,
    thresholds: defaultThresholdsByPointType('SUNKEN'),
    online: true,
    lastReportAt: '2026-05-25T13:55:00+08:00',
  },
  {
    id: 'mon-002',
    registryId: 'reg-002',
    deviceCode: 'IOT-NL-TN-001',
    metric: 'waterDepth',
    currentDepthCm: 24,
    previousDepthCm: 26,
    thresholds: defaultThresholdsByPointType('TUNNEL'),
    online: true,
    lastReportAt: '2026-05-25T13:50:00+08:00',
  },
  {
    id: 'mon-005',
    registryId: 'reg-005',
    deviceCode: 'IOT-NL-TN-002',
    metric: 'waterDepth',
    currentDepthCm: 12,
    previousDepthCm: 12,
    thresholds: defaultThresholdsByPointType('TUNNEL'),
    online: true,
    lastReportAt: '2026-05-25T13:52:00+08:00',
  },
  {
    id: 'mon-003',
    registryId: 'reg-003',
    deviceCode: 'IOT-NL-UG-001',
    metric: 'waterDepth',
    currentDepthCm: 28,
    previousDepthCm: 22,
    thresholds: defaultThresholdsByPointType('UNDERGROUND'),
    online: true,
    lastReportAt: '2026-05-25T13:48:00+08:00',
  },
  {
    id: 'mon-004',
    registryId: 'reg-004',
    deviceCode: 'IOT-NL-LL-001',
    metric: 'waterDepth',
    currentDepthCm: 42,
    previousDepthCm: 38,
    thresholds: defaultThresholdsByPointType('LOW_LYING'),
    online: true,
    lastReportAt: '2026-05-25T13:56:00+08:00',
  },
];
