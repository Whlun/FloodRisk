import {
  AREA_IMPORTANCE_LABEL,
  type AreaImportance,
  type AppendixBSurvey,
  type IndicatorAppendixBSurveyPart,
  type RiskIndicatorRow,
  type SurveyPayload,
  type SurveyPointType,
  type WaterloggingPointRow,
} from './types';
import {
  getAppendixBSurveyParts,
  getCompositePartsForPoint,
  isCompositeAppendixNumericSurvey,
  migrateSurveyPayloadForPointType,
} from './appendixBSurveyBinding';
import { isCompositePartAppendixB } from './compositePartSource';
import { indicatorAppliesToPoint } from './indicatorSurveyUtils';

function syncPart(
  appendixB: AppendixBSurvey,
  indicatorValues: Record<string, string | number | boolean | null>,
  part: IndicatorAppendixBSurveyPart,
): void {
  const raw = (appendixB as Record<string, number | undefined>)[part.appendixBFieldKey];
  if (raw !== undefined && raw !== null) {
    indicatorValues[part.valueFieldKey] = raw;
  }
}

function syncAppendixBIndicatorBoundFields(
  appendixB: AppendixBSurvey,
  indicatorValues: Record<string, string | number | boolean | null>,
  indicators: RiskIndicatorRow[],
  pointType: SurveyPointType,
): Record<string, string | number | boolean | null> {
  const next = { ...indicatorValues };
  for (const ind of indicators) {
    if (!indicatorAppliesToPoint(ind, pointType, indicators)) continue;
    if (isCompositeAppendixNumericSurvey(ind)) {
      for (const part of getCompositePartsForPoint(ind, pointType, indicators)) {
        if (isCompositePartAppendixB(part)) syncPart(appendixB, next, part);
      }
      continue;
    }
    const parts = getAppendixBSurveyParts(ind);
    if (parts.length > 1 || ind.survey?.appendixBSurveyParts?.length) {
      for (const part of parts) {
        if (isCompositePartAppendixB(part)) syncPart(appendixB, next, part);
      }
      continue;
    }
    const bk = ind.survey?.appendixBFieldKey;
    if (!bk) continue;
    syncPart(appendixB, next, {
      appendixBFieldKey: bk,
      valueFieldKey: ind.survey!.fieldKey,
      label: ind.name,
      tierBands: [],
    });
  }
  return next;
}

function hydratePart(
  appendixB: AppendixBSurvey,
  values: Record<string, string | number | boolean | null>,
  part: IndicatorAppendixBSurveyPart,
): void {
  const appKey = part.appendixBFieldKey;
  const bag = appendixB as Record<string, number | undefined>;
  const cur = bag[appKey];
  if (cur !== undefined && cur !== null) return;
  const iv = values[part.valueFieldKey];
  if (iv !== undefined && iv !== null && iv !== '') {
    bag[appKey] = typeof iv === 'number' ? iv : parseFloat(String(iv));
  }
}

/**
 * 打开编辑时：附录 B 专用项为空时，从已保存的指标普查值回填（兼容历史数据）。
 */
export function hydrateAppendixBFromIndicatorValues(
  payload: SurveyPayload,
  pointType: SurveyPointType | undefined,
  indicators: RiskIndicatorRow[],
): SurveyPayload {
  const migrated = migrateSurveyPayloadForPointType(payload, pointType);
  if (!pointType) return migrated;
  const appendixB = { ...migrated.appendixB };
  const values = migrated.indicatorValues ?? {};
  for (const ind of indicators) {
    if (!indicatorAppliesToPoint(ind, pointType, indicators)) continue;
    const parts = isCompositeAppendixNumericSurvey(ind)
      ? getCompositePartsForPoint(ind, pointType, indicators)
      : getAppendixBSurveyParts(ind);
    for (const part of parts) {
      if (isCompositePartAppendixB(part)) hydratePart(appendixB, values, part);
    }
  }
  return { ...migrated, appendixB };
}

/**
 * 保存普查时：附录 B 绑定字段写入 indicatorValues；「地区重要程度」与指标「地区重要性」无映射。
 */
export function syncAppendixBToIndicatorValues(
  payload: SurveyPayload,
  pointType?: SurveyPointType,
  indicators?: RiskIndicatorRow[],
): SurveyPayload {
  const migrated = migrateSurveyPayloadForPointType(payload, pointType);
  let indicatorValues = { ...(migrated.indicatorValues ?? {}) };
  if (pointType && indicators?.length) {
    indicatorValues = syncAppendixBIndicatorBoundFields(
      migrated.appendixB,
      indicatorValues,
      indicators,
      pointType,
    );
  }
  return {
    ...migrated,
    indicatorValues,
  };
}

function designPeriodThresholdBrief(area: AreaImportance): string {
  const central = area === 'COUNTY_KEY' || area === 'COUNTY_GENERAL';
  return central
    ? '中心城区：重现期 P≥30 年为低风险'
    : '其他区县/乡镇：下穿/地下 P≥10 年为低，低洼路段 P≥5 年为低';
}

/** 地区重要程度字段 ? 说明（含当前选项对重现期阈值的联动） */
export function getAreaImportanceTooltipLines(area?: AreaImportance): string[] {
  const lines = [
    '必填。选项 1、2 为中心城区，选项 3 为其他区县/乡镇。',
    '仅用于「排水系统设计重现期」P 的阈值判定。',
    '与指标普查中的「地区重要性」为不同字段，须分别填写，无自动映射。',
    `· ${AREA_IMPORTANCE_LABEL.COUNTY_KEY} → 中心城区`,
    `· ${AREA_IMPORTANCE_LABEL.COUNTY_GENERAL} → 中心城区`,
    `· ${AREA_IMPORTANCE_LABEL.TOWN_GENERAL} → 其他区县/乡镇`,
  ];
  if (area) {
    lines.push('—', `重现期 P 判定：${designPeriodThresholdBrief(area)}`);
  }
  return lines;
}

/**
 * 将当前行附录 B 的专用字段同步到当前行的指标值。
 *
 * 普查是一份按时间、按评价版本保存的快照。不得因为设为数据引用或更新定级，
 * 回写同一易涝点的其它普查记录；否则会改写历史原始值并破坏历史计分可追溯性。
 * 保留此函数名仅兼容旧调用方，实际只规范 source 本身。
 */
export function pushBasicInfoToSiblingSurveys(
  records: WaterloggingPointRow[],
  source: WaterloggingPointRow,
  indicators: RiskIndicatorRow[],
): WaterloggingPointRow[] {
  const sourceSynced = syncAppendixBToIndicatorValues(
    source.surveyPayload,
    source.pointType,
    indicators,
  );
  return records.map(r => {
    if (r.id === source.id) {
      return { ...r, surveyPayload: sourceSynced };
    }
    return r;
  });
}
