/**
 * 设施管理 / 配置中心等列表：全量列导出 Excel（与泵站导出同一 xlsx 依赖）。
 * 列定义仅需 key、title、dataIndex；操作列 key 为 `operation` 时自动跳过。
 */
import * as XLSX from 'xlsx';
import { getShaoshanAddvcdLabel } from '../生态整治/riverChiefDb4401';
import { PUMP_QUICK_DOC_LABEL } from '../韶山水环境设施管理系统/pump-station-documents';
import { PLANT_QUICK_DOC_LABEL } from '../韶山水环境设施管理系统/plant-station-documents';

export type ExportColumnDef = {
  key: string;
  title: string;
  dataIndex?: string;
};

/** 全项目通用英文字段 -> 中文表头映射（全量字段导出时兜底使用） */
const EXPORT_FIELD_LABEL_MAP: Record<string, string> = {
  adminDivision: '行政区划代码',
  addvcd: '行政区划代码',
  region: '行政区划代码',
  regionName: '行政区划',
  location: '位置',
  longitude: '经度',
  latitude: '纬度',
  startDate: '开始时间',
  endDate: '结束时间',
  description: '描述',
  documents: '项目资料',
  projectAttachments: '项目资料',
  projectName: '项目名称',
  projectCode: '项目编码',
  projectStatus: '项目状态',
  completionProgress: '完成进度',
  responsibleUnit: '责任单位',
  contractorUnit: '施工单位',
  supervisorUnit: '监理单位',
  projectTarget: '项目目标',
  sectionId: '河段编码',
  sectionName: '河段名称',
  linkedRiverObjectId: '所属河流',
  riverSystem: '所属水系',
  riverSide: '岸别',
  sectionType: '河段类型',
  adminLevel: '管理级别',
  chiefName: '河长',
  chiefMobile: '河长手机',
  parentId: '上一级河段编码',
  parentName: '上一级河段名称',
  startAddr: '起点位置',
  endAddr: '讫点位置',
  riverLenKm: '河段长度(km)',
  basinAreaKm2: '流域面积(km²)',
  adminAgency: '管护单位',
  introduction: '河段概况',
  remarks: '备注',
  startLgtd: '起点经度',
  startLttd: '起点纬度',
  endLgtd: '讫点经度',
  endLttd: '讫点纬度',
  riverDist: '河流分区',
  runoffVolume: '多年平均径流量(亿m³)',
  lowflowVolume: '多年平均枯水流量(m³/s)',
  gaugingStation: '水位站(个)',
  leftBranch: '左岸支流(条)',
  rightBranch: '右岸支流(条)',
  riverObjectId: '河流代码',
  riverCode: '河流代码',
  riverName: '河流名称',
  crOverType: '跨界类型',
  rvType: '河流类型',
  rvGrad: '河流级别',
  bank: '岸别',
  rvLen: '河长(千米)',
  rvBasArea: '集水面积(平方千米)',
  rvSourLong: '河源经度',
  rvSourLon: '河源经度',
  rvSourLat: '河源纬度',
  rvSourLoc: '河源所在位置',
  rvSouLoc: '河源所在位置',
  rvMouLong: '河口经度',
  rvMouLon: '河口经度',
  rvMouLat: '河口纬度',
  rvMouLoc: '河口所在位置',
  averSlop: '平均比降',
  representativeSectionId: '代表河段编码',
  representa: '代表河段编码',
  ownedRiverSys: '所属水系',
  connectedDistance: '连通距离',
  connectedDistanceToSectionId: '连通河段编码',
  lakeObjectId: '湖泊代码',
  lakeCode: '湖泊代码',
  lakeName: '湖泊名称',
  lowLeftLong: '最小外包矩形左下角经度',
  lowLeftLat: '最小外包矩形左下角纬度',
  upRightLong: '最小外包矩形右上角经度',
  upRightLat: '最小外包矩形右上角纬度',
  lkLoc: '湖泊所在位置',
  surfaceAreaKm2: '水面面积(km²)',
  storage10kM3: '湖泊容积(10⁴m³)',
  lkRank: '湖泊级别',
  salFreWat: '咸淡水属性',
  avgDepthM: '平均水深(m)',
  maxDepthM: '最大水深(m)',
  effDate: '记录生效时间',
  exprDate: '记录失效时间',
  yscjsj: '要素采集时间',
  jlgxsj: '记录更新时间',
  poiLong: '湖泊位置经度',
  poiLat: '湖泊位置纬度',
  belongHydroSystem: '所属河湖水系',
  lakeCategory: '水体类型',
  waterFuncTarget: '水功能区或水质目标',
  connectedRiverObjectId: '连通河流代码',
  connectedSectionId: '连通河段编码',
  lakeRiverRelationNote: '河湖连通说明',
  ownedRiverSystem: '所属水系',
  waterDepth: '平均水深(m)',
  maxDepth: '最大水深(m)',
  riverSlope: '平均比降',
};

