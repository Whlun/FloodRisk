import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { DEQING_MAP_CENTER } from './deqingPointFormMap';
import type { WaterloggingPointRow } from './types';

const LEVEL_COLOR: Record<string, string> = {
  HIGH: '#f5222d',
  MEDIUM: '#fa8c16',
  LOW: '#52c41a',
  none: '#8c8c8c',
};

interface Props {
  points: WaterloggingPointRow[];
  height?: number;
  onPointClick?: (pt: WaterloggingPointRow) => void;
}

export const HazardPointMap: React.FC<Props> = ({ points, height = 320, onPointClick }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!hostRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: hostRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: DEQING_MAP_CENTER,
      zoom: 11,
    });
    mapRef.current = map;
    return () => {
      markersRef.current.forEach(m => m.remove());
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const sync = () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      for (const pt of points) {
        if (pt.lng == null || pt.lat == null) continue;
        const code = pt.ratingResult?.levelCode ?? 'none';
        const el = document.createElement('div');
        el.style.width = '14px';
        el.style.height = '14px';
        el.style.borderRadius = '50%';
        el.style.background = pt.ratingResult?.color ?? LEVEL_COLOR[code] ?? LEVEL_COLOR.none;
        el.style.border = '2px solid #fff';
        el.style.boxShadow = '0 1px 4px rgba(0,0,0,.3)';
        el.style.cursor = 'pointer';
        const marker = new maplibregl.Marker({ element: el }).setLngLat([pt.lng, pt.lat]).addTo(map);
        el.addEventListener('click', () => onPointClick?.(pt));
        const popup = new maplibregl.Popup({ offset: 12 }).setHTML(
          `<strong>${pt.name}</strong><br/>${pt.ratingResult?.levelName ?? '未定级'}`,
        );
        marker.setPopup(popup);
        markersRef.current.push(marker);
      }
    };
    if (map.isStyleLoaded()) sync();
    else map.once('load', sync);
  }, [points, onPointClick]);

  return <div ref={hostRef} style={{ height, borderRadius: 8, overflow: 'hidden', border: '1px solid #e8e8e8' }} />;
};
