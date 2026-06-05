/**
 * 配置中心 · 水利七类详情只读区，与 `config-center-views` / `config-center-hydro-extended` 中「详情」弹窗同源
 */
import React from 'react';
import { Descriptions } from 'antd';
import { AddrWgs84DetailMap } from '../shared/addrWgs84MapFormBridge';
import {
  ADM_DEP_OPTIONS,
  DKE_GRAD_OPTIONS,
  DIKE_TYPE_OPTIONS,
  ELEV_SYS_OPTIONS,
  ENG_GRAD_OPTIONS,
  ENG_SCAL_OPTIONS,
  ENG_STAT_OPTIONS,
  MAIN_BUILD_GRAD_OPTIONS,
  POLD_CLAS_OPTIONS,
  POLD_PROP_OPTIONS,
  POND_ENG_SCAL_OPTIONS,
  WAG_TYPE_OPTIONS,
  WFW_TYPE_OPTIONS,
  type LeveeRecord,
  type PolderRecord,
  type SluiceRecord,
  type WeirRecord,
  type HillpondRecord,
} from './config-center-data';
import {
  ConfigCenterDetailTabs,
  configCenterDetailNum,
  configCenterDetailText,
  configCenterOptLabel,
} from './config-center-detail-eco';

type SluiceReadonlyProps = {
  record: SluiceRecord;
  mapAriaLabel?: string;
  showLocationMiniMap?: boolean;
};

/** 闸坝 / 水闸共型：`mapAriaLabel` 与配置中心「闸坝详情」「水闸详情」弹窗一致 */
export function HydroSluiceReadonlyDetailContent({
  record,
  mapAriaLabel = '闸坝位置地图',
  showLocationMiniMap = true,
}: SluiceReadonlyProps) {
  return (
    <ConfigCenterDetailTabs>
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="内部编号" span={2}>
          {configCenterDetailText(record.id)}
        </Descriptions.Item>
        <Descriptions.Item label="水闸代码">{configCenterDetailText(record.wagCode)}</Descriptions.Item>
        <Descriptions.Item label="水闸名称">{configCenterDetailText(record.wagName)}</Descriptions.Item>
        <Descriptions.Item label="所在位置" span={2}>
          {configCenterDetailText(record.wagLoc)}
        </Descriptions.Item>
        <Descriptions.Item label="地图经度（POI）">{configCenterDetailNum(record.poiLong, '°', { digits: 6 })}</Descriptions.Item>
        <Descriptions.Item label="地图纬度（POI）">{configCenterDetailNum(record.poiLat, '°', { digits: 6 })}</Descriptions.Item>
        {showLocationMiniMap ? (
          <Descriptions.Item label="所在位置地图（POI）" span={2}>
            <AddrWgs84DetailMap
              title={String(record.wagName ?? '')}
              location={record.wagLoc}
              lng={record.poiLong}
              lat={record.poiLat}
              mapAriaLabel={mapAriaLabel}
            />
          </Descriptions.Item>
        ) : null}
        <Descriptions.Item label="轴线起点经度">{configCenterDetailNum(record.startLong, '°', { digits: 6 })}</Descriptions.Item>
        <Descriptions.Item label="轴线起点纬度">{configCenterDetailNum(record.startLat, '°', { digits: 6 })}</Descriptions.Item>
        <Descriptions.Item label="轴线终点经度">{configCenterDetailNum(record.endLong, '°', { digits: 6 })}</Descriptions.Item>
        <Descriptions.Item label="轴线终点纬度">{configCenterDetailNum(record.endLat, '°', { digits: 6 })}</Descriptions.Item>
        <Descriptions.Item label="水闸类型">{configCenterOptLabel(WAG_TYPE_OPTIONS, record.wagType)}</Descriptions.Item>
        <Descriptions.Item label="水闸用途" span={2}>
          {configCenterDetailText(record.wagUse)}
        </Descriptions.Item>
        <Descriptions.Item label="工程等别">{configCenterOptLabel(ENG_GRAD_OPTIONS, record.engGrad)}</Descriptions.Item>
        <Descriptions.Item label="工程规模">{configCenterOptLabel(ENG_SCAL_OPTIONS, record.engScal)}</Descriptions.Item>
        <Descriptions.Item label="主要建筑物级别">{configCenterOptLabel(MAIN_BUILD_GRAD_OPTIONS, record.mainBuildGrad)}</Descriptions.Item>
        <Descriptions.Item label="设计最大过闸流量（m³/s）">{configCenterDetailNum(record.desLockDisc)}</Descriptions.Item>
        <Descriptions.Item label="闸孔数量">{configCenterDetailNum(record.gaorNum)}</Descriptions.Item>
        <Descriptions.Item label="闸孔总净宽（m）">{configCenterDetailNum(record.gaorTotNetWid)}</Descriptions.Item>
        <Descriptions.Item label="工程建设情况">{configCenterOptLabel(ENG_STAT_OPTIONS, record.engStat)}</Descriptions.Item>
        <Descriptions.Item label="归口管理部门">{configCenterOptLabel(ADM_DEP_OPTIONS, record.admDep)}</Descriptions.Item>
        <Descriptions.Item label="开工时间">{configCenterDetailText(record.startDate)}</Descriptions.Item>
        <Descriptions.Item label="建成时间">{configCenterDetailText(record.compDate)}</Descriptions.Item>
        <Descriptions.Item label="备注" span={2}>
          {configCenterDetailText(record.note)}
        </Descriptions.Item>
      </Descriptions>
    </ConfigCenterDetailTabs>
  );
}

