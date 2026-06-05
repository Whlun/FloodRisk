/**
 * 入河（海）排污口责任主体信息（HJ 1314—2023 附录 **表 A.2** 字段口径原型裁剪）
 * 界面与表格仅使用**中文**字段名；与设施管理「排口信息」台账 **多条** `入河入海排污口编码` 关联（`关联排口编码列表`）。
 * 详情/综合态势地图**关联排口位置**以排口台账 **`入河入海排污口经度`/`入河入海排污口纬度`** 为准；**联系地址**仍存于表 A.2 字段，供列表与地图选点表单使用（`联系地址经度`/`联系地址纬度` 可与选点联动）。
 */

import { outletData } from './facility-points-data';

/** 责任主体类型（表 A.2 常用取值裁剪） */
export const OUTLET_RESPONSIBLE_PARTY_TYPE_LABEL: Record<string, string> = {
  '01': '排污单位',
  '02': '污水处理设施运营单位',
  '03': '第三方运维单位',
  '04': '地方人民政府及其有关部门',
  '05': '其他',
};

/** 表 A.3：设置申请入河排污口类型 C(2) */
export const OUTFALL_APP_APPLY_TYPE_LABEL: Record<string, string> = {
  '01': '工矿企业排污口',
  '02': '工业及其他各类园区污水处理厂排污口',
  '03': '城镇污水处理厂排污口',
  '04': '其他（含规模化畜禽养殖、规模化水产养殖等）',
};

/** 表 A.3：设置审批类型 C(2) */
export const OUTFALL_APP_APPROVAL_TYPE_LABEL: Record<string, string> = {
  '01': '新建',
  '02': '改建',
  '03': '扩大',
  '04': '延续',
  '05': '变更',
};

/** 表 A.3：入河排污口截面类型 */
export const OUTFALL_APP_SECTION_TYPE_LABEL: Record<string, string> = {
  '01': '圆形',
  '02': '方形',
  '03': '其他',
};

export function formatResponsiblePartyType(code: string | undefined | null): string {
  const k = String(code ?? '').trim();
  if (!k) return '—';
  return OUTLET_RESPONSIBLE_PARTY_TYPE_LABEL[k] ?? k;
}

/** HJ 1314—2023 表 A.5 责任主体污染物排放信息（单行） */
export type ResponsiblePartyPollutantEmissionRow = {
  /** 污染物名称，按 HJ 525 规定编码/名称填报（原型为文本） */
  污染物名称?: string;
  /** Y 是 / N 否 */
  是否为主要污染物?: string;
  /** Y 是 / N 否 */
  是否为特征污染物?: string;
  执行排放标准?: string;
  /** mg/L，D(8,4) */
  许可排放浓度?: number;
  /** t/a，D(12,2) */
  许可排放量?: number;
  /** mg/L，年均值 */
  实际排放浓度?: number;
  /** t/a */
  实际排放量?: number;
};

/** HJ 1314—2023 表 A.3 入河排污口设置申请信息（单份嵌套，非列表） */
export type RiverOutfallSettingApplicationInfo = {
  /** C(2) 设置申请入河排污口类型 */
  设置申请入河排污口类型?: string;
  /** C(2) 设置审批类型 */
  设置审批类型?: string;
  /** DATE yyyy-MM-dd */
  建成时间?: string;
  /** C(2) 截面类型 */
  入河排污口截面类型?: string;
  /** m² D(6,2) */
  截面面积?: number;
  /** m D(4,2) */
  截面长直径?: number;
  /** m D(4,2) */
  截面宽?: number;
  /** 附件文件名或说明（原型不落库） */
  排污走向图说明?: string;
  设置论证报告说明?: string;
  第三方承诺书说明?: string;
  设置简要分析材料说明?: string;
  申请单位?: string;
  /** DATE yyyy-MM-dd */
  申请时间?: string;
};

