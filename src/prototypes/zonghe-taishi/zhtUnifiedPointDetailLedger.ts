/**
 * 综合态势 · 统一点位详情台账反查
 * 按统一点位 id 从各原型源表取全量字段，供地图详情 Modal 多段 Descriptions 展示。
 * 已改为业务同源的只读组件的模块不在此输出，避免与 Modal 内 UI 双轨。
 */
import type { DescriptionsProps } from 'antd';
import type { ZhtUnifiedSearchPoint } from './zhtSearchUnifiedData';

type DescItems = NonNullable<DescriptionsProps['items']>;

export type ZhtUnifiedLedgerSection = { title: string; items: DescItems };

/**
 * 根据统一点位反查源台账，生成分组 Descriptions 条目（无匹配则返回空数组）。
 */
export function getUnifiedPointLedgerDescriptionSections(pt: ZhtUnifiedSearchPoint): ZhtUnifiedLedgerSection[] {
  const { id } = pt;
  const out: ZhtUnifiedLedgerSection[] = [];

  if (id.startsWith('zht-outlet-responsible-')) {
    return out;
  }

  if (
    id.startsWith('zht-river-sec-') ||
    id.startsWith('zht-eco-proj-') ||
    id.startsWith('zht-eco-lake-') ||
    id.startsWith('zht-sys-hydro-') ||
    id.startsWith('zht-sys-sluice-') ||
    id.startsWith('zht-sys-watergate-') ||
    id.startsWith('zht-sys-levee-') ||
    id.startsWith('zht-sys-weir-') ||
    id.startsWith('zht-sys-polder-') ||
    id.startsWith('zht-sys-hillpond-') ||
    id.startsWith('zht-emg-ent-') ||
    id.startsWith('zht-emg-supply-') ||
    id.startsWith('zht-emg-team-') ||
    id.startsWith('zht-emg-evt-')
  ) {
    return out;
  }

  if (id.startsWith('zht-eco-affair-')) {
    return out;
  }

  return out;
}
