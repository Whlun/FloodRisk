import {
  HAZARD_POINT_TYPE_LABEL,
  LEVEL1_DEFAULT_WEIGHT,
  LEVEL1_FACTOR_LABEL,
  type HazardPointType,
  type Level1Factor,
  type Level1Weights,
  type RiskIndicatorRow,
} from './types';

const LEVEL1_ORDER: Level1Factor[] = ['HAZARD', 'FORMATION', 'BEARING', 'PREVENTION'];

const FORMATION_HAZARD_TYPES: HazardPointType[] = ['SUNKEN', 'TUNNEL', 'UNDERGROUND', 'LOW_LYING'];

export interface WeightValidationIssue {
  label: string;
  sum: number;
}

/** 校验架构图权重：一级因子 + 各启用同级组（含四类孕灾子集） */
export function collectArchitectureWeightIssues(
  indicators: RiskIndicatorRow[],
  level1Weights: Level1Weights,
): WeightValidationIssue[] {
  const issues: WeightValidationIssue[] = [];

  if (!isLevel1WeightSumValid(level1Weights)) {
    issues.push({
      label: '一级因子权重（综合分 V）',
      sum: sumLevel1Weights(level1Weights),
    });
  }

  for (const level1 of ['HAZARD', 'BEARING', 'PREVENTION'] as Level1Factor[]) {
    const group = getSiblingGroup(indicators, level1);
    if (group.length === 0) continue;
    const sum = sumSiblingWeights(group);
    if (!isSiblingWeightSumValid(sum)) {
      issues.push({ label: `${LEVEL1_FACTOR_LABEL[level1]}（启用指标）`, sum });
    }
  }

  for (const hazardType of FORMATION_HAZARD_TYPES) {
    const group = getSiblingGroup(indicators, 'FORMATION', hazardType);
    if (group.length === 0) continue;
    const sum = sumSiblingWeights(group);
    if (!isSiblingWeightSumValid(sum)) {
      issues.push({
        label: `孕灾因子 · ${HAZARD_POINT_TYPE_LABEL[hazardType]}（启用指标）`,
        sum,
      });
    }
  }

  return issues;
}

const WEIGHT_DECIMALS = 3;

/** 获取同级二级指标组（与 validateSiblingWeights 分组一致） */
export function getSiblingGroup(
  indicators: RiskIndicatorRow[],
  level1: Level1Factor,
  formationType?: HazardPointType,
): RiskIndicatorRow[] {
  let group = indicators.filter(i => i.enabled && i.level1 === level1);
  if (level1 === 'FORMATION' && formationType) {
    group = group.filter(i => i.applicableTypes.includes(formationType));
  } else if (level1 !== 'FORMATION') {
    group = group.filter(i => i.applicableTypes.includes('GLOBAL'));
  }
  return group;
}

export function sumSiblingWeights(group: RiskIndicatorRow[]): number {
  return group.reduce((s, i) => s + i.weight, 0);
}

/** 同级/一级权重合计须严格等于 1.000（与界面三位小数一致，不做容差） */
export function isSiblingWeightSumValid(sum: number): boolean {
  const factor = 10 ** WEIGHT_DECIMALS;
  return Math.round(sum * factor) === factor;
}

/** 将组内权重按比例缩放到合计 1 */
export function normalizeSiblingWeightMap(group: RiskIndicatorRow[]): Record<string, number> {
  const map: Record<string, number> = {};
  if (group.length === 0) return map;
  if (group.length === 1) {
    map[group[0].id] = 1;
    return map;
  }
  const total = sumSiblingWeights(group);
  if (total <= 0) {
    const each = 1 / group.length;
    for (const ind of group) map[ind.id] = each;
    return map;
  }
  for (const ind of group) {
    map[ind.id] = ind.weight / total;
  }
  return map;
}

/**
 * 修改一项权重后，其余同级按原比例分摊剩余权重，使合计为 1
 * @returns 组内 id→weight；若无法配平返回 null
 */
export function rebalanceSiblingWeightMap(
  group: RiskIndicatorRow[],
  changedId: string,
  newWeight: number,
): Record<string, number> | null {
  if (group.length === 0) return null;
  if (group.length === 1) {
    return { [group[0].id]: 1 };
  }

  const target = group.find(i => i.id === changedId);
  if (!target) return null;

  const clamped = Math.min(1, Math.max(0, newWeight));
  const others = group.filter(i => i.id !== changedId);
  const remain = 1 - clamped;

  const map: Record<string, number> = { [changedId]: clamped };

  if (others.length === 0) {
    return map;
  }

  if (remain < 0) return null;

  const othersWeightSum = others.reduce((s, i) => s + i.weight, 0);
  if (othersWeightSum > 0) {
    for (const ind of others) {
      map[ind.id] = (ind.weight / othersWeightSum) * remain;
    }
  } else {
    const each = remain / others.length;
    for (const ind of others) {
      map[ind.id] = each;
    }
  }

  return map;
}

