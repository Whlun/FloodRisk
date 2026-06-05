/**
 * 预警工程画像 · 预警阶段分布（行样式对齐空间利用右栏 hz-industrial-metrics）
 */
import React from 'react';
import { getCmPhaseMapColors } from '../../huzhou-lifecycle-shared/cmPhaseMapColors';
import type { CmAlertPhaseStat } from '../../huzhou-construction-portrait/cmAlertStats';
import type { PhaseKey } from '../../huzhou-construction-portrait/types';

export type CmAlertPhaseRankListProps = {
  phaseStats: CmAlertPhaseStat[];
  totalCount: number;
  selectedPhaseKey: PhaseKey | null;
  onSelectPhase: (key: PhaseKey | null) => void;
};

export const CmAlertPhaseRankList: React.FC<CmAlertPhaseRankListProps> = ({
  phaseStats,
  totalCount,
  selectedPhaseKey,
  onSelectPhase,
}) => {
  const filtered = selectedPhaseKey != null;
  const maxCount = Math.max(...phaseStats.map(p => p.count), 1);

  const handleSelect = (key: PhaseKey) => {
    onSelectPhase(key === selectedPhaseKey ? null : key);
  };

  return (
    <div
      className={`hz-industrial-metrics hz-alert-phase-metrics${
        filtered ? ' hz-alert-phase-metrics--filtered' : ''
      }`}
      role="listbox"
      aria-label="阶段预警排行"
    >
      {phaseStats.map(item => {
        const selected = item.phaseKey === selectedPhaseKey;
        const sharePct =
          totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0;
        const barPct = Math.round((item.count / maxCount) * 100);
        const colors = getCmPhaseMapColors(item.phaseKey);

        return (
          <div
            key={item.phaseKey}
            role="option"
            aria-selected={selected}
            tabIndex={0}
            className={[
              'hz-industrial-metrics__row',
              'hz-alert-phase-metrics__row',
              selected ? ' hz-alert-phase-metrics__row--selected' : '',
            ].join('')}
            style={
              {
                '--hz-alert-phase-accent': colors.accent,
                '--hz-alert-phase-accent-deep': colors.accentDeep,
              } as React.CSSProperties
            }
            onClick={() => handleSelect(item.phaseKey)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelect(item.phaseKey);
              }
            }}
          >
            <div className="hz-industrial-metrics__hd">
              <span className="hz-industrial-metrics__label" title={item.label}>
                {item.label}
              </span>
              <span className="hz-industrial-metrics__value">
                {item.count}
                <span className="hz-industrial-metrics__unit">个</span>
                <span className="hz-alert-phase-metrics__share">{sharePct}%</span>
              </span>
            </div>
            <div className="hz-industrial-metrics__track-wrap">
              <div
                className="hz-industrial-metrics__track"
                role="progressbar"
                aria-valuenow={barPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${item.label} 预警占比`}
              >
                <span
                  className="hz-industrial-metrics__fill"
                  style={{
                    width: `${Math.max(barPct, item.count > 0 ? 4 : 0)}%`,
                    backgroundColor: colors.accent,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
