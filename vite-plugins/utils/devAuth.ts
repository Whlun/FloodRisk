import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import { MAKE_CONFIG_RELATIVE_PATH } from './makeConstants';
import { getServerIPv4Hosts } from './httpUtils';

export type DevAuthConfig = {
  enabled?: boolean;
  username?: string;
  password?: string;
  sessionSecret?: string;
  /**
   * 本机/局域网免登录（默认 true）：localhost、127.0.0.1、192.168/10/172.16 私网 IP 及本机网卡 IP 均不弹登录页；
   * 仅当浏览器地址栏 Host 为域名等非上述地址时，才要求登录。
   */
  allowLocalBypass?: boolean;
  /** 登录 Cookie 有效期（秒），未配置时默认 1 小时 */
  sessionMaxAgeSeconds?: number;
};

export type ResolvedDevAuth = {
  enabled: boolean;
  username: string;
  password: string;
  sessionSecret: string;
  allowLocalBypass: boolean;
  allowLAN: boolean;
  sessionMaxAgeSeconds: number;
  projectTitle: string;
};

const COOKIE_NAME = 'axhub_make_session';
const AUTH_LOGIN_PATH = '/__axhub/auth/login';
const AUTH_LOGOUT_PATH = '/__axhub/auth/logout';
const LOGOUT_SHORTCUT_PATH = '/logout';
const LOGIN_PAGE_PATH = '/login';

export function getDevAuthPaths() {
  return {
    cookieName: COOKIE_NAME,
    loginPath: LOGIN_PAGE_PATH,
    authLoginApi: AUTH_LOGIN_PATH,
    authLogoutApi: AUTH_LOGOUT_PATH,
    logoutShortcut: LOGOUT_SHORTCUT_PATH,
  };
}

/** 管理台壳页面，禁止在预览 iframe 内嵌套加载（避免登录后「套娃」） */
export function isAdminShellPath(pathname: string): boolean {
  const path = String(pathname || '/').split('?')[0].split('#')[0] || '/';
  if (path === '/' || path === '/index.html') {
    return true;
  }
  if (path === LOGIN_PAGE_PATH) {
    return true;
  }
  if (path === '/admin' || path.startsWith('/admin/')) {
    return true;
  }
  return false;
}

export function isIframeRequest(req: any): boolean {
  return String(req?.headers?.['sec-fetch-dest'] || '').toLowerCase() === 'iframe';
}

export function setAdminShellNoFrameHeaders(res: any): void {
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
  res.setHeader('X-Frame-Options', 'DENY');
}

const AXHUB_LOADING_BAR_STYLES = `
    .axhub-loading-screen {
      position: fixed;
      inset: 0;
      z-index: 2147483646;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 24px;
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif;
      background: radial-gradient(circle at top, #fff7ed 0%, #f8fafc 55%);
      color: #64748b;
    }
    .axhub-loading-screen__title {
      font-size: 15px;
      font-weight: 600;
      color: #334155;
    }
    .axhub-loading-screen__hint {
      max-width: 420px;
      font-size: 12px;
      line-height: 1.6;
      color: #94a3b8;
    }
    .axhub-loading-bar {
      width: min(320px, calc(100vw - 48px));
      height: 6px;
      border-radius: 999px;
      background: #e2e8f0;
      overflow: hidden;
    }
    .axhub-loading-bar__fill {
      width: 0%;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #fb923c 0%, #ea580c 100%);
      transition: width 0.35s ease;
    }
    .axhub-loading-bar__fill.is-indeterminate {
      width: 35% !important;
      animation: axhub-loading-indeterminate 1.2s ease-in-out infinite;
    }
    @keyframes axhub-loading-indeterminate {
      0% { transform: translateX(-120%); }
      100% { transform: translateX(320%); }
    }`;

function buildLoadingScreenMarkup(
  title: string,
  hint: string,
  ids?: { root?: string; title?: string; hint?: string; bar?: string },
): string {
  const rootId = ids?.root ? ` id="${ids.root}"` : '';
  const titleId = ids?.title ? ` id="${ids.title}"` : '';
  const hintId = ids?.hint ? ` id="${ids.hint}"` : '';
  const barId = ids?.bar ? ` id="${ids.bar}"` : '';
  return `<div class="axhub-loading-screen"${rootId}>
    <div class="axhub-loading-screen__title"${titleId}>${title}</div>
    <div class="axhub-loading-bar"><div class="axhub-loading-bar__fill is-indeterminate"${barId}></div></div>
    <div class="axhub-loading-screen__hint"${hintId}>${hint}</div>
  </div>`;
}

