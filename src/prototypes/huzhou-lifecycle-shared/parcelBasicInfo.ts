/**
 * 地块详情 · 顶栏基本信息（对齐产品截图 24 项 / projectdata）
 *
 * ⚠️ 维护契约（换 Agent 也请先读此处）
 * 1. 全量顺序：只改 BASIC_INFO_DESCRIPTION_LAYOUT 一处（自上而下 = 阅读顺序）
 * 2. 详情左栏：全量 Descriptions 单列 + 独立纵向滚动（不藏行、不重排）
 * 3. expandOnly 仅用于建管列表默认列等派生，不参与详情藏行
 * 4. 禁止 display:none 藏行 / filter items / 多张 Descriptions
 */
import {
  getFieldsByGroup,
  orderedFieldGroups,
  PARCEL_TABLE_SCHEMAS,
  type FieldGroup,
  type ParcelFieldDef,
} from './parcelFieldSchema';
import { formatHuzhouDistrictDisplay } from './huzhouDistricts';
import type { ParcelLifecycle } from './types';

const EXCLUDED_CODES = new Set(['id']);

export type ParcelBasicInfoFieldDef = {
  label: string;
  stageCode?: string;
  parcelKey?: keyof ParcelLifecycle;
  /** 无台账数据时的固定展示值 */
  staticValue?: string;
  multiline?: boolean;
  ellipsis?: boolean;
  /** Descriptions column=2 时占满整行 */
  span?: number;
  /** 项目属地 / 建设地点：仅湖州市五区县，并以卡片同款区划标签展示 */
  districtTag?: boolean;
  /** 布局中间段标记（仅列表默认列等派生，详情收起不藏行） */
  expandOnly?: boolean;
};

/** 内容较长、需独占一行的字段（按字段 code，非标签字数） */
const FULL_ROW_CODES = new Set([
  'apply_project_name',
  'scale_content',
  'address_detial',
  'owner_address',
  'owner_name',
]);

const PARCEL_KEY_BY_CODE: Partial<Record<string, keyof ParcelLifecycle>> = {
  apply_project_name: 'name',
  project_code: 'projectCode',
  address_detial: 'address',
};

function fieldDefFromSchema(f: ParcelFieldDef, labelOverride?: string): ParcelBasicInfoFieldDef {
  return {
    label: labelOverride ?? f.label,
    stageCode: f.code,
    parcelKey: PARCEL_KEY_BY_CODE[f.code],
    multiline: f.code === 'scale_content',
    ellipsis: f.code === 'apply_project_name' || f.code === 'scale_content',
    span: FULL_ROW_CODES.has(f.code) ? 2 : 1,
  };
}

function def(
  code: string,
  labelOverride?: string,
  extra?: Partial<ParcelBasicInfoFieldDef>,
): ParcelBasicInfoFieldDef {
  const schema = PARCEL_TABLE_SCHEMAS.projectdata;
  const f = schema?.fields.find(x => x.code === code);
  if (f) {
    return { ...fieldDefFromSchema(f, labelOverride), ...extra };
  }
  return { label: labelOverride ?? code, stageCode: code, ...extra };
}

/** 无 stageCode 的静态项注册表 */
const BASIC_INFO_STATIC_FIELDS: Record<string, ParcelBasicInfoFieldDef> = {
  data_source: { label: '数据来源', staticValue: '投资3.0' },
  build_place: { label: '建设地点', parcelKey: 'region', districtTag: true },
};

export type BasicInfoLayoutEntry =
  | { kind: 'field'; code: string; expandedOnly?: boolean }
  | { kind: 'static'; key: keyof typeof BASIC_INFO_STATIC_FIELDS; expandedOnly?: boolean }
  | { kind: 'anchor'; key: 'legal_person' | 'current_stage'; expandedOnly?: boolean };

/** 全量布局末段起点（开发期校验：此前为 expandedOnly 连续段） */
export const BASIC_INFO_TAIL_START_CODE = 'address_detial' as const;

/** 详情收起裁切行标签（与 getBasicInfoCurrentStageField().label 一致） */
export const BASIC_INFO_COLLAPSE_CLIP_LABEL = '当前阶段';

/**
 * 基本信息唯一布局（自上而下 = 展开阅读顺序；收起不改动此顺序）
 */
