/**
 * 设施管理 · 事件管理 · 事件统计
 * 仅聚合事件列表台账字段（与 facility-unified-event-list-view 同源数据）
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts';
import {
  AlertOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  FileTextOutlined,
  SearchOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Button, Card, Col, DatePicker, Empty, message, Radio, Row, Select, Space, Statistic, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { downloadElementAsPdf } from '../shared/facilityStatPdfExport';
import type { PointKindZh, UnifiedFacilityEventRecord } from './facility-unified-event-data';
import {
  eventDisposalDurationHours,
  hasEventRecordDisposalFilled,
  isEventDisposalOver48Hours,
} from './facility-unified-event-data';

type TimeRange = 'all' | 'month' | 'quarter' | 'year' | 'custom';

const { RangePicker } = DatePicker;

const TIME_RANGE_OPTIONS: { label: string; value: TimeRange }[] = [
  { label: '全部', value: 'all' },
  { label: '本月', value: 'month' },
  { label: '本季度', value: 'quarter' },
  { label: '本年', value: 'year' },
  { label: '自定义', value: 'custom' },
];

const EVENT_LEVEL_ORDER = ['一般', '较大', '重大'] as const;
const EVENT_STATUS_ORDER = ['待处置', '处置完成', '终止'] as const;

const EventBarChart: React.FC<{
  categories: string[];
  values: number[];
  yAxisName?: string;
  colors?: string[];
  rotateLabel?: boolean;
}> = ({ categories, values, yAxisName = '起', colors, rotateLabel }) => {
  const elRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!elRef.current) return;
    const chart = echarts.init(elRef.current);
    chart.setOption({
      color: colors,
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 16, top: 20, bottom: rotateLabel ? 56 : 36 },
      xAxis: {
        type: 'category',
        axisTick: { alignWithLabel: true },
        data: categories,
        axisLabel: { fontSize: 11, rotate: rotateLabel ? 16 : 0 },
      },
      yAxis: { type: 'value', name: yAxisName, minInterval: 1 },
      series: [{ type: 'bar', data: values, barMaxWidth: 32, itemStyle: colors ? undefined : { color: '#1e5bb5' } }],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(elRef.current);
    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [categories, colors, rotateLabel, values, yAxisName]);
  return <div ref={elRef} className="eco-stat-echart-host" />;
};

export type FacilityUnifiedEventStatsViewProps = {
  eventRows: UnifiedFacilityEventRecord[];
  /** 按点位类型筛选（Tab 口径） */
  pointKind: PointKindZh;
  /** 关联点位下拉占位 */
  facilityPlaceholder: string;
};

