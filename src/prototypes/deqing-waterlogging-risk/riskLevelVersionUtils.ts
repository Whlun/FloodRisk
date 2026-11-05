import { initialIndicatorRiskLevels } from '../../database/deqing-waterlogging-risk-indicators';
import type {
  IndicatorRiskLevelRow,
  RiskLevelVersionConfig,
  RiskLevelVersionRecord,
} from './types';
import { hasEnabledScoreRangeOverlap } from './riskLevelUtils';

export function sortRiskLevelRecords(records: RiskLevelVersionRecord[]): RiskLevelVersionRecord[] {
  return [...records].sort((a, b) => {
    const vb = parseRiskLevelVersionNo(b.versionNo);
    const va = parseRiskLevelVersionNo(a.versionNo);
    if (vb !== va) return vb - va;
    return b.configAt.localeCompare(a.configAt);
  });
}

/** 解析版本编号中的序号（L001 → 1） */
export function parseRiskLevelVersionNo(versionNo: string | undefined): number {
  if (!versionNo) return 0;
  const m = /^L(\d+)$/i.exec(versionNo.trim());
  return m ? parseInt(m[1], 10) : 0;
}

/** 生成下一条版本编号 */
export function nextRiskLevelVersionNo(records: RiskLevelVersionRecord[]): string {
  const max = records.reduce((m, r) => Math.max(m, parseRiskLevelVersionNo(r.versionNo)), 0);
  return `L${String(max + 1).padStart(3, '0')}`;
}

/** 为缺少 versionNo 的历史记录按 configAt 顺序补编号 */
export function ensureRiskLevelVersionNos(
  records: RiskLevelVersionRecord[],
): RiskLevelVersionRecord[] {
  if (!records.some(r => !parseRiskLevelVersionNo(r.versionNo))) {
    return records;
  }
  const used = new Set(
    records.map(r => parseRiskLevelVersionNo(r.versionNo)).filter(n => n > 0),
  );
  let nextCandidate = 1;
  const missing = [...records]
    .filter(r => !parseRiskLevelVersionNo(r.versionNo))
    .sort((a, b) => a.configAt.localeCompare(b.configAt));
  const assigned = new Map<string, string>();
  for (const r of missing) {
    while (used.has(nextCandidate)) nextCandidate += 1;
    assigned.set(r.id, `L${String(nextCandidate).padStart(3, '0')}`);
    used.add(nextCandidate);
    nextCandidate += 1;
  }
  return records.map(r =>
    assigned.has(r.id) ? { ...r, versionNo: assigned.get(r.id)! } : r,
  );
}

export function formatRiskLevelRecordTitle(
  record: Pick<RiskLevelVersionRecord, 'versionNo' | 'label' | 'configAt'> | null | undefined,
): string {
  if (!record) return '—';
  const head = record.versionNo || record.configAt;
  return record.label ? `${head} · ${record.label}` : head;
}

export function getActiveRiskLevelRecord(
  records: RiskLevelVersionRecord[],
): RiskLevelVersionRecord | null {
  if (!records.length) return null;
  return records.find(r => r.activeForRating) ?? null;
}

/** 返回等级版本不可作为定级引用的原因；null 表示可引用。 */
export function getRiskLevelRatingReferenceIssue(
  record: RiskLevelVersionRecord,
): string | null {
  if (record.config.status !== 'completed') {
    return '仅已完成的等级版本可设为定级引用';
  }
  const validation = validateRiskLevelConfig(record.config);
  if (!validation.ok) {
    return `等级区间校验未通过（${validation.issues.length} 项）`;
  }
  return null;
}

/** 定级引用只认显式 activeForRating，并重新校验冻结的等级区间。 */
export function getRiskLevelForRating(
  records: RiskLevelVersionRecord[],
): RiskLevelVersionRecord | null {
  if (!records.length) return null;
  const active = records.find(r => r.activeForRating);
  if (!active || getRiskLevelRatingReferenceIssue(active)) return null;
  return active;
}

export function setActiveRiskLevelRecord(
  records: RiskLevelVersionRecord[],
  id: string,
): RiskLevelVersionRecord[] {
  const target = records.find(r => r.id === id);
  if (!target || getRiskLevelRatingReferenceIssue(target)) {
    return records;
  }
  return records.map(r => ({ ...r, activeForRating: r.id === id }));
}

