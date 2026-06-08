/**
 * 建管详情 · 各事项属性 Tab 展示字段（与产品截图 label / 顺序 / 单位一致）
 */
import { formatHuzhouDistrictFromXzqdm } from './huzhouDistricts';
import type { MatterStageKey } from './parcelMatterStages';
import type { MatterStageRecord } from './types';

export type MatterDisplayField = {
  code: string;
  label: string;
  format?: (data: MatterStageRecord) => string;
};

function formatDistrictFromRecord(
  data: MatterStageRecord,
  codeKey: string,
  fallbackTextKey?: string,
): string {
  const fromCode = formatHuzhouDistrictFromXzqdm(data[codeKey]);
  if (fromCode !== '—') return fromCode;
  const text = fallbackTextKey ? data[fallbackTextKey] : null;
  if (text != null && String(text).trim()) return String(text).trim();
  return '—';
}

const PRE_REVIEW_DISPLAY_FIELDS: MatterDisplayField[] = [
  { code: 'ysxz_xmmc', label: '事项名称' },
  { code: 'xmdm', label: '项目代码' },
  { code: 'ysxz_yjsbh', label: '预审选址意见书编号' },
  { code: 'ysxz_xmpzlx', label: '审批类型' },
  { code: 'ysxz_xmpzjg', label: '批准机关' },
  { code: 'ysxz_xmjsyjxmjsyjxmjsyjlx', label: '建设依据类型' },
  { code: 'ysxz_xmjsyjxmjsyjxmjsyjmc', label: '建设依据名称' },
  {
    code: 'ysxz_szxzqdm',
    label: '所在区县',
    format: data => formatHuzhouDistrictFromXzqdm(data.ysxz_szxzqdm),
  },
  { code: 'ysxz_xmnjdz', label: '拟选位置' },
  { code: 'ysxz_xmlx', label: '行业分类' },
  { code: 'ysxz_ydmj', label: '用地面积（m²）' },
  { code: 'ysxz_zynydmj', label: '占用农用地面积（m²）' },
  { code: 'ysxz_zygdmj', label: '占用耕地面积（m²）' },
  { code: 'ysxz_zyyjjbntmj', label: '占用永久基本农田面积（m²）' },
  { code: 'ysxz_jsyd', label: '占用建设用地面积（公顷）' },
  { code: 'ysxz_wlyd', label: '占用未利用地面积' },
  { code: 'ysxz_jsgm', label: '拟建设规模' },
  { code: 'ysxz_xmtzgm', label: '投资规模（万元）' },
  { code: 'ysxz_bz', label: '备注' },
  { code: 'nf', label: '受理日期' },
];

/** 农转用报批 · 地块维度（21 项：项目批次、地块面积、农用地/建设用地分项等） */
const FARMLAND_DISPLAY_FIELDS: MatterDisplayField[] = [
  { code: 'xmbh', label: '项目批次' },
  { code: 'sqdw', label: '申请单位' },
  { code: 'sqrq', label: '申请日期' },
  { code: 'xmlx', label: '项目类型' },
  { code: 'zblx', label: '指标类型' },
  { code: 'dk_mc', label: '地块名称' },
  {
    code: 'szx',
    label: '所在区县',
    format: data => formatDistrictFromRecord(data, 'szx', 'szs'),
  },
  { code: 'xj_hj', label: '地块面积（㎡）' },
  { code: 'xj_xj', label: '其中集体面积（㎡）' },
  { code: 'xj_zs', label: '集体土地征收（㎡）' },
  { code: 'xj_sy', label: '集体土地使用（㎡）' },
  { code: 'nyd_hj', label: '农用地面积（㎡）' },
  { code: 'nyd_xj', label: '农用地集体（㎡）' },
  { code: 'nyd_gytd', label: '农用地国有（㎡）' },
  { code: 'xj_gytd', label: '其中国有面积（㎡）' },
  { code: 'jsyd_hj', label: '建设用地面积（㎡）' },
  { code: 'jsyd_xj', label: '建设用地集体（㎡）' },
  { code: 'jsyd_gytd', label: '建设用地国有（㎡）' },
  { code: 'wlyd_hj', label: '未利用地面积（㎡）' },
  { code: 'wlyd_gytd', label: '未利用地国有（㎡）' },
  { code: 'wlyd_xj', label: '未利用地集体（㎡）' },
];

