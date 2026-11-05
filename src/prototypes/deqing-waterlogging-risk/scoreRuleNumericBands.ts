import { matchNumericCondition } from './branchNumericMatch';
import type { BranchNumericMatch, IndicatorAppendixBTierBand, RiskIndicatorRow, ScoreRule } from './types';
import { resolveScoringRuleMode } from './scoringRuleMode';

type NumericMatchOwner = { numericMatch?: BranchNumericMatch };
type NumericInterval = {
  min: number;
  max: number;
  minInclusive: boolean;
  maxInclusive: boolean;
};

export type NumericCoverageOptions = {
  /**
   * 数值型评分规则默认必须覆盖全部实数域，避免合法填报值落在首末档之外。
   * 条件来源若业务上有明确值域，可显式传入边界而不是依赖规则排列顺序。
   */
  min?: number;
  max?: number;
};

function toNumericInterval(match: BranchNumericMatch): NumericInterval | null {
  switch (match.kind) {
    case 'eq':
      return Number.isFinite(match.value)
        ? { min: match.value, max: match.value, minInclusive: true, maxInclusive: true }
        : null;
    case 'lt':
    case 'lte':
      return Number.isFinite(match.value)
        ? {
            min: Number.NEGATIVE_INFINITY,
            max: match.value,
            minInclusive: false,
            maxInclusive: match.kind === 'lte',
          }
        : null;
    case 'gt':
    case 'gte':
      return Number.isFinite(match.value)
        ? {
            min: match.value,
            max: Number.POSITIVE_INFINITY,
            minInclusive: match.kind === 'gte',
            maxInclusive: false,
          }
        : null;
    case 'between':
      if (!Number.isFinite(match.min) || !Number.isFinite(match.max) || match.min > match.max) {
        return null;
      }
      return {
        min: match.min,
        max: match.max,
        minInclusive: match.minInclusive !== false,
        maxInclusive: match.maxInclusive !== false,
      };
    default:
      return null;
  }
}

/** 数值区间须合法、互斥，并连续覆盖指定值域（默认为全部实数）。 */
export function validateNumericMatchCoverage(
  owners: NumericMatchOwner[] | undefined,
  options: NumericCoverageOptions = {},
): string | null {
  if (!owners?.length) return null;
  if (owners.some(owner => !owner?.numericMatch)) return '每一档都须配置匹配区间';
  const intervals = owners.map(owner => toNumericInterval(owner.numericMatch!));
  if (intervals.some(interval => interval === null)) {
    return '匹配区间包含无效数值，且区间下限不得大于上限';
  }
  const sorted = (intervals as NumericInterval[]).sort((a, b) => {
    if (a.min !== b.min) return a.min - b.min;
    if (a.minInclusive !== b.minInclusive) return a.minInclusive ? -1 : 1;
    return a.max - b.max;
  });
  const domainMin = options.min ?? Number.NEGATIVE_INFINITY;
  const domainMax = options.max ?? Number.POSITIVE_INFINITY;
  if (!Number.isFinite(domainMin) && domainMin !== Number.NEGATIVE_INFINITY) {
    return '匹配区间校验范围下限无效';
  }
  if (!Number.isFinite(domainMax) && domainMax !== Number.POSITIVE_INFINITY) {
    return '匹配区间校验范围上限无效';
  }
  if (domainMin > domainMax) return '匹配区间校验范围下限不得大于上限';

  if (
    sorted[0]!.min > domainMin ||
    (Number.isFinite(domainMin) &&
      sorted[0]!.min === domainMin &&
      !sorted[0]!.minInclusive)
  ) {
    return '匹配区间未覆盖起始边界之外的数值';
  }
  let previous = sorted[0]!;
  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index]!;
    if (
      current.min < previous.max ||
      (current.min === previous.max && current.minInclusive && previous.maxInclusive)
    ) {
      return '匹配区间不可重叠';
    }
    if (
      current.min > previous.max ||
      (current.min === previous.max && !current.minInclusive && !previous.maxInclusive)
    ) {
      return '匹配区间之间不可留空档';
    }
    if (
      current.max > previous.max ||
      (current.max === previous.max && current.maxInclusive && !previous.maxInclusive)
    ) {
      previous = current;
    }
  }
  if (
    previous.max < domainMax ||
    (Number.isFinite(domainMax) && previous.max === domainMax && !previous.maxInclusive)
  ) {
    return '匹配区间未覆盖末尾边界之外的数值';
  }
  return null;
}

/** 导则预置数值指标：种子或持久化缺 numericMatch 时按编码补全附录 F 区间 */
export const BUILTIN_NUMERIC_SCORE_CODES = new Set([
  'HZ_RAIN_ALERT_FREQ',
  'FM_SK_LONG_SLOPE',
  'FM_TN_LONG_SLOPE',
  'FM_LL_RUNOFF_COEF',
  'PR_PUMP_CAPACITY',
  'PR_RESPONSE_6H',
  'PR_DISPOSE_2H',
]);