/** 表 A.2 入河（海）排污口责任主体信息（字段名为中文，便于表单与列表 dataIndex 一致） */
export type OutletResponsiblePartyRecord = {
  /** 表内主键（演示） */
  责任主体内码: string;
  /** 关联表 A.1 入河入海排污口编码列表（可多选，与排口信息台账同源） */
  关联排口编码列表: string[];
  /** 责任主体名称 */
  责任主体名称: string;
  /** 责任主体类型代码 */
  责任主体类型: string;
  /** C(9) 韶山市—村/社区级行政区划代码（GB/T 2260、GB/T 10114） */
  责任主体行政区划?: string;
  /** GB/T 4754—2017 行业类别（原型文本或门类大类代码） */
  责任主体行业类别?: string;
  /** 统一社会信用代码 */
  统一社会信用代码: string;
  /** HJ 1314 表 A.2：排污许可证编号（无许可证可空） */
  责任主体排污许可证编号?: string;
  /** 法定代表人或负责人 */
  法定代表人或负责人: string;
  /** 联系人 */
  联系人: string;
  /** 联系电话 */
  联系电话: string;
  /** 联系地址 */
  联系地址: string;
  /** 联系地址对应 WGS84 经度（度）；与地图选点、详情/态势小地图同源 */
  联系地址经度?: number;
  /** 联系地址对应 WGS84 纬度（度） */
  联系地址纬度?: number;
  /** 是否为主要责任主体：是 / 否 */
  是否为主要责任主体: string;
  /** 责任开始日期 yyyy-MM-dd */
  责任开始日期: string;
  /** 责任结束日期 yyyy-MM-dd；无固定期限可空 */
  责任结束日期?: string;
  /** 溯源照片：文件名或多路径列表（原型不落盘） */
  责任主体照片列表?: string[];
  /** 主要责任主体视频：文件名或多路径列表（原型不落盘） */
  主要责任主体视频列表?: string[];
  /** 备注 */
  备注?: string;
  /** 填报单位 */
  填报单位?: string;
  /** 填报日期 yyyy-MM-dd */
  填报日期?: string;
  /** 表 A.5：多行污染物排放，可手动增删 */
  污染物排放信息列表?: ResponsiblePartyPollutantEmissionRow[];
  /** 表 A.3：单份申请信息 */
  申请信息?: RiverOutfallSettingApplicationInfo;
};

const pickOutletCode = (idx: number) =>
  String(outletData[idx % outletData.length]?.['入河入海排污口编码'] ?? '');

/** 无落库经纬时：由内码+联系地址稳定派生韶山演示范围内示意点（非排口坐标） */
function stableContactDemoLngLat(seed: string): { lng: number; lat: number } {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const u = h >>> 0;
  const lng = 112.51 + ((u & 0xffff) / 0xffff) * 0.08;
  const lat = 27.89 + (((u >> 16) & 0xffff) / 0xffff) * 0.06;
  return { lng, lat };
}

/** 责任主体「联系地址」在地图上的坐标：优先台账经纬，缺省则示意派生 */
/** 归一化关联排口编码（去重、去空） */
export function normalizeResponsiblePartyOutletCodes(codes: unknown): string[] {
  if (!Array.isArray(codes)) return [];
  return [...new Set(codes.map(c => String(c).trim()).filter(Boolean))];
}

export function getResponsiblePartyContactMapCoords(row: OutletResponsiblePartyRecord): { lng: number; lat: number } {
  const lng = Number(row.联系地址经度);
  const lat = Number(row.联系地址纬度);
  if (Number.isFinite(lng) && Number.isFinite(lat)) return { lng, lat };
  return stableContactDemoLngLat(`${row.责任主体内码}|${row.联系地址 ?? ''}`);
}

/** 详情/态势地图：按关联排口编码从排口台账取 WGS84 落点（无坐标则跳过） */
export type LinkedOutletMapPoint = {
  lng: number;
  lat: number;
  /** 排口名称 */
  title: string;
  /** 编码、地址等副标题 */
  subtitle: string;
};

