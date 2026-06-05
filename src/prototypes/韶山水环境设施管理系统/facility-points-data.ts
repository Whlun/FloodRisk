/**
 * 设施管理 · 地图点位台账（泵站 / 排口 / 污水厂）
 * 与 `index.tsx` 列表同源，供地图与列表共用，避免坐标漂移。
 *
 * 排口字段对齐《入河入海排污口监督管理技术指南 信息采集与交换》（HJ 1314—2023）附录 **表 A.1 入河（海）排污口台账信息**；
 * 数据项中文名与行业源数据字典表一致，**界面与表格列标题不使用英文字段名**。
 */

import {
  ADM_DEP_OPTIONS,
  ENG_GRAD_OPTIONS,
  ENG_SCAL_OPTIONS,
  ENG_STAT_OPTIONS,
  MAIN_BUILD_GRAD_OPTIONS,
  watershedInitial,
} from '../韶山水环境系统管理/config-center-data';
import type { PumpArchiveDocument } from './pump-station-documents';
import type { PlantArchiveDocument } from './plant-station-documents';

/** 入河入海排污口一级分类（两位码） */
export const OUTLET_LEVEL1_LABEL: Record<string, string> = {
  '01': '工业排污口',
  '02': '城镇污水处理厂排污口',
  '03': '农业排口',
  '04': '其他排口',
};

/** 入河入海排污口二级分类（两位码） */
export const OUTLET_LEVEL2_LABEL: Record<string, string> = {
  '01': '工矿企业排污口',
  '02': '工矿企业雨洪排口',
  '03': '工业及其他各类园区污水处理厂排污口',
  '04': '工业及其他各类园区污水处理厂雨洪排口',
  '05': '城镇污水处理厂排污口',
  '06': '规模化畜禽养殖排污口',
  '07': '规模化水产养殖排污口',
  '08': '大中型灌区排口',
  '09': '港口码头排口',
  '10': '规模以下畜禽养殖排污口',
  '11': '规模以下水产养殖排污口',
  '12': '城镇生活污水散排口',
  '13': '农村污水处理设施排污口',
  '14': '农村生活污水散排口',
  '15': '城镇雨洪排口',
  '16': '其他排污口',
};

/** 审批登记备案情况 */
export const OUTLET_APPROVAL_REG_LABEL: Record<string, string> = {
  '01': '已审批',
  '02': '已登记',
  '03': '已备案',
  '04': '未经审批、登记或备案',
};

/** HJ 1314 表 A.1「所在流域海域」两位行业码（遗留数据展示兼容；表单选项以系统管理流域台账 basCode 为主） */
export const OUTLET_BASIN_SEA_LABEL: Record<string, string> = {
  '01': '长江流域',
  '02': '黄河流域',
  '03': '淮河流域',
  '04': '海河流域',
  '05': '松花江流域',
  '06': '辽河流域',
  '07': '太湖流域',
  '08': '珠江流域',
  '09': '东南诸河',
  '10': '西南诸河',
  '11': '西北诸河',
  '12': '渤海',
  '13': '黄海',
  '14': '东海',
  '15': '南海',
};

/** 是否位于饮用水源保护区内 */
export const OUTLET_DRINKING_SOURCE_ZONE_LABEL: Record<string, string> = {
  '01': '一级保护区',
  '02': '二级保护区',
  '03': '非保护区',
};

/** 来水通道 */
export const OUTLET_INFLOW_CHANNEL_LABEL: Record<string, string> = {
  '01': '位于地上',
  '02': '位于地下',
  '03': '混合式',
};

/** 排放方式 */
export const OUTLET_DISCHARGE_MODE_LABEL: Record<string, string> = {
  '01': '连续',
  '02': '间歇',
  '03': '其他',
};

/** 排放状态（设施运行监管演示扩展；存中文枚举值） */
export const OUTLET_EMISSION_STATE_OPTIONS = [
  { value: '正常排放', label: '正常排放' },
  { value: '超标排放', label: '超标排放' },
  { value: '停止排放', label: '停止排放' },
  { value: '溢流放排', label: '溢流放排' },
] as const;

export function formatOutletEmissionState(v: unknown): string {
  const s = String(v ?? '').trim();
  if (!s) return '—';
  const hit = OUTLET_EMISSION_STATE_OPTIONS.find(o => o.value === s);
  return hit?.label ?? s;
}

/** 口门形态 */
export const OUTLET_GATE_FORM_LABEL: Record<string, string> = {
  '01': '明渠',
  '02': '管道',
  '03': '泵站',
  '04': '涵闸',
  '05': '闸泵联用',
  '06': '箱涵',
  '07': '隧洞',
  '08': '潜没',
  '09': '其他',
};

function formatCodeMap(v: string | number | undefined | null, map: Record<string, string>): string {
  if (v === '' || v == null) return '—';
  const k = String(v).trim();
  return map[k] ?? k;
}

export function formatOutletLevel1(v: string | number | undefined | null): string {
  return formatCodeMap(v, OUTLET_LEVEL1_LABEL);
}

export function formatOutletLevel2(v: string | number | undefined | null): string {
  return formatCodeMap(v, OUTLET_LEVEL2_LABEL);
}

export function formatOutletApprovalReg(v: string | number | undefined | null): string {
  return formatCodeMap(v, OUTLET_APPROVAL_REG_LABEL);
}

/** 排口「所在流域海域」：优先按系统管理流域 basCode 展示；否则回退表 A.1 行业码 */
export function formatOutletBasinSea(v: string | number | undefined | null): string {
  if (v === '' || v == null) return '—';
  const k = String(v).trim();
  const hit = watershedInitial.find((r) => r.basCode === k);
  if (hit) return `${hit.basCode} ${hit.basName}`;
  return formatCodeMap(k, OUTLET_BASIN_SEA_LABEL);
}