export const BASIC_INFO_DESCRIPTION_LAYOUT: readonly BasicInfoLayoutEntry[] = [
  { kind: 'field', code: 'apply_project_name' },
  { kind: 'field', code: 'project_code' },
  { kind: 'field', code: 'project_class' },
  { kind: 'field', code: 'construct_nature' },
  { kind: 'field', code: 'industry' },
  { kind: 'field', code: 'total_fund' },
  { kind: 'anchor', key: 'current_stage' },
  { kind: 'static', key: 'data_source', expandedOnly: true },
  { kind: 'field', code: 'place_code_detail', expandedOnly: true },
  { kind: 'field', code: 'the_industry', expandedOnly: true },
  { kind: 'static', key: 'build_place', expandedOnly: true },
  { kind: 'field', code: 'apply_time', expandedOnly: true },
  { kind: 'field', code: 'plan_starttime', expandedOnly: true },
  { kind: 'field', code: 'fund_source', expandedOnly: true },
  { kind: 'field', code: 'total_land_area', expandedOnly: true },
  { kind: 'field', code: 'total_build_area', expandedOnly: true },
  { kind: 'field', code: 'over_build_area', expandedOnly: true },
  { kind: 'field', code: 'owner_legaperson_certtype', expandedOnly: true },
  { kind: 'field', code: 'owner_legaperson_certno', expandedOnly: true },
  { kind: 'field', code: 'plan_endtime', expandedOnly: true },
  { kind: 'anchor', key: 'legal_person', expandedOnly: true },
  { kind: 'field', code: 'address_detial' },
  { kind: 'field', code: 'owner_name' },
  { kind: 'field', code: 'scale_content' },
  { kind: 'field', code: 'owner_address' },
];

function isExpandedOnlyEntry(entry: BasicInfoLayoutEntry): boolean {
  return entry.expandedOnly === true;
}

function tailLayoutIndex(): number {
  return BASIC_INFO_DESCRIPTION_LAYOUT.findIndex(
    e => e.kind === 'field' && e.code === BASIC_INFO_TAIL_START_CODE,
  );
}

/** Descriptions 行锚点 */
export const BASIC_INFO_ROW_CURRENT_STAGE = '__current_stage__' as const;
export const BASIC_INFO_ROW_LEGAL_PERSON = '__legal_person__' as const;

/** 详情收起视口裁切锚点（裁到该行底，以下仍在 DOM 仅被 overflow 遮住） */
export const BASIC_INFO_COLLAPSE_CLIP_AFTER = BASIC_INFO_ROW_CURRENT_STAGE;

/** 锚点行之后收起仍可见的 Descriptions 行数（含数据来源→建设地点共 4 行） */
export const BASIC_INFO_COLLAPSE_EXTRA_VISIBLE_ROWS = 4;

/** 收起视口在量高后再收矮的像素（相对 EXTRA 行裁切结果） */
export const BASIC_INFO_COLLAPSE_HEIGHT_TRIM_PX = 144;

export function basicInfoHasExpandableRange(): boolean {
  const clipIdx = BASIC_INFO_DESCRIPTION_LAYOUT.findIndex(
    e => e.kind === 'anchor' && e.key === 'current_stage',
  );
  return clipIdx >= 0 && clipIdx < BASIC_INFO_DESCRIPTION_LAYOUT.length - 1;
}

export function getBasicInfoLegalPersonField(): ParcelBasicInfoFieldDef {
  return def('owner_legalperson_name', '法人代表');
}

export function getBasicInfoCurrentStageField(): ParcelBasicInfoFieldDef {
  return { label: '当前阶段', stageCode: BASIC_INFO_ROW_CURRENT_STAGE, span: 1 };
}

export function isBasicInfoAnchorField(field: ParcelBasicInfoFieldDef): boolean {
  return (
    field.stageCode === BASIC_INFO_ROW_CURRENT_STAGE ||
    field.stageCode === BASIC_INFO_ROW_LEGAL_PERSON
  );
}

/** 产品截图展示名（覆盖 schema 默认 label） */
const FIELD_LABEL_OVERRIDES: Partial<Record<string, string>> = {
  total_fund: '总投资(万元)',
  scale_content: '建设规模与建设内容',
  place_code_detail: '项目属地',
  address_detial: '详细地址',
  total_land_area: '总用地(m²)',
  total_build_area: '总建筑面积(m²)',
  over_build_area: '地上建筑面积(m²)',
  fund_source: '资金来源(万元)',
};

