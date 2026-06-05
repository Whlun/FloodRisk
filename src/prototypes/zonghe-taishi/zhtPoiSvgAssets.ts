/**
 * POI 图标：从项目根 `icon/` 读入并转 data URL（图层控制 + 地图圆点共用）
 */
import type { ZhtWaterEnvCategoryId } from './zhtWaterEnvPoiMeta';
import type { ZhtPollutionSourceKind } from './zhtPollutionSourceLayerData';

/** 图标源目录：项目根 `icon/`（与 @icon 同步；更新后刷新页面即可） */
import rawPump from '../../../icon/泵站.svg?raw';
import rawOutlet from '../../../icon/排口.svg?raw';
import rawOutletResponsible from '../../../icon/责任主体.svg?raw';
import rawPlant from '../../../icon/污水厂.svg?raw';
import rawDischarger from '../../../icon/排水户.svg?raw';
import rawMonitor from '../../../icon/水质监测站.svg?raw';
import rawEcoProject from '../../../icon/项目.svg?raw';
import rawEcoLake from '../../../icon/湖泊.svg?raw';
import rawEcoAffair from '../../../icon/事务.svg?raw';
import rawEmgSupply from '../../../icon/社会物资.svg?raw';
import rawEmgTeam from '../../../icon/应急队伍.svg?raw';
import rawEmgEvent from '../../../icon/应急事件.svg?raw';
import rawRiskEnt from '../../../icon/风险源企业.svg?raw';
import rawSysZhaba from '../../../icon/闸坝.svg?raw';
import rawSysDiba from '../../../icon/堤坝.svg?raw';
import rawSysShuiku from '../../../icon/水库.svg?raw';
import rawSysShuizha from '../../../icon/水闸.svg?raw';
import rawSysWeiqu from '../../../icon/圩区.svg?raw';
import rawSysYandi from '../../../icon/堰堤.svg?raw';
import rawSysShantang from '../../../icon/山塘.svg?raw';
import rawPollution from '../../../icon/污染源.svg?raw';
import rawDrainageEnterprise from '../../../icon/排水企业.svg?raw';
import rawCustomAnnotation from '../../../icon/自定义标注.svg?raw';

export type ZhtPoiSvgIconKey =
  | ZhtWaterEnvCategoryId
  | 'pollution'
  | 'drainage_enterprise'
  | 'custom_annotation';

/** 将原始 SVG 文本转为可在 <img src> 使用的 data URL */
function svgRawToDataUrl(raw: string): string {
  const trimmed = raw.trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(trimmed)}`;
}

export const ZHT_POI_SVG_ICON_URL: Record<ZhtPoiSvgIconKey, string> = {
  pump: svgRawToDataUrl(rawPump),
  outlet: svgRawToDataUrl(rawOutlet),
  outlet_responsible: svgRawToDataUrl(rawOutletResponsible),
  plant: svgRawToDataUrl(rawPlant),
  discharger: svgRawToDataUrl(rawDischarger),
  monitor: svgRawToDataUrl(rawMonitor),
  eco_project: svgRawToDataUrl(rawEcoProject),
  eco_lake: svgRawToDataUrl(rawEcoLake),
  eco_affair: svgRawToDataUrl(rawEcoAffair),
  emg_supply: svgRawToDataUrl(rawEmgSupply),
  emg_team: svgRawToDataUrl(rawEmgTeam),
  emg_event: svgRawToDataUrl(rawEmgEvent),
  risk_ent: svgRawToDataUrl(rawRiskEnt),
  sys_zhaba: svgRawToDataUrl(rawSysZhaba),
  sys_diba: svgRawToDataUrl(rawSysDiba),
  sys_shuiku: svgRawToDataUrl(rawSysShuiku),
  sys_shuizha: svgRawToDataUrl(rawSysShuizha),
  sys_weiqu: svgRawToDataUrl(rawSysWeiqu),
  sys_yandi: svgRawToDataUrl(rawSysYandi),
  sys_shantang: svgRawToDataUrl(rawSysShantang),
  pollution: svgRawToDataUrl(rawPollution),
  drainage_enterprise: svgRawToDataUrl(rawDrainageEnterprise),
  custom_annotation: svgRawToDataUrl(rawCustomAnnotation),
};

export const ZHT_WATER_ENV_CAT_SVG_KEY: Record<ZhtWaterEnvCategoryId, ZhtPoiSvgIconKey> = {
  pump: 'pump',
  outlet: 'outlet',
  outlet_responsible: 'outlet_responsible',
  plant: 'plant',
  discharger: 'discharger',
  monitor: 'monitor',
  eco_project: 'eco_project',
  eco_lake: 'eco_lake',
  eco_affair: 'eco_affair',
  emg_supply: 'emg_supply',
  emg_team: 'emg_team',
  emg_event: 'emg_event',
  risk_ent: 'risk_ent',
  sys_zhaba: 'sys_zhaba',
  sys_diba: 'sys_diba',
  sys_shuiku: 'sys_shuiku',
  sys_shuizha: 'sys_shuizha',
  sys_weiqu: 'sys_weiqu',
  sys_yandi: 'sys_yandi',
  sys_shantang: 'sys_shantang',
};

export const ZHT_POLLUTION_KIND_SVG_KEY: Record<ZhtPollutionSourceKind, ZhtPoiSvgIconKey> = {
  rural_sewage: 'pollution',
  agri_rural: 'pollution',
  industry: 'pollution',
};
