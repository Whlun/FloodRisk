/**
 * 建设工程画像 · 批量导出成功（展示解压密码）
 */
import React, { useCallback } from 'react';
import { CopyOutlined } from '@ant-design/icons';
import { Button, Input, Modal, Space, Typography, message } from 'antd';

const { Paragraph, Text } = Typography;

export type CmProjectExportSuccessModalProps = {
  open: boolean;
  password: string;
  projectCount: number;
  fileName: string;
  onClose: () => void;
};

export const CmProjectExportSuccessModal: React.FC<CmProjectExportSuccessModalProps> = ({
  open,
  password,
  projectCount,
  fileName,
  onClose,
}) => {
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(password);
      message.success('密码已复制');
    } catch {
      message.error('复制失败，请手动复制');
    }
  }, [password]);

  return (
    <Modal
      title="导出成功"
      open={open}
      width={480}
      destroyOnClose
      maskClosable={false}
      onCancel={onClose}
      footer={
        <Button type="primary" onClick={onClose}>
          我知道了
        </Button>
      }
    >
      <Paragraph style={{ marginBottom: 12 }}>
        加密压缩包已开始下载，共 <Text strong>{projectCount}</Text> 个项目。
      </Paragraph>
      <Text type="secondary">文件名</Text>
      <Paragraph style={{ marginTop: 4, marginBottom: 12 }}>
        <Text code>{fileName}</Text>
      </Paragraph>
      <Text type="secondary">解压密码</Text>
      <Space.Compact block style={{ marginTop: 8 }}>
        <Input
          readOnly
          value={password}
          aria-label="解压密码"
          style={{ fontFamily: 'ui-monospace, monospace', fontSize: 16, fontWeight: 600 }}
        />
        <Button type="primary" icon={<CopyOutlined />} onClick={() => void handleCopy()}>
          复制
        </Button>
      </Space.Compact>
      <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 13 }}>
        请妥善保存密码；关闭本窗口后可在「导出记录」中再次查看与复制。
      </Paragraph>
    </Modal>
  );
};
