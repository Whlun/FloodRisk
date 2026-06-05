/**
 * 配置中心示例数据与字段定义
 * - 污染源：配置中心拆分为农村污水及集中处理设施、农业农村源、工业企业污染源（字段参照二污普/环境统计表结构原型裁剪）
 * - 水库/闸坝/堤防及扩展：参考 SL/T 809—2021《水利对象基础数据库表结构及标识符》
 *   ATT_RES_BASE、ATT_WAGA_BASE（水闸/闸坝）、ATT_DIKE_BASE（堤防）、ATT_POND_BASE（塘坝/山塘）、
 *   ATT_POLD_BASE（圩垸）、ATT_RV_BASE（河流）、ATT_BAS_BASE（流域，表7.1 / 表标识 sl_att_bas_base），以及溢流坝（堰）等原型裁剪；不含 EFF_DATE/EXPR_DATE
 * - 遥感/园区/生态/单位：在地方规范表结构上做了原型级裁剪，保留核心标识与业务字段
 */

/** 表单常用：是 / 否 */
export const YES_NO_OPTIONS = [
  { value: 'yes', label: '是' },
  { value: 'no', label: '否' }
];

/** 农村污水及集中处理设施 */
export interface RuralSewageTreatmentRecord {
  id: string;
  creditCode: string;
  orgCode: string;
  unitName: string;
  operatorName: string;
  legalRep: string;
  admDivCode: string;
  township: string;
  streetAddr: string;
  contactPerson: string;
  phone: string;
  entLng: string;
  entLat: string;
  facilityType: string;
  builtYear: string;
  builtMonth: string;
  treatMethodName1: string;
  treatMethodCode1: string;
  treatMethodName2: string;
  treatMethodCode2: string;
  treatMethodName3: string;
  treatMethodCode3: string;
  reclaimProcess: string;
  drainDestType: string;
  drainLngDeg: string;
  drainLngMin: string;
  drainLngSec: string;
  drainLatDeg: string;
  drainLatMin: string;
  drainLatSec: string;
  recvWaterName: string;
  recvWaterCode: string;
  onlineIn: string;
  onlineOut: string;
  sludgeStableSelf: string;
  sludgeDigest: string;
  sludgeStableMethod: string;
  hasBoiler: string;
  reportDate: string;
  annualRunDays: string;
  elecConsumption: string;
  /** 关联排口：入河入海排污口编码，与设施管理排口台账同源 */
  linkedOutletCode?: string;
}

/** 农业农村源（畜禽养殖等） */
export interface AgriRuralPollutionRecord {
  id: string;
  censusDistCode: string;
  creditCode: string;
  orgCode: string;
  farmName: string;
  legalRep: string;
  admDivCode: string;
  address: string;
  centerLng: string;
  centerLat: string;
  contactPerson: string;
  contactPhone: string;
  breedSpecies: string;
  penCleanMethod: string;
  penVentMethod: string;
  urineTreatProcess: string;
  manureStoreSeepproof: string;
  manureStoreRainproof: string;
  manureStoreVol: string;
  manureTreatProcess: string;
  manureTreatOther: string;
  manureUseMethodRatio: string;
  hasBoiler: string;
  reportDate: string;
  farmNameStamp: string;
  penArea: string;
  manureCollectYear: string;
  manureUseYear: string;
  /** 关联排口：入河入海排污口编码 */
  linkedOutletCode?: string;
}

/** 工业企业污染源 */
export interface IndustryPollutionRecord {
  id: string;
  creditCode: string;
  orgCode: string;
  unitName: string;
  industryCode1: string;
  industryName1: string;
  industryCode2: string;
  industryName2: string;
  industryCode3: string;
  industryName3: string;
  township: string;
  streetAddr: string;
  admDivCode: string;
  lng: string;
  lat: string;
  enterpriseScale: string;
  legalRep: string;
  openDate: string;
  contactPerson: string;
  phone: string;
  regType: string;
  recvWaterName: string;
  recvWaterCode: string;
  permitNo: string;
  runStatus: string;
  normalProdHours: string;
  industrialOutput: string;
  hasIndWastewater: string;
  hasBoilerTurbine: string;
  hasIndustrialKiln: string;
  hasCoking: string;
  hasSinterPellet: string;
  hasIronmaking: string;
  hasSteelmaking: string;
  hasClinker: string;
  isPetrochemical: string;
  hasOrganicTank: string;
  usesVocs: string;
  hasIndustrialSolidMaterial: string;
  hasOtherWasteGas: string;
  hasGeneralSolidWaste: string;
  /** 关联排口：入河入海排污口编码 */
  linkedOutletCode?: string;
}

/** SL/T 809 水库类型 RES_TYPE */
export const RES_TYPE_OPTIONS = [
  { value: '1', label: '1 山丘水库' },
  { value: '2', label: '2 平原水库' },
  { value: '3', label: '3 地下水库' }
];

/** SL/T 809 工程等别 ENG_GRAD */
export const ENG_GRAD_OPTIONS = [
  { value: '1', label: 'Ⅰ等' },
  { value: '2', label: 'Ⅱ等' },
  { value: '3', label: 'Ⅲ等' },
  { value: '4', label: 'Ⅳ等' },
  { value: '5', label: 'Ⅴ等' }
];

/** SL/T 809 工程规模 ENG_SCAL */
export const ENG_SCAL_OPTIONS = [
  { value: '1', label: '大(1)型' },
  { value: '2', label: '大(2)型' },
  { value: '3', label: '中型' },
  { value: '4', label: '小(1)型' },
  { value: '5', label: '小(2)型' },
  { value: '9', label: '其他' }
];

/** SL/T 809 表16 工程建设情况 ENG_STAT */
export const ENG_STAT_OPTIONS = [
  { value: '0', label: '0 在建' },
  { value: '1', label: '1 已建' }
];

/** SL/T 809 表17 归口管理部门 ADM_DEP */
export const ADM_DEP_OPTIONS = [
  { value: '1', label: '1 水利部门' },
  { value: '2', label: '2 电力部门' },
  { value: '3', label: '3 农业部门' },
  { value: '4', label: '4 林业部门' },
  { value: '5', label: '5 城建部门' },
  { value: '6', label: '6 航运部门' },
  { value: '7', label: '7 环保部门' },
  { value: '9', label: '9 其他部门' }
];

/** SL/T 809 表20 主要建筑物级别 MAIN_BUILD_GRAD（同水闸 7.10 条文） */
export const MAIN_BUILD_GRAD_OPTIONS = [
  { value: '1', label: '1 级' },
  { value: '2', label: '2 级' },
  { value: '3', label: '3 级' },
  { value: '4', label: '4 级' },
  { value: '5', label: '5 级' },
  { value: '9', label: '9 其他' }
];

/** SL/T 809 表4 跨界类型 CR_OVER_TYPE */
export const CR_OVER_TYPE_OPTIONS = [
  { value: '0', label: '0 未知' },
  { value: '1', label: '1 跨国并跨省' },
  { value: '2', label: '2 跨国' },
  { value: '3', label: '3 跨省' },
  { value: '4', label: '4 跨市' },
  { value: '5', label: '5 跨县' },
  { value: '6', label: '6 县界内' }
];

