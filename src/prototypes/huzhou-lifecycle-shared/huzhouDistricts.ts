/**
 * 湖州市下辖区县（与建管画像区县下拉、行政界 GeoJSON 五县一致）
 */
export const HUZHOU_FIVE_DISTRICTS = [
  '吴兴区',
  '南浔区',
  '德清县',
  '长兴县',
  '安吉县',
] as const;

export type HuzhouDistrictName = (typeof HUZHOU_FIVE_DISTRICTS)[number];

const SHORT_BY_DISTRICT: Record<HuzhouDistrictName, string> = {
  吴兴区: '吴兴',
  南浔区: '南浔',
  德清县: '德清',
  长兴县: '长兴',
  安吉县: '安吉',
};

/** 将台账/快照中的区划文案规范为五区县之一；无法识别时返回 null */
export function normalizeHuzhouDistrictLabel(
  raw: string | number | null | undefined,
): HuzhouDistrictName | null {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  if (!s) return null;
  if ((HUZHOU_FIVE_DISTRICTS as readonly string[]).includes(s)) {
    return s as HuzhouDistrictName;
  }
  for (const full of HUZHOU_FIVE_DISTRICTS) {
    const short = SHORT_BY_DISTRICT[full];
    if (s.includes(full) || s.includes(short)) {
      return full;
    }
  }
  return null;
}

export function formatHuzhouDistrictDisplay(
  raw: string | number | null | undefined,
): string {
  return normalizeHuzhouDistrictLabel(raw) ?? '—';
}

/** 行政区划代码 → 五区县展示名（预审选址等事项「所在区县」） */
const XZQDM_TO_DISTRICT: Record<string, HuzhouDistrictName> = {
  '330502': '吴兴区',
  '330503': '南浔区',
  '330521': '德清县',
  '330522': '长兴县',
  '330523': '安吉县',
};

export function formatHuzhouDistrictFromXzqdm(
  code: string | number | null | undefined,
): string {
  if (code == null || code === '') return '—';
  const s = String(code).trim();
  const hit = XZQDM_TO_DISTRICT[s] ?? XZQDM_TO_DISTRICT[s.slice(0, 6)];
  if (hit) return hit;
  return formatHuzhouDistrictDisplay(s);
}
