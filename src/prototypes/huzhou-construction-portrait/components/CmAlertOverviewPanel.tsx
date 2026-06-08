/**
 * 预警总览 · 左栏看板（结构对齐 CmPhaseDistributionPanel）
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Typography } from 'antd';
import { AnimatedNumber } from '../../../common/AnimatedNumber';
import { CM_ALERT_TYPE_CHART_META } from '../cmAlertTypeAccent';
import { buildCmAlertRegionStats, getDistrictAlertTypeComparison } from '../cmAlertStats';
import type { CmRegionKey } from '../cmRegionFilter';
import type { CmAlertType, CmPhaseAlertLevel } from '../types';
import { CmAlertDistrictCompareChart } from './CmAlertDistrictCompareChart';
import { CmAlertLevelChartTitle } from './CmAlertLevelChartTitle';
import { CmAlertTypeLevelChart } from './CmAlertTypeLevelChart';
import { CmAlertTypeList } from './CmAlertTypeList';

const { Text } = Typography;

export type CmAlertOverviewPanelProps = {
  regionKey: CmRegionKey;
  selectedLevel: CmPhaseAlertLevel | null;
  onSelectLevel: (level: CmPhaseAlertLevel | null) => void;
  selectedAlertType: CmAlertType | null;
  onSelectAlertType: (type: CmAlertType | null) => void;
};

export const CmAlertOverviewPanel: React.FC<CmAlertOverviewPanelProps> = ({
  regionKey,
  selectedLevel,
  onSelectLevel,
  selectedAlertType,
  onSelectAlertType,
}) => {
  const stats = useMemo(() => buildCmAlertRegionStats(regionKey), [regionKey]);
  const districtComparison = useMemo(
    () => (regionKey === 'all' ? getDistrictAlertTypeComparison() : []),
    [regionKey],
  );
  const isCityView = regionKey === 'all';
  const [chartActiveType, setChartActiveType] = useState<CmAlertType>(
    CM_ALERT_TYPE_CHART_META[0]!.key,
  );

  useEffect(() => {
    if (selectedAlertType) {
      setChartActiveType(selectedAlertType);
    }
  }, [selectedAlertType]);

  const filterActive = selectedLevel != null || selectedAlertType != null;
  const filterMeta = filterActive
    ? [
        selectedLevel ? stats.levelStats.find(l => l.level === selectedLevel)?.label : null,
        selectedAlertType
          ? stats.typeStats.find(t => t.alertType === selectedAlertType)?.label
          : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  const visibleTypeCount = stats.typeStats.length;

  return (
    <aside className="zht-left hz-cm-left hz-cm-alert-panel">
      <div
        className="zht-left-inner hz-cm-alert-panel-inner"
        style={
          {
            '--hz-cm-alert-list-cards': Math.max(visibleTypeCount, 3),
          } as React.CSSProperties
        }
      >
        <header className="zht-stat-drawer__hd hz-cm-alert-panel__hd">
          <div className="zht-stat-drawer__hd-top hz-cm-alert-panel__hd-top">
            <h2 className="zht-stat-drawer__title" id="hz-cm-alert-panel-title">
              <span className="zht-stat-drawer__pipe">|</span>
              预警统计
            </h2>
          </div>
        </header>

        <section className="hz-cm-alert-panel__summary" aria-label="预警汇总">
          <div className="hz-cm-summary-row hz-cm-alert-panel__summary-totals">
            <div className="hz-cm-summary-stat">
              <div className="hz-cm-summary-stat__label">预警项目</div>
              <div className="hz-cm-summary-stat__value">
                <AnimatedNumber
                  value={stats.totalCount}
                  formatter={n => Math.round(n).toLocaleString('zh-CN')}
                />
                <em className="hz-cm-summary-stat__unit">个</em>
              </div>
            </div>
            <div className="hz-cm-summary-stat">
              <div className="hz-cm-summary-stat__label">预警总面积</div>
              <div className="hz-cm-summary-stat__value">
                <AnimatedNumber
                  value={stats.totalAreaHa}
                  formatter={n =>
                    n.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
                  }
                />
                <em className="hz-cm-summary-stat__unit">公顷</em>
              </div>
            </div>
          </div>
          {filterActive ? (
            <Text type="secondary" className="hz-cm-alert-panel__filter" title="点击图表或类型可取消">
              已筛选{filterMeta ? ` · ${filterMeta}` : ''}
            </Text>
          ) : null}
          <div className="hz-cm-alert-panel__type-level-wrap">
            {isCityView ? (
              <div className="hz-cm-alert-panel__city-charts">
                <div className="hz-cm-alert-panel__chart-block hz-cm-alert-panel__chart-block--level">
                  <CmAlertTypeLevelChart
                    variant="single"
                    typeStats={stats.typeStats}
                    selectedAlertType={selectedAlertType}
                    selectedLevel={selectedLevel}
                    onSelectType={onSelectAlertType}
                    onSelectLevel={onSelectLevel}
                    activeType={chartActiveType}
                    onActiveTypeChange={setChartActiveType}
                  />
                </div>
                <div className="hz-cm-alert-panel__chart-block hz-cm-alert-panel__chart-block--district">
                  <CmAlertDistrictCompareChart
                    items={districtComparison}
                    activeType={chartActiveType}
                    onActiveTypeChange={setChartActiveType}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="hz-cm-alert-panel__chart-hd">
                  <CmAlertLevelChartTitle />
                </div>
                <CmAlertTypeLevelChart
                  typeStats={stats.typeStats}
                  selectedAlertType={selectedAlertType}
                  selectedLevel={selectedLevel}
                  onSelectType={onSelectAlertType}
                  onSelectLevel={onSelectLevel}
                />
              </>
            )}
          </div>
        </section>

        <CmAlertTypeList
          typeStats={stats.typeStats}
          selectedAlertType={selectedAlertType}
          onSelectType={onSelectAlertType}
        />
      </div>
    </aside>
  );
};
