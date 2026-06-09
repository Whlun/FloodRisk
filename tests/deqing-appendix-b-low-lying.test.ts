import { describe, expect, it } from 'vitest';
import { buildSurveyPayload } from '../src/database/deqing-waterlogging-survey-seeds';
import { listAppendixBConditionFieldsForPointType } from '../src/prototypes/deqing-waterlogging-risk/appendixBConditionFields';
import { migrateLowLyingRoadSlopeSurveyPayload } from '../src/prototypes/deqing-waterlogging-risk/appendixBSurveyBinding';
import { resolveConditionValue } from '../src/prototypes/deqing-waterlogging-risk/conditionalScoring';
import { getNumericRangeError } from '../src/prototypes/deqing-waterlogging-risk/numericIndicatorConstraints';

describe('城市低洼路段附录 B · 道路纵坡度', () => {
  it('固定专用字段定义含道路纵坡度', () => {
    const fields = listAppendixBConditionFieldsForPointType('LOW_LYING', []);
    expect(fields.some(f => f.key === 'roadLongitudinalSlope')).toBe(true);
    expect(fields.find(f => f.key === 'roadLongitudinalSlope')?.label).toContain('道路纵坡度');
  });

  it('演示种子写入 appendixB.roadLongitudinalSlope', () => {
    const payload = buildSurveyPayload('LOW_LYING', {
      collectedAt: '2026-05-20 10:00:00',
      indicatorValues: {},
    });
    expect(payload.appendixB.roadLongitudinalSlope).toBe(3.2);
    expect(payload.indicatorValues.FM_LL_COLLECT_SLOPE).toBeUndefined();
  });

  it('历史 indicatorValues 纵坡回填附录 B', () => {
    const migrated = migrateLowLyingRoadSlopeSurveyPayload({
      appendixB: { areaImportance: 'TOWN_GENERAL', hasMonitoring: false, hasEmergencyPlan: true },
      indicatorValues: { FM_LL_COLLECT_SLOPE: 4.5 },
    });
    expect(migrated.appendixB.roadLongitudinalSlope).toBe(4.5);
  });

  it('条件赋分可读 appendix_b.roadLongitudinalSlope', () => {
    const val = resolveConditionValue(
      { type: 'appendix_b', key: 'roadLongitudinalSlope' },
      {
        appendixB: {
          areaImportance: 'TOWN_GENERAL',
          hasMonitoring: false,
          hasEmergencyPlan: true,
          roadLongitudinalSlope: 5.5,
        },
      },
      [],
    );
    expect(val).toBe(5.5);
  });

  it('合理范围校验 0～20 %', () => {
    expect(getNumericRangeError('roadLongitudinalSlope', 25)).toMatch(/超出合理范围/);
    expect(getNumericRangeError('roadLongitudinalSlope', 7)).toBeNull();
  });
});
