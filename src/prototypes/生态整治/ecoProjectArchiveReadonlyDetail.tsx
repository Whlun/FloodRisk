/**
 * 项目档案详情（两 Tab）· 与「生态整治 · 项目档案」`项目详情` 只读弹窗 1:1
 */
import React from 'react';
import { Card, Descriptions, Tag } from 'antd';
import { PaperClipOutlined } from '@ant-design/icons';
import { DetailTabsIfMultiple } from '../shared/detailTabsIfMultiple';
import { EmergencyEventDetailMap } from '../应急协同/emergencyEventDetailMap';
import { formatShaoshanAdminDivisionDisplay } from './riverChiefDb4401';
import { EcoProjectReadonlyDocumentList } from './ecoProjectReadonlyDocumentList';
import type { EcoProjectArchiveRow } from './eco-project-archive-demo';

export type EcoProjectArchiveReadonlyDetailProps = {
  viewRecord: EcoProjectArchiveRow;
  showLocationMiniMap?: boolean;
};

export function EcoProjectArchiveReadonlyDetail({
  viewRecord,
  showLocationMiniMap = true,
}: EcoProjectArchiveReadonlyDetailProps) {
  return (
    <DetailTabsIfMultiple
      key={viewRecord.key}
      style={{ marginTop: 8 }}
      defaultActiveKey="basic"
      items={[
        {
          key: 'basic',
          label: '基本信息',
          children: (
            <Descriptions column={2} bordered style={{ marginTop: 16 }}>
              <Descriptions.Item label="项目名称" span={2}>
                {viewRecord.name}
              </Descriptions.Item>
              <Descriptions.Item label="项目编号" span={2}>
                {viewRecord.code}
              </Descriptions.Item>
              <Descriptions.Item label="项目类型">{viewRecord.type}</Descriptions.Item>
              <Descriptions.Item label="所属区划">
                {formatShaoshanAdminDivisionDisplay(viewRecord.adminDivision)}
              </Descriptions.Item>
              <Descriptions.Item label="建设地点" span={2}>
                {viewRecord.location}
              </Descriptions.Item>
              <Descriptions.Item label="经度（度）">{viewRecord.longitude?.trim() ? viewRecord.longitude : '—'}</Descriptions.Item>
              <Descriptions.Item label="纬度（度）">{viewRecord.latitude?.trim() ? viewRecord.latitude : '—'}</Descriptions.Item>
              {showLocationMiniMap ? (
                <Descriptions.Item label="建设地点地图" span={2}>
                  <EmergencyEventDetailMap
                    longitude={String(viewRecord.longitude ?? '').trim()}
                    latitude={String(viewRecord.latitude ?? '').trim()}
                    eventTitle={viewRecord.name}
                    location={viewRecord.location}
                  />
                </Descriptions.Item>
              ) : null}
              <Descriptions.Item label="规划工期（起）">{viewRecord.startDate || '—'}</Descriptions.Item>
              <Descriptions.Item label="规划工期（止）">{viewRecord.endDate || '—'}</Descriptions.Item>
              <Descriptions.Item label="投资金额">{viewRecord.investment} 万元</Descriptions.Item>
              <Descriptions.Item label="项目状态">
                <Tag
                  color={
                    viewRecord.status === '已完工' ? 'success' : viewRecord.status === '施工中' ? 'processing' : 'warning'
                  }
                >
                  {viewRecord.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="完成进度">{viewRecord.progress}%</Descriptions.Item>
              <Descriptions.Item label="责任单位">{viewRecord.unit}</Descriptions.Item>
              <Descriptions.Item label="施工单位">{viewRecord.contractor || '—'}</Descriptions.Item>
              <Descriptions.Item label="监理单位">{viewRecord.supervisor || '—'}</Descriptions.Item>
              <Descriptions.Item label="项目目标" span={2}>
                {viewRecord.projectGoal || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="项目描述 / 建设内容" span={2}>
                {viewRecord.description || '暂无'}
              </Descriptions.Item>
            </Descriptions>
          ),
        },
        {
          key: 'documents',
          label: (
            <span>
              <PaperClipOutlined /> 项目资料 ({viewRecord.documents?.length || 0})
            </span>
          ),
          children: (
            <Card size="small" style={{ marginTop: 16 }}>
              <EcoProjectReadonlyDocumentList documents={viewRecord.documents || []} />
            </Card>
          ),
        },
      ]}
    />
  );
}
