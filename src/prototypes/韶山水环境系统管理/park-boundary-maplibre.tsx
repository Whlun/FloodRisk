/**
 * 工业园区范围绘制：MapLibre GL JS +免 Key 底图（OpenFreeMap，参见项目 .agents/skills/maplibre-mapbox-migration、maplibre-tile-sources）。
 */
import React, { useCallback, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Button, Space, Typography } from 'antd';

const { Text } = Typography;

/** OpenFreeMap 矢量样式（与 MapLibre 技能文档一致，无需 API Key）；导出供其它原型与工业园区底图严格同源 */
export const PARK_MAPLIBRE_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
/** 与 Liberty 同源宿主（OpenFreeMap planet），浅灰极简矢量；综合态势等页可作第二套浅色底图 */
export const PARK_MAPLIBRE_STYLE_POSITRON_URL = 'https://tiles.openfreemap.org/styles/positron';
/** 同源 OpenFreeMap Bright，道路/设色对比更强，可作「驾车」类底图切换 */
export const PARK_MAPLIBRE_STYLE_BRIGHT_URL = 'https://tiles.openfreemap.org/styles/bright';
/** 韶山片区默认视野（与配置中心 · 工业园区地图一致） */
export const PARK_MAPLIBRE_DEFAULT_CENTER: [number, number] = [112.526, 27.915];
export const PARK_MAPLIBRE_DEFAULT_ZOOM = 11.2;

const BASEMAP_STYLE_URL = PARK_MAPLIBRE_STYLE_URL;
const DEFAULT_CENTER = PARK_MAPLIBRE_DEFAULT_CENTER;
const DEFAULT_ZOOM = PARK_MAPLIBRE_DEFAULT_ZOOM;

const SRC_POLY = 'park-industrial-poly';
const SRC_DRAFT = 'park-industrial-draft';
const SRC_PTS = 'park-industrial-pts';

export function parseParkPolygonGeoJson(s: string): [number, number][] {
  if (!s?.trim()) return [];
  try {
    const o = JSON.parse(s) as { type?: string; coordinates?: number[][][] };
    if (o?.type === 'Polygon' && o.coordinates?.[0]?.length) {
      const ring = o.coordinates[0];
      return ring.slice(0, -1).map((p): [number, number] => [p[0], p[1]]);
    }
  } catch {
    /* 原型容错 */
  }
  return [];
}

export function ringToGeoJson(vertices: [number, number][]): string {
  if (vertices.length < 3) return '';
  const closed: [number, number][] = [...vertices, vertices[0]];
  return JSON.stringify({ type: 'Polygon', coordinates: [closed] });
}

function polygonFeatureCollection(geoJsonStr: string): GeoJSON.FeatureCollection {
  if (!geoJsonStr?.trim()) return { type: 'FeatureCollection', features: [] };
  try {
    const o = JSON.parse(geoJsonStr) as GeoJSON.Polygon;
    if (o.type === 'Polygon' && o.coordinates?.[0]?.length) {
      return {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: {}, geometry: o }]
      };
    }
  } catch {
    /* ignore */
  }
  return { type: 'FeatureCollection', features: [] };
}

function draftLineCollection(vertices: [number, number][]): GeoJSON.FeatureCollection {
  if (vertices.length < 2) return { type: 'FeatureCollection', features: [] };
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: vertices }
      }
    ]
  };
}

function pointsCollection(vertices: [number, number][]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: vertices.map((coord, i) => ({
      type: 'Feature' as const,
      properties: { i },
      geometry: { type: 'Point' as const, coordinates: coord }
    }))
  };
}

export const ParkBoundaryMapInput: React.FC<{
  value?: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
}> = ({ value, onChange, readOnly }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const readOnlyRef = useRef(readOnly);
  readOnlyRef.current = readOnly;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const vertices = parseParkPolygonGeoJson(value || '');

  const syncSources = useCallback((map: maplibregl.Map, geoStr: string) => {
    const v = parseParkPolygonGeoJson(geoStr);
    const closed = ringToGeoJson(v);
    const poly = map.getSource(SRC_POLY) as maplibregl.GeoJSONSource | undefined;
    const draft = map.getSource(SRC_DRAFT) as maplibregl.GeoJSONSource | undefined;
    const pts = map.getSource(SRC_PTS) as maplibregl.GeoJSONSource | undefined;
    if (poly) poly.setData(polygonFeatureCollection(closed));
    if (draft) draft.setData(draftLineCollection(v));
    if (pts) pts.setData(pointsCollection(v));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const map = new maplibregl.Map({
      container: el,
      style: BASEMAP_STYLE_URL,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    const onMapClick = (e: maplibregl.MapMouseEvent) => {
      if (readOnlyRef.current) return;
      const cur = parseParkPolygonGeoJson(valueRef.current || '');
      const lng = Number(e.lngLat.lng.toFixed(6));
      const lat = Number(e.lngLat.lat.toFixed(6));
      const next: [number, number][] = [...cur, [lng, lat]];
      onChangeRef.current?.(ringToGeoJson(next));
    };

    map.on('load', () => {
      map.addSource(SRC_POLY, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: `${SRC_POLY}-fill`,
        type: 'fill',
        source: SRC_POLY,
        paint: { 'fill-color': '#1677ff', 'fill-opacity': 0.22 }
      });
      map.addLayer({
        id: `${SRC_POLY}-line`,
        type: 'line',
        source: SRC_POLY,
        paint: { 'line-color': '#1677ff', 'line-width': 2 }
      });

      map.addSource(SRC_DRAFT, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: `${SRC_DRAFT}-line`,
        type: 'line',
        source: SRC_DRAFT,
        paint: { 'line-color': '#1677ff', 'line-width': 2, 'line-dasharray': [2, 2] }
      });

      map.addSource(SRC_PTS, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: `${SRC_PTS}-circle`,
        type: 'circle',
        source: SRC_PTS,
        paint: {
          'circle-radius': 5,
          'circle-color': '#52c41a',
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff'
        }
      });

      syncSources(map, valueRef.current || '');
      map.resize();
      map.on('click', onMapClick);

      if (readOnlyRef.current) {
        map.doubleClickZoom.enable();
      } else {
        map.doubleClickZoom.disable();
        map.getCanvas().style.cursor = 'crosshair';
      }
    });

    const ro = new ResizeObserver(() => {
      map.resize();
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [syncSources]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    syncSources(map, value ?? '');
  }, [value, syncSources]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    if (readOnly) {
      map.doubleClickZoom.enable();
      map.getCanvas().style.cursor = '';
    } else {
      map.doubleClickZoom.disable();
      map.getCanvas().style.cursor = 'crosshair';
    }
  }, [readOnly]);

  return (
    <div className="park-boundary-map-wrap">
      <div className="park-boundary-map-hint">
        {readOnly
          ? '工业区域范围（只读，MapLibre + OpenFreeMap 底图）'
          : '在地图上点击依次添加边界顶点，至少三点形成闭合多边形；底图来源 OpenFreeMap（原型可换自有切片）'}
      </div>
      <div ref={containerRef} className={`park-boundary-map maplibre-park-boundary ${readOnly ? 'park-boundary-map--readonly' : ''}`} />
      {!readOnly && (
        <Space style={{ marginTop: 8 }} wrap>
          <Button size="small" onClick={() => onChange?.('')}>
            清空范围
          </Button>
          <Text type="secondary" style={{ fontSize: 12 }}>
            已选 {vertices.length} 个顶点{vertices.length >= 3 ? '（已形成多边形）' : '（尚需至少 3 点）'}
          </Text>
        </Space>
      )}
    </div>
  );
};
