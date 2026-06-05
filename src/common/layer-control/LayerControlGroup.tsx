/**
 * 图层控制 · 一级组（可展开 + 父级全选/全不选 + 二级列表）
 */
import React from 'react';
import { Checkbox } from 'antd';
import { ChevronRight } from 'lucide-react';
import { LayerControlRow } from './LayerControlRow';
import {
  computeGroupCheckState,
  setAllChildrenChecked,
  toggleChildChecked,
} from './layerControlState';
import type { LayerControlChildConfig, LayerControlGroupSubs } from './types';

export type LayerControlGroupProps = {
  groupKey: string;
  label: string;
  children: LayerControlChildConfig[];
  subs: LayerControlGroupSubs;
  onSubsChange: (next: LayerControlGroupSubs) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  groupStat?: string;
};

export const LayerControlGroup: React.FC<LayerControlGroupProps> = ({
  label,
  children,
  subs,
  onSubsChange,
  expanded,
  onExpandedChange,
  groupStat,
}) => {
  const { allChecked, someChecked } = computeGroupCheckState(children, subs);

  return (
    <div className="ax-lc-group">
      <LayerControlRow
        className="ax-lc-row--parent"
        chevron={
          <button
            type="button"
            className="ax-lc-chevron-btn"
            aria-expanded={expanded}
            aria-label={expanded ? '收起' : '展开'}
            onClick={() => onExpandedChange(!expanded)}
          >
            <ChevronRight
              size={12}
              strokeWidth={2}
              className={expanded ? 'ax-lc-chevron__svg ax-lc-chevron__svg--open' : 'ax-lc-chevron__svg'}
              aria-hidden
            />
          </button>
        }
        check={
          <Checkbox
            className="ax-lc-check"
            checked={allChecked}
            indeterminate={someChecked}
            onChange={e => onSubsChange(setAllChildrenChecked(children, e.target.checked))}
          />
        }
        label={<span className="ax-lc-label">{label}</span>}
        stat={groupStat ? <span className="ax-lc-stat">{groupStat}</span> : null}
      />

      {expanded && (
        <ul className="ax-lc-subs">
          {children.map(sub => (
            <li key={sub.key}>
              <LayerControlRow
                className="ax-lc-row--sub"
                check={
                  <Checkbox
                    className="ax-lc-check"
                    checked={Boolean(subs[sub.key])}
                    onChange={e =>
                      onSubsChange(toggleChildChecked(subs, sub.key, e.target.checked))
                    }
                  />
                }
                label={
                  <span className="ax-lc-label ax-lc-label--sub">
                    {sub.color ? (
                      <span className="ax-lc-legend-dot" style={{ background: sub.color }} />
                    ) : null}
                    {sub.label}
                  </span>
                }
                stat={sub.stat ? <span className="ax-lc-stat">{sub.stat}</span> : null}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
