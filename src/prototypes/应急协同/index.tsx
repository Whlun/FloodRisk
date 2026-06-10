/**
 * @name 应急协同
 * 应急协同 — 风险识别台账 + 应急事件信息 + 事件评估（侧栏与样式对齐「生态整治」设施管理）
 */
import './style.css';
import '../shared/ant-table-text-no-overlap.css';
import { DetailTabsIfMultiple } from '../shared/detailTabsIfMultiple';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import zhCN from 'antd/locale/zh_CN';
import AppConfigProvider from '../../common/AppConfigProvider';
import {
  Layout,
  Card,
  Row,
  Col,
  Table,
  Tag,
  Button,
  Input,
  Select,
  Space,
  Typography,
  Modal,
  Form,
  message,
  Popconfirm,
  Descriptions,
  Checkbox,
  Divider,
  Dropdown,
  Tooltip,
  Upload,
  Empty,
  DatePicker,
  Tabs,
  Image,
} from 'antd';
import type { UploadFile } from 'antd';
import {
  ColumnHeightOutlined,
  SearchOutlined,
  PlusOutlined,
  DownloadOutlined,
  UploadOutlined,
  EditOutlined,
  EyeOutlined,
  DownOutlined,
  AlertOutlined,
  FormOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { FormInstance } from 'antd/es/form';
import {
  initialLakeWaterBodyData,
  initialRiverChannelMasterData,
  SHAOSHAN_ADDVCD_OPTIONS,
  getShaoshanAddvcdLabel,
  inferShaoshanAddvcdFromTownLabel,
} from '../生态整治/riverChiefDb4401';
import {
  initialRiskData,
  RiskIdentificationRouter,
  type ExpertRow,
  type RiskMenuKey,
  type SocialSupplyPointRow,
} from './riskIdentification';
import { EventReviewDetailBody, EventReviewPage, initialEventReviews, type EventReviewRow } from './eventReview';
import { initialEmergencyEvents, initialEventAssessments } from './emergencyEventInitialData';
import { EmergencyEventDetailMap } from './emergencyEventDetailMap';
import { EmergencyEventFormMap } from './emergencyEventFormMap';
import { downloadTableFullExcel, getExportFieldLabel } from '../shared/facilityTableXlsxExport';

const { Content } = Layout;
const { Text, Paragraph } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const formModalStyles = {
  body: {
    maxHeight: 'calc(100vh - 240px)',
    overflowY: 'auto' as const,
    overflowX: 'hidden' as const,
    minWidth: 0,
  },
};

/** 只读详情弹窗：与生态整治一致，内容区可滚动区域略增高 */
const detailModalStyles = {
  ...formModalStyles,
  body: { ...formModalStyles.body, maxHeight: 'min(85vh, 900px)', overflowY: 'auto' as const },
};

// ========== 表格字段管理（与生态整治一致） ==========
interface EcoColumnConfig {
  key: string;
  title: React.ReactNode;
  columnManagerLabel?: string;
  dataIndex?: string;
  width?: number;
  fixed?: 'left' | 'right';
  render?: (value: unknown, record: unknown) => React.ReactNode;
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
    if (checked) onChange([...visibleColumns, key]);
    else {
      if (key === 'operation') {
        message.warning('操作列不可隐藏');
        return;
      }
      onChange(visibleColumns.filter(k => k !== key));
    }
  };

  const handleReset = () => {
    onChange(columns.filter(c => c.key !== 'operation' && c.defaultVisible !== false).map(c => c.key));
    message.success('已重置为默认显示');
  };

  const sortableColumns = visibleColumns.filter(key => key !== 'operation');
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newOrder = [...visibleColumns];
    [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    onChange(newOrder);
  };
  const handleMoveDown = (index: number) => {
    if (index >= sortableColumns.length - 1) return;
    const newOrder = [...visibleColumns];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    onChange(newOrder);
  };

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
            {sortableColumns.map((key, index) => {
              const col = columns.find(c => c.key === key);
              const sortLabel =
                col?.columnManagerLabel ?? (typeof col?.title === 'string' ? col.title : col?.key ?? key);
              return (
                <div
                  key={key}
                  style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}
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
function getEcoTableScrollX(cols: { width?: number }[]): number {
  const total = cols.reduce(
    (sum, c) => sum + (typeof c.width === 'number' ? c.width : ECO_DEFAULT_COL_WIDTH),
    0,
  );
  return Math.max(total, 100);
}

const ECO_ELLIPSIS = new Set([
  'eventTitle',
  'eventCode',
  'location',
  'pollutionType',
  'problemType',
  'problemSource',
  'sectionCode',
  'responsibleParty',
  'assessmentCode',
]);

const EcoProtoExportBtn = ({ onClick }: { onClick?: () => void }) => (
  <Button icon={<DownloadOutlined />} className="export-btn" onClick={onClick ?? (() => message.success('已导出'))}>
    导出Excel
  </Button>
);

function exportEmergencyTableExcel(
  rows: Record<string, unknown>[],
  columns: EcoColumnConfig[],
  filePrefix: string,
  sheetName: string,
) {
  if (!rows.length) {
    message.warning('当前筛选条件下无数据可导出');
    return;
  }
  const baseCols = columns
    .filter(c => c.key !== 'operation')
    .map(c => ({ key: c.key, title: String(c.title), dataIndex: String(c.dataIndex ?? c.key) }));
  const EXCLUDE_KEYS = new Set(['key']);
  const allRowKeys = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const missingKeys = allRowKeys.filter(
    k => !EXCLUDE_KEYS.has(k) && !baseCols.some(c => c.dataIndex === k || c.key === k),
  );
  const exportCols = [
    ...baseCols,
    ...missingKeys.map(k => ({ key: k, title: getExportFieldLabel(k), dataIndex: k })),
  ];
  downloadTableFullExcel(rows, exportCols, filePrefix, sheetName);
  message.success('已导出 Excel（全量字段）');
}

const EcoProtoImportBtn = () => (
  <Upload
    beforeUpload={() => {
      message.success('已导入');
      return false;
    }}
    showUploadList={false}
  >
    <Button icon={<UploadOutlined />} className="secondary-btn">导入</Button>
  </Upload>
);

function buildTableColumnsFromEcoConfig(
  allCols: EcoColumnConfig[],
  visibleKeys: string[],
  operationRender: (record: unknown) => React.ReactNode,
): ColumnsType<unknown> {
  return allCols
    .filter(col => visibleKeys.includes(col.key) || col.key === 'operation')
    .sort((a, b) => {
      if (a.key === 'operation') return 1;
      if (b.key === 'operation') return -1;
      return visibleKeys.indexOf(a.key) - visibleKeys.indexOf(b.key);
    })
    .map(col => {
      if (col.key === 'operation') {
        const { defaultVisible: _d, ...opRest } = col;
        return {
          ...opRest,
          fixed: 'right' as const,
          render: (_: unknown, record: unknown) => operationRender(record),
        };
      }
      const ellipsis = typeof col.dataIndex === 'string' && ECO_ELLIPSIS.has(col.dataIndex);
      const { defaultVisible: _dv, ...rest } = col;
      return { ...rest, ...(ellipsis ? { ellipsis: true } : {}) };
    }) as ColumnsType<unknown>;
}

// ========== 业务类型与常量 ==========
import type { EmergencyEventDisposal, EmergencyEventRow, EventAssessmentRow } from './emergencyEventTypes';
import { hasEmergencyEventDisposalFilled } from './emergencyEventDisposalFilled';
export type { EmergencyEventDisposal, EmergencyEventRow, EventAssessmentRow } from './emergencyEventTypes';

const POLLUTION_LEVEL_OPTIONS = ['特别重大', '重大', '较大', '一般'] as const;
const WARNING_LEVEL_OPTIONS = ['红色', '橙色', '黄色', '蓝色'] as const;
const DISPOSAL_STATUS_OPTIONS = ['接报核实', '响应启动', '现场处置', '污染控制', '应急终止', '后期跟踪'] as const;
const REPORT_PROBLEM_TYPE_OPTIONS = [
  '工业废水排放',
  '养殖污染',
  '排水设施',
  '违法建设',
  '农家乐',
  '建筑废弃物',
  '堆场码头',
  '工程维护',
  '生活垃圾',
  '其他',
  '水体污染（含突发）',
] as const;
const REPORT_PROBLEM_SOURCE_OPTIONS = [
  '河长制应用',
  '电话投诉',
  '微信相关',
  '省平台推送',
  '舆情处理',
  '媒体曝光',
  '暗访处理',
  '巡查发现',
  '监测预警',
] as const;
const NATIVE_PROCESSING_OPTIONS = ['是', '否'] as const;
/** 河段或湖泊编码：与生态整治「河湖长制 — 河道水体」河流/湖泊主数据 `riverObjectId` / `lakeObjectId` 同源下拉 */
const RIVER_LAKE_SECTION_SELECT_OPTIONS = [
  ...initialRiverChannelMasterData.map(r => ({
    value: r.riverObjectId,
    label: `${r.riverName}（河流 · ${r.riverObjectId}）`,
  })),
  ...initialLakeWaterBodyData.map(l => ({
    value: l.lakeObjectId,
    label: `${l.lakeName}（湖泊 · ${l.lakeObjectId}）`,
  })),
];

function getRiverLakeSectionLabel(code: string): string {
  const o = RIVER_LAKE_SECTION_SELECT_OPTIONS.find(x => x.value === code);
  return o?.label ?? code;
}

const pollutionLevelColor: Record<string, string> = { 特别重大: 'magenta', 重大: 'red', 较大: 'orange', 一般: 'blue' };
const warningLevelColor: Record<string, string> = { 红色: 'red', 橙色: 'orange', 黄色: 'gold', 蓝色: 'blue' };
const disposalStatusColor: Record<string, string> = {
  接报核实: 'default',
  响应启动: 'processing',
  现场处置: 'warning',
  污染控制: 'orange',
  应急终止: 'success',
  后期跟踪: 'cyan',
};

const DEMO_PLAN_PDF_URL = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

/** 事件评估附件：原型本地，单文件体积上限 */
const ASSESSMENT_ATTACH_MAX_MB = 20;
const ASSESSMENT_ATTACH_ACCEPT = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** 多图上传（data URL），用于「事件图片」「处置图片」等 */
const EVENT_RECORD_IMAGE_MAX_COUNT = 12;
const EVENT_RECORD_IMAGE_MAX_MB = 5;
const EVENT_RECORD_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

interface DataUrlImageCardUploadProps {
  value?: string[];
  onChange?: (v: string[]) => void;
  /** 用于列表项 uid 前缀，避免多实例同索引冲突 */
  listKey: string;
  /** 列表展示文件名前缀 */
  fileNamePrefix: string;
  uploadLabel: string;
}

const DataUrlImageCardUpload: React.FC<DataUrlImageCardUploadProps> = ({
  value,
  onChange,
  listKey,
  fileNamePrefix,
  uploadLabel,
}) => {
  const urls = value ?? [];
  const urlsRef = useRef(urls);
  urlsRef.current = urls;

  const fileList: UploadFile[] = useMemo(
    () =>
      urls.map((url, i) => ({
        uid: `${listKey}-${i}-${url.length}-${url.slice(22, 38)}`,
        name: `${fileNamePrefix}-${String(i + 1).padStart(2, '0')}.jpg`,
        status: 'done',
        url,
      })),
    [urls, listKey, fileNamePrefix],
  );

  const beforeUpload = useCallback(
    (file: File) => {
      const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      const extOk = /\.(jpe?g|png|webp|gif)$/i.test(file.name);
      const typeOk = file.type ? allowedMime.includes(file.type) : extOk;
      if (!typeOk) {
        message.error('仅支持 JPG、PNG、WebP、GIF 格式');
        return Upload.LIST_IGNORE;
      }
      const maxBytes = EVENT_RECORD_IMAGE_MAX_MB * 1024 * 1024;
      if (file.size > maxBytes) {
        message.error(`单张图片不能超过 ${EVENT_RECORD_IMAGE_MAX_MB}MB`);
        return Upload.LIST_IGNORE;
      }
      if (urlsRef.current.length >= EVENT_RECORD_IMAGE_MAX_COUNT) {
        message.warning(`最多上传 ${EVENT_RECORD_IMAGE_MAX_COUNT} 张图片`);
        return Upload.LIST_IGNORE;
      }

      return new Promise<boolean | typeof Upload.LIST_IGNORE>(resolve => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result;
          if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
            message.error('图片解析失败，请换一张重试');
            resolve(Upload.LIST_IGNORE);
            return;
          }
          const next = [...urlsRef.current, dataUrl];
          urlsRef.current = next;
          onChange?.(next);
          resolve(false);
        };
        reader.onerror = () => {
          message.error('读取文件失败，请重试');
          resolve(Upload.LIST_IGNORE);
        };
        reader.readAsDataURL(file);
      });
    },
    [onChange],
  );

  const onRemove = useCallback(
    (file: UploadFile) => {
      const idx = fileList.findIndex(f => f.uid === file.uid);
      if (idx < 0) return;
      const next = urlsRef.current.filter((_, i) => i !== idx);
      urlsRef.current = next;
      onChange?.(next);
    },
    [fileList, onChange],
  );

  return (
    <div className="data-url-image-card-upload">
      <Upload
        listType="picture-card"
        accept={EVENT_RECORD_IMAGE_ACCEPT}
        multiple
        maxCount={EVENT_RECORD_IMAGE_MAX_COUNT}
        fileList={fileList}
        beforeUpload={beforeUpload}
        onRemove={onRemove}
      >
        {fileList.length >= EVENT_RECORD_IMAGE_MAX_COUNT ? null : (
          <div>
            <PlusOutlined />
            <div style={{ marginTop: 8 }}>{uploadLabel}</div>
          </div>
        )}
      </Upload>
    </div>
  );
};

/** 事件编号：水应〔年〕MMDD-序号，按当日已有编号递增（保存时生成） */
function generateNextEventCode(events: EmergencyEventRow[]): string {
  const d = dayjs();
  const y = d.format('YYYY');
  const md = d.format('MMDD');
  const prefix = `水应〔${y}〕${md}-`;
  let max = 0;
  for (const e of events) {
    if (!e.eventCode.startsWith(prefix)) continue;
    const suf = e.eventCode.slice(prefix.length);
    const n = parseInt(suf, 10);
    if (!Number.isNaN(n)) max = Math.max(max, n);
  }
  return `${prefix}${String(max + 1).padStart(2, '0')}`;
}

/** 基本信息：MapLibre 地图选点；与「生态整治 · 项目档案」建设地点地图同源交互（逆地理写具体地址、非坐标句） */
const EmergencyMapLocationPicker: React.FC<{ form: FormInstance }> = ({ form }) => {
  const lngWatch = Form.useWatch('longitude', form);
  const latWatch = Form.useWatch('latitude', form);
  const locWatch = Form.useWatch('location', form);
  return (
    <EmergencyEventFormMap
      longitude={String(lngWatch ?? '').trim()}
      latitude={String(latWatch ?? '').trim()}
      location={String(locWatch ?? '').trim()}
      reverseGeocodeLocation
      mapAriaLabel="事发位置地图"
      mapToolbarHint="在地图上轻点选点或拖动图钉；在可覆盖前提下将尝试在线逆地理为具体地址并填入「事发地点」（需联网）。失败时使用不含坐标的中文示意门牌占位，请改为实际地址。若事发地点为手工录入，点选后只更新经纬度，不覆盖文字。"
      onFormSync={patch => {
        form.setFieldsValue(patch);
      }}
    />
  );
};

// ========== 应急事件信息 ==========
interface EmergencyEventInfoPageProps {
  events: EmergencyEventRow[];
  onEventsChange: React.Dispatch<React.SetStateAction<EmergencyEventRow[]>>;
  /** 用于详情弹窗「事件评估」页签展示关联记录 */
  assessments: EventAssessmentRow[];
  /** 用于详情弹窗「事件复盘」页签展示与本事件关联的复盘记录 */
  reviews: EventReviewRow[];
  /** 与事件复盘详情一致：物资点名称、专家标签等 */
  experts: ExpertRow[];
  socialPoints: SocialSupplyPointRow[];
}

const EmergencyEventInfoPage: React.FC<EmergencyEventInfoPageProps> = ({
  events: rows,
  onEventsChange: setRows,
  assessments,
  reviews,
  experts,
  socialPoints,
}) => {
  const [filterForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [query, setQuery] = useState<Record<string, unknown>>({});
  const [detail, setDetail] = useState<EmergencyEventRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<EmergencyEventRow | null>(null);
  const [eventEditTab, setEventEditTab] = useState('basic');
  /** 详情-事件评估：多条关联时选中的评估 id */
  const [detailAssessmentPickId, setDetailAssessmentPickId] = useState<string | null>(null);
  /** 详情-事件复盘：多条关联时选中的复盘 id */
  const [detailReviewPickId, setDetailReviewPickId] = useState<string | null>(null);
  /** 详情弹窗默认 Tab：「填报信息」入口落在「事件处置」 */
  const [detailDefaultTab, setDetailDefaultTab] = useState<'basic' | 'disposal'>('basic');

  const closeEdit = useCallback(() => {
    setEditOpen(false);
    setEditing(null);
    editForm.resetFields();
    setEventEditTab('basic');
  }, [editForm]);

  /** 打开编辑弹窗并填充行数据；`tab` 为 disposal 时用于「处置填报」入口快速进入事件处置 */
  const openEventEdit = useCallback(
    (row: EmergencyEventRow, tab: 'basic' | 'disposal') => {
      setEditing(row);
      setEventEditTab(tab);
      const resolvedAddvcd = row.addvcd?.trim() || inferShaoshanAddvcdFromTownLabel(row.region);
      editForm.setFieldsValue({
        ...row,
        addvcd: resolvedAddvcd || undefined,
        occurTime: dayjs(row.occurTime),
        reportTime: dayjs(row.reportTime),
        endDate: row.endDate ? dayjs(row.endDate) : undefined,
        eventImages: Array.isArray(row.eventImages) ? row.eventImages : [],
        eventDisposal: {
          ...(row.eventDisposal ?? { contactPhone: '', disposalDescribe: '', completedTime: '', images: [] }),
          completedTime: row.eventDisposal?.completedTime ? dayjs(row.eventDisposal.completedTime) : undefined,
          images: Array.isArray(row.eventDisposal?.images) ? row.eventDisposal!.images : [],
        },
      });
      setEditOpen(true);
    },
    [editForm],
  );

  /** 详情弹窗展示用：与列表 rows 同源，编辑保存后地图与经纬度等与表格一致 */
  const detailDisplay = useMemo(
    () => (detail ? rows.find(r => r.id === detail.id) ?? detail : null),
    [detail, rows],
  );

  const detailLinkedAssessments = useMemo(
    () => (detailDisplay ? assessments.filter(a => a.linkedEventId === detailDisplay.id) : []),
    [assessments, detailDisplay],
  );

  const selectedDetailAssessment = useMemo(() => {
    if (detailLinkedAssessments.length === 0) return null;
    if (detailAssessmentPickId) {
      return detailLinkedAssessments.find(a => a.id === detailAssessmentPickId) ?? detailLinkedAssessments[0];
    }
    return detailLinkedAssessments[0];
  }, [detailLinkedAssessments, detailAssessmentPickId]);

  const detailLinkedReviews = useMemo(
    () => (detailDisplay ? reviews.filter(r => r.linkedEventId === detailDisplay.id) : []),
    [reviews, detailDisplay],
  );

  const selectedDetailReview = useMemo(() => {
    if (detailLinkedReviews.length === 0) return null;
    if (detailReviewPickId) {
      return detailLinkedReviews.find(r => r.id === detailReviewPickId) ?? detailLinkedReviews[0];
    }
    return detailLinkedReviews[0];
  }, [detailLinkedReviews, detailReviewPickId]);

  const filtered = useMemo(() => {
    const eventTitleKw = String(query.eventTitleKw ?? '').trim();
    const eventCodeKw = String(query.eventCodeKw ?? '').trim();
    const locationKw = String(query.locationKw ?? '').trim();
    const sectionCodeKw = String(query.sectionCodeKw ?? '').trim();
    const addvcdFilter = query.addvcd as string | undefined;
    const disposalStatus = query.disposalStatus as string | undefined;
    const pollutionLevel = query.pollutionLevel as string | undefined;
    const problemType = query.problemType as string | undefined;
    const t0 = query.occurTimeStart as string | undefined;
    const t1 = query.occurTimeEnd as string | undefined;
    return rows.filter(r => {
      if (t0 && dayjs(r.occurTime).isBefore(dayjs(t0))) return false;
      if (t1 && dayjs(r.occurTime).isAfter(dayjs(t1))) return false;
      if (addvcdFilter && r.addvcd !== addvcdFilter) return false;
      if (disposalStatus && r.disposalStatus !== disposalStatus) return false;
      if (pollutionLevel && r.pollutionLevel !== pollutionLevel) return false;
      if (problemType && r.problemType !== problemType) return false;
      if (eventTitleKw && !String(r.eventTitle ?? '').includes(eventTitleKw)) return false;
      if (eventCodeKw && !String(r.eventCode ?? '').includes(eventCodeKw)) return false;
      if (locationKw && !String(r.location ?? '').includes(locationKw)) return false;
      if (sectionCodeKw && !`${String(r.sectionCode ?? '')}${getRiverLakeSectionLabel(r.sectionCode)}`.includes(sectionCodeKw)) return false;
      return true;
    });
  }, [rows, query]);

  const allCols: EcoColumnConfig[] = useMemo(
    () => [
      { key: 'eventCode', title: '事件编号', dataIndex: 'eventCode', width: 150, fixed: 'left' },
      { key: 'eventTitle', title: '事件名称', dataIndex: 'eventTitle', width: 200 },
      {
        key: 'sectionCode',
        title: '河段或湖泊编码',
        dataIndex: 'sectionCode',
        width: 260,
        ellipsis: true,
        defaultVisible: false,
        render: (v: unknown) => getRiverLakeSectionLabel(String(v ?? '')),
      },
      { key: 'problemType', title: '问题类型', dataIndex: 'problemType', width: 130 },
      { key: 'problemSource', title: '信息来源', dataIndex: 'problemSource', width: 100, defaultVisible: false },
      { key: 'occurTime', title: '事发时间', dataIndex: 'occurTime', width: 132 },
      { key: 'reportTime', title: '上报时间', dataIndex: 'reportTime', width: 132, defaultVisible: false },
      {
        key: 'addvcd',
        title: '所属区划',
        dataIndex: 'addvcd',
        width: 140,
        ellipsis: true,
        render: (_: unknown, rec: unknown) => {
          const r = rec as EmergencyEventRow;
          return r.addvcd?.trim() ? getShaoshanAddvcdLabel(r.addvcd) : r.region || '—';
        },
      },
      {
        key: 'pollutionLevel',
        title: '污染等级',
        dataIndex: 'pollutionLevel',
        width: 88,
        render: (t: unknown) => <Tag color={pollutionLevelColor[String(t)] ?? 'default'}>{String(t)}</Tag>,
      },
      {
        key: 'warningLevel',
        title: '预警级别',
        dataIndex: 'warningLevel',
        width: 88,
        render: (t: unknown) => <Tag color={warningLevelColor[String(t)] ?? 'default'}>{String(t)}</Tag>,
        defaultVisible: false,
      },
      {
        key: 'disposalStatus',
        title: '处置状态',
        dataIndex: 'disposalStatus',
        width: 100,
        render: (t: unknown) => <Tag color={disposalStatusColor[String(t)] ?? 'default'}>{String(t)}</Tag>,
      },
      { key: 'inchargePerson', title: '负责处理人', dataIndex: 'inchargePerson', width: 120, defaultVisible: false },
      { key: 'responsibleParty', title: '责任主体', dataIndex: 'responsibleParty', width: 180 },
      { key: 'location', title: '事发地点', dataIndex: 'location', width: 200 },
      { key: 'pollutionType', title: '特征污染', dataIndex: 'pollutionType', width: 130, defaultVisible: false },
      { key: 'impactScope', title: '影响范围', dataIndex: 'impactScope', width: 180, defaultVisible: false },
      { key: 'operation', title: '操作', width: 228, defaultVisible: true },
    ],
    [],
  );
  const [visibleCols, setVisibleCols] = useState(() => getEcoDefaultVisibleColumnKeys(allCols));
  const columns = useMemo(
    () =>
      buildTableColumnsFromEcoConfig(allCols, visibleCols, record => {
        const row = record as EmergencyEventRow;
        const disposalFilled = hasEmergencyEventDisposalFilled(row);
        const openDetailCommon = () => {
          const linked = assessments.filter(a => a.linkedEventId === row.id);
          setDetailAssessmentPickId(linked[0]?.id ?? null);
          const linkedRev = reviews.filter(r => r.linkedEventId === row.id);
          setDetailReviewPickId(linkedRev[0]?.id ?? null);
          setDetail(row);
          setDetailOpen(true);
        };
        return (
          <Space size="small">
          <Button
            type="link"
            size="small"
            className="action-btn detail"
            icon={<EyeOutlined />}
            onClick={() => {
              setDetailDefaultTab('basic');
              openDetailCommon();
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
                setDetailDefaultTab('disposal');
                openDetailCommon();
              } else {
                openEventEdit(row, 'disposal');
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
            onClick={() => openEventEdit(row, 'basic')}
          >
            编辑
          </Button>
        </Space>
        );
      }),
    [allCols, visibleCols, assessments, reviews, openEventEdit],
  );

  const handleSearch = () => {
    const v = filterForm.getFieldsValue() as {
      eventTitleKw?: string;
      eventCodeKw?: string;
      locationKw?: string;
      sectionCodeKw?: string;
      addvcd?: string;
      disposalStatus?: string;
      pollutionLevel?: string;
      problemType?: string;
      occurTimeRange?: [dayjs.Dayjs, dayjs.Dayjs] | null;
    };
    const range = v.occurTimeRange;
    setQuery({
      eventTitleKw: (v.eventTitleKw ?? '').trim(),
      eventCodeKw: (v.eventCodeKw ?? '').trim(),
      locationKw: (v.locationKw ?? '').trim(),
      sectionCodeKw: (v.sectionCodeKw ?? '').trim(),
      addvcd: v.addvcd,
      disposalStatus: v.disposalStatus,
      pollutionLevel: v.pollutionLevel,
      problemType: v.problemType,
      occurTimeStart: range?.[0]?.format('YYYY-MM-DD HH:mm:ss'),
      occurTimeEnd: range?.[1]?.format('YYYY-MM-DD HH:mm:ss'),
    });
    message.success('已查询');
  };

  const handleReset = () => {
    filterForm.resetFields();
    setQuery({});
    message.info('已重置筛选条件');
  };

  const save = async () => {
    const v = await editForm.validateFields();
    const occurTimeStr = (v.occurTime as dayjs.Dayjs).format('YYYY-MM-DD HH:mm');
    const reportTimeStr = (v.reportTime as dayjs.Dayjs).format('YYYY-MM-DD HH:mm');
    const endD = v.endDate as dayjs.Dayjs | undefined | null;
    const endDateStr = endD ? dayjs(endD).format('YYYY-MM-DD') : '';
    const ed = (v.eventDisposal ?? {}) as Record<string, unknown>;
    const ct = ed.completedTime;
    const completedTimeStr =
      ct != null && dayjs.isDayjs(ct)
        ? (ct as dayjs.Dayjs).format('YYYY-MM-DD HH:mm')
        : typeof ct === 'string'
          ? ct
          : '';
    const rawEventImgs = v.eventImages;
    const eventImages: string[] = Array.isArray(rawEventImgs)
      ? rawEventImgs.filter((x): x is string => typeof x === 'string')
      : [];
    const imgs = ed.images;
    const images: string[] = Array.isArray(imgs) ? imgs.filter((x): x is string => typeof x === 'string') : [];
    const eventDisposal: EmergencyEventDisposal = {
      contactPhone: String(ed.contactPhone ?? ''),
      disposalDescribe: String(ed.disposalDescribe ?? editing?.eventDisposal?.disposalDescribe ?? ''),
      completedTime: completedTimeStr,
      images,
    };
    const payload: EmergencyEventRow = {
      id: editing?.id ?? `evt-${Date.now()}`,
      eventCode: editing ? editing.eventCode : generateNextEventCode(rows),
      eventTitle: v.eventTitle,
      sectionCode: typeof v.sectionCode === 'string' ? v.sectionCode : String(v.sectionCode ?? ''),
      problemType: v.problemType,
      problemSource: v.problemSource,
      occurTime: occurTimeStr,
      reportTime: reportTimeStr,
      addvcd: String(v.addvcd ?? '').trim(),
      region: getShaoshanAddvcdLabel(String(v.addvcd ?? '').trim()) !== '—' ?
          getShaoshanAddvcdLabel(String(v.addvcd ?? '').trim())
        : String(v.region ?? ''),
      location: v.location,
      longitude: v.longitude,
      latitude: v.latitude,
      situationDescribe: v.situationDescribe,
      pollutionType: v.pollutionType,
      impactScope: v.impactScope,
      cause: v.cause,
      pollutionLevel: v.pollutionLevel,
      warningLevel: v.warningLevel,
      reporterName: v.reporterName,
      reporterPhone: v.reporterPhone,
      inchargePerson: v.inchargePerson,
      responsibleParty: v.responsibleParty,
      nativeProcessing: v.nativeProcessing,
      disposalStatus: v.disposalStatus,
      disposalProgress: v.disposalProgress,
      measuresTaken: v.measuresTaken,
      teamsUsage: v.teamsUsage,
      materialsUsage: v.materialsUsage,
      waterRecovery: v.waterRecovery,
      eventResult: v.eventResult,
      endDate: endDateStr,
      eventImages,
      eventDisposal,
    };
    if (editing) {
      setRows(prev => prev.map(r => (r.id === editing.id ? payload : r)));
      if (detail?.id === editing.id) {
        setDetail(payload);
      }
      message.success('已保存');
    } else {
      setRows(prev => [...prev, payload]);
      message.success('已新增');
    }
    closeEdit();
  };

  const del = () => {
    if (!editing) return;
    setRows(prev => prev.filter(r => r.id !== editing.id));
    if (detail?.id === editing.id) {
      setDetail(null);
      setDetailOpen(false);
      setDetailAssessmentPickId(null);
      setDetailReviewPickId(null);
    }
    message.success('已删除');
    closeEdit();
  };

  const openCreate = () => {
    setEditing(null);
    editForm.resetFields();
    setEventEditTab('basic');
    editForm.setFieldsValue({
      occurTime: dayjs(),
      reportTime: dayjs(),
      pollutionLevel: '一般',
      warningLevel: '蓝色',
      disposalStatus: '接报核实',
      nativeProcessing: '否',
      problemType: '水体污染（含突发）',
      problemSource: '电话投诉',
      sectionCode: undefined,
      addvcd: '430382100000',
      longitude: '',
      latitude: '',
      situationDescribe: '',
      reporterName: '',
      reporterPhone: '',
      inchargePerson: '',
      responsibleParty: '',
      disposalProgress: '',
      measuresTaken: '',
      teamsUsage: '',
      materialsUsage: '',
      waterRecovery: '',
      eventResult: '',
      eventImages: [],
      eventDisposal: {
        contactPhone: '',
        disposalDescribe: '',
        completedTime: undefined,
        images: [],
      },
    });
    setEditOpen(true);
  };

  return (
    <div className="facility-view">
      <Card
        title="应急事件信息"
        extra={
          <Space wrap size={[8, 8]} align="center">
            <EcoProtoExportBtn
              onClick={() =>
                exportEmergencyTableExcel(
                  filtered as unknown as Record<string, unknown>[],
                  allCols,
                  '应急协同_应急事件信息',
                  '应急事件',
                )
              }
            />
            <EcoProtoImportBtn />
            <EcoColumnManager columns={allCols} visibleColumns={visibleCols} onChange={setVisibleCols} />
            <Button type="primary" icon={<PlusOutlined />} className="add-btn" onClick={openCreate}>
              新增
            </Button>
          </Space>
        }
      >
        <Form form={filterForm}>
          <Row gutter={[16, 12]} style={{ marginBottom: 16 }} align="middle">
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="addvcd" style={{ marginBottom: 0 }}>
                <Select
                  allowClear
                  placeholder="所属区划"
                  optionFilterProp="label"
                  showSearch
                  style={{ width: '100%' }}
                  options={SHAOSHAN_ADDVCD_OPTIONS}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="problemType" style={{ marginBottom: 0 }}>
                <Select allowClear placeholder="问题类型" optionFilterProp="label" showSearch style={{ width: '100%' }} options={[...REPORT_PROBLEM_TYPE_OPTIONS].map(x => ({ value: x, label: x }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="disposalStatus" style={{ marginBottom: 0 }}>
                <Select allowClear placeholder="处置状态" optionFilterProp="label" showSearch style={{ width: '100%' }} options={[...DISPOSAL_STATUS_OPTIONS].map(x => ({ value: x, label: x }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="pollutionLevel" style={{ marginBottom: 0 }}>
                <Select allowClear placeholder="污染等级" optionFilterProp="label" showSearch style={{ width: '100%' }} options={[...POLLUTION_LEVEL_OPTIONS].map(x => ({ value: x, label: x }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="eventTitleKw" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="事件名称" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="locationKw" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="事发地点" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="eventCodeKw" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="事件编号" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="sectionCodeKw" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="河段或湖泊编码" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={8}>
              <Form.Item name="occurTimeRange" style={{ marginBottom: 0 }}>
                <RangePicker showTime style={{ width: '100%' }} placeholder={['事发时间起', '事发时间止']} />
              </Form.Item>
            </Col>
            <Col xs={24} lg={24} style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
          <Table
            rowKey="id"
            size="small"
            scroll={{ x: getEcoTableScrollX(allCols.filter(c => visibleCols.includes(c.key) || c.key === 'operation')) }}
            pagination={{ defaultPageSize: 10, showTotal: t => `共 ${t} 条` }}
            columns={columns}
            dataSource={filtered}
          />
        </div>
      </Card>
      <Modal
        title={`应急事件详情${detailDisplay ? ` — ${detailDisplay.eventCode}` : ''}`}
        open={detailOpen}
        onCancel={() => {
          setDetailOpen(false);
          setDetail(null);
          setDetailAssessmentPickId(null);
          setDetailReviewPickId(null);
          setDetailDefaultTab('basic');
        }}
        width={960}
        footer={null}
        destroyOnClose
        styles={detailModalStyles}
      >
        {detailDisplay && (
          <DetailTabsIfMultiple
            key={`${detailDisplay.id}-${detailDefaultTab}`}
            size="small"
            defaultActiveKey={detailDefaultTab}
            className="facility-detail-tabs facility-event-detail-tabs"
            items={[
              {
                key: 'basic',
                label: '基本信息',
                children: (
                  <>
                    <Descriptions bordered column={2} size="small" title="登记与位置信息">
                      <Descriptions.Item label="事件编号" span={2}>
                        <Text strong>{detailDisplay.eventCode}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="事件名称" span={2}>
                        {detailDisplay.eventTitle}
                      </Descriptions.Item>
                      <Descriptions.Item label="河段或湖泊编码" span={2}>
                        {getRiverLakeSectionLabel(detailDisplay.sectionCode)}
                      </Descriptions.Item>
                      <Descriptions.Item label="问题类型">{detailDisplay.problemType}</Descriptions.Item>
                      <Descriptions.Item label="信息来源">{detailDisplay.problemSource}</Descriptions.Item>
                      <Descriptions.Item label="事发时间">{detailDisplay.occurTime}</Descriptions.Item>
                      <Descriptions.Item label="上报时间">{detailDisplay.reportTime}</Descriptions.Item>
                      <Descriptions.Item label="上报人">{detailDisplay.reporterName}</Descriptions.Item>
                      <Descriptions.Item label="上报人联系电话">{detailDisplay.reporterPhone}</Descriptions.Item>
                      <Descriptions.Item label="所属区划">
                        {detailDisplay.addvcd?.trim() ?
                          getShaoshanAddvcdLabel(detailDisplay.addvcd)
                        : detailDisplay.region || '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="事发地点" span={2}>
                        {detailDisplay.location}
                      </Descriptions.Item>
                      <Descriptions.Item label="事发经度（度）">{detailDisplay.longitude || '—'}</Descriptions.Item>
                      <Descriptions.Item label="事发纬度（度）">{detailDisplay.latitude || '—'}</Descriptions.Item>
                      <Descriptions.Item label="事发位置地图" span={2}>
                        <EmergencyEventDetailMap
                          longitude={detailDisplay.longitude}
                          latitude={detailDisplay.latitude}
                          eventTitle={detailDisplay.eventTitle}
                          location={detailDisplay.location}
                        />
                      </Descriptions.Item>
                      <Descriptions.Item label="情况描述" span={2}>
                        {detailDisplay.situationDescribe}
                      </Descriptions.Item>
                      <Descriptions.Item label="特征污染物或类型" span={2}>
                        {detailDisplay.pollutionType}
                      </Descriptions.Item>
                      <Descriptions.Item label="影响范围" span={2}>
                        {detailDisplay.impactScope}
                      </Descriptions.Item>
                      <Descriptions.Item label="事发原因" span={2}>
                        {detailDisplay.cause}
                      </Descriptions.Item>
                      <Descriptions.Item label="事件图片" span={2}>
                        {detailDisplay.eventImages && detailDisplay.eventImages.length > 0 ? (
                          <Image.PreviewGroup>
                            <Space wrap size={4}>
                              {detailDisplay.eventImages.map((url, i) => (
                                <Image key={i} src={url} width={48} height={48} style={{ objectFit: 'cover' }} alt={`事件图${i + 1}`} />
                              ))}
                            </Space>
                          </Image.PreviewGroup>
                        ) : (
                          '—'
                        )}
                      </Descriptions.Item>
                    </Descriptions>
                  </>
                ),
              },
              {
                key: 'disposal',
                label: '事件处置',
                children: (
                  <Descriptions bordered column={2} size="small">
                    <Descriptions.Item label="负责处理人">{detailDisplay.inchargePerson}</Descriptions.Item>
                    <Descriptions.Item label="是否自行先期处置">{detailDisplay.nativeProcessing}</Descriptions.Item>
                    <Descriptions.Item label="联系电话">{detailDisplay.eventDisposal?.contactPhone || '—'}</Descriptions.Item>
                    <Descriptions.Item label="处置完成时间">{detailDisplay.eventDisposal?.completedTime || '—'}</Descriptions.Item>
                    <Descriptions.Item label="办结日期">{detailDisplay.endDate || '—'}</Descriptions.Item>
                    <Descriptions.Item label="责任主体" span={2}>
                      {detailDisplay.responsibleParty}
                    </Descriptions.Item>
                    <Descriptions.Item label="处置进展" span={2}>
                      {detailDisplay.disposalProgress}
                    </Descriptions.Item>
                    <Descriptions.Item label="已采取应急措施" span={2}>
                      {detailDisplay.measuresTaken}
                    </Descriptions.Item>
                    <Descriptions.Item label="队伍使用情况" span={2}>
                      {detailDisplay.teamsUsage}
                    </Descriptions.Item>
                    <Descriptions.Item label="物资使用情况" span={2}>
                      {detailDisplay.materialsUsage}
                    </Descriptions.Item>
                    <Descriptions.Item label="水质恢复状况" span={2}>
                      {detailDisplay.waterRecovery}
                    </Descriptions.Item>
                    <Descriptions.Item label="事件结果" span={2}>
                      {detailDisplay.eventResult}
                    </Descriptions.Item>
                    <Descriptions.Item label="处置图片" span={2}>
                      {detailDisplay.eventDisposal?.images && detailDisplay.eventDisposal.images.length > 0 ? (
                        <Image.PreviewGroup>
                          <Space wrap size={4}>
                            {detailDisplay.eventDisposal.images.map((url, i) => (
                              <Image key={i} src={url} width={48} height={48} style={{ objectFit: 'cover' }} alt={`处置图${i + 1}`} />
                            ))}
                          </Space>
                        </Image.PreviewGroup>
                      ) : (
                        '—'
                      )}
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: 'assessment',
                label: '事件评估',
                children:
                  detailLinkedAssessments.length === 0 ? (
                    <Empty style={{ margin: '24px 0' }} description="暂无关联本事件的评估记录（请在「事件评估」菜单中维护并关联本事件）" />
                  ) : (
                    <div style={{ marginTop: 8 }}>
                      {detailLinkedAssessments.length > 1 ? (
                        <div style={{ marginBottom: 16, maxWidth: 480 }}>
                          <Select
                            value={detailAssessmentPickId ?? selectedDetailAssessment?.id}
                            onChange={id => setDetailAssessmentPickId(id)}
                            style={{ width: '100%' }}
                            options={detailLinkedAssessments.map(a => ({
                              value: a.id,
                              label: `${a.assessmentCode}（${a.assessTime}）`,
                            }))}
                          />
                        </div>
                      ) : null}
                      {selectedDetailAssessment ? (
                        <Descriptions
                          key={selectedDetailAssessment.id}
                          bordered
                          column={2}
                          size="small"
                          style={{ marginTop: detailLinkedAssessments.length > 1 ? 0 : 8 }}
                          title="评估信息"
                        >
                          <Descriptions.Item label="评估编号" span={2}>
                            <Text strong>{selectedDetailAssessment.assessmentCode}</Text>
                          </Descriptions.Item>
                          <Descriptions.Item label="评估日期">{selectedDetailAssessment.assessTime || '—'}</Descriptions.Item>
                          <Descriptions.Item label="评估单位">{selectedDetailAssessment.assessOrg || '—'}</Descriptions.Item>
                          <Descriptions.Item label="总体评估" span={2}>
                            {selectedDetailAssessment.overallAssessment || '—'}
                          </Descriptions.Item>
                          <Descriptions.Item label="人员损害" span={2}>
                            {selectedDetailAssessment.personnelDamage || '—'}
                          </Descriptions.Item>
                          <Descriptions.Item label="财产损害" span={2}>
                            {selectedDetailAssessment.propertyDamage || '—'}
                          </Descriptions.Item>
                          <Descriptions.Item label="污染损害评估" span={2}>
                            {selectedDetailAssessment.pollutionDamageAssessment || '—'}
                          </Descriptions.Item>
                          <Descriptions.Item label="生态环境损害评估" span={2}>
                            {selectedDetailAssessment.ecoDamageAssessment || '—'}
                          </Descriptions.Item>
                          <Descriptions.Item label="评估附件" span={2}>
                            {selectedDetailAssessment.attachmentFileName || selectedDetailAssessment.pdfUrl ?
                              <Space wrap align="center">
                                <Text>{selectedDetailAssessment.attachmentFileName || '附件'}</Text>
                                {selectedDetailAssessment.pdfUrl ?
                                  <>
                                    <Button
                                      type="link"
                                      className="action-btn detail"
                                      href={selectedDetailAssessment.pdfUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      查看
                                    </Button>
                                    <Button
                                      type="link"
                                      className="action-btn detail"
                                      href={selectedDetailAssessment.pdfUrl}
                                      download={selectedDetailAssessment.attachmentFileName || '评估附件'}
                                    >
                                      下载
                                    </Button>
                                  </>
                                : null}
                              </Space>
                            : '—'}
                          </Descriptions.Item>
                        </Descriptions>
                      ) : null}
                    </div>
                  ),
              },
              {
                key: 'review',
                label: '事件复盘',
                children:
                  detailLinkedReviews.length === 0 ? (
                    <Empty style={{ margin: '24px 0' }} description="暂无关联本事件的事件复盘（请在「事件复盘」菜单中登记并关联本事件）" />
                  ) : (
                    <div style={{ marginTop: 8 }}>
                      {detailLinkedReviews.length > 1 ? (
                        <div style={{ marginBottom: 16, maxWidth: 480 }}>
                          <Select
                            value={detailReviewPickId ?? selectedDetailReview?.id}
                            onChange={id => setDetailReviewPickId(id)}
                            style={{ width: '100%' }}
                            options={detailLinkedReviews.map(r => ({
                              value: r.id,
                              label: `${r.reviewCode}（${r.reviewTime}）`,
                            }))}
                          />
                        </div>
                      ) : null}
                      {selectedDetailReview && detailDisplay ? (
                        <EventReviewDetailBody
                          key={selectedDetailReview.id}
                          detail={selectedDetailReview}
                          linkedEvent={detailDisplay}
                          linkedAssessment={assessments.find(a => a.id === selectedDetailReview.linkedAssessmentId)}
                          experts={experts}
                          socialPoints={socialPoints}
                        />
                      ) : null}
                    </div>
                  ),
              },
            ]}
          />
        )}
      </Modal>
      <Modal
        title={editing ? '编辑应急事件' : '新增应急事件'}
        open={editOpen}
        width={920}
        onCancel={closeEdit}
        destroyOnClose
        styles={formModalStyles}
        footer={
          <Space>
            {editing ? (
              <Popconfirm title="确认删除？" onConfirm={del}>
                <Button danger>删除</Button>
              </Popconfirm>
            ) : null}
            <Button className="secondary-btn" onClick={closeEdit}>取消</Button>
            <Button type="primary" onClick={() => void save()}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={editForm} layout="vertical" preserve={false}>
          <Tabs
            activeKey={eventEditTab}
            onChange={setEventEditTab}
            size="small"
            className="facility-detail-tabs facility-event-edit-tabs"
            items={[
              {
                key: 'basic',
                label: '基本信息',
                children: (
                  <Row gutter={[16, 0]}>
                    <Col xs={24} sm={12}>
                      {/* 与生态整治「河湖长制 — 事务列表」事务编号栏一致：只读 Input + extra 规则说明 */}
                      <Form.Item
                        label="事件编号"
                        extra={
                          <Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 4, fontSize: 12 }}>
                            保存时按「水应〔年〕MMDD-序号」规则自动生成
                          </Paragraph>
                        }
                        style={{ marginBottom: 12 }}
                      >
                        <Input readOnly placeholder="保存后显示编号" value={editing?.eventCode ?? ''} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="eventTitle" label="事件名称" rules={[{ required: true, message: '请填写事件名称' }]} style={{ marginBottom: 12 }}>
                        <Input placeholder="简要概括事件" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={24}>
                      <Form.Item name="sectionCode" label="河段或湖泊编码" rules={[{ required: true, message: '请选择河流或湖泊对象' }]} style={{ marginBottom: 12 }}>
                        <Select
                          showSearch
                          allowClear
                          optionFilterProp="label"
                          placeholder="选自生态整治「河道水体」河流/湖泊主数据"
                          options={RIVER_LAKE_SECTION_SELECT_OPTIONS}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={24}>
                      <Form.Item name="addvcd" label="所属区划" rules={[{ required: true, message: '请选择所属区划' }]} style={{ marginBottom: 12 }}>
                        <Select
                          showSearch
                          optionFilterProp="label"
                          placeholder="韶山市及下辖乡镇（街道）"
                          options={SHAOSHAN_ADDVCD_OPTIONS}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="problemType" label="问题类型" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                        <Select placeholder="请选择" options={[...REPORT_PROBLEM_TYPE_OPTIONS].map(x => ({ value: x, label: x }))} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="problemSource" label="信息来源" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                        <Select placeholder="请选择" options={[...REPORT_PROBLEM_SOURCE_OPTIONS].map(x => ({ value: x, label: x }))} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="pollutionLevel" label="污染等级" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                        <Select options={[...POLLUTION_LEVEL_OPTIONS].map(x => ({ value: x, label: x }))} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="warningLevel" label="预警级别" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                        <Select options={[...WARNING_LEVEL_OPTIONS].map(x => ({ value: x, label: x }))} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="reporterName" label="上报人" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="reporterPhone" label="上报人联系电话" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="occurTime" label="事发时间" rules={[{ required: true, message: '请选择事发时间' }]} style={{ marginBottom: 12 }}>
                        <DatePicker showTime style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="reportTime" label="上报时间" rules={[{ required: true, message: '请选择上报时间' }]} style={{ marginBottom: 12 }}>
                        <DatePicker showTime style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item
                        name="location"
                        label="事发地点"
                        rules={[{ required: true, message: '请输入事发地点' }]}
                        style={{ marginBottom: 12 }}
                        extra={
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            可点击地图选点，系统将尝试按坐标逆地理解析并自动填入；也可随时在本框手动输入或修改地址描述。
                          </Text>
                        }
                      >
                        <Input placeholder="地图选点自动解析，或手动输入事发地点" />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item label="事发位置地图" colon={false} style={{ marginBottom: 12 }}>
                        <EmergencyMapLocationPicker form={editForm} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="longitude"
                        label="事发经度（度）"
                        rules={[{ required: true, message: '请填写经度' }]}
                        tooltip="可与地图选点同步"
                        style={{ marginBottom: 12 }}
                      >
                        <Input placeholder="地图选点后自动回填，可手动修改（建议六位小数）" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="latitude"
                        label="事发纬度（度）"
                        rules={[{ required: true, message: '请填写纬度' }]}
                        tooltip="可与地图选点同步"
                        style={{ marginBottom: 12 }}
                      >
                        <Input placeholder="地图选点后自动回填，可手动修改（建议六位小数）" />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="pollutionType" label="特征污染物或污染类型" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                        <Input placeholder="如石油类、高浊度等" />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="impactScope" label="影响范围" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                        <TextArea rows={2} placeholder="河段里程、敏感目标、供水人口等" />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="situationDescribe" label="情况描述" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                        <TextArea rows={3} placeholder="现场情况、感官特征、监测线索等" />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="cause" label="事发原因" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                        <TextArea rows={2} placeholder="初步或核实后的原因说明" />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="eventImages" label="事件图片" style={{ marginBottom: 12 }}>
                        <DataUrlImageCardUpload
                          listKey="event"
                          fileNamePrefix="事件图"
                          uploadLabel="上传照片"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'disposal',
                label: '事件处置',
                children: (
                  <Row gutter={[16, 0]}>
                    <Col xs={24} sm={12}>
                      <Form.Item name="disposalStatus" label="处置状态" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                        <Select options={[...DISPOSAL_STATUS_OPTIONS].map(x => ({ value: x, label: x }))} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="inchargePerson" label="负责处理人" rules={[{ required: true, message: '请填写负责处理人' }]} style={{ marginBottom: 12 }}>
                        <Input placeholder="当前牵头处置责任人" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="nativeProcessing" label="是否自行先期处置" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                        <Select options={[...NATIVE_PROCESSING_OPTIONS].map(x => ({ value: x, label: x }))} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name={['eventDisposal', 'contactPhone']} label="联系电话" rules={[{ required: true, message: '请填写联系电话' }]} style={{ marginBottom: 12 }}>
                        <Input placeholder="手机或座机" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name={['eventDisposal', 'completedTime']} label="处置完成时间" rules={[{ required: true, message: '请选择处置完成时间' }]} style={{ marginBottom: 12 }}>
                        <DatePicker showTime style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="responsibleParty" label="责任主体" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                        <Input placeholder="牵头单位与协同部门" />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="disposalProgress" label="处置进展" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                        <TextArea rows={3} placeholder="动态更新现场与调度进展" />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="measuresTaken" label="已采取应急措施" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                        <TextArea rows={3} />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="teamsUsage" label="队伍使用情况" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                        <TextArea rows={2} />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="materialsUsage" label="物资使用情况" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                        <TextArea rows={2} />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="waterRecovery" label="水质恢复状况" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                        <TextArea rows={2} />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="eventResult" label="事件结果" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                        <TextArea rows={2} placeholder="终止响应、调查结论、移交与复盘要点" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="endDate" label="办结日期" style={{ marginBottom: 12 }}>
                        <DatePicker style={{ width: '100%' }} placeholder="可选" />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name={['eventDisposal', 'images']} label="处置图片" style={{ marginBottom: 12 }}>
                        <DataUrlImageCardUpload
                          listKey="disposal"
                          fileNamePrefix="处置图"
                          uploadLabel="上传照片"
                        />
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

// ========== 事件评估（精简） ==========
interface EventAssessmentPageProps {
  events: EmergencyEventRow[];
  assessments: EventAssessmentRow[];
  onAssessmentsChange: React.Dispatch<React.SetStateAction<EventAssessmentRow[]>>;
}

/** 事件评估新增/编辑：与「应急事件信息」编辑弹窗相同的栅格与表单项样式类 */
const EVENT_ASSESSMENT_EDIT_FORM_ROW_GUTTER: [number, number] = [16, 0];

const EventAssessmentPage: React.FC<EventAssessmentPageProps> = ({ events, assessments: rows, onAssessmentsChange: setRows }) => {
  const [filterForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<EventAssessmentRow | null>(null);
  const [detail, setDetail] = useState<EventAssessmentRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [query, setQuery] = useState<Record<string, unknown>>({});
  /** 评估附件：文件地址（远程 URL 或本地上传 data URL）与展示文件名，与表单其它字段分离避免超大字符串进 Form store */
  const [assessAttach, setAssessAttach] = useState<{ url: string | null; name: string }>({ url: null, name: '' });

  const filtered = useMemo(() => {
    const region = String(query.region ?? '').trim();
    const assessOrg = String(query.assessOrg ?? '').trim();
    const eventTitle = String(query.eventTitle ?? '').trim();
    const assessmentCode = String(query.assessmentCode ?? '').trim();
    const eventCode = String(query.eventCode ?? '').trim();
    const t0 = query.assessTimeStart as string | undefined;
    const t1 = query.assessTimeEnd as string | undefined;
    return rows.filter(r => {
      const linkedEvent = events.find(e => e.id === r.linkedEventId);
      if (region && String(linkedEvent?.addvcd ?? '').trim() !== region) return false;
      if (assessOrg && !String(r.assessOrg ?? '').includes(assessOrg)) return false;
      if (eventTitle && !String(linkedEvent?.eventTitle ?? '').includes(eventTitle)) return false;
      if (assessmentCode && !String(r.assessmentCode ?? '').includes(assessmentCode)) return false;
      if (eventCode && !String(linkedEvent?.eventCode ?? '').includes(eventCode)) return false;
      if (t0 && dayjs(r.assessTime).isBefore(dayjs(t0))) return false;
      if (t1 && dayjs(r.assessTime).isAfter(dayjs(t1))) return false;
      return true;
    });
  }, [rows, query, events]);

  const closeEdit = useCallback(() => {
    setEditOpen(false);
    setEditing(null);
    editForm.resetFields();
    setAssessAttach({ url: null, name: '' });
  }, [editForm]);

  const assessmentAttachFileList: UploadFile[] = useMemo(
    () =>
      assessAttach.name ?
        [{ uid: 'assessment-attach', name: assessAttach.name, status: 'done' }]
      : [],
    [assessAttach.name],
  );

  const save = async () => {
    const v = await editForm.validateFields();
    if (!assessAttach.url?.trim()) {
      message.error('请上传评估附件');
      return;
    }
    const attachName = assessAttach.name.trim();
    if (!attachName) {
      message.error('请上传文件以生成附件名称');
      return;
    }
    const payload: EventAssessmentRow = {
      id: editing?.id ?? `asr-${Date.now()}`,
      linkedEventId: v.linkedEventId,
      assessmentCode: v.assessmentCode,
      assessTime: (v.assessTime as dayjs.Dayjs).format('YYYY-MM-DD'),
      assessOrg: v.assessOrg,
      overallAssessment: v.overallAssessment,
      personnelDamage: v.personnelDamage ?? '',
      propertyDamage: v.propertyDamage ?? '',
      pollutionDamageAssessment: v.pollutionDamageAssessment ?? '',
      ecoDamageAssessment: v.ecoDamageAssessment ?? '',
      pdfUrl: assessAttach.url.trim(),
      attachmentFileName: attachName,
    };
    if (editing) setRows(prev => prev.map(r => (r.id === editing.id ? payload : r)));
    else setRows(prev => [...prev, payload]);
    message.success(editing ? '已保存' : '已新增');
    closeEdit();
  };

  const columns: ColumnsType<EventAssessmentRow> = [
    { title: '评估编号', dataIndex: 'assessmentCode', width: 160 },
    { title: '关联事件', dataIndex: 'linkedEventId', width: 220, ellipsis: true, render: (id: string) => events.find(e => e.id === id)?.eventTitle ?? id },
    { title: '评估日期', dataIndex: 'assessTime', width: 120 },
    {
      title: '操作',
      key: 'op',
      width: 148,
      render: (_, r) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            className="action-btn detail"
            icon={<EyeOutlined />}
            onClick={() => {
              setDetail(r);
              setDetailOpen(true);
            }}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            className="action-btn edit"
            icon={<EditOutlined />}
            onClick={() => {
              setEditing(r);
              setAssessAttach({ url: r.pdfUrl, name: r.attachmentFileName });
              const { pdfUrl: _pu, attachmentFileName: _af, ...rest } = r;
              editForm.setFieldsValue({ ...rest, assessTime: dayjs(r.assessTime) });
              setEditOpen(true);
            }}
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  const linkedEventTitle = detail ? events.find(e => e.id === detail.linkedEventId)?.eventTitle ?? detail.linkedEventId : '';

  return (
    <div className="facility-view">
      <Card
        title="事件评估"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="add-btn"
            onClick={() => {
              setEditing(null);
              editForm.resetFields();
              setAssessAttach({ url: null, name: '' });
              setEditOpen(true);
            }}
          >
            新增
          </Button>
        }
      >
        <Form form={filterForm} style={{ marginBottom: 12 }}>
          <Row gutter={[16, 12]} align="middle">
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="region" style={{ marginBottom: 0 }}>
                <Select
                  allowClear
                  placeholder="所属区域"
                  optionFilterProp="label"
                  showSearch
                  style={{ width: '100%' }}
                  options={SHAOSHAN_ADDVCD_OPTIONS}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="assessOrg" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="评估单位" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="eventTitle" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="事件名称" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="assessmentCode" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="评估编号" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="eventCode" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="事件编号" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={16} lg={8}>
              <Form.Item name="assessTimeRange" style={{ marginBottom: 0 }}>
                <RangePicker style={{ width: '100%' }} placeholder={['评估日期起', '评估日期止']} />
              </Form.Item>
            </Col>
            <Col xs={24} style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Space>
                <Button
                  type="primary"
                  className="search-btn"
                  icon={<SearchOutlined />}
                  onClick={() => {
                    const v = filterForm.getFieldsValue() as {
                      region?: string;
                      assessOrg?: string;
                      eventTitle?: string;
                      assessmentCode?: string;
                      eventCode?: string;
                      assessTimeRange?: [dayjs.Dayjs, dayjs.Dayjs] | null;
                    };
                    const range = v.assessTimeRange;
                    setQuery({
                      region: v.region,
                      assessOrg: (v.assessOrg ?? '').trim(),
                      eventTitle: (v.eventTitle ?? '').trim(),
                      assessmentCode: (v.assessmentCode ?? '').trim(),
                      eventCode: (v.eventCode ?? '').trim(),
                      assessTimeStart: range?.[0]?.format('YYYY-MM-DD'),
                      assessTimeEnd: range?.[1]?.format('YYYY-MM-DD'),
                    });
                    message.success('已查询');
                  }}
                >
                  查询
                </Button>
                <Button
                  className="secondary-btn"
                  onClick={() => {
                    filterForm.resetFields();
                    setQuery({});
                    message.info('已重置');
                  }}
                >
                  重置
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
        <div className="facility-table-wrap">
          <Table rowKey="id" size="small" columns={columns} dataSource={filtered} pagination={{ defaultPageSize: 10, showTotal: t => `共 ${t} 条` }} />
        </div>
      </Card>
      <Modal
        title="评估详情"
        open={detailOpen}
        onCancel={() => {
          setDetailOpen(false);
          setDetail(null);
        }}
        footer={null}
        width={920}
        destroyOnClose
        styles={detailModalStyles}
      >
        {detail && (
          <Descriptions bordered column={2} size="small" style={{ marginTop: 8 }} title="评估信息">
            <Descriptions.Item label="评估编号" span={2}>
              <Text strong>{detail.assessmentCode}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="关联应急事件" span={2}>
              {linkedEventTitle}
            </Descriptions.Item>
            <Descriptions.Item label="评估日期">{detail.assessTime || '—'}</Descriptions.Item>
            <Descriptions.Item label="评估单位">{detail.assessOrg || '—'}</Descriptions.Item>
            <Descriptions.Item label="总体评估" span={2}>
              {detail.overallAssessment || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="人员损害" span={2}>
              {detail.personnelDamage || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="财产损害" span={2}>
              {detail.propertyDamage || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="污染损害评估" span={2}>
              {detail.pollutionDamageAssessment || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="生态环境损害评估" span={2}>
              {detail.ecoDamageAssessment || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="评估附件" span={2}>
              {detail.attachmentFileName || detail.pdfUrl ?
                <Space wrap align="center">
                  <Text>{detail.attachmentFileName || '附件'}</Text>
                  {detail.pdfUrl ?
                    <>
                      <Button type="link" className="action-btn detail" href={detail.pdfUrl} target="_blank" rel="noopener noreferrer">
                        查看
                      </Button>
                      <Button type="link" className="action-btn detail" href={detail.pdfUrl} download={detail.attachmentFileName || '评估附件'}>
                        下载
                      </Button>
                    </>
                  : null}
                </Space>
              : '—'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
      <Modal
        title={editing ? '编辑评估' : '新增评估'}
        open={editOpen}
        onCancel={closeEdit}
        width={920}
        destroyOnClose
        styles={formModalStyles}
        footer={
          <Space>
            <Button className="secondary-btn" onClick={closeEdit}>
              取消
            </Button>
            <Button type="primary" onClick={() => void save()}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={editForm} layout="vertical" preserve={false} className="risk-ident-edit-form">
          <Row gutter={EVENT_ASSESSMENT_EDIT_FORM_ROW_GUTTER}>
            <Col xs={24} sm={24}>
              <Form.Item name="linkedEventId" label="关联应急事件" rules={[{ required: true, message: '请选择关联应急事件' }]}>
                <Select
                  style={{ width: '100%' }}
                  options={events.map(e => ({ value: e.id, label: `${e.eventCode} ${e.eventTitle}` }))}
                  showSearch
                  optionFilterProp="label"
                  placeholder="下拉搜索事件编号或名称"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="assessmentCode" label="评估编号" rules={[{ required: true, message: '请填写评估编号' }]}>
                <Input placeholder="如 PG-2025-0315-01" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="assessTime" label="评估日期" rules={[{ required: true, message: '请选择评估日期' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24}>
              <Form.Item name="assessOrg" label="评估单位" rules={[{ required: true, message: '请填写评估单位' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24}>
              <Form.Item name="overallAssessment" label="总体评估" rules={[{ required: true, message: '请填写总体评估' }]}>
                <TextArea rows={3} placeholder="响应、处置与影响控制的总体结论" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24}>
              <Form.Item name="personnelDamage" label="人员损害">
                <TextArea rows={2} placeholder="无则填「无」或简述" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24}>
              <Form.Item name="propertyDamage" label="财产损害">
                <TextArea rows={2} placeholder="无则填「无」或简述" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24}>
              <Form.Item name="pollutionDamageAssessment" label="污染损害评估">
                <TextArea rows={2} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24}>
              <Form.Item name="ecoDamageAssessment" label="生态环境损害评估">
                <TextArea rows={2} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24}>
              <Form.Item
                label="评估附件"
                required
                extra={`支持 PDF、Word；单文件不超过 ${ASSESSMENT_ATTACH_MAX_MB}MB。上传后在详情中可「查看 / 下载」；原型为浏览器本地 data URL，刷新页面可能丢失。`}
              >
                <Upload
                  fileList={assessmentAttachFileList}
                  maxCount={1}
                  accept={ASSESSMENT_ATTACH_ACCEPT}
                  beforeUpload={file => {
                    const mb = file.size / 1024 / 1024;
                    if (mb > ASSESSMENT_ATTACH_MAX_MB) {
                      message.error(`附件不超过 ${ASSESSMENT_ATTACH_MAX_MB}MB`);
                      return Upload.LIST_IGNORE;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      const dataUrl = reader.result as string;
                      setAssessAttach({ url: dataUrl, name: file.name });
                    };
                    reader.onerror = () => message.error('读取文件失败');
                    reader.readAsDataURL(file);
                    return false;
                  }}
                  onRemove={() => {
                    setAssessAttach({ url: null, name: '' });
                    return true;
                  }}
                >
                  <Button icon={<UploadOutlined />}>上传本地文件</Button>
                </Upload>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div className="facility-view">
    <Card title={title}>
      <Empty description="功能建设中" />
    </Card>
  </div>
);

// ========== 侧栏与主应用 ==========
type SubKey =
  | 'risk-enterprise'
  | 'emergency-supply'
  | 'social-supply'
  | 'emergency-plan'
  | 'emergency-team'
  | 'expert'
  | 'emergency-events'
  | 'event-assessment'
  | 'event-review';

/** 风险识别子菜单 key（与 RiskMenuKey 一致） */
const RISK_SUB_KEYS: RiskMenuKey[] = [
  'risk-enterprise',
  'emergency-supply',
  'social-supply',
  'emergency-plan',
  'emergency-team',
  'expert',
];

interface MenuGroup {
  key: string;
  label: string;
  icon: React.ReactNode;
  children: { key: SubKey; label: string }[];
}

const SIDEBAR_MENUS: MenuGroup[] = [
  {
    key: 'risk',
    label: '风险识别',
    icon: <AlertOutlined />,
    children: [
      { key: 'risk-enterprise', label: '风险源企业信息' },
      { key: 'emergency-supply', label: '应急物资' },
      { key: 'social-supply', label: '社会物资点' },
      { key: 'emergency-plan', label: '应急预案信息' },
      { key: 'emergency-team', label: '应急队伍信息' },
      { key: 'expert', label: '应急专家库' },
    ],
  },
  {
    key: 'event',
    label: '应急事件',
    icon: <FileTextOutlined />,
    children: [
      { key: 'emergency-events', label: '应急事件信息' },
      { key: 'event-assessment', label: '事件评估' },
      { key: 'event-review', label: '事件复盘' },
    ],
  },
];

const App: React.FC = () => {
  const [expandedKeys, setExpandedKeys] = useState<string[]>(['risk', 'event']);
  const [activeModule, setActiveModule] = useState('event');
  const [activeSubMenu, setActiveSubMenu] = useState<SubKey>('emergency-events');
  const [emergencyEvents, setEmergencyEvents] = useState<EmergencyEventRow[]>(() => [...initialEmergencyEvents]);
  const [assessments, setAssessments] = useState<EventAssessmentRow[]>(() => [...initialEventAssessments]);
  const [riskData, setRiskData] = useState(() => ({ ...initialRiskData }));
  const [eventReviews, setEventReviews] = useState(() => [...initialEventReviews]);

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
  };

  const getBreadcrumbPath = () => {
    for (const m of SIDEBAR_MENUS) {
      const c = m.children.find(x => x.key === activeSubMenu);
      if (c) return `${m.label} / ${c.label}`;
    }
    return '应急协同';
  };

  const renderContent = () => {
    switch (activeSubMenu) {
      case 'emergency-events':
        return (
          <EmergencyEventInfoPage
            events={emergencyEvents}
            onEventsChange={setEmergencyEvents}
            assessments={assessments}
            reviews={eventReviews}
            experts={riskData.experts}
            socialPoints={riskData.socialPoints}
          />
        );
      case 'event-assessment':
        return <EventAssessmentPage events={emergencyEvents} assessments={assessments} onAssessmentsChange={setAssessments} />;
      case 'event-review':
        return (
          <EventReviewPage
            events={emergencyEvents}
            assessments={assessments}
            teams={riskData.teams}
            experts={riskData.experts}
            supplies={riskData.supplies}
            socialPoints={riskData.socialPoints}
            reviews={eventReviews}
            onReviewsChange={setEventReviews}
          />
        );
      default:
        if (RISK_SUB_KEYS.includes(activeSubMenu as RiskMenuKey)) {
          return (
            <RiskIdentificationRouter
              activeSubMenu={activeSubMenu as RiskMenuKey}
              data={riskData}
              setData={setRiskData}
            />
          );
        }
        return <PlaceholderPage title={SIDEBAR_MENUS.flatMap(m => m.children).find(c => c.key === activeSubMenu)?.label ?? '模块'} />;
    }
  };

  return (
    <AppConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#1e5bb5', borderRadius: 4 } }}>
      <Layout className="water-env-dashboard facility-mgmt-standalone">
        <div className="main-layout with-sidebar">
          <div className="sidebar-menu">
            <div className="sidebar-menu-title">应急协同</div>
            <div className="sidebar-menu-list">
              {SIDEBAR_MENUS.map(menu => {
                const isExpanded = expandedKeys.includes(menu.key);
                return (
                  <div key={menu.key} className="sidebar-menu-item-wrapper">
                    <div
                      className={`sidebar-menu-item ${activeModule === menu.key ? 'active' : ''}`}
                      onClick={() => {
                        toggleExpand(menu.key);
                        setActiveModule(menu.key);
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <span className="sidebar-menu-icon">{menu.icon}</span>
                      <span className="sidebar-menu-label">{menu.label}</span>
                      <span className={`sidebar-menu-arrow ${isExpanded ? 'expanded' : ''}`}>
                        <DownOutlined />
                      </span>
                    </div>
                    {isExpanded && (
                      <div className="sidebar-submenu">
                        {menu.children.map(child => (
                          <div
                            key={child.key}
                            className={`sidebar-submenu-item ${activeSubMenu === child.key ? 'active' : ''}`}
                            onClick={() => {
                              setActiveModule(menu.key);
                              setActiveSubMenu(child.key);
                            }}
                            role="button"
                            tabIndex={0}
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

export default App;
