import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, DatePicker, Descriptions, Empty, Segmented, Space, Tag, Timeline, Typography } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import * as echarts from 'echarts';
import type { SectionTraceAnalysisResult } from './zhtSectionTraceAnalysisData';
import { ZhtSectionTraceMap } from './zhtSectionTraceMap';

const { Text } = Typography;
const { RangePicker } = DatePicker;

export const ZhtSectionTraceAnalysisPanel: React.FC<{
  analysis: SectionTraceAnalysisResult | null;
}> = ({ analysis }) => {
  const weatherChartRef = useRef<HTMLDivElement>(null);
  const sourceChartRef = useRef<HTMLDivElement>(null);
  const weatherChartInst = useRef<echarts.ECharts | null>(null);
  const sourceChartInst = useRef<echarts.ECharts | null>(null);
  const [guideExpanded, setGuideExpanded] = useState(false);
  const [selectedOutletCode, setSelectedOutletCode] = useState<string | null>(null);
  const [windowRange, setWindowRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(48, 'hour'), dayjs()]);

  const rows = analysis?.topSources ?? [];
  const selectedSource = useMemo(() => {
    if (!analysis) return null;
    if (!analysis.topSources.length) return null;
    const code = selectedOutletCode ?? analysis.topSources[0].outletCode;
    return analysis.topSources.find(s => s.outletCode === code) ?? analysis.topSources[0];
  }, [analysis, selectedOutletCode]);

  const weatherXAxis = useMemo(() => analysis?.series48h.map(v => v.time) ?? [], [analysis]);
  const weatherTemp = useMemo(() => analysis?.series48h.map(v => v.waterTemp) ?? [], [analysis]);
  const weatherRain = useMemo(() => analysis?.series48h.map(v => v.rainfall) ?? [], [analysis]);
  const sourceLine = useMemo(() => analysis?.series48h.map(v => v.pollutionIndex) ?? [], [analysis]);
  const sourceFlow = useMemo(() => analysis?.series48h.map(v => v.flowSpeed) ?? [], [analysis]);
  const suspectLine = useMemo(() => {
    if (!analysis || !selectedSource) return [];
    const drift = (selectedSource.score % 7) * 0.08;
    return analysis.series48h.map((v, i) =>
      Number((v.pollutionIndex + 0.22 + drift + (i >= 9 && i <= 14 ? 0.35 : 0)).toFixed(2)),
    );
  }, [analysis, selectedSource]);

  useEffect(() => {
    if (!analysis?.topSources.length) {
      setSelectedOutletCode(null);
      return;
    }
    setSelectedOutletCode(analysis.topSources[0].outletCode);
  }, [analysis]);

  useEffect(() => {
    if (!weatherChartRef.current || !analysis) return;
    if (!weatherChartInst.current) weatherChartInst.current = echarts.init(weatherChartRef.current);
    weatherChartInst.current.setOption(
      {
        grid: { left: 38, right: 40, top: 36, bottom: 36 },
        tooltip: { trigger: 'axis' },
        legend: { top: 6, data: ['水温', '降雨量'] },
        xAxis: [{ type: 'category', data: weatherXAxis }],
        yAxis: [
          { type: 'value', name: '℃' },
          { type: 'value', name: 'mm', min: 0, max: 0.5 },
        ],
        series: [
          { name: '水温', type: 'line', yAxisIndex: 0, smooth: true, symbol: 'circle', data: weatherTemp },
          { name: '降雨量', type: 'bar', yAxisIndex: 1, barWidth: 12, data: weatherRain },
        ],
      },
      { notMerge: true },
    );
    const resize = () => weatherChartInst.current?.resize();
    window.addEventListener('resize', resize);
    const t = window.setTimeout(resize, 60);
    return () => {
      window.removeEventListener('resize', resize);
      window.clearTimeout(t);
    };
  }, [analysis, weatherRain, weatherTemp, weatherXAxis]);

  useEffect(() => {
    if (!sourceChartRef.current || !analysis) return;
    if (!sourceChartInst.current) sourceChartInst.current = echarts.init(sourceChartRef.current);
    sourceChartInst.current.setOption(
      {
        grid: { left: 42, right: 40, top: 32, bottom: 36 },
        tooltip: { trigger: 'axis' },
        legend: { top: 4, data: ['断面污染指数', '怀疑对象过程值', '流速'] },
        xAxis: [{ type: 'category', data: weatherXAxis }],
        yAxis: [
          { type: 'value', name: '污染指数' },
          { type: 'value', name: 'm/s', min: 0, max: 0.5 },
        ],
        series: [
          { name: '断面污染指数', type: 'line', smooth: true, symbol: 'circle', data: sourceLine },
          { name: '怀疑对象过程值', type: 'line', smooth: true, symbol: 'none', data: suspectLine },
          { name: '流速', type: 'line', yAxisIndex: 1, smooth: true, symbol: 'none', data: sourceFlow },
        ],
      },
      { notMerge: true },
    );
    const resize = () => sourceChartInst.current?.resize();
    window.addEventListener('resize', resize);
    const t = window.setTimeout(resize, 60);
    return () => {
      window.removeEventListener('resize', resize);
      window.clearTimeout(t);
    };
  }, [analysis, sourceFlow, sourceLine, suspectLine, weatherXAxis]);

  useEffect(
    () => () => {
      weatherChartInst.current?.dispose();
      sourceChartInst.current?.dispose();
      weatherChartInst.current = null;
      sourceChartInst.current = null;
    },
    [],
  );

  if (!analysis) {
    return <Empty description="当前断面未配置受纳水体与排口关联，无法生成溯源分析。" />;
  }

  return (
    <div className="zht-section-trace-v2">
      <div className="zht-section-trace-v2__left">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message="本页怎么读（原型示意，非测绘与执法结论）"
            action={
              <a onClick={() => setGuideExpanded(v => !v)}>{guideExpanded ? '收起' : '展开'}</a>
            }
            description={
              <div className="zht-section-trace-guide">
                <p>
                  基于<strong>断面监测报警</strong>，按受纳水体上游排口逐条筛查；左侧看对象分析，右侧看地图联动。
                </p>
                {guideExpanded ? (
                  <ul>
                    <li>对象切换后，责任主体、参数匹配、研判结论同步变化。</li>
                    <li>右侧地图高亮当前怀疑对象至断面监测点的链路。</li>
                  </ul>
                ) : null}
              </div>
            }
          />
          <div className="zht-section-trace-v2__window">
            <Text type="secondary">分析时间窗</Text>
            <RangePicker
              showTime
              value={windowRange}
              onChange={value => {
                if (!value) return;
                setWindowRange(value as [Dayjs, Dayjs]);
              }}
              format="YYYY-MM-DD HH:mm"
            />
          </div>
          <Descriptions title="事件信息（末端）" size="small" bordered column={2}>
            <Descriptions.Item label="事件编号">{analysis.traceId}</Descriptions.Item>
            <Descriptions.Item label="关联断面">{analysis.stationName}</Descriptions.Item>
            <Descriptions.Item label="告警参数">{analysis.metricLabel}</Descriptions.Item>
            <Descriptions.Item label="受纳水体">{analysis.waterBodyName}</Descriptions.Item>
            <Descriptions.Item label="当前流速">{analysis.flowSpeedNow} m/s</Descriptions.Item>
            <Descriptions.Item label="污染分级">
              <Tag color={analysis.pollutionLevel === '重度' ? 'error' : analysis.pollutionLevel === '中度' ? 'warning' : 'success'}>
                {analysis.pollutionLevel}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
          {rows.length > 1 ? (
            <Segmented
              block
              value={selectedSource?.outletCode}
              onChange={v => setSelectedOutletCode(String(v))}
              options={rows.map((row, i) => ({
                label: `怀疑对象${String.fromCharCode(65 + i)}`,
                value: row.outletCode,
              }))}
            />
          ) : null}
          {selectedSource ? (
            <Descriptions size="small" bordered column={2}>
              <Descriptions.Item label="怀疑对象" span={2}>
                {selectedSource.outletName}
              </Descriptions.Item>
              <Descriptions.Item label="责任主体" span={2}>
                {selectedSource.partyName}
              </Descriptions.Item>
              <Descriptions.Item label="匹配参数">{selectedSource.matchMetric}</Descriptions.Item>
              <Descriptions.Item label="置信度">{selectedSource.score}%</Descriptions.Item>
              <Descriptions.Item label="分析研判" span={2}>
                {selectedSource.reason}
              </Descriptions.Item>
            </Descriptions>
          ) : null}
          <section className="zht-section-trace-card">
            <div className="zht-section-trace-card__title">天气情况</div>
            <div className="zht-section-trace-card__desc">
              近48小时水温与降雨量过程（雨量站：{analysis.rainfallStationName}）。
            </div>
            <div ref={weatherChartRef} className="zht-section-trace-chart" />
          </section>
          <section className="zht-section-trace-card">
            <div className="zht-section-trace-card__title">水体溯源（对象联动）</div>
            <div className="zht-section-trace-card__desc">
              当前对象：{selectedSource?.outletName ?? '—'}，流向 {analysis.flowDirection}。
            </div>
            <div ref={sourceChartRef} className="zht-section-trace-chart" />
          </section>
          <div>
            <Text strong>对象链路时间轴（上游排口 → 断面监测点）</Text>
            <Timeline
              style={{ marginTop: 10 }}
              items={[
                {
                  color: 'orange',
                  children: (
                    <div>
                      <div>
                        <Text strong>{selectedSource?.outletName ?? '上游排口'}</Text>
                        <Tag style={{ marginLeft: 8 }}>发生时间：{selectedSource?.occurredAt ?? '—'}</Tag>
                      </div>
                      <Tag color="warning">{selectedSource?.matchMetric ?? analysis.metricLabel}</Tag>
                    </div>
                  ),
                },
                {
                  color: 'blue',
                  children: (
                    <div>
                      <div>
                        <Text strong>{analysis.stationName}</Text>
                        <Tag style={{ marginLeft: 8 }}>发生时间：{analysis.alarmOccurredAt}</Tag>
                      </div>
                      <div>
                        <Tag color="error">告警参数：{analysis.metricLabel}</Tag>
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          </div>
          <section className="zht-section-trace-card">
            <div className="zht-section-trace-card__title">溯源分析结果</div>
            <div className="zht-section-trace-lines">
              {analysis.resultLines.map((line, idx) => (
                <div key={line}>
                  <Text>{`${idx + 1}、${line}`}</Text>
                </div>
              ))}
            </div>
          </section>
        </Space>
      </div>
      <div className="zht-section-trace-v2__right">
        <Text strong>二、溯源示意地图（对象切换联动）</Text>
        <div className="zht-section-trace-v2__map-stage">
          <ZhtSectionTraceMap analysis={analysis} selectedOutletCode={selectedSource?.outletCode ?? null} />
          <div className="zht-section-trace-v2__legend">
            <span><i className="zht-section-trace-dot zht-section-trace-dot--monitor" /> 蓝点：断面监测点</span>
            <span><i className="zht-section-trace-dot zht-section-trace-dot--outlet" /> 绿点：上游排口</span>
            <span><i className="zht-section-trace-dot zht-section-trace-dot--selected" /> 橙线：当前怀疑对象链路</span>
          </div>
        </div>
      </div>
    </div>
  );
};
