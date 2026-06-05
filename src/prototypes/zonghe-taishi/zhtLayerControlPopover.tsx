/**
 * 综合态势 · 图层控制 Popover 内容（树形折叠；说明文案在标题后问号 Tooltip 内）
 */
import React, { useCallback, useMemo, useState, type ComponentProps } from 'react';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { Button, Checkbox, Collapse, Radio, Space, Tooltip, message } from 'antd';
import { ChevronRight, Settings } from 'lucide-react';
import { ZhtPoiSvgIcon, getPollutionKindSvgKey, getWaterEnvCategorySvgKey } from './zhtPoiSvgIcons';
import type { ZhtLayerControlState } from './zhtLayerControlState';
import {
  ALL_POI_STATES_ON,
  DEFAULT_WATER_ENV_POI_LAYERS,
  ZHT_POI_STATE_HELP,
  ZHT_SYS_HYDRO_CATEGORY_ORDER,
  ZHT_WATER_ENV_CATEGORY_META,
  ZHT_WATER_ENV_CATEGORY_ORDER,
  ZHT_WATER_ENV_MAIN_CATEGORY_ORDER,
  WATER_ENV_POI_LAYERS_ALL_UNCHECKED,
  countUnifiedPointsByCategory,
  isWaterEnvBlueBusinessCategory,
  type ZhtPoiDisplayState,
  type ZhtWaterEnvCategoryId,
  type ZhtWaterEnvCategoryMeta,
} from './zhtWaterEnvPoiMeta';
import {
  ZHT_POLLUTION_KIND_LABEL,
  countPollutionPointsByKind,
  pollutionKindToLayerKey,
  type ZhtPollutionSourceKind,
} from './zhtPollutionSourceLayerData';

const PLACEHOLDER_TIP = '演示占位：未接入地图服务，仅保留勾选状态';

/** 合并 patch 后的完整图层状态（patch 内对 waterEnvPoiLayers / pollutionSourceLayers 均为整块替换） */
function mergeLayerControlPatch(v: ZhtLayerControlState, patch: Partial<ZhtLayerControlState>): ZhtLayerControlState {
  return { ...v, ...patch };
}

/**
 * 是否存在「应驱动地图绘点」的水环境子配置（与地图 `waterEnvPoiEnabled` + 各层过滤语义对齐）
 * —— 有主类勾选时：蓝类业务点即算；非蓝类须至少勾选一种四态（监测无信息点行但 states.info 仍可存 true）
 */
function anyWaterEnvChildActive(s: ZhtLayerControlState): boolean {
  for (const id of ZHT_WATER_ENV_CATEGORY_ORDER) {
    const L = s.waterEnvPoiLayers[id];
    if (!L?.enabled) continue;
    if (isWaterEnvBlueBusinessCategory(id)) return true;
    if (poiStateRowsForCategory(id).some(st => L.states[st])) return true;
  }
  const p = s.pollutionSourceLayers;
  if (p.ruralSewage || p.agriRural || p.industry) return true;
  if (s.poiPlaceholderDrainageEnterprise || s.poiPlaceholderCustomAnnotation) return true;
  return false;
}

/** 主类已开但四态全关时补默认全开，避免「看似勾了主类」地图却不绘点 */
function repairStatesForEnabledCategories(s: ZhtLayerControlState): { next: ZhtLayerControlState; repairedLayers: boolean } {
  let repaired = false;
  const layers = { ...s.waterEnvPoiLayers };
  for (const id of ZHT_WATER_ENV_CATEGORY_ORDER) {
    if (isWaterEnvBlueBusinessCategory(id)) continue;
    const L = layers[id];
    if (!L?.enabled) continue;
    const rows = poiStateRowsForCategory(id);
    if (rows.some(st => L.states[st])) continue;
    layers[id] = { ...L, states: { ...ALL_POI_STATES_ON } };
    repaired = true;
  }
  if (!repaired) return { next: s, repairedLayers: false };
  return { next: { ...s, waterEnvPoiLayers: layers }, repairedLayers: true };
}

