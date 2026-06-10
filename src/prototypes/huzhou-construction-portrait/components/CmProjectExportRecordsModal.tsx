/**
 * 建设工程画像 · 批量导出记录（居中弹窗）
 */
import React, { useCallback, useMemo, useState } from 'react';
import { CopyOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import { Button, Empty, Modal, Popconfirm, Space, Table, Tooltip, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { redownloadCmProjectExportRecord } from '../cmProjectBatchExport';
import {
  formatCmProjectExportTime,
  type CmProjectExportRecord,
} from '../cmProjectExportRecords';

const { Text } = Typography;

export type CmProjectExportRecordsModalProps = {
  open: boolean;
  records: CmProjectExportRecord[];
  onClose: () => void;
  onRemove: (id: string) => void;
  onClear: () => void | Promise<void>;
};

const POPUP_Z_INDEX = 2100;

export const CmProjectExportRecordsModal: React.FC<CmProjectExportRecordsModalProps> = ({
  open,
  records,
  onClose,
  onRemove,
  onClear,
}) => {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const copyPassword = useCallback(async (password: string) => {
    try {
      await navigator.clipboard.writeText(password);
      message.success('密码已复制');
    } catch {
      message.error('复制失败，请手动复制');
    }
  }, []);

  const handleDownload = useCallback(async (record: CmProjectExportRecord) => {
    setDownloadingId(record.id);
    try {
      await redownloadCmProjectExportRecord(record);
      message.success('已开始下载');
    } catch (err) {
      message.error(err instanceof Error ? err.message : '下载失败');
    } finally {
      setDownloadingId(null);
    }
  }, []);

  const handleClearAll = useCallback(() => {
    Modal.confirm({
      title: '清空全部导出记录？',
      content: '清空后列表不可恢复，已下载的压缩包不受影响。',
      okText: '清空',
      okType: 'danger',
      cancelText: '取消',
      centered: true,
      zIndex: POPUP_Z_INDEX,
      onOk: () => onClear(),
    });
  }, [onClear]);

  const columns: ColumnsType<CmProjectExportRecord> = useMemo(
    () => [
      {
        title: '导出时间',
        dataIndex: 'exportedAt',
        width: 168,
        render: iso => formatCmProjectExportTime(iso),
      },
      {
        title: '导出人',
        dataIndex: 'exportedBy',
        width: 88,
        ellipsis: true,
      },
      {
        title: '文件名',
        dataIndex: 'fileName',
        ellipsis: true,
      },
      {
        title: '项目',
        dataIndex: 'projectCount',
        width: 72,
        align: 'center',
        render: (count: number, row) => (
          <Tooltip
            title={
              row.projectNames.length > 0 ? (
                <div style={{ maxWidth: 360 }}>{row.projectNames.join('、')}</div>
              ) : (
                '无项目明细'
              )
            }
          >
            <span>{count} 个</span>
          </Tooltip>
        ),
      },
      {
        title: '字段',
        dataIndex: 'fieldCount',
        width: 64,
        align: 'center',
        render: n => `${n} 项`,
      },
      {
        title: '解压密码',
        dataIndex: 'password',
        width: 140,
        render: password => (
          <span className="hz-cm-export-records-modal__password">
            <Text code style={{ fontSize: 13 }}>
              {password}
            </Text>
            <Tooltip title="复制密码">
              <Button
                type="text"
                size="small"
                className="hz-cm-export-records-modal__copy-btn"
                icon={<CopyOutlined />}
                onClick={() => void copyPassword(password)}
              />
            </Tooltip>
          </span>
        ),
      },
      {
        title: '操作',
        key: 'actions',
        width: 120,
        fixed: 'right',
        render: (_, row) => (
          <Space size={4}>
            <Button
              type="link"
              size="small"
              icon={<DownloadOutlined />}
              loading={downloadingId === row.id}
              onClick={() => void handleDownload(row)}
            >
              下载
            </Button>
            <Popconfirm
              title="删除这条导出记录？"
              okText="删除"
              okType="danger"
              cancelText="取消"
              zIndex={POPUP_Z_INDEX}
              getPopupContainer={() => document.body}
              onConfirm={() => void onRemove(row.id)}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [copyPassword, downloadingId, handleDownload, onRemove],
  );

  const footer = (
    <div className="hz-cm-export-records-modal__footer">
      {records.length > 0 ? (
        <Text type="secondary">保存在项目本地文件，最多保留 50 条</Text>
      ) : (
        <span />
      )}
      <Space>
        {records.length > 0 ? (
          <Button danger onClick={handleClearAll}>
            清空记录
          </Button>
        ) : null}
        <Button type="primary" onClick={onClose}>
          关闭
        </Button>
      </Space>
    </div>
  );

  return (
    <Modal
      title="导出记录"
      open={open}
      width={Math.min(920, window.innerWidth - 48)}
      centered
      maskClosable
      onCancel={onClose}
      className="hz-cm-export-records-modal"
      footer={footer}
      zIndex={2000}
      styles={{ body: { minHeight: 280 } }}
    >
      <div className="hz-cm-export-records-modal__body">
        {records.length === 0 ? (
          <Empty description="暂无导出记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Table<CmProjectExportRecord>
            size="small"
            rowKey="id"
            pagination={{ defaultPageSize: 8, showSizeChanger: false }}
            scroll={{ x: 848 }}
            columns={columns}
            dataSource={records}
          />
        )}
      </div>
    </Modal>
  );
};
