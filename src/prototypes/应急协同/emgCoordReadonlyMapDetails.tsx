/**
 * 风险识库 · 企业/社会物资点/应急队伍 — 与 `riskIdentification` 中「详情」弹窗同结构的只读体（供综合态势地图等复用）
 */
import React, { useMemo } from 'react';
import { Card, Descriptions, Table, Tabs, Tag, Typography } from 'antd';
import { AddrWgs84DetailMap } from '../shared/addrWgs84MapFormBridge';
import {
  getEmergencySupplyReadonlyTableColumns,
  getEcoTableScrollX,
  initialRiskData,
  type EmergencySupplyRow,
  type EmergencyTeamRow,
  type SocialSupplyPointRow,
} from './riskIdentification';

const { Text } = Typography;

const riskLevelColor: Record<string, string> = {
  高: 'red',
  较大: 'magenta',
  中: 'orange',
  低: 'blue',
  一般: 'default',
};

type EntProps = { id: string; showLocationMiniMap?: boolean };

export function EmgEnterpriseReadonlyMapDetailContent({ id, showLocationMiniMap = true }: EntProps) {
  const detail = initialRiskData.enterprises.find(e => e.id === id) ?? null;
  if (!detail) return <div className="detail-section">未找到与 id 对应的风险源企业</div>;
  return (
    <Descriptions bordered column={2} size="small" style={{ marginTop: 8 }}>
      <Descriptions.Item label="企业名称" span={2}>
        <Text strong>{detail.enterpriseName}</Text>
      </Descriptions.Item>
      <Descriptions.Item label="所属区划">{detail.region}</Descriptions.Item>
      <Descriptions.Item label="更新日期">{detail.updatedAt}</Descriptions.Item>
      <Descriptions.Item label="地理位置" span={2}>
        {detail.address}
      </Descriptions.Item>
      {detail.longitude && detail.latitude ? (
        <>
          <Descriptions.Item label="经度（度）">{detail.longitude}</Descriptions.Item>
          <Descriptions.Item label="纬度（度）">{detail.latitude}</Descriptions.Item>
        </>
      ) : (
        <>
          <Descriptions.Item label="经度（度）">—</Descriptions.Item>
          <Descriptions.Item label="纬度（度）">—</Descriptions.Item>
        </>
      )}
      {showLocationMiniMap ? (
        <Descriptions.Item label="企业位置地图" span={2}>
          <AddrWgs84DetailMap
            title={detail.enterpriseName}
            location={detail.address}
            lng={detail.longitude}
            lat={detail.latitude}
            mapAriaLabel="风险源企业位置地图"
          />
        </Descriptions.Item>
      ) : null}
      <Descriptions.Item label="行业类型">{detail.industryType}</Descriptions.Item>
      <Descriptions.Item label="风险等级">
        <Tag color={riskLevelColor[detail.riskLevel] ?? 'default'}>{detail.riskLevel}</Tag>
      </Descriptions.Item>
      <Descriptions.Item label="主要污染物" span={2}>
        {detail.mainPollutants}
      </Descriptions.Item>
      <Descriptions.Item label="排放规模" span={2}>
        {detail.dischargeScale}
      </Descriptions.Item>
      <Descriptions.Item label="应急联系人">{detail.contactName}</Descriptions.Item>
      <Descriptions.Item label="联系方式">{detail.contactPhone}</Descriptions.Item>
    </Descriptions>
  );
}

type SpProps = { id: string; showLocationMiniMap?: boolean };

