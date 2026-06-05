/**
 * 湖泊信息详情 · 与「生态整治 · 河道水体 · 湖泊信息」只读弹窗 1:1
 */
import React from 'react';
import { Descriptions } from 'antd';
import { AddrWgs84DetailMap } from '../shared/addrWgs84MapFormBridge';
import {
  LAKE_CR_OVER_TYPE_OPTIONS,
  LAKE_LK_RANK_OPTIONS,
  LAKE_SAL_FRE_WAT_OPTIONS,
  type LakeWaterBodyRow,
} from './riverChiefDb4401';

function lakeOptLabel(opts: { value: string; label: string }[], val?: string | null): string {
  if (val == null || val === '') return '—';
  return opts.find(o => o.value === val)?.label ?? val;
}

export type LakeWaterBodyReadonlyDetailContentProps = {
  row: LakeWaterBodyRow;
  showLocationMiniMap?: boolean;
};

export function LakeWaterBodyReadonlyDetailContent({
  row: detailLake,
  showLocationMiniMap = true,
}: LakeWaterBodyReadonlyDetailContentProps) {
  return (
    <Descriptions bordered size="small" column={2} style={{ marginTop: 8 }}>
      <Descriptions.Item label="湖泊代码" span={2}>
        {detailLake.lakeObjectId}
      </Descriptions.Item>
      <Descriptions.Item label="湖泊名称">{detailLake.lakeName}</Descriptions.Item>
      <Descriptions.Item label="跨界类型">
        {lakeOptLabel(LAKE_CR_OVER_TYPE_OPTIONS, detailLake.crOverType)}
      </Descriptions.Item>
      <Descriptions.Item label="左下角经度（°）">
        {detailLake.lowLeftLong != null && Number.isFinite(detailLake.lowLeftLong) ? detailLake.lowLeftLong.toFixed(6) : '—'}
      </Descriptions.Item>
      <Descriptions.Item label="左下角纬度（°）">
        {detailLake.lowLeftLat != null && Number.isFinite(detailLake.lowLeftLat) ? detailLake.lowLeftLat.toFixed(6) : '—'}
      </Descriptions.Item>
      <Descriptions.Item label="右上角经度（°）">
        {detailLake.upRightLong != null && Number.isFinite(detailLake.upRightLong) ? detailLake.upRightLong.toFixed(6) : '—'}
      </Descriptions.Item>
      <Descriptions.Item label="右上角纬度（°）">
        {detailLake.upRightLat != null && Number.isFinite(detailLake.upRightLat) ? detailLake.upRightLat.toFixed(6) : '—'}
      </Descriptions.Item>
      <Descriptions.Item label="湖泊所在位置" span={2}>
        {detailLake.lkLoc?.trim() || '—'}
      </Descriptions.Item>
      {showLocationMiniMap ? (
        <Descriptions.Item label="地图位置示意（POI）" span={2}>
          <AddrWgs84DetailMap
            title={detailLake.lakeName}
            location={detailLake.lkLoc}
            lng={detailLake.poiLong}
            lat={detailLake.poiLat}
            mapAriaLabel="湖泊位置地图"
          />
        </Descriptions.Item>
      ) : null}
      <Descriptions.Item label="水面面积（km²）">{detailLake.surfaceAreaKm2}</Descriptions.Item>
      <Descriptions.Item label="湖泊容积（10⁴m³）">{detailLake.storage10kM3 ?? '—'}</Descriptions.Item>
      <Descriptions.Item label="湖泊级别">{lakeOptLabel(LAKE_LK_RANK_OPTIONS, detailLake.lkRank)}</Descriptions.Item>
      <Descriptions.Item label="咸淡水属性">{lakeOptLabel(LAKE_SAL_FRE_WAT_OPTIONS, detailLake.salFreWat)}</Descriptions.Item>
      <Descriptions.Item label="平均水深（m）">{detailLake.avgDepthM ?? '—'}</Descriptions.Item>
      <Descriptions.Item label="最大水深（m）">{detailLake.maxDepthM ?? '—'}</Descriptions.Item>
      <Descriptions.Item label="记录生效时间">{detailLake.effDate ?? '—'}</Descriptions.Item>
      <Descriptions.Item label="记录失效时间">{detailLake.exprDate ?? '—'}</Descriptions.Item>
      <Descriptions.Item label="要素采集时间">{detailLake.yscjsj ?? '—'}</Descriptions.Item>
      <Descriptions.Item label="记录更新时间">{detailLake.jlgxsj ?? '—'}</Descriptions.Item>
      <Descriptions.Item label="备注" span={2}>
        {detailLake.remarks ?? '—'}
      </Descriptions.Item>
    </Descriptions>
  );
}
