/**
 * 空间利用画像 · 右侧看板（可利用空间统计，四块均分）
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { Typography } from 'antd';
import * as echarts from 'echarts';
import { AnimatedNumber } from '../../../../common/AnimatedNumber';
import { AnimatedProgressFill } from '../../../../common/AnimatedProgressFill';
import type { HzRegionKey } from '../../../huzhou-lifecycle-shared/hzRegionScope';
import { getSpatialStatsForRegion } from '../../mock/regionScopedSpatialStats';
import { useSpatialEcharts } from './useSpatialEcharts';
import {
  buildAvailableDonutOption,
  buildPublicDonutOption,
  buildResidentialBarOption,
  INDUSTRIAL_ROW_COLORS,
} from './spatialChartTheme';

const { Title } = Typography;

export type SpatialRightPanelProps = {
  regionKey: HzRegionKey;
};

export const SpatialRightPanel: React.FC<SpatialRightPanelProps> = ({ regionKey }) => {
  const stats = useMemo(() => getSpatialStatsForRegion(regionKey), [regionKey]);
  const innerRef = useRef<HTMLDivElement>(null);
  const donutRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const publicDonutRef = useRef<HTMLDivElement>(null);

  const industrialMax = Math.max(...stats.industrialRows.map(r => r.value), 1);

  useSpatialEcharts(
    donutRef,
    () => buildAvailableDonutOption(stats.availableDonut, stats.availableTotal),
    true,
    [regionKey, stats.availableDonut, stats.availableTotal],
  );
  useSpatialEcharts(
    barRef,
    () => buildResidentialBarOption(stats.residentialBars),
    true,
    [regionKey, stats.residentialBars],
  );
  useSpatialEcharts(
    publicDonutRef,
    () => buildPublicDonutOption(stats.publicDonut, stats.publicDonutTotal),
    true,
    [regionKey, stats.publicDonut, stats.publicDonutTotal],
  );

  useEffect(() => {
    const host = innerRef.current;
    if (!host) return;
    const resizeAll = () => {
      [donutRef, barRef, publicDonutRef].forEach(ref => {
        const el = ref.current;
        if (!el) return;
        echarts.getInstanceByDom(el)?.resize();
      });
    };
    const ro = new ResizeObserver(() => resizeAll());
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  return (
    <aside className="zht-right-rail hz-right-panel">
      <div className="hz-right-panel-inner" ref={innerRef}>
        <Title level={5} className="zht-section-title hz-panel-title">
          可利用空间
        </Title>

        <section className="hz-panel-block">
          <div className="zht-right-widget-hd hz-panel-block-hd">
            <h3 className="zht-right-widget-title">
              <span className="zht-right-widget-pipe">|</span>
              总体可用
            </h3>
          </div>
          <div className="hz-panel-block-body hz-panel-block-body--chart">
            <div ref={donutRef} className="hz-chart hz-chart--flex" aria-label="总体可用" />
          </div>
        </section>

        <section className="hz-panel-block">
          <div className="zht-right-widget-hd hz-panel-block-hd">
            <h3 className="zht-right-widget-title">
              <span className="zht-right-widget-pipe">|</span>
              居住用地
            </h3>
          </div>
          <div className="hz-panel-block-body hz-panel-block-body--chart">
            <div ref={barRef} className="hz-chart hz-chart--flex" aria-label="居住用地" />
          </div>
        </section>

        <section className="hz-panel-block hz-panel-block--industrial">
          <div className="zht-right-widget-hd hz-panel-block-hd">
            <h3 className="zht-right-widget-title">
              <span className="zht-right-widget-pipe">|</span>
              工业用地
            </h3>
          </div>
          <div className="hz-panel-block-body">
            <div className="hz-industrial-metrics">
              {stats.industrialRows.map((row, index) => {
                const pct = (row.value / industrialMax) * 100;
                const color = INDUSTRIAL_ROW_COLORS[index % INDUSTRIAL_ROW_COLORS.length];
                return (
                  <div key={row.name} className="hz-industrial-metrics__row">
                    <div className="hz-industrial-metrics__hd">
                      <span className="hz-industrial-metrics__label">{row.name}</span>
                      <span className="hz-industrial-metrics__value">
                        <AnimatedNumber
                          value={row.value}
                          formatter={n => n.toFixed(2)}
                        />
                        <span className="hz-industrial-metrics__unit">公顷</span>
                      </span>
                    </div>
                    <div className="hz-industrial-metrics__track-wrap">
                      <div
                        className="hz-industrial-metrics__track"
                        role="progressbar"
                        aria-valuenow={Math.round(pct)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${row.name}占比`}
                      >
                        <AnimatedProgressFill
                          className="hz-industrial-metrics__fill"
                          percent={pct}
                          style={{ backgroundColor: color }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="hz-panel-block">
          <div className="zht-right-widget-hd hz-panel-block-hd">
            <h3 className="zht-right-widget-title">
              <span className="zht-right-widget-pipe">|</span>
              公共设施用地
            </h3>
          </div>
          <div className="hz-panel-block-body hz-panel-block-body--chart">
            <div ref={publicDonutRef} className="hz-chart hz-chart--flex" aria-label="公共设施用地" />
          </div>
        </section>
      </div>
    </aside>
  );
};