/** 土地供应（截图 24 项，无「项目代码」） */
const LAND_SUPPLY_DISPLAY_FIELDS: MatterDisplayField[] = [
  { code: 'tdgy_xmmc', label: '项目名称' },
  { code: 'tdgy_dzjgh', label: '电子监管号' },
  { code: 'tdgy_hthbbh', label: '合同/划拨编号' },
  {
    code: 'tdgy_xzqdm',
    label: '所在区县',
    format: data => formatHuzhouDistrictFromXzqdm(data.tdgy_xzqdm),
  },
  { code: 'tdgy_zdbh', label: '宗地编号' },
  { code: 'tdgy_tdsyz', label: '土地使用者' },
  { code: 'tdgy_tdzl', label: '土地坐落' },
  { code: 'tdgy_tdyt', label: '土地用途' },
  { code: 'tdgy_gyfs', label: '供应方式' },
  { code: 'tdgy_gdzmj', label: '供地总面积（㎡）' },
  { code: 'tdgy_dxjzmj', label: '地下建筑面积（㎡）' },
  { code: 'tdgy_qdrq', label: '签定日期' },
  { code: 'tdgy_pzwh', label: '批准文号' },
  { code: 'tdgy_pzrq', label: '批准日期' },
  { code: 'tdgy_pzdw', label: '批准单位' },
  { code: 'tdgy_pzjg', label: '批准机关' },
  { code: 'tdgy_crnx', label: '出让年限（年）' },
  { code: 'tdgy_dgsj', label: '动工时间' },
  { code: 'tdgy_jgsj', label: '竣工时间' },
  { code: 'tdgy_lhlsx', label: '绿化率（%）' },
  {
    code: 'tdgy_rjlsx',
    label: '容积率',
    format: data => {
      const hi = data.tdgy_rjlsx;
      const lo = data.tdgy_rjlxx;
      if (hi != null && lo != null && String(hi) !== String(lo)) {
        return `${lo}～${hi}`;
      }
      if (hi != null && String(hi).trim()) return String(hi);
      if (lo != null && String(lo).trim()) return String(lo);
      return '—';
    },
  },
  { code: 'tdgy_jzmdsx', label: '建筑密度（%）' },
  { code: 'tdgy_jzgdsx', label: '建筑高度（m）' },
  { code: 'tdgy_tzxmmc', label: '投资项目名称' },
];

/** 用地规划许可 */
const LAND_USE_PERMIT_DISPLAY_FIELDS: MatterDisplayField[] = [
  { code: 'xmdm', label: '项目代码' },
  { code: 'ydgh_ydxmmc', label: '事项名称' },
  { code: 'ydgh_ydwz', label: '用地位置' },
  { code: 'ydgh_ydxz', label: '用地性质' },
  { code: 'ydgh_yddw', label: '用地单位' },
  { code: 'ydgh_jsgm', label: '建设规模' },
  {
    code: 'ydgh_szqx',
    label: '所在区县',
    format: data => {
      const fromCode = formatHuzhouDistrictFromXzqdm(data.qxdm);
      if (fromCode !== '—') return fromCode;
      if (data.ydgh_szqx != null && String(data.ydgh_szqx).trim()) return String(data.ydgh_szqx);
      return '—';
    },
  },
  { code: 'ydgh_ydmj', label: '用地面积' },
  { code: 'ydgh_fzsj', label: '发证时间' },
  { code: 'ydgh_fzjg', label: '发证机关' },
  { code: 'ydgh_xkzh', label: '许可证号' },
  { code: 'ydgh_yxdzjgh', label: '电子监管号' },
];

