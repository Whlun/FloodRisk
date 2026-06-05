/**
 * 泵站电子档案：资料类型与本地文件元数据（与生态整治「项目资料」同结构，不落服务器）。
 * 可存：设计图纸、设备清单、安装验收报告、运维记录、检测报告、安全评估报告等。
 */
import dayjs from 'dayjs';

/** 泵站资料类型：与弹窗内快速上传按钮一一对应 */
export type PumpArchiveDocumentType =
  | 'design'
  | 'equipment'
  | 'install'
  | 'operation'
  | 'inspection'
  | 'safety';

export interface PumpArchiveDocument {
  id: string;
  /** 展示名（如：设计图纸） */
  name: string;
  type: PumpArchiveDocumentType;
  fileName: string;
  fileSize: string;
  /** YYYY-MM-DD */
  uploadTime: string;
  uploader: string;
}

/** 快速上传标签：与 `PumpArchiveDocumentType` 键一致 */
export const PUMP_QUICK_DOC_LABEL: Record<PumpArchiveDocumentType, string> = {
  design: '设计图纸',
  equipment: '设备清单',
  install: '安装验收报告',
  operation: '运维记录',
  inspection: '检测报告',
  safety: '安全评估报告',
};

function formatFileSizeBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** 从本机选择的文件生成资料记录（仅前端，原型） */
export function pumpDocFromLocalFile(docType: PumpArchiveDocumentType, file: File): PumpArchiveDocument {
  return {
    id: `pump-doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: PUMP_QUICK_DOC_LABEL[docType],
    type: docType,
    fileName: file.name,
    fileSize: formatFileSizeBytes(file.size),
    uploadTime: dayjs().format('YYYY-MM-DD'),
    uploader: '本机',
  };
}