/** 导则附录 F 预置数值统一赋分区间（按指标编码） */
export const PRESET_NUMERIC_UNIFORM_BANDS: Record<
  string,
  Array<Pick<ScoreRule, 'label' | 'riskTier' | 'score' | 'numericMatch'>>
> = {
  FM_SK_LONG_SLOPE: [
    { label: 'S<5%', riskTier: '低', score: 0.25, numericMatch: { kind: 'lt', value: 5 } },
    {
      label: '5≤S<7%',
      riskTier: '中',
      score: 0.5,
      numericMatch: { kind: 'between', min: 5, max: 7, minInclusive: true, maxInclusive: false },
    },
    {
      label: '7%≤S<10%',
      riskTier: '较高',
      score: 0.75,
      numericMatch: { kind: 'between', min: 7, max: 10, minInclusive: true, maxInclusive: false },
    },
    { label: 'S≥10%', riskTier: '高', score: 1, numericMatch: { kind: 'gte', value: 10 } },
  ],
  FM_TN_LONG_SLOPE: [
    { label: 'S<1%', riskTier: '低', score: 0.2, numericMatch: { kind: 'lt', value: 1 } },
    {
      label: '1%≤S<4%',
      riskTier: '中',
      score: 0.6,
      numericMatch: { kind: 'between', min: 1, max: 4, minInclusive: true, maxInclusive: false },
    },
    { label: 'S≥4%', riskTier: '高', score: 1, numericMatch: { kind: 'gte', value: 4 } },
  ],
  HZ_RAIN_ALERT_FREQ: [
    { label: 'N≤8', riskTier: '低', score: 0.25, numericMatch: { kind: 'lte', value: 8 } },
    {
      label: '8<N≤16',
      riskTier: '中',
      score: 0.5,
      numericMatch: { kind: 'between', min: 8, max: 16, minInclusive: false, maxInclusive: true },
    },
    {
      label: '16<N≤24',
      riskTier: '较高',
      score: 0.75,
      numericMatch: { kind: 'between', min: 16, max: 24, minInclusive: false, maxInclusive: true },
    },
    { label: 'N>24', riskTier: '高', score: 1, numericMatch: { kind: 'gt', value: 24 } },
  ],
  FM_LL_RUNOFF_COEF: [
    { label: 'Ψ≤0.45', riskTier: '低', score: 0.5, numericMatch: { kind: 'lte', value: 0.45 } },
    {
      label: '0.45<Ψ≤0.6',
      riskTier: '中',
      score: 0.75,
      numericMatch: { kind: 'between', min: 0.45, max: 0.6, minInclusive: false, maxInclusive: true },
    },
    { label: 'Ψ>0.6', riskTier: '高', score: 1, numericMatch: { kind: 'gt', value: 0.6 } },
  ],
  PR_PUMP_CAPACITY: [
    { label: 'B≥60', riskTier: '低', score: 0.2, numericMatch: { kind: 'gte', value: 60 } },
    {
      label: '20≤B<60',
      riskTier: '中',
      score: 0.6,
      numericMatch: { kind: 'between', min: 20, max: 60, minInclusive: true, maxInclusive: false },
    },
    { label: 'B<20', riskTier: '高', score: 1, numericMatch: { kind: 'lt', value: 20 } },
  ],
  PR_RESPONSE_6H: [
    { label: 'R≥90%', riskTier: '低', score: 0, numericMatch: { kind: 'gte', value: 90 } },
    { label: 'R<90%', riskTier: '高', score: 1, numericMatch: { kind: 'lt', value: 90 } },
  ],
  PR_DISPOSE_2H: [
    { label: 'D≥90%', riskTier: '低', score: 0, numericMatch: { kind: 'gte', value: 90 } },
    { label: 'D<90%', riskTier: '高', score: 1, numericMatch: { kind: 'lt', value: 90 } },
  ],
};

export function hasConfiguredNumericBands(rules: ScoreRule[] | undefined): boolean {
  return Boolean(rules?.some(r => r.numericMatch));
}

/**
 * 按数值区间匹配赋分档。
 * 配置出现重叠时返回 null，禁止因数组顺序不同得到不同的定级结果。
 */
export function matchScoreRuleByNumericBands(
  rules: ScoreRule[],
  raw: number,
): ScoreRule | null {
  const matched = rules.filter(
    rule => Boolean(rule.numericMatch && matchNumericCondition(raw, rule.numericMatch)),
  );
  return matched.length === 1 ? matched[0]! : null;
}

