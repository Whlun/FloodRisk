/**
 * 污水厂资料：列表与编辑区（与泵站资料/项目资料交互一致）
 */
import React, { useRef } from 'react';
import { Button, Card, List, Space, Tag, Empty, message, Typography } from 'antd';
import {
  BarChartOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  FileImageOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { PlantArchiveDocument, PlantArchiveDocumentType } from './plant-station-documents';
import { plantDocFromLocalFile, PLANT_QUICK_DOC_LABEL } from './plant-station-documents';

const documentTypeConfig: Record<
  PlantArchiveDocumentType,
  { label: string; color: string; icon: React.ComponentType<{ style?: React.CSSProperties }> }
> = {
  design: { label: PLANT_QUICK_DOC_LABEL.design, color: '#52c41a', icon: FileImageOutlined },
  completion: { label: PLANT_QUICK_DOC_LABEL.completion, color: '#13c2c2', icon: FilePdfOutlined },
  envApproval: { label: PLANT_QUICK_DOC_LABEL.envApproval, color: '#2f9e44', icon: EnvironmentOutlined },
  monitoring: { label: PLANT_QUICK_DOC_LABEL.monitoring, color: '#722ed1', icon: BarChartOutlined },
  operation: { label: PLANT_QUICK_DOC_LABEL.operation, color: '#f5222d', icon: FileTextOutlined },
  safety: { label: PLANT_QUICK_DOC_LABEL.safety, color: '#fa8c16', icon: SafetyCertificateOutlined },
};

export const PlantDocumentList: React.FC<{
  documents: PlantArchiveDocument[];
  canEdit?: boolean;
  onDelete?: (docId: string) => void;
}> = ({ documents, canEdit, onDelete }) => {
  const getFileIcon = (type: PlantArchiveDocumentType) => {
    const IconComponent = documentTypeConfig[type]?.icon || FileOutlined;
    const color = documentTypeConfig[type]?.color;
    return <IconComponent style={{ color, fontSize: 24 }} />;
  };

  if (!documents || documents.length === 0) {
    return <Empty description="暂无污水厂资料" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <List
      dataSource={documents}
      renderItem={doc => (
        <List.Item
          actions={[
            <Button key="view" type="link" className="action-btn detail" icon={<EyeOutlined />}>
              查阅
            </Button>,
            <Button key="dl" type="link" className="action-btn detail" icon={<DownloadOutlined />}>
              下载
            </Button>,
            ...(canEdit && onDelete
              ? [
                  <Button
                    key="del"
                    type="link"
                    className="action-btn delete"
                    icon={<DeleteOutlined />}
                    onClick={() => onDelete(doc.id)}
                  >
                    删除
                  </Button>,
                ]
              : []),
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

const QUICK_TYPES: PlantArchiveDocumentType[] = [
  'design',
  'completion',
  'envApproval',
  'monitoring',
  'operation',
  'safety',
];

export const PlantDocumentsEditPanel: React.FC<{
  documents: PlantArchiveDocument[];
  onChange: (next: PlantArchiveDocument[]) => void;
}> = ({ documents, onChange }) => {
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const pendingTypeRef = useRef<PlantArchiveDocumentType | null>(null);

  const triggerLocalDocPick = (t: PlantArchiveDocumentType) => {
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
    const doc = plantDocFromLocalFile(docType, file);
    onChange([...documents, doc]);
    message.success(`已选择「${file.name}」并加入污水厂资料列表`);
  };

  const onDelete = (id: string) => {
    onChange(documents.filter(d => d.id !== id));
    message.success('污水厂资料已删除');
  };

  return (
    <div>
      <input ref={docFileInputRef} type="file" style={{ display: 'none' }} onChange={onLocalFileChange} />
      <Card size="small" title="快速上传" style={{ marginBottom: 16 }}>
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
          整合全厂设计、环保、监测与运维等档案，支持集中管理与追溯；调起本机选文件，仅记元信息（原型不落盘）。
        </Typography.Text>
        <Space wrap>
          {QUICK_TYPES.map(t => (
            <Button key={t} icon={<UploadOutlined />} onClick={() => triggerLocalDocPick(t)}>
              {PLANT_QUICK_DOC_LABEL[t]}
            </Button>
          ))}
        </Space>
      </Card>
      <Card size="small" title="污水厂资料列表">
        <PlantDocumentList documents={documents} canEdit onDelete={onDelete} />
      </Card>
    </div>
  );
};