/** SL/T 809 表7 河流类型 RV_TYPE */
export const RV_TYPE_OPTIONS = [
  { value: '1', label: '1 自然流域' },
  { value: '2', label: '2 区间流域' },
  { value: '3', label: '3 平原水网区' }
];

/** SL/T 809 表8 河流级别 RV_GRAD */
export const RV_STREAM_GRAD_OPTIONS = [
  { value: '0', label: '0 干流' },
  { value: '1', label: '1 一级支流' },
  { value: '2', label: '2 二级支流' },
  { value: '3', label: '3 三级支流' },
  { value: '4', label: '4 四级支流' },
  { value: '5', label: '5 五级支流' },
  { value: '6', label: '6 六级支流' },
  { value: '7', label: '7 七级支流' },
  { value: '8', label: '8 八级支流' },
  { value: '99', label: '99 未定级别' }
];

/** SL/T 809 表9 岸别 BANK */
export const BANK_OPTIONS = [
  { value: '0', label: '0 不分' },
  { value: '1', label: '1 左' },
  { value: '2', label: '2 右' }
];

/** SL/T 809 表58 塘坝工程规模 ENG_SCAL（ATT_POND_BASE） */
export const POND_ENG_SCAL_OPTIONS = [
  { value: '1', label: '1 塘(1)型' },
  { value: '2', label: '2 塘(2)型' },
  { value: '3', label: '3 塘(3)型' },
  { value: '4', label: '4 塘(4)型' },
  { value: '9', label: '9 其他' }
];

/** SL/T 809 表67 圩垸分类 POLD_CLAS */
export const POLD_CLAS_OPTIONS = [
  { value: '1', label: '1 重点垸' },
  { value: '2', label: '2 蓄洪垸' },
  { value: '3', label: '3 一般垸' },
  { value: '9', label: '9 其他' }
];

/** SL/T 809 表68 平垸性质 POLD_PROP */
export const POLD_PROP_OPTIONS = [
  { value: '1', label: '1 单退' },
  { value: '2', label: '2 双退' },
  { value: '9', label: '9 其他' }
];

/** SL/T 809 表63 堤防类型 DIKE_TYPE */
export const DIKE_TYPE_OPTIONS = [
  { value: '1', label: '1 河(江)堤' },
  { value: '2', label: '2 湖堤' },
  { value: '3', label: '3 海堤' },
  { value: '4', label: '4 围(圩、圈)堤' }
];

/** SL/T 809 表64 堤防型式 DIKE_PATT（原型表单为单选码值；历史逗号串取首码解析） */
export const DIKE_PATT_OPTIONS = [
  { value: '1', label: '1 土堤' },
  { value: '2', label: '2 砌石堤' },
  { value: '3', label: '3 土石混合堤' },
  { value: '4', label: '4 钢筋混凝土防洪墙' },
  { value: '9', label: '9 其他' }
];

/** 单选堤防型式：历史逗号串取首个表64合法码，否则空串 */
export function coerceDikePattToSingleCode(raw: string | null | undefined): string {
  if (raw == null || !String(raw).trim()) return '';
  const tokens = String(raw)
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);
  const hit = tokens.find(t => DIKE_PATT_OPTIONS.some(o => o.value === t));
  return hit ?? '';
}

/** SL/T 809 表65 堤防工程任务 ENG_TASK（原型表单为单选码值；历史逗号串取首码解析） */
export const DIKE_ENG_TASK_OPTIONS = [
  { value: '1', label: '1 防洪' },
  { value: '2', label: '2 防潮' }
];

/** 单选堤防工程任务：历史逗号串取首个表65合法码，否则空串 */
export function coerceEngTaskToSingleCode(raw: string | null | undefined): string {
  if (raw == null || !String(raw).trim()) return '';
  const tokens = String(raw)
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);
  const hit = tokens.find(t => DIKE_ENG_TASK_OPTIONS.some(o => o.value === t));
  return hit ?? '';
}

/** SL/T 809 表21 高程系统 ELEV_SYS（原型仅列常用项） */
export const ELEV_SYS_OPTIONS = [
  { value: '01', label: '01 1956年黄海高程' },
  { value: '02', label: '02 1985国家高程基准' },
  { value: '03', label: '03 吴淞高程基准' },
  { value: '04', label: '04 珠江高程基准' },
  { value: '99', label: '99 其他' }
];

/** ATT_RES_BASE 水库（表12，字段名为原型 camelCase） */
export interface HydroRecord {
  id: string;
  resCode: string;
  resName: string;
  resLoc: string;
  /** 地图 POI（与所在位置联动）；与库盆角点 lowLeft/upRight 独立 */
  poiLong: number | null;
  poiLat: number | null;
  lowLeftLong: number | null;
  lowLeftLat: number | null;
  upRightLong: number | null;
  upRightLat: number | null;
  resType: string;
  engGrad: string;
  engScal: string;
  watShedArea: number | null;
  uppLevFlco: number | null;
  normWatLev: number | null;
  normPoolStagArea: number | null;
  normPoolStagCap: number | null;
  flLowLimLev: number | null;
  flLowLimLevCap: number | null;
  deadLev: number | null;
  totCap: number | null;
  benResCap: number | null;
  deadCap: number | null;
  storFlCap: number | null;
  flcoCap: number | null;
  engStat: string;
  admDep: string;
  startDate: string;
  compDate: string;
  note: string;
}

/** SL/T 809 表35 水闸类型 WAGA_TYPE */
export const WAG_TYPE_OPTIONS = [
  { value: '1', label: '1 分(泄)洪闸' },
  { value: '2', label: '2 节制闸' },
  { value: '3', label: '3 挡潮闸' },
  { value: '4', label: '4 排(退)水闸' },
  { value: '5', label: '5 引(进)水闸' },
  { value: '6', label: '6 船闸' },
  { value: '9', label: '9 其他' }
];

/** ATT_WAGA_BASE 水闸（闸坝与「水闸」台账共用，wagCode 对应 WAGA_CODE） */
export interface SluiceRecord {
  id: string;
  wagCode: string;
  wagName: string;
  wagLoc: string;
  /** 地图 POI（与所在位置联动）；与水闸轴线起终点坐标独立 */
  poiLong: number | null;
  poiLat: number | null;
  startLong: number | null;
  startLat: number | null;
  endLong: number | null;
  endLat: number | null;
  wagType: string;
  wagUse: string;
  engGrad: string;
  engScal: string;
  mainBuildGrad: string;
  desLockDisc: number | null;
  gaorNum: number | null;
  gaorTotNetWid: number | null;
  engStat: string;
  admDep: string;
  startDate: string;
  compDate: string;
  note: string;
}

/** SL/T 809 表62 堤防级别 DIKE_GRAD（字段仍用 dkeGrad 存码值） */
export const DKE_GRAD_OPTIONS = [
  { value: '0', label: '0 未知' },
  { value: '1', label: '1 1级' },
  { value: '2', label: '2 2级' },
  { value: '3', label: '3 3级' },
  { value: '4', label: '4 4级' },
  { value: '5', label: '5 5级' },
  { value: '9', label: '9 5级以下' }
];