export function getExportFieldLabel(fieldKey: string, fallbackTitle?: string): string {
  const key = String(fieldKey || '').trim();
  if (!key) return '';
  if (EXPORT_FIELD_LABEL_MAP[key]) return EXPORT_FIELD_LABEL_MAP[key];
  if (fallbackTitle && fallbackTitle.trim() && fallbackTitle !== key) return fallbackTitle;
  return key;
}

function fileStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;
}

function docTypeLabel(type: string): string {
  const p = PUMP_QUICK_DOC_LABEL[type as keyof typeof PUMP_QUICK_DOC_LABEL];
  if (p) return p;
  const pl = PLANT_QUICK_DOC_LABEL[type as keyof typeof PLANT_QUICK_DOC_LABEL];
  if (pl) return pl;
  return type;
}

/** 泵站/排口/污水厂等资料数组：与泵站导出明细口径一致 */
export function formatArchiveDocumentsExcelCell(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return '';
  const lines = value.map((d: Record<string, unknown>) => {
    const t = docTypeLabel(String(d?.type ?? ''));
    return `${t}｜${String(d?.name ?? '')}｜${String(d?.fileName ?? '')}`;
  });
  return `共 ${value.length} 份\n${lines.join('\n')}`;
}

/** 项目档案资料数组：与泵站资料导出保持同样的“份数+逐行明细”格式 */
export function formatProjectAttachmentsExcelCell(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return '';
  const lines = value.map((d: Record<string, unknown>) => {
    const docType = String(d?.docType ?? d?.type ?? '');
    const docName = String(d?.docName ?? d?.name ?? '');
    const fileRef = String(d?.fileUrl ?? d?.fileName ?? '');
    return `${docType}｜${docName}｜${fileRef}`;
  });
  return `共 ${value.length} 份\n${lines.join('\n')}`;
}

function defaultScalar(raw: unknown): string | number {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'boolean') return raw ? '是' : '否';
  if (typeof raw === 'object') return JSON.stringify(raw);
  return String(raw);
}

/** OOXML 电子表格 MIME，供下载链路与系统「打开方式」识别为 Excel */
const XLSX_DOWNLOAD_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * 使用 Blob + 明确 MIME 触发下载（替代 XLSX.writeFile）。
 * 部分嵌入 WebView / 一张图壳层宿主会将 writeFile 生成文件误判为非表格格式。
 */
export function saveWorkbookAsXlsxFile(wb: XLSX.WorkBook, fileName: string): void {
  const name = fileName.toLowerCase().endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as BlobPart;
  const blob = new Blob([buf], { type: XLSX_DOWNLOAD_MIME });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * @param formatByKey 按列 key 将码表等转为可读文案；未声明的列走默认规则
 */
export function downloadTableFullExcel(
  rows: Record<string, unknown>[],
  columns: ExportColumnDef[],
  fileNamePrefix: string,
  sheetName: string,
  options?: {
    formatByKey?: Record<string, (raw: unknown) => string | number>;
  },
): void {
  const cols = columns.filter(c => c.key !== 'operation');
  const formatByKey = options?.formatByKey;
  const safeSheet = sheetName.slice(0, 31) || 'Sheet1';

  const matrix: Record<string, string | number>[] = rows.map(row => {
    const line: Record<string, string | number> = {};
    for (const col of cols) {
      const field = (col.dataIndex ?? col.key) as string;
      const raw = row[field];
      const fmt = formatByKey?.[col.key];
      let cell: string | number;
      if (fmt) {
        cell = fmt(raw);
      } else if (
        (col.key.endsWith('Documents') || field === 'documents') &&
        Array.isArray(raw)
      ) {
        cell = formatArchiveDocumentsExcelCell(raw);
      } else if (
        (col.key === 'projectAttachments' || field === 'projectAttachments') &&
        Array.isArray(raw)
      ) {
        cell = formatProjectAttachmentsExcelCell(raw);
      } else if (col.key === '行政区划代码' || field === '行政区划代码') {
        const s = String(raw ?? '').trim();
        cell = s && /^\d{6,12}$/.test(s) ? getShaoshanAddvcdLabel(s) : defaultScalar(raw);
      } else if (col.key === 'region' || field === 'region') {
        const s = String(raw ?? '').trim();
        cell = s && /^\d{6,12}$/.test(s) ? getShaoshanAddvcdLabel(s) : defaultScalar(raw);
      } else {
        cell = defaultScalar(raw);
      }
      const header = getExportFieldLabel(field, col.title);
      line[header] = cell;
    }
    return line;
  });

  const ws = XLSX.utils.json_to_sheet(matrix);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, safeSheet);
  saveWorkbookAsXlsxFile(wb, `${fileNamePrefix}_${fileStamp()}.xlsx`);
}

/** 配置中心 OPTIONS 转导出文案 */
export function exportOptLabel<T extends { value: string; label: string }>(options: T[], raw: unknown): string {
  const v = String(raw ?? '').trim();
  if (!v) return '';
  return options.find(o => o.value === v)?.label ?? v;
}
