/**
 * 预警总览 · 按预警类型分等级柱图（区县三图 / 全市单图切换类型）
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Segmented } from 'antd';
import type { ECElementEvent } from 'echarts';
import * as echarts from 'echarts';
import { CM_ALERT_TYPE_CHART_META, ALERT_LEVEL_ORDER, getAlertTypeLevelColors } from '../cmAlertTypeAccent';
import {
  buildSingleTypeLevelBarOption,
  resolveLevelFromMiniBarClick,
  resolveSharedTypeLevelYMax,
} from './cmAlertTypeLevelChartOptions';
import { CM_INDUSTRIAL_LEVEL_LABEL } from '../cmIndustrialLandAlert';
import type { CmAlertTypeStat } from '../cmAlertStats';
import type { CmAlertType, CmPhaseAlertLevel } from '../types';
import { CmAlertLevelChartTitle } from './CmAlertLevelChartTitle';

export type CmAlertTypeLevelChartProps = {
  typeStats: CmAlertTypeStat[];
  selectedAlertType: CmAlertType | null;
  selectedLevel: CmPhaseAlertLevel | null;
  onSelectType: (type: CmAlertType | null) => void;
  onSelectLevel: (level: CmPhaseAlertLevel | null) => void;
  /** stacked：区县三图并列；single：全市单图 + 类型切换 */
  variant?: 'stacked' | 'single';
  /** 全市单图模式下与区县对比图联动的当前类型 */
  activeType?: CmAlertType;
  onActiveTypeChange?: (type: CmAlertType) => void;
};

type MiniChartProps = {
  typeStat: CmAlertTypeStat;
  yMax?: number;
  selectedAlertType: CmAlertType | null;
  selectedLevel: CmPhaseAlertLevel | null;
  onSelectType: (type: CmAlertType | null) => void;
  onSelectLevel: (level: CmPhaseAlertLevel | null) => void;
  dimmed: boolean;
  compact?: boolean;
  stretch?: boolean;
};

const TypeLevelMiniChart: React.FC<MiniChartProps> = ({
  typeStat,
  yMax,
  selectedAlertType,
  selectedLevel,
  onSelectType,
  onSelectLevel,
  dimmed,
  compact = false,
  stretch = false,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const typeSelected = typeStat.alertType === selectedAlertType;
  const disabled = typeStat.count === 0;
  const levelColors = getAlertTypeLevelColors(typeStat.alertType);

  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;

    const chart = echarts.init(el);
    const apply = () => {
      chart.setOption(
        buildSingleTypeLevelBarOption(typeStat, selectedAlertType, selectedLevel, yMax),
        { notMerge: true },
      );
    };
    apply();

    const handleClick = (ev: ECElementEvent) => {
      if (ev.componentType !== 'series' || ev.dataIndex == null) return;
      const level = resolveLevelFromMiniBarClick(ev.dataIndex);
      if (!level || typeStat.levelCounts[level] === 0) return;
      const sameType = typeStat.alertType === selectedAlertType;
      const sameLevel = level === selectedLevel;
      if (sameType && sameLevel) {
        onSelectLevel(null);
        return;
      }
      onSelectType(typeStat.alertType);
      onSelectLevel(level);
    };
    chart.on('click', handleClick);

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.off('click', handleClick);
      chart.dispose();
    };
  }, [typeStat, yMax, selectedAlertType, selectedLevel, onSelectLevel, onSelectType]);

  const handleTypeSelect = () => {
    if (disabled) return;
    if (typeSelected) {
      onSelectType(null);
      onSelectLevel(null);
      return;
    }
    onSelectType(typeStat.alertType);
    onSelectLevel(null);
  };

  const legend = (
    <div className="hz-cm-alert-type-level-panel__legend" aria-hidden>
      {ALERT_LEVEL_ORDER.map(level => (
        <span key={level} className="hz-cm-alert-type-level-panel__legend-item">
          <i style={{ background: levelColors[level] }} />
          {CM_INDUSTRIAL_LEVEL_LABEL[level]}
        </span>
      ))}
    </div>
  );

  return (
    <div
      className={[
        'hz-cm-alert-type-level-panel',
        `hz-cm-alert-card--type-${typeStat.alertType}`,
        typeSelected ? ' hz-cm-alert-type-level-panel--selected' : '',
        disabled ? ' hz-cm-alert-type-level-panel--disabled' : '',
        dimmed && !typeSelected ? ' hz-cm-alert-type-level-panel--dimmed' : '',
        compact ? ' hz-cm-alert-type-level-panel--compact' : '',
        stretch ? ' hz-cm-alert-type-level-panel--stretch' : '',
      ].join('')}
    >
      {!compact ? (
        <div className="hz-cm-alert-type-level-panel__meta">
          <button
            type="button"
            className="hz-cm-alert-type-level-panel__hd"
            disabled={disabled}
            aria-pressed={typeSelected}
            onClick={handleTypeSelect}
          >
            <span className="hz-cm-alert-type-level-panel__name">{typeStat.label}</span>
          </button>
          {legend}
        </div>
      ) : (
        legend
      )}
      <div
        ref={chartRef}
        className="hz-cm-alert-type-level-panel__chart"
        aria-label={`${typeStat.label}等级构成`}
      />
    </div>
  );
};

