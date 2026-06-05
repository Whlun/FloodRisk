/**
 * @name 综合态势
 *
 * 根据 Axure HTML 导出「综合态势」页还原的大屏一张图：左侧多组指标卡片、MapLibre 底图与点位、**地图左上角纵向工具条**、**右侧栏**（默认 **分析看板**：断面达标、汛期污染强度、排口报警日历；工具条「搜索」时切换为 **地图搜索面板** `ZhtMapSearchPanel`；经系统壳顶栏「报警」时切换 **`ZhtAlarmRailPanel`**，与左侧指标 rail 同占位逻辑）（无顶栏）。
 *
 * 参考资料：
 * - Axure：`/Users/whlun/Documents/综合态势原型HTML导出/综合态势.html`
 * - 视觉：`src/prototypes/生态整治/style.css`（同源色板）
 * - 地图实现：`zhtMaplibreBoard.tsx`（默认底图 OpenFreeMap Liberty，与工业园区浅色矢量一致；可选影像栅格；点位与 **韶山水环境设施管理系统** 泵站/排口/污水厂台账同源，详情弹窗与列表一致）
 */

import './style.css';
import '../shared/ant-table-text-no-overlap.css';
/** 设施详情 Tab + 实时监测/视频样式（从设施管理 style 抽取，与列表详情一致） */
import './facility-detail-panel.css';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { message } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import AppConfigProvider from '../../common/AppConfigProvider';
import { ZhtMaplibreBoard } from './zhtMaplibreBoard';
import { ZhtLeftStatDrawer } from './zhtLeftStatDrawer';
import {
  getZhtLeftStatDrawerCards,
  isLeftStatItemNonInteractive,
  type ZhtStatDrawerMapFocus,
  type ZhtStatDrawerPeekPoi,
  type ZhtStatDrawerPoiClick,
} from './zhtLeftStatDrawerData';
import { ZhtPipeLineBottomDrawer } from './zhtPipeLineBottomDrawer';
import { useShellAlarmRailBridgeOptional } from '../韶山高新区水环境综合整治一张图/shellAlarmRailBridge';
import { ZhtAlarmRailPanel } from './zhtAlarmRailPanel';
import { zhtResolveDetailModalContainer } from './zhtDetailModalShared';
import { isZhtPipeLineLeftStatLabel } from './zhtPipeLineLeftStat';
import { countPipeNodesByNodeType, sumPipeLineKmByCategory } from '../韶山水环境设施管理系统/pipe-network-demo-data';
import { ZhtMapSearchPanel } from './ZhtMapSearchPanel';
import { ZhtRightDashboard, type PollutionRowLocatePayload } from './zhtRightDashboard';
import type { ZhtUnifiedSearchPoint } from './zhtSearchUnifiedData';
import type { ZhtSearchMapOverlay, ZhtSpatialQueryPreview } from './zhtSpatialSearchGeo';
import { DEFAULT_ZHT_LAYER_CONTROL, type ZhtLayerControlState } from './zhtLayerControlState';

/** 与设计稿一致：仅「生态整治」为绿段；其余为蓝段；卡片不展示黄色角标 */
type StatTone = 'green' | 'blue';
type StatItem = { label: string; value: string | number };
type StatSection = { title: string; tone: StatTone; items: StatItem[] };

/** 左侧卡片主数值：雨污管网为台账汇总管长(km)，其余与右侧抽屉条数一致；无抽屉数据的项为 0 */
function zhtLeftStatCardValue(itemLabel: string): string | number {
  if (itemLabel === '雨水管网(km)') return sumPipeLineKmByCategory('1').toFixed(2);
  if (itemLabel === '污水管网(km)') return sumPipeLineKmByCategory('2').toFixed(2);
  if (itemLabel === '检查井') return countPipeNodesByNodeType('1');
  if (isLeftStatItemNonInteractive(itemLabel)) return 0;
  return getZhtLeftStatDrawerCards(itemLabel).length;
}

/** 左侧指标项选中态：驱动右侧抽屉数据集 */
type LeftStatSelection = { sectionTitle: string; itemLabel: string };

