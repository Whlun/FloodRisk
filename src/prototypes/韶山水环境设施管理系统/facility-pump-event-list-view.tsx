/**
 * 设施管理 · 泵站管理 · 事件列表
 * 记录泵站运行过程中的各类事件，支持导入导出、字段管理、新增、详情、编辑。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, DatePicker, Descriptions, Form, Input, Modal, Select, Space, Table, Tabs, Tag, Upload, message } from 'antd';
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
import { hasPumpEventDisposalFilled } from './facility-event-disposal-filled';

type PumpEventLevel = '一般' | '较大' | '重大';
type PumpEventStatus = '待处置' | '处置完成' | '终止';

export type PumpEventRecord = {
  id: string;
  泵站编码: string;
  泵站名称: string;
  事件类型: string;
  事件等级: PumpEventLevel;
  发生时间: string;
  发生地点: string;
  事件原因: string;
  /** 与统一列表「处置建议」同源（可选） */
  应急处置?: string;
  状态: PumpEventStatus;
  责任人: string;
  更新时间: string;
  处置责任人: string;
  联系电话: string;
  /** 与统一列表「处置描述」同源；泵站单独页表单未录入时仅演示或统一列表写入 */
  处置描述?: string;
  处理过程: string;
  处理结果: string;
  处置完成图片: string[];
  处置完成时间: string;
};

type EventFormValues = {
  泵站编码?: string;
  事件类型?: string;
  事件等级?: PumpEventLevel;
  发生时间?: Dayjs;
  发生地点?: string;
  事件原因?: string;
  责任人?: string;
  更新时间?: Dayjs;
  状态?: PumpEventStatus;
  处置责任人?: string;
  联系电话?: string;
  处理过程?: string;
  处理结果?: string;
  处置完成图片?: string;
  处置完成时间?: Dayjs;
};

const EVENT_TYPE_OPTIONS = ['设备故障', '管道堵塞', '停电', '应急启动', '检修维护'];

const EVENT_LEVEL_OPTIONS: { value: PumpEventLevel; label: PumpEventLevel }[] = [
  { value: '一般', label: '一般' },
  { value: '较大', label: '较大' },
  { value: '重大', label: '重大' },
];

const EVENT_STATUS_OPTIONS: { value: PumpEventStatus; label: PumpEventStatus }[] = [
  { value: '待处置', label: '待处置' },
  { value: '处置完成', label: '处置完成' },
  { value: '终止', label: '终止' },
];

