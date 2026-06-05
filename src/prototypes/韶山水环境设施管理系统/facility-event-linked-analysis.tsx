import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  DatePicker,
  Descriptions,
  Empty,
  Modal,
  Segmented,
  Space,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import * as echarts from 'echarts';
import { buildEventLinkedAnalysisDemo, buildUpdatedAnalysisByWindow } from './facility-event-linked-analysis-data';
import { FacilityEventRadiusLinkagePanel } from './facility-event-radius-linkage-panel';
import { FacilitySewerTraceMap } from './facility-sewer-trace-map';

const { RangePicker } = DatePicker;
const { Text } = Typography;

/** 多链路 Segmented 短标签，避免长排水户名横向挤占；完整名称在下方链路信息区展示 */
function labelTraceChainSegment(index: number): string {
  if (index >= 0 && index < 26) {
    return `溯源路径${String.fromCharCode(65 + index)}`;
  }
  return `溯源路径${index + 1}`;
}

type LinkedAnalysisRecord = {
  id: string;
  事件类型: string;
  事件等级?: string;
  发生时间: string;
  状态: string;
  污水厂编码?: string;
  污水厂名称?: string;
  告警指标?: string;
};

const SEWER_TRACE_DEMO_RECORD: LinkedAnalysisRecord = {
  id: 'WWTP202504070002-EVT-20260427103000-01',
  事件类型: '水质超标',
  事件等级: '二级',
  发生时间: '2026-04-27 10:30:00',
  状态: '待处置',
  污水厂编码: 'WWTP202504070002',
  污水厂名称: '清溪片区污水处理厂',
  告警指标: 'COD',
};

