/**
 * 建设工程画像 · 导出记录共享状态（全页单例，避免多面板各自一份数据）
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import {
  appendCmProjectExportRecord,
  clearCmProjectExportRecords,
  readCmProjectExportRecords,
  removeCmProjectExportRecord,
  type CmProjectExportRecord,
  type CmProjectExportRecordInput,
} from './cmProjectExportRecords';

type CmProjectExportRecordsContextValue = {
  records: CmProjectExportRecord[];
  appendRecord: (input: CmProjectExportRecordInput) => Promise<CmProjectExportRecord>;
  removeRecord: (id: string) => Promise<void>;
  clearRecords: () => Promise<void>;
};

const CmProjectExportRecordsContext = createContext<CmProjectExportRecordsContextValue | null>(null);

export const CmProjectExportRecordsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [records, setRecords] = useState<CmProjectExportRecord[]>([]);

  const reload = useCallback(async () => {
    const next = await readCmProjectExportRecords();
    setRecords(next);
    return next;
  }, []);

  useEffect(() => {
    void reload().catch(() => {
      setRecords([]);
      message.error('读取导出记录失败');
    });
  }, [reload]);

  const appendRecord = useCallback(async (input: CmProjectExportRecordInput) => {
    try {
      const record = await appendCmProjectExportRecord(input);
      setRecords(prev => [record, ...prev].slice(0, 50));
      return record;
    } catch {
      message.error('保存导出记录失败');
      throw new Error('保存导出记录失败');
    }
  }, []);

  const removeRecord = useCallback(async (id: string) => {
    try {
      await removeCmProjectExportRecord(id);
      setRecords(prev => prev.filter(r => r.id !== id));
      message.success('已删除');
    } catch {
      message.error('删除导出记录失败');
    }
  }, []);

  const clearRecords = useCallback(async () => {
    try {
      await clearCmProjectExportRecords();
      setRecords([]);
      message.success('已清空全部导出记录');
    } catch {
      message.error('清空导出记录失败');
      throw new Error('清空导出记录失败');
    }
  }, []);

  const value = useMemo(
    () => ({ records, appendRecord, removeRecord, clearRecords }),
    [appendRecord, clearRecords, records, removeRecord],
  );

  return (
    <CmProjectExportRecordsContext.Provider value={value}>{children}</CmProjectExportRecordsContext.Provider>
  );
};

export function useCmProjectExportRecords(): CmProjectExportRecordsContextValue {
  const ctx = useContext(CmProjectExportRecordsContext);
  if (!ctx) {
    throw new Error('useCmProjectExportRecords 须在 CmProjectExportRecordsProvider 内使用');
  }
  return ctx;
}
