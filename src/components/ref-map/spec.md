# 地图组件

## 📋 业务与功能

### 1.1 核心目标
为原型项目提供通用的地图可视化能力，支持散点标记、热力图、轨迹线等多种地图可视化类型。基于ECharts实现，无需外部API密钥，同时预留接入天地图/高德地图等真实地图SDK的接口。

### 1.2 功能清单

| 功能模块 | 功能描述 | 优先级 |
|---------|---------|-------|
| 散点标记 | 在地图上显示标记点，支持不同类型（正常/告警/预警）用不同颜色区分 | P0 |
| 热力图 | 基于数值展示热力分布效果 | P0 |
| 动态闪烁点 | 带脉冲动画效果的标记点，适合重点设施展示 | P1 |
| 轨迹线图 | 显示起点到终点的轨迹线路，支持流动动画效果 | P1 |
| 交互事件 | 标记点点击、地图点击、缩放变化等事件 | P0 |
| 图层控制 | 显示/隐藏不同图层 | P1 |
| 地图控件 | 缩放控件、图例、工具栏 | P2 |

### 1.3 交互要点

- **标记点点击**：点击标记点触发 `onMarkerClick` 事件，返回标记点完整数据
- **地图空白点击**：点击地图空白区域触发 `onMapClick` 事件
- **缩放变化**：使用鼠标滚轮或手势缩放时触发 `onZoomChange` 事件
- **图层切换**：通过动作 `showLayer` / `hideLayer` 控制图层显示
- **标记点悬停**：鼠标悬停显示提示框，包含名称、坐标、数值和附加信息

---

## 📊 内容规划

### 2.1 信息架构

```
地图组件
├── 地图画布（ECharts Geo坐标系）
├── 可视化图层
│   ├── 散点标记层（Scatter）
│   ├── 热力图层（Heatmap）
│   ├── 动态闪烁层（EffectScatter）
│   └── 轨迹线层（Lines）
├── 交互控件
│   ├── 缩放控件（+/-按钮）
│   ├── 图例说明
│   └── 工具栏
└── 信息展示
    ├── 提示框（Tooltip）
    └── 详情弹窗
```

### 2.2 数据来源

- **数据类型**：标记点数组、轨迹线数组
- **数据源**：组件配置传入或通过动作更新
- **关键字段**：
  - `name`: 标记点名称（显示在标签和提示框）
  - `lng`: 经度（-180 到 180）
  - `lat`: 纬度（-90 到 90）
  - `value`: 数值（用于热力图、标记点大小）
  - `type`: 类型（normal/alert/warning，控制颜色）
  - `info`: 附加信息对象（在提示框中展示）

### 2.3 内容示例

**标记点数据示例**：
```javascript
[
  {
    name: '监测点A',
    lng: 112.5,
    lat: 27.85,
    value: 85,
    type: 'normal',
    info: { status: '正常', level: 'II类', ph: 7.2 }
  },
  {
    name: '监测点B',
    lng: 112.52,
    lat: 27.82,
    value: 45,
    type: 'alert',
    info: { status: '超标', level: 'V类', cod: '60mg/L' }
  }
]
```

**轨迹线数据示例**：
```javascript
[
  {
    name: '管线A段',
    from: [112.5, 27.85],
    to: [112.52, 27.82]
  }
]
```

---

## 🎨 布局与结构

### 3.1 整体布局

- **布局模式**：自由布局，地图画布占据整个容器
- **容器宽度**：100%宽度和高度，自适应父容器
- **关键尺寸**：
  - 最小高度：400px（桌面端），300px（移动端）
  - 大屏（≥1920px）：最小高度600px
  - 标记点大小：根据value值动态计算（10-30px）

### 3.2 响应式适配

| 断点 | 布局调整 |
|-----|---------|
| 桌面端（≥1280px） | 完整布局，显示所有控件 |
| 平板（768-1279px） | 简化图例，控件尺寸缩小 |
| 移动端（<768px） | 最小化控件，优先展示地图 |
| 大屏（≥1920px） | 增大控件尺寸，提升信息密度 |

---

## 🎨 视觉规范

### 4.1 设计规范来源

**设计规范来源**：内置 frontend-design

基于ECharts默认主题，通过配置项自定义色彩方案，与Ant Design设计系统保持一致。

### 4.2 自定义设计要点

**自定义色彩**：
| 颜色 | 色值 | 用途 |
|-----|-----|-----|
| 主题色 | #1890ff | 正常标记点、轨迹线 |
| 告警色 | #f5222d | 告警标记点 |
| 预警色 | #faad14 | 预警标记点 |
| 热力图低 | #50a3ba | 热力图低值区域 |
| 热力图中 | #eac736 | 热力图中值区域 |
| 热力图高 | #d94e5d | 热力图高值区域 |

**标记点尺寸映射**：
- value值 0-30 → 大小 10px
- value值 30-70 → 大小 15-20px
- value值 70-100 → 大小 20-30px

### 4.3 组件状态

- **默认态**：地图居中显示，标记点正常渲染
- **悬停态**：标记点放大1.2倍，显示提示框
- **点击态**：触发点击事件，可联动显示详情
- **加载态**：显示加载动画（ECharts内置loading）

---

## ⚙️ Axure API 说明

### 5.1 事件列表（eventList）

