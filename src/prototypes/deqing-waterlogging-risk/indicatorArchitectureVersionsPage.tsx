import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Alert,
  message,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  QuestionCircleOutlined,
  StarFilled,
  StarOutlined,
  TableOutlined,
  CalculatorOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import {
  cloneLevel1Weights,
  emptyIndicatorArchitectureConfig,
  emptyIndicatorArchitectureRecord,
  type IndicatorArchitectureConfig,
  type IndicatorArchitectureRecord,
  type RegionalPreventionRecord,
  type RiskIndicatorRow,
  type IndicatorRiskLevelRow,
  type RiskLevelVersionRecord,
} from './types';
import { IndicatorArchitectureEditor } from './IndicatorArchitectureEditor';
import { SurveyTablePreviewModal } from './SurveyTablePreviewModal';
import { ScorePreviewPage } from './scorePreviewPage';
import {
  buildArchitectureSnapshot,
  ensureArchitectureVersionNos,
  getActiveArchitectureRecord,
  getRatingLevel1Weights,
  mergeIndicatorsForArchitectureRecord,
  nextArchitectureVersionNo,
  setActiveArchitectureRecord,
  sortArchitectureRecords,
  summarizeArchitectureRecord,
  syncConfigWithIndicatorCatalog,
  validateArchitectureConfig,
} from './indicatorArchitectureUtils';
import {
  getActiveRegionalPreventionRecord,
  getRegionalPreventionForRating,
  hasCompletedPreventionRefForArchitecture,
} from './regionalPreventionUtils';
import { ArchitectureVersionRefAlert } from './ArchitectureVersionRefAlert';
import { ArchitectureVersionTag } from './ArchitectureVersionTag';
import { RiskLevelVersionTag } from './RiskLevelVersionTag';
import {
  ArchitectureVersionSelect,
  resolveSelectedArchitectureRecord,
} from './ArchitectureVersionSelect';

const { RangePicker } = DatePicker;

interface Props {
  records: IndicatorArchitectureRecord[];
  onChange: (records: IndicatorArchitectureRecord[]) => void;
  baseIndicators: RiskIndicatorRow[];
  defaultIndicators: RiskIndicatorRow[];
  indicatorLevels: IndicatorRiskLevelRow[];
  activeRiskLevelRecord?: RiskLevelVersionRecord | null;
  regionalPreventionRecords?: RegionalPreventionRecord[];
  /** 从风险指标管理跳转时自动打开编辑弹窗 */
  openEditOnMount?: boolean;
  onEditMountHandled?: () => void;
  /** 从普查/防灾减灾页跳转时自动打开指定版本详情 */
  openDetailRecordIdOnMount?: string | null;
  onDetailMountHandled?: () => void;
}

function recordToFormValues(record: IndicatorArchitectureRecord | null) {
  if (!record) {
    return {
      configAt: dayjs(),
      label: '',
      updatedBy: '',
    };
  }
  return {
    configAt: dayjs(record.configAt),
    label: record.label ?? '',
    updatedBy: record.config.updatedBy ?? '',
  };
}

