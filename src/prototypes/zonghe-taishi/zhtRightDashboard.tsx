/**
 * 综合态势 · 右侧分析看板（断面达标、汛期污染强度、排口报警日历）
 * 布局见 `style.css`：断面/污染两卡均分余高；报警日历为内容高度、年月左图例右；污染表列宽由 `--zht-pollution-cols` 控制。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { Segmented, Tooltip } from 'antd';
import * as echarts from 'echarts';
import { buildAlarmDemoRecords } from './zhtAlarmRailDemoData';

/** 断面达标：年=环形图；月=最近12个月堆叠柱；日=各断面全年按天汇总表（演示数据） */
export type CompliancePeriod = 'year' | 'month' | 'day';
type CalendarDayClickHandler = (date: string) => void;

function calcFloodSeasonPollutionIntensity(primaryConc: number, targetLimit: number): string {
  if (!Number.isFinite(primaryConc) || !Number.isFinite(targetLimit) || targetLimit <= 0) return '—';
  return (primaryConc / targetLimit).toFixed(2);
}

const POLLUTION_ROWS = [
  {
    key: '1',
    sectionName: '韶河入库断面监测点',
    pollutant: '氨氮',
    primaryConcentration: 1.05,
    targetLimit: 0.5,
    intensity: calcFloodSeasonPollutionIntensity(1.05, 0.5),
    time: '2026-03-20 14:30:00',
    unifiedId: 'zht-mon-mon-2',
    lng: 112.518,
    lat: 27.912,
  },
  {
    key: '2',
    sectionName: '清溪河控制断面监测点',
    pollutant: '总磷',
    primaryConcentration: 0.34,
    targetLimit: 0.2,
    intensity: calcFloodSeasonPollutionIntensity(0.34, 0.2),
    time: '2026-03-21 09:10:00',
    unifiedId: 'zht-mon-mon-1',
    lng: 112.534,
    lat: 27.919,
  },
  {
    key: '3',
    sectionName: '园区下游考核断面监测点',
    pollutant: 'COD',
    primaryConcentration: 26,
    targetLimit: 20,
    intensity: calcFloodSeasonPollutionIntensity(26, 20),
    time: '2026-03-22 10:15:00',
    unifiedId: 'zht-mon-mon-3',
    lng: 112.542,
    lat: 27.908,
  },
];

const POLLUTION_INTENSITY_FORMULA = '污染强度 = 首要污染物实测浓度 ÷ 断面目标限值';

type CalendarAlarmMeta = {
  year: number;
  monthIndex: number;
  alarmDaySet: Set<number>;
};

/** 年视图：环形图 + 中心达标率 */
const COMPLIANCE_YEAR = {
  rateLabel: '90.2%',
  hint: '按年汇总断面评价（演示）',
  pie: [
    { name: 'I-II类', value: 12, itemStyle: { color: '#1677ff' } },
    { name: 'III类', value: 45, itemStyle: { color: '#52c41a' } },
    { name: 'IV类', value: 18, itemStyle: { color: '#fadb14' } },
    { name: 'V类', value: 6, itemStyle: { color: '#fa8c16' } },
    { name: '劣V类', value: 4, itemStyle: { color: '#ff4d4f' } },
  ],
};

/** 月视图：最近 12 个月（横轴月为滚动序号，演示与图1一致 7→6） */
const COMPLIANCE_MONTH_LABELS = ['7', '8', '9', '10', '11', '12', '1', '2', '3', '4', '5', '6'];
const COMPLIANCE_MONTH_IV = [4, 4, 5, 5, 4, 4, 5, 5, 4, 4, 5, 5];
const COMPLIANCE_MONTH_III = [8, 7, 7, 8, 8, 7, 7, 8, 8, 7, 7, 8];
const COMPLIANCE_MONTH_II = [9, 9, 7, 6, 9, 10, 9, 7, 7, 9, 8, 9];
const COMPLIANCE_MONTH_V = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const COMPLIANCE_MONTH_BAD = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const COMPLIANCE_MONTH_HINT = '最近12个月断面达标构成（演示）';

