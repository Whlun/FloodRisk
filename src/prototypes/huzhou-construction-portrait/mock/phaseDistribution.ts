import type { PhaseKey, PhaseMetric } from '../types';

/** 事项阶段分布（面积/个数，对齐 docx 表 17–18） */
export const PHASE_METRICS: PhaseMetric[] = [
  { key: 'pre-review', label: '预审与选址', area: 154762.98, count: 720, progressPct: 6 },
  { key: 'farmland', label: '农转用报批', area: 935886.46, count: 26555, progressPct: 35 },
  { key: 'land-supply', label: '土地供应', area: 875162.51, count: 22202, progressPct: 9 },
  { key: 'land-permit', label: '用地规划许可', area: 377643.35, count: 3824, progressPct: 14 },
  { key: 'first-reg', label: '土地首次登记', area: 1022076.66, count: 1734, progressPct: 18 },
  { key: 'eng-permit', label: '工程规划许可', area: 512300.55, count: 3824, progressPct: 16 },
  { key: 'land-review', label: '用地复核验收', area: 88600.2, count: 341, progressPct: 3 },
  { key: 'plan-verify', label: '规划核实', area: 245500.8, count: 2555, progressPct: 14 },
  { key: 'estate-cert', label: '不动产权证', area: 468200.0, count: 3510, progressPct: 15 },
];

export function getPhaseMetric(key: PhaseKey): PhaseMetric {
  const m = PHASE_METRICS.find(item => item.key === key);
  if (!m) throw new Error(`未知阶段: ${key}`);
  return m;
}

/** 阶段汇总（右侧看板：个数 + 面积公顷） */
export function getPhaseBoardSummary(key: PhaseKey): { count: number; areaHa: number; label: string } {
  const m = getPhaseMetric(key);
  return {
    label: m.label,
    count: m.count,
    areaHa: m.area / 10000,
  };
}

/** 按个数占比计算各阶段百分比（进度条默认口径） */
export function getPhaseCountPercent(metrics: PhaseMetric[] = PHASE_METRICS): Record<string, number> {
  const total = metrics.reduce((sum, m) => sum + m.count, 0);
  if (total <= 0) return {};
  const out: Record<string, number> = {};
  let allocated = 0;
  metrics.forEach((m, i) => {
    if (i === metrics.length - 1) {
      out[m.key] = Math.max(0, 100 - allocated);
      return;
    }
    const pct = Math.round((m.count / total) * 100);
    out[m.key] = pct;
    allocated += pct;
  });
  return out;
}

/** 格网热力演示权重（10×8） */
export function buildPhaseHeatGrid(): number[][] {
  const rows = 8;
  const cols = 10;
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      const v = ((r + 1) * (c + 2)) % 11;
      return v / 10;
    }),
  );
}
