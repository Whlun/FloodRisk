/**
 * 河流河源 + 河口：同一张 MapLibre 底图（编辑态为双图钉；详情只读为小圆点端点 + 蓝色连线示意走向）
 *
 * 底图与交互约定同 `emergencyEventFormMap.tsx`（OpenFreeMap Liberty、Modal 内 document 捕获补落点）。
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Form, Segmented, Typography } from 'antd';
import type { FormInstance } from 'antd/es/form';
import maplibregl from 'maplibre-gl';
import type { Feature, FeatureCollection } from 'geojson';
import Point from '@mapbox/point-geometry';
import 'maplibre-gl/dist/maplibre-gl.css';
import '../应急协同/emergencyEventFormMapLayout.css';
import {
  EMERGENCY_MAP_INCIDENT_ZOOM,
  EMERGENCY_MAPLIBRE_BASEMAP_STYLE,
  EMERGENCY_MAPLIBRE_DEFAULT_ZOOM,
  EMERGENCY_MAP_SHAOSHAN_GOVERNMENT_CENTER,
  emergencyFirstSymbolLayerId,
} from '../应急协同/emergencyMapLibreStyle';

const { Text } = Typography;

type ActivePoint = 'sour' | 'mou';

function mousePosOnCanvas(canvas: HTMLCanvasElement, e: MouseEvent): Point {
  const rect = canvas.getBoundingClientRect();
  const scaleX = (rect.width / canvas.offsetWidth) || 1;
  const scaleY = (rect.height / canvas.offsetHeight) || 1;
  return new Point(
    ((e.clientX - rect.left) / scaleX) - canvas.clientLeft,
    ((e.clientY - rect.top) / scaleY) - canvas.clientTop,
  );
}

function parseNumLngLat(lng: unknown, lat: unknown): [number, number] | null {
  const ln = typeof lng === 'number' ? lng : Number.parseFloat(String(lng ?? '').trim());
  const la = typeof lat === 'number' ? lat : Number.parseFloat(String(lat ?? '').trim());
  if (!Number.isFinite(ln) || !Number.isFinite(la)) return null;
  if (ln < -180 || ln > 180 || la < -90 || la > 90) return null;
  return [ln, la];
}

function isPrototypeReverseLocationFallback(t: string): boolean {
  return t.includes('地图选点示意') || t.includes('地图选点自动生成');
}

function isAutoLocationText(loc: string): boolean {
  const t = loc.trim();
  if (!t) return true;
  return /^(地图标注|地图选点)/i.test(t) || /^WGS84/i.test(t) || isPrototypeReverseLocationFallback(t);
}

function prototypeReverseGeocodeFallback(lng: number, lat: number): string {
  const block = (Math.floor(lng * 800) % 50) + (Math.floor(lat * 800) % 50);
  const no = (Math.abs(block) % 180) + 1;
  const sub = (Math.abs(block >> 3) % 20) + 1;
  return `湖南省湘潭市韶山市清溪镇示范街道${no}号附${sub}号（地图选点自动生成，外网逆地理不可用时占位；请改为实际路名门牌）`;
}

function nominatimAddressLine(j: { display_name?: string; address?: Record<string, string> }): string | null {
  const dn = typeof j?.display_name === 'string' ? j.display_name.trim() : '';
  if (dn && /[\u4e00-\u9fff]/.test(dn)) return dn;
  const a = j.address;
  if (!a || typeof a !== 'object') return dn || null;
  const road = [a.road, a.pedestrian, a.path, a.footway].find(Boolean);
  const hn = a.house_number;
  const tail = [road, hn].filter(Boolean).join('');
  const headParts = [
    a.country,
    a.state,
    a.province,
    a.city,
    a.town,
    a.city_district,
    a.suburb,
    a.county,
    a.village,
    a.hamlet,
  ];
  const head = headParts.filter(Boolean).join('');
  const line = `${head}${tail}`.trim();
  if (line) return line;
  return dn || null;
}

async function nominatimReverseDisplayName(lng: number, lat: number, signal: AbortSignal): Promise<string | null> {
  const q = new URLSearchParams({
    format: 'jsonv2',
    lat: String(lat),
    lon: String(lng),
    zoom: '18',
    'accept-language': 'zh-CN,zh;q=0.9',
    email: 'axhub-make-prototype@local.invalid',
  });
  const url = `https://nominatim.openstreetmap.org/reverse?${q.toString()}`;
  try {
    const res = await fetch(url, {
      signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AxhubMake-Prototype/1.0 (local dev)',
      },
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { display_name?: string; address?: Record<string, string> };
    const line = nominatimAddressLine(j);
    return line?.trim() || null;
  } catch {
    return null;
  }
}

/** 与 MapLibre 默认图钉色一致：蓝（第一点）、绿（第二点） */
function DualPointMapLegend(props: { firstLabel: string; secondLabel: string }) {
  return (
    <div className="river-wgs84-dual-point-legend" aria-hidden>
      <div className="river-wgs84-dual-point-legend__row">
        <span className="river-wgs84-dual-point-legend__swatch river-wgs84-dual-point-legend__swatch--first" />
        <span>{props.firstLabel}</span>
      </div>
      <div className="river-wgs84-dual-point-legend__row">
        <span className="river-wgs84-dual-point-legend__swatch river-wgs84-dual-point-legend__swatch--second" />
        <span>{props.secondLabel}</span>
      </div>
    </div>
  );
}