const FIELD_DEF_EXTRAS: Partial<Record<string, Partial<ParcelBasicInfoFieldDef>>> = {
  apply_project_name: { ellipsis: true },
  scale_content: { multiline: true, ellipsis: true },
  place_code_detail: { parcelKey: 'region', districtTag: true },
  address_detial: { ellipsis: true },
  owner_address: { ellipsis: true },
};

function tagExpandOnly(
  field: ParcelBasicInfoFieldDef,
  entry: BasicInfoLayoutEntry,
): ParcelBasicInfoFieldDef {
  return isExpandedOnlyEntry(entry) ? { ...field, expandOnly: true } : field;
}

function resolveLayoutEntry(entry: BasicInfoLayoutEntry): ParcelBasicInfoFieldDef {
  if (entry.kind === 'anchor') {
    if (entry.key === 'legal_person') {
      return tagExpandOnly(
        {
          ...getBasicInfoLegalPersonField(),
          stageCode: BASIC_INFO_ROW_LEGAL_PERSON,
          span: 1,
        },
        entry,
      );
    }
    if (entry.key === 'current_stage') {
      return tagExpandOnly(getBasicInfoCurrentStageField(), entry);
    }
  }
  if (entry.kind === 'static') {
    return tagExpandOnly(BASIC_INFO_STATIC_FIELDS[entry.key], entry);
  }
  const labelOverride = FIELD_LABEL_OVERRIDES[entry.code];
  return tagExpandOnly(def(entry.code, labelOverride, FIELD_DEF_EXTRAS[entry.code]), entry);
}

/** 详情 Descriptions / 列表列顺序：全量一条 */
export function getBasicInfoDescriptionFields(): ParcelBasicInfoFieldDef[] {
  return BASIC_INFO_DESCRIPTION_LAYOUT.map(resolveLayoutEntry);
}

/** 列表默认可见列等：非 expandOnly 的字段（与详情视口裁切无关） */
export function getBasicInfoCollapsedVisibleFields(): ParcelBasicInfoFieldDef[] {
  return getBasicInfoDescriptionFields().filter(f => !f.expandOnly);
}

function dataFieldStageCodes(fields: ParcelBasicInfoFieldDef[]): string[] {
  return fields
    .map(f => f.stageCode)
    .filter(
      (code): code is string =>
        Boolean(code) &&
        code !== BASIC_INFO_ROW_CURRENT_STAGE &&
        code !== BASIC_INFO_ROW_LEGAL_PERSON,
    );
}

/** 开发期：列表默认列字段 code 必须是全量的子序列 */
function assertBasicInfoCollapsedOrderSubset(): void {
  const collapsed = dataFieldStageCodes(getBasicInfoCollapsedVisibleFields());
  const expanded = dataFieldStageCodes(getBasicInfoDescriptionFields());
  let j = 0;
  for (const code of collapsed) {
    while (j < expanded.length && expanded[j] !== code) {
      j += 1;
    }
    if (j >= expanded.length) {
      console.error(
        '[parcelBasicInfo] 列表默认列顺序与全量布局不一致，请只改 BASIC_INFO_DESCRIPTION_LAYOUT:',
        code,
      );
      return;
    }
    j += 1;
  }
}

/** 布局中所有 projectdata 字段 code */
export function getBasicInfoLayoutFieldCodes(): string[] {
  return BASIC_INFO_DESCRIPTION_LAYOUT.filter(
    (e): e is BasicInfoLayoutEntry & { kind: 'field' } => e.kind === 'field',
  ).map(e => e.code);
}

/** 收起态可见的 projectdata 字段 code（不含锚点） */
export function getBasicInfoCollapsedFieldCodes(): string[] {
  return dataFieldStageCodes(getBasicInfoCollapsedVisibleFields());
}

/** @deprecated 使用 getBasicInfoCollapsedVisibleFields */
export function getBasicInfoCompactFields(): ParcelBasicInfoFieldDef[] {
  return getBasicInfoCollapsedVisibleFields();
}

/** @deprecated 使用 getBasicInfoDescriptionFields */
export function getBasicInfoStandardDescriptionFields(): ParcelBasicInfoFieldDef[] {
  return getBasicInfoDescriptionFields();
}

