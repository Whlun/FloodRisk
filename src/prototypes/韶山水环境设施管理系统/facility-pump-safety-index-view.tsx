import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts';
import dayjs from 'dayjs';
import { DownloadOutlined, EditOutlined, EyeOutlined, PlusOutlined, SearchOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Card, Col, Descriptions, Divider, Form, Input, InputNumber, List, Modal, Radio, Row, Select, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { PumpStationRecord } from './facility-points-data';
import { downloadTableFullExcel } from '../shared/facilityTableXlsxExport';

type SafetyMetricKey = '运行年限评分' | '设备老化程度评分' | '维护频率评分' | '故障记录评分' | '安全检查结果评分';
type SafetyWeightConfig = Record<SafetyMetricKey, number>;

type SafetyScoreRecord = {
  id: string;
  评价周期类型: '月度' | '季度' | '年度';
  评价周期: string;
  泵站编码: string;
  泵站名称: string;
  运行年限评分: number;
  设备老化程度评分: number;
  维护频率评分: number;
  故障记录评分: number;
  安全检查结果评分: number;
  运行年限评分备注: string;
  设备老化程度评分备注: string;
  维护频率评分备注: string;
  故障记录评分备注: string;
  安全检查结果评分备注: string;
  安全指数: number;
  更新时间: string;
};

type FilterFormValues = {
  periodType?: '月度' | '季度' | '年度';
  period?: string;
  pumpCode?: string;
  recordIdKeyword?: string;
  pumpNameKeyword?: string;
};

type EditFormValues = {
  评价周期类型?: '月度' | '季度' | '年度';
  评价时间?: string;
  泵站编码?: string;
  运行年限评分?: number;
  设备老化程度评分?: number;
  维护频率评分?: number;
  故障记录评分?: number;
  安全检查结果评分?: number;
  运行年限评分备注?: string;
  设备老化程度评分备注?: string;
  维护频率评分备注?: string;
  故障记录评分备注?: string;
  安全检查结果评分备注?: string;
};

const METRICS: { key: SafetyMetricKey; label: string }[] = [
  { key: '运行年限评分', label: '运行年限评分' },
  { key: '设备老化程度评分', label: '设备老化程度评分' },
  { key: '维护频率评分', label: '维护频率评分' },
  { key: '故障记录评分', label: '故障记录评分' },
  { key: '安全检查结果评分', label: '安全检查结果评分' },
];

const PERIOD_TYPE_OPTIONS: Array<{ label: '月度' | '季度' | '年度'; value: '月度' | '季度' | '年度' }> = [
  { label: '月度', value: '月度' },
  { label: '季度', value: '季度' },
  { label: '年度', value: '年度' },
];

const PERIOD_OPTIONS_BY_TYPE: Record<'月度' | '季度' | '年度', string[]> = {
  月度: ['2026年3月', '2026年4月', '2026年5月', '2026年6月'],
  季度: ['2026年Q1', '2026年Q2', '2026年Q3', '2026年Q4'],
  年度: ['2025年度', '2026年度'],
};

const CURRENT_MONTH_PERIOD = dayjs().format('YYYY年M月');
const DEFAULT_MONTH_PERIOD = PERIOD_OPTIONS_BY_TYPE.月度.includes(CURRENT_MONTH_PERIOD)
  ? CURRENT_MONTH_PERIOD
  : PERIOD_OPTIONS_BY_TYPE.月度[0];

const DEFAULT_WEIGHTS: SafetyWeightConfig = {
  运行年限评分: 20,
  设备老化程度评分: 20,
  维护频率评分: 20,
  故障记录评分: 20,
  安全检查结果评分: 20,
};

const INITIAL_DATA: SafetyScoreRecord[] = [
  {
    id: 'PUMP-SAFE-2026Q1-001',
    评价周期类型: '季度',
    评价周期: '2026年Q1',
    泵站编码: 'PS202604010001',
    泵站名称: '湘韶大道一体化泵站',
    运行年限评分: 82,
    设备老化程度评分: 78,
    维护频率评分: 86,
    故障记录评分: 80,
    安全检查结果评分: 88,
    运行年限评分备注: '运行年限适中，结构与机电状态稳定。',
    设备老化程度评分备注: '关键设备轻度老化，已纳入计划性更新。',
    维护频率评分备注: '季度维保计划执行到位，巡检频率符合要求。',
    故障记录评分备注: '本周期故障次数较少，故障恢复及时。',
    安全检查结果评分备注: '安全检查无重大隐患，整改闭环及时。',
    安全指数: 82.8,
    更新时间: '2026-04-21 10:32:00',
  },
  {
    id: 'PUMP-SAFE-2026Q1-002',
    评价周期类型: '季度',
    评价周期: '2026年Q1',
    泵站编码: 'PS202604010002',
    泵站名称: '清溪片区提升泵站',
    运行年限评分: 74,
    设备老化程度评分: 69,
    维护频率评分: 72,
    故障记录评分: 66,
    安全检查结果评分: 76,
    运行年限评分备注: '运行年限偏长，需持续跟踪关键部件风险。',
    设备老化程度评分备注: '部分设备老化较明显，已提报改造需求。',
    维护频率评分备注: '维护频率略低于建议标准，需加密巡检。',
    故障记录评分备注: '周期内故障记录偏多，需重点排查薄弱点。',
    安全检查结果评分备注: '存在一般隐患，整改跟踪中。',
    安全指数: 71.4,
    更新时间: '2026-04-20 16:08:00',
  },
];

const scoreColor = (score: number) => {
  if (score >= 90) return 'success';
  if (score >= 75) return 'processing';
  if (score >= 60) return 'warning';
  return 'error';
};

const formatNow = () => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
};

