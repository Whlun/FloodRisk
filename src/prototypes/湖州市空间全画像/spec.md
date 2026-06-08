# 湖州市空间全画像（系统壳）

## 功能

- 单入口顶栏：**视觉与韶山系统壳一致** — 背景 `#1E5BB5`、左侧标题「湖州项目全生命周期管理」（`YouSheBiaoTiHei` 30px，窄屏 ≤1200px 为 18px）、**视口居中**一级菜单（每项带 Ant Design 图标：工作台/利用/建管/预警工程/低效用地分析）、右侧 **公共「预警」**（`BellOutlined` + 右上角小红点，有预警时显示、不展示数字）+ **「管理员 ▾」**（`ShellUserMenu`：点击展开下拉 → **退出登录** → 携带当前页面地址跳转 `/__axhub/auth/logout?redirect=…`，重新登录后回到**同一项目子路径**，不会进入管理台首页）+ **全局区县下拉**；**预警**与**管理员**悬浮态与一级菜单项一致（半透明白底 `rgba(255,255,255,0.12)`、文案高亮为 `#fff`）（`HzShellRegionProvider` + `hz-shell-region-select`）。角标为当前壳区县下 **前三未预警项目数**（`countCmIndustrialLandAlerts`，与所在 Tab 无关）。点击：**直接跳转** `zhongda`（预警工程画像），不再弹出建管页预警抽屉。
- **全局区县**：壳层 Context 维护 `regionKey`，切换一级菜单 Tab **不重置**；已挂接子页（工作台、空间利用画像、建设工程画像）的看板与列表随选中区县联动。
- 子路径与业务页对应，主内容区嵌套对应子原型；**默认子路径**为 `yizhangtu`（工作台）。
- **已挂接**：`yizhangtu` → 工作台（`../huzhou-workbench`）；`liyong` → 空间利用画像（`../huzhou-spatial-portrait`）；`jianguan` → 建设工程画像（`../huzhou-construction-portrait`）；`zhongda` → 预警工程画像（`../huzhou-alert-portrait`）。
- **占位**：`dixiao` 展示「功能建设中，敬请期待」空白页（浅灰 `#f0f2f5` 背景）。
- **Tab 跳转**：`HzShellNavProvider` + `useHzShellNav().navigateSub`，供工作台快捷入口与子页内跳转使用。

## 子路径与页面

| 子路径 | 菜单 | 页面 |
|--------|------|------|
| `yizhangtu` | 工作台 | `../huzhou-workbench`（默认） |
| `liyong` | 空间利用画像 | `../huzhou-spatial-portrait` |
| `jianguan` | 建设工程画像 | `../huzhou-construction-portrait` |
| `zhongda` | 预警工程画像 | `../huzhou-alert-portrait` |
| `dixiao` | 低效用地分析 | 占位 |

## 访问

开发预览地址形态：`/prototypes/湖州市空间全画像/{子路径}`。仅访问壳根路径时，会 `replace` 为默认子路径 `yizhangtu`。

示例：

- `/prototypes/湖州市空间全画像/yizhangtu` — 工作台（默认）
- `/prototypes/湖州市空间全画像/liyong` — 空间利用画像
- `/prototypes/湖州市空间全画像/jianguan` — 建设工程画像
- `/prototypes/湖州市空间全画像/zhongda` — 预警工程画像

## 技术说明

- 顶栏样式 **`@import`** 复用 **`../韶山高新区水环境综合整治一张图/style.css`**（类名 `ss-one-map-shell__*`）。
- 全局区县：`hzShellRegionContext.tsx` + `huzhou-lifecycle-shared/hzRegionScope.ts`（`HzRegionKey` / `HZ_REGION_OPTIONS`）。
- Tab 导航：`hzShellNavContext.tsx` 注入 `navigateSub`（内部 `history.pushState`）。
- 路由模式与韶山壳一致：`history.pushState` + `popstate` 同步子路径。
- 子业务页 **`import` 静态挂载**（不使用 `React.lazy`）：Axhub 单入口 IIFE 构建不支持分包动态 `import`。
- 子页面根层（`.zht-root` 等）在壳内通过 CSS 改为 `height: 100%`，避免与顶栏双计视口高度。

## 验收

- 运行 `node scripts/check-app-ready.mjs /prototypes/湖州市空间全画像`。
- 顶栏五项可切换；默认进入工作台；顶栏区县下拉在各 Tab 间切换后保持选中并联动看板；`yizhangtu`、`liyong`、`jianguan`、`zhongda` 展示完整业务页；`dixiao` 为占位页。
