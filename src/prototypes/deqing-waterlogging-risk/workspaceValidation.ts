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
  }

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
