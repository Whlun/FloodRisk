/**
 * 河湖长制数据字段说明（依据 DB4401/T 138—2021《河（湖）长制管理信息系统数据规范》）
 * 对应表：FOU_RIVER 河流（涌）信息表、表9「一河一档」河流（段）自然属性表 FOU_RIVER_INFO_DOC、
 * DYN_PATROL、DYN_WATER_QUALITY 等
 */

export type AdminLevel = 'A' | 'B' | 'C' | 'D' | 'E';
export type RiverSide = 'L' | 'R' | 'A';
export type SectionType = 1 | 2 | 3 | 4;

/** 管理级别 ADMIN_LEVEL：A 省管 B 市管 C 县管 D 镇管 E 其他 */
export const ADMIN_LEVEL_LABEL: Record<AdminLevel, string> = {
  A: '省管',
  B: '市管',
  C: '县管',
  D: '镇管',
  E: '其他',
};

/** 河段类型 SENCTION_TYPE：1 河流 2 河流区段 3 镇（街）段 4 村（居）段 */
export const SECTION_TYPE_LABEL: Record<number, string> = {
  1: '河流',
  2: '河流区段',
  3: '镇（街）段',
  4: '村（居）段',
};

/** 河流左右岸别 RIVER_SIDE：L 左岸 R 右岸 A 全段 */
export const RIVER_SIDE_LABEL: Record<RiverSide, string> = {
  L: '左岸',
  R: '右岸',
  A: '全段',
};

/** 表9 FOU_RIVER_INFO_DOC：行政区与河段位置关系 RIVER_DIST（L/R/T/E，与涌信息表 RIVER_SIDE 取值集不同） */
export type RiverDist = 'L' | 'R' | 'T' | 'E';

export const RIVER_DIST_LABEL: Record<RiverDist, string> = {
  L: '左岸',
  R: '右岸',
  T: '穿境',
  E: '其他',
};

/** FOU_RIVER + 表9 FOU_RIVER_INFO_DOC 自然属性（原型合并于一条责任段记录） */
export interface RiverSectionRow {
  key: string;
  /** SECTION_ID 河段编码 26 位 */
  sectionId: string;
  /** SECTION_NAME */
  sectionName: string;
  /** RIVER_SYSTEM 所属水系 */
  riverSystem: string;
  /** RIVER_SIDE（涌信息表） */
  riverSide: RiverSide;
  /** START_ADDR / END_ADDR */
  startAddr: string;
  endAddr: string;
  /** SENCTION_TYPE */
  sectionType: SectionType;
  /** ADDVCD 所属区划（原型存韶山市示意编码；界面展示名称） */
  addvcd: string;
  /** ADMIN_LEVEL */
  adminLevel: AdminLevel;
  /** 河段长度 RIVER_LEN，单位 km */
  riverLenKm: number;
  /** 汇水面积 AREA，单位 km² */
  basinAreaKm2: number;
  /** ADMIN_AGENCY 管理机构 */
  adminAgency: string;
  /** INTRODUCTION */
  introduction: string;
  /** REMARKS */
  remarks: string;
  /** 关联展示：河长姓名（规范见 FOU_USER） */
  chiefName: string;
  /** 关联展示：手机 MOBILE */
  chiefMobile: string;

  /**
   * 所属河流编码：与河流信息主表 `RiverChannelMasterRow.riverObjectId`（SL/T 809 表6 之 RV_CODE）外键对应。
   * 规范关系：**河段（SECTION_ID，FOU_RIVER/表9 合并台账）** 自属于 **河流基础信息对象**；**上一级河段**仍用 `parentId`（PARENT_ID）表达段际衔接。
   */
  linkedRiverObjectId: string;

  /** —— 以下字段来自表9「一河一档」河流（段）自然属性表 FOU_RIVER_INFO_DOC —— */
  /** PARENT_NAME 上一级河流名称 */
  parentName: string;
  /** PARENT_ID 上一级河段编码 */
  parentId: string;
  /** START_LGTD / START_LTTD 河段起点经度、纬度（°，保留 6 位小数） */
  startLgtd: number;
  startLttd: number;
  /** END_LGTD / END_LTTD 河段讫点经度、纬度（°） */
  endLgtd: number;
  endLttd: number;
  /** RIVER_DIST 行政区与河段位置关系 */
  riverDist: RiverDist;
  /** RUNOFF_VOLUME 多年平均径流量，单位 m³ */
  runoffVolume: number;
  /** LOWFLOW_VOLUME 多年平均枯水期流量，单位 m³/s */
  lowflowVolume: number;
  /** GAUGING_STATION 水文站数量 */
  gaugingStation: number;
  /** LEFT_BRANCH 左岸支流数量 */
  leftBranch: number;
  /** RIGHT_BRANCH 右岸支流数量 */
  rightBranch: number;
}

/** SL/T 809—2021 表4 跨界类型 CR_OVER_TYPE（表6 ATT_RV_BASE） */
export const RV_ATT_CR_OVER_TYPE_OPTIONS = [
  { value: '0', label: '0 未知' },
  { value: '1', label: '1 跨国并跨省' },
  { value: '2', label: '2 跨国' },
  { value: '3', label: '3 跨省' },
  { value: '4', label: '4 跨市' },
  { value: '5', label: '5 跨县' },
  { value: '6', label: '6 县界内' },
] as const;

/** 表7 河流类型 RV_TYPE */
export const RV_ATT_RV_TYPE_OPTIONS = [
  { value: '1', label: '1 自然流域' },
  { value: '2', label: '2 区间流域' },
  { value: '3', label: '3 平原水网区' },
] as const;

/** 表8 河流级别 RV_GRAD */
export const RV_ATT_RV_GRAD_OPTIONS = [
  { value: '0', label: '0 干流' },
  { value: '1', label: '1 一级支流' },
  { value: '2', label: '2 二级支流' },
  { value: '3', label: '3 三级支流' },
  { value: '4', label: '4 四级支流' },
  { value: '5', label: '5 五级支流' },
  { value: '6', label: '6 六级支流' },
  { value: '7', label: '7 七级支流' },
  { value: '8', label: '8 八级支流' },
  { value: '99', label: '99 未定级别' },
] as const;

/** 表9 岸别 BANK（与涌信息表左右岸取值集不同，勿混用） */
export const RV_ATT_BANK_OPTIONS = [
  { value: '0', label: '0 不分' },
  { value: '1', label: '1 左' },
  { value: '2', label: '2 右' },
] as const;

/** 码表转中文标签（界面不展示裸码） */
export function riverAttCodeLabel(
  options: readonly { value: string; label: string }[],
  code: string | undefined,
): string {
  if (code == null || String(code).trim() === '') return '—';
  const hit = options.find(o => o.value === String(code));
  return hit?.label ?? String(code);
}

/**
 * 河流信息主数据 — **SL/T 809—2021 表6 ATT_RV_BASE（行业库常见逻辑名 sl_att_rv_base）** 字段语义；
 * `riverObjectId` 与规范 **RV_CODE（河流代码）** 同义，供责任段 `linkedRiverObjectId` 外键引用；
 * `representativeSectionId`、`riverSystem` 为河湖长制原型扩展（非表6体字段）。
 */
export interface RiverChannelMasterRow {
  key: string;
  /** RV_CODE 河流代码 */
  riverObjectId: string;
  /** RV_NAME 河流名称 */
  riverName: string;
  /** RV_SOUR_LONG 河源经度（°） */
  rvSourLong?: number | null;
  /** RV_SOUR_LAT 河源纬度（°） */
  rvSourLat?: number | null;
  /** RV_MOU_LONG 河口经度（°） */
  rvMouLong?: number | null;
  /** RV_MOU_LAT 河口纬度（°） */
  rvMouLat?: number | null;
  /** RV_SOUR_LOC 河源所在位置 */
  rvSourLoc?: string;
  /** RV_MOU_LOC 河口所在位置 */
  rvMouLoc?: string;
  /** CR_OVER_TYPE 跨界类型 */
  crOverType?: string;
  /** FLOW_AREA 河流流经行政区：原型存英文逗号分隔的区划编码，界面为多选下拉 */
  flowArea?: string;
  /** RV_TYPE 河流类型 */
  rvType?: string;
  /** RV_GRAD 河流级别 */
  rvGrad?: string;
  /** BANK 岸别 */
  bank?: string;
  /** RV_LEN 河长（千米） */
  rvLen?: number | null;
  /** RV_BAS_AREA 河流集水面积（平方千米） */
  rvBasArea?: number | null;
  /** AVER_SLOP 平均比降（千分比） */
  averSlop?: number | null;
  /** NOTE 备注 */
  remarks?: string;
  /** 代表河段编码（河湖长制扩展） */
  representativeSectionId?: string;
  /** 所属水系（河湖长制扩展；责任段表单随所选河流自动带出） */
  riverSystem?: string;
}

/**
 * 湖泊信息 — **SL/T 809—2021 ATT_LK_BASE（湖泊基础信息）** 为主，河湖长制业务字段为扩展；界面仅中文标签。
 */
export interface LakeWaterBodyRow {
  key: string;
  /** 湖泊代码 LK_CODE */
  lakeObjectId: string;
  /** 湖泊名称 LK_NAME */
  lakeName: string;
  /** 最小外包矩形左下角经度 °（CGCS2000） */
  lowLeftLong?: number;
  /** 最小外包矩形左下角纬度 ° */
  lowLeftLat?: number;
  /** 最小外包矩形右上角经度 ° */
  upRightLong?: number;
  /** 最小外包矩形右上角纬度 ° */
  upRightLat?: number;
  /** 湖泊所在位置 LK_LOC（省市区县及地名描述） */
  lkLoc?: string;
  /** 跨界类型 CR_OVER_TYPE（码表见 LAKE_CR_OVER_TYPE_OPTIONS） */
  crOverType?: string;
  /** 水面面积 WAT_AREA km² */
  surfaceAreaKm2: number;
  /** 湖泊容积 MEA_ANN_LK_VOL，10⁴ m³（万立方米） */
  storage10kM3?: number;
  /** 湖泊级别 LK_RANK */
  lkRank?: string;
  /** 咸淡水属性 SAL_FRE_WAT */
  salFreWat?: string;
  /** 平均水深 MEA_ANN_WAT_DEPT m */
  avgDepthM?: number;
  /** 最大水深 MAX_DEPT m */
  maxDepthM?: number;
  /** 备注 NOTE */
  remarks?: string;
  /** 记录生效时间 EFF_DATE（原型存 ISO 字符串） */
  effDate?: string;
  /** 记录失效时间 EXPR_DATE */
  exprDate?: string;
  /** 要素采集时间 YSCJSJ */
  yscjsj?: string;
  /** 记录更新时间 JLGXSJ */
  jlgxsj?: string;
  /**
   * 地图示意 POI（与外包矩形独立填报；联动 AddrWgs84MapPicker，非规范库表必填项）
   */
  poiLong?: number;
  poiLat?: number;

