/**
 * 进度条填充 · 带宽度过渡动效
 */
import React from 'react';
import { useAnimatedNumber } from './useAnimatedNumber';

export type AnimatedProgressFillProps = {
  percent: number;
  className?: string;
  style?: React.CSSProperties;
};

export const AnimatedProgressFill: React.FC<AnimatedProgressFillProps> = ({
  percent,
  className,
  style,
}) => {
  const animated = useAnimatedNumber(percent, { duration: 600 });
  return (
    <span
      className={className}
      style={{ ...style, width: `${Math.min(Math.max(animated, 0), 100)}%` }}
    />
  );
};
