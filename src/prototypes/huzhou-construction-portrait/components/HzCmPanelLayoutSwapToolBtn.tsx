/**
 * 地图工具条 · 左右看板互换按钮（插在全屏按钮下方）
 */
import React from 'react';
import { Tooltip } from 'antd';
import { Columns2 } from 'lucide-react';

const ICON_SIZE = 18;
const ICON_STROKE = 1.75;

export type HzCmPanelLayoutSwapToolBtnProps = {
  panelsSwapped: boolean;
  onToggle: () => void;
  /** 全屏容器，用于 Tooltip 挂载 */
  getPopupContainer?: () => HTMLElement;
};

export const HzCmPanelLayoutSwapToolBtn: React.FC<HzCmPanelLayoutSwapToolBtnProps> = ({
  panelsSwapped,
  onToggle,
  getPopupContainer,
}) => (
  <Tooltip
    title="左右看板互换"
    placement="right"
    getPopupContainer={getPopupContainer ?? (() => document.body)}
  >
    <button
      type="button"
      className={`zht-map-tool-btn${panelsSwapped ? ' zht-map-tool-btn--on' : ''}`}
      aria-label="左右看板互换"
      aria-pressed={panelsSwapped}
      onClick={onToggle}
    >
      <span className="zht-map-tool-icon">
        <Columns2 size={ICON_SIZE} strokeWidth={ICON_STROKE} />
      </span>
    </button>
  </Tooltip>
);
