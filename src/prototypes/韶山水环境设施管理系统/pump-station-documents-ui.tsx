/**
 * 泵站资料：列表与编辑区（交互对齐生态整治项目档案·项目资料）
 */
import React, { useRef } from 'react';
import { Button, Card, List, Space, Tag, Empty, message, Typography } from 'antd';
import {
  FileOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FileWordOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { PumpArchiveDocument, PumpArchiveDocumentType } from './pump-station-documents';
import { pumpDocFromLocalFile, PUMP_QUICK_DOC_LABEL } from './pump-station-documents';

/** 与泵站资料共用组件时区分文案（排口资料语义一致） */
export type FacilityArchiveDocumentsUiKind = 'pump' | 'outlet';

const ARCHIVE_UI_COPY: Record<
  FacilityArchiveDocumentsUiKind,
  { emptyDescription: string; listCardTitle: string; addSuccessTail: string; deleteSuccess: string }
> = {
  pump: {
    emptyDescription: '暂无泵站资料',
    listCardTitle: '泵站资料列表',
    addSuccessTail: '并加入泵站资料列表',
    deleteSuccess: '泵站资料已删除',
  },
  outlet: {
    emptyDescription: '暂无排口资料',
    listCardTitle: '排口资料列表',
    addSuccessTail: '并加入排口资料列表',
    deleteSuccess: '排口资料已删除',
  },
};

const documentTypeConfig: Record<
  PumpArchiveDocumentType,
  { label: string; color: string; icon: React.ComponentType<{ style?: React.CSSProperties }> }
> = {
  design: { label: PUMP_QUICK_DOC_LABEL.design, color: '#52c41a', icon: FileImageOutlined },
  equipment: { label: PUMP_QUICK_DOC_LABEL.equipment, color: '#1890ff', icon: FileTextOutlined },
  install: { label: PUMP_QUICK_DOC_LABEL.install, color: '#13c2c2', icon: FilePdfOutlined },
  operation: { label: PUMP_QUICK_DOC_LABEL.operation, color: '#f5222d', icon: FileOutlined },
  inspection: { label: PUMP_QUICK_DOC_LABEL.inspection, color: '#722ed1', icon: FilePdfOutlined },
  safety: { label: PUMP_QUICK_DOC_LABEL.safety, color: '#fa8c16', icon: FileWordOutlined },
};

export const PumpDocumentList: React.FC<{
  documents: PumpArchiveDocument[];
  canEdit?: boolean;
  onDelete?: (docId: string) => void;
  /** 默认泵站；排口台账复用时传 outlet */
  uiKind?: FacilityArchiveDocumentsUiKind;
}> = ({ documents, canEdit, onDelete, uiKind = 'pump' }) => {
  const copy = ARCHIVE_UI_COPY[uiKind];
  const getFileIcon = (type: PumpArchiveDocumentType) => {
    const IconComponent = documentTypeConfig[type]?.icon || FileOutlined;
    const color = documentTypeConfig[type]?.color;
    return <IconComponent style={{ color, fontSize: 24 }} />;
  };

  if (!documents || documents.length === 0) {
    return <Empty description={copy.emptyDescription} image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <List
      dataSource={documents}
      renderItem={doc => (
        <List.Item
          actions={[
            <Button key="view" type="link" className="action-btn detail" icon={<EyeOutlined />}>
              详情
            </Button>,
            <Button key="dl" type="link" className="action-btn detail" icon={<DownloadOutlined />}>
              下载
            </Button>,
            canEdit && onDelete && (
              <Button
                key="del"
                type="link"
                className="action-btn delete"
                icon={<DeleteOutlined />}
                onClick={() => onDelete(doc.id)}
              >
                删除
              </Button>
            ),
          ]}
        >
          <List.Item.Meta
            avatar={getFileIcon(doc.type)}
            title={
              <Space>
                <span style={{ fontWeight: 600 }}>{doc.name}</span>
                <Tag color={documentTypeConfig[doc.type]?.color}>{documentTypeConfig[doc.type]?.label}</Tag>
              </Space>
            }
            description={
              <Space size={16} wrap>
                <span className="ant-typography-secondary">{doc.fileName}</span>
                <span className="ant-typography-secondary">大小: {doc.fileSize}</span>
                <span className="ant-typography-secondary">上传时间: {doc.uploadTime}</span>
                <span className="ant-typography-secondary">上传人: {doc.uploader}</span>
              </Space>
            }
          />
        </List.Item>
      )}
    />
  );
};

const QUICK_TYPES: PumpArchiveDocumentType[] = [
  'design',
  'equipment',
  'install',
  'operation',
  'inspection',
  'safety',
];

/** 新增/编辑弹窗内：快速上传 + 可删列表（与项目档案项目资料行为一致） */
export const PumpDocumentsEditPanel: React.FC<{
  documents: PumpArchiveDocument[];
  onChange: (next: PumpArchiveDocument[]) => void;
  uiKind?: FacilityArchiveDocumentsUiKind;
}> = ({ documents, onChange, uiKind = 'pump' }) => {
  const copy = ARCHIVE_UI_COPY[uiKind];
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const pendingTypeRef = useRef<PumpArchiveDocumentType | null>(null);

  const triggerLocalDocPick = (t: PumpArchiveDocumentType) => {
    pendingTypeRef.current = t;
    docFileInputRef.current?.click();
  };

  const onLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    const docType = pendingTypeRef.current;
    pendingTypeRef.current = null;
    input.value = '';
    if (!file || !docType) return;
    const doc = pumpDocFromLocalFile(docType, file);
    onChange([...documents, doc]);
    message.success(`已选择「${file.name}」${copy.addSuccessTail}`);
  };

  const onDelete = (id: string) => {
    onChange(documents.filter(d => d.id !== id));
    message.success(copy.deleteSuccess);
  };

  return (
    <div>
      <input ref={docFileInputRef} type="file" style={{ display: 'none' }} onChange={onLocalFileChange} />
      <Card size="small" title="快速上传" style={{ marginBottom: 16 }}>
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
          调起本机文件选择器，仅将文件元数据写入下列表（原型不落盘）。
        </Typography.Text>
        <Space wrap>
          {QUICK_TYPES.map(t => (
            <Button key={t} icon={<UploadOutlined />} onClick={() => triggerLocalDocPick(t)}>
              {PUMP_QUICK_DOC_LABEL[t]}
            </Button>
          ))}
        </Space>
      </Card>
      <Card size="small" title={copy.listCardTitle}>
        <PumpDocumentList documents={documents} canEdit onDelete={onDelete} uiKind={uiKind} />
      </Card>
    </div>
  );
};
