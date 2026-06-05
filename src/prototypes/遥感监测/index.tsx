/**
 * @name 遥感监测
 * @description 一张图子系统：影像底图 + 左侧图层与数据列表；数据列表时间轴与「水质指标（叶绿素/悬浮物）」联动，可播放。图层为演示矢量，正式可换 WMS/WMTS。
 */
import './style.css';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Checkbox, Radio, DatePicker, Collapse, Typography, Button, Tooltip } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { CalendarOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';
import { PARK_MAPLIBRE_DEFAULT_CENTER, PARK_MAPLIBRE_DEFAULT_ZOOM } from '../韶山水环境系统管理/park-boundary-maplibre';
import { ZHT_IMAGERY_MAP_STYLE_SPEC } from '../zonghe-taishi/zhtMapStylePresets';
import {
  YG_DEMO_WATER_QUALITY,
  YG_DEMO_SHORELINE_ISSUE,
  YG_DEMO_SHORELINE_CHANGE,
  YG_DEMO_NDVI,
  YG_DEMO_LAND_CLASS,
  YG_LAND_CLASS_COLORS,
  ygWaterColorForValue,
} from './yaoganDemoGeo';

const { Text } = Typography;

const SRC_WATER = 'yg-src-water';
const SRC_SH_ISSUE = 'yg-src-sh-issue';
const SRC_SH_CHANGE = 'yg-src-sh-change';
const SRC_NDVI = 'yg-src-ndvi';
const SRC_LAND = 'yg-src-land';

const LYR_WATER = 'yg-lyr-water';
const LYR_SH_ISSUE = 'yg-lyr-sh-issue';
const LYR_SH_CHANGE_FILL = 'yg-lyr-sh-change-fill';
const LYR_SH_CHANGE_LINE = 'yg-lyr-sh-change-line';
const LYR_NDVI = 'yg-lyr-ndvi';
const LYR_LAND = 'yg-lyr-land';

type WaterMetric = 'chlorophyll' | 'suspended';
type LandKey = 'water' | 'built' | 'green' | 'farm' | 'road' | 'other';

/** 时间轴随上方「水质指标」类型切换；两套演示数据，正式可换接口 */
const DATA_TIMES_BY_METRIC: Record<WaterMetric, string[]> = {
  chlorophyll: [
    '2026-01-02 11:00:00',
    '2026-01-02 11:15:00',
    '2026-01-03 09:00:00',
    '2026-01-04 14:30:00',
    '2026-01-05 08:00:00',
  ],
  suspended: [
    '2026-01-01 08:30:00',
    '2026-01-02 10:00:00',
    '2026-01-03 12:20:00',
    '2026-01-05 16:00:00',
    '2026-01-06 09:45:00',
  ],
};

const PLAYBACK_INTERVAL_MS = 2000;

function buildWaterFc(metric: WaterMetric, timeKey: string) {
  const bump = (timeKey.charCodeAt(0) % 7) * 0.9;
  const alpha = 0.4 + (timeKey.length % 5) * 0.04;
  return {
    type: 'FeatureCollection' as const,
    features: YG_DEMO_WATER_QUALITY.features.map((f, i) => {
      const p = f.properties as { chlor: number; susp: number };
      const fillColor = ygWaterColorForValue(
        metric,
        Math.min(50, p.chlor + bump * i * 0.15),
        Math.min(50, p.susp + bump * i * 0.12),
        alpha,
      );
      return { ...f, properties: { ...p, fillColor } };
    }),
  };
}

const landLabels: Record<LandKey, string> = {
  water: '水域',
  built: '建筑用地',
  green: '绿地',
  farm: '农田',
  road: '道路',
  other: '其他',
};

const RemoteSensingPage: React.FC = () => {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);
  /** 避免地图 init effect 依赖业务 state 导致整图重建 */
  const overlayStateRef = useRef({
    waterMetric: 'suspended' as WaterMetric,
    shoreIssue: true,
    shoreChange: false,
    ndviOn: true,
    landOn: {
      water: true,
      built: true,
      green: true,
      farm: false,
      road: false,
      other: false,
    } as Record<LandKey, boolean>,
    selectedTime: DATA_TIMES_BY_METRIC.suspended[0],
  });

  const [waterMetric, setWaterMetric] = useState<WaterMetric>('suspended');
  const [shoreIssue, setShoreIssue] = useState(true);
  const [shoreChange, setShoreChange] = useState(false);
  const [ndviOn, setNdviOn] = useState(true);
  const [landOn, setLandOn] = useState<Record<LandKey, boolean>>({
    water: true,
    built: true,
    green: true,
    farm: false,
    road: false,
    other: false,
  });

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs('2026-01-01'),
    dayjs('2026-01-31'),
  ]);
  const [selectedTime, setSelectedTime] = useState(() => DATA_TIMES_BY_METRIC.suspended[0]!);
  const [playing, setPlaying] = useState(false);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const filteredTimes = useMemo(() => {
    const [a, b] = dateRange;
    return DATA_TIMES_BY_METRIC[waterMetric].filter(s => {
      const d = dayjs(s.replace(' ', 'T'));
      return !d.isBefore(a.startOf('day')) && !d.isAfter(b.endOf('day'));
    });
  }, [dateRange, waterMetric]);

  useEffect(() => {
    if (filteredTimes.length && !filteredTimes.includes(selectedTime)) {
      setSelectedTime(filteredTimes[0]!);
    }
  }, [filteredTimes, selectedTime]);

  /** 切换「叶绿素 / 悬浮物」时关闭播放，避免新列表与定时器错拍 */
  useEffect(() => {
    setPlaying(false);
  }, [waterMetric]);

  useEffect(() => {
    if (filteredTimes.length <= 1) {
      setPlaying(false);
    }
  }, [filteredTimes.length]);

  useEffect(() => {
    if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }
    if (!playing || filteredTimes.length <= 1) return;
    playTimerRef.current = setInterval(() => {
      setSelectedTime(prev => {
        const idx = filteredTimes.indexOf(prev);
        const i = idx >= 0 ? idx : 0;
        return filteredTimes[(i + 1) % filteredTimes.length]!;
      });
    }, PLAYBACK_INTERVAL_MS);
    return () => {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
    };
  }, [playing, filteredTimes]);

  const syncOverlays = useCallback(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const {
      waterMetric: wm,
      shoreIssue: si,
      shoreChange: sc,
      ndviOn: nv,
      landOn: lo,
      selectedTime: st,
    } = overlayStateRef.current;

    const vis = (on: boolean) => (on ? 'visible' : 'none');

    const waterFc = buildWaterFc(wm, st);
    const sWater = map.getSource(SRC_WATER) as maplibregl.GeoJSONSource | undefined;
    if (sWater) sWater.setData(waterFc as GeoJSON.GeoJSON);
    map.setLayoutProperty(LYR_WATER, 'visibility', vis(true));

    map.setLayoutProperty(LYR_SH_ISSUE, 'visibility', vis(si));
    map.setLayoutProperty(LYR_SH_CHANGE_FILL, 'visibility', vis(sc));
    map.setLayoutProperty(LYR_SH_CHANGE_LINE, 'visibility', vis(sc));

    map.setLayoutProperty(LYR_NDVI, 'visibility', vis(nv));

    const activeClasses = (Object.keys(lo) as LandKey[]).filter(k => lo[k]);
    if (activeClasses.length === 0) {
      map.setLayoutProperty(LYR_LAND, 'visibility', 'none');
    } else {
      map.setLayoutProperty(LYR_LAND, 'visibility', 'visible');
      const parts: maplibregl.FilterSpecification[] = activeClasses.map(
        k => ['==', ['get', 'cls'], k] as maplibregl.FilterSpecification,
      );
      const fl: maplibregl.FilterSpecification =
        parts.length === 1 ? parts[0]! : (['any', ...parts] as maplibregl.FilterSpecification);
      map.setFilter(LYR_LAND, fl);
    }
  }, []);

  useEffect(() => {
    overlayStateRef.current = {
      waterMetric,
      shoreIssue,
      shoreChange,
      ndviOn,
      landOn,
      selectedTime,
    };
    syncOverlays();
  }, [waterMetric, shoreIssue, shoreChange, ndviOn, landOn, selectedTime, syncOverlays]);

  useEffect(() => {
    const el = mapEl.current;
    if (!el) return;

    const map = new maplibregl.Map({
      container: el,
      style: ZHT_IMAGERY_MAP_STYLE_SPEC,
      center: PARK_MAPLIBRE_DEFAULT_CENTER,
      zoom: PARK_MAPLIBRE_DEFAULT_ZOOM,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    mapRef.current = map;

    map.on('load', () => {
      map.addSource(SRC_WATER, { type: 'geojson', data: buildWaterFc('suspended', DATA_TIMES_BY_METRIC.suspended[0]!) });
      map.addLayer({
        id: LYR_WATER,
        type: 'fill',
        source: SRC_WATER,
        paint: { 'fill-color': ['get', 'fillColor'] as maplibregl.ExpressionSpecification, 'fill-antialias': true },
      });

      map.addSource(SRC_SH_ISSUE, { type: 'geojson', data: YG_DEMO_SHORELINE_ISSUE });
      map.addLayer({
        id: LYR_SH_ISSUE,
        type: 'fill',
        source: SRC_SH_ISSUE,
        paint: { 'fill-color': 'rgba(250, 140, 22, 0.45)', 'fill-outline-color': 'rgba(217, 119, 6, 0.9)' },
      });

      map.addSource(SRC_SH_CHANGE, { type: 'geojson', data: YG_DEMO_SHORELINE_CHANGE });
      map.addLayer({
        id: LYR_SH_CHANGE_FILL,
        type: 'fill',
        source: SRC_SH_CHANGE,
        paint: { 'fill-color': 'rgba(22, 119, 255, 0.2)' },
      });
      map.addLayer({
        id: LYR_SH_CHANGE_LINE,
        type: 'line',
        source: SRC_SH_CHANGE,
        paint: { 'line-color': '#1677ff', 'line-width': 2, 'line-dasharray': [2, 2] },
      });

      map.addSource(SRC_NDVI, { type: 'geojson', data: YG_DEMO_NDVI });
      map.addLayer({
        id: LYR_NDVI,
        type: 'fill',
        source: SRC_NDVI,
        paint: { 'fill-color': 'rgba(82, 196, 26, 0.38)', 'fill-outline-color': 'rgba(56, 158, 13, 0.6)' },
      });

      map.addSource(SRC_LAND, { type: 'geojson', data: YG_DEMO_LAND_CLASS });
      map.addLayer({
        id: LYR_LAND,
        type: 'fill',
        source: SRC_LAND,
        paint: {
          'fill-color': [
            'match',
            ['get', 'cls'],
            'water',
            YG_LAND_CLASS_COLORS.water,
            'built',
            YG_LAND_CLASS_COLORS.built,
            'green',
            YG_LAND_CLASS_COLORS.green,
            'farm',
            YG_LAND_CLASS_COLORS.farm,
            'road',
            YG_LAND_CLASS_COLORS.road,
            YG_LAND_CLASS_COLORS.other,
          ] as maplibregl.ExpressionSpecification,
          'fill-opacity': 0.55,
          'fill-outline-color': 'rgba(0,0,0,0.25)',
        },
      });

      readyRef.current = true;
      syncOverlays();
    });

    const ro = new ResizeObserver(() => {
      map.resize();
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      readyRef.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, [syncOverlays]);

  return (
    <div className="yg-rs-root">
      <aside className="yg-rs-sidebar" aria-label="遥感图层与数据">
        <div className="yg-rs-sidebar__inner">
          <Collapse
            bordered={false}
            defaultActiveKey={['layer', 'data']}
            className="yg-rs-collapse"
            items={[
              {
                key: 'layer',
                label: <span className="yg-rs-collapse__title">图层控制</span>,
                children: (
                  <div className="yg-rs-sections">
                    <div className="yg-rs-block">
                      <div className="yg-rs-block__head">
                        <span>水质污染浓度</span>
                      </div>
                      <Radio.Group
                        value={waterMetric}
                        onChange={e => setWaterMetric(e.target.value)}
                        className="yg-rs-radio-stack"
                      >
                        <Radio value="chlorophyll">叶绿素（ug/L）</Radio>
                        <Radio value="suspended">悬浮物（ug/L）</Radio>
                      </Radio.Group>
                      <div className="yg-rs-legend">
                        <span>0</span>
                        <div className="yg-rs-legend__bar" />
                        <span>50</span>
                      </div>
                      <Text type="secondary" className="yg-rs-hint">
                        演示为矢量填色；正式可接 WMS 单波段栅格。下方「数据列表」时间轴会随本项在叶绿素 / 悬浮物之间切换，并支持按序播放。
                      </Text>
                    </div>

                    <div className="yg-rs-block">
                      <div className="yg-rs-block__head">
                        <span>河湖岸线变化</span>
                      </div>
                      <Checkbox checked={shoreIssue} onChange={e => setShoreIssue(e.target.checked)}>
                        <span className="yg-rs-swatch yg-rs-swatch--issue" /> 疑似问题图斑
                      </Checkbox>
                      <Checkbox checked={shoreChange} onChange={e => setShoreChange(e.target.checked)}>
                        <span className="yg-rs-swatch yg-rs-swatch--change" /> 河道变化面
                      </Checkbox>
                    </div>

                    <div className="yg-rs-block">
                      <div className="yg-rs-block__head">
                        <span>地面植被覆盖</span>
                      </div>
                      <Checkbox checked={ndviOn} onChange={e => setNdviOn(e.target.checked)}>
                        NDVI
                      </Checkbox>
                    </div>

                    <div className="yg-rs-block">
                      <div className="yg-rs-block__head">
                        <span>地物分类</span>
                      </div>
                      {(Object.keys(landLabels) as LandKey[]).map(k => (
                        <div key={k} className="yg-rs-land-row">
                          <Checkbox
                            checked={landOn[k]}
                            onChange={e => setLandOn(prev => ({ ...prev, [k]: e.target.checked }))}
                          >
                            <span
                              className="yg-rs-swatch yg-rs-swatch--solid"
                              style={{ background: YG_LAND_CLASS_COLORS[k] }}
                            />
                            {landLabels[k]}
                          </Checkbox>
                        </div>
                      ))}
                    </div>
                  </div>
                ),
              },
              {
                key: 'data',
                label: <span className="yg-rs-collapse__title">数据列表</span>,
                children: (
                  <div className="yg-rs-data">
                    <div className="yg-rs-data__range-row" role="toolbar" aria-label="播放与时间范围">
                      <Tooltip title={playing ? '暂停' : '按顺序自动切换时刻'}>
                        <Button
                          type="primary"
                          size="small"
                          className="yg-rs-data__play-btn"
                          icon={playing ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                          onClick={() => {
                            if (filteredTimes.length <= 1) return;
                            setPlaying(p => !p);
                          }}
                          disabled={filteredTimes.length <= 1}
                        >
                          {playing ? '暂停' : '播放'}
                        </Button>
                      </Tooltip>
                      <DatePicker.RangePicker
                        value={dateRange}
                        onChange={v => {
                          if (v?.[0] && v[1]) setDateRange([v[0], v[1]]);
                        }}
                        className="yg-rs-range"
                        suffixIcon={<CalendarOutlined />}
                        allowClear={false}
                      />
                    </div>
                    <div className="yg-rs-time-list" role="listbox" aria-label="遥感成果时间">
                      {filteredTimes.length === 0 ? (
                        <Text type="secondary">该指标在日期范围内无数据</Text>
                      ) : (
                        <Radio.Group
                          value={selectedTime}
                          onChange={e => {
                            setSelectedTime(e.target.value);
                            setPlaying(false);
                          }}
                          className="yg-rs-time-radios"
                        >
                          {filteredTimes.map(t => (
                            <Radio key={t} value={t} className="yg-rs-time-radio">
                              {t}
                            </Radio>
                          ))}
                        </Radio.Group>
                      )}
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </aside>
      <div ref={mapEl} className="yg-rs-map" role="application" aria-label="遥感影像地图" />
    </div>
  );
};

export default RemoteSensingPage;
