# 湖州市空间全画像

## 业务与功能

### 1.1 核心目标

「湖州市空间全画像」为湖州工业用地与空间治理场景的**大屏原型入口**。一期仅实现 **「空间利用画像」**：在韶山「综合态势」同款 **白底左右看板 + 深色地图槽** 布局上，以 **土地利用面 GeoJSON** 表达湖州域空间结构，配合 docx 中的供地、低效用地、可利用空间等 **演示指标**，支撑产品评审与交互走查。**不**还原 docx 青绿霓虹大屏视觉。

### 1.2 功能清单

- **页面（P0）**：无顶栏，整页三栏（对齐 `zonghe-taishi`）；直接展示 **空间利用画像**。
- **三栏主体（P0）**：`SpatialUtilizationView` — 左 `SpatialLeftPanel`、中 `HuzhouMapBoard`、右 `SpatialRightPanel`；样式复用 `zonghe-taishi` + `韶山一张图` CSS，定制类前缀 `hz-`。区县范围由**系统壳顶栏** `useHzShellRegion` 注入，切换 Tab 不重置。
- **左看板（P0）**：顶栏标题 + **四块均分**（供地分布 / 供地趋势 / 用地状态 / 低效用地），整栏无纵向滚动，图表随块高 `ResizeObserver` 自适应。**低效用地**块：顶部主指标卡（面积 + 公顷）+ 下方两行副指标（标签/数值/占比进度条），统一 `hz-inefficient` 样式，避免三块 KPI 卡片堆叠溢出。数值型指标随壳层区县按土地利用面占比缩放（`regionScopedSpatialStats.ts`）；供地「空间分布」选中具体区县时仅展示该县区一条。
- **右看板（P0）**：顶栏标题 + **四块均分**（总体可用 / 居住用地 / 工业用地 / 公共设施用地），整栏无纵向滚动，图表随块高自适应。图表配色对齐综合态势 **蓝白看板**（`#1e5bb5` / `#1677ff` / `#08cc91`），环形图中心展示总面积与单位；居住用地为横向渐变柱；工业用地为三行卡片式进度条（`hz-industrial-metrics`，同源左栏 `hz-inefficient`）；公共设施为底部图例环形图。ECharts 主题见 `spatialChartTheme.ts`；数值随壳层区县同源缩放。
- **图表动效（P1）**：与建管画像同源 `setChartOptionWithAnimation` / `AnimatedNumber`。**供地分布**三图仅在当前 Segmented Tab **可见时**挂载（`useSpatialEcharts`），避免 `display:none` 时动画已播完；切换用途/空间/结构 Tab 或切换区县时重新播放入场动效（柱图生长、饼图旋转展开）。左栏低效用地、右栏工业用地数值与进度条同步滚动/展开；供地趋势折线随区县联动动画更新。
- **地图（P0）**：MapLibre + OpenFreeMap Liberty；**底图透明度**滑块仅作用于 style 内非 `hz-` 图层（Liberty/影像瓦片）；`fitBounds` 湖州行政边界；启用 `regionScopeEnabled` 与壳层 `districtFilter` / `districtFocus` 联动（与建管画像一致）。**区县行政界**细线 `#1e5bb5`（宽约 2px）；**市域/区县外轮廓**双层扩线：**全市**用 `huzhou-city-outline.geojson`；**选中区县**时隐藏市轮廓、对当前区县面用同样式；源 **`huzhou-landuse-test-data.geojson`**（1474 面），按质心落 **5 区县** + **6×6 虚拟街道片区**，每面独占 `hzLayerKey`；**土地利用 GeoJSON 面不受透明度滑块影响**。
- **底栏三态（P0）**：已移除地图底栏按钮；**规划建设空间 / 已利用空间 / 可利用空间** 移入工具条 **图层控制**，一级可多选叠加，二级为具体用地类型。
- **地图工具条（P0）**：`HzMapVerticalToolbar`，**10 项**（搜索、图层控制、地图样式、地图视角、视图导出、量尺、全屏、中心恢复、缩放、指北；**不含** POI 提示配置、视频点位、地图标注）。支持可选扩展 prop **`extraAfterFullscreen`**（经 `HuzhouMapBoard` / `HuzhouMapWithParcelDetail` 的 `mapToolbarExtraAfterFullscreen` 注入，插在全屏与中心恢复之间）；建管/预警/空间利用画像用于「左右看板互换」。
- **左右看板互换（P1）**：`SpatialUtilizationView` 地图工具条全屏下方「左右看板互换」使 **左栏供地/用地统计 ↔ 右栏可利用空间统计** 视觉对调（`hz-spatial-body--panels-swapped` + `flex-direction: row-reverse`），地图列居中。偏好 `localStorage` 键 `hz-cm-panel-layout-swapped:spatial`（`useHzCmPanelLayoutSwap('spatial')`）。
- **图层控制（P0）**：`HzLayerControlPopover` — 基于公共模块 [`src/common/layer-control/`](../../common/layer-control/)（规范 [`rules/layer-control-guide.md`](../../rules/layer-control-guide.md)）；层级视觉对齐韶山 `zhtLayerControlPopover`（Collapse 父级表头 + 子级缩进）；Popover 宽约 **300–360px**（避免长图层名换行）；**「空间图层」**为父级折叠行（勾选文案一体），其下规划建设 / 已利用 / 可利用为缩进一级组并带面积统计；一级点击二级全开/全关，可单独勾选二级。
- **点击地块（P1）**：任意土地利用面点击 → 打开 **地块全生命周期详情 Modal**（默认挂 `document.body`，`zIndex` 2200；**地图全屏**时经 `zhtResolveDetailModalContainer` 挂入 `.hz-maplibre-stack` 全屏节点）；`osm_id` 已映射台账的展示对应案例，其余地块静默兜底太禾假日酒店演示数据；未接 `onParcelClick` 时仍回退为 Popup。
- **地块详情（P1）**：与 **建设工程画像** 同源 `ParcelDetailModal`（`resolveCmContextFromParcel` / `resolveCmDetailParcel`）— **左右分栏**：左栏 **基本信息**（`ParcelBasicInfoSection`）；右栏顶部 **9 阶段横向时间轴**（`CmPhaseLifecycleNav`，顶行 **批 / 供 / 用 / 建 / 验 / 证** 六大阶段）+ 下方 **属性 / 图形 / 档案** Tab；弹窗宽度 `min(1600px, 98vw)`、`centered` 挂载于地图列容器。命中演示建设项目时合并项目快照与台账；其余地块兜底太禾案例或按地块当前阶段展示建管布局。详见 [`huzhou-construction-portrait/spec.md`](../huzhou-construction-portrait/spec.md)。

