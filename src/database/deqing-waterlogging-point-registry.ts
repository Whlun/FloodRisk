import type { WaterloggingPointRegistryRow } from '../prototypes/deqing-waterlogging-risk/types';

/**
 * 易涝点主数据（原有业务系统台账）
 * 风险普查从此库选择点位，不在此模块新建基础信息。
 * 演示数据：四种隐患点类型各 2 条，分布于不同乡镇。
 */
export const waterloggingPointRegistry: WaterloggingPointRegistryRow[] = [
  // —— 下凹式立交桥/下穿道 ——
  {
    id: 'reg-001',
    pointCode: 'NL-DEQ-SK-001',
    name: '武康路与千秋街下凹立交',
    pointType: 'SUNKEN',
    townCode: '330521001',
    address: '德清县武康街道武康路与千秋街交叉口',
    lng: 120.0521,
    lat: 30.5412,
  },
  {
    id: 'reg-007',
    pointCode: 'NL-DEQ-SK-002',
    name: '雷甸镇临杭大道下穿段',
    pointType: 'SUNKEN',
    townCode: '330521007',
    address: '德清县雷甸镇临杭大道与启航路交叉口',
    lng: 120.12,
    lat: 30.498,
  },
  // —— 隧道 ——
  {
    id: 'reg-002',
    pointCode: 'NL-DEQ-TN-001',
    name: '乾元镇东郊路隧道',
    pointType: 'TUNNEL',
    townCode: '330521003',
    address: '德清县乾元镇东郊路',
    lng: 120.0612,
    lat: 30.5288,
  },
  {
    id: 'reg-005',
    pointCode: 'NL-DEQ-TN-002',
    name: '舞阳街道游子街人行地道',
    pointType: 'TUNNEL',
    townCode: '330521002',
    address: '德清县舞阳街道游子街中段',
    lng: 120.055,
    lat: 30.533,
  },
  // —— 地下空间 ——
  {
    id: 'reg-003',
    pointCode: 'NL-DEQ-UG-001',
    name: '银泰城地下停车场',
    pointType: 'UNDERGROUND',
    townCode: '330521001',
    address: '德清县武康街道游子街银泰城',
    lng: 120.0488,
    lat: 30.5365,
  },
  {
    id: 'reg-006',
    pointCode: 'NL-DEQ-UG-002',
    name: '阜溪街道会展中心地下空间',
    pointType: 'UNDERGROUND',
    townCode: '330521012',
    address: '德清县阜溪街道会展中心北侧',
    lng: 120.045,
    lat: 30.548,
  },
  // —— 城市低洼路段 ——
  {
    id: 'reg-004',
    pointCode: 'NL-DEQ-LL-001',
    name: '新市镇永安街低洼段',
    pointType: 'LOW_LYING',
    townCode: '330521004',
    address: '德清县新市镇永安街中段',
    lng: 120.072,
    lat: 30.515,
  },
  {
    id: 'reg-008',
    pointCode: 'NL-DEQ-LL-002',
    name: '莫干山镇景区路低洼段',
    pointType: 'LOW_LYING',
    townCode: '330521010',
    address: '德清县莫干山镇景区路',
    lng: 120.088,
    lat: 30.562,
  },
];
