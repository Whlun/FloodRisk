/**
 * 生态整治 · 项目管理 ·「项目档案」演示台账（与村级区划树 `SHAOSHAN_ADMIN_TREE_TO_VILLAGE` 编码一致）。
 * 供综合态势左侧「项目」指标、地图统一点位等与原型同源引用，避免与 `index.tsx` 循环依赖。
 */

/** 项目档案资料类型（与档案表单、快速上传一致） */
export type EcoProjectArchiveDocumentType =
  | 'feasibility'
  | 'design'
  | 'bidding'
  | 'contract'
  | 'completion'
  | 'audit'
  | 'operation';

export interface EcoProjectArchiveDocument {
  id: string;
  name: string;
  type: EcoProjectArchiveDocumentType;
  fileName: string;
  fileSize: string;
  uploadTime: string;
  uploader: string;
}

/** 项目档案初始台账：韶山市域水环境治理与生态修复 */
export const initialEcoProjectArchiveData = [
  {
    key: '1',
    name: '清溪镇韶河沿岸生态缓冲带与护岸整治工程',
    code: 'SS-ECO-2025-001',
    type: '水生态修复',
    adminDivision: '430382100002',
    location: '湖南省湘潭市韶山市清溪镇清溪村韶河右岸（清溪路桥下游约 800 m 至青年水库汇入口段）',
    longitude: '112.528600',
    latitude: '27.912400',
    investment: 1860,
    status: '施工中',
    progress: 58,
    unit: '韶山市水利局',
    contractor: '湖南韶发水利工程有限公司',
    supervisor: '湘潭江河工程建设监理有限公司',
    startDate: '2025-02-10',
    endDate: '2026-06-30',
    projectGoal: '建设植被缓冲带与生态护岸，削减雨天径流污染入韶河，保障下游水质稳定达标。',
    description: '结合清溪镇韶河段岸线现状，实施缓冲带植被恢复、护坡修整及巡查步道贯通，服务河长巡河与群众亲水安全。',
    documents: [
      { id: 'doc-1-1', name: '项目可行性研究报告', type: 'feasibility', fileName: '韶河清溪段缓冲带可研报告.pdf', fileSize: '11.6MB', uploadTime: '2024-12-05', uploader: '沈宁' },
      { id: 'doc-1-2', name: '设计图纸', type: 'design', fileName: '韶河清溪段护岸整治施工图.zip', fileSize: '86.2MB', uploadTime: '2025-01-18', uploader: '刘洋' },
      { id: 'doc-1-3', name: '施工合同', type: 'contract', fileName: '韶河清溪段施工合同（示范段）.pdf', fileSize: '6.4MB', uploadTime: '2025-02-01', uploader: '陈蕾' },
    ] as EcoProjectArchiveDocument[],
  },
  {
    key: '2',
    name: '银田镇工业园初期雨水收集及调蓄池建设工程',
    code: 'SS-ECO-2025-002',
    type: '管网建设',
    adminDivision: '430382101001',
    location: '湖南省湘潭市韶山市银田镇银田村高新区工业园雨水管网末端（近雨水泵站）',
    longitude: '112.546200',
    latitude: '27.920800',
    investment: 980,
    status: '已完工',
    progress: 100,
    unit: '韶山市高新区管委会',
    contractor: '湖南建工集团水利水电工程公司',
    supervisor: '银田镇工程建设监理站',
    startDate: '2024-04-01',
    endDate: '2025-01-20',
    projectGoal: '收集园区初期雨水并经调蓄沉淀后排放，降低暴雨时高浓度面源污染冲击银田片区管网与受纳水体。',
    description: '新建初期雨水截流沟、格栅及调蓄池一座，与既有泵站调度联动，台账与设施管理系统排口、泵站数据可对照。',
    documents: [
      { id: 'doc-2-1', name: '项目可行性研究报告', type: 'feasibility', fileName: '银田工业园雨水调蓄可研.pdf', fileSize: '9.1MB', uploadTime: '2023-11-08', uploader: '沈宁' },
      { id: 'doc-2-2', name: '竣工验收报告', type: 'completion', fileName: '银田雨水调蓄工程竣工验收报告.pdf', fileSize: '14.2MB', uploadTime: '2025-01-25', uploader: '赵敏' },
      { id: 'doc-2-3', name: '运维记录', type: 'operation', fileName: '2025年一季度调蓄池运维台账.xlsx', fileSize: '820KB', uploadTime: '2025-03-31', uploader: '运维班李强' },
    ] as EcoProjectArchiveDocument[],
  },
  {
    key: '3',
    name: '韶山乡青年水库汇水区农业面源污染防控示范',
    code: 'SS-ECO-2025-003',
    type: '湿地保护',
    adminDivision: '430382102001',
    location: '湖南省湘潭市韶山市韶山乡韶山村青年水库周边汇水农田与村道沿线',
    longitude: '112.519400',
    latitude: '27.918500',
    investment: 720,
    status: '设计中',
    progress: 22,
    unit: '韶山市农业农村局',
    contractor: '湖南省环科院（联合体牵头）',
    supervisor: '韶山市生态环境分局（技术审查）',
    startDate: '2025-09-01',
    endDate: '2027-03-31',
    projectGoal: '通过生态沟渠、沉淀塘及施肥指导示范，减少氮磷进入青年水库汇水区，支撑饮用水水源保护。',
    description: '与河湖长制「河道水体」中青年水库档案衔接，形成面源防控与水库水质联动示范片。',
    documents: [
      { id: 'doc-3-1', name: '项目可行性研究报告', type: 'feasibility', fileName: '青年水库汇水区面源防控可研.pdf', fileSize: '13.5MB', uploadTime: '2025-05-12', uploader: '周文' },
    ] as EcoProjectArchiveDocument[],
  },
  {
    key: '4',
    name: '杨林乡韶河支流底泥清淤及生态疏浚工程',
    code: 'SS-ECO-2025-004',
    type: '河道清淤',
    adminDivision: '430382103001',
    location: '湖南省湘潭市韶山市杨林乡杨林村韶河支流（杨林桥至团田汇流口段）',
    longitude: '112.555800',
    latitude: '27.905200',
    investment: 560,
    status: '招标中',
    progress: 12,
    unit: '杨林乡人民政府',
    contractor: '待定',
    supervisor: '待定',
    startDate: '2025-11-01',
    endDate: '2026-05-30',
    projectGoal: '清除支流内阻水浅滩与污染底泥，恢复行洪断面，改善支流水质感官与考核断面稳定性。',
    description: '清淤量、运输路线及堆场设置将按韶山市水务专题会议纪要执行，开工后与河长巡河问题台账联动销号。',
    documents: [] as EcoProjectArchiveDocument[],
  },
  {
    key: '5',
    name: '清溪镇农村生活污水站点提质增效与管网延伸工程',
    code: 'SS-ECO-2025-005',
    type: '黑臭水体治理',
    adminDivision: '430382100003',
    location: '湖南省湘潭市韶山市清溪镇花园村集中居民点及既有小型污水处理站周边',
    longitude: '112.533100',
    latitude: '27.909600',
    investment: 1320,
    status: '施工中',
    progress: 44,
    unit: '韶山市住建局',
    contractor: '湘潭市政集团有限公司',
    supervisor: '湖南城建监理有限公司',
    startDate: '2025-03-01',
    endDate: '2026-02-28',
    projectGoal: '提升站点处理负荷与出水稳定性，延伸支管网覆盖散户，消除雨季污水漫流与沟渠黑臭。',
    description: '与农村环境整治台账口径一致，建成后运维数据可对接后续信息化模块。',
    documents: [
      { id: 'doc-5-1', name: '设计图纸', type: 'design', fileName: '花园村污水站点改造施工图.zip', fileSize: '62.4MB', uploadTime: '2025-02-20', uploader: '刘洋' },
      { id: 'doc-5-2', name: '招投标文件', type: 'bidding', fileName: '花园村污水提质增效招标文件.pdf', fileSize: '4.8MB', uploadTime: '2025-03-05', uploader: '陈蕾' },
      { id: 'doc-5-3', name: '施工合同', type: 'contract', fileName: '花园村污水管网延伸合同.pdf', fileSize: '7.1MB', uploadTime: '2025-03-18', uploader: '沈宁' },
    ] as EcoProjectArchiveDocument[],
  },
  {
    key: '6',
    name: '团田村入河排口规范化建设及标识体系完善项目',
    code: 'SS-ECO-2025-006',
    type: '水生态修复',
    adminDivision: '430382103002',
    location: '湖南省湘潭市韶山市杨林乡团田村韶河沿岸排口集中区（含雨水、合流排口各 1 处示范）',
    longitude: '112.541900',
    latitude: '27.907300',
    investment: 210,
    status: '施工中',
    progress: 70,
    unit: '韶山市生态环境分局',
    contractor: '韶山市市政养护中心',
    supervisor: '杨林乡河长办（现场协调）',
    startDate: '2025-06-01',
    endDate: '2025-12-15',
    projectGoal: '统一排口标识、建档二维码与采样平台，形成「一口一档」示范，与设施管理系统排口台账字段对齐。',
    description: '示范排口坐标与韶山市高新区排口台账示例一致，便于跨模块演示数据联动。',
    documents: [
      { id: 'doc-6-1', name: '项目可行性研究报告', type: 'feasibility', fileName: '团田排口规范化建设方案.pdf', fileSize: '3.6MB', uploadTime: '2025-04-22', uploader: '周文' },
      { id: 'doc-6-2', name: '竣工验收报告', type: 'completion', fileName: '团田排口示范段验收单.pdf', fileSize: '2.1MB', uploadTime: '2025-10-08', uploader: '赵敏' },
    ] as EcoProjectArchiveDocument[],
  },
];

/** 项目档案台账行（与生态整治 `ProjectArchive` / 综合态势「项目」同源） */
export type EcoProjectArchiveRow = (typeof initialEcoProjectArchiveData)[number];
