/**
 * 地块详情 · 图形 Tab（MapLibre 只读，对齐工业园区 / 应急事发位置地图）
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { Button, Typography } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  boundsCenter,
  boundsToPolygonFeature,
  HZ_PARCEL_MAP_FALLBACK_CENTER,
  HZ_PARCEL_MAP_FALLBACK_ZOOM,
  HZ_PARCEL_MAP_STYLE_URL,
  resolveParcelViewBounds,
} from '../parcelGeoMap';
import type { CmPhaseAccentKey } from '../cmPhaseAccent';
import { getCmPhaseMapPaint } from '../cmPhaseMapColors';
import type { ParcelLifecycle } from '../types';

const { Text } = Typography;

const SRC_PARCEL = 'hz-lifecycle-parcel-geo';
const LYR_PARCEL_FILL = `${SRC_PARCEL}-fill`;
const LYR_PARCEL_LINE = `${SRC_PARCEL}-line`;

export type ParcelMatterGeoMapProps = {
  parcel: ParcelLifecycle;
  /** 地块填色/描边与左栏阶段主题色一致 */
  phaseKey: CmPhaseAccentKey;
  /** 优先于 mapBounds 的真实地块面（由空间/建管地图模块注入，避免循环依赖） */
  landuseFeature?: GeoJSON.Feature | null;
  onLocateOnMap?: (parcel: ParcelLifecycle) => void;
};

export const ParcelMatterGeoMap: React.FC<ParcelMatterGeoMapProps> = ({
  parcel,
  phaseKey,
  landuseFeature,
  onLocateOnMap,
}) => {
  const mapPaint = useMemo(() => getCmPhaseMapPaint(phaseKey), [phaseKey]);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const mapBounds = useMemo(
    () => (parcel.mapBounds?.length === 2 ? parcel.mapBounds : null),
    [parcel.mapBounds],
  );
  const displayFeature = useMemo(() => {
    if (landuseFeature?.geometry) return landuseFeature;
    if (mapBounds) return boundsToPolygonFeature(mapBounds);
    return null;
  }, [landuseFeature, mapBounds]);
  const viewBounds = useMemo(
    () => resolveParcelViewBounds(parcel, displayFeature),
    [parcel, displayFeature],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let disposed = false;
    let map: maplibregl.Map | null = null;

    const canLayout = () => el.clientWidth >= 48 && el.clientHeight >= 48;

    const bumpResize = () => {
      if (!map || disposed) return;
      map.resize();
      requestAnimationFrame(() => {
        if (!map || disposed) return;
        map.resize();
        if (viewBounds) {
          map.fitBounds(viewBounds, { padding: 48, maxZoom: 16, duration: 0 });
        }
      });
    };

    const mountMap = () => {
      if (disposed || map || !canLayout()) return;

      const center = viewBounds ? boundsCenter(viewBounds) : HZ_PARCEL_MAP_FALLBACK_CENTER;
      const zoom = viewBounds ? 12 : HZ_PARCEL_MAP_FALLBACK_ZOOM;

      const m = new maplibregl.Map({
        container: el,
        style: HZ_PARCEL_MAP_STYLE_URL,
        center,
        zoom,
        attributionControl: { compact: true },
      });
      map = m;
      mapRef.current = m;

      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

      m.once('load', () => {
        if (disposed || !map) return;
        const fc: GeoJSON.FeatureCollection = displayFeature
          ? { type: 'FeatureCollection', features: [displayFeature] }
          : { type: 'FeatureCollection', features: [] };

        m.addSource(SRC_PARCEL, { type: 'geojson', data: fc });
        m.addLayer({
          id: LYR_PARCEL_FILL,
          type: 'fill',
          source: SRC_PARCEL,
          paint: {
            'fill-color': mapPaint.fillColor,
            'fill-opacity': mapPaint.fillOpacity,
          },
        });
        m.addLayer({
          id: LYR_PARCEL_LINE,
          type: 'line',
          source: SRC_PARCEL,
          paint: { 'line-color': mapPaint.lineColor, 'line-width': 2.5 },
        });

        if (viewBounds) {
          m.fitBounds(viewBounds, { padding: 48, maxZoom: 16, duration: 0 });
        }
        bumpResize();
      });
    };

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => mountMap()) : null;
    ro?.observe(el);
    mountMap();
    const t = window.setTimeout(bumpResize, 120);

    return () => {
      disposed = true;
      window.clearTimeout(t);
      ro?.disconnect();
      map?.remove();
      mapRef.current = null;
    };
  }, [viewBounds, displayFeature]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    if (!map.getLayer(LYR_PARCEL_FILL)) return;
    map.setPaintProperty(LYR_PARCEL_FILL, 'fill-color', mapPaint.fillColor);
    map.setPaintProperty(LYR_PARCEL_FILL, 'fill-opacity', mapPaint.fillOpacity);
    map.setPaintProperty(LYR_PARCEL_LINE, 'line-color', mapPaint.lineColor);
  }, [mapPaint]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    const src = map.getSource(SRC_PARCEL) as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    const fc: GeoJSON.FeatureCollection = displayFeature
      ? { type: 'FeatureCollection', features: [displayFeature] }
      : { type: 'FeatureCollection', features: [] };
    src.setData(fc);
    if (viewBounds) {
      map.fitBounds(viewBounds, { padding: 48, maxZoom: 16, duration: 300 });
    }
  }, [displayFeature, viewBounds]);

  if (!displayFeature) {
    return (
      <div className="hz-lifecycle-detail__geo-empty">
        <Text type="secondary">暂无地块范围数据，无法在地图上展示图形。</Text>
        {onLocateOnMap && (
          <Button type="link" size="small" icon={<EnvironmentOutlined />} onClick={() => onLocateOnMap(parcel)}>
            尝试在主地图定位
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="hz-lifecycle-detail__geo">
      <div className="hz-lifecycle-detail__geo-map-shell">
        <div
          ref={containerRef}
          className="hz-lifecycle-detail__geo-map maplibre-hz-parcel-geo"
          role="img"
          aria-label="地块范围地图"
        />
      </div>
    </div>
  );
};