const ALL_POI_STATES_FOR_COMPARE: ZhtPoiDisplayState[] = ['alarm', 'offline', 'online', 'info'];

/**
 * 与父级「水环境POI点位」勾选为开时写入的快照一致：总开 + 各类默认全开 + 污染源三全开 + 三占位全开。
 * 用于父级 Checkbox：`checked` 仅全选为真；否则若有任意子项生效则 `indeterminate`（对齐污染源分组）。
 */
function isWaterEnvPoiGroupAllSelected(v: ZhtLayerControlState): boolean {
  if (!v.waterEnvPoiEnabled) return false;
  const cur = v.waterEnvPoiLayers;
  const def = DEFAULT_WATER_ENV_POI_LAYERS;
  for (const id of ZHT_WATER_ENV_CATEGORY_ORDER) {
    const a = cur[id];
    const b = def[id];
    if (!a || !b) return false;
    if (a.enabled !== b.enabled) return false;
    for (const st of ALL_POI_STATES_FOR_COMPARE) {
      if (a.states[st] !== b.states[st]) return false;
    }
  }
  const p = v.pollutionSourceLayers;
  if (!p.ruralSewage || !p.agriRural || !p.industry) return false;
  if (!v.poiPlaceholderDrainageEnterprise || !v.poiPlaceholderCustomAnnotation) {
    return false;
  }
  return true;
}

/** 各分组说明（展示在标题后「?」的 Tooltip 中） */
const HELP = {
  admin:
    '勾选后地图展示行政区划名称提示面板。展开本分组后，可在子项「零直排区域标注」控制提示板内「雨污分流」「污水零直排」达标文案是否展示。',
  drainNet:
    '接入管网地图服务后，可在此分组控制雨水管网、污水管网、检查井等子图层显隐。（当前为演示占位）',
  waterPoi:
    '图层控制优先于「POI提示配置」。**泵站、排口、污水厂、排水户、水质监测站**：行首箭头展开/收起四态（**报警 / 离线 / 在线 / 信息点，默认折叠**）。**项目、湖泊、事务…水利七类** 仅主类开关，地图固定信息点蓝。问号均靠行右对齐。系统管理水利七类与主类同列。**污染源**箭头展开三类子图层（`config-center-data.ts`）。',
  remote: '接入遥感服务后可叠加遥感栅格图层；当前为演示占位，仅保留指标单选（不接瓦片）。',
  pipeFlow: '基于排水管线流向数据控制管线流向符号显隐。（当前为演示占位）',
  zero: '控制行政区划提示板内「雨污分流」「污水零直排」两行是否展示；达标为绿色，不达标为红色。',
  pollutionSource:
    '与系统管理「配置中心 · 污染源信息」同源台账（`config-center-data.ts`）：农村污水及集中处理设施、农业农村源、工业企业污染源；地图点位坐标与列表数据同步。展开后按子类勾选显隐。',
} as const;

/** 标题后问号：悬停查看说明 */
function HelpTip({ text }: { text: string }) {
  return (
    <Tooltip title={text} placement="topLeft" overlayStyle={{ maxWidth: 320 }}>
      <span
        className="zht-layer-control__help-icon"
        role="button"
        tabIndex={0}
        aria-label={`说明：${text}`}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
        }}
      >
        <QuestionCircleOutlined />
      </span>
    </Tooltip>
  );
}

/** 占位图层：勾选 + 问号（说明为未接服务占位）；可选 `legend` 为标签前小图标，与水环境主类图例一致 */
function PhCheckbox({
  checked,
  onChange,
  helpText = PLACEHOLDER_TIP,
  legend,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  helpText?: string;
  /** 图例 icon（建议 12px Lucide） */
  legend?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="zht-layer-control__label-row zht-layer-control__label-row--spread" onClick={e => e.stopPropagation()}>
      <Checkbox checked={checked} onChange={e => onChange(e.target.checked)} onClick={e => e.stopPropagation()}>
        {legend ? (
          <span className="zht-layer-control__checkbox-legend">
            <span className="zht-layer-water-poi-cat__icon" aria-hidden>
              {legend}
            </span>
            {children}
          </span>
        ) : (
          children
        )}
      </Checkbox>
      <span className="zht-layer-control__row-help-tail">
        <HelpTip text={helpText} />
      </span>
    </span>
  );
}