export function EmgSocialSupplyPointReadonlyMapDetailContent({ id, showLocationMiniMap = true }: SpProps) {
  const detail: SocialSupplyPointRow | null = initialRiskData.socialPoints.find(s => s.id === id) ?? null;
  const supplies = initialRiskData.supplies;
  const rows = initialRiskData.socialPoints;

  const linkedForDetail = useMemo(
    () => (detail ? supplies.filter(s => s.socialPointId === detail.id) : []),
    [detail, supplies],
  );

  const columns = useMemo(
    () => getEmergencySupplyReadonlyTableColumns(pid => rows.find(s => s.id === pid)?.name ?? pid),
    [rows],
  );
  const scrollX = useMemo(
    () => getEcoTableScrollX(columns.map(c => ({ width: typeof c.width === 'number' ? c.width : 120 }))),
    [columns],
  );

  if (!detail) return <div className="detail-section">未找到与 id 对应的社会物资点</div>;

  return (
    <Tabs
      size="small"
      className="facility-detail-tabs facility-event-edit-tabs"
      items={[
        {
          key: 'base',
          label: '基础信息',
          children: (
            <Descriptions bordered column={2} size="small" style={{ marginTop: 8 }}>
              <Descriptions.Item label="物资点名称" span={2}>
                <Text strong>{detail.name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="所属区划" span={2}>
                {detail.region || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="所属单位">{detail.affiliatedUnit?.trim() || '—'}</Descriptions.Item>
              <Descriptions.Item label="存储性质">{detail.storageNature?.trim() || '—'}</Descriptions.Item>
              <Descriptions.Item label="位置" span={2}>
                {detail.address}
              </Descriptions.Item>
              {detail.longitude && detail.latitude ? (
                <>
                  <Descriptions.Item label="经度（度）">{detail.longitude}</Descriptions.Item>
                  <Descriptions.Item label="纬度（度）">{detail.latitude}</Descriptions.Item>
                </>
              ) : (
                <>
                  <Descriptions.Item label="经度（度）">—</Descriptions.Item>
                  <Descriptions.Item label="纬度（度）">—</Descriptions.Item>
                </>
              )}
              {showLocationMiniMap ? (
                <Descriptions.Item label="物资点位置地图" span={2}>
                  <AddrWgs84DetailMap
                    title={detail.name}
                    location={detail.address}
                    lng={detail.longitude}
                    lat={detail.latitude}
                    mapAriaLabel="社会物资点位置地图"
                  />
                </Descriptions.Item>
              ) : null}
              <Descriptions.Item label="可提供物资类型及数量" span={2}>
                {detail.materialTypesQty}
              </Descriptions.Item>
              <Descriptions.Item label="联络方式">{detail.contactPhone}</Descriptions.Item>
              <Descriptions.Item label="调用流程" span={2}>
                {detail.callProcess}
              </Descriptions.Item>
              <Descriptions.Item label="备注" span={2} style={{ whiteSpace: 'pre-wrap' }}>
                {detail.remark?.trim() || '—'}
              </Descriptions.Item>
            </Descriptions>
          ),
        },
        {
          key: 'supplies',
          label: `关联应急物资（${linkedForDetail.length}）`,
          children: (
            <div className="facility-table-wrap" style={{ marginTop: 8 }}>
              <Table
                rowKey="id"
                size="small"
                scroll={{ x: scrollX }}
                pagination={linkedForDetail.length > 10 ? { defaultPageSize: 10, showTotal: t => `共 ${t} 条` } : false}
                dataSource={linkedForDetail}
                columns={columns}
              />
            </div>
          ),
        },
      ]}
    />
  );
}

type TeamProps = { id: string; showLocationMiniMap?: boolean };

export function EmgTeamReadonlyMapDetailContent({ id, showLocationMiniMap = true }: TeamProps) {
  const detail: EmergencyTeamRow | null = initialRiskData.teams.find(t => t.id === id) ?? null;
  if (!detail) return <div className="detail-section">未找到与 id 对应的应急队伍</div>;
  return (
    <>
      <Descriptions
        bordered
        column={2}
        size="small"
        className="zht-emg-team-detail-desc"
        style={{ marginTop: 8, marginBottom: 16 }}
      >
        <Descriptions.Item label="队伍名称" span={2}>
          <Text strong>{detail.name}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="所属区划">{detail.region || '—'}</Descriptions.Item>
        <Descriptions.Item label="队伍人数">{detail.members.length} 人</Descriptions.Item>
        <Descriptions.Item label="主管部门" span={2}>
          {detail.competentDept?.trim() || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="值班电话">{detail.dutyPhone?.trim() || '—'}</Descriptions.Item>
        <Descriptions.Item label="联络方式">{detail.contactPhone}</Descriptions.Item>
        <Descriptions.Item label="专业技能" span={2}>
          {detail.specialty}
        </Descriptions.Item>
        <Descriptions.Item label="专长描述" span={2} style={{ whiteSpace: 'pre-wrap' }}>
          {detail.expertiseDescription?.trim() || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="装备配置" span={2}>
          {detail.equipment}
        </Descriptions.Item>
        <Descriptions.Item label="队伍负责人" span={2}>
          {detail.leaderName || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="职责分工" span={2}>
          {detail.dutyDivision}
        </Descriptions.Item>
        <Descriptions.Item label="队伍地址" span={2}>
          {detail.teamAddress?.trim() || '—'}
        </Descriptions.Item>
        {detail.longitude && detail.latitude ? (
          <>
            <Descriptions.Item label="经度（度）">{detail.longitude}</Descriptions.Item>
            <Descriptions.Item label="纬度（度）">{detail.latitude}</Descriptions.Item>
          </>
        ) : (
          <>
            <Descriptions.Item label="经度（度）">—</Descriptions.Item>
            <Descriptions.Item label="纬度（度）">—</Descriptions.Item>
          </>
        )}
        {showLocationMiniMap ? (
          <Descriptions.Item label="队伍位置地图" span={2}>
            <AddrWgs84DetailMap
              title={detail.name}
              location={detail.teamAddress}
              lng={detail.longitude}
              lat={detail.latitude}
              mapAriaLabel="应急队伍位置地图"
            />
          </Descriptions.Item>
        ) : null}
      </Descriptions>
      <Card size="small" title={`人员列表（共 ${detail.members.length} 人）`}>
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={detail.members}
          columns={[
            { title: '姓名', dataIndex: 'name' },
            { title: '岗位/角色', dataIndex: 'role' },
            { title: '联系电话', dataIndex: 'phone' },
            { title: '专业技能', dataIndex: 'skill' },
          ]}
        />
      </Card>
    </>
  );
}

/** 应急专家 · 与风险识库台账字段一致（供综合态势指标抽屉整卡打开详情） */
export function EmgExpertReadonlyMapDetailContent({ id }: { id: string }) {
  const detail = initialRiskData.experts.find(x => x.id === id) ?? null;
  if (!detail) return <div className="detail-section">未找到与 id 对应的应急专家</div>;
  return (
    <Descriptions bordered column={2} size="small" style={{ marginTop: 8 }}>
      <Descriptions.Item label="姓名" span={2}>
        <Text strong>{detail.name}</Text>
      </Descriptions.Item>
      <Descriptions.Item label="职称 / 职务">{detail.title?.trim() || '—'}</Descriptions.Item>
      <Descriptions.Item label="联系电话">{detail.phone?.trim() || '—'}</Descriptions.Item>
      <Descriptions.Item label="所属单位" span={2}>
        {detail.org?.trim() || '—'}
      </Descriptions.Item>
      <Descriptions.Item label="专业背景" span={2} style={{ whiteSpace: 'pre-wrap' }}>
        {detail.background?.trim() || '—'}
      </Descriptions.Item>
      <Descriptions.Item label="擅长方向" span={2} style={{ whiteSpace: 'pre-wrap' }}>
        {detail.expertise?.trim() || '—'}
      </Descriptions.Item>
    </Descriptions>
  );
}

/** 应急预案单条只读 */
export function EmgEmergencyPlanReadonlyMapDetailContent({ id }: { id: string }) {
  const detail = initialRiskData.plans.find(p => p.id === id) ?? null;
  if (!detail) return <div className="detail-section">未找到与 id 对应的应急预案</div>;
  return (
    <Descriptions bordered column={2} size="small" style={{ marginTop: 8 }}>
      <Descriptions.Item label="预案名称" span={2}>
        <Text strong>{detail.name}</Text>
      </Descriptions.Item>
      <Descriptions.Item label="预案类型">{detail.planType}</Descriptions.Item>
      <Descriptions.Item label="发布时间">{detail.publishTime}</Descriptions.Item>
      <Descriptions.Item label="编制单位" span={2}>
        {detail.compileOrg}
      </Descriptions.Item>
      <Descriptions.Item label="组织体系" span={2} style={{ whiteSpace: 'pre-wrap' }}>
        {detail.orgSystem}
      </Descriptions.Item>
      <Descriptions.Item label="响应流程" span={2} style={{ whiteSpace: 'pre-wrap' }}>
        {detail.responseFlow}
      </Descriptions.Item>
      <Descriptions.Item label="主要措施" span={2} style={{ whiteSpace: 'pre-wrap' }}>
        {detail.measures}
      </Descriptions.Item>
      <Descriptions.Item label="职责分工" span={2} style={{ whiteSpace: 'pre-wrap' }}>
        {detail.dutyDivision}
      </Descriptions.Item>
      <Descriptions.Item label="附件" span={2}>
        {detail.attachmentName}
      </Descriptions.Item>
    </Descriptions>
  );
}

/** 应急物资（单条库存）只读，不含地图 */
export function EmgSupplyRowReadonlyMapDetailContent({ id }: { id: string }) {
  const detail: EmergencySupplyRow | null = initialRiskData.supplies.find(s => s.id === id) ?? null;
  if (!detail) return <div className="detail-section">未找到与 id 对应的应急物资</div>;
  const sp = initialRiskData.socialPoints.find(s => s.id === detail.socialPointId);
  return (
    <Descriptions bordered column={2} size="small" style={{ marginTop: 8 }}>
      <Descriptions.Item label="物资名称" span={2}>
        <Text strong>{detail.name}</Text>
      </Descriptions.Item>
      <Descriptions.Item label="物资类型">{detail.materialType}</Descriptions.Item>
      <Descriptions.Item label="品牌">{detail.brand}</Descriptions.Item>
      <Descriptions.Item label="规格型号" span={2}>
        {detail.specModel}
      </Descriptions.Item>
      <Descriptions.Item label="储备数量">
        {detail.quantity} {detail.quantityUnit}
      </Descriptions.Item>
      <Descriptions.Item label="单价（元）">
        {Number.isFinite(detail.unitPrice) ? detail.unitPrice.toFixed(2) : '—'}
      </Descriptions.Item>
      <Descriptions.Item label="所属单位" span={2}>
        {detail.affiliatedUnit}
      </Descriptions.Item>
      <Descriptions.Item label="管理责任人">{detail.manager}</Descriptions.Item>
      <Descriptions.Item label="管理方式">{detail.managementMode}</Descriptions.Item>
      <Descriptions.Item label="存储性质" span={2}>
        {detail.storageNature}
      </Descriptions.Item>
      <Descriptions.Item label="关联社会物资点" span={2}>
        {sp ? `${sp.name}（${sp.region}）` : detail.socialPointId}
      </Descriptions.Item>
      <Descriptions.Item label="生产厂家" span={2}>
        {detail.manufacturer}
      </Descriptions.Item>
      <Descriptions.Item label="生产日期">{detail.productionDate}</Descriptions.Item>
      <Descriptions.Item label="保质期">{detail.shelfLife}</Descriptions.Item>
      <Descriptions.Item label="补充周期" span={2}>
        {detail.replenishCycle}
      </Descriptions.Item>
      <Descriptions.Item label="使用说明" span={2} style={{ whiteSpace: 'pre-wrap' }}>
        {detail.usageNote}
      </Descriptions.Item>
    </Descriptions>
  );
}
