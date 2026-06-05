import type { RiskIndicatorRow } from './types';
import { buildDefaultScoreExplanation } from './defaultScoreExplanation';

const AUTO_MATCH_FOOTER = '填写后系统自动匹配评估指标分数。';

/** 展示/编辑用：无自定义时回退导则预置默认文案 */
export function resolveScoreExplanation(
  ind: Pick<
    RiskIndicatorRow,
    'code' | 'valueType' | 'scoreRules' | 'scoreExplanation' | 'survey' | 'remark'
  >,
): string {
  const custom = ind.scoreExplanation?.trim();
  if (custom) return custom;
  return buildDefaultScoreExplanation(ind);
}

/** 将赋分说明文本拆为多行（用于 ? 悬停） */
export function parseScoreExplanationLines(text?: string): string[] {
  if (!text?.trim()) return [];
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
}

/** 由赋分档生成分档对照说明（无自定义赋分说明时的兜底） */
export function buildScoreRulesHintLines(ind: RiskIndicatorRow): string[] {
  if (!ind.scoreRules.length) {
    return ['请在「风险指标管理 → 赋分规则」中配置赋分档。'];
  }
  return ind.scoreRules.map(r => `· ${r.label} → ${r.riskTier}风险`);
}

/** 普查/试算标签旁 ?：与赋分规则 Tab「赋分说明」一致 */
export function getScoreExplanationTooltipLines(ind: RiskIndicatorRow): string[] {
  return parseScoreExplanationLines(resolveScoreExplanation(ind));
}

/** 附录 B 表格预览：指标填报区说明行（与赋分说明 / 普查 ? 同源） */
export function getSurveyPreviewIndicatorHintLines(ind: RiskIndicatorRow): string[] {
  const lines = getScoreExplanationTooltipLines(ind);
  if (ind.survey.surveyRequired) {
    return ['必填', ...lines];
  }
  return lines;
}