  /** 所属河湖水系或流域（河湖长制扩展） */
  belongHydroSystem: string;
  /** 所属区划补充名称（展示用，可与 addvcd 联动） */
  regionName: string;
  addvcd: string;
  adminLevel: AdminLevel;
  /** 水体类型：天然湖泊 / 水库 / 塘堰等（扩展） */
  lakeCategory: string;
  /** 水功能区或水质目标（扩展） */
  waterFuncTarget?: string;
  adminAgency: string;
  /** 连通河流对象编码（扩展） */
  connectedRiverObjectId?: string;
  /** 连通河段编码（扩展） */
  connectedSectionId?: string;
  /** 河湖连通说明（扩展） */
  lakeRiverRelationNote?: string;
}

/** ATT_LK_BASE 跨界类型（演示） */
export const LAKE_CR_OVER_TYPE_OPTIONS = [
  { value: '0', label: '无跨界' },
  { value: '1', label: '跨国界' },
  { value: '2', label: '跨省' },
  { value: '3', label: '跨市' },
  { value: '4', label: '跨县' },
];

/** 咸淡水属性（演示） */
export const LAKE_SAL_FRE_WAT_OPTIONS = [
  { value: '1', label: '淡水' },
  { value: '2', label: '咸水' },
  { value: '3', label: '半咸水（过渡带）' },
];

/** 湖泊级别按面积档（演示） */
export const LAKE_LK_RANK_OPTIONS = [
  { value: '1', label: '特大型' },
  { value: '2', label: '大型' },
  { value: '3', label: '中型' },
  { value: '4', label: '小型' },
];

/** 巡河记录 · 单条「发现问题」子表 */
export interface PatrolProblemItem {
  /** 问题编号 */
  problemNo: string;
  problemDesc: string;
  /** 上报人员 */
  reporterName: string;
  /** 上报人联系电话 */
  reporterPhone: string;
  /** 发现时间 */
  foundTime: string;
  /** 位置（描述或经纬度文字） */
  location: string;
  /** 图片地址列表（可多图，详情可点击预览） */
  imageUrls: string[];
  /** 视频地址列表（可多条，详情可点击播放） */
  videoUrls: string[];
  handleSuggestion: string;
  /** 是否已整改闭环（统计整改率用；对接后由事务闭环状态回写） */
  rectified?: boolean;
}

/**
 * 表 13 DYN_PATROL 单条「巡检记录」续表字段（含起止时间、距离、时长、起终点经纬度）。
 * 字段代码与水利规范一致：LGTD=经度，LTTD=纬度（°，保留 6 位小数）。
 * 每条巡检记录与一条巡河轨迹一对一（trackSummary / 接口轨迹 ID 由后端回写，原型仅展示）。
 */
export interface PatrolSegmentRecord {
  key: string;
  /** 段级业务编号（如 xxx-S01）；原型表格不展示，保存时按行生成或与历史行保留 */
  segmentPatrolNo: string;
  /** 本段巡检人员（多人） */
  segmentPersonnel: string[];
  /** STRTIME 开始时间 */
  strtime: string;
  /** ENDTIME 结束时间 */
  endtime: string;
  /** DISTANCE 巡河距离 km */
  distanceKm: number;
  /** DURATION 持续时长 min */
  durationMin: number;
  startLgtd: number;
  startLttd: number;
  endLgtd: number;
  endLttd: number;
  /** 与本段一对一的轨迹说明或 GeoJSON 占位 */
  trackSummary: string;
}

/**
 * 一条「巡检信息」：台账头 + 多条巡检记录（segments）+ 发现问题。
 * 列表/详情头字段为整次巡检；时间、距离、轨迹以 segments 为准。
 */
export interface PatrolRecordRow {
  key: string;
  patrolId: string;
  sectionId: string;
  sectionName: string;
  chiefName: string;
  /** 巡河人员（多人） */
  personnel: string[];
  /** 巡河方式 */
  patrolMode: string;
  /** 多条巡检记录，每条与巡河轨迹一对一 */
  segments: PatrolSegmentRecord[];
  problems: PatrolProblemItem[];
  /** 以下字段保留作统计或对接扩展 */
  userId?: string;
}

/** DYN_WATER_QUALITY — 水质监测记录表（水质类别 1–6 类）；与责任段（FOU_RIVER）通过 sectionId / sectionName 关联 */
export interface WaterQualityRow {
  key: string;
  id: string;
  sectionId: string;
  /** 与责任段信息一致的河段名称 */
  sectionName: string;
  /** 区域名称（下拉筛选用短名，如区县） */
  regionShort: string;
  /** 水体名称 */
  waterBody: string;
  /** 所属区划（完整展示名） */
  regionName: string;
  detectionDate: string;
  /** 监测时间 */
  monitorTime: string;
  addvcd: string;
  /** 监测点名称（自动站/人工点等） */
  monitorPointName: string;
  qualityClass: 1 | 2 | 3 | 4 | 5 | 6;
  /** 水温（摄氏度） */
  waterTemp: number;
  /** 酸碱度（无量纲） */
  ph: number;
  /** 溶解氧（毫克每升） */
  dissolvedOxygen: number;
  /** 高锰酸盐指数（毫克每升） */
  permanganate: number;
  /** 氨氮（毫克每升） */
  ammoniaNitrogen: number;
  /** 总磷（毫克每升） */
  totalPhosphorus: number;
}

export const QUALITY_CLASS_LABEL: Record<number, string> = {
  1: 'Ⅰ类',
  2: 'Ⅱ类',
  3: 'Ⅲ类',
  4: 'Ⅳ类',
  5: 'Ⅴ类',
  6: '劣Ⅴ类',
};

export const HC_TYPE_LABEL: Record<number, string> = {
  0: '不予评价',
  1: '无黑臭',
  2: '轻度黑臭',
  3: '重度黑臭',
};

