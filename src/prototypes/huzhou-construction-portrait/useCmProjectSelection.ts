/**
 * 建设工程画像 · 项目列表批量勾选
 */
import { useCallback, useMemo, useState } from 'react';

export function useCmProjectSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const toggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectMany = useCallback((ids: string[], checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  /** 仅同步当前可见列表的勾选，不影响其他阶段已选项目（跨阶段多选） */
  const syncDisplaySelection = useCallback((displayIds: string[], selectedDisplayIds: string[]) => {
    const selectedSet = new Set(selectedDisplayIds);
    setSelectedIds(prev => {
      let changed = false;
      const next = new Set(prev);
      for (const id of displayIds) {
        const shouldSelect = selectedSet.has(id);
        if (shouldSelect && !next.has(id)) {
          next.add(id);
          changed = true;
        } else if (!shouldSelect && next.has(id)) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  /** 数据集范围变化时（如切换区县）移除范围外勾选 */
  const pruneToIds = useCallback((allowedIds: string[]) => {
    const allowed = new Set(allowedIds);
    setSelectedIds(prev => {
      let changed = false;
      for (const id of prev) {
        if (!allowed.has(id)) {
          changed = true;
          break;
        }
      }
      if (!changed) return prev;
      const next = new Set<string>();
      for (const id of prev) {
        if (allowed.has(id)) next.add(id);
      }
      return next;
    });
  }, []);

  const selectedCount = selectedIds.size;

  const selectedIdList = useMemo(() => Array.from(selectedIds), [selectedIds]);

  return {
    selectedIds,
    selectedIdList,
    selectedCount,
    isSelected,
    toggle,
    selectMany,
    clear,
    syncDisplaySelection,
    pruneToIds,
    setSelectedIds,
  };
}
