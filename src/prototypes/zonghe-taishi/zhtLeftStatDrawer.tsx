/**
 * 综合态势 · 左侧指标明细：右侧看板（rail）或铺满地图列（overlay）
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Button, Input, Select, Tooltip } from 'antd';
import {
  CloseOutlined,
  EnvironmentOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import {
  getZhtLeftStatDrawerCards,
  getZhtLeftStatDrawerHeading,
  type ZhtStatDrawerCard,
  type ZhtStatDrawerMapFocus,
  type ZhtStatDrawerPoiClick,
} from './zhtLeftStatDrawerData';

/**
 * 抽屉地址行展示：去掉末尾 WGS84 经纬括注（定位以 mapFocus 为准，不在此行重复经纬度）
 */
export function stripLngLatSuffixFromDrawerAddress(raw: string): string {
  let s = raw.trim();
  if (!s) return s;
  const reCoord =
    /[（(]\s*[\d.]+[^）]*°?\s*[Ee东]\s*[,，]\s*[\d.]+[^）]*°?\s*[Nn北][^）]*[）)]\s*$/;
  let prev = '';
  while (s !== prev) {
    prev = s;
    s = s.replace(reCoord, '').trim();
  }
  return s;
}

/**
 * 抽屉地址行展示：在去掉经纬括注后，仅保留具体路段/点位（优先取 `·` 后段）
 */
export function compactDrawerAddressDetail(raw: string): string {
  const cleaned = stripLngLatSuffixFromDrawerAddress(raw).trim();
  if (!cleaned) return '';
  const segs = cleaned.split('·').map(s => s.trim()).filter(Boolean);
  const tail = segs.length >= 2 ? segs[segs.length - 1] : cleaned;
  const noPrefix = tail.replace(/^地址[:：]\s*/u, '').trim();
  /** 去掉前置行政区划（如“湖南省湘潭市韶山市清溪镇”），仅保留路段/点位 */
  const stripAdminPrefix = noPrefix.replace(
    /^(?:[\u4e00-\u9fa5]{2,20}(?:省|市|自治区|自治州|地区|盟|区|县|旗|镇|乡|街道))+/u,
    '',
  ).trim();
  return stripAdminPrefix || noPrefix;
}

export type ZhtLeftStatDrawerVariant = 'rail' | 'overlay';

export type ZhtLeftStatDrawerProps = {
  variant: ZhtLeftStatDrawerVariant;
  itemLabel: string | null;
  /** 关闭明细（右侧看板恢复默认图表 / 地图叠层关闭并清空选中） */
  onClose: () => void;
  /** 右侧栏：展开铺满地图区域 */
  onMapExpand?: () => void;
  /** 地图叠层：收缩回右侧栏 */
  onMapCollapse?: () => void;
  /**
   * 卡片地址/定位图标：地图居中到对应点位或范围（展开态下会先收起抽屉再定位）；
   * `fromCard.id` 用于与地图搜索一致：点完地址后该卡橙边高亮。
   */
  onLocateCardOnMap?: (focus: ZhtStatDrawerMapFocus, fromCard: { id: string }) => void;
  /** 与地址定位联动的卡片高亮：刚通过「在地图中定位」选中的 `card.id` */
  locateHighlightedCardId?: string | null;
  /** 已有定位选中时：点击标题行空白（非按钮）取消地图联动选中，与画布清除同源 */
  onClearLocateHighlight?: () => void;
  /** 整卡点击：与地图对应 POI 一致打开详情（有 `poiClick` 的卡片） */
  onCardPoiClick?: (hit: ZhtStatDrawerPoiClick) => void;
};