/** 水环境 POI 折叠内占位项：与泵站/排口等主类行同左缘（行首列占位 + PhCheckbox） */
function PhCheckboxWaterPoiAligned(props: ComponentProps<typeof PhCheckbox>) {
  return (
    <div className="zht-layer-water-poi-cat__row" onClick={e => e.stopPropagation()}>
      <span className="zht-layer-water-poi-chevron-spacer" aria-hidden />
      <PhCheckbox {...props} />
    </div>
  );
}

/** 四态在面板中的展示顺序（与业务优先级一致：报警 → 离线 → 在线 → 信息点） */
const POI_STATE_DISPLAY_ORDER: ZhtPoiDisplayState[] = ['alarm', 'offline', 'online', 'info'];

/** 图层子勾选展示用：所有水环境点位统一四态（报警/离线/在线/信息点） */
function poiStateRowsForCategory(_catId: ZhtWaterEnvCategoryId): ZhtPoiDisplayState[] {
  return POI_STATE_DISPLAY_ORDER;
}

const POI_STATE_LABEL: Record<ZhtPoiDisplayState, string> = {
  alarm: '报警',
  offline: '离线',
  online: '在线',
  info: '信息点',
};

const POI_STATE_SWATCH: Record<ZhtPoiDisplayState, string> = {
  alarm: '#ff4d4f',
  offline: '#8c8c8c',
  online: '#52c41a',
  info: '#1677ff',
};

const ZHT_WATER_ENV_META_BY_ID = Object.fromEntries(
  ZHT_WATER_ENV_CATEGORY_META.map(m => [m.id, m]),
) as Record<ZhtWaterEnvCategoryId, ZhtWaterEnvCategoryMeta>;

const LAYER_POI_ICON_SIZE = 14;

const CAT_SVG_ICON = (catId: ZhtWaterEnvCategoryId) => (
  <ZhtPoiSvgIcon iconKey={getWaterEnvCategorySvgKey(catId)} size={LAYER_POI_ICON_SIZE} />
);

/**
 * 单类水环境 POI：泵站/排口/污水厂/监测站为行首箭头 + 主勾选 + ?，**四态默认折叠**；蓝类业务点无四态行。
 */
