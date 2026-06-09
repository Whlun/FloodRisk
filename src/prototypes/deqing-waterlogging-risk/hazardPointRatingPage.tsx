import React, { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import { waterloggingPointRegistry } from '../../database/deqing-waterlogging-point-registry';
import type { ColumnsType } from 'antd/es/table';
import { type Dayjs } from 'dayjs';
import {
  HAZARD_POINT_TYPE_LABEL,
  RISK_CHANGE_TYPE_LABEL,
  type IndicatorRiskLevelRow,
  type RiskChangeLogEntry,
  type RiskChangeType,
  type SurveyPointType,
} from './types';
import { filterRiskChangeLogs } from './riskChangeLogUtils';
import { ArchitectureVersionTag } from './ArchitectureVersionTag';
import { PreventionVersionTag } from './PreventionVersionTag';
import { RiskLevelVersionTag } from './RiskLevelVersionTag';
import {
  TableColumnManager,
  getDefaultVisibleColumnKeys,
  pickTableColumns,
  type TableColumnConfig,
} from './TableColumnManager';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const COLUMN_CONFIG: TableColumnConfig[] = [
  { key: 'changeAt', title: '变更时间', defaultVisible: true },
  { key: 'pointCode', title: '易涝点编号', defaultVisible: true },
  { key: 'name', title: '易涝点名称', defaultVisible: true },
  { key: 'pointType', title: '隐患点类型', defaultVisible: true },
  { key: 'surveyAt', title: '普查时间', defaultVisible: true },
  { key: 'surveyLabel', title: '批次说明', defaultVisible: false },
  { key: 'changeType', title: '变更类型', defaultVisible: true },
  { key: 'prevLevelName', title: '原风险等级', defaultVisible: true },
  { key: 'newLevelName', title: '新风险等级', defaultVisible: true },
  { key: 'prevV', title: '原综合分 V', defaultVisible: false },
  { key: 'newV', title: '新综合分 V', defaultVisible: true },
  { key: 'architectureVersionNo', title: '评价版本', defaultVisible: true },
  { key: 'riskLevelVersionNo', title: '等级版本', defaultVisible: true },
  { key: 'partial', title: '部分指标', defaultVisible: false },
  { key: 'operator', title: '操作人', defaultVisible: true },
  { key: 'basicInfoSynced', title: '基本信息同步', defaultVisible: false },
  { key: 'operation', title: '操作', locked: true, defaultVisible: true },
];

interface Props {
  riskChangeLogs: RiskChangeLogEntry[];
  indicatorLevels: IndicatorRiskLevelRow[];
}

export const HazardPointRatingPage: React.FC<Props> = ({ riskChangeLogs, indicatorLevels }) => {
  const [registryFilter, setRegistryFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<SurveyPointType | ''>('');
  const [changeTypeFilter, setChangeTypeFilter] = useState<RiskChangeType | ''>('');
  const [levelFilter, setLevelFilter] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [visibleColumns, setVisibleColumns] = useState(() =>
    getDefaultVisibleColumnKeys(COLUMN_CONFIG),
  );
  const [selected, setSelected] = useState<RiskChangeLogEntry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filtered = useMemo(() => {
    const from = dateRange?.[0]?.format('YYYY-MM-DD HH:mm:ss');
    const to = dateRange?.[1]?.endOf('day').format('YYYY-MM-DD HH:mm:ss');
    return filterRiskChangeLogs(riskChangeLogs, {
      registryId: registryFilter || undefined,
      pointType: typeFilter || undefined,
      changeType: changeTypeFilter || undefined,
      newLevelCode: levelFilter || undefined,
      changeAtFrom: from,
      changeAtTo: to,
    });
  }, [riskChangeLogs, registryFilter, typeFilter, changeTypeFilter, levelFilter, dateRange]);

  const levelFilterOptions = useMemo(
    () =>
      [...indicatorLevels]
        .filter(l => l.enabled)
        .sort((a, b) => a.sort - b.sort)
        .map(l => ({ value: l.levelCode, label: l.levelName })),
    [indicatorLevels],
  );

  const pointOptions = useMemo(
    () =>
      [...waterloggingPointRegistry]
        .sort((a, b) => a.pointCode.localeCompare(b.pointCode))
        .map(r => ({
          value: r.id,
          label: `${r.pointCode} · ${r.name}`,
        })),
    [],
  );

  const historyForSelected = useMemo(() => {
    if (!selected) return [];
    return riskChangeLogs
      .filter(l => l.registryId === selected.registryId)
      .sort((a, b) => b.changeAt.localeCompare(a.changeAt));
  }, [riskChangeLogs, selected]);

  const openDetail = (row: RiskChangeLogEntry) => {
    setSelected(row);
    setDetailOpen(true);
  };

  const allColumns: ColumnsType<RiskChangeLogEntry> = [
    { key: 'changeAt', title: '变更时间', dataIndex: 'changeAt', width: 168 },
    { key: 'pointCode', title: '易涝点编号', dataIndex: 'pointCode', width: 120 },
    { key: 'name', title: '易涝点名称', dataIndex: 'name', ellipsis: true, width: 180 },
    {
      key: 'pointType',
      title: '隐患点类型',
      dataIndex: 'pointType',
      width: 140,
      render: t => HAZARD_POINT_TYPE_LABEL[t as keyof typeof HAZARD_POINT_TYPE_LABEL],
    },
    {
      key: 'surveyAt',
      title: '普查时间',
      dataIndex: 'surveyAt',
      width: 156,
      render: (at, r) => (
        <span>
          {at}
          {r.surveyLabel ? (
            <Text type="secondary" style={{ marginLeft: 4, fontSize: 12 }}>
              · {r.surveyLabel}
            </Text>
          ) : null}
        </span>
      ),
    },
    {
      key: 'surveyLabel',
      title: '批次说明',
      dataIndex: 'surveyLabel',
      width: 100,
      render: v => v ?? '—',
    },
    {
      key: 'changeType',
      title: '变更类型',
      dataIndex: 'changeType',
      width: 100,
      render: (t: RiskChangeType) => {
        const color =
          t === 'upgrade' ? 'error' : t === 'downgrade' ? 'success' : t === 'initial' ? 'blue' : 'default';
        return <Tag color={color}>{RISK_CHANGE_TYPE_LABEL[t]}</Tag>;
      },
    },
    {
      key: 'prevLevelName',
      title: '原风险等级',
      width: 100,
      render: (_, r) =>
        r.prevLevelName ? <Tag>{r.prevLevelName}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      key: 'newLevelName',
      title: '新风险等级',
      width: 100,
      render: (_, r) => <Tag color={r.newColor}>{r.newLevelName}</Tag>,
    },
    {
      key: 'prevV',
      title: '原综合分 V',
      width: 96,
      render: (_, r) => (r.prevV != null ? r.prevV.toFixed(4) : '—'),
    },
    {
      key: 'newV',
      title: '新综合分 V',
      width: 96,
      render: (_, r) => r.newV.toFixed(4),
    },
    {
      key: 'architectureVersionNo',
      title: '评价版本',
      width: 96,
      render: (_, r) =>
        r.architectureVersionNo ? (
          <ArchitectureVersionTag versionNo={r.architectureVersionNo} />
        ) : r.architectureRefAt ? (
          <Text type="secondary">{r.architectureRefAt}</Text>
        ) : (
          '—'
        ),
    },
    {
      key: 'riskLevelVersionNo',
      title: '等级版本',
      width: 96,
      render: (_, r) => <RiskLevelVersionTag versionNo={r.riskLevelVersionNo} />,
    },
    {
      key: 'partial',
      title: '部分指标',
      width: 88,
      render: (_, r) => (r.partial ? <Tag color="warning">是</Tag> : <Tag>否</Tag>),
    },
    {
      key: 'operator',
      title: '操作人',
      dataIndex: 'operator',
      width: 88,
      render: v => v ?? '—',
    },
    {
      key: 'basicInfoSynced',
      title: '基本信息同步',
      width: 110,
      render: (_, r) => (r.basicInfoSynced ? <Tag color="processing">已同步</Tag> : '—'),
    },
    {
      key: 'operation',
      title: '操作',
      width: 88,
      fixed: 'right',
      render: (_, row) => (
        <Button type="link" size="small" onClick={() => openDetail(row)}>
          详情
        </Button>
      ),
    },
  ];

  const columns = useMemo(
    () => pickTableColumns(allColumns, visibleColumns),
    [visibleColumns, riskChangeLogs],
  );

  const resetFilters = () => {
    setRegistryFilter('');
    setTypeFilter('');
    setChangeTypeFilter('');
    setLevelFilter('');
    setDateRange(null);
  };

  return (
    <div className="dq-risk-page dq-risk-change-log-page">
      <Card bordered={false} className="filter-card">
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Select
              placeholder="选择易涝点"
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: '100%' }}
              value={registryFilter || undefined}
              onChange={v => setRegistryFilter(v ?? '')}
              options={pointOptions}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="隐患点类型"
              allowClear
              style={{ width: '100%' }}
              value={typeFilter || undefined}
              onChange={v => setTypeFilter((v as SurveyPointType) ?? '')}
              options={(
                ['SUNKEN', 'TUNNEL', 'UNDERGROUND', 'LOW_LYING'] as SurveyPointType[]
              ).map(t => ({ value: t, label: HAZARD_POINT_TYPE_LABEL[t] }))}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="变更类型"
              allowClear
              style={{ width: '100%' }}
              value={changeTypeFilter || undefined}
              onChange={v => setChangeTypeFilter((v as RiskChangeType) ?? '')}
              options={(Object.keys(RISK_CHANGE_TYPE_LABEL) as RiskChangeType[]).map(k => ({
                value: k,
                label: RISK_CHANGE_TYPE_LABEL[k],
              }))}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="新风险等级"
              allowClear
              style={{ width: '100%' }}
              value={levelFilter || undefined}
              onChange={v => setLevelFilter(v ?? '')}
              options={levelFilterOptions}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              value={dateRange}
              onChange={vals => setDateRange(vals as [Dayjs | null, Dayjs | null] | null)}
              showTime={false}
              format="YYYY-MM-DD"
            />
          </Col>
          <Col xs={24} sm={12} md={24} style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={resetFilters}>重置</Button>
              <TableColumnManager
                columns={COLUMN_CONFIG}
                visibleColumns={visibleColumns}
                onChange={setVisibleColumns}
              />
            </Space>
          </Col>
        </Row>
      </Card>

      <Card bordered={false} style={{ marginTop: 12 }} title={`变更记录（${filtered.length} 条）`}>
        <Table
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={filtered}
          scroll={{ x: 1200 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: t => `共 ${t} 条` }}
        />
      </Card>

      <Modal
        title={
          selected ? (
            <Space align="center" size="small" wrap>
              <HistoryOutlined />
              <span>
                {selected.name} · 定级变更详情
              </span>
              <ArchitectureVersionTag versionNo={selected.architectureVersionNo} empty={null} />
              <RiskLevelVersionTag versionNo={selected.riskLevelVersionNo} empty={null} />
            </Space>
          ) : (
            '定级变更详情'
          )
        }
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        width={720}
        destroyOnClose
        footer={[<Button key="close" onClick={() => setDetailOpen(false)}>关闭</Button>]}
      >
        {selected ? (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="易涝点编号">{selected.pointCode}</Descriptions.Item>
              <Descriptions.Item label="易涝点名称">{selected.name}</Descriptions.Item>
              <Descriptions.Item label="隐患点类型">
                {HAZARD_POINT_TYPE_LABEL[selected.pointType]}
              </Descriptions.Item>
              <Descriptions.Item label="普查时间">
                {selected.surveyAt}
                {selected.surveyLabel ? ` · ${selected.surveyLabel}` : ''}
              </Descriptions.Item>
              <Descriptions.Item label="变更时间">{selected.changeAt}</Descriptions.Item>
              <Descriptions.Item label="变更类型">
                <Tag>{RISK_CHANGE_TYPE_LABEL[selected.changeType]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="原 → 新等级">
                {selected.prevLevelName ? (
                  <Space>
                    <Tag>{selected.prevLevelName}</Tag>
                    <span>→</span>
                    <Tag color={selected.newColor}>{selected.newLevelName}</Tag>
                  </Space>
                ) : (
                  <Tag color={selected.newColor}>{selected.newLevelName}</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="综合分 V">
                {selected.prevV != null ? `${selected.prevV.toFixed(4)} → ` : ''}
                {selected.newV.toFixed(4)}
                {selected.partial ? (
                  <Tag color="warning" style={{ marginLeft: 8 }}>
                    部分指标参与
                  </Tag>
                ) : null}
              </Descriptions.Item>
              <Descriptions.Item label="V₁–V₄">
                V₁={selected.v1.toFixed(4)} · V₂={selected.v2.toFixed(4)} · V₃={selected.v3.toFixed(4)}{' '}
                · V₄={selected.v4.toFixed(4)}
              </Descriptions.Item>
              {(selected.preventionVersionNo || selected.preventionRefAt) ? (
                <Descriptions.Item label="防灾减灾引用版本">
                  <Space size={4} wrap align="center">
                    {selected.preventionVersionNo ? (
                      <PreventionVersionTag versionNo={selected.preventionVersionNo} />
                    ) : null}
                    {selected.preventionRefAt ? (
                      <Text type="secondary">{selected.preventionRefAt}</Text>
                    ) : null}
                  </Space>
                </Descriptions.Item>
              ) : null}
              {selected.architectureVersionNo || selected.architectureRefAt ? (
                <Descriptions.Item label="评价版本">
                  {selected.architectureVersionNo ?? selected.architectureRefAt}
                </Descriptions.Item>
              ) : null}
              {selected.riskLevelVersionNo ? (
                <Descriptions.Item label="等级版本">
                  {selected.riskLevelVersionNo}
                </Descriptions.Item>
              ) : null}
              {selected.basicInfoSynced ? (
                <Descriptions.Item label="基本信息同步">已推送至同易涝点各普查记录</Descriptions.Item>
              ) : null}
              <Descriptions.Item label="操作人">{selected.operator ?? '—'}</Descriptions.Item>
              {selected.remark ? (
                <Descriptions.Item label="备注">{selected.remark}</Descriptions.Item>
              ) : null}
            </Descriptions>

            <Card
              title={`历史定级变化（${historyForSelected.length} 次）`}
              size="small"
              style={{ marginTop: 16 }}
            >
              <Timeline
                items={historyForSelected.map(h => ({
                  color:
                    h.id === selected.id
                      ? 'blue'
                      : h.changeType === 'upgrade'
                        ? 'red'
                        : h.changeType === 'downgrade'
                          ? 'green'
                          : 'gray',
                  children: (
                    <div>
                      <Text strong={h.id === selected.id}>{h.changeAt}</Text>
                      {h.id === selected.id ? (
                        <Tag color="blue" style={{ marginLeft: 8 }}>
                          当前记录
                        </Tag>
                      ) : null}
                      <div style={{ marginTop: 4, fontSize: 13 }}>
                        <Tag>{RISK_CHANGE_TYPE_LABEL[h.changeType]}</Tag>
                        {h.prevLevelName ? (
                          <>
                            <Tag>{h.prevLevelName}</Tag>
                            <span style={{ margin: '0 4px' }}>→</span>
                          </>
                        ) : null}
                        <Tag color={h.newColor}>{h.newLevelName}</Tag>
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          V={h.newV.toFixed(4)}
                        </Text>
                        {h.architectureVersionNo ? (
                          <ArchitectureVersionTag
                            versionNo={h.architectureVersionNo}
                            style={{ marginLeft: 8 }}
                          />
                        ) : null}
                        {h.riskLevelVersionNo ? (
                          <RiskLevelVersionTag
                            versionNo={h.riskLevelVersionNo}
                            style={{ marginLeft: 8 }}
                          />
                        ) : null}
                        {h.surveyLabel ? (
                          <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                            {h.surveyAt} · {h.surveyLabel}
                          </Text>
                        ) : (
                          <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                            {h.surveyAt}
                          </Text>
                        )}
                      </div>
                    </div>
                  ),
                }))}
              />
            </Card>
          </>
        ) : null}
      </Modal>
    </div>
  );
};
