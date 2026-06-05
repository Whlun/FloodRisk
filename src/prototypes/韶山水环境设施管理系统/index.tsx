/**
 * @name 设施管理
 * @description 从「韶山水环境一张图」拆分的设施管理独立原型：排水管网（管点/管线）、泵站管理（泵站信息/泵站统计/安全指数评估）、排口、污水处理厂（污水厂信息/运维信息/安全指数评估）、事件管理（事件列表/事件统计，公用泵站与污水厂 events Tab）、排水户（含排水许可证）；无顶部一级菜单，仅左侧导航与主内容区。
 * @mode axure
 *
 * 参考资料：
 * - /rules/development-standards.md
 * - /skills/axure-export-workflow/SKILL.md
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppConfigProvider from '../../common/AppConfigProvider';
import * as echarts from 'echarts';
import type { FormInstance } from 'antd/es/form';
import type { UploadFile } from 'antd/es/upload/interface';
import { buildPipeLineAllColumnConfigs, getPipeLineTableDefaultVisibleColumnKeys } from './pipe-line-facility-columns';
import { buildPipeNodeAllColumnConfigs, getPipeNodeTableDefaultVisibleColumnKeys } from './pipe-node-facility-columns';
import {
  getDefaultVisibleColumnKeys,
  getFacilityTableScrollX,
  PipeLineColumnManager,
  type ColumnConfig,
} from './pipe-line-table-kit';
import { pipeLineData, pipeNodeData } from './pipe-network-demo-data';

import {
  Layout,
  Card,
  Row,
  Col,
  Badge,
  Table,
  Button,
  Select,
  Input,
  Tag,
  Alert,
  Space,
  Typography,
  Divider,
  Descriptions,
  Empty,
  Spin,
  Dropdown,
  Modal,
  message,
  Form,
  Statistic,
  Checkbox,
  Tooltip,
  Upload,
  TreeSelect,
  Tabs,
} from 'antd';
import type { DescriptionsProps } from 'antd';
import {
  AppstoreOutlined,
  BarChartOutlined,
  BuildOutlined,
  CheckCircleOutlined,
  PieChartOutlined,
  SearchOutlined,
  DownloadOutlined,
  DownOutlined,
  UpOutlined,
  ArrowRightOutlined,
  DeleteOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  LeftOutlined,
  RightOutlined,
  ClockCircleOutlined,
  FireOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  DatabaseOutlined,
  GatewayOutlined,
  ExperimentOutlined,
  NodeExpandOutlined,
  LineChartOutlined,
  DotChartOutlined,
  ShoppingOutlined,
  ShoppingCartOutlined,
  HomeOutlined,
  ToolOutlined,
  AlertOutlined,
  WarningOutlined,
  FileTextOutlined,
  TeamOutlined,
  BorderOutlined,
  LineOutlined,
  ExportOutlined,
  ApartmentOutlined,
  UploadOutlined,
  PaperClipOutlined,
} from '@ant-design/icons';
import './style.css';
import '../shared/ant-table-text-no-overlap.css';
import { DetailTabsIfMultiple } from '../shared/detailTabsIfMultiple';
import {
  AddrWgs84MapPicker,
  AddrWgs84DetailMap,
  ADDR_MAP_FORM_ITEM_EXTRA,
  ADDR_MAP_INPUT_PLACEHOLDER,
} from '../shared/addrWgs84MapFormBridge';
import { RiverSourceMouthWgs84MapPicker, RiverSourceMouthWgs84DetailMap } from '../shared/riverSourceMouthWgs84Map';
import { padDescriptionsItemsForFullWidthRow } from '../shared/descriptionsPadForFullSpanItems';
import { PipeLineDetailReadonlyContent } from './pipeLineDetailReadonlyContent';
import { PipeNodeDetailReadonlyContent, pipeNodeDetailModalTitle } from './pipeNodeDetailReadonlyContent';
import {
  PumpDetailContent,
  OutletDetailContent,
  PlantDetailContent,
} from './facility-pump-outlet-plant-details';
import { buildRelatedFacilityDetailModalPack } from './facility-linked-outlet-related-detail';
import { DischargerView } from './facility-discharger-module';
import { OutletResponsiblePartyView } from './facility-outlet-responsible-view';
import { RiverOutletVerificationView } from './facility-river-outlet-verification-view';
import { OutletActionTeamGroupView } from './facility-outlet-action-team-group-view';
import { OutletIssueListView } from './facility-outlet-issue-list-view';
import { FacilityEventMgmtListShell } from './facility-event-mgmt-list-shell';
import { FacilityEventMgmtStatsShell } from './facility-event-mgmt-stats-shell';
import {
  buildInitialUnifiedFacilityEvents,
  type UnifiedFacilityEventRecord,
} from './facility-unified-event-data';
import { PumpSafetyIndexView } from './facility-pump-safety-index-view';
import { PlantSafetyIndexView } from './facility-plant-safety-index-view';
import { PlantOmListView } from './facility-plant-om-list-view';
import { OUTLET_ACTION_TEAM_GROUP_INITIAL } from './facility-outlet-action-team-group-view';
import { PlantKeyFacilitiesFormSection } from './plant-key-facilities-form';
import type { PumpArchiveDocument } from './pump-station-documents';
import { downloadPumpStationInfoExcel } from './pump-station-excel-export';
import {
  downloadFacilityListExcel,
  outletListExportFormatByKey,
  plantListExportFormatByKey,
} from './facility-list-xlsx-export';
import { downloadElementAsPdf } from '../shared/facilityStatPdfExport';
import { downloadTableFullExcel } from '../shared/facilityTableXlsxExport';
import { PumpDocumentList, PumpDocumentsEditPanel } from './pump-station-documents-ui';
import type { PlantArchiveDocument } from './plant-station-documents';
import { PlantDocumentList, PlantDocumentsEditPanel } from './plant-station-documents-ui';
import { PipeArchiveView } from './facility-pipe-archive-view';
import {
  pumpStationData,
  outletData,
  plantData,
  OUTLET_APPROVAL_REG_LABEL,
  OUTLET_DISCHARGE_MODE_LABEL,
  OUTLET_DRINKING_SOURCE_ZONE_LABEL,
  OUTLET_GATE_FORM_LABEL,
  OUTLET_INFLOW_CHANNEL_LABEL,
  OUTLET_LEVEL1_LABEL,
  OUTLET_LEVEL2_LABEL,
  formatOutletApprovalReg,
  formatOutletBasinSea,
  formatOutletDischargeMode,
  formatOutletDrinkingSourceZone,
  formatOutletGateForm,
  formatOutletInflowChannel,
  formatOutletLevel1,
  formatOutletLevel2,
  formatOutletEmissionState,
  formatOutletKeyOutfall,
  OUTLET_EMISSION_STATE_OPTIONS,
  buildLinkedOutletSelectOptions,
  buildOutletBasinSeaSelectOptions,
  formatLinkedOutletCodeDisplay,
  PLANT_OPTS_FACILITY_TYPE,
  PLANT_OPTS_TREATMENT_LEVEL,
  PLANT_OPTS_TREATMENT_METHOD,
  PLANT_OPTS_SLUDGE_DISPOSAL,
  PLANT_OPTS_DATA_SOURCE,
  plantLabelFromOptions,
  PUST_TYPE_OPTIONS,
  type PumpStationRecord,
  type PlantRecord,
  pustAdmDepLabel,
  pustEngGradLabel,
  pustEngScalLabel,
  pustEngStatLabel,
  pustMainBuildGradLabel,
  pustTypeLabel,
  formatPumpBasCodeDisplay,
  createDefaultPlantKeyFacilities,
  normalizePlantKeyFacilities,
} from './facility-points-data';
import {
  ADM_DEP_OPTIONS,
  ENG_GRAD_OPTIONS,
  ENG_SCAL_OPTIONS,
  ENG_STAT_OPTIONS,
  MAIN_BUILD_GRAD_OPTIONS,
  watershedInitial,
} from '../韶山水环境系统管理/config-center-data';
import { SHAOSHAN_SUB_REGION_OPTIONS } from '../应急协同/riskIdentification';
import {
  buildReceiveWaterBodySelectOptions,
  formatReceiveWaterObjectIdDisplay,
  getShaoshanAddvcdLabel,
  SHAOSHAN_ADMIN_TREE_TO_VILLAGE,
  SHAOSHAN_ADDVCD_OPTIONS,
} from '../生态整治/riverChiefDb4401';
import { RIVER_VERIFY_CHECKBOX_周边环境 } from './facility-river-outlet-verification-data';
import {
  normalizeResponsiblePartyOutletCodes,
  outletResponsiblePartyInitial,
  type OutletResponsiblePartyRecord,
} from './facility-outlet-responsible-data';

/** 受纳水体：河湖长制河流（涌）+ 湖泊主数据，与排口表单下拉同源 */
const RECEIVE_WATER_BODY_SELECT_OPTIONS = buildReceiveWaterBodySelectOptions();

/** 关联排口：设施管理排口台账编码下拉 */
const LINKED_OUTLET_SELECT_OPTIONS = buildLinkedOutletSelectOptions();

/** 泵站「所在流域代码」：与系统管理 · 流域信息 `watershedInitial` 同源；台账既有但不在示例列表中的代码补一条选项，避免编辑态无标签 */
function buildPumpBasCodeSelectOptions(): { value: string; label: string }[] {
  const map = new Map<string, string>();
  for (const r of watershedInitial) {
    map.set(r.basCode, `${r.basCode} ${r.basName}`);
  }
  for (const p of pumpStationData) {
    const c = typeof p.basCode === 'string' ? p.basCode.trim() : '';
    if (c && !map.has(c)) {
      map.set(c, `${c}（台账既有，未在示例流域列表）`);
    }
  }
  return [...map.entries()].map(([value, label]) => ({ value, label }));
}
const PUMP_BASCODE_SELECT_OPTIONS = buildPumpBasCodeSelectOptions();

/** 排口表 A.1：码表转下拉选项（标签为「码 + 中文」，无英文字段名） */
function outletDictToSelectOptions(m: Record<string, string>) {
  return Object.entries(m).map(([value, label]) => ({ value, label: `${value} ${label}` }));
}
const OUTLET_LEVEL1_SELECT_OPTIONS = outletDictToSelectOptions(OUTLET_LEVEL1_LABEL);
const OUTLET_LEVEL2_SELECT_OPTIONS = outletDictToSelectOptions(OUTLET_LEVEL2_LABEL);
const OUTLET_APPROVAL_SELECT_OPTIONS = outletDictToSelectOptions(OUTLET_APPROVAL_REG_LABEL);
/** 排口「所在流域海域」：与系统管理流域台账同源 */
const OUTLET_BASIN_SEA_SELECT_OPTIONS = buildOutletBasinSeaSelectOptions();
const OUTLET_DRINKING_ZONE_SELECT_OPTIONS = outletDictToSelectOptions(OUTLET_DRINKING_SOURCE_ZONE_LABEL);
const OUTLET_INFLOW_SELECT_OPTIONS = outletDictToSelectOptions(OUTLET_INFLOW_CHANNEL_LABEL);
const OUTLET_DISCHARGE_MODE_SELECT_OPTIONS = outletDictToSelectOptions(OUTLET_DISCHARGE_MODE_LABEL);
const OUTLET_GATE_FORM_SELECT_OPTIONS = outletDictToSelectOptions(OUTLET_GATE_FORM_LABEL);
const OUTLET_ENV_OPTIONS = RIVER_VERIFY_CHECKBOX_周边环境.map(v => ({ value: v, label: v }));
const OUTLET_ACTION_TEAM_GROUP_OPTIONS = OUTLET_ACTION_TEAM_GROUP_INITIAL.map(r => ({
  value: r.小组编号,
  label: `${r.小组编号}（${r.组长名称}）`,
}));
/** 重点排口字典：0—否，1—是 */
const OUTLET_KEY_OUTFALL_OPTIONS = [
  { value: 0, label: '0—否' },
  { value: 1, label: '1—是' },
];

type ViewState =
  | 'facilities-pipe-node'
  | 'facilities-pipe-line'
  | 'facilities-pipe-archive'
  | 'facilities-pump-info'
  | 'facilities-pump-stat'
  | 'facilities-pump-event-list'
  | 'facilities-pump-event-stats'
  | 'facilities-pump-safety-index'
  | 'facilities-outlet-info'
  | 'facilities-outlet-river-check-list'
  | 'facilities-outlet-issue-list'
  | 'facilities-outlet-responsible'
  | 'facilities-outlet-action-team-group'
  | 'facilities-plant-info'
  | 'facilities-plant-om-list'
  | 'facilities-plant-event-list'
  | 'facilities-plant-event-stats'
  | 'facilities-plant-safety-index'
  | 'facilities-event-list'
  | 'facilities-event-stats'
  | 'facilities-discharger';

// Ant Design 组件解构
const { Content } = Layout;
const { Text, Title } = Typography;
const { Search } = Input;
const { TabPane } = Tabs;
/** 新增/编辑类弹窗：与生态整治项目管理一致，仅内容区上下滚动；横向不溢出（避免 Row gutter 负边距出现横向滚动条） */
const formModalStyles = {
  body: {
    maxHeight: 'calc(100vh - 240px)',
    overflowY: 'auto' as const,
    overflowX: 'hidden' as const,
    minWidth: 0,
  },
};

/** 列表「详情」只读弹窗：与生态整治大型只读详情一致，内容区可滚动区域略增高 */
const detailModalStyles = {
  ...formModalStyles,
  body: { ...formModalStyles.body, maxHeight: 'calc(100vh - 160px)', overflowY: 'hidden' as const },
};

// ==================== 菜单配置（仅设施管理：左侧纵向，无顶部一级菜单） ====================

interface SidebarMenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  children?: SidebarMenuItem[];
}

/** 设施管理侧边栏（与原一张图「设施管理」子菜单一致） */
const facilitySidebarMenus: SidebarMenuItem[] = [
  {
    key: 'facilities-pipe',
    label: '排水管网',
    icon: <BuildOutlined />,
    children: [
      { key: 'facilities-pipe-node', label: '排水管点' },
      { key: 'facilities-pipe-line', label: '排水管线' },
      { key: 'facilities-pipe-archive', label: '管线档案信息' },
    ]
  },
  {
    key: 'facilities-pump',
    label: '泵站管理',
    icon: <BuildOutlined />,
    children: [
      { key: 'facilities-pump-info', label: '泵站信息' },
      { key: 'facilities-pump-stat', label: '泵站统计' },
      { key: 'facilities-pump-safety-index', label: '安全指数评估' },
    ]
  },
  {
    key: 'facilities-outlet-mgmt',
    label: '排口管理',
    icon: <BuildOutlined />,
    children: [
      { key: 'facilities-outlet-info', label: '入河排口核查列表' },
      { key: 'facilities-outlet-issue-list', label: '问题列表' },
      { key: 'facilities-outlet-responsible', label: '责任主体信息' },
      { key: 'facilities-outlet-action-team-group', label: '排口核查行动小组库' },
    ],
  },
  {
    key: 'facilities-plant-mgmt',
    label: '污水厂管理',
    icon: <BuildOutlined />,
    children: [
      { key: 'facilities-plant-info', label: '污水厂信息' },
      { key: 'facilities-plant-om-list', label: '运维信息' },
      { key: 'facilities-plant-safety-index', label: '安全指数评估' },
    ],
  },
  {
    key: 'facilities-event-mgmt',
    label: '事件管理',
    icon: <AlertOutlined />,
    children: [
      { key: 'facilities-event-list', label: '事件列表' },
      { key: 'facilities-event-stats', label: '事件统计' },
    ],
  },
  { key: 'facilities-discharger', label: '排水户', icon: <BuildOutlined /> },
];

// ==================== 模拟数据 ====================


// 应急事件数据

// ==================== 工具函数 ====================

// 生成新的标识码（模拟）
const generateId = (prefix: string) => {
  const date = new Date();
  const timestamp = date.getFullYear().toString() +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  return `${prefix}${timestamp}${random}`;
};

/** 入河入海排污口编码（演示用十六位，与字典表字符型长度一致） */
const generateOutletLedgerCode = () => {
  const suffix = String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
  return `AH430382${suffix}`;
};

// 获取当前日期字符串
const getCurrentDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// ==================== 辅助组件 ====================


const StatusTag = ({ status }: { status: string }) => {
  const config: Record<string, { color: string; text: string }> = {
    '1': { color: 'success', text: '正常' },
    '2': { color: 'warning', text: '检修' },
    '3': { color: 'error', text: '故障' },
    '4': { color: 'default', text: '在建' },
    'normal': { color: 'success', text: '正常' },
    'warning': { color: 'warning', text: '预警' },
    'error': { color: 'error', text: '超标' },
    '达标': { color: 'success', text: '达标' },
    '超标': { color: 'error', text: '超标' }
  };
  const cfg = config[status] || { color: 'default', text: status };
  return <Badge status={cfg.color as any} text={cfg.text} />;
};

/** 表 A.1 审批登记备案情况码（01—04） */
const OutletApprovalRegBadge = ({ code }: { code: string | number | undefined }) => {
  const text = formatOutletApprovalReg(code);
  const k = String(code ?? '').trim();
  let badgeStatus: 'success' | 'processing' | 'default' | 'error' | 'warning' = 'default';
  if (k === '01') badgeStatus = 'success';
  else if (k === '02' || k === '03') badgeStatus = 'processing';
  else if (k === '04') badgeStatus = 'warning';
  return <Badge status={badgeStatus} text={text} />;
};

// 获取管点类型的显示名称
const getNodeTypeName = (type: string) => {
  const typeMap: Record<string, string> = {
    '1': '检查井',
    '2': '雨水口',
    '3': '交汇井',
    '4': '阀门井',
    '5': '溢流井'
  };
  return typeMap[type] || '未知';
};

/** 排水管点台账选项：管线「起点/终点管点」下拉与搜索（与 pipeNodeData 同源） */
const pipeNodeIdSelectOptions = pipeNodeData.map((n) => ({
  value: n.nodeId,
  label: `${n.nodeId}（${getNodeTypeName(n.nodeType)} · ${n.roadName || '—'}）`,
}));

/** 管点标识码 Select：可下拉选或输入关键字筛选台账中的编号 */
const PipeNodeIdSelect: React.FC<{ placeholder?: string }> = ({ placeholder }) => (
  <Select
    showSearch
    allowClear
    placeholder={placeholder ?? '搜索编号或下拉选择'}
    options={pipeNodeIdSelectOptions}
    optionFilterProp="label"
    filterOption={(input, option) => {
      const q = (input || '').trim().toLowerCase();
      if (!q) return true;
      const v = String((option as { value?: string })?.value ?? '').toLowerCase();
      const lab = String((option as { label?: React.ReactNode })?.label ?? '').toLowerCase();
      return v.includes(q) || lab.includes(q);
    }}
    notFoundContent="无匹配管点，请核对编号或先在「排水管点」中维护"
  />
);

// 获取管点类型的标签颜色
const getNodeTypeColor = (type: string) => {
  const colorMap: Record<string, string> = {
    '1': 'blue',
    '2': 'green',
    '3': 'orange',
    '4': 'purple',
    '5': 'red'
  };
  return colorMap[type] || 'default';
};

// ==================== 湘潭风格详情组件 ====================

/** 详情字段项：span 为原 4 列栅格语义；展示时换算为生态整治「项目详情」同款 column=2（1=半行，≥2=整行通栏） */
interface DetailTableItem {
  label: string;
  value: React.ReactNode;
  span?: 1 | 2 | 3 | 4;
}

interface DetailCardProps {
  title: string;
  items: DetailTableItem[];
}

/** 空值与生态整治详情一致：灰色「—」 */
function renderDetailFieldValue(value: React.ReactNode): React.ReactNode {
  if (value == null || value === '') {
    return <span className="detail-value-empty">—</span>;
  }
  if (typeof value === 'string' && (value.trim() === '' || value === '-' || value === '—')) {
    return <span className="detail-value-empty">—</span>;
  }
  return value;
}

function mapDetailItemSpan(span: number | undefined): number {
  const s = span ?? 1;
  return s >= 2 ? 2 : 1;
}

/** 分组 + bordered Descriptions column=2，对齐生态整治「项目详情」基本信息 Tab */
const DetailCard: React.FC<DetailCardProps> = ({ title, items }) => {
  const descItemsRaw: NonNullable<DescriptionsProps['items']> = items.map((item, idx) => ({
    key: `${item.label}-${idx}`,
    label: item.label,
    children: renderDetailFieldValue(item.value),
    span: mapDetailItemSpan(item.span),
  }));
  const descItems = padDescriptionsItemsForFullWidthRow(descItemsRaw, 2);

  return (
    <div className="detail-section">
      <div className="detail-section-title">{title}</div>
      <div className="detail-section-content">
        <Descriptions bordered column={2} size="small" items={descItems} />
      </div>
    </div>
  );
};

// 湘潭风格详情页组件（带标签页）
interface DetailTab {
  key: string;
  label: string;
  children: React.ReactNode;
}

interface XiangtanDetailViewProps {
  /** 保留参数便于调用方语义对齐，标题由外层 Modal.title 展示（与生态整治「项目详情」弹窗一致） */
  title?: string;
  subtitle?: string;
  tabs: DetailTab[];
  extra?: React.ReactNode;
  /** 多 Tab 时初始选中的标签 key（须存在于 tabs）；不传则默认第一项 */
  defaultActiveKey?: string;
}

/** 与生态整治「河湖长制 · 事务详情」一致：多 Tab 时 small Tabs + facility-detail-tabs；仅一块内容时不展示 Tab 顶栏 */
const XiangtanDetailView: React.FC<XiangtanDetailViewProps> = ({ tabs, defaultActiveKey }) => {
  const resolvedKey =
    defaultActiveKey && tabs.some((t) => t.key === defaultActiveKey) ? defaultActiveKey : tabs[0]?.key;
  return (
    <DetailTabsIfMultiple
      className="facility-detail-tabs facility-mgmt-detail-tabs"
      size="small"
      style={{ marginTop: 8 }}
      defaultActiveKey={resolvedKey}
      items={tabs}
    />
  );
};

