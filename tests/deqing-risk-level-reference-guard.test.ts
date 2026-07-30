import { describe, expect, it } from 'vitest';
import { initialIndicatorRiskLevels } from '../src/database/deqing-waterlogging-risk-indicators';
import { mapScoreToLevel } from '../src/prototypes/deqing-waterlogging-risk/scoreCalculator';
import {
  buildRiskLevelSnapshot,
  getRiskLevelForRating,
  getRiskLevelRatingReferenceIssue,
  migrateLegacyLevelsToRecords,
  setActiveRiskLevelRecord,
  validateRiskLevelConfig,
} from '../src/prototypes/deqing-waterlogging-risk/riskLevelVersionUtils';
import type {
  IndicatorRiskLevelRow,
  RiskLevelVersionRecord,
} from '../src/prototypes/deqing-waterlogging-risk/types';

function cloneLevels(): IndicatorRiskLevelRow[] {
  return initialIndicatorRiskLevels.map(level => ({ ...level }));
}

function record(
  levels: IndicatorRiskLevelRow[],
  activeForRating = true,
): RiskLevelVersionRecord {
  return {
    id: 'level-version',
    versionNo: 'L099',
    configAt: '2026-07-30 12:00:00',
    activeForRating,
    config: {
      levels,
      status: 'completed',
    },
  };
}

describe('risk-level rating reference guard', () => {
  it('completed 状态不能绕过区间重叠校验', () => {
    const levels = cloneLevels().map(level =>
      level.levelCode === 'MEDIUM'
        ? { ...level, scoreMin: 0.2 }
        : level,
    );
    const invalid = record(levels);

    expect(getRiskLevelRatingReferenceIssue(invalid)).toContain('区间校验未通过');
    expect(getRiskLevelForRating([invalid])).toBeNull();
    expect(
      setActiveRiskLevelRecord([{ ...invalid, activeForRating: false }], invalid.id)[0]
        .activeForRating,
    ).toBe(false);
  });

  it('区间存在缺口或未覆盖 0..1 时不得引用', () => {
    const gap = cloneLevels().map(level =>
      level.levelCode === 'MEDIUM'
        ? { ...level, scoreMin: 0.31 }
        : level,
    );
    expect(validateRiskLevelConfig({ levels: gap, status: 'completed' }).issues.join('；'))
      .toContain('未覆盖');

    const missingStart = cloneLevels().map(level =>
      level.levelCode === 'LOW'
        ? { ...level, scoreMin: 0.01 }
        : level,
    );
    expect(
      validateRiskLevelConfig({ levels: missingStart, status: 'completed' }).issues.join('；'),
    ).toContain('从 0 开始');

    const missingEnd = cloneLevels().map(level =>
      level.levelCode === 'HIGH'
        ? { ...level, scoreMax: 0.99 }
        : level,
    );
    expect(
      validateRiskLevelConfig({ levels: missingEnd, status: 'completed' }).issues.join('；'),
    ).toContain('覆盖至 1');
    expect(migrateLegacyLevelsToRecords(gap)[0].activeForRating).toBe(false);
  });

  it('合法连续区间可引用，边界落入后一档且 1 命中最后一档', () => {
    const levels = cloneLevels().map(level =>
      level.levelCode === 'HIGH'
        ? { ...level, scoreMax: 1 }
        : level,
    );
    const valid = {
      ...record(levels, false),
      config: buildRiskLevelSnapshot(levels),
    };
    const activated = setActiveRiskLevelRecord([valid], valid.id);

    expect(validateRiskLevelConfig(valid.config).ok).toBe(true);
    expect(getRiskLevelRatingReferenceIssue(valid)).toBeNull();
    expect(getRiskLevelForRating(activated)?.id).toBe(valid.id);
    expect(mapScoreToLevel(0.3, levels)?.levelCode).toBe('MEDIUM');
    expect(mapScoreToLevel(0.6, levels)?.levelCode).toBe('HIGH');
    expect(mapScoreToLevel(1, levels)?.levelCode).toBe('HIGH');
  });

  it('缺口、非法数值和定义域外分数不再静默回退最后一档', () => {
    const gap = cloneLevels().map(level =>
      level.levelCode === 'MEDIUM'
        ? { ...level, scoreMin: 0.31 }
        : level,
    );
    expect(mapScoreToLevel(0.305, gap)).toBeUndefined();
    expect(mapScoreToLevel(Number.NaN, cloneLevels())).toBeUndefined();
    expect(mapScoreToLevel(-0.01, cloneLevels())).toBeUndefined();
    expect(mapScoreToLevel(1.01, cloneLevels())).toBeUndefined();
  });
});
