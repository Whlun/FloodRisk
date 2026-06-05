/**
 * 排水管线只读详情（多 Tab：基本信息 / 起点 / 终点 + 双端地图）
 * 与 `index.tsx` 中原 `PipeLineDetailContent` 结构一致，供综合态势与设施管理共用
 */
import React from 'react';
import { Alert, Badge, Descriptions, Typography } from 'antd';
import type { TabsProps } from 'antd';
import { DetailTabsIfMultiple } from '../shared/detailTabsIfMultiple';
import { RiverSourceMouthWgs84DetailMap } from '../shared/riverSourceMouthWgs84Map';
import { getPipeNodeById, type PipeLineDemoRow } from './pipe-network-demo-data';

const { Title } = Typography;

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

export function PipeLineDetailReadonlyContent({
  record,
  /** 综合态势等场景：详情仅表格字段，不渲染起点终点嵌入地图 */
  showLocationMap = true,
}: {
  record: PipeLineDemoRow;
  showLocationMap?: boolean;
}) {
  const fromNode = getPipeNodeById(record.fromNodeId);
  const toNode = getPipeNodeById(record.toNodeId);

  const BasicInfoTab = () => (
    <>
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="管线标识码">{record.lineId}</Descriptions.Item>
        <Descriptions.Item label="排水系统标识码">{record.systemId}</Descriptions.Item>
        <Descriptions.Item label="管线类别">
          {record.lineCategory === '1' ? '雨水' : record.lineCategory === '2' ? '污水' : record.lineCategory === '3' ? '合流' : '其他'}
        </Descriptions.Item>
        <Descriptions.Item label="管线类型">
          {record.lineType === '1' ? '主管' : record.lineType === '2' ? '支管' : '接户管'}
        </Descriptions.Item>
        <Descriptions.Item label="材质">{record.material}</Descriptions.Item>
        <Descriptions.Item label="管径">{record.diameter} 毫米</Descriptions.Item>
        <Descriptions.Item label="管长">{record.lineLength} m</Descriptions.Item>
        <Descriptions.Item label="起点埋深">{record.startDepth} m</Descriptions.Item>
        <Descriptions.Item label="终点埋深">{record.endDepth} m</Descriptions.Item>
        <Descriptions.Item label="起点高程">{record.startElev} m</Descriptions.Item>
        <Descriptions.Item label="终点高程">{record.endElev} m</Descriptions.Item>
        <Descriptions.Item label="断面形式">
          {record.section === '1' ? '圆形' : record.section === '2' ? '矩形' : '梯形'}
        </Descriptions.Item>
        <Descriptions.Item label="断面尺寸">{record.sectionSize}</Descriptions.Item>
        <Descriptions.Item label="敷设方式">
          {record.lineMode === '1' ? '直埋' : record.lineMode === '2' ? '顶管' : '盾构'}
        </Descriptions.Item>
        <Descriptions.Item label="敷设日期">{record.buildDate}</Descriptions.Item>
        <Descriptions.Item label="使用年限">{record.useLife} 年</Descriptions.Item>
        <Descriptions.Item label="管线状态">
          <StatusTag status={record.status} />
        </Descriptions.Item>
        <Descriptions.Item label="权属单位">{record.ownership}</Descriptions.Item>
        <Descriptions.Item label="养护单位">{record.maintainCompany}</Descriptions.Item>
        <Descriptions.Item label="数据来源">{record.dataSource}</Descriptions.Item>
        <Descriptions.Item label="记录建立日期">{record.createTime}</Descriptions.Item>
        <Descriptions.Item label="最后修改日期">{record.updateTime}</Descriptions.Item>
      </Descriptions>
      {showLocationMap ? (
        fromNode && toNode ? (
          <>
            <Title level={5} style={{ marginTop: 16 }}>
              起点与终点位置地图
            </Title>
            <div className="facility-river-detail-map-wrap">
              <RiverSourceMouthWgs84DetailMap
                title={record.lineId}
                sourLng={fromNode.x}
                sourLat={fromNode.y}
                mouLng={toNode.x}
                mouLat={toNode.y}
                mapAriaLabel="排水管线起点与终点位置地图"
                firstMarkerShortLabel="起点"
                secondMarkerShortLabel="终点"
              />
            </div>
          </>
        ) : (
          <Alert style={{ marginTop: 12 }} type="warning" showIcon message="起点或终点管点在台账中未找到，无法展示位置地图。" />
        )
      ) : null}
    </>
  );

  const FromNodeTab = () =>
    fromNode ? (
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="管点标识码">{fromNode.nodeId}</Descriptions.Item>
        <Descriptions.Item label="管点类型">{getNodeTypeName(fromNode.nodeType)}</Descriptions.Item>
        <Descriptions.Item label="坐标X">{fromNode.x.toFixed(3)}</Descriptions.Item>
        <Descriptions.Item label="坐标Y">{fromNode.y.toFixed(3)}</Descriptions.Item>
        <Descriptions.Item label="地面高程">{fromNode.surfaceElev} m</Descriptions.Item>
        <Descriptions.Item label="所在道路">{fromNode.roadName}</Descriptions.Item>
        <Descriptions.Item label="设施状态">
          <StatusTag status={fromNode.status} />
        </Descriptions.Item>
        {fromNode.nodeType === '1' && (
          <>
            <Descriptions.Item label="检查井井深">{fromNode.depth} m</Descriptions.Item>
            <Descriptions.Item label="井盖材质">{fromNode.covMaterial === '1' ? '铸铁' : '钢纤维混凝土'}</Descriptions.Item>
            <Descriptions.Item label="井盖尺寸">{fromNode.covDimen}</Descriptions.Item>
          </>
        )}
      </Descriptions>
    ) : (
      <Alert message="起点管点信息未找到" type="warning" />
    );

  const ToNodeTab = () =>
    toNode ? (
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="管点标识码">{toNode.nodeId}</Descriptions.Item>
        <Descriptions.Item label="管点类型">{getNodeTypeName(toNode.nodeType)}</Descriptions.Item>
        <Descriptions.Item label="坐标X">{toNode.x.toFixed(3)}</Descriptions.Item>
        <Descriptions.Item label="坐标Y">{toNode.y.toFixed(3)}</Descriptions.Item>
        <Descriptions.Item label="地面高程">{toNode.surfaceElev} m</Descriptions.Item>
        <Descriptions.Item label="所在道路">{toNode.roadName}</Descriptions.Item>
        <Descriptions.Item label="设施状态">
          <StatusTag status={toNode.status} />
        </Descriptions.Item>
        {toNode.nodeType === '1' && (
          <>
            <Descriptions.Item label="检查井井深">{toNode.depth} m</Descriptions.Item>
            <Descriptions.Item label="井盖材质">{toNode.covMaterial === '1' ? '铸铁' : '钢纤维混凝土'}</Descriptions.Item>
            <Descriptions.Item label="井盖尺寸">{toNode.covDimen}</Descriptions.Item>
          </>
        )}
      </Descriptions>
    ) : (
      <Alert message="终点管点信息未找到" type="warning" />
    );

  const tabItems: NonNullable<TabsProps['items']> = [
    { key: 'basic', label: '基本信息', children: <BasicInfoTab /> },
    { key: 'from', label: `起点信息 (${record.fromNodeId})`, children: <FromNodeTab /> },
    { key: 'to', label: `终点信息 (${record.toNodeId})`, children: <ToNodeTab /> },
  ];

  return (
    <DetailTabsIfMultiple
      className="facility-detail-tabs facility-mgmt-detail-tabs"
      size="small"
      style={{ marginTop: 8 }}
      defaultActiveKey="basic"
      items={tabItems}
    />
  );
}
