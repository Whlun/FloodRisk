import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

import {
  buildDevAuthEnabledFlagScript,
  buildDevAuthLogoutBodyInject,
  buildDevAuthLogoutHeadInject,
  resolveDevAuth,
  setAdminShellNoFrameHeaders,
} from './utils/devAuth';
import { getLocalIP, getRequestPathname } from './utils/httpUtils';
import { MAKE_ENTRIES_RELATIVE_PATH } from './utils/makeConstants';
import { buildDocApiPath } from './utils/docUtils';

function readInjectedHtml(htmlPath: string, injectScript: string, bodyInject = '') {
  let html = fs.readFileSync(htmlPath, 'utf8');
  html = html.replace('</head>', `${injectScript}\n</head>`);
  if (!html.includes('data-axhub-page=')) {
    html = html.replace('<body>', '<body data-axhub-page="admin">');
  }
  if (bodyInject) {
    html = html.replace('</body>', `${bodyInject}\n</body>`);
  }
  return html;
}

function setNoStoreHeaders(res: any) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

/** 管理台静态资源带 crossorigin 时，部分 WebView/浏览器在局域网 IP 下需 CORS 头才能加载模块 */
function setAdminAssetCorsHeaders(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function setImmutableAssetHeaders(res: any) {
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
}

function setImageCacheHeaders(res: any) {
  res.setHeader('Cache-Control', 'public, max-age=86400');
}

function hasVersionQuery(requestUrl: string) {
  return /[?&]v=/.test(requestUrl);
}

function setAdminStaticCacheHeaders(res: any, pathname: string, requestUrl: string) {
  if (!hasVersionQuery(requestUrl)) {
    setNoStoreHeaders(res);
    return;
  }

  if (pathname.startsWith('/images/')) {
    setImageCacheHeaders(res);
    return;
  }

  if (pathname.startsWith('/assets/')) {
    setImmutableAssetHeaders(res);
    return;
  }

  setNoStoreHeaders(res);
}

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const ADMIN_GZIP_CACHE = new Map<string, { mtimeMs: number; buffer: Buffer }>();
const ADMIN_GZIP_EXTS = new Set(['.js', '.css', '.json', '.svg']);

function clientAcceptsGzip(req: any): boolean {
  return String(req?.headers?.['accept-encoding'] || '').toLowerCase().includes('gzip');
}

/** 管理台 vendor-common.js 约 7MB，局域网首屏需 gzip（约 2MB）否则易长期卡在「正在加载」 */
function readAdminAssetBody(assetPath: string, req: any): { body: Buffer; encoding?: 'gzip' } {
  const raw = fs.readFileSync(assetPath);
  const ext = path.extname(assetPath);
  if (!ADMIN_GZIP_EXTS.has(ext) || raw.length < 512 || !clientAcceptsGzip(req)) {
    return { body: raw };
  }
  const stat = fs.statSync(assetPath);
  const cached = ADMIN_GZIP_CACHE.get(assetPath);
  if (cached && cached.mtimeMs === stat.mtimeMs) {
    return { body: cached.buffer, encoding: 'gzip' };
  }
  const gzipped = zlib.gzipSync(raw, { level: 6 });
  ADMIN_GZIP_CACHE.set(assetPath, { mtimeMs: stat.mtimeMs, buffer: gzipped });
  return { body: gzipped, encoding: 'gzip' };
}

function sendAdminAssetFile(res: any, assetPath: string, contentType: string, req: any) {
  const { body, encoding } = readAdminAssetBody(assetPath, req);
  if (encoding === 'gzip') {
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Vary', 'Accept-Encoding');
  }
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Length', String(body.length));
  res.end(body);
}

function getCanvasDisplayName(canvasName: string) {
  return path.basename(canvasName, path.extname(canvasName)) || canvasName;
}

function injectCanvasTemplateHtml(
  templateHtml: string,
  canvasName: string,
  injectScript: string,
  bodyInject = '',
) {
  const displayName = getCanvasDisplayName(canvasName);
  const pageTitle = `${displayName} - Canvas`;

  let html = templateHtml
    .replace(/\{\{CANVAS_NAME\}\}/g, escapeHtmlAttribute(canvasName))
    .replace(/\{\{CANVAS_TITLE\}\}/g, escapeHtmlAttribute(pageTitle))
    .replace('<title>Canvas</title>', `<title>${escapeHtmlAttribute(pageTitle)}</title>`)
    .replace('</head>', `${injectScript}\n</head>`);
  if (bodyInject) {
    html = html.replace('</body>', `${bodyInject}\n</body>`);
  }
  return html;
}

export function serveAdminPlugin(): Plugin {
  const projectRoot = process.cwd();
  const appsMatch = projectRoot.match(/[\/\\]apps[\/\\]([^\/\\]+)/);

  let projectPrefix = '';
  if (appsMatch) {
    const rootDir = projectRoot.split(/[\/\\]apps[\/\\]/)[0];
    const appsDir = path.join(rootDir, 'apps');

    if (fs.existsSync(appsDir)) {
      const appFolders = fs.readdirSync(appsDir);
      for (const folder of appFolders) {
        const folderPath = path.join(appsDir, folder);
        const entriesPath = path.join(folderPath, MAKE_ENTRIES_RELATIVE_PATH);
        if (fs.existsSync(entriesPath)) {
          projectPrefix = `apps/${folder}/`;
          break;
        }
      }
    }
  }

  const isMixedProject = Boolean(projectPrefix);

  return {
    name: 'serve-admin-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        try {
        const adminDir = path.resolve(projectRoot, 'admin');
        const pathname = getRequestPathname(req);
        const requestUrl = String(req.url || pathname || '/');
        const localIP = getLocalIP();
        const actualPort = server.httpServer?.address()?.port || server.config.server?.port || 5173;
        const devAuth = resolveDevAuth();
        const devAuthHeadInject = buildDevAuthLogoutHeadInject(devAuth);
        const devAuthBodyInject = buildDevAuthLogoutBodyInject(devAuth);
        // 左侧切换预览时 iframe 整页重载；经域名/穿透时白屏更长。除底色外，在 src 变更至 load 之间盖一层同色遮罩，减轻「闪」感。
        const injectScript = `${buildDevAuthEnabledFlagScript()}
  ${devAuthHeadInject}
  <style id="axhub-admin-iframe-preview-bg">iframe{background:hsl(240 6% 93%);}</style>
  <script id="axhub-admin-boot-diag">
    (function () {
      function show(msg) {
        if (document.getElementById('axhub-boot-error')) return;
        var el = document.createElement('pre');
        el.id = 'axhub-boot-error';
        el.style.cssText =
          'position:fixed;z-index:2147483647;left:12px;right:12px;top:12px;bottom:12px;margin:0;padding:16px;overflow:auto;background:#fff;border:1px solid #fca5a5;color:#991b1b;font:12px/1.5 ui-monospace,Menlo,monospace;';
        el.textContent = '页面脚本加载失败，请截图反馈：\\n\\n' + msg;
        (document.body || document.documentElement).appendChild(el);
      }
      window.addEventListener('error', function (ev) {
        var msg = (ev.error && ev.error.stack) || ev.message || String(ev);
        show(msg);
      });
      window.addEventListener('unhandledrejection', function (ev) {
        var reason = ev.reason;
        var msg = (reason && reason.stack) || (reason && reason.message) || String(reason);
        show(msg);
      });
    })();
  </script>
  <script>
    window.__PROJECT_PREFIX__ = '${projectPrefix}';
    window.__IS_MIXED_PROJECT__ = ${isMixedProject};
    window.__LOCAL_IP__ = '${localIP}';
    window.__LOCAL_PORT__ = ${actualPort};
    (function () {
      var BG = 'hsl(240 6% 93%)';
      // React 可能在同一帧内多次写 src，连续 cover 会叠遮罩/抢 abort，观感更闪；合并到下一帧再执行
      function scheduleCover(ifr) {
        if (!ifr || ifr.nodeName !== 'IFRAME') return;
        clearTimeout(ifr.__axhubCoverTid);
        ifr.__axhubCoverTid = setTimeout(function () {
          ifr.__axhubCoverTid = undefined;
          cover(ifr);
        }, 40);
      }
      function shouldMask(ifr) {
        try {
          var title = ifr.getAttribute('title') || '';
          if (title === 'Axhub Genie') return false;
          var src = ifr.src || '';
          if (!src || src.indexOf('about:blank') === 0) return false;
        } catch (e) {}
        return true;
      }
      function findAnchor(ifr) {
        var p = ifr.parentElement;
        for (var i = 0; i < 24 && p; i += 1) {
          var cn = p.className;
          if (typeof cn === 'string' && (cn.indexOf('min-h-0') !== -1 || cn.indexOf('h-full') !== -1)) return p;
          p = p.parentElement;
        }
        return ifr.parentElement;
      }
      function cover(ifr) {
        if (!shouldMask(ifr)) return;
        var anchor = findAnchor(ifr);
        if (!anchor) return;
        try {
          anchor.style.backgroundColor = BG;
        } catch (e) {}
        // 仅用遮罩盖住 iframe（不用 opacity，避免与淡出动画叠出「闪一下」）
        if (typeof ifr.__axhubMaskTid === 'number') {
          clearTimeout(ifr.__axhubMaskTid);
          ifr.__axhubMaskTid = undefined;
        }
        if (ifr.__axhubMaskAbort && typeof ifr.__axhubMaskAbort.abort === 'function') {
          ifr.__axhubMaskAbort.abort();
        }
        ifr.__axhubMaskAbort = new AbortController();
        var sig = ifr.__axhubMaskAbort.signal;
        anchor.querySelectorAll('[data-axhub-iframe-load-mask]').forEach(function (m) { m.remove(); });
        var pos = window.getComputedStyle(anchor).position;
        if (pos === 'static' || !pos) anchor.style.position = 'relative';
        var mask = document.createElement('div');
        mask.setAttribute('data-axhub-iframe-load-mask', '1');
        mask.style.cssText =
          'position:absolute;inset:0;z-index:2147483000;background:' +
          BG +
          ';pointer-events:none';
        anchor.appendChild(mask);
        var done = false;
        function cleanup() {
          if (done) return;
          done = true;
          if (typeof ifr.__axhubMaskTid === 'number') {
            clearTimeout(ifr.__axhubMaskTid);
            ifr.__axhubMaskTid = undefined;
          }
          try {
            if (mask.parentNode) mask.parentNode.removeChild(mask);
          } catch (e) {}
        }
        // 快速连续换页时 abort 后绝不能把 iframe 设为可见，否则会插入一帧白底，经域名时更明显。
        sig.addEventListener(
          'abort',
          function () {
            if (done) return;
            done = true;
            if (typeof ifr.__axhubMaskTid === 'number') {
              clearTimeout(ifr.__axhubMaskTid);
              ifr.__axhubMaskTid = undefined;
            }
            try {
              if (mask.parentNode) mask.parentNode.removeChild(mask);
            } catch (e) {}
          },
          { once: true },
        );
        function tryInstantComplete() {
          try {
            var d = ifr.contentDocument;
            if (!d || d.readyState !== 'complete') return;
            var u = String(d.URL || '');
            if (!u || u.indexOf('about:blank') === 0) return;
            cleanup();
          } catch (e) {}
        }
        ifr.addEventListener('load', cleanup, { once: true, signal: sig });
        ifr.addEventListener('error', cleanup, { once: true, signal: sig });
        tryInstantComplete();
        if (typeof queueMicrotask === 'function') queueMicrotask(tryInstantComplete);
        else setTimeout(tryInstantComplete, 0);
        ifr.__axhubMaskTid = setTimeout(cleanup, 25000);
      }
      function hook(ifr) {
        if (!ifr || ifr.nodeName !== 'IFRAME' || ifr.dataset.axhubIframeShell === '1') return;
        ifr.dataset.axhubIframeShell = '1';
        ifr.style.background = BG;
        cover(ifr);
        new MutationObserver(function () {
          scheduleCover(ifr);
        }).observe(ifr, { attributes: true, attributeFilter: ['src'] });
      }
      function scan(node) {
        (node || document).querySelectorAll('iframe').forEach(hook);
      }
      function boot() {
        var root = document.getElementById('root') || document.body;
        scan(document);
        new MutationObserver(function () {
          scan(document);
        }).observe(root, { childList: true, subtree: true });
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
      else boot();
    })();
  </script>`;
        const sendHtml = async (
          html: string,
          options?: { transform?: boolean },
          frameOptions?: { denyEmbed?: boolean },
        ) => {
          let responseHtml = html;
          if (options?.transform) {
            const htmlUrl = requestUrl === '/' ? '/index.html' : requestUrl;
            responseHtml = await server.transformIndexHtml(htmlUrl, html, requestUrl);
          }
          setNoStoreHeaders(res);
          if (frameOptions?.denyEmbed) {
            setAdminShellNoFrameHeaders(res);
          }
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(responseHtml);
        };

        if (pathname === '/health' || pathname === '/health.html') {
          const healthPath = path.join(adminDir, 'health.html');
          if (fs.existsSync(healthPath)) {
            await sendHtml(fs.readFileSync(healthPath, 'utf8'), { transform: false });
            return;
          }
        }

        if (pathname === '/' || pathname === '/index.html') {
          const indexPath = path.join(adminDir, 'index.html');
          if (fs.existsSync(indexPath)) {
            // 首页 admin 壳不参与 src HMR，避免外层页面被 Vite client 带着刷新。
            await sendHtml(readInjectedHtml(indexPath, injectScript, devAuthBodyInject), {
              transform: false,
            }, { denyEmbed: true });
            return;
          }
        }

        if (pathname && pathname.match(/^\/[^/]+\.html$/)) {
          const htmlPath = path.join(adminDir, pathname);
          if (fs.existsSync(htmlPath)) {
            // 其他 admin 静态壳页面同样不接入 HMR，只保留 iframe 内 src 页面自己的热更。
            await sendHtml(readInjectedHtml(htmlPath, injectScript, devAuthBodyInject), {
              transform: false,
            });
            return;
          }
        }

        if (pathname && pathname.startsWith('/assets/')) {
          const assetPath = path.join(adminDir, pathname);
          if (fs.existsSync(assetPath)) {
            const ext = path.extname(assetPath);
            const contentTypes: Record<string, string> = {
              '.js': 'application/javascript',
              '.css': 'text/css',
              '.json': 'application/json',
              '.png': 'image/png',
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.svg': 'image/svg+xml',
              '.ico': 'image/x-icon',
              '.woff': 'font/woff',
              '.woff2': 'font/woff2',
              '.ttf': 'font/ttf',
              '.eot': 'application/vnd.ms-fontobject',
            };
            setAdminStaticCacheHeaders(res, pathname, requestUrl);
            setAdminAssetCorsHeaders(res);
            sendAdminAssetFile(res, assetPath, contentTypes[ext] || 'application/octet-stream', req);
            return;
          }
        }

        if (pathname && pathname.startsWith('/images/')) {
          const imagePath = path.join(adminDir, pathname);
          if (fs.existsSync(imagePath)) {
            const ext = path.extname(imagePath);
            const contentTypes: Record<string, string> = {
              '.png': 'image/png',
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.gif': 'image/gif',
              '.svg': 'image/svg+xml',
              '.ico': 'image/x-icon',
            };
            setAdminStaticCacheHeaders(res, pathname, requestUrl);
            res.setHeader('Content-Type', contentTypes[ext] || 'image/png');
            res.end(fs.readFileSync(imagePath));
            return;
          }
        }

        if (pathname === '/admin' || pathname === '/admin/') {
          const indexPath = path.join(adminDir, 'index.html');
          if (fs.existsSync(indexPath)) {
            await sendHtml(readInjectedHtml(indexPath, injectScript, devAuthBodyInject), {
              transform: false,
            }, { denyEmbed: true });
            return;
          }
        }

        if (pathname && pathname.startsWith('/admin/')) {
          const adminFilePath = path.join(adminDir, pathname.replace('/admin/', ''));
          if (fs.existsSync(adminFilePath) && fs.statSync(adminFilePath).isFile()) {
            const ext = path.extname(adminFilePath);
            const contentTypes: Record<string, string> = {
              '.js': 'application/javascript; charset=utf-8',
              '.css': 'text/css; charset=utf-8',
              '.json': 'application/json; charset=utf-8',
              '.html': 'text/html; charset=utf-8',
              '.png': 'image/png',
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.svg': 'image/svg+xml',
              '.ico': 'image/x-icon',
              '.woff': 'font/woff',
              '.woff2': 'font/woff2',
              '.ttf': 'font/ttf',
              '.eot': 'application/vnd.ms-fontobject',
            };
            const adminPathname = pathname.replace('/admin', '') || '/';
            setAdminStaticCacheHeaders(res, adminPathname, requestUrl);
            setAdminAssetCorsHeaders(res);
            sendAdminAssetFile(res, adminFilePath, contentTypes[ext] || 'application/octet-stream', req);
            return;
          }
        }

        if (pathname && pathname.match(/^\/[^/]+\.js$/)) {
          const jsPath = path.join(adminDir, pathname);
          if (fs.existsSync(jsPath)) {
            setNoStoreHeaders(res);
            setAdminAssetCorsHeaders(res);
            sendAdminAssetFile(res, jsPath, 'application/javascript; charset=utf-8', req);
            return;
          }
        }

        if (pathname === '/auto-debug-client.js') {
          const debugPath = path.join(adminDir, 'auto-debug-client.js');
          if (fs.existsSync(debugPath)) {
            setNoStoreHeaders(res);
            setAdminAssetCorsHeaders(res);
            sendAdminAssetFile(res, debugPath, 'application/javascript; charset=utf-8', req);
            return;
          }
        }

        const isDocsAssetRequest = pathname?.startsWith('/docs/') && pathname.includes('/assets/');
        const encodedDocName = isDocsAssetRequest
          ? undefined
          : pathname?.match(/^\/docs\/(.+?)(?:\/spec\.html)?$/)?.[1];
        if (encodedDocName) {
          const specTemplatePath = path.join(adminDir, 'spec-template.html');
          if (fs.existsSync(specTemplatePath)) {
            let html = fs.readFileSync(specTemplatePath, 'utf8');
            const docName = decodeURIComponent(encodedDocName);
            const docFileName = docName.endsWith('.md') ? docName : `${docName}.md`;
            const specUrl = buildDocApiPath(docFileName);
            html = html.replace(/\{\{SPEC_URL\}\}/g, specUrl);
            html = html.replace(/\{\{TITLE\}\}/g, docName);
            html = html.replace(/\{\{MULTI_DOC\}\}/g, 'false');
            html = html.replace(/\{\{DOCS_CONFIG\}\}/g, '[]');
            html = html.replace('</head>', `${injectScript}\n</head>`);
            if (devAuthBodyInject) {
              html = html.replace('</body>', `${devAuthBodyInject}\n</body>`);
            }
            // 文档页内容源现在也在 src 下，保留它自己的 Vite 转换与更新能力。
            await sendHtml(html, { transform: true });
            return;
          }
        }

        const encodedCanvasName = pathname?.match(/^\/canvas\/(.+?)\/?$/)?.[1];
        if (encodedCanvasName) {
          const canvasTemplatePath = path.join(adminDir, 'canvas-template.html');
          if (fs.existsSync(canvasTemplatePath)) {
            const canvasName = decodeURIComponent(encodedCanvasName);
            const html = injectCanvasTemplateHtml(
              fs.readFileSync(canvasTemplatePath, 'utf8'),
              canvasName,
              injectScript,
              devAuthBodyInject,
            );
            await sendHtml(html, { transform: true });
            return;
          }
        }

        next();
        } catch (error) {
          next(error);
        }
      });
    },
  };
}