/**
 * 泵站 BAS_CODE / 所在流域代码：与系统管理 · 流域信息 `watershedInitial` 同源展示「代码 + 名称」；
 * 接口仅回传 basCode 时由前端解析；未知码原样回显便于排查。
 */
export function formatPumpBasCodeDisplay(v: string | number | undefined | null): string {
  if (v === '' || v == null) return '—';
  const k = String(v).trim();
  if (!k) return '—';
  const hit = watershedInitial.find((r) => r.basCode === k);
  if (hit) return `${hit.basCode} ${hit.basName}`;
  return k;
}

export function formatOutletDrinkingSourceZone(v: string | number | undefined | null): string {
  return formatCodeMap(v, OUTLET_DRINKING_SOURCE_ZONE_LABEL);
}

export function formatOutletInflowChannel(v: string | number | undefined | null): string {
  return formatCodeMap(v, OUTLET_INFLOW_CHANNEL_LABEL);
}

export function formatOutletDischargeMode(v: string | number | undefined | null): string {
  return formatCodeMap(v, OUTLET_DISCHARGE_MODE_LABEL);
}

export function formatOutletGateForm(v: string | number | undefined | null): string {
  return formatCodeMap(v, OUTLET_GATE_FORM_LABEL);
}

/** 是否类：实验室检测 / 自动监测站等 */
export function formatOutletYesNo(v: string | number | undefined | null): string {
  if (v === '' || v == null) return '—';
  const s = String(v).trim().toUpperCase();
  if (s === 'Y' || s === '1' || s === '是') return '是';
  if (s === 'N' || s === '0' || s === '否') return '否';
  return String(v);
}

/** 重点排口：0—否，1—是 */
export function formatOutletKeyOutfall(v: unknown): string {
  if (v === 1 || v === '1') return '1—是';
  if (v === 0 || v === '0') return '0—否';
  return '—';
}

// ——— 泵站 SL/T 809—2021 表 7.13 泵站基础信息表（ATT_PUST_BASE，行业库常见逻辑名 sl_att_pust_base）———

function pustPickOptLabel(opts: { value: string; label: string }[], v: string | number | undefined | null): string {
  const k = String(v ?? '').trim();
  const hit = opts.find((o) => o.value === k);
  return hit?.label ?? (k ? k : '—');
}

/** PUST_TYPE 泵站类型（码表按 SL/T 809 表 7.13 常用取值裁剪，与标准代码表一致时可替换） */
export const PUST_TYPE_OPTIONS = [
  { value: '1', label: '灌溉泵站' },
  { value: '2', label: '排水泵站' },
  { value: '3', label: '供（取）水泵站' },
  { value: '4', label: '供排结合泵站' },
  { value: '9', label: '其他' },
];

export function pustTypeLabel(v: string | number | undefined | null): string {
  const k = String(v ?? '').trim();
  const hit = PUST_TYPE_OPTIONS.find((o) => o.value === k);
  return hit?.label ?? (k ? k : '—');
}

export function pustEngGradLabel(v: string | number | undefined | null): string {
  return pustPickOptLabel(ENG_GRAD_OPTIONS, v);
}

export function pustEngScalLabel(v: string | number | undefined | null): string {
  return pustPickOptLabel(ENG_SCAL_OPTIONS, v);
}

export function pustMainBuildGradLabel(v: string | number | undefined | null): string {
  return pustPickOptLabel(MAIN_BUILD_GRAD_OPTIONS, v);
}

/** ENG_STAT 工程建设情况（表 16：0 在建、1 已建） */
export function pustEngStatLabel(v: string | number | undefined | null): string {
  return pustPickOptLabel(ENG_STAT_OPTIONS, v);
}

export function pustAdmDepLabel(v: string | number | undefined | null): string {
  return pustPickOptLabel(ADM_DEP_OPTIONS, v);
}

/**
 * 泵站台账（SL/T 809—2021 表 7.13）
 * 经度、纬度存度，与地图一致；原型演示按 WGS84 与 CGCS2000 数值同形存储。
 * 界面与表格列标题不出现英文字段名；类型属性名仅用于代码，不对用户展示。
 */
export type PumpStationRecord = {
  /** 原型主键（与综合态势、名录衔接） */
  id: string;
  /** PUST_CODE 泵站代码 */
  pustCode: string;
  /** PUST_NAME 泵站名称 */
  pustName: string;
  /** PUST_LOC 泵站所在位置 */
  pustLoc: string;
  /** LONGITUDE 经度（度） */
  x: number;
  /** LATITUDE 纬度（度） */
  y: number;
  /** ENG_GRAD 工程等别 */
  engGrad?: string;
  /** ENG_SCAL 工程规模 */
  engScal?: string;
  /** MAIN_BUILD_GRAD 主要建筑物级别 */
  mainBuildGrad?: string;
  /** DES_HEAD 设计扬程（米） */
  desHead?: number;
  /** DES_FLOW 设计流量（立方米每秒） */
  desFlow?: number;
  /** INST_CAP 装机容量（千瓦） */
  instCap?: number;
  /** PUMP_NUM 水泵台数 */
  pumpNum: number;
  /** PUST_TYPE 泵站类型 */
  pustType: string;
  /** ADM_DEP 归口管理部门 */
  admDep?: string;
  /** ENG_STAT 工程建设情况（0 在建、1 已建） */
  engStat: string;
  /** START_DATE 开工时间 */
  startDate?: string;
  /** COMP_DATE 建成（竣工）时间 */
  compDate?: string;
  /** NOTE 备注 */
  note?: string;
  /** BAS_CODE 所在流域代码（可选） */
  basCode?: string;
  /** 演示扩展：所属区划（乡镇） */
  region?: string;
  /** 泵站电子档案：设计图纸、设备清单、安装验收、运维记录、检测报告、安全评估报告等（与「泵站资料」页签同源，原型不落盘） */
  documents?: PumpArchiveDocument[];
};