/** ATT_DIKE_BASE 堤防（dkeCode 对应 DIKE_CODE） */
export interface LeveeRecord {
  id: string;
  dkeCode: string;
  dkeName: string;
  dkeLoc: string;
  /** 地图 POI（与所在位置联动）；与堤轴线起终点坐标独立 */
  poiLong: number | null;
  poiLat: number | null;
  startLong: number | null;
  startLat: number | null;
  endLong: number | null;
  endLat: number | null;
  startLoc: string;
  endLoc: string;
  dkeGrad: string;
  dikeType: string;
  dikePatt: string;
  /** 堤防长度，单位 m（表61） */
  dkeLen: number | null;
  dikeStartNum: string;
  dikeEndNum: string;
  elevSys: string;
  startDikeTopEl: number | null;
  endDikeTopEl: number | null;
  dikeHeigMin: number | null;
  dikeHeigMax: number | null;
  dikeTopWidMin: number | null;
  dikeTopWidMax: number | null;
  engTask: string;
  engStat: string;
  admDep: string;
  startDate: string;
  compDate: string;
  note: string;
  /** 原型扩展：防洪标准文本 */
  defSta: string;
  /** 原型扩展：平均堤顶宽（表61 为最小/最大宽） */
  topWidth: number | null;
}

/** 遥感监测台账（配置中心 · 遥感监测情况） */
export const RS_SERVICE_TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: '叶绿素', value: '叶绿素' },
  { label: '悬浮物', value: '悬浮物' },
  { label: '问题图斑', value: '问题图斑' },
  { label: '河道变化', value: '河道变化' },
  { label: 'NDVI', value: 'NDVI' }
];

/** 覆盖区域名称多选（原型清单） */
export const RS_COVER_AREA_OPTIONS: { label: string; value: string }[] = [
  { label: '韶山片区', value: '韶山片区' },
  { label: '高新片区', value: '高新片区' },
  { label: '工业园', value: '工业园' },
  { label: '河东', value: '河东' },
  { label: '河西', value: '河西' },
  { label: '全市', value: '全市' }
];

export interface RsRecord {
  id: string;
  /** 编码 */
  code: string;
  /** 覆盖区域名称（多选） */
  coverAreaNames: string[];
  /** 更新时间 */
  updatedAt: string;
  /** 遥感服务类型 */
  rsServiceType: string;
  /** 服务地址（影像/切片/WMS 等） */
  serviceUrl: string;
}

/** 与设施管理台账对齐的污水类设施（工业园区「污水设施配置」多选数据源） */
export interface FacilitySewageOption {
  id: string;
  name: string;
  facilityType: string;
}

export const FACILITY_SEWAGE_OPTIONS: FacilitySewageOption[] = [
  { id: 'WWTP-SS-001', name: '韶山市第一污水处理厂', facilityType: '污水处理厂' },
  { id: 'WWTP-SS-002', name: '高新片区污水厂', facilityType: '污水处理厂' },
  { id: 'PS-SS-R-001', name: '韶河雨水泵站（高新大道）', facilityType: '泵站' },
  { id: 'PS-SS-W-001', name: '工业园污水提升泵站', facilityType: '泵站' },
  { id: 'OUT-SS-001', name: '高新产业园总排口', facilityType: '排放口' },
  { id: 'WWTP-SS-003', name: '银田镇污水处理站', facilityType: '污水处理站' }
];

/** 与污染源/企业台账对齐的入驻企业（工业园区「配置企业」多选数据源，原型；坐标供详情地图点位） */
export interface ParkLinkedEnterpriseOption {
  id: string;
  name: string;
  industry: string;
  /** WGS84，与功能分区示意范围一致 */
  lng: number;
  lat: number;
}

export const PARK_LINKED_ENTERPRISE_OPTIONS: ParkLinkedEnterpriseOption[] = [
  { id: 'ENT-SS-001', name: '韶山高新电子有限公司', industry: '电子信息', lng: 112.523, lat: 27.908 },
  { id: 'ENT-SS-002', name: '湘中机械制造厂', industry: '装备制造', lng: 112.528, lat: 27.911 },
  { id: 'ENT-SS-003', name: '绿色新材料科技', industry: '新材料', lng: 112.532, lat: 27.914 },
  { id: 'ENT-SS-004', name: '韶山冷链物流中心', industry: '仓储物流', lng: 112.526, lat: 27.906 },
  { id: 'ENT-SS-005', name: '银田食品加工厂', industry: '食品加工', lng: 112.515, lat: 27.902 }
];

/** 工业园区「所属区划」下拉：韶山市辖乡镇（原型台账，与 addvName 存值一致） */
export const SHAOSHAN_PARK_ADDV_OPTIONS: { label: string; value: string }[] = [
  { label: '韶山市 · 清溪镇', value: '湖南省湘潭市韶山市·清溪镇' },
  { label: '韶山市 · 银田镇', value: '湖南省湘潭市韶山市·银田镇' },
  { label: '韶山市 · 韶山乡', value: '湖南省湘潭市韶山市·韶山乡' },
  { label: '韶山市 · 杨林乡', value: '湖南省湘潭市韶山市·杨林乡' },
  { label: '韶山市 · 大坪乡', value: '湖南省湘潭市韶山市·大坪乡' }
];

/** 工业园区功能分区：固定六类 + 地图/图例统一配色（fill 填充、stroke 边线） */
export interface ParkFunctionalZonePaletteItem {
  value: string;
  label: string;
  fill: string;
  stroke: string;
}

export const PARK_FUNCTIONAL_ZONE_PALETTE: readonly ParkFunctionalZonePaletteItem[] = [
  { value: '工业生产区', label: '工业生产区', fill: '#2563eb', stroke: '#1e3a8a' },
  { value: '研发创新区', label: '研发创新区', fill: '#7c3aed', stroke: '#4c1d95' },
  { value: '商务服务区', label: '商务服务区', fill: '#db2777', stroke: '#831843' },
  { value: '物流仓储区', label: '物流仓储区', fill: '#ea580c', stroke: '#7c2d12' },
  { value: '生活居住区', label: '生活居住区', fill: '#16a34a', stroke: '#14532d' },
  { value: '生态休闲区', label: '生态休闲区', fill: '#0d9488', stroke: '#134e4a' }
] as const;

/** @deprecated 与 PALETTE 顺序一致，仅作文档/兼容引用 */
export const PARK_FUNCTIONAL_ZONE_TYPES = PARK_FUNCTIONAL_ZONE_PALETTE.map(p => p.value);

export const PARK_FUNCTIONAL_ZONE_OPTIONS: { label: string; value: string }[] = PARK_FUNCTIONAL_ZONE_PALETTE.map(p => ({
  label: p.label,
  value: p.value
}));

