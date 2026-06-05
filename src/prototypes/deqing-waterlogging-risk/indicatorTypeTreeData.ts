import type { DataNode } from 'antd/es/tree';
import {
  HAZARD_POINT_TYPE_LABEL,
  LEVEL1_FACTOR_LABEL,
  type HazardPointType,
  type Level1Factor,
  type RiskIndicatorRow,
} from './types';

export const INDICATOR_TREE_ALL_KEY = 'all';

const FORMATION_POINT_TYPES: HazardPointType[] = ['SUNKEN', 'TUNNEL', 'UNDERGROUND', 'LOW_LYING'];

const LEVEL1_ORDER: Level1Factor[] = ['HAZARD', 'FORMATION', 'BEARING', 'PREVENTION'];

export function countIndicatorsForTreeKey(indicators: RiskIndicatorRow[], key: string): number {
  return indicators.filter(row => matchesIndicatorTreeKey(row, key)).length;
}

export function matchesIndicatorTreeKey(row: RiskIndicatorRow, key: string): boolean {
  if (key === INDICATOR_TREE_ALL_KEY) return true;
  if (key.includes(':')) {
    const [level1, pointType] = key.split(':') as [Level1Factor, HazardPointType];
    return row.level1 === level1 && row.applicableTypes.includes(pointType);
  }
  return row.level1 === (key as Level1Factor);
}

export function buildIndicatorTypeTree(indicators: RiskIndicatorRow[]): DataNode[] {
  const titleWithCount = (label: string, key: string) => {
    const count = countIndicatorsForTreeKey(indicators, key);
    return `${label}（${count}）`;
  };

  const formationChildren: DataNode[] = FORMATION_POINT_TYPES.map(pt => ({
    key: `FORMATION:${pt}`,
    title: titleWithCount(HAZARD_POINT_TYPE_LABEL[pt], `FORMATION:${pt}`),
    isLeaf: true,
  }));

  const level1Nodes: DataNode[] = LEVEL1_ORDER.map(level1 => {
    if (level1 === 'FORMATION') {
      return {
        key: level1,
        title: titleWithCount(LEVEL1_FACTOR_LABEL[level1], level1),
        children: formationChildren,
      };
    }
    return {
      key: level1,
      title: titleWithCount(LEVEL1_FACTOR_LABEL[level1], level1),
      isLeaf: true,
    };
  });

  return level1Nodes;
}

/** 树节点默认展开：四个一级因子 */
export function defaultIndicatorTreeExpandedKeys(): string[] {
  return [...LEVEL1_ORDER];
}
