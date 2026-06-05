# 湖州市空间全画像 · 工作台

## 业务与功能

### 1.1 核心目标

「工作台」为湖州工业用地全画像系统的**默认首页**与**数据总览入口**。在无地图的浅色管理后台布局下，聚合空间利用、建设工程、预警工程三类演示指标，提供统计图表与 Top 5 列表，并支持一键跳转各业务 Tab。

### 1.2 功能清单

- **KPI 指标卡 x6（P0）**：可利用空间、低效用地、建设项目、建设面积、预警项目、最长滞留；**单位写在标题括号内**（如「建设面积(公顷)」），数值区仅展示纯数字；点击跳转对应 Tab。
- **统计图表 x2（P0）**：供地趋势折线（2018–2023）；建设阶段分布横向柱图（Top 5，数量从高到低，最高项在顶部）。
- **列表面板 x3（P0）**：阶段滞留预警 Top 5；近期建设项目 Top 5；**我关注的项目**（`useCmProjectFavorites` + `localStorage` 键 `hz-cm-project-favorites`，与建管/预警画像收藏同源）；行点击弹出详情，关注列表行内可取消收藏。
- **快捷入口 x4（P0）**：空间利用画像 / 建设工程画像 / 预警工程画像 / 低效用地分析。

### 1.3 交互要点

- 顶栏区县切换 → KPI、图表、列表同步缩放（与 `liyong` / `jianguan` / `zhongda` 同源 Mock）。
- KPI 可利用/低效 → `liyong`；建设相关 → `jianguan`；预警相关 → `zhongda`。
- 预警列表 / 项目列表 / **我关注的项目**行点击 → 弹出 **`ParcelDetailModal`**；关注列表行内星标可取消收藏；「查看全部」→ 对应 Tab。
- 通过壳层 `HzShellNavProvider` + `useHzShellNav().navigateSub` 实现 Tab 跳转。

---

## 内容规划

### 2.1 信息架构

```
工作台
├── KPI 指标卡 x6
├── 统计图表（供地趋势 / 阶段分布）
├── 列表（预警 Top5 / 项目 Top5 / 我关注的项目）
└── 快捷入口 x4
```

### 2.2 数据来源

- **空间指标**：`../huzhou-spatial-portrait/mock/regionScopedSpatialStats.ts` → `getSpatialStatsForRegion`
- **建管汇总**：`../huzhou-construction-portrait/mock/regionScopedData.ts` → `getSummaryForRegion`、`getPhaseMetricsForRegion`、`getProjectsByPhaseAndRegion`
- **预警统计**：`../huzhou-construction-portrait/cmAlertStats.ts` → `buildCmAlertRegionStats`；`listCmProjectAlerts` + `getRegionAlertProjects`
- **项目收藏**：`../huzhou-construction-portrait/useCmProjectFavorites.ts` + `getProjectById`（`workbenchFavorites.ts`）
- **区县**：`../huzhou-lifecycle-shared/hzRegionScope.ts` + 壳层 `useHzShellRegion`

### 2.3 访问路径

- `/prototypes/湖州市空间全画像/yizhangtu`（壳内默认）
- `/prototypes/huzhou-workbench`（独立预览）

---

## 布局与结构

### 3.1 整体布局

- **布局模式**：单页滚动，浅灰底 `#f0f2f5`，内容区 `max-width: 1600px` 居中。
- **无地图**：不使用 MapLibre 与三栏大屏布局。
- **图表高度**：约 `260px`，ECharts + `ResizeObserver` 自适应。

### 3.2 响应式适配

- KPI：桌面 6 列（`xl=4`），平板 2 列，手机 1 列。
- 图表与列表：桌面双列，窄屏单列堆叠。

---

## 视觉规范

### 4.1 设计规范来源

**设计规范来源**：主题 `/src/themes/antd-new` + 内置 interface-design（ToB 管理后台）

### 4.2 自定义设计要点

- 主色 `#1e5bb5`，数值强调 `#1677ff`（对齐建管画像 KPI）。
- 预警等级 Tag：红 `#ff4d4f` / 橙 `#fa8c16` / 黄 `#faad14`。
- KPI 卡 hover 微抬升；可点击区域 `cursor: pointer`。

### 4.3 组件状态

- **KPI 卡 hover**：阴影加深 + `translateY(-1px)`。
- **列表行 hover**：背景 `#f5f8ff`。
- **快捷入口 hover**：边框 `#1e5bb5` + 轻阴影。

---

## 验收与限制

- 运行 `node scripts/check-app-ready.mjs /prototypes/huzhou-workbench`。
- 运行 `node scripts/check-app-ready.mjs /prototypes/湖州市空间全画像`。
- **样式**：`style.css` 纯 CSS（勿使用 `@import "tailwindcss"`）；阶段 Tag 复用 `cmPhaseStageTag.css`。
- 无真实接口；指标均为演示 Mock，随区县按土地利用面占比缩放。
