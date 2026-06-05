/**
 * 行政区划标签 · 与建设工程画像项目卡「行政区划」标签同款
 */
import React from 'react';
import { Tooltip } from 'antd';
import { formatHuzhouDistrictDisplay } from '../huzhouDistricts';

export type CmDistrictTagProps = {
  value: string | number | null | undefined;
};

export const CmDistrictTag: React.FC<CmDistrictTagProps> = ({ value }) => {
  const label = formatHuzhouDistrictDisplay(value);
  if (label === '—') {
    return <span>—</span>;
  }
  return (
    <Tooltip title={`行政区划：${label}`} placement="top" mouseEnterDelay={0.35}>
      <span className="zht-stat-drawer-card__tag hz-cm-district-tag">{label}</span>
    </Tooltip>
  );
};
