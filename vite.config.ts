import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import react from '@vitejs/plugin-react';

// ── 构建模式也需要的插件（静态导入） ──
import { addAxhubMarker } from './vite-plugins/addAxhubMarker';
import { axhubComponentEnforcer } from './vite-plugins/axhubComponentEnforcer';
import { forceInlineDynamicImportsOff } from './vite-plugins/forceInlineDynamicImportsOff';
import { injectStablePageIds } from './vite-plugins/injectStablePageIds';
import { stableRemoteDevPlugin } from './vite-plugins/stableRemoteDevPlugin';
import { axhubPreviewHostRuntimePlugin } from './vite-plugins/axhubPreviewHostRuntimePlugin';
import { devSourcePollingInvalidatePlugin } from './vite-plugins/devSourcePollingInvalidatePlugin';
import {
  MAKE_CONFIG_RELATIVE_PATH,
  MAKE_ENTRIES_RELATIVE_PATH,
} from './vite-plugins/utils/makeConstants';
import { readEntriesManifest, scanProjectEntries, writeEntriesManifestAtomic } from './vite-plugins/utils/entriesManifest';

// ── 仅 dev server 模式需要的插件 ──
// 使用动态 import() 避免在 build 模式下加载这些模块。
// lowdbService 等单例会在模块求值时创建持久资源，导致 vite build 进程无法退出。
async function loadServePlugins(): Promise<Plugin[]> {
  const [
    { aiCliPlugin },
    { autoDebugPlugin },
    { axureBridgeProxyPlugin },
    { canvasApiPlugin },
    { codeReviewPlugin },
    { configApiPlugin },
    { dataManagementApiPlugin },
    { docsApiPlugin },
    { docsImportApiPlugin },
    { downloadDistPlugin },
    { exportHtmlApiPlugin },
    { exportImageProxyPlugin },
    { fileSystemApiPlugin },
    { gitVersionApiPlugin },
    { lanAccessControlPlugin },
    { devAuthPlugin },
    { mediaManagementApiPlugin },
    { serveAdminPlugin },
    { sourceApiPlugin },
    { specDocApiPlugin },
    { subPagesApiPlugin },
    { deqingWaterloggingWorkspaceApiPlugin },
    { surveyTablePdfApiPlugin },
    { cmProjectExportRecordsApiPlugin },
    { templatesApiPlugin },
    { themesApiPlugin },
    { unsetReferenceApiPlugin },
    { uploadDocsApiPlugin },
    { versionApiPlugin },
    { virtualHtmlPlugin },
    { websocketPlugin },
    { writeDevServerInfoPlugin },
  ] = await Promise.all([
    import('./vite-plugins/aiCliPlugin'),
    import('./vite-plugins/autoDebugPlugin'),
    import('./vite-plugins/axureBridgeProxyPlugin'),
    import('./vite-plugins/canvasApiPlugin'),
    import('./vite-plugins/codeReviewPlugin'),
    import('./vite-plugins/configApiPlugin'),
    import('./vite-plugins/dataManagementApiPlugin'),
    import('./vite-plugins/docsApiPlugin'),
    import('./vite-plugins/docsImportApiPlugin'),
    import('./vite-plugins/downloadDistPlugin'),
    import('./vite-plugins/exportHtmlApiPlugin'),
    import('./vite-plugins/exportImageProxyPlugin'),
    import('./vite-plugins/fileSystemApiPlugin'),
    import('./vite-plugins/gitVersionApiPlugin'),
    import('./vite-plugins/lanAccessControlPlugin'),
    import('./vite-plugins/devAuthPlugin'),
    import('./vite-plugins/mediaManagementApiPlugin'),
    import('./vite-plugins/serveAdminPlugin'),
    import('./vite-plugins/sourceApiPlugin'),
    import('./vite-plugins/specDocApiPlugin'),
    import('./vite-plugins/subPagesApiPlugin'),
    import('./vite-plugins/deqingWaterloggingWorkspaceApiPlugin'),
    import('./vite-plugins/surveyTablePdfApiPlugin'),
    import('./vite-plugins/cmProjectExportRecordsApiPlugin'),
    import('./vite-plugins/templatesApiPlugin'),
    import('./vite-plugins/themesApiPlugin'),
    import('./vite-plugins/unsetReferenceApiPlugin'),
    import('./vite-plugins/uploadDocsApiPlugin'),
    import('./vite-plugins/versionApiPlugin'),
    import('./vite-plugins/virtualHtml'),
    import('./vite-plugins/websocketPlugin'),
    import('./vite-plugins/writeDevServerInfoPlugin'),
  ]);

  return [
    lanAccessControlPlugin(),
    devAuthPlugin(),
    writeDevServerInfoPlugin(),
    serveAdminPlugin(),
    axureBridgeProxyPlugin(),
    exportImageProxyPlugin(),
    virtualHtmlPlugin(),
    websocketPlugin(),
    versionApiPlugin(),
    downloadDistPlugin(),
    exportHtmlApiPlugin(),
    docsImportApiPlugin(),
    docsApiPlugin(),
    canvasApiPlugin(),
    templatesApiPlugin(),
    uploadDocsApiPlugin(),
    sourceApiPlugin(),
    specDocApiPlugin(),
    subPagesApiPlugin(),
    deqingWaterloggingWorkspaceApiPlugin(),
    surveyTablePdfApiPlugin(),
    cmProjectExportRecordsApiPlugin(),
    unsetReferenceApiPlugin(),
    themesApiPlugin(),
    fileSystemApiPlugin(),
    dataManagementApiPlugin(),
    mediaManagementApiPlugin(),
    codeReviewPlugin(),
    autoDebugPlugin(),
    configApiPlugin(),
    aiCliPlugin(),
    gitVersionApiPlugin(),
  ];
}

