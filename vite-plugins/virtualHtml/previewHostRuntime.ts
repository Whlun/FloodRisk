/**
 * 开发态预览宿主：从独立模块加载，避免大块代码走 Vite HTML 内联拆分的 html-proxy
 *（经 NPM/域名/部分 WebView 时 index=1 等大脚本 URL 更易加载失败）。
 */
import React from 'react';
import type { ComponentType } from 'react';
import * as ReactDOMLegacy from 'react-dom';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';

import type { AxhubPreviewBootConfig } from './previewHost';

const AXHUB_RUNTIME_KEY = '__AXHUB_PREVIEW_RUNTIME__';

type PreviewProps = {
  container: HTMLElement;
  config: Record<string, unknown>;
  data: Record<string, unknown>;
  events: Record<string, unknown>;
};

interface HostState {
  root: Root | null;
  rootElement: HTMLElement | null;
  editorModeHandled: boolean;
  latestProps: PreviewProps | null;
  hackCssHandler?: ((payload: HackCssPayload) => void) | null;
  hackCssLink?: HTMLLinkElement | null;
}

interface HackCssPayload {
  resourcePath: string;
  href?: string;
  removed?: boolean;
  timestamp?: number;
}

interface AxhubPreviewRuntime {
  hosts: Map<string, HostState>;
}

function readBoot(): AxhubPreviewBootConfig {
  const w = window as unknown as { __AXHUB_PREVIEW_BOOT__?: AxhubPreviewBootConfig };
  const boot = w.__AXHUB_PREVIEW_BOOT__;
  if (!boot || typeof boot.entryImportPath !== 'string') {
    throw new Error('[Axhub Preview Host] 缺少 window.__AXHUB_PREVIEW_BOOT__');
  }
  return boot;
}

const boot = readBoot();
const RESOURCE_PATH = boot.resourcePath;
const ENTRY_IMPORT_PATH = boot.entryImportPath;
const AXHUB_HOST_KEY = RESOURCE_PATH;

const LegacyReactDOM = {
  ...ReactDOMLegacy,
  createRoot,
  hydrateRoot,
};

function hashString(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash).toString(36);
}

function getStablePageId(): string {
  if (typeof (window as unknown as { __PAGE_FULL_PATH__?: string }).__PAGE_FULL_PATH__ !== 'undefined') {
    const fullPath = (window as unknown as { __PAGE_FULL_PATH__: string }).__PAGE_FULL_PATH__;
    const hash = hashString(fullPath);
    const pathSegment = String(fullPath)
      .split('/')
      .slice(-2)
      .join('-')
      .replace(/\.(tsx|jsx|ts|js)$/u, '')
      .replace(/[^a-zA-Z0-9-]/g, '-')
      .slice(0, 32);
    return `${pathSegment}-${hash}`;
  }

  if (typeof (window as unknown as { __PAGE_ID__?: string }).__PAGE_ID__ !== 'undefined') {
    return (window as unknown as { __PAGE_ID__: string }).__PAGE_ID__;
  }

  const pathKey = `${window.location.pathname}${window.location.search}`;
  const hash = hashString(pathKey);
  const pathSegment = pathKey
    .replace(/[^a-zA-Z0-9]/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return `${pathSegment}-${hash}`;
}

function getRuntimeState(): AxhubPreviewRuntime {
  const w = window as unknown as Record<string, AxhubPreviewRuntime | undefined>;
  if (!w[AXHUB_RUNTIME_KEY]) {
    w[AXHUB_RUNTIME_KEY] = { hosts: new Map() };
  }
  const runtime = w[AXHUB_RUNTIME_KEY] as AxhubPreviewRuntime;
  let hostState = runtime.hosts.get(AXHUB_HOST_KEY);
  if (!hostState) {
    hostState = {
      root: null,
      rootElement: null,
      editorModeHandled: false,
      latestProps: null,
    };
    runtime.hosts.set(AXHUB_HOST_KEY, hostState);
  }
  return runtime;
}

function getHostState(): HostState {
  const runtime = getRuntimeState();
  const hostState = runtime.hosts.get(AXHUB_HOST_KEY);
  if (!hostState) {
    throw new Error('[Axhub Preview Host] 内部状态异常');
  }
  return hostState;
}

function getRootElement(): HTMLElement {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('[Axhub Preview Host] 缺少 #root 容器');
  }
  return rootElement;
}