export function getLinkedOutletMapPoints(
  row: Pick<OutletResponsiblePartyRecord, '关联排口编码列表'>,
): LinkedOutletMapPoint[] {
  const codes = normalizeResponsiblePartyOutletCodes(row.关联排口编码列表);
  const pts: LinkedOutletMapPoint[] = [];
  for (const code of codes) {
    const o = outletData.find(x => x['入河入海排污口编码'] === code);
    if (!o) continue;
    const lng = Number(o['入河入海排污口经度']);
    const lat = Number(o['入河入海排污口纬度']);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    const name = String(o['入河入海排污口名称'] ?? '').trim() || code;
    const addr = String(o['入河入海排污口详细地址'] ?? '').trim();
    pts.push({
      lng,
      lat,
      title: name,
      subtitle: addr ? `${code} · ${addr}` : code,
    });
  }
  return pts;
}

/** 韶山市演示区划代码轮换（清溪 / 银田 / 韶山乡） */
const ADDC_QXZ = ['430382100000', '430382101000', '430382102000'] as const;

type PartySeed = {
  名称: string;
  /** 与 OUTLET_RESPONSIBLE_PARTY_TYPE_LABEL 一致 */
  类型: '01' | '02' | '03' | '04' | '05';
  行业: string;
  信用码: string;
  许可证?: string;
  法人: string;
  联系人: string;
  电话: string;
  主要: '是' | '否';
  备注?: string;
};

/** 与 outletData 第 i 条排口一一对应（单排口仅绑定单一责任主体）；经纬度取自对应排口台账 */
function rowFromOutletIndex(i: number, seed: PartySeed): OutletResponsiblePartyRecord {
  const seq = String(i + 1).padStart(4, '0');
  const outlet = outletData[i];
  const oc = String(outlet?.['入河入海排污口编码'] ?? pickOutletCode(i));
  const lng = Number(outlet?.['入河入海排污口经度']);
  const lat = Number(outlet?.['入河入海排污口纬度']);
  const addr = String(outlet?.['入河入海排污口详细地址'] ?? '湖南省湘潭市韶山市').slice(0, 120);
  const addvFromOutlet = String(outlet?.['行政区划代码'] ?? ADDC_QXZ[i % 3]).trim() || ADDC_QXZ[i % 3];
  return {
    责任主体内码: `ZTZT-430382-202606-${seq}`,
    关联排口编码列表: [oc],
    责任主体名称: seed.名称,
    责任主体类型: seed.类型,
    责任主体行政区划: addvFromOutlet,
    责任主体行业类别: seed.行业,
    统一社会信用代码: seed.信用码,
    责任主体排污许可证编号: seed.许可证 ?? '',
    法定代表人或负责人: seed.法人,
    联系人: seed.联系人,
    联系电话: seed.电话,
    联系地址: addr,
    联系地址经度: Number.isFinite(lng) ? lng : undefined,
    联系地址纬度: Number.isFinite(lat) ? lat : undefined,
    是否为主要责任主体: seed.主要,
    责任开始日期: `202${3 + (i % 3)}-${String((i % 9) + 1).padStart(2, '0')}-${String((i % 26) + 1).padStart(2, '0')}`,
    责任结束日期: i % 7 === 5 ? '2028-12-31' : '',
    责任主体照片列表:
      i % 4 === 0 ? [`溯源公示-${seq}.jpg`] : i % 4 === 1 ? [`门头照-${seq}.jpg`, `标识牌-${seq}.jpg`] : [],
    主要责任主体视频列表: i % 6 === 2 ? [`巡查_${seq}.mp4`] : [],
    备注: seed.备注 ?? `演示台账第 ${i + 1} 条（与排口 ${oc} 绑定）`,
    填报单位: '韶山市生态环境分局',
    填报日期: `2026-${String((i % 11) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`,
    污染物排放信息列表:
      seed.类型 === '01' || seed.类型 === '02'
        ? [
            {
              污染物名称: i % 2 === 0 ? '化学需氧量' : '氨氮',
              是否为主要污染物: 'Y',
              是否为特征污染物: i % 3 === 0 ? 'Y' : 'N',
              执行排放标准: '污水综合排放标准 GB 8978-1996（节选）',
              许可排放浓度: 40 + (i % 30),
              许可排放量: Number((8 + (i % 20) * 0.35).toFixed(2)),
              实际排放浓度: 22 + (i % 15),
              实际排放量: Number((5 + (i % 12) * 0.42).toFixed(2)),
            },
          ]
        : [],
    申请信息:
      i % 5 === 0
        ? {
            设置申请入河排污口类型: (['01', '02', '03', '04'] as const)[i % 4],
            设置审批类型: '01',
            建成时间: '2016-05-10',
            入河排污口截面类型: '01',
            截面面积: 1.2 + (i % 5) * 0.1,
            截面长直径: 1.0,
            截面宽: 0,
            申请单位: seed.名称,
            申请时间: '2024-08-01',
          }
        : {},
  };
}

