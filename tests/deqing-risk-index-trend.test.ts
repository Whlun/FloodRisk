import { describe, expect, it } from 'vitest';
import { waterloggingIotAlerts } from '../src/database/deqing-waterlogging-iot-alerts';
import {
  buildAlertEpisodes,
  buildEpisodeIndexTrendSeries,
  getDemoNow,
  resolveCurrentAndPreviousEpisodes,
} from '../src/prototypes/deqing-waterlogging-risk-index/riskIndexUtils';

describe('buildEpisodeIndexTrendSeries duration bonus', () => {
  it('12h 及以后推算点应含 +6 持续加重（演示本期）', () => {
    const now = getDemoNow();
    const episodes = buildAlertEpisodes(waterloggingIotAlerts, now);
    const { current, previous } = resolveCurrentAndPreviousEpisodes(episodes, now);
    expect(current).not.toBeNull();

    const points = buildEpisodeIndexTrendSeries(current!, previous, now);
    const projected = points.filter(p => p.isProjected);
    expect(projected.length).toBeGreaterThan(0);

    for (const p of projected) {
      if (p.hoursFromStart < 12) {
        expect(p.currentDurationBonus, p.hourLabel).toBe(0);
      } else if (p.hoursFromStart < 24) {
        expect(p.currentDurationBonus, p.hourLabel).toBe(6);
      } else {
        expect(p.currentDurationBonus, p.hourLabel).toBe(15);
      }
    }

    const at12 = points.find(p => p.hoursFromStart === 12);
    const at11 = points.find(p => p.hoursFromStart === 11);
    expect(at12?.currentDurationBonus).toBe(6);
    expect(at11?.currentDurationBonus).toBe(0);
    expect((at12?.currentIndex ?? 0) - (at11?.currentIndex ?? 0)).toBeGreaterThanOrEqual(6);

    const nowPoint = points.find(p => p.isNow)!;
    expect(nowPoint.currentDurationBonus).toBe(0);
    expect(nowPoint.currentIndex).toBe(47);
    const p12 = points.find(p => p.hoursFromStart === 12)!;
    expect(p12.currentDurationBonus).toBe(6);
    expect(p12.currentIndex).toBe(42);
  });
});
