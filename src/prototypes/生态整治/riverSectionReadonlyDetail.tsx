/**
 * 责任段/河段详情 · 与「生态整治 · 责任段信息」`河段详情` 只读弹窗 1:1
 */
import React from 'react';
import { Descriptions } from 'antd';
import { RiverSourceMouthWgs84DetailMap } from '../shared/riverSourceMouthWgs84Map';
import {
  ADMIN_LEVEL_LABEL,
  getShaoshanAddvcdLabel,
  RIVER_DIST_LABEL,
  RIVER_SIDE_LABEL,
  SECTION_TYPE_LABEL,
  type RiverChannelMasterRow,
  type RiverSectionRow,
} from './riverChiefDb4401';

export type RiverSectionReadonlyDetailContentProps = {
  viewRecord: RiverSectionRow;
  /** 全部责任段，用于「上一级河段」回显；与业务页 `data` 一致 */
  allSections: readonly RiverSectionRow[];
  /** 河流主数据，「所属河流」回显用 */
  riverChannels: readonly RiverChannelMasterRow[];
  showLocationMiniMap?: boolean;
};

export function RiverSectionReadonlyDetailContent({
  viewRecord,
  allSections,
  riverChannels,
  showLocationMiniMap = true,
}: RiverSectionReadonlyDetailContentProps) {
  const data = allSections;
  return (
    <>
      <Descriptions
        column={2}
        bordered
        size="small"
        className="zht-river-section-detail-desc facility-river-detail-location-desc"
        style={{ marginTop: 16 }}
      >
        <Descriptions.Item label="河段编码" span={2}>
          {viewRecord.sectionId}
        </Descriptions.Item>
        <Descriptions.Item label="河段名称" span={2}>
          {viewRecord.sectionName}
        </Descriptions.Item>
        <Descriptions.Item label="所属水系">{viewRecord.riverSystem}</Descriptions.Item>
        <Descriptions.Item label="岸别（河段相对河流）">{RIVER_SIDE_LABEL[viewRecord.riverSide]}</Descriptions.Item>
        <Descriptions.Item label="河段类型">{SECTION_TYPE_LABEL[viewRecord.sectionType]}</Descriptions.Item>
        <Descriptions.Item label="管理级别">{ADMIN_LEVEL_LABEL[viewRecord.adminLevel]}</Descriptions.Item>
        <Descriptions.Item label="上一级河段" span={2}>
          {(() => {
            const pid = viewRecord.parentId;
            if (!pid) return '—';
            const ps = data.find(d => d.sectionId === pid);
            if (ps) return `${ps.sectionName}（${ps.sectionId}）`;
            return viewRecord.parentName ? `${viewRecord.parentName}（${pid}）` : pid;
          })()}
        </Descriptions.Item>
        <Descriptions.Item label="所属区划">{getShaoshanAddvcdLabel(viewRecord.addvcd)}</Descriptions.Item>
        <Descriptions.Item label="管理机构">{viewRecord.adminAgency}</Descriptions.Item>
        <Descriptions.Item label="河段长度（千米）">{viewRecord.riverLenKm}</Descriptions.Item>
        <Descriptions.Item label="汇水面积（平方千米）">{viewRecord.basinAreaKm2}</Descriptions.Item>
        <Descriptions.Item label="责任河长">{viewRecord.chiefName}</Descriptions.Item>
        <Descriptions.Item label="联系电话">{viewRecord.chiefMobile}</Descriptions.Item>
        <Descriptions.Item label="所属河流（河流代码）" span={2}>
          {(() => {
            const ch = riverChannels.find(r => r.riverObjectId === viewRecord.linkedRiverObjectId);
            return ch ? `${ch.riverName}（${ch.riverObjectId}）` : viewRecord.linkedRiverObjectId || '—';
          })()}
        </Descriptions.Item>
        <Descriptions.Item label="河段起点名称">{(viewRecord.startAddr ?? '').trim() || '—'}</Descriptions.Item>
        <Descriptions.Item label="河段终点名称">{(viewRecord.endAddr ?? '').trim() || '—'}</Descriptions.Item>
        <Descriptions.Item label="起点经度（°）">{viewRecord.startLgtd?.toFixed(6)}</Descriptions.Item>
        <Descriptions.Item label="起点纬度（°）">{viewRecord.startLttd?.toFixed(6)}</Descriptions.Item>
        <Descriptions.Item label="讫点经度（°）">{viewRecord.endLgtd?.toFixed(6)}</Descriptions.Item>
        <Descriptions.Item label="讫点纬度（°）">{viewRecord.endLttd?.toFixed(6)}</Descriptions.Item>
        <Descriptions.Item label="行政区与河段位置关系">{RIVER_DIST_LABEL[viewRecord.riverDist]}</Descriptions.Item>
        <Descriptions.Item label="多年平均径流量（立方米）">{viewRecord.runoffVolume?.toLocaleString('zh-CN')}</Descriptions.Item>
        <Descriptions.Item label="多年平均枯水期流量（立方米/秒）">{viewRecord.lowflowVolume}</Descriptions.Item>
        <Descriptions.Item label="水文站数量">{viewRecord.gaugingStation}</Descriptions.Item>
        <Descriptions.Item label="左岸支流数量">{viewRecord.leftBranch}</Descriptions.Item>
        <Descriptions.Item label="右岸支流数量">{viewRecord.rightBranch}</Descriptions.Item>
        <Descriptions.Item label="简介" span={2}>
          {viewRecord.introduction || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="备注" span={2}>
          {viewRecord.remarks || '—'}
        </Descriptions.Item>
        {showLocationMiniMap ? (
          <Descriptions.Item
            label="起点与讫点位置地图"
            span={2}
            className="facility-river-detail-map-item"
            contentStyle={{ display: 'block', width: '100%', maxWidth: '100%' }}
          >
            <div className="facility-river-detail-map-wrap">
              <RiverSourceMouthWgs84DetailMap
                title={viewRecord.sectionName}
                sourLng={viewRecord.startLgtd}
                sourLat={viewRecord.startLttd}
                mouLng={viewRecord.endLgtd}
                mouLat={viewRecord.endLttd}
                mapAriaLabel="责任段起点与讫点位置地图"
                firstMarkerShortLabel="起点"
                secondMarkerShortLabel="讫点"
              />
            </div>
          </Descriptions.Item>
        ) : null}
      </Descriptions>
    </>
  );
}
