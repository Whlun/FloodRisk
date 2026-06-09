import React, { useMemo, useRef, useState } from 'react';
import { Alert, Button, Modal, Space, Tabs, message } from 'antd';
import { DownloadOutlined, PrinterOutlined, TableOutlined } from '@ant-design/icons';
import type { RiskIndicatorRow } from './types';
import type { SurveyPointType } from './types';
import type { IndicatorArchitectureRecord } from './types';
import { HAZARD_POINT_TYPE_LABEL } from './types';
import { SURVEY_TABLE_POINT_TYPES, buildSurveyTablePreview } from './surveyTablePreviewModel';
import { SurveyTablePreviewDocument } from './SurveyTablePreviewDocument';
import { downloadSurveyTablePdfs } from './surveyTablePdfClient';
import { ArchitectureVersionRefTag } from './ArchitectureVersionRefTag';

interface Props {
  open: boolean;
  onClose: () => void;
  indicators: RiskIndicatorRow[];
  /** 定级引用的指标架构版本（展示于标题与说明） */
  architectureRecord?: IndicatorArchitectureRecord | null;
}

function formatGeneratedAt(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const SurveyTablePreviewModal: React.FC<Props> = ({
  open,
  onClose,
  indicators,
  architectureRecord,
}) => {
  const [activeType, setActiveType] = useState<SurveyPointType>('SUNKEN');
  const [exporting, setExporting] = useState(false);
  const printRootRef = useRef<HTMLDivElement>(null);

  const generatedAt = useMemo(() => formatGeneratedAt(), [open]);
  const previewModels = useMemo(
    () =>
      SURVEY_TABLE_POINT_TYPES.map(pointType => ({
        pointType,
        model: buildSurveyTablePreview(pointType, indicators, { architectureScoped: true }),
      })),
    [indicators],
  );
  const activeModel = useMemo(
    () => previewModels.find(m => m.pointType === activeType)?.model ?? previewModels[0].model,
    [previewModels, activeType],
  );

  const handleDownloadPdf = async () => {
    setExporting(true);
    const hide = message.loading('正在生成 PDF（四种类型合并）…', 0);
    try {
      const documents = previewModels.map(({ pointType, model }) => ({
        model,
        generatedAt,
        fileNamePrefix: `内涝普查信息采集表_${HAZARD_POINT_TYPE_LABEL[pointType]}`,
      }));
      await downloadSurveyTablePdfs(documents);
      message.success('已下载 PDF（含四种易涝点类型）');
    } catch (error) {
      const text = error instanceof Error ? error.message : '导出 PDF 失败，请稍后重试';
      message.error(text);
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
        <Space align="center" size="small">
          <TableOutlined />
          普查信息采集表预览
          {architectureRecord ? <ArchitectureVersionRefTag record={architectureRecord} /> : null}
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
        message={
          architectureRecord?.versionNo
            ? `按评价版本 ${architectureRecord.versionNo} 中已启用且纳入普查的指标，生成四种易涝点类型的信息采集表预览；打印以当前 Tab 为准，下载 PDF 将合并导出四种类型为一份。`
            : '根据当前「风险指标管理」中启用且纳入普查的指标，生成四种易涝点类型的信息采集表预览；打印以当前 Tab 为准，下载 PDF 将合并导出四种类型为一份。'
        }
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
