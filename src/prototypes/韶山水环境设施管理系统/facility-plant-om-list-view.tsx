/**
 * 设施管理 · 污水厂管理 · 运维信息
 * 记录污水处理厂日常运维数据，支持导入导出、字段管理、新增、详情、编辑。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, DatePicker, Descriptions, Form, Input, Modal, Select, Space, Table, Upload, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import { DownloadOutlined, EditOutlined, EyeOutlined, PlusOutlined, SearchOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { downloadTableFullExcel } from '../shared/facilityTableXlsxExport';
import { PipeLineColumnManager, type ColumnConfig, getDefaultVisibleColumnKeys } from './pipe-line-table-kit';

type OmCategory = '巡检记录' | '维修台账' | '设备保养计划' | '药剂消耗' | '污泥处置记录' | '人员培训记录';
type PlantOmRecord = {
  id: string;
  污水厂编码: string;
  污水厂名称: string;
  运维类别: OmCategory;
  运维标题: string;
  责任人: string;
  联系电话: string;
  记录时间: string;
  更新时间: string;
  运维内容: string;
  备注: string;
  运维图片: string[];
};

type OmFormValues = {
  污水厂编码?: string;
  运维类别?: OmCategory;
  运维标题?: string;
  责任人?: string;
  联系电话?: string;
  记录时间?: Dayjs;
  更新时间?: Dayjs;
  运维内容?: string;
  备注?: string;
  运维图片?: string;
};

const OM_CATEGORY_OPTIONS: { value: OmCategory; label: OmCategory }[] = [
  { value: '巡检记录', label: '巡检记录' },
  { value: '维修台账', label: '维修台账' },
  { value: '设备保养计划', label: '设备保养计划' },
  { value: '药剂消耗', label: '药剂消耗' },
  { value: '污泥处置记录', label: '污泥处置记录' },
  { value: '人员培训记录', label: '人员培训记录' },
];

const PLANT_OM_INITIAL: PlantOmRecord[] = [
  {
    id: 'PLT-OM-20260426001',
    污水厂编码: 'WWTP202504070001',
    污水厂名称: '高新区污水处理厂',
    运维类别: '巡检记录',
    运维标题: '4月26日机房与格栅间联合巡检',
    责任人: '李伟',
    联系电话: '13800138001',
    记录时间: '2026-04-26 09:20:00',
    更新时间: '2026-04-26 10:05:00',
    运维内容: '完成机房、格栅间、提升泵房巡检，电机温升与振动值正常。',
    备注: '巡检单已上传至运维系统。',
    运维图片: ['巡检-高新区-0426-1.jpg', '巡检-高新区-0426-2.jpg'],
  },
  {
    id: 'PLT-OM-20260425002',
    污水厂编码: 'WWTP202504070002',
    污水厂名称: '清溪片区污水处理厂',
    运维类别: '设备保养计划',
    运维标题: '鼓风机季度保养计划执行',
    责任人: '周婷',
    联系电话: '13900139002',
    记录时间: '2026-04-25 14:30:00',
    更新时间: '2026-04-25 17:20:00',
    运维内容: '完成1#、2#鼓风机滤芯更换及润滑维护，3#机组待停机窗口实施。',
    备注: '计划于4月28日前全部完成。',
    运维图片: ['保养-清溪片区-0425-1.jpg'],
  },
  {
    id: 'PLT-OM-20260424003',
    污水厂编码: 'WWTP202504070003',
    污水厂名称: '银田片区污水处理厂',
    运维类别: '维修台账',
    运维标题: '提升泵联轴器更换',
    责任人: '陈刚',
    联系电话: '13800138003',
    记录时间: '2026-04-24 08:40:00',
    更新时间: '2026-04-24 11:10:00',
    运维内容: '2#提升泵联轴器磨损超限，已更换并完成空载试车。',
    备注: '建议下月复检对中精度。',
    运维图片: ['维修-银田片区-0424-1.jpg'],
  },
  {
    id: 'PLT-OM-20260423004',
    污水厂编码: 'WWTP202504070004',
    污水厂名称: '韶山乡污水处理厂',
    运维类别: '药剂消耗',
    运维标题: '4月第三周药剂消耗登记',
    责任人: '王敏',
    联系电话: '13800138004',
    记录时间: '2026-04-23 16:30:00',
    更新时间: '2026-04-23 17:00:00',
    运维内容: 'PAC消耗2.1吨，PAM消耗0.36吨，次氯酸钠消耗0.42吨。',
    备注: '库存可满足10天运行。',
    运维图片: ['药剂-韶山乡-0423-1.jpg'],
  },
  {
    id: 'PLT-OM-20260422005',
    污水厂编码: 'WWTP202504070005',
    污水厂名称: '杨林片区污水处理厂',
    运维类别: '污泥处置记录',
    运维标题: '污泥外运处置联单登记',
    责任人: '唐雪',
    联系电话: '13800138005',
    记录时间: '2026-04-22 15:20:00',
    更新时间: '2026-04-22 16:05:00',
    运维内容: '当日外运脱水污泥18.6吨，已完成联单签收与电子留痕。',
    备注: '处置单位反馈接收正常。',
    运维图片: ['污泥-杨林-0422-1.jpg'],
  },
  {
    id: 'PLT-OM-20260421006',
    污水厂编码: 'WWTP202504070006',
    污水厂名称: '如意镇污水处理厂',
    运维类别: '人员培训记录',
    运维标题: '有限空间作业安全培训',
    责任人: '何琳',
    联系电话: '13800138006',
    记录时间: '2026-04-21 13:30:00',
    更新时间: '2026-04-21 14:10:00',
    运维内容: '组织当班人员开展有限空间作业风险辨识与应急演练培训。',
    备注: '参训人员12人，考核均合格。',
    运维图片: ['培训-如意镇-0421-1.jpg', '培训-如意镇-0421-2.jpg'],
  },
  {
    id: 'PLT-OM-20260420007',
    污水厂编码: 'WWTP202504070007',
    污水厂名称: '清溪北片污水处理厂',
    运维类别: '巡检记录',
    运维标题: '生化池曝气系统巡检',
    责任人: '罗成',
    联系电话: '13800138007',
    记录时间: '2026-04-20 09:10:00',
    更新时间: '2026-04-20 09:55:00',
    运维内容: '检查曝气主管压力、风机负载与溶解氧在线数据，运行正常。',
    备注: '建议晚高峰时段复测一次。',
    运维图片: ['巡检-清溪北-0420-1.jpg'],
  },
  {
    id: 'PLT-OM-20260419008',
    污水厂编码: 'WWTP202504070008',
    污水厂名称: '银田东片污水处理厂',
    运维类别: '维修台账',
    运维标题: '在线pH计探头更换',
    责任人: '谭峰',
    联系电话: '13800138008',
    记录时间: '2026-04-19 10:25:00',
    更新时间: '2026-04-19 11:00:00',
    运维内容: '出水在线pH计探头漂移异常，完成更换并二点标定。',
    备注: '已联动中控校核数据。',
    运维图片: ['维修-银田东-0419-1.jpg'],
  },
  {
    id: 'PLT-OM-20260418009',
    污水厂编码: 'WWTP202504070009',
    污水厂名称: '红旗片区污水处理厂',
    运维类别: '设备保养计划',
    运维标题: '脱水机月度保养',
    责任人: '蒋宁',
    联系电话: '13800138009',
    记录时间: '2026-04-18 14:15:00',
    更新时间: '2026-04-18 15:30:00',
    运维内容: '完成脱水机传动部件润滑、皮带张紧与清洗保养。',
    备注: '下次保养计划为5月18日。',
    运维图片: ['保养-红旗-0418-1.jpg'],
  },
  {
    id: 'PLT-OM-20260417010',
    污水厂编码: 'WWTP202504070010',
    污水厂名称: '韶北工业污水处理厂',
    运维类别: '药剂消耗',
    运维标题: '工业废水段药剂补给记录',
    责任人: '曾宇',
    联系电话: '13800138010',
    记录时间: '2026-04-17 16:50:00',
    更新时间: '2026-04-17 17:15:00',
    运维内容: '混凝剂补给1.4吨，中和剂补给0.8吨，库存已更新。',
    备注: '高浓度来水期间需提高补给频次。',
    运维图片: ['药剂-韶北工业-0417-1.jpg'],
  },
  {
    id: 'PLT-OM-20260416011',
    污水厂编码: 'WWTP202504070011',
    污水厂名称: '韶南片区污水处理厂',
    运维类别: '污泥处置记录',
    运维标题: '污泥暂存池清运登记',
    责任人: '吕静',
    联系电话: '13800138011',
    记录时间: '2026-04-16 11:20:00',
    更新时间: '2026-04-16 12:00:00',
    运维内容: '清运污泥12.3吨，暂存池液位恢复至安全区间。',
    备注: '清运车辆轨迹和联单已留存。',
    运维图片: ['污泥-韶南-0416-1.jpg'],
  },
  {
    id: 'PLT-OM-20260415012',
    污水厂编码: 'WWTP202504070012',
    污水厂名称: '旅游服务区污水处理厂',
    运维类别: '人员培训记录',
    运维标题: '节假日高峰运行保障培训',
    责任人: '邓超',
    联系电话: '13800138012',
    记录时间: '2026-04-15 09:40:00',
    更新时间: '2026-04-15 10:20:00',
    运维内容: '围绕客流高峰工况切换、应急旁路启停开展专项培训。',
    备注: '培训资料已同步至班组共享盘。',
    运维图片: ['培训-旅游服务区-0415-1.jpg'],
  },
];

const genOmId = () => `PLT-OM-${Date.now()}`;
const splitTextToList = (v?: string): string[] =>
  String(v || '')
    .split(/[;,，、\n]/)
    .map(x => x.trim())
    .filter(Boolean);

export const PlantOmListView: React.FC<{
  onDetail: (title: string, content: React.ReactNode, modalWidth?: number | string) => void;
  plantSource: Array<{ id?: string; name?: string }>;
}> = ({ onDetail, plantSource }) => {
  const [filterForm] = Form.useForm<{
    plantCode?: string;
    category?: OmCategory;
    dateRange?: [Dayjs, Dayjs];
    ownerKeyword?: string;
    idKeyword?: string;
    titleKeyword?: string;
  }>();
  const [editForm] = Form.useForm<OmFormValues>();
  const [data, setData] = useState<PlantOmRecord[]>([...PLANT_OM_INITIAL]);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [plantCodeFilter, setPlantCodeFilter] = useState<string | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<OmCategory | undefined>();
  const [rangeFilter, setRangeFilter] = useState<[Dayjs, Dayjs] | undefined>();
  const [ownerKeyword, setOwnerKeyword] = useState('');
  const [idKeyword, setIdKeyword] = useState('');
  const [titleKeyword, setTitleKeyword] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

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
    const ownerQ = ownerKeyword.trim();
    const idQ = idKeyword.trim();
    const titleQ = titleKeyword.trim();
    return data.filter(item => {
      if (plantCodeFilter && item.污水厂编码 !== plantCodeFilter) return false;
      if (categoryFilter && item.运维类别 !== categoryFilter) return false;
      if (rangeFilter && rangeFilter.length === 2) {
        const recordTime = dayjs(item.记录时间);
        const [start, end] = rangeFilter;
        if (recordTime.isBefore(start) || recordTime.isAfter(end)) return false;
      }
      if (ownerQ && !String(item.责任人 || '').includes(ownerQ)) {
        return false;
      }
      if (idQ && !String(item.id || '').includes(idQ)) return false;
      if (titleQ && !String(item.运维标题 || '').includes(titleQ)) return false;
      return true;
    });
  }, [categoryFilter, data, idKeyword, ownerKeyword, plantCodeFilter, rangeFilter, titleKeyword]);

  const allColumns: ColumnsType<PlantOmRecord> = [
    { title: '运维编号', dataIndex: 'id', key: 'id', width: 180 },
    { title: '污水厂编码', dataIndex: '污水厂编码', key: '污水厂编码', width: 140 },
    { title: '污水厂名称', dataIndex: '污水厂名称', key: '污水厂名称', width: 260 },
    { title: '运维类别', dataIndex: '运维类别', key: '运维类别', width: 140 },
    { title: '运维标题', dataIndex: '运维标题', key: '运维标题', width: 260 },
    { title: '责任人', dataIndex: '责任人', key: '责任人', width: 140 },
    { title: '记录时间', dataIndex: '记录时间', key: '记录时间', width: 180 },
    { title: '更新时间', dataIndex: '更新时间', key: '更新时间', width: 180 },
    {
      title: '操作',
      key: 'operation',
      fixed: 'right',
      width: 150,
      render: (_, record) => (
        <Space size={0}>
          <Button
            type="link"
            size="small"
            className="action-btn detail"
            icon={<EyeOutlined />}
            onClick={() =>
              onDetail(
                `运维信息详情 - ${record.id}`,
                <Descriptions bordered column={1} size="small">
                  <Descriptions.Item label="运维编号">{record.id}</Descriptions.Item>
                  <Descriptions.Item label="污水厂">{`${record.污水厂名称}（${record.污水厂编码}）`}</Descriptions.Item>
                  <Descriptions.Item label="运维类别">{record.运维类别}</Descriptions.Item>
                  <Descriptions.Item label="运维标题">{record.运维标题}</Descriptions.Item>
                  <Descriptions.Item label="责任人">{record.责任人 || '—'}</Descriptions.Item>
                  <Descriptions.Item label="联系电话">{record.联系电话 || '—'}</Descriptions.Item>
                  <Descriptions.Item label="记录时间">{record.记录时间}</Descriptions.Item>
                  <Descriptions.Item label="运维内容">{record.运维内容 || '—'}</Descriptions.Item>
                  <Descriptions.Item label="运维图片">{record.运维图片?.length ? record.运维图片.join('；') : '—'}</Descriptions.Item>
                  <Descriptions.Item label="备注">{record.备注 || '—'}</Descriptions.Item>
                  <Descriptions.Item label="更新时间">{record.更新时间}</Descriptions.Item>
                </Descriptions>,
                900,
              )
            }
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            className="action-btn edit"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingId(record.id);
              editForm.setFieldsValue({
                污水厂编码: record.污水厂编码,
                运维类别: record.运维类别,
                运维标题: record.运维标题,
                责任人: record.责任人,
                联系电话: record.联系电话,
                记录时间: dayjs(record.记录时间),
                更新时间: dayjs(record.更新时间),
                运维内容: record.运维内容,
                备注: record.备注,
                运维图片: (record.运维图片 || []).join(';'),
              });
              setEditOpen(true);
            }}
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  const allColumnConfigs = useMemo<ColumnConfig[]>(
    () => [
      { key: 'id', title: '运维编号', dataIndex: 'id', width: 180, defaultVisible: true },
      { key: '污水厂编码', title: '污水厂编码', dataIndex: '污水厂编码', width: 140, defaultVisible: true },
      { key: '污水厂名称', title: '污水厂名称', dataIndex: '污水厂名称', width: 260, defaultVisible: true },
      { key: '运维类别', title: '运维类别', dataIndex: '运维类别', width: 140, defaultVisible: true },
      { key: '运维标题', title: '运维标题', dataIndex: '运维标题', width: 260, defaultVisible: true },
      { key: '责任人', title: '责任人', dataIndex: '责任人', width: 140, defaultVisible: true },
      { key: '记录时间', title: '记录时间', dataIndex: '记录时间', width: 180, defaultVisible: true },
      { key: '更新时间', title: '更新时间', dataIndex: '更新时间', width: 180, defaultVisible: true },
      { key: 'operation', title: '操作', width: 150, fixed: 'right', defaultVisible: true },
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
    setCategoryFilter(values.category);
    setRangeFilter(values.dateRange);
    setOwnerKeyword(String(values.ownerKeyword || '').trim());
    setIdKeyword(String(values.idKeyword || '').trim());
    setTitleKeyword(String(values.titleKeyword || '').trim());
  };

  const handleReset = () => {
    filterForm.resetFields();
    setPlantCodeFilter(undefined);
    setCategoryFilter(undefined);
    setRangeFilter(undefined);
    setOwnerKeyword('');
    setIdKeyword('');
    setTitleKeyword('');
  };

  const handleSave = () => {
    editForm.validateFields().then(values => {
      const plantCode = String(values.污水厂编码 || '');
      const plantOption = plantOptionsByCode.get(plantCode);
      if (!plantOption) {
        message.warning('未匹配到污水厂信息，请先在“污水厂信息”中维护台账');
        return;
      }
      const next: PlantOmRecord = {
        id: editingId || genOmId(),
        污水厂编码: plantCode,
        污水厂名称: plantOption.name,
        运维类别: values.运维类别 || '巡检记录',
        运维标题: String(values.运维标题 || ''),
        责任人: String(values.责任人 || ''),
        联系电话: String(values.联系电话 || ''),
        记录时间: (values.记录时间 || dayjs()).format('YYYY-MM-DD HH:mm:ss'),
        更新时间: (values.更新时间 || dayjs()).format('YYYY-MM-DD HH:mm:ss'),
        运维内容: String(values.运维内容 || ''),
        备注: String(values.备注 || ''),
        运维图片: splitTextToList(values.运维图片),
      };
      setData(prev => (editingId ? prev.map(item => (item.id === editingId ? next : item)) : [next, ...prev]));
      message.success(editingId ? '运维信息编辑成功' : '运维信息新增成功');
      setEditOpen(false);
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
        { key: 'id', title: '运维编号', dataIndex: 'id' },
        { key: '污水厂编码', title: '污水厂编码', dataIndex: '污水厂编码' },
        { key: '污水厂名称', title: '污水厂名称', dataIndex: '污水厂名称' },
        { key: '运维类别', title: '运维类别', dataIndex: '运维类别' },
        { key: '运维标题', title: '运维标题', dataIndex: '运维标题' },
        { key: '责任人', title: '责任人', dataIndex: '责任人' },
        { key: '联系电话', title: '联系电话', dataIndex: '联系电话' },
        { key: '记录时间', title: '记录时间', dataIndex: '记录时间' },
        { key: '更新时间', title: '更新时间', dataIndex: '更新时间' },
        { key: '运维内容', title: '运维内容', dataIndex: '运维内容' },
        { key: '备注', title: '备注', dataIndex: '备注' },
        { key: '运维图片', title: '运维图片', dataIndex: '运维图片' },
      ],
      '污水厂_运维信息',
      '运维信息',
      {
        formatByKey: {
          运维图片: v => (Array.isArray(v) ? v.join('；') : ''),
        },
      },
    );
    message.success('已导出 Excel（全量字段）');
  };

  return (
    <div className="facility-view">
      <Card
      title="运维信息"
      extra={
        <Space wrap size={[8, 8]} align="center">
          <Button icon={<DownloadOutlined />} className="export-btn" onClick={handleExport}>
            导出Excel
          </Button>
          <Button icon={<UploadOutlined />} onClick={() => message.success('已导入运维信息列表（原型示意）')}>
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
                运维类别: '巡检记录',
                记录时间: dayjs(),
                更新时间: dayjs(),
              });
              setEditOpen(true);
            }}
          >
            新增
          </Button>
        </Space>
      }
    >
      <Form form={filterForm} layout="inline" style={{ marginBottom: 16, rowGap: 12 }}>
        <Form.Item name="plantCode" style={{ marginBottom: 0 }}>
          <Select allowClear showSearch optionFilterProp="label" style={{ width: 260 }} placeholder="污水厂" options={plantOptions} />
        </Form.Item>
        <Form.Item name="category" style={{ marginBottom: 0 }}>
          <Select allowClear style={{ width: 220 }} placeholder="运维类别" options={OM_CATEGORY_OPTIONS} />
        </Form.Item>
        <Form.Item name="ownerKeyword" style={{ marginBottom: 0 }}>
          <Input allowClear placeholder="责任人查询" style={{ width: 220 }} />
        </Form.Item>
        <Form.Item name="idKeyword" style={{ marginBottom: 0 }}>
          <Input allowClear placeholder="运维编号" style={{ width: 180 }} />
        </Form.Item>
        <Form.Item name="titleKeyword" style={{ marginBottom: 0 }}>
          <Input allowClear placeholder="运维标题" style={{ width: 220 }} />
        </Form.Item>
        <Form.Item name="dateRange" style={{ marginBottom: 0 }}>
          <DatePicker.RangePicker
            showTime
            style={{ width: 360 }}
            format="YYYY-MM-DD HH:mm:ss"
            placeholder={['开始时间', '结束时间']}
          />
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

      <Table<PlantOmRecord>
        rowKey="id"
        size="middle"
        columns={columns}
        dataSource={filteredData}
        pagination={{ defaultPageSize: 10 }}
        scroll={{ x: 1760 }}
      />

      <Modal
        title={editingId ? '编辑运维信息' : '新增运维信息'}
        open={editOpen}
        onCancel={() => {
          setEditOpen(false);
          setEditingId(null);
        }}
        onOk={handleSave}
        okText={editingId ? '保存' : '新增'}
        cancelText="取消"
        width={840}
        styles={{ body: { maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' } }}
      >
        <Form<OmFormValues> layout="vertical" form={editForm}>
          <Form.Item name="污水厂编码" label="污水厂" rules={[{ required: true, message: '请选择污水厂' }]}>
            <Select allowClear showSearch optionFilterProp="label" options={plantOptions} placeholder="请先选择污水厂" />
          </Form.Item>
          <Form.Item name="运维类别" label="运维类别" rules={[{ required: true, message: '请选择运维类别' }]}>
            <Select allowClear options={OM_CATEGORY_OPTIONS} placeholder="请选择运维类别" />
          </Form.Item>
          <Form.Item name="运维标题" label="运维标题" rules={[{ required: true, message: '请输入运维标题' }]}>
            <Input maxLength={100} placeholder="例如：4月机组巡检记录" />
          </Form.Item>
          <Form.Item name="责任人" label="责任人" rules={[{ required: true, message: '请输入责任人' }]}>
            <Input maxLength={30} placeholder="请输入责任人" />
          </Form.Item>
          <Form.Item
            name="联系电话"
            label="联系电话"
            rules={[
              { required: true, message: '请输入联系电话' },
              { pattern: /^1\d{10}$/, message: '请输入11位手机号' },
            ]}
          >
            <Input maxLength={11} placeholder="请输入联系电话" />
          </Form.Item>
          <Form.Item name="记录时间" label="记录时间" rules={[{ required: true, message: '请选择记录时间' }]}>
            <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm:ss" />
          </Form.Item>
          <Form.Item name="运维内容" label="运维内容" rules={[{ required: true, message: '请输入运维内容' }]}>
            <Input.TextArea rows={5} maxLength={1000} placeholder="请填写巡检记录、维修台账、保养计划、药剂消耗、污泥处置、人员培训等运维信息" />
          </Form.Item>
          <Form.Item label="运维图片">
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              <Upload
                beforeUpload={() => false}
                multiple
                accept="image/*"
                fileList={splitTextToList(editForm.getFieldValue('运维图片')).map((name, idx) => ({
                  uid: `${name}-${idx}`,
                  name,
                  status: 'done',
                })) as UploadFile[]}
                onChange={info => {
                  const names = info.fileList.map(file => file.name).filter(Boolean);
                  editForm.setFieldValue('运维图片', names.join(';'));
                }}
              >
                <Button icon={<UploadOutlined />}>上传运维图片</Button>
              </Upload>
              <Form.Item name="运维图片" noStyle>
                <Input placeholder="支持手动填写多个图片文件名或链接，使用分号分隔" maxLength={4000} />
              </Form.Item>
            </Space>
          </Form.Item>
          <Form.Item name="备注" label="备注">
            <Input.TextArea rows={3} maxLength={500} placeholder="选填" />
          </Form.Item>
          <Form.Item name="更新时间" label="更新时间" rules={[{ required: true, message: '请选择更新时间' }]}>
            <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm:ss" />
          </Form.Item>
        </Form>
      </Modal>
      </Card>
    </div>
  );
};