const projectRoot = process.cwd();
const configPath = path.resolve(projectRoot, MAKE_CONFIG_RELATIVE_PATH);
let axhubConfig: any = { server: { host: 'localhost', allowLAN: true } };
if (fs.existsSync(configPath)) {
  try {
    axhubConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    console.warn(`Failed to parse ${MAKE_CONFIG_RELATIVE_PATH}, using defaults:`, error);
  }
}

/** 经域名/穿透访问时关闭 HMR WebSocket，避免断线整页 reload 闪屏；也可用环境变量 AXHUB_STABLE_REMOTE_DEV=1 */
const stableRemoteDev =
  process.env.AXHUB_STABLE_REMOTE_DEV === '1' || axhubConfig?.server?.stableRemoteDev === true;

const entryKey = process.env.ENTRY_KEY;
const hasSingleEntry = typeof entryKey === 'string' && entryKey.length > 0;

// 有 ENTRY_KEY 时，只扫描这一个项目，大幅提升启动速度！
let scanGroups: EntryGroup[] = ['components', 'prototypes', 'themes'];
if (hasSingleEntry) {
  if (entryKey.startsWith('prototypes/')) {
    scanGroups = ['components']; // 只扫描 components，prototypes 只需要那一个
  }
}

writeEntriesManifestAtomic(
  projectRoot,
  scanProjectEntries(projectRoot, scanGroups),
);
const entries = readEntriesManifest(projectRoot);
const jsEntries = entries.js as Record<string, string>;
const htmlEntries = entries.html as Record<string, string>;

/** 多入口构建时跳过磁盘上不存在的 HTML，避免 Rollup 报错导致整站无法构建 */
function filterExistingHtmlInputs(root: string, inputs: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, rel] of Object.entries(inputs)) {
    if (!rel || typeof rel !== 'string') continue;
    const abs = path.isAbsolute(rel) ? rel : path.resolve(root, rel);
    if (fs.existsSync(abs)) {
      out[key] = rel;
    } else {
      console.warn(`[vite] 跳过缺失的 HTML 入口: ${rel}（${key}）`);
    }
  }
  return out;
}

let rollupInput: Record<string, string> = filterExistingHtmlInputs(projectRoot, htmlEntries);

if (hasSingleEntry) {
  if (!jsEntries[entryKey as string]) {
    throw new Error(`ENTRY_KEY=${entryKey} 未在 ${MAKE_ENTRIES_RELATIVE_PATH} 中找到对应入口文件。请确保目录 src/${entryKey} 存在且包含 index.tsx 文件。`);
  }
  rollupInput = { [entryKey as string]: jsEntries[entryKey as string] };
}

const isIifeBuild = hasSingleEntry;

/** 与下方 server.port / package 脚本保持一致，供 HMR 显式绑定端口 */
const DEV_SERVER_PORT = 51720;