/**
 * 排口台账：HJ 1314—2023 表 A.1 入河（海）排污口台账信息（字段名为标准中文名称，便于表单与表格 dataIndex 一致）
 */
export type OutletRecord = {
  入河入海排污口名称: string;
  入河入海排污口编码: string;
  入河入海排污口一级分类: string;
  入河入海排污口二级分类: string;
  审批登记备案情况: string;
  所在行政区域: string;
  行政区划代码: string;
  入河入海排污口详细地址: string;
  入河入海排污口经度: number;
  入河入海排污口纬度: number;
  排污水系: string;
  受纳水体: string;
  /** 流域单元 basCode，与系统管理 · 流域信息同源；兼容历史表 A.1 两位行业码 */
  所在流域海域: string;
  排入海湾名称?: string;
  控制单元?: string;
  对应国控断面?: string;
  对应国控断面水质目标?: string;
  排入水功能区名称?: string;
  排入水功能区水质目标?: string;
  排入近岸海域环境功能区名称?: string;
  排入近岸海域环境功能区水质目标?: string;
  是否位于饮用水源保护区内?: string;
  来水通道?: string;
  排污口材质?: string;
  排污口流量?: number;
  排污口口径?: string;
  排放方式?: string;
  口门形态?: string;
  排口照片?: string;
  周围环境?: string;
  周围环境照片?: string;
  /** 重点排口：0—否，1—是 */
  重点排口?: 0 | 1;
  /** 排放状态：正常排放 / 超标排放 / 停止排放 / 溢流放排（演示扩展） */
  排放状态?: string;
  创建时间?: string;
  更新时间?: string;
  /** 排口电子档案：设计图纸、设备清单、安装验收、运维记录、检测报告、安全评估报告等（与「排口资料」页签同源，结构与泵站资料一致，原型不落盘） */
  documents?: PumpArchiveDocument[];
};

/** 污水厂「关键处理设施」：名称、功能说明、厂区示意 WGS84 落点（与详情/表单地图同源） */
export type PlantKeyFacilityItem = {
  id: string;
  name: string;
  /** 功能与规格等说明 */
  functionDesc: string;
  lng: number;
  lat: number;
};

/** 表单保存时归一化关键设施行（过滤无效坐标） */
export function normalizePlantKeyFacilities(raw: unknown): PlantKeyFacilityItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row: Record<string, unknown>, i: number) => ({
      id: String(row?.id ?? `kf-${i}-${Date.now()}`),
      name: String(row?.name ?? '').trim() || `设施${i + 1}`,
      functionDesc: String(row?.functionDesc ?? '').trim() || '—',
      lng: Number(row?.lng),
      lat: Number(row?.lat),
    }))
    .filter(r => Number.isFinite(r.lng) && Number.isFinite(r.lat));
}

/** 新增污水厂时默认关键设施（围绕厂中心环形示意落点） */
export function createDefaultPlantKeyFacilities(centerLng: number, centerLat: number): PlantKeyFacilityItem[] {
  const cx = Number(centerLng);
  const cy = Number(centerLat);
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
    return createDefaultPlantKeyFacilities(112.528, 27.908);
  }
  const defs: Omit<PlantKeyFacilityItem, 'id' | 'lng' | 'lat'>[] = [
    { name: '粗格栅', functionDesc: 'GSHZ-1200 / 栅隙20mm' },
    { name: '细格栅', functionDesc: 'GSHZ-800 / 栅隙5mm' },
    { name: '曝气沉砂池', functionDesc: '曝气沉砂工艺段 / 容积约 2000 立方米' },
    { name: '厌氧缺氧好氧生化池', functionDesc: '厌氧缺氧好氧工艺段 / 容积约 5000 立方米' },
    { name: '二沉池', functionDesc: '二沉工艺段 / 容积约 3000 立方米' },
    { name: '紫外线消毒池', functionDesc: '紫外线消毒工艺段 / 约 500 立方米每小时' },
  ];
  const r = 0.00055;
  return defs.map((d, i) => {
    const ang = (i / defs.length) * Math.PI * 2;
    return {
      id: `kf-${i + 1}`,
      name: d.name,
      functionDesc: d.functionDesc,
      lng: cx + Math.cos(ang) * r,
      lat: cy + Math.sin(ang) * r,
    };
  });
}

/**
 * 污水处理厂台账（表 A.0.30 扩展数据口径；界面仅展示中文字段名）
 * 坐标 X/Y 为设施中心点经纬度（与地图一致）
 */
