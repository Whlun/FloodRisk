# 湖州市空间全画像 · 建设工程画像

## 业务与功能

### 1.1 核心目标

「建设工程画像」为湖州工业用地与空间治理场景的**建管工程专题大屏**，布局与交互**克隆韶山综合态势**（左看板 + 中地图 + 右看板），地图模块与 **空间利用画像** 完全一致。左侧 **建设总览** 顶部汇总展示 **项目总数 / 总面积**（数值带单位 **个 / 公顷**），随 **区县 + 时间筛选** 联动；统计口径为项目 **当前阶段时间节点**（优先 `phaseEnteredAt`，否则 `buildCmPhaseAcceptTimes` 对应当前阶段日期），Mock 以演示项目分布缩放全库大数（`CONSTRUCTION_PROJECT_SUMMARY` / `PHASE_METRICS`）。下方阶段卡片为各阶段分项（当前阶段 = 该阶段且阶段时间在筛选区间内）；**点击阶段**联动右侧列表（Mock 按 `phaseKey` 过滤，再次点击取消选中则展示全部项目）；**点击项目卡** → `ParcelDetailModal`（演示兜底）。

### 1.2 功能清单

- **首页三栏（P0）**：`ConstructionHomeView` — … **`zht-stat-drawer-map-host`** 挂在 **`zht-map-drawer-stack`**（仅铺满**地图列**，**不遮盖**左栏 `CmPhaseDistributionPanel`，左栏保持可交互）；右栏 **`variant="rail"` / `variant="overlay"`** …
- **项目阶段预警（P1 · Phase 1）**：系统壳顶栏 **公共「预警」** 点击后 **跳转预警工程画像**（`zhongda`）；建管页仍保留 **`CmProjectAlertRailPanel`（`variant="overlay"`）** 覆盖层能力（`alertRailOpen`）；**预警工程画像** Tab 以 **`variant="rail"`** 常驻右栏复用同一列表组件。**底层项目列表**展示全部项目（正常 + 预警混合）；**仅 `phaseEnteredAt` 显式标记且停留 ≥60 天**的演示项目展示 **滞留提示条**（18 条演示数据中 3 条预警、15 条正常）；**预警覆盖层**为全部预警项聚焦视图。**与左栏事项阶段选中互斥**：打开预警覆盖层时清除阶段选中；选中任一阶段时关闭覆盖层。规则见 `cmProjectPhaseAlert.ts`（基准日 `2026-06-02`，停留 ≥60/90/120 天）；预警卡 `CmProjectCard` 展示 `HzPhaseAlertLine` 滞留提示条；**详情弹窗**同步展示（时间轴对应阶段节点红色感叹号 + 该节点按钮下方 `HzPhaseAlertLine` 滞留提示条）；覆盖层自右侧滑入（`hz-cm-project-alert-rail-overlay--open`），**无**铺满地图 MenuFold；建设工程项目列表仍保留 overlay 铺满。
- **地图（P0）**：与 [`huzhou-spatial-portrait`](../huzhou-spatial-portrait/spec.md) 同源 — MapLibre、湖州行政界 + 土地利用面、图层控制 Popover、地图工具条。
- **列表详情（P0）**：`ProjectListFullPage` — 全屏表 + 筛选 + 分页（Mock 3002 条）。
- **项目画像（P0）**：`ProjectPortraitDetailPage` — 基本信息 + 批供用建时间轴 + 事项 Tab（属性/图形/档案）。
- **事项台账（P0）**：`MatterListPage` — 10 事项侧栏 + KPI + 区县柱图 + 查询表（`matterConfigs.ts` 配置驱动）。
- **业务流程（P1）**：`ProcessFlowDiagram` — 上游系统 → 事项环节（可跳转台账）→ 工程建设项目。

### 1.3 交互要点