// ==================== 排水管点详情组件（湘潭风格） ====================
const PipeNodeDetailContent = PipeNodeDetailReadonlyContent;

// 排水管点表单组件（新增/编辑共用）
const PipeNodeFormContent = ({ form, initialValues, isEdit }: { form: any; initialValues?: any; isEdit?: boolean }) => {
  const nodeType = Form.useWatch('nodeType', form);
  
  return (
    <Form form={form} layout="vertical" initialValues={initialValues}>
      <Divider titlePlacement="start">基础信息</Divider>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="管点标识码" name="nodeId" rules={[{ required: true }]}>
            <Input disabled={isEdit} placeholder="系统自动生成或手动输入" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="排水系统标识码" name="systemId" rules={[{ required: true }]}>
            <Input placeholder="如：SYS001" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="管点类型" name="nodeType" rules={[{ required: true }]}>
            <Select placeholder="选择管点类型">
              <Select.Option value="1">1-检查井</Select.Option>
              <Select.Option value="2">2-雨水口</Select.Option>
              <Select.Option value="3">3-交汇井</Select.Option>
              <Select.Option value="4">4-阀门井</Select.Option>
              <Select.Option value="5">5-溢流井</Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            label="坐标X"
            name="x"
            rules={[{ required: true }]}
            tooltip="原型演示与下方地图一致为 WGS84 经度（°），可与地图选点联动"
          >
            <Input type="number" step="0.000001" placeholder="经度（°）" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label="坐标Y"
            name="y"
            rules={[{ required: true }]}
            tooltip="原型演示与下方地图一致为 WGS84 纬度（°），可与地图选点联动"
          >
            <Input type="number" step="0.000001" placeholder="纬度（°）" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="所在道路名称" name="roadName" extra={ADDR_MAP_FORM_ITEM_EXTRA}>
            <Input placeholder="如：高新大道；可与地图逆地理联动" />
          </Form.Item>
        </Col>
      </Row>
      <Divider style={{ margin: '12px 0' }} />
      <Title level={5} style={{ marginBottom: 8 }}>
        管点位置地图
      </Title>
      <div className="facility-river-detail-map-wrap" style={{ marginBottom: 8 }}>
        <AddrWgs84MapPicker
          form={form}
          addrField="roadName"
          lngField="x"
          latField="y"
          mapAriaLabel="排水管点位置地图"
          hintAddressLabel="所在道路名称"
          lngLatValueMode="string"
        />
      </div>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="地面高程(m)" name="surfaceElev">
            <Input type="number" placeholder="单位：米" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="设施状态" name="status" rules={[{ required: true }]}>
            <Select placeholder="选择状态">
              <Select.Option value="1">1-运行</Select.Option>
              <Select.Option value="0">0-废弃</Select.Option>
              <Select.Option value="2">2-在建</Select.Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="权属单位" name="ownership" rules={[{ required: true }]}>
            <Input placeholder="如：高新区管委会" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="养护单位" name="maintainCompany" rules={[{ required: true }]}>
            <Input placeholder="如：市政养护中心" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="数据来源" name="dataSource" rules={[{ required: true }]}>
            <Input placeholder="如：竣工图" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="填报单位" name="reportUnit" rules={[{ required: true }]}>
            <Input placeholder="如：高新区管委会" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="填报日期" name="reportDate" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
        </Col>
      </Row>

      {/* 检查井扩展字段 */}
      {nodeType === '1' && (
        <>
          <Divider titlePlacement="start">检查井扩展信息</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="检查井类别" name="manholeCategory">
                <Input placeholder="分类代码" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="检查井类型" name="manholeType">
                <Select placeholder="选择类型">
                  <Select.Option value="1">1-检查井</Select.Option>
                  <Select.Option value="2">2-跌水井</Select.Option>
                  <Select.Option value="3">3-水封井</Select.Option>
                  <Select.Option value="4">4-闸阀井</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="检查井形式" name="manholeStyle">
                <Select placeholder="选择形式">
                  <Select.Option value="1">1-圆形</Select.Option>
                  <Select.Option value="2">2-矩形</Select.Option>
                  <Select.Option value="3">3-其他</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="检查井井深(m)" name="depth">
                <Input type="number" placeholder="单位：米" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="井盖材质" name="covMaterial">
                <Select placeholder="选择材质">
                  <Select.Option value="1">1-铸铁</Select.Option>
                  <Select.Option value="2">2-钢纤维混凝土</Select.Option>
                  <Select.Option value="3">3-其他</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="井盖形状" name="covShape">
                <Select placeholder="选择形状">
                  <Select.Option value="1">1-圆形</Select.Option>
                  <Select.Option value="2">2-方形</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="井盖尺寸" name="covDimen">
                <Input placeholder="如：φ700" />
              </Form.Item>
            </Col>
          </Row>
        </>
      )}

      {/* 雨水口扩展字段 */}
      {nodeType === '2' && (
        <>
          <Divider titlePlacement="start">雨水口扩展信息</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="雨水口形式" name="combType">
                <Select placeholder="选择形式">
                  <Select.Option value="1">1-平箅</Select.Option>
                  <Select.Option value="2">2-立箅</Select.Option>
                  <Select.Option value="3">3-平立箅</Select.Option>
                  <Select.Option value="4">4-联合</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="雨水口形状" name="combShape">
                <Select placeholder="选择形状">
                  <Select.Option value="1">1-圆形</Select.Option>
                  <Select.Option value="2">2-矩形</Select.Option>
                  <Select.Option value="3">3-椭圆形</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="雨水口尺寸" name="combDimen">
                <Input placeholder="尺寸说明" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="雨水箅材质" name="graMaterial">
                <Input placeholder="材质说明" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="雨水箅间距(mm)" name="graSpacing">
                <Input type="number" placeholder="单位：毫米" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="最大深度(m)" name="maxDepth">
                <Input type="number" placeholder="单位：米" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="设计能力（升每秒）" name="designSluiCapa">
                <Input type="number" placeholder="单位：升/秒" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="垃圾拦截装置" name="antiTrash">
                <Select placeholder="是否装备">
                  <Select.Option value="0">0-否</Select.Option>
                  <Select.Option value="1">1-是</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="防臭装置" name="antiOdor">
                <Select placeholder="是否装备">
                  <Select.Option value="0">0-否</Select.Option>
                  <Select.Option value="1">1-是</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </>
      )}
    </Form>
  );
};

// 排水管点管理视图
const PipeNodeView = ({
  onDetail,
}: {
  onDetail: (title: string, content: React.ReactNode, modalWidth?: number | string) => void;
}) => {
  const [data, setData] = useState(pipeNodeData);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm] = Form.useForm();
  const [addForm] = Form.useForm();
  const [nodeSearchKw, setNodeSearchKw] = useState('');
  const [nodeFilterType, setNodeFilterType] = useState<string | undefined>(undefined);
  const [nodeFilterStatus, setNodeFilterStatus] = useState<string | undefined>(undefined);

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    setIsEditMode(true);
    editForm.setFieldsValue(record);
    setEditModalVisible(true);
  };

  const allColumns: ColumnConfig[] = buildPipeNodeAllColumnConfigs({
    mode: 'facility',
    onDetail: (record) => onDetail(pipeNodeDetailModalTitle(record), <PipeNodeDetailContent record={record} />, 920),
    onEdit: (record) => handleEdit(record),
  });

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => getPipeNodeTableDefaultVisibleColumnKeys());

  const displayData = useMemo(() => {
    return data.filter(n => {
      if (nodeFilterType && n.nodeType !== nodeFilterType) return false;
      if (nodeFilterStatus != null && nodeFilterStatus !== '' && n.status !== nodeFilterStatus) return false;
      const q = nodeSearchKw.trim().toLowerCase();
      if (q && !String(n.nodeId).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, nodeSearchKw, nodeFilterType, nodeFilterStatus]);

  // 根据可见列生成实际列配置（操作列右侧固定，与 buildPipeNodeAllColumnConfigs 结果一致）
  const columns = allColumns
    .filter(col => visibleColumns.includes(col.key) || col.key === 'operation')
    .sort((a, b) => {
      if (a.key === 'operation') return 1;
      if (b.key === 'operation') return -1;
      const indexA = visibleColumns.indexOf(a.key);
      const indexB = visibleColumns.indexOf(b.key);
      return indexA - indexB;
    })
    .map(col => (col.key === 'operation' ? { ...col, fixed: 'right' as const } : col));

  const facilityTableScrollX = getFacilityTableScrollX(
    allColumns.filter(col => visibleColumns.includes(col.key) || col.key === 'operation'),
  );

  const handleDelete = (id: string) => {
    setData(data.filter(item => item.nodeId !== id));
    message.success('删除成功');
    setEditModalVisible(false);
  };

  const handleEditSave = () => {
    editForm.validateFields().then(values => {
      setData(data.map(item => item.nodeId === editingRecord.nodeId ? { ...item, ...values } : item));
      message.success('保存成功');
      setEditModalVisible(false);
    });
  };

  const handleAdd = () => {
    addForm.resetFields();
    // 设置默认值
    addForm.setFieldsValue({
      nodeId: generateId('N'),
      systemId: 'SYS001',
      status: '1',
      reportDate: getCurrentDate(),
      dataSource: '竣工图'
    });
    setAddModalVisible(true);
  };

  const handleAddSave = () => {
    addForm.validateFields().then(values => {
      const newRecord = {
        ...values,
        x: parseFloat(values.x),
        y: parseFloat(values.y),
        surfaceElev: values.surfaceElev ? parseFloat(values.surfaceElev) : undefined,
        depth: values.depth ? parseFloat(values.depth) : undefined,
        graSpacing: values.graSpacing ? parseFloat(values.graSpacing) : undefined,
        maxDepth: values.maxDepth ? parseFloat(values.maxDepth) : undefined,
        designSluiCapa: values.designSluiCapa ? parseFloat(values.designSluiCapa) : undefined,
      };
      setData([newRecord, ...data]);
      message.success('新增成功');
      setAddModalVisible(false);
    });
  };

  return (
    <div className="facility-view">
      <Card 
        title="排水管点管理" 
        extra={
          <Space wrap size={[8, 8]} align="center">
            <Button
              icon={<DownloadOutlined />}
              className="export-btn"
              onClick={() => {
                if (displayData.length === 0) {
                  message.warning('当前筛选条件下无数据可导出');
                  return;
                }
                downloadFacilityListExcel(displayData as unknown as Record<string, unknown>[], allColumns, '排水管点', '排水管点');
                message.success('已导出 Excel（全量字段）');
              }}
            >
              导出Excel
            </Button>
            <Upload
              beforeUpload={() => {
                message.success('已导入（原型示意）');
                return false;
              }}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />}>导入</Button>
            </Upload>
            <PipeLineColumnManager 
              columns={allColumns} 
              visibleColumns={visibleColumns} 
              onChange={setVisibleColumns} 
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} className="add-btn">新增</Button>
          </Space>
        }
      >
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Search
              allowClear
              placeholder="搜索管点标识码"
              value={nodeSearchKw}
              onChange={e => setNodeSearchKw(e.target.value)}
            />
          </Col>
          <Col span={4}>
            <Select
              allowClear
              placeholder="管点类型"
              style={{ width: '100%' }}
              value={nodeFilterType}
              onChange={v => setNodeFilterType(v as string | undefined)}
            >
              <Select.Option value="1">检查井</Select.Option>
              <Select.Option value="2">雨水口</Select.Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              allowClear
              placeholder="设施状态"
              style={{ width: '100%' }}
              value={nodeFilterStatus}
              onChange={v => setNodeFilterStatus(v as string | undefined)}
            >
              <Select.Option value="1">运行</Select.Option>
              <Select.Option value="0">废弃</Select.Option>
              <Select.Option value="2">在建</Select.Option>
            </Select>
          </Col>
          <Col span={4}>
            <Space>
              <Button type="primary" className="search-btn" icon={<SearchOutlined />}>
                查询
              </Button>
              <Button
                onClick={() => {
                  setNodeSearchKw('');
                  setNodeFilterType(undefined);
                  setNodeFilterStatus(undefined);
                }}
              >
                重置
              </Button>
            </Space>
          </Col>
        </Row>
        <div className="facility-table-wrap">
          <Table
            dataSource={displayData}
            columns={columns}
            rowKey="nodeId"
            scroll={{ x: facilityTableScrollX }}
            pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }}
          />
        </div>
      </Card>

      {/* 新增弹窗 */}
      <Modal
        styles={formModalStyles}
        title="新增管点"
        open={addModalVisible}
        onOk={handleAddSave}
        onCancel={() => setAddModalVisible(false)}
        width={920}
        footer={
          <Space>
            <Button onClick={() => setAddModalVisible(false)}>取消</Button>
            <Button type="primary" onClick={handleAddSave}>保存</Button>
          </Space>
        }
      >
        <PipeNodeFormContent form={addForm} />
      </Modal>

      {/* 编辑/详情弹窗 */}
      <Modal
        styles={formModalStyles}
        title={isEditMode ? `编辑${editingRecord ? getNodeTypeName(editingRecord.nodeType) : ''} - ${editingRecord?.nodeId}` : `${editingRecord ? getNodeTypeName(editingRecord.nodeType) : ''}详情 - ${editingRecord?.nodeId}`}
        open={editModalVisible}
        onOk={isEditMode ? handleEditSave : () => setEditModalVisible(false)}
        onCancel={() => setEditModalVisible(false)}
        width={920}
        footer={
          isEditMode ? (
            <Space>
              <Button danger onClick={() => handleDelete(editingRecord?.nodeId)}>删除</Button>
              <Button onClick={() => setEditModalVisible(false)}>取消</Button>
              <Button type="primary" onClick={handleEditSave}>保存</Button>
            </Space>
          ) : (
            <Space>
              <Button type="primary" onClick={() => setIsEditMode(true)}>进入编辑</Button>
            </Space>
          )
        }
      >
        {editingRecord && (
          isEditMode ? (
            <PipeNodeFormContent form={editForm} initialValues={editingRecord} isEdit />
          ) : (
            <PipeNodeDetailContent record={editingRecord} />
          )
        )}
      </Modal>
    </div>
  );
};

/** 排水管线表单：起点/终点管点与台账联动，双点只读示意（与生态整治责任段「起点与讫点位置地图」同源） */
const PipeLineEndPointsMapPreview: React.FC<{ form: FormInstance }> = ({ form }) => {
  const fromId = Form.useWatch('fromNodeId', form);
  const toId = Form.useWatch('toNodeId', form);
  const lineId = Form.useWatch('lineId', form);
  const fromNode = fromId ? pipeNodeData.find(n => n.nodeId === fromId) : undefined;
  const toNode = toId ? pipeNodeData.find(n => n.nodeId === toId) : undefined;
  if (!fromNode || !toNode) {
    return (
      <Alert
        type="info"
        showIcon
        message="请选择起点与终点管点后展示两端位置地图；管点坐标请在「排水管点」台账中维护。"
      />
    );
  }
  const title =
    typeof lineId === 'string' && lineId.trim().length > 0 ? lineId : `${String(fromId)}—${String(toId)}`;
  return (
    <div className="facility-river-detail-map-wrap" style={{ marginBottom: 8 }}>
      <RiverSourceMouthWgs84DetailMap
        title={title}
        sourLng={fromNode.x}
        sourLat={fromNode.y}
        mouLng={toNode.x}
        mouLat={toNode.y}
        mapAriaLabel="排水管线起点与终点位置地图"
        firstMarkerShortLabel="起点"
        secondMarkerShortLabel="终点"
      />
    </div>
  );
};

const PipeLineDetailContent = PipeLineDetailReadonlyContent;

// 排水管线表单（新增/编辑共用）
const PipeLineFormContent = ({
  form,
  initialValues,
  isEdit,
}: {
  form: FormInstance;
  initialValues?: any;
  isEdit?: boolean;
}) => (
  <Form form={form} layout="vertical" initialValues={initialValues}>
    <Divider titlePlacement="start">基础信息</Divider>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="管线标识码" name="lineId" rules={[{ required: true }]}>
          <Input disabled={isEdit} placeholder="系统自动生成" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="排水系统标识码" name="systemId" rules={[{ required: true }]}>
          <Input placeholder="如：SYS001" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="管线类别" name="lineCategory" rules={[{ required: true }]}>
          <Select placeholder="选择类别">
            <Select.Option value="1">雨水</Select.Option>
            <Select.Option value="2">污水</Select.Option>
            <Select.Option value="3">合流</Select.Option>
            <Select.Option value="4">其他</Select.Option>
          </Select>
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="管线类型" name="lineType" rules={[{ required: true }]}>
          <Select placeholder="选择类型">
            <Select.Option value="1">主管</Select.Option>
            <Select.Option value="2">支管</Select.Option>
            <Select.Option value="3">接户管</Select.Option>
          </Select>
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item
          label="起点管点标识码"
          name="fromNodeId"
          dependencies={['toNodeId']}
          rules={[
            { required: true, message: '请选择或搜索起点管点' },
            ({ getFieldValue }) => ({
              validator(_: unknown, value: string) {
                const to = getFieldValue('toNodeId');
                if (value && to && value === to) {
                  return Promise.reject(new Error('起点与终点不能为同一管点'));
                }
                return Promise.resolve();
              },
            }),
          ]}
        >
          <PipeNodeIdSelect placeholder="搜索编号或下拉选择起点" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item
          label="终点管点标识码"
          name="toNodeId"
          dependencies={['fromNodeId']}
          rules={[
            { required: true, message: '请选择或搜索终点管点' },
            ({ getFieldValue }) => ({
              validator(_: unknown, value: string) {
                const from = getFieldValue('fromNodeId');
                if (value && from && value === from) {
                  return Promise.reject(new Error('起点与终点不能为同一管点'));
                }
                return Promise.resolve();
              },
            }),
          ]}
        >
          <PipeNodeIdSelect placeholder="搜索编号或下拉选择终点" />
        </Form.Item>
      </Col>
    </Row>
    <Divider style={{ margin: '12px 0' }} />
    <Title level={5} style={{ marginBottom: 8 }}>
      起点与终点位置地图
    </Title>
    <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
      根据所选管点台账坐标展示双点示意（与生态整治责任段同源）；调整坐标请在「排水管点」中维护。
    </Text>
    <PipeLineEndPointsMapPreview form={form} />
    <Divider titlePlacement="start">管线参数</Divider>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="材质" name="material" rules={[{ required: true }]}>
          <Input placeholder="如：HDPE" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="管径(mm)" name="diameter" rules={[{ required: true }]}>
          <Input type="number" placeholder="单位：毫米" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="管长(m)" name="lineLength" rules={[{ required: true }]}>
          <Input type="number" placeholder="单位：米" />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="起点埋深(m)" name="startDepth">
          <Input type="number" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="终点埋深(m)" name="endDepth">
          <Input type="number" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="断面形式" name="section">
          <Select placeholder="断面形式">
            <Select.Option value="1">圆形</Select.Option>
            <Select.Option value="2">矩形</Select.Option>
            <Select.Option value="3">梯形</Select.Option>
          </Select>
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="断面尺寸" name="sectionSize">
          <Input placeholder="如：DN800" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="敷设方式" name="lineMode">
          <Select placeholder="敷设方式">
            <Select.Option value="1">直埋</Select.Option>
            <Select.Option value="2">顶管</Select.Option>
            <Select.Option value="3">盾构</Select.Option>
          </Select>
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="起点高程(m)" name="startElev">
          <Input type="number" />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="终点高程(m)" name="endElev">
          <Input type="number" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="敷设日期" name="buildDate">
          <Input type="date" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="使用年限(年)" name="useLife">
          <Input type="number" />
        </Form.Item>
      </Col>
    </Row>
    <Divider titlePlacement="start">管理信息</Divider>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="管线状态" name="status" rules={[{ required: true }]}>
          <Select placeholder="状态">
            <Select.Option value="1">正常</Select.Option>
            <Select.Option value="2">废弃</Select.Option>
            <Select.Option value="3">检修</Select.Option>
          </Select>
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="权属单位" name="ownership" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="养护单位" name="maintainCompany">
          <Input />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="数据来源" name="dataSource" rules={[{ required: true }]}>
          <Input placeholder="如：竣工图" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="记录建立日期" name="createTime">
          <Input type="date" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="最后修改日期" name="updateTime">
          <Input type="date" />
        </Form.Item>
      </Col>
    </Row>
  </Form>
);

