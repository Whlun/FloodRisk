import { describe, expect, it } from 'vitest';
import { initialRiskIndicators } from '../src/database/deqing-waterlogging-risk-indicators';
import { derivePreviewRuleSelections } from '../src/prototypes/deqing-waterlogging-risk/deriveRuleSelectionsForRating';
import { buildScorePreviewDemoPayload } from '../src/prototypes/deqing-waterlogging-risk/surveyPreviewDefaults';
import type { SurveyPointType } from '../src/prototypes/deqing-waterlogging-risk/types';

const POINT_TYPES: SurveyPointType[] = ['SUNKEN', 'TUNNEL', 'UNDERGROUND', 'LOW_LYING'];

describe('内涝等级试算 · 填充易涝点演示值', () => {
  it('四种点位类型演示载荷可匹配赋分档且无报错', () => {
    const indicators = initialRiskIndicators.map(i => ({ ...i, enabled: true }));
    for (const pointType of POINT_TYPES) {
      const payload = buildScorePreviewDemoPayload(indicators, pointType, null, 'COUNTY_KEY');
      expect(payload.appendixB.areaImportance).toBe('COUNTY_KEY');
      const { errors, skipped, selections } = derivePreviewRuleSelections(
        pointType,
        payload,
        indicators,
      );
      expect(errors, `${pointType} errors`).toEqual([]);
      expect(Object.keys(selections).length).toBeGreaterThan(skipped.length);
    }
  });

  it('低洼路段演示值写入附录 B 道路纵坡度', () => {
    const indicators = initialRiskIndicators.map(i => ({ ...i, enabled: true }));
    const payload = buildScorePreviewDemoPayload(indicators, 'LOW_LYING', null);
    expect(payload.appendixB.roadLongitudinalSlope).toBe(3.2);
  });
});
