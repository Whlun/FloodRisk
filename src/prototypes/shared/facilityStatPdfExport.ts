/**
 * 设施管理「统计类」页面：将 DOM 导出为多页 PDF。
 * 使用 jsPDF 内置 `.html()`（内置 html2canvas 管线），分页稳定。
 * 下载一律使用 ArrayBuffer → Blob(application/pdf)，避免宿主误判格式。
 */
import { jsPDF } from 'jspdf';

function sanitizeFilePrefix(prefix: string): string {
  return prefix.replace(/[/\\?%*:|"<>]/g, '_');
}

function fileStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;
}

function triggerPdfDownload(blob: Blob, filename: string): void {
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

/**
 * @param element 待渲染的根节点（筛选区 + 指标卡 + 图表 + 表格）
 * @param fileNamePrefix 保存文件名前缀（不含扩展名）
 */
export async function downloadElementAsPdf(element: HTMLElement, fileNamePrefix: string): Promise<void> {
  await document.fonts.ready.catch(() => {});
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = pdf.internal.pageSize.getWidth();
  const marginMm = 8;
  const innerW = pageW - marginMm * 2;

  const winW = Math.max(element.scrollWidth, element.clientWidth, 800);

  await pdf.html(element, {
    x: marginMm,
    y: marginMm,
    width: innerW,
    windowWidth: winW,
    margin: 0,
    autoPaging: 'slice',
    html2canvas: {
      scale: Math.min(1.35, Math.max(1, window.devicePixelRatio || 1)),
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: -window.scrollY,
    },
  });

  const fname = `${sanitizeFilePrefix(fileNamePrefix)}_${fileStamp()}.pdf`;
  const buf = pdf.output('arraybuffer');
  triggerPdfDownload(new Blob([buf], { type: 'application/pdf' }), fname);
}