/** 左侧各段配置：数值与 `getZhtLeftStatDrawerCards` 条数一致，与生态整治/设施管理等源表同步 */
function buildZhtLeftStatSections(): StatSection[] {
  return [
    {
      title: '设施概况',
      tone: 'blue',
      items: [
        { label: '雨水管网(km)', value: zhtLeftStatCardValue('雨水管网(km)') },
        { label: '污水管网(km)', value: zhtLeftStatCardValue('污水管网(km)') },
        { label: '检查井', value: zhtLeftStatCardValue('检查井') },
        { label: '泵站', value: zhtLeftStatCardValue('泵站') },
        { label: '排口', value: zhtLeftStatCardValue('排口') },
        { label: '责任主体', value: zhtLeftStatCardValue('责任主体') },
        { label: '污水厂', value: zhtLeftStatCardValue('污水厂') },
        { label: '排水户', value: zhtLeftStatCardValue('排水户') },
      ],
    },
    {
      title: '生态整治',
      tone: 'green',
      items: [
        { label: '项目', value: zhtLeftStatCardValue('项目') },
        { label: '河流', value: zhtLeftStatCardValue('河流') },
        { label: '湖泊', value: zhtLeftStatCardValue('湖泊') },
        { label: '河长', value: zhtLeftStatCardValue('河长') },
        { label: '事务', value: zhtLeftStatCardValue('事务') },
      ],
    },
    {
      title: '水利工程',
      tone: 'blue',
      items: [
        { label: '闸坝', value: zhtLeftStatCardValue('闸坝') },
        { label: '堤防', value: zhtLeftStatCardValue('堤防') },
        { label: '水库', value: zhtLeftStatCardValue('水库') },
        { label: '水闸', value: zhtLeftStatCardValue('水闸') },
        { label: '圩区', value: zhtLeftStatCardValue('圩区') },
        { label: '堰坝', value: zhtLeftStatCardValue('堰坝') },
        { label: '山塘', value: zhtLeftStatCardValue('山塘') },
      ],
    },
    {
      title: '应急协同',
      tone: 'blue',
      items: [
        { label: '风险源企业', value: zhtLeftStatCardValue('风险源企业') },
        { label: '社会物资点', value: zhtLeftStatCardValue('社会物资点') },
        { label: '应急物资', value: zhtLeftStatCardValue('应急物资') },
        { label: '应急预案', value: zhtLeftStatCardValue('应急预案') },
        { label: '应急队伍', value: zhtLeftStatCardValue('应急队伍') },
        { label: '应急专家', value: zhtLeftStatCardValue('应急专家') },
        { label: '应急事件', value: zhtLeftStatCardValue('应急事件') },
        { label: '污染源', value: zhtLeftStatCardValue('污染源') },
      ],
    },
  ];
}

/** 左栏每段 3 列网格下的卡片行数（四段合计 9 行、24 块） */
const ZHT_LEFT_CARD_ROWS = buildZhtLeftStatSections().reduce((acc, s) => acc + Math.ceil(s.items.length / 3), 0);

/** 与 style.css 中 `--zht-stat-gap`、`.zht-left-inner` 的 gap 保持一致，供高度推算 */
const ZHT_LEFT_CARD_ROW_GAP_PX = 6;
const ZHT_LEFT_SECTION_STACK_GAP_PX = 8;
/** 与 `.zht-left-section` 内标题与网格的 gap 一致 */
const ZHT_LEFT_SECTION_TITLE_GRID_GAP_PX = 4;
/** 卡片行高下限：低于此则固定行高并允许侧栏纵向滚动；字号不随此行高缩放 */
const ZHT_LEFT_CARD_MIN_ROW_PX = 52;

