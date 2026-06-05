import React, { useMemo } from 'react';
import { Descriptions, Table } from 'antd';
import { DetailTabsIfMultiple } from '../shared/detailTabsIfMultiple';
import { RiverSourceMouthWgs84DetailMap } from '../shared/riverSourceMouthWgs84Map';
import {
  getShaoshanAddvcdLabel,
  riverAttCodeLabel,
  RV_ATT_BANK_OPTIONS,
  RV_ATT_CR_OVER_TYPE_OPTIONS,
  RV_ATT_RV_GRAD_OPTIONS,
  RV_ATT_RV_TYPE_OPTIONS,
  type RiverChannelMasterRow,
  type RiverSectionRow,
} from './riverChiefDb4401';

function formatFlowArea(flowArea: string | undefined): string {
  const codes = String(flowArea ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (!codes.length) return '—';
  return codes.map(code => `${getShaoshanAddvcdLabel(code)}（${code}）`).join('、');
}

export function RiverChannelReadonlyDetailContent({
  river,
  sections,
  showLocationMiniMap = true,
}: {
  river: RiverChannelMasterRow;
  sections: RiverSectionRow[];
  showLocationMiniMap?: boolean;
}) {
  const linkedSections = useMemo(
    () => sections.filter(s => s.linkedRiverObjectId === river.riverObjectId),
    [sections, river.riverObjectId],
  );

  return (
    <DetailTabsIfMultiple
      size="small"
      defaultActiveKey="basic"
      className="facility-detail-tabs"
      items={[
        {
          key: 'basic',
          label: '基本信息',
          children: (
            <>
              <Descriptions bordered size="small" column={1} className="zht-river-section-detail-desc">
                <Descriptions.Item label="河流代码">{river.riverObjectId}</Descriptions.Item>
                <Descriptions.Item label="河流名称">{river.riverName}</Descriptions.Item>
                <Descriptions.Item label="跨界类型">
                  {riverAttCodeLabel(RV_ATT_CR_OVER_TYPE_OPTIONS, river.crOverType)}
                </Descriptions.Item>
                <Descriptions.Item label="河流类型">
                  {riverAttCodeLabel(RV_ATT_RV_TYPE_OPTIONS, river.rvType)}
                </Descriptions.Item>
                <Descriptions.Item label="河流级别">
                  {riverAttCodeLabel(RV_ATT_RV_GRAD_OPTIONS, river.rvGrad)}
                </Descriptions.Item>
                <Descriptions.Item label="岸别">
                  {riverAttCodeLabel(RV_ATT_BANK_OPTIONS, river.bank)}
                </Descriptions.Item>
                <Descriptions.Item label="河源经度（度）">{Number(river.rvSourLong).toFixed(6)}</Descriptions.Item>
                <Descriptions.Item label="河源纬度（度）">{Number(river.rvSourLat).toFixed(6)}</Descriptions.Item>
                <Descriptions.Item label="河口经度（度）">{Number(river.rvMouLong).toFixed(6)}</Descriptions.Item>
                <Descriptions.Item label="河口纬度（度）">{Number(river.rvMouLat).toFixed(6)}</Descriptions.Item>
                <Descriptions.Item label="河源所在位置">{river.rvSourLoc?.trim() || '—'}</Descriptions.Item>
                <Descriptions.Item label="河口所在位置">{river.rvMouLoc?.trim() || '—'}</Descriptions.Item>
                {showLocationMiniMap ? (
                  <Descriptions.Item
                    label="河源与河口位置地图"
                    span={2}
                    className="facility-river-detail-map-item"
                    contentStyle={{ display: 'block', width: '100%', maxWidth: '100%' }}
                  >
                    <div className="facility-river-detail-map-wrap">
                      <RiverSourceMouthWgs84DetailMap
                        title={river.riverName}
                        sourLng={river.rvSourLong}
                        sourLat={river.rvSourLat}
                        mouLng={river.rvMouLong}
                        mouLat={river.rvMouLat}
                        mapAriaLabel="河源与河口位置地图"
                        firstMarkerShortLabel="河源"
                        secondMarkerShortLabel="河口"
                      />
                    </div>
                  </Descriptions.Item>
                ) : null}
                <Descriptions.Item label="河流流经行政区">
                  {formatFlowArea(river.flowArea)}
                </Descriptions.Item>
                <Descriptions.Item label="河长（千米）">{river.rvLen ?? '—'}</Descriptions.Item>
                <Descriptions.Item label="集水面积（平方千米）">{river.rvBasArea ?? '—'}</Descriptions.Item>
                <Descriptions.Item label="平均比降（千分比）">{river.averSlop ?? '—'}</Descriptions.Item>
                <Descriptions.Item label="已建档责任段数（聚合）">{linkedSections.length}</Descriptions.Item>
                <Descriptions.Item label="备注">
                  {river.remarks?.trim() || '—'}
                </Descriptions.Item>
              </Descriptions>
            </>
          ),
        },
        {
          key: 'sections',
          label: `关联河段（${linkedSections.length}）`,
          children: (
            <div className="facility-table-wrap">
              <Table<RiverSectionRow>
                rowKey="key"
                size="small"
                dataSource={linkedSections}
                pagination={linkedSections.length > 8 ? { pageSize: 8, showTotal: n => `共 ${n} 段` } : false}
                scroll={{ x: 960 }}
                columns={[
                  { title: '河段编码', dataIndex: 'sectionId', width: 220 },
                  { title: '河段名称', dataIndex: 'sectionName', width: 220 },
                  { title: '管理级别', dataIndex: 'adminLevel', width: 120 },
                  { title: '管理机构', dataIndex: 'adminAgency', width: 180 },
                  { title: '河长（km）', dataIndex: 'riverLenKm', width: 120 },
                ]}
              />
            </div>
          ),
        },
      ]}
    />
  );
}
