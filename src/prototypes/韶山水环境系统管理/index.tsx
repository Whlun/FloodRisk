/**
 * @name 系统管理
 * @description 系统管理原型：报表中心（六类综合/周期报表能力）、配置中心（污染源三类、水利工程七类、遥感、园区；字段见 config-center-data、config-center-views、config-center-pollution-extended、config-center-hydro-extended）。
 * @mode axure
 *
 * 参考资料：
 * - /rules/development-standards.md
 * - 韶山水环境设施管理系统（布局与湘潭风格）
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppConfigProvider from '../../common/AppConfigProvider';
import { useTablePagination } from '../../common/useTablePagination';
import dayjs from 'dayjs';
import * as echarts from 'echarts/core';
import { LineChart, BarChart, PieChart, RadarChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  RadarComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  LineChart,
  BarChart,
  PieChart,
  RadarChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  RadarComponent,
  CanvasRenderer
]);
import type { ColumnsType } from 'antd/es/table';
import type { SelectProps } from 'antd/es/select';
import {
  Layout,
  Card,
  Row,
  Col,
  Table,
  Button,
  Select,
  Input,
  Space,
  Typography,
  Modal,
  Form,
  Descriptions,
  message,
  Upload,
  Tabs,
  Tag,
  Popconfirm,
  Divider,
  Checkbox,
  DatePicker,
  Radio,
  Dropdown,
  Tooltip,
  Tree,
  Segmented,
  InputNumber
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import {
  FileTextOutlined,
  SettingOutlined,
  SearchOutlined,
  DownloadOutlined,
  UploadOutlined,
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  RadarChartOutlined,
  DownOutlined,
  EnvironmentOutlined,
  ExperimentOutlined,
  BuildOutlined,
  FolderOutlined
} from '@ant-design/icons';
import './style.css';
import '../shared/ant-table-text-no-overlap.css';
import {
  ConfigHydroReservoirView,
  ConfigHydroLeveeView,
  ConfigRsView,
  ConfigParkView,
  formModalStyles,
  CONFIG_CENTER_MODAL_WRAP_CLASS
} from './config-center-views';
import { ConfigWatershedView } from './config-center-watershed-view';
import {
  ConfigHydroSluiceView,
  ConfigHydroWaterGateView,
  ConfigHydroWeirView,
  ConfigHydroPolderView,
  ConfigHydroHillpondView
} from './config-center-hydro-extended';
import {
  ConfigRuralSewagePollutionView,
  ConfigAgriRuralPollutionView,
  ConfigIndustryPollutionView
} from './config-center-pollution-extended';
import { ColumnManager, getDefaultVisibleColumnKeys, type ColumnConfig } from './config-center-column-manager';
import { downloadTableFullExcel, getExportFieldLabel } from '../shared/facilityTableXlsxExport';

const { Content } = Layout;
const { Text } = Typography;
const { RangePicker } = DatePicker;
const { Search } = Input;


// ==================== 布局：侧栏结构 ====================

/** 四级菜单叶子 */
type SidebarMenuLeaf = { key: string; label: string };

/** 三级项：叶子，或带四级子菜单的分组（结构与生态整治「河道水体」一致） */
type SidebarTier3Item =
  | SidebarMenuLeaf
  | { key: string; label: string; icon?: React.ReactNode; children: SidebarMenuLeaf[] };

/** 侧栏子项：平面项或带三级子菜单的分组（如污染源信息、水利工程信息） */
type SidebarChildItem =
  | SidebarMenuLeaf
  | { key: string; label: string; icon?: React.ReactNode; children: SidebarTier3Item[] };

interface SidebarMenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  children?: SidebarChildItem[];
}

const sidebarMenus: SidebarMenuItem[] = [
  {
    key: 'report-root',
    label: '报表中心',
    icon: <FileTextOutlined />,
    children: [
      { key: 'report-quality', label: '水质综合报表' },
      { key: 'report-flow', label: '流量综合报表' },
      { key: 'report-level', label: '水位综合报表' },
      { key: 'report-daily', label: '日报表信息' },
      { key: 'report-monthly', label: '月报表信息' },
      { key: 'report-yearly', label: '年度报表信息' }
    ]
  },
  {
    key: 'config-root',
    label: '配置中心',
    icon: <SettingOutlined />,
    children: [
      {
        key: 'cfg-pollution',
        label: '污染源信息',
        icon: <ExperimentOutlined />,
        children: [
          { key: 'cfg-pollution-rural', label: '农村污水及集中处理设施' },
          { key: 'cfg-pollution-agri', label: '农业农村源' },
          { key: 'cfg-pollution-industry', label: '工业企业污染源' }
        ]
      },
      {
        key: 'cfg-hydro',
        label: '水利工程信息',
        icon: <BuildOutlined />,
        children: [
          { key: 'cfg-hydro-sluice', label: '闸坝' },
          { key: 'cfg-hydro-levee', label: '堤防' },
          { key: 'cfg-hydro-reservoir', label: '水库' },
          { key: 'cfg-hydro-water-gate', label: '水闸' },
          { key: 'cfg-hydro-polder', label: '圩区' },
          { key: 'cfg-hydro-weir', label: '堰坝' },
          { key: 'cfg-hydro-hillpond', label: '山塘' }
        ]
      },
      { key: 'cfg-rs', label: '遥感监测情况' },
      { key: 'cfg-park', label: '工业园区信息' },
      { key: 'cfg-watershed', label: '流域信息' }
    ]
  }
];

type ViewState =
  | 'report-quality'
  | 'report-flow'
  | 'report-level'
  | 'report-daily'
  | 'report-monthly'
  | 'report-yearly'
  | 'cfg-pollution-rural'
  | 'cfg-pollution-agri'
  | 'cfg-pollution-industry'
  | 'cfg-hydro-sluice'
  | 'cfg-hydro-levee'
  | 'cfg-hydro-reservoir'
  | 'cfg-hydro-water-gate'
  | 'cfg-hydro-polder'
  | 'cfg-hydro-weir'
  | 'cfg-hydro-hillpond'
  | 'cfg-rs'
  | 'cfg-park'
  | 'cfg-watershed';

/** 报表中心子页（仅报表类，用于筛选条日期控件） */
type ReportCenterViewKey =
  | 'report-quality'
  | 'report-flow'
  | 'report-level'
  | 'report-daily'
  | 'report-monthly'
  | 'report-yearly';

/** 日报=日期范围（列表为所选日内 24 条整点数据）、月报=月份范围（所选月每日一条）、年报=年份范围（所选年每月一条），其余=起止日期时间 */
function getReportCenterRangePickerProps(view: ReportCenterViewKey) {
  switch (view) {
    case 'report-daily':
      return {
        picker: 'date' as const,
        showTime: false as const,
        format: 'YYYY-MM-DD' as const,
        placeholder: ['开始日期', '结束日期'] as [string, string],
        style: { minWidth: 260 }
      };
    case 'report-monthly':
      return {
        picker: 'month' as const,
        format: 'YYYY-MM' as const,
        placeholder: ['开始月份', '结束月份'] as [string, string],
        style: { minWidth: 240 }
      };
    case 'report-yearly':
      return {
        picker: 'year' as const,
        format: 'YYYY' as const,
        placeholder: ['开始年份', '结束年份'] as [string, string],
        style: { minWidth: 220 }
      };
    default:
      return {
        showTime: { format: 'HH:mm' as const },
        format: 'YYYY-MM-DD HH:mm' as const,
        placeholder: ['开始时间', '结束时间'] as [string, string],
        style: { minWidth: 280 }
      };
  }
}

// ==================== 图表（ECharts 示意） ====================

type ChartMode = 'line' | 'bar' | 'pie' | 'radar';

const ReportChartBlock: React.FC<{ mode: ChartMode; topic: string }> = ({ mode, topic }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const chart = echarts.init(el);
    const baseTitle = { text: `${topic} · 示例图表`, left: 'center', top: 8, textStyle: { fontSize: 13 } };

    if (mode === 'line') {
      chart.setOption({
        title: baseTitle,
        tooltip: { trigger: 'axis' },
        grid: { left: 48, right: 24, bottom: 32, top: 48 },
        xAxis: { type: 'category', data: ['第1周', '第2周', '第3周', '第4周', '第5周', '第6周'] },
        yAxis: { type: 'value', name: '数值' },
        series: [
          { name: '序列A', type: 'line', smooth: true, data: [12, 15, 10, 18, 20, 16], itemStyle: { color: '#1890ff' } },
          { name: '序列B', type: 'line', smooth: true, data: [8, 11, 14, 12, 15, 13], itemStyle: { color: '#52c41a' } }
        ]
      });
    } else if (mode === 'bar') {
      chart.setOption({
        title: baseTitle,
        tooltip: { trigger: 'axis' },
        grid: { left: 48, right: 24, bottom: 32, top: 48 },
        xAxis: { type: 'category', data: ['韶山片区', '高新片区', '工业园', '河东', '河西'] },
        yAxis: { type: 'value' },
        series: [{ type: 'bar', data: [32, 28, 40, 22, 35], itemStyle: { color: '#ff6b35' } }]
      });
    } else if (mode === 'pie') {
      chart.setOption({
        title: baseTitle,
        tooltip: { trigger: 'item' },
        series: [
          {
            type: 'pie',
            radius: '58%',
            center: ['50%', '55%'],
            data: [
              { name: '达标', value: 72 },
              { name: '预警', value: 18 },
              { name: '超标', value: 10 }
            ]
          }
        ]
      });
    } else {
      chart.setOption({
        title: baseTitle,
        tooltip: {},
        radar: {
          indicator: [
            { name: 'pH', max: 14 },
            { name: '溶解氧', max: 15 },
            { name: '氨氮', max: 10 },
            { name: 'COD', max: 80 },
            { name: '综合评分', max: 100 }
          ],
          radius: '62%'
        },
        series: [
          {
            type: 'radar',
            data: [
              {
                value: [7.2, 8.5, 1.2, 22, 86],
                name: '监测均值',
                areaStyle: { opacity: 0.15 },
                lineStyle: { color: '#1e5bb5' }
              }
            ]
          }
        ]
      });
    }

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el);
    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [mode, topic]);

  return <div ref={ref} className="report-echart" />;
};

// ==================== 模拟数据 ====================

const regionOpts = ['全市', '韶山片区', '高新片区', '工业园', '河东', '河西'];

/**
 * 水质综合报表明细（对齐湘潭「数据报表-常规报表」：首列监测时间 + 各指标）
 * pointKey 与 QUALITY_TREE_DATA 二级节点 key 对应，用于树单选过滤
 */
/** 水质指标数值三态：与图例「正常 / 超限 / 手工」一致 */
type QualityValueFlag = 'normal' | 'over' | 'manual';

function pickQualityFlag(i: number, salt: number, isOverLimit: boolean): QualityValueFlag {
  if ((i + salt) % 7 === 0) return 'manual';
  if (isOverLimit) return 'over';
  return 'normal';
}

/** 从行 id 解析序号，用于编辑后重算三态与初始生成规则一致 */
function rowSeedFromId(id: unknown): number {
  const last = String(id).split('-').pop();
  return parseInt(last || '0', 10) || 0;
}

function recomputeQualityRowFlags(
  id: unknown,
  ph: number,
  nh3: number,
  tp: number,
  tn: number,
  cod: number,
  flow: number
) {
  const i = rowSeedFromId(id);
  return {
    phFlag: pickQualityFlag(i, 1, ph < 6 || ph > 9),
    nh3Flag: pickQualityFlag(i, 2, nh3 > 1.0),
    tpFlag: pickQualityFlag(i, 3, tp > 0.2),
    tnFlag: pickQualityFlag(i, 4, tn > 1.0),
    codFlag: pickQualityFlag(i, 5, cod > 20),
    flowFlag: pickQualityFlag(i, 6, flow > 4000)
  };
}

/** 二级表头下行：各参数标准限值（示意，对齐湘潭常规报表） */
const QUALITY_PARAM_LIMIT_ROW: Record<string, string> = {
  ph: '6～9',
  nh3: '≤1.0',
  tp: '≤0.2',
  tn: '≤1.0',
  cod: '≤20',
  flow: '—'
};

function renderQualityMetricCell(dataIndex: string) {
  return (value: unknown, record: Record<string, unknown>) => {
    const flag = (record[`${dataIndex}Flag`] as QualityValueFlag | undefined) ?? 'normal';
    const cls =
      flag === 'over'
        ? 'quality-cell-val quality-cell-val--over'
        : flag === 'manual'
          ? 'quality-cell-val quality-cell-val--manual'
          : 'quality-cell-val quality-cell-val--normal';
    const text = value === null || value === undefined ? '—' : String(value);
    return <span className={cls}>{text}</span>;
  };
}

