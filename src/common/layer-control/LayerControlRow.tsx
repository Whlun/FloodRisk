/**
 * 图层控制 · 单行四列布局
 */
import React from 'react';

export type LayerControlRowProps = {
  chevron?: React.ReactNode;
  check: React.ReactNode;
  label: React.ReactNode;
  stat?: React.ReactNode;
  className?: string;
};

export const LayerControlRow: React.FC<LayerControlRowProps> = ({
  chevron,
  check,
  label,
  stat,
  className,
}) => (
  <div className={['ax-lc-row', className].filter(Boolean).join(' ')}>
    <div className="ax-lc-row__cell ax-lc-row__cell--chevron">{chevron}</div>
    <div className="ax-lc-row__cell ax-lc-row__cell--check">{check}</div>
    <div className="ax-lc-row__cell ax-lc-row__cell--label">{label}</div>
    <div className="ax-lc-row__cell ax-lc-row__cell--stat">{stat}</div>
  </div>
);