### 1.3 交互要点

- 图层控制勾选多个一级空间类型 → 地图 **叠加** 各类型下已勾选的二级面（按 `hzLayerKey` 过滤；同一 `osm_id` 仅归属一个二级图层，不重复叠绘）；一级全选/半选/二级单独勾选沿用公共 `LayerControlTree` 联动。
- 工具条「地图样式」切换 Liberty / 影像 → `setStyle` 前置 `styleReady=false`，`style.load` 后再 `ensureHuzhouLayers` 重建业务层；图层/高亮/透明度 effect 均经 `mapCanApplyLayers`（`mapIsReady && styleReady && isStyleLoaded`）守卫，避免 `Style is not done loading`（首屏跳过 basemap effect 避免双载）。
- 图层控制关闭行政界或土地利用 → 对应图层 `visibility: none`。
- 点击任意土地利用面 → 地块详情 Modal（`HuzhouMapWithParcelDetail`）；`MAP_FEATURE_PARCEL_IDS` 命中为真实关联案例，否则演示兜底；点击空白关闭 Popup。
- **地图全屏**后点击地块 → 详情 Modal 仍须可见（挂载于全屏 `.hz-maplibre-stack`，与工具条 Popover 同源规则）。
- 地图 + 详情共用 `HuzhouMapWithParcelDetail`（空间利用 / 建管画像）。
- 详情内切换 **9 阶段时间轴** → 属性 Tab 字段集切换（建管入口三列平铺）；**图形 Tab** 为只读地图充满内容区；主地图定位见建管画像列表/卡片定位入口。

