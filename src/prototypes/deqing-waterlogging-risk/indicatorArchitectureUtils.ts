import { collectArchitectureWeightIssues } from './weightBalance';
import {
  cloneLevel1Weights,
  type IndicatorArchitectureConfig,
  type IndicatorArchitectureRecord,
  type IndicatorArchitectureState,
  type Level1Weights,
  type RiskIndicatorRow,
} from './types';

export function sortArchitectureRecords(
  records: IndicatorArchitectureRecord[],
): IndicatorArchitectureRecord[] {
  return [...records].sort((a, b) => {
    const vb = parseArchitectureVersionNo(b.versionNo);
    const va = parseArchitectureVersionNo(a.versionNo);
    if (vb !== va) return vb - va;
    return b.configAt.localeCompare(a.configAt);
  });
}

/** 解析版本编号中的序号（V001 → 1） */
export function parseArchitectureVersionNo(versionNo: string | undefined): number {
  if (!versionNo) return 0;
  const m = /^V(\d+)$/i.exec(versionNo.trim());
  return m ? parseInt(m[1], 10) : 0;
}

/** 生成下一条版本编号 */
export function nextArchitectureVersionNo(records: IndicatorArchitectureRecord[]): string {
  const max = records.reduce(
    (m, r) => Math.max(m, parseArchitectureVersionNo(r.versionNo)),
    0,
  );
  return `V${String(max + 1).padStart(3, '0')}`;
}

/** 为缺少 versionNo 的历史记录按 configAt 顺序补编号（优先填补空号） */
export function ensureArchitectureVersionNos(
  records: IndicatorArchitectureRecord[],
): IndicatorArchitectureRecord[] {
  if (!records.some(r => !parseArchitectureVersionNo(r.versionNo))) {
    return records;
  }
  const used = new Set(
    records.map(r => parseArchitectureVersionNo(r.versionNo)).filter(n => n > 0),
  );
  let nextCandidate = 1;
  const missing = [...records]
    .filter(r => !parseArchitectureVersionNo(r.versionNo))
    .sort((a, b) => a.configAt.localeCompare(b.configAt));
  const assigned = new Map<string, string>();
  for (const r of missing) {
    while (used.has(nextCandidate)) nextCandidate += 1;
    assigned.set(r.id, `V${String(nextCandidate).padStart(3, '0')}`);
    used.add(nextCandidate);
    nextCandidate += 1;
  }
  return records.map(r =>
    assigned.has(r.id) ? { ...r, versionNo: assigned.get(r.id)! } : r,
  );
}

/** 列表/引用展示：版本编号 + 可选批次说明 */
export function formatArchitectureRecordTitle(
  record: Pick<IndicatorArchitectureRecord, 'versionNo' | 'label' | 'configAt'> | null | undefined,
): string {
  if (!record) return '—';
  const head = record.versionNo || record.configAt;
  return record.label ? `${head} · ${record.label}` : head;
}

export function getActiveArchitectureRecord(
  records: IndicatorArchitectureRecord[],
): IndicatorArchitectureRecord | null {
  if (!records.length) return null;
  return records.find(r => r.activeForRating) ?? null;
}

/** 定级引用：activeForRating 优先，否则最近一条 completed */
export function getArchitectureForRating(
  records: IndicatorArchitectureRecord[],
): IndicatorArchitectureRecord | null {
  if (!records.length) return null;
  const active = records.find(r => r.activeForRating);
  if (active) return active;
  const completed = sortArchitectureRecords(records).find(r => r.config.status === 'completed');
  return completed ?? null;
}

export function setActiveArchitectureRecord(
  records: IndicatorArchitectureRecord[],
  id: string,
): IndicatorArchitectureRecord[] {
  return records.map(r => ({ ...r, activeForRating: r.id === id }));
}

export function buildIndicatorStatesFromIndicators(
  indicators: RiskIndicatorRow[],
): Record<string, IndicatorArchitectureState> {
  const states: Record<string, IndicatorArchitectureState> = {};
  for (const ind of indicators) {
    states[ind.id] = { weight: ind.weight, enabled: ind.enabled };
  }
  return states;
}

export function buildArchitectureSnapshot(
  indicators: RiskIndicatorRow[],
  level1Weights: Level1Weights,
  updatedBy?: string,
): IndicatorArchitectureConfig {
  const issues = collectArchitectureWeightIssues(indicators, level1Weights);
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  return {
    level1Weights: { ...level1Weights },
    indicatorStates: buildIndicatorStatesFromIndicators(indicators),
    updatedAt: now,
    updatedBy,
    status: issues.length === 0 ? 'completed' : 'draft',
  };
}

