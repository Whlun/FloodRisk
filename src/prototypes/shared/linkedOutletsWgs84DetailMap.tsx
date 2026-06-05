/**
 * 责任主体详情等：在一张只读底图上展示多个关联排口 WGS84 落点（与应急详情单点地图同源样式）
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { Typography } from 'antd';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import '../应急协同/emergencyEventDetailMapLayout.css';
import {
  EMERGENCY_MAP_INCIDENT_ZOOM,
  EMERGENCY_MAPLIBRE_BASEMAP_STYLE,
  emergencyFirstSymbolLayerId,
} from '../应急协同/emergencyMapLibreStyle';

const { Text } = Typography;

const SRC_ID = 'linked-outlets-detail-points';
const LAYER_ID = 'linked-outlets-detail-circle';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type LinkedOutletMapPointInput = {
  lng: number;
  lat: number;
  title: string;
  subtitle: string;
};

/** 单击地图将 `rowIndex` 对应行的经纬度更新为落点（与 `points` 数组下标一致） */
export type LinkedOutletsWgs84PickHandler = (rowIndex: number, lng: number, lat: number) => void;

export type LinkedOutletsWgs84DetailMapProps = {
  points: LinkedOutletMapPointInput[];
  mapAriaLabel?: string;
  /**
   * 传入且 `rowIndex` 为有效下标时：单击地图任意处将该行坐标更新为落点，该行圆点高亮；
   * 不传或未选行时：保持只读（点圆点查看气泡）。
   */
  interactivePick?: { rowIndex: number; onPick: LinkedOutletsWgs84PickHandler } | null;
};