/** 示例数据：河段编码格式参考标准 5.2.2（26 位组合码） */
export const initialRiverSectionData: RiverSectionRow[] = [
  {
    key: '1',
    sectionId: 'AHD030212000000-040110131R',
    sectionName: '湘江长沙岳麓段（右岸）',
    riverSystem: '湘江流域',
    riverSide: 'R',
    startAddr: '橘子洲头',
    endAddr: '月亮岛',
    sectionType: 3,
    addvcd: '430104000000',
    adminLevel: 'B',
    riverLenKm: 58.5,
    basinAreaKm2: 125.6,
    adminAgency: '长沙市河长办',
    introduction: '湘江长沙段重点管护河段，面向下游右岸。',
    remarks: '示范河段',
    chiefName: '张伟',
    chiefMobile: '138****1234',
    linkedRiverObjectId: 'ROV-AHD030212-XJ-MAIN',
    parentName: '湘江干流',
    parentId: 'AHD030212000000-040110000A',
    startLgtd: 112.965432,
    startLttd: 28.200128,
    endLgtd: 112.881256,
    endLttd: 28.245612,
    riverDist: 'R',
    runoffVolume: 2850000000,
    lowflowVolume: 128.5,
    gaugingStation: 3,
    leftBranch: 2,
    rightBranch: 4,
  },
  {
    key: '2',
    sectionId: 'AHD030338000000-13011T012A',
    sectionName: '浏阳河城区段（全段）',
    riverSystem: '浏阳河流域',
    riverSide: 'A',
    startAddr: '城区上游断面',
    endAddr: '城区下游闸坝',
    sectionType: 2,
    addvcd: '430181000000',
    adminLevel: 'B',
    riverLenKm: 32.8,
    basinAreaKm2: 68.4,
    adminAgency: '浏阳市河长办',
    introduction: '浏阳河城区黑臭水体治理巩固段。',
    remarks: '',
    chiefName: '李强',
    chiefMobile: '139****5678',
    linkedRiverObjectId: 'ROV-AHD030338-LYH',
    parentName: '浏阳河',
    parentId: 'AHD030338000000-130110000A',
    startLgtd: 113.051234,
    startLttd: 28.148956,
    endLgtd: 113.018765,
    endLttd: 28.182341,
    riverDist: 'T',
    runoffVolume: 920000000,
    lowflowVolume: 45.2,
    gaugingStation: 2,
    leftBranch: 1,
    rightBranch: 1,
  },
  {
    key: '3',
    sectionId: 'AHD030121000000-110050021L',
    sectionName: '捞刀河下游段（左岸）',
    riverSystem: '捞刀河流域',
    riverSide: 'L',
    startAddr: '支流汇入口',
    endAddr: '湘江汇入口',
    sectionType: 4,
    addvcd: '430121000000',
    adminLevel: 'C',
    riverLenKm: 28.3,
    basinAreaKm2: 52.1,
    adminAgency: '长沙县水利局',
    introduction: '捞刀河下游岸线管护。',
    remarks: '',
    chiefName: '王明',
    chiefMobile: '137****9012',
    linkedRiverObjectId: 'ROV-AHD030121-LDH',
    parentName: '捞刀河',
    parentId: 'AHD030121000000-110110000A',
    startLgtd: 113.082156,
    startLttd: 28.352089,
    endLgtd: 113.045678,
    endLttd: 28.318234,
    riverDist: 'L',
    runoffVolume: 410000000,
    lowflowVolume: 22.8,
    gaugingStation: 1,
    leftBranch: 0,
    rightBranch: 2,
  },
  {
    key: '4',
    sectionId: 'AHD030112000000-180060031A',
    sectionName: '靳江河段',
    riverSystem: '靳江流域',
    riverSide: 'A',
    startAddr: '靳江源头',
    endAddr: '汇入湘江口',
    sectionType: 1,
    addvcd: '430112000000',
    adminLevel: 'B',
    riverLenKm: 45.2,
    basinAreaKm2: 89.7,
    adminAgency: '望城区河长办',
    introduction: '靳江河长制责任河段。',
    remarks: '预警关注',
    chiefName: '刘芳',
    chiefMobile: '136****3456',
    linkedRiverObjectId: 'ROV-AHD030112-JJ',
    parentName: '靳江',
    parentId: 'AHD030112000000-180060000A',
    startLgtd: 112.852341,
    startLttd: 28.118765,
    endLgtd: 112.889012,
    endLttd: 28.156234,
    riverDist: 'T',
    runoffVolume: 380000000,
    lowflowVolume: 18.6,
    gaugingStation: 1,
    leftBranch: 3,
    rightBranch: 2,
  },
  /** 韶山市域责任段（与「河长责任区域」页 SHAOSHAN_SECTION_PICK_LIST 河段编码一致，供事务关联等下拉） */
  {
    key: '5',
    sectionId: 'SS430382000001-01001R',
    sectionName: '韶河清溪段（右岸）',
    riverSystem: '韶河流域',
    riverSide: 'R',
    startAddr: '清溪闸上游',
    endAddr: '青年水库汇入口',
    sectionType: 3,
    addvcd: '430382100000',
    adminLevel: 'D',
    riverLenKm: 8.6,
    basinAreaKm2: 42.5,
    adminAgency: '清溪镇河长办',
    introduction: '韶河城区上游重点管护岸线，衔接青年水库饮用水水源保护。',
    remarks: '与项目档案清溪段示范工程可对参。',
    chiefName: '李娜',
    chiefMobile: '138****1111',
    linkedRiverObjectId: 'ROV-430382-SHAOHE',
    parentName: '韶河干流',
    parentId: 'SS430382000000-PARENT',
    startLgtd: 112.538,
    startLttd: 27.908,
    endLgtd: 112.562,
    endLttd: 27.928,
    riverDist: 'R',
    runoffVolume: 120000000,
    lowflowVolume: 2.8,
    gaugingStation: 1,
    leftBranch: 1,
    rightBranch: 2,
  },
  {
    key: '6',
    sectionId: 'SS430382000002-02002A',
    sectionName: '韶河银田段（全段）',
    riverSystem: '韶河流域',
    riverSide: 'A',
    startAddr: '银田老桥',
    endAddr: '与湘乡界断面',
    sectionType: 2,
    addvcd: '430382101000',
    adminLevel: 'D',
    riverLenKm: 6.2,
    basinAreaKm2: 35.2,
    adminAgency: '银田镇河长办',
    introduction: '银田镇城区与工业园衔接段，雨天面源与管网溢流巡查重点。',
    remarks: '',
    chiefName: '周建国',
    chiefMobile: '139****0203',
    linkedRiverObjectId: 'ROV-430382-SHAOHE',
    parentName: '韶河干流',
    parentId: 'SS430382000000-PARENT',
    startLgtd: 112.572,
    startLttd: 27.882,
    endLgtd: 112.588,
    endLttd: 27.898,
    riverDist: 'T',
    runoffVolume: 98000000,
    lowflowVolume: 2.1,
    gaugingStation: 1,
    leftBranch: 0,
    rightBranch: 1,
  },
  {
    key: '7',
    sectionId: 'SS430382000003-03003L',
    sectionName: '韶山灌区总干渠韶山段（左岸）',
    riverSystem: '韶山灌区',
    riverSide: 'L',
    startAddr: '渠首节制闸',
    endAddr: '南干渠分水口',
    sectionType: 3,
    addvcd: '430382102000',
    adminLevel: 'D',
    riverLenKm: 4.5,
    basinAreaKm2: 18.6,
    adminAgency: '韶山乡农业综合服务中心',
    introduction: '灌溉输水与岸线管护并重段。',
    remarks: '',
    chiefName: '赵敏',
    chiefMobile: '137****0908',
    linkedRiverObjectId: 'ROV-430382-SHAOHE',
    parentName: '韶山灌区总干渠',
    parentId: 'SS430382000003-PARENT',
    startLgtd: 112.518,
    startLttd: 27.942,
    endLgtd: 112.532,
    endLttd: 27.958,
    riverDist: 'L',
    runoffVolume: 0,
    lowflowVolume: 8.5,
    gaugingStation: 0,
    leftBranch: 0,
    rightBranch: 0,
  },
  {
    key: '8',
    sectionId: 'SS430382000004-04004A',
    sectionName: '杨林河示范段',
    riverSystem: '杨林河流域',
    riverSide: 'A',
    startAddr: '乡界断面',
    endAddr: '汇入韶河口',
    sectionType: 3,
    addvcd: '430382103000',
    adminLevel: 'D',
    riverLenKm: 5.1,
    basinAreaKm2: 22.0,
    adminAgency: '杨林乡河长办',
    introduction: '杨林河入韶河前示范整治段。',
    remarks: '清淤与小微水体台账联动演示。',
    chiefName: '王磊',
    chiefMobile: '136****0707',
    linkedRiverObjectId: 'ROV-430382-SHAOHE',
    parentName: '杨林河',
    parentId: 'SS430382000004-PARENT',
    startLgtd: 112.598,
    startLttd: 27.898,
    endLgtd: 112.612,
    endLttd: 27.914,
    riverDist: 'T',
    runoffVolume: 45000000,
    lowflowVolume: 1.2,
    gaugingStation: 0,
    leftBranch: 1,
    rightBranch: 0,
  },
  {
    key: '9',
    sectionId: 'SS430382000005-05005R',
    sectionName: '如意湖连通渠段（右岸）',
    riverSystem: '如意水系',
    riverSide: 'R',
    startAddr: '湖心泵站',
    endAddr: '生态护岸终点',
    sectionType: 4,
    addvcd: '430382000000',
    adminLevel: 'C',
    riverLenKm: 2.3,
    basinAreaKm2: 6.8,
    adminAgency: '韶山市水利局',
    introduction: '城区湖库连通渠生态化改造示范。',
    remarks: '',
    chiefName: '陈蕾',
    chiefMobile: '135****0606',
    linkedRiverObjectId: 'ROV-430382-SHAOHE',
    parentName: '如意湖连通渠',
    parentId: 'SS430382000005-PARENT',
    startLgtd: 112.548,
    startLttd: 27.868,
    endLgtd: 112.558,
    endLttd: 27.878,
    riverDist: 'R',
    runoffVolume: 0,
    lowflowVolume: 0.35,
    gaugingStation: 0,
    leftBranch: 0,
    rightBranch: 0,
  },
  {
    key: '10',
    sectionId: 'SS430382000006-06006A',
    sectionName: '韶山乡小微水体示范片',
    riverSystem: '韶山乡片',
    riverSide: 'A',
    startAddr: '联村整治起点',
    endAddr: '生态塘出口',
    sectionType: 4,
    addvcd: '430382102000',
    adminLevel: 'D',
    riverLenKm: 3.8,
    basinAreaKm2: 9.5,
    adminAgency: '韶山乡河长办',
    introduction: '联村塘坝、沟渠综合整治示范片。',
    remarks: '',
    chiefName: '刘洋',
    chiefMobile: '134****0505',
    linkedRiverObjectId: 'ROV-430382-SHAOHE',
    parentName: '韶山乡小微水体',
    parentId: 'SS430382000006-PARENT',
    startLgtd: 112.578,
    startLttd: 27.948,
    endLgtd: 112.592,
    endLttd: 27.962,
    riverDist: 'T',
    runoffVolume: 0,
    lowflowVolume: 0.15,
    gaugingStation: 0,
    leftBranch: 2,
    rightBranch: 1,
  },
];

/** 示例：ATT_RV_BASE 层河流主数据（与责任段水系、编码族配套） */
export const initialRiverChannelMasterData: RiverChannelMasterRow[] = [
  {
    key: 'rch-1',
    riverObjectId: 'ROV-AHD030212-XJ-MAIN',
    riverName: '湘江干流',
    rvSourLong: 111.662,
    rvSourLat: 26.178,
    rvMouLong: 112.982,
    rvMouLat: 28.203,
    rvSourLoc: '湖南省永州市蓝山县野狗岭东南',
    rvMouLoc: '湖南省岳阳市湘阴县濠河口汇入洞庭湖',
    crOverType: '3',
    flowArea: '430100000000,430200000000,430300000000,430104000000,430302000000',
    rvType: '1',
    rvGrad: '0',
    bank: '0',
    rvLen: 143.6,
    rvBasArea: 956.2,
    averSlop: 0.35,
    remarks: '示例：与责任段「湘江长沙岳麓段」同属湘江流域。',
    representativeSectionId: 'AHD030212000000-040110131R',
    riverSystem: '湘江流域',
  },
  {
    key: 'rch-2',
    riverObjectId: 'ROV-AHD030338-LYH',
    riverName: '浏阳河',
    rvSourLong: 113.698,
    rvSourLat: 28.268,
    rvMouLong: 112.982,
    rvMouLat: 28.203,
    rvSourLoc: '湖南省长沙市浏阳市大围山北麓',
    rvMouLoc: '湖南省长沙市开福区浏阳河入湘江口',
    crOverType: '4',
    flowArea: '430181000000,430104000000',
    rvType: '1',
    rvGrad: '1',
    bank: '0',
    rvLen: 224.0,
    rvBasArea: 412.5,
    averSlop: 0.82,
    remarks: '示例：城区段责任段已建档。',
    representativeSectionId: 'AHD030338000000-13011T012A',
    riverSystem: '浏阳河流域',
  },
  {
    key: 'rch-3',
    riverObjectId: 'ROV-AHD030121-LDH',
    riverName: '捞刀河',
    rvSourLong: 113.12,
    rvSourLat: 28.45,
    rvMouLong: 112.99,
    rvMouLat: 28.25,
    rvSourLoc: '湖南省长沙市浏阳市石柱峰北麓',
    rvMouLoc: '湖南省长沙市开福区捞刀河入湘江口',
    crOverType: '5',
    flowArea: '430121000000,430104000000',
    rvType: '1',
    rvGrad: '1',
    bank: '0',
    rvLen: 108.0,
    rvBasArea: 268.0,
    averSlop: 0.55,
    remarks: '',
    representativeSectionId: 'AHD030121000000-110050021L',
    riverSystem: '捞刀河流域',
  },
  {
    key: 'rch-4',
    riverObjectId: 'ROV-AHD030112-JJ',
    riverName: '靳江',
    rvSourLong: 112.78,
    rvSourLat: 28.12,
    rvMouLong: 112.91,
    rvMouLat: 28.12,
    rvSourLoc: '湖南省湘潭市湘潭县昌山北麓',
    rvMouLoc: '湖南省长沙市岳麓区靳江河口（湘江）',
    crOverType: '5',
    flowArea: '430104000000,430321000000',
    rvType: '1',
    rvGrad: '2',
    bank: '0',
    rvLen: 45.2,
    rvBasArea: 89.7,
    averSlop: 1.1,
    remarks: '示例：与责任段表河段编码族一致。',
    representativeSectionId: 'AHD030112000000-180060031A',
    riverSystem: '靳江流域',
  },
  {
    key: 'rch-ss',
    riverObjectId: 'ROV-430382-SHAOHE',
    riverName: '韶河（韶山市）',
    rvSourLong: 112.42,
    rvSourLat: 27.85,
    rvMouLong: 112.58,
    rvMouLat: 27.92,
    rvSourLoc: '湖南省湘潭市韶山市境内山丘区',
    rvMouLoc: '湖南省湘潭市韶山市下游汇入涟水',
    crOverType: '6',
    flowArea: '430382000000,430382100000,430382101000,430382102000,430382103000',
    rvType: '1',
    rvGrad: '3',
    bank: '0',
    rvLen: 38.6,
    rvBasArea: 268.0,
    averSlop: 1.25,
    remarks: '与韶山市责任段台账、事务列表示例数据配套。',
    representativeSectionId: 'SS430382000001-01001R',
    riverSystem: '韶河流域',
  },
];