function buildLoadingProgressScript(options: {
  barId: string;
  titleId?: string;
  hintId?: string;
  redirectTo?: string;
  navigateTarget?: '_top' | '_self';
  startLabel?: string;
  successLabel?: string;
  successHint?: string;
  autoStart?: boolean;
}): string {
  const {
    barId,
    titleId,
    hintId,
    redirectTo,
    navigateTarget = '_self',
    startLabel = '正在验证登录…',
    successLabel = '登录成功，正在进入系统…',
    successHint = '首次打开需下载脚本资源，外网访问可能较慢，请稍候',
    autoStart = false,
  } = options;

  return `<script>
    (function () {
      var bar = document.getElementById(${JSON.stringify(barId)});
      var titleEl = ${titleId ? `document.getElementById(${JSON.stringify(titleId)})` : 'null'};
      var hintEl = ${hintId ? `document.getElementById(${JSON.stringify(hintId)})` : 'null'};
      var progress = 8;
      var started = Date.now();
      var tick = null;
      if (titleEl) titleEl.textContent = ${JSON.stringify(startLabel)};
      function setProgress(next) {
        progress = Math.max(progress, Math.min(96, next));
        if (!bar) return;
        bar.classList.remove('is-indeterminate');
        bar.style.width = progress + '%';
      }
      function startProgress() {
        if (tick) return;
        started = Date.now();
        tick = setInterval(function () {
          var sec = Math.round((Date.now() - started) / 1000);
          if (progress < 55) setProgress(8 + sec * 4);
          if (titleEl && sec > 0 && progress < 70) {
            titleEl.textContent = ${JSON.stringify(startLabel)} + '（' + sec + ' 秒）';
          }
        }, 1000);
      }
      window.__axhubLoadingStart = startProgress;
      window.__axhubLoadingSuccess = function () {
        if (!tick) startProgress();
        clearInterval(tick);
        tick = null;
        if (titleEl) titleEl.textContent = ${JSON.stringify(successLabel)};
        if (hintEl) hintEl.textContent = ${JSON.stringify(successHint)};
        setProgress(78);
        var boost = setInterval(function () {
          if (progress < 92) setProgress(progress + 2);
        }, 400);
        setTimeout(function () {
          clearInterval(boost);
          setProgress(96);
          var target = ${redirectTo ? JSON.stringify(redirectTo) : 'null'};
          if (!target) return;
          if (${JSON.stringify(navigateTarget)} === '_top' && window.top) {
            window.top.location.replace(target);
          } else {
            window.location.replace(target);
          }
        }, 280);
      };
      window.__axhubLoadingFail = function () {
        clearInterval(tick);
        tick = null;
      };
      if (${autoStart ? 'true' : 'false'}) startProgress();
    })();
  </script>`;
}

