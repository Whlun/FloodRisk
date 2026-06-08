/**
 * 预警总览 · 前三未类型卡片列表（样式与交互对齐 hz-cm-phase-card）
 */
import React from 'react';
import { AnimatedNumber } from '../../../common/AnimatedNumber';
import { useAnimatedNumber } from '../../../common/useAnimatedNumber';
import type { CmAlertTypeStat } from '../cmAlertStats';
import type { CmAlertType } from '../types';

export type CmAlertTypeListProps = {
  typeStats: CmAlertTypeStat[];
  selectedAlertType: CmAlertType | null;
  onSelectType: (type: CmAlertType | null) => void;
};

function SharePercent({ value }: { value: number }) {
  const animated = useAnimatedNumber(value, { duration: 500 });
  return <>{Math.round(animated)}%</>;
}

function ProgressFill({ percent }: { percent: number }) {
  const animated = useAnimatedNumber(percent, { duration: 600 });
  return (
    <span
      className="hz-cm-alert-card__fill"
      style={{ width: `${Math.max(animated, 2)}%` }}
    />
  );
}

export const CmAlertTypeList: React.FC<CmAlertTypeListProps> = ({
  typeStats,
  selectedAlertType,
  onSelectType,
}) => {
  const handleSelect = (type: CmAlertType, count: number) => {
    if (count === 0) return;
    onSelectType(type === selectedAlertType ? null : type);
  };

  if (typeStats.every(s => s.count === 0)) {
    return <p className="hz-cm-alert-list__empty">当前区县暂无预警项目</p>;
  }

  return (
    <div
      className={`hz-cm-alert-list-wrap${selectedAlertType ? ' hz-cm-alert-list-wrap--expanded' : ''}`}
    >
      <div className="hz-cm-alert-list__hd">
        <h3 className="hz-cm-alert-list__title" id="hz-cm-alert-list-title">
          预警类型分布
        </h3>
      </div>
      <div
        className="hz-cm-alert-list"
        role="listbox"
        aria-labelledby="hz-cm-alert-list-title"
      >
        {typeStats.map((item, index) => {
          const selected = item.alertType === selectedAlertType;
          const disabled = item.count === 0;

          return (
            <div
              key={item.alertType}
              role="option"
              aria-selected={selected}
              aria-expanded={selected}
              aria-disabled={disabled}
              tabIndex={disabled ? -1 : 0}
              className={`hz-cm-alert-card hz-cm-alert-card--type-${item.alertType}${
                selected ? ' hz-cm-alert-card--selected hz-cm-alert-card--expanded' : ''
              }${disabled ? ' hz-cm-alert-card--disabled' : ''}`}
              onClick={() => handleSelect(item.alertType, item.count)}
              onKeyDown={e => {
                if (disabled) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelect(item.alertType, item.count);
                }
              }}
            >
              <div className="hz-cm-alert-card__row">
                <span className="hz-cm-alert-card__index" aria-hidden>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="hz-cm-alert-card__title">{item.label}</span>
                <span className="hz-cm-alert-card__count" aria-label={`${item.label}个数`}>
                  <AnimatedNumber
                    value={item.count}
                    formatter={n => Math.round(n).toLocaleString('zh-CN')}
                  />
                  <em>个</em>
                </span>
                <span className="hz-cm-alert-card__pct">
                  <SharePercent value={item.sharePct} />
                </span>
              </div>

              {selected ? (
                <div className="hz-cm-alert-card__metrics">
                  <div className="hz-cm-phase-metric hz-cm-phase-metric--count">
                    <span className="hz-cm-phase-metric__label">个数</span>
                    <span className="hz-cm-phase-metric__value">
                      <AnimatedNumber
                        value={item.count}
                        formatter={n => Math.round(n).toLocaleString('zh-CN')}
                      />
                      <em className="hz-cm-phase-metric__unit">个</em>
                    </span>
                  </div>
                  <div className="hz-cm-phase-metric hz-cm-phase-metric--area">
                    <span className="hz-cm-phase-metric__label">面积</span>
                    <span className="hz-cm-phase-metric__value">
                      <AnimatedNumber
                        value={item.areaHa}
                        formatter={n =>
                          n.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
                        }
                      />
                      <em className="hz-cm-phase-metric__unit">公顷</em>
                    </span>
                  </div>
                </div>
              ) : null}

              <div
                className="hz-cm-alert-card__track"
                role="progressbar"
                aria-valuenow={item.sharePct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${item.label} 个数占比`}
              >
                <ProgressFill percent={item.sharePct} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
