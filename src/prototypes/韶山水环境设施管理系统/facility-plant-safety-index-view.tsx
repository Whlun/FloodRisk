import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts';
import dayjs from 'dayjs';
import { Button, Card, Col, Descriptions, Divider, Form, Input, InputNumber, List, Modal, Radio, Row, Select, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DownloadOutlined, EditOutlined, EyeOutlined, PlusOutlined, SearchOutlined, SettingOutlined } from '@ant-design/icons';
import { plantData } from './facility-points-data';
import { downloadTableFullExcel } from '../shared/facilityTableXlsxExport';

type SafetyMetricKey =
  | '运行年限评分'
  | '设备老化程度评分'
  | '维护频率评分'
  | '安全检查结果评分'
  | '水质达标率评分';

type SafetyWeightConfig = Record<SafetyMetricKey, number>;

type SafetyScoreRecord = {
  id: string;
  评价周期类型: '月度' | '季度' | '年度';
  评价周期: string;
  污水厂编码: string;
  污水厂名称: string;
  运行年限评分: number;
  设备老化程度评分: number;
  维护频率评分: number;
  安全检查结果评分: number;
  水质达标率评分: number;
  运行年限评分备注: string;
  设备老化程度评分备注: string;
  维护频率评分备注: string;
  安全检查结果评分备注: string;
  水质达标率评分备注: string;
  安全指数: number;
  更新时间: string;
};

type FilterFormValues = {
  periodType?: '月度' | '季度' | '年度';
  period?: string;
  plantCode?: string;
};

type EditFormValues = {
  评价周期类型?: '月度' | '季度' | '年度';
  评价时间?: string;
  污水厂编码?: string;
  运行年限评分?: number;
  设备老化程度评分?: number;
  维护频率评分?: number;
  安全检查结果评分?: number;
  水质达标率评分?: number;
  运行年限评分备注?: string;
  设备老化程度评分备注?: string;
  维护频率评分备注?: string;
  安全检查结果评分备注?: string;
  水质达标率评分备注?: string;
};

const METRICS: { key: SafetyMetricKey; label: string }[] = [
  { key: '运行年限评分', label: '运行年限评分' },
  { key: '设备老化程度评分', label: '设备老化程度评分' },
  { key: '维护频率评分', label: '维护频率评分' },
  { key: '安全检查结果评分', label: '安全检查结果评分' },
  { key: '水质达标率评分', label: '水质达标率评分' },
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
  安全检查结果评分: 20,
  水质达标率评分: 20,
};