export function buildPostLoginRedirectHtml(targetPath: string): string {
  const safe = targetPath.startsWith('/') && !targetPath.startsWith('//') ? targetPath : '/';
  const navTarget = loginNavigationTarget(safe);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>正在进入系统…</title>
  <style>${AXHUB_LOADING_BAR_STYLES}</style>
</head>
<body>
  ${buildLoadingScreenMarkup('登录成功，正在进入系统…', '正在加载页面资源，外网访问可能需 30–90 秒，请稍候', {
    title: 'axhub-post-login-title',
    hint: 'axhub-post-login-hint',
    bar: 'axhub-post-login-bar',
  })}
  ${buildLoadingProgressScript({
    barId: 'axhub-post-login-bar',
    titleId: 'axhub-post-login-title',
    hintId: 'axhub-post-login-hint',
    redirectTo: safe,
    navigateTarget: navTarget,
    startLabel: '登录成功，正在进入系统…',
    successLabel: '登录成功，正在进入系统…',
    successHint: '正在加载页面资源，外网访问可能需 30–90 秒，请稍候',
    autoStart: true,
  })}
  <script>
    (function () {
      if (typeof window.__axhubLoadingSuccess === 'function') {
        window.__axhubLoadingSuccess();
      }
    })();
  </script>
</body>
</html>`;
}

export function buildIframeBreakoutHtml(targetPath: string): string {
  const safe = targetPath.startsWith('/') && !targetPath.startsWith('//') ? targetPath : '/';
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>正在跳转…</title>
  <style>${AXHUB_LOADING_BAR_STYLES}</style>
</head>
<body>
  ${buildLoadingScreenMarkup('正在进入系统…', '请稍候', {
    title: 'axhub-iframe-breakout-title',
    bar: 'axhub-iframe-breakout-bar',
  })}
  ${buildLoadingProgressScript({
    barId: 'axhub-iframe-breakout-bar',
    titleId: 'axhub-iframe-breakout-title',
    redirectTo: safe,
    navigateTarget: '_top',
    startLabel: '正在进入系统…',
    successLabel: '正在进入系统…',
    successHint: '请稍候',
    autoStart: true,
  })}
  <script>
    (function () {
      if (typeof window.__axhubLoadingSuccess === 'function') {
        window.__axhubLoadingSuccess();
      } else {
        window.top.location.replace(${JSON.stringify(safe)});
      }
    })();
  </script>
</body>
</html>`;
}

function buildLoginFrameGuardScript(redirectTo: string): string {
  const safeRedirect =
    redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/';
  return `<script>
    (function () {
      if (window.top === window.self) return;
      var p = ${JSON.stringify(safeRedirect)};
      if (p === '/' || p === '/index.html' || p.indexOf('/login') === 0) {
        window.top.location.replace(p);
      }
    })();
  </script>`;
}

function loginNavigationTarget(redirectTo: string): '_top' | '_self' {
  return isAdminShellPath(redirectTo) ? '_top' : '_self';
}

function readAxhubConfig(): Record<string, any> {
  const configPath = path.resolve(process.cwd(), MAKE_CONFIG_RELATIVE_PATH);
  if (!fs.existsSync(configPath)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return {};
  }
}

export function isDevAuthEnabled(): boolean {
  return resolveDevAuth() !== null;
}

/** 注入到预览/管理台 HTML，供 ShellUserMenu 等判断退出登录是否可用 */
export function buildDevAuthEnabledFlagScript(): string {
  return `<script>window.__AXHUB_DEV_AUTH_ENABLED__=${isDevAuthEnabled()};</script>`;
}

export function resolveDevAuth(): ResolvedDevAuth | null {
  const raw = readAxhubConfig();
  const auth = (raw.server?.auth || {}) as DevAuthConfig;
  if (!auth.enabled) {
    return null;
  }

  const username = String(auth.username || '').trim();
  const password = String(auth.password || '').trim();
  if (!username || !password) {
    console.warn('[dev-auth] 已启用 server.auth.enabled，但未配置 username/password，登录保护未生效');
    return null;
  }

  const sessionSecret =
    String(auth.sessionSecret || '').trim() ||
    crypto.createHash('sha256').update(`${username}:${password}:${process.cwd()}`).digest('hex');

  return {
    enabled: true,
    username,
    password,
    sessionSecret,
    allowLocalBypass: auth.allowLocalBypass !== false,
    allowLAN: raw.server?.allowLAN !== false,
    sessionMaxAgeSeconds: Number.isFinite(auth.sessionMaxAgeSeconds)
      ? Math.max(300, Number(auth.sessionMaxAgeSeconds))
      : 60 * 60,
    projectTitle: String(raw.projectInfo?.name || '产品原型').trim() || '产品原型',
  };
}

export function sanitizeConfigAuthForClient<T extends Record<string, any>>(config: T): T {
  if (!config?.server?.auth || typeof config.server.auth !== 'object') {
    return config;
  }
  const next = { ...config, server: { ...config.server, auth: { ...config.server.auth } } };
  if ('password' in next.server.auth) {
    next.server.auth.password = next.server.auth.password ? '******' : '';
  }
  if ('sessionSecret' in next.server.auth) {
    next.server.auth.sessionSecret = next.server.auth.sessionSecret ? '******' : '';
  }
  return next;
}