/** 独立水闸 `ConfigHydroWaterGateView` 水闸详情 */
export function HydroWaterGateReadonlyDetailContent({
  record,
  showLocationMiniMap = true,
}: {
  record: SluiceRecord;
  showLocationMiniMap?: boolean;
}) {
  return (
    <HydroSluiceReadonlyDetailContent
      record={record}
      mapAriaLabel="水闸位置地图"
      showLocationMiniMap={showLocationMiniMap}
    />
  );
}

/** 堤防 */
export function HydroLeveeReadonlyDetailContent({
  record,
  showLocationMiniMap = true,
}: {
  record: LeveeRecord;
  showLocationMiniMap?: boolean;
}) {
  return (
    <ConfigCenterDetailTabs>
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="内部编号" span={2}>
          {configCenterDetailText(record.id)}
        </Descriptions.Item>
        <Descriptions.Item label="堤防代码">{configCenterDetailText(record.dkeCode)}</Descriptions.Item>
        <Descriptions.Item label="堤防名称">{configCenterDetailText(record.dkeName)}</Descriptions.Item>
        <Descriptions.Item label="所在位置" span={2}>
          {configCenterDetailText(record.dkeLoc)}
        </Descriptions.Item>
        <Descriptions.Item label="地图经度（POI）">{configCenterDetailNum(record.poiLong, '°', { digits: 6 })}</Descriptions.Item>
        <Descriptions.Item label="地图纬度（POI）">{configCenterDetailNum(record.poiLat, '°', { digits: 6 })}</Descriptions.Item>
        {showLocationMiniMap ? (
          <Descriptions.Item label="所在位置地图（POI）" span={2}>
            <AddrWgs84DetailMap
              title={String(record.dkeName ?? '堤防')}
              location={record.dkeLoc}
              lng={record.poiLong}
              lat={record.poiLat}
              mapAriaLabel="堤防位置地图"
            />
          </Descriptions.Item>
        ) : null}
        <Descriptions.Item label="起点经度">{configCenterDetailNum(record.startLong, '°', { digits: 6 })}</Descriptions.Item>
        <Descriptions.Item label="起点纬度">{configCenterDetailNum(record.startLat, '°', { digits: 6 })}</Descriptions.Item>
        <Descriptions.Item label="终点经度">{configCenterDetailNum(record.endLong, '°', { digits: 6 })}</Descriptions.Item>
        <Descriptions.Item label="终点纬度">{configCenterDetailNum(record.endLat, '°', { digits: 6 })}</Descriptions.Item>
        <Descriptions.Item label="起点位置" span={2}>
          {configCenterDetailText(record.startLoc)}
        </Descriptions.Item>
        <Descriptions.Item label="终点位置" span={2}>
          {configCenterDetailText(record.endLoc)}
        </Descriptions.Item>
        <Descriptions.Item label="堤防级别">{configCenterOptLabel(DKE_GRAD_OPTIONS, record.dkeGrad)}</Descriptions.Item>
        <Descriptions.Item label="堤防类型">{configCenterOptLabel(DIKE_TYPE_OPTIONS, record.dikeType)}</Descriptions.Item>
        <Descriptions.Item label="堤防型式">{configCenterDetailText(record.dikePatt)}</Descriptions.Item>
        <Descriptions.Item label="堤长（m）">{configCenterDetailNum(record.dkeLen)}</Descriptions.Item>
        <Descriptions.Item label="起点桩号">{configCenterDetailText(record.dikeStartNum)}</Descriptions.Item>
        <Descriptions.Item label="终点桩号">{configCenterDetailText(record.dikeEndNum)}</Descriptions.Item>
        <Descriptions.Item label="高程系统">{configCenterOptLabel(ELEV_SYS_OPTIONS, record.elevSys)}</Descriptions.Item>
        <Descriptions.Item label="起点堤顶高程（m）">{configCenterDetailNum(record.startDikeTopEl)}</Descriptions.Item>
        <Descriptions.Item label="终点堤顶高程（m）">{configCenterDetailNum(record.endDikeTopEl)}</Descriptions.Item>
        <Descriptions.Item label="堤高最小（m）">{configCenterDetailNum(record.dikeHeigMin)}</Descriptions.Item>
        <Descriptions.Item label="堤高最大（m）">{configCenterDetailNum(record.dikeHeigMax)}</Descriptions.Item>
        <Descriptions.Item label="堤顶宽最小（m）">{configCenterDetailNum(record.dikeTopWidMin)}</Descriptions.Item>
        <Descriptions.Item label="堤顶宽最大（m）">{configCenterDetailNum(record.dikeTopWidMax)}</Descriptions.Item>
        <Descriptions.Item label="工程任务">{configCenterDetailText(record.engTask)}</Descriptions.Item>
        <Descriptions.Item label="工程建设情况">{configCenterOptLabel(ENG_STAT_OPTIONS, record.engStat)}</Descriptions.Item>
        <Descriptions.Item label="归口管理部门">{configCenterOptLabel(ADM_DEP_OPTIONS, record.admDep)}</Descriptions.Item>
        <Descriptions.Item label="堤顶宽（原型平均，m）">{configCenterDetailNum(record.topWidth)}</Descriptions.Item>
        <Descriptions.Item label="防洪（潮）标准">{configCenterDetailText(record.defSta)}</Descriptions.Item>
        <Descriptions.Item label="开工时间">{configCenterDetailText(record.startDate)}</Descriptions.Item>
        <Descriptions.Item label="建成时间">{configCenterDetailText(record.compDate)}</Descriptions.Item>
        <Descriptions.Item label="备注" span={2}>
          {configCenterDetailText(record.note)}
        </Descriptions.Item>
      </Descriptions>
    </ConfigCenterDetailTabs>
  );
}

