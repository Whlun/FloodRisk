import type { HazardPointType, RiskIndicatorRow } from './types';
import { formationTypeFromApplicable, isFormationLevel1 } from './indicatorApplicableTypes';
import { resolveScoringRuleMode } from './scoringRuleMode';
import { validateConditionalScoring } from './conditionalScoring';
import { validateScoreRulesForValueType, getScoreRuleLimits } from './indicatorValueTypeUtils';
import {
  hasConfiguredNumericBands,
  requiresNumericBandConfig,
} from './scoreRuleNumericBands';
import { isCompositeAppendixNumericSurvey } from './appendixBSurveyBinding';
import { hasAuxiliaryConditionSurvey } from './compositeConditionalSurvey';
import { getSiblingGroup, isSiblingWeightSumValid, sumSiblingWeights } from './weightBalance';

export type IndicatorConfigStatus = 'ready' | 'incomplete' | 'blocked';

export interface IndicatorConfigReadinessResult {
  status: IndicatorConfigStatus;
  ok: boolean;
  blockers: string[];
  warnings: string[];
}

function pushUnique(list: string[], msg: string): void {
  if (!msg || list.includes(msg)) return;
  list.push(msg);
}

/** 校验条件赋分时合并当前编辑行，避免草稿 survey 未写入列表导致辅助条件误报 */
function indicatorsForValidation(
  ind: RiskIndicatorRow,
  allIndicators: RiskIndicatorRow[],
): RiskIndicatorRow[] {
  const code = String(ind.code ?? '').trim();
  const id = String(ind.id ?? '').trim();
  if (!code && !id) return allIndicators;
  const idx = allIndicators.findIndex(
    row => (id && row.id === id) || (code && row.code === code),
  );
  if (idx < 0) return [...allIndicators, ind];
  const next = [...allIndicators];
  next[idx] = { ...next[idx], ...ind };
  return next;
}

/** 单条指标配置是否满足保存与匹配最低要求 */
export function validateIndicatorConfig(
  ind: RiskIndicatorRow,
  allIndicators: RiskIndicatorRow[] = [],
): IndicatorConfigReadinessResult {
  const blockers: string[] = [];
  const warnings: string[] = [];

  const code = String(ind.code ?? '').trim();
  const name = String(ind.name ?? '').trim();
  const fieldKey = String(ind.survey?.fieldKey ?? '').trim() || code;

  if (!code) pushUnique(blockers, '缺少指标编码');
  if (!name) pushUnique(blockers, '缺少指标名称');
  if (!fieldKey) pushUnique(blockers, '缺少普查字段键');

  const mode = resolveScoringRuleMode(ind);

  if (mode === 'composite') {
    const parts = ind.survey?.appendixBSurveyParts ?? [];
    if (!parts.length) {
      pushUnique(blockers, '复合数值赋分须至少配置 1 个子项');
    } else {
      const keys = new Set<string>();
      for (const p of parts) {
        if (!String(p.label ?? '').trim()) pushUnique(blockers, '复合子项缺少显示名称');
        if (!String(p.valueFieldKey ?? '').trim()) pushUnique(blockers, '复合子项缺少取值字段键');
        const vk = p.valueFieldKey?.trim();
        if (vk) {
          if (keys.has(vk)) pushUnique(blockers, `复合子项字段键重复：${vk}`);
          keys.add(vk);
        }
        const bands = p.tierBands ?? [];
        if (bands.length < 2) {
          pushUnique(blockers, `子项「${p.label || '未命名'}」须至少 2 档数值分档`);
        }
      }
    }
    if (!(ind.scoreRules?.length)) {
      pushUnique(warnings, '复合模式聚合赋分档尚未生成，保存后将自动同步');
    }
  } else if (mode === 'conditional') {
    const condErr = validateConditionalScoring(ind, indicatorsForValidation(ind, allIndicators));
    if (condErr) pushUnique(blockers, condErr);
    if (hasAuxiliaryConditionSurvey(ind)) {
      const aux = ind.survey?.auxiliaryCondition;
      if (!String(aux?.fieldKey ?? '').trim()) pushUnique(blockers, '辅助条件字段键未填写');
      if (!String(aux?.label ?? '').trim()) pushUnique(blockers, '辅助条件字段名称未填写');
    }
  } else {
    const rulesErr = validateScoreRulesForValueType(
      ind.valueType,
      ind.scoreRules ?? [],
      ind.code,
      ind.conditionalScoring,
      ind,
      allIndicators,
    );
    if (rulesErr) pushUnique(blockers, rulesErr);

    const labels = (ind.scoreRules ?? []).map(r => String(r.label ?? '').trim());
    const emptyLabel = labels.some(l => !l);
    if (emptyLabel) pushUnique(blockers, '存在未填写描述的分档');
    const dup = labels.filter((l, i) => l && labels.indexOf(l) !== i);
    if (dup.length) pushUnique(blockers, `分档描述重复：${dup[0]}`);

    if (ind.valueType === 'numeric' && requiresNumericBandConfig(ind)) {
      if (!hasConfiguredNumericBands(ind.scoreRules)) {
        pushUnique(blockers, '数值型统一赋分须为每档配置匹配区间');
      }
    } else if (ind.valueType === 'numeric' && !hasConfiguredNumericBands(ind.scoreRules)) {
      pushUnique(
        warnings,
        '数值型使用系统预置区间匹配；自建指标请为每档配置匹配区间',
      );
    }
  }

  const { min } = getScoreRuleLimits(ind.valueType);
  if (mode === 'uniform' && (ind.scoreRules?.length ?? 0) < min) {
    pushUnique(blockers, `统一赋分须至少 ${min} 档`);
  }

  const status: IndicatorConfigStatus =
    blockers.length > 0 ? 'blocked' : warnings.length > 0 ? 'incomplete' : 'ready';

  return {
    status,
    ok: blockers.length === 0,
    blockers,
    warnings,
  };
}

