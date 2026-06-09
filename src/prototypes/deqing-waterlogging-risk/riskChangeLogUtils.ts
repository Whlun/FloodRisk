import type {
  IndicatorRiskLevelRow,
  RatingResult,
  RiskChangeLogEntry,
  RiskChangeType,
  WaterloggingPointRow,
} from './types';
import { resolveSurveyAt } from './waterloggingSurveyUtils';
import { getLevelSortRank } from './riskLevelUtils';

/** 取某条普查记录最近一条风险变更日志（用于补全/解析锁定定级方案） */
export function getLatestRiskLogForSurvey(
  surveyRecordId: string,
  logs: RiskChangeLogEntry[],
): RiskChangeLogEntry | undefined {
  return [...logs]
    .filter(l => l.surveyRecordId === surveyRecordId)
    .sort((a, b) => b.changeAt.localeCompare(a.changeAt))[0];
}

export function inferRiskChangeType(
  prev: RatingResult | null | undefined,
  next: RatingResult,
  levels: IndicatorRiskLevelRow[] = [],
): RiskChangeType {
  if (!prev) return 'initial';
  if (prev.levelCode === next.levelCode) return 'unchanged';
  const d = getLevelSortRank(next.levelCode, levels) - getLevelSortRank(prev.levelCode, levels);
  if (d > 0) return 'upgrade';
  if (d < 0) return 'downgrade';
  return 'update';
}

export interface CreateRiskChangeLogOptions {
  prev?: RatingResult | null;
  operator?: string;
  basicInfoSynced?: boolean;
  preventionRefAt?: string;
  preventionVersionNo?: string;
  architectureRefAt?: string;
  architectureVersionNo?: string;
  riskLevelVersionNo?: string;
  remark?: string;
  /** 当前等级配置，用于按 sort 推断升高/降低 */
  indicatorLevels?: IndicatorRiskLevelRow[];
}

/** 根据定级结果生成一条风险变更日志 */
export function createRiskChangeLogEntry(
  point: WaterloggingPointRow,
  options: CreateRiskChangeLogOptions = {},
): RiskChangeLogEntry | null {
  const result = point.ratingResult;
  if (!result || point.ratingStatus !== 'completed') return null;

  const prev = options.prev ?? null;
  const changeType = inferRiskChangeType(prev, result, options.indicatorLevels ?? []);

  return {
    id: `rcl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    registryId: point.registryId,
    pointCode: point.pointCode,
    name: point.name,
    pointType: point.pointType,
    surveyRecordId: point.id,
    surveyAt: resolveSurveyAt(point),
    surveyLabel: point.label,
    changeAt: result.ratedAt,
    changeType,
    prevLevelCode: prev?.levelCode,
    prevLevelName: prev?.levelName,
    prevV: prev?.v,
    newLevelCode: result.levelCode,
    newLevelName: result.levelName,
    newColor: result.color,
    newV: result.v,
    v1: result.v1,
    v2: result.v2,
    v3: result.v3,
    v4: result.v4,
    partial: result.partial,
    basicInfoSynced: options.basicInfoSynced,
    preventionRefAt: result.preventionRefAt ?? options.preventionRefAt,
    preventionVersionNo: result.preventionVersionNo ?? options.preventionVersionNo,
    architectureRefAt: result.architectureRefAt ?? options.architectureRefAt,
    architectureVersionNo: result.architectureVersionNo ?? options.architectureVersionNo,
    riskLevelVersionNo: result.riskLevelVersionNo ?? options.riskLevelVersionNo,
    operator: options.operator ?? point.collector ?? '系统',
    remark: options.remark,
  };
}

export function sortRiskChangeLogs(logs: RiskChangeLogEntry[]): RiskChangeLogEntry[] {
  return [...logs].sort((a, b) => b.changeAt.localeCompare(a.changeAt));
}

export function getRiskChangeLogsForRegistry(
  logs: RiskChangeLogEntry[],
  registryId: string,
): RiskChangeLogEntry[] {
  return sortRiskChangeLogs(logs.filter(l => l.registryId === registryId));
}

export interface RiskChangeLogFilter {
  registryId?: string;
  pointType?: string;
  changeType?: RiskChangeType | '';
  newLevelCode?: string;
  changeAtFrom?: string;
  changeAtTo?: string;
}

export function filterRiskChangeLogs(
  logs: RiskChangeLogEntry[],
  filter: RiskChangeLogFilter,
): RiskChangeLogEntry[] {
  return sortRiskChangeLogs(
    logs.filter(l => {
      if (filter.registryId && l.registryId !== filter.registryId) return false;
      if (filter.pointType && l.pointType !== filter.pointType) return false;
      if (filter.changeType && l.changeType !== filter.changeType) return false;
      if (filter.newLevelCode && l.newLevelCode !== filter.newLevelCode) return false;
      if (filter.changeAtFrom && l.changeAt < filter.changeAtFrom) return false;
      if (filter.changeAtTo && l.changeAt > filter.changeAtTo) return false;
      return true;
    }),
  );
}
