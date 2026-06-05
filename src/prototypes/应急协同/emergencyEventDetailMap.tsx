/**
 * 应急事件详情 · 事发位置地图（只读）
 *
 * **底图**：与工业园区同源 **OpenFreeMap Liberty**（`EMERGENCY_MAPLIBRE_BASEMAP_STYLE` = `PARK_MAPLIBRE_STYLE_URL`）；**中心**与园区导出常量一致。
 * **紧凑署名**（栅格版权）；GeoJSON 圆点 + **图钉 #1677ff** + **Popup**；**默认/resize 后** `jumpTo` 使标记点**居中**。
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { Typography } from 'antd';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './emergencyEventDetailMapLayout.css';
import {
  EMERGENCY_MAP_INCIDENT_ZOOM,
  EMERGENCY_MAPLIBRE_BASEMAP_STYLE,
  emergencyFirstSymbolLayerId,
} from './emergencyMapLibreStyle';

const { Text } = Typography;

const SRC_POINT = 'emergency-event-detail-point';
const LAYER_CIRCLE = 'emergency-event-detail-circle';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 解析 WGS84 经纬度字符串，非法则返回 null（详情地图与编辑地图共用） */
export function parseEmergencyEventLngLat(longitude: string, latitude: string): [number, number] | null {
  const lng = parseFloat(String(longitude ?? '').trim());
  const lat = parseFloat(String(latitude ?? '').trim());
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return null;
  return [lng, lat];
}

export interface EmergencyEventDetailMapProps {
  longitude: string;
  latitude: string;
  eventTitle: string;
  location?: string;
  /** 无障碍标签，默认「事发位置地图」 */
  mapAriaLabel?: string;
}

export const EmergencyEventDetailMap: React.FC<EmergencyEventDetailMapProps> = ({
  longitude,
  latitude,
  eventTitle,
  location,
  mapAriaLabel = '事发位置地图',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  const coords = useMemo(() => parseEmergencyEventLngLat(longitude, latitude), [longitude, latitude]);

  useEffect(() => {
    if (!coords) return;
    const el = containerRef.current;
    if (!el) return;

    let disposed = false;
    let map: maplibregl.Map | null = null;

    const featureCollection: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'Point', coordinates: coords },
        },
      ],
    };

    const subtitle = (location || '事发位置').trim() || '事发位置';
    const html = `<div style="padding:2px 0;font-size:13px;line-height:1.45;max-width:240px;"><strong>${escapeHtml(
      eventTitle || '应急事件',
    )}</strong><div style="margin-top:4px;color:#595959;font-size:12px;">${escapeHtml(subtitle)}</div><div style="margin-top:4px;color:#8c8c8c;font-size:11px;">${escapeHtml(
      `${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}`,
    )}</div></div>`;

    const canLayout = () => el.clientWidth >= 48 && el.clientHeight >= 48;

    /** 视口以标记点为中心（Modal 尺寸变化后重复对齐） */
    const centerOnMarker = () => {
      if (!map || disposed || !map.isStyleLoaded()) return;
      try {
        map.jumpTo({ center: coords, zoom: EMERGENCY_MAP_INCIDENT_ZOOM, pitch: 0, bearing: 0 });
      } catch {
        /* 忽略 */
      }
    };

    const bumpResize = () => {
      if (!map || disposed) return;
      map.resize();
      requestAnimationFrame(() => {
        if (!map || disposed) return;
        map.resize();
        centerOnMarker();
      });
    };

    const mountMap = () => {
      if (disposed || map) return;
      if (!canLayout()) return;

      const m = new maplibregl.Map({
        container: el,
        style: EMERGENCY_MAPLIBRE_BASEMAP_STYLE,
        center: coords,
        zoom: EMERGENCY_MAP_INCIDENT_ZOOM,
        attributionControl: { compact: true },
      });
      map = m;

      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

      m.once('load', () => {
        if (disposed || !map) return;
        m.addSource(SRC_POINT, { type: 'geojson', data: featureCollection });
        const beforeId = emergencyFirstSymbolLayerId(m);
        m.addLayer(
          {
            id: LAYER_CIRCLE,
            type: 'circle',
            source: SRC_POINT,
            paint: {
              'circle-radius': 6,
              'circle-color': '#1677ff',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
            },
          },
          beforeId,
        );
        markerRef.current = new maplibregl.Marker({
          color: '#1677ff',
          scale: 1.12,
          anchor: 'bottom',
        })
          .setLngLat(coords)
          .addTo(map);
        popupRef.current = new maplibregl.Popup({ closeButton: true, maxWidth: '280px', offset: 18 })
          .setLngLat(coords)
          .setHTML(html)
          .addTo(map);
        map.resize();
        m.once('idle', () => {
          bumpResize();
          centerOnMarker();
        });
      });
    };

    const onContainerResize = () => {
      if (disposed) return;
      if (!map) mountMap();
      else bumpResize();
    };

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onContainerResize) : null;
    ro?.observe(el);

    const delays = [0, 50, 120, 280, 480, 800];
    const timers = delays.map(ms =>
      window.setTimeout(() => {
        if (disposed) return;
        mountMap();
        bumpResize();
      }, ms),
    );

    requestAnimationFrame(() => {
      if (disposed) return;
      mountMap();
      bumpResize();
    });

    return () => {
      disposed = true;
      timers.forEach(t => window.clearTimeout(t));
      ro?.disconnect();
      popupRef.current?.remove();
      popupRef.current = null;
      markerRef.current?.remove();
      markerRef.current = null;
      map?.remove();
      map = null;
    };
  }, [coords, eventTitle, location]);

  if (!coords) {
    return (
      <div className="emergency-event-detail-map emergency-event-detail-map--empty">
        <Text type="secondary">未填写有效事发经纬度，无法在地图上展示位置。</Text>
      </div>
    );
  }

  return (
    <div className="emergency-event-detail-map-shell">
      <div
        ref={containerRef}
        className="emergency-event-detail-map maplibre-emergency-event maplibre-park-boundary-emergency"
        role="img"
        aria-label={mapAriaLabel}
      />
    </div>
  );
};
