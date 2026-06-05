import React, { useMemo } from 'react';
import { Tree } from 'antd';
import type { RiskIndicatorRow } from './types';
import {
  INDICATOR_TREE_ALL_KEY,
  buildIndicatorTypeTree,
  countIndicatorsForTreeKey,
  defaultIndicatorTreeExpandedKeys,
} from './indicatorTypeTreeData';

interface Props {
  indicators: RiskIndicatorRow[];
  selectedKey: string;
  onSelect: (key: string) => void;
}

export const IndicatorTypeTree: React.FC<Props> = ({ indicators, selectedKey, onSelect }) => {
  const treeData = useMemo(() => buildIndicatorTypeTree(indicators), [indicators]);
  const expandedKeys = useMemo(() => defaultIndicatorTreeExpandedKeys(), []);
  const allCount = countIndicatorsForTreeKey(indicators, INDICATOR_TREE_ALL_KEY);
  const isAllSelected = selectedKey === INDICATOR_TREE_ALL_KEY;
  const treeSelectedKeys = isAllSelected ? [] : [selectedKey];

  return (
    <div className="dq-indicator-tree">
      <button
        type="button"
        className={`dq-indicator-tree-title${isAllSelected ? ' dq-indicator-tree-title-active' : ''}`}
        onClick={() => onSelect(INDICATOR_TREE_ALL_KEY)}
      >
        全部指标（{allCount}）
      </button>
      <Tree
        showLine={{ showLeafIcon: false }}
        blockNode
        selectedKeys={treeSelectedKeys}
        defaultExpandedKeys={expandedKeys}
        treeData={treeData}
        onSelect={keys => {
          const key = keys[0];
          if (typeof key === 'string') onSelect(key);
        }}
      />
    </div>
  );
};

export { INDICATOR_TREE_ALL_KEY };
