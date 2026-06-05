/**
 * 应急事件新增/编辑 · 事发位置地图（单击标点 + 拖拽平移一体；事发地点 + 经纬度联动）
 *
 * 不区分选点/平移：保持 **`dragPan.enable()`**，单击落点依赖 **`map.on('click')`**（拖移后 MapLibre **suppressClick** 抑制误触）
 * 与 **`document` 捕获 `click` 备用**（Modal 内更稳）：**`getCanvasContainer().contains`** + **`mousePosOnCanvas`** + `unproject`。
 * 底图：与工业园区同源 **OpenFreeMap Liberty**（`EMERGENCY_MAPLIBRE_BASEMAP_STYLE`）；**无坐标**时视图中心为 **韶山市政府**（`EMERGENCY_MAP_SHAOSHAN_GOVERNMENT_CENTER`），**有标记**时中心为标记点；无点缩放与园区再导出同源。
 * 经纬度或图钉变化后 **`jumpTo`** 默认把标记点**居中**；`idle` 首帧亦对齐。
 * DOM：**外壳**定高 + **内层 host** 专供 Map 挂载。
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Typography } from 'antd';
import maplibregl from 'maplibre-gl';
import Point from '@mapbox/point-geometry';
import 'maplibre-gl/dist/maplibre-gl.css';
import './emergencyEventFormMapLayout.css';
import { parseEmergencyEventLngLat } from './emergencyEventDetailMap';
import {
  EMERGENCY_MAP_INCIDENT_ZOOM,
  EMERGENCY_MAPLIBRE_BASEMAP_STYLE,
  EMERGENCY_MAPLIBRE_DEFAULT_ZOOM,
  EMERGENCY_MAP_SHAOSHAN_GOVERNMENT_CENTER,
} from './emergencyMapLibreStyle';

const { Text } = Typography;

/** 编辑地图：有坐标则相机对准图钉，否则园区默认视野 */
function jumpFormMapToMarkerOrDefault(m: maplibregl.Map, point: [number, number] | null) {
  if (!m.isStyleLoaded()) return;
  try {
    if (point) {
      m.jumpTo({ center: point, zoom: EMERGENCY_MAP_INCIDENT_ZOOM, pitch: 0, bearing: 0 });
    } else {
      m.jumpTo({
        center: EMERGENCY_MAP_SHAOSHAN_GOVERNMENT_CENTER,
        zoom: EMERGENCY_MAPLIBRE_DEFAULT_ZOOM,
        pitch: 0,
        bearing: 0,
      });
    }
  } catch {
    /* 忽略 */
  }
}

function isPrototypeReverseLocationFallback(t: string): boolean {
  return t.includes('地图选点示意') || t.includes('地图选点自动生成');
}

function isAutoLocationText(loc: string): boolean {
  const t = loc.trim();
  if (!t) return true;
  return /^(地图标注|地图选点)/i.test(t) || /^WGS84/i.test(t) || isPrototypeReverseLocationFallback(t);
}

function locationFromPick(lng: string, lat: string): string {
  return `地图标注 WGS84 ${lng}，${lat}`;
}

/**
 * 逆地理失败时的中文占位（不含经纬度字面量；坐标仅参与生成可变门牌示意，避免全项目同一串）
 */
function prototypeReverseGeocodeFallback(lng: number, lat: number): string {
  const block = (Math.floor(lng * 800) % 50) + (Math.floor(lat * 800) % 50);
  const no = (Math.abs(block) % 180) + 1;
  const sub = (Math.abs(block >> 3) % 20) + 1;
  return `湖南省湘潭市韶山市清溪镇示范街道${no}号附${sub}号（地图选点自动生成，外网逆地理不可用时占位；请改为实际路名门牌）`;
}

/** 将 Nominatim 的 address 部件拼成一行中文（display_name 常为英文时兜底） */
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

/** OSM Nominatim 逆地理（原型演示；需网络；请遵守 https://operations.osmfoundation.org/policies/nominatim/ ） */
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
        // Nominatim 要求可识别 UA
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

/** 与 MapLibre `MapMouseEvent` 内 `DOM.mousePos(map.getCanvas(), e)` 一致，保证 `unproject` 正确 */
function mousePosOnCanvas(canvas: HTMLCanvasElement, e: MouseEvent): Point {
  const rect = canvas.getBoundingClientRect();
  const scaleX = (rect.width / canvas.offsetWidth) || 1;
  const scaleY = (rect.height / canvas.offsetHeight) || 1;
  return new Point(
    ((e.clientX - rect.left) / scaleX) - canvas.clientLeft,
    ((e.clientY - rect.top) / scaleY) - canvas.clientTop,
  );
}

export interface EmergencyEventFormMapProps {
  longitude: string;
  latitude: string;
  location: string;
  onFormSync: (patch: { longitude: string; latitude: string; location?: string }) => void;
  /** 为 true 时：在允许覆盖「建设地点/事发地点」的前提下，地图选点后尝试逆地理并写入 location（失败则中文示意门牌占位，不写 WGS84 坐标句） */
  reverseGeocodeLocation?: boolean;
  /** 地图上方灰色说明；不传则使用应急默认文案 */
  mapToolbarHint?: string;
  /** 地图无障碍名称 */
  mapAriaLabel?: string;
}

