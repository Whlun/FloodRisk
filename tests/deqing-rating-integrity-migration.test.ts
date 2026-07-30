import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getArchitectureForRating,
  validateArchitectureConfig,
} from '../src/prototypes/deqing-waterlogging-risk/indicatorArchitectureUtils';
import { getRiskLevelForRating } from '../src/prototypes/deqing-waterlogging-risk/riskLevelVersionUtils';
import { getRegionalPreventionRecordForLockedRating } from '../src/prototypes/deqing-waterlogging-risk/regionalPreventionUtils';
import { getSurveyRecordsForRating } from '../src/prototypes/deqing-waterlogging-risk/waterloggingSurveyUtils';
import { migrateWorkspaceBundle } from '../src/prototypes/deqing-waterlogging-risk/workspaceService';
import type { DeqingWaterloggingWorkspace } from '../src/prototypes/deqing-waterlogging-risk/workspaceTypes';

function loadWorkspace(): DeqingWaterloggingWorkspace {
  return JSON.parse(
    readFileSync(
      resolve(__dirname, '../src/prototypes/deqing-waterlogging-risk/workspace-data.json'),
      'utf8',
    ),
  ) as DeqingWaterloggingWorkspace;
}

describe('ratingIntegrityV1 工作区迁移', () => {
  it('修当前目录、生成 V004/新 P 引用，并保持历史快照且重复执行不变', () => {
    const original = loadWorkspace();
    const frozen = Object.fromEntries(
      [
        ['V003', original.architectureRecords.find(r => r.versionNo === 'V003')],
        ['V001', original.architectureRecords.find(r => r.versionNo === 'V001')],
        ['P007', original.regionalPreventionRecords.find(r => r.versionNo === 'P007')],
        ['P001', original.regionalPreventionRecords.find(r => r.versionNo === 'P001')],
        ['L001', original.riskLevelRecords.find(r => r.versionNo === 'L001')],
      ],
    );

    const migrated = migrateWorkspaceBundle(original);
    const fm = migrated.indicators.find(ind => ind.code === 'FM_U005')!;
    expect(fm.scoreRules[2].numericMatch).toEqual({ kind: 'gte', value: 4 });
    expect(fm.scoreRules[2].label).toContain('≥4');
    expect(fm.scoreExplanation).toContain('值≥4%');
    expect(fm.initSnapshot?.scoreRules[2].numericMatch).toEqual({ kind: 'gte', value: 4 });
    expect(fm.initSnapshot?.scoreExplanation).toContain('值≥4%');

    const v004 = migrated.architectureRecords.find(r => r.versionNo === 'V004')!;
    const v004Validation = validateArchitectureConfig(
      v004.config,
      Object.values(v004.config.indicatorDefinitions ?? {}),
    );
    expect(v004Validation.indicatorIssues).toEqual([]);
    expect(v004Validation.weightIssues).toEqual([]);
    expect(v004.config.status).toBe('completed');
    expect(v004.activeForRating).toBe(true);
    expect(v004.config.indicatorDefinitions?.[fm.id].scoreRules[2].numericMatch).toEqual({
      kind: 'gte',
      value: 4,
    });
    const newPrevention = migrated.regionalPreventionRecords.find(
      r => r.id === 'prevention-rating-integrity-v1',
    )!;
    expect(newPrevention.activeForRating).toBe(true);
    expect(newPrevention.architectureRefId).toBe(v004.id);
    expect(newPrevention.architectureVersionNo).toBe('V004');

    expect(migrated.architectureRecords.find(r => r.versionNo === 'V003')?.config)
      .toEqual(frozen.V003?.config);
    expect(migrated.architectureRecords.find(r => r.versionNo === 'V001')?.config)
      .toEqual(frozen.V001?.config);
    expect(migrated.regionalPreventionRecords.find(r => r.versionNo === 'P007')?.config)
      .toEqual(frozen.P007?.config);
    expect(migrated.regionalPreventionRecords.find(r => r.versionNo === 'P001')?.config)
      .toEqual(frozen.P001?.config);
    expect(migrated.riskLevelRecords.find(r => r.versionNo === 'L001'))
      .toEqual(frozen.L001);
    expect(migrated.indicatorMeta?.ratingIntegrityV1).toBe(true);
    expect(migrateWorkspaceBundle(migrated)).toEqual(migrated);
  });

  it('评分版本只认显式且通过校验的 activeForRating', () => {
    const migrated = migrateWorkspaceBundle(loadWorkspace());
    const active = getArchitectureForRating(migrated.architectureRecords);
    expect(active?.versionNo).toBe('V004');
    const validation = validateArchitectureConfig(
      active!.config,
      Object.values(active!.config.indicatorDefinitions ?? {}),
    );
    expect(validation.weightIssues).toEqual([]);
    expect(validation.indicatorIssues).toEqual([]);

    expect(getArchitectureForRating(
      migrated.architectureRecords.map(r => ({ ...r, activeForRating: false })),
    )).toBeNull();
    expect(getRiskLevelForRating(
      migrated.riskLevelRecords.map(r => ({ ...r, activeForRating: false })),
    )).toBeNull();
    expect(getRegionalPreventionRecordForLockedRating(
      migrated.regionalPreventionRecords.map(r => ({ ...r, activeForRating: false })),
      active,
    )).toBeNull();
    expect(getSurveyRecordsForRating(
      migrated.points.map(point => ({ ...point, activeForRating: false })),
    )).toEqual([]);
  });
});