function ensureRoot(hostState: HostState): HTMLElement {
  const rootElement = getRootElement();
  if (!hostState.root || hostState.rootElement !== rootElement) {
    hostState.root = createRoot(rootElement);
    hostState.rootElement = rootElement;
  }
  return rootElement;
}

function getDefaultProps(container: HTMLElement): PreviewProps {
  return {
    container,
    config: {},
    data: {},
    events: {},
  };
}

function getRenderProps(container: HTMLElement, nextProps: PreviewProps | null): PreviewProps {
  if (nextProps && typeof nextProps === 'object') {
    return {
      ...getDefaultProps(container),
      ...nextProps,
      container: nextProps.container || container,
    };
  }

  return getDefaultProps(container);
}

function findHackCssLink(): HTMLLinkElement | null {
  return document.head.querySelector(`link[data-axhub-hack-css="${RESOURCE_PATH}"]`);
}

let currentHackCssHref: string | null = boot.editableHackCssHref;

function updateHackCssLink(payload?: HackCssPayload): void {
  const hostState = getHostState();
  if (payload && typeof payload.href === 'string' && payload.href) {
    currentHackCssHref = payload.href;
  }

  const nextHref = currentHackCssHref;
  const existingLink = findHackCssLink();
  if (payload?.removed) {
    if (existingLink) {
      existingLink.remove();
    }
    hostState.hackCssLink = undefined;
    return;
  }

  if (!nextHref) {
    return;
  }

  const link = existingLink || document.createElement('link');
  link.rel = 'stylesheet';
  link.setAttribute('data-axhub-hack-css', RESOURCE_PATH);
  link.href = `${nextHref}?t=${payload && payload.timestamp ? payload.timestamp : Date.now()}`;
  if (!link.parentNode) {
    document.head.appendChild(link);
  }
  hostState.hackCssLink = link;
}

function applyStablePageId(container: HTMLElement): void {
  const stablePageId = getStablePageId();
  if (stablePageId) {
    container.setAttribute('data-page-id', stablePageId);
  }
}

function resolveInitialEditorMode(): string {
  const params = new URLSearchParams(window.location.search);
  const editor = params.get('editor');
  if (editor === 'inspecta' || editor === 'textEdit' || editor === 'webEditorV2') {
    return editor;
  }
  if (params.get('inspecta') === 'true') {
    return 'inspecta';
  }
  return 'none';
}

function maybeEnableInitialEditorMode(hostState: HostState): void {
  if (hostState.editorModeHandled) {
    return;
  }

  const bootstrap = (window as unknown as { DevTemplateBootstrap?: { editors?: { enable?: (m: string) => Promise<void> } } })
    .DevTemplateBootstrap;
  if (!bootstrap || !bootstrap.editors || typeof bootstrap.editors.enable !== 'function') {
    window.setTimeout(() => maybeEnableInitialEditorMode(hostState), 30);
    return;
  }

  hostState.editorModeHandled = true;
  const initialMode = resolveInitialEditorMode();
  if (initialMode === 'none') {
    return;
  }

  Promise.resolve(bootstrap.editors.enable(initialMode)).catch((error: unknown) => {
    hostState.editorModeHandled = false;
    console.error('[Axhub Preview Host] Failed to enable initial editor mode:', error);
  });
}

/** 由 bootstrapPreview 首帧前赋值；此处断言避免在严格模式下被误判为未初始化 */
let CurrentComponent!: ComponentType<PreviewProps>;

