/**
 * 湖州空间全画像 · 图层控制（基于公共模块 src/common/layer-control）
 */
import React, { useMemo } from 'react';
import type { HuzhouSpaceMode } from '../huzhouMapConstants';
import { SPACE_LAYER_TREE, spaceModeTotalAreaHa } from '../hzLandUseLayers';
import { HUZHOU_SPACE_MODES, type HzLayerControlState } from '../hzLayerControlState';
import {
  LayerControlTree,
  type LayerControlGroupConfig,
} from '../../../common/layer-control';

export type HzLayerControlPopoverProps = {
  value: HzLayerControlState;
  onChange: (next: HzLayerControlState) => void;
};

function formatAreaHa(ha: number) {
  return `${ha.toFixed(2)} 公顷`;
}

function buildGroupConfigs(): LayerControlGroupConfig[] {
  return HUZHOU_SPACE_MODES.map(mode => {
    const group = SPACE_LAYER_TREE[mode];
    return {
      key: mode,
      label: group.label,
      groupStat: formatAreaHa(spaceModeTotalAreaHa(mode)),
      children: group.subLayers.map(sub => ({
        key: sub.key,
        label: sub.label,
        color: sub.color,
        stat: formatAreaHa(sub.areaHa),
      })),
    };
  });
}

const GROUP_CONFIGS = buildGroupConfigs();

export const HzLayerControlPopover: React.FC<HzLayerControlPopoverProps> = ({ value, onChange }) => {
  const subsByGroup = useMemo(
    () =>
      Object.fromEntries(HUZHOU_SPACE_MODES.map(m => [m, value.modes[m].subs])) as Record<
        string,
        Record<string, boolean>
      >,
    [value],
  );

  return (
    <div className="zht-map-layer-popover">
      <div className="zht-layer-control-popover__head">
        <span className="zht-layer-control-popover__title">图层控制</span>
      </div>

      <LayerControlTree
        flatRows={[
          {
            key: 'admin',
            label: '行政区划',
            checked: value.adminBoundary,
            onChange: c => onChange({ ...value, adminBoundary: c }),
          },
        ]}
        sectionTitle="空间图层"
        groups={GROUP_CONFIGS}
        value={subsByGroup}
        onChange={(groupKey, nextSubs) => {
          const mode = groupKey as HuzhouSpaceMode;
          const anyChecked = GROUP_CONFIGS.find(g => g.key === mode)!.children.some(c => nextSubs[c.key]);
          onChange({
            ...value,
            activeMode: mode,
            modes: {
              ...value.modes,
              [mode]: {
                subs: nextSubs,
                enabled: anyChecked,
              },
            },
          });
        }}
        onBatchChange={nextSubsByGroup => {
          onChange({
            ...value,
            modes: HUZHOU_SPACE_MODES.reduce(
              (acc, mode) => {
                const subs = nextSubsByGroup[mode] ?? value.modes[mode].subs;
                const anyChecked = GROUP_CONFIGS.find(g => g.key === mode)!.children.some(c => subs[c.key]);
                acc[mode] = { subs, enabled: anyChecked };
                return acc;
              },
              { ...value.modes },
            ),
          });
        }}
        defaultExpandedKeys={
          value.modes[value.activeMode]
            ? [value.activeMode]
            : HUZHOU_SPACE_MODES.filter(m =>
                SPACE_LAYER_TREE[m].subLayers.some(s => value.modes[m].subs[s.key]),
              )
        }
      />
    </div>
  );
};
