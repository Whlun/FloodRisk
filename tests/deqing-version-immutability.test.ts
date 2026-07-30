import { describe, expect, it } from 'vitest';
import {
  emptyRegionalPreventionRecord,
  emptyRiskLevelVersionRecord,
} from '../src/prototypes/deqing-waterlogging-risk/types';
import { isRiskLevelVersionImmutable } from '../src/prototypes/deqing-waterlogging-risk/riskLevelVersionUtils';
import { isPreventionVersionImmutable } from '../src/prototypes/deqing-waterlogging-risk/preventionVersionUtils';

describe('version record immutability', () => {
  it('only allows an unreferenced risk-level draft to be edited in place', () => {
    const draft = emptyRiskLevelVersionRecord();
    expect(isRiskLevelVersionImmutable(draft)).toBe(false);
    expect(isRiskLevelVersionImmutable(draft, true)).toBe(true);
    expect(isRiskLevelVersionImmutable({ ...draft, activeForRating: true })).toBe(true);
    expect(
      isRiskLevelVersionImmutable({
        ...draft,
        config: { ...draft.config, status: 'completed' },
      }),
    ).toBe(true);
  });

  it('only allows an unreferenced V4 draft to be edited in place', () => {
    const draft = emptyRegionalPreventionRecord();
    draft.config.assessmentStatus = 'draft';
    expect(isPreventionVersionImmutable(draft)).toBe(false);
    expect(isPreventionVersionImmutable(draft, true)).toBe(true);
    expect(isPreventionVersionImmutable({ ...draft, activeForRating: true })).toBe(true);
    expect(
      isPreventionVersionImmutable({
        ...draft,
        config: { ...draft.config, assessmentStatus: 'completed' },
      }),
    ).toBe(true);
  });
});
