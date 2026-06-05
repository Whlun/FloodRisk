/**
 * 设施详情 —「实时监测」标签页（与泵站同一套布局：设备横滑卡片、物联网元数据、指标大卡、按日期三曲线对比；占位数据）。
 * 支持泵站 / 排口 / 污水厂三种场景（文案与元数据区分，交互与指标与泵站保持一致）。
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Row,
  Col,
  Space,
  Typography,
  Button,
  DatePicker,
  Segmented,
  Table,
  Tooltip,
  Modal,
  Form,
  Empty,
  Alert,
  message,
  Select,
  Card,
} from 'antd';
import {
  WifiOutlined,
  LineChartOutlined,
  BarChartOutlined,
  TableOutlined,
  ThunderboltOutlined,
  QuestionCircleOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import * as echarts from 'echarts';
import {
  type DeviceLinkStatus,
  type MetricAlarmLevel,
  getMetricAlarmLevel,
  getMetricChannelStatus,
  buildSingleSeries,
  buildWQSingleSeries,
  formatMetricValue,
  formatWQMetricValue,
  PUMP_SCENE_METRIC_DEFS,
  WATER_QUALITY_METRIC_DEFS,
} from './facility-realtime-snapshot';

export type { DeviceLinkStatus, MetricAlarmLevel } from './facility-realtime-snapshot';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

/** 选中「电量」大卡时的占位 key（图表与其它监测项同源占位时序，对接后替换） */
const BATTERY_PANEL_KEY = '__battery__';

const EQUIP_TONES = ['pink', 'orange', 'yellow', 'blue', 'green'] as const;

const METRIC_ALARM_RANK: Record<MetricAlarmLevel, number> = {
  offline: 0,
  normal: 1,
  blue: 2,
  yellow: 3,
  orange: 4,
  red: 5,
};

/** 监测项大卡从左到右排序：红→橙→黄→蓝→绿→灰（同档保持原列表顺序） */
const METRIC_CARD_SORT_RANK: Record<MetricAlarmLevel, number> = {
  red: 0,
  orange: 1,
  yellow: 2,
  blue: 3,
  normal: 4,
  offline: 5,
};

function getMetricCardSortRank(
  deviceKey: string,
  metricKey: string,
  deviceHasData: boolean | undefined,
  alarmKeySet: Set<string>,
): number {
  if (!deviceHasData) return METRIC_CARD_SORT_RANK.offline;
  if (alarmKeySet.has(metricKey)) return METRIC_CARD_SORT_RANK.red;
  return METRIC_CARD_SORT_RANK[getMetricAlarmLevel(deviceKey, metricKey)];
}

export interface MockMonitorDevice {
  key: string;
  name: string;
  deviceId: string;
  time: string;
  /** 演示台账遗留字段；横滑卡片 `tone-*` 由当前监测项集合聚合计算，不再直接绑定此值 */
  tone: (typeof EQUIP_TONES)[number];
  linkStatus: DeviceLinkStatus;
  /** 电量百分比，离线设备可为 null */
  batteryPct: number | null;
  /** 为 false 时指标/曲线/表格均为空占位，用于演示无数据态 */
  hasData: boolean;
}

const MOCK_PUMP_DEVICES = (facilityId: string): MockMonitorDevice[] => {
  const id = facilityId.replace(/\D/g, '').slice(-6) || '000001';
  const main: MockMonitorDevice[] = [1, 2, 3, 4, 5].map((n, i) => {
    const linkCycle: DeviceLinkStatus[] = ['running', 'running', 'stopped', 'abnormal', 'running'];
    const batteries: (number | null)[] = [49, 62, null, 11, 88];
    return {
      key: String(n),
      name: `${n}#泵`,
      deviceId: `DEV-${id}-${n}`,
      time: '2025/10/10 11:50:00',
      tone: EQUIP_TONES[i % EQUIP_TONES.length],
      linkStatus: linkCycle[i],
      batteryPct: batteries[i],
      hasData: true,
    };
  });
  // 若干条无监测数据的空占位，便于验收空态样式
  const empty: MockMonitorDevice[] = [
    {
      key: '6',
      name: '备用接入（空占位）',
      deviceId: `DEV-${id}-6`,
      time: '—',
      tone: 'blue',
      linkStatus: 'stopped',
      batteryPct: null,
      hasData: false,
    },
    {
      key: '7',
      name: '未入网终端（空占位）',
      deviceId: `DEV-${id}-7`,
      time: '—',
      tone: 'green',
      linkStatus: 'stopped',
      batteryPct: null,
      hasData: false,
    },
  ];
  return [...main, ...empty];
};

/** 按设备+测点确定性分配通道状态：绿=运行、灰=停止、红=异常 */
/** 台账可选字段：已关联的物联设备 key 列表；未配置时原型默认关联全部示例设备 */
/** 与设备池顺序一致（1#～7#），避免多选保存顺序导致横滑卡片乱序 */
function normalizeLinkedDeviceKeysOrder(keys: string[], pool: MockMonitorDevice[]): string[] {
  const rank = (k: string) => {
    const i = pool.findIndex((p) => p.key === k);
    return i >= 0 ? i : 9999;
  };
  return [...keys].sort((a, b) => rank(a) - rank(b));
}

function getInitialLinkedKeys(record: Record<string, unknown>, pool: MockMonitorDevice[]): string[] {
  const raw = record.iotLinkedDeviceKeys;
  if (Array.isArray(raw)) {
    const keys = (raw as unknown[]).filter((x): x is string => typeof x === 'string');
    return normalizeLinkedDeviceKeysOrder(keys.filter((k) => pool.some((p) => p.key === k)), pool);
  }
  return pool.map((p) => p.key);
}

/** 按已选 key 顺序还原设备行（与生态整治「河长责任区域 · 责任段」已选表一致） */
function getMonitorDevicesByKeys(pool: MockMonitorDevice[], keys: string[] | undefined): MockMonitorDevice[] {
  if (!keys?.length) return [];
  const map = new Map(pool.map((d) => [d.key, d]));
  return keys.map((k) => map.get(k)).filter(Boolean) as MockMonitorDevice[];
}