export const CmAlertTypeLevelChart: React.FC<CmAlertTypeLevelChartProps> = ({
  typeStats,
  selectedAlertType,
  selectedLevel,
  onSelectType,
  onSelectLevel,
  variant = 'stacked',
  activeType: controlledActiveType,
  onActiveTypeChange,
}) => {
  const yMax = useMemo(() => resolveSharedTypeLevelYMax(typeStats), [typeStats]);
  const gridRef = useRef<HTMLDivElement>(null);
  const hasFilter = selectedAlertType != null || selectedLevel != null;
  const defaultType = CM_ALERT_TYPE_CHART_META[0]!.key;
  const [internalActiveType, setInternalActiveType] = useState<CmAlertType>(defaultType);
  const activeType = controlledActiveType ?? internalActiveType;

  useEffect(() => {
    if (controlledActiveType == null && selectedAlertType) {
      setInternalActiveType(selectedAlertType);
    }
  }, [controlledActiveType, selectedAlertType]);

  useEffect(() => {
    if (variant !== 'stacked') return;
    const grid = gridRef.current;
    if (!grid) return;

    const syncChartHeight = () => {
      const gridHeight = grid.clientHeight;
      if (gridHeight <= 0) return;

      const gap = 8;
      const count = Math.max(typeStats.length, 1);
      const panelSlotHeight = (gridHeight - gap * Math.max(count - 1, 0)) / count;

      const samplePanel = grid.querySelector('.hz-cm-alert-type-level-panel') as HTMLElement | null;
      let chromeHeight = 38;
      if (samplePanel) {
        const meta = samplePanel.querySelector('.hz-cm-alert-type-level-panel__meta') as HTMLElement | null;
        const panelStyle = getComputedStyle(samplePanel);
        const padY =
          parseFloat(panelStyle.paddingTop) + parseFloat(panelStyle.paddingBottom);
        chromeHeight = padY + (meta?.offsetHeight ?? 20) + 4;
      }

      const chartHeight = Math.max(64, Math.floor(panelSlotHeight - chromeHeight));
      grid.style.setProperty('--hz-cm-alert-type-level-chart-h', `${chartHeight}px`);
    };

    syncChartHeight();
    requestAnimationFrame(syncChartHeight);
    const ro = new ResizeObserver(syncChartHeight);
    ro.observe(grid);
    return () => ro.disconnect();
  }, [variant, typeStats.length]);

  const activeTypeStat = useMemo(
    () => typeStats.find(item => item.alertType === activeType) ?? typeStats[0]!,
    [activeType, typeStats],
  );

  const segmentedOptions = useMemo(
    () =>
      CM_ALERT_TYPE_CHART_META.map(meta => ({
        label: meta.label,
        value: meta.key,
        disabled: (typeStats.find(item => item.alertType === meta.key)?.count ?? 0) === 0,
      })),
    [typeStats],
  );

  const handleTypeSwitch = (type: CmAlertType) => {
    if (onActiveTypeChange) {
      onActiveTypeChange(type);
    } else {
      setInternalActiveType(type);
    }
    onSelectLevel(null);
  };

  if (variant === 'single') {
    return (
      <div className="hz-cm-alert-type-level-single" aria-label="前三未等级构成">
        <div className="hz-cm-alert-panel__chart-hd hz-cm-alert-panel__chart-hd--split">
          <CmAlertLevelChartTitle />
          <Segmented<CmAlertType>
            size="small"
            className="hz-cm-alert-type-level-single__tabs"
            options={segmentedOptions}
            value={activeType}
            onChange={handleTypeSwitch}
          />
        </div>
        <TypeLevelMiniChart
          typeStat={activeTypeStat}
          yMax={yMax}
          selectedAlertType={selectedAlertType}
          selectedLevel={selectedLevel}
          onSelectType={onSelectType}
          onSelectLevel={onSelectLevel}
          dimmed={hasFilter}
          compact
        />
      </div>
    );
  }

  return (
    <div
      ref={gridRef}
      className="hz-cm-alert-type-level-grid hz-cm-alert-type-level-grid--stacked"
      aria-label="前三未分类型等级构成"
    >
      {typeStats.map(typeStat => (
        <TypeLevelMiniChart
          key={typeStat.alertType}
          typeStat={typeStat}
          yMax={yMax}
          selectedAlertType={selectedAlertType}
          selectedLevel={selectedLevel}
          onSelectType={onSelectType}
          onSelectLevel={onSelectLevel}
          dimmed={hasFilter}
          stretch
        />
      ))}
    </div>
  );
};
