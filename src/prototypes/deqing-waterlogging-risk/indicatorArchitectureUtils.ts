import {
  collectArchitectureWeightIssues,
  getSiblingGroup,
} from './weightBalance';
import { validateIndicatorConfig } from './indicatorConfigReadiness';
import {
  cloneLevel1Weights,
  HAZARD_POINT_TYPE_LABEL,
  LEVEL1_FACTOR_LABEL,
  type IndicatorArchitectureConfig,
  type IndicatorArchitectureRecord,
  type IndicatorArchitectureState,
  type HazardPointType,
  type Level1Factor,
  type Level1Weights,
  type RiskIndicatorRow,
  type WaterloggingPointRow,
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

/** 返回评价版本不可作为定级引用的原因；null 表示可引用。 */
export function getArchitectureRatingReferenceIssue(
  record: IndicatorArchitectureRecord,
): string | null {
  if (record.config.status !== 'completed') {
    return '仅已完成的评价版本可设为定级引用';
  }
  const definitions = Object.values(record.config.indicatorDefinitions ?? {});
  if (!definitions.length) {
    return '版本缺少冻结的指标定义快照，无法作为定级引用';
  }
  const validation = validateArchitectureConfig(record.config, definitions);
  if (validation.weightIssues.length) {
    return `权重校验未通过（${validation.weightIssues.length} 项）`;
  }
  if (validation.indicatorIssues.length) {
    return `指标校验未通过（${validation.indicatorIssues.length} 项不可计算）`;
  }
  return null;
}

/** 定级引用只认显式 activeForRating，且版本必须完成并通过权重与指标可计算性校验。 */
export function getArchitectureForRating(
  records: IndicatorArchitectureRecord[],
): IndicatorArchitectureRecord | null {
  if (!records.length) return null;
  const active = records.find(r => r.activeForRating);
  if (!active || getArchitectureRatingReferenceIssue(active)) return null;
  return active;
}

export function setActiveArchitectureRecord(
  records: IndicatorArchitectureRecord[],
  id: string,
): IndicatorArchitectureRecord[] {
  const target = records.find(r => r.id === id);
  if (!target || getArchitectureRatingReferenceIssue(target)) {
    return records;
  }
  return records.map(r => ({ ...r, activeForRating: r.id === id }));
}

/** 已完成或正在定级引用的版本属于发布快照，不允许原地覆盖。 */
export function isArchitectureVersionImmutable(
  record: IndicatorArchitectureRecord,
): boolean {
  return record.activeForRating || record.config.status === 'completed';
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

/**
 * 判断“复制为新版本”是否包含值得落库的业务调整。
 * 自动变化的版本状态、维护时间和维护人不算方案变更；配置内容或批次说明改变才允许生成新版本。
 */
export function hasMeaningfulArchitectureCopyChanges(
  initialConfig: IndicatorArchitectureConfig,
  currentConfig: IndicatorArchitectureConfig,
  suggestedLabel: string,
  currentLabel: string | undefined,
): boolean {
  // indicatorDefinitions 中的 weight/enabled 是定义快照里的冗余展示值；
  // 编辑器初始化时会按 indicatorStates 重建它们，不能把这种内部同步误判为用户修改。
  const initialContent = {
    level1Weights: initialConfig.level1Weights,
    indicatorStates: initialConfig.indicatorStates,
  };
  const currentContent = {
    level1Weights: currentConfig.level1Weights,
    indicatorStates: currentConfig.indicatorStates,
  };

  return (
    stableSerialize(initialContent) !== stableSerialize(currentContent) ||
    (currentLabel ?? '').trim() !== suggestedLabel.trim()
  );
}

/**
 * 复制版本时，指标目录发生变化本身也是实质变化：新版本必须冻结最新目录，
 * 因此允许保存；目录未变化且用户也未调整方案时，禁止生成重复版本。
 */
export function hasArchitectureCopyBaselineChange(
  sourceConfig: IndicatorArchitectureConfig,
  copiedConfig: IndicatorArchitectureConfig,
): boolean {
  const sourceContent = {
    level1Weights: sourceConfig.level1Weights,
    indicatorStates: sourceConfig.indicatorStates,
    indicatorDefinitions: sourceConfig.indicatorDefinitions ?? {},
  };
  const copiedContent = {
    level1Weights: copiedConfig.level1Weights,
    indicatorStates: copiedConfig.indicatorStates,
    indicatorDefinitions: copiedConfig.indicatorDefinitions ?? {},
  };
  return stableSerialize(sourceContent) !== stableSerialize(copiedContent);
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
  const weightIssues = collectArchitectureWeightIssues(indicators, level1Weights);
  const indicatorIssues = collectArchitectureIndicatorIssues(indicators);
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  return {
    level1Weights: { ...level1Weights },
    indicatorStates: buildIndicatorStatesFromIndicators(indicators),
    indicatorDefinitions: snapshotIndicatorDefinitions(indicators),
    updatedAt: now,
    updatedBy,
    status: weightIssues.length === 0 && indicatorIssues.length === 0 ? 'completed' : 'draft',
  };
}

export function mergeArchitectureOntoIndicators(
  indicators: RiskIndicatorRow[],
  config: Pick<IndicatorArchitectureConfig, 'indicatorStates' | 'indicatorDefinitions'>,
): RiskIndicatorRow[] {
  const definitions = config.indicatorDefinitions
    ? Object.values(config.indicatorDefinitions)
    : indicators;
  return definitions.map(ind => {
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
): {
  ok: boolean;
  weightIssues: ReturnType<typeof collectArchitectureWeightIssues>;
  indicatorIssues: string[];
  issues: Array<ReturnType<typeof collectArchitectureWeightIssues>[number] | string>;
} {
  const merged = configToMergedIndicators(indicators, config);
  const weightIssues = collectArchitectureWeightIssues(merged, config.level1Weights);
  const indicatorIssues = collectArchitectureIndicatorIssues(merged);
  return {
    ok: weightIssues.length === 0 && indicatorIssues.length === 0,
    weightIssues,
    indicatorIssues,
    issues: [...weightIssues, ...indicatorIssues],
  };
}

/** 评价版本只校验启用指标；任一指标无法自动计分时，该版本不得完成或成为定级引用。 */
export function collectArchitectureIndicatorIssues(indicators: RiskIndicatorRow[]): string[] {
  const enabled = indicators.filter(ind => ind.enabled);
  const issues: string[] = [];
  for (const ind of enabled) {
    const readiness = validateIndicatorConfig(ind, indicators);
    for (const blocker of readiness.blockers) {
      issues.push(`${ind.code || ind.name}：${blocker}`);
    }
  }
  for (const issue of collectArchitecturePointTypeCoverageIssues(indicators)) {
    if (!issues.includes(issue)) issues.push(issue);
  }
  return issues;
}

/**
 * 对四类易涝点分别验证 V₁～V₄ 均至少存在一条启用且可自动计分的指标。
 * 不能把“该类没有指标”当作得分 0，否则完整度看似通过、实际定级公式却缺项。
 */
export function collectArchitecturePointTypeCoverageIssues(
  indicators: RiskIndicatorRow[],
): string[] {
  const pointTypes: HazardPointType[] = ['SUNKEN', 'TUNNEL', 'UNDERGROUND', 'LOW_LYING'];
  const factors: Level1Factor[] = ['HAZARD', 'FORMATION', 'BEARING', 'PREVENTION'];
  const issues: string[] = [];

  for (const pointType of pointTypes) {
    for (const factor of factors) {
      const group = getSiblingGroup(
        indicators,
        factor,
        factor === 'FORMATION' ? pointType : undefined,
      );
      const scoreable = group.some(indicator => validateIndicatorConfig(indicator, indicators).ok);
      if (!scoreable) {
        issues.push(
          `${HAZARD_POINT_TYPE_LABEL[pointType]}缺少启用且可计算的${LEVEL1_FACTOR_LABEL[factor]}指标`,
        );
      }
    }
  }
  return issues;
}

export function summarizeArchitectureRecord(
  indicators: RiskIndicatorRow[],
  record: IndicatorArchitectureRecord,
): {
  enabledCount: number;
  totalCount: number;
  weightValid: boolean;
  indicatorValid: boolean;
  weightIssueCount: number;
  indicatorIssueCount: number;
  issueCount: number;
} {
  const merged = configToMergedIndicators(indicators, record.config);
  const { weightIssues, indicatorIssues, issues } = validateArchitectureConfig(
    record.config,
    indicators,
  );
  const enabledCount = merged.filter(i => i.enabled).length;
  return {
    enabledCount,
    totalCount: merged.length,
    weightValid: weightIssues.length === 0,
    indicatorValid: indicatorIssues.length === 0,
    weightIssueCount: weightIssues.length,
    indicatorIssueCount: indicatorIssues.length,
    issueCount: issues.length,
  };
}

/** 从编辑态指标回写架构 config（保留元数据） */
export function buildConfigFromEditedIndicators(
  base: IndicatorArchitectureConfig,
  editedIndicators: RiskIndicatorRow[],
  level1Weights: Level1Weights,
): IndicatorArchitectureConfig {
  const weightIssues = collectArchitectureWeightIssues(editedIndicators, level1Weights);
  const indicatorIssues = collectArchitectureIndicatorIssues(editedIndicators);
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  return {
    ...base,
    level1Weights: { ...level1Weights },
    indicatorStates: buildIndicatorStatesFromIndicators(editedIndicators),
    indicatorDefinitions: snapshotIndicatorDefinitions(editedIndicators),
    updatedAt: now,
    status: weightIssues.length === 0 && indicatorIssues.length === 0 ? 'completed' : 'draft',
  };
}

/** 将当前 active 版本与指标定义层对齐：补全新增指标（默认停用） */
export function syncConfigWithIndicatorCatalog(
  config: IndicatorArchitectureConfig,
  indicators: RiskIndicatorRow[],
): IndicatorArchitectureConfig {
  const catalog = config.indicatorDefinitions
    ? Object.values(config.indicatorDefinitions)
    : indicators;
  const nextStates = { ...config.indicatorStates };
  for (const ind of catalog) {
    if (!nextStates[ind.id]) {
      nextStates[ind.id] = { weight: ind.weight, enabled: false };
    }
  }
  return {
    ...config,
    indicatorStates: nextStates,
    indicatorDefinitions:
      config.indicatorDefinitions ?? snapshotIndicatorDefinitions(catalog),
  };
}

/** 深拷贝指标定义，冻结 fieldKey、赋分档、条件规则、适用类型与普查配置。 */
export function snapshotIndicatorDefinitions(
  indicators: RiskIndicatorRow[],
): Record<string, RiskIndicatorRow> {
  return Object.fromEntries(
    indicators.map(ind => [ind.id, JSON.parse(JSON.stringify(ind)) as RiskIndicatorRow]),
  );
}

/**
 * 复制为新评价版本时采用当前指标目录定义，同时沿用来源版本中仍存在指标的启用与权重。
 * 已从目录删除的指标不会进入新版本；新指标默认停用。
 */
export function refreshArchitectureConfigForNewVersion(
  config: IndicatorArchitectureConfig,
  currentIndicators: RiskIndicatorRow[],
): IndicatorArchitectureConfig {
  const indicatorStates: Record<string, IndicatorArchitectureState> = {};
  for (const ind of currentIndicators) {
    indicatorStates[ind.id] = config.indicatorStates[ind.id] ?? {
      weight: ind.weight,
      enabled: false,
    };
  }
  return {
    ...config,
    indicatorStates,
    indicatorDefinitions: snapshotIndicatorDefinitions(currentIndicators),
    status: 'draft',
  };
}

export interface ArchitectureActivationRegenerationPlan {
  /** 目标评价版本 id，供调用方校验并原子写入。 */
  targetArchitectureId: string;
  /** 设定目标版本为定级引用后的评价版本列表。 */
  nextArchitectureRecords: IndicatorArchitectureRecord[];
  /** 原有普查与按目标版本新建的普查列表。 */
  nextPoints: WaterloggingPointRow[];
  /** 本次新增的普查数量。 */
  generatedCount: number;
  /** 已存在同一“易涝点 + 目标评价版本”普查，未重复生成的数量。 */
  existingCount: number;
}

function cloneSurveyValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function compareSurveyRecency(a: WaterloggingPointRow, b: WaterloggingPointRow): number {
  const aTime = a.surveyAt || a.collectedAt || '';
  const bTime = b.surveyAt || b.collectedAt || '';
  return bTime.localeCompare(aTime) || b.id.localeCompare(a.id);
}

/**
 * 切换评价版本后，为每个易涝点生成一条绑定目标版本的待复核普查。
 *
 * 只复制已有的原始填报（附录 B、指标原值及评估支撑材料），绝不修改来源记录；
 * 新记录清空评级结果和“数据引用”标记，并保持“易涝点 + 目标评价版本”唯一，
 * 因而可安全重试。调用方必须将 nextArchitectureRecords 与 nextPoints 一次性持久化。
 */
export function buildArchitectureActivationRegenerationPlan(
  architectureRecords: IndicatorArchitectureRecord[],
  points: WaterloggingPointRow[],
  targetArchitectureId: string,
  generatedAt = new Date().toISOString().slice(0, 19).replace('T', ' '),
): ArchitectureActivationRegenerationPlan | null {
  const target = architectureRecords.find(record => record.id === targetArchitectureId);
  if (!target || getArchitectureRatingReferenceIssue(target)) return null;

  const nextArchitectureRecords = setActiveArchitectureRecord(
    architectureRecords,
    targetArchitectureId,
  );
  const grouped = new Map<string, WaterloggingPointRow[]>();
  for (const point of points) {
    const rows = grouped.get(point.registryId) ?? [];
    rows.push(point);
    grouped.set(point.registryId, rows);
  }

  const created: WaterloggingPointRow[] = [];
  let existingCount = 0;
  for (const [registryId, rows] of grouped) {
    if (rows.some(row => row.surveyArchitectureRefId === target.id)) {
      existingCount += 1;
      continue;
    }

    // 优先取当前有效普查；没有显式引用时只用于“复制填报”，选取最新一条，
    // 不把该选择用于定级，也不会改写任何历史记录。
    const source = [...rows]
      .sort(compareSurveyRecency)
      .sort((a, b) => Number(b.activeForRating) - Number(a.activeForRating))[0];
    if (!source) continue;

    created.push({
      ...source,
      id: `survey-regen-${target.id}-${registryId}`,
      surveyAt: generatedAt,
      label: `评价版本 ${target.versionNo} 重新生成（源：${source.surveyArchitectureVersionNo ?? '未绑定'}）`,
      surveyStatus: 'draft',
      assessmentStatus: 'draft',
      surveyPayload: cloneSurveyValue(source.surveyPayload),
      assessmentPayload: cloneSurveyValue(source.assessmentPayload),
      ratingStatus: 'none',
      ratingResult: undefined,
      activeForRating: false,
      surveyArchitectureRefId: target.id,
      surveyArchitectureRefAt: target.configAt,
      surveyArchitectureVersionNo: target.versionNo,
    });
  }

  return {
    targetArchitectureId,
    nextArchitectureRecords,
    nextPoints: [...created, ...points],
    generatedCount: created.length,
    existingCount,
  };
}

/** 为旧工作区一次性补齐定义快照；已有快照绝不重写。 */
export function ensureArchitectureIndicatorSnapshots(
  records: IndicatorArchitectureRecord[],
  indicators: RiskIndicatorRow[],
): IndicatorArchitectureRecord[] {
  return records.map(record =>
    record.config.indicatorDefinitions
      ? record
      : {
          ...record,
          config: {
            ...record.config,
            indicatorDefinitions: snapshotIndicatorDefinitions(indicators),
          },
        },
  );
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

/** 解析单条普查记录绑定的架构版本；显式引用丢失时必须返回 null，不得静默回退。 */
export function resolveSurveyArchitectureRecord(
  records: IndicatorArchitectureRecord[],
  surveyArchitectureRefId: string | undefined,
  fallback: IndicatorArchitectureRecord | null,
): IndicatorArchitectureRecord | null {
  if (surveyArchitectureRefId) {
    return records.find(r => r.id === surveyArchitectureRefId) ?? null;
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
