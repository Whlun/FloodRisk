import type { Plugin } from 'vite';

import { getRequestPathname, readJsonBody } from './utils/httpUtils';
import {
  appendSessionCookie,
  buildIframeBreakoutHtml,
  buildLoggedInLoginHtml,
  buildLoginHtml,
  buildPostLoginRedirectHtml,
  clearSessionCookie,
  createSessionToken,
  credentialsMatch,
  getDevAuthPaths,
  getSessionFromRequest,
  isAdminShellPath,
  isIframeRequest,
  isLocalHostBypass,
  resolveDevAuth,
  shouldSkipAuthPath,
  verifySessionToken,
} from './utils/devAuth';
import { getLocalIP } from './utils/httpUtils';

function readFormBody(req: any): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const params = new URLSearchParams(body);
        const result: Record<string, string> = {};
        params.forEach((value, key) => {
          result[key] = value;
        });
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function redirect(res: any, location: string) {
  res.statusCode = 302;
  res.setHeader('Location', location);
  res.end();
}

export function devAuthPlugin(): Plugin {
  const paths = getDevAuthPaths();

  return {
    name: 'dev-auth',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const auth = resolveDevAuth();
        if (!auth) {
          return next();
        }

        const pathname = getRequestPathname(req);
        const method = String(req.method || 'GET').toUpperCase();

        if (shouldSkipAuthPath(pathname, method)) {
          if (pathname === paths.authLogoutApi || pathname === paths.logoutShortcut) {
            clearSessionCookie(res);
            let redirectTo = '/';
            try {
              const requestUrl = String(req.url || '/');
              redirectTo =
                new URL(requestUrl, 'http://localhost').searchParams.get('redirect') || '/';
            } catch {
              redirectTo = '/';
            }
            if (!redirectTo.startsWith('/') || redirectTo.startsWith('//')) {
              redirectTo = '/';
            }
            const loginTarget =
              redirectTo === '/' || redirectTo === '/index.html'
                ? paths.loginPath
                : `${paths.loginPath}?redirect=${encodeURIComponent(redirectTo)}`;
            redirect(res, loginTarget);
            return;
          }

          if (pathname === paths.authLoginApi && method === 'POST') {
            try {
              const contentType = String(req.headers['content-type'] || '');
              let username: string | undefined;
              let password: string | undefined;
              let redirectTo = '/';

              if (contentType.includes('application/json')) {
                const body = await readJsonBody(req);
                username = body?.username;
                password = body?.password;
                redirectTo = body?.redirect || '/';
              } else {
                const body = await readFormBody(req);
                username = body.username;
                password = body.password;
                redirectTo = body.redirect || '/';
              }

              if (!credentialsMatch(auth, username, password)) {
                if (contentType.includes('application/json')) {
                  res.statusCode = 401;
                  res.setHeader('Content-Type', 'application/json; charset=utf-8');
                  res.end(JSON.stringify({ ok: false, message: '用户名或密码错误' }));
                  return;
                }
                const safeRedirect =
                  redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/';
                res.statusCode = 401;
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.end(buildLoginHtml(auth, safeRedirect, '用户名或密码错误，请重试'));
                return;
              }

              const token = createSessionToken(auth);
              appendSessionCookie(res, token, auth.sessionMaxAgeSeconds);

              const target =
                redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/';

              if (contentType.includes('application/json')) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ ok: true, redirect: target }));
                return;
              }

              if (isAdminShellPath(target) && isIframeRequest(req)) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.end(buildIframeBreakoutHtml(target));
                return;
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              res.end(buildPostLoginRedirectHtml(target));
              return;
            } catch (error: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'text/plain; charset=utf-8');
              res.end(error?.message || '登录处理失败');
              return;
            }
          }

          if (pathname === paths.loginPath && method === 'GET') {
            const requestUrl = String(req.url || '/');
            let redirectTo = '/';
            try {
              redirectTo = new URL(requestUrl, 'http://localhost').searchParams.get('redirect') || '/';
            } catch {
              redirectTo = '/';
            }
            if (!redirectTo.startsWith('/') || redirectTo.startsWith('//')) {
              redirectTo = '/';
            }
            const session = getSessionFromRequest(req);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            if (verifySessionToken(session, auth)) {
              res.end(buildLoggedInLoginHtml(auth, redirectTo));
            } else {
              res.end(buildLoginHtml(auth, redirectTo));
            }
            return;
          }

          return next();
        }

        if (isLocalHostBypass(req, auth)) {
          return next();
        }

        const session = getSessionFromRequest(req);
        if (verifySessionToken(session, auth)) {
          return next();
        }

        if (method === 'GET' || method === 'HEAD') {
          const requestUrl = String(req.url || pathname);
          const redirectParam = encodeURIComponent(requestUrl);
          redirect(res, `${paths.loginPath}?redirect=${redirectParam}`);
          return;
        }

        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: '未登录', loginUrl: paths.loginPath }));
      });
    },
    configResolved() {
      const auth = resolveDevAuth();
      if (auth) {
        console.log(`🔐 开发服务登录保护已启用（项目：${auth.projectTitle}）`);
        if (auth.allowLocalBypass) {
          const lanIp = getLocalIP();
          const lanHint = auth.allowLAN
            ? `；本机局域网 IP（如 ${lanIp || '192.168.x.x'}）亦可免登录`
            : '';
          console.log(`   仅域名（或其它非局域网 Host）需登录${lanHint || ''}`);
        }
      }
    },
  };
}
