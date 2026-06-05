/**
 * 指标抽屉「在地图中定位」时，地图 POI 提示板需与抽屉卡片口径一致的台账指标（非物联演示水质）。
 * 与 `zhtLeftStatDrawerData` 中水利工程卡片字段对齐，最多 {@link ZHT_UNIFIED_LEDGER_POI_HINT_MAX} 行。
 */
import type { ZhtUnifiedSearchPoint } from './zhtSearchUnifiedData';
import { outletResponsiblePartyInitial } from '../韶山水环境设施管理系统/facility-outlet-responsible-data';
import type { ZhtFacilityHintMetricRow } from './zhtFacilityPoiHintMetrics';
import {
  DKE_GRAD_OPTIONS,
  DIKE_PATT_OPTIONS,
  DIKE_TYPE_OPTIONS,
  ENG_GRAD_OPTIONS,
  ENG_SCAL_OPTIONS,
  ENG_STAT_OPTIONS,
  hydroInitial,
  leveeInitial,
  MAIN_BUILD_GRAD_OPTIONS,
  POLD_CLAS_OPTIONS,
  POLD_PROP_OPTIONS,
  polderInitial,
  RES_TYPE_OPTIONS,
  sluiceInitial,
  waterGateInitial,
  weirInitial,
  WAG_TYPE_OPTIONS,
  WFW_TYPE_OPTIONS,
  hillpondInitial,
} from '../韶山水环境系统管理/config-center-data';

/** 抽屉卡片与地图强制提示板共用展示行数上限（与左侧统计卡片六宫格一致） */
export const ZHT_UNIFIED_LEDGER_POI_HINT_MAX = 6;

/** SL/T 809 码表值 → 选项中文标签 */
function hydroCodeLabel(options: readonly { value: string; label: string }[], code: string | null | undefined): string {
  const v = code?.trim();
  if (!v) return '—';
  return options.find(o => o.value === v)?.label ?? v;
}

/** 堤防型式 DIKE_PATT：允许多码逗号拼接，逐项转中文（与抽屉 `leveeDikePatternDisplay` 一致） */
function leveeDikePattDisplay(patt: string | null | undefined): string {
  const raw = patt?.trim();
  if (!raw) return '—';
  const segs = raw
    .split(/[,，]/)
    .map(s => s.trim())
    .filter(Boolean);
  if (segs.length === 0) return '—';
  return segs.map(seg => hydroCodeLabel(DIKE_PATT_OPTIONS, seg)).join('、');
}

const norm: ZhtFacilityHintMetricRow['tone'] = 'normal';

function mk(name: string, value: string, unit = ''): ZhtFacilityHintMetricRow {
  return { name, value, unit, tone: norm };
}

/**
 * 统一点位若有对应系统管理台账，则返回与抽屉一致的指标块；无匹配时返回 `undefined`（由调用方回退到水质种子行）。
 */
