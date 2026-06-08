/**
 * 数字滚动展示 · 配合 useAnimatedNumber
 */
import React from 'react';
import { useAnimatedNumber } from './useAnimatedNumber';

export type AnimatedNumberProps = {
  value: number;
  duration?: number;
  enabled?: boolean;
  formatter?: (value: number) => string;
  className?: string;
  children?: (formatted: string) => React.ReactNode;
};

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  duration,
  enabled,
  formatter,
  className,
  children,
}) => {
  const animated = useAnimatedNumber(value, { duration, enabled });
  const formatted = formatter ? formatter(animated) : String(Math.round(animated));

  if (children) {
    return <>{children(formatted)}</>;
  }

  return <span className={className}>{formatted}</span>;
};