/** 日视图：各断面全年（365 天）按类天数 + 达标率（演示） */
const COMPLIANCE_DAY_STAT_YEAR = 2025;
const COMPLIANCE_DAY_ROWS: {
  key: string;
  sectionName: string;
  goodIii: string;
  iv: string;
  v: string;
  bad: string;
  rate: string;
}[] = [
  { key: '1', sectionName: '清溪河控制断面', goodIii: '137天', iv: '9天', v: '0天', bad: '0天', rate: '93.84%' },
  { key: '2', sectionName: '韶河入河口', goodIii: '140天', iv: '6天', v: '0天', bad: '0天', rate: '95.89%' },
  { key: '3', sectionName: '高新区排渠下游', goodIii: '132天', iv: '14天', v: '0天', bad: '0天', rate: '90.41%' },
  { key: '4', sectionName: '工业园下游断面', goodIii: '128天', iv: '18天', v: '1天', bad: '0天', rate: '87.12%' },
  { key: '5', sectionName: '饮用水源取水口', goodIii: '146天', iv: '2天', v: '0天', bad: '0天', rate: '98.63%' },
];
const COMPLIANCE_DAY_HINT = `各断面全年逐日评价汇总（演示 · 统计年度 ${COMPLIANCE_DAY_STAT_YEAR} 年）`;

const COMPLIANCE_HINT: Record<CompliancePeriod, string> = {
  year: COMPLIANCE_YEAR.hint,
  month: COMPLIANCE_MONTH_HINT,
  day: COMPLIANCE_DAY_HINT,
};

function buildYearPieOption() {
  const { rateLabel, pie } = COMPLIANCE_YEAR;
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: {
      orient: 'vertical',
      right: 2,
      top: 'middle',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { fontSize: 11, color: '#555' },
    },
    series: [
      {
        name: '水质类别',
        type: 'pie',
        radius: ['46%', '72%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        emphasis: { scale: false, disabled: true },
        data: pie,
      },
    ],
    graphic: [
      {
        type: 'text',
        left: '34%',
        top: '42%',
        z: 10,
        style: {
          text: '达标率',
          fill: '#666',
          fontSize: 12,
          fontWeight: 500,
          textAlign: 'center',
        },
      },
      {
        type: 'text',
        left: '34%',
        top: '52%',
        z: 10,
        style: {
          text: rateLabel,
          fill: '#1e5bb5',
          fontSize: 22,
          fontWeight: 700,
          textAlign: 'center',
        },
      },
    ],
  };
}

function buildMonthStackBarOption() {
  const totals = COMPLIANCE_MONTH_LABELS.map((_, i) =>
    COMPLIANCE_MONTH_IV[i] +
      COMPLIANCE_MONTH_III[i] +
      COMPLIANCE_MONTH_II[i] +
      COMPLIANCE_MONTH_V[i] +
      COMPLIANCE_MONTH_BAD[i],
  );
  const stackLabel = (idx: number) => String(totals[idx]);

  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: {
      orient: 'horizontal',
      top: 4,
      left: 'center',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { fontSize: 11, color: '#555' },
      data: ['I-II类', 'III类', 'IV类', 'V类', '劣V类'],
    },
    grid: { left: 36, right: 10, top: 40, bottom: 28, containLabel: false },
    xAxis: {
      type: 'category',
      data: COMPLIANCE_MONTH_LABELS,
      axisLabel: { fontSize: 11, color: '#666' },
      axisTick: { alignWithLabel: true },
    },
    yAxis: {
      type: 'value',
      max: 25,
      interval: 5,
      axisLabel: { fontSize: 11, color: '#666' },
      splitLine: { lineStyle: { type: 'dashed', color: '#eee' } },
    },
    series: [
      {
        name: 'IV类',
        type: 'bar',
        stack: 'water',
        barMaxWidth: 22,
        data: COMPLIANCE_MONTH_IV,
        itemStyle: { color: '#fadb14' },
      },
      {
        name: 'III类',
        type: 'bar',
        stack: 'water',
        barMaxWidth: 22,
        data: COMPLIANCE_MONTH_III,
        itemStyle: { color: '#52c41a' },
      },
      {
        name: 'I-II类',
        type: 'bar',
        stack: 'water',
        barMaxWidth: 22,
        data: COMPLIANCE_MONTH_II,
        itemStyle: { color: '#1677ff' },
        label: {
          show: true,
          position: 'top',
          color: '#333',
          fontSize: 11,
          fontWeight: 600,
          formatter: (p: { dataIndex?: number }) => stackLabel(p.dataIndex ?? 0),
        },
      },
      {
        name: 'V类',
        type: 'bar',
        stack: 'water',
        barMaxWidth: 22,
        data: COMPLIANCE_MONTH_V,
        itemStyle: { color: '#fa8c16' },
      },
      {
        name: '劣V类',
        type: 'bar',
        stack: 'water',
        barMaxWidth: 22,
        data: COMPLIANCE_MONTH_BAD,
        itemStyle: { color: '#ff4d4f' },
      },
    ],
  };
}