// 泵站表单（新增/编辑共用；SL/T 809—2021 表 7.13 ATT_PUST_BASE / sl_att_pust_base，界面标签均为中文）
const PumpFormContent = ({ form, initialValues, isEdit }: { form: any; initialValues?: any; isEdit?: boolean }) => (
  <Form form={form} layout="vertical" initialValues={initialValues}>
    <Divider titlePlacement="start">标识与位置</Divider>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="台账标识" name="id" rules={[{ required: true }]}>
          <Input disabled={isEdit} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="泵站代码" name="pustCode" rules={[{ required: true, message: '请填写泵站代码' }]}>
          <Input placeholder="水利对象实例代码（演示）" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="所在流域代码" name="basCode" tooltip="与「系统管理 · 流域信息」台账同源，可选">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="选择流域代码"
            options={PUMP_BASCODE_SELECT_OPTIONS}
          />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="泵站名称" name="pustName" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="所属区划" name="region" rules={[{ required: true, message: '请选择所属区划' }]}>
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="韶山市下辖乡镇（街道）"
            options={[...SHAOSHAN_SUB_REGION_OPTIONS].map((x) => ({ value: x, label: x }))}
          />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16} className="facility-form-coord-row">
      <Col xs={24} sm={12}>
        <Form.Item label="经度（度）" name="x" rules={[{ required: true }]} tooltip="可与地图选点同步">
          <Input type="number" step="0.000001" placeholder="地图选点后自动回填" />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item label="纬度（度）" name="y" rules={[{ required: true }]} tooltip="可与地图选点同步">
          <Input type="number" step="0.000001" placeholder="地图选点后自动回填" />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={24}>
        <Form.Item
          label="泵站所在位置"
          name="pustLoc"
          rules={[{ required: true, message: '请填写泵站所在位置' }]}
          extra={ADDR_MAP_FORM_ITEM_EXTRA}
        >
          <Input placeholder={`${ADDR_MAP_INPUT_PLACEHOLDER}（省市区县乡镇 + 道路或门牌）`} />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={24}>
        <Form.Item label="设施位置地图" colon={false}>
          <AddrWgs84MapPicker
            form={form}
            addrField="pustLoc"
            lngField="x"
            latField="y"
            mapAriaLabel="泵站设施位置地图"
            hintAddressLabel="泵站所在位置"
            lngLatValueMode="string"
          />
        </Form.Item>
      </Col>
    </Row>
    <Divider titlePlacement="start">工程特征</Divider>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="工程等别" name="engGrad">
          <Select allowClear placeholder="工程等别" options={ENG_GRAD_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="工程规模" name="engScal">
          <Select allowClear placeholder="工程规模" options={ENG_SCAL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="主要建筑物级别" name="mainBuildGrad">
          <Select
            allowClear
            placeholder="主要建筑物级别"
            options={MAIN_BUILD_GRAD_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="设计扬程（米）" name="desHead">
          <Input type="number" step="0.01" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="设计流量（立方米每秒）" name="desFlow">
          <Input type="number" step="0.01" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="装机容量（千瓦）" name="instCap">
          <Input type="number" step="0.1" />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="水泵台数" name="pumpNum" rules={[{ required: true }]}>
          <Input type="number" min={0} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="泵站类型" name="pustType" rules={[{ required: true, message: '请选择泵站类型' }]}>
          <Select placeholder="泵站类型" options={PUST_TYPE_OPTIONS.map((o) => ({ value: o.value, label: `${o.value} ${o.label}` }))} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="归口管理部门" name="admDep">
          <Select allowClear placeholder="归口管理部门" options={ADM_DEP_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="工程建设情况" name="engStat" rules={[{ required: true }]}>
          <Select placeholder="建设情况" options={ENG_STAT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="开工时间" name="startDate">
          <Input type="date" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="建成时间" name="compDate">
          <Input type="date" />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={24}>
        <Form.Item label="备注" name="note">
          <Input.TextArea rows={2} placeholder="选填" />
        </Form.Item>
      </Col>
    </Row>
  </Form>
);

// 排口表单（新增/编辑共用；HJ 1314—2023 表 A.1，与行业源数据字典表「生态（ST）」字段名一致）
const OutletFormContent = ({
  form,
  initialValues,
  isEdit,
  responsiblePartyOptions,
}: {
  form: any;
  initialValues?: any;
  isEdit?: boolean;
  responsiblePartyOptions: { value: string; label: string }[];
}) => (
  <Form form={form} layout="vertical" initialValues={initialValues}>
    <Divider titlePlacement="start">基础信息—概况</Divider>
    <Row gutter={16}>
      <Col xs={24} sm={12}>
        <Form.Item label="入河入海排污口名称" name="入河入海排污口名称" rules={[{ required: true }]} tooltip="最长以字典表为准，演示 30 字内">
          <Input maxLength={30} />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item label="入河入海排污口编码" name="入河入海排污口编码" rules={[{ required: true }]}>
          <Input disabled={isEdit} maxLength={16} placeholder="十六位编码（演示）" />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="入河入海排污口一级分类" name="入河入海排污口一级分类" rules={[{ required: true }]}>
          <Select placeholder="请选择" options={OUTLET_LEVEL1_SELECT_OPTIONS} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="入河入海排污口二级分类" name="入河入海排污口二级分类" rules={[{ required: true }]}>
          <Select showSearch optionFilterProp="label" placeholder="请选择" options={OUTLET_LEVEL2_SELECT_OPTIONS} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="审批登记备案情况" name="审批登记备案情况" rules={[{ required: true }]}>
          <Select placeholder="请选择" options={OUTLET_APPROVAL_SELECT_OPTIONS} />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="行政区划代码" name="行政区划代码" rules={[{ required: true }]} tooltip="按 GB／T 2260、GB／T 10114；保存时自动带出所在行政区域">
          <TreeSelect
            showSearch
            allowClear
            treeDefaultExpandAll
            treeNodeFilterProp="title"
            placeholder="选择到村/社区级区划代码"
            treeData={SHAOSHAN_ADMIN_TREE_TO_VILLAGE}
            dropdownStyle={{ maxHeight: 360, overflow: 'auto' }}
          />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="重点排口" name="重点排口" tooltip="0—否，1—是">
          <Select allowClear placeholder="请选择" options={OUTLET_KEY_OUTFALL_OPTIONS} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="排放状态" name="排放状态" rules={[{ required: true }]} tooltip="运行期排放监管状态（演示扩展）">
          <Select allowClear placeholder="请选择" options={[...OUTLET_EMISSION_STATE_OPTIONS]} />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="责任主体" name="责任主体内码" tooltip="与「责任主体信息」台账联动；单个排口仅允许一个责任主体">
          <Select allowClear showSearch optionFilterProp="label" placeholder="请选择责任主体" options={responsiblePartyOptions} />
        </Form.Item>
      </Col>
    </Row>

    <Divider titlePlacement="start">基础信息—受纳水体</Divider>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="排污水系" name="排污水系" rules={[{ required: true }]}>
          <Input maxLength={20} placeholder="水体所属水系" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="受纳水体" name="受纳水体" rules={[{ required: true, message: '请选择或填写受纳水体' }]}>
          <Select
            showSearch
            allowClear
            optionFilterProp="label"
            placeholder="河湖长制主数据或手填"
            options={RECEIVE_WATER_BODY_SELECT_OPTIONS.map(o => ({
              value: String(o.label ?? o.value),
              label: String(o.label ?? o.value),
            }))}
          />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item
          label="所在流域海域"
          name="所在流域海域"
          rules={[{ required: true }]}
          tooltip="与「系统管理 · 流域信息」台账同源（流域代码 basCode）"
        >
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="选择流域单元"
            options={OUTLET_BASIN_SEA_SELECT_OPTIONS}
          />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}><Form.Item label="排入海湾名称" name="排入海湾名称"><Input maxLength={20} /></Form.Item></Col>
      <Col span={8}><Form.Item label="控制单元" name="控制单元"><Input maxLength={50} /></Form.Item></Col>
      <Col span={8}><Form.Item label="对应国控断面" name="对应国控断面"><Input maxLength={15} /></Form.Item></Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}><Form.Item label="对应国控断面水质目标" name="对应国控断面水质目标"><Input maxLength={2} /></Form.Item></Col>
      <Col span={8}><Form.Item label="排入水功能区名称" name="排入水功能区名称"><Input maxLength={14} /></Form.Item></Col>
      <Col span={8}><Form.Item label="排入水功能区水质目标" name="排入水功能区水质目标"><Input /></Form.Item></Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}><Form.Item label="排入近岸海域环境功能区名称" name="排入近岸海域环境功能区名称"><Input /></Form.Item></Col>
      <Col span={8}><Form.Item label="排入近岸海域环境功能区水质目标" name="排入近岸海域环境功能区水质目标"><Input /></Form.Item></Col>
      <Col span={8}>
        <Form.Item label="是否位于饮用水源保护区内" name="是否位于饮用水源保护区内">
          <Select allowClear placeholder="可选" options={OUTLET_DRINKING_ZONE_SELECT_OPTIONS} />
        </Form.Item>
      </Col>
    </Row>

    <Divider titlePlacement="start">位置与排口特征</Divider>
    <Row gutter={16}>
      <Col span={24}>
        <Form.Item
          label="入河入海排污口详细地址"
          name="入河入海排污口详细地址"
          rules={[{ required: true, message: '请填写详细地址' }]}
          extra={ADDR_MAP_FORM_ITEM_EXTRA}
        >
          <Input maxLength={100} placeholder={`${ADDR_MAP_INPUT_PLACEHOLDER}`} />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16} className="facility-form-coord-row">
      <Col xs={24} sm={12}>
        <Form.Item label="入河入海排污口经度" name="入河入海排污口经度" rules={[{ required: true }]} tooltip="十进制，六位小数，2000 国家大地坐标系">
          <Input type="number" step="0.000001" />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item label="入河入海排污口纬度" name="入河入海排污口纬度" rules={[{ required: true }]} tooltip="十进制，六位小数">
          <Input type="number" step="0.000001" />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={24}>
        <Form.Item label="入河入海排污口位置地图" colon={false}>
          <AddrWgs84MapPicker
            form={form}
            addrField="入河入海排污口详细地址"
            lngField="入河入海排污口经度"
            latField="入河入海排污口纬度"
            mapAriaLabel="入河入海排污口位置地图"
            hintAddressLabel="入河入海排污口详细地址"
            lngLatValueMode="string"
          />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}><Form.Item label="来水通道" name="来水通道"><Select allowClear options={OUTLET_INFLOW_SELECT_OPTIONS} /></Form.Item></Col>
      <Col span={8}><Form.Item label="排污口材质" name="排污口材质"><Input maxLength={32} /></Form.Item></Col>
      <Col span={8}><Form.Item label="排污口流量" name="排污口流量" tooltip="立方米每小时"><Input type="number" step="0.01" min={0} /></Form.Item></Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}><Form.Item label="排污口口径" name="排污口口径"><Input maxLength={16} /></Form.Item></Col>
      <Col span={8}><Form.Item label="排放方式" name="排放方式"><Select allowClear options={OUTLET_DISCHARGE_MODE_SELECT_OPTIONS} /></Form.Item></Col>
      <Col span={8}><Form.Item label="口门形态" name="口门形态"><Select allowClear options={OUTLET_GATE_FORM_SELECT_OPTIONS} /></Form.Item></Col>
    </Row>
    <Row gutter={16}>
      <Col span={24}>
        <Form.Item
          label="周围环境"
          name="周围环境"
          normalize={v => (Array.isArray(v) ? v.join('、') : String(v ?? ''))}
          getValueProps={v => ({
            value: typeof v === 'string' ? v.split(/[、,，;；\n]/).map(x => x.trim()).filter(Boolean) : [],
          })}
        >
          <Select mode="multiple" allowClear placeholder="下拉多选" maxTagCount="responsive" options={OUTLET_ENV_OPTIONS} />
        </Form.Item>
      </Col>
    </Row>

    <Divider titlePlacement="start">基础信息—时间元数据</Divider>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="核查行动小组" name="核查行动小组">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="请选择关联行动小组"
            options={OUTLET_ACTION_TEAM_GROUP_OPTIONS}
          />
        </Form.Item>
      </Col>
      <Col span={8}><Form.Item label="创建人" name="创建人"><Input maxLength={64} /></Form.Item></Col>
      <Col span={8}><Form.Item label="创建时间" name="创建时间"><Input type="date" /></Form.Item></Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}><Form.Item label="更新时间" name="更新时间"><Input type="date" /></Form.Item></Col>
    </Row>
  </Form>
);

function ImageUploadRow(props: { form: FormInstance; field: string; label: string }) {
  const { form, field, label } = props;
  const value = (Form.useWatch(field, form) as string | undefined) ?? '';
  const fileList: UploadFile[] = value
    .split(/[;,，、\n]/)
    .map(x => x.trim())
    .filter(Boolean)
    .map((name, idx) => ({
      uid: `${String(field)}-${idx}-${name}`,
      name,
      status: 'done',
    }));
  return (
    <Form.Item label={label}>
      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        <Upload
          beforeUpload={() => false}
          multiple
          fileList={fileList}
          listType="text"
          onChange={info => {
            const names = info.fileList.map(file => file.name).filter(Boolean);
            form.setFieldValue(field, names.join(';'));
          }}
        >
          <Button icon={<UploadOutlined />}>上传图片</Button>
        </Upload>
        <Form.Item name={field} noStyle>
          <Input placeholder="可手动填写多个图片链接或文件名（用分号分隔）" maxLength={4000} />
        </Form.Item>
      </Space>
    </Form.Item>
  );
}

const OutletImageFormContent = ({ form, initialValues }: { form: any; initialValues?: any }) => (
  <Form form={form} layout="vertical" initialValues={initialValues}>
    <Divider titlePlacement="left">图片</Divider>
    <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
      支持本地上传（原型写入文件名）或直接粘贴访问链接。
    </Typography.Text>
    <Row gutter={[16, 8]}>
      <Col span={24}>
        <ImageUploadRow form={form} field="排口特征图片" label="排口特征图片" />
      </Col>
      <Col span={24}>
        <ImageUploadRow form={form} field="排水去向图片" label="排水去向图片" />
      </Col>
      <Col span={24}>
        <ImageUploadRow form={form} field="周边环境图片" label="周边环境图片" />
      </Col>
      <Col span={24}>
        <ImageUploadRow form={form} field="排污口特性照片（远景）" label="排污口特性照片（远景）" />
      </Col>
      <Col span={24}>
        <ImageUploadRow form={form} field="排口标志牌照片" label="排口标志牌照片" />
      </Col>
    </Row>
  </Form>
);

// 污水厂表单（新增/编辑共用）：表 A.0.30 基本信息、关键处理设施、污水厂资料（与项目档案项目资料同交互）
const PlantFormContent = ({
  form,
  initialValues,
  isEdit,
  activeTab,
  onTabChange,
  documents,
  onDocumentsChange,
}: {
  form: any;
  initialValues?: any;
  isEdit?: boolean;
  activeTab: string;
  onTabChange: (k: string) => void;
  documents: PlantArchiveDocument[];
  onDocumentsChange: (next: PlantArchiveDocument[]) => void;
}) => (
  <Form form={form} layout="vertical" initialValues={initialValues}>
    <Tabs
      activeKey={activeTab}
      onChange={onTabChange}
      size="small"
      className="facility-detail-tabs facility-mgmt-detail-tabs"
      style={{ marginTop: 4 }}
      items={[
        {
          key: 'basic',
          label: '基本信息',
          children: (
            <>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="污水处理厂标识码" name="id" rules={[{ required: true }]}>
          <Input disabled={isEdit} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="排水系统编码" name="systemId">
          <Input placeholder="所属排水系统编码" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="污水处理设施类型" name="facilityType">
          <Select allowClear placeholder="请选择" options={PLANT_OPTS_FACILITY_TYPE} />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16} className="facility-form-coord-row">
      <Col xs={24} sm={8}>
        <Form.Item label="所属区划" name="region" tooltip="检索与演示扩展">
          <Select
            showSearch
            optionFilterProp="label"
            allowClear
            placeholder="韶山市下辖乡镇（街道）"
            options={[...SHAOSHAN_SUB_REGION_OPTIONS].map((x) => ({ value: x, label: x }))}
          />
        </Form.Item>
      </Col>
      <Col xs={24} sm={8}>
        <Form.Item label="坐标 X" name="x" rules={[{ required: true }]} tooltip="与设施中心点一致，可与地图选点同步">
          <Input type="number" step="0.000001" />
        </Form.Item>
      </Col>
      <Col xs={24} sm={8}>
        <Form.Item label="坐标 Y" name="y" rules={[{ required: true }]} tooltip="与设施中心点一致，可与地图选点同步">
          <Input type="number" step="0.000001" />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="污水处理厂名称" name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="建成日期" name="completionDate">
          <Input type="date" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="污水处理级别" name="treatmentLevel">
          <Select allowClear placeholder="请选择" options={PLANT_OPTS_TREATMENT_LEVEL} />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={24}>
        <Form.Item
          label="污水处理厂地址"
          name="addr"
          rules={[{ required: true, message: '请填写污水处理厂地址' }]}
          extra={ADDR_MAP_FORM_ITEM_EXTRA}
        >
          <Input placeholder={ADDR_MAP_INPUT_PLACEHOLDER} />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={24}>
        <Form.Item label="地图选点" colon={false}>
          <AddrWgs84MapPicker
            form={form}
            addrField="addr"
            lngField="x"
            latField="y"
            mapAriaLabel="污水处理厂位置地图"
            hintAddressLabel="污水处理厂地址"
            lngLatValueMode="string"
          />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="年耗电量" name="annualPowerConsumption" tooltip="万千瓦时">
          <Input type="number" step="0.01" min={0} placeholder="万千瓦时" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="污水处理方法" name="treatmentMethod">
          <Select allowClear placeholder="请选择" options={PLANT_OPTS_TREATMENT_METHOD} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item
          label="受纳水体编码"
          name="receiveWaterBodyCode"
          tooltip="选项与生态整治「河湖长制」河流（涌）主数据、湖泊水体主数据同源；存 riverObjectId / lakeObjectId"
        >
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="选择关联河流或湖泊"
            options={RECEIVE_WATER_BODY_SELECT_OPTIONS}
          />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item name="linkedOutletCode" label="关联排口" tooltip="与设施管理「排口」台账入河入海排污口编码同源">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="选择入河入海排污口"
            options={LINKED_OUTLET_SELECT_OPTIONS}
          />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="污水设计处理规模" name="designCapa" rules={[{ required: true }]} tooltip="万立方米每日">
          <Input type="number" step="0.01" min={0} placeholder="万立方米每日" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="污水处理工艺" name="sewageTreatmentProcess">
          <Input placeholder="工艺描述" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="污水运行负荷率" name="sewageLoadRate" tooltip="百分比">
          <Input type="number" step="0.1" min={0} max={100} placeholder="%" />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="雨水设计处理规模" name="rainwaterDesignCapa" tooltip="万立方米每日">
          <Input type="number" step="0.01" min={0} placeholder="万立方米每日" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="雨水处理工艺" name="rainwaterTreatmentProcess">
          <Input />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="污泥设计处理规模" name="sludgeDesignCapa" tooltip="万吨每日">
          <Input type="number" step="0.001" min={0} placeholder="万吨每日" />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="污泥运行负荷率" name="sludgeLoadRate" tooltip="百分比">
          <Input type="number" step="0.1" min={0} max={100} placeholder="%" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="污泥处理工艺" name="sludgeTreatmentProcess">
          <Input />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="污泥处置方式" name="sludgeDisposalMethod">
          <Select allowClear placeholder="请选择" options={PLANT_OPTS_SLUDGE_DISPOSAL} />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="水泵台数" name="pumpCount">
          <Input type="number" min={0} step={1} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="数据来源" name="dataSource">
          <Select allowClear placeholder="请选择" options={PLANT_OPTS_DATA_SOURCE} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="数据获取日期" name="recordDate">
          <Input type="date" />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item label="填报单位" name="reportUnit">
          <Input />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="填报日期" name="reportDate">
          <Input type="date" />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="运行状态" name="status" tooltip="演示扩展">
          <Select allowClear placeholder="请选择">
            <Select.Option value="1">运行</Select.Option>
            <Select.Option value="0">停运</Select.Option>
            <Select.Option value="2">在建</Select.Option>
          </Select>
        </Form.Item>
      </Col>
      <Col span={16}>
        <Form.Item label="备注" name="remark">
          <Input maxLength={500} />
        </Form.Item>
      </Col>
    </Row>
            </>
          ),
        },
        {
          key: 'facilities',
          label: '关键处理设施',
          children: <PlantKeyFacilitiesFormSection form={form} />,
        },
        {
          key: 'plantDocuments',
          label: (
            <span>
              <PaperClipOutlined /> 污水厂资料 ({documents.length})
            </span>
          ),
          children: <PlantDocumentsEditPanel documents={documents} onChange={onDocumentsChange} />,
        },
      ]}
    />
  </Form>
);

