/**
 * 综合态势 · 雨水/污水管网 / 检查井：底部表抽屉（数据与设施管理排水管线、排水管点同源；查询与「字段」与设施台账一致，详情与列表「详情」一致）
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button, Input, Modal, Select, Space, Table } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  buildPipeLineAllColumnConfigs,
  getPipeLineTableDefaultVisibleColumnKeys,
} from '../韶山水环境设施管理系统/pipe-line-facility-columns';
import { buildPipeNodeAllColumnConfigs, getPipeNodeTableDefaultVisibleColumnKeys } from '../韶山水环境设施管理系统/pipe-node-facility-columns';
import { getFacilityTableScrollX, PipeLineColumnManager, type ColumnConfig } from '../韶山水环境设施管理系统/pipe-line-table-kit';
import { pipeLineData, pipeNodeData, type PipeLineDemoRow, type PipeNodeDemoRow } from '../韶山水环境设施管理系统/pipe-network-demo-data';
import { PipeLineDetailReadonlyContent } from '../韶山水环境设施管理系统/pipeLineDetailReadonlyContent';
import { PipeNodeDetailReadonlyContent, pipeNodeDetailModalTitle } from '../韶山水环境设施管理系统/pipeNodeDetailReadonlyContent';
import type { ZhtStatDrawerMapFocus } from './zhtLeftStatDrawerData';
import { zhtPipeLineCategoryFromItemLabel } from './zhtPipeLineLeftStat';

const { Search } = Input;

export type ZhtPipeLineBottomDrawerProps = {
  itemLabel: string;
  /** 关闭并清空左侧选中 */
  onClose: () => void;
  /** 定位：管线两端包络或管点点位，与指标抽屉地图定位同源 */
  onLocateOnMap: (focus: ZhtStatDrawerMapFocus) => void;
};

function findNode(nodeId: string) {
  return pipeNodeData.find(n => n.nodeId === nodeId);
}

function lineMapFocus(row: PipeLineDemoRow): ZhtStatDrawerMapFocus | undefined {
  const from = findNode(row.fromNodeId);
  const to = findNode(row.toNodeId);
  if (!from || !to) return undefined;
  const w = Math.min(from.x, to.x);
  const e = Math.max(from.x, to.x);
  const s = Math.min(from.y, to.y);
  const n = Math.max(from.y, to.y);
  if (![w, e, s, n].every(Number.isFinite)) return undefined;
  const pad = 0.0008;
  return { kind: 'bounds', west: w - pad, south: s - pad, east: e + pad, north: n + pad, padding: 48 };
}

