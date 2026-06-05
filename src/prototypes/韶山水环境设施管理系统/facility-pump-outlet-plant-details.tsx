/**
 * 泵站 / 排口 / 污水厂详情内容（与设施管理 `index.tsx` 内原实现一致，供列表与综合态势地图等共用）
 */
import React, { useMemo } from 'react';
import { Badge, Button, Card, Descriptions, Empty, Table } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import type { DescriptionsProps } from 'antd';
import { DetailTabsIfMultiple } from '../shared/detailTabsIfMultiple';
import {
  PumpStationMonitoringTabContent,
  OutletMonitoringTabContent,
  PlantMonitoringTabContent,
} from './pipe-node-monitoring';
import {
  PumpStationVideoTabContent,
  OutletVideoTabContent,
  PlantVideoTabContent,
} from './facility-video-monitoring';
import { formatReceiveWaterObjectIdDisplay, getShaoshanAddvcdLabel } from '../生态整治/riverChiefDb4401';
import {
  formatOutletApprovalReg,
  formatOutletBasinSea,
  formatOutletDischargeMode,
  formatOutletDrinkingSourceZone,
  formatOutletGateForm,
  formatOutletInflowChannel,
  formatOutletLevel1,
  formatOutletLevel2,
  formatOutletEmissionState,
  formatOutletKeyOutfall,
  formatLinkedOutletCodeDisplay,
  formatPumpBasCodeDisplay,
  createDefaultPlantKeyFacilities,
  plantLabelFromOptions,
  type PlantKeyFacilityItem,
  PLANT_OPTS_FACILITY_TYPE,
  PLANT_OPTS_TREATMENT_LEVEL,
  PLANT_OPTS_TREATMENT_METHOD,
  PLANT_OPTS_SLUDGE_DISPOSAL,
  PLANT_OPTS_DATA_SOURCE,
  pustAdmDepLabel,
  pustEngGradLabel,
  pustEngScalLabel,
  pustEngStatLabel,
  pustMainBuildGradLabel,
  pustTypeLabel,
} from './facility-points-data';
import { listFacilitiesLinkedToOutlet, type LinkedOutletBackrefRow } from './facility-linked-outlet-backrefs';
import {
  formatResponsiblePartyType,
  listResponsiblePartiesLinkedToOutlet,
  normalizeResponsiblePartyOutletCodes,
  type OutletResponsiblePartyRecord,
} from './facility-outlet-responsible-data';
import { AddrWgs84DetailMap } from '../shared/addrWgs84MapFormBridge';
import { LinkedOutletsWgs84DetailMap } from '../shared/linkedOutletsWgs84DetailMap';
import { padDescriptionsItemsForFullWidthRow } from '../shared/descriptionsPadForFullSpanItems';
import type { PumpArchiveDocument } from './pump-station-documents';
import { PumpDocumentList } from './pump-station-documents-ui';
import type { PlantArchiveDocument } from './plant-station-documents';
import { PlantDocumentList } from './plant-station-documents-ui';
import { outletIssueInitial } from './facility-outlet-issue-data';

/** 高程类数值展示 */
function formatMeters(raw: unknown): string {
  if (raw === '' || raw == null) return '—';
  const n = Number(raw);
  return Number.isFinite(n) ? `${n} m` : '—';
}

/** 台账区划字段展示：禁止裸行政区划数字码 */
function formatFacilityRegionDisplay(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (!s) return '—';
  return /^\d{6,12}$/.test(s) ? getShaoshanAddvcdLabel(s) : s;
}

/** 行政区划代码展示为「代码（区划名称）」以避免与“所在行政区域”重复 */
function formatFacilityRegionCodeDisplay(raw: unknown): string {
  const code = String(raw ?? '').trim();
  if (!code) return '—';
  if (!/^\d{6,12}$/.test(code)) return code;
  const label = getShaoshanAddvcdLabel(code);
  return label && label !== '—' ? `${code}（${label}）` : code;
}