// 排水管线管理视图
const PipeLineView = ({
  onDetail,
}: {
  onDetail: (title: string, content: React.ReactNode, modalWidth?: number | string) => void;
}) => {
  const [data, setData] = useState(() => [...pipeLineData]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm] = Form.useForm();
  const [addForm] = Form.useForm();
  const [pipeLineSearchKw, setPipeLineSearchKw] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | undefined>(undefined);
  const [filterMaterial, setFilterMaterial] = useState<string | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);

  const handleDelete = (id: string) => {
    setData(data.filter(item => item.lineId !== id));
    message.success('删除成功');
    setEditModalVisible(false);
  };

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    setIsEditMode(true);
    editForm.setFieldsValue(record);
    setEditModalVisible(true);
  };

  const allColumns = useMemo(
    () =>
      buildPipeLineAllColumnConfigs({
        mode: 'facility',
        onDetail: record =>
          onDetail(`管线详情 - ${record.lineId}`, <PipeLineDetailContent record={record} />, 920),
        onEdit: handleEdit,
      }),
    [onDetail],
  );

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => getPipeLineTableDefaultVisibleColumnKeys());

  const filteredPipeLineData = useMemo(() => {
    return data.filter(row => {
      if (filterCategory && row.lineCategory !== filterCategory) return false;
      if (filterMaterial && row.material !== filterMaterial) return false;
      if (filterStatus && row.status !== filterStatus) return false;
      const q = pipeLineSearchKw.trim().toLowerCase();
      if (q) {
        const hay = [row.lineId, row.fromNodeId, row.toNodeId, row.systemId].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, pipeLineSearchKw, filterCategory, filterMaterial, filterStatus]);

  const handleEditSave = () => {
    editForm.validateFields().then(values => {
      const num = (v: any) => (v === '' || v === undefined ? undefined : Number(v));
      const merged = {
        ...values,
        diameter: num(values.diameter),
        lineLength: num(values.lineLength),
        startDepth: num(values.startDepth),
        endDepth: num(values.endDepth),
        startElev: num(values.startElev),
        endElev: num(values.endElev),
        useLife: num(values.useLife),
      };
      setData(data.map(item => item.lineId === editingRecord.lineId ? { ...item, ...merged } : item));
      message.success('保存成功');
      setEditModalVisible(false);
    });
  };

  const handleAdd = () => {
    addForm.resetFields();
    addForm.setFieldsValue({
      lineId: generateId('L'),
      systemId: 'SYS001',
      fromNodeId: '',
      toNodeId: '',
      lineCategory: '1',
      lineType: '1',
      section: '1',
      lineMode: '1',
      status: '1',
      useLife: 50,
      buildDate: getCurrentDate(),
      dataSource: '竣工图',
      createTime: getCurrentDate(),
      updateTime: getCurrentDate(),
    });
    setAddModalVisible(true);
  };

  const handleAddSave = () => {
    addForm.validateFields().then(values => {
      const num = (v: any) => (v === '' || v === undefined ? undefined : Number(v));
      const newRecord = {
        ...values,
        diameter: num(values.diameter),
        lineLength: num(values.lineLength),
        startDepth: num(values.startDepth),
        endDepth: num(values.endDepth),
        startElev: num(values.startElev),
        endElev: num(values.endElev),
        useLife: num(values.useLife),
      };
      setData([newRecord, ...data]);
      message.success('新增成功');
      setAddModalVisible(false);
    });
  };

  // 根据可见列生成实际列配置（操作列右侧固定；渲染与 buildPipeLineAllColumnConfigs 一致）
  const columns = allColumns
    .filter(col => visibleColumns.includes(col.key) || col.key === 'operation')
    .sort((a, b) => {
      if (a.key === 'operation') return 1;
      if (b.key === 'operation') return -1;
      const indexA = visibleColumns.indexOf(a.key);
      const indexB = visibleColumns.indexOf(b.key);
      return indexA - indexB;
    })
    .map(col => (col.key === 'operation' ? { ...col, fixed: 'right' as const } : col));

  const facilityTableScrollX = getFacilityTableScrollX(
    allColumns.filter(col => visibleColumns.includes(col.key) || col.key === 'operation'),
  );

  return (
    <div className="facility-view">
      <Card
        title="排水管线管理"
        extra={
          <Space wrap size={[8, 8]} align="center">
            <Button
              icon={<DownloadOutlined />}
              className="export-btn"
              onClick={() => {
                if (filteredPipeLineData.length === 0) {
                  message.warning('当前筛选条件下无数据可导出');
                  return;
                }
                downloadFacilityListExcel(
                  filteredPipeLineData as unknown as Record<string, unknown>[],
                  allColumns,
                  '排水管线',
                  '排水管线',
                );
                message.success('已导出 Excel（全量字段）');
              }}
            >
              导出Excel
            </Button>
            <Upload
              beforeUpload={() => {
                message.success('已导入（原型示意）');
                return false;
              }}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />}>导入</Button>
            </Upload>
            <PipeLineColumnManager columns={allColumns} visibleColumns={visibleColumns} onChange={setVisibleColumns} />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} className="add-btn">新增</Button>
          </Space>
        }
      >
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Search
              allowClear
              placeholder="搜索管线标识码或管点编号"
              value={pipeLineSearchKw}
              onChange={e => setPipeLineSearchKw(e.target.value)}
              onSearch={setPipeLineSearchKw}
            />
          </Col>
          <Col span={4}>
            <Select
              allowClear
              placeholder="管线类别"
              style={{ width: '100%' }}
              value={filterCategory}
              onChange={v => setFilterCategory(v)}
            >
              <Select.Option value="1">雨水</Select.Option>
              <Select.Option value="2">污水</Select.Option>
              <Select.Option value="3">合流</Select.Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              allowClear
              placeholder="材质"
              style={{ width: '100%' }}
              value={filterMaterial}
              onChange={v => setFilterMaterial(v)}
            >
              <Select.Option value="HDPE">HDPE</Select.Option>
              <Select.Option value="钢筋混凝土">钢筋混凝土</Select.Option>
              <Select.Option value="PVC">PVC</Select.Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              allowClear
              placeholder="状态"
              style={{ width: '100%' }}
              value={filterStatus}
              onChange={v => setFilterStatus(v)}
            >
              <Select.Option value="1">正常</Select.Option>
              <Select.Option value="2">废弃</Select.Option>
              <Select.Option value="3">检修</Select.Option>
            </Select>
          </Col>
          <Col span={4}>
            <Space>
              <Button type="primary" className="search-btn" icon={<SearchOutlined />}>
                查询
              </Button>
              <Button
                onClick={() => {
                  setPipeLineSearchKw('');
                  setFilterCategory(undefined);
                  setFilterMaterial(undefined);
                  setFilterStatus(undefined);
                }}
              >
                重置
              </Button>
            </Space>
          </Col>
        </Row>
        <div className="facility-table-wrap">
          <Table
            dataSource={filteredPipeLineData}
            columns={columns}
            rowKey="lineId"
            scroll={{ x: facilityTableScrollX }}
            pagination={{ pageSize: 10 }}
          />
        </div>
      </Card>

      {/* 新增弹窗 */}
      <Modal
        styles={formModalStyles}
        title="新增管线"
        open={addModalVisible}
        onOk={handleAddSave}
        onCancel={() => setAddModalVisible(false)}
        width={920}
        footer={
          <Space>
            <Button onClick={() => setAddModalVisible(false)}>取消</Button>
            <Button type="primary" onClick={handleAddSave}>保存</Button>
          </Space>
        }
      >
        <PipeLineFormContent form={addForm} />
      </Modal>

      {/* 编辑/详情弹窗 */}
      <Modal
        styles={formModalStyles}
        title={isEditMode ? `编辑管线 - ${editingRecord?.lineId}` : `管线详情 - ${editingRecord?.lineId}`}
        open={editModalVisible}
        onOk={isEditMode ? handleEditSave : () => setEditModalVisible(false)}
        onCancel={() => setEditModalVisible(false)}
        width={920}
        footer={
          isEditMode ? (
            <Space>
              <Button danger onClick={() => handleDelete(editingRecord?.lineId)}>删除</Button>
              <Button onClick={() => setEditModalVisible(false)}>取消</Button>
              <Button type="primary" onClick={handleEditSave}>保存</Button>
            </Space>
          ) : (
            <Space>
              <Button
                type="primary"
                onClick={() => {
                  if (editingRecord) {
                    const outletCode = String(editingRecord['入河入海排污口编码'] ?? '');
                    editForm.setFieldsValue({
                      ...editingRecord,
                    });
                  }
                  setIsEditMode(true);
                }}
              >
                进入编辑
              </Button>
            </Space>
          )
        }
      >
        {editingRecord && (
          isEditMode ? (
            <PipeLineFormContent form={editForm} initialValues={editingRecord} isEdit />
          ) : (
            <PipeLineDetailContent record={editingRecord} />
          )
        )}
      </Modal>
    </div>
  );
};

/** 统计页导出 PDF：勿加 `export-btn`，避免外层宿主按类名强制走表格 Excel 导出 */
const FacilityStatPdfExportBtn = ({ onClick }: { onClick?: () => void }) => (
  <Button
    type="button"
    icon={<DownloadOutlined />}
    className="facility-stat-pdf-export-btn"
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      (onClick ?? (() => message.success('已导出（原型示意）')))();
    }}
  >
    导出PDF
  </Button>
);

/** 台账数值字段：仅统计有限数字 */
function pumpStatFiniteNumber(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** 分类项柱状图（如工程建设情况、运行态等） */
const PumpRunStatusBarChart: React.FC<{
  counts: Record<string, number>;
  categories: string[];
}> = ({ counts, categories }) => {
  const elRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!elRef.current) return;
    const chart = echarts.init(elRef.current);
    const data = categories.map(c => counts[c] ?? 0);
    chart.setOption({
      color: ['#94a3b8', '#1e5bb5', '#64748b', '#D97706', '#dc2626'],
      tooltip: { trigger: 'axis' },
      grid: { left: 48, right: 24, top: 28, bottom: 56 },
      xAxis: { type: 'category', data: categories, axisLabel: { fontSize: 11, rotate: categories.some(s => s.length > 4) ? 16 : 0 } },
      yAxis: { type: 'value', name: '台数', minInterval: 1 },
      series: [{ type: 'bar', data, barMaxWidth: 40 }],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(elRef.current);
    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [counts, categories]);
  return <div ref={elRef} className="eco-stat-echart-host" />;
};

const PumpTypeCountBarChart: React.FC<{
  rows: { name: string; n: number }[];
}> = ({ rows }) => {
  const elRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!elRef.current) return;
    const chart = echarts.init(elRef.current);
    chart.setOption({
      color: ['#1e5bb5'],
      tooltip: { trigger: 'axis' },
      grid: { left: 48, right: 24, top: 28, bottom: 64 },
      xAxis: { type: 'category', data: rows.map(r => r.name), axisLabel: { fontSize: 11, rotate: 16 } },
      yAxis: { type: 'value', name: '台数', minInterval: 1 },
      series: [{ type: 'bar', data: rows.map(r => r.n), barMaxWidth: 32 }],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(elRef.current);
    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [rows]);
  return <div ref={elRef} className="eco-stat-echart-host" />;
};

/** 横向柱状图：台账数值聚合（区划维度等） */
const PumpHorizontalValueBarChart: React.FC<{
  rows: { label: string; value: number }[];
  xAxisName: string;
  barColor?: string;
}> = ({ rows, xAxisName, barColor = '#1e5bb5' }) => {
  const elRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!elRef.current) return;
    const chart = echarts.init(elRef.current);
    chart.setOption({
      color: [barColor],
      tooltip: { trigger: 'axis' },
      grid: { left: 96, right: 40, top: 28, bottom: 32 },
      xAxis: { type: 'value', name: xAxisName },
      yAxis: { type: 'category', data: rows.map(r => r.label), axisLabel: { fontSize: 11 } },
      series: [{ type: 'bar', data: rows.map(r => r.value), barMaxWidth: 22 }],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(elRef.current);
    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [rows, xAxisName, barColor]);
  return <div ref={elRef} className="eco-stat-echart-host" />;
};

/** 与泵站台账同源的汇总统计，视觉对齐生态整治「项目汇总统计」；`rows` 与「泵站信息」列表共用主入口状态 */
const PumpStationStatView: React.FC<{ rows: PumpStationRecord[] }> = ({ rows }) => {
  const pumpStatPdfRef = useRef<HTMLDivElement | null>(null);
  const [filterType, setFilterType] = useState<string | undefined>();
  /** 韶山乡镇级区划，与 pump 表单、台账 `region` 存值一致 */
  const [filterRegion, setFilterRegion] = useState<string | undefined>();

  const sourceRows = rows;

  const filtered = useMemo(() => {
    return sourceRows.filter((row) => {
      if (filterType && String(row.pustType) !== filterType) return false;
      if (filterRegion) {
        const r = String(row.region ?? '').trim();
        if (r !== filterRegion) return false;
      }
      return true;
    });
  }, [sourceRows, filterType, filterRegion]);

  /** 工程建设情况（`engStat`）分布，码表转中文与列表一致 */
  const engStatDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of filtered) {
      const lab = pustEngStatLabel(row.engStat);
      counts[lab] = (counts[lab] ?? 0) + 1;
    }
    const categories = Object.keys(counts).sort((a, b) => a.localeCompare(b, 'zh-CN'));
    return { categories, counts };
  }, [filtered]);

  const summary = useMemo(() => {
    const n = filtered.length;
    const inOp = filtered.filter((r) => r.engStat === '1').length;
    const building = filtered.filter((r) => r.engStat === '0').length;
    let sumPumpNum = 0;
    let sumDesFlow = 0;
    for (const row of filtered) {
      sumPumpNum += Number.isFinite(row.pumpNum) ? row.pumpNum : 0;
      const df = pumpStatFiniteNumber(row.desFlow);
      if (df != null) sumDesFlow += df;
    }
    const byType: Record<string, number> = {};
    for (const r of filtered) {
      const key = pustTypeLabel(r.pustType) || '—';
      byType[key] = (byType[key] ?? 0) + 1;
    }
    const topType = Object.keys(byType).sort((a, b) => (byType[b]! - byType[a]!))[0] ?? '—';
    return { n, inOp, building, sumPumpNum, sumDesFlow, byType, topType, topTypeN: byType[topType] ?? 0 };
  }, [filtered]);

  const typeChartRows = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of PUST_TYPE_OPTIONS) m[`${o.label}`] = 0;
    for (const r of filtered) {
      m[pustTypeLabel(r.pustType) || '其他'] = (m[pustTypeLabel(r.pustType) || '其他'] ?? 0) + 1;
    }
    return PUST_TYPE_OPTIONS.map((o) => ({ name: o.label, n: m[o.label] ?? 0 })).filter((x) => x.n > 0);
  }, [filtered]);

  const byTypeTableRows = useMemo(() => {
    const keys = [...new Set(filtered.map((r) => pustTypeLabel(r.pustType)))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
    return keys.map((k, i) => {
      const sub = filtered.filter((r) => pustTypeLabel(r.pustType) === k);
      let sumPump = 0;
      let sumFlow = 0;
      let sumCap = 0;
      for (const r of sub) {
        sumPump += Number.isFinite(r.pumpNum) ? r.pumpNum : 0;
        const df = pumpStatFiniteNumber(r.desFlow);
        if (df != null) sumFlow += df;
        const ic = pumpStatFiniteNumber(r.instCap);
        if (ic != null) sumCap += ic;
      }
      return {
        key: `t-${i}`,
        t: k,
        n: sub.length,
        sumPump,
        sumFlow,
        sumCap,
      };
    });
  }, [filtered]);

  const regionAgg = useMemo(() => {
    const regs = [...new Set(filtered.map((r) => String(r.region ?? '').trim() || '未分区'))].sort();
    return regs
      .map((region) => {
        const sub = filtered.filter((r) => (String(r.region ?? '').trim() || '未分区') === region);
        let sumPump = 0;
        let sumFlow = 0;
        let sumCap = 0;
        for (const r of sub) {
          sumPump += Number.isFinite(r.pumpNum) ? r.pumpNum : 0;
          const df = pumpStatFiniteNumber(r.desFlow);
          if (df != null) sumFlow += df;
          const ic = pumpStatFiniteNumber(r.instCap);
          if (ic != null) sumCap += ic;
        }
        return { key: region, region, n: sub.length, sumPump, sumFlow, sumCap };
      })
      .filter((r) => r.n > 0);
  }, [filtered]);

  const regionChartRows = useMemo(() => {
    return [...regionAgg]
      .filter((r) => r.n > 0)
      .sort((a, b) => b.n - a.n)
      .map((r) => ({ label: r.region, value: r.n }));
  }, [regionAgg]);

  const byTypeColumns: any[] = [
    { title: '泵站类型', dataIndex: 't', key: 't' },
    { title: '座数', dataIndex: 'n', key: 'n', align: 'right' as const },
    { title: '水泵台数合计', dataIndex: 'sumPump', key: 'sumPump', align: 'right' as const },
    {
      title: '设计流量合计',
      dataIndex: 'sumFlow',
      key: 'sumFlow',
      align: 'right' as const,
      render: (v: number) => (v > 0 ? `${v.toFixed(2)} 立方米每秒` : '—'),
    },
    {
      title: '装机容量合计',
      dataIndex: 'sumCap',
      key: 'sumCap',
      align: 'right' as const,
      render: (v: number) => (v > 0 ? `${v.toFixed(0)} 千瓦` : '—'),
    },
  ];

  const handleExportPdf = async () => {
    if (!filtered.length) {
      message.warning('当前筛选条件下无内容可导出');
      return;
    }
    const el = pumpStatPdfRef.current;
    if (!el) {
      message.error('导出区域未就绪');
      return;
    }
    const hide = message.loading('正在生成 PDF…', 0);
    try {
      await downloadElementAsPdf(el, '泵站统计');
      message.success('已导出 PDF');
    } catch (err) {
      console.error(err);
      message.error('导出 PDF 失败，请稍后重试');
    } finally {
      hide();
    }
  };

  return (
    <div className="facility-view">
      <Card
        title="泵站统计"
        extra={
          <FacilityStatPdfExportBtn
            onClick={() => void handleExportPdf()}
          />
        }
      >
        <div ref={pumpStatPdfRef} className="facility-stat-pdf-capture-root">
        {/* 查询区布局对齐污水厂管理 · 事件统计：`facility-plant-event-stats-view.tsx` */}
        <Row gutter={[16, 12]} align="middle" style={{ marginBottom: 16 }}>
          <Col xs={24} sm={24} md={8} lg={6} xl={5}>
            <Select
              allowClear
              placeholder="全部泵站类型"
              style={{ width: '100%' }}
              value={filterType}
              onChange={setFilterType as any}
              options={PUST_TYPE_OPTIONS.map((o) => ({ value: o.value, label: `${o.value} ${o.label}` }))}
            />
          </Col>
          <Col xs={24} sm={24} md={8} lg={6} xl={5}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="全部区划/乡镇"
              style={{ width: '100%' }}
              value={filterRegion}
              onChange={v => setFilterRegion(v ?? undefined)}
              options={[...SHAOSHAN_SUB_REGION_OPTIONS].map((x) => ({ value: x, label: x }))}
            />
          </Col>
          <Col
            xs={24}
            sm={24}
            md={24}
            lg={12}
            xl={14}
            style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}
          >
            <Space size={8}>
              <Button
                className="search-btn"
                type="primary"
                icon={<SearchOutlined />}
                onClick={() => message.success('已按当前筛选与台账字段刷新统计')}
              >
                查询
              </Button>
              <Button
                onClick={() => {
                  setFilterType(undefined);
                  setFilterRegion(undefined);
                }}
              >
                重置
              </Button>
            </Space>
          </Col>
        </Row>

        <Row gutter={[16, 12]} className="eco-stat-metrics-row" style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" className="eco-stat-metric-card">
              <Statistic
                title="区域泵站总数（当前口径）"
                value={summary.n}
                suffix="座"
                valueStyle={{ color: '#1e5bb5' }}
                prefix={<AppstoreOutlined />}
              />
              <div className="eco-stat-metric-foot">当前筛选下台账条数</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" className="eco-stat-metric-card">
              <Statistic
                title="已建泵站"
                value={summary.inOp}
                suffix="座"
                valueStyle={{ color: '#1e5bb5' }}
                prefix={<CheckCircleOutlined />}
              />
              <div className="eco-stat-metric-foot">工程建设情况（ENG_STAT）为已建</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" className="eco-stat-metric-card">
              <Statistic
                title="在建泵站"
                value={summary.building}
                suffix="座"
                valueStyle={{ color: '#D97706' }}
                prefix={<BarChartOutlined />}
              />
              <div className="eco-stat-metric-foot">工程建设情况为在建</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" className="eco-stat-metric-card">
              <Statistic
                title="水泵总台数"
                value={summary.sumPumpNum}
                suffix="台"
                valueStyle={{ color: '#1e5bb5' }}
                prefix={<DatabaseOutlined />}
              />
              <div className="eco-stat-metric-foot">Σ 台账·水泵台数（PUMP_NUM）</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" className="eco-stat-metric-card">
              <Statistic
                title="设计流量合计"
                value={summary.sumDesFlow}
                precision={2}
                suffix="立方米每秒"
                valueStyle={{ color: '#059669' }}
                prefix={<ExperimentOutlined />}
              />
              <div className="eco-stat-metric-foot">Σ 台账·设计流量（DES_FLOW，仅统计有效数值）</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" className="eco-stat-metric-card">
              <Statistic
                title="数量最多的类型"
                value={summary.topTypeN}
                suffix="座"
                valueStyle={{ color: '#1e5bb5' }}
                prefix={<PieChartOutlined />}
              />
              <div className="eco-stat-metric-foot">{summary.topType === '—' ? '无数据' : summary.topType}</div>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} className="eco-stat-chart-row" style={{ marginBottom: 16 }}>
          <Col xs={24} lg={12}>
            <Card size="small" title="工程建设情况分布（台账 ENG_STAT）">
              {summary.n ? (
                <PumpRunStatusBarChart categories={engStatDistribution.categories} counts={engStatDistribution.counts} />
              ) : (
                <div className="eco-stat-chart-empty">
                  <Empty description="无数据" />
                </div>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card size="small" title="不同类型泵站数量（台账 PUST_TYPE）">
              {typeChartRows.length ? (
                <PumpTypeCountBarChart rows={typeChartRows} />
              ) : (
                <div className="eco-stat-chart-empty">
                  <Empty description="无类型数据" />
                </div>
              )}
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} className="eco-stat-split-row" style={{ marginBottom: 16 }}>
          <Col xs={24} lg={12}>
            <Card size="small" title="按类型汇总（水泵台数、设计流量、装机容量）">
              <div className="eco-stat-split-table-wrap">
                <Table
                  size="small"
                  pagination={false}
                  rowKey="key"
                  columns={byTypeColumns}
                  dataSource={byTypeTableRows}
                  locale={{ emptyText: '无数据' }}
                />
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card size="small" title="各所属区划泵站数量（台账 region）">
              {regionChartRows.length ? (
                <PumpHorizontalValueBarChart rows={regionChartRows} xAxisName="座" barColor="#1e5bb5" />
              ) : (
                <div className="eco-stat-chart-empty">
                  <Empty description="无区划数据" />
                </div>
              )}
            </Card>
          </Col>
        </Row>

        <Card size="small" title="各所属区划规模汇总">
          <Table
            size="small"
            rowKey="key"
            pagination={{ pageSize: 8, showTotal: (t) => `共 ${t} 处` }}
            columns={[
              { title: '区划/乡镇', dataIndex: 'region', key: 'region' },
              { title: '泵站数', dataIndex: 'n', key: 'n', align: 'right' as const },
              { title: '水泵台数合计', dataIndex: 'sumPump', key: 'sumPump', align: 'right' as const },
              {
                title: '设计流量合计',
                dataIndex: 'sumFlow',
                key: 'sumFlow',
                align: 'right' as const,
                render: (v: number) => (v > 0 ? `${v.toFixed(2)} 立方米每秒` : '—'),
              },
              {
                title: '装机容量合计',
                dataIndex: 'sumCap',
                key: 'sumCap',
                align: 'right' as const,
                render: (v: number) => (v > 0 ? `${v.toFixed(0)} 千瓦` : '—'),
              },
            ]}
            dataSource={regionAgg}
            locale={{ emptyText: '无数据' }}
          />
        </Card>

        <Divider />
        </div>
      </Card>
    </div>
  );
};

