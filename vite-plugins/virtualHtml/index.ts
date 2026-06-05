import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import { handleHackCssRequest } from './handlers/hackCssHandler';
import { handleHackCssSave } from './handlers/hackCssSaveHandler';
import { handleHackCssClear } from './handlers/hackCssClearHandler';
import { handleEntriesApi } from './handlers/entriesApiHandler';
import { handleSpecHtml } from './handlers/specHtmlHandler';
import { handleIndexHtml } from './handlers/indexHtmlHandler';
import { handleAssetsRequest } from './handlers/assetsHandler';
import { handleDocImageAssets } from './handlers/docImageAssetsHandler';
import { handleBuildRequest } from './handlers/buildHandler';
import { handleDocsMarkdown } from './handlers/docsMarkdownHandler';
import { handleTextReplaceCount } from './handlers/textReplaceCountHandler';
import { handleTextReplace } from './handlers/textReplaceHandler';
import { handlePathRedirect } from './handlers/pathNormalizer';
import {
  createDocUpdatePayload,
  createHackCssUpdatePayload,
} from './previewHost';
import { encodeImportedTypedEntryUrls } from './encodeImportedTypedEntryUrls';

/**
 * 虚拟 HTML 插件 - 在内存中生成 HTML，不写入文件系统
 */
export function virtualHtmlPlugin(): Plugin {
  const devTemplatePath = path.resolve(process.cwd(), 'admin/dev-template.html');
  const specTemplatePath = path.resolve(process.cwd(), 'admin/spec-template.html');
  const htmlTemplatePath = path.resolve(process.cwd(), 'admin/html-template.html');
  let devTemplate: string;
  let specTemplate: string;
  let htmlTemplate: string;

  return {
    name: 'virtual-html',
    apply: 'serve',

    handleHotUpdate(ctx) {
      const payload = createDocUpdatePayload(ctx.file, 'change');
      if (!payload) {
        return;
      }

      ctx.server.ws.send({
        type: 'custom',
        event: 'axhub:spec-doc-update',
        data: payload,
      });

      // src 下的 markdown 文档不再走 Vite 默认的全局 full-reload，
      // 只让对应的 spec/doc 页面自行按 URL 维度刷新内容。
      return [];
    },

    async configureServer(server) {
      try {
        devTemplate = fs.readFileSync(devTemplatePath, 'utf8');
      } catch (err) {
        console.error('无法读取 dev-template 模板文件:', devTemplatePath);
      }

      try {
        specTemplate = fs.readFileSync(specTemplatePath, 'utf8');
      } catch (err) {
        console.error('无法读取 spec-template 模板文件:', specTemplatePath);
      }

      try {
        htmlTemplate = fs.readFileSync(htmlTemplatePath, 'utf8');
      } catch (err) {
        console.error('无法读取 html-template 模板文件:', htmlTemplatePath);
      }

      const broadcastHackCssUpdate = (filePath: string, changeType: 'add' | 'change' | 'unlink') => {
        const payload = createHackCssUpdatePayload(filePath, changeType);
        if (!payload) {
          return;
        }

        server.ws.send({
          type: 'custom',
          event: 'axhub:hack-css-update',
          data: payload,
        });
      };

      // 网络卷/同步工具会对同一文件连发 change；立即广播会导致预览里 link[href]?t= 连刷，观感为「不断闪」。
      const hackCssChangeTimers = new Map<string, ReturnType<typeof setTimeout>>();
      const HACK_CSS_DEBOUNCE_MS = 350;
      const scheduleHackCssChange = (filePath: string) => {
        const prev = hackCssChangeTimers.get(filePath);
        if (prev) clearTimeout(prev);
        hackCssChangeTimers.set(
          filePath,
          setTimeout(() => {
            hackCssChangeTimers.delete(filePath);
            broadcastHackCssUpdate(filePath, 'change');
          }, HACK_CSS_DEBOUNCE_MS),
        );
      };

      server.watcher.on('add', (filePath) => broadcastHackCssUpdate(filePath, 'add'));
      server.watcher.on('change', (filePath) => scheduleHackCssChange(filePath));
      server.watcher.on('unlink', (filePath) => {
        const prev = hackCssChangeTimers.get(filePath);
        if (prev) clearTimeout(prev);
        hackCssChangeTimers.delete(filePath);
        broadcastHackCssUpdate(filePath, 'unlink');
      });

      server.middlewares.use(async (req, res, next) => {
        try {
          // CORS headers
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          if (!req.url) {
            return next();
          }

          const respondHtml = async (html: string, transformUrl?: string) => {
            const htmlUrl = transformUrl || req.url || '/index.html';
            const transformedHtml = await server.transformIndexHtml(htmlUrl, html, req.originalUrl || req.url || htmlUrl);
            const safeForEmbeddedWebViewHtml = encodeImportedTypedEntryUrls(transformedHtml);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.statusCode = 200;
            res.end(safeForEmbeddedWebViewHtml);
          };

          // 🔥 处理旧路径重定向（必须在最前面）
          if (handlePathRedirect(req, res)) return;

          // Handle hack.css GET request
          if (handleHackCssRequest(req, res)) return;

          // Handle hack.css save POST request
          if (handleHackCssSave(req, res)) return;

          // Handle hack.css clear POST request
          if (handleHackCssClear(req, res)) return;

          // Handle text replace count POST request
          if (handleTextReplaceCount(req, res)) return;

          // Handle text replace POST request
          if (handleTextReplace(req, res)) return;

          // Handle root path
          if (req.url === '/' || req.url === '/index.html') {
            const indexHtmlPath = path.resolve(process.cwd(), 'admin/index.html');
            if (fs.existsSync(indexHtmlPath)) {
              try {
                const html = fs.readFileSync(indexHtmlPath, 'utf8');
                res.setHeader('Content-Type', 'text/html');
                res.statusCode = 200;
                res.end(html);
                return;
              } catch (err) {
                console.error('读取 index.html 失败:', err);
              }
            }
          }

          // Handle assets
          if (handleAssetsRequest(req, res)) return;

          // Handle build requests
          if (handleBuildRequest(req, res)) return;

          // Handle entries API
          if (handleEntriesApi(req, res)) return;

          // Handle markdown-relative document images (assets/images/*)
          if (handleDocImageAssets(req, res)) return;

          // Handle docs markdown files
          if (handleDocsMarkdown(req, res)) return;

          // Handle spec.html
          if (await handleSpecHtml(req, res, specTemplate, respondHtml)) return;

          // Handle index.html
          if (req.url?.includes('/themes/') && req.url?.includes('/index.html')) {
            try {
              htmlTemplate = fs.readFileSync(htmlTemplatePath, 'utf8');
            } catch (err) {
              console.error('无法读取 html-template 模板文件:', htmlTemplatePath);
            }
          }
          if (await handleIndexHtml(req, res, devTemplate, htmlTemplate, respondHtml)) return;

          next();
        } catch (error) {
          next(error);
        }
      });
    }
  };
}
