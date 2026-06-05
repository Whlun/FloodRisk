/**
 * 综合态势 · 地图搜索（嵌入右侧看板，非弹窗；顶栏关闭与左侧指标抽屉同为图标按钮）
 * 结果卡片：点击**标题区/标签**打开详情弹窗（与左侧指标抽屉整卡一致）；点击**地址行**在地图定位放大（与抽屉「在地图中定位」一致）。卡片内不展示编码行与查询时间行（编码仍可导出 CSV、详情内查看）。
 * 空间要素查询：原点选「地图标记」时不展示「区域」，查询仅按类型 + 半径在全量点位中筛选。
 * 在「空间要素查询」页签内，选定数据原点或地图原点、并填写半径后，地图实时预览 **绿虚线测地圆 + 蓝点原点**（未点「查询」前；提交查询后由父级覆盖层展示正式结果）。**数据原点**且未提交查询时经 **`onMapSearchContextChange`** 让父级 **`mapSearchShowDefaultPoiMarkers`**，地图恢复全量台账点便于对照选点。
 * 条件与空间查询成功后均在地图绘序号命中点。各 Tab 底部提供 **重置**：清空条件/空间表单、结果列表、地图覆盖与空间预览，空间原点恢复为「数据点位」并清除地图标记原点与选点态。**切换「条件查询 / 空间要素查询」Tab** 或 **空间查询内「数据点位 / 地图标记」** 时自动执行同一套清理（不弹成功提示；原点 Radio 可指定重置后的模式）。
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CloseOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { Button, Form, Input, InputNumber, Radio, Select, Tabs, Tag, Tooltip, message } from 'antd';
import {
  getZhtSearchPointMapCoordinate,
  getZhtUnifiedSearchPointsCached,
  haversineKm,
  type ZhtSearchSourceProject,
  type ZhtUnifiedSearchPoint,
} from './zhtSearchUnifiedData';
import {
  isSpatialQueryPreviewEqualToCommitted,
  type ZhtSearchMapOverlay,
  type ZhtSpatialQueryPreview,
} from './zhtSpatialSearchGeo';
import { compactDrawerAddressDetail } from './zhtLeftStatDrawer';

/** 空间查询：地图点击得到的原点 */
export type SpatialOriginLngLat = { lng: number; lat: number };

export interface ZhtMapSearchPanelProps {
  onClose: () => void;
  /** 点击结果卡片非地址区：打开与地图 POI/抽屉一致的统一点位详情 */
  onResultOpenDetail: (point: ZhtUnifiedSearchPoint) => void;
  /** 点击地址行：地图选中并 flyTo 放大 */
  onResultLocateOnMap: (point: ZhtUnifiedSearchPoint) => void;
  /** 地图标记的原点（与数据选点二选一） */
  spatialOriginFromMap: SpatialOriginLngLat | null;
  onSpatialOriginFromMapChange: (v: SpatialOriginLngLat | null) => void;
  spatialMapPickActive: boolean;
  /** 进入地图选点模式（十字光标，下一次点击取原点） */
  onRequestSpatialMapPick: () => void;
  /** 取消地图选点（未点击前） */
  onCancelSpatialMapPick: () => void;
  /** 查询完成后更新地图覆盖（条件：仅序号点；空间：圆+原点+序号点）；null 清除 */
  onSearchMapOverlayChange?: (overlay: ZhtSearchMapOverlay | null) => void;
  /** 空间要素查询：在地图上预览原点与半径（未提交查询前）；null 清除 */
  onSpatialQueryPreviewChange?: (preview: ZhtSpatialQueryPreview | null) => void;
  /** 同步当前 Tab 与空间原点模式，供地图在「数据选点」阶段恢复默认台账点 */
  onMapSearchContextChange?: (ctx: {
    activeTab: 'condition' | 'spatial';
    spatialOriginKind: 'data' | 'map';
  }) => void;
  /** 与地图联动：当前在列表/地图上选中的查询结果点 id */
  mapSearchSelectedId?: string | null;
  /** 已提交到地图的正式空间范围（蓝圈），用于与表单绿预览比较；仅当与当前表单一致时抑制绿层 */
  mapCommittedSpatialRange?: ZhtSearchMapOverlay['spatialRange'] | null;
  /** 取消查询结果与地图命中选中（与画布/Esc 同源） */
  onClearResultMapSelection?: () => void;
}