/** 堰坝 */
export function HydroWeirReadonlyDetailContent({
  record,
  showLocationMiniMap = true,
}: {
  record: WeirRecord;
  showLocationMiniMap?: boolean;
}) {
  return (
    <ConfigCenterDetailTabs>
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="内部编号" span={2}>
          {configCenterDetailText(record.id)}
        </Descriptions.Item>
        <Descriptions.Item label="堰代码">{configCenterDetailText(record.wfwCode)}</Descriptions.Item>
        <Descriptions.Item label="堰名称">{configCenterDetailText(record.wfwName)}</Descriptions.Item>
        <Descriptions.Item label="所在位置" span={2}>
          {configCenterDetailText(record.wfwLoc)}
        </Descriptions.Item>
        <Descriptions.Item label="地图经度（POI）">{configCenterDetailNum(record.poiLong, '°', { digits: 6 })}</Descriptions.Item>
        <Descriptions.Item label="地图纬度（POI）">{configCenterDetailNum(record.poiLat, '°', { digits: 6 })}</Descriptions.Item>
        {showLocationMiniMap ? (
          <Descriptions.Item label="所在位置地图（POI）" span={2}>
            <AddrWgs84DetailMap
              title={String(record.wfwName ?? '')}
              location={record.wfwLoc}
              lng={record.poiLong}
              lat={record.poiLat}
              mapAriaLabel="堰坝位置地图"
            />
          </Descriptions.Item>
        ) : null}
        <Descriptions.Item label="左下角经度">{configCenterDetailNum(record.lowLeftLong, '°', { digits: 6 })}</Descriptions.Item>
        <Descriptions.Item label="左下角纬度">{configCenterDetailNum(record.lowLeftLat, '°', { digits: 6 })}</Descriptions.Item>
        <Descriptions.Item label="堰型">{configCenterOptLabel(WFW_TYPE_OPTIONS, record.wfwType)}</Descriptions.Item>
        <Descriptions.Item label="工程等别">{configCenterOptLabel(ENG_GRAD_OPTIONS, record.engGrad)}</Descriptions.Item>
        <Descriptions.Item label="工程规模">{configCenterOptLabel(ENG_SCAL_OPTIONS, record.engScal)}</Descriptions.Item>
        <Descriptions.Item label="堰顶高程（m）">{configCenterDetailNum(record.crestElev)}</Descriptions.Item>
        <Descriptions.Item label="净宽（m）">{configCenterDetailNum(record.weirWidth)}</Descriptions.Item>
        <Descriptions.Item label="设计泄流（m³/s）">{configCenterDetailNum(record.desFlow)}</Descriptions.Item>
        <Descriptions.Item label="工程建设情况">{configCenterOptLabel(ENG_STAT_OPTIONS, record.engStat)}</Descriptions.Item>
        <Descriptions.Item label="归口管理部门">{configCenterOptLabel(ADM_DEP_OPTIONS, record.admDep)}</Descriptions.Item>
        <Descriptions.Item label="开工时间">{configCenterDetailText(record.startDate)}</Descriptions.Item>
        <Descriptions.Item label="建成时间">{configCenterDetailText(record.compDate)}</Descriptions.Item>
        <Descriptions.Item label="备注" span={2}>
          {configCenterDetailText(record.note)}
        </Descriptions.Item>
      </Descriptions>
    </ConfigCenterDetailTabs>
  );
}

