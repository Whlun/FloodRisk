/**
 * 地块/项目详情 · 档案 Tab（列表交互对齐设施管理「泵站资料」，单层列表无嵌套卡片）
 */
import React, { useMemo } from 'react';
import {
  DownloadOutlined,
  EyeOutlined,
  FileOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FileWordOutlined,
} from '@ant-design/icons';
import { Button, Empty, List, Space, Tag, Typography } from 'antd';
import type { ParcelAttachment } from '../types';

const { Text } = Typography;

type ArchiveTypeStyle = {
  label: string;
  color: string;
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
};

const DEFAULT_TYPE_STYLE: ArchiveTypeStyle = {
  label: '其他',
  color: '#1677ff',
  icon: FileOutlined,
};

const ARCHIVE_TYPE_STYLES: Record<string, ArchiveTypeStyle> = {
  批复文件: { label: '批复文件', color: '#52c41a', icon: FilePdfOutlined },
  合同: { label: '合同', color: '#1890ff', icon: FileTextOutlined },
  许可: { label: '许可', color: '#13c2c2', icon: FileWordOutlined },
  图纸: { label: '图纸', color: '#722ed1', icon: FileImageOutlined },
  报告: { label: '报告', color: '#fa8c16', icon: FilePdfOutlined },
};

function typeStyleOf(type: string): ArchiveTypeStyle {
  const hit = ARCHIVE_TYPE_STYLES[type.trim()];
  if (hit) return hit;
  return { ...DEFAULT_TYPE_STYLE, label: type.trim() || DEFAULT_TYPE_STYLE.label };
}

function displayTitle(name: string): string {
  return name.replace(/\.(pdf|doc|docx|jpg|png)$/i, '') || name;
}

export type ParcelArchiveDocumentsPanelProps = {
  attachments: ParcelAttachment[];
  matterLabel?: string;
  filterByMatter?: boolean;
};

export const ParcelArchiveDocumentsPanel: React.FC<ParcelArchiveDocumentsPanelProps> = ({
  attachments,
  matterLabel,
  filterByMatter = false,
}) => {
  const filtered = useMemo(() => {
    if (!filterByMatter || !matterLabel?.trim()) return attachments;
    const label = matterLabel.trim();
    return attachments.filter(
      a =>
        a.matterName === label ||
        a.name.includes(label) ||
        (label === '预审与选址' && a.name.includes('预审')),
    );
  }, [attachments, matterLabel, filterByMatter]);

  const listTitle = matterLabel
    ? `${matterLabel}（${filtered.length}）`
    : `项目档案（${filtered.length}）`;

  if (filtered.length === 0) {
    return (
      <div className="hz-lifecycle-archive">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={matterLabel ? `暂无${matterLabel}相关档案` : '暂无档案'}
        />
      </div>
    );
  }

  return (
    <div className="hz-lifecycle-archive">
      <Text type="secondary" className="hz-lifecycle-archive__caption">
        {listTitle}
      </Text>
      <List
        className="hz-lifecycle-archive__list"
        bordered
        dataSource={filtered}
        renderItem={doc => {
          const style = typeStyleOf(doc.type);
          const Icon = style.icon;
          return (
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
                avatar={<Icon style={{ color: style.color, fontSize: 24 }} />}
                title={
                  <Space>
                    <span style={{ fontWeight: 600 }}>{displayTitle(doc.name)}</span>
                    <Tag color={style.color}>{style.label}</Tag>
                  </Space>
                }
                description={
                  <Space size={16} wrap>
                    <span className="ant-typography-secondary">{doc.name}</span>
                    <span className="ant-typography-secondary">大小: {doc.fileSize ?? '—'}</span>
                    <span className="ant-typography-secondary">上传时间: {doc.date || '—'}</span>
                    <span className="ant-typography-secondary">上传人: {doc.uploader ?? '—'}</span>
                  </Space>
                }
              />
            </List.Item>
          );
        }}
      />
    </div>
  );
};
