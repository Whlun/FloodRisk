/**
 * 建设工程画像 / 预警工程画像 · 项目阶段预警列表
 * - overlay（建管覆盖层）：覆盖项目列表自右滑入（`hz-cm-project-alert-rail-overlay`）
 * - overlay + onMapCollapse（预警画像铺满）：筛选/字段/视图与 `CmProjectLeftPanel` 铺满态对齐
 * - rail（预警画像常驻右栏）：关键词 + 卡片网格
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppstoreOutlined,
  BarsOutlined,
  CloseOutlined,
  DownloadOutlined,
  HistoryOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Button,
  Checkbox,
  Empty,
  Input,
  Space,
  Table,
  Tooltip,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  getFacilityTableScrollX,
  PipeLineColumnManager,
} from '../../韶山水环境设施管理系统/pipe-line-table-kit';
import { applyProjectQuery } from '../cmProjectQuery';
import { listCmProjectAlerts } from '../cmProjectPhaseAlert';
import type { CmRegionKey } from '../cmRegionFilter';
import {
  buildCmProjectAllColumnConfigs,
} from '../cmProjectTableColumns';
import { getProjectById } from '../mock/projects';
import { getRegionAlertProjects } from '../mock/regionAlertProjects';
import type { CmProjectListPanelState } from '../useCmProjectListPanelState';
import type { CmPhaseAlertLevel, ConstructionProject, PhaseKey } from '../types';
import type { CmProjectWithPhaseAlert } from '../cmProjectPhaseAlert';
import { CmProjectCard } from './CmProjectCard';
import { CmProjectBatchExportModal } from './CmProjectBatchExportModal';
import { CmProjectExportModeBar } from './CmProjectExportModeBar';
import { CmProjectExportRecordsModal } from './CmProjectExportRecordsModal';
import { useCmProjectExportMode } from '../useCmProjectExportMode';
import { useCmProjectExportRecords } from '../useCmProjectExportRecords';

export type CmProjectAlertRailPanelVariant = 'overlay' | 'rail';

export type CmProjectAlertRailPanelProps = {
  variant?: CmProjectAlertRailPanelVariant;
  regionKey: CmRegionKey;
  slideOpen?: boolean;
  alertLevelFilter?: CmPhaseAlertLevel | null;
  phaseKeyFilter?: PhaseKey | null;
  /** 预警铺满 ↔ rail 共享筛选/视图（与建管 `CmProjectLeftPanel` 同源） */
  panelState?: CmProjectListPanelState;
  onOpenParcelDetail: (project: ConstructionProject) => void;
  onLocateProjectOnMap?: (project: ConstructionProject) => void;
  locateHighlightedProjectId?: string | null;
  onClearLocateHighlight?: () => void;
  onClose?: () => void;
  onMapExpand?: () => void;
  onMapCollapse?: () => void;
  isFavorite: (projectId: string) => boolean;
  onToggleFavorite: (projectId: string) => void;
  /** 未传 panelState 时的兜底（建管 stack overlay） */
  favoritesOnly?: boolean;
  onFavoritesOnlyChange?: (checked: boolean) => void;
  /** 列表看板在屏幕上的侧别（左右互换后用于收回按钮文案） */
  listPanelSide?: 'left' | 'right';
};

