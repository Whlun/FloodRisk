import type { RiskIndicatorRow, ScoreRule } from './types';

/** 附录 B 可作为复合前置门控的布尔字段（配置下拉） */
export const APPENDIX_B_BOOLEAN_PREFLIGHT_FIELDS: { value: string; label: string }[] = [
  { value: 'hasHistoricalDisaster', label: '有历史灾情' },
  { value: 'hasStorageTank', label: '是否有调蓄池' },
  { value: 'hasDrainagePump', label: '是否有排涝泵站' },
  { value: 'hasMonitoring', label: '是否有监测设施' },
  { value: 'hasEmergencyPlan', label: '是否有内涝应急预案' },
  { value: 'alarmDeviceNormal', label: '积水报警装置运行正常' },
  { value: 'rainInletMeetsStandard', label: '雨水口/沟满足规范' },
];

function pickRuleByScore(rules: ScoreRule[], targetScore: number): ScoreRule | null {
  return rules.reduce<ScoreRule | null>((best, r) => {
    if (!best) return r;
    return Math.abs(r.score - targetScore) < Math.abs(best.score - targetScore) ? r : best;
  }, null);
}

function parseAppendixBBoolean(
  raw: string | number | boolean | null | undefined,
): boolean | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (raw === true || raw === 'true' || raw === 'yes') return true;
  if (raw === false || raw === 'false' || raw === 'no') return false;
  return undefined;
}

/** 复合赋分：前置门控命中时直接返回对应 scoreRules 档 */
export function resolveCompositePreflightRule(
  ind: RiskIndicatorRow,
  appendixB?: Record<string, string | number | boolean | null | undefined>,
): ScoreRule | null {
  const gate = ind.survey?.compositePreflightGate;
  const field = gate?.appendixBField?.trim();
  if (!field || gate.when === undefined || gate.score === undefined) return null;

  const raw = appendixB?.[field];
  const boolVal = parseAppendixBBoolean(raw);
  if (boolVal === undefined || boolVal !== gate.when) return null;

  const rules = ind.scoreRules ?? [];
  const label = gate.ruleLabel?.trim();
  if (label) {
    const hit = rules.find(r => r.label === label);
    if (hit) return hit;
  }
  return pickRuleByScore(rules, gate.score);
}

export function compositePreflightGateSatisfied(
  ind: RiskIndicatorRow,
  appendixB?: Record<string, string | number | boolean | null | undefined>,
): boolean {
  return resolveCompositePreflightRule(ind, appendixB) !== null;
}
