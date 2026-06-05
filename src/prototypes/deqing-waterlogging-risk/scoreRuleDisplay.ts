import type { ScoreRule } from './types';

/** 附录 F 赋分档的标准化分值在界面上的名称 */
export const SCORE_LABEL = '评估指标分数';

/** 下拉选项：分档描述 + 评估指标分数 */
export function formatScoreRuleOptionLabel(rule: ScoreRule): string {
  return `${rule.label}（${SCORE_LABEL} ${rule.score}）`;
}

/** 已匹配赋分档的简要说明 */
export function formatMatchedScoreHint(rule: ScoreRule): string {
  return `${SCORE_LABEL} ${rule.score}`;
}

/** 表格/列表中的赋分档展示 */
export function formatScoreRuleSummary(rule: ScoreRule): string {
  return `${rule.label}（${SCORE_LABEL} ${rule.score}）`;
}
