/**
 * 空间利用画像 · 图表挂载（仅在 Tab/块可见时初始化，确保动效可见）
 */
import { useEffect } from 'react';
import type { EChartsOption } from 'echarts';
import * as echarts from 'echarts';
import { setChartOptionWithAnimation } from '../../../../common/chartAnimation';

export function useSpatialEcharts(
  ref: React.RefObject<HTMLDivElement | null>,
  getOption: () => EChartsOption,
  active: boolean,
  deps: React.DependencyList,
): void {
  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;

    const chart = echarts.init(el);
    const apply = () => setChartOptionWithAnimation(chart, getOption());
    apply();

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, ref, ...deps]);
}
