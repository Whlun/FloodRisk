import type { Plugin } from 'vite';

/**
 * 经 DDNS / 内网穿透 / 反代访问时，Vite HMR WebSocket 易断连；
 * @vite/client 在断线后会轮询并 location.reload()，表现为画面周期性闪烁且体感很慢。
 * 本插件在 transform 阶段替换 @vite/client 中的建连逻辑，改为 noop Socket，避免整页重载。
 * （改代码后需手动刷新；本地需要热更新时请在 .axhub/make.json 将 server.stableRemoteDev 设为 false。）
 */
function isViteClientModuleId(id: string): boolean {
  return (
    id.includes('vite/dist/client/client.mjs') ||
    id.includes('vite\\dist\\client\\client.mjs')
  );
}

export function stableRemoteDevPlugin(): Plugin {
  return {
    name: 'axhub-stable-remote-dev',
    apply: 'serve',
    enforce: 'post',
    transform(code, id) {
      if (!isViteClientModuleId(id)) {
        return null;
      }
      const fnMarker = 'function setupWebSocket';
      const fnIdx = code.indexOf(fnMarker);
      if (fnIdx === -1) {
        console.warn('[axhub-stable-remote-dev] 未找到 setupWebSocket，跳过补丁（Vite 版本可能已变更）');
        return null;
      }
      const blockStart = code.lastIndexOf('let socket;', fnIdx);
      if (blockStart === -1) {
        console.warn('[axhub-stable-remote-dev] 未找到 let socket; 锚点，跳过补丁');
        return null;
      }
      const inner = code.slice(blockStart, fnIdx);
      if (!inner.includes('setupWebSocket(socketProtocol, socketHost, fallback)')) {
        console.warn('[axhub-stable-remote-dev] 未识别到默认 HMR 建连代码，跳过补丁');
        return null;
      }
      const replacement = `let socket;
/* Axhub stableRemoteDev：不建立 HMR WebSocket，避免经域名/穿透断连触发整页 reload 闪屏。改代码后请手动刷新。 */
console.info('[Axhub] stableRemoteDev：HMR WebSocket 已关闭；本地要热更新请在 .axhub/make.json 设 server.stableRemoteDev: false。');
socket = { OPEN: 1, readyState: 3, send() {}, addEventListener() {}, removeEventListener() {}, close() {} };

`;
      let out = code.slice(0, blockStart) + replacement + code.slice(fnIdx);
      // 双保险：即便 WS 仍被建立，也禁止 @vite/client 内所有自动整页 reload（断线/首屏 overlay 等路径），避免「不断闪」。
      out = out.replace(/\blocation\.reload\(\)/g, '(void console.info("[Axhub] 已抑制 Vite 触发的 location.reload"))');
      // full-reload / 循环依赖等路径走 pageReload()，与 location.reload 解耦，需单独 noop
      out = out.replace(/\bpageReload\(\)/g, '(void console.info("[Axhub] 已抑制 Vite 触发的 pageReload"))');
      return { code: out, map: null };
    },
    configureServer() {
      console.log('[Axhub] stableRemoteDev 已启用：无 HMR WebSocket，改代码后请手动刷新浏览器。');
    },
  };
}
