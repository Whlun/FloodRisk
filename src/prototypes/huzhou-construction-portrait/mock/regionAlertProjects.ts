/**
 * 预警工程画像 · 按区县组织的演示项目（与 HZ_ALERT_PARCELS_BY_DISTRICT 地块挂接）
 */
import { HZ_ALERT_PARCELS_BY_DISTRICT } from '../../huzhou-lifecycle-shared/mock/demoParcels';
import { cmRegionToDistrictName, type CmRegionKey } from '../cmRegionFilter';
import type { ConstructionProject, PhaseKey } from '../types';

type AlertDemoSeed = Omit<ConstructionProject, 'id' | 'region' | 'parcelId'> & {
  parcelSlot: number;
};

function parcelForDistrict(district: keyof typeof HZ_ALERT_PARCELS_BY_DISTRICT, slot: number): string {
  const list = HZ_ALERT_PARCELS_BY_DISTRICT[district];
  return list[slot % list.length]!;
}

function buildDistrictAlerts(
  district: keyof typeof HZ_ALERT_PARCELS_BY_DISTRICT,
  code: string,
  seeds: AlertDemoSeed[],
): ConstructionProject[] {
  return seeds.map((seed, index) => {
    const { parcelSlot, ...rest } = seed;
    return {
      ...rest,
      id: `alert-${code}-${String(index + 1).padStart(2, '0')}`,
      region: district,
      parcelId: parcelForDistrict(district, parcelSlot),
    };
  });
}

