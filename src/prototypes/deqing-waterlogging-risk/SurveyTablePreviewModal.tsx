import React, { useMemo, useRef, useState } from 'react';
import { Alert, Button, Modal, Space, Tabs, message } from 'antd';
import { DownloadOutlined, PrinterOutlined, TableOutlined } from '@ant-design/icons';
import type { RiskIndicatorRow } from './types';
import type { SurveyPointType } from './types';
import { HAZARD_POINT_TYPE_LABEL } from './types';
import { SURVEY_TABLE_POINT_TYPES, buildSurveyTablePreview } from './surveyTablePreviewModel';
import { SurveyTablePreviewDocument } from './SurveyTablePreviewDocument';
import { downloadElementAsPdf } from '../shared/facilityStatPdfExport';

interface Props {
  open: boolean;
  onClose: () => void;
  indicators: RiskIndicatorRow[];
}

function formatGeneratedAt(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const SurveyTablePreviewModal: React.FC<Props> = ({ open, onClose, indicators }) => {
  const [activeType, setActiveType] = useState<SurveyPointType>('SUNKEN');
  const [exporting, setExporting] = useState(false);
  const printRootRef = useRef<HTMLDivElement>(null);

  const generatedAt = useMemo(() => formatGeneratedAt(), [open]);
  const activeModel = useMemo(
    () => buildSurveyTablePreview(activeType, indicators),
    [activeType, indicators],
  );

  const handleDownloadPdf = async () => {
    const el = printRootRef.current?.querySelector('.dq-survey-preview-doc') as HTMLElement | null;
    if (!el) {
      message.error('未找到预览内容');
      return;
    }
    setExporting(true);
    const hide = message.loading('正在生成 PDF…', 0);
    try {
      await downloadElementAsPdf(
        el,
        `内涝普查信息采集表_${HAZARD_POINT_TYPE_LABEL[activeType]}`,
      );
      message.success('已下载 PDF');
    } catch {
      message.error('导出 PDF 失败，请稍后重试');
    } finally {
      hide();
      setExporting(false);
    }
  };

  const handlePrint = () => {
    const root = printRootRef.current;
    if (!root) return;
    root.classList.add('dq-survey-preview-printing');
    window.print();
    window.setTimeout(() => root.classList.remove('dq-survey-preview-printing'), 500);
  };

  const tabBarActions = (
    <Space wrap className="dq-survey-preview-toolbar" size={8}>
      <Button size="small" icon={<PrinterOutlined />} onClick={handlePrint}>
        打印
      </Button>
      <Button
        size="small"
        type="primary"
        icon={<DownloadOutlined />}
        loading={exporting}
        onClick={handleDownloadPdf}
      >
        下载 PDF
      </Button>
    </Space>
  );

  return (
    <Modal
      title={
        <Space>
          <TableOutlined />
          普查信息采集表预览
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={920}
      destroyOnClose
      className="dq-survey-preview-modal"
      footer={null}
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="根据当前「风险指标管理」中启用且纳入普查的指标，生成四种易涝点类型的附录 B 样式预览表；打印与 PDF 以当前 Tab 类型为准。"
      />
      <Tabs
        className="dq-survey-preview-tabs"
        activeKey={activeType}
        onChange={key => setActiveType(key as SurveyPointType)}
        tabBarExtraContent={tabBarActions}
        items={SURVEY_TABLE_POINT_TYPES.map(pt => ({
          key: pt,
          label: HAZARD_POINT_TYPE_LABEL[pt],
        }))}
      />
      <div ref={printRootRef} className="dq-survey-preview-print-root">
        <SurveyTablePreviewDocument model={activeModel} generatedAt={generatedAt} />
      </div>
    </Modal>
  );
};