/** 已完成、正在定级引用或已被历史定级结果引用的等级版本不可原地修改。 */
export function isRiskLevelVersionImmutable(
  record: RiskLevelVersionRecord,
  referenced = false,
): boolean {
  return referenced || record.activeForRating || record.config.status === 'completed';
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(item => stableSerialize(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map(key => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

/** 已锁定等级版本复制时，只有区间/展示配置或批次说明变化才允许产生新版本。 */
export function hasMeaningfulRiskLevelCopyChanges(
  sourceLevels: IndicatorRiskLevelRow[],
  currentLevels: IndicatorRiskLevelRow[],
  suggestedLabel: string,
  currentLabel: string | undefined,
): boolean {
  return (
    stableSerialize(sourceLevels) !== stableSerialize(currentLevels) ||
    (currentLabel ?? '').trim() !== suggestedLabel.trim()
  );
}

export function getLevelsFromRecord(
  record: RiskLevelVersionRecord | null | undefined,
): IndicatorRiskLevelRow[] {
  if (!record) return [];
  return record.config.levels.map(row => ({ ...row }));
}

export function collectRiskLevelConfigIssues(levels: IndicatorRiskLevelRow[]): string[] {
  const issues: string[] = [];
  const enabled = levels.filter(l => l.enabled);
  if (enabled.length === 0) {
    issues.push('至少保留一个启用的风险等级');
  }
  for (const row of enabled) {
    if (!Number.isFinite(row.scoreMin) || !Number.isFinite(row.scoreMax)) {
      issues.push(`${row.levelName}：分数区间须为有效数值`);
      continue;
    }
    if (row.scoreMin >= row.scoreMax) {
      issues.push(`${row.levelName}：分数下限须小于分数上限`);
    }
    if (row.scoreMin < 0 || row.scoreMax > 1) {
      issues.push(`${row.levelName}：分数区间必须位于 [0, 1] 定义域内`);
    }
    if (hasEnabledScoreRangeOverlap(row, levels)) {
      issues.push(`${row.levelName}：分数区间与其他启用等级重叠`);
    }
  }
  const ordered = [...enabled]
    .filter(row => Number.isFinite(row.scoreMin) && Number.isFinite(row.scoreMax))
    .sort((a, b) => a.scoreMin - b.scoreMin || a.scoreMax - b.scoreMax);
  if (ordered.length) {
    if (ordered[0].scoreMin !== 0) {
      issues.push('启用等级区间须从 0 开始覆盖');
    }
    for (let index = 1; index < ordered.length; index += 1) {
      const previous = ordered[index - 1];
      const current = ordered[index];
      if (previous.scoreMax < current.scoreMin) {
        issues.push(
          `${previous.levelName} 与 ${current.levelName} 之间存在未覆盖的分数区间`,
        );
      }
    }
    if (ordered[ordered.length - 1].scoreMax !== 1) {
      issues.push('启用等级区间须连续覆盖至 1');
    }
  }
  return issues;
}

export function validateRiskLevelConfig(
  config: RiskLevelVersionConfig,
): { ok: boolean; issues: string[] } {
  const issues = collectRiskLevelConfigIssues(config.levels);
  return { ok: issues.length === 0, issues };
}

export function buildRiskLevelSnapshot(
  levels: IndicatorRiskLevelRow[],
  updatedBy?: string,
): RiskLevelVersionConfig {
  const issues = collectRiskLevelConfigIssues(levels);
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  return {
    levels: levels.map(row => ({ ...row })),
    updatedAt: now,
    updatedBy,
    status: issues.length === 0 ? 'completed' : 'draft',
  };
}

export function summarizeRiskLevelRecord(record: RiskLevelVersionRecord): {
  enabledCount: number;
  totalCount: number;
  rangeValid: boolean;
  issueCount: number;
} {
  const { ok, issues } = validateRiskLevelConfig(record.config);
  const enabledCount = record.config.levels.filter(l => l.enabled).length;
  return {
    enabledCount,
    totalCount: record.config.levels.length,
    rangeValid: ok,
    issueCount: issues.length,
  };
}

/** v2→v3：从根级 indicatorLevels 生成初始等级版本 */
export function migrateLegacyLevelsToRecords(
  levels: IndicatorRiskLevelRow[],
): RiskLevelVersionRecord[] {
  const baseline =
    levels.length > 0
      ? levels.map(row => ({ ...row }))
      : initialIndicatorRiskLevels.map(row => ({ ...row, builtin: true }));
  const config = buildRiskLevelSnapshot(baseline, '系统迁移');
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  return [
    {
      id: `rlvl-migrate-${Date.now()}`,
      versionNo: 'L001',
      configAt: now,
      label: '自旧版工作区迁移',
      activeForRating: config.status === 'completed',
      config,
    },
  ];
}