export type PlantRecord = {
  /** 污水处理厂标识码 */
  id: string;
  /** 排水系统编码 */
  systemId?: string;
  /** 坐标 X（经度） */
  x: number;
  /** 坐标 Y（纬度） */
  y: number;
  /** 污水处理设施类型：1—城镇；2—工业废水集中处理设施；3—其他 */
  facilityType?: number;
  /** 污水处理厂名称 */
  name: string;
  /** 污水处理厂地址 */
  addr: string;
  /** 建成日期 yyyy-MM-dd */
  completionDate?: string;
  /** 污水处理级别：1—一级；2—二级；3—三级 */
  treatmentLevel?: number;
  /** 年耗电量（万千瓦时） */
  annualPowerConsumption?: number;
  /** 污水处理方法：1—物理；2—化学；3—物化；4—生化；5—其他 */
  treatmentMethod?: number;
  /** 受纳水体编码 */
  receiveWaterBodyCode?: string;
  /** 关联排口：入河入海排污口编码，与 `outletData` 同源 */
  linkedOutletCode?: string;
  /** 污水设计处理规模（万立方米每日） */
  designCapa: number;
  /** 污水处理工艺 */
  sewageTreatmentProcess?: string;
  /** 污水运行负荷率（%） */
  sewageLoadRate?: number;
  /** 雨水设计处理规模（万立方米每日） */
  rainwaterDesignCapa?: number;
  /** 雨水处理工艺 */
  rainwaterTreatmentProcess?: string;
  /** 污泥设计处理规模（万吨每日） */
  sludgeDesignCapa?: number;
  /** 污泥运行负荷率（%） */
  sludgeLoadRate?: number;
  /** 污泥处理工艺 */
  sludgeTreatmentProcess?: string;
  /** 污泥处置方式：1—填埋；2—焚烧；3—土地利用；4—其他 */
  sludgeDisposalMethod?: number;
  /** 水泵台数 */
  pumpCount?: number;
  /** 数据来源：1—现场踏勘；2—竣工图；3—设计图；4—手工估算；5—其他 */
  dataSource?: number;
  /** 数据获取日期 yyyy-MM-dd */
  recordDate?: string;
  /** 填报单位 */
  reportUnit?: string;
  /** 填报日期 yyyy-MM-dd */
  reportDate?: string;
  /** 备注 */
  remark?: string;
  /** 所属区划（演示扩展，综合态势检索用） */
  region?: string;
  /** 运行状态（演示）：1 运行等 */
  status?: string;
  /** 关键处理设施：名称、功能、厂区示意经纬度（详情地图与新增/编辑表单共用） */
  关键处理设施列表?: PlantKeyFacilityItem[];
  /** 污水厂电子档案：设计、竣工、环保审批、监测、运维、安全等（与「污水厂资料」页签同源） */
  documents?: PlantArchiveDocument[];
};

export const pumpStationData: PumpStationRecord[] = [
  {
    id: 'PS202604010001',
    pustCode: '430382HP0132604010001',
    pustName: '清溪镇韶河北岸雨水泵站',
    pustLoc: '湖南省湘潭市韶山市清溪镇韶山北路与涟清路交口东北角',
    x: 112.5312,
    y: 27.9146,
    engGrad: '4',
    engScal: '4',
    mainBuildGrad: '4',
    desHead: 6.6,
    desFlow: 5.0,
    instCap: 220,
    pumpNum: 3,
    pustType: '2',
    admDep: '5',
    engStat: '1',
    startDate: '2015-02-18',
    compDate: '2016-08-30',
    note: '汛期与市防办联动调度。',
    basCode: '441900B01BS000001',
    region: '清溪镇',
    documents: [
      {
        id: 'pump-d-260401-1',
        name: '设计图纸',
        type: 'design',
        fileName: '韶河北岸雨水泵站施工图与竣工图.pdf',
        fileSize: '3.8MB',
        uploadTime: '2016-05-12',
        uploader: '市政设计院',
      },
      {
        id: 'pump-d-260401-2',
        name: '设备清单',
        type: 'equipment',
        fileName: '立式轴流泵及电控设备台账.xlsx',
        fileSize: '96.0KB',
        uploadTime: '2016-08-01',
        uploader: '设备部',
      },
      {
        id: 'pump-d-260401-3',
        name: '运维记录',
        type: 'operation',
        fileName: '2025汛前试车与日常巡检记录.pdf',
        fileSize: '0.4MB',
        uploadTime: '2025-04-18',
        uploader: '运维组',
      },
    ],
  },
  {
    id: 'PS202604010002',
    pustCode: '430382HP0132604010002',
    pustName: '银田镇经开区污水提升泵站',
    pustLoc: '湖南省湘潭市韶山市银田镇工业大道北段提升泵站',
    x: 112.5485,
    y: 27.9242,
    engGrad: '5',
    engScal: '5',
    mainBuildGrad: '5',
    desHead: 8.0,
    desFlow: 1.95,
    instCap: 115,
    pumpNum: 2,
    pustType: '2',
    admDep: '5',
    engStat: '1',
    startDate: '2016-04-10',
    compDate: '2017-10-22',
    note: '承担片区污水转输至市政管网。',
    basCode: '441900B01BS000002',
    region: '银田镇',
    documents: [
      {
        id: 'pump-d-260401-4',
        name: '检测报告',
        type: 'inspection',
        fileName: '泵房噪声与水体抽检_2026Q1.pdf',
        fileSize: '0.55MB',
        uploadTime: '2026-03-28',
        uploader: '检测单位',
      },
    ],
  },
  {
    id: 'PS202604010003',
    pustCode: '430382HP0132604010003',
    pustName: '韶山乡城乡一体排水提升泵站',
    pustLoc: '湖南省湘潭市韶山市韶山乡韶河路与景区联络线交口东南',
    x: 112.5262,
    y: 27.9095,
    engGrad: '4',
    engScal: '4',
    mainBuildGrad: '4',
    desHead: 7.8,
    desFlow: 4.6,
    instCap: 380,
    pumpNum: 4,
    pustType: '4',
    admDep: '5',
    engStat: '0',
    startDate: '2025-08-01',
    compDate: '',
    note: '改扩建施工期临时导流，计划 2026 年底通水。',
    basCode: '441900B01BS000001',
    region: '韶山乡',
  },
  {
    id: 'PS202604010004',
    pustCode: '430382HP0132604010004',
    pustName: '杨林乡南片排涝泵站',
    pustLoc: '湖南省湘潭市韶山市杨林乡南环路与撇洪渠交汇处以东',
    x: 112.5575,
    y: 27.9338,
    engGrad: '5',
    engScal: '5',
    mainBuildGrad: '5',
    desHead: 6.0,
    desFlow: 2.75,
    instCap: 145,
    pumpNum: 2,
    pustType: '2',
    admDep: '5',
    engStat: '1',
    startDate: '2019-01-08',
    compDate: '2020-06-15',
    note: '',
    basCode: '441900B01BS000002',
    region: '杨林乡',
  },
];

