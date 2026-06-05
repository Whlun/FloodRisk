import type {
  AppendixBSurvey,
  IndicatorAppendixBSurveyPart,
  RiskIndicatorRow,
  SurveyPayload,
  SurveyPointType,
} from './types';
import { filterCompositePartsForPointType } from './compositePartSource';
import { indicatorAppliesToPoint } from './indicatorSurveyUtils';

/** 是否为「附录 B 复合数值赋分」填报形态 */
export function isCompositeAppendixNumericSurvey(ind: RiskIndicatorRow): boolean {
  return (
    ind.survey?.inputVariant === 'composite_appendix_numeric' &&
    (ind.survey.appendixBSurveyParts?.length ?? 0) > 0
  );
}

/** 指标是否在附录 B 填报（单字段或复合多子项） */
export function hasAppendixBSurveyBinding(ind: RiskIndicatorRow): boolean {
  const s = ind.survey;
  if (isCompositeAppendixNumericSurvey(ind)) return true;
  return Boolean(s?.appendixBFieldKey);
}

export function getAppendixBSurveyParts(ind: RiskIndicatorRow): IndicatorAppendixBSurveyPart[] {
  if (isCompositeAppendixNumericSurvey(ind)) {
    return ind.survey!.appendixBSurveyParts!;
  }
  const bk = ind.survey?.appendixBFieldKey;
  if (!bk) return [];
  return [
    {
      appendixBFieldKey: bk,
      valueFieldKey: ind.survey!.fieldKey,
      label: ind.name,
      tierBands: [],
    },
  ];
}

/** 当前点型下参与复合赋分的子项 */
export function getCompositePartsForPoint(
  ind: RiskIndicatorRow,
  pointType: SurveyPointType,
  indicators?: RiskIndicatorRow[],
): IndicatorAppendixBSurveyPart[] {
  if (!isCompositeAppendixNumericSurvey(ind)) return getAppendixBSurveyParts(ind);
  const parts = getAppendixBSurveyParts(ind);
  if (indicators?.length) {
    return filterCompositePartsForPointType(parts, pointType, ind, indicators);
  }
  return parts.filter(p =>
    filterCompositePartsForPointType([p], pointType, ind, [ind]).length > 0,
  );
}

export function migrateUndergroundEntranceSurveyPayload(payload: SurveyPayload): SurveyPayload {
  const appendixB = { ...payload.appendixB } as AppendixBSurvey & {
    entranceElevationDiffM?: number;
  };
  const values = { ...(payload.indicatorValues ?? {}) };

  const legacyH =
    appendixB.entranceElevationDiffM ?? (values.FM_UG_ENTRANCE_H as number | undefined);

  if (legacyH !== undefined && legacyH !== null) {
    const n = typeof legacyH === 'number' ? legacyH : parseFloat(String(legacyH));
    if (!Number.isNaN(n)) {
      if (appendixB.pedestrianEntranceElevationDiffM === undefined) {
        appendixB.pedestrianEntranceElevationDiffM = n;
      }
      if (appendixB.vehicleEntranceElevationDiffM === undefined) {
        appendixB.vehicleEntranceElevationDiffM = n;
      }
      if (values.FM_UG_ENTRANCE_H_PED === undefined) values.FM_UG_ENTRANCE_H_PED = n;
      if (values.FM_UG_ENTRANCE_H_VEH === undefined) values.FM_UG_ENTRANCE_H_VEH = n;
    }
  }

  delete appendixB.entranceElevationDiffM;
  delete values.FM_UG_ENTRANCE_H;

  return { ...payload, appendixB, indicatorValues: values };
}

/** 历史指标普查中的纵坡值回填至附录 B 固定字段（兼容 FM_LL_COLLECT_SLOPE 等） */
export function migrateLowLyingRoadSlopeSurveyPayload(payload: SurveyPayload): SurveyPayload {
  const appendixB = { ...payload.appendixB };
  const values = { ...(payload.indicatorValues ?? {}) };

  if (appendixB.roadLongitudinalSlope === undefined || appendixB.roadLongitudinalSlope === null) {
    const legacyKeys = Object.keys(values).filter(
      k =>
        k.endsWith('_COLLECT_SLOPE') ||
        k.endsWith('_COLLECT_COND') ||
        k.endsWith('_LONG_SLOPE'),
    );
    for (const key of legacyKeys) {
      const legacyRaw = values[key];
      if (legacyRaw === undefined || legacyRaw === null || legacyRaw === '') continue;
      const n = typeof legacyRaw === 'number' ? legacyRaw : parseFloat(String(legacyRaw));
      if (!Number.isNaN(n)) {
        appendixB.roadLongitudinalSlope = n;
        break;
      }
    }
  }

  return { ...payload, appendixB, indicatorValues: values };
}

export function migrateHistoricalDisasterSurveyPayload(payload: SurveyPayload): SurveyPayload {
  const appendixB = { ...payload.appendixB };
  if (
    appendixB.hasHistoricalDisaster === undefined &&
    appendixB.hasHistoricalFlooding !== undefined
  ) {
    appendixB.hasHistoricalDisaster = appendixB.hasHistoricalFlooding;
  }
  return { ...payload, appendixB };
}

export function migrateSurveyPayloadForPointType(
  payload: SurveyPayload,
  pointType: SurveyPointType | undefined,
): SurveyPayload {
  let next = migrateHistoricalDisasterSurveyPayload(payload);
  if (pointType === 'UNDERGROUND') next = migrateUndergroundEntranceSurveyPayload(next);
  if (pointType === 'LOW_LYING') next = migrateLowLyingRoadSlopeSurveyPayload(next);
  return next;
}

export function listAppendixBoundIndicatorsForPoint(
  indicators: RiskIndicatorRow[],
  pointType: SurveyPointType,
): RiskIndicatorRow[] {
  return indicators.filter(
    i => hasAppendixBSurveyBinding(i) && indicatorAppliesToPoint(i, pointType, indicators),
  );
}
