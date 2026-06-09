/**
 * 德清内涝 · 普查信息采集表 PDF 导出（Vite dev server + Playwright）
 */
import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import { getRequestPathname, readJsonBody } from './utils/httpUtils';
import { buildAttachmentContentDisposition } from './utils/contentDisposition';
import {
  renderSurveyTablePreviewDocumentHtml,
  renderSurveyTablePreviewDocumentsHtml,
} from '../src/prototypes/deqing-waterlogging-risk/surveyTablePreviewHtml';
import type { SurveyTablePreviewModel } from '../src/prototypes/deqing-waterlogging-risk/surveyTablePreviewModel';

const API_PATH = '/api/deqing-waterlogging/survey-table/pdf';
const PRINT_CSS_REL = path.join(
  'src',
  'prototypes',
  'deqing-waterlogging-risk',
  'surveyTablePreviewPrint.css',
);

interface PdfDocumentRequest {
  model: SurveyTablePreviewModel;
  generatedAt?: string;
  fileNamePrefix: string;
}

interface PdfExportRequestBody {
  documents?: PdfDocumentRequest[];
}

let browserPromise: Promise<import('playwright').Browser> | null = null;

function sanitizeFilePrefix(prefix: string): string {
  return prefix.replace(/[/\\?%*:|"<>]/g, '_');
}

function fileStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;
}

function readPrintStyles(): string {
  const cssPath = path.resolve(process.cwd(), PRINT_CSS_REL);
  if (!fs.existsSync(cssPath)) {
    throw new Error(`缺少打印样式文件：${PRINT_CSS_REL}`);
  }
  return fs.readFileSync(cssPath, 'utf8');
}

async function getBrowser(): Promise<import('playwright').Browser> {
  if (!browserPromise) {
    browserPromise = (async () => {
      const { chromium } = await import('playwright');
      try {
        return await chromium.launch({ headless: true });
      } catch (primaryError) {
        try {
          return await chromium.launch({ headless: true, channel: 'chrome' });
        } catch {
          throw primaryError;
        }
      }
    })().catch(error => {
      browserPromise = null;
      throw error;
    });
  }
  return browserPromise;
}

async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'load' });
    await page.emulateMedia({ media: 'print' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', right: '15mm', bottom: '12mm', left: '15mm' },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

function validateDocuments(body: PdfExportRequestBody): PdfDocumentRequest[] {
  const docs = body.documents;
  if (!Array.isArray(docs) || docs.length === 0) {
    throw new Error('documents 不能为空');
  }
  for (const doc of docs) {
    if (!doc?.model || typeof doc.model !== 'object') {
      throw new Error('documents 项缺少 model');
    }
    if (!doc.fileNamePrefix || typeof doc.fileNamePrefix !== 'string') {
      throw new Error('documents 项缺少 fileNamePrefix');
    }
  }
  return docs;
}

export function surveyTablePdfApiPlugin(): Plugin {
  return {
    name: 'deqing-survey-table-pdf-api',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const pathname = getRequestPathname(req);
        if (pathname !== API_PATH) {
          return next();
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        try {
          const body = (await readJsonBody(req)) as PdfExportRequestBody;
          const documents = validateDocuments(body);
          const styles = readPrintStyles();
          const stamp = fileStamp();

          const fileName =
            documents.length === 1
              ? `${sanitizeFilePrefix(documents[0].fileNamePrefix)}_${stamp}.pdf`
              : `内涝普查信息采集表_${stamp}.pdf`;

          const html =
            documents.length === 1
              ? renderSurveyTablePreviewDocumentHtml(
                  documents[0].model,
                  styles,
                  documents[0].generatedAt,
                )
              : renderSurveyTablePreviewDocumentsHtml(
                  documents.map(doc => ({ model: doc.model, generatedAt: doc.generatedAt })),
                  styles,
                );

          const pdfBuffer = await renderHtmlToPdf(html);

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', buildAttachmentContentDisposition(fileName));
          res.end(pdfBuffer);
        } catch (error: any) {
          const message = error?.message || 'PDF 生成失败';
          const isPlaywrightMissing =
            message.includes("Cannot find package 'playwright'") ||
            message.includes("Executable doesn't exist") ||
            message.includes('browserType.launch');

          res.statusCode = isPlaywrightMissing ? 503 : 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(
            JSON.stringify({
              error: isPlaywrightMissing
                ? '服务端 PDF 引擎未就绪，请在项目根目录执行：npm install && npx playwright install chromium'
                : message,
            }),
          );
        }
      });
    },
  };
}
