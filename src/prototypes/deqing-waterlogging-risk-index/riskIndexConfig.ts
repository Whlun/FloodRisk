import type { AlertLevel } from './types';

/** 持续内涝加重单条规则 */
export type DurationSeverityRule = {
  id: string;
  /** 是否启用该档 */
  enabled: boolean;
  /** 距发布满多少小时 */
  hours: number;
  /** 满足条件时的附加分 */
  bonus: number;
};

/** 内涝风险指数计算配置（页面维护，存于浏览器本地） */
export type RiskIndexConfig = {
  /** 各报警等级在加权求和 W 中的分值 */
  levelWeights: Record<AlertLevel, number>;
  /** W 映射到 0–100 指数的系数：指数 = round(W × indexScale) */
  indexScale: number;
  /** 指数上限 */
  indexMax: number;
  /** 综合指数 ≤ tierLowMax 为低风险 */
  tierLowMax: number;
  /** 综合指数 ≤ tierMediumMax 为中风险，否则为高风险 */
  tierMediumMax: number;
  /** 是否启用持续内涝加重 */
  durationSeverityEnabled: boolean;
  /** 持续加重规则（匹配时取 hours 最大且已启用的档位） */
  durationSeverityRules: DurationSeverityRule[];
};

export const DEFAULT_DURATION_SEVERITY_RULES: DurationSeverityRule[] = [
  { id: 'rule-12', enabled: true, hours: 12, bonus: 6 },
  { id: 'rule-24', enabled: true, hours: 24, bonus: 15 },
];

export const DEFAULT_RISK_INDEX_CONFIG: RiskIndexConfig = {
  levelWeights: {
    low: 1,
    medium: 2,
    high: 5,
  },
  /** 换算系数：指数 = round(W × indexScale)。默认 3.6 为演示口径，使典型一期 W≈10–20 时指数落在约 36–72 分，便于区分三级风险；可按辖区历史 W 分布业务调整 */
  indexScale: 3.6,
  indexMax: 100,
  tierLowMax: 40,
  tierMediumMax: 65,
  durationSeverityEnabled: true,
  durationSeverityRules: DEFAULT_DURATION_SEVERITY_RULES.map(r => ({ ...r })),
};

const STORAGE_KEY = 'dq-risk-index-config-v2';

let cachedConfig: RiskIndexConfig = cloneConfig(DEFAULT_RISK_INDEX_CONFIG);

function cloneConfig(cfg: RiskIndexConfig): RiskIndexConfig {
  return {
    ...cfg,
    levelWeights: { ...cfg.levelWeights },
    durationSeverityRules: cfg.durationSeverityRules.map(r => ({ ...r })),
  };
}

function isValidRule(rule: unknown): rule is DurationSeverityRule {
  if (!rule || typeof rule !== 'object') return false;
  const r = rule as Partial<DurationSeverityRule>;
  return (
    typeof r.id === 'string' &&
    r.id.length > 0 &&
    typeof r.enabled === 'boolean' &&
    typeof r.hours === 'number' &&
    r.hours >= 1 &&
    r.hours <= 168 &&
    typeof r.bonus === 'number' &&
    r.bonus >= 0 &&
    r.bonus <= 50
  );
}

function isValidConfig(raw: unknown): raw is RiskIndexConfig {
  if (!raw || typeof raw !== 'object') return false;
  const c = raw as Partial<RiskIndexConfig> & {
    durationBonus12?: number;
    durationBonus24?: number;
  };
  const w = c.levelWeights;
  if (
    !w ||
    typeof w.low !== 'number' ||
    typeof w.medium !== 'number' ||
    typeof w.high !== 'number' ||
    w.low <= 0 ||
    w.medium <= 0 ||
    w.high <= 0
  ) {
    return false;
  }
  if (typeof c.indexScale !== 'number' || c.indexScale <= 0) return false;
  if (typeof c.indexMax !== 'number' || c.indexMax <= 0) return false;
  if (typeof c.tierLowMax !== 'number' || typeof c.tierMediumMax !== 'number') return false;
  if (c.tierLowMax <= 0 || c.tierMediumMax <= c.tierLowMax || c.tierMediumMax >= c.indexMax) return false;

  if (Array.isArray(c.durationSeverityRules)) {
    if (typeof c.durationSeverityEnabled !== 'boolean') return false;
    if (c.durationSeverityRules.length === 0 || c.durationSeverityRules.length > 8) return false;
    if (!c.durationSeverityRules.every(isValidRule)) return false;
    const enabledHours = c.durationSeverityRules.filter(r => r.enabled).map(r => r.hours);
    if (new Set(enabledHours).size !== enabledHours.length) return false;
    return true;
  }

  // 兼容 v1：仅含 durationBonus12/24
  if (typeof c.durationBonus12 === 'number' && c.durationBonus12 >= 0 && typeof c.durationBonus24 === 'number' && c.durationBonus24 >= 0) {
    return true;
  }
  return false;
}