const ZhtDashboard: React.FC = () => {
  const [layerControl, setLayerControl] = useState<ZhtLayerControlState>(DEFAULT_ZHT_LAYER_CONTROL);
  const patchLayerControl = useCallback((patch: Partial<ZhtLayerControlState>) => {
    setLayerControl(prev => ({ ...prev, ...patch }));
  }, []);
  /** 右侧：分析看板 ↔ 地图搜索 ↔ 顶栏报警看板（与左侧指标同为右侧栏切换，便于地图联动） */
  const [rightRailView, setRightRailView] = useState<'analysis' | 'map-search' | 'alarm'>('analysis');
  /** 指标抽屉：点「在地图中定位」后的卡片高亮，与 `zht-search-result-card--selected` 同视觉档 */
  const [statDrawerLocateHighlightCardId, setStatDrawerLocateHighlightCardId] = useState<string | null>(null);
  /** 左侧指标块选中：打开抽屉并在保持展开时切换数据集 */
  const [leftStatSelection, setLeftStatSelection] = useState<LeftStatSelection | null>(null);
  /** 明细铺满地图列（左栏与右栏之间），与右侧看板互斥展示 */
  const [leftStatExpanded, setLeftStatExpanded] = useState(false);
  /** 地图叠层抽屉滑入（双 rAF 触发动画） */
  const [statDrawerSlideOpen, setStatDrawerSlideOpen] = useState(false);
  /** 报警列表铺满地图列（与左侧指标 `leftStatExpanded` 对齐） */
  const [alarmExpanded, setAlarmExpanded] = useState(false);
  const [alarmDrawerSlideOpen, setAlarmDrawerSlideOpen] = useState(false);
  /** 区分「首次/重新展开」与「已铺开仅换指标」：后者不重置滑入动画 */
  const statDrawerWasExpandedRef = useRef(false);
  const statDrawerSelKeyRef = useRef<string | null>(null);
  const mapSearchFlyToRef = useRef<((point: ZhtUnifiedSearchPoint) => void) | null>(null);
  /** 地图搜索：结果卡片整卡打开统一点位详情（与抽屉整卡一致，由地图板写入） */
  const mapSearchOpenDetailRef = useRef<((point: ZhtUnifiedSearchPoint) => void) | null>(null);
  const statDrawerMapFocusRef = useRef<((focus: ZhtStatDrawerMapFocus) => void) | null>(null);
  /** 抽屉整卡点击 → 地图内与 POI 一致打开详情 */
  const drawerPoiClickHandlerRef = useRef<((hit: ZhtStatDrawerPoiClick) => void) | null>(null);
  /**
   * 指标明细铺满地图列时主地图被遮：详情弹窗内需展示位置小地图；侧栏抽屉时主地图可见，弹窗内不重复。
   * 由地图板在打开详情时读取 `.current`，避免回调闭包滞后。
   */
  const zhtStatDetailEmbedMiniMapRef = useRef(false);
  zhtStatDetailEmbedMiniMapRef.current = Boolean(
    (leftStatSelection && leftStatExpanded && rightRailView === 'analysis') ||
      (rightRailView === 'alarm' && alarmExpanded),
  );
  /** 与 `ZhtMaplibreBoard` 全屏目标一致：仅含地图列 + 地图搜索面板（不含分析看板，与右栏搜索互斥） */
  const mapFullscreenStageRef = useRef<HTMLDivElement>(null);
  /** 抽屉地址定位：水环境 POI 关时临时揭开与统一点位 id 一致的圆点；地图按下即清除 */
  const [statDrawerPoiPeek, setStatDrawerPoiPeek] = useState<ZhtStatDrawerPeekPoi | null>(null);
  const leftStatExpandedRef = useRef(false);
  /** 空间查询：地图点击得到的原点（与「数据选点」二选一） */
  const [spatialOriginFromMap, setSpatialOriginFromMap] = useState<{ lng: number; lat: number } | null>(
    null,
  );
  const [spatialMapPickActive, setSpatialMapPickActive] = useState(false);
  /** 地图搜索查询结果覆盖（条件：序号点；空间：圆+原点+序号点） */
  const [searchMapOverlay, setSearchMapOverlay] = useState<ZhtSearchMapOverlay | null>(null);
  /** 当前选中的查询结果 id：GeoJSON 序号点或设施 DOM 搜索命中态略放大 */
  const [searchMapSelectedPointId, setSearchMapSelectedPointId] = useState<string | null>(null);
  /** 空间要素查询：未点「查询」前在地图上预览原点与范围（与查询结果覆盖层分离） */
  const [spatialQueryPreview, setSpatialQueryPreview] = useState<ZhtSpatialQueryPreview | null>(null);
  /** 地图搜索面板内 Tab / 空间原点模式（用于「数据点位」选点阶段恢复默认地图点） */
  const [mapSearchPanelContext, setMapSearchPanelContext] = useState<{
    activeTab: 'condition' | 'spatial';
    spatialOriginKind: 'data' | 'map';
  }>({ activeTab: 'condition', spatialOriginKind: 'data' });
  /** 报警看板：地址行触发地图定位后的卡片高亮（与指标抽屉定位选中档一致） */
  const [alarmLocateHighlightCardId, setAlarmLocateHighlightCardId] = useState<string | null>(null);
  const [pendingAlarmQueryDate, setPendingAlarmQueryDate] = useState<string | null>(null);
  const [pendingAlarmQuerySeq, setPendingAlarmQuerySeq] = useState(0);
  /** 供定位回调内比较当前选中，避免闭包滞后；实现「再点同一行/卡取消选中」 */
  const statDrawerLocateHighlightCardIdRef = useRef<string | null>(null);
  const alarmLocateHighlightCardIdRef = useRef<string | null>(null);
  const searchMapSelectedPointIdRef = useRef<string | null>(null);

  const onSpatialQueryPreviewChange = useCallback((v: ZhtSpatialQueryPreview | null) => {
    setSpatialQueryPreview(v);
  }, []);

  /** 与 `getZhtLeftStatDrawerCards` 同刷新周期，保证卡片数字与抽屉条数、源表一致 */
  const zhtLeftStatSections = useMemo(() => buildZhtLeftStatSections(), []);

  /** 覆盖层变化时清空选中（避免指向旧结果集） */
  useEffect(() => {
    setSearchMapSelectedPointId(null);
  }, [searchMapOverlay]);

  /** 切换右栏时结束选点、清空地图覆盖层与空间预览；进入地图搜索 / 报警看板时清空左侧指标选中（与子面板初始 Tab 一致） */
  useEffect(() => {
    setSpatialMapPickActive(false);
    setSearchMapOverlay(null);
    setSearchMapSelectedPointId(null);
    setSpatialQueryPreview(null);
    setMapSearchPanelContext({ activeTab: 'condition', spatialOriginKind: 'data' });
    if (rightRailView === 'map-search') {
      setSpatialOriginFromMap(null);
      setLeftStatSelection(null);
      setLeftStatExpanded(false);
    }
    if (rightRailView === 'alarm') {
      setLeftStatSelection(null);
      setLeftStatExpanded(false);
    }
  }, [rightRailView]);

  useEffect(() => {
    if (rightRailView !== 'alarm') {
      setAlarmLocateHighlightCardId(null);
      setAlarmExpanded(false);
    }
  }, [rightRailView]);

  /** 报警列表铺满地图：与指标抽屉同源滑入动画 */
  useEffect(() => {
    if (!alarmExpanded || rightRailView !== 'alarm') {
      setAlarmDrawerSlideOpen(false);
      return;
    }
    setAlarmDrawerSlideOpen(false);
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setAlarmDrawerSlideOpen(true));
    });
    return () => window.cancelAnimationFrame(id);
  }, [alarmExpanded, rightRailView]);

  /** 仅关闭/清空选中时退出地图铺满态；左侧改选其它指标时保持铺开 */
  useEffect(() => {
    if (leftStatSelection == null) setLeftStatExpanded(false);
  }, [leftStatSelection]);

  /** 雨水/污水管网使用底部表格式抽屉，不与右侧卡片铺满态并存 */
  useEffect(() => {
    if (isZhtPipeLineLeftStatLabel(leftStatSelection?.itemLabel)) {
      setLeftStatExpanded(false);
    }
  }, [leftStatSelection?.itemLabel]);

  useEffect(() => {
    leftStatExpandedRef.current = leftStatExpanded;
  }, [leftStatExpanded]);

  const alarmExpandedRef = useRef(false);
  useEffect(() => {
    alarmExpandedRef.current = alarmExpanded;
  }, [alarmExpanded]);

  /** 展开铺满：右栏收起 + 抽屉从右侧滑入（已铺开时仅换左侧指标不重播动画） */
  useEffect(() => {
    if (!leftStatExpanded || !leftStatSelection || rightRailView !== 'analysis') {
      setStatDrawerSlideOpen(false);
      statDrawerWasExpandedRef.current = false;
      if (!leftStatSelection) statDrawerSelKeyRef.current = null;
      else if (!leftStatExpanded) {
        statDrawerSelKeyRef.current = `${leftStatSelection.sectionTitle}\0${leftStatSelection.itemLabel}`;
      }
      return;
    }

    const selKey = `${leftStatSelection.sectionTitle}\0${leftStatSelection.itemLabel}`;
    const wasAlreadyExpanded = statDrawerWasExpandedRef.current;
    const prevKey = statDrawerSelKeyRef.current;

    if (wasAlreadyExpanded && prevKey != null && prevKey !== selKey) {
      statDrawerSelKeyRef.current = selKey;
      setStatDrawerSlideOpen(true);
      return;
    }

    statDrawerWasExpandedRef.current = true;
    statDrawerSelKeyRef.current = selKey;

    setStatDrawerSlideOpen(false);
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setStatDrawerSlideOpen(true));
    });
    return () => window.cancelAnimationFrame(id);
  }, [leftStatExpanded, leftStatSelection?.sectionTitle, leftStatSelection?.itemLabel, rightRailView]);

  const onToggleMapSearch = useCallback(() => {
    setRightRailView(v => (v === 'map-search' ? 'analysis' : 'map-search'));
  }, []);

  const onSearchResultFromPanel = useCallback((p: ZhtUnifiedSearchPoint) => {
    if (searchMapSelectedPointIdRef.current === p.id) {
      setSearchMapSelectedPointId(null);
      return;
    }
    setSearchMapSelectedPointId(p.id);
    mapSearchFlyToRef.current?.(p);
  }, []);

  const clearStatDrawerPoiPeek = useCallback(() => {
    setStatDrawerPoiPeek(null);
    // 与地图搜索卡片选中同源：失焦临时揭开 POI 时一并取消地图选中态
    setSearchMapSelectedPointId(null);
    setStatDrawerLocateHighlightCardId(null);
    setAlarmLocateHighlightCardId(null);
  }, []);

  useEffect(() => {
    statDrawerLocateHighlightCardIdRef.current = statDrawerLocateHighlightCardId;
  }, [statDrawerLocateHighlightCardId]);
  useEffect(() => {
    alarmLocateHighlightCardIdRef.current = alarmLocateHighlightCardId;
  }, [alarmLocateHighlightCardId]);
  useEffect(() => {
    searchMapSelectedPointIdRef.current = searchMapSelectedPointId;
  }, [searchMapSelectedPointId]);

  /** 汇总「画布 mousedown / Esc」应清除的联动选中态（不限于临时揭开 POI） */
  const mapCanvasSelectionClearActive = useMemo(
    () =>
      statDrawerPoiPeek != null ||
      searchMapSelectedPointId != null ||
      statDrawerLocateHighlightCardId != null ||
      alarmLocateHighlightCardId != null,
    [statDrawerPoiPeek, searchMapSelectedPointId, statDrawerLocateHighlightCardId, alarmLocateHighlightCardId],
  );

  useEffect(() => {
    if (!mapCanvasSelectionClearActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      clearStatDrawerPoiPeek();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mapCanvasSelectionClearActive, clearStatDrawerPoiPeek]);

  /**
   * 指标抽屉：地址/定位 → 地图 fly + POI peek（与右侧栏卡片一致）。
   * 铺满态：先 flush 收起叠层，再短延迟设 peek 并 fly——避免 (1) 画布未变宽 fly 无效 (2) 收起瞬间误触地图 canvas 的 mousedown 立刻清掉 peek。
   */
  const onLocateStatDrawerCardOnMap = useCallback(
    (focus: ZhtStatDrawerMapFocus, fromCard: { id: string }) => {
      if (statDrawerLocateHighlightCardIdRef.current === fromCard.id) {
        clearStatDrawerPoiPeek();
        return;
      }
      setStatDrawerLocateHighlightCardId(fromCard.id);
      const peek = focus.peekPoi;
      if (peek?.kind === 'unified') {
        setSearchMapSelectedPointId(peek.unifiedId);
      } else {
        setSearchMapSelectedPointId(null);
      }
      if (leftStatExpandedRef.current) {
        flushSync(() => {
          setLeftStatExpanded(false);
        });
        leftStatExpandedRef.current = false;
        window.setTimeout(() => {
          setStatDrawerPoiPeek(focus.peekPoi ?? null);
          statDrawerMapFocusRef.current?.(focus);
        }, 72);
        return;
      }
      setStatDrawerPoiPeek(focus.peekPoi ?? null);
      statDrawerMapFocusRef.current?.(focus);
    },
    [clearStatDrawerPoiPeek],
  );

  const onStatDrawerCardPoiClick = useCallback((hit: ZhtStatDrawerPoiClick) => {
    drawerPoiClickHandlerRef.current?.(hit);
  }, []);

  const shellAlarmBridge = useShellAlarmRailBridgeOptional();

  const openAlarmRail = useCallback(() => {
    setRightRailView('alarm');
    setLeftStatSelection(null);
    setLeftStatExpanded(false);
    setAlarmExpanded(false);
    setPendingAlarmQueryDate(null);
  }, []);

  const onCalendarAlarmDayClick = useCallback((date: string) => {
    setPendingAlarmQueryDate(date);
    setPendingAlarmQuerySeq(v => v + 1);
    setRightRailView('alarm');
    setLeftStatSelection(null);
    setLeftStatExpanded(false);
    setAlarmExpanded(true);
  }, []);

  useEffect(() => {
    if (!shellAlarmBridge) return;
    shellAlarmBridge.registerAlarmRailOpener(openAlarmRail);
    if (sessionStorage.getItem('ss-shell-pending-alarm-rail') === '1') {
      sessionStorage.removeItem('ss-shell-pending-alarm-rail');
      openAlarmRail();
    }
    return () => shellAlarmBridge.registerAlarmRailOpener(null);
  }, [shellAlarmBridge, openAlarmRail]);

  /**
   * 报警卡片：地址行（定位钮与可点击文案）→ fly + peek（与 `onLocateStatDrawerCardOnMap` 一致）。
   * 铺满态：先 flush 收起报警 overlay，再延迟 peek + fly，避免画布宽度仍为 overlay 时 fly 无效、以及收起帧误触 canvas 清 peek。
   */
  const onAlarmLocateOnMap = useCallback(
    (focus: ZhtStatDrawerMapFocus, from: { id: string }) => {
      if (alarmLocateHighlightCardIdRef.current === from.id) {
        clearStatDrawerPoiPeek();
        return;
      }
      setAlarmLocateHighlightCardId(from.id);
      const peek = focus.peekPoi;
      if (peek?.kind === 'unified') {
        setSearchMapSelectedPointId(peek.unifiedId);
      } else {
        setSearchMapSelectedPointId(null);
      }
      if (alarmExpandedRef.current) {
        flushSync(() => {
          setAlarmExpanded(false);
        });
        alarmExpandedRef.current = false;
        window.setTimeout(() => {
          setStatDrawerPoiPeek(focus.peekPoi ?? null);
          statDrawerMapFocusRef.current?.(focus);
        }, 72);
        return;
      }
      setStatDrawerPoiPeek(focus.peekPoi ?? null);
      statDrawerMapFocusRef.current?.(focus);
    },
    [clearStatDrawerPoiPeek],
  );

  /** 右侧汛期污染强度：点击监测点行后地图定位并高亮；传 `null` 或与地图按下同源清除高亮 */
  const onPollutionRowLocateOnMap = useCallback(
    (row: PollutionRowLocatePayload | null) => {
      if (row == null) {
        clearStatDrawerPoiPeek();
        return;
      }
      setSearchMapSelectedPointId(row.unifiedId);
      setStatDrawerPoiPeek({ kind: 'unified', unifiedId: row.unifiedId });
      statDrawerMapFocusRef.current?.({
        kind: 'point',
        lng: row.lng,
        lat: row.lat,
        zoom: 13.8,
        peekPoi: { kind: 'unified', unifiedId: row.unifiedId },
      });
    },
    [clearStatDrawerPoiPeek],
  );

  useEffect(() => {
    if (leftStatSelection == null) {
      setStatDrawerPoiPeek(null);
      setSearchMapSelectedPointId(null);
    }
  }, [leftStatSelection]);

  /** 仅当左侧选中块（区块+指标名）变化时清高亮，避免与父级引用抖动无关 */
  const leftStatHighlightScopeKey = leftStatSelection
    ? `${leftStatSelection.sectionTitle}\0${leftStatSelection.itemLabel}`
    : null;
  useEffect(() => {
    setStatDrawerLocateHighlightCardId(null);
  }, [leftStatHighlightScopeKey]);

  const onSpatialMapPick = useCallback((lng: number, lat: number) => {
    setSpatialOriginFromMap({ lng, lat });
    setSpatialMapPickActive(false);
    message.success('已设置空间查询原点（地图标记）');
  }, []);

  /** 空间 + 数据原点 + 尚未提交查询覆盖层：地图展示默认台账/监测便于对照选点 */
  const mapSearchShowDefaultPoiMarkers =
    rightRailView === 'map-search' &&
    mapSearchPanelContext.activeTab === 'spatial' &&
    mapSearchPanelContext.spatialOriginKind === 'data' &&
    searchMapOverlay == null;

  const leftAsideRef = useRef<HTMLElement>(null);
  const leftInnerRef = useRef<HTMLDivElement>(null);
  const leftStatRowHeightRef = useRef<number | null>(null);
  const leftStatNeedScrollRef = useRef<boolean | null>(null);
  const leftStatResizeRafRef = useRef<number | null>(null);

  /** 按侧栏可视高度均分 9 行卡片；不足最小行高时固定最小行高并开启纵向滚动 */
  const recalcLeftStatRowHeight = useCallback(() => {
    const aside = leftAsideRef.current;
    const inner = leftInnerRef.current;
    if (!aside || !inner) return;

    const asideCs = getComputedStyle(aside);
    const padY = parseFloat(asideCs.paddingTop) + parseFloat(asideCs.paddingBottom);
    const avail = aside.clientHeight - padY;

    let titlesH = 0;
    inner.querySelectorAll<HTMLElement>('.zht-section-title').forEach(el => {
      const m = getComputedStyle(el);
      titlesH += el.offsetHeight + parseFloat(m.marginTop) + parseFloat(m.marginBottom);
    });

    const betweenSectionPx = (zhtLeftStatSections.length - 1) * ZHT_LEFT_SECTION_STACK_GAP_PX;
    const sectionTitleGridGapPx = zhtLeftStatSections.length * ZHT_LEFT_SECTION_TITLE_GRID_GAP_PX;
    const innerRowGapsPx = zhtLeftStatSections.reduce((sum, sec) => {
      const rows = Math.ceil(sec.items.length / 3);
      return sum + Math.max(0, rows - 1) * ZHT_LEFT_CARD_ROW_GAP_PX;
    }, 0);

    const chrome = titlesH + betweenSectionPx + sectionTitleGridGapPx + innerRowGapsPx;
    const rawRow = (avail - chrome) / ZHT_LEFT_CARD_ROWS;
    const needScroll = rawRow < ZHT_LEFT_CARD_MIN_ROW_PX;
    const rowH = Math.floor(needScroll ? ZHT_LEFT_CARD_MIN_ROW_PX : rawRow);

    const nextRowHeight = Math.max(ZHT_LEFT_CARD_MIN_ROW_PX, rowH);
    if (leftStatRowHeightRef.current !== nextRowHeight) {
      aside.style.setProperty('--zht-stat-row-h', `${nextRowHeight}px`);
      leftStatRowHeightRef.current = nextRowHeight;
    }
    if (leftStatNeedScrollRef.current !== needScroll) {
      aside.classList.toggle('zht-left--scroll', needScroll);
      leftStatNeedScrollRef.current = needScroll;
    }
  }, [zhtLeftStatSections]);

  useLayoutEffect(() => {
    const aside = leftAsideRef.current;
    if (!aside) return;
    recalcLeftStatRowHeight();
    const ro = new ResizeObserver(() => {
      if (leftStatResizeRafRef.current != null) return;
      leftStatResizeRafRef.current = window.requestAnimationFrame(() => {
        leftStatResizeRafRef.current = null;
        recalcLeftStatRowHeight();
      });
    });
    ro.observe(aside);
    return () => {
      ro.disconnect();
      if (leftStatResizeRafRef.current != null) {
        window.cancelAnimationFrame(leftStatResizeRafRef.current);
        leftStatResizeRafRef.current = null;
      }
    };
  }, [recalcLeftStatRowHeight]);

  const onLeftStatItemClick = useCallback((sec: StatSection, it: StatItem) => {
    if (isLeftStatItemNonInteractive(it.label)) return;
    // 地图搜索 / 报警看板占右栏时，点左侧指标须先回到分析看板，否则抽屉 DOM 未挂载无法切换
    setRightRailView(v => (v === 'map-search' || v === 'alarm' ? 'analysis' : v));
    setLeftStatSelection(prev => {
      // 再次点击同一项：关闭抽屉
      if (prev?.sectionTitle === sec.title && prev?.itemLabel === it.label) return null;
      return { sectionTitle: sec.title, itemLabel: it.label };
    });
  }, []);

  return (
    <AppConfigProvider locale={zhCN}>
      <div className="zht-root">
        <div className="zht-body">
          <aside ref={leftAsideRef} className="zht-left">
            <div ref={leftInnerRef} className="zht-left-inner">
              {zhtLeftStatSections.map(sec => (
                <section key={sec.title} className="zht-left-section">
                  <h2 className="zht-section-title">
                    <span className="pipe">|</span>
                    {sec.title}
                  </h2>
                  <div className="zht-stat-grid">
                    {sec.items.map(it => {
                      const disabled = isLeftStatItemNonInteractive(it.label);
                      const active =
                        !disabled &&
                        leftStatSelection?.itemLabel === it.label &&
                        leftStatSelection?.sectionTitle === sec.title;
                      return (
                        <div
                          key={`${sec.title}-${it.label}`}
                          role={disabled ? undefined : 'button'}
                          tabIndex={disabled ? undefined : 0}
                          className={`zht-stat-card zht-stat-card--${sec.tone}${disabled ? ' zht-stat-card--disabled' : ''}${active ? ' zht-stat-card--active' : ''}`}
                          onClick={() => onLeftStatItemClick(sec, it)}
                          onKeyDown={e => {
                            if (disabled) return;
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onLeftStatItemClick(sec, it);
                            }
                          }}
                        >
                          <div className="zht-stat-value">{it.value}</div>
                          <div className="zht-stat-label">{it.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </aside>

          <div ref={mapFullscreenStageRef} className="zht-body-main">
            <div className="zht-map-drawer-stack">
              <div className="zht-map-shell">
                <ZhtMaplibreBoard
                  mapFullscreenStageRef={mapFullscreenStageRef}
                  showAdminDivisionHints={layerControl.showAdminDivisionHints}
                  showZeroDirectIndicators={layerControl.zeroDirectDischargeLabels}
                  layerControl={layerControl}
                  onLayerControlChange={patchLayerControl}
                  mapSearchFlyToRef={mapSearchFlyToRef}
                  mapSearchOpenDetailRef={mapSearchOpenDetailRef}
                  statDrawerMapFocusRef={statDrawerMapFocusRef}
                  drawerPoiClickHandlerRef={drawerPoiClickHandlerRef}
                  zhtStatDetailEmbedMiniMapRef={zhtStatDetailEmbedMiniMapRef}
                  statDrawerPoiPeek={statDrawerPoiPeek}
                  onClearStatDrawerPoiPeek={clearStatDrawerPoiPeek}
                  mapCanvasSelectionClearActive={mapCanvasSelectionClearActive}
                  onToggleMapSearch={onToggleMapSearch}
                  mapSearchPanelOpen={rightRailView === 'map-search'}
                  mapSearchShowDefaultPoiMarkers={mapSearchShowDefaultPoiMarkers}
                  spatialMapPickActive={spatialMapPickActive}
                  onSpatialMapPick={onSpatialMapPick}
                  searchMapOverlay={searchMapOverlay}
                  searchMapSelectedPointId={searchMapSelectedPointId}
                  onSearchMapResultClick={onSearchResultFromPanel}
                  spatialQueryPreview={spatialQueryPreview}
                />
                {leftStatSelection && isZhtPipeLineLeftStatLabel(leftStatSelection.itemLabel) && (
                  <ZhtPipeLineBottomDrawer
                    itemLabel={leftStatSelection.itemLabel}
                    onClose={() => setLeftStatSelection(null)}
                    onLocateOnMap={focus => statDrawerMapFocusRef.current?.(focus)}
                  />
                )}
              </div>
              {leftStatSelection && leftStatExpanded && rightRailView === 'analysis' && (
                <div
                  className={`zht-stat-drawer-map-host${statDrawerSlideOpen ? ' zht-stat-drawer-map-host--open' : ''}`}
                  role="presentation"
                >
                <ZhtLeftStatDrawer
                  variant="overlay"
                  itemLabel={leftStatSelection.itemLabel}
                  onMapCollapse={() => setLeftStatExpanded(false)}
                  onLocateCardOnMap={onLocateStatDrawerCardOnMap}
                  onCardPoiClick={onStatDrawerCardPoiClick}
                  locateHighlightedCardId={statDrawerLocateHighlightCardId}
                  onClearLocateHighlight={clearStatDrawerPoiPeek}
                  onClose={() => {
                      setLeftStatSelection(null);
                      setLeftStatExpanded(false);
                    }}
                  />
                </div>
              )}
            </div>

            {rightRailView === 'map-search' ? (
              <ZhtMapSearchPanel
                onClose={() => setRightRailView('analysis')}
                onResultOpenDetail={p => mapSearchOpenDetailRef.current?.(p)}
                onResultLocateOnMap={onSearchResultFromPanel}
                spatialOriginFromMap={spatialOriginFromMap}
                onSpatialOriginFromMapChange={setSpatialOriginFromMap}
                spatialMapPickActive={spatialMapPickActive}
                onRequestSpatialMapPick={() => setSpatialMapPickActive(true)}
                onCancelSpatialMapPick={() => setSpatialMapPickActive(false)}
                onSearchMapOverlayChange={setSearchMapOverlay}
                onSpatialQueryPreviewChange={onSpatialQueryPreviewChange}
                onMapSearchContextChange={setMapSearchPanelContext}
                mapSearchSelectedId={searchMapSelectedPointId}
                mapCommittedSpatialRange={searchMapOverlay?.spatialRange}
                onClearResultMapSelection={clearStatDrawerPoiPeek}
              />
            ) : null}
          </div>

          {rightRailView === 'alarm' && alarmExpanded && (
            <div
              className={`zht-stat-drawer-map-host${alarmDrawerSlideOpen ? ' zht-stat-drawer-map-host--open' : ''}`}
              role="presentation"
            >
              <ZhtAlarmRailPanel
                variant="overlay"
                onMapCollapse={() => setAlarmExpanded(false)}
                onClose={() => {
                  setRightRailView('analysis');
                  setAlarmExpanded(false);
                }}
                onLocateOnMap={onAlarmLocateOnMap}
                locateHighlightedCardId={alarmLocateHighlightCardId}
                onClearLocateHighlight={clearStatDrawerPoiPeek}
                getDetailModalContainer={() => zhtResolveDetailModalContainer(mapFullscreenStageRef.current)}
                injectedQueryDate={pendingAlarmQueryDate}
                injectedQuerySeq={pendingAlarmQuerySeq}
              />
            </div>
          )}

          {rightRailView === 'alarm' ? (
            alarmExpanded ? (
              <aside className="zht-right-rail zht-right-rail--collapsed-for-stat-expand" aria-hidden="true" />
            ) : (
              <ZhtAlarmRailPanel
                variant="rail"
                onMapExpand={() => setAlarmExpanded(true)}
                onClose={() => {
                  setRightRailView('analysis');
                  setAlarmExpanded(false);
                }}
                onLocateOnMap={onAlarmLocateOnMap}
                locateHighlightedCardId={alarmLocateHighlightCardId}
                onClearLocateHighlight={clearStatDrawerPoiPeek}
                getDetailModalContainer={() => zhtResolveDetailModalContainer(mapFullscreenStageRef.current)}
                injectedQueryDate={pendingAlarmQueryDate}
                injectedQuerySeq={pendingAlarmQuerySeq}
              />
            )
          ) : rightRailView === 'analysis' ? (
            leftStatSelection &&
            !leftStatExpanded &&
            !isZhtPipeLineLeftStatLabel(leftStatSelection.itemLabel) ? (
              <ZhtLeftStatDrawer
                variant="rail"
                itemLabel={leftStatSelection.itemLabel}
                onMapExpand={() => setLeftStatExpanded(true)}
                onLocateCardOnMap={onLocateStatDrawerCardOnMap}
                onCardPoiClick={onStatDrawerCardPoiClick}
                locateHighlightedCardId={statDrawerLocateHighlightCardId}
                onClearLocateHighlight={clearStatDrawerPoiPeek}
                onClose={() => setLeftStatSelection(null)}
              />
            ) : leftStatSelection &&
              (leftStatExpanded || isZhtPipeLineLeftStatLabel(leftStatSelection.itemLabel)) ? (
              <aside
                className="zht-right-rail zht-right-rail--collapsed-for-stat-expand"
                aria-hidden="true"
              />
            ) : (
              <ZhtRightDashboard
                onCalendarDayClick={onCalendarAlarmDayClick}
                onPollutionRowClick={onPollutionRowLocateOnMap}
              />
            )
          ) : null}
        </div>
      </div>
    </AppConfigProvider>
  );
};

export default ZhtDashboard;
