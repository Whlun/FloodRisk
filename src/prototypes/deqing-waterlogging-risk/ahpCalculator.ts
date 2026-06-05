/** Saaty 随机一致性指标 RI（n=1..10） */
const RI_TABLE: Record<number, number> = {
  1: 0,
  2: 0,
  3: 0.58,
  4: 0.9,
  5: 1.12,
  6: 1.24,
  7: 1.32,
  8: 1.41,
  9: 1.45,
  10: 1.49,
};

/** Saaty 1–9 标度离散值 */
export const SAATY_SCALE = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export interface AhpResult {
  weights: number[];
  lambdaMax: number;
  ci: number;
  cr: number;
  /** CR ≤ 0.1 视为通过 */
  consistent: boolean;
}

/** 校验方阵：对角为 1，互反 a_ij = 1/a_ji */
export function validatePairwiseMatrix(matrix: number[][]): string | null {
  const n = matrix.length;
  if (n === 0) return '矩阵不能为空';
  for (let i = 0; i < n; i++) {
    if (matrix[i].length !== n) return '须为 n×n 方阵';
    for (let j = 0; j < n; j++) {
      const v = matrix[i][j];
      if (!Number.isFinite(v) || v <= 0) return `第 ${i + 1} 行第 ${j + 1} 列须为正数`;
      if (i === j && Math.abs(v - 1) > 1e-6) return '对角线元素须为 1';
      if (i !== j && Math.abs(v * matrix[j][i] - 1) > 0.05) {
        return `第 ${i + 1}、${j + 1} 元素不满足互反性（a_ij × a_ji ≈ 1）`;
      }
    }
  }
  return null;
}

/** 和积法（几何平均法）求 AHP 权重与一致性检验 */
export function calculateAhpWeights(matrix: number[][]): AhpResult | null {
  const err = validatePairwiseMatrix(matrix);
  if (err) return null;

  const n = matrix.length;
  if (n === 1) {
    return { weights: [1], lambdaMax: 1, ci: 0, cr: 0, consistent: true };
  }

  const colSum = new Array<number>(n).fill(0);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) colSum[j] += matrix[i][j];
  }

  const normalized = matrix.map(row => row.map((v, j) => v / colSum[j]));
  const weights = normalized.map(row => row.reduce((a, b) => a + b, 0) / n);

  let lambdaMax = 0;
  for (let i = 0; i < n; i++) {
    let weightedSum = 0;
    for (let j = 0; j < n; j++) weightedSum += matrix[i][j] * weights[j];
    lambdaMax += weightedSum / weights[i];
  }
  lambdaMax /= n;

  const ci = (lambdaMax - n) / (n - 1);
  const ri = RI_TABLE[n] ?? RI_TABLE[10];
  const cr = ri === 0 ? 0 : ci / ri;

  return {
    weights,
    lambdaMax,
    ci,
    cr,
    consistent: cr <= 0.1,
  };
}

/** 将比值约束到 Saaty 标度（取最近离散值） */
export function clampToSaatyScale(ratio: number): number {
  if (!Number.isFinite(ratio) || ratio <= 0) return 1;
  const candidates = [...SAATY_SCALE, ...SAATY_SCALE.map(v => 1 / v)];
  let best = 1;
  let bestDiff = Infinity;
  for (const c of candidates) {
    const diff = Math.abs(Math.log(c) - Math.log(ratio));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = c;
    }
  }
  return best;
}

/** 由权重向量反推两两比较矩阵（用于从附录 E 初始化） */
export function weightsToPairwiseMatrix(weights: number[]): number[][] {
  const n = weights.length;
  const matrix = Array.from({ length: n }, () => new Array<number>(n).fill(1));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const wi = weights[i] > 0 ? weights[i] : 1e-9;
      const wj = weights[j] > 0 ? weights[j] : 1e-9;
      const val = clampToSaatyScale(wi / wj);
      matrix[i][j] = val;
      matrix[j][i] = 1 / val;
    }
  }
  return matrix;
}

/** 更新上三角元素并同步互反下三角 */
export function setPairwiseValue(
  matrix: number[][],
  row: number,
  col: number,
  value: number,
): number[][] {
  const n = matrix.length;
  const next = matrix.map(r => [...r]);
  const v = Math.min(9, Math.max(1 / 9, value));
  next[row][col] = v;
  next[col][row] = 1 / v;
  for (let i = 0; i < n; i++) next[i][i] = 1;
  return next;
}

/** 创建 n 阶单位矩阵（全部同等重要） */
export function createIdentityMatrix(n: number): number[][] {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 1)),
  );
}
