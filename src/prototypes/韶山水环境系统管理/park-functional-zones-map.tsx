/**
 * 工业园区功能分区：地图每完成一个闭合面后选择分区类型并入库；多面叠加展示（MapLibre）。
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { BorderOutlined, CheckCircleOutlined, DeleteOutlined, FullscreenOutlined } from '@ant-design/icons';
import { Alert, Button, Modal, Space, Steps, Typography, Tag } from 'antd';
import { parseParkPolygonGeoJson, ringToGeoJson } from './park-boundary-maplibre';
import type { ParkFunctionalZone } from './config-center-data';
import {
  PARK_FUNCTIONAL_ZONE_PALETTE,
  PARK_LINKED_ENTERPRISE_OPTIONS,
  getParkFunctionalZonePalette,
  parkZoneFillColorMatchExpr,
  parkZoneStrokeColorMatchExpr
} from './config-center-data';

const { Text } = Typography;

const BASEMAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const DEFAULT_CENTER: [number, number] = [112.526, 27.915];
const DEFAULT_ZOOM = 11.2;

const SRC_COMMIT = 'park-fz-committed';
const SRC_DRAFT_POLY = 'park-fz-draft-poly';
const SRC_DRAFT_LINE = 'park-fz-draft-line';
const SRC_DRAFT_PTS = 'park-fz-draft-pts';
const SRC_ENTERPRISES = 'park-fz-enterprises';

const DRAFT_NEUTRAL_FILL = '#64748b';

function genZoneId() {
  return `FZ-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function committedFeatureCollection(zones: ParkFunctionalZone[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const z of zones) {
    try {
      const g = JSON.parse(z.boundaryGeoJson) as GeoJSON.Polygon;
      if (g?.type === 'Polygon' && g.coordinates?.[0]?.length) {
        features.push({
          type: 'Feature',
          properties: { id: z.id, zoneType: z.zoneType },
          geometry: g
        });
      }
    } catch {
      /* 跳过无效几何 */
    }
  }
  return { type: 'FeatureCollection', features };
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

function expandRingBounds(
  ring: number[][],
  expand: (lng: number, lat: number) => void
) {
  for (const p of ring) {
    expand(p[0], p[1]);
  }
}

/** 功能分区多边形边界框 */
function bboxFromZones(zones: ParkFunctionalZone[]): maplibregl.LngLatBoundsLike | null {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  let has = false;
  const expand = (lng: number, lat: number) => {
    has = true;
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  };
  for (const z of zones) {
    try {
      const o = JSON.parse(z.boundaryGeoJson) as GeoJSON.Polygon;
      const ring = o?.coordinates?.[0];
      if (!ring) continue;
      expandRingBounds(ring, expand);
    } catch {
      /* skip */
    }
  }
  if (!has) return null;
  return [
    [minLng, minLat],
    [maxLng, maxLat]
  ];
}

/** 分区 + 详情中配置的关联企业点位，一并用于 fitBounds */
function bboxFromZonesAndEnterprises(
  zones: ParkFunctionalZone[],
  enterpriseIds: string[] | undefined
): maplibregl.LngLatBoundsLike | null {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  let has = false;
  const expand = (lng: number, lat: number) => {
    has = true;
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  };
  for (const z of zones) {
    try {
      const o = JSON.parse(z.boundaryGeoJson) as GeoJSON.Polygon;
      const ring = o?.coordinates?.[0];
      if (!ring) continue;
      expandRingBounds(ring, expand);
    } catch {
      /* skip */
    }
  }
  const idSet = new Set(enterpriseIds || []);
  for (const e of PARK_LINKED_ENTERPRISE_OPTIONS) {
    if (idSet.has(e.id)) expand(e.lng, e.lat);
  }
  if (!has) return null;
  return [
    [minLng, minLat],
    [maxLng, maxLat]
  ];
}