function buildCalendarGrid(year: number, monthIndex: number): { blanks: number; daysInMonth: number } {
  const first = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  return { blanks: first === 0 ? 6 : first - 1, daysInMonth };
}

function formatCalendarDate(year: number, monthIndex: number, day: number): string {
  const month = String(monthIndex + 1).padStart(2, '0');
  const dayText = String(day).padStart(2, '0');
  return `${year}-${month}-${dayText}`;
}

function buildCalendarAlarmMetaFromDemo(): CalendarAlarmMeta {
  const records = buildAlarmDemoRecords('realtime');
  if (records.length === 0) {
    return { year: 2026, monthIndex: 2, alarmDaySet: new Set<number>() };
  }
  const first = new Date(records[0].currentAlarmTime.replace(' ', 'T'));
  const year = Number.isNaN(first.getTime()) ? 2026 : first.getFullYear();
  const monthIndex = Number.isNaN(first.getTime()) ? 2 : first.getMonth();
  const alarmDaySet = new Set<number>();

  records.forEach(row => {
    const dt = new Date(String(row.currentAlarmTime).replace(' ', 'T'));
    if (Number.isNaN(dt.getTime())) return;
    if (dt.getFullYear() !== year || dt.getMonth() !== monthIndex) return;
    alarmDaySet.add(dt.getDate());
  });
  return { year, monthIndex, alarmDaySet };
}