/** 与 renderQualityMetricCell 相同三色逻辑，支持自定义展示格式化（如累计科学计数） */
function renderQualityMetricCellFormatted(dataIndex: string, format: (v: unknown) => string) {
  return (value: unknown, record: Record<string, unknown>) => {
    const flag = (record[`${dataIndex}Flag`] as QualityValueFlag | undefined) ?? 'normal';
    const cls =
      flag === 'over'
        ? 'quality-cell-val quality-cell-val--over'
        : flag === 'manual'
          ? 'quality-cell-val quality-cell-val--manual'
          : 'quality-cell-val quality-cell-val--normal';
    return <span className={cls}>{format(value)}</span>;
  };
}

function buildQualityNestedTableColumns(
  sortedConfigs: ColumnConfig[],
  rowActions: (v: unknown, record: Record<string, unknown>) => React.ReactNode
): ColumnsType<Record<string, unknown>> {
  const cols: ColumnsType<Record<string, unknown>> = [];
  for (const cfg of sortedConfigs) {
    if (cfg.key === 'operation') continue;
    if (cfg.key === 'monitorTime' || cfg.key === 'region') {
      cols.push({
        title: cfg.title,
        dataIndex: cfg.dataIndex,
        key: cfg.key,
        width: cfg.width,
        fixed: cfg.fixed,
        align: 'center',
        onHeaderCell: () => ({ rowSpan: 2 }),
        render: cfg.render
          ? (value: unknown, record: Record<string, unknown>) => cfg.render!(value, record)
          : undefined
      });
      continue;
    }
    if (cfg.key in QUALITY_PARAM_LIMIT_ROW) {
      const dk = cfg.key;
      const subTitle = QUALITY_PARAM_LIMIT_ROW[dk] ?? '—';
      cols.push({
        title: cfg.title,
        key: `${cfg.key}-grp`,
        align: 'center',
        children: [
          {
            title: subTitle,
            dataIndex: cfg.dataIndex,
            key: cfg.key,
            width: cfg.width,
            align: 'center',
            render: renderQualityMetricCell(dk)
          }
        ]
      });
    }
  }
  const opCfg = sortedConfigs.find(c => c.key === 'operation');
  cols.push({
    title: '操作',
    key: 'operation',
    width: opCfg?.width ?? 128,
    fixed: 'right',
    align: 'center',
    onHeaderCell: () => ({ rowSpan: 2 }),
    render: (value: unknown, record: Record<string, unknown>) => rowActions(value, record)
  });
  return cols;
}

const qualityDetailRows: Record<string, unknown>[] = (() => {
  const mk = (pointKey: string, region: string, times: string[], base: { ph: number; nh3: number; tp: number; tn: number; cod: number; flow: number }) =>
    times.map((monitorTime, i) => {
      const ph = Number((base.ph + (i % 5) * 0.01).toFixed(2));
      const nh3 = Number((base.nh3 + i * 0.01).toFixed(2));
      const tp = Number((base.tp + i * 0.001).toFixed(3));
      const tn = Number((base.tn + i * 0.02).toFixed(2));
      const cod = Number((base.cod + i * 0.1).toFixed(1));
      const flow = Number((base.flow + i * 0.3).toFixed(1));
      const paramsOriginal = { ph, nh3, tp, tn, cod, flow };
      return {
        id: `${pointKey}-${i}`,
        pointKey,
        region,
        monitorTime,
        ph,
        nh3,
        tp,
        tn,
        cod,
        flow,
        paramsOriginal,
        /** 人工在「编辑」中保存后的参数快照；未修改过为 null */
        paramsModified: null as Record<string, number> | null,
        phFlag: pickQualityFlag(i, 1, ph < 6 || ph > 9),
        nh3Flag: pickQualityFlag(i, 2, nh3 > 1.0),
        tpFlag: pickQualityFlag(i, 3, tp > 0.2),
        tnFlag: pickQualityFlag(i, 4, tn > 1.0),
        codFlag: pickQualityFlag(i, 5, cod > 20),
        flowFlag: pickQualityFlag(i, 6, flow > 4000)
      };
    });
  const t1 = ['2026-04-14 13:26:00', '2026-04-14 13:25:00', '2026-04-14 13:24:00', '2026-04-14 13:23:00', '2026-04-14 13:22:00'];
  const t2 = ['2026-04-14 12:10:00', '2026-04-14 12:09:00', '2026-04-14 12:08:00'];
  return [
    ...mk('ws-pt1', '韶山片区', t1, { ph: 7.05, nh3: 0.34, tp: 0.026, tn: 9.21, cod: 12.4, flow: 745.2 }),
    ...mk('ws-pt2', '韶山片区', t2, { ph: 7.12, nh3: 0.31, tp: 0.024, tn: 8.95, cod: 11.8, flow: 720.0 }),
    ...mk('ws-pt3', '河东', ['2026-04-14 11:00:00', '2026-04-14 10:59:00'], { ph: 7.0, nh3: 0.42, tp: 0.03, tn: 10.1, cod: 14.2, flow: 0 }),
    ...mk('ws-pt4', '河西', ['2026-04-14 10:30:00'], { ph: 6.98, nh3: 0.38, tp: 0.028, tn: 9.6, cod: 13.0, flow: 112.5 })
  ];
})();

/** 水质综合报表专用：一级水源地（不可选）+ 二级监测点（单选），对齐湘潭常规报表树结构 */
const QUALITY_TREE_DATA: DataNode[] = [
  {
    title: '东郊水库饮用水水源地',
    key: 'ws-src-1',
    selectable: false,
    children: [
      { title: '水源地取水口监测点', key: 'ws-pt1' },
      { title: '水源地保护区断面监测点', key: 'ws-pt2' }
    ]
  },
  {
    title: '韶河饮用水源二级保护区',
    key: 'ws-src-2',
    selectable: false,
    children: [
      { title: '韶河断面水质自动站', key: 'ws-pt3' },
      { title: '支流入汇口监测点', key: 'ws-pt4' }
    ]
  }
];

/** 根据监测点 key 取树节点标题（详情弹窗展示用） */
function findQualityPointTitle(pointKey: string): string {
  for (const n of QUALITY_TREE_DATA) {
    const ch = n.children?.find(c => String(c.key) === pointKey);
    if (ch && ch.title != null) return String(ch.title);
  }
  return pointKey;
}

/** 非水质报表：与图例三色对应的单元格状态（与水质 phFlag 等同语义） */
function mockReportCellFlag(i: number, salt: number, over: boolean): QualityValueFlag {
  return pickQualityFlag(i, salt, over);
}

function mkFlowRow(
  id: string,
  pointKey: string,
  monitorTime: string,
  facType: string,
  name: string,
  avg: number,
  peak: number,
  sum: number,
  region: string,
  period: string
): Record<string, unknown> {
  const paramsOriginal = { avg, peak, sum };
  return {
    id,
    pointKey,
    monitorTime,
    facType,
    name,
    avg,
    peak,
    sum,
    region,
    period,
    paramsOriginal,
    paramsModified: null as Record<string, number> | null,
    ...recomputeFlowRowFlags(id, avg, peak, sum)
  };
}

/** 流量明细：同一监测对象多时段，与水质一致含 paramsOriginal / paramsModified 供详情对比表 */
const flowRows: Record<string, unknown>[] = [
  mkFlowRow('f-1-0', 'ent-1-o1', '2026-04-14 14:05:00', '排水管网', '高新大道主干', 1250, 2100, 8.6e4, '高新片区', '2026-04'),
  mkFlowRow('f-1-1', 'ent-1-o1', '2026-04-14 13:10:00', '排水管网', '高新大道主干', 1180, 2050, 8.42e4, '高新片区', '2026-04'),
  mkFlowRow('f-1-2', 'ent-1-o1', '2026-04-14 12:00:00', '排水管网', '高新大道主干', 1310, 2180, 8.71e4, '高新片区', '2026-04'),
  mkFlowRow('f-2-0', 'ent-1-o2', '2026-04-14 14:00:00', '泵站', '雨水泵站A', 3200, 5100, 2.1e5, '韶山片区', '2026-04'),
  mkFlowRow('f-2-1', 'ent-1-o2', '2026-04-14 11:30:00', '泵站', '雨水泵站A', 3050, 4980, 2.05e5, '韶山片区', '2026-04'),
  mkFlowRow('f-3-0', 'sec-1-a', '2026-04-14 14:02:00', '污水厂', '高新区污水厂', 9800, 11200, 6.8e5, '工业园', '2026-04'),
  mkFlowRow('f-3-1', 'sec-1-a', '2026-04-14 10:15:00', '污水厂', '高新区污水厂', 9650, 11050, 6.75e5, '工业园', '2026-04'),
  mkFlowRow('f-3-2', 'sec-1-a', '2026-04-14 08:40:00', '污水厂', '高新区污水厂', 9920, 11320, 6.82e5, '工业园', '2026-04')
];

function mkLevelRow(
  id: string,
  pointKey: string,
  monitorTime: string,
  region: string,
  posType: string,
  name: string,
  cur: number,
  warn: number,
  ok: string,
  period: string
): Record<string, unknown> {
  const paramsOriginal = { cur, warn, ok };
  return {
    id,
    pointKey,
    monitorTime,
    region,
    posType,
    name,
    cur,
    warn,
    ok,
    period,
    paramsOriginal,
    paramsModified: null as Record<string, unknown> | null,
    ...recomputeLevelRowFlags(id, cur, warn)
  };
}

/** 水位明细：同一监测对象多时点，详情对比表含原始/修正/结果 */
const levelRows: Record<string, unknown>[] = [
  mkLevelRow('l-1-0', 'sec-1-a', '2026-04-14 14:00:00', '韶山片区', '河流', '韶河控制断面', 28.35, 30.0, '否', '2026-04-14'),
  mkLevelRow('l-1-1', 'sec-1-a', '2026-04-14 09:30:00', '韶山片区', '河流', '韶河控制断面', 27.9, 30.0, '是', '2026-04-14'),
  mkLevelRow('l-2-0', 'sec-1-b', '2026-04-14 14:00:00', '河东', '水库', '东郊水库', 86.2, 88.0, '是', '2026-04-14'),
  mkLevelRow('l-2-1', 'sec-1-b', '2026-04-14 08:00:00', '河东', '水库', '东郊水库', 85.6, 88.0, '是', '2026-04-14'),
  mkLevelRow('l-3-0', 'ent-2-w1', '2026-04-14 14:00:00', '高新片区', '管网节点', 'N2025040700003', 2.1, 2.5, '是', '2026-04-14'),
  mkLevelRow('l-3-1', 'ent-2-w1', '2026-04-14 06:20:00', '高新片区', '管网节点', 'N2025040700003', 2.08, 2.5, '是', '2026-04-14')
];

/** 日报：拉取所选日期的整点数据，共 24 条（每小时一条） */
function buildDailyHourlyRows(): Record<string, unknown>[] {
  const date = '2026-04-14';
  const pointKey = 'ent-1-o1';
  const pointName = '[废水] 总排口在线监测';
  const metricName = '氨氮（毫克每升）';
  const rows: Record<string, unknown>[] = [];
  for (let h = 0; h < 24; h++) {
    const hh = String(h).padStart(2, '0');
    const periodTime = `${date} ${hh}:00`;
    const base = 0.72 + 0.28 * Math.sin(((h + 3) / 24) * Math.PI * 2);
    const value = Math.max(0.35, Math.min(1.35, base + (h % 5) * 0.02)).toFixed(2);
    const alarmCount = Number(value) > 1.0 ? 1 : 0;
    rows.push({
      id: `d-hour-${date}-${hh}`,
      pointKey,
      pointName,
      metricName,
      periodTime,
      value,
      alarmCount
    });
  }
  return rows;
}

/** 月报：拉取所选月份内每日一条汇总数据（示例为 2026-04 共 30 天） */
function buildMonthlyDailyRows(): Record<string, unknown>[] {
  const y = 2026;
  const m = 4;
  const days = dayjs(`${y}-${String(m).padStart(2, '0')}-01`).daysInMonth();
  /** 与左侧监测对象树默认选中 `ent-1-o1` 一致，便于原型直接看到满页数据 */
  const pointKey = 'ent-1-o1';
  const pointName = '[废水] 总排口在线监测';
  const metricName = '酸碱度';
  const rows: Record<string, unknown>[] = [];
  for (let d = 1; d <= days; d++) {
    const dd = String(d).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    const periodTime = `${y}-${mm}-${dd}`;
    const seed = d * 7;
    const maxVal = (7.4 + (seed % 10) / 10).toFixed(1);
    const minVal = (7.0 + (seed % 8) / 10).toFixed(1);
    const avgVal = ((Number(maxVal) + Number(minVal)) / 2).toFixed(2);
    rows.push({
      id: `m-day-${periodTime}`,
      pointKey,
      pointName,
      metricName,
      periodTime,
      maxVal,
      maxTime: `${periodTime} ${String(8 + (d % 8)).padStart(2, '0')}:30`,
      minVal,
      minTime: `${periodTime} ${String(3 + (d % 5)).padStart(2, '0')}:15`,
      avgVal,
      alarmCount: Number(avgVal) > 7.8 ? 1 : 0
    });
  }
  return rows;
}