export const CmProjectAlertRailPanel: React.FC<CmProjectAlertRailPanelProps> = ({
  variant = 'overlay',
  regionKey,
  slideOpen = false,
  alertLevelFilter = null,
  phaseKeyFilter = null,
  panelState,
  onOpenParcelDetail,
  onLocateProjectOnMap,
  locateHighlightedProjectId = null,
  onClearLocateHighlight,
  onClose,
  onMapExpand,
  onMapCollapse,
  isFavorite,
  onToggleFavorite,
  favoritesOnly: favoritesOnlyProp = false,
  onFavoritesOnlyChange,
  listPanelSide = 'right',
}) => {
  const [railKeyword, setRailKeyword] = useState('');
  const isMapExpandOverlay = variant === 'overlay' && Boolean(onMapCollapse);

  const favoritesOnly = panelState?.favoritesOnly ?? favoritesOnlyProp;
  const setFavoritesOnly = panelState?.setFavoritesOnly ?? onFavoritesOnlyChange;

  const alertRows = useMemo(() => {
    const projects = getRegionAlertProjects(regionKey);
    return listCmProjectAlerts(projects);
  }, [regionKey]);

  const applyBaseAlertFilters = useCallback(
    (rows: CmProjectWithPhaseAlert[]) =>
      rows.filter(({ project, alert }) => {
        if (alertLevelFilter && alert.level !== alertLevelFilter) return false;
        if (phaseKeyFilter && project.phaseKey !== phaseKeyFilter) return false;
        if (favoritesOnly && !isFavorite(project.id)) return false;
        return true;
      }),
    [alertLevelFilter, favoritesOnly, isFavorite, phaseKeyFilter],
  );

  const railFilteredRows = useMemo(() => {
    const snapshot = panelState?.querySnapshot;
    const projects = applyBaseAlertFilters(alertRows).map(r => r.project);
    const filteredIds = new Set(
      applyProjectQuery(projects, {
        nameKw: (panelState?.nameKw ?? railKeyword).trim(),
        dateFrom: snapshot?.dateFrom,
        dateTo: snapshot?.dateTo,
      }).map(p => p.id),
    );
    return applyBaseAlertFilters(alertRows).filter(r => filteredIds.has(r.project.id));
  }, [alertRows, applyBaseAlertFilters, panelState?.nameKw, panelState?.querySnapshot, railKeyword]);

  const overlayFilteredRows = useMemo(() => {
    const base = applyBaseAlertFilters(alertRows);
    if (!panelState) return base;
    const projects = base.map(r => r.project);
    const filteredIds = new Set(
      applyProjectQuery(projects, panelState.querySnapshot).map(p => p.id),
    );
    return base.filter(r => filteredIds.has(r.project.id));
  }, [alertRows, applyBaseAlertFilters, panelState]);

  const displayRows = isMapExpandOverlay && panelState ? overlayFilteredRows : railFilteredRows;

  const {
    exportMode,
    exportModalOpen,
    enterExportMode,
    exitExportMode,
    confirmExport,
    closeExportModal,
    finishExport,
    selectedIdList,
    isSelected,
    toggle: toggleSelect,
    selectMany,
    syncDisplaySelection,
    pruneToIds,
    selectedCount: totalSelectedCount,
  } = useCmProjectExportMode();

  const { records: exportRecords, appendRecord, removeRecord, clearRecords } =
    useCmProjectExportRecords();
  const [exportRecordsOpen, setExportRecordsOpen] = useState(false);

  const displayProjectIds = useMemo(
    () => displayRows.map(r => r.project.id),
    [displayRows],
  );

  const regionProjectIds = useMemo(
    () => getRegionAlertProjects(regionKey).map(p => p.id),
    [regionKey],
  );

  const allDisplaySelected =
    displayProjectIds.length > 0 &&
    displayProjectIds.every(id => isSelected(id));

  const someDisplaySelected =
    displayProjectIds.some(id => isSelected(id)) && !allDisplaySelected;

  const displaySelectedCount = useMemo(
    () => displayProjectIds.filter(id => isSelected(id)).length,
    [displayProjectIds, isSelected],
  );

  const selectedProjects = useMemo(
    () =>
      selectedIdList
        .map(id => getProjectById(id))
        .filter((p): p is ConstructionProject => Boolean(p)),
    [selectedIdList],
  );

  useEffect(() => {
    if (!exportMode) return;
    pruneToIds(regionProjectIds);
  }, [exportMode, pruneToIds, regionProjectIds]);

  const handleToggleSelectAll = useCallback(
    (checked: boolean) => {
      selectMany(displayProjectIds, checked);
    },
    [displayProjectIds, selectMany],
  );

  const handleHdTopClick = (e: React.MouseEvent) => {
    if (!locateHighlightedProjectId || !onClearLocateHighlight) return;
    if ((e.target as HTMLElement).closest('button')) return;
    onClearLocateHighlight();
  };

  const emptyDescription = favoritesOnly
    ? '暂无收藏预警项目'
    : alertLevelFilter || phaseKeyFilter || (panelState?.nameKw ?? railKeyword).trim()
      ? '暂无匹配预警项目'
      : '暂无阶段预警项目';

  const overlayTitle = isMapExpandOverlay ? '预警列表' : '项目阶段预警';

  const handleQueryClick = useCallback(() => {
    if (!panelState) return;
    panelState.applyQuery(panelState.nameKw);
    const count = applyProjectQuery(
      applyBaseAlertFilters(alertRows).map(r => r.project),
      panelState.querySnapshot,
    ).length;
    message.success(`查询完成，共 ${count} 条`);
  }, [alertRows, applyBaseAlertFilters, panelState]);

  const handleResetQuery = useCallback(() => {
    if (!panelState) return;
    panelState.resetQuery();
    message.success(`已重置，当前共 ${applyBaseAlertFilters(alertRows).length} 条`);
  }, [alertRows, applyBaseAlertFilters, panelState]);

  const handleRailKeywordChange = useCallback(
    (value: string) => {
      if (panelState) {
        panelState.setNameKw(value);
        panelState.applyQuery(value);
        return;
      }
      setRailKeyword(value);
    },
    [panelState],
  );

  const allTableColumnConfigs = useMemo(
    () =>
      buildCmProjectAllColumnConfigs({
        onOpenParcelDetail,
        onLocateProjectOnMap,
        isFavorite,
        onToggleFavorite,
        exportMode,
      }),
    [exportMode, isFavorite, onLocateProjectOnMap, onOpenParcelDetail, onToggleFavorite],
  );

  const tableColumns: ColumnsType<ConstructionProject> = useMemo(() => {
    const visible = panelState?.visibleTableColumns ?? [];
    return allTableColumnConfigs
      .filter(col => visible.includes(col.key) || col.key === 'operation')
      .sort((a, b) => {
        if (a.key === 'operation') return 1;
        if (b.key === 'operation') return -1;
        return visible.indexOf(a.key) - visible.indexOf(b.key);
      })
      .map(col =>
        col.key === 'operation' ? { ...col, fixed: 'right' as const } : col,
      ) as ColumnsType<ConstructionProject>;
  }, [allTableColumnConfigs, panelState?.visibleTableColumns]);

  const tableScrollX = useMemo(
    () =>
      getFacilityTableScrollX(
        tableColumns.filter(col => col.key !== 'operation'),
      ),
    [tableColumns],
  );

  const tableDataSource = useMemo(
    () => displayRows.map(r => r.project),
    [displayRows],
  );

  const renderCards = () =>
    displayRows.length === 0 ? (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyDescription} />
    ) : (
      displayRows.map(({ project, alert }) => (
        <CmProjectCard
          key={project.id}
          project={project}
          phaseAlert={alert}
          isLocateActive={project.id === locateHighlightedProjectId}
          selectable={exportMode}
          selected={isSelected(project.id)}
          onToggleSelect={() => toggleSelect(project.id)}
          isFavorite={isFavorite(project.id)}
          onToggleFavorite={() => onToggleFavorite(project.id)}
          onOpen={() => onOpenParcelDetail(project)}
          onLocateOnMap={
            onLocateProjectOnMap ? () => onLocateProjectOnMap(project) : undefined
          }
        />
      ))
    );

  const tableRowSelection = exportMode
    ? {
        selectedRowKeys: selectedIdList,
        onChange: (keys: React.Key[]) => {
          syncDisplaySelection(displayProjectIds, keys.map(String));
        },
      }
    : undefined;

  const exportRecordButton = (
    <Button icon={<HistoryOutlined />} onClick={() => setExportRecordsOpen(true)}>
      导出记录{exportRecords.length > 0 ? ` (${exportRecords.length})` : ''}
    </Button>
  );

  const batchExportButton = (
    <Button icon={<DownloadOutlined />} onClick={enterExportMode}>
      批量导出
    </Button>
  );

  const overlayExportActions = (
    <Space size="small">
      {exportRecordButton}
      {batchExportButton}
    </Space>
  );

  const favoritesOnlyCheckbox = setFavoritesOnly ? (
    <Checkbox
      checked={favoritesOnly}
      onChange={e => setFavoritesOnly(e.target.checked)}
    >
      只看收藏
    </Checkbox>
  ) : null;

  const listInner = (
    <>
      <header className="zht-stat-drawer__hd">
        <div
          className={`zht-stat-drawer__hd-top${
            isMapExpandOverlay ? ' zht-alarm-rail__overlay-hd-top' : ''
          }`}
          onClick={handleHdTopClick}
        >
          {variant === 'rail' && onMapExpand ? (
            <Button
              type="text"
              className="zht-stat-drawer__expand"
              aria-label="列表铺满地图区域"
              title="列表铺满地图区域"
              icon={<MenuFoldOutlined />}
              onClick={onMapExpand}
            />
          ) : null}
          {isMapExpandOverlay ? (
            <Button
              type="text"
              className="zht-stat-drawer__expand"
              aria-label={listPanelSide === 'left' ? '收回左侧列表栏' : '收回右侧列表栏'}
              title={listPanelSide === 'left' ? '收回左侧列表栏' : '收回右侧列表栏'}
              icon={<MenuUnfoldOutlined />}
              onClick={() => {
                panelState?.setViewMode('card');
                onMapCollapse?.();
              }}
            />
          ) : null}
          <h2
            className="zht-stat-drawer__title"
            id={
              isMapExpandOverlay
                ? 'hz-cm-alert-overlay-title'
                : variant === 'rail'
                  ? 'hz-cm-alert-rail-title'
                  : undefined
            }
          >
            <span className="zht-stat-drawer__pipe">|</span>
            {overlayTitle}
          </h2>
          {!isMapExpandOverlay && variant === 'overlay' && onClose ? (
            <Button
              type="text"
              className="zht-stat-drawer__close"
              aria-label="关闭阶段预警看板"
              onClick={onClose}
              icon={<CloseOutlined />}
            />
          ) : null}
          {isMapExpandOverlay && panelState ? (
            <>
              <div className="zht-alarm-rail__overlay-hd-spacer" aria-hidden />
              {panelState.viewMode === 'list' ? (
                <div className="zht-alarm-rail__overlay-field-group">
                  <PipeLineColumnManager
                    columns={allTableColumnConfigs}
                    visibleColumns={panelState.visibleTableColumns}
                    onChange={panelState.setVisibleTableColumns}
                  />
                </div>
              ) : null}
              <div className="zht-alarm-rail__overlay-view-group">
                <Tooltip title="卡片视图">
                  <Button
                    type="text"
                    className={`zht-stat-drawer__expand${panelState.viewMode === 'card' ? ' zht-alarm-rail__view-toggle--active' : ''}`}
                    aria-label="卡片视图"
                    aria-pressed={panelState.viewMode === 'card'}
                    icon={<AppstoreOutlined />}
                    onClick={() => panelState.setViewMode('card')}
                  />
                </Tooltip>
                <Tooltip title="列表视图">
                  <Button
                    type="text"
                    className={`zht-stat-drawer__expand${panelState.viewMode === 'list' ? ' zht-alarm-rail__view-toggle--active' : ''}`}
                    aria-label="列表视图"
                    aria-pressed={panelState.viewMode === 'list'}
                    icon={<BarsOutlined />}
                    onClick={() => panelState.setViewMode('list')}
                  />
                </Tooltip>
              </div>
            </>
          ) : isMapExpandOverlay ? (
            <div className="zht-alarm-rail__overlay-hd-spacer" aria-hidden />
          ) : null}
        </div>
      </header>

      <div className="zht-stat-drawer__filters">
        {exportMode ? (
          <CmProjectExportModeBar
            totalCount={displayRows.length}
            totalSelectedCount={totalSelectedCount}
            displaySelectedCount={displaySelectedCount}
            allSelected={allDisplaySelected}
            someSelected={someDisplaySelected}
            onToggleAll={handleToggleSelectAll}
            onCancel={exitExportMode}
            onConfirm={confirmExport}
          />
        ) : isMapExpandOverlay && panelState ? (
          <Space wrap size="middle" className="hz-cm-project-filters-row--overlay">
            <Input
              allowClear
              placeholder="名称关键词"
              style={{ width: 200 }}
              value={panelState.nameKw}
              onChange={e => panelState.setNameKw(e.target.value)}
            />
            <Space size="small">
              <Button type="primary" icon={<SearchOutlined />} onClick={handleQueryClick}>
                查询
              </Button>
              <Button onClick={handleResetQuery}>重置</Button>
            </Space>
            {favoritesOnlyCheckbox}
            {overlayExportActions}
          </Space>
        ) : (
          <div className="hz-cm-project-filters-row">
            <Input
              allowClear
              className="zht-stat-drawer__filter-item"
              placeholder="请输入关键词搜索"
              value={panelState?.nameKw ?? railKeyword}
              onChange={e => handleRailKeywordChange(e.target.value)}
            />
            {favoritesOnlyCheckbox}
            <span className="hz-cm-project-filters-row__export">{batchExportButton}</span>
          </div>
        )}
      </div>

      <div
        className={`zht-stat-drawer__body${
          isMapExpandOverlay ? ' zht-alarm-rail__overlay-body' : ''
        }${exportMode ? ' hz-cm-project-body--export-mode' : ''}`}
      >
        {isMapExpandOverlay && panelState?.viewMode === 'list' ? (
          <div className="zht-alarm-rail__table-wrap hz-cm-project-table-wrap">
            <Table<ConstructionProject>
              size="small"
              rowKey="id"
              pagination={false}
              tableLayout="fixed"
              scroll={{ x: tableScrollX }}
              rowSelection={tableRowSelection}
              columns={tableColumns}
              dataSource={tableDataSource}
              onRow={record => ({
                onClick: e => {
                  const target = e.target as HTMLElement;
                  if (target.closest('.zht-alarm-rail__table-actions')) return;
                  if (exportMode) {
                    if (target.closest('.ant-table-selection-column, .ant-checkbox-wrapper, .ant-checkbox')) {
                      return;
                    }
                    toggleSelect(record.id);
                    return;
                  }
                  onOpenParcelDetail(record);
                },
              })}
              rowClassName={record => {
                const parts = ['zht-alarm-rail-table__row--clickable'];
                if (exportMode) parts.push('hz-cm-project-table__row--export-selectable');
                if (record.id === locateHighlightedProjectId) {
                  parts.push('zht-alarm-rail-table__row--highlight');
                }
                return parts.join(' ');
              }}
            />
          </div>
        ) : (
          <div
            className={`zht-stat-drawer__grid zht-alarm-rail__grid${
              isMapExpandOverlay ? ' zht-alarm-rail__grid--overlay hz-cm-project-grid--overlay' : ''
            }`}
          >
            {renderCards()}
          </div>
        )}
      </div>
    </>
  );

  const exportModal = (
    <>
      <CmProjectBatchExportModal
        open={exportModalOpen}
        projects={selectedProjects}
        onClose={closeExportModal}
        onExported={finishExport}
        onRecordCreated={input => {
          void appendRecord(input);
        }}
      />
      <CmProjectExportRecordsModal
        open={exportRecordsOpen}
        records={exportRecords}
        onClose={() => setExportRecordsOpen(false)}
        onRemove={id => {
          void removeRecord(id);
        }}
        onClear={() => {
          void clearRecords();
        }}
      />
    </>
  );

  if (variant === 'rail') {
    return (
      <>
      <aside className="zht-right-rail zht-right-rail--stat-drawer zht-right-rail--alarm-rail" aria-label="项目阶段预警">
        <div
          className="zht-alarm-rail zht-stat-drawer zht-stat-drawer--rail"
          role="region"
          aria-labelledby="hz-cm-alert-rail-title"
        >
          {listInner}
        </div>
      </aside>
      {exportModal}
      </>
    );
  }

  if (isMapExpandOverlay) {
    return (
      <>
      <div
        className="zht-alarm-rail zht-stat-drawer zht-stat-drawer--overlay zht-alarm-rail--expanded hz-cm-project-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hz-cm-alert-overlay-title"
      >
        {listInner}
      </div>
      {exportModal}
      </>
    );
  }

  return (
    <>
    <div
      className={`hz-cm-project-alert-rail-overlay zht-stat-drawer zht-stat-drawer--rail${
        slideOpen ? ' hz-cm-project-alert-rail-overlay--open' : ''
      }`}
      role="region"
      aria-label="项目阶段预警"
    >
      {listInner}
    </div>
    {exportModal}
    </>
  );
};