/** 日视图：断面全年统计表（演示） */
function ComplianceDayStatTable() {
  return (
    <div className="zht-compliance-day-wrap" role="region" aria-label="断面全年逐日评价汇总">
      <div className="zht-compliance-day-table-scroll">
        <table className="zht-compliance-day-table">
          <thead>
            <tr>
              <th scope="col">断面名称</th>
              <th scope="col">优III类</th>
              <th scope="col">IV类</th>
              <th scope="col">V类</th>
              <th scope="col">劣V类</th>
              <th scope="col">达标率</th>
            </tr>
          </thead>
          <tbody>
            {COMPLIANCE_DAY_ROWS.map((r, i) => (
              <tr key={r.key} className={i % 2 === 1 ? 'zht-compliance-day-table__row--alt' : undefined}>
                <td className="zht-compliance-day-table__name">{r.sectionName}</td>
                <td className="zht-compliance-day-table__cell zht-compliance-day-table__cell--good">{r.goodIii}</td>
                <td className="zht-compliance-day-table__cell zht-compliance-day-table__cell--iv">{r.iv}</td>
                <td className="zht-compliance-day-table__cell zht-compliance-day-table__cell--v">{r.v}</td>
                <td className="zht-compliance-day-table__cell zht-compliance-day-table__cell--bad">{r.bad}</td>
                <td className="zht-compliance-day-table__cell zht-compliance-day-table__cell--rate">{r.rate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** 汛期污染表：单元格最多两行省略，悬停展示全文 */
function PollutionTextCell({ text }: { text: string }) {
  const t = text ?? '';
  return (
    <Tooltip title={t || undefined} placement="topLeft" mouseEnterDelay={0.25}>
      <div className="zht-pollution-cell-2l">{t || '—'}</div>
    </Tooltip>
  );
}

type PollutionRow = (typeof POLLUTION_ROWS)[number];
export type PollutionRowLocatePayload = Pick<PollutionRow, 'key' | 'sectionName' | 'unifiedId' | 'lng' | 'lat'>;

/** 双份数据垂直无缝循环滚动；悬停视区暂停便于阅读 */
function PollutionScrollBody({
  rows,
  activeRowKey,
  onRowClick,
}: {
  rows: PollutionRow[];
  activeRowKey: string | null;
  onRowClick?: (row: PollutionRowLocatePayload) => void;
}) {
  const loop = useMemo(() => [...rows, ...rows], [rows]);
  const durationSec = Math.max(14, rows.length * 4.5);

  return (
    <div className="zht-pollution-scroll-viewport" role="list" aria-label="汛期污染强度数据循环滚动">
      <div
        className="zht-pollution-scroll-track"
        style={{ '--zht-marquee-dur': `${durationSec}s` } as React.CSSProperties}
      >
        {loop.map((row, i) => (
          <div
            key={`${row.key}-${i}`}
            className={`zht-pollution-scroll-row${activeRowKey === row.key ? ' zht-pollution-scroll-row--active' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() =>
              onRowClick?.({
                key: row.key,
                sectionName: row.sectionName,
                unifiedId: row.unifiedId,
                lng: row.lng,
                lat: row.lat,
              })
            }
            onKeyDown={e => {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              e.preventDefault();
              onRowClick?.({
                key: row.key,
                sectionName: row.sectionName,
                unifiedId: row.unifiedId,
                lng: row.lng,
                lat: row.lat,
              });
            }}
          >
            <div className="zht-pollution-scroll-cell">
              <PollutionTextCell text={row.sectionName} />
            </div>
            <div className="zht-pollution-scroll-cell">
              <PollutionTextCell text={row.pollutant} />
            </div>
            <div className="zht-pollution-scroll-cell zht-pollution-scroll-cell--intensity">
              <Tooltip
                title={
                  row.intensity === '—'
                    ? '污染强度数据缺失'
                    : `污染强度 = ${row.primaryConcentration} ÷ ${row.targetLimit} = ${row.intensity}`
                }
                placement="topLeft"
                mouseEnterDelay={0.25}
              >
                <div className="zht-pollution-cell-2l zht-pollution-intensity-inner">{row.intensity}</div>
              </Tooltip>
            </div>
            <div className="zht-pollution-scroll-cell zht-pollution-scroll-cell--time">
              <PollutionTextCell text={row.time} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const ZhtRightDashboard: React.FC<{
  onCalendarDayClick?: CalendarDayClickHandler;
  /** 传入 `null` 时表示取消汛期污染行选中并清除地图同源高亮 */
  onPollutionRowClick?: (row: PollutionRowLocatePayload | null) => void;
}> = ({ onCalendarDayClick, onPollutionRowClick }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstRef = useRef<echarts.ECharts | null>(null);
  const chartResizeRoRef = useRef<ResizeObserver | null>(null);
  const [compliancePeriod, setCompliancePeriod] = useState<CompliancePeriod>('year');
  const [activePollutionRowKey, setActivePollutionRowKey] = useState<string | null>(null);

  const clearPollutionMapHighlight = () => {
    setActivePollutionRowKey(null);
    onPollutionRowClick?.(null);
  };

  /** 仅在本卡已有行选中时响应，避免误清左侧抽屉等其它链路写入的地图揭开态 */
  const onPollutionCardHeaderClick = () => {
    if (activePollutionRowKey == null) return;
    clearPollutionMapHighlight();
  };

  const onPollutionRowLocate = (row: PollutionRowLocatePayload) => {
    if (activePollutionRowKey === row.key) {
      clearPollutionMapHighlight();
      return;
    }
    setActivePollutionRowKey(row.key);
    onPollutionRowClick?.(row);
  };


  const calendarMeta = useMemo(() => buildCalendarAlarmMetaFromDemo(), []);
  const { year: calYear, monthIndex: calMonth, alarmDaySet } = calendarMeta;
  const { blanks, daysInMonth } = useMemo(() => buildCalendarGrid(calYear, calMonth), [calYear, calMonth]);
  const calendarTailBlanks = Math.max(0, 42 - (blanks + daysInMonth));

  const complianceHint = COMPLIANCE_HINT[compliancePeriod];

  useEffect(() => {
    if (compliancePeriod === 'day') {
      chartResizeRoRef.current?.disconnect();
      chartResizeRoRef.current = null;
      chartInstRef.current?.dispose();
      chartInstRef.current = null;
      return;
    }
    const el = chartRef.current;
    if (!el) return;
    let inst = chartInstRef.current;
    if (!inst) {
      inst = echarts.init(el, undefined, { renderer: 'canvas' });
      chartInstRef.current = inst;
      const ro = new ResizeObserver(() => inst?.resize());
      ro.observe(el);
      chartResizeRoRef.current = ro;
    }
    inst.setOption(compliancePeriod === 'year' ? buildYearPieOption() : buildMonthStackBarOption(), {
      notMerge: true,
    });
  }, [compliancePeriod]);

  useEffect(() => {
    return () => {
      chartResizeRoRef.current?.disconnect();
      chartResizeRoRef.current = null;
      chartInstRef.current?.dispose();
      chartInstRef.current = null;
    };
  }, []);

  const weekdayLabels = ['一', '二', '三', '四', '五', '六', '日'];

  return (
    <aside className="zht-right-rail" aria-label="右侧分析看板">
      <section className="zht-right-widget zht-right-widget--compliance">
        <div className="zht-right-widget-hd">
          <h3 className="zht-right-widget-title">
            <span className="zht-right-widget-pipe">|</span>
            断面水质达标评价
          </h3>
          <Segmented<CompliancePeriod>
            size="small"
            className="zht-compliance-period"
            value={compliancePeriod}
            onChange={v => setCompliancePeriod(v)}
            options={[
              { label: '年', value: 'year' },
              { label: '月', value: 'month' },
              { label: '日', value: 'day' },
            ]}
          />
        </div>
        {compliancePeriod === 'day' ? (
          <ComplianceDayStatTable />
        ) : (
          <div ref={chartRef} className="zht-compliance-chart" />
        )}
        <p className="zht-compliance-hint">{complianceHint}</p>
      </section>

      <section className="zht-right-widget zht-right-widget--table">
        <div
          className="zht-right-widget-hd zht-right-widget-hd--pollution"
          onClick={onPollutionCardHeaderClick}
          role="presentation"
        >
          <h3 className="zht-right-widget-title">
            <span className="zht-right-widget-pipe">|</span>
            {`汛期污染强度（${POLLUTION_ROWS.length}）`}
            <Tooltip
              title={
                <div className="zht-pollution-formula-tip">
                  <div>{POLLUTION_INTENSITY_FORMULA}</div>
                  <div>示例（氨氮）：1.05 ÷ 0.50 = 2.10</div>
                  <div>示例（总磷）：0.34 ÷ 0.20 = 1.70</div>
                  <div>示例（COD）：26.00 ÷ 20.00 = 1.30</div>
                </div>
              }
              placement="top"
              mouseEnterDelay={0.2}
            >
              <span
                className="zht-layer-control__help-icon"
                role="button"
                tabIndex={0}
                aria-label="查看污染强度计算公式"
                onClick={e => e.stopPropagation()}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
                }}
              >
                <QuestionCircleOutlined />
              </span>
            </Tooltip>
          </h3>
        </div>
        <div className="zht-pollution-scroll-shell">
          <div className="zht-pollution-scroll-thead" role="row">
            <div role="columnheader" className="zht-pollution-scroll-th">
              断面名称
            </div>
            <div role="columnheader" className="zht-pollution-scroll-th">
              首要污染物
            </div>
            <div role="columnheader" className="zht-pollution-scroll-th zht-pollution-scroll-th--right">
              污染强度
            </div>
            <div role="columnheader" className="zht-pollution-scroll-th zht-pollution-scroll-th--time">
              时间
            </div>
          </div>
          <PollutionScrollBody
            rows={POLLUTION_ROWS}
            activeRowKey={activePollutionRowKey}
            onRowClick={onPollutionRowLocate}
          />
        </div>
      </section>

      <section className="zht-right-widget zht-right-widget--calendar">
        <div className="zht-right-widget-hd">
          <h3 className="zht-right-widget-title">
            <span className="zht-right-widget-pipe">|</span>
            排口水质报警日历
          </h3>
        </div>
        <div className="zht-cal-meta-row">
          <div className="zht-cal-month">{`${calYear} 年 ${calMonth + 1} 月`}</div>
          <div className="zht-cal-legend">
            <span>
              <i className="zht-cal-dot zht-cal-dot--ok" /> 正常
            </span>
            <span>
              <i className="zht-cal-dot zht-cal-dot--alarm" /> 报警
            </span>
          </div>
        </div>
        <div className="zht-cal-weekdays">
          {weekdayLabels.map(d => (
            <div key={d} className="zht-cal-wd">
              {d}
            </div>
          ))}
        </div>
        <div className="zht-cal-cells">
          {Array.from({ length: blanks }).map((_, i) => (
            <div key={`b-${i}`} className="zht-cal-cell zht-cal-cell--empty" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const alarm = alarmDaySet.has(day);
            const now = new Date();
            const isToday = now.getFullYear() === calYear && now.getMonth() === calMonth && now.getDate() === day;
            return (
              <div
                key={day}
                className={`zht-cal-cell${alarm ? ' zht-cal-cell--alarm' : ' zht-cal-cell--ok'}${isToday ? ' zht-cal-cell--today' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => onCalendarDayClick?.(formatCalendarDate(calYear, calMonth, day))}
                onKeyDown={e => {
                  if (e.key !== 'Enter' && e.key !== ' ') return;
                  e.preventDefault();
                  onCalendarDayClick?.(formatCalendarDate(calYear, calMonth, day));
                }}
              >
                {day}
              </div>
            );
          })}
          {Array.from({ length: calendarTailBlanks }).map((_, i) => (
            <div key={`tb-${i}`} className="zht-cal-cell zht-cal-cell--empty" />
          ))}
        </div>
      </section>
    </aside>
  );
};
