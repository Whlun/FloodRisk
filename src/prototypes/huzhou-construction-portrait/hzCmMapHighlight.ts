import type { HzMapProjectHighlight } from '../huzhou-spatial-portrait/hzMapProjectHighlight';
import {
  getParcelById,
  parcelMatchesDistrict,
} from '../huzhou-lifecycle-shared/mock/demoParcels';
import type { ParcelLifecycle } from '../huzhou-lifecycle-shared/types';
import { cmRegionToDistrictName, type CmRegionKey } from './cmRegionFilter';
import { getCmIndustrialLandAlert, listCmIndustrialLandAlerts } from './cmIndustrialLandAlert';
import type { CmProjectWithIndustrialLandAlert } from './cmIndustrialLandAlert';
import { getAlertTypeAccent } from './cmAlertTypeAccent';
import { getRegionAlertProjects } from './mock/regionAlertProjects';
import { resolveProjectParcelId } from './mock/projects';
import type { CmAlertType, ConstructionProject, PhaseKey } from './types';
import { getPhaseAccent } from './phaseAccentColors';

export type HzAlertParcelColorMaps = {
  featureIds: string[];
  fillColorById: Record<string, string>;
  lineColorById: Record<string, string>;
};

function resolveAlertTypeFromRow(
  row: CmProjectWithIndustrialLandAlert | ConstructionProject,
): CmAlertType | null {
  if ('alert' in row) return row.alert.alertType;
  return getCmIndustrialLandAlert(row)?.alertType ?? null;
}

/** 预警地块 osm_id 与类型主题色（与前三未类型标签 `getAlertTypeAccent` 一致） */
export function buildAlertParcelColorMaps(
  rows: Array<CmProjectWithIndustrialLandAlert | ConstructionProject>,
  districtName?: string | null,
): HzAlertParcelColorMaps {
  const featureIds: string[] = [];
  const fillColorById: Record<string, string> = {};
  const lineColorById: Record<string, string> = {};

  for (const row of rows) {
    const project = 'project' in row ? row.project : row;
    const alertType = resolveAlertTypeFromRow(row);
    if (!alertType) continue;

    const parcelId = resolveProjectParcelId(project);
    if (!parcelMatchesDistrict(parcelId, districtName ?? project.region)) continue;
    const parcel = getParcelById(parcelId);
    const fid = parcel?.mapFeatureId?.trim();
    if (!fid || featureIds.includes(fid)) continue;

    const accent = getAlertTypeAccent(alertType);
    featureIds.push(fid);
    fillColorById[fid] = accent.accent;
    lineColorById[fid] = accent.accentDeep;
  }

  return { featureIds, fillColorById, lineColorById };
}

export function collectAlertParcelFeatureIds(
  rows: Array<CmProjectWithIndustrialLandAlert | ConstructionProject>,
  districtName?: string | null,
): string[] {
  return buildAlertParcelColorMaps(rows, districtName).featureIds;
}

/** 预警列表对应地块按类型主题色高亮 */
export function buildHzAlertProjectsMapHighlight(
  rows: Array<CmProjectWithIndustrialLandAlert | ConstructionProject>,
  districtName?: string | null,
): HzMapProjectHighlight | null {
  const { featureIds, fillColorById, lineColorById } = buildAlertParcelColorMaps(
    rows,
    districtName,
  );
  if (featureIds.length === 0) return null;
  const fallback = fillColorById[featureIds[0]!] ?? '#1677ff';
  return {
    featureIds,
    lineColor: lineColorById[featureIds[0]!] ?? fallback,
    fillColor: fallback,
    featureFillColorById: fillColorById,
    featureLineColorById: lineColorById,
  };
}

/** 选中前三未类型时，按类型主题色高亮预警地块 */
export function buildHzAlertTypeMapHighlight(
  alertType: CmAlertType,
  regionKey: CmRegionKey,
): HzMapProjectHighlight | null {
  const district = cmRegionToDistrictName(regionKey);
  const rows = listCmIndustrialLandAlerts(getRegionAlertProjects(regionKey)).filter(
    ({ alert }) => alert.alertType === alertType,
  );
  const featureIds = collectAlertParcelFeatureIds(rows, district);
  if (featureIds.length === 0) return null;
  const accent = getAlertTypeAccent(alertType);
  return {
    featureIds,
    lineColor: accent.accent,
    fillColor: accent.accent,
  };
}

/** 按选中阶段 + 区县高亮地图地块（与左栏卡片主题色一致） */
export function buildHzMapProjectHighlight(
  phaseKey: PhaseKey | null,
  regionKey: CmRegionKey,
): HzMapProjectHighlight | null {
  if (phaseKey == null) return null;
  const accent = getPhaseAccent(phaseKey);
  return {
    phaseKey,
    phasePropertyKey: 'cmPhaseKey',
    districtName: cmRegionToDistrictName(regionKey),
    lineColor: accent.accent,
    fillColor: accent.accent,
  };
}

/** 预警画像 · 项目定位：单地块高亮，颜色与前三未类型标签一致 */
export function buildFocusedAlertParcelHighlight(
  project: ConstructionProject,
  parcel: ParcelLifecycle,
  alertType: CmAlertType,
): HzMapProjectHighlight | null {
  const featureId = parcel.mapFeatureId?.trim();
  if (!featureId) return null;
  const accent = getAlertTypeAccent(alertType);
  return {
    featureIds: [featureId],
    lineColor: accent.accentDeep,
    fillColor: accent.accent,
  };
}

/** 项目卡地址定位：单地块高亮，颜色与该项目所属阶段左栏主题色一致 */
export function buildFocusedParcelHighlight(
  project: ConstructionProject,
  parcel: ParcelLifecycle,
): HzMapProjectHighlight | null {
  const featureId = parcel.mapFeatureId?.trim();
  if (!featureId) return null;
  const accent = getPhaseAccent(project.phaseKey);
  return {
    featureIds: [featureId],
    lineColor: accent.accent,
    fillColor: accent.accent,
  };
}
