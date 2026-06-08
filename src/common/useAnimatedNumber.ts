/**
 * 数字滚动动效 · 从当前值过渡到目标值（含 0 → 有数据）
 */
import { useEffect, useRef, useState } from 'react';
import { easeOutCubic } from './chartAnimation';

export type UseAnimatedNumberOptions = {
  duration?: number;
  enabled?: boolean;
};

export function useAnimatedNumber(
  target: number,
  { duration = 600, enabled = true }: UseAnimatedNumberOptions = {},
): number {
  const [display, setDisplay] = useState(enabled ? 0 : target);
  const displayRef = useRef(enabled ? 0 : target);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      displayRef.current = target;
      setDisplay(target);
      return;
    }

    const from = displayRef.current;
    const to = target;
    if (from === to) return;

    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const value = from + (to - from) * easeOutCubic(progress);
      displayRef.current = value;
      setDisplay(value);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, enabled]);

  return display;
}
