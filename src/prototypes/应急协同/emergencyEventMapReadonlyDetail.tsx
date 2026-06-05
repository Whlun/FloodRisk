/**
 * 应急事件详情体（多页签：基本信息 / 处置 / 事件评估 / 事件复盘）— 与 `index.tsx` 中应急事件信息列表「详情」弹窗同源
 */
import React, { useMemo, useState } from 'react';
import { Button, Descriptions, Empty, Image, Select, Space, Typography } from 'antd';
import {
  getShaoshanAddvcdLabel,
  initialLakeWaterBodyData,
  initialRiverChannelMasterData,
} from '../生态整治/riverChiefDb4401';
import { initialRiskData } from './riskIdentification';
import { EventReviewDetailBody, initialEventReviews, type EventReviewRow } from './eventReview';
import { EmergencyEventDetailMap } from './emergencyEventDetailMap';
import { initialEmergencyEvents, initialEventAssessments } from './emergencyEventInitialData';
import type { EmergencyEventRow, EventAssessmentRow } from './emergencyEventTypes';
import { DetailTabsIfMultiple } from '../shared/detailTabsIfMultiple';

const { Text } = Typography;

const RIVER_LAKE_SECTION_SELECT_OPTIONS = [
  ...initialRiverChannelMasterData.map(r => ({
    value: r.riverObjectId,
    label: `${r.riverName}（河流 · ${r.riverObjectId}）`,
  })),
  ...initialLakeWaterBodyData.map(l => ({
    value: l.lakeObjectId,
    label: `${l.lakeName}（湖泊 · ${l.lakeObjectId}）`,
  })),
];

function getRiverLakeSectionLabel(code: string): string {
  const o = RIVER_LAKE_SECTION_SELECT_OPTIONS.find(x => x.value === code);
  return o?.label ?? code;
}

export type EmergencyEventMapReadonlyDetailContentProps = {
  eventId: string;
  showLocationMiniMap?: boolean;
};

/**
 * 按 `eventId` 在演示台账与关联评估/复盘中取数，体结构与服务端主页面一致
 */