/** 按类型取配色（未知类型返回 undefined） */
export function getParkFunctionalZonePalette(zoneType: string): ParkFunctionalZonePaletteItem | undefined {
  return PARK_FUNCTIONAL_ZONE_PALETTE.find(p => p.value === zoneType);
}

/** MapLibre fill-color 用的 match 表达式 */
export function parkZoneFillColorMatchExpr(): (string | unknown)[] {
  const expr: (string | unknown)[] = ['match', ['get', 'zoneType']];
  for (const p of PARK_FUNCTIONAL_ZONE_PALETTE) {
    expr.push(p.value, p.fill);
  }
  expr.push('#94a3b8');
  return expr;
}

/** MapLibre line-color 用的 match 表达式 */
export function parkZoneStrokeColorMatchExpr(): (string | unknown)[] {
  const expr: (string | unknown)[] = ['match', ['get', 'zoneType']];
  for (const p of PARK_FUNCTIONAL_ZONE_PALETTE) {
    expr.push(p.value, p.stroke);
  }
  expr.push('#64748b');
  return expr;
}

export interface ParkFunctionalZone {
  id: string;
  zoneType: string;
  /** GeoJSON Polygon 字符串 */
  boundaryGeoJson: string;
}

export interface ParkRecord {
  id: string;
  parkName: string;
  /** 所属区划名称（展示用，与代码解耦） */
  addvName: string;
  areaHa: number;
  firms: number;
  /** 关联设施管理中污水类设施 ID，多选 */
  linkedSewageFacilityIds: string[];
  /** 关联入驻企业 ID，多选（与污染源/企业台账对齐，原型） */
  linkedEnterpriseIds: string[];
  /** 功能分区：每个分区为「类型 + 地图绘制多边形」 */
  functionalZones: ParkFunctionalZone[];
  note: string;
}

export interface UnitRecord {
  id: string;
  orgCode: string;
  name: string;
  type: string;
  phone: string;
  scope: string;
  creditCode: string;
}

/** 污染源三类台账：行政区划与坐标均落在韶山市域（与河湖长制演示 addvcd 430382* 一致） */
export const ruralSewageTreatmentInitial: RuralSewageTreatmentRecord[] = [
  {
    id: 'RSEW-001',
    creditCode: '914303821MABXN0011X',
    orgCode: 'MABXN0011',
    unitName: '清溪镇清溪村集中式污水处理站',
    operatorName: '韶山市清溪环保运维有限公司',
    legalRep: '刘建国',
    admDivCode: '430382100000',
    township: '清溪镇',
    streetAddr: '清溪村韶河右岸安置区北侧',
    contactPerson: '周敏',
    phone: '0731-5568****',
    entLng: '112.528600',
    entLat: '27.912400',
    facilityType: '农村集中式污水处理设施',
    builtYear: '2019',
    builtMonth: '6',
    treatMethodName1: 'A/O+人工湿地',
    treatMethodCode1: '4120',
    treatMethodName2: '消毒',
    treatMethodCode2: '5100',
    treatMethodName3: '',
    treatMethodCode3: '',
    reclaimProcess: '无',
    drainDestType: 'A|进入市政管网',
    drainLngDeg: '112',
    drainLngMin: '31',
    drainLngSec: '43',
    drainLatDeg: '27',
    drainLatMin: '54',
    drainLatSec: '45',
    recvWaterName: '韶河',
    recvWaterCode: 'ROV-430382-SHAOHE',
    onlineIn: 'yes',
    onlineOut: 'yes',
    sludgeStableSelf: '好氧堆肥',
    sludgeDigest: '无',
    sludgeStableMethod: '脱水外运',
    hasBoiler: 'no',
    reportDate: '2026-01-10',
    annualRunDays: '350',
    elecConsumption: '2.8',
    linkedOutletCode: 'AH43038226040104',
  },
  {
    id: 'RSEW-002',
    creditCode: '914303821MABXN0022Y',
    orgCode: 'MABXN0022',
    unitName: '银田镇华南村一体化净化槽',
    operatorName: '韶山市银田镇农业综合服务中心',
    legalRep: '赵志华',
    admDivCode: '430382101000',
    township: '银田镇',
    streetAddr: '华南村撇洪渠以南聚居点',
    contactPerson: '胡静',
    phone: '0731-5569****',
    entLng: '112.538000',
    entLat: '27.918200',
    facilityType: '农村分散式污水处理设施',
    builtYear: '2021',
    builtMonth: '3',
    treatMethodName1: '生物接触氧化',
    treatMethodCode1: '4110',
    treatMethodName2: '',
    treatMethodCode2: '',
    treatMethodName3: '',
    treatMethodCode3: '',
    reclaimProcess: '无',
    drainDestType: 'B|进入农灌沟渠',
    drainLngDeg: '112',
    drainLngMin: '32',
    drainLngSec: '17',
    drainLatDeg: '27',
    drainLatMin: '55',
    drainLatSec: '6',
    recvWaterName: '韶河支流',
    recvWaterCode: 'RB430382101001',
    onlineIn: 'no',
    onlineOut: 'yes',
    sludgeStableSelf: '无',
    sludgeDigest: '无',
    sludgeStableMethod: '定期清运',
    hasBoiler: 'no',
    reportDate: '2026-02-05',
    annualRunDays: '340',
    elecConsumption: '0.65',
    linkedOutletCode: 'AH43038226040102',
  },
  {
    id: 'RSEW-003',
    creditCode: '914303821MABXN0033Z',
    orgCode: 'MABXN0033',
    unitName: '韶山乡韶河村联户净化槽示范工程',
    operatorName: '韶山市农村环境建设有限公司',
    legalRep: '毛伟',
    admDivCode: '430382102000',
    township: '韶山乡',
    streetAddr: '韶河村景区外围民宿片区',
    contactPerson: '彭丽',
    phone: '0731-5570****',
    entLng: '112.545500',
    entLat: '27.905800',
    facilityType: '农村集中式污水处理设施',
    builtYear: '2020',
    builtMonth: '11',
    treatMethodName1: 'MBR膜工艺',
    treatMethodCode1: '4130',
    treatMethodName2: '紫外消毒',
    treatMethodCode2: '5100',
    treatMethodName3: '',
    treatMethodCode3: '',
    reclaimProcess: '无',
    drainDestType: 'C|进入河道',
    drainLngDeg: '112',
    drainLngMin: '32',
    drainLngSec: '44',
    drainLatDeg: '27',
    drainLatMin: '54',
    drainLatSec: '21',
    recvWaterName: '韶河',
    recvWaterCode: 'ROV-430382-SHAOHE',
    onlineIn: 'yes',
    onlineOut: 'yes',
    sludgeStableSelf: '石灰稳定',
    sludgeDigest: '无',
    sludgeStableMethod: '外运处置',
    hasBoiler: 'no',
    reportDate: '2026-03-18',
    annualRunDays: '355',
    elecConsumption: '1.95'
  }
];