const outletBaseData: OutletRecord[] = [
  {
    入河入海排污口名称: '清溪镇韶河路北雨洪排口',
    入河入海排污口编码: 'AH43038226040101',
    入河入海排污口一级分类: '04',
    入河入海排污口二级分类: '15',
    审批登记备案情况: '02',
    所在行政区域: '湖南省湘潭市韶山市清溪镇',
    行政区划代码: '430382100000',
    入河入海排污口详细地址: '湖南省湘潭市韶山市清溪镇韶河路北段右岸市政雨水排放口',
    入河入海排污口经度: 112.5442,
    入河入海排污口纬度: 27.9195,
    排污水系: '湘江水系韶河流域',
    受纳水体: '韶河',
    所在流域海域: '441900B01BS000001',
    控制单元: '韶河韶山市控制单元',
    是否位于饮用水源保护区内: '03',
    来水通道: '01',
    排污口材质: '钢筋混凝土',
    排污口流量: 95,
    排污口口径: '管径 DN800',
    排放方式: '02',
    口门形态: '02',
    重点排口: 0,
    排放状态: '正常排放',
    创建时间: '2025-01-12',
    更新时间: '2026-04-20',
    documents: [
      {
        id: 'outlet-doc-26040101-a',
        name: '设计图纸',
        type: 'design',
        fileName: '雨洪排口汇水范围与平面示意.pdf',
        fileSize: '1.1 MB',
        uploadTime: '2026-01-15',
        uploader: '市政所',
      },
      {
        id: 'outlet-doc-26040101-b',
        name: '运维记录',
        type: 'operation',
        fileName: '2026年一季度巡查台账.xlsx',
        fileSize: '288.0 KB',
        uploadTime: '2026-04-01',
        uploader: '河长办',
      },
    ],
  },
  {
    入河入海排污口名称: '银田镇工业园污水排放口',
    入河入海排污口编码: 'AH43038226040102',
    入河入海排污口一级分类: '01',
    入河入海排污口二级分类: '01',
    审批登记备案情况: '01',
    所在行政区域: '湖南省湘潭市韶山市银田镇',
    行政区划代码: '430382101000',
    入河入海排污口详细地址: '湖南省湘潭市韶山市银田镇工业园污水管网末端入涟水支流',
    入河入海排污口经度: 112.5548,
    入河入海排污口纬度: 27.9275,
    排污水系: '涟水上游韶山支流',
    受纳水体: '涟水（韶山段）',
    所在流域海域: '441900B01BS000002',
    控制单元: '涟水韶山控制单元（示意）',
    来水通道: '02',
    排污口材质: '钢管',
    排污口流量: 72,
    排污口口径: '管径 DN600',
    排放方式: '01',
    口门形态: '02',
    重点排口: 1,
    排放状态: '超标排放',
    创建时间: '2025-03-08',
    更新时间: '2026-04-18',
  },
  {
    入河入海排污口名称: '韶山乡老街合流制溢流口',
    入河入海排污口编码: 'AH43038226040103',
    入河入海排污口一级分类: '04',
    入河入海排污口二级分类: '12',
    审批登记备案情况: '03',
    所在行政区域: '湖南省湘潭市韶山市韶山乡',
    行政区划代码: '430382102000',
    入河入海排污口详细地址: '湖南省湘潭市韶山市韶山乡老街片区合流制管网溢流口',
    入河入海排污口经度: 112.5346,
    入河入海排污口纬度: 27.9178,
    排污水系: '韶河流域',
    受纳水体: '韶河',
    所在流域海域: '441900B01BS000001',
    来水通道: '03',
    排污口材质: '砖混',
    排污口口径: '明渠宽约 1.2m',
    排放方式: '02',
    口门形态: '01',
    重点排口: 0,
    排放状态: '溢流放排',
    创建时间: '2025-02-20',
    更新时间: '2026-04-22',
  },
  {
    入河入海排污口名称: '清溪镇高新区污水厂尾水排放口',
    入河入海排污口编码: 'AH43038226040104',
    入河入海排污口一级分类: '02',
    入河入海排污口二级分类: '05',
    审批登记备案情况: '01',
    所在行政区域: '湖南省湘潭市韶山市清溪镇',
    行政区划代码: '430382100000',
    入河入海排污口详细地址: '湖南省湘潭市韶山市清溪镇高新区污水处理厂尾水入韶河',
    入河入海排污口经度: 112.5295,
    入河入海排污口纬度: 27.9112,
    排污水系: '韶河流域',
    受纳水体: '韶河',
    所在流域海域: '441900B01BS000001',
    排污口材质: '钢筋混凝土',
    排污口流量: 3850,
    排污口口径: '管径 DN1200',
    排放方式: '01',
    口门形态: '02',
    重点排口: 1,
    排放状态: '停止排放',
    创建时间: '2018-06-20',
    更新时间: '2026-04-15',
  },
];