/** 圩区 */
export function HydroPolderReadonlyDetailContent({
  record,
  showLocationMiniMap = true,
}: {
  record: PolderRecord;
  showLocationMiniMap?: boolean;
}) {
  return (
    <ConfigCenterDetailTabs>
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="内部编号" span={2}>
          {configCenterDetailText(record.id)}
        </Descriptions.Item>
        <Descriptions.Item label="圩区代码">{configCenterDetailText(record.plsCode)}</Descriptions.Item>
        <Descriptions.Item label="圩区名称">{configCenterDetailText(record.plsName)}</Descriptions.Item>
        <Descriptions.Item label="所在位置" span={2}>
          {configCenterDetailText(record.plsLoc)}
        </Descriptions.Item>
        <Descriptions.Item label="地图经度（POI）">{configCenterDetailNum(record.poiLong, '°', { digits: 6 })}</Descriptions.Item>
        <Descriptions.Item label="地图纬度（POI）">{configCenterDetailNum(record.poiLat, '°', { digits: 6 })}</Descriptions.Item>
        {showLocationMiniMap ? (
          <Descriptions.Item label="所在位置地图（POI）" span={2}>
            <AddrWgs84DetailMap
              title={String(record.plsName ?? '')}
              location={record.plsLoc}
              lng={record.poiLong}
              lat={record.poiLat}
              mapAriaLabel="圩区位置地图"
            />
          </Descriptions.Item>
        ) : null}
        <Descriptions.Item label="左下角经度">{configCenterDetailNum(record.lowLeftLong, '°', { digits: 6 })}</Descriptions.Item>
        <Descriptions.Item label="左下角纬度">{configCenterDetailNum(record.lowLeftLat, '°', { digits: 6 })}</Descriptions.Item>
        <Descriptions.Item label="右上角经度">{configCenterDetailNum(record.upRightLong, '°', { digits: 6 })}</Descriptions.Item>
        <Descriptions.Item label="右上角纬度">{configCenterDetailNum(record.upRightLat, '°', { digits: 6 })}</Descriptions.Item>
        <Descriptions.Item label="圩垸分类">{configCenterOptLabel(POLD_CLAS_OPTIONS, record.poldClas)}</Descriptions.Item>
        <Descriptions.Item label="平垸性质">{configCenterOptLabel(POLD_PROP_OPTIONS, record.poldProp)}</Descriptions.Item>
        <Descriptions.Item label="设计排涝流量（m³/s）">{configCenterDetailNum(record.desFlFlow)}</Descriptions.Item>
        <Descriptions.Item label="设计蓄滞容积（10⁴m³）">{configCenterDetailNum(record.desStorCap)}</Descriptions.Item>
        <Descriptions.Item label="运用原则" span={2}>
          {configCenterDetailText(record.opPr)}
        </Descriptions.Item>
        <Descriptions.Item label="防洪（潮）标准">{configCenterDetailText(record.protectStd)}</Descriptions.Item>
        <Descriptions.Item label="圩区面积（km²）">{configCenterDetailNum(record.polderArea)}</Descriptions.Item>
        <Descriptions.Item label="耕园面积（km²）">{configCenterDetailNum(record.cultArea)}</Descriptions.Item>
        <Descriptions.Item label="排涝能力（m³/s）">{configCenterDetailNum(record.drainCap)}</Descriptions.Item>
        <Descriptions.Item label="排涝泵站台数">{configCenterDetailNum(record.pumpNum)}</Descriptions.Item>
        <Descriptions.Item label="开工时间">{configCenterDetailText(record.startDate)}</Descriptions.Item>
        <Descriptions.Item label="建成时间">{configCenterDetailText(record.compDate)}</Descriptions.Item>
        <Descriptions.Item label="备注" span={2}>
          {configCenterDetailText(record.note)}
        </Descriptions.Item>
      </Descriptions>
    </ConfigCenterDetailTabs>
  );
}