export const FacilityEventLinkedAnalysisModal: React.FC<{
  record: LinkedAnalysisRecord | null;
  onClose: () => void;
  /** 水质类：全屏管网溯源；其余类型：居中弹窗展示设备与纳管关联研判 */
  variant?: 'sewer-trace' | 'event-linked';
  /** 事件联动分析：子表行点击打开台账详情（与列表「详情」同源入口） */
  onOpenFacilityDetail?: (title: string, content: React.ReactNode, modalWidth?: number | string) => void;
}> = ({ record, onClose, variant = 'sewer-trace', onOpenFacilityDetail }) => {
  const isSewerTraceVariant = variant === 'sewer-trace';
  // 原型演示口径：溯源分析弹窗统一展示固定示例，避免因事件切换导致阅读口径变化
  const activeRecord = useMemo(
    () => (record ? (isSewerTraceVariant ? SEWER_TRACE_DEMO_RECORD : record) : null),
    [isSewerTraceVariant, record],
  );
  const traceMonitorChartRef = useRef<HTMLDivElement>(null);
  const traceMonitorChartInst = useRef<echarts.ECharts | null>(null);
  const facilityCode = String(activeRecord?.污水厂编码 || '');
  const facilityName = String(activeRecord?.污水厂名称 || '—');

  const baseInput = useMemo(
    () => ({
      scene: 'plant' as const,
      eventId: String(activeRecord?.id || ''),
      facilityCode,
      facilityName,
      eventType: String(activeRecord?.事件类型 || ''),
      eventTime: String(activeRecord?.发生时间 || ''),
      告警指标: activeRecord?.告警指标,
    }),
    [activeRecord?.id, activeRecord?.事件类型, activeRecord?.发生时间, activeRecord?.告警指标, facilityCode, facilityName],
  );

  const initialData = useMemo(() => {
    if (!activeRecord || variant !== 'sewer-trace') return null;
    return buildEventLinkedAnalysisDemo(baseInput);
  }, [activeRecord, baseInput, variant]);
  const [analysis, setAnalysis] = useState(initialData);
  const [traceGuideExpanded, setTraceGuideExpanded] = useState(false);
  /** 管网溯源：一户一分支链路切换 */
  const [traceChainIdx, setTraceChainIdx] = useState(0);

  useEffect(() => {
    setAnalysis(initialData);
  }, [initialData]);

  useEffect(() => {
    if (activeRecord?.id) setTraceGuideExpanded(false);
  }, [activeRecord?.id]);

  useEffect(() => {
    setTraceChainIdx(0);
  }, [activeRecord?.id, analysis?.windowStart?.valueOf(), analysis?.windowEnd?.valueOf()]);

  useEffect(() => {
    const ch = analysis?.sewerTrace?.chains;
    if (!ch?.length) return;
    setTraceChainIdx(i => Math.min(i, ch.length - 1));
  }, [analysis?.sewerTrace?.chains]);

  // 关闭弹窗时释放溯源对比图实例，避免再次打开时跳过 init、白屏
  useEffect(() => {
    if (record == null) {
      traceMonitorChartInst.current?.dispose();
      traceMonitorChartInst.current = null;
    }
  }, [record]);

  useEffect(
    () => () => {
      traceMonitorChartInst.current?.dispose();
      traceMonitorChartInst.current = null;
    },
    [],
  );

  const handleWindowChange = (value: null | [Dayjs, Dayjs]) => {
    if (!value || !activeRecord) return;
    setAnalysis(buildUpdatedAnalysisByWindow(baseInput, value[0], value[1]));
  };

  const st = analysis?.sewerTrace;
  const traceChainCount = st?.chains.length ?? 0;
  const traceSafeIdx = traceChainCount ? Math.min(traceChainIdx, traceChainCount - 1) : 0;
  const traceCurChain = st?.chains[traceSafeIdx];

  /** 有沿线监测点：三线；无沿线监测点：排水户与污水厂两线（与地图两点一线一致） */
  const traceCompareSeries = useMemo(() => {
    if (!analysis || !traceCurChain) return null;
    const metric = st?.alarmMetric ?? 'COD';
    const field: 'COD' | 'NH3N' | 'TP' | 'TN' =
      metric === 'NH3-N' ? 'NH3N' : metric === 'TP' ? 'TP' : metric === 'TN' ? 'TN' : 'COD';
    const monitor = traceCurChain.monitorSeries ?? [];
    const seed = (traceCurChain.score ?? 60) % 9;
    const dischargerName = traceCurChain.dischargerName ?? '排水户';
    const plantName = facilityName || '污水厂';

    if (monitor.length > 0) {
      const x = monitor.map(v => v.time);
      const mid = monitor.map(v => Number(v[field]));
      const discharger = mid.map((v, i) =>
        Number((v + 0.25 + (seed % 4) * 0.08 + (i >= 5 && i <= 7 ? 0.35 : 0)).toFixed(2)),
      );
      const plant = analysis.series
        .slice(-mid.length)
        .map(v => Number((Number(v[field]) + 0.12).toFixed(2)));
      return {
        mode: 'three' as const,
        metric,
        x,
        discharger,
        mid,
        plant,
        dischargerName,
        // 图例与 Timeline 文案统一为「沿线水质监测点」（不按管点编号拆多条图例）
        monitorName: '沿线水质监测点',
        plantName,
      };
    }

    // 无中间监测点：用进水过程序列做时间轴，演示排水户 vs 污水厂同参数对比
    const src = analysis.series;
    if (!src.length) return null;
    const x = src.map(v => v.time);
    const plant = src.map(v => Number((Number(v[field]) + 0.08).toFixed(2)));
    const discharger = plant.map((v, i) =>
      Number((v + 0.18 + (seed % 4) * 0.06 + (i >= 5 && i <= 7 ? 0.28 : 0)).toFixed(2)),
    );
    return {
      mode: 'two' as const,
      metric,
      x,
      discharger,
      plant,
      dischargerName,
      plantName,
    };
  }, [analysis, facilityName, st?.alarmMetric, traceCurChain]);

  useEffect(() => {
    if (!traceMonitorChartRef.current) return;
    if (!traceCompareSeries) return;
    const dom = traceMonitorChartRef.current;
    const prev = traceMonitorChartInst.current;
    if (prev) {
      try {
        if (prev.getDom() !== dom) {
          prev.dispose();
          traceMonitorChartInst.current = null;
        }
      } catch {
        traceMonitorChartInst.current = null;
      }
    }
    if (!traceMonitorChartInst.current) {
      traceMonitorChartInst.current = echarts.init(dom);
    }
    const baseOpt = {
      grid: { left: 36, right: 12, top: 26, bottom: 34 },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category' as const, data: traceCompareSeries.x, axisLabel: { interval: 1, rotate: 30 } },
      yAxis: [{ type: 'value' as const, name: traceCompareSeries.metric }],
    };
    const mergeOpt = { notMerge: true } as const;
    if (traceCompareSeries.mode === 'three') {
      traceMonitorChartInst.current.setOption(
        {
          ...baseOpt,
          legend: {
            top: 0,
            data: [traceCompareSeries.dischargerName, traceCompareSeries.monitorName, traceCompareSeries.plantName],
          },
          series: [
            { name: traceCompareSeries.dischargerName, type: 'line', smooth: true, data: traceCompareSeries.discharger },
            { name: traceCompareSeries.monitorName, type: 'line', smooth: true, data: traceCompareSeries.mid },
            { name: traceCompareSeries.plantName, type: 'line', smooth: true, data: traceCompareSeries.plant },
          ],
        },
        mergeOpt,
      );
    } else {
      traceMonitorChartInst.current.setOption(
        {
          ...baseOpt,
          legend: { top: 0, data: [traceCompareSeries.dischargerName, traceCompareSeries.plantName] },
          series: [
            { name: traceCompareSeries.dischargerName, type: 'line', smooth: true, data: traceCompareSeries.discharger },
            { name: traceCompareSeries.plantName, type: 'line', smooth: true, data: traceCompareSeries.plant },
          ],
        },
        mergeOpt,
      );
    }
    const resize = () => traceMonitorChartInst.current?.resize();
    window.addEventListener('resize', resize);
    const t = window.setTimeout(() => traceMonitorChartInst.current?.resize(), 120);
    return () => {
      window.removeEventListener('resize', resize);
      window.clearTimeout(t);
    };
  }, [traceCompareSeries]);

  return (
    <Modal
      title={
        activeRecord
          ? isSewerTraceVariant
            ? `溯源分析 — ${activeRecord.id}`
            : `事件联动分析 — ${activeRecord.id}`
          : isSewerTraceVariant
            ? '溯源分析'
            : '事件联动分析'
      }
      open={record !== null}
      onCancel={onClose}
      className={
        isSewerTraceVariant ? 'facility-linked-analysis-modal-fullscreen' : 'facility-linked-analysis-modal-radius'
      }
      width={isSewerTraceVariant ? '100vw' : 1180}
      style={isSewerTraceVariant ? { top: 0, paddingBottom: 0 } : { top: 48 }}
      footer={null}
      styles={{
        body: isSewerTraceVariant
          ? { height: 'calc(100vh - 132px)', overflow: 'hidden' }
          : {
              /* 与设施管理新增/编辑弹窗一致：内容区纵向滚动、横向不溢出 */
              maxHeight: 'calc(100vh - 240px)',
              overflowY: 'auto',
              overflowX: 'hidden',
              minWidth: 0,
            },
      }}
    >
      {activeRecord && (isSewerTraceVariant ? analysis : true) ? (
        <div className="facility-linked-analysis">
          {!isSewerTraceVariant ? (
            <FacilityEventRadiusLinkagePanel
              plantCode={facilityCode}
              plantName={facilityName}
              eventId={activeRecord.id}
              onOpenDetail={onOpenFacilityDetail}
            />
          ) : st ? (
                  <div className="facility-linked-analysis-trace-layout">
                    <div className="facility-linked-analysis-trace-left">
                      <Space className="facility-linked-analysis-trace-left-space" direction="vertical" size={12} style={{ width: '100%' }}>
                        <Alert
                          type="info"
                          showIcon
                          message="本页怎么读（原型示意，非测绘与执法结论）"
                          action={
                            <Button type="link" size="small" onClick={() => setTraceGuideExpanded(v => !v)}>
                              {traceGuideExpanded ? '收起' : '展开'}
                            </Button>
                          }
                          description={
                            <div className="facility-linked-analysis-trace-guide">
                              <p className="facility-linked-analysis-trace-guide-lead">
                                重点排水户通过<strong>接驳点</strong>纳管入网，污水厂结合<strong>时间维 + 空间维</strong>逐条排查可疑主体；左侧看链路信息，右侧看联动地图。
                              </p>
                              {traceGuideExpanded ? (
                                <ul>
                                  <li>
                                    <strong>链路信息：</strong>切换分支后，怀疑对象、评分、超标时间、监测吻合随之更新。
                                  </li>
                                  <li>
                                    <strong>地图联动：</strong>右侧地图同步高亮同一条链路，可点污水厂/排水户/监测点看提示板。
                                  </li>
                                </ul>
                              ) : null}
                            </div>
                          }
                        />
                        <div className="facility-linked-analysis-trace-window-row">
                          <Text type="secondary">分析时间窗</Text>
                          <RangePicker
                            showTime
                            value={[analysis.windowStart, analysis.windowEnd]}
                            onChange={value => handleWindowChange(value as [Dayjs, Dayjs] | null)}
                            format="YYYY-MM-DD HH:mm"
                          />
                        </div>
                        <Descriptions title="事件信息（末端）" size="small" bordered column={2}>
                          <Descriptions.Item label="事件编号">{activeRecord.id}</Descriptions.Item>
                          <Descriptions.Item label="关联设施">{`${facilityName}（${facilityCode}）`}</Descriptions.Item>
                          <Descriptions.Item label="事件类型">{activeRecord.事件类型}</Descriptions.Item>
                          <Descriptions.Item label="告警指标">{st?.alarmMetric ?? activeRecord.告警指标 ?? '—'}</Descriptions.Item>
                          <Descriptions.Item label="发生时间">{activeRecord.发生时间}</Descriptions.Item>
                          <Descriptions.Item label="事件状态">{activeRecord.状态}</Descriptions.Item>
                          <Descriptions.Item label="分析口径" span={2}>
                            演示推断（非执法结论）；重点排水户经<strong>接驳点纳管</strong>接入市政管网，结合<strong>时间</strong>与<strong>空间</strong>进行溯源排查。
                          </Descriptions.Item>
                        </Descriptions>
                        <div>
                          <Space direction="vertical" size={12} style={{ width: '100%' }}>
                            <Space size={6} align="center">
                              <Text strong>溯源链路分析</Text>
                              <Tooltip title="污水厂相对上游多户重点排水户为一对多：每户经接驳点一条分支管线汇入主通道。请逐条切换链路对照过程数据；右侧地图与本段保持联动一致。">
                                <QuestionCircleOutlined style={{ color: 'rgba(0, 0, 0, 0.45)', cursor: 'help' }} />
                              </Tooltip>
                            </Space>
                            {st.chains.length > 1 ? (
                              <Segmented
                                style={{ width: '100%' }}
                                value={String(traceSafeIdx)}
                                onChange={v => setTraceChainIdx(Number(v))}
                                options={st.chains.map((_, i) => ({
                                  label: labelTraceChainSegment(i),
                                  value: String(i),
                                }))}
                              />
                            ) : null}
                          </Space>
                          {traceCurChain ? (
                            <Descriptions size="small" bordered column={2} style={{ marginTop: 12 }}>
                              <Descriptions.Item label="本链怀疑对象" span={2}>
                                {traceCurChain.dischargerName}
                              </Descriptions.Item>
                              <Descriptions.Item label="超标 / 异常峰值时间（演示）" span={2}>
                                <Tag color="warning">{traceCurChain.popupDischarger.exceedOccurredAt ?? '—'}</Tag>
                              </Descriptions.Item>
                              <Descriptions.Item label="排污主要成分" span={2}>
                                {traceCurChain.pollutantMain}
                              </Descriptions.Item>
                              <Descriptions.Item label="第一类污染物">{traceCurChain.pollutantClass1}</Descriptions.Item>
                              <Descriptions.Item label="第二类污染物">{traceCurChain.pollutantClass2}</Descriptions.Item>
                              <Descriptions.Item label="关注参数" span={2}>
                                {traceCurChain.popupDischarger.exceedMetrics ?? '—'}
                              </Descriptions.Item>
                              <Descriptions.Item label="分析研判" span={2}>
                                {traceCurChain.alarmImpactNote}
                              </Descriptions.Item>
                            </Descriptions>
                          ) : null}
                          {traceCompareSeries ? (
                            <div style={{ marginTop: 12 }}>
                              <Text strong>
                                {traceCompareSeries.mode === 'three'
                                  ? '同类型报警参数时间对比（排水户 → 沿线水质监测点 → 污水厂）'
                                  : '同类型报警参数时间对比（排水户 → 污水厂）'}
                              </Text>
                              <div ref={traceMonitorChartRef} className="facility-linked-analysis-chart" />
                            </div>
                          ) : (
                            <Empty style={{ marginTop: 12 }} description="当前分析时间窗内暂无过程曲线数据（演示）" />
                          )}
                          <div style={{ marginTop: 12 }}>
                            <Text strong>链路时间轴（排水户监测点 → 沿线水质监测点 → 污水厂）</Text>
                            <Timeline
                              style={{ marginTop: 10 }}
                              items={[
                                {
                                  color: 'blue',
                                  children: (
                                    <div>
                                      <div>
                                        <Text strong>{traceCurChain?.dischargerName ?? '排水户'}</Text>
                                        <Tag style={{ marginLeft: 8 }}>发生时间：{activeRecord.发生时间}</Tag>
                                      </div>
                                      <Space size={8} wrap style={{ marginTop: 6 }}>
                                        <Tag color="error">告警指标：{st.alarmMetric}</Tag>
                                      </Space>
                                    </div>
                                  ),
                                },
                                ...(() => {
                                  const midSteps = (traceCurChain?.pathSteps ?? []).filter(
                                    step => step.isMonitor && step.nodeId !== traceCurChain?.jbdId,
                                  );
                                  // 业务口径：中间监测点可有可无；无则不渲染第三个点
                                  if (!midSteps.length) return [];
                                  return midSteps.map(step => ({
                                    color: step.monitorMatch ? 'green' : 'gray',
                                    children: (
                                      <div>
                                        <div>
                                          <Text strong>沿线水质监测点</Text>
                                          <Tag style={{ marginLeft: 8 }}>发生时间：{activeRecord.发生时间}</Tag>
                                        </div>
                                        <Space size={8} wrap style={{ marginTop: 6 }}>
                                          <Tag color="error">告警指标：{st.alarmMetric}</Tag>
                                          <Tag color={step.monitorMatch ? 'success' : 'default'}>
                                            {step.monitorMatch ? '监测与告警指标吻合（演示）' : '监测未见吻合（演示）'}
                                          </Tag>
                                        </Space>
                                      </div>
                                    ),
                                  }));
                                })(),
                                {
                                  color: 'blue',
                                  children: (
                                    <div>
                                      <div>
                                        <Text strong>{facilityName}</Text>
                                        <Tag style={{ marginLeft: 8 }}>发生时间：{activeRecord.发生时间}</Tag>
                                      </div>
                                      <Space size={8} wrap style={{ marginTop: 6 }}>
                                        <Tag color="error">告警指标：{st.alarmMetric}</Tag>
                                      </Space>
                                    </div>
                                  ),
                                },
                              ]}
                            />
                          </div>
                        </div>
                      </Space>
                    </div>
                    <div className="facility-linked-analysis-trace-right">
                      <Text strong>二、溯源示意地图（链路切换联动）</Text>
                      {st.map.chainLines.some(c => c.coordinates.length >= 2) ? (
                        <div className="facility-linked-analysis-trace-map-stage">
                          <FacilitySewerTraceMap
                            key={`${analysis.windowStart.valueOf()}-${analysis.windowEnd.valueOf()}`}
                            pack={st.map}
                            selectedChainId={traceCurChain?.chainId}
                            autoOpenMarkerId={traceCurChain ? `disc-${traceCurChain.dischargerId}` : null}
                            mapAriaLabel="纳管多链路、污水厂与怀疑排水户 POI，点击查看提示板"
                          />
                          <div
                            className="facility-linked-analysis-trace-map-legend facility-linked-analysis-trace-map-legend--overlay"
                            aria-label="地图图例说明"
                          >
                            <span className="facility-linked-analysis-trace-legend-item">
                              <i className="facility-linked-analysis-trace-dot facility-linked-analysis-trace-dot-plant" />
                              紫点：污水厂 POI
                            </span>
                            <span className="facility-linked-analysis-trace-legend-item">
                              <i className="facility-linked-analysis-trace-dot facility-linked-analysis-trace-dot-dis" />
                              橙色：上游排水户
                            </span>
                            <span className="facility-linked-analysis-trace-legend-item">
                              <i className="facility-linked-analysis-trace-dot facility-linked-analysis-trace-dot-mon" />
                              绿点：沿线水质监测点
                            </span>
                          </div>
                        </div>
                      ) : (
                        <Empty style={{ marginTop: 8 }} description="路径坐标不足，无法绘制示意地图" />
                      )}
                    </div>
                  </div>
          ) : (
            <Empty description="当前污水厂未配置进水接驳管点映射（演示）" />
          )}
        </div>
      ) : null}
    </Modal>
  );
};
