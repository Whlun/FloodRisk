import React, { useCallback, useMemo, useState } from 'react';
import {
  BellOutlined,
  CalendarOutlined,
  ArrowDownOutlined,
  ArrowRightOutlined,
  ArrowUpOutlined,
  LineChartOutlined,
  MinusOutlined,
  ReloadOutlined,
  SettingOutlined,
  SwapOutlined,
  UnorderedListOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Button, Card, Col, Empty, Row, Segmented, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { waterloggingIotAlerts } from '../../database/deqing-waterlogging-iot-alerts';
import { waterloggingMonitorPoints } from '../../database/deqing-waterlogging-iot-monitoring';
import { AlertDetailDrawer } from './AlertDetailDrawer';
import { PeriodCompareChart } from './PeriodCompareChart';
import { PointHourlyTrendChart } from './PointHourlyTrendChart';
import { RiskIndexConfigModal } from './RiskIndexConfigModal';
import { RiskIndexGauge } from './RiskIndexGauge';
import { RiskIndexHelpTip } from './RiskIndexHelpTip';
import { RiskIndexTrendChart } from './RiskIndexTrendChart';
import { RiskIndexTrendHelpTip } from './RiskIndexTrendHelpTip';
import { Top5RankingChart } from './Top5RankingChart';
import { loadRiskIndexConfig } from './riskIndexConfig';
import { ALERT_LEVEL_COLOR } from './types';
import {
  build12hHourlyBuckets,
  buildAlertLevelChangeLogs,
  buildEpisodeCompareSeries,
  buildEpisodeIndexTrendSeries,
  buildPointWaterStatusRows,
  buildTop5PointRanking,
  computeRiskIndex,
  formatAlertDuration,
  formatDateTime,
  formatDepthDisplay,
  formatEpisodeRange,
  formatEpisodePublishLabel,
  formatPostPublishWindowLabel,
  formatRelativeTime,
  getDemoNow,
} from './riskIndexUtils';

type StatusWindowHours = 12 | 24;

const DEPTH_TREND_COLOR: Record<'up' | 'down' | 'flat', string> = {
  up: '#ef4444',
  down: '#10b981',
  flat: '#94a3b8',
};

function renderWaterDepthTrendIcon(trend: 'up' | 'down' | 'flat' | null) {
  if (!trend) return null;
  const color = DEPTH_TREND_COLOR[trend];
  if (trend === 'up') return <ArrowUpOutlined style={{ color, fontSize: 12 }} />;
  if (trend === 'down') return <ArrowDownOutlined style={{ color, fontSize: 12 }} />;
  return <MinusOutlined style={{ color, fontSize: 12 }} />;
}

export const RiskIndexPage: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [configVersion, setConfigVersion] = useState(0);
  const [configOpen, setConfigOpen] = useState(false);
  const [drawerRegistryId, setDrawerRegistryId] = useState<string | null>(null);
  const [statusWindowHours, setStatusWindowHours] = useState<StatusWindowHours>(12);
  const [logWindowHours, setLogWindowHours] = useState<StatusWindowHours>(12);

  const now = useMemo(() => getDemoNow(), [refreshKey]);
  const alerts = useMemo(() => waterloggingIotAlerts, []);

  const result = useMemo(() => computeRiskIndex(alerts, now), [alerts, now, refreshKey, configVersion]);
  const hourly12 = useMemo(
    () => build12hHourlyBuckets(alerts, result.currentEpisode, now),
    [alerts, result.currentEpisode, now, refreshKey, configVersion],
  );
  const episodeCompare = useMemo(() => {
    if (!result.currentEpisode) return [];
    return buildEpisodeCompareSeries(
      result.currentEpisode,
      result.previousEpisode,
      now,
    );
  }, [result.currentEpisode, result.previousEpisode, now, refreshKey, configVersion]);
  const indexTrend = useMemo(() => {
    if (!result.currentEpisode) return [];
    return buildEpisodeIndexTrendSeries(
      result.currentEpisode,
      result.previousEpisode,
      now,
    );
  }, [result.currentEpisode, result.previousEpisode, now, refreshKey, configVersion]);
  const top5 = useMemo(
    () => buildTop5PointRanking(alerts, result.currentEpisode, now),
    [alerts, result.currentEpisode, now, refreshKey, configVersion],
  );
  const pointStatusRows = useMemo(
    () =>
      buildPointWaterStatusRows(
        alerts,
        waterloggingMonitorPoints,
        statusWindowHours,
        result.currentEpisode,
        now,
      ),
    [alerts, result.currentEpisode, now, refreshKey, statusWindowHours, configVersion],
  );
  const levelChangeLogs = useMemo(
    () => buildAlertLevelChangeLogs(alerts, logWindowHours, result.currentEpisode, now),
    [alerts, result.currentEpisode, now, refreshKey, logWindowHours, configVersion],
  );

  const handleConfigSaved = useCallback(() => {
    loadRiskIndexConfig();
    setConfigVersion(v => v + 1);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
    message.success('已刷新风险指数与预警统计');
  }, []);

  const pointTableData = useMemo(
    () =>
      pointStatusRows.map(row => ({
        key: row.registryId,
        row,
      })),
    [pointStatusRows],
  );

  const pointColumns: ColumnsType<(typeof pointTableData)[number]> = [
    {
      title: '内涝点',
      key: 'pointName',
      ellipsis: true,
      width: 168,
      render: (_, { row }) => (
        <Space size={6} wrap className="dq-risk-index-point-name-cell">
          <Typography.Text ellipsis={{ tooltip: row.pointName }}>{row.pointName}</Typography.Text>
          {row.isNewAlert ? (
            <Tag color="processing" bordered={false} className="dq-risk-index-point-new-tag">
              新增
            </Tag>
          ) : null}
        </Space>
      ),
    },
    {
      title: '报警等级',
      key: 'level',
      width: 96,
      render: (_, { row }) => (
        <Tag color={ALERT_LEVEL_COLOR[row.peakLevel]} bordered={false}>
          {row.peakLevelLabel}
        </Tag>
      ),
    },
    {
      title: '当前水位',
      key: 'waterDepth',
      width: 108,
      render: (_, { row }) => {
        const trendTitle =
          row.previousWaterDepthCm != null
            ? `较上次 ${formatDepthDisplay(row.previousWaterDepthCm)}`
            : undefined;
        return (
          <span className="dq-risk-index-depth-cell" title={trendTitle}>
            <Typography.Text strong style={{ color: ALERT_LEVEL_COLOR[row.peakLevel] }}>
              {formatDepthDisplay(row.waterDepthCm)}
            </Typography.Text>
            {row.waterDepthTrend ? (
              <span className="dq-risk-index-depth-trend" title={trendTitle}>
                {renderWaterDepthTrendIcon(row.waterDepthTrend)}
              </span>
            ) : null}
          </span>
        );
      },
    },
    {
      title: '初次报警',
      key: 'firstAlertAt',
      width: 148,
      render: (_, { row }) => formatDateTime(row.firstAlertAt),
    },
    {
      title: '持续时间',
      key: 'alertDuration',
      width: 108,
      render: (_, { row }) => (
        <Typography.Text type="secondary">{formatAlertDuration(row.firstAlertAt, now)}</Typography.Text>
      ),
    },
    {
      title: '最近更新',
      key: 'lastReportAt',
      width: 96,
      render: (_, { row }) =>
        row.lastReportAt ? formatRelativeTime(row.lastReportAt, now) : '—',
    },
  ];

  const levelChangeTableData = useMemo(
    () => levelChangeLogs.map(log => ({ key: log.id, log })),
    [levelChangeLogs],
  );

  const levelChangeColumns: ColumnsType<(typeof levelChangeTableData)[number]> = [
    {
      title: '变化时间',
      key: 'changedAt',
      width: 156,
      render: (_, { log }) => formatDateTime(log.changedAt),
    },
    {
      title: '内涝点',
      key: 'pointName',
      ellipsis: true,
      render: (_, { log }) => log.pointName,
    },
    {
      title: '变化',
      key: 'direction',
      width: 72,
      render: (_, { log }) => (
        <Tag
          color={log.direction === 'up' ? 'error' : 'success'}
          bordered={false}
          icon={log.direction === 'up' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
        >
          {log.direction === 'up' ? '升级' : '降级'}
        </Tag>
      ),
    },
    {
      title: '等级变化',
      key: 'levelChange',
      width: 160,
      render: (_, { log }) => (
        <span className="dq-risk-index-level-change">
          <Tag color={ALERT_LEVEL_COLOR[log.fromLevel]} bordered={false}>
            {log.fromLevelLabel}
          </Tag>
          <ArrowRightOutlined className="dq-risk-index-level-change-arrow" />
          <Tag color={ALERT_LEVEL_COLOR[log.toLevel]} bordered={false}>
            {log.toLevelLabel}
          </Tag>
        </span>
      ),
    },
    {
      title: '触发水位',
      key: 'triggerDepth',
      width: 88,
      render: (_, { log }) => (
        <Typography.Text style={{ color: ALERT_LEVEL_COLOR[log.toLevel] }}>
          {formatDepthDisplay(log.triggerDepthCm)}
        </Typography.Text>
      ),
    },
    {
      title: '距今',
      key: 'relative',
      width: 88,
      render: (_, { log }) => formatRelativeTime(log.changedAt, now),
    },
  ];

  return (
    <div className="facility-view dq-risk-index-page">
      <Card
        title={
          <span className="dq-risk-index-page-title">
            内涝风险指数
            <RiskIndexHelpTip />
          </span>
        }
        extra={
          <Space>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setConfigOpen(true)}
            >
              指数参数配置
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
              刷新
            </Button>
          </Space>
        }
      >
        <Typography.Paragraph className="dq-risk-index-summary">{result.summary}</Typography.Paragraph>

        <Typography.Text type="secondary" className="dq-risk-index-meta">
          数据更新时间：{formatDateTime(now.toISOString())} · 统计口径：按内涝点去重（同一点位多次采集只计 1
          个）· 等级取窗口内最高
          {result.currentEpisode
            ? ` · 12h/24h 指标：自本期预警发布（${formatDateTime(result.currentEpisode.startAt.toISOString())}）起计`
            : ''}
        </Typography.Text>

        <Card size="small" className="dq-risk-index-hero-card" style={{ marginBottom: 16 }}>
          <div className="dq-risk-index-hero-row">
            <div className="dq-risk-index-hero-col dq-risk-index-hero-col--gauge">
              <RiskIndexGauge result={result} layout="horizontal" now={now} />
            </div>
            <div className="dq-risk-index-hero-col dq-risk-index-hero-col--trend">
              <div className="dq-risk-index-hero-trend">
              <span className="dq-risk-index-hero-trend-title">
                <Typography.Text strong>指数变化趋势</Typography.Text>
                <RiskIndexTrendHelpTip />
              </span>
              {indexTrend.length > 0 ? (
                <RiskIndexTrendChart
                  points={indexTrend}
                  hasPrevious={!!result.previousEpisode}
                  currentIndex={result.index}
                  hoursSincePublish={result.hoursSincePublish}
                  currentLabel={
                    result.currentEpisode
                      ? `第 ${result.currentEpisode.sequence} 期`
                      : '本期'
                  }
                  previousLabel={
                    result.previousEpisode
                      ? `第 ${result.previousEpisode.sequence} 期`
                      : '上一期'
                  }
                />
              ) : (
                <div className="dq-risk-index-hero-trend-empty">
                  <Empty description="暂无预警期指数趋势" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </div>
              )}
              </div>
            </div>
          </div>
        </Card>

        <Row gutter={[12, 12]} wrap={false} className="dq-risk-index-metrics-inline-row" style={{ marginBottom: 16 }}>
          <Col flex="1 1 0">
            <Card size="small" className="eco-stat-metric-card">
              <Statistic
                title="发布后 12 小时内超限报警点位"
                value={result.pointCount12}
                suffix="个"
                valueStyle={{ color: '#1e5bb5' }}
                prefix={<BellOutlined />}
              />
              <div className="eco-stat-metric-foot">
                高 {result.highPointCount12} · 中 {result.mediumPointCount12} · 低 {result.lowPointCount12}
                {result.currentEpisode ? ` · ${formatPostPublishWindowLabel(12)}` : ''}
              </div>
            </Card>
          </Col>
          <Col flex="1 1 0">
            <Card size="small" className="eco-stat-metric-card">
              <Statistic
                title="发布后 24 小时内超限报警点位"
                value={result.pointCount24}
                suffix="个"
                valueStyle={{ color: '#1e5bb5' }}
                prefix={<LineChartOutlined />}
              />
              <div className="eco-stat-metric-foot">
                {result.currentEpisode
                  ? formatPostPublishWindowLabel(24)
                  : '暂无当前预警期'}
              </div>
            </Card>
          </Col>
          <Col flex="1 1 0">
            <Card size="small" className="eco-stat-metric-card">
              <Statistic
                title="发布后 12h 内高风险点位"
                value={result.highPointCount12}
                suffix="个"
                valueStyle={{ color: result.highPointCount12 > 0 ? '#ef4444' : '#64748b' }}
                prefix={<WarningOutlined />}
              />
              <div className="eco-stat-metric-foot">发布后 12h 内最高等级为高风险的内涝点</div>
            </Card>
          </Col>
          <Col flex="1 1 0">
            <Card size="small" className="eco-stat-metric-card">
              <Statistic
                title="本期超限报警点位"
                value={result.currentEpisode?.pointCount ?? 0}
                suffix="个"
                valueStyle={{ color: '#1e5bb5' }}
                prefix={<CalendarOutlined />}
              />
              <div className="eco-stat-metric-foot">
                {result.previousEpisode
                  ? `上一期 ${result.previousEpisode.pointCount} 个点位`
                  : '暂无可对比的上一期'}
              </div>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} className="eco-stat-chart-row" style={{ marginBottom: 16 }}>
          <Col xs={24} lg={12}>
            <Card
              size="small"
              title="发布后 12 小时内超限报警点位趋势"
              extra={
                result.currentEpisode ? (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    横轴：距发布 +0h、+1h…
                  </Typography.Text>
                ) : null
              }
            >
              {hourly12.some(b => b.newPointCount > 0) ? (
                <PointHourlyTrendChart buckets={hourly12} variant="bar" postPublishAxis />
              ) : (
                <div className="eco-stat-chart-empty">
                  <Empty
                    description={
                      result.currentEpisode
                        ? '发布后 12 小时内无新增超限报警点位'
                        : '暂无当前预警期'
                    }
                  />
                </div>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card
              size="small"
              title="本期 vs 上一期预警过程对比"
              extra={
                result.currentEpisode ? (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    本期 {formatEpisodePublishLabel(result.currentEpisode, now)}
                    {result.previousEpisode
                      ? ` · 上期 ${formatEpisodeRange(result.previousEpisode)}`
                      : ''}
                  </Typography.Text>
                ) : null
              }
            >
              {episodeCompare.some(p => p.currentActiveCount > 0 || p.previousActiveCount > 0) ? (
                <PeriodCompareChart
                  points={episodeCompare}
                  currentLabel={
                    result.currentEpisode
                      ? `第 ${result.currentEpisode.sequence} 期（${result.currentEpisode.pointCount} 点）`
                      : '本期'
                  }
                  previousLabel={
                    result.previousEpisode
                      ? `第 ${result.previousEpisode.sequence} 期（${result.previousEpisode.pointCount} 点）`
                      : '上一期'
                  }
                />
              ) : (
                <div className="eco-stat-chart-empty">
                  <Empty description="暂无可对比的预警期次" />
                </div>
              )}
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} className="eco-stat-split-row" style={{ marginBottom: 16 }}>
          <Col xs={24} lg={12}>
            <Card
              size="small"
              title={
                <span>
                  <UnorderedListOutlined /> 积水报警信息
                </span>
              }
              extra={
                <Segmented
                  size="small"
                  value={statusWindowHours}
                  options={[
                    { label: '发布后 12h', value: 12 },
                    { label: '发布后 24h', value: 24 },
                  ]}
                  onChange={value => setStatusWindowHours(value as StatusWindowHours)}
                />
              }
            >
              <div className="eco-stat-split-table-wrap dq-risk-index-point-table-wrap">
                <Table
                  size="small"
                  pagination={{ defaultPageSize: 6, showSizeChanger: false, hideOnSinglePage: true }}
                  columns={pointColumns}
                  dataSource={pointTableData}
                  locale={{
                    emptyText: `${formatPostPublishWindowLabel(statusWindowHours)}暂无预警积水点`,
                  }}
                  onRow={record => ({
                    onClick: () => setDrawerRegistryId(record.row.registryId),
                    style: { cursor: 'pointer' },
                  })}
                />
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card size="small" title="发布后 12h 内报警点位 TOP5" extra={<Tag>TOP 5</Tag>}>
              {top5.length > 0 ? (
                <Top5RankingChart rows={top5} />
              ) : (
                <div className="eco-stat-chart-empty">
                  <Empty description="无数据" />
                </div>
              )}
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} className="eco-stat-split-row dq-risk-index-log-row" style={{ marginBottom: 16 }}>
          <Col xs={24}>
            <Card
              size="small"
              title={
                <span>
                  <SwapOutlined /> 预警等级变化日志
                </span>
              }
              extra={
                <Segmented
                  size="small"
                  value={logWindowHours}
                  options={[
                    { label: '发布后 12h', value: 12 },
                    { label: '发布后 24h', value: 24 },
                  ]}
                  onChange={value => setLogWindowHours(value as StatusWindowHours)}
                />
              }
            >
              <div className="eco-stat-split-table-wrap dq-risk-index-level-log-wrap">
                <Table
                  size="small"
                  pagination={{ defaultPageSize: 8, showSizeChanger: false, hideOnSinglePage: true }}
                  columns={levelChangeColumns}
                  dataSource={levelChangeTableData}
                  locale={{
                    emptyText: `${formatPostPublishWindowLabel(logWindowHours)}暂无等级变化记录`,
                  }}
                  onRow={record => ({
                    onClick: () => setDrawerRegistryId(record.log.registryId),
                    style: { cursor: 'pointer' },
                  })}
                />
              </div>
            </Card>
          </Col>
        </Row>

      </Card>

      <AlertDetailDrawer
        open={!!drawerRegistryId}
        registryId={drawerRegistryId}
        alerts={alerts}
        onClose={() => setDrawerRegistryId(null)}
      />

      <RiskIndexConfigModal
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        onSaved={handleConfigSaved}
        result={result}
      />
    </div>
  );
};

