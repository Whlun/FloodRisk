/**
 * 建设工程画像 · 批量导出记录（项目本地 JSON 持久化，含解压密码）
 */
export const CM_PROJECT_EXPORT_RECORDS_API = '/api/huzhou-cm/export-records';

const MAX_RECORDS = 50;

/** 与系统壳顶栏演示用户一致（ShellUserMenu） */
export const CM_PROJECT_EXPORT_USER_NAME = '管理员';

export type CmProjectExportRecord = {
  id: string;
  exportedAt: string;
  exportedBy: string;
  fileName: string;
  password: string;
  projectCount: number;
  fieldCount: number;
  fieldKeys: string[];
  projectIds: string[];
  projectNames: string[];
};

export type CmProjectExportRecordInput = Omit<CmProjectExportRecord, 'id' | 'exportedAt'>;

type CmProjectExportRecordsFile = {
  records: CmProjectExportRecord[];
};

function isExportRecord(value: unknown): value is CmProjectExportRecord {
  if (!value || typeof value !== 'object') return false;
  const r = value as Partial<CmProjectExportRecord>;
  return (
    typeof r.id === 'string' &&
    typeof r.exportedAt === 'string' &&
    (r.exportedBy == null || typeof r.exportedBy === 'string') &&
    typeof r.fileName === 'string' &&
    typeof r.password === 'string' &&
    typeof r.projectCount === 'number' &&
    typeof r.fieldCount === 'number' &&
    Array.isArray(r.projectIds) &&
    Array.isArray(r.projectNames) &&
    (r.fieldKeys == null || Array.isArray(r.fieldKeys))
  );
}

function normalizeExportRecord(record: CmProjectExportRecord): CmProjectExportRecord {
  return {
    ...record,
    exportedBy: record.exportedBy?.trim() || CM_PROJECT_EXPORT_USER_NAME,
    fieldKeys: Array.isArray(record.fieldKeys) ? record.fieldKeys : [],
  };
}

async function fetchRecordsFile(): Promise<CmProjectExportRecord[]> {
  const res = await fetch(CM_PROJECT_EXPORT_RECORDS_API, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('读取导出记录失败');
  }
  const data = (await res.json()) as CmProjectExportRecordsFile;
  const list = Array.isArray(data.records) ? data.records : [];
  return list.filter(isExportRecord).map(normalizeExportRecord);
}

async function saveRecordsFile(records: CmProjectExportRecord[]): Promise<void> {
  const res = await fetch(CM_PROJECT_EXPORT_RECORDS_API, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: records.slice(0, MAX_RECORDS) }),
  });
  if (!res.ok) {
    throw new Error('保存导出记录失败');
  }
}

export async function readCmProjectExportRecords(): Promise<CmProjectExportRecord[]> {
  return fetchRecordsFile();
}

export async function writeCmProjectExportRecords(records: CmProjectExportRecord[]): Promise<void> {
  await saveRecordsFile(records.slice(0, MAX_RECORDS));
}

export async function appendCmProjectExportRecord(
  input: CmProjectExportRecordInput,
): Promise<CmProjectExportRecord> {
  const record: CmProjectExportRecord = {
    id: crypto.randomUUID(),
    exportedAt: new Date().toISOString(),
    ...input,
  };
  const existing = await fetchRecordsFile();
  const next = [record, ...existing].slice(0, MAX_RECORDS);
  await saveRecordsFile(next);
  return record;
}

export async function removeCmProjectExportRecord(id: string): Promise<void> {
  const existing = await fetchRecordsFile();
  await saveRecordsFile(existing.filter(r => r.id !== id));
}

export async function clearCmProjectExportRecords(): Promise<void> {
  await saveRecordsFile([]);
}

export function formatCmProjectExportTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-CN', { hour12: false });
}