type ConditionFormValues = {
  region?: string;
  pointType?: string;
  status?: string;
  keyword?: string;
};

type SpatialFormValues = {
  region?: string;
  facilityOrRiverId?: string;
  queryCategory?: SpatialQueryCategory;
  /** InputNumber 在输入过程中可能短暂为非 number */
  radiusM?: number | string | null;
};

type SpatialQueryCategory = '全部' | '动态感知类' | '水利设施类' | '应急协同类' | '系统管理类';

const QUERY_CATEGORY_OPTIONS: { value: SpatialQueryCategory; label: string }[] = [
  { value: '全部', label: '全部' },
  { value: '动态感知类', label: '动态感知类（泵站、排口、污水厂等）' },
  { value: '水利设施类', label: '水利设施类（责任河段等）' },
  { value: '应急协同类', label: '应急协同类（应急事件等）' },
  { value: '系统管理类', label: '系统管理类（园区配置等）' },
];

function uniqSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
}

function categoryToSourceFilter(cat: SpatialQueryCategory | undefined): ZhtSearchSourceProject[] | null {
  if (!cat || cat === '全部') return null;
  if (cat === '动态感知类') return ['设施管理'];
  if (cat === '水利设施类') return ['生态整治'];
  if (cat === '应急协同类') return ['应急协同'];
  if (cat === '系统管理类') return ['系统管理'];
  return null;
}

/** 解析「查询半径（米）」：兼容 InputNumber 中间态、字符串、千分位逗号、范围写法（2600-2800 取左端） */
/** 合并表单补丁：若补丁显式带上 `radiusM: undefined`（InputNumber 与 Form 同步的中间帧常见），勿覆盖已有半径，避免预览圆间歇消失 */
function mergeSpatialFormForPreview(
  base: SpatialFormValues,
  patch: Partial<SpatialFormValues> | undefined,
): SpatialFormValues {
  if (!patch) return base;
  const out: SpatialFormValues = { ...base, ...patch };
  if (Object.prototype.hasOwnProperty.call(patch, 'radiusM') && patch.radiusM === undefined) {
    out.radiusM = base.radiusM;
  }
  return out;
}

function parseRadiusMeters(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw <= 0) return null;
    return raw;
  }
  if (typeof raw === 'string') {
    let t = raw.trim().replace(/,/g, '').replace(/，/g, '').replace(/\s/g, '');
    if (t === '' || t === '-' || t === '.' || t === '-.') return null;
    // 「2600-2800」「2600～2800」「2600至2800」：取分隔符前一段数字，避免 parseFloat 吃到异常或 InputNumber 清空
    const rangeHead = t.match(/^(\d[\d.]*)[-－~～至]/);
    if (rangeHead) {
      t = rangeHead[1];
    }
    const n = Number.parseFloat(t);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  }
  return null;
}

/** 由当前 Tab、原点模式、表单值计算地图预览（与 flush 逻辑共用） */
function computeSpatialPreviewPayload(
  activeTab: 'condition' | 'spatial',
  spatialOriginKind: 'data' | 'map',
  spatialOriginFromMap: SpatialOriginLngLat | null,
  allPoints: ZhtUnifiedSearchPoint[],
  formVals: Partial<SpatialFormValues>,
): ZhtSpatialQueryPreview | null {
  if (activeTab !== 'spatial') return null;
  const facilityId = formVals.facilityOrRiverId;
  const rParsed = parseRadiusMeters(formVals.radiusM);

  let olng: number;
  let olat: number;
  if (spatialOriginKind === 'data') {
    if (!facilityId) return null;
    const anchor = allPoints.find(p => p.id === facilityId);
    if (!anchor) return null;
    const o = getZhtSearchPointMapCoordinate(anchor);
    olng = o.lng;
    olat = o.lat;
  } else {
    if (!spatialOriginFromMap) return null;
    olng = spatialOriginFromMap.lng;
    olat = spatialOriginFromMap.lat;
  }
  return rParsed !== null
    ? { originLng: olng, originLat: olat, radiusM: rParsed }
    : { originLng: olng, originLat: olat };
}

