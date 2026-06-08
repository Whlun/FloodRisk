# 湖州市空间全画像 · 预警工程画像

## 业务与功能

### 1.1 核心目标

「预警工程画像」为湖州工业用地与空间治理场景的**前三未预警专题大屏**（批而未供 / 供而未用 / 用而未尽），布局与 **建设工程画像** 一致（左看板 + 中地图 + 右看板）。左侧 **预警总览**（`CmAlertOverviewPanel`）结构对齐建管 **建设总览**（`CmPhaseDistributionPanel`）：顶栏标题 + KPI 汇总 + 等级环图 + **前三未类型卡片列表**（`hz-cm-alert-card`，交互同源 `hz-cm-phase-card`）；中间地图与空间利用/建设工程画像同源；右侧 **常驻** 复用建管 **`CmProjectAlertRailPanel`（rail）** 预警信息列表（顶栏标题「预警信息」，与左栏「预警统计」对称）。

### 1.2 预警规则（前三未 · 3 档）

基准日 **`2026-06-02`**（`CM_INDUSTRIAL_ALERT_AS_OF`）。单项目多类型命中时取 **I级 > II级 > III级** 最严重一条。

| 类型 | 触发条件 | III级 | II级 | I级 |
|------|----------|-------|------|-----|
| **批而未供** | 农转用日期有、供地日期无 | 滞留 90–179 天 | 180–364 天 | ≥365 天 |
| **供而未用** | 供地日期有、开工许可日期无；超期自合同约定开工日 | 30–89 天 | 90–364 天 | ≥365 天 |
| **用而未尽** | 已开工、未规划核实；已建比例 33%–70% 或未开发 ≥20 亩 | 比例合规且未开发 <20 亩 | 未开发 ≥20 亩且比例 >33% | 未开发 ≥50 亩且比例 <50% |

等级展示：**I级 / II级 / III级**（`CM_INDUSTRIAL_LEVEL_LABEL`）；环图色阶为蓝阶 `#0958d9` / `#1677ff` / `#69b1ff`，不用红橙黄交通灯语义。

### 1.3 功能清单

