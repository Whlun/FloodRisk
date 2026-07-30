import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  resolveSurveyArchitectureRecord,
} from '../src/prototypes/deqing-waterlogging-risk/indicatorArchitectureUtils';
import {
  buildRatingContextForPoint,
  computeSurveyRatingPreview,
  resolveSurveyIndicatorsForPoint,
} from '../src/prototypes/deqing-waterlogging-risk/surveyRatingUtils';
import { migrateWorkspaceBundle } from '../src/prototypes/deqing-waterlogging-risk/workspaceService';
import type {
  IndicatorArchitectureRecord,
  RiskLevelVersionRecord,
  WaterloggingPointRow,
} from '../src/prototypes/deqing-waterlogging-risk/types';
import type { DeqingWaterloggingWorkspace } from '../src/prototypes/deqing-waterlogging-risk/workspaceTypes';

function loadWorkspace(): DeqingWaterloggingWorkspace {
  const raw = JSON.parse(
    readFileSync(
      resolve(__dirname, '../src/prototypes/deqing-waterlogging-risk/workspace-data.json'),
      'utf8',
    ),
  ) as DeqingWaterloggingWorkspace;
  return migrateWorkspaceBundle(raw);
}

function buildContext(
  workspace: DeqingWaterloggingWorkspace,
  pt: WaterloggingPointRow,
  architectureRecords: IndicatorArchitectureRecord[] = workspace.architectureRecords,
  riskLevelRecords: RiskLevelVersionRecord[] = workspace.riskLevelRecords,
) {
  return buildRatingContextForPoint({
    pt,
    baseIndicators: workspace.indicators,
    architectureRecords,
    riskLevelRecords,
    regionalPreventionRecords: workspace.regionalPreventionRecords,
    riskChangeLogs: workspace.riskChangeLogs,
    // 即使调用方误传原始 active，构建器也必须从 records 重新严格解析。
    currentArchitectureRecord: architectureRecords.find(record => record.activeForRating) ?? null,
    currentRiskLevelRecord: riskLevelRecords.find(record => record.activeForRating) ?? null,
  });
}

describe('定级上下文版本护栏', () => {
  it('非法 active 评价/等级版本不得进入首次定级上下文', () => {
    const workspace = loadWorkspace();
    const sourcePoint = workspace.points[0];
    const point: WaterloggingPointRow = {
      ...sourcePoint,
      ratingStatus: 'none',
      ratingResult: undefined,
    };
    const architectureRecords = workspace.architectureRecords.map(record =>
      record.activeForRating
        ? {
            ...record,
            config: {
              ...record.config,
              status: 'completed' as const,
              level1Weights: { ...record.config.level1Weights, HAZARD: 0.9 },
            },
          }
        : record,
    );
    const riskLevelRecords = workspace.riskLevelRecords.map(record =>
      record.activeForRating
        ? {
            ...record,
            config: {
              ...record.config,
              status: 'completed' as const,
              levels: record.config.levels.map((level, index) =>
                index === 1 ? { ...level, scoreMin: 0.2 } : level,
              ),
            },
          }
        : record,
    );

    const ctx = buildContext(workspace, point, architectureRecords, riskLevelRecords);

    expect(ctx.activeArchitectureRecord).toBeNull();
    expect(ctx.activeRiskLevelRecord).toBeNull();
    expect(ctx.indicators.filter(indicator => indicator.enabled)).toEqual([]);
    expect(ctx.indicatorLevels).toEqual([]);
    expect(computeSurveyRatingPreview(point, ctx).errors[0]).toContain('指标评价管理');
  });

  it('显式普查版本引用丢失时不回退，并明确阻断首次定级', () => {
    const workspace = loadWorkspace();
    const active = workspace.architectureRecords.find(record => record.activeForRating)!;
    const point: WaterloggingPointRow = {
      ...workspace.points[0],
      ratingStatus: 'none',
      ratingResult: undefined,
      surveyArchitectureRefId: 'arch-deleted',
    };

    expect(
      resolveSurveyArchitectureRecord(
        workspace.architectureRecords,
        point.surveyArchitectureRefId,
        active,
      ),
    ).toBeNull();

    const ctx = buildContext(workspace, point);
    const preview = computeSurveyRatingPreview(point, ctx);
    expect(preview.ok).toBe(false);
    expect(preview.errors[0]).toContain('已不存在');
    expect(preview.errors[0]).toContain('禁止回退');
  });

  it('更新定级的完整度与评分都采用历史锁定版本，不混用普查绑定版本', () => {
    const workspace = loadWorkspace();
    const point = workspace.points.find(
      row =>
        row.ratingStatus === 'completed' &&
        row.ratingResult?.architectureRefId &&
        row.surveyArchitectureRefId !== row.ratingResult.architectureRefId,
    );
    expect(point, '测试数据应包含“普查版本与历史定级版本不一致”的记录').toBeDefined();

    const ctx = buildContext(workspace, point!);
    expect(ctx.mode).toBe('update');
    expect(ctx.activeArchitectureRecord?.id).toBe(point!.ratingResult?.architectureRefId);
    expect(ctx.activeArchitectureRecord?.id).not.toBe(point!.surveyArchitectureRefId);

    const coverageIndicators = resolveSurveyIndicatorsForPoint(point!, ctx);
    expect(coverageIndicators.map(indicator => indicator.id)).toEqual(
      ctx.indicators.map(indicator => indicator.id),
    );
    expect(coverageIndicators.filter(indicator => indicator.enabled).map(indicator => indicator.id))
      .toEqual(ctx.indicators.filter(indicator => indicator.enabled).map(indicator => indicator.id));
  });
});
