import { describe, expect, it } from 'vitest';
import { initialIndicatorRiskLevels } from '../src/database/deqing-waterlogging-risk-indicators';
import { emptyRegionalPreventionRecord } from '../src/prototypes/deqing-waterlogging-risk/types';
import { hasMeaningfulPreventionCopyChanges } from '../src/prototypes/deqing-waterlogging-risk/preventionVersionUtils';
import { hasMeaningfulRiskLevelCopyChanges } from '../src/prototypes/deqing-waterlogging-risk/riskLevelVersionUtils';

describe('版本复制防重', () => {
  it('等级版本复制只有区间或批次说明变化才允许保存', () => {
    const levels = initialIndicatorRiskLevels.map(level => ({ ...level }));
    expect(
      hasMeaningfulRiskLevelCopyChanges(levels, levels, '复制自 L001', '复制自 L001'),
    ).toBe(false);
    expect(
      hasMeaningfulRiskLevelCopyChanges(
        levels,
        levels.map(level =>
          level.levelCode === 'HIGH' ? { ...level, description: '调整后说明' } : level,
        ),
        '复制自 L001',
        '复制自 L001',
      ),
    ).toBe(true);
  });

  it('V₄ 版本复制只有填报值或批次说明变化才允许保存', () => {
    const source = {
      ...emptyRegionalPreventionRecord(),
      config: {
        ...emptyRegionalPreventionRecord().config,
        indicatorValues: { PREV_A: '档A' },
      },
    };
    expect(
      hasMeaningfulPreventionCopyChanges(
        source,
        { PREV_A: '档A' },
        '复制自 P001',
        '复制自 P001',
      ),
    ).toBe(false);
    expect(
      hasMeaningfulPreventionCopyChanges(
        source,
        { PREV_A: '档B' },
        '复制自 P001',
        '复制自 P001',
      ),
    ).toBe(true);
  });
});