export function unifiedPointLedgerPoiHintMetricBlock(
  pt: ZhtUnifiedSearchPoint,
  valuesFontPx: number,
): { showValues: true; valuesFontPx: number; rows: ZhtFacilityHintMetricRow[] } | undefined {
  const { id } = pt;
  const levM = (v: number | null | undefined) => (v != null && Number.isFinite(Number(v)) ? `${v} m` : '—');
  const cap104 = (v: number | null | undefined) => (v != null && Number.isFinite(Number(v)) ? `${v} 万m³` : '—');

  /** 责任主体：信息点蓝，提示板仅标题（业务明细见侧栏卡片 / 详情弹窗） */
  if (id.startsWith('zht-outlet-responsible-')) {
    const rid = id.slice('zht-outlet-responsible-'.length);
    const row = outletResponsiblePartyInitial.find(x => x.责任主体内码 === rid);
    if (!row) return undefined;
    return { showValues: true, valuesFontPx, rows: [] };
  }

  if (id.startsWith('zht-sys-hydro-')) {
    const rid = id.slice('zht-sys-hydro-'.length);
    const h = hydroInitial.find(x => x.id === rid);
    if (!h) return undefined;
    const rows: ZhtFacilityHintMetricRow[] = [
      mk('水库类型', hydroCodeLabel(RES_TYPE_OPTIONS, h.resType)),
      mk('工程等别', hydroCodeLabel(ENG_GRAD_OPTIONS, h.engGrad)),
      mk('工程规模', hydroCodeLabel(ENG_SCAL_OPTIONS, h.engScal)),
      mk('正常蓄水位', levM(h.normWatLev)),
      mk('死水位', levM(h.deadLev)),
      mk('总库容', cap104(h.totCap)),
    ].slice(0, ZHT_UNIFIED_LEDGER_POI_HINT_MAX);
    return { showValues: true, valuesFontPx, rows };
  }

  if (id.startsWith('zht-sys-levee-')) {
    const rid = id.slice('zht-sys-levee-'.length);
    const row = leveeInitial.find(x => x.id === rid);
    if (!row) return undefined;
    const dkeLenOk = row.dkeLen != null && Number.isFinite(Number(row.dkeLen));
    const dkeLenVal = dkeLenOk ? String(row.dkeLen) : '—';
    const rows: ZhtFacilityHintMetricRow[] = [
      mk('堤防等级', hydroCodeLabel(DKE_GRAD_OPTIONS, row.dkeGrad)),
      mk('堤防类型', hydroCodeLabel(DIKE_TYPE_OPTIONS, row.dikeType)),
      mk('堤长', dkeLenVal, dkeLenOk ? ' m' : ''),
      mk('堤防形式', leveeDikePattDisplay(row.dikePatt)),
      mk('工程建设情况', hydroCodeLabel(ENG_STAT_OPTIONS, row.engStat)),
      mk('防洪（潮）标准', row.defSta?.trim() || '—'),
    ].slice(0, ZHT_UNIFIED_LEDGER_POI_HINT_MAX);
    return { showValues: true, valuesFontPx, rows };
  }

  if (id.startsWith('zht-sys-sluice-')) {
    const rid = id.slice('zht-sys-sluice-'.length);
    const row = sluiceInitial.find(x => x.id === rid);
    if (!row) return undefined;
    const rows: ZhtFacilityHintMetricRow[] = [
      mk('水闸类型', hydroCodeLabel(WAG_TYPE_OPTIONS, row.wagType)),
      mk('工程等别', hydroCodeLabel(ENG_GRAD_OPTIONS, row.engGrad)),
      mk('工程规模', hydroCodeLabel(ENG_SCAL_OPTIONS, row.engScal)),
      mk(
        '主要建筑类别',
        hydroCodeLabel(MAIN_BUILD_GRAD_OPTIONS, row.mainBuildGrad),
      ),
      mk(
        '设计最大过闸流量',
        row.desLockDisc != null ? String(row.desLockDisc) : '—',
        row.desLockDisc != null ? ' m³/s' : '',
      ),
      mk('闸孔数量', row.gaorNum != null ? String(row.gaorNum) : '—'),
    ].slice(0, ZHT_UNIFIED_LEDGER_POI_HINT_MAX);
    return { showValues: true, valuesFontPx, rows };
  }

  if (id.startsWith('zht-sys-watergate-')) {
    const rid = id.slice('zht-sys-watergate-'.length);
    const row = waterGateInitial.find(x => x.id === rid);
    if (!row) return undefined;
    const rows: ZhtFacilityHintMetricRow[] = [
      mk('工程状态', pt.status),
      mk('水闸类型', String(row.wagType ?? '—').trim() || '—'),
      mk('工程等别', String(row.engGrad ?? '—').trim() || '—'),
      mk('水闸用途', row.wagUse?.trim() || '—'),
      mk('设计最大过闸流量', row.desLockDisc != null ? String(row.desLockDisc) : '—', row.desLockDisc != null ? ' m³/s' : ''),
      mk('闸孔数量', row.gaorNum != null ? String(row.gaorNum) : '—'),
    ].slice(0, ZHT_UNIFIED_LEDGER_POI_HINT_MAX);
    return { showValues: true, valuesFontPx, rows };
  }

  if (id.startsWith('zht-sys-weir-')) {
    const rid = id.slice('zht-sys-weir-'.length);
    const row = weirInitial.find(x => x.id === rid);
    if (!row) return undefined;
    const rows: ZhtFacilityHintMetricRow[] = [
      mk('堰型', hydroCodeLabel(WFW_TYPE_OPTIONS, row.wfwType)),
      mk('工程等别', hydroCodeLabel(ENG_GRAD_OPTIONS, row.engGrad)),
      mk('工程规模', hydroCodeLabel(ENG_SCAL_OPTIONS, row.engScal)),
      mk('设计泄流', row.desFlow != null ? String(row.desFlow) : '—', row.desFlow != null ? ' m³/s' : ''),
      mk('工程建设情况', hydroCodeLabel(ENG_STAT_OPTIONS, row.engStat)),
      mk('净宽', row.weirWidth != null ? String(row.weirWidth) : '—', row.weirWidth != null ? ' m' : ''),
    ].slice(0, ZHT_UNIFIED_LEDGER_POI_HINT_MAX);
    return { showValues: true, valuesFontPx, rows };
  }

  if (id.startsWith('zht-sys-polder-')) {
    const rid = id.slice('zht-sys-polder-'.length);
    const row = polderInitial.find(x => x.id === rid);
    if (!row) return undefined;
    const rows: ZhtFacilityHintMetricRow[] = [
      mk('圩垸分类', hydroCodeLabel(POLD_CLAS_OPTIONS, row.poldClas)),
      mk('平垸性质', hydroCodeLabel(POLD_PROP_OPTIONS, row.poldProp)),
      mk('圩区面积', row.polderArea != null ? String(row.polderArea) : '—', row.polderArea != null ? ' km²' : ''),
      mk('设计排涝流量', row.desFlFlow != null ? String(row.desFlFlow) : '—', row.desFlFlow != null ? ' m³/s' : ''),
      mk('防洪（潮）标准', row.protectStd?.trim() || '—'),
    ].slice(0, ZHT_UNIFIED_LEDGER_POI_HINT_MAX);
    return { showValues: true, valuesFontPx, rows };
  }

  if (id.startsWith('zht-sys-hillpond-')) {
    const rid = id.slice('zht-sys-hillpond-'.length);
    const row = hillpondInitial.find(x => x.id === rid);
    if (!row) return undefined;
    const rows: ZhtFacilityHintMetricRow[] = [
      mk('塘坝规模', hydroCodeLabel(ENG_SCAL_OPTIONS, row.engScal)),
      mk('集雨面积', row.watShedArea != null ? String(row.watShedArea) : '—', row.watShedArea != null ? ' km²' : ''),
      mk('正常水位', row.normWatLev != null ? String(row.normWatLev) : '—', row.normWatLev != null ? ' m' : ''),
      mk('总容积', row.totVol != null ? String(row.totVol) : '—', row.totVol != null ? ' 万m³' : ''),
      mk('工程建设情况', hydroCodeLabel(ENG_STAT_OPTIONS, row.engStat)),
      mk('建成时间', row.compDate?.trim() || '—'),
    ].slice(0, ZHT_UNIFIED_LEDGER_POI_HINT_MAX);
    return { showValues: true, valuesFontPx, rows };
  }

  return undefined;
}
