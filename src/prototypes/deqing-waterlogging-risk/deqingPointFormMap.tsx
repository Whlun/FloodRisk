import React, { useEffect, useRef } from 'react';
import { Typography } from 'antd';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const { Text } = Typography;

/** 德清中心（与 material-manage-web config.js 一致） */
export const DEQING_MAP_CENTER: [number, number] = [120.054473, 30.538504];
const DEQING_ZOOM = 13;

interface Props {
  lng?: number;
  lat?: number;
  onPick: (lng: number, lat: number) => void;
  height?: number;
}

export const DeqingPointFormMap: React.FC<Props> = ({ lng, lat, onPick, height = 280 }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!hostRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: hostRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: lng != null && lat != null ? [lng, lat] : DEQING_MAP_CENTER,
      zoom: DEQING_ZOOM,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('click', e => {
      onPick(e.lngLat.lng, e.lngLat.lat);
    });
    mapRef.current = map;
    return () => {
      markerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, [onPick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markerRef.current?.remove();
    if (lng != null && lat != null) {
      markerRef.current = new maplibregl.Marker({ color: '#1677ff' })
        .setLngLat([lng, lat])
        .addTo(map);
      map.jumpTo({ center: [lng, lat], zoom: DEQING_ZOOM });
    }
  }, [lng, lat]);

  return (
    <div>
      <Text type="secondary" style={{ fontSize: 12, marginBottom: 6, display: 'block' }}>
        点击地图标注易涝点位置（德清县）
      </Text>
      <div ref={hostRef} style={{ height, borderRadius: 8, overflow: 'hidden', border: '1px solid #e8e8e8' }} />
    </div>
  );
};
