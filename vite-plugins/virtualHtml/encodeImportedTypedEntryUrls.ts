import { encodeRoutePath } from './handlers/pathNormalizer';

/**
 * 将 HTML 中 script/link 的 src/href 里、指向 prototypes/components/themes 的路径转为百分号编码。
 * 解决部分 WebView/内嵌浏览器无法加载「含非 ASCII 的模块 URL」导致的白屏；
 * 对纯 ASCII 路径为幂等（与编码前一致）。
 */
export function encodeImportedTypedEntryUrls(html: string): string {
  const rewriteUrl = (raw: string): string => {
    // Vite 为 HTML 内联脚本生成的 html-proxy 地址必须与 transformIndexHtml 注册的模块 id 一致；
    // 若误改写含 prototypes/components/themes 的脚本 src，会导致「No matching HTML proxy module」或加载失败。
    if (raw.includes('html-proxy')) {
      return raw;
    }
    const qIndex = raw.indexOf('?');
    const hashIndex = raw.indexOf('#');
    let pathEnd = raw.length;
    if (qIndex >= 0) pathEnd = Math.min(pathEnd, qIndex);
    if (hashIndex >= 0) pathEnd = Math.min(pathEnd, hashIndex);
    const pathOnly = raw.slice(0, pathEnd);
    const rest = raw.slice(pathEnd);
    if (!/^\/(?:prototypes|components|themes)\//u.test(pathOnly)) {
      return raw;
    }
    return encodeRoutePath(pathOnly) + rest;
  };

  return html.replace(
    /\b(src|href)=(["'])(\/(?:prototypes|components|themes)\/[\s\S]*?)\2/gu,
    (full, attr: string, quote: string, urlBody: string) => {
      const trimmed = urlBody.replace(/\s+$/u, '');
      return `${attr}=${quote}${rewriteUrl(trimmed)}${quote}`;
    },
  );
}
