import path from 'path';
import type { Plugin } from 'vite';

/** 预览宿主运行时对外 URL（勿用 /@fs，部分 WebView/域名穿透下会加载失败） */
export const AXHUB_PREVIEW_HOST_RUNTIME_SRC = '/@axhub/preview-host-runtime';

export function axhubPreviewHostRuntimePlugin(): Plugin {
  const runtimePath = path.resolve(process.cwd(), 'vite-plugins/virtualHtml/previewHostRuntime.ts');

  return {
    name: 'axhub-preview-host-runtime',
    apply: 'serve',
    resolveId(source) {
      const bare = source.split('?')[0];
      if (bare === AXHUB_PREVIEW_HOST_RUNTIME_SRC || bare === `${AXHUB_PREVIEW_HOST_RUNTIME_SRC}.ts`) {
        return runtimePath;
      }
      return null;
    },
  };
}
