/**
 * 事件联动分析：以锚点点位（污水厂、泵站或监测点）坐标为圆心，半径内设施与入河排口（原型面板）。
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Collapse, InputNumber, Space, Table, Tabs, Typography, message } from 'antd';
import {
  buildEventRadiusLinkageSnapshot,
  buildNearbyFacilitiesSummary,
  buildRiverOutletSectionSummary,
  resolvePlantEventAnchor,
  type EventRadiusLinkageSnapshot,
  type RadiusIndustryRow,
  type RadiusMonitorRow,
  type RadiusOutletRow,
  type RadiusPlantRow,
} from './facility-event-radius-linkage-data';
import { openRadiusLinkageRowDetail, type RadiusLinkageDetailTarget } from './facility-event-radius-linkage-open-detail';

const { Text } = Typography;

/** 子表行点击打开台账详情（无 opener 时不附加 onRow） */
function linkageTableRowProps<T>(
  opener:
    | ((title: string, content: React.ReactNode, modalWidth?: number | string) => void)
    | undefined,
  map: (record: T) => RadiusLinkageDetailTarget,
): { onRow?: (record: T) => { onClick: () => void; style: React.CSSProperties } } {
  if (!opener) return {};
  return {
    onRow: (record: T) => ({
      onClick: () => openRadiusLinkageRowDetail(opener, map(record)),
      style: { cursor: 'pointer' },
    }),
  };
}

export type FacilityEventRadiusLinkagePanelProps = {
  /** 事件关联点位编码 */
  plantCode: string;
  /** 展示用 */
  plantName: string;
  eventId: string;
  /** 表格行点击打开台账详情（不传则不启用行点击） */
  onOpenDetail?: (title: string, content: React.ReactNode, modalWidth?: number | string) => void;
};