/**
 * 兼容“排口信息”页（现菜单名显示为“入河排口核查列表”）的演示数据扩展：
 * 在保留原 4 条样例基础上，补齐到 20 条，便于分页、筛选与导出演示。
 */
export const outletData: OutletRecord[] = [
  ...outletBaseData,
  ...Array.from({ length: 16 }, (_, i) => {
    const seq = i + 5;
    const base = outletBaseData[i % outletBaseData.length];
    const code = `AH4303822604${String(seq).padStart(4, '0')}`;
    return {
      ...base,
      入河入海排污口名称: `${base.入河入海排污口名称}-${String(seq).padStart(2, '0')}`,
      入河入海排污口编码: code,
      入河入海排污口详细地址: `${base.入河入海排污口详细地址}（扩展示例${seq}）`,
      入河入海排污口经度: Number((base.入河入海排污口经度 + (i % 4) * 0.0012 + Math.floor(i / 4) * 0.0007).toFixed(6)),
      入河入海排污口纬度: Number((base.入河入海排污口纬度 + (i % 3) * 0.0011 + Math.floor(i / 4) * 0.0006).toFixed(6)),
      重点排口: i % 5 === 0 ? 1 : (base.重点排口 ?? 0),
      排放状态: ['正常排放', '超标排放', '溢流放排', '停止排放'][i % 4],
      创建时间: `2025-${String((i % 9) + 1).padStart(2, '0')}-${String((i % 20) + 1).padStart(2, '0')}`,
      更新时间: `2026-04-${String((i % 26) + 1).padStart(2, '0')}`,
      documents: undefined,
    };
  }),
];

/** 关联排口下拉：与「排口」台账 `入河入海排污口编码` 同源（设施管理 / 污水厂 / 排水户 / 污染源表单共用） */
export function buildLinkedOutletSelectOptions(): { value: string; label: string }[] {
  return outletData.map(o => ({
    value: String(o['入河入海排污口编码']),
    label: `${o['入河入海排污口名称']}（${o['入河入海排污口编码']}）`,
  }));
}

/** 排口「所在流域海域」下拉：与系统管理 · 流域信息 `watershedInitial` 同源；台账中仍有表 A.1 两位码时补选项 */
export function buildOutletBasinSeaSelectOptions(): { value: string; label: string }[] {
  const map = new Map<string, string>();
  for (const r of watershedInitial) {
    map.set(r.basCode, `${r.basCode} ${r.basName}`);
  }
  for (const row of outletData) {
    const c = String(row['所在流域海域'] ?? '').trim();
    if (c && !map.has(c)) {
      const leg = OUTLET_BASIN_SEA_LABEL[c];
      map.set(c, leg ? `${c} ${leg}（表A.1 行业码）` : c);
    }
  }
  return [...map.entries()].map(([value, label]) => ({ value, label }));
}

/** 关联排口编码回显为「名称（编码）」 */
export function formatLinkedOutletCodeDisplay(code: unknown): string {
  const c = String(code ?? '').trim();
  if (!c) return '—';
  const hit = outletData.find(o => o['入河入海排污口编码'] === c);
  return hit ? `${hit['入河入海排污口名称']}（${c}）` : c;
}

/** 多条关联排口：逐条「名称（编码）」，分号分隔 */
export function formatLinkedOutletCodesListDisplay(codes: unknown): string {
  if (!Array.isArray(codes) || codes.length === 0) return '—';
  const parts = [...new Set(codes.map(c => String(c).trim()).filter(Boolean))].map(c => formatLinkedOutletCodeDisplay(c));
  return parts.length ? parts.join('；') : '—';
}

