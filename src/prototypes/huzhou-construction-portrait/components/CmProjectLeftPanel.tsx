/**
 * 建设工程画像 · 右侧建设工程项目列表（随左栏选中阶段过滤）
 * - rail：关键词 + 卡片网格（对齐 AlertHomeView / CmProjectAlertRailPanel）
 * - overlay 铺满：卡片/列表切换、字段管理、申报日期查询（spec 1.3）
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppstoreOutlined,
  BarsOutlined,
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
import type { CmRegionKey } from '../cmRegionFilter';
import {
  buildCmProjectAllColumnConfigs,
} from '../cmProjectTableColumns';
import { getProjectById } from '../mock/projects';
import { getProjectsByPhaseAndRegion } from '../mock/regionScopedData';
import { getCmProjectPhaseAlert } from '../cmProjectPhaseAlert';
import type { CmProjectListPanelState } from '../useCmProjectListPanelState';
import { applyProjectQuery } from '../cmProjectQuery';
import type { ConstructionProject, PhaseKey } from '../types';
import {
  getFacilityTableScrollX,
  PipeLineColumnManager,
} from '../../韶山水环境设施管理系统/pipe-line-table-kit';
import { CmProjectCard } from './CmProjectCard';
import { CmProjectBatchExportModal } from './CmProjectBatchExportModal';
import { CmProjectExportModeBar } from './CmProjectExportModeBar';
import { CmProjectExportRecordsModal } from './CmProjectExportRecordsModal';
import { useCmProjectExportMode } from '../useCmProjectExportMode';
import { useCmProjectExportRecords } from '../useCmProjectExportRecords';

export type CmProjectLeftPanelVariant = 'rail' | 'overlay';

export type CmProjectLeftPanelProps = {
  variant?: CmProjectLeftPanelVariant;
  regionKey: CmRegionKey;
  selectedPhaseKey: PhaseKey | null;
  panelState: CmProjectListPanelState;
  onOpenParcelDetail: (project: ConstructionProject) => void;
  onLocateProjectOnMap?: (project: ConstructionProject) => void;
  locateHighlightedProjectId?: string | null;
  onClearLocateHighlight?: () => void;
  onMapExpand?: () => void;
  onMapCollapse?: () => void;
  stackOverlay?: React.ReactNode;
  isFavorite: (projectId: string) => boolean;
  onToggleFavorite: (projectId: string) => void;
  /** 列表看板在屏幕上的侧别（左右互换后用于收回按钮文案） */
  listPanelSide?: 'left' | 'right';
};

