/**
 * 全市视图 · 柱图模式三张指标卡（总立项 / 总供地 / 总竣工，不与区县柱图同轴）
 */
import React, { useMemo } from 'react';
import { AnimatedNumber } from '../../../common/AnimatedNumber';
import type { CmSummaryMetricGroup } from '../mock/regionScopedData';
import {
  CM_SUMMARY_MILESTONE_META,
  type CmSummaryLegendSelection,
} from './cmSummaryChartOptions';

const CITY_MILESTONE_CARD_TITLES: Record<
  (typeof CM_SUMMARY_MILESTONE_META)[number]['key'],
  string
> = {
  initiation: '总立项',
  supply: '总供地',
  completion: '总竣工',
};

export type CmCityMilestoneBarSummaryProps = {
  initiation: CmSummaryMetricGroup;
  supply: CmSummaryMetricGroup;
  completion: CmSummaryMetricGroup;
  legendSelection?: CmSummaryLegendSelection;
};

export const CmCityMilestoneBarSummary: React.FC<CmCityMilestoneBarSummaryProps> = ({
  initiation,
  supply,
  completion,
  legendSelection,
}) => {
  const metricsByKey = useMemo(
    () => ({ initiation, supply, completion }),
    [completion, initiation, supply],
  );

  const visibleItems = CM_SUMMARY_MILESTONE_META.filter(
    item => legendSelection?.[item.key] !== false,
  );

  if (visibleItems.length === 0) return null;

  return (
    <section className="hz-cm-city-bar-summary" aria-label="全市立项供地竣工汇总">
      <div
        className="hz-cm-city-bar-summary__cards"
        role="list"
        style={
          {
            '--hz-cm-city-bar-summary-cols': visibleItems.length,
          } as React.CSSProperties
        }
      >
        {visibleItems.map(item => {
          const metrics = metricsByKey[item.key];
          return (
            <article
              key={item.key}
              className="hz-cm-city-bar-summary__card"
              role="listitem"
              style={{ '--hz-cm-city-bar-summary-accent': item.color } as React.CSSProperties}
              aria-label={`${CITY_MILESTONE_CARD_TITLES[item.key]}：${metrics.count}个，${metrics.areaHa}公顷`}
            >
              <h3 className="hz-cm-city-bar-summary__card-title">
                {CITY_MILESTONE_CARD_TITLES[item.key]}
              </h3>
              <div className="hz-cm-city-bar-summary__card-metrics">
                <div className="hz-cm-city-bar-summary__card-metric">
                  <span className="hz-cm-city-bar-summary__card-value">
                    <AnimatedNumber
                      value={metrics.count}
                      formatter={n => Math.round(n).toLocaleString('zh-CN')}
                    />
                  </span>
                  <em className="hz-cm-city-bar-summary__card-unit">个</em>
                </div>
                <div className="hz-cm-city-bar-summary__card-metric">
                  <span className="hz-cm-city-bar-summary__card-value">
                    <AnimatedNumber
                      value={metrics.areaHa}
                      formatter={n =>
                        n.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
                      }
                    />
                  </span>
                  <em className="hz-cm-city-bar-summary__card-unit">公顷</em>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
