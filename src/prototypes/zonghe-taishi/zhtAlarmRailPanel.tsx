/**
 * 综合态势 · 报警信息（右侧 rail / 地图列 overlay），交互对齐 `ZhtLeftStatDrawer`
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import {
  AppstoreOutlined,
  BarsOutlined,
  CloseOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  ExclamationCircleFilled,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Button, DatePicker, Descriptions, Form, Input, message, Modal, Segmented, Select, Space, Table, Tooltip } from 'antd';
import type { DescriptionsProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DetailTabsIfMultiple } from '../shared/detailTabsIfMultiple';
import { ZHT_FACILITY_DETAIL_MODAL_WIDTH, zhtDetailModalStyles } from './zhtDetailModalShared';
import type { ZhtStatDrawerMapFocus } from './zhtLeftStatDrawerData';
import { compactDrawerAddressDetail } from './zhtLeftStatDrawer';
import {
  buildAlarmDemoRecords,
  type ZhtAlarmRecord,
  type ZhtAlarmTimeScope,
} from './zhtAlarmRailDemoData';
import {
  FacilityRealtimePanel,
  type FacilityMonitoringScene,
} from '../韶山水环境设施管理系统/pipe-node-monitoring';
import { getAlarmPushedEvent, isAlarmPushed, pushAlarmToEvent } from '../shared/alarmEventPushStore';
import {
  renderUnifiedDetailTabs,
  type UnifiedFacilityEventRecord,
} from '../韶山水环境设施管理系统/facility-unified-event-list-view';

/** @deprecated 使用 {@link ZhtAlarmRecord} */
export type ZhtAlarmRailDemoItem = ZhtAlarmRecord;

export type ZhtAlarmRailVariant = 'rail' | 'overlay';

export type ZhtAlarmRailPanelProps = {
  variant?: ZhtAlarmRailVariant;
  /** rail：铺满地图列 */
  onMapExpand?: () => void;
  /** overlay：收回右侧栏形态 */
  onMapCollapse?: () => void;
  onClose: () => void;
  onLocateOnMap: (focus: ZhtStatDrawerMapFocus, from: { id: string }) => void;
  locateHighlightedCardId?: string | null;
  /** 已有定位选中时：点击标题行空白（非按钮）取消地图联动选中 */
  onClearLocateHighlight?: () => void;
  /** 与地图设施详情 Modal 一致：浏览器全屏地图时须挂入主舞台，否则传默认 `document.body` */
  getDetailModalContainer?: () => HTMLElement;
  /** 外部注入的单日查询日期（YYYY-MM-DD） */
  injectedQueryDate?: string | null;
  /** 每次触发注入时递增，保证同一天可重复触发 */
  injectedQuerySeq?: number;
};

type AlarmQuerySnapshot = {
  region?: string;
  monPointType?: string;
  monItemType?: string;
  alarmLevel?: string;
  nameKw?: string;
  startDate?: string;
  endDate?: string;
};

/** 右侧 rail：固定展示实时同源演示条数（窄栏不做筛选切换） */
function buildRailDemoRecords(): ZhtAlarmRecord[] {
  return buildAlarmDemoRecords('realtime');
}


function getAlarmLevelTone(level: string): 'l1' | 'l2' | 'l3' | 'l4' {
  const v = String(level ?? '').trim();
  if (v.startsWith('I级')) return 'l1';
  if (v.startsWith('II级')) return 'l2';
  if (v.startsWith('III级')) return 'l3';
  return 'l4';
}

/** 区域标签仅展示末级（如：韶山市清溪镇 -> 清溪镇，韶山高新区 -> 高新区） */
function compactAlarmRegionTag(region: string): string {
  const src = String(region ?? '').trim();
  if (!src) return '—';
  const segs = src.split(/[·\/>》\-\s]+/).map(s => s.trim()).filter(Boolean);
  const merged = segs.length > 0 ? segs[segs.length - 1] : src;
  const unitRe = /(街道|高新区|开发区|新区|园区|镇|乡|区|县|市)/g;
  const ms = Array.from(merged.matchAll(unitRe));
  if (ms.length >= 2) {
    const prev = ms[ms.length - 2];
    const last = ms[ms.length - 1];
    const start = (prev.index ?? 0) + prev[0].length;
    const end = (last.index ?? 0) + last[0].length;
    const tail = merged.slice(start, end).trim();
    if (tail) return tail;
  }
  return merged;
}

function buildQuerySnapshot(
  region: string | undefined,
  monPointType: string | undefined,
  monItemType: string | undefined,
  alarmLevel: string | undefined,
  nameKw: string,
  dateRange: [Dayjs | null, Dayjs | null] | null,
): AlarmQuerySnapshot {
  const kw = nameKw.trim();
  return {
    region: region && region !== '全市' ? region : undefined,
    monPointType: monPointType || undefined,
    monItemType: monItemType || undefined,
    alarmLevel: alarmLevel || undefined,
    nameKw: kw || undefined,
    startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
    endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
  };
}