/** 山塘 */
export function HydroHillpondReadonlyDetailContent({
  record,
  showLocationMiniMap = true,
}: {
  record: HillpondRecord;
  showLocationMiniMap?: boolean;
}) {
  return (
    <ConfigCenterDetailTabs>
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="内部编号" span={2}>
          {configCenterDetailText(record.id)}
        </Descriptions.Item>
        <Descriptions.Item label="山塘代码">{configCenterDetailText(record.stuCode)}</Descriptions.Item>
        <Descriptions.Item label="山塘名称">{configCenterDetailText(record.stuName)}</Descriptions.Item>
        <Descriptions.Item label="所在位置" span={2}>
          {configCenterDetailText(record.stuLoc)}
        </Descriptions.Item>
        <Descriptions.Item label="地图经度（POI）">{configCenterDetailNum(record.poiLong, '°', { digits: 6 })}</Descriptions.Item>
        <Descriptions.Item label="地图纬度（POI）">{configCenterDetailNum(record.poiLat, '°', { digits: 6 })}</Descriptions.Item>
        {showLocationMiniMap ? (
          <Descriptions.Item label="所在位置地图（POI）" span={2}>
            <AddrWgs84DetailMap
              title={String(record.stuName ?? '')}
              location={record.stuLoc}
              lng={record.poiLong}
              lat={record.poiLat}
              mapAriaLabel="山塘位置地图"
            />
          </Descriptions.Item>
        ) : null}
        <Descriptions.Item label="左下角经度">{configCenterDetailNum(record.lowLeftLong, '°', { digits: 6 })}</Descriptions.Item>
        <Descriptions.Item label="左下角纬度">{configCenterDetailNum(record.lowLeftLat, '°', { digits: 6 })}</Descriptions.Item>
        <Descriptions.Item label="右上角经度">{configCenterDetailNum(record.upRightLong, '°', { digits: 6 })}</Descriptions.Item>
        <Descriptions.Item label="右上角纬度">{configCenterDetailNum(record.upRightLat, '°', { digits: 6 })}</Descriptions.Item>
        <Descriptions.Item label="塘坝规模">{configCenterOptLabel(POND_ENG_SCAL_OPTIONS, record.engScal)}</Descriptions.Item>
        <Descriptions.Item label="集雨面积（km²）">{configCenterDetailNum(record.watShedArea)}</Descriptions.Item>
        <Descriptions.Item label="正常水位（m）">{configCenterDetailNum(record.normWatLev)}</Descriptions.Item>
        <Descriptions.Item label="总容积（10⁴m³）">{configCenterDetailNum(record.totVol)}</Descriptions.Item>
        <Descriptions.Item label="工程建设情况">{configCenterOptLabel(ENG_STAT_OPTIONS, record.engStat)}</Descriptions.Item>
        <Descriptions.Item label="归口管理部门">{configCenterOptLabel(ADM_DEP_OPTIONS, record.admDep)}</Descriptions.Item>
        <Descriptions.Item label="开工时间">{configCenterDetailText(record.startDate)}</Descriptions.Item>
        <Descriptions.Item label="建成时间">{configCenterDetailText(record.compDate)}</Descriptions.Item>
        <Descriptions.Item label="备注" span={2}>
          {configCenterDetailText(record.note)}
        </Descriptions.Item>
      </Descriptions>
    </ConfigCenterDetailTabs>
  );
}