/** 排口详情关联责任主体：区划代码 + 名称 */
function formatResponsiblePartyAddvcdOutlet(code?: string | null): string {
  const c = String(code ?? '').trim();
  if (!c) return '—';
  const lb = getShaoshanAddvcdLabel(c);
  return lb && lb !== '—' ? `${lb}（${c}）` : c;
}

function formatResponsiblePartyMediaOutlet(names?: string[] | null): string {
  const arr = Array.isArray(names) ? names.map(String).map(s => s.trim()).filter(Boolean) : [];
  if (!arr.length) return '—';
  return arr.join('、');
}

/** 详情字段项 */
export interface DetailTableItem {
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
    <div className="detail-section detail-section-plain" aria-label={title}>
      <div className="detail-section-content">
        <Descriptions bordered column={2} size="small" items={descItems} />
      </div>
    </div>
  );
};

interface DetailTab {
  key: string;
  label: string;
  children: React.ReactNode;
}

interface XiangtanDetailViewProps {
  title?: string;
  subtitle?: string;
  tabs: DetailTab[];
  extra?: React.ReactNode;
  defaultActiveKey?: string;
}

const XiangtanDetailView: React.FC<XiangtanDetailViewProps> = ({ tabs, defaultActiveKey }) => {
  const resolvedKey =
    defaultActiveKey && tabs.some(t => t.key === defaultActiveKey) ? defaultActiveKey : tabs[0]?.key;
  return (
    <DetailTabsIfMultiple
      className="facility-detail-tabs facility-mgmt-detail-tabs"
      size="small"
      style={{ marginTop: 8 }}
      defaultActiveKey={resolvedKey}
      items={tabs}
    />
  );
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
  return <Badge status={cfg.color as any} text={cfg.text} />;
};

function OutletIssueListTab({ outletCode }: { outletCode: string }) {
  const rows = useMemo(
    () => outletIssueInitial.filter(item => String(item.关联排口编码) === String(outletCode)),
    [outletCode],
  );
  return (
    <Table
      size="small"
      rowKey="id"
      pagination={false}
      locale={{ emptyText: '暂无关联问题' }}
      dataSource={rows}
      scroll={{ x: 980 }}
      columns={[
        { title: '问题编号', dataIndex: 'id', width: 160 },
        { title: '问题类型', dataIndex: '问题类型', render: (v: string[]) => v.join('、'), width: 280 },
        { title: '整改优先级', dataIndex: '整改优先级', width: 110 },
        { title: '责任主体', dataIndex: '责任主体', width: 220, ellipsis: true },
        { title: '状态', dataIndex: '状态', width: 100 },
        { title: '上报时间', dataIndex: '上报时间', width: 180 },
      ]}
    />
  );
}

