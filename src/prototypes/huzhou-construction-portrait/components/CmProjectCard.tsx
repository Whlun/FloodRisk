/**
 * 建设工程画像 · 右侧项目列表卡片（对齐综合态势 DrawerEntityCard）
 */
import React from 'react';
import { EnvironmentOutlined } from '@ant-design/icons';
import { Checkbox, Tooltip } from 'antd';
import { HzPhaseAlertLine } from '../../huzhou-lifecycle-shared/components/HzPhaseAlertLine';
import { compactDrawerAddressDetail } from '../../zonghe-taishi/zhtLeftStatDrawer';
import { getPhaseMetric } from '../mock/phaseDistribution';
import { getProjectCardMetrics } from '../mock/projectCardMetrics';
import type { CmProjectCardMetric, ConstructionProject } from '../types';
import type { CmProjectCardAlertDisplay } from '../resolveCmProjectCardAlert';
import { CmDistrictTag } from '../../huzhou-lifecycle-shared/components/CmDistrictTag';
import { CmProjectFavoriteStar } from './CmProjectFavoriteStar';

function metricValueMod(kind: CmProjectCardMetric['kind']): string {
  if (kind === 'enum' || kind === 'status') return 'enum';
  if (kind === 'stat' || kind === 'time') return 'stat';
  return 'plain';
}

export type CmProjectCardProps = {
  project: ConstructionProject;
  /** 刚通过地址/定位选中的卡片（橙边高亮） */
  isLocateActive?: boolean;
  /** 批量导出勾选 */
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  /** 整卡（非地址行）→ 打开地块详情 */
  onOpen: () => void;
  /** 地址行 / 定位钮 → 地图定位（再次点击同一卡取消） */
  onLocateOnMap?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  /** 预警提示（前三未：批而未供 / 供而未用 / 用而未尽，由 resolveCmProjectCardAlert 解析） */
  cardAlert?: CmProjectCardAlertDisplay | null;
};

export const CmProjectCard: React.FC<CmProjectCardProps> = ({
  project,
  isLocateActive = false,
  selectable = false,
  selected = false,
  onToggleSelect,
  onOpen,
  onLocateOnMap,
  isFavorite = false,
  onToggleFavorite,
  cardAlert = null,
}) => {
  const phaseLabel = getPhaseMetric(project.phaseKey).label;
  const metrics = getProjectCardMetrics(project);
  const addrRaw = project.address?.trim() ?? '';
  const addrDisplay = addrRaw ? compactDrawerAddressDetail(addrRaw) : '';
  const canLocate = Boolean(addrDisplay && onLocateOnMap && !selectable);

  const handleLocate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canLocate || !onLocateOnMap || selectable) return;
    onLocateOnMap();
  };

  /** 导出模式：整卡（除收藏）切换勾选；日常模式打开详情 / 地址定位 */
  const handleCardSurfaceClick = (e: React.MouseEvent<HTMLElement>) => {
    const t = e.target as HTMLElement;
    if (t.closest('.hz-cm-project-card__favorite')) return;
    if (!selectable) {
      if (t.closest('.zht-stat-drawer-card__locate-btn:not(.zht-stat-drawer-card__locate-btn--disabled)')) return;
      if (t.closest('button.zht-stat-drawer-card__addr-text')) return;
    }
    if (selectable) {
      if (t.closest('.hz-cm-project-card__select')) return;
      onToggleSelect?.();
      return;
    }
    onOpen();
  };

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (selectable) {
        onToggleSelect?.();
        return;
      }
      onOpen();
    }
  };

  return (
    <article
      className={`zht-stat-drawer-card zht-stat-drawer-card--poi-clickable hz-cm-project-card${
        isLocateActive ? ' zht-stat-drawer-card--locate-active' : ''
      }${selectable && selected ? ' hz-cm-project-card--selected' : ''}${selectable ? ' hz-cm-project-card--selectable' : ''}`}
      role="button"
      tabIndex={0}
      onClick={handleCardSurfaceClick}
      onKeyDown={handleCardKeyDown}
    >
      <div className="zht-stat-drawer-card__hd">
        {selectable ? (
          <div
            className="hz-cm-project-card__select"
            onClick={e => e.stopPropagation()}
          >
            <Checkbox
              checked={selected}
              aria-label={`选择项目 ${project.name}`}
              onChange={() => onToggleSelect?.()}
            />
          </div>
        ) : null}
        <Tooltip title={project.name} placement="topLeft">
          <div
            className={`zht-stat-drawer-card__title${selectable ? ' hz-cm-project-card__title--selectable' : ''}`}
          >
            {project.name}
          </div>
        </Tooltip>
        {onToggleFavorite ? (
          <div className="hz-cm-project-card__favorite">
            <CmProjectFavoriteStar active={isFavorite} onToggle={onToggleFavorite} />
          </div>
        ) : null}
      </div>
      {cardAlert ? (
        <HzPhaseAlertLine
          message={cardAlert.message}
          enteredAt={cardAlert.enteredAt}
          levelTone={cardAlert.levelTone}
          typeTag={cardAlert.alertTypeLabel}
          typeTagClassName={cardAlert.alertTypeClass}
        />
      ) : null}
      <div
        className={`zht-stat-drawer-card__addr-row hz-cm-project-card__meta-row${
          canLocate ? ' zht-stat-drawer-card__addr-row--interactive' : ''
        }`}
      >
        {addrDisplay ? (
          <div className="hz-cm-project-card__addr-locate">
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
              <Tooltip title={addrRaw || addrDisplay} placement="topLeft" mouseEnterDelay={0.35}>
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
        <div className="zht-stat-drawer-card__tags hz-cm-project-card__addr-tags">
          <CmDistrictTag value={project.region} />
          <Tooltip title={`当前阶段：${phaseLabel}`} placement="top" mouseEnterDelay={0.35}>
            <span
              className={`zht-stat-drawer-card__tag hz-cm-project-card__phase-tag hz-cm-phase-card--phase-${project.phaseKey}`}
            >
              {phaseLabel}
            </span>
          </Tooltip>
        </div>
      </div>
      <div className="zht-stat-drawer-card__metrics" data-zht-metric-count={metrics.length}>
        <div
          className="zht-stat-drawer-card__metric-blocks"
          style={{ gridTemplateColumns: `repeat(${metrics.length}, minmax(0, 1fr))` }}
        >
          {metrics.map((m, idx) => (
            <div key={`${m.label}-${idx}`} className="zht-stat-drawer-card__metric-block">
              <div className="zht-stat-drawer-card__metric-block__label">{m.label}</div>
              <div
                className={`zht-stat-drawer-card__metric-block__value zht-stat-drawer-card__metric-block__value--${metricValueMod(m.kind)}`}
              >
                {m.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
};