function applyAlarmQuery(records: ZhtAlarmRecord[], query: AlarmQuerySnapshot): ZhtAlarmRecord[] {
  return records.filter(row => {
    if (query.region && row.region !== query.region) return false;
    if (query.monPointType && row.monPointType !== query.monPointType) return false;
    if (query.monItemType && row.monItemName !== query.monItemType) return false;
    if (query.alarmLevel && row.currentLevel !== query.alarmLevel) return false;
    if (query.nameKw) {
      const haystack = `${row.alarmName} ${row.monPointName}`.toLowerCase();
      if (!haystack.includes(query.nameKw.toLowerCase())) return false;
    }
    if (query.startDate || query.endDate) {
      const rowDate = String(row.currentAlarmTime || '').slice(0, 10);
      if (!rowDate) return false;
      if (query.startDate && rowDate < query.startDate) return false;
      if (query.endDate && rowDate > query.endDate) return false;
    }
    return true;
  });
}

/** 监测信息 Tab：与 `FacilityRealtimePanel` 场景对齐（水质自动站 / 排口等） */
function alarmDetailMonitoringScene(alarm: ZhtAlarmRecord): FacilityMonitoringScene {
  const t = alarm.monPointType;
  if (/水质|自动站/.test(t)) return 'water_station';
  if (/污水厂/.test(t)) return 'plant';
  if (/泵站/.test(t)) return 'pump';
  return 'outlet';
}

/** 仅展示当前报警关联的单个监测项大卡（指标 key 与 `pipe-node-monitoring` 一致） */
function alarmDetailVisibleMetricKeys(alarm: ZhtAlarmRecord, scene: FacilityMonitoringScene): string[] {
  const item = alarm.monItemName.trim();
  if (scene === 'water_station') {
    if (/氨氮/.test(item)) return ['nh3n'];
    if (/总磷/.test(item)) return ['tp'];
    if (/总氮/.test(item)) return ['tn'];
    if (/ph/i.test(item)) return ['ph'];
    if (/cod/i.test(item)) return ['cod'];
    return ['nh3n'];
  }
  if (/泵前/.test(item)) return ['preP'];
  if (/泵后/.test(item)) return ['postP'];
  if (/瞬时|流量/.test(item)) return ['flow'];
  if (/液位|水箱/.test(item)) return ['tank'];
  if (/进水/.test(item)) return ['inP'];
  return ['inP'];
}

/** 嵌入 `FacilityRealtimePanel` 的占位台账：单设备 + 地址取自报警卡片 */
function alarmDetailMonitoringFakeRecord(alarm: ZhtAlarmRecord): Record<string, unknown> {
  const digits = alarm.alarmCode.replace(/\D/g, '').slice(-6) || '000001';
  const loc = alarm.address?.trim() || alarm.location;
  return {
    id: digits,
    name: alarm.monPointName,
    pustName: alarm.monPointName,
    addr: loc,
    pustLoc: loc,
    iotLinkedDeviceKeys: ['1'],
  };
}

/** 报警详情：Tab「报警信息」+「监测信息」；报警信息仅为 Descriptions（无 detail-section 外框）；监测信息与设施详情实时监测同源 */
const AlarmRecordDetailContent: React.FC<{ record: ZhtAlarmRecord; defaultActiveKey?: 'alarm-info' | 'monitor-info' }> = ({
  record,
  defaultActiveKey,
}) => {
  const roText = (v: string | number | undefined | null) => (v === '' || v == null ? '—' : String(v));

  const items: DescriptionsProps['items'] = useMemo(
    () => [
      { key: 'alarmCode', label: '告警编号', children: roText(record.alarmCode) },
      { key: 'region', label: '所属区划', children: roText(record.region) },
      { key: 'alarmName', label: '告警名称', children: roText(record.alarmName) },
      { key: 'monPointType', label: '监测点类型', children: roText(record.monPointType) },
      { key: 'monPointName', label: '监测点名称', children: roText(record.monPointName) },
      { key: 'monItemName', label: '监测项名称', children: roText(record.monItemName) },
      { key: 'location', label: '位置', span: 2, children: roText(record.location) },
      {
        key: 'currentAlarmValue',
        label: '当前报警值',
        children: <span className="zht-alarm-rail-table__val zht-alarm-rail-table__val--orange">{record.currentAlarmValue}</span>,
      },
      {
        key: 'currentLevel',
        label: '当前级别',
        children: <span className="zht-alarm-rail-table__val zht-alarm-rail-table__val--orange">{record.currentLevel}</span>,
      },
      { key: 'currentAlarmTime', label: '当前报警时间', span: 2, children: roText(record.currentAlarmTime) },
      {
        key: 'initialAlarmValue',
        label: '初次报警值',
        children: <span className="zht-alarm-rail-table__val zht-alarm-rail-table__val--blue">{record.initialAlarmValue}</span>,
      },
      {
        key: 'initialLevel',
        label: '初次级别',
        children: <span className="zht-alarm-rail-table__val zht-alarm-rail-table__val--blue">{record.initialLevel}</span>,
      },
      { key: 'initialAlarmTime', label: '初次报警时间', span: 2, children: roText(record.initialAlarmTime) },
      {
        key: 'maxAlarmValue',
        label: '最高报警值',
        children: <span className="zht-alarm-rail-table__val zht-alarm-rail-table__val--red">{record.maxAlarmValue}</span>,
      },
      {
        key: 'maxLevel',
        label: '最高级别',
        children: <span className="zht-alarm-rail-table__val zht-alarm-rail-table__val--red">{record.maxLevel}</span>,
      },
      { key: 'maxAlarmTime', label: '最高报警时间', span: 2, children: roText(record.maxAlarmTime) },
      // 与「报警次数」同一行两列展示，避免 span:2 通栏时标签格与内容格错行
      {
        key: 'alarmEndTime',
        label: '报警结束时间',
        children: roText(record.alarmEndTime?.trim() ? record.alarmEndTime : ''),
      },
      { key: 'alarmCount', label: '报警次数', children: roText(record.alarmCount) },
    ],
    [record],
  );

  const monitoringScene = useMemo(() => alarmDetailMonitoringScene(record), [record]);
  const visibleMetricKeys = useMemo(
    () => alarmDetailVisibleMetricKeys(record, monitoringScene),
    [record, monitoringScene],
  );
  const monitoringFakeRecord = useMemo(() => alarmDetailMonitoringFakeRecord(record), [record]);

  return (
    <DetailTabsIfMultiple
      className="facility-detail-tabs facility-mgmt-detail-tabs"
      size="small"
      style={{ marginTop: 8 }}
      defaultActiveKey={defaultActiveKey}
      items={[
        {
          key: 'alarm-info',
          label: '报警信息',
          children: <Descriptions bordered column={2} size="small" items={items} />,
        },
        {
          key: 'monitor-info',
          label: '监测信息',
          children: (
            <FacilityRealtimePanel
              key={`${record.id}-${visibleMetricKeys.join(',')}`}
              record={monitoringFakeRecord}
              scene={monitoringScene}
              visibleMetricKeys={visibleMetricKeys}
              hideEquipmentSection
              hideDeviceInfoSectionTitle
            />
          ),
        },
      ]}
    />
  );
};

