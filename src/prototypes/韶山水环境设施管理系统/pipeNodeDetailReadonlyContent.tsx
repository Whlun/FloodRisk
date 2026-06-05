/**
 * 排水管点只读详情（湘潭风格卡片 + 位置地图）
 * 与 `index.tsx` 中原 `PipeNodeDetailContent` 结构一致
 */
import React from 'react';
import { Badge, Descriptions, Typography } from 'antd';
import type { DescriptionsProps } from 'antd';
import { AddrWgs84DetailMap } from '../shared/addrWgs84MapFormBridge';
import { padDescriptionsItemsForFullWidthRow } from '../shared/descriptionsPadForFullSpanItems';
import type { PipeNodeDemoRow } from './pipe-network-demo-data';

const { Title } = Typography;

/** 详情字段项：与 `index` 中 DetailTableItem 一致 */
interface DetailTableItem {
  label: string;
  value: React.ReactNode;
  span?: 1 | 2 | 3 | 4;
}

interface DetailCardProps {
  title: string;
  items: DetailTableItem[];
}

function renderDetailFieldValue(value: React.ReactNode): React.ReactNode {
  if (value == null || value === '') {
    return <span className="detail-value-empty">—</span>;
  }
  if (typeof value === 'string' && (value.trim() === '' || value === '-' || value === '—')) {
    return <span className="detail-value-empty">—</span>;
  }
  return value;
}

function mapDetailItemSpan(span: number | undefined): number {
  const s = span ?? 1;
  return s >= 2 ? 2 : 1;
}

const DetailCard: React.FC<DetailCardProps> = ({ title, items }) => {
  const descItemsRaw: NonNullable<DescriptionsProps['items']> = items.map((item, idx) => ({
    key: `${item.label}-${idx}`,
    label: item.label,
    children: renderDetailFieldValue(item.value),
    span: mapDetailItemSpan(item.span),
  }));
  const descItems = padDescriptionsItemsForFullWidthRow(descItemsRaw, 2);

  return (
    <div className="detail-section">
      <div className="detail-section-title">{title}</div>
      <div className="detail-section-content">
        <Descriptions bordered column={2} size="small" items={descItems} />
      </div>
    </div>
  );
};

const getNodeTypeName = (type: string) => {
  const typeMap: Record<string, string> = {
    '1': '检查井',
    '2': '雨水口',
    '3': '交汇井',
    '4': '阀门井',
    '5': '溢流井',
  };
  return typeMap[type] || '未知';
};

const StatusTag = ({ status }: { status: string }) => {
  const config: Record<string, { color: string; text: string }> = {
    '1': { color: 'success', text: '正常' },
    '2': { color: 'warning', text: '检修' },
    '3': { color: 'error', text: '故障' },
    '4': { color: 'default', text: '在建' },
    normal: { color: 'success', text: '正常' },
    warning: { color: 'warning', text: '预警' },
    error: { color: 'error', text: '超标' },
    达标: { color: 'success', text: '达标' },
    超标: { color: 'error', text: '超标' },
  };
  const cfg = config[status] || { color: 'default', text: status };
  return <Badge status={cfg.color as 'success' | 'processing' | 'default' | 'error' | 'warning'} text={cfg.text} />;
};

export function PipeNodeDetailReadonlyContent({
  record,
  /** 综合态势等场景：详情仅表格字段，不渲染管点嵌入地图 */
  showLocationMap = true,
}: {
  record: PipeNodeDemoRow;
  showLocationMap?: boolean;
}) {
  const basicInfoItems: DetailTableItem[] = [
    { label: '管点标识码', value: record.nodeId },
    { label: '排水系统标识码', value: record.systemId },
    { label: '管点类型', value: getNodeTypeName(record.nodeType) },
    { label: '坐标X', value: record.x?.toFixed(3) },
    { label: '坐标Y', value: record.y?.toFixed(3) },
    { label: '所在道路', value: record.roadName },
    { label: '地面高程', value: record.surfaceElev ? `${record.surfaceElev} m` : undefined },
    { label: '设施状态', value: <StatusTag status={record.status} /> },
    { label: '权属单位', value: record.ownership },
    { label: '养护单位', value: record.maintainCompany },
    { label: '数据来源', value: record.dataSource },
    { label: '填报单位', value: record.reportUnit },
    { label: '填报日期', value: record.reportDate },
  ];

  const manholeItems: DetailTableItem[] =
    record.nodeType === '1'
      ? [
          { label: '检查井类别', value: record.manholeCategory },
          {
            label: '检查井类型',
            value:
              record.manholeType === '1' ? '检查井' : record.manholeType === '2' ? '跌水井' : record.manholeType === '3' ? '水封井' : '闸阀井',
          },
          { label: '检查井形式', value: record.manholeStyle === '1' ? '圆形' : '矩形' },
          { label: '检查井井深', value: record.depth ? `${record.depth} m` : undefined },
          { label: '井盖材质', value: record.covMaterial === '1' ? '铸铁' : '钢纤维混凝土' },
          { label: '井盖形状', value: record.covShape === '1' ? '圆形' : '方形' },
          { label: '井盖尺寸', value: record.covDimen },
        ]
      : [];

  const combItems: DetailTableItem[] =
    record.nodeType === '2'
      ? [
          { label: '雨水口形式', value: record.combType === '1' ? '平箅' : record.combType === '2' ? '立箅' : '联合' },
          { label: '雨水口形状', value: record.combShape === '1' ? '圆形' : record.combShape === '2' ? '矩形' : '椭圆形' },
          { label: '雨水口尺寸', value: record.combDimen },
          { label: '雨水箅材质', value: record.graMaterial },
          { label: '雨水箅间距', value: record.graSpacing ? `${record.graSpacing} 毫米` : undefined },
          { label: '最大深度', value: record.maxDepth ? `${record.maxDepth} 米` : undefined },
          { label: '设计能力', value: record.designSluiCapa ? `${record.designSluiCapa} 升每秒` : undefined },
          { label: '垃圾拦截装置', value: record.antiTrash === '1' ? '有' : '无' },
          { label: '防臭装置', value: record.antiOdor === '1' ? '有' : '无' },
        ]
      : [];

  return (
    <div style={{ marginTop: 8 }}>
      <DetailCard title="管点基础信息" items={basicInfoItems} />
      {manholeItems.length > 0 && <DetailCard title="检查井扩展信息" items={manholeItems} />}
      {combItems.length > 0 && <DetailCard title="雨水口扩展信息" items={combItems} />}
      {showLocationMap ? (
        <>
          <Title level={5} style={{ marginTop: 16 }}>
            管点位置地图
          </Title>
          <div className="facility-river-detail-map-wrap">
            <AddrWgs84DetailMap
              title={record.nodeId}
              location={record.roadName}
              lng={record.x}
              lat={record.y}
              mapAriaLabel="排水管点位置地图"
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

/** 与设施管理列表「详情」弹窗标题规则一致 */
export function pipeNodeDetailModalTitle(record: PipeNodeDemoRow): string {
  return `${getNodeTypeName(record.nodeType)}详情 - ${record.nodeId}`;
}