/** 土地首次登记（截图无项目代码/事项名称） */
const FIRST_REG_DISPLAY_FIELDS: MatterDisplayField[] = [
  { code: 'bdcdyh', label: '不动产单元号' },
  { code: 'bdcqzh', label: '不动产权证号' },
  { code: 'qlr', label: '权利人' },
  { code: 'gyqk', label: '共有情况' },
  { code: 'zl', label: '坐落' },
  { code: 'qllx', label: '权利类型' },
  { code: 'qlxz', label: '权利性质' },
  { code: 'yt', label: '用途' },
  { code: 'mj', label: '面积（m²）' },
  { code: 'syqx', label: '使用期限' },
  { code: 'fj', label: '附记' },
];

/** 工程规划许可 */
const ENG_PERMIT_DISPLAY_FIELDS: MatterDisplayField[] = [
  { code: 'xmdm', label: '项目代码' },
  { code: 'gcgh_jsxmmc', label: '事项名称' },
  { code: 'gcgh_gclx', label: '工程类型' },
  { code: 'gcgh_jswz', label: '用地位置' },
  { code: 'gcgh_jsgm', label: '建设规模' },
  { code: 'gcgh_jsdmhgt', label: '建设单位' },
  { code: 'gcgh_czzztdmlx', label: '建设单位证件类型' },
  { code: 'gcgh_czzztdm', label: '建设单位证件编号' },
  { code: 'gcgh_zsbm', label: '证书编号' },
  { code: 'gcgh_fzjg', label: '发证机构' },
  { code: 'gcgh_fzrq', label: '发证日期' },
  {
    code: 'gcgh_xzqmc',
    label: '所在区县',
    format: data =>
      data.gcgh_xzqmc
        ? String(data.gcgh_xzqmc)
        : formatHuzhouDistrictFromXzqdm(data.gcgh_xzqhdm),
  },
];

/** 工程施工许可（与产品截图字段顺序、标签一致） */
const CON_PERMIT_DISPLAY_FIELDS: MatterDisplayField[] = [
  { code: 'xmdm', label: '项目代码' },
  { code: 'gcsg_jsdw', label: '建设单位' },
  { code: 'gcsg_fddbr', label: '法定代表人' },
  { code: 'gcsg_shxydm', label: '社会信用代码' },
  { code: 'gcsg_jsxmmc', label: '项目名称' },
  { code: 'gcsg_lxr', label: '联系人' },
  { code: 'gcsg_lxdh', label: '联系电话' },
  { code: 'gcsg_xmdz', label: '项目地址' },
  { code: 'gcsg_xmmj', label: '项目面积（㎡）' },
  { code: 'gcsg_zjzmj', label: '总建筑面积（㎡）' },
  { code: 'gcsg_ds_zdcs', label: '地上最大层数' },
  { code: 'gcsg_dxcs', label: '地下层数' },
  { code: 'gcsg_jsxz', label: '建设性质' },
  { code: 'gcsg_gclx', label: '工程类型' },
  { code: 'gcsg_jglx_cl', label: '结构类型（按材料分）' },
  { code: 'gcsg_jglx_cll', label: '结构类型（按传力分）' },
  { code: 'gcsg_jclx', label: '基础类型' },
  { code: 'gcsg_jnjzbz', label: '建筑节能执行标准' },
  { code: 'gcsg_lsjz_mj', label: '绿色建筑面积（㎡）' },
  { code: 'gcsg_lsjz_xj', label: '绿色建筑星级' },
  { code: 'gcsg_tyngr_mj', label: '太阳能光热（㎡）' },
  { code: 'gcsg_tnygf_kw', label: '太阳能光伏（kW）' },
  { code: 'gcsg_dyrb_mj', label: '地源热泵（㎡）' },
  { code: 'gcsg_jhkgrq', label: '计划开工日期' },
  { code: 'gcsg_jhjgrq', label: '计划竣工日期' },
  { code: 'gcsg_wxxgc', label: '危险性较大工程' },
  { code: 'gcsg_zbhj', label: '周边环境' },
  { code: 'gcsg_kcdw', label: '勘察单位' },
  { code: 'gcsg_kcdw_zzdj', label: '勘察单位资质等级' },
  { code: 'gcsg_kcdw_xmfzr', label: '勘察单位项目负责人' },
  { code: 'gcsg_kcdw_lxdh', label: '勘察单位联系电话' },
  { code: 'gcsg_sjdw', label: '设计单位' },
  { code: 'gcsg_sjdw_zzdj', label: '设计单位资质等级' },
  { code: 'gcsg_sjdw_xmfzr', label: '设计单位项目负责人' },
  { code: 'gcsg_sjdw_lxdh', label: '设计单位联系电话' },
  { code: 'gcsg_sgdw', label: '施工单位' },
  { code: 'gcsg_sgdw_zzdj', label: '施工单位资质等级' },
  { code: 'gcsg_sgdw_xmfzr', label: '施工单位项目负责人' },
  { code: 'gcsg_sgdw_lxdh', label: '施工单位联系电话' },
  { code: 'gcsg_jldw', label: '监理单位' },
  { code: 'gcsg_jldw_zzdj', label: '监理单位资质等级' },
  { code: 'gcsg_jldw_xmfzr', label: '监理单位项目负责人' },
  { code: 'gcsg_jldw_lxdh', label: '监理单位联系电话' },
];