/** 报警操作区：卡片与列表复用行为，支持不同视觉风格 */
const AlarmRailActionButtons: React.FC<{
  variant?: 'card' | 'table';
  showTraceAction?: boolean;
  alarmRecord: ZhtAlarmRecord;
  onAnyActionClick?: (e: React.MouseEvent<HTMLElement>) => void;
  onRequestPush?: (alarm: ZhtAlarmRecord) => void;
  onOpenEventDetail?: (record: UnifiedFacilityEventRecord) => void;
  onOpenMonitorDetail?: () => void;
}> = ({
  variant = 'card',
  showTraceAction = true,
  alarmRecord,
  onAnyActionClick,
  onRequestPush,
  onOpenEventDetail,
  onOpenMonitorDetail,
}) => (
  <>
    <Button
      type={variant === 'table' ? 'link' : 'default'}
      size="small"
      className={
        variant === 'table'
          ? 'action-btn detail'
          : 'zht-alarm-rail__btn zht-alarm-rail__btn--blue'
      }
      onClick={e => {
        onAnyActionClick?.(e);
        const pushed = getAlarmPushedEvent(alarmRecord.id);
        if (pushed) {
          onOpenEventDetail?.(pushed.event as UnifiedFacilityEventRecord);
          return;
        }
        onRequestPush?.(alarmRecord);
      }}
    >
      {isAlarmPushed(alarmRecord.id) ? '事件信息' : '处置推送'}
    </Button>
    {showTraceAction ? (
      <Button
        type={variant === 'table' ? 'link' : 'default'}
        size="small"
        className={
          variant === 'table'
            ? 'action-btn edit'
            : 'zht-alarm-rail__btn zht-alarm-rail__btn--blue'
        }
        onClick={e => {
          onAnyActionClick?.(e);
          message.info('原型演示：溯源分析');
        }}
      >
        溯源分析
      </Button>
    ) : null}
    <Button
      type={variant === 'table' ? 'link' : 'default'}
      size="small"
      className={
        variant === 'table'
          ? 'action-btn linked-analysis'
          : 'zht-alarm-rail__btn zht-alarm-rail__btn--green'
      }
      onClick={e => {
        onAnyActionClick?.(e);
        onOpenMonitorDetail?.();
      }}
    >
      监测详情
    </Button>
  </>
);

