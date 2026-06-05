/**
 * 建设工程画像 · 导出模式（与日常筛选分离，避免工具栏拥挤）
 */
import { useCallback, useState } from 'react';
import { message } from 'antd';
import { useCmProjectSelection } from './useCmProjectSelection';

export function useCmProjectExportMode() {
  const [exportMode, setExportMode] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const selection = useCmProjectSelection();

  const enterExportMode = useCallback(() => {
    selection.clear();
    setExportMode(true);
  }, [selection]);

  const exitExportMode = useCallback(() => {
    selection.clear();
    setExportMode(false);
    setExportModalOpen(false);
  }, [selection]);

  const confirmExport = useCallback(() => {
    if (selection.selectedCount === 0) {
      message.warning('请先勾选要导出的项目');
      return;
    }
    setExportModalOpen(true);
  }, [selection.selectedCount]);

  const closeExportModal = useCallback(() => {
    setExportModalOpen(false);
  }, []);

  const finishExport = useCallback(() => {
    setExportModalOpen(false);
    setExportMode(false);
    selection.clear();
  }, [selection]);

  return {
    exportMode,
    exportModalOpen,
    enterExportMode,
    exitExportMode,
    confirmExport,
    closeExportModal,
    finishExport,
    ...selection,
  };
}