/** 用地复核验收（与产品截图字段顺序、标签一致） */
const LAND_REVIEW_DISPLAY_FIELDS: MatterDisplayField[] = [
  { code: 'xmdm', label: '项目代码' },
  {
    code: 'qxdm',
    label: '所在区县',
    format: data => formatHuzhouDistrictFromXzqdm(data.qxdm),
  },
  { code: 'ydfhys_apply_project_name', label: '事项名称' },
  { code: 'ydfhys_address_detial', label: '建设地点详细地址' },
  { code: 'ydfhys_industry', label: '国标行业' },
  { code: 'ydfhys_the_industry', label: '所属行业' },
  { code: 'ydfhys_construct_nature', label: '建设性质' },
  { code: 'ydfhys_scale_content', label: '建设规模及内容' },
  { code: 'ydfhys_total_land_area', label: '总用地面积（㎡）' },
  { code: 'ydfhys_new_build_area', label: '其中：新建建设用地（㎡）' },
  { code: 'ydfhys_total_build_area', label: '总建筑面积（㎡）' },
  { code: 'ydfhys_over_build_area', label: '其中：地上建筑面积（㎡）' },
  { code: 'ydfhys_under_build_area', label: '地下建筑面积（㎡）' },
  { code: 'ydfhys_land_get_type', label: '土地使用权类型' },
  { code: 'ydfhys_plan_endtime', label: '拟建成时间' },
  { code: 'ydfhys_plan_starttime', label: '拟开工时间' },
  { code: 'ydfhys_owner_name', label: '建设单位名称' },
  { code: 'ydfhys_zsh', label: '证书号' },
];

/** 规划核实 */
const PLAN_VERIFY_DISPLAY_FIELDS: MatterDisplayField[] = [
  { code: 'xmdm', label: '项目代码' },
  { code: 'ghhs_jsxmmc', label: '事项名称' },
  { code: 'ghhs_jsdw', label: '建设单位' },
  { code: 'ghhs_jswz', label: '建设位置' },
  { code: 'ghhs_jsgm', label: '建设规模' },
  { code: 'ghhs_xkzh', label: '规划许可证号' },
  { code: 'ghhs_hfjg', label: '核发机构' },
  { code: 'ghhs_hfrq', label: '核发日期' },
  { code: 'ghhs_dzjgh', label: '电子监管号' },
  { code: 'ghhs_qrsbh', label: '确认书编号' },
  {
    code: 'qxdm',
    label: '所在区县',
    format: data => formatHuzhouDistrictFromXzqdm(data.qxdm),
  },
  { code: 'ydmj', label: '用地面积（m²）' },
];

