import { describe, expect, it } from 'vitest';
import {
  buildCompositeScoringFlowModel,
  resolveCompositeIndicatorForFlow,
} from '../src/prototypes/deqing-waterlogging-risk/compositeScoringFlow';
import type { RiskIndicatorRow } from '../src/prototypes/deqing-waterlogging-risk/types';

function undergroundComposite(): RiskIndicatorRow {
  return {
    id: 'fm-u008',
    code: 'FM_U008',
    name: '出入口与室外地面高程差',
    level1: 'FORMATION',
    applicableTypes: ['UNDERGROUND'],
    weight: 0.1,
    enabled: true,
    valueType: 'numeric',
    updatedAt: '',
    scoringRuleMode: 'composite',
    survey: {
      collectInSurvey: true,
      surveyRequired: true,
      fieldKey: 'FM_U008',
      inputVariant: 'composite_appendix_numeric',
      compositeAggregation: 'max_f',
      appendixBSurveyParts: [
        {
          source: { type: 'appendix_b', key: 'pedestrianEntranceElevationDiffM' },
          appendixBFieldKey: 'pedestrianEntranceElevationDiffM',
          valueFieldKey: 'FM_UG_ENTRANCE_H_PED',
          label: '人行出入口高程差',
          tierBands: [
            { riskTier: '值>0.45m', score: 0.2, match: { kind: 'gt', value: 0.45 } },
            { riskTier: '值<0.3m', score: 1, match: { kind: 'lt', value: 0.3 } },
          ],
        },
        {
          source: { type: 'appendix_b', key: 'vehicleEntranceElevationDiffM' },
          appendixBFieldKey: 'vehicleEntranceElevationDiffM',
          valueFieldKey: 'FM_UG_ENTRANCE_H_VEH',
          label: '车行出入口高程差',
          tierBands: [
            { riskTier: '值>0.3m', score: 0.2, match: { kind: 'gt', value: 0.3 } },
            { riskTier: '值<0.15m', score: 1, match: { kind: 'lt', value: 0.15 } },
          ],
        },
      ],
    },
    scoreRules: [],
  };
}

describe('复合赋分流程图', () => {
  it('生成子项路径与聚合档位', () => {
    const model = buildCompositeScoringFlowModel(undergroundComposite());
    expect(model.configured).toBe(true);
    expect(model.parts).toHaveLength(2);
    expect(model.parts[0]?.tiers).toHaveLength(2);
    expect(model.aggregationLabel).toBe('取 F 较大');
    expect(model.aggregateTiers.length).toBeGreaterThanOrEqual(2);
  });

  it('未配置子项时标记不完整', () => {
    const model = buildCompositeScoringFlowModel({
      code: 'X',
      survey: { collectInSurvey: true, surveyRequired: false, fieldKey: 'X' },
      scoreRules: [],
    });
    expect(model.configured).toBe(false);
    expect(model.incomplete).toContain('须至少配置 1 个子项');
  });

  it('表单未挂载时回退指标快照', () => {
    const snapshot = undergroundComposite();
    const row = resolveCompositeIndicatorForFlow(
      {
        code: 'X',
        survey: { collectInSurvey: true, surveyRequired: false, fieldKey: 'X' },
        scoreRules: [],
      },
      snapshot,
    );
    expect(row.survey?.appendixBSurveyParts?.length).toBe(2);
  });
});