export const plantData: PlantRecord[] = [
  {
    id: 'WWTP202504070001',
    systemId: 'SYS43038200100001',
    name: '高新区污水处理厂',
    region: '清溪镇',
    addr: '湖南省湘潭市韶山市清溪镇高新区工业园污水处理厂区',
    x: 112.528,
    y: 27.908,
    facilityType: 1,
    completionDate: '2018-06-01',
    treatmentLevel: 2,
    annualPowerConsumption: 420,
    treatmentMethod: 4,
    receiveWaterBodyCode: 'ROV-AHD030212-XJ-MAIN',
    linkedOutletCode: 'AH43038226040104',
    designCapa: 3.5,
    sewageTreatmentProcess: 'A2O+深度处理',
    sewageLoadRate: 82,
    rainwaterDesignCapa: 1.2,
    rainwaterTreatmentProcess: '沉淀+过滤',
    sludgeDesignCapa: 0.08,
    sludgeLoadRate: 65,
    sludgeTreatmentProcess: '浓缩脱水',
    sludgeDisposalMethod: 3,
    pumpCount: 8,
    dataSource: 2,
    recordDate: '2024-06-10',
    reportUnit: '高新区管委会',
    reportDate: '2025-04-01',
    remark: '演示数据与现场踏勘一致',
    status: '1',
    关键处理设施列表: createDefaultPlantKeyFacilities(112.528, 27.908),
    documents: [
      {
        id: 'plant-d-1',
        name: '设计图纸',
        type: 'design',
        fileName: '高新区污水厂总平面与工艺管道施工图.dwg',
        fileSize: '8.4MB',
        uploadTime: '2017-09-20',
        uploader: '市政设计院',
      },
      {
        id: 'plant-d-2',
        name: '竣工验收报告',
        type: 'completion',
        fileName: '高新区污水处理厂工程竣工验收备案表及附件.pdf',
        fileSize: '2.1MB',
        uploadTime: '2018-07-15',
        uploader: '建设单位',
      },
      {
        id: 'plant-d-3',
        name: '环保审批文件',
        type: 'envApproval',
        fileName: '排污许可证_高新区污水厂_副本.pdf',
        fileSize: '0.4MB',
        uploadTime: '2019-03-01',
        uploader: '生态分局',
      },
      {
        id: 'plant-d-4',
        name: '监测报告',
        type: 'monitoring',
        fileName: '进/出水与污泥季度监测_2024Q4.pdf',
        fileSize: '0.5MB',
        uploadTime: '2025-01-10',
        uploader: '第三方检测',
      },
      {
        id: 'plant-d-5',
        name: '运维记录',
        type: 'operation',
        fileName: '2024年度生产运行与设备维保台账.xlsx',
        fileSize: '0.2MB',
        uploadTime: '2024-12-28',
        uploader: '厂站运维部',
      },
    ],
  },
  {
    id: 'WWTP202504070002',
    systemId: 'SYS43038200100002',
    name: '清溪片区污水处理厂',
    region: '清溪镇',
    addr: '湖南省湘潭市韶山市清溪镇片区污水处理厂',
    x: 112.5368,
    y: 27.9132,
    facilityType: 1,
    completionDate: '2019-10-01',
    treatmentLevel: 2,
    annualPowerConsumption: 385,
    treatmentMethod: 4,
    receiveWaterBodyCode: 'ROV-AHD030212-XJ-QX',
    linkedOutletCode: 'AH43038226040101',
    designCapa: 2.8,
    sewageTreatmentProcess: 'AAO+沉淀过滤',
    sewageLoadRate: 76,
    rainwaterDesignCapa: 0.9,
    rainwaterTreatmentProcess: '沉淀+消毒',
    sludgeDesignCapa: 0.06,
    sludgeLoadRate: 61,
    sludgeTreatmentProcess: '机械脱水',
    sludgeDisposalMethod: 3,
    pumpCount: 6,
    dataSource: 2,
    recordDate: '2024-08-15',
    reportUnit: '清溪镇人民政府',
    reportDate: '2025-04-01',
    remark: '与事件列表演示数据保持同源编码',
    status: '1',
    关键处理设施列表: createDefaultPlantKeyFacilities(112.5368, 27.9132),
    documents: [
      {
        id: 'plant-d-6',
        name: '设计图纸',
        type: 'design',
        fileName: '清溪片区污水厂总平面图与工艺流程图.pdf',
        fileSize: '5.2MB',
        uploadTime: '2019-01-18',
        uploader: '市政设计院',
      },
      {
        id: 'plant-d-7',
        name: '竣工验收报告',
        type: 'completion',
        fileName: '清溪片区污水处理厂工程竣工验收报告.pdf',
        fileSize: '1.6MB',
        uploadTime: '2019-11-20',
        uploader: '建设单位',
      },
      {
        id: 'plant-d-8',
        name: '监测报告',
        type: 'monitoring',
        fileName: '清溪片区污水厂出水监测_2026Q1.pdf',
        fileSize: '0.6MB',
        uploadTime: '2026-04-05',
        uploader: '第三方检测',
      },
    ],
  },
  {
    id: 'WWTP202504070003',
    systemId: 'SYS43038200100003',
    name: '银田片区污水处理厂',
    region: '银田镇',
    addr: '湖南省湘潭市韶山市银田镇工业大道南侧',
    x: 112.5482,
    y: 27.9248,
    facilityType: 1,
    completionDate: '2020-05-20',
    treatmentLevel: 2,
    treatmentMethod: 4,
    linkedOutletCode: 'AH43038226040102',
    designCapa: 2.2,
    sewageTreatmentProcess: 'A2O+过滤',
    dataSource: 2,
    reportUnit: '银田镇人民政府',
    status: '1',
  },
  {
    id: 'WWTP202504070004',
    systemId: 'SYS43038200100004',
    name: '韶山乡污水处理厂',
    region: '韶山乡',
    addr: '湖南省湘潭市韶山市韶山乡韶河路东段',
    x: 112.5315,
    y: 27.9106,
    facilityType: 1,
    completionDate: '2017-09-12',
    treatmentLevel: 2,
    treatmentMethod: 4,
    linkedOutletCode: 'AH43038226040103',
    designCapa: 1.9,
    sewageTreatmentProcess: 'AAO+沉淀',
    dataSource: 2,
    reportUnit: '韶山乡人民政府',
    status: '1',
  },
  {
    id: 'WWTP202504070005',
    systemId: 'SYS43038200100005',
    name: '杨林片区污水处理厂',
    region: '杨林乡',
    addr: '湖南省湘潭市韶山市杨林乡南环路北侧',
    x: 112.5578,
    y: 27.9344,
    facilityType: 1,
    completionDate: '2021-03-15',
    treatmentLevel: 2,
    treatmentMethod: 4,
    linkedOutletCode: 'AH43038226040101',
    designCapa: 1.5,
    sewageTreatmentProcess: 'A2O',
    dataSource: 2,
    reportUnit: '杨林乡人民政府',
    status: '1',
  },
  {
    id: 'WWTP202504070006',
    systemId: 'SYS43038200100006',
    name: '如意镇污水处理厂',
    region: '如意镇',
    addr: '湖南省湘潭市韶山市如意镇镇区东侧',
    x: 112.5639,
    y: 27.9182,
    facilityType: 1,
    completionDate: '2019-11-08',
    treatmentLevel: 2,
    treatmentMethod: 4,
    linkedOutletCode: 'AH43038226040104',
    designCapa: 1.2,
    sewageTreatmentProcess: '生化处理+过滤',
    dataSource: 2,
    reportUnit: '如意镇人民政府',
    status: '1',
  },
  {
    id: 'WWTP202504070007',
    systemId: 'SYS43038200100007',
    name: '清溪北片污水处理厂',
    region: '清溪镇',
    addr: '湖南省湘潭市韶山市清溪镇北环路与产业路交叉口',
    x: 112.5417,
    y: 27.9201,
    facilityType: 1,
    completionDate: '2022-06-01',
    treatmentLevel: 2,
    treatmentMethod: 4,
    linkedOutletCode: 'AH43038226040101',
    designCapa: 2.0,
    sewageTreatmentProcess: 'AAO+深度处理',
    dataSource: 2,
    reportUnit: '清溪镇人民政府',
    status: '1',
  },
  {
    id: 'WWTP202504070008',
    systemId: 'SYS43038200100008',
    name: '银田东片污水处理厂',
    region: '银田镇',
    addr: '湖南省湘潭市韶山市银田镇东片园区配套污水站',
    x: 112.5531,
    y: 27.9263,
    facilityType: 2,
    completionDate: '2023-01-18',
    treatmentLevel: 2,
    treatmentMethod: 4,
    linkedOutletCode: 'AH43038226040102',
    designCapa: 1.6,
    sewageTreatmentProcess: '生化处理',
    dataSource: 3,
    reportUnit: '银田镇人民政府',
    status: '1',
  },
  {
    id: 'WWTP202504070009',
    systemId: 'SYS43038200100009',
    name: '红旗片区污水处理厂',
    region: '清溪镇',
    addr: '湖南省湘潭市韶山市红旗路与滨河路交叉口南侧',
    x: 112.5352,
    y: 27.9069,
    facilityType: 1,
    completionDate: '2016-12-30',
    treatmentLevel: 2,
    treatmentMethod: 4,
    linkedOutletCode: 'AH43038226040103',
    designCapa: 2.4,
    sewageTreatmentProcess: 'A2O+紫外消毒',
    dataSource: 2,
    reportUnit: '市城管局',
    status: '1',
  },
  {
    id: 'WWTP202504070010',
    systemId: 'SYS43038200100010',
    name: '韶北工业污水处理厂',
    region: '银田镇',
    addr: '湖南省湘潭市韶山市韶北工业园核心区',
    x: 112.5591,
    y: 27.9292,
    facilityType: 2,
    completionDate: '2024-02-22',
    treatmentLevel: 2,
    treatmentMethod: 4,
    linkedOutletCode: 'AH43038226040102',
    designCapa: 3.1,
    sewageTreatmentProcess: '水解酸化+生化',
    dataSource: 3,
    reportUnit: '高新区管委会',
    status: '1',
  },
  {
    id: 'WWTP202504070011',
    systemId: 'SYS43038200100011',
    name: '韶南片区污水处理厂',
    region: '韶山乡',
    addr: '湖南省湘潭市韶山市韶南大道西段',
    x: 112.5239,
    y: 27.9042,
    facilityType: 1,
    completionDate: '2018-04-16',
    treatmentLevel: 2,
    treatmentMethod: 4,
    linkedOutletCode: 'AH43038226040104',
    designCapa: 1.8,
    sewageTreatmentProcess: 'AAO',
    dataSource: 2,
    reportUnit: '韶山乡人民政府',
    status: '1',
  },
  {
    id: 'WWTP202504070012',
    systemId: 'SYS43038200100012',
    name: '旅游服务区污水处理厂',
    region: '清溪镇',
    addr: '湖南省湘潭市韶山市旅游服务区南侧配套厂区',
    x: 112.5297,
    y: 27.9154,
    facilityType: 3,
    completionDate: '2025-01-10',
    treatmentLevel: 2,
    treatmentMethod: 4,
    linkedOutletCode: 'AH43038226040101',
    designCapa: 1.1,
    sewageTreatmentProcess: '一体化生化处理',
    dataSource: 1,
    reportUnit: '文旅投公司',
    status: '1',
  },
];

