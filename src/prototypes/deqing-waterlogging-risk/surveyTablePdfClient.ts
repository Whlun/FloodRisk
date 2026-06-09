import type { SurveyTablePreviewModel } from './surveyTablePreviewModel';

export interface SurveyTablePdfDocumentPayload {
  model: SurveyTablePreviewModel;
  generatedAt?: string;
  fileNamePrefix: string;
}

function triggerDownload(blob: Blob, filename: string): void {
  const safeName = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = safeName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function parseErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const err = (payload as { error?: unknown }).error;
    if (typeof err === 'string' && err.trim()) return err;
  }
  return fallback;
}

/** 调用 dev server 后端 Playwright 生成 PDF，并触发浏览器下载（多类型合并为一份） */
export async function downloadSurveyTablePdfs(
  documents: SurveyTablePdfDocumentPayload[],
): Promise<void> {
  const res = await fetch('/api/deqing-waterlogging/survey-table/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documents }),
  });

  const contentType = res.headers.get('Content-Type') || '';

  if (!res.ok) {
    let message = '导出 PDF 失败，请稍后重试';
    if (contentType.includes('application/json')) {
      message = parseErrorMessage(await res.json(), message);
    }
    throw new Error(message);
  }

  if (!contentType.includes('application/pdf')) {
    throw new Error('服务端返回了未知格式的 PDF 响应');
  }

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i);
  const rawName = match?.[1] || match?.[2] || documents[0]?.fileNamePrefix || 'survey-table';
  const fileName = decodeURIComponent(rawName);
  triggerDownload(blob, fileName);
}
