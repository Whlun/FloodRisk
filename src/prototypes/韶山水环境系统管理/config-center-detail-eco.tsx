/**
 * 配置中心详情弹窗：多 Tab 时用顶栏切换；仅「基本信息」等单块内容时不展示 Tab 导航（与全站详情一致）
 */
import React from 'react';
import type { TabsProps } from 'antd';
import { DetailTabsIfMultiple } from '../shared/detailTabsIfMultiple';

export function ConfigCenterDetailTabs(props: {
  children: React.ReactNode;
  tabLabel?: string;
  /** 额外 Tab（如关联表）；不传时仅一块内容，不渲染 Tabs 顶栏 */
  extraItems?: NonNullable<TabsProps['items']>;
}) {
  const { children, tabLabel = '基本信息', extraItems } = props;
  const items: NonNullable<TabsProps['items']> = [
    { key: 'basic', label: tabLabel, children },
    ...(extraItems ?? []),
  ];
  return (
    <DetailTabsIfMultiple
      items={items}
      className="detail-tabs facility-detail-tabs"
      style={{ marginTop: 8 }}
    />
  );
}

/** 空值展示「—」（配置中心详情一致） */
export function configCenterDetailText(value: unknown): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="detail-value-empty">—</span>;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return <span className="detail-value-empty">—</span>;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return <span className="detail-value-empty">—</span>;
  }
  return String(value);
}

/** 数值 + 可选单位；空为 — */
export function configCenterDetailNum(
  value: number | null | undefined,
  suffix = '',
  opts?: { digits?: number }
): React.ReactNode {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return <span className="detail-value-empty">—</span>;
  }
  const s = opts?.digits !== undefined ? value.toFixed(opts.digits) : String(value);
  return suffix ? `${s}${suffix}` : s;
}

/** 下拉选项展示文案（value 为 string） */
export function configCenterOptLabel<T extends { value: string; label: string }>(
  options: T[],
  value: string | undefined | null
): React.ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="detail-value-empty">—</span>;
  }
  return options.find(o => o.value === value)?.label ?? value;
}

/** 下拉选项展示文案（value 为 number，如状态码） */
export function configCenterOptLabelNum<T extends { value: number; label: string }>(
  options: T[],
  value: number | undefined | null
): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="detail-value-empty">—</span>;
  }
  return options.find(o => o.value === value)?.label ?? String(value);
}
