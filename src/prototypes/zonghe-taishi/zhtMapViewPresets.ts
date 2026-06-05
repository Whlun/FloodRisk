/**
 * 综合态势 · 地图视角预设（localStorage 持久化）
 */

export const ZHT_MAP_VIEW_PRESETS_STORAGE_KEY = 'zht-map-view-presets-v1';

/** 单条预设数量上限（2 列网格约 6 行） */
export const ZHT_MAP_VIEW_PRESETS_MAX = 12;

export interface ZhtMapViewPreset {
  id: string;
  /** 展示名称 */
  label: string;
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
  /** 创建时间戳（排序用） */
  createdAt: number;
}

function safeParse(raw: string | null): ZhtMapViewPreset[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    const out: ZhtMapViewPreset[] = [];
    for (const item of v) {
      if (!item || typeof item !== 'object') continue;
      const o = item as Record<string, unknown>;
      const id = typeof o.id === 'string' ? o.id : '';
      const label = typeof o.label === 'string' ? o.label : '';
      const c = o.center;
      const center: [number, number] | null =
        Array.isArray(c) &&
        c.length >= 2 &&
        typeof c[0] === 'number' &&
        typeof c[1] === 'number' &&
        Number.isFinite(c[0]) &&
        Number.isFinite(c[1])
          ? [c[0], c[1]]
          : null;
      if (!id || !label || !center) continue;
      const zoom = typeof o.zoom === 'number' ? o.zoom : NaN;
      const bearing = typeof o.bearing === 'number' ? o.bearing : 0;
      const pitch = typeof o.pitch === 'number' ? o.pitch : 0;
      const createdAt = typeof o.createdAt === 'number' ? o.createdAt : Date.now();
      if (!Number.isFinite(zoom)) continue;
      out.push({ id, label, center, zoom, bearing, pitch, createdAt });
    }
    return out.sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

export function loadMapViewPresets(): ZhtMapViewPreset[] {
  if (typeof localStorage === 'undefined') return [];
  return safeParse(localStorage.getItem(ZHT_MAP_VIEW_PRESETS_STORAGE_KEY));
}

export function saveMapViewPresets(presets: ZhtMapViewPreset[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(ZHT_MAP_VIEW_PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // 配额满等：静默失败，由 UI 提示
  }
}

export function newPresetId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `zht-view-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** 下一条默认标签：视角 1、视角 2 … 跳过已占用的序号 */
export function nextDefaultPresetLabel(existing: ZhtMapViewPreset[]): string {
  const used = new Set<number>();
  const re = /^视角\s*(\d+)$/;
  for (const p of existing) {
    const m = p.label.trim().match(re);
    if (m) used.add(parseInt(m[1], 10));
  }
  let n = 1;
  while (used.has(n)) n += 1;
  return `视角 ${n}`;
}

export function presetToFlyToOptions(p: ZhtMapViewPreset): {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
} {
  return {
    center: p.center,
    zoom: p.zoom,
    bearing: p.bearing,
    pitch: p.pitch,
  };
}
