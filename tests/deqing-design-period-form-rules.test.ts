import { describe, expect, it } from 'vitest';
import { createDesignPeriodFormRules } from '../src/prototypes/deqing-waterlogging-risk/designReturnPeriod';
import type { RiskIndicatorRow } from '../src/prototypes/deqing-waterlogging-risk/types';

describe('createDesignPeriodFormRules', () => {
  it('条件来源为地区重要程度时，通过 form 读取 appendixB 校验', async () => {
    const ind = {
      code: 'FM_U002',
      valueType: 'enum',
      conditionalScoring: {
        enabled: true,
        mode: 'branch_rules',
        source: { type: 'appendix_b', key: 'areaImportance' },
        branches: [{ id: 'b1', label: '分支 1' }],
      },
    } as RiskIndicatorRow;

    const form = {
      getFieldValue: (path: (string | number)[]) =>
        path.join('.') === 'surveyPayload.appendixB.areaImportance' ? undefined : 'x',
    };

    const rules = createDesignPeriodFormRules(ind, form);
    expect(rules.length).toBe(1);
    await expect(rules[0].validator?.({}, '较低', () => {})).rejects.toThrow('地区重要程度');
  });

  it('非地区重要程度条件赋分不附加重现期校验', () => {
    const ind = {
      code: 'FM_U002',
      valueType: 'enum',
      conditionalScoring: {
        enabled: true,
        mode: 'branch_rules',
        source: { type: 'appendix_b', key: 'roadLongitudinalSlope' },
        branches: [{ id: 'b1', label: '分支 1' }],
      },
    } as RiskIndicatorRow;
    expect(createDesignPeriodFormRules(ind, { getFieldValue: () => undefined })).toEqual([]);
  });
});
