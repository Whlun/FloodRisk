import type { ScoreRule } from './types';
import { BR_HIST_LOSS_TIER_REF } from './surveyFieldHints';

/** 表 5.4.3 历史内涝灾情损失 — 下拉选档六档（用户配置后普查手选档位） */
export function createGuidelineHistoricalLossEnumRules(idPrefix = 'rule'): ScoreRule[] {
  const items: Array<Omit<ScoreRule, 'id'>> = [
    { label: '无历史灾情', riskTier: '低', score: 0, tierRef: BR_HIST_LOSS_TIER_REF['无历史灾情'] },
    { label: '较低', riskTier: '较低', score: 0.2, tierRef: BR_HIST_LOSS_TIER_REF['较低'] },
    { label: '中', riskTier: '中', score: 0.4, tierRef: BR_HIST_LOSS_TIER_REF['中'] },
    { label: '较高', riskTier: '较高', score: 0.6, tierRef: BR_HIST_LOSS_TIER_REF['较高'] },
    { label: '高', riskTier: '高', score: 0.8, tierRef: BR_HIST_LOSS_TIER_REF['高'] },
    { label: '超高', riskTier: '超高', score: 1, tierRef: BR_HIST_LOSS_TIER_REF['超高'] },
  ];
  return items.map((item, i) => ({ ...item, id: `${idPrefix}-hl${i}` }));
}
