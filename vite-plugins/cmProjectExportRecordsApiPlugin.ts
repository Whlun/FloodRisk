import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import { getRequestPathname, readJsonBody } from './utils/httpUtils';

const RECORDS_FILE = path.join(
  'src',
  'prototypes',
  'huzhou-construction-portrait',
  'cm-project-export-records.json',
);

const API_PATH = '/api/huzhou-cm/export-records';

function getRecordsPath(): string {
  return path.resolve(process.cwd(), RECORDS_FILE);
}

type ExportRecordsFile = {
  records: unknown[];
};

function readRecordsFile(): ExportRecordsFile {
  const filePath = getRecordsPath();
  if (!fs.existsSync(filePath)) {
    return { records: [] };
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = raw.trim() ? (JSON.parse(raw) as ExportRecordsFile) : { records: [] };
    return { records: Array.isArray(parsed.records) ? parsed.records : [] };
  } catch {
    return { records: [] };
  }
}

function writeRecordsFile(data: ExportRecordsFile): void {
  const filePath = getRecordsPath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

/**
 * 建设工程画像：导出记录持久化（写入项目内 JSON，不依赖浏览器 localStorage）
 */
export function cmProjectExportRecordsApiPlugin(): Plugin {
  return {
    name: 'huzhou-cm-export-records-api',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const pathname = getRequestPathname(req);
        if (pathname !== API_PATH) {
          return next();
        }

        try {
          if (req.method === 'GET') {
            const data = readRecordsFile();
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store');
            res.statusCode = 200;
            res.end(JSON.stringify(data));
            return;
          }

          if (req.method === 'PUT') {
            const body = (await readJsonBody(req)) as ExportRecordsFile | null;
            if (!body || !Array.isArray(body.records)) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: '无效的导出记录数据' }));
              return;
            }
            writeRecordsFile({ records: body.records });
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(
              JSON.stringify({
                success: true,
                updatedAt: new Date().toISOString(),
              }),
            );
            return;
          }

          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
        } catch (error: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: error?.message || '未知错误' }));
        }
      });
    },
  };
}
