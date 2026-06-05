# 地图图层控制规范（必读）

> **凡涉及「图层控制」「一级/二级勾选」「空间图层树」的地图原型，必须先读本页并使用公共模块，禁止在原型内手写 Checkbox 联动逻辑。**

参考实现：韶山 `zhtLayerControlPopover`（污染源分组 `checked` / `indeterminate`）；湖州 `huzhou-spatial-portrait` 已接入公共模块。

## 交互规则（固化，不可改）

| 场景 | 行为 |
|------|------|
| 一级 `checked` | 仅当**全部**二级勾选 |
| 一级 `indeterminate` | 二级**部分**勾选 |
| 点击一级 | 二级**全开**或**全关** |
| 分区标题（如「空间图层」） | 其下**全部**一级组的二级**全开**或**全关**；`checked` / `indeterminate` 跨组汇总；**可折叠**隐藏其下全部一级组 |
| 点击二级 | 单独切换；一级态自动联动 |
| 一级可多选 | 多个一级组可同时有勾选，地图叠加显示 |
| 布局 | 四列：展开箭头 22px \| 勾选 16px \| 名称 \| 右侧统计（可选）；**分区标题 / 平铺行**对齐韶山 Collapse 表头（箭头 18px + 勾选文案一体）；**分区内一级组**缩进展示 |

## 公共模块

路径：`src/common/layer-control/`

```tsx
import {
  LayerControlTree,
  setAllChildrenChecked,
  toggleChildChecked,
  createDefaultGroupSubs,
  type LayerControlGroupConfig,
} from '../../common/layer-control';
```

### 推荐用法

1. **配置**：在原型内定义 `LayerControlGroupConfig[]`（一级 label + 二级 children，含 `color` / `stat`）。
2. **状态**：`Record<groupKey, Record<childKey, boolean>>`，用 `createDefaultGroupSubs` 初始化。
3. **UI**：`LayerControlTree` + Popover 外壳（标题沿用 `zht-layer-control-popover__head` 即可）。
4. **地图**：根据各组 `subs` 计算显隐，**以二级勾选为准**（勿再单独维护与 subs 脱节的 `enabled` 标志）。

### 示例

```tsx
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
  groups={groupConfigs}
  value={subsByGroup}
  onChange={(groupKey, nextSubs) => {
    onChange(updateGroupSubs(value, groupKey, nextSubs));
  }}
  onBatchChange={nextSubsByGroup => {
    onChange(applyAllGroupSubs(value, nextSubsByGroup));
  }}
  hint="一级可多选叠加；点击一级将二级全开或全关，亦可单独勾选二级。"
/>
```

## 状态工具（`layerControlState.ts`）

- `computeGroupCheckState(children, subs)` → `{ allChecked, someChecked, ... }`
- `computeSectionCheckState(groups, value)` → 分区标题 Checkbox 态
- `setAllChildrenChecked(children, checked)` → 一级点击
- `setAllGroupsChildrenChecked(groups, checked)` → 分区标题点击
- `toggleChildChecked(subs, childKey, checked)` → 二级点击

**禁止**在原型内复制上述逻辑。

## 样式

- 引入公共模块即自动加载 `layer-control.css`（类名前缀 `ax-lc-`）。
- Popover 内容根节点使用 `className="ax-lc-popover"`（`LayerControlTree` 已自带）。
- 可与 `zht-map-layer-popover` 等韶山外壳类名叠用。

## 验收清单

- [ ] 使用 `src/common/layer-control`，无手写父级 `indeterminate` 计算
- [ ] 一级全选时一级为实心勾（非横线）
- [ ] 一级点击二级全开/全关
- [ ] 勾选框与右侧统计列对齐（四列网格）
- [ ] `spec.md` 注明引用本规范
