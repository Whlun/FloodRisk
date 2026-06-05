import type { RiskChangeLogEntry } from '../prototypes/deqing-waterlogging-risk/types';
import { initialWaterloggingPoints } from './deqing-waterlogging-points';
import { initialRegionalPreventionRecords } from './deqing-regional-prevention';

const preventionRefAt =
  initialRegionalPreventionRecords.find(r => r.activeForRating)?.configAt ?? '2026-05-19 09:00:00';

function logFromPoint(
  overrides: Partial<RiskChangeLogEntry> & Pick<RiskChangeLogEntry, 'id' | 'surveyRecordId' | 'changeType'>,
): RiskChangeLogEntry | null {
  const row = initialWaterloggingPoints.find(p => p.id === overrides.surveyRecordId);
  if (!row?.ratingResult || row.ratingStatus !== 'completed') return null;
  const r = row.ratingResult;
  const changeAt = overrides.changeAt ?? r.ratedAt;
  if (!changeAt) return null;
  return {
    registryId: row.registryId,
    pointCode: row.pointCode,
    name: row.name,
    pointType: row.pointType,
    surveyRecordId: row.id,
    surveyAt: row.surveyAt ?? row.collectedAt ?? '',
    surveyLabel: row.label,
    newLevelCode: r.levelCode,
    newLevelName: r.levelName,
    newColor: r.color,
    newV: r.v,
    v1: r.v1,
    v2: r.v2,
    v3: r.v3,
    v4: r.v4,
    partial: r.partial,
    preventionRefAt,
    operator: row.collector ?? '王豪伦',
    changeAt,
    ...overrides,
  };
}

const hist = initialWaterloggingPoints.find(p => p.id === 'pt-001-hist');
const current = initialWaterloggingPoints.find(p => p.id === 'pt-001');

/** 演示：风险等级变更记录（数值与对应普查定级结果一致） */
export const initialRiskChangeLogs: RiskChangeLogEntry[] = [
  logFromPoint({
    id: 'rcl-demo-001',
    surveyRecordId: 'pt-002',
    changeType: 'initial',
  }),
  logFromPoint({
    id: 'rcl-demo-002',
    surveyRecordId: 'pt-001-hist',
    changeType: 'initial',
  }),
  logFromPoint({
    id: 'rcl-demo-003',
    surveyRecordId: 'pt-001',
    changeType: 'downgrade',
    prevLevelCode: hist?.ratingResult?.levelCode,
    prevLevelName: hist?.ratingResult?.levelName,
    prevV: hist?.ratingResult?.v,
    basicInfoSynced: true,
    remark: '汛后普查数据更新，风险等级由中风险降为低风险',
  }),
].filter((x): x is RiskChangeLogEntry => x != null);