/**
 * 横滑卡片聚合用：与大卡告警口径对齐。
 * 大卡对「告警通道」一律使用红色 `--alert` 样式；占位哈希虽区分橙/黄/蓝档，若不按红档聚合会出现「数值已红、卡片仍橙」错位。
 * 对接真实四级告警后：若大卡分区着色，此处应改为直接使用接口返回的级别。
 */
function getMetricLevelForEquipStrip(deviceKey: string, metricKey: string, alarmKeySet: Set<string>): MetricAlarmLevel {
  if (alarmKeySet.has(metricKey)) return 'red';
  const lv = getMetricAlarmLevel(deviceKey, metricKey);
  if (lv === 'offline' || lv === 'normal') return lv;
  return 'red';
}

/** 设备横滑卡片：取当前 Tab 展示的全部监测项中最高报警级别对应底色；仅全部监测项离线（或无数据）时 WiFi 离线 */
function getEquipCardToneAndOnline(
  deviceKey: string,
  metricKeys: string[],
  deviceHasData: boolean,
  alarmKeySet: Set<string>,
): { tone: 'red' | 'orange' | 'yellow' | 'blue' | 'green' | 'offline'; online: boolean } {
  if (!deviceHasData || metricKeys.length === 0) {
    return { tone: 'offline', online: false };
  }
  const levels: MetricAlarmLevel[] = metricKeys.map((k) => getMetricLevelForEquipStrip(deviceKey, k, alarmKeySet));
  if (levels.every((l) => l === 'offline')) {
    return { tone: 'offline', online: false };
  }
  let maxLv: MetricAlarmLevel = 'offline';
  for (const l of levels) {
    if (METRIC_ALARM_RANK[l] > METRIC_ALARM_RANK[maxLv]) maxLv = l;
  }
  const toneMap: Record<
    MetricAlarmLevel,
    'red' | 'orange' | 'yellow' | 'blue' | 'green' | 'offline'
  > = {
    offline: 'offline',
    normal: 'green',
    blue: 'blue',
    yellow: 'yellow',
    orange: 'orange',
    red: 'red',
  };
  return { tone: toneMap[maxLv], online: true };
}

/** 与 {@link PUMP_SCENE_METRIC_DEFS} 同源，详情页内沿用既有常量名 */
const PUMP_METRICS = PUMP_SCENE_METRIC_DEFS;

/** 与 {@link WATER_QUALITY_METRIC_DEFS} 同源 */
const WATER_QUALITY_METRICS = WATER_QUALITY_METRIC_DEFS;

function buildWQComparisonSeries(metricKey: string) {
  const { hours, data: today } = buildWQSingleSeries(metricKey);
  const yesterday = today.map((v, i) => {
    const f = 0.94 + 0.05 * Math.sin(i / 4);
    const nv = metricKey === 'ph' ? Math.round(v * f * 10) / 10 : Math.round(v * f * 100) / 100;
    return nv;
  });
  const lastYear = today.map((v, i) => {
    const f = 0.9 + 0.06 * Math.cos(i / 3);
    const nv = metricKey === 'ph' ? Math.round(v * f * 10) / 10 : Math.round(v * f * 100) / 100;
    return nv;
  });
  return {
    hours,
    series: [
      { name: '今日 (2025-10-10)', data: today, color: '#1677ff' },
      { name: '昨日 (2025-10-09)', data: yesterday, color: '#595959' },
      { name: '去年同期 (2024-10-10)', data: lastYear, color: '#73d13d' },
    ],
  };
}

function wqMetricDisplayFor(metricKey: string, hasData: boolean): string {
  if (!hasData) return '—';
  const { data } = buildWQSingleSeries(metricKey);
  const lv = data[data.length - 1];
  return formatWQMetricValue(metricKey, lv);
}

function buildComparisonSeries(metricKey: string) {
  const { hours, data: today } = buildSingleSeries(metricKey);
  const yesterday = today.map((v, i) => Math.round((v * (0.92 + 0.06 * Math.sin(i / 4))) * 10) / 10);
  const lastYear = today.map((v, i) => Math.round((v * (0.88 + 0.08 * Math.cos(i / 3))) * 10) / 10);
  return {
    hours,
    series: [
      { name: '今日 (2025-10-10)', data: today, color: '#1677ff' },
      { name: '昨日 (2025-10-09)', data: yesterday, color: '#595959' },
      { name: '去年同期 (2024-10-10)', data: lastYear, color: '#73d13d' },
    ],
  };
}

/** 电量百分比占位曲线：围绕当前读数小幅波动，末点与卡片一致 */
function buildBatterySingleSeries(lastPct: number) {
  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
  const clamped = Math.max(0, Math.min(100, lastPct));
  const data = hours.map((_, i) => {
    const noise = Math.sin(i / 3) * 4 + Math.cos(i / 5) * 2;
    const v = Math.round(Math.max(0, Math.min(100, clamped + noise)));
    return v;
  });
  data[data.length - 1] = Math.round(clamped);
  return { hours, data };
}

function buildBatteryComparisonSeries(lastPct: number) {
  const { hours, data: today } = buildBatterySingleSeries(lastPct);
  const yesterday = today.map((v, i) =>
    Math.round(Math.max(0, Math.min(100, v * (0.94 + 0.06 * Math.sin(i / 4))))),
  );
  const lastYear = today.map((v, i) =>
    Math.round(Math.max(0, Math.min(100, v * (0.88 + 0.08 * Math.cos(i / 3))))),
  );
  return {
    hours,
    series: [
      { name: '今日 (2025-10-10)', data: today, color: '#1677ff' },
      { name: '昨日 (2025-10-09)', data: yesterday, color: '#595959' },
      { name: '去年同期 (2024-10-10)', data: lastYear, color: '#73d13d' },
    ],
  };
}

function metricDisplayFor(metricKey: string, hasData: boolean) {
  if (!hasData) return '—';
  const { data } = buildSingleSeries(metricKey);
  const lv = data[data.length - 1];
  return formatMetricValue(metricKey, lv);
}

/** 与泵站共用同一套监测布局，仅标题与物联网元数据随场景变化 */
export type FacilityMonitoringScene = 'pump' | 'outlet' | 'plant' | 'water_station';

