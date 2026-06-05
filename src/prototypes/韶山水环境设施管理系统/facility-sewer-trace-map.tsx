/**
 * 纳管溯源示意地图：多链路管线、怀疑范围、污水厂/接驳户/监测点 POI，点击弹出提示板（突出超标发生时间）。
 */
import React, { useEffect, useMemo, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import '../应急协同/emergencyEventDetailMapLayout.css';
import {
  EMERGENCY_MAP_INCIDENT_ZOOM,
  EMERGENCY_MAP_SHAOSHAN_GOVERNMENT_CENTER,
  EMERGENCY_MAPLIBRE_BASEMAP_STYLE,
  emergencyFirstSymbolLayerId,
} from '../应急协同/emergencyMapLibreStyle';
import type { SewerTraceMapPack, SewerTracePopupBoard } from './facility-sewer-trace-demo';

const SRC_LINES = 'facility-sewer-trace-lines-src';
const SRC_DASHED = 'facility-sewer-trace-dashed-src';
const SRC_MARK = 'facility-sewer-trace-markers-src';
const L_LINE = 'facility-sewer-trace-lines-layer';
const L_DASHED = 'facility-sewer-trace-dashed-layer';
const L_CIRCLE = 'facility-sewer-trace-layer-circle';

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 排水户 / 沿线监测点共用：标题 + 地址 / 超标参数 / 发生时间 / 关联因子（超标字段支持「；关联因子：」拆分） */
function popupInnerCompactCard(p: {
  title: string;
  location?: string;
  exceedMetrics?: string;
  exceedOccurredAt?: string;
}): string {
  const raw = String(p.exceedMetrics || '');
  const [metricPart, factorPartRaw] = raw.split('；关联因子：');
  const factorPart = factorPartRaw || '';
  return `
<div class="facility-sewer-trace-popup-inner">
  <div class="facility-sewer-trace-popup-title">${escapeHtml(p.title)}</div>
  <div class="facility-sewer-trace-popup-row"><span class="k">地址</span>${escapeHtml(String(p.location || '—'))}</div>
  <div class="facility-sewer-trace-popup-row"><span class="k">超标参数</span>${escapeHtml(metricPart || '—')}</div>
  <div class="facility-sewer-trace-popup-row"><span class="k">发生时间</span>${escapeHtml(String(p.exceedOccurredAt || '—'))}</div>
  <div class="facility-sewer-trace-popup-row"><span class="k">关联因子</span>${escapeHtml(factorPart || '—')}</div>
</div>`;
}

function popupBoardHtml(p: SewerTracePopupBoard): string {
  if (p.poiKind === 'discharger') {
    return popupInnerCompactCard({
      title: p.title,
      location: p.location,
      exceedMetrics: p.exceedMetrics,
      exceedOccurredAt: p.exceedOccurredAt,
    });
  }

  if (p.poiKind === 'monitor') {
    return popupInnerCompactCard({
      title: p.title,
      location: p.location,
      exceedMetrics: p.exceedMetrics,
      exceedOccurredAt: p.exceedOccurredAt,
    });
  }

  if (p.poiKind === 'plant') {
    const raw = String(p.exceedMetrics || '');
    const metricPart = raw.split('（')[0] || raw;
    return `
<div class="facility-sewer-trace-popup-inner">
  <div class="facility-sewer-trace-popup-sub">污水厂（纳管汇水末端）</div>
  <div class="facility-sewer-trace-popup-title">${escapeHtml(p.title)}</div>
  <div class="facility-sewer-trace-popup-row"><span class="k">地址</span>${escapeHtml(String(p.location || '—'))}</div>
  <div class="facility-sewer-trace-popup-row"><span class="k">超标参数</span>${escapeHtml(metricPart || '—')}</div>
  <div class="facility-sewer-trace-popup-row"><span class="k">发生时间</span>${escapeHtml(String(p.exceedOccurredAt || '—'))}</div>
</div>`;
  }

  /* inlet_node 等兜底：保留旧版富文本结构 */
  const lines = (p.extraLines || []).map(
    t => `<div class="facility-sewer-trace-popup-row"><span class="k">补充</span>${escapeHtml(t)}</div>`,
  );
  const badgesHtml =
    p.badges && p.badges.length
      ? `<div class="facility-sewer-trace-popup-badges">${p.badges
          .map(tag => `<span class="facility-sewer-trace-popup-badge">${escapeHtml(tag)}</span>`)
          .join('')}</div>`
      : '';
  const locationHtml = p.location
    ? `<div class="facility-sewer-trace-popup-location"><span class="k">地址</span>${escapeHtml(p.location)}</div>`
    : '';
  const factsHtml =
    p.facts && p.facts.length
      ? `<div class="facility-sewer-trace-popup-facts">${p.facts
          .map(
            f =>
              `<div class="facility-sewer-trace-popup-fact"><div class="facility-sewer-trace-popup-fact-label">${escapeHtml(
                f.label,
              )}</div><div class="facility-sewer-trace-popup-fact-value">${escapeHtml(f.value)}</div></div>`,
          )
          .join('')}</div>`
      : '';
  const timeHtml = p.exceedOccurredAt
    ? `<div class="facility-sewer-trace-popup-time">超标 / 异常峰值时间：<strong>${escapeHtml(p.exceedOccurredAt)}</strong></div>`
    : '';
  return `
<div class="facility-sewer-trace-popup-inner">
  ${p.subtitle ? `<div class="facility-sewer-trace-popup-sub">${escapeHtml(p.subtitle)}</div>` : ''}
  <div class="facility-sewer-trace-popup-title">${escapeHtml(p.title)}</div>
  ${badgesHtml}
  ${locationHtml}
  ${factsHtml}
  ${p.volumeSummary ? `<div class="facility-sewer-trace-popup-row"><span class="k">总量（演示）</span>${escapeHtml(p.volumeSummary)}</div>` : ''}
  ${p.trendSituation ? `<div class="facility-sewer-trace-popup-row"><span class="k">态势（演示）</span>${escapeHtml(p.trendSituation)}</div>` : ''}
  ${p.exceedMetrics ? `<div class="facility-sewer-trace-popup-row"><span class="k">关注参数</span>${escapeHtml(p.exceedMetrics)}</div>` : ''}
  ${timeHtml}
  ${lines.join('')}
</div>`;
}

function boundsFromCoords(coords: [number, number][]): [[number, number], [number, number]] | null {
  if (!coords.length) return null;
  let minLng = coords[0][0];
  let maxLng = coords[0][0];
  let minLat = coords[0][1];
  let maxLat = coords[0][1];
  for (const [lng, lat] of coords) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

function applyChainLineHighlight(maplib: maplibregl.Map, chainId: string | null | undefined) {
  if (!maplib.getLayer(L_LINE)) return;
  if (chainId) {
    maplib.setPaintProperty(L_LINE, 'line-width', ['case', ['==', ['get', 'chainId'], chainId], 6, 3]);
    maplib.setPaintProperty(L_LINE, 'line-opacity', ['case', ['==', ['get', 'chainId'], chainId], 1, 0.35]);
    maplib.setPaintProperty(L_LINE, 'line-color', ['case', ['==', ['get', 'chainId'], chainId], '#1d39c4', '#1677ff']);
    if (maplib.getLayer(L_DASHED)) {
      maplib.setPaintProperty(L_DASHED, 'line-width', ['case', ['==', ['get', 'chainId'], chainId], 3, 2]);
      maplib.setPaintProperty(L_DASHED, 'line-opacity', ['case', ['==', ['get', 'chainId'], chainId], 0.95, 0.35]);
      maplib.setPaintProperty(L_DASHED, 'line-color', ['case', ['==', ['get', 'chainId'], chainId], '#1d39c4', '#1677ff']);
    }
  } else {
    maplib.setPaintProperty(L_LINE, 'line-width', 4);
    maplib.setPaintProperty(L_LINE, 'line-opacity', 0.88);
    maplib.setPaintProperty(L_LINE, 'line-color', '#1677ff');
    if (maplib.getLayer(L_DASHED)) {
      maplib.setPaintProperty(L_DASHED, 'line-width', 2);
      maplib.setPaintProperty(L_DASHED, 'line-opacity', 0.86);
      maplib.setPaintProperty(L_DASHED, 'line-color', '#1677ff');
    }
  }

  // 左侧链路数据联动：选中链路时只显示该链路的“沿线水质监测点”，其余链路监测点透明隐藏
  if (maplib.getLayer(L_CIRCLE)) {
    if (chainId) {
      maplib.setPaintProperty(
        L_CIRCLE,
        'circle-opacity',
        [
          'case',
          ['==', ['get', 'kind'], 'monitor'],
          ['case', ['==', ['get', 'chainId'], chainId], 1, 0],
          ['==', ['get', 'kind'], 'discharger'],
          ['case', ['==', ['get', 'chainId'], chainId], 1, 0.25],
          ['==', ['get', 'kind'], 'plant'],
          1,
          1,
        ],
      );
    } else {
      maplib.setPaintProperty(L_CIRCLE, 'circle-opacity', 1);
    }
  }
}

export const FacilitySewerTraceMap: React.FC<{
  pack: SewerTraceMapPack;
  /** 高亮该条链路，其余链路半透明 */
  selectedChainId?: string | null;
  /** 切换链路时自动弹出对应 POI 提示板 */
  autoOpenMarkerId?: string | null;
  mapAriaLabel?: string;
}> = ({ pack, selectedChainId, autoOpenMarkerId, mapAriaLabel = '纳管溯源示意地图' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const mapLibRef = useRef<maplibregl.Map | null>(null);

  const geojson = useMemo(() => {
    const lineFeatures = pack.chainLines
      .filter(c => c.coordinates.length >= 2)
      .map(c => ({
        type: 'Feature' as const,
        properties: { chainId: c.chainId, color: '#1677ff' },
        geometry: { type: 'LineString' as const, coordinates: c.coordinates },
      }));
    const lineFc: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: lineFeatures };

    const ptsFc: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: pack.markers.map(m => ({
        type: 'Feature' as const,
        properties: {
          markerId: m.markerId,
          title: m.title,
          kind: m.kind,
          chainId: m.chainId ?? null,
          popupJson: JSON.stringify(m.popup),
        },
        geometry: { type: 'Point' as const, coordinates: [m.lng, m.lat] },
      })),
    };
    return { lineFc, ptsFc };
  }, [pack]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let disposed = false;
    let map: maplibregl.Map | null = null;

    const allCoords: [number, number][] = [];
    for (const c of pack.chainLines) allCoords.push(...c.coordinates);
    allCoords.push(...pack.suspicionRing.map(([a, b]) => [a, b] as [number, number]));
    if (pack.plant) allCoords.push([pack.plant.lng, pack.plant.lat]);
    for (const m of pack.markers) allCoords.push([m.lng, m.lat]);

    const b = boundsFromCoords(allCoords);
    const center: [number, number] = b
      ? [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2]
      : EMERGENCY_MAP_SHAOSHAN_GOVERNMENT_CENTER;

    const mount = () => {
      if (disposed || map || el.clientWidth < 48 || el.clientHeight < 48) return;
      const m = new maplibregl.Map({
        container: el,
        style: EMERGENCY_MAPLIBRE_BASEMAP_STYLE,
        center,
        zoom: EMERGENCY_MAP_INCIDENT_ZOOM,
        attributionControl: { compact: true },
      });
      map = m;
      mapLibRef.current = m;
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

      m.once('load', () => {
        if (disposed || !map) return;
        const beforeId = emergencyFirstSymbolLayerId(m);

        m.addSource(SRC_LINES, { type: 'geojson', data: geojson.lineFc });
        if (geojson.lineFc.features.length) {
          m.addLayer(
            {
              id: L_LINE,
              type: 'line',
              source: SRC_LINES,
              layout: { 'line-cap': 'round', 'line-join': 'round' },
              paint: {
                'line-color': '#1677ff',
                'line-width': 4,
                'line-opacity': 0.88,
              },
            },
            beforeId,
          );
          applyChainLineHighlight(m, selectedChainId ?? null);
        }

        m.addSource(SRC_MARK, { type: 'geojson', data: geojson.ptsFc });
        m.addLayer(
          {
            id: L_CIRCLE,
            type: 'circle',
            source: SRC_MARK,
            paint: {
              'circle-radius': [
                'match',
                ['get', 'kind'],
                'plant',
                14,
                'discharger',
                11,
                'monitor',
                9,
                'inlet',
                10,
                8,
              ],
              'circle-color': [
                'match',
                ['get', 'kind'],
                'plant',
                '#531dab',
                'discharger',
                '#fa541c',
                'monitor',
                '#52c41a',
                'inlet',
                '#1677ff',
                '#8c8c8c',
              ],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
            },
          },
          beforeId,
        );

        // 现在已添加点图层，可立即应用选中链路的点位显示联动（用于“地图与左侧数据对齐”）
        applyChainLineHighlight(m, selectedChainId ?? null);

        const openPopup = (lng: number, lat: number, html: string) => {
          popupRef.current?.remove();
          const pu = new maplibregl.Popup({ closeButton: true, maxWidth: '320px' })
            .setLngLat([lng, lat])
            .setHTML(html)
            .addTo(m);
          popupRef.current = pu;
        };

        m.on('click', L_CIRCLE, e => {
          const f = e.features?.[0];
          if (!f?.geometry || f.geometry.type !== 'Point') return;
          const [lng, lat] = f.geometry.coordinates as [number, number];
          const raw = f.properties?.popupJson;
          if (!raw || typeof raw !== 'string') return;
          try {
            const board = JSON.parse(raw) as SewerTracePopupBoard;
            openPopup(lng, lat, popupBoardHtml(board));
          } catch {
            /* 忽略 */
          }
        });
        m.on('mouseenter', L_CIRCLE, () => {
          m.getCanvas().style.cursor = 'pointer';
        });
        m.on('mouseleave', L_CIRCLE, () => {
          m.getCanvas().style.cursor = '';
        });

        if (autoOpenMarkerId) {
          const target = pack.markers.find(x => x.markerId === autoOpenMarkerId);
          if (target) {
            openPopup(target.lng, target.lat, popupBoardHtml(target.popup));
          }
        }

        if (b) {
          try {
            m.fitBounds(b as maplibregl.LngLatBoundsLike, { padding: 52, maxZoom: 15.5, duration: 0 });
          } catch {
            /* 忽略 */
          }
        }

        m.resize();
      });
    };

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => map?.resize()) : null;
    ro?.observe(el);
    mount();
    requestAnimationFrame(() => mount());

    return () => {
      disposed = true;
      ro?.disconnect();
      popupRef.current?.remove();
      popupRef.current = null;
      mapLibRef.current = null;
      map?.remove();
      map = null;
    };
    // 仅当溯源数据（geojson）变化时重建地图；切换链路只改 selectedChainId / autoOpenMarkerId，不应整图刷新
  }, [geojson]);

  useEffect(() => {
    const m = mapLibRef.current;
    if (m) applyChainLineHighlight(m, selectedChainId ?? null);
  }, [selectedChainId]);

  useEffect(() => {
    const m = mapLibRef.current;
    if (!m || !autoOpenMarkerId) return;
    const target = pack.markers.find(x => x.markerId === autoOpenMarkerId);
    if (!target) return;
    popupRef.current?.remove();
    const pu = new maplibregl.Popup({ closeButton: true, maxWidth: '320px' })
      .setLngLat([target.lng, target.lat])
      .setHTML(popupBoardHtml(target.popup))
      .addTo(m);
    popupRef.current = pu;
  }, [autoOpenMarkerId, pack.markers]);

  return (
    <div className="facility-sewer-trace-map-shell">
      <div
        ref={containerRef}
        className="facility-sewer-trace-map maplibre-emergency-event maplibre-park-boundary-emergency"
        role="img"
        aria-label={mapAriaLabel}
      />
    </div>
  );
};
