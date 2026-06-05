/**
 * 污水厂电子档案：设计、竣工、环保审批、监测、运维、安全等（与项目/泵站资料原型一致，元数据不落盘）
 */
import dayjs from 'dayjs';

export type PlantArchiveDocumentType =
  | 'design'
  | 'completion'
  | 'envApproval'
  | 'monitoring'
  | 'operation'
  | 'safety';

export interface PlantArchiveDocument {
  id: string;
  name: string;
  type: PlantArchiveDocumentType;
  fileName: string;
  fileSize: string;
  uploadTime: string;
  uploader: string;
}

/** 与快速上传按钮一一对应 */
export const PLANT_QUICK_DOC_LABEL: Record<PlantArchiveDocumentType, string> = {
  design: '设计图纸',
  completion: '竣工验收报告',
  envApproval: '环保审批文件',
  monitoring: '监测报告',
  operation: '运维记录',
  safety: '安全评估报告',
};

function formatFileSizeBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function plantDocFromLocalFile(docType: PlantArchiveDocumentType, file: File): PlantArchiveDocument {
  return {
    id: `plant-doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: PLANT_QUICK_DOC_LABEL[docType],
    type: docType,
    fileName: file.name,
    fileSize: formatFileSizeBytes(file.size),
    uploadTime: dayjs().format('YYYY-MM-DD'),
    uploader: '本机',
  };
}