/** 仅更新单个指标权重（不联动其余同级） */
export function setSingleIndicatorWeightMap(
  indicatorId: string,
  newWeight: number,
): Record<string, number> {
  const clamped = Math.min(1, Math.max(0, newWeight));
  return { [indicatorId]: clamped };
}

/** 将权重映射写回完整指标列表 */
export function applyWeightMap(
  indicators: RiskIndicatorRow[],
  weightMap: Record<string, number>,
): RiskIndicatorRow[] {
  if (Object.keys(weightMap).length === 0) return indicators;
  const ts = new Date().toISOString().slice(0, 19).replace('T', ' ');
  return indicators.map(ind =>
    ind.id in weightMap ? { ...ind, weight: weightMap[ind.id], updatedAt: ts } : ind,
  );
}

/**
 * 从导则预置数据恢复某同级组权重（保持附录原始 ω，不做比例缩放）
 */
export function sumLevel1Weights(weights: Level1Weights): number {
  return LEVEL1_ORDER.reduce((s, k) => s + weights[k], 0);
}

export function isLevel1WeightSumValid(weights: Level1Weights): boolean {
  return isSiblingWeightSumValid(sumLevel1Weights(weights));
}

export function normalizeLevel1Weights(weights: Level1Weights): Level1Weights {
  const total = sumLevel1Weights(weights);
  if (total <= 0) {
    const each = 1 / LEVEL1_ORDER.length;
    return Object.fromEntries(LEVEL1_ORDER.map(k => [k, each])) as Level1Weights;
  }
  return Object.fromEntries(LEVEL1_ORDER.map(k => [k, weights[k] / total])) as Level1Weights;
}

export function restoreDefaultLevel1Weights(): Level1Weights {
  return { ...LEVEL1_DEFAULT_WEIGHT };
}

export function setSingleLevel1Weight(
  weights: Level1Weights,
  level1: Level1Factor,
  value: number,
): Level1Weights {
  return { ...weights, [level1]: Math.min(1, Math.max(0, value)) };
}

export function formatLevel1Formula(weights: Level1Weights): string {
  return `V = ${weights.HAZARD.toFixed(3)}×V₁ + ${weights.FORMATION.toFixed(3)}×V₂ + ${weights.BEARING.toFixed(3)}×V₃ + ${weights.PREVENTION.toFixed(3)}×V₄`;
}

function findDefaultIndicator(
  ind: RiskIndicatorRow,
  defaults: RiskIndicatorRow[],
): RiskIndicatorRow | undefined {
  return defaults.find(d => d.id === ind.id) ?? defaults.find(d => d.code === ind.code);
}

/** 单条指标恢复默认时的 ω / 启用补丁；用户新增指标恢复为停用 */
function buildIndicatorRestorePatch(
  ind: RiskIndicatorRow,
  defaults: RiskIndicatorRow[],
): Partial<Pick<RiskIndicatorRow, 'weight' | 'enabled'>> | null {
  const base = findDefaultIndicator(ind, defaults);
  if (base) {
    if (ind.weight === base.weight && ind.enabled === base.enabled) return null;
    return { weight: base.weight, enabled: base.enabled };
  }
  if (ind.enabled) return { enabled: false };
  return null;
}

function applyIndicatorRestorePatches(
  indicators: RiskIndicatorRow[],
  defaults: RiskIndicatorRow[],
  onlyIds?: Set<string>,
): RiskIndicatorRow[] {
  const ts = new Date().toISOString().slice(0, 19).replace('T', ' ');
  return indicators.map(ind => {
    if (onlyIds && !onlyIds.has(ind.id)) return ind;
    const patch = buildIndicatorRestorePatch(ind, defaults);
    if (!patch) return ind;
    return { ...ind, ...patch, updatedAt: ts };
  });
}

/** 将全部指标的 ω 与启用状态恢复为导则预置；用户新增指标停用（保留其余已修正字段） */
export function restoreIndicatorsWeightAndEnabledFromDefaults(
  current: RiskIndicatorRow[],
  defaults: RiskIndicatorRow[],
): RiskIndicatorRow[] {
  return applyIndicatorRestorePatches(current, defaults);
}

/** 将指定列内指标的 ω 与启用状态恢复为导则预置；该列用户新增指标停用 */
export function applyColumnRestoreFromDefaults(
  allIndicators: RiskIndicatorRow[],
  columnIndicatorIds: Iterable<string>,
  defaults: RiskIndicatorRow[],
): RiskIndicatorRow[] {
  return applyIndicatorRestorePatches(allIndicators, defaults, new Set(columnIndicatorIds));
}

export function restoreDefaultWeightMap(
  group: RiskIndicatorRow[],
  defaults: RiskIndicatorRow[],
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const ind of group) {
    const base = defaults.find(d => d.id === ind.id) ?? defaults.find(d => d.code === ind.code);
    map[ind.id] = base?.weight ?? ind.weight;
  }
  return map;
}