function syncLegacyBootstrap(container: HTMLElement): void {
  const hostState = getHostState();
  const bootstrap = (window as unknown as {
    DevTemplateBootstrap?: {
      React?: typeof React;
      ReactDOM?: typeof LegacyReactDOM;
      renderComponent?: (Component: ComponentType<PreviewProps> | null, props: PreviewProps | null) => void;
      inspectaMode?: boolean;
    };
  }).DevTemplateBootstrap;

  (window as unknown as { React: typeof React }).React = React;
  (window as unknown as { ReactDOM: typeof LegacyReactDOM }).ReactDOM = LegacyReactDOM;
  (window as unknown as { AxhubDevComponent: typeof CurrentComponent }).AxhubDevComponent = CurrentComponent;

  if (!bootstrap || typeof bootstrap !== 'object') {
    return;
  }

  bootstrap.React = React;
  bootstrap.ReactDOM = LegacyReactDOM;
  bootstrap.renderComponent = (Component, props) => {
    if (Component) {
      CurrentComponent = Component;
    }
    hostState.latestProps = props && typeof props === 'object' ? props : null;
    renderCurrentComponent(hostState.latestProps);
  };

  if (typeof bootstrap.inspectaMode === 'undefined') {
    bootstrap.inspectaMode = false;
  }
}

function afterRender(container: HTMLElement): void {
  syncLegacyBootstrap(container);
  applyStablePageId(container);
  maybeEnableInitialEditorMode(getHostState());
}

function renderCurrentComponent(nextProps?: PreviewProps | null): void {
  const hostState = getHostState();
  const rootElement = ensureRoot(hostState);
  if (typeof nextProps !== 'undefined') {
    hostState.latestProps = nextProps && typeof nextProps === 'object' ? nextProps : null;
  }

  const renderProps = getRenderProps(rootElement, hostState.latestProps);
  hostState.root!.render(React.createElement(CurrentComponent, renderProps));
  afterRender(rootElement);
}

async function resolveUpdatedPreviewModule(nextModule: { default?: ComponentType<PreviewProps> } | undefined) {
  if (nextModule?.default) {
    return nextModule;
  }

  try {
    const refreshedModule = await import(/* @vite-ignore */ `${ENTRY_IMPORT_PATH}?t=${Date.now()}`);
    if (refreshedModule?.default) {
      return refreshedModule;
    }
  } catch (error) {
    console.warn('[Axhub Preview Host] Fallback re-import failed:', error);
  }

  return null;
}

async function bootstrapPreview(): Promise<void> {
  const entryMod = await import(/* @vite-ignore */ ENTRY_IMPORT_PATH);
  if (!entryMod?.default) {
    throw new Error('[Axhub Preview Host] 入口模块缺少 default 导出');
  }
  CurrentComponent = entryMod.default as ComponentType<PreviewProps>;

  renderCurrentComponent();

  if (boot.initialHackCssEnabled && currentHackCssHref) {
    updateHackCssLink({ href: currentHackCssHref, removed: false, timestamp: Date.now() });
  }

  if (import.meta.hot) {
    const hostState = getHostState();
    if (hostState.hackCssHandler && typeof import.meta.hot.off === 'function') {
      import.meta.hot.off('axhub:hack-css-update', hostState.hackCssHandler);
    }

    hostState.hackCssHandler = (payload: HackCssPayload) => {
      if (!payload || payload.resourcePath !== RESOURCE_PATH) {
        return;
      }
      updateHackCssLink(payload);
    };

    import.meta.hot.on('axhub:hack-css-update', hostState.hackCssHandler);
    import.meta.hot.accept(ENTRY_IMPORT_PATH, async (module) => {
      const resolvedModule = await resolveUpdatedPreviewModule(module);
      if (!resolvedModule?.default) {
        console.warn('[Axhub Preview Host] Skipped preview rerender because the updated module has no default export.');
        return;
      }

      CurrentComponent = resolvedModule.default;
      renderCurrentComponent();
    });
    import.meta.hot.accept();
    import.meta.hot.dispose(() => {
      if (hostState.hackCssHandler && typeof import.meta.hot!.off === 'function') {
        import.meta.hot!.off('axhub:hack-css-update', hostState.hackCssHandler);
      }
    });
  }
}

void bootstrapPreview().catch((err) => {
  console.error('[Axhub Preview Host] 启动失败:', err);
});

export function __axhubRenderPreview(): void {
  renderCurrentComponent();
}