export const ZhtLeftStatDrawer: React.FC<ZhtLeftStatDrawerProps> = ({
  variant,
  itemLabel,
  onClose,
  onMapExpand,
  onMapCollapse,
  onLocateCardOnMap,
  onCardPoiClick,
  locateHighlightedCardId = null,
  onClearLocateHighlight,
}) => {
  const [region, setRegion] = useState<string | undefined>(undefined);
  const [typeTag, setTypeTag] = useState<string | undefined>(undefined);
  const [nameKw, setNameKw] = useState('');

  const allCards = useMemo(() => (itemLabel ? getZhtLeftStatDrawerCards(itemLabel) : []), [itemLabel]);

  useEffect(() => {
    setRegion(undefined);
    setTypeTag(undefined);
    setNameKw('');
  }, [itemLabel]);

  const regionOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of allCards) {
      const r = c.tags[0]?.trim();
      if (r) set.add(r);
    }
    return [...set].sort().map(v => ({ value: v, label: v }));
  }, [allCards]);

  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of allCards) {
      const t = c.tags[1]?.trim();
      if (t) set.add(t);
    }
    return [...set].sort().map(v => ({ value: v, label: v }));
  }, [allCards]);

  const filteredCards = useMemo(() => {
    const nk = nameKw.trim().toLowerCase();
    return allCards.filter(c => {
      if (region && c.tags[0] !== region) return false;
      if (typeTag && c.tags[1] !== typeTag) return false;
      if (nk && !c.title.toLowerCase().includes(nk)) return false;
      return true;
    });
  }, [allCards, region, typeTag, nameKw]);

  if (!itemLabel) return null;

  const heading = getZhtLeftStatDrawerHeading(itemLabel);

  const inner = (
    <>
      <header className="zht-stat-drawer__hd">
        {/* 首行：展开、标题、关闭同一基线横向排齐 */}
        <div
          className="zht-stat-drawer__hd-top"
          onClick={e => {
            if (!locateHighlightedCardId || !onClearLocateHighlight) return;
            if ((e.target as HTMLElement).closest('button')) return;
            onClearLocateHighlight();
          }}
        >
          {variant === 'rail' && onMapExpand && (
            <Button
              type="text"
              className="zht-stat-drawer__expand"
              aria-label="指标列表铺满地图区域"
              title="指标列表铺满地图区域"
              icon={<MenuFoldOutlined />}
              onClick={onMapExpand}
            />
          )}
          {variant === 'overlay' && onMapCollapse && (
            <Button
              type="text"
              className="zht-stat-drawer__expand"
              aria-label="收回指标列表栏"
              title="收回指标列表栏"
              icon={<MenuUnfoldOutlined />}
              onClick={onMapCollapse}
            />
          )}
          <h2 id="zht-stat-drawer-title" className="zht-stat-drawer__title">
            <span className="zht-stat-drawer__pipe">|</span>
            {heading}
          </h2>
          <Button type="text" className="zht-stat-drawer__close" aria-label="返回默认分析看板" onClick={onClose} icon={<CloseOutlined />} />
        </div>
      </header>

      <div className="zht-stat-drawer__filters">
        <div className="zht-stat-drawer__filters-grid">
          <Select
            allowClear
            className="zht-stat-drawer__filter-item"
            placeholder="区域"
            options={regionOptions}
            value={region}
            onChange={v => setRegion(v)}
          />
          <Select
            allowClear
            className="zht-stat-drawer__filter-item"
            placeholder="类型"
            options={typeOptions}
            value={typeTag}
            onChange={v => setTypeTag(v)}
          />
          <Input
            allowClear
            className="zht-stat-drawer__filter-item"
            placeholder="名称关键词"
            value={nameKw}
            onChange={e => setNameKw(e.target.value)}
          />
        </div>
      </div>

      <div className="zht-stat-drawer__body">
        {filteredCards.length === 0 ? (
          <div className="zht-stat-drawer__empty">暂无符合条件的数据（演示）</div>
        ) : (
          <div className="zht-stat-drawer__grid">
            {filteredCards.map(c => (
              <DrawerEntityCard
                key={c.id}
                card={c}
                onLocateOnMap={onLocateCardOnMap}
                onCardPoiClick={onCardPoiClick}
                isLocateActive={c.id === locateHighlightedCardId}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );

  if (variant === 'overlay') {
    return (
      <div className="zht-stat-drawer zht-stat-drawer--overlay" role="dialog" aria-modal="true" aria-labelledby="zht-stat-drawer-title">
        {inner}
      </div>
    );
  }

  return (
    <aside className="zht-right-rail zht-right-rail--stat-drawer" aria-label="指标明细看板">
      <div className="zht-stat-drawer zht-stat-drawer--rail" role="region" aria-labelledby="zht-stat-drawer-title">
        {inner}
      </div>
    </aside>
  );
};

const DrawerEntityCard: React.FC<{
  card: ZhtStatDrawerCard;
  onLocateOnMap?: (focus: ZhtStatDrawerMapFocus, fromCard: { id: string }) => void;
  onCardPoiClick?: (hit: ZhtStatDrawerPoiClick) => void;
  /** 刚通过本卡地址/定位完成的选中态，与 `zht-search-result-card--selected` 同档 */
  isLocateActive?: boolean;
}> = ({ card, onLocateOnMap, onCardPoiClick, isLocateActive = false }) => {
  const metrics = card.metrics;
  const n = metrics.length;
  const gridCols = n <= 3 ? Math.max(1, n) : 3;
  const tagItems = card.tags.map(t => String(t ?? '').trim()).filter(Boolean);
  const tagTips = card.tagTooltips;
  const addrRaw = card.address?.trim();
  const addrDisplay = addrRaw ? compactDrawerAddressDetail(addrRaw) : '';
  /** 有文案、可回调且具备地图焦点时才显示可点击定位（点击飞 POI / 包络） */
  const canLocate = Boolean(addrDisplay && onLocateOnMap && card.mapFocus);
  const expertPerson = card.expertPerson;
  const isExpertPersonLayout = Boolean(expertPerson);
  /** 专家顶区头像：无图时用姓名首字 */
  const expertAvatarInitial = card.title.trim().slice(0, 1) || '专';

  const handleLocate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canLocate || !onLocateOnMap || !card.mapFocus) return;
    onLocateOnMap(card.mapFocus, { id: card.id });
  };

  const poiClickable = Boolean(card.poiClick && onCardPoiClick);

  const handleCardPoiActivate = (e: React.MouseEvent<HTMLElement>) => {
    if (!card.poiClick || !onCardPoiClick) return;
    const el = e.target as HTMLElement;
    /** 地址行/定位：仅飞地图，不打开详情（与点地址/定位钮一致） */
    if (el.closest('.zht-stat-drawer-card__addr-row')) return;
    e.stopPropagation();
    onCardPoiClick(card.poiClick);
  };

  return (
    <article
      className={`zht-stat-drawer-card${isExpertPersonLayout ? ' zht-stat-drawer-card--expert' : ''}${
        poiClickable ? ' zht-stat-drawer-card--poi-clickable' : ''
      }${isLocateActive ? ' zht-stat-drawer-card--locate-active' : ''}`}
      onClick={poiClickable ? handleCardPoiActivate : undefined}
    >
      {isExpertPersonLayout && expertPerson ? (
        <div className="zht-stat-drawer-card__expert-top">
          <div className="zht-stat-drawer-card__expert-avatar-wrap">
            {expertPerson.avatarUrl ? (
              <img
                className="zht-stat-drawer-card__expert-avatar-img"
                src={expertPerson.avatarUrl}
                alt=""
                loading="lazy"
              />
            ) : (
              <div className="zht-stat-drawer-card__expert-avatar-fallback" aria-hidden>
                {expertAvatarInitial}
              </div>
            )}
          </div>
          <div className="zht-stat-drawer-card__expert-headtext">
            <div className="zht-stat-drawer-card__expert-name-row">
              <Tooltip title={card.title} placement="topLeft">
                <div className="zht-stat-drawer-card__expert-name">{card.title}</div>
              </Tooltip>
              <Tooltip title={expertPerson.phone} placement="topLeft">
                <span className="zht-stat-drawer-card__expert-phone">{expertPerson.phone}</span>
              </Tooltip>
            </div>
            <div className="zht-stat-drawer-card__expert-subrow">
              <span className="zht-stat-drawer-card__expert-accent-tag" title={expertPerson.accentTag}>
                {expertPerson.accentTag}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="zht-stat-drawer-card__hd">
          <Tooltip title={card.title} placement="topLeft">
            <div className="zht-stat-drawer-card__title">{card.title}</div>
          </Tooltip>
          {tagItems.length > 0 ? (
            <div className="zht-stat-drawer-card__tags">
              {tagItems.map((t, i) => (
                <Tooltip
                  key={`${i}-${t}`}
                  title={tagTips?.[i] ?? t}
                  placement="top"
                  mouseEnterDelay={0.35}
                >
                  <span className="zht-stat-drawer-card__tag">{t}</span>
                </Tooltip>
              ))}
            </div>
          ) : null}
        </div>
      )}
      {addrDisplay ? (
        <div
          className={`zht-stat-drawer-card__addr-row${canLocate ? ' zht-stat-drawer-card__addr-row--interactive' : ''}`}
          onClick={e => e.stopPropagation()}
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
      {card.subLine && <div className="zht-stat-drawer-card__sub">{card.subLine}</div>}
      {card.detailRows && card.detailRows.length > 0 ? (
        <div className="zht-stat-drawer-card__detail-rows">
          {card.detailRows.map((row, idx) => (
            <div key={`${row.label}-${idx}`} className="zht-stat-drawer-card__detail-row">
              <div className="zht-stat-drawer-card__detail-row__label">{row.label}</div>
              <div className="zht-stat-drawer-card__detail-row__value">{row.value}</div>
            </div>
          ))}
        </div>
      ) : null}
      {n > 0 ? (
        <div
          className="zht-stat-drawer-card__metrics"
          data-zht-metric-count={Math.min(9, n)}
        >
          <div
            className="zht-stat-drawer-card__metric-blocks"
            style={{
              gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
            }}
          >
            {metrics.map((m, idx) => {
              const k = m.kind ?? 'plain';
              const valueMod =
                k === 'enum' || k === 'status'
                  ? 'enum'
                  : k === 'stat' || k === 'time'
                    ? 'stat'
                    : 'plain';
              return (
                <div key={`${m.label}-${idx}`} className="zht-stat-drawer-card__metric-block">
                  <div className="zht-stat-drawer-card__metric-block__label">{m.label}</div>
                  <div
                    className={`zht-stat-drawer-card__metric-block__value zht-stat-drawer-card__metric-block__value--${valueMod}`}
                  >
                    {m.value}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </article>
  );
};
