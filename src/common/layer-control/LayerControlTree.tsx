/**
 * 图层控制 · 多组树（含可选平铺行、分区标题、底部说明）
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Checkbox } from 'antd';
import { ChevronRight } from 'lucide-react';
import { LayerControlGroup } from './LayerControlGroup';
import {
  computeSectionCheckState,
  groupHasAnyChecked,
  setAllGroupsChildrenChecked,
} from './layerControlState';
import type { LayerControlFlatRowConfig, LayerControlGroupConfig, LayerControlGroupSubs } from './types';

export type LayerControlTreeProps = {
  /** 一级组配置 */
  groups: LayerControlGroupConfig[];
  /** 各组二级勾选状态 */
  value: Record<string, LayerControlGroupSubs>;
  onChange: (groupKey: string, nextSubs: LayerControlGroupSubs) => void;
  /** 无子级的平铺行（如行政区划） */
  flatRows?: LayerControlFlatRowConfig[];
  /** 树区域标题（带分区级全选/全不选 Checkbox） */
  sectionTitle?: string;
  /** 分区标题批量切换；未提供时依次调用 onChange */
  onBatchChange?: (nextValue: Record<string, LayerControlGroupSubs>) => void;
  hint?: string;
  /** 初始展开的一级 key；默认展开有勾选子项的组 */
  defaultExpandedKeys?: string[];
  /** 分区标题初始是否展开；默认 true */
  defaultSectionExpanded?: boolean;
  className?: string;
};

export const LayerControlTree: React.FC<LayerControlTreeProps> = ({
  groups,
  value,
  onChange,
  flatRows,
  sectionTitle,
  onBatchChange,
  hint,
  defaultExpandedKeys,
  defaultSectionExpanded = true,
  className,
}) => {
  const activeGroupKeys = useMemo(
    () =>
      groups.filter(g => groupHasAnyChecked(g.children, value[g.key] ?? {})).map(g => g.key),
    [groups, value],
  );

  const [expandedKeys, setExpandedKeys] = useState<string[]>(
    () => defaultExpandedKeys ?? activeGroupKeys,
  );

  const [sectionExpanded, setSectionExpanded] = useState(defaultSectionExpanded);

  useEffect(() => {
    setExpandedKeys(prev => {
      const merged = new Set([...prev, ...activeGroupKeys]);
      return [...merged];
    });
  }, [activeGroupKeys.join(',')]);

  const sectionCheck = useMemo(
    () => computeSectionCheckState(groups, value),
    [groups, value],
  );

  const handleSectionToggle = (checked: boolean) => {
    const nextValue = setAllGroupsChildrenChecked(groups, checked);
    if (onBatchChange) {
      onBatchChange(nextValue);
    } else {
      groups.forEach(group => onChange(group.key, nextValue[group.key]));
    }
  };

  const rootClass = ['ax-lc-popover', className].filter(Boolean).join(' ');

  return (
    <div className={rootClass}>
      {flatRows?.map(row => (
        <div key={row.key} className="ax-lc-flat-row">
          <Checkbox
            checked={row.checked}
            onChange={e => row.onChange(e.target.checked)}
            onClick={e => e.stopPropagation()}
          >
            {row.label}
          </Checkbox>
        </div>
      ))}

      {groups.length > 0 && (
        <div className="ax-lc-section">
          {sectionTitle ? (
            <div className="ax-lc-section__header">
              <button
                type="button"
                className="ax-lc-section__chevron"
                aria-expanded={sectionExpanded}
                aria-label={sectionExpanded ? '收起' : '展开'}
                onClick={() => setSectionExpanded(open => !open)}
              >
                <ChevronRight
                  size={12}
                  strokeWidth={2}
                  className={
                    sectionExpanded ? 'ax-lc-chevron__svg ax-lc-chevron__svg--open' : 'ax-lc-chevron__svg'
                  }
                  aria-hidden
                />
              </button>
              <Checkbox
                className="ax-lc-section__check"
                checked={sectionCheck.allChecked}
                indeterminate={sectionCheck.someChecked}
                onChange={e => handleSectionToggle(e.target.checked)}
                onClick={e => e.stopPropagation()}
              >
                {sectionTitle}
              </Checkbox>
            </div>
          ) : null}
          {sectionExpanded ? (
            <div className={sectionTitle ? 'ax-lc-section__body' : undefined}>
              <div className="ax-lc-groups">
                {groups.map(group => (
                  <LayerControlGroup
                    key={group.key}
                    groupKey={group.key}
                    label={group.label}
                    children={group.children}
                    subs={value[group.key] ?? {}}
                    onSubsChange={next => onChange(group.key, next)}
                    expanded={expandedKeys.includes(group.key)}
                    onExpandedChange={open => {
                      setExpandedKeys(prev =>
                        open ? [...new Set([...prev, group.key])] : prev.filter(k => k !== group.key),
                      );
                    }}
                    groupStat={group.groupStat}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {hint ? <p className="ax-lc-hint">{hint}</p> : null}
    </div>
  );
};