/** 启用前：权重与配置一并检查 */
export function validateIndicatorEnableReadiness(
  ind: RiskIndicatorRow,
  allIndicators: RiskIndicatorRow[],
): IndicatorConfigReadinessResult {
  const base = validateIndicatorConfig(ind, allIndicators);
  if (!ind.enabled) return base;

  if (!(ind.weight > 0)) {
    pushUnique(base.blockers, '权重须大于 0');
    base.ok = false;
    base.status = 'blocked';
  }

  const formationType = isFormationLevel1(ind.level1)
    ? formationTypeFromApplicable(ind.applicableTypes)
    : undefined;
  const group = getSiblingGroup(allIndicators, ind.level1, formationType);
  const siblingSum = sumSiblingWeights(group);
  if (ind.enabled && group.some(i => i.enabled) && !isSiblingWeightSumValid(siblingSum)) {
    pushUnique(base.warnings, '同级启用指标权重合计须为 1.000，请前往指标架构图调整');
    if (base.status === 'ready') base.status = 'incomplete';
  }

  return base;
}

export const CONFIG_STATUS_LABEL: Record<IndicatorConfigStatus, string> = {
  ready: '就绪',
  incomplete: '待完善',
  blocked: '无法计算',
};

export const CONFIG_STATUS_COLOR: Record<IndicatorConfigStatus, string> = {
  ready: 'success',
  incomplete: 'warning',
  blocked: 'error',
};

/** 新建指标在架构图中的建议 ω（同级均分，含本条） */
export function suggestWeightForNewIndicator(
  ind: Pick<RiskIndicatorRow, 'level1' | 'applicableTypes'>,
  allIndicators: RiskIndicatorRow[],
): number {
  const formationType: HazardPointType | undefined = isFormationLevel1(ind.level1)
    ? formationTypeFromApplicable(ind.applicableTypes)
    : undefined;
  const enabledSiblings = getSiblingGroup(allIndicators, ind.level1, formationType);
  const slots = Math.max(enabledSiblings.length + 1, 1);
  return Math.round((1 / slots) * 1000) / 1000;
}

export function summarizeReadinessForList(
  ind: RiskIndicatorRow,
  allIndicators: RiskIndicatorRow[],
): { status: IndicatorConfigStatus; tooltip: string } {
  const r = validateIndicatorEnableReadiness(ind, allIndicators);
  const lines = [...r.blockers, ...r.warnings];
  const tooltip =
    lines.length > 0 ? lines.join('；') : '配置完整，启用且权重正确后可参与定级试算';
  return { status: r.status, tooltip };
}
