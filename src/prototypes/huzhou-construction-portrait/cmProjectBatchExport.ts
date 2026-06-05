/**
 * 建设工程画像 · 批量导出（Excel + 地块矢量数据 GeoJSON + AES 加密附件 zip）
 */
import * as XLSX from 'xlsx';
import { BlobWriter, Uint8ArrayReader, ZipWriter, configure } from '@zip.js/zip.js';
import type { Feature, FeatureCollection } from 'geojson';
import {
  findMatterDisplayField,
  formatMatterDisplayValue,
} from '../huzhou-lifecycle-shared/matterDisplayFields';
import { resolveCmBasicInfoCellText, basicInfoFieldToTableColumnKey, CM_PROJECT_TABLE_PHASE_KEY } from '../huzhou-lifecycle-shared/cmProjectBasicInfo';
import { resolveMatterForCmPhase } from '../huzhou-lifecycle-shared/cmPhaseAccent';
import { getMatterStageRecords } from '../huzhou-lifecycle-shared/matterStageData';
import { normalizeHuzhouDistrictLabel } from '../huzhou-lifecycle-shared/huzhouDistricts';
import { getParcelById } from '../huzhou-lifecycle-shared/mock/demoParcels';
import { boundsToPolygonFeature, resolveParcelMapBounds } from '../huzhou-lifecycle-shared/parcelGeoMap';
import { getBasicInfoDescriptionFields } from '../huzhou-lifecycle-shared/parcelBasicInfo';
import type { ParcelAttachment, ParcelLifecycle } from '../huzhou-lifecycle-shared/types';
import { getLanduseFeatureByOsmId } from '../huzhou-spatial-portrait/huzhouMapConstants';
import { saveWorkbookAsXlsxFile } from '../shared/facilityTableXlsxExport';
import {
  getCmProjectExportDefaultFieldKeys,
  getCmProjectExportFieldOptions,
  orderSelectedExportFields,
  parsePhaseExportFieldKey,
  getSelectedPhaseAttachmentKeys,
  type CmProjectExportFieldOption,
} from './cmProjectExportSchema';
import { CM_PHASE_LABELS, type CmPhaseAccentKey } from '../huzhou-lifecycle-shared/cmPhaseAccent';
import { getPhaseMetric } from './mock/phaseDistribution';
import {
  buildConstructionProjectSnapshot,
  mergeParcelForConstructionProject,
} from './mock/constructionProjectParcel';
import { resolveProjectParcelId, getProjectById } from './mock/projects';
import type { ConstructionProject } from './types';
import type { CmProjectExportRecord } from './cmProjectExportRecords';

export type { CmProjectExportFieldGroup, CmProjectExportFieldOption } from './cmProjectExportSchema';
export {
  getCmProjectExportDefaultFieldKeys,
  getCmProjectExportFieldGroups,
  getCmProjectExportFieldOptions,
} from './cmProjectExportSchema';

configure({ useWebWorkers: false });

export type CmProjectBatchExportResult = {
  password: string;
  fileName: string;
};

export type CmProjectBatchExportOptions = {
  /** 重复下载时使用原文件名 */
  fileName?: string;
  /** 重复下载时使用原解压密码 */
  password?: string;
};

function strToU8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function generateExportZipPassword(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, b => chars[b % chars.length]).join('');
}

async function buildPasswordProtectedZipBlob(
  zipEntries: Record<string, Uint8Array>,
  password: string,
): Promise<Blob> {
  const blobWriter = new BlobWriter('application/zip');
  const zipWriter = new ZipWriter(blobWriter, {
    password,
    encryptionStrength: 3,
    zipCrypto: false,
    level: 6,
  });
  for (const [path, data] of Object.entries(zipEntries)) {
    await zipWriter.add(path, new Uint8ArrayReader(data));
  }
  await zipWriter.close();
  return blobWriter.getData();
}

function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function fileStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;
}

function sanitizePathSegment(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || '未命名';
}

function resolveExportParcel(project: ConstructionProject): ParcelLifecycle | undefined {
  const base = getParcelById(resolveProjectParcelId(project));
  if (!base) return undefined;
  return mergeParcelForConstructionProject(base, project);
}

function resolveBasicExportCellText(
  project: ConstructionProject,
  parcel: ParcelLifecycle | undefined,
  fieldKey: string,
): string {
  const snapshot = buildConstructionProjectSnapshot(project);
  if (fieldKey === CM_PROJECT_TABLE_PHASE_KEY) {
    return getPhaseMetric(project.phaseKey).label;
  }
  const fieldDef = getBasicInfoDescriptionFields().find(
    f => basicInfoFieldToTableColumnKey(f) === fieldKey,
  );
  if (!fieldDef) return '—';
  return resolveCmBasicInfoCellText(parcel, fieldDef, snapshot);
}

