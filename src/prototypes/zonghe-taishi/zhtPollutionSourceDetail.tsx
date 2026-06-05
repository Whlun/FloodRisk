/**
 * 综合态势 · 污染源点位详情（字段来自系统管理配置中心同源台账）
 */
import React, { useMemo } from 'react';
import type { DescriptionsProps } from 'antd';
import { Descriptions } from 'antd';
import { AddrWgs84DetailMap } from '../shared/addrWgs84MapFormBridge';
import type { ZhtPollutionMapPoint } from './zhtPollutionSourceLayerData';
import { ZHT_POLLUTION_KIND_LABEL } from './zhtPollutionSourceLayerData';

export function PollutionSourceDetailBody({
  point,
  /** 指标明细铺满主地图列时：弹窗内展示位置示意地图 */
  showLocationMiniMap = false,
}: {
  point: ZhtPollutionMapPoint;
  showLocationMiniMap?: boolean;
}) {
  const items = useMemo((): NonNullable<DescriptionsProps['items']> => {
    if (point.kind === 'rural_sewage') {
      const r = point.record;
      return [
        { key: 'k', label: '污染源子类', children: ZHT_POLLUTION_KIND_LABEL.rural_sewage },
        { key: 'n', label: '单位/设施名称', children: r.unitName },
        { key: 'c', label: '统一社会信用代码', children: r.creditCode },
        { key: 't', label: '设施类型', children: r.facilityType },
        { key: 'tw', label: '乡镇', children: r.township },
        { key: 'addr', label: '地址', children: r.streetAddr },
        { key: 'xy', label: '坐标（经度,纬度）', children: `${r.entLng}, ${r.entLat}`, span: 2 },
      ];
    }
    if (point.kind === 'agri_rural') {
      const r = point.record;
      return [
        { key: 'k', label: '污染源子类', children: ZHT_POLLUTION_KIND_LABEL.agri_rural },
        { key: 'n', label: '养殖场名称', children: r.farmName },
        { key: 'c', label: '统一社会信用代码', children: r.creditCode },
        { key: 'sp', label: '养殖品种', children: r.breedSpecies },
        { key: 'addr', label: '地址', children: r.address },
        { key: 'xy', label: '坐标（经度,纬度）', children: `${r.centerLng}, ${r.centerLat}`, span: 2 },
      ];
    }
    const r = point.record;
    return [
      { key: 'k', label: '污染源子类', children: ZHT_POLLUTION_KIND_LABEL.industry },
      { key: 'n', label: '单位名称', children: r.unitName },
      { key: 'c', label: '统一社会信用代码', children: r.creditCode },
      { key: 'ind', label: '行业', children: r.industryName1 || '—' },
      { key: 'tw', label: '乡镇', children: r.township },
      { key: 'st', label: '运行状态', children: r.runStatus },
      { key: 'addr', label: '地址', children: r.streetAddr },
      { key: 'xy', label: '坐标（经度,纬度）', children: `${r.lng}, ${r.lat}`, span: 2 },
    ];
  }, [point]);

  const locationLabel =
    point.kind === 'rural_sewage'
      ? point.record.streetAddr
      : point.kind === 'agri_rural'
        ? point.record.address
        : point.record.streetAddr;

  return (
    <>
      <div className="detail-section">
        <div className="detail-section-title">基本信息</div>
        <div className="detail-section-content">
          <Descriptions bordered column={2} size="small" items={items} />
        </div>
      </div>
      {showLocationMiniMap ? (
        <div className="detail-section" style={{ marginTop: 12 }}>
          <div className="detail-section-title">位置地图</div>
          <div className="detail-section-content">
            <AddrWgs84DetailMap
              title={point.name}
              location={locationLabel}
              lng={point.lng}
              lat={point.lat}
              mapAriaLabel="污染源位置地图"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
