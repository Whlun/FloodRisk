/**
 * 综合态势 · 台账/报警等详情弹窗与设施管理列表「详情」同源的宽度、body 滚动与全屏挂载规则。
 */

/** 与设施管理列表「详情」、地图泵站/排口/污水厂台账弹窗同宽 */
export const ZHT_FACILITY_DETAIL_MODAL_WIDTH = 'min(1200px, 96vw)' as const;

const zhtFormModalBody = {
  maxHeight: 'calc(100vh - 240px)',
  overflowY: 'auto' as const,
  overflowX: 'hidden' as const,
  minWidth: 0,
};

/** 与 `韶山水环境设施管理系统/index.tsx` 列表「详情」弹窗 `detailModalStyles` 一致 */
export const zhtDetailModalStyles = {
  body: {
    ...zhtFormModalBody,
    maxHeight: 'min(85vh, 900px)',
    overflowY: 'auto' as const,
  },
};

/** 读取当前全屏元素（与地图工具条全屏一致）；POI/台账详情 Modal 须挂进全屏栈内才能显示 */
export function zhtGetFullscreenElement(): Element | null {
  const d = document as Document & {
    webkitFullscreenElement?: Element | null;
    mozFullScreenElement?: Element | null;
    msFullscreenElement?: Element | null;
  };
  return (
    document.fullscreenElement ??
    d.webkitFullscreenElement ??
    d.mozFullScreenElement ??
    d.msFullscreenElement ??
    null
  );
}

/**
 * 地图栈 / 主舞台处于浏览器全屏时，详情 Modal 须挂进同一节点，否则仍在 body 上不可见。
 * @param root 通常为 `mapFullscreenStageRef.current ?? stackRef.current`；湖州画像等场景下
 *   全屏目标为内层 `.hz-maplibre-stack`，而 root 为外层 `.hz-map-column`，须识别包含关系。
 */
export function zhtResolveDetailModalContainer(root: HTMLElement | null): HTMLElement {
  const fs = zhtGetFullscreenElement();
  if (fs instanceof HTMLElement && root) {
    if (fs === root || root.contains(fs) || fs.contains(root)) {
      return fs;
    }
  }
  return document.body;
}