- **系统壳顶栏全局区县下拉**（全市 / 吴兴区 / 南浔区 / 长兴县 / 安吉县 / 德清县，`useHzShellRegion`）→ 联动左栏阶段指标、项目总数/面积、右栏列表与地图（`regionScopeEnabled`）；左栏 **建设总览** 标题行**不再**含区县下拉。**切换区县**时带动画 `fitBounds` 并完整展示该县区行政界（外扩范围 + 较大留白，**不锁定**缩放/拖拽）；选中具体区县时**不显示**市域外轮廓，改为该县区外轮廓双层扩线（与全市外轮廓同样式）；**首屏 / 刷新**以全市默认中心与缩放（`HUZHOU_CITY_DEFAULT_CENTER` / `HUZHOU_CITY_DEFAULT_ZOOM`）瞬时对齐，避免每次刷新再缩放一遍；**全市**保持原先默认比例（`padding: 48`、`maxZoom: 11.5`）；底图样式切换后保持区县态；工具条「地图中心恢复」回到当前区县/全市范围。地图需开启图层控制中的**行政区划**及至少一类**土地利用**。
- 左栏点击阶段 → 右栏列表按 `phaseKey` 过滤；再次点击已选阶段 → 取消选中，右栏恢复**全部项目**（默认未选任何阶段）。
- 左栏顶部 **项目总数 / 总面积** 为**只读汇总**（`hz-cm-summary-stat`）：灰字标题在上、**蓝色**数值 `#1677ff` + 单位在下，无底卡描边/渐变、`cursor: default`，两列以竖线分隔，与下方可点阶段卡视觉区分。汇总条下方阶段列表顶栏为 **`hz-cm-phase-list__hd`**：左侧小标题 **「事项阶段分布」**（`hz-cm-phase-list__title`，13px / 字重 600），右侧 **设置图标**（`CmPhaseListSettings`，`SettingOutlined` + `Popover`）可勾选要在列表中展示的阶段（默认全选；**至少保留 1 项**；支持「恢复默认」）；隐藏当前已选阶段时自动取消阶段选中并恢复右栏全部项目。各阶段卡片**默认收起**：仅展示 **序号 / 阶段名 / 占比** 与底部占比进度条；**点击选中**后展开 **个数 / 面积** 两列指标（`hz-cm-phase-metric`：继承当前阶段 `--hz-cm-phase-accent-*` 主题色浅底渐变、主题色描边、数值 `--hz-cm-phase-accent`；单行左标题、右数值+单位）；再次点击取消选中则收起指标并恢复右栏全部项目。
- 各阶段卡片 **序号 / 阶段名 / 占比** 默认即使用对应 **阶段主题色**（`hz-cm-phase-card--phase-*` CSS 变量：序号浅底+深色字、标题 `--hz-cm-phase-accent-deep`、占比胶囊 `--hz-cm-phase-accent`）；选中态序号与占比改为实色底+白字，卡片 **2px 主题色描边** + 外圈 2px 光晕、背景同步加深，并带 `hz-cm-phase-card--expanded` 展开指标区。
- 各阶段卡片选中态使用**不同主题色**（`hz-cm-phase-card--phase-*` + CSS 变量区分）；同步在地图上高亮**当前图层可见范围内、归属该阶段的全量土地利用地块**（GeoJSON `cmPhaseKey`，由 `hzCmPhaseAssign.ts` 按 `osm_id` 稳定分配至 9 阶段），**边框/填充色与卡片主题色一致**（`phaseAccentColors.ts`）。
- 左栏 **建设总览** 头部对齐右栏 **`zht-stat-drawer__hd` + `zht-stat-drawer__filters` 两行结构**：首行 **`zht-stat-drawer__hd-top`** 仅标题（`zht-stat-drawer__title`，与右栏「建设工程项目」同款 **18px / 字重 650**）；次行 **`zht-stat-drawer__filters`** 内 **`Space.Compact`** 组合时间 **Select + DatePicker / RangePicker**（默认 **年度 + 今年**，控件 **默认尺寸（32px）** 与右栏筛选一致；Select 宽度容纳「自定义」全文不省略；**DatePicker / RangePicker 全中文展示**：`dayjs` 设为 `zh-cn`，`CM_DATE_PICKER_LOCALE` 覆盖季度 `Q1/Q2` 等为「第1季度」等，输入格式为 `YYYY年` / `YYYY年MM月` / `YYYY年第Q季度` / `YYYY年MM月DD日`，面板月份与操作按钮不出现英文）；**首行与筛选行最小高度均为 51px**（与右栏 rail / 铺满 overlay 一致，含 1px 底边），两行 **紧贴无间距**（`hz-cm-phase-panel-inner` 覆盖综合态势 `.zht-left-inner` 的 `gap:8px`）。变更后即时写入 `querySnapshot.dateFrom/dateTo`，按 **当前阶段时间节点**（`cmProjectPhaseTime.ts`）联动 **左栏汇总条、事项阶段分布、右栏项目列表**（跨年度项目按当前阶段所在时间统计，非申报日期）。其下为 **项目总数 / 总面积** 汇总条，再下方为阶段卡片列表。
- 地图工具条全屏下方 **左右看板互换** → 建设总览与项目列表左右对调（见 §3.1）；互换后列表铺满自左侧滑入，收回按钮文案为「收回左侧列表栏」。
- 右栏「建设工程项目」标题左侧 **展开**（`MenuFold`）→ 列表铺满地图列；**overlay 铺满态** 头部右侧提供 **卡片 / 列表视图切换**（`AppstoreOutlined` / `BarsOutlined`）；**列表视图** 时在视图切换左侧提供 **「字段」** 按钮（`PipeLineColumnManager`：列显示/隐藏、排序、恢复默认；**操作列固定右侧**）；列表视图为可点击行表格。**rail** 仍为关键词 + 只看收藏 + 卡片单列。overlay **`MenuUnfold`** 收回右栏（交互同 **预警工程画像**；筛选状态经 **`useCmProjectListPanelState`** 保留）。
- 点击项目卡（**非定位钮 / 非地址文字**）→ 弹出 **`ParcelDetailModal`**（**overlay 铺满态亦直接弹详情，不收起列表**，对齐综合态势 `onStatDrawerCardPoiClick`）；**详情弹窗**为 **左右分栏**：顶栏 **项目名称** 为主标题样式（**20px / 字重 600 / 行高 28px**，过长单行省略 + Tooltip），后接 **行政区划**（`CmDistrictTag`）与 **当前阶段**（`CmPhaseStageTag`，与项目卡同色）标签；**有阶段滞留预警**时，右栏 **连续横向时间轴**（`CmPhaseLifecycleNav`）在 **对应阶段节点圆点** 展示红色圆圈感叹号（Tooltip 滞留说明），并在 **该阶段节点按钮下方** 展示 `HzPhaseAlertLine` 滞留提示条（文案为「已停留 N 天（等级）」不含阶段名，与项目卡完整文案区分，`timelineMessage`）；顶栏与表单项采用 **紧凑内边距**（弹窗头约 8px、单元格约 6×10px），建管入口 **不再重复展示**与时间轴同名的二级事项标题（仅多记录时保留记录 Tab）；属性表 **按内容高度占位**，超出 Tab 区再滚动，避免表体下方大块留白；**左栏基本信息**（`ParcelBasicInfoSection`：bordered Descriptions **单列**、一行一个指标、**独立纵向滚动**；全量字段顺序 `BASIC_INFO_DESCRIPTION_LAYOUT`；建管入口下 **当前阶段** 用 `CmPhaseStageTag`，项目名称 / 项目代码 / 地址等可与 `constructionProject` 快照对齐；**建设地点 / 项目属地** 仅展示湖州市 **五区县** 并以 `CmDistrictTag` 展示）。**右栏**顶部为 **连续横向时间轴**（`CmPhaseLifecycleNav`：顶行 **批 / 供 / 用 / 建 / 验** 标签按细项数量比例对齐；下方 **9 节点一条轨道线** 贯穿、无五列分割（**已完成阶段之间**轨道段为蓝色 `#1677ff`，**未完成段**为灰色 `#d9d9d9`）；每条 **阶段名（14px）+ 阶段日期（标签 12px / 数值 13px）** 可点；**标签与数值均与下方属性 Tab 同源**；无数据显示 `—`；**节点进度/主题色仅据有属性 Tab 配置的事项判定**（如工程施工许可不含投资立项 `project-base`）；**无填报数据**阶段仍可点、节点灰态，**属性 Tab 仍展示该阶段字段表骨架**（值均为 `—`、表体灰态））；下方 **属性 / 图形 / 档案** Tab。**图形** 为 MapLibre 只读地图（`ParcelMatterGeoMap`，OpenFreeMap 底图同源；优先展示土地利用真实面，否则 `mapBounds` 矩形；地块填色/描边与**当前选中阶段**主题色一致（`cmPhaseMapColors`，随顶部时间轴阶段切换）；**地图充满 Tab 内容区**，无底部操作栏）。**档案** 为单层 `List`（`ParcelArchiveDocumentsPanel`），建管入口按当前事项筛选——**9 个细项阶段**均支持 **属性 / 图形 / 档案**；属性为 **三列** 平铺（`matterDisplayFields.ts`），**字段名/顺序/单位与用户提供的各阶段截图一致**；属性表在 Tab 内容区内**独立纵向滚动**（弹窗主体、顶部时间轴与「属性/图形/档案」Tab 顶栏固定不随表滚动）（如农转用为 21 项「项目批次、地块面积…」、土地供应为「项目名称、供地总面积…」共 24 项、首次登记为不动产 11 项、**工程规划许可** 为 12 项「项目代码、事项名称、工程类型、用地位置、建设规模、建设单位、建设单位证件类型、建设单位证件编号、证书编号、发证机构、发证日期、所在区县」、**工程施工许可** 按产品截图为 43 项（项目代码、建设单位、法定代表人、社会信用代码、项目名称、联系人、联系电话、项目地址、项目面积、总建筑面积、地上最大层数、地下层数、建设性质、工程类型、结构类型（按材料分/按传力分）、基础类型、建筑节能执行标准、绿色建筑、可再生能源、计划开工/竣工日期、危险性较大工程、周边环境，及勘察/设计/施工/监理四类参建单位信息）；时间轴日期标签为 **计划开工日期**、**用地复核验收** 为 18 项「项目代码、所在区县、事项名称、建设地点详细地址、国标行业、所属行业、建设性质、建设规模及内容、总用地面积、其中：新建建设用地、总建筑面积、其中：地上建筑面积、地下建筑面积、土地使用权类型、拟建成时间、拟开工时间、建设单位名称、证书号」等；不含业务主键等后台字段）。**工程规划许可** 阶段解析固定锚定 `engineering-permit` 事项（`resolveMatterForCmPhase` 优先有产品展示字段配置的事项，避免误用 `project-base` / `construction-project` 导致属性表与时间轴日期错位）。演示主案例 **预审与选址 / 农转用报批 / 土地供应 / 土地首次登记** 各配置 2 条 `stageRecords`；**工程规划许可** 演示项目为「湖州市仁皇山分区将军一路、将军二路工程」（`p6`）；**工程施工许可** 演示项目为「德清县莫干山高新区科创中心项目」（`p12`）或「德清县下渚湖湿地保护利用配套设施项目」（`p17` 时间轴切换至该阶段）；**用地复核验收** 演示项目为「湖州荣恒双林油品销售有限公司双林加油站建设项目」（`p3`）。弹窗宽度 `min(1600px, 98vw)`。**定位图标 / 地址文字** → 仅地图定位（铺满态先收起 overlay 再 fly，对齐 `onLocateStatDrawerCardOnMap`）；再次点击同一地址取消橙边）；**地址行空白区、标签区** 与标题/指标区一致打开详情；二者互不干扰。已有定位选中时，点击抽屉 **标题行空白** 可清除地图联动选中。**定位图标与地址文字** 悬停其一则二者联动高亮（蓝色系，与卡片橙边选中态无关）；地址行空白区无悬浮反馈。
- 右栏 **`CmProjectCard`** 头部：**项目名称** 独占首行（过长单行省略 + **`Tooltip`**）；**有阶段滞留预警**时标题下展示 **`HzPhaseAlertLine` 滞留提示条**（前置红色圆圈感叹号 + 文案，规则与预警覆盖层同源，`getCmProjectPhaseAlert`）；标题行 **右上角五角星** 可收藏/取消收藏（`stopPropagation`，不打开详情）。**行政区划 / 当前阶段** 标签与 **地址行** 同一行：左侧为定位图标 + 地址文字，右侧右对齐排列标签，标签 **不截断省略**（如「吴兴区」「土地供应」全文可见）。**当前阶段** 标签使用与左栏 **`hz-cm-phase-card--phase-*`** 相同的主题色；**行政区划** 经 `CmDistrictTag` 规范为五区县之一后展示为默认蓝灰标签。卡片底部 **三列 KPI** 固定展示 **总用地 / 总投资 / 建设性质**，数据与 `ParcelDetailModal` **基本信息** 同源（`getProjectCardMetrics` → `resolveCmBasicInfoCellText`）；**数值型** KPI 单位写在标题括号内（**总用地(m²)**、**总投资(万元)**，与详情字段口径一致），展示值为纯数字；枚举型 **建设性质** 无单位；数值类型区分 `stat` / `enum` 样式。**overlay 列表视图** 表格中 **当前阶段** 列复用阶段主题色标签；**项目属地** 等区划列同源 `CmDistrictTag`；其余数据列与详情 **基本信息** 字段同源（项目名称、项目代码、项目类型…）；**操作列** 固定右侧不参与横向滚动，列宽容纳「定位、查看、收藏（或已收藏）」完整展示不被裁切；操作按钮用 `zht-alarm-rail__table-actions` flex 排列（`gap: 8px`）、无竖线分隔；最前提供同款收藏星标（与卡片、详情弹窗状态同步）。
- **项目收藏（P1）**：以 `ConstructionProject.id` 为键，`useCmProjectFavorites` + `localStorage` 键 `hz-cm-project-favorites` 持久化。三处入口一致：**卡片右上角**、**列表操作列**、**详情弹窗**（Ant Design **默认右上角关闭**；收藏星标在其左侧，独立悬浮）。打开详情时若带 `constructionProjectId`（项目卡/列表）或经 `findConstructionProjectByParcelId` / 当前定位高亮项目反查地块，则显示收藏。右栏 **rail** 关键词筛选行右侧、**overlay** 筛选行末尾提供 **「只看收藏」** `Checkbox`，与关键词/左栏申报时间查询取交集；无收藏结果时 Empty 文案为「暂无收藏项目」。
- **批量导出（P1）**：右栏 **卡片 / 列表视图**（含 **rail** 与 **overlay 铺满态**，预警列表 `CmProjectAlertRailPanel` 同源）支持 **导出模式**（`useCmProjectExportMode` + `CmProjectExportModeBar`）。**日常态**筛选行保留 **搜索 / 只看收藏 / 批量导出**（rail 右对齐）；**列表铺满地图**（overlay）时另增 **导出记录** 入口，卡片与列表**不显示**勾选框。**点击「批量导出」** → 进入 **导出模式**：筛选区替换为浅蓝 **导出模式顶栏**（**全选**（仅作用于**当前列表**）+ **已选计数** + **取消 / 确认导出**）。**跨阶段多选**：切换左栏事项阶段时**保留**已勾选项目，可先在阶段 A 勾选、再切至阶段 B 继续勾选，**确认导出**时汇总全部已选项目；顶栏默认 **已选 N / M 项**（N、M 为当前列表内已选/可见条数），当存在其他阶段已选时展示 **已选 N 项（当前列表 A / M）**（N 为跨阶段累计、A 为当前列表内已选）。**全选**仅勾选/取消当前列表；列表 `rowSelection` 通过 `syncDisplaySelection` 同步当前页勾选，不清空其他阶段已选。**切换区县**时自动剔除当前区县范围外历史勾选。卡片左上角复选框、**点击标题 / 地址或卡片主体**（收藏除外，**不可地图定位**）、列表 **点击整行**（操作列除外）切换勾选；选中卡片 **2px 蓝色描边**（**rail 单列** 外边框；**overlay 铺满网格** 用 **1px 槽缝 + 内描边**，避免相邻 card 边框叠成双线）。点击 **确认导出** → **`CmProjectBatchExportModal`**（默认全量：**基本信息** + **9 阶段**属性字段 + 各阶段 **阶段资料**，与详情各 Tab / 档案同源；**全部折叠面板**分组勾选，默认全选且折叠收起，标题行可整组勾选；**阶段资料**仅影响 zip 附件，不进 Excel）。Excel **第 1 行主标题**（基本信息、预审与选址、农转用报批…同级合并单元格）、**第 2 行副标题**（字段名）、**第 3 行起**数据；zip 为 **AES 加密压缩包**（随机解压密码，导出成功弹窗展示并可复制；**导出记录** `CmProjectExportRecordsModal`（居中弹窗）+ 项目本地 JSON `cm-project-export-records.json`（开发态经 `/api/huzhou-cm/export-records` 读写，不存浏览器）持久化，含时间/导出人/文件名/项目数/字段数/字段勾选快照/密码，**解压密码列**密码后 inline 复制图标，**操作列**支持 **重复下载**（沿用原文件名与密码）与单条删除，最多 50 条），含 **建设工程项目清单.xlsx**、**地块矢量数据.geojson**（勾选项目地块面 FeatureCollection，属性含项目 id/名称/区划/阶段等，与地图土地利用面同源）及 **附件/{区县}/{项目名称}/**（演示占位 `.txt`，按所选阶段资料筛选）。
- 首页工具条入口：业务流程、事项台账（后续可并入顶栏外壳）。

---

## 内容规划

### 2.1 信息架构

```
建设工程画像
├── 首页（三栏）
│   ├── 左 · 建设总览（指标列表）
│   ├── 中 · 地图（同空间利用画像）
│   └── 右 · 建设工程项目列表
├── 列表详情
├── 项目画像
├── 事项台账 ×10
└── 业务流程图
```

### 2.2 数据来源

- **地图**：复用 `huzhou-spatial-portrait` 的 GeoJSON、`hzLayerControlState`、`HuzhouMapWithParcelDetail`（含地块详情 Modal）。
- **点击地块（P1）**：命中带 `parcelId` 的演示面 → `ParcelDetailModal`；默认视野吴兴区附近公园面（`osm_id` 165813144）映射太禾案例。
- **地块详情弹窗**：`ParcelDetailModal` 使用 Ant Design `Modal` 的 **`centered`**，在视口（或地图全屏挂载容器）内垂直水平居中，避免默认 `top: 100px` 偏上。
- **看板/列表**：`mock/projects.ts`（26 条演示项目，含 `phaseEnteredAt` 与 9 阶段受理时间 Mock，与左栏默认「年度 + 今年」按 **当前阶段时间节点** 筛选联动）、`cmProjectPhaseTime.ts`（当前阶段时间解析与区间匹配）、`mock/constructionProjectParcel.ts`（详情弹窗合并台账：基本信息 24 项填满、9 阶段时间轴与 `phaseKey` 标签对齐）、`mock/phaseDistribution.ts`、`mock/projectCardMetrics.ts`、`mock/projectDrawerCards.ts`、`matterConfigs.ts`。

### 2.3 访问路径

- `/prototypes/huzhou-construction-portrait`

---

## 布局与结构

### 3.1 整体布局

- `zht-root hz-cm-root` + `zht-body hz-cm-body` 三列 flex（对齐 `zonghe-taishi`）。左右看板 **同宽**（默认 400px，窄屏 ≤1100px 时 320px）。
- **左右看板互换（P1）**：地图工具条 **全屏按钮下方** 提供「左右看板互换」（`HzCmPanelLayoutSwapToolBtn`）；切换时 `hz-cm-body--panels-swapped` 使 **建设总览 ↔ 建设工程项目列表** 视觉对调（`flex-direction: row-reverse`），地图列保持居中。切换前自动收起列表铺满 overlay 与预警 stack overlay。列表铺满动画：默认自右滑入；互换后自左滑入。偏好经 `useHzCmPanelLayoutSwap('construction')` 写入 `localStorage` 键 `hz-cm-panel-layout-swapped:construction`。
- 样式：`style.css` → `@import zonghe-taishi` + `huzhou-spatial-portrait`。

### 3.2 与空间利用画像关系

- **并列入口**，不共享 `index.tsx`；地图实现 **直接 import** 空间利用画像模块，保持数据与图层一致。

---

## 视觉规范

- 白底左右看板 + 深色地图槽（综合态势同源）。
- 事项台账全屏页使用 `facility-mgmt-standalone` 深色侧栏。

---

## 验收与限制

- 运行 `node scripts/check-app-ready.mjs /prototypes/huzhou-construction-portrait`。
- 无真实接口；图上选择等为占位。
