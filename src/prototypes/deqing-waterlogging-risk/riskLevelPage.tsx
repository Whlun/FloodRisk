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
} from './types';
import { RiskLevelEditor } from './RiskLevelEditor';
import { RiskLevelVersionTag } from './RiskLevelVersionTag';
import {
  buildRiskLevelSnapshot,
  ensureRiskLevelVersionNos,
  getActiveRiskLevelRecord,
  getLevelsFromRecord,
  nextRiskLevelVersionNo,
  setActiveRiskLevelRecord,
  sortRiskLevelRecords,
  summarizeRiskLevelRecord,
  validateRiskLevelConfig,
} from './riskLevelVersionUtils';

const { RangePicker } = DatePicker;

interface Props {
  records: RiskLevelVersionRecord[];
  onChange: (records: RiskLevelVersionRecord[]) => void;
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
  const [draftLevels, setDraftLevels] = useState<IndicatorRiskLevelRow[]>([]);
  const [form] = Form.useForm();
  const detailMountHandledRef = useRef<string | null>(null);

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

  const patchRecords = (next: RiskLevelVersionRecord[]) => {
    onChange(sortRiskLevelRecords(ensureRiskLevelVersionNos(next)));
  };

  const openCreate = () => {
    const baseLevels = activeRecord
      ? getLevelsFromRecord(activeRecord)
      : initialIndicatorRiskLevels.map(row => ({ ...row, builtin: true }));
    setEditing(null);
    setDetailOnly(false);
    setDraftLevels(baseLevels.map(row => ({ ...row })));
    form.resetFields();
    form.setFieldsValue({
      configAt: dayjs(),
      label: '',
      updatedBy: '',
    });
    setModalOpen(true);
  };

  const openDetail = (row: RiskLevelVersionRecord) => {
    setEditing(row);
    setDetailOnly(true);
    setDraftLevels(getLevelsFromRecord(row));
    form.setFieldsValue(recordToFormValues(row));
    setModalOpen(true);
  };

  const openEdit = (row: RiskLevelVersionRecord) => {
    setEditing(row);
    setDetailOnly(false);
    setDraftLevels(getLevelsFromRecord(row));
    form.setFieldsValue(recordToFormValues(row));
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

  const handleSetActive = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const target = records.find(r => r.id === id);
    if (target?.config.status !== 'completed') {
      message.warning('请先保存并确保等级区间配置完整后再设为定级引用');
      return;
    }
    patchRecords(setActiveRiskLevelRecord(records, id));
    message.success('已设为定级引用（全县 V→等级映射方案）');
  };

  const handleDelete = (id: string) => {
    const next = records.filter(r => r.id !== id);
    if (!next.length) {
      patchRecords([]);
      return;
    }
    let patched = next;
    if (!next.some(r => r.activeForRating)) {
      const latest = sortRiskLevelRecords(next).find(r => r.config.status === 'completed');
      if (latest) patched = setActiveRiskLevelRecord(next, latest.id);
    }
    patchRecords(patched);
    message.success('已删除');
  };

  const handleSave = async () => {
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
          activeForRating: records.length === 0,
          config: nextConfig,
        };

    patchRecords(
      editing ? records.map(r => (r.id === editing.id ? nextRecord : r)) : [nextRecord, ...records],
    );

    if (!validation.ok) {
      message.warning('等级区间配置未通过校验，已保存为草稿；完善后可设为定级引用');
    } else {
      message.success(
        `已保存 ${nextRecord.versionNo}${nextRecord.activeForRating ? '，当前为定级引用版本' : ''}`,
      );
      setModalOpen(false);
    }
  };

  const switchDetailToEdit = () => {
    setDetailOnly(false);
  };

  const columns: ColumnsType<RiskLevelVersionRecord> = [
    {
      title: '版本编号',
      dataIndex: 'versionNo',
      width: 88,
      render: (v: string) => <RiskLevelVersionTag versionNo={v || undefined} />,
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
          <Popconfirm title="确定删除该条等级版本？" onConfirm={() => handleDelete(row.id)}>
            <Button type="link" size="small" danger className="action-btn">
              删除
            </Button>
          </Popconfirm>
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
            pagination={{ pageSize: 8, showSizeChanger: false }}
            scroll={{ x: 1180 }}
          />
        )}
      </Card>

      <Modal
        title={modalTitle}
        open={modalOpen}
        className="dq-risk-level-version-modal"
        onCancel={() => setModalOpen(false)}
        width="100vw"
        centered={false}
        style={{ top: 0, paddingBottom: 0, maxWidth: '100vw' }}
        styles={{ body: { flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' } }}
        onOk={detailOnly ? undefined : handleSave}
        okText="保存"
        footer={
          detailOnly
            ? [
                <Button
                  key="edit"
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={switchDetailToEdit}
                >
                  编辑
                </Button>,
              ]
            : undefined
        }
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
          onChange={detailOnly ? undefined : setDraftLevels}
          readOnly={detailOnly}
        />
      </Modal>
    </div>
  );
};
