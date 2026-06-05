/**
 * 设施管理 · 事件管理 · 事件列表（统一台账）
 * 按「点位类型」合并泵站、污水厂与监测点事件，单表维护；污水厂行保留溯源/联动分析。
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Upload,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  FormOutlined,
  PlusOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import {
  PipeLineColumnManager,
  type ColumnConfig,
  getDefaultVisibleColumnKeys,
  getFacilityTableScrollX,
} from './pipe-line-table-kit';
import { downloadTableFullExcel } from '../shared/facilityTableXlsxExport';
import { FacilityEventLinkedAnalysisModal } from './facility-event-linked-analysis';
import type { PointKindZh, UnifiedFacilityEventRecord } from './facility-unified-event-data';
import { hasEventRecordDisposalFilled } from './facility-unified-event-data';
import type { PumpStationRecord, PlantRecord } from './facility-points-data';
import { isPlantWaterQualityTraceEvent } from './facility-plant-event-list-view';
import type { PipeNodeDemoRow } from './pipe-network-demo-data';

export type { PointKindZh, UnifiedFacilityEventRecord } from './facility-unified-event-data';

type UnifiedEditFormValues = {
  点位类型?: PointKindZh;
  点位编码?: string;
  事件类型?: string;
  事件等级?: UnifiedFacilityEventRecord['事件等级'];
  发生时间?: Dayjs;
  状态?: UnifiedFacilityEventRecord['状态'];
  责任人?: string;
  更新时间?: Dayjs;
  处置责任人?: string;
  联系电话?: string;
  处置完成图片?: string;
  处置完成时间?: Dayjs;
  发生地点?: string;
  事件原因?: string;
  处理过程?: string;
  处理结果?: string;
  应急处置?: string;
  处置描述?: string;
  告警指标?: string;
};

const PUMP_EVENT_TYPE_OPTIONS = ['设备故障', '管道堵塞', '停电', '应急启动', '检修维护'];
const PLANT_EVENT_TYPE_OPTIONS = ['设备故障', '水质超标', '停电', '污泥处置异常', '应急处置'];

const EVENT_LEVEL_OPTIONS: { value: UnifiedFacilityEventRecord['事件等级']; label: string }[] = [
  { value: '一般', label: '一般' },
  { value: '较大', label: '较大' },
  { value: '重大', label: '重大' },
];

const EVENT_STATUS_OPTIONS: { value: UnifiedFacilityEventRecord['状态']; label: string }[] = [
  { value: '待处置', label: '待处置' },
  { value: '处置完成', label: '处置完成' },
  { value: '终止', label: '终止' },
];

const KIND_FILTER_OPTIONS: { value: 'all' | PointKindZh; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: '泵站', label: '泵站' },
  { value: '污水厂', label: '污水厂' },
  { value: '监测点', label: '监测点' },
];

const splitTextToList = (v?: string): string[] =>
  String(v || '')
    .split(/[;,，、\n]/)
    .map(x => x.trim())
    .filter(Boolean);

/** 列表/详情/导出展示：将告警指标并入事件描述（台账仍单独存「告警指标」供溯源等能力使用） */
function formatUnifiedEventDescDisplay(r: Pick<UnifiedFacilityEventRecord, '告警指标' | '事件原因'>): string {
  const alarm = String(r.告警指标 || '').trim();
  const desc = String(r.事件原因 || '').trim();
  if (alarm && desc) return `【告警指标】${alarm}\n${desc}`;
  if (alarm) return `【告警指标】${alarm}`;
  return desc;
}

function genEventIdByFacility(facilityCode: string, existing: UnifiedFacilityEventRecord[]) {
  const normalized = String(facilityCode || 'EVT').trim();
  const datePart = dayjs().format('YYYYMMDDHHmmss');
  const prefix = `${normalized}-EVT-${datePart}`;
  const seq = existing.filter(item => String(item.id || '').startsWith(prefix)).length + 1;
  return `${prefix}-${String(seq).padStart(2, '0')}`;
}

function toLinkedModalRecord(r: UnifiedFacilityEventRecord) {
  return {
    id: r.id,
    事件类型: r.事件类型,
    事件等级: r.事件等级,
    发生时间: r.发生时间,
    状态: r.状态,
    污水厂编码: r.点位编码,
    污水厂名称: r.点位名称,
    告警指标: r.告警指标,
  };
}

