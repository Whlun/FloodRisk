import React, { useEffect, useMemo, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { EMERGENCY_MAPLIBRE_BASEMAP_STYLE, emergencyFirstSymbolLayerId } from '../应急协同/emergencyMapLibreStyle';
import type { SectionTraceAnalysisResult } from './zhtSectionTraceAnalysisData';

const SRC_POINTS = 'zht-section-trace-points';
const SRC_LINES = 'zht-section-trace-lines';

export const ZhtSectionTraceMap: React.FC<{
  analysis: SectionTraceAnalysisResult;
  selectedOutletCode: string | null;
}> = ({ analysis, selectedOutletCode }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapLoadedRef = useRef(false);
  const lastTraceIdRef = useRef<string | null>(null);
  const latestMapDataRef = useRef<{ points: GeoJSON.FeatureCollection; lines: GeoJSON.FeatureCollection } | null>(null);

  const mapData = useMemo(() => {
    const points: GeoJSON.Feature[] = [
      {
        type: 'Feature',
        properties: { kind: 'monitor', code: analysis.stationId, name: analysis.stationName },
        geometry: { type: 'Point', coordinates: [analysis.stationLng, analysis.stationLat] },
      },
      ...analysis.topSources.map(s => ({
        type: 'Feature' as const,
        properties: {
          kind: 'outlet',
          code: s.outletCode,
          name: s.outletName,
          selected: selectedOutletCode ? s.outletCode === selectedOutletCode : s.rank === 1,
        },
        geometry: { type: 'Point' as const, coordinates: [s.outletLng, s.outletLat] },
      })),
    ];
    const lines: GeoJSON.Feature[] = analysis.topSources.map(s => ({
      type: 'Feature',
      properties: {
        code: s.outletCode,
        selected: selectedOutletCode ? s.outletCode === selectedOutletCode : s.rank === 1,
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [s.outletLng, s.outletLat],
          [analysis.stationLng, analysis.stationLat],
        ],
      },
    }));
    return {
      points: { type: 'FeatureCollection', features: points } as GeoJSON.FeatureCollection,
      lines: { type: 'FeatureCollection', features: lines } as GeoJSON.FeatureCollection,
    };
  }, [analysis, selectedOutletCode]);
  latestMapDataRef.current = mapData;

  const fitToCurrentAnalysis = () => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;
    const fitPoints = [
      [analysis.stationLng, analysis.stationLat],
      ...analysis.topSources.map(s => [s.outletLng, s.outletLat]),
    ] as [number, number][];
    if (fitPoints.length === 0) return;
    const minLng = Math.min(...fitPoints.map(p => p[0]));
    const minLat = Math.min(...fitPoints.map(p => p[1]));
    const maxLng = Math.max(...fitPoints.map(p => p[0]));
    const maxLat = Math.max(...fitPoints.map(p => p[1]));
    map.fitBounds(
      [
        [minLng - 0.006, minLat - 0.006],
        [maxLng + 0.006, maxLat + 0.006],
      ],
      { padding: 48, duration: 220 },
    );
  };

  useEffect(() => {
    const el = hostRef.current;
    if (!el || mapRef.current) return;
    const map = new maplibregl.Map({
      container: el,
      style: EMERGENCY_MAPLIBRE_BASEMAP_STYLE,
      center: [analysis.stationLng, analysis.stationLat],
      zoom: 12.4,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.once('load', () => {
      mapLoadedRef.current = true;
      const initData = latestMapDataRef.current ?? mapData;
      map.addSource(SRC_LINES, { type: 'geojson', data: initData.lines });
      map.addSource(SRC_POINTS, { type: 'geojson', data: initData.points });
      const beforeId = emergencyFirstSymbolLayerId(map);
      map.addLayer(
        {
          id: 'zht-section-trace-lines-bg',
          type: 'line',
          source: SRC_LINES,
          paint: {
            'line-color': '#8c8c8c',
            'line-opacity': 0.45,
            'line-width': 2,
          },
        },
        beforeId,
      );
      map.addLayer(
        {
          id: 'zht-section-trace-lines-selected',
          type: 'line',
          source: SRC_LINES,
          filter: ['==', ['get', 'selected'], true],
          paint: {
            'line-color': '#fa8c16',
            'line-opacity': 0.95,
            'line-width': 3.5,
          },
        },
        beforeId,
      );
      map.addLayer(
        {
          id: 'zht-section-trace-points',
          type: 'circle',
          source: SRC_POINTS,
          paint: {
            'circle-radius': [
              'case',
              ['==', ['get', 'kind'], 'monitor'],
              9,
              ['==', ['get', 'selected'], true],
              8,
              6,
            ],
            'circle-color': [
              'case',
              ['==', ['get', 'kind'], 'monitor'],
              '#1677ff',
              ['==', ['get', 'selected'], true],
              '#fa8c16',
              '#52c41a',
            ],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
          },
        },
        beforeId,
      );
      fitToCurrentAnalysis();
      lastTraceIdRef.current = analysis.traceId;
    });
    return () => {
      mapLoadedRef.current = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;
    const linesSource = map.getSource(SRC_LINES) as maplibregl.GeoJSONSource | undefined;
    const pointsSource = map.getSource(SRC_POINTS) as maplibregl.GeoJSONSource | undefined;
    linesSource?.setData(mapData.lines);
    pointsSource?.setData(mapData.points);
    if (lastTraceIdRef.current !== analysis.traceId) {
      fitToCurrentAnalysis();
      lastTraceIdRef.current = analysis.traceId;
    }
  }, [analysis.traceId, mapData.lines, mapData.points]);

  return <div ref={hostRef} className="zht-section-trace-map" aria-label="断面溯源联动地图" role="img" />;
};

