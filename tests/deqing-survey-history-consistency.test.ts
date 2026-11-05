import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pushBasicInfoToSiblingSurveys } from '../src/prototypes/deqing-waterlogging-risk/appendixBSync';
import { buildRatingContextForPoint } from '../src/prototypes/deqing-waterlogging-risk/surveyRatingUtils';
import { migrateWorkspaceBundle } from '../src/prototypes/deqing-waterlogging-risk/workspaceService';
import type {
  IndicatorArchitectureRecord,
  RiskChangeLogEntry,
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

describe('普查与定级历史一致性', () => {
  it('设为数据引用或更新定级时不改写同易涝点的其它普查快照', () => {
    const workspace = loadWorkspace();
    const source = workspace.points[0];
    const sibling: WaterloggingPointRow = {
      ...workspace.points[1],
      id: 'history-survey',
      registryId: source.registryId,
      surveyPayload: {
        ...workspace.points[1].surveyPayload,
        appendixB: {
          ...workspace.points[1].surveyPayload.appendixB,
          areaImportance: 'TOWN_GENERAL',
          collectedAt: '2025-01-01 10:00:00',
        },
      },
    };
    const before = structuredClone(sibling.surveyPayload);

    const result = pushBasicInfoToSiblingSurveys(
      [source, sibling],
      {
        ...source,
        surveyPayload: {
          ...source.surveyPayload,
          appendixB: { ...source.surveyPayload.appendixB, areaImportance: 'COUNTY_KEY' },
        },
      },
      workspace.indicators,
    );

    expect(result.find(row => row.id === sibling.id)?.surveyPayload).toEqual(before);
    expect(result.find(row => row.id === source.id)?.surveyPayload.appendixB.areaImportance).toBe(
      'COUNTY_KEY',
    );
  });

  it('历史定级缺少结果引用时，评价版本按日志优先于 V4 与普查绑定回溯', () => {
    const workspace = loadWorkspace();
    const completed = workspace.architectureRecords.filter(row => row.config.status === 'completed');
    const logArchitecture = completed[0] as IndicatorArchitectureRecord;
    const surveyArchitecture = completed.find(row => row.id !== logArchitecture.id) as IndicatorArchitectureRecord;
    expect(logArchitecture).toBeDefined();
    expect(surveyArchitecture).toBeDefined();

    const base = workspace.points.find(row => row.ratingResult) as WaterloggingPointRow;
    const point: WaterloggingPointRow = {
      ...base,
      id: 'legacy-rated-survey',
      surveyArchitectureRefId: surveyArchitecture.id,
      surveyArchitectureVersionNo: surveyArchitecture.versionNo,
      ratingStatus: 'completed',
      ratingResult: {
        ...base.ratingResult!,
        architectureRefId: undefined,
        architectureVersionNo: undefined,
        architectureRefAt: undefined,
      },
    };
    const log: RiskChangeLogEntry = {
      ...workspace.riskChangeLogs[0],
      id: 'legacy-log',
      surveyRecordId: point.id,
      changeAt: '2026-07-30 10:00:00',
      architectureVersionNo: logArchitecture.versionNo,
    };

    const ctx = buildRatingContextForPoint({
      pt: point,
      baseIndicators: workspace.indicators,
      architectureRecords: workspace.architectureRecords,
      riskLevelRecords: workspace.riskLevelRecords,
      regionalPreventionRecords: workspace.regionalPreventionRecords,
      riskChangeLogs: [log],
      currentArchitectureRecord: workspace.architectureRecords.find(row => row.activeForRating) ?? null,
      currentRiskLevelRecord: workspace.riskLevelRecords.find(row => row.activeForRating) ?? null,
    });

    expect(ctx.mode).toBe('update');
    expect(ctx.activeArchitectureRecord?.id).toBe(logArchitecture.id);
    expect(ctx.activeArchitectureRecord?.id).not.toBe(surveyArchitecture.id);
  });
});