// 泵站信息台账视图（台账数据由主入口 `pumpStationRecords` 注入，与泵站统计、事件、安全指数同源）
const PumpStationView = ({
  onDetail,
  data,
  onDataChange,
}: {
  onDetail: (title: string, content: React.ReactNode, modalWidth?: number | string) => void;
  data: PumpStationRecord[];
  onDataChange: React.Dispatch<React.SetStateAction<PumpStationRecord[]>>;
}) => {
  const setData = onDataChange;
  const [pumpTableNameKw, setPumpTableNameKw] = useState('');
  const [pumpTableCodeKw, setPumpTableCodeKw] = useState('');
  const [pumpTablePustType, setPumpTablePustType] = useState<string>('');
  const [pumpTableEngStat, setPumpTableEngStat] = useState<string>('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm] = Form.useForm();
  const [addForm] = Form.useForm();
  /** 新增弹窗内「泵站资料」页暂存，保存时写入台账（与项目档案项目资料一致） */
  const [draftPumpDocuments, setDraftPumpDocuments] = useState<PumpArchiveDocument[]>([]);
  const [pumpAddTab, setPumpAddTab] = useState('basic');
  const [pumpEditTab, setPumpEditTab] = useState('basic');
  const [pumpDocListOpen, setPumpDocListOpen] = useState(false);
  const [pumpDocListRecord, setPumpDocListRecord] = useState<Record<string, unknown> | null>(null);

  const filteredPumpRows = useMemo(() => {
    const nameKw = pumpTableNameKw.trim();
    const codeKw = pumpTableCodeKw.trim();
    return data.filter((row) => {
      if (nameKw) {
        const pool = [row.pustName].map((s) => String(s ?? ''));
        if (!pool.some((s) => s.includes(nameKw))) return false;
      }
      if (codeKw) {
        const basTxt = row.basCode ? formatPumpBasCodeDisplay(row.basCode) : '';
        const pool = [row.pustCode, row.id, basTxt].map((s) => String(s ?? ''));
        if (!pool.some((s) => s.includes(codeKw))) return false;
      }
      if (pumpTablePustType && row.pustType !== pumpTablePustType) return false;
      if (pumpTableEngStat && row.engStat !== pumpTableEngStat) return false;
      return true;
    });
  }, [data, pumpTableNameKw, pumpTableCodeKw, pumpTablePustType, pumpTableEngStat]);
  const handlePumpReset = () => {
    setPumpTableNameKw('');
    setPumpTableCodeKw('');
    setPumpTablePustType('');
    setPumpTableEngStat('');
  };


  const fmtM3s = (v: unknown) => {
    if (v === '' || v == null) return '—';
    const n = Number(v);
    return Number.isFinite(n) ? `${n} 立方米每秒` : '—';
  };
  const fmtM = (v: unknown) => {
    if (v === '' || v == null) return '—';
    const n = Number(v);
    return Number.isFinite(n) ? `${n} 米` : '—';
  };
  const fmtKw = (v: unknown) => {
    if (v === '' || v == null) return '—';
    const n = Number(v);
    return Number.isFinite(n) ? `${n} 千瓦` : '—';
  };

  // 泵站表格列（SL/T 809 表 7.13；列标题均为中文）
  const allColumns: ColumnConfig[] = [
    { key: 'pustCode', title: '泵站代码', dataIndex: 'pustCode', width: 200, defaultVisible: true },
    { key: 'id', title: '台账标识', dataIndex: 'id', width: 168, defaultVisible: false },
    { key: 'pustName', title: '泵站名称', dataIndex: 'pustName', width: 180, defaultVisible: true },
    {
      key: 'region',
      title: '所属区划',
      dataIndex: 'region',
      width: 100,
      defaultVisible: true,
      render: (v: unknown) => {
        const s = String(v ?? '').trim();
        if (!s) return '—';
        return /^\d{6,12}$/.test(s) ? getShaoshanAddvcdLabel(s) : s;
      },
    },
    {
      key: 'basCode',
      title: '所在流域代码',
      dataIndex: 'basCode',
      width: 280,
      defaultVisible: false,
      render: (v: unknown) => formatPumpBasCodeDisplay(v as string | undefined),
    },
    { key: 'pustLoc', title: '泵站所在位置', dataIndex: 'pustLoc', width: 280, defaultVisible: true },
    {
      key: 'pustType',
      title: '泵站类型',
      dataIndex: 'pustType',
      width: 120,
      defaultVisible: true,
      render: (v: unknown) => pustTypeLabel(v as string),
    },
    { key: 'pumpNum', title: '水泵台数', dataIndex: 'pumpNum', width: 88, defaultVisible: true },
    { key: 'desFlow', title: '设计流量', dataIndex: 'desFlow', width: 120, defaultVisible: true, render: (v: unknown) => fmtM3s(v) },
    { key: 'desHead', title: '设计扬程', dataIndex: 'desHead', width: 100, defaultVisible: true, render: (v: unknown) => fmtM(v) },
    { key: 'instCap', title: '装机容量', dataIndex: 'instCap', width: 100, defaultVisible: true, render: (v: unknown) => fmtKw(v) },
    {
      key: 'engStat',
      title: '工程建设情况',
      dataIndex: 'engStat',
      width: 120,
      defaultVisible: true,
      render: (v: unknown) => {
        const code = String(v ?? '').trim();
        const text = pustEngStatLabel(code);
        const color = code === '1' ? 'success' : code === '0' ? 'processing' : 'default';
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      key: 'engGrad',
      title: '工程等别',
      dataIndex: 'engGrad',
      width: 100,
      defaultVisible: false,
      render: (v: unknown) => pustEngGradLabel(v as string),
    },
    {
      key: 'engScal',
      title: '工程规模',
      dataIndex: 'engScal',
      width: 100,
      defaultVisible: false,
      render: (v: unknown) => pustEngScalLabel(v as string),
    },
    {
      key: 'mainBuildGrad',
      title: '主要建筑物级别',
      dataIndex: 'mainBuildGrad',
      width: 120,
      defaultVisible: false,
      render: (v: unknown) => pustMainBuildGradLabel(v as string),
    },
    {
      key: 'admDep',
      title: '归口管理部门',
      dataIndex: 'admDep',
      width: 120,
      defaultVisible: false,
      render: (v: unknown) => pustAdmDepLabel(v as string),
    },
    { key: 'startDate', title: '开工时间', dataIndex: 'startDate', width: 120, defaultVisible: false },
    { key: 'compDate', title: '建成时间', dataIndex: 'compDate', width: 120, defaultVisible: false },
    { key: 'note', title: '备注', dataIndex: 'note', width: 160, defaultVisible: false },
    {
      key: 'pumpDocuments',
      title: '泵站资料',
      dataIndex: 'documents',
      width: 100,
      defaultVisible: true,
      render: (_: unknown, record: { documents?: PumpArchiveDocument[]; pustName?: string }) => {
        const n = Array.isArray(record.documents) ? record.documents.length : 0;
        return (
          <Badge count={n} size="small" color="#1890ff" overflowCount={99}>
            <Button
              type="link"
              className="action-btn detail"
              icon={<FileTextOutlined />}
              onClick={() => {
                setPumpDocListRecord(record as Record<string, unknown>);
                setPumpDocListOpen(true);
              }}
            >
              资料
            </Button>
          </Badge>
        );
      },
    },
    { key: 'operation', title: '操作', width: 300, defaultVisible: true },
  ];

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => getDefaultVisibleColumnKeys(allColumns));

  const parsePumpNums = (values: any) => {
    const n = (v: any) => (v === '' || v === undefined || v === null ? undefined : Number(v));
    const ni = (v: any) => {
      const x = n(v);
      return x === undefined || !Number.isFinite(x) ? undefined : Math.round(x);
    };
    const region = String(values.region ?? '').trim();
    return {
      ...values,
      region,
      id: String(values.id ?? '').trim(),
      pustCode: String(values.pustCode ?? '').trim(),
      pustName: String(values.pustName ?? '').trim(),
      pustLoc: String(values.pustLoc ?? '').trim(),
      basCode: values.basCode ? String(values.basCode).trim() : undefined,
      engGrad: values.engGrad === undefined || values.engGrad === '' ? undefined : String(values.engGrad),
      engScal: values.engScal === undefined || values.engScal === '' ? undefined : String(values.engScal),
      mainBuildGrad: values.mainBuildGrad === undefined || values.mainBuildGrad === '' ? undefined : String(values.mainBuildGrad),
      desHead: n(values.desHead),
      desFlow: n(values.desFlow),
      instCap: n(values.instCap),
      pumpNum: ni(values.pumpNum) ?? 0,
      pustType: String(values.pustType ?? '9').trim(),
      admDep: values.admDep === undefined || values.admDep === '' ? undefined : String(values.admDep),
      engStat: String(values.engStat ?? '1').trim(),
      startDate: values.startDate ? String(values.startDate).trim() : undefined,
      compDate: values.compDate ? String(values.compDate).trim() : undefined,
      note: values.note ? String(values.note).trim() : undefined,
      x: n(values.x),
      y: n(values.y),
    };
  };

  const handleDelete = (id: string) => {
    setData(data.filter(item => item.id !== id));
    message.success('删除成功');
    setEditModalVisible(false);
  };

  const handleEdit = (record: any) => {
    setPumpEditTab('basic');
    setEditingRecord(record);
    setIsEditMode(true);
    editForm.setFieldsValue(record);
    setEditModalVisible(true);
  };

  const handleEditSave = () => {
    editForm.validateFields().then(values => {
      const merged = parsePumpNums(values);
      setData(
        data.map((item) =>
          item.id === editingRecord.id
            ? { ...item, ...merged, documents: (editingRecord as { documents?: PumpArchiveDocument[] }).documents ?? (item as { documents?: PumpArchiveDocument[] }).documents ?? [] }
            : item,
        ),
      );
      message.success('保存成功');
      setEditModalVisible(false);
    });
  };

  const handleAdd = () => {
    setDraftPumpDocuments([]);
    setPumpAddTab('basic');
    addForm.resetFields();
    addForm.setFieldsValue({
      id: generateId('PS'),
      pustCode: `430382HP013${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`,
      pustName: '',
      pustLoc: '湖南省湘潭市韶山市清溪镇',
      basCode: '',
      engGrad: '5',
      engScal: '5',
      mainBuildGrad: '5',
      desHead: undefined,
      desFlow: undefined,
      instCap: undefined,
      pumpNum: 1,
      pustType: '2',
      admDep: '5',
      engStat: '1',
      startDate: '',
      compDate: getCurrentDate(),
      note: '',
      region: '清溪镇',
      x: 112.53,
      y: 27.91,
    });
    setAddModalVisible(true);
  };

  const handleAddSave = () => {
    addForm.validateFields().then(values => {
      const newRecord: PumpStationRecord = {
        ...parsePumpNums(values),
        documents: draftPumpDocuments,
      };
      setData([newRecord, ...data]);
      message.success('新增成功');
      setAddModalVisible(false);
      setDraftPumpDocuments([]);
    });
  };

  // 根据可见列生成实际列配置
  const columns = allColumns
    .filter(col => visibleColumns.includes(col.key) || col.key === 'operation')
    .sort((a, b) => {
      if (a.key === 'operation') return 1;
      if (b.key === 'operation') return -1;
      const indexA = visibleColumns.indexOf(a.key);
      const indexB = visibleColumns.indexOf(b.key);
      return indexA - indexB;
    })
    .map(col => {
      if (col.key === 'operation') {
        return {
          ...col,
          fixed: 'right' as const,
          render: (_: any, record: any) => (
            <Space size="small">
              <Button
                type="link"
                size="small"
                className="action-btn detail"
                icon={<EyeOutlined />}
                onClick={() =>
                  onDetail(`泵站详情 - ${record.pustName}`, <PumpDetailContent record={record} />, 'min(1200px, 96vw)')
                }
              >
                详情
              </Button>
              <Tooltip title="打开详情并定位到实时监测">
                <Button
                  type="link"
                  size="small"
                  className="action-btn detail"
                  icon={<LineChartOutlined />}
                  onClick={() =>
                    onDetail(
                      `泵站详情 - ${record.pustName}`,
                      <PumpDetailContent record={record} initialTabKey="monitor" />,
                      'min(1200px, 96vw)',
                    )
                  }
                >
                  实时监测
                </Button>
              </Tooltip>
              <Button type="link" size="small" className="action-btn edit" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
                编辑
              </Button>
            </Space>
          )
        };
      }
      return col;
    });

  const facilityTableScrollX = getFacilityTableScrollX(
    allColumns.filter(col => visibleColumns.includes(col.key) || col.key === 'operation'),
  );

  return (
    <div className="facility-view">
      <Card
        title="泵站信息"
        extra={
          <Space wrap size={[8, 8]} align="center">
            <Button
              icon={<DownloadOutlined />}
              className="export-btn"
              onClick={() => {
                if (filteredPumpRows.length === 0) {
                  message.warning('当前筛选条件下无数据可导出');
                  return;
                }
                downloadPumpStationInfoExcel(filteredPumpRows);
                message.success('已导出 Excel（全量台账字段；泵站资料含类型与名称明细）');
              }}
            >
              导出Excel
            </Button>
            <Upload
              beforeUpload={() => {
                message.success('已导入（原型示意）');
                return false;
              }}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />}>导入</Button>
            </Upload>
            <PipeLineColumnManager columns={allColumns} visibleColumns={visibleColumns} onChange={setVisibleColumns} />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} className="add-btn">新增</Button>
          </Space>
        }
      >
        <Row gutter={16} style={{ marginBottom: 16 }} align="bottom">
          <Col span={5}>
            <Input
              allowClear
              placeholder="泵站名称"
              value={pumpTableNameKw}
              onChange={(e) => setPumpTableNameKw(e.target.value)}
            />
          </Col>
          <Col span={5}>
            <Input
              allowClear
              placeholder="泵站代码/台账标识"
              value={pumpTableCodeKw}
              onChange={(e) => setPumpTableCodeKw(e.target.value)}
            />
          </Col>
          <Col span={4}>
            <Select
              allowClear
              placeholder="全部泵站类型"
              style={{ width: '100%' }}
              value={pumpTablePustType || undefined}
              onChange={(v) => setPumpTablePustType((v as string) ?? '')}
              options={PUST_TYPE_OPTIONS.map((o) => ({ value: o.value, label: `${o.value} ${o.label}` }))}
            />
          </Col>
          <Col span={4}>
            <Select
              allowClear
              placeholder="全部建设情况"
              style={{ width: '100%' }}
              value={pumpTableEngStat || undefined}
              onChange={(v) => setPumpTableEngStat((v as string) ?? '')}
              options={ENG_STAT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
          </Col>
          <Col span={4}>
            <Space>
              <Button type="primary" className="search-btn" icon={<SearchOutlined />}>
                查询
              </Button>
              <Button onClick={handlePumpReset}>重置</Button>
            </Space>
          </Col>
        </Row>
        <div className="facility-table-wrap">
          <Table
            dataSource={filteredPumpRows}
            columns={columns}
            rowKey="id"
            scroll={{ x: facilityTableScrollX }}
            pagination={{ pageSize: 10 }}
          />
        </div>
      </Card>

      <Modal
        styles={formModalStyles}
        title="新增泵站"
        open={addModalVisible}
        onOk={handleAddSave}
        onCancel={() => {
          setAddModalVisible(false);
          setDraftPumpDocuments([]);
          setPumpAddTab('basic');
        }}
        width={920}
        footer={
          <Space>
            <Button
              onClick={() => {
                setAddModalVisible(false);
                setDraftPumpDocuments([]);
                setPumpAddTab('basic');
              }}
            >
              取消
            </Button>
            <Button type="primary" onClick={handleAddSave}>
              保存
            </Button>
          </Space>
        }
      >
        <Tabs activeKey={pumpAddTab} onChange={setPumpAddTab} style={{ marginTop: 4 }}>
          <TabPane tab="基本信息" key="basic">
            <PumpFormContent form={addForm} />
          </TabPane>
          <TabPane
            tab={
              <span>
                <PaperClipOutlined /> 泵站资料 ({draftPumpDocuments.length})
              </span>
            }
            key="documents"
          >
            <PumpDocumentsEditPanel documents={draftPumpDocuments} onChange={setDraftPumpDocuments} />
          </TabPane>
        </Tabs>
      </Modal>

      <Modal
        styles={formModalStyles}
        title={isEditMode ? `编辑泵站 - ${editingRecord?.pustName}` : `泵站详情 - ${editingRecord?.pustName}`}
        open={editModalVisible}
        onOk={isEditMode ? handleEditSave : () => setEditModalVisible(false)}
        onCancel={() => {
          setEditModalVisible(false);
          setPumpEditTab('basic');
        }}
        width={920}
        footer={
          isEditMode ? (
            <Space>
              <Button danger onClick={() => handleDelete(editingRecord?.id)}>删除</Button>
              <Button
                onClick={() => {
                  setEditModalVisible(false);
                  setPumpEditTab('basic');
                }}
              >
                取消
              </Button>
              <Button type="primary" onClick={handleEditSave}>保存</Button>
            </Space>
          ) : (
            <Space>
              <Button
                type="primary"
                onClick={() => {
                  if (editingRecord) editForm.setFieldsValue(editingRecord);
                  setIsEditMode(true);
                }}
              >
                进入编辑
              </Button>
            </Space>
          )
        }
      >
        {editingRecord &&
          (isEditMode ? (
            <Tabs activeKey={pumpEditTab} onChange={setPumpEditTab} style={{ marginTop: 4 }}>
              <TabPane tab="基本信息" key="basic">
                <PumpFormContent form={editForm} initialValues={editingRecord} isEdit />
              </TabPane>
              <TabPane
                tab={
                  <span>
                    <PaperClipOutlined /> 泵站资料 (
                    {Array.isArray((editingRecord as { documents?: unknown }).documents) ? (editingRecord as { documents: unknown[] }).documents.length : 0}
                    )
                  </span>
                }
                key="documents"
              >
                <PumpDocumentsEditPanel
                  documents={(editingRecord as { documents?: PumpArchiveDocument[] }).documents ?? []}
                  onChange={(next) => {
                    const rid = (editingRecord as { id: string }).id;
                    setData((rows) =>
                      rows.map((item) => (item.id === rid ? { ...item, documents: next } : item)),
                    );
                    setEditingRecord((r: Record<string, unknown> | null) => (r ? { ...r, documents: next } : r));
                  }}
                />
              </TabPane>
            </Tabs>
          ) : (
            <PumpDetailContent record={editingRecord} />
          ))}
      </Modal>

      <Modal
        styles={formModalStyles}
        title={
          pumpDocListRecord
            ? `${String((pumpDocListRecord as { pustName?: string }).pustName ?? '泵站')} - 泵站资料`
            : '泵站资料'
        }
        open={pumpDocListOpen}
        onCancel={() => {
          setPumpDocListOpen(false);
          setPumpDocListRecord(null);
        }}
        footer={null}
        width={900}
      >
        {pumpDocListRecord && (
          <Card size="small" title={`泵站资料列表 (${((pumpDocListRecord as { documents?: unknown[] }).documents || []).length} 个)`}>
            <PumpDocumentList documents={((pumpDocListRecord as { documents?: PumpArchiveDocument[] }).documents || []) as PumpArchiveDocument[]} />
          </Card>
        )}
      </Modal>
    </div>
  );
};