/** 示例：湖泊基础信息（ATT_LK_BASE）+ 河湖长制扩展 */
export const initialLakeWaterBodyData: LakeWaterBodyRow[] = [
  {
    key: 'lk-1',
    lakeObjectId: 'LK-430382-QNSK-001',
    lakeName: '青年水库',
    lowLeftLong: 112.518,
    lowLeftLat: 27.902,
    upRightLong: 112.538,
    upRightLat: 27.915,
    lkLoc: '湖南省湘潭市韶山市清溪镇青年水库片区',
    crOverType: '0',
    surfaceAreaKm2: 2.8,
    storage10kM3: 1860,
    lkRank: '3',
    salFreWat: '1',
    avgDepthM: 12.5,
    maxDepthM: 22.0,
    remarks: '与韶山片区河长制示范数据配套。',
    effDate: '2015-06-01 08:00:00',
    exprDate: undefined,
    yscjsj: '2024-06-01',
    jlgxsj: '2025-04-01 10:30:00',
    poiLong: 112.528,
    poiLat: 27.908,
    belongHydroSystem: '韶河流域',
    regionName: '湖南省湘潭市韶山市',
    addvcd: '430382000000',
    adminLevel: 'C',
    lakeCategory: '水库',
    waterFuncTarget: '饮用水水源二级保护区（示意）',
    adminAgency: '韶山市水利局',
    lakeRiverRelationNote: '韶河流域汇出河段可在河流主数据扩展后补充连通关系。',
    connectedRiverObjectId: undefined,
    connectedSectionId: undefined,
  },
  {
    key: 'lk-2',
    lakeObjectId: 'LK-430104-YZL-001',
    lakeName: '洋湖湿地公园湖泊',
    lowLeftLong: 112.931,
    lowLeftLat: 28.118,
    upRightLong: 112.948,
    upRightLat: 28.132,
    lkLoc: '湖南省长沙市岳麓区洋湖街道湿地片区',
    crOverType: '0',
    surfaceAreaKm2: 4.85,
    storage10kM3: undefined,
    lkRank: '2',
    salFreWat: '1',
    avgDepthM: 2.2,
    maxDepthM: 4.5,
    remarks: '',
    effDate: '2016-03-15 00:00:00',
    yscjsj: '2024-08-12',
    jlgxsj: '2025-03-20 09:00:00',
    poiLong: 112.94,
    poiLat: 28.125,
    belongHydroSystem: '湘江流域',
    regionName: '湖南省长沙市岳麓区',
    addvcd: '430104000000',
    adminLevel: 'B',
    lakeCategory: '天然湖泊（城市湿地）',
    waterFuncTarget: '景观娱乐用水区',
    adminAgency: '岳麓区河长办',
    connectedRiverObjectId: 'ROV-AHD030212-XJ-MAIN',
    connectedSectionId: 'AHD030212000000-040110131R',
    lakeRiverRelationNote: '城市湿地经联络河等与湘江干流连通。',
  },
  {
    key: 'lk-3',
    lakeObjectId: 'LK-430181-DTH-001',
    lakeName: '道吾山天池（示意）',
    lowLeftLong: 113.698,
    lowLeftLat: 28.268,
    upRightLong: 113.706,
    upRightLat: 28.276,
    lkLoc: '湖南省长沙市浏阳市道吾山风景名胜区内',
    crOverType: '0',
    surfaceAreaKm2: 0.35,
    storage10kM3: 28,
    lkRank: '4',
    salFreWat: '1',
    avgDepthM: 8.0,
    maxDepthM: 15.0,
    remarks: '原型演示用高山湖泊要素。',
    effDate: '2018-01-01 00:00:00',
    yscjsj: '2024-05-18',
    jlgxsj: '2025-01-08 14:20:00',
    poiLong: 113.702,
    poiLat: 28.272,
    belongHydroSystem: '浏阳河流域',
    regionName: '湖南省长沙市浏阳市',
    addvcd: '430181000000',
    adminLevel: 'C',
    lakeCategory: '天然湖泊',
    waterFuncTarget: '一般湿地保护',
    adminAgency: '浏阳市水利局',
    connectedRiverObjectId: 'ROV-AHD030338-LYH',
    connectedSectionId: 'AHD030338000000-13011T012A',
    lakeRiverRelationNote: '示意：山洪径流汇入浏阳河城区段责任河段。',
  },
];

/** 受纳水体下拉选项：与生态整治「河湖长制」河流（涌）主数据 + 湖泊水体主数据同源 */
export function buildReceiveWaterBodySelectOptions(
  rivers: readonly RiverChannelMasterRow[] = initialRiverChannelMasterData,
  lakes: readonly LakeWaterBodyRow[] = initialLakeWaterBodyData,
): { value: string; label: string }[] {
  const riverOpts = rivers.map(r => ({
    value: r.riverObjectId,
    label: `河流 · ${r.riverName}（${r.riverObjectId}）`,
  }));
  const lakeOpts = lakes.map(l => ({
    value: l.lakeObjectId,
    label: `湖泊 · ${l.lakeName}（${l.lakeObjectId}）`,
  }));
  return [...riverOpts, ...lakeOpts];
}

/** 详情/列表：将河流或湖泊对象编码回显为「名称（编码）」 */
export function formatReceiveWaterObjectIdDisplay(objectId: string): string {
  const t = String(objectId ?? '').trim();
  if (!t) return '—';
  const r = initialRiverChannelMasterData.find(x => x.riverObjectId === t);
  if (r) return `${r.riverName}（${t}）`;
  const l = initialLakeWaterBodyData.find(x => x.lakeObjectId === t);
  if (l) return `${l.lakeName}（${t}）`;
  return t;
}

