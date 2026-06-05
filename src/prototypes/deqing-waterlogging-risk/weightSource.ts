/** 指标权重来源（用于架构图展示与说明） */
export type WeightSource = 'appendix_e' | 'ahp' | 'manual';

export const WEIGHT_SOURCE_LABEL: Record<WeightSource, string> = {
  appendix_e: '附录 E 参考',
  ahp: 'AHP 推导',
  manual: '手工调整',
};

export const WEIGHT_SOURCE_COLOR: Record<WeightSource, string> = {
  appendix_e: 'blue',
  ahp: 'purple',
  manual: 'orange',
};

import { persistGetItem, persistSetItem } from './persistenceStorage';

const STORAGE_KEY = 'dq-waterlogging-weight-source-v1';

export const WORKSPACE_WEIGHT_SOURCE_STORAGE_KEY = STORAGE_KEY;

export function loadWeightSource(): WeightSource {
  try {
    const raw = persistGetItem(STORAGE_KEY);
    if (raw === 'appendix_e' || raw === 'ahp' || raw === 'manual') return raw;
  } catch {
    /* ignore */
  }
  return 'appendix_e';
}

export function saveWeightSource(source: WeightSource): void {
  persistSetItem(STORAGE_KEY, source);
}
