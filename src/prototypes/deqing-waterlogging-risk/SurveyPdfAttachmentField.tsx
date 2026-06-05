import React, { useCallback, useMemo, useRef } from 'react';
import { Button, Space, Upload, message } from 'antd';
import { FilePdfOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import type { SurveyPdfAttachment } from './types';

const PDF_ACCEPT = '.pdf,application/pdf';
const MAX_COUNT = 5;
const MAX_MB = 15;

function nowStamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function isPdfFile(file: File): boolean {
  if (file.type === 'application/pdf') return true;
  return /\.pdf$/i.test(file.name);
}

interface Props {
  value?: SurveyPdfAttachment[];
  onChange?: (files: SurveyPdfAttachment[]) => void;
  disabled?: boolean;
}

/** 普查元信息：PDF 附件（浏览器本地 data URL，原型演示） */
export const SurveyPdfAttachmentField: React.FC<Props> = ({ value, onChange, disabled }) => {
  const list = value ?? [];
  const listRef = useRef(list);
  listRef.current = list;

  const fileList: UploadFile[] = useMemo(
    () =>
      list.map(item => ({
        uid: item.id,
        name: item.fileName,
        status: 'done' as const,
        url: item.dataUrl,
      })),
    [list],
  );

  const beforeUpload = useCallback(
    (file: File) => {
      if (!isPdfFile(file)) {
        message.error('仅支持 PDF 文件');
        return Upload.LIST_IGNORE;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        message.error(`单文件不超过 ${MAX_MB}MB`);
        return Upload.LIST_IGNORE;
      }
      if (listRef.current.length >= MAX_COUNT) {
        message.warning(`最多上传 ${MAX_COUNT} 个 PDF`);
        return Upload.LIST_IGNORE;
      }

      return new Promise<boolean | typeof Upload.LIST_IGNORE>(resolve => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result;
          if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
            message.error('文件解析失败，请重试');
            resolve(Upload.LIST_IGNORE);
            return;
          }
          const next: SurveyPdfAttachment[] = [
            ...listRef.current,
            {
              id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              fileName: file.name,
              dataUrl,
              uploadedAt: nowStamp(),
            },
          ];
          listRef.current = next;
          onChange?.(next);
          resolve(false);
        };
        reader.onerror = () => {
          message.error('读取文件失败，请重试');
          resolve(Upload.LIST_IGNORE);
        };
        reader.readAsDataURL(file);
      });
    },
    [onChange],
  );

  const handleRemove = useCallback(
    (file: UploadFile) => {
      const next = listRef.current.filter(item => item.id !== file.uid);
      listRef.current = next;
      onChange?.(next);
    },
    [onChange],
  );

  if (disabled) {
    if (!list.length) {
      return <span className="dq-survey-attach-empty">暂无附件</span>;
    }
    return (
      <ul className="dq-survey-attach-readonly">
        {list.map(item => (
          <li key={item.id}>
            <FilePdfOutlined />
            <span>{item.fileName}</span>
            <Space size={4}>
              <Button type="link" size="small" href={item.dataUrl} target="_blank" rel="noopener noreferrer">
                查看
              </Button>
              <Button type="link" size="small" href={item.dataUrl} download={item.fileName}>
                下载
              </Button>
            </Space>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="dq-survey-pdf-upload">
      <Upload
        accept={PDF_ACCEPT}
        multiple
        maxCount={MAX_COUNT}
        fileList={fileList}
        beforeUpload={beforeUpload}
        onRemove={handleRemove}
      >
        {list.length >= MAX_COUNT ? null : (
          <Button icon={<UploadOutlined />}>上传 PDF</Button>
        )}
      </Upload>
      <div className="dq-survey-pdf-upload-hint">
        支持 PDF，单文件 ≤ {MAX_MB}MB，最多 {MAX_COUNT} 个；原型为浏览器本地存储，刷新页面可能丢失。
      </div>
    </div>
  );
};
