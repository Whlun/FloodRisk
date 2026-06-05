/**
 * 建设工程画像 · 项目收藏（localStorage 持久化）
 */
import { useCallback, useState } from 'react';

const STORAGE_KEY = 'hz-cm-project-favorites';

function readFavoriteIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

function writeFavoriteIds(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore quota / private mode */
  }
}

export function useCmProjectFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => readFavoriteIds());

  const isFavorite = useCallback(
    (projectId: string) => favoriteIds.includes(projectId),
    [favoriteIds],
  );

  const toggleFavorite = useCallback((projectId: string) => {
    setFavoriteIds(prev => {
      const next = prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId];
      writeFavoriteIds(next);
      return next;
    });
  }, []);

  return { favoriteIds, isFavorite, toggleFavorite };
}
