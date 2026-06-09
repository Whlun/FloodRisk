import { describe, expect, it } from 'vitest';
import { initialRiskIndicators } from '../src/database/deqing-waterlogging-risk-indicators';
import { normalizeIndicatorRow } from '../src/prototypes/deqing-waterlogging-risk/indicatorNormalize';
import { matchScoreRuleFromValue } from '../src/prototypes/deqing-waterlogging-risk/scoreRuleMapping';
import {
  BUILTIN_NUMERIC_SCORE_CODES,
  hasConfiguredNumericBands,
} from '../src/prototypes/deqing-waterlogging-risk/scoreRuleNumericBands';

describe('数值赋分单路径（无 scoreRuleMapping code fallback）', () => {
  it('导则预置数值指标含附录 F 匹配区间', () => {
    const all = initialRiskIndicators;
    for (const code of BUILTIN_NUMERIC_SCORE_CODES) {
      const raw = all.find(i => i.code === code);
      expect(raw, `种子应包含 ${code}`).toBeTruthy();
      const normalized = normalizeIndicatorRow(raw!, { allIndicators: all, baseline: raw });
      expect(hasConfiguredNumericBands(normalized.scoreRules)).toBe(true);
    }
  });

  it('无 numericMatch 时不靠编码 fallback 赋分', () => {
    const ind = normalizeIndicatorRow(
      {
        id: 'x',
        code: 'HZ_RAIN_ALERT_FREQ',
        name: '暴雨预警频次',
        level1: 'HAZARD',
        applicableTypes: ['GLOBAL'],
        weight: 0.1,
        valueType: 'numeric',
        enabled: true,
        updatedAt: '',
        scoreRules: [
          { id: 'r0', label: '低', riskTier: '低', score: 0.25 },
          { id: 'r1', label: '中', riskTier: '中', score: 0.5 },
          { id: 'r2', label: '较高', riskTier: '较高', score: 0.75 },
          { id: 'r3', label: '高', riskTier: '高', score: 1 },
        ],
      },
      { allIndicators: initialRiskIndicators },
    );
    const withoutBands = { ...ind, scoreRules: ind.scoreRules.map(r => ({ ...r, numericMatch: undefined })) };
    expect(matchScoreRuleFromValue(withoutBands, 6)).toBeNull();
  });

  it('导则预置纵坡度可按区间自动赋分', () => {
    const all = initialRiskIndicators;
    const slope = normalizeIndicatorRow(all.find(i => i.code === 'FM_SK_LONG_SLOPE')!, {
      allIndicators: all,
    });
    expect(hasConfiguredNumericBands(slope.scoreRules)).toBe(true);
    expect(matchScoreRuleFromValue(slope, 6, { indicatorValues: {} }, all)?.score).toBe(0.5);
    expect(matchScoreRuleFromValue(slope, 11, { indicatorValues: {} }, all)?.score).toBe(1);
  });
});
