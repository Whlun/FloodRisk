/**
 * 设施管理 · 污水厂管理 · 事件列表
 * 记录污水处理厂运行过程中的各类事件，支持导入导出、字段管理、新增、详情、编辑。
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Modal,
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
import { PipeLineColumnManager, type ColumnConfig, getDefaultVisibleColumnKeys } from './pipe-line-table-kit';
import { downloadTableFullExcel } from '../shared/facilityTableXlsxExport';
import { FacilityEventLinkedAnalysisModal } from './facility-event-linked-analysis';
import { hasPlantEventDisposalFilled } from './facility-event-disposal-filled';

type PlantEventLevel = '一般' | '较大' | '重大';
type PlantEventStatus = '待处置' | '处置完成' | '终止';

export type PlantEventRecord = {
  id: string;
  污水厂编码: string;
  污水厂名称: string;
  事件类型: string;
  事件等级: PlantEventLevel;
  发生时间: string;
  /** 与统一列表「事件描述」同源（可选） */
  事件原因?: string;
  状态: PlantEventStatus;
  责任人: string;
  应急处置: string;
  更新时间: string;
  处置责任人: string;
  联系电话: string;
  处置描述: string;
  处置完成图片: string[];
  处置完成时间: string;
  /** 水质溯源：厂进口告警指标（演示） */
  告警指标?: string;
};

type EventFormValues = {
  污水厂编码?: string;
  事件类型?: string;
  事件等级?: PlantEventLevel;
  发生时间?: Dayjs;
  责任人?: string;
  应急处置?: string;
  更新时间?: Dayjs;
  状态?: PlantEventStatus;
  处置责任人?: string;
  联系电话?: string;
  处置描述?: string;
  处置完成图片?: string;
  处置完成时间?: Dayjs;
  /** 水质溯源告警指标 */
  告警指标?: string;
};

const EVENT_TYPE_OPTIONS = [
  '设备故障',
  '水质超标',
  '停电',
  '污泥处置异常',
  '应急处置',
];

const EVENT_LEVEL_OPTIONS: { value: PlantEventLevel; label: PlantEventLevel }[] = [
  { value: '一般', label: '一般' },
  { value: '较大', label: '较大' },
  { value: '重大', label: '重大' },
];

const EVENT_STATUS_OPTIONS: { value: PlantEventStatus; label: PlantEventStatus }[] = [
  { value: '待处置', label: '待处置' },
  { value: '处置完成', label: '处置完成' },
  { value: '终止', label: '终止' },
];

/** 是否展示「溯源分析」（仅水质类污水厂事件）；统一事件列表复用 */
export const isPlantWaterQualityTraceEvent = (eventType: string) =>
  eventType === '水质超标' || String(eventType || '').includes('水质');