export const ZhtPipeLineBottomDrawer: React.FC<ZhtPipeLineBottomDrawerProps> = ({
  itemLabel,
  onClose,
  onLocateOnMap,
}) => {
  const isManhole = itemLabel === '检查井';
  const category: '1' | '2' | null = isManhole ? null : zhtPipeLineCategoryFromItemLabel(itemLabel);
  const [slideOpen, setSlideOpen] = useState(false);
  const [lineDetail, setLineDetail] = useState<PipeLineDemoRow | null>(null);
  const [nodeDetail, setNodeDetail] = useState<PipeNodeDemoRow | null>(null);
  /** 管线/管点 共用顶栏（设施管理管点为「管点标识码」单字段检索） */
  const [searchKw, setSearchKw] = useState('');
  const [filterMaterial, setFilterMaterial] = useState<string | undefined>(undefined);
  /** 管线表：与设施排水管线列一致 */
  const [lineFilterStatus, setLineFilterStatus] = useState<string | undefined>(undefined);
  /** 管点表：与设施「排水管点管理」管点类型 / 设施状态 一致 */
  const [nodeFilterType, setNodeFilterType] = useState<string | undefined>('1');
  const [nodeFilterFacilityStatus, setNodeFilterFacilityStatus] = useState<string | undefined>(undefined);
  const tableBodyRef = useRef<HTMLDivElement>(null);
  const [tableScrollY, setTableScrollY] = useState(200);

  const syncTableBodyScroll = useCallback(() => {
    const el = tableBodyRef.current;
    if (!el) return;
    const next = Math.floor(el.clientHeight - 2);
    setTableScrollY(Math.max(120, next));
  }, []);

  const [visibleLineColumns, setVisibleLineColumns] = useState<string[]>(() => getPipeLineTableDefaultVisibleColumnKeys());
  const [visibleNodeColumns, setVisibleNodeColumns] = useState<string[]>(() => getPipeNodeTableDefaultVisibleColumnKeys());

  useEffect(() => {
    setSearchKw('');
    setFilterMaterial(undefined);
    setLineFilterStatus(undefined);
    // 与设施管点表一致：进入检查井/切换指标时默认识别检查井，可清除为全部管点类型
    setNodeFilterType('1');
    setNodeFilterFacilityStatus(undefined);
    setLineDetail(null);
    setNodeDetail(null);
    setVisibleLineColumns(getPipeLineTableDefaultVisibleColumnKeys());
    setVisibleNodeColumns(getPipeNodeTableDefaultVisibleColumnKeys());
  }, [itemLabel]);

  useEffect(() => {
    setSlideOpen(false);
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setSlideOpen(true));
    });
    return () => window.cancelAnimationFrame(id);
  }, [itemLabel]);

  const baseLineRows = useMemo(() => {
    if (isManhole || !category) return [] as PipeLineDemoRow[];
    return pipeLineData.filter(r => r.lineCategory === category);
  }, [category, isManhole]);

  const baseNodeRows = useMemo(() => {
    return pipeNodeData.filter(n => {
      if (nodeFilterType && n.nodeType !== nodeFilterType) return false;
      return true;
    });
  }, [nodeFilterType]);

  const filteredLineRows = useMemo(() => {
    return baseLineRows.filter(r => {
      if (filterMaterial && r.material !== filterMaterial) return false;
      if (lineFilterStatus && r.status !== lineFilterStatus) return false;
      const q = searchKw.trim().toLowerCase();
      if (q) {
        const hay = [r.lineId, r.fromNodeId, r.toNodeId, r.systemId].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [baseLineRows, searchKw, filterMaterial, lineFilterStatus]);

  const filteredNodeRows = useMemo(() => {
    return baseNodeRows.filter(r => {
      if (nodeFilterFacilityStatus != null && nodeFilterFacilityStatus !== '' && r.status !== nodeFilterFacilityStatus) {
        return false;
      }
      const q = searchKw.trim().toLowerCase();
      if (q && !String(r.nodeId).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [baseNodeRows, searchKw, nodeFilterFacilityStatus]);

  const allLineColumns = useMemo(
    () =>
      buildPipeLineAllColumnConfigs({
        mode: 'zht',
        onDetail: r => setLineDetail(r),
        onLocate: r => {
          const f = lineMapFocus(r);
          if (f) onLocateOnMap(f);
        },
      }),
    [onLocateOnMap],
  );

  const allNodeColumns = useMemo(
    () =>
      buildPipeNodeAllColumnConfigs({
        mode: 'zht',
        onDetail: r => setNodeDetail(r),
        onLocate: r => {
          if (Number.isFinite(r.x) && Number.isFinite(r.y)) {
            onLocateOnMap({ kind: 'point', lng: r.x, lat: r.y, zoom: 17 });
          }
        },
      }),
    [onLocateOnMap],
  );

  useLayoutEffect(() => {
    if (!slideOpen) return;
    syncTableBodyScroll();
    const el = tableBodyRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => syncTableBodyScroll());
    ro.observe(el);
    window.addEventListener('resize', syncTableBodyScroll);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', syncTableBodyScroll);
    };
  }, [
    slideOpen,
    syncTableBodyScroll,
    isManhole,
    filteredLineRows.length,
    filteredNodeRows.length,
    filterMaterial,
    lineFilterStatus,
    nodeFilterFacilityStatus,
    nodeFilterType,
    searchKw,
  ]);

  const lineTableColumns: ColumnsType<PipeLineDemoRow> = useMemo(() => {
    return allLineColumns
      .filter(col => visibleLineColumns.includes(col.key) || col.key === 'operation')
      .sort((a: ColumnConfig, b: ColumnConfig) => {
        if (a.key === 'operation') return 1;
        if (b.key === 'operation') return -1;
        const indexA = visibleLineColumns.indexOf(a.key);
        const indexB = visibleLineColumns.indexOf(b.key);
        return indexA - indexB;
      })
      .map(col => (col.key === 'operation' ? { ...col, fixed: 'right' as const } : col)) as ColumnsType<PipeLineDemoRow>;
  }, [allLineColumns, visibleLineColumns]);

  const nodeTableColumns: ColumnsType<PipeNodeDemoRow> = useMemo(() => {
    return allNodeColumns
      .filter(col => visibleNodeColumns.includes(col.key) || col.key === 'operation')
      .sort((a: ColumnConfig, b: ColumnConfig) => {
        if (a.key === 'operation') return 1;
        if (b.key === 'operation') return -1;
        const indexA = visibleNodeColumns.indexOf(a.key);
        const indexB = visibleNodeColumns.indexOf(b.key);
        return indexA - indexB;
      })
      .map(col => (col.key === 'operation' ? { ...col, fixed: 'right' as const } : col)) as ColumnsType<PipeNodeDemoRow>;
  }, [allNodeColumns, visibleNodeColumns]);

  const lineTableScrollX = getFacilityTableScrollX(
    allLineColumns.filter(col => visibleLineColumns.includes(col.key) || col.key === 'operation'),
  );

  const nodeTableScrollX = getFacilityTableScrollX(
    allNodeColumns.filter(col => visibleNodeColumns.includes(col.key) || col.key === 'operation'),
  );

  const drawerTitle = isManhole ? '检查井列表' : '管线列表';
  const searchPh = isManhole ? '搜索管点标识码' : '搜索管线标识码或管点编号';

  return (
    <div
      className={`zht-pipe-bottom-drawer-host${slideOpen ? ' zht-pipe-bottom-drawer-host--open' : ''}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby="zht-pipe-bottom-drawer-title"
    >
      <div className="zht-pipe-bottom-drawer">
        <header className="zht-pipe-bottom-drawer__hd">
          <div className="zht-pipe-bottom-drawer__hd-left">
            <h2 id="zht-pipe-bottom-drawer-title" className="zht-pipe-bottom-drawer__title">
              <span className="zht-pipe-bottom-drawer__pipe">|</span>
              {drawerTitle}
            </h2>
            <Space size={8} wrap className="zht-pipe-bottom-drawer__hd-filters">
              <Search
                allowClear
                placeholder={searchPh}
                value={searchKw}
                onChange={e => setSearchKw(e.target.value)}
                onSearch={setSearchKw}
                style={{ width: 220 }}
              />
              {isManhole ? (
                <>
                  <Select
                    allowClear
                    placeholder="管点类型"
                    style={{ width: 120 }}
                    value={nodeFilterType}
                    onChange={v => setNodeFilterType(v as string | undefined)}
                  >
                    <Select.Option value="1">检查井</Select.Option>
                    <Select.Option value="2">雨水口</Select.Option>
                  </Select>
                  <Select
                    allowClear
                    placeholder="设施状态"
                    style={{ width: 100 }}
                    value={nodeFilterFacilityStatus}
                    onChange={v => setNodeFilterFacilityStatus(v as string | undefined)}
                  >
                    <Select.Option value="1">运行</Select.Option>
                    <Select.Option value="0">废弃</Select.Option>
                    <Select.Option value="2">在建</Select.Option>
                  </Select>
                </>
              ) : (
                <>
                  <Select
                    disabled
                    placeholder="管线类别"
                    style={{ width: 88 }}
                    value={category ?? '1'}
                    options={[
                      { value: '1', label: '雨水' },
                      { value: '2', label: '污水' },
                      { value: '3', label: '合流' },
                    ]}
                  />
                  <Select
                    allowClear
                    placeholder="材质"
                    style={{ width: 120 }}
                    value={filterMaterial}
                    onChange={v => setFilterMaterial(v)}
                  >
                    <Select.Option value="HDPE">HDPE</Select.Option>
                    <Select.Option value="钢筋混凝土">钢筋混凝土</Select.Option>
                    <Select.Option value="PVC">PVC</Select.Option>
                  </Select>
                  <Select
                    allowClear
                    placeholder="状态"
                    style={{ width: 100 }}
                    value={lineFilterStatus}
                    onChange={v => setLineFilterStatus(v)}
                  >
                    <Select.Option value="1">正常</Select.Option>
                    <Select.Option value="2">废弃/检修</Select.Option>
                    <Select.Option value="3">其他</Select.Option>
                  </Select>
                </>
              )}
            </Space>
          </div>
          <Space className="zht-pipe-bottom-drawer__hd-actions" size={4}>
            {isManhole ? (
              <PipeLineColumnManager
                columns={allNodeColumns}
                visibleColumns={visibleNodeColumns}
                onChange={setVisibleNodeColumns}
              />
            ) : (
              <PipeLineColumnManager
                columns={allLineColumns}
                visibleColumns={visibleLineColumns}
                onChange={setVisibleLineColumns}
              />
            )}
            <Button type="text" className="zht-pipe-bottom-drawer__close" aria-label="关闭" onClick={onClose} icon={<CloseOutlined />} />
          </Space>
        </header>
        <div ref={tableBodyRef} className="zht-pipe-bottom-drawer__body zht-pipe-bottom-drawer__body--table">
          {isManhole ? (
            <Table<PipeNodeDemoRow>
              size="small"
              rowKey="nodeId"
              columns={nodeTableColumns}
              dataSource={filteredNodeRows}
              pagination={{ pageSize: 6 }}
              scroll={{ x: nodeTableScrollX, y: tableScrollY }}
              locale={{ emptyText: '暂无符合条件的管点数据' }}
            />
          ) : (
            <Table<PipeLineDemoRow>
              size="small"
              rowKey="lineId"
              columns={lineTableColumns}
              dataSource={filteredLineRows}
              pagination={{ pageSize: 6 }}
              scroll={{ x: lineTableScrollX, y: tableScrollY }}
              locale={{ emptyText: '暂无符合条件的管线数据' }}
            />
          )}
        </div>
      </div>

      <Modal
        className="facility-detail-modal"
        title={lineDetail ? `管线详情 - ${lineDetail.lineId}` : ''}
        open={lineDetail != null}
        onCancel={() => setLineDetail(null)}
        footer={null}
        width={920}
        destroyOnClose
        styles={{ body: { maxHeight: 'min(85vh, 900px)', overflowY: 'auto' } }}
      >
        {lineDetail ? <PipeLineDetailReadonlyContent record={lineDetail} showLocationMap={false} /> : null}
      </Modal>

      <Modal
        className="facility-detail-modal"
        title={nodeDetail ? pipeNodeDetailModalTitle(nodeDetail) : ''}
        open={nodeDetail != null}
        onCancel={() => setNodeDetail(null)}
        footer={null}
        width={920}
        destroyOnClose
        styles={{ body: { maxHeight: 'min(85vh, 900px)', overflowY: 'auto' } }}
      >
        {nodeDetail ? <PipeNodeDetailReadonlyContent record={nodeDetail} showLocationMap={false} /> : null}
      </Modal>
    </div>
  );
};
