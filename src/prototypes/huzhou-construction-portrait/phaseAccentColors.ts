import { getCmPhaseMapColors } from '../huzhou-lifecycle-shared/cmPhaseMapColors';
import type { PhaseKey } from './types';

/** 与 style.css / cmPhaseStageTag.css 中各阶段 --hz-cm-phase-accent 保持一致，供地图描边配色 */
export type PhaseAccent = {
  accent: string;
  accentDeep: string;
  accentBg: string;
};

export function getPhaseAccent(phaseKey: PhaseKey): PhaseAccent {
  const c = getCmPhaseMapColors(phaseKey);
  return { accent: c.accent, accentDeep: c.accentDeep, accentBg: c.accentBg };
}