const genRecordId = () => `PUMP-SAFE-${Date.now()}`;

const calcSafetyIndex = (values: EditFormValues, weights: SafetyWeightConfig) => {
  let total = 0;
  for (const metric of METRICS) {
    const score = Number(values[metric.key] ?? 0);
    total += (score / 100) * weights[metric.key];
  }
  return Number(total.toFixed(1));
};

const PumpSafetyRadarChart: React.FC<{ row: SafetyScoreRecord }> = ({ row }) => {
  const chartRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);
    chart.setOption({
      tooltip: { trigger: 'item' },
      radar: {
        radius: '65%',
        splitNumber: 5,
        min: 0,
        max: 100,
        indicator: [
          { name: '运行年限', max: 100 },
          { name: '设备老化', max: 100 },
          { name: '维护频率', max: 100 },
          { name: '故障记录', max: 100 },
          { name: '安全检查', max: 100 },
        ],
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: [row.运行年限评分, row.设备老化程度评分, row.维护频率评分, row.故障记录评分, row.安全检查结果评分],
              name: '维度评分',
              areaStyle: { color: 'rgba(30, 91, 181, 0.22)' },
              lineStyle: { color: '#1e5bb5', width: 2 },
              symbol: 'circle',
              symbolSize: 6,
              itemStyle: { color: '#1e5bb5' },
            },
          ],
        },
      ],
    });
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
    };
  }, [row]);
  return <div ref={chartRef} style={{ width: '100%', height: 280, marginBottom: 8 }} />;
};

