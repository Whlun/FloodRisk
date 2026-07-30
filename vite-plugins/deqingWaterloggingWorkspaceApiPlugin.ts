import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import {
  getWorkspaceRevision,
  validateWorkspace,
} from '../src/prototypes/deqing-waterlogging-risk/workspaceValidation';
import type { DeqingWaterloggingWorkspace } from '../src/prototypes/deqing-waterlogging-risk/workspaceTypes';
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

export type WorkspaceFileReadResult =
  | { status: 'missing' }
  | { status: 'ok'; workspace: DeqingWaterloggingWorkspace }
  | { status: 'corrupt'; error: string };

export function readWorkspaceFileAt(filePath: string): WorkspaceFileReadResult {
  if (!fs.existsSync(filePath)) {
    return { status: 'missing' };
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) {
      return { status: 'corrupt', error: '工作区文件为空' };
    }
    const parsed = JSON.parse(raw) as unknown;
    const validation = validateWorkspace(parsed);
    if (!validation.valid) {
      return { status: 'corrupt', error: `工作区结构损坏：${validation.error}` };
    }
    return { status: 'ok', workspace: parsed as DeqingWaterloggingWorkspace };
  } catch (error) {
    return {
      status: 'corrupt',
      error: error instanceof Error ? `工作区 JSON 损坏：${error.message}` : '工作区 JSON 损坏',
    };
  }
}

export function writeWorkspaceFileAtomicAt(
  filePath: string,
  data: DeqingWaterloggingWorkspace,
): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tempPath = path.join(
    dir,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`,
  );
  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2) + '\n', {
      encoding: 'utf8',
      flag: 'wx',
    });
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch {
      // 原始写入异常优先返回；残留临时文件不会替换正式工作区。
    }
    throw error;
  }
}

function sendJson(res: any, statusCode: number, body: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
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
            const result = readWorkspaceFileAt(getWorkspacePath());
            res.setHeader('Cache-Control', 'no-store');
            if (result.status === 'missing') {
              sendJson(res, 404, { error: '工作区尚未初始化' });
              return;
            }
            if (result.status === 'corrupt') {
              sendJson(res, 500, {
                error: result.error,
                code: 'WORKSPACE_CORRUPT',
              });
              return;
            }
            sendJson(res, 200, {
              ...result.workspace,
              revision: getWorkspaceRevision(result.workspace),
            });
            return;
          }

          if (req.method === 'PUT') {
            const body = await readJsonBody(req);
            if (
              !body ||
              typeof body !== 'object' ||
              !Number.isSafeInteger(body.expectedRevision) ||
              body.expectedRevision < 0 ||
              !body.workspace
            ) {
              sendJson(res, 400, { error: '无效的工作区保存请求' });
              return;
            }
            const validation = validateWorkspace(body.workspace);
            if (!validation.valid) {
              sendJson(res, 400, { error: `无效的工作区数据：${validation.error}` });
              return;
            }

            const current = readWorkspaceFileAt(getWorkspacePath());
            if (current.status === 'corrupt') {
              sendJson(res, 500, {
                error: current.error,
                code: 'WORKSPACE_CORRUPT',
              });
              return;
            }
            const currentRevision =
              current.status === 'missing' ? 0 : getWorkspaceRevision(current.workspace);
            if (body.expectedRevision !== currentRevision) {
              sendJson(res, 409, {
                error: '工作区已被其他会话更新，请重新加载或导出本地数据后处理冲突',
                code: 'WORKSPACE_CONFLICT',
                currentRevision,
              });
              return;
            }

            const revision = currentRevision + 1;
            const workspace: DeqingWaterloggingWorkspace = {
              ...(body.workspace as DeqingWaterloggingWorkspace),
              revision,
              updatedAt: new Date().toISOString(),
            };
            writeWorkspaceFileAtomicAt(getWorkspacePath(), workspace);
            sendJson(res, 200, {
              success: true,
              revision,
              updatedAt: workspace.updatedAt,
            });
            return;
          }

          sendJson(res, 405, { error: 'Method Not Allowed' });
        } catch (error: any) {
          sendJson(res, 500, { error: error?.message || '未知错误' });
        }
      });
    },
  };
}