/** 年报：拉取所选年份内每月一条汇总数据（12 条） */
function buildYearlyMonthlyRows(): Record<string, unknown>[] {
  const y = 2026;
  const pointKey = 'ent-1-o1';
  const pointName = '[废水] 总排口在线监测';
  const metricName = '废水流量（升每秒）';
  const rows: Record<string, unknown>[] = [];
  for (let mo = 1; mo <= 12; mo++) {
    const mm = String(mo).padStart(2, '0');
    const periodTime = `${y}-${mm}`;
    const seed = mo * 11;
    const maxVal = String(95 + (seed % 35));
    const minVal = String(58 + (seed % 22));
    const avgVal = String(Math.round((Number(maxVal) + Number(minVal)) / 2));
    rows.push({
      id: `y-mon-${y}-${mm}`,
      pointKey,
      pointName,
      metricName,
      periodTime,
      maxVal,
      maxTime: `${y}-${mm}-12 10:00`,
      minVal,
      minTime: `${y}-${mm}-03 04:00`,
      avgVal,
      alarmCount: mo % 4 === 0 ? 1 : 0
    });
  }
  return rows;
}

const dailyRows: Record<string, unknown>[] = buildDailyHourlyRows();
const monthlyRows: Record<string, unknown>[] = buildMonthlyDailyRows();
const yearlyRows: Record<string, unknown>[] = buildYearlyMonthlyRows();

/** 日报：按整点一条，展示该小时监测值 */
const REPORT_DAILY_HOURLY_COLUMNS: ColumnConfig[] = [
  {
    key: 'pointName',
    title: '监测点名称',
    dataIndex: 'pointName',
    width: 168,
    fixed: 'left',
    defaultVisible: true
  },
  { key: 'metricName', title: '监测项', dataIndex: 'metricName', width: 140 },
  { key: 'periodTime', title: '整点时段', dataIndex: 'periodTime', width: 152 },
  { key: 'value', title: '监测值', dataIndex: 'value', width: 100 },
  {
    key: 'alarmCount',
    title: '报警数量',
    dataIndex: 'alarmCount',
    width: 100,
    render: (v: unknown) => (typeof v === 'number' ? String(v) : String(v ?? '—'))
  }
];

/** 月报 / 年报：按日或按月一条，展示时段内极值统计 */
const REPORT_DMY_PERIOD_STAT_COLUMNS: ColumnConfig[] = [
  {
    key: 'pointName',
    title: '监测点名称',
    dataIndex: 'pointName',
    width: 168,
    fixed: 'left',
    defaultVisible: true
  },
  { key: 'metricName', title: '监测项', dataIndex: 'metricName', width: 140 },
  { key: 'periodTime', title: '时间', dataIndex: 'periodTime', width: 120 },
  { key: 'maxVal', title: '最大值', dataIndex: 'maxVal', width: 96 },
  { key: 'maxTime', title: '最大值时间', dataIndex: 'maxTime', width: 152 },
  { key: 'minVal', title: '最小值', dataIndex: 'minVal', width: 96 },
  { key: 'minTime', title: '最小值时间', dataIndex: 'minTime', width: 152 },
  { key: 'avgVal', title: '平均值', dataIndex: 'avgVal', width: 100 },
  {
    key: 'alarmCount',
    title: '报警数量',
    dataIndex: 'alarmCount',
    width: 100,
    render: (v: unknown) => (typeof v === 'number' ? String(v) : String(v ?? '—'))
  }
];

/** 月报表「时间」列实为自然日 */
const REPORT_MONTHLY_COLUMNS: ColumnConfig[] = REPORT_DMY_PERIOD_STAT_COLUMNS.map(c =>
  c.key === 'periodTime' ? { ...c, title: '日期' } : c
);

/** 年度报表「时间」列实为自然月 */
const REPORT_YEARLY_COLUMNS: ColumnConfig[] = REPORT_DMY_PERIOD_STAT_COLUMNS.map(c =>
  c.key === 'periodTime' ? { ...c, title: '月份' } : c
);

/** 日/月/年报详情：只读字段（与当前报表类型列一致） */
function getDmyDetailFieldLabels(view: ViewState): { dataIndex: string; label: string }[] {
  if (view === 'report-daily') {
    return [
      { dataIndex: 'pointName', label: '监测点名称' },
      { dataIndex: 'metricName', label: '监测项' },
      { dataIndex: 'periodTime', label: '整点时段' },
      { dataIndex: 'value', label: '监测值' },
      { dataIndex: 'alarmCount', label: '报警数量' }
    ];
  }
  const timeLabel = view === 'report-monthly' ? '日期' : '月份';
  return [
    { dataIndex: 'pointName', label: '监测点名称' },
    { dataIndex: 'metricName', label: '监测项' },
    { dataIndex: 'periodTime', label: timeLabel },
    { dataIndex: 'maxVal', label: '最大值' },
    { dataIndex: 'maxTime', label: '最大值时间' },
    { dataIndex: 'minVal', label: '最小值' },
    { dataIndex: 'minTime', label: '最小值时间' },
    { dataIndex: 'avgVal', label: '平均值' },
    { dataIndex: 'alarmCount', label: '报警数量' }
  ];
}

function fmtDmyDetailValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  return String(v);
}

/** 对齐湘潭「数据报表-常规报表」左侧监测对象树（示意） */
const REPORT_TREE_DATA: DataNode[] = [
  {
    title: '韶山市高新区污水处理厂',
    key: 'ent-1',
    selectable: false,
    children: [
      { title: '[废水] 总排口在线监测', key: 'ent-1-o1' },
      { title: '[废水] 调节池出水', key: 'ent-1-o2' },
      { title: '[雨水] 厂区雨水排口', key: 'ent-1-o3' }
    ]
  },
  {
    title: '湖南某实业韶山分公司',
    key: 'ent-2',
    selectable: false,
    children: [
      { title: '[废水] 车间排口在线监测', key: 'ent-2-w1' },
      { title: '[废水] 厂区总排口监测', key: 'ent-2-w2' }
    ]
  },
  {
    title: '韶河省控断面监测站',
    key: 'sec-1',
    selectable: false,
    children: [
      { title: '断面水质自动站 A', key: 'sec-1-a' },
      { title: '断面水质自动站 B', key: 'sec-1-b' }
    ]
  }
];

/** 非水质报表：监测对象树节点标题 */
function findReportTreePointTitle(pointKey: string): string {
  for (const n of REPORT_TREE_DATA) {
    const ch = n.children?.find(c => String(c.key) === pointKey);
    if (ch && ch.title != null) return String(ch.title);
  }
  return pointKey;
}

/** 水质报表新增：监测点下拉（水源地分组 / 监测点） */
function getQualityTreeLeafOptions(): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  for (const n of QUALITY_TREE_DATA) {
    for (const c of n.children ?? []) {
      out.push({ label: `${String(n.title)} / ${String(c.title)}`, value: String(c.key) });
    }
  }
  return out;
}

/** 流量/水位新增：排放单位树叶子 */
function getReportTreeLeafOptions(): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  for (const n of REPORT_TREE_DATA) {
    for (const c of n.children ?? []) {
      out.push({ label: `${String(n.title)} / ${String(c.title)}`, value: String(c.key) });
    }
  }
  return out;
}

/** 流量报表：编辑后重算三色标记 */
function recomputeFlowRowFlags(id: unknown, avg: number, peak: number, sum: number) {
  const i = rowSeedFromId(id);
  return {
    avgFlag: mockReportCellFlag(i, 1, avg > 2400),
    peakFlag: mockReportCellFlag(i, 2, peak > 4500),
    sumFlag: mockReportCellFlag(i, 3, sum > 5e5)
  };
}

/** 水位报表：编辑后重算当前水位三色（是否达标以表单为准） */
function recomputeLevelRowFlags(id: unknown, cur: number, warn: number) {
  const i = rowSeedFromId(id);
  const over = cur > warn;
  return {
    curFlag: mockReportCellFlag(i, 1, over)
  };
}

// ==================== 报表中心页面 ====================

/** 水质编辑/详情字段标签（与列表列一致） */
const QUALITY_VALUE_FORM_ITEMS: { name: keyof Record<string, number>; label: string; step: number }[] = [
  { name: 'ph', label: '酸碱度', step: 0.01 },
  { name: 'nh3', label: '氨氮（毫克每升）', step: 0.01 },
  { name: 'tp', label: '总磷（毫克每升）', step: 0.001 },
  { name: 'tn', label: '总氮（毫克每升）', step: 0.01 },
  { name: 'cod', label: '化学需氧量（毫克每升）', step: 0.1 },
  { name: 'flow', label: '废水流量（升每秒）', step: 0.1 }
];

/** 详情对比表分组标题（蓝字指标名与单位） */
const QUALITY_DETAIL_GROUP_LABELS: { name: string; titleText: string }[] = [
  { name: 'ph', titleText: '酸碱度' },
  { name: 'nh3', titleText: '氨氮（毫克每升）' },
  { name: 'tp', titleText: '总磷（毫克每升）' },
  { name: 'tn', titleText: '总氮（毫克每升）' },
  { name: 'cod', titleText: '化学需氧量（毫克每升）' },
  { name: 'flow', titleText: '废水流量（升每秒）' }
];

function fmtNum(v: unknown): string {
  if (v === null || v === undefined) return '—';
  return String(v);
}

/** 详情弹窗：多行对比表列（监测时间 rowspan2 + 各指标三列：原始/修正/结果） */
function buildQualityDetailCompareTableColumns(): ColumnsType<Record<string, unknown>> {
  const cols: ColumnsType<Record<string, unknown>> = [
    {
      title: '监测时间',
      dataIndex: 'monitorTime',
      key: 'monitorTime',
      width: 168,
      fixed: 'left',
      align: 'left',
      onHeaderCell: () => ({ rowSpan: 2 })
    }
  ];
  for (const { name, titleText } of QUALITY_DETAIL_GROUP_LABELS) {
    cols.push({
      title: <span className="quality-detail-metric-header__text">{titleText}</span>,
      key: `${name}-grp`,
      align: 'center',
      children: [
        {
          title: '原始值',
          key: `${name}-orig`,
          align: 'center',
          width: 96,
          render: (_: unknown, row: Record<string, unknown>) => {
            const o = row.paramsOriginal as Record<string, number> | undefined;
            return fmtNum(o?.[name]);
          }
        },
        {
          title: '修正值',
          key: `${name}-corr`,
          align: 'center',
          width: 96,
          render: (_: unknown, row: Record<string, unknown>) => {
            const o = row.paramsOriginal as Record<string, number> | undefined;
            const m = row.paramsModified as Record<string, number> | null | undefined;
            if (m && m[name] !== undefined) return fmtNum(m[name]);
            return fmtNum(o?.[name]);
          }
        },
        {
          title: '结果值',
          key: `${name}-res`,
          align: 'center',
          width: 96,
          render: (_: unknown, row: Record<string, unknown>) => renderQualityMetricCell(name)(row[name], row)
        }
      ]
    });
  }
  return cols;
}

/** 流量综合报表 · 详情对比表（与水质一致：监测时间 + 各指标原始/修正/结果） */
const FLOW_DETAIL_GROUP_LABELS: { name: 'avg' | 'peak' | 'sum'; titleText: string }[] = [
  { name: 'avg', titleText: '日均流量（立方米每小时）' },
  { name: 'peak', titleText: '峰值（立方米每小时）' },
  { name: 'sum', titleText: '累计（立方米）' }
];

function fmtFlowSumCell(v: unknown): string {
  if (v === null || v === undefined) return '—';
  return typeof v === 'number' ? v.toExponential(2) : String(v);
}

