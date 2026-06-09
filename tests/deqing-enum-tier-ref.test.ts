import { describe, expect, it } from 'vitest';
import { matchNumericCondition } from '../src/prototypes/deqing-waterlogging-risk/branchNumericMatch';
import { createGuidelineHistoricalLossEnumRules } from '../src/prototypes/deqing-waterlogging-risk/guidelineEnumTierTemplates';
import {
  buildEnumSurveySelectOptions,
  enumSurveySelectUsesRichOptions,
} from '../src/prototypes/deqing-waterlogging-risk/surveyFieldHints';
import type { RiskIndicatorRow } from '../src/prototypes/deqing-waterlogging-risk/types';

describe('数值比较符 =', () => {
  it('eq 匹配零值（表示「无」）', () => {
    expect(matchNumericCondition(0, { kind: 'eq', value: 0 })).toBe(true);
    expect(matchNumericCondition(1, { kind: 'eq', value: 0 })).toBe(false);
  });
});

describe('下拉选档分档说明 tierRef', () => {
  it('历史灾情模板含六档 tierRef', () => {
    const rules = createGuidelineHistoricalLossEnumRules('t');
    expect(rules).toHaveLength(6);
    expect(rules[1].tierRef).toContain('被困');
  });

  it('有 tierRef 时普查下拉展示富文本选项', () => {
    const ind = {
      code: 'CUSTOM_HIST',
      valueType: 'enum',
      scoreRules: createGuidelineHistoricalLossEnumRules('c'),
    } as RiskIndicatorRow;
    expect(enumSurveySelectUsesRichOptions(ind)).toBe(true);
    const opts = buildEnumSurveySelectOptions(ind);
    expect(opts[1].ref).toContain('被困');
  });
});
