import type { RegionalPreventionRecord } from './types';

export function sortPreventionRecords(
  records: RegionalPreventionRecord[],
): RegionalPreventionRecord[] {
  return [...records].sort((a, b) => {
    const vb = parsePreventionVersionNo(b.versionNo);
    const va = parsePreventionVersionNo(a.versionNo);
    if (vb !== va) return vb - va;
    return b.configAt.localeCompare(a.configAt);
  });
}

/** 解析版本编号中的序号（P001 → 1） */
export function parsePreventionVersionNo(versionNo: string | undefined): number {
  if (!versionNo) return 0;
  const m = /^P(\d+)$/i.exec(versionNo.trim());
  return m ? parseInt(m[1], 10) : 0;
}

/** 生成下一条防灾减灾版本编号 */
export function nextPreventionVersionNo(records: RegionalPreventionRecord[]): string {
  const max = records.reduce((m, r) => Math.max(m, parsePreventionVersionNo(r.versionNo)), 0);
  return `P${String(max + 1).padStart(3, '0')}`;
}

/** 已完成、正在作为 V₄ 数据引用或已被历史定级结果引用的记录不可原地修改。 */
export function isPreventionVersionImmutable(
  record: RegionalPreventionRecord,
  referenced = false,
): boolean {
  return referenced || record.activeForRating || record.config.assessmentStatus === 'completed';
}

/** 为缺少 versionNo 的历史记录按 configAt 顺序补编号 */
export function ensurePreventionVersionNos(
  records: RegionalPreventionRecord[],
): RegionalPreventionRecord[] {
  if (!records.some(r => !parsePreventionVersionNo(r.versionNo))) {
    return records;
  }
  const used = new Set(
    records.map(r => parsePreventionVersionNo(r.versionNo)).filter(n => n > 0),
  );
  let nextCandidate = 1;
  const missing = [...records]
    .filter(r => !parsePreventionVersionNo(r.versionNo))
    .sort((a, b) => a.configAt.localeCompare(b.configAt));
  const assigned = new Map<string, string>();
  for (const r of missing) {
    while (used.has(nextCandidate)) nextCandidate += 1;
    assigned.set(r.id, `P${String(nextCandidate).padStart(3, '0')}`);
    used.add(nextCandidate);
    nextCandidate += 1;
  }
  return records.map(r =>
    assigned.has(r.id) ? { ...r, versionNo: assigned.get(r.id)! } : r,
  );
}

export function formatPreventionRecordTitle(
  record: Pick<RegionalPreventionRecord, 'versionNo' | 'label' | 'configAt'> | null | undefined,
): string {
  if (!record) return '—';
  const head = record.versionNo || record.configAt;
  return record.label ? `${head} · ${record.label}` : head;
}
