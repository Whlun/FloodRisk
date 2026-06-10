/**
 * @name 生态整治
 *
 * 生态整治综合管理平台 - 集项目管理与河湖长制于一体的水环境治理系统（含完整增删查改）
 */

import './style.css';
import '../shared/ant-table-text-no-overlap.css';
import { downloadTableFullExcel, getExportFieldLabel } from '../shared/facilityTableXlsxExport';
import { downloadElementAsPdf } from '../shared/facilityStatPdfExport';
import { DetailTabsIfMultiple } from '../shared/detailTabsIfMultiple';
import {
  RiverGuardAffairDetailPanels,
  AFFAIR_SEVERITY_COLOR,
  AFFAIR_HANDLE_STATUS_COLOR,
} from './riverGuardAffairDetailPanels';
import { hasRiverGuardAffairDisposalFilled } from './riverGuardAffairDisposalFilled';
import { LakeWaterBodyReadonlyDetailContent } from './lakeWaterBodyReadonlyDetail';
import { EcoProjectArchiveReadonlyDetail } from './ecoProjectArchiveReadonlyDetail';
import { RiverSectionReadonlyDetailContent } from './riverSectionReadonlyDetail';
import { RiverChiefContactReadonlyDetailContent } from './riverChiefContactReadonlyDetail';
import {
  AddrWgs84MapPicker,
  ADDR_MAP_FORM_ITEM_EXTRA,
  ADDR_MAP_INPUT_PLACEHOLDER,
  ADDR_MAP_POI_COORD_TOOLTIP,
  ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP,
} from '../shared/addrWgs84MapFormBridge';
import { RiverSourceMouthWgs84MapPicker, RiverSourceMouthWgs84DetailMap } from '../shared/riverSourceMouthWgs84Map';
import { EmergencyEventDetailMap } from '../应急协同/emergencyEventDetailMap';
import { EmergencyEventFormMap } from '../应急协同/emergencyEventFormMap';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import zhCN from 'antd/locale/zh_CN';

dayjs.locale('zh-cn');
import {
  initialRiverSectionData,
  initialPatrolData,
  initialWaterQualityData,
  ADMIN_LEVEL_LABEL,
  SECTION_TYPE_LABEL,
  RIVER_SIDE_LABEL,
  RIVER_DIST_LABEL,
  QUALITY_CLASS_LABEL,
  USER_TYPE_LABEL,
  initialRiverChiefContacts,
  initialRiverGuardAffairs,
  initialRiverChannelMasterData,
  initialLakeWaterBodyData,
  initialChiefAreaData,
  CONTACT_ROLE_LABEL,
  CONTACT_DEPT_TYPES,
  CONTACT_AREA_OPTIONS,
  RV_ATT_CR_OVER_TYPE_OPTIONS,
  RV_ATT_RV_TYPE_OPTIONS,
  RV_ATT_RV_GRAD_OPTIONS,
  RV_ATT_BANK_OPTIONS,
  riverAttCodeLabel,
  type RiverSectionRow,
  type RiverChannelMasterRow,
  type LakeWaterBodyRow,
  type WaterQualityRow,
  type RiverChiefContactRow,
  type RiverGuardAffairRow,
  type ChiefAreaRow,
  type ContactRoleCategory,
  type AdminLevel,
  type RiverSide,
  type SectionType,
  type RiverDist,
  type PatrolRecordRow,
  type PatrolSegmentRecord,
  type PatrolProblemItem,
  RIVER_GUARD_INFO_SOURCES,
  RIVER_GUARD_HANDLE_STATUS,
  RIVER_GUARD_SEVERITY,
  RIVER_GUARD_PROBLEM_TYPES,
  RIVER_GUARD_AFFAIR_EVENT_PROBLEM_TYPES,
  SHAOSHAN_ADDVCD_OPTIONS,
  SHAOSHAN_ADMIN_TREE_TO_VILLAGE,
  getShaoshanAddvcdLabel,
  formatShaoshanAdminDivisionDisplay,
  shaoshanAddvcdSelectOptionsWithLegacy,
  resolveAffairProblemTypeForForm,
  LAKE_CR_OVER_TYPE_OPTIONS,
  LAKE_SAL_FRE_WAT_OPTIONS,
  LAKE_LK_RANK_OPTIONS,
  RIVER_FLOW_AREA_ADDVCD_OPTIONS,
  parseRiverFlowAreaCodes,
  formatRiverFlowAreaCodesDisplay,
} from './riverChiefDb4401';
import {
  type EcoProjectArchiveDocument as ProjectDocument,
  type EcoProjectArchiveDocumentType as DocumentType,
  type EcoProjectArchiveRow,
  initialEcoProjectArchiveData,
} from './eco-project-archive-demo';
import type { FormInstance } from 'antd/es/form';
import AppConfigProvider from '../../common/AppConfigProvider';
import {
  Layout,
  Card,
  Badge,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Button,
  Input,
  Select,
  DatePicker,
  Progress,
  Tabs,
  List,
  Space,
  Typography,
  Divider,
  Empty,
  Modal,
  Form,
  message,
  Popconfirm,
  InputNumber,
  Descriptions,
  Radio,
  Checkbox,
  Switch,
  Dropdown,
  Tooltip,
  Upload,
  Image,
  Popover,
  TreeSelect,
} from 'antd';
import type { FormListFieldData } from 'antd/es/form/FormList';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  ColumnHeightOutlined,
  ProjectOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  SearchOutlined,
  PlusOutlined,
  VideoCameraOutlined,
  BarChartOutlined,
  TeamOutlined,
  DashboardOutlined,
  DownOutlined,
  FileSearchOutlined,
  HistoryOutlined,
  TrophyOutlined,
  CalculatorOutlined,
  FlagOutlined,
  AuditOutlined,
  SwapOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  FormOutlined,
  CheckOutlined,
  CloseOutlined,
  UploadOutlined,
  LoadingOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileWordOutlined,
  DownloadOutlined,
  PaperClipOutlined,
  FileOutlined,
  GlobalOutlined,
  PlayCircleOutlined,
  ImportOutlined,
  ArrowLeftOutlined,
  UnorderedListOutlined,
  PieChartOutlined,
  LineChartOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  BankOutlined,
  BranchesOutlined,
  CloudOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import * as echarts from 'echarts';

const { Content } = Layout;
const { Text, Paragraph, Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;
const { TextArea } = Input;

const PATROL_MODE_OPTIONS = ['步行巡河', '车巡', '船巡', '无人机巡查', '车巡+步行', '联合巡查'];

const genPatrolId = () =>
  `PATROL-${dayjs().format('YYYYMMDD')}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

/** 表单中单条巡检记录（表 13 DYN_PATROL 续）默认值 */
const emptyPatrolSegmentFormValues = () => {
  const s = dayjs().startOf('hour');
  return {
    segmentPersonnel: [] as string[],
    strtime: s,
    endtime: s.add(1, 'hour'),
    distanceKm: 0,
    durationMin: 0,
    startLgtd: 0,
    startLttd: 0,
    endLgtd: 0,
    endLttd: 0,
  };
};

/** 批量导入：每行一条；优先制表符分列，否则半角逗号。列顺序：巡检人员（多人用顿号）、开始时间、结束时间、距离（千米）、时长（分钟）、起点经度、起点纬度、终点经度、终点纬度（共 9 列；段级巡河序号在保存时自动生成，导入无需河段/段编号列） */
function parsePatrolBatchImportLines(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('#') && !l.startsWith('//'));
  const out: ReturnType<typeof emptyPatrolSegmentFormValues>[] = [];
  for (const line of lines) {
    const cells = line.includes('\t') ? line.split('\t').map(c => c.trim()) : line.split(',').map(c => c.trim());
    if (cells.length < 9) continue;
    const [personnelStr, st, et, dkm, dmin, slg, slt, elg, elt] = cells;
    const segmentPersonnel = personnelStr
      .split(/[,，、\s]+/)
      .map(s => s.trim())
      .filter(Boolean);
    const strtime = dayjs(st);
    const endtime = dayjs(et);
    if (!strtime.isValid() || !endtime.isValid()) continue;
    out.push({
      segmentPersonnel,
      strtime,
      endtime,
      distanceKm: Number.parseFloat(String(dkm)) || 0,
      durationMin: Number.parseFloat(String(dmin)) || 0,
      startLgtd: Number.parseFloat(String(slg)) || 0,
      startLttd: Number.parseFloat(String(slt)) || 0,
      endLgtd: Number.parseFloat(String(elg)) || 0,
      endLttd: Number.parseFloat(String(elt)) || 0,
    });
  }
  return out;
}

/** 列表：由多段巡检记录聚合整次巡河时间区间 */
const patrolAggregatedTimeRange = (r: PatrolRecordRow): string => {
  const segs = r.segments ?? [];
  if (!segs.length) return '—';
  const starts = [...segs].map(s => s.strtime).sort();
  const ends = [...segs].map(s => s.endtime).sort();
  return `${starts[0]} ~ ${ends[ends.length - 1]}`;
};

/** 新增/编辑类弹窗：与韶山水环境设施管理系统一致（内容区纵向滚动、避免表单 Row 撑出横向条） */
const formModalStyles = {
  body: {
    maxHeight: 'calc(100vh - 240px)',
    overflowY: 'auto' as const,
    overflowX: 'hidden' as const,
    minWidth: 0,
  },
};

/** 事务/河流等只读详情弹窗：与「应急协同」详情一致，内容区可滚动区域略增高 */
const affairDetailModalStyles = {
  ...formModalStyles,
  body: { ...formModalStyles.body, maxHeight: 'min(85vh, 900px)', overflowY: 'auto' as const },
};

// ==================== 表格字段管理（与韶山水环境设施管理系统一致） ====================

interface EcoColumnConfig {
  key: string;
  /** 表头展示，可为图标+文案等 */
  title: React.ReactNode;
  /** 字段管理面板中的简短标题（复杂 title 时必填，否则回退 key） */
  columnManagerLabel?: string;
  dataIndex?: string;
  width?: number;
  fixed?: 'left' | 'right';
  align?: 'left' | 'right' | 'center';
  render?: (value: any, record: any) => React.ReactNode;
  defaultVisible?: boolean;
}

interface EcoColumnManagerProps {
  columns: EcoColumnConfig[];
  visibleColumns: string[];
  onChange: (visibleColumns: string[]) => void;
}

const EcoColumnManager: React.FC<EcoColumnManagerProps> = ({ columns, visibleColumns, onChange }) => {
  const [open, setOpen] = useState(false);
  const [isSortMode, setIsSortMode] = useState(false);

  const handleToggleColumn = (key: string, checked: boolean) => {
    if (checked) {
      onChange([...visibleColumns, key]);
    } else {
      if (key === 'operation') {
        message.warning('操作列不可隐藏');
        return;
      }
      onChange(visibleColumns.filter(k => k !== key));
    }
  };

  const handleReset = () => {
    const defaultKeys = columns
      .filter(c => c.key !== 'operation' && c.defaultVisible !== false)
      .map(c => c.key);
    onChange(defaultKeys);
    message.success('已重置为默认显示');
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newOrder = [...visibleColumns];
    [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    onChange(newOrder);
  };

  const handleMoveDown = (index: number) => {
    if (index >= visibleColumns.length - 1) return;
    const newOrder = [...visibleColumns];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    onChange(newOrder);
  };

  const sortableColumns = visibleColumns.filter(key => key !== 'operation');

  const dropdownContent = (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>字段管理</span>
          <Button type="link" size="small" onClick={() => setIsSortMode(!isSortMode)}>
            {isSortMode ? '完成排序' : '排序'}
          </Button>
        </div>
      }
      style={{ width: isSortMode ? 360 : 320 }}
      size="small"
    >
      <div style={{ maxHeight: 400, overflow: 'auto' }}>
        {isSortMode ? (
          <>
            <div style={{ marginBottom: 12, fontSize: 12, color: '#999' }}>拖拽排序（点击上下箭头调整顺序）</div>
            {sortableColumns.map((key, index) => {
              const col = columns.find(c => c.key === key);
              const sortLabel =
                col?.columnManagerLabel ??
                (typeof col?.title === 'string' ? col.title : col?.key ?? key);
              return (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                >
                  <span style={{ flex: 1 }}>{sortLabel}</span>
                  <Space>
                    <Button type="text" size="small" disabled={index === 0} onClick={() => handleMoveUp(index)}>
                      ↑
                    </Button>
                    <Button
                      type="text"
                      size="small"
                      disabled={index === sortableColumns.length - 1}
                      onClick={() => handleMoveDown(index)}
                    >
                      ↓
                    </Button>
                  </Space>
                </div>
              );
            })}
            <div style={{ marginTop: 8, padding: '8px', background: '#f5f5f5', borderRadius: 4, fontSize: 12, color: '#666' }}>
              操作列始终固定在末尾
            </div>
          </>
        ) : (
          columns.map(col => (
            <div key={col.key} style={{ marginBottom: 8 }}>
              <Checkbox
                checked={col.key === 'operation' || visibleColumns.includes(col.key)}
                onChange={e => handleToggleColumn(col.key, e.target.checked)}
                disabled={col.key === 'operation'}
              >
                <Space>
                  {col.columnManagerLabel ?? (typeof col.title === 'string' ? col.title : col.key)}
                  {col.key === 'operation' && (
                    <Tag color="blue" style={{ fontSize: 10 }}>
                      固定
                    </Tag>
                  )}
                </Space>
              </Checkbox>
            </div>
          ))
        )}
      </div>
      {!isSortMode && (
        <>
          <Divider style={{ margin: '12px 0' }} />
          <Button type="link" onClick={handleReset} size="small">
            恢复默认
          </Button>
        </>
      )}
    </Card>
  );

  return (
    <Dropdown
      open={open}
      popupRender={() => dropdownContent}
      placement="bottomRight"
      onOpenChange={visible => {
        setOpen(visible);
        if (!visible) setIsSortMode(false);
      }}
    >
      <Tooltip title="字段管理">
        <Button icon={<ColumnHeightOutlined />}>字段</Button>
      </Tooltip>
    </Dropdown>
  );
};

const getEcoDefaultVisibleColumnKeys = (cols: EcoColumnConfig[]): string[] =>
  cols.filter(c => c.key !== 'operation' && c.defaultVisible !== false).map(c => c.key);

const ECO_DEFAULT_COL_WIDTH = 120;

/** 与设施管理一致：按可见列 width 累加为 scroll.x */
function getEcoTableScrollX(cols: { width?: number }[]): number {
  const total = cols.reduce(
    (sum, c) => sum + (typeof c.width === 'number' ? c.width : ECO_DEFAULT_COL_WIDTH),
    0,
  );
  return Math.max(total, 100);
}

/** 长文本列启用省略，避免监理单位/项目目标等撑破表布局（与 facility-table-wrap 横向滚动配合） */
const ECO_TABLE_ELLIPSIS_DATA_INDEX = new Set([
  'name',
  'code',
  'type',
  'location',
  'unit',
  'contractor',
  'supervisor',
  'projectGoal',
  'sectionId',
  'sectionName',
  'riverSystem',
  /** 河长通讯录 / 变更记录等长文本列 */
  'orgName',
  'areaName',
  'title',
  'changeReason',
  'handoverDesc',
  'remark',
  'affairCode',
  'affairTitle',
  'sectionId',
  'location',
  'responsibleOrg',
  'initiateSubject',
  'assignOrg',
  'undertakeOrg',
  'problemDescribe',
  'handlingProcess',
  'feedbackComment',
]);

/** 列表标题行工具栏：顺序与韶山水环境设施管理系统一致——导出 → 导入 → 字段（可选）→ 新增（可选） */
const EcoProtoExportBtn = ({ onClick }: { onClick?: () => void }) => (
  <Button
    icon={<DownloadOutlined />}
    className="export-btn"
    onClick={onClick ?? (() => message.success('已导出（原型示意）'))}
  >
    导出Excel
  </Button>
);

/** 统计页导出 PDF：勿加 export-btn，避免嵌入宿主按类名劫持为表格 Excel */
const EcoStatPdfExportBtn = ({ onClick }: { onClick?: () => void }) => (
  <Button
    htmlType="button"
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

function exportEcoTableExcel(
  rows: Record<string, unknown>[],
  columns: Array<{ key?: string; title?: unknown; dataIndex?: unknown }>,
  filePrefix: string,
  sheetName: string,
) {
  if (!rows.length) {
    message.warning('当前筛选条件下无数据可导出');
    return;
  }
  const EXCLUDE_KEYS = new Set(['key']);
  const allRowKeys = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const fromColumns = columns
    .map(col => {
      const key = String(col.key ?? col.dataIndex ?? '').trim();
      const dataIndex = typeof col.dataIndex === 'string' ? col.dataIndex : key;
      const title =
        typeof col.title === 'string' || typeof col.title === 'number' ?
          String(col.title)
        : key;
      if (!key || key === 'operation') return null;
      // 仅用于列表渲染的虚拟列（无 dataIndex 且行对象无同名字段）不参与导出
      if (typeof col.dataIndex !== 'string' && !allRowKeys.includes(key)) return null;
      return { key, title, dataIndex };
    })
    .filter(Boolean) as Array<{ key: string; title: string; dataIndex: string }>;
  const missingKeys = allRowKeys.filter(
    k => !EXCLUDE_KEYS.has(k) && !fromColumns.some(c => c.dataIndex === k || c.key === k),
  );
  const exportColumns = [
    ...fromColumns,
    ...missingKeys.map(k => ({ key: k, title: getExportFieldLabel(k), dataIndex: k })),
  ];
  if (!exportColumns.length) {
    message.warning('未找到可导出的字段');
    return;
  }
  downloadTableFullExcel(rows, exportColumns, filePrefix, sheetName);
  message.success('已导出 Excel（全量字段）');
}

const EcoProtoImportBtn = () => (
  <Upload
    beforeUpload={() => {
      message.success('已导入（原型示意）');
      return false;
    }}
    showUploadList={false}
  >
    <Button icon={<UploadOutlined />}>导入</Button>
  </Upload>
);

/** 按字段管理顺序与显隐生成 Table 列；操作列 key 固定为 operation，右侧固定 */
function buildTableColumnsFromEcoConfig(
  allCols: EcoColumnConfig[],
  visibleKeys: string[],
  operationRender: (record: any) => React.ReactNode,
): any[] {
  return allCols
    .filter(col => visibleKeys.includes(col.key) || col.key === 'operation')
    .sort((a, b) => {
      if (a.key === 'operation') return 1;
      if (b.key === 'operation') return -1;
      return visibleKeys.indexOf(a.key) - visibleKeys.indexOf(b.key);
    })
    .map(col => {
      if (col.key === 'operation') {
        const { defaultVisible: _opDv, ...opRest } = col;
        return {
          ...opRest,
          fixed: 'right' as const,
          render: (_: unknown, record: any) => operationRender(record),
        };
      }
      const ellipsis =
        typeof col.dataIndex === 'string' && ECO_TABLE_ELLIPSIS_DATA_INDEX.has(col.dataIndex);
      const { defaultVisible: _dv, ...rest } = col;
      return { ...rest, ...(ellipsis ? { ellipsis: true } : {}) };
    });
}

/** 河湖长制侧栏子项：叶子菜单，或「河道水体」下的分组 */
type EcoRiverChiefSubLeaf = { key: string; icon: React.ReactNode; label: string };
type EcoRiverChiefSubItem =
  | EcoRiverChiefSubLeaf
  | { key: string; icon: React.ReactNode; label: string; children: EcoRiverChiefSubLeaf[] };

function isEcoSubBranch(item: EcoRiverChiefSubItem): item is EcoRiverChiefSubItem & { children: EcoRiverChiefSubLeaf[] } {
  return 'children' in item && Array.isArray((item as { children: unknown }).children);
}

function ecoSubItemContainsActiveKey(item: EcoRiverChiefSubItem, activeKey: string): boolean {
  if (isEcoSubBranch(item)) return item.children.some(c => c.key === activeKey);
  return item.key === activeKey;
}

function ecoMenuChildrenContainsKey(children: EcoRiverChiefSubItem[], key: string): boolean {
  return children.some(c => ecoSubItemContainsActiveKey(c, key));
}

/** 侧栏结构：与「韶山水环境设施管理系统」一致；河湖长制下「河道水体」含三级子菜单 */
const ECO_SIDEBAR_MENUS: {
  key: 'project' | 'river-chief';
  label: string;
  icon: React.ReactNode;
  children: EcoRiverChiefSubItem[];
}[] = [
  {
    key: 'project',
    label: '项目管理',
    icon: <ProjectOutlined />,
    children: [
      { key: 'archive', icon: <FileTextOutlined />, label: '项目档案' },
      { key: 'summary', icon: <BarChartOutlined />, label: '项目汇总统计' },
    ],
  },
  {
    key: 'river-chief',
    label: '河湖长制',
    icon: <EnvironmentOutlined />,
    children: [
      { key: 'section', icon: <EnvironmentOutlined />, label: '责任段信息' },
      {
        key: 'water-body',
        icon: <BankOutlined />,
        label: '河道水体',
        children: [
          { key: 'river-channel', icon: <BranchesOutlined />, label: '河流信息' },
          { key: 'lake-water', icon: <CloudOutlined />, label: '湖泊信息' },
        ],
      },
      { key: 'chief-area', icon: <FlagOutlined />, label: '河长责任区域' },
      { key: 'patrol', icon: <AuditOutlined />, label: '巡河信息' },
      { key: 'patrol-stats', icon: <PieChartOutlined />, label: '巡河数据统计' },
      { key: 'task', icon: <FileTextOutlined />, label: '任务完成情况' },
      { key: 'task-stats', icon: <BarChartOutlined />, label: '任务完成统计' },
      { key: 'monitor', icon: <DashboardOutlined />, label: '水质监测公示' },
      { key: 'affairs', icon: <FileTextOutlined />, label: '事务列表' },
      { key: 'score', icon: <TrophyOutlined />, label: '履职综合评分' },
      { key: 'score-stats', icon: <LineChartOutlined />, label: '履职综合评分统计' },
      { key: 'contacts', icon: <TeamOutlined />, label: '河长通讯录' },
      { key: 'changes', icon: <SwapOutlined />, label: '河长变更记录' },
    ],
  },
];

// ============ 初始模拟数据（项目档案见 `eco-project-archive-demo.ts`） ============

/** 项目状态（与档案表单选项一致，供统计图归类） */
const PROJECT_STATUSES_FOR_STAT = ['设计中', '招标中', '施工中', '已完工'] as const;

// 文档类型配置
const documentTypeConfig: Record<DocumentType, { label: string; color: string; icon: any }> = {
  feasibility: { label: '可行性研究报告', color: '#1890ff', icon: FileTextOutlined },
  design: { label: '设计图纸', color: '#52c41a', icon: FileImageOutlined },
  bidding: { label: '招投标文件', color: '#faad14', icon: FileTextOutlined },
  contract: { label: '施工合同', color: '#722ed1', icon: FileWordOutlined },
  completion: { label: '竣工验收报告', color: '#13c2c2', icon: FilePdfOutlined },
  audit: { label: '审计报告', color: '#eb2f96', icon: FilePdfOutlined },
  operation: { label: '运维记录', color: '#f5222d', icon: FileOutlined },
};

/** 快速上传：资料类型与列表展示名称（与模拟数据字段一致） */
const quickUploadDocNames: Record<DocumentType, string> = {
  feasibility: '项目可行性研究报告',
  design: '设计图纸',
  bidding: '招投标文件',
  contract: '施工合同',
  completion: '竣工验收报告',
  audit: '审计报告',
  operation: '运维记录',
};

function formatFileSizeBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function projectDocFromLocalFile(docType: DocumentType, file: File): ProjectDocument {
  return {
    id: `doc-local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: quickUploadDocNames[docType],
    type: docType,
    fileName: file.name,
    fileSize: formatFileSizeBytes(file.size),
    uploadTime: dayjs().format('YYYY-MM-DD'),
    uploader: '本机',
  };
}

/** 河湖长制专项任务台账行（任务完成情况 / 任务完成统计共享） */
interface RiverChiefTaskRow {
  key: string;
  name: string;
  type: string;
  assignee: string;
  /** YYYY-MM-DD */
  deadline: string;
  progress: number;
  status: string;
  description?: string;
}

const initialTaskData: RiverChiefTaskRow[] = [
  {
    key: '1',
    name: '湘江排污口排查整治',
    type: '排查整治',
    assignee: '长沙市环保局',
    deadline: '2024-07-30',
    progress: 75,
    status: '进行中',
    description: '全面排查湘江沿线排污口并制定整治方案。',
  },
  {
    key: '2',
    name: '浏阳河沿岸垃圾清理',
    type: '清理维护',
    assignee: '浏阳市城管局',
    deadline: '2024-06-20',
    progress: 100,
    status: '已完成',
    description: '清理浏阳河沿岸积存垃圾。',
  },
  {
    key: '3',
    name: '捞刀河水域岸线保护',
    type: '保护修复',
    assignee: '长沙县水利局',
    deadline: '2024-08-15',
    progress: 30,
    status: '进行中',
    description: '捞刀河水域岸线生态保护和修复工作。',
  },
  {
    key: '4',
    name: '靳江河流域污染源治理',
    type: '污染治理',
    assignee: '宁乡市环保局',
    deadline: '2024-09-30',
    progress: 15,
    status: '进行中',
    description: '靳江河流域工业及农业污染源治理。',
  },
  {
    key: '5',
    name: '韶山港支流排口整治（演示逾期）',
    type: '污染治理',
    assignee: '湘潭市生态环境局韶山分局',
    deadline: '2024-01-15',
    progress: 45,
    status: '已逾期',
    description: '演示：已超期未完成，用于统计逾期率与质量分析。',
  },
];

const TASK_TYPES = ['排查整治', '清理维护', '保护修复', '污染治理'] as const;

/** 是否逾期：显式已逾期，或未完结且已过完成期限当日 */
function taskRowIsOverdue(t: RiverChiefTaskRow): boolean {
  if (t.status === '已逾期') return true;
  if (t.status === '已完成') return false;
  return dayjs(t.deadline).endOf('day').isBefore(dayjs());
}

/** 临期：未完结且完成期限在今日起算 days 天内（含当日） */
function taskRowIsDueWithin(t: RiverChiefTaskRow, days: number): boolean {
  if (t.status === '已完成') return false;
  const d = dayjs(t.deadline).startOf('day');
  const now = dayjs().startOf('day');
  if (d.isBefore(now)) return false;
  return d.diff(now, 'day') <= days;
}

// 文档列表组件
const DocumentList: React.FC<{
  documents: ProjectDocument[];
  canEdit?: boolean;
  onDelete?: (docId: string) => void;
}> = ({ documents, canEdit, onDelete }) => {
  const getFileIcon = (type: DocumentType) => {
    const IconComponent = documentTypeConfig[type]?.icon || FileOutlined;
    return <IconComponent style={{ color: documentTypeConfig[type]?.color, fontSize: 24 }} />;
  };

  if (documents.length === 0) {
    return <Empty description="暂无项目资料" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <List
      dataSource={documents}
      renderItem={(doc) => (
        <List.Item
          actions={[
            <Button key="view" type="link" className="action-btn detail" icon={<EyeOutlined />}>详情</Button>,
            <Button key="dl" type="link" className="action-btn detail" icon={<DownloadOutlined />}>下载</Button>,
            canEdit && onDelete && (
              <Button key="del" type="link" className="action-btn delete" icon={<DeleteOutlined />} onClick={() => onDelete(doc.id)}>删除</Button>
            ),
          ]}
        >
          <List.Item.Meta
            avatar={getFileIcon(doc.type)}
            title={
              <Space>
                <Text strong>{doc.name}</Text>
                <Tag color={documentTypeConfig[doc.type]?.color}>{documentTypeConfig[doc.type]?.label}</Tag>
              </Space>
            }
            description={
              <Space size={16}>
                <Text type="secondary">{doc.fileName}</Text>
                <Text type="secondary">大小: {doc.fileSize}</Text>
                <Text type="secondary">上传时间: {doc.uploadTime}</Text>
                <Text type="secondary">上传人: {doc.uploader}</Text>
              </Space>
            }
          />
        </List.Item>
      )}
    />
  );
};

/** 项目档案 · 建设地点地图选点：`EmergencyEventFormMap` + 逆地理；与事务列表、应急事件信息地图模块交互一致。 */
const ProjectArchiveMapLocationPicker: React.FC<{ form: FormInstance }> = ({ form }) => {
  const lngWatch = Form.useWatch('longitude', form);
  const latWatch = Form.useWatch('latitude', form);
  const locWatch = Form.useWatch('location', form);
  return (
    <EmergencyEventFormMap
      longitude={String(lngWatch ?? '').trim()}
      latitude={String(latWatch ?? '').trim()}
      location={String(locWatch ?? '').trim()}
      reverseGeocodeLocation
      mapAriaLabel="建设地点地图"
      mapToolbarHint="在地图上轻点选点或拖动图钉；在可覆盖前提下将尝试在线逆地理为具体地址并填入「建设地点」（需联网）。失败时使用不含坐标的中文示意门牌占位，请改为实际地址。若建设地点为手工录入，点选后只更新经纬度，不覆盖文字。"
      onFormSync={patch => {
        form.setFieldsValue(patch);
      }}
    />
  );
};

// ============ 项目档案组件（含增删查改和项目资料管理） ============

const ProjectArchive: React.FC<{
  projects: EcoProjectArchiveRow[];
  onProjectsChange: React.Dispatch<React.SetStateAction<EcoProjectArchiveRow[]>>;
}> = ({ projects: data, onProjectsChange: setData }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [viewRecord, setViewRecord] = useState<EcoProjectArchiveRow | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [currentProjectForDoc, setCurrentProjectForDoc] = useState<any>(null);
  const [filterProjectName, setFilterProjectName] = useState('');
  const [filterProjectCode, setFilterProjectCode] = useState('');
  const [filterType, setFilterType] = useState<string | undefined>();
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState('basic');
  /** 新增项目时暂存的资料列表（保存时写入新记录） */
  const [draftDocuments, setDraftDocuments] = useState<ProjectDocument[]>([]);
  const [form] = Form.useForm();
  /** 快速上传：隐藏 file 输入与当前选择的资料类型 */
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const pendingDocTypeRef = useRef<DocumentType | null>(null);

  const triggerLocalDocPick = (docType: DocumentType) => {
    pendingDocTypeRef.current = docType;
    docFileInputRef.current?.click();
  };

  const onLocalDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    const docType = pendingDocTypeRef.current;
    pendingDocTypeRef.current = null;
    input.value = '';
    if (!file || !docType) return;
    const doc = projectDocFromLocalFile(docType, file);
    if (editingRecord) {
      const nextDocs = [...(editingRecord.documents || []), doc];
      const updatedProject = { ...editingRecord, documents: nextDocs };
      setEditingRecord(updatedProject);
      setData(data.map(item => (item.key === editingRecord.key ? updatedProject : item)));
    } else {
      setDraftDocuments(prev => [...prev, doc]);
    }
    message.success(`已选择「${file.name}」并加入资料列表`);
  };

  // 过滤数据（项目名称、编号分开展示，多条件为 AND）
  const filteredData = data.filter(item => {
    const nameKw = filterProjectName.trim();
    const codeKw = filterProjectCode.trim();
    const matchName = !nameKw || item.name.includes(nameKw);
    const matchCode = !codeKw || item.code.includes(codeKw);
    const matchType = !filterType || item.type === filterType;
    const matchStatus = !filterStatus || item.status === filterStatus;
    return matchName && matchCode && matchType && matchStatus;
  });

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setDraftDocuments([]);
    setActiveTab('basic');
    setIsModalOpen(true);
  };

  // 打开编辑弹窗
  const handleEdit = (record: any) => {
    setDraftDocuments([]);
    setEditingRecord(record);
    // 将日期字符串转换为 dayjs 对象
    const formValues = {
      ...record,
      startDate: record.startDate ? dayjs(record.startDate) : undefined,
      endDate: record.endDate ? dayjs(record.endDate) : undefined,
    };
    form.setFieldsValue(formValues);
    setActiveTab('basic');
    setIsModalOpen(true);
  };

  // 查看详情
  const handleView = (record: any) => {
    setViewRecord(record);
    setIsViewModalOpen(true);
  };

  // 打开项目资料管理
  const handleManageDocs = (record: any) => {
    setCurrentProjectForDoc(record);
    setIsDocModalOpen(true);
  };

  // 删除项目
  const handleDelete = (key: string) => {
    setData(data.filter(item => item.key !== key));
    message.success('删除成功');
  };

  // 保存项目（新增或编辑）
  const handleSave = () => {
    form.validateFields().then(values => {
      // 将 dayjs 对象转换为字符串格式
      const formattedValues = {
        ...values,
        startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : undefined,
        endDate: values.endDate ? values.endDate.format('YYYY-MM-DD') : undefined,
      };
      
      if (editingRecord) {
        // 编辑 - 保留原有文档
        setData(data.map(item => 
          item.key === editingRecord.key ? { ...item, ...formattedValues, documents: item.documents } : item
        ));
        message.success('修改成功');
      } else {
        // 新增（含弹窗内「项目资料」页暂存的资料）
        const newKey = (Math.max(...data.map(d => parseInt(d.key)), 0) + 1).toString();
        setData([...data, { ...formattedValues, key: newKey, documents: [...draftDocuments] }]);
        message.success('新增成功');
      }
      setIsModalOpen(false);
      form.resetFields();
      setDraftDocuments([]);
    });
  };

  const allProjectColumns: EcoColumnConfig[] = [
    { key: 'name', title: '项目名称', dataIndex: 'name', width: 180, defaultVisible: true },
    { key: 'code', title: '项目编号', dataIndex: 'code', width: 120, defaultVisible: true },
    { key: 'type', title: '项目类型', dataIndex: 'type', width: 110, defaultVisible: true },
    { key: 'location', title: '建设地点', dataIndex: 'location', width: 130, defaultVisible: true },
    {
      key: 'planPeriod',
      title: '规划工期',
      width: 200,
      defaultVisible: true,
      render: (_: unknown, r: { startDate?: string; endDate?: string }) =>
        r.startDate && r.endDate ? `${r.startDate} ～ ${r.endDate}` : '—',
    },
    {
      key: 'investment',
      title: '投资金额',
      dataIndex: 'investment',
      width: 100,
      defaultVisible: true,
      render: (val: number) => `${val}万元`,
    },
    {
      key: 'status',
      title: '项目状态',
      dataIndex: 'status',
      width: 90,
      defaultVisible: true,
      render: (status: string) => {
        const colors: Record<string, string> = {
          施工中: 'processing',
          已完工: 'success',
          设计中: 'warning',
          招标中: 'default',
        };
        return <Tag color={colors[status]}>{status}</Tag>;
      },
    },
    {
      key: 'progress',
      title: '完成进度',
      dataIndex: 'progress',
      width: 100,
      defaultVisible: true,
      render: (val: number) => <Progress percent={val} size="small" />,
    },
    { key: 'unit', title: '责任单位', dataIndex: 'unit', width: 130, defaultVisible: true },
    { key: 'contractor', title: '施工单位', dataIndex: 'contractor', width: 110, defaultVisible: true },
    { key: 'supervisor', title: '监理单位', dataIndex: 'supervisor', width: 140, defaultVisible: true },
    { key: 'projectGoal', title: '项目目标', dataIndex: 'projectGoal', width: 180, defaultVisible: true },
    {
      key: 'docs',
      title: '项目资料',
      width: 100,
      defaultVisible: true,
      render: (_: any, record: any) => (
        <Badge count={record.documents?.length || 0} size="small" color="#1890ff">
          <Button type="link" className="action-btn detail" icon={<FileTextOutlined />} onClick={() => handleManageDocs(record)}>
            资料
          </Button>
        </Badge>
      ),
    },
    { key: 'operation', title: '操作', width: 140, defaultVisible: true },
  ];

  const [visibleProjectColumns, setVisibleProjectColumns] = useState<string[]>(() =>
    getEcoDefaultVisibleColumnKeys(allProjectColumns),
  );

  const projectTableColumns = buildTableColumnsFromEcoConfig(
    allProjectColumns,
    visibleProjectColumns,
    record => (
      <Space size="small">
        <Button type="link" className="action-btn detail" icon={<EyeOutlined />} onClick={() => handleView(record)}>
          详情
        </Button>
        <Button type="link" className="action-btn edit" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
          编辑
        </Button>
      </Space>
    ),
  );

  const projectTableScrollX = getEcoTableScrollX(
    allProjectColumns.filter(c => visibleProjectColumns.includes(c.key) || c.key === 'operation'),
  );

  return (
    <div className="facility-view">
      {/* 项目资料快速上传：调起系统文件选择器（仅前端列表，不落盘） */}
      <input
        ref={docFileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={onLocalDocFileChange}
      />
      <Card
        title="项目档案"
        extra={
          <Space wrap size={[8, 8]} align="center">
            <EcoProtoExportBtn
              onClick={() =>
                exportEcoTableExcel(
                  filteredData as unknown as Record<string, unknown>[],
                  allProjectColumns as unknown as Array<{ key?: string; title?: unknown; dataIndex?: unknown }>,
                  '生态整治_项目档案',
                  '项目档案',
                )
              }
            />
            <EcoProtoImportBtn />
            <EcoColumnManager
              columns={allProjectColumns}
              visibleColumns={visibleProjectColumns}
              onChange={setVisibleProjectColumns}
            />
            <Button type="primary" icon={<PlusOutlined />} className="add-btn" onClick={handleAdd}>
              新增
            </Button>
          </Space>
        }
      >
        <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8} lg={5}>
            <Select
              placeholder="项目类型"
              style={{ width: '100%' }}
              allowClear
              value={filterType}
              onChange={setFilterType}
            >
              <Option value="水生态修复">水生态修复</Option>
              <Option value="黑臭水体治理">黑臭水体治理</Option>
              <Option value="湿地保护">湿地保护</Option>
              <Option value="河道清淤">河道清淤</Option>
              <Option value="管网建设">管网建设</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={5}>
            <Select
              placeholder="项目状态"
              style={{ width: '100%' }}
              allowClear
              value={filterStatus}
              onChange={setFilterStatus}
            >
              <Option value="设计中">设计中</Option>
              <Option value="招标中">招标中</Option>
              <Option value="施工中">施工中</Option>
              <Option value="已完工">已完工</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={5}>
            <Input
              placeholder="项目名称"
              prefix={<SearchOutlined />}
              value={filterProjectName}
              onChange={e => setFilterProjectName(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={5}>
            <Input
              placeholder="项目编号"
              prefix={<SearchOutlined />}
              value={filterProjectCode}
              onChange={e => setFilterProjectCode(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={8}>
            <Space>
              <Button type="primary" className="search-btn" icon={<SearchOutlined />}>
                查询
              </Button>
              <Button
                onClick={() => {
                  setFilterType(undefined);
                  setFilterStatus(undefined);
                  setFilterProjectName('');
                  setFilterProjectCode('');
                }}
              >
                重置
              </Button>
            </Space>
          </Col>
        </Row>
        <div className="facility-table-wrap">
          <Table
            size="small"
            columns={projectTableColumns}
            dataSource={filteredData}
            pagination={{ defaultPageSize: 10 }}
            scroll={{ x: projectTableScrollX }}
            rowKey="key"
          />
        </div>
      </Card>

      {/* 新增/编辑弹窗 */}
      <Modal
        styles={formModalStyles}
        title={editingRecord ? '编辑项目' : '新增项目'}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
          setDraftDocuments([]);
        }}
        width={900}
        footer={
          <Space>
            {editingRecord && (
              <Popconfirm
                title="确认删除"
                description="确定要删除该项目吗？此操作不可恢复。"
                onConfirm={() => {
                  handleDelete(editingRecord.key);
                  setIsModalOpen(false);
                  form.resetFields();
                  setDraftDocuments([]);
                }}
                okText="确定"
                cancelText="取消"
              >
                <Button danger>删除</Button>
              </Popconfirm>
            )}
            <Button
              onClick={() => {
                setIsModalOpen(false);
                form.resetFields();
                setDraftDocuments([]);
              }}
            >
              取消
            </Button>
            <Button type="primary" onClick={handleSave}>
              保存
            </Button>
          </Space>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ marginTop: 8 }}>
          <TabPane tab="基本信息" key="basic">
            <Form form={form} layout="vertical">
              <Divider titlePlacement="start">基础信息</Divider>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="name" label="项目名称" rules={[{ required: true, message: '请输入项目名称' }]}>
                    <Input placeholder="请输入项目名称" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="code" label="项目编号" rules={[{ required: true, message: '请输入项目编号' }]}>
                    <Input placeholder="如：XJ-2024-001" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="type" label="项目类型" rules={[{ required: true, message: '请选择项目类型' }]}>
                    <Select placeholder="请选择">
                      <Option value="水生态修复">水生态修复</Option>
                      <Option value="黑臭水体治理">黑臭水体治理</Option>
                      <Option value="湿地保护">湿地保护</Option>
                      <Option value="河道清淤">河道清淤</Option>
                      <Option value="管网建设">管网建设</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="adminDivision"
                    label="所属区划"
                    rules={[{ required: true, message: '请选择所属区划（至村/社区级）' }]}
                    tooltip="韶山市所属区划树；请选择至村（社区）级节点，界面仅展示名称不写编码"
                  >
                    <TreeSelect
                      showSearch
                      allowClear
                      treeDefaultExpandAll
                      treeLine
                      treeNodeFilterProp="title"
                      placeholder="请选择韶山市所属区划（至村/社区级）"
                      style={{ width: '100%' }}
                      dropdownStyle={{ maxHeight: 360, overflow: 'auto' }}
                      treeData={SHAOSHAN_ADMIN_TREE_TO_VILLAGE}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item
                name="location"
                label="建设地点"
                rules={[{ required: true, message: '请输入建设地点' }]}
                extra={
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    可点击地图选点，系统将尝试按坐标逆地理解析并自动填入；也可随时在本框手动输入或修改地址描述。
                  </Text>
                }
              >
                <Input placeholder="地图选点自动解析，或手动输入建设地点" />
              </Form.Item>
              <Form.Item label="建设地点地图" colon={false}>
                <ProjectArchiveMapLocationPicker form={form} />
              </Form.Item>
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="longitude" label="经度（度）" tooltip="可与地图选点同步">
                    <Input placeholder="选填，地图选点后自动回填" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="latitude" label="纬度（度）" tooltip="可与地图选点同步">
                    <Input placeholder="选填，地图选点后自动回填" />
                  </Form.Item>
                </Col>
              </Row>
              <Divider titlePlacement="start">规划工期</Divider>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="startDate" label="计划开始日期">
                    <DatePicker style={{ width: '100%' }} placeholder="规划工期起点" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="endDate" label="计划结束日期">
                    <DatePicker style={{ width: '100%' }} placeholder="规划工期终点" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="investment" label="投资金额（万元）" rules={[{ required: true, message: '请输入投资金额' }]}>
                    <InputNumber style={{ width: '100%' }} min={0} placeholder="请输入" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="status" label="项目状态" rules={[{ required: true, message: '请选择项目状态' }]}>
                    <Select placeholder="请选择">
                      <Option value="设计中">设计中</Option>
                      <Option value="招标中">招标中</Option>
                      <Option value="施工中">施工中</Option>
                      <Option value="已完工">已完工</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="progress" label="完成进度（%）" rules={[{ required: true, message: '请输入完成进度' }]}>
                    <InputNumber style={{ width: '100%' }} min={0} max={100} placeholder="0-100" />
                  </Form.Item>
                </Col>
              </Row>
              <Divider titlePlacement="start">参建与责任主体</Divider>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="unit" label="责任单位" rules={[{ required: true, message: '请输入责任单位' }]}>
                    <Input placeholder="项目主管/牵头单位" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="contractor" label="施工单位">
                    <Input placeholder="承建单位，未确定可填待定" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="supervisor" label="监理单位">
                    <Input placeholder="监理单位，未招标可填待定" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item
                name="projectGoal"
                label="项目目标"
                rules={[{ required: true, message: '请填写项目目标' }]}
              >
                <TextArea rows={3} placeholder="治理目标、水质或工程量等预期目标，用于管理决策与考核依据" maxLength={500} showCount />
              </Form.Item>
              <Form.Item name="description" label="项目描述 / 建设内容说明">
                <TextArea rows={3} placeholder="建设内容、技术路线等补充说明（选填）" />
              </Form.Item>
            </Form>
          </TabPane>
            <TabPane 
            tab={
              <span>
                <PaperClipOutlined /> 项目资料 (
                {editingRecord ? editingRecord.documents?.length || 0 : draftDocuments.length})
              </span>
            }
              key="documents"
            >
              <Card size="small" title="快速上传" style={{ marginBottom: 16 }}>
                <Space wrap>
                <Button icon={<UploadOutlined />} onClick={() => triggerLocalDocPick('feasibility')}>可行性研究报告</Button>
                <Button icon={<UploadOutlined />} onClick={() => triggerLocalDocPick('design')}>设计图纸</Button>
                <Button icon={<UploadOutlined />} onClick={() => triggerLocalDocPick('bidding')}>招投标文件</Button>
                <Button icon={<UploadOutlined />} onClick={() => triggerLocalDocPick('contract')}>施工合同</Button>
                <Button icon={<UploadOutlined />} onClick={() => triggerLocalDocPick('completion')}>竣工验收报告</Button>
                <Button icon={<UploadOutlined />} onClick={() => triggerLocalDocPick('audit')}>审计报告</Button>
                <Button icon={<UploadOutlined />} onClick={() => triggerLocalDocPick('operation')}>运维记录</Button>
                </Space>
              </Card>
              <Card size="small" title="项目资料列表" style={{ marginBottom: 16 }}>
                <DocumentList 
                documents={editingRecord ? editingRecord.documents || [] : draftDocuments}
                canEdit
                onDelete={docId => {
                  if (editingRecord) {
                    const updatedDocs = (editingRecord.documents || []).filter((d: ProjectDocument) => d.id !== docId);
                    const updatedProject = { ...editingRecord, documents: updatedDocs };
                    setEditingRecord(updatedProject);
                    setData(data.map(item => (item.key === editingRecord.key ? updatedProject : item)));
                  } else {
                    setDraftDocuments(draftDocuments.filter(d => d.id !== docId));
                  }
                    message.success('项目资料已删除');
                  }}
                />
              </Card>
            </TabPane>
        </Tabs>
      </Modal>

      {/* 项目资料管理弹窗 */}
      <Modal
        styles={formModalStyles}
        title={currentProjectForDoc ? `${currentProjectForDoc.name} - 项目资料` : '项目资料'}
        open={isDocModalOpen}
        onCancel={() => { setIsDocModalOpen(false); setCurrentProjectForDoc(null); }}
        footer={null}
        width={900}
      >
        {currentProjectForDoc && (
          <div>
            <Card size="small" title={`项目资料列表 (${currentProjectForDoc.documents?.length || 0}个)`}>
              <DocumentList 
                documents={currentProjectForDoc.documents || []} 
              />
            </Card>
          </div>
        )}
      </Modal>

      {/* 查看详情弹窗 */}
      <Modal
        styles={formModalStyles}
        title="项目详情"
        open={isViewModalOpen}
        onCancel={() => setIsViewModalOpen(false)}
        footer={null}
        width={900}
      >
        {viewRecord ? <EcoProjectArchiveReadonlyDetail viewRecord={viewRecord} /> : null}
      </Modal>
    </div>
  );
};

// ============ 责任段管理组件（含增删查改） ============

const RiverSection: React.FC<{
  sections: RiverSectionRow[];
  onSectionsChange: (rows: RiverSectionRow[]) => void;
  riverChannels: RiverChannelMasterRow[];
  /** 责任河长与「河长通讯录」河长一致 */
  chiefContacts: RiverChiefContactRow[];
}> = ({ sections: data, onSectionsChange, riverChannels, chiefContacts }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RiverSectionRow | null>(null);
  const [viewRecord, setViewRecord] = useState<RiverSectionRow | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [filterSectionName, setFilterSectionName] = useState('');
  const [filterSectionId, setFilterSectionId] = useState('');
  const [filterLevel, setFilterLevel] = useState<AdminLevel | undefined>();
  const [form] = Form.useForm();
  const linkedRiverFormWatch = Form.useWatch('linkedRiverObjectId', form);
  const chiefNamePickOptions = useMemo(
    () => getChiefNameSelectOptions(chiefContacts, editingRecord?.chiefName),
    [chiefContacts, editingRecord?.chiefName],
  );

  /** 所属水系随所选河流主数据自动带出，无需手填 */
  useEffect(() => {
    const rid = linkedRiverFormWatch as string | undefined;
    if (!rid) {
      form.setFieldValue('riverSystem', '');
      return;
    }
    const ch = riverChannels.find(r => r.riverObjectId === rid);
    const fromMaster = (ch?.riverSystem ?? '').trim();
    const fromSection = data.find(s => s.linkedRiverObjectId === rid)?.riverSystem?.trim() ?? '';
    form.setFieldValue('riverSystem', fromMaster || fromSection);
  }, [linkedRiverFormWatch, riverChannels, form, data]);

  const filteredData = data.filter(item => {
    const nameKw = filterSectionName.trim();
    const idKw = filterSectionId.trim();
    const matchName = !nameKw || item.sectionName.includes(nameKw);
    const matchId = !idKw || item.sectionId.includes(idKw);
    const matchLevel = !filterLevel || item.adminLevel === filterLevel;
    return matchName && matchId && matchLevel;
  });

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      parentId: undefined,
      linkedRiverObjectId: riverChannels[0]?.riverObjectId ?? '',
      startLgtd: 112.94,
      startLttd: 28.2,
      endLgtd: 112.95,
      endLttd: 28.21,
      riverDist: 'T' as RiverDist,
      runoffVolume: 0,
      lowflowVolume: 0,
      gaugingStation: 0,
      leftBranch: 0,
      rightBranch: 0,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (record: RiverSectionRow) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const handleView = (record: RiverSectionRow) => {
    setViewRecord(record);
    setIsViewModalOpen(true);
  };

  const handleDelete = (key: string) => {
    onSectionsChange(data.filter(item => item.key !== key));
    message.success('删除成功');
  };

  const handleSave = () => {
    form.validateFields().then((values: Partial<RiverSectionRow>) => {
      const row: RiverSectionRow = {
        key: editingRecord?.key ?? (Math.max(...data.map(d => parseInt(d.key, 10)), 0) + 1).toString(),
        sectionId: values.sectionId!,
        sectionName: values.sectionName!,
        riverSystem:
          riverChannels.find(r => r.riverObjectId === ((values.linkedRiverObjectId as string) ?? ''))?.riverSystem ??
          (values.riverSystem as string) ??
          '',
        riverSide: values.riverSide as RiverSide,
        startAddr: values.startAddr!,
        endAddr: values.endAddr!,
        sectionType: values.sectionType as SectionType,
        addvcd: values.addvcd!,
        adminLevel: values.adminLevel as AdminLevel,
        riverLenKm: Number(values.riverLenKm),
        basinAreaKm2: Number(values.basinAreaKm2),
        adminAgency: values.adminAgency!,
        introduction: values.introduction ?? '',
        remarks: values.remarks ?? '',
        chiefName: values.chiefName!,
        chiefMobile: values.chiefMobile!,
        linkedRiverObjectId: (values.linkedRiverObjectId as string) ?? '',
        parentId: (values.parentId as string) ?? '',
        parentName: (() => {
          const pid = values.parentId as string | undefined;
          if (!pid) return '';
          return data.find(d => d.sectionId === pid)?.sectionName ?? '';
        })(),
        startLgtd: Number(values.startLgtd),
        startLttd: Number(values.startLttd),
        endLgtd: Number(values.endLgtd),
        endLttd: Number(values.endLttd),
        riverDist: values.riverDist as RiverDist,
        runoffVolume: Number(values.runoffVolume),
        lowflowVolume: Number(values.lowflowVolume),
        gaugingStation: Number(values.gaugingStation),
        leftBranch: Number(values.leftBranch),
        rightBranch: Number(values.rightBranch),
      };
      if (editingRecord) {
        onSectionsChange(data.map(item => (item.key === editingRecord.key ? row : item)));
        message.success('修改成功');
      } else {
        onSectionsChange([...data, row]);
        message.success('新增成功');
      }
      setIsModalOpen(false);
      form.resetFields();
    });
  };

  /** 上一级河段：自本列表其他责任段选择，不含当前编辑行；若历史 parentId 已不在列表则保留一条仅用于回显 */
  const parentReachSelectOptions = useMemo(() => {
    const others = data.filter(row => row.key !== editingRecord?.key);
    const list = others.map(row => ({
      value: row.sectionId,
      label: `${row.sectionName}（${row.sectionId}）`,
    }));
    const pid = editingRecord?.parentId;
    if (pid && !list.some(o => o.value === pid)) {
      list.unshift({
        value: pid,
        label: `${editingRecord.parentName || '上一级河段'}（${pid}）`,
      });
    }
    return list;
  }, [data, editingRecord]);

  const allRiverColumns: EcoColumnConfig[] = [
    { key: 'sectionId', title: '河段编码', dataIndex: 'sectionId', width: 220, defaultVisible: true },
    { key: 'sectionName', title: '河段名称', dataIndex: 'sectionName', width: 160, defaultVisible: true },
    {
      key: 'linkedRiverObjectId',
      title: '所属河流',
      dataIndex: 'linkedRiverObjectId',
      width: 140,
      defaultVisible: true,
      render: (id: string) => {
        const nm = riverChannels.find(r => r.riverObjectId === id)?.riverName;
        return nm || id || '—';
      },
    },
    { key: 'riverSystem', title: '所属水系', dataIndex: 'riverSystem', width: 100, defaultVisible: true },
    {
      key: 'riverSide',
      title: '岸别',
      dataIndex: 'riverSide',
      width: 72,
      defaultVisible: true,
      render: (s: RiverSide) => <Tag>{RIVER_SIDE_LABEL[s]}</Tag>,
    },
    {
      key: 'sectionType',
      title: '河段类型',
      dataIndex: 'sectionType',
      width: 100,
      defaultVisible: true,
      render: (t: number) => SECTION_TYPE_LABEL[t] ?? t,
    },
    {
      key: 'adminLevel',
      title: '管理级别',
      dataIndex: 'adminLevel',
      width: 72,
      defaultVisible: true,
      render: (a: AdminLevel) => (
        <Tag color={a === 'A' ? 'red' : a === 'B' ? 'blue' : 'green'}>{ADMIN_LEVEL_LABEL[a]}</Tag>
      ),
    },
    { key: 'chiefName', title: '河长', dataIndex: 'chiefName', width: 80, defaultVisible: true },
    { key: 'chiefMobile', title: '河长手机', dataIndex: 'chiefMobile', width: 110, defaultVisible: true },
    { key: 'operation', title: '操作', width: 140, defaultVisible: true },
  ];

  const [visibleRiverColumns, setVisibleRiverColumns] = useState<string[]>(() =>
    getEcoDefaultVisibleColumnKeys(allRiverColumns),
  );

  const riverTableColumns = buildTableColumnsFromEcoConfig(allRiverColumns, visibleRiverColumns, record => (
    <Space size="small">
      <Button type="link" className="action-btn detail" icon={<EyeOutlined />} onClick={() => handleView(record)}>
        详情
      </Button>
      <Button type="link" className="action-btn edit" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
        编辑
      </Button>
    </Space>
  ));

  const riverTableScrollX = getEcoTableScrollX(
    allRiverColumns.filter(c => visibleRiverColumns.includes(c.key) || c.key === 'operation'),
  );

  return (
    <div className="facility-view">
      <Card
        title="责任段信息"
        extra={
          <Space wrap size={[8, 8]} align="center">
            <EcoProtoExportBtn
              onClick={() =>
                exportEcoTableExcel(
                  filteredData as unknown as Record<string, unknown>[],
                  allRiverColumns as unknown as Array<{ key?: string; title?: unknown; dataIndex?: unknown }>,
                  '生态整治_责任段信息',
                  '责任段信息',
                )
              }
            />
            <EcoProtoImportBtn />
            <EcoColumnManager columns={allRiverColumns} visibleColumns={visibleRiverColumns} onChange={setVisibleRiverColumns} />
            <Button type="primary" icon={<PlusOutlined />} className="add-btn" onClick={handleAdd}>
              新增
            </Button>
          </Space>
        }
      >
        <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8} lg={5}>
            <Select
              placeholder="管理级别"
              style={{ width: '100%' }}
              allowClear
              value={filterLevel}
              onChange={v => setFilterLevel(v as AdminLevel | undefined)}
            >
              {(Object.keys(ADMIN_LEVEL_LABEL) as AdminLevel[]).map(k => (
                <Option key={k} value={k}>{ADMIN_LEVEL_LABEL[k]}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={5}>
            <Input
              placeholder="河段名称"
              prefix={<SearchOutlined />}
              value={filterSectionName}
              onChange={e => setFilterSectionName(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Input
              placeholder="河段编码"
              prefix={<SearchOutlined />}
              value={filterSectionId}
              onChange={e => setFilterSectionId(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={8}>
            <Space>
              <Button type="primary" className="search-btn" icon={<SearchOutlined />}>
                查询
              </Button>
              <Button
                onClick={() => {
                  setFilterLevel(undefined);
                  setFilterSectionName('');
                  setFilterSectionId('');
                }}
              >
                重置
              </Button>
            </Space>
          </Col>
        </Row>
        <div className="facility-table-wrap">
          <Table
            size="small"
            columns={riverTableColumns}
            dataSource={filteredData}
            pagination={{ defaultPageSize: 10 }}
            scroll={{ x: riverTableScrollX }}
            rowKey="key"
          />
        </div>
      </Card>

      <Modal
        styles={formModalStyles}
        title={editingRecord ? '编辑河段' : '新增河段'}
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); }}
        width={920}
        footer={
          <Space>
            {editingRecord && (
              <Popconfirm
                title="确认删除"
                description="确定要删除该河段记录吗？"
                onConfirm={() => {
                  handleDelete(editingRecord.key);
                  setIsModalOpen(false);
                  form.resetFields();
                }}
                okText="确定"
                cancelText="取消"
              >
                <Button danger>删除</Button>
              </Popconfirm>
            )}
            <Button onClick={() => { setIsModalOpen(false); form.resetFields(); }}>取消</Button>
            <Button type="primary" onClick={handleSave}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="sectionId" label="河段编码（26 位）" rules={[{ required: true, message: '请输入河段编码' }]}>
                <Input placeholder="按标准 5.2.2 河流（涌）分段编码规则" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="sectionName" label="河段名称" rules={[{ required: true }]}>
                <Input placeholder="请输入河段名称" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="linkedRiverObjectId"
                label="所属河流（涌）"
                tooltip="先选河流；河段隶属于河流对象，所属水系由河流主数据自动带出"
                rules={[{ required: true, message: '请选择所属河流' }]}
              >
                <Select
                  placeholder="请选择河流信息中的对象"
                  showSearch
                  optionFilterProp="label"
                  options={riverChannels.map(r => ({
                    value: r.riverObjectId,
                    label: `${r.riverName}（${r.riverObjectId}）`,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="riverSystem" label="所属水系" tooltip="根据所选河流自动带出，无需填写">
                <Input readOnly placeholder="请先选择所属河流" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="riverSide" label="岸别（河段相对河流）" rules={[{ required: true }]}>
                <Select placeholder="请选择">
                  <Option value="L">左岸</Option>
                  <Option value="R">右岸</Option>
                  <Option value="A">全段</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="sectionType" label="河段类型" rules={[{ required: true }]}>
                <Select placeholder="请选择">
                  <Option value={1}>1 河流</Option>
                  <Option value={2}>2 河流区段</Option>
                  <Option value={3}>3 镇（街）段</Option>
                  <Option value={4}>4 村（居）段</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="adminLevel" label="管理级别" rules={[{ required: true }]}>
                <Select placeholder="请选择">
                  {(Object.keys(ADMIN_LEVEL_LABEL) as AdminLevel[]).map(k => (
                    <Option key={k} value={k}>{ADMIN_LEVEL_LABEL[k]}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="startAddr" label="河段起点名称" rules={[{ required: true }]} extra={ADDR_MAP_FORM_ITEM_EXTRA}>
                <Input placeholder={ADDR_MAP_INPUT_PLACEHOLDER} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endAddr" label="河段终点名称" rules={[{ required: true }]}>
                <Input placeholder={ADDR_MAP_INPUT_PLACEHOLDER} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="addvcd" label="所属区划" rules={[{ required: true, message: '请选择所属区划' }]}>
                <Select
                  showSearch
                  allowClear
                  placeholder="韶山市及下辖乡镇（街道）"
                  optionFilterProp="label"
                  options={SHAOSHAN_ADDVCD_OPTIONS}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="adminAgency" label="管理机构" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="riverLenKm" label="河段长度（千米）" rules={[{ required: true }]}>
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} placeholder="河段长度" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="basinAreaKm2" label="汇水面积（平方公里）" rules={[{ required: true }]}>
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} placeholder="汇水面积" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="chiefName" label="责任河长姓名" rules={[{ required: true, message: '请选择责任河长' }]}>
                <Select
                  placeholder="请从河长通讯录中选择"
                  showSearch
                  optionFilterProp="children"
                  onChange={(v: string) => {
                    const c = chiefContacts.find(x => x.name === v && x.roleCategory === 'chief');
                    if (c?.mobile) form.setFieldValue('chiefMobile', c.mobile);
                  }}
                >
                  {chiefNamePickOptions.map(n => (
                    <Option key={n} value={n}>
                      {n}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="chiefMobile" label="手机号码" rules={[{ required: true }]}>
                <Input placeholder="随所选河长带出，可改" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="parentId" label="上一级河段" tooltip="从本列表中其他责任段选择上一级河段，可选">
                <Select
                  allowClear
                  placeholder="请选择本列表中的河段（可选）"
                  showSearch
                  optionFilterProp="label"
                  options={parentReachSelectOptions}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="startLgtd" label="起点经度（°）" rules={[{ required: true, message: '请输入起点经度' }]}>
                <InputNumber min={-180} max={180} step={0.000001} style={{ width: '100%' }} placeholder="经度" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="startLttd" label="起点纬度（°）" rules={[{ required: true, message: '请输入起点纬度' }]}>
                <InputNumber min={-90} max={90} step={0.000001} style={{ width: '100%' }} placeholder="纬度" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="endLgtd" label="讫点经度（°）" rules={[{ required: true, message: '请输入讫点经度' }]}>
                <InputNumber min={-180} max={180} step={0.000001} style={{ width: '100%' }} placeholder="经度" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="endLttd" label="讫点纬度（°）" rules={[{ required: true, message: '请输入讫点纬度' }]}>
                <InputNumber min={-90} max={90} step={0.000001} style={{ width: '100%' }} placeholder="纬度" />
              </Form.Item>
            </Col>
          </Row>
          <Divider style={{ margin: '12px 0' }} />
          <Title level={5}>起点与讫点位置地图</Title>
          <div className="facility-river-detail-map-wrap" style={{ marginBottom: 8 }}>
            <RiverSourceMouthWgs84MapPicker
              form={form}
              sourLngField="startLgtd"
              sourLatField="startLttd"
              sourAddrField="startAddr"
              mouLngField="endLgtd"
              mouLatField="endLttd"
              mouAddrField="endAddr"
              mapAriaLabel="责任段起点与讫点位置地图"
              firstPointLabel="起点"
              secondPointLabel="讫点"
              firstLocationFieldLabel="河段起点名称"
              secondLocationFieldLabel="河段终点名称"
            />
          </div>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="riverDist" label="行政区与河段位置关系" rules={[{ required: true, message: '请选择' }]}>
                <Select placeholder="请选择">
                  {(Object.keys(RIVER_DIST_LABEL) as RiverDist[]).map(k => (
                    <Option key={k} value={k}>
                      {RIVER_DIST_LABEL[k]}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="runoffVolume" label="多年平均径流量（立方米）" rules={[{ required: true }]}>
                <InputNumber min={0} step={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="lowflowVolume" label="多年平均枯水期流量（立方米/秒）" rules={[{ required: true }]}>
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="gaugingStation" label="水文站数量" rules={[{ required: true }]}>
                <InputNumber min={0} step={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="leftBranch" label="左岸支流数量" rules={[{ required: true }]}>
                <InputNumber min={0} max={99} step={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="rightBranch" label="右岸支流数量" rules={[{ required: true }]}>
                <InputNumber min={0} max={99} step={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="introduction" label="简介">
            <TextArea rows={2} placeholder="最多 500 字（规范字段长度）" maxLength={500} showCount />
          </Form.Item>
          <Form.Item name="remarks" label="备注">
            <TextArea rows={2} placeholder="最多 200 字" maxLength={200} showCount />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        styles={formModalStyles}
        title="河段详情"
        open={isViewModalOpen}
        onCancel={() => setIsViewModalOpen(false)}
        footer={null}
        width={920}
      >
        {viewRecord ? (
          <RiverSectionReadonlyDetailContent
            viewRecord={viewRecord}
            allSections={data}
            riverChannels={riverChannels}
          />
        ) : null}
      </Modal>
    </div>
  );
};

// ============ 任务管理组件（含增删查改） ============

const TaskManage: React.FC<{
  tasks: RiverChiefTaskRow[];
  onTasksChange: (rows: RiverChiefTaskRow[]) => void;
}> = ({ tasks, onTasksChange }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RiverChiefTaskRow | null>(null);
  const [viewRecord, setViewRecord] = useState<RiverChiefTaskRow | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<string | undefined>();
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [form] = Form.useForm();

  const filteredData = tasks.filter(item => {
    const matchSearch = !searchText || item.name.includes(searchText);
    const matchType = !filterType || item.type === filterType;
    const matchStatus = !filterStatus || item.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (record: RiverChiefTaskRow) => {
    setEditingRecord(record);
    // 将日期字符串转换为 dayjs 对象
    const formValues = {
      ...record,
      deadline: record.deadline ? dayjs(record.deadline) : undefined,
    };
    form.setFieldsValue(formValues);
    setIsModalOpen(true);
  };

  const handleView = (record: RiverChiefTaskRow) => {
    setViewRecord(record);
    setIsViewModalOpen(true);
  };

  const handleDelete = (key: string) => {
    onTasksChange(tasks.filter(item => item.key !== key));
    message.success('删除成功');
  };

  const handleSave = () => {
    form.validateFields().then(values => {
      // 将 dayjs 对象转换为字符串格式
      const formattedValues = {
        ...values,
        deadline: values.deadline ? values.deadline.format('YYYY-MM-DD') : undefined,
      };
      
      if (editingRecord) {
        onTasksChange(
          tasks.map(item => (item.key === editingRecord.key ? { ...item, ...formattedValues } : item)),
        );
        message.success('修改成功');
      } else {
        const maxKey = tasks.reduce((m, d) => Math.max(m, parseInt(d.key, 10) || 0), 0);
        const newKey = String(maxKey + 1);
        onTasksChange([...tasks, { ...formattedValues, key: newKey } as RiverChiefTaskRow]);
        message.success('新增成功');
      }
      setIsModalOpen(false);
      form.resetFields();
    });
  };

  const allTaskColumns: EcoColumnConfig[] = [
    { key: 'name', title: '任务名称', dataIndex: 'name', width: 200, defaultVisible: true },
    { key: 'type', title: '任务类型', dataIndex: 'type', width: 100, defaultVisible: true },
    { key: 'assignee', title: '责任单位', dataIndex: 'assignee', width: 140, defaultVisible: true },
    { key: 'deadline', title: '完成期限', dataIndex: 'deadline', width: 110, defaultVisible: true },
    {
      key: 'progress',
      title: '完成进度',
      dataIndex: 'progress',
      width: 120,
      defaultVisible: true,
      render: (val: number) => <Progress percent={val} size="small" />,
    },
    {
      key: 'status',
      title: '任务状态',
      dataIndex: 'status',
      width: 90,
      defaultVisible: true,
      render: (status: string) => {
        const colors: Record<string, string> = {
          已完成: 'success',
          进行中: 'processing',
          待启动: 'default',
          已逾期: 'error',
        };
        return <Tag color={colors[status]}>{status}</Tag>;
      },
    },
    { key: 'operation', title: '操作', width: 140, defaultVisible: true },
  ];

  const [visibleTaskColumns, setVisibleTaskColumns] = useState<string[]>(() =>
    getEcoDefaultVisibleColumnKeys(allTaskColumns),
  );

  const taskTableColumns = buildTableColumnsFromEcoConfig(allTaskColumns, visibleTaskColumns, record => (
    <Space size="small">
      <Button type="link" className="action-btn detail" icon={<EyeOutlined />} onClick={() => handleView(record)}>
        详情
      </Button>
      <Button type="link" className="action-btn edit" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
        编辑
      </Button>
    </Space>
  ));

  const taskTableScrollX = getEcoTableScrollX(
    allTaskColumns.filter(c => visibleTaskColumns.includes(c.key) || c.key === 'operation'),
  );

  return (
    <div className="facility-view">
      <Card
        title="任务完成情况"
        extra={
          <Space wrap size={[8, 8]} align="center">
            <EcoProtoExportBtn
              onClick={() =>
                exportEcoTableExcel(
                  filteredData as unknown as Record<string, unknown>[],
                  allTaskColumns as unknown as Array<{ key?: string; title?: unknown; dataIndex?: unknown }>,
                  '生态整治_任务完成情况',
                  '任务完成情况',
                )
              }
            />
            <EcoProtoImportBtn />
            <EcoColumnManager columns={allTaskColumns} visibleColumns={visibleTaskColumns} onChange={setVisibleTaskColumns} />
            <Button type="primary" icon={<PlusOutlined />} className="add-btn" onClick={handleAdd}>
              新增任务
            </Button>
          </Space>
        }
      >
        <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8} lg={5}>
            <Select placeholder="任务类型" style={{ width: '100%' }} allowClear value={filterType} onChange={setFilterType}>
              {TASK_TYPES.map(t => (
                <Option key={t} value={t}>
                  {t}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={5}>
            <Select placeholder="任务状态" style={{ width: '100%' }} allowClear value={filterStatus} onChange={setFilterStatus}>
              <Option value="待启动">待启动</Option>
              <Option value="进行中">进行中</Option>
              <Option value="已完成">已完成</Option>
              <Option value="已逾期">已逾期</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Input
              placeholder="任务名称"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={8}>
            <Space>
              <Button type="primary" className="search-btn" icon={<SearchOutlined />}>
                查询
              </Button>
              <Button
                onClick={() => {
                  setFilterType(undefined);
                  setFilterStatus(undefined);
                  setSearchText('');
                }}
              >
                重置
              </Button>
            </Space>
          </Col>
        </Row>
        <div className="facility-table-wrap">
          <Table
            columns={taskTableColumns}
            dataSource={filteredData}
            pagination={{ defaultPageSize: 10 }}
            scroll={{ x: taskTableScrollX }}
            rowKey="key"
          />
        </div>
      </Card>

      <Modal
        styles={formModalStyles}
        title={editingRecord ? '编辑任务' : '新增任务'}
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); }}
        width={640}
        footer={
          <Space>
            {editingRecord && (
              <Popconfirm
                title="确认删除"
                description="确定要删除该任务吗？"
                onConfirm={() => {
                  handleDelete(editingRecord.key);
                  setIsModalOpen(false);
                  form.resetFields();
                }}
                okText="确定"
                cancelText="取消"
              >
                <Button danger>删除</Button>
              </Popconfirm>
            )}
            <Button onClick={() => { setIsModalOpen(false); form.resetFields(); }}>取消</Button>
            <Button type="primary" onClick={handleSave}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="任务名称" rules={[{ required: true }]}>
            <Input placeholder="请输入任务名称" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="type" label="任务类型" rules={[{ required: true }]}>
                <Select placeholder="请选择">
                  {TASK_TYPES.map(t => (
                    <Option key={t} value={t}>
                      {t}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="assignee" label="责任单位" rules={[{ required: true }]}>
                <Input placeholder="请输入责任单位" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="deadline" label="完成期限" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} placeholder="选择日期" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="任务状态" rules={[{ required: true }]}>
                <Select placeholder="请选择">
                  <Option value="待启动">待启动</Option>
                  <Option value="进行中">进行中</Option>
                  <Option value="已完成">已完成</Option>
                  <Option value="已逾期">已逾期</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="progress" label="完成进度（%）" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} max={100} />
          </Form.Item>
          <Form.Item name="description" label="任务描述">
            <TextArea rows={3} placeholder="请输入任务描述" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        styles={formModalStyles}
        title="任务详情"
        open={isViewModalOpen}
        onCancel={() => setIsViewModalOpen(false)}
        footer={null}
        width={600}
      >
        {viewRecord && (
          <Descriptions column={2} bordered style={{ marginTop: 16 }}>
            <Descriptions.Item label="任务名称" span={2}>{viewRecord.name}</Descriptions.Item>
            <Descriptions.Item label="任务类型">{viewRecord.type}</Descriptions.Item>
            <Descriptions.Item label="责任单位">{viewRecord.assignee}</Descriptions.Item>
            <Descriptions.Item label="完成期限">{viewRecord.deadline}</Descriptions.Item>
            <Descriptions.Item label="任务状态">
              <Tag
                color={
                  viewRecord.status === '已完成' ? 'success'
                  : viewRecord.status === '进行中' ? 'processing'
                  : viewRecord.status === '已逾期' ? 'error'
                  : 'default'
                }
              >
                {viewRecord.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="完成进度">{viewRecord.progress}%</Descriptions.Item>
            <Descriptions.Item label="任务描述" span={2}>{viewRecord.description || '暂无'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

/** 任务状态分布柱状图 */
const TaskStatStatusBarChart: React.FC<{
  counts: {待启动: number; 进行中: number; 已完成: number; 已逾期: number };
}> = ({ counts }) => {
  const elRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!elRef.current) return;
    const chart = echarts.init(elRef.current);
    const cats = ['待启动', '进行中', '已完成', '已逾期'] as const;
    chart.setOption({
      color: ['#64748b', '#1e5bb5', '#10B981', '#ef4444'],
      tooltip: { trigger: 'axis' },
      grid: { left: 48, right: 24, top: 28, bottom: 32 },
      xAxis: { type: 'category', data: [...cats], axisLabel: { fontSize: 11 } },
      yAxis: { type: 'value', name: '任务数', minInterval: 1 },
      series: [{ type: 'bar', data: cats.map(c => counts[c]), barMaxWidth: 40 }],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(elRef.current);
    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [counts]);
  return <div ref={elRef} className="eco-stat-echart-host" />;
};

/** 各任务类型：完成率与逾期率（横向对比） */
const TaskStatTypeRateChart: React.FC<{
  rows: { type: string; completeRate: number; overdueRate: number }[];
}> = ({ rows }) => {
  const elRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!elRef.current) return;
    const chart = echarts.init(elRef.current);
    chart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['完成率', '逾期率'], bottom: 0 },
      grid: { left: 48, right: 24, top: 32, bottom: 56 },
      xAxis: { type: 'value', max: 100, name: '%' },
      yAxis: { type: 'category', data: rows.map(r => r.type), axisLabel: { fontSize: 11 } },
      series: [
        { name: '完成率', type: 'bar', data: rows.map(r => r.completeRate), barMaxWidth: 18 },
        { name: '逾期率', type: 'bar', data: rows.map(r => r.overdueRate), barMaxWidth: 18 },
      ],
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

/** 各任务类型平均进度（完成质量示意） */
const TaskStatTypeProgressChart: React.FC<{ rows: { type: string; avgProgress: number }[] }> = ({ rows }) => {
  const elRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!elRef.current) return;
    const chart = echarts.init(elRef.current);
    chart.setOption({
      color: ['#7c3aed'],
      tooltip: { trigger: 'axis' },
      grid: { left: 48, right: 24, top: 28, bottom: 40 },
      xAxis: { type: 'category', data: rows.map(r => r.type), axisLabel: { fontSize: 11, rotate: 20 } },
      yAxis: { type: 'value', max: 100, name: '平均进度%' },
      series: [{ type: 'bar', data: rows.map(r => r.avgProgress), barMaxWidth: 36 }],
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

/**
 * 任务完成统计：与「任务完成情况」共享台账；按完成期限窗口与类型筛选，统计完成率、逾期率、进度与质量示意
 */
const TaskStatistics: React.FC<{ tasks: RiverChiefTaskRow[] }> = ({ tasks }) => {
  const taskStatPdfRef = useRef<HTMLDivElement | null>(null);
  const [presetRange, setPresetRange] = useState<'all' | 'month' | 'quarter' | 'year' | 'custom'>('all');
  const [customRange, setCustomRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [filterType, setFilterType] = useState<string | undefined>();
  const [filterStatus, setFilterStatus] = useState<string | undefined>();

  const effectiveDateRange = useMemo((): [dayjs.Dayjs, dayjs.Dayjs] | null => {
    if (presetRange === 'all') return null;
    const now = dayjs();
    if (presetRange === 'custom') return customRange;
    if (presetRange === 'month') return [now.startOf('month'), now.endOf('month')];
    if (presetRange === 'quarter') {
      const m0 = now.month();
      const qStart = Math.floor(m0 / 3) * 3;
      return [now.month(qStart).startOf('month'), now.month(qStart + 2).endOf('month')];
    }
    if (presetRange === 'year') return [now.startOf('year'), now.endOf('year')];
    return null;
  }, [presetRange, customRange]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filterType && t.type !== filterType) return false;
      if (filterStatus && t.status !== filterStatus) return false;
      if (effectiveDateRange) {
        const [start, end] = effectiveDateRange;
        const d = dayjs(t.deadline);
        if (d.isBefore(start.startOf('day')) || d.isAfter(end.endOf('day'))) return false;
      }
      return true;
    });
  }, [tasks, filterType, filterStatus, effectiveDateRange]);

  const statusCounts = useMemo(() => {
    const c = { 待启动: 0, 进行中: 0, 已完成: 0, 已逾期: 0 };
    filteredTasks.forEach(t => {
      const k = t.status as keyof typeof c;
      if (k in c) c[k] += 1;
      else c.进行中 += 1;
    });
    return c;
  }, [filteredTasks]);

  const summary = useMemo(() => {
    const n = filteredTasks.length;
    if (!n) {
      return {
        n: 0,
        completed: 0,
        completeRate: 0,
        overdue: 0,
        overdueRate: 0,
        nearDue7: 0,
        avgProgress: 0,
        qualityProgressAvg: 0,
        highProgressRate: 0,
      };
    }
    let completed = 0;
    let overdue = 0;
    let nearDue7 = 0;
    let progSum = 0;
    let highProg = 0;
    let doneProgSum = 0;
    let doneN = 0;
    filteredTasks.forEach(t => {
      progSum += t.progress;
      if (t.progress >= 80) highProg += 1;
      if (t.status === '已完成') {
        completed += 1;
        doneProgSum += t.progress;
        doneN += 1;
      }
      if (taskRowIsOverdue(t)) overdue += 1;
      if (taskRowIsDueWithin(t, 7)) nearDue7 += 1;
    });
    return {
      n,
      completed,
      completeRate: Math.round((completed / n) * 1000) / 10,
      overdue,
      overdueRate: Math.round((overdue / n) * 1000) / 10,
      nearDue7,
      avgProgress: Math.round((progSum / n) * 10) / 10,
      qualityProgressAvg: doneN ? Math.round((doneProgSum / doneN) * 10) / 10 : 0,
      highProgressRate: Math.round((highProg / n) * 1000) / 10,
    };
  }, [filteredTasks]);

  const byTypeRows = useMemo(() => {
    const map = new Map<
      string,
      { n: number; done: number; overdue: number; progSum: number; high: number }
    >();
    filteredTasks.forEach(t => {
      const cur = map.get(t.type) ?? { n: 0, done: 0, overdue: 0, progSum: 0, high: 0 };
      cur.n += 1;
      cur.progSum += t.progress;
      if (t.status === '已完成') cur.done += 1;
      if (taskRowIsOverdue(t)) cur.overdue += 1;
      if (t.progress >= 90) cur.high += 1;
      map.set(t.type, cur);
    });
    return TASK_TYPES.map(type => {
      const v = map.get(type);
      if (!v || !v.n) {
        return {
          key: type,
          type,
          n: 0,
          done: 0,
          completeRate: 0,
          overdue: 0,
          overdueRate: 0,
          avgProgress: 0,
          highQualityRate: 0,
        };
      }
      return {
        key: type,
        type,
        n: v.n,
        done: v.done,
        completeRate: Math.round((v.done / v.n) * 1000) / 10,
        overdue: v.overdue,
        overdueRate: Math.round((v.overdue / v.n) * 1000) / 10,
        avgProgress: Math.round((v.progSum / v.n) * 10) / 10,
        highQualityRate: Math.round((v.high / v.n) * 1000) / 10,
      };
    }).filter(r => r.n > 0);
  }, [filteredTasks]);

  const typeRateChartRows = useMemo(
    () => byTypeRows.map(r => ({ type: r.type, completeRate: r.completeRate, overdueRate: r.overdueRate })),
    [byTypeRows],
  );

  const typeProgressChartRows = useMemo(
    () => byTypeRows.map(r => ({ type: r.type, avgProgress: r.avgProgress })),
    [byTypeRows],
  );

  const byAssigneeRows = useMemo(() => {
    const map = new Map<string, { n: number; done: number; overdue: number; progSum: number }>();
    filteredTasks.forEach(t => {
      const cur = map.get(t.assignee) ?? { n: 0, done: 0, overdue: 0, progSum: 0 };
      cur.n += 1;
      cur.progSum += t.progress;
      if (t.status === '已完成') cur.done += 1;
      if (taskRowIsOverdue(t)) cur.overdue += 1;
      map.set(t.assignee, cur);
    });
    return [...map.entries()]
      .map(([assignee, v]) => ({
        key: assignee,
        assignee,
        n: v.n,
        done: v.done,
        completeRate: Math.round((v.done / v.n) * 1000) / 10,
        overdue: v.overdue,
        overdueRate: Math.round((v.overdue / v.n) * 1000) / 10,
        avgProgress: Math.round((v.progSum / v.n) * 10) / 10,
      }))
      .sort((a, b) => b.n - a.n);
  }, [filteredTasks]);

  const typeColumns: ColumnsType<(typeof byTypeRows)[number]> = [
    { title: '任务类型', dataIndex: 'type', width: 100 },
    { title: '任务数', dataIndex: 'n', width: 80, align: 'right' },
    { title: '已完成', dataIndex: 'done', width: 80, align: 'right' },
    {
      title: '完成率',
      dataIndex: 'completeRate',
      width: 88,
      align: 'right',
      render: (v: number) => `${v}%`,
    },
    { title: '逾期数', dataIndex: 'overdue', width: 80, align: 'right' },
    {
      title: '逾期率',
      dataIndex: 'overdueRate',
      width: 88,
      align: 'right',
      render: (v: number) => `${v}%`,
    },
    {
      title: '平均进度',
      dataIndex: 'avgProgress',
      width: 96,
      align: 'right',
      render: (v: number) => `${v}%`,
    },
    {
      title: '高进度占比(≥90%)',
      dataIndex: 'highQualityRate',
      width: 140,
      align: 'right',
      render: (v: number) => `${v}%`,
    },
  ];

  const assigneeColumns: ColumnsType<(typeof byAssigneeRows)[number]> = [
    { title: '责任单位', dataIndex: 'assignee', ellipsis: true },
    { title: '任务数', dataIndex: 'n', width: 80, align: 'right' },
    {
      title: '完成率',
      dataIndex: 'completeRate',
      width: 88,
      align: 'right',
      render: (v: number) => `${v}%`,
    },
    {
      title: '逾期率',
      dataIndex: 'overdueRate',
      width: 88,
      align: 'right',
      render: (v: number) => `${v}%`,
    },
    {
      title: '平均进度',
      dataIndex: 'avgProgress',
      width: 96,
      align: 'right',
      render: (v: number) => `${v}%`,
    },
  ];

  const handleTaskStatExportPdf = async () => {
    if (!filteredTasks.length) {
      message.warning('当前筛选条件下无内容可导出');
      return;
    }
    const el = taskStatPdfRef.current;
    if (!el) {
      message.error('导出区域未就绪');
      return;
    }
    const hide = message.loading('正在生成 PDF…', 0);
    try {
      await downloadElementAsPdf(el, '生态整治_任务完成统计');
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
        title="任务完成统计"
        extra={<EcoStatPdfExportBtn onClick={() => void handleTaskStatExportPdf()} />}
      >
        <div ref={taskStatPdfRef} className="facility-stat-pdf-capture-root">
        <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} lg={18}>
            <Space wrap size="middle" align="center">
              <span>完成期限：</span>
              <Radio.Group
                value={presetRange}
                onChange={e => setPresetRange(e.target.value)}
                buttonStyle="solid"
              >
                <Radio.Button value="all">全部</Radio.Button>
                <Radio.Button value="month">本月</Radio.Button>
                <Radio.Button value="quarter">本季</Radio.Button>
                <Radio.Button value="year">本年</Radio.Button>
                <Radio.Button value="custom">自定义</Radio.Button>
              </Radio.Group>
              {presetRange === 'custom' ?
                <RangePicker value={customRange as any} onChange={v => setCustomRange(v as any)} />
              : null}
            </Space>
          </Col>
        </Row>

        <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8}>
            <Text type="secondary">任务类型：</Text>
            <Select
              allowClear
              placeholder="全部类型"
              style={{ width: '100%', maxWidth: 280, marginTop: 8 }}
              value={filterType}
              onChange={setFilterType}
              options={[...TASK_TYPES].map(t => ({ label: t, value: t }))}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Text type="secondary">任务状态：</Text>
            <Select
              allowClear
              placeholder="全部状态"
              style={{ width: '100%', maxWidth: 280, marginTop: 8 }}
              value={filterStatus}
              onChange={setFilterStatus}
              options={[
                { label: '待启动', value: '待启动' },
                { label: '进行中', value: '进行中' },
                { label: '已完成', value: '已完成' },
                { label: '已逾期', value: '已逾期' },
              ]}
            />
          </Col>
          <Col xs={24} sm={24} md={8} style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Button
              className="search-btn"
              type="primary"
              icon={<SearchOutlined />}
              onClick={() => message.success('已按当前条件刷新统计（原型）')}
            >
              查询
            </Button>
          </Col>
        </Row>

        <Row gutter={[16, 12]} className="eco-stat-metrics-row" style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" className="eco-stat-metric-card">
              <Statistic
                title="任务总数（当前口径）"
                value={summary.n}
                suffix="项"
                valueStyle={{ color: '#1e5bb5' }}
                prefix={<FileTextOutlined />}
              />
              <div className="eco-stat-metric-foot">&nbsp;</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" className="eco-stat-metric-card">
              <Statistic
                title="完成率"
                value={summary.completeRate}
                suffix="%"
                valueStyle={{ color: '#10B981' }}
                prefix={<CheckOutlined />}
              />
              <div className="eco-stat-metric-foot">&nbsp;</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" className="eco-stat-metric-card">
              <Statistic
                title="逾期率"
                value={summary.overdueRate}
                suffix="%"
                valueStyle={{ color: summary.overdueRate > 0 ? '#ef4444' : '#64748b' }}
                prefix={<CloseOutlined />}
              />
              <div className="eco-stat-metric-foot">含显式「已逾期」或期限已过仍未完成</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" className="eco-stat-metric-card">
              <Statistic
                title="7日内临期（未完结）"
                value={summary.nearDue7}
                suffix="项"
                valueStyle={{ color: '#D97706' }}
                prefix={<HistoryOutlined />}
              />
              <div className="eco-stat-metric-foot">&nbsp;</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" className="eco-stat-metric-card">
              <Statistic
                title="平均进度（全体）"
                value={summary.avgProgress}
                suffix="%"
                valueStyle={{ color: '#1e5bb5' }}
                prefix={<BarChartOutlined />}
              />
              <div className="eco-stat-metric-foot">&nbsp;</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" className="eco-stat-metric-card">
              <Statistic
                title="已完成任务平均进度"
                value={summary.qualityProgressAvg}
                suffix="%"
                valueStyle={{ color: '#7c3aed' }}
                prefix={<TrophyOutlined />}
              />
              <div className="eco-stat-metric-foot">质量示意：完成项进度应接近 100%</div>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} className="eco-stat-chart-row" style={{ marginBottom: 16 }}>
          <Col xs={24} lg={12}>
            <Card size="small" title="任务状态分布">
              {summary.n ?
                <TaskStatStatusBarChart counts={statusCounts} />
              : <div className="eco-stat-chart-empty">
                  <Empty description="无数据" />
                </div>}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card size="small" title="各类型完成率 / 逾期率（横向对比）">
              {typeRateChartRows.length ?
                <TaskStatTypeRateChart rows={typeRateChartRows} />
              : <div className="eco-stat-chart-empty">
                  <Empty description="无类型数据" />
                </div>}
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} className="eco-stat-split-row" style={{ marginBottom: 16 }}>
          <Col xs={24} lg={12}>
            <Card size="small" title="按任务类型汇总">
              <div className="eco-stat-split-table-wrap">
                <Table
                  size="small"
                  pagination={false}
                  columns={typeColumns}
                  dataSource={byTypeRows}
                  locale={{ emptyText: '无数据' }}
                />
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card size="small" title="各类型平均进度（推进质量）">
              {typeProgressChartRows.length ?
                <TaskStatTypeProgressChart rows={typeProgressChartRows} />
              : <div className="eco-stat-chart-empty">
                  <Empty description="无数据" />
                </div>}
            </Card>
          </Col>
        </Row>

        <Card size="small" title="按责任单位汇总">
          <Table
            size="small"
            rowKey="key"
            pagination={{ defaultPageSize: 8, showTotal: n => `共 ${n} 家` }}
            columns={assigneeColumns}
            dataSource={byAssigneeRows}
            locale={{ emptyText: '无数据' }}
          />
        </Card>

        <Divider />
        </div>
      </Card>
    </div>
  );
};

type ProjectStatusCount = Record<(typeof PROJECT_STATUSES_FOR_STAT)[number], number>;

/** 项目状态分布柱状图 */
const ProjectStatStatusBarChart: React.FC<{ counts: ProjectStatusCount }> = ({ counts }) => {
  const elRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!elRef.current) return;
    const chart = echarts.init(elRef.current);
    const cats = [...PROJECT_STATUSES_FOR_STAT];
    chart.setOption({
      color: ['#94a3b8', '#64748b', '#1e5bb5', '#10B981'],
      tooltip: { trigger: 'axis' },
      grid: { left: 48, right: 24, top: 28, bottom: 32 },
      xAxis: { type: 'category', data: cats, axisLabel: { fontSize: 11 } },
      yAxis: { type: 'value', name: '项目数', minInterval: 1 },
      series: [{ type: 'bar', data: cats.map(c => counts[c]), barMaxWidth: 40 }],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(elRef.current);
    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [counts]);
  return <div ref={elRef} className="eco-stat-echart-host" />;
};

/** 各类型：项目数与投资额（双轴柱状） */
const ProjectStatTypeCountInvestChart: React.FC<
  { rows: { type: string; n: number; investWan: number }[] }
> = ({ rows }) => {
  const elRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!elRef.current) return;
    const chart = echarts.init(elRef.current);
    chart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['项目数', '投资额(万元)'], bottom: 0 },
      grid: { left: 48, right: 56, top: 32, bottom: 56 },
      xAxis: { type: 'category', data: rows.map(r => r.type), axisLabel: { fontSize: 11, rotate: 18 } },
      yAxis: [
        { type: 'value', name: '个数', minInterval: 1 },
        { type: 'value', name: '万元', splitLine: { show: false } },
      ],
      series: [
        { name: '项目数', type: 'bar', yAxisIndex: 0, data: rows.map(r => r.n), barMaxWidth: 28 },
        { name: '投资额(万元)', type: 'bar', yAxisIndex: 1, data: rows.map(r => r.investWan), barMaxWidth: 28 },
      ],
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

/** 各建设地点投资额（横向条形） */
const ProjectStatLocationInvestChart: React.FC<{ rows: { location: string; investWan: number }[] }> = ({ rows }) => {
  const elRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!elRef.current) return;
    const chart = echarts.init(elRef.current);
    chart.setOption({
      color: ['#02A7F0'],
      tooltip: { trigger: 'axis' },
      grid: { left: 120, right: 40, top: 28, bottom: 32 },
      xAxis: { type: 'value', name: '万元' },
      yAxis: { type: 'category', data: rows.map(r => r.location), axisLabel: { fontSize: 11 } },
      series: [{ type: 'bar', data: rows.map(r => r.investWan), barMaxWidth: 22 }],
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

/** 项目台账中是否已完工（用于完工率） */
function projectRowIsCompleted(p: EcoProjectArchiveRow): boolean {
  return p.status === '已完工';
}

/**
 * 项目汇总统计：与「项目档案」共享台账；按计划结束日期窗口与类型、状态、地点筛选；指标 + 图表 + 分维度汇总表
 */
const ProjectStatistics: React.FC<{ projects: EcoProjectArchiveRow[] }> = ({ projects }) => {
  const projectStatPdfRef = useRef<HTMLDivElement | null>(null);
  const [presetRange, setPresetRange] = useState<'all' | 'month' | 'quarter' | 'year' | 'custom'>('all');
  const [customRange, setCustomRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [filterType, setFilterType] = useState<string | undefined>();
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [filterLocationKw, setFilterLocationKw] = useState('');

  const typeOptions = useMemo(
    () => [...new Set(projects.map(p => p.type))].sort((a, b) => a.localeCompare(b, 'zh-CN')),
    [projects],
  );

  const effectiveDateRange = useMemo((): [dayjs.Dayjs, dayjs.Dayjs] | null => {
    if (presetRange === 'all') return null;
    const now = dayjs();
    if (presetRange === 'custom') return customRange;
    if (presetRange === 'month') return [now.startOf('month'), now.endOf('month')];
    if (presetRange === 'quarter') {
      const m0 = now.month();
      const qStart = Math.floor(m0 / 3) * 3;
      return [now.month(qStart).startOf('month'), now.month(qStart + 2).endOf('month')];
    }
    if (presetRange === 'year') return [now.startOf('year'), now.endOf('year')];
    return null;
  }, [presetRange, customRange]);

  const filteredProjects = useMemo(() => {
    const locKw = filterLocationKw.trim();
    return projects.filter(p => {
      if (filterType && p.type !== filterType) return false;
      if (filterStatus && p.status !== filterStatus) return false;
      if (locKw && !p.location.includes(locKw)) return false;
      if (effectiveDateRange && p.endDate) {
        const [start, end] = effectiveDateRange;
        const d = dayjs(p.endDate);
        if (d.isBefore(start.startOf('day')) || d.isAfter(end.endOf('day'))) return false;
      }
      return true;
    });
  }, [projects, filterType, filterStatus, filterLocationKw, effectiveDateRange]);

  const statusCounts = useMemo((): ProjectStatusCount => {
    const c: ProjectStatusCount = { 设计中: 0, 招标中: 0, 施工中: 0, 已完工: 0 };
    filteredProjects.forEach(p => {
      const k = p.status as keyof ProjectStatusCount;
      if (k in c) c[k] += 1;
      else c.施工中 += 1;
    });
    return c;
  }, [filteredProjects]);

  const summary = useMemo(() => {
    const n = filteredProjects.length;
    if (!n) {
      return {
        n: 0,
        investWan: 0,
        investYi: 0,
        completed: 0,
        completeRate: 0,
        inProgress: 0,
        avgProgress: 0,
        doneProgressAvg: 0,
      };
    }
    let investWan = 0;
    let completed = 0;
    let progSum = 0;
    let doneProgSum = 0;
    let doneN = 0;
    filteredProjects.forEach(p => {
      investWan += Number(p.investment) || 0;
      progSum += Number(p.progress) || 0;
      if (projectRowIsCompleted(p)) {
        completed += 1;
        doneProgSum += Number(p.progress) || 0;
        doneN += 1;
      }
    });
    return {
      n,
      investWan,
      investYi: Math.round((investWan / 10000) * 100) / 100,
      completed,
      completeRate: Math.round((completed / n) * 1000) / 10,
      inProgress: n - completed,
      avgProgress: Math.round((progSum / n) * 10) / 10,
      doneProgressAvg: doneN ? Math.round((doneProgSum / doneN) * 10) / 10 : 0,
    };
  }, [filteredProjects]);

  const byTypeRows = useMemo(() => {
    const map = new Map<string, { n: number; invest: number; done: number; progSum: number }>();
    filteredProjects.forEach(p => {
      const cur = map.get(p.type) ?? { n: 0, invest: 0, done: 0, progSum: 0 };
      cur.n += 1;
      cur.invest += Number(p.investment) || 0;
      cur.progSum += Number(p.progress) || 0;
      if (projectRowIsCompleted(p)) cur.done += 1;
      map.set(p.type, cur);
    });
    return [...map.entries()]
      .map(([type, v]) => ({
        key: type,
        type,
        n: v.n,
        investWan: Math.round(v.invest * 10) / 10,
        done: v.done,
        completeRate: Math.round((v.done / v.n) * 1000) / 10,
        avgProgress: Math.round((v.progSum / v.n) * 10) / 10,
      }))
      .sort((a, b) => b.investWan - a.investWan);
  }, [filteredProjects]);

  const typeChartRows = useMemo(
    () => byTypeRows.map(r => ({ type: r.type, n: r.n, investWan: r.investWan })),
    [byTypeRows],
  );

  const byLocationRows = useMemo(() => {
    const map = new Map<string, { n: number; invest: number; done: number; progSum: number }>();
    filteredProjects.forEach(p => {
      const loc = p.location || '—';
      const cur = map.get(loc) ?? { n: 0, invest: 0, done: 0, progSum: 0 };
      cur.n += 1;
      cur.invest += Number(p.investment) || 0;
      cur.progSum += Number(p.progress) || 0;
      if (projectRowIsCompleted(p)) cur.done += 1;
      map.set(loc, cur);
    });
    return [...map.entries()]
      .map(([location, v]) => ({
        key: location,
        location,
        n: v.n,
        investWan: Math.round(v.invest * 10) / 10,
        done: v.done,
        completeRate: Math.round((v.done / v.n) * 1000) / 10,
        avgProgress: Math.round((v.progSum / v.n) * 10) / 10,
      }))
      .sort((a, b) => b.investWan - a.investWan);
  }, [filteredProjects]);

  const locationChartRows = useMemo(
    () => [...byLocationRows].sort((a, b) => a.investWan - b.investWan),
    [byLocationRows],
  );

  const typeColumns: ColumnsType<(typeof byTypeRows)[number]> = [
    { title: '项目类型', dataIndex: 'type', width: 120, ellipsis: true },
    { title: '项目数', dataIndex: 'n', width: 80, align: 'right' },
    {
      title: '投资额(万元)',
      dataIndex: 'investWan',
      width: 120,
      align: 'right',
      render: (v: number) => v.toLocaleString('zh-CN'),
    },
    { title: '已完工', dataIndex: 'done', width: 80, align: 'right' },
    {
      title: '完工率',
      dataIndex: 'completeRate',
      width: 88,
      align: 'right',
      render: (v: number) => `${v}%`,
    },
    {
      title: '平均进度',
      dataIndex: 'avgProgress',
      width: 96,
      align: 'right',
      render: (v: number) => `${v}%`,
    },
  ];

  const locationColumns: ColumnsType<(typeof byLocationRows)[number]> = [
    { title: '建设地点', dataIndex: 'location', ellipsis: true },
    { title: '项目数', dataIndex: 'n', width: 80, align: 'right' },
    {
      title: '投资额(万元)',
      dataIndex: 'investWan',
      width: 120,
      align: 'right',
      render: (v: number) => v.toLocaleString('zh-CN'),
    },
    { title: '已完工', dataIndex: 'done', width: 80, align: 'right' },
    {
      title: '完工率',
      dataIndex: 'completeRate',
      width: 88,
      align: 'right',
      render: (v: number) => `${v}%`,
    },
    {
      title: '平均进度',
      dataIndex: 'avgProgress',
      width: 96,
      align: 'right',
      render: (v: number) => `${v}%`,
    },
  ];

  const handleProjectStatExportPdf = async () => {
    if (!filteredProjects.length) {
      message.warning('当前筛选条件下无内容可导出');
      return;
    }
    const el = projectStatPdfRef.current;
    if (!el) {
      message.error('导出区域未就绪');
      return;
    }
    const hide = message.loading('正在生成 PDF…', 0);
    try {
      await downloadElementAsPdf(el, '生态整治_项目汇总统计');
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
        title="项目汇总统计"
        extra={<EcoStatPdfExportBtn onClick={() => void handleProjectStatExportPdf()} />}
      >
        <div ref={projectStatPdfRef} className="facility-stat-pdf-capture-root">
        <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} lg={18}>
            <Space wrap size="middle" align="center">
              <span>计划结束日期：</span>
              <Radio.Group
                value={presetRange}
                onChange={e => setPresetRange(e.target.value)}
                buttonStyle="solid"
              >
                <Radio.Button value="all">全部</Radio.Button>
                <Radio.Button value="month">本月</Radio.Button>
                <Radio.Button value="quarter">本季</Radio.Button>
                <Radio.Button value="year">本年</Radio.Button>
                <Radio.Button value="custom">自定义</Radio.Button>
              </Radio.Group>
              {presetRange === 'custom' ?
                <RangePicker value={customRange as any} onChange={v => setCustomRange(v as any)} />
              : null}
            </Space>
          </Col>
        </Row>

        <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={6}>
            <Text type="secondary">项目类型：</Text>
            <Select
              allowClear
              placeholder="全部类型"
              style={{ width: '100%', marginTop: 8 }}
              value={filterType}
              onChange={setFilterType}
              options={typeOptions.map(t => ({ label: t, value: t }))}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Text type="secondary">项目状态：</Text>
            <Select
              allowClear
              placeholder="全部状态"
              style={{ width: '100%', marginTop: 8 }}
              value={filterStatus}
              onChange={setFilterStatus}
              options={[...PROJECT_STATUSES_FOR_STAT].map(s => ({ label: s, value: s }))}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Text type="secondary">建设地点（关键词）：</Text>
            <Input
              allowClear
              placeholder="含匹配，如：浏阳"
              style={{ marginTop: 8 }}
              value={filterLocationKw}
              onChange={e => setFilterLocationKw(e.target.value)}
            />
          </Col>
          <Col xs={24} sm={12} md={6} style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Button
              className="search-btn"
              type="primary"
              icon={<SearchOutlined />}
              onClick={() => message.success('已按当前条件刷新统计（原型）')}
            >
              查询
            </Button>
          </Col>
        </Row>

        <Row gutter={[16, 12]} className="eco-stat-metrics-row" style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" className="eco-stat-metric-card">
              <Statistic
                title="项目总数（当前口径）"
                value={summary.n}
                suffix="个"
                valueStyle={{ color: '#1e5bb5' }}
                prefix={<ProjectOutlined />}
              />
              <div className="eco-stat-metric-foot">&nbsp;</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" className="eco-stat-metric-card">
              <Statistic
                title="总投资额"
                value={summary.investYi}
                suffix="亿元"
                precision={2}
                valueStyle={{ color: '#1e5bb5' }}
                prefix={<WalletOutlined />}
              />
              <div className="eco-stat-metric-foot">口径内合计 {summary.investWan.toLocaleString('zh-CN')} 万元</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" className="eco-stat-metric-card">
              <Statistic
                title="完工率"
                value={summary.completeRate}
                suffix="%"
                valueStyle={{ color: '#10B981' }}
                prefix={<CheckOutlined />}
              />
              <div className="eco-stat-metric-foot">已完工 {summary.completed} / {summary.n}</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" className="eco-stat-metric-card">
              <Statistic
                title="实施中项目"
                value={summary.inProgress}
                suffix="个"
                valueStyle={{ color: '#D97706' }}
                prefix={<FlagOutlined />}
              />
              <div className="eco-stat-metric-foot">非「已完工」状态</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" className="eco-stat-metric-card">
              <Statistic
                title="平均进度（全体）"
                value={summary.avgProgress}
                suffix="%"
                valueStyle={{ color: '#1e5bb5' }}
                prefix={<BarChartOutlined />}
              />
              <div className="eco-stat-metric-foot">&nbsp;</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" className="eco-stat-metric-card">
              <Statistic
                title="已完工项目平均进度"
                value={summary.doneProgressAvg}
                suffix="%"
                valueStyle={{ color: '#7c3aed' }}
                prefix={<TrophyOutlined />}
              />
              <div className="eco-stat-metric-foot">质量示意：完工项进度应接近 100%</div>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} className="eco-stat-chart-row" style={{ marginBottom: 16 }}>
          <Col xs={24} lg={12}>
            <Card size="small" title="项目状态分布">
              {summary.n ?
                <ProjectStatStatusBarChart counts={statusCounts} />
              : <div className="eco-stat-chart-empty">
                  <Empty description="无数据" />
                </div>}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card size="small" title="各类型项目数与投资额">
              {typeChartRows.length ?
                <ProjectStatTypeCountInvestChart rows={typeChartRows} />
              : <div className="eco-stat-chart-empty">
                  <Empty description="无类型数据" />
                </div>}
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} className="eco-stat-split-row" style={{ marginBottom: 16 }}>
          <Col xs={24} lg={12}>
            <Card size="small" title="按项目类型汇总">
              <div className="eco-stat-split-table-wrap">
                <Table
                  size="small"
                  pagination={false}
                  rowKey="key"
                  columns={typeColumns}
                  dataSource={byTypeRows}
                  locale={{ emptyText: '无数据' }}
                />
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card size="small" title="各建设地点投资额（横向）">
              {locationChartRows.length ?
                <ProjectStatLocationInvestChart rows={locationChartRows} />
              : <div className="eco-stat-chart-empty">
                  <Empty description="无数据" />
                </div>}
            </Card>
          </Col>
        </Row>

        <Card size="small" title="按建设地点汇总">
          <Table
            size="small"
            rowKey="key"
            pagination={{ defaultPageSize: 8, showTotal: n => `共 ${n} 处` }}
            columns={locationColumns}
            dataSource={byLocationRows}
            locale={{ emptyText: '无数据' }}
          />
        </Card>

        <Divider />
        </div>
      </Card>
    </div>
  );
};

/** 湖泊表单：日期时间与台账字符串互转 */
function lakeFormDayjsToDateTimeStr(v: unknown): string | undefined {
  if (v == null || v === '') return undefined;
  if (dayjs.isDayjs(v)) return v.format('YYYY-MM-DD HH:mm:ss');
  const s = String(v).trim();
  return s || undefined;
}

function lakeFormDayjsToDateStr(v: unknown): string | undefined {
  if (v == null || v === '') return undefined;
  if (dayjs.isDayjs(v)) return v.format('YYYY-MM-DD');
  const s = String(v).trim();
  return s.slice(0, 10) || undefined;
}

function lakeRowDatesToFormValues(row: LakeWaterBodyRow): Record<string, unknown> {
  return {
    ...row,
    effDate: row.effDate ? dayjs(row.effDate) : undefined,
    exprDate: row.exprDate ? dayjs(row.exprDate) : undefined,
    yscjsj: row.yscjsj ? dayjs(row.yscjsj, 'YYYY-MM-DD') : undefined,
    jlgxsj: row.jlgxsj ? dayjs(row.jlgxsj) : undefined,
  };
}

function lakeOptLabel(opts: { value: string; label: string }[], val?: string | null): string {
  if (val == null || val === '') return '—';
  return opts.find(o => o.value === val)?.label ?? val;
}

const LAKE_FORM_GUTTER: [number, number] = [16, 16];
const LAKE_COL_FULL = { xs: 24 as const, sm: 24 as const };
const LAKE_COL_THIRD = { xs: 24 as const, sm: 12 as const, lg: 8 as const };
/** 四等分列：河源/河口经纬度等同宽一行 */
const LAKE_COL_QUARTER = { xs: 24 as const, sm: 6 as const };

/**
 * 河道水体信息：依据 DB4401/T 138—2021 语义拆分 **河流（FOU_RIVER 河道对象）** 与 **湖泊水体** 两类主数据；责任段仍为河段分段台账。
 */
const WaterBodyInfoManage: React.FC<{
  /** 侧栏独立菜单：河流信息 / 湖泊信息 */
  page: 'river' | 'lake';
  /** 责任段台账：用于统计河流–河段1:N、湖泊连通河段下拉等 */
  sections: RiverSectionRow[];
  riverChannels: RiverChannelMasterRow[];
  onRiverChannelsChange: (rows: RiverChannelMasterRow[]) => void;
  lakes: LakeWaterBodyRow[];
  onLakesChange: (rows: LakeWaterBodyRow[]) => void;
}> = ({ page, sections, riverChannels, onRiverChannelsChange, lakes, onLakesChange }) => {
  const emptyRiverFilter = {
    riverObjectId: '',
    riverName: '',
    flowArea: undefined as string | undefined,
    crOverType: undefined as string | undefined,
    rvType: undefined as string | undefined,
    rvGrad: undefined as string | undefined,
    bank: undefined as string | undefined,
  };
  const emptyLakeFilter = {
    lakeObjectId: '',
    lakeName: '',
    belongHydroSystem: '',
    addvcd: undefined as string | undefined,
    crOverType: undefined as string | undefined,
    lkRank: undefined as string | undefined,
    adminLevel: undefined as AdminLevel | undefined,
  };
  const [riverFilterInput, setRiverFilterInput] = useState({
    ...emptyRiverFilter,
  });
  const [riverFilterQuery, setRiverFilterQuery] = useState({
    ...emptyRiverFilter,
  });
  const [lakeFilterInput, setLakeFilterInput] = useState({
    ...emptyLakeFilter,
  });
  const [lakeFilterQuery, setLakeFilterQuery] = useState({
    ...emptyLakeFilter,
  });
  const [riverModalOpen, setRiverModalOpen] = useState(false);
  const [lakeModalOpen, setLakeModalOpen] = useState(false);
  const [editingRiver, setEditingRiver] = useState<RiverChannelMasterRow | null>(null);
  const [editingLake, setEditingLake] = useState<LakeWaterBodyRow | null>(null);
  const [detailRiver, setDetailRiver] = useState<RiverChannelMasterRow | null>(null);
  const [detailLake, setDetailLake] = useState<LakeWaterBodyRow | null>(null);
  const [riverForm] = Form.useForm<RiverChannelMasterRow>();
  const [lakeForm] = Form.useForm<LakeWaterBodyRow>();

  const filteredRivers = useMemo(() => {
    const q = {
      riverObjectId: riverFilterQuery.riverObjectId.trim(),
      riverName: riverFilterQuery.riverName.trim(),
      flowArea: riverFilterQuery.flowArea?.trim() ?? '',
      crOverType: riverFilterQuery.crOverType?.trim() ?? '',
      rvType: riverFilterQuery.rvType?.trim() ?? '',
      rvGrad: riverFilterQuery.rvGrad?.trim() ?? '',
      bank: riverFilterQuery.bank?.trim() ?? '',
    };
    const hasAny = Object.values(q).some(Boolean);
    if (!hasAny) return riverChannels;
    return riverChannels.filter(r => {
      const flow = (r.flowArea ?? '').trim();
      return (
        (!q.riverObjectId || r.riverObjectId.includes(q.riverObjectId)) &&
        (!q.riverName || r.riverName.includes(q.riverName)) &&
        (!q.flowArea || parseRiverFlowAreaCodes(flow).includes(q.flowArea)) &&
        (!q.crOverType || (r.crOverType ?? '') === q.crOverType) &&
        (!q.rvType || (r.rvType ?? '') === q.rvType) &&
        (!q.rvGrad || (r.rvGrad ?? '') === q.rvGrad) &&
        (!q.bank || (r.bank ?? '') === q.bank)
      );
    });
  }, [riverChannels, riverFilterQuery]);

  const filteredLakes = useMemo(() => {
    const q = {
      lakeObjectId: lakeFilterQuery.lakeObjectId.trim(),
      lakeName: lakeFilterQuery.lakeName.trim(),
      belongHydroSystem: lakeFilterQuery.belongHydroSystem.trim(),
      addvcd: lakeFilterQuery.addvcd?.trim() ?? '',
      crOverType: lakeFilterQuery.crOverType?.trim() ?? '',
      lkRank: lakeFilterQuery.lkRank?.trim() ?? '',
      adminLevel: lakeFilterQuery.adminLevel?.trim() ?? '',
    };
    const hasAny = Object.values(q).some(Boolean);
    if (!hasAny) return lakes;
    return lakes.filter(x => {
      return (
        (!q.lakeObjectId || x.lakeObjectId.includes(q.lakeObjectId)) &&
        (!q.lakeName || x.lakeName.includes(q.lakeName)) &&
        (!q.belongHydroSystem || (x.belongHydroSystem ?? '').includes(q.belongHydroSystem)) &&
        (!q.addvcd || (x.addvcd ?? '') === q.addvcd) &&
        (!q.crOverType || (x.crOverType ?? '') === q.crOverType) &&
        (!q.lkRank || (x.lkRank ?? '') === q.lkRank) &&
        (!q.adminLevel || (x.adminLevel ?? '') === q.adminLevel)
      );
    });
  }, [lakes, lakeFilterQuery]);

  const openRiverAdd = () => {
    setEditingRiver(null);
    riverForm.resetFields();
    riverForm.setFieldsValue({
      crOverType: '6',
      rvType: '1',
      rvGrad: '3',
      bank: '0',
      rvLen: 0,
      rvBasArea: 0,
      remarks: '',
    } as Partial<RiverChannelMasterRow>);
    setRiverModalOpen(true);
  };

  const openRiverEdit = (r: RiverChannelMasterRow) => {
    setEditingRiver(r);
    riverForm.setFieldsValue(r);
    setRiverModalOpen(true);
  };

  const saveRiver = () => {
    riverForm.validateFields().then(v => {
      if (editingRiver) {
        onRiverChannelsChange(riverChannels.map(x => (x.key === editingRiver.key ? { ...x, ...v } : x)));
        message.success('已保存河流信息');
      } else {
        const maxK = riverChannels.reduce((m, x) => Math.max(m, parseInt(x.key.replace(/\D/g, ''), 10) || 0), 0);
        const key = `rch-${maxK + 1}`;
        onRiverChannelsChange([...riverChannels, { ...v, key } as RiverChannelMasterRow]);
        message.success('已新增河流信息');
      }
      setRiverModalOpen(false);
      riverForm.resetFields();
    });
  };

  const deleteRiver = (key: string) => {
    onRiverChannelsChange(riverChannels.filter(x => x.key !== key));
    message.success('已删除');
  };

  const openLakeAdd = () => {
    setEditingLake(null);
    lakeForm.resetFields();
    const now = dayjs();
    lakeForm.setFieldsValue({
      surfaceAreaKm2: 0,
      crOverType: '0',
      effDate: now,
      jlgxsj: now,
    } as never);
    setLakeModalOpen(true);
  };

  const openLakeEdit = (x: LakeWaterBodyRow) => {
    setEditingLake(x);
    lakeForm.setFieldsValue(lakeRowDatesToFormValues(x));
    setLakeModalOpen(true);
  };

  const saveLake = () => {
    lakeForm.validateFields().then(v => {
      const eff = lakeFormDayjsToDateTimeStr(v.effDate);
      const jlgx = lakeFormDayjsToDateTimeStr(v.jlgxsj);
      /** 表单仅维护 ATT_LK_BASE；河湖长制扩展字段保留存量或置默认 */
      const lakeExtDefaults: Pick<
        LakeWaterBodyRow,
        | 'belongHydroSystem'
        | 'regionName'
        | 'addvcd'
        | 'adminLevel'
        | 'lakeCategory'
        | 'adminAgency'
      > = {
        belongHydroSystem: '',
        regionName: '',
        addvcd: '',
        adminLevel: 'C',
        lakeCategory: '',
        adminAgency: '',
      };
      const merged = {
        ...lakeExtDefaults,
        ...(editingLake ?? {}),
        ...v,
        effDate: eff ?? dayjs().format('YYYY-MM-DD HH:mm:ss'),
        exprDate: lakeFormDayjsToDateTimeStr(v.exprDate),
        yscjsj: lakeFormDayjsToDateStr(v.yscjsj),
        jlgxsj: jlgx ?? dayjs().format('YYYY-MM-DD HH:mm:ss'),
      } as LakeWaterBodyRow;
      if (editingLake) {
        onLakesChange(lakes.map(x => (x.key === editingLake.key ? { ...x, ...merged } : x)));
        message.success('已保存湖泊信息');
      } else {
        const maxK = lakes.reduce((m, x) => Math.max(m, parseInt(x.key.replace(/\D/g, ''), 10) || 0), 0);
        const key = `lk-${maxK + 1}`;
        onLakesChange([...lakes, { ...merged, key }]);
        message.success('已新增湖泊信息');
      }
      setLakeModalOpen(false);
      lakeForm.resetFields();
    });
  };

  const deleteLake = (key: string) => {
    onLakesChange(lakes.filter(x => x.key !== key));
    message.success('已删除');
  };

  const riverAllColumns = useMemo<EcoColumnConfig[]>(
    () => [
      { key: 'riverObjectId', title: '河流代码', dataIndex: 'riverObjectId', width: 196, defaultVisible: true },
      { key: 'riverName', title: '河流名称', dataIndex: 'riverName', width: 120, defaultVisible: true },
    {
      key: 'crOverType',
      title: '跨界类型',
      dataIndex: 'crOverType',
      width: 120,
      defaultVisible: true,
      render: (c: string | undefined) => riverAttCodeLabel([...RV_ATT_CR_OVER_TYPE_OPTIONS], c),
    },
    {
      key: 'rvType',
      title: '河流类型',
      dataIndex: 'rvType',
      width: 112,
      defaultVisible: true,
      render: (c: string | undefined) => riverAttCodeLabel([...RV_ATT_RV_TYPE_OPTIONS], c),
    },
    {
      key: 'rvGrad',
      title: '河流级别',
      dataIndex: 'rvGrad',
      width: 112,
      defaultVisible: true,
      render: (c: string | undefined) => riverAttCodeLabel([...RV_ATT_RV_GRAD_OPTIONS], c),
    },
    {
      key: 'bank',
      title: '岸别',
      dataIndex: 'bank',
      width: 88,
      defaultVisible: true,
      render: (c: string | undefined) => riverAttCodeLabel([...RV_ATT_BANK_OPTIONS], c),
    },
    {
      key: 'rvLen',
      title: '河长（千米）',
      dataIndex: 'rvLen',
      width: 96,
      align: 'right',
      defaultVisible: true,
      render: (n: number | null | undefined) => (n != null && Number.isFinite(Number(n)) ? Number(n) : '—'),
    },
    {
      key: 'rvBasArea',
      title: '集水面积（平方千米）',
      dataIndex: 'rvBasArea',
      width: 120,
      align: 'right',
      defaultVisible: true,
      render: (n: number | null | undefined) => (n != null && Number.isFinite(Number(n)) ? Number(n) : '—'),
    },
    {
      key: 'flowArea',
      title: '流经行政区',
      dataIndex: 'flowArea',
      width: 220,
      defaultVisible: true,
      render: (_: unknown, r: RiverChannelMasterRow) => formatRiverFlowAreaCodesDisplay(r.flowArea),
    },
    {
      key: 'secCount',
      title: '责任段数',
      width: 88,
      align: 'right',
      defaultVisible: true,
      render: (_: unknown, r: RiverChannelMasterRow) =>
        sections.filter(s => s.linkedRiverObjectId === r.riverObjectId).length,
    },
    {
      key: 'operation',
      title: '操作',
      width: 140,
      fixed: 'right',
      defaultVisible: true,
    },
    ],
    [sections],
  );
  const [visibleRiverColumns, setVisibleRiverColumns] = useState<string[]>(() =>
    getEcoDefaultVisibleColumnKeys(riverAllColumns),
  );
  useEffect(() => {
    setVisibleRiverColumns(prev => {
      const validKeys = riverAllColumns.map(c => c.key);
      const filtered = prev.filter(k => validKeys.includes(k) && k !== 'operation');
      const dedup = Array.from(new Set(filtered));
      return dedup.length ? dedup : getEcoDefaultVisibleColumnKeys(riverAllColumns);
    });
  }, [riverAllColumns]);
  const riverOperationRender = useCallback(
    (r: RiverChannelMasterRow) => (
      <Space size="small">
        <Button type="link" className="action-btn detail" icon={<EyeOutlined />} onClick={() => setDetailRiver(r)}>
          详情
        </Button>
        <Button type="link" className="action-btn edit" icon={<EditOutlined />} onClick={() => openRiverEdit(r)}>
          编辑
        </Button>
      </Space>
    ),
    [],
  );
  const riverCols = useMemo(
    () => buildTableColumnsFromEcoConfig(riverAllColumns, visibleRiverColumns, riverOperationRender),
    [riverAllColumns, visibleRiverColumns, riverOperationRender],
  );
  const riverTableScrollX = useMemo(
    () => getEcoTableScrollX(riverAllColumns.filter(c => c.key === 'operation' || visibleRiverColumns.includes(c.key))),
    [riverAllColumns, visibleRiverColumns],
  );

  const lakeAllColumns = useMemo<EcoColumnConfig[]>(
    () => [
      { key: 'lakeObjectId', title: '湖泊代码', dataIndex: 'lakeObjectId', width: 184, defaultVisible: true },
      { key: 'lakeName', title: '湖泊名称', dataIndex: 'lakeName', width: 132, defaultVisible: true },
    {
      key: 'lkLoc',
      title: '湖泊所在位置',
      dataIndex: 'lkLoc',
      width: 200,
      defaultVisible: true,
      render: (t: string | undefined) => t?.trim() || '—',
    },
    {
      key: 'lowLeftLong',
      title: '左下角经度（°）',
      dataIndex: 'lowLeftLong',
      width: 112,
      align: 'right',
      defaultVisible: true,
      render: (n: number | undefined) => (n != null && Number.isFinite(n) ? n.toFixed(6) : '—'),
    },
    {
      key: 'lowLeftLat',
      title: '左下角纬度（°）',
      dataIndex: 'lowLeftLat',
      width: 112,
      align: 'right',
      defaultVisible: true,
      render: (n: number | undefined) => (n != null && Number.isFinite(n) ? n.toFixed(6) : '—'),
    },
    {
      key: 'upRightLong',
      title: '右上角经度（°）',
      dataIndex: 'upRightLong',
      width: 112,
      align: 'right',
      defaultVisible: true,
      render: (n: number | undefined) => (n != null && Number.isFinite(n) ? n.toFixed(6) : '—'),
    },
    {
      key: 'upRightLat',
      title: '右上角纬度（°）',
      dataIndex: 'upRightLat',
      width: 112,
      align: 'right',
      defaultVisible: true,
      render: (n: number | undefined) => (n != null && Number.isFinite(n) ? n.toFixed(6) : '—'),
    },
      {
        key: 'surfaceAreaKm2',
        title: '水面面积（km²）',
        dataIndex: 'surfaceAreaKm2',
        width: 104,
        align: 'right',
        defaultVisible: true,
      },
    {
      key: 'storage10kM3',
      title: '湖泊容积（10⁴m³）',
      dataIndex: 'storage10kM3',
      width: 112,
      align: 'right',
      defaultVisible: true,
      render: (n: number | undefined) => (n != null && Number.isFinite(n) ? n : '—'),
    },
    {
      key: 'crOverType',
      title: '跨界类型',
      dataIndex: 'crOverType',
      width: 96,
      defaultVisible: true,
      render: (c: string | undefined) => lakeOptLabel(LAKE_CR_OVER_TYPE_OPTIONS, c),
    },
    {
      key: 'lkRank',
      title: '湖泊级别',
      dataIndex: 'lkRank',
      width: 88,
      defaultVisible: true,
      render: (c: string | undefined) => lakeOptLabel(LAKE_LK_RANK_OPTIONS, c),
    },
      {
        key: 'belongHydroSystem',
        title: '所属水系',
        dataIndex: 'belongHydroSystem',
        width: 112,
        defaultVisible: true,
      },
    {
      key: 'regionName',
      title: '所属区划',
      dataIndex: 'regionName',
      width: 140,
      defaultVisible: true,
      render: (_: string, row: LakeWaterBodyRow) =>
        row.addvcd ? getShaoshanAddvcdLabel(row.addvcd) : row.regionName || '—',
    },
      { key: 'lakeCategory', title: '水体类型', dataIndex: 'lakeCategory', width: 128, defaultVisible: true },
    {
      key: 'adminLevel',
      title: '管理级别',
      dataIndex: 'adminLevel',
      width: 88,
      defaultVisible: true,
      render: (a: AdminLevel) => ADMIN_LEVEL_LABEL[a],
    },
    {
      key: 'connRiver',
      title: '连通河流',
      width: 120,
      defaultVisible: true,
      render: (_: unknown, x: LakeWaterBodyRow) => {
        const id = x.connectedRiverObjectId;
        if (!id) return '—';
        return riverChannels.find(rc => rc.riverObjectId === id)?.riverName ?? id;
      },
    },
    {
      key: 'operation',
      title: '操作',
      width: 140,
      fixed: 'right',
      defaultVisible: true,
    },
    ],
    [riverChannels],
  );
  const [visibleLakeColumns, setVisibleLakeColumns] = useState<string[]>(() =>
    getEcoDefaultVisibleColumnKeys(lakeAllColumns),
  );
  useEffect(() => {
    setVisibleLakeColumns(prev => {
      const validKeys = lakeAllColumns.map(c => c.key);
      const filtered = prev.filter(k => validKeys.includes(k) && k !== 'operation');
      const dedup = Array.from(new Set(filtered));
      return dedup.length ? dedup : getEcoDefaultVisibleColumnKeys(lakeAllColumns);
    });
  }, [lakeAllColumns]);
  const lakeOperationRender = useCallback(
    (r: LakeWaterBodyRow) => (
      <Space size="small">
        <Button type="link" className="action-btn detail" icon={<EyeOutlined />} onClick={() => setDetailLake(r)}>
          详情
        </Button>
        <Button type="link" className="action-btn edit" icon={<EditOutlined />} onClick={() => openLakeEdit(r)}>
          编辑
        </Button>
      </Space>
    ),
    [],
  );
  const lakeCols = useMemo(
    () => buildTableColumnsFromEcoConfig(lakeAllColumns, visibleLakeColumns, lakeOperationRender),
    [lakeAllColumns, visibleLakeColumns, lakeOperationRender],
  );
  const lakeTableScrollX = useMemo(
    () => getEcoTableScrollX(lakeAllColumns.filter(c => c.key === 'operation' || visibleLakeColumns.includes(c.key))),
    [lakeAllColumns, visibleLakeColumns],
  );

  /** 河流详情弹窗：当前河流对象下的责任段列表 */
  const riverDetailLinkedSections = useMemo(() => {
    if (!detailRiver) return [];
    return sections.filter(s => s.linkedRiverObjectId === detailRiver.riverObjectId);
  }, [sections, detailRiver]);

  const riverDetailSectionColumns = useMemo((): ColumnsType<RiverSectionRow> => {
    return [
      {
        title: '河段编码',
        dataIndex: 'sectionId',
        key: 'sectionId',
        width: 228,
        ellipsis: true,
      },
      { title: '河段名称', dataIndex: 'sectionName', key: 'sectionName', width: 150, ellipsis: true },
      { title: '所属水系', dataIndex: 'riverSystem', key: 'riverSystem', width: 100, ellipsis: true },
      {
        title: '岸别',
        dataIndex: 'riverSide',
        key: 'riverSide',
        width: 72,
        render: (s: RiverSide) => <Tag>{RIVER_SIDE_LABEL[s]}</Tag>,
      },
      {
        title: '河段类型',
        dataIndex: 'sectionType',
        key: 'sectionType',
        width: 100,
        render: (t: SectionType) => SECTION_TYPE_LABEL[t] ?? t,
      },
      {
        title: '管理级别',
        dataIndex: 'adminLevel',
        key: 'adminLevel',
        width: 88,
        render: (a: AdminLevel) => (
          <Tag color={a === 'A' ? 'red' : a === 'B' ? 'blue' : 'green'}>{ADMIN_LEVEL_LABEL[a]}</Tag>
        ),
      },
      { title: '河段长度（千米）', dataIndex: 'riverLenKm', key: 'riverLenKm', width: 112, align: 'right' },
      { title: '责任河长', dataIndex: 'chiefName', key: 'chiefName', width: 88 },
      { title: '手机号码', dataIndex: 'chiefMobile', key: 'chiefMobile', width: 120 },
      { title: '起点', dataIndex: 'startAddr', key: 'startAddr', width: 120, ellipsis: true },
      { title: '终点', dataIndex: 'endAddr', key: 'endAddr', width: 120, ellipsis: true },
    ];
  }, []);

  return (
    <div className="facility-view">
      <Card
        title={page === 'river' ? '河流信息' : '湖泊信息'}
        extra={
          <Space>
            <EcoProtoExportBtn
              onClick={() =>
                exportEcoTableExcel(
                  (page === 'river' ? filteredRivers : filteredLakes) as unknown as Record<string, unknown>[],
                  (page === 'river' ? riverAllColumns : lakeAllColumns) as unknown as Array<{
                    key?: string;
                    title?: unknown;
                    dataIndex?: unknown;
                  }>,
                  page === 'river' ? '生态整治_河流信息' : '生态整治_湖泊信息',
                  page === 'river' ? '河流信息' : '湖泊信息',
                )
              }
            />
            <EcoColumnManager
              columns={page === 'river' ? riverAllColumns : lakeAllColumns}
              visibleColumns={page === 'river' ? visibleRiverColumns : visibleLakeColumns}
              onChange={page === 'river' ? setVisibleRiverColumns : setVisibleLakeColumns}
            />
            {page === 'river' ?
              <Button type="primary" icon={<PlusOutlined />} className="add-btn" onClick={openRiverAdd}>
                新增河流
              </Button>
            : <Button type="primary" icon={<PlusOutlined />} className="add-btn" onClick={openLakeAdd}>
                新增湖泊
              </Button>}
          </Space>
        }
      >
        {page === 'river' ?
          <>
            <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={12} md={6}>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="流经行政区"
                  style={{ width: '100%' }}
                  value={riverFilterInput.flowArea}
                  onChange={v => setRiverFilterInput(prev => ({ ...prev, flowArea: v ?? undefined }))}
                  options={RIVER_FLOW_AREA_ADDVCD_OPTIONS}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Select
                  allowClear
                  placeholder="跨界类型"
                  style={{ width: '100%' }}
                  value={riverFilterInput.crOverType}
                  onChange={v => setRiverFilterInput(prev => ({ ...prev, crOverType: v ?? undefined }))}
                  options={[...RV_ATT_CR_OVER_TYPE_OPTIONS]}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Select
                  allowClear
                  placeholder="河流类型"
                  style={{ width: '100%' }}
                  value={riverFilterInput.rvType}
                  onChange={v => setRiverFilterInput(prev => ({ ...prev, rvType: v ?? undefined }))}
                  options={[...RV_ATT_RV_TYPE_OPTIONS]}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Select
                  allowClear
                  placeholder="河流级别"
                  style={{ width: '100%' }}
                  value={riverFilterInput.rvGrad}
                  onChange={v => setRiverFilterInput(prev => ({ ...prev, rvGrad: v ?? undefined }))}
                  options={[...RV_ATT_RV_GRAD_OPTIONS]}
                />
              </Col>
            </Row>
            <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={12} md={6}>
                <Select
                  allowClear
                  placeholder="岸别"
                  style={{ width: '100%' }}
                  value={riverFilterInput.bank}
                  onChange={v => setRiverFilterInput(prev => ({ ...prev, bank: v ?? undefined }))}
                  options={[...RV_ATT_BANK_OPTIONS]}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Input
                  allowClear
                  placeholder="河流名称"
                  prefix={<SearchOutlined />}
                  value={riverFilterInput.riverName}
                  onChange={e => setRiverFilterInput(prev => ({ ...prev, riverName: e.target.value }))}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Input
                  allowClear
                  placeholder="河流代码"
                  prefix={<SearchOutlined />}
                  value={riverFilterInput.riverObjectId}
                  onChange={e => setRiverFilterInput(prev => ({ ...prev, riverObjectId: e.target.value }))}
                />
              </Col>
              <Col xs={24} sm={12} md={6} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Space>
                  <Button
                    type="primary"
                    className="search-btn"
                    icon={<SearchOutlined />}
                    style={{ width: 92 }}
                    onClick={() => setRiverFilterQuery(riverFilterInput)}
                  >
                    查询
                  </Button>
                  <Button
                    style={{ width: 92 }}
                    onClick={() => {
                      setRiverFilterInput(emptyRiverFilter);
                      setRiverFilterQuery(emptyRiverFilter);
                    }}
                  >
                    重置
                  </Button>
                </Space>
              </Col>
            </Row>
            <div className="facility-table-wrap">
              <Table<RiverChannelMasterRow>
                rowKey="key"
                size="small"
                scroll={{ x: riverTableScrollX }}
                pagination={{ defaultPageSize: 10, showTotal: n => `共 ${n} 条` }}
                columns={riverCols}
                dataSource={filteredRivers}
              />
            </div>
          </>
        : <>
            <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={12} md={6}>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="所属区划"
                  style={{ width: '100%' }}
                  value={lakeFilterInput.addvcd}
                  onChange={v => setLakeFilterInput(prev => ({ ...prev, addvcd: v ?? undefined }))}
                  options={SHAOSHAN_ADDVCD_OPTIONS}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Select
                  allowClear
                  placeholder="跨界类型"
                  style={{ width: '100%' }}
                  value={lakeFilterInput.crOverType}
                  onChange={v => setLakeFilterInput(prev => ({ ...prev, crOverType: v ?? undefined }))}
                  options={LAKE_CR_OVER_TYPE_OPTIONS}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Select
                  allowClear
                  placeholder="湖泊级别"
                  style={{ width: '100%' }}
                  value={lakeFilterInput.lkRank}
                  onChange={v => setLakeFilterInput(prev => ({ ...prev, lkRank: v ?? undefined }))}
                  options={LAKE_LK_RANK_OPTIONS}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Select
                  allowClear
                  placeholder="管理级别"
                  style={{ width: '100%' }}
                  value={lakeFilterInput.adminLevel}
                  onChange={v => setLakeFilterInput(prev => ({ ...prev, adminLevel: v as AdminLevel | undefined }))}
                  options={Object.entries(ADMIN_LEVEL_LABEL).map(([value, label]) => ({ value, label }))}
                />
              </Col>
            </Row>
            <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={12} md={6}>
                <Input
                  allowClear
                  placeholder="湖泊名称"
                  prefix={<SearchOutlined />}
                  value={lakeFilterInput.lakeName}
                  onChange={e => setLakeFilterInput(prev => ({ ...prev, lakeName: e.target.value }))}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Input
                  allowClear
                  placeholder="湖泊代码"
                  prefix={<SearchOutlined />}
                  value={lakeFilterInput.lakeObjectId}
                  onChange={e => setLakeFilterInput(prev => ({ ...prev, lakeObjectId: e.target.value }))}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Input
                  allowClear
                  placeholder="所属水系"
                  prefix={<SearchOutlined />}
                  value={lakeFilterInput.belongHydroSystem}
                  onChange={e => setLakeFilterInput(prev => ({ ...prev, belongHydroSystem: e.target.value }))}
                />
              </Col>
              <Col xs={24} sm={12} md={6} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Space>
                  <Button
                    type="primary"
                    className="search-btn"
                    icon={<SearchOutlined />}
                    style={{ width: 92 }}
                    onClick={() => setLakeFilterQuery(lakeFilterInput)}
                  >
                    查询
                  </Button>
                  <Button
                    style={{ width: 92 }}
                    onClick={() => {
                      setLakeFilterInput(emptyLakeFilter);
                      setLakeFilterQuery(emptyLakeFilter);
                    }}
                  >
                    重置
                  </Button>
                </Space>
              </Col>
            </Row>
            <div className="facility-table-wrap">
              <Table<LakeWaterBodyRow>
                rowKey="key"
                size="small"
                scroll={{ x: lakeTableScrollX }}
                pagination={{ defaultPageSize: 10, showTotal: n => `共 ${n} 条` }}
                columns={lakeCols}
                dataSource={filteredLakes}
              />
            </div>
          </>}
      </Card>

      <Modal
        styles={{
          ...formModalStyles,
          body: { ...formModalStyles.body, maxHeight: 'min(85vh, 900px)', overflowY: 'auto' as const },
        }}
        title={editingRiver ? '编辑河流信息' : '新增河流信息'}
        open={riverModalOpen}
        onCancel={() => {
          setRiverModalOpen(false);
          riverForm.resetFields();
        }}
        width={1000}
        footer={
          <Space>
            {editingRiver ?
              <Popconfirm title="确认删除？" onConfirm={() => { deleteRiver(editingRiver.key); setRiverModalOpen(false); riverForm.resetFields(); }}>
                <Button danger>删除</Button>
              </Popconfirm>
            : null}
            <Button onClick={() => { setRiverModalOpen(false); riverForm.resetFields(); }}>取消</Button>
            <Button type="primary" onClick={saveRiver}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={riverForm} layout="vertical" style={{ marginTop: 8 }} className="facility-river-att-rv-form">
          <Title level={5} style={{ marginTop: 0 }}>
            对象标识与分类（表6 河流基础信息）
          </Title>
          <Row gutter={LAKE_FORM_GUTTER}>
            <Col {...LAKE_COL_THIRD}>
              <Form.Item name="riverObjectId" label="河流代码" rules={[{ required: true, message: '请填写河流代码' }]}>
                <Input maxLength={64} placeholder="与规范河流代码一致，供责任段外键引用" />
              </Form.Item>
            </Col>
            <Col {...LAKE_COL_THIRD}>
              <Form.Item name="riverName" label="河流名称" rules={[{ required: true, message: '请填写河流名称' }]}>
                <Input maxLength={100} />
              </Form.Item>
            </Col>
            <Col {...LAKE_COL_THIRD}>
              <Form.Item name="crOverType" label="跨界类型" rules={[{ required: true, message: '请选择跨界类型' }]}>
                <Select allowClear={false} options={[...RV_ATT_CR_OVER_TYPE_OPTIONS]} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={LAKE_FORM_GUTTER}>
            <Col {...LAKE_COL_THIRD}>
              <Form.Item name="rvType" label="河流类型" rules={[{ required: true, message: '请选择河流类型' }]}>
                <Select allowClear={false} options={[...RV_ATT_RV_TYPE_OPTIONS]} />
              </Form.Item>
            </Col>
            <Col {...LAKE_COL_THIRD}>
              <Form.Item name="rvGrad" label="河流级别" rules={[{ required: true, message: '请选择河流级别' }]}>
                <Select allowClear={false} options={[...RV_ATT_RV_GRAD_OPTIONS]} />
              </Form.Item>
            </Col>
            <Col {...LAKE_COL_THIRD}>
              <Form.Item name="bank" label="岸别" rules={[{ required: true, message: '请选择岸别' }]}>
                <Select allowClear={false} options={[...RV_ATT_BANK_OPTIONS]} />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '12px 0' }} />
          <Title level={5}>河源与河口</Title>
          <Row gutter={LAKE_FORM_GUTTER}>
            <Col {...LAKE_COL_QUARTER}>
              <Form.Item name="rvSourLong" label="河源经度" tooltip="可与地图选点同步">
                <InputNumber style={{ width: '100%' }} step={0.000001} />
              </Form.Item>
            </Col>
            <Col {...LAKE_COL_QUARTER}>
              <Form.Item name="rvSourLat" label="河源纬度" tooltip="可与地图选点同步">
                <InputNumber style={{ width: '100%' }} step={0.000001} />
              </Form.Item>
            </Col>
            <Col {...LAKE_COL_QUARTER}>
              <Form.Item name="rvMouLong" label="河口经度">
                <InputNumber style={{ width: '100%' }} step={0.000001} />
              </Form.Item>
            </Col>
            <Col {...LAKE_COL_QUARTER}>
              <Form.Item name="rvMouLat" label="河口纬度">
                <InputNumber style={{ width: '100%' }} step={0.000001} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={LAKE_FORM_GUTTER}>
            <Col {...LAKE_COL_FULL}>
              <Form.Item
                name="rvSourLoc"
                label="河源所在位置"
                rules={[{ required: true, message: '请填写河源所在位置' }]}
                extra={ADDR_MAP_FORM_ITEM_EXTRA}
              >
                <Input.TextArea rows={2} maxLength={256} placeholder={ADDR_MAP_INPUT_PLACEHOLDER} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={LAKE_FORM_GUTTER}>
            <Col {...LAKE_COL_FULL}>
              <Form.Item name="rvMouLoc" label="河口所在位置" rules={[{ required: true, message: '请填写河口所在位置' }]}>
                <Input.TextArea rows={2} maxLength={256} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={LAKE_FORM_GUTTER}>
            <Col {...LAKE_COL_FULL}>
              <Form.Item label="河源与河口位置地图" colon={false}>
                <RiverSourceMouthWgs84MapPicker
                  form={riverForm}
                  sourLngField="rvSourLong"
                  sourLatField="rvSourLat"
                  sourAddrField="rvSourLoc"
                  mouLngField="rvMouLong"
                  mouLatField="rvMouLat"
                  mouAddrField="rvMouLoc"
                  mapAriaLabel="河源与河口位置地图"
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '12px 0' }} />
          <Title level={5}>规模与流经范围</Title>
          <Row gutter={LAKE_FORM_GUTTER}>
            <Col {...LAKE_COL_FULL}>
              <Form.Item
                name="flowArea"
                label="河流流经行政区"
                tooltip="可多选；保存为英文逗号分隔的区划编码，列表与详情展示为中文名称。"
                rules={[{ required: true, message: '请选择河流流经行政区' }]}
                getValueFromEvent={(v: unknown) => (Array.isArray(v) && v.length ? v.map(String).join(',') : '')}
                getValueProps={(v: unknown) => ({
                  value: parseRiverFlowAreaCodes(typeof v === 'string' ? v : ''),
                })}
              >
                <Select
                  mode="multiple"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="请选择涉及行政区划（可多选）"
                  options={RIVER_FLOW_AREA_ADDVCD_OPTIONS}
                  maxTagCount="responsive"
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={LAKE_FORM_GUTTER}>
            <Col {...LAKE_COL_THIRD}>
              <Form.Item name="rvLen" label="河长（千米）" rules={[{ required: true, message: '请填写河长' }]}>
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col {...LAKE_COL_THIRD}>
              <Form.Item name="rvBasArea" label="集水面积（平方千米）" rules={[{ required: true, message: '请填写集水面积' }]}>
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col {...LAKE_COL_THIRD}>
              <Form.Item name="averSlop" label="平均比降（千分比）">
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="remarks" label="备注">
            <TextArea rows={2} maxLength={512} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        styles={{
          ...formModalStyles,
          body: { ...formModalStyles.body, maxHeight: 'min(85vh, 900px)', overflowY: 'auto' as const },
        }}
        title={editingLake ? '编辑湖泊信息' : '新增湖泊信息'}
        open={lakeModalOpen}
        onCancel={() => {
          setLakeModalOpen(false);
          lakeForm.resetFields();
        }}
        width={1000}
        footer={
          <Space>
            {editingLake ?
              <Popconfirm title="确认删除？" onConfirm={() => { deleteLake(editingLake.key); setLakeModalOpen(false); lakeForm.resetFields(); }}>
                <Button danger>删除</Button>
              </Popconfirm>
            : null}
            <Button onClick={() => { setLakeModalOpen(false); lakeForm.resetFields(); }}>取消</Button>
            <Button type="primary" onClick={saveLake}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={lakeForm} layout="vertical" style={{ marginTop: 8 }} className="facility-lake-att-lk-form">
          <Title level={5}>对象标识与位置</Title>
          <Row gutter={LAKE_FORM_GUTTER}>
            <Col {...LAKE_COL_THIRD}>
              <Form.Item name="lakeObjectId" label="湖泊代码" rules={[{ required: true, message: '请填写湖泊代码' }]}>
                <Input maxLength={18} placeholder="全国唯一标识符" />
              </Form.Item>
            </Col>
            <Col {...LAKE_COL_THIRD}>
              <Form.Item name="lakeName" label="湖泊名称" rules={[{ required: true }]}>
                <Input maxLength={100} />
              </Form.Item>
            </Col>
            <Col {...LAKE_COL_THIRD}>
              <Form.Item name="crOverType" label="跨界类型">
                <Select allowClear placeholder="可选" options={LAKE_CR_OVER_TYPE_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={LAKE_FORM_GUTTER}>
            <Col {...LAKE_COL_FULL}>
              <Form.Item name="lkLoc" label="湖泊所在位置" extra={ADDR_MAP_FORM_ITEM_EXTRA}>
                <Input.TextArea rows={2} maxLength={256} placeholder={ADDR_MAP_INPUT_PLACEHOLDER} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={LAKE_FORM_GUTTER}>
            <Col {...LAKE_COL_FULL}>
              <Form.Item label="湖泊位置地图（POI）" colon={false}>
                <AddrWgs84MapPicker
                  form={lakeForm}
                  addrField="lkLoc"
                  lngField="poiLong"
                  latField="poiLat"
                  mapAriaLabel="湖泊位置地图"
                  hintAddressLabel="湖泊所在位置"
                  lngLatValueMode="number"
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={LAKE_FORM_GUTTER}>
            <Col {...LAKE_COL_THIRD}>
              <Form.Item label="地图经度（POI）" name="poiLong" tooltip={ADDR_MAP_POI_COORD_TOOLTIP}>
                <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
              </Form.Item>
            </Col>
            <Col {...LAKE_COL_THIRD}>
              <Form.Item label="地图纬度（POI）" name="poiLat" tooltip={ADDR_MAP_POI_COORD_TOOLTIP}>
                <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={LAKE_FORM_GUTTER}>
            <Col {...LAKE_COL_THIRD}>
              <Form.Item
                label="左下角经度"
                name="lowLeftLong"
                rules={[{ required: true, message: '请填写左下角经度' }]}
                tooltip={ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP}
              >
                <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
              </Form.Item>
            </Col>
            <Col {...LAKE_COL_THIRD}>
              <Form.Item
                label="左下角纬度"
                name="lowLeftLat"
                rules={[{ required: true, message: '请填写左下角纬度' }]}
                tooltip={ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP}
              >
                <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={LAKE_FORM_GUTTER}>
            <Col {...LAKE_COL_THIRD}>
              <Form.Item
                label="右上角经度"
                name="upRightLong"
                rules={[{ required: true, message: '请填写右上角经度' }]}
                tooltip={ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP}
              >
                <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
              </Form.Item>
            </Col>
            <Col {...LAKE_COL_THIRD}>
              <Form.Item
                label="右上角纬度"
                name="upRightLat"
                rules={[{ required: true, message: '请填写右上角纬度' }]}
                tooltip={ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP}
              >
                <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
              </Form.Item>
            </Col>
          </Row>

          <Title level={5}>主要特征</Title>
          <Row gutter={LAKE_FORM_GUTTER}>
            <Col {...LAKE_COL_THIRD}>
              <Form.Item name="surfaceAreaKm2" label="水面面积（km²）" rules={[{ required: true }]}>
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} placeholder="平方千米" />
              </Form.Item>
            </Col>
            <Col {...LAKE_COL_THIRD}>
              <Form.Item name="storage10kM3" label="湖泊容积（10⁴m³）">
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} placeholder="万立方米" />
              </Form.Item>
            </Col>
            <Col {...LAKE_COL_THIRD}>
              <Form.Item name="lkRank" label="湖泊级别">
                <Select allowClear placeholder="按面积档" options={LAKE_LK_RANK_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={LAKE_FORM_GUTTER}>
            <Col {...LAKE_COL_THIRD}>
              <Form.Item name="salFreWat" label="咸淡水属性">
                <Select allowClear options={LAKE_SAL_FRE_WAT_OPTIONS} />
              </Form.Item>
            </Col>
            <Col {...LAKE_COL_THIRD}>
              <Form.Item name="avgDepthM" label="平均水深（m）">
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col {...LAKE_COL_THIRD}>
              <Form.Item name="maxDepthM" label="最大水深（m）">
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="remarks" label="备注">
            <TextArea rows={2} maxLength={256} />
          </Form.Item>

          <Title level={5}>时间戳</Title>
          <Row gutter={LAKE_FORM_GUTTER}>
            <Col {...LAKE_COL_THIRD}>
              <Form.Item name="effDate" label="记录生效时间" rules={[{ required: true, message: '请选择记录生效时间' }]}>
                <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm:ss" />
              </Form.Item>
            </Col>
            <Col {...LAKE_COL_THIRD}>
              <Form.Item name="exprDate" label="记录失效时间">
                <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm:ss" />
              </Form.Item>
            </Col>
            <Col {...LAKE_COL_THIRD}>
              <Form.Item name="yscjsj" label="要素采集时间">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={LAKE_FORM_GUTTER}>
            <Col {...LAKE_COL_THIRD}>
              <Form.Item name="jlgxsj" label="记录更新时间" rules={[{ required: true, message: '请选择记录更新时间' }]}>
                <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm:ss" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title="河流信息详情"
        open={!!detailRiver}
        onCancel={() => setDetailRiver(null)}
        footer={null}
        width={1040}
        styles={{
          ...formModalStyles,
          body: { ...formModalStyles.body, maxHeight: 'min(85vh, 900px)', overflowY: 'auto' as const },
        }}
      >
        {detailRiver ?
          <DetailTabsIfMultiple
            key={detailRiver.key}
            size="small"
            defaultActiveKey="basic"
            style={{ marginTop: 8 }}
            items={[
              {
                key: 'basic',
                label: '基本信息',
                children: (
                  <>
                    <Descriptions bordered size="small" column={2} className="zht-river-section-detail-desc">
                      <Descriptions.Item label="河流代码">{detailRiver.riverObjectId}</Descriptions.Item>
                      <Descriptions.Item label="河流名称">{detailRiver.riverName}</Descriptions.Item>
                      <Descriptions.Item label="跨界类型">
                        {riverAttCodeLabel([...RV_ATT_CR_OVER_TYPE_OPTIONS], detailRiver.crOverType)}
                      </Descriptions.Item>
                      <Descriptions.Item label="河流类型">
                        {riverAttCodeLabel([...RV_ATT_RV_TYPE_OPTIONS], detailRiver.rvType)}
                      </Descriptions.Item>
                      <Descriptions.Item label="河流级别">
                        {riverAttCodeLabel([...RV_ATT_RV_GRAD_OPTIONS], detailRiver.rvGrad)}
                      </Descriptions.Item>
                      <Descriptions.Item label="岸别">
                        {riverAttCodeLabel([...RV_ATT_BANK_OPTIONS], detailRiver.bank)}
                      </Descriptions.Item>
                      <Descriptions.Item label="河源经度（度）">
                        {detailRiver.rvSourLong != null && Number.isFinite(detailRiver.rvSourLong)
                          ? detailRiver.rvSourLong.toFixed(6)
                          : '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="河源纬度（度）">
                        {detailRiver.rvSourLat != null && Number.isFinite(detailRiver.rvSourLat)
                          ? detailRiver.rvSourLat.toFixed(6)
                          : '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="河口经度（度）">
                        {detailRiver.rvMouLong != null && Number.isFinite(detailRiver.rvMouLong)
                          ? detailRiver.rvMouLong.toFixed(6)
                          : '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="河口纬度（度）">
                        {detailRiver.rvMouLat != null && Number.isFinite(detailRiver.rvMouLat)
                          ? detailRiver.rvMouLat.toFixed(6)
                          : '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="河源所在位置">
                        {(detailRiver.rvSourLoc ?? '').trim() || '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="河口所在位置">
                        {(detailRiver.rvMouLoc ?? '').trim() || '—'}
                      </Descriptions.Item>
                      <Descriptions.Item
                        label="河源与河口位置地图"
                        span={2}
                        className="facility-river-detail-map-item"
                        contentStyle={{ display: 'block', width: '100%', maxWidth: '100%' }}
                      >
                        <div className="facility-river-detail-map-wrap">
                          <RiverSourceMouthWgs84DetailMap
                            title={detailRiver.riverName}
                            sourLng={detailRiver.rvSourLong ?? null}
                            sourLat={detailRiver.rvSourLat ?? null}
                            mouLng={detailRiver.rvMouLong ?? null}
                            mouLat={detailRiver.rvMouLat ?? null}
                            mapAriaLabel="河源与河口位置地图"
                            firstMarkerShortLabel="河源"
                            secondMarkerShortLabel="河口"
                          />
                        </div>
                      </Descriptions.Item>
                      <Descriptions.Item label="河流流经行政区" span={2}>
                        {formatRiverFlowAreaCodesDisplay(detailRiver.flowArea)}
                      </Descriptions.Item>
                      <Descriptions.Item label="河长（千米）">
                        {detailRiver.rvLen != null && Number.isFinite(detailRiver.rvLen) ? detailRiver.rvLen : '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="集水面积（平方千米）">
                        {detailRiver.rvBasArea != null && Number.isFinite(detailRiver.rvBasArea) ? detailRiver.rvBasArea : '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="平均比降（千分比）">
                        {detailRiver.averSlop != null && Number.isFinite(detailRiver.averSlop) ? detailRiver.averSlop : '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="已建档责任段数（聚合）">{riverDetailLinkedSections.length}</Descriptions.Item>
                      <Descriptions.Item label="备注" span={2}>
                        {(detailRiver.remarks ?? '').trim() || '—'}
                      </Descriptions.Item>
                    </Descriptions>
                  </>
                ),
              },
              {
                key: 'sections',
                label: `关联河段（${riverDetailLinkedSections.length}）`,
                children: (
                  <>
                    <div className="facility-table-wrap">
                      <Table<RiverSectionRow>
                        rowKey="key"
                        size="small"
                        columns={riverDetailSectionColumns}
                        dataSource={riverDetailLinkedSections}
                        pagination={
                          riverDetailLinkedSections.length > 8 ?
                            { defaultPageSize: 8, showTotal: n => `共 ${n} 段` }
                          : false
                        }
                        scroll={{ x: 1320 }}
                        locale={{ emptyText: '暂无关联河段' }}
                      />
                    </div>
                  </>
                ),
              },
            ]}
          />
        : null}
      </Modal>

      <Modal
        title="湖泊信息详情"
        open={!!detailLake}
        onCancel={() => setDetailLake(null)}
        footer={null}
        width={1000}
        styles={{
          ...formModalStyles,
          body: { ...formModalStyles.body, maxHeight: 'min(85vh, 900px)', overflowY: 'auto' as const },
        }}
      >
        {detailLake ? <LakeWaterBodyReadonlyDetailContent row={detailLake} /> : null}
      </Modal>
    </div>
  );
};

// ============ 河长责任区域（列表页，增删改） ============

/** 韶山市域可选责任段（仅供本页多选，原型示意） */
interface ShaoshanSectionPick {
  key: string;
  sectionId: string;
  sectionName: string;
  riverSystem: string;
  startAddr: string;
  endAddr: string;
  riverLenKm: number;
  /** 河段示意用起点经度、纬度（度） */
  startLgtd: number;
  startLttd: number;
  /** 河段示意用讫点经度、纬度（度） */
  endLgtd: number;
  endLttd: number;
}

const SHAOSHAN_SECTION_PICK_LIST: ShaoshanSectionPick[] = [
  {
    key: 'ss-1',
    sectionId: 'SS430382000001-01001R',
    sectionName: '韶河清溪段（右岸）',
    riverSystem: '韶河流域',
    startAddr: '清溪闸上游',
    endAddr: '青年水库汇入口',
    riverLenKm: 8.6,
    startLgtd: 112.538,
    startLttd: 27.908,
    endLgtd: 112.562,
    endLttd: 27.928,
  },
  {
    key: 'ss-2',
    sectionId: 'SS430382000002-02002A',
    sectionName: '韶河银田段（全段）',
    riverSystem: '韶河流域',
    startAddr: '银田老桥',
    endAddr: '与湘乡界断面',
    riverLenKm: 6.2,
    startLgtd: 112.572,
    startLttd: 27.882,
    endLgtd: 112.588,
    endLttd: 27.898,
  },
  {
    key: 'ss-3',
    sectionId: 'SS430382000003-03003L',
    sectionName: '韶山灌区总干渠韶山段（左岸）',
    riverSystem: '韶山灌区',
    startAddr: '渠首节制闸',
    endAddr: '南干渠分水口',
    riverLenKm: 4.5,
    startLgtd: 112.518,
    startLttd: 27.942,
    endLgtd: 112.532,
    endLttd: 27.958,
  },
  {
    key: 'ss-4',
    sectionId: 'SS430382000004-04004A',
    sectionName: '杨林河示范段',
    riverSystem: '杨林河流域',
    startAddr: '乡界断面',
    endAddr: '汇入韶河口',
    riverLenKm: 5.1,
    startLgtd: 112.598,
    startLttd: 27.898,
    endLgtd: 112.612,
    endLttd: 27.914,
  },
  {
    key: 'ss-5',
    sectionId: 'SS430382000005-05005R',
    sectionName: '如意湖连通渠段（右岸）',
    riverSystem: '如意水系',
    startAddr: '湖心泵站',
    endAddr: '生态护岸终点',
    riverLenKm: 2.3,
    startLgtd: 112.548,
    startLttd: 27.868,
    endLgtd: 112.558,
    endLttd: 27.878,
  },
  {
    key: 'ss-6',
    sectionId: 'SS430382000006-06006A',
    sectionName: '韶山乡小微水体示范片',
    riverSystem: '韶山乡片',
    startAddr: '联村整治起点',
    endAddr: '生态塘出口',
    riverLenKm: 3.8,
    startLgtd: 112.578,
    startLttd: 27.948,
    endLgtd: 112.592,
    endLttd: 27.962,
  },
];

function getShaoshanSectionsByKeys(keys: string[] | undefined): ShaoshanSectionPick[] {
  if (!keys?.length) return [];
  const set = new Set(keys);
  return SHAOSHAN_SECTION_PICK_LIST.filter(s => set.has(s.key));
}

/** 多责任段在一张示意图上展示（各段起点—讫点折线，配色区分；非在线底图） */
const CHIEF_AREA_SECTION_LINE_COLORS = ['#1890ff', '#52c41a', '#faad14', '#722ed1', '#eb2f96', '#13c2c2'];

const ChiefAreaMultiReachMapCard: React.FC<{ sections: ShaoshanSectionPick[] }> = ({ sections }) => {
  const gradId = React.useId().replace(/:/g, '_');
  if (!sections.length) {
    return <div className="eco-map-placeholder" style={{ padding: 24, minHeight: 80 }} />;
  }

  const padLng = 0.028;
  const padLat = 0.022;
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  sections.forEach(s => {
    [s.startLgtd, s.endLgtd].forEach(lng => {
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });
    [s.startLttd, s.endLttd].forEach(lat => {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    });
  });
  minLng -= padLng;
  maxLng += padLng;
  minLat -= padLat;
  maxLat += padLat;
  const rw = maxLng - minLng || 0.0001;
  const rh = maxLat - minLat || 0.0001;
  const svgW = 640;
  const svgH = 280;
  const pad = 40;
  const tx = (lng: number) => pad + ((lng - minLng) / rw) * (svgW - pad * 2);
  const ty = (lat: number) => svgH - pad - ((lat - minLat) / rh) * (svgH - pad * 2);

  return (
    <Card
      size="small"
      className="eco-river-reach-map-card eco-chief-area-multi-map-card"
      title={
        <span>
          <GlobalOutlined style={{ marginRight: 8 }} />
          已选责任段位置示意图（{sections.length} 段）
        </span>
      }
    >
      <div className="eco-river-reach-map-wrap">
        <svg
          className="eco-river-reach-map-svg"
          viewBox={`0 0 ${svgW} ${svgH}`}
          width="100%"
          height={svgH}
          role="img"
          aria-label="已选责任段河段示意"
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e8f4fc" />
              <stop offset="100%" stopColor="#d6e8f8" />
            </linearGradient>
          </defs>
          <rect width={svgW} height={svgH} fill={`url(#${gradId})`} rx={4} />
          {sections.map((s, i) => {
            const stroke = CHIEF_AREA_SECTION_LINE_COLORS[i % CHIEF_AREA_SECTION_LINE_COLORS.length];
            const x0 = tx(s.startLgtd);
            const y0 = ty(s.startLttd);
            const x1 = tx(s.endLgtd);
            const y1 = ty(s.endLttd);
            const mx = (x0 + x1) / 2;
            const my = (y0 + y1) / 2 - 6;
            const shortName = s.sectionName.length > 12 ? `${s.sectionName.slice(0, 12)}…` : s.sectionName;
            return (
              <g key={s.key}>
                <line
                  x1={x0}
                  y1={y0}
                  x2={x1}
                  y2={y1}
                  stroke={stroke}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                <circle cx={x0} cy={y0} r={7} fill={stroke} stroke="#fff" strokeWidth={2} />
                <circle cx={x1} cy={y1} r={7} fill={stroke} stroke="#fff" strokeWidth={2} opacity={0.85} />
                <text x={mx} y={my} fill="#262626" fontSize={11} fontWeight={600} textAnchor="middle">
                  {i + 1}. {shortName}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </Card>
  );
};

/** 河长姓名列表：仅通讯录中标记为河长的人员 */
function getChiefNamesFromContacts(contacts: RiverChiefContactRow[]): string[] {
  const s = new Set<string>();
  contacts.filter(c => c.roleCategory === 'chief').forEach(c => {
    const n = String(c.name ?? '').trim();
    if (n) s.add(n);
  });
  return [...s].sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

/** 下拉选项：通讯录河长 + 必要时并入当前记录中的姓名（避免历史数据无法回显） */
function getChiefNameSelectOptions(contacts: RiverChiefContactRow[], ...extraNames: (string | undefined | null)[]): string[] {
  const s = new Set(getChiefNamesFromContacts(contacts));
  extraNames.forEach(n => {
    const t = typeof n === 'string' ? n.trim() : '';
    if (t) s.add(t);
  });
  return [...s].sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

/** 河长变更记录（保障河长信息连续性与管护交接可追溯；chiefAreaKey 关联河长责任区域 ChiefAreaRow.key） */
interface RiverChiefChangeRow {
  key: string;
  /** 变更登记编号 */
  changeNo: string;
  /** 河长级别，对应数据规范用户类型 */
  chiefLevel: number;
  /** 责任区域（业务名称，与通讯录等区域口径一致） */
  areaName: string;
  /** 关联河长责任区域主键，与「河长责任区域」台账联动 */
  chiefAreaKey: string | null;
  formerChiefName: string;
  newChiefName: string;
  changeReason: string;
  /** 变更生效日期 YYYY-MM-DD */
  changeTime: string;
  /** 责任区域交接情况（范围、台账、未完成事项等） */
  handoverDesc: string;
  remark?: string;
}

const initialRiverChiefChangeData: RiverChiefChangeRow[] = [
  {
    key: '1',
    changeNo: 'BG-2025-001',
    chiefLevel: 2,
    areaName: '清溪镇',
    chiefAreaKey: '1',
    formerChiefName: '张伟',
    newChiefName: '李娜',
    changeReason: '工作调动，由市委组织部与市河长办联合发文调整县级河长分工。',
    changeTime: '2025-01-08',
    handoverDesc:
      '已当面交接清溪镇辖区3 条河段巡河台账与 2 处问题点位整改进展；新河长已签收电子责任书，未完成整改事项由新河长牵头督办，原河长配合至2025-02-28。',
    remark: '市河长办备案号：SS-HZB-2025-03',
  },
  {
    key: '2',
    changeNo: 'BG-2025-002',
    chiefLevel: 3,
    areaName: '银田镇',
    chiefAreaKey: '2',
    formerChiefName: '王强',
    newChiefName: '赵敏',
    changeReason: '原河长退休，按镇街河长递补程序任命。',
    changeTime: '2025-02-18',
    handoverDesc:
      '责任区域边界与镇水利站存档一致；移交巡河 APP 账号、河段公示牌更新联系人；涉农业面源1 处巡查记录已移交。',
  },
  {
    key: '3',
    changeNo: 'BG-2025-003',
    chiefLevel: 4,
    areaName: '东郊水库汇水范围',
    chiefAreaKey: null,
    formerChiefName: '刘洋',
    newChiefName: '陈静',
    changeReason: '村级组织换届后重新明确村级河长。',
    changeTime: '2025-03-05',
    handoverDesc: '村规民约中河湖管护条款已同步修订；保洁合同与志愿者名单已转交新河长签字确认。',
  },
  {
    key: '4',
    changeNo: 'BG-2025-004',
    chiefLevel: 2,
    areaName: '高新区',
    chiefAreaKey: null,
    formerChiefName: '李娜',
    newChiefName: '周磊',
    changeReason: '因重点项目专班抽调，市级河长办统筹调整城区段河长。',
    changeTime: '2025-03-22',
    handoverDesc:
      '联合管护范围内5 个排口台账、2 份第三方检测报告已归档移交；联席会议机制由新河长接任召集人，下次例会时间已约定。',
    remark: '跨部门协调事项见附表（原型略）',
  },
  {
    key: '5',
    changeNo: 'BG-2025-005',
    chiefLevel: 3,
    areaName: '韶山乡',
    chiefAreaKey: null,
    formerChiefName: '黄涛',
    newChiefName: '吴芳',
    changeReason: '岗位交流，上级水利部门批复同意变更。',
    changeTime: '2025-04-01',
    handoverDesc: '景区水体与周边沟渠责任段 GIS 图层已导出并交接；节假日加密巡河排班表由新河长接续执行。',
  },
  {
    key: '6',
    changeNo: 'BG-2025-006',
    chiefLevel: 3,
    areaName: '杨林乡',
    chiefAreaKey: '3',
    formerChiefName: '刘芳',
    newChiefName: '韩雪',
    changeReason: '镇街干部调整，市河长办备案后更新杨林乡段河长。',
    changeTime: '2025-04-18',
    handoverDesc:
      '示范河湖片巡河频次与问题台账已移交；农业面源巡查要点及联系人清单已当面说明并签字确认。',
  },
];

interface ChiefAreaPageProps {
  areas: ChiefAreaRow[];
  onAreasChange: React.Dispatch<React.SetStateAction<ChiefAreaRow[]>>;
  /** 河长变更记录全量，用于详情中按 chiefAreaKey 过滤关联 */
  changeRecords: RiverChiefChangeRow[];
  /** 河长下拉数据与「河长通讯录」一致 */
  contacts: RiverChiefContactRow[];
}

const ChiefAreaPage: React.FC<ChiefAreaPageProps> = ({ areas, onAreasChange, changeRecords, contacts }) => {
  const [filterChiefName, setFilterChiefName] = useState('');
  const [filterResponsibilityName, setFilterResponsibilityName] = useState('');
  const [filterSectionKw, setFilterSectionKw] = useState('');
  const [filterDescKw, setFilterDescKw] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ChiefAreaRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<ChiefAreaRow | null>(null);
  const [relatedChangeDetailOpen, setRelatedChangeDetailOpen] = useState(false);
  const [relatedChangeDetailRow, setRelatedChangeDetailRow] = useState<RiverChiefChangeRow | null>(null);
  const [form] = Form.useForm<{
    responsibilityAreaName: string;
    chiefName: string;
    sectionKeys: string[];
    scopeDesc: string;
    focusPoints: string;
  }>();

  /** 当前详情责任区域关联的河长变更记录（按变更时间倒序） */
  const relatedChiefChanges = useMemo(() => {
    if (!detailRecord) return [];
    return changeRecords
      .filter(c => c.chiefAreaKey === detailRecord.key)
      .sort((a, b) => dayjs(b.changeTime).valueOf() - dayjs(a.changeTime).valueOf());
  }, [detailRecord, changeRecords]);

  const filteredRows = useMemo(
    () =>
      areas.filter(row => {
        const chiefKw = filterChiefName.trim();
        const titleKw = filterResponsibilityName.trim();
        const secKw = filterSectionKw.trim();
        const descKw = filterDescKw.trim();
        if (chiefKw && !row.chiefName.includes(chiefKw)) return false;
        if (titleKw && !row.responsibilityAreaName.includes(titleKw)) return false;
        if (secKw) {
          const secBlob = getShaoshanSectionsByKeys(row.sectionKeys)
            .map(s => `${s.sectionName}${s.sectionId}`)
            .join('');
          if (!secBlob.includes(secKw)) return false;
        }
        if (descKw) {
          if (!row.scopeDesc.includes(descKw) && !row.focusPoints.includes(descKw)) {
            return false;
          }
        }
        return true;
      }),
    [areas, filterChiefName, filterResponsibilityName, filterSectionKw, filterDescKw],
  );

  const openAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ sectionKeys: [] });
    setModalOpen(true);
  };

  const openEdit = (row: ChiefAreaRow) => {
    setEditing(row);
    form.setFieldsValue({
      responsibilityAreaName: row.responsibilityAreaName,
      chiefName: row.chiefName,
      sectionKeys: row.sectionKeys?.length ? row.sectionKeys : [],
      scopeDesc: row.scopeDesc,
      focusPoints: row.focusPoints,
    });
    setModalOpen(true);
  };

  const openDetail = (row: ChiefAreaRow) => {
    setDetailRecord(row);
    setDetailOpen(true);
  };

  const handleDelete = (key: string) => {
    onAreasChange(prev => prev.filter(r => r.key !== key));
    if (detailRecord?.key === key) {
      setDetailOpen(false);
      setDetailRecord(null);
    }
    message.success('删除成功');
  };

  const handleSave = () => {
    form.validateFields().then(values => {
      const row: ChiefAreaRow = {
        key: editing?.key ?? String(Math.max(0, ...areas.map(d => parseInt(d.key, 10))) + 1),
        responsibilityAreaName: values.responsibilityAreaName.trim(),
        chiefName: values.chiefName,
        sectionKeys: values.sectionKeys ?? [],
        scopeDesc: values.scopeDesc,
        focusPoints: values.focusPoints ?? '',
      };
      if (editing) {
        onAreasChange(prev => prev.map(r => (r.key === editing.key ? row : r)));
        message.success('修改成功');
      } else {
        onAreasChange(prev => [...prev, row]);
        message.success('新增成功');
      }
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
    });
  };

  const columns = [
    {
      title: '责任区域名称',
      dataIndex: 'responsibilityAreaName',
      key: 'responsibilityAreaName',
      width: 200,
      fixed: 'left' as const,
      ellipsis: true,
    },
    {
      title: '河长名称',
      dataIndex: 'chiefName',
      key: 'chiefName',
      width: 100,
      ellipsis: true,
    },
    {
      title: '责任段数',
      key: 'sectionCount',
      width: 88,
      align: 'center' as const,
      render: (_: unknown, row: ChiefAreaRow) => row.sectionKeys?.length ?? 0,
    },
    {
      title: '责任区域范围描述',
      dataIndex: 'scopeDesc',
      key: 'scopeDesc',
      ellipsis: true,
    },
    {
      title: '管护重点',
      dataIndex: 'focusPoints',
      key: 'focusPoints',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'operation',
      width: 148,
      fixed: 'right' as const,
      render: (_: unknown, row: ChiefAreaRow) => (
        <Space size="small">
          <Button type="link" className="action-btn detail" size="small" icon={<EyeOutlined />} onClick={() => openDetail(row)}>
            详情
          </Button>
          <Button type="link" className="action-btn edit" size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  /** 责任区域导出：输出责任段名称/编码明细，避免仅导出 sectionKeys 技术字段 */
  const handleChiefAreaExport = () => {
    if (!filteredRows.length) {
      message.warning('当前筛选条件下无数据可导出');
      return;
    }
    const exportRows = filteredRows.map(row => {
      const sections = getShaoshanSectionsByKeys(row.sectionKeys);
      const sectionCodes = sections.map(s => s.sectionId).filter(Boolean);
      const sectionNames = sections.map(s => s.sectionName).filter(Boolean);
      return {
        ...row,
        sectionCount: row.sectionKeys?.length ?? 0,
        sectionCodes: sectionCodes.join('、'),
        sectionNames: sectionNames.join('、'),
      } as Record<string, unknown>;
    });
    const exportColumns = [
      { key: 'responsibilityAreaName', title: '责任区域名称', dataIndex: 'responsibilityAreaName' },
      { key: 'chiefName', title: '河长名称', dataIndex: 'chiefName' },
      { key: 'sectionCount', title: '责任段数', dataIndex: 'sectionCount' },
      { key: 'sectionCodes', title: '责任段编码', dataIndex: 'sectionCodes' },
      { key: 'sectionNames', title: '责任段名称', dataIndex: 'sectionNames' },
      { key: 'scopeDesc', title: '责任区域范围描述', dataIndex: 'scopeDesc' },
      { key: 'focusPoints', title: '管护重点', dataIndex: 'focusPoints' },
    ];
    downloadTableFullExcel(exportRows, exportColumns, '生态整治_河长责任区域', '河长责任区域');
    message.success('已导出 Excel（全量字段）');
  };

  return (
    <div className="facility-view">
      <Card
        title="河长责任区域"
        extra={
          <Space wrap size={[8, 8]} align="center">
            <EcoProtoExportBtn
              onClick={handleChiefAreaExport}
            />
            <EcoProtoImportBtn />
            <Button type="primary" icon={<PlusOutlined />} className="add-btn" onClick={openAdd}>
              新增
            </Button>
          </Space>
        }
      >
        <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8} lg={5}>
            <Input
              placeholder="河长名称"
              prefix={<SearchOutlined />}
              value={filterChiefName}
              onChange={e => setFilterChiefName(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={5}>
            <Input
              placeholder="责任区域名称"
              prefix={<SearchOutlined />}
              value={filterResponsibilityName}
              onChange={e => setFilterResponsibilityName(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={7}>
            <Input
              placeholder="责任段（河段名称或编码）"
              prefix={<SearchOutlined />}
              value={filterSectionKw}
              onChange={e => setFilterSectionKw(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={8}>
            <Input
              placeholder="说明关键字（范围/管护）"
              prefix={<SearchOutlined />}
              value={filterDescKw}
              onChange={e => setFilterDescKw(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={8}>
            <Space>
              <Button type="primary" className="search-btn" icon={<SearchOutlined />}>
                查询
              </Button>
              <Button
                onClick={() => {
                  setFilterChiefName('');
                  setFilterResponsibilityName('');
                  setFilterSectionKw('');
                  setFilterDescKw('');
                }}
              >
                重置
              </Button>
            </Space>
          </Col>
        </Row>
        <div className="facility-table-wrap">
          <Table
            size="small"
            rowKey="key"
            columns={columns}
            dataSource={filteredRows}
            pagination={{ defaultPageSize: 10, showTotal: t => `共 ${t} 条` }}
            scroll={{ x: 1220 }}
          />
        </div>
      </Card>

      <Modal
        styles={formModalStyles}
        title={editing ? '编辑河长责任区域' : '新增河长责任区域'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
          setEditing(null);
        }}
        width={880}
        footer={
          <Space>
            {editing && (
              <Popconfirm
                title="确认删除"
                description="确定删除该条记录？"
                onConfirm={() => {
                  handleDelete(editing.key);
                  setModalOpen(false);
                  form.resetFields();
                  setEditing(null);
                }}
              >
                <Button danger>删除</Button>
              </Popconfirm>
            )}
            <Button
              onClick={() => {
                setModalOpen(false);
                form.resetFields();
                setEditing(null);
              }}
            >
              取消
            </Button>
            <Button type="primary" onClick={handleSave}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item
            name="responsibilityAreaName"
            label="责任区域名称"
            rules={[{ required: true, message: '请填写责任区域名称' }, { max: 100, message: '不超过 100 字' }]}
          >
            <Input placeholder="自定义名称，用于列表与检索展示" maxLength={100} showCount />
          </Form.Item>
          <Form.Item name="chiefName" label="河长" rules={[{ required: true, message: '请选择河长' }]}>
            <Select placeholder="请从河长通讯录中选择" showSearch optionFilterProp="children">
              {getChiefNameSelectOptions(contacts, editing?.chiefName).map(n => (
                <Option key={n} value={n}>
                  {n}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="sectionKeys"
            label="责任段"
            rules={[
              { required: true, message: '请至少选择一段责任段' },
              { type: 'array', min: 1, message: '请至少选择一段责任段' },
            ]}
          >
            <Select
              mode="multiple"
              placeholder="请选择责任段（可多选，韶山市域）"
              style={{ width: '100%' }}
              options={SHAOSHAN_SECTION_PICK_LIST.map(s => ({
                value: s.key,
                label: s.sectionName,
              }))}
              showSearch
              optionFilterProp="label"
              maxTagCount="responsive"
            />
          </Form.Item>
          <Form.Item dependencies={['sectionKeys']} noStyle>
            {() => {
              const keys = form.getFieldValue('sectionKeys') as string[] | undefined;
              const rows = getShaoshanSectionsByKeys(keys);
              return (
                <>
                  <Card size="small" title="已选责任段" style={{ marginBottom: 12 }}>
                    <Table
                      size="small"
                      rowKey="key"
                      pagination={false}
                      locale={{ emptyText: '暂未选择责任段，请在上方搜索并多选' }}
                      dataSource={rows}
                      scroll={{ x: 900 }}
                      columns={[
                        { title: '河段编码', dataIndex: 'sectionId', width: 186, ellipsis: true },
                        { title: '河段名称', dataIndex: 'sectionName', ellipsis: true },
                        { title: '所属水系', dataIndex: 'riverSystem', width: 100 },
                        { title: '起点', dataIndex: 'startAddr', width: 120, ellipsis: true },
                        { title: '终点', dataIndex: 'endAddr', width: 120, ellipsis: true },
                        { title: '长度（千米）', dataIndex: 'riverLenKm', width: 88 },
                        {
                          title: '操作',
                          key: 'rm',
                          width: 72,
                          fixed: 'right' as const,
                          render: (_: unknown, r: ShaoshanSectionPick) => (
                            <Button
                              type="link"
                              size="small"
                              className="action-btn edit"
                              onClick={() => {
                                const cur = (form.getFieldValue('sectionKeys') as string[]) ?? [];
                                form.setFieldsValue({ sectionKeys: cur.filter(k => k !== r.key) });
                              }}
                            >
                              移除
                            </Button>
                          ),
                        },
                      ]}
                    />
                  </Card>
                  <div style={{ marginBottom: 16 }}>
                    <ChiefAreaMultiReachMapCard sections={rows} />
                  </div>
                </>
              );
            }}
          </Form.Item>
          <Form.Item name="scopeDesc" label="责任区域范围描述" rules={[{ required: true, message: '请填写责任区域范围描述' }]}>
            <TextArea rows={3} placeholder="描述该责任区域对应的河道、岸线起止、涉及水体等范围" />
          </Form.Item>
          <Form.Item name="focusPoints" label="管护重点">
            <TextArea rows={2} placeholder="选填：岸线保洁、排污口巡查、水源地保护等" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        styles={formModalStyles}
        title="河长责任区域详情"
        open={detailOpen}
        onCancel={() => {
          setDetailOpen(false);
          setDetailRecord(null);
          setRelatedChangeDetailOpen(false);
          setRelatedChangeDetailRow(null);
        }}
        footer={null}
        width={920}
      >
        {detailRecord && (
          <DetailTabsIfMultiple
            key={detailRecord.key}
            size="small"
            defaultActiveKey="basic"
            style={{ marginTop: 4 }}
            items={[
              {
                key: 'basic',
                label: '基本信息',
                children: (
          <>
            <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="责任区域名称" span={2}>
                {detailRecord.responsibilityAreaName}
              </Descriptions.Item>
              <Descriptions.Item label="河长名称" span={2}>
                {detailRecord.chiefName}
              </Descriptions.Item>
              <Descriptions.Item label="责任区域范围描述" span={2}>
                {detailRecord.scopeDesc}
              </Descriptions.Item>
              <Descriptions.Item label="管护重点" span={2}>
                {detailRecord.focusPoints || '—'}
              </Descriptions.Item>
            </Descriptions>
            <Divider titlePlacement="start">责任段列表</Divider>
            <div className="facility-table-wrap" style={{ marginBottom: 12 }}>
              <Table
                size="small"
                rowKey="key"
                pagination={false}
                dataSource={getShaoshanSectionsByKeys(detailRecord.sectionKeys)}
                scroll={{ x: 960 }}
                locale={{ emptyText: '未关联责任段' }}
                columns={[
                  { title: '河段编码', dataIndex: 'sectionId', width: 200, ellipsis: true },
                  { title: '河段名称', dataIndex: 'sectionName', ellipsis: true },
                  { title: '所属水系', dataIndex: 'riverSystem', width: 110 },
                  { title: '起点', dataIndex: 'startAddr', width: 140, ellipsis: true },
                  { title: '终点', dataIndex: 'endAddr', width: 140, ellipsis: true },
                  { title: '河段长度（千米）', dataIndex: 'riverLenKm', width: 112 },
                ]}
              />
            </div>
            <ChiefAreaMultiReachMapCard sections={getShaoshanSectionsByKeys(detailRecord.sectionKeys)} />
          </>
                ),
              },
              {
                key: 'changes',
                label: `关联河长变更记录（${relatedChiefChanges.length}）`,
                children:
                  relatedChiefChanges.length === 0 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="暂无关联的河长变更记录（可在「河长变更记录」中指定关联责任区域）"
                    />
                  ) : (
                    <div className="facility-table-wrap" style={{ marginBottom: 0 }}>
                      <Table<RiverChiefChangeRow>
                        size="small"
                        rowKey="key"
                        pagination={false}
                        dataSource={relatedChiefChanges}
                        scroll={{ x: 960 }}
                        columns={[
                          { title: '变更编号', dataIndex: 'changeNo', width: 120 },
                          { title: '变更时间', dataIndex: 'changeTime', width: 110 },
                          {
                            title: '河长级别',
                            dataIndex: 'chiefLevel',
                            width: 120,
                            render: (lv: number) => USER_TYPE_LABEL[lv as keyof typeof USER_TYPE_LABEL] ?? '—',
                          },
                          { title: '登记责任区域', dataIndex: 'areaName', width: 140, ellipsis: true },
                          { title: '原河长', dataIndex: 'formerChiefName', width: 88 },
                          { title: '新河长', dataIndex: 'newChiefName', width: 88 },
                          { title: '变更原因', dataIndex: 'changeReason', ellipsis: true },
                          {
                            title: '操作',
                            key: 'op',
                            width: 72,
                            fixed: 'right',
                            render: (_: unknown, r: RiverChiefChangeRow) => (
                              <Button
                                type="link"
                                size="small"
                                className="action-btn detail"
                                onClick={() => {
                                  setRelatedChangeDetailRow(r);
                                  setRelatedChangeDetailOpen(true);
                                }}
                              >
                                详情
                              </Button>
                            ),
                          },
                        ]}
                      />
                    </div>
                  ),
              },
            ]}
          />
        )}
      </Modal>

      <Modal
        styles={formModalStyles}
        title="河长变更详情"
        open={relatedChangeDetailOpen}
        width={720}
        onCancel={() => {
          setRelatedChangeDetailOpen(false);
          setRelatedChangeDetailRow(null);
        }}
        footer={null}
        destroyOnClose
      >
        {relatedChangeDetailRow && (
          <Descriptions bordered column={2} size="small" style={{ marginTop: 8 }}>
            <Descriptions.Item label="变更编号">{relatedChangeDetailRow.changeNo}</Descriptions.Item>
            <Descriptions.Item label="变更时间">{relatedChangeDetailRow.changeTime}</Descriptions.Item>
            <Descriptions.Item label="河长级别">
              {USER_TYPE_LABEL[relatedChangeDetailRow.chiefLevel as keyof typeof USER_TYPE_LABEL] ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="登记责任区域" span={2}>
              {relatedChangeDetailRow.areaName}
            </Descriptions.Item>
            <Descriptions.Item label="关联责任区域台账" span={2}>
              {relatedChangeDetailRow.chiefAreaKey
                ? areas.find(a => a.key === relatedChangeDetailRow.chiefAreaKey)?.responsibilityAreaName ?? `ID ${relatedChangeDetailRow.chiefAreaKey}`
                : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="原河长姓名">{relatedChangeDetailRow.formerChiefName}</Descriptions.Item>
            <Descriptions.Item label="新河长姓名">{relatedChangeDetailRow.newChiefName}</Descriptions.Item>
            <Descriptions.Item label="变更原因" span={2}>
              {relatedChangeDetailRow.changeReason}
            </Descriptions.Item>
            <Descriptions.Item label="责任区域交接情况" span={2}>
              {relatedChangeDetailRow.handoverDesc}
            </Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>
              {relatedChangeDetailRow.remark ?? '—'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

// ============ 其他简化组件 ============

/** 通讯录未建档的巡河台账河长，用 USER_TYPE 兜底（原型统计筛选用） */
const PATROL_CHIEF_USER_TYPE_FALLBACK: Record<string, number> = {
  张伟: 4,
  李强: 5,
  刘芳: 6,
  王明: 10,
};

function getPatrolChiefUserType(chiefName: string, contacts: RiverChiefContactRow[]): number | null {
  const hit = contacts.find(c => c.name === chiefName && c.roleCategory === 'chief');
  if (hit?.userType != null) return hit.userType;
  return PATROL_CHIEF_USER_TYPE_FALLBACK[chiefName] ?? null;
}

/** 任一巡河段开始时间落在统计日范围内即计入 */
function patrolInDateRange(record: PatrolRecordRow, range: [dayjs.Dayjs, dayjs.Dayjs] | null): boolean {
  if (!range) return true;
  const [start, end] = range;
  return (record.segments ?? []).some(s => {
    const t = dayjs(s.strtime);
    return !t.isBefore(start.startOf('day')) && !t.isAfter(end.endOf('day'));
  });
}

function sumPatrolDurationMin(record: PatrolRecordRow): number {
  return (record.segments ?? []).reduce((acc, s) => acc + (Number(s.durationMin) || 0), 0);
}

function countProblems(record: PatrolRecordRow): number {
  return record.problems?.length ?? 0;
}

function countRectifiedProblems(record: PatrolRecordRow): number {
  return (record.problems ?? []).filter(p => p.rectified === true).length;
}

function sumPatrolDistanceKm(record: PatrolRecordRow): number {
  return (record.segments ?? []).reduce((acc, s) => acc + (Number(s.distanceKm) || 0), 0);
}

function countPatrolSegments(record: PatrolRecordRow): number {
  return record.segments?.length ?? 0;
}

/** 巡河方式分布柱状图（台账·patrolMode） */
const PatrolStatModeBarChart: React.FC<{ rows: { mode: string; count: number }[] }> = ({ rows }) => {
  const elRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!elRef.current) return;
    const chart = echarts.init(elRef.current);
    chart.setOption({
      color: ['#1e5bb5'],
      tooltip: { trigger: 'axis' },
      grid: { left: 48, right: 24, top: 28, bottom: 56 },
      xAxis: {
        type: 'category',
        data: rows.map(r => r.mode),
        axisLabel: { fontSize: 11, rotate: rows.some(r => r.mode.length > 4) ? 16 : 0 },
      },
      yAxis: { type: 'value', name: '次', minInterval: 1 },
      series: [{ type: 'bar', data: rows.map(r => r.count), barMaxWidth: 36 }],
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

/** 按月巡河次数（台账 segments·STRTIME 所在月份） */
const PatrolStatMonthlyBarChart: React.FC<{ rows: { month: string; count: number }[] }> = ({ rows }) => {
  const elRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!elRef.current) return;
    const chart = echarts.init(elRef.current);
    chart.setOption({
      color: ['#10B981'],
      tooltip: { trigger: 'axis' },
      grid: { left: 48, right: 24, top: 28, bottom: 48 },
      xAxis: { type: 'category', data: rows.map(r => r.month), axisLabel: { fontSize: 11, rotate: 24 } },
      yAxis: { type: 'value', name: '次', minInterval: 1 },
      series: [{ type: 'bar', data: rows.map(r => r.count), barMaxWidth: 28 }],
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

/** 巡河数据统计：仅聚合巡河信息台账字段（与巡河信息列表共用 patrolList） */
interface PatrolStatisticsProps {
  patrolList: PatrolRecordRow[];
}

const PatrolStatistics: React.FC<PatrolStatisticsProps> = ({ patrolList }) => {
  const patrolStatPdfRef = useRef<HTMLDivElement | null>(null);
  const [presetRange, setPresetRange] = useState<'all' | 'month' | 'quarter' | 'year' | 'custom'>('all');
  const [customRange, setCustomRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [filterChiefName, setFilterChiefName] = useState<string | undefined>();
  const [filterSectionId, setFilterSectionId] = useState<string | undefined>();
  const [filterPatrolMode, setFilterPatrolMode] = useState<string | undefined>();

  const chiefOptions = useMemo(() => {
    const names = [...new Set(patrolList.map(p => String(p.chiefName || '').trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'zh-CN'),
    );
    return names.map(n => ({ value: n, label: n }));
  }, [patrolList]);

  const sectionOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of patrolList) {
      const id = String(p.sectionId || '').trim();
      if (!id || map.has(id)) continue;
      map.set(id, String(p.sectionName || id));
    }
    return [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], 'zh-CN'))
      .map(([value, name]) => ({ value, label: `${name}（${value}）` }));
  }, [patrolList]);

  const patrolModeOptions = useMemo(() => {
    const modes = [...new Set(patrolList.map(p => String(p.patrolMode || '').trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'zh-CN'),
    );
    return modes.map(m => ({ value: m, label: m }));
  }, [patrolList]);

  const effectiveDateRange = useMemo((): [dayjs.Dayjs, dayjs.Dayjs] | null => {
    if (presetRange === 'all') return null;
    const now = dayjs();
    if (presetRange === 'custom') return customRange;
    if (presetRange === 'month') return [now.startOf('month'), now.endOf('month')];
    if (presetRange === 'quarter') {
      const m0 = now.month();
      const qStart = Math.floor(m0 / 3) * 3;
      return [now.month(qStart).startOf('month'), now.month(qStart + 2).endOf('month')];
    }
    if (presetRange === 'year') return [now.startOf('year'), now.endOf('year')];
    return null;
  }, [presetRange, customRange]);

  const filteredPatrols = useMemo(() => {
    return patrolList.filter(p => {
      if (!patrolInDateRange(p, effectiveDateRange)) return false;
      if (filterChiefName && p.chiefName !== filterChiefName) return false;
      if (filterSectionId && p.sectionId !== filterSectionId) return false;
      if (filterPatrolMode && p.patrolMode !== filterPatrolMode) return false;
      return true;
    });
  }, [patrolList, effectiveDateRange, filterChiefName, filterSectionId, filterPatrolMode]);

  const summary = useMemo(() => {
    const patrolCount = filteredPatrols.length;
    const durationMin = filteredPatrols.reduce((a, p) => a + sumPatrolDurationMin(p), 0);
    const distanceKm = filteredPatrols.reduce((a, p) => a + sumPatrolDistanceKm(p), 0);
    const segmentCount = filteredPatrols.reduce((a, p) => a + countPatrolSegments(p), 0);
    let probTotal = 0;
    let rectified = 0;
    filteredPatrols.forEach(p => {
      probTotal += countProblems(p);
      rectified += countRectifiedProblems(p);
    });
    const rectifyRate = probTotal > 0 ? Math.round((rectified / probTotal) * 1000) / 10 : 0;
    return {
      patrolCount,
      durationHours: Math.round((durationMin / 60) * 10) / 10,
      distanceKm: Math.round(distanceKm * 100) / 100,
      segmentCount,
      problemCount: probTotal,
      rectified,
      rectifyRate,
    };
  }, [filteredPatrols]);

  const modeChartRows = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of filteredPatrols) {
      const key = String(p.patrolMode || '—').trim() || '—';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([mode, count]) => ({ mode, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredPatrols]);

  const monthlyChartRows = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of filteredPatrols) {
      for (const s of p.segments ?? []) {
        const t = dayjs(String(s.strtime || '').replace(' ', 'T'));
        if (!t.isValid()) continue;
        const key = t.format('YYYY年M月');
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    }
    return [...map.entries()]
      .sort((a, b) => dayjs(a[0], 'YYYY年M月').valueOf() - dayjs(b[0], 'YYYY年M月').valueOf())
      .map(([month, count]) => ({ month, count }));
  }, [filteredPatrols]);

  const chiefTableRows = useMemo(() => {
    const byChief = new Map<string, PatrolRecordRow[]>();
    filteredPatrols.forEach(p => {
      const list = byChief.get(p.chiefName) ?? [];
      list.push(p);
      byChief.set(p.chiefName, list);
    });
    return [...byChief.entries()]
      .map(([chiefName, list]) => {
        const durationMin = list.reduce((a, p) => a + sumPatrolDurationMin(p), 0);
        const distanceKm = list.reduce((a, p) => a + sumPatrolDistanceKm(p), 0);
        const segments = list.reduce((a, p) => a + countPatrolSegments(p), 0);
        const sections = new Set(list.map(p => p.sectionId)).size;
        let probTotal = 0;
        let rect = 0;
        list.forEach(p => {
          probTotal += countProblems(p);
          rect += countRectifiedProblems(p);
        });
        return {
          key: chiefName,
          chiefName,
          patrolCount: list.length,
          durationHours: Math.round((durationMin / 60) * 10) / 10,
          distanceKm: Math.round(distanceKm * 100) / 100,
          segmentCount: segments,
          sectionCount: sections,
          problems: probTotal,
          rectified: rect,
          rectifyRate: probTotal > 0 ? Math.round((rect / probTotal) * 1000) / 10 : 0,
        };
      })
      .sort((a, b) => b.patrolCount - a.patrolCount);
  }, [filteredPatrols]);

  const sectionTableRows = useMemo(() => {
    const bySection = new Map<string, PatrolRecordRow[]>();
    filteredPatrols.forEach(p => {
      const list = bySection.get(p.sectionId) ?? [];
      list.push(p);
      bySection.set(p.sectionId, list);
    });
    return [...bySection.entries()]
      .map(([sectionId, list]) => {
        const durationMin = list.reduce((a, p) => a + sumPatrolDurationMin(p), 0);
        const distanceKm = list.reduce((a, p) => a + sumPatrolDistanceKm(p), 0);
        let probTotal = 0;
        let rect = 0;
        list.forEach(p => {
          probTotal += countProblems(p);
          rect += countRectifiedProblems(p);
        });
        return {
          key: sectionId,
          sectionId,
          sectionName: list[0]?.sectionName ?? '—',
          chiefName: [...new Set(list.map(p => p.chiefName))].join('、'),
          patrolCount: list.length,
          durationHours: Math.round((durationMin / 60) * 10) / 10,
          distanceKm: Math.round(distanceKm * 100) / 100,
          problems: probTotal,
          rectified: rect,
          rectifyRate: probTotal > 0 ? Math.round((rect / probTotal) * 1000) / 10 : 0,
        };
      })
      .sort((a, b) => b.patrolCount - a.patrolCount);
  }, [filteredPatrols]);

  const chiefColumns: ColumnsType<(typeof chiefTableRows)[number]> = [
    { title: '河长名称', dataIndex: 'chiefName', width: 100, fixed: 'left' },
    { title: '巡河次数', dataIndex: 'patrolCount', width: 96, align: 'right' },
    { title: '巡河时长（小时）', dataIndex: 'durationHours', width: 120, align: 'right' },
    { title: '巡河里程（千米）', dataIndex: 'distanceKm', width: 120, align: 'right' },
    { title: '巡检记录段数', dataIndex: 'segmentCount', width: 108, align: 'right' },
    { title: '涉及河段数', dataIndex: 'sectionCount', width: 100, align: 'right' },
    { title: '发现问题', dataIndex: 'problems', width: 88, align: 'right' },
    { title: '已整改', dataIndex: 'rectified', width: 80, align: 'right' },
    {
      title: '问题整改率',
      dataIndex: 'rectifyRate',
      width: 108,
      align: 'right',
      render: (v: number) => `${v}%`,
    },
  ];

  const sectionColumns: ColumnsType<(typeof sectionTableRows)[number]> = [
    { title: '河段名称', dataIndex: 'sectionName', width: 180, ellipsis: true, fixed: 'left' },
    { title: '河段编码', dataIndex: 'sectionId', width: 200, ellipsis: true },
    { title: '河长名称', dataIndex: 'chiefName', width: 120, ellipsis: true },
    { title: '巡河次数', dataIndex: 'patrolCount', width: 96, align: 'right' },
    { title: '巡河时长（小时）', dataIndex: 'durationHours', width: 120, align: 'right' },
    { title: '巡河里程（千米）', dataIndex: 'distanceKm', width: 120, align: 'right' },
    { title: '发现问题', dataIndex: 'problems', width: 88, align: 'right' },
    { title: '已整改', dataIndex: 'rectified', width: 80, align: 'right' },
    {
      title: '问题整改率',
      dataIndex: 'rectifyRate',
      width: 108,
      align: 'right',
      render: (v: number) => `${v}%`,
    },
  ];

  const handlePatrolStatExportPdf = async () => {
    if (!filteredPatrols.length) {
      message.warning('当前筛选条件下无内容可导出');
      return;
    }
    const el = patrolStatPdfRef.current;
    if (!el) {
      message.error('导出区域未就绪');
      return;
    }
    const hide = message.loading('正在生成 PDF…', 0);
    try {
      await downloadElementAsPdf(el, '生态整治_巡河数据统计');
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
        title="巡河数据统计"
        extra={<EcoStatPdfExportBtn onClick={() => void handlePatrolStatExportPdf()} />}
      >
        <div ref={patrolStatPdfRef} className="facility-stat-pdf-capture-root">
        <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} lg={18}>
            <Space wrap size="middle" align="center">
              <span>时间周期：</span>
              <Radio.Group
                value={presetRange}
                onChange={e => setPresetRange(e.target.value)}
                buttonStyle="solid"
              >
                <Radio.Button value="all">全部</Radio.Button>
                <Radio.Button value="month">本月</Radio.Button>
                <Radio.Button value="quarter">本季</Radio.Button>
                <Radio.Button value="year">本年</Radio.Button>
                <Radio.Button value="custom">自定义</Radio.Button>
              </Radio.Group>
              {presetRange === 'custom' ?
                <RangePicker value={customRange as any} onChange={v => setCustomRange(v as any)} />
              : null}
            </Space>
          </Col>
        </Row>
        <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={6}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="全部河长"
              style={{ width: '100%' }}
              value={filterChiefName}
              onChange={setFilterChiefName}
              options={chiefOptions}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="全部河段"
              style={{ width: '100%' }}
              value={filterSectionId}
              onChange={setFilterSectionId}
              options={sectionOptions}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              allowClear
              placeholder="全部巡河方式"
              style={{ width: '100%' }}
              value={filterPatrolMode}
              onChange={setFilterPatrolMode}
              options={patrolModeOptions}
            />
          </Col>
          <Col xs={24} sm={24} md={4} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <Space size={8}>
              <Button
                className="search-btn"
                type="primary"
                icon={<SearchOutlined />}
                onClick={() => message.success('已按当前筛选与巡河台账字段刷新统计')}
              >
                查询
              </Button>
              <Button
                onClick={() => {
                  setFilterChiefName(undefined);
                  setFilterSectionId(undefined);
                  setFilterPatrolMode(undefined);
                  setPresetRange('all');
                  setCustomRange(null);
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
                title="巡河次数"
                value={summary.patrolCount}
                suffix="次"
                valueStyle={{ color: '#1e5bb5' }}
                prefix={<AuditOutlined />}
              />
              <div className="eco-stat-metric-foot">当前筛选下巡河信息条数</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" className="eco-stat-metric-card">
              <Statistic
                title="巡河总时长"
                value={summary.durationHours}
                suffix="小时"
                valueStyle={{ color: '#1e5bb5' }}
                prefix={<BarChartOutlined />}
              />
              <div className="eco-stat-metric-foot">Σ 巡检记录·DURATION（分钟换算）</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" className="eco-stat-metric-card">
              <Statistic
                title="巡河总里程"
                value={summary.distanceKm}
                suffix="千米"
                valueStyle={{ color: '#10B981' }}
                prefix={<EnvironmentOutlined />}
              />
              <div className="eco-stat-metric-foot">Σ 巡检记录·DISTANCE</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" className="eco-stat-metric-card">
              <Statistic
                title="巡检记录段数"
                value={summary.segmentCount}
                suffix="段"
                valueStyle={{ color: '#1e5bb5' }}
                prefix={<UnorderedListOutlined />}
              />
              <div className="eco-stat-metric-foot">Σ segments 条数</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" className="eco-stat-metric-card">
              <Statistic
                title="发现问题数"
                value={summary.problemCount}
                suffix="件"
                valueStyle={{ color: '#D97706' }}
                prefix={<FileSearchOutlined />}
              />
              <div className="eco-stat-metric-foot">Σ problems 条数</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" className="eco-stat-metric-card">
              <Statistic
                title="问题整改率"
                value={summary.rectifyRate}
                suffix="%"
                valueStyle={{ color: summary.rectifyRate >= 80 ? '#10B981' : '#D97706' }}
                prefix={<CheckOutlined />}
              />
              <div className="eco-stat-metric-foot">
                已整改 {summary.rectified} / {summary.problemCount}（problems.rectified）
              </div>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} className="eco-stat-chart-row" style={{ marginBottom: 16 }}>
          <Col xs={24} lg={12}>
            <Card size="small" title="巡河方式分布（台账·patrolMode）">
              {modeChartRows.length ?
                <PatrolStatModeBarChart rows={modeChartRows} />
              : <div className="eco-stat-chart-empty">
                  <Empty description="无数据" />
                </div>}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card size="small" title="按月巡检记录数（台账·STRTIME）">
              {monthlyChartRows.length ?
                <PatrolStatMonthlyBarChart rows={monthlyChartRows} />
              : <div className="eco-stat-chart-empty">
                  <Empty description="无巡检记录时间数据" />
                </div>}
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} lg={12}>
            <Card size="small" title="按河长汇总">
              <div className="facility-table-wrap">
                <Table
                  size="small"
                  rowKey="key"
                  pagination={false}
                  dataSource={chiefTableRows}
                  columns={chiefColumns}
                  scroll={{ x: 900 }}
                  locale={{ emptyText: '当前筛选条件下暂无数据' }}
                />
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card size="small" title="按河段汇总">
              <div className="facility-table-wrap">
                <Table
                  size="small"
                  rowKey="key"
                  pagination={false}
                  dataSource={sectionTableRows}
                  columns={sectionColumns}
                  scroll={{ x: 1000 }}
                  locale={{ emptyText: '当前筛选条件下暂无数据' }}
                />
              </div>
            </Card>
          </Col>
        </Row>
        </div>
      </Card>
    </div>
  );
};

type PatrolSegmentFormRow = ReturnType<typeof emptyPatrolSegmentFormValues>;

/** 巡河记录独立表格页：维护单条巡河台账下的多段 segments */
const PatrolSegmentsEditorPage: React.FC<{
  record: PatrolRecordRow;
  onBack: () => void;
  onPersist: (next: PatrolRecordRow) => void;
}> = ({ record, onBack, onPersist }) => {
  const [segForm] = Form.useForm<{ segments: PatrolSegmentFormRow[] }>();
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchText, setBatchText] = useState('');
  /** 巡河轨迹：弹窗查看本段地图占位与说明 */
  const [segmentTrackModalSeg, setSegmentTrackModalSeg] = useState<PatrolSegmentRecord | null>(null);
  /** 默认只读，点击「编辑」后才可改表格、添加行与批量导入 */
  const [segmentsEditable, setSegmentsEditable] = useState(false);

  /** 用当前台账的 segments 回填表单（进入编辑、取消编辑、切换台账时调用） */
  const applyRecordToSegmentForm = (r: PatrolRecordRow) => {
    const segs = r.segments ?? [];
    segForm.setFieldsValue({
      segments:
        segs.length > 0 ?
          segs.map(s => ({
            segmentPersonnel: s.segmentPersonnel?.length ? [...s.segmentPersonnel] : [],
            strtime: dayjs(s.strtime),
            endtime: dayjs(s.endtime),
            distanceKm: s.distanceKm,
            durationMin: s.durationMin,
            startLgtd: s.startLgtd,
            startLttd: s.startLttd,
            endLgtd: s.endLgtd,
            endLttd: s.endLttd,
          }))
        : [emptyPatrolSegmentFormValues()],
    });
  };

  // 仅切换不同巡河台账时退出编辑并同步表单；避免父级保存后刷新 record 误触重置
  useEffect(() => {
    setSegmentsEditable(false);
    applyRecordToSegmentForm(record);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 故意只在台账 key 变化时重置
  }, [record.key]);

  const segmentReadonlyColumns: ColumnsType<PatrolSegmentRecord> = useMemo(
    () => [
      {
        title: '序号',
        key: 'i',
        width: 48,
        fixed: 'left',
        render: (_: unknown, __: PatrolSegmentRecord, i: number) => i + 1,
      },
      {
        title: '巡检人员',
        key: 'segmentPersonnel',
        width: 160,
        ellipsis: true,
        render: (_: unknown, r: PatrolSegmentRecord) => (r.segmentPersonnel?.length ? r.segmentPersonnel.join('、') : '—'),
      },
      { title: '开始时间', dataIndex: 'strtime', key: 'strtime', width: 158 },
      { title: '结束时间', dataIndex: 'endtime', key: 'endtime', width: 158 },
      { title: '距离（千米）', dataIndex: 'distanceKm', key: 'distanceKm', width: 88 },
      { title: '时长（分钟）', dataIndex: 'durationMin', key: 'durationMin', width: 88 },
      { title: '起点经度', dataIndex: 'startLgtd', key: 'startLgtd', width: 100 },
      { title: '起点纬度', dataIndex: 'startLttd', key: 'startLttd', width: 100 },
      { title: '终点经度', dataIndex: 'endLgtd', key: 'endLgtd', width: 100 },
      { title: '终点纬度', dataIndex: 'endLttd', key: 'endLttd', width: 100 },
      {
        title: '巡河轨迹',
        key: 'trackMapBtn',
        width: 108,
        fixed: 'right',
        render: (_: unknown, r: PatrolSegmentRecord) => (
          <Button
            type="link"
            size="small"
            icon={<EnvironmentOutlined />}
            onClick={() => setSegmentTrackModalSeg(r)}
          >
            查看轨迹
          </Button>
        ),
      },
    ],
    [],
  );

  const cancelSegmentEdit = () => {
    applyRecordToSegmentForm(record);
    setSegmentsEditable(false);
    setBatchOpen(false);
    setBatchText('');
  };

  const enterSegmentEdit = () => {
    applyRecordToSegmentForm(record);
    setSegmentsEditable(true);
  };

  const saveSegments = () => {
    segForm.validateFields().then(values => {
      const rawSegs = values.segments ?? [];
      if (!rawSegs.length) {
        message.warning('请至少保留一条巡河记录');
        return;
      }
      for (let i = 0; i < rawSegs.length; i++) {
        const s = rawSegs[i];
        if (!s?.strtime || !s?.endtime) {
          message.warning(`请完整填写第 ${i + 1} 条巡河记录的起止时间`);
          return;
        }
        const segP = Array.isArray(s.segmentPersonnel) ? s.segmentPersonnel.map(x => String(x).trim()).filter(Boolean) : [];
        if (!segP.length) {
          message.warning(`请为第 ${i + 1} 条巡河记录填写至少一名巡检人员`);
          return;
        }
      }
      const prevSegs = record.segments ?? [];
      const pid = record.patrolId;
      const segments: PatrolSegmentRecord[] = rawSegs.map((s, i) => ({
        key: prevSegs[i]?.key ?? `seg-${Date.now()}-${i}`,
        segmentPatrolNo:
          prevSegs[i]?.segmentPatrolNo?.trim() || `${pid}-S${String(i + 1).padStart(2, '0')}`,
        segmentPersonnel: Array.isArray(s.segmentPersonnel)
          ? s.segmentPersonnel.map(x => String(x).trim()).filter(Boolean)
          : [],
        strtime: s.strtime.format('YYYY-MM-DD HH:mm:ss'),
        endtime: s.endtime.format('YYYY-MM-DD HH:mm:ss'),
        distanceKm: Number(s.distanceKm) || 0,
        durationMin: Number(s.durationMin) || 0,
        startLgtd: Number(s.startLgtd) || 0,
        startLttd: Number(s.startLttd) || 0,
        endLgtd: Number(s.endLgtd) || 0,
        endLttd: Number(s.endLttd) || 0,
        trackSummary: prevSegs[i]?.trackSummary?.trim() ?? '',
      }));
      const mergedPersonnel = [...new Set(segments.flatMap(s => s.segmentPersonnel))];
      onPersist({ ...record, segments, personnel: mergedPersonnel });
      setSegmentsEditable(false);
      message.success('巡河记录已保存');
    });
  };

  const prevSegs = record.segments ?? [];

  return (
    <div className="facility-view">
      <Card
        title={
          <Space>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack}>
              返回巡河列表
            </Button>
            <Divider type="vertical" />
            <span>巡河记录 · {record.patrolId}</span>
            <Text type="secondary">{record.sectionName}</Text>
          </Space>
        }
        extra={
          <Space wrap>
            <EcoProtoExportBtn
              onClick={() =>
                exportEcoTableExcel(
                  (record.segments ?? []) as unknown as Record<string, unknown>[],
                  segmentReadonlyColumns as unknown as Array<{ key?: string; title?: unknown; dataIndex?: unknown }>,
                  '生态整治_巡河记录明细',
                  '巡河记录明细',
                )
              }
            />
            {segmentsEditable ? (
              <>
                <Button onClick={cancelSegmentEdit}>取消编辑</Button>
                <Button type="primary" onClick={saveSegments}>
                  保存巡河记录
                </Button>
              </>
            ) : (
              <Button type="primary" icon={<EditOutlined />} onClick={enterSegmentEdit}>
                编辑
              </Button>
            )}
          </Space>
        }
      >
        <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label="巡河编号">{record.patrolId}</Descriptions.Item>
          <Descriptions.Item label="河段编码">{record.sectionId}</Descriptions.Item>
          <Descriptions.Item label="河长名称">{record.chiefName}</Descriptions.Item>
          <Descriptions.Item label="巡河方式">{record.patrolMode}</Descriptions.Item>
        </Descriptions>

        {!segmentsEditable ? (
          <div className="facility-table-wrap">
            <Table<PatrolSegmentRecord>
              size="small"
              rowKey={r => r.key}
              pagination={false}
              dataSource={record.segments ?? []}
              columns={segmentReadonlyColumns}
              scroll={{ x: 1900 }}
              locale={{ emptyText: '暂无巡河记录，请点击「编辑」后添加' }}
            />
          </div>
        ) : null}

        <Form form={segForm} layout="vertical" style={{ display: segmentsEditable ? 'block' : 'none' }}>
          <Form.List
            name="segments"
            rules={[
              {
                validator: async (_, list) => {
                  if (!list || list.length < 1) {
                    return Promise.reject(new Error('至少添加一条巡河记录'));
                  }
                },
              },
            ]}
          >
            {(fields, { add, remove }, { errors }) => {
              const segmentFormColumns: ColumnsType<FormListFieldData> = [
                {
                  title: '序号',
                  key: 'idx',
                  width: 48,
                  fixed: 'left',
                  render: (_: unknown, __: FormListFieldData, i: number) => i + 1,
                },
                {
                  title: '巡检人员',
                  key: 'segmentPersonnel',
                  width: 200,
                  render: (_: unknown, field: FormListFieldData) => (
                    <Form.Item
                      name={[field.name, 'segmentPersonnel']}
                      style={{ marginBottom: 0 }}
                      rules={[
                        { required: true, message: '必填' },
                        { type: 'array', min: 1, message: '至少一人' },
                      ]}
                    >
                      <Select
                        mode="tags"
                        size="small"
                        placeholder="姓名，回车添加"
                        tokenSeparators={[',', '，', '、']}
                      />
                    </Form.Item>
                  ),
                },
                {
                  title: '开始',
                  key: 'strtime',
                  width: 168,
                  render: (_: unknown, field: FormListFieldData) => (
                    <Form.Item
                      name={[field.name, 'strtime']}
                      style={{ marginBottom: 0 }}
                      rules={[{ required: true, message: '必选' }]}
                    >
                      <DatePicker showTime size="small" style={{ width: '100%' }} />
                    </Form.Item>
                  ),
                },
                {
                  title: '结束',
                  key: 'endtime',
                  width: 168,
                  render: (_: unknown, field: FormListFieldData) => (
                    <Form.Item
                      name={[field.name, 'endtime']}
                      style={{ marginBottom: 0 }}
                      rules={[{ required: true, message: '必选' }]}
                    >
                      <DatePicker showTime size="small" style={{ width: '100%' }} />
                    </Form.Item>
                  ),
                },
                {
                  title: '距离（千米）',
                  key: 'distanceKm',
                  width: 88,
                  render: (_: unknown, field: FormListFieldData) => (
                    <Form.Item
                      name={[field.name, 'distanceKm']}
                      style={{ marginBottom: 0 }}
                      rules={[{ required: true, message: '必填' }]}
                    >
                      <InputNumber min={0} step={0.01} size="small" style={{ width: '100%' }} />
                    </Form.Item>
                  ),
                },
                {
                  title: '时长（分钟）',
                  key: 'durationMin',
                  width: 88,
                  render: (_: unknown, field: FormListFieldData) => (
                    <Form.Item
                      name={[field.name, 'durationMin']}
                      style={{ marginBottom: 0 }}
                      rules={[{ required: true, message: '必填' }]}
                    >
                      <InputNumber min={0} step={1} size="small" style={{ width: '100%' }} />
                    </Form.Item>
                  ),
                },
                {
                  title: '起经°',
                  key: 'slg',
                  width: 108,
                  render: (_: unknown, field: FormListFieldData) => (
                    <Form.Item
                      name={[field.name, 'startLgtd']}
                      style={{ marginBottom: 0 }}
                      rules={[{ required: true, message: '必填' }]}
                    >
                      <InputNumber step={0.000001} size="small" style={{ width: '100%' }} />
                    </Form.Item>
                  ),
                },
                {
                  title: '起纬°',
                  key: 'slt',
                  width: 108,
                  render: (_: unknown, field: FormListFieldData) => (
                    <Form.Item
                      name={[field.name, 'startLttd']}
                      style={{ marginBottom: 0 }}
                      rules={[{ required: true, message: '必填' }]}
                    >
                      <InputNumber step={0.000001} size="small" style={{ width: '100%' }} />
                    </Form.Item>
                  ),
                },
                {
                  title: '终经°',
                  key: 'elg',
                  width: 108,
                  render: (_: unknown, field: FormListFieldData) => (
                    <Form.Item
                      name={[field.name, 'endLgtd']}
                      style={{ marginBottom: 0 }}
                      rules={[{ required: true, message: '必填' }]}
                    >
                      <InputNumber step={0.000001} size="small" style={{ width: '100%' }} />
                    </Form.Item>
                  ),
                },
                {
                  title: '终纬°',
                  key: 'elt',
                  width: 108,
                  render: (_: unknown, field: FormListFieldData) => (
                    <Form.Item
                      name={[field.name, 'endLttd']}
                      style={{ marginBottom: 0 }}
                      rules={[{ required: true, message: '必填' }]}
                    >
                      <InputNumber step={0.000001} size="small" style={{ width: '100%' }} />
                    </Form.Item>
                  ),
                },
                {
                  title: '巡河轨迹',
                  key: 'trackMapBtn',
                  width: 108,
                  fixed: 'right',
                  render: (_: unknown, field: FormListFieldData) => {
                    const saved = prevSegs[field.name];
                    const rows = segForm.getFieldValue('segments') as PatrolSegmentFormRow[] | undefined;
                    const row = rows?.[field.name];
                    return (
                      <Button
                        type="link"
                        size="small"
                        icon={<EnvironmentOutlined />}
                        onClick={() => {
                          setSegmentTrackModalSeg({
                            key: saved?.key ?? `draft-${field.name}`,
                            segmentPatrolNo: saved?.segmentPatrolNo ?? '',
                            segmentPersonnel: saved?.segmentPersonnel ?? [],
                            strtime:
                              saved?.strtime ?? (row?.strtime?.format('YYYY-MM-DD HH:mm:ss') ?? ''),
                            endtime:
                              saved?.endtime ?? (row?.endtime?.format('YYYY-MM-DD HH:mm:ss') ?? ''),
                            distanceKm: saved?.distanceKm ?? row?.distanceKm ?? 0,
                            durationMin: saved?.durationMin ?? row?.durationMin ?? 0,
                            startLgtd: saved?.startLgtd ?? row?.startLgtd ?? 0,
                            startLttd: saved?.startLttd ?? row?.startLttd ?? 0,
                            endLgtd: saved?.endLgtd ?? row?.endLgtd ?? 0,
                            endLttd: saved?.endLttd ?? row?.endLttd ?? 0,
                            trackSummary: saved?.trackSummary?.trim() ?? '',
                          });
                        }}
                      >
                        查看轨迹
                      </Button>
                    );
                  },
                },
                {
                  title: '操作',
                  key: 'op',
                  width: 72,
                  fixed: 'right',
                  render: (_: unknown, field: FormListFieldData) => (
                    <Button type="link" danger size="small" disabled={fields.length <= 1} onClick={() => remove(field.name)}>
                      删除
                    </Button>
                  ),
                },
              ];

              return (
                <>
                  <Space wrap style={{ marginBottom: 10 }}>
                    <Button type="primary" size="small" ghost icon={<PlusOutlined />} onClick={() => add(emptyPatrolSegmentFormValues())}>
                      添加一行
                    </Button>
                    <Button size="small" icon={<ImportOutlined />} onClick={() => setBatchOpen(true)}>
                      批量导入
                    </Button>
                  </Space>
                  <div className="facility-table-wrap">
                    <Table<FormListFieldData>
                      size="small"
                      rowKey="key"
                      pagination={false}
                      dataSource={fields}
                      columns={segmentFormColumns}
                      scroll={{ x: 2100 }}
                    />
                  </div>
                  <Form.ErrorList errors={errors} />
                </>
              );
            }}
          </Form.List>
        </Form>
      </Card>

      <Modal
        title="批量导入巡河记录"
        open={batchOpen}
        onCancel={() => {
          setBatchOpen(false);
          setBatchText('');
        }}
        width={640}
        destroyOnClose
        styles={formModalStyles}
        onOk={() => {
          const parsed = parsePatrolBatchImportLines(batchText);
          if (!parsed.length) {
            message.warning('未解析到有效行，请检查列数与日期格式（共 9 列）');
            return;
          }
          for (const row of parsed) {
            if (!row.segmentPersonnel.length) {
              message.warning('导入行须包含至少一名巡检人员');
              return;
            }
          }
          const cur = (segForm.getFieldValue('segments') as PatrolSegmentFormRow[] | undefined) ?? [];
          segForm.setFieldsValue({ segments: [...cur, ...parsed] });
          setBatchOpen(false);
          setBatchText('');
          message.success(`已追加 ${parsed.length} 条巡河记录`);
        }}
      >
        <TextArea
          value={batchText}
          onChange={e => setBatchText(e.target.value)}
          placeholder={`# 示例（制表符分隔，9 列）：\n张伟、李某\t2024-06-15 08:30:00\t2024-06-15 09:15:00\t3.1\t45\t112.965432\t28.200128\t112.9482\t28.2156`}
          rows={12}
        />
      </Modal>

      <Modal
        title={
          segmentTrackModalSeg?.strtime && segmentTrackModalSeg?.endtime ?
            `巡河轨迹 · ${segmentTrackModalSeg.strtime} ~ ${segmentTrackModalSeg.endtime}`
          : '巡河轨迹'
        }
        open={!!segmentTrackModalSeg}
        onCancel={() => setSegmentTrackModalSeg(null)}
        footer={null}
        width={720}
        destroyOnClose
        styles={formModalStyles}
      >
        {segmentTrackModalSeg ? (
          <>
            <div className="eco-map-placeholder" style={{ height: 280, marginBottom: 16 }}>
              <EnvironmentOutlined style={{ fontSize: 48, marginBottom: 8 }} />
            </div>
            <Text type="secondary" style={{ marginBottom: 0 }}>
              {segmentTrackModalSeg.trackSummary?.trim() || '—'}
            </Text>
          </>
        ) : null}
      </Modal>
    </div>
  );
};

const PatrolRecord: React.FC<{
  patrolList: PatrolRecordRow[];
  setPatrolList: React.Dispatch<React.SetStateAction<PatrolRecordRow[]>>;
  sections: RiverSectionRow[];
}> = ({ patrolList, setPatrolList, sections }) => {
  const [filterPatrolId, setFilterPatrolId] = useState('');
  const [filterPatrolSectionId, setFilterPatrolSectionId] = useState('');
  const [filterPatrolSectionName, setFilterPatrolSectionName] = useState('');
  const [filterPatrolChief, setFilterPatrolChief] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [detailRecord, setDetailRecord] = useState<PatrolRecordRow | null>(null);
  /** 详情弹窗·巡河记录表格中已展开地图的行 */
  const [detailSegExpandedRowKeys, setDetailSegExpandedRowKeys] = useState<React.Key[]>([]);
  /** 巡河记录独立页：当前编辑的巡河台账 key */
  const [patrolSegmentsPageKey, setPatrolSegmentsPageKey] = useState<string | null>(null);
  /** 发现问题详情：点击播放的视频 */
  const [problemVideo, setProblemVideo] = useState<{ url: string; name?: string } | null>(null);
  const [form] = Form.useForm<{
    sectionId?: string;
    chiefName: string;
    patrolMode: string;
  }>();

  /** 选择责任河段后，河长名称与责任段台账 chiefName 联动 */
  const onPatrolSectionChange = (sid: string | undefined) => {
    if (!sid) {
      form.setFieldValue('chiefName', '');
      return;
    }
    const sec = sections.find(s => s.sectionId === sid);
    form.setFieldValue('chiefName', sec?.chiefName ?? '');
  };

  useEffect(() => {
    if (!detailOpen) {
      setDetailSegExpandedRowKeys([]);
    }
  }, [detailOpen]);

  const filteredPatrolData = useMemo(
    () =>
      patrolList.filter(item => {
        const pid = filterPatrolId.trim();
        const sid = filterPatrolSectionId.trim();
        const sname = filterPatrolSectionName.trim();
        const chief = filterPatrolChief.trim();
        if (pid && !item.patrolId.includes(pid)) return false;
        if (sid && !item.sectionId.includes(sid)) return false;
        if (sname && !item.sectionName.includes(sname)) return false;
        if (chief && !item.chiefName.includes(chief)) return false;
        return true;
      }),
    [patrolList, filterPatrolId, filterPatrolSectionId, filterPatrolSectionName, filterPatrolChief],
  );

  const sectionPickOptions = useMemo(
    () =>
      sections.map(r => ({
        value: r.sectionId,
        label: `${r.sectionName}（${r.sectionId}）`,
      })),
    [sections],
  );

  const openAdd = () => {
    setEditingKey(null);
    form.resetFields();
    form.setFieldsValue({
      chiefName: '',
      patrolMode: '步行巡河',
    });
    setFormOpen(true);
  };

  const openEdit = (row: PatrolRecordRow) => {
    setEditingKey(row.key);
    const sec = sections.find(s => s.sectionId === row.sectionId);
    form.setFieldsValue({
      sectionId: row.sectionId,
      /** 以责任段台账关联河长为准，与列表展示一致 */
      chiefName: sec?.chiefName ?? row.chiefName,
      patrolMode: row.patrolMode,
    });
    setFormOpen(true);
  };

  const openDetail = (row: PatrolRecordRow) => {
    setDetailRecord(row);
    setDetailOpen(true);
  };

  const handleSave = () => {
    form.validateFields().then(values => {
      const sid = values.sectionId;
      if (!sid) {
        message.warning('请选择责任河段');
        return;
      }
      const sec = sections.find(s => s.sectionId === sid);
      const prev = editingKey ? patrolList.find(p => p.key === editingKey) : undefined;
      if (editingKey && prev) {
        const row: PatrolRecordRow = {
          ...prev,
          sectionId: sid,
          sectionName: sec?.sectionName ?? prev.sectionName,
          chiefName: (sec?.chiefName ?? values.chiefName ?? '').trim(),
          patrolMode: values.patrolMode,
        };
        setPatrolList(prevList => prevList.map(p => (p.key === editingKey ? row : p)));
        message.success('台账信息已保存');
      } else {
        const newKey = `p-${Date.now()}`;
        const newPatrolId = genPatrolId();
        const row: PatrolRecordRow = {
          key: newKey,
          patrolId: newPatrolId,
          sectionId: sid,
          sectionName: sec?.sectionName ?? '',
          chiefName: (sec?.chiefName ?? values.chiefName ?? '').trim(),
          patrolMode: values.patrolMode,
          segments: [],
          problems: [],
          personnel: [],
        };
        setPatrolList(prevList => [...prevList, row]);
        message.success('已创建，正在打开巡河记录编辑页');
        setPatrolSegmentsPageKey(newKey);
      }
      setFormOpen(false);
      form.resetFields();
      setEditingKey(null);
    });
  };

  const handleDeleteInForm = () => {
    if (!editingKey) return;
    setPatrolList(prev => prev.filter(p => p.key !== editingKey));
    if (patrolSegmentsPageKey === editingKey) {
      setPatrolSegmentsPageKey(null);
    }
    if (detailRecord?.key === editingKey) {
      setDetailOpen(false);
      setDetailRecord(null);
    }
    message.success('删除成功');
    setFormOpen(false);
    form.resetFields();
    setEditingKey(null);
  };

  const detailProblemColumns: ColumnsType<PatrolProblemItem> = useMemo(
    () => [
      {
        title: '序号',
        key: 'i',
        width: 56,
        fixed: 'left',
        render: (_: unknown, __: PatrolProblemItem, i: number) => i + 1,
      },
      { title: '问题编号', dataIndex: 'problemNo', key: 'problemNo', width: 132, ellipsis: true },
      { title: '问题描述', dataIndex: 'problemDesc', key: 'problemDesc', width: 160, ellipsis: true },
      { title: '上报人员', dataIndex: 'reporterName', key: 'reporterName', width: 100, ellipsis: true },
      { title: '上报人联系电话', dataIndex: 'reporterPhone', key: 'reporterPhone', width: 128 },
      { title: '发现时间', dataIndex: 'foundTime', key: 'foundTime', width: 158 },
      { title: '位置', dataIndex: 'location', key: 'location', width: 200, ellipsis: true },
      {
        title: '图片',
        key: 'imageUrls',
        width: 220,
        render: (_: unknown, row: PatrolProblemItem) => {
          const imgs = row.imageUrls?.filter(Boolean) ?? [];
          if (!imgs.length) return <Text type="secondary">—</Text>;
  return (
            <Image.PreviewGroup>
              <Space wrap size={4}>
                {imgs.map((url, i) => (
                  <Image
                    key={`${url}-${i}`}
                    src={url}
                    alt={`问题图片${i + 1}`}
                    width={52}
                    height={52}
                    style={{ objectFit: 'cover', borderRadius: 4 }}
                  />
                ))}
              </Space>
            </Image.PreviewGroup>
          );
        },
      },
      {
        title: '视频',
        key: 'videoUrls',
        width: 120,
        render: (_: unknown, row: PatrolProblemItem) => {
          const vids = row.videoUrls?.filter(Boolean) ?? [];
          if (!vids.length) return <Text type="secondary">—</Text>;
          return (
            <Space direction="vertical" size={2}>
              {vids.map((url, i) => (
                <Button
                  key={`${url}-${i}`}
                  type="link"
                  size="small"
                  icon={<PlayCircleOutlined />}
                  onClick={() => setProblemVideo({ url, name: `视频 ${i + 1}` })}
                  style={{ padding: 0, height: 'auto' }}
                >
                  播放视频 {i + 1}
                </Button>
              ))}
            </Space>
          );
        },
      },
      { title: '处理建议', dataIndex: 'handleSuggestion', key: 'handleSuggestion', width: 180, ellipsis: true },
    ],
    [],
  );

  /** 详情·巡河记录 Tab：字段列 + 每行「查看轨迹」展开地图 */
  const patrolDetailSegmentListColumns: ColumnsType<PatrolSegmentRecord> = useMemo(
    () => [
      {
        title: '序号',
        key: 'i',
        width: 56,
        fixed: 'left',
        render: (_: unknown, __: PatrolSegmentRecord, i: number) => i + 1,
      },
      {
        title: '巡检人员',
        key: 'segmentPersonnel',
        width: 140,
        ellipsis: true,
        render: (_: unknown, r: PatrolSegmentRecord) => (r.segmentPersonnel?.length ? r.segmentPersonnel.join('、') : '—'),
      },
      { title: '开始时间', dataIndex: 'strtime', key: 'strtime', width: 158 },
      { title: '结束时间', dataIndex: 'endtime', key: 'endtime', width: 158 },
      { title: '距离（千米）', dataIndex: 'distanceKm', key: 'distanceKm', width: 88 },
      { title: '时长（分钟）', dataIndex: 'durationMin', key: 'durationMin', width: 88 },
      { title: '起点经度', dataIndex: 'startLgtd', key: 'startLgtd', width: 100 },
      { title: '起点纬度', dataIndex: 'startLttd', key: 'startLttd', width: 100 },
      { title: '终点经度', dataIndex: 'endLgtd', key: 'endLgtd', width: 100 },
      { title: '终点纬度', dataIndex: 'endLttd', key: 'endLttd', width: 100 },
      {
        title: '巡河轨迹',
        key: 'trackExpand',
        width: 120,
        fixed: 'right',
        render: (_: unknown, seg: PatrolSegmentRecord) => {
          const open = detailSegExpandedRowKeys.includes(seg.key);
          return (
            <Button
              type="link"
              size="small"
              icon={<EnvironmentOutlined />}
              onClick={() => {
                setDetailSegExpandedRowKeys(prev =>
                  open ? prev.filter(k => k !== seg.key) : [...prev, seg.key],
                );
              }}
            >
              {open ? '收起地图' : '查看轨迹'}
            </Button>
          );
        },
      },
    ],
    [detailSegExpandedRowKeys],
  );

  const patrolColumns: ColumnsType<PatrolRecordRow> = useMemo(
    () => [
      { title: '河长名称', dataIndex: 'chiefName', key: 'chiefName', width: 96, ellipsis: true, fixed: 'left' },
      { title: '河段名称', dataIndex: 'sectionName', key: 'sectionName', width: 180, ellipsis: true },
      {
        title: '巡河时间',
        key: 'patrolTime',
        width: 200,
        ellipsis: true,
        render: (_: unknown, r: PatrolRecordRow) => patrolAggregatedTimeRange(r),
      },
      {
        title: '巡河人员',
        key: 'personnel',
        width: 200,
        ellipsis: true,
        render: (_: unknown, r: PatrolRecordRow) => (r.personnel?.length ? r.personnel.join('、') : '—'),
      },
      { title: '巡河方式', dataIndex: 'patrolMode', key: 'patrolMode', width: 120, ellipsis: true },
      {
        title: '巡河轨迹',
        key: 'track',
        width: 168,
        ellipsis: true,
        render: (_: unknown, r: PatrolRecordRow) => {
          const n = r.segments?.length ?? 0;
          if (!n) return '—';
          return `共 ${n} 段（每段轨迹一对一）`;
        },
      },
      {
        title: '发现问题',
        key: 'problems',
        width: 220,
        ellipsis: true,
        render: (_: unknown, r: PatrolRecordRow) => {
          const list = r.problems ?? [];
          if (!list.length) return '—';
          const first = list[0];
          const head =
            (first.problemNo?.trim() ? `${first.problemNo} ` : '') +
            (first.problemDesc?.trim() || '（无描述）');
          return list.length === 1 ? head : `${head.slice(0, 24)}${head.length > 24 ? '…' : ''} 等 ${list.length} 条`;
        },
      },
      {
        title: '操作',
        key: 'operation',
        width: 268,
        fixed: 'right',
        render: (_: unknown, row: PatrolRecordRow) => (
          <Space size="small" wrap>
            <Button type="link" className="action-btn detail" size="small" icon={<EyeOutlined />} onClick={() => openDetail(row)}>
              详情
            </Button>
            <Button type="link" className="action-btn edit" size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>
              编辑
            </Button>
            <Button
              type="link"
              size="small"
              icon={<UnorderedListOutlined />}
              onClick={() => setPatrolSegmentsPageKey(row.key)}
            >
              巡河记录
            </Button>
          </Space>
        ),
      },
    ],
    [],
  );

  const segmentsEditorRecord = patrolSegmentsPageKey ? patrolList.find(p => p.key === patrolSegmentsPageKey) : undefined;

  useEffect(() => {
    if (patrolSegmentsPageKey && !patrolList.some(p => p.key === patrolSegmentsPageKey)) {
      setPatrolSegmentsPageKey(null);
    }
  }, [patrolSegmentsPageKey, patrolList]);

  /** 巡河信息导出：输出巡河记录/发现问题明细，避免导出原始技术字段 */
  const handlePatrolExport = () => {
    if (!filteredPatrolData.length) {
      message.warning('当前筛选条件下无数据可导出');
      return;
    }
    const exportRows = filteredPatrolData.map(row => {
      const segmentDetail = (row.segments ?? [])
        .map((s, idx) => {
          const people = s.segmentPersonnel?.length ? s.segmentPersonnel.join('、') : '—';
          return `${idx + 1}. ${s.strtime}~${s.endtime}｜人员:${people}｜里程:${s.distanceKm}km｜时长:${s.durationMin}min｜起点:${s.startLgtd},${s.startLttd}｜终点:${s.endLgtd},${s.endLttd}`;
        })
        .join('\n');
      const problemDetail = (row.problems ?? [])
        .map((p, idx) => `${idx + 1}. ${p.problemNo || '—'}｜${p.problemDesc || '—'}｜上报:${p.reporterName || '—'}｜时间:${p.foundTime || '—'}｜位置:${p.location || '—'}`)
        .join('\n');
      return {
        巡河编号: row.patrolId,
        河段编码: row.sectionId,
        河段名称: row.sectionName,
        河长名称: row.chiefName,
        巡河方式: row.patrolMode,
        巡河时间: patrolAggregatedTimeRange(row),
        巡河人员: row.personnel?.length ? row.personnel.join('、') : '',
        巡河记录条数: row.segments?.length ?? 0,
        巡河记录明细: segmentDetail,
        发现问题条数: row.problems?.length ?? 0,
        发现问题明细: problemDetail,
        用户编码: row.userId ?? '',
      } as Record<string, unknown>;
    });
    const exportColumns = [
      { key: '巡河编号', title: '巡河编号', dataIndex: '巡河编号' },
      { key: '河段编码', title: '河段编码', dataIndex: '河段编码' },
      { key: '河段名称', title: '河段名称', dataIndex: '河段名称' },
      { key: '河长名称', title: '河长名称', dataIndex: '河长名称' },
      { key: '巡河方式', title: '巡河方式', dataIndex: '巡河方式' },
      { key: '巡河时间', title: '巡河时间', dataIndex: '巡河时间' },
      { key: '巡河人员', title: '巡河人员', dataIndex: '巡河人员' },
      { key: '巡河记录条数', title: '巡河记录条数', dataIndex: '巡河记录条数' },
      { key: '巡河记录明细', title: '巡河记录明细', dataIndex: '巡河记录明细' },
      { key: '发现问题条数', title: '发现问题条数', dataIndex: '发现问题条数' },
      { key: '发现问题明细', title: '发现问题明细', dataIndex: '发现问题明细' },
      { key: '用户编码', title: '用户编码', dataIndex: '用户编码' },
    ];
    downloadTableFullExcel(exportRows, exportColumns, '生态整治_巡河记录', '巡河记录');
    message.success('已导出 Excel（含巡河记录明细）');
  };

  return (
    <>
      {patrolSegmentsPageKey && segmentsEditorRecord ? (
        <PatrolSegmentsEditorPage
          record={segmentsEditorRecord}
          onBack={() => setPatrolSegmentsPageKey(null)}
          onPersist={next => setPatrolList(prev => prev.map(p => (p.key === next.key ? next : p)))}
        />
      ) : (
    <div className="facility-view">
      <Card
        title="巡河记录"
        extra={
          <Space wrap size={[8, 8]} align="center">
            <EcoProtoExportBtn
              onClick={handlePatrolExport}
            />
            <EcoProtoImportBtn />
            <Button type="primary" icon={<PlusOutlined />} className="add-btn" onClick={openAdd}>
              新增
            </Button>
          </Space>
        }
      >
        <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8} lg={5}>
            <Input
              placeholder="河段名称"
              prefix={<SearchOutlined />}
              value={filterPatrolSectionName}
              onChange={e => setFilterPatrolSectionName(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={5}>
            <Input
              placeholder="河长名称"
              prefix={<SearchOutlined />}
              value={filterPatrolChief}
              onChange={e => setFilterPatrolChief(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={5}>
            <Input
              placeholder="巡河编号"
              prefix={<SearchOutlined />}
              value={filterPatrolId}
              onChange={e => setFilterPatrolId(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Input
              placeholder="河段编码"
              prefix={<SearchOutlined />}
              value={filterPatrolSectionId}
              onChange={e => setFilterPatrolSectionId(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={8}>
            <Space>
              <Button type="primary" className="search-btn" icon={<SearchOutlined />}>
                查询
              </Button>
              <Button
                onClick={() => {
                  setFilterPatrolSectionName('');
                  setFilterPatrolChief('');
                  setFilterPatrolId('');
                  setFilterPatrolSectionId('');
                }}
              >
                重置
              </Button>
            </Space>
          </Col>
        </Row>
        <div className="facility-table-wrap">
          <Table
            size="small"
            columns={patrolColumns}
            dataSource={filteredPatrolData}
            rowKey="key"
            pagination={{ defaultPageSize: 10, showTotal: t => `共 ${t} 条` }}
            scroll={{ x: 1650 }}
          />
        </div>
      </Card>
    </div>
      )}

      <Modal
        styles={formModalStyles}
        title={editingKey ? '编辑巡河台账' : '新增巡河台账'}
        open={formOpen}
        onCancel={() => {
          setFormOpen(false);
          form.resetFields();
          setEditingKey(null);
        }}
        width={640}
        footer={
          <Space>
            {editingKey ? (
              <Popconfirm title="确认删除" description="确定删除该条巡河记录？" onConfirm={handleDeleteInForm}>
                <Button danger>删除</Button>
              </Popconfirm>
            ) : null}
            <Button
              onClick={() => {
                setFormOpen(false);
                form.resetFields();
                setEditingKey(null);
              }}
            >
              取消
            </Button>
            <Button type="primary" onClick={handleSave}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          {editingKey ? (
            <Form.Item label="巡河编号">
              <Text>{patrolList.find(p => p.key === editingKey)?.patrolId ?? '—'}</Text>
            </Form.Item>
          ) : null}
          <Form.Item name="sectionId" label="责任河段" rules={[{ required: true, message: '请选择责任河段' }]}>
            <Select
              showSearch
              allowClear
              placeholder="请选择责任河段"
              options={sectionPickOptions}
              optionFilterProp="label"
              onChange={onPatrolSectionChange}
            />
          </Form.Item>
          <Form.Item
            name="chiefName"
            label="河长名称"
            rules={[{ required: true, message: '请先选择责任河段（自动带入关联河长）' }]}
            extra="与所选责任河段台账中的河长一致，不可手工修改。"
          >
            <Input readOnly placeholder="选择责任河段后自动填入" />
          </Form.Item>
          <Form.Item name="patrolMode" label="巡河方式" rules={[{ required: true, message: '请选择巡河方式' }]}>
            <Select placeholder="请选择" options={PATROL_MODE_OPTIONS.map(v => ({ label: v, value: v }))} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="巡河详情"
        open={detailOpen}
        onCancel={() => {
          setDetailOpen(false);
          setDetailRecord(null);
          setDetailSegExpandedRowKeys([]);
        }}
        footer={null}
        width={820}
        styles={formModalStyles}
      >
        {detailRecord ? (
          <Tabs defaultActiveKey="d1">
            <TabPane tab="基本信息" key="d1">
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="巡河编号">{detailRecord.patrolId}</Descriptions.Item>
                <Descriptions.Item label="河段编码">{detailRecord.sectionId}</Descriptions.Item>
                <Descriptions.Item label="河段名称" span={2}>
                  {detailRecord.sectionName}
                </Descriptions.Item>
                <Descriptions.Item label="河长名称">{detailRecord.chiefName}</Descriptions.Item>
                <Descriptions.Item label="巡河方式">{detailRecord.patrolMode}</Descriptions.Item>
                <Descriptions.Item label="整次时间区间（多段聚合）" span={2}>
                  {patrolAggregatedTimeRange(detailRecord)}
                </Descriptions.Item>
                <Descriptions.Item label="巡河记录条数" span={2}>
                  {detailRecord.segments?.length ?? 0} 条（轨迹请在「巡河记录」页逐行查看）
                </Descriptions.Item>
                <Descriptions.Item label="巡河人员" span={2}>
                  {detailRecord.personnel?.length ? detailRecord.personnel.join('、') : '—'}
                </Descriptions.Item>
                {detailRecord.userId ? (
                  <Descriptions.Item label="用户编码">{detailRecord.userId}</Descriptions.Item>
                ) : null}
              </Descriptions>
            </TabPane>
            <TabPane tab="巡河记录" key="d2">
              <div className="facility-table-wrap">
                <Table<PatrolSegmentRecord>
                  size="small"
                  rowKey={row => row.key}
                  dataSource={detailRecord.segments ?? []}
                  columns={patrolDetailSegmentListColumns}
                  pagination={false}
                  scroll={{ x: 1680 }}
                  locale={{ emptyText: '暂无巡河记录' }}
                  expandable={{
                    showExpandColumn: false,
                    expandedRowKeys: detailSegExpandedRowKeys,
                    onExpandedRowsChange: keys => setDetailSegExpandedRowKeys([...keys]),
                    expandedRowRender: seg => (
                      <div style={{ padding: '12px 16px', background: '#fafafa', borderRadius: 4 }}>
                        <div className="eco-map-placeholder" style={{ height: 200, marginBottom: 12 }}>
                          <EnvironmentOutlined style={{ fontSize: 40, marginBottom: 8 }} />
                        </div>
                        <Text type="secondary" style={{ marginBottom: 0 }}>
                          {seg.trackSummary?.trim() || '—'}
                        </Text>
                      </div>
                    ),
                  }}
                />
              </div>
            </TabPane>
            <TabPane tab="发现问题" key="d3">
              <Table
                size="small"
                rowKey={(row, i) => row.problemNo || `p-${i}`}
                dataSource={detailRecord.problems ?? []}
                columns={detailProblemColumns}
                pagination={false}
                scroll={{ x: 1600 }}
              />
            </TabPane>
          </Tabs>
        ) : null}
      </Modal>

      <Modal
        title={problemVideo?.name ?? '视频播放'}
        open={!!problemVideo}
        onCancel={() => setProblemVideo(null)}
        footer={null}
        width={800}
        destroyOnClose
        styles={formModalStyles}
      >
        {problemVideo ? (
          <video
            src={problemVideo.url}
            controls
            playsInline
            style={{ width: '100%', maxHeight: '70vh', background: '#000' }}
          >
            您的浏览器不支持视频播放
          </video>
        ) : null}
      </Modal>
    </>
  );
};

/** 水质公示：区域筛选项（与示例数据 regionShort 一致） */
const WQ_REGION_FILTER_OPTS = ['岳麓区', '浏阳市', '望城区', '长沙县'];

const WaterQuality: React.FC<{ sections: RiverSectionRow[] }> = ({ sections }) => {
  const [filterRegion, setFilterRegion] = useState<string | undefined>();
  const [filterSection, setFilterSection] = useState<string | undefined>();
  const [filterRange, setFilterRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [pointNameInput, setPointNameInput] = useState('');
  const [wqDetailOpen, setWqDetailOpen] = useState(false);
  const [wqDetailRecord, setWqDetailRecord] = useState<WaterQualityRow | null>(null);
  const [applied, setApplied] = useState<{
    region?: string;
    section?: string;
    range: [dayjs.Dayjs, dayjs.Dayjs] | null;
    pointKw: string;
  }>({ range: null, pointKw: '' });

  const sectionOptions = useMemo(
    () => sections.map(r => ({ label: r.sectionName, value: r.sectionName })),
    [sections],
  );

  const filteredWqData = useMemo(() => {
    return initialWaterQualityData.filter(item => {
      if (applied.region && item.regionShort !== applied.region) return false;
      if (applied.section && item.sectionName !== applied.section) return false;
      if (applied.range?.[0] && applied.range?.[1]) {
        const t = dayjs(item.monitorTime);
        const [a, b] = applied.range;
        const ta = t.valueOf();
        if (ta < a.valueOf() || ta > b.valueOf()) return false;
      }
      const kw = applied.pointKw.trim();
      if (kw && !item.monitorPointName.includes(kw)) return false;
      return true;
    });
  }, [applied]);

  const handleSearch = () => {
    setApplied({
      region: filterRegion,
      section: filterSection,
      range: filterRange,
      pointKw: pointNameInput,
    });
    message.success('已按条件检索（原型示意）');
  };

  const handleReset = () => {
    setFilterRegion(undefined);
    setFilterSection(undefined);
    setFilterRange(null);
    setPointNameInput('');
    setApplied({ range: null, pointKw: '' });
    message.info('已重置筛选条件');
  };

  const openWqDetail = (row: WaterQualityRow) => {
    setWqDetailRecord(row);
    setWqDetailOpen(true);
  };

  const wqColumns = [
      {
        title: '序号',
        key: 'index',
        width: 64,
        fixed: 'left' as const,
        render: (_: unknown, __: unknown, index: number) => index + 1,
      },
      {
        title: '责任段名称',
        dataIndex: 'sectionName',
        key: 'sectionName',
        width: 200,
        ellipsis: true,
      },
      {
        title: '监测点名称',
        dataIndex: 'monitorPointName',
        key: 'monitorPointName',
        width: 200,
        ellipsis: true,
      },
      { title: '水体名称', dataIndex: 'waterBody', key: 'waterBody', width: 120, ellipsis: true },
      { title: '区域名称', dataIndex: 'regionShort', key: 'regionShort', width: 96 },
      {
        title: '所属区划',
        dataIndex: 'regionName',
        key: 'regionName',
        width: 200,
        ellipsis: true,
        render: (_: unknown, row: WaterQualityRow) =>
          row.addvcd ? getShaoshanAddvcdLabel(row.addvcd) : row.regionName || '—',
      },
      { title: '监测时间', dataIndex: 'monitorTime', key: 'monitorTime', width: 168 },
      {
        title: '水温（摄氏度）',
        dataIndex: 'waterTemp',
        key: 'waterTemp',
        width: 112,
        render: (v: number) => v.toFixed(1),
      },
      {
        title: '酸碱度',
        dataIndex: 'ph',
        key: 'ph',
        width: 88,
        render: (v: number) => v.toFixed(2),
      },
      {
        title: '溶解氧（毫克每升）',
        dataIndex: 'dissolvedOxygen',
        key: 'dissolvedOxygen',
        width: 130,
        render: (v: number) => v.toFixed(2),
      },
      {
        title: '高锰酸盐指数（毫克每升）',
        dataIndex: 'permanganate',
        key: 'permanganate',
        width: 168,
        render: (v: number) => v.toFixed(2),
      },
      {
        title: '氨氮（毫克每升）',
        dataIndex: 'ammoniaNitrogen',
        key: 'ammoniaNitrogen',
        width: 130,
        render: (v: number) => v.toFixed(2),
      },
      {
        title: '总磷（毫克每升）',
        dataIndex: 'totalPhosphorus',
        key: 'totalPhosphorus',
        width: 130,
        render: (v: number) => v.toFixed(3),
      },
      {
        title: '水质类别',
        dataIndex: 'qualityClass',
        key: 'qualityClass',
        width: 100,
        render: (v: number) => <Tag color={v <= 3 ? 'green' : v <= 5 ? 'orange' : 'red'}>{QUALITY_CLASS_LABEL[v]}</Tag>,
      },
      {
        title: '操作',
        key: 'operation',
        width: 88,
        fixed: 'right' as const,
        render: (_: unknown, row: WaterQualityRow) => (
          <Button type="link" className="action-btn detail" size="small" icon={<EyeOutlined />} onClick={() => openWqDetail(row)}>
            详情
          </Button>
        ),
      },
  ];

  return (
    <div className="facility-view">
      <Card
        title="水质监测公示"
        extra={
          <Space wrap size={[8, 8]} align="center">
            <EcoProtoExportBtn
              onClick={() =>
                exportEcoTableExcel(
                  filteredWqData as unknown as Record<string, unknown>[],
                  wqColumns as unknown as Array<{ key?: string; title?: unknown; dataIndex?: unknown }>,
                  '生态整治_水质监测公示',
                  '水质监测',
                )
              }
            />
          </Space>
        }
      >
        <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8} lg={5}>
            <Select
              allowClear
              placeholder="区域名称"
              style={{ width: '100%' }}
              value={filterRegion}
              onChange={setFilterRegion}
              options={WQ_REGION_FILTER_OPTS.map(r => ({ label: r, value: r }))}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={5}>
            <Select
              allowClear
              placeholder="责任段"
              style={{ width: '100%' }}
              value={filterSection}
              onChange={setFilterSection}
              options={sectionOptions}
              showSearch
              optionFilterProp="label"
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Input
              placeholder="监测点名称"
              value={pointNameInput}
              onChange={e => setPointNameInput(e.target.value)}
              allowClear
            />
          </Col>
        </Row>
        <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={24} md={16} lg={10}>
            <RangePicker
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              placeholder={['开始时间', '结束时间']}
              style={{ width: '100%', minWidth: 280 }}
              value={filterRange}
              onChange={v => setFilterRange(v as [dayjs.Dayjs, dayjs.Dayjs] | null)}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={8}>
            <Space>
              <Button type="primary" className="search-btn" icon={<SearchOutlined />} onClick={handleSearch}>
                查询
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Col>
        </Row>
        <div className="facility-table-wrap">
          <Table
            size="small"
            columns={wqColumns}
            dataSource={filteredWqData}
            rowKey="key"
            pagination={{ defaultPageSize: 10, showTotal: t => `共 ${t} 条` }}
            scroll={{ x: 2200 }}
          />
        </div>
      </Card>

      <Modal
        styles={formModalStyles}
        title="水质监测详情"
        open={wqDetailOpen}
        onCancel={() => {
          setWqDetailOpen(false);
          setWqDetailRecord(null);
        }}
        footer={null}
        width={840}
      >
        {wqDetailRecord && (
          <Descriptions bordered column={2} size="small" style={{ marginTop: 8 }}>
            <Descriptions.Item label="记录编号">{wqDetailRecord.id}</Descriptions.Item>
            <Descriptions.Item label="河段编码">{wqDetailRecord.sectionId}</Descriptions.Item>
            <Descriptions.Item label="责任段名称" span={2}>
              {wqDetailRecord.sectionName}
            </Descriptions.Item>
            <Descriptions.Item label="监测点名称" span={2}>
              {wqDetailRecord.monitorPointName}
            </Descriptions.Item>
            <Descriptions.Item label="水体名称">{wqDetailRecord.waterBody}</Descriptions.Item>
            <Descriptions.Item label="区域名称（区县）">{wqDetailRecord.regionShort}</Descriptions.Item>
            <Descriptions.Item label="所属区划" span={2}>
              {wqDetailRecord.addvcd ?
                getShaoshanAddvcdLabel(wqDetailRecord.addvcd)
              : wqDetailRecord.regionName || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="监测日期">{wqDetailRecord.detectionDate}</Descriptions.Item>
            <Descriptions.Item label="监测时间" span={2}>
              {wqDetailRecord.monitorTime}
            </Descriptions.Item>
            <Descriptions.Item label="水温（℃）">{wqDetailRecord.waterTemp.toFixed(1)}</Descriptions.Item>
            <Descriptions.Item label="酸碱度">{wqDetailRecord.ph.toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="溶解氧（毫克/升）">{wqDetailRecord.dissolvedOxygen.toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="高锰酸盐指数（毫克/升）">{wqDetailRecord.permanganate.toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="氨氮（毫克/升）">{wqDetailRecord.ammoniaNitrogen.toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="总磷（毫克/升）">{wqDetailRecord.totalPhosphorus.toFixed(3)}</Descriptions.Item>
            <Descriptions.Item label="水质类别" span={2}>
              <Tag color={wqDetailRecord.qualityClass <= 3 ? 'green' : wqDetailRecord.qualityClass <= 5 ? 'orange' : 'red'}>
                {QUALITY_CLASS_LABEL[wqDetailRecord.qualityClass]}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

/** 事务附件：多图本地预览（表单值为 data URL，原型不落服务器） */
interface AffairDataUrlImagesUploadProps {
  value?: string[];
  onChange?: (v: string[]) => void;
  /** 缩略图文件名前缀 */
  itemLabelPrefix?: string;
  /** 最多张数 */
  maxCount?: number;
  /** 单张大小上限（MB） */
  maxSizeMB?: number;
  /** 上传卡片内主文案 */
  uploadButtonText?: string;
  /** 底部灰色说明 */
  hint?: React.ReactNode;
}

const AffairDataUrlImagesUpload: React.FC<AffairDataUrlImagesUploadProps> = ({
  value,
  onChange,
  itemLabelPrefix = '图片',
  maxCount = 9,
  maxSizeMB = 5,
  uploadButtonText = '上传图片',
  hint,
}) => {
  const urls = value ?? [];
  const [reading, setReading] = useState(false);

  const fileList: UploadFile[] = useMemo(
    () =>
      urls.map((url, i) => ({
        uid: `affair-img-${i}-${url.slice(12, 40)}`,
        name: `${itemLabelPrefix}${i + 1}`,
        status: 'done' as const,
        url,
      })),
    [urls, itemLabelPrefix],
  );

  const beforeUpload = useCallback(
    (file: File) => {
      const current = value ?? [];
      if (current.length >= maxCount) {
        message.warning(`最多可上传 ${maxCount} 张，请先删除后再添加`);
        return Upload.LIST_IGNORE;
      }
      if (!file.type.startsWith('image/')) {
        message.warning('仅支持图片格式（如 JPG、PNG、WebP、GIF）');
        return Upload.LIST_IGNORE;
      }
      const mb = file.size / 1024 / 1024;
      if (mb > maxSizeMB) {
        message.warning(`单张图片不能超过 ${maxSizeMB} MB（当前约 ${mb.toFixed(2)} MB）`);
        return Upload.LIST_IGNORE;
      }
      setReading(true);
      const reader = new FileReader();
      reader.onload = () => {
        setReading(false);
        const dataUrl = reader.result as string;
        onChange?.([...(value ?? []), dataUrl]);
      };
      reader.onerror = () => {
        setReading(false);
        message.error('图片读取失败，请换一张重试');
      };
      reader.readAsDataURL(file);
      return false;
    },
    [value, onChange, maxCount, maxSizeMB],
  );

  const handleRemove = useCallback(
    (file: UploadFile) => {
      const idx = fileList.findIndex(f => f.uid === file.uid);
      if (idx < 0) return;
      onChange?.(urls.filter((_, i) => i !== idx));
    },
    [fileList, urls, onChange],
  );

  const uploadButton = (
    <div style={{ textAlign: 'center' }}>
      <div>{reading ? <LoadingOutlined style={{ fontSize: 28 }} /> : <PlusOutlined style={{ fontSize: 28 }} />}</div>
      <div style={{ marginTop: 8, fontSize: 12 }}>{reading ? '读取中…' : uploadButtonText}</div>
    </div>
  );

  return (
    <div>
      <Upload
        listType="picture-card"
        accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif"
        multiple
        disabled={reading}
        fileList={fileList}
        beforeUpload={beforeUpload}
        onRemove={handleRemove}
        showUploadList={{ showPreviewIcon: true, showRemoveIcon: true }}
      >
        {urls.length >= maxCount ? null : uploadButton}
      </Upload>
      {hint ? (
        <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 12, lineHeight: 1.6 }}>
          {hint}
        </Paragraph>
      ) : null}
    </div>
  );
};

/** 登记阶段 · 现场照片 */
const AffairScenePhotosUpload: React.FC<Partial<AffairDataUrlImagesUploadProps>> = props => (
  <AffairDataUrlImagesUpload
    itemLabelPrefix="现场照片"
    maxCount={9}
    maxSizeMB={5}
    uploadButtonText="上传现场图"
    hint="支持 JPG、PNG、WebP、GIF 等常见格式，单张不超过 5 MB，最多 9 张。图片在浏览器本地生成预览，保存后不实际上传服务器。"
    {...props}
  />
);

/** 处置填报 · 处置现场取证图 */
const AffairDisposalImagesUpload: React.FC<Partial<AffairDataUrlImagesUploadProps>> = props => (
  <AffairDataUrlImagesUpload
    itemLabelPrefix="处置现场图"
    maxCount={6}
    maxSizeMB={5}
    uploadButtonText="上传处置图"
    hint="可上传整改前后对比、处置点位等照片，单张不超过 5 MB，最多 6 张。本地预览，不落服务器。"
    {...props}
  />
);

/** 登记阶段 · 现场视频（本地文件读入 data URL 预览，原型不落服务器） */
const AffairSceneVideosUpload: React.FC<{
  value?: string[];
  onChange?: (v: string[]) => void;
}> = ({ value, onChange }) => {
  const urls = value ?? [];
  const maxCount = 5;
  const maxSizeMB = 80;
  const [reading, setReading] = useState(false);
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);

  const fileList: UploadFile[] = useMemo(
    () =>
      urls.map((url, i) => ({
        uid: `affair-video-${i}-${url.slice(16, 40)}`,
        name: `现场视频${i + 1}`,
        status: 'done' as const,
        url,
      })),
    [urls],
  );

  const beforeUpload = useCallback(
    (file: File) => {
      const cur = value ?? [];
      if (cur.length >= maxCount) {
        message.warning(`最多可上传 ${maxCount} 段视频，请先删除后再添加`);
        return Upload.LIST_IGNORE;
      }
      if (!file.type.startsWith('video/') && !/\.(mp4|webm|mov|mkv|ogg)$/i.test(file.name)) {
        message.warning('请选择视频文件（如 MP4、WebM、MOV）');
        return Upload.LIST_IGNORE;
      }
      const mb = file.size / 1024 / 1024;
      if (mb > maxSizeMB) {
        message.warning(`单段视频不能超过 ${maxSizeMB} MB（当前约 ${mb.toFixed(1)} MB）`);
        return Upload.LIST_IGNORE;
      }
      setReading(true);
      const reader = new FileReader();
      reader.onload = () => {
        setReading(false);
        const dataUrl = reader.result as string;
        onChange?.([...cur, dataUrl]);
      };
      reader.onerror = () => {
        setReading(false);
        message.error('视频读取失败，请换一段重试');
      };
      reader.readAsDataURL(file);
      return false;
    },
    [value, onChange, maxCount, maxSizeMB],
  );

  const handleRemove = useCallback(
    (file: UploadFile) => {
      const idx = fileList.findIndex(f => f.uid === file.uid);
      if (idx < 0) return;
      onChange?.(urls.filter((_, i) => i !== idx));
    },
    [fileList, urls, onChange],
  );

  return (
    <div>
      <Upload
        listType="text"
        accept="video/*,.mp4,.webm,.mov,.mkv,.ogg"
        multiple
        disabled={reading}
        fileList={fileList}
        beforeUpload={beforeUpload}
        onRemove={handleRemove}
        onPreview={file => {
          const u = file.url;
          if (u) setPreview({ url: u, name: file.name ?? '视频预览' });
        }}
      >
        <Button icon={<VideoCameraOutlined />} loading={reading}>
          {reading ? '读取中…' : '上传本地视频'}
        </Button>
      </Upload>
      <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 12, lineHeight: 1.6 }}>
        支持 MP4、WebM、MOV 等，单段不超过 {maxSizeMB} MB，最多 {maxCount} 段；浏览器本地读取用于预览，保存后不实际上传服务器。
      </Paragraph>
      <Modal
        title={preview?.name ?? '视频预览'}
        open={!!preview}
        footer={null}
        width={720}
        destroyOnClose
        onCancel={() => setPreview(null)}
        styles={formModalStyles}
      >
        {preview ? (
          <video src={preview.url} controls style={{ width: '100%', maxHeight: '70vh' }} playsInline>
            您的浏览器不支持视频播放
          </video>
        ) : null}
      </Modal>
    </div>
  );
};

/** 生成事务编号 HB-SW-年-流水（与已有台账同年流水递增） */
function genNextRiverGuardAffairCode(rows: Pick<RiverGuardAffairRow, 'affairCode'>[]): string {
  const year = dayjs().format('YYYY');
  const prefix = `HB-SW-${year}-`;
  let max = 0;
  for (const r of rows) {
    const c = r.affairCode ?? '';
    if (c.startsWith(prefix)) {
      const n = parseInt(c.slice(prefix.length), 10);
      if (!Number.isNaN(n)) max = Math.max(max, n);
    }
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}

/**
 * 事务列表编辑 · 位置地图选点：与「项目管理 · 项目档案」`ProjectArchiveMapLocationPicker` 同源交互
 *（`EmergencyEventFormMap` + 逆地理写具体地址、toolbar/aria 与项目档案对齐）。
 */
const AffairMapLocationPicker: React.FC<{ form: FormInstance }> = ({ form }) => {
  const lngWatch = Form.useWatch('longitude', form);
  const latWatch = Form.useWatch('latitude', form);
  const locWatch = Form.useWatch('location', form);
  return (
    <EmergencyEventFormMap
      longitude={String(lngWatch ?? '').trim()}
      latitude={String(latWatch ?? '').trim()}
      location={String(locWatch ?? '').trim()}
      reverseGeocodeLocation
      mapAriaLabel="事务位置地图"
      mapToolbarHint="在地图上轻点选点或拖动图钉；在可覆盖前提下将尝试在线逆地理为具体地址并填入「位置描述」（需联网）。失败时使用不含坐标的中文示意门牌占位，请改为实际地址。若位置描述为手工录入，点选后只更新经纬度，不覆盖文字。"
      onFormSync={patch => {
        form.setFieldsValue(patch);
      }}
    />
  );
};

const AffairsManage: React.FC<{
  affairs: RiverGuardAffairRow[];
  onAffairsChange: React.Dispatch<React.SetStateAction<RiverGuardAffairRow[]>>;
  sections: RiverSectionRow[];
}> = ({ affairs: rows, onAffairsChange: setRows, sections }) => {
  const [filterForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [query, setQuery] = useState<Record<string, unknown>>({});
  const [detail, setDetail] = useState<RiverGuardAffairRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  /** 详情弹窗默认 Tab */
  const [affairDetailInitialTab, setAffairDetailInitialTab] = useState<'basic' | 'disposal'>('basic');
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<RiverGuardAffairRow | null>(null);
  const [editTab, setEditTab] = useState('basic');

  /** 筛选下拉：新业务类型 + 旧版字典并集，兼容历史数据 */
  const affairProblemTypeFilterOptions = useMemo(
    () => Array.from(new Set([...RIVER_GUARD_AFFAIR_EVENT_PROBLEM_TYPES, ...RIVER_GUARD_PROBLEM_TYPES])),
    [],
  );

  const watchedProblemPreset = Form.useWatch('problemTypeSelect', editForm);

  /** 编辑时若台账区划不在韶山清单内，下拉追加一条「台账」项 */
  const affairAddvcdFormOptions = useMemo(
    () => shaoshanAddvcdSelectOptionsWithLegacy(editing?.addvcd),
    [editing?.addvcd],
  );

  const closeEdit = useCallback(() => {
    setEditOpen(false);
    setEditing(null);
    editForm.resetFields();
    setEditTab('basic');
  }, [editForm]);

  const filtered = useMemo(() => {
    const affairCode = String(query.affairCode ?? '').trim();
    const location = String(query.location ?? '').trim();
    const sectionId = String(query.sectionId ?? '').trim();
    const addvcdFilter = query.addvcd as string | undefined;
    const problemType = query.problemType as string | undefined;
    const handleStatus = query.handleStatus as string | undefined;
    const severity = query.severity as string | undefined;
    const t0 = query.discoverTimeStart as string | undefined;
    const t1 = query.discoverTimeEnd as string | undefined;
    return rows.filter(r => {
      if (t0 && dayjs(r.discoverTime).isBefore(dayjs(t0))) return false;
      if (t1 && dayjs(r.discoverTime).isAfter(dayjs(t1))) return false;
      if (addvcdFilter && r.addvcd !== addvcdFilter) return false;
      if (problemType && r.problemType !== problemType) return false;
      if (handleStatus && r.handleStatus !== handleStatus) return false;
      if (severity && r.severity !== severity) return false;
      if (affairCode && !String(r.affairCode ?? '').includes(affairCode)) return false;
      if (location && !String(r.location ?? '').includes(location)) return false;
      if (sectionId && !String(r.sectionId ?? '').includes(sectionId)) return false;
      return true;
    });
  }, [rows, query]);

  const allAffairCols: EcoColumnConfig[] = useMemo(
    () => [
      { key: 'affairCode', title: '事务编号', dataIndex: 'affairCode', width: 150, fixed: 'left' },
      { key: 'affairTitle', title: '事务名称', dataIndex: 'affairTitle', width: 200 },
      {
        key: 'initiateTime',
        title: '事务发起时间',
        dataIndex: 'initiateTime',
        width: 148,
        defaultVisible: false,
      },
      {
        key: 'initiateSubject',
        title: '发起主体',
        dataIndex: 'initiateSubject',
        width: 140,
        defaultVisible: false,
      },
      {
        key: 'assignOrg',
        title: '交办单位',
        dataIndex: 'assignOrg',
        width: 160,
        defaultVisible: false,
      },
      {
        key: 'undertakeOrg',
        title: '承办单位',
        dataIndex: 'undertakeOrg',
        width: 160,
        defaultVisible: false,
      },
      { key: 'handleStatus', title: '处理状态', dataIndex: 'handleStatus', width: 100 },
      {
        key: 'severity',
        title: '严重程度',
        dataIndex: 'severity',
        width: 88,
        render: (t: unknown) => <Tag color={AFFAIR_SEVERITY_COLOR[String(t)] ?? 'default'}>{String(t)}</Tag>,
        defaultVisible: false,
      },
      { key: 'responsibleOrg', title: '责任主体', dataIndex: 'responsibleOrg', width: 180 },
      { key: 'leaderName', title: '责任人', dataIndex: 'leaderName', width: 100, defaultVisible: false },
      { key: 'discoverTime', title: '发现时间', dataIndex: 'discoverTime', width: 148 },
      { key: 'reportTime', title: '上报时间', dataIndex: 'reportTime', width: 148, defaultVisible: false },
      { key: 'deadline', title: '要求完成', dataIndex: 'deadline', width: 110 },
      { key: 'finishDate', title: '办结日期', dataIndex: 'finishDate', width: 110, defaultVisible: false },
      { key: 'sectionId', title: '关联河段编码', dataIndex: 'sectionId', width: 200, defaultVisible: false },
      { key: 'problemType', title: '问题类型', dataIndex: 'problemType', width: 160, defaultVisible: true },
      { key: 'infoSource', title: '信息来源', dataIndex: 'infoSource', width: 120, defaultVisible: false },
      {
        key: 'addvcd',
        title: '所属区划',
        dataIndex: 'addvcd',
        width: 140,
        ellipsis: true,
        render: (_: unknown, r: RiverGuardAffairRow) =>
          r.addvcd ? getShaoshanAddvcdLabel(r.addvcd) : r.regionName || '—',
      },
      { key: 'location', title: '位置', dataIndex: 'location', width: 180, defaultVisible: false },
      { key: 'operation', title: '操作', width: 268, defaultVisible: true },
    ],
    [],
  );

  const [visibleAffairCols, setVisibleAffairCols] = useState(() => getEcoDefaultVisibleColumnKeys(allAffairCols));

  /** 打开编辑弹窗并填充当前行；`tab` 为 `disposal` 时直接进入「事务处置」便于快速填报 */
  const openAffairEdit = useCallback(
    (row: RiverGuardAffairRow, tab: 'basic' | 'disposal') => {
      setEditing(row);
      setEditTab(tab);
      const pt = resolveAffairProblemTypeForForm(row.problemType);
      const { problemType: _omitPt, initiateTime: _omitIt, initiateSubject: _omitIs, deadline: _omitDl, ...rowRest } = row;
      editForm.setFieldsValue({
        ...rowRest,
        problemTypeSelect: pt.select,
        problemTypeOther: pt.other,
        discoverTime: dayjs(row.discoverTime),
        reportTime: dayjs(row.reportTime),
        scenePhotos: Array.isArray(row.scenePhotos) ? row.scenePhotos : [],
        sceneVideos: row.sceneVideos?.length ? [...row.sceneVideos] : [],
        disposal: {
          ...(row.disposal ?? {
            disposalLeader: '',
            contactPhone: '',
            disposalDescribe: '',
            completedTime: '',
            images: [],
          }),
          completedTime: row.disposal?.completedTime ? dayjs(row.disposal.completedTime) : undefined,
          images: Array.isArray(row.disposal?.images) ? row.disposal!.images : [],
        },
      });
      setEditOpen(true);
    },
    [editForm],
  );

  const affairColumns = useMemo(
    () =>
      buildTableColumnsFromEcoConfig(allAffairCols, visibleAffairCols, record => {
        const row = record as RiverGuardAffairRow;
        const disposalFilled = hasRiverGuardAffairDisposalFilled(row);
        return (
          <Space size="small">
            <Button
              type="link"
              size="small"
              className="action-btn detail"
              icon={<EyeOutlined />}
              onClick={() => {
                setAffairDetailInitialTab('basic');
                setDetail(row);
                setDetailOpen(true);
              }}
            >
              详情
            </Button>
            <Button
              type="link"
              size="small"
              className="action-btn"
              icon={disposalFilled ? <FileTextOutlined /> : <FormOutlined />}
              onClick={() => {
                if (disposalFilled) {
                  setAffairDetailInitialTab('disposal');
                  setDetail(row);
                  setDetailOpen(true);
                } else {
                  openAffairEdit(row, 'disposal');
                }
              }}
            >
              {disposalFilled ? '填报信息' : '处置填报'}
            </Button>
            <Button
              type="link"
              size="small"
              className="action-btn edit"
              icon={<EditOutlined />}
              onClick={() => openAffairEdit(row, 'basic')}
            >
              编辑
            </Button>
          </Space>
        );
      }),
    [allAffairCols, visibleAffairCols, openAffairEdit],
  );

  const handleAffairSearch = () => {
    const v = filterForm.getFieldsValue() as {
      affairCode?: string;
      location?: string;
      sectionId?: string;
      addvcd?: string;
      problemType?: string;
      handleStatus?: string;
      severity?: string;
      discoverTimeRange?: [dayjs.Dayjs, dayjs.Dayjs] | null;
    };
    const range = v.discoverTimeRange;
    setQuery({
      affairCode: (v.affairCode ?? '').trim(),
      location: (v.location ?? '').trim(),
      sectionId: (v.sectionId ?? '').trim(),
      addvcd: v.addvcd,
      problemType: v.problemType,
      handleStatus: v.handleStatus,
      severity: v.severity,
      discoverTimeStart: range?.[0]?.format('YYYY-MM-DD HH:mm:ss'),
      discoverTimeEnd: range?.[1]?.format('YYYY-MM-DD HH:mm:ss'),
    });
    message.success('已查询');
  };

  const handleAffairReset = () => {
    filterForm.resetFields();
    setQuery({});
    message.info('已重置筛选条件');
  };

  const saveAffair = async () => {
    const v = await editForm.validateFields();
    const discoverTimeStr = (v.discoverTime as dayjs.Dayjs).format('YYYY-MM-DD HH:mm');
    const reportTimeStr = (v.reportTime as dayjs.Dayjs).format('YYYY-MM-DD HH:mm');
    const ed = (v.disposal ?? {}) as Record<string, unknown>;
    const ct = ed.completedTime;
    const completedTimeStr =
      ct != null && dayjs.isDayjs(ct)
        ? (ct as dayjs.Dayjs).format('YYYY-MM-DD HH:mm')
        : typeof ct === 'string'
          ? ct
          : '';
    const imgs = ed.images;
    const images: string[] = Array.isArray(imgs) ? imgs.filter((x): x is string => typeof x === 'string') : [];
    const initiateTimeStr = editing?.initiateTime ?? discoverTimeStr;
    const sp = v.scenePhotos;
    const scenePhotos: string[] = Array.isArray(sp) ? sp.filter((x): x is string => typeof x === 'string') : [];
    const svRaw = v.sceneVideos;
    const sceneVideos: string[] = Array.isArray(svRaw)
      ? svRaw.map(x => String(x ?? '').trim()).filter(Boolean)
      : [];
    const ptSel = String(v.problemTypeSelect ?? '');
    const ptOther = String(v.problemTypeOther ?? '').trim();
    const problemTypeResolved = ptSel === '其他' ? ptOther || '其他' : ptSel;
    const payload: RiverGuardAffairRow = {
      key: editing?.key ?? `aff-${Date.now()}`,
      affairCode: editing?.affairCode ?? genNextRiverGuardAffairCode(rows),
      affairTitle: v.affairTitle,
      initiateTime: initiateTimeStr,
      initiateSubject: editing?.initiateSubject ?? '',
      assignOrg: editing?.assignOrg ?? '',
      undertakeOrg: editing?.undertakeOrg ?? '',
      problemDescribe: String(v.problemDescribe ?? '').trim(),
      scenePhotos,
      sceneVideos,
      sectionId: String(v.sectionId ?? '').trim(),
      problemType: problemTypeResolved,
      infoSource: v.infoSource,
      discoverTime: discoverTimeStr,
      reportTime: reportTimeStr,
      // 表单已移除「要求完成时间」；编辑时保留原台账值，新增为空
      deadline: editing?.deadline ?? '',
      addvcd: String(v.addvcd ?? '').trim(),
      regionName: (() => {
        const code = String(v.addvcd ?? '').trim();
        return code ? getShaoshanAddvcdLabel(code) : '';
      })(),
      location: v.location,
      longitude: v.longitude,
      latitude: v.latitude,
      situationDescribe: editing?.situationDescribe ?? '',
      impactScope: v.impactScope,
      severity: v.severity,
      reporterName: v.reporterName,
      reporterPhone: v.reporterPhone,
      handleStatus: v.handleStatus,
      responsibleOrg: v.responsibleOrg,
      leaderName: v.leaderName,
      preemptDisposal: v.preemptDisposal,
      // 表单已移除「处置进展」；编辑时保留原台账值，新增为空
      disposalProgress: editing?.disposalProgress ?? '',
      measuresTaken: v.measuresTaken,
      handlingProcess: String(v.handlingProcess ?? '').trim(),
      coordParties: v.coordParties,
      disposalResult: v.disposalResult,
      feedbackComment: String(v.feedbackComment ?? '').trim(),
      // 表单已移除「办结日期」；编辑时保留原台账值，新增为空
      finishDate: editing?.finishDate ?? '',
      disposal: {
        disposalLeader: String(ed.disposalLeader ?? ''),
        contactPhone: String(ed.contactPhone ?? ''),
        // 表单已移除「处置说明」；编辑时写回原值
        disposalDescribe: String(
          (ed as { disposalDescribe?: string }).disposalDescribe ?? editing?.disposal?.disposalDescribe ?? '',
        ),
        completedTime: completedTimeStr,
        images,
      },
    };
    if (editing) {
      setRows(prev => prev.map(r => (r.key === editing.key ? payload : r)));
      message.success('已保存');
    } else {
      setRows(prev => [...prev, payload]);
      message.success('已新增');
    }
    closeEdit();
  };

  const deleteAffair = () => {
    if (!editing) return;
    setRows(prev => prev.filter(r => r.key !== editing.key));
    message.success('已删除');
    closeEdit();
  };

  const openAffairCreate = () => {
    setEditing(null);
    editForm.resetFields();
    setEditTab('basic');
    editForm.setFieldsValue({
      discoverTime: dayjs(),
      reportTime: dayjs(),
      severity: '一般',
      handleStatus: '待分派',
      preemptDisposal: '否',
      infoSource: '河长制信息系统',
      problemTypeSelect: RIVER_GUARD_AFFAIR_EVENT_PROBLEM_TYPES[0],
      problemTypeOther: '',
      problemDescribe: '',
      scenePhotos: [],
      sceneVideos: [],
      sectionId: '',
      addvcd: undefined,
      longitude: '',
      latitude: '',
      impactScope: '',
      reporterName: '',
      reporterPhone: '',
      leaderName: '',
      responsibleOrg: '',
      measuresTaken: '',
      handlingProcess: '',
      coordParties: '',
      disposalResult: '',
      feedbackComment: '',
      disposal: {
        disposalLeader: '',
        contactPhone: '',
        completedTime: undefined,
        images: [],
      },
    });
    setEditOpen(true);
  };

  return (
  <div className="facility-view">
      <Card
        title="事务列表"
        extra={
          <Space wrap size={[8, 8]} align="center">
            <EcoProtoExportBtn
              onClick={() =>
                exportEcoTableExcel(
                  filtered as unknown as Record<string, unknown>[],
                  allAffairCols as unknown as Array<{ key?: string; title?: unknown; dataIndex?: unknown }>,
                  '生态整治_事务列表',
                  '事务列表',
                )
              }
            />
            <EcoProtoImportBtn />
            <EcoColumnManager columns={allAffairCols} visibleColumns={visibleAffairCols} onChange={setVisibleAffairCols} />
            <Button type="primary" icon={<PlusOutlined />} className="add-btn" onClick={openAffairCreate}>
              新增
            </Button>
          </Space>
        }
      >
        <Form form={filterForm}>
          <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="addvcd" label="所属区划" style={{ marginBottom: 0 }}>
                <Select
                  allowClear
                  placeholder="所属区划"
                  showSearch
                  optionFilterProp="label"
                  style={{ width: '100%' }}
                  options={SHAOSHAN_ADDVCD_OPTIONS}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="problemType" style={{ marginBottom: 0 }}>
                <Select
                  allowClear
                  placeholder="问题类型"
                  showSearch
                  optionFilterProp="label"
                  style={{ width: '100%' }}
                  options={affairProblemTypeFilterOptions.map(x => ({ value: x, label: x }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="handleStatus" style={{ marginBottom: 0 }}>
                <Select
                  allowClear
                  placeholder="处理状态"
                  showSearch
                  optionFilterProp="label"
                  style={{ width: '100%' }}
                  options={[...RIVER_GUARD_HANDLE_STATUS].map(x => ({ value: x, label: x }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="severity" style={{ marginBottom: 0 }}>
                <Select
                  allowClear
                  placeholder="严重程度"
                  showSearch
                  optionFilterProp="label"
                  style={{ width: '100%' }}
                  options={[...RIVER_GUARD_SEVERITY].map(x => ({ value: x, label: x }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="location" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="位置描述" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="sectionId" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="关联河段编码" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={12} lg={8}>
              <Form.Item name="discoverTimeRange" style={{ marginBottom: 0 }}>
                <RangePicker showTime style={{ width: '100%' }} placeholder={['发现时间起', '发现时间止']} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={12} lg={4}>
              <Form.Item name="affairCode" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="事务编号" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={24} lg={4} style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Space>
                <Button type="primary" className="search-btn" icon={<SearchOutlined />} onClick={handleAffairSearch}>
                  查询
                </Button>
                <Button onClick={handleAffairReset}>重置</Button>
              </Space>
            </Col>
          </Row>
        </Form>
        <div className="facility-table-wrap">
          <Table
            rowKey="key"
            size="small"
            scroll={{
              x: getEcoTableScrollX(
                allAffairCols.filter(c => visibleAffairCols.includes(c.key) || c.key === 'operation'),
              ),
            }}
            pagination={{ defaultPageSize: 10, showTotal: t => `共 ${t} 条` }}
            columns={affairColumns.map(col => {
              if (col.key === 'handleStatus' && 'dataIndex' in col) {
                return {
                  ...col,
                  render: (t: unknown) => (
                    <Tag color={AFFAIR_HANDLE_STATUS_COLOR[String(t)] ?? 'default'}>{String(t)}</Tag>
                  ),
                };
              }
              return col;
            })}
            dataSource={filtered}
          />
      </div>
    </Card>

      <Modal
        title={`事务详情${detail ? ` — ${detail.affairCode}` : ''}`}
        open={detailOpen}
        onCancel={() => {
          setDetailOpen(false);
          setDetail(null);
          setAffairDetailInitialTab('basic');
        }}
        width={960}
        footer={null}
        destroyOnClose
        styles={affairDetailModalStyles}
      >
        {detail ? <RiverGuardAffairDetailPanels detail={detail} initialTab={affairDetailInitialTab} /> : null}
      </Modal>

      <Modal
        title={editing ? '编辑事务' : '新增事务'}
        open={editOpen}
        width={920}
        onCancel={closeEdit}
        destroyOnClose
        styles={formModalStyles}
        footer={
          <Space>
            {editing ?
              <Popconfirm title="确认删除该条事务？" onConfirm={deleteAffair}>
                <Button danger>删除</Button>
              </Popconfirm>
            : null}
            <Button className="secondary-btn" onClick={closeEdit}>
              取消
            </Button>
            <Button type="primary" onClick={() => void saveAffair()}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={editForm} layout="vertical" preserve={false}>
          <Tabs
            activeKey={editTab}
            onChange={setEditTab}
            size="small"
            className="facility-detail-tabs facility-affair-edit-tabs"
            items={[
              {
                key: 'basic',
                label: '基本信息',
                children: (
                  <Row gutter={[16, 0]}>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        label="事务编号"
                        extra={
                          <Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 4, fontSize: 12 }}>
                            保存时由系统自动生成（HB-SW-年-流水号）
                          </Paragraph>
                        }
                        style={{ marginBottom: 12 }}
                      >
                        <Input readOnly placeholder="保存后显示编号" value={editing?.affairCode ?? ''} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="affairTitle"
                        label="事务名称"
                        rules={[{ required: true, message: '请填写事务名称' }]}
                        style={{ marginBottom: 12 }}
                      >
                        <Input placeholder="问题/事件标题" />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item
                        name="sectionId"
                        label="关联责任段"
                        tooltip="选自责任段信息台账（SECTION_ID）；选中后自动带出责任段所属区划（名称展示，不写编码）"
                        style={{ marginBottom: 12 }}
                      >
                        <Select
                          allowClear
                          showSearch
                          placeholder="请选择责任段"
                          optionFilterProp="label"
                          options={sections.map(s => ({
                            value: s.sectionId,
                            label: `${s.sectionName}（${s.sectionId}）`,
                          }))}
                          onChange={(val: string | null) => {
                            const sec = val ? sections.find(s => s.sectionId === val) : undefined;
                            if (sec) {
                              editForm.setFieldsValue({ addvcd: sec.addvcd });
                            }
                          }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item
                        name="addvcd"
                        label="所属区划"
                        rules={[{ required: true, message: '请选择所属区划' }]}
                        style={{ marginBottom: 12 }}
                      >
                        <Select
                          allowClear
                          showSearch
                          placeholder="韶山市及下辖乡镇（街道）"
                          optionFilterProp="label"
                          options={affairAddvcdFormOptions}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="problemTypeSelect"
                        label="问题类型"
                        rules={[{ required: true, message: '请选择问题类型' }]}
                        style={{ marginBottom: 12 }}
                      >
                        <Select
                          options={[...RIVER_GUARD_AFFAIR_EVENT_PROBLEM_TYPES].map(x => ({ value: x, label: x }))}
                          onChange={(v: string) => {
                            if (v !== '其他') {
                              editForm.setFieldsValue({ problemTypeOther: '' });
                            }
                          }}
                        />
                      </Form.Item>
                    </Col>
                    {watchedProblemPreset === '其他' ?
                      <Col span={24}>
                        <Form.Item
                          name="problemTypeOther"
                          label="其他问题类型"
                          dependencies={['problemTypeSelect']}
                          rules={[
                            {
                              validator: async (_, val) => {
                                if (editForm.getFieldValue('problemTypeSelect') === '其他' && !String(val ?? '').trim()) {
                                  throw new Error('请填写具体问题类型');
                                }
                              },
                            },
                          ]}
                          style={{ marginBottom: 12 }}
                        >
                          <Input placeholder="请输入具体问题类型" />
                        </Form.Item>
                      </Col>
                    : null}
                    <Col xs={24} sm={12}>
                      <Form.Item name="infoSource" label="信息来源" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                        <Select options={[...RIVER_GUARD_INFO_SOURCES].map(x => ({ value: x, label: x }))} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="severity" label="严重程度" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                        <Select options={[...RIVER_GUARD_SEVERITY].map(x => ({ value: x, label: x }))} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="responsibleOrg" label="责任主体" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                        <Input placeholder="牵头及协同单位" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="leaderName" label="责任人" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item
                        name="location"
                        label="位置描述"
                        rules={[{ required: true, message: '请输入位置描述' }]}
                        style={{ marginBottom: 12 }}
                        extra={
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            可点击地图选点，系统将尝试按坐标逆地理解析并自动填入；也可随时在本框手动输入或修改地址描述。
                          </Text>
                        }
                      >
                        <Input placeholder="地图选点自动解析，或手动输入位置描述" />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item label="事务位置地图" colon={false} style={{ marginBottom: 12 }}>
                        <AffairMapLocationPicker form={editForm} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="longitude" label="经度（度）" tooltip="可与地图选点同步" style={{ marginBottom: 12 }}>
                        <Input placeholder="选填，地图选点后自动回填" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="latitude" label="纬度（度）" tooltip="可与地图选点同步" style={{ marginBottom: 12 }}>
                        <Input placeholder="选填，地图选点后自动回填" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="reporterName" label="上报人" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="reporterPhone" label="联系电话" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="discoverTime"
                        label="发现时间"
                        rules={[{ required: true, message: '请选择发现时间' }]}
                        style={{ marginBottom: 12 }}
                      >
                        <DatePicker showTime style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="reportTime"
                        label="上报时间"
                        rules={[{ required: true, message: '请选择上报时间' }]}
                        style={{ marginBottom: 12 }}
                      >
                        <DatePicker showTime style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item
                        name="problemDescribe"
                        label="问题描述"
                        rules={[{ required: true, message: '请填写问题描述' }]}
                        style={{ marginBottom: 12 }}
                      >
                        <TextArea rows={2} placeholder="问题概要" />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item
                        name="impactScope"
                        label="影响范围"
                        rules={[{ required: true }]}
                        style={{ marginBottom: 12 }}
                      >
                        <TextArea rows={2} placeholder="影响范围说明" />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item
                        name="scenePhotos"
                        label="现场照片"
                        style={{ marginBottom: 12 }}
                      >
                        <AffairScenePhotosUpload />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item
                        name="sceneVideos"
                        label="现场视频"
                        style={{ marginBottom: 12 }}
                      >
                        <AffairSceneVideosUpload />
                      </Form.Item>
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'disposal',
                label: '事务处置',
                children: (
                  <Row gutter={[16, 0]}>
                    <Col xs={24} sm={12}>
                      <Form.Item name="handleStatus" label="处理状态" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                        <Select options={[...RIVER_GUARD_HANDLE_STATUS].map(x => ({ value: x, label: x }))} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="preemptDisposal" label="是否先行处置" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                        <Select
                          options={[
                            { value: '是', label: '是' },
                            { value: '否', label: '否' },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name={['disposal', 'disposalLeader']}
                        label="处置负责人"
                        rules={[{ required: true, message: '请填写处置负责人' }]}
                        style={{ marginBottom: 12 }}
                      >
                        <Input placeholder="现场或牵头处置责任人姓名" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name={['disposal', 'contactPhone']}
                        label="处置联络电话"
                        rules={[{ required: true, message: '请填写联系电话' }]}
                        style={{ marginBottom: 12 }}
                      >
                        <Input placeholder="手机或办公电话" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name={['disposal', 'completedTime']} label="处置完成时间" style={{ marginBottom: 12 }}>
                        <DatePicker showTime style={{ width: '100%' }} placeholder="选填" />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="measuresTaken" label="处理措施" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                        <TextArea rows={3} placeholder="已采取或计划采取的措施" />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="handlingProcess" label="处理过程" style={{ marginBottom: 12 }}>
                        <TextArea rows={3} placeholder="处置步骤与时间线，选填" />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="coordParties" label="联动部门/单位" style={{ marginBottom: 12 }}>
                        <TextArea rows={2} placeholder="选填" />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="disposalResult" label="处理结果" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                        <TextArea rows={2} placeholder="整改结果或结论" />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="feedbackComment" label="反馈意见" style={{ marginBottom: 12 }}>
                        <TextArea rows={2} placeholder="上级、群众或平台回访意见，选填" />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name={['disposal', 'images']} label="处置现场图" style={{ marginBottom: 0 }}>
                        <AffairDisposalImagesUpload />
                      </Form.Item>
                    </Col>
                  </Row>
                ),
              },
            ]}
          />
        </Form>
      </Modal>
  </div>
);
};

/** 履职评分：各维度权重（四项之和为 100）；各维录入为百分制成绩 0–100，综合得分 = Σ(成绩÷100×权重) */
interface ChiefScoreWeights {
  patrol: number;
  task: number;
  rectify: number;
  water: number;
}

const DEFAULT_CHIEF_SCORE_WEIGHTS: ChiefScoreWeights = {
  patrol: 30,
  task: 25,
  rectify: 25,
  water: 20,
};

const CHIEF_SCORE_WEIGHTS_STORAGE_KEY = 'eco-chief-score-weights-v1';

function loadChiefScoreWeights(): ChiefScoreWeights {
  try {
    const raw = localStorage.getItem(CHIEF_SCORE_WEIGHTS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CHIEF_SCORE_WEIGHTS };
    const p = JSON.parse(raw) as Partial<ChiefScoreWeights>;
    if (
      typeof p.patrol === 'number' &&
      typeof p.task === 'number' &&
      typeof p.rectify === 'number' &&
      typeof p.water === 'number'
    ) {
      const sum = p.patrol + p.task + p.rectify + p.water;
      if (Math.abs(sum - 100) < 0.001) {
        return { patrol: p.patrol, task: p.task, rectify: p.rectify, water: p.water };
      }
    }
  } catch {
    /* 忽略本地存储异常 */
  }
  return { ...DEFAULT_CHIEF_SCORE_WEIGHTS };
}

function saveChiefScoreWeights(w: ChiefScoreWeights): void {
  try {
    localStorage.setItem(CHIEF_SCORE_WEIGHTS_STORAGE_KEY, JSON.stringify(w));
  } catch {
    /* 忽略 */
  }
}

function sumChiefScoreWeights(w: ChiefScoreWeights): number {
  return w.patrol + w.task + w.rectify + w.water;
}

/** 手工评价周期：月 / 季 / 年 */
type EvalPeriodType = 'month' | 'quarter' | 'year';

/** 河长履职手工评价记录（按周期建档；各维 patrolRaw 等为百分制成绩 0–100） */
interface ManualChiefEvaluation {
  key: string;
  periodType: EvalPeriodType;
  /** 月 YYYY-MM；季 YYYY-Q1～Q4；年 YYYY */
  periodKey: string;
  chiefName: string;
  /** 各维百分制成绩 0–100 */
  patrolRaw: number;
  taskRaw: number;
  rectifyRaw: number;
  waterRaw: number;
  /** 各维成绩备注（选填） */
  patrolRemark?: string;
  taskRemark?: string;
  rectifyRemark?: string;
  waterRemark?: string;
  /** @deprecated 旧版总备注；仅当无分项备注时用于巡河行兼容展示 */
  remark?: string;
  createdAt: string;
}

const MANUAL_EVAL_STORAGE_KEY = 'eco-manual-chief-evaluations-v1';

/** 读取本地存储；无键为 null，有键则返回数组（可为空） */
function readManualEvaluationsFromStorage(): ManualChiefEvaluation[] | null {
  try {
    const raw = localStorage.getItem(MANUAL_EVAL_STORAGE_KEY);
    if (raw === null) return null;
    const arr = JSON.parse(raw) as ManualChiefEvaluation[];
    if (Array.isArray(arr)) return arr;
  } catch {
    /* 忽略 */
  }
  return null;
}

function saveManualEvaluationsToStorage(rows: ManualChiefEvaluation[]): void {
  try {
    localStorage.setItem(MANUAL_EVAL_STORAGE_KEY, JSON.stringify(rows));
  } catch {
    /* 忽略 */
  }
}

function formatEvalPeriodLabel(periodType: EvalPeriodType, periodKey: string): string {
  if (periodType === 'month') {
    const [y, mo] = periodKey.split('-');
    return `${y}年${Number(mo)}月`;
  }
  if (periodType === 'year') return `${periodKey}年`;
  const m = /^(\d{4})-Q([1-4])$/.exec(periodKey);
  return m ? `${m[1]}年第${m[2]}季度` : periodKey;
}

/** 由当前选择的日历锚点生成 periodKey */
function getEvalPeriodKeyFromAnchor(periodType: EvalPeriodType, anchor: dayjs.Dayjs): string {
  if (periodType === 'month') return anchor.format('YYYY-MM');
  if (periodType === 'year') return anchor.format('YYYY');
  const q = Math.floor(anchor.month() / 3) + 1;
  return `${anchor.format('YYYY')}-Q${q}`;
}

/** 上一/下一评价周期 periodKey（与台账月/季/年编码一致，供纵向对比） */
function getAdjacentEvalPeriodKey(periodType: EvalPeriodType, periodKey: string, delta: number): string {
  if (periodType === 'month') {
    return dayjs(`${periodKey}-01`).add(delta, 'month').format('YYYY-MM');
  }
  if (periodType === 'year') {
    return String(Number(periodKey) + delta);
  }
  const m = /^(\d{4})-Q([1-4])$/.exec(periodKey);
  if (!m) return periodKey;
  let y = Number(m[1]);
  let q = Number(m[2]) + delta;
  while (q < 1) {
    q += 4;
    y -= 1;
  }
  while (q > 4) {
    q -= 4;
    y += 1;
  }
  return `${y}-Q${q}`;
}

/** 首次进入且无本地数据时的演示列表 */
function getManualEvaluationsSeedData(): ManualChiefEvaluation[] {
  const anchor = dayjs();
  const monthKey = anchor.format('YYYY-MM');
  const prevMonthKey = anchor.subtract(1, 'month').format('YYYY-MM');
  const quarterKey = getEvalPeriodKeyFromAnchor('quarter', anchor);
  const yearKey = anchor.format('YYYY');
  const t = anchor.toISOString();
  return [
    {
      key: 'me-seed-m1',
      periodType: 'month',
      periodKey: monthKey,
      chiefName: '陈国华',
      patrolRaw: 88,
      taskRaw: 85,
      rectifyRaw: 82,
      waterRaw: 80,
      patrolRemark: '演示：巡河频次与覆盖达标',
      taskRemark: '演示：专项任务按期推进',
      rectifyRemark: '演示：问题闭环及时',
      waterRemark: '演示：断面水质稳定',
      createdAt: t,
    },
    {
      key: 'me-seed-m2',
      periodType: 'month',
      periodKey: prevMonthKey,
      chiefName: '李秀英',
      patrolRaw: 82,
      taskRaw: 78,
      rectifyRaw: 85,
      waterRaw: 76,
      patrolRemark: '演示：镇级河长巡河记录完整',
      taskRemark: '演示：清溪片区任务完成良好',
      rectifyRemark: '演示：交办件整改率较高',
      waterRemark: '演示：小微水体巡查加强',
      createdAt: t,
    },
    {
      key: 'me-seed-q1',
      periodType: 'quarter',
      periodKey: quarterKey,
      chiefName: '王强',
      patrolRaw: 86,
      taskRaw: 88,
      rectifyRaw: 84,
      waterRaw: 81,
      patrolRemark: '演示：季度巡河达标',
      taskRemark: '演示：银田镇任务亮点',
      rectifyRemark: '演示：隐患整改到位',
      waterRemark: '演示：水质监测配合好',
      createdAt: t,
    },
    {
      key: 'me-seed-y1',
      periodType: 'year',
      periodKey: yearKey,
      chiefName: '赵敏',
      patrolRaw: 80,
      taskRaw: 82,
      rectifyRaw: 78,
      waterRaw: 74,
      patrolRemark: '演示：村居河长履职常态',
      taskRemark: '演示：年度任务基本完成',
      rectifyRemark: '演示：整改效率尚可提升',
      waterRemark: '演示：农业面源需持续关注',
      createdAt: t,
    },
    {
      key: 'me-seed-y2',
      periodType: 'year',
      periodKey: yearKey,
      chiefName: '林峰',
      patrolRaw: 90,
      taskRaw: 87,
      rectifyRaw: 86,
      waterRaw: 84,
      patrolRemark: '演示：联系部门协调有力',
      taskRemark: '演示：跨部门任务衔接顺',
      rectifyRemark: '演示：督办事项闭环快',
      waterRemark: '演示：联合监测数据支撑足',
      createdAt: t,
    },
  ];
}

/** 主入口初始状态：有存储用存储，否则用演示数据 */
function loadManualEvaluationsInitial(): ManualChiefEvaluation[] {
  const stored = readManualEvaluationsFromStorage();
  if (stored !== null) return stored;
  return getManualEvaluationsSeedData();
}

/** 综合得分：各维为百分制 0–100，按权重加权合成（满分 100） */
function computeManualEvalTotal(
  r: Pick<ManualChiefEvaluation, 'patrolRaw' | 'taskRaw' | 'rectifyRaw' | 'waterRaw'>,
  w: ChiefScoreWeights,
): number {
  const t =
    (r.patrolRaw / 100) * w.patrol +
    (r.taskRaw / 100) * w.task +
    (r.rectifyRaw / 100) * w.rectify +
    (r.waterRaw / 100) * w.water;
  return Math.round(t * 10) / 10;
}

/** 履职评分：单条河长维度分解（详情与雷达图用） */
interface ChiefPerformanceScoreRow {
  key: string;
  chiefName: string;
  levelLabel: string;
  areaName: string;
  /** 加权后的百分制综合分0–100 */
  total: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'E';
  /** 各维百分制成绩 0–100 */
  patrolDim: number;
  taskDim: number;
  rectifyDim: number;
  waterDim: number;
  /** 各维对综合分的加权贡献（(成绩/100)×权重） */
  patrolWeighted: number;
  taskWeighted: number;
  rectifyWeighted: number;
  waterWeighted: number;
  patrolNote: string;
  taskNote: string;
  rectifyNote: string;
  waterNote: string;
}

/** 表头问号：综合得分说明 */
const ChiefScoreTotalHelpContent = () => (
  <div style={{ maxWidth: 400 }}>
    <Paragraph style={{ marginBottom: 8 }}>
      <strong>综合得分</strong>为<strong>百分制（0–100）</strong>：四个评价维度各自按<strong>百分制</strong>录入成绩（每项0–100），再按「评价体系配置」中的<strong>权重</strong>加权合成。
    </Paragraph>
    <Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 13 }}>
      计算公式：综合得分 =（巡河成绩÷100）× 巡河权重 +（任务成绩÷100）× 任务权重 +（整改成绩÷100）× 整改权重 +（水质成绩÷100）×
      水质权重。四项权重之和须为 100。
    </Paragraph>
  </div>
);

/** 表头问号：履职等级说明 */
const ChiefScoreGradeHelpContent = () => (
  <div style={{ maxWidth: 380 }}>
    <Paragraph style={{ marginBottom: 8 }}>
      <strong>履职等级</strong>依据<strong>综合得分</strong>划档（百分制）：
    </Paragraph>
    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
      <li>A（优秀）：≥ 90</li>
      <li>B（良好）：≥ 80</li>
      <li>C（合格）：≥ 70</li>
      <li>D（待改进）：≥ 60</li>
      <li>E（警示）：&lt; 60</li>
    </ul>
    <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
      正式系统可按考核办法改为排名比例或分段函数；本页为原型示意。
    </Paragraph>
  </div>
);

/** 详情：四维雷达图（各轴为该项百分制成绩 0–100） */
const ChiefScoreRadarChart: React.FC<{ row: ChiefPerformanceScoreRow }> = ({ row }) => {
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!elRef.current) return;
    const chart = echarts.init(elRef.current);
    const values = [
      Math.min(100, Math.max(0, row.patrolDim)),
      Math.min(100, Math.max(0, row.taskDim)),
      Math.min(100, Math.max(0, row.rectifyDim)),
      Math.min(100, Math.max(0, row.waterDim)),
    ];
    chart.setOption({
      color: ['#1e5bb5'],
      tooltip: { trigger: 'item' },
      radar: {
        indicator: [
          { name: '巡河完成', max: 100 },
          { name: '任务落实', max: 100 },
          { name: '问题整改', max: 100 },
          { name: '水质改善', max: 100 },
        ],
        center: ['50%', '53%'],
        radius: '58%',
        splitNumber: 4,
        axisName: { color: 'rgba(0,0,0,.55)', fontSize: 12 },
        splitArea: { areaStyle: { color: ['rgba(30,91,181,0.05)', 'rgba(30,91,181,0.02)'] } },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: values,
              name: '百分制成绩',
              areaStyle: { opacity: 0.15 },
              lineStyle: { width: 2 },
            },
          ],
        },
      ],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(elRef.current);
    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [row]);

  return (
    <div style={{ marginBottom: 16 }}>
      <div ref={elRef} style={{ height: 300, width: '100%' }} />
    </div>
  );
};

const SCORE_GRADE_TAG: Record<ChiefPerformanceScoreRow['grade'], { color: string; label: string }> = {
  A: { color: 'success', label: 'A优秀' },
  B: { color: 'processing', label: 'B 良好' },
  C: { color: 'default', label: 'C 合格' },
  D: { color: 'warning', label: 'D 待改进' },
  E: { color: 'error', label: 'E 警示' },
};

function totalToGrade(total: number): ChiefPerformanceScoreRow['grade'] {
  if (total >= 90) return 'A';
  if (total >= 80) return 'B';
  if (total >= 70) return 'C';
  if (total >= 60) return 'D';
  return 'E';
}

/** 与「河长责任区域」台账按 chiefName 关联，取责任区域名称（多条用顿号拼接） */
function getChiefLinkedAreaNamesFromAreas(chiefName: string, chiefAreas: ChiefAreaRow[]): string {
  const names = chiefAreas.filter(a => a.chiefName === chiefName).map(a => a.responsibilityAreaName);
  return names.length ? names.join('、') : '';
}

function getChiefLevelDisplayNameForEval(name: string, contacts: RiverChiefContactRow[]): string {
  const c = contacts.find(x => x.name === name && x.roleCategory === 'chief');
  if (c?.userType != null) return USER_TYPE_LABEL[c.userType] ?? '—';
  const ut = getPatrolChiefUserType(name, contacts);
  return ut != null ? USER_TYPE_LABEL[ut] ?? '—' : '—';
}

/** 分项备注展示：有则「备注：」前缀；无则统一占位 */
function formatScoreDimRemark(specific?: string): string {
  const s = specific?.trim();
  return s ? `备注：${s}` : '无分项备注';
}

function manualEvalToScoreRow(
  m: ManualChiefEvaluation,
  w: ChiefScoreWeights,
  chiefAreas: ChiefAreaRow[],
  contacts: RiverChiefContactRow[],
): ChiefPerformanceScoreRow {
  const patrolWeighted = Math.round(((m.patrolRaw / 100) * w.patrol) * 10) / 10;
  const taskWeighted = Math.round(((m.taskRaw / 100) * w.task) * 10) / 10;
  const rectifyWeighted = Math.round(((m.rectifyRaw / 100) * w.rectify) * 10) / 10;
  const waterWeighted = Math.round(((m.waterRaw / 100) * w.water) * 10) / 10;
  const total = Math.round((patrolWeighted + taskWeighted + rectifyWeighted + waterWeighted) * 10) / 10;
  const linked = getChiefLinkedAreaNamesFromAreas(m.chiefName, chiefAreas);
  const areaFromContact = contacts.find(x => x.name === m.chiefName)?.areaName;
  // 旧数据仅含 remark、无分项备注时：只挂在巡河行
  const hasAnyDimRemark =
    !!(m.patrolRemark?.trim() || m.taskRemark?.trim() || m.rectifyRemark?.trim() || m.waterRemark?.trim());
  const legacyOnlyRemark = !hasAnyDimRemark && m.remark?.trim();
  const patrolNote = m.patrolRemark?.trim() ?
    formatScoreDimRemark(m.patrolRemark)
  : legacyOnlyRemark ?
    `备注：${m.remark!.trim()}（历史总备注）`
  : formatScoreDimRemark(undefined);
  return {
    key: m.key,
    chiefName: m.chiefName,
    levelLabel: getChiefLevelDisplayNameForEval(m.chiefName, contacts),
    areaName: linked || areaFromContact || '—',
    total,
    grade: totalToGrade(total),
    patrolDim: m.patrolRaw,
    taskDim: m.taskRaw,
    rectifyDim: m.rectifyRaw,
    waterDim: m.waterRaw,
    patrolWeighted,
    taskWeighted,
    rectifyWeighted,
    waterWeighted,
    patrolNote,
    taskNote: formatScoreDimRemark(m.taskRemark),
    rectifyNote: formatScoreDimRemark(m.rectifyRemark),
    waterNote: formatScoreDimRemark(m.waterRemark),
  };
}

/** 履职等级分布柱状图 */
const ScoreStatGradeBarChart: React.FC<{ counts: Record<ChiefPerformanceScoreRow['grade'], number> }> = ({
  counts,
}) => {
  const elRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!elRef.current) return;
    const chart = echarts.init(elRef.current);
    const grades: ChiefPerformanceScoreRow['grade'][] = ['A', 'B', 'C', 'D', 'E'];
    chart.setOption({
      color: ['#1e5bb5'],
      tooltip: { trigger: 'axis' },
      grid: { left: 48, right: 24, top: 32, bottom: 32 },
      xAxis: {
        type: 'category',
        data: grades.map(g => SCORE_GRADE_TAG[g].label),
        axisLabel: { fontSize: 11 },
      },
      yAxis: { type: 'value', name: '人数', minInterval: 1 },
      series: [{ type: 'bar', data: grades.map(g => counts[g]), barMaxWidth: 48 }],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(elRef.current);
    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [counts]);
  return <div ref={elRef} style={{ height: 280, width: '100%' }} />;
};

/** 各级河长平均综合分（横向对比） */
const ScoreStatLevelAvgChart: React.FC<{
  rows: { label: string; avg: number; n: number }[];
}> = ({ rows }) => {
  const elRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!elRef.current) return;
    const chart = echarts.init(elRef.current);
    chart.setOption({
      color: ['#10B981'],
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const arr = params as { name: string; value: number; dataIndex: number }[];
          const p = arr[0];
          if (!p) return '';
          const r = rows[p.dataIndex];
          return `${p.name}<br/>平均分：${p.value}（n=${r?.n ?? '—'}）`;
        },
      },
      grid: { left: 120, right: 24, top: 32, bottom: 48 },
      xAxis: { type: 'value', max: 100, name: '平均综合分' },
      yAxis: {
        type: 'category',
        data: rows.map(r => r.label),
        axisLabel: { fontSize: 11 },
      },
      series: [{ type: 'bar', data: rows.map(r => r.avg), barMaxWidth: 28 }],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(elRef.current);
    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [rows]);
  return <div ref={elRef} style={{ height: Math.max(220, rows.length * 44), width: '100%' }} />;
};

/** 样本整体四维百分制均值雷达（与单条详情雷达口径一致） */
const ScoreStatDimAvgRadar: React.FC<{ dims: [number, number, number, number] }> = ({ dims }) => {
  const elRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!elRef.current) return;
    const chart = echarts.init(elRef.current);
    chart.setOption({
      color: ['#7c3aed'],
      tooltip: { trigger: 'item' },
      radar: {
        indicator: [
          { name: '巡河完成', max: 100 },
          { name: '任务落实', max: 100 },
          { name: '问题整改', max: 100 },
          { name: '水质改善', max: 100 },
        ],
        center: ['50%', '53%'],
        radius: '58%',
        splitNumber: 4,
        axisName: { color: 'rgba(0,0,0,.55)', fontSize: 12 },
        splitArea: { areaStyle: { color: ['rgba(124,58,237,0.06)', 'rgba(124,58,237,0.02)'] } },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: dims.map(d => Math.min(100, Math.max(0, d))),
              name: '样本均值',
              areaStyle: { opacity: 0.12 },
              lineStyle: { width: 2 },
            },
          ],
        },
      ],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(elRef.current);
    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [dims]);
  return (
    <div>
      <div ref={elRef} style={{ height: 300, width: '100%' }} />
    </div>
  );
};

/**
 * 履职综合评分统计：等级分布、分级均值、排名与横纵向对比（数据来自「履职综合评分」台账；权重每次渲染自本地配置读取，与台账页一致）
 */
const ScoreStatistics: React.FC<{
  chiefAreas: ChiefAreaRow[];
  manualEvaluations: ManualChiefEvaluation[];
  contacts: RiverChiefContactRow[];
}> = ({ chiefAreas, manualEvaluations, contacts }) => {
  const scoreStatPdfRef = useRef<HTMLDivElement | null>(null);
  const scoreWeights = loadChiefScoreWeights();
  const [scopeMode, setScopeMode] = useState<'single' | 'all'>('single');
  const [evalPeriodType, setEvalPeriodType] = useState<EvalPeriodType>('month');
  const [evalPeriodAnchor, setEvalPeriodAnchor] = useState<dayjs.Dayjs>(() => dayjs());
  const [chiefLevel, setChiefLevel] = useState<number | null>(null);
  const [areaKey, setAreaKey] = useState<string>('all');
  const [comparePrev, setComparePrev] = useState(false);

  const currentPeriodKey = useMemo(
    () => getEvalPeriodKeyFromAnchor(evalPeriodType, evalPeriodAnchor),
    [evalPeriodType, evalPeriodAnchor],
  );

  const userTypeOptions = useMemo(
    () =>
      Object.entries(USER_TYPE_LABEL).map(([k, label]) => ({
        value: Number(k),
        label,
      })),
    [],
  );

  const filteredEvals = useMemo(() => {
    return manualEvaluations.filter(m => {
      if (scopeMode === 'single') {
        if (m.periodType !== evalPeriodType || m.periodKey !== currentPeriodKey) return false;
      }
      if (chiefLevel != null && getPatrolChiefUserType(m.chiefName, contacts) !== chiefLevel) return false;
      if (areaKey !== 'all') {
        const area = chiefAreas.find(a => a.key === areaKey);
        if (!area || area.chiefName !== m.chiefName) return false;
      }
      return true;
    });
  }, [manualEvaluations, scopeMode, evalPeriodType, currentPeriodKey, chiefLevel, areaKey, chiefAreas, contacts]);

  const scoreRows = useMemo(
    () => filteredEvals.map(m => manualEvalToScoreRow(m, scoreWeights, chiefAreas, contacts)),
    [filteredEvals, scoreWeights, chiefAreas, contacts],
  );

  const prevPeriodKey =
    scopeMode === 'single' ? getAdjacentEvalPeriodKey(evalPeriodType, currentPeriodKey, -1) : null;

  const prevTotalByChief = useMemo(() => {
    const map = new Map<string, number>();
    if (!comparePrev || scopeMode !== 'single' || !prevPeriodKey) return map;
    manualEvaluations
      .filter(m => m.periodType === evalPeriodType && m.periodKey === prevPeriodKey)
      .forEach(m => {
        map.set(m.chiefName, computeManualEvalTotal(m, scoreWeights));
      });
    return map;
  }, [comparePrev, scopeMode, prevPeriodKey, manualEvaluations, evalPeriodType, scoreWeights]);

  const gradeCounts = useMemo(() => {
    const c: Record<ChiefPerformanceScoreRow['grade'], number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    scoreRows.forEach(r => {
      c[r.grade] += 1;
    });
    return c;
  }, [scoreRows]);

  const summary = useMemo(() => {
    const n = scoreRows.length;
    if (!n) {
      return { n: 0, avgTotal: 0, abRate: 0, max: 0, min: 0 };
    }
    let sum = 0;
    let ab = 0;
    let max = scoreRows[0].total;
    let min = scoreRows[0].total;
    scoreRows.forEach(r => {
      sum += r.total;
      if (r.grade === 'A' || r.grade === 'B') ab += 1;
      max = Math.max(max, r.total);
      min = Math.min(min, r.total);
    });
    return {
      n,
      avgTotal: Math.round((sum / n) * 10) / 10,
      abRate: Math.round((ab / n) * 1000) / 10,
      max,
      min,
    };
  }, [scoreRows]);

  const dimAvg = useMemo((): [number, number, number, number] => {
    const n = scoreRows.length;
    if (!n) return [0, 0, 0, 0];
    let a = 0;
    let b = 0;
    let c = 0;
    let d = 0;
    scoreRows.forEach(r => {
      a += r.patrolDim;
      b += r.taskDim;
      c += r.rectifyDim;
      d += r.waterDim;
    });
    const f = (x: number) => Math.round((x / n) * 10) / 10;
    return [f(a), f(b), f(c), f(d)];
  }, [scoreRows]);

  const levelAvgRows = useMemo(() => {
    const map = new Map<number, { sum: number; n: number }>();
    const unknown: { sum: number; n: number } = { sum: 0, n: 0 };
    scoreRows.forEach(row => {
      const ut = getPatrolChiefUserType(row.chiefName, contacts);
      if (ut == null) {
        unknown.sum += row.total;
        unknown.n += 1;
        return;
      }
      const cur = map.get(ut) ?? { sum: 0, n: 0 };
      cur.sum += row.total;
      cur.n += 1;
      map.set(ut, cur);
    });
    const ordered = [...Object.keys(USER_TYPE_LABEL).map(Number)].sort((x, y) => x - y);
    const out: { label: string; avg: number; n: number }[] = [];
    ordered.forEach(ut => {
      const v = map.get(ut);
      if (!v || !v.n) return;
      out.push({
        label: USER_TYPE_LABEL[ut] ?? `类型${ut}`,
        avg: Math.round((v.sum / v.n) * 10) / 10,
        n: v.n,
      });
    });
    if (unknown.n > 0) {
      out.push({
        label: '未匹配级别',
        avg: Math.round((unknown.sum / unknown.n) * 10) / 10,
        n: unknown.n,
      });
    }
    return out;
  }, [scoreRows, contacts]);

  const rankRows = useMemo(() => {
    const sorted = [...scoreRows].sort((a, b) => b.total - a.total);
    return sorted.map((row, i) => {
      const prevT = prevTotalByChief.get(row.chiefName);
      return {
        key: row.key,
        rank: i + 1,
        chiefName: row.chiefName,
        levelLabel: row.levelLabel,
        areaName: row.areaName,
        total: row.total,
        grade: row.grade,
        prevTotal: prevT,
        delta: prevT != null ? Math.round((row.total - prevT) * 10) / 10 : null,
      };
    });
  }, [scoreRows, prevTotalByChief]);

  const levelSummaryColumns: ColumnsType<(typeof levelAvgRows)[number]> = [
    { title: '河长级别', dataIndex: 'label', width: 140 },
    { title: '样本数', dataIndex: 'n', width: 88, align: 'right' },
    {
      title: '平均综合分',
      dataIndex: 'avg',
      width: 120,
      align: 'right',
      render: (v: number) => <Text strong>{v}</Text>,
    },
  ];

  const rankColumns = useMemo((): ColumnsType<(typeof rankRows)[number]> => {
    const base: ColumnsType<(typeof rankRows)[number]> = [
      { title: '排名', dataIndex: 'rank', width: 64, align: 'center', fixed: 'left' },
      { title: '河长姓名', dataIndex: 'chiefName', width: 100, fixed: 'left' },
      { title: '河长级别', dataIndex: 'levelLabel', width: 120 },
      { title: '责任区域', dataIndex: 'areaName', ellipsis: true },
      {
        title: '综合得分',
        dataIndex: 'total',
        width: 100,
        align: 'right',
        render: (v: number) => <Text strong style={{ color: '#1e5bb5' }}>{v}</Text>,
      },
      {
        title: '等级',
        dataIndex: 'grade',
        width: 96,
        render: (g: ChiefPerformanceScoreRow['grade']) => (
          <Tag color={SCORE_GRADE_TAG[g].color}>{SCORE_GRADE_TAG[g].label}</Tag>
        ),
      },
    ];
    if (comparePrev && scopeMode === 'single' && prevPeriodKey) {
      base.push(
        {
          title: `上期（${formatEvalPeriodLabel(evalPeriodType, prevPeriodKey)}）`,
          dataIndex: 'prevTotal',
          width: 120,
          align: 'right',
          render: (v: number | undefined) => (v != null ? v : '—'),
        },
        {
          title: '环比增减',
          dataIndex: 'delta',
          width: 100,
          align: 'right',
          render: (v: number | null) =>
            v == null ?
              '—'
            : <Text type={v >= 0 ? 'success' : 'danger'}>{v >= 0 ? `+${v}` : v}</Text>,
        },
      );
    }
    return base;
  }, [comparePrev, scopeMode, prevPeriodKey, evalPeriodType]);

  const handleScoreStatExportPdf = async () => {
    if (!filteredEvals.length) {
      message.warning('当前筛选条件下无内容可导出');
      return;
    }
    const el = scoreStatPdfRef.current;
    if (!el) {
      message.error('导出区域未就绪');
      return;
    }
    const hide = message.loading('正在生成 PDF…', 0);
    try {
      await downloadElementAsPdf(el, '生态整治_履职综合评分统计');
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
        title="履职综合评分统计"
        extra={<EcoStatPdfExportBtn onClick={() => void handleScoreStatExportPdf()} />}
      >
        <div ref={scoreStatPdfRef} className="facility-stat-pdf-capture-root">
        <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} lg={18}>
            <Space wrap size="middle" align="center">
              <span>统计范围：</span>
              <Radio.Group
                value={scopeMode}
                onChange={e => {
                  setScopeMode(e.target.value);
                  if (e.target.value === 'all') setComparePrev(false);
                }}
                buttonStyle="solid"
              >
                <Radio.Button value="single">按评价周期</Radio.Button>
                <Radio.Button value="all">全量台账</Radio.Button>
              </Radio.Group>
              {scopeMode === 'single' ?
                <>
                  <Radio.Group
                    value={evalPeriodType}
                    onChange={e => {
                      setEvalPeriodType(e.target.value);
                      setEvalPeriodAnchor(dayjs());
                    }}
                  >
                    <Radio.Button value="month">月度</Radio.Button>
                    <Radio.Button value="quarter">季度</Radio.Button>
                    <Radio.Button value="year">年度</Radio.Button>
                  </Radio.Group>
                  <DatePicker
                    picker={
                      evalPeriodType === 'month' ? 'month'
                      : evalPeriodType === 'quarter' ? 'quarter'
                      : 'year'
                    }
                    value={evalPeriodAnchor}
                    onChange={d => d && setEvalPeriodAnchor(d)}
                    allowClear={false}
                    style={{ minWidth: 160 }}
                  />
                  <Text strong>{formatEvalPeriodLabel(evalPeriodType, currentPeriodKey)}</Text>
                  <Tooltip title="与上一月度/季度/年度同一河长记录对比综合分（无上期记录显示为 —）">
                    <Space>
                      <span>纵向对比</span>
                      <Switch checked={comparePrev} onChange={setComparePrev} />
                    </Space>
                  </Tooltip>
                </>
              : null}
            </Space>
          </Col>
        </Row>

        <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8}>
            <Text type="secondary">河长级别：</Text>
            <Select
              allowClear
              placeholder="全部级别"
              style={{ width: '100%', maxWidth: 280, marginTop: 8 }}
              value={chiefLevel ?? undefined}
              onChange={v => setChiefLevel(v ?? null)}
              options={userTypeOptions}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Text type="secondary">责任区域：</Text>
            <Select
              style={{ width: '100%', maxWidth: 320, marginTop: 8 }}
              value={areaKey}
              onChange={setAreaKey}
              options={[
                { value: 'all', label: '全部责任区域' },
                ...chiefAreas.map(a => ({
                  value: a.key,
                  label: `${a.responsibilityAreaName}（${a.chiefName}）`,
                })),
              ]}
            />
          </Col>
          <Col xs={24} sm={24} md={8} style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Button
              className="search-btn"
              type="primary"
              icon={<SearchOutlined />}
              onClick={() => message.success('已按当前条件刷新统计（原型）')}
            >
              查询
            </Button>
          </Col>
        </Row>

        <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="样本量（条）"
                value={summary.n}
                valueStyle={{ color: '#1e5bb5' }}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="平均综合分"
                value={summary.avgTotal}
                suffix="/100"
                valueStyle={{ color: '#1e5bb5' }}
                prefix={<CalculatorOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="优良占比（A+B）"
                value={summary.n ? summary.abRate : 0}
                suffix="%"
                valueStyle={{ color: '#10B981' }}
                prefix={<TrophyOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
                       <Card size="small">
              <Statistic title="最高 / 最低" value={summary.n ? `${summary.max} / ${summary.min}` : '—'} />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} lg={12}>
            <Card size="small" title="履职等级分布">
              {summary.n ?
                <ScoreStatGradeBarChart counts={gradeCounts} />
              : <Empty description="无样本" />}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card size="small" title="各级河长平均综合分（横向对比）">
              {levelAvgRows.length ?
                <ScoreStatLevelAvgChart rows={levelAvgRows} />
              : <Empty description="无分级样本" />}
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} lg={12}>
            <Card size="small" title="四维成绩样本均值">
              {summary.n ?
                <ScoreStatDimAvgRadar dims={dimAvg} />
              : <Empty description="无样本" />}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card size="small" title="按河长级别汇总（表）">
              <Table
                size="small"
                pagination={false}
                columns={levelSummaryColumns}
                dataSource={levelAvgRows.map((r, i) => ({ ...r, key: `lv-${i}` }))}
                locale={{ emptyText: '无分级样本' }}
              />
            </Card>
          </Col>
        </Row>

        <Card size="small" title="河长履职评分排名">
          <Table
            size="small"
            rowKey="key"
            scroll={{ x: comparePrev && scopeMode === 'single' ? 1100 : 900 }}
            pagination={{ defaultPageSize: 10, showTotal: n => `共 ${n} 人` }}
            columns={rankColumns}
            dataSource={rankRows}
            locale={{ emptyText: '当前条件下暂无评价记录' }}
          />
        </Card>

        <Divider />
        <Space align="start" wrap>
          <Popover content={<ChiefScoreGradeHelpContent />} title="履职等级划档">
            <Button type="link" size="small" icon={<QuestionCircleOutlined />}>
              等级说明
            </Button>
          </Popover>
        </Space>
        </div>
      </Card>
    </div>
  );
};

/** 履职综合评分：考核手工录入（各维百分制）+ 权重合成综合分、雷达详情（原型） */
const ScoreManage: React.FC<{
  chiefAreas: ChiefAreaRow[];
  manualEvaluations: ManualChiefEvaluation[];
  onManualEvaluationsChange: (rows: ManualChiefEvaluation[]) => void;
  contacts: RiverChiefContactRow[];
}> = ({ chiefAreas, manualEvaluations, onManualEvaluationsChange, contacts }) => {
  const [evalPeriodType, setEvalPeriodType] = useState<EvalPeriodType>('month');
  const [evalPeriodAnchor, setEvalPeriodAnchor] = useState<dayjs.Dayjs>(() => dayjs());
  /** 河长查询：下拉当前值 / 已应用条件（点「查询」后生效） */
  const [chiefQueryDraft, setChiefQueryDraft] = useState<string>('');
  const [chiefQueryApplied, setChiefQueryApplied] = useState<string>('');
  const [detailRow, setDetailRow] = useState<ChiefPerformanceScoreRow | null>(null);
  const [detailPeriodLabel, setDetailPeriodLabel] = useState<string | null>(null);
  const [scoreWeights, setScoreWeights] = useState<ChiefScoreWeights>(() => loadChiefScoreWeights());
  const [weightModalOpen, setWeightModalOpen] = useState(false);
  const [weightDraft, setWeightDraft] = useState<ChiefScoreWeights>(() => loadChiefScoreWeights());
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [editingManual, setEditingManual] = useState<ManualChiefEvaluation | null>(null);
  const [manualForm] = Form.useForm<{
    evalPeriodType?: EvalPeriodType;
    evalPeriodAnchor?: dayjs.Dayjs;
    chiefName: string;
    patrolRaw: number;
    taskRaw: number;
    rectifyRaw: number;
    waterRaw: number;
    patrolRemark?: string;
    taskRemark?: string;
    rectifyRemark?: string;
    waterRemark?: string;
  }>();

  const openWeightModal = () => {
    setWeightDraft({ ...scoreWeights });
    setWeightModalOpen(true);
  };

  const applyWeights = () => {
    const sum = sumChiefScoreWeights(weightDraft);
    if (Math.abs(sum - 100) > 0.001) {
      message.warning(`四项权重之和须为 100，当前为 ${sum.toFixed(1)}`);
      return;
    }
    if (weightDraft.patrol < 0 || weightDraft.task < 0 || weightDraft.rectify < 0 || weightDraft.water < 0) {
      message.warning('权重不能为负数');
      return;
    }
    setScoreWeights({ ...weightDraft });
    saveChiefScoreWeights(weightDraft);
    setWeightModalOpen(false);
    message.success('评价体系配置已保存（并写入浏览器本地，原型）');
  };

  const currentPeriodKey = useMemo(
    () => getEvalPeriodKeyFromAnchor(evalPeriodType, evalPeriodAnchor),
    [evalPeriodType, evalPeriodAnchor],
  );

  // 切换周期后清空河长查询，避免沿用上一周期的筛选条件
  useEffect(() => {
    setChiefQueryDraft('');
    setChiefQueryApplied('');
  }, [evalPeriodType, currentPeriodKey]);

  const chiefNameOptions = useMemo(() => getChiefNamesFromContacts(contacts), [contacts]);

  const manualRowsFiltered = useMemo(() => {
    return manualEvaluations.filter(m => {
      if (m.periodType !== evalPeriodType || m.periodKey !== currentPeriodKey) return false;
      if (chiefQueryApplied && m.chiefName !== chiefQueryApplied) return false;
      return true;
    });
  }, [manualEvaluations, evalPeriodType, currentPeriodKey, chiefQueryApplied]);

  const runScoreChiefQuery = () => {
    setChiefQueryApplied(chiefQueryDraft);
    const cnt = manualEvaluations.filter(m => {
      if (m.periodType !== evalPeriodType || m.periodKey !== currentPeriodKey) return false;
      if (chiefQueryDraft && m.chiefName !== chiefQueryDraft) return false;
      return true;
    }).length;
    message.success(`共 ${cnt} 条`);
  };

  const openDetailManual = useCallback(
    (m: ManualChiefEvaluation) => {
      setDetailPeriodLabel(formatEvalPeriodLabel(m.periodType, m.periodKey));
      setDetailRow(manualEvalToScoreRow(m, scoreWeights, chiefAreas, contacts));
    },
    [chiefAreas, scoreWeights, contacts],
  );

  const closeDetail = () => {
    setDetailRow(null);
    setDetailPeriodLabel(null);
  };

  /** 详情弹窗内数据为打开时的快照；编辑保存后须从 manualEvaluations 回写，否则会一直显示旧值 */
  const detailOpenKey = detailRow?.key ?? null;
  useEffect(() => {
    if (detailOpenKey == null) return;
    const m = manualEvaluations.find(x => x.key === detailOpenKey);
    if (!m) {
      setDetailRow(null);
      setDetailPeriodLabel(null);
      return;
    }
    setDetailPeriodLabel(formatEvalPeriodLabel(m.periodType, m.periodKey));
    setDetailRow(manualEvalToScoreRow(m, scoreWeights, chiefAreas, contacts));
  }, [manualEvaluations, scoreWeights, chiefAreas, contacts, detailOpenKey]);

  const openManualModalAdd = useCallback(() => {
    setEditingManual(null);
    manualForm.resetFields();
    manualForm.setFieldsValue({
      evalPeriodType,
      evalPeriodAnchor,
      chiefName: undefined,
      patrolRaw: 0,
      taskRaw: 0,
      rectifyRaw: 0,
      waterRaw: 0,
      patrolRemark: undefined,
      taskRemark: undefined,
      rectifyRemark: undefined,
      waterRemark: undefined,
    });
    setManualModalOpen(true);
  }, [manualForm, evalPeriodType, evalPeriodAnchor]);

  const openManualModalEdit = useCallback(
    (m: ManualChiefEvaluation) => {
      setEditingManual(m);
      const legacyOnlyRemark =
        !!(m.remark?.trim()) &&
        !m.patrolRemark?.trim() &&
        !m.taskRemark?.trim() &&
        !m.rectifyRemark?.trim() &&
        !m.waterRemark?.trim();
      manualForm.setFieldsValue({
        chiefName: m.chiefName,
        patrolRaw: m.patrolRaw,
        taskRaw: m.taskRaw,
        rectifyRaw: m.rectifyRaw,
        waterRaw: m.waterRaw,
        patrolRemark: m.patrolRemark?.trim() ? m.patrolRemark : legacyOnlyRemark ? m.remark : undefined,
        taskRemark: m.taskRemark,
        rectifyRemark: m.rectifyRemark,
        waterRemark: m.waterRemark,
      });
      setManualModalOpen(true);
    },
    [manualForm],
  );

  const submitManualEval = () => {
    const fieldNames: (keyof {
      evalPeriodType: EvalPeriodType;
      evalPeriodAnchor: dayjs.Dayjs;
      chiefName: string;
      patrolRaw: number;
      taskRaw: number;
      rectifyRaw: number;
      waterRaw: number;
      patrolRemark?: string;
      taskRemark?: string;
      rectifyRemark?: string;
      waterRemark?: string;
    })[] = editingManual ?
      [
        'chiefName',
        'patrolRaw',
        'taskRaw',
        'rectifyRaw',
        'waterRaw',
        'patrolRemark',
        'taskRemark',
        'rectifyRemark',
        'waterRemark',
      ]
    : [
        'evalPeriodType',
        'evalPeriodAnchor',
        'chiefName',
        'patrolRaw',
        'taskRaw',
        'rectifyRaw',
        'waterRaw',
        'patrolRemark',
        'taskRemark',
        'rectifyRemark',
        'waterRemark',
      ];

    return manualForm.validateFields(fieldNames).then(values => {
      const periodType = editingManual ? editingManual.periodType : values.evalPeriodType!;
      const periodKey =
        editingManual ? editingManual.periodKey : getEvalPeriodKeyFromAnchor(values.evalPeriodType!, values.evalPeriodAnchor!);
      const dup = manualEvaluations.some(
        x =>
          x.periodType === periodType &&
          x.periodKey === periodKey &&
          x.chiefName === values.chiefName &&
          x.key !== editingManual?.key,
      );
      if (dup) {
        message.warning('该评价周期内已存在该河长的记录，请编辑原记录或更换河长');
        return Promise.reject();
      }
      const trimNote = (s?: string) => (s?.trim() ? s.trim() : undefined);
      const patrolRemark = trimNote(values.patrolRemark);
      const taskRemark = trimNote(values.taskRemark);
      const rectifyRemark = trimNote(values.rectifyRemark);
      const waterRemark = trimNote(values.waterRemark);
      if (editingManual) {
        const next = manualEvaluations.map(x =>
          x.key === editingManual.key ?
            {
              ...x,
              chiefName: values.chiefName,
              patrolRaw: values.patrolRaw,
              taskRaw: values.taskRaw,
              rectifyRaw: values.rectifyRaw,
              waterRaw: values.waterRaw,
              patrolRemark,
              taskRemark,
              rectifyRemark,
              waterRemark,
              remark: undefined,
            }
          : x,
        );
        onManualEvaluationsChange(next);
        message.success('已保存');
      } else {
        const row: ManualChiefEvaluation = {
          key: `me-${Date.now()}`,
          periodType,
          periodKey,
          chiefName: values.chiefName,
          patrolRaw: values.patrolRaw,
          taskRaw: values.taskRaw,
          rectifyRaw: values.rectifyRaw,
          waterRaw: values.waterRaw,
          patrolRemark,
          taskRemark,
          rectifyRemark,
          waterRemark,
          createdAt: new Date().toISOString(),
        };
        onManualEvaluationsChange([...manualEvaluations, row]);
        message.success('已新增');
      }
      setManualModalOpen(false);
      setEditingManual(null);
    });
  };

  const manualTableColumns: ColumnsType<ManualChiefEvaluation> = useMemo(
    () => [
      { title: '河长姓名', dataIndex: 'chiefName', width: 100, fixed: 'left' },
      {
        title: '河长级别',
        width: 112,
        render: (_, m) => getChiefLevelDisplayNameForEval(m.chiefName, contacts),
      },
      {
        title: '责任区域',
        width: 160,
        ellipsis: true,
        render: (_, m) =>
          getChiefLinkedAreaNamesFromAreas(m.chiefName, chiefAreas) ||
          contacts.find(x => x.name === m.chiefName)?.areaName ||
          '—',
      },
      { title: '巡河(100)', dataIndex: 'patrolRaw', width: 88, align: 'right' },
      { title: '任务(100)', dataIndex: 'taskRaw', width: 88, align: 'right' },
      { title: '整改(100)', dataIndex: 'rectifyRaw', width: 88, align: 'right' },
      { title: '水质(100)', dataIndex: 'waterRaw', width: 88, align: 'right' },
      {
        title: (
          <Space size={4}>
            <span>综合得分</span>
            <Popover content={<ChiefScoreTotalHelpContent />} title="综合得分说明" trigger="click">
              <QuestionCircleOutlined style={{ color: '#1890ff', cursor: 'pointer' }} onClick={e => e.stopPropagation()} />
            </Popover>
          </Space>
        ),
        width: 104,
        align: 'right',
        render: (_, m) => {
          const t = computeManualEvalTotal(m, scoreWeights);
          return <Text strong style={{ color: '#1e5bb5' }}>{t}</Text>;
        },
      },
      {
        title: (
          <Space size={4}>
            <span>履职等级</span>
            <Popover content={<ChiefScoreGradeHelpContent />} title="履职等级说明" trigger="click">
              <QuestionCircleOutlined style={{ color: '#1890ff', cursor: 'pointer' }} onClick={e => e.stopPropagation()} />
            </Popover>
          </Space>
        ),
        width: 112,
        render: (_, m) => {
          const t = computeManualEvalTotal(m, scoreWeights);
          const g = totalToGrade(t);
          const meta = SCORE_GRADE_TAG[g];
          return <Tag color={meta.color}>{meta.label}</Tag>;
        },
      },
      {
        title: '操作',
        key: 'op',
        width: 200,
        fixed: 'right',
        render: (_, m) => (
          <Space size={0} wrap>
            <Button type="link" size="small" className="action-btn detail" icon={<EyeOutlined />} onClick={() => openDetailManual(m)}>
              详情
            </Button>
            <Button type="link" size="small" className="action-btn edit" icon={<EditOutlined />} onClick={() => openManualModalEdit(m)}>
              编辑
            </Button>
          </Space>
        ),
      },
    ],
    [chiefAreas, contacts, openDetailManual, openManualModalEdit, scoreWeights],
  );

  return (
    <div className="facility-view">
      <Card
        title="履职综合评分"
        extra={
          <Space wrap size={[8, 8]}>
            <Button icon={<SettingOutlined />} onClick={openWeightModal}>
              评价体系配置
            </Button>
            <EcoProtoExportBtn
              onClick={() =>
                exportEcoTableExcel(
                  manualRowsFiltered as unknown as Record<string, unknown>[],
                  manualTableColumns as unknown as Array<{ key?: string; title?: unknown; dataIndex?: unknown }>,
                  '生态整治_履职评分',
                  '履职评分',
                )
              }
            />
          </Space>
        }
      >
        <Paragraph type="secondary" style={{ marginBottom: 12 }}>
          考核评价均为<strong>手工新增</strong>：四维成绩均为<strong>百分制0–100</strong>；<strong>综合得分</strong>按「评价体系配置」中的
          <strong>权重</strong>加权计算（默认权重 30/25/25/20，之和为 100），公式见表头问号。列表上方可按周期、河长筛选；数据保存在本机浏览器（原型）。
        </Paragraph>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 12,
            rowGap: 12,
            marginBottom: 16,
          }}
        >
          <Space wrap align="center" size={[8, 8]}>
            <Text type="secondary">评价周期：</Text>
            <Radio.Group
              value={evalPeriodType}
              onChange={e => {
                setEvalPeriodType(e.target.value);
                setEvalPeriodAnchor(dayjs());
              }}
            >
              <Radio.Button value="month">月度</Radio.Button>
              <Radio.Button value="quarter">季度</Radio.Button>
              <Radio.Button value="year">年度</Radio.Button>
            </Radio.Group>
            <DatePicker
              picker={evalPeriodType === 'month' ? 'month' : evalPeriodType === 'quarter' ? 'quarter' : 'year'}
              value={evalPeriodAnchor}
              onChange={d => d && setEvalPeriodAnchor(d)}
              allowClear={false}
              style={{ minWidth: 160 }}
            />
            <Text strong>{formatEvalPeriodLabel(evalPeriodType, currentPeriodKey)}</Text>
          </Space>
          <Select
            allowClear
            placeholder="河长"
            style={{ width: 200, maxWidth: '100%' }}
            value={chiefQueryDraft || undefined}
            onChange={v => setChiefQueryDraft(v ?? '')}
            showSearch
            optionFilterProp="label"
            options={chiefNameOptions.map(n => ({ label: n, value: n }))}
          />
          <Space wrap size={8}>
            <Button type="primary" className="search-btn" icon={<SearchOutlined />} onClick={runScoreChiefQuery}>
              查询
            </Button>
            <Button
              onClick={() => {
                setChiefQueryDraft('');
                setChiefQueryApplied('');
                message.info('已重置河长条件');
              }}
            >
              重置
            </Button>
          </Space>
          <div style={{ marginLeft: 'auto' }}>
            <Button type="primary" icon={<PlusOutlined />} className="add-btn" onClick={openManualModalAdd}>
              新增
            </Button>
          </div>
        </div>
        <div className="facility-table-wrap">
          <Table<ManualChiefEvaluation>
            rowKey="key"
            size="small"
            scroll={{ x: 1200 }}
            pagination={{ defaultPageSize: 10, showTotal: n => `共 ${n} 条` }}
            columns={manualTableColumns}
            dataSource={manualRowsFiltered}
            locale={{ emptyText: '当前周期暂无评价记录，请点击「新增」' }}
          />
      </div>
    </Card>

      <Modal
        title={
          detailRow && detailPeriodLabel ?
            `履职评价 · ${detailPeriodLabel} · ${detailRow.chiefName}`
          : detailRow ?
            `履职评价 · ${detailRow.chiefName}`
          : '履职评价详情'
        }
        open={!!detailRow}
        onCancel={closeDetail}
        footer={null}
        width={760}
        destroyOnClose
        styles={{
          ...formModalStyles,
          body: { ...formModalStyles.body, maxHeight: 'none', overflowY: 'visible' as const },
        }}
      >
        {detailRow ? (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="综合得分">
                <Space>
                  <Text strong style={{ fontSize: 18, color: '#1e5bb5' }}>
                    {detailRow.total}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    （权重 {scoreWeights.patrol}/{scoreWeights.task}/{scoreWeights.rectify}/{scoreWeights.water}）
                  </Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="履职等级">
                <Tag color={SCORE_GRADE_TAG[detailRow.grade].color}>{SCORE_GRADE_TAG[detailRow.grade].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="河长级别">{detailRow.levelLabel}</Descriptions.Item>
              <Descriptions.Item label="责任区域">{detailRow.areaName}</Descriptions.Item>
            </Descriptions>
            <ChiefScoreRadarChart row={detailRow} />
            <Divider plain>维度成绩、加权贡献与说明</Divider>
            <List
              size="small"
              dataSource={[
                {
                  title: '巡河完成情况',
                  raw: detailRow.patrolDim,
                  contrib: detailRow.patrolWeighted,
                  wt: scoreWeights.patrol,
                  desc: detailRow.patrolNote,
                },
                {
                  title: '任务落实成效',
                  raw: detailRow.taskDim,
                  contrib: detailRow.taskWeighted,
                  wt: scoreWeights.task,
                  desc: detailRow.taskNote,
                },
                {
                  title: '问题整改效率',
                  raw: detailRow.rectifyDim,
                  contrib: detailRow.rectifyWeighted,
                  wt: scoreWeights.rectify,
                  desc: detailRow.rectifyNote,
                },
                {
                  title: '河湖水质改善',
                  raw: detailRow.waterDim,
                  contrib: detailRow.waterWeighted,
                  wt: scoreWeights.water,
                  desc: detailRow.waterNote,
                },
              ]}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <Space wrap>
                        <Text strong>{item.title}</Text>
                        <Tag>百分制 {item.raw}/100</Tag>
                        <Tag color="blue">
                          加权 {item.contrib}（权重 {item.wt}）
                        </Tag>
                      </Space>
                    }
                    description={item.desc}
                  />
                </List.Item>
              )}
            />
          </>
        ) : null}
      </Modal>

      <Modal
        title={editingManual ? '编辑评价' : '新增'}
        open={manualModalOpen}
        onCancel={() => {
          setManualModalOpen(false);
          setEditingManual(null);
        }}
        onOk={submitManualEval}
        width={640}
        destroyOnClose
        styles={formModalStyles}
      >
        {editingManual ?
          <div style={{ marginBottom: 12 }}>
            <Text type="secondary">评价周期：</Text>
            <Text strong>{formatEvalPeriodLabel(editingManual.periodType, editingManual.periodKey)}</Text>
  </div>
        : null}
        <Form form={manualForm} layout="vertical" preserve={false}>
          {!editingManual ?
            <>
              <Form.Item
                name="evalPeriodType"
                label="评价周期类型"
                rules={[{ required: true, message: '请选择周期类型' }]}
              >
                <Radio.Group
                  onChange={() => {
                    manualForm.setFieldValue('evalPeriodAnchor', dayjs());
                  }}
                >
                  <Radio.Button value="month">月度</Radio.Button>
                  <Radio.Button value="quarter">季度</Radio.Button>
                  <Radio.Button value="year">年度</Radio.Button>
                </Radio.Group>
              </Form.Item>
              <Form.Item noStyle shouldUpdate={(prev, cur) => prev.evalPeriodType !== cur.evalPeriodType}>
                {() => {
                  const pt = (manualForm.getFieldValue('evalPeriodType') ?? 'month') as EvalPeriodType;
                  return (
                    <Form.Item
                      name="evalPeriodAnchor"
                      label="评价时间"
                      rules={[{ required: true, message: '请选择评价周期' }]}
                    >
                      <DatePicker
                        picker={pt === 'month' ? 'month' : pt === 'quarter' ? 'quarter' : 'year'}
                        style={{ width: '100%' }}
                        allowClear={false}
                        placeholder={pt === 'month' ? '选择月份' : pt === 'quarter' ? '选择季度' : '选择年份'}
                      />
                    </Form.Item>
                  );
                }}
              </Form.Item>
            </>
          : null}
          <Form.Item name="chiefName" label="河长" rules={[{ required: true, message: '请选择河长' }]}>
            <Select placeholder="请从河长通讯录中选择" showSearch optionFilterProp="children">
              {getChiefNameSelectOptions(contacts, editingManual?.chiefName).map(n => (
                <Option key={n} value={n}>
                  {n}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="patrolRaw"
                label="巡河完成情况（百分制 0–100）"
                rules={[{ required: true, message: '请输入成绩' }]}
              >
                <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="0–100" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="taskRaw"
                label="任务落实成效（百分制 0–100）"
                rules={[{ required: true, message: '请输入成绩' }]}
              >
                <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="0–100" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="rectifyRaw"
                label="问题整改效率（百分制 0–100）"
                rules={[{ required: true, message: '请输入成绩' }]}
              >
                <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="0–100" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="waterRaw"
                label="河湖水质改善（百分制 0–100）"
                rules={[{ required: true, message: '请输入成绩' }]}
              >
                <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="0–100" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="patrolRemark" label="巡河成绩备注">
            <TextArea rows={2} maxLength={500} showCount placeholder="选填：该维考核说明、佐证索引等" />
          </Form.Item>
          <Form.Item name="taskRemark" label="任务成绩备注">
            <TextArea rows={2} maxLength={500} showCount placeholder="选填" />
          </Form.Item>
          <Form.Item name="rectifyRemark" label="整改成绩备注">
            <TextArea rows={2} maxLength={500} showCount placeholder="选填" />
          </Form.Item>
          <Form.Item name="waterRemark" label="水质成绩备注">
            <TextArea rows={2} maxLength={500} showCount placeholder="选填" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="评价体系配置 · 维度权重"
        open={weightModalOpen}
        onCancel={() => setWeightModalOpen(false)}
        width={480}
        destroyOnClose
        styles={formModalStyles}
        footer={
          <Space>
            <Button
              onClick={() => {
                setWeightDraft({ ...DEFAULT_CHIEF_SCORE_WEIGHTS });
                message.info('已填入默认权重');
              }}
            >
              恢复默认
            </Button>
            <Button onClick={() => setWeightModalOpen(false)}>取消</Button>
            <Button type="primary" onClick={applyWeights}>
              保存并应用
            </Button>
          </Space>
        }
      >
        <Paragraph type="secondary" style={{ marginBottom: 12 }}>
          设置四个评价维度的<strong>权重</strong>（非负），<strong>四项之和须等于 100</strong>。录入时各维填写<strong>百分制成绩 0–100</strong>；综合得分按权重加权合成（见表头问号）。保存后写入本机浏览器。
        </Paragraph>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text>巡河完成情况 · 权重</Text>
            <InputNumber
              min={0}
              max={100}
              style={{ width: '100%', marginTop: 8 }}
              value={weightDraft.patrol}
              onChange={v => setWeightDraft(d => ({ ...d, patrol: Number(v) || 0 }))}
              addonAfter="分"
            />
          </div>
          <div>
            <Text>任务落实成效 · 权重</Text>
            <InputNumber
              min={0}
              max={100}
              style={{ width: '100%', marginTop: 8 }}
              value={weightDraft.task}
              onChange={v => setWeightDraft(d => ({ ...d, task: Number(v) || 0 }))}
              addonAfter="分"
            />
          </div>
          <div>
            <Text>问题整改效率 · 权重</Text>
            <InputNumber
              min={0}
              max={100}
              style={{ width: '100%', marginTop: 8 }}
              value={weightDraft.rectify}
              onChange={v => setWeightDraft(d => ({ ...d, rectify: Number(v) || 0 }))}
              addonAfter="分"
            />
          </div>
          <div>
            <Text>河湖水质改善 · 权重</Text>
            <InputNumber
              min={0}
              max={100}
              style={{ width: '100%', marginTop: 8 }}
              value={weightDraft.water}
              onChange={v => setWeightDraft(d => ({ ...d, water: Number(v) || 0 }))}
              addonAfter="分"
            />
          </div>
          <div style={{ padding: '10px 12px', background: '#fafafa', borderRadius: 4 }}>
            <Text strong>当前合计：{sumChiefScoreWeights(weightDraft).toFixed(1)}</Text>
            {Math.abs(sumChiefScoreWeights(weightDraft) - 100) > 0.001 ?
              <Text type="danger" style={{ marginLeft: 8 }}>
                需调整为 100
              </Text>
            : null}
          </div>
        </Space>
      </Modal>
    </div>
  );
};

/** 通讯录查询条件（河长级别 / 责任区域 / 部门类型 / 所属区划 / 姓名 / 用户编号 / 手机 / 单位） */
interface RiverChiefContactQuery {
  chiefLevel?: number;
  areaName?: string;
  deptType?: string;
  /** 所属区划：按展示名称或台账编码子串匹配 */
  addvcdKw: string;
  name: string;
  userId: string;
  mobile: string;
  orgName: string;
}

function filterRiverChiefContacts(
  rows: RiverChiefContactRow[],
  q: RiverChiefContactQuery
): RiverChiefContactRow[] {
  return rows.filter(row => {
    if (q.chiefLevel != null) {
      if (row.roleCategory !== 'chief' || row.userType !== q.chiefLevel) return false;
    }
    if (q.areaName && row.areaName !== q.areaName) return false;
    if (q.deptType && row.deptType !== q.deptType) return false;
    const ad = q.addvcdKw.trim();
    if (ad) {
      const label = (row.addvcd ?? '').trim() ? getShaoshanAddvcdLabel(row.addvcd) : '';
      const hit = label.includes(ad) || (row.addvcd ?? '').includes(ad);
      if (!hit) return false;
    }
    if (q.name && !row.name.includes(q.name)) return false;
    if (q.userId && !(row.userId ?? '').includes(q.userId)) return false;
    if (q.mobile && !(row.mobile ?? '').includes(q.mobile)) return false;
    if (q.orgName && !(row.orgName ?? '').includes(q.orgName)) return false;
    return true;
  });
}

const CONTACT_ROLE_TAG_COLOR: Record<ContactRoleCategory, string> = {
  chief: 'blue',
  custodian: 'green',
  department: 'orange',
};

/** 河长通讯录：列表 + 筛选 + 字段管理 + 新增/编辑（弹窗）+ 详情 */
const RiverChiefContactsPage: React.FC<{
  contacts: RiverChiefContactRow[];
  onContactsChange: React.Dispatch<React.SetStateAction<RiverChiefContactRow[]>>;
}> = ({ contacts, onContactsChange }) => {
  const [filterForm] = Form.useForm();
  const [editForm] = Form.useForm<RiverChiefContactRow>();
  const [query, setQuery] = useState<RiverChiefContactQuery>({
    addvcdKw: '',
    name: '',
    userId: '',
    mobile: '',
    orgName: '',
  });
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detail, setDetail] = useState<RiverChiefContactRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<RiverChiefContactRow | null>(null);

  const filtered = useMemo(() => filterRiverChiefContacts(contacts, query), [contacts, query]);

  const editRoleCategory = Form.useWatch('roleCategory', editForm);
  useEffect(() => {
    if (editRoleCategory && editRoleCategory !== 'chief') {
      editForm.setFieldValue('userType', null);
    }
  }, [editRoleCategory, editForm]);

  const chiefLevelOptions = useMemo(
    () => Object.entries(USER_TYPE_LABEL).map(([k, label]) => ({ label, value: Number(k) })),
    []
  );

  const handleSearch = () => {
    const v = filterForm.getFieldsValue() as {
      chiefLevel?: number;
      areaName?: string;
      deptType?: string;
      addvcdKw?: string;
      name?: string;
      userId?: string;
      mobile?: string;
      orgName?: string;
    };
    const next: RiverChiefContactQuery = {
      chiefLevel: v.chiefLevel,
      areaName: v.areaName || undefined,
      deptType: v.deptType || undefined,
      addvcdKw: (v.addvcdKw || '').trim(),
      name: (v.name || '').trim(),
      userId: (v.userId || '').trim(),
      mobile: (v.mobile || '').trim(),
      orgName: (v.orgName || '').trim(),
    };
    const list = filterRiverChiefContacts(contacts, next);
    setQuery(next);
    message.success(`已查询，共 ${list.length} 条`);
  };

  const handleReset = () => {
    filterForm.resetFields();
    setQuery({ addvcdKw: '', name: '', userId: '', mobile: '', orgName: '' });
    message.info('已重置筛选条件');
  };

  const openAdd = () => {
    setEditing(null);
    editForm.resetFields();
    editForm.setFieldsValue({
      userId: '',
      name: '',
      roleCategory: 'chief',
      userType: 7,
      areaName: '清溪镇',
      deptType: '河湖长办',
      orgName: '',
      title: '',
      mobile: '',
      tel: '',
      officeAddr: '',
      addvcd: '430382100000',
      sectionId: '',
      email: '',
      remarks: '',
    } as RiverChiefContactRow);
    setEditOpen(true);
  };

  const openEdit = (row: RiverChiefContactRow) => {
    setEditing(row);
    editForm.setFieldsValue({ ...row });
    setEditOpen(true);
  };

  const handleSaveContact = async () => {
    const v = await editForm.validateFields();
    const role = v.roleCategory as ContactRoleCategory;
    const userType = role === 'chief' ? (v.userType ?? null) : null;
    if (role === 'chief' && (userType == null || Number.isNaN(Number(userType)))) {
      message.warning('河长人员请选择河长级别');
      return;
    }
    const payload: RiverChiefContactRow = {
      id: editing?.id ?? `c-${Date.now()}`,
      userId: String(v.userId ?? '').trim(),
      name: String(v.name).trim(),
      roleCategory: role,
      userType,
      areaName: String(v.areaName),
      deptType: String(v.deptType),
      orgName: String(v.orgName).trim(),
      title: String(v.title).trim(),
      mobile: String(v.mobile).trim(),
      tel: String(v.tel ?? '').trim() || '—',
      officeAddr: v.officeAddr?.trim() || undefined,
      addvcd: String(v.addvcd ?? '').trim() || undefined,
      sectionId: v.sectionId?.trim() || undefined,
      email: v.email?.trim() || undefined,
      remarks: v.remarks?.trim() || undefined,
    };
    if (editing) {
      onContactsChange(prev => prev.map(c => (c.id === editing.id ? payload : c)));
      message.success('已保存通讯录');
    } else {
      onContactsChange(prev => [...prev, payload]);
      message.success('已新增通讯录');
    }
    setEditOpen(false);
    setEditing(null);
    editForm.resetFields();
  };

  const handleDeleteContact = () => {
    if (!editing) return;
    onContactsChange(prev => prev.filter(c => c.id !== editing.id));
    message.success('已删除该条通讯录');
    setEditOpen(false);
    setEditing(null);
    editForm.resetFields();
  };

  const allContactColumns: EcoColumnConfig[] = useMemo(
    () => [
      {
        key: 'name',
        title: '姓名',
        dataIndex: 'name',
        width: 100,
        fixed: 'left',
        render: (name: string) => <Text strong>{name}</Text>,
      },
      {
        key: 'userId',
        title: '用户编号',
        dataIndex: 'userId',
        width: 168,
        defaultVisible: true,
        render: (uid: string | undefined) => uid || '—',
      },
      {
        key: 'roleCategory',
        title: '人员类型',
        dataIndex: 'roleCategory',
        width: 120,
        render: (cat: ContactRoleCategory) => (
          <Tag color={CONTACT_ROLE_TAG_COLOR[cat]}>{CONTACT_ROLE_LABEL[cat]}</Tag>
        ),
      },
      {
        key: 'chiefLevel',
        title: '河长级别',
        width: 140,
        render: (_: unknown, row: RiverChiefContactRow) =>
          row.userType != null ? <Text>{USER_TYPE_LABEL[row.userType] ?? '—'}</Text> : <Text type="secondary">—</Text>,
      },
      { key: 'areaName', title: '责任区域', dataIndex: 'areaName', width: 160 },
      { key: 'deptType', title: '部门类型', dataIndex: 'deptType', width: 120 },
      { key: 'orgName', title: '单位', dataIndex: 'orgName', width: 200 },
      { key: 'title', title: '职务', dataIndex: 'title', width: 140 },
      {
        key: 'mobile',
        title: '手机',
        dataIndex: 'mobile',
        width: 148,
        render: (mobile: string) => (
          <Text copyable={{ text: mobile, tooltips: ['点击复制手机号', '已复制'] }}>{mobile}</Text>
        ),
      },
      {
        key: 'addvcd',
        title: '所属区划',
        dataIndex: 'addvcd',
        width: 132,
        defaultVisible: true,
        render: (a: string | undefined) => (a ? getShaoshanAddvcdLabel(a) : '—'),
      },
      { key: 'tel', title: '固话', dataIndex: 'tel', width: 132 },
      {
        key: 'sectionId',
        title: '关联河段',
        dataIndex: 'sectionId',
        width: 200,
        defaultVisible: false,
        render: (s: string | undefined) => s || '—',
      },
      {
        key: 'email',
        title: '电子邮箱',
        dataIndex: 'email',
        width: 180,
        defaultVisible: false,
        render: (e: string | undefined) => e || '—',
      },
      {
        key: 'remarks',
        title: '备注',
        dataIndex: 'remarks',
        width: 160,
        defaultVisible: false,
        render: (r: string | undefined) => r || '—',
      },
      { key: 'operation', title: '操作', width: 148, defaultVisible: true },
    ],
    [],
  );

  const [visibleContactColumns, setVisibleContactColumns] = useState<string[]>(() =>
    getEcoDefaultVisibleColumnKeys(allContactColumns),
  );

  const contactTableColumns = useMemo(
    () =>
      buildTableColumnsFromEcoConfig(allContactColumns, visibleContactColumns, (row: RiverChiefContactRow) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            className="action-btn detail"
            icon={<EyeOutlined />}
            onClick={() => {
              setDetail(row);
              setDetailModalOpen(true);
            }}
          >
            详情
          </Button>
          <Button type="link" size="small" className="action-btn edit" icon={<EditOutlined />} onClick={() => openEdit(row)}>
            编辑
          </Button>
        </Space>
      )),
    [allContactColumns, visibleContactColumns],
  );

  const contactTableScrollX = getEcoTableScrollX(
    allContactColumns.filter(c => visibleContactColumns.includes(c.key) || c.key === 'operation'),
  );

  return (
    <div className="facility-view">
      <Card
        title="河长通讯录"
        extra={
          <Space wrap size={[8, 8]} align="center">
            <EcoProtoExportBtn
              onClick={() =>
                exportEcoTableExcel(
                  filtered as unknown as Record<string, unknown>[],
                  allContactColumns as unknown as Array<{ key?: string; title?: unknown; dataIndex?: unknown }>,
                  '生态整治_河长通讯录',
                  '河长通讯录',
                )
              }
            />
            <EcoProtoImportBtn />
            <EcoColumnManager
              columns={allContactColumns}
              visibleColumns={visibleContactColumns}
              onChange={setVisibleContactColumns}
            />
            <Button type="primary" icon={<PlusOutlined />} className="add-btn" onClick={openAdd}>
              新增
            </Button>
          </Space>
        }
      >
        <Form form={filterForm}>
          <Row gutter={[16, 12]} style={{ marginBottom: 12 }}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="addvcdKw" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="所属区划" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="chiefLevel" style={{ marginBottom: 0 }}>
                <Select
                  allowClear
                  placeholder="河长级别"
                  options={chiefLevelOptions}
                  optionFilterProp="label"
                  showSearch
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="areaName" style={{ marginBottom: 0 }}>
                <Select allowClear placeholder="责任区域" showSearch optionFilterProp="children" style={{ width: '100%' }}>
                  {CONTACT_AREA_OPTIONS.map(a => (
                    <Option key={a} value={a}>
                      {a}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="deptType" style={{ marginBottom: 0 }}>
                <Select allowClear placeholder="部门类型" showSearch optionFilterProp="children" style={{ width: '100%' }}>
                  {CONTACT_DEPT_TYPES.map(d => (
                    <Option key={d} value={d}>
                      {d}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="name" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="姓名" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="userId" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="用户编号" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="mobile" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="手机号码" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="orgName" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="单位" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Space>
                <Button type="primary" className="search-btn" icon={<SearchOutlined />} onClick={handleSearch}>
                  查询
                </Button>
                <Button onClick={handleReset}>重置</Button>
              </Space>
            </Col>
          </Row>
        </Form>
        <div className="facility-table-wrap">
          <Table<RiverChiefContactRow>
            rowKey="id"
            size="small"
            scroll={{ x: contactTableScrollX }}
            pagination={{ defaultPageSize: 10, showTotal: t => `共 ${t} 条` }}
            columns={contactTableColumns}
            dataSource={filtered}
          />
        </div>
      </Card>

      <Modal
        styles={formModalStyles}
        title="联系人详情"
        open={detailModalOpen}
        onCancel={() => {
          setDetailModalOpen(false);
          setDetail(null);
        }}
        width={720}
        footer={null}
        destroyOnClose
      >
        {detail ? <RiverChiefContactReadonlyDetailContent detail={detail} /> : null}
      </Modal>

      <Modal
        title={editing ? '编辑通讯录' : '新增通讯录'}
        open={editOpen}
        width={800}
        onCancel={() => {
          setEditOpen(false);
          setEditing(null);
          editForm.resetFields();
        }}
        destroyOnClose
        styles={{
          ...formModalStyles,
          body: {
            ...formModalStyles.body,
            maxHeight: 'none',
            overflowY: 'visible',
            paddingTop: 12,
            paddingBottom: 8,
          },
        }}
        footer={
          <Space>
            {editing ?
              <Popconfirm title="确认删除" description="确定删除该条通讯录？（原型）" onConfirm={handleDeleteContact}>
                <Button danger>删除</Button>
              </Popconfirm>
            : null}
            <Button
              onClick={() => {
                setEditOpen(false);
                setEditing(null);
                editForm.resetFields();
              }}
            >
              取消
            </Button>
            <Button type="primary" onClick={() => void handleSaveContact()}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={editForm} layout="vertical" preserve={false} requiredMark="optional">
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="userId"
                label="用户编号"
                rules={[{ required: true, message: '请输入用户编号' }]}
                style={{ marginBottom: 12 }}
              >
                <Input placeholder="对接平台用户编号" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]} style={{ marginBottom: 12 }}>
                <Input placeholder="姓名" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="addvcd"
                label="所属区划"
                rules={[{ required: true, message: '请选择所属区划' }]}
                style={{ marginBottom: 12 }}
              >
                <Select
                  allowClear
                  showSearch
                  placeholder="韶山市及下辖乡镇（街道）"
                  optionFilterProp="label"
                  style={{ width: '100%' }}
                  options={shaoshanAddvcdSelectOptionsWithLegacy(editing?.addvcd)}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="roleCategory"
                label="人员类型"
                rules={[{ required: true, message: '请选择人员类型' }]}
                style={{ marginBottom: 12 }}
              >
                <Select
                  placeholder="请选择"
                  options={(
                    Object.keys(CONTACT_ROLE_LABEL) as ContactRoleCategory[]
                  ).map(k => ({ value: k, label: CONTACT_ROLE_LABEL[k] }))}
                />
              </Form.Item>
            </Col>
            {editRoleCategory === 'chief' ?
              <Col xs={24} sm={12}>
                <Form.Item name="userType" label="河长级别" rules={[{ required: true, message: '请选择河长级别' }]} style={{ marginBottom: 12 }}>
                  <Select allowClear placeholder="级别" options={chiefLevelOptions} optionFilterProp="label" showSearch />
                </Form.Item>
              </Col>
            : null}
            <Col xs={24} sm={editRoleCategory === 'chief' ? 12 : 24}>
              <Form.Item name="areaName" label="责任区域" rules={[{ required: true, message: '请选择责任区域' }]} style={{ marginBottom: 12 }}>
                <Select showSearch optionFilterProp="children" placeholder="责任区域">
                  {CONTACT_AREA_OPTIONS.map(a => (
                    <Option key={a} value={a}>
                      {a}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="deptType" label="部门类型" rules={[{ required: true, message: '请选择部门类型' }]} style={{ marginBottom: 12 }}>
                <Select showSearch optionFilterProp="children" placeholder="部门类型">
                  {CONTACT_DEPT_TYPES.map(d => (
                    <Option key={d} value={d}>
                      {d}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="title" label="职务" rules={[{ required: true, message: '请输入职务' }]} style={{ marginBottom: 12 }}>
                <Input placeholder="职务" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="orgName" label="单位" rules={[{ required: true, message: '请输入单位' }]} style={{ marginBottom: 12 }}>
                <Input placeholder="单位全称" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="mobile" label="手机" rules={[{ required: true, message: '请输入手机' }]} style={{ marginBottom: 12 }}>
                <Input placeholder="手机号" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="tel" label="固话" style={{ marginBottom: 12 }}>
                <Input placeholder="选填" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="officeAddr" label="办公地址" style={{ marginBottom: 12 }}>
                <Input placeholder="选填" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="sectionId" label="关联河段编码" style={{ marginBottom: 12 }}>
                <Input placeholder="选填，责任段编码" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="email" label="电子邮箱" style={{ marginBottom: 12 }}>
                <Input placeholder="选填" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="remarks" label="备注" style={{ marginBottom: 0 }}>
                <TextArea rows={2} placeholder="选填" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

interface RiverChiefChangeRecordPageProps {
  chiefAreas: ChiefAreaRow[];
  changeRecords: RiverChiefChangeRow[];
  onChangeRecordsChange: React.Dispatch<React.SetStateAction<RiverChiefChangeRow[]>>;
  contacts: RiverChiefContactRow[];
}

const RiverChiefChangeRecordPage: React.FC<RiverChiefChangeRecordPageProps> = ({
  chiefAreas,
  changeRecords,
  onChangeRecordsChange,
  contacts,
}) => {
  const data = changeRecords;
  const [filterLevel, setFilterLevel] = useState<number | undefined>();
  const [filterArea, setFilterArea] = useState<string | undefined>();
  const [filterFormerChiefName, setFilterFormerChiefName] = useState('');
  const [filterNewChiefName, setFilterNewChiefName] = useState('');
  const [filterChangeNo, setFilterChangeNo] = useState('');
  const [filterReason, setFilterReason] = useState('');
  const [filterDateRange, setFilterDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<RiverChiefChangeRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<RiverChiefChangeRow | null>(null);
  const [form] = Form.useForm<RiverChiefChangeRow>();

  const chiefLevelOptions = useMemo(
    () => Object.entries(USER_TYPE_LABEL).map(([k, label]) => ({ label, value: Number(k) })),
    [],
  );

  /** 列表筛选「责任区域」：通讯录口径 + 河长责任区域台账名称 */
  const filterAreaOptions = useMemo(() => {
    const names = new Set<string>([...CONTACT_AREA_OPTIONS]);
    chiefAreas.forEach(a => names.add(a.responsibilityAreaName));
    return [...names].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  }, [chiefAreas]);

  const filtered = useMemo(() => {
    return data.filter(row => {
      if (filterLevel != null && row.chiefLevel !== filterLevel) return false;
      if (filterArea && row.areaName !== filterArea) return false;
      if (filterDateRange?.[0] && filterDateRange[1]) {
        const t = dayjs(row.changeTime);
        if (t.isBefore(filterDateRange[0].startOf('day')) || t.isAfter(filterDateRange[1].endOf('day'))) return false;
      }
      if (filterFormerChiefName.trim() && !row.formerChiefName.includes(filterFormerChiefName.trim())) return false;
      if (filterNewChiefName.trim() && !row.newChiefName.includes(filterNewChiefName.trim())) return false;
      if (filterChangeNo.trim() && !row.changeNo.includes(filterChangeNo.trim())) return false;
      if (filterReason.trim() && !row.changeReason.includes(filterReason.trim())) return false;
      return true;
    });
  }, [data, filterLevel, filterArea, filterFormerChiefName, filterNewChiefName, filterChangeNo, filterReason, filterDateRange]);

  const openAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      changeTime: dayjs(),
      chiefLevel: 3,
      chiefAreaKey: undefined,
      formerChiefName: undefined,
      areaName: undefined,
      newChiefName: undefined,
    } as unknown as RiverChiefChangeRow);
    setEditOpen(true);
  };

  const openEdit = (row: RiverChiefChangeRow) => {
    setEditing(row);
    form.setFieldsValue({
      ...row,
      changeTime: dayjs(row.changeTime),
    } as unknown as RiverChiefChangeRow);
    setEditOpen(true);
  };

  const openDetail = (row: RiverChiefChangeRow) => {
    setDetailRow(row);
    setDetailOpen(true);
  };

  const handleSave = async () => {
    const v = await form.validateFields();
    const changeTimeStr = (v as unknown as { changeTime: dayjs.Dayjs }).changeTime.format('YYYY-MM-DD');
    if (editing) {
      const fv = v as unknown as Partial<RiverChiefChangeRow>;
      const linked = chiefAreas.find(a => a.key === fv.chiefAreaKey);
      const areaName =
        linked?.responsibilityAreaName ?? fv.areaName ?? editing.areaName;
      const next: RiverChiefChangeRow = {
        ...editing,
        ...fv,
        changeTime: changeTimeStr,
        changeNo: editing.changeNo,
        key: editing.key,
        chiefAreaKey: fv.chiefAreaKey ?? null,
        areaName,
        chiefLevel: fv.chiefLevel ?? editing.chiefLevel,
      };
      onChangeRecordsChange(prev => prev.map(r => (r.key === editing.key ? next : r)));
      message.success('已保存变更记录');
    } else {
      const maxNum = Math.max(0, ...data.map(r => parseInt(r.changeNo.replace(/^BG-\d+-/, ''), 10) || 0));
      const y = dayjs().format('YYYY');
      const changeNo = `BG-${y}-${String(maxNum + 1).padStart(3, '0')}`;
      const newKey = `chg-${Date.now()}`;
      const fv = v as unknown as Partial<RiverChiefChangeRow>;
      const linked = chiefAreas.find(a => a.key === fv.chiefAreaKey);
      const areaName = linked?.responsibilityAreaName ?? fv.areaName ?? '';
      const formerChiefName = fv.formerChiefName || linked?.chiefName || '';
      const next: RiverChiefChangeRow = {
        key: newKey,
        changeNo,
        changeTime: changeTimeStr,
        chiefLevel: fv.chiefLevel ?? 3,
        areaName,
        chiefAreaKey: fv.chiefAreaKey ?? null,
        formerChiefName,
        newChiefName: fv.newChiefName!,
        changeReason: fv.changeReason!,
        handoverDesc: fv.handoverDesc!,
        remark: fv.remark,
      };
      onChangeRecordsChange(prev => [...prev, next]);
      message.success('已新增变更记录');
    }
    setEditOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const handleDelete = () => {
    if (!editing) return;
    onChangeRecordsChange(prev => prev.filter(r => r.key !== editing.key));
    message.success('已删除该条变更记录');
    setEditOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const allChangeColumns: EcoColumnConfig[] = useMemo(
    () => [
      { key: 'changeNo', title: '变更编号', dataIndex: 'changeNo', width: 128, fixed: 'left' },
      {
        key: 'chiefLevel',
        title: '河长级别',
        dataIndex: 'chiefLevel',
        width: 120,
        render: (lv: number) => USER_TYPE_LABEL[lv] ?? '—',
      },
      { key: 'areaName', title: '责任区域', dataIndex: 'areaName', width: 220 },
      { key: 'formerChiefName', title: '原河长', dataIndex: 'formerChiefName', width: 88 },
      { key: 'newChiefName', title: '新河长', dataIndex: 'newChiefName', width: 88 },
      { key: 'changeTime', title: '变更时间', dataIndex: 'changeTime', width: 110 },
      { key: 'changeReason', title: '变更原因', dataIndex: 'changeReason', width: 220 },
      { key: 'handoverDesc', title: '交接情况', dataIndex: 'handoverDesc', width: 260 },
      {
        key: 'remark',
        title: '备注',
        dataIndex: 'remark',
        width: 160,
        defaultVisible: false,
        render: (t: string | undefined) => (t?.trim() ? t : '—'),
      },
      { key: 'operation', title: '操作', width: 148, defaultVisible: true },
    ],
    [],
  );

  const [visibleChangeColumns, setVisibleChangeColumns] = useState<string[]>(() =>
    getEcoDefaultVisibleColumnKeys(allChangeColumns),
  );

  const changeTableColumns = useMemo(
    () =>
      buildTableColumnsFromEcoConfig(allChangeColumns, visibleChangeColumns, (row: RiverChiefChangeRow) => (
        <Space size="small">
          <Button type="link" size="small" className="action-btn detail" icon={<EyeOutlined />} onClick={() => openDetail(row)}>
            详情
          </Button>
          <Button type="link" size="small" className="action-btn edit" icon={<EditOutlined />} onClick={() => openEdit(row)}>
            编辑
          </Button>
        </Space>
      )),
    [allChangeColumns, visibleChangeColumns],
  );

  const changeTableScrollX = getEcoTableScrollX(
    allChangeColumns.filter(c => visibleChangeColumns.includes(c.key) || c.key === 'operation'),
  );

  return (
    <div className="facility-view">
      <Card
        title="河长变更记录"
        extra={
          <Space wrap size={[8, 8]} align="center">
            <EcoProtoExportBtn
              onClick={() =>
                exportEcoTableExcel(
                  filtered as unknown as Record<string, unknown>[],
                  allChangeColumns as unknown as Array<{ key?: string; title?: unknown; dataIndex?: unknown }>,
                  '生态整治_河长变更记录',
                  '河长变更记录',
                )
              }
            />
            <EcoProtoImportBtn />
            <EcoColumnManager
              columns={allChangeColumns}
              visibleColumns={visibleChangeColumns}
              onChange={setVisibleChangeColumns}
            />
            <Button type="primary" icon={<PlusOutlined />} className="add-btn" onClick={openAdd}>
              新增
            </Button>
          </Space>
        }
      >
        <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8} lg={5}>
            <Select
              allowClear
              placeholder="河长级别"
              style={{ width: '100%' }}
              value={filterLevel}
              onChange={v => setFilterLevel(v ?? undefined)}
              options={chiefLevelOptions}
              optionFilterProp="label"
              showSearch
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={5}>
            <Select
              allowClear
              placeholder="责任区域"
              style={{ width: '100%' }}
              value={filterArea}
              onChange={v => setFilterArea(v ?? undefined)}
              showSearch
              optionFilterProp="children"
            >
              {filterAreaOptions.map(a => (
                <Option key={a} value={a}>
                  {a}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Input
              allowClear
              placeholder="原河长姓名"
              prefix={<SearchOutlined />}
              value={filterFormerChiefName}
              onChange={e => setFilterFormerChiefName(e.target.value)}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Input
              allowClear
              placeholder="新河长姓名"
              prefix={<SearchOutlined />}
              value={filterNewChiefName}
              onChange={e => setFilterNewChiefName(e.target.value)}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Input
              allowClear
              placeholder="变更编号"
              prefix={<SearchOutlined />}
              value={filterChangeNo}
              onChange={e => setFilterChangeNo(e.target.value)}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Input
              allowClear
              placeholder="变更原因"
              prefix={<SearchOutlined />}
              value={filterReason}
              onChange={e => setFilterReason(e.target.value)}
            />
          </Col>
        </Row>
        <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <RangePicker
              style={{ width: '100%' }}
              value={filterDateRange}
              onChange={dates => setFilterDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
              placeholder={['变更起', '变更止']}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={8}>
            <Space>
              <Button type="primary" className="search-btn" icon={<SearchOutlined />} onClick={() => message.success(`共 ${filtered.length} 条`)}>
                查询
              </Button>
              <Button
                onClick={() => {
                  setFilterLevel(undefined);
                  setFilterArea(undefined);
                  setFilterFormerChiefName('');
                  setFilterNewChiefName('');
                  setFilterChangeNo('');
                  setFilterReason('');
                  setFilterDateRange(null);
                }}
              >
                重置
              </Button>
            </Space>
          </Col>
        </Row>
        <div className="facility-table-wrap">
          <Table<RiverChiefChangeRow>
            rowKey="key"
            size="small"
            scroll={{ x: changeTableScrollX }}
            pagination={{ defaultPageSize: 10, showTotal: t => `共 ${t} 条` }}
            columns={changeTableColumns}
            dataSource={filtered}
          />
        </div>
      </Card>

      <Modal
        styles={formModalStyles}
        title={editing ? '编辑河长变更记录' : '新增河长变更记录'}
        open={editOpen}
        width={720}
        onCancel={() => {
          setEditOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        footer={
          <Space>
            {editing && (
              <Popconfirm title="确认删除该条记录？" description="删除后不可恢复（原型）" onConfirm={handleDelete}>
                <Button danger>删除</Button>
              </Popconfirm>
            )}
            <Button
              onClick={() => {
                setEditOpen(false);
                setEditing(null);
                form.resetFields();
              }}
            >
              取消
            </Button>
            <Button type="primary" onClick={() => void handleSave()}>
              保存
            </Button>
          </Space>
        }
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          {/* 列表展示仍用 chiefLevel；新增默认 3，编辑沿用原值 */}
          <Form.Item name="chiefLevel" hidden>
            <Input type="hidden" />
          </Form.Item>
          <Form.Item name="areaName" hidden>
            <Input type="hidden" />
          </Form.Item>
          <Form.Item
            name="chiefAreaKey"
            label="责任区域"
            rules={editing ? undefined : [{ required: true, message: '请选择河长责任区域' }]}
            extra="从「河长责任区域」台账选择，自动带出当前（原）河长姓名"
          >
            <Select
              allowClear={!!editing}
              placeholder="请选择河长责任区域"
              showSearch
              optionFilterProp="label"
              options={chiefAreas.map(a => ({
                value: a.key,
                label: `${a.responsibilityAreaName}（当前河长：${a.chiefName}）`,
              }))}
              onChange={(val: string | null) => {
                const area = chiefAreas.find(a => a.key === val);
                if (!editing && area) {
                  form.setFieldsValue({
                    formerChiefName: area.chiefName,
                    areaName: area.responsibilityAreaName,
                  });
                } else if (area) {
                  form.setFieldsValue({ areaName: area.responsibilityAreaName });
                } else if (!val) {
                  form.setFieldsValue({ areaName: undefined });
                }
              }}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="formerChiefName"
                label="原河长姓名"
                rules={[
                  {
                    validator: (_, value) => {
                      if (!editing && !value) {
                        return Promise.reject(new Error('请先选择责任区域以带出原河长'));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input readOnly placeholder="选择责任区域后自动带出" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="newChiefName" label="新河长姓名" rules={[{ required: true, message: '请选择新河长' }]}>
                <Select placeholder="请从河长通讯录中选择接任河长" showSearch optionFilterProp="children">
                  {getChiefNameSelectOptions(contacts, editing?.newChiefName).map(n => (
                    <Option key={n} value={n}>
                      {n}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="changeTime" label="变更时间" rules={[{ required: true, message: '请选择变更时间' }]}>
            <DatePicker style={{ width: '100%' }} placeholder="变更生效日期" />
          </Form.Item>
          <Form.Item name="changeReason" label="变更原因" rules={[{ required: true, message: '请填写变更原因' }]}>
            <TextArea rows={3} placeholder="如：工作调动、换届、退休、岗位调整及批复文号等" />
          </Form.Item>
          <Form.Item
            name="handoverDesc"
            label="责任区域交接情况"
            rules={[{ required: true, message: '请填写责任区域交接情况' }]}
          >
            <TextArea
              rows={4}
              placeholder="说明台账移交、范围确认、未完成整改与督办事项、公示与联系方式更新等，保障管护无缝衔接"
            />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <TextArea rows={2} placeholder="备案号、附件索引等（选填）" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        styles={formModalStyles}
        title="河长变更详情"
        open={detailOpen}
        width={720}
        onCancel={() => {
          setDetailOpen(false);
          setDetailRow(null);
        }}
        footer={null}
        destroyOnClose
      >
        {detailRow && (
          <Descriptions bordered column={2} size="small" style={{ marginTop: 8 }}>
            <Descriptions.Item label="变更编号">{detailRow.changeNo}</Descriptions.Item>
            <Descriptions.Item label="变更时间">{detailRow.changeTime}</Descriptions.Item>
            <Descriptions.Item label="河长级别">
              {USER_TYPE_LABEL[detailRow.chiefLevel as keyof typeof USER_TYPE_LABEL] ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="责任区域" span={2}>
              {detailRow.areaName}
            </Descriptions.Item>
            <Descriptions.Item label="关联河长责任区域台账" span={2}>
              {detailRow.chiefAreaKey
                ? chiefAreas.find(a => a.key === detailRow.chiefAreaKey)?.responsibilityAreaName ?? detailRow.chiefAreaKey
                : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="原河长姓名">{detailRow.formerChiefName}</Descriptions.Item>
            <Descriptions.Item label="新河长姓名">{detailRow.newChiefName}</Descriptions.Item>
            <Descriptions.Item label="变更原因" span={2}>
              {detailRow.changeReason}
            </Descriptions.Item>
            <Descriptions.Item label="责任区域交接情况" span={2}>
              {detailRow.handoverDesc}
            </Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>
              {detailRow.remark ?? '—'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

// ============ 主组件 ============

const Component: React.FC = () => {
  const [activeModule, setActiveModule] = useState<'project' | 'river-chief'>('project');
  const [activeSubMenu, setActiveSubMenu] = useState<string>('archive');
  /** 河长责任区域与河长变更记录共享状态，通过 RiverChiefChangeRow.chiefAreaKey 关联 */
  const [chiefAreaList, setChiefAreaList] = useState<ChiefAreaRow[]>(() => [...initialChiefAreaData]);
  const [riverChiefChanges, setRiverChiefChanges] = useState<RiverChiefChangeRow[]>(() => [...initialRiverChiefChangeData]);
  /** 与巡河信息、巡河统计共享，便于统计页反映列表增删改 */
  const [patrolList, setPatrolList] = useState<PatrolRecordRow[]>(() => [...initialPatrolData]);
  /** 与任务完成情况、任务完成统计共享 */
  const [taskList, setTaskList] = useState<RiverChiefTaskRow[]>(() => [...initialTaskData]);
  /** 河道水体：河流（涌）主数据 + 湖泊水体主数据（DB4401 语义，原型） */
  const [riverChannelMasters, setRiverChannelMasters] = useState<RiverChannelMasterRow[]>(() => [
    ...initialRiverChannelMasterData,
  ]);
  const [lakeWaterBodies, setLakeWaterBodies] = useState<LakeWaterBodyRow[]>(() => [...initialLakeWaterBodyData]);
  /** 责任段台账：与巡河、水质筛选、河道水体统计共用 */
  const [riverSectionList, setRiverSectionList] = useState<RiverSectionRow[]>(() => [...initialRiverSectionData]);
  const [manualChiefEvaluations, setManualChiefEvaluations] = useState<ManualChiefEvaluation[]>(() =>
    loadManualEvaluationsInitial(),
  );
  /** 河长通讯录：与河湖长制各页河长下拉共用，改通讯录后各表单选项即时一致 */
  const [riverChiefContacts, setRiverChiefContacts] = useState<RiverChiefContactRow[]>(() => [...initialRiverChiefContacts]);
  /** 河湖管护事务列表：与 DB4401 上报事件语义对齐，支持列表内增删改与处置录入 */
  const [riverGuardAffairs, setRiverGuardAffairs] = useState<RiverGuardAffairRow[]>(() => [...initialRiverGuardAffairs]);
  /** 项目档案与项目汇总统计共享 */
  const [projectList, setProjectList] = useState<EcoProjectArchiveRow[]>(() => [...initialEcoProjectArchiveData]);

  const updateManualChiefEvaluations = (rows: ManualChiefEvaluation[]) => {
    setManualChiefEvaluations(rows);
    saveManualEvaluationsToStorage(rows);
  };

  const [expandedKeys, setExpandedKeys] = useState<string[]>(() => {
    for (const menu of ECO_SIDEBAR_MENUS) {
      if (ecoMenuChildrenContainsKey(menu.children, 'archive')) {
        return [menu.key];
      }
    }
    return ['project'];
  });

  /** 河湖长制内「河道水体」等二级分组的展开 key */
  const [expandedSubMenuKeys, setExpandedSubMenuKeys] = useState<string[]>(['water-body']);

  useEffect(() => {
    const parent = ECO_SIDEBAR_MENUS.find(m => ecoMenuChildrenContainsKey(m.children, activeSubMenu));
    if (parent) {
      setExpandedKeys(k => (k.includes(parent.key) ? k : [...k, parent.key]));
    }
    for (const m of ECO_SIDEBAR_MENUS) {
      for (const c of m.children) {
        if (isEcoSubBranch(c) && c.children.some(s => s.key === activeSubMenu)) {
          setExpandedSubMenuKeys(k => (k.includes(c.key) ? k : [...k, c.key]));
        }
      }
    }
  }, [activeSubMenu]);

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => (prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]));
  };

  const toggleExpandSub = (key: string) => {
    setExpandedSubMenuKeys(prev => (prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]));
  };

  const getBreadcrumbPath = () => {
    const group = ECO_SIDEBAR_MENUS.find(g => g.key === activeModule);
    if (!group) return '生态整治';
    for (const c of group.children) {
      if (isEcoSubBranch(c)) {
        const leaf = c.children.find(s => s.key === activeSubMenu);
        if (leaf) return `${group.label} / ${c.label} / ${leaf.label}`;
      } else if (c.key === activeSubMenu) {
        return `${group.label} / ${c.label}`;
      }
    }
    return group.label;
  };

  const renderContent = () => {
    if (activeModule === 'project') {
      switch (activeSubMenu) {
        case 'archive':
          return <ProjectArchive projects={projectList} onProjectsChange={setProjectList} />;
        case 'summary':
          return <ProjectStatistics projects={projectList} />;
        default:
          return <ProjectArchive projects={projectList} onProjectsChange={setProjectList} />;
      }
    }

    switch (activeSubMenu) {
      case 'section':
        return (
          <RiverSection
            sections={riverSectionList}
            onSectionsChange={setRiverSectionList}
            riverChannels={riverChannelMasters}
            chiefContacts={riverChiefContacts}
          />
        );
      case 'river-channel':
        return (
          <WaterBodyInfoManage
            page="river"
            sections={riverSectionList}
            riverChannels={riverChannelMasters}
            onRiverChannelsChange={setRiverChannelMasters}
            lakes={lakeWaterBodies}
            onLakesChange={setLakeWaterBodies}
          />
        );
      case 'lake-water':
        return (
          <WaterBodyInfoManage
            page="lake"
            sections={riverSectionList}
            riverChannels={riverChannelMasters}
            onRiverChannelsChange={setRiverChannelMasters}
            lakes={lakeWaterBodies}
            onLakesChange={setLakeWaterBodies}
          />
        );
      case 'chief-area':
        return (
          <ChiefAreaPage
            areas={chiefAreaList}
            onAreasChange={setChiefAreaList}
            changeRecords={riverChiefChanges}
            contacts={riverChiefContacts}
          />
        );
      case 'patrol':
        return (
          <PatrolRecord patrolList={patrolList} setPatrolList={setPatrolList} sections={riverSectionList} />
        );
      case 'patrol-stats':
        return <PatrolStatistics patrolList={patrolList} />;
      case 'task':
        return <TaskManage tasks={taskList} onTasksChange={setTaskList} />;
      case 'task-stats':
        return <TaskStatistics tasks={taskList} />;
      case 'score':
        return (
          <ScoreManage
            chiefAreas={chiefAreaList}
            manualEvaluations={manualChiefEvaluations}
            onManualEvaluationsChange={updateManualChiefEvaluations}
            contacts={riverChiefContacts}
          />
        );
      case 'score-stats':
        return (
          <ScoreStatistics
            chiefAreas={chiefAreaList}
            manualEvaluations={manualChiefEvaluations}
            contacts={riverChiefContacts}
          />
        );
      case 'monitor':
        return <WaterQuality sections={riverSectionList} />;
      case 'affairs':
        return (
          <AffairsManage
            affairs={riverGuardAffairs}
            onAffairsChange={setRiverGuardAffairs}
            sections={riverSectionList}
          />
        );
      case 'contacts':
        return <RiverChiefContactsPage contacts={riverChiefContacts} onContactsChange={setRiverChiefContacts} />;
      case 'changes':
        return (
          <RiverChiefChangeRecordPage
            chiefAreas={chiefAreaList}
            changeRecords={riverChiefChanges}
            onChangeRecordsChange={setRiverChiefChanges}
            contacts={riverChiefContacts}
          />
        );
      default:
        return (
          <RiverSection
            sections={riverSectionList}
            onSectionsChange={setRiverSectionList}
            riverChannels={riverChannelMasters}
            chiefContacts={riverChiefContacts}
          />
        );
    }
  };

  return (
    <AppConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1e5bb5',
          borderRadius: 4,
        },
      }}
    >
      <Layout className="water-env-dashboard facility-mgmt-standalone">
        <div className="main-layout with-sidebar">
          <div className="sidebar-menu">
            <div className="sidebar-menu-title">生态整治</div>
            <div className="sidebar-menu-list">
              {ECO_SIDEBAR_MENUS.map(menu => {
                const hasChildren = menu.children.length > 0;
                const isExpanded = expandedKeys.includes(menu.key);
                const isGroupActive = activeModule === menu.key;

                return (
                  <div key={menu.key} className="sidebar-menu-item-wrapper">
                    <div
                      className={`sidebar-menu-item ${isGroupActive ? 'active' : ''}`}
                      onClick={() => {
                        if (hasChildren) {
                          toggleExpand(menu.key);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (hasChildren) toggleExpand(menu.key);
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
                        {menu.children.map(child => {
                          if (isEcoSubBranch(child)) {
                            const subOpen = expandedSubMenuKeys.includes(child.key);
                            return (
                              <div key={child.key} className="sidebar-submenu-nest-wrap">
                                <div
                                  className="sidebar-submenu-item sidebar-submenu-parent"
                                  onClick={() => toggleExpandSub(child.key)}
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      toggleExpandSub(child.key);
                                    }
                                  }}
                                >
                                  <span className="sidebar-submenu-parent-icon">{child.icon}</span>
                                  <span className="sidebar-submenu-parent-label">{child.label}</span>
                                  <span className={`sidebar-submenu-parent-arrow ${subOpen ? 'expanded' : ''}`}>
                                    <DownOutlined />
                                  </span>
                                </div>
                                {subOpen ?
                                  child.children.map(sub => (
                                    <div
                                      key={sub.key}
                                      className={`sidebar-submenu-item sidebar-submenu-nested ${
                                        activeModule === menu.key && activeSubMenu === sub.key ? 'active' : ''
                                      }`}
                                      onClick={() => {
                                        setActiveModule(menu.key);
                                        setActiveSubMenu(sub.key);
                                      }}
                                      role="button"
                                      tabIndex={0}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          setActiveModule(menu.key);
                                          setActiveSubMenu(sub.key);
                                        }
                                      }}
                                    >
                                      {sub.label}
                                    </div>
                                  ))
                                : null}
                              </div>
                            );
                          }
                          return (
                          <div
                            key={child.key}
                            className={`sidebar-submenu-item ${
                              activeModule === menu.key && activeSubMenu === child.key ? 'active' : ''
                            }`}
                            onClick={() => {
                              setActiveModule(menu.key);
                              setActiveSubMenu(child.key);
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={e => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setActiveModule(menu.key);
                                setActiveSubMenu(child.key);
                              }
                            }}
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
              <span className="breadcrumb-current">{getBreadcrumbPath()}</span>
            </div>
            <Content className="main-content with-sidebar">
              <div className="content-wrapper">{renderContent()}</div>
            </Content>
          </div>
        </div>
      </Layout>
    </AppConfigProvider>
  );
};

export default Component;