/** 演示数据：统一事件列表合并数据源（导出供 facility-unified-event-list-view 使用） */
export const PLANT_EVENT_INITIAL: PlantEventRecord[] = [
  /** 处置信息已填报 → 「填报信息」 */
  {
    id: 'WWTP202504070001-EVT-20260428110000-01',
    污水厂编码: 'WWTP202504070001',
    污水厂名称: '高新区污水处理厂',
    事件类型: '设备故障',
    事件等级: '较大',
    发生时间: '2026-04-28 11:00:00',
    事件原因: '二期鼓风机变频器通讯中断，自控切换失败。',
    状态: '处置完成',
    责任人: '李伟',
    应急处置: '人工切至就地模式维持曝气，同步联系厂家远程排查。',
    更新时间: '2026-04-28 11:40:00',
    处置责任人: '张磊',
    联系电话: '13800138001',
    处置描述: '更换通讯模块并完成冗余链路测试，自控远程恢复正常，事件闭环。',
    处置完成图片: ['污水厂-高新区-变频-1.jpg'],
    处置完成时间: '2026-04-28 18:30:00',
  },
  {
    id: 'WWTP202504070002-EVT-20260427103000-01',
    污水厂编码: 'WWTP202504070002',
    污水厂名称: '清溪片区污水处理厂',
    事件类型: '水质超标',
    事件等级: '重大',
    发生时间: '2026-04-27 10:30:00',
    事件原因: '晨样氨氮连续两小时高于内控上限。',
    状态: '处置完成',
    责任人: '周婷',
    应急处置: '加大硝化池曝气与回流比，加密进水与出水抽样。',
    更新时间: '2026-04-27 11:15:00',
    处置责任人: '刘芳',
    联系电话: '13900139002',
    处置描述: '两轮复测氨氮回落至达标区间，形成超标分析与纠偏记录。',
    处置完成图片: ['水质-清溪-复测1.jpg', '水质-清溪-复测2.jpg'],
    处置完成时间: '2026-04-27 22:00:00',
    告警指标: 'NH3-N',
  },
  {
    id: 'WWTP202504070003-EVT-20260426140000-01',
    污水厂编码: 'WWTP202504070003',
    污水厂名称: '银田片区污水处理厂',
    事件类型: '停电',
    事件等级: '一般',
    发生时间: '2026-04-26 14:00:00',
    事件原因: '外线闪络导致全厂失电约 8 分钟。',
    状态: '处置完成',
    责任人: '陈刚',
    应急处置: '柴油发电机带关键负荷，优先保障出水在线监测不断线。',
    更新时间: '2026-04-26 14:35:00',
    处置责任人: '刘宇',
    联系电话: '13800138003',
    处置描述: '市电恢复后完成并网切换与关键设备复位，运行平稳。',
    处置完成图片: ['停电-银田-切换记录.jpg'],
    处置完成时间: '2026-04-26 16:10:00',
  },
  {
    id: 'WWTP202504070008-EVT-20260425100000-01',
    污水厂编码: 'WWTP202504070008',
    污水厂名称: '银田东片污水处理厂',
    事件类型: '污泥处置异常',
    事件等级: '一般',
    发生时间: '2026-04-25 10:00:00',
    事件原因: '外运车辆衔接断层导致脱水污泥临时堆放接近警戒线。',
    状态: '处置完成',
    责任人: '谭峰',
    应急处置: '启用备用堆棚并协调加密转运班次。',
    更新时间: '2026-04-25 11:00:00',
    处置责任人: '付强',
    联系电话: '13800138020',
    处置描述: '库存回落至安全区间，联单闭环。',
    处置完成图片: ['污泥-银田东-1.jpg'],
    处置完成时间: '2026-04-25 15:45:00',
  },
  /** 处置信息未填 → 「处置填报」 */
  {
    id: 'WWTP202504070004-EVT-20260430103000-01',
    污水厂编码: 'WWTP202504070004',
    污水厂名称: '韶山乡污水处理厂',
    事件类型: '污泥处置异常',
    事件等级: '较大',
    发生时间: '2026-04-30 10:30:00',
    事件原因: '二期脱水机滤带跑偏报警频繁，暂未能恢复额定产能（演示：处置信息待录入）。',
    状态: '待处置',
    责任人: '王敏',
    应急处置: '减产运行并加强滤饼性状巡检，已报修等待配件。',
    更新时间: '2026-04-30 10:55:00',
    处置责任人: '',
    联系电话: '',
    处置描述: '',
    处置完成图片: [],
    处置完成时间: '',
  },
  {
    id: 'WWTP202504070005-EVT-20260430141500-01',
    污水厂编码: 'WWTP202504070005',
    污水厂名称: '杨林片区污水处理厂',
    事件类型: '设备故障',
    事件等级: '一般',
    发生时间: '2026-04-30 14:15:00',
    事件原因: '进水提升泵房液位计漂移导致频繁启停（演示：尚无处置闭环记录）。',
    状态: '待处置',
    责任人: '唐雪',
    应急处置: '暂改就地液位比对并加密人工测量。',
    更新时间: '2026-04-30 14:40:00',
    处置责任人: '',
    联系电话: '',
    处置描述: '',
    处置完成图片: [],
    处置完成时间: '',
  },
  {
    id: 'WWTP202504070006-EVT-20260429103000-01',
    污水厂编码: 'WWTP202504070006',
    污水厂名称: '如意镇污水处理厂',
    事件类型: '水质超标',
    事件等级: '重大',
    发生时间: '2026-04-29 10:30:00',
    事件原因: '进水 COD 突增，生化段负荷逼近上限（演示：可溯源分析；处置信息尚未填报）。',
    状态: '待处置',
    责任人: '何琳',
    应急处置: '限制高浓度支管接入并加大混凝投加量。',
    更新时间: '2026-04-29 11:05:00',
    处置责任人: '',
    联系电话: '',
    处置描述: '',
    处置完成图片: [],
    处置完成时间: '',
    告警指标: 'COD',
  },
  {
    id: 'WWTP202504070007-EVT-20260429160000-01',
    污水厂编码: 'WWTP202504070007',
    污水厂名称: '清溪北片污水处理厂',
    事件类型: '应急处置',
    事件等级: '较大',
    发生时间: '2026-04-29 16:00:00',
    事件原因: '强降雨预警下提前腾空管网末端容量（演示：处置过程待登记）。',
    状态: '待处置',
    责任人: '罗成',
    应急处置: '按预案降低进水负荷并通知管网运维联防。',
    更新时间: '2026-04-29 16:30:00',
    处置责任人: '',
    联系电话: '',
    处置描述: '',
    处置完成图片: [],
    处置完成时间: '',
  },
];

