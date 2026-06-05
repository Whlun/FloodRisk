/**
 * 工作台 · 按收藏 id 解析建设项目（含预警专题项目）
 */
import { getProjectById } from '../huzhou-construction-portrait/mock/projects';
import type { ConstructionProject } from '../huzhou-construction-portrait/types';

export function resolveFavoriteProjects(favoriteIds: string[]): ConstructionProject[] {
  return favoriteIds
    .map(id => getProjectById(id))
    .filter((p): p is ConstructionProject => p != null);
}