const INITIAL_DATA: SafetyScoreRecord[] = [
  {
    id: 'SAFE-2026Q1-001',
    评价周期类型: '季度',
    评价周期: '2026年Q1',
    污水厂编码: 'WWTP202504070001',
    污水厂名称: '高新区污水处理厂',
    运行年限评分: 82,
    设备老化程度评分: 78,
    维护频率评分: 86,
    安全检查结果评分: 88,
    水质达标率评分: 92,
    运行年限评分备注: '厂站运行年限适中，结构状态稳定。',
    设备老化程度评分备注: '关键设备有轻度老化，处于可控范围。',
    维护频率评分备注: '季度维保计划执行到位，巡检记录完整。',
    安全检查结果评分备注: '季度安全检查无重大隐患，闭环及时。',
    水质达标率评分备注: '出水稳定达标，单月波动小。',
    安全指数: 85.2,
    更新时间: '2026-04-21 10:32:00',
  },
  {
    id: 'SAFE-2026Q1-002',
    评价周期类型: '季度',
    评价周期: '2026年Q1',
    污水厂编码: 'WWTP202504070002',
    污水厂名称: '清溪片区污水处理厂',
    运行年限评分: 74,
    设备老化程度评分: 69,
    维护频率评分: 72,
    安全检查结果评分: 76,
    水质达标率评分: 84,
    运行年限评分备注: '设施运行年限偏长，存在阶段性风险。',
    设备老化程度评分备注: '部分设备老化较明显，已列入改造计划。',
    维护频率评分备注: '维护频率略低于建议标准，需加密巡检。',
    安全检查结果评分备注: '存在一般隐患，整改跟踪中。',
    水质达标率评分备注: '整体达标率较好，极端天气下有波动。',
    安全指数: 75,
    更新时间: '2026-04-20 16:08:00',
  },
  {
    id: 'SAFE-2026Q2-003',
    评价周期类型: '季度',
    评价周期: '2026年Q2',
    污水厂编码: 'WWTP202504070003',
    污水厂名称: '银田片区污水处理厂',
    运行年限评分: 79,
    设备老化程度评分: 76,
    维护频率评分: 82,
    安全检查结果评分: 84,
    水质达标率评分: 88,
    运行年限评分备注: '投运年限适中，构筑物状态稳定。',
    设备老化程度评分备注: '机电设备轻微老化，保养计划可控。',
    维护频率评分备注: '周巡检执行率较高，记录完整。',
    安全检查结果评分备注: '一般隐患均已闭环。',
    水质达标率评分备注: '出水连续达标，波动较小。',
    安全指数: 81.8,
    更新时间: '2026-04-22 09:40:00',
  },
  {
    id: 'SAFE-2026Q2-004',
    评价周期类型: '季度',
    评价周期: '2026年Q2',
    污水厂编码: 'WWTP202504070004',
    污水厂名称: '韶山乡污水处理厂',
    运行年限评分: 71,
    设备老化程度评分: 68,
    维护频率评分: 74,
    安全检查结果评分: 78,
    水质达标率评分: 83,
    运行年限评分备注: '部分单元运行时间较长，需持续跟踪。',
    设备老化程度评分备注: '关键设备老化偏高，已纳入年度改造。',
    维护频率评分备注: '维护频率基本满足要求。',
    安全检查结果评分备注: '检查发现一般问题，整改推进中。',
    水质达标率评分备注: '多数时段达标，雨季有轻微波动。',
    安全指数: 74.8,
    更新时间: '2026-04-22 10:10:00',
  },
  {
    id: 'SAFE-2026Q2-005',
    评价周期类型: '季度',
    评价周期: '2026年Q2',
    污水厂编码: 'WWTP202504070005',
    污水厂名称: '杨林片区污水处理厂',
    运行年限评分: 88,
    设备老化程度评分: 85,
    维护频率评分: 90,
    安全检查结果评分: 91,
    水质达标率评分: 93,
    运行年限评分备注: '投运时间较短，资产状态良好。',
    设备老化程度评分备注: '设备健康度高，故障率低。',
    维护频率评分备注: '维护计划执行充分，闭环及时。',
    安全检查结果评分备注: '多轮检查未发现重大隐患。',
    水质达标率评分备注: '出水达标率稳定在高位。',
    安全指数: 89.4,
    更新时间: '2026-04-22 11:00:00',
  },
  {
    id: 'SAFE-2026M04-006',
    评价周期类型: '月度',
    评价周期: '2026年4月',
    污水厂编码: 'WWTP202504070006',
    污水厂名称: '如意镇污水处理厂',
    运行年限评分: 76,
    设备老化程度评分: 73,
    维护频率评分: 79,
    安全检查结果评分: 81,
    水质达标率评分: 85,
    运行年限评分备注: '整体运行稳定，个别单元需复核。',
    设备老化程度评分备注: '设备状态可控，部分耗材进入更换周期。',
    维护频率评分备注: '按计划维护，执行率较好。',
    安全检查结果评分备注: '隐患项均完成整改。',
    水质达标率评分备注: '达标率良好，偶发波动可解释。',
    安全指数: 78.8,
    更新时间: '2026-04-22 13:20:00',
  },
  {
    id: 'SAFE-2026M04-007',
    评价周期类型: '月度',
    评价周期: '2026年4月',
    污水厂编码: 'WWTP202504070007',
    污水厂名称: '清溪北片污水处理厂',
    运行年限评分: 83,
    设备老化程度评分: 80,
    维护频率评分: 84,
    安全检查结果评分: 86,
    水质达标率评分: 89,
    运行年限评分备注: '运行工况平稳，年限风险低。',
    设备老化程度评分备注: '设备状态良好，关键部件在寿命期内。',
    维护频率评分备注: '维护过程标准化程度高。',
    安全检查结果评分备注: '检查结果优秀，整改闭环及时。',
    水质达标率评分备注: '连续达标，波动幅度小。',
    安全指数: 84.4,
    更新时间: '2026-04-22 14:00:00',
  },
  {
    id: 'SAFE-2026M04-008',
    评价周期类型: '月度',
    评价周期: '2026年4月',
    污水厂编码: 'WWTP202504070008',
    污水厂名称: '银田东片污水处理厂',
    运行年限评分: 81,
    设备老化程度评分: 77,
    维护频率评分: 82,
    安全检查结果评分: 84,
    水质达标率评分: 87,
    运行年限评分备注: '站点运行年限较短，风险较低。',
    设备老化程度评分备注: '个别传感器有老化趋势。',
    维护频率评分备注: '运维班组执行较稳定。',
    安全检查结果评分备注: '检查问题较少，整改及时。',
    水质达标率评分备注: '整体达标，局部时段波动可控。',
    安全指数: 82.2,
    更新时间: '2026-04-22 14:35:00',
  },
  {
    id: 'SAFE-2026M04-009',
    评价周期类型: '月度',
    评价周期: '2026年4月',
    污水厂编码: 'WWTP202504070009',
    污水厂名称: '红旗片区污水处理厂',
    运行年限评分: 72,
    设备老化程度评分: 70,
    维护频率评分: 75,
    安全检查结果评分: 77,
    水质达标率评分: 82,
    运行年限评分备注: '运行年限偏长，需关注土建设施状态。',
    设备老化程度评分备注: '机泵类设备老化较明显。',
    维护频率评分备注: '维护执行率中等，仍有提升空间。',
    安全检查结果评分备注: '存在少量重复性问题。',
    水质达标率评分备注: '达标率总体可接受。',
    安全指数: 75.2,
    更新时间: '2026-04-22 15:05:00',
  },
  {
    id: 'SAFE-2026M05-010',
    评价周期类型: '月度',
    评价周期: '2026年5月',
    污水厂编码: 'WWTP202504070010',
    污水厂名称: '韶北工业污水处理厂',
    运行年限评分: 86,
    设备老化程度评分: 83,
    维护频率评分: 88,
    安全检查结果评分: 87,
    水质达标率评分: 90,
    运行年限评分备注: '设施新、负荷适中。',
    设备老化程度评分备注: '工业段关键设备状态良好。',
    维护频率评分备注: '维护计划与执行高度匹配。',
    安全检查结果评分备注: '安全检查表现良好。',
    水质达标率评分备注: '达标率持续高位运行。',
    安全指数: 86.8,
    更新时间: '2026-05-06 09:15:00',
  },
  {
    id: 'SAFE-2026M05-011',
    评价周期类型: '月度',
    评价周期: '2026年5月',
    污水厂编码: 'WWTP202504070011',
    污水厂名称: '韶南片区污水处理厂',
    运行年限评分: 77,
    设备老化程度评分: 74,
    维护频率评分: 79,
    安全检查结果评分: 80,
    水质达标率评分: 84,
    运行年限评分备注: '主体结构与工艺段运行稳定。',
    设备老化程度评分备注: '设备状态总体可控。',
    维护频率评分备注: '维护频率达标，建议增加专项巡检。',
    安全检查结果评分备注: '检查闭环效率良好。',
    水质达标率评分备注: '达标表现稳定。',
    安全指数: 78.8,
    更新时间: '2026-05-06 10:20:00',
  },
  {
    id: 'SAFE-2026Y-012',
    评价周期类型: '年度',
    评价周期: '2026年度',
    污水厂编码: 'WWTP202504070012',
    污水厂名称: '旅游服务区污水处理厂',
    运行年限评分: 84,
    设备老化程度评分: 82,
    维护频率评分: 86,
    安全检查结果评分: 88,
    水质达标率评分: 91,
    运行年限评分备注: '年度运行状态良好，设施稳定。',
    设备老化程度评分备注: '设备老化风险低。',
    维护频率评分备注: '维护执行与记录完整性较高。',
    安全检查结果评分备注: '年度检查无重大风险项。',
    水质达标率评分备注: '全年出水达标情况优异。',
    安全指数: 86.2,
    更新时间: '2026-12-20 16:30:00',
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

const genRecordId = () => `SAFE-${Date.now()}`;

const calcSafetyIndex = (values: EditFormValues, weights: SafetyWeightConfig) => {
  let total = 0;
  for (const metric of METRICS) {
    const score = Number(values[metric.key] ?? 0);
    total += (score / 100) * weights[metric.key];
  }
  return Number(total.toFixed(1));
};

/** 安全指数详情雷达图（五维百分制 0-100） */
const PlantSafetyRadarChart: React.FC<{ row: SafetyScoreRecord }> = ({ row }) => {
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
          { name: '安全检查', max: 100 },
          { name: '水质达标率', max: 100 },
        ],
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: [row.运行年限评分, row.设备老化程度评分, row.维护频率评分, row.安全检查结果评分, row.水质达标率评分],
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

export const PlantSafetyIndexView: React.FC<{
  onDetail: (title: string, content: React.ReactNode, modalWidth?: number | string) => void;
}> = ({ onDetail }) => {
  const { Text, Title } = Typography;
  const [filterForm] = Form.useForm<FilterFormValues>();
  const [editForm] = Form.useForm<EditFormValues>();
  const [weightForm] = Form.useForm<SafetyWeightConfig>();
  const [data, setData] = useState<SafetyScoreRecord[]>([...INITIAL_DATA]);
  const [weights, setWeights] = useState<SafetyWeightConfig>({ ...DEFAULT_WEIGHTS });
  const [periodTypeFilter, setPeriodTypeFilter] = useState<'月度' | '季度' | '年度' | undefined>();
  const [periodFilter, setPeriodFilter] = useState<string | undefined>();
  const [plantCodeFilter, setPlantCodeFilter] = useState<string | undefined>();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);
  const currentEditPeriodType = Form.useWatch('评价周期类型', editForm) || '季度';
  const selectedFilterPeriodType = (Form.useWatch('periodType', filterForm) || '月度') as '月度' | '季度' | '年度';
  const selectedFilterPeriod = Form.useWatch('period', filterForm);

  const plantOptions = useMemo(
    () =>
      plantData.map(item => ({
        // 污水厂信息台账字段为 id/name，这里统一映射成“编码 + 名称”
        value: item.id,
        label: `${item.name}（${item.id}）`,
      })),
    [],
  );

  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (periodTypeFilter && item.评价周期类型 !== periodTypeFilter) return false;
      if (periodFilter && item.评价周期 !== periodFilter) return false;
      if (plantCodeFilter && item.污水厂编码 !== plantCodeFilter) return false;
      return true;
    });
  }, [data, periodFilter, periodTypeFilter, plantCodeFilter]);

  const columns: ColumnsType<SafetyScoreRecord> = [
    { title: '记录编号', dataIndex: 'id', key: 'id', width: 180 },
    { title: '评价周期', dataIndex: '评价周期', key: '评价周期', width: 140 },
    { title: '污水厂编码', dataIndex: '污水厂编码', key: '污水厂编码', width: 140 },
    { title: '污水厂名称', dataIndex: '污水厂名称', key: '污水厂名称', width: 240 },
    { title: '运行年限', dataIndex: '运行年限评分', key: '运行年限评分', width: 120 },
    { title: '设备老化', dataIndex: '设备老化程度评分', key: '设备老化程度评分', width: 120 },
    { title: '维护频率', dataIndex: '维护频率评分', key: '维护频率评分', width: 120 },
    { title: '安全检查', dataIndex: '安全检查结果评分', key: '安全检查结果评分', width: 120 },
    { title: '水质达标率', dataIndex: '水质达标率评分', key: '水质达标率评分', width: 120 },
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
                      {`安全指数评估 · ${record.评价周期} · ${record.污水厂名称}`}
                    </Title>
                    <Space size={16} wrap>
                      <Text>
                        综合安全指数 <Text strong>{record.安全指数.toFixed(1)}</Text>
                      </Text>
                      <Text type="secondary">
                        权重 {`${weights.运行年限评分}/${weights.设备老化程度评分}/${weights.维护频率评分}/${weights.安全检查结果评分}/${weights.水质达标率评分}`}
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
                          （权重 {weights.运行年限评分}/{weights.设备老化程度评分}/{weights.维护频率评分}/{weights.安全检查结果评分}/{weights.水质达标率评分}）
                        </Text>
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="评价周期">{`${record.评价周期类型} / ${record.评价周期}`}</Descriptions.Item>
                    <Descriptions.Item label="污水厂编码">{record.污水厂编码}</Descriptions.Item>
                    <Descriptions.Item label="污水厂名称">{record.污水厂名称}</Descriptions.Item>
                  </Descriptions>
                  <PlantSafetyRadarChart row={record} />
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
                污水厂编码: record.污水厂编码,
                运行年限评分: record.运行年限评分,
                设备老化程度评分: record.设备老化程度评分,
                维护频率评分: record.维护频率评分,
                安全检查结果评分: record.安全检查结果评分,
                水质达标率评分: record.水质达标率评分,
                运行年限评分备注: record.运行年限评分备注,
                设备老化程度评分备注: record.设备老化程度评分备注,
                维护频率评分备注: record.维护频率评分备注,
                安全检查结果评分备注: record.安全检查结果评分备注,
                水质达标率评分备注: record.水质达标率评分备注,
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
    setPlantCodeFilter(values.plantCode);
  };

  const handleReset = () => {
    filterForm.resetFields(['period', 'periodType', 'plantCode']);
    filterForm.setFieldsValue({ periodType: '月度', period: DEFAULT_MONTH_PERIOD });
    setPeriodTypeFilter(undefined);
    setPeriodFilter(undefined);
    setPlantCodeFilter(undefined);
  };

  const handleSave = () => {
    editForm.validateFields().then(values => {
      const plantCode = String(values.污水厂编码 || '');
      const plantOption = plantOptions.find(opt => opt.value === plantCode);
      if (!plantOption) {
        message.warning('请选择有效的污水厂');
        return;
      }
      const next: SafetyScoreRecord = {
        id: editingId || genRecordId(),
        评价周期类型: values.评价周期类型 || '季度',
        评价周期: String(values.评价时间 || ''),
        污水厂编码: plantCode,
        污水厂名称: plantOption.label.split('（')[0] || '',
        运行年限评分: Number(values.运行年限评分),
        设备老化程度评分: Number(values.设备老化程度评分),
        维护频率评分: Number(values.维护频率评分),
        安全检查结果评分: Number(values.安全检查结果评分),
        水质达标率评分: Number(values.水质达标率评分),
        运行年限评分备注: String(values.运行年限评分备注 || ''),
        设备老化程度评分备注: String(values.设备老化程度评分备注 || ''),
        维护频率评分备注: String(values.维护频率评分备注 || ''),
        安全检查结果评分备注: String(values.安全检查结果评分备注 || ''),
        水质达标率评分备注: String(values.水质达标率评分备注 || ''),
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
        { key: '污水厂编码', title: '污水厂编码', dataIndex: '污水厂编码' },
        { key: '污水厂名称', title: '污水厂名称', dataIndex: '污水厂名称' },
        { key: '运行年限评分', title: '运行年限评分', dataIndex: '运行年限评分' },
        { key: '设备老化程度评分', title: '设备老化程度评分', dataIndex: '设备老化程度评分' },
        { key: '维护频率评分', title: '维护频率评分', dataIndex: '维护频率评分' },
        { key: '安全检查结果评分', title: '安全检查结果评分', dataIndex: '安全检查结果评分' },
        { key: '水质达标率评分', title: '水质达标率评分', dataIndex: '水质达标率评分' },
        { key: '运行年限评分备注', title: '运行年限评分备注', dataIndex: '运行年限评分备注' },
        { key: '设备老化程度评分备注', title: '设备老化程度评分备注', dataIndex: '设备老化程度评分备注' },
        { key: '维护频率评分备注', title: '维护频率评分备注', dataIndex: '维护频率评分备注' },
        { key: '安全检查结果评分备注', title: '安全检查结果评分备注', dataIndex: '安全检查结果评分备注' },
        { key: '水质达标率评分备注', title: '水质达标率评分备注', dataIndex: '水质达标率评分备注' },
        { key: '安全指数', title: '安全指数', dataIndex: '安全指数' },
        { key: '更新时间', title: '更新时间', dataIndex: '更新时间' },
      ],
      '污水厂_安全指数评估',
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
        <Form.Item name="plantCode" style={{ marginBottom: 0 }}>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="污水厂"
            style={{ width: 260 }}
            options={plantOptions}
          />
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
        pagination={{ defaultPageSize: 10 }}
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
              <Form.Item name="污水厂编码" label="污水厂" rules={[{ required: true, message: '请选择污水厂' }]}>
                <Select allowClear showSearch optionFilterProp="label" options={plantOptions} placeholder="请选择污水厂" />
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