export const PumpSafetyIndexView: React.FC<{
  onDetail: (title: string, content: React.ReactNode, modalWidth?: number | string) => void;
  /** 与「泵站信息」主入口台账同源，下拉选项随列表增删改同步 */
  pumpStationRows: PumpStationRecord[];
}> = ({ onDetail, pumpStationRows }) => {
  const { Text, Title } = Typography;
  const [filterForm] = Form.useForm<FilterFormValues>();
  const [editForm] = Form.useForm<EditFormValues>();
  const [weightForm] = Form.useForm<SafetyWeightConfig>();
  const [data, setData] = useState<SafetyScoreRecord[]>([...INITIAL_DATA]);
  const [weights, setWeights] = useState<SafetyWeightConfig>({ ...DEFAULT_WEIGHTS });
  const [periodTypeFilter, setPeriodTypeFilter] = useState<'月度' | '季度' | '年度' | undefined>();
  const [periodFilter, setPeriodFilter] = useState<string | undefined>();
  const [pumpCodeFilter, setPumpCodeFilter] = useState<string | undefined>();
  const [recordIdKeyword, setRecordIdKeyword] = useState('');
  const [pumpNameKeyword, setPumpNameKeyword] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);
  const currentEditPeriodType = Form.useWatch('评价周期类型', editForm) || '季度';
  const selectedFilterPeriodType = (Form.useWatch('periodType', filterForm) || '月度') as '月度' | '季度' | '年度';
  const selectedFilterPeriod = Form.useWatch('period', filterForm);

  const pumpOptions = useMemo(
    () =>
      pumpStationRows.map(item => ({
        value: item.id,
        label: `${item.pustName}（${item.id}）`,
      })),
    [pumpStationRows],
  );

  const filteredData = useMemo(() => {
    const recordIdQ = recordIdKeyword.trim();
    const pumpNameQ = pumpNameKeyword.trim();
    return data.filter(item => {
      if (periodTypeFilter && item.评价周期类型 !== periodTypeFilter) return false;
      if (periodFilter && item.评价周期 !== periodFilter) return false;
      if (pumpCodeFilter && item.泵站编码 !== pumpCodeFilter) return false;
      if (recordIdQ && !String(item.id || '').includes(recordIdQ)) return false;
      if (pumpNameQ && !String(item.泵站名称 || '').includes(pumpNameQ)) return false;
      return true;
    });
  }, [data, periodFilter, periodTypeFilter, pumpCodeFilter, pumpNameKeyword, recordIdKeyword]);

  const columns: ColumnsType<SafetyScoreRecord> = [
    { title: '记录编号', dataIndex: 'id', key: 'id', width: 180 },
    { title: '评价周期', dataIndex: '评价周期', key: '评价周期', width: 140 },
    { title: '泵站编码', dataIndex: '泵站编码', key: '泵站编码', width: 160 },
    { title: '泵站名称', dataIndex: '泵站名称', key: '泵站名称', width: 220 },
    { title: '运行年限', dataIndex: '运行年限评分', key: '运行年限评分', width: 120 },
    { title: '设备老化', dataIndex: '设备老化程度评分', key: '设备老化程度评分', width: 120 },
    { title: '维护频率', dataIndex: '维护频率评分', key: '维护频率评分', width: 120 },
    { title: '故障记录', dataIndex: '故障记录评分', key: '故障记录评分', width: 120 },
    { title: '安全检查', dataIndex: '安全检查结果评分', key: '安全检查结果评分', width: 120 },
    {
      title: '安全指数',
      dataIndex: '安全指数',
      key: '安全指数',
      width: 120,
      render: (value: number) => <Tag color={scoreColor(value)}>{value.toFixed(1)}</Tag>,
    },
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
                `安全指数详情 - ${record.id}`,
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <Title level={5} style={{ marginBottom: 6 }}>
                      {`安全指数评估 · ${record.评价周期} · ${record.泵站名称}`}
                    </Title>
                    <Space size={16} wrap>
                      <Text>
                        综合安全指数 <Text strong>{record.安全指数.toFixed(1)}</Text>
                      </Text>
                      <Text type="secondary">
                        权重 {`${weights.运行年限评分}/${weights.设备老化程度评分}/${weights.维护频率评分}/${weights.故障记录评分}/${weights.安全检查结果评分}`}
                      </Text>
                    </Space>
                  </div>
                  <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
                    <Descriptions.Item label="综合安全指数">
                      <Space>
                        <Text strong style={{ fontSize: 18, color: '#1e5bb5' }}>
                          {record.安全指数.toFixed(1)}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          （权重 {weights.运行年限评分}/{weights.设备老化程度评分}/{weights.维护频率评分}/{weights.故障记录评分}/{weights.安全检查结果评分}）
                        </Text>
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="评价周期">{`${record.评价周期类型} / ${record.评价周期}`}</Descriptions.Item>
                    <Descriptions.Item label="泵站编码">{record.泵站编码}</Descriptions.Item>
                    <Descriptions.Item label="泵站名称">{record.泵站名称}</Descriptions.Item>
                  </Descriptions>
                  <PumpSafetyRadarChart row={record} />
                  <Divider plain>维度成绩、加权贡献与说明</Divider>
                  <List
                    size="small"
                    dataSource={METRICS.map(metric => ({
                      title: metric.label,
                      raw: record[metric.key],
                      contrib: Number(((record[metric.key] / 100) * weights[metric.key]).toFixed(1)),
                      weight: weights[metric.key],
                      note: String(record[`${metric.key}备注` as keyof SafetyScoreRecord] || '—'),
                    }))}
                    renderItem={item => (
                      <List.Item>
                        <List.Item.Meta
                          title={
                            <Space wrap>
                              <Text strong>{item.title}</Text>
                              <Tag>百分制 {item.raw}/100</Tag>
                              <Tag color="blue">
                                加权 {item.contrib}（权重 {item.weight}）
                              </Tag>
                            </Space>
                          }
                          description={item.note}
                        />
                      </List.Item>
                    )}
                  />
                  <Divider style={{ marginTop: 12, marginBottom: 10 }} />
                  <Text type="secondary">{`记录编号：${record.id} ｜ 更新时间：${record.更新时间}`}</Text>
                </div>,
                760,
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
                评价周期类型: record.评价周期类型,
                评价时间: record.评价周期,
                泵站编码: record.泵站编码,
                运行年限评分: record.运行年限评分,
                设备老化程度评分: record.设备老化程度评分,
                维护频率评分: record.维护频率评分,
                故障记录评分: record.故障记录评分,
                安全检查结果评分: record.安全检查结果评分,
                运行年限评分备注: record.运行年限评分备注,
                设备老化程度评分备注: record.设备老化程度评分备注,
                维护频率评分备注: record.维护频率评分备注,
                故障记录评分备注: record.故障记录评分备注,
                安全检查结果评分备注: record.安全检查结果评分备注,
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

  const handleSearch = () => {
    const values = filterForm.getFieldsValue();
    setPeriodTypeFilter(values.periodType);
    setPeriodFilter(values.period);
    setPumpCodeFilter(values.pumpCode);
    setRecordIdKeyword(String(values.recordIdKeyword || '').trim());
    setPumpNameKeyword(String(values.pumpNameKeyword || '').trim());
  };

  const handleReset = () => {
    filterForm.resetFields(['period', 'periodType', 'pumpCode', 'recordIdKeyword', 'pumpNameKeyword']);
    filterForm.setFieldsValue({ periodType: '月度', period: DEFAULT_MONTH_PERIOD });
    setPeriodTypeFilter(undefined);
    setPeriodFilter(undefined);
    setPumpCodeFilter(undefined);
    setRecordIdKeyword('');
    setPumpNameKeyword('');
  };

  const handleSave = () => {
    editForm.validateFields().then(values => {
      const pumpCode = String(values.泵站编码 || '');
      const pumpOption = pumpOptions.find(opt => opt.value === pumpCode);
      if (!pumpOption) {
        message.warning('请选择有效的泵站');
        return;
      }
      const next: SafetyScoreRecord = {
        id: editingId || genRecordId(),
        评价周期类型: values.评价周期类型 || '季度',
        评价周期: String(values.评价时间 || ''),
        泵站编码: pumpCode,
        泵站名称: pumpOption.label.split('（')[0] || '',
        运行年限评分: Number(values.运行年限评分),
        设备老化程度评分: Number(values.设备老化程度评分),
        维护频率评分: Number(values.维护频率评分),
        故障记录评分: Number(values.故障记录评分),
        安全检查结果评分: Number(values.安全检查结果评分),
        运行年限评分备注: String(values.运行年限评分备注 || ''),
        设备老化程度评分备注: String(values.设备老化程度评分备注 || ''),
        维护频率评分备注: String(values.维护频率评分备注 || ''),
        故障记录评分备注: String(values.故障记录评分备注 || ''),
        安全检查结果评分备注: String(values.安全检查结果评分备注 || ''),
        安全指数: calcSafetyIndex(values, weights),
        更新时间: formatNow(),
      };
      setData(prev => (editingId ? prev.map(item => (item.id === editingId ? next : item)) : [next, ...prev]));
      setEditOpen(false);
      setEditingId(null);
      editForm.resetFields();
      message.success(editingId ? '安全指数记录编辑成功' : '安全指数记录新增成功');
    });
  };

  const handleSaveWeights = () => {
    weightForm.validateFields().then(values => {
      const total = METRICS.reduce((sum, metric) => sum + Number(values[metric.key] || 0), 0);
      if (total !== 100) {
        message.error('权重总和必须为 100');
        return;
      }
      const nextWeights = { ...values } as SafetyWeightConfig;
      setWeights(nextWeights);
      setData(prev =>
        prev.map(item => ({
          ...item,
          安全指数: calcSafetyIndex(item, nextWeights),
          更新时间: formatNow(),
        })),
      );
      setWeightOpen(false);
      message.success('评价体系配置保存成功');
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
        { key: 'id', title: '记录编号', dataIndex: 'id' },
        { key: '评价周期类型', title: '评价周期类型', dataIndex: '评价周期类型' },
        { key: '评价周期', title: '评价周期', dataIndex: '评价周期' },
        { key: '泵站编码', title: '泵站编码', dataIndex: '泵站编码' },
        { key: '泵站名称', title: '泵站名称', dataIndex: '泵站名称' },
        { key: '运行年限评分', title: '运行年限评分', dataIndex: '运行年限评分' },
        { key: '设备老化程度评分', title: '设备老化程度评分', dataIndex: '设备老化程度评分' },
        { key: '维护频率评分', title: '维护频率评分', dataIndex: '维护频率评分' },
        { key: '故障记录评分', title: '故障记录评分', dataIndex: '故障记录评分' },
        { key: '安全检查结果评分', title: '安全检查结果评分', dataIndex: '安全检查结果评分' },
        { key: '运行年限评分备注', title: '运行年限评分备注', dataIndex: '运行年限评分备注' },
        { key: '设备老化程度评分备注', title: '设备老化程度评分备注', dataIndex: '设备老化程度评分备注' },
        { key: '维护频率评分备注', title: '维护频率评分备注', dataIndex: '维护频率评分备注' },
        { key: '故障记录评分备注', title: '故障记录评分备注', dataIndex: '故障记录评分备注' },
        { key: '安全检查结果评分备注', title: '安全检查结果评分备注', dataIndex: '安全检查结果评分备注' },
        { key: '安全指数', title: '安全指数', dataIndex: '安全指数' },
        { key: '更新时间', title: '更新时间', dataIndex: '更新时间' },
      ],
      '泵站_安全指数评估',
      '安全指数',
    );
    message.success('已导出 Excel（全量字段）');
  };

  return (
    <Card
      title="安全指数评估"
      extra={
        <Space>
          <Button
            icon={<SettingOutlined />}
            onClick={() => {
              weightForm.setFieldsValue(weights);
              setWeightOpen(true);
            }}
          >
            评价体系配置
          </Button>
          <Button icon={<DownloadOutlined />} className="export-btn" onClick={handleExport}>
            导出Excel
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="add-btn"
            onClick={() => {
              setEditingId(null);
              editForm.setFieldsValue({ 评价周期类型: '季度', 评价时间: '2026年Q2' });
              setEditOpen(true);
            }}
          >
            新增
          </Button>
        </Space>
      }
    >
      <Form
        form={filterForm}
        layout="inline"
        style={{ marginBottom: 16, rowGap: 12 }}
        initialValues={{ periodType: '月度', period: DEFAULT_MONTH_PERIOD }}
      >
        <Form.Item name="pumpCode" style={{ marginBottom: 0 }}>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="泵站"
            style={{ width: 260 }}
            options={pumpOptions}
          />
        </Form.Item>
        <Form.Item name="recordIdKeyword" style={{ marginBottom: 0 }}>
          <Input allowClear placeholder="记录编号" style={{ width: 160 }} />
        </Form.Item>
        <Form.Item name="pumpNameKeyword" style={{ marginBottom: 0 }}>
          <Input allowClear placeholder="泵站名称" style={{ width: 180 }} />
        </Form.Item>
        <Space wrap align="center" size={[8, 8]} style={{ marginBottom: 0 }}>
          <Typography.Text type="secondary">评价周期：</Typography.Text>
          <Form.Item name="periodType" style={{ marginBottom: 0 }}>
            <Radio.Group
              optionType="button"
              onChange={e => {
                filterForm.setFieldValue('period', undefined);
                filterForm.setFieldValue('periodType', e.target.value);
              }}
            >
              <Radio.Button value="月度">月度</Radio.Button>
              <Radio.Button value="季度">季度</Radio.Button>
              <Radio.Button value="年度">年度</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="period" style={{ marginBottom: 0 }}>
            <Select
              allowClear
              placeholder="评价时间"
              style={{ width: 180 }}
              options={PERIOD_OPTIONS_BY_TYPE[selectedFilterPeriodType].map(v => ({ value: v, label: v }))}
            />
          </Form.Item>
          <Typography.Text strong>{selectedFilterPeriod || '未选择评价时间'}</Typography.Text>
        </Space>
        <Form.Item style={{ marginBottom: 0 }}>
          <Space>
            <Button type="primary" className="search-btn" icon={<SearchOutlined />} onClick={handleSearch}>
              查询
            </Button>
            <Button onClick={handleReset}>重置</Button>
          </Space>
        </Form.Item>
      </Form>

      <Table<SafetyScoreRecord>
        rowKey="id"
        size="middle"
        columns={columns}
        dataSource={filteredData}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1860 }}
      />

      <Modal
        title={editingId ? '编辑安全指数评估' : '新增安全指数评估'}
        open={editOpen}
        onCancel={() => {
          setEditOpen(false);
          setEditingId(null);
        }}
        onOk={handleSave}
        okText={editingId ? '保存' : '新增'}
        cancelText="取消"
        width={840}
      >
        <Form<EditFormValues> layout="vertical" form={editForm}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="评价周期类型" label="评价周期类型" initialValue="季度" rules={[{ required: true, message: '请选择评价周期类型' }]}>
                <Select
                  options={PERIOD_TYPE_OPTIONS}
                  onChange={() => {
                    editForm.setFieldValue('评价时间', undefined);
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="评价时间" label="评价时间" rules={[{ required: true, message: '请选择评价时间' }]}>
                <Select options={PERIOD_OPTIONS_BY_TYPE[currentEditPeriodType].map(v => ({ value: v, label: v }))} placeholder="请选择评价时间" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="泵站编码" label="泵站" rules={[{ required: true, message: '请选择泵站' }]}>
                <Select allowClear showSearch optionFilterProp="label" options={pumpOptions} placeholder="请选择泵站" />
              </Form.Item>
            </Col>
          </Row>
          <Divider style={{ marginTop: 4 }}>评分项（0-100）</Divider>
          {METRICS.map(metric => (
            <React.Fragment key={metric.key}>
              <Form.Item name={metric.key} label={`${metric.label}（百分制 0-100）`} rules={[{ required: true, message: `请输入${metric.label}` }]}>
                <InputNumber min={0} max={100} precision={0} style={{ width: '100%' }} placeholder="请输入 0-100 分" />
              </Form.Item>
              <Form.Item name={`${metric.key}备注`} label={`${metric.label.replace('评分', '')}备注`}>
                <Input.TextArea rows={2} maxLength={500} showCount placeholder={`请输入${metric.label.replace('评分', '')}备注（选填）`} />
              </Form.Item>
            </React.Fragment>
          ))}
        </Form>
      </Modal>

      <Modal
        title="评价体系配置"
        open={weightOpen}
        onCancel={() => setWeightOpen(false)}
        onOk={handleSaveWeights}
        okText="保存配置"
        cancelText="取消"
        width={680}
      >
        <Form<SafetyWeightConfig> form={weightForm} layout="vertical">
          {METRICS.map(metric => (
            <Form.Item
              key={metric.key}
              name={metric.key}
              label={`${metric.label}权重（%）`}
              rules={[{ required: true, message: `请输入${metric.label}权重` }]}
            >
              <InputNumber min={0} max={100} precision={0} style={{ width: '100%' }} placeholder="请输入权重百分比" />
            </Form.Item>
          ))}
          <Divider style={{ margin: '12px 0' }} />
          <div style={{ color: '#666' }}>当前权重总和必须为 100，安全指数按 Σ(评分/100 × 权重) 计算。</div>
        </Form>
      </Modal>
    </Card>
  );
};