// ——— 污水厂表 A.0.30：表单/列表/详情共用（仅中文标签） ———

export const PLANT_OPTS_FACILITY_TYPE: { value: number; label: string }[] = [
  { value: 1, label: '城镇污水处理厂' },
  { value: 2, label: '工业废水集中处理设施' },
  { value: 3, label: '其他' },
];
export const PLANT_OPTS_TREATMENT_LEVEL: { value: number; label: string }[] = [
  { value: 1, label: '一级' },
  { value: 2, label: '二级' },
  { value: 3, label: '三级' },
];
export const PLANT_OPTS_TREATMENT_METHOD: { value: number; label: string }[] = [
  { value: 1, label: '物理处理' },
  { value: 2, label: '化学处理' },
  { value: 3, label: '物化处理' },
  { value: 4, label: '生物处理' },
  { value: 5, label: '其他（请注明）' },
];
export const PLANT_OPTS_SLUDGE_DISPOSAL: { value: number; label: string }[] = [
  { value: 1, label: '填埋' },
  { value: 2, label: '焚烧' },
  { value: 3, label: '土地利用' },
  { value: 4, label: '其他（请注明）' },
];
export const PLANT_OPTS_DATA_SOURCE: { value: number; label: string }[] = [
  { value: 1, label: '现场踏勘' },
  { value: 2, label: '竣工图' },
  { value: 3, label: '设计图' },
  { value: 4, label: '手工估算' },
  { value: 5, label: '其他（请注明）' },
];

/** 码值 → 中文文案（表格/详情） */
export function plantLabelFromOptions(
  v: number | string | null | undefined,
  opts: { value: number; label: string }[],
): string {
  if (v === '' || v === undefined || v === null) return '—';
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  const hit = opts.find(o => o.value === n);
  return hit?.label ?? String(v);
}