export function usesBuiltinNumericScoreCode(code: string | undefined): boolean {
  return Boolean(code && PRESET_NUMERIC_UNIFORM_BANDS[code]);
}

/** 数值统一赋分是否须配置区间 */
export function requiresNumericBandConfig(ind: Pick<RiskIndicatorRow, 'code' | 'valueType' | 'scoringRuleMode' | 'survey' | 'conditionalScoring'>): boolean {
  if (ind.valueType !== 'numeric') return false;
  if (resolveScoringRuleMode(ind) !== 'uniform') return false;
  return true;
}

export function validateNumericUniformBands(scoreRules: ScoreRule[]): string | null {
  if (!scoreRules.length) return null;
  if (scoreRules.some(r => !r.numericMatch)) {
    return '数值型统一赋分须为每一档配置「匹配区间」，否则无法按填报值自动赋分';
  }
  const coverageError = validateNumericMatchCoverage(scoreRules);
  if (coverageError) return `数值型统一赋分${coverageError}`;
  return null;
}

/** 为导则预置编码补全 scoreRules.numericMatch（已有配置不覆盖） */
export function mergePresetNumericBands(code: string, rules: ScoreRule[]): ScoreRule[] {
  const preset = PRESET_NUMERIC_UNIFORM_BANDS[code];
  if (!preset?.length) return rules;
  return rules.map((rule, index) => {
    if (rule.numericMatch) return rule;
    const byLabel = preset.find(
      p => p.label === rule.label && Math.abs(p.score - rule.score) < 1e-9,
    );
    const byIndex =
      preset[index] && Math.abs(preset[index].score - rule.score) < 1e-9
        ? preset[index]
        : undefined;
    const hit = byLabel ?? byIndex;
    if (!hit?.numericMatch) return rule;
    return { ...rule, numericMatch: { ...hit.numericMatch } };
  });
}

/** 空白自建：不自动注入导则预置匹配区间 */
export function enrichNumericUniformScoreRules(row: RiskIndicatorRow): RiskIndicatorRow {
  return row;
}

/** 不再自动注入条件分支 numericMatch */
export function enrichNumericConditionalBranchRules(row: RiskIndicatorRow): RiskIndicatorRow {
  return row;
}

export function enrichNumericScoreRules(row: RiskIndicatorRow): RiskIndicatorRow {
  return enrichNumericUniformScoreRules(row);
}

/** 通用新建数值分档：仅四档标准分 F，匹配区间由用户按指标含义自行配置 */
export function createGenericNumericUniformRules(idPrefix = 'rule'): ScoreRule[] {
  return [
    { id: `${idPrefix}-n0`, label: '', riskTier: '', score: 0.25 },
    { id: `${idPrefix}-n1`, label: '', riskTier: '', score: 0.5 },
    { id: `${idPrefix}-n2`, label: '', riskTier: '', score: 0.75 },
    { id: `${idPrefix}-n3`, label: '', riskTier: '', score: 1 },
  ];
}

/** 条件分支内数值赋分：仅四档标准分 F，匹配区间由用户配置（与 uniform 一致） */
export function createGenericNumericBranchRules(idPrefix = 'rule'): ScoreRule[] {
  return createGenericNumericUniformRules(idPrefix);
}

/** 纵坡度等导则示意区间（5/7/10），仅用于文档或专项演示，不注入通用新建 */
export function createSlopeExampleNumericBandRules(idPrefix = 'rule'): ScoreRule[] {
  const bands: Array<Omit<ScoreRule, 'id'>> = [
    { label: '低档', riskTier: '低', score: 0.25, numericMatch: { kind: 'lt', value: 5 } },
    {
      label: '中档',
      riskTier: '中',
      score: 0.5,
      numericMatch: { kind: 'between', min: 5, max: 7, minInclusive: true, maxInclusive: false },
    },
    {
      label: '较高档',
      riskTier: '较高',
      score: 0.75,
      numericMatch: { kind: 'between', min: 7, max: 10, minInclusive: true, maxInclusive: false },
    },
    { label: '高档', riskTier: '高', score: 1, numericMatch: { kind: 'gte', value: 10 } },
  ];
  return bands.map((b, i) => ({ ...b, id: `${idPrefix}-n${i}` }));
}

/** @deprecated 请用 createGenericNumericUniformRules；保留别名以免外部引用断裂 */
export function createDefaultNumericBandRules(idPrefix = 'rule'): ScoreRule[] {
  return createSlopeExampleNumericBandRules(idPrefix);
}

export type NumericMatchLabelOptions = {
  /** 展示用变量符号，默认「值」 */
  valueSymbol?: string;
  /** 单位，如 %、次；数值后自动拼接 */
  unit?: string;
};