export const PumpDetailContent = ({
  record,
  isEdit: _isEdit,
  initialTabKey,
  /** 为 false 时隐藏「设施位置地图」行（综合态势侧栏可见主地图时不重复小地图） */
  showLocationMiniMap = true,
  onIotLinkedDeviceKeysChange,
}: {
  record: Record<string, unknown>;
  isEdit?: boolean;
  initialTabKey?: string;
  showLocationMiniMap?: boolean;
  /** 实时监测 Tab 内物联关联变更（空数组=全部解绑），供综合态势地图刷新 POI */
  onIotLinkedDeviceKeysChange?: (keys: string[]) => void;
}) => {
  const titleName = String(record.pustName ?? record.name ?? '泵站');
  const basicItems: DetailTableItem[] = [
    { label: '台账标识', value: String(record.id ?? '—') },
    { label: '泵站代码', value: String(record.pustCode ?? '—') },
    { label: '泵站名称', value: String(record.pustName ?? record.name ?? '—') },
    { label: '所在流域代码', value: formatPumpBasCodeDisplay(String(record.basCode ?? '')) },
    { label: '泵站所在位置', value: String(record.pustLoc ?? record.location ?? '—'), span: 2 },
    {
      label: '泵站经度',
      value: record.x != null && String(record.x).trim() !== '' ? Number(record.x).toFixed(6) : '—',
    },
    {
      label: '泵站纬度',
      value: record.y != null && String(record.y).trim() !== '' ? Number(record.y).toFixed(6) : '—',
    },
    ...(showLocationMiniMap
      ? ([
          {
            label: '设施位置地图',
            span: 2 as const,
            value: (
              <AddrWgs84DetailMap
                title={String(record.pustName ?? record.name ?? '泵站')}
                location={String(record.pustLoc ?? record.location ?? '')}
                lng={record.x as string | number | null | undefined}
                lat={record.y as string | number | null | undefined}
                mapAriaLabel="泵站位置地图"
              />
            ),
          },
        ] satisfies DetailTableItem[])
      : []),
    { label: '工程等别', value: pustEngGradLabel(String(record.engGrad ?? '')) },
    { label: '工程规模', value: pustEngScalLabel(String(record.engScal ?? '')) },
    { label: '主要建筑物级别', value: pustMainBuildGradLabel(String(record.mainBuildGrad ?? '')) },
    { label: '设计扬程', value: formatMeters(record.desHead) },
    {
      label: '设计流量',
      value:
        record.desFlow != null && String(record.desFlow).trim() !== '' ? `${Number(record.desFlow)} 立方米每秒` : '—',
    },
    { label: '装机容量', value: record.instCap != null ? `${record.instCap} 千瓦` : '—' },
    { label: '水泵台数', value: record.pumpNum != null ? String(record.pumpNum) : '—' },
    { label: '泵站类型', value: pustTypeLabel(String(record.pustType ?? '')) },
    { label: '归口管理部门', value: pustAdmDepLabel(String(record.admDep ?? '')) },
    { label: '工程建设情况', value: pustEngStatLabel(String(record.engStat ?? '')) },
    { label: '开工时间', value: String(record.startDate ?? '—') },
    { label: '建成时间', value: String(record.compDate ?? '—') },
    { label: '备注', value: String(record.note ?? '—'), span: 2 },
  ];

  const docList = (record.documents as PumpArchiveDocument[] | undefined) ?? [];

  const tabs: DetailTab[] = [
    {
      key: 'basic',
      label: '基本信息',
      children: <DetailCard title="泵站基础信息（SL/T 809 表 7.13）" items={basicItems} />,
    },
    {
      key: 'pumpDocuments',
      label: '泵站资料',
      children: (
        <div className="detail-section" style={{ marginTop: 0 }}>
          <div className="detail-section-content">
            <Card
              size="small"
              bordered={false}
              title="泵站电子档案"
              style={{ borderRadius: 6 }}
            >
              <p style={{ margin: '0 0 12px', color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>
                存储设计图纸、设备清单、安装验收报告、运维记录、检测报告、安全评估报告等档案；快速上传为原型，仅记录文件元信息。
              </p>
              <PumpDocumentList documents={docList} />
            </Card>
          </div>
        </div>
      ),
    },
    {
      key: 'monitor',
      label: '实时监测',
      children: (
        <PumpStationMonitoringTabContent record={record} onIotLinkedDeviceKeysChange={onIotLinkedDeviceKeysChange} />
      ),
    },
    {
      key: 'video',
      label: '视频监控',
      children: <PumpStationVideoTabContent record={record} />,
    },
  ];

  return (
    <XiangtanDetailView title="泵站详情" subtitle={titleName} tabs={tabs} defaultActiveKey={initialTabKey} />
  );
};

/** 排口详情「关联信息」：反查 `linkedOutletCode` 指向本排口的污水厂、排水户与污染源台账 */
const OutletLinkedFacilitiesTab: React.FC<{
  outletCode: string;
  /** 点击「详情」打开对应台账详情（设施管理 / 综合态势与列表同源弹窗） */
  onOpenRelatedFacilityDetail?: (row: LinkedOutletBackrefRow) => void;
}> = ({ outletCode, onOpenRelatedFacilityDetail }) => {
  const rows = useMemo(() => listFacilitiesLinkedToOutlet(outletCode), [outletCode]);
  if (!rows.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无关联设施" />;
  }
  return (
    <Table<LinkedOutletBackrefRow>
      size="small"
      rowKey="key"
      pagination={false}
      dataSource={rows}
      scroll={onOpenRelatedFacilityDetail ? { x: 720 } : undefined}
      columns={[
        { title: '来源', dataIndex: 'source', key: 'source', width: 200 },
        { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true },
        { title: '台账标识', dataIndex: 'recordId', key: 'recordId', width: 180, ellipsis: true },
        ...(onOpenRelatedFacilityDetail
          ? [
              {
                title: '操作',
                key: 'op',
                width: 88,
                fixed: 'right' as const,
                render: (_: unknown, row: LinkedOutletBackrefRow) => (
                  <Button
                    type="link"
                    size="small"
                    className="action-btn detail"
                    icon={<EyeOutlined />}
                    onClick={() => onOpenRelatedFacilityDetail(row)}
                  >
                    详情
                  </Button>
                ),
              },
            ]
          : []),
      ]}
    />
  );
};

/** 排口详情「关联责任主体」：`关联排口编码列表` 包含本排口编码的 HJ 1314 表 A.2 台账 */
const OutletLinkedResponsiblePartiesTab: React.FC<{
  outletCode: string;
  responsiblePartiesData?: OutletResponsiblePartyRecord[];
}> = ({ outletCode, responsiblePartiesData }) => {
  const rows = useMemo(() => {
    const code = String(outletCode ?? '').trim();
    if (!code) return [];
    const source = Array.isArray(responsiblePartiesData) ? responsiblePartiesData : listResponsiblePartiesLinkedToOutlet(outletCode);
    if (!Array.isArray(responsiblePartiesData)) return source;
    return source.filter(item => normalizeResponsiblePartyOutletCodes(item.关联排口编码列表).includes(code));
  }, [outletCode, responsiblePartiesData]);
  if (!rows.length) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="暂无关联责任主体（责任主体台账中「关联排口」未包含本排口编码）"
      />
    );
  }
  const row = rows[0];
  const multipleMatched = rows.length > 1;
  const detailItems: DetailTableItem[] = [
    { label: '责任主体内码', value: row.责任主体内码 || '—' },
    { label: '责任主体名称', value: row.责任主体名称 || '—' },
    { label: '责任主体类型', value: formatResponsiblePartyType(row.责任主体类型) },
    { label: '责任主体行政区划', value: formatResponsiblePartyAddvcdOutlet(row.责任主体行政区划) },
    { label: '责任主体行业类别', value: row.责任主体行业类别?.trim() || '—' },
    { label: '是否为主要责任主体', value: row.是否为主要责任主体 || '—' },
    { label: '统一社会信用代码', value: row.统一社会信用代码?.trim() || '—' },
    { label: '责任主体排污许可证编号', value: row.责任主体排污许可证编号?.trim() || '—' },
    { label: '法定代表人或负责人', value: row.法定代表人或负责人 || '—' },
    { label: '联系人', value: row.联系人?.trim() || '—' },
    { label: '联系电话', value: row.联系电话?.trim() || '—' },
    { label: '联系地址', value: row.联系地址?.trim() || '—', span: 2 },
    { label: '责任主体照片', value: formatResponsiblePartyMediaOutlet(row.责任主体照片列表), span: 2 },
    { label: '主要责任主体视频', value: formatResponsiblePartyMediaOutlet(row.主要责任主体视频列表), span: 2 },
    { label: '责任开始日期', value: row.责任开始日期 || '—' },
    { label: '责任结束日期', value: row.责任结束日期?.trim() || '—' },
  ];
  return (
    <div>
      {multipleMatched ? (
        <p style={{ margin: '0 0 12px', color: '#fa8c16', fontSize: 12 }}>
          当前排口匹配到 {rows.length} 条责任主体记录（应为 1 条），仅展示第一条，请到责任主体台账核对。
        </p>
      ) : null}
      <Descriptions
        bordered
        column={2}
        size="small"
        items={padDescriptionsItemsForFullWidthRow(
          detailItems.map((item, idx) => ({
            key: `linked-responsible-${idx}`,
            label: item.label,
            children: renderDetailFieldValue(item.value),
            span: mapDetailItemSpan(item.span),
          })),
          2,
        )}
      />
    </div>
  );
};

