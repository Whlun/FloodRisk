/**
 * 泵站信息列表：按当前筛选导出全量台账字段为 .xlsx（不受字段管理可见列限制）。
 * 泵站资料：导出资料份数 + 明细（资料类型、资料名称、文件名，与资料列表一致）。
 */
import * as XLSX from 'xlsx';
import { saveWorkbookAsXlsxFile } from '../shared/facilityTableXlsxExport';
import { getShaoshanAddvcdLabel } from '../生态整治/riverChiefDb4401';
import {
  type PumpStationRecord,
  formatPumpBasCodeDisplay,
  pustAdmDepLabel,
  pustEngGradLabel,
  pustEngScalLabel,
  pustEngStatLabel,
  pustMainBuildGradLabel,
  pustTypeLabel,
} from './facility-points-data';
import { type PumpArchiveDocument, PUMP_QUICK_DOC_LABEL } from './pump-station-documents';

/** 表头（与列表台账字段对齐；不含操作列；含经纬度及资料明细） */
const PUMP_EXPORT_COL_TITLE: Record<string, string> = {
  pustCode: '泵站代码',
  id: '台账标识',
  pustName: '泵站名称',
  region: '所属区划',
  basCode: '所在流域代码',
  pustLoc: '泵站所在位置',
  longitude: '经度',
  latitude: '纬度',
  pustType: '泵站类型',
  pumpNum: '水泵台数',
  desFlow: '设计流量',
  desHead: '设计扬程',
  instCap: '装机容量',
  engStat: '工程建设情况',
  engGrad: '工程等别',
  engScal: '工程规模',
  mainBuildGrad: '主要建筑物级别',
  admDep: '归口管理部门',
  startDate: '开工时间',
  compDate: '建成时间',
  note: '备注',
  pumpDocumentsCount: '资料份数',
  pumpDocumentsDetail: '泵站资料明细',
};

/** 全量导出列顺序（与 SL/T 809 台账及界面字段对应） */
const PUMP_FULL_EXPORT_KEYS = [
  'pustCode',
  'id',
  'pustName',
  'region',
  'basCode',
  'pustLoc',
  'longitude',
  'latitude',
  'pustType',
  'pumpNum',
  'desFlow',
  'desHead',
  'instCap',
  'engStat',
  'engGrad',
  'engScal',
  'mainBuildGrad',
  'admDep',
  'startDate',
  'compDate',
  'note',
  'pumpDocumentsCount',
  'pumpDocumentsDetail',
] as const;

type PumpExportKey = (typeof PUMP_FULL_EXPORT_KEYS)[number];

/** 与资料列表 UI 一致：每条一行「资料类型｜资料名称｜文件名」，多条换行 */
function formatPumpDocumentsDetail(documents?: PumpArchiveDocument[]): string {
  if (!Array.isArray(documents) || documents.length === 0) return '';
  return documents
    .map((d) => {
      const typeLabel = PUMP_QUICK_DOC_LABEL[d.type] ?? String(d.type);
      const name = String(d.name ?? '').trim();
      const fileName = String(d.fileName ?? '').trim();
      return `${typeLabel}｜${name}｜${fileName}`;
    })
    .join('\n');
}

function fmtM3s(v: unknown) {
  if (v === '' || v == null) return '';
  const n = Number(v);
  return Number.isFinite(n) ? `${n} 立方米每秒` : '';
}
function fmtM(v: unknown) {
  if (v === '' || v == null) return '';
  const n = Number(v);
  return Number.isFinite(n) ? `${n} 米` : '';
}
function fmtKw(v: unknown) {
  if (v === '' || v == null) return '';
  const n = Number(v);
  return Number.isFinite(n) ? `${n} 千瓦` : '';
}

function formatRegion(v: unknown): string {
  const s = String(v ?? '').trim();
  if (!s) return '';
  return /^\d{6,12}$/.test(s) ? getShaoshanAddvcdLabel(s) : s;
}

/**
 * 将单条泵站台账格式化为与列表展示一致的可读单元格（无 React 节点）
 */
function formatPumpExportCell(key: PumpExportKey, row: PumpStationRecord): string | number {
  switch (key) {
    case 'pustCode':
      return String(row.pustCode ?? '');
    case 'id':
      return String(row.id ?? '');
    case 'pustName':
      return String(row.pustName ?? '');
    case 'region':
      return formatRegion(row.region);
    case 'basCode': {
      const s = formatPumpBasCodeDisplay(row.basCode);
      return s === '—' ? '' : s;
    }
    case 'pustLoc':
      return String(row.pustLoc ?? '');
    case 'longitude':
      return Number.isFinite(row.x) ? row.x : '';
    case 'latitude':
      return Number.isFinite(row.y) ? row.y : '';
    case 'pustType':
      return pustTypeLabel(row.pustType);
    case 'pumpNum':
      return row.pumpNum ?? 0;
    case 'desFlow':
      return fmtM3s(row.desFlow);
    case 'desHead':
      return fmtM(row.desHead);
    case 'instCap':
      return fmtKw(row.instCap);
    case 'engStat':
      return pustEngStatLabel(row.engStat);
    case 'engGrad':
      return pustEngGradLabel(row.engGrad);
    case 'engScal':
      return pustEngScalLabel(row.engScal);
    case 'mainBuildGrad':
      return pustMainBuildGradLabel(row.mainBuildGrad);
    case 'admDep':
      return pustAdmDepLabel(row.admDep);
    case 'startDate':
      return String(row.startDate ?? '');
    case 'compDate':
      return String(row.compDate ?? '');
    case 'note':
      return String(row.note ?? '');
    case 'pumpDocumentsCount':
      return Array.isArray(row.documents) ? row.documents.length : 0;
    case 'pumpDocumentsDetail':
      return formatPumpDocumentsDetail(row.documents);
    default:
      return '';
  }
}

/**
 * @param rows 已按页面搜索框、泵站类型、建设情况筛选后的行（与表格 dataSource 一致）
 */
export function downloadPumpStationInfoExcel(rows: PumpStationRecord[]) {
  const sheetRows: Record<string, string | number>[] = rows.map((row) => {
    const line: Record<string, string | number> = {};
    for (const k of PUMP_FULL_EXPORT_KEYS) {
      const title = PUMP_EXPORT_COL_TITLE[k];
      line[title] = formatPumpExportCell(k, row);
    }
    return line;
  });
  const ws = XLSX.utils.json_to_sheet(sheetRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '泵站信息');
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;
  saveWorkbookAsXlsxFile(wb, `泵站信息_${stamp}.xlsx`);
}