export const FacilityEventRadiusLinkagePanel: React.FC<FacilityEventRadiusLinkagePanelProps> = ({
  plantCode,
  plantName,
  eventId,
  onOpenDetail,
}) => {
  const [radiusM, setRadiusM] = useState(500);
  const [snapshot, setSnapshot] = useState<EventRadiusLinkageSnapshot | null>(null);

  const runAnalyze = useCallback(
    (rMeters: number) => {
      const anchor = resolvePlantEventAnchor(plantCode, plantName);
      const snap = buildEventRadiusLinkageSnapshot(anchor, rMeters);
      setSnapshot(snap);
      if (!anchor.ok) {
        message.warning(anchor.reason);
      }
    },
    [plantCode, plantName],
  );

  useEffect(() => {
    setRadiusM(500);
    runAnalyze(500);
  }, [plantCode, eventId, runAnalyze]);

  const nearbySummary = useMemo(() => (snapshot ? buildNearbyFacilitiesSummary(snapshot) : ''), [snapshot]);
  const riverSummary = useMemo(() => (snapshot ? buildRiverOutletSectionSummary(snapshot) : ''), [snapshot]);

  const industryCols = useMemo(
    () => [
      { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true },
      { title: '类型', dataIndex: 'typeLabel', key: 'typeLabel', width: 100 },
      { title: '所属乡镇', dataIndex: 'township', key: 'township', width: 120 },
      { title: '距离(m)', dataIndex: 'distanceM', key: 'distanceM', width: 88 },
      { title: '经度', dataIndex: 'lng', key: 'lng', width: 100 },
      { title: '纬度', dataIndex: 'lat', key: 'lat', width: 100 },
    ],
    [],
  );

  const outletColsNearby = useMemo(
    () => [
      { title: '排口名称', dataIndex: 'name', key: 'name', ellipsis: true },
      { title: '类型', dataIndex: 'typeLabel', key: 'typeLabel', width: 140 },
      { title: '排口编码', dataIndex: 'code', key: 'code', width: 160 },
      { title: '受纳水体', dataIndex: 'receivingWater', key: 'receivingWater', width: 120, ellipsis: true },
      { title: '距离(m)', dataIndex: 'distanceM', key: 'distanceM', width: 88 },
      { title: '经度', dataIndex: 'lng', key: 'lng', width: 100 },
      { title: '纬度', dataIndex: 'lat', key: 'lat', width: 100 },
    ],
    [],
  );

  const monitorCols = useMemo(
    () => [
      { title: '管点编号', dataIndex: 'nodeId', key: 'nodeId', width: 140 },
      { title: '所在道路', dataIndex: 'roadName', key: 'roadName', ellipsis: true },
      { title: '井类型', dataIndex: 'manholeCategory', key: 'manholeCategory', width: 120 },
      { title: '类型', dataIndex: 'typeLabel', key: 'typeLabel', width: 100 },
      { title: '距离(m)', dataIndex: 'distanceM', key: 'distanceM', width: 88 },
      { title: '经度', dataIndex: 'lng', key: 'lng', width: 100 },
      { title: '纬度', dataIndex: 'lat', key: 'lat', width: 100 },
    ],
    [],
  );

  const plantCols = useMemo(
    () => [
      { title: '污水处理厂名称', dataIndex: 'name', key: 'name', ellipsis: true },
      { title: '类型', dataIndex: 'typeLabel', key: 'typeLabel', width: 160 },
      { title: '标识码', dataIndex: 'id', key: 'id', width: 160 },
      { title: '距离(m)', dataIndex: 'distanceM', key: 'distanceM', width: 88 },
      { title: '经度', dataIndex: 'lng', key: 'lng', width: 100 },
      { title: '纬度', dataIndex: 'lat', key: 'lat', width: 100 },
    ],
    [],
  );

  const outletColsRiver = useMemo(
    () => [
      { title: '排口编号', dataIndex: 'code', key: 'code', width: 160, ellipsis: true },
      { title: '排口名称', dataIndex: 'name', key: 'name', ellipsis: true },
      { title: '排口地址', dataIndex: 'address', key: 'address', ellipsis: true },
      { title: '受纳水体', dataIndex: 'receivingWater', key: 'receivingWater', width: 120, ellipsis: true },
      { title: '排口类型', dataIndex: 'typeLabel', key: 'typeLabel', width: 160 },
      { title: '距离(m)', dataIndex: 'distanceM', key: 'distanceM', width: 88 },
    ],
    [],
  );

  const anchorOk = snapshot?.anchor.ok === true;

  /** 筛查汇总计数（与折叠区内 Tab 合计一致，便于与台账弹窗「统计」阅读习惯对齐） */
  const tallyStrip = useMemo(() => {
    if (!snapshot || !anchorOk) return '';
    const nInd = snapshot.industries.length;
    const nEnt = snapshot.enterpriseIndustrialOutlets.length;
    const nMon = snapshot.waterMonitors.length;
    const nPlt = snapshot.otherPlants.length;
    const nNear = nInd + nEnt + nMon + nPlt;
    const nRv =
      snapshot.outletsUrbanStorm.length +
      snapshot.outletsIndustrialStorm.length +
      snapshot.outletsOther.length;
    return `筛查汇总：附近设施合计 ${nNear} 处（工业源 ${nInd}；企业工业排口 ${nEnt}；水情监测 ${nMon}；污水处理设施 ${nPlt}）；入河排口合计 ${nRv} 处（城镇雨洪 ${snapshot.outletsUrbanStorm.length}；工业企业雨洪 ${snapshot.outletsIndustrialStorm.length}；其他 ${snapshot.outletsOther.length}）。`;
  }, [anchorOk, snapshot]);

  return (
    <div className="facility-radius-linkage-root">
      <div className="facility-radius-linkage-toolbar">
        <Space size="middle" wrap className="facility-radius-linkage-toolbar-actions">
          <Space size={6}>
            <span className="facility-radius-linkage-toolbar-label">分析半径</span>
            <InputNumber
              min={50}
              max={50000}
              step={1}
              value={radiusM}
              onChange={v => {
                // 输入过程中常会收到 null；若写成 null→500 会导致无法在框内改数字
                if (typeof v === 'number' && Number.isFinite(v)) setRadiusM(v);
              }}
              style={{ width: 120 }}
            />
            <span className="facility-radius-linkage-toolbar-unit">米</span>
          </Space>
          <Button
            type="primary"
            className="search-btn"
            onClick={() => {
              const clamped = Math.min(50000, Math.max(50, Math.round(radiusM)));
              if (clamped !== radiusM) setRadiusM(clamped);
              runAnalyze(clamped);
            }}
          >
            分析
          </Button>
        </Space>
      </div>

      <div className="facility-radius-linkage-body">
        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
          事件 {eventId} · 锚点点位：{plantName}（{plantCode}）
          {anchorOk && snapshot ? ` · 当前半径 ${snapshot.radiusM} 米` : null}
        </Text>
        {tallyStrip ? (
          <Text type="secondary" style={{ display: 'block', marginBottom: 12, lineHeight: 1.65 }}>
            {tallyStrip}
          </Text>
        ) : null}

        {!anchorOk && snapshot?.anchor.ok === false ? (
          <Alert type="warning" showIcon message="无法定位事件锚点" description={snapshot.anchor.reason} style={{ marginBottom: 12 }} />
        ) : null}

        <Collapse
          defaultActiveKey={['nearby', 'river']}
          items={[
            {
              key: 'nearby',
              label: <span className="facility-radius-linkage-collapse-head">附近设施</span>,
              children: (
                <div>
                  <Text style={{ display: 'block', marginBottom: 12 }}>{nearbySummary}</Text>
                  <Tabs
                    size="small"
                    items={[
                      {
                        key: 'ind',
                        label: `工业源(${snapshot?.industries.length ?? 0})`,
                        children: (
                          <Table<RadiusIndustryRow>
                            rowKey="key"
                            size="small"
                            pagination={false}
                            columns={industryCols}
                            dataSource={snapshot?.industries ?? []}
                            locale={{ emptyText: '半径内暂无工业源' }}
                            scroll={{ x: 900 }}
                            {...linkageTableRowProps(onOpenDetail, r => ({
                              kind: 'industry',
                              recordId: r.key.replace(/^ind-/, ''),
                            }))}
                          />
                        ),
                      },
                      {
                        key: 'entOutlet',
                        label: `企业工业排口(${snapshot?.enterpriseIndustrialOutlets.length ?? 0})`,
                        children: (
                          <Table<RadiusOutletRow>
                            rowKey="key"
                            size="small"
                            pagination={false}
                            columns={outletColsNearby}
                            dataSource={snapshot?.enterpriseIndustrialOutlets ?? []}
                            locale={{ emptyText: '半径内暂无企业工业排口' }}
                            scroll={{ x: 980 }}
                            {...linkageTableRowProps(onOpenDetail, r => ({
                              kind: 'outlet',
                              code: r.code,
                            }))}
                          />
                        ),
                      },
                      {
                        key: 'mon',
                        label: `水情监测(${snapshot?.waterMonitors.length ?? 0})`,
                        children: (
                          <Table<RadiusMonitorRow>
                            rowKey="key"
                            size="small"
                            pagination={false}
                            columns={monitorCols}
                            dataSource={snapshot?.waterMonitors ?? []}
                            locale={{ emptyText: '半径内暂无水质监测管点' }}
                            scroll={{ x: 900 }}
                            {...linkageTableRowProps(onOpenDetail, r => ({
                              kind: 'monitor',
                              nodeId: r.nodeId,
                            }))}
                          />
                        ),
                      },
                      {
                        key: 'wwtp',
                        label: `污水处理设施(${snapshot?.otherPlants.length ?? 0})`,
                        children: (
                          <Table<RadiusPlantRow>
                            rowKey="key"
                            size="small"
                            pagination={false}
                            columns={plantCols}
                            dataSource={snapshot?.otherPlants ?? []}
                            locale={{ emptyText: '半径内暂无其他污水厂' }}
                            scroll={{ x: 880 }}
                            {...linkageTableRowProps(onOpenDetail, r => ({
                              kind: 'plant',
                              id: r.id,
                            }))}
                          />
                        ),
                      },
                    ]}
                  />
                </div>
              ),
            },
            {
              key: 'river',
              label: <span className="facility-radius-linkage-collapse-head">入河排口</span>,
              children: (
                <div>
                  <Text style={{ display: 'block', marginBottom: 12 }}>{riverSummary}</Text>
                  <Tabs
                    size="small"
                    items={[
                      {
                        key: 'urbanStorm',
                        label: `其他城镇雨洪排口(${snapshot?.outletsUrbanStorm.length ?? 0})`,
                        children: (
                          <Table<RadiusOutletRow>
                            rowKey="key"
                            size="small"
                            pagination={false}
                            columns={outletColsRiver}
                            dataSource={snapshot?.outletsUrbanStorm ?? []}
                            locale={{ emptyText: '半径内暂无城镇雨洪排口' }}
                            scroll={{ x: 980 }}
                            {...linkageTableRowProps(onOpenDetail, r => ({
                              kind: 'outlet',
                              code: r.code,
                            }))}
                          />
                        ),
                      },
                      {
                        key: 'indStorm',
                        label: `工业企业雨洪排口(${snapshot?.outletsIndustrialStorm.length ?? 0})`,
                        children: (
                          <Table<RadiusOutletRow>
                            rowKey="key"
                            size="small"
                            pagination={false}
                            columns={outletColsRiver}
                            dataSource={snapshot?.outletsIndustrialStorm ?? []}
                            locale={{ emptyText: '半径内暂无工业企业雨洪排口' }}
                            scroll={{ x: 980 }}
                            {...linkageTableRowProps(onOpenDetail, r => ({
                              kind: 'outlet',
                              code: r.code,
                            }))}
                          />
                        ),
                      },
                      {
                        key: 'otherOutlet',
                        label: `其他类型(${snapshot?.outletsOther.length ?? 0})`,
                        children: (
                          <Table<RadiusOutletRow>
                            rowKey="key"
                            size="small"
                            pagination={false}
                            columns={outletColsRiver}
                            dataSource={snapshot?.outletsOther ?? []}
                            locale={{ emptyText: '半径内暂无其他类型入河排口' }}
                            scroll={{ x: 980 }}
                            {...linkageTableRowProps(onOpenDetail, r => ({
                              kind: 'outlet',
                              code: r.code,
                            }))}
                          />
                        ),
                      },
                    ]}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
};
