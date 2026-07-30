import type { RiskIndicatorRow, WaterloggingPointRow } from './types';
import { migrateSurveyIndicatorValues } from './compositeConditionalSurvey';

/** 按普查时间倒序 */
export function sortSurveyRecords(records: WaterloggingPointRow[]): WaterloggingPointRow[] {
  return [...records].sort((a, b) => resolveSurveyAt(b).localeCompare(resolveSurveyAt(a)));
}

export function resolveSurveyAt(row: WaterloggingPointRow): string {
  return row.surveyAt ?? row.collectedAt ?? '';
}

/** 定级页只展示每个易涝点显式设置的「定级引用」普查记录。 */
export function getSurveyRecordsForRating(records: WaterloggingPointRow[]): WaterloggingPointRow[] {
  const byRegistry = new Map<string, WaterloggingPointRow[]>();
  for (const r of records) {
    const list = byRegistry.get(r.registryId) ?? [];
    list.push(r);
    byRegistry.set(r.registryId, list);
  }
  return [...byRegistry.values()]
    .map(pickSurveyRecordForRating)
    .filter((row): row is WaterloggingPointRow => Boolean(row));
}

function pickSurveyRecordForRating(list: WaterloggingPointRow[]): WaterloggingPointRow | null {
  const sorted = sortSurveyRecords(list);
  return sorted.find(r => r.activeForRating) ?? null;
}

/** 将某条普查记录设为定级引用（同易涝点 registryId 仅一条） */
export function setActiveSurveyRecord(
  records: WaterloggingPointRow[],
  id: string,
): WaterloggingPointRow[] {
  const target = records.find(r => r.id === id);
  if (!target) return records;
  return records.map(r => ({
    ...r,
    activeForRating: r.registryId === target.registryId && r.id === id,
  }));
}

/** 纠正脏数据：同一易涝点仅保留一条 activeForRating（保留普查时间最新的一条） */
export function normalizeSurveyActiveRefs(
  records: WaterloggingPointRow[],
  indicators: RiskIndicatorRow[],
): WaterloggingPointRow[] {
  const activeIdsByRegistry = new Map<string, string[]>();
  for (const r of records) {
    if (!r.activeForRating) continue;
    const ids = activeIdsByRegistry.get(r.registryId) ?? [];
    ids.push(r.id);
    activeIdsByRegistry.set(r.registryId, ids);
  }

  const keepActiveIds = new Set<string>();
  for (const ids of activeIdsByRegistry.values()) {
    if (ids.length === 1) {
      keepActiveIds.add(ids[0]);
      continue;
    }
    const newest = [...ids]
      .map(id => records.find(r => r.id === id)!)
      .sort((a, b) => resolveSurveyAt(b).localeCompare(resolveSurveyAt(a)))[0];
    keepActiveIds.add(newest.id);
  }

  return records.map(r => {
    const payload = r.surveyPayload;
    const migratedValues = payload?.indicatorValues
      ? migrateSurveyIndicatorValues(payload.indicatorValues, indicators)
      : payload?.indicatorValues;
    const migrated =
      payload && migratedValues !== payload.indicatorValues
        ? {
            ...payload,
            indicatorValues: migratedValues as NonNullable<typeof payload.indicatorValues>,
          }
        : payload;
    return {
      ...r,
      surveyPayload: migrated,
      activeForRating: keepActiveIds.has(r.id),
    };
  });
}

/** 同易涝点是否已有定级引用（不含当前行） */
export function getActiveSurveySibling(
  records: WaterloggingPointRow[],
  row: WaterloggingPointRow,
): WaterloggingPointRow | undefined {
  return records.find(
    r => r.registryId === row.registryId && r.id !== row.id && r.activeForRating,
  );
}
