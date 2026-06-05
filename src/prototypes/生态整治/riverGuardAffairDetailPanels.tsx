/**
 * 河湖管护事务详情 · 两 Tab 与「生态整治 · 事务列表」只读弹窗 1:1 同源，综合态势 `zhtMaplibreBoard` 直接复用。
 */
import React from 'react';
import { Descriptions, Image, Space, Tag, Typography } from 'antd';
import { DetailTabsIfMultiple } from '../shared/detailTabsIfMultiple';
import { EmergencyEventDetailMap } from '../应急协同/emergencyEventDetailMap';
import { getShaoshanAddvcdLabel, type RiverGuardAffairRow } from './riverChiefDb4401';

const { Text } = Typography;

/** 与事务列表表头 Tag、详情 Tag 一致（综合态势禁止单独维护色值表） */
export const AFFAIR_SEVERITY_COLOR: Record<string, string> = { 一般: 'blue', 较重: 'orange', 紧急: 'red' };
export const AFFAIR_HANDLE_STATUS_COLOR: Record<string, string> = {
  待分派: 'default',
  处置中: 'processing',
  待验收: 'warning',
  已办结: 'success',
  已退回: 'error',
};

export type RiverGuardAffairDetailPanelsProps = {
  detail: RiverGuardAffairRow;
  /** 默认展示 Tab；「填报信息」入口传 disposal */
  initialTab?: 'basic' | 'disposal';
  showLocationMiniMap?: boolean;
};

export function RiverGuardAffairDetailPanels({
  detail,
  initialTab = 'basic',
  showLocationMiniMap = true,
}: RiverGuardAffairDetailPanelsProps) {
  return (
    <DetailTabsIfMultiple
      key={`${detail.key}-${initialTab}`}
      size="small"
      defaultActiveKey={initialTab}
      className="facility-detail-tabs facility-affair-detail-tabs"
      items={[
        {
          key: 'basic',
          label: '基本信息',
          children: (
            <>
              <Descriptions
                bordered
                column={2}
                size="small"
                style={{ marginTop: 8 }}
              >
                <Descriptions.Item label="事务编号" span={2}>
                  <Text strong>{detail.affairCode}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="事务名称" span={2}>
                  {detail.affairTitle}
                </Descriptions.Item>
                <Descriptions.Item label="关联责任段" span={2}>
                  {detail.sectionId || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="所属区划" span={2}>
                  {detail.addvcd ? getShaoshanAddvcdLabel(detail.addvcd) : detail.regionName || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="问题类型">{detail.problemType}</Descriptions.Item>
                <Descriptions.Item label="信息来源">{detail.infoSource}</Descriptions.Item>
                <Descriptions.Item label="严重程度">
                  <Tag color={AFFAIR_SEVERITY_COLOR[detail.severity]}>{detail.severity}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="责任主体" span={2}>
                  {detail.responsibleOrg}
                </Descriptions.Item>
                <Descriptions.Item label="责任人">{detail.leaderName}</Descriptions.Item>
                <Descriptions.Item label="要求完成时间">{detail.deadline || '—'}</Descriptions.Item>
                <Descriptions.Item label="位置描述" span={2}>
                  {detail.location}
                </Descriptions.Item>
                <Descriptions.Item label="经度（度）">{detail.longitude || '—'}</Descriptions.Item>
                <Descriptions.Item label="纬度（度）">{detail.latitude || '—'}</Descriptions.Item>
                {showLocationMiniMap ? (
                  <Descriptions.Item label="事务位置地图" span={2}>
                    <EmergencyEventDetailMap
                      longitude={detail.longitude}
                      latitude={detail.latitude}
                      eventTitle={detail.affairTitle}
                      location={detail.location}
                    />
                  </Descriptions.Item>
                ) : null}
                <Descriptions.Item label="上报人">{detail.reporterName}</Descriptions.Item>
                <Descriptions.Item label="联系电话">{detail.reporterPhone}</Descriptions.Item>
                <Descriptions.Item label="发现时间">{detail.discoverTime}</Descriptions.Item>
                <Descriptions.Item label="上报时间">{detail.reportTime}</Descriptions.Item>
                <Descriptions.Item label="问题描述" span={2}>
                  {detail.problemDescribe || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="影响范围" span={2}>
                  {detail.impactScope}
                </Descriptions.Item>
                <Descriptions.Item label="现场照片" span={2}>
                  {detail.scenePhotos && detail.scenePhotos.length > 0 ? (
                    <Image.PreviewGroup>
                      <Space wrap size={4}>
                        {detail.scenePhotos.map((url, i) => (
                          <Image
                            key={i}
                            src={url}
                            width={48}
                            height={48}
                            style={{ objectFit: 'cover' }}
                            alt={`现场照片${i + 1}`}
                          />
                        ))}
                      </Space>
                    </Image.PreviewGroup>
                  ) : (
                    '—'
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="现场视频" span={2}>
                  {detail.sceneVideos && detail.sceneVideos.filter(Boolean).length > 0 ? (
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                      {detail.sceneVideos.filter(Boolean).map((url, i) => (
                        <video
                          key={`${url.slice(0, 48)}-${i}`}
                          src={url}
                          controls
                          playsInline
                          style={{ width: '100%', maxWidth: 480, maxHeight: 280, background: '#000' }}
                        >
                          您的浏览器不支持视频播放
                        </video>
                      ))}
                    </Space>
                  ) : (
                    '—'
                  )}
                </Descriptions.Item>
              </Descriptions>
            </>
          ),
        },
        {
          key: 'disposal',
          label: '事务处置',
          children: (
            <Descriptions bordered column={2} size="small" style={{ marginTop: 8 }}>
              <Descriptions.Item label="处理状态">
                <Tag color={AFFAIR_HANDLE_STATUS_COLOR[detail.handleStatus]}>{detail.handleStatus}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="是否先行处置">{detail.preemptDisposal}</Descriptions.Item>
              <Descriptions.Item label="处置负责人">{detail.disposal?.disposalLeader || '—'}</Descriptions.Item>
              <Descriptions.Item label="处置联络电话">{detail.disposal?.contactPhone || '—'}</Descriptions.Item>
              <Descriptions.Item label="处置完成时间">{detail.disposal?.completedTime || '—'}</Descriptions.Item>
              <Descriptions.Item label="处理措施" span={2}>
                {detail.measuresTaken}
              </Descriptions.Item>
              <Descriptions.Item label="处理过程" span={2}>
                {detail.handlingProcess || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="联动部门/单位" span={2}>
                {detail.coordParties}
              </Descriptions.Item>
              <Descriptions.Item label="处理结果" span={2}>
                {detail.disposalResult || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="反馈意见" span={2}>
                {detail.feedbackComment || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="处置现场图" span={2}>
                {detail.disposal?.images && detail.disposal.images.length > 0 ? (
                  <Image.PreviewGroup>
                    <Space wrap size={4}>
                      {detail.disposal.images.map((url, i) => (
                        <Image
                          key={i}
                          src={url}
                          width={48}
                          height={48}
                          style={{ objectFit: 'cover' }}
                          alt={`现场图${i + 1}`}
                        />
                      ))}
                    </Space>
                  </Image.PreviewGroup>
                ) : (
                  '—'
                )}
              </Descriptions.Item>
            </Descriptions>
          ),
        },
      ]}
    />
  );
}