function buildFlowDetailCompareTableColumns(): ColumnsType<Record<string, unknown>> {
  const cols: ColumnsType<Record<string, unknown>> = [
    {
      title: '监测时间',
      dataIndex: 'monitorTime',
      key: 'monitorTime',
      width: 168,
      fixed: 'left',
      align: 'left',
      onHeaderCell: () => ({ rowSpan: 2 })
    }
  ];
  for (const { name, titleText } of FLOW_DETAIL_GROUP_LABELS) {
    cols.push({
      title: <span className="quality-detail-metric-header__text">{titleText}</span>,
      key: `${name}-grp`,
      align: 'center',
      children: [
        {
          title: '原始值',
          key: `${name}-orig`,
          align: 'center',
          width: 96,
          render: (_: unknown, row: Record<string, unknown>) => {
            const o = row.paramsOriginal as Record<string, number> | undefined;
            const v = o?.[name];
            return name === 'sum' ? fmtFlowSumCell(v) : fmtNum(v);
          }
        },
        {
          title: '修正值',
          key: `${name}-corr`,
          align: 'center',
          width: 96,
          render: (_: unknown, row: Record<string, unknown>) => {
            const o = row.paramsOriginal as Record<string, number> | undefined;
            const m = row.paramsModified as Record<string, number> | null | undefined;
            const pick = m && m[name] !== undefined ? m[name] : o?.[name];
            return name === 'sum' ? fmtFlowSumCell(pick) : fmtNum(pick);
          }
        },
        {
          title: '结果值',
          key: `${name}-res`,
          align: 'center',
          width: 96,
          render: (_: unknown, row: Record<string, unknown>) =>
            name === 'sum'
              ? renderQualityMetricCellFormatted('sum', v => (typeof v === 'number' ? v.toExponential(2) : String(v)))(
                  row[name],
                  row
                )
              : renderQualityMetricCell(name)(row[name], row)
        }
      ]
    });
  }
  return cols;
}

/** 水位综合报表 · 详情对比表（数值指标三列 + 是否达标三列） */
const LEVEL_DETAIL_METRIC_LABELS: { name: 'cur' | 'warn'; titleText: string }[] = [
  { name: 'cur', titleText: '当前水位（米）' },
  { name: 'warn', titleText: '警戒水位（米）' }
];

function buildLevelDetailCompareTableColumns(): ColumnsType<Record<string, unknown>> {
  const cols: ColumnsType<Record<string, unknown>> = [
    {
      title: '监测时间',
      dataIndex: 'monitorTime',
      key: 'monitorTime',
      width: 168,
      fixed: 'left',
      align: 'left',
      onHeaderCell: () => ({ rowSpan: 2 })
    }
  ];
  for (const { name, titleText } of LEVEL_DETAIL_METRIC_LABELS) {
    cols.push({
      title: <span className="quality-detail-metric-header__text">{titleText}</span>,
      key: `${name}-grp`,
      align: 'center',
      children: [
        {
          title: '原始值',
          key: `${name}-orig`,
          align: 'center',
          width: 96,
          render: (_: unknown, row: Record<string, unknown>) => {
            const o = row.paramsOriginal as Record<string, number> | undefined;
            return fmtNum(o?.[name]);
          }
        },
        {
          title: '修正值',
          key: `${name}-corr`,
          align: 'center',
          width: 96,
          render: (_: unknown, row: Record<string, unknown>) => {
            const o = row.paramsOriginal as Record<string, number> | undefined;
            const m = row.paramsModified as Record<string, unknown> | null | undefined;
            if (m && m[name] !== undefined) return fmtNum(m[name] as number);
            return fmtNum(o?.[name]);
          }
        },
        {
          title: '结果值',
          key: `${name}-res`,
          align: 'center',
          width: 96,
          render: (_: unknown, row: Record<string, unknown>) => renderQualityMetricCell(name)(row[name], row)
        }
      ]
    });
  }
  cols.push({
    title: <span className="quality-detail-metric-header__text">是否达标</span>,
    key: 'ok-grp',
    align: 'center',
    children: [
      {
        title: '原始值',
        key: 'ok-orig',
        align: 'center',
        width: 88,
        render: (_: unknown, row: Record<string, unknown>) => {
          const o = row.paramsOriginal as { ok?: string } | undefined;
          const t = o?.ok ?? '—';
          return <Tag color={t === '是' ? 'green' : t === '否' ? 'orange' : 'default'}>{t}</Tag>;
        }
      },
      {
        title: '修正值',
        key: 'ok-corr',
        align: 'center',
        width: 88,
        render: (_: unknown, row: Record<string, unknown>) => {
          const o = row.paramsOriginal as { ok?: string } | undefined;
          const m = row.paramsModified as Record<string, unknown> | null | undefined;
          const t =
            m && m.ok !== undefined && m.ok !== null ? String(m.ok) : (o?.ok ?? '—');
          return <Tag color={t === '是' ? 'green' : t === '否' ? 'orange' : 'default'}>{t}</Tag>;
        }
      },
      {
        title: '结果值',
        key: 'ok-res',
        align: 'center',
        width: 88,
        render: (_: unknown, row: Record<string, unknown>) => {
          const t = String(row.ok ?? '—');
          return <Tag color={t === '是' ? 'green' : t === '否' ? 'orange' : 'default'}>{t}</Tag>;
        }
      }
    ]
  });
  return cols;
}

/** 报表中心 Segmented 选项 */
const REPORT_CENTER_CATEGORY_TABS = [
  { key: 'surface-water', label: '地表水' },
  { key: 'hydrology', label: '水文监测' },
  { key: 'pollution', label: '污染源' },
  { key: 'rain-outlet', label: '雨洪排口' },
  { key: 'sewage-central', label: '集中式污水处理设施' }
] as const;

/** 顶部分类对应「水质」报表时的监测项（与水质综合报表列一致） */
const DMY_MONITOR_METRICS_QUALITY: { value: string; label: string }[] = [
  { value: 'ph', label: '酸碱度' },
  { value: 'nh3', label: '氨氮（毫克每升）' },
  { value: 'tp', label: '总磷（毫克每升）' },
  { value: 'tn', label: '总氮（毫克每升）' },
  { value: 'cod', label: '化学需氧量（毫克每升）' },
  { value: 'flow', label: '废水流量（升每秒）' }
];

/** 水文监测 · 流量类监测项（与流量综合报表列一致） */
const DMY_MONITOR_METRICS_FLOW: { value: string; label: string }[] = [
  { value: 'avg', label: '日均流量（立方米每小时）' },
  { value: 'peak', label: '峰值（立方米每小时）' },
  { value: 'sum', label: '累计（立方米）' }
];

/** 水文监测 · 水位类监测项（与水位综合报表列一致） */
const DMY_MONITOR_METRICS_LEVEL: { value: string; label: string }[] = [
  { value: 'cur', label: '当前水位（米）' },
  { value: 'warn', label: '警戒水位（米）' },
  { value: 'ok', label: '是否达标' }
];

const REPORT_CATEGORY_QUALITY_LIKE = new Set<string>([
  'surface-water',
  'pollution',
  'rain-outlet',
  'sewage-central'
]);

type DmyMetricSelectOption =
  | { value: string; label: string }
  | { label: string; options: { value: string; label: string }[] };

/** 日报/月报/年报筛选条「监测项名称」下拉：地表水等为水质参数；水文监测为流量+水位分组 */
function getDmyMonitorMetricSelectOptions(categoryKey: string): DmyMetricSelectOption[] {
  if (REPORT_CATEGORY_QUALITY_LIKE.has(categoryKey)) {
    return DMY_MONITOR_METRICS_QUALITY;
  }
  if (categoryKey === 'hydrology') {
    return [
      { label: '流量', options: DMY_MONITOR_METRICS_FLOW },
      { label: '水位', options: DMY_MONITOR_METRICS_LEVEL }
    ];
  }
  return DMY_MONITOR_METRICS_QUALITY;
}

function getDmyMonitorMetricDefaultValue(categoryKey: string): string {
  const opts = getDmyMonitorMetricSelectOptions(categoryKey);
  const first = opts[0];
  if (first && 'options' in first && first.options.length) {
    return first.options[0].value;
  }
  if (first && 'value' in first) {
    return first.value;
  }
  return 'ph';
}

function formatDmyMonitorMetricLabel(categoryKey: string, metricValue: string | undefined): string {
  if (!metricValue) return '—';
  const opts = getDmyMonitorMetricSelectOptions(categoryKey);
  if (opts[0] && 'options' in opts[0]) {
    for (const g of opts as { label: string; options: { value: string; label: string }[] }[]) {
      const hit = g.options.find(o => o.value === metricValue);
      if (hit) return `${g.label} · ${hit.label}`;
    }
  }
  const flat = opts as { value: string; label: string }[];
  const hit = flat.find(o => o.value === metricValue);
  return hit ? hit.label : metricValue;
}

