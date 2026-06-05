import { formatBranchNumericMatch } from './branchNumericMatch';
import type {
  BranchNumericMatch,
  ConditionalScoreBranch,
  ConditionalScoringConfig,
  ConditionalScoringMode,
  RiskIndicatorRow,
  ScoreConditionSource,
} from './types';
import {
  appendixBConditionFieldUsesDiscreteMatch,
  findAppendixBConditionField,
} from './appendixBConditionFields';
import {
  isAppendixBasicInfoIndicatorValueKey,
  isAppendixBasicInfoNumericAuxiliaryKey,
} from './compositeConditionalSurvey';
import {
  CONDITIONAL_SCORING_MODE_LABEL,
  formatBranchIndicatorValueMatch,
  formatConditionSourceLabel,
  getAppendixBMatchValueOptions,
  isDiscreteConditionIndicator,
  resolveBranchIndicatorValueMatch,
  findDuplicateBranchMatchValues,
  resolveConditionFieldLabel,
} from './conditionalScoring';
import { formatNumericMatchLabel, hasConfiguredNumericBands } from './scoreRuleNumericBands';

const COMPARE_SYMBOL: Record<BranchNumericMatch['kind'], string> = {
  lte: '≤',
  lt: '<',
  gte: '≥',
  gt: '>',
  between: '～',
};

export interface ConditionalScoringFlowTier {
  label: string;
  score: number;
  note?: string;
}

export interface ConditionalScoringFlowBranch {
  index: number;
  label: string;
  hitCondition: string;
  /** 数值比较模式：菱形判断文案，如「填报值 ≥ 30？」 */
  compareQuestion?: string;
  valueCompare?: string;
  tiers: ConditionalScoringFlowTier[];
  /** 数值比较：满足条件时的赋分档 */
  metTier?: ConditionalScoringFlowTier;
  /** 数值比较：不满足条件时的赋分档 */
  unmetTier?: ConditionalScoringFlowTier;
  /** branch_threshold 且各档已配 numericMatch：按区间匹配，非二元比较 */
  usesNumericBands: boolean;
  isRulesMode: boolean;
  outcomeHint: string;
}

export interface ConditionalScoringFlowModel {
  enabled: boolean;
  mode: ConditionalScoringMode | undefined;
  modeLabel: string;
  sourceLabel: string;
  branches: ConditionalScoringFlowBranch[];
  incomplete: string[];
}

function formatBranchHitCondition(
  branch: ConditionalScoreBranch,
  source: ScoreConditionSource,
  sourceKey: string,
  indicators?: RiskIndicatorRow[],
  self?: Pick<RiskIndicatorRow, 'survey' | 'applicableTypes' | 'code'>,
): string {
  if (source.type === 'appendix_b') {
    const owner = indicators?.find(
      i =>
        i.survey?.auxiliaryCondition?.fieldKey === sourceKey &&
        i.survey.auxiliaryCondition.surveyPlacement === 'appendix_b',
    );
    const numericAux = isAppendixBasicInfoNumericAuxiliaryKey(
      sourceKey,
      owner,
      indicators,
    );
    const nm = branch.numericMatch ?? resolveBranchIndicatorValueMatch(branch);
    if (
      appendixBConditionFieldUsesDiscreteMatch(sourceKey, indicators) &&
      !numericAux
    ) {
      const options = getAppendixBMatchValueOptions(sourceKey, indicators);
      const labels = (branch.matchValues ?? []).map(
        v => options.find(o => o.value === v)?.label ?? v,
      );
      return labels.length ? `当\n${labels.join('\n或 ')}` : '（未配置匹配取值）';
    }
    if (nm) {
      const name = resolveConditionFieldLabel(
        sourceKey,
        'point',
        indicators ?? [],
        self?.code,
        self,
      );
      return `当\n${name} ${COMPARE_SYMBOL[nm.kind]} ${nm.value}`;
    }
    return '（未配置数值条件）';
  }
  const nm = branch.numericMatch ?? resolveBranchIndicatorValueMatch(branch);
  if (!nm) return '（未配置数值条件）';
  return `当\n条件 ${COMPARE_SYMBOL[nm.kind]} ${nm.value}`;
}