export const agriRuralPollutionInitial: AgriRuralPollutionRecord[] = [
  {
    id: 'AGRI-001',
    censusDistCode: '430382100001',
    creditCode: '914303821MAAGR0011A',
    orgCode: 'MAAGR0011',
    farmName: '清溪镇双石村生猪标准化养殖场',
    legalRep: '陈立新',
    admDivCode: '430382100000',
    address: '湖南省湘潭市韶山市清溪镇双石村韶河堤外养殖小区',
    centerLng: '112.531200',
    centerLat: '27.909600',
    contactPerson: '陈立新',
    contactPhone: '139****5601',
    breedSpecies: '生猪',
    penCleanMethod: '干清粪+雨污分流',
    penVentMethod: '机械通风',
    urineTreatProcess: '厌氧发酵+还田',
    manureStoreSeepproof: 'yes',
    manureStoreRainproof: 'yes',
    manureStoreVol: '260',
    manureTreatProcess: '好氧堆肥',
    manureTreatOther: '',
    manureUseMethodRatio: '还田 75%，协议外运 25%',
    hasBoiler: 'no',
    reportDate: '2026-03-01',
    farmNameStamp: '清溪镇双石村生猪标准化养殖场',
    penArea: '2200',
    manureCollectYear: '520',
    manureUseYear: '498',
    linkedOutletCode: 'AH43038226040103',
  },
  {
    id: 'AGRI-002',
    censusDistCode: '430382101002',
    creditCode: '914303821MAAGR0022B',
    orgCode: 'MAAGR0022',
    farmName: '银田镇华南村蛋鸡养殖合作社',
    legalRep: '贺小军',
    admDivCode: '430382101000',
    address: '湖南省湘潭市韶山市银田镇华南村撇洪渠西侧',
    centerLng: '112.519800',
    centerLat: '27.914500',
    contactPerson: '贺小军',
    contactPhone: '137****8820',
    breedSpecies: '蛋鸡',
    penCleanMethod: '传送带干清粪',
    penVentMethod: '自然通风+风机',
    urineTreatProcess: '沉淀池+人工湿地',
    manureStoreSeepproof: 'yes',
    manureStoreRainproof: 'yes',
    manureStoreVol: '85',
    manureTreatProcess: '高温好氧发酵',
    manureTreatOther: '',
    manureUseMethodRatio: '有机肥外售 60%，自用还田 40%',
    hasBoiler: 'no',
    reportDate: '2026-02-20',
    farmNameStamp: '银田镇华南村蛋鸡养殖合作社',
    penArea: '980',
    manureCollectYear: '180',
    manureUseYear: '175',
    linkedOutletCode: 'AH43038226040101',
  },
  {
    id: 'AGRI-003',
    censusDistCode: '430382102003',
    creditCode: '914303821MAAGR0033C',
    orgCode: 'MAAGR0033',
    farmName: '韶山乡韶源村稻渔综合种养示范场',
    legalRep: '李秀英',
    admDivCode: '430382102000',
    address: '湖南省湘潭市韶山市韶山乡韶源村韶河灌渠旁',
    centerLng: '112.552100',
    centerLat: '27.901200',
    contactPerson: '李秀英',
    contactPhone: '136****3391',
    breedSpecies: '稻渔（鱼）',
    penCleanMethod: '生态沟渠',
    penVentMethod: '开放式',
    urineTreatProcess: '鱼塘水体自净',
    manureStoreSeepproof: 'yes',
    manureStoreRainproof: 'yes',
    manureStoreVol: '40',
    manureTreatProcess: '底泥还田',
    manureTreatOther: '',
    manureUseMethodRatio: '塘泥还田 100%',
    hasBoiler: 'no',
    reportDate: '2026-01-28',
    farmNameStamp: '韶山乡韶源村稻渔综合种养示范场',
    penArea: '420',
    manureCollectYear: '95',
    manureUseYear: '95'
  }
];

export const industryPollutionInitial: IndustryPollutionRecord[] = [
  {
    id: 'IND-001',
    creditCode: '914303821MAIND0011D',
    orgCode: 'MAIND0011',
    unitName: '韶山市清溪电子配件加工厂',
    industryCode1: '3981',
    industryName1: '电阻电容电感元件制造',
    industryCode2: '',
    industryName2: '',
    industryCode3: '',
    industryName3: '',
    township: '清溪镇',
    streetAddr: '清溪路高新产业园B区3栋',
    admDivCode: '430382100000',
    lng: '112.526800',
    lat: '27.907500',
    enterpriseScale: '小型',
    legalRep: '王磊',
    openDate: '2018-05-16',
    contactPerson: '王磊',
    phone: '0731-5567****',
    regType: '113|私营有限责任公司',
    recvWaterName: '韶河',
    recvWaterCode: 'ROV-430382-SHAOHE',
    permitNo: '4303822023****',
    runStatus: '运行',
    normalProdHours: '2400',
    industrialOutput: '2860.5',
    hasIndWastewater: 'yes',
    hasBoilerTurbine: 'no',
    hasIndustrialKiln: 'no',
    hasCoking: 'no',
    hasSinterPellet: 'no',
    hasIronmaking: 'no',
    hasSteelmaking: 'no',
    hasClinker: 'no',
    isPetrochemical: 'no',
    hasOrganicTank: 'no',
    usesVocs: 'yes',
    hasIndustrialSolidMaterial: 'yes',
    hasOtherWasteGas: 'no',
    hasGeneralSolidWaste: 'yes',
    linkedOutletCode: 'AH43038226040102',
  },
  {
    id: 'IND-002',
    creditCode: '914303821MAIND0022E',
    orgCode: 'MAIND0022',
    unitName: '韶山市银田米粉有限公司',
    industryCode1: '1431',
    industryName1: '米、面制品制造',
    industryCode2: '',
    industryName2: '',
    industryCode3: '',
    industryName3: '',
    township: '银田镇',
    streetAddr: '银田镇韶河老街食品工业园8号',
    admDivCode: '430382101000',
    lng: '112.534200',
    lat: '27.916800',
    enterpriseScale: '微型',
    legalRep: '汤敏',
    openDate: '2015-09-01',
    contactPerson: '汤敏',
    phone: '139****1128',
    regType: '174|私营股份有限公司',
    recvWaterName: '韶河支流',
    recvWaterCode: 'RB430382101001',
    permitNo: '',
    runStatus: '运行',
    normalProdHours: '2200',
    industrialOutput: '892.3',
    hasIndWastewater: 'yes',
    hasBoilerTurbine: 'no',
    hasIndustrialKiln: 'no',
    hasCoking: 'no',
    hasSinterPellet: 'no',
    hasIronmaking: 'no',
    hasSteelmaking: 'no',
    hasClinker: 'no',
    isPetrochemical: 'no',
    hasOrganicTank: 'no',
    usesVocs: 'no',
    hasIndustrialSolidMaterial: 'yes',
    hasOtherWasteGas: 'no',
    hasGeneralSolidWaste: 'yes'
  },
  {
    id: 'IND-003',
    creditCode: '914303821MAIND0033F',
    orgCode: 'MAIND0033',
    unitName: '韶山市杨林乡建材预制构件厂',
    industryCode1: '3021',
    industryName1: '水泥制品制造',
    industryCode2: '',
    industryName2: '',
    industryCode3: '',
    industryName3: '',
    township: '杨林乡',
    streetAddr: '杨林乡团田村省道S208东侧',
    admDivCode: '430382103000',
    lng: '112.548900',
    lat: '27.893400',
    enterpriseScale: '小型',
    legalRep: '肖勇',
    openDate: '2017-03-20',
    contactPerson: '肖勇',
    phone: '135****6670',
    regType: '113|私营有限责任公司',
    recvWaterName: '韶山灌区农排沟渠',
    recvWaterCode: 'RB430382103002',
    permitNo: '4303822021****',
    runStatus: '运行',
    normalProdHours: '2080',
    industrialOutput: '1520.0',
    hasIndWastewater: 'yes',
    hasBoilerTurbine: 'no',
    hasIndustrialKiln: 'no',
    hasCoking: 'no',
    hasSinterPellet: 'no',
    hasIronmaking: 'no',
    hasSteelmaking: 'no',
    hasClinker: 'no',
    isPetrochemical: 'no',
    hasOrganicTank: 'no',
    usesVocs: 'no',
    hasIndustrialSolidMaterial: 'yes',
    hasOtherWasteGas: 'yes',
    hasGeneralSolidWaste: 'yes'
  }
];