export const EmergencyEventFormMap: React.FC<EmergencyEventFormMapProps> = ({
  longitude,
  latitude,
  location,
  onFormSync,
  reverseGeocodeLocation = false,
  mapToolbarHint,
  mapAriaLabel,
}) => {
  const shellRef = useRef<HTMLDivElement>(null);
  const mapHostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const onFormSyncRef = useRef(onFormSync);
  const parsedRef = useRef<[number, number] | null>(null);
  const locationRef = useRef(location);
  const commitPickRef = useRef<(map: maplibregl.Map, lngLat: maplibregl.LngLatLike) => void>(() => {});
  const lastPickTsRef = useRef(0);
  /** 逆地理模式下：上次由地图写入的完整地址，用于判断再次选点是否可覆盖 */
  const lastMapWrittenLocationRef = useRef<string | null>(null);
  const geocodeGenerationRef = useRef(0);
  const geocodeAbortRef = useRef<AbortController | null>(null);
  const reverseGeocodeLocationRef = useRef(reverseGeocodeLocation);

  onFormSyncRef.current = onFormSync;
  locationRef.current = location;
  reverseGeocodeLocationRef.current = reverseGeocodeLocation;

  const parsed = useMemo(() => parseEmergencyEventLngLat(longitude, latitude), [longitude, latitude]);
  parsedRef.current = parsed;

  const commitPick = useCallback((map: maplibregl.Map, lngLat: maplibregl.LngLatLike) => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - lastPickTsRef.current < 80) return;
    lastPickTsRef.current = now;

    const ll = maplibregl.LngLat.convert(lngLat);
    if (!Number.isFinite(ll.lng) || !Number.isFinite(ll.lat)) return;

    const lngStr = ll.lng.toFixed(6);
    const latStr = ll.lat.toFixed(6);
    const pair: [number, number] = [ll.lng, ll.lat];

    if (!markerRef.current) {
      const mk = new maplibregl.Marker({
        color: '#1677ff',
        scale: 1.12,
        anchor: 'bottom',
        draggable: true,
      })
        .setLngLat(pair)
        .addTo(map);
      markerRef.current = mk;
      mk.on('dragend', () => {
        const m = mapRef.current;
        if (!m) return;
        commitPickRef.current(m, mk.getLngLat());
      });
    } else {
      markerRef.current.setLngLat(pair);
    }

    const locPrev = locationRef.current;
    const patch: { longitude: string; latitude: string; location?: string } = {
      longitude: lngStr,
      latitude: latStr,
    };

    const reverse = reverseGeocodeLocationRef.current;
    const replaceable =
      isAutoLocationText(locPrev) ||
      !locPrev.trim() ||
      (reverse && lastMapWrittenLocationRef.current !== null && locPrev === lastMapWrittenLocationRef.current);

    if (!replaceable) {
      onFormSyncRef.current(patch);
      return;
    }

    if (reverse) {
      geocodeAbortRef.current?.abort();
      const ac = new AbortController();
      geocodeAbortRef.current = ac;

      // 逆地理模式：不写入「WGS84 + 坐标」句，先给中文占位，成功后再用在线解析覆盖
      const interim = prototypeReverseGeocodeFallback(ll.lng, ll.lat);
      lastMapWrittenLocationRef.current = interim;
      locationRef.current = interim;
      onFormSyncRef.current({ longitude: lngStr, latitude: latStr, location: interim });

      const gen = ++geocodeGenerationRef.current;
      void nominatimReverseDisplayName(ll.lng, ll.lat, ac.signal)
        .then(addr => {
          if (gen !== geocodeGenerationRef.current) return;
          const loc = (addr && addr.trim()) || interim;
          lastMapWrittenLocationRef.current = loc;
          locationRef.current = loc;
          onFormSyncRef.current({ longitude: lngStr, latitude: latStr, location: loc });
        })
        .catch(() => {
          /* 取消或网络错误：保留 interim（已为中文占位，非坐标句） */
        });
      return;
    }

    patch.location = locationFromPick(lngStr, latStr);
    onFormSyncRef.current(patch);
  }, []);

  commitPickRef.current = commitPick;

  const syncVisualToParsed = useCallback(() => {
    const map = mapRef.current;
    const p = parsedRef.current;
    if (!map) return;

    if (p) {
      if (!markerRef.current) {
        const mk = new maplibregl.Marker({
          color: '#1677ff',
          scale: 1.12,
          anchor: 'bottom',
          draggable: true,
        })
          .setLngLat(p)
          .addTo(map);
        markerRef.current = mk;
        mk.on('dragend', () => {
          const m = mapRef.current;
          if (!m) return;
          commitPickRef.current(m, mk.getLngLat());
        });
      } else {
        markerRef.current.setLngLat(p);
      }
    } else {
      markerRef.current?.remove();
      markerRef.current = null;
    }
  }, []);

  useEffect(() => {
    // 开启逆地理时由选点流程维护「建设/事发地点」，禁止此处把 location 规范成坐标句
    if (reverseGeocodeLocationRef.current) return;
    if (!parsed) return;
    if (!isAutoLocationText(location)) return;
    const lngS = parsed[0].toFixed(6);
    const latS = parsed[1].toFixed(6);
    const want = locationFromPick(lngS, latS);
    if (location.trim() === want) return;
    onFormSyncRef.current({ longitude: lngS, latitude: latS, location: want });
  }, [parsed, location]);

  /** Modal 内备用：`getCanvasContainer().contains` + 与 MapLibre 一致的 `mousePos` */
  useEffect(() => {
    const onDocClickCapture = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const map = mapRef.current;
      if (!map?.isStyleLoaded()) return;
      const t = e.target as Node | null;
      const canvasContainer = map.getCanvasContainer();
      if (!t || !canvasContainer.contains(t)) return;
      const el = t instanceof Element ? t : null;
      if (el?.closest?.('.maplibregl-marker')) return;
      if (el?.closest?.('.maplibregl-ctrl')) return;

      const canvas = map.getCanvas();
      const pt = mousePosOnCanvas(canvas, e);
      const lngLat = map.unproject(pt);
      commitPickRef.current(map, lngLat);
    };

    document.addEventListener('click', onDocClickCapture, true);
    return () => document.removeEventListener('click', onDocClickCapture, true);
  }, []);

  useEffect(() => {
    const shell = shellRef.current;
    const host = mapHostRef.current;
    if (!shell || !host) return;

    let disposed = false;
    let map: maplibregl.Map | null = null;

    const canLayout = () => shell.clientWidth >= 48 && shell.clientHeight >= 48;

    const bumpResize = () => {
      if (!map || disposed) return;
      map.resize();
      requestAnimationFrame(() => {
        if (!map || disposed) return;
        map.resize();
      });
    };

    const mountMap = () => {
      if (disposed || map) return;
      if (!canLayout()) return;

      const start = parsedRef.current ?? EMERGENCY_MAP_SHAOSHAN_GOVERNMENT_CENTER;
      const zoom = parsedRef.current ? EMERGENCY_MAP_INCIDENT_ZOOM : EMERGENCY_MAPLIBRE_DEFAULT_ZOOM;
      const m = new maplibregl.Map({
        container: host,
        style: EMERGENCY_MAPLIBRE_BASEMAP_STYLE,
        center: start,
        zoom,
        attributionControl: { compact: true },
      });
      map = m;
      mapRef.current = m;

      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

      m.once('load', () => {
        if (disposed || !map) return;
        syncVisualToParsed();
        bumpResize();
        m.once('idle', () => {
          bumpResize();
          jumpFormMapToMarkerOrDefault(m, parsedRef.current);
        });

        /**
         * 部分环境下 `click` 与 document 捕获仍不可靠；在画布容器上用 pointer 轻点判定补一条落点路径
         *（位移小于阈值视为点选，大于则视为拖移平移）
         */
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
          const start = ptrDown;
          ptrDown = null;
          const el = e.target instanceof Element ? e.target : null;
          if (el?.closest?.('.maplibregl-marker') || el?.closest?.('.maplibregl-ctrl')) return;
          if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) return;
          const canvas = m.getCanvas();
          const pt = mousePosOnCanvas(canvas, e as unknown as MouseEvent);
          commitPickRef.current(m, m.unproject(pt));
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
        commitPickRef.current(m, ev.lngLat);
      });
    };

    const onRo = () => {
      if (disposed) return;
      if (!map) mountMap();
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
      markerRef.current?.remove();
      markerRef.current = null;
      map?.remove();
      map = null;
      mapRef.current = null;
    };
  }, [syncVisualToParsed]);

  useEffect(() => {
    syncVisualToParsed();
  }, [parsed, syncVisualToParsed]);

  /** 经纬度变化或图钉更新后，默认把标记点置于视图中心 */
  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    const raf = requestAnimationFrame(() => {
      const m = mapRef.current;
      if (!m?.isStyleLoaded()) return;
      const fromMarker = markerRef.current?.getLngLat();
      const center: [number, number] | null = fromMarker
        ? [fromMarker.lng, fromMarker.lat]
        : parsedRef.current;
      jumpFormMapToMarkerOrDefault(m, center);
    });
    return () => cancelAnimationFrame(raf);
  }, [parsed, longitude, latitude]);

  return (
    <div className="emergency-event-form-map-wrap">
      <div className="emergency-event-form-map-toolbar">
        <Text type="secondary" style={{ fontSize: 12 }}>
          {mapToolbarHint ??
            '在地图上轻点即可更新经纬度（拖拽为平移）；图钉可拖动。若事发地点为手工描述，点选后只更新坐标，不覆盖文字。'}
        </Text>
      </div>
      <div
        ref={shellRef}
        className="emergency-event-form-map emergency-event-form-map-shell maplibre-emergency-event maplibre-park-boundary-emergency"
        role="application"
        aria-label={mapAriaLabel ?? '事发位置地图'}
      >
        <div ref={mapHostRef} className="emergency-event-form-map-host" aria-hidden />
      </div>
    </div>
  );
};
