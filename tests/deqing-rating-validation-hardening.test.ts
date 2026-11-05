import { describe, expect, it } from 'vitest';
import {
  validateConditionalScoring,
} from '../src/prototypes/deqing-waterlogging-risk/conditionalScoring';
import {
  collectArchitecturePointTypeCoverageIssues,
} from '../src/prototypes/deqing-waterlogging-risk/indicatorArchitectureUtils';
import {
  collectRiskLevelConfigIssues,
} from '../src/prototypes/deqing-waterlogging-risk/riskLevelVersionUtils';
import {
  matchScoreRuleByNumericBands,
  validateNumericMatchCoverage,
} from '../src/prototypes/deqing-waterlogging-risk/scoreRuleNumericBands';
import type {
  HazardPointType,
  Level1Factor,
  RiskIndicatorRow,
} from '../src/prototypes/deqing-waterlogging-risk/types';
import {
  DEQING_WORKSPACE_VERSION,
  type DeqingWaterloggingWorkspace,
} from '../src/prototypes/deqing-waterlogging-risk/workspaceTypes';
import { validateWorkspace } from '../src/prototypes/deqing-waterlogging-risk/workspaceValidation';

function scoreableIndicator(
  id: string,
  level1: Level1Factor,
  applicableTypes: HazardPointType[],
): RiskIndicatorRow {
  return {
    id,
    code: id.toUpperCase(),
    name: id,
    level1,
    applicableTypes,
    weight: 1,
    valueType: 'boolean',
    scoreRules: [
      { id: `${id}-low`, label: '否', riskTier: '低', score: 0 },
      { id: `${id}-high`, label: '是', riskTier: '高', score: 1 },
    ],
    enabled: true,
    updatedAt: '2026-07-30 00:00:00',
    survey: { collectInSurvey: true, surveyRequired: true, fieldKey: id.toUpperCase() },
  };
}

function workspace(): DeqingWaterloggingWorkspace {
  return {
    version: DEQING_WORKSPACE_VERSION,
    updatedAt: '2026-07-30T00:00:00.000Z',
    indicators: [],
    indicatorLevels: [],
    riskLevelRecords: [],
    points: [],
    regionalPreventionRecords: [],
    riskChangeLogs: [],
    architectureRecords: [],
  };
}

describe('风险自动定级评分与工作区完整性加固', () => {
  it('数值评分档必须覆盖完整值域，且重叠配置不会再按数组顺序命中', () => {
    expect(
      validateNumericMatchCoverage([
        { numericMatch: { kind: 'gte', value: 0 } },
        { numericMatch: { kind: 'lte', value: 10 } },
      ]),
    ).toContain('重叠');
    expect(
      validateNumericMatchCoverage([
        { numericMatch: { kind: 'between', min: 0, max: 10 } },
      ]),
    ).toContain('起始边界');
    expect(
      validateNumericMatchCoverage(
        [{ numericMatch: { kind: 'between', min: 0, max: 10 } }],
        { min: 0, max: 10 },
      ),
    ).toBeNull();
    expect(
      validateNumericMatchCoverage([
        { numericMatch: { kind: 'lte', value: 10 } },
        { numericMatch: { kind: 'gt', value: 10 } },
      ]),
    ).toBeNull();
    expect(
      validateNumericMatchCoverage([
        { numericMatch: { kind: 'lt', value: 10 } },
        { numericMatch: { kind: 'gte', value: 10 } },
      ]),
    ).toBeNull();
    expect(
      matchScoreRuleByNumericBands(
        [
          { id: 'a', label: 'A', riskTier: '低', score: 0, numericMatch: { kind: 'lte', value: 10 } },
          { id: 'b', label: 'B', riskTier: '高', score: 1, numericMatch: { kind: 'gte', value: 10 } },
        ],
        10,
      ),
    ).toBeNull();
  });

  it('离散条件分支必须完整覆盖条件来源的全部可选值', () => {
    const error = validateConditionalScoring({
      valueType: 'enum',
      level1: 'HAZARD',
      scoreRules: [],
      survey: { collectInSurvey: true, surveyRequired: true, fieldKey: 'TARGET' },
      conditionalScoring: {
        enabled: true,
        mode: 'branch_rules',
        source: { type: 'appendix_b', key: 'areaImportance' },
        branches: [
          {
            id: 'b1',
            label: '县城',
            matchValues: ['COUNTY_KEY', 'COUNTY_GENERAL'],
            scoreRules: [{ id: 'r1', label: '低', riskTier: '低', score: 0.25 }],
          },
        ],
      },
    });
    expect(error).toContain('未覆盖');
    expect(error).toContain('TOWN_GENERAL');
  });

  it('每种易涝点均须拥有 V₁～V₄ 的可计算指标', () => {
    const common = [
      scoreableIndicator('hazard', 'HAZARD', ['GLOBAL']),
      scoreableIndicator('bearing', 'BEARING', ['GLOBAL']),
      scoreableIndicator('prevention', 'PREVENTION', ['GLOBAL']),
    ];
    const formations = (['SUNKEN', 'TUNNEL', 'UNDERGROUND', 'LOW_LYING'] as HazardPointType[])
      .filter(type => type !== 'TUNNEL')
      .map(type => scoreableIndicator(`formation-${type}`, 'FORMATION', [type]));
    const issues = collectArchitecturePointTypeCoverageIssues([...common, ...formations]);
    expect(issues).toContain('隧道缺少启用且可计算的孕灾因子指标');
    expect(issues.some(issue => issue.includes('下凹式'))).toBe(false);
  });

  it('风险等级分段不得离开 [0, 1] 定义域', () => {
    expect(
      collectRiskLevelConfigIssues([
        {
          id: 'low', levelCode: 'LOW', levelName: '低', color: '#0f0',
          scoreMin: -0.1, scoreMax: 0.5, sort: 1, description: '', enabled: true,
        },
        {
          id: 'high', levelCode: 'HIGH', levelName: '高', color: '#f00',
          scoreMin: 0.5, scoreMax: 1.1, sort: 2, description: '', enabled: true,
        },
      ]),
    ).toEqual(expect.arrayContaining([expect.stringContaining('必须位于 [0, 1] 定义域内')]));
  });

  it('工作区拒绝重复 ID、多条当前引用与显式悬空引用', () => {
    expect(
      validateWorkspace({
        ...workspace(),
        architectureRecords: [
          { id: 'a1', activeForRating: true },
          { id: 'a2', activeForRating: true },
        ],
      }).error,
    ).toContain('最多只能有一条');
    expect(
      validateWorkspace({
        ...workspace(),
        indicators: [{ id: 'duplicate' }, { id: 'duplicate' }],
      }).error,
    ).toContain('重复 id');
    expect(
      validateWorkspace({
        ...workspace(),
        points: [{ id: 'p1', registryId: 'registry-1', surveyArchitectureRefId: 'missing' }],
      }).error,
    ).toContain('不存在的指标评价版本');
  });
});
