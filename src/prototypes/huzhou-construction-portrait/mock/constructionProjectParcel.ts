/**
 * 建设工程画像 · 将演示地块台账与建设工程项目对齐（基本信息完整、阶段与标签一致）
 */
import { CM_PHASES, type CmPhaseAccentKey } from '../../huzhou-lifecycle-shared/cmPhaseAccent';
import type { ConstructionProjectBasicInfoSnapshot } from '../../huzhou-lifecycle-shared/cmProjectBasicInfo';
import { MATTER_STAGE_BY_KEY, type MatterStageKey } from '../../huzhou-lifecycle-shared/parcelMatterStages';
import type {
  CmPhaseAcceptTimeMap,
  MatterStageRecord,
  ParcelAttachment,
  ParcelLifecycle,
  StageStatus,
} from '../../huzhou-lifecycle-shared/types';
import type { ConstructionProject, PhaseKey } from '../types';

const CM_PHASE_ORDER: readonly CmPhaseAccentKey[] = [
  'pre-review',
  'farmland',
  'land-supply',
  'land-permit',
  'first-reg',
  'eng-permit',
  'con-permit',
  'land-review',
  'plan-verify',
] as const;

const PHASE_PRIMARY_MATTER: Record<PhaseKey, MatterStageKey> = {
  'pre-review': 'pre-review',
  farmland: 'farmland-conversion',
  'land-supply': 'land-supply',
  'land-permit': 'land-use-permit',
  'first-reg': 'first-registration',
  'eng-permit': 'engineering-permit',
  'con-permit': 'construction-permit',
  'land-review': 'land-review',
  'plan-verify': 'planning-verification',
};

const XZQDM_BY_REGION: Record<string, string> = {
  吴兴区: '330502',
  南浔区: '330503',
  德清县: '330521',
  长兴县: '330522',
  安吉县: '330523',
};

function muToSqm(mu: number): string {
  return String(Math.round(mu * 666.67 * 100) / 100);
}

function regionXzqdm(region: string): string {
  return XZQDM_BY_REGION[region] ?? '330500';
}