/** @deprecated 使用 getBasicInfoCollapsedVisibleFields */
export function getBasicInfoCollapsedDescriptionFields(): ParcelBasicInfoFieldDef[] {
  return getBasicInfoCollapsedVisibleFields();
}

/** @deprecated 使用 getBasicInfoDescriptionFields */
export function getBasicInfoDisplayFields(): ParcelBasicInfoFieldDef[] {
  return getBasicInfoDescriptionFields();
}

/** @deprecated 使用 getBasicInfoDescriptionFields */
export function getBasicInfoExpandedDescriptionFields(): ParcelBasicInfoFieldDef[] {
  return getBasicInfoDescriptionFields();
}

export type ParcelBasicInfoGroup = {
  group: FieldGroup;
  fields: ParcelBasicInfoFieldDef[];
};

function fieldDefFromSchemaFull(f: ParcelFieldDef): ParcelBasicInfoFieldDef {
  return fieldDefFromSchema(f);
}

/** 展开更多：projectdata 中未出现在顶栏 24 项的字段 */
export function getProjectBasicInfoMoreGroups(): ParcelBasicInfoGroup[] {
  const schema = PARCEL_TABLE_SCHEMAS.projectdata;
  if (!schema) return [];
  const shown = new Set([
    ...getBasicInfoLayoutFieldCodes(),
    getBasicInfoLegalPersonField().stageCode,
  ].filter(Boolean) as string[]);
  const byGroup = getFieldsByGroup(schema);
  return orderedFieldGroups(schema)
    .map(group => ({
      group,
      fields: byGroup[group]
        .filter(f => !EXCLUDED_CODES.has(f.code) && !shown.has(f.code))
        .map(fieldDefFromSchemaFull),
    }))
    .filter(g => g.fields.length > 0);
}

export function countProjectBasicInfoMoreFields(): number {
  return getProjectBasicInfoMoreGroups().reduce((n, g) => n + g.fields.length, 0);
}

export function getProjectBaseData(
  parcel: ParcelLifecycle,
): Record<string, string | number | null> | undefined {
  return parcel.stages['project-base'];
}

export function resolveParcelBasicInfoValue(
  parcel: ParcelLifecycle,
  field: ParcelBasicInfoFieldDef,
): string | number | null | undefined {
  if (field.staticValue) return field.staticValue;
  const base = getProjectBaseData(parcel);
  if (field.stageCode && base?.[field.stageCode] != null && base[field.stageCode] !== '') {
    return base[field.stageCode];
  }
  if (field.parcelKey) {
    const v = parcel[field.parcelKey];
    if (typeof v === 'string' || typeof v === 'number') return v;
  }
  return undefined;
}

export function formatParcelBasicInfoValue(
  v: string | number | null | undefined,
  field?: ParcelBasicInfoFieldDef,
): string {
  if (field?.districtTag) {
    return formatHuzhouDistrictDisplay(v);
  }
  if (v == null || v === '') return '—';
  return String(v);
}

function assertBasicInfoLayoutStructure(): void {
  const tailIdx = tailLayoutIndex();
  if (tailIdx < 0) {
    console.error('[parcelBasicInfo] 底栏起点 address_detial 未出现在 BASIC_INFO_DESCRIPTION_LAYOUT');
    return;
  }
  const afterTail = BASIC_INFO_DESCRIPTION_LAYOUT.slice(tailIdx);
  if (afterTail.some(isExpandedOnlyEntry)) {
    console.error('[parcelBasicInfo] 底栏四字段之后不得有 expandedOnly 项');
  }
  const beforeTail = BASIC_INFO_DESCRIPTION_LAYOUT.slice(0, tailIdx);
  if (!beforeTail.some(isExpandedOnlyEntry)) {
    console.error('[parcelBasicInfo] 底栏之前应有 expandedOnly 中间段');
  }
  const expandIdx = BASIC_INFO_DESCRIPTION_LAYOUT.map((e, i) =>
    isExpandedOnlyEntry(e) ? i : -1,
  ).filter(i => i >= 0);
  if (expandIdx.length > 0) {
    for (let k = 1; k < expandIdx.length; k += 1) {
      if (expandIdx[k] !== expandIdx[k - 1] + 1) {
        console.error('[parcelBasicInfo] expandedOnly 中间段在布局中必须连续');
        break;
      }
    }
  }
}

if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
  assertBasicInfoLayoutStructure();
  assertBasicInfoCollapsedOrderSubset();
}