const AlarmRailCard: React.FC<{
  item: ZhtAlarmRecord;
  locateHighlightedCardId: string | null;
  onLocateOnMap: (focus: ZhtStatDrawerMapFocus, from: { id: string }) => void;
  showActionButtons?: boolean;
  onRequestPush?: (alarm: ZhtAlarmRecord) => void;
  onOpenEventDetail?: (record: UnifiedFacilityEventRecord) => void;
  /** 点击卡片空白区域打开详情（与列表字段一致的弹框） */
  onCardOpenDetail?: () => void;
  /** 点击「监测详情」按钮：打开详情并默认切到监测信息 Tab */
  onCardOpenMonitorDetail?: () => void;
}> = ({
  item,
  locateHighlightedCardId,
  onLocateOnMap,
  showActionButtons = true,
  onRequestPush,
  onOpenEventDetail,
  onCardOpenDetail,
  onCardOpenMonitorDetail,
}) => {
  const locateActive = item.id === locateHighlightedCardId;
  const addrRaw = item.address?.trim();
  const addrDisplay = addrRaw ? compactDrawerAddressDetail(addrRaw) : '';
  const regionTag = compactAlarmRegionTag(item.region);
  const canLocate = Boolean(addrDisplay && item.mapFocus);
  const levelTone = getAlarmLevelTone(item.cardLevelBadge);
  const handleLocate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canLocate) return;
    onLocateOnMap(item.mapFocus, { id: item.id });
  };

  /** 整卡打开详情；不抢地址行内「定位/地址」按钮与底部操作区的事件 */
  const handleCardSurfaceClick = (e: React.MouseEvent<HTMLElement>) => {
    if (!onCardOpenDetail) return;
    const t = e.target as HTMLElement;
    if (t.closest('.zht-alarm-rail__card-actions')) return;
    if (t.closest('.zht-stat-drawer-card__addr-row button')) return;
    onCardOpenDetail();
  };

  return (
    <article
      className={`zht-stat-drawer-card zht-alarm-rail-card${onCardOpenDetail ? ' zht-alarm-rail-card--clickable' : ''}${
        locateActive ? ' zht-stat-drawer-card--locate-active' : ''
      }`}
      onClick={onCardOpenDetail ? handleCardSurfaceClick : undefined}
    >
      <div className="zht-alarm-rail__card-head">
        <Tooltip title={item.cardTitle} placement="topLeft" mouseEnterDelay={0.35}>
          <span className="zht-alarm-rail__card-title">{item.cardTitle}</span>
        </Tooltip>
        <div className="zht-stat-drawer-card__tags">
          <Tooltip title={item.region} placement="top" mouseEnterDelay={0.35}>
            <span className="zht-stat-drawer-card__tag zht-alarm-rail__card-region">{regionTag}</span>
          </Tooltip>
          <span className={`zht-stat-drawer-card__tag zht-alarm-rail__card-level zht-alarm-rail__card-level--${levelTone}`}>
            {item.cardLevelBadge}
          </span>
        </div>
      </div>
      <div className="zht-alarm-rail__card-time">{item.cardTime}</div>
      {addrDisplay ? (
        <div
          className={`zht-stat-drawer-card__addr-row${canLocate ? ' zht-stat-drawer-card__addr-row--interactive' : ''}`}
        >
          {canLocate ? (
            <Tooltip title="在地图中定位">
              <button
                type="button"
                className="zht-stat-drawer-card__locate-btn"
                aria-label="在地图中定位"
                onClick={handleLocate}
              >
                <EnvironmentOutlined />
              </button>
            </Tooltip>
          ) : (
            <span className="zht-stat-drawer-card__locate-btn zht-stat-drawer-card__locate-btn--disabled" aria-hidden>
              <EnvironmentOutlined />
            </span>
          )}
          <div className="zht-stat-drawer-card__addr-text-wrap">
            <Tooltip title={addrDisplay} placement="topLeft" mouseEnterDelay={0.35}>
              {canLocate ? (
                <button type="button" className="zht-stat-drawer-card__addr-text" onClick={handleLocate}>
                  <span className="zht-stat-drawer-card__addr-text-inner">{addrDisplay}</span>
                </button>
              ) : (
                <span className="zht-stat-drawer-card__addr-text zht-stat-drawer-card__addr-text--plain">
                  <span className="zht-stat-drawer-card__addr-text-inner">{addrDisplay}</span>
                </span>
              )}
            </Tooltip>
          </div>
        </div>
      ) : null}
      <div className="zht-alarm-rail__card-detail">
        <ExclamationCircleFilled className={`zht-alarm-rail__card-detail-ico zht-alarm-rail__card-detail-ico--${levelTone}`} aria-hidden />
        <span className="zht-alarm-rail__card-detail-name">{item.indicator}</span>
        <span className={`zht-alarm-rail__card-detail-val zht-alarm-rail__card-detail-val--${levelTone}`}>{item.value}</span>
      </div>
      {showActionButtons ? (
        <div className="zht-alarm-rail__card-actions" onClick={e => e.stopPropagation()}>
          <AlarmRailActionButtons
            showTraceAction={false}
            alarmRecord={item}
            onAnyActionClick={e => e.stopPropagation()}
            onRequestPush={onRequestPush}
            onOpenEventDetail={onOpenEventDetail}
            onOpenMonitorDetail={onCardOpenMonitorDetail}
          />
        </div>
      ) : null}
    </article>
  );
};