const ReportCenterView: React.FC<{ view: ViewState }> = ({ view }) => {
  /** 日 / 月 / 年报：只读列表，无编辑、无表格｜曲线切换 */
  const isDailyMonthlyYearly =
    view === 'report-daily' || view === 'report-monthly' || view === 'report-yearly';

  /** 水质明细可编辑副本（含原始/修改参数快照） */
  const [qualityRows, setQualityRows] = useState<Record<string, unknown>[]>(() => qualityDetailRows.map(r => ({ ...r })));
  const [flowRowsState, setFlowRowsState] = useState<Record<string, unknown>[]>(() => flowRows.map(r => ({ ...r })));
  const [levelRowsState, setLevelRowsState] = useState<Record<string, unknown>[]>(() => levelRows.map(r => ({ ...r })));
  const [dailyRowsState, setDailyRowsState] = useState<Record<string, unknown>[]>(() => dailyRows.map(r => ({ ...r })));
  const [monthlyRowsState, setMonthlyRowsState] = useState<Record<string, unknown>[]>(() => monthlyRows.map(r => ({ ...r })));
  const [yearlyRowsState, setYearlyRowsState] = useState<Record<string, unknown>[]>(() => yearlyRows.map(r => ({ ...r })));

  /** 详情弹窗：水质/流量/水位按监测点；其它报表按当前行 */
  type ReportDetailState =
    | { kind: 'quality'; pointKey: string }
    | { kind: 'flow'; pointKey: string }
    | { kind: 'level'; pointKey: string }
    | { kind: 'simple'; record: Record<string, unknown> };
  const [detailState, setDetailState] = useState<ReportDetailState | null>(null);

  const meta = useMemo(() => {
    const m: Record<string, { title: string; topic: string; rows: Record<string, unknown>[] }> = {
      'report-quality': {
        title: '水质综合报表',
        topic: '水质',
        rows: qualityDetailRows
      },
      'report-flow': {
        title: '流量综合报表',
        topic: '流量',
        rows: flowRows
      },
      'report-level': {
        title: '水位综合报表',
        topic: '水位',
        rows: levelRows
      },
      'report-daily': {
        title: '日报表信息',
        topic: '日报',
        rows: dailyRows
      },
      'report-monthly': {
        title: '月报表信息',
        topic: '月报',
        rows: monthlyRows
      },
      'report-yearly': {
        title: '年度报表信息',
        topic: '年报',
        rows: yearlyRows
      }
    };
    const base = m[view]!;
    if (view === 'report-quality') {
      return { ...base, rows: qualityRows };
    }
    if (view === 'report-flow') {
      return { ...base, rows: flowRowsState };
    }
    if (view === 'report-level') {
      return { ...base, rows: levelRowsState };
    }
    if (view === 'report-daily') {
      return { ...base, rows: dailyRowsState };
    }
    if (view === 'report-monthly') {
      return { ...base, rows: monthlyRowsState };
    }
    if (view === 'report-yearly') {
      return { ...base, rows: yearlyRowsState };
    }
    return base;
  }, [view, qualityRows, flowRowsState, levelRowsState, dailyRowsState, monthlyRowsState, yearlyRowsState]);

  const [chartMode, setChartMode] = useState<ChartMode>('line');
  const [kw, setKw] = useState('');
  const [region, setRegion] = useState<string | undefined>();
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([dayjs().subtract(30, 'day'), dayjs()]);
  const [selected, setSelected] = useState<React.Key[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  /** 水质 / 流量 / 水位：批量编辑（改参 + 删选中） */
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [formAdd] = Form.useForm();
  const [formEdit] = Form.useForm();
  const [formBatch] = Form.useForm();
  /** 对齐湘潭数据报表：表格/曲线、左侧树 */
  const [viewMode, setViewMode] = useState<'table' | 'curve'>('table');

  /** 切换到日/月/年报时固定为表格视图（不展示曲线） */
  useEffect(() => {
    if (isDailyMonthlyYearly) setViewMode('table');
  }, [isDailyMonthlyYearly, view]);

  /** 非水质报表：监测对象单选（与水质一致，父级不可选） */
  const [reportTreeSelectedKeys, setReportTreeSelectedKeys] = useState<React.Key[]>(['ent-1-o1']);
  /** 水质综合报表：二级监测点单选（一级水源地仅分组） */
  const [qualityTreeSelectedKeys, setQualityTreeSelectedKeys] = useState<React.Key[]>(['ws-pt1']);
  /** 报表中心顶部分类切换（地表水 / 水文监测 / …），各报表页共用 */
  const [reportCategoryKey, setReportCategoryKey] = useState<string>('surface-water');
  /** 日报/月报/年报：筛选条「监测项名称」（在时间范围前），选项随顶部分类（水质 / 水文流量·水位）变化 */
  const [dmyMonitorMetric, setDmyMonitorMetric] = useState<string>(() => getDmyMonitorMetricDefaultValue('surface-water'));

  const qualityDetailCompareRows = useMemo(() => {
    if (detailState?.kind !== 'quality' || !detailState.pointKey) return [];
    return qualityRows
      .filter(r => String(r.pointKey) === detailState.pointKey)
      .sort((a, b) => String(b.monitorTime).localeCompare(String(a.monitorTime)));
  }, [qualityRows, detailState]);

  const flowDetailRows = useMemo(() => {
    if (detailState?.kind !== 'flow' || !detailState.pointKey) return [];
    return flowRowsState
      .filter(r => String(r.pointKey) === detailState.pointKey)
      .sort((a, b) => String(b.monitorTime).localeCompare(String(a.monitorTime)));
  }, [flowRowsState, detailState]);

  const levelDetailRows = useMemo(() => {
    if (detailState?.kind !== 'level' || !detailState.pointKey) return [];
    return levelRowsState
      .filter(r => String(r.pointKey) === detailState.pointKey)
      .sort((a, b) => String(b.monitorTime).localeCompare(String(a.monitorTime)));
  }, [levelRowsState, detailState]);

  const qualityDetailCompareColumns = useMemo(() => buildQualityDetailCompareTableColumns(), []);
  const flowDetailCompareColumns = useMemo(() => buildFlowDetailCompareTableColumns(), []);
  const levelDetailCompareColumns = useMemo(() => buildLevelDetailCompareTableColumns(), []);

  const detailModalTitle = useMemo(() => {
    if (!detailState) return '';
    if (detailState.kind === 'quality') return '水质监测详情';
    if (detailState.kind === 'flow') return '流量监测详情';
    if (detailState.kind === 'level') return '水位监测详情';
    if (detailState.kind === 'simple') {
      const t: Partial<Record<ViewState, string>> = {
        'report-daily': '日报表详情',
        'report-monthly': '月报表详情',
        'report-yearly': '年度报表详情'
      };
      return t[view] ?? '报表明细详情';
    }
    return '详情';
  }, [detailState, view]);

  const rowActions = useCallback(
    (_: unknown, record: Record<string, unknown>) => {
      const openDetail = () => {
        if (view === 'report-quality') {
          setDetailState({ kind: 'quality', pointKey: String(record.pointKey) });
          return;
        }
        if (view === 'report-flow') {
          setDetailState({ kind: 'flow', pointKey: String(record.pointKey) });
          return;
        }
        if (view === 'report-level') {
          setDetailState({ kind: 'level', pointKey: String(record.pointKey) });
          return;
        }
        setDetailState({ kind: 'simple', record: { ...record } });
      };

      const openEdit = () => {
        if (view === 'report-quality') {
          formEdit.setFieldsValue({
            id: record.id,
            ph: record.ph,
            nh3: record.nh3,
            tp: record.tp,
            tn: record.tn,
            cod: record.cod,
            flow: record.flow
          });
        } else if (view === 'report-flow') {
          formEdit.setFieldsValue({
            id: record.id,
            facType: record.facType,
            name: record.name,
            avg: record.avg,
            peak: record.peak,
            sum: record.sum,
            region: record.region,
            period: record.period
          });
        } else if (view === 'report-level') {
          formEdit.setFieldsValue({
            id: record.id,
            region: record.region,
            posType: record.posType,
            name: record.name,
            cur: record.cur,
            warn: record.warn,
            ok: record.ok,
            period: record.period
          });
        } else {
          formEdit.setFieldsValue({ ...record, remark: '' });
        }
        setEditOpen(true);
      };

      return (
        <Space size={4} wrap={false} className="system-mgmt-table-op">
          <Button type="link" className="action-btn detail" size="small" icon={<EyeOutlined />} onClick={openDetail}>
            详情
          </Button>
          {!isDailyMonthlyYearly && (
            <Button type="link" className="action-btn edit" size="small" icon={<EditOutlined />} onClick={openEdit}>
              编辑
            </Button>
          )}
        </Space>
      );
    },
    [formEdit, view, isDailyMonthlyYearly]
  );

  const allColumns: ColumnConfig[] = useMemo(() => {
    const op: ColumnConfig = {
      key: 'operation',
      title: '操作',
      width: 128,
      fixed: 'right',
      render: rowActions
    };
    switch (view) {
      case 'report-quality':
        return [
          {
            key: 'monitorTime',
            title: '监测时间',
            dataIndex: 'monitorTime',
            width: 172,
            fixed: 'left',
            defaultVisible: true
          },
          { key: 'region', title: '区域', dataIndex: 'region', width: 100 },
          { key: 'ph', title: '酸碱度', dataIndex: 'ph', width: 72 },
          { key: 'nh3', title: '氨氮（毫克每升）', dataIndex: 'nh3', width: 102 },
          { key: 'tp', title: '总磷（毫克每升）', dataIndex: 'tp', width: 102 },
          { key: 'tn', title: '总氮（毫克每升）', dataIndex: 'tn', width: 102 },
          { key: 'cod', title: '化学需氧量（毫克每升）', dataIndex: 'cod', width: 130 },
          { key: 'flow', title: '废水流量（升每秒）', dataIndex: 'flow', width: 118 },
          op
        ];
      case 'report-flow':
        return [
          { key: 'monitorTime', title: '监测时间', dataIndex: 'monitorTime', width: 168, defaultVisible: true },
          { key: 'facType', title: '设施类型', dataIndex: 'facType' },
          { key: 'name', title: '设施名称', dataIndex: 'name' },
          { key: 'avg', title: '日均流量（立方米每小时）', dataIndex: 'avg', render: renderQualityMetricCell('avg') },
          { key: 'peak', title: '峰值（立方米每小时）', dataIndex: 'peak', render: renderQualityMetricCell('peak') },
          {
            key: 'sum',
            title: '累计（立方米）',
            dataIndex: 'sum',
            render: renderQualityMetricCellFormatted('sum', v => (typeof v === 'number' ? v.toExponential(2) : String(v)))
          },
          { key: 'region', title: '区域', dataIndex: 'region' },
          { key: 'period', title: '统计时段', dataIndex: 'period' },
          op
        ];
      case 'report-level':
        return [
          { key: 'monitorTime', title: '监测时间', dataIndex: 'monitorTime', width: 168, defaultVisible: true },
          { key: 'region', title: '区域', dataIndex: 'region' },
          { key: 'posType', title: '位置类型', dataIndex: 'posType' },
          { key: 'name', title: '名称', dataIndex: 'name' },
          { key: 'cur', title: '当前水位（米）', dataIndex: 'cur', render: renderQualityMetricCell('cur') },
          { key: 'warn', title: '警戒水位（米）', dataIndex: 'warn' },
          {
            key: 'ok',
            title: '是否达标',
            dataIndex: 'ok',
            render: (v: unknown) => <Tag color={v === '是' ? 'green' : 'orange'}>{String(v)}</Tag>
          },
          { key: 'period', title: '监测日', dataIndex: 'period' },
          op
        ];
      case 'report-daily':
        return [...REPORT_DAILY_HOURLY_COLUMNS, op];
      case 'report-monthly':
        return [...REPORT_MONTHLY_COLUMNS, op];
      case 'report-yearly':
        return [...REPORT_YEARLY_COLUMNS, op];
      default:
        return [op];
    }
  }, [view, rowActions]);

  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  useEffect(() => {
    setVisibleColumns(getDefaultVisibleColumnKeys(allColumns));
  }, [allColumns]);

  const tableColumns = useMemo(() => {
    const sorted = allColumns
      .filter(col => visibleColumns.includes(col.key) || col.key === 'operation')
      .sort((a, b) => {
        if (a.key === 'operation') return 1;
        if (b.key === 'operation') return -1;
        return visibleColumns.indexOf(a.key) - visibleColumns.indexOf(b.key);
      });
    if (view === 'report-quality') {
      return buildQualityNestedTableColumns(sorted, rowActions);
    }
    return sorted.map(col => ({
      title: col.title,
      dataIndex: col.dataIndex,
      key: col.key,
      width: col.width,
      fixed: col.fixed,
      render: col.render
        ? (value: unknown, record: Record<string, unknown>) => col.render!(value, record)
        : undefined
    }));
  }, [view, allColumns, visibleColumns, rowActions]);

  const filteredRows = useMemo(() => {
    return meta.rows.filter(r => {
      const row = r as Record<string, unknown>;
      const blob = JSON.stringify(r);
      const okKw = !kw || blob.includes(kw);
      const rRegion = row.region as string | undefined;
      const okReg = !region || region === '全市' || rRegion === region;
      const leaf = view === 'report-quality' ? qualityTreeSelectedKeys[0] : reportTreeSelectedKeys[0];
      const okPoint = !leaf || row.pointKey === leaf;
      return okKw && okReg && okPoint;
    });
  }, [meta.rows, kw, region, view, qualityTreeSelectedKeys, reportTreeSelectedKeys]);

  const reportTablePagination = useTablePagination({
    defaultPageSize: 24,
    pageSizeOptions: ['12', '24', '48', '96'],
    showSizeChanger: true,
    showTotal: t => `共 ${t} 条`,
    resetDeps: [kw, region, view, qualityTreeSelectedKeys, reportTreeSelectedKeys],
  });

  /** 报表统一仅支持 Excel 导出（按当前筛选结果导出） */
  const exportExcel = () => {
    const rows = filteredRows as unknown as Record<string, unknown>[];
    if (!rows.length) {
      message.warning('当前筛选条件下无数据可导出');
      return;
    }
    const allKeys = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
    const exportCols = allKeys
      .filter(k => k !== 'key')
      .map(k => ({ key: k, title: getExportFieldLabel(k), dataIndex: k }));
    const sheetName = String(meta.title || '报表').slice(0, 31) || '报表';
    downloadTableFullExcel(rows, exportCols, `系统管理_${meta.title}_报表`, sheetName);
    message.success('已导出 Excel（全量字段）');
  };

  /** 日/月/年报不展示导入（与业务约定） */
  const showCardImport =
    view !== 'report-daily' && view !== 'report-monthly' && view !== 'report-yearly';

  /** 水质 / 流量 / 水位：批量操作入口为「批量编辑」，其它报表仍为「批量删除」 */
  const isQualityFlowLevelReport =
    view === 'report-quality' || view === 'report-flow' || view === 'report-level';

  /** 切换报表类型或顶部分类时，重置监测项为当前分类下的默认项 */
  useEffect(() => {
    if (!isDailyMonthlyYearly) return;
    setDmyMonitorMetric(getDmyMonitorMetricDefaultValue(reportCategoryKey));
  }, [isDailyMonthlyYearly, reportCategoryKey]);

  const handleSearch = () => {
    const cat = REPORT_CENTER_CATEGORY_TABS.find(t => t.key === reportCategoryKey)?.label ?? '';
    if (isDailyMonthlyYearly) {
      const metricLabel = formatDmyMonitorMetricLabel(reportCategoryKey, dmyMonitorMetric);
      message.success(`已按条件检索（${cat}，监测项：${metricLabel}）（原型示意）`);
    } else {
      message.success(`已按条件检索（${cat}）（原型示意）`);
    }
  };

  /** 批量表单：有填写则认为要覆盖该字段 */
  const batchFieldSet = (v: unknown) => v !== undefined && v !== null && v !== '';

  const handleBatchApplyParams = () => {
    const vals = formBatch.getFieldsValue();
    const ids = new Set(selected.map(String));
    let touched = false;

    const checkAny = (keys: string[]) => {
      for (const k of keys) {
        if (batchFieldSet(vals[k])) {
          touched = true;
          break;
        }
      }
    };

    if (view === 'report-quality') {
      checkAny(['ph', 'nh3', 'tp', 'tn', 'cod', 'flow']);
      if (!touched) {
        message.warning('请至少填写一项要批量修改的参数');
        return;
      }
      setQualityRows(prev =>
        prev.map(row => {
          if (!ids.has(String(row.id))) return row;
          const ph = batchFieldSet(vals.ph) ? Number(vals.ph) : Number(row.ph);
          const nh3 = batchFieldSet(vals.nh3) ? Number(vals.nh3) : Number(row.nh3);
          const tp = batchFieldSet(vals.tp) ? Number(vals.tp) : Number(row.tp);
          const tn = batchFieldSet(vals.tn) ? Number(vals.tn) : Number(row.tn);
          const cod = batchFieldSet(vals.cod) ? Number(vals.cod) : Number(row.cod);
          const flow = batchFieldSet(vals.flow) ? Number(vals.flow) : Number(row.flow);
          const modified = { ph, nh3, tp, tn, cod, flow };
          const flags = recomputeQualityRowFlags(row.id, ph, nh3, tp, tn, cod, flow);
          return { ...row, ...modified, paramsModified: modified, ...flags };
        })
      );
      message.success(`已批量更新 ${selected.length} 条水质数据（原型）`);
      setBatchEditOpen(false);
      formBatch.resetFields();
      return;
    }

    if (view === 'report-flow') {
      checkAny(['facType', 'name', 'avg', 'peak', 'sum', 'region', 'period']);
      if (!touched) {
        message.warning('请至少填写一项要批量修改的参数');
        return;
      }
      setFlowRowsState(prev =>
        prev.map(row => {
          if (!ids.has(String(row.id))) return row;
          const avg = batchFieldSet(vals.avg) ? Number(vals.avg) : Number(row.avg);
          const peak = batchFieldSet(vals.peak) ? Number(vals.peak) : Number(row.peak);
          const sum = batchFieldSet(vals.sum) ? Number(vals.sum) : Number(row.sum);
          const flags = recomputeFlowRowFlags(row.id, avg, peak, sum);
          const paramsModified = { avg, peak, sum };
          return {
            ...row,
            ...(batchFieldSet(vals.facType) ? { facType: String(vals.facType) } : {}),
            ...(batchFieldSet(vals.name) ? { name: String(vals.name) } : {}),
            ...(batchFieldSet(vals.region) ? { region: String(vals.region) } : {}),
            ...(batchFieldSet(vals.period) ? { period: String(vals.period) } : {}),
            avg,
            peak,
            sum,
            paramsModified,
            ...flags
          };
        })
      );
      message.success(`已批量更新 ${selected.length} 条流量数据（原型）`);
      setBatchEditOpen(false);
      formBatch.resetFields();
      return;
    }

    if (view === 'report-level') {
      checkAny(['region', 'posType', 'name', 'cur', 'warn', 'ok', 'period']);
      if (!touched) {
        message.warning('请至少填写一项要批量修改的参数');
        return;
      }
      setLevelRowsState(prev =>
        prev.map(row => {
          if (!ids.has(String(row.id))) return row;
          const cur = batchFieldSet(vals.cur) ? Number(vals.cur) : Number(row.cur);
          const warn = batchFieldSet(vals.warn) ? Number(vals.warn) : Number(row.warn);
          const ok = batchFieldSet(vals.ok) ? String(vals.ok) : String(row.ok);
          const flags = recomputeLevelRowFlags(row.id, cur, warn);
          const paramsModified = { cur, warn, ok };
          return {
            ...row,
            ...(batchFieldSet(vals.region) ? { region: String(vals.region) } : {}),
            ...(batchFieldSet(vals.posType) ? { posType: String(vals.posType) } : {}),
            ...(batchFieldSet(vals.name) ? { name: String(vals.name) } : {}),
            ...(batchFieldSet(vals.period) ? { period: String(vals.period) } : {}),
            cur,
            warn,
            ok,
            paramsModified,
            ...flags
          };
        })
      );
      message.success(`已批量更新 ${selected.length} 条水位数据（原型）`);
      setBatchEditOpen(false);
      formBatch.resetFields();
    }
  };

  const handleBatchDeleteSelectedRows = () => {
    const ids = new Set(selected.map(String));
    const n = selected.length;
    if (view === 'report-quality') {
      setQualityRows(prev => prev.filter(r => !ids.has(String(r.id))));
    } else if (view === 'report-flow') {
      setFlowRowsState(prev => prev.filter(r => !ids.has(String(r.id))));
    } else if (view === 'report-level') {
      setLevelRowsState(prev => prev.filter(r => !ids.has(String(r.id))));
    }
    message.success(`已删除 ${n} 条（原型）`);
    setSelected([]);
    setBatchEditOpen(false);
    formBatch.resetFields();
  };

  const openBatchEdit = () => {
    formBatch.resetFields();
    setBatchEditOpen(true);
  };

  /** 水质 / 流量 / 水位：新增一行，表单字段与表格列一致 */
  const openAdd = () => {
    formAdd.resetFields();
    if (view === 'report-quality') {
      formAdd.setFieldsValue({
        pointKey: qualityTreeSelectedKeys[0],
        region: '韶山片区',
        monitorTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        ph: 7.0,
        nh3: 0.35,
        tp: 0.02,
        tn: 1.0,
        cod: 10,
        flow: 100
      });
    } else if (view === 'report-flow') {
      formAdd.setFieldsValue({
        pointKey: reportTreeSelectedKeys[0],
        monitorTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        facType: '排水管网',
        name: '新建设施',
        avg: 1000,
        peak: 2000,
        sum: 50000,
        region: '韶山片区',
        period: dayjs().format('YYYY-MM')
      });
    } else if (view === 'report-level') {
      formAdd.setFieldsValue({
        pointKey: reportTreeSelectedKeys[0],
        monitorTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        region: '韶山片区',
        posType: '河流',
        name: '新建监测点',
        cur: 25,
        warn: 28,
        ok: '是',
        period: dayjs().format('YYYY-MM-DD')
      });
    }
    setAddOpen(true);
  };

  const handleAddConfirm = () => {
    formAdd.validateFields().then(vals => {
      if (view === 'report-quality') {
        const pk = String(vals.pointKey);
        const ph = Number(vals.ph);
        const nh3 = Number(vals.nh3);
        const tp = Number(vals.tp);
        const tn = Number(vals.tn);
        const cod = Number(vals.cod);
        const flow = Number(vals.flow);
        const id = `${pk}-add-${Date.now()}`;
        const paramsOriginal = { ph, nh3, tp, tn, cod, flow };
        const flags = recomputeQualityRowFlags(id, ph, nh3, tp, tn, cod, flow);
        setQualityRows(prev => [
          ...prev,
          {
            id,
            pointKey: pk,
            region: String(vals.region),
            monitorTime: String(vals.monitorTime),
            ph,
            nh3,
            tp,
            tn,
            cod,
            flow,
            paramsOriginal,
            paramsModified: null as Record<string, number> | null,
            ...flags
          }
        ]);
        message.success('已新增一条水质明细（原型）');
      } else if (view === 'report-flow') {
        const id = `f-add-${Date.now()}`;
        const avg = Number(vals.avg);
        const peak = Number(vals.peak);
        const sum = Number(vals.sum);
        const flags = recomputeFlowRowFlags(id, avg, peak, sum);
        const paramsOriginal = { avg, peak, sum };
        setFlowRowsState(prev => [
          ...prev,
          {
            id,
            pointKey: String(vals.pointKey),
            monitorTime: String(vals.monitorTime),
            facType: String(vals.facType),
            name: String(vals.name),
            avg,
            peak,
            sum,
            region: String(vals.region),
            period: String(vals.period),
            paramsOriginal,
            paramsModified: null as Record<string, number> | null,
            ...flags
          }
        ]);
        message.success('已新增一条流量明细（原型）');
      } else if (view === 'report-level') {
        const id = `l-add-${Date.now()}`;
        const cur = Number(vals.cur);
        const warn = Number(vals.warn);
        const ok = String(vals.ok);
        const flags = recomputeLevelRowFlags(id, cur, warn);
        const paramsOriginal = { cur, warn, ok };
        setLevelRowsState(prev => [
          ...prev,
          {
            id,
            pointKey: String(vals.pointKey),
            monitorTime: String(vals.monitorTime),
            region: String(vals.region),
            posType: String(vals.posType),
            name: String(vals.name),
            cur,
            warn,
            ok,
            period: String(vals.period),
            paramsOriginal,
            paramsModified: null as Record<string, unknown> | null,
            ...flags
          }
        ]);
        message.success('已新增一条水位明细（原型）');
      }
      setAddOpen(false);
      formAdd.resetFields();
    });
  };

  return (
    <div className="facility-view report-xiangtan-by-screenshot">
      {/*
        布局参考：/Volumes/公司/项目/2026/韶山/系统截图
        - 数据报表-常规报表.png：左侧树 + 筛选条 + 表格|曲线 + 图例 + 明细表（表上「字段」管理列）
        - 数据报表-异常数据统计.png：白底筛选条 + 搜索/导出
      */}
      <Card className="report-data-page-card" title={meta.title}>
        <div className="report-center-category-switch" role="region" aria-label="报表数据分类">
          <Tabs
            className="report-center-category-tabs"
            type="line"
            size="middle"
            activeKey={reportCategoryKey}
            onChange={setReportCategoryKey}
            items={REPORT_CENTER_CATEGORY_TABS.map(t => ({ key: t.key, label: t.label }))}
          />
        </div>
        <div className="report-split">
          <aside className="report-tree-panel">
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              区域
            </Text>
            <Select
              allowClear
              placeholder="全部"
              value={region}
              onChange={setRegion}
              options={regionOpts.map(r => ({ label: r, value: r }))}
              style={{ width: '100%', marginBottom: 12 }}
            />
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
              监测对象
            </Text>
            <Search
              placeholder={view === 'report-quality' ? '水源地/监测点名称' : '排放单位/排口名称'}
              allowClear
              style={{ marginBottom: 8 }}
              value={kw}
              onChange={e => setKw(e.target.value)}
              onSearch={handleSearch}
            />
            <Tree
              blockNode
              showLine={view === 'report-quality'}
              defaultExpandAll
              selectedKeys={view === 'report-quality' ? qualityTreeSelectedKeys : reportTreeSelectedKeys}
              treeData={view === 'report-quality' ? QUALITY_TREE_DATA : REPORT_TREE_DATA}
              onSelect={(keys, info) => {
                if (!keys.length) return;
                const k = keys[keys.length - 1];
                const n = info.node;
                const hasChildren = !!(n as { children?: unknown[] }).children?.length;
                if (hasChildren) return;
                if (view === 'report-quality') {
                  setQualityTreeSelectedKeys([k]);
                } else {
                  setReportTreeSelectedKeys([k]);
                }
              }}
            />
          </aside>

          <div className="report-split-main">
            <div className="report-filter-bar-xiangtan">
              <div className="report-filter-bar-xiangtan-left">
                <Space wrap size={[8, 8]} align="center">
                  {isDailyMonthlyYearly && (
                    <div className="report-dmy-metric-in-filter">
                      <Text type="secondary" className="report-dmy-metric-in-filter__label">
                        监测项名称
                      </Text>
                      <Select
                        value={dmyMonitorMetric}
                        onChange={v => setDmyMonitorMetric(v)}
                        options={getDmyMonitorMetricSelectOptions(reportCategoryKey) as SelectProps['options']}
                        className="report-dmy-metric-in-filter__select"
                        showSearch
                        optionFilterProp="label"
                        popupMatchSelectWidth={false}
                        placeholder="请选择监测项"
                      />
                    </div>
                  )}
                  <RangePicker
                    key={view}
                    {...getReportCenterRangePickerProps(view as ReportCenterViewKey)}
                    value={range}
                    onChange={v => setRange(v as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                  />
                  <Button type="primary" className="search-btn" icon={<SearchOutlined />} onClick={handleSearch}>
                    搜索
                  </Button>
                  <Button
                    onClick={() => {
                      setRange(null);
                    }}
                  >
                    重置
                  </Button>
                </Space>
              </div>
              {!isDailyMonthlyYearly && (
                <Segmented
                  value={viewMode}
                  onChange={v => setViewMode(v as 'table' | 'curve')}
                  options={[
                    { label: '表格', value: 'table' },
                    { label: '曲线', value: 'curve' }
                  ]}
                />
              )}
            </div>

            {(isDailyMonthlyYearly || viewMode === 'table') && (
              <>
                {!isDailyMonthlyYearly && (
                  <div className="report-status-legend report-status-legend--quality-value">
                    <Text type="secondary" style={{ marginRight: 8 }}>
                      图例：
                    </Text>
                    <span className="quality-legend-item">
                      <span className="quality-legend-dot quality-legend-dot--normal" />
                      正常
                    </span>
                    <span className="quality-legend-item">
                      <span className="quality-legend-dot quality-legend-dot--over" />
                      超限
                    </span>
                    <span className="quality-legend-item">
                      <span className="quality-legend-dot quality-legend-dot--manual" />
                      手工
                    </span>
                  </div>
                )}
                <div className="report-table-toolbar">
                  <Text strong>报表明细</Text>
                  <div className="report-table-toolbar-actions">
                    <Space wrap size={[8, 8]} align="center">
                      <Button icon={<DownloadOutlined />} className="export-btn" onClick={exportExcel}>
                        导出Excel
                      </Button>
                      {showCardImport && (
                        <Upload
                          beforeUpload={() => {
                            message.success('已选择文件，导入完成（原型示意）');
                            return false;
                          }}
                          showUploadList={false}
                        >
                          <Button icon={<UploadOutlined />}>导入</Button>
                        </Upload>
                      )}
                      <ColumnManager columns={allColumns} visibleColumns={visibleColumns} onChange={setVisibleColumns} />
                      {isQualityFlowLevelReport && (
                        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd} className="add-btn">
                          新增
                        </Button>
                      )}
                      {isQualityFlowLevelReport ? (
                        <Button onClick={openBatchEdit} disabled={selected.length === 0}>
                          批量编辑
                        </Button>
                      ) : (
                        !isDailyMonthlyYearly && (
                          <Button danger onClick={() => setBatchOpen(true)} disabled={selected.length === 0}>
                            批量删除
                          </Button>
                        )
                      )}
                    </Space>
                  </div>
                </div>
                <div className="facility-table-wrap">
                  <Table
                    size="small"
                    rowKey="id"
                    scroll={{ x: 'max-content' }}
                    rowSelection={
                      isDailyMonthlyYearly
                        ? undefined
                        : { selectedRowKeys: selected, onChange: keys => setSelected(keys) }
                    }
                    columns={tableColumns}
                    dataSource={filteredRows}
                    pagination={reportTablePagination}
                  />
                </div>
              </>
            )}

            {!isDailyMonthlyYearly && viewMode === 'curve' && (
              <Card className="report-chart-card" size="small" title="数据曲线" extra={<LineChartOutlined />}>
                <Tabs
                  activeKey={chartMode}
                  onChange={k => setChartMode(k as ChartMode)}
                  items={[
                    { key: 'line', label: <><LineChartOutlined /> 折线图</> },
                    { key: 'bar', label: <><BarChartOutlined /> 柱状图</> },
                    { key: 'pie', label: <><PieChartOutlined /> 饼图</> },
                    { key: 'radar', label: <><RadarChartOutlined /> 雷达图</> }
                  ]}
                />
                <ReportChartBlock mode={chartMode} topic={meta.topic} />
              </Card>
            )}
          </div>
        </div>
      </Card>

      <Modal
        title={
          view === 'report-quality'
            ? '新增水质明细'
            : view === 'report-flow'
              ? '新增流量明细'
              : view === 'report-level'
                ? '新增水位明细'
                : '新增'
        }
        open={addOpen}
        styles={formModalStyles}
        wrapClassName={CONFIG_CENTER_MODAL_WRAP_CLASS}
        onCancel={() => {
          setAddOpen(false);
          formAdd.resetFields();
        }}
        onOk={handleAddConfirm}
        width={640}
        destroyOnClose
      >
        {view === 'report-quality' && (
          <Form form={formAdd} layout="vertical" className="config-center-modal-form">
            <Form.Item label="监测点" name="pointKey" rules={[{ required: true, message: '请选择监测点' }]}>
              <Select showSearch optionFilterProp="label" options={getQualityTreeLeafOptions()} placeholder="与左侧树叶子对应" />
            </Form.Item>
            <Form.Item label="区域" name="region" rules={[{ required: true }]}>
              <Select options={regionOpts.map(r => ({ label: r, value: r }))} />
            </Form.Item>
            <Form.Item label="监测时间" name="monitorTime" rules={[{ required: true }]}>
              <Input placeholder="YYYY-MM-DD HH:mm:ss" />
            </Form.Item>
            {QUALITY_VALUE_FORM_ITEMS.map(({ name, label, step }) => (
              <Form.Item key={name} name={name} label={label} rules={[{ required: true, message: `请填写${label}` }]}>
                <InputNumber style={{ width: '100%' }} step={step} />
              </Form.Item>
            ))}
          </Form>
        )}
        {view === 'report-flow' && (
          <Form form={formAdd} layout="vertical" className="config-center-modal-form">
            <Form.Item label="监测对象" name="pointKey" rules={[{ required: true, message: '请选择监测对象' }]}>
              <Select showSearch optionFilterProp="label" options={getReportTreeLeafOptions()} placeholder="与左侧树叶子对应" />
            </Form.Item>
            <Form.Item label="监测时间" name="monitorTime" rules={[{ required: true, message: '请填写监测时间' }]}>
              <Input placeholder="YYYY-MM-DD HH:mm:ss" />
            </Form.Item>
            <Form.Item label="设施类型" name="facType" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="设施名称" name="name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="日均流量（立方米每小时）" name="avg" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
            <Form.Item label="峰值（立方米每小时）" name="peak" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
            <Form.Item label="累计（立方米）" name="sum" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
            <Form.Item label="区域" name="region" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="统计时段" name="period" rules={[{ required: true }]}>
              <Input placeholder="如 2026-04" />
            </Form.Item>
          </Form>
        )}
        {view === 'report-level' && (
          <Form form={formAdd} layout="vertical" className="config-center-modal-form">
            <Form.Item label="监测对象" name="pointKey" rules={[{ required: true, message: '请选择监测对象' }]}>
              <Select showSearch optionFilterProp="label" options={getReportTreeLeafOptions()} placeholder="与左侧树叶子对应" />
            </Form.Item>
            <Form.Item label="监测时间" name="monitorTime" rules={[{ required: true, message: '请填写监测时间' }]}>
              <Input placeholder="YYYY-MM-DD HH:mm:ss" />
            </Form.Item>
            <Form.Item label="区域" name="region" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="位置类型" name="posType" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="名称" name="name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="当前水位（米）" name="cur" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} step={0.01} />
            </Form.Item>
            <Form.Item label="警戒水位（米）" name="warn" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} step={0.01} />
            </Form.Item>
            <Form.Item label="是否达标" name="ok" rules={[{ required: true }]}>
              <Select options={[{ label: '是', value: '是' }, { label: '否', value: '否' }]} />
            </Form.Item>
            <Form.Item label="监测日" name="period" rules={[{ required: true }]}>
              <Input placeholder="YYYY-MM-DD" />
            </Form.Item>
          </Form>
        )}
      </Modal>

      <Modal
        title={
          view === 'report-quality'
            ? '修改水质参数'
            : view === 'report-flow'
              ? '编辑流量报表'
              : view === 'report-level'
                ? '编辑水位报表'
                : '编辑报表'
        }
        open={editOpen}
        styles={formModalStyles}
        wrapClassName={CONFIG_CENTER_MODAL_WRAP_CLASS}
        onCancel={() => setEditOpen(false)}
        onOk={() => {
          if (view === 'report-quality') {
            formEdit.validateFields().then(vals => {
              const id = vals.id as string;
              const ph = Number(vals.ph);
              const nh3 = Number(vals.nh3);
              const tp = Number(vals.tp);
              const tn = Number(vals.tn);
              const cod = Number(vals.cod);
              const flow = Number(vals.flow);
              const modified = { ph, nh3, tp, tn, cod, flow };
              const flags = recomputeQualityRowFlags(id, ph, nh3, tp, tn, cod, flow);
              setQualityRows(prev =>
                prev.map(row =>
                  row.id !== id
                    ? row
                    : {
                        ...row,
                        ph,
                        nh3,
                        tp,
                        tn,
                        cod,
                        flow,
                        paramsModified: modified,
                        ...flags
                      }
                )
              );
              message.success('已保存水质参数（原型示意）');
              setEditOpen(false);
            });
            return;
          }
          if (view === 'report-flow') {
            formEdit.validateFields().then(vals => {
              const id = vals.id as string;
              const avg = Number(vals.avg);
              const peak = Number(vals.peak);
              const sum = Number(vals.sum);
              const flags = recomputeFlowRowFlags(id, avg, peak, sum);
              const paramsModified = { avg, peak, sum };
              setFlowRowsState(prev =>
                prev.map(row =>
                  row.id === id
                    ? {
                        ...row,
                        facType: String(vals.facType),
                        name: String(vals.name),
                        region: String(vals.region),
                        period: String(vals.period),
                        avg,
                        peak,
                        sum,
                        paramsModified,
                        ...flags
                      }
                    : row
                )
              );
              message.success('已保存（原型示意）');
              setEditOpen(false);
            });
            return;
          }
          if (view === 'report-level') {
            formEdit.validateFields().then(vals => {
              const id = vals.id as string;
              const cur = Number(vals.cur);
              const warn = Number(vals.warn);
              const ok = String(vals.ok);
              const flags = recomputeLevelRowFlags(id, cur, warn);
              const paramsModified = { cur, warn, ok };
              setLevelRowsState(prev =>
                prev.map(row =>
                  row.id === id
                    ? {
                        ...row,
                        region: String(vals.region),
                        posType: String(vals.posType),
                        name: String(vals.name),
                        period: String(vals.period),
                        cur,
                        warn,
                        ok,
                        paramsModified,
                        ...flags
                      }
                    : row
                )
              );
              message.success('已保存（原型示意）');
              setEditOpen(false);
            });
            return;
          }
          formEdit.validateFields().then(() => {
            message.success('已保存（原型示意）');
            setEditOpen(false);
          });
        }}
        width={640}
        destroyOnClose
      >
        {view === 'report-quality' && (
          <Form form={formEdit} layout="vertical" className="config-center-modal-form">
              <Form.Item name="id" hidden>
                <Input />
              </Form.Item>
              {QUALITY_VALUE_FORM_ITEMS.map(({ name, label, step }) => (
                <Form.Item key={name} name={name} label={label} rules={[{ required: true, message: `请填写${label}` }]}>
                  <InputNumber style={{ width: '100%' }} step={step} />
                </Form.Item>
              ))}
            </Form>
        )}
        {view === 'report-flow' && (
          <Form form={formEdit} layout="vertical" className="config-center-modal-form">
              <Form.Item name="id" hidden>
                <Input />
              </Form.Item>
              <Form.Item label="设施类型" name="facType" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="设施名称" name="name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="日均流量（立方米每小时）" name="avg" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
              <Form.Item label="峰值（立方米每小时）" name="peak" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
              <Form.Item label="累计（立方米）" name="sum" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
              <Form.Item label="区域" name="region" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="统计时段" name="period" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Form>
        )}
        {view === 'report-level' && (
          <Form form={formEdit} layout="vertical" className="config-center-modal-form">
              <Form.Item name="id" hidden>
                <Input />
              </Form.Item>
              <Form.Item label="区域" name="region" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="位置类型" name="posType" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="名称" name="name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="当前水位（米）" name="cur" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} step={0.01} />
              </Form.Item>
              <Form.Item label="警戒水位（米）" name="warn" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} step={0.01} />
              </Form.Item>
              <Form.Item label="是否达标" name="ok" rules={[{ required: true }]}>
                <Select options={[{ label: '是', value: '是' }, { label: '否', value: '否' }]} />
              </Form.Item>
              <Form.Item label="监测日" name="period" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Form>
        )}
      </Modal>

      <Modal
        title={detailModalTitle}
        open={detailState !== null}
        styles={formModalStyles}
        wrapClassName={CONFIG_CENTER_MODAL_WRAP_CLASS}
        width={
          detailState?.kind === 'quality' || detailState?.kind === 'flow' || detailState?.kind === 'level'
            ? 'min(1200px, 96vw)'
            : 920
        }
        className={
          detailState?.kind === 'quality' || detailState?.kind === 'flow' || detailState?.kind === 'level'
            ? 'report-quality-detail-modal'
            : undefined
        }
        destroyOnClose
        footer={null}
        onCancel={() => setDetailState(null)}
      >
        {detailState?.kind === 'quality' && detailState.pointKey && (
          <div>
            <div className="report-quality-detail-table-wrap">
              <div className="facility-table-wrap">
                <Table
                  size="small"
                  rowKey="id"
                  scroll={{ x: 'max-content' }}
                  pagination={false}
                  columns={qualityDetailCompareColumns}
                  dataSource={qualityDetailCompareRows}
                />
              </div>
            </div>
          </div>
        )}
        {detailState?.kind === 'flow' && detailState.pointKey && (
          <div>
            <div className="report-quality-detail-table-wrap">
              <div className="facility-table-wrap">
                <Table
                  size="small"
                  rowKey="id"
                  scroll={{ x: 'max-content' }}
                  pagination={false}
                  columns={flowDetailCompareColumns}
                  dataSource={flowDetailRows}
                />
              </div>
            </div>
          </div>
        )}
        {detailState?.kind === 'level' && detailState.pointKey && (
          <div>
            <div className="report-quality-detail-table-wrap">
              <div className="facility-table-wrap">
                <Table
                  size="small"
                  rowKey="id"
                  scroll={{ x: 'max-content' }}
                  pagination={false}
                  columns={levelDetailCompareColumns}
                  dataSource={levelDetailRows}
                />
              </div>
            </div>
          </div>
        )}
        {detailState?.kind === 'simple' && (
          <div className="report-dmy-detail-readonly">
            <Descriptions bordered column={1} size="middle" labelStyle={{ width: 140 }}>
              {getDmyDetailFieldLabels(view).map(({ dataIndex, label }) => (
                <Descriptions.Item key={dataIndex} label={label}>
                  {fmtDmyDetailValue((detailState.record as Record<string, unknown>)[dataIndex])}
                </Descriptions.Item>
              ))}
            </Descriptions>
          </div>
        )}
      </Modal>

      <Modal
        title="批量删除"
        okText="确定删除"
        okButtonProps={{ danger: true }}
        open={batchOpen}
        styles={formModalStyles}
        wrapClassName={CONFIG_CENTER_MODAL_WRAP_CLASS}
        destroyOnClose
        onCancel={() => setBatchOpen(false)}
        onOk={() => {
          message.success(`已删除 ${selected.length} 条（原型示意）`);
          setBatchOpen(false);
          setSelected([]);
        }}
      >
        确定删除已选中的 <strong>{selected.length}</strong> 条报表数据？删除后不可恢复（原型为示意）。
      </Modal>

      <Modal
        title="批量编辑"
        open={batchEditOpen}
        styles={formModalStyles}
        wrapClassName={CONFIG_CENTER_MODAL_WRAP_CLASS}
        onCancel={() => {
          setBatchEditOpen(false);
          formBatch.resetFields();
        }}
        width={640}
        destroyOnClose
        footer={
          <Space>
            <Button
              onClick={() => {
                setBatchEditOpen(false);
                formBatch.resetFields();
              }}
            >
              取消
            </Button>
            <Button type="primary" onClick={handleBatchApplyParams}>
              应用修改
            </Button>
          </Space>
        }
      >
        <Form form={formBatch} layout="vertical" className="config-center-modal-form">
          {view === 'report-quality' &&
            QUALITY_VALUE_FORM_ITEMS.map(({ name, label, step }) => (
              <Form.Item key={name} name={name} label={label}>
                <InputNumber style={{ width: '100%' }} step={step} placeholder="不修改请留空" />
              </Form.Item>
            ))}
          {view === 'report-flow' && (
            <>
              <Form.Item name="facType" label="设施类型">
                <Input placeholder="不修改请留空" />
              </Form.Item>
              <Form.Item name="name" label="设施名称">
                <Input placeholder="不修改请留空" />
              </Form.Item>
              <Form.Item name="avg" label="日均流量（立方米每小时）">
                <InputNumber style={{ width: '100%' }} min={0} placeholder="不修改请留空" />
              </Form.Item>
              <Form.Item name="peak" label="峰值（立方米每小时）">
                <InputNumber style={{ width: '100%' }} min={0} placeholder="不修改请留空" />
              </Form.Item>
              <Form.Item name="sum" label="累计（立方米）">
                <InputNumber style={{ width: '100%' }} min={0} placeholder="不修改请留空" />
              </Form.Item>
              <Form.Item name="region" label="区域">
                <Input placeholder="不修改请留空" />
              </Form.Item>
              <Form.Item name="period" label="统计时段">
                <Input placeholder="不修改请留空" />
              </Form.Item>
            </>
          )}
          {view === 'report-level' && (
            <>
              <Form.Item name="region" label="区域">
                <Input placeholder="不修改请留空" />
              </Form.Item>
              <Form.Item name="posType" label="位置类型">
                <Input placeholder="不修改请留空" />
              </Form.Item>
              <Form.Item name="name" label="名称">
                <Input placeholder="不修改请留空" />
              </Form.Item>
              <Form.Item name="cur" label="当前水位（米）">
                <InputNumber style={{ width: '100%' }} step={0.01} placeholder="不修改请留空" />
              </Form.Item>
              <Form.Item name="warn" label="警戒水位（米）">
                <InputNumber style={{ width: '100%' }} step={0.01} placeholder="不修改请留空" />
              </Form.Item>
              <Form.Item name="ok" label="是否达标">
                <Select allowClear placeholder="不修改请留空" options={[{ label: '是', value: '是' }, { label: '否', value: '否' }]} />
              </Form.Item>
              <Form.Item name="period" label="监测日">
                <Input placeholder="不修改请留空" />
              </Form.Item>
            </>
          )}
        </Form>
        <Divider />
        <Popconfirm
          title={`确定删除已选中的 ${selected.length} 条数据？`}
          okText="确定删除"
          okButtonProps={{ danger: true }}
          onConfirm={handleBatchDeleteSelectedRows}
          disabled={selected.length === 0}
        >
          <Button danger disabled={selected.length === 0}>
            删除选中数据
          </Button>
        </Popconfirm>
      </Modal>
    </div>
  );
};

