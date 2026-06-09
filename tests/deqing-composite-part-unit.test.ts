import { describe, expect, it } from 'vitest';
import {
  parseUnitFromFieldLabel,
  parseUnitFromRangeLabel,
  resolveCompositePartUnit,
} from '../src/prototypes/deqing-waterlogging-risk/compositePartUnit';
import { GUIDELINE_537_PEDESTRIAN_APPENDIX_KEY } from '../src/prototypes/deqing-waterlogging-risk/surveyTemplates';

describe('resolveCompositePartUnit', () => {
  it('从附录 B 固定字段解析单位', () => {
    expect(
      resolveCompositePartUnit(
        { type: 'appendix_b', key: GUIDELINE_537_PEDESTRIAN_APPENDIX_KEY },
        [],
      ),
    ).toBe('m');
  });

  it('从指标 unit 解析单位', () => {
    expect(
      resolveCompositePartUnit(
        { type: 'indicator', key: 'fm_sk_long_slope' },
        [
          {
            id: '1',
            code: 'FM_SK_LONG_SLOPE',
            name: '道路纵坡',
            level1: 'formation',
            applicableTypes: ['ROAD'],
            weight: 1,
            valueType: 'numeric',
            unit: '%',
            scoreRules: [],
            enabled: true,
            survey: { collectInSurvey: true, surveyRequired: false, fieldKey: 'fm_sk_long_slope' },
          },
        ],
      ),
    ).toBe('%');
  });

  it('从 rangeLabel 与字段标签解析单位', () => {
    expect(parseUnitFromRangeLabel('合理范围 0～20 %')).toBe('%');
    expect(parseUnitFromFieldLabel('下凹深度 (cm)')).toBe('cm');
    expect(parseUnitFromFieldLabel('人行出入口与室外地面高程差 H（m）')).toBe('m');
  });
});
