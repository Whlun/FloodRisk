import React from 'react';
import { Card, Space, Typography } from 'antd';
import { LEVEL1_FACTOR_LABEL, type Level1Factor } from './types';

const { Text } = Typography;

const LEVEL1_ORDER: Level1Factor[] = ['HAZARD', 'FORMATION', 'BEARING', 'PREVENTION'];

const LEVEL1_BORDER: Record<Level1Factor, string> = {
  HAZARD: '#1677ff',
  FORMATION: '#fa8c16',
  BEARING: '#52c41a',
  PREVENTION: '#eb2f96',
};

export type ArchitectureLegendVariant = 'preview' | 'version-readonly' | 'version-editable';

const LEGEND_BULLETS: Record<ArchitectureLegendVariant, React.ReactNode[]> = {
  preview: [
    <>
      本页为<strong>只读预览</strong>，展示当前定级引用版本的权重与启用状态。
    </>,
    <>修改权重或启用状态请前往「指标评价管理」新建或编辑版本，并设为定级引用。</>,
    <>二级指标 F 由「风险指标管理」赋分规则确定；ω 来自本评价版本快照。</>,
  ],
  'version-readonly': [
    <>只读查看本版本的权重与启用状态；修改请点击工具栏「编辑」。</>,
    <>二级指标 F 由「风险指标管理」赋分规则确定；ω 来自本评价版本快照。</>,
    <>设为定级引用后，内涝定级与等级试算以该版本为准。</>,
  ],
  'version-editable': [
    <>
      配置本版本的<strong>一级权重 ω</strong>、<strong>二级指标 ω</strong>与
      <strong>启用状态</strong>；保存后写入版本快照。
    </>,
    <>二级指标 F 由「风险指标管理」赋分规则确定；定级计分使用本版本快照中的 ω 与启用状态。</>,
    <>各级启用指标权重合计须为 1.000；完成后可设为定级引用。</>,
  ],
};

export const IndicatorArchitectureLegend: React.FC<{ variant: ArchitectureLegendVariant }> = ({
  variant,
}) => (
  <Card title="图例与计算说明" bordered={false} size="small" className="dq-arch-legend">
    <div className="dq-arch-legend-items">
      {LEVEL1_ORDER.map(l1 => (
        <Space key={l1} size={8}>
          <span className="dq-arch-legend-dot" style={{ background: LEVEL1_BORDER[l1] }} />
          <Text>{LEVEL1_FACTOR_LABEL[l1]}</Text>
        </Space>
      ))}
    </div>
    <ul className="dq-arch-legend-list">
      {LEGEND_BULLETS[variant].map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  </Card>
);
