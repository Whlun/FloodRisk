/**
 * 建设工程画像 · 地块详情弹窗上下文解析（首页 / 空间利用画像地图共用）
 */
import { matterStageToCmPhaseAccentKey } from '../huzhou-lifecycle-shared/cmPhaseAccent';
import { getParcelById } from '../huzhou-lifecycle-shared/mock/demoParcels';
import type { ParcelLifecycle } from '../huzhou-lifecycle-shared/types';
import type { OpenParcelDetailOptions } from '../huzhou-spatial-portrait/components/HuzhouMapWithParcelDetail';
import {
  buildConstructionProjectSnapshot,
  mergeParcelForConstructionProject,
} from './mock/constructionProjectParcel';
import { resolveCmDetailPhaseAlert } from './resolveCmProjectCardAlert';
import {
  findConstructionProjectByParcelId,
  getProjectById,
  resolveProjectParcelId,
} from './mock/projects';
import type { ConstructionProject } from './types';

export function buildConstructionOpenOptions(
  project: ConstructionProject,
): OpenParcelDetailOptions {
  return {
    stageAccentPhaseKey: project.phaseKey,
    constructionProjectId: project.id,
    constructionProject: buildConstructionProjectSnapshot(project),
    phaseAlert: resolveCmDetailPhaseAlert(project),
  };
}

export function resolveCmDetailParcel(
  parcelId: string,
  options?: OpenParcelDetailOptions,
): ParcelLifecycle | undefined {
  const base = getParcelById(parcelId);
  if (!base) return undefined;
  const projectId = options?.constructionProjectId;
  const project = projectId ? getProjectById(projectId) : undefined;
  if (!project) return base;
  return mergeParcelForConstructionProject(base, project);
}

/**
 * 地图点击地块 → 详情弹窗建管上下文。
 * @param preferredProjectId 建管首页定位高亮项目 id（空间利用画像不传）
 */
export function resolveCmContextFromParcel(
  parcelId: string,
  preferredProjectId?: string | null,
): OpenParcelDetailOptions | undefined {
  if (preferredProjectId) {
    const fromList = getProjectById(preferredProjectId);
    if (fromList && resolveProjectParcelId(fromList) === parcelId) {
      return buildConstructionOpenOptions(fromList);
    }
  }
  const project = findConstructionProjectByParcelId(parcelId);
  if (project) return buildConstructionOpenOptions(project);

  const parcel = getParcelById(parcelId);
  if (!parcel) return undefined;
  return {
    stageAccentPhaseKey: matterStageToCmPhaseAccentKey(parcel.currentStageKey),
  };
}
