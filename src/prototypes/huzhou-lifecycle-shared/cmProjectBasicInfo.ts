/**
 * 建设工程画像 · 详情基本信息与项目列表表格字段对齐
 */
import {
  BASIC_INFO_ROW_CURRENT_STAGE,
  BASIC_INFO_ROW_LEGAL_PERSON,
  formatParcelBasicInfoValue,
  getBasicInfoCollapsedVisibleFields,
  getBasicInfoDescriptionFields,
  getBasicInfoLegalPersonField,
  resolveParcelBasicInfoValue,
} from './parcelBasicInfo';
import type { ParcelBasicInfoFieldDef } from './parcelBasicInfo';
import type { ParcelLifecycle } from './types';

export type ConstructionProjectBasicInfoSnapshot = {
  name: string;
  region: string;
  unifiedCode?: string;
  applyDate?: string;
  address?: string;
  projectClass?: string;
  constructNature?: string;
  industry?: string;
  theIndustry?: string;
  totalFund?: string;
  fundSource?: string;
  planStart?: string;
  planEnd?: string;
  totalLandArea?: string;
  totalBuildArea?: string;
  overBuildArea?: string;
  ownerName?: string;
  ownerLegalName?: string;
  ownerLegalCertType?: string;
  ownerLegalCertNo?: string;
  ownerAddress?: string;
  scaleContent?: string;
};

/** 列表「当前阶段」列 key（对应布局 anchor current_stage） */
export const CM_PROJECT_TABLE_PHASE_KEY = 'phase';

/** 收起态与项目列表快照可对齐的 stageCode */
const SNAPSHOT_FIELD_BY_STAGE_CODE: Partial<
  Record<string, keyof ConstructionProjectBasicInfoSnapshot>
> = {
  apply_project_name: 'name',
  project_code: 'unifiedCode',
  project_class: 'projectClass',
  construct_nature: 'constructNature',
  industry: 'industry',
  the_industry: 'theIndustry',
  total_fund: 'totalFund',
  fund_source: 'fundSource',
  plan_starttime: 'planStart',
  plan_endtime: 'planEnd',
  total_land_area: 'totalLandArea',
  total_build_area: 'totalBuildArea',
  over_build_area: 'overBuildArea',
  owner_name: 'ownerName',
  owner_legalperson_name: 'ownerLegalName',
  owner_legaperson_certtype: 'ownerLegalCertType',
  owner_legaperson_certno: 'ownerLegalCertNo',
  owner_address: 'ownerAddress',
  scale_content: 'scaleContent',
  address_detial: 'address',
  apply_time: 'applyDate',
};

/** 布局字段 → 表格列 key（锚点映射为 phase / owner_legalperson_name） */
export function basicInfoFieldToTableColumnKey(
  field: ParcelBasicInfoFieldDef,
): string | undefined {
  if (field.stageCode === BASIC_INFO_ROW_CURRENT_STAGE) {
    return CM_PROJECT_TABLE_PHASE_KEY;
  }
  if (field.stageCode === BASIC_INFO_ROW_LEGAL_PERSON) {
    return getBasicInfoLegalPersonField().stageCode;
  }
  if (field.stageCode) return field.stageCode;
  return undefined;
}

/** 列表可配置数据列顺序 = BASIC_INFO_DESCRIPTION_LAYOUT 展开态 */
export function getCmProjectTableDataFieldDefs(): ParcelBasicInfoFieldDef[] {
  return getBasicInfoDescriptionFields();
}

/** overlay 列表默认可见列 = 非 expandOnly 字段（含当前阶段） */
export function getCmProjectTableDefaultVisibleColumnKeys(): string[] {
  return getBasicInfoCollapsedVisibleFields()
    .map(basicInfoFieldToTableColumnKey)
    .filter((k): k is string => Boolean(k));
}

export function resolveCmBasicInfoCellText(
  parcel: ParcelLifecycle | undefined,
  fieldDef: ParcelBasicInfoFieldDef,
  snapshot?: ConstructionProjectBasicInfoSnapshot,
): string {
  const stageCode = fieldDef.stageCode;
  if (stageCode && snapshot) {
    const snapKey = SNAPSHOT_FIELD_BY_STAGE_CODE[stageCode];
    if (snapKey) {
      const v = snapshot[snapKey];
      if (v != null && v !== '') return String(v);
    }
    if (fieldDef.parcelKey === 'region' && snapshot.region) {
      return formatParcelBasicInfoValue(snapshot.region, fieldDef);
    }
    if (stageCode === 'place_code_detail' && snapshot.region) {
      return formatParcelBasicInfoValue(snapshot.region, fieldDef);
    }
  }
  if (!parcel) return '—';
  return formatParcelBasicInfoValue(
    resolveParcelBasicInfoValue(parcel, fieldDef),
    fieldDef,
  );
}