function resolvePhaseExportCellText(
  parcel: ParcelLifecycle | undefined,
  fieldKey: string,
): string {
  const parsed = parsePhaseExportFieldKey(fieldKey);
  if (!parsed || !parcel) return '—';
  const matterKey = resolveMatterForCmPhase(parcel, parsed.phaseKey);
  const field = findMatterDisplayField(matterKey, parsed.fieldCode);
  if (!field) return '—';
  const record = getMatterStageRecords(parcel, matterKey)[0];
  if (!record) return '—';
  return formatMatterDisplayValue(field, record);
}

function resolveExportCellText(
  project: ConstructionProject,
  fieldKey: string,
): string {
  const parcel = resolveExportParcel(project);
  if (fieldKey.startsWith('phase:')) {
    return resolvePhaseExportCellText(parcel, fieldKey);
  }
  return resolveBasicExportCellText(project, parcel, fieldKey);
}

/** 主标题 + 副标题两行表头，各阶段与基本信息同级主标题 */
function buildGroupedHeaderSheet(
  projects: ConstructionProject[],
  columns: CmProjectExportFieldOption[],
): XLSX.WorkSheet {
  const rowMain: string[] = [];
  const rowSub: string[] = [];
  const merges: XLSX.Range[] = [];

  let col = 0;
  let i = 0;
  while (i < columns.length) {
    const groupTitle = columns[i].groupTitle;
    const groupStart = col;
    while (i < columns.length && columns[i].groupTitle === groupTitle) {
      rowMain.push(col === groupStart ? groupTitle : '');
      rowSub.push(columns[i].label);
      col += 1;
      i += 1;
    }
    const groupEnd = col - 1;
    if (groupEnd > groupStart) {
      merges.push({ s: { r: 0, c: groupStart }, e: { r: 0, c: groupEnd } });
    }
  }

  const dataRows = projects.map(project => columns.map(col => resolveExportCellText(project, col.key)));
  const ws = XLSX.utils.aoa_to_sheet([rowMain, rowSub, ...dataRows]);
  if (merges.length > 0) {
    ws['!merges'] = merges;
  }
  return ws;
}

function buildExcelWorkbook(
  projects: ConstructionProject[],
  selectedFieldKeys: string[],
): XLSX.WorkBook {
  const allKeys = new Set(getCmProjectExportFieldOptions().map(f => f.key));
  const keys =
    selectedFieldKeys.length > 0
      ? selectedFieldKeys.filter(k => allKeys.has(k))
      : getCmProjectExportDefaultFieldKeys();
  const columns = orderSelectedExportFields(keys);
  const ws = buildGroupedHeaderSheet(projects, columns);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '建设工程项目');
  return wb;
}

function workbookToUint8Array(wb: XLSX.WorkBook): Uint8Array {
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return new Uint8Array(buf);
}

function attachmentPlaceholderContent(doc: ParcelAttachment, project: ConstructionProject): string {
  return [
    '【演示附件占位 · 原型导出】',
    `所属项目：${project.name}`,
    `文件名称：${doc.name}`,
    `资料类型：${doc.type}`,
    `文件大小：${doc.fileSize ?? '—'}`,
    `上传时间：${doc.date || '—'}`,
    `上传人：${doc.uploader ?? '—'}`,
    doc.matterName ? `关联事项：${doc.matterName}` : '',
    '',
    '正式环境将打包真实附件文件；当前原型以文本占位演示目录结构。',
  ]
    .filter(Boolean)
    .join('\n');
}

function resolveProjectAttachments(project: ConstructionProject): ParcelAttachment[] {
  const parcel = getParcelById(resolveProjectParcelId(project));
  return parcel?.attachments ?? [];
}

function attachmentBelongsToPhase(doc: ParcelAttachment, phaseKey: CmPhaseAccentKey): boolean {
  const label = CM_PHASE_LABELS[phaseKey];
  return doc.matterName === label;
}

function filterAttachmentsForExport(
  attachments: ParcelAttachment[],
  selectedPhaseKeys: CmPhaseAccentKey[],
): ParcelAttachment[] {
  if (selectedPhaseKeys.length === 0) return [];
  const phaseSet = new Set(selectedPhaseKeys);
  return attachments.filter(doc =>
    [...phaseSet].some(phaseKey => attachmentBelongsToPhase(doc, phaseKey)),
  );
}

function resolveDistrictFolder(project: ConstructionProject): string {
  return normalizeHuzhouDistrictLabel(project.region) ?? '其他区划';
}

