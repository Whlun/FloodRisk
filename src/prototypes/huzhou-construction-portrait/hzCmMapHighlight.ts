import type { HzMapProjectHighlight } from '../huzhou-spatial-portrait/hzMapProjectHighlight';
import {
  getParcelById,
  parcelMatchesDistrict,
} from '../huzhou-lifecycle-shared/mock/demoParcels';
import type { ParcelLifecycle } from '../huzhou-lifecycle-shared/types';
import { cmRegionToDistrictName, type CmRegionKey } from './cmRegionFilter';
import type { CmProjectWithPhaseAlert } from './cmProjectPhaseAlert';
import { resolveProjectParcelId } from './mock/projects';
import type { ConstructionProject, PhaseKey } from './types';
import { getPhaseAccent } from './phaseAccentColors';

/** 预警工程画像 · 地图滞留地块标红（对齐报警 l2 色） */
export const HZ_ALERT_MAP_HIGHLIGHT_COLORS = {
  lineColor: '#ff4d4f',
  fillColor: '#ff4d4f',
} as const;

export function collectAlertParcelFeatureIds(
  rows: Array<CmProjectWithPhaseAlert | ConstructionProject>,
  districtName?: string | null,
): string[] {
  const featureIds: string[] = [];
  for (const row of rows) {
    const project = 'project' in row ? row.project : row;
    const parcelId = resolveProjectParcelId(project);
    if (!parcelMatchesDistrict(parcelId, districtName ?? project.region)) continue;
    const parcel = getParcelById(parcelId);
    const fid = parcel?.mapFeatureId?.trim();
    if (!fid || featureIds.includes(fid)) continue;
    featureIds.push(fid);
  }
  return featureIds;
}

/** 预警列表对应地块批量标红 */
export function buildHzAlertProjectsMapHighlight(
  rows: Array<CmProjectWithPhaseAlert | ConstructionProject>,
): HzMapProjectHighlight | null {
  const featureIds = collectAlertParcelFeatureIds(rows);
  if (featureIds.length === 0) return null;
  return {
    featureIds,
    ...HZ_ALERT_MAP_HIGHLIGHT_COLORS,
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
