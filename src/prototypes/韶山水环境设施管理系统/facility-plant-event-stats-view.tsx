import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  message,
  Radio,
  Row,
  Select,
  Space,
  Statistic,
  Table,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  AlertOutlined,
  ClockCircleOutlined,
  DotChartOutlined,
  DownloadOutlined,
  FileTextOutlined,
  NodeExpandOutlined,
  SearchOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import type { PlantRecord } from './facility-points-data';
import { downloadElementAsPdf } from '../shared/facilityStatPdfExport';

type EventLevel = '一般' | '较大' | '重大';
type EventType = '设备故障' | '水质超标' | '停电' | '污泥处置异常' | '应急处置';
type ImpactScope = '单工艺段' | '全厂局部' | '全厂范围' | '周边水体';

type PlantEventStatRecord = {
  key: string;
  事件编号: string;
  污水厂编码: string;
  污水厂名称: string;
  事件类型: EventType;
  事件等级: EventLevel;
  发生时间: string;
  处理时长小时: number;
  影响范围: ImpactScope;
  是否超48小时: boolean;
};

type TimeRange = 'all' | 'month' | 'quarter' | 'year' | 'custom';

const { RangePicker } = DatePicker;

const EVENT_STATS_INITIAL: PlantEventStatRecord[] = [
  { key: '1', 事件编号: 'EV-202604-001', 污水厂编码: 'WWTP001', 污水厂名称: '韶山第一污水处理厂', 事件类型: '设备故障', 事件等级: '较大', 发生时间: '2026-04-02 08:30', 处理时长小时: 18, 影响范围: '全厂局部', 是否超48小时: false },
  { key: '2', 事件编号: 'EV-202604-002', 污水厂编码: 'WWTP001', 污水厂名称: '韶山第一污水处理厂', 事件类型: '水质超标', 事件等级: '重大', 发生时间: '2026-04-07 14:12', 处理时长小时: 52, 影响范围: '周边水体', 是否超48小时: true },
  { key: '3', 事件编号: 'EV-202604-003', 污水厂编码: 'WWTP002', 污水厂名称: '韶山第二污水处理厂', 事件类型: '停电', 事件等级: '一般', 发生时间: '2026-04-11 03:45', 处理时长小时: 6, 影响范围: '单工艺段', 是否超48小时: false },
  { key: '4', 事件编号: 'EV-202604-004', 污水厂编码: 'WWTP002', 污水厂名称: '韶山第二污水处理厂', 事件类型: '污泥处置异常', 事件等级: '较大', 发生时间: '2026-04-13 10:20', 处理时长小时: 32, 影响范围: '全厂局部', 是否超48小时: false },
  { key: '5', 事件编号: 'EV-202604-005', 污水厂编码: 'WWTP003', 污水厂名称: '韶山第三污水处理厂', 事件类型: '设备故障', 事件等级: '一般', 发生时间: '2026-04-15 09:05', 处理时长小时: 14, 影响范围: '单工艺段', 是否超48小时: false },
  { key: '6', 事件编号: 'EV-202603-006', 污水厂编码: 'WWTP003', 污水厂名称: '韶山第三污水处理厂', 事件类型: '应急处置', 事件等级: '重大', 发生时间: '2026-03-29 19:40', 处理时长小时: 73, 影响范围: '全厂范围', 是否超48小时: true },
  { key: '7', 事件编号: 'EV-202603-007', 污水厂编码: 'WWTP001', 污水厂名称: '韶山第一污水处理厂', 事件类型: '停电', 事件等级: '一般', 发生时间: '2026-03-18 05:30', 处理时长小时: 4, 影响范围: '单工艺段', 是否超48小时: false },
  { key: '8', 事件编号: 'EV-202602-008', 污水厂编码: 'WWTP002', 污水厂名称: '韶山第二污水处理厂', 事件类型: '水质超标', 事件等级: '较大', 发生时间: '2026-02-21 11:15', 处理时长小时: 27, 影响范围: '全厂局部', 是否超48小时: false },
  { key: '9', 事件编号: 'EV-202602-009', 污水厂编码: 'WWTP004', 污水厂名称: '韶山第四污水处理厂', 事件类型: '污泥处置异常', 事件等级: '一般', 发生时间: '2026-02-09 16:20', 处理时长小时: 22, 影响范围: '全厂局部', 是否超48小时: false },
  { key: '10', 事件编号: 'EV-202601-010', 污水厂编码: 'WWTP004', 污水厂名称: '韶山第四污水处理厂', 事件类型: '设备故障', 事件等级: '较大', 发生时间: '2026-01-27 13:10', 处理时长小时: 45, 影响范围: '全厂范围', 是否超48小时: false },
  { key: '11', 事件编号: 'EV-202601-011', 污水厂编码: 'WWTP003', 污水厂名称: '韶山第三污水处理厂', 事件类型: '应急处置', 事件等级: '重大', 发生时间: '2026-01-11 22:08', 处理时长小时: 60, 影响范围: '周边水体', 是否超48小时: true },
  { key: '12', 事件编号: 'EV-202512-012', 污水厂编码: 'WWTP002', 污水厂名称: '韶山第二污水处理厂', 事件类型: '设备故障', 事件等级: '一般', 发生时间: '2025-12-16 07:55', 处理时长小时: 10, 影响范围: '单工艺段', 是否超48小时: false },
];