export function renderUnifiedDetailTabs(record: UnifiedFacilityEventRecord, initialTab: 'basic' | 'disposal' = 'basic'): React.ReactNode {
  const isPump = record.点位类型 === '泵站';
  const mergedEventDesc = formatUnifiedEventDescDisplay(record);
  return (
    <Tabs
      defaultActiveKey={initialTab}
      items={[
        {
          key: 'basic',
          label: '基础信息',
          children: (
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="点位类型">
                <Tag color={isPump ? 'blue' : record.点位类型 === '污水厂' ? 'green' : 'purple'}>{record.点位类型}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="事件编号">{record.id}</Descriptions.Item>
              <Descriptions.Item label="关联点位">{`${record.点位名称}（${record.点位编码}）`}</Descriptions.Item>
              <Descriptions.Item label="所属区域">{record.所属区域 || '—'}</Descriptions.Item>
              <Descriptions.Item label="点位地址">{record.点位地址 || '—'}</Descriptions.Item>
              <Descriptions.Item label="事件类型">{record.事件类型}</Descriptions.Item>
              <Descriptions.Item label="事件等级">{record.事件等级}</Descriptions.Item>
              <Descriptions.Item label="发生时间">{record.发生时间}</Descriptions.Item>
              <Descriptions.Item label="上报人">{record.责任人 || '—'}</Descriptions.Item>
              <Descriptions.Item label="更新时间">{record.更新时间}</Descriptions.Item>
              <Descriptions.Item label="事件描述">{mergedEventDesc.trim() ? mergedEventDesc : '—'}</Descriptions.Item>
              <Descriptions.Item label="处置建议">{record.应急处置 || '—'}</Descriptions.Item>
            </Descriptions>
          ),
        },
        {
          key: 'disposal',
          label: '处置信息',
          children: (
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="状态">{record.状态}</Descriptions.Item>
              <Descriptions.Item label="处置责任人">{record.处置责任人 || '—'}</Descriptions.Item>
              <Descriptions.Item label="联系电话">{record.联系电话 || '—'}</Descriptions.Item>
              {isPump ? (
                <>
                  <Descriptions.Item label="处理过程">{record.处理过程 || '—'}</Descriptions.Item>
                  <Descriptions.Item label="处理结果">{record.处理结果 || '—'}</Descriptions.Item>
                </>
              ) : null}
              <Descriptions.Item label="处置描述">{record.处置描述 || '—'}</Descriptions.Item>
              <Descriptions.Item label="处置完成图片">
                {(record.处置完成图片 || []).length ? record.处置完成图片.join('；') : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="处置完成时间">{record.处置完成时间 || '—'}</Descriptions.Item>
            </Descriptions>
          ),
        },
      ]}
    />
  );
}

export type FacilityUnifiedEventListViewProps = {
  onDetail: (title: string, content: React.ReactNode, modalWidth?: number | string) => void;
  pumpStationRows: PumpStationRecord[];
  plantRecords: PlantRecord[];
  monitorPointRows: PipeNodeDemoRow[];
  /** 与事件统计共用主入口状态 */
  eventRows: UnifiedFacilityEventRecord[];
  onEventRowsChange: React.Dispatch<React.SetStateAction<UnifiedFacilityEventRecord[]>>;
  /** 菜单默认筛选：全部 / 泵站 / 污水厂（兼容旧视图键） */
  defaultFacilityTypeFilter?: 'all' | 'pump' | 'plant';
};

export const FacilityUnifiedEventListView: React.FC<FacilityUnifiedEventListViewProps> = ({
  onDetail,
  pumpStationRows,
  plantRecords,
  monitorPointRows,
  eventRows,
  onEventRowsChange,
  defaultFacilityTypeFilter = 'all',
}) => {
  const data = eventRows;
  const setData = onEventRowsChange;
  const normalizeDashText = (v: unknown): string => {
    const s = String(v ?? '').trim();
    return s || '—';
  };

  const resolveFacilityMeta = useCallback(
    (kind: PointKindZh, code: string): { 所属区域: string; 点位地址: string } => {
      const hitCode = String(code || '').trim();
      if (!hitCode) return { 所属区域: '—', 点位地址: '—' };
      if (kind === '泵站') {
        const hit = pumpStationRows.find(item => String(item.id || '').trim() === hitCode);
        return {
          所属区域: normalizeDashText(hit?.region),
          点位地址: normalizeDashText(hit?.pustLoc),
        };
      }
      if (kind === '污水厂') {
        const hit = plantRecords.find(item => String(item.id || '').trim() === hitCode);
        return {
          所属区域: normalizeDashText(hit?.region),
          点位地址: normalizeDashText(hit?.addr),
        };
      }
      const hit = monitorPointRows.find(item => String(item.nodeId || '').trim() === hitCode);
      return {
        所属区域: '管网监测点',
        点位地址: normalizeDashText(hit?.roadName),
      };
    },
    [monitorPointRows, plantRecords, pumpStationRows],
  );

  const appendFacilityMeta = useCallback(
    (record: UnifiedFacilityEventRecord): UnifiedFacilityEventRecord => {
      const meta = resolveFacilityMeta(record.点位类型, record.点位编码);
      const fallbackRegion = normalizeDashText(record.所属区域);
      const fallbackAddress = normalizeDashText(record.点位地址 || record.发生地点);
      return {
        ...record,
        所属区域: meta.所属区域 === '—' ? fallbackRegion : meta.所属区域,
        点位地址: meta.点位地址 === '—' ? fallbackAddress : meta.点位地址,
      };
    },
    [resolveFacilityMeta],
  );

  const resolveInitialKind = (): 'all' | PointKindZh => {
    if (defaultFacilityTypeFilter === 'plant') return '污水厂';
    if (defaultFacilityTypeFilter === 'pump') return '泵站';
    return 'all';
  };

  const [filterForm] = Form.useForm<{
    facilityKind?: 'all' | PointKindZh;
    facilityCode?: string;
    eventType?: string;
    status?: UnifiedFacilityEventRecord['状态'];
    eventIdKeyword?: string;
  }>();
  const [editForm] = Form.useForm<UnifiedEditFormValues>();
  const editFacilityKindWatch = Form.useWatch('点位类型', editForm);
  const editEventTypeWatch = Form.useWatch('事件类型', editForm);

  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [facilityKindFilter, setFacilityKindFilter] = useState<'all' | PointKindZh>(() => resolveInitialKind());
  const [facilityCodeFilter, setFacilityCodeFilter] = useState<string | undefined>();
  const [eventTypeFilter, setEventTypeFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<UnifiedFacilityEventRecord['状态'] | undefined>();
  const [eventIdKeyword, setEventIdKeyword] = useState('');
  const [eventFormTab, setEventFormTab] = useState<'basic' | 'disposal'>('basic');
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [linkedAnalysis, setLinkedAnalysis] = useState<{
    record: UnifiedFacilityEventRecord;
    variant: 'sewer-trace' | 'event-linked';
  } | null>(null);

  useEffect(() => {
    const k = resolveInitialKind();
    setFacilityKindFilter(k);
    filterForm.setFieldValue('facilityKind', k === 'all' ? 'all' : k);
  }, [defaultFacilityTypeFilter, filterForm]);

  useEffect(() => {
    setData(prev => prev.map(appendFacilityMeta));
  }, [appendFacilityMeta]);

  const pumpOptions = useMemo(
    () =>
      pumpStationRows
        .filter(item => item && item.id)
        .map(item => ({
          value: String(item.id || ''),
          label: `${String(item.pustName || '未命名泵站')}（${String(item.id || '')}）`,
        })),
    [pumpStationRows],
  );

  const plantOptions = useMemo(
    () =>
      plantRecords
        .filter(item => item && item.id)
        .map(item => ({
          value: String(item.id || ''),
          label: `${String(item.name || '未命名污水厂')}（${String(item.id || '')}）`,
        })),
    [plantRecords],
  );

  const monitorOptions = useMemo(
    () =>
      monitorPointRows
        .filter(item => item && (item as { 水质监测点?: boolean }).水质监测点)
        .map(item => {
          const code = String(item.nodeId || '');
          const road = String(item.roadName || '未命名道路');
          return {
            value: code,
            label: `${road}监测点（${code}）`,
          };
        }),
    [monitorPointRows],
  );

  const pumpOptionsByCode = useMemo(
    () =>
      new Map(
        pumpOptions.map(item => [
          item.value,
          { label: item.label, name: item.label.split('（')[0]?.trim() || item.label },
        ]),
      ),
    [pumpOptions],
  );

  const plantOptionsByCode = useMemo(
    () =>
      new Map(
        plantOptions.map(item => [
          item.value,
          { label: item.label, name: item.label.split('（')[0]?.trim() || item.label },
        ]),
      ),
    [plantOptions],
  );

  const monitorOptionsByCode = useMemo(
    () =>
      new Map(
        monitorOptions.map(item => [
          item.value,
          { label: item.label, name: item.label.split('（')[0]?.trim() || item.label },
        ]),
      ),
    [monitorOptions],
  );

  /** 查询区：关联点位下拉选项（随点位类型筛选变化） */
  const facilityFilterOptions = useMemo(() => {
    if (facilityKindFilter === '泵站') return pumpOptions.map(o => ({ ...o, label: o.label }));
    if (facilityKindFilter === '污水厂') return plantOptions.map(o => ({ ...o, label: o.label }));
    if (facilityKindFilter === '监测点') return monitorOptions.map(o => ({ ...o, label: o.label }));
    return [
      ...pumpOptions.map(o => ({ value: o.value, label: `[泵站] ${o.label}` })),
      ...plantOptions.map(o => ({ value: o.value, label: `[污水厂] ${o.label}` })),
      ...monitorOptions.map(o => ({ value: o.value, label: `[监测点] ${o.label}` })),
    ];
  }, [facilityKindFilter, monitorOptions, plantOptions, pumpOptions]);

  const eventTypeFilterOptions = useMemo(() => {
    if (facilityKindFilter === '泵站') return PUMP_EVENT_TYPE_OPTIONS.map(v => ({ value: v, label: v }));
    if (facilityKindFilter === '污水厂') return PLANT_EVENT_TYPE_OPTIONS.map(v => ({ value: v, label: v }));
    if (facilityKindFilter === '监测点') return PLANT_EVENT_TYPE_OPTIONS.map(v => ({ value: v, label: v }));
    const merged = [...new Set([...PUMP_EVENT_TYPE_OPTIONS, ...PLANT_EVENT_TYPE_OPTIONS])];
    return merged.map(v => ({ value: v, label: v }));
  }, [facilityKindFilter]);

  const filteredData = useMemo(() => {
    const idQ = eventIdKeyword.trim();
    return data
      .filter(item => {
        if (facilityKindFilter !== 'all' && item.点位类型 !== facilityKindFilter) return false;
        if (facilityCodeFilter && item.点位编码 !== facilityCodeFilter) return false;
        if (eventTypeFilter && item.事件类型 !== eventTypeFilter) return false;
        if (statusFilter && item.状态 !== statusFilter) return false;
        if (idQ && !String(item.id || '').includes(idQ)) return false;
        return true;
      })
      .sort((a, b) => String(b.创建时间 || '').localeCompare(String(a.创建时间 || '')));
  }, [
    data,
    eventIdKeyword,
    eventTypeFilter,
    facilityCodeFilter,
    facilityKindFilter,
    statusFilter,
  ]);

  const openReadonlyDetail = useCallback(
    (record: UnifiedFacilityEventRecord, initialTab: 'basic' | 'disposal' = 'basic') => {
      onDetail(`事件详情 - ${record.id}`, renderUnifiedDetailTabs(record, initialTab), 900);
    },
    [onDetail],
  );

  const openEditModal = (record: UnifiedFacilityEventRecord, tab: 'basic' | 'disposal' = 'basic') => {
    setEditingId(record.id);
    editForm.setFieldsValue({
      点位类型: record.点位类型,
      点位编码: record.点位编码,
      事件类型: record.事件类型,
      事件等级: record.事件等级,
      发生时间: dayjs(record.发生时间),
      状态: record.状态,
      责任人: record.责任人,
      更新时间: dayjs(record.更新时间),
      处置责任人: record.处置责任人,
      联系电话: record.联系电话,
      处置完成图片: (record.处置完成图片 || []).join(';'),
      处置完成时间: dayjs(record.处置完成时间),
      事件原因: record.事件原因,
      应急处置: record.应急处置,
      处置描述: record.处置描述,
      告警指标: record.告警指标,
    });
    setEventFormTab(tab);
    setAddOpen(true);
  };

  const editFacilitySelectOptions = useMemo(() => {
    const kind = editFacilityKindWatch ?? '泵站';
    if (kind === '污水厂') return plantOptions;
    if (kind === '监测点') return monitorOptions;
    return pumpOptions;
  }, [editFacilityKindWatch, monitorOptions, plantOptions, pumpOptions]);

  const editEventTypeSelectOptions = useMemo(() => {
    const kind = editFacilityKindWatch ?? '泵站';
    if (kind === '污水厂') return PLANT_EVENT_TYPE_OPTIONS.map(v => ({ value: v, label: v }));
    if (kind === '监测点') return PLANT_EVENT_TYPE_OPTIONS.map(v => ({ value: v, label: v }));
    return PUMP_EVENT_TYPE_OPTIONS.map(v => ({ value: v, label: v }));
  }, [editFacilityKindWatch]);

  const renderDashCell = (v: unknown) => (v != null && String(v).trim() !== '' ? String(v) : '—');

  /** 列顺序与新增表单一致：台账标识 → 事件类型→等级→时间→上报人→更新→事件描述（含告警指标文案）→处置建议 → 状态及处置信息 → 处置描述→图→时间（台账仍兼容泵站历史「处理过程/处理结果」，不参与列表展示） */
  const allColumns: ColumnsType<UnifiedFacilityEventRecord> = [
    {
      title: '点位类型',
      dataIndex: '点位类型',
      key: '点位类型',
      width: 100,
      fixed: 'left',
      render: (v: PointKindZh) =>
        v === '泵站' ? <Tag color="blue">泵站</Tag> : v === '污水厂' ? <Tag color="green">污水厂</Tag> : <Tag color="purple">监测点</Tag>,
    },
    { title: '事件编号', dataIndex: 'id', key: 'id', width: 220 },
    { title: '创建时间', dataIndex: '创建时间', key: '创建时间', width: 180 },
    { title: '点位编码', dataIndex: '点位编码', key: '点位编码', width: 160 },
    { title: '点位名称', dataIndex: '点位名称', key: '点位名称', width: 220 },
    { title: '所属区域', dataIndex: '所属区域', key: '所属区域', width: 120, render: renderDashCell },
    { title: '点位地址', dataIndex: '点位地址', key: '点位地址', width: 260, render: renderDashCell },
    { title: '事件类型', dataIndex: '事件类型', key: '事件类型', width: 150 },
    { title: '事件等级', dataIndex: '事件等级', key: '事件等级', width: 110 },
    { title: '发生时间', dataIndex: '发生时间', key: '发生时间', width: 180 },
    { title: '上报人', dataIndex: '责任人', key: '责任人', width: 120 },
    { title: '更新时间', dataIndex: '更新时间', key: '更新时间', width: 180 },
    {
      title: '事件描述',
      dataIndex: '事件原因',
      key: '事件原因',
      width: 260,
      render: (_, r) => renderDashCell(formatUnifiedEventDescDisplay(r)),
    },
    { title: '处置建议', dataIndex: '应急处置', key: '应急处置', width: 200, render: renderDashCell },
    {
      title: '状态',
      dataIndex: '状态',
      key: '状态',
      width: 120,
      render: (value: UnifiedFacilityEventRecord['状态']) => {
        const color = value === '处置完成' ? 'success' : value === '终止' ? 'error' : 'warning';
        return <Tag color={color}>{value}</Tag>;
      },
    },
    { title: '处置责任人', dataIndex: '处置责任人', key: '处置责任人', width: 120, render: renderDashCell },
    { title: '联系电话', dataIndex: '联系电话', key: '联系电话', width: 120, render: renderDashCell },
    { title: '处置描述', dataIndex: '处置描述', key: '处置描述', width: 200, render: renderDashCell },
    {
      title: '处置完成图片',
      key: '处置完成图片',
      width: 140,
      render: (_, r) => {
        const arr = r.处置完成图片 || [];
        if (!arr.length) return '—';
        const s = arr.join('；');
        return s.length > 28 ? `${s.slice(0, 28)}…（${arr.length}）` : s;
      },
    },
    { title: '处置完成时间', dataIndex: '处置完成时间', key: '处置完成时间', width: 180, render: renderDashCell },
    {
      title: '操作',
      key: 'operation',
      fixed: 'right',
      width: 300,
      onCell: () => ({
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
        },
      }),
      render: (_, record) => {
        const disposalFilled = hasEventRecordDisposalFilled(record);
        return (
        <Space size={0}>
          <Button
            type="link"
            size="small"
            className="action-btn detail"
            icon={<EyeOutlined />}
            onClick={() => openReadonlyDetail(record)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            className="action-btn"
            icon={disposalFilled ? <FileTextOutlined /> : <FormOutlined />}
            onClick={() =>
              disposalFilled ? openReadonlyDetail(record, 'disposal') : openEditModal(record, 'disposal')
            }
          >
            {disposalFilled ? '填报信息' : '处置填报'}
          </Button>
          {record.点位类型 === '污水厂' && isPlantWaterQualityTraceEvent(record.事件类型) ? (
            <Button
              type="link"
              size="small"
              className="action-btn linked-analysis"
              onClick={() => setLinkedAnalysis({ record, variant: 'sewer-trace' })}
            >
              溯源分析
            </Button>
          ) : (
            <Button
              type="link"
              size="small"
              className="action-btn linked-analysis"
              onClick={() => setLinkedAnalysis({ record, variant: 'event-linked' })}
            >
              事件联动分析
            </Button>
          )}
          <Button
            type="link"
            size="small"
            className="action-btn edit"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record, 'basic')}
          >
            编辑
          </Button>
        </Space>
        );
      },
    },
  ];

  const allColumnConfigs = useMemo<ColumnConfig[]>(
    () => [
      { key: '点位类型', title: '点位类型', dataIndex: '点位类型', width: 100, fixed: 'left', defaultVisible: true },
      { key: 'id', title: '事件编号', dataIndex: 'id', width: 220, defaultVisible: true },
      { key: '创建时间', title: '创建时间', dataIndex: '创建时间', width: 180, defaultVisible: true },
      { key: '点位编码', title: '点位编码', dataIndex: '点位编码', width: 160, defaultVisible: true },
      { key: '点位名称', title: '点位名称', dataIndex: '点位名称', width: 220, defaultVisible: true },
      { key: '所属区域', title: '所属区域', dataIndex: '所属区域', width: 120, defaultVisible: true },
      { key: '点位地址', title: '点位地址', dataIndex: '点位地址', width: 260, defaultVisible: true },
      { key: '事件类型', title: '事件类型', dataIndex: '事件类型', width: 150, defaultVisible: true },
      { key: '事件等级', title: '事件等级', dataIndex: '事件等级', width: 110, defaultVisible: true },
      { key: '发生时间', title: '发生时间', dataIndex: '发生时间', width: 180, defaultVisible: true },
      { key: '责任人', title: '上报人', dataIndex: '责任人', width: 120, defaultVisible: true },
      { key: '更新时间', title: '更新时间', dataIndex: '更新时间', width: 180, defaultVisible: true },
      { key: '事件原因', title: '事件描述', dataIndex: '事件原因', width: 260, defaultVisible: true },
      { key: '应急处置', title: '处置建议', dataIndex: '应急处置', width: 200, defaultVisible: true },
      { key: '状态', title: '状态', dataIndex: '状态', width: 120, defaultVisible: true },
      { key: '处置责任人', title: '处置责任人', dataIndex: '处置责任人', width: 120, defaultVisible: false },
      { key: '联系电话', title: '联系电话', dataIndex: '联系电话', width: 120, defaultVisible: false },
      { key: '处置描述', title: '处置描述', dataIndex: '处置描述', width: 200, defaultVisible: true },
      { key: '处置完成图片', title: '处置完成图片', width: 140, defaultVisible: false },
      { key: '处置完成时间', title: '处置完成时间', dataIndex: '处置完成时间', width: 180, defaultVisible: false },
      { key: 'operation', title: '操作', width: 300, fixed: 'right', defaultVisible: true },
    ],
    [],
  );

  useEffect(() => {
    if (!visibleColumns.length) {
      setVisibleColumns(getDefaultVisibleColumnKeys(allColumnConfigs));
    }
  }, [allColumnConfigs, visibleColumns.length]);

  const columns = allColumns.filter(col => visibleColumns.includes(col.key as string) || col.key === 'operation');
  const scrollX = getFacilityTableScrollX(columns.filter(c => c.key !== 'operation') as { width?: number }[]);

  const handleSearch = () => {
    const values = filterForm.getFieldsValue();
    const fk = values.facilityKind ?? 'all';
    setFacilityKindFilter(fk === 'all' ? 'all' : fk);
    setFacilityCodeFilter(values.facilityCode);
    setEventTypeFilter(values.eventType);
    setStatusFilter(values.status);
    setEventIdKeyword(String(values.eventIdKeyword || '').trim());
  };

  const handleReset = () => {
    filterForm.resetFields();
    setFacilityKindFilter('all');
    filterForm.setFieldsValue({ facilityKind: 'all' });
    setFacilityCodeFilter(undefined);
    setEventTypeFilter(undefined);
    setStatusFilter(undefined);
    setEventIdKeyword('');
  };

  const handleSave = () => {
    editForm.validateFields().then(values => {
      const kind = values.点位类型;
      const code = String(values.点位编码 || '');
      if (!kind) {
        message.warning('请选择点位类型');
        return;
      }
      const opt = kind === '泵站' ? pumpOptionsByCode.get(code) : kind === '污水厂' ? plantOptionsByCode.get(code) : monitorOptionsByCode.get(code);
      if (!opt) {
        message.warning(
          kind === '泵站'
            ? '未匹配到泵站点位，请先在「泵站信息」中维护台账'
            : kind === '污水厂'
              ? '未匹配到污水厂点位，请先在「污水厂信息」中维护台账'
              : '未匹配到监测点位，请先在「排水管点」中维护监测点台账',
        );
        return;
      }
      const eventType = String(values.事件类型 || '');
      const prev = editingId ? data.find(item => item.id === editingId) : undefined;
      const next: UnifiedFacilityEventRecord = {
        id: editingId || genEventIdByFacility(code, data),
        创建时间: prev?.创建时间 || dayjs().format('YYYY-MM-DD HH:mm:ss'),
        点位类型: kind,
        点位编码: code,
        点位名称: opt.name,
        ...resolveFacilityMeta(kind, code),
        事件类型: eventType,
        事件等级: values.事件等级 || '一般',
        发生时间: (values.发生时间 || dayjs()).format('YYYY-MM-DD HH:mm:ss'),
        状态: values.状态 || '待处置',
        责任人: String(values.责任人 || ''),
        更新时间: (values.更新时间 || dayjs()).format('YYYY-MM-DD HH:mm:ss'),
        处置责任人: String(values.处置责任人 || ''),
        联系电话: String(values.联系电话 || ''),
        处置完成图片: splitTextToList(values.处置完成图片),
        处置完成时间: (values.处置完成时间 || dayjs()).format('YYYY-MM-DD HH:mm:ss'),
        // 发生地点以关联点位台账为准，表单不再维护；编辑时保留历史字段，新增不写
        发生地点: prev?.发生地点 || '',
        事件原因: String(values.事件原因 || ''),
        应急处置: String(values.应急处置 || ''),
        // 表单已移除「处理过程/处理结果」，编辑时保留原台账，新增为空
        处理过程: prev?.处理过程 || '',
        处理结果: prev?.处理结果 || '',
        处置描述: String(values.处置描述 || ''),
        告警指标:
          kind === '污水厂' && isPlantWaterQualityTraceEvent(eventType)
            ? String(values.告警指标 || '').trim() || undefined
            : undefined,
      };
      setData(prev => (editingId ? prev.map(item => (item.id === editingId ? next : item)) : [next, ...prev]));
      message.success(editingId ? '事件编辑成功' : '事件新增成功');
      setAddOpen(false);
      setEditingId(null);
      editForm.resetFields();
    });
  };

  const handleExport = () => {
    if (!filteredData.length) {
      message.warning('当前筛选条件下无数据可导出');
      return;
    }
    downloadTableFullExcel(
      filteredData.map(item => ({
        ...(item as unknown as Record<string, unknown>),
        事件原因: formatUnifiedEventDescDisplay(item),
      })),
      [
        { key: '点位类型', title: '点位类型', dataIndex: '点位类型' },
        { key: 'id', title: '事件编号', dataIndex: 'id' },
        { key: '创建时间', title: '创建时间', dataIndex: '创建时间' },
        { key: '点位编码', title: '点位编码', dataIndex: '点位编码' },
        { key: '点位名称', title: '点位名称', dataIndex: '点位名称' },
        { key: '所属区域', title: '所属区域', dataIndex: '所属区域' },
        { key: '点位地址', title: '点位地址', dataIndex: '点位地址' },
        { key: '事件类型', title: '事件类型', dataIndex: '事件类型' },
        { key: '事件等级', title: '事件等级', dataIndex: '事件等级' },
        { key: '发生时间', title: '发生时间', dataIndex: '发生时间' },
        { key: '责任人', title: '上报人', dataIndex: '责任人' },
        { key: '更新时间', title: '更新时间', dataIndex: '更新时间' },
        { key: '事件原因', title: '事件描述', dataIndex: '事件原因' },
        { key: '应急处置', title: '处置建议', dataIndex: '应急处置' },
        { key: '状态', title: '状态', dataIndex: '状态' },
        { key: '处置责任人', title: '处置责任人', dataIndex: '处置责任人' },
        { key: '联系电话', title: '联系电话', dataIndex: '联系电话' },
        { key: '处置描述', title: '处置描述', dataIndex: '处置描述' },
        { key: '处置完成图片', title: '处置完成图片', dataIndex: '处置完成图片' },
        { key: '处置完成时间', title: '处置完成时间', dataIndex: '处置完成时间' },
      ],
      '设施管理_统一点位事件列表',
      '事件列表',
      {
        formatByKey: {
          处置完成图片: v => (Array.isArray(v) ? v.join('；') : ''),
        },
      },
    );
    message.success('已导出 Excel（全量字段）');
  };

  return (
    <div className="facility-view">
      <Card
        title="事件列表"
        extra={
          <Space wrap size={[8, 8]} align="center">
            <Button icon={<DownloadOutlined />} className="export-btn" onClick={handleExport}>
              导出Excel
            </Button>
            <Button icon={<UploadOutlined />} onClick={() => message.success('已导入事件列表（原型示意）')}>
              导入
            </Button>
            <PipeLineColumnManager columns={allColumnConfigs} visibleColumns={visibleColumns} onChange={setVisibleColumns} />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              className="add-btn"
              onClick={() => {
                setEditingId(null);
                const defaultKind: PointKindZh =
                  facilityKindFilter === '污水厂' ? '污水厂' : facilityKindFilter === '泵站' ? '泵站' : '泵站';
                editForm.setFieldsValue({
                  点位类型: defaultKind,
                  状态: '待处置',
                  事件等级: '一般',
                  发生时间: dayjs(),
                  更新时间: dayjs(),
                  处置完成时间: dayjs(),
                });
                setEventFormTab('basic');
                setAddOpen(true);
              }}
            >
              新增
            </Button>
          </Space>
        }
      >
        {/* 查询区：与排口「问题列表」一致——横向 Form + Row/Col，占位符代替独立标签 */}
        <Form form={filterForm} initialValues={{ facilityKind: 'all' }}>
          <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="facilityKind" style={{ marginBottom: 0 }}>
                <Select
                  style={{ width: '100%' }}
                  options={KIND_FILTER_OPTIONS}
                  placeholder="点位类型（默认全部）"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="facilityCode" style={{ marginBottom: 0 }}>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  style={{ width: '100%' }}
                  placeholder="关联点位"
                  options={facilityFilterOptions}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="eventType" style={{ marginBottom: 0 }}>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  style={{ width: '100%' }}
                  placeholder="事件类型"
                  options={eventTypeFilterOptions}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="status" style={{ marginBottom: 0 }}>
                <Select allowClear style={{ width: '100%' }} placeholder="状态" options={EVENT_STATUS_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="eventIdKeyword" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="事件编号" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col
              xs={24}
              sm={12}
              md={16}
              lg={18}
              style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start' }}
            >
              <Form.Item style={{ marginBottom: 0 }}>
                <Space>
                  <Button type="primary" className="search-btn" icon={<SearchOutlined />} onClick={handleSearch}>
                    查询
                  </Button>
                  <Button onClick={handleReset}>重置</Button>
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Form>

        <div className="facility-table-wrap facility-event-list-table-wrap">
          <Table<UnifiedFacilityEventRecord>
            rowKey="id"
            size="middle"
            columns={columns}
            dataSource={filteredData}
            pagination={{ pageSize: 10 }}
            scroll={{ x: scrollX }}
            onRow={record => ({
              onClick: () => openReadonlyDetail(record),
              style: { cursor: 'pointer' },
            })}
          />
        </div>

        <Modal
          title={editingId ? '编辑事件' : '新增事件'}
          open={addOpen}
          onCancel={() => {
            setAddOpen(false);
            setEditingId(null);
            setEventFormTab('basic');
          }}
          onOk={handleSave}
          okText={editingId ? '保存' : '新增'}
          cancelText="取消"
          width={840}
          styles={{ body: { maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' } }}
        >
          <Form<UnifiedEditFormValues> layout="vertical" form={editForm}>
            {/* Tabs 置顶：泵站/污水厂共用同一套字段；水质类「告警指标」归入事件描述区录入，列表中与正文合并展示 */}
            <Tabs
              activeKey={eventFormTab}
              onChange={key => setEventFormTab(key as 'basic' | 'disposal')}
              items={[
                {
                  key: 'basic',
                  label: '基础信息',
                  children: (
                    <>
                      <Form.Item name="点位类型" label="点位类型" rules={[{ required: true, message: '请选择点位类型' }]}>
                        <Select
                          disabled={!!editingId}
                          options={[
                            { value: '泵站', label: '泵站' },
                            { value: '污水厂', label: '污水厂' },
                            { value: '监测点', label: '监测点' },
                          ]}
                          placeholder="请选择点位类型"
                          onChange={() => {
                            editForm.setFieldsValue({ 点位编码: undefined, 事件类型: undefined, 告警指标: undefined });
                          }}
                        />
                      </Form.Item>
                      <Form.Item name="点位编码" label="关联点位" rules={[{ required: true, message: '请选择关联点位' }]}>
                        <Select
                          allowClear
                          showSearch
                          optionFilterProp="label"
                          options={editFacilitySelectOptions}
                          placeholder="请选择台账点位"
                        />
                      </Form.Item>
                      <Form.Item name="事件类型" label="事件类型" rules={[{ required: true, message: '请选择事件类型' }]}>
                        <Select
                          allowClear
                          showSearch
                          optionFilterProp="label"
                          options={editEventTypeSelectOptions}
                          placeholder="请选择事件类型"
                        />
                      </Form.Item>
                      <Form.Item name="事件等级" label="事件等级" rules={[{ required: true, message: '请选择事件等级' }]}>
                        <Select allowClear options={EVENT_LEVEL_OPTIONS} placeholder="请选择事件等级" />
                      </Form.Item>
                      <Form.Item name="发生时间" label="发生时间" rules={[{ required: true, message: '请选择发生时间' }]}>
                        <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm:ss" />
                      </Form.Item>
                      <Form.Item name="责任人" label="上报人" rules={[{ required: true, message: '请输入上报人' }]}>
                        <Input placeholder="上报人" maxLength={30} />
                      </Form.Item>
                      <Form.Item name="更新时间" label="更新时间" rules={[{ required: true, message: '请选择更新时间' }]}>
                        <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm:ss" />
                      </Form.Item>
                      {(editFacilityKindWatch ?? '泵站') === '污水厂' &&
                      isPlantWaterQualityTraceEvent(String(editEventTypeWatch || '')) ? (
                        <Form.Item label="事件描述" tooltip="水质类可选超标指标，与正文在列表、导出中合并为一列展示">
                          <Space direction="vertical" size={8} style={{ width: '100%' }}>
                            <Form.Item name="告警指标" noStyle>
                              <Select
                                allowClear
                                placeholder="超标指标（选填，如 COD / NH3-N）"
                                options={[
                                  { value: 'COD', label: 'COD' },
                                  { value: 'NH3-N', label: 'NH3-N' },
                                  { value: 'TP', label: 'TP' },
                                  { value: 'TN', label: 'TN' },
                                ]}
                              />
                            </Form.Item>
                            <Form.Item name="事件原因" noStyle>
                              <Input.TextArea rows={3} maxLength={500} placeholder="事件描述正文（选填）" />
                            </Form.Item>
                          </Space>
                        </Form.Item>
                      ) : (
                        <Form.Item name="事件原因" label="事件描述">
                          <Input.TextArea rows={3} maxLength={500} placeholder="事件描述（选填）" />
                        </Form.Item>
                      )}
                      <Form.Item name="应急处置" label="处置建议">
                        <Input.TextArea rows={3} maxLength={500} placeholder="处置建议（选填）" />
                      </Form.Item>
                    </>
                  ),
                },
                {
                  key: 'disposal',
                  label: '处置信息',
                  children: (
                    <>
                      <Form.Item name="状态" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
                        <Select allowClear options={EVENT_STATUS_OPTIONS} placeholder="请选择状态" />
                      </Form.Item>
                      <Form.Item name="处置责任人" label="处置责任人">
                        <Input placeholder="处置责任人（选填）" maxLength={30} />
                      </Form.Item>
                      <Form.Item name="联系电话" label="联系电话">
                        <Input placeholder="联系电话（选填）" maxLength={20} />
                      </Form.Item>
                      <Form.Item name="处置描述" label="处置描述">
                        <Input.TextArea rows={4} maxLength={1000} placeholder="处置描述（选填）" />
                      </Form.Item>
                      <Form.Item label="处置完成图片">
                        <Space direction="vertical" style={{ width: '100%' }} size={8}>
                          <Upload
                            beforeUpload={() => false}
                            multiple
                            accept="image/*"
                            fileList={splitTextToList(editForm.getFieldValue('处置完成图片')).map((name, idx) => ({
                              uid: `${name}-${idx}`,
                              name,
                              status: 'done',
                            })) as UploadFile[]}
                            onChange={info => {
                              const names = info.fileList.map(file => file.name).filter(Boolean);
                              editForm.setFieldValue('处置完成图片', names.join(';'));
                            }}
                          >
                            <Button icon={<UploadOutlined />}>上传处置完成图片</Button>
                          </Upload>
                          <Form.Item name="处置完成图片" noStyle>
                            <Input placeholder="多个文件名或链接，分号分隔" maxLength={4000} />
                          </Form.Item>
                        </Space>
                      </Form.Item>
                      <Form.Item name="处置完成时间" label="处置完成时间" rules={[{ required: true, message: '请选择处置完成时间' }]}>
                        <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm:ss" />
                      </Form.Item>
                    </>
                  ),
                },
              ]}
            />
          </Form>
        </Modal>

        <FacilityEventLinkedAnalysisModal
          record={linkedAnalysis ? toLinkedModalRecord(linkedAnalysis.record) : null}
          variant={linkedAnalysis?.variant ?? 'event-linked'}
          onClose={() => setLinkedAnalysis(null)}
          onOpenFacilityDetail={onDetail}
        />
      </Card>
    </div>
  );
};