export function EmergencyEventMapReadonlyDetailContent({
  eventId,
  showLocationMiniMap = true,
}: EmergencyEventMapReadonlyDetailContentProps) {
  const detailSource = useMemo(
    () => initialEmergencyEvents.find(e => e.id === eventId) ?? null,
    [eventId],
  );

  const [detailAssessmentPickId, setDetailAssessmentPickId] = useState<string | null>(null);
  const [detailReviewPickId, setDetailReviewPickId] = useState<string | null>(null);

  const detailDisplay: EmergencyEventRow | null = detailSource;

  const detailLinkedAssessments = useMemo(
    () => (detailDisplay ? initialEventAssessments.filter(a => a.linkedEventId === detailDisplay.id) : []),
    [detailDisplay],
  );
  const detailLinkedReviews: EventReviewRow[] = useMemo(
    () => (detailDisplay ? initialEventReviews.filter(r => r.linkedEventId === detailDisplay.id) : []),
    [detailDisplay],
  );

  const selectedDetailAssessment: EventAssessmentRow | null = useMemo(() => {
    if (detailLinkedAssessments.length === 0) return null;
    if (detailAssessmentPickId) {
      return detailLinkedAssessments.find(a => a.id === detailAssessmentPickId) ?? detailLinkedAssessments[0];
    }
    return detailLinkedAssessments[0];
  }, [detailLinkedAssessments, detailAssessmentPickId]);

  const selectedDetailReview = useMemo(() => {
    if (detailLinkedReviews.length === 0) return null;
    if (detailReviewPickId) {
      return detailLinkedReviews.find(r => r.id === detailReviewPickId) ?? detailLinkedReviews[0];
    }
    return detailLinkedReviews[0];
  }, [detailLinkedReviews, detailReviewPickId]);

  const experts = initialRiskData.experts;
  const socialPoints = initialRiskData.socialPoints;

  if (!detailDisplay) {
    return <div className="detail-section">未找到与统一点位 id 对应的应急事件（`initialEmergencyEvents`）</div>;
  }

  return (
    <DetailTabsIfMultiple
      key={detailDisplay.id}
      size="small"
      defaultActiveKey="basic"
      className="facility-detail-tabs facility-event-detail-tabs"
      items={[
        {
          key: 'basic',
          label: '基本信息',
          children: (
            <>
              <Descriptions bordered column={2} size="small" title="登记与位置信息">
                <Descriptions.Item label="事件编号" span={2}>
                  <Text strong>{detailDisplay.eventCode}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="事件名称" span={2}>
                  {detailDisplay.eventTitle}
                </Descriptions.Item>
                <Descriptions.Item label="河段或湖泊编码" span={2}>
                  {getRiverLakeSectionLabel(detailDisplay.sectionCode)}
                </Descriptions.Item>
                <Descriptions.Item label="问题类型">{detailDisplay.problemType}</Descriptions.Item>
                <Descriptions.Item label="信息来源">{detailDisplay.problemSource}</Descriptions.Item>
                <Descriptions.Item label="事发时间">{detailDisplay.occurTime}</Descriptions.Item>
                <Descriptions.Item label="上报时间">{detailDisplay.reportTime}</Descriptions.Item>
                <Descriptions.Item label="上报人">{detailDisplay.reporterName}</Descriptions.Item>
                <Descriptions.Item label="上报人联系电话">{detailDisplay.reporterPhone}</Descriptions.Item>
                <Descriptions.Item label="所属区划">
                  {detailDisplay.addvcd?.trim() ? getShaoshanAddvcdLabel(detailDisplay.addvcd) : detailDisplay.region || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="事发地点" span={2}>
                  {detailDisplay.location}
                </Descriptions.Item>
                <Descriptions.Item label="事发经度（度）">{detailDisplay.longitude || '—'}</Descriptions.Item>
                <Descriptions.Item label="事发纬度（度）">{detailDisplay.latitude || '—'}</Descriptions.Item>
                {showLocationMiniMap ? (
                  <Descriptions.Item label="事发位置地图" span={2}>
                    <EmergencyEventDetailMap
                      longitude={detailDisplay.longitude}
                      latitude={detailDisplay.latitude}
                      eventTitle={detailDisplay.eventTitle}
                      location={detailDisplay.location}
                    />
                  </Descriptions.Item>
                ) : null}
                <Descriptions.Item label="情况描述" span={2}>
                  {detailDisplay.situationDescribe}
                </Descriptions.Item>
                <Descriptions.Item label="特征污染物或类型" span={2}>
                  {detailDisplay.pollutionType}
                </Descriptions.Item>
                <Descriptions.Item label="影响范围" span={2}>
                  {detailDisplay.impactScope}
                </Descriptions.Item>
                <Descriptions.Item label="事发原因" span={2}>
                  {detailDisplay.cause}
                </Descriptions.Item>
                <Descriptions.Item label="事件图片" span={2}>
                  {detailDisplay.eventImages && detailDisplay.eventImages.length > 0 ? (
                    <Image.PreviewGroup>
                      <Space wrap size={4}>
                        {detailDisplay.eventImages.map((url, i) => (
                          <Image key={i} src={url} width={48} height={48} style={{ objectFit: 'cover' }} alt={`事件图${i + 1}`} />
                        ))}
                      </Space>
                    </Image.PreviewGroup>
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
          label: '事件处置',
          children: (
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="负责处理人">{detailDisplay.inchargePerson}</Descriptions.Item>
              <Descriptions.Item label="是否自行先期处置">{detailDisplay.nativeProcessing}</Descriptions.Item>
              <Descriptions.Item label="联系电话">{detailDisplay.eventDisposal?.contactPhone || '—'}</Descriptions.Item>
              <Descriptions.Item label="处置完成时间">{detailDisplay.eventDisposal?.completedTime || '—'}</Descriptions.Item>
              <Descriptions.Item label="办结日期">{detailDisplay.endDate || '—'}</Descriptions.Item>
              <Descriptions.Item label="责任主体" span={2}>
                {detailDisplay.responsibleParty}
              </Descriptions.Item>
              <Descriptions.Item label="处置进展" span={2}>
                {detailDisplay.disposalProgress}
              </Descriptions.Item>
              <Descriptions.Item label="已采取应急措施" span={2}>
                {detailDisplay.measuresTaken}
              </Descriptions.Item>
              <Descriptions.Item label="队伍使用情况" span={2}>
                {detailDisplay.teamsUsage}
              </Descriptions.Item>
              <Descriptions.Item label="物资使用情况" span={2}>
                {detailDisplay.materialsUsage}
              </Descriptions.Item>
              <Descriptions.Item label="水质恢复状况" span={2}>
                {detailDisplay.waterRecovery}
              </Descriptions.Item>
              <Descriptions.Item label="事件结果" span={2}>
                {detailDisplay.eventResult}
              </Descriptions.Item>
              <Descriptions.Item label="处置图片" span={2}>
                {detailDisplay.eventDisposal?.images && detailDisplay.eventDisposal.images.length > 0 ? (
                  <Image.PreviewGroup>
                    <Space wrap size={4}>
                      {detailDisplay.eventDisposal.images.map((url, i) => (
                        <Image key={i} src={url} width={48} height={48} style={{ objectFit: 'cover' }} alt={`处置图${i + 1}`} />
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
        {
          key: 'assessment',
          label: '事件评估',
          children:
            detailLinkedAssessments.length === 0 ? (
              <Empty style={{ margin: '24px 0' }} description="暂无关联本事件的评估记录（请在「事件评估」菜单中维护并关联本事件）" />
            ) : (
              <div style={{ marginTop: 8 }}>
                {detailLinkedAssessments.length > 1 ? (
                  <div style={{ marginBottom: 16, maxWidth: 480 }}>
                    <Select
                      value={detailAssessmentPickId ?? selectedDetailAssessment?.id}
                      onChange={id => setDetailAssessmentPickId(id)}
                      style={{ width: '100%' }}
                      options={detailLinkedAssessments.map(a => ({
                        value: a.id,
                        label: `${a.assessmentCode}（${a.assessTime}）`,
                      }))}
                    />
                  </div>
                ) : null}
                {selectedDetailAssessment ? (
                  <Descriptions
                    key={selectedDetailAssessment.id}
                    bordered
                    column={2}
                    size="small"
                    style={{ marginTop: detailLinkedAssessments.length > 1 ? 0 : 8 }}
                    title="评估信息"
                  >
                    <Descriptions.Item label="评估编号" span={2}>
                      <Text strong>{selectedDetailAssessment.assessmentCode}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="评估日期">{selectedDetailAssessment.assessTime || '—'}</Descriptions.Item>
                    <Descriptions.Item label="评估单位">{selectedDetailAssessment.assessOrg || '—'}</Descriptions.Item>
                    <Descriptions.Item label="总体评估" span={2}>
                      {selectedDetailAssessment.overallAssessment || '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="人员损害" span={2}>
                      {selectedDetailAssessment.personnelDamage || '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="财产损害" span={2}>
                      {selectedDetailAssessment.propertyDamage || '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="污染损害评估" span={2}>
                      {selectedDetailAssessment.pollutionDamageAssessment || '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="生态环境损害评估" span={2}>
                      {selectedDetailAssessment.ecoDamageAssessment || '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="评估附件" span={2}>
                      {selectedDetailAssessment.attachmentFileName || selectedDetailAssessment.pdfUrl ? (
                        <Space wrap align="center">
                          <Text>{selectedDetailAssessment.attachmentFileName || '附件'}</Text>
                          {selectedDetailAssessment.pdfUrl ? (
                            <>
                              <Button
                                type="link"
                                className="action-btn detail"
                                href={selectedDetailAssessment.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                查看
                              </Button>
                              <Button
                                type="link"
                                className="action-btn detail"
                                href={selectedDetailAssessment.pdfUrl}
                                download={selectedDetailAssessment.attachmentFileName || '评估附件'}
                              >
                                下载
                              </Button>
                            </>
                          ) : null}
                        </Space>
                      ) : (
                        '—'
                      )}
                    </Descriptions.Item>
                  </Descriptions>
                ) : null}
              </div>
            ),
        },
        {
          key: 'review',
          label: '事件复盘',
          children:
            detailLinkedReviews.length === 0 ? (
              <Empty style={{ margin: '24px 0' }} description="暂无关联本事件的事件复盘（请在「事件复盘」菜单中登记并关联本事件）" />
            ) : (
              <div style={{ marginTop: 8 }}>
                {detailLinkedReviews.length > 1 ? (
                  <div style={{ marginBottom: 16, maxWidth: 480 }}>
                    <Select
                      value={detailReviewPickId ?? selectedDetailReview?.id}
                      onChange={id => setDetailReviewPickId(id)}
                      style={{ width: '100%' }}
                      options={detailLinkedReviews.map(r => ({
                        value: r.id,
                        label: `${r.reviewCode}（${r.reviewTime}）`,
                      }))}
                    />
                  </div>
                ) : null}
                {selectedDetailReview && detailDisplay ? (
                  <EventReviewDetailBody
                    key={selectedDetailReview.id}
                    detail={selectedDetailReview}
                    linkedEvent={detailDisplay}
                    linkedAssessment={initialEventAssessments.find(a => a.id === selectedDetailReview.linkedAssessmentId)}
                    experts={experts}
                    socialPoints={socialPoints}
                  />
                ) : null}
              </div>
            ),
        },
      ]}
    />
  );
}