/** 演示数据：统一事件列表合并数据源（导出供 facility-unified-event-list-view 使用） */
export const PUMP_EVENT_INITIAL: PumpEventRecord[] = [
  /** 处置信息已填报 → 操作列为「填报信息」 */
  {
    id: 'PS202604010001-EVT-20260428103000-01',
    泵站编码: 'PS202604010001',
    泵站名称: '湘韶大道一体化泵站',
    事件类型: '设备故障',
    事件等级: '较大',
    发生时间: '2026-04-28 10:30:00',
    发生地点: '湘韶大道泵房 1 号机组',
    事件原因: '主泵轴承温升过快触发保护停机。',
    应急处置: '切换备用泵排水并通知维保到场。',
    状态: '处置完成',
    责任人: '李伟',
    更新时间: '2026-04-28 11:05:00',
    处置责任人: '张磊',
    联系电话: '13800138001',
    处置描述:
      '完成轴承更换与联轴器校正，满载试运行振动与温度正常，档案已归档。',
    处理过程: '停机隔离故障泵组，更换轴承与润滑，复测对中与振动。',
    处理结果: '恢复双泵热备，排水能力达标，闭环。',
    处置完成图片: ['泵站检修-湘韶-1.jpg', '泵站检修-湘韶-2.jpg'],
    处置完成时间: '2026-04-28 17:40:00',
  },
  {
    id: 'PS202604010002-EVT-20260427140000-01',
    泵站编码: 'PS202604010002',
    泵站名称: '清溪片区提升泵站',
    事件类型: '管道堵塞',
    事件等级: '一般',
    发生时间: '2026-04-27 14:00:00',
    发生地点: '进水汇流井前段',
    事件原因: '强降雨期漂浮物积聚导致过流断面收窄。',
    应急处置: '临时加大格栅频次并准备人工清掏。',
    状态: '终止',
    责任人: '周婷',
    更新时间: '2026-04-27 15:20:00',
    处置责任人: '刘芳',
    联系电话: '13900139002',
    处置描述: '清掏完成并加装临时拦污；后续管网排查工单已派发，本次事件终止。',
    处理过程: '拉开旁路、分段清掏并冲洗管道，恢复设计流量。',
    处理结果: '液位回落正常，无次生积水投诉。',
    处置完成图片: ['清掏记录-清溪-1.jpg'],
    处置完成时间: '2026-04-27 19:10:00',
  },
  /** 处置信息未填 → 操作列为「处置填报」 */
  {
    id: 'PS202604010003-EVT-20260430109000-01',
    泵站编码: 'PS202604010003',
    泵站名称: '韶山乡城乡一体排水提升泵站',
    事件类型: '检修维护',
    事件等级: '一般',
    发生时间: '2026-04-30 09:00:00',
    发生地点: '泵房格栅间',
    事件原因: '巡检发现格栅电机异响，已停机待维保研判（演示：处置信息尚未录入）。',
    应急处置: '切换并联格栅通路，保证进水通道。',
    状态: '待处置',
    责任人: '陈刚',
    更新时间: '2026-04-30 09:18:00',
    处置责任人: '',
    联系电话: '',
    处理过程: '',
    处理结果: '',
    处置完成图片: [],
    处置完成时间: '',
  },
  {
    id: 'PS202604010004-EVT-20260429161000-01',
    泵站编码: 'PS202604010004',
    泵站名称: '杨林乡南片排涝泵站',
    事件类型: '应急启动',
    事件等级: '较大',
    发生时间: '2026-04-29 16:10:00',
    发生地点: '泵站配电间外平台',
    事件原因: '上游水库调度预警，需提前排空下游管道水位（演示：待填报处置过程与结果）。',
    应急处置: '按预案预排空并加密水位巡查。',
    状态: '待处置',
    责任人: '王敏',
    更新时间: '2026-04-29 16:35:00',
    处置责任人: '',
    联系电话: '',
    处理过程: '',
    处理结果: '',
    处置完成图片: [],
    处置完成时间: '',
  },
];

const genEventIdByPump = (pumpCode: string, existing: PumpEventRecord[]) => {
  const normalizedPumpCode = String(pumpCode || 'PS').trim();
  const datePart = dayjs().format('YYYYMMDDHHmmss');
  const prefix = `${normalizedPumpCode}-EVT-${datePart}`;
  const seq = existing.filter(item => String(item.id || '').startsWith(prefix)).length + 1;
  return `${prefix}-${String(seq).padStart(2, '0')}`;
};

const splitTextToList = (v?: string): string[] =>
  String(v || '')
    .split(/[;,，、\n]/)
    .map(x => x.trim())
    .filter(Boolean);