/** 结果卡片首行：与抽屉地址行同源压缩（去经纬括注、去前置区划，优先路段/点位）；缺省再走演示 fallback */
function searchResultAddressLine1(p: ZhtUnifiedSearchPoint): string {
  const t = p.address?.trim();
  if (t) {
    const compact = compactDrawerAddressDetail(t);
    return compact || t;
  }
  const fallback = `湖南省湘潭市韶山市${p.region}·${p.name}（与台账落点一致，演示）`;
  return compactDrawerAddressDetail(fallback) || p.name?.trim() || fallback;
}

function downloadResultCsv(rows: ZhtUnifiedSearchPoint[]) {
  const headers = ['序号', '名称', '编码', '类型', '状态', '区域', '经度', '纬度', '来源项目'];
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const body = rows.map((r, i) =>
    [
      esc(i + 1),
      esc(r.name),
      esc(r.code),
      esc(r.pointType),
      esc(r.status),
      esc(r.region),
      esc(Number(r.lng.toFixed(6))),
      esc(Number(r.lat.toFixed(6))),
      esc(r.sourceProject),
    ].join(','),
  );
  const csv = `\uFEFF${headers.map(h => esc(h)).join(',')}\n${body.join('\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `综合态势-点位查询结果-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function SearchResultCard({
  sequence,
  point,
  onOpenDetail,
  onLocateOnMap,
  selected,
}: {
  /** 与地图序号一致，从 1 起 */
  sequence: number;
  point: ZhtUnifiedSearchPoint;
  onOpenDetail: (p: ZhtUnifiedSearchPoint) => void;
  onLocateOnMap: (p: ZhtUnifiedSearchPoint) => void;
  /** 与地图当前选中 POI 一致，便于区分多结果 */
  selected: boolean;
}) {
  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.zht-search-result-card__addr-locate')) return;
    onOpenDetail(point);
  };

  const handleLocate = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onLocateOnMap(point);
  };

  return (
    <div
      className={`zht-search-result-card${selected ? ' zht-search-result-card--selected' : ''}`}
      role="presentation"
      onClick={handleCardClick}
    >
      <div className="zht-search-result-card__head">
        <div className="zht-search-result-card__titleRow">
          <span className="zht-search-result-card__seq" aria-label={`序号 ${sequence}`}>
            {sequence}
          </span>
          <span className="zht-search-result-card__title">{point.name}</span>
        </div>
        <span className="zht-search-result-card__tags">
          <Tag color="blue" className="zht-search-result-card__tag" title="所属区域（最细区划）">
            {point.region?.trim() ? point.region : '—'}
          </Tag>
          <Tag color="blue" className="zht-search-result-card__tag">
            {point.pointType}
          </Tag>
        </span>
      </div>
      <div className="zht-search-result-card__addr">
        <Tooltip title="在地图中定位" mouseEnterDelay={0.2}>
          <button
            type="button"
            className="zht-search-result-card__addr-locate"
            aria-label="在地图中定位到该点"
            onClick={handleLocate}
          >
            <EnvironmentOutlined className="zht-search-result-card__pin" aria-hidden />
            <div className="zht-search-result-card__addrText">
              <div className="zht-search-result-card__addrLine1">地址：{searchResultAddressLine1(point)}</div>
            </div>
          </button>
        </Tooltip>
      </div>
    </div>
  );
}