export const hydroInitial: HydroRecord[] = [
  {
    id: 'RES-001',
    resCode: '441900B01RS000001',
    resName: '东郊水库',
    resLoc: '湖南省韶山市东郊镇留凤村',
    poiLong: 112.523456,
    poiLat: 27.912345,
    lowLeftLong: 112.523456,
    lowLeftLat: 27.912345,
    upRightLong: 112.531,
    upRightLat: 27.918,
    resType: '1',
    engGrad: '3',
    engScal: '3',
    watShedArea: 42.5,
    uppLevFlco: 88.5,
    normWatLev: 86.2,
    normPoolStagArea: 3.2,
    normPoolStagCap: 980.0,
    flLowLimLev: 84.0,
    flLowLimLevCap: 850.0,
    deadLev: 72.0,
    totCap: 1250.5,
    benResCap: 620.0,
    deadCap: 45.0,
    storFlCap: 180.0,
    flcoCap: 120.0,
    engStat: '1',
    admDep: '1',
    startDate: '2010-04-01',
    compDate: '2012-09-30',
    note: 'SL/T 809 ATT_RES_BASE 示意'
  },
  {
    id: 'RES-002',
    resCode: '441900B01RS000002',
    resName: '西联水库',
    resLoc: '湖南省韶山市银田镇西联村',
    poiLong: 112.581234,
    poiLat: 27.905012,
    lowLeftLong: 112.581234,
    lowLeftLat: 27.905012,
    upRightLong: 112.589,
    upRightLat: 27.911,
    resType: '1',
    engGrad: '4',
    engScal: '4',
    watShedArea: 18.6,
    uppLevFlco: 64.0,
    normWatLev: 62.4,
    normPoolStagArea: 0.85,
    normPoolStagCap: 300.0,
    flLowLimLev: 60.5,
    flLowLimLevCap: 260.0,
    deadLev: 58.0,
    totCap: 328.6,
    benResCap: 150.0,
    deadCap: 12.0,
    storFlCap: 45.0,
    flcoCap: 35.0,
    engStat: '1',
    admDep: '1',
    startDate: '2008-03-01',
    compDate: '2010-11-20',
    note: '乡镇供水兼灌溉'
  }
];

export const sluiceInitial: SluiceRecord[] = [
  {
    id: 'WAG-001',
    wagCode: '441900B01WG000001',
    wagName: '韶河节制闸',
    wagLoc: '韶山市韶河下游左岸',
    poiLong: 112.601234,
    poiLat: 27.889012,
    startLong: 112.601234,
    startLat: 27.889012,
    endLong: 112.6018,
    endLat: 27.8892,
    wagType: '2',
    wagUse: '灌溉、生态补水',
    engGrad: '4',
    engScal: '4',
    mainBuildGrad: '4',
    desLockDisc: 186.5,
    gaorNum: 3,
    gaorTotNetWid: 36.0,
    engStat: '1',
    admDep: '1',
    startDate: '2014-01-10',
    compDate: '2016-06-01',
    note: 'ATT_WAGA_BASE 示意，汛期加强巡查'
  },
  {
    id: 'WAG-002',
    wagCode: '441900B01WG000002',
    wagName: '高新大道分洪闸',
    wagLoc: '高新区撇洪渠入韶河口',
    poiLong: 112.538,
    poiLat: 27.918,
    startLong: 112.538,
    startLat: 27.918,
    endLong: 112.5386,
    endLat: 27.9181,
    wagType: '1',
    wagUse: '分泄洪',
    engGrad: '5',
    engScal: '5',
    mainBuildGrad: '5',
    desLockDisc: 95.0,
    gaorNum: 2,
    gaorTotNetWid: 16.0,
    engStat: '1',
    admDep: '1',
    startDate: '2019-05-01',
    compDate: '2020-12-01',
    note: ''
  }
];

/** 与闸坝并列：独立台账的「水闸」对象，字段同 ATT_WAGA_BASE */
export const waterGateInitial: SluiceRecord[] = [
  {
    id: 'WGS-001',
    wagCode: '441900B01WG100001',
    wagName: '银田联闸',
    wagLoc: '韶山市银田镇韶河支流',
    poiLong: 112.5555,
    poiLat: 27.9008,
    startLong: 112.5555,
    startLat: 27.9008,
    endLong: 112.5565,
    endLat: 27.9012,
    wagType: '5',
    wagUse: '农业灌溉',
    engGrad: '5',
    engScal: '5',
    mainBuildGrad: '5',
    desLockDisc: 42.0,
    gaorNum: 2,
    gaorTotNetWid: 12.0,
    engStat: '1',
    admDep: '1',
    startDate: '2015-03-01',
    compDate: '2016-11-20',
    note: 'ATT_WAGA_BASE，水闸台账示例'
  }
];

/** SL/T 809 溢流坝（堰）类型 — 原型枚举 */
export const WFW_TYPE_OPTIONS = [
  { value: '1', label: '1 实用堰' },
  { value: '2', label: '2 宽顶堰' },
  { value: '3', label: '3 薄壁堰' },
  { value: '9', label: '9 其他' }
];

/** ATT_WFW_BASE（溢流坝/堰）— 原型裁剪 + 表16/17 */
export interface WeirRecord {
  id: string;
  wfwCode: string;
  wfwName: string;
  wfwLoc: string;
  /** 地图 POI（与所在位置联动）；与规范左下角坐标独立 */
  poiLong: number | null;
  poiLat: number | null;
  lowLeftLong: number | null;
  lowLeftLat: number | null;
  wfwType: string;
  engGrad: string;
  engScal: string;
  crestElev: number | null;
  weirWidth: number | null;
  desFlow: number | null;
  engStat: string;
  admDep: string;
  startDate: string;
  compDate: string;
  note: string;
}