export const ZhtAlarmRailPanel: React.FC<ZhtAlarmRailPanelProps> = ({
  variant = 'rail',
  onMapExpand,
  onMapCollapse,
  onClose,
  onLocateOnMap,
  locateHighlightedCardId = null,
  onClearLocateHighlight,
  getDetailModalContainer,
  injectedQueryDate = null,
  injectedQuerySeq = 0,
}) => {
  const [pushConfirmForm] = Form.useForm<{
    点位类型: '监测点';
    关联点位: string;
    事件类型: string;
    事件等级: '一般' | '较大' | '重大';
    发生时间: string;
    上报人: string;
    事件描述: string;
    处置建议: string;
  }>();
  const railRecords = useMemo(() => buildRailDemoRecords(), []);

  /** 铺满 overlay：实时 / 历史切换刷新同源结构演示数据 */
  const [alarmScope, setAlarmScope] = useState<ZhtAlarmTimeScope>('realtime');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [region, setRegion] = useState<string | undefined>(undefined);
  const [monPointType, setMonPointType] = useState<string | undefined>(undefined);
  const [monItemType, setMonItemType] = useState<string | undefined>(undefined);
  const [alarmLevel, setAlarmLevel] = useState<string | undefined>(undefined);
  const [nameKw, setNameKw] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [querySnapshot, setQuerySnapshot] = useState<AlarmQuerySnapshot>({});

  const overlayRecords = useMemo(() => buildAlarmDemoRecords(alarmScope), [alarmScope]);
  const isRealtimeScope = alarmScope === 'realtime';

  /** 卡片 / 列表行 /「详情」打开的报警信息弹框（详情字段与表格列一致，不含序号与地图定位列） */
  const [alarmDetailCtx, setAlarmDetailCtx] = useState<{
    record: ZhtAlarmRecord;
    defaultActiveKey?: 'alarm-info' | 'monitor-info';
  } | null>(null);
  const [eventDetailCtx, setEventDetailCtx] = useState<UnifiedFacilityEventRecord | null>(null);
  const [pushConfirmAlarm, setPushConfirmAlarm] = useState<ZhtAlarmRecord | null>(null);
  const [, setPushVersion] = useState(0);
  const handledInjectedQuerySeqRef = useRef(0);

  const filteredOverlayRecords = useMemo(
    () => applyAlarmQuery(overlayRecords, querySnapshot),
    [overlayRecords, querySnapshot],
  );

  const handleQuery = useCallback(() => {
    const nextSnapshot = buildQuerySnapshot(region, monPointType, monItemType, alarmLevel, nameKw, dateRange);
    setQuerySnapshot(nextSnapshot);
    message.success(`查询完成，共 ${applyAlarmQuery(overlayRecords, nextSnapshot).length} 条`);
  }, [alarmLevel, dateRange, monItemType, monPointType, nameKw, overlayRecords, region]);

  const handleAlarmHdTopClick = useCallback(
    (e: React.MouseEvent) => {
      if (!locateHighlightedCardId || !onClearLocateHighlight) return;
      if ((e.target as HTMLElement).closest('button')) return;
      onClearLocateHighlight();
    },
    [locateHighlightedCardId, onClearLocateHighlight],
  );

  useEffect(() => {
    if (variant !== 'overlay') return;
    if (!injectedQueryDate) return;
    if (injectedQuerySeq <= handledInjectedQuerySeqRef.current) return;
    const nextDay = dayjs(injectedQueryDate, 'YYYY-MM-DD', true);
    if (!nextDay.isValid()) return;

    handledInjectedQuerySeqRef.current = injectedQuerySeq;
    setRegion(undefined);
    setMonPointType(undefined);
    setMonItemType(undefined);
    setAlarmLevel(undefined);
    setNameKw('');
    const nextRange: [Dayjs, Dayjs] = [nextDay, nextDay];
    setDateRange(nextRange);
    const nextSnapshot = buildQuerySnapshot(undefined, undefined, undefined, undefined, '', nextRange);
    setQuerySnapshot(nextSnapshot);
    message.success(`已按 ${injectedQueryDate} 查询，共 ${applyAlarmQuery(overlayRecords, nextSnapshot).length} 条`);
  }, [injectedQueryDate, injectedQuerySeq, overlayRecords, variant]);

  const handleResetQuery = useCallback(() => {
    setRegion(undefined);
    setMonPointType(undefined);
    setMonItemType(undefined);
    setAlarmLevel(undefined);
    setNameKw('');
    setDateRange(null);
    setQuerySnapshot({});
    message.success(`已重置，当前共 ${overlayRecords.length} 条`);
  }, [overlayRecords.length]);

  const handlePushCreated = useCallback(() => {
    setPushVersion(v => v + 1);
  }, []);

  const handleRequestPush = useCallback(
    (alarm: ZhtAlarmRecord) => {
      const currentLevel = String(alarm.currentLevel || '').trim();
      const autoEventLevel: '一般' | '较大' | '重大' =
        currentLevel.startsWith('I级') ? '重大' : currentLevel.startsWith('II级') ? '较大' : '一般';
      pushConfirmForm.setFieldsValue({
        点位类型: '监测点',
        关联点位: String(alarm.monPointName || '').trim(),
        事件类型: '实时告警',
        事件等级: autoEventLevel,
        发生时间: String(alarm.currentAlarmTime || '').trim(),
        上报人: '系统推送',
        事件描述: String(alarm.alarmName || '').trim(),
        处置建议: '请尽快核查告警点位并完成处置闭环',
      });
      setPushConfirmAlarm(alarm);
    },
    [pushConfirmForm],
  );

  const handleConfirmPush = useCallback(async () => {
    if (!pushConfirmAlarm) return;
    const values = await pushConfirmForm.validateFields();
    const { created } = pushAlarmToEvent(pushConfirmAlarm, {
      事件类型: values.事件类型,
      事件等级: values.事件等级,
      发生时间: values.发生时间,
      责任人: values.上报人,
      更新时间: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      事件原因: values.事件描述,
      应急处置: values.处置建议,
    });
    if (created) {
      handlePushCreated();
      message.success('处置推送成功，已同步到设施管理-事件管理-事件列表');
    } else {
      message.info('当前报警已完成推送，请查看事件信息');
    }
    setPushConfirmAlarm(null);
  }, [handlePushCreated, pushConfirmAlarm, pushConfirmForm]);

  const tableColumns: ColumnsType<ZhtAlarmRecord> = useMemo(
    () => [
      { title: '序号', width: 52, fixed: 'left', align: 'center', render: (_, __, i) => i + 1 },
      { title: '告警编号', width: 128, dataIndex: 'alarmCode', ellipsis: true },
      { title: '所属区划', width: 120, dataIndex: 'region', ellipsis: true },
      { title: '告警名称', width: 160, dataIndex: 'alarmName', ellipsis: true },
      { title: '监测点类型', width: 112, dataIndex: 'monPointType', ellipsis: true },
      { title: '监测点名称', width: 140, dataIndex: 'monPointName', ellipsis: true },
      { title: '监测项名称', width: 100, dataIndex: 'monItemName', ellipsis: true },
      {
        title: '位置',
        width: 160,
        dataIndex: 'location',
        ellipsis: true,
        render: (v: string) => compactDrawerAddressDetail(v),
      },
      {
        title: '当前报警值',
        width: 96,
        dataIndex: 'currentAlarmValue',
        align: 'right',
        render: v => <span className="zht-alarm-rail-table__val zht-alarm-rail-table__val--orange">{v}</span>,
      },
      {
        title: '当前级别',
        width: 88,
        dataIndex: 'currentLevel',
        render: v => <span className="zht-alarm-rail-table__val zht-alarm-rail-table__val--orange">{v}</span>,
      },
      { title: '当前报警时间', width: 168, dataIndex: 'currentAlarmTime', ellipsis: true },
      {
        title: '初次报警值',
        width: 96,
        dataIndex: 'initialAlarmValue',
        align: 'right',
        render: v => <span className="zht-alarm-rail-table__val zht-alarm-rail-table__val--blue">{v}</span>,
      },
      { title: '初次报警时间', width: 168, dataIndex: 'initialAlarmTime', ellipsis: true },
      {
        title: '初次级别',
        width: 88,
        dataIndex: 'initialLevel',
        render: v => <span className="zht-alarm-rail-table__val zht-alarm-rail-table__val--blue">{v}</span>,
      },
      {
        title: '最高报警值',
        width: 96,
        dataIndex: 'maxAlarmValue',
        align: 'right',
        render: v => <span className="zht-alarm-rail-table__val zht-alarm-rail-table__val--red">{v}</span>,
      },
      {
        title: '最高级别',
        width: 88,
        dataIndex: 'maxLevel',
        render: v => <span className="zht-alarm-rail-table__val zht-alarm-rail-table__val--red">{v}</span>,
      },
      { title: '最高报警时间', width: 168, dataIndex: 'maxAlarmTime', ellipsis: true },
      {
        title: '报警结束时间',
        width: 168,
        dataIndex: 'alarmEndTime',
        ellipsis: true,
        render: (v: string) => (v?.trim() ? v : '—'),
      },
      { title: '报警次数', width: 88, dataIndex: 'alarmCount', align: 'right' },
      {
        title: '操作',
        width: isRealtimeScope ? 340 : 180,
        fixed: 'right',
        align: 'center',
        render: (_, row) => (
          <div className="zht-alarm-rail__table-actions">
            <Tooltip title="在地图中定位">
              <Button
                type="link"
                size="small"
                className="zht-alarm-rail-table__loc-link action-btn detail"
                icon={<EnvironmentOutlined />}
                onClick={e => {
                  e.stopPropagation();
                  onLocateOnMap(row.mapFocus, { id: row.id });
                }}
              >
                定位
              </Button>
            </Tooltip>
            <Button
              type="link"
              size="small"
              className="action-btn detail"
              icon={<EyeOutlined />}
              onClick={e => {
                e.stopPropagation();
                setAlarmDetailCtx({ record: row, defaultActiveKey: 'alarm-info' });
              }}
            >
              详情
            </Button>
            {isRealtimeScope ? (
              <AlarmRailActionButtons
                variant="table"
                showTraceAction={false}
                alarmRecord={row}
                onAnyActionClick={e => e.stopPropagation()}
                onRequestPush={handleRequestPush}
                onOpenEventDetail={setEventDetailCtx}
                onOpenMonitorDetail={() => setAlarmDetailCtx({ record: row, defaultActiveKey: 'monitor-info' })}
              />
            ) : null}
          </div>
        ),
      },
    ],
    [handleRequestPush, isRealtimeScope, onLocateOnMap],
  );

  const railInner = (
    <>
      <header className="zht-stat-drawer__hd">
        <div className="zht-stat-drawer__hd-top" onClick={handleAlarmHdTopClick}>
          {onMapExpand && (
            <Button
              type="text"
              className="zht-stat-drawer__expand"
              aria-label="列表铺满地图区域"
              title="列表铺满地图区域"
              icon={<MenuFoldOutlined />}
              onClick={onMapExpand}
            />
          )}
          <h2 id="zht-alarm-rail-title" className="zht-stat-drawer__title">
            <span className="zht-stat-drawer__pipe">|</span>
            最新报警信息
          </h2>
          <Button type="text" className="zht-stat-drawer__close" aria-label="返回默认分析看板" onClick={onClose} icon={<CloseOutlined />} />
        </div>
      </header>

      <div className="zht-stat-drawer__body">
        <div className="zht-stat-drawer__grid zht-alarm-rail__grid">
          {railRecords.map((item, index) => (
            <AlarmRailCard
              key={item.id}
              item={item}
              locateHighlightedCardId={locateHighlightedCardId}
              onLocateOnMap={onLocateOnMap}
              onRequestPush={handleRequestPush}
              onOpenEventDetail={setEventDetailCtx}
              onCardOpenDetail={() => setAlarmDetailCtx({ record: item, defaultActiveKey: 'alarm-info' })}
              onCardOpenMonitorDetail={() => setAlarmDetailCtx({ record: item, defaultActiveKey: 'monitor-info' })}
            />
          ))}
        </div>
      </div>
    </>
  );

  const regionOpts = useMemo(() => ['韶山市清溪镇', '韶山高新区', '全市'], []);

  const overlayInner = (
    <>
      {/** 与 `ZhtLeftStatDrawer` 一致：首行仅 收回｜标题｜视图切换｜关闭；筛选独立一行 `zht-stat-drawer__filters` */}
      <header className="zht-stat-drawer__hd">
        <div className="zht-stat-drawer__hd-top zht-alarm-rail__overlay-hd-top" onClick={handleAlarmHdTopClick}>
          {onMapCollapse && (
            <Button
              type="text"
              className="zht-stat-drawer__expand"
              aria-label="收回右侧列表栏"
              title="收回右侧列表栏"
              icon={<MenuUnfoldOutlined />}
              onClick={onMapCollapse}
            />
          )}
          <h2 id="zht-alarm-overlay-title" className="zht-stat-drawer__title">
            <span className="zht-stat-drawer__pipe">|</span>
            报警列表
          </h2>
          <div className="zht-alarm-rail__overlay-hd-spacer" aria-hidden />
          <div className="zht-alarm-rail__overlay-view-group">
            <Tooltip title="卡片视图">
              <Button
                type="text"
                className={`zht-stat-drawer__expand${viewMode === 'card' ? ' zht-alarm-rail__view-toggle--active' : ''}`}
                aria-label="卡片视图"
                aria-pressed={viewMode === 'card'}
                icon={<AppstoreOutlined />}
                onClick={() => setViewMode('card')}
              />
            </Tooltip>
            <Tooltip title="列表视图">
              <Button
                type="text"
                className={`zht-stat-drawer__expand${viewMode === 'list' ? ' zht-alarm-rail__view-toggle--active' : ''}`}
                aria-label="列表视图"
                aria-pressed={viewMode === 'list'}
                icon={<BarsOutlined />}
                onClick={() => setViewMode('list')}
              />
            </Tooltip>
          </div>
          <Button type="text" className="zht-stat-drawer__close" aria-label="返回默认分析看板" onClick={onClose} icon={<CloseOutlined />} />
        </div>
      </header>

      <div className="zht-stat-drawer__filters">
        <Space wrap size="middle">
          <Segmented<ZhtAlarmTimeScope>
            className="zht-alarm-rail__segmented"
            options={[
              { label: '实时告警', value: 'realtime' },
              { label: '历史报警', value: 'history' },
            ]}
            value={alarmScope}
            onChange={v => setAlarmScope(v)}
          />
          <Select
            allowClear
            placeholder="选择区域"
            style={{ minWidth: 140 }}
            popupMatchSelectWidth={false}
            value={region}
            onChange={setRegion}
            options={regionOpts.map(r => ({ label: r, value: r }))}
          />
          <Select
            allowClear
            placeholder="监测点类型"
            style={{ minWidth: 140 }}
            popupMatchSelectWidth={false}
            value={monPointType}
            onChange={setMonPointType}
            options={['水质自动站', '手工断面', '污水处理厂'].map(v => ({ label: v, value: v }))}
          />
          <Select
            allowClear
            placeholder="监测项类型"
            style={{ minWidth: 140 }}
            popupMatchSelectWidth={false}
            value={monItemType}
            onChange={setMonItemType}
            options={['氨氮', 'COD', '总磷', 'pH'].map(v => ({ label: v, value: v }))}
          />
          <Select
            allowClear
            placeholder="报警级别"
            style={{ minWidth: 120 }}
            popupMatchSelectWidth={false}
            value={alarmLevel}
            onChange={setAlarmLevel}
            options={['I级', 'II级', 'III级', 'IV级'].map(v => ({ label: v, value: v }))}
          />
          <Input allowClear placeholder="名称" style={{ width: 200 }} value={nameKw} onChange={e => setNameKw(e.target.value)} />
          <DatePicker.RangePicker placeholder={['开始日期', '结束日期']} style={{ width: 280 }} value={dateRange} onChange={r => setDateRange(r)} />
          <Space size="small">
            <Button type="primary" icon={<SearchOutlined />} onClick={handleQuery}>
              查询
            </Button>
            <Button onClick={handleResetQuery}>重置</Button>
          </Space>
        </Space>
      </div>

      <div className="zht-stat-drawer__body zht-alarm-rail__overlay-body">
        {viewMode === 'card' ? (
          <div className="zht-stat-drawer__grid zht-alarm-rail__grid zht-alarm-rail__grid--overlay">
            {filteredOverlayRecords.map((item, index) => (
              <AlarmRailCard
                key={item.id}
                item={item}
                locateHighlightedCardId={locateHighlightedCardId}
                onLocateOnMap={onLocateOnMap}
                showActionButtons={isRealtimeScope}
                onRequestPush={handleRequestPush}
                onOpenEventDetail={setEventDetailCtx}
                onCardOpenDetail={() => setAlarmDetailCtx({ record: item, defaultActiveKey: 'alarm-info' })}
                onCardOpenMonitorDetail={() => setAlarmDetailCtx({ record: item, defaultActiveKey: 'monitor-info' })}
              />
            ))}
          </div>
        ) : (
          <div className="zht-alarm-rail__table-wrap">
            <Table<ZhtAlarmRecord>
              size="small"
              rowKey="id"
              pagination={false}
              scroll={{ x: 2580 }}
              columns={tableColumns}
              dataSource={filteredOverlayRecords}
              onRow={(record, index) => ({
                onClick: () => setAlarmDetailCtx({ record, defaultActiveKey: 'alarm-info' }),
              })}
              rowClassName={record => {
                const parts = ['zht-alarm-rail-table__row--clickable'];
                if (record.id === locateHighlightedCardId) parts.push('zht-alarm-rail-table__row--highlight');
                return parts.join(' ');
              }}
            />
          </div>
        )}
      </div>
    </>
  );

  const alarmDetailTitle =
    alarmDetailCtx != null
      ? `报警信息 - ${String(alarmDetailCtx.record.alarmName ?? '').trim() || alarmDetailCtx.record.alarmCode || ''}`
      : '报警信息';

  const alarmDetailModal = (
    <Modal
      title={alarmDetailTitle}
      open={alarmDetailCtx != null}
      onCancel={() => setAlarmDetailCtx(null)}
      footer={null}
      width={ZHT_FACILITY_DETAIL_MODAL_WIDTH}
      destroyOnClose
      styles={zhtDetailModalStyles}
      zIndex={1200}
      getContainer={getDetailModalContainer ?? (() => document.body)}
    >
      {alarmDetailCtx ? (
        <AlarmRecordDetailContent record={alarmDetailCtx.record} defaultActiveKey={alarmDetailCtx.defaultActiveKey} />
      ) : null}
    </Modal>
  );

  const eventDetailModal = (
    <Modal
      title={eventDetailCtx ? `事件详情 - ${eventDetailCtx.id}` : '事件详情'}
      open={eventDetailCtx != null}
      onCancel={() => setEventDetailCtx(null)}
      footer={null}
      width={900}
      destroyOnClose
      styles={zhtDetailModalStyles}
      zIndex={1201}
      getContainer={getDetailModalContainer ?? (() => document.body)}
    >
      {eventDetailCtx ? renderUnifiedDetailTabs(eventDetailCtx) : null}
    </Modal>
  );

  const pushConfirmModal = (
    <Modal
      title="确认事件信息"
      open={pushConfirmAlarm != null}
      onCancel={() => setPushConfirmAlarm(null)}
      onOk={() => void handleConfirmPush()}
      okText="确认推送"
      cancelText="取消"
      destroyOnClose
      width={760}
      zIndex={1202}
      getContainer={getDetailModalContainer ?? (() => document.body)}
    >
      <Form
        form={pushConfirmForm}
        layout="vertical"
        initialValues={{
          点位类型: '监测点',
          关联点位: '',
          事件类型: '实时告警',
          事件等级: '一般',
          发生时间: '',
          上报人: '系统推送',
          事件描述: '',
          处置建议: '请尽快核查告警点位并完成处置闭环',
        }}
      >
        <Form.Item name="点位类型" label="点位类型">
          <Select
            disabled
            options={[{ value: '监测点', label: '监测点' }]}
          />
        </Form.Item>
        <Form.Item name="关联点位" label="关联点位">
          <Select
            disabled
            options={[
              {
                value: String(pushConfirmAlarm?.monPointName || ''),
                label: String(pushConfirmAlarm?.monPointName || ''),
              },
            ]}
          />
        </Form.Item>
        <Form.Item name="事件类型" label="事件类型">
          <Select
            disabled
            options={[
              {
                value: '实时告警',
                label: '实时告警',
              },
            ]}
          />
        </Form.Item>
        <Form.Item name="事件等级" label="事件等级" rules={[{ required: true, message: '请选择事件等级' }]}>
          <Select
            options={[
              { value: '一般', label: '一般' },
              { value: '较大', label: '较大' },
              { value: '重大', label: '重大' },
            ]}
          />
        </Form.Item>
        <Form.Item name="发生时间" label="发生时间">
          <Select
            disabled
            options={[
              {
                value: String(pushConfirmAlarm?.currentAlarmTime || ''),
                label: String(pushConfirmAlarm?.currentAlarmTime || ''),
              },
            ]}
          />
        </Form.Item>
        <Form.Item name="上报人" label="上报人">
          <Select
            disabled
            options={[
              {
                value: '系统推送',
                label: '系统推送',
              },
            ]}
          />
        </Form.Item>
        <Form.Item
          name="事件描述"
          label="事件描述"
          rules={[{ required: true, message: '请输入事件描述' }]}
        >
          <Input.TextArea rows={3} maxLength={500} placeholder="可编辑事件描述" />
        </Form.Item>
        <Form.Item
          name="处置建议"
          label="处置建议"
          rules={[{ required: true, message: '请输入处置建议' }]}
        >
          <Input.TextArea rows={3} maxLength={500} placeholder="可编辑处置建议" />
        </Form.Item>
      </Form>
    </Modal>
  );

  if (variant === 'overlay') {
    return (
      <>
        <div
          className="zht-alarm-rail zht-stat-drawer zht-stat-drawer--overlay zht-alarm-rail--expanded"
          role="dialog"
          aria-modal="true"
          aria-labelledby="zht-alarm-overlay-title"
        >
          {overlayInner}
        </div>
        {alarmDetailModal}
        {eventDetailModal}
        {pushConfirmModal}
      </>
    );
  }

  return (
    <>
      <aside className="zht-right-rail zht-right-rail--stat-drawer zht-right-rail--alarm-rail" aria-label="最新报警信息">
        <div className="zht-alarm-rail zht-stat-drawer zht-stat-drawer--rail" role="region" aria-labelledby="zht-alarm-rail-title">
          {railInner}
        </div>
      </aside>
      {alarmDetailModal}
      {eventDetailModal}
      {pushConfirmModal}
    </>
  );
};