function buildProjectExportFeatureProperties(
  project: ConstructionProject,
  parcel: ParcelLifecycle,
): Record<string, string> {
  return {
    projectId: project.id,
    projectName: project.name,
    region: project.region,
    parcelId: resolveProjectParcelId(project),
    unifiedCode: project.unifiedCode ?? '',
    phaseKey: project.phaseKey,
    phaseLabel: getPhaseMetric(project.phaseKey).label,
    mapFeatureId: parcel.mapFeatureId?.trim() ?? '',
  };
}

/** 按项目解析地块面（土地利用 GeoJSON 优先，否则 mapBounds 矩形兜底） */
function resolveProjectExportFeature(project: ConstructionProject): Feature | null {
  const parcel = resolveExportParcel(project) ?? getParcelById(resolveProjectParcelId(project));
  if (!parcel) return null;

  const exportProps = buildProjectExportFeatureProperties(project, parcel);
  const osmId = parcel.mapFeatureId?.trim();
  if (osmId) {
    const landuse = getLanduseFeatureByOsmId(osmId);
    if (landuse?.geometry) {
      return {
        type: 'Feature',
        geometry: landuse.geometry,
        properties: {
          ...(typeof landuse.properties === 'object' && landuse.properties != null
            ? landuse.properties
            : {}),
          ...exportProps,
        },
      };
    }
  }

  const bounds = resolveParcelMapBounds(parcel);
  if (!bounds) return null;
  const box = boundsToPolygonFeature(bounds);
  return {
    ...box,
    properties: {
      ...(typeof box.properties === 'object' && box.properties != null ? box.properties : {}),
      ...exportProps,
    },
  };
}

function buildExportParcelFeatureCollection(projects: ConstructionProject[]): FeatureCollection {
  const features = projects
    .map(project => resolveProjectExportFeature(project))
    .filter((feature): feature is Feature => feature != null);
  return { type: 'FeatureCollection', features };
}

function geoJsonToUint8Array(fc: FeatureCollection): Uint8Array {
  return strToU8(JSON.stringify(fc, null, 2));
}

export async function downloadCmProjectBatchExportZip(
  projects: ConstructionProject[],
  selectedFieldKeys: string[],
  options?: CmProjectBatchExportOptions,
): Promise<CmProjectBatchExportResult> {
  if (projects.length === 0) {
    throw new Error('没有可导出的项目');
  }

  const fileName = options?.fileName ?? `建设工程项目批量导出_${fileStamp()}.zip`;
  const password = options?.password ?? generateExportZipPassword();

  const wb = buildExcelWorkbook(projects, selectedFieldKeys);
  const zipEntries: Record<string, Uint8Array> = {
    '建设工程项目清单.xlsx': workbookToUint8Array(wb),
    '地块矢量数据.geojson': geoJsonToUint8Array(buildExportParcelFeatureCollection(projects)),
  };

  const selectedAttachmentPhases = getSelectedPhaseAttachmentKeys(selectedFieldKeys);

  for (const project of projects) {
    const district = resolveDistrictFolder(project);
    const projectDir = sanitizePathSegment(project.name);
    const attachments = filterAttachmentsForExport(
      resolveProjectAttachments(project),
      selectedAttachmentPhases,
    );
    const base = `附件/${district}/${projectDir}`;

    if (selectedAttachmentPhases.length === 0) {
      continue;
    }

    if (attachments.length === 0) {
      zipEntries[`${base}/（所选阶段暂无资料）.txt`] = strToU8(
        `项目「${project.name}」在所选阶段下暂无档案资料。\n`,
      );
      continue;
    }

    for (const doc of attachments) {
      const fileName = sanitizePathSegment(doc.name);
      zipEntries[`${base}/${fileName}.txt`] = strToU8(
        attachmentPlaceholderContent(doc, project),
      );
    }
  }

  const blob = await buildPasswordProtectedZipBlob(zipEntries, password);
  triggerBlobDownload(blob, fileName);
  return { password, fileName };
}

export function downloadCmProjectBatchExportExcel(
  projects: ConstructionProject[],
  selectedFieldKeys: string[],
): void {
  const wb = buildExcelWorkbook(projects, selectedFieldKeys);
  saveWorkbookAsXlsxFile(wb, `建设工程项目清单_${fileStamp()}.xlsx`);
}

/** 按导出记录重复下载（沿用原文件名与解压密码） */
export async function redownloadCmProjectExportRecord(record: CmProjectExportRecord): Promise<void> {
  const projects = record.projectIds
    .map(id => getProjectById(id))
    .filter((p): p is ConstructionProject => p != null);
  if (projects.length === 0) {
    throw new Error('项目数据已不可用，无法重新下载');
  }
  const fieldKeys =
    record.fieldKeys.length > 0 ? record.fieldKeys : getCmProjectExportDefaultFieldKeys();
  await downloadCmProjectBatchExportZip(projects, fieldKeys, {
    fileName: record.fileName,
    password: record.password,
  });
}
