/**
 * 预警总览 · 全市五区县对比（Segmented 切换类型）
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Segmented } from 'antd';
import * as echarts from 'echarts';
import { CM_ALERT_TYPE_CHART_META } from '../cmAlertTypeAccent';
import type { CmAlertDistrictTypeItem } from '../cmAlertStats';
import type { CmAlertType } from '../types';
import {
  ALERT_DISTRICT_AREA_SERIES,
  ALERT_DISTRICT_COUNT_SERIES,
  buildAlertDistrictSingleTypeBarOption,
} from './cmAlertDistrictChartOptions';
import { HZ_CHART } from '../../huzhou-spatial-portrait/components/spatial/spatialChartTheme';

export type CmAlertDistrictCompareChartProps = {
  items: CmAlertDistrictTypeItem[];
  /** 与等级构成图 Segmented 联动的当前类型 */
  activeType?: CmAlertType;
  onActiveTypeChange?: (type: CmAlertType) => void;
};

export const CmAlertDistrictCompareChart: React.FC<CmAlertDistrictCompareChartProps> = ({
  items,
  activeType: controlledActiveType,
  onActiveTypeChange,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [internalActiveType, setInternalActiveType] = useState<CmAlertType>(
    CM_ALERT_TYPE_CHART_META[0]!.key,
  );
  const activeType = controlledActiveType ?? internalActiveType;

  const handleTypeChange = (type: CmAlertType) => {
    if (onActiveTypeChange) {
      onActiveTypeChange(type);
    } else {
      setInternalActiveType(type);
    }
  };

  const segmentedOptions = useMemo(
    () =>
      CM_ALERT_TYPE_CHART_META.map(meta => ({
        label: meta.label,
        value: meta.key,
        disabled: items.every(item => item[meta.key].count === 0),
      })),
    [items],
  );

  const accent = useMemo(() => {
    const typeMeta = CM_ALERT_TYPE_CHART_META.find(item => item.key === activeType);
    return typeMeta?.color ?? HZ_CHART.blue;
  }, [activeType]);

  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;

    const chart = echarts.init(el);
    const apply = () => {
      chart.setOption(buildAlertDistrictSingleTypeBarOption(items, activeType), { notMerge: true });
    };
    apply();

    const ro = new ResizeObserver(() => {
      chart.resize();
      apply();
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [activeType, items]);

  return (
    <div className="hz-cm-alert-district-compare" aria-label="五区县预警统计">
      <div className="hz-cm-alert-panel__chart-hd hz-cm-alert-panel__chart-hd--split">
        <span className="hz-cm-alert-panel__chart-title">区县预警统计</span>
        <Segmented<CmAlertType>
          size="small"
          className="hz-cm-alert-type-level-single__tabs"
          options={segmentedOptions}
          value={activeType}
          onChange={handleTypeChange}
        />
      </div>
      <div className="hz-cm-alert-district-compare__legend" aria-label="图表图例">
        <span className="hz-cm-alert-district-compare__legend-item">
          <i style={{ background: accent }} />
          {ALERT_DISTRICT_COUNT_SERIES}
        </span>
        <span className="hz-cm-alert-district-compare__legend-item">
          <i style={{ background: accent, opacity: 0.55 }} />
          {ALERT_DISTRICT_AREA_SERIES}
        </span>
      </div>
      <div
        ref={chartRef}
        className="hz-cm-alert-district-compare-chart"
        role="img"
        aria-label="五区县当前类型预警个数与面积对比"
      />
    </div>
  );
};