function formatThreshold(value: number, unit?: string): string {
  const u = unit?.trim() ?? '';
  if (!u || u === '无量纲') return String(value);
  if (u === '%') return `${value}%`;
  return `${value}${u}`;
}

/** 是否为系统自动生成的分档描述形态（非用户自定义文案） */
export function isLikelyAutoNumericRuleLabel(label: string): boolean {
  const t = label.trim();
  if (!t) return false;
  if (/^值\s*[<≤>≥]/.test(t)) return true;
  if (/[<≤]\s*值\s*[<≤>≥]/.test(t)) return true;
  if (/^[\d.]+\s*[<≤]\s*值/.test(t)) return true;
  return false;
}

/** 导则模板等预置档位名（非用户自定义分档描述，可随单位刷新） */
export const GENERIC_PRESET_TIER_LABELS = new Set(['低', '中', '较高', '高']);

/** 分档描述是否仍为系统自动生成（可随单位/区间更新） */
export function shouldRefreshNumericRuleLabel(
  rule: Pick<ScoreRule, 'label' | 'numericMatch'>,
  unit?: string,
): boolean {
  if (!rule.numericMatch) return false;
  const label = String(rule.label ?? '').trim();
  if (!label) return true;
  const variants = new Set([
    formatNumericMatchLabel(rule.numericMatch, {}),
    formatNumericMatchLabel(rule.numericMatch, { unit }),
  ]);
  if (variants.has(label)) return true;
  if (GENERIC_PRESET_TIER_LABELS.has(label)) return true;
  return isLikelyAutoNumericRuleLabel(label);
}

/** 将仍为自动生成的分档描述按当前单位重算（用户手改过的保留） */
export function refreshAutoNumericRuleLabels(
  rules: ScoreRule[],
  options?: NumericMatchLabelOptions,
): ScoreRule[] {
  return rules.map(r => {
    if (!r.numericMatch || !shouldRefreshNumericRuleLabel(r, options?.unit)) return r;
    const label = formatNumericMatchLabel(r.numericMatch, options);
    return label ? { ...r, label } : r;
  });
}

/** 由匹配区间生成展示用分档描述（如 值<5%、5≤值<7%） */
export function formatNumericMatchLabel(
  match: BranchNumericMatch,
  options: NumericMatchLabelOptions = {},
): string {
  const sym = options.valueSymbol ?? '值';
  const unit = options.unit?.trim() ?? '';
  const n = (v: number) => formatThreshold(v, unit);

  switch (match.kind) {
    case 'eq':
      return `${sym}=${n(match.value)}`;
    case 'lt':
      return `${sym}<${n(match.value)}`;
    case 'lte':
      return `${sym}≤${n(match.value)}`;
    case 'gt':
      return `${sym}>${n(match.value)}`;
    case 'gte':
      return `${sym}≥${n(match.value)}`;
    case 'between': {
      const left = match.minInclusive !== false ? '≤' : '<';
      const right = match.maxInclusive !== false ? '≤' : '<';
      return `${n(match.min)}${left}${sym}${right}${n(match.max)}`;
    }
    default:
      return '';
  }
}

/** 赋分预览等场景：可读性略强的区间说明 */
export function describeNumericMatch(match: BranchNumericMatch): string {
  return formatNumericMatchLabel(match);
}

/** 分档描述为空时，按 numericMatch 补全展示文案 */
export function enrichNumericRuleLabels(
  rules: ScoreRule[],
  options?: NumericMatchLabelOptions,
): ScoreRule[] {
  return refreshAutoNumericRuleLabels(rules, options);
}

/** 复合子项分档描述是否仍为系统自动生成 */
export function shouldRefreshTierBandLabel(
  band: Pick<IndicatorAppendixBTierBand, 'riskTier' | 'match'>,
  unit?: string,
): boolean {
  if (!band.match) return false;
  const label = String(band.riskTier ?? '').trim();
  if (!label) return true;
  const variants = new Set([
    formatNumericMatchLabel(band.match, {}),
    formatNumericMatchLabel(band.match, { unit }),
  ]);
  if (variants.has(label)) return true;
  if (GENERIC_PRESET_TIER_LABELS.has(label)) return true;
  return isLikelyAutoNumericRuleLabel(label);
}

/** 复合子项：将仍为自动生成的分档描述写入 riskTier */
export function refreshAutoTierBandLabels(
  bands: IndicatorAppendixBTierBand[],
  options?: NumericMatchLabelOptions,
): IndicatorAppendixBTierBand[] {
  return bands.map(b => {
    if (!b.match || !shouldRefreshTierBandLabel(b, options?.unit)) return b;
    const riskTier = formatNumericMatchLabel(b.match, options);
    return riskTier ? { ...b, riskTier } : b;
  });
}