export const OutletDetailContent = ({
  record,
  isEdit: _isEdit,
  initialTabKey,
  showLocationMiniMap = true,
  responsiblePartiesData,
  onOpenRelatedFacilityDetail,
  onIotLinkedDeviceKeysChange,
  onOpenResponsiblePartyDetail: _onOpenResponsiblePartyDetail,
}: {
  record: Record<string, unknown>;
  isEdit?: boolean;
  initialTabKey?: string;
  showLocationMiniMap?: boolean;
  responsiblePartiesData?: OutletResponsiblePartyRecord[];
  /** 关联信息 Tab 内「详情」跳转至对应设施/污染源详情 */
  onOpenRelatedFacilityDetail?: (row: LinkedOutletBackrefRow) => void;
  onIotLinkedDeviceKeysChange?: (keys: string[]) => void;
  /** 综合态势地图钻取责任主体详情（责任主体 Tab 内扩展用） */
  onOpenResponsiblePartyDetail?: (row: OutletResponsiblePartyRecord) => void;
}) => {
  const basicItems: DetailTableItem[] = [
    { label: '入河入海排污口名称', value: (record['入河入海排污口名称'] as string) || '—' },
    { label: '入河入海排污口编码', value: (record['入河入海排污口编码'] as string) || '—' },
    { label: '入河入海排污口一级分类', value: formatOutletLevel1(record['入河入海排污口一级分类'] as string) },
    { label: '入河入海排污口二级分类', value: formatOutletLevel2(record['入河入海排污口二级分类'] as string) },
    { label: '审批登记备案情况', value: formatOutletApprovalReg(record['审批登记备案情况'] as string) },
    {
      label: '行政区划代码',
      value: formatFacilityRegionCodeDisplay(record['行政区划代码']),
    },
    { label: '重点排口', value: formatOutletKeyOutfall(record['重点排口']) },
    { label: '排放状态', value: formatOutletEmissionState(record['排放状态']) },
    { label: '入河入海排污口详细地址', value: (record['入河入海排污口详细地址'] as string) || '—', span: 2 },
    {
      label: '入河入海排污口经度',
      value:
        record['入河入海排污口经度'] != null ? `${Number(record['入河入海排污口经度']).toFixed(6)}` : '—',
    },
    {
      label: '入河入海排污口纬度',
      value:
        record['入河入海排污口纬度'] != null ? `${Number(record['入河入海排污口纬度']).toFixed(6)}` : '—',
    },
    ...(showLocationMiniMap
      ? ([
          {
            label: '入河入海排污口位置地图',
            span: 2 as const,
            value: (
              <AddrWgs84DetailMap
                title={String(record['入河入海排污口名称'] ?? '入河入海排污口')}
                location={String(record['入河入海排污口详细地址'] ?? '')}
                lng={record['入河入海排污口经度'] as string | number | null | undefined}
                lat={record['入河入海排污口纬度'] as string | number | null | undefined}
                mapAriaLabel="入河入海排污口位置地图"
              />
            ),
          },
        ] satisfies DetailTableItem[])
      : []),
    { label: '排污水系', value: (record['排污水系'] as string) || '—' },
    { label: '受纳水体', value: (record['受纳水体'] as string) || '—' },
    { label: '所在流域海域', value: formatOutletBasinSea(record['所在流域海域'] as string) },
    { label: '排入海湾名称', value: (record['排入海湾名称'] as string) || '—' },
    { label: '控制单元', value: (record['控制单元'] as string) || '—' },
    { label: '对应国控断面', value: (record['对应国控断面'] as string) || '—' },
    { label: '对应国控断面水质目标', value: (record['对应国控断面水质目标'] as string) || '—' },
    { label: '排入水功能区名称', value: (record['排入水功能区名称'] as string) || '—' },
    { label: '排入水功能区水质目标', value: (record['排入水功能区水质目标'] as string) || '—' },
    { label: '排入近岸海域环境功能区名称', value: (record['排入近岸海域环境功能区名称'] as string) || '—' },
    { label: '排入近岸海域环境功能区水质目标', value: (record['排入近岸海域环境功能区水质目标'] as string) || '—' },
    {
      label: '是否位于饮用水源保护区内',
      value: formatOutletDrinkingSourceZone(record['是否位于饮用水源保护区内'] as string),
    },
    { label: '来水通道', value: formatOutletInflowChannel(record['来水通道'] as string) },
    { label: '排污口材质', value: (record['排污口材质'] as string) || '—' },
    {
      label: '排污口流量',
      value:
        record['排污口流量'] != null && String(record['排污口流量']).trim() !== ''
          ? `${Number(record['排污口流量'])} 立方米每小时`
          : '—',
    },
    { label: '排污口口径', value: (record['排污口口径'] as string) || '—' },
    { label: '排放方式', value: formatOutletDischargeMode(record['排放方式'] as string) },
    { label: '口门形态', value: formatOutletGateForm(record['口门形态'] as string) },
    { label: '周围环境', value: (record['周围环境'] as string) || '—', span: 2 },
    { label: '核查行动小组', value: (record['核查行动小组'] as string) || '—' },
    { label: '创建人', value: (record['创建人'] as string) || '—' },
    { label: '创建时间', value: (record['创建时间'] as string) || '—' },
    { label: '更新时间', value: (record['更新时间'] as string) || '—' },
  ];
  const imageItems: DetailTableItem[] = [
    { label: '排口特征图片', value: (record['排口特征图片'] as string) || '—', span: 2 },
    { label: '排水去向图片', value: (record['排水去向图片'] as string) || '—', span: 2 },
    { label: '周边环境图片', value: (record['周边环境图片'] as string) || '—', span: 2 },
    { label: '排污口特性照片（远景）', value: (record['排污口特性照片（远景）'] as string) || '—', span: 2 },
    { label: '排口标志牌照片', value: (record['排口标志牌照片'] as string) || '—', span: 2 },
  ];

  const outletCode = String(record['入河入海排污口编码'] ?? '');
  const issueCount = outletIssueInitial.filter(item => String(item.关联排口编码) === outletCode).length;
  const outletDocList = (record['documents'] as PumpArchiveDocument[] | undefined) ?? [];
  const tabs: DetailTab[] = [
    {
      key: 'basic',
      label: '基本信息',
      children: <DetailCard title="排口基础信息" items={basicItems} />,
    },
    {
      key: 'monitor',
      label: '实时监测',
      children: (
        <OutletMonitoringTabContent record={record} onIotLinkedDeviceKeysChange={onIotLinkedDeviceKeysChange} />
      ),
    },
    {
      key: 'responsibleParties',
      label: '责任主体信息',
      children: (
        <OutletLinkedResponsiblePartiesTab
          outletCode={outletCode}
          responsiblePartiesData={responsiblePartiesData}
        />
      ),
    },
    {
      key: 'relations',
      label: '关联信息',
      children: (
        <OutletLinkedFacilitiesTab outletCode={outletCode} onOpenRelatedFacilityDetail={onOpenRelatedFacilityDetail} />
      ),
    },
    {
      key: 'issues',
      label: issueCount ? `问题列表（${issueCount}）` : '问题列表',
      children: <OutletIssueListTab outletCode={outletCode} />,
    },
    {
      key: 'video',
      label: '视频监控',
      children: <OutletVideoTabContent record={record} />,
    },
    {
      key: 'images',
      label: '图片资料',
      children: <DetailCard title="排口图片资料" items={imageItems} />,
    },
    {
      key: 'outletDocuments',
      label: '排口资料',
      children: (
        <div className="detail-section" style={{ marginTop: 0 }}>
          <div className="detail-section-content">
            <Card size="small" title="排口电子档案" style={{ borderRadius: 6 }}>
              <p style={{ margin: '0 0 12px', color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>
                存储设计图纸、设备清单、安装验收报告、运维记录、检测报告、安全评估报告等档案；快速上传为原型，仅记录文件元信息（与泵站资料一致）。
              </p>
              <PumpDocumentList documents={outletDocList} uiKind="outlet" />
            </Card>
          </div>
        </div>
      ),
    },
  ];

  return (
    <XiangtanDetailView
      title="排口详情"
      subtitle={String(record['入河入海排污口名称'] ?? record.name ?? '')}
      tabs={tabs}
      defaultActiveKey={initialTabKey}
    />
  );
};

export const PlantDetailContent = ({
  record,
  isEdit: _isEdit,
  initialTabKey,
  showLocationMiniMap = true,
  onIotLinkedDeviceKeysChange,
}: {
  record: Record<string, unknown>;
  isEdit?: boolean;
  initialTabKey?: string;
  showLocationMiniMap?: boolean;
  onIotLinkedDeviceKeysChange?: (keys: string[]) => void;
}) => {
  const basicItems: DetailTableItem[] = [
    { label: '污水处理厂标识码', value: record.id as string },
    { label: '排水系统编码', value: (record.systemId as string) || '—' },
    {
      label: '坐标 X',
      value: record.x != null && String(record.x).trim() !== '' ? Number(record.x).toFixed(6) : '—',
    },
    {
      label: '坐标 Y',
      value: record.y != null && String(record.y).trim() !== '' ? Number(record.y).toFixed(6) : '—',
    },
    {
      label: '污水处理设施类型',
      value: plantLabelFromOptions(record.facilityType as number, PLANT_OPTS_FACILITY_TYPE),
    },
    { label: '污水处理厂名称', value: record.name as string },
    { label: '污水处理厂地址', value: (record.addr as string) || '—', span: 2 },
    ...(showLocationMiniMap
      ? ([
          {
            label: '位置地图',
            span: 2 as const,
            value: (
              <AddrWgs84DetailMap
                title={String(record.name ?? '污水处理厂')}
                location={String(record.addr ?? '')}
                lng={record.x as string | number | null | undefined}
                lat={record.y as string | number | null | undefined}
                mapAriaLabel="污水处理厂位置地图"
              />
            ),
          },
        ] satisfies DetailTableItem[])
      : []),
    { label: '建成日期', value: (record.completionDate as string) || (record.buildYear as string) || '—' },
    {
      label: '污水处理级别',
      value: plantLabelFromOptions(record.treatmentLevel as number, PLANT_OPTS_TREATMENT_LEVEL),
    },
    {
      label: '年耗电量',
      value:
        record.annualPowerConsumption != null && record.annualPowerConsumption !== ''
          ? `${record.annualPowerConsumption} 万千瓦时`
          : '—',
    },
    {
      label: '污水处理方法',
      value: plantLabelFromOptions(record.treatmentMethod as number, PLANT_OPTS_TREATMENT_METHOD),
    },
    {
      label: '受纳水体编码',
      value: formatReceiveWaterObjectIdDisplay(String(record.receiveWaterBodyCode ?? '')),
    },
    {
      label: '关联排口',
      value: formatLinkedOutletCodeDisplay(String(record.linkedOutletCode ?? '')),
    },
    {
      label: '污水设计处理规模',
      value: record.designCapa != null ? `${record.designCapa} 万立方米每日` : '—',
    },
    { label: '污水处理工艺', value: (record.sewageTreatmentProcess as string) || (record.process as string) || '—' },
    {
      label: '污水运行负荷率',
      value: record.sewageLoadRate != null && record.sewageLoadRate !== '' ? `${record.sewageLoadRate}%` : '—',
    },
    {
      label: '雨水设计处理规模',
      value:
        record.rainwaterDesignCapa != null && record.rainwaterDesignCapa !== ''
          ? `${record.rainwaterDesignCapa} 万立方米每日`
          : '—',
    },
    { label: '雨水处理工艺', value: (record.rainwaterTreatmentProcess as string) || '—' },
    {
      label: '污泥设计处理规模',
      value:
        record.sludgeDesignCapa != null && record.sludgeDesignCapa !== ''
          ? `${record.sludgeDesignCapa} 万吨每日`
          : '—',
    },
    {
      label: '污泥运行负荷率',
      value: record.sludgeLoadRate != null && record.sludgeLoadRate !== '' ? `${record.sludgeLoadRate}%` : '—',
    },
    { label: '污泥处理工艺', value: (record.sludgeTreatmentProcess as string) || '—' },
    {
      label: '污泥处置方式',
      value: plantLabelFromOptions(record.sludgeDisposalMethod as number, PLANT_OPTS_SLUDGE_DISPOSAL),
    },
    { label: '水泵台数', value: record.pumpCount != null ? String(record.pumpCount) : '—' },
    {
      label: '数据来源',
      value:
        typeof record.dataSource === 'number'
          ? plantLabelFromOptions(record.dataSource, PLANT_OPTS_DATA_SOURCE)
          : (record.dataSource as string) || '—',
    },
    { label: '数据获取日期', value: (record.recordDate as string) || '—' },
    { label: '填报单位', value: (record.reportUnit as string) || '—' },
    { label: '填报日期', value: (record.reportDate as string) || '—' },
    { label: '备注', value: (record.remark as string) || '—' },
    { label: '所属区划', value: formatFacilityRegionDisplay(record.region) },
    { label: '运行状态', value: (record.status as string) === '1' ? '运行' : (record.status as string) || '—' },
  ];

  const keyFacilities = useMemo((): PlantKeyFacilityItem[] => {
    const raw = record.关键处理设施列表 as PlantKeyFacilityItem[] | undefined;
    if (raw?.length) return raw;
    const x = Number(record.x);
    const y = Number(record.y);
    return createDefaultPlantKeyFacilities(Number.isFinite(x) ? x : 112.528, Number.isFinite(y) ? y : 27.908);
  }, [record]);

  const facilityItems: DetailTableItem[] = useMemo(
    () => keyFacilities.map(f => ({ label: f.name, value: f.functionDesc })),
    [keyFacilities],
  );

  const facilityMapPoints = useMemo(
    () =>
      keyFacilities.map(f => ({
        lng: f.lng,
        lat: f.lat,
        title: f.name,
        subtitle: f.functionDesc,
      })),
    [keyFacilities],
  );

  const plantDocList = (record.documents as PlantArchiveDocument[] | undefined) ?? [];

  const tabs: DetailTab[] = [
    {
      key: 'basic',
      label: '基本信息',
      children: <DetailCard title="基本信息" items={basicItems} />,
    },
    {
      key: 'facility',
      label: '关键设施',
      children: (
        <>
          <DetailCard title="关键处理设施清单" items={facilityItems} />
          <div style={{ marginTop: 16 }}>
            <Card size="small" title="关键设施位置示意（厂区地块内；点击圆点查看名称与功能）">
              <LinkedOutletsWgs84DetailMap
                points={facilityMapPoints}
                mapAriaLabel="污水处理厂关键处理设施位置地图"
              />
            </Card>
          </div>
        </>
      ),
    },
    {
      key: 'plantDocuments',
      label: '污水厂资料',
      children: (
        <div className="detail-section" style={{ marginTop: 0 }}>
          <div className="detail-section-content">
            <Card size="small" title="污水厂电子档案" style={{ borderRadius: 6 }}>
              <p style={{ margin: '0 0 12px', color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>
                整合设计图纸、竣工验收、环保审批、监测报告、运维记录、安全评估等档案，支持集中查阅、下载与追溯；快速上传为原型，仅记录元信息。
              </p>
              <PlantDocumentList documents={plantDocList} />
            </Card>
          </div>
        </div>
      ),
    },
    {
      key: 'monitor',
      label: '实时监测',
      children: (
        <PlantMonitoringTabContent record={record} onIotLinkedDeviceKeysChange={onIotLinkedDeviceKeysChange} />
      ),
    },
    {
      key: 'video',
      label: '视频监控',
      children: <PlantVideoTabContent record={record} />,
    },
  ];

  return (
    <XiangtanDetailView title="污水厂详情" subtitle={record.name as string} tabs={tabs} defaultActiveKey={initialTabKey} />
  );
};
