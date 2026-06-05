/**
 * @name 地图组件
 *
 * 参考资料：
 * - /rules/development-guide.md
 * - /rules/axure-api-guide.md
 * - /skills/default-resource-recommendations/SKILL.md (ECharts)
 *
 * 功能说明：
 * 1. 支持多种地图可视化类型：散点图、热力图、路线图、区域填充
 * 2. 基于ECharts实现，无需外部地图API密钥
 * 3. 预留天地图/高德地图SDK接入接口
 * 4. 支持标记点交互（点击、悬停显示详情）
 */

import './style.css';

import React, { useState, useCallback, useImperativeHandle, forwardRef, useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { ScatterChart, EffectScatterChart, LinesChart, HeatmapChart, MapChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  GeoComponent,
  VisualMapComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// 注册需要的组件
echarts.use([
  ScatterChart,
  EffectScatterChart,
  LinesChart,
  HeatmapChart,
  MapChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  GeoComponent,
  VisualMapComponent,
  CanvasRenderer
]);

import type {
  KeyDesc,
  DataDesc,
  ConfigItem,
  Action,
  EventItem,
  CSSProperties,
  AxureProps,
  AxureHandle
} from '../../common/axure-types';

// 事件列表
const EVENT_LIST: EventItem[] = [
  { name: 'onMarkerClick', desc: '点击地图标记点时触发，返回标记点数据' },
  { name: 'onMapClick', desc: '点击地图空白区域时触发' },
  { name: 'onZoomChange', desc: '地图缩放级别变化时触发' },
  { name: 'onLayerChange', desc: '切换图层时触发' }
];

// 动作列表
const ACTION_LIST: Action[] = [
  { name: 'updateData', desc: '更新地图数据（标记点、热力图数据等）' },
  { name: 'resize', desc: '调整地图大小' },
  { name: 'setCenter', desc: '设置地图中心点' },
  { name: 'setZoom', desc: '设置地图缩放级别' },
  { name: 'showLayer', desc: '显示指定图层' },
  { name: 'hideLayer', desc: '隐藏指定图层' },
  { name: 'addMarker', desc: '添加单个标记点' },
  { name: 'removeMarker', desc: '移除标记点' },
  { name: 'clearAll', desc: '清除所有图层和数据' }
];

// 变量列表
const VAR_LIST: KeyDesc[] = [
  { name: 'chart_instance', desc: 'ECharts 实例对象' },
  { name: 'current_markers', desc: '当前所有标记点数据' },
  { name: 'center', desc: '当前地图中心点坐标 [lng, lat]' },
  { name: 'zoom', desc: '当前缩放级别' }
];

// 配置项列表
const CONFIG_LIST: ConfigItem[] = [
  { type: 'input', attributeId: 'title', displayName: '地图标题', info: '显示在地图顶部的标题文本', initialValue: '' },
  { type: 'select', attributeId: 'mapType', displayName: '地图类型', info: '选择地图可视化类型', initialValue: 'scatter', options: [
    { label: '散点图（标记点）', value: 'scatter' },
    { label: '热力图', value: 'heatmap' },
    { label: '轨迹线图', value: 'lines' },
    { label: '动态闪烁点', value: 'effectScatter' }
  ]},
  { type: 'input', attributeId: 'centerLng', displayName: '中心经度', info: '地图中心点经度', initialValue: '112.5' },
  { type: 'input', attributeId: 'centerLat', displayName: '中心纬度', info: '地图中心点纬度', initialValue: '27.8' },
  { type: 'input', attributeId: 'zoom', displayName: '缩放级别', info: '地图初始缩放级别（1-18）', initialValue: '11' },
  { type: 'colorPicker', attributeId: 'themeColor', displayName: '主题色', info: '标记点的主色调', initialValue: '#1890ff' },
  { type: 'colorPicker', attributeId: 'alertColor', displayName: '告警色', info: '异常标记点的颜色', initialValue: '#f5222d' },
  { type: 'checkbox', attributeId: 'showLegend', displayName: '显示图例', info: '是否显示图例', initialValue: true },
  { type: 'checkbox', attributeId: 'showTooltip', displayName: '显示提示框', info: '鼠标悬停是否显示提示', initialValue: true },
  { type: 'checkbox', attributeId: 'enableZoom', displayName: '允许缩放', info: '是否允许鼠标滚轮缩放', initialValue: true },
  { type: 'checkbox', attributeId: 'showLabels', displayName: '显示标签', info: '是否显示标记点名称标签', initialValue: true }
];

// 数据项列表
const DATA_LIST: DataDesc[] = [
  {
    name: 'markers',
    desc: '标记点数据数组',
    keys: [
      { name: 'name', desc: '标记点名称' },
      { name: 'lng', desc: '经度' },
      { name: 'lat', desc: '纬度' },
      { name: 'value', desc: '数值（用于热力图、大小映射）' },
      { name: 'type', desc: '标记点类型（normal/alert/warning）' },
      { name: 'info', desc: '附加信息对象' }
    ]
  },
  {
    name: 'lines',
    desc: '轨迹线数据（用于lines类型）',
    keys: [
      { name: 'from', desc: '起点坐标 [lng, lat]' },
      { name: 'to', desc: '终点坐标 [lng, lat]' },
      { name: 'name', desc: '线路名称' }
    ]
  }
];

// 中国主要城市坐标数据（用于演示）
const DEFAULT_GEO_DATA = {
  北京: [116.4074, 39.9042],
  上海: [121.4737, 31.2304],
  广州: [113.2644, 23.1291],
  深圳: [114.0859, 22.547],
  成都: [104.0668, 30.5728],
  杭州: [120.1551, 30.2741],
  武汉: [114.3054, 30.5928],
  西安: [108.9398, 34.3416],
  南京: [118.7969, 32.0603],
  长沙: [112.9388, 28.2282]
};

const Component = forwardRef<AxureHandle, AxureProps>(function MapComponent(innerProps, ref) {
  // 安全解构 props 并提供默认值
  const dataSource = innerProps && innerProps.data ? innerProps.data : {};
  const configSource = innerProps && innerProps.config ? innerProps.config : {};
  const onEventHandler = typeof innerProps.onEvent === 'function' ? innerProps.onEvent : function () { return undefined; };
  const container = innerProps && innerProps.container ? innerProps.container : null;

  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);

  // 配置项解析
  const title = typeof configSource.title === 'string' ? configSource.title : '';
  const mapType = configSource.mapType || 'scatter';
  const centerLng = parseFloat(configSource.centerLng) || 112.5;
  const centerLat = parseFloat(configSource.centerLat) || 27.8;
  const zoomLevel = parseInt(configSource.zoom) || 11;
  const themeColor = configSource.themeColor || '#1890ff';
  const alertColor = configSource.alertColor || '#f5222d';
  const showLegend = configSource.showLegend !== false;
  const showTooltip = configSource.showTooltip !== false;
  const enableZoom = configSource.enableZoom !== false;
  const showLabels = configSource.showLabels !== false;

  // 数据解析
  const markersData = Array.isArray(dataSource.markers) ? dataSource.markers : [
    { name: '监测点A', lng: 112.5, lat: 27.85, value: 85, type: 'normal', info: { status: '正常', level: 'II类' } },
    { name: '监测点B', lng: 112.52, lat: 27.82, value: 45, type: 'alert', info: { status: '超标', level: 'V类' } },
    { name: '监测点C', lng: 112.48, lat: 27.88, value: 72, type: 'normal', info: { status: '正常', level: 'III类' } },
    { name: '泵站1', lng: 112.55, lat: 27.8, value: 90, type: 'normal', info: { status: '运行中', capacity: '500m³/h' } },
    { name: '排污口1', lng: 112.45, lat: 27.78, value: 30, type: 'warning', info: { status: '预警', cod: '45mg/L' } }
  ];

  const linesData = Array.isArray(dataSource.lines) ? dataSource.lines : [];

  // 状态管理
  const currentMarkersState = useState<any[]>(markersData);
  const currentMarkers = currentMarkersState[0];
  const setCurrentMarkers = currentMarkersState[1];

  const centerState = useState<[number, number]>([centerLng, centerLat]);
  const center = centerState[0];
  const setCenter = centerState[1];

  const zoomState = useState<number>(zoomLevel);
  const zoom = zoomState[0];
  const setZoom = zoomState[1];

  // 事件发射器
  const emitEvent = useCallback(function (eventName: string, payload?: any) {
    try {
      onEventHandler(eventName, payload);
    } catch (error) {
      console.warn('onEvent 调用失败:', error);
    }
  }, [onEventHandler]);

  // 根据类型获取颜色
  const getMarkerColor = useCallback(function (type: string) {
    const colorMap: Record<string, string> = {
      normal: themeColor,
      alert: alertColor,
      warning: '#faad14'
    };
    return colorMap[type] || themeColor;
  }, [themeColor, alertColor]);

  // 生成ECharts配置
  const getChartOption = useCallback(function () {
    const baseGeo = {
      map: undefined as any,
      roam: enableZoom,
      center: center,
      zoom: zoom,
      label: {
        show: showLabels,
        color: '#666'
      },
      itemStyle: {
        areaColor: '#f5f5f5',
        borderColor: '#ddd'
      },
      emphasis: {
        label: { show: true },
        itemStyle: {
          areaColor: '#e6f7ff'
        }
      }
    };

    // 构建散点数据
    const scatterData = currentMarkers.map(function (item) {
      return {
        name: item.name,
        value: [item.lng, item.lat, item.value || 0],
        itemStyle: {
          color: getMarkerColor(item.type)
        },
        originalData: item
      };
    });

    // 构建热力图数据
    const heatmapData = currentMarkers.map(function (item) {
      return [item.lng, item.lat, item.value || 0];
    });

    // 构建轨迹线数据
    const linesSeriesData = linesData.map(function (line) {
      return {
        name: line.name,
        coords: [line.from, line.to]
      };
    });

    const series: any[] = [];

    // 根据地图类型添加对应的系列
    switch (mapType) {
      case 'scatter':
        series.push({
          type: 'scatter',
          coordinateSystem: 'geo',
          data: scatterData,
          symbolSize: function (val: any) {
            return Math.max(10, Math.min(30, (val[2] || 50) / 3));
          },
          label: {
            show: showLabels,
            formatter: '{b}',
            position: 'top'
          },
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
          }
        });
        break;

      case 'effectScatter':
        series.push({
          type: 'effectScatter',
          coordinateSystem: 'geo',
          data: scatterData,
          symbolSize: function (val: any) {
            return Math.max(10, Math.min(25, (val[2] || 50) / 4));
          },
          showEffectOn: 'render',
          rippleEffect: {
            brushType: 'stroke',
            scale: 3
          },
          label: {
            show: showLabels,
            formatter: '{b}',
            position: 'top'
          }
        });
        break;

      case 'heatmap':
        series.push({
          type: 'heatmap',
          coordinateSystem: 'geo',
          data: heatmapData,
          pointSize: 20,
          blurSize: 15
        });
        break;

      case 'lines':
        series.push({
          type: 'lines',
          coordinateSystem: 'geo',
          data: linesSeriesData,
          effect: {
            show: true,
            period: 6,
            trailLength: 0.7,
            color: themeColor,
            symbolSize: 3
          },
          lineStyle: {
            color: themeColor,
            width: 2,
            opacity: 0.6,
            curveness: 0.2
          }
        });
        // 同时显示起点和终点标记
        series.push({
          type: 'scatter',
          coordinateSystem: 'geo',
          data: scatterData,
          symbolSize: 12,
          label: {
            show: showLabels,
            formatter: '{b}',
            position: 'top'
          }
        });
        break;
    }

    return {
      backgroundColor: 'transparent',
      title: title ? {
        text: title,
        left: 'center',
        top: 10,
        textStyle: {
          color: '#333',
          fontSize: 16
        }
      } : undefined,
      tooltip: showTooltip ? {
        trigger: 'item',
        formatter: function (params: any) {
          if (params.seriesType === 'scatter' || params.seriesType === 'effectScatter') {
            const data = params.data.originalData || {};
            let html = `<div style="font-weight:bold;margin-bottom:5px">${params.name}</div>`;
            html += `<div>坐标: ${params.value[0].toFixed(4)}, ${params.value[1].toFixed(4)}</div>`;
            if (data.value !== undefined) {
              html += `<div>数值: ${data.value}</div>`;
            }
            if (data.info) {
              Object.keys(data.info).forEach(function (key) {
                html += `<div>${key}: ${data.info[key]}</div>`;
              });
            }
            return html;
          }
          return params.name;
        }
      } : undefined,
      legend: showLegend ? {
        show: true,
        bottom: 10,
        data: ['正常', '告警', '预警']
      } : undefined,
      geo: baseGeo,
      visualMap: mapType === 'heatmap' ? {
        min: 0,
        max: 100,
        calculable: true,
        inRange: {
          color: ['#50a3ba', '#eac736', '#d94e5d']
        },
        textStyle: {
          color: '#666'
        },
        left: 'left',
        bottom: '10%'
      } : undefined,
      series: series
    };
  }, [mapType, center, zoom, enableZoom, showLabels, showTooltip, showLegend, title, themeColor, currentMarkers, linesData, getMarkerColor]);

  // 初始化图表
  useEffect(function () {
    const targetElement = container;
    if (!targetElement) {
      return;
    }

    function initChart() {
      if (!targetElement) {
        return;
      }

      if (!chartInstanceRef.current && targetElement) {
        const chartInstance = echarts.init(targetElement);
        chartInstanceRef.current = chartInstance;

        // 绑定点击事件
        chartInstance.on('click', function (params: any) {
          if (params.componentType === 'series' && params.data) {
            emitEvent('onMarkerClick', params.data.originalData || params.data);
          } else {
            emitEvent('onMapClick', params);
          }
        });

        // 绑定缩放事件
        chartInstance.on('georoam', function (params: any) {
          const option = chartInstance.getOption() as {
            geo?: Array<{ center?: number[]; zoom?: number }>;
          };
          const geo0 = option.geo?.[0];
          if (geo0) {
            const newCenter = geo0.center;
            const newZoom = geo0.zoom;
            if (newCenter && newCenter.length >= 2) {
              setCenter([newCenter[0], newCenter[1]]);
            }
            if (newZoom) {
              setZoom(newZoom);
              emitEvent('onZoomChange', { zoom: newZoom, center: newCenter });
            }
          }
        });

        // 初始化配置
        const option = getChartOption();
        chartInstance.setOption(option);
      }
    }

    initChart();

    return function () {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, [container]); // 只在 container 变化时重新初始化

  // 更新图表
  useEffect(function () {
    if (!chartInstanceRef.current) {
      return;
    }

    const option = getChartOption();
    chartInstanceRef.current.setOption(option, true);
  }, [getChartOption, currentMarkers, center, zoom]);

  // 动作处理函数
  const handleUpdateData = useCallback(function (params?: any) {
    if (params && params.markers) {
      setCurrentMarkers(params.markers);
    }
  }, []);

  const handleResize = useCallback(function () {
    if (chartInstanceRef.current) {
      chartInstanceRef.current.resize();
    }
  }, []);

  const handleSetCenter = useCallback(function (params?: any) {
    if (params && Array.isArray(params.center)) {
      setCenter(params.center);
      if (chartInstanceRef.current) {
        chartInstanceRef.current.setOption({
          geo: { center: params.center }
        });
      }
    }
  }, []);

  const handleSetZoom = useCallback(function (params?: any) {
    if (params && typeof params.zoom === 'number') {
      setZoom(params.zoom);
      if (chartInstanceRef.current) {
        chartInstanceRef.current.setOption({
          geo: { zoom: params.zoom }
        });
      }
    }
  }, []);

  const handleAddMarker = useCallback(function (params?: any) {
    if (params && params.marker) {
      setCurrentMarkers(function (prev) {
        return [...prev, params.marker];
      });
    }
  }, []);

  const handleRemoveMarker = useCallback(function (params?: any) {
    if (params && params.name) {
      setCurrentMarkers(function (prev) {
        return prev.filter(function (m) { return m.name !== params.name; });
      });
    }
  }, []);

  const handleClearAll = useCallback(function () {
    setCurrentMarkers([]);
    if (chartInstanceRef.current) {
      chartInstanceRef.current.setOption({ series: [] }, true);
    }
  }, []);

  const handleShowLayer = useCallback(function (params?: any) {
    emitEvent('onLayerChange', { layer: params?.layer, visible: true });
  }, [emitEvent]);

  const handleHideLayer = useCallback(function (params?: any) {
    emitEvent('onLayerChange', { layer: params?.layer, visible: false });
  }, [emitEvent]);

  const fireActionHandler = useCallback(function (name: string, params?: any) {
    switch (name) {
      case 'updateData':
        handleUpdateData(params);
        break;
      case 'resize':
        handleResize();
        break;
      case 'setCenter':
        handleSetCenter(params);
        break;
      case 'setZoom':
        handleSetZoom(params);
        break;
      case 'addMarker':
        handleAddMarker(params);
        break;
      case 'removeMarker':
        handleRemoveMarker(params);
        break;
      case 'clearAll':
        handleClearAll();
        break;
      case 'showLayer':
        handleShowLayer(params);
        break;
      case 'hideLayer':
        handleHideLayer(params);
        break;
      default:
        console.warn('未知的动作类型:', name);
    }
  }, [handleUpdateData, handleResize, handleSetCenter, handleSetZoom, handleAddMarker, handleRemoveMarker, handleClearAll, handleShowLayer, handleHideLayer]);

  useImperativeHandle(ref, function () {
    return {
      getVar: function (name: string) {
        const vars: Record<string, any> = {
          chart_instance: chartInstanceRef.current,
          current_markers: currentMarkers,
          center: center,
          zoom: zoom
        };
        return vars[name];
      },
      fireAction: fireActionHandler,
      eventList: EVENT_LIST,
      actionList: ACTION_LIST,
      varList: VAR_LIST,
      configList: CONFIG_LIST,
      dataList: DATA_LIST
    };
  }, [currentMarkers, center, zoom, fireActionHandler]);

  return null;
});

export default Component;