export const initialPatrolData: PatrolRecordRow[] = [
  {
    key: 'p1',
    patrolId: 'PATROL-20240615-001',
    sectionId: 'AHD030212000000-040110131R',
    sectionName: '湘江长沙岳麓段（右岸）',
    userId: 'USER-001',
    chiefName: '张伟',
    personnel: ['张伟', '河长办巡查员李某', '保洁对接王某'],
    patrolMode: '步行巡河',
    segments: [
      {
        key: 'p1-s1',
        segmentPatrolNo: 'PATROL-20240615-001-S01',
        segmentPersonnel: ['张伟', '河长办巡查员李某'],
        strtime: '2024-06-15 08:30:00',
        endtime: '2024-06-15 09:15:00',
        distanceKm: 3.1,
        durationMin: 45,
        startLgtd: 112.965432,
        startLttd: 28.200128,
        endLgtd: 112.9482,
        endLttd: 28.2156,
        trackSummary: '橘子洲头—滨江步道北段，GPS 折线示意。',
      },
      {
        key: 'p1-s2',
        segmentPatrolNo: 'PATROL-20240615-001-S02',
        segmentPersonnel: ['张伟', '保洁对接王某'],
        strtime: '2024-06-15 09:20:00',
        endtime: '2024-06-15 10:15:00',
        distanceKm: 3.1,
        durationMin: 55,
        startLgtd: 112.9482,
        startLttd: 28.2156,
        endLgtd: 112.931,
        endLttd: 28.2289,
        trackSummary: '观沙岭段岸线复查，途经排污口巡查点。',
      },
    ],
    problems: [
      {
        problemNo: 'PRB-20240615-001',
        problemDesc: '岸线漂浮少量枯枝与塑料袋',
        reporterName: '李某',
        reporterPhone: '139****7788',
        foundTime: '2024-06-15 09:05:00',
        location: '湘江长沙岳麓段（右岸）K2+100 栈桥上游约 30m',
        imageUrls: [
          'https://picsum.photos/seed/eco-p1a/640/400',
          'https://picsum.photos/seed/eco-p1b/640/400',
        ],
        videoUrls: [],
        handleSuggestion: '通知属地保洁单位24 小时内清理并拍照反馈。',
        rectified: true,
      },
      {
        problemNo: 'PRB-20240615-002',
        problemDesc: '观沙岭段护栏一处松动',
        reporterName: '河长办巡查员赵某',
        reporterPhone: '137****1122',
        foundTime: '2024-06-15 09:42:00',
        location: '观沙岭堤段桩号 3+050 北侧护栏',
        imageUrls: ['https://picsum.photos/seed/eco-p1c/640/400'],
        videoUrls: ['https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'],
        handleSuggestion: '报市政维护，设置临时警示，7 日内完成加固。',
        rectified: false,
      },
    ],
  },
  {
    key: 'p2',
    patrolId: 'PATROL-20240614-002',
    sectionId: 'AHD030338000000-13011T012A',
    sectionName: '浏阳河城区段（全段）',
    userId: 'USER-002',
    chiefName: '李强',
    personnel: ['李强', '生态环境局张某'],
    patrolMode: '车巡+步行',
    segments: [
      {
        key: 'p2-s1',
        segmentPatrolNo: 'PATROL-20240614-002-S01',
        segmentPersonnel: ['李强'],
        strtime: '2024-06-14 14:00:00',
        endtime: '2024-06-14 15:00:00',
        distanceKm: 2.4,
        durationMin: 60,
        startLgtd: 113.051234,
        startLttd: 28.148956,
        endLgtd: 113.042,
        endLttd: 28.159,
        trackSummary: '堤顶路车巡段（东岸）。',
      },
      {
        key: 'p2-s2',
        segmentPatrolNo: 'PATROL-20240614-002-S02',
        segmentPersonnel: ['李强', '生态环境局张某'],
        strtime: '2024-06-14 15:05:00',
        endtime: '2024-06-14 16:20:00',
        distanceKm: 2.4,
        durationMin: 75,
        startLgtd: 113.042,
        startLttd: 28.159,
        endLgtd: 113.035,
        endLttd: 28.168,
        trackSummary: '桥下空间步行核查段，与本段轨迹一对一。',
      },
    ],
    problems: [
      {
        problemNo: 'PRB-20240614-001',
        problemDesc: '桥下空间堆放建筑垃圾',
        reporterName: '张某',
        reporterPhone: '136****5566',
        foundTime: '2024-06-14 15:10:00',
        location: '浏阳河城区段××桥下东南侧空地',
        imageUrls: [
          'https://picsum.photos/seed/eco-p2a/640/400',
          'https://picsum.photos/seed/eco-p2b/640/400',
          'https://picsum.photos/seed/eco-p2c/640/400',
        ],
        videoUrls: [],
        handleSuggestion: '移交城管执法核查来源，限期清运并加强巡查。',
        rectified: false,
      },
    ],
  },
  {
    key: 'p3',
    patrolId: 'PATROL-20240613-003',
    sectionId: 'AHD030121000000-110050021L',
    sectionName: '捞刀河下游段（左岸）',
    userId: 'USER-003',
    chiefName: '王明',
    personnel: ['王明'],
    patrolMode: '步行巡河',
    segments: [
      {
        key: 'p3-s1',
        segmentPatrolNo: 'PATROL-20240613-003-S01',
        segmentPersonnel: ['王明'],
        strtime: '2024-06-13 09:00:00',
        endtime: '2024-06-13 09:45:00',
        distanceKm: 2.1,
        durationMin: 45,
        startLgtd: 113.082156,
        startLttd: 28.352089,
        endLgtd: 113.068,
        endLttd: 28.338,
        trackSummary: '左岸堤防单程，无涉水作业；轨迹由接口绘制。',
      },
    ],
    problems: [
      {
        problemNo: 'PRB-20240613-001',
        problemDesc: '农业面源沟渠雨后浑浊入河',
        reporterName: '王明',
        reporterPhone: '135****8899',
        foundTime: '2024-06-13 09:18:00',
        location: '捞刀河下游左岸××村排沟入河口',
        imageUrls: [],
        videoUrls: [
          'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        ],
        handleSuggestion: '农业农村部门跟进沟渠清淤与田埂缓冲带建设。',
        rectified: true,
      },
    ],
  },
];

export const initialWaterQualityData: WaterQualityRow[] = [
  {
    key: 'w1',
    id: 'WQ-20240601-001',
    sectionId: 'AHD030212000000-040110131R',
    sectionName: '湘江长沙岳麓段（右岸）',
    regionShort: '岳麓区',
    waterBody: '湘江干流',
    regionName: '湖南省长沙市岳麓区',
    detectionDate: '2024-06-01',
    monitorTime: '2024-06-01 12:00',
    addvcd: '430104000000',
    monitorPointName: '岳麓段右岸主河道自动监测点',
    qualityClass: 3,
    waterTemp: 22.4,
    ph: 7.6,
    dissolvedOxygen: 7.8,
    permanganate: 3.2,
    ammoniaNitrogen: 0.42,
    totalPhosphorus: 0.08,
  },
  {
    key: 'w2',
    id: 'WQ-20240601-002',
    sectionId: 'AHD030338000000-13011T012A',
    sectionName: '浏阳河城区段（全段）',
    regionShort: '浏阳市',
    waterBody: '浏阳河',
    regionName: '湖南省长沙市浏阳市',
    detectionDate: '2024-06-01',
    monitorTime: '2024-06-01 12:00',
    addvcd: '430181000000',
    monitorPointName: '城区段中游浮标站',
    qualityClass: 4,
    waterTemp: 23.1,
    ph: 7.4,
    dissolvedOxygen: 6.5,
    permanganate: 4.1,
    ammoniaNitrogen: 0.85,
    totalPhosphorus: 0.12,
  },
  {
    key: 'w3',
    id: 'WQ-20240515-003',
    sectionId: 'AHD030112000000-180060031A',
    sectionName: '靳江河段',
    regionShort: '望城区',
    waterBody: '靳江',
    regionName: '湖南省长沙市望城区',
    detectionDate: '2024-05-15',
    monitorTime: '2024-05-15 12:00',
    addvcd: '430112000000',
    monitorPointName: '靳江控制断面自动站',
    qualityClass: 5,
    waterTemp: 24.0,
    ph: 7.2,
    dissolvedOxygen: 5.1,
    permanganate: 5.6,
    ammoniaNitrogen: 1.15,
    totalPhosphorus: 0.18,
  },
  {
    key: 'w4',
    id: 'WQ-20240610-004',
    sectionId: 'AHD030121000000-110050021L',
    sectionName: '捞刀河下游段（左岸）',
    regionShort: '长沙县',
    waterBody: '捞刀河',
    regionName: '湖南省长沙市长沙县',
    detectionDate: '2024-06-10',
    monitorTime: '2024-06-10 08:00',
    addvcd: '430121000000',
    monitorPointName: '捞刀河入湘江汇口左岸站',
    qualityClass: 4,
    waterTemp: 21.8,
    ph: 7.5,
    dissolvedOxygen: 6.9,
    permanganate: 3.8,
    ammoniaNitrogen: 0.55,
    totalPhosphorus: 0.09,
  },
];

/** FOU_USER 用户类型 USER_TYPE（节选，规范表 8） */
export const USER_TYPE_LABEL: Record<number, string> = {
  1: '市第一总河长',
  2: '市总河长',
  3: '市副总河长',
  4: '市河长',
  5: '区总河长',
  6: '区副总河长',
  7: '区河长',
  8: '镇（街）总河长',
  9: '镇（街）副总河长',
  10: '镇（街）河长',
  11: '村（居）河长',
};

// ==================== 河长通讯录（标准化台账，合并 FOU_USER 等字段） ====================

/** 通讯录人员大类：各级河长 / 管护人员 / 相关部门负责人 */
export type ContactRoleCategory = 'chief' | 'custodian' | 'department';

export const CONTACT_ROLE_LABEL: Record<ContactRoleCategory, string> = {
  chief: '河长',
  custodian: '管护人员',
  department: '部门负责人',
};

/** 部门类型（便于按条线查询、应急联动） */
export const CONTACT_DEPT_TYPES = [
  '河湖长办',
  '水务（水利）',
  '生态环境',
  '应急管理',
  '农业农村',
  '其他',
] as const;

/** 责任区域筛选项（示意，可与责任段/行政区划关联） */
export const CONTACT_AREA_OPTIONS = [
  '全市',
  '清溪镇',
  '银田镇',
  '韶山乡',
  '高新区',
  '韶河省控断面流域',
  '东郊水库汇水范围',
  '长沙市岳麓区',
  '浏阳市城区',
  '长沙县',
  '长沙市望城区',
];

export interface RiverChiefContactRow {
  id: string;
  /** FOU_USER.USER_ID，对接平台用户唯一标识（通讯录与河湖长用户主数据合并后必填） */
  userId: string;
  name: string;
  roleCategory: ContactRoleCategory;
  /** 河长级别：对应 USER_TYPE；非河长为 null */
  userType: number | null;
  areaName: string;
  deptType: string;
  orgName: string;
  title: string;
  mobile: string;
  tel: string;
  officeAddr?: string;
  /** FOU_USER.ADDVCD 所属区划（原型示意编码） */
  addvcd?: string;
  /** 关联责任河段 SECTION_ID（履职范围示意） */
  sectionId?: string;
  email?: string;
  remarks?: string;
}

/** 示例通讯录（各级河长、管护、部门负责人；含合并后的 FOU_USER 字段） */
export const initialRiverChiefContacts: RiverChiefContactRow[] = [
  {
    id: 'c1',
    userId: 'USER-SS-0001',
    name: '陈国华',
    roleCategory: 'chief',
    userType: 2,
    areaName: '全市',
    deptType: '河湖长办',
    orgName: '韶山市河长制工作委员会办公室',
    title: '市总河长',
    mobile: '138****0101',
    tel: '0731-5678****',
    officeAddr: '市政府大楼 A 座 8 层',
    addvcd: '430382000000',
  },
  {
    id: 'c2',
    userId: 'USER-SS-0002',
    name: '李秀英',
    roleCategory: 'chief',
    userType: 7,
    areaName: '清溪镇',
    deptType: '河湖长办',
    orgName: '清溪镇人民政府',
    title: '区河长',
    mobile: '139****0202',
    tel: '0731-5566****',
    officeAddr: '清溪镇行政服务中心',
    addvcd: '430382000000',
  },
  {
    id: 'c3',
    userId: 'USER-SS-0003',
    name: '王强',
    roleCategory: 'chief',
    userType: 10,
    areaName: '银田镇',
    deptType: '河湖长办',
    orgName: '银田镇河长办',
    title: '镇（街）河长',
    mobile: '137****0303',
    tel: '0731-5577****',
    officeAddr: '银田镇水利服务站',
    addvcd: '430382000000',
  },
  {
    id: 'c4',
    userId: 'USER-SS-0004',
    name: '赵敏',
    roleCategory: 'chief',
    userType: 11,
    areaName: '韶山乡',
    deptType: '河湖长办',
    orgName: '韶山乡农业农村办',
    title: '村（居）河长',
    mobile: '136****0404',
    tel: '—',
    officeAddr: '韶山乡水利协管站',
    addvcd: '430382000000',
  },
  {
    id: 'c5',
    userId: 'USER-SS-0005',
    name: '周伟',
    roleCategory: 'custodian',
    userType: null,
    areaName: '韶河省控断面流域',
    deptType: '水务（水利）',
    orgName: '市水利综合服务中心',
    title: '河道管护员',
    mobile: '135****0505',
    tel: '0731-5688****',
    officeAddr: '河道管理站值班室',
    addvcd: '430382000000',
  },
  {
    id: 'c6',
    userId: 'USER-SS-0006',
    name: '吴静',
    roleCategory: 'custodian',
    userType: null,
    areaName: '东郊水库汇水范围',
    deptType: '水务（水利）',
    orgName: '水库管理所',
    title: '水库巡查员',
    mobile: '134****0606',
    tel: '0731-5699****',
    addvcd: '430382000000',
  },
  {
    id: 'c7',
    userId: 'USER-SS-0007',
    name: '郑涛',
    roleCategory: 'department',
    userType: null,
    areaName: '全市',
    deptType: '生态环境',
    orgName: '市生态环境局韶山分局',
    title: '水环境应急联系人',
    mobile: '133****0707',
    tel: '0731-12369',
    officeAddr: '分局水生态环境股',
    addvcd: '430382000000',
  },
  {
    id: 'c8',
    userId: 'USER-SS-0008',
    name: '孙丽',
    roleCategory: 'department',
    userType: null,
    areaName: '全市',
    deptType: '应急管理',
    orgName: '市应急管理局',
    title: '防汛抗旱联络员',
    mobile: '132****0808',
    tel: '0731-5110****',
    addvcd: '430382000000',
  },
  {
    id: 'c9',
    userId: 'USER-SS-0009',
    name: '马军',
    roleCategory: 'department',
    userType: null,
    areaName: '高新区',
    deptType: '农业农村',
    orgName: '高新区社会事务局',
    title: '涉农涉水协调',
    mobile: '131****0909',
    tel: '0731-5777****',
    addvcd: '430382000000',
  },
  {
    id: 'c10',
    userId: 'USER-SS-0010',
    name: '林峰',
    roleCategory: 'chief',
    userType: 4,
    areaName: '全市',
    deptType: '河湖长办',
    orgName: '市水利局',
    title: '市河长（联系部门）',
    mobile: '130****1010',
    tel: '0731-5600****',
    officeAddr: '市水利局河长制工作科',
    addvcd: '430382000000',
  },
  {
    id: 'c11',
    userId: 'USER-RC-2024001',
    name: '张伟',
    roleCategory: 'chief',
    userType: 7,
    areaName: '长沙市岳麓区',
    deptType: '河湖长办',
    orgName: '长沙市岳麓区河长办',
    title: '区级河长',
    mobile: '138****1234',
    tel: '—',
    addvcd: '430104000000',
    sectionId: 'AHD030212000000-040110131R',
    email: 'zhangwei@example.gov.cn',
    remarks: '与责任段「湘江长沙岳麓段」台账关联示意。',
  },
  {
    id: 'c12',
    userId: 'USER-RC-2024002',
    name: '李强',
    roleCategory: 'chief',
    userType: 10,
    areaName: '浏阳市城区',
    deptType: '河湖长办',
    orgName: '浏阳市城区河长办',
    title: '镇（街）河长',
    mobile: '139****5678',
    tel: '—',
    addvcd: '430181000000',
    sectionId: 'AHD030338000000-13011T012A',
    email: 'liqiang@example.gov.cn',
  },
  {
    id: 'c13',
    userId: 'USER-RC-2024003',
    name: '王明',
    roleCategory: 'chief',
    userType: 10,
    areaName: '长沙县',
    deptType: '河湖长办',
    orgName: '长沙县水利局',
    title: '镇级河长联络员',
    mobile: '137****9012',
    tel: '—',
    addvcd: '430121000000',
    sectionId: 'AHD030121000000-110050021L',
  },
  {
    id: 'c14',
    userId: 'USER-RC-2024004',
    name: '刘芳',
    roleCategory: 'chief',
    userType: 7,
    areaName: '长沙市望城区',
    deptType: '河湖长办',
    orgName: '长沙市望城区河长办',
    title: '区级河长',
    mobile: '136****3456',
    tel: '—',
    addvcd: '430112000000',
    sectionId: 'AHD030112000000-180060031A',
    email: 'liufang@example.gov.cn',
    remarks: '预警关注河段责任人。',
  },
  {
    id: 'c15',
    userId: 'USER-SS-0011',
    name: '李娜',
    roleCategory: 'chief',
    userType: 7,
    areaName: '清溪镇',
    deptType: '河湖长办',
    orgName: '清溪镇人民政府',
    title: '区级河长（接任）',
    mobile: '138****1111',
    tel: '0731-5566****',
    officeAddr: '清溪镇行政服务中心',
    addvcd: '430382000000',
    remarks: '河长变更记录示例：接任河长。',
  },
];

/** 信息来源（对齐规范上报事件「来源」类语义） */
export const RIVER_GUARD_INFO_SOURCES = [
  '河长制信息系统',
  '巡河台账',
  '电话举报',
  '网络及热线',
  '上级交办',
  '部门移送',
  '媒体舆情',
  '其他',
] as const;

/** 处理状态 */
export const RIVER_GUARD_HANDLE_STATUS = ['待分派', '处置中', '待验收', '已办结', '已退回'] as const;

/** 严重程度 */
export const RIVER_GUARD_SEVERITY = ['一般', '较重', '紧急'] as const;

/**
 * 上报事件问题类型（对齐 DB4401/T 138—2021《河（湖）长制管理信息系统数据规范》**上报事件表**「问题类型」代码表语义：
 * 以河湖「清四乱」（乱占、乱采、乱堆、乱建）为纲，并列入水面保洁、排污与排水、水质异常等常见类别；正式入库以规范字典代码为准，原型用中文展示值。
 */
export const RIVER_GUARD_PROBLEM_TYPES = [
  '乱占',
  '乱采',
  '乱堆',
  '乱建',
  '水面漂浮物及保洁问题',
  '排污口与违法排污',
  '排水与溢流问题',
  '水质异常',
  '其他',
] as const;

/**
 * 事务列表/上报事件表单专用问题类型（业务口径；末项「其他」需在表单中补充输入具体类型）
 */
export const RIVER_GUARD_AFFAIR_EVENT_PROBLEM_TYPES = [
  '工业废水排放',
  '养殖污染',
  '排水设施',
  '违法建设',
  '农家乐',
  '建筑废弃物',
  '堆场码头',
  '工程维护',
  '生活垃圾',
  '其他',
] as const;

/** 将台账中的 problemType 拆成表单：预设项直接选中，否则归为「其他」并填入输入框 */
export function resolveAffairProblemTypeForForm(stored: string): { select: string; other: string } {
  const presets = RIVER_GUARD_AFFAIR_EVENT_PROBLEM_TYPES as readonly string[];
  if (presets.includes(stored)) {
    return { select: stored, other: '' };
  }
  return { select: '其他', other: stored };
}

export const RIVER_GUARD_REGION_OPTIONS = [
  '韶山市',
  '长沙市岳麓区',
  '浏阳市',
  '长沙县',
  '长沙市望城区',
  '清溪镇',
  '银田镇',
] as const;

/** 韶山市村级树节点（与 Ant Design TreeSelect `treeData` 结构兼容；编码为原型示意，正式以民政发布为准） */
export type ShaoshanAdminTreeNode = {
  title: string;
  value: string;
  selectable?: boolean;
  children?: ShaoshanAdminTreeNode[];
};

/**
 * 韶山市所属区划树（项目档案等需选至村/社区级；市—乡镇—村）
 */
export const SHAOSHAN_ADMIN_TREE_TO_VILLAGE: ShaoshanAdminTreeNode[] = [
  {
    title: '韶山市',
    value: '430382000000',
    selectable: false,
    children: [
      {
        title: '清溪镇',
        value: '430382100000',
        selectable: false,
        children: [
          { title: '清溪镇社区', value: '430382100001' },
          { title: '清溪村', value: '430382100002' },
          { title: '花园村', value: '430382100003' },
        ],
      },
      {
        title: '银田镇',
        value: '430382101000',
        selectable: false,
        children: [
          { title: '银田村', value: '430382101001' },
          { title: '华南村', value: '430382101002' },
        ],
      },
      {
        title: '韶山乡',
        value: '430382102000',
        selectable: false,
        children: [
          { title: '韶山村', value: '430382102001' },
          { title: '大坪村', value: '430382102002' },
        ],
      },
      {
        title: '杨林乡',
        value: '430382103000',
        selectable: false,
        children: [
          { title: '杨林村', value: '430382103001' },
          { title: '团田村', value: '430382103002' },
        ],
      },
    ],
  },
];

/** 从村级树解析选中节点的各级标题（用于详情/列表展示，不含编码） */
export function findShaoshanAdminDivisionTitlePath(
  nodes: ShaoshanAdminTreeNode[],
  targetValue: string,
): string[] {
  for (const n of nodes) {
    const v = String(n.value ?? '');
    if (v === targetValue) return [n.title];
    if (n.children?.length) {
      const sub = findShaoshanAdminDivisionTitlePath(n.children, targetValue);
      if (sub.length) return [n.title, ...sub];
    }
  }
  return [];
}

/** 村级树选中值格式化为「市 / 镇 / 村」展示文案 */
export function formatShaoshanAdminDivisionDisplay(value: string | undefined | null): string {
  const raw = (value ?? '').trim();
  if (!raw) return '—';
  const path = findShaoshanAdminDivisionTitlePath(SHAOSHAN_ADMIN_TREE_TO_VILLAGE, raw);
  if (path.length) return path.join(' / ');
  return getShaoshanAddvcdLabel(raw);
}

/** 韶山市及下辖镇乡（市—乡镇街道级下拉；编码为原型示意，对接以民政发布为准） */
export const SHAOSHAN_ADDVCD_OPTIONS: { value: string; label: string }[] = [
  { value: '430382000000', label: '韶山市（市本级）' },
  { value: '430382100000', label: '清溪镇' },
  { value: '430382101000', label: '银田镇' },
  { value: '430382102000', label: '韶山乡' },
  { value: '430382103000', label: '杨林乡' },
];

/** 河流流经行政区多选：韶山市乡镇 + 省内关联市县级（与台账区划码展示规则一致） */
const RIVER_FLOW_AREA_EXTRA_ADDVCD: { value: string; label: string }[] = [
  { value: '430100000000', label: '长沙市（市本级）' },
  { value: '430104000000', label: '长沙市 · 岳麓区' },
  { value: '430181000000', label: '长沙市 · 浏阳市' },
  { value: '430121000000', label: '长沙市 · 长沙县' },
  { value: '430112000000', label: '长沙市 · 望城区' },
  { value: '430300000000', label: '湘潭市（市本级）' },
  { value: '430302000000', label: '湘潭市 · 雨湖区' },
  { value: '430304000000', label: '湘潭市 · 岳塘区' },
  { value: '430321000000', label: '湘潭市 · 湘潭县' },
  { value: '430381000000', label: '湘潭市 · 湘乡市' },
  { value: '430200000000', label: '株洲市（市本级）' },
];

export const RIVER_FLOW_AREA_ADDVCD_OPTIONS: { value: string; label: string }[] = (() => {
  const m = new Map<string, string>();
  for (const o of SHAOSHAN_ADDVCD_OPTIONS) m.set(o.value, o.label);
  for (const o of RIVER_FLOW_AREA_EXTRA_ADDVCD) m.set(o.value, o.label);
  return Array.from(m.entries()).map(([value, label]) => ({ value, label }));
})();

export function getShaoshanAddvcdLabel(code: string | undefined | null): string {
  if (!code?.trim()) return '—';
  const c = code.trim();
  const hit = SHAOSHAN_ADDVCD_OPTIONS.find(o => o.value === c);
  if (hit) return hit.label;
  const path = findShaoshanAdminDivisionTitlePath(SHAOSHAN_ADMIN_TREE_TO_VILLAGE, c);
  if (path.length) return path.join(' / ');
  // 原型中与河湖台账共用的湖南省内其它区县编码：界面只展示名称，不展示数字区划码
  if (c.startsWith('430104')) return '长沙市 · 岳麓区';
  if (c.startsWith('430181')) return '长沙市 · 浏阳市';
  if (c.startsWith('430121')) return '长沙市 · 长沙县';
  if (c.startsWith('430112')) return '长沙市 · 望城区';
  if (c.startsWith('430100')) return '长沙市（市本级）';
  if (c.startsWith('430381')) return '湘潭市 · 湘乡市';
  if (c.startsWith('430321')) return '湘潭市 · 湘潭县';
  if (c.startsWith('430302')) return '湘潭市 · 雨湖区';
  if (c.startsWith('430304')) return '湘潭市 · 岳塘区';
  // 其它纯数字区划码：不直接展示编码
  if (/^\d{6,12}$/.test(c)) return '台账区划';
  return c;
}

/** 将 FLOW_AREA 字符串解析为多选区划码（逗号/中文逗号/分号分隔；须为 6～12 位数字段） */
export function parseRiverFlowAreaCodes(raw: string | undefined | null): string[] {
  const s = (raw ?? '').trim();
  if (!s) return [];
  if (/^\d{6,12}$/.test(s)) return [s];
  const parts = s.split(/[,，;；\s]+/).map(x => x.trim()).filter(Boolean);
  if (!parts.length) return [];
  const allNumeric = parts.every(p => /^\d{6,12}$/.test(p));
  return allNumeric ? parts : [];
}

/** 列表/详情：区划码转中文名称串联；无法解析时回退原文 */
export function formatRiverFlowAreaCodesDisplay(raw: string | undefined | null): string {
  const codes = parseRiverFlowAreaCodes(raw);
  if (codes.length) return codes.map(c => getShaoshanAddvcdLabel(c)).join('、');
  const t = (raw ?? '').trim();
  return t || '—';
}

/** 由乡镇名称反查韶山市原型区划编码（应急事件等历史字段兼容） */
export function inferShaoshanAddvcdFromTownLabel(label: string | undefined | null): string {
  const t = (label ?? '').trim();
  if (!t) return '';
  const hit = SHAOSHAN_ADDVCD_OPTIONS.find(o => o.label === t);
  return hit?.value ?? '';
}

/** 下拉选项：含台账中不在清单内的历史区划编码 */
export function shaoshanAddvcdSelectOptionsWithLegacy(legacyCode: string | undefined | null): {
  value: string;
  label: string;
}[] {
  const cur = (legacyCode ?? '').trim();
  if (!cur || SHAOSHAN_ADDVCD_OPTIONS.some(o => o.value === cur)) {
    return SHAOSHAN_ADDVCD_OPTIONS;
  }
  const disp = formatShaoshanAdminDivisionDisplay(cur);
  const optHit = SHAOSHAN_ADDVCD_OPTIONS.find(o => o.value === cur);
  const label = optHit?.label ?? (disp !== cur ? disp : '台账保留区划');
  return [...SHAOSHAN_ADDVCD_OPTIONS, { value: cur, label }];
}

/** 河湖管护事务处置信息（规范中处置过程类字段，原型嵌套） */
export interface RiverGuardAffairDisposal {
  /** 处置负责人 */
  disposalLeader: string;
  contactPhone: string;
  disposalDescribe: string;
  completedTime: string;
  images: string[];
}

/**
 * 河湖管护事务台账（字段参考 DB4401/T 138—2021 上报事件表扩展）。
 * 原型「基本信息」表单顺序（纵向布局 + 栅格，与应急协同应急事件编辑一致）：事务编号（只读）与事务名称同一行 → 关联责任段 → **所属区划**（`addvcd`，下拉展示名称）→ 问题类型 → **信息来源与严重程度**（同一行）→ **责任主体与责任人**（同一行）→ 位置与地图经纬度（台账可保留 `deadline`，编辑表单不维护）
 * → **上报信息**（两行：上报人/联系电话、发现时间/上报时间）→ 问题描述与影响范围 → 现场照片与本地上传视频（无「分级与责任」等分隔标题）。台账仍保留 `situationDescribe` 等历史字段（编辑表单不展示）；`regionName` 可由所属区划选择结果同步。**处理状态、办结日期**及处置过程见「事务处置」Tab。
 */
export interface RiverGuardAffairRow {
  key: string;
  /** 事务编号 */
  affairCode: string;
  /** 事务名称 */
  affairTitle: string;
  /** 事务发起时间 */
  initiateTime: string;
  /** 发起主体（单位/个人/平台等） */
  initiateSubject: string;
  /** 交办单位 */
  assignOrg: string;
  /** 承办单位 */
  undertakeOrg: string;
  /** 问题描述（概要，可与情况描述并存） */
  problemDescribe: string;
  /** 现场照片（登记阶段，原型多为 data URL） */
  scenePhotos: string[];
  /** 视频链接列表 */
  sceneVideos: string[];
  /** 关联责任段河段编码，可空 */
  sectionId: string;
  problemType: string;
  infoSource: string;
  /** 发现时间 */
  discoverTime: string;
  /** 上报时间 */
  reportTime: string;
  /** 要求完成时间 */
  deadline: string;
  addvcd: string;
  regionName: string;
  location: string;
  longitude: string;
  latitude: string;
  situationDescribe: string;
  impactScope: string;
  severity: string;
  reporterName: string;
  reporterPhone: string;
  handleStatus: string;
  responsibleOrg: string;
  leaderName: string;
  /** 是否先行处置 */
  preemptDisposal: string;
  disposalProgress: string;
  /** 处理措施 */
  measuresTaken: string;
  /** 处理过程 */
  handlingProcess: string;
  /** 联动部门或单位 */
  coordParties: string;
  /** 处理结果 */
  disposalResult: string;
  /** 反馈意见（上级、群众或平台回访等） */
  feedbackComment: string;
  /** 办结日期 */
  finishDate: string;
  disposal: RiverGuardAffairDisposal;
}

/** 河湖管护事务初始台账：韶山市域场景，责任段编码与 `initialRiverSectionData` 中 SS430382* 一致 */
export const initialRiverGuardAffairs: RiverGuardAffairRow[] = [
  {
    key: 'aff-1',
    affairCode: 'HB-SW-2025-0301',
    affairTitle: '韶河清溪段堤脚临时堆放建筑砖渣',
    initiateTime: '2025-05-06 08:40',
    initiateSubject: '清溪镇村级河长',
    assignOrg: '韶山市河长办',
    undertakeOrg: '清溪镇综合执法办',
    problemDescribe: '清溪路桥下游右岸闲置平台堆放砖渣、编织袋约 25㎡，距常水位岸线不足 10m，降雨易冲刷入韶河。',
    scenePhotos: [],
    sceneVideos: [],
    sectionId: 'SS430382000001-01001R',
    problemType: '建筑废弃物',
    infoSource: '巡河台账',
    discoverTime: '2025-05-06 08:45',
    reportTime: '2025-05-06 09:30',
    deadline: '2025-05-18',
    addvcd: '430382100000',
    regionName: '清溪镇',
    location: '湖南省湘潭市韶山市清溪镇韶河右岸（清溪路桥下游堤脚平台）',
    longitude: '112.528600',
    latitude: '27.912400',
    situationDescribe: '镇级河长晨巡发现；与「项目档案」缓冲带示范段相邻，已通知施工单位加强围挡巡查。',
    impactScope: '清溪段右岸约 200m 岸线感官与近岸底泥扰动风险',
    severity: '较重',
    reporterName: '李秀英',
    reporterPhone: '139****0202',
    handleStatus: '处置中',
    responsibleOrg: '清溪镇综合执法办、镇河长办',
    leaderName: '镇分管副镇长',
    preemptDisposal: '是',
    disposalProgress: '已约谈堆料当事人并覆盖防尘网，清运车辆已进场',
    measuresTaken: '现场取证、整改通知书、网格员每日两次巡查打卡',
    handlingProcess: '巡河上报→综合执法现场勘验→责令限时清运→镇河长办复核销号（进行中）。',
    coordParties: '韶山市水利局河长科',
    disposalResult: '',
    feedbackComment: '',
    finishDate: '',
    disposal: {
      disposalLeader: '清溪镇综合执法办联络员',
      contactPhone: '0731-5568****',
      disposalDescribe: '清运完成后拍摄岸坡全景照片并上传河长制信息系统',
      completedTime: '',
      images: [],
    },
  },
  {
    key: 'aff-2',
    affairCode: 'HB-SW-2025-0302',
    affairTitle: '银田高新区雨水排口强降雨时浑浊冒溢',
    initiateTime: '2025-06-18 14:10',
    initiateSubject: '12345政务服务便民热线',
    assignOrg: '韶山市住建局',
    undertakeOrg: '高新区管委会建设科',
    problemDescribe: '银田镇工业园片区雨水排口在暴雨时排出灰黄色水体伴轻微异味，群众怀疑初期雨水收集设施未有效运行。',
    scenePhotos: [],
    sceneVideos: [],
    sectionId: 'SS430382000002-02002A',
    problemType: '排水设施',
    infoSource: '电话举报',
    discoverTime: '2025-06-18 14:25',
    reportTime: '2025-06-18 16:00',
    deadline: '2025-07-05',
    addvcd: '430382101000',
    regionName: '银田镇',
    location: '湖南省湘潭市韶山市银田镇高新区工业园雨水管网末端排口（近调蓄池泵站）',
    longitude: '112.546200',
    latitude: '27.920800',
    situationDescribe: '热线登记与「项目档案」银田雨水调蓄工程位置一致，便于联合排查错接、淤积及调度逻辑。',
    impactScope: '韶河银田段汇口上游约 800m 水面',
    severity: '紧急',
    reporterName: '匿名（热线）',
    reporterPhone: '12345-430382',
    handleStatus: '待验收',
    responsibleOrg: '高新区管委会建设科、银田镇河长办',
    leaderName: '排水设施运维专班负责人',
    preemptDisposal: '否',
    disposalProgress: '已完成排口 CCTV 与调蓄池联调，错接支管 1 处已切改，正组织雨后复测',
    measuresTaken: '临时水质快检、泵站运行记录调取、排口「一口一档」信息更新',
    handlingProcess: '市热线转办→住建牵头现场排查→CCTV 定位→错接整改→雨后加密监测→联合验收准备。',
    coordParties: '湘潭市生态环境局韶山分局',
    disposalResult: '待联合验收通过后向社会公示整改摘要',
    feedbackComment: '举报人希望公示快检结果区间（待验收后统一答复）。',
    finishDate: '',
    disposal: {
      disposalLeader: '高新区建设科现场负责人',
      contactPhone: '0731-5570****',
      disposalDescribe: '验收需市住建、生态环境分局、镇河长办三方签字',
      completedTime: '2025-06-28 11:20',
      images: [],
    },
  },
  {
    key: 'aff-3',
    affairCode: 'HB-SW-2025-0303',
    affairTitle: '韶山灌区总干渠渠堤外畜禽散养粪便堆积',
    initiateTime: '2025-07-02 10:05',
    initiateSubject: '韶山乡农业农村办',
    assignOrg: '',
    undertakeOrg: '韶山乡综合执法队',
    problemDescribe: '总干渠左岸管护范围外缘约 15m 处堆放鸡粪、垫料约 2m³，雨后径流可能入渠影响水质。',
    scenePhotos: [],
    sceneVideos: [],
    sectionId: 'SS430382000003-03003L',
    problemType: '养殖污染',
    infoSource: '部门移送',
    discoverTime: '2025-07-02 10:15',
    reportTime: '2025-07-02 11:40',
    deadline: '2025-07-20',
    addvcd: '430382102000',
    regionName: '韶山乡',
    location: '湖南省湘潭市韶山市韶山乡韶山灌区总干渠节制闸下游左岸巡渠路外侧',
    longitude: '112.524800',
    latitude: '27.950200',
    situationDescribe: '乡级田长制与河长办联合巡查移送；与青年水库汇水区面源防控示范片可联动销号。',
    impactScope: '节制闸下游 1km 渠段及邻近农沟',
    severity: '一般',
    reporterName: '周文',
    reporterPhone: '137****0908',
    handleStatus: '待分派',
    responsibleOrg: '韶山乡人民政府',
    leaderName: '乡农业综合服务中心主任',
    preemptDisposal: '是',
    disposalProgress: '已通知养殖户自行清运，待乡执法队现场复核',
    measuresTaken: '现场宣教、发放整改告知、纳入下周联合巡查清单',
    handlingProcess: '部门移送→乡河长办登记→综合执法约谈→限期清运→渠首水质关注。',
    coordParties: '韶山市农业农村局',
    disposalResult: '',
    feedbackComment: '',
    finishDate: '',
    disposal: {
      disposalLeader: '韶山乡综合执法队副队长',
      contactPhone: '0731-5588****',
      disposalDescribe: '清运后取样快检氨氮、总磷并上传台账附件',
      completedTime: '',
      images: [],
    },
  },
  {
    key: 'aff-4',
    affairCode: 'HB-SW-2025-0304',
    affairTitle: '杨林河示范段沟渠漂浮物聚集影响观感',
    initiateTime: '2025-08-11 07:50',
    initiateSubject: '杨林乡保洁公司',
    assignOrg: '',
    undertakeOrg: '杨林乡河长办',
    problemDescribe: '杨林桥下游支沟汇入口漂浮枯枝、塑料袋成片，雨后滞留明显，影响小微水体示范片考核观感。',
    scenePhotos: [],
    sceneVideos: [],
    sectionId: 'SS430382000004-04004A',
    problemType: '生活垃圾',
    infoSource: '网络及热线',
    discoverTime: '2025-08-11 08:00',
    reportTime: '2025-08-11 09:10',
    deadline: '2025-08-25',
    addvcd: '430382103000',
    regionName: '杨林乡',
    location: '湖南省湘潭市韶山市杨林乡杨林河汇入韶河口上游约 300m 右岸支沟',
    longitude: '112.602000',
    latitude: '27.906500',
    situationDescribe: '保洁单位早班上报并附手机照片；与「项目档案」支流清淤工程台账可关联销号。',
    impactScope: '杨林河示范段汇流区约 500m',
    severity: '一般',
    reporterName: '王磊',
    reporterPhone: '136****0707',
    handleStatus: '处置中',
    responsibleOrg: '杨林乡河长办、乡环卫所',
    leaderName: '乡河长办专职副主任',
    preemptDisposal: '是',
    disposalProgress: '已组织人工打捞与拦污栅清理，计划 3 日内完成一遍全线',
    measuresTaken: '增设临时拦漂网、加密巡河频次、问题点位 GIS 标注',
    handlingProcess: '保洁发现→乡河长办派单→环卫打捞→乡级复核拍照→台账更新。',
    coordParties: '韶山市水利局（技术指导）',
    disposalResult: '',
    feedbackComment: '',
    finishDate: '',
    disposal: {
      disposalLeader: '杨林乡环卫所所长',
      contactPhone: '0731-5599****',
      disposalDescribe: '完成后提交前后对比照片至市河长制信息系统',
      completedTime: '',
      images: [],
    },
  },
  {
    key: 'aff-5',
    affairCode: 'HB-SW-2025-0305',
    affairTitle: '韶山乡小微水体示范片生态塘出口短时浑浊',
    initiateTime: '2025-09-03 16:20',
    initiateSubject: '湘潭市河长制管理信息系统',
    assignOrg: '湘潭市河长办',
    undertakeOrg: '韶山乡生态环境办',
    problemDescribe: '暴雨后生态塘出口监测点浊度升高、水面浮沫，持续约 6 小时，需核查格栅与人工湿地是否堵塞。',
    scenePhotos: [],
    sceneVideos: [],
    sectionId: 'SS430382000006-06006A',
    problemType: '水质异常',
    infoSource: '上级交办',
    discoverTime: '2025-09-03 16:30',
    reportTime: '2025-09-03 17:45',
    deadline: '2025-09-15',
    addvcd: '430382102000',
    regionName: '韶山乡',
    location: '湖南省湘潭市韶山市韶山乡联村整治示范片生态塘出口节制堰下游',
    longitude: '112.585000',
    latitude: '27.955000',
    situationDescribe: '市级系统下发预警工单；现场复核为暴雨面源冲击，设施运行正常，已加强格栅清掏频次。',
    impactScope: '示范片内串联塘坝及下游农沟约 1.2km',
    severity: '较重',
    reporterName: '赵敏',
    reporterPhone: '137****0315',
    handleStatus: '已办结',
    responsibleOrg: '韶山乡生态环境办、乡水利服务站',
    leaderName: '乡分管负责人',
    preemptDisposal: '否',
    disposalProgress: '格栅清掏、人工湿地表层冲洗完成，复测浊度恢复至基线',
    measuresTaken: '加密人工取样、运行台账核对、向市级平台反馈处置链路',
    handlingProcess: '上级交办→乡办现场核查→设施维护→复测达标→平台闭环。',
    coordParties: '韶山市生态环境分局',
    disposalResult: '结论为暴雨冲击可解释性浑浊，设施无故障，已结案',
    feedbackComment: '市河长办：同意结案，建议汛期前再开展一次联合演练。',
    finishDate: '2025-09-10',
    disposal: {
      disposalLeader: '韶山乡生态环境办主任',
      contactPhone: '0731-5577****',
      disposalDescribe: '结案附件含快测记录与现场照片编号清单',
      completedTime: '2025-09-10 15:00',
      images: [],
    },
  },
  /** 演示：disposal 全空 → 列表「处置填报」 */
  {
    key: 'aff-6',
    affairCode: 'HB-SW-2026-0428',
    affairTitle: '清溪镇韶河岸线疑似违规堆放建筑材料（待核查）',
    initiateTime: '2026-04-28 08:50',
    initiateSubject: '镇村级河长巡河',
    assignOrg: '韶山市河长办',
    undertakeOrg: '清溪镇综合执法办',
    problemDescribe: '巡河发现岸线可视范围内堆放砖块与脚手架管材约 15㎡，权属与审批手续待查（演示：事务处置 Tab 嵌套字段未填）。',
    scenePhotos: [],
    sceneVideos: [],
    sectionId: 'SS430382000001-01001R',
    problemType: '建筑废弃物',
    infoSource: '巡河台账',
    discoverTime: '2026-04-28 09:00',
    reportTime: '2026-04-28 09:30',
    deadline: '2026-05-15',
    addvcd: '430382100000',
    regionName: '清溪镇',
    location: '湖南省湘潭市韶山市清溪镇韶河右岸堤顶道路下游侧空地',
    longitude: '112.541000',
    latitude: '27.918500',
    situationDescribe: '现场已拍照定位；当事人联系方式尚未录入系统。',
    impactScope: '岸线可视范围约 30m 段落',
    severity: '一般',
    reporterName: '村级河长联络员',
    reporterPhone: '138****0428',
    handleStatus: '待分派',
    responsibleOrg: '清溪镇综合执法办（拟牵头）',
    leaderName: '',
    preemptDisposal: '否',
    disposalProgress: '工单已生成，承办人尚未派发。',
    measuresTaken: '现场竖立温馨提示牌；责令暂停继续堆放。',
    handlingProcess: '',
    coordParties: '',
    disposalResult: '',
    feedbackComment: '',
    finishDate: '',
    disposal: {
      disposalLeader: '',
      contactPhone: '',
      disposalDescribe: '',
      completedTime: '',
      images: [],
    },
  },
];

/** 河长责任区域台账（与生态整治「河长责任区域」页初始数据同源） */
export interface ChiefAreaRow {
  key: string;
  /** 用户自定义的责任区域名称（列表首列） */
  responsibilityAreaName: string;
  /** 河长名称 */
  chiefName: string;
  /** 已选责任段 key 列表（与韶山河段选择器 ss-* 一致） */
  sectionKeys: string[];
  /** 责任区域范围描述 */
  scopeDesc: string;
  /** 管护重点 */
  focusPoints: string;
}

export const initialChiefAreaData: ChiefAreaRow[] = [
  {
    key: '1',
    responsibilityAreaName: '清溪镇韶河重点管护片',
    chiefName: '张伟',
    sectionKeys: ['ss-1', 'ss-3'],
    scopeDesc: '清溪镇辖内韶河干流及支汊岸线，含青年水库汇水区岸线重点段。',
    focusPoints: '水源地岸线管护、入河排污口巡查、岸线生态整治。',
  },
  {
    key: '2',
    responsibilityAreaName: '银田镇城区河段责任区',
    chiefName: '李强',
    sectionKeys: ['ss-2'],
    scopeDesc: '银田镇辖内韶河河段及两岸蓝线范围，衔接上下游断面考核。',
    focusPoints: '雨污分流与溢流控制、河道保洁与生态流量保障。',
  },
  {
    key: '3',
    responsibilityAreaName: '杨林乡示范河湖片',
    chiefName: '刘芳',
    sectionKeys: ['ss-4'],
    scopeDesc: '杨林乡示范河段及小微水体连片整治区。',
    focusPoints: '农业面源管控、生态缓冲带管护、涉河项目合规检查。',
  },
  {
    key: '4',
    responsibilityAreaName: '如意镇小微水体示范片',
    chiefName: '王明',
    sectionKeys: ['ss-5', 'ss-6'],
    scopeDesc: '如意镇片区连通渠及小微水体示范片。',
    focusPoints: '农村污水收集、漂浮物清理、堤防与穿堤建筑物安全。',
  },
];