/** 卡片标题行右侧：绿=在线（至少有一条监测通道在线），灰=离线（全部监测项离线或无数据） */
function DeviceCardOnlineIcon({ online }: { online: boolean }) {
  return (
    <span
      className={`facility-monitoring-equip-online-ico ${online ? 'facility-monitoring-equip-online-ico--on' : 'facility-monitoring-equip-online-ico--off'}`}
      title={online ? '在线' : '离线'}
      aria-label={online ? '在线' : '离线'}
    >
      <WifiOutlined />
    </span>
  );
}

const SCENE_META: Record<
  FacilityMonitoringScene,
  { sectionPrefix: string; product: string; industry: string; installLabel: string; pkPrefix: string; deviceNameSuffix: string }
> = {
  pump: {
    sectionPrefix: '二次泵站',
    product: '二次供水智能网关',
    industry: '供水',
    installLabel: '泵房控制柜',
    pkPrefix: 'PK-PS-',
    deviceNameSuffix: '主控',
  },
  outlet: {
    sectionPrefix: '排口',
    product: '水质在线监测终端',
    industry: '城镇排水',
    installLabel: '排放口现场',
    pkPrefix: 'PK-OF-',
    deviceNameSuffix: '监测主控',
  },
  plant: {
    sectionPrefix: '污水厂',
    product: '污水厂智能物联网网关',
    industry: '污水处理',
    installLabel: '中控室',
    pkPrefix: 'PK-WW-',
    deviceNameSuffix: '监测主控',
  },
  water_station: {
    sectionPrefix: '水质自动站',
    product: '水质在线监测终端',
    industry: '水环境监测',
    installLabel: '站房监测柜',
    pkPrefix: 'PK-WQ-',
    deviceNameSuffix: '分析仪',
  },
};

