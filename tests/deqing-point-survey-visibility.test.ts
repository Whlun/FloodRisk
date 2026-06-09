import { describe, expect, it } from 'vitest';
import {
  getPointSurveyIndicatorsForFill,
  getPointSurveyIndicatorsForPoint,
  getPointSurveyIndicatorsForScoring,
  getPointSurveyVisibilityDiagnostics,
} from '../src/prototypes/deqing-waterlogging-risk/indicatorSurveyUtils';
import type { RiskIndicatorRow } from '../src/prototypes/deqing-waterlogging-risk/types';

function stubIndicator(partial: Partial<RiskIndicatorRow> & Pick<RiskIndicatorRow, 'id' | 'code' | 'name'>): RiskIndicatorRow {
  return {
    level1: 'HAZARD',
    applicableTypes: ['GLOBAL'],
    weight: 0.1,
    valueType: 'enum',
    enabled: true,
    scoreRules: [],
    updatedAt: '',
    survey: {
      collectInSurvey: true,
      surveyRequired: true,
      fieldKey: partial.code,
    },
    ...partial,
  } as RiskIndicatorRow;
}

describe('point survey fill vs scoring', () => {
  const pointType = 'LOW_LYING_ROAD' as const;

  it('停用但仍参与普查的指标出现在填报列表，不计入计分列表', () => {
    const ind = stubIndicator({ id: '1', code: 'HZ_U001', name: '测试指标', enabled: false });
    expect(getPointSurveyIndicatorsForFill([ind], pointType)).toHaveLength(1);
    expect(getPointSurveyIndicatorsForPoint([ind], pointType)).toHaveLength(1);
    expect(getPointSurveyIndicatorsForScoring([ind], pointType)).toHaveLength(0);
    const { visible, blocked } = getPointSurveyVisibilityDiagnostics([ind], pointType);
    expect(visible).toHaveLength(1);
    expect(blocked).toHaveLength(0);
  });

  it('surveyRequired 为 true 且 collectInSurvey 为 false 仍出现在填报列表', () => {
    const ind = stubIndicator({
      id: '2',
      code: 'HZ_U002',
      name: '必填指标',
      enabled: false,
      survey: {
        collectInSurvey: false,
        surveyRequired: true,
        fieldKey: 'HZ_U002',
      },
    });
    expect(getPointSurveyIndicatorsForFill([ind], pointType)).toHaveLength(1);
    expect(getPointSurveyIndicatorsForScoring([ind], pointType)).toHaveLength(0);
  });

  it('附录 B 绑定指标记入 appendix_b_only，不在指标普查 Tab', () => {
    const ind = stubIndicator({
      id: '3',
      code: 'FM_LL_SLOPE',
      name: '道路纵坡',
      level1: 'FORMATION',
      applicableTypes: ['LOW_LYING_ROAD'],
      enabled: false,
      survey: {
        collectInSurvey: true,
        surveyRequired: true,
        fieldKey: 'FM_LL_SLOPE',
        appendixBFieldKey: 'roadLongitudinalSlope',
      },
    });
    expect(getPointSurveyIndicatorsForPoint([ind], pointType)).toHaveLength(0);
    expect(getPointSurveyIndicatorsForFill([ind], pointType)).toHaveLength(1);
    const { blocked } = getPointSurveyVisibilityDiagnostics([ind], pointType);
    expect(blocked[0]?.reason).toBe('appendix_b_only');
  });
});