/** 事件详情 Tabs（详情 / 填报信息 按钮复用） */
function renderPumpEventDetailTabs(record: PumpEventRecord, initialTab: 'basic' | 'disposal' = 'basic'): React.ReactNode {
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
              <Descriptions.Item label="泵站">{`${record.泵站名称}（${record.泵站编码}）`}</Descriptions.Item>
              <Descriptions.Item label="事件类型">{record.事件类型}</Descriptions.Item>
              <Descriptions.Item label="事件等级">{record.事件等级}</Descriptions.Item>
              <Descriptions.Item label="发生时间">{record.发生时间}</Descriptions.Item>
              <Descriptions.Item label="发生地点">{record.发生地点 || '—'}</Descriptions.Item>
              <Descriptions.Item label="事件原因">{record.事件原因 || '—'}</Descriptions.Item>
              <Descriptions.Item label="上报人">{record.责任人 || '—'}</Descriptions.Item>
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
              <Descriptions.Item label="处理过程">{record.处理过程 || '—'}</Descriptions.Item>
              <Descriptions.Item label="处理结果">{record.处理结果 || '—'}</Descriptions.Item>
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

export const PumpEventListView: React.FC<{
  onDetail: (title: string, content: React.ReactNode, modalWidth?: number | string) => void;
  pumpSource: Array<{ id?: string; name?: string }>;
}> = ({ onDetail, pumpSource }) => {
  const [filterForm] = Form.useForm<{
    pumpCode?: string;
    eventType?: string;
    status?: PumpEventStatus;
    eventIdKeyword?: string;
    ownerKeyword?: string;
    resultKeyword?: string;
  }>();
  const [editForm] = Form.useForm<EventFormValues>();
  const [data, setData] = useState<PumpEventRecord[]>([...PUMP_EVENT_INITIAL]);
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pumpCodeFilter, setPumpCodeFilter] = useState<string | undefined>();
  const [eventTypeFilter, setEventTypeFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<PumpEventStatus | undefined>();
  const [eventIdKeyword, setEventIdKeyword] = useState('');
  const [ownerKeyword, setOwnerKeyword] = useState('');
  const [resultKeyword, setResultKeyword] = useState('');
  const [eventFormTab, setEventFormTab] = useState<'basic' | 'disposal'>('basic');
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  const pumpOptions = useMemo(
    () =>
      pumpSource
        .filter(item => item && item.id)
        .map(item => ({
          value: String(item.id || ''),
          label: `${String(item.name || '未命名泵站')}（${String(item.id || '')}）`,
        })),
    [pumpSource],
  );

  const pumpOptionsByCode = useMemo(
    () =>
      new Map(
        pumpOptions.map(item => [
          item.value,
          {
            label: item.label,
            name: item.label.split('（')[0],
          },
        ]),
      ),
    [pumpOptions],
  );

  const filteredData = useMemo(() => {
    const idQ = eventIdKeyword.trim();
    const ownerQ = ownerKeyword.trim();
    const resultQ = resultKeyword.trim();
    return data.filter(item => {
      if (pumpCodeFilter && item.泵站编码 !== pumpCodeFilter) return false;
      if (eventTypeFilter && item.事件类型 !== eventTypeFilter) return false;
      if (statusFilter && item.状态 !== statusFilter) return false;
      if (idQ && !String(item.id || '').includes(idQ)) return false;
      if (ownerQ && !String(item.责任人 || '').includes(ownerQ)) return false;
      if (resultQ && !String(item.处理结果 || '').includes(resultQ)) return false;
      return true;
    });
  }, [data, eventIdKeyword, eventTypeFilter, ownerKeyword, pumpCodeFilter, resultKeyword, statusFilter]);

  const openEditModal = (record: PumpEventRecord, tab: 'basic' | 'disposal' = 'basic') => {
    setEditingId(record.id);
    editForm.setFieldsValue({
      泵站编码: record.泵站编码,
      事件类型: record.事件类型,
      事件等级: record.事件等级,
      发生时间: dayjs(record.发生时间),
      发生地点: record.发生地点,
      事件原因: record.事件原因,
      状态: record.状态,
      责任人: record.责任人,
      更新时间: dayjs(record.更新时间),
      处置责任人: record.处置责任人,
      联系电话: record.联系电话,
      处理过程: record.处理过程,
      处理结果: record.处理结果,
      处置完成图片: (record.处置完成图片 || []).join(';'),
      处置完成时间: dayjs(record.处置完成时间),
    });
    setEventFormTab(tab);
    setAddOpen(true);
  };

  const allColumns: ColumnsType<PumpEventRecord> = [
    { title: '事件编号', dataIndex: 'id', key: 'id', width: 220 },
    { title: '泵站编码', dataIndex: '泵站编码', key: '泵站编码', width: 160 },
    { title: '泵站名称', dataIndex: '泵站名称', key: '泵站名称', width: 220 },
    { title: '事件类型', dataIndex: '事件类型', key: '事件类型', width: 150 },
    { title: '事件等级', dataIndex: '事件等级', key: '事件等级', width: 110 },
    { title: '发生时间', dataIndex: '发生时间', key: '发生时间', width: 180 },
    { title: '发生地点', dataIndex: '发生地点', key: '发生地点', width: 220 },
    { title: '事件原因', dataIndex: '事件原因', key: '事件原因', width: 280 },
    {
      title: '状态',
      dataIndex: '状态',
      key: '状态',
      width: 120,
      render: (value: PumpEventStatus) => {
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
      width: 268,
      render: (_, record) => {
        const disposalFilled = hasPumpEventDisposalFilled({
          处置责任人: record.处置责任人,
          联系电话: record.联系电话,
          处置描述: record.处置描述,
          处理过程: record.处理过程,
          处理结果: record.处理结果,
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
              onClick={() => onDetail(`事件详情 - ${record.id}`, renderPumpEventDetailTabs(record, 'basic'), 900)}
            >
              详情
            </Button>
            <Button
              type="link"
              size="small"
              className="action-btn"
              icon={disposalFilled ? <FileTextOutlined /> : <FormOutlined />}
              onClick={() =>
                disposalFilled
                  ? onDetail(`事件详情 - ${record.id}`, renderPumpEventDetailTabs(record, 'disposal'), 900)
                  : openEditModal(record, 'disposal')
              }
            >
              {disposalFilled ? '填报信息' : '处置填报'}
            </Button>
            <Button type="link" size="small" className="action-btn edit" icon={<EditOutlined />} onClick={() => openEditModal(record, 'basic')}>
              编辑
            </Button>
          </Space>
        );
      },
    },
  ];

  const allColumnConfigs = useMemo<ColumnConfig[]>(
    () => [
      { key: 'id', title: '事件编号', dataIndex: 'id', width: 220, defaultVisible: true },
      { key: '泵站编码', title: '泵站编码', dataIndex: '泵站编码', width: 160, defaultVisible: true },
      { key: '泵站名称', title: '泵站名称', dataIndex: '泵站名称', width: 220, defaultVisible: true },
      { key: '事件类型', title: '事件类型', dataIndex: '事件类型', width: 150, defaultVisible: true },
      { key: '事件等级', title: '事件等级', dataIndex: '事件等级', width: 110, defaultVisible: true },
      { key: '发生时间', title: '发生时间', dataIndex: '发生时间', width: 180, defaultVisible: true },
      { key: '发生地点', title: '发生地点', dataIndex: '发生地点', width: 220, defaultVisible: true },
      { key: '事件原因', title: '事件原因', dataIndex: '事件原因', width: 280, defaultVisible: true },
      { key: '状态', title: '状态', dataIndex: '状态', width: 120, defaultVisible: true },
      { key: '责任人', title: '责任人', dataIndex: '责任人', width: 140, defaultVisible: true },
      { key: '更新时间', title: '更新时间', dataIndex: '更新时间', width: 180, defaultVisible: true },
      { key: 'operation', title: '操作', width: 268, fixed: 'right', defaultVisible: true },
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
    setPumpCodeFilter(values.pumpCode);
    setEventTypeFilter(values.eventType);
    setStatusFilter(values.status);
    setEventIdKeyword(String(values.eventIdKeyword || '').trim());
    setOwnerKeyword(String(values.ownerKeyword || '').trim());
    setResultKeyword(String(values.resultKeyword || '').trim());
  };

  const handleReset = () => {
    filterForm.resetFields();
    setPumpCodeFilter(undefined);
    setEventTypeFilter(undefined);
    setStatusFilter(undefined);
    setEventIdKeyword('');
    setOwnerKeyword('');
    setResultKeyword('');
  };

  const handleSave = () => {
    editForm.validateFields().then(values => {
      const pumpCode = String(values.泵站编码 || '');
      const pumpOption = pumpOptionsByCode.get(pumpCode);
      if (!pumpOption) {
        message.warning('未匹配到泵站信息，请先在“泵站信息”中维护台账');
        return;
      }
      const prevPump = editingId ? data.find(item => item.id === editingId) : undefined;
      const next: PumpEventRecord = {
        id: editingId || genEventIdByPump(pumpCode, data),
        泵站编码: pumpCode,
        泵站名称: pumpOption.name,
        事件类型: String(values.事件类型 || ''),
        事件等级: values.事件等级 || '一般',
        发生时间: (values.发生时间 || dayjs()).format('YYYY-MM-DD HH:mm:ss'),
        发生地点: String(values.发生地点 || ''),
        事件原因: String(values.事件原因 || ''),
        状态: values.状态 || '待处置',
        责任人: String(values.责任人 || ''),
        更新时间: (values.更新时间 || dayjs()).format('YYYY-MM-DD HH:mm:ss'),
        处置责任人: String(values.处置责任人 || ''),
        联系电话: String(values.联系电话 || ''),
        // 单独列表表单未维护「处置描述」时保留原值（如统一列表或演示数据写入）
        处置描述: prevPump?.处置描述,
        处理过程: String(values.处理过程 || ''),
        处理结果: String(values.处理结果 || ''),
        处置完成图片: splitTextToList(values.处置完成图片),
        处置完成时间: (values.处置完成时间 || dayjs()).format('YYYY-MM-DD HH:mm:ss'),
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
        { key: '泵站编码', title: '泵站编码', dataIndex: '泵站编码' },
        { key: '泵站名称', title: '泵站名称', dataIndex: '泵站名称' },
        { key: '事件类型', title: '事件类型', dataIndex: '事件类型' },
        { key: '事件等级', title: '事件等级', dataIndex: '事件等级' },
        { key: '发生时间', title: '发生时间', dataIndex: '发生时间' },
        { key: '发生地点', title: '发生地点', dataIndex: '发生地点' },
        { key: '事件原因', title: '事件原因', dataIndex: '事件原因' },
        { key: '状态', title: '状态', dataIndex: '状态' },
        { key: '责任人', title: '责任人', dataIndex: '责任人' },
        { key: '更新时间', title: '更新时间', dataIndex: '更新时间' },
        { key: '处置责任人', title: '处置责任人', dataIndex: '处置责任人' },
        { key: '联系电话', title: '联系电话', dataIndex: '联系电话' },
        { key: '处理过程', title: '处理过程', dataIndex: '处理过程' },
        { key: '处理结果', title: '处理结果', dataIndex: '处理结果' },
        { key: '处置完成图片', title: '处置完成图片', dataIndex: '处置完成图片' },
        { key: '处置完成时间', title: '处置完成时间', dataIndex: '处置完成时间' },
      ],
      '泵站_事件列表',
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
          <Form.Item name="pumpCode" style={{ marginBottom: 0 }}>
            <Select allowClear showSearch optionFilterProp="label" style={{ width: 260 }} placeholder="泵站" options={pumpOptions} />
          </Form.Item>
          <Form.Item name="eventType" style={{ marginBottom: 0 }}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: 180 }}
              placeholder="事件类型"
              options={EVENT_TYPE_OPTIONS.map(v => ({ value: v, label: v }))}
            />
          </Form.Item>
          <Form.Item name="status" style={{ marginBottom: 0 }}>
            <Select allowClear style={{ width: 160 }} placeholder="状态" options={EVENT_STATUS_OPTIONS} />
          </Form.Item>
          <Form.Item name="eventIdKeyword" style={{ marginBottom: 0 }}>
            <Input allowClear placeholder="事件编号" style={{ width: 190 }} />
          </Form.Item>
          <Form.Item name="ownerKeyword" style={{ marginBottom: 0 }}>
            <Input allowClear placeholder="责任人" style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="resultKeyword" style={{ marginBottom: 0 }}>
            <Input allowClear placeholder="处理结果" style={{ width: 220 }} />
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
          <Table<PumpEventRecord>
            rowKey="id"
            size="middle"
            columns={columns}
            dataSource={filteredData}
            pagination={{ defaultPageSize: 10 }}
            scroll={{ x: 2360 }}
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
                      <Form.Item name="泵站编码" label="泵站" rules={[{ required: true, message: '请选择泵站' }]}>
                        <Select allowClear showSearch optionFilterProp="label" options={pumpOptions} placeholder="请选择泵站" />
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
                      <Form.Item name="事件等级" label="事件等级" rules={[{ required: true, message: '请选择事件等级' }]}>
                        <Select allowClear options={EVENT_LEVEL_OPTIONS} placeholder="请选择事件等级" />
                      </Form.Item>
                      <Form.Item name="发生时间" label="发生时间" rules={[{ required: true, message: '请选择发生时间' }]}>
                        <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm:ss" />
                      </Form.Item>
                      <Form.Item name="发生地点" label="发生地点" rules={[{ required: true, message: '请输入发生地点' }]}>
                        <Input placeholder="请输入事件发生地点" maxLength={120} />
                      </Form.Item>
                      <Form.Item name="事件原因" label="事件原因" rules={[{ required: true, message: '请输入事件原因' }]}>
                        <Input.TextArea rows={3} maxLength={500} placeholder="请填写事件发生原因" />
                      </Form.Item>
                      <Form.Item name="责任人" label="上报人" rules={[{ required: true, message: '请输入上报人' }]}>
                        <Input placeholder="请输入上报人" maxLength={30} />
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
                      <Form.Item name="处理过程" label="处理过程" rules={[{ required: true, message: '请输入处理过程' }]}>
                        <Input.TextArea rows={4} maxLength={1000} placeholder="请详细记录事件处理过程" />
                      </Form.Item>
                      <Form.Item name="处理结果" label="处理结果" rules={[{ required: true, message: '请输入处理结果' }]}>
                        <Input.TextArea rows={4} maxLength={1000} placeholder="请填写事件最终处理结果" />
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
      </Card>
    </div>
  );
};
