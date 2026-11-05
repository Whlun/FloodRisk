import {
  DEQING_WORKSPACE_VERSION,
  type DeqingWaterloggingWorkspace,
} from './workspaceTypes';

export interface WorkspaceValidationResult {
  valid: boolean;
  error?: string;
}

const REQUIRED_COLLECTIONS = [
  'indicators',
  'indicatorLevels',
  'riskLevelRecords',
  'points',
  'regionalPreventionRecords',
  'riskChangeLogs',
  'architectureRecords',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasNonEmptyString(record: Record<string, unknown>, key: string): boolean {
  return typeof record[key] === 'string' && record[key].trim().length > 0;
}

function validateRecordCollection(
  workspace: Record<string, unknown>,
  key: (typeof REQUIRED_COLLECTIONS)[number],
): string | null {
  const value = workspace[key];
  if (!Array.isArray(value)) return `${key} 必须是数组`;
  const invalidIndex = value.findIndex(item => !isRecord(item));
  if (invalidIndex >= 0) return `${key}[${invalidIndex}] 必须是对象`;
  return null;
}

function validateIdentifiedRecords(
  workspace: Record<string, unknown>,
  key: (typeof REQUIRED_COLLECTIONS)[number],
): string | null {
  const value = workspace[key] as Record<string, unknown>[];
  const invalidIndex = value.findIndex(item => !hasNonEmptyString(item, 'id'));
  return invalidIndex >= 0 ? `${key}[${invalidIndex}].id 必须是非空字符串` : null;
}

function findDuplicateNonEmptyValues(
  records: Record<string, unknown>[],
  key: string,
): string | null {
  const seen = new Set<string>();
  for (const record of records) {
    const value = record[key];
    if (typeof value !== 'string' || !value.trim()) continue;
    const normalized = value.trim();
    if (seen.has(normalized)) return normalized;
    seen.add(normalized);
  }
  return null;
}

function getRecords(
  workspace: Record<string, unknown>,
  key: (typeof REQUIRED_COLLECTIONS)[number],
): Record<string, unknown>[] {
  return workspace[key] as Record<string, unknown>[];
}

function validateAtMostOneActive(
  records: Record<string, unknown>[],
  label: string,
): string | null {
  if (records.filter(record => record.activeForRating === true).length > 1) {
    return `${label}最多只能有一条定级引用记录`;
  }
  return null;
}

function validateWorkspaceRelations(workspace: Record<string, unknown>): string | null {
  const architectureRecords = getRecords(workspace, 'architectureRecords');
  const riskLevelRecords = getRecords(workspace, 'riskLevelRecords');
  const points = getRecords(workspace, 'points');
  const preventionRecords = getRecords(workspace, 'regionalPreventionRecords');
  const changeLogs = getRecords(workspace, 'riskChangeLogs');
  const architectureIds = new Set(architectureRecords.map(record => String(record.id)));
  const riskLevelIds = new Set(riskLevelRecords.map(record => String(record.id)));
  const pointIds = new Set(points.map(record => String(record.id)));

  const architectureActive = validateAtMostOneActive(architectureRecords, '指标评价版本');
  if (architectureActive) return architectureActive;
  const riskLevelActive = validateAtMostOneActive(riskLevelRecords, '风险等级版本');
  if (riskLevelActive) return riskLevelActive;

  const activePointRegistryIds = new Set<string>();
  for (const point of points) {
    if (point.activeForRating !== true) continue;
    const registryId = String(point.registryId ?? '').trim();
    if (!registryId) return `普查记录 ${point.id} 设为定级引用时缺少 registryId`;
    if (activePointRegistryIds.has(registryId)) {
      return `同一易涝点 ${registryId} 存在多条定级引用普查记录`;
    }
    activePointRegistryIds.add(registryId);
  }

  const activePreventionByArchitecture = new Set<string>();
  for (const record of preventionRecords) {
    const architectureRefId = String(record.architectureRefId ?? '').trim();
    if (architectureRefId && !architectureIds.has(architectureRefId)) {
      return `防灾减灾记录 ${record.id} 引用了不存在的指标评价版本 ${architectureRefId}`;
    }
    if (record.activeForRating !== true) continue;
    const key = architectureRefId || '__legacy_unbound__';
    if (activePreventionByArchitecture.has(key)) {
      return `同一指标评价版本 ${architectureRefId || '（历史未绑定）'} 存在多条 V₄ 定级引用`;
    }
    activePreventionByArchitecture.add(key);
  }

  for (const point of points) {
    const surveyArchitectureRefId = String(point.surveyArchitectureRefId ?? '').trim();
    if (surveyArchitectureRefId && !architectureIds.has(surveyArchitectureRefId)) {
      return `普查记录 ${point.id} 引用了不存在的指标评价版本 ${surveyArchitectureRefId}`;
    }
    const ratingResult = point.ratingResult;
    if (!isRecord(ratingResult)) continue;
    const architectureRefId = String(ratingResult.architectureRefId ?? '').trim();
    if (architectureRefId && !architectureIds.has(architectureRefId)) {
      return `普查记录 ${point.id} 的定级结果引用了不存在的指标评价版本 ${architectureRefId}`;
    }
    const riskLevelRefId = String(ratingResult.riskLevelRefId ?? '').trim();
    if (riskLevelRefId && !riskLevelIds.has(riskLevelRefId)) {
      return `普查记录 ${point.id} 的定级结果引用了不存在的风险等级版本 ${riskLevelRefId}`;
    }
  }

  for (const log of changeLogs) {
    const surveyRecordId = String(log.surveyRecordId ?? '').trim();
    if (surveyRecordId && !pointIds.has(surveyRecordId)) {
      return `风险变更日志 ${log.id} 引用了不存在的普查记录 ${surveyRecordId}`;
    }
  }
  return null;
}

/** API 边界的完整工作区结构校验；允许没有 revision 的旧版文件。 */
export function validateWorkspace(
  value: unknown,
): WorkspaceValidationResult {
  if (!isRecord(value)) return { valid: false, error: '工作区必须是对象' };
  if (value.version !== DEQING_WORKSPACE_VERSION) {
    return {
      valid: false,
      error: `version 必须为 ${DEQING_WORKSPACE_VERSION}`,
    };
  }
  if (
    value.revision !== undefined &&
    (!Number.isSafeInteger(value.revision) || (value.revision as number) < 0)
  ) {
    return { valid: false, error: 'revision 必须是非负安全整数' };
  }
  if (!hasNonEmptyString(value, 'updatedAt') || Number.isNaN(Date.parse(value.updatedAt as string))) {
    return { valid: false, error: 'updatedAt 必须是有效日期字符串' };
  }

  for (const key of REQUIRED_COLLECTIONS) {
    const collectionError = validateRecordCollection(value, key);
    if (collectionError) return { valid: false, error: collectionError };
  }
  for (const key of REQUIRED_COLLECTIONS) {
    const idError = validateIdentifiedRecords(value, key);
    if (idError) return { valid: false, error: idError };
    const duplicateId = findDuplicateNonEmptyValues(getRecords(value, key), 'id');
    if (duplicateId) return { valid: false, error: `${key} 存在重复 id：${duplicateId}` };
  }

  for (const key of ['architectureRecords', 'riskLevelRecords', 'regionalPreventionRecords'] as const) {
    const duplicateVersionNo = findDuplicateNonEmptyValues(getRecords(value, key), 'versionNo');
    if (duplicateVersionNo) return { valid: false, error: `${key} 存在重复 versionNo：${duplicateVersionNo}` };
  }

  const relationError = validateWorkspaceRelations(value);
  if (relationError) return { valid: false, error: relationError };

  if (value.indicatorMeta !== undefined && !isRecord(value.indicatorMeta)) {
    return { valid: false, error: 'indicatorMeta 必须是对象' };
  }
  if (value.level1Weights !== undefined && !isRecord(value.level1Weights)) {
    return { valid: false, error: 'level1Weights 必须是对象' };
  }
  return { valid: true };
}

export function assertValidWorkspace(value: unknown): asserts value is DeqingWaterloggingWorkspace {
  const result = validateWorkspace(value);
  if (!result.valid) {
    throw new Error(`工作区结构损坏：${result.error}`);
  }
}

export function getWorkspaceRevision(workspace: DeqingWaterloggingWorkspace): number {
  return workspace.revision ?? 0;
}
