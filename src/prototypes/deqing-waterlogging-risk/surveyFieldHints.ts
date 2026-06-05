import type { RiskIndicatorRow, ScoreRule } from './types';

/** 《技术导则》表 5.4.3 — 各档判定参考（满足任一项条件即可归入该档） */
export const BR_HIST_LOSS_TIER_REF: Record<string, string> = {
  无历史灾情: '风险分级「低」：该区域无历史内涝灾情记录',
  较低: '死亡无；重伤无；被困＜10 人；直接经济损失 0＜损失＜100 万元',
  中: '死亡无；1≤重伤＜5 人；10≤被困＜30 人；100≤损失＜1000 万元',
  较高: '1≤人员伤亡＜3 人；5≤重伤＜10 人；30≤被困＜50 人；1000≤损失＜5000 万元',
  高: '3≤人员伤亡＜5 人；10≤重伤＜30 人；50≤被困＜100 人；5000≤损失＜10000 万元',
  超高: '人员伤亡≥5 人；重伤≥30 人；被困≥100 人；损失≥10000 万元',
};

/** 字段级说明（标签旁问号） */
export const BR_HIST_LOSS_FIELD_HINT =
  '历史内涝灾情损失风险等级划分。按人员死亡（伤亡）、重伤、被困人数或直接经济损失中较高者判定；下拉各选项附该档四项参考阈值。';

export type EnumSurveyOption = {
  value: string;
  label: string;
  title?: string;
  ref?: string;
};

/** 普查/配置中的枚举型指标下拉选项 */
export function buildEnumSurveySelectOptions(ind: RiskIndicatorRow): EnumSurveyOption[] {
  return ind.scoreRules.map(r => {
    const ref = r.tierRef?.trim();
    return {
      value: r.label,
      label: r.label,
      title: ref ?? r.label,
      ref,
    };
  });
}

/** 任一赋分档配置了 tierRef 时，普查下拉展示分档说明（下拉项 + 选中后下方附注） */
export function enumSurveySelectUsesRichOptions(ind: RiskIndicatorRow): boolean {
  return ind.scoreRules.some(r => Boolean(r.tierRef?.trim()));
}

/** 解析赋分档的普查展示说明 */
export function resolveScoreRuleTierRef(rule: Pick<ScoreRule, 'tierRef'>): string | undefined {
  return rule.tierRef?.trim() || undefined;
}