export default defineConfig(async ({ command }) => {
  const isServe = command === 'serve';

  // 仅在 serve 模式才加载 server-only 插件，避免 build 进程被持久资源阻塞
  const servePlugins = isServe ? await loadServePlugins() : [];

  const config: any = {
    // 仅 dev：放宽 HMR WebSocket 的 token 校验（见下方 server.hmr 注释）。build 不需要且不暴露此行为。
    ...(isServe
      ? {
          legacy: {
            skipWebSocketTokenCheck: true,
          },
        }
      : {}),
    plugins: [
      injectStablePageIds(),
      ...(isServe ? [axhubPreviewHostRuntimePlugin(), devSourcePollingInvalidatePlugin()] : []),
      ...(isServe && stableRemoteDev ? [stableRemoteDevPlugin()] : []),
      ...servePlugins,
      forceInlineDynamicImportsOff(isIifeBuild),
      react({
        jsxRuntime: 'classic',
        babel: { configFile: false, babelrc: false }
      }),
      isIifeBuild ? addAxhubMarker() : null,
      isIifeBuild ? axhubComponentEnforcer(jsEntries[entryKey as string]) : null
    ].filter(Boolean) as Plugin[],

    root: 'src',

    optimizeDeps: {
      // React Fast Refresh 在开发态会接管 react/react-dom 的依赖预处理。
      // 这里不要再把它们排除掉，否则会和 plugin-react 的 include 冲突。
      exclude: [],
      include: [
        'lucide-react'
      ]
    },

    resolve: {
      alias: [
        { find: '@', replacement: path.resolve(projectRoot, 'src') },
        !isIifeBuild && !isServe && {
          find: /^react$/,
          replacement: path.resolve(projectRoot, 'src/common/react-shim.js')
        },
        !isIifeBuild && !isServe && {
          find: /^react-dom$/,
          replacement: path.resolve(projectRoot, 'src/common/react-dom-shim.js')
        },
        !isIifeBuild && !isServe && {
          find: /^react\/.*/,
          replacement: path.resolve(projectRoot, 'src/common/react-shim.js')
        },
        !isIifeBuild && !isServe && {
          find: /^react-dom\/.*/,
          replacement: path.resolve(projectRoot, 'src/common/react-dom-shim.js')
        }
      ].filter(Boolean) as { find: string | RegExp; replacement: string }[]
    },

    server: {
      port: DEV_SERVER_PORT, // 固定开发端口，便于书签与工具链（与 .dev-server-info 一致）
      strictPort: true, // 被占用时直接失败，不自动改端口，避免 URL 漂移
      host: '0.0.0.0', // 统一使用 0.0.0.0 绑定，确保端口检测正确
      // 网络卷/同步盘一次保存常触发多次短暂 change，合并后再交给 Vite，减轻无意义 HMR 与预览抖动
      watch: {
        awaitWriteFinish: {
          stabilityThreshold: 450,
          pollInterval: 200,
        },
        // Cursor/同步盘等场景下原生 fs 事件可能丢失，轮询兜底以便刷新能拿到新代码
        usePolling: process.platform === 'darwin',
        interval: 500,
      },
      // 稳定远程开发：减少首屏并行预请求，在高延迟链路上体感更轻（代价是首次交互前少预热的模块略晚就绪）
      ...(stableRemoteDev ? { preTransformRequests: false } : {}),
      // Vite 5+ 默认校验 Host：仅放行 localhost、*.localhost、IPv4；通过 DDNS/域名访问会被 403，
      // 表现为 @vite/client、html-proxy 等脚本全部加载失败；IP 直连正常。开发环境允许任意 Host。
      allowedHosts: true,
      open: false, // 开发态不要自动打开浏览器
      cors: true,
      // stableRemoteDev 下关闭服务端 HMR，与 axhub-stable-remote-dev 插件一起减少域名/穿透链路上的无效连接与整页刷新体感
      hmr: stableRemoteDev
        ? false
        : {
            port: DEV_SERVER_PORT,
            clientPort: DEV_SERVER_PORT,
            overlay: false,
          },
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    },

    build: {
      outDir: path.resolve(projectRoot, 'dist'),
      emptyOutDir: !isIifeBuild,
      // es2020：MapLibre GL v5 等依赖含 BigInt 字面量，es2015 会导致单入口 IIFE 构建失败
      target: isIifeBuild ? 'es2020' : 'esnext',
      assetsInlineLimit: 1024 * 1024, // 1MB - 小于此大小的图片会被内联为 Base64

      rollupOptions: {
        input: rollupInput,

        external: isIifeBuild ? ['react', 'react-dom'] : [],

        output: {
          entryFileNames: (chunkInfo: { name: string }) => `${chunkInfo.name}.js`,
          format: isIifeBuild ? 'iife' : 'es',
          name: 'UserComponent',

          ...(isIifeBuild
            ? {
              globals: {
                react: 'React',
                'react-dom': 'ReactDOM'
              },
              generatedCode: { constBindings: false }
            }
            : {})
        }
      },

      minify: isIifeBuild ? 'esbuild' : false
    },

    esbuild: isIifeBuild
      ? {
        target: 'es2020',
        legalComments: 'none',
        keepNames: true
      }
      : {
        jsx: 'transform',
        jsxFactory: 'React.createElement',
        jsxFragment: 'React.Fragment'
      },

    test: {
      globals: true,
      environment: 'node',
      include: [
        'tests/**/*.test.ts',
        'tests/**/*.test.tsx',
        'vite-plugins/**/*.test.ts',
      ],
      root: '.',
    }
  };

  return config;
});
