import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
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
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { initialIndicatorRiskLevels } from '../../database/deqing-waterlogging-risk-indicators';
import {
  emptyRiskLevelVersionRecord,
  type IndicatorRiskLevelRow,
  type RiskLevelVersionConfig,
  type RiskLevelVersionRecord,
  type RiskChangeLogEntry,
  type WaterloggingPointRow,
} from './types';
import { RiskLevelEditor } from './RiskLevelEditor';
import { RiskLevelVersionTag } from './RiskLevelVersionTag';
import {
  buildRiskLevelSnapshot,
  ensureRiskLevelVersionNos,
  getActiveRiskLevelRecord,
  getLevelsFromRecord,
  getRiskLevelRatingReferenceIssue,
  hasMeaningfulRiskLevelCopyChanges,
  isRiskLevelVersionImmutable,
  nextRiskLevelVersionNo,
  setActiveRiskLevelRecord,
  sortRiskLevelRecords,
  summarizeRiskLevelRecord,
  validateRiskLevelConfig,
} from './riskLevelVersionUtils';

const { RangePicker } = DatePicker;

interface Props {
  records: RiskLevelVersionRecord[];
  onChange: (records: RiskLevelVersionRecord[]) => void | Promise<void>;
  points?: WaterloggingPointRow[];
  riskChangeLogs?: RiskChangeLogEntry[];
  openDetailRecordIdOnMount?: string | null;
  onDetailMountHandled?: () => void;
}

