/**
 * 设施管理列表导出：排口 / 污水厂等列上码表与展示格式与列表 render 对齐（全量字段）。
 */
import { getShaoshanAddvcdLabel, formatReceiveWaterObjectIdDisplay } from '../生态整治/riverChiefDb4401';
import {
  downloadTableFullExcel,
  exportOptLabel,
  type ExportColumnDef,
} from '../shared/facilityTableXlsxExport';
import {
  formatLinkedOutletCodeDisplay,
  formatOutletApprovalReg,
  formatOutletBasinSea,
  formatOutletDischargeMode,
  formatOutletDrinkingSourceZone,
  formatOutletEmissionState,
  formatOutletGateForm,
  formatOutletInflowChannel,
  formatOutletKeyOutfall,
  formatOutletLevel1,
  formatOutletLevel2,
  PLANT_OPTS_DATA_SOURCE,
  PLANT_OPTS_FACILITY_TYPE,
  PLANT_OPTS_SLUDGE_DISPOSAL,
  PLANT_OPTS_TREATMENT_LEVEL,
  PLANT_OPTS_TREATMENT_METHOD,
  plantLabelFromOptions,
} from './facility-points-data';
import type { ColumnConfig } from './pipe-line-table-kit';
import { dischargerLabelYesNo } from './facility-discharger-data';

/** 排水户列表 */
export const dischargerListExportFormatByKey: Record<string, (raw: unknown) => string | number> = {
  keyDischarger: raw => dischargerLabelYesNo(String(raw ?? '')),
  linkedIot: raw => dischargerLabelYesNo(String(raw ?? '0')),
  linkedOutletCode: raw => formatLinkedOutletCodeDisplay(raw as string),
  coordX: raw => (raw != null && raw !== '' && Number.isFinite(Number(raw)) ? Number(raw).toFixed(3) : ''),
  coordY: raw => (raw != null && raw !== '' && Number.isFinite(Number(raw)) ? Number(raw).toFixed(3) : ''),
  licenseDrainageCode: raw => {
    const lic = raw as { drainageCode?: string } | null | undefined;
    return lic?.drainageCode ? lic.drainageCode : '';
  },
};

export function downloadFacilityListExcel(
  rows: Record<string, unknown>[],
  allColumns: ColumnConfig[],
  fileNamePrefix: string,
  sheetName: string,
  formatByKey?: Record<string, (raw: unknown) => string | number>,
): void {
  downloadTableFullExcel(rows, allColumns as ExportColumnDef[], fileNamePrefix, sheetName, { formatByKey });
}

/** 排口台账：与 OutletView 列表 render 对齐 */
export const outletListExportFormatByKey: Record<string, (raw: unknown) => string | number> = {
  入河入海排污口一级分类: raw => formatOutletLevel1(raw as string),
  入河入海排污口二级分类: raw => formatOutletLevel2(raw as string),
  审批登记备案情况: raw => formatOutletApprovalReg(raw as string),
  行政区划代码: raw => {
    const s = String(raw ?? '').trim();
    if (!s) return '';
    return /^\d{6,12}$/.test(s) ? getShaoshanAddvcdLabel(s) : s;
  },
  重点排口: raw => formatOutletKeyOutfall(raw),
  排放状态: raw => formatOutletEmissionState(raw),
  入河入海排污口经度: raw =>
    raw != null && raw !== '' && Number.isFinite(Number(raw)) ? Number(raw).toFixed(6) : '',
  入河入海排污口纬度: raw =>
    raw != null && raw !== '' && Number.isFinite(Number(raw)) ? Number(raw).toFixed(6) : '',
  所在流域海域: raw => formatOutletBasinSea(raw as string),
  是否位于饮用水源保护区内: raw => formatOutletDrinkingSourceZone(raw as string),
  来水通道: raw => formatOutletInflowChannel(raw as string),
  排污口流量: raw =>
    raw != null && raw !== '' && Number.isFinite(Number(raw)) ? `${Number(raw)} 立方米每小时` : '',
  排放方式: raw => formatOutletDischargeMode(raw as string),
  口门形态: raw => formatOutletGateForm(raw as string),
};

/** 污水厂台账：与 PlantStationView 列表 render 对齐 */
export const plantListExportFormatByKey: Record<string, (raw: unknown) => string | number> = {
  x: raw => (raw != null && raw !== '' && Number.isFinite(Number(raw)) ? Number(raw).toFixed(6) : ''),
  y: raw => (raw != null && raw !== '' && Number.isFinite(Number(raw)) ? Number(raw).toFixed(6) : ''),
  facilityType: raw => plantLabelFromOptions(raw as number, PLANT_OPTS_FACILITY_TYPE),
  treatmentLevel: raw => plantLabelFromOptions(raw as number, PLANT_OPTS_TREATMENT_LEVEL),
  annualPowerConsumption: raw =>
    raw != null && raw !== '' && Number.isFinite(Number(raw)) ? `${Number(raw)} 万千瓦时` : '',
  treatmentMethod: raw => plantLabelFromOptions(raw as number, PLANT_OPTS_TREATMENT_METHOD),
  receiveWaterBodyCode: raw => formatReceiveWaterObjectIdDisplay(String(raw ?? '')),
  linkedOutletCode: raw => formatLinkedOutletCodeDisplay(raw),
  designCapa: raw =>
    raw != null && raw !== '' && Number.isFinite(Number(raw)) ? `${Number(raw)} 万立方米每日` : '',
  sewageLoadRate: raw =>
    raw != null && raw !== '' && Number.isFinite(Number(raw)) ? `${Number(raw)}%` : '',
  rainwaterDesignCapa: raw =>
    raw != null && raw !== '' && Number.isFinite(Number(raw)) ? `${Number(raw)} 万立方米每日` : '',
  sludgeDesignCapa: raw =>
    raw != null && raw !== '' && Number.isFinite(Number(raw)) ? `${Number(raw)} 万吨每日` : '',
  sludgeLoadRate: raw =>
    raw != null && raw !== '' && Number.isFinite(Number(raw)) ? `${Number(raw)}%` : '',
  sludgeDisposalMethod: raw => plantLabelFromOptions(raw as number, PLANT_OPTS_SLUDGE_DISPOSAL),
  dataSource: raw =>
    typeof raw === 'number' || (typeof raw === 'string' && /^\d+$/.test(raw))
      ? plantLabelFromOptions(Number(raw), PLANT_OPTS_DATA_SOURCE)
      : String(raw ?? ''),
  region: raw => {
    const s = String(raw ?? '').trim();
    if (!s) return '';
    return /^\d{6,12}$/.test(s) ? getShaoshanAddvcdLabel(s) : s;
  },
};

// 供配置中心等复用
export { downloadTableFullExcel, exportOptLabel };
export type { ExportColumnDef };
