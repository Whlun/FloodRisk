/**
 * 地块全生命周期 · 横向时间轴 + 事项导航
 */
import React from 'react';
import type { ParcelLifecycle } from '../types';
import {
  firstMatterWithData,
  LIFECYCLE_PHASES,
  mattersForPhase,
  MATTER_STAGE_BY_KEY,
  type LifecyclePhaseKey,
  type MatterStageKey,
} from '../parcelMatterStages';
import { matterHasData } from '../mock/demoParcels';

export type ParcelLifecycleNavProps = {
  parcel: ParcelLifecycle;
  activeMatter: MatterStageKey;
  onMatterChange: (key: MatterStageKey) => void;
};

function matterButtonState(
  parcel: ParcelLifecycle,
  key: MatterStageKey,
): 'done' | 'active' | 'pending' | 'disabled' {
  const st = parcel.stageStatus[key];
  const has = matterHasData(parcel, key);
  if (st === 'active') return 'active';
  if (st === 'done' || has) return 'done';
  if (st === 'pending') return 'pending';
  return 'disabled';
}

export const ParcelLifecycleNav: React.FC<ParcelLifecycleNavProps> = ({
  parcel,
  activeMatter,
  onMatterChange,
}) => {
  const handlePhaseClick = (phase: LifecyclePhaseKey) => {
    const first = firstMatterWithData(phase, k => matterHasData(parcel, k));
    if (first) onMatterChange(first);
  };

  return (
    <nav className="hz-lc-nav hz-lc-nav--horizontal" aria-label="全生命周期事项">
      <div className="hz-lc-nav__track">
        {LIFECYCLE_PHASES.map((phase, phaseIdx) => {
          const matters = mattersForPhase(phase.key);
          const phaseActive = matters.some(m => m.key === activeMatter);
          const phaseSt = matters.some(m => parcel.stageStatus[m.key] === 'active')
            ? 'active'
            : matters.some(m => matterHasData(parcel, m.key) || parcel.stageStatus[m.key] === 'done')
              ? 'done'
              : 'pending';

          return (
            <div key={phase.key} className="hz-lc-nav__phase">
              {phaseIdx > 0 ? <div className="hz-lc-nav__connector-h" aria-hidden /> : null}
              <div className="hz-lc-nav__phase-col">
                <button
                  type="button"
                  className={[
                    'hz-lc-nav__phase-node',
                    `hz-lc-nav__phase-node--${phase.key}`,
                    phaseActive ? 'hz-lc-nav__phase-node--selected' : '',
                    phaseSt === 'done' ? 'hz-lc-nav__phase-node--done' : '',
                    phaseSt === 'active' ? 'hz-lc-nav__phase-node--active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  title={phase.label}
                  onClick={() => handlePhaseClick(phase.key)}
                >
                  {phase.label}
                </button>
                <ul className="hz-lc-nav__matters">
                  {matters.map(m => {
                    const state = matterButtonState(parcel, m.key);
                    const disabled = state === 'disabled';
                    return (
                      <li key={m.key}>
                        <button
                          type="button"
                          disabled={disabled}
                          className={[
                            'hz-lc-nav__matter-btn',
                            activeMatter === m.key ? 'hz-lc-nav__matter-btn--active' : '',
                            state === 'done' ? 'hz-lc-nav__matter-btn--done' : '',
                            state === 'active' ? 'hz-lc-nav__matter-btn--stage-active' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() => onMatterChange(m.key)}
                        >
                          {m.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
};

/** 当前事项中文名（右侧标题区用） */
export function matterLabelOf(key: MatterStageKey): string {
  return MATTER_STAGE_BY_KEY[key]?.label ?? key;
}