export const LinkedOutletsWgs84DetailMap: React.FC<LinkedOutletsWgs84DetailMapProps> = ({
  points,
  mapAriaLabel = '关联排口位置地图',
  interactivePick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const interactivePickRef = useRef(interactivePick);
  interactivePickRef.current = interactivePick;
  const pointsLenRef = useRef(points.length);
  pointsLenRef.current = points.length;

  const pickRow = interactivePick?.rowIndex;
  const pickRowValid = pickRow != null && pickRow >= 0 && pickRow < points.length;

  const featureCollection = useMemo(
    (): GeoJSON.FeatureCollection => ({
      type: 'FeatureCollection',
      features: points.map((p, i) => ({
        type: 'Feature',
        id: i,
        properties: { title: p.title, subtitle: p.subtitle, lng: p.lng, lat: p.lat, rowIndex: i },
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      })),
    }),
    [points],
  );

  useEffect(() => {
    if (points.length === 0) return;
    const el = containerRef.current;
    if (!el) return;

    let disposed = false;
    let map: maplibregl.Map | null = null;

    const lngs = points.map(p => p.lng);
    const lats = points.map(p => p.lat);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const pad = 0.003;

    const fitOrCenter = () => {
      if (!map || disposed || !map.isStyleLoaded()) return;
      try {
        if (points.length === 1) {
          map.jumpTo({
            center: [lngs[0], lats[0]],
            zoom: EMERGENCY_MAP_INCIDENT_ZOOM,
            pitch: 0,
            bearing: 0,
          });
        } else {
          map.fitBounds(
            [
              [minLng - pad, minLat - pad],
              [maxLng + pad, maxLat + pad],
            ],
            { padding: 56, maxZoom: 14.5, duration: 0 },
          );
        }
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
        fitOrCenter();
      });
    };

    const canLayout = () => el.clientWidth >= 48 && el.clientHeight >= 48;

    const mountMap = () => {
      if (disposed || map) return;
      if (!canLayout()) return;

      const m = new maplibregl.Map({
        container: el,
        style: EMERGENCY_MAPLIBRE_BASEMAP_STYLE,
        center: [lngs[0], lats[0]],
        zoom: EMERGENCY_MAP_INCIDENT_ZOOM,
        attributionControl: { compact: true },
      });
      map = m;

      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

      m.once('load', () => {
        if (disposed || !map) return;
        m.addSource(SRC_ID, { type: 'geojson', data: featureCollection });
        const beforeId = emergencyFirstSymbolLayerId(m);
        const pickIdx = pickRowValid ? pickRow! : -1;
        m.addLayer(
          {
            id: LAYER_ID,
            type: 'circle',
            source: SRC_ID,
            paint: pickRowValid
              ? {
                  'circle-radius': ['case', ['==', ['get', 'rowIndex'], pickIdx], 11, 7],
                  'circle-color': ['case', ['==', ['get', 'rowIndex'], pickIdx], '#fa8c16', '#1677ff'],
                  'circle-stroke-width': 2,
                  'circle-stroke-color': '#ffffff',
                }
              : {
                  'circle-radius': 7,
                  'circle-color': '#1677ff',
                  'circle-stroke-width': 2,
                  'circle-stroke-color': '#ffffff',
                },
          },
          beforeId,
        );

        const showPopupForFeature = (feat: maplibregl.MapGeoJSONFeature) => {
          const geom = feat.geometry as { type: 'Point'; coordinates: [number, number] };
          if (geom.type !== 'Point' || !Array.isArray(geom.coordinates)) return;
          const coords = geom.coordinates;
          const title = String(feat.properties?.title ?? '排口');
          const subtitle = String(feat.properties?.subtitle ?? '');
          const html = `<div style="padding:2px 0;font-size:13px;line-height:1.45;max-width:280px;"><strong>${escapeHtml(
            title,
          )}</strong><div style="margin-top:4px;color:#595959;font-size:12px;">${escapeHtml(subtitle)}</div><div style="margin-top:4px;color:#8c8c8c;font-size:11px;">${escapeHtml(
            `${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}`,
          )}</div></div>`;
          popupRef.current?.remove();
          popupRef.current = new maplibregl.Popup({ closeButton: true, maxWidth: '300px', offset: 12 })
            .setLngLat(coords)
            .setHTML(html)
            .addTo(m);
        };

        /** 选点模式：单击地图写回当前行经纬度；只读模式：点圆点看气泡 */
        m.on('click', (e: maplibregl.MapMouseEvent) => {
          const t = e.originalEvent.target as Node | null;
          const el = t instanceof Element ? t : null;
          if (el?.closest?.('.maplibregl-ctrl')) return;

          const cfg = interactivePickRef.current;
          if (cfg && typeof cfg.rowIndex === 'number' && cfg.rowIndex >= 0 && cfg.rowIndex < pointsLenRef.current) {
            const ll = e.lngLat;
            if (Number.isFinite(ll.lng) && Number.isFinite(ll.lat)) {
              cfg.onPick(cfg.rowIndex, ll.lng, ll.lat);
            }
            return;
          }

          const feats = m.queryRenderedFeatures(e.point, { layers: [LAYER_ID] });
          const f = feats[0];
          if (f) showPopupForFeature(f as maplibregl.MapGeoJSONFeature);
        });
        m.on('mouseenter', LAYER_ID, () => {
          m.getCanvas().style.cursor = 'pointer';
        });
        m.on('mouseleave', LAYER_ID, () => {
          const cfg = interactivePickRef.current;
          if (cfg && typeof cfg.rowIndex === 'number' && cfg.rowIndex >= 0) {
            m.getCanvas().style.cursor = 'crosshair';
          } else {
            m.getCanvas().style.cursor = '';
          }
        });

        if (pickRowValid) {
          m.getCanvas().style.cursor = 'crosshair';
        }

        m.resize();
        m.once('idle', () => {
          bumpResize();
          fitOrCenter();
        });
      });
    };

    const onContainerResize = () => {
      if (disposed) return;
      const src = map?.getSource(SRC_ID) as maplibregl.GeoJSONSource | undefined;
      if (src) src.setData(featureCollection);
      if (!map) mountMap();
      else bumpResize();
    };

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onContainerResize) : null;
    ro?.observe(el);

    const delays = [0, 50, 120, 280, 480, 800];
    const timers = delays.map(ms =>
      window.setTimeout(() => {
        if (disposed) return;
        const src = map?.getSource(SRC_ID) as maplibregl.GeoJSONSource | undefined;
        if (src) src.setData(featureCollection);
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
      map?.remove();
      map = null;
    };
  }, [featureCollection, points, pickRow, pickRowValid]);

  if (points.length === 0) {
    return (
      <div className="emergency-event-detail-map emergency-event-detail-map--empty">
        <Text type="secondary">暂无关联排口，或台账中排口无有效经纬度，无法在地图上展示。</Text>
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