| 事件名称 | Payload 类型 | 触发时机 | 说明 |
|---------|-------------|---------|------|
| `onMarkerClick` | `object` | 点击标记点时 | 返回标记点完整数据 |
| `onMapClick` | `object` | 点击地图空白处 | 返回点击坐标信息 |
| `onZoomChange` | `{zoom: number, center: [lng, lat]}` | 地图缩放变化时 | 返回新缩放级别和中心点 |
| `onLayerChange` | `{layer: string, visible: boolean}` | 图层显示/隐藏时 | 返回图层状态和可见性 |

### 5.2 动作列表（actionList）

| 动作名称 | Params 类型 | 参数说明 | 功能描述 |
|---------|------------|---------|---------|
| `updateData` | `{markers: array, lines: array}` | 标记点和轨迹线数据 | 更新地图数据 |
| `resize` | - | - | 调整地图大小 |
| `setCenter` | `{center: [lng, lat]}` | 新的中心点坐标 | 设置地图中心位置 |
| `setZoom` | `{zoom: number}` | 缩放级别 1-18 | 设置地图缩放级别 |
| `showLayer` | `{layer: string}` | 图层名称 | 显示指定图层 |
| `hideLayer` | `{layer: string}` | 图层名称 | 隐藏指定图层 |
| `addMarker` | `{marker: object}` | 单个标记点数据 | 添加标记点 |
| `removeMarker` | `{name: string}` | 标记点名称 | 移除指定标记点 |
| `clearAll` | - | - | 清除所有数据 |

### 5.3 变量列表（varList）

| 变量名称 | 类型 | 默认值 | 说明 |
|---------|-----|-------|------|
| `chart_instance` | `object` | null | ECharts实例对象 |
| `current_markers` | `array` | [] | 当前所有标记点数据 |
| `center` | `array` | [112.5, 27.8] | 当前地图中心点 |
| `zoom` | `number` | 11 | 当前缩放级别 |

### 5.4 配置项列表（configList）

| 配置项名称 | 类型 | 默认值 | 说明 |
|----------|-----|-------|------|
| `title` | `string` | '' | 地图标题 |
| `mapType` | `select` | 'scatter' | 地图类型：scatter/heatmap/effectScatter/lines |
| `centerLng` | `input` | '112.5' | 中心经度 |
| `centerLat` | `input` | '27.8' | 中心纬度 |
| `zoom` | `input` | '11' | 初始缩放级别 |
| `themeColor` | `colorPicker` | '#1890ff' | 主题色 |
| `alertColor` | `colorPicker` | '#f5222d' | 告警色 |
| `showLegend` | `checkbox` | true | 显示图例 |
| `showTooltip` | `checkbox` | true | 显示提示框 |
| `enableZoom` | `checkbox` | true | 允许缩放 |
| `showLabels` | `checkbox` | true | 显示标签 |

### 5.5 数据项列表（dataList）

**markers 数据结构**：
```typescript
{
  name: string;      // 标记点名称
  lng: number;       // 经度
  lat: number;       // 纬度
  value: number;     // 数值（用于热力图、大小映射）
  type: string;      // 类型：normal/alert/warning
  info: object;      // 附加信息（任意键值对）
}
```

**lines 数据结构**：
```typescript
{
  name: string;           // 线路名称
  from: [number, number];  // 起点坐标 [lng, lat]
  to: [number, number];    // 终点坐标 [lng, lat]
}
```

---

## 🔧 接入真实地图SDK说明

本组件基于ECharts实现，如需接入真实地图底图（天地图/高德/百度），可参考以下方式：

### 接入天地图

1. 申请天地图开发者密钥：https://www.tianditu.gov.cn/
2. 在项目中引入天地图JS SDK
3. 修改组件代码，使用`T.Map`初始化真实地图
4. 将ECharts作为覆盖层叠加在天地图上

### 接入高德地图

1. 申请高德地图Key：https://lbs.amap.com/
2. 引入高德地图API脚本
3. 使用`AMap.Map`创建地图实例
4. 通过`AMap.Map`获取经纬度坐标系，同步到ECharts

### 预留接口

组件中已预留以下接口位置：
- `initRealMap()` - 初始化真实地图SDK
- `syncEChartsToMap()` - 同步ECharts数据到地图
- `syncMapToECharts()` - 同步地图状态到ECharts

---

## ✅ 验收标准

### 功能验收
- [x] 支持散点图模式显示标记点
- [x] 支持热力图模式显示热力分布
- [x] 支持动态闪烁点模式
- [x] 支持轨迹线图模式
- [x] 标记点支持不同类型颜色区分（normal/alert/warning）
- [x] 点击标记点触发事件并返回数据
- [x] 地图支持缩放和拖拽
- [x] 支持通过动作更新数据
- [x] 支持动态添加/删除标记点
- [x] 提示框显示完整标记点信息

### 视觉验收
- [x] 标记点颜色符合设计规范（蓝/红/黄）
- [x] 标记点大小随value值变化
- [x] 热力图配色渐变自然
- [x] 轨迹线动画流畅
- [x] 提示框样式美观，信息清晰
- [x] 响应式适配正确

### 性能验收
- [x] 100个标记点渲染流畅
- [x] 缩放/拖拽无卡顿
- [x] 内存无泄漏
