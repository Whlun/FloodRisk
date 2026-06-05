import type { RiskIndicatorRow } from './types';
import { COMPOSITE_SCORING_COPY } from './compositeScoringCopy';
import { formatDesignPeriodFieldHint, isDesignReturnPeriodCode } from './designReturnPeriod';
import { hasAuxiliaryConditionSurvey } from './compositeConditionalSurvey';
import { getNumericConstraint } from './numericIndicatorConstraints';
import { PREVENTION_VALUE_FIELD_EXTRA } from './preventionFieldHints';
import { resolveScoreRuleTierRef } from './surveyFieldHints';

const FOOTER_SCORE = '填写后系统自动匹配赋分档与评估指标分数。';
const FOOTER_EVAL = '填写后系统自动匹配评估指标分数。';
const FOOTER_DESIGN = '填写 P 后系统自动匹配低/高档与评估指标分数。';

const BOOLEAN_PRESET: Record<string, string[]> = {
  HZ_GUEST_WATER: [
    '客水接入情况风险等级划分。',
    '· 无客水接入 → 低风险',
    '· 存在客水接入 → 高风险',
  ],
  HZ_BACKWATER: [
    '下游顶托情况风险等级划分（两档）。',
    '· 无下游顶托 → 低风险',
    '· 存在下游顶托 → 高风险',
  ],
};

function joinLines(lines: string[]): string {
  return lines
    .map(l => l.trim())
    .filter(Boolean)
    .join('\n');
}

function enumTierLines(ind: Pick<RiskIndicatorRow, 'scoreRules'>): string[] {
  return ind.scoreRules.map(r => `· ${r.label} → ${r.riskTier}风险`);
}

/** 导则预置：赋分规则 Tab「赋分说明」默认值（与原先 ? 悬停文案一致） */
export function buildDefaultScoreExplanation(
  ind: Pick<RiskIndicatorRow, 'code' | 'valueType' | 'scoreRules' | 'survey' | 'remark'>,
): string {
  const { code, valueType, scoreRules, remark } = ind;

  if (scoreRules.some(r => r.tierRef?.trim())) {
    return joinLines([
      '各档判定参考（普查下拉选项附注）：',
      ...scoreRules.map(r => {
        const ref = resolveScoreRuleTierRef(r);
        return ref ? `· ${r.label}：${ref}` : `· ${r.label} → ${r.riskTier}风险`;
      }),
      FOOTER_EVAL,
    ]);
  }

  if (hasAuxiliaryConditionSurvey(ind)) {
    const aux = ind.survey?.auxiliaryCondition;
    const placement =
      aux?.surveyPlacement === 'appendix_b' ? '内涝基本信息「类型专用信息」' : '指标普查';
    const unitSuffix = aux?.unit ? `（${aux.unit}）` : '';
    return joinLines([
      remark?.trim() ||
        `须先在${placement}中填写「${aux?.label ?? '条件字段'}」${unitSuffix}，再选择「${ind.name}」分档。`,
      ...(aux?.thresholdPct !== undefined
        ? [`条件分界参考：${aux.thresholdPct}${aux.unit ?? ''}`]
        : []),
      FOOTER_EVAL,
    ]);
  }

  if (ind.survey?.inputVariant === 'composite_appendix_numeric') {
    const partLines =
      ind.survey.appendixBSurveyParts?.map(
        p => COMPOSITE_SCORING_COPY.scoreExplanationPartLine(p.label),
      ) ?? [];
    return joinLines([
      COMPOSITE_SCORING_COPY.scoreExplanationMain,
      ...partLines,
      FOOTER_SCORE,
    ]);
  }

  if (code === 'FM_UG_DESIGN_P') {
    return joinLines([
      remark?.trim() || '按地下空间类型结合相关设计规范判定是否满足设计标准。',
      '· 满足设计标准 → 低风险',
      '· 不满足设计标准 → 高风险',
      FOOTER_EVAL,
    ]);
  }

  if (isDesignReturnPeriodCode(code)) {
    const c = getNumericConstraint(code);
    return joinLines([
      formatDesignPeriodFieldHint(code),
      '须先在「基本信息」中填写「地区重要程度」。',
      ...(c ? [c.hint, c.rangeLabel] : []),
      FOOTER_DESIGN,
    ]);
  }

  const numeric = getNumericConstraint(code);
  if (valueType === 'numeric' && numeric) {
    const prevention = PREVENTION_VALUE_FIELD_EXTRA[code];
    return joinLines([
      ...(prevention ? [prevention] : []),
      numeric.hint,
      numeric.rangeLabel,
      FOOTER_SCORE,
    ]);
  }

  if (valueType === 'boolean') {
    const preset = BOOLEAN_PRESET[code];
    if (preset) {
      return joinLines([...preset, FOOTER_EVAL]);
    }
    return joinLines([
      '从下拉选择；选项与赋分规则分档描述一致。',
      ...enumTierLines(ind),
      FOOTER_EVAL,
    ]);
  }

  if (valueType === 'enum') {
    return joinLines([
      '从下拉选择分档；选项文案与风险指标管理中赋分规则一致。',
      ...enumTierLines(ind),
      FOOTER_EVAL,
    ]);
  }

  return joinLines([...enumTierLines(ind), FOOTER_EVAL]);
}
