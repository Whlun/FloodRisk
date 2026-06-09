import { describe, expect, it } from 'vitest';
import {
  filterExclusiveMatchValueOptions,
  findDuplicateBranchMatchValues,
  reconcileExclusiveBranchMatchValues,
  validateConditionalScoring,
} from '../src/prototypes/deqing-waterlogging-risk/conditionalScoring';
import type { RiskIndicatorRow } from '../src/prototypes/deqing-waterlogging-risk/types';

const OPTIONS = [
  { value: 'COUNTY_KEY', label: '德清县城重要地区及重要道路' },
  { value: 'COUNTY_GENERAL', label: '德清县城一般地区' },
  { value: 'TOWN_GENERAL', label: '其他乡镇一般地区' },
];

describe('条件分支 · 匹配取值排他', () => {
  it('filterExclusiveMatchValueOptions 隐藏其它分支已选取值', () => {
    const branches = [
      { id: 'b0', label: '中心城区', matchValues: ['COUNTY_KEY', 'COUNTY_GENERAL'] },
      { id: 'b1', label: '其他区县', matchValues: ['TOWN_GENERAL'] },
    ];
    const forBranch1 = filterExclusiveMatchValueOptions(OPTIONS, branches, 1, ['TOWN_GENERAL']);
    expect(forBranch1.map(o => o.value)).toEqual(['TOWN_GENERAL']);
    const forBranch0 = filterExclusiveMatchValueOptions(OPTIONS, branches, 0, ['COUNTY_KEY']);
    expect(forBranch0.map(o => o.value)).toEqual(['COUNTY_KEY', 'COUNTY_GENERAL']);
  });

  it('reconcileExclusiveBranchMatchValues 从其它分支移除冲突项', () => {
    const branches = [
      { id: 'b0', label: '中心城区', matchValues: ['COUNTY_KEY'] },
      { id: 'b1', label: '其他区县', matchValues: ['TOWN_GENERAL', 'COUNTY_KEY', 'COUNTY_GENERAL'] },
    ];
    const next = reconcileExclusiveBranchMatchValues(
      branches.map((b, i) => (i === 0 ? { ...b, matchValues: ['COUNTY_KEY', 'COUNTY_GENERAL'] } : b)),
      0,
    );
    expect(next[1].matchValues).toEqual(['TOWN_GENERAL']);
    expect(next[0].matchValues).toEqual(['COUNTY_KEY', 'COUNTY_GENERAL']);
  });

  it('validateConditionalScoring 拦截重复匹配取值', () => {
    const ind: Pick<RiskIndicatorRow, 'conditionalScoring' | 'scoreRules' | 'valueType' | 'level1' | 'survey'> = {
      valueType: 'enum',
      level1: 'FORMATION',
      scoreRules: [{ id: 'r0', label: '低', score: 0.25 }],
      survey: { collectInSurvey: true, surveyRequired: false, fieldKey: 'T' },
      conditionalScoring: {
        enabled: true,
        mode: 'branch_rules',
        source: { type: 'appendix_b', key: 'areaImportance' },
        branches: [
          {
            id: 'b0',
            label: '中心城区',
            matchValues: ['COUNTY_KEY', 'COUNTY_GENERAL'],
            scoreRules: [{ id: 'r0', label: '低', score: 0.25 }],
          },
          {
            id: 'b1',
            label: '其他区县',
            matchValues: ['TOWN_GENERAL', 'COUNTY_KEY'],
            scoreRules: [{ id: 'r1', label: '高', score: 1 }],
          },
        ],
      },
    };
    expect(findDuplicateBranchMatchValues(ind.conditionalScoring!.branches)).toContain('COUNTY_KEY');
    const err = validateConditionalScoring(ind);
    expect(err).toMatch(/匹配取值不可重复/);
  });
});