// ==================== 配置中心页面（组件见 config-center-views.tsx，数据见 config-center-data.ts） ====================

// ==================== 主框架 ====================

/** 配置中心子树是否包含当前视图（含水利工程等三级展开项） */
function configSidebarChildContainsView(c: SidebarChildItem, v: ViewState): boolean {
  if (!('children' in c) || !c.children) {
    return c.key === v;
  }
  return c.children.some(t3 => {
    if ('children' in t3 && t3.children) {
      return t3.children.some(t4 => t4.key === v);
    }
    return t3.key === v;
  });
}

const getBreadcrumb = (v: ViewState): string => {
  if (v.startsWith('report-')) {
    const group = sidebarMenus[0];
    const child = group.children?.find(c => c.key === v);
    return `系统管理 / 报表中心 / ${child?.label ?? ''}`;
  }
  const cfgChildren = sidebarMenus[1].children!;
  for (const item of cfgChildren) {
    if (!('children' in item) || !item.children) {
      if (item.key === v) return `系统管理 / 配置中心 / ${item.label}`;
      continue;
    }
    for (const t3 of item.children) {
      if (!('children' in t3) || !t3.children) {
        if (t3.key === v) return `系统管理 / 配置中心 / ${item.label} / ${t3.label}`;
      } else {
        for (const t4 of t3.children) {
          if (t4.key === v) {
            return `系统管理 / 配置中心 / ${item.label} / ${t3.label} / ${t4.label}`;
          }
        }
      }
    }
  }
  return `系统管理 / 配置中心`;
};

