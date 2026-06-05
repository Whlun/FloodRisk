import type maplibregl from 'maplibre-gl';

export type LngLatBoundsPair = [[number, number], [number, number]];

/** 各区县固定 maxZoom，避免切换时比例尺来回跳 */
const DISTRICT_MAX_ZOOM: Record<string, number> = {
  吴兴区: 11,
  南浔区: 11.1,
  长兴县: 10.6,
  安吉县: 10.4,
  德清县: 10.5,
};

/** 外扩比例：略小于此前，配合固定 zoom 更稳定 */
const DISTRICT_EXPAND_RATIO = 0.09;

function expandBounds(bounds: LngLatBoundsPair, ratio = DISTRICT_EXPAND_RATIO): LngLatBoundsPair {
  const [[west, south], [east, north]] = bounds;
  const lngPad = (east - west) * ratio;
  const latPad = (north - south) * ratio;
  return [
    [west - lngPad, south - latPad],
    [east + lngPad, north + latPad],
  ];
}

/** 区县留白：固定边距，减少随容器计算带来的缩放抖动 */
function paddingForDistrict(): { top: number; bottom: number; left: number; right: number } {
  return { top: 72, bottom: 52, left: 56, right: 56 };
}

function maxZoomForDistrict(districtName: string | undefined, bounds: LngLatBoundsPair): number {
  if (districtName && DISTRICT_MAX_ZOOM[districtName] != null) {
    return DISTRICT_MAX_ZOOM[districtName]!;
  }
  const [[west, south], [east, north]] = bounds;
  const span = Math.max(east - west, north - south);
  if (span > 0.55) return 10.4;
  if (span > 0.45) return 10.7;
  return 11;
}

export type FitMapToBoundsOptions = {
  duration?: number;
  maxZoom?: number;
  /** 全市：原先默认比例；区县：完整展示行政界（不锁定缩放） */
  scope?: 'city' | 'district';
  /** 区县全称，用于固定比例尺（如「吴兴区」） */
  districtName?: string;
};

/**
 * 将地图视角调整到范围中心与比例尺（每次调用都会重新 fit）
 */
export function fitMapToBounds(
  map: maplibregl.Map,
  bounds: LngLatBoundsPair,
  options: FitMapToBoundsOptions = {},
): void {
  const [[west, south], [east, north]] = bounds;
  if (!Number.isFinite(west + south + east + north)) return;

  map.setPitch(0);
  map.setBearing(0);
  clearMapMaxBounds(map);

  const scope = options.scope ?? 'city';

  if (scope === 'city') {
    map.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      {
        padding: 48,
        duration: options.duration ?? 800,
        maxZoom: options.maxZoom ?? 11.5,
        essential: true,
      },
    );
    return;
  }

  const fitTarget = expandBounds(bounds);
  const maxZoom = options.maxZoom ?? maxZoomForDistrict(options.districtName, bounds);

  const [[fitWest, fitSouth], [fitEast, fitNorth]] = fitTarget;
  map.fitBounds(
    [
      [fitWest, fitSouth],
      [fitEast, fitNorth],
    ],
    {
      padding: paddingForDistrict(),
      duration: options.duration ?? 800,
      maxZoom,
      essential: true,
    },
  );
}

/** 解除视野锁定并 fit 到范围 */
export function clearMapMaxBounds(map: maplibregl.Map): void {
  map.setMaxBounds(null as unknown as maplibregl.LngLatBoundsLike);
}