function WaterEnvCategoryControls({
  catId,
  v,
  onChange,
  count,
}: {
  catId: ZhtWaterEnvCategoryId;
  v: ZhtLayerControlState;
  onChange: (patch: Partial<ZhtLayerControlState>) => void;
  count: number;
}) {
  const [statesOpen, setStatesOpen] = useState(false);
  const meta = ZHT_WATER_ENV_META_BY_ID[catId];
  const layer = v.waterEnvPoiLayers[catId];
  const blueBiz = isWaterEnvBlueBusinessCategory(catId);
  return (
    <div className="zht-layer-water-poi-cat">
      <div className="zht-layer-water-poi-cat__row" onClick={e => e.stopPropagation()}>
        {!blueBiz ? (
          <button
            type="button"
            className="zht-layer-water-poi-chevron"
            aria-expanded={statesOpen}
            aria-controls={`zht-poi-states-${catId}`}
            aria-label={statesOpen ? '收起四态' : '展开四态'}
            onClick={e => {
              e.stopPropagation();
              setStatesOpen(o => !o);
            }}
          >
            <ChevronRight
              size={12}
              strokeWidth={2}
              className={
                statesOpen ? 'zht-layer-water-poi-chevron__svg zht-layer-water-poi-chevron__svg--open' : 'zht-layer-water-poi-chevron__svg'
              }
              aria-hidden
            />
          </button>
        ) : (
          /* 无四态箭头时占位同宽，与泵站等行勾选左缘对齐 */
          <span className="zht-layer-water-poi-chevron-spacer" aria-hidden />
        )}
        <Checkbox
          checked={layer.enabled}
          onChange={e => {
            const en = e.target.checked;
            let nextLayer = { ...layer, enabled: en };
            // 总开关曾全关时四态全 false；仅勾主类会导致 enabled 真但无态可选，地图仍不绘点
            if (en && !blueBiz) {
              const rows = poiStateRowsForCategory(catId);
              if (!rows.some(st => nextLayer.states[st])) {
                nextLayer = { ...nextLayer, states: { ...ALL_POI_STATES_ON } };
              }
            }
            onChange({
              waterEnvPoiLayers: {
                ...v.waterEnvPoiLayers,
                [catId]: nextLayer,
              },
            });
          }}
          onClick={e => e.stopPropagation()}
        >
          <span className="zht-layer-water-poi-cat__title">
            <span className="zht-layer-water-poi-cat__icon" aria-hidden>
              {CAT_SVG_ICON(catId)}
            </span>
            {meta.label}（{count}）
          </span>
        </Checkbox>
        <span className="zht-layer-control__row-help-tail">
          <HelpTip text={meta.help} />
        </span>
      </div>
      {!blueBiz && statesOpen ? (
        <div
          className="zht-layer-water-poi-cat__states"
          id={`zht-poi-states-${catId}`}
          role="group"
          aria-label={catId === 'monitor' ? `${meta.label}状态筛选` : `${meta.label}四态筛选`}
        >
          {poiStateRowsForCategory(catId).map(st => (
            <div key={st} className="zht-layer-water-poi-state-row">
              <Checkbox
                disabled={!layer.enabled}
                checked={layer.states[st]}
                onChange={e =>
                  onChange({
                    waterEnvPoiLayers: {
                      ...v.waterEnvPoiLayers,
                      [catId]: {
                        ...layer,
                        states: { ...layer.states, [st]: e.target.checked },
                      },
                    },
                  })
                }
                onClick={e => e.stopPropagation()}
              >
                <span className="zht-layer-water-poi-state-row__label">
                  <span
                    className="zht-layer-water-poi-swatch"
                    style={{ backgroundColor: POI_STATE_SWATCH[st] }}
                    aria-hidden
                  />
                  {POI_STATE_LABEL[st]}
                </span>
              </Checkbox>
              <span className="zht-layer-control__row-help-tail">
                <HelpTip text={ZHT_POI_STATE_HELP[st]} />
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const POLLUTION_SUB_ROWS: {
  kind: ZhtPollutionSourceKind;
  help: string;
}[] = [
  {
    kind: 'rural_sewage',
    help: '台账字段与系统管理「污染源信息 · 农村污水及集中处理设施」列表一致；地图取 entLng/entLat。',
  },
  {
    kind: 'agri_rural',
    help: '台账字段与系统管理「污染源信息 · 农业农村源」列表一致；地图取 centerLng/centerLat。',
  },
  {
    kind: 'industry',
    help: '台账字段与系统管理「污染源信息 · 工业企业污染源」列表一致；地图取 lng/lat。',
  },
];

/** 污染源：行首箭头 + 总控勾选 + 图例；展开后三类子图层（与配置中心同源） */
function PollutionSourceGroupControls({
  v,
  onChange,
  counts,
}: {
  v: ZhtLayerControlState;
  onChange: (patch: Partial<ZhtLayerControlState>) => void;
  counts: Record<ZhtPollutionSourceKind, number>;
}) {
  const [open, setOpen] = useState(false);
  const pl = v.pollutionSourceLayers;
  const total = counts.rural_sewage + counts.agri_rural + counts.industry;
  const allOn = pl.ruralSewage && pl.agriRural && pl.industry;
  const noneOn = !pl.ruralSewage && !pl.agriRural && !pl.industry;

  return (
    <div className="zht-layer-water-poi-cat">
      <div className="zht-layer-water-poi-cat__row" onClick={e => e.stopPropagation()}>
        <button
          type="button"
          className="zht-layer-water-poi-chevron"
          aria-expanded={open}
          aria-controls="zht-pollution-sub-layers"
          aria-label={open ? '收起污染源子类' : '展开污染源子类'}
          onClick={e => {
            e.stopPropagation();
            setOpen(o => !o);
          }}
        >
          <ChevronRight
            size={12}
            strokeWidth={2}
            className={open ? 'zht-layer-water-poi-chevron__svg zht-layer-water-poi-chevron__svg--open' : 'zht-layer-water-poi-chevron__svg'}
            aria-hidden
          />
        </button>
        <Checkbox
          checked={allOn}
          indeterminate={!allOn && !noneOn}
          onChange={e => {
            const on = e.target.checked;
            onChange({
              pollutionSourceLayers: {
                ruralSewage: on,
                agriRural: on,
                industry: on,
              },
            });
          }}
          onClick={e => e.stopPropagation()}
        >
          <span className="zht-layer-water-poi-cat__title">
            <span className="zht-layer-water-poi-cat__icon" aria-hidden>
              <ZhtPoiSvgIcon iconKey="pollution" size={LAYER_POI_ICON_SIZE} />
            </span>
            污染源（{total}）
          </span>
        </Checkbox>
        <span className="zht-layer-control__row-help-tail">
          <HelpTip text={HELP.pollutionSource} />
        </span>
      </div>
      {open ? (
        <div id="zht-pollution-sub-layers" className="zht-layer-water-poi-cat__states" role="group">
          {POLLUTION_SUB_ROWS.map(row => {
            const lk = pollutionKindToLayerKey(row.kind);
            const checked = pl[lk];
            return (
              <div key={row.kind} className="zht-layer-pollution-sub-row">
                <Checkbox
                  checked={checked}
                  onChange={e =>
                    onChange({
                      pollutionSourceLayers: {
                        ...v.pollutionSourceLayers,
                        [lk]: e.target.checked,
                      },
                    })
                  }
                  onClick={e => e.stopPropagation()}
                >
                  <span className="zht-layer-water-poi-cat__title">
                    <span className="zht-layer-water-poi-cat__icon" aria-hidden>
                      <ZhtPoiSvgIcon iconKey={getPollutionKindSvgKey(row.kind)} size={LAYER_POI_ICON_SIZE} />
                    </span>
                    {ZHT_POLLUTION_KIND_LABEL[row.kind]}（{counts[row.kind]}）
                  </span>
                </Checkbox>
                <span className="zht-layer-control__row-help-tail">
                  <HelpTip text={row.help} />
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export interface ZhtLayerControlPopoverProps {
  value: ZhtLayerControlState;
  onChange: (patch: Partial<ZhtLayerControlState>) => void;
}

export const ZhtLayerControlPopover: React.FC<ZhtLayerControlPopoverProps> = ({ value: v, onChange }) => {
  /** 总开关未勾时，子项一旦形成有效显隐配置则自动打开总开关，否则地图层逻辑不绘点 */
  const onWaterEnvChildChange = useCallback(
    (patch: Partial<ZhtLayerControlState>) => {
      const merged = mergeLayerControlPatch(v, patch);
      const { next, repairedLayers } = repairStatesForEnabledCategories(merged);
      const needMaster = !v.waterEnvPoiEnabled && anyWaterEnvChildActive(next);
      const out: Partial<ZhtLayerControlState> = { ...patch };
      if (repairedLayers) out.waterEnvPoiLayers = next.waterEnvPoiLayers;
      if (needMaster) out.waterEnvPoiEnabled = true;
      onChange(out);
    },
    [v, onChange],
  );

  const poiCounts = useMemo(() => countUnifiedPointsByCategory(), []);

  const pollutionCounts = useMemo(
    () => ({
      rural_sewage: countPollutionPointsByKind('rural_sewage'),
      agri_rural: countPollutionPointsByKind('agri_rural'),
      industry: countPollutionPointsByKind('industry'),
    }),
    [],
  );

  const waterEnvPoiMasterAllOn = isWaterEnvPoiGroupAllSelected(v);
  const waterEnvPoiMasterIndeterminate = !waterEnvPoiMasterAllOn && anyWaterEnvChildActive(v);

  return (
    <div className="zht-layer-control-popover" onClick={e => e.stopPropagation()}>
      <div className="zht-layer-control-popover__head">
        <span className="zht-layer-control-popover__title">图层控制</span>
        <Button
          type="text"
          size="small"
          className="zht-layer-control-popover__gear"
          aria-label="图层设置"
          icon={<Settings size={16} strokeWidth={1.75} />}
          onClick={() => message.info('图层设置：演示占位')}
        />
      </div>

      <Collapse
        bordered={false}
        size="small"
        className="zht-layer-control-collapse"
        defaultActiveKey={['admin', 'poi']}
        items={[
          {
            key: 'admin',
            /** 仅箭头展开分组，避免点击勾选框时先触发 Collapse 展开/收起，需点两次才改勾选态 */
            collapsible: 'icon',
            label: (
              <span className="zht-layer-control__label-row zht-layer-control__label-row--spread" onClick={e => e.stopPropagation()}>
                <Checkbox
                  checked={v.showAdminDivisionHints}
                  onChange={e => onChange({ showAdminDivisionHints: e.target.checked })}
                  onClick={e => e.stopPropagation()}
                >
                  行政区划
                </Checkbox>
                <span className="zht-layer-control__row-help-tail">
                  <HelpTip text={HELP.admin} />
                </span>
              </span>
            ),
            children: (
              <div className="zht-layer-water-poi-cat">
                <div className="zht-layer-water-poi-cat__row" onClick={e => e.stopPropagation()}>
                  <span className="zht-layer-water-poi-chevron-spacer" aria-hidden />
                  <span className="zht-layer-control__label-row zht-layer-control__label-row--spread" onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={v.zeroDirectDischargeLabels}
                      disabled={!v.showAdminDivisionHints}
                      onChange={e => onChange({ zeroDirectDischargeLabels: e.target.checked })}
                      onClick={e => e.stopPropagation()}
                    >
                      零直排区域标注
                    </Checkbox>
                    <span className="zht-layer-control__row-help-tail">
                      <HelpTip text={HELP.zero} />
                    </span>
                  </span>
                </div>
              </div>
            ),
          },
          {
            key: 'drain1',
            showArrow: false,
            label: (
              <PhCheckbox
                checked={v.drainagePipeNetwork}
                onChange={x => onChange({ drainagePipeNetwork: x })}
                helpText={HELP.drainNet}
              >
                排水管网
              </PhCheckbox>
            ),
          },
          {
            key: 'grid',
            showArrow: false,
            label: (
              <PhCheckbox checked={v.drainageGrid} onChange={x => onChange({ drainageGrid: x })}>
                排水网格
              </PhCheckbox>
            ),
          },
          {
            key: 'unit',
            showArrow: false,
            label: (
              <PhCheckbox checked={v.drainageUnit} onChange={x => onChange({ drainageUnit: x })}>
                排水单元
              </PhCheckbox>
            ),
          },
          {
            key: 'flow',
            showArrow: false,
            label: (
              <PhCheckbox
                checked={v.pipelineFlowMarks}
                onChange={x => onChange({ pipelineFlowMarks: x })}
                helpText={HELP.pipeFlow}
              >
                管线流向标识
              </PhCheckbox>
            ),
          },
          {
            key: 'poi',
            label: (
              <span className="zht-layer-control__label-row zht-layer-control__label-row--spread" onClick={e => e.stopPropagation()}>
                <Checkbox
                  checked={waterEnvPoiMasterAllOn}
                  indeterminate={waterEnvPoiMasterIndeterminate}
                  onChange={e => {
                    const on = e.target.checked;
                    if (on) {
                      // 总开关打开：子项全选（含占位图层与污染源三类）
                      onChange({
                        waterEnvPoiEnabled: true,
                        waterEnvPoiLayers: DEFAULT_WATER_ENV_POI_LAYERS,
                        pollutionSourceLayers: { ruralSewage: true, agriRural: true, industry: true },
                        poiPlaceholderDrainageEnterprise: true,
                        poiPlaceholderCustomAnnotation: true,
                      });
                    } else {
                      // 总开关关闭：子项全部不勾选；子级仍可继续编辑，不再整体禁用
                      onChange({
                        waterEnvPoiEnabled: false,
                        waterEnvPoiLayers: WATER_ENV_POI_LAYERS_ALL_UNCHECKED,
                        pollutionSourceLayers: { ruralSewage: false, agriRural: false, industry: false },
                        poiPlaceholderDrainageEnterprise: false,
                        poiPlaceholderCustomAnnotation: false,
                      });
                    }
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  水环境POI点位
                </Checkbox>
                <span className="zht-layer-control__row-help-tail">
                  <HelpTip text={HELP.waterPoi} />
                </span>
              </span>
            ),
            children: (
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                {ZHT_WATER_ENV_MAIN_CATEGORY_ORDER.map(catId => (
                  <WaterEnvCategoryControls
                    key={catId}
                    catId={catId}
                    v={v}
                    onChange={onWaterEnvChildChange}
                    count={poiCounts[catId]}
                  />
                ))}
                {ZHT_SYS_HYDRO_CATEGORY_ORDER.map(catId => (
                  <WaterEnvCategoryControls
                    key={catId}
                    catId={catId}
                    v={v}
                    onChange={onWaterEnvChildChange}
                    count={poiCounts[catId]}
                  />
                ))}
                <PhCheckboxWaterPoiAligned
                  checked={v.poiPlaceholderDrainageEnterprise}
                  onChange={x => onWaterEnvChildChange({ poiPlaceholderDrainageEnterprise: x })}
                  legend={<ZhtPoiSvgIcon iconKey="drainage_enterprise" size={LAYER_POI_ICON_SIZE} />}
                >
                  排水企业
                </PhCheckboxWaterPoiAligned>
                <PollutionSourceGroupControls v={v} onChange={onWaterEnvChildChange} counts={pollutionCounts} />
                <PhCheckboxWaterPoiAligned
                  checked={v.poiPlaceholderCustomAnnotation}
                  onChange={x => onWaterEnvChildChange({ poiPlaceholderCustomAnnotation: x })}
                  legend={<ZhtPoiSvgIcon iconKey="custom_annotation" size={LAYER_POI_ICON_SIZE} />}
                >
                  自定义标注
                </PhCheckboxWaterPoiAligned>
              </Space>
            ),
          },
          {
            key: 'rs',
            label: (
              <PhCheckbox checked={v.remoteSensing} onChange={x => onChange({ remoteSensing: x })} helpText={HELP.remote}>
                遥感监测
              </PhCheckbox>
            ),
            children: (
              <Radio.Group
                value={v.remoteSensingMetric}
                onChange={e => onChange({ remoteSensingMetric: e.target.value })}
                disabled={!v.remoteSensing}
              >
                <Space direction="vertical" size={4}>
                  <Radio value="chlorophyll">叶绿素（µg/L）</Radio>
                  <Radio value="suspended">悬浮物（µg/L）</Radio>
                </Space>
              </Radio.Group>
            ),
          },
          {
            key: 'sus',
            showArrow: false,
            label: (
              <PhCheckbox checked={v.suspectProblemPatches} onChange={x => onChange({ suspectProblemPatches: x })}>
                疑似问题图斑
              </PhCheckbox>
            ),
          },
          {
            key: 'rv',
            showArrow: false,
            label: (
              <PhCheckbox checked={v.riverFlowVisualization} onChange={x => onChange({ riverFlowVisualization: x })}>
                河流流向可视化
              </PhCheckbox>
            ),
          },
          {
            key: 'eco',
            showArrow: false,
            label: (
              <PhCheckbox checked={v.ecoRedline} onChange={x => onChange({ ecoRedline: x })}>
                生态红线标识
              </PhCheckbox>
            ),
          },
          {
            key: 'sim',
            showArrow: false,
            label: (
              <PhCheckbox checked={v.riverDynamicSimulation} onChange={x => onChange({ riverDynamicSimulation: x })}>
                河流动态模拟
              </PhCheckbox>
            ),
          },
        ]}
      />
    </div>
  );
};