const Component: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('report-quality');

  const [expandedKeys, setExpandedKeys] = useState<string[]>(() => {
    const ex: string[] = [];
    for (const m of sidebarMenus) {
      if (m.children?.some(c => c.key === 'report-quality')) ex.push(m.key);
    }
    ex.push('report-root', 'config-root', 'cfg-pollution', 'cfg-hydro');
    return [...new Set(ex)];
  });

  const toggleExpand = useCallback((key: string) => {
    setExpandedKeys(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
  }, []);

  const renderMain = () => {
    if (
      currentView === 'report-quality' ||
      currentView === 'report-flow' ||
      currentView === 'report-level' ||
      currentView === 'report-daily' ||
      currentView === 'report-monthly' ||
      currentView === 'report-yearly'
    ) {
      return <ReportCenterView view={currentView} />;
    }
    switch (currentView) {
      case 'cfg-pollution-rural':
        return <ConfigRuralSewagePollutionView />;
      case 'cfg-pollution-agri':
        return <ConfigAgriRuralPollutionView />;
      case 'cfg-pollution-industry':
        return <ConfigIndustryPollutionView />;
      case 'cfg-hydro-reservoir':
        return <ConfigHydroReservoirView />;
      case 'cfg-hydro-sluice':
        return <ConfigHydroSluiceView />;
      case 'cfg-hydro-levee':
        return <ConfigHydroLeveeView />;
      case 'cfg-hydro-water-gate':
        return <ConfigHydroWaterGateView />;
      case 'cfg-hydro-polder':
        return <ConfigHydroPolderView />;
      case 'cfg-hydro-weir':
        return <ConfigHydroWeirView />;
      case 'cfg-hydro-hillpond':
        return <ConfigHydroHillpondView />;
      case 'cfg-rs':
        return <ConfigRsView />;
      case 'cfg-park':
        return <ConfigParkView />;
      case 'cfg-watershed':
        return <ConfigWatershedView />;
      default:
        return <ReportCenterView view="report-quality" />;
    }
  };

  return (
    <Layout className="water-env-dashboard system-mgmt-standalone">
      <div className="main-layout with-sidebar">
        <div className="sidebar-menu">
          <div className="sidebar-menu-title">系统管理</div>
          <div className="sidebar-menu-list">
            {sidebarMenus.map(menu => {
              const hasChildren = !!menu.children?.length;
              const isExpanded = expandedKeys.includes(menu.key);
              const isActive =
                menu.children?.some(c => configSidebarChildContainsView(c, currentView)) ?? false;
              return (
                <div key={menu.key} className="sidebar-menu-item-wrapper">
                  <div
                    className={`sidebar-menu-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      if (hasChildren) toggleExpand(menu.key);
                    }}
                  >
                    <span className="sidebar-menu-icon">{menu.icon}</span>
                    <span className="sidebar-menu-label">{menu.label}</span>
                    {hasChildren && (
                      <span className={`sidebar-menu-arrow ${isExpanded ? 'expanded' : ''}`}>
                        <DownOutlined />
                      </span>
                    )}
                  </div>
                  {hasChildren && isExpanded && (
                    <div className="sidebar-submenu">
                      {menu.children!.map(child => {
                        if ('children' in child && child.children) {
                          const tier3Open = expandedKeys.includes(child.key);
                          return (
                            <div key={child.key} className="sidebar-submenu-nest-wrap">
                              <div
                                className="sidebar-submenu-item sidebar-submenu-parent"
                                onClick={e => {
                                  e.stopPropagation();
                                  toggleExpand(child.key);
                                }}
                                role="button"
                                tabIndex={0}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    toggleExpand(child.key);
                                  }
                                }}
                              >
                                <span className="sidebar-submenu-parent-icon">
                                  {child.icon ?? <FolderOutlined />}
                                </span>
                                <span className="sidebar-submenu-parent-label">{child.label}</span>
                                <span className={`sidebar-submenu-parent-arrow ${tier3Open ? 'expanded' : ''}`}>
                                  <DownOutlined />
                                </span>
                              </div>
                              {tier3Open
                                ? child.children.map(tier3 => {
                                    if ('children' in tier3 && tier3.children) {
                                      const tier4Open = expandedKeys.includes(tier3.key);
                                      return (
                                        <div key={tier3.key} className="sidebar-submenu-nest-wrap">
                                          <div
                                            className="sidebar-submenu-item sidebar-submenu-parent"
                                            onClick={e => {
                                              e.stopPropagation();
                                              toggleExpand(tier3.key);
                                            }}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={e => {
                                              if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                toggleExpand(tier3.key);
                                              }
                                            }}
                                          >
                                            <span className="sidebar-submenu-parent-icon">
                                              {tier3.icon ?? <FolderOutlined />}
                                            </span>
                                            <span className="sidebar-submenu-parent-label">{tier3.label}</span>
                                            <span className={`sidebar-submenu-parent-arrow ${tier4Open ? 'expanded' : ''}`}>
                                              <DownOutlined />
                                            </span>
                                          </div>
                                          {tier4Open
                                            ? tier3.children.map(t4 => (
                                                <div
                                                  key={t4.key}
                                                  className={`sidebar-submenu-item sidebar-submenu-nested ${
                                                    currentView === t4.key ? 'active' : ''
                                                  }`}
                                                  onClick={() => setCurrentView(t4.key as ViewState)}
                                                  role="button"
                                                  tabIndex={0}
                                                  onKeyDown={e => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                      e.preventDefault();
                                                      setCurrentView(t4.key as ViewState);
                                                    }
                                                  }}
                                                >
                                                  {t4.label}
                                                </div>
                                              ))
                                            : null}
                                        </div>
                                      );
                                    }
                                    return (
                                      <div
                                        key={tier3.key}
                                        className={`sidebar-submenu-item sidebar-submenu-nested ${
                                          currentView === tier3.key ? 'active' : ''
                                        }`}
                                        onClick={() => setCurrentView(tier3.key as ViewState)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setCurrentView(tier3.key as ViewState);
                                          }
                                        }}
                                      >
                                        {tier3.label}
                                      </div>
                                    );
                                  })
                                : null}
                            </div>
                          );
                        }
                        return (
                          <div
                            key={child.key}
                            className={`sidebar-submenu-item ${currentView === child.key ? 'active' : ''}`}
                            onClick={() => setCurrentView(child.key as ViewState)}
                          >
                            {child.label}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="main-content-area">
          <div className="breadcrumb-bar">
            <span className="breadcrumb-current">{getBreadcrumb(currentView)}</span>
          </div>
          <Content className="main-content with-sidebar">
            <div className="content-wrapper">{renderMain()}</div>
          </Content>
        </div>
      </div>
    </Layout>
  );
};

export default function App() {
  return (
    <AppConfigProvider>
      <Component />
    </AppConfigProvider>
  );
}