export const IndicatorArchitectureVersionsPage: React.FC<Props> = ({
  records,
  onChange,
  baseIndicators,
  defaultIndicators,
  indicatorLevels,
  activeRiskLevelRecord = null,
  regionalPreventionRecords = [],
  openEditOnMount,
  onEditMountHandled,
  openDetailRecordIdOnMount,
  onDetailMountHandled,
}) => {
  const [configDateRange, setConfigDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [versionKeyword, setVersionKeyword] = useState('');
  const [labelKeyword, setLabelKeyword] = useState('');
  const [reporterKeyword, setReporterKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'completed' | 'draft'>('');
  const [previewArchitectureId, setPreviewArchitectureId] = useState('');
  const [tablePreviewOpen, setTablePreviewOpen] = useState(false);
  const [scorePreviewOpen, setScorePreviewOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOnly, setDetailOnly] = useState(false);
  const [editing, setEditing] = useState<IndicatorArchitectureRecord | null>(null);
  const [draftConfig, setDraftConfig] = useState<IndicatorArchitectureConfig>(
    emptyIndicatorArchitectureConfig(),
  );
  /** 弹窗打开时的基准 config，勿随 onDraftChange 更新，避免编辑器内循环同步 */
  const [modalInitialConfig, setModalInitialConfig] = useState<IndicatorArchitectureConfig>(
    emptyIndicatorArchitectureConfig(),
  );
  const [form] = Form.useForm();
  const mountHandledRef = useRef(false);
  const detailMountHandledRef = useRef<string | null>(null);

  const sorted = useMemo(() => sortArchitectureRecords(records), [records]);
  const activeRecord = useMemo(() => getActiveArchitectureRecord(records), [records]);

  useEffect(() => {
    if (activeRecord?.id) {
      setPreviewArchitectureId(activeRecord.id);
    }
  }, [activeRecord?.id]);

  const previewRecord = useMemo(
    () => resolveSelectedArchitectureRecord(records, previewArchitectureId, activeRecord),
    [records, previewArchitectureId, activeRecord],
  );

  const previewIndicators = useMemo(
    () => mergeIndicatorsForArchitectureRecord(baseIndicators, previewRecord),
    [baseIndicators, previewRecord],
  );
  const previewLevel1Weights = useMemo(
    () => getRatingLevel1Weights(previewRecord),
    [previewRecord],
  );
  const previewRegionalPrevention = useMemo(
    () => getRegionalPreventionForRating(regionalPreventionRecords, previewRecord),
    [regionalPreventionRecords, previewRecord],
  );
  const previewActivePreventionRecord = useMemo(
    () => getActiveRegionalPreventionRecord(regionalPreventionRecords, previewRecord),
    [regionalPreventionRecords, previewRecord],
  );

  const requirePreviewArchitecture = (): boolean => {
    if (previewRecord) return true;
    message.warning('请先在筛选区选择一条评价版本');
    return false;
  };

  const openTablePreview = () => {
    if (!requirePreviewArchitecture()) return;
    setTablePreviewOpen(true);
  };

  const openScorePreview = () => {
    if (!requirePreviewArchitecture()) return;
    setScorePreviewOpen(true);
  };

  const filtered = useMemo(() => {
    const from = configDateRange?.[0]?.startOf('day').format('YYYY-MM-DD HH:mm:ss');
    const to = configDateRange?.[1]?.endOf('day').format('YYYY-MM-DD HH:mm:ss');
    return sorted.filter(r => {
      if (statusFilter && r.config.status !== statusFilter) return false;
      if (versionKeyword.trim()) {
        const k = versionKeyword.trim().toUpperCase();
        if (!(r.versionNo ?? '').toUpperCase().includes(k)) return false;
      }
      if (labelKeyword.trim()) {
        const k = labelKeyword.trim().toLowerCase();
        if (!(r.label ?? '').toLowerCase().includes(k)) return false;
      }
      if (reporterKeyword.trim()) {
        const k = reporterKeyword.trim().toLowerCase();
        if (!(r.config.updatedBy ?? '').toLowerCase().includes(k)) return false;
      }
      if (from && r.configAt < from) return false;
      if (to && r.configAt > to) return false;
      return true;
    });
  }, [sorted, configDateRange, versionKeyword, labelKeyword, reporterKeyword, statusFilter]);

  const resetFilters = () => {
    setConfigDateRange(null);
    setVersionKeyword('');
    setLabelKeyword('');
    setReporterKeyword('');
    setStatusFilter('');
  };

  const pendingVersionNo = useMemo(
    () => (editing ? editing.versionNo : nextArchitectureVersionNo(records)),
    [editing, records],
  );

  const patchRecords = (next: IndicatorArchitectureRecord[]) => {
    onChange(sortArchitectureRecords(ensureArchitectureVersionNos(next)));
  };

  const openCreate = () => {
    const base = activeRecord?.config ?? emptyIndicatorArchitectureConfig();
    const synced = syncConfigWithIndicatorCatalog(base, baseIndicators);
    const initial = activeRecord
      ? synced
      : buildArchitectureSnapshot(baseIndicators, cloneLevel1Weights());
    setEditing(null);
    setDetailOnly(false);
    setModalInitialConfig(initial);
    setDraftConfig(initial);
    form.resetFields();
    form.setFieldsValue({
      configAt: dayjs(),
      label: '',
      updatedBy: '',
    });
    setModalOpen(true);
  };

  const openDetail = (row: IndicatorArchitectureRecord) => {
    setPreviewArchitectureId(row.id);
    setEditing(row);
    setDetailOnly(true);
    const synced = syncConfigWithIndicatorCatalog(row.config, baseIndicators);
    setModalInitialConfig(synced);
    setDraftConfig(synced);
    form.setFieldsValue(recordToFormValues(row));
    setModalOpen(true);
  };

  const openEdit = (row: IndicatorArchitectureRecord) => {
    setPreviewArchitectureId(row.id);
    setEditing(row);
    setDetailOnly(false);
    const synced = syncConfigWithIndicatorCatalog(row.config, baseIndicators);
    setModalInitialConfig(synced);
    setDraftConfig(synced);
    form.setFieldsValue(recordToFormValues(row));
    setModalOpen(true);
  };

  useEffect(() => {
    if (!openEditOnMount || mountHandledRef.current) return;
    mountHandledRef.current = true;
    if (activeRecord) {
      openEdit(activeRecord);
    } else {
      openCreate();
    }
    onEditMountHandled?.();
  }, [openEditOnMount, activeRecord, onEditMountHandled]);

  useEffect(() => {
    if (!openDetailRecordIdOnMount) return;
    if (detailMountHandledRef.current === openDetailRecordIdOnMount) return;
    const row = records.find(r => r.id === openDetailRecordIdOnMount);
    if (row) {
      openDetail(row);
    }
    detailMountHandledRef.current = openDetailRecordIdOnMount;
    onDetailMountHandled?.();
  }, [openDetailRecordIdOnMount, records, onDetailMountHandled]);

  const handleSetActive = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const target = records.find(r => r.id === id);
    if (target?.config.status !== 'completed') {
      message.warning('请先保存并确保权重配置完整（各级合计 1.000）后再设为定级引用');
      return;
    }
    patchRecords(setActiveArchitectureRecord(records, id));
    setPreviewArchitectureId(id);
    message.success('已设为定级引用（全县 V 计算权重方案）');
    if (
      target &&
      !hasCompletedPreventionRefForArchitecture(regionalPreventionRecords, target)
    ) {
      message.warning(
        `请前往「防灾减灾指标信息」，在 ${target.versionNo} 下完成填报并设为 V₄ 数据引用后再进行定级`,
        6,
      );
    }
  };

  const handleDelete = (id: string) => {
    const next = records.filter(r => r.id !== id);
    if (!next.length) {
      patchRecords([]);
      return;
    }
    let patched = next;
    if (!next.some(r => r.activeForRating)) {
      const latest = sortArchitectureRecords(next).find(r => r.config.status === 'completed');
      if (latest) patched = setActiveArchitectureRecord(next, latest.id);
    }
    patchRecords(patched);
    message.success('已删除');
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    const configAt = (values.configAt as Dayjs).format('YYYY-MM-DD HH:mm:ss');
    const validation = validateArchitectureConfig(draftConfig, baseIndicators);
    const nextConfig: IndicatorArchitectureConfig = {
      ...draftConfig,
      updatedBy: values.updatedBy?.trim() || undefined,
      updatedAt: configAt,
      status: validation.ok ? 'completed' : 'draft',
    };

    const nextRecord: IndicatorArchitectureRecord = editing
      ? {
          ...editing,
          configAt,
          label: values.label?.trim() || undefined,
          config: nextConfig,
        }
      : {
          ...emptyIndicatorArchitectureRecord(),
          id: `arch-${Date.now()}`,
          versionNo: nextArchitectureVersionNo(records),
          configAt,
          label: values.label?.trim() || undefined,
          activeForRating: records.length === 0,
          config: nextConfig,
        };

    patchRecords(
      editing
        ? records.map(r => (r.id === editing.id ? nextRecord : r))
        : [nextRecord, ...records],
    );

    if (!validation.ok) {
      message.warning('权重合计未全部达标，已保存为草稿；完善后可设为定级引用');
    } else {
      message.success(
        `已保存 ${nextRecord.versionNo}${
          nextRecord.activeForRating ? '，当前为定级引用版本' : ''
        }`,
      );
      setModalOpen(false);
    }
  };

  const switchDetailToEdit = () => {
    setDetailOnly(false);
  };

  const columns: ColumnsType<IndicatorArchitectureRecord> = [
    {
      title: '版本编号',
      dataIndex: 'versionNo',
      width: 88,
      render: (v: string) => (
        <ArchitectureVersionTag variant="plain" versionNo={v || undefined} />
      ),
    },
    {
      title: '批次说明',
      dataIndex: 'label',
      width: 140,
      ellipsis: true,
      render: (v: string | undefined) => v || '—',
    },
    {
      title: '配置时间',
      dataIndex: 'configAt',
      width: 168,
      render: (v: string) => v,
    },
    {
      title: '启用指标',
      width: 100,
      render: (_, row) => {
        const s = summarizeArchitectureRecord(baseIndicators, row);
        return `${s.enabledCount} / ${s.totalCount}`;
      },
    },
    {
      title: '权重校验',
      width: 100,
      render: (_, row) => {
        const s = summarizeArchitectureRecord(baseIndicators, row);
        return (
          <Tag color={s.weightValid ? 'success' : 'error'}>
            {s.weightValid ? '通过' : `${s.issueCount} 项未达标`}
          </Tag>
        );
      },
    },
    {
      title: '状态',
      width: 90,
      render: (_, row) => (
        <Tag color={row.config.status === 'completed' ? 'success' : 'default'}>
          {row.config.status === 'completed' ? '已完成' : '草稿'}
        </Tag>
      ),
    },
    {
      title: (
        <span>
          定级引用
          <Tooltip title="内涝定级与等级试算以该条权重与启用状态为准">
            <QuestionCircleOutlined
              style={{ marginLeft: 4, color: 'rgba(0,0,0,0.45)', fontSize: 13, cursor: 'help' }}
            />
          </Tooltip>
        </span>
      ),
      width: 108,
      render: (_, row) =>
        row.activeForRating ? (
          <Tag color="blue" icon={<StarFilled />}>
            当前引用
          </Tag>
        ) : (
          '—'
        ),
    },
    {
      title: '维护人',
      dataIndex: ['config', 'updatedBy'],
      width: 88,
      ellipsis: true,
      render: (v: string | undefined) => v || '—',
    },
    {
      title: '操作',
      width: 220,
      fixed: 'right',
      render: (_, row) => (
        <Space size={4} onClick={e => e.stopPropagation()}>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            className="action-btn"
            onClick={() => openDetail(row)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            className="action-btn"
            onClick={() => openEdit(row)}
          >
            编辑
          </Button>
          {!row.activeForRating && row.config.status === 'completed' ? (
            <Button
              type="link"
              size="small"
              icon={<StarOutlined />}
              className="action-btn"
              onClick={e => handleSetActive(row.id, e)}
            >
              引用
            </Button>
          ) : null}
          <Popconfirm title="确定删除该条评价版本？" onConfirm={() => handleDelete(row.id)}>
            <Button type="link" size="small" danger className="action-btn">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const modalTitleText = detailOnly
    ? '评价版本详情'
    : editing
      ? '编辑评价版本'
      : '新增评价版本';

  const modalTitle = (
    <Space align="center" size="small">
      <span>{modalTitleText}</span>
      {editing ? (
        <>
          <ArchitectureVersionTag versionNo={editing.versionNo} />
          {editing.activeForRating ? <Tag color="blue">定级引用版本</Tag> : null}
          <Tag color={draftConfig.status === 'completed' ? 'success' : 'default'}>
            {draftConfig.status === 'completed' ? '已完成' : '草稿'}
          </Tag>
        </>
      ) : null}
    </Space>
  );

  return (
    <div className="dq-risk-page dq-arch-versions-page">
      <ArchitectureVersionRefAlert record={activeRecord} onViewDetail={openDetail} />
      {!activeRecord ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="尚未设置定级引用的评价版本"
          description="表格预览与内涝等级试算需在筛选区选择评价版本；默认定级引用版本。请先在列表中将一条已完成版本设为定级引用。"
        />
      ) : null}
      <Card bordered={false} className="filter-card">
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={7}>
            <RangePicker
              style={{ width: '100%' }}
              value={configDateRange}
              onChange={vals => setConfigDateRange(vals as [Dayjs | null, Dayjs | null] | null)}
              showTime={false}
              format="YYYY-MM-DD"
              placeholder={['配置时间起', '配置时间止']}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Input
              placeholder="版本编号"
              value={versionKeyword}
              onChange={e => setVersionKeyword(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Input
              placeholder="批次说明"
              value={labelKeyword}
              onChange={e => setLabelKeyword(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Input
              placeholder="维护人"
              value={reporterKeyword}
              onChange={e => setReporterKeyword(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="配置状态"
              allowClear
              value={statusFilter || undefined}
              onChange={v => setStatusFilter(v ?? '')}
              options={[
                { value: 'completed', label: '已完成' },
                { value: 'draft', label: '草稿' },
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <ArchitectureVersionSelect
              records={records}
              activeRecord={activeRecord}
              value={previewArchitectureId}
              onChange={setPreviewArchitectureId}
              placeholder="预览评价版本"
            />
          </Col>
          <Col flex="auto" style={{ textAlign: 'right' }}>
            <Space wrap>
              <Button type="primary" icon={<SearchOutlined />} className="search-btn">
                查询
              </Button>
              <Button onClick={resetFilters}>重置</Button>
              <Button type="primary" icon={<PlusOutlined />} className="add-btn" onClick={openCreate}>
                新增版本
              </Button>
              <Button
                icon={<TableOutlined />}
                disabled={!previewRecord}
                onClick={openTablePreview}
              >
                表格预览
              </Button>
              <Button
                icon={<CalculatorOutlined />}
                disabled={!previewRecord}
                onClick={openScorePreview}
              >
                内涝等级试算
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card bordered={false} style={{ marginTop: 12 }}>
        {!records.length ? (
          <Empty description="暂无评价版本，请先新增">
            <Button type="primary" onClick={openCreate}>
              新增版本
            </Button>
          </Empty>
        ) : (
          <Table<IndicatorArchitectureRecord>
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={filtered}
            pagination={{ defaultPageSize: 8, showSizeChanger: false }}
            scroll={{ x: 1240 }}
          />
        )}
      </Card>

      <Modal
        title={modalTitle}
        open={modalOpen}
        className="dq-arch-version-modal"
        onCancel={() => setModalOpen(false)}
        width="100vw"
        centered={false}
        style={{ top: 0, paddingBottom: 0, maxWidth: '100vw' }}
        styles={{ body: { flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' } }}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" disabled={detailOnly}>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item label="版本编号">
                <Input value={pendingVersionNo} disabled />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="configAt"
                label="配置时间"
                rules={[{ required: true, message: '请选择配置时间' }]}
              >
                <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm:ss" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="label" label="批次说明">
                <Input placeholder="如：2026 汛前权重调整" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="updatedBy" label="维护人">
                <Input placeholder="选填" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
        <IndicatorArchitectureEditor
          baseIndicators={baseIndicators}
          defaultIndicators={defaultIndicators}
          initialConfig={modalInitialConfig}
          onDraftChange={detailOnly ? undefined : setDraftConfig}
          embedded
          readOnly={detailOnly}
          onEdit={detailOnly ? switchDetailToEdit : undefined}
          onCancel={detailOnly ? undefined : () => setModalOpen(false)}
          onSave={detailOnly ? undefined : handleSave}
        />
      </Modal>

      <SurveyTablePreviewModal
        key={previewRecord?.id ?? 'none'}
        open={tablePreviewOpen}
        onClose={() => setTablePreviewOpen(false)}
        indicators={previewIndicators}
        architectureRecord={previewRecord}
      />

      <Modal
        title={
          <Space align="center" size="small">
            <span>内涝等级试算</span>
            {previewRecord ? <ArchitectureVersionTag versionNo={previewRecord.versionNo} /> : null}
            <RiskLevelVersionTag versionNo={activeRiskLevelRecord?.versionNo} empty={null} />
          </Space>
        }
        className="dq-score-preview-modal"
        open={scorePreviewOpen}
        onCancel={() => setScorePreviewOpen(false)}
        width={1400}
        footer={null}
        destroyOnClose
        styles={{
          container: {
            maxHeight: 'calc(100vh - 80px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
          body: {
            padding: '16px 20px',
            flex: '1 1 auto',
            minHeight: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <ScorePreviewPage
          key={previewRecord?.id ?? 'none'}
          indicators={previewIndicators}
          indicatorLevels={indicatorLevels}
          level1Weights={previewLevel1Weights}
          regionalPrevention={previewRegionalPrevention}
          activePreventionRecord={previewActivePreventionRecord}
          activeArchitectureRecord={previewRecord}
          activeRiskLevelRecord={activeRiskLevelRecord}
        />
      </Modal>
    </div>
  );
};