export const ZhtMapSearchPanel: React.FC<ZhtMapSearchPanelProps> = ({
  onClose,
  onResultOpenDetail,
  onResultLocateOnMap,
  spatialOriginFromMap,
  onSpatialOriginFromMapChange,
  spatialMapPickActive,
  onRequestSpatialMapPick,
  onCancelSpatialMapPick,
  onSearchMapOverlayChange,
  onSpatialQueryPreviewChange,
  onMapSearchContextChange,
  mapSearchSelectedId = null,
  mapCommittedSpatialRange = null,
  onClearResultMapSelection,
}) => {
  const [conditionForm] = Form.useForm<ConditionFormValues>();
  const [spatialForm] = Form.useForm<SpatialFormValues>();
  const [activeTab, setActiveTab] = useState<'condition' | 'spatial'>('condition');
  /** 空间查询原点：数据台账点位 | 地图自行标记 */
  const [spatialOriginKind, setSpatialOriginKind] = useState<'data' | 'map'>('data');
  const [results, setResults] = useState<ZhtUnifiedSearchPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const allPoints = useMemo(() => getZhtUnifiedSearchPointsCached(), []);

  /**
   * 非表单因素（Tab、原点模式、地图选点）变化时重算预览。
   * 表单内半径等：在 Form `onValuesChange` 里立刻用本次 `allValues` 合并刷新，避免 `getFieldValue` 滞后（如输入 2600-2800 时圈不更新）。
   */
  const [spatialPreviewSync, setSpatialPreviewSync] = useState(0);
  /**
   * 点「空间查询」成功后，同帧之后随即会跑本组件 `useEffect` → `flushSpatialPreview`；
   * 若用表单重算与 `searchMapOverlay.spatialRange` 有细微差异，会再发非 null 绿层，导致地图正式蓝圈被跳过、绿层又未稳叠上 → 圈像「消失」。
   * 下一帧跳过一次用表单重算的预览，只发 null 保持与 runSpatial 内已写的 null 一致，再依赖 mapCommitted 容差作后备。
   */
  const skipNextFlushAfterSpatialCommitRef = useRef(false);

  const flushSpatialPreview = useCallback(
    (formSlice?: Partial<SpatialFormValues>) => {
      if (!onSpatialQueryPreviewChange) return;
      if (skipNextFlushAfterSpatialCommitRef.current) {
        skipNextFlushAfterSpatialCommitRef.current = false;
        onSpatialQueryPreviewChange(null);
        return;
      }
      const vals = mergeSpatialFormForPreview(spatialForm.getFieldsValue() as SpatialFormValues, formSlice);
      const next = computeSpatialPreviewPayload(
        activeTab,
        spatialOriginKind,
        spatialOriginFromMap,
        allPoints,
        vals,
      );
      /**
       * 已提交过空间查询时：仅当「当前表单推得的预览」与已提交结果完全一致时不发绿层，避免与正式蓝圈重绘竞态。
       * 在地图上重选点、或改半径后，预览与已提交不同 → 发绿层；正式 effect 会隐藏蓝圈、由绿层展示，便于看搜索范围。
       */
      if (mapCommittedSpatialRange && isSpatialQueryPreviewEqualToCommitted(next, mapCommittedSpatialRange)) {
        onSpatialQueryPreviewChange(null);
        return;
      }
      onSpatialQueryPreviewChange(next);
    },
    [
      activeTab,
      spatialOriginKind,
      spatialOriginFromMap,
      allPoints,
      onSpatialQueryPreviewChange,
      spatialForm,
      mapCommittedSpatialRange,
    ],
  );

  useEffect(() => {
    flushSpatialPreview();
  }, [flushSpatialPreview, spatialPreviewSync]);

  useEffect(() => {
    onMapSearchContextChange?.({ activeTab, spatialOriginKind });
  }, [activeTab, spatialOriginKind, onMapSearchContextChange]);

  const { regionOptions, typeOptions, statusOptions, pointSelectOptions } = useMemo(() => {
    return {
      regionOptions: uniqSorted(allPoints.map(p => p.region)),
      typeOptions: uniqSorted(allPoints.map(p => p.pointType)),
      statusOptions: uniqSorted(allPoints.map(p => p.status)),
      pointSelectOptions: allPoints.map(p => ({
        value: p.id,
        label: `${p.pointType} · ${p.name}`,
      })),
    };
  }, [allPoints]);

  // 嵌入右侧栏每次挂载时重置表单与结果（与关闭后再进入一致）
  useEffect(() => {
    spatialForm.setFieldsValue({
      region: undefined,
      facilityOrRiverId: undefined,
      queryCategory: '全部',
      radiusM: 3000,
    });
    conditionForm.resetFields();
    setResults([]);
    setActiveTab('condition');
    onSearchMapOverlayChange?.(null);
    onSpatialQueryPreviewChange?.(null);
    setSpatialPreviewSync(c => c + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅挂载时初始化
  }, []);

  const filterByCategory = useCallback((rows: ZhtUnifiedSearchPoint[], cat: SpatialQueryCategory | undefined) => {
    const src = categoryToSourceFilter(cat);
    if (!src) return rows;
    const set = new Set(src);
    return rows.filter(r => set.has(r.sourceProject));
  }, []);

  const runConditionQuery = useCallback(() => {
    setLoading(true);
    try {
      const v = conditionForm.getFieldsValue();
      const kw = (v.keyword ?? '').trim().toLowerCase();
      let rows = [...allPoints];
      if (v.region) rows = rows.filter(r => r.region === v.region);
      if (v.pointType) rows = rows.filter(r => r.pointType === v.pointType);
      if (v.status) rows = rows.filter(r => r.status === v.status);
      if (kw) {
        rows = rows.filter(
          r =>
            r.name.toLowerCase().includes(kw) ||
            r.code.toLowerCase().includes(kw) ||
            r.pointType.toLowerCase().includes(kw),
        );
      }
      setResults(rows);
      onSearchMapOverlayChange?.(rows.length ? { results: rows } : null);
      onSpatialQueryPreviewChange?.(null);
      message.success(`已查询到 ${rows.length} 条点位`);
    } finally {
      setLoading(false);
    }
  }, [allPoints, conditionForm, onSearchMapOverlayChange, onSpatialQueryPreviewChange]);

  const runSpatialQuery = useCallback(() => {
    setLoading(true);
    try {
      const v = spatialForm.getFieldsValue() as SpatialFormValues;
      const radiusM = parseRadiusMeters(v.radiusM);
      if (radiusM === null) {
        message.warning('请填写有效的查询范围（米）');
        return;
      }

      let clng: number;
      let clat: number;
      if (spatialOriginKind === 'data') {
        if (!v.facilityOrRiverId) {
          message.warning('请选择数据中的点位作为查询原点');
          return;
        }
        const anchor = allPoints.find(p => p.id === v.facilityOrRiverId);
        if (!anchor) {
          message.warning('所选原点无效，请重新选择');
          return;
        }
        const o = getZhtSearchPointMapCoordinate(anchor);
        clng = o.lng;
        clat = o.lat;
      } else {
        if (!spatialOriginFromMap) {
          message.warning('请先在地图上标记查询原点（点击「在地图上选点」后在地图选点）');
          return;
        }
        clng = spatialOriginFromMap.lng;
        clat = spatialOriginFromMap.lat;
      }

      let rows = filterByCategory([...allPoints], v.queryCategory);
      // 仅「数据点位」原点时支持按区域过滤；地图标记原点以圆与类型为准，不按区域
      if (spatialOriginKind === 'data' && v.region) {
        rows = rows.filter(r => r.region === v.region);
      }

      const radKm = radiusM / 1000;
      // 与地图设施/监测台账坐标一致，避免「统一表坐标在圆内、Marker 在圆外」
      rows = rows.filter(r => {
        const c = getZhtSearchPointMapCoordinate(r);
        return haversineKm(clng, clat, c.lng, c.lat) <= radKm;
      });
      setResults(rows);
      onSearchMapOverlayChange?.({
        results: rows,
        spatialRange: { originLng: clng, originLat: clat, radiusM },
      });
      onSpatialQueryPreviewChange?.(null);
      /** 见 `skipNextFlushAfterSpatialCommitRef` 注释 */
      skipNextFlushAfterSpatialCommitRef.current = true;
      message.success(`空间查询完成，共 ${rows.length} 条`);
    } finally {
      setLoading(false);
    }
  }, [
    allPoints,
    spatialForm,
    spatialOriginKind,
    spatialOriginFromMap,
    filterByCategory,
    onSearchMapOverlayChange,
    onSpatialQueryPreviewChange,
  ]);

  const onExport = useCallback(() => {
    if (!results.length) {
      message.info('暂无结果可导出，请先执行查询');
      return;
    }
    downloadResultCsv(results);
    message.success('已生成下载文件（CSV，可用 Excel 打开）');
  }, [results]);

  /** 重置：表单、结果、地图覆盖层、空间预览；清除地图选点；`spatialOriginKind` 默认回数据，可由 options 指定（供「地图标记」Radio 切换） */
  const resetQueryState = useCallback((options?: { silent?: boolean; spatialOriginKind?: 'data' | 'map' }) => {
    setLoading(false);
    onCancelSpatialMapPick();
    conditionForm.resetFields();
    spatialForm.setFieldsValue({
      region: undefined,
      facilityOrRiverId: undefined,
      queryCategory: '全部',
      radiusM: 3000,
    });
    setResults([]);
    setSpatialOriginKind(options?.spatialOriginKind ?? 'data');
    onSpatialOriginFromMapChange(null);
    onSearchMapOverlayChange?.(null);
    onSpatialQueryPreviewChange?.(null);
    setSpatialPreviewSync(c => c + 1);
    if (!options?.silent) message.success('已重置查询条件与结果');
  }, [
    conditionForm,
    spatialForm,
    onCancelSpatialMapPick,
    onSpatialOriginFromMapChange,
    onSearchMapOverlayChange,
    onSpatialQueryPreviewChange,
  ]);

  return (
    <aside className="zht-right-rail zht-right-rail--map-search" aria-label="地图搜索">
      <div className="zht-map-search-panel__hd">
        <h3 className="zht-map-search-panel__title">
          <span className="zht-right-widget-pipe">|</span>
          地图搜索
        </h3>
        <Button
          type="text"
          className="zht-stat-drawer__close"
          aria-label="关闭地图搜索"
          onClick={onClose}
          icon={<CloseOutlined />}
        />
      </div>

      <div className="zht-map-search-panel__body">
        <Tabs
          activeKey={activeTab}
          onChange={k => {
            const tab = k as 'condition' | 'spatial';
            // 切换查询方式时自动清空表单、结果与地图状态（不弹提示，避免打扰）
            if (tab !== activeTab) resetQueryState({ silent: true });
            setActiveTab(tab);
            if (tab === 'spatial') setSpatialPreviewSync(c => c + 1);
          }}
          items={[
            {
              key: 'condition',
              label: '条件查询',
              children: (
                <div className="zht-search-tab-body">
                  <Form form={conditionForm} layout="vertical" size="middle" className="zht-search-form-compact">
                    <Form.Item name="region">
                      <Select
                        allowClear
                        placeholder="选择区域"
                        aria-label="选择区域"
                        options={regionOptions.map(r => ({ label: r, value: r }))}
                      />
                    </Form.Item>
                    <Form.Item name="pointType">
                      <Select
                        allowClear
                        placeholder="设施类型"
                        aria-label="设施类型"
                        options={typeOptions.map(t => ({ label: t, value: t }))}
                      />
                    </Form.Item>
                    <Form.Item name="status">
                      <Select
                        allowClear
                        placeholder="选择状态"
                        aria-label="选择状态"
                        options={statusOptions.map(s => ({ label: s, value: s }))}
                      />
                    </Form.Item>
                    <Form.Item name="keyword">
                      <Input
                        allowClear
                        placeholder="名称（支持模糊匹配名称或编码）"
                        aria-label="名称"
                      />
                    </Form.Item>
                    <div className="zht-search-form-actions">
                      <Button type="primary" onClick={runConditionQuery} loading={loading}>
                        查询
                      </Button>
                      <Button type="primary" onClick={onExport} disabled={!results.length}>
                        导出
                      </Button>
                      <Button onClick={() => resetQueryState()} disabled={loading}>
                        重置
                      </Button>
                    </div>
                  </Form>
                </div>
              ),
            },
            {
              key: 'spatial',
              label: '空间要素查询',
              children: (
                <div className="zht-search-tab-body">
                  <Form
                    form={spatialForm}
                    layout="vertical"
                    size="middle"
                    className="zht-search-form-compact"
                    initialValues={{ queryCategory: '全部' as SpatialQueryCategory }}
                    onValuesChange={(_c, allValues) => {
                      flushSpatialPreview(allValues as SpatialFormValues);
                    }}
                  >
                    <div className="zht-spatial-origin-block">
                      <Radio.Group
                        className="zht-spatial-origin-radio"
                        value={spatialOriginKind}
                        onChange={e => {
                          const k = e.target.value as 'data' | 'map';
                          if (k !== spatialOriginKind) {
                            // 与 Tab 切换一致：整表清空 + 地图状态，并切到目标原点模式（静默）
                            resetQueryState({ silent: true, spatialOriginKind: k });
                          }
                        }}
                      >
                        <Radio.Button value="data">数据点位</Radio.Button>
                        <Radio.Button value="map">地图标记</Radio.Button>
                      </Radio.Group>
                      {spatialOriginKind === 'data' ? (
                        <Form.Item name="facilityOrRiverId" style={{ marginBottom: 0 }}>
                          <Select
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            placeholder="选择数据中的点位作为查询原点（必选）"
                            aria-label="查询原点（数据点位）"
                            options={pointSelectOptions}
                          />
                        </Form.Item>
                      ) : (
                        <div className="zht-spatial-map-origin">
                          {spatialOriginFromMap ? (
                            <div className="zht-spatial-map-origin__coords">
                              原点：经度 {spatialOriginFromMap.lng.toFixed(6)}，纬度{' '}
                              {spatialOriginFromMap.lat.toFixed(6)}
                            </div>
                          ) : (
                            <div className="zht-spatial-map-origin__hint">尚未在地图上标记原点</div>
                          )}
                          <div className="zht-spatial-map-origin__actions">
                            <Button
                              type="primary"
                              size="small"
                              disabled={spatialMapPickActive}
                              onClick={() => onRequestSpatialMapPick()}
                            >
                              在地图上选点
                            </Button>
                            {spatialMapPickActive ? (
                              <Button size="small" onClick={() => onCancelSpatialMapPick()}>
                                取消选点
                              </Button>
                            ) : null}
                            {spatialOriginFromMap ? (
                              <Button
                                size="small"
                                onClick={() => onSpatialOriginFromMapChange(null)}
                              >
                                清除原点
                              </Button>
                            ) : null}
                          </div>
                          {spatialMapPickActive ? (
                            <div className="zht-spatial-pick-active-hint" role="status">
                              请在地图上点击以确定原点…
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                    {spatialOriginKind === 'data' ? (
                      <Form.Item name="region">
                        <Select
                          allowClear
                          placeholder="选择区域（可选）"
                          aria-label="选择区域"
                          options={regionOptions.map(r => ({ label: r, value: r }))}
                        />
                      </Form.Item>
                    ) : null}
                    <Form.Item name="queryCategory">
                      <Select
                        placeholder="选择查询类型（动态感知、水利设施、应急协同等）"
                        aria-label="选择查询类型"
                        options={QUERY_CATEGORY_OPTIONS}
                      />
                    </Form.Item>
                    <Form.Item name="radiusM">
                      <InputNumber
                        stringMode
                        min={1}
                        /* 上下箭头每次 ±100 米；手输任意正数仍由 parseRadiusMeters + 预览 flush 支持 */
                        step={100}
                        style={{ width: '100%' }}
                        placeholder="查询范围半径（米），如 3000 或 2600-2800（取左）"
                        aria-label="查询范围半径（米）"
                        /* 除 Form.onValuesChange 外，用当前控件值立刻推预览，避免仅依赖表单 store 时键入过程中圆不刷新 */
                        onChange={v => {
                          flushSpatialPreview({ radiusM: v as SpatialFormValues['radiusM'] });
                        }}
                        onBlur={() => {
                          flushSpatialPreview();
                        }}
                      />
                    </Form.Item>
                    <div className="zht-search-form-actions">
                      <Button type="primary" onClick={runSpatialQuery} loading={loading}>
                        查询
                      </Button>
                      <Button type="primary" onClick={onExport} disabled={!results.length}>
                        导出
                      </Button>
                      <Button onClick={() => resetQueryState()} disabled={loading}>
                        重置
                      </Button>
                    </div>
                  </Form>
                </div>
              ),
            },
          ]}
        />

        <div className="zht-search-results">
          <div
            className={`zht-search-results__summary${mapSearchSelectedId && onClearResultMapSelection ? ' zht-search-results__summary--clearable' : ''}`}
            onClick={() => {
              if (!mapSearchSelectedId || !onClearResultMapSelection) return;
              onClearResultMapSelection();
            }}
            title={mapSearchSelectedId && onClearResultMapSelection ? '点击取消查询结果地图选中' : undefined}
          >
            查询结果 <strong className="zht-search-results__count">{results.length}</strong> 条：
          </div>
          <div className="zht-search-results__list" role="list">
            {results.map((p, i) => (
              <SearchResultCard
                key={`${p.id}-${i}`}
                sequence={i + 1}
                point={p}
                onOpenDetail={onResultOpenDetail}
                onLocateOnMap={onResultLocateOnMap}
                selected={mapSearchSelectedId === p.id}
              />
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};
