/**
 * 详情弹窗 Tabs：多于一个 Tab 时展示顶栏切换；仅一项时不渲染 Tab 导航，直接展示内容。
 */
import React from 'react';
import { Tabs, type TabsProps } from 'antd';

export type DetailTabsIfMultipleProps = {
  items: NonNullable<TabsProps['items']>;
  className?: string;
  size?: TabsProps['size'];
  style?: React.CSSProperties;
  defaultActiveKey?: string;
};

function stripDetailTabsClass(className: string | undefined): string | undefined {
  if (!className) return undefined;
  const next = className.replace(/\bdetail-tabs\b/g, ' ').replace(/\s+/g, ' ').trim();
  return next || undefined;
}

export const DetailTabsIfMultiple: React.FC<DetailTabsIfMultipleProps> = ({
  items,
  className,
  size = 'small',
  style,
  defaultActiveKey,
}) => {
  const list = (items ?? []).filter(Boolean) as NonNullable<TabsProps['items']>;
  if (list.length <= 1) {
    const only = list[0];
    const bodyClass = ['detail-tabs-single-pane', stripDetailTabsClass(className)].filter(Boolean).join(' ');
    return (
      <div className={bodyClass} style={{ marginTop: 8, ...style }}>
        {only?.children ?? null}
      </div>
    );
  }
  return (
    <Tabs
      className={className}
      size={size}
      style={{ marginTop: 8, ...style }}
      defaultActiveKey={defaultActiveKey ?? String(list[0]?.key)}
      items={list}
    />
  );
};