/** 与 validateConditionalScoring 一致的分支完整性检查（供流程图预警） */
function collectBranchIncompleteReasons(
  branch: ConditionalScoreBranch,
  displayLabel: string,
  source: ScoreConditionSource,
  mode: ConditionalScoringMode,
  indicators?: RiskIndicatorRow[],
  self?: Pick<RiskIndicatorRow, 'survey' | 'code'>,
): string[] {
  const reasons: string[] = [];
  const sourceKey = source.key ?? '';
  const branchNumeric = branch.numericMatch ?? resolveBranchIndicatorValueMatch(branch);

  if (source.type === 'appendix_b') {
    const owner =
      self?.survey?.auxiliaryCondition?.fieldKey === sourceKey &&
      self.survey.auxiliaryCondition.surveyPlacement === 'appendix_b'
        ? self
        : indicators?.find(
            i =>
              i.survey?.auxiliaryCondition?.fieldKey === sourceKey &&
              i.survey.auxiliaryCondition.surveyPlacement === 'appendix_b',
          );
    const numericAux = isAppendixBasicInfoNumericAuxiliaryKey(sourceKey, owner ?? self, indicators);
    const discrete =
      appendixBConditionFieldUsesDiscreteMatch(sourceKey, indicators) && !numericAux;
    if (discrete) {
      if (!(branch.matchValues?.length)) {
        reasons.push(`分支「${displayLabel}」缺少匹配取值`);
      }
    } else if (
      branchNumeric ||
      numericAux ||
      findAppendixBConditionField(sourceKey)?.kind === 'numeric'
    ) {
      if (!branchNumeric) {
        reasons.push(`分支「${displayLabel}」缺少数值条件`);
      }
    } else if (!(branch.matchValues?.length)) {
      reasons.push(`分支「${displayLabel}」缺少匹配取值`);
    }
  }

  if (source.type === 'indicator') {
    const src = indicators?.find(
      i => i.code === sourceKey || i.survey.fieldKey === sourceKey,
    );
    const srcDiscrete = isDiscreteConditionIndicator(src) && mode === 'branch_rules';
    if (srcDiscrete) {
      if (!(branch.matchValues?.length)) {
        reasons.push(`分支「${displayLabel}」缺少匹配取值`);
      }
    } else if (!branch.numericMatch) {
      reasons.push(`分支「${displayLabel}」缺少数值条件`);
    }
  }

  if (mode === 'branch_threshold') {
    const rules = branch.scoreRules ?? [];
    if (!hasConfiguredNumericBands(rules)) {
      const valueMatch = resolveBranchIndicatorValueMatch(branch);
      if (!valueMatch) {
        reasons.push(`分支「${displayLabel}」缺少填报值比较`);
      }
    }
  }

  return reasons;
}

function buildCompareQuestion(valueMatch: BranchNumericMatch | undefined): string | undefined {
  if (!valueMatch) return undefined;
  if (valueMatch.kind === 'between') {
    return `填报值 ${formatBranchNumericMatch(valueMatch)}？`;
  }
  return `填报值 ${COMPARE_SYMBOL[valueMatch.kind]} ${valueMatch.value}？`;
}

function pickMetUnmetTiers(tiers: ConditionalScoringFlowTier[]): {
  metTier?: ConditionalScoringFlowTier;
  unmetTier?: ConditionalScoringFlowTier;
} {
  const metTier = tiers.find(t => t.score <= 0.1) ?? tiers[0];
  const unmetTier = tiers.find(t => t.score >= 0.9) ?? tiers[tiers.length - 1];
  if (!metTier || !unmetTier) return { metTier, unmetTier };
  return { metTier, unmetTier };
}
function buildBranchOutcomeHint(
  mode: ConditionalScoringMode,
  tiers: ConditionalScoringFlowTier[],
  usesNumericBands?: boolean,
): string {
  if (mode === 'branch_rules') {
    return tiers.length
      ? '普查/配置时从上方赋分档中选择一项'
      : '（请配置本分支赋分档）';
  }
  if (usesNumericBands) {
    return '按各档匹配区间与填报值自动匹配标准分 F';
  }
  if (tiers.length > 2) {
    return '按各档匹配区间与填报值自动匹配标准分 F';
  }
  const low = tiers.find(t => t.score <= 0.1);
  const high = tiers.find(t => t.score >= 0.9);
  if (low && high) {
    return `满足比较 →「${low.label}」(${low.score})；不满足 →「${high.label}」(${high.score})`;
  }
  return tiers.length ? '按赋分档分值自动匹配满足/不满足' : '（请配置本分支赋分档）';
}

function buildBranchTiers(
  branch: ConditionalScoreBranch,
  mode: ConditionalScoringMode,
): ConditionalScoringFlowTier[] {
  const rules = branch.scoreRules ?? [];
  if (mode === 'branch_threshold') {
    return rules.map(r => ({
      label: r.label?.trim() || '未命名',
      score: r.score ?? 0,
      note: r.numericMatch ? formatNumericMatchLabel(r.numericMatch) : undefined,
    }));
  }
  return rules.map(r => ({
    label: r.label?.trim() || '未命名',
    score: r.score ?? 0,
    note: '下拉选项',
  }));
}