---

## 内容规划

### 2.1 信息架构

```
湖州市空间全画像
└── 空间利用画像（全屏三栏）
    ├── 左栏 · 供地与利用概况
    ├── 中栏 · MapLibre 地图 + 工具条
    └── 右栏 · 低效 / 可利用 / 工业进度
```

### 2.2 数据来源

- **地图几何**：`huzhou-admin-boundary.geojson`（5 区县）、`huzhou-city-outline.geojson`（市域外环）、**`huzhou-landuse-test-data.geojson`**（用户提供「湖州土地利用测试数据」，字段 `osm_id` / `fclass` / `name` 等）；Vite `?raw` 导入后经 `hzLanduseGeoSplit` + `hzLanduseLayerSplit` 做区县·街道·格网碎斑与 `hzLayerKey` 归属。更新源数据时覆盖 `assets/geojson/huzhou-landuse-test-data.geojson` 后重启 dev。街道为演示网格，非民政目录。
- **看板指标**：`mock/spatialStats.ts` 静态演示；区县名称含 docx 七类，边界 GeoJSON **暂无**市本级/南太湖新区面。
- **地块生命周期**：`huzhou-lifecycle-shared/` — `parcelFieldSchema.ts`（由 xlsx 生成）、`parcelMatterStages.ts`、`mock/demoParcels.ts`。
- **底图**：与韶山园区同源 `PARK_MAPLIBRE_STYLE_URL`；影像预设复用 `zhtMapStylePresets.ts`。

### 2.3 内容示例

- 底栏：**已利用空间** / **低效空间** / **可利用空间**。
- 二级图层名称与色点见图层控制 Popover（`SPACE_LAYER_TREE`）。

---

## 布局与结构

### 3.1 整体布局

- **布局模式**：`zht-root hz-root` 占满视口；主体 `zht-body hz-spatial-body` 三列 flex（对齐 `zonghe-taishi`，无顶栏）。支持 **左右看板互换**（见功能清单 §1.2）。左右看板 **同宽**（默认 400px，窄屏 ≤1100px 时 320px）。
- **地图列**：`zht-body-main hz-map-column`，地图栈深色背景 `#0b1a2e`，左右看板白底。

### 3.2 响应式适配

- 沿用综合态势断点：窄屏缩左右栏宽度，地图列 `flex:1` `min-width:0`。

---

## 视觉规范

### 4.1 设计规范来源

**设计规范来源**：综合态势同源（白底看板、深色地图槽）— 参考 `src/prototypes/zonghe-taishi/`。**不**采用 docx 截图中的青绿霓虹大屏色。

### 4.2 自定义设计要点

- 地图 **底图透明度**滑块（0 不透明、100 全透）仅调节 Liberty/影像 style 图层 `fill/line/raster-opacity` 等；**`hz-` GeoJSON 业务层**（行政界、土地利用面等）保持原色，突出面图层。
- 土地利用配色：`hzLandUseLayers.ts` 中 `LANDUSE_FCLASS_COLORS`。

### 4.3 组件与依赖

- **Ant Design**：`ConfigProvider` zhCN、`message`、工具条内 `Popover`/`Slider` 等。
- **ECharts**：左右看板图表（`SpatialLeftPanel` / `SpatialRightPanel`）。
- **MapLibre GL JS**：`HuzhouMapBoard.tsx`。
- **复用**：`zhtMapVerticalToolbar` 部分 Popover 内容、`zhtMapStylePresets`、`zhtMapViewPresets` 等自 `zonghe-taishi` 相对路径引用。

---

## 验收与限制

- 入口：`/prototypes/huzhou-spatial-portrait`。
- **二期占位**：建设工程画像等其它模块、真实业务三态分类、POI/台账点位、后端接口。
- **性能**：土地利用 GeoJSON 约 2.3MB，首屏解析有延迟；后续可考虑简化几何以或切片。
- **样式**：`style.css` 通过 `@import` 复用 `zonghe-taishi` 与韶山一张图样式（**勿**使用 `@import "tailwindcss"`，生产构建会失败）。