/** 责任主体演示台账 20 条：与 facility-points-data `outletData` 长度对齐，每条绑定唯一排口编码 */
const PARTY_SEEDS: PartySeed[] = [
  {
    名称: '韶山市清溪镇人民政府',
    类型: '04',
    行业: '公共管理、社会保障和社会组织',
    信用码: '11430382123456789X',
    法人: '周某',
    联系人: '镇河长办李某',
    电话: '0731-55680101',
    主要: '是',
    备注: '属地行政管理（清溪片区）',
  },
  {
    名称: '韶山市银田镇人民政府',
    类型: '04',
    行业: '公共管理、社会保障和社会组织',
    信用码: '11430382987654321Y',
    法人: '吴某',
    联系人: '环保办蒋某',
    电话: '0731-55680202',
    主要: '是',
  },
  {
    名称: '韶山市韶山乡人民政府',
    类型: '04',
    行业: '公共管理、社会保障和社会组织',
    信用码: '11430382111222333Z',
    法人: '郑某',
    联系人: '水务站胡某',
    电话: '0731-55680303',
    主要: '否',
  },
  {
    名称: '韶山高新技术产业开发区管理委员会',
    类型: '04',
    行业: '公共管理、社会保障和社会组织',
    信用码: '11430382444555666A',
    法人: '冯某',
    联系人: '生态环境科黄某',
    电话: '0731-55680404',
    主要: '是',
  },
  {
    名称: '韶山市住房和城乡建设局',
    类型: '04',
    行业: '公共管理、社会保障和社会组织',
    信用码: '11430382777888999B',
    法人: '罗某',
    联系人: '市政股谭某',
    电话: '0731-55680505',
    主要: '否',
  },
  {
    名称: '韶山市水利局',
    类型: '04',
    行业: '水利、环境和公共设施管理业',
    信用码: '11430382001122334C',
    法人: '林某',
    联系人: '河湖办彭某',
    电话: '0731-55680606',
    主要: '否',
  },
  {
    名称: '韶山韶峰生态农业发展有限公司',
    类型: '01',
    行业: 'A01 农业',
    信用码: '91430382MA5ECO7007D',
    许可证: '91430382MA5ECO7007D001Q',
    法人: '何某',
    联系人: '养殖场技术刘某',
    电话: '0731-55680707',
    主要: '是',
  },
  {
    名称: '韶山市清溪畜禽养殖专业合作社',
    类型: '01',
    行业: 'A032 畜禽养殖',
    信用码: '91430382MA8PIG2008E',
    许可证: '91430382MA8PIG2008E002R',
    法人: '谢某',
    联系人: '防疫专员陈某',
    电话: '0731-55680808',
    主要: '否',
  },
  {
    名称: '韶山高新污水处理厂（一期）运营单位',
    类型: '02',
    行业: 'D4620 污水处理及其再生利用',
    信用码: '914303822WWTP9009F',
    许可证: '914303822WWTP9009F003V',
    法人: '张某',
    联系人: '中控室班长赵某',
    电话: '0731-55680909',
    主要: '是',
  },
  {
    名称: '韶山市清溪镇社区卫生服务中心',
    类型: '05',
    行业: 'Q84 卫生',
    信用码: '52430382MJYCLIN010G',
    法人: '马某',
    联系人: '后勤科孙某',
    电话: '0731-55681010',
    主要: '否',
  },
  {
    名称: '韶山市韶河建材有限公司',
    类型: '01',
    行业: 'C30 非金属矿物制品业',
    信用码: '91430382MABUILT011H',
    许可证: '91430382MABUILT011H004P',
    法人: '杨某',
    联系人: '安环部朱某',
    电话: '0731-55681111',
    主要: '是',
  },
  {
    名称: '韶山市银田电镀表面处理厂',
    类型: '01',
    行业: 'C33 金属制品业',
    信用码: '91430382MAPLATE012J',
    许可证: '91430382MAPLATE012J005W',
    法人: '鲁某',
    联系人: '车间主任曾某',
    电话: '0731-55681212',
    主要: '否',
  },
  {
    名称: '湖南绿源水务运维有限公司韶山分公司',
    类型: '03',
    行业: 'N772 环境治理业',
    信用码: '91430105MAOPSZZ013K',
    法人: '陈某',
    联系人: '片区运维邓某',
    电话: '400-800-1314',
    主要: '否',
  },
  {
    名称: '韶山市风景名胜区管理委员会',
    类型: '04',
    行业: '公共管理、社会保障和社会组织',
    信用码: '11430382333445556L',
    法人: '丁某',
    联系人: '遗产保护办邹某',
    电话: '0731-55681414',
    主要: '否',
  },
  {
    名称: '韶山市交通运输局',
    类型: '04',
    行业: '公共管理、社会保障和社会组织',
    信用码: '11430382555666777M',
    法人: '郭某',
    联系人: '养护中心贺某',
    电话: '0731-55681515',
    主要: '否',
  },
  {
    名称: '韶山市市场监督管理局',
    类型: '04',
    行业: '公共管理、社会保障和社会组织',
    信用码: '11430382778899000N',
    法人: '龚某',
    联系人: '综合执法刘某',
    电话: '0731-55681616',
    主要: '否',
  },
  {
    名称: '韶山市农业农村局',
    类型: '04',
    行业: '公共管理、社会保障和社会组织',
    信用码: '11430382009988776P',
    法人: '付某',
    联系人: '畜牧水产站尹某',
    电话: '0731-55681717',
    主要: '否',
  },
  {
    名称: '韶山润湘食品有限公司',
    类型: '01',
    行业: 'C14 食品制造业',
    信用码: '91430382MAFOOD018Q',
    许可证: '91430382MAFOOD018Q006X',
    法人: '崔某',
    联系人: '品控部袁某',
    电话: '0731-55681818',
    主要: '是',
  },
  {
    名称: '韶山市韶河中路加油站有限公司',
    类型: '01',
    行业: 'F516 机动车燃料零售',
    信用码: '91430382MAGAS019R',
    许可证: '91430382MAGAS019R007Y',
    法人: '卢某',
    联系人: '站长汤某',
    电话: '0731-55681919',
    主要: '否',
  },
  {
    名称: '韶山市城乡一体化示范区事务中心',
    类型: '04',
    行业: '公共管理、社会保障和社会组织',
    信用码: '12430382123456789S',
    法人: '贾某',
    联系人: '协调办韦某',
    电话: '0731-55682020',
    主要: '否',
    备注: '示范区涉水事务统筹（演示）',
  },
];

export const outletResponsiblePartyInitial: OutletResponsiblePartyRecord[] = PARTY_SEEDS.map((seed, i) =>
  rowFromOutletIndex(i, seed),
);

/** 排口详情「关联责任主体」：反查台账中 `关联排口编码列表` 包含本排口编码的责任主体（与设施管理「排口管理 · 责任主体信息」同源） */
export function listResponsiblePartiesLinkedToOutlet(outletCode: string): OutletResponsiblePartyRecord[] {
  const c = String(outletCode ?? '').trim();
  if (!c) return [];
  return outletResponsiblePartyInitial.filter(row =>
    normalizeResponsiblePartyOutletCodes(row.关联排口编码列表).includes(c),
  );
}