/** 流程图预览用：判断配置是否已有实质内容（非空壳分支） */
export function isFlowConfigPopulated(cfg: ConditionalScoringConfig | undefined): boolean {
  if (!cfg?.source?.key?.trim()) return false;
  if (!cfg.branches?.length) return false;
  return cfg.branches.some(
    b =>
      Boolean(b.matchValues?.length) ||
      Boolean(b.numericMatch) ||
      Boolean(b.indicatorValueMatch) ||
      Boolean(b.scoreRules?.length),
  );
}

/** 流程图预览：表单取值不完整时回退到指标快照 */
export function resolveConditionalScoringForFlow(
  formConfig: ConditionalScoringConfig | undefined,
  snapshot: ConditionalScoringConfig | undefined,
  forceEnabled: boolean,
): ConditionalScoringConfig | undefined {
  const pick = isFlowConfigPopulated(formConfig)
    ? formConfig
    : isFlowConfigPopulated(snapshot)
      ? snapshot
      : formConfig ?? snapshot;
  if (!pick) return undefined;
  if (forceEnabled) return { ...pick, enabled: true };
  return pick.enabled ? pick : undefined;
}

/** 由条件赋分配置生成流程视图数据 */
export function buildConditionalScoringFlowModel(
  config: ConditionalScoringConfig | undefined,
  indicators?: RiskIndicatorRow[],
  self?: Pick<RiskIndicatorRow, 'survey' | 'applicableTypes' | 'code'>,
): ConditionalScoringFlowModel {
  if (!config?.enabled) {
    return {
      enabled: false,
      mode: undefined,
      modeLabel: '—',
      sourceLabel: '—',
      branches: [],
      incomplete: [],
    };
  }

  const incomplete: string[] = [];
  const mode: ConditionalScoringMode = config.mode ?? 'branch_threshold';
  const branchList = config.branches ?? [];
  const source: ScoreConditionSource = config.source ?? { type: 'appendix_b', key: '' };
  const sourceKey = source.key ?? '';

  if (!sourceKey.trim()) incomplete.push('未选择条件字段');
  if (!branchList.length) incomplete.push('未配置条件分支');

  const duplicateMatchValues = findDuplicateBranchMatchValues(branchList);
  if (duplicateMatchValues.length) {
    incomplete.push('存在重复的条件分支匹配取值，请在各分支间排他配置');
  }

  const branches: ConditionalScoringFlowBranch[] = branchList.map((branch, index) => {
    const displayLabel = branch.label?.trim() || `分支 ${index + 1}`;
    const hitCondition = formatBranchHitCondition(branch, source, sourceKey, indicators, self);
    const valueMatch = resolveBranchIndicatorValueMatch(branch);
    const branchRules = branch.scoreRules ?? [];
    const usesNumericBands = mode === 'branch_threshold' && hasConfiguredNumericBands(branchRules);
    const tiers = buildBranchTiers(branch, mode);

    incomplete.push(
      ...collectBranchIncompleteReasons(branch, displayLabel, source, mode, indicators, self),
    );

    if (!tiers.length || tiers.some(t => !t.label || t.label === '未命名')) {
      incomplete.push(`分支「${displayLabel}」赋分档不完整`);
    }

    const isRulesMode = mode === 'branch_rules';
    const branchNumericMatch = branch.numericMatch ?? valueMatch;
    const showLegacyBinaryCompare =
      mode === 'branch_threshold' && !usesNumericBands && Boolean(branchNumericMatch);
    const { metTier, unmetTier } =
      isRulesMode || usesNumericBands ? {} : pickMetUnmetTiers(tiers);

    return {
      index: index + 1,
      label: displayLabel,
      hitCondition,
      compareQuestion: showLegacyBinaryCompare
        ? buildCompareQuestion(branchNumericMatch)
        : undefined,
      valueCompare: showLegacyBinaryCompare
        ? `${hitCondition.split('\n')[1] ?? formatBranchIndicatorValueMatch(branchNumericMatch!)}`
        : undefined,
      tiers,
      metTier,
      unmetTier,
      usesNumericBands,
      isRulesMode,
      outcomeHint: buildBranchOutcomeHint(mode, tiers, usesNumericBands),
    };
  });

  return {
    enabled: true,
    mode,
    modeLabel: CONDITIONAL_SCORING_MODE_LABEL[mode],
    sourceLabel: sourceKey ? formatConditionSourceLabel(source, indicators, self) : '—',
    branches,
    incomplete,
  };
}