// 排口管理视图
const OutletView = ({
  onDetail,
  renderOutletDetailModal,
  responsiblePartiesData,
  onResponsiblePartiesChange,
}: {
  onDetail: (title: string, content: React.ReactNode, modalWidth?: number | string) => void;
  /** 排口详情（含关联信息/责任主体钻取）；由主组件工厂生成，保证「返回上一层」后回调有效 */
  renderOutletDetailModal: (record: Record<string, unknown>, opts?: { initialTabKey?: string }) => React.ReactNode;
  responsiblePartiesData: OutletResponsiblePartyRecord[];
  onResponsiblePartiesChange: (next: OutletResponsiblePartyRecord[]) => void;
}) => {
  const [data, setData] = useState(outletData);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm] = Form.useForm();
  const [addForm] = Form.useForm();
  /** 新增弹窗内「排口资料」页暂存，保存时写入台账（与泵站资料一致） */
  const [draftOutletDocuments, setDraftOutletDocuments] = useState<PumpArchiveDocument[]>([]);
  const [outletAddTab, setOutletAddTab] = useState('basic');
  const [outletEditTab, setOutletEditTab] = useState('basic');
  const [outletDocListOpen, setOutletDocListOpen] = useState(false);
  const [outletDocListRecord, setOutletDocListRecord] = useState<Record<string, unknown> | null>(null);
  const [outletImageListOpen, setOutletImageListOpen] = useState(false);
  const [outletImageListRecord, setOutletImageListRecord] = useState<Record<string, unknown> | null>(null);
  const OUTLET_IMAGE_FIELDS = [
    '排口特征图片',
    '排水去向图片',
    '周边环境图片',
    '排污口特性照片（远景）',
    '排口标志牌照片',
  ] as const;
  const splitOutletImageValues = (value: unknown): string[] =>
    String(value ?? '')
      .split(/[;,，、\n]/)
      .map(v => v.trim())
      .filter(Boolean);

  /** 列表筛选：拆分字段 + 下拉组合查询（与表格列同源） */
  const [outletFilterForm] = Form.useForm<{
    region?: string;
    level1?: string;
    level2?: string;
    approval?: string;
    emission?: string;
    /** 重点排口：0—否，1—是 */
    keyOutfall?: number;
    outletName?: string;
    outletCode?: string;
  }>();
  const [outletFilterRegion, setOutletFilterRegion] = useState<string | undefined>();
  const [outletFilterLevel1, setOutletFilterLevel1] = useState<string | undefined>();
  const [outletFilterLevel2, setOutletFilterLevel2] = useState<string | undefined>();
  const [outletFilterApproval, setOutletFilterApproval] = useState<string | undefined>();
  const [outletFilterEmission, setOutletFilterEmission] = useState<string | undefined>();
  const [outletFilterKeyOutfall, setOutletFilterKeyOutfall] = useState<number | undefined>();
  const [outletFilterName, setOutletFilterName] = useState('');
  const [outletFilterCode, setOutletFilterCode] = useState('');
  const responsiblePartyOptions = useMemo(
    () =>
      responsiblePartiesData.map(item => ({
        value: item.责任主体内码,
        label: `${item.责任主体名称}（${item.责任主体内码}）`,
      })),
    [responsiblePartiesData],
  );

  const findResponsibleByOutletCode = useCallback(
    (outletCode: string) => {
      const code = String(outletCode ?? '').trim();
      if (!code) return undefined;
      return responsiblePartiesData.find(item => normalizeResponsiblePartyOutletCodes(item.关联排口编码列表).includes(code));
    },
    [responsiblePartiesData],
  );

  const applyResponsiblePartySelection = useCallback(
    (outletCodeRaw: unknown, responsibleIdRaw: unknown) => {
      const outletCode = String(outletCodeRaw ?? '').trim();
      if (!outletCode) return;
      const responsibleId = String(responsibleIdRaw ?? '').trim();
      const nextResponsibleData = responsiblePartiesData.map(item => {
        const nextCodes = normalizeResponsiblePartyOutletCodes(item.关联排口编码列表).filter(code => code !== outletCode);
        if (responsibleId && item.责任主体内码 === responsibleId) {
          return { ...item, 关联排口编码列表: [...nextCodes, outletCode] };
        }
        return { ...item, 关联排口编码列表: nextCodes };
      });
      onResponsiblePartiesChange(nextResponsibleData);
    },
    [onResponsiblePartiesChange, responsiblePartiesData],
  );

  const outletRegionOptions = useMemo(
    () =>
      Array.from(
        new Set(
          data
            .map(row => String(row['所在行政区域'] ?? '').trim())
            .filter(v => Boolean(v) && v !== '—'),
        ),
      ).map(label => ({ value: label, label })),
    [data],
  );

  const filteredOutletData = useMemo(() => {
    const nameQ = outletFilterName.trim();
    const codeQ = outletFilterCode.trim();
    return data.filter(row => {
      if (nameQ) {
        const name = String(row['入河入海排污口名称'] ?? '');
        if (!name.includes(nameQ)) return false;
      }
      if (codeQ) {
        const code = String(row['入河入海排污口编码'] ?? '');
        if (!code.includes(codeQ)) return false;
      }
      if (outletFilterRegion) {
        if (String(row['所在行政区域'] ?? '').trim() !== outletFilterRegion) return false;
      }
      if (outletFilterLevel1) {
        if (String(row['入河入海排污口一级分类'] ?? '') !== outletFilterLevel1) return false;
      }
      if (outletFilterLevel2) {
        if (String(row['入河入海排污口二级分类'] ?? '') !== outletFilterLevel2) return false;
      }
      if (outletFilterApproval) {
        if (String(row['审批登记备案情况'] ?? '') !== outletFilterApproval) return false;
      }
      if (outletFilterEmission) {
        if (String(row['排放状态'] ?? '').trim() !== outletFilterEmission) return false;
      }
      if (outletFilterKeyOutfall !== undefined) {
        const k = Number(row['重点排口']);
        if (k !== outletFilterKeyOutfall) return false;
      }
      return true;
    });
  }, [
    data,
    outletFilterApproval,
    outletFilterCode,
    outletFilterEmission,
    outletFilterKeyOutfall,
    outletFilterLevel1,
    outletFilterLevel2,
    outletFilterName,
    outletFilterRegion,
  ]);

  const handleOutletSearch = () => {
    const values = outletFilterForm.getFieldsValue();
    setOutletFilterRegion(values.region);
    setOutletFilterLevel1(values.level1);
    setOutletFilterLevel2(values.level2);
    setOutletFilterApproval(values.approval);
    setOutletFilterEmission(values.emission);
    setOutletFilterKeyOutfall(values.keyOutfall);
    setOutletFilterName(String(values.outletName || '').trim());
    setOutletFilterCode(String(values.outletCode || '').trim());
  };

  const handleOutletReset = () => {
    outletFilterForm.resetFields();
    setOutletFilterRegion(undefined);
    setOutletFilterLevel1(undefined);
    setOutletFilterLevel2(undefined);
    setOutletFilterApproval(undefined);
    setOutletFilterEmission(undefined);
    setOutletFilterKeyOutfall(undefined);
    setOutletFilterName('');
    setOutletFilterCode('');
  };

  // 排口表格列（HJ 1314—2023 表 A.1；列标题与行业源数据字典表中文名一致；操作列右侧固定）
  const allColumns: ColumnConfig[] = [
    {
      key: '入河入海排污口名称',
      title: '入河入海排污口名称',
      dataIndex: '入河入海排污口名称',
      width: 180,
      defaultVisible: true,
    },
    {
      key: '入河入海排污口编码',
      title: '入河入海排污口编码',
      dataIndex: '入河入海排污口编码',
      width: 168,
      defaultVisible: true,
    },
    {
      key: '入河入海排污口一级分类',
      title: '入河入海排污口一级分类',
      dataIndex: '入河入海排污口一级分类',
      width: 140,
      defaultVisible: true,
      render: (v: unknown) => formatOutletLevel1(v as string),
    },
    {
      key: '入河入海排污口二级分类',
      title: '入河入海排污口二级分类',
      dataIndex: '入河入海排污口二级分类',
      width: 220,
      defaultVisible: false,
      render: (v: unknown) => formatOutletLevel2(v as string),
    },
    {
      key: '审批登记备案情况',
      title: '审批登记备案情况',
      dataIndex: '审批登记备案情况',
      width: 160,
      defaultVisible: true,
      render: (v: unknown) => <OutletApprovalRegBadge code={v as string} />,
    },
    {
      key: '所在行政区域',
      title: '所在行政区域',
      dataIndex: '所在行政区域',
      width: 200,
      defaultVisible: false,
    },
    {
      key: '行政区划代码',
      title: '行政区划代码',
      dataIndex: '行政区划代码',
      width: 120,
      defaultVisible: false,
      render: (v: unknown) => {
        const s = String(v ?? '').trim();
        if (!s) return '—';
        return /^\d{6,12}$/.test(s) ? getShaoshanAddvcdLabel(s) : s;
      },
    },
    {
      key: '重点排口',
      title: '重点排口',
      dataIndex: '重点排口',
      width: 100,
      defaultVisible: true,
      render: (v: unknown) => formatOutletKeyOutfall(v),
    },
    {
      key: '排放状态',
      title: '排放状态',
      dataIndex: '排放状态',
      width: 120,
      defaultVisible: true,
      render: (v: unknown) => formatOutletEmissionState(v),
    },
    {
      key: '入河入海排污口详细地址',
      title: '入河入海排污口详细地址',
      dataIndex: '入河入海排污口详细地址',
      width: 280,
      defaultVisible: true,
    },
    {
      key: '入河入海排污口经度',
      title: '入河入海排污口经度',
      dataIndex: '入河入海排污口经度',
      width: 128,
      defaultVisible: true,
      render: (v: number) => (v != null && Number.isFinite(Number(v)) ? `${Number(v).toFixed(6)}` : '—'),
    },
    {
      key: '入河入海排污口纬度',
      title: '入河入海排污口纬度',
      dataIndex: '入河入海排污口纬度',
      width: 128,
      defaultVisible: true,
      render: (v: number) => (v != null && Number.isFinite(Number(v)) ? `${Number(v).toFixed(6)}` : '—'),
    },
    { key: '排污水系', title: '排污水系', dataIndex: '排污水系', width: 160, defaultVisible: false },
    { key: '受纳水体', title: '受纳水体', dataIndex: '受纳水体', width: 140, defaultVisible: true },
    {
      key: '所在流域海域',
      title: '所在流域海域',
      dataIndex: '所在流域海域',
      width: 120,
      defaultVisible: false,
      render: (v: unknown) => formatOutletBasinSea(v as string),
    },
    { key: '排入海湾名称', title: '排入海湾名称', dataIndex: '排入海湾名称', width: 140, defaultVisible: false },
    { key: '控制单元', title: '控制单元', dataIndex: '控制单元', width: 160, defaultVisible: false },
    { key: '对应国控断面', title: '对应国控断面', dataIndex: '对应国控断面', width: 120, defaultVisible: false },
    { key: '对应国控断面水质目标', title: '对应国控断面水质目标', dataIndex: '对应国控断面水质目标', width: 120, defaultVisible: false },
    { key: '排入水功能区名称', title: '排入水功能区名称', dataIndex: '排入水功能区名称', width: 140, defaultVisible: false },
    { key: '排入水功能区水质目标', title: '排入水功能区水质目标', dataIndex: '排入水功能区水质目标', width: 120, defaultVisible: false },
    {
      key: '是否位于饮用水源保护区内',
      title: '是否位于饮用水源保护区内',
      dataIndex: '是否位于饮用水源保护区内',
      width: 160,
      defaultVisible: false,
      render: (v: unknown) => formatOutletDrinkingSourceZone(v as string),
    },
    {
      key: '来水通道',
      title: '来水通道',
      dataIndex: '来水通道',
      width: 110,
      defaultVisible: false,
      render: (v: unknown) => formatOutletInflowChannel(v as string),
    },
    { key: '排污口材质', title: '排污口材质', dataIndex: '排污口材质', width: 100, defaultVisible: false },
    {
      key: '排污口流量',
      title: '排污口流量',
      dataIndex: '排污口流量',
      width: 120,
      defaultVisible: false,
      render: (v: unknown) =>
        v != null && v !== '' && Number.isFinite(Number(v)) ? `${Number(v)} 立方米每小时` : '—',
    },
    { key: '排污口口径', title: '排污口口径', dataIndex: '排污口口径', width: 120, defaultVisible: false },
    {
      key: '排放方式',
      title: '排放方式',
      dataIndex: '排放方式',
      width: 100,
      defaultVisible: false,
      render: (v: unknown) => formatOutletDischargeMode(v as string),
    },
    {
      key: '口门形态',
      title: '口门形态',
      dataIndex: '口门形态',
      width: 100,
      defaultVisible: false,
      render: (v: unknown) => formatOutletGateForm(v as string),
    },
    { key: '排口特征图片', title: '排口特征图片', dataIndex: '排口特征图片', width: 160, defaultVisible: false },
    { key: '排水去向图片', title: '排水去向图片', dataIndex: '排水去向图片', width: 160, defaultVisible: false },
    { key: '周边环境图片', title: '周边环境图片', dataIndex: '周边环境图片', width: 160, defaultVisible: false },
    {
      key: '排污口特性照片（远景）',
      title: '排污口特性照片（远景）',
      dataIndex: '排污口特性照片（远景）',
      width: 200,
      defaultVisible: false,
    },
    { key: '排口标志牌照片', title: '排口标志牌照片', dataIndex: '排口标志牌照片', width: 180, defaultVisible: false },
    { key: '周围环境', title: '周围环境', dataIndex: '周围环境', width: 160, defaultVisible: false },
    { key: '创建时间', title: '创建时间', dataIndex: '创建时间', width: 120, defaultVisible: false },
    { key: '更新时间', title: '更新时间', dataIndex: '更新时间', width: 120, defaultVisible: false },
    {
      key: 'outletImages',
      title: '图片资料',
      dataIndex: '排口特征图片',
      width: 100,
      defaultVisible: true,
      render: (_: unknown, record: Record<string, unknown>) => {
        const imageCount = OUTLET_IMAGE_FIELDS.reduce(
          (sum, field) => sum + splitOutletImageValues(record[field]).length,
          0,
        );
        return (
          <Badge count={imageCount} size="small" color="#52c41a" overflowCount={99}>
            <Button
              type="link"
              className="action-btn detail"
              icon={<EyeOutlined />}
              onClick={() => {
                setOutletImageListRecord(record);
                setOutletImageListOpen(true);
              }}
            >
              图片
            </Button>
          </Badge>
        );
      },
    },
    {
      key: 'outletDocuments',
      title: '排口资料',
      dataIndex: 'documents',
      width: 100,
      defaultVisible: true,
      render: (_: unknown, record: { documents?: PumpArchiveDocument[]; 入河入海排污口名称?: string }) => {
        const n = Array.isArray(record.documents) ? record.documents.length : 0;
        return (
          <Badge count={n} size="small" color="#1890ff" overflowCount={99}>
            <Button
              type="link"
              className="action-btn detail"
              icon={<FileTextOutlined />}
              onClick={() => {
                setOutletDocListRecord(record as Record<string, unknown>);
                setOutletDocListOpen(true);
              }}
            >
              资料
            </Button>
          </Badge>
        );
      },
    },
    { key: 'operation', title: '操作', width: 300, defaultVisible: true },
  ];

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => getDefaultVisibleColumnKeys(allColumns));

  /** 由行政区划代码推导台账「所在行政区域」，避免与区划码重复手填 */
  const syncOutletAdminRegionFromAddvcd = (code: unknown): string => {
    const c = String(code ?? '').trim();
    if (!c) return '';
    const hit = SHAOSHAN_ADDVCD_OPTIONS.find((o) => o.value === c);
    if (hit) {
      if (hit.label === '韶山市（市本级）') return '湖南省湘潭市韶山市';
      return `湖南省湘潭市韶山市${hit.label}`;
    }
    const lab = getShaoshanAddvcdLabel(c);
    return lab === '—' ? '' : lab;
  };

  const parseOutletNums = (values: any) => {
    const n = (v: any) => (v === '' || v === undefined || v === null ? undefined : Number(v));
    const keyOutfall = values['重点排口'];
    const 重点排口Parsed =
      keyOutfall === '' || keyOutfall === undefined || keyOutfall === null
        ? undefined
        : Number(keyOutfall) === 1
          ? 1
          : Number(keyOutfall) === 0
            ? 0
            : undefined;
    return {
      ...values,
      所在行政区域: syncOutletAdminRegionFromAddvcd(values['行政区划代码']),
      入河入海排污口经度: n(values['入河入海排污口经度']),
      入河入海排污口纬度: n(values['入河入海排污口纬度']),
      排污口流量: n(values['排污口流量']),
      重点排口: 重点排口Parsed,
    };
  };

  const handleDelete = (id: string) => {
    setData(data.filter(item => item['入河入海排污口编码'] !== id));
    message.success('删除成功');
    setEditModalVisible(false);
  };

  const handleEdit = (record: any) => {
    setOutletEditTab('basic');
    setEditingRecord(record);
    setIsEditMode(true);
    const outletCode = String(record?.['入河入海排污口编码'] ?? '');
    const linkedResponsible = findResponsibleByOutletCode(outletCode);
    editForm.setFieldsValue({
      ...record,
      责任主体内码: linkedResponsible?.责任主体内码,
    });
    setEditModalVisible(true);
  };

  const handleEditSave = () => {
    editForm.validateFields().then(values => {
      const merged = parseOutletNums(values);
      const selectedResponsibleId = String(values?.责任主体内码 ?? '').trim();
      const selectedResponsible = responsiblePartiesData.find(item => item.责任主体内码 === selectedResponsibleId);
      setData(
        data.map(item =>
          item['入河入海排污口编码'] === editingRecord['入河入海排污口编码']
            ? {
                ...item,
                ...merged,
                责任主体内码: selectedResponsibleId || undefined,
                责任主体名称: selectedResponsible?.责任主体名称 || undefined,
                documents:
                  (editingRecord as { documents?: PumpArchiveDocument[] }).documents ??
                  (item as { documents?: PumpArchiveDocument[] }).documents ??
                  [],
              }
            : item,
        ),
      );
      applyResponsiblePartySelection(editingRecord?.['入河入海排污口编码'], values?.责任主体内码);
      message.success('保存成功');
      setEditModalVisible(false);
    });
  };

  const handleAdd = () => {
    setDraftOutletDocuments([]);
    setOutletAddTab('basic');
    addForm.resetFields();
    addForm.setFieldsValue({
      入河入海排污口编码: generateOutletLedgerCode(),
      入河入海排污口名称: '',
      入河入海排污口一级分类: '04',
      入河入海排污口二级分类: '15',
      审批登记备案情况: '02',
      行政区划代码: '430382100000',
      入河入海排污口详细地址: '湖南省湘潭市韶山市清溪镇',
      入河入海排污口经度: 112.545,
      入河入海排污口纬度: 27.92,
      排污水系: '湘江流域韶河支流',
      受纳水体: String(RECEIVE_WATER_BODY_SELECT_OPTIONS[0]?.label ?? RECEIVE_WATER_BODY_SELECT_OPTIONS[0]?.value ?? '韶河'),
      所在流域海域: '441900B01BS000001',
      重点排口: 0,
      排放状态: '正常排放',
      责任主体内码: undefined,
      创建时间: getCurrentDate(),
      更新时间: getCurrentDate(),
    });
    setAddModalVisible(true);
  };

  const handleAddSave = () => {
    addForm.validateFields().then(values => {
      const parsed = parseOutletNums(values);
      const selectedResponsibleId = String(values?.责任主体内码 ?? '').trim();
      const selectedResponsible = responsiblePartiesData.find(item => item.责任主体内码 === selectedResponsibleId);
      const newRecord = {
        ...parsed,
        责任主体内码: selectedResponsibleId || undefined,
        责任主体名称: selectedResponsible?.责任主体名称 || undefined,
        documents: draftOutletDocuments,
      };
      setData([newRecord, ...data]);
      applyResponsiblePartySelection(parsed['入河入海排污口编码'], values?.责任主体内码);
      message.success('新增成功');
      setAddModalVisible(false);
      setDraftOutletDocuments([]);
      setOutletAddTab('basic');
    });
  };

  // 根据可见列生成实际列配置
  const columns = allColumns
    .filter(col => visibleColumns.includes(col.key) || col.key === 'operation')
    .sort((a, b) => {
      if (a.key === 'operation') return 1;
      if (b.key === 'operation') return -1;
      const indexA = visibleColumns.indexOf(a.key);
      const indexB = visibleColumns.indexOf(b.key);
      return indexA - indexB;
    })
    .map(col => {
      if (col.key === 'operation') {
        return {
          ...col,
          fixed: 'right' as const,
          render: (_: any, record: any) => (
            <Space size="small">
              <Button
                type="link"
                size="small"
                className="action-btn detail"
                icon={<EyeOutlined />}
                onClick={() =>
                  onDetail(
                    `排口详情 - ${record['入河入海排污口名称']}`,
                    renderOutletDetailModal(record),
                    'min(1200px, 96vw)',
                  )
                }
              >
                详情
              </Button>
              <Tooltip title="打开详情并定位到实时监测">
                <Button
                  type="link"
                  size="small"
                  className="action-btn detail"
                  icon={<LineChartOutlined />}
                  onClick={() =>
                    onDetail(
                      `排口详情 - ${record['入河入海排污口名称']}`,
                      renderOutletDetailModal(record, { initialTabKey: 'monitor' }),
                      'min(1200px, 96vw)',
                    )
                  }
                >
                  实时监测
                </Button>
              </Tooltip>
              <Button type="link" size="small" className="action-btn edit" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
                编辑
              </Button>
            </Space>
          )
        };
      }
      return col;
    });

  const facilityTableScrollX = getFacilityTableScrollX(
    allColumns.filter(col => visibleColumns.includes(col.key) || col.key === 'operation'),
  );

  return (
    <div className="facility-view">
      <Card
        title="排口信息"
        extra={
          <Space wrap size={[8, 8]} align="center">
            <Button
              icon={<DownloadOutlined />}
              className="export-btn"
              onClick={() => {
                if (filteredOutletData.length === 0) {
                  message.warning('当前筛选条件下无数据可导出');
                  return;
                }
                downloadFacilityListExcel(
                  filteredOutletData as unknown as Record<string, unknown>[],
                  allColumns,
                  '排口信息',
                  '排口信息',
                  outletListExportFormatByKey,
                );
                message.success('已导出 Excel（全量字段；资料含类型与名称明细）');
              }}
            >
              导出Excel
            </Button>
            <Upload
              beforeUpload={() => {
                message.success('已导入（原型示意）');
                return false;
              }}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />}>导入</Button>
            </Upload>
            <PipeLineColumnManager columns={allColumns} visibleColumns={visibleColumns} onChange={setVisibleColumns} />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} className="add-btn">入河排污口排查登记</Button>
          </Space>
        }
      >
        <Form form={outletFilterForm} layout="inline" style={{ marginBottom: 16, rowGap: 12 }}>
          <Row gutter={16} style={{ width: '100%' }}>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="region" style={{ marginBottom: 0 }}>
                <Select
                  placeholder="所属区域"
                  style={{ width: '100%' }}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={outletRegionOptions}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="level1" style={{ marginBottom: 0 }}>
                <Select
                  placeholder="一级分类"
                  style={{ width: '100%' }}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={OUTLET_LEVEL1_SELECT_OPTIONS}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="level2" style={{ marginBottom: 0 }}>
                <Select
                  placeholder="二级分类"
                  style={{ width: '100%' }}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={OUTLET_LEVEL2_SELECT_OPTIONS}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="approval" style={{ marginBottom: 0 }}>
                <Select
                  placeholder="审批登记备案"
                  style={{ width: '100%' }}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={OUTLET_APPROVAL_SELECT_OPTIONS}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="emission" style={{ marginBottom: 0 }}>
                <Select
                  placeholder="排放状态"
                  style={{ width: '100%' }}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={[...OUTLET_EMISSION_STATE_OPTIONS]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="keyOutfall" style={{ marginBottom: 0 }}>
                <Select
                  allowClear
                  placeholder="重点排口"
                  style={{ width: '100%' }}
                  options={OUTLET_KEY_OUTFALL_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16} style={{ width: '100%' }}>
            <Col span={5}>
              <Form.Item name="outletName" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="入河入海排污口名称" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="outletCode" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="入河入海排污口编码" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item style={{ marginBottom: 0 }}>
                <Space>
                  <Button type="primary" className="search-btn" icon={<SearchOutlined />} onClick={handleOutletSearch}>
                    查询
                  </Button>
                  <Button onClick={handleOutletReset}>重置</Button>
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Form>
        <div className="facility-table-wrap">
          <Table
            dataSource={filteredOutletData}
            columns={columns}
            rowKey="入河入海排污口编码"
            scroll={{ x: facilityTableScrollX }}
            pagination={{ pageSize: 10 }}
          />
        </div>
      </Card>

      <Modal
        styles={formModalStyles}
        title="入河排污口排查登记"
        open={addModalVisible}
        onOk={handleAddSave}
        onCancel={() => {
          setAddModalVisible(false);
          setDraftOutletDocuments([]);
          setOutletAddTab('basic');
        }}
        width={920}
        footer={
          <Space>
            <Button
              onClick={() => {
                setAddModalVisible(false);
                setDraftOutletDocuments([]);
                setOutletAddTab('basic');
              }}
            >
              取消
            </Button>
            <Button type="primary" onClick={handleAddSave}>保存</Button>
          </Space>
        }
      >
        <Tabs activeKey={outletAddTab} onChange={setOutletAddTab} style={{ marginTop: 4 }}>
          <TabPane tab="基本信息" key="basic">
            <OutletFormContent form={addForm} responsiblePartyOptions={responsiblePartyOptions} />
          </TabPane>
          <TabPane tab="图片资料" key="images">
            <OutletImageFormContent form={addForm} />
          </TabPane>
          <TabPane
            tab={
              <span>
                <PaperClipOutlined /> 排口资料 ({draftOutletDocuments.length})
              </span>
            }
            key="documents"
          >
            <PumpDocumentsEditPanel documents={draftOutletDocuments} onChange={setDraftOutletDocuments} uiKind="outlet" />
          </TabPane>
        </Tabs>
      </Modal>

      <Modal
        styles={formModalStyles}
        title={
          outletImageListRecord
            ? `${String((outletImageListRecord as { 入河入海排污口名称?: string })['入河入海排污口名称'] ?? '排口')} - 图片资料`
            : '图片资料'
        }
        open={outletImageListOpen}
        onCancel={() => {
          setOutletImageListOpen(false);
          setOutletImageListRecord(null);
        }}
        footer={null}
        width={900}
      >
        {outletImageListRecord && (
          <Card size="small" title="图片资料快速查看">
            <Descriptions bordered column={1} size="small">
              {OUTLET_IMAGE_FIELDS.map(field => {
                const values = splitOutletImageValues(outletImageListRecord[field]);
                return (
                  <Descriptions.Item key={field} label={field}>
                    {values.length > 0 ? (
                      <Space direction="vertical" size={4}>
                        {values.map((value, idx) => {
                          const isUrl = /^https?:\/\//i.test(value);
                          return isUrl ? (
                            <a key={`${field}-${idx}`} href={value} target="_blank" rel="noreferrer">
                              {value}
                            </a>
                          ) : (
                            <span key={`${field}-${idx}`}>{value}</span>
                          );
                        })}
                      </Space>
                    ) : (
                      '—'
                    )}
                  </Descriptions.Item>
                );
              })}
            </Descriptions>
          </Card>
        )}
      </Modal>

      <Modal
        styles={formModalStyles}
        title={
          isEditMode
            ? `编辑排口 - ${editingRecord?.['入河入海排污口名称']}`
            : `排口详情 - ${editingRecord?.['入河入海排污口名称']}`
        }
        open={editModalVisible}
        onOk={isEditMode ? handleEditSave : () => setEditModalVisible(false)}
        onCancel={() => {
          setEditModalVisible(false);
          setOutletEditTab('basic');
        }}
        width={isEditMode ? 920 : 'min(1200px, 96vw)'}
        footer={
          isEditMode ? (
            <Space>
              <Button danger onClick={() => handleDelete(editingRecord?.['入河入海排污口编码'])}>删除</Button>
              <Button
                onClick={() => {
                  setEditModalVisible(false);
                  setOutletEditTab('basic');
                }}
              >
                取消
              </Button>
              <Button type="primary" onClick={handleEditSave}>保存</Button>
            </Space>
          ) : (
            <Space>
              <Button
                type="primary"
                onClick={() => {
                  if (editingRecord) editForm.setFieldsValue(editingRecord);
                  setIsEditMode(true);
                }}
              >
                进入编辑
              </Button>
            </Space>
          )
        }
      >
        {editingRecord &&
          (isEditMode ? (
            <Tabs activeKey={outletEditTab} onChange={setOutletEditTab} style={{ marginTop: 4 }}>
              <TabPane tab="基本信息" key="basic">
                <OutletFormContent
                  form={editForm}
                  initialValues={editingRecord}
                  isEdit
                  responsiblePartyOptions={responsiblePartyOptions}
                />
              </TabPane>
              <TabPane tab="图片资料" key="images">
                <OutletImageFormContent form={editForm} initialValues={editingRecord} />
              </TabPane>
              <TabPane
                tab={
                  <span>
                    <PaperClipOutlined /> 排口资料 (
                    {Array.isArray((editingRecord as { documents?: unknown }).documents)
                      ? (editingRecord as { documents: unknown[] }).documents.length
                      : 0}
                    )
                  </span>
                }
                key="documents"
              >
                <PumpDocumentsEditPanel
                  documents={(editingRecord as { documents?: PumpArchiveDocument[] }).documents ?? []}
                  uiKind="outlet"
                  onChange={next => {
                    const code = String((editingRecord as { 入河入海排污口编码?: string })['入河入海排污口编码'] ?? '');
                    setData(rows =>
                      rows.map(item =>
                        String(item['入河入海排污口编码']) === code ? { ...item, documents: next } : item,
                      ),
                    );
                    setEditingRecord((r: Record<string, unknown> | null) => (r ? { ...r, documents: next } : r));
                  }}
                />
              </TabPane>
            </Tabs>
          ) : (
            renderOutletDetailModal(editingRecord)
          ))}
      </Modal>

      <Modal
        styles={formModalStyles}
        title={
          outletDocListRecord
            ? `${String((outletDocListRecord as { 入河入海排污口名称?: string })['入河入海排污口名称'] ?? '排口')} - 排口资料`
            : '排口资料'
        }
        open={outletDocListOpen}
        onCancel={() => {
          setOutletDocListOpen(false);
          setOutletDocListRecord(null);
        }}
        footer={null}
        width={900}
      >
        {outletDocListRecord && (
          <Card
            size="small"
            title={`排口资料列表 (${((outletDocListRecord as { documents?: unknown[] }).documents || []).length} 个)`}
          >
            <PumpDocumentList
              documents={
                ((outletDocListRecord as { documents?: PumpArchiveDocument[] }).documents || []) as PumpArchiveDocument[]
              }
              uiKind="outlet"
            />
          </Card>
        )}
      </Modal>
    </div>
  );
};

