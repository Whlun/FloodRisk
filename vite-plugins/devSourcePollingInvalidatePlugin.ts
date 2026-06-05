import fs from 'fs';
import path from 'path';
import type { Plugin, ViteDevServer } from 'vite';

/**
 * 部分环境下（macOS 同步盘、远程编辑、chokidar 丢事件）Vite 监听不到文件变更，
 * 模块图不 invalidate，普通刷新仍返回旧 transform，只有重启才生效。
 * 本插件轮询已加载模块对应源文件的 mtime，变更时主动 invalidate。
 */
export function devSourcePollingInvalidatePlugin(): Plugin {
  let server: ViteDevServer | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  const mtimes = new Map<string, number>();
  const srcSegment = `${path.sep}src${path.sep}`;

  const poll = () => {
    if (!server) return;
    for (const [file, mods] of server.moduleGraph.fileToModulesMap) {
      if (!file.includes(srcSegment)) continue;
      let mtimeMs: number;
      try {
        mtimeMs = fs.statSync(file).mtimeMs;
      } catch {
        mtimes.delete(file);
        continue;
      }
      const prev = mtimes.get(file);
      mtimes.set(file, mtimeMs);
      if (prev !== undefined && prev !== mtimeMs) {
        for (const mod of mods) {
          server.moduleGraph.invalidateModule(mod);
        }
      }
    }
  };

  return {
    name: 'axhub-dev-source-polling-invalidate',
    apply: 'serve',
    configureServer(s) {
      server = s;
      timer = setInterval(poll, 800);
      s.httpServer?.once('close', () => {
        if (timer) clearInterval(timer);
      });
    },
  };
}
