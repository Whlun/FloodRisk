import path from 'path';

import { AXHUB_PREVIEW_HOST_RUNTIME_SRC } from '../axhubPreviewHostRuntimePlugin';
import { encodeRoutePath } from './handlers/pathNormalizer';
import { buildDocApiPath } from '../utils/docUtils';

export interface PreviewHostModuleOptions {
  type: 'components' | 'prototypes' | 'themes';
  name: string;
  entryImportPath: string;
  resourcePath: string;
  resourceUrlPath: string;
  editableHackCssHref: string | null;
  initialHackCssEnabled: boolean;
  versionId?: string;
}

export interface HackCssUpdatePayload {
  resourcePath: string;
  href: string;
  removed: boolean;
  timestamp: number;
}

export interface DocUpdatePayload {
  docUrl: string;
  filePath: string;
  removed: boolean;
  timestamp: number;
}

/** 嵌入 HTML 的启动配置（由 previewHostRuntime 读取），避免大块内联脚本走 Vite html-proxy */
export interface AxhubPreviewBootConfig {
  resourcePath: string;
  resourceUrlPath: string;
  entryImportPath: string;
  editableHackCssHref: string | null;
  initialHackCssEnabled: boolean;
}

export function buildPreviewHostBootConfig(options: PreviewHostModuleOptions): AxhubPreviewBootConfig {
  return {
    resourcePath: options.resourcePath,
    resourceUrlPath: options.resourceUrlPath,
    entryImportPath: options.entryImportPath,
    editableHackCssHref: options.editableHackCssHref,
    initialHackCssEnabled: options.initialHackCssEnabled,
  };
}

export function replacePreviewLoaderScript(html: string, boot: AxhubPreviewBootConfig): string {
  const runtimeSrc = AXHUB_PREVIEW_HOST_RUNTIME_SRC;
  const json = JSON.stringify(boot).replace(/</g, '\\u003c');
  const loaderScript =
    `  <script>window.__AXHUB_PREVIEW_BOOT__=${json};</script>\n` +
    `  <script type="module" src=${JSON.stringify(runtimeSrc)}></script>`;
  const legacyLoaderPattern = /<script type="module">\s*\/\/ 等待 bootstrap 加载完成[\s\S]*?<\/script>\s*<\/body>/;

  if (legacyLoaderPattern.test(html)) {
    return html.replace(legacyLoaderPattern, `${loaderScript}\n\n</body>`);
  }

  return html.replace('</body>', `${loaderScript}\n</body>`);
}

export function resolveEditableHackCssHref(
  type: 'components' | 'prototypes' | 'themes',
  name: string,
  versionId?: string,
): string | null {
  if (versionId) {
    return null;
  }

  if (type !== 'components' && type !== 'prototypes') {
    return null;
  }

  return encodeRoutePath(`/${type}/${name}/hack.css`);
}

export function createHackCssUpdatePayload(filePath: string, changeType: 'add' | 'change' | 'unlink'): HackCssUpdatePayload | null {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const marker = '/src/';
  const markerIndex = normalizedPath.lastIndexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const relativePath = normalizedPath.slice(markerIndex + marker.length);
  const pathParts = relativePath.split('/');

  if (pathParts.length < 3) {
    return null;
  }

  const [type, ...rest] = pathParts;
  if ((type !== 'components' && type !== 'prototypes') || rest[rest.length - 1] !== 'hack.css') {
    return null;
  }

  const name = rest.slice(0, -1).join('/');
  if (!name) {
    return null;
  }

  return {
    resourcePath: `${type}/${name}`,
    href: encodeRoutePath(`/${type}/${name}/hack.css`),
    removed: changeType === 'unlink',
    timestamp: Date.now(),
  };
}

export function createDocUpdatePayload(filePath: string, changeType: 'add' | 'change' | 'unlink'): DocUpdatePayload | null {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const marker = '/src/';
  const markerIndex = normalizedPath.lastIndexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const relativePath = normalizedPath.slice(markerIndex + marker.length);
  const pathParts = relativePath.split('/');

  if (pathParts.length < 2) {
    return null;
  }

  if (pathParts[0] === 'docs' && relativePath.endsWith('.md')) {
    const docName = relativePath.slice('docs/'.length);
    if (!docName) {
      return null;
    }

    return {
      docUrl: buildDocApiPath(docName),
      filePath: normalizedPath,
      removed: changeType === 'unlink',
      timestamp: Date.now(),
    };
  }

  const [type, ...rest] = pathParts;
  if ((type !== 'components' && type !== 'prototypes' && type !== 'themes') || rest.length < 2) {
    return null;
  }

  const fileName = rest[rest.length - 1];
  if (fileName !== 'spec.md' && fileName !== 'prd.md') {
    return null;
  }

  const name = rest.slice(0, -1).join('/');
  if (!name) {
    return null;
  }

  return {
    docUrl: encodeRoutePath(`/${type}/${name}/${fileName}`),
    filePath: normalizedPath,
    removed: changeType === 'unlink',
    timestamp: Date.now(),
  };
}

export function createPreviewHostOptions(input: {
  type: 'components' | 'prototypes' | 'themes';
  name: string;
  entryImportPath: string;
  versionId?: string;
  initialHackCssEnabled?: boolean;
}): PreviewHostModuleOptions {
  const resourcePath = `${input.type}/${input.name}`;
  return {
    type: input.type,
    name: input.name,
    entryImportPath: input.entryImportPath,
    resourcePath,
    resourceUrlPath: encodeRoutePath(`/${resourcePath}`),
    editableHackCssHref: resolveEditableHackCssHref(input.type, input.name, input.versionId),
    initialHackCssEnabled: Boolean(input.initialHackCssEnabled),
    versionId: input.versionId,
  };
}

export function toPosixPath(input: string): string {
  return input.split(path.sep).join('/');
}
