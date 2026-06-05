/**
 * 水库详情只读区 · 与 `config-center-views`「水库详情」`modal.mode === 'detail'` 同源，供综合态势等复用
 */
import React from 'react';
import { Descriptions } from 'antd';
import { AddrWgs84DetailMap } from '../shared/addrWgs84MapFormBridge';
import {
  ADM_DEP_OPTIONS,
  ENG_GRAD_OPTIONS,
  ENG_SCAL_OPTIONS,
  ENG_STAT_OPTIONS,
  RES_TYPE_OPTIONS,
  type HydroRecord,
} from './config-center-data';
import {
  ConfigCenterDetailTabs,
  configCenterDetailNum,
  configCenterDetailText,
  configCenterOptLabel,
} from './config-center-detail-eco';

export type HydroReservoirReadonlyDetailContentProps = {
  record: HydroRecord;
  showLocationMiniMap?: boolean;
};

export function HydroReservoirReadonlyDetailContent({
  record,
  showLocationMiniMap = true,
}: HydroReservoirReadonlyDetailContentProps) {
  return (
    <ConfigCenterDetailTabs>
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="内部编号" span={2}>
          {configCenterDetailText(record.id)}
        </Descriptions.Item>
        <Descriptions.Item label="水库代码">{configCenterDetailText(record.resCode)}</Descriptions.Item>
        <Descriptions.Item label="水库名称">{configCenterDetailText(record.resName)}</Descriptions.Item>
        <Descriptions.Item label="水库所在位置" span={2}>
          {configCenterDetailText(record.resLoc)}
        </Descriptions.Item>
        <Descriptions.Item label="地图经度（POI）">
          {configCenterDetailNum(record.poiLong, '°', { digits: 6 })}
        </Descriptions.Item>
        <Descriptions.Item label="地图纬度（POI）">
          {configCenterDetailNum(record.poiLat, '°', { digits: 6 })}
        </Descriptions.Item>
        {showLocationMiniMap ? (
          <Descriptions.Item label="所在位置地图（POI）" span={2}>
            <AddrWgs84DetailMap
              title={String(record.resName ?? '水库')}
              location={record.resLoc}
              lng={record.poiLong}
              lat={record.poiLat}
              mapAriaLabel="水库位置地图"
            />
          </Descriptions.Item>
        ) : null}
        <Descriptions.Item label="左下角经度">{configCenterDetailNum(record.lowLeftLong, '°', { digits: 6 })}</Descriptions.Item>
        <Descriptions.Item label="左下角纬度">{configCenterDetailNum(record.lowLeftLat, '°', { digits: 6 })}</Descriptions.Item>
        <Descriptions.Item label="右上角经度">{configCenterDetailNum(record.upRightLong, '°', { digits: 6 })}</Descriptions.Item>
        <Descriptions.Item label="右上角纬度">{configCenterDetailNum(record.upRightLat, '°', { digits: 6 })}</Descriptions.Item>
        <Descriptions.Item label="工程规模">{configCenterOptLabel(ENG_SCAL_OPTIONS, record.engScal)}</Descriptions.Item>
        <Descriptions.Item label="坝址控制流域面积（km²）">{configCenterDetailNum(record.watShedArea)}</Descriptions.Item>
        <Descriptions.Item label="防洪高水位（m）">{configCenterDetailNum(record.uppLevFlco)}</Descriptions.Item>
        <Descriptions.Item label="正常蓄水位（m）">{configCenterDetailNum(record.normWatLev)}</Descriptions.Item>
        <Descriptions.Item label="正常蓄水位相应水面面积（km²）">{configCenterDetailNum(record.normPoolStagArea)}</Descriptions.Item>
        <Descriptions.Item label="正常蓄水位相应库容（10⁴m³）">{configCenterDetailNum(record.normPoolStagCap)}</Descriptions.Item>
        <Descriptions.Item label="主汛期防洪限制水位（m）">{configCenterDetailNum(record.flLowLimLev)}</Descriptions.Item>
        <Descriptions.Item label="防洪限制水位库容（10⁴m³）">{configCenterDetailNum(record.flLowLimLevCap)}</Descriptions.Item>
        <Descriptions.Item label="死水位（m）">{configCenterDetailNum(record.deadLev)}</Descriptions.Item>
        <Descriptions.Item label="总库容（10⁴m³）">{configCenterDetailNum(record.totCap)}</Descriptions.Item>
        <Descriptions.Item label="兴利库容（10⁴m³）">{configCenterDetailNum(record.benResCap)}</Descriptions.Item>
        <Descriptions.Item label="死库容（10⁴m³）">{configCenterDetailNum(record.deadCap)}</Descriptions.Item>
        <Descriptions.Item label="调洪库容（10⁴m³）">{configCenterDetailNum(record.storFlCap)}</Descriptions.Item>
        <Descriptions.Item label="防洪库容（10⁴m³）">{configCenterDetailNum(record.flcoCap)}</Descriptions.Item>
        <Descriptions.Item label="工程建设情况">{configCenterOptLabel(ENG_STAT_OPTIONS, record.engStat)}</Descriptions.Item>
        <Descriptions.Item label="归口管理部门">{configCenterOptLabel(ADM_DEP_OPTIONS, record.admDep)}</Descriptions.Item>
        <Descriptions.Item label="开工时间">{configCenterDetailText(record.startDate)}</Descriptions.Item>
        <Descriptions.Item label="建成时间">{configCenterDetailText(record.compDate)}</Descriptions.Item>
        <Descriptions.Item label="水库类型">{configCenterOptLabel(RES_TYPE_OPTIONS, record.resType)}</Descriptions.Item>
        <Descriptions.Item label="工程等别">{configCenterOptLabel(ENG_GRAD_OPTIONS, record.engGrad)}</Descriptions.Item>
        <Descriptions.Item label="备注" span={2}>
          {configCenterDetailText(record.note)}
        </Descriptions.Item>
      </Descriptions>
    </ConfigCenterDetailTabs>
  );
}