/** 详情只读：管线/河段示意 GeoJSON（线段 + 端点小圆点） */
const RIVER_WGS84_DETAIL_SRC = 'river-wgs84-detail-geo';
const RIVER_WGS84_DETAIL_LINE_LAYER = 'river-wgs84-detail-line';
const RIVER_WGS84_DETAIL_CIRCLE_LAYER = 'river-wgs84-detail-endpoints';

function buildRiverWgs84DetailGeoJson(sour: [number, number] | null, mou: [number, number] | null): FeatureCollection {
  const features: Feature[] = [];
  if (sour && mou) {
    features.push({
      type: 'Feature',
      properties: { kind: 'segment' },
      geometry: { type: 'LineString', coordinates: [sour, mou] },
    });
  }
  if (sour) {
    features.push({
      type: 'Feature',
      properties: { kind: 'endpoint', role: 'start' },
      geometry: { type: 'Point', coordinates: sour },
    });
  }
  if (mou) {
    features.push({
      type: 'Feature',
      properties: { kind: 'endpoint', role: 'end' },
      geometry: { type: 'Point', coordinates: mou },
    });
  }
  return { type: 'FeatureCollection', features };
}

function setCameraForPoints(map: maplibregl.Map, sour: [number, number] | null, mou: [number, number] | null) {
  try {
    if (sour && mou) {
      const b = new maplibregl.LngLatBounds();
      b.extend(sour);
      b.extend(mou);
      map.fitBounds(b, { padding: 56, maxZoom: 11.5, duration: 0 });
      return;
    }
    const p = sour ?? mou;
    if (p) {
      map.jumpTo({ center: p, zoom: EMERGENCY_MAP_INCIDENT_ZOOM, pitch: 0, bearing: 0 });
      return;
    }
    map.jumpTo({
      center: EMERGENCY_MAP_SHAOSHAN_GOVERNMENT_CENTER,
      zoom: EMERGENCY_MAPLIBRE_DEFAULT_ZOOM,
      pitch: 0,
      bearing: 0,
    });
  } catch {
    /* 忽略 */
  }
}

export type RiverSourceMouthWgs84MapPickerProps = {
  form: FormInstance;
  sourLngField: string;
  sourLatField: string;
  sourAddrField: string;
  mouLngField: string;
  mouLatField: string;
  mouAddrField: string;
  mapAriaLabel: string;
  /** 分段与图钉语义，默认河源/河口；责任段可传起点/讫点 */
  firstPointLabel?: string;
  secondPointLabel?: string;
  /** 逆地理目标字段中文名（工具栏说明） */
  firstLocationFieldLabel?: string;
  secondLocationFieldLabel?: string;
};