export const CmProjectLeftPanel: React.FC<CmProjectLeftPanelProps> = ({
  variant = 'rail',
  regionKey,
  selectedPhaseKey,
  panelState,
  onOpenParcelDetail,
  onLocateProjectOnMap,
  locateHighlightedProjectId = null,
  onClearLocateHighlight,
  onMapExpand,
  onMapCollapse,
  stackOverlay,
  isFavorite,
  onToggleFavorite,
  listPanelSide = 'right',
}) => {
  const {
    favoritesOnly,
    setFavoritesOnly,
    viewMode,
    setViewMode,
    nameKw,
    setNameKw,
    querySnapshot,
    visibleTableColumns,
    setVisibleTableColumns,
    resetQuery,
    applyQuery,
  } = panelState;

  const isMapExpandOverlay = variant === 'overlay' && Boolean(onMapCollapse);

  const baseProjects = useMemo(
    () => getProjectsByPhaseAndRegion(selectedPhaseKey, regionKey),
    [selectedPhaseKey, regionKey],
  );

  const applyFavoritesFilter = useCallback(
    (rows: ConstructionProject[]) => {
      if (!favoritesOnly) return rows;
      return rows.filter(p => isFavorite(p.id));
    },
    [favoritesOnly, isFavorite],
  );

  const railFiltered = useMemo(
    () =>
      applyFavoritesFilter(
        applyProjectQuery(baseProjects, {
          nameKw: nameKw.trim(),
          dateFrom: querySnapshot.dateFrom,
          dateTo: querySnapshot.dateTo,
        }),
      ),
    [
      applyFavoritesFilter,
      baseProjects,
      nameKw,
      querySnapshot.dateFrom,
      querySnapshot.dateTo,
    ],
  );

  const overlayFiltered = useMemo(
    () => applyFavoritesFilter(applyProjectQuery(baseProjects, querySnapshot)),
    [applyFavoritesFilter, baseProjects, querySnapshot],
  );

  const displayProjects = isMapExpandOverlay ? overlayFiltered : railFiltered;

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
    () => displayProjects.map(p => p.id),
    [displayProjects],
  );

  const regionProjectIds = useMemo(
    () => getProjectsByPhaseAndRegion(null, regionKey).map(p => p.id),
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

  const handleQueryClick = useCallback(() => {
    applyQuery(nameKw);
    const count = applyProjectQuery(baseProjects, {
      nameKw: nameKw.trim(),
      dateFrom: querySnapshot.dateFrom,
      dateTo: querySnapshot.dateTo,
    }).length;
    message.success(`查询完成，共 ${count} 条`);
  }, [applyQuery, baseProjects, nameKw, querySnapshot.dateFrom, querySnapshot.dateTo]);

  const handleResetQuery = useCallback(() => {
    resetQuery();
    message.success(`已重置，当前共 ${baseProjects.length} 条`);
  }, [baseProjects.length, resetQuery]);

  const handleRailKeywordChange = useCallback(
    (value: string) => {
      setNameKw(value);
      applyQuery(value);
    },
    [applyQuery, setNameKw],
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
    return allTableColumnConfigs
      .filter(col => visibleTableColumns.includes(col.key) || col.key === 'operation')
      .sort((a, b) => {
        if (a.key === 'operation') return 1;
        if (b.key === 'operation') return -1;
        const indexA = visibleTableColumns.indexOf(a.key);
        const indexB = visibleTableColumns.indexOf(b.key);
        return indexA - indexB;
      })
      .map(col =>
        col.key === 'operation' ? { ...col, fixed: 'right' as const } : col,
      ) as ColumnsType<ConstructionProject>;
  }, [allTableColumnConfigs, visibleTableColumns]);

  const tableScrollX = useMemo(
    () =>
      getFacilityTableScrollX(
        tableColumns.filter(col => col.key !== 'operation'),
      ),
    [tableColumns],
  );

  const handleHdTopClick = (e: React.MouseEvent) => {
    if (!locateHighlightedProjectId || !onClearLocateHighlight) return;
    if ((e.target as HTMLElement).closest('button')) return;
    onClearLocateHighlight();
  };

  const emptyDescription = favoritesOnly
    ? '暂无收藏项目'
    : selectedPhaseKey
      ? '该阶段暂无匹配项目'
      : '暂无匹配项目';

  const renderProjectCards = (rows: ConstructionProject[]) =>
    rows.length === 0 ? (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyDescription} />
    ) : (
      rows.map(p => (
        <CmProjectCard
          key={p.id}
          project={p}
          phaseAlert={getCmProjectPhaseAlert(p)}
          isLocateActive={p.id === locateHighlightedProjectId}
          selectable={exportMode}
          selected={isSelected(p.id)}
          onToggleSelect={() => toggleSelect(p.id)}
          isFavorite={isFavorite(p.id)}
          onToggleFavorite={() => onToggleFavorite(p.id)}
          onOpen={() => onOpenParcelDetail(p)}
          onLocateOnMap={
            onLocateProjectOnMap ? () => onLocateProjectOnMap(p) : undefined
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

  const favoritesOnlyCheckbox = (
    <Checkbox checked={favoritesOnly} onChange={e => setFavoritesOnly(e.target.checked)}>
      只看收藏
    </Checkbox>
  );

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
              aria-label="项目列表铺满地图区域"
              title="项目列表铺满地图区域"
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
                setViewMode('card');
                onMapCollapse?.();
              }}
            />
          ) : null}
          <h2
            className="zht-stat-drawer__title"
            id={isMapExpandOverlay ? 'hz-cm-project-overlay-title' : 'hz-cm-project-rail-title'}
          >
            <span className="zht-stat-drawer__pipe">|</span>
            建设工程项目
          </h2>
          {isMapExpandOverlay ? (
            <>
              <div className="zht-alarm-rail__overlay-hd-spacer" aria-hidden />
              {viewMode === 'list' ? (
                <div className="zht-alarm-rail__overlay-field-group">
                  <PipeLineColumnManager
                    columns={allTableColumnConfigs}
                    visibleColumns={visibleTableColumns}
                    onChange={setVisibleTableColumns}
                  />
                </div>
              ) : null}
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
            </>
          ) : null}
        </div>
      </header>

      <div className="zht-stat-drawer__filters">
        {exportMode ? (
          <CmProjectExportModeBar
            totalCount={displayProjects.length}
            totalSelectedCount={totalSelectedCount}
            displaySelectedCount={displaySelectedCount}
            allSelected={allDisplaySelected}
            someSelected={someDisplaySelected}
            onToggleAll={handleToggleSelectAll}
            onCancel={exitExportMode}
            onConfirm={confirmExport}
          />
        ) : isMapExpandOverlay ? (
          <Space wrap size="middle" className="hz-cm-project-filters-row--overlay">
            <Input
              allowClear
              placeholder="名称关键词"
              style={{ width: 200 }}
              value={nameKw}
              onChange={e => setNameKw(e.target.value)}
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
              value={nameKw}
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
        {isMapExpandOverlay && viewMode === 'list' ? (
          <div className="zht-alarm-rail__table-wrap hz-cm-project-table-wrap">
            <Table<ConstructionProject>
              size="small"
              rowKey="id"
              pagination={false}
              tableLayout="fixed"
              scroll={{ x: tableScrollX }}
              rowSelection={tableRowSelection}
              columns={tableColumns}
              dataSource={displayProjects}
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
            {renderProjectCards(displayProjects)}
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
        <aside
        className={[
          'zht-right-rail',
          'zht-right-rail--stat-drawer',
          stackOverlay ? 'hz-cm-right-rail-stack' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label="建设工程项目"
      >
        <div
          className="zht-alarm-rail zht-stat-drawer zht-stat-drawer--rail"
          role="region"
          aria-labelledby="hz-cm-project-rail-title"
        >
          {listInner}
        </div>
        {stackOverlay}
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
        aria-labelledby="hz-cm-project-overlay-title"
      >
        {listInner}
      </div>
        {exportModal}
      </>
    );
  }

  return null;
};