function migrateLegacyDurationRules(
  parsed: Partial<RiskIndexConfig> & { durationBonus12?: number; durationBonus24?: number },
): DurationSeverityRule[] {
  return [
    {
      id: 'rule-12',
      enabled: true,
      hours: 12,
      bonus: parsed.durationBonus12 ?? DEFAULT_DURATION_SEVERITY_RULES[0].bonus,
    },
    {
      id: 'rule-24',
      enabled: true,
      hours: 24,
      bonus: parsed.durationBonus24 ?? DEFAULT_DURATION_SEVERITY_RULES[1].bonus,
    },
  ];
}

function mergeRiskIndexConfig(parsed: Partial<RiskIndexConfig> & Record<string, unknown>): RiskIndexConfig {
  const hasRules = Array.isArray(parsed.durationSeverityRules);
  const durationSeverityRules = hasRules
    ? (parsed.durationSeverityRules as DurationSeverityRule[]).map(r => ({ ...r }))
    : migrateLegacyDurationRules(parsed as Partial<RiskIndexConfig> & { durationBonus12?: number; durationBonus24?: number });

  return {
    ...DEFAULT_RISK_INDEX_CONFIG,
    ...parsed,
    levelWeights: { ...DEFAULT_RISK_INDEX_CONFIG.levelWeights, ...parsed.levelWeights },
    durationSeverityEnabled: parsed.durationSeverityEnabled ?? true,
    durationSeverityRules,
  };
}

/** 已启用规则，按 hours 降序（高档优先匹配） */
export function getEnabledDurationRules(cfg: RiskIndexConfig): DurationSeverityRule[] {
  return cfg.durationSeverityRules.filter(r => r.enabled).sort((a, b) => b.hours - a.hours);
}

/** 已启用规则，按 hours 升序 */
export function getEnabledDurationRulesAsc(cfg: RiskIndexConfig): DurationSeverityRule[] {
  return cfg.durationSeverityRules.filter(r => r.enabled).sort((a, b) => a.hours - b.hours);
}

/** 规则说明文案（用于帮助与公式） */
export function formatDurationSeverityRulesSummary(cfg: RiskIndexConfig): string {
  if (!cfg.durationSeverityEnabled) return '未启用';
  const rules = getEnabledDurationRulesAsc(cfg);
  if (rules.length === 0) return '无档位规则';
  return rules
    .map(r => `满 ${r.hours}h 且发布后 ${r.hours}h 内曾出现预警 +${r.bonus}`)
    .join('；')
    .concat('（取满足条件的最高档）');
}

/** 从 localStorage 读取（兼容 v1 键名） */
export function loadRiskIndexConfig(): RiskIndexConfig {
  try {
    for (const key of [STORAGE_KEY, 'dq-risk-index-config-v1']) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as unknown;
      if (isValidConfig(parsed)) {
        cachedConfig = cloneConfig(mergeRiskIndexConfig(parsed as Partial<RiskIndexConfig> & Record<string, unknown>));
        if (key !== STORAGE_KEY) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedConfig));
          } catch {
            /* 忽略 */
          }
        }
        return cachedConfig;
      }
    }
  } catch {
    /* 忽略本地存储异常 */
  }
  cachedConfig = cloneConfig(DEFAULT_RISK_INDEX_CONFIG);
  return cachedConfig;
}

/** 保存配置到本地存储并更新内存缓存 */
export function saveRiskIndexConfig(config: RiskIndexConfig): void {
  if (!isValidConfig(config)) {
    throw new Error('配置参数不合法');
  }
  cachedConfig = cloneConfig(config);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedConfig));
  } catch {
    /* 忽略 */
  }
}

/** 读取当前生效配置 */
export function getRiskIndexConfig(): RiskIndexConfig {
  return cachedConfig;
}

/** 校验表单值，返回错误文案；合法则返回 null */
export function validateRiskIndexConfig(config: RiskIndexConfig): string | null {
  if (!isValidConfig(config)) {
    return '请检查各项参数：权重须为正数，等级阈值须满足 0 < 低 ≤ 中 < 上限；持续加重规则的小时数不可重复';
  }
  if (config.durationSeverityEnabled) {
    const enabled = config.durationSeverityRules.filter(r => r.enabled);
    if (enabled.length === 0) {
      return '已启用持续内涝加重时，请至少保留一条档位规则';
    }
  }
  return null;
}

/** 生成新规则 id */
export function createDurationRuleId(): string {
  return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// 模块加载时同步本地配置
loadRiskIndexConfig();
