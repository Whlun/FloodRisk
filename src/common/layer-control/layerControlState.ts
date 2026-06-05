/**
 * 地图图层控制 · 勾选状态工具（交互规则固化，勿在各原型重复实现）
 *
 * 规则（与韶山 zhtLayerControlPopover 污染源分组一致）：
 * - 一级 checked = 二级全部勾选
 * - 一级 indeterminate = 二级部分勾选
 * - 点击一级 → 二级全开或全关
 * - 可单独勾选二级，一级态自动联动
 */
import type { LayerControlChildConfig, LayerControlGroupCheckState, LayerControlGroupSubs } from './types';

export function getChildKeys(children: LayerControlChildConfig[]): string[] {
  return children.map(c => c.key);
}

/** 计算一级 Checkbox 的 checked / indeterminate */
export function computeGroupCheckState(
  children: LayerControlChildConfig[],
  subs: LayerControlGroupSubs,
): LayerControlGroupCheckState {
  const keys = getChildKeys(children);
  const checkedCount = keys.filter(k => subs[k]).length;
  const total = keys.length;
  const allChecked = total > 0 && checkedCount === total;
  const someChecked = checkedCount > 0 && checkedCount < total;
  const noneChecked = checkedCount === 0;
  return { allChecked, someChecked, noneChecked, checkedCount };
}

/** 一级点击：二级全开或全关 */
export function setAllChildrenChecked(
  children: LayerControlChildConfig[],
  checked: boolean,
): LayerControlGroupSubs {
  return Object.fromEntries(children.map(c => [c.key, checked]));
}

/** 切换单个二级 */
export function toggleChildChecked(
  subs: LayerControlGroupSubs,
  childKey: string,
  checked: boolean,
): LayerControlGroupSubs {
  return { ...subs, [childKey]: checked };
}

/** 默认全部勾选 */
export function createDefaultGroupSubs(children: LayerControlChildConfig[], defaultChecked = true): LayerControlGroupSubs {
  return setAllChildrenChecked(children, defaultChecked);
}

/** 是否有任意二级勾选（用于地图显隐、展开记忆等） */
export function groupHasAnyChecked(children: LayerControlChildConfig[], subs: LayerControlGroupSubs): boolean {
  return children.some(c => subs[c.key]);
}

type LayerControlGroupLike = { key: string; children: LayerControlChildConfig[] };

/** 分区标题 Checkbox：跨全部一级组汇总 checked / indeterminate */
export function computeSectionCheckState(
  groups: LayerControlGroupLike[],
  value: Record<string, LayerControlGroupSubs>,
): LayerControlGroupCheckState {
  let total = 0;
  let checkedCount = 0;
  for (const group of groups) {
    const subs = value[group.key] ?? {};
    for (const child of group.children) {
      total++;
      if (subs[child.key]) checkedCount++;
    }
  }
  const allChecked = total > 0 && checkedCount === total;
  const someChecked = checkedCount > 0 && checkedCount < total;
  const noneChecked = checkedCount === 0;
  return { allChecked, someChecked, noneChecked, checkedCount };
}

/** 分区标题点击：全部一级组二级全开或全关 */
export function setAllGroupsChildrenChecked(
  groups: LayerControlGroupLike[],
  checked: boolean,
): Record<string, LayerControlGroupSubs> {
  return Object.fromEntries(
    groups.map(group => [group.key, setAllChildrenChecked(group.children, checked)]),
  );
}