export const FacilityRealtimePanel: React.FC<{
  record: Record<string, unknown>;
  scene: FacilityMonitoringScene;
  /** 仅展示列表中的监测指标大卡（如报警详情仅当前报警监测项）；不传则展示场景默认全套 */
  visibleMetricKeys?: string[];
  /** 为 true 时不展示物联设备横滑区与「关联物联设备」（报警详情监测 Tab 等场景） */
  hideEquipmentSection?: boolean;
  /** 指定告警指标 key（用于外层联动按钮显示条件） */
  alarmMetricKeys?: string[];
  /** 监测项选中变化回调：返回当前选中项是否告警 */
  onMetricSelectionChange?: (payload: { metricKey: string; isAlarm: boolean }) => void;
  /** 底部操作区附加元素（如溯源分析按钮），与物联设备工具栏同处一行 */
  footerAction?: React.ReactNode;
  /** 关联物联设备弹窗确认后回调（空数组表示已全部解绑）；综合态势地图据此刷新 POI */
  onIotLinkedDeviceKeysChange?: (keys: string[]) => void;
}> = ({
  record,
  scene,
  visibleMetricKeys,
  hideEquipmentSection = false,
  alarmMetricKeys,
  onMetricSelectionChange,
  footerAction,
  onIotLinkedDeviceKeysChange,
}) => {
  const nodeId = String(record.id ?? '');
  const sceneCfg = SCENE_META[scene];

  /** 物联网平台可选设备池（原型固定 7 台演示项，对接后由接口拉取） */
  const allDevicesPool = useMemo(() => MOCK_PUMP_DEVICES(nodeId), [nodeId]);
  const metricsFull = scene === 'water_station' ? WATER_QUALITY_METRICS : PUMP_METRICS;
  const metrics = useMemo(() => {
    if (!visibleMetricKeys?.length) return metricsFull;
    const list = visibleMetricKeys
      .map((k) => metricsFull.find((m) => m.key === k))
      .filter(Boolean) as typeof metricsFull;
    return list.length > 0 ? list : metricsFull;
  }, [metricsFull, visibleMetricKeys]);

  const [linkedKeys, setLinkedKeys] = useState<string[]>(() => getInitialLinkedKeys(record, MOCK_PUMP_DEVICES(nodeId)));
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkForm] = Form.useForm<{ keys: string[] }>();
  // 使用 useWatch 监听表单 keys 变化，确保 Modal 内表格及时刷新
  const watchedKeys = Form.useWatch('keys', linkForm);
  /** 兼容父层回调引用变化：统一走 ref，避免 effect 依赖函数身份导致重复触发 */
  const onIotLinkedDeviceKeysChangeRef = useRef(onIotLinkedDeviceKeysChange);
  useEffect(() => {
    onIotLinkedDeviceKeysChangeRef.current = onIotLinkedDeviceKeysChange;
  }, [onIotLinkedDeviceKeysChange]);

  /** 台账 `iotLinkedDeviceKeys` 或设施切换时与详情数据源同步（含地图侧覆盖写入） */
  const recordIotLinkedSig = JSON.stringify(record.iotLinkedDeviceKeys ?? '__unset__');
  useEffect(() => {
    setLinkedKeys(getInitialLinkedKeys(record, allDevicesPool));
    // 仅以签名驱动同步：避免父级反复传入新 record 引用时误重置弹窗内已选关联
  }, [nodeId, allDevicesPool, recordIotLinkedSig]);

  /**
   * 以 `linkedKeys` 作为唯一同步源：无论来自保存动作还是后续状态回放，
   * 都保证把最新关联关系回写给地图侧 overrides（避免详情与 POI 状态短暂不一致）。
   */
  useEffect(() => {
    onIotLinkedDeviceKeysChangeRef.current?.(linkedKeys);
  }, [linkedKeys]);

  const linkedDevices = useMemo(() => {
    const map = new Map(allDevicesPool.map((d) => [d.key, d]));
    return linkedKeys.map((k) => map.get(k)).filter(Boolean) as MockMonitorDevice[];
  }, [allDevicesPool, linkedKeys]);

  const [activeDevKey, setActiveDevKey] = useState(linkedDevices[0]?.key ?? '1');
  const [metricKey, setMetricKey] = useState(scene === 'water_station' ? 'cod' : 'inP');
  const alarmMetricKeySet = useMemo(
    () => new Set((alarmMetricKeys ?? []).map(k => String(k).trim()).filter(Boolean)),
    [alarmMetricKeys],
  );
  const activeDevice = useMemo(
    () => linkedDevices.find((d) => d.key === activeDevKey) ?? linkedDevices[0],
    [linkedDevices, activeDevKey],
  );

  const isMetricAlert = useCallback(
    (key: string) => {
      if (key === BATTERY_PANEL_KEY) return false;
      if (!activeDevice?.hasData) return false;
      if (alarmMetricKeySet.has(key)) return true;
      return getMetricChannelStatus(activeDevKey, key) === 'abnormal';
    },
    [activeDevice?.hasData, alarmMetricKeySet, activeDevKey],
  );

  /** 当前选中设备下，监测项大卡按告警/链路档位排序（电量固定在最后） */
  const sortedMetrics = useMemo(() => {
    const indexed = metrics.map((m, i) => ({ m, i }));
    indexed.sort((a, b) => {
      const ra = getMetricCardSortRank(activeDevKey, a.m.key, activeDevice?.hasData, alarmMetricKeySet);
      const rb = getMetricCardSortRank(activeDevKey, b.m.key, activeDevice?.hasData, alarmMetricKeySet);
      if (ra !== rb) return ra - rb;
      return a.i - b.i;
    });
    return indexed.map((x) => x.m);
  }, [metrics, activeDevKey, activeDevice?.hasData, alarmMetricKeySet]);

  useEffect(() => {
    if (!onMetricSelectionChange) return;
    onMetricSelectionChange({
      metricKey,
      isAlarm: isMetricAlert(metricKey),
    });
  }, [metricKey, isMetricAlert, onMetricSelectionChange]);

  const [dateMode, setDateMode] = useState<'date' | 'range'>('date');

  /** 外部收窄指标列表时，同步当前选中指标，避免曲线与大卡错位 */
  useEffect(() => {
    if (metrics.length === 0) return;
    if (metricKey === BATTERY_PANEL_KEY) return;
    if (!metrics.some((m) => m.key === metricKey)) {
      setMetricKey(metrics[0].key);
    }
  }, [metrics, metricKey]);

  /** 切换设备或电量缺失时退出电量面板，避免卡在无效选中态 */
  useEffect(() => {
    if (metricKey !== BATTERY_PANEL_KEY) return;
    if (activeDevice?.batteryPct === null || activeDevice?.batteryPct === undefined) {
      setMetricKey(metrics[0]?.key ?? (scene === 'water_station' ? 'cod' : 'inP'));
    }
  }, [activeDevice?.batteryPct, metricKey, metrics, scene]);
  const [chartKind, setChartKind] = useState<'line' | 'bar' | 'table'>('line');
  /** 图表容器：用回调 ref 在节点卸载时同步 dispose，避免 useEffect 晚于 DOM 删除导致 React removeChild 与 ECharts 冲突 */
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartInst = useRef<echarts.ECharts | null>(null);
  const bindChartContainerRef = useCallback((el: HTMLDivElement | null) => {
    chartContainerRef.current = el;
    if (el === null) {
      chartInst.current?.dispose();
      chartInst.current = null;
    }
  }, []);

  useEffect(() => {
    if (linkedDevices.length === 0) return;
    if (!linkedDevices.some((d) => d.key === activeDevKey)) {
      setActiveDevKey(linkedDevices[0].key);
    }
  }, [linkedDevices, activeDevKey]);

  // 所有场景统一逻辑：仅当关联2个及以上设备时才展示横滑卡片区（单个设备不展示顶部卡片）
  const shouldHideEquipmentSection = hideEquipmentSection || linkedDevices.length < 2;

  const openLinkModal = useCallback(() => {
    linkForm.setFieldsValue({ keys: linkedKeys });
    setLinkModalOpen(true);
  }, [linkForm, linkedKeys]);

  const handleLinkModalOk = useCallback(() => {
    // 返回 Promise，便于 Modal onOk 在校验通过后再关闭，并与地图 overrides 回调顺序可靠对齐
    return linkForm.validateFields().then((values) => {
      const next = normalizeLinkedDeviceKeysOrder(values.keys ?? [], allDevicesPool);
      setLinkedKeys(next);
      setLinkModalOpen(false);
      message.success('物联设备关联已更新（原型同步地图 POI；对接后写入台账/平台）');
    });
  }, [allDevicesPool, linkForm]);

  const metaRows = useMemo(() => {
    const defaultName =
      scene === 'water_station'
        ? '水质监测站'
        : scene === 'pump'
          ? '泵站'
          : scene === 'outlet'
            ? '排口'
            : '污水厂';
    const dev = activeDevice;
    const recName = String(
      record.name ??
        record.pustName ??
        record['入河入海排污口名称'] ??
        record['污水处理厂名称'] ??
        defaultName,
    );
    const devLabel = dev ? `${dev.name}${sceneCfg.deviceNameSuffix}` : `${recName}${sceneCfg.deviceNameSuffix}`;
    const noData = dev && !dev.hasData;
    return [
      { label: '设备编码', value: noData ? '—' : dev?.deviceId ?? `IOT-${nodeId}` },
      {
        label: '设备名称',
        value: devLabel,
      },
      { label: '设备密钥', value: '••••••••••••（脱敏）' },
      { label: '所属产品', value: sceneCfg.product },
      { label: '所属行业', value: sceneCfg.industry },
      { label: '产品密钥', value: `${sceneCfg.pkPrefix}${nodeId.slice(-6)}` },
      {
        label: '监测点',
        value: String(
          record.pustLoc ??
          record.addr ??
          record['入河入海排污口详细地址'] ??
          record['污水处理厂地址'] ??
          '—',
        ),
      },
      { label: '所在区县', value: '韶山市' },
      { label: '所在街道', value: '清溪镇（示例）' },
      { label: '安装位置', value: sceneCfg.installLabel },
      { label: '创建时间', value: '2024-03-20 09:00:00' },
      { label: '安装时间', value: '2024-04-10 10:00:00' },
      { label: '采集频率', value: noData ? '—' : '5min/次' },
    ];
  }, [nodeId, record, scene, sceneCfg, activeDevice]);

  const viewingBattery = metricKey === BATTERY_PANEL_KEY;

  const currentMetric = useMemo(() => {
    if (viewingBattery) return { key: BATTERY_PANEL_KEY, label: '电量', unit: '%' };
    return metrics.find((m) => m.key === metricKey) ?? metrics[0]!;
  }, [viewingBattery, metricKey, metrics]);

  const single = useMemo(() => {
    if (viewingBattery) {
      const pct = activeDevice?.batteryPct;
      return buildBatterySingleSeries(typeof pct === 'number' ? pct : 0);
    }
    return scene === 'water_station' ? buildWQSingleSeries(metricKey) : buildSingleSeries(metricKey);
  }, [scene, metricKey, viewingBattery, activeDevice?.batteryPct]);

  const comparison = useMemo(() => {
    if (viewingBattery) {
      const pct = activeDevice?.batteryPct;
      return buildBatteryComparisonSeries(typeof pct === 'number' ? pct : 0);
    }
    return scene === 'water_station' ? buildWQComparisonSeries(metricKey) : buildComparisonSeries(metricKey);
  }, [scene, metricKey, viewingBattery, activeDevice?.batteryPct]);

  const renderChart = useCallback(() => {
    if (!chartContainerRef.current || chartKind === 'table') return;
    // 无数据时隐藏图表但 DOM 仍挂载，此处不绘制
    if (activeDevice && !activeDevice.hasData) return;
    if (!chartInst.current) {
      chartInst.current = echarts.init(chartContainerRef.current);
    }
    const inst = chartInst.current;
    const isLine = chartKind === 'line';
    const useCompare = dateMode === 'date';

    const seriesList = useCompare
      ? comparison.series.map((s) => ({
          type: isLine ? 'line' : 'bar',
          name: s.name,
          data: s.data,
          smooth: isLine,
          symbol: isLine ? 'circle' : undefined,
          symbolSize: isLine ? 5 : undefined,
          lineStyle: isLine ? { width: 2, color: s.color } : undefined,
          itemStyle: { color: s.color },
          barMaxWidth: 16,
        }))
      : [
          {
            type: isLine ? 'line' : 'bar',
            name: '监测值',
            data: single.data,
            smooth: isLine,
            symbol: isLine ? 'circle' : undefined,
            symbolSize: isLine ? 6 : undefined,
            lineStyle: isLine ? { width: 2, color: '#1677ff' } : undefined,
            itemStyle: { color: '#1677ff' },
            barMaxWidth: 22,
          },
        ];

    const option: echarts.EChartsOption = {
      grid: { left: 56, right: 56, top: 32, bottom: 28 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      xAxis: { type: 'category', data: single.hours, boundaryGap: !isLine },
      yAxis: {
        type: 'value',
        ...(metricKey === BATTERY_PANEL_KEY
          ? { min: 0, max: 100, scale: false }
          : { scale: true }),
        name: currentMetric.unit ? `单位：${currentMetric.unit}` : undefined,
        nameTextStyle: { fontSize: 11, color: '#8c8c8c' },
      },
      series: seriesList as echarts.SeriesOption[],
    };
    inst.setOption(option, true);
  }, [
    activeDevice,
    chartKind,
    comparison.series,
    currentMetric.unit,
    dateMode,
    metricKey,
    scene,
    single.data,
    single.hours,
  ]);

  /** 仅在曲线/柱状可见时保留实例；表格或无数据时 dispose，但图表 DOM 节点保持挂载避免 Tabs 卸载顺序问题 */
  const chartDomShouldHoldInstance = chartKind !== 'table' && activeDevice?.hasData !== false;

  useLayoutEffect(() => {
    if (!chartDomShouldHoldInstance) {
      chartInst.current?.dispose();
      chartInst.current = null;
      return;
    }
    renderChart();
    const ro = new ResizeObserver(() => chartInst.current?.resize());
    if (chartContainerRef.current) ro.observe(chartContainerRef.current);
    return () => {
      ro.disconnect();
    };
  }, [chartDomShouldHoldInstance, renderChart]);

  const tableColumns =
    dateMode === 'date'
      ? [
          { title: '时间', dataIndex: 't', key: 't', width: 80 },
          { title: '今日', dataIndex: 'v0', key: 'v0' },
          { title: '昨日', dataIndex: 'v1', key: 'v1' },
          { title: '去年同期', dataIndex: 'v2', key: 'v2' },
        ]
      : [
          { title: '时间', dataIndex: 't', key: 't' },
          { title: currentMetric.label, dataIndex: 'v', key: 'v' },
        ];

  const tableDataSource = single.hours.map((h, i) =>
    dateMode === 'date'
      ? {
          key: h,
          t: h,
          v0: comparison.series[0].data[i],
          v1: comparison.series[1].data[i],
          v2: comparison.series[2].data[i],
        }
      : { key: h, t: h, v: single.data[i] },
  );

  const dateHint =
    dateMode === 'date'
      ? '「按日期」展示今日、昨日、去年同期三条曲线，便于同比分析。'
      : '「按范围」在所选时段内展示单条聚合曲线。';

  const metricCardsClass =
    'facility-monitoring-metric-cards' +
    (metrics.length === 1 ? ' facility-monitoring-metric-cards--single-metric' : '');

  /** 与上方指标大卡一致，用于横滑卡片底色/WiFi 聚合（含 visibleMetricKeys 收窄场景） */
  const metricKeysForEquipCard = useMemo(() => metrics.map((m) => m.key), [metrics]);

  return (
    <div
      className={
        `facility-monitoring-realtime facility-monitoring-realtime--v2` +
        (shouldHideEquipmentSection ? ' facility-monitoring-realtime--no-equipment' : '')
      }
    >
      {!shouldHideEquipmentSection ? (
        <div className="facility-monitoring-equipment-section">
          {/* 使用显示切换代替条件卸载 Empty，减轻 Modal + Tabs 下 antd 插图节点的 removeChild 问题 */}
          <div hidden={linkedDevices.length > 0}>
            <Empty
              className="facility-monitoring-equip-empty"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span>
                  尚未关联物联设备。请点击「关联物联设备」从平台清单中多选绑定，
                  <br />
                  保存后可在此切换卡片查看各设备数据；支持随时增删、修改关联。
                </span>
              }
            />
          </div>
          {/* 设备卡片横滑区：只要有设备就显示（包括单个设备） */}
          <div style={{ display: linkedDevices.length > 0 ? 'block' : 'none' }}>
            <div className="facility-monitoring-equip-scroll">
              {linkedDevices.map((d) => {
                const { tone: equipTone, online: equipOnline } = getEquipCardToneAndOnline(
                  d.key,
                  metricKeysForEquipCard,
                  d.hasData,
                  alarmMetricKeySet,
                );
                return (
                <button
                  key={d.key}
                  type="button"
                  className={`facility-monitoring-equip-card tone-${equipTone} ${activeDevKey === d.key ? 'active' : ''}`}
                  onClick={() => setActiveDevKey(d.key)}
                >
                  <div className="facility-monitoring-equip-card-head">
                    <ThunderboltOutlined className="facility-monitoring-equip-ico" />
                    <span className="facility-monitoring-equip-name">{d.name}</span>
                    <DeviceCardOnlineIcon online={equipOnline} />
                  </div>
                  <div className="facility-monitoring-equip-foot">
                    <span className="facility-monitoring-equip-time">{d.hasData ? d.time : '暂无数据'}</span>
                  </div>
                </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* 设备信息区域：所有场景（包括水质监测站）统一逻辑，没有设备时显示提示信息，不展示设备元数据 */}
      {linkedDevices.length === 0 ? (
        <Alert
          type="info"
          showIcon
          message="完成物联设备关联后，将展示设备元数据、指标与曲线（当前为物联网平台占位数据）。"
          className="facility-monitoring-link-alert"
        />
      ) : (
      <div className="facility-monitoring-device-info-section">
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={8} xxl={7}>
            <div className="facility-monitoring-side-meta facility-monitoring-side-meta--striped">
              {metaRows.map((r) => (
                <div key={r.label} className="facility-monitoring-meta-row">
                  <span className="facility-monitoring-meta-label">{r.label}</span>
                  <span className="facility-monitoring-meta-value">{r.value}</span>
                </div>
              ))}
            </div>
          </Col>
          <Col xs={24} xl={16} xxl={17}>
            <div className="facility-monitoring-main">
              <div className={metricCardsClass}>
                {/* 监测项大卡（红→橙→黄→蓝→绿→灰） */}
                {sortedMetrics.map((m) => {
                  const active = metricKey === m.key;
                  const display =
                    scene === 'water_station'
                      ? wqMetricDisplayFor(m.key, activeDevice?.hasData !== false)
                      : metricDisplayFor(m.key, activeDevice?.hasData !== false);
                  const isPrimary = !!m.primary;
                  const chStatus = !activeDevice?.hasData ? 'stopped' : getMetricChannelStatus(activeDevKey, m.key);
                  const metricAlarm = isMetricAlert(m.key);
                  const valStatusClass =
                    metricAlarm
                      ? 'facility-monitoring-metric-card-val--alert'
                      : chStatus === 'running'
                      ? 'facility-monitoring-metric-card-val--run'
                      : chStatus === 'stopped'
                        ? 'facility-monitoring-metric-card-val--stop'
                        : 'facility-monitoring-metric-card-val--alert';
                  return (
                    <button
                      key={m.key}
                      type="button"
                      className={`facility-monitoring-metric-card ${active ? 'active' : ''} ${isPrimary ? 'primary' : ''}`}
                      onClick={() => setMetricKey(m.key)}
                    >
                      <div className="facility-monitoring-metric-card-label">{m.label}</div>
                      <div className={`facility-monitoring-metric-card-val ${valStatusClass}`}>{display}</div>
                      {m.unit ? <div className="facility-monitoring-metric-card-unit">{m.unit}</div> : null}
                    </button>
                  );
                })}
                {/* 电量作为监测项之一，与其他监测项在同一行横向排列 */}
                {activeDevice?.batteryPct !== null && activeDevice?.batteryPct !== undefined ? (
                  <button
                    type="button"
                    className={`facility-monitoring-metric-card ${metricKey === BATTERY_PANEL_KEY ? 'active' : ''}`}
                    onClick={() => setMetricKey(BATTERY_PANEL_KEY)}
                  >
                    <div className="facility-monitoring-metric-card-label">电量</div>
                    <div className="facility-monitoring-metric-card-val facility-monitoring-metric-card-val--run">
                      {activeDevice.batteryPct}
                    </div>
                    <div className="facility-monitoring-metric-card-unit">%</div>
                  </button>
                ) : null}
              </div>

              <div className="facility-monitoring-toolbar">
                <Space wrap size={[8, 8]} align="center">
                  <Segmented<'date' | 'range'>
                    size="small"
                    className="facility-monitoring-date-mode"
                    value={dateMode}
                    onChange={(v) => setDateMode(v)}
                    options={[
                      { label: '按日期', value: 'date' },
                      { label: '按范围', value: 'range' },
                    ]}
                  />
                  <Tooltip title={dateHint}>
                    <QuestionCircleOutlined className="facility-monitoring-hint-ico" />
                  </Tooltip>
                  {dateMode === 'date' ? (
                    <DatePicker placeholder="请选择日期" style={{ minWidth: 180 }} />
                  ) : (
                    <RangePicker placeholder={['开始日期', '结束日期']} style={{ minWidth: 260 }} />
                  )}
                  <Button type="primary" className="search-btn">
                    查询
                  </Button>
                </Space>
                <Space className="facility-monitoring-chart-tools">
                  <Button
                    type={chartKind === 'line' ? 'link' : 'text'}
                    icon={<LineChartOutlined />}
                    onClick={() => setChartKind('line')}
                  />
                  <Button
                    type={chartKind === 'bar' ? 'link' : 'text'}
                    icon={<BarChartOutlined />}
                    onClick={() => setChartKind('bar')}
                  />
                  <Button
                    type={chartKind === 'table' ? 'link' : 'text'}
                    icon={<TableOutlined />}
                    onClick={() => setChartKind('table')}
                  />
                </Space>
              </div>

              {dateMode === 'date' && chartKind !== 'table' && activeDevice?.hasData !== false && (
                <div className="facility-monitoring-chart-legend-inline">
                  {comparison.series.map((s) => (
                    <span key={s.name} className="facility-monitoring-legend-item">
                      <i className="facility-monitoring-legend-dot" style={{ background: s.color }} />
                      {s.name}
                    </span>
                  ))}
                </div>
              )}

              <div
                className={
                  `facility-monitoring-chart-area` +
                  (chartKind === 'table' ? ' facility-monitoring-chart-area--table' : '')
                }
              >
                {/* ECharts 容器常驻（有设备详情分支内），曲线/表格/无数据仅切换显示与遮罩，避免条件卸载与 Modal+Tabs 冲突 */}
                <div
                  ref={bindChartContainerRef}
                  className="facility-monitoring-echart"
                  hidden={chartKind === 'table' || !!(activeDevice && !activeDevice.hasData)}
                />
                {chartKind === 'table' ? (
                  <Table
                    className="facility-monitoring-data-table"
                    size="small"
                    pagination={false}
                    scroll={{ x: dateMode === 'date' ? 420 : undefined, y: 150 }}
                    columns={tableColumns}
                    dataSource={tableDataSource}
                  />
                ) : null}
                <div
                  className="facility-monitoring-chart-empty facility-monitoring-chart-empty--overlay"
                  hidden={!(activeDevice && !activeDevice.hasData && chartKind !== 'table')}
                >
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="暂无监测数据（空占位，对接时序库后展示曲线）"
                  />
                </div>
              </div>

            </div>
          </Col>
        </Row>
      </div>
      )}

      {/* 无设备时的 Empty 提示：所有场景统一显示（横滑区隐藏时） */}
      {linkedDevices.length === 0 ? (
        <Empty
          className="facility-monitoring-equip-empty"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span>
              尚未关联物联设备。请点击「关联物联设备」从平台清单中多选绑定，
              <br />
              保存后可在此切换卡片查看各设备数据；支持随时增删、修改关联。
            </span>
          }
        />
      ) : null}

      {/* 物联设备关联工具栏：所有场景统一显示 */}
      <div className="facility-monitoring-equip-toolbar">
        <Space align="center" wrap style={{ width: '100%', justifyContent: 'space-between' }}>
          <Text type="secondary">
            已关联 <Text strong>{linkedDevices.length}</Text> 台物联设备；非全部设施默认接入，可自行配置。
          </Text>
          <Space align="center">
            <Button type="primary" icon={<ApiOutlined />} onClick={openLinkModal}>
              关联物联设备
            </Button>
            {scene === 'water_station' ? footerAction : null}
          </Space>
        </Space>
      </div>

      {/* 关联设备弹窗：水质监测站独立展示，其他场景按原逻辑 */}
      {scene === 'water_station' ? (
        <Modal
          title="关联物联设备"
          open={linkModalOpen}
          onCancel={() => setLinkModalOpen(false)}
          onOk={handleLinkModalOk}
          width={520}
          destroyOnClose
          okText="保存"
          cancelText="取消"
        >
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            从物联平台已入网设备清单中选择与本设施绑定的终端；交互与「河湖长制 · 河长责任区域」责任段多选一致：上方下拉可搜索多选，下方表格汇总已选并可单行移除；保存后上方卡片仅展示已关联设备。
          </Text>
          <Form form={linkForm} layout="vertical">
            <Form.Item name="keys" label="物联设备">
              <Select
                mode="multiple"
                placeholder="请选择物联设备（可多选，对接平台清单）"
                style={{ width: '100%' }}
                options={allDevicesPool.map((d) => ({
                  value: d.key,
                  // 名称 + 编码写入 label，便于 showSearch 一并过滤
                  label: `${d.name} ${d.deviceId}`,
                }))}
                showSearch
                optionFilterProp="label"
                maxTagCount="responsive"
              />
            </Form.Item>
            {/* 使用 watchedKeys 确保表格数据及时刷新 */}
            <Card size="small" title={`已选物联设备（${getMonitorDevicesByKeys(allDevicesPool, watchedKeys).length}）`} style={{ marginBottom: 0 }}>
              <Table
                size="small"
                rowKey="key"
                pagination={false}
                locale={{ emptyText: '暂未选择设备，请在上方搜索并多选' }}
                dataSource={getMonitorDevicesByKeys(allDevicesPool, watchedKeys)}
                scroll={{ x: 420 }}
                columns={[
                  { title: '设备名称', dataIndex: 'name', ellipsis: true },
                  { title: '设备编码', dataIndex: 'deviceId', width: 168, ellipsis: true },
                  {
                    title: '操作',
                    key: 'rm',
                    width: 72,
                    fixed: 'right' as const,
                    render: (_: unknown, r: MockMonitorDevice) => (
                      <Button
                        type="link"
                        size="small"
                        className="action-btn edit"
                        onClick={() => {
                          const cur = (watchedKeys as string[]) ?? [];
                          const next = cur.filter((k) => k !== r.key);
                          linkForm.setFieldsValue({ keys: next });
                        }}
                      >
                        移除
                      </Button>
                    ),
                  },
                ]}
              />
            </Card>
          </Form>
        </Modal>
      ) : !shouldHideEquipmentSection ? (
        <Modal
          title="关联物联设备"
          open={linkModalOpen}
          onCancel={() => setLinkModalOpen(false)}
          onOk={handleLinkModalOk}
          width={520}
          destroyOnClose
          okText="保存"
          cancelText="取消"
        >
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            从物联平台已入网设备清单中选择与本设施绑定的终端；交互与「河湖长制 · 河长责任区域」责任段多选一致：上方下拉可搜索多选，下方表格汇总已选并可单行移除；保存后上方卡片仅展示已关联设备。
          </Text>
          <Form form={linkForm} layout="vertical">
            <Form.Item name="keys" label="物联设备">
              <Select
                mode="multiple"
                placeholder="请选择物联设备（可多选，对接平台清单）"
                style={{ width: '100%' }}
                options={allDevicesPool.map((d) => ({
                  value: d.key,
                  // 名称 + 编码写入 label，便于 showSearch 一并过滤
                  label: `${d.name} ${d.deviceId}`,
                }))}
                showSearch
                optionFilterProp="label"
                maxTagCount="responsive"
              />
            </Form.Item>
            {/* 使用 watchedKeys 确保表格数据及时刷新 */}
            <Card size="small" title={`已选物联设备（${getMonitorDevicesByKeys(allDevicesPool, watchedKeys).length}）`} style={{ marginBottom: 0 }}>
              <Table
                size="small"
                rowKey="key"
                pagination={false}
                locale={{ emptyText: '暂未选择设备，请在上方搜索并多选' }}
                dataSource={getMonitorDevicesByKeys(allDevicesPool, watchedKeys)}
                scroll={{ x: 420 }}
                columns={[
                  { title: '设备名称', dataIndex: 'name', ellipsis: true },
                  { title: '设备编码', dataIndex: 'deviceId', width: 168, ellipsis: true },
                  {
                    title: '操作',
                    key: 'rm',
                    width: 72,
                    fixed: 'right' as const,
                    render: (_: unknown, r: MockMonitorDevice) => (
                      <Button
                        type="link"
                        size="small"
                        className="action-btn edit"
                        onClick={() => {
                          const cur = (watchedKeys as string[]) ?? [];
                          const next = cur.filter((k) => k !== r.key);
                          linkForm.setFieldsValue({ keys: next });
                        }}
                      >
                        移除
                      </Button>
                    ),
                  },
                ]}
              />
            </Card>
          </Form>
        </Modal>
      ) : (
        /* 其他场景（泵站、排口、污水厂）的关联设备弹窗 */
        <Modal
          title="关联物联设备"
          open={linkModalOpen}
          onCancel={() => setLinkModalOpen(false)}
          onOk={handleLinkModalOk}
          width={520}
          destroyOnClose
          okText="保存"
          cancelText="取消"
        >
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            从物联平台已入网设备清单中选择与本设施绑定的终端；交互与「河湖长制 · 河长责任区域」责任段多选一致：上方下拉可搜索多选，下方表格汇总已选并可单行移除；保存后上方卡片仅展示已关联设备。
          </Text>
          <Form form={linkForm} layout="vertical">
            <Form.Item name="keys" label="物联设备">
              <Select
                mode="multiple"
                placeholder="请选择物联设备（可多选，对接平台清单）"
                style={{ width: '100%' }}
                options={allDevicesPool.map((d) => ({
                  value: d.key,
                  label: `${d.name} ${d.deviceId}`,
                }))}
                showSearch
                optionFilterProp="label"
                maxTagCount="responsive"
              />
            </Form.Item>
            {/* 使用 watchedKeys 确保表格数据及时刷新 */}
            <Card size="small" title={`已选物联设备（${getMonitorDevicesByKeys(allDevicesPool, watchedKeys).length}）`} style={{ marginBottom: 0 }}>
              <Table
                size="small"
                rowKey="key"
                pagination={false}
                locale={{ emptyText: '暂未选择设备，请在上方搜索并多选' }}
                dataSource={getMonitorDevicesByKeys(allDevicesPool, watchedKeys)}
                scroll={{ x: 420 }}
                columns={[
                  { title: '设备名称', dataIndex: 'name', ellipsis: true },
                  { title: '设备编码', dataIndex: 'deviceId', width: 168, ellipsis: true },
                  {
                    title: '操作',
                    key: 'rm',
                    width: 72,
                    fixed: 'right' as const,
                    render: (_: unknown, r: MockMonitorDevice) => (
                      <Button
                        type="link"
                        size="small"
                        className="action-btn edit"
                        onClick={() => {
                          const cur = (watchedKeys as string[]) ?? [];
                          const next = cur.filter((k) => k !== r.key);
                          linkForm.setFieldsValue({ keys: next });
                        }}
                      >
                        移除
                      </Button>
                    ),
                  },
                ]}
              />
            </Card>
          </Form>
        </Modal>
      )}
    </div>
  );
};

export const PumpStationMonitoringTabContent: React.FC<{
  record: Record<string, unknown>;
  onIotLinkedDeviceKeysChange?: (keys: string[]) => void;
}> = ({ record, onIotLinkedDeviceKeysChange }) => (
  <FacilityRealtimePanel record={record} scene="pump" onIotLinkedDeviceKeysChange={onIotLinkedDeviceKeysChange} />
);

export const OutletMonitoringTabContent: React.FC<{
  record: Record<string, unknown>;
  onIotLinkedDeviceKeysChange?: (keys: string[]) => void;
}> = ({ record, onIotLinkedDeviceKeysChange }) => (
  <FacilityRealtimePanel record={record} scene="outlet" onIotLinkedDeviceKeysChange={onIotLinkedDeviceKeysChange} />
);

export const PlantMonitoringTabContent: React.FC<{
  record: Record<string, unknown>;
  onIotLinkedDeviceKeysChange?: (keys: string[]) => void;
}> = ({ record, onIotLinkedDeviceKeysChange }) => (
  <FacilityRealtimePanel record={record} scene="plant" onIotLinkedDeviceKeysChange={onIotLinkedDeviceKeysChange} />
);

/** 综合态势 · 地图水质监测站详情「实时监测」：与泵站同源布局（物联卡片 + 设备信息 + 指标大卡 + 曲线），指标为 COD/氨氮/pH/总磷/总氮 */
export const WaterQualityStationMonitoringTabContent: React.FC<{
  record: Record<string, unknown>;
  alarmMetricKeys?: string[];
  onMetricSelectionChange?: (payload: { metricKey: string; isAlarm: boolean }) => void;
  /** 底部操作区附加元素（如溯源分析按钮），与物联设备工具栏同处一行 */
  footerAction?: React.ReactNode;
  /** 关联物联保存后回调（综合态势地图刷新水质监测站 POI） */
  onIotLinkedDeviceKeysChange?: (keys: string[]) => void;
}> = ({ record, alarmMetricKeys, onMetricSelectionChange, footerAction, onIotLinkedDeviceKeysChange }) => (
  <FacilityRealtimePanel
    record={record}
    scene="water_station"
    alarmMetricKeys={alarmMetricKeys}
    onMetricSelectionChange={onMetricSelectionChange}
    footerAction={footerAction}
    onIotLinkedDeviceKeysChange={onIotLinkedDeviceKeysChange}
  />
);
