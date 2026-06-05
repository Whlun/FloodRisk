# 湖州市空间全画像 · 预警工程画像

## 业务与功能

### 1.1 核心目标

「预警工程画像」为湖州工业用地与空间治理场景的**阶段滞留预警专题大屏**，布局与 **建设工程画像** 一致（左看板 + 中地图 + 右看板）。左侧布局与分隔对齐 **空间利用画像** 右栏 `hz-right-panel`：外边距 `10px 12px`、各 `hz-panel-block` 以 `border-bottom` 分割；顶栏 `zht-section-title` + KPI 汇总；**预警等级 / 停留天数 / 预警阶段分布** 三块均分，阶段行样式同源 `hz-industrial-metrics`；中间地图与空间利用/建设工程画像同源；右侧 **常驻** 复用建管 **`CmProjectAlertRailPanel`（rail）** 项目阶段预警列表（卡片 + 关键词搜索 + 地图定位 + 详情弹窗 + 收藏）。

### 1.2 功能清单

- **首页三栏（P0）**：`AlertHomeView` — 左 `CmAlertStatsPanel`、中 `HuzhouMapWithParcelDetail`、右 `CmProjectAlertRailPanel`（`variant="rail"`）。
- **左栏筛选（P0）**：点击 **预警等级** 环形图扇区或 **预警阶段分布** 主题色排行条（复用建管 `hz-cm-phase-card--phase-*` 九色）→ 联动右栏列表与地图；再次点击取消。等级色阶红/橙/黄与综合态势报警 `l2/l3/l4` 对齐；停留天数图为只读 ECharts 统计（不含区县分布，区县由顶栏切换）。
- **左右看板互换（P1）**：地图工具条全屏下方按钮；互换后收回列表文案为「收回左侧列表栏」（`listPanelSide`）。
- **右栏列表（P0）**：数据源为 **`getRegionAlertProjects(regionKey)`**（`mock/regionAlertProjects.ts`，按区县独立 20 条）；`listCmProjectAlerts` + `CmProjectCard` + `HzPhaseAlertLine`；**rail 态**筛选行含 **关键词** + **「只看收藏」**（`useCmProjectFavorites` 与建管项目列表同源）；结构对齐韶山 **`ZhtAlarmRailPanel`**（**MenuFold** 铺满 / **MenuUnfold** 收回）。**铺满态** `zht-stat-drawer-map-host` 挂在 **`zht-body`（`hz-alert-body`）**，自右滑入并**覆盖左栏统计看板 + 地图列**（与建管「仅地图列、左栏可交互」区分）；铺满筛选/视图与建管 **`CmProjectLeftPanel` overlay** 对齐：**卡片/列表切换**、**字段管理**（`PipeLineColumnManager`）、**名称关键词**、**申报日期**、**查询/重置**、**只看收藏**；rail ↔ 铺满通过 **`useCmProjectListPanelState`** 共享状态不丢失。
- **地图（P0）**：`regionScopeEnabled` + 壳层区县联动；`HZ_ALERT_PARCELS_BY_DISTRICT` 挂接 `parcel.region` → GeoJSON `hzDistrictName`；列表与地图均按当前区县过滤；**每个预警地块的 `mapFeatureId` 质心须落在对应区县行政界内**（与 `huzhou-admin-boundary.geojson` 一致）。
- **系统壳（P0）**：`湖州市空间全画像` 子路径 `zhongda` 挂接本页；顶栏区县切换不重置。

### 1.3 交互要点

- 左栏汇总 **预警项目 / 最长停留** 为只读统计（`buildCmAlertRegionStats`）。
- 右栏仅展示 **当前区县** 下 `REGION_ALERT_PROJECTS` 中满足滞留规则的项目（`phaseEnteredAt` 且 ≥60 天，基准日 `2026-06-02`）。
- **演示数据（按区域）**：五区县各 **4 条** 预警项目（共 20 条），id 前缀 `alert-{wx|nx|dq|cx|aj}-**`；每区绑定 `HZ_ALERT_PARCELS_BY_DISTRICT` 中 2–3 个本地块（吴兴 3 图斑 / 其余各区 2 图斑），图斑 osm_id 经行政界质心校验；切换顶栏区县时左栏统计、右栏列表、地图红色图斑同步切换。

---

## 内容规划

### 2.1 信息架构

```
预警工程画像
└── 首页（三栏）
    ├── 左 · 预警统计图表（等级环图 + 天数柱图 + 阶段主题色排行条）
    ├── 中 · 地图
    └── 右 · 项目阶段预警列表
```

### 2.2 数据来源

- **预警规则与列表**：`../huzhou-construction-portrait/cmProjectPhaseAlert.ts`、`CmProjectAlertRailPanel`、`mock/projects.ts`。
- **左栏统计**：`../huzhou-construction-portrait/cmAlertStats.ts`。
- **地图**：复用 `huzhou-spatial-portrait` 的 `HuzhouMapWithParcelDetail`。

### 2.3 访问路径

- `/prototypes/湖州市空间全画像/zhongda`
- `/prototypes/huzhou-alert-portrait`（独立入口）

---

## 布局与结构

- `zht-root hz-cm-root hz-alert-root` + `AlertHomeView` 三栏 flex。左右看板 **同宽**（默认 400px，窄屏 ≤1100px 时 320px，规则继承建设工程画像 `hz-cm-body`）。
- **左右看板互换（P1）**：地图工具条全屏下方「左右看板互换」使 **预警统计 ↔ 预警列表** 视觉对调（`hz-cm-body--panels-swapped`）；切换前收起列表铺满态；铺满动画互换后自左滑入。偏好 `localStorage` 键 `hz-cm-panel-layout-swapped:alert`（`useHzCmPanelLayoutSwap('alert')`）。
- 左栏布局：复用 `huzhou-spatial-portrait` 的 `hz-left-panel` / `hz-panel-block` / `hz-chart--flex`；图表主题同源 `spatialChartTheme`。
- 左栏纵向分配：顶 KPI + **预警阶段分布** 按内容高度（行高约 `30px`，不 `flex` 撑满）；**预警等级 / 停留天数** 两图块 `flex:1` 均分剩余高度，图表 `position:absolute; inset:0` 随块增高（`min-height` 约 96/100px）；内容超高时左栏内层可纵向滚动，避免底部留白。
- 环图中心文案用 ECharts `label.position: center` + `rich` 两行（数量 / 「预警」），与饼心对齐。
- 样式：`style.css` → `@import` 建设工程画像样式 + 左栏预警统计扩展。

---

## 视觉规范

- 白底左右看板 + 深色地图槽（综合态势同源）。
- 预警等级图例与柱条使用红 `#ff4d4f` / 橙 `#fa8c16` / 黄 `#faad14`；阶段柱条主色 `#1677ff`。

---

## 验收与限制

- 运行 `node scripts/check-app-ready.mjs /prototypes/huzhou-alert-portrait`。
- 无真实接口；演示预警条数随 Mock 项目 `phaseEnteredAt` 标记。