- **首页三栏（P0）**：`AlertHomeView` — 左 `CmAlertStatsPanel`（封装 `CmAlertOverviewPanel`）、中 `HuzhouMapWithParcelDetail`、右 `CmProjectAlertRailPanel`（`variant="rail"`）。右栏 **展开**（`MenuFold`）→ 列表铺满地图列；**`zht-stat-drawer-map-host`** 挂在 **`zht-map-drawer-stack`**（仅铺满地图列，**不遮盖**对侧预警总览看板，对侧看板保持可交互）；右栏收起占位 `zht-right-rail--collapsed-for-stat-expand`，地图列吸收原列表栏宽度。
- **左栏筛选（P0）**：**全市**时汇总区为 **两张图**：① **等级构成**（`CmAlertTypeLevelChart` `variant="single"`，与区县同口径 I/II/III 柱图，标题行 **`Segmented` 切换** 批而未供 / 供而未用 / 用而未尽；标题 **「等级构成」** 旁 **?** 悬停展示前三未 **I/II/III 等级说明**（`CmAlertLevelHelpTip`，口径同 §1.2）；点击柱筛选「类型 + 等级」）+ ② **区县预警统计**（`CmAlertDistrictCompareChart`，标题行 **`Segmented` 切换**类型，展示当前类型在五区县的 **个数 + 面积** 双轴柱图；标题下 **图例** 展示 **个数（个） / 面积（公顷）**（色块与当前类型主题色同源，面积系列为同色系半透明）；**等级构成与区县预警统计共用 `chartActiveType`，两处 `Segmented` 联动同步**；点击下方 **预警类型分布** 卡片选中类型时，两处 `Segmented` 同步切换到该类型；取消类型筛选时 `Segmented` 保持当前展示类型，`getDistrictAlertTypeComparison`）。**具体区县**时为 **等级构成**（`CmAlertTypeLevelChart`）三张独立柱图，横轴 **I级 / II级 / III级**；柱色与类型标签同源；**等级构成** 标题旁同样提供 **?** 等级说明；类型标题 **仅展示名称**（不展示个数），与 **I/II/III 图例同一行**（左标题右图例）；三张图 **均分汇总区剩余高度**（柱图区 `flex:1` 随容器伸缩，`ResizeObserver` 驱动 ECharts `resize`），避免下方留白；点击类型标题筛选类型，点击柱筛选「类型 + 等级」。下方 **预警类型分布** 列表共用 `selectedAlertType`：收起态展示 **个数 + 占比**，展开态补充 **面积（公顷）**；右栏预警列表与左栏 **同批** `listCmIndustrialLandAlerts` 数据（铺满态 **不套用** 建管申报时间筛选）。
- **地图联动（P0）**：预警地块按 **前三未类型主题色** 着色（批而未供 `#1677ff` / 供而未用 `#13c2c2` / 用而未尽 `#722ed1`，与类型标签、`HzPhaseAlertLine` 一致；描边用 `accentDeep`）；地图始终展示当前区县 **全部** 预警地块（不随左栏类型/等级/收藏筛选隐藏其他类型）；**未选类型**时仅底图着色、**无高亮叠加**；**选中类型卡片**时叠加同色高亮层强调该类型地块（再次点击取消），且 **不调整地图中心**（交互对齐建管 `CmPhaseDistributionPanel` 阶段卡片）；右栏列表仍按等级 + 类型 + 收藏组合筛选；列表定位时单地块高亮同色。
- **左右看板互换（P1）**：地图工具条全屏下方按钮；互换后收回列表文案为「收回左侧列表栏」（`listPanelSide`）；列表铺满时自左侧滑入（`hz-cm-body--panels-swapped`），对侧预警总览看板宽度仍预留。
- **右栏列表（P0）**：`listCmIndustrialLandAlerts` + `CmProjectCard`（`resolveCmProjectCardAlert`：仅 **批而未供 / 供而未用 / 用而未尽** 三类；类型标签内联在 `HzPhaseAlertLine` 文案前；**类型标签样式与卡片下方「当前阶段」标签一致**（浅色底 + 主题色字 + 圆角 pill 描边）；提示条背景与类型同色；不按红橙黄等级着色；等级 **I级/II级/III级**）；建管页项目卡同源。预警条 **单行展示**（类型标签全文 + 文案省略号），悬停 **Tooltip** 展示完整文案与参考日期。
- **系统壳（P0）**：顶栏 **公共「预警」** 角标为当前区县 **前三未预警项目数**。

### 1.4 交互要点

- 左栏 KPI：**预警项目**（总数）+ **预警总面积**（公顷，`totalAreaHa`，与类型卡片面积口径一致）。汇总图：**全市**为等级构成（类型切换）+ 区县预警统计；**区县**为分类型等级构成三图并列。
- **演示数据**：五区县各 4 条（共 20 条）；切换区县时左栏、右栏、地图同步。

---

## 内容规划

### 2.1 信息架构

```
预警工程画像
└── 首页（三栏）
    ├── 左 · 预警总览（KPI + 全市等级构成/区县预警统计 或 区县等级构成 + 前三未类型卡片）
    ├── 中 · 地图
    └── 右 · 预警信息列表（顶栏标题「预警信息」）
```

### 2.2 数据来源

- **预警规则**：`../huzhou-construction-portrait/cmIndustrialLandAlert.ts`
- **左栏组件**：`CmAlertOverviewPanel`、`CmAlertTypeList`、`CmAlertLevelChart`
- **统计**：`../huzhou-construction-portrait/cmAlertStats.ts`
- **地图**：`huzhou-spatial-portrait` 的 `HuzhouMapWithParcelDetail`

### 2.3 访问路径

- `/prototypes/湖州市空间全画像/zhongda`
- `/prototypes/huzhou-alert-portrait`（独立入口）

---

## 布局与结构

- `zht-root hz-cm-root hz-alert-root` + `AlertHomeView` 三栏 flex。左右看板同宽（默认 400px）。
- 左栏：`hz-cm-alert-panel-inner`，汇总区 `flex:1` + 类型列表 `min-height` 按 3 卡计算（对齐 `hz-cm-phase-list-min-h`）。
- 样式：`style.css` → `@import` 建设工程画像样式（预警卡片样式在 `huzhou-construction-portrait/style.css`）。

---

## 验收与限制

- 运行 `node scripts/check-app-ready.mjs /prototypes/huzhou-alert-portrait`。
- 无真实接口；演示数据由 Mock 字段驱动。