function isPrivateLanIPv4Host(host: string): boolean {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return false;
  }
  const parts = host.split('.').map((part) => Number(part));
  if (parts.some((part) => part > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  return false;
}

export function getRequestHost(req: any): string {
  return String(req.headers?.host || '').split(':')[0].toLowerCase();
}

/** 当前访问 Host 是否为 localhost / 局域网 IP（此类地址始终免登录） */
export function isLanOrLocalAccessHost(host: string, auth: ResolvedDevAuth): boolean {
  if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
    return true;
  }
  if (!auth.allowLAN) {
    return false;
  }
  if (isPrivateLanIPv4Host(host)) {
    return true;
  }
  return getServerIPv4Hosts().some((ip) => ip.toLowerCase() === host);
}

export function isLocalHostBypass(req: any, auth: ResolvedDevAuth): boolean {
  if (!auth.allowLocalBypass) {
    return false;
  }
  return isLanOrLocalAccessHost(getRequestHost(req), auth);
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export function createSessionToken(auth: ResolvedDevAuth): string {
  const exp = Math.floor(Date.now() / 1000) + auth.sessionMaxAgeSeconds;
  const payload = Buffer.from(JSON.stringify({ u: auth.username, exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', auth.sessionSecret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string | undefined, auth: ResolvedDevAuth): boolean {
  if (!token) {
    return false;
  }
  const [payload, sig] = token.split('.');
  if (!payload || !sig) {
    return false;
  }
  const expected = crypto.createHmac('sha256', auth.sessionSecret).update(payload).digest('base64url');
  if (!safeEqual(sig, expected)) {
    return false;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.u !== auth.username) {
      return false;
    }
    if (typeof data.exp !== 'number' || data.exp < Math.floor(Date.now() / 1000)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function getSessionFromRequest(req: any): string | undefined {
  const cookieHeader = String(req.headers?.cookie || '');
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function appendSessionCookie(res: any, token: string, maxAgeSeconds: number) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearSessionCookie(res: any) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

export function credentialsMatch(
  auth: ResolvedDevAuth,
  username: string | undefined,
  password: string | undefined,
): boolean {
  const u = String(username || '').trim();
  const p = String(password || '');
  return safeEqual(u, auth.username) && safeEqual(p, auth.password);
}

export function shouldSkipAuthPath(pathname: string, method: string): boolean {
  if (pathname === LOGIN_PAGE_PATH || pathname === '/health' || pathname === '/health.html') {
    return true;
  }
  if (pathname === AUTH_LOGIN_PATH && method === 'POST') {
    return true;
  }
  if (pathname === AUTH_LOGOUT_PATH || pathname === LOGOUT_SHORTCUT_PATH) {
    return true;
  }
  // Vite 开发资源被重定向到登录页时会以 HTML 响应，浏览器执行后表现为白屏
  if (method === 'GET' || method === 'HEAD') {
    if (
      pathname.startsWith('/@vite/') ||
      pathname.startsWith('/@id/') ||
      pathname.startsWith('/@fs/') ||
      pathname.startsWith('/@axhub/') ||
      pathname === '/auto-debug-client.js' ||
      pathname.startsWith('/assets/')
    ) {
      return true;
    }
  }
  return false;
}

function buildDevAuthLogoutVisibilityScript(_allowLocalBypass: boolean): string {
  const logoutUrl = AUTH_LOGOUT_PATH;
  return `
  <script id="axhub-dev-auth-logout-script">
    (function () {
      var LOGOUT_URL = ${JSON.stringify(logoutUrl)};
      function isInPreviewIframe() {
        try {
          return window.self !== window.top;
        } catch (e) {
          return true;
        }
      }
      function isAdminHostPage() {
        return (
          document.body &&
          document.body.getAttribute('data-axhub-page') === 'admin'
        );
      }
      function shellHasUserMenu() {
        return !!document.querySelector('.ss-one-map-shell__header .ss-one-map-shell__user');
      }
      function isAdminConsole() {
        return !!document.querySelector('.pc-layout');
      }
      function shouldHide() {
        if (isInPreviewIframe()) return true;
        if (isAdminConsole()) return false;
        return shellHasUserMenu();
      }
      function findAdminSidebarOuter() {
        var byBorder = document.querySelector('.pc-layout > div > div.border-r');
        if (byBorder) return byBorder;
        var layout = document.querySelector('.pc-layout');
        if (!layout) return null;
        var row = layout.firstElementChild;
        if (!row) return null;
        return row.firstElementChild;
      }
      /** 侧栏外层（与 React 子树同级），避免挂在内层导致重渲染后按钮被卸掉 */
      function hideLogoutButton(link) {
        var slot = document.getElementById('axhub-dev-auth-logout-slot');
        if (slot && slot.parentNode) slot.parentNode.removeChild(slot);
        link.className = 'axhub-dev-auth-logout-btn';
        link.removeAttribute('style');
        link.setAttribute('aria-hidden', 'true');
        link.setAttribute('hidden', '');
      }
      function navigateLogout() {
        var redirectPath =
          window.location.pathname + window.location.search + window.location.hash;
        var safe =
          redirectPath.indexOf('/') === 0 && redirectPath.indexOf('//') !== 0
            ? redirectPath
            : '/';
        var url =
          safe === '/' || safe === '/index.html'
            ? LOGOUT_URL
            : LOGOUT_URL + '?redirect=' + encodeURIComponent(safe);
        try {
          if (window.top && window.top !== window.self) {
            window.top.location.href = url;
            return;
          }
        } catch (e) {}
        window.location.href = url;
      }
      function ensureLogoutLink() {
        var link = document.getElementById('axhub-dev-auth-logout-btn');
        if (!link) {
          link = document.createElement('a');
          link.id = 'axhub-dev-auth-logout-btn';
          link.href = LOGOUT_URL;
          link.target = '_top';
          link.textContent = '退出登录';
          link.setAttribute('aria-label', '退出登录');
          link.addEventListener('click', function (e) {
            try {
              if (window.top && window.top !== window.self) {
                e.preventDefault();
                navigateLogout();
              }
            } catch (err) {
              e.preventDefault();
              navigateLogout();
            }
          });
        }
        return link;
      }
      function dockAdminSidebarDock() {
        var link = ensureLogoutLink();
        var sidebar = findAdminSidebarOuter();
        if (!sidebar) {
          hideLogoutButton(link);
          return;
        }
        var rect = sidebar.getBoundingClientRect();
        if (rect.width < 48 || rect.height < 80) {
          hideLogoutButton(link);
          return;
        }
        if (link.parentElement !== document.body) document.body.appendChild(link);
        link.className =
          'axhub-dev-auth-logout-btn axhub-dev-auth-logout-btn--sidebar-dock axhub-dev-auth-logout-ready';
        link.style.left = rect.left + 10 + 'px';
        link.style.width = Math.max(120, Math.round(rect.width) - 20) + 'px';
        link.style.top = Math.max(rect.top + 8, rect.bottom - 40) + 'px';
        link.style.bottom = 'auto';
        link.removeAttribute('aria-hidden');
        link.removeAttribute('hidden');
      }
      function applyVisibility() {
        var link = ensureLogoutLink();
        if (shouldHide()) {
          hideLogoutButton(link);
          return;
        }
        if (isAdminHostPage()) {
          if (!isAdminConsole()) {
            hideLogoutButton(link);
            return;
          }
          dockAdminSidebarDock();
          return;
        }
        hideLogoutButton(link);
      }
      var mountScheduled = 0;
      function scheduleMount() {
        if (mountScheduled) clearTimeout(mountScheduled);
        mountScheduled = setTimeout(function () {
          mountScheduled = 0;
          applyVisibility();
        }, 80);
      }
      function boot() {
        var legacyFooter = document.getElementById('axhub-dev-auth-logout-footer');
        if (legacyFooter) legacyFooter.remove();
        window.addEventListener('resize', scheduleMount);
        window.addEventListener('scroll', scheduleMount, true);
        var root = document.getElementById('root');
        if (root && typeof MutationObserver !== 'undefined') {
          new MutationObserver(function () {
            scheduleMount();
          }).observe(root, { childList: true, subtree: true });
        }
        scheduleMount();
        var pollTicks = 0;
        var pollTimer = setInterval(function () {
          applyVisibility();
          pollTicks += 1;
          if (pollTicks >= 45) clearInterval(pollTimer);
        }, 1000);
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
      } else {
        boot();
      }
    })();
  </script>`;
}

/** 注入到 &lt;/head&gt;：样式 + 挂载脚本 */
export function buildDevAuthLogoutHeadInject(auth: ResolvedDevAuth | null): string {
  if (!auth) {
    return '';
  }

  return `
  <style id="axhub-dev-auth-logout-ui">
    #axhub-dev-auth-logout-btn {
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }
    #axhub-dev-auth-logout-btn.axhub-dev-auth-logout-ready,
    #axhub-dev-auth-logout-btn.axhub-dev-auth-logout-btn--sidebar-dock.axhub-dev-auth-logout-ready {
      box-sizing: border-box;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      background: #fff;
      color: #374151;
      font: 12px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif;
      cursor: pointer;
      text-decoration: none;
      pointer-events: auto !important;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
      visibility: visible !important;
    }
    #axhub-dev-auth-logout-btn.axhub-dev-auth-logout-btn--sidebar-dock.axhub-dev-auth-logout-ready {
      display: inline-flex !important;
      position: fixed;
      z-index: 2147483647;
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 500;
      margin: 0;
    }
    .dark #axhub-dev-auth-logout-btn.axhub-dev-auth-logout-ready,
    html.dark #axhub-dev-auth-logout-btn.axhub-dev-auth-logout-ready {
      background: hsl(240 6% 14%);
      border-color: hsl(240 4% 26%);
      color: hsl(0 0% 92%);
    }
    #axhub-dev-auth-logout-btn.axhub-dev-auth-logout-ready:hover {
      color: #ea580c;
      border-color: #fdba74;
    }
  </style>
  ${buildDevAuthLogoutVisibilityScript(auth.allowLocalBypass)}`;
}

/** 管理台退出按钮仅由 head 内脚本在侧栏就绪后创建，不向 body 预置节点 */
export function buildDevAuthLogoutBodyInject(_auth: ResolvedDevAuth | null): string {
  return '';
}

/** @deprecated 使用 buildDevAuthLogoutHeadInject + buildDevAuthLogoutBodyInject */
export function buildDevAuthLogoutInjectScript(auth: ResolvedDevAuth | null): string {
  return buildDevAuthLogoutHeadInject(auth) + buildDevAuthLogoutBodyInject(auth);
}

export function buildLoggedInLoginHtml(auth: ResolvedDevAuth, redirectTo: string) {
  const safeRedirect = redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/';
  const navTarget = loginNavigationTarget(safeRedirect);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>已登录 - ${auth.projectTitle}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif;
      background: radial-gradient(circle at top, #fff7ed 0%, #f8fafc 55%);
    }
    .card {
      width: min(420px, calc(100vw - 32px));
      background: #fff;
      border-radius: 16px;
      padding: 32px 28px;
      box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08);
      border: 1px solid #e5e7eb;
      text-align: center;
    }
    h1 { margin: 0 0 8px; font-size: 22px; }
    p { margin: 0 0 20px; color: #6b7280; font-size: 14px; }
    .actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
    a {
      display: inline-block;
      padding: 10px 18px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
    }
    .primary { background: #ea580c; color: #fff; }
    .secondary { background: #f3f4f6; color: #374151; }
  </style>
</head>
<body>
  <div class="card">
    <h1>已登录</h1>
    <p>当前账号：${auth.username.replace(/</g, '&lt;')}</p>
    <div class="actions">
      <a class="primary" href="${safeRedirect.replace(/"/g, '&quot;')}" target="${navTarget}">继续访问</a>
      <a class="secondary" href="${AUTH_LOGOUT_PATH}" target="_top">退出登录</a>
    </div>
  </div>
  ${buildLoginFrameGuardScript(safeRedirect)}
</body>
</html>`;
}

export function buildLoginHtml(auth: ResolvedDevAuth, redirectTo: string, errorMessage?: string) {
  const safeRedirect = redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/';
  const navTarget = loginNavigationTarget(safeRedirect);
  const errorBlock = errorMessage
    ? `<p class="error">${errorMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>登录 - ${auth.projectTitle}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      background: radial-gradient(circle at top, #fff7ed 0%, #f8fafc 55%);
      color: #171717;
    }
    .card {
      width: min(420px, calc(100vw - 32px));
      background: #fff;
      border-radius: 16px;
      padding: 32px 28px 28px;
      box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08);
      border: 1px solid #e5e7eb;
    }
    .logo {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: #171717;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      margin: 0 auto 16px;
    }
    h1 {
      margin: 0 0 6px;
      text-align: center;
      font-size: 22px;
      font-weight: 600;
    }
    .subtitle {
      margin: 0 0 24px;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
    label {
      display: block;
      font-size: 13px;
      color: #374151;
      margin-bottom: 6px;
    }
    input {
      width: 100%;
      height: 44px;
      border: 1px solid #d1d5db;
      border-radius: 10px;
      padding: 0 12px;
      font-size: 15px;
      margin-bottom: 14px;
    }
    input:focus {
      outline: none;
      border-color: #f97316;
      box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.15);
    }
    button {
      width: 100%;
      height: 44px;
      border: none;
      border-radius: 10px;
      background: #ea580c;
      color: #fff;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 4px;
    }
    button:hover { background: #c2410c; }
    .error {
      color: #dc2626;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 13px;
      margin-bottom: 14px;
    }
    .password-field {
      position: relative;
      margin-bottom: 14px;
    }
    .password-field input {
      margin-bottom: 0;
      padding-right: 44px;
    }
    .password-toggle {
      position: absolute;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      width: 36px;
      height: 36px;
      padding: 0;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: #6b7280;
      cursor: pointer;
      margin: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .password-toggle:hover {
      background: #f3f4f6;
      color: #374151;
    }
    .password-toggle svg {
      width: 18px;
      height: 18px;
      stroke: currentColor;
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .password-toggle .icon-eye-off {
      display: none;
    }
    .password-toggle.is-visible .icon-eye {
      display: none;
    }
    .password-toggle.is-visible .icon-eye-off {
      display: block;
    }
    .remember-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 2px 0 14px;
      font-size: 13px;
      color: #4b5563;
      user-select: none;
    }
    .remember-row input {
      width: 16px;
      height: 16px;
      margin: 0;
      accent-color: #ea580c;
    }
    .remember-row label {
      margin: 0;
      cursor: pointer;
      font-weight: 400;
    }
    ${AXHUB_LOADING_BAR_STYLES}
    .axhub-login-loading-overlay {
      display: none;
    }
    .axhub-login-loading-overlay.is-active {
      display: flex;
    }
  </style>
</head>
<body>
  <div id="axhub-login-loading" class="axhub-login-loading-overlay axhub-loading-screen">
    <div class="axhub-loading-screen__title" id="axhub-login-loading-title">正在验证登录…</div>
    <div class="axhub-loading-bar"><div class="axhub-loading-bar__fill is-indeterminate" id="axhub-login-loading-bar"></div></div>
    <div class="axhub-loading-screen__hint" id="axhub-login-loading-hint">验证通过后将继续加载系统资源</div>
  </div>
  <div class="card">
    <div class="logo">AX</div>
    <h1>${auth.projectTitle}</h1>
    <p class="subtitle">请输入用户名和密码后访问系统</p>
    ${errorBlock}
    <form id="axhub-login-form" method="post" action="${AUTH_LOGIN_PATH}" target="${navTarget}">
      <input type="hidden" name="redirect" value="${safeRedirect.replace(/"/g, '&quot;')}" />
      <label for="username">用户名</label>
      <input id="username" name="username" autocomplete="username" required />
      <label for="password">密码</label>
      <div class="password-field">
        <input id="password" name="password" type="password" autocomplete="current-password" required />
        <button type="button" class="password-toggle" id="password-toggle" aria-label="显示密码" aria-pressed="false">
          <svg class="icon-eye" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          <svg class="icon-eye-off" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10.7 10.7a3 3 0 0 0 4.2 4.2"></path>
            <path d="M9.9 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17.2 17.2 0 0 1-2.8 3.7"></path>
            <path d="M6.1 6.1C3.5 7.8 2 12 2 12s3.5 7 10 7c1.1 0 2.1-.2 3-.5"></path>
            <path d="M2 2l20 20"></path>
          </svg>
        </button>
      </div>
      <div class="remember-row">
        <input type="checkbox" id="remember" name="remember" value="1" />
        <label for="remember">记住密码</label>
      </div>
      <button type="submit">登录</button>
    </form>
  </div>
  ${buildLoginFrameGuardScript(safeRedirect)}
  ${buildLoadingProgressScript({
    barId: 'axhub-login-loading-bar',
    titleId: 'axhub-login-loading-title',
    hintId: 'axhub-login-loading-hint',
    redirectTo: safeRedirect,
    navigateTarget: navTarget,
    startLabel: '正在验证登录…',
    successLabel: '登录成功，正在进入系统…',
    successHint: '首次打开需下载脚本资源，外网访问可能较慢，请稍候',
  })}
  <script>
    (function () {
      var STORAGE_KEY = 'axhub_make_login_remember';
      var form = document.getElementById('axhub-login-form');
      var usernameInput = document.getElementById('username');
      var passwordInput = document.getElementById('password');
      var rememberInput = document.getElementById('remember');
      var toggleBtn = document.getElementById('password-toggle');
      var loadingOverlay = document.getElementById('axhub-login-loading');
      var submitBtn = form ? form.querySelector('button[type="submit"]') : null;
      if (!form || !usernameInput || !passwordInput || !rememberInput || !toggleBtn) return;

      function showLoading() {
        if (loadingOverlay) loadingOverlay.classList.add('is-active');
        if (typeof window.__axhubLoadingStart === 'function') window.__axhubLoadingStart();
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = '登录中…';
        }
      }

      function hideLoading() {
        if (loadingOverlay) loadingOverlay.classList.remove('is-active');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = '登录';
        }
        if (typeof window.__axhubLoadingFail === 'function') window.__axhubLoadingFail();
      }

      function loadSaved() {
        try {
          var raw = localStorage.getItem(STORAGE_KEY);
          if (!raw) return;
          var data = JSON.parse(raw);
          if (!data || !data.remember) return;
          if (data.username) usernameInput.value = data.username;
          if (data.password) passwordInput.value = data.password;
          rememberInput.checked = true;
        } catch (e) {}
      }

      function persist() {
        try {
          if (rememberInput.checked) {
            localStorage.setItem(
              STORAGE_KEY,
              JSON.stringify({
                remember: true,
                username: usernameInput.value,
                password: passwordInput.value,
              }),
            );
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        } catch (e) {}
      }

      toggleBtn.addEventListener('click', function () {
        var show = passwordInput.type === 'password';
        passwordInput.type = show ? 'text' : 'password';
        toggleBtn.classList.toggle('is-visible', show);
        toggleBtn.setAttribute('aria-label', show ? '隐藏密码' : '显示密码');
        toggleBtn.setAttribute('aria-pressed', show ? 'true' : 'false');
      });

      rememberInput.addEventListener('change', function () {
        if (!rememberInput.checked) {
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch (e) {}
        }
      });

      form.addEventListener('submit', function (event) {
        event.preventDefault();
        persist();
        showLoading();
        fetch(${JSON.stringify(AUTH_LOGIN_PATH)}, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            username: usernameInput.value,
            password: passwordInput.value,
            redirect: ${JSON.stringify(safeRedirect)},
          }),
        })
          .then(function (res) {
            return res.json().then(function (data) {
              return { ok: res.ok, data: data };
            });
          })
          .then(function (result) {
            if (!result.ok || !result.data || !result.data.ok) {
              hideLoading();
              var msg =
                (result.data && result.data.message) || '用户名或密码错误，请重试';
              var existing = document.querySelector('.error');
              if (existing) {
                existing.textContent = msg;
              } else {
                var err = document.createElement('p');
                err.className = 'error';
                err.textContent = msg;
                form.parentNode.insertBefore(err, form);
              }
              return;
            }
            if (typeof window.__axhubLoadingSuccess === 'function') {
              window.__axhubLoadingSuccess();
              return;
            }
            var target = result.data.redirect || ${JSON.stringify(safeRedirect)};
            if (${JSON.stringify(navTarget)} === '_top' && window.top) {
              window.top.location.replace(target);
            } else {
              window.location.replace(target);
            }
          })
          .catch(function () {
            hideLoading();
            alert('登录请求失败，请检查网络后重试');
          });
      });
      loadSaved();
    })();
  </script>
</body>
</html>`;
}