function phaseIndex(phaseKey: PhaseKey): number {
  return CM_PHASE_ORDER.indexOf(phaseKey);
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function defaultConstructNature(project: ConstructionProject): string {
  if (project.constructNature) return project.constructNature;
  if (project.projectType?.includes('改建')) return '改建';
  if (project.projectType?.includes('道路') || project.projectType?.includes('市政')) return '新建';
  return '新建';
}

/** 列表 / 详情左栏同源的基本信息快照 */
export function buildConstructionProjectSnapshot(
  project: ConstructionProject,
): ConstructionProjectBasicInfoSnapshot {
  const landSqm =
    project.landAreaMu != null ? muToSqm(project.landAreaMu) : undefined;
  const buildSqm =
    project.buildAreaSqm != null ? String(Math.round(project.buildAreaSqm)) : undefined;
  const overSqm =
    project.buildAreaSqm != null
      ? String(Math.round(project.buildAreaSqm * 0.88))
      : undefined;

  return {
    name: project.name,
    region: project.region,
    unifiedCode: project.unifiedCode,
    applyDate: project.applyDate,
    address: project.address,
    projectClass: project.projectType ?? '其他企业投资项目',
    constructNature: defaultConstructNature(project),
    industry: project.industry ?? inferIndustry(project),
    theIndustry: project.theIndustry ?? 'A0000301',
    totalFund: project.totalFund ?? inferTotalFund(project),
    fundSource: project.fundSource ?? inferFundSource(project),
    planStart: project.planStart ?? shiftDate(project.applyDate ?? '2024-01-01', 90),
    planEnd: project.planEnd ?? shiftDate(project.applyDate ?? '2024-01-01', 900),
    totalLandArea: landSqm,
    totalBuildArea: buildSqm,
    overBuildArea: overSqm,
    ownerName: project.ownerName,
    ownerLegalName: project.ownerLegalName ?? '张某某',
    ownerLegalCertType: project.ownerLegalCertType ?? '居民身份证',
    ownerLegalCertNo: project.ownerLegalCertNo ?? '3305************18',
    ownerAddress: project.ownerAddress ?? `${project.region}行政中心路 88 号`,
    scaleContent:
      project.scaleContent ??
      `${project.name}，总用地约${project.landAreaMu ?? '—'}亩${
        project.buildAreaSqm ? `，建筑面积约${Math.round(project.buildAreaSqm)}平方米` : ''
      }。`,
  };
}

function inferIndustry(project: ConstructionProject): string {
  const t = project.projectType ?? '';
  if (t.includes('教育')) return '教育';
  if (t.includes('医疗')) return '卫生和社会工作';
  if (t.includes('道路') || t.includes('市政')) return '公共设施管理业';
  if (t.includes('工业') || t.includes('厂房')) return '制造业';
  if (t.includes('商业') || t.includes('加油')) return '批发和零售业';
  if (t.includes('住房') || t.includes('居住')) return '房地产业';
  return '建筑业';
}

function inferTotalFund(project: ConstructionProject): string {
  const mu = project.landAreaMu ?? 30;
  return String(Math.round(mu * 420 + (project.buildAreaSqm ?? 0) * 0.08));
}

function inferFundSource(project: ConstructionProject): string {
  if (project.ownerName?.includes('局') || project.ownerName?.includes('政府')) {
    return '财政性资金';
  }
  return '民间固定资产投资';
}

function buildProjectBaseStage(project: ConstructionProject): MatterStageRecord {
  const snap = buildConstructionProjectSnapshot(project);
  const xzqdm = regionXzqdm(project.region);
  return {
    project_code: snap.unifiedCode ?? '',
    apply_project_name: snap.name,
    receivenumber: `${xzqdm}${(project.applyDate ?? '20240101').replace(/-/g, '')}001`,
    project_class: snap.projectClass ?? '',
    place_code: xzqdm,
    place_code_detail: project.region,
    address_detial: snap.address ?? '',
    construct_nature: snap.constructNature ?? '新建',
    audit_type: '03',
    industry: snap.industry ?? '',
    the_industry: snap.theIndustry ?? '',
    fund_source: snap.fundSource ?? '',
    fund_attributes: snap.fundSource?.includes('财政') ? '政府投资' : '民间固定资产投资',
    total_fund: snap.totalFund ?? '',
    owner_code: '91330500MA2D123456',
    owner_name: snap.ownerName ?? '',
    owner_property: '企业',
    owner_rank: snap.ownerName?.includes('局') ? '事业单位' : '民营企业',
    owner_legaperson_certtype: snap.ownerLegalCertType ?? '',
    owner_legaperson_certno: snap.ownerLegalCertNo ?? '',
    owner_address: snap.ownerAddress ?? '',
    owner_legalperson_name: snap.ownerLegalName ?? '',
    owner_legalperson_tel: '13800001234',
    total_land_area: snap.totalLandArea ?? '',
    total_build_area: snap.totalBuildArea ?? '',
    over_build_area: snap.overBuildArea ?? '',
    scale_content: snap.scaleContent ?? '',
    apply_time: snap.applyDate ? `${snap.applyDate} 09:00:00` : '',
    plan_starttime: snap.planStart ?? '',
    plan_endtime: snap.planEnd ?? '',
  };
}

function buildPreReviewRecord(project: ConstructionProject): MatterStageRecord {
  const xzqdm = regionXzqdm(project.region);
  const landSqm = project.landAreaMu != null ? muToSqm(project.landAreaMu) : '12000';
  return {
    xmdm: project.unifiedCode ?? '',
    ysxz_xmmc: project.name,
    ysxz_yjsbh: `湖预选址〔${(project.applyDate ?? '2024').slice(0, 4)}〕${project.id.replace(/\D/g, '').slice(-3).padStart(3, '0')}`,
    ysxz_xmpzlx: '核准',
    ysxz_xmpzjg: '湖州市自然资源和规划局',
    ysxz_xmjsyjxmjsyjxmjsyjlx: '规划',
    ysxz_xmjsyjxmjsyjxmjsyjmc: '湖州市国土空间总体规划',
    ysxz_szxzqdm: xzqdm,
    ysxz_xmnjdz: project.address ?? '',
    ysxz_xmlx: inferIndustry(project),
    ysxz_ydmj: landSqm,
    ysxz_zynydmj: '0',
    ysxz_zygdmj: '0',
    ysxz_zyyjjbntmj: '0',
    ysxz_jsyd: String((Number(landSqm) / 10000).toFixed(4)),
    ysxz_wlyd: '0',
    ysxz_jsgm: buildConstructionProjectSnapshot(project).scaleContent ?? '',
    ysxz_xmtzgm: inferTotalFund(project),
    ysxz_bz: '—',
    nf: shiftDate(project.applyDate ?? '2024-03-01', -60),
  };
}

function buildFarmlandRecord(project: ConstructionProject): MatterStageRecord {
  const xzqdm = regionXzqdm(project.region);
  const landSqm = project.landAreaMu != null ? muToSqm(project.landAreaMu) : '12000';
  return {
    xmbh: `NZY-${(project.applyDate ?? '2024').slice(0, 4)}-${xzqdm}-${project.id.replace(/\D/g, '').slice(-3)}`,
    sqdw: project.ownerName ?? '',
    sqrq: shiftDate(project.applyDate ?? '2024-04-01', -30),
    xmlx: '分批次',
    zblx: '新增建设用地',
    dk_mc: project.name.slice(0, 24),
    szs: '湖州市',
    szx: xzqdm,
    xj_hj: landSqm,
    xj_xj: '0',
    xj_zs: '0',
    xj_sy: '0',
    nyd_hj: String(Math.round(Number(landSqm) * 0.15)),
    nyd_xj: '0',
    nyd_gytd: String(Math.round(Number(landSqm) * 0.15)),
    xj_gytd: landSqm,
    jsyd_hj: landSqm,
    jsyd_xj: '0',
    jsyd_gytd: landSqm,
    wlyd_hj: '0',
    wlyd_gytd: '0',
    wlyd_xj: '0',
  };
}

function buildLandSupplyRecord(project: ConstructionProject): MatterStageRecord {
  const xzqdm = regionXzqdm(project.region);
  const landSqm = project.landAreaMu != null ? muToSqm(project.landAreaMu) : '8000';
  const codeYear = (project.applyDate ?? '2021').slice(0, 4);
  return {
    tdgy_xmmc: project.name,
    tdgy_dzjgh: `${xzqdm}${codeYear}A${project.id.replace(/\D/g, '').slice(-4)}`,
    tdgy_hthbbh: `${xzqdm}${codeYear}A${project.id.replace(/\D/g, '').slice(-4)}`,
    tdgy_xzqdm: xzqdm,
    tdgy_zdbh: `${project.region.slice(0, 2)}-${codeYear}-${project.id}`,
    tdgy_tdsyz: project.ownerName ?? '',
    tdgy_tdzl: project.address ?? '',
    tdgy_tdyt: inferIndustry(project) + '用地',
    tdgy_gyfs: project.phaseKey === 'land-supply' ? '出让' : '出让',
    tdgy_gdzmj: landSqm,
    tdgy_dxjzmj: project.buildAreaSqm
      ? String(Math.round(project.buildAreaSqm * 0.12))
      : '0',
    tdgy_qdrq: shiftDate(project.applyDate ?? '2021-09-15', 45),
    tdgy_pzwh: `湖土让字〔${codeYear}〕${project.id.replace(/\D/g, '').slice(-3)}号`,
    tdgy_pzrq: shiftDate(project.applyDate ?? '2021-09-15', 30),
    tdgy_pzdw: '湖州市自然资源和规划局',
    tdgy_pzjg: '湖州市人民政府',
    tdgy_crnx: '50',
    tdgy_dgsj: shiftDate(project.applyDate ?? '2021-09-15', 180),
    tdgy_jgsj: shiftDate(project.applyDate ?? '2021-09-15', 900),
    tdgy_lhlsx: '25',
    tdgy_rjlsx: '2.0',
    tdgy_rjlxx: '1.2',
    tdgy_jzmdsx: '30',
    tdgy_jzgdsx: '45',
    tdgy_tzxmmc: project.name,
  };
}

function buildLandPermitRecord(project: ConstructionProject): MatterStageRecord {
  return {
    xmdm: project.unifiedCode ?? '',
    ydgh_ydxmmc: project.name,
    ydgh_ydwz: project.address ?? '',
    ydgh_ydxz: inferIndustry(project) + '用地',
    ydgh_yddw: project.ownerName ?? '',
    ydgh_jsgm: buildConstructionProjectSnapshot(project).scaleContent ?? '',
    ydgh_szqx: project.region,
    ydgh_ydmj: project.landAreaMu != null ? `${muToSqm(project.landAreaMu)}平方米` : '—',
    ydgh_fzsj: shiftDate(project.applyDate ?? '2019-06-20', 120),
    ydgh_fzjg: '湖州市自然资源和规划局',
    ydgh_xkzh: `地字第${regionXzqdm(project.region)}${(project.applyDate ?? '2019').slice(0, 4)}${project.id.replace(/\D/g, '').slice(-3)}号`,
    ydgh_yxdzjgh: project.unifiedCode ?? '',
  };
}

function buildFirstRegRecord(project: ConstructionProject): MatterStageRecord {
  const xzqdm = regionXzqdm(project.region);
  return {
    bdcdyh: `${xzqdm}008011GB00033W00000000`,
    bdcqzh: `浙(${new Date().getFullYear()})湖州市不动产权第${project.id.replace(/\D/g, '').slice(-6)}号`,
    qlr: project.ownerName ?? '',
    gyqk: '单独所有',
    zl: project.address ?? '',
    qllx: '国有建设用地使用权',
    qlxz: '出让',
    yt: inferIndustry(project),
    mj: project.landAreaMu != null ? muToSqm(project.landAreaMu) : '—',
    syqx: `国有建设用地使用权至${Number((project.applyDate ?? '2020').slice(0, 4)) + 50}年12月31日止`,
    fj: '依出让合同及规划条件办理首次登记。',
  };
}

function isMunicipalRoadProject(project: ConstructionProject): boolean {
  return (
    project.industry?.includes('市政道路') === true ||
    project.projectType?.includes('市政道路') === true
  );
}

function buildEngPermitRecord(project: ConstructionProject): MatterStageRecord {
  const xzqdm = regionXzqdm(project.region);
  const snap = buildConstructionProjectSnapshot(project);
  const municipal = isMunicipalRoadProject(project);
  const applyDate = project.applyDate ?? '2023-05-22';
  const fzrq = municipal ? shiftDate(applyDate, 439) : shiftDate(applyDate, 60);
  return {
    xmdm: project.unifiedCode ?? '',
    gcgh_jsxmmc: project.name,
    gcgh_gclx: municipal
      ? ''
      : project.projectType?.includes('市政')
        ? '市政基础设施工程'
        : '房屋建筑工程',
    gcgh_jswz: project.address ?? '',
    gcgh_jsgm: snap.scaleContent ?? '',
    gcgh_jsdmhgt: project.ownerName ?? '',
    gcgh_czzztdmlx: municipal ? '' : '统一社会信用代码',
    gcgh_czzztdm: municipal ? '' : '91330500MA2D123456',
    gcgh_zsbm: municipal
      ? `建字第330501${fzrq.slice(0, 4)}00035号`
      : `建字第${xzqdm}${applyDate.slice(0, 4)}${project.id.replace(/\D/g, '').slice(-4)}号`,
    gcgh_fzjg: '湖州市自然资源和规划局',
    gcgh_fzrq: fzrq,
    gcgh_xzqmc: municipal ? '湖州市' : project.region,
  };
}

function buildConPermitRecord(project: ConstructionProject): MatterStageRecord {
  const snap = buildConstructionProjectSnapshot(project);
  const municipal = isMunicipalRoadProject(project);
  const applyDate = project.applyDate ?? '2023-05-22';
  const landSqm =
    project.landAreaMu != null
      ? project.landAreaMu === 0
        ? '0'
        : muToSqm(project.landAreaMu)
      : snap.totalLandArea ?? '';
  const buildSqm =
    project.buildAreaSqm != null ? String(Math.round(project.buildAreaSqm)) : snap.totalBuildArea ?? '';
  const isPublicFacility =
    project.projectType?.includes('公共') === true || project.projectType?.includes('设施') === true;
  const gclx = municipal
    ? '道路工程'
    : isPublicFacility
      ? '公共建筑'
      : project.projectType?.includes('工业')
        ? '工业建筑'
        : project.projectType?.includes('住宅') || project.projectType?.includes('酒店')
          ? '住宅工程'
          : '公共建筑';
  const jhkgrq = shiftDate(applyDate, municipal ? 120 : 90);
  const jhjgrq = shiftDate(applyDate, municipal ? 900 : 540);

  return {
    xmdm: project.unifiedCode ?? '',
    gcsg_jsdw: project.ownerName ?? '',
    gcsg_fddbr: project.ownerLegalName ?? '王某某',
    gcsg_shxydm: project.ownerLegalCertNo ?? '91330500MA2D123456',
    gcsg_jsxmmc: project.name,
    gcsg_lxr: project.ownerLegalName ?? '项目经办人',
    gcsg_lxdh: '0572-8012345',
    gcsg_xmdz: project.address ?? '',
    gcsg_xmmj: landSqm,
    gcsg_zjzmj: buildSqm,
    gcsg_ds_zdcs: municipal ? '—' : isPublicFacility ? '2' : '18',
    gcsg_dxcs: municipal ? '—' : '1',
    gcsg_jsxz: defaultConstructNature(project),
    gcsg_gclx: gclx,
    gcsg_jglx_cl: municipal ? '—' : '钢筋混凝土结构',
    gcsg_jglx_cll: municipal ? '—' : '框架',
    gcsg_jclx: municipal ? '桩基' : '筏基',
    gcsg_jnjzbz: '65%',
    gcsg_lsjz_mj: isPublicFacility ? '1200' : '—',
    gcsg_lsjz_xj: isPublicFacility ? '一星' : '—',
    gcsg_tyngr_mj: isPublicFacility ? '80' : '—',
    gcsg_tnygf_kw: isPublicFacility ? '120' : '—',
    gcsg_dyrb_mj: '—',
    gcsg_jhkgrq: jhkgrq,
    gcsg_jhjgrq: jhjgrq,
    gcsg_wxxgc: municipal ? '塔吊' : '—',
    gcsg_zbhj: isPublicFacility ? '临近居民区、商业区' : '—',
    gcsg_kcdw: '浙江省工程勘察设计院集团有限公司',
    gcsg_kcdw_zzdj: '工程勘察综合资质甲级',
    gcsg_kcdw_xmfzr: '陈某某',
    gcsg_kcdw_lxdh: '13800001111',
    gcsg_sjdw: '湖州市建筑设计研究院',
    gcsg_sjdw_zzdj: '建筑设计甲级',
    gcsg_sjdw_xmfzr: '李某某',
    gcsg_sjdw_lxdh: '13800002222',
    gcsg_sgdw: '浙江广川建设有限公司',
    gcsg_sgdw_zzdj: '建筑工程施工总承包贰级',
    gcsg_sgdw_xmfzr: '张某某',
    gcsg_sgdw_lxdh: '13800003333',
    gcsg_jldw: '浙江江南工程管理股份有限公司',
    gcsg_jldw_zzdj: '工程监理综合资质甲级',
    gcsg_jldw_xmfzr: '赵某某',
    gcsg_jldw_lxdh: '13800004444',
  };
}

function buildLandReviewRecord(project: ConstructionProject): MatterStageRecord {
  const snap = buildConstructionProjectSnapshot(project);
  const xzqdm = regionXzqdm(project.region);
  const buildSqm =
    project.buildAreaSqm != null ? String(Math.round(project.buildAreaSqm)) : snap.totalBuildArea ?? '';
  const landSqm =
    project.landAreaMu != null
      ? project.landAreaMu === 0
        ? '0'
        : muToSqm(project.landAreaMu)
      : snap.totalLandArea ?? '';
  const underSqm = snap.underBuildArea && Number(snap.underBuildArea) > 0 ? snap.underBuildArea : '';
  const overSqm = underSqm ? snap.overBuildArea ?? buildSqm : buildSqm;
  const isShuanglinGas =
    project.unifiedCode?.includes('308123') || project.name.includes('双林加油站');

  return {
    xmdm: project.unifiedCode ?? '',
    qxdm: xzqdm,
    ydfhys_apply_project_name: project.name,
    ydfhys_address_detial: isShuanglinGas
      ? '经济开发区2020-10号地块'
      : project.address ?? '',
    ydfhys_construct_nature: snap.constructNature ?? '新建',
    ydfhys_industry: snap.industry ?? '',
    ydfhys_the_industry: snap.theIndustry ?? '',
    ydfhys_scale_content: snap.scaleContent ?? '',
    ydfhys_total_land_area: landSqm,
    ydfhys_new_build_area: '',
    ydfhys_total_build_area: buildSqm,
    ydfhys_over_build_area: overSqm,
    ydfhys_under_build_area: underSqm,
    ydfhys_owner_name: snap.ownerName ?? '',
    ydfhys_land_get_type: isShuanglinGas ? '' : '出让',
    ydfhys_plan_starttime: snap.planStart ?? '',
    ydfhys_plan_endtime: snap.planEnd ?? '',
    ydfhys_zsh: isShuanglinGas
      ? '湖土复验经字 (2022) 第 31 号'
      : `湖用验〔${(project.applyDate ?? '2022').slice(0, 4)}〕${project.id.replace(/\D/g, '').slice(-3)}号`,
  };
}

function buildPlanVerifyRecord(project: ConstructionProject): MatterStageRecord {
  const landSqm = project.landAreaMu != null ? muToSqm(project.landAreaMu) : '—';
  return {
    xmdm: project.unifiedCode ?? '',
    ghhs_jsxmmc: project.name,
    ghhs_jsdw: project.ownerName ?? '',
    ghhs_jswz: project.address ?? '',
    ghhs_jsgm: buildConstructionProjectSnapshot(project).scaleContent ?? '',
    ghhs_xkzh: `核字第${regionXzqdm(project.region)}${(project.applyDate ?? '2024').slice(0, 4)}${project.id.replace(/\D/g, '').slice(-3)}号`,
    ghhs_hfjg: '湖州市自然资源和规划局',
    ghhs_hfrq: shiftDate(project.applyDate ?? '2024-01-18', 30),
    ghhs_dzjgh: project.unifiedCode ?? '',
    ghhs_qrsbh: `GHHS-${project.id}`,
    qxdm: regionXzqdm(project.region),
    ydmj: landSqm,
  };
}

const MATTER_RECORD_BUILDERS: Partial<
  Record<MatterStageKey, (p: ConstructionProject) => MatterStageRecord>
> = {
  'pre-review': buildPreReviewRecord,
  'farmland-conversion': buildFarmlandRecord,
  'land-supply': buildLandSupplyRecord,
  'land-use-permit': buildLandPermitRecord,
  'first-registration': buildFirstRegRecord,
  'engineering-permit': buildEngPermitRecord,
  'construction-permit': buildConPermitRecord,
  'land-review': buildLandReviewRecord,
  'planning-verification': buildPlanVerifyRecord,
};

function buildStageStatus(project: ConstructionProject): Partial<Record<MatterStageKey, StageStatus>> {
  const curIdx = phaseIndex(project.phaseKey);
  const status: Partial<Record<MatterStageKey, StageStatus>> = {};

  CM_PHASES.forEach((phase, phaseIdx) => {
    const phaseState: StageStatus =
      phaseIdx < curIdx ? 'done' : phaseIdx === curIdx ? 'active' : 'pending';
    phase.matterKeys.forEach(mk => {
      status[mk] = phaseState;
    });
  });

  status['project-base'] = curIdx > 0 ? 'done' : 'active';
  return status;
}

export function buildCmPhaseAcceptTimes(project: ConstructionProject): CmPhaseAcceptTimeMap {
  const base = project.applyDate ?? '2024-01-01';
  const curIdx = phaseIndex(project.phaseKey);
  const times: CmPhaseAcceptTimeMap = {};
  CM_PHASE_ORDER.forEach((key, i) => {
    if (i > curIdx) return;
    const offset = -180 + i * 35;
    times[key] = shiftDate(base, offset);
  });
  const primary = PHASE_PRIMARY_MATTER[project.phaseKey];
  const builder = MATTER_RECORD_BUILDERS[primary];
  if (builder) {
    const rec = builder(project);
    if (project.phaseKey === 'farmland' && rec.sqrq) times.farmland = String(rec.sqrq);
    if (project.phaseKey === 'land-supply' && rec.tdgy_qdrq) times['land-supply'] = String(rec.tdgy_qdrq);
    if (project.phaseKey === 'pre-review' && rec.nf) times['pre-review'] = String(rec.nf);
    if (project.phaseKey === 'eng-permit' && rec.gcgh_fzrq) times['eng-permit'] = String(rec.gcgh_fzrq);
    if (project.phaseKey === 'con-permit' && rec.gcsg_jhkgrq) times['con-permit'] = String(rec.gcsg_jhkgrq);
    if (project.phaseKey === 'land-review' && rec.ydfhys_plan_starttime) {
      times['land-review'] = String(rec.ydfhys_plan_starttime);
    }
  }
  return times;
}

/** 当前阶段进入日期（预警判定）：仅使用项目显式 `phaseEnteredAt`，未标记视为正常项目 */
export function resolveProjectCurrentPhaseEnteredAt(
  project: ConstructionProject,
): string | undefined {
  const override = project.phaseEnteredAt?.trim();
  if (!override) return undefined;
  if (override.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(override)) return override.slice(0, 10);
  return override;
}

function buildStagesAndRecords(project: ConstructionProject): {
  stages: ParcelLifecycle['stages'];
  stageRecords: ParcelLifecycle['stageRecords'];
} {
  const curIdx = phaseIndex(project.phaseKey);
  const stages: ParcelLifecycle['stages'] = {
    'project-base': buildProjectBaseStage(project),
  };
  const stageRecords: ParcelLifecycle['stageRecords'] = {};

  const dualRecordPhases = new Set<PhaseKey>([
    'pre-review',
    'farmland',
    'land-supply',
    'first-reg',
  ]);

  CM_PHASES.forEach((phase, phaseIdx) => {
    if (phaseIdx > curIdx) return;
    phase.matterKeys.forEach(mk => {
      const builder = MATTER_RECORD_BUILDERS[mk];
      if (!builder) return;
      const record = builder(project);
      stages[mk] = record;
      const isPrimary =
        phaseIdx === curIdx && mk === PHASE_PRIMARY_MATTER[project.phaseKey];
      if (isPrimary && dualRecordPhases.has(project.phaseKey)) {
        const second: MatterStageRecord = { ...record };
        if (mk === 'pre-review') second.ysxz_bz = '备选选址（演示二）';
        if (mk === 'farmland-conversion') second.dk_mc = `${String(record.dk_mc ?? '')}（二期）`;
        if (mk === 'land-supply') second.tdgy_zdbh = `${String(record.tdgy_zdbh ?? '')}-B`;
        if (mk === 'first-registration') second.fj = '共有产权分割登记（演示二）';
        stageRecords[mk] = [record, second];
      } else if (phaseIdx <= curIdx) {
        stageRecords[mk] = [record];
      }
    });
  });

  return { stages, stageRecords };
}

function buildAttachments(project: ConstructionProject): ParcelAttachment[] {
  const curIdx = phaseIndex(project.phaseKey);
  const items: ParcelAttachment[] = [];
  CM_PHASES.forEach((phase, phaseIdx) => {
    if (phaseIdx > curIdx) return;
    const mk = phase.matterKeys.find(k => MATTER_RECORD_BUILDERS[k]) ?? phase.matterKeys[0];
    const label = MATTER_STAGE_BY_KEY[mk]?.label ?? phase.label;
    items.push({
      name: `${label}批复材料.pdf`,
      type: phaseIdx === curIdx ? '办理中' : '批复文件',
      date: shiftDate(project.applyDate ?? '2024-01-01', phaseIdx * 40 - 80),
      fileSize: `${(1.2 + phaseIdx * 0.3).toFixed(1)} MB`,
      uploader: project.ownerName?.includes('局') ? '主管部门' : '建设单位',
      matterName: label,
    });
  });
  return items;
}

/** 合并演示地块与建设项目，供详情弹窗使用 */
export function mergeParcelForConstructionProject(
  base: ParcelLifecycle,
  project: ConstructionProject,
): ParcelLifecycle {
  const { stages, stageRecords } = buildStagesAndRecords(project);
  const primaryMatter = PHASE_PRIMARY_MATTER[project.phaseKey];

  return {
    ...base,
    projectCode: project.unifiedCode ?? base.projectCode,
    name: project.name,
    region: project.region,
    address: project.address ?? base.address,
    currentStageKey: primaryMatter,
    stageStatus: buildStageStatus(project),
    stages,
    stageRecords,
    cmPhaseAcceptTimes: buildCmPhaseAcceptTimes(project),
    processEvents: CM_PHASE_ORDER.filter((_, i) => i <= phaseIndex(project.phaseKey)).map(
      key => {
        const phase = CM_PHASES.find(p => p.key === key)!;
        const macro =
          key === 'pre-review' || key === 'farmland'
            ? '批'
            : key === 'land-supply'
              ? '供'
              : key === 'land-permit' || key === 'first-reg'
                ? '用'
                : key === 'eng-permit' || key === 'con-permit'
                  ? '建'
                  : '验';
        return {
          stageName: macro,
          matterName: MATTER_STAGE_BY_KEY[phase.matterKeys[0]]?.label ?? phase.label,
          time: buildCmPhaseAcceptTimes(project)[key] ?? '',
          status: key === project.phaseKey ? '进行中' : '结束',
        };
      },
    ),
    attachments: buildAttachments(project),
  };
}