function recordToFormValues(record: RiskLevelVersionRecord | null) {
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

export const RiskLevelPage: React.FC<Props> = ({
  records,
  onChange,
  points = [],
  riskChangeLogs = [],
  openDetailRecordIdOnMount,
  onDetailMountHandled,
}) => {
  const [configDateRange, setConfigDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [versionKeyword, setVersionKeyword] = useState('');
  const [labelKeyword, setLabelKeyword] = useState('');
  const [reporterKeyword, setReporterKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'completed' | 'draft'>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOnly, setDetailOnly] = useState(false);
  const [editing, setEditing] = useState<RiskLevelVersionRecord | null>(null);
  const [copySourceVersionNo, setCopySourceVersionNo] = useState<string | null>(null);
  const [copySuggestedLabel, setCopySuggestedLabel] = useState('');
  const [draftLevels, setDraftLevels] = useState<IndicatorRiskLevelRow[]>([]);
  const [baselineLevels, setBaselineLevels] = useState<IndicatorRiskLevelRow[]>([]);
  const [form] = Form.useForm();
  const detailMountHandledRef = useRef<string | null>(null);
  const saveInFlightRef = useRef(false);
  const watchedLabel = Form.useWatch('label', form);

  const sorted = useMemo(() => sortRiskLevelRecords(records), [records]);
  const activeRecord = useMemo(() => getActiveRiskLevelRecord(records), [records]);

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
    () => (editing ? editing.versionNo : nextRiskLevelVersionNo(records)),
    [editing, records],
  );

  const draftConfig = useMemo(
    (): RiskLevelVersionConfig => buildRiskLevelSnapshot(draftLevels),
    [draftLevels],
  );
  const copyHasMeaningfulChanges = useMemo(
    () =>
      !copySourceVersionNo ||
      hasMeaningfulRiskLevelCopyChanges(
        baselineLevels,
        draftLevels,
        copySuggestedLabel,
        watchedLabel,
      ),
    [baselineLevels, copySourceVersionNo, copySuggestedLabel, draftLevels, watchedLabel],
  );

  const patchRecords = async (next: RiskLevelVersionRecord[]): Promise<boolean> => {
    try {
      await onChange(sortRiskLevelRecords(ensureRiskLevelVersionNos(next)));
      return true;
    } catch (error) {
      message.error(error instanceof Error ? error.message : '工作区保存失败，请重试');
      return false;
    }
  };

  const isReferenced = (row: RiskLevelVersionRecord) =>
    points.some(
      point =>
        point.ratingResult?.riskLevelRefId === row.id ||
        point.ratingResult?.riskLevelVersionNo === row.versionNo,
    ) || riskChangeLogs.some(log => log.riskLevelVersionNo === row.versionNo);

  const closeModal = () => {
    setModalOpen(false);
    setCopySourceVersionNo(null);
    setCopySuggestedLabel('');
  };

  const requestClose = () => {
    const dirty =
      !detailOnly &&
      (form.isFieldsTouched() ||
        JSON.stringify(draftLevels) !== JSON.stringify(baselineLevels));
    if (!dirty) {
      closeModal();
      return;
    }
    Modal.confirm({
      title: '放弃未保存修改？',
      content: '关闭后，本次对等级版本的修改将不会保存。',
      okText: '放弃修改',
      cancelText: '继续编辑',
      onOk: closeModal,
    });
  };

  const openCreate = () => {
    const baseLevels = activeRecord
      ? getLevelsFromRecord(activeRecord)
      : initialIndicatorRiskLevels.map(row => ({ ...row, builtin: true }));
    setEditing(null);
    setCopySourceVersionNo(null);
    setCopySuggestedLabel('');
    setDetailOnly(false);
    const cloned = baseLevels.map(row => ({ ...row }));
    setBaselineLevels(cloned);
    setDraftLevels(cloned);
    form.resetFields();
    form.setFieldsValue({
      configAt: dayjs(),
      label: '',
      updatedBy: '',
    });
    setModalOpen(true);
  };

  const openDetail = (row: RiskLevelVersionRecord) => {
    const levels = getLevelsFromRecord(row).map(r => ({ ...r }));
    setEditing(row);
    setCopySourceVersionNo(null);
    setCopySuggestedLabel('');
    setDetailOnly(true);
    setBaselineLevels(levels);
    setDraftLevels(levels);
    form.resetFields();
    form.setFieldsValue(recordToFormValues(row));
    setModalOpen(true);
  };

  const openEdit = (row: RiskLevelVersionRecord) => {
    const levels = getLevelsFromRecord(row).map(r => ({ ...r }));
    const immutable = isRiskLevelVersionImmutable(row, isReferenced(row));
    const suggestedLabel = immutable
      ? (row.label ? `${row.label}（复制）` : `复制自 ${row.versionNo}`)
      : '';
    setEditing(immutable ? null : row);
    setCopySourceVersionNo(immutable ? row.versionNo : null);
    setCopySuggestedLabel(suggestedLabel);
    setDetailOnly(false);
    setBaselineLevels(levels);
    setDraftLevels(levels);
    form.resetFields();
    form.setFieldsValue(
      immutable
        ? {
            ...recordToFormValues(row),
            configAt: dayjs(),
            label: suggestedLabel,
          }
        : recordToFormValues(row),
    );
    if (immutable) {
      message.info(`${row.versionNo} 已锁定，将复制为 ${nextRiskLevelVersionNo(records)} 编辑`);
    }
    setModalOpen(true);
  };

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

  const handleSetActive = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const target = records.find(r => r.id === id);
    const referenceIssue = target
      ? getRiskLevelRatingReferenceIssue(target)
      : '未找到该等级版本';
    if (referenceIssue) {
      message.warning(referenceIssue);
      return;
    }
    if (!(await patchRecords(setActiveRiskLevelRecord(records, id)))) return;
    message.success('已设为定级引用（全县 V→等级映射方案）');
  };

  const handleDelete = async (id: string) => {
    const target = records.find(r => r.id === id);
    if (!target) return;
    if (isRiskLevelVersionImmutable(target, isReferenced(target))) {
      message.warning('该版本已完成、正在引用或已有历史定级依赖，不可删除');
      return;
    }
    const next = records.filter(r => r.id !== id);
    if (!(await patchRecords(next))) return;
    closeModal();
    message.success('已删除');
  };

  const handleSave = async () => {
    if (saveInFlightRef.current) return;
    if (copySourceVersionNo && !copyHasMeaningfulChanges) {
      message.warning('尚未修改等级区间或批次说明，不会生成重复版本');
      return;
    }
    saveInFlightRef.current = true;
    try {
      const values = await form.validateFields();
      const configAt = (values.configAt as Dayjs).format('YYYY-MM-DD HH:mm:ss');
      const validation = validateRiskLevelConfig({ ...draftConfig, levels: draftLevels });
      const nextConfig: RiskLevelVersionConfig = {
        levels: draftLevels.map(row => ({ ...row })),
        updatedBy: values.updatedBy?.trim() || undefined,
        updatedAt: configAt,
        status: validation.ok ? 'completed' : 'draft',
      };

      const nextRecord: RiskLevelVersionRecord = editing
        ? {
            ...editing,
            configAt,
            label: values.label?.trim() || undefined,
            config: nextConfig,
          }
        : {
            ...emptyRiskLevelVersionRecord(),
            id: `rlvl-${Date.now()}`,
            versionNo: nextRiskLevelVersionNo(records),
            configAt,
            label: values.label?.trim() || undefined,
            activeForRating: records.length === 0 && validation.ok,
            config: nextConfig,
          };

      if (!(await patchRecords(
        editing ? records.map(r => (r.id === editing.id ? nextRecord : r)) : [nextRecord, ...records],
      ))) return;

      if (!validation.ok) {
        message.warning('等级区间配置未通过校验，已保存为草稿；完善后可设为定级引用');
        setEditing(nextRecord);
        setCopySourceVersionNo(null);
        setCopySuggestedLabel('');
        setBaselineLevels(nextRecord.config.levels.map(row => ({ ...row })));
        form.resetFields();
        form.setFieldsValue(recordToFormValues(nextRecord));
      } else {
        message.success(
          `已保存 ${nextRecord.versionNo}${nextRecord.activeForRating ? '，当前为定级引用版本' : ''}`,
        );
        closeModal();
      }
    } finally {
      saveInFlightRef.current = false;
    }
  };

  const switchDetailToEdit = () => {
    if (editing) openEdit(editing);
  };

  const columns: ColumnsType<RiskLevelVersionRecord> = [
    {
      title: '版本编号',
      dataIndex: 'versionNo',
      width: 88,
      render: (v: string) => (
        <RiskLevelVersionTag variant="plain" versionNo={v || undefined} />
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
    },
    {
      title: '启用档数',
      width: 88,
      render: (_, row) => {
        const s = summarizeRiskLevelRecord(row);
        return `${s.enabledCount} / ${s.totalCount}`;
      },
    },
    {
      title: '区间校验',
      width: 100,
      render: (_, row) => {
        const s = summarizeRiskLevelRecord(row);
        return (
          <Tag color={s.rangeValid ? 'success' : 'error'}>
            {s.rangeValid ? '通过' : `${s.issueCount} 项未通过`}
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
          <Tooltip title="内涝定级与等级试算以该条 V→等级映射为准">
            <QuestionCircleOutlined
              style={{ marginLeft: 4, color: 'rgba(0,0,0,0.45)', fontSize: 13, cursor: 'help' }}
            />
          </Tooltip>
        </span>
      ),
      width: 108,
      render: (_, row) => {
        if (!row.activeForRating) return '—';
        const referenceIssue = getRiskLevelRatingReferenceIssue(row);
        return referenceIssue ? (
          <Tooltip title={referenceIssue}>
            <Tag color="error">引用无效</Tag>
          </Tooltip>
        ) : (
          <Tag color="blue" icon={<StarFilled />}>
            当前引用
          </Tag>
        );
      },
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
      width: 160,
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
            {isRiskLevelVersionImmutable(row, isReferenced(row)) ? '复制编辑' : '编辑'}
          </Button>
          {!row.activeForRating && row.config.status === 'completed'
            ? (() => {
                const referenceIssue = getRiskLevelRatingReferenceIssue(row);
                return (
                  <Tooltip title={referenceIssue ?? '设为定级引用'}>
                    <span>
                      <Button
                        type="link"
                        size="small"
                        icon={<StarOutlined />}
                        className="action-btn"
                        disabled={Boolean(referenceIssue)}
                        onClick={e => handleSetActive(row.id, e)}
                      >
                        引用
                      </Button>
                    </span>
                  </Tooltip>
                );
              })()
            : null}
        </Space>
      ),
    },
  ];

  const modalTitleText = detailOnly
    ? '等级版本详情'
    : editing
      ? '编辑等级版本'
      : '新增等级版本';

  const modalTitle = (
    <Space align="center" size="small">
      <span>{modalTitleText}</span>
      {editing ? (
        <>
          <RiskLevelVersionTag versionNo={editing.versionNo} />
          {editing.activeForRating ? <Tag color="blue">定级引用版本</Tag> : null}
          <Tag color={draftConfig.status === 'completed' ? 'success' : 'default'}>
            {draftConfig.status === 'completed' ? '已完成' : '草稿'}
          </Tag>
        </>
      ) : null}
    </Space>
  );

  return (
    <div className="dq-risk-page dq-risk-level-versions-page">
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
          <Col flex="auto" style={{ textAlign: 'right' }}>
            <Space wrap>
              <Button type="primary" icon={<SearchOutlined />} className="search-btn">
                查询
              </Button>
              <Button onClick={resetFilters}>重置</Button>
              <Button type="primary" icon={<PlusOutlined />} className="add-btn" onClick={openCreate}>
                新增版本
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card bordered={false} style={{ marginTop: 12 }} title="风险等级管理">
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          以版本编号（L001、L002…）管理综合分 V 与风险等级的映射区间；定级与试算采用「定级引用」版本。导则预置三档可编辑区间与展示，不可删除。
        </Typography.Paragraph>
        {!records.length ? (
          <Empty description="暂无等级版本，请先新增">
            <Button type="primary" onClick={openCreate}>
              新增版本
            </Button>
          </Empty>
        ) : (
          <Table<RiskLevelVersionRecord>
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={filtered}
            pagination={{ defaultPageSize: 8, showSizeChanger: false }}
            scroll={{ x: 1160 }}
          />
        )}
      </Card>

      <Modal
        title={modalTitle}
        open={modalOpen}
        className="dq-risk-level-version-modal"
        onCancel={requestClose}
        width={1200}
        centered
        footer={
          detailOnly ? (
            <Button type="primary" icon={<EditOutlined />} onClick={switchDetailToEdit}>
              编辑
            </Button>
          ) : (
            <Space>
              <Button onClick={requestClose}>取消</Button>
              {editing ? (
                <Popconfirm title="确定删除该条等级版本？" onConfirm={() => handleDelete(editing.id)}>
                  <Button danger>删除</Button>
                </Popconfirm>
              ) : null}
              <Button type="primary" onClick={handleSave}>
                保存
              </Button>
            </Space>
          )
        }
        destroyOnClose
      >
        {copySourceVersionNo ? (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message={`正在复制 ${copySourceVersionNo} 为 ${pendingVersionNo}`}
            description="来源版本保持只读且不会被覆盖；保存后生成新的等级版本。"
          />
        ) : null}
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
                <Input placeholder="如：2026 汛前阈值调整" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="updatedBy" label="维护人">
                <Input placeholder="选填" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
        <RiskLevelEditor
          levels={draftLevels}
          baselineLevels={baselineLevels}
          onChange={detailOnly ? undefined : setDraftLevels}
          readOnly={detailOnly}
        />
      </Modal>
    </div>
  );
};
