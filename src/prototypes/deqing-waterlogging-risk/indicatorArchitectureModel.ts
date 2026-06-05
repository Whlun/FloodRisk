import {
  HAZARD_POINT_TYPE_LABEL,
  LEVEL1_FACTOR_LABEL,
  type HazardPointType,
  type Level1Factor,
  type Level1Weights,
  type RiskIndicatorRow,
} from './types';

export const ARCH_LEVEL1_ORDER: Level1Factor[] = ['HAZARD', 'FORMATION', 'BEARING', 'PREVENTION'];

export const ARCH_LEVEL1_COLOR: Record<Level1Factor, string> = {
  HAZARD: '#e6f4ff',
  FORMATION: '#fff7e6',
  BEARING: '#f6ffed',
  PREVENTION: '#fff0f6',
};

export const ARCH_LEVEL1_BORDER: Record<Level1Factor, string> = {
  HAZARD: '#1677ff',
  FORMATION: '#fa8c16',
  BEARING: '#52c41a',
  PREVENTION: '#eb2f96',
};

export interface ArchitectureLevel1Node {
  level1: Level1Factor;
  weight: number;
  label: string;
  children: RiskIndicatorRow[];
}

export function sortArchitectureChildren(children: RiskIndicatorRow[]): RiskIndicatorRow[] {
  return [...children].sort((a, b) => {
    if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
    return a.code.localeCompare(b.code, 'zh-CN');
  });
}

export function filterArchitectureColumnIndicators(
  indicators: RiskIndicatorRow[],
  level1: Level1Factor,
  formationType: HazardPointType,
): RiskIndicatorRow[] {
  if (level1 === 'FORMATION') {
    return indicators.filter(
      i => i.level1 === 'FORMATION' && i.applicableTypes.includes(formationType),
    );
  }
  return indicators.filter(i => i.level1 === level1 && i.applicableTypes.includes('GLOBAL'));
}

export function buildArchitectureLevel1Nodes(
  indicators: RiskIndicatorRow[],
  formationType: HazardPointType,
  level1Weights: Level1Weights,
): ArchitectureLevel1Node[] {
  return ARCH_LEVEL1_ORDER.map(level1 => ({
    level1,
    weight: level1Weights[level1],
    label: LEVEL1_FACTOR_LABEL[level1],
    children: sortArchitectureChildren(
      filterArchitectureColumnIndicators(indicators, level1, formationType),
    ),
  }));
}

export function getIndicatorRuleScore(
  ind: RiskIndicatorRow,
  selectedRuleIds: Record<string, string>,
): { score: number; label: string } | null {
  const ruleId = selectedRuleIds[ind.id];
  if (!ruleId) return null;
  const rule = ind.scoreRules.find(r => r.id === ruleId);
  if (!rule) return null;
  return { score: rule.score, label: rule.label };
}

export function formationTypeLabel(type: HazardPointType): string {
  return HAZARD_POINT_TYPE_LABEL[type];
}
