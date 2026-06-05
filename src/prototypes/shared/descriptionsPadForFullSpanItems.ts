import type { DescriptionsProps } from 'antd';
import './descriptionsPadForFullSpanItems.css';

/**
 * Ant Design `Descriptions`（`column=N`）若当前行只占了部分列，下一项又声明 `span=N` 想通栏时，
 * 组件会把该项压缩成「剩余列宽」（地图会变成窄条）。
 * 在「整行通栏」项之前插入不可见占位填满当前行，使地图等从新一行开始并占满整行宽度。
 */
export function padDescriptionsItemsForFullWidthRow(
  items: NonNullable<DescriptionsProps['items']>,
  column = 2,
): NonNullable<DescriptionsProps['items']> {
  const out: NonNullable<DescriptionsProps['items']> = [];
  let acc = 0;
  let idx = 0;
  for (const it of items) {
    const sRaw = it.span;
    const s = typeof sRaw === 'number' && Number.isFinite(sRaw) ? sRaw : 1;
    if (s >= column && acc > 0 && acc < column) {
      out.push({
        key: `__axhubDescPad-${idx++}`,
        label: '',
        children: '',
        span: column - acc,
        className: 'axhub-desc-fullspan-pad',
      });
      acc = 0;
    }
    out.push(it);
    acc = (acc + s) % column;
  }
  return out;
}