const EVENT_TYPE_OPTIONS: { label: string; value: EventType }[] = [
  { label: '设备故障', value: '设备故障' },
  { label: '水质超标', value: '水质超标' },
  { label: '停电', value: '停电' },
  { label: '污泥处置异常', value: '污泥处置异常' },
  { label: '应急处置', value: '应急处置' },
];

const TIME_RANGE_OPTIONS: { label: string; value: TimeRange }[] = [
  { label: '全部', value: 'all' },
  { label: '本月', value: 'month' },
  { label: '本季度', value: 'quarter' },
  { label: '本年', value: 'year' },
  { label: '自定义', value: 'custom' },
];

const EventTypeCountChart: React.FC<{ rows: { type: string; count: number }[] }> = ({ rows }) => {
  const elRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!elRef.current) return;
    const chart = echarts.init(elRef.current);
    chart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 16, top: 20, bottom: 36 },
      xAxis: {
        type: 'category',
        axisTick: { alignWithLabel: true },
        data: rows.map((r) => r.type),
      },
      yAxis: { type: 'value', minInterval: 1 },
      series: [
        {
          type: 'bar',
          data: rows.map((r) => r.count),
          barMaxWidth: 26,
          itemStyle: { color: '#1e5bb5' },
        },
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

const EventDurationChart: React.FC<{ rows: { type: string; avgDuration: number }[] }> = ({ rows }) => {
  const elRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!elRef.current) return;
    const chart = echarts.init(elRef.current);
    chart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 48, right: 16, top: 20, bottom: 36 },
      xAxis: { type: 'value' },
      yAxis: {
        type: 'category',
        data: rows.map((r) => r.type),
      },
      series: [
        {
          type: 'bar',
          data: rows.map((r) => Number(r.avgDuration.toFixed(1))),
          barMaxWidth: 22,
          itemStyle: { color: '#7c3aed' },
        },
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

export const PlantEventStatsView: React.FC<{ plantSource?: PlantRecord[] }> = ({ plantSource = [] }) => {
  const pdfCaptureRef = useRef<HTMLDivElement | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [plantCode, setPlantCode] = useState<string | undefined>();

  const validPlants = useMemo(
    () =>
      plantSource
        .map((p) => ({
          value: typeof p.id === 'string' ? p.id.trim() : '',
          label: typeof p.name === 'string' ? p.name.trim() : '',
        }))
        .filter((p) => p.value && p.label),
    [plantSource],
  );

  const eventRows = useMemo(() => {
    if (!validPlants.length) return EVENT_STATS_INITIAL;
    return EVENT_STATS_INITIAL.map((item, idx) => {
      const bindPlant = validPlants[idx % validPlants.length];
      return {
        ...item,
        污水厂编码: bindPlant.value,
        污水厂名称: bindPlant.label,
      };
    });
  }, [validPlants]);

  const plantOptions = useMemo(
    () => {
      const sourceOptions = validPlants.map((p) => ({
        value: p.value,
        label: `${p.value} ${p.label}`,
      }));
      if (sourceOptions.length) return sourceOptions;
      const fallback = new Map<string, string>();
      eventRows.forEach((r) => {
        if (!fallback.has(r.污水厂编码)) fallback.set(r.污水厂编码, r.污水厂名称);
      });
      return [...fallback.entries()].map(([value, name]) => ({ value, label: `${value} ${name}` }));
    },
    [eventRows, validPlants],
  );

  const effectiveDateRange = useMemo((): [Dayjs, Dayjs] | null => {
    const now = dayjs();
    if (timeRange === 'all') return null;
    if (timeRange === 'custom') return customRange;
    if (timeRange === 'month') return [now.startOf('month'), now.endOf('month')];
    if (timeRange === 'quarter') return [now.startOf('quarter'), now.endOf('quarter')];
    return [now.startOf('year'), now.endOf('year')];
  }, [customRange, timeRange]);

  const filtered = useMemo(() => {
    return eventRows.filter((item) => {
      if (plantCode && item.污水厂编码 !== plantCode) return false;
      if (effectiveDateRange) {
        const [start, end] = effectiveDateRange;
        const d = dayjs(item.发生时间.replace(' ', 'T'));
        if (d.isBefore(start.startOf('day')) || d.isAfter(end.endOf('day'))) return false;
      }
      return true;
    });
  }, [effectiveDateRange, eventRows, plantCode]);

  const totalCount = filtered.length;
  const avgDuration = totalCount > 0 ? filtered.reduce((sum, item) => sum + item.处理时长小时, 0) / totalCount : 0;
  const over48Count = filtered.filter((item) => item.是否超48小时).length;
  const majorCount = filtered.filter((item) => item.事件等级 === '重大').length;
  const over48Rate = totalCount > 0 ? (over48Count / totalCount) * 100 : 0;
  const impactWideCount = filtered.filter((item) => item.影响范围 === '全厂范围' || item.影响范围 === '周边水体').length;
  const impactWideRate = totalCount > 0 ? (impactWideCount / totalCount) * 100 : 0;

  const typeStats = useMemo(() => {
    const map = new Map<EventType, { count: number; duration: number; over48: number }>();
    for (const record of filtered) {
      const current = map.get(record.事件类型) ?? { count: 0, duration: 0, over48: 0 };
      current.count += 1;
      current.duration += record.处理时长小时;
      current.over48 += record.是否超48小时 ? 1 : 0;
      map.set(record.事件类型, current);
    }
    return EVENT_TYPE_OPTIONS.map(({ value }) => {
      const stat = map.get(value) ?? { count: 0, duration: 0, over48: 0 };
      const avg = stat.count > 0 ? stat.duration / stat.count : 0;
      return {
        key: value,
        事件类型: value,
        事件次数: stat.count,
        平均处理时长: Number(avg.toFixed(1)),
        超48小时占比: stat.count > 0 ? Number(((stat.over48 / stat.count) * 100).toFixed(1)) : 0,
      };
    });
  }, [filtered]);

  const impactStats = useMemo(() => {
    const order: ImpactScope[] = ['单工艺段', '全厂局部', '全厂范围', '周边水体'];
    return order.map((scope) => {
      const subset = filtered.filter((item) => item.影响范围 === scope);
      const ratio = totalCount > 0 ? Number(((subset.length / totalCount) * 100).toFixed(1)) : 0;
      return { key: scope, 影响范围: scope, 事件数: subset.length, 占比: ratio };
    });
  }, [filtered, totalCount]);

  const typeCountRows = useMemo(
    () => typeStats.map((r) => ({ type: r.事件类型, count: r.事件次数 })),
    [typeStats],
  );
  const typeDurationRows = useMemo(
    () => typeStats.map((r) => ({ type: r.事件类型, avgDuration: r.平均处理时长 })),
    [typeStats],
  );
  const plantStatsRows = useMemo(() => {
    const map = new Map<string, { plantName: string; n: number; over48: number; duration: number }>();
    for (const item of filtered) {
      const current = map.get(item.污水厂编码) ?? { plantName: item.污水厂名称, n: 0, over48: 0, duration: 0 };
      current.n += 1;
      current.over48 += item.是否超48小时 ? 1 : 0;
      current.duration += item.处理时长小时;
      map.set(item.污水厂编码, current);
    }
    return [...map.entries()]
      .map(([code, v]) => ({
        key: code,
        plantCode: code,
        plantName: v.plantName,
        n: v.n,
        over48Rate: Number(((v.over48 / v.n) * 100).toFixed(1)),
        avgDuration: Number((v.duration / v.n).toFixed(1)),
      }))
      .sort((a, b) => b.n - a.n);
  }, [filtered]);

  const typeColumns: ColumnsType<(typeof typeStats)[number]> = [
    { title: '事件类型', dataIndex: '事件类型', key: '事件类型', width: 140 },
    { title: '发生次数', dataIndex: '事件次数', key: '事件次数', width: 100, align: 'right' },
    { title: '平均处理时长(h)', dataIndex: '平均处理时长', key: '平均处理时长', width: 140 },
    {
      title: '超48小时占比',
      dataIndex: '超48小时占比',
      key: '超48小时占比',
      width: 140,
      align: 'right',
      render: (value: number) => `${value}%`,
    },
  ];

  const impactColumns: ColumnsType<(typeof impactStats)[number]> = [
    { title: '影响范围', dataIndex: '影响范围', key: '影响范围', width: 140 },
    { title: '事件数', dataIndex: '事件数', key: '事件数', width: 100, align: 'right' },
    {
      title: '占比',
      dataIndex: '占比',
      key: '占比',
      width: 120,
      align: 'right',
      render: (value: number) => `${value}%`,
    },
  ];

  const plantColumns: ColumnsType<(typeof plantStatsRows)[number]> = [
    { title: '污水厂', dataIndex: 'plantName', key: 'plantName', ellipsis: true },
    { title: '事件数', dataIndex: 'n', key: 'n', width: 90, align: 'right' },
    {
      title: '超48小时占比',
      dataIndex: 'over48Rate',
      key: 'over48Rate',
      width: 140,
      align: 'right',
      render: (v: number) => `${v}%`,
    },
    {
      title: '平均处理时长(h)',
      dataIndex: 'avgDuration',
      key: 'avgDuration',
      width: 140,
      align: 'right',
    },
  ];

  const handleExportPdf = async () => {
    if (!filtered.length) {
      message.warning('当前筛选条件下无内容可导出');
      return;
    }
    const el = pdfCaptureRef.current;
    if (!el) {
      message.error('导出区域未就绪');
      return;
    }
    const hide = message.loading('正在生成 PDF…', 0);
    try {
      await downloadElementAsPdf(el, '污水厂事件统计');
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
        title="事件统计"
        extra={
          <Button
            type="button"
            className="facility-stat-pdf-export-btn"
            icon={<DownloadOutlined />}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void handleExportPdf();
            }}
          >
            导出PDF
          </Button>
        }
      >
        <div ref={pdfCaptureRef} className="facility-stat-pdf-capture-root">
        <Row gutter={[16, 12]} align="middle" style={{ marginBottom: 16 }}>
          <Col xs={24} sm={24} md={8} lg={6} xl={5}>
            <Select
              allowClear
              showSearch
              placeholder="全部污水厂"
              optionFilterProp="label"
              value={plantCode}
              options={plantOptions}
              onChange={setPlantCode}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={24} md={16} lg={13} xl={14}>
            <Space wrap size="middle" align="center">
              <span style={{ whiteSpace: 'nowrap' }}>发生时间：</span>
              <Radio.Group value={timeRange} onChange={(e) => setTimeRange(e.target.value)} buttonStyle="solid">
                {TIME_RANGE_OPTIONS.map((option) => (
                  <Radio.Button key={option.value} value={option.value}>
                    {option.label}
                  </Radio.Button>
                ))}
              </Radio.Group>
              {timeRange === 'custom' ? (
                <RangePicker value={customRange as any} onChange={(v) => setCustomRange(v as [Dayjs, Dayjs] | null)} />
              ) : null}
            </Space>
          </Col>
          <Col xs={24} sm={24} md={24} lg={5} xl={5} style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <Space size={8}>
              <Button className="search-btn" type="primary" icon={<SearchOutlined />} onClick={() => message.success('已按当前条件刷新统计（原型）')}>
                查询
              </Button>
              <Button
                onClick={() => {
                  setPlantCode(undefined);
                  setTimeRange('all');
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
              <Statistic title="事件总数（当前口径）" value={totalCount} suffix="起" valueStyle={{ color: '#1e5bb5' }} prefix={<FileTextOutlined />} />
              <div className="eco-stat-metric-foot">&nbsp;</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" className="eco-stat-metric-card">
              <Statistic title="重大事件数" value={majorCount} suffix="起" valueStyle={{ color: '#ef4444' }} prefix={<WarningOutlined />} />
              <div className="eco-stat-metric-foot">事件等级为「重大」</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" className="eco-stat-metric-card">
              <Statistic title="超48小时占比" value={Number(over48Rate.toFixed(1))} suffix="%" valueStyle={{ color: over48Rate > 20 ? '#ef4444' : '#64748b' }} prefix={<AlertOutlined />} />
              <div className="eco-stat-metric-foot">处理时长超过 48 小时事件占比</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" className="eco-stat-metric-card">
              <Statistic title="平均处理时长（全体）" value={Number(avgDuration.toFixed(1))} suffix="小时" valueStyle={{ color: '#1e5bb5' }} prefix={<ClockCircleOutlined />} />
              <div className="eco-stat-metric-foot">&nbsp;</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" className="eco-stat-metric-card">
              <Statistic title="影响范围较广占比" value={Number(impactWideRate.toFixed(1))} suffix="%" valueStyle={{ color: '#d97706' }} prefix={<NodeExpandOutlined />} />
              <div className="eco-stat-metric-foot">口径：全厂范围 + 周边水体</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" className="eco-stat-metric-card">
              <Statistic title="类型覆盖数" value={typeStats.filter((item) => item.事件次数 > 0).length} suffix="类" valueStyle={{ color: '#7c3aed' }} prefix={<DotChartOutlined />} />
              <div className="eco-stat-metric-foot">质量示意：类型分布越均衡越利于风险识别</div>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} className="eco-stat-chart-row" style={{ marginBottom: 16 }}>
          <Col xs={24} lg={12}>
            <Card size="small" title="事件类型发生频率">
              {typeCountRows.some((row) => row.count > 0) ? (
                <EventTypeCountChart rows={typeCountRows} />
              ) : (
                <div className="eco-stat-chart-empty">
                  <Empty description="无数据" />
                </div>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card size="small" title="各类型平均处理时长（小时）">
              {typeDurationRows.some((row) => row.avgDuration > 0) ? (
                <EventDurationChart rows={typeDurationRows} />
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
            <Card size="small" title="按事件类型汇总">
              <div className="eco-stat-split-table-wrap">
                <Table size="small" pagination={false} columns={typeColumns} dataSource={typeStats} locale={{ emptyText: '无数据' }} />
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card size="small" title="影响范围分布">
              <div className="eco-stat-split-table-wrap">
                <Table size="small" pagination={false} columns={impactColumns} dataSource={impactStats} locale={{ emptyText: '无数据' }} />
              </div>
            </Card>
          </Col>
        </Row>

        <Card size="small" title="按污水厂汇总">
          <Table
            size="small"
            rowKey="key"
            pagination={{ pageSize: 8, showTotal: (n) => `共 ${n} 家` }}
            columns={plantColumns}
            dataSource={plantStatsRows}
            locale={{ emptyText: '无数据' }}
          />
        </Card>
        </div>
      </Card>
    </div>
  );
};
