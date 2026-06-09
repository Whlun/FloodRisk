/**
 * 设施管理「统计类」页面：将 DOM 导出为多页 PDF。
 * 使用 html2canvas 截图 + jsPDF addImage 分页，避免 jsPDF 3 html() 默认
 * context2d 管线将中文当矢量文本写入却无 CJK 字体时的乱码。
 * 下载一律使用 ArrayBuffer → Blob(application/pdf)，避免宿主误判格式。
 */
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

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

interface CaptureSession {
  captureRoot: HTMLElement;
  cleanup: () => void;
}

/** 克隆节点到屏外容器，避免 Modal transform/overflow 影响截图。 */
function createOffscreenCaptureRoot(element: HTMLElement): CaptureSession {
  const overlay = document.createElement('div');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.style.cssText =
    'position:fixed;overflow:hidden;z-index:100000;left:-100000px;top:0;right:0;bottom:0;';

  const winW = Math.max(element.scrollWidth, element.clientWidth, element.offsetWidth, 800);
  const container = document.createElement('div');
  container.style.cssText = `position:relative;display:inline-block;width:${winW}px;background:#ffffff;`;

  const clone = element.cloneNode(true) as HTMLElement;
  container.appendChild(clone);
  overlay.appendChild(container);
  document.body.appendChild(overlay);

  return {
    captureRoot: clone,
    cleanup: () => {
      overlay.remove();
    },
  };
}

function sliceCanvasToPdf(pdf: jsPDF, canvas: HTMLCanvasElement, marginMm: number): void {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const innerW = pageW - marginMm * 2;
  const innerH = pageH - marginMm * 2;

  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  const imgW = innerW;
  const imgH = (canvas.height * imgW) / canvas.width;
  const pageCount = Math.max(1, Math.ceil(imgH / innerH));

  for (let i = 0; i < pageCount; i += 1) {
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, 'JPEG', marginMm, marginMm - i * innerH, imgW, imgH);
  }
}

/**
 * @param element 待渲染的根节点（筛选区 + 指标卡 + 图表 + 表格）
 * @param fileNamePrefix 保存文件名前缀（不含扩展名）
 */
export async function downloadElementAsPdf(element: HTMLElement, fileNamePrefix: string): Promise<void> {
  await document.fonts.ready.catch(() => {});
  await new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  const { captureRoot, cleanup } = createOffscreenCaptureRoot(element);
  try {
    const winW = Math.max(element.scrollWidth, element.clientWidth, element.offsetWidth, 800);
    const scale = Math.min(2, Math.max(1, window.devicePixelRatio || 1));

    const canvas = await html2canvas(captureRoot, {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      windowWidth: winW,
    });

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    sliceCanvasToPdf(pdf, canvas, 8);

    const fname = `${sanitizeFilePrefix(fileNamePrefix)}_${fileStamp()}.pdf`;
    const buf = pdf.output('arraybuffer');
    triggerPdfDownload(new Blob([buf], { type: 'application/pdf' }), fname);
  } finally {
    cleanup();
  }
}