// 污水处理厂视图
const PlantView = ({
  onDetail,
  data,
  onDataChange,
}: {
  onDetail: (title: string, content: React.ReactNode, modalWidth?: number | string) => void;
  data: typeof plantData;
  onDataChange: React.Dispatch<React.SetStateAction<typeof plantData>>;
}) => {
  const setData = onDataChange;
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm] = Form.useForm();
  const [addForm] = Form.useForm();
  const [queryForm] = Form.useForm<{
    idKeyword?: string;
    nameKeyword?: string;
    facilityType?: number;
    status?: string;
    region?: string;
  }>();
  const [plantAddTab, setPlantAddTab] = useState('basic');
  const [plantEditTab, setPlantEditTab] = useState('basic');
  const [draftPlantDocuments, setDraftPlantDocuments] = useState<PlantArchiveDocument[]>([]);
  const [plantDocListOpen, setPlantDocListOpen] = useState(false);
  const [plantDocListRecord, setPlantDocListRecord] = useState<Record<string, unknown> | null>(null);

  // 污水厂表格列（表 A.0.30 中文字段名；标识码类可列配置隐藏）
  const allColumns: ColumnConfig[] = [
    { key: 'id', title: '污水处理厂标识码', dataIndex: 'id', width: 168, defaultVisible: false },
    { key: 'systemId', title: '排水系统编码', dataIndex: 'systemId', width: 150, defaultVisible: true },
    {
      key: 'x',
      title: '坐标 X',
      dataIndex: 'x',
      width: 118,
      defaultVisible: true,
      render: (v: unknown) => (v != null && v !== '' ? Number(v).toFixed(6) : '—'),
    },
    {
      key: 'y',
      title: '坐标 Y',
      dataIndex: 'y',
      width: 118,
      defaultVisible: true,
      render: (v: unknown) => (v != null && v !== '' ? Number(v).toFixed(6) : '—'),
    },
    {
      key: 'facilityType',
      title: '污水处理设施类型',
      dataIndex: 'facilityType',
      width: 160,
      defaultVisible: true,
      render: (v: unknown) => plantLabelFromOptions(v as number, PLANT_OPTS_FACILITY_TYPE),
    },
    { key: 'name', title: '污水处理厂名称', dataIndex: 'name', width: 180, defaultVisible: true },
    { key: 'addr', title: '污水处理厂地址', dataIndex: 'addr', width: 260, defaultVisible: true },
    { key: 'completionDate', title: '建成日期', dataIndex: 'completionDate', width: 112, defaultVisible: true },
    {
      key: 'treatmentLevel',
      title: '污水处理级别',
      dataIndex: 'treatmentLevel',
      width: 120,
      defaultVisible: true,
      render: (v: unknown) => plantLabelFromOptions(v as number, PLANT_OPTS_TREATMENT_LEVEL),
    },
    {
      key: 'annualPowerConsumption',
      title: '年耗电量',
      dataIndex: 'annualPowerConsumption',
      width: 110,
      defaultVisible: false,
      render: (v: unknown) => (v != null && v !== '' ? `${v} 万千瓦时` : '—'),
    },
    {
      key: 'treatmentMethod',
      title: '污水处理方法',
      dataIndex: 'treatmentMethod',
      width: 130,
      defaultVisible: false,
      render: (v: unknown) => plantLabelFromOptions(v as number, PLANT_OPTS_TREATMENT_METHOD),
    },
    {
      key: 'receiveWaterBodyCode',
      title: '受纳水体编码',
      dataIndex: 'receiveWaterBodyCode',
      width: 220,
      defaultVisible: false,
      render: (v: unknown) => formatReceiveWaterObjectIdDisplay(String(v ?? '')),
    },
    {
      key: 'linkedOutletCode',
      title: '关联排口',
      dataIndex: 'linkedOutletCode',
      width: 220,
      defaultVisible: true,
      render: (v: unknown) => formatLinkedOutletCodeDisplay(v),
    },
    {
      key: 'designCapa',
      title: '污水设计处理规模',
      dataIndex: 'designCapa',
      width: 140,
      defaultVisible: true,
      render: (v: unknown) => (v != null && v !== '' ? `${v} 万立方米每日` : '—'),
    },
    { key: 'sewageTreatmentProcess', title: '污水处理工艺', dataIndex: 'sewageTreatmentProcess', width: 140, defaultVisible: true },
    {
      key: 'sewageLoadRate',
      title: '污水运行负荷率',
      dataIndex: 'sewageLoadRate',
      width: 120,
      defaultVisible: false,
      render: (v: unknown) => (v != null && v !== '' ? `${v}%` : '—'),
    },
    {
      key: 'rainwaterDesignCapa',
      title: '雨水设计处理规模',
      dataIndex: 'rainwaterDesignCapa',
      width: 140,
      defaultVisible: false,
      render: (v: unknown) => (v != null && v !== '' ? `${v} 万立方米每日` : '—'),
    },
    { key: 'rainwaterTreatmentProcess', title: '雨水处理工艺', dataIndex: 'rainwaterTreatmentProcess', width: 130, defaultVisible: false },
    {
      key: 'sludgeDesignCapa',
      title: '污泥设计处理规模',
      dataIndex: 'sludgeDesignCapa',
      width: 140,
      defaultVisible: false,
      render: (v: unknown) => (v != null && v !== '' ? `${v} 万吨每日` : '—'),
    },
    {
      key: 'sludgeLoadRate',
      title: '污泥运行负荷率',
      dataIndex: 'sludgeLoadRate',
      width: 120,
      defaultVisible: false,
      render: (v: unknown) => (v != null && v !== '' ? `${v}%` : '—'),
    },
    { key: 'sludgeTreatmentProcess', title: '污泥处理工艺', dataIndex: 'sludgeTreatmentProcess', width: 130, defaultVisible: false },
    {
      key: 'sludgeDisposalMethod',
      title: '污泥处置方式',
      dataIndex: 'sludgeDisposalMethod',
      width: 120,
      defaultVisible: false,
      render: (v: unknown) => plantLabelFromOptions(v as number, PLANT_OPTS_SLUDGE_DISPOSAL),
    },
    { key: 'pumpCount', title: '水泵台数', dataIndex: 'pumpCount', width: 96, defaultVisible: false },
    {
      key: 'dataSource',
      title: '数据来源',
      dataIndex: 'dataSource',
      width: 110,
      defaultVisible: true,
      render: (v: unknown) =>
        typeof v === 'number' || (typeof v === 'string' && /^\d+$/.test(v))
          ? plantLabelFromOptions(Number(v), PLANT_OPTS_DATA_SOURCE)
          : String(v ?? '—'),
    },
    { key: 'recordDate', title: '数据获取日期', dataIndex: 'recordDate', width: 120, defaultVisible: false },
    { key: 'reportUnit', title: '填报单位', dataIndex: 'reportUnit', width: 160, defaultVisible: true },
    { key: 'reportDate', title: '填报日期', dataIndex: 'reportDate', width: 112, defaultVisible: false },
    { key: 'remark', title: '备注', dataIndex: 'remark', width: 160, defaultVisible: false },
    {
      key: 'region',
      title: '所属区划',
      dataIndex: 'region',
      width: 100,
      defaultVisible: true,
      render: (v: unknown) => {
        const s = String(v ?? '').trim();
        if (!s) return '—';
        return /^\d{6,12}$/.test(s) ? getShaoshanAddvcdLabel(s) : s;
      },
    },
    { key: 'status', title: '运行状态', dataIndex: 'status', width: 88, defaultVisible: true },
    {
      key: 'plantDocuments',
      title: '污水厂资料',
      dataIndex: 'documents',
      width: 100,
      defaultVisible: true,
      render: (_: unknown, record: { name?: string; documents?: PlantArchiveDocument[] }) => {
        const n = Array.isArray(record.documents) ? record.documents.length : 0;
        return (
          <Badge count={n} size="small" color="#1890ff" overflowCount={99}>
            <Button
              type="link"
              className="action-btn detail"
              icon={<FileTextOutlined />}
              onClick={() => {
                setPlantDocListRecord(record as Record<string, unknown>);
                setPlantDocListOpen(true);
              }}
            >
              资料
            </Button>
          </Badge>
        );
      },
    },
    { key: 'operation', title: '操作', width: 300, defaultVisible: true },
  ];

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => getDefaultVisibleColumnKeys(allColumns));
  const [idKeywordFilter, setIdKeywordFilter] = useState('');
  const [nameKeywordFilter, setNameKeywordFilter] = useState('');
  const [facilityTypeFilter, setFacilityTypeFilter] = useState<number | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [regionFilter, setRegionFilter] = useState<string | undefined>();

  const getPlantRegionDisplay = useCallback((region: unknown) => {
    const s = String(region ?? '').trim();
    if (!s) return '—';
    return /^\d{6,12}$/.test(s) ? getShaoshanAddvcdLabel(s) : s;
  }, []);

  const plantRegionOptions = useMemo(
    () =>
      Array.from(new Set(data.map(item => getPlantRegionDisplay(item.region)).filter(v => v && v !== '—'))).map(label => ({
        value: label,
        label,
      })),
    [data, getPlantRegionDisplay],
  );

  const filteredData = useMemo(() => {
    const idKeyword = idKeywordFilter.trim();
    const nameKeyword = nameKeywordFilter.trim();
    return data.filter(item => {
      if (facilityTypeFilter !== undefined && Number(item.facilityType) !== Number(facilityTypeFilter)) return false;
      if (statusFilter && String(item.status || '') !== String(statusFilter)) return false;
      if (idKeyword && !String(item.id || '').includes(idKeyword)) return false;
      if (nameKeyword && !String(item.name || '').includes(nameKeyword)) return false;
      if (regionFilter) {
        const regionText = getPlantRegionDisplay(item.region);
        if (regionText !== regionFilter) return false;
      }
      return true;
    });
  }, [
    data,
    facilityTypeFilter,
    idKeywordFilter,
    nameKeywordFilter,
    regionFilter,
    statusFilter,
    getPlantRegionDisplay,
  ]);

  const parsePlantNums = (values: any) => {
    const n = (v: any) => (v === '' || v === undefined || v === null ? undefined : Number(v));
    const ni = (v: any) => {
      const x = n(v);
      return x !== undefined && Number.isFinite(x) ? Math.round(x) : undefined;
    };
    return {
      ...values,
      x: n(values.x),
      y: n(values.y),
      facilityType: ni(values.facilityType),
      treatmentLevel: ni(values.treatmentLevel),
      annualPowerConsumption: n(values.annualPowerConsumption),
      treatmentMethod: ni(values.treatmentMethod),
      designCapa: n(values.designCapa),
      sewageLoadRate: n(values.sewageLoadRate),
      rainwaterDesignCapa: n(values.rainwaterDesignCapa),
      sludgeDesignCapa: n(values.sludgeDesignCapa),
      sludgeLoadRate: n(values.sludgeLoadRate),
      sludgeDisposalMethod: ni(values.sludgeDisposalMethod),
      pumpCount: ni(values.pumpCount),
      dataSource: ni(values.dataSource),
      关键处理设施列表: normalizePlantKeyFacilities(values.关键处理设施列表),
    };
  };

  const handleDelete = (id: string) => {
    setData(data.filter(item => item.id !== id));
    message.success('删除成功');
    setEditModalVisible(false);
  };

  const handleEdit = (record: any) => {
    setPlantEditTab('basic');
    setEditingRecord(record);
    setIsEditMode(true);
    const x = Number(record.x);
    const y = Number(record.y);
    editForm.setFieldsValue({
      ...record,
      关键处理设施列表:
        Array.isArray(record.关键处理设施列表) && record.关键处理设施列表.length > 0
          ? record.关键处理设施列表
          : createDefaultPlantKeyFacilities(Number.isFinite(x) ? x : 112.528, Number.isFinite(y) ? y : 27.908),
    });
    setEditModalVisible(true);
  };

  const handleEditSave = () => {
    editForm.validateFields().then(values => {
      const merged = parsePlantNums(values);
      setData(
        data.map((item) =>
          item.id === editingRecord.id
            ? {
                ...item,
                ...merged,
                documents: (editingRecord as PlantRecord).documents ?? (item as PlantRecord).documents ?? [],
              }
            : item,
        ),
      );
      message.success('保存成功');
      setEditModalVisible(false);
      setPlantEditTab('basic');
    });
  };

  const handleAdd = () => {
    setDraftPlantDocuments([]);
    setPlantAddTab('basic');
    addForm.resetFields();
    addForm.setFieldsValue({
      id: generateId('WWTP'),
      systemId: 'SYS43038200100001',
      facilityType: 1,
      name: '新建污水处理厂',
      completionDate: getCurrentDate(),
      treatmentLevel: 2,
      treatmentMethod: 4,
      designCapa: 1,
      dataSource: 2,
      recordDate: getCurrentDate(),
      reportDate: getCurrentDate(),
      reportUnit: '高新区管委会',
      region: '清溪镇',
      addr: '湖南省湘潭市韶山市清溪镇高新区工业园',
      status: '1',
      x: 112.528,
      y: 27.908,
      关键处理设施列表: createDefaultPlantKeyFacilities(112.528, 27.908),
    });
    setAddModalVisible(true);
  };

  const handleAddSave = () => {
    addForm.validateFields().then(values => {
      const newRecord: PlantRecord = { ...parsePlantNums(values), documents: draftPlantDocuments };
      setData([newRecord, ...data]);
      message.success('新增成功');
      setAddModalVisible(false);
      setPlantAddTab('basic');
      setDraftPlantDocuments([]);
    });
  };

  // 根据可见列生成实际列配置
  const columns = allColumns
    .filter(col => visibleColumns.includes(col.key) || col.key === 'operation')
    .sort((a, b) => {
      if (a.key === 'operation') return 1;
      if (b.key === 'operation') return -1;
      const indexA = visibleColumns.indexOf(a.key);
      const indexB = visibleColumns.indexOf(b.key);
      return indexA - indexB;
    })
    .map(col => {
      if (col.key === 'operation') {
        return {
          ...col,
          fixed: 'right' as const,
          render: (_: any, record: any) => (
            <Space size="small">
              <Button
                type="link"
                size="small"
                className="action-btn detail"
                icon={<EyeOutlined />}
                onClick={() =>
                  onDetail(`污水厂详情 - ${record.name}`, <PlantDetailContent record={record} />, 'min(1200px, 96vw)')
                }
              >
                详情
              </Button>
              <Tooltip title="打开详情并定位到实时监测">
                <Button
                  type="link"
                  size="small"
                  className="action-btn detail"
                  icon={<LineChartOutlined />}
                  onClick={() =>
                    onDetail(
                      `污水厂详情 - ${record.name}`,
                      <PlantDetailContent record={record} initialTabKey="monitor" />,
                      'min(1200px, 96vw)',
                    )
                  }
                >
                  实时监测
                </Button>
              </Tooltip>
              <Button type="link" size="small" className="action-btn edit" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
                编辑
              </Button>
            </Space>
          )
        };
      }
      return col;
    });

  const facilityTableScrollX = getFacilityTableScrollX(
    allColumns.filter(col => visibleColumns.includes(col.key) || col.key === 'operation'),
  );

  const handlePlantSearch = () => {
    const values = queryForm.getFieldsValue();
    setIdKeywordFilter(String(values.idKeyword || '').trim());
    setNameKeywordFilter(String(values.nameKeyword || '').trim());
    setFacilityTypeFilter(values.facilityType);
    setStatusFilter(values.status);
    setRegionFilter(values.region);
  };

  const handlePlantReset = () => {
    queryForm.resetFields();
    setIdKeywordFilter('');
    setNameKeywordFilter('');
    setFacilityTypeFilter(undefined);
    setStatusFilter(undefined);
    setRegionFilter(undefined);
  };

  return (
    <div className="facility-view">
      <Card
        title="污水处理厂管理"
        extra={
          <Space wrap size={[8, 8]} align="center">
            <Button
              icon={<DownloadOutlined />}
              className="export-btn"
              onClick={() => {
                if (filteredData.length === 0) {
                  message.warning('当前筛选条件下无数据可导出');
                  return;
                }
                downloadFacilityListExcel(filteredData as unknown as Record<string, unknown>[], allColumns, '污水处理厂', '污水厂', plantListExportFormatByKey);
                message.success('已导出 Excel（全量字段；资料含类型与名称明细）');
              }}
            >
              导出Excel
            </Button>
            <Upload
              beforeUpload={() => {
                message.success('已导入（原型示意）');
                return false;
              }}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />}>导入</Button>
            </Upload>
            <PipeLineColumnManager columns={allColumns} visibleColumns={visibleColumns} onChange={setVisibleColumns} />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} className="add-btn">新增</Button>
          </Space>
        }
      >
        <Form
          form={queryForm}
          layout="inline"
          style={{ marginBottom: 16, flexWrap: 'nowrap', overflowX: 'auto', alignItems: 'center' }}
        >
          <Form.Item name="region" style={{ marginBottom: 0 }}>
            <Select allowClear showSearch optionFilterProp="label" placeholder="所属区划" style={{ width: 180 }} options={plantRegionOptions} />
          </Form.Item>
          <Form.Item name="facilityType" style={{ marginBottom: 0 }}>
            <Select allowClear style={{ width: 200 }} placeholder="污水处理设施类型" options={PLANT_OPTS_FACILITY_TYPE} />
          </Form.Item>
          <Form.Item name="status" style={{ marginBottom: 0 }}>
            <Select
              allowClear
              style={{ width: 160 }}
              placeholder="运行状态"
              options={[
                { value: '1', label: '正常' },
                { value: '2', label: '检修' },
                { value: '3', label: '故障' },
                { value: '4', label: '在建' },
              ]}
            />
          </Form.Item>
          <Form.Item name="idKeyword" style={{ marginBottom: 0 }}>
            <Input allowClear placeholder="污水处理厂标识码" style={{ width: 220 }} />
          </Form.Item>
          <Form.Item name="nameKeyword" style={{ marginBottom: 0 }}>
            <Input allowClear placeholder="污水处理厂名称" style={{ width: 220 }} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" className="search-btn" icon={<SearchOutlined />} onClick={handlePlantSearch}>
                搜索
              </Button>
              <Button onClick={handlePlantReset}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
        <div className="facility-table-wrap">
          <Table
            dataSource={filteredData}
            columns={columns}
            rowKey="id"
            scroll={{ x: facilityTableScrollX }}
            pagination={{ pageSize: 10 }}
          />
        </div>
      </Card>

      <Modal
        styles={formModalStyles}
        title="新增污水处理厂"
        open={addModalVisible}
        onCancel={() => {
          setAddModalVisible(false);
          setPlantAddTab('basic');
          setDraftPlantDocuments([]);
        }}
        width={960}
        footer={
          <Space>
            <Button
              onClick={() => {
                setAddModalVisible(false);
                setPlantAddTab('basic');
                setDraftPlantDocuments([]);
              }}
            >
              取消
            </Button>
            <Button type="primary" onClick={handleAddSave}>
              保存
            </Button>
          </Space>
        }
      >
        <PlantFormContent
          form={addForm}
          activeTab={plantAddTab}
          onTabChange={setPlantAddTab}
          documents={draftPlantDocuments}
          onDocumentsChange={setDraftPlantDocuments}
        />
      </Modal>

      <Modal
        styles={formModalStyles}
        title={isEditMode ? `编辑厂站 - ${editingRecord?.name}` : `污水厂详情 - ${editingRecord?.name}`}
        open={editModalVisible}
        onOk={isEditMode ? handleEditSave : () => setEditModalVisible(false)}
        onCancel={() => {
          setEditModalVisible(false);
          setPlantEditTab('basic');
        }}
        width={isEditMode ? 960 : 'min(1200px, 96vw)'}
        footer={
          isEditMode ? (
            <Space>
              <Button danger onClick={() => handleDelete(editingRecord?.id)}>删除</Button>
              <Button
                onClick={() => {
                  setEditModalVisible(false);
                  setPlantEditTab('basic');
                }}
              >
                取消
              </Button>
              <Button type="primary" onClick={handleEditSave}>保存</Button>
            </Space>
          ) : (
            <Space>
              <Button
                type="primary"
                onClick={() => {
                  if (editingRecord) editForm.setFieldsValue(editingRecord);
                  setPlantEditTab('basic');
                  setIsEditMode(true);
                }}
              >
                进入编辑
              </Button>
            </Space>
          )
        }
      >
        {editingRecord && (
          isEditMode ? (
            <PlantFormContent
              form={editForm}
              initialValues={editingRecord}
              isEdit
              activeTab={plantEditTab}
              onTabChange={setPlantEditTab}
              documents={(editingRecord as PlantRecord).documents ?? []}
              onDocumentsChange={(next) => {
                const id = (editingRecord as { id: string }).id;
                setData((rows) =>
                  rows.map((item) => (item.id === id ? { ...item, documents: next } : item)),
                );
                setEditingRecord((r: Record<string, unknown> | null) => (r ? { ...r, documents: next } : r));
              }}
            />
          ) : (
            <PlantDetailContent record={editingRecord} />
          )
        )}
      </Modal>

      <Modal
        styles={formModalStyles}
        title={
          plantDocListRecord
            ? `${String((plantDocListRecord as { name?: string }).name ?? '污水厂')} - 污水厂资料`
            : '污水厂资料'
        }
        open={plantDocListOpen}
        onCancel={() => {
          setPlantDocListOpen(false);
          setPlantDocListRecord(null);
        }}
        footer={null}
        width={900}
      >
        {plantDocListRecord && (
          <Card
            size="small"
            title={`污水厂资料列表 (${((plantDocListRecord as { documents?: unknown[] }).documents || []).length} 个)`}
          >
            <PlantDocumentList
              documents={((plantDocListRecord as { documents?: PlantArchiveDocument[] }).documents || []) as PlantArchiveDocument[]}
            />
          </Card>
        )}
      </Modal>
    </div>
  );
};


