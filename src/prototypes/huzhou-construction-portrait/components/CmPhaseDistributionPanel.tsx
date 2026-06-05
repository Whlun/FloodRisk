/**
 * 建设工程画像 · 左侧看板：建设总览（卡片列表，可切换联动右侧）
 */
import React, { useEffect, useMemo, useState } from 'react';
import type { CmRegionKey } from '../cmRegionFilter';
import {
  getPhaseCountPercentForRegionAndTime,
  getPhaseMetricsForRegionAndTime,
  getSummaryForRegionAndTime,
} from '../mock/regionScopedData';
import type { CmProjectListPanelState } from '../useCmProjectListPanelState';
import type { PhaseKey } from '../types';
import { CmPhaseListSettings } from './CmPhaseListSettings';
import { CmProjectTimeFilter } from './CmProjectTimeFilter';

export type CmPhaseDistributionPanelProps = {
  regionKey: CmRegionKey;
  /** 未选时为 null，右侧展示全部项目 */
  selectedPhaseKey: PhaseKey | null;
  onSelectPhase: (key: PhaseKey | null) => void;
  panelState: CmProjectListPanelState;
};

/** 平方米 → 公顷（与顶部汇总一致） */
function formatAreaHa(m2: number): string {
  return (m2 / 10000).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}

export const CmPhaseDistributionPanel: React.FC<CmPhaseDistributionPanelProps> = ({
  regionKey,
  selectedPhaseKey,
  onSelectPhase,
  panelState,
}) => {
  const {
    timeFilterMode,
    setTimeFilterMode,
    periodAnchor,
    setPeriodAnchor,
    dateRange,
    setDateRange,
    querySnapshot,
  } = panelState;
  const { dateFrom, dateTo } = querySnapshot;
  const phaseMetrics = useMemo(
    () => getPhaseMetricsForRegionAndTime(regionKey, dateFrom, dateTo),
    [dateFrom, dateTo, regionKey],
  );
  const countPercentByKey = useMemo(
    () => getPhaseCountPercentForRegionAndTime(regionKey, dateFrom, dateTo),
    [dateFrom, dateTo, regionKey],
  );
  const summary = useMemo(
    () => getSummaryForRegionAndTime(regionKey, dateFrom, dateTo),
    [dateFrom, dateTo, regionKey],
  );
  const phaseOptions = useMemo(
    () => phaseMetrics.map(m => ({ key: m.key, label: m.label })),
    [phaseMetrics],
  );
  const [visiblePhaseKeys, setVisiblePhaseKeys] = useState<PhaseKey[]>(() =>
    phaseOptions.map(option => option.key),
  );
  const visiblePhaseMetrics = useMemo(
    () => phaseMetrics.filter(m => visiblePhaseKeys.includes(m.key)),
    [phaseMetrics, visiblePhaseKeys],
  );

  useEffect(() => {
    setVisiblePhaseKeys(prev => {
      const allKeys = phaseOptions.map(option => option.key);
      const next = prev.filter(key => allKeys.includes(key));
      return next.length > 0 ? next : allKeys;
    });
  }, [phaseOptions]);

  useEffect(() => {
    if (selectedPhaseKey && !visiblePhaseKeys.includes(selectedPhaseKey)) {
      onSelectPhase(null);
    }
  }, [onSelectPhase, selectedPhaseKey, visiblePhaseKeys]);

  const handleSelect = (key: PhaseKey) => {
    onSelectPhase(key === selectedPhaseKey ? null : key);
  };

  return (
    <aside className="zht-left hz-cm-left hz-cm-phase-panel">
      <div className="zht-left-inner hz-cm-phase-panel-inner">
        <header className="zht-stat-drawer__hd hz-cm-phase-panel__hd">
          <div className="zht-stat-drawer__hd-top">
            <h2 className="zht-stat-drawer__title" id="hz-cm-phase-panel-title">
              <span className="zht-stat-drawer__pipe">|</span>
              建设总览
            </h2>
          </div>
        </header>

        <div className="zht-stat-drawer__filters hz-cm-phase-panel__filters">
          <CmProjectTimeFilter
            mode={timeFilterMode}
            periodAnchor={periodAnchor}
            dateRange={dateRange}
            onModeChange={setTimeFilterMode}
            onPeriodAnchorChange={setPeriodAnchor}
            onDateRangeChange={setDateRange}
          />
        </div>

        <div
          className="hz-cm-summary-row hz-cm-phase-panel__summary"
          aria-label="汇总统计"
        >
          <div className="hz-cm-summary-stat">
            <div className="hz-cm-summary-stat__label">项目总数</div>
            <div className="hz-cm-summary-stat__value">
              {summary.totalCount.toLocaleString('zh-CN')}
              <em className="hz-cm-summary-stat__unit">个</em>
            </div>
          </div>
          <div className="hz-cm-summary-stat">
            <div className="hz-cm-summary-stat__label">总面积</div>
            <div className="hz-cm-summary-stat__value">
              {summary.totalAreaHa.toLocaleString('zh-CN', {
                maximumFractionDigits: 2,
              })}
              <em className="hz-cm-summary-stat__unit">公顷</em>
            </div>
          </div>
        </div>

        <div className="hz-cm-phase-list-wrap">
          <div className="hz-cm-phase-list__hd">
            <h3 className="hz-cm-phase-list__title" id="hz-cm-phase-list-title">
              事项阶段分布
            </h3>
            <CmPhaseListSettings
              options={phaseOptions}
              visibleKeys={visiblePhaseKeys}
              onChange={setVisiblePhaseKeys}
            />
          </div>
          <div
            className="hz-cm-phase-list"
            role="listbox"
            aria-labelledby="hz-cm-phase-list-title"
          >
            {visiblePhaseMetrics.map((m, index) => {
              const countPct = countPercentByKey[m.key] ?? 0;
              const selected = m.key === selectedPhaseKey;
              return (
                <div
                  key={m.key}
                  role="option"
                  aria-selected={selected}
                  aria-expanded={selected}
                  tabIndex={0}
                  className={`hz-cm-phase-card hz-cm-phase-card--phase-${m.key}${selected ? ' hz-cm-phase-card--selected hz-cm-phase-card--expanded' : ''}`}
                  onClick={() => handleSelect(m.key)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelect(m.key);
                    }
                  }}
                >
                  <div className="hz-cm-phase-card__row">
                    <span className="hz-cm-phase-card__index" aria-hidden>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="hz-cm-phase-card__title">{m.label}</span>
                    <span className="hz-cm-phase-card__pct">{countPct}%</span>
                  </div>

                  {selected ? (
                    <div className="hz-cm-phase-card__metrics">
                      <div className="hz-cm-phase-metric hz-cm-phase-metric--count">
                        <span className="hz-cm-phase-metric__label">个数</span>
                        <span className="hz-cm-phase-metric__value">
                          {m.count.toLocaleString('zh-CN')}
                          <em className="hz-cm-phase-metric__unit">个</em>
                        </span>
                      </div>
                      <div className="hz-cm-phase-metric hz-cm-phase-metric--area">
                        <span className="hz-cm-phase-metric__label">面积</span>
                        <span className="hz-cm-phase-metric__value">
                          {formatAreaHa(m.area)}
                          <em className="hz-cm-phase-metric__unit">公顷</em>
                        </span>
                      </div>
                    </div>
                  ) : null}

                  <div
                    className="hz-cm-phase-card__track"
                    role="progressbar"
                    aria-valuenow={countPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${m.label} 个数占比`}
                  >
                    <span
                      className="hz-cm-phase-card__fill"
                      style={{ width: `${Math.max(countPct, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
};