/** ATT_POLD_BASE 圩垸（pls* 为原型习惯命名，对应 POLD_*） */
export interface PolderRecord {
  id: string;
  plsCode: string;
  plsName: string;
  plsLoc: string;
  /** 地图 POI（与所在位置联动）；与圩区范围角点独立 */
  poiLong: number | null;
  poiLat: number | null;
  lowLeftLong: number | null;
  lowLeftLat: number | null;
  upRightLong: number | null;
  upRightLat: number | null;
  poldClas: string;
  poldProp: string;
  desFlFlow: number | null;
  desStorCap: number | null;
  opPr: string;
  note: string;
  protectStd: string;
  polderArea: number | null;
  cultArea: number | null;
  drainCap: number | null;
  pumpNum: number | null;
  /** 原型扩展：开工/建成（规范表66 无此字段） */
  startDate: string;
  compDate: string;
}

/** ATT_POND_BASE 塘坝（山塘台账，stu* 对应 POND_*） */
export interface HillpondRecord {
  id: string;
  stuCode: string;
  stuName: string;
  stuLoc: string;
  /** 地图 POI（与所在位置联动）；与塘盆范围角点独立 */
  poiLong: number | null;
  poiLat: number | null;
  lowLeftLong: number | null;
  lowLeftLat: number | null;
  upRightLong: number | null;
  upRightLat: number | null;
  engScal: string;
  watShedArea: number | null;
  normWatLev: number | null;
  totVol: number | null;
  engStat: string;
  admDep: string;
  startDate: string;
  compDate: string;
  note: string;
}

/** BAS_TYPE（表7.1 流域基础信息字段；取值惯例参考 SL/T 809—2021；与河流 RV_TYPE 码表独立） */
export const BAS_TYPE_OPTIONS = [
  { value: '1', label: '1 山丘区流域' },
  { value: '2', label: '2 平原区流域' },
  { value: '3', label: '3 山丘平原混合' },
  { value: '9', label: '9 其他' }
];

/** BAS_GRAD（流域单元层级；原型枚举，对接时与标准条文一致化） */
export const BAS_GRAD_OPTIONS = [
  { value: '1', label: '1 一级流域' },
  { value: '2', label: '2 二级流域' },
  { value: '3', label: '3 三级流域' },
  { value: '4', label: '4 四级流域' },
  { value: '9', label: '9 其他' }
];

/**
 * ATT_BAS_BASE / sl_att_bas_base 流域基础信息（表7.1）
 * 字段英文名对齐 SL/T 809—2021；界面展示中文表头。原型裁剪不含名录侧 OBJ_CODE 耦合及效期字段。
 */
export interface WatershedRecord {
  id: string;
  /** BAS_CODE */
  basCode: string;
  /** BAS_NAME */
  basName: string;
  /** BAS_TYPE */
  basType: string;
  /** BAS_GRAD */
  basGrad: string;
  /** BAS_AREA（km²） */
  basArea: number | null;
  /** CR_OVER_TYPE（表4 跨界类型） */
  crOverType: string;
  /** 涉及行政区划编码（多选，选项见 RIVER_FLOW_AREA_ADDVCD_OPTIONS） */
  flowAdmReg: string[];
  /** 边界外包矩形对角：右上角、左下角（WGS84），可由 GeoJSON / Shapefile(zip) 解析填入 */
  extentNeLng: number | null;
  extentNeLat: number | null;
  extentSwLng: number | null;
  extentSwLat: number | null;
  /** NOTE */
  note: string;
}

/** ATT_RV_BASE 河流 */
export interface RiverRecord {
  id: string;
  rvCode: string;
  rvName: string;
  rvSourLong: number | null;
  rvSourLat: number | null;
  rvMouLong: number | null;
  rvMouLat: number | null;
  rvSourLoc: string;
  rvMouLoc: string;
  crOverType: string;
  flowArea: string;
  rvType: string;
  rvGrad: string;
  bank: string;
  rvLen: number | null;
  rvBasArea: number | null;
  averSlop: number | null;
  note: string;
}

/** @deprecated 请使用 RiverRecord（ATT_RV_BASE） */
export type RiverReachRecord = RiverRecord;

export const weirInitial: WeirRecord[] = [
  {
    id: 'WFW-001',
    wfwCode: '441900B01WF000001',
    wfwName: '韶河上段滚水堰',
    wfwLoc: '韶山市城区上游韶河干流',
    poiLong: 112.498,
    poiLat: 27.882,
    lowLeftLong: 112.498,
    lowLeftLat: 27.882,
    wfwType: '1',
    engGrad: '5',
    engScal: '5',
    crestElev: 58.2,
    weirWidth: 28.0,
    desFlow: 120.0,
    engStat: '1',
    admDep: '1',
    startDate: '2012-06-01',
    compDate: '2013-05-30',
    note: 'ATT_WFW_BASE 示意'
  }
];

export const polderInitial: PolderRecord[] = [
  {
    id: 'PLS-001',
    plsCode: '441900B01PL000001',
    plsName: '河东联圩',
    plsLoc: '韶山市河东片区韶河沿岸',
    poiLong: 112.52,
    poiLat: 27.91,
    lowLeftLong: 112.52,
    lowLeftLat: 27.91,
    upRightLong: 112.54,
    upRightLat: 27.92,
    poldClas: '3',
    poldProp: '1',
    desFlFlow: 120.0,
    desStorCap: 850.0,
    opPr: '汛期按市防指调度，旱季蓄水保灌。',
    note: '圩区台账示例',
    protectStd: '20 年一遇',
    polderArea: 12.6,
    cultArea: 8.2,
    drainCap: 35.0,
    pumpNum: 6,
    startDate: '',
    compDate: ''
  }
];

export const hillpondInitial: HillpondRecord[] = [
  {
    id: 'STU-001',
    stuCode: '441900B01ST000001',
    stuName: '留凤山塘',
    stuLoc: '韶山市东郊镇留凤村',
    poiLong: 112.527,
    poiLat: 27.914,
    lowLeftLong: 112.527,
    lowLeftLat: 27.914,
    upRightLong: 112.5285,
    upRightLat: 27.9152,
    engScal: '3',
    watShedArea: 0.85,
    normWatLev: 72.4,
    totVol: 8.5,
    engStat: '1',
    admDep: '1',
    startDate: '2005-04-01',
    compDate: '2006-10-01',
    note: 'ATT_POND_BASE 山塘示意'
  }
];

/** ATT_BAS_BASE 流域台账示例 */
export const watershedInitial: WatershedRecord[] = [
  {
    id: 'BAS-001',
    basCode: '441900B01BS000001',
    basName: '湘江湘潭韶山片区流域单元',
    basType: '3',
    basGrad: '3',
    basArea: 602.5,
    crOverType: '6',
    flowAdmReg: ['430382100000', '430382101000', '430382102000'],
    extentNeLng: null,
    extentNeLat: null,
    extentSwLng: null,
    extentSwLat: null,
    note: '示例：对齐 SL/T 809—2021 表7.1 原型台账'
  },
  {
    id: 'BAS-002',
    basCode: '441900B01BS000002',
    basName: '涟水上游韶山支流控制单元',
    basType: '1',
    basGrad: '4',
    basArea: 128.4,
    crOverType: '6',
    flowAdmReg: ['430382101000', '430382103000'],
    extentNeLng: null,
    extentNeLat: null,
    extentSwLng: null,
    extentSwLat: null,
    note: ''
  }
];