/** 编辑表单：双点地图（蓝/绿）；默认河源—河口语义，亦可用于河段起点—讫点 */
export const RiverSourceMouthWgs84MapPicker: React.FC<RiverSourceMouthWgs84MapPickerProps> = ({
  form,
  sourLngField,
  sourLatField,
  sourAddrField,
  mouLngField,
  mouLatField,
  mouAddrField,
  mapAriaLabel,
  firstPointLabel = '河源',
  secondPointLabel = '河口',
  firstLocationFieldLabel = '河源所在位置',
  secondLocationFieldLabel = '河口所在位置',
}) => {
  const [activePoint, setActivePoint] = useState<ActivePoint>('sour');
  const activePointRef = useRef<ActivePoint>('sour');
  activePointRef.current = activePoint;

  const slng = Form.useWatch(sourLngField, form);
  const slat = Form.useWatch(sourLatField, form);
  const mlng = Form.useWatch(mouLngField, form);
  const mlat = Form.useWatch(mouLatField, form);
  const sourLoc = Form.useWatch(sourAddrField, form);
  const mouLoc = Form.useWatch(mouAddrField, form);

  const parsedSour = useMemo(() => parseNumLngLat(slng, slat), [slng, slat]);
  const parsedMou = useMemo(() => parseNumLngLat(mlng, mlat), [mlng, mlat]);

  const sourLocRef = useRef(String(sourLoc ?? ''));
  const mouLocRef = useRef(String(mouLoc ?? ''));
  sourLocRef.current = String(sourLoc ?? '');
  mouLocRef.current = String(mouLoc ?? '');

  const lastMapWrittenSourRef = useRef<string | null>(null);
  const lastMapWrittenMouRef = useRef<string | null>(null);
  const geocodeGenerationRef = useRef(0);
  const geocodeAbortRef = useRef<AbortController | null>(null);

  const shellRef = useRef<HTMLDivElement>(null);
  const mapHostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerSourRef = useRef<maplibregl.Marker | null>(null);
  const markerMouRef = useRef<maplibregl.Marker | null>(null);
  const parsedSourRef = useRef(parsedSour);
  const parsedMouRef = useRef(parsedMou);
  parsedSourRef.current = parsedSour;
  parsedMouRef.current = parsedMou;

  const lastPickTsRef = useRef(0);

  const commitPickFor = useCallback(
    (target: ActivePoint, lngLat: maplibregl.LngLatLike) => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (now - lastPickTsRef.current < 80) return;
      lastPickTsRef.current = now;

      const ll = maplibregl.LngLat.convert(lngLat);
      if (!Number.isFinite(ll.lng) || !Number.isFinite(ll.lat)) return;

      const lngStr = ll.lng;
      const latStr = ll.lat;
      const pair: [number, number] = [ll.lng, ll.lat];

      const patch: Record<string, unknown> =
        target === 'sour'
          ? { [sourLngField]: lngStr, [sourLatField]: latStr }
          : { [mouLngField]: lngStr, [mouLatField]: latStr };

      const addrField = target === 'sour' ? sourAddrField : mouAddrField;
      const locPrev = target === 'sour' ? sourLocRef.current : mouLocRef.current;
      const lastWritten = target === 'sour' ? lastMapWrittenSourRef.current : lastMapWrittenMouRef.current;

      const replaceable =
        isAutoLocationText(locPrev) ||
        !locPrev.trim() ||
        (lastWritten !== null && locPrev === lastWritten);

      if (!replaceable) {
        form.setFieldsValue(patch);
        if (target === 'sour') {
          const mk = markerSourRef.current;
          if (mk) mk.setLngLat(pair);
        } else {
          const mk = markerMouRef.current;
          if (mk) mk.setLngLat(pair);
        }
        return;
      }

      geocodeAbortRef.current?.abort();
      const ac = new AbortController();
      geocodeAbortRef.current = ac;

      const interim = prototypeReverseGeocodeFallback(ll.lng, ll.lat);
      if (target === 'sour') {
        lastMapWrittenSourRef.current = interim;
        sourLocRef.current = interim;
      } else {
        lastMapWrittenMouRef.current = interim;
        mouLocRef.current = interim;
      }
      form.setFieldsValue({ ...patch, [addrField]: interim });

      const gen = ++geocodeGenerationRef.current;
      void nominatimReverseDisplayName(ll.lng, ll.lat, ac.signal)
        .then(addr => {
          if (gen !== geocodeGenerationRef.current) return;
          const loc = (addr && addr.trim()) || interim;
          if (target === 'sour') {
            lastMapWrittenSourRef.current = loc;
            sourLocRef.current = loc;
          } else {
            lastMapWrittenMouRef.current = loc;
            mouLocRef.current = loc;
          }
          form.setFieldsValue({ [addrField]: loc });
        })
        .catch(() => {
          /* 取消或失败：保留 interim */
        });

      if (target === 'sour') {
        const mk = markerSourRef.current;
        if (mk) mk.setLngLat(pair);
      } else {
        const mk = markerMouRef.current;
        if (mk) mk.setLngLat(pair);
      }
    },
    [form, sourLngField, sourLatField, sourAddrField, mouLngField, mouLatField, mouAddrField],
  );

  const syncMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;

    const ps = parsedSourRef.current;
    const pm = parsedMouRef.current;

    const ensureMarker = (
      ref: React.MutableRefObject<maplibregl.Marker | null>,
      color: string,
      pos: [number, number] | null,
      target: ActivePoint,
    ) => {
      if (!pos) {
        ref.current?.remove();
        ref.current = null;
        return;
      }
      if (!ref.current) {
        const mk = new maplibregl.Marker({
          color,
          scale: 1.08,
          anchor: 'bottom',
          draggable: true,
        })
          .setLngLat(pos)
          .addTo(map);
        ref.current = mk;
        mk.on('dragend', () => {
          const m = mapRef.current;
          if (!m) return;
          commitPickFor(target, mk.getLngLat());
        });
      } else {
        ref.current.setLngLat(pos);
      }
    };

    ensureMarker(markerSourRef, '#1677ff', ps, 'sour');
    ensureMarker(markerMouRef, '#52c41a', pm, 'mou');

    requestAnimationFrame(() => {
      const m = mapRef.current;
      if (!m?.isStyleLoaded()) return;
      setCameraForPoints(m, ps, pm);
    });
  }, [commitPickFor]);

  const syncMarkersRef = useRef(syncMarkers);
  syncMarkersRef.current = syncMarkers;

  const commitActivePickRef = useRef<(map: maplibregl.Map, lngLat: maplibregl.LngLatLike) => void>(() => {});
  commitActivePickRef.current = (map, lngLat) => {
    void map;
    commitPickFor(activePointRef.current, lngLat);
  };

  useEffect(() => {
    const onDocClickCapture = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const map = mapRef.current;
      if (!map?.isStyleLoaded()) return;
      const t = e.target as Node | null;
      const canvasContainer = map.getCanvasContainer();
      if (!t || !canvasContainer.contains(t)) return;
      const el2 = t instanceof Element ? t : null;
      if (el2?.closest?.('.maplibregl-marker')) return;
      if (el2?.closest?.('.maplibregl-ctrl')) return;

      const canvas = map.getCanvas();
      const pt = mousePosOnCanvas(canvas, e);
      const lngLat = map.unproject(pt);
      commitActivePickRef.current(map, lngLat);
    };

    document.addEventListener('click', onDocClickCapture, true);
    return () => document.removeEventListener('click', onDocClickCapture, true);
  }, []);

  useEffect(() => {
    const shell = shellRef.current;
    const host = mapHostRef.current;
    if (!shell || !host) return;

    let disposed = false;

    const canLayout = () => shell.clientWidth >= 48 && shell.clientHeight >= 48;

    const bumpResize = () => {
      const m = mapRef.current;
      if (!m || disposed) return;
      m.resize();
      requestAnimationFrame(() => {
        const m2 = mapRef.current;
        if (!m2 || disposed) return;
        m2.resize();
      });
    };

    const mountMap = () => {
      if (disposed || mapRef.current) return;
      if (!canLayout()) return;

      const start = parsedSourRef.current ?? parsedMouRef.current ?? EMERGENCY_MAP_SHAOSHAN_GOVERNMENT_CENTER;
      const zoom =
        parsedSourRef.current || parsedMouRef.current ? EMERGENCY_MAP_INCIDENT_ZOOM : EMERGENCY_MAPLIBRE_DEFAULT_ZOOM;
      const m = new maplibregl.Map({
        container: host,
        style: EMERGENCY_MAPLIBRE_BASEMAP_STYLE,
        center: start,
        zoom,
        attributionControl: { compact: true },
      });
      mapRef.current = m;

      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

      m.once('load', () => {
        if (disposed || !mapRef.current) return;
        syncMarkersRef.current();
        bumpResize();
        m.once('idle', () => {
          bumpResize();
          setCameraForPoints(m, parsedSourRef.current, parsedMouRef.current);
        });

        const container = m.getCanvasContainer();
        let ptrDown: { x: number; y: number } | null = null;
        const onPtrDown = (e: PointerEvent) => {
          if (e.button !== 0) return;
          const el = e.target instanceof Element ? e.target : null;
          if (el?.closest?.('.maplibregl-marker') || el?.closest?.('.maplibregl-ctrl')) return;
          ptrDown = { x: e.clientX, y: e.clientY };
        };
        const onPtrUp = (e: PointerEvent) => {
          if (e.button !== 0 || !ptrDown) return;
          const startPt = ptrDown;
          ptrDown = null;
          const el = e.target instanceof Element ? e.target : null;
          if (el?.closest?.('.maplibregl-marker') || el?.closest?.('.maplibregl-ctrl')) return;
          if (Math.hypot(e.clientX - startPt.x, e.clientY - startPt.y) > 8) return;
          const canvas = m.getCanvas();
          const pt = mousePosOnCanvas(canvas, e as unknown as MouseEvent);
          commitActivePickRef.current(m, m.unproject(pt));
        };
        container.addEventListener('pointerdown', onPtrDown, true);
        container.addEventListener('pointerup', onPtrUp, true);
        m.once('remove', () => {
          container.removeEventListener('pointerdown', onPtrDown, true);
          container.removeEventListener('pointerup', onPtrUp, true);
        });
      });

      m.on('click', (ev: maplibregl.MapMouseEvent) => {
        const t = ev.originalEvent.target as Node | null;
        const el = t instanceof Element ? t : null;
        if (el?.closest?.('.maplibregl-marker')) return;
        if (el?.closest?.('.maplibregl-ctrl')) return;
        commitActivePickRef.current(m, ev.lngLat);
      });
    };

    const onRo = () => {
      if (disposed) return;
      if (!mapRef.current) mountMap();
      else bumpResize();
    };

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onRo) : null;
    ro?.observe(shell);

    const delays = [0, 50, 120, 280, 480, 800, 1200];
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
      geocodeGenerationRef.current += 1;
      geocodeAbortRef.current?.abort();
      geocodeAbortRef.current = null;
      timers.forEach(t => window.clearTimeout(t));
      ro?.disconnect();
      markerSourRef.current?.remove();
      markerSourRef.current = null;
      markerMouRef.current?.remove();
      markerMouRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    syncMarkers();
  }, [parsedSour, parsedMou, syncMarkers]);

  return (
    <div className="emergency-event-form-map-wrap">
      <div className="emergency-event-form-map-toolbar" style={{ alignItems: 'center' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          当前标注：
        </Text>
        <Segmented<ActivePoint>
          size="small"
          value={activePoint}
          onChange={v => setActivePoint(v)}
          options={[
            { label: firstPointLabel, value: 'sour' },
            { label: secondPointLabel, value: 'mou' },
          ]}
        />
        <Text type="secondary" style={{ fontSize: 12 }}>
          在地图空白处点击或拖动对应颜色图钉，将更新该点经纬度并尝试逆地理写入「{firstLocationFieldLabel}」或「
          {secondLocationFieldLabel}」（手工录入且未识别为自动占位时，不覆盖文字）。
        </Text>
      </div>
      <div
        ref={shellRef}
        className="emergency-event-form-map emergency-event-form-map-shell maplibre-emergency-event maplibre-park-boundary-emergency"
        role="application"
        aria-label={mapAriaLabel}
      >
        <div ref={mapHostRef} className="emergency-event-form-map-host" aria-hidden />
        <DualPointMapLegend firstLabel={firstPointLabel} secondLabel={secondPointLabel} />
      </div>
    </div>
  );
};

export type RiverSourceMouthWgs84DetailMapProps = {
  /** 无障碍/图钉提示用；地址文案由外层描述列表单独展示 */
  title: string;
  sourLng?: number | null;
  sourLat?: number | null;
  mouLng?: number | null;
  mouLat?: number | null;
  mapAriaLabel?: string;
  /** 图钉 title 前缀，默认河源/河口 */
  firstMarkerShortLabel?: string;
  secondMarkerShortLabel?: string;
};

/** 详情只读：双端点小圆点 + 连线；地图单例挂载，数据用 GeoJSON setData 更新以便铺满容器后 resize */
export const RiverSourceMouthWgs84DetailMap: React.FC<RiverSourceMouthWgs84DetailMapProps> = ({
  title: _mapTitle,
  sourLng,
  sourLat,
  mouLng,
  mouLat,
  mapAriaLabel = '河源与河口位置地图',
  firstMarkerShortLabel = '河源',
  secondMarkerShortLabel = '河口',
}) => {
  const shellRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const ps = useMemo(() => parseNumLngLat(sourLng, sourLat), [sourLng, sourLat]);
  const pm = useMemo(() => parseNumLngLat(mouLng, mouLat), [mouLng, mouLat]);

  const psRef = useRef(ps);
  const pmRef = useRef(pm);
  psRef.current = ps;
  pmRef.current = pm;

  const pushDetailGeoAndCamera = useCallback((m: maplibregl.Map) => {
    if (!m.isStyleLoaded()) return;
    const src = m.getSource(RIVER_WGS84_DETAIL_SRC) as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    const s = psRef.current;
    const e = pmRef.current;
    src.setData(buildRiverWgs84DetailGeoJson(s, e));
    setCameraForPoints(m, s, e);
    m.resize();
    requestAnimationFrame(() => {
      m.resize();
    });
  }, []);

  const ensureDetailLayers = useCallback((m: maplibregl.Map) => {
    if (m.getSource(RIVER_WGS84_DETAIL_SRC)) return;
    m.addSource(RIVER_WGS84_DETAIL_SRC, {
      type: 'geojson',
      data: buildRiverWgs84DetailGeoJson(null, null),
    });
    const beforeId = emergencyFirstSymbolLayerId(m);
    m.addLayer(
      {
        id: RIVER_WGS84_DETAIL_LINE_LAYER,
        type: 'line',
        source: RIVER_WGS84_DETAIL_SRC,
        filter: ['==', ['get', 'kind'], 'segment'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#1677ff',
          'line-width': 3,
          'line-opacity': 0.9,
        },
      },
      beforeId,
    );
    m.addLayer(
      {
        id: RIVER_WGS84_DETAIL_CIRCLE_LAYER,
        type: 'circle',
        source: RIVER_WGS84_DETAIL_SRC,
        filter: ['==', ['get', 'kind'], 'endpoint'],
        paint: {
          'circle-radius': 8,
          'circle-color': ['match', ['get', 'role'], 'start', '#1677ff', 'end', '#52c41a', '#1677ff'],
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#ffffff',
        },
      },
      beforeId,
    );
  }, []);

  useEffect(() => {
    const shell = shellRef.current;
    const host = hostRef.current;
    if (!shell || !host) return;

    let disposed = false;

    const canLayout = () => shell.clientWidth >= 48 && shell.clientHeight >= 48;

    const bumpResize = () => {
      const m = mapRef.current;
      if (!m || disposed) return;
      m.resize();
      requestAnimationFrame(() => {
        const m2 = mapRef.current;
        if (!m2 || disposed) return;
        m2.resize();
      });
    };

    const tryMount = () => {
      if (disposed || mapRef.current || !canLayout()) return;
      const s0 = psRef.current ?? pmRef.current ?? EMERGENCY_MAP_SHAOSHAN_GOVERNMENT_CENTER;
      const z0 = psRef.current || pmRef.current ? EMERGENCY_MAP_INCIDENT_ZOOM : EMERGENCY_MAPLIBRE_DEFAULT_ZOOM;
      const m = new maplibregl.Map({
        container: host,
        style: EMERGENCY_MAPLIBRE_BASEMAP_STYLE,
        center: s0,
        zoom: z0,
        attributionControl: { compact: true },
      });
      mapRef.current = m;
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

      m.once('load', () => {
        if (disposed || !mapRef.current) return;
        ensureDetailLayers(m);
        pushDetailGeoAndCamera(m);
        m.once('idle', () => {
          bumpResize();
          pushDetailGeoAndCamera(m);
        });
      });
    };

    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            if (mapRef.current) bumpResize();
            else tryMount();
          })
        : null;
    ro?.observe(shell);

    const timers = [0, 80, 200, 500, 900].map(ms =>
      window.setTimeout(() => {
        if (disposed) return;
        tryMount();
        bumpResize();
      }, ms),
    );

    requestAnimationFrame(() => {
      if (disposed) return;
      tryMount();
      bumpResize();
    });

    return () => {
      disposed = true;
      timers.forEach(t => window.clearTimeout(t));
      ro?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [ensureDetailLayers, pushDetailGeoAndCamera]);

  useEffect(() => {
    psRef.current = ps;
    pmRef.current = pm;
    const m = mapRef.current;
    if (!m?.isStyleLoaded()) return;
    pushDetailGeoAndCamera(m);
  }, [ps, pm, pushDetailGeoAndCamera]);

  return (
    <div className="emergency-event-form-map-wrap river-wgs84-detail-map">
      <div
        ref={shellRef}
        className="emergency-event-form-map emergency-event-form-map-shell maplibre-emergency-event maplibre-park-boundary-emergency"
        role="img"
        aria-label={mapAriaLabel}
      >
        <div ref={hostRef} className="emergency-event-form-map-host" aria-hidden />
        {/* 图例叠在地图内左上角，与圆点颜色一致 */}
        <DualPointMapLegend firstLabel={firstMarkerShortLabel} secondLabel={secondMarkerShortLabel} />
      </div>
    </div>
  );
};
