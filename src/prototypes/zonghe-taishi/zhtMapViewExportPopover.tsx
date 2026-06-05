/**
 * 综合态势 · 地图视图导出 Popover：分辨率档位 + 宽高 + 整图 PNG
 */
import React, { useCallback, useState } from 'react';
import { Button, Input, Select, message, Typography } from 'antd';
import type { Map } from 'maplibre-gl';
import { Upload } from 'lucide-react';
import {
  DPI_MAX,
  DPI_MIN,
  PNG_MAX_EDGE,
  PNG_MIN_EDGE,
  exportMapHostToPngDownload,
} from './zhtMapViewExport';

const { Text } = Typography;

/** 默认导出像素与 DPI 档位 */
const DEFAULT_EXPORT_WIDTH = 1920;
const DEFAULT_EXPORT_HEIGHT = 1080;
const DEFAULT_DPI_PRESET = 72;

const DPI_PRESET_OPTIONS: { value: number; label: string }[] = [
  { value: 72, label: '标准（72dpi）' },
  { value: 150, label: '高清（150dpi）' },
  { value: 300, label: '超清（300dpi）' },
];

export interface ZhtMapViewExportPopoverContentProps {
  mapRef: React.MutableRefObject<Map | null>;
  mapHostRef: React.RefObject<HTMLElement | null>;
}

function parsePositiveInt(s: string, fallback: number): number {
  const n = parseInt(s.replace(/\D/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const ZhtMapViewExportPopoverContent: React.FC<ZhtMapViewExportPopoverContentProps> = ({
  mapRef,
  mapHostRef,
}) => {
  const [dpiPreset, setDpiPreset] = useState<number>(DEFAULT_DPI_PRESET);
  const [widthStr, setWidthStr] = useState(String(DEFAULT_EXPORT_WIDTH));
  const [heightStr, setHeightStr] = useState(String(DEFAULT_EXPORT_HEIGHT));
  const [exporting, setExporting] = useState(false);

  const resetToDefaults = useCallback(() => {
    setDpiPreset(DEFAULT_DPI_PRESET);
    setWidthStr(String(DEFAULT_EXPORT_WIDTH));
    setHeightStr(String(DEFAULT_EXPORT_HEIGHT));
    message.info('已恢复默认导出参数');
  }, []);

  const onExport = useCallback(async () => {
    const map = mapRef.current;
    const host = mapHostRef.current;
    if (!map || !host) {
      message.warning('地图未就绪，请稍后再试');
      return;
    }
    const dpi = dpiPreset;
    const width = parsePositiveInt(widthStr, DEFAULT_EXPORT_WIDTH);
    const height = parsePositiveInt(heightStr, DEFAULT_EXPORT_HEIGHT);
    if (width < PNG_MIN_EDGE || width > PNG_MAX_EDGE || height < PNG_MIN_EDGE || height > PNG_MAX_EDGE) {
      message.warning(`宽高需在 ${PNG_MIN_EDGE}–${PNG_MAX_EDGE} 像素之间`);
      return;
    }
    if (dpi < DPI_MIN || dpi > DPI_MAX) {
      message.warning(`导出分辨率需在 ${DPI_MIN}–${DPI_MAX} 之间`);
      return;
    }
    setExporting(true);
    const hide = message.loading('正在导出地图视图…', 0);
    try {
      const mode = await exportMapHostToPngDownload(map, host, { width, height, dpi }, 'zht-map-export');
      if (mode === 'canvas') {
        message.warning('整图（含 POI / 行政卡片）截取失败，已改为仅底图画布（常见于跨域瓦片限制）');
      } else {
        message.success('已开始下载 PNG（含地图上的 POI 与行政卡片）');
      }
    } catch {
      message.error('导出失败，请缩小尺寸或分辨率后重试');
    } finally {
      hide();
      setExporting(false);
    }
  }, [dpiPreset, heightStr, mapHostRef, mapRef, widthStr]);

  return (
    <div className="zht-map-export-popover" onClick={e => e.stopPropagation()}>
      <div className="zht-map-export-popover__head">
        <span className="zht-map-export-popover__head-title">地图视图导出</span>
        <Button type="link" size="small" className="zht-map-export-popover__reset" onClick={resetToDefaults}>
          恢复默认
        </Button>
      </div>
      <Button
        type="default"
        block
        size="large"
        className="zht-map-export-popover__primary"
        icon={<Upload size={18} strokeWidth={1.75} aria-hidden />}
        loading={exporting}
        disabled={exporting}
        onClick={() => void onExport()}
      >
        地图导出
      </Button>
      <Text type="secondary" className="zht-map-export-popover__scope-hint">
        导出当前地图区域整图：底图 + 矢量层 + 比例尺等控件，以及 POI 与行政区划卡片；不含左右看板。默认宽高 1920×1080；整图截取失败时回退为仅 WebGL 画布。
      </Text>
      <div className="zht-map-export-popover__panel">
        <label className="zht-map-export-popover__field-label" htmlFor="zht-map-export-dpi">
          导出分辨率
        </label>
        <Select<number>
          id="zht-map-export-dpi"
          className="zht-map-export-popover__dpi-select"
          value={dpiPreset}
          options={DPI_PRESET_OPTIONS}
          aria-label="导出分辨率档位"
          onChange={v => setDpiPreset(v)}
        />
      </div>
      <div className="zht-map-export-popover__panel">
        <div className="zht-map-export-popover__row">
          <div className="zht-map-export-popover__cell">
            <label className="zht-map-export-popover__field-label" htmlFor="zht-map-export-w">
              宽度
            </label>
            <Input
              id="zht-map-export-w"
              value={widthStr}
              onChange={e => setWidthStr(e.target.value)}
              inputMode="numeric"
              placeholder="1920"
              aria-label="导出宽度像素"
            />
          </div>
          <div className="zht-map-export-popover__cell">
            <label className="zht-map-export-popover__field-label" htmlFor="zht-map-export-h">
              高度
            </label>
            <Input
              id="zht-map-export-h"
              value={heightStr}
              onChange={e => setHeightStr(e.target.value)}
              inputMode="numeric"
              placeholder="1080"
              aria-label="导出高度像素"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
