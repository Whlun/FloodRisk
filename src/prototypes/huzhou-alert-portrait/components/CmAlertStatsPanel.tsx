/**
 * 预警工程画像 · 左侧看板（布局对齐空间利用画像 hz-left-panel）
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Typography } from 'antd';
import type { ECElementEvent, EChartsOption } from 'echarts';
import * as echarts from 'echarts';
import { buildCmAlertRegionStats } from '../../huzhou-construction-portrait/cmAlertStats';
import type { CmRegionKey } from '../../huzhou-construction-portrait/cmRegionFilter';
import type { CmPhaseAlertLevel, PhaseKey } from '../../huzhou-construction-portrait/types';
import { buildAlertDaysBarOption, buildAlertLevelPieOption } from './cmAlertChartOptions';
import { CmAlertPhaseRankList } from './CmAlertPhaseRankList';

const { Text, Title } = Typography;

export type CmAlertStatsPanelProps = {
  regionKey: CmRegionKey;
  selectedLevel: CmPhaseAlertLevel | null;
  onSelectLevel: (level: CmPhaseAlertLevel | null) => void;
  selectedPhaseKey: PhaseKey | null;
  onSelectPhase: (key: PhaseKey | null) => void;
};

function useAlertChart(
  ref: React.RefObject<HTMLDivElement | null>,
  getOption: () => EChartsOption,
  onChartClick: ((event: ECElementEvent) => void) | undefined,
  deps: React.DependencyList,
) {
  const onClickRef = useRef(onChartClick);
  onClickRef.current = onChartClick;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const chart = echarts.init(el);
    const apply = () => chart.setOption(getOption(), { notMerge: true });
    apply();
    const handleClick = (ev: ECElementEvent) => onClickRef.current?.(ev);
    chart.on('click', handleClick);
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el);
    return () => {
      ro.disconnect();
      chart.off('click', handleClick);
      chart.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, ...deps]);
}

export const CmAlertStatsPanel: React.FC<CmAlertStatsPanelProps> = ({
  regionKey,
  selectedLevel,
  onSelectLevel,
  selectedPhaseKey,
  onSelectPhase,
}) => {
  const stats = useMemo(() => buildCmAlertRegionStats(regionKey), [regionKey]);

  const innerRef = useRef<HTMLDivElement>(null);
  const levelChartRef = useRef<HTMLDivElement>(null);
  const daysChartRef = useRef<HTMLDivElement>(null);

  const handleSelectLevel = useCallback(
    (level: CmPhaseAlertLevel) => {
      onSelectLevel(level === selectedLevel ? null : level);
    },
    [onSelectLevel, selectedLevel],
  );

  const onLevelClick = useCallback(
    (ev: ECElementEvent) => {
      if (ev.componentType !== 'series' || ev.dataIndex == null) return;
      const item = stats.levelStats[ev.dataIndex];
      if (!item || item.count === 0) return;
      handleSelectLevel(item.level);
    },
    [handleSelectLevel, stats.levelStats],
  );

  useAlertChart(
    levelChartRef,
    () => buildAlertLevelPieOption(stats.levelStats, stats.totalCount, selectedLevel),
    onLevelClick,
    [stats.levelStats, stats.totalCount, selectedLevel, onLevelClick],
  );

  useAlertChart(
    daysChartRef,
    () => buildAlertDaysBarOption(stats.daysBuckets),
    undefined,
    [stats.daysBuckets],
  );

  useEffect(() => {
    const host = innerRef.current;
    if (!host) return;
    const resizeAll = () => {
      [levelChartRef, daysChartRef].forEach(r => {
        const el = r.current;
        if (!el) return;
        echarts.getInstanceByDom(el)?.resize();
      });
    };
    const ro = new ResizeObserver(() => resizeAll());
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  const filterActive = selectedLevel != null || selectedPhaseKey != null;
  const filterMeta = filterActive
    ? [
        selectedLevel ? stats.levelStats.find(l => l.level === selectedLevel)?.label : null,
        selectedPhaseKey ? stats.phaseStats.find(p => p.phaseKey === selectedPhaseKey)?.label : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <aside className="zht-left hz-left-panel hz-alert-left-panel">
      <div className="hz-left-panel-inner" ref={innerRef}>
        <Title level={5} className="zht-section-title hz-panel-title">
          预警统计
        </Title>

        <div className="hz-alert-left-panel__intro">
          <div className="hz-cm-summary-row hz-alert-left-panel__summary" aria-label="预警汇总">
            <div className="hz-cm-summary-stat">
              <div className="hz-cm-summary-stat__label">预警项目</div>
              <div className="hz-cm-summary-stat__value">
                {stats.totalCount.toLocaleString('zh-CN')}
                <em className="hz-cm-summary-stat__unit">个</em>
              </div>
            </div>
            <div className="hz-cm-summary-stat">
              <div className="hz-cm-summary-stat__label">最长停留</div>
              <div className="hz-cm-summary-stat__value">
                {stats.maxDaysInPhase > 0 ? stats.maxDaysInPhase.toLocaleString('zh-CN') : '—'}
                <em className="hz-cm-summary-stat__unit">天</em>
              </div>
            </div>
          </div>
          {filterActive && (
            <Text type="secondary" className="hz-alert-left-panel__filter" title="点击图表或阶段可取消">
              已筛选{filterMeta ? ` · ${filterMeta}` : ''}
            </Text>
          )}
        </div>

        <section className="hz-panel-block hz-panel-block--alert-level">
          <div className="zht-right-widget-hd hz-panel-block-hd">
            <h3 className="zht-right-widget-title">
              <span className="zht-right-widget-pipe">|</span>
              预警等级
            </h3>
          </div>
          <div className="hz-panel-block-body hz-panel-block-body--chart">
            <div
              ref={levelChartRef}
              className="hz-chart hz-chart--flex"
              aria-label="预警等级分布"
            />
          </div>
        </section>

        <section className="hz-panel-block hz-panel-block--alert-days">
          <div className="zht-right-widget-hd hz-panel-block-hd">
            <h3 className="zht-right-widget-title">
              <span className="zht-right-widget-pipe">|</span>
              停留天数
            </h3>
          </div>
          <div className="hz-panel-block-body hz-panel-block-body--chart">
            <div
              ref={daysChartRef}
              className="hz-chart hz-chart--flex"
              aria-label="停留天数分布"
            />
          </div>
        </section>

        <section className="hz-panel-block hz-panel-block--alert-phase">
          <div className="zht-right-widget-hd hz-panel-block-hd">
            <h3 className="zht-right-widget-title">
              <span className="zht-right-widget-pipe">|</span>
              预警阶段分布
            </h3>
            <Text type="secondary" className="hz-panel-block-hd__meta">
              {stats.phaseStats.length} 个阶段
            </Text>
          </div>
          <div className="hz-panel-block-body">
            {stats.phaseStats.length === 0 ? (
              <p className="hz-alert-phase-empty">当前区县暂无阶段预警项目</p>
            ) : (
              <CmAlertPhaseRankList
                phaseStats={stats.phaseStats}
                totalCount={stats.totalCount}
                selectedPhaseKey={selectedPhaseKey}
                onSelectPhase={onSelectPhase}
              />
            )}
          </div>
        </section>
      </div>
    </aside>
  );
};