/** 不动产权证办理（TD/T 1066-2021 字段清单） */
const ESTATE_CERT_DISPLAY_FIELDS: MatterDisplayField[] = [
  { code: 'ywh', label: '业务号' },
  { code: 'xmmc', label: '项目名称' },
  { code: 'xmdm', label: '项目代码' },
  { code: 'dkbh', label: '地块编号' },
  { code: 'ybdcqzh', label: '原不动产权证号' },
  { code: 'sffgdj', label: '是否分割登记' },
  { code: 'bdcdyh', label: '不动产单元号' },
  { code: 'zddm', label: '宗地代码' },
  { code: 'zl', label: '坐落' },
  { code: 'zdmj', label: '宗地面积（㎡）' },
  { code: 'yt', label: '用途' },
  { code: 'rjll', label: '容积率' },
  { code: 'qlrmc', label: '权利人名称' },
  { code: 'qlrlx', label: '权利人类型' },
  { code: 'zjzl', label: '证件种类' },
  { code: 'zjh', label: '证件号' },
  { code: 'qlbl', label: '权利比例' },
  { code: 'gyfs', label: '共有方式' },
  { code: 'qllx', label: '权利类型' },
  { code: 'qlxz', label: '权利性质' },
  { code: 'syqmj', label: '使用权面积（㎡）' },
  { code: 'syqqssj', label: '使用权起始时间' },
  { code: 'syqjssj', label: '使用权结束时间' },
  { code: 'qdjg', label: '取得价格（万元）' },
  { code: 'djlx', label: '登记类型' },
  { code: 'djyy', label: '登记原因' },
  { code: 'djsj', label: '登记时间' },
  { code: 'djjg', label: '登记机构' },
  { code: 'dbr', label: '登簿人' },
  { code: 'qszt', label: '权属状态' },
  { code: 'bdcqzh', label: '不动产权证号' },
  { code: 'fj', label: '附记' },
];

const DISPLAY_FIELDS_BY_MATTER: Partial<Record<MatterStageKey, MatterDisplayField[]>> = {
  'pre-review': PRE_REVIEW_DISPLAY_FIELDS,
  'farmland-conversion': FARMLAND_DISPLAY_FIELDS,
  'land-supply': LAND_SUPPLY_DISPLAY_FIELDS,
  'land-use-permit': LAND_USE_PERMIT_DISPLAY_FIELDS,
  'first-registration': FIRST_REG_DISPLAY_FIELDS,
  'engineering-permit': ENG_PERMIT_DISPLAY_FIELDS,
  'construction-permit': CON_PERMIT_DISPLAY_FIELDS,
  'land-review': LAND_REVIEW_DISPLAY_FIELDS,
  'planning-verification': PLAN_VERIFY_DISPLAY_FIELDS,
  'estate-certificate': ESTATE_CERT_DISPLAY_FIELDS,
};

const DISPLAY_COLUMNS_BY_MATTER: Partial<Record<MatterStageKey, number>> = {
  'pre-review': 3,
  'farmland-conversion': 3,
  'land-supply': 3,
  'land-use-permit': 3,
  'first-registration': 3,
  'engineering-permit': 3,
  'construction-permit': 3,
  'land-review': 3,
  'planning-verification': 3,
  'estate-certificate': 3,
};

export function getMatterDisplayFields(matterKey: MatterStageKey): MatterDisplayField[] | undefined {
  return DISPLAY_FIELDS_BY_MATTER[matterKey];
}

/** 按 code 在事项展示字段中查找（保留 format 等） */
export function findMatterDisplayField(
  matterKey: MatterStageKey,
  code: string,
): MatterDisplayField | undefined {
  return getMatterDisplayFields(matterKey)?.find(f => f.code === code);
}

export function getMatterDisplayColumns(matterKey: MatterStageKey): number {
  return DISPLAY_COLUMNS_BY_MATTER[matterKey] ?? 3;
}

export function formatMatterDisplayValue(
  field: MatterDisplayField,
  data: MatterStageRecord,
): string {
  if (field.format) return field.format(data);
  const v = data[field.code];
  if (v == null || v === '') return '—';
  return String(v);
}