function enterpriseFeatureCollection(ids: string[] | undefined): GeoJSON.FeatureCollection {
  const idSet = new Set(ids || []);
  const features: GeoJSON.Feature[] = [];
  for (const e of PARK_LINKED_ENTERPRISE_OPTIONS) {
    if (!idSet.has(e.id)) continue;
    features.push({
      type: 'Feature',
      properties: { id: e.id, name: e.name, industry: e.industry },
      geometry: { type: 'Point', coordinates: [e.lng, e.lat] }
    });
  }
  return { type: 'FeatureCollection', features };
}

export const ParkFunctionalZonesMapInput: React.FC<{
  value?: ParkFunctionalZone[];
  onChange?: (v: ParkFunctionalZone[]) => void;
  readOnly?: boolean;
  /** 详情只读：在地图上绘制关联企业点位（与 `PARK_LINKED_ENTERPRISE_OPTIONS` 对齐） */
  linkedEnterpriseIds?: string[];
}> = ({ value = [], onChange, readOnly, linkedEnterpriseIds }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readOnlyRef = useRef(readOnly);
  readOnlyRef.current = readOnly;
  const valueRef = useRef(value);
  valueRef.current = value;
  const linkedEnterpriseIdsRef = useRef(linkedEnterpriseIds);
  linkedEnterpriseIdsRef.current = linkedEnterpriseIds;
  const enterprisePopupRef = useRef<maplibregl.Popup | null>(null);

  const [draftVertices, setDraftVertices] = useState<[number, number][]>([]);
  const [pendingZoneType, setPendingZoneType] = useState<string | undefined>(undefined);
  const step2Ref = useRef<HTMLDivElement>(null);
  const prevDraftReadyRef = useRef(false);

  const syncCommitted = useCallback((map: maplibregl.Map, zones: ParkFunctionalZone[]) => {
    const src = map.getSource(SRC_COMMIT) as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(committedFeatureCollection(zones));
  }, []);

  const syncEnterprises = useCallback((map: maplibregl.Map, ids: string[] | undefined) => {
    const src = map.getSource(SRC_ENTERPRISES) as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(enterpriseFeatureCollection(ids));
  }, []);

  const syncDraft = useCallback((map: maplibregl.Map, vertices: [number, number][]) => {
    const closed = ringToGeoJson(vertices);
    const poly = map.getSource(SRC_DRAFT_POLY) as maplibregl.GeoJSONSource | undefined;
    const line = map.getSource(SRC_DRAFT_LINE) as maplibregl.GeoJSONSource | undefined;
    const pts = map.getSource(SRC_DRAFT_PTS) as maplibregl.GeoJSONSource | undefined;
    if (poly) poly.setData(polygonFeatureCollection(closed));
    if (line) line.setData(draftLineCollection(vertices));
    if (pts) pts.setData(pointsCollection(vertices));
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

    const onClick = (e: maplibregl.MapMouseEvent) => {
      if (readOnlyRef.current) return;
      const lng = Number(e.lngLat.lng.toFixed(6));
      const lat = Number(e.lngLat.lat.toFixed(6));
      setDraftVertices(prev => [...prev, [lng, lat]]);
    };

    map.on('load', () => {
      map.addSource(SRC_COMMIT, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: `${SRC_COMMIT}-fill`,
        type: 'fill',
        source: SRC_COMMIT,
        paint: { 'fill-color': parkZoneFillColorMatchExpr() as never, 'fill-opacity': 0.38 }
      });
      map.addLayer({
        id: `${SRC_COMMIT}-line`,
        type: 'line',
        source: SRC_COMMIT,
        paint: {
          'line-color': parkZoneStrokeColorMatchExpr() as never,
          'line-width': 2,
          'line-opacity': 0.95
        }
      });

      map.addSource(SRC_ENTERPRISES, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: `${SRC_ENTERPRISES}-circle`,
        type: 'circle',
        source: SRC_ENTERPRISES,
        paint: {
          'circle-radius': 9,
          'circle-color': '#16a34a',
          'circle-opacity': 0.92,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });

      map.addSource(SRC_DRAFT_POLY, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: `${SRC_DRAFT_POLY}-fill`,
        type: 'fill',
        source: SRC_DRAFT_POLY,
        paint: { 'fill-color': '#1677ff', 'fill-opacity': 0.15 }
      });
      map.addLayer({
        id: `${SRC_DRAFT_POLY}-line`,
        type: 'line',
        source: SRC_DRAFT_POLY,
        paint: { 'line-color': '#1677ff', 'line-width': 2 }
      });

      map.addSource(SRC_DRAFT_LINE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: `${SRC_DRAFT_LINE}-dash`,
        type: 'line',
        source: SRC_DRAFT_LINE,
        paint: { 'line-color': '#1677ff', 'line-width': 2, 'line-dasharray': [2, 2] }
      });

      map.addSource(SRC_DRAFT_PTS, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: `${SRC_DRAFT_PTS}-circle`,
        type: 'circle',
        source: SRC_DRAFT_PTS,
        paint: {
          'circle-radius': 5,
          'circle-color': '#52c41a',
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff'
        }
      });

      syncCommitted(map, valueRef.current);
      syncEnterprises(map, linkedEnterpriseIdsRef.current);
      syncDraft(map, []);
      map.resize();
      map.on('click', onClick);

      const zones = valueRef.current || [];
      const b = bboxFromZonesAndEnterprises(zones, linkedEnterpriseIdsRef.current);
      if (b) {
        map.fitBounds(b, { padding: 48, maxZoom: 14, duration: 0 });
      }

      const entLayerId = `${SRC_ENTERPRISES}-circle`;
      map.on('click', entLayerId, e => {
        if (!readOnlyRef.current) return;
        const f = e.features?.[0];
        const name = f?.properties && typeof f.properties['name'] === 'string' ? f.properties['name'] : '';
        const industry =
          f?.properties && typeof f.properties['industry'] === 'string' ? f.properties['industry'] : '';
        if (!name) return;
        enterprisePopupRef.current?.remove();
        enterprisePopupRef.current = new maplibregl.Popup({ closeButton: true, maxWidth: '280px' })
          .setLngLat(e.lngLat)
          .setHTML(
            `<div class="park-fz-ent-popup"><strong>${name}</strong>${industry ? `<div class="park-fz-ent-popup-sub">${industry}</div>` : ''}</div>`
          )
          .addTo(map);
      });
      map.on('mouseenter', entLayerId, () => {
        if (readOnlyRef.current) map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', entLayerId, () => {
        map.getCanvas().style.cursor = readOnlyRef.current ? '' : 'crosshair';
      });

      if (readOnlyRef.current) {
        map.doubleClickZoom.enable();
        map.getCanvas().style.cursor = '';
      } else {
        map.doubleClickZoom.disable();
        map.getCanvas().style.cursor = 'crosshair';
      }
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(el);

    return () => {
      enterprisePopupRef.current?.remove();
      enterprisePopupRef.current = null;
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [syncCommitted, syncDraft, syncEnterprises]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    syncCommitted(map, value);
  }, [value, syncCommitted]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    if (readOnly) {
      syncDraft(map, []);
      return;
    }
    syncDraft(map, draftVertices);
  }, [draftVertices, readOnly, syncDraft]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    syncEnterprises(map, linkedEnterpriseIds);
    if (readOnly) {
      map.doubleClickZoom.enable();
      map.getCanvas().style.cursor = '';
      const b = bboxFromZonesAndEnterprises(value, linkedEnterpriseIds);
      if (b) map.fitBounds(b, { padding: 48, maxZoom: 14, duration: 600 });
    } else {
      map.doubleClickZoom.disable();
      map.getCanvas().style.cursor = 'crosshair';
    }
  }, [readOnly, value, linkedEnterpriseIds, syncEnterprises]);

  /** 当前绘制多边形预览色：与已选分区类型一致，未选时为中性灰 */
  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded() || readOnly) return;
    const pal = pendingZoneType ? getParkFunctionalZonePalette(pendingZoneType) : undefined;
    const fill = pal?.fill ?? DRAFT_NEUTRAL_FILL;
    const stroke = pal?.stroke ?? DRAFT_NEUTRAL_FILL;
    const fillLayer = `${SRC_DRAFT_POLY}-fill`;
    const lineLayer = `${SRC_DRAFT_POLY}-line`;
    const dashLayer = `${SRC_DRAFT_LINE}-dash`;
    if (map.getLayer(fillLayer)) {
      map.setPaintProperty(fillLayer, 'fill-color', fill);
      map.setPaintProperty(fillLayer, 'fill-opacity', pal ? 0.3 : 0.14);
    }
    if (map.getLayer(lineLayer)) {
      map.setPaintProperty(lineLayer, 'line-color', stroke);
    }
    if (map.getLayer(dashLayer)) {
      map.setPaintProperty(dashLayer, 'line-color', stroke);
    }
  }, [pendingZoneType, readOnly]);

  /** 面闭合后自动滚到「选择类型」区域，减少来回找控件 */
  useEffect(() => {
    const ready = draftVertices.length >= 3;
    if (ready && !prevDraftReadyRef.current) {
      requestAnimationFrame(() => {
        step2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
    prevDraftReadyRef.current = ready;
  }, [draftVertices.length]);

  const addCurrentDraft = () => {
    if (!pendingZoneType || draftVertices.length < 3) return;
    const gj = ringToGeoJson(draftVertices);
    if (!gj) return;
    const next: ParkFunctionalZone[] = [...value, { id: genZoneId(), zoneType: pendingZoneType, boundaryGeoJson: gj }];
    onChange?.(next);
    setDraftVertices([]);
    setPendingZoneType(undefined);
  };

  const removeZone = (id: string) => {
    onChange?.(value.filter(z => z.id !== id));
  };

  const clearDraft = () => setDraftVertices([]);

  const draftPts = draftVertices.length;
  const draftReady = draftPts >= 3;

  const toggleZoneType = (t: string) => {
    setPendingZoneType(prev => (prev === t ? undefined : t));
  };

  /** 详情只读：地图铺满容器，图例叠在右下角 */
  if (readOnly) {
    return (
      <div className="park-boundary-map-wrap park-fz-root park-fz-root--readonly">
        <div className="park-fz-map-stage park-fz-map-stage--readonly">
          <div className="park-fz-map-shell">
            <div
              ref={containerRef}
              className="park-boundary-map maplibre-park-boundary park-boundary-map--readonly"
            />
          </div>
          <div className="park-fz-legend-overlay" aria-label="分区图例">
            <span className="park-fz-legend-overlay-title">分区图例</span>
            <div className="park-fz-legend-overlay-list">
              {PARK_FUNCTIONAL_ZONE_PALETTE.map(p => (
                <div key={p.value} className="park-fz-legend-overlay-row">
                  <span className="park-fz-swatch" style={{ background: p.fill, borderColor: p.stroke }} />
                  <span className="park-fz-legend-name">{p.label}</span>
                </div>
              ))}
            </div>
            {(linkedEnterpriseIds?.length ?? 0) > 0 && (
              <>
                <span className="park-fz-legend-overlay-title park-fz-legend-overlay-title--sub">关联企业</span>
                <div className="park-fz-legend-overlay-list">
                  <div className="park-fz-legend-overlay-row">
                    <span className="park-fz-legend-dot park-fz-legend-dot--enterprise" aria-hidden />
                    <span className="park-fz-legend-name">绿色圆点 · 点击看名称</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  /** 编辑：左侧操作栏 + 右侧全高地图（全屏弹窗内不滚动整页） */
  return (
    <div className="park-boundary-map-wrap park-fz-root park-fz-root--editor">
      <div className="park-fz-editor-layout">
        <aside className="park-fz-sidebar">
          <div className="park-fz-sidebar-scroll">
            <div className="park-fz-intro park-fz-intro--compact">
              <div className="park-fz-intro-title">
                <BorderOutlined className="park-fz-intro-icon" aria-hidden />
                操作说明
              </div>
              <ol className="park-fz-intro-steps">
                <li>
                  右侧地图<strong>点击</strong>加点（≥3）成面；可先选类型或后选。
                </li>
                <li>误点用「清空当前绘制」；底部固定按钮保存每一块。</li>
              </ol>
            </div>
            <Steps
              size="small"
              className="park-fz-steps park-fz-steps--compact"
              current={draftReady ? 1 : 0}
              items={[
                { title: '绘制', description: '地图加点' },
                { title: '类型', description: '色块+保存' }
              ]}
            />

            <div className="park-fz-actions park-fz-actions--sidebar">
              <div className="park-fz-panel">
                <div className="park-fz-panel-head">
                  <span className="park-fz-panel-title">① 当前绘制</span>
                  {draftReady ? (
                    <Tag color="success" className="park-fz-status-tag" icon={<CheckCircleOutlined />}>
                      {draftPts} 点 · 已闭合
                    </Tag>
                  ) : (
                    <Tag className="park-fz-status-tag">{draftPts} 点 · 至少 3</Tag>
                  )}
                </div>
                <div className="park-fz-draw-row park-fz-draw-row--sidebar">
                  <Text type="secondary" className="park-fz-draw-hint">
                    在右侧地图点击；误点可清空。
                  </Text>
                  <Button size="small" onClick={clearDraft} block>
                    清空当前绘制
                  </Button>
                </div>
              </div>

              <div ref={step2Ref} className={`park-fz-panel park-fz-panel--accent ${draftReady ? 'park-fz-panel--pulse' : ''}`}>
                <div className="park-fz-panel-title">② 分区类型（两列）</div>
                <Text type="secondary" className="park-fz-chip-hint">
                  点击色块选择（再点取消）；预览色与地图一致。
                </Text>
                <div className="park-fz-type-grid park-fz-type-grid--sidebar" role="listbox" aria-label="功能分区类型">
                  {PARK_FUNCTIONAL_ZONE_PALETTE.map(p => {
                    const selected = pendingZoneType === p.value;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={`park-fz-type-chip park-fz-type-chip--compact ${selected ? 'is-selected' : ''}`}
                        onClick={() => toggleZoneType(p.value)}
                      >
                        <span className="park-fz-swatch" style={{ background: p.fill, borderColor: p.stroke }} />
                        <span className="park-fz-type-chip-label">{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {value.length > 0 && (
                <div className="park-fz-panel park-fz-saved-panel">
                  <div className="park-fz-panel-head">
                    <span className="park-fz-panel-title">已保存</span>
                    <Tag>{value.length} 块</Tag>
                  </div>
                  <ul className="park-fz-saved-list">
                    {value.map(z => {
                      const pal = getParkFunctionalZonePalette(z.zoneType);
                      return (
                        <li key={z.id} className="park-fz-saved-item">
                          <Tag
                            className="park-fz-saved-tag"
                            style={
                              pal
                                ? {
                                    color: pal.stroke,
                                    background: `${pal.fill}1f`,
                                    borderColor: pal.fill
                                  }
                                : undefined
                            }
                          >
                            {z.zoneType}
                          </Tag>
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            className="park-fz-remove-btn"
                            onClick={() => removeZone(z.id)}
                          >
                            移除
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="park-fz-sidebar-pinned">
            {draftReady && !pendingZoneType && (
              <Alert type="info" showIcon className="park-fz-alert park-fz-alert--pinned" message="请先点选一种分区类型。" />
            )}
            <Button
              type="primary"
              size="large"
              disabled={!draftReady || !pendingZoneType}
              onClick={addCurrentDraft}
              block
              className="park-fz-save-polygon-btn"
            >
              保存当前多边形
            </Button>
            <Text type="secondary" className="park-fz-pinned-hint">
              全部画完后，点击弹窗底部右侧「完成编辑」退出并写回表单。
            </Text>
          </div>
        </aside>

        <div className="park-fz-map-stage">
          <div className="park-fz-map-shell">
            <div ref={containerRef} className="park-boundary-map maplibre-park-boundary" />
          </div>
        </div>
      </div>
    </div>
  );
};

/** 供表单校验：至少一个有效分区多边形 */
export function validateParkFunctionalZones(zones: unknown): boolean {
  if (!Array.isArray(zones) || zones.length < 1) return false;
  return zones.every(
    (z: ParkFunctionalZone) =>
      z &&
      typeof z.zoneType === 'string' &&
      z.zoneType.length > 0 &&
      parseParkPolygonGeoJson(z.boundaryGeoJson || '').length >= 3
  );
}

/**
 * 表单内入口：摘要 + 按钮打开全屏地图编辑（完成/取消写回表单）。
 */
export const ParkFunctionalZonesEditorTrigger: React.FC<{
  value?: ParkFunctionalZone[];
  onChange?: (v: ParkFunctionalZone[]) => void;
}> = ({ value = [], onChange }) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ParkFunctionalZone[]>(value);

  const validCount = value.filter(z => parseParkPolygonGeoJson(z.boundaryGeoJson || '').length >= 3).length;

  const openFullscreen = () => {
    setDraft(value.map(z => ({ ...z })));
    setOpen(true);
  };

  const handleOk = () => {
    onChange?.(draft);
    setOpen(false);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  return (
    <>
      <div className="park-fz-trigger">
        <div className="park-fz-trigger-main">
          {validCount === 0 ? (
            <Text type="secondary">尚未保存分区，请点击右侧按钮进入全屏绘制。</Text>
          ) : (
            <Space wrap size={[6, 6]} align="center">
              <Text type="secondary">已保存 {validCount} 块：</Text>
              {value.map(z => {
                const pal = getParkFunctionalZonePalette(z.zoneType);
                return (
                  <Tag
                    key={z.id}
                    className="park-fz-trigger-tag"
                    style={
                      pal
                        ? {
                            color: pal.stroke,
                            background: `${pal.fill}1f`,
                            borderColor: pal.fill
                          }
                        : undefined
                    }
                  >
                    {z.zoneType}
                  </Tag>
                );
              })}
            </Space>
          )}
        </div>
        <Button type="primary" icon={<FullscreenOutlined />} onClick={openFullscreen} className="park-fz-trigger-btn">
          全屏绘制分区
        </Button>
      </div>

      <Modal
        title="功能分区 · 全屏编辑"
        open={open}
        onCancel={handleCancel}
        onOk={handleOk}
        okText="完成编辑"
        cancelText="取消"
        width="100%"
        centered={false}
        style={{ top: 0, paddingBottom: 0 }}
        zIndex={1100}
        okButtonProps={{ size: 'large', type: 'primary' }}
        styles={{
          body: {
            padding: 0,
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          },
          footer: {
            flexShrink: 0,
            boxShadow: '0 -4px 14px rgba(0, 0, 0, 0.08)',
            padding: '12px 16px'
          }
        }}
        wrapClassName="park-fz-fullscreen-modal-wrap"
        destroyOnClose
        maskClosable={false}
      >
        <div className="park-fz-fullscreen-inner">
          <ParkFunctionalZonesMapInput value={draft} onChange={setDraft} readOnly={false} />
        </div>
      </Modal>
    </>
  );
};