export const riverInitial: RiverRecord[] = [
  {
    id: 'RIV-001',
    rvCode: '441900B01RV000001',
    rvName: '韶河',
    rvSourLong: 112.42,
    rvSourLat: 27.85,
    rvMouLong: 112.58,
    rvMouLat: 27.92,
    rvSourLoc: '湖南省韶山市境内山丘区',
    rvMouLoc: '韶山市下游汇入涟水',
    crOverType: '6',
    flowArea: '湖南省韶山市境内多个乡镇',
    rvType: '1',
    rvGrad: '3',
    bank: '0',
    rvLen: 36.8,
    rvBasArea: 285.0,
    averSlop: 1.25,
    note: 'ATT_RV_BASE 河流示例'
  }
];

export const leveeInitial: LeveeRecord[] = [
  {
    id: 'DKE-001',
    dkeCode: '441900B01DK000001',
    dkeName: '韶河左岸堤防（城区段）',
    dkeLoc: '韶山市城区沿韶河左岸',
    poiLong: 112.52,
    poiLat: 27.896,
    startLong: 112.505,
    startLat: 27.89,
    endLong: 112.535,
    endLat: 27.902,
    startLoc: '湖南省湘潭市韶山市清溪镇堤段起点',
    endLoc: '湖南省湘潭市韶山市清溪镇堤段终点',
    dkeGrad: '3',
    dikeType: '1',
    dikePatt: '1',
    dkeLen: 12800,
    dikeStartNum: '0+000',
    dikeEndNum: '12+800',
    elevSys: '02',
    startDikeTopEl: 92.5,
    endDikeTopEl: 93.1,
    dikeHeigMin: 4.2,
    dikeHeigMax: 6.8,
    dikeTopWidMin: 5.0,
    dikeTopWidMax: 8.0,
    engTask: '1',
    engStat: '1',
    admDep: '1',
    startDate: '2013-04-01',
    compDate: '2015-06-30',
    note: 'ATT_DIKE_BASE 示意',
    defSta: '50 年一遇',
    topWidth: 6.0
  },
  {
    id: 'DKE-002',
    dkeCode: '441900B01DK000002',
    dkeName: '撇洪渠右岸堤防',
    dkeLoc: '高新区撇洪渠右岸',
    poiLong: 112.533,
    poiLat: 27.915,
    startLong: 112.528,
    startLat: 27.912,
    endLong: 112.538,
    endLat: 27.918,
    startLoc: '高新区撇洪渠右岸起点',
    endLoc: '高新区撇洪渠右岸终点',
    dkeGrad: '4',
    dikeType: '1',
    dikePatt: '3',
    dkeLen: 5200,
    dikeStartNum: '0+000',
    dikeEndNum: '5+200',
    elevSys: '02',
    startDikeTopEl: 88.0,
    endDikeTopEl: 88.4,
    dikeHeigMin: 3.0,
    dikeHeigMax: 4.5,
    dikeTopWidMin: 4.0,
    dikeTopWidMax: 5.5,
    engTask: '1',
    engStat: '1',
    admDep: '1',
    startDate: '2017-03-01',
    compDate: '2018-10-01',
    note: '',
    defSta: '20 年一遇',
    topWidth: 4.5
  }
];

export const rsInitial: RsRecord[] = [
  {
    id: 'R1',
    code: 'RS-SS-2026-001',
    coverAreaNames: ['韶山片区', '高新片区'],
    updatedAt: '2026-04-10 09:30',
    rsServiceType: 'NDVI',
    serviceUrl: 'https://tiles.example.com/rs/ss_ndvi/{z}/{x}/{y}.png'
  },
  {
    id: 'R2',
    code: 'RS-SS-2026-002',
    coverAreaNames: ['工业园', '河东'],
    updatedAt: '2026-04-08 14:00',
    rsServiceType: '叶绿素',
    serviceUrl: 'https://geoserver.example.com/wms?layers=ss_chl_a'
  },
  {
    id: 'R3',
    code: 'RS-SS-2026-003',
    coverAreaNames: ['河西', '全市'],
    updatedAt: '2026-04-05 11:20',
    rsServiceType: '问题图斑',
    serviceUrl: 'https://tiles.example.com/rs/issue_patches/cog.tif'
  }
];

export const parkInitial: ParkRecord[] = [
  {
    id: 'K1',
    parkName: '高新产业园',
    addvName: '湖南省湘潭市韶山市·清溪镇',
    areaHa: 320,
    firms: 86,
    linkedSewageFacilityIds: ['WWTP-SS-002', 'PS-SS-W-001', 'OUT-SS-001'],
    linkedEnterpriseIds: ['ENT-SS-001', 'ENT-SS-002', 'ENT-SS-003'],
    functionalZones: [
      {
        id: 'FZ-K1-1',
        zoneType: '工业生产区',
        boundaryGeoJson: JSON.stringify({
          type: 'Polygon',
          coordinates: [
            [
              [112.52, 27.905],
              [112.535, 27.905],
              [112.535, 27.918],
              [112.52, 27.918],
              [112.52, 27.905]
            ]
          ]
        })
      }
    ],
    note: '污水纳管率示意'
  },
  {
    id: 'K2',
    parkName: '绿色产业园',
    addvName: '湖南省湘潭市韶山市·银田镇',
    areaHa: 210,
    firms: 34,
    linkedSewageFacilityIds: ['WWTP-SS-003'],
    linkedEnterpriseIds: ['ENT-SS-004', 'ENT-SS-005'],
    functionalZones: [
      {
        id: 'FZ-K2-1',
        zoneType: '物流仓储区',
        boundaryGeoJson: JSON.stringify({
          type: 'Polygon',
          coordinates: [
            [
              [112.508, 27.898],
              [112.518, 27.898],
              [112.518, 27.904],
              [112.508, 27.904],
              [112.508, 27.898]
            ]
          ]
        })
      }
    ],
    note: ''
  }
];

export const unitInitial: UnitRecord[] = [
  {
    id: 'U1',
    orgCode: 'ORG-11440300-001',
    name: '市生态环境局',
    type: '政府部门',
    phone: '0731-xxxx',
    scope: '全市监管',
    creditCode: '11440300MB2Cxxxx1X'
  },
  {
    id: 'U2',
    orgCode: 'ORG-91430300-002',
    name: '市政运维公司',
    type: '运维机构',
    phone: '0731-yyyy',
    scope: '管网泵站',
    creditCode: '91430300MA5Fxxxx3C'
  },
  {
    id: 'U3',
    orgCode: 'ORG-91430300-003',
    name: '高新区污水处理厂',
    type: '企业',
    phone: '0731-zzzz',
    scope: '片区污水处理',
    creditCode: '91430300MA4Lxxxx7Y'
  }
];
