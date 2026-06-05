/**
 * 建设工程画像 · 地图地块事项阶段（演示分配，与左栏 PhaseKey 一致）
 * 全量土地利用面按 osm_id 稳定哈希到 9 个阶段之一。
 */
export const HZ_CM_PHASE_KEYS = [
  'pre-review',
  'farmland',
  'land-supply',
  'land-permit',
  'first-reg',
  'eng-permit',
  'con-permit',
  'land-review',
  'plan-verify',
] as const;

export type HzCmPhaseKey = (typeof HZ_CM_PHASE_KEYS)[number];

export function assignCmPhaseKey(seed: string): HzCmPhaseKey {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return HZ_CM_PHASE_KEYS[h % HZ_CM_PHASE_KEYS.length];
}
