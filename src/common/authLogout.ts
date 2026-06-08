/** 开发服务登录退出地址（与 vite-plugins/utils/devAuth.ts 保持一致） */
export const AUTH_LOGOUT_PATH = '/__axhub/auth/logout';

declare global {
  interface Window {
    __AXHUB_DEV_AUTH_ENABLED__?: boolean;
  }
}

/** 是否已开启开发服务登录保护（由服务端在 HTML 中注入） */
export function isClientDevAuthEnabled(): boolean {
  return typeof window !== 'undefined' && window.__AXHUB_DEV_AUTH_ENABLED__ === true;
}

/** 退出后重新登录应回到的页面（保留当前项目地址，避免回到管理台首页） */
export function buildAuthLogoutUrl(redirectPath?: string): string {
  const path =
    redirectPath ??
    (typeof window !== 'undefined'
      ? window.location.pathname + window.location.search + window.location.hash
      : '/');
  const safe = path.startsWith('/') && !path.startsWith('//') ? path : '/';
  if (safe === '/' || safe === '/index.html') {
    return AUTH_LOGOUT_PATH;
  }
  return `${AUTH_LOGOUT_PATH}?redirect=${encodeURIComponent(safe)}`;
}

/** 在管理台顶层或当前窗口发起退出（原型在预览 iframe 内时使用顶层） */
export function navigateToAuthLogout(): void {
  const url = buildAuthLogoutUrl();
  try {
    const topWin = window.top;
    if (topWin && topWin !== window.self) {
      topWin.location.href = url;
      return;
    }
  } catch {
    // 跨域 iframe 时回退到当前窗口
  }
  window.location.href = url;
}