export function mergeArchitectureOntoIndicators(
  indicators: RiskIndicatorRow[],
  config: Pick<IndicatorArchitectureConfig, 'indicatorStates'>,
): RiskIndicatorRow[] {
  return indicators.map(ind => {
    const snap = config.indicatorStates[ind.id];
    if (!snap) {
      return { ...ind, enabled: false };
    }
    return { ...ind, weight: snap.weight, enabled: snap.enabled };
  });
}

export function configToMergedIndicators(
  indicators: RiskIndicatorRow[],
  config: IndicatorArchitectureConfig,
): RiskIndicatorRow[] {
  return mergeArchitectureOntoIndicators(indicators, config);
}

export function validateArchitectureConfig(
  config: IndicatorArchitectureConfig,
  indicators: RiskIndicatorRow[],
): { ok: boolean; issues: ReturnType<typeof collectArchitectureWeightIssues> } {
  const merged = configToMergedIndicators(indicators, config);
  const issues = collectArchitectureWeightIssues(merged, config.level1Weights);
  return { ok: issues.length === 0, issues };
}

export function summarizeArchitectureRecord(
  indicators: RiskIndicatorRow[],
  record: IndicatorArchitectureRecord,
): {
  enabledCount: number;
  totalCount: number;
  weightValid: boolean;
  issueCount: number;
} {
  const merged = configToMergedIndicators(indicators, record.config);
  const { ok, issues } = validateArchitectureConfig(record.config, indicators);
  const enabledCount = merged.filter(i => i.enabled).length;
  return {
    enabledCount,
    totalCount: indicators.length,
    weightValid: ok,
    issueCount: issues.length,
  };
}

/** 从编辑态指标回写架构 config（保留元数据） */
export function buildConfigFromEditedIndicators(
  base: IndicatorArchitectureConfig,
  editedIndicators: RiskIndicatorRow[],
  level1Weights: Level1Weights,
): IndicatorArchitectureConfig {
  const issues = collectArchitectureWeightIssues(editedIndicators, level1Weights);
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  return {
    ...base,
    level1Weights: { ...level1Weights },
    indicatorStates: buildIndicatorStatesFromIndicators(editedIndicators),
    updatedAt: now,
    status: issues.length === 0 ? 'completed' : 'draft',
  };
}

/** 将当前 active 版本与指标定义层对齐：补全新增指标（默认停用） */
export function syncConfigWithIndicatorCatalog(
  config: IndicatorArchitectureConfig,
  indicators: RiskIndicatorRow[],
): IndicatorArchitectureConfig {
  const nextStates = { ...config.indicatorStates };
  for (const ind of indicators) {
    if (!nextStates[ind.id]) {
      nextStates[ind.id] = { weight: ind.weight, enabled: false };
    }
  }
  return { ...config, indicatorStates: nextStates };
}

/** v1→v2：从根级 indicators/level1Weights 生成初始架构版本 */
export function migrateLegacyArchitectureToRecords(
  indicators: RiskIndicatorRow[],
  level1Weights: Level1Weights,
): IndicatorArchitectureRecord[] {
  const config = buildArchitectureSnapshot(indicators, level1Weights, '系统迁移');
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  return [
    {
      id: `arch-migrate-${Date.now()}`,
      versionNo: 'V001',
      configAt: now,
      label: '自旧版工作区迁移',
      activeForRating: true,
      config,
    },
  ];
}

export function getRatingLevel1Weights(
  record: IndicatorArchitectureRecord | null,
): Level1Weights {
  return record?.config.level1Weights ?? cloneLevel1Weights();
}

/** 解析单条普查记录绑定的架构版本；无绑定时回退定级引用 */
export function resolveSurveyArchitectureRecord(
  records: IndicatorArchitectureRecord[],
  surveyArchitectureRefId: string | undefined,
  fallback: IndicatorArchitectureRecord | null,
): IndicatorArchitectureRecord | null {
  if (surveyArchitectureRefId) {
    return records.find(r => r.id === surveyArchitectureRefId) ?? fallback;
  }
  return fallback;
}

/** 按架构版本 merge 指标（无版本时全部停用） */
export function mergeIndicatorsForArchitectureRecord(
  baseIndicators: RiskIndicatorRow[],
  record: IndicatorArchitectureRecord | null,
): RiskIndicatorRow[] {
  if (!record) {
    return baseIndicators.map(i => ({ ...i, enabled: false }));
  }
  return configToMergedIndicators(baseIndicators, record.config);
}