/** 五区县预警演示项目（每区 4 条，phaseEnteredAt 对齐基准日 2026-06-02 的 hint / warning / serious） */
export const REGION_ALERT_PROJECTS: ConstructionProject[] = [
  ...buildDistrictAlerts('吴兴区', 'wx', [
    {
      parcelSlot: 0,
      phaseKey: 'pre-review',
      name: '吴兴高新区产业配套道路及地下管廊工程',
      unifiedCode: '2023-330502-52-01-445566',
      address: '吴兴区高新区创智一路至创智三路（含地下综合管廊）',
      projectType: '市政道路工程',
      ownerName: '湖州吴兴高新区基础设施建设有限公司',
      constructNature: '新建',
      phaseEnteredAt: '2023-01-15',
    },
    {
      parcelSlot: 1,
      phaseKey: 'farmland',
      name: '吴兴区妙西镇茶旅融合配套服务中心项目',
      unifiedCode: '2405-330502-52-01-881007',
      address: '吴兴区妙西镇妙峰山路与西塞山路交叉口西侧',
      projectType: '公共服务',
      ownerName: '湖州妙西茶旅发展有限公司',
      constructNature: '新建',
      phaseEnteredAt: '2026-02-20',
    },
    {
      parcelSlot: 2,
      phaseKey: 'plan-verify',
      name: '吴兴区八里店镇邻里中心及配套用房项目',
      unifiedCode: '2402-330502-70-01-881108',
      address: '吴兴区八里店镇318国道北侧商住配套地块',
      projectType: '城镇社区服务',
      ownerName: '湖州八里店城镇建设投资有限公司',
      constructNature: '新建',
      phaseEnteredAt: '2024-09-16',
    },
    {
      parcelSlot: 0,
      phaseKey: 'land-supply',
      name: '吴兴区织里镇童装产业园三期扩建项目',
      unifiedCode: '2402-330502-04-01-880401',
      address: '吴兴区织里镇中华西路与栋梁路交叉口东北侧',
      projectType: '工业厂房',
      ownerName: '湖州织里童装产业投资发展有限公司',
      constructNature: '扩建',
      phaseEnteredAt: '2026-03-18',
    },
  ]),
  ...buildDistrictAlerts('南浔区', 'nx', [
    {
      parcelSlot: 0,
      phaseKey: 'pre-review',
      name: '南浔区旧馆镇智能制造小微园项目',
      unifiedCode: '2308-330503-04-01-880603',
      address: '南浔区旧馆镇振兴大道南侧产业用地',
      projectType: '工业厂房',
      ownerName: '湖州南浔旧馆产业投资发展有限公司',
      constructNature: '新建',
      phaseEnteredAt: '2023-09-05',
    },
    {
      parcelSlot: 1,
      phaseKey: 'land-permit',
      name: '南浔区和孚镇绿色建材仓储物流项目',
      unifiedCode: '2306-330503-70-01-880906',
      address: '南浔区和孚镇和孚工业园区仓储物流片区',
      projectType: '仓储物流',
      ownerName: '湖州和孚绿色建材有限公司',
      constructNature: '新建',
      phaseEnteredAt: '2025-04-20',
    },
    {
      parcelSlot: 0,
      phaseKey: 'farmland',
      name: '南浔区省级冷链物流园建设项目',
      unifiedCode: '2022-330503-59-01-778899',
      address: '南浔区经济开发区物流大道与申苏浙皖高速互通区北侧',
      projectType: '仓储物流',
      ownerName: '浙江南浔冷链物流发展有限公司',
      constructNature: '新建',
      phaseEnteredAt: '2025-08-10',
    },
    {
      parcelSlot: 1,
      phaseKey: 'first-reg',
      name: '南浔区练市镇城镇开发边界内商住用地首次登记',
      unifiedCode: '2022-330503-70-01-889900',
      address: '南浔区练市镇新城大道西侧、永安路北侧商住地块',
      projectType: '城镇住宅用地',
      ownerName: '湖州练市新城置业有限公司',
      constructNature: '新建',
      phaseEnteredAt: '2026-03-08',
    },
  ]),
  ...buildDistrictAlerts('德清县', 'dq', [
    {
      parcelSlot: 0,
      phaseKey: 'first-reg',
      name: '德清县乾元镇通航装备配套产业园项目',
      unifiedCode: '2404-330521-04-01-880805',
      address: '德清县乾元镇德清大道以东、环城北路以北',
      projectType: '产业园区',
      ownerName: '德清通航产业投资发展有限公司',
      constructNature: '新建',
      phaseEnteredAt: '2026-01-10',
    },
    {
      parcelSlot: 1,
      phaseKey: 'con-permit',
      name: '德清县莫干山高新区科创中心项目',
      unifiedCode: '2024-330521-36-03-556688',
      address: '德清县高新区地理信息小镇科创大道 1 号',
      projectType: '科研办公建筑',
      ownerName: '德清地理信息小镇科技发展有限公司',
      constructNature: '新建',
      phaseEnteredAt: '2025-12-05',
    },
    {
      parcelSlot: 0,
      phaseKey: 'plan-verify',
      name: '德清县下渚湖湿地保护利用配套设施项目',
      unifiedCode: '2023-330521-52-01-556677',
      address: '德清县下渚湖街道湿地公园游客服务中心片区',
      projectType: '公共设施',
      ownerName: '德清下渚湖湿地旅游发展有限公司',
      constructNature: '新建',
      phaseEnteredAt: '2026-03-02',
    },
    {
      parcelSlot: 1,
      phaseKey: 'first-reg',
      name: '德清至安吉高速公路（湖州段）配套场站项目',
      unifiedCode: '2020-330521-27-01-556677',
      address: '德清县乾元镇德安高速互通区东南侧配套用地',
      projectType: '交通运输设施',
      ownerName: '浙江交投高速公路管理有限公司',
      constructNature: '新建',
      phaseEnteredAt: '2026-02-08',
    },
  ]),
  ...buildDistrictAlerts('长兴县', 'cx', [
    {
      parcelSlot: 0,
      phaseKey: 'eng-permit',
      name: '长兴县泗安镇竹木加工集中区标准厂房项目',
      unifiedCode: '2401-330522-04-01-880502',
      address: '长兴县泗安镇工业园区创业大道 66 号',
      projectType: '工业厂房',
      ownerName: '长兴泗安竹木产业开发有限公司',
      constructNature: '新建',
      phaseEnteredAt: '2024-08-12',
    },
    {
      parcelSlot: 1,
      phaseKey: 'con-permit',
      name: '长兴县和平镇新能源装备产业基地项目',
      unifiedCode: '2403-330522-36-03-880704',
      address: '长兴县和平镇回车岭工业功能区',
      projectType: '工业建筑',
      ownerName: '长兴和平新能源装备有限公司',
      constructNature: '新建',
      phaseEnteredAt: '2025-05-15',
    },
    {
      parcelSlot: 1,
      phaseKey: 'pre-review',
      name: '长兴县太湖图影旅游度假区文旅综合体项目',
      unifiedCode: '2024-330522-90-03-667788',
      address: '长兴县太湖图影旅游度假区图影大道以东、环湖大道以南',
      projectType: '文化旅游',
      ownerName: '长兴太湖图影旅游发展有限公司',
      constructNature: '新建',
      phaseEnteredAt: '2025-09-20',
    },
    {
      parcelSlot: 0,
      phaseKey: 'farmland',
      name: '长兴县李家巷镇矿坑生态修复及产业用地报批',
      unifiedCode: '2022-330522-04-01-112255',
      address: '长兴县李家巷镇振兴路矿坑生态修复区及周边产业用地',
      projectType: '生态修复与产业用地',
      ownerName: '长兴县自然资源和规划局李家巷分局',
      constructNature: '新建',
      phaseEnteredAt: '2025-07-01',
    },
  ]),
  ...buildDistrictAlerts('安吉县', 'aj', [
    {
      parcelSlot: 0,
      phaseKey: 'land-permit',
      name: '老梅溪卫生院迁建工程（临港）',
      unifiedCode: '2019-330523-83-01-028840',
      address: '安吉县梅溪镇临港产业园健康路 18 号北侧',
      projectType: '医疗卫生建筑',
      ownerName: '安吉县卫生健康局',
      constructNature: '迁建',
      phaseEnteredAt: '2025-11-01',
    },
    {
      parcelSlot: 1,
      phaseKey: 'land-supply',
      name: '安吉县天子湖镇工业用地出让配套项目',
      unifiedCode: '2021-330523-36-03-112244',
      address: '安吉县天子湖镇工业园区 2021-GY-08 号地块',
      projectType: '工业用地',
      ownerName: '安吉天子湖工业园开发有限公司',
      constructNature: '新建',
      phaseEnteredAt: '2026-02-01',
    },
    {
      parcelSlot: 0,
      phaseKey: 'land-permit',
      name: '安吉县孝丰镇中心小学改扩建工程',
      unifiedCode: '2023-330523-04-01-334422',
      address: '安吉县孝丰镇孝丰路 128 号（原校区北侧扩建用地）',
      projectType: '教育设施',
      ownerName: '安吉县教育局',
      constructNature: '改扩建',
      phaseEnteredAt: '2026-02-28',
    },
    {
      parcelSlot: 1,
      phaseKey: 'farmland',
      name: '安吉县梅溪镇竹产业配套加工区项目',
      unifiedCode: '2024-330523-36-03-881201',
      address: '安吉县梅溪镇临港产业园北侧产业用地',
      projectType: '工业厂房',
      ownerName: '安吉梅溪竹产业开发有限公司',
      constructNature: '新建',
      phaseEnteredAt: '2024-06-01',
    },
  ]),
];

const alertById = new Map(REGION_ALERT_PROJECTS.map(p => [p.id, p]));

/** 当前区县下的预警演示项目；全市返回全部 20 条 */
export function getRegionAlertProjects(regionKey: CmRegionKey): ConstructionProject[] {
  if (regionKey === 'all') return REGION_ALERT_PROJECTS;
  const district = cmRegionToDistrictName(regionKey);
  if (!district) return REGION_ALERT_PROJECTS;
  return REGION_ALERT_PROJECTS.filter(p => p.region === district);
}

/** 按阶段 + 区县过滤预警演示项目 */
export function getRegionAlertProjectsByPhase(
  phaseKey: PhaseKey | null,
  regionKey: CmRegionKey,
): ConstructionProject[] {
  const rows = getRegionAlertProjects(regionKey);
  if (phaseKey == null) return rows;
  return rows.filter(p => p.phaseKey === phaseKey);
}

export function getRegionAlertProjectById(id: string): ConstructionProject | undefined {
  return alertById.get(id);
}

export function findRegionAlertProjectByParcelId(parcelId: string): ConstructionProject | undefined {
  return REGION_ALERT_PROJECTS.find(p => p.parcelId === parcelId);
}
