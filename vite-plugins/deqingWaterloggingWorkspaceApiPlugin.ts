import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import { getRequestPathname, readJsonBody } from './utils/httpUtils';

const WORKSPACE_FILE = path.join(
  'src',
  'prototypes',
  'deqing-waterlogging-risk',
  'workspace-data.json',
);

function getWorkspacePath(): string {
  return path.resolve(process.cwd(), WORKSPACE_FILE);
}

function readWorkspaceFile(): unknown | null {
  const filePath = getWorkspacePath();
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return raw.trim() ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeWorkspaceFile(data: unknown): void {
  const filePath = getWorkspacePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

/**
 * 德清内涝原型：工作区持久化（写入项目内 JSON，不依赖浏览器 localStorage）
 */
export function deqingWaterloggingWorkspaceApiPlugin(): Plugin {
  return {
    name: 'deqing-waterlogging-workspace-api',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const pathname = getRequestPathname(req);
        if (pathname !== '/api/deqing-waterlogging/workspace') {
          return next();
        }

        try {
          if (req.method === 'GET') {
            const data = readWorkspaceFile();
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store');
            if (data === null) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: '工作区尚未初始化' }));
              return;
            }
            res.statusCode = 200;
            res.end(JSON.stringify(data));
            return;
          }

          if (req.method === 'PUT') {
            const body = await readJsonBody(req);
            if (!body || typeof body !== 'object') {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: '无效的工作区数据' }));
              return;
            }
            writeWorkspaceFile(body);
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