// ==================== 主应用组件 ====================

/** 详情弹窗钻取栈：保存工厂而非 React 节点，避免返回后子树仍持有过期的钻取回调 */
type FacilityDetailModalSnapshot = {
  title: string;
  width: number | string;
  restoreContent: () => React.ReactNode;
};

const Component = () => {
  const [currentView, setCurrentView] = useState<ViewState>('facilities-pipe-node');
  /** 泵站台账：与 `facility-points-data` 初始一致，泵站信息/泵站统计/事件列表与统计/安全指数评估共用 */
  const [pumpStationRecords, setPumpStationRecords] = useState<PumpStationRecord[]>(() => [...pumpStationData]);
  const [plantRecords, setPlantRecords] = useState(plantData);
  /** 统一事件台账：事件列表与事件统计共用 */
  const [facilityEventRecords, setFacilityEventRecords] = useState<UnifiedFacilityEventRecord[]>(() =>
    buildInitialUnifiedFacilityEvents(),
  );
  const [responsiblePartiesData, setResponsiblePartiesData] = useState<OutletResponsiblePartyRecord[]>(
    () => [...outletResponsiblePartyInitial],
  );
  /** 列表「详情」：与生态整治项目管理「项目详情」一致的居中弹窗（管点详情含运行监控时需加宽） */
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailModalTitle, setDetailModalTitle] = useState('');
  const [detailModalContent, setDetailModalContent] = useState<React.ReactNode>(null);
  const [detailModalWidth, setDetailModalWidth] = useState<number | string>(800);
  /** 每次打开递增，避免同标题不同入口（如「详情」与「实时监测」）时子树复用导致 Tab 停留在上次 */
  const [detailModalKey, setDetailModalKey] = useState(0);
  /** 钻取栈深度（仅用于标题区是否显示「返回上一层」） */
  const [detailModalStackDepth, setDetailModalStackDepth] = useState(0);
  const detailModalNavStackRef = useRef<FacilityDetailModalSnapshot[]>([]);
  const detailModalTitleRef = useRef('');
  const detailModalWidthRef = useRef<number | string>(800);
  useEffect(() => {
    detailModalTitleRef.current = detailModalTitle;
  }, [detailModalTitle]);
  useEffect(() => {
    detailModalWidthRef.current = detailModalWidth;
  }, [detailModalWidth]);

  const syncDetailModalStackUi = () => {
    setDetailModalStackDepth(detailModalNavStackRef.current.length);
  };

  /** 排口详情（含钻取回调）；返回上一层时通过 restoreContent 重新挂载，保证回调与列表数据一致 */
  const renderOutletDetailForModal = useCallback((outletRecord: Record<string, unknown>, opts?: { initialTabKey?: string }) => {
    return (
      <OutletDetailContent
        key={`${String(outletRecord['入河入海排污口编码'] ?? '')}-${opts?.initialTabKey ?? ''}`}
        record={outletRecord}
        initialTabKey={opts?.initialTabKey}
        responsiblePartiesData={responsiblePartiesData}
        onOpenRelatedFacilityDetail={row => {
          const pack = buildRelatedFacilityDetailModalPack(row);
          if (!pack) {
            message.warning('未找到该关联设施的台账记录');
            return;
          }
          detailModalNavStackRef.current.push({
            title: detailModalTitleRef.current,
            width: detailModalWidthRef.current,
            restoreContent: () => renderOutletDetailForModal(outletRecord, opts),
          });
          syncDetailModalStackUi();
          setDetailModalKey(k => k + 1);
          setDetailModalTitle(pack.title);
          setDetailModalContent(pack.content);
          setDetailModalWidth(pack.width);
        }}
      />
    );
  }, [responsiblePartiesData]);

  const openDetailModal = (title: string, content: React.ReactNode, modalWidth: number | string = 800) => {
    detailModalNavStackRef.current = [];
    syncDetailModalStackUi();
    setDetailModalKey((k) => k + 1);
    setDetailModalTitle(title);
    setDetailModalContent(content);
    setDetailModalWidth(modalWidth);
    setDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    detailModalNavStackRef.current = [];
    syncDetailModalStackUi();
    setDetailModalOpen(false);
    setDetailModalWidth(800);
  };

  const goBackDetailModal = () => {
    const prev = detailModalNavStackRef.current.pop();
    if (!prev) return;
    syncDetailModalStackUi();
    setDetailModalKey(k => k + 1);
    setDetailModalTitle(prev.title);
    setDetailModalContent(prev.restoreContent());
    setDetailModalWidth(prev.width);
  };

  // 渲染当前视图（设施管理：管点/管线/泵站/排口/污水厂/排水户）
  const renderView = () => {
    switch (currentView) {
      case 'facilities-pipe-node':
        return <PipeNodeView onDetail={openDetailModal} />;
      case 'facilities-pipe-line':
        return <PipeLineView onDetail={openDetailModal} />;
      case 'facilities-pipe-archive':
        return <PipeArchiveView />;
      case 'facilities-pump-info':
        return (
          <PumpStationView
            onDetail={openDetailModal}
            data={pumpStationRecords}
            onDataChange={setPumpStationRecords}
          />
        );
      case 'facilities-pump-stat':
        return <PumpStationStatView rows={pumpStationRecords} />;
      case 'facilities-event-list':
      case 'facilities-pump-event-list':
      case 'facilities-plant-event-list':
        return (
          <FacilityEventMgmtListShell
            onDetail={openDetailModal}
            pumpStationRows={pumpStationRecords}
            plantRecords={plantRecords}
            monitorPointRows={pipeNodeData}
            eventRows={facilityEventRecords}
            onEventRowsChange={setFacilityEventRecords}
            defaultFacilityTypeFilter="all"
          />
        );
      case 'facilities-event-stats':
      case 'facilities-pump-event-stats':
      case 'facilities-plant-event-stats': {
        const eventStatsTab =
          currentView === 'facilities-plant-event-stats'
            ? 'plant'
            : currentView === 'facilities-pump-event-stats'
              ? 'pump'
              : 'pump';
        return (
          <FacilityEventMgmtStatsShell
            eventRows={facilityEventRecords}
            defaultTab={eventStatsTab}
          />
        );
      }
      case 'facilities-pump-safety-index':
        return <PumpSafetyIndexView onDetail={openDetailModal} pumpStationRows={pumpStationRecords} />;
      case 'facilities-outlet-info':
        return (
          <OutletView
            onDetail={openDetailModal}
            renderOutletDetailModal={renderOutletDetailForModal}
            responsiblePartiesData={responsiblePartiesData}
            onResponsiblePartiesChange={setResponsiblePartiesData}
          />
        );
      case 'facilities-outlet-river-check-list':
        return <RiverOutletVerificationView onDetail={openDetailModal} />;
      case 'facilities-outlet-issue-list':
        return <OutletIssueListView onDetail={openDetailModal} />;
      case 'facilities-outlet-responsible':
        return (
          <OutletResponsiblePartyView
            onDetail={openDetailModal}
            dataSource={responsiblePartiesData}
            onDataChange={setResponsiblePartiesData}
          />
        );
      case 'facilities-outlet-action-team-group':
        return <OutletActionTeamGroupView onDetail={openDetailModal} />;
      case 'facilities-plant-info':
        return <PlantView onDetail={openDetailModal} data={plantRecords} onDataChange={setPlantRecords} />;
      case 'facilities-plant-om-list':
        return <PlantOmListView onDetail={openDetailModal} plantSource={plantRecords} />;
      case 'facilities-plant-safety-index':
        return <PlantSafetyIndexView onDetail={openDetailModal} />;
      case 'facilities-discharger':
        return <DischargerView onDetail={openDetailModal} />;
      default:
        return <PipeNodeView onDetail={openDetailModal} />;
    }
  };

  // 面包屑：设施管理 / …（与原一张图侧栏路径一致）
  const getBreadcrumbPath = (): string => {
    const base = '设施管理';
    for (const menu of facilitySidebarMenus) {
      if (menu.key === currentView) {
        return `${base} / ${menu.label}`;
      }
      if (menu.children) {
        for (const child of menu.children) {
          if (child.key === currentView) {
            return `${base} / ${menu.label} / ${child.label}`;
          }
        }
      }
    }
    // 兼容已从侧栏移除、仍可能被外部状态使用的旧事件视图键
    const legacyEventCrumb: Partial<Record<ViewState, string>> = {
      'facilities-pump-event-list': `${base} / 事件管理 / 事件列表`,
      'facilities-pump-event-stats': `${base} / 事件管理 / 事件统计`,
      'facilities-plant-event-list': `${base} / 事件管理 / 事件列表`,
      'facilities-plant-event-stats': `${base} / 事件管理 / 事件统计`,
    };
    const legacyPath = legacyEventCrumb[currentView];
    if (legacyPath) return legacyPath;
    return base;
  };

  // 左侧边栏（无顶部一级菜单时保留模块内导航）
  const SidebarMenu: React.FC = () => {
    const sidebarMenus = facilitySidebarMenus;

    const [expandedKeys, setExpandedKeys] = useState<string[]>(() => {
      const defaultExpanded: string[] = [];
      for (const menu of sidebarMenus) {
        if (menu.children) {
          for (const child of menu.children) {
            if (child.key === currentView) {
              defaultExpanded.push(menu.key);
              break;
            }
          }
        }
      }
      return defaultExpanded;
    });

    // 切换至泵站子菜单时自动展开「泵站管理」分组
    useEffect(() => {
      if (
        currentView === 'facilities-pipe-node' ||
        currentView === 'facilities-pipe-line' ||
        currentView === 'facilities-pipe-archive'
      ) {
        setExpandedKeys((prev) => (prev.includes('facilities-pipe') ? prev : [...prev, 'facilities-pipe']));
      }
    }, [currentView]);

    // 切换至泵站子菜单时自动展开「泵站管理」分组
    useEffect(() => {
      if (
        currentView === 'facilities-pump-info' ||
        currentView === 'facilities-pump-stat' ||
        currentView === 'facilities-pump-safety-index'
      ) {
        setExpandedKeys((prev) => (prev.includes('facilities-pump') ? prev : [...prev, 'facilities-pump']));
      }
    }, [currentView]);

    // 切换至排口管理子菜单时自动展开「排口管理」分组
    useEffect(() => {
      if (
        currentView === 'facilities-outlet-info' ||
        currentView === 'facilities-outlet-river-check-list' ||
        currentView === 'facilities-outlet-issue-list' ||
        currentView === 'facilities-outlet-responsible' ||
        currentView === 'facilities-outlet-action-team-group'
      ) {
        setExpandedKeys((prev) => (prev.includes('facilities-outlet-mgmt') ? prev : [...prev, 'facilities-outlet-mgmt']));
      }
    }, [currentView]);

    // 切换至污水厂管理子菜单时自动展开「污水厂管理」分组
    useEffect(() => {
      if (
        currentView === 'facilities-plant-info' ||
        currentView === 'facilities-plant-om-list' ||
        currentView === 'facilities-plant-safety-index'
      ) {
        setExpandedKeys((prev) => (prev.includes('facilities-plant-mgmt') ? prev : [...prev, 'facilities-plant-mgmt']));
      }
    }, [currentView]);

    // 事件管理（含兼容旧视图键：泵站/污水厂事件列表与统计）
    useEffect(() => {
      if (
        currentView === 'facilities-event-list' ||
        currentView === 'facilities-event-stats' ||
        currentView === 'facilities-pump-event-list' ||
        currentView === 'facilities-pump-event-stats' ||
        currentView === 'facilities-plant-event-list' ||
        currentView === 'facilities-plant-event-stats'
      ) {
        setExpandedKeys((prev) =>
          prev.includes('facilities-event-mgmt') ? prev : [...prev, 'facilities-event-mgmt'],
        );
      }
    }, [currentView]);

    /** 旧 ViewState 映射到事件管理子菜单 key，用于子项高亮 */
    const eventMgmtResolvedMenuKey: string | null =
      currentView === 'facilities-pump-event-list' || currentView === 'facilities-plant-event-list'
        ? 'facilities-event-list'
        : currentView === 'facilities-pump-event-stats' || currentView === 'facilities-plant-event-stats'
          ? 'facilities-event-stats'
          : null;

    const toggleExpand = (key: string) => {
      setExpandedKeys(prev =>
        prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
      );
    };

    return (
      <div className="sidebar-menu">
        <div className="sidebar-menu-title">设施管理</div>
        <div className="sidebar-menu-list">
          {sidebarMenus.map(menu => {
            const hasChildren = menu.children && menu.children.length > 0;
            const isExpanded = expandedKeys.includes(menu.key);
            const isActive =
              currentView === menu.key ||
              (hasChildren &&
                menu.children!.some(
                  c => c.key === currentView || (!!eventMgmtResolvedMenuKey && c.key === eventMgmtResolvedMenuKey),
                ));

            return (
              <div key={menu.key} className="sidebar-menu-item-wrapper">
                <div
                  className={`sidebar-menu-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (hasChildren) {
                      toggleExpand(menu.key);
                    } else {
                      setCurrentView(menu.key as ViewState);
                    }
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
                    {menu.children!.map(child => (
                      <div
                        key={child.key}
                        className={`sidebar-submenu-item ${
                          currentView === child.key || eventMgmtResolvedMenuKey === child.key ? 'active' : ''
                        }`}
                        onClick={() => setCurrentView(child.key as ViewState)}
                      >
                        {child.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Layout className="water-env-dashboard facility-mgmt-standalone">
      <div className="main-layout with-sidebar">
        <SidebarMenu />
        <div className="main-content-area">
          <div className="breadcrumb-bar">
            <span className="breadcrumb-current">{getBreadcrumbPath()}</span>
          </div>
          <Content className="main-content with-sidebar">
            <div className="content-wrapper">{renderView()}</div>
          </Content>
        </div>
      </div>

      <Modal
        styles={detailModalStyles}
        className="facility-detail-modal-compact"
        title={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              paddingRight: 40,
            }}
          >
            <span style={{ flex: '1 1 auto', minWidth: 0 }}>{detailModalTitle}</span>
            {detailModalStackDepth > 0 && (
              <Button type="default" icon={<LeftOutlined />} onClick={goBackDetailModal}>
                返回上一层
              </Button>
            )}
          </div>
        }
        open={detailModalOpen}
        onCancel={closeDetailModal}
        footer={null}
        width={detailModalWidth}
        destroyOnClose
      >
        <div key={detailModalKey} className="facility-detail-modal-content">
          {detailModalContent}
        </div>
      </Modal>
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