export const FacilityUnifiedEventStatsView: React.FC<FacilityUnifiedEventStatsViewProps> = ({
  eventRows,
  pointKind,
  facilityPlaceholder,
}) => {
  const pdfCaptureRef = useRef<HTMLDivElement | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [facilityCode, setFacilityCode] = useState<string | undefined>();

  const kindRows = useMemo(
    () => eventRows.filter(r => r.点位类型 === pointKind),
    [eventRows, pointKind],
  );

  const facilityOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of kindRows) {
      const code = String(r.点位编码 || '').trim();
      if (!code || map.has(code)) continue;
      map.set(code, String(r.点位名称 || code));
    }
    return [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], 'zh-CN'))
      .map(([value, name]) => ({ value, label: `${value} ${name}` }));
  }, [kindRows]);

  const effectiveDateRange = useMemo((): [Dayjs, Dayjs] | null => {
    const now = dayjs();
    if (timeRange === 'all') return null;
    if (timeRange === 'custom') return customRange;
    if (timeRange === 'month') return [now.startOf('month'), now.endOf('month')];
    if (timeRange === 'quarter') {
      const qStart = now.startOf('month').subtract((now.month() % 3), 'month');
      return [qStart, qStart.add(2, 'month').endOf('month')];
    }
    return [now.startOf('year'), now.endOf('year')];
  }, [customRange, timeRange]);

  const filtered = useMemo(() => {
    return kindRows.filter(item => {
      if (facilityCode && item.点位编码 !== facilityCode) return false;
      if (effectiveDateRange) {
        const [start, end] = effectiveDateRange;
        const d = dayjs(String(item.发生时间 || '').replace(' ', 'T'));
        if (!d.isValid()) return false;
        if (d.isBefore(start.startOf('day')) || d.isAfter(end.endOf('day'))) return false;
      }
      return true;
    });
  }, [effectiveDateRange, facilityCode, kindRows]);

  const totalCount = filtered.length;
  const majorCount = filtered.filter(item => item.事件等级 === '重大').length;
  const pendingCount = filtered.filter(item => item.状态 === '待处置').length;
  const completedCount = filtered.filter(item => item.状态 === '处置完成').length;
  const completedRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const disposalFilledCount = filtered.filter(hasEventRecordDisposalFilled).length;
  const disposalFilledRate = totalCount > 0 ? (disposalFilledCount / totalCount) * 100 : 0;

  const durationSamples = useMemo(
    () =>
      filtered
        .map(eventDisposalDurationHours)
        .filter((h): h is number => h != null),
    [filtered],
  );
  const avgDuration = durationSamples.length
    ? durationSamples.reduce((a, b) => a + b, 0) / durationSamples.length
    : 0;
  const over48Count = filtered.filter(isEventDisposalOver48Hours).length;
  const over48Rate =
    durationSamples.length > 0 ? (over48Count / durationSamples.length) * 100 : 0;

  const typeStats = useMemo(() => {
    const map = new Map<string, { count: number; completed: number; durationSum: number; durationN: number }>();
    for (const record of filtered) {
      const key = String(record.事件类型 || '—');
      const current = map.get(key) ?? { count: 0, completed: 0, durationSum: 0, durationN: 0 };
      current.count += 1;
      if (record.状态 === '处置完成') current.completed += 1;
      const h = eventDisposalDurationHours(record);
      if (h != null) {
        current.durationSum += h;
        current.durationN += 1;
      }
      map.set(key, current);
    }
    return [...map.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([type, stat]) => ({
        key: type,
        事件类型: type,
        事件次数: stat.count,
        处置完成数: stat.completed,
        平均处置时长: stat.durationN > 0 ? Number((stat.durationSum / stat.durationN).toFixed(1)) : null,
      }));
  }, [filtered]);

  const levelStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const lab of EVENT_LEVEL_ORDER) map.set(lab, 0);
    for (const r of filtered) {
      const k = String(r.事件等级 || '');
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return EVENT_LEVEL_ORDER.map(level => ({
      key: level,
      事件等级: level,
      事件数: map.get(level) ?? 0,
      占比: totalCount > 0 ? Number((((map.get(level) ?? 0) / totalCount) * 100).toFixed(1)) : 0,
    }));
  }, [filtered, totalCount]);

  const statusStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const lab of EVENT_STATUS_ORDER) map.set(lab, 0);
    for (const r of filtered) {
      const k = String(r.状态 || '');
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return EVENT_STATUS_ORDER.map(status => ({
      key: status,
      状态: status,
      事件数: map.get(status) ?? 0,
      占比: totalCount > 0 ? Number((((map.get(status) ?? 0) / totalCount) * 100).toFixed(1)) : 0,
    }));
  }, [filtered, totalCount]);

  const facilityStatsRows = useMemo(() => {
    const map = new Map<
      string,
      { name: string; n: number; major: number; pending: number; completed: number }
    >();
    for (const item of filtered) {
      const code = String(item.点位编码 || '');
      const current = map.get(code) ?? {
        name: String(item.点位名称 || code),
        n: 0,
        major: 0,
        pending: 0,
        completed: 0,
      };
      current.n += 1;
      if (item.事件等级 === '重大') current.major += 1;
      if (item.状态 === '待处置') current.pending += 1;
      if (item.状态 === '处置完成') current.completed += 1;
      map.set(code, current);
    }
    return [...map.entries()]
      .map(([code, v]) => ({
        key: code,
        点位编码: code,
        点位名称: v.name,
        事件数: v.n,
        重大事件: v.major,
        待处置: v.pending,
        处置完成: v.completed,
      }))
      .sort((a, b) => b.事件数 - a.事件数);
  }, [filtered]);

  const regionStatsRows = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      const region = String(r.所属区域 || '').trim() || '未分区';
      map.set(region, (map.get(region) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([region, n]) => ({ key: region, 所属区域: region, 事件数: n }))
      .sort((a, b) => b.事件数 - a.事件数);
  }, [filtered]);

  const typeColumns: ColumnsType<(typeof typeStats)[number]> = [
    { title: '事件类型', dataIndex: '事件类型', key: '事件类型', width: 140 },
    { title: '发生次数', dataIndex: '事件次数', key: '事件次数', width: 100, align: 'right' },
    { title: '处置完成', dataIndex: '处置完成数', key: '处置完成数', width: 100, align: 'right' },
    {
      title: '平均处置时长(h)',
      dataIndex: '平均处置时长',
      key: '平均处置时长',
      width: 140,
      align: 'right',
      render: (v: number | null) => (v != null ? v : '—'),
    },
  ];

  const levelColumns: ColumnsType<(typeof levelStats)[number]> = [
    { title: '事件等级', dataIndex: '事件等级', key: '事件等级', width: 120 },
    { title: '事件数', dataIndex: '事件数', key: '事件数', width: 100, align: 'right' },
    {
      title: '占比',
      dataIndex: '占比',
      key: '占比',
      width: 100,
      align: 'right',
      render: (v: number) => `${v}%`,
    },
  ];

  const statusColumns: ColumnsType<(typeof statusStats)[number]> = [
    { title: '状态', dataIndex: '状态', key: '状态', width: 120 },
    { title: '事件数', dataIndex: '事件数', key: '事件数', width: 100, align: 'right' },
    {
      title: '占比',
      dataIndex: '占比',
      key: '占比',
      width: 100,
      align: 'right',
      render: (v: number) => `${v}%`,
    },
  ];

  const facilityColumns: ColumnsType<(typeof facilityStatsRows)[number]> = [
    { title: '点位名称', dataIndex: '点位名称', key: '点位名称', ellipsis: true },
    { title: '点位编码', dataIndex: '点位编码', key: '点位编码', width: 160 },
    { title: '事件数', dataIndex: '事件数', key: '事件数', width: 80, align: 'right' },
    { title: '重大', dataIndex: '重大事件', key: '重大事件', width: 70, align: 'right' },
    { title: '待处置', dataIndex: '待处置', key: '待处置', width: 80, align: 'right' },
    { title: '处置完成', dataIndex: '处置完成', key: '处置完成', width: 90, align: 'right' },
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
      await downloadElementAsPdf(el, `${pointKind}事件统计`);
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
                optionFilterProp="label"
                placeholder={facilityPlaceholder}
                style={{ width: '100%' }}
                value={facilityCode}
                options={facilityOptions}
                onChange={setFacilityCode}
              />
            </Col>
            <Col xs={24} sm={24} md={16} lg={13} xl={14}>
              <Space wrap size="middle" align="center">
                <span style={{ whiteSpace: 'nowrap' }}>发生时间：</span>
                <Radio.Group value={timeRange} onChange={e => setTimeRange(e.target.value)} buttonStyle="solid">
                  {TIME_RANGE_OPTIONS.map(option => (
                    <Radio.Button key={option.value} value={option.value}>
                      {option.label}
                    </Radio.Button>
                  ))}
                </Radio.Group>
                {timeRange === 'custom' ? (
                  <RangePicker value={customRange as any} onChange={v => setCustomRange(v as [Dayjs, Dayjs] | null)} />
                ) : null}
              </Space>
            </Col>
            <Col
              xs={24}
              sm={24}
              md={24}
              lg={5}
              xl={5}
              style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}
            >
              <Space size={8}>
                <Button
                  className="search-btn"
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={() => message.success('已按当前筛选与事件台账字段刷新统计')}
                >
                  查询
                </Button>
                <Button
                  onClick={() => {
                    setFacilityCode(undefined);
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
                <Statistic
                  title="事件总数（当前口径）"
                  value={totalCount}
                  suffix="起"
                  valueStyle={{ color: '#1e5bb5' }}
                  prefix={<FileTextOutlined />}
                />
                <div className="eco-stat-metric-foot">点位类型：{pointKind}</div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card size="small" className="eco-stat-metric-card">
                <Statistic
                  title="重大事件数"
                  value={majorCount}
                  suffix="起"
                  valueStyle={{ color: '#ef4444' }}
                  prefix={<WarningOutlined />}
                />
                <div className="eco-stat-metric-foot">台账字段「事件等级」为重大</div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card size="small" className="eco-stat-metric-card">
                <Statistic
                  title="待处置"
                  value={pendingCount}
                  suffix="起"
                  valueStyle={{ color: '#d97706' }}
                  prefix={<AlertOutlined />}
                />
                <div className="eco-stat-metric-foot">台账字段「状态」为待处置</div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card size="small" className="eco-stat-metric-card">
                <Statistic
                  title="处置完成率"
                  value={Number(completedRate.toFixed(1))}
                  suffix="%"
                  valueStyle={{ color: '#10b981' }}
                  prefix={<CheckCircleOutlined />}
                />
                <div className="eco-stat-metric-foot">
                  处置完成 {completedCount} / {totalCount}
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card size="small" className="eco-stat-metric-card">
                <Statistic
                  title="平均处置时长"
                  value={durationSamples.length ? Number(avgDuration.toFixed(1)) : 0}
                  suffix="小时"
                  valueStyle={{ color: '#1e5bb5' }}
                  prefix={<ClockCircleOutlined />}
                />
                <div className="eco-stat-metric-foot">
                  发生时间 → 处置完成时间（{durationSamples.length} 条可算）
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card size="small" className="eco-stat-metric-card">
                <Statistic
                  title="处置信息已填报率"
                  value={Number(disposalFilledRate.toFixed(1))}
                  suffix="%"
                  valueStyle={{ color: '#7c3aed' }}
                  prefix={<FileTextOutlined />}
                />
                <div className="eco-stat-metric-foot">
                  已填报 {disposalFilledCount} / {totalCount}（与列表判定一致）
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} className="eco-stat-chart-row" style={{ marginBottom: 16 }}>
            <Col xs={24} lg={12}>
              <Card size="small" title="事件类型分布（台账·事件类型）">
                {typeStats.length ? (
                  <EventBarChart
                    categories={typeStats.map(r => r.事件类型)}
                    values={typeStats.map(r => r.事件次数)}
                    rotateLabel
                  />
                ) : (
                  <div className="eco-stat-chart-empty">
                    <Empty description="无数据" />
                  </div>
                )}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card size="small" title="事件等级分布（台账·事件等级）">
                {totalCount ? (
                  <EventBarChart
                    categories={levelStats.map(r => r.事件等级)}
                    values={levelStats.map(r => r.事件数)}
                    colors={['#64748b', '#d97706', '#dc2626']}
                  />
                ) : (
                  <div className="eco-stat-chart-empty">
                    <Empty description="无数据" />
                  </div>
                )}
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} className="eco-stat-split-row" style={{ marginBottom: 16 }}>
            <Col xs={24} lg={12}>
              <Card size="small" title="按事件类型汇总">
                <div className="eco-stat-split-table-wrap">
                  <Table
                    size="small"
                    pagination={false}
                    columns={typeColumns}
                    dataSource={typeStats}
                    locale={{ emptyText: '无数据' }}
                  />
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card size="small" title="按状态分布（台账·状态）">
                <div className="eco-stat-split-table-wrap">
                  <Table
                    size="small"
                    pagination={false}
                    columns={statusColumns}
                    dataSource={statusStats}
                    locale={{ emptyText: '无数据' }}
                  />
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} lg={12}>
              <Card size="small" title="按事件等级汇总">
                <div className="eco-stat-split-table-wrap">
                  <Table
                    size="small"
                    pagination={false}
                    columns={levelColumns}
                    dataSource={levelStats}
                    locale={{ emptyText: '无数据' }}
                  />
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card size="small" title="按所属区域汇总（台账·所属区域）">
                <Table
                  size="small"
                  rowKey="key"
                  pagination={{ defaultPageSize: 6, showTotal: t => `共 ${t} 个区划` }}
                  columns={[
                    { title: '所属区域', dataIndex: '所属区域', key: '所属区域' },
                    { title: '事件数', dataIndex: '事件数', key: '事件数', align: 'right' as const },
                  ]}
                  dataSource={regionStatsRows}
                  locale={{ emptyText: '无数据' }}
                />
              </Card>
            </Col>
          </Row>

          <Card size="small" title="按关联点位汇总">
            <Table
              size="small"
              rowKey="key"
              pagination={{ defaultPageSize: 8, showTotal: n => `共 ${n} 处点位` }}
              columns={facilityColumns}
              dataSource={facilityStatsRows}
              locale={{ emptyText: '无数据' }}
            />
          </Card>

          {durationSamples.length > 0 ? (
            <div style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>
              超 48 小时处置占比（可算时长口径）：{over48Rate.toFixed(1)}%（{over48Count} / {durationSamples.length}）
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
};
