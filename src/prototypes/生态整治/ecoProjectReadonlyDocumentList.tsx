/**
 * 项目资料列表（只读）· 与 `index.tsx` 中 `DocumentList` 展示一致
 */
import React from 'react';
import { Button, Empty, List, Space, Tag, Typography } from 'antd';
import {
  DownloadOutlined,
  EyeOutlined,
  FileImageOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FileWordOutlined,
} from '@ant-design/icons';
import type { EcoProjectArchiveDocument as ProjectDocument, EcoProjectArchiveDocumentType as DocumentType } from './eco-project-archive-demo';

const { Text } = Typography;

const documentTypeConfig: Record<DocumentType, { label: string; color: string; icon: React.ComponentType<{ style?: React.CSSProperties }> }> = {
  feasibility: { label: '可行性研究报告', color: '#1890ff', icon: FileTextOutlined },
  design: { label: '设计图纸', color: '#52c41a', icon: FileImageOutlined },
  bidding: { label: '招投标文件', color: '#faad14', icon: FileTextOutlined },
  contract: { label: '施工合同', color: '#722ed1', icon: FileWordOutlined },
  completion: { label: '竣工验收报告', color: '#13c2c2', icon: FilePdfOutlined },
  audit: { label: '审计报告', color: '#eb2f96', icon: FilePdfOutlined },
  operation: { label: '运维记录', color: '#f5222d', icon: FileOutlined },
};

export const EcoProjectReadonlyDocumentList: React.FC<{ documents: ProjectDocument[] }> = ({ documents }) => {
  const getFileIcon = (type: DocumentType) => {
    const IconComponent = documentTypeConfig[type]?.icon || FileOutlined;
    return <IconComponent style={{ color: documentTypeConfig[type]?.color, fontSize: 24 }} />;
  };

  if (documents.length === 0) {
    return <Empty description="暂无项目资料" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
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
          ]}
        >
          <List.Item.Meta
            avatar={getFileIcon(doc.type)}
            title={
              <Space>
                <Text strong>{doc.name}</Text>
                <Tag color={documentTypeConfig[doc.type]?.color}>{documentTypeConfig[doc.type]?.label}</Tag>
              </Space>
            }
            description={
              <Space size={16}>
                <Text type="secondary">{doc.fileName}</Text>
                <Text type="secondary">大小: {doc.fileSize}</Text>
                <Text type="secondary">上传时间: {doc.uploadTime}</Text>
                <Text type="secondary">上传人: {doc.uploader}</Text>
              </Space>
            }
          />
        </List.Item>
      )}
    />
  );
};
