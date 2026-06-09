# 韶山高新区水环境综合整治一张图（系统壳）

## 功能

- 单入口顶栏：标题「**韶山市**水环境综合整治一张图」、顶栏背景色 `#1E5BB5`、中间一级菜单（已适当拉开项间距）、右侧 **报警**（铃铛 `Badge` 角标演示数量）与 **管理员**（点击下拉，含 **退出登录** → `/__axhub/auth/logout`）；二者悬浮态与一级菜单项一致（半透明白底、文案高亮）。**报警** 不再走全局 **`Drawer`**，而通过 **`shellAlarmRailBridge.tsx`** 通知 **`../zonghe-taishi/index.tsx`**：把 **`rightRailView`** 切到 **`alarm`**，使 **`ZhtAlarmRailPanel`** 占据 **`aside.zht-right-rail`**（与左侧指标明细 **`ZhtLeftStatDrawer` rail** 同款右侧栏切换，地图保持同屏便于联动）。若当前子路径不是 **`zonghe`**，则 **`sessionStorage`** 写入一次性 **`ss-shell-pending-alarm-rail`** 并跳转 **`zonghe`**，综合态势挂载后再打开报警栏。顶栏主标题使用本地字体 **`YouSheBiaoTiHei`**（`../zonghe-taishi/assets/fonts/youshebiaotihei.ttf`），回退系统中文字体栈，当前字号为 **24px**。
- 子路径与业务页对应，主内容区嵌套对应子原型；**默认子路径**为 `zonghe`（综合态势）。
- **遥感监测**子路径为独立子页面 `../遥感监测`（MapLibre 影像 + 图层控制演示）。

## 子路径与页面

| 子路径 | 页面 |
|--------|------|
| `zonghe` | 综合态势 `../zonghe-taishi`（默认） |
| `sheshi` | 设施管理 `../韶山水环境设施管理系统` |
| `shengtai` | 生态整治 `../生态整治` |
| `yaogan` | 遥感监测 `../遥感监测` |
| `yingji` | 应急协同 `../应急协同` |
| `xitong` | 系统管理 `../韶山水环境系统管理` |

## 访问

开发预览地址形态：`/prototypes/韶山高新区水环境综合整治一张图/{子路径}`。仅访问壳根路径时，会 `replace` 为默认子路径 `zonghe`。

示例：

- `/prototypes/韶山高新区水环境综合整治一张图/zonghe` — 综合态势（默认）
- `/prototypes/韶山高新区水环境综合整治一张图/sheshi` — 设施管理

与湖州壳一致，目录内提供 `index.html`（Vite 物理入口，供构建与直连 `index.html` 场景）；子路径预览仍走虚拟 HTML + Preview Host。

## 技术说明

- **`ShellAlarmRailBridgeProvider`** 包住壳内主体（见 **`index.tsx`**），仅供 **`ShellInner`** 铃铛与 **`zonghe-taishi`** 注册回调配对。
- 子业务页 **`import` 静态挂载**（**不使用** `React.lazy`）：Axhub **单入口 IIFE** 构建不支持分包动态 `import`，否则会触发 Rollup「`output.format: iife` 不支持代码分割」。代价为首屏 bundle 较大。
- **依赖子原型 `index.tsx` 不再自挂载 `createRoot`**，由统一预览壳挂载，避免在壳中二次抢占根节点。
- **域名访问登录保护**：未登录访问子路径（如 `zonghe`）时整页跳转 `/login`；开发态源码模块（`index.tsx` 等）在登录中间件中放行，避免 Preview Host 动态 `import` 被重定向为 HTML 导致白屏（与湖州壳 `jianguan` 行为一致）。