const genEventIdByPlant = (plantCode: string, existing: PlantEventRecord[]) => {
  const normalizedPlantCode = String(plantCode || 'WWTP').trim();
  const datePart = dayjs().format('YYYYMMDDHHmmss');
  const prefix = `${normalizedPlantCode}-EVT-${datePart}`;
  const seq = existing.filter(item => String(item.id || '').startsWith(prefix)).length + 1;
  return `${prefix}-${String(seq).padStart(2, '0')}`;
};
const splitTextToList = (v?: string): string[] =>
  String(v || '')
    .split(/[;,，、\n]/)
    .map(x => x.trim())
    .filter(Boolean);

/** 事件详情弹窗内容与「详情」按钮同源（供行点击复用） */
function renderPlantEventDetailTabs(record: PlantEventRecord, initialTab: 'basic' | 'disposal' = 'basic'): React.ReactNode {
  return (
    <Tabs
      defaultActiveKey={initialTab}
      items={[
        {
          key: 'basic',
          label: '基础信息',
          children: (
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="事件编号">{record.id}</Descriptions.Item>
              <Descriptions.Item label="污水厂">{`${record.污水厂名称}（${record.污水厂编码}）`}</Descriptions.Item>
              <Descriptions.Item label="事件类型">{record.事件类型}</Descriptions.Item>
              <Descriptions.Item label="事件等级">{record.事件等级}</Descriptions.Item>
              <Descriptions.Item label="发生时间">{record.发生时间}</Descriptions.Item>
              <Descriptions.Item label="上报人">{record.责任人 || '—'}</Descriptions.Item>
              <Descriptions.Item label="应急处置">{record.应急处置 || '—'}</Descriptions.Item>
              <Descriptions.Item label="更新时间">{record.更新时间}</Descriptions.Item>
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

export const PlantEventListView: React.FC<{
  onDetail: (title: string, content: React.ReactNode, modalWidth?: number | string) => void;
  plantSource: Array<{ id?: string; name?: string }>;
}> = ({ onDetail, plantSource }) => {
  const [filterForm] = Form.useForm<{
    plantCode?: string;
    eventType?: string;
    status?: PlantEventStatus;
    disposalKeyword?: string;
  }>();
  const [editForm] = Form.useForm<EventFormValues>();
  const editEventTypeWatch = Form.useWatch('事件类型', editForm);
  const [data, setData] = useState<PlantEventRecord[]>([...PLANT_EVENT_INITIAL]);
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [plantCodeFilter, setPlantCodeFilter] = useState<string | undefined>();
  const [eventTypeFilter, setEventTypeFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<PlantEventStatus | undefined>();
  const [disposalKeyword, setDisposalKeyword] = useState('');
  const [eventFormTab, setEventFormTab] = useState<'basic' | 'disposal'>('basic');
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  /** 水质类：溯源分析全屏；其余类型：事件联动分析（设备与纳管关联研判） */
  const [linkedAnalysis, setLinkedAnalysis] = useState<{
    record: PlantEventRecord;
    variant: 'sewer-trace' | 'event-linked';
  } | null>(null);

  const plantOptions = useMemo(
    () =>
      plantSource
        .filter(item => item && item.id)
        .map(item => ({
          value: String(item.id || ''),
          label: `${String(item.name || '未命名污水厂')}（${String(item.id || '')}）`,
        })),
    [plantSource],
  );
  
  const plantOptionsByCode = useMemo(
    () =>
      new Map(
        plantOptions.map(item => [
          item.value,
          {
            label: item.label,
            name: item.label.split('（')[0],
          },
        ]),
      ),
    [plantOptions],
  );

  const filteredData = useMemo(() => {
    const disposalQ = disposalKeyword.trim();
    return data.filter(item => {
      if (plantCodeFilter && item.污水厂编码 !== plantCodeFilter) return false;
      if (eventTypeFilter && item.事件类型 !== eventTypeFilter) return false;
      if (statusFilter && item.状态 !== statusFilter) return false;
      if (disposalQ && !String(item.应急处置 || '').includes(disposalQ)) return false;
      return true;
    });
  }, [data, disposalKeyword, eventTypeFilter, plantCodeFilter, statusFilter]);

  const openPlantEventReadonlyDetail = useCallback(
    (record: PlantEventRecord, initialTab: 'basic' | 'disposal' = 'basic') => {
      onDetail(`事件详情 - ${record.id}`, renderPlantEventDetailTabs(record, initialTab), 900);
    },
    [onDetail],
  );

  const openEditModal = (record: PlantEventRecord, tab: 'basic' | 'disposal' = 'basic') => {
    setEditingId(record.id);
    editForm.setFieldsValue({
      污水厂编码: record.污水厂编码,
      事件类型: record.事件类型,
      事件等级: record.事件等级,
      发生时间: dayjs(record.发生时间),
      状态: record.状态,
      责任人: record.责任人,
      应急处置: record.应急处置,
      更新时间: dayjs(record.更新时间),
      处置责任人: record.处置责任人,
      联系电话: record.联系电话,
      处置描述: record.处置描述,
      处置完成图片: (record.处置完成图片 || []).join(';'),
      处置完成时间: dayjs(record.处置完成时间),
      告警指标: record.告警指标,
    });
    setEventFormTab(tab);
    setAddOpen(true);
  };

  const allColumns: ColumnsType<PlantEventRecord> = [
    { title: '事件编号', dataIndex: 'id', key: 'id', width: 180 },
    { title: '污水厂编码', dataIndex: '污水厂编码', key: '污水厂编码', width: 140 },
    { title: '污水厂名称', dataIndex: '污水厂名称', key: '污水厂名称', width: 260 },
    { title: '事件类型', dataIndex: '事件类型', key: '事件类型', width: 180 },
    { title: '事件等级', dataIndex: '事件等级', key: '事件等级', width: 110 },
    { title: '发生时间', dataIndex: '发生时间', key: '发生时间', width: 180 },
    {
      title: '状态',
      dataIndex: '状态',
      key: '状态',
      width: 120,
      render: (value: PlantEventStatus) => {
        const color = value === '处置完成' ? 'success' : value === '终止' ? 'error' : 'warning';
        return <Tag color={color}>{value}</Tag>;
      },
    },
    { title: '责任人', dataIndex: '责任人', key: '责任人', width: 140 },
    { title: '更新时间', dataIndex: '更新时间', key: '更新时间', width: 180 },
    {
      title: '操作',
      key: 'operation',
      fixed: 'right',
      width: 340,
      onCell: () => ({
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
        },
      }),
      render: (_, record) => {
        const disposalFilled = hasPlantEventDisposalFilled({
          处置责任人: record.处置责任人,
          联系电话: record.联系电话,
          处置描述: record.处置描述,
          处置完成图片: record.处置完成图片,
          处置完成时间: record.处置完成时间,
        });
        return (
        <Space size={0}>
          <Button
            type="link"
            size="small"
            className="action-btn detail"
            icon={<EyeOutlined />}
            onClick={() => openPlantEventReadonlyDetail(record)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            className="action-btn"
            icon={disposalFilled ? <FileTextOutlined /> : <FormOutlined />}
            onClick={() =>
              disposalFilled ? openPlantEventReadonlyDetail(record, 'disposal') : openEditModal(record, 'disposal')
            }
          >
            {disposalFilled ? '填报信息' : '处置填报'}
          </Button>
          {isPlantWaterQualityTraceEvent(record.事件类型) ? (
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
      { key: 'id', title: '事件编号', dataIndex: 'id', width: 180, defaultVisible: true },
      { key: '污水厂编码', title: '污水厂编码', dataIndex: '污水厂编码', width: 140, defaultVisible: true },
      { key: '污水厂名称', title: '污水厂名称', dataIndex: '污水厂名称', width: 260, defaultVisible: true },
      { key: '事件类型', title: '事件类型', dataIndex: '事件类型', width: 180, defaultVisible: true },
      { key: '事件等级', title: '事件等级', dataIndex: '事件等级', width: 110, defaultVisible: true },
      { key: '发生时间', title: '发生时间', dataIndex: '发生时间', width: 180, defaultVisible: true },
      { key: '状态', title: '状态', dataIndex: '状态', width: 120, defaultVisible: true },
      { key: '责任人', title: '责任人', dataIndex: '责任人', width: 140, defaultVisible: true },
      { key: '更新时间', title: '更新时间', dataIndex: '更新时间', width: 180, defaultVisible: true },
      { key: 'operation', title: '操作', width: 340, fixed: 'right', defaultVisible: true },
    ],
    [],
  );
  useEffect(() => {
    if (!visibleColumns.length) {
      setVisibleColumns(getDefaultVisibleColumnKeys(allColumnConfigs));
    }
  }, [allColumnConfigs, visibleColumns.length]);
  const columns = allColumns.filter(col => visibleColumns.includes(col.key as string) || col.key === 'operation');

  const handleSearch = () => {
    const values = filterForm.getFieldsValue();
    setPlantCodeFilter(values.plantCode);
    setEventTypeFilter(values.eventType);
    setStatusFilter(values.status);
    setDisposalKeyword(String(values.disposalKeyword || '').trim());
  };

  const handleReset = () => {
    filterForm.resetFields();
    setPlantCodeFilter(undefined);
    setEventTypeFilter(undefined);
    setStatusFilter(undefined);
    setDisposalKeyword('');
  };

  const handleSave = () => {
    editForm.validateFields().then(values => {
      const plantCode = String(values.污水厂编码 || '');
      const plantOption = plantOptionsByCode.get(plantCode);
      if (!plantOption) {
        message.warning('未匹配到污水厂信息，请先在“污水厂信息”中维护台账');
        return;
      }
      const next: PlantEventRecord = {
        id: editingId || genEventIdByPlant(plantCode, data),
        污水厂编码: plantCode,
        污水厂名称: plantOption.name,
        事件类型: String(values.事件类型 || ''),
        事件等级: values.事件等级 || '一般',
        发生时间: (values.发生时间 || dayjs()).format('YYYY-MM-DD HH:mm:ss'),
        状态: values.状态 || '待处置',
        责任人: String(values.责任人 || ''),
        应急处置: String(values.应急处置 || ''),
        更新时间: (values.更新时间 || dayjs()).format('YYYY-MM-DD HH:mm:ss'),
        处置责任人: String(values.处置责任人 || ''),
        联系电话: String(values.联系电话 || ''),
        处置描述: String(values.处置描述 || ''),
        处置完成图片: splitTextToList(values.处置完成图片),
        处置完成时间: (values.处置完成时间 || dayjs()).format('YYYY-MM-DD HH:mm:ss'),
        告警指标: isPlantWaterQualityTraceEvent(String(values.事件类型 || ''))
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
      filteredData as unknown as Record<string, unknown>[],
      [
        { key: 'id', title: '事件编号', dataIndex: 'id' },
        { key: '污水厂编码', title: '污水厂编码', dataIndex: '污水厂编码' },
        { key: '污水厂名称', title: '污水厂名称', dataIndex: '污水厂名称' },
        { key: '事件类型', title: '事件类型', dataIndex: '事件类型' },
        { key: '事件等级', title: '事件等级', dataIndex: '事件等级' },
        { key: '告警指标', title: '告警指标', dataIndex: '告警指标' },
        { key: '发生时间', title: '发生时间', dataIndex: '发生时间' },
        { key: '状态', title: '状态', dataIndex: '状态' },
        { key: '责任人', title: '责任人', dataIndex: '责任人' },
        { key: '应急处置', title: '应急处置', dataIndex: '应急处置' },
        { key: '更新时间', title: '更新时间', dataIndex: '更新时间' },
        { key: '处置责任人', title: '处置责任人', dataIndex: '处置责任人' },
        { key: '联系电话', title: '联系电话', dataIndex: '联系电话' },
        { key: '处置描述', title: '处置描述', dataIndex: '处置描述' },
        { key: '处置完成图片', title: '处置完成图片', dataIndex: '处置完成图片' },
        { key: '处置完成时间', title: '处置完成时间', dataIndex: '处置完成时间' },
      ],
      '污水厂_事件列表',
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
              editForm.setFieldsValue({
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
      <Form form={filterForm} layout="inline" style={{ marginBottom: 16, rowGap: 12 }}>
        <Form.Item name="plantCode" style={{ marginBottom: 0 }}>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 260 }}
            placeholder="污水厂"
            options={plantOptions}
          />
        </Form.Item>
        <Form.Item name="eventType" style={{ marginBottom: 0 }}>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 200 }}
            placeholder="事件类型"
            options={EVENT_TYPE_OPTIONS.map(v => ({ value: v, label: v }))}
          />
        </Form.Item>
        <Form.Item name="status" style={{ marginBottom: 0 }}>
          <Select allowClear style={{ width: 160 }} placeholder="状态" options={EVENT_STATUS_OPTIONS} />
        </Form.Item>
        <Form.Item name="disposalKeyword" style={{ marginBottom: 0 }}>
          <Input allowClear placeholder="处置情况" style={{ width: 240 }} />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0 }}>
          <Space>
            <Button type="primary" className="search-btn" icon={<SearchOutlined />} onClick={handleSearch}>
              查询
            </Button>
            <Button onClick={handleReset}>重置</Button>
          </Space>
        </Form.Item>
      </Form>

      <div className="facility-table-wrap facility-event-list-table-wrap">
        <Table<PlantEventRecord>
          rowKey="id"
          size="middle"
          columns={columns}
          dataSource={filteredData}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1810 }}
          onRow={record => ({
            onClick: () => openPlantEventReadonlyDetail(record),
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
        <Form<EventFormValues> layout="vertical" form={editForm}>
          <Tabs
            activeKey={eventFormTab}
            onChange={key => setEventFormTab(key as 'basic' | 'disposal')}
            items={[
              {
                key: 'basic',
                label: '基础信息',
                children: (
                  <>
                    <Form.Item name="污水厂编码" label="污水厂" rules={[{ required: true, message: '请选择污水厂' }]}>
                      <Select allowClear showSearch optionFilterProp="label" options={plantOptions} placeholder="请选择污水厂" />
                    </Form.Item>
                    <Form.Item name="事件类型" label="事件类型" rules={[{ required: true, message: '请选择事件类型' }]}>
                      <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        options={EVENT_TYPE_OPTIONS.map(v => ({ value: v, label: v }))}
                        placeholder="请选择事件类型"
                      />
                    </Form.Item>
                    {isPlantWaterQualityTraceEvent(String(editEventTypeWatch || '')) ? (
                      <Form.Item name="告警指标" label="告警指标" tooltip="水质溯源排序与监测吻合演示用">
                        <Select
                          allowClear
                          placeholder="请选择厂进口告警指标"
                          options={[
                            { value: 'COD', label: 'COD' },
                            { value: 'NH3-N', label: 'NH3-N' },
                            { value: 'TP', label: 'TP' },
                            { value: 'TN', label: 'TN' },
                          ]}
                        />
                      </Form.Item>
                    ) : null}
                    <Form.Item name="事件等级" label="事件等级" rules={[{ required: true, message: '请选择事件等级' }]}>
                      <Select allowClear options={EVENT_LEVEL_OPTIONS} placeholder="请选择事件等级" />
                    </Form.Item>
                    <Form.Item name="发生时间" label="发生时间" rules={[{ required: true, message: '请选择发生时间' }]}>
                      <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm:ss" />
                    </Form.Item>
                    <Form.Item name="责任人" label="上报人" rules={[{ required: true, message: '请输入上报人' }]}>
                      <Input placeholder="请输入上报人" maxLength={30} />
                    </Form.Item>
                    <Form.Item name="应急处置" label="应急处置说明" rules={[{ required: true, message: '请输入应急处置说明' }]}>
                      <Input.TextArea rows={4} maxLength={500} placeholder="请详细记录事件全流程处置情况" />
                    </Form.Item>
                    <Form.Item name="更新时间" label="更新时间" rules={[{ required: true, message: '请选择更新时间' }]}>
                      <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm:ss" />
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
                    <Form.Item name="处置责任人" label="处置责任人" rules={[{ required: true, message: '请输入处置责任人' }]}>
                      <Input placeholder="请输入处置责任人" maxLength={30} />
                    </Form.Item>
                    <Form.Item
                      name="联系电话"
                      label="联系电话"
                      rules={[
                        { required: true, message: '请输入联系电话' },
                        { pattern: /^1\d{10}$/, message: '请输入11位手机号' },
                      ]}
                    >
                      <Input placeholder="请输入联系电话" maxLength={11} />
                    </Form.Item>
                    <Form.Item name="处置描述" label="处置描述" rules={[{ required: true, message: '请输入处置描述' }]}>
                      <Input.TextArea rows={5} maxLength={1000} placeholder="请填写详细处置描述" />
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
                          <Input placeholder="支持手动填写多个图片文件名或链接，使用分号分隔" maxLength={4000} />
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
        record={linkedAnalysis?.record ?? null}
        variant={linkedAnalysis?.variant ?? 'sewer-trace'}
        onClose={() => setLinkedAnalysis(null)}
        onOpenFacilityDetail={onDetail}
      />
      </Card>
    </div>
  );
};
