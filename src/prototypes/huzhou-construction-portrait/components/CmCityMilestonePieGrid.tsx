/**
 * 全市视图 · 立项 / 供地 / 竣工结构环图（CSS 网格，2 行 × 3 列）
 */
import React, { useEffect, useRef } from 'react';
import { Tooltip } from 'antd';
import { AnimatedNumber } from '../../../common/AnimatedNumber';
import type {
  CmDistrictMilestoneItem,
  CmSummaryMetricGroup,
} from '../mock/regionScopedData';

const MILESTONE_META = [
  { key: 'initiation' as const, label: '立项', color: '#1677ff' },
  { key: 'supply' as const, label: '供地', color: '#1e5bb5' },
  { key: 'completion' as const, label: '竣工', color: '#08cc91' },
];

export type CmCityPieCell = {
  key: string;
  label: string;
  initiation: CmSummaryMetricGroup;
  supply: CmSummaryMetricGroup;
  completion: CmSummaryMetricGroup;
};

function shortenDistrictLabel(label: string): string {
  return label.replace(/(区|县)$/, '');
}

export function buildCityPieCells(
  districts: CmDistrictMilestoneItem[],
  cityMilestone: {
    initiation: CmSummaryMetricGroup;
    supply: CmSummaryMetricGroup;
    completion: CmSummaryMetricGroup;
  },
): CmCityPieCell[] {
  return [
    {
      key: 'all',
      label: '全市',
      ...cityMilestone,
    },
    ...districts.map(district => ({
      key: district.key,
      label: shortenDistrictLabel(district.label),
      initiation: district.initiation,
      supply: district.supply,
      completion: district.completion,
    })),
  ];
}

function buildConicGradient(
  cell: CmCityPieCell,
  legendSelection?: Record<string, boolean>,
): string {
  const visibleMeta = MILESTONE_META.filter(item => legendSelection?.[item.key] !== false);
  if (visibleMeta.length === 0) {
    return '#f0f0f0';
  }

  const values = visibleMeta.map(item => cell[item.key].count);
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return '#f0f0f0';
  }

  let cursor = 0;
  const stops = visibleMeta.map((item, index) => {
    const pct = (cell[item.key].count / total) * 100;
    const start = cursor;
    cursor += pct;
    const end = index === visibleMeta.length - 1 ? 100 : cursor;
    return `${item.color} ${start}% ${end}%`;
  });

  return `conic-gradient(from -90deg, ${stops.join(', ')})`;
}

function getVisibleCellTotal(
  cell: CmCityPieCell,
  legendSelection?: Record<string, boolean>,
): number {
  return MILESTONE_META.filter(item => legendSelection?.[item.key] !== false).reduce(
    (sum, item) => sum + cell[item.key].count,
    0,
  );
}

function formatCellTooltip(
  cell: CmCityPieCell,
  legendSelection?: Record<string, boolean>,
): React.ReactNode {
  const visibleMeta = MILESTONE_META.filter(item => legendSelection?.[item.key] !== false);
  const total = visibleMeta.reduce((sum, item) => sum + cell[item.key].count, 0);
  return (
    <div className="hz-cm-city-pie-cell__tip">
      <div className="hz-cm-city-pie-cell__tip-title">{cell.label}</div>
      {visibleMeta.map(item => {
        const value = cell[item.key].count;
        const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
        return (
          <div key={item.key} className="hz-cm-city-pie-cell__tip-row">
            <i style={{ backgroundColor: item.color }} />
            {item.label}：{value.toLocaleString('zh-CN')} 个（{pct}%）
          </div>
        );
      })}
    </div>
  );
}

export type CmCityMilestonePieGridProps = {
  cells: CmCityPieCell[];
  legendSelection?: Record<string, boolean>;
};

function syncCityPieGridMetrics(el: HTMLDivElement) {
  const { clientWidth, clientHeight } = el;
  const cellW = clientWidth / 3;
  const cellH = clientHeight / 2;
  const size = Math.round(
    Math.max(52, Math.min(96, Math.min(cellW - 6, cellH - 2) * 0.9)),
  );
  const hole = Math.round(size * 0.74);
  const rowGap = Math.round(Math.max(4, Math.min(14, cellH * 0.08)));
  const colGap = Math.round(Math.max(4, Math.min(10, cellW * 0.06)));
  el.style.setProperty('--hz-cm-city-pie-size', `${size}px`);
  el.style.setProperty('--hz-cm-city-pie-hole', `${hole}px`);
  el.style.setProperty('--hz-cm-city-pie-row-gap', `${rowGap}px`);
  el.style.setProperty('--hz-cm-city-pie-col-gap', `${colGap}px`);
}

export const CmCityMilestonePieGrid: React.FC<CmCityMilestonePieGridProps> = ({
  cells,
  legendSelection,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const update = () => syncCityPieGridMetrics(el);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={gridRef}
      className="hz-cm-city-pie-grid"
      role="list"
      aria-label="全市及各区县立项供地竣工结构"
    >
      {cells.map(cell => {
        const total = getVisibleCellTotal(cell, legendSelection);
        return (
          <Tooltip key={cell.key} title={formatCellTooltip(cell, legendSelection)} placement="top">
            <div className="hz-cm-city-pie-cell" role="listitem">
              <div className="hz-cm-city-pie-cell__donut" aria-hidden="true">
                <div
                  key={`${cell.key}-${total}`}
                  className="hz-cm-city-pie-cell__ring hz-cm-city-pie-cell__ring--animate"
                  style={{ background: buildConicGradient(cell, legendSelection) }}
                />
                <div className="hz-cm-city-pie-cell__center">
                  <div className="hz-cm-city-pie-cell__label">{cell.label}</div>
                  <div className="hz-cm-city-pie-cell__value">
                    <AnimatedNumber
                      value={total}
                      formatter={n => Math.round(n).toLocaleString('zh-CN')}
                    />
                    <span className="hz-cm-city-pie-cell__unit">个</span>
                  </div>
                </div>
              </div>
            </div>
          </Tooltip>
        );
      })}
    </div>
  );
};
