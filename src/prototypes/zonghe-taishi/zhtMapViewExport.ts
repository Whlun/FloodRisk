/**
 * 综合态势 · 地图视图导出为 PNG：整幅 `map.getContainer()`（WebGL + DOM 覆盖层：POI、行政区划卡片、比例尺等），不含页面左右看板
 */
import { toBlob } from 'html-to-image';
import type { Map } from 'maplibre-gl';

export interface ZhtMapViewExportParams {
  /** 输出图像宽度（像素） */
  width: number;
  /** 输出图像高度（像素） */
  height: number;
  /**
   * 导出分辨率（DPI 语义）：以 72 为 1× 像素比基准，高于 72 则提高 `pixelRatio` 以提升清晰度（更耗内存与耗时）
   */
  dpi: number;
}

const PNG_MAX_EDGE = 8192;
const PNG_MIN_EDGE = 320;
const DPI_MIN = 24;
const DPI_MAX = 600;
/** 像素比相对 72 DPI 的上限，避免超大画布 OOM */
const PIXEL_RATIO_MAX = 3;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function normalizeExportParams(raw: ZhtMapViewExportParams): ZhtMapViewExportParams {
  const width = Math.round(clamp(raw.width, PNG_MIN_EDGE, PNG_MAX_EDGE));
  const height = Math.round(clamp(raw.height, PNG_MIN_EDGE, PNG_MAX_EDGE));
  const dpi = Math.round(clamp(raw.dpi, DPI_MIN, DPI_MAX));
  return { width, height, dpi };
}

function waitIdle(map: Map): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error('idle-timeout')), 45000);
    try {
      map.once('idle', () => {
        window.clearTimeout(t);
        resolve();
      });
    } catch (e) {
      window.clearTimeout(t);
      reject(e);
    }
  });
}

/** 触发一帧绘制后再 idle，利于瓦片贴齐 */
function waitIdleTwice(map: Map): Promise<void> {
  return waitIdle(map).then(
    () =>
      new Promise<void>((resolve, reject) => {
        window.requestAnimationFrame(() => {
          waitIdle(map).then(resolve).catch(reject);
        });
      }),
  );
}

/** `dom`：含 POI / 行政卡片等 DOM；`canvas`：仅 WebGL 回退 */
export type ZhtMapExportCaptureMode = 'dom' | 'canvas';

/**
 * 将当前地图相机不变，临时改变宿主尺寸与像素比，用 html-to-image 截取整容器（含 Marker），导出 PNG 并触发下载
 */

export async function exportMapHostToPngDownload(
  map: Map,
  host: HTMLElement,
  raw: ZhtMapViewExportParams,
  filenameBase = 'zht-map-export',
): Promise<ZhtMapExportCaptureMode> {
  const { width, height, dpi } = normalizeExportParams(raw);
  const root = map.getContainer?.() ?? host;
  if (!root) throw new Error('no-container');

  const prevPixelRatio = map.getPixelRatio();
  const prevInlineWidth = host.style.width;
  const prevInlineHeight = host.style.height;
  const prevFlex = host.style.flex;
  const prevMinWidth = host.style.minWidth;
  const prevMinHeight = host.style.minHeight;
  const prevAlignSelf = host.style.alignSelf;
  const prevBoxSizing = host.style.boxSizing;

  const pixelRatio = clamp(dpi / 72, 0.5, PIXEL_RATIO_MAX);
  const cssW = Math.ceil(width / pixelRatio);
  const cssH = Math.ceil(height / pixelRatio);

  try {
    /** 解除 flex:1 等对显式 height 的挤压，保证布局尺寸与导出截取一致 */
    host.style.flex = 'none';
    host.style.alignSelf = 'flex-start';
    host.style.boxSizing = 'border-box';
    host.style.minWidth = `${cssW}px`;
    host.style.minHeight = `${cssH}px`;
    host.style.width = `${cssW}px`;
    host.style.height = `${cssH}px`;
    map.setPixelRatio(pixelRatio);
    map.resize();
    map.triggerRepaint();
    // 部分环境 idle 偶发不触发，加超时避免一直转圈
    await Promise.race([waitIdleTwice(map), new Promise<void>(r => window.setTimeout(r, 2800))]);
    map.triggerRepaint();
    await new Promise<void>(r => requestAnimationFrame(() => r()));
    await new Promise<void>(r => requestAnimationFrame(() => r()));

    /** 必须与 html-to-image 内部 SVG 尺寸一致，否则 toCanvas 会把图硬拉到 canvasWidth/Height 造成拉伸 */
    const rw = Math.max(1, Math.round(root.clientWidth));
    const rh = Math.max(1, Math.round(root.clientHeight));

    /** 整图 DOM（底图 WebGL + POI / 行政 Marker、控件）；宽高均用实测，避免比例错位 */
    let blob: Blob | null = await toBlob(root, {
      width: rw,
      height: rh,
      canvasWidth: rw,
      canvasHeight: rh,
      pixelRatio: 1,
      cacheBust: true,
      type: 'image/png',
    }).catch(() => null);

    /** html-to-image 失败时（如跨域瓦片污染）回退为纯 WebGL canvas */
    let mode: ZhtMapExportCaptureMode = 'dom';
    if (!blob || blob.size < 32) {
      const canvas = map.getCanvas?.();
      if (!canvas) throw new Error('empty-blob');
      mode = 'canvas';
      blob = await new Promise<Blob | null>(resolve => {
        canvas.toBlob(b => resolve(b), 'image/png');
      });
    }
    if (!blob || blob.size < 16) throw new Error('empty-blob');

    const stamp = new Date();
    const pad = (x: number) => String(x).padStart(2, '0');
    const fname = `${filenameBase}-${stamp.getFullYear()}${pad(stamp.getMonth() + 1)}${pad(stamp.getDate())}-${pad(stamp.getHours())}${pad(stamp.getMinutes())}${pad(stamp.getSeconds())}.png`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fname;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    return mode;
  } finally {
    host.style.width = prevInlineWidth;
    host.style.height = prevInlineHeight;
    host.style.flex = prevFlex;
    host.style.minWidth = prevMinWidth;
    host.style.minHeight = prevMinHeight;
    host.style.alignSelf = prevAlignSelf;
    host.style.boxSizing = prevBoxSizing;
    map.setPixelRatio(prevPixelRatio);
    map.resize();
    map.triggerRepaint();
  }
}

/**
 * 按当前地图宿主框比例，长边缩放到 `maxEdge` 的推荐导出像素（避免默认正方形与视口比例不一致导致整图截取被纵向/横向拉伸）
 */
export function getSuggestedExportSizeFromHost(
  host: HTMLElement | null,
  maxEdge = 1920,
): { width: number; height: number } {
  if (!host) return { width: 1920, height: 1080 };
  const rw = host.clientWidth;
  const rh = host.clientHeight;
  if (rw < 32 || rh < 32) return { width: 1920, height: 1080 };
  const s = maxEdge / Math.max(rw, rh);
  return { width: Math.round(rw * s), height: Math.round(rh * s) };
}

export { PNG_MAX_EDGE, PNG_MIN_EDGE, DPI_MIN, DPI_MAX, PIXEL_RATIO_MAX };
