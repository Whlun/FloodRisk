import { describe, expect, it } from 'vitest';
import { initialWaterloggingPoints } from '../src/database/deqing-waterlogging-points';
import { initialRiskChangeLogs } from '../src/database/deqing-risk-change-logs';

describe('种子定级数据', () => {
  it('演示易涝点未配齐指标区间时可能无 ratingResult', () => {
    for (const id of ['pt-001', 'pt-001-hist', 'pt-002']) {
      const row = initialWaterloggingPoints.find(p => p.id === id);
      expect(row, id).toBeTruthy();
      expect(row!.surveyStatus).toBe('completed');
      // 种子指标须手动配齐赋分区间后方可定级；演示数据可能暂无 ratingResult
      if (row?.ratingResult) {
        expect(row.ratingResult.ratedAt).toBeTruthy();
      }
    }
  });

  it('风险变更日志种子可加载', () => {
    expect(Array.isArray(initialRiskChangeLogs)).toBe(true);
    // 指标未手动配齐赋分区间时演示点无定级结果，日志可能为空
    for (const log of initialRiskChangeLogs) {
      expect(log.changeAt).toBeTruthy();
    }
  });
});
