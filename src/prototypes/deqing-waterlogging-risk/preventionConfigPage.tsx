import React, { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Divider,
  Modal,
  Popconfirm,
  Progress,
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
import {
  LEVEL1_FACTOR_LABEL,
  emptyRegionalPreventionRecord,
  type RegionalPreventionRecord,
  type RiskIndicatorRow,
} from './types';
import { getRegionalPreventionIndicators } from './indicatorSurveyUtils';
import { deriveAssessmentItemsFromIndicatorValues } from './scoreRuleMapping';
import { SurveyValueInput } from './SurveyValueInput';
import { SurveyFieldLabel } from './SurveyFieldLabel';
import { SurveyFieldRangeError } from './SurveyFieldRangeError';
import { createNumericSurveyFormRules } from './numericIndicatorConstraints';
import { calcTotalScorePartial } from './scoreCalculatorPartial';
import {
  SURVEY_FIELD_GRID_CLASS,
  SURVEY_MODAL_FORM_CLASS,
  surveyFieldGridRow,
} from './surveyFormLayout';
import { renderSurveyFieldGrid } from './surveyFieldLayout';
import { SurveyFormSection } from './SurveyFormSection';
import {
  setActiveRegionalPreventionRecord,
  sortRegionalPreventionRecords,
  summarizeRegionalPreventionRecord,
} from './regionalPreventionUtils';

const { Text } = Typography;
const { RangePicker } = DatePicker;

interface Props {
  records: RegionalPreventionRecord[];
  onChange: (records: RegionalPreventionRecord[]) => void;
  indicators: RiskIndicatorRow[];
}

function recordToFormValues(record: RegionalPreventionRecord | null) {
  if (!record) {
    const now = dayjs();
    return {
      configAt: now,
      label: '',
      indicatorValues: {},
      updatedBy: '',
    };
  }
  return {
    configAt: dayjs(record.configAt),
    label: record.label ?? '',
    indicatorValues: { ...record.config.indicatorValues },
    updatedBy: record.config.updatedBy ?? '',
  };
}

/** 全县防灾减灾：列表 + 弹窗（对齐风险普查交互） */
export const PreventionConfigPage: React.FC<Props> = ({ records, onChange, indicators }) => {
  const [configDateRange, setConfigDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [labelKeyword, setLabelKeyword] = useState('');
  const [reporterKeyword, setReporterKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'completed' | 'draft'>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOnly, setDetailOnly] = useState(false);
  const [editing, setEditing] = useState<RegionalPreventionRecord | null>(null);
  const [form] = Form.useForm();

  const regionalIndicators = useMemo(() => getRegionalPreventionIndicators(indicators), [indicators]);
  const sorted = useMemo(() => sortRegionalPreventionRecords(records), [records]);

  const indicatorValuesWatch = Form.useWatch('indicatorValues', form) as
    | Record<string, string | number | boolean | null>
    | undefined;

  const liveDerived = useMemo(() => {
    const values = indicatorValuesWatch ?? {};
    const items = deriveAssessmentItemsFromIndicatorValues(regionalIndicators, values);
    const selections: Record<string, string> = {};
    for (const [id, item] of Object.entries(items)) {
      if (item.ruleId) selections[id] = item.ruleId;
    }
    const mapped = regionalIndicators.filter(ind => selections[ind.id]).length;
    const v4 =
      mapped > 0 ? calcTotalScorePartial(indicators, 'SUNKEN', selections).v4 : null;
    return { mapped, v4, complete: mapped >= regionalIndicators.length && regionalIndicators.length > 0 };
  }, [indicatorValuesWatch, regionalIndicators, indicators]);

  const detailV4 = useMemo(() => {
    if (!detailOnly || !editing) return null;
    const items = deriveAssessmentItemsFromIndicatorValues(
      regionalIndicators,
      editing.config.indicatorValues,
    );
    const selections: Record<string, string> = {};
    for (const [id, item] of Object.entries(items)) {
      if (item.ruleId) selections[id] = item.ruleId;
    }
    if (!regionalIndicators.some(ind => selections[ind.id])) return null;
    return calcTotalScorePartial(indicators, 'SUNKEN', selections).v4;
  }, [detailOnly, editing, regionalIndicators, indicators]);

  const filtered = useMemo(() => {
    const from = configDateRange?.[0]?.startOf('day').format('YYYY-MM-DD HH:mm:ss');
    const to = configDateRange?.[1]?.endOf('day').format('YYYY-MM-DD HH:mm:ss');
    return sorted.filter(r => {
      if (statusFilter && r.config.assessmentStatus !== statusFilter) return false;
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
  }, [sorted, configDateRange, labelKeyword, reporterKeyword, statusFilter]);

  const resetFilters = () => {
    setConfigDateRange(null);
    setLabelKeyword('');
    setReporterKeyword('');
    setStatusFilter('');
  };

  const patchRecords = (next: RegionalPreventionRecord[]) => {
    onChange(sortRegionalPreventionRecords(next));
  };

  const openCreate = () => {
    setEditing(null);
    setDetailOnly(false);
    form.resetFields();
    form.setFieldsValue({
      configAt: dayjs(),
      label: '',
      indicatorValues: {},
      updatedBy: '',
    });
    setModalOpen(true);
  };

  const openDetail = (row: RegionalPreventionRecord) => {
    setEditing(row);
    setDetailOnly(true);
    form.setFieldsValue(recordToFormValues(row));
    setModalOpen(true);
  };

  const openEdit = (row: RegionalPreventionRecord) => {
    setEditing(row);
    setDetailOnly(false);
    form.setFieldsValue(recordToFormValues(row));
    setModalOpen(true);
  };

  const handleSetActive = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const target = records.find(r => r.id === id);
    if (target?.config.assessmentStatus !== 'completed') {
      message.warning('请先保存并确保配置完整后再设为数据引用');
      return;
    }
    patchRecords(setActiveRegionalPreventionRecord(records, id));
    message.success('已设为数据引用（全县 V₄ 计算版本）');
  };

  const handleDelete = (id: string) => {
    const next = records.filter(r => r.id !== id);
    if (!next.length) {
      patchRecords([]);
      return;
    }
    let patched = next;
    if (!next.some(r => r.activeForRating)) {
      const latest = sortRegionalPreventionRecords(next).find(
        r => r.config.assessmentStatus === 'completed',
      );
      if (latest) patched = setActiveRegionalPreventionRecord(next, latest.id);
    }
    patchRecords(patched);
    message.success('已删除');
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    const configAt = (values.configAt as Dayjs).format('YYYY-MM-DD HH:mm:ss');
    const indicatorValues = values.indicatorValues ?? {};
    const items = deriveAssessmentItemsFromIndicatorValues(regionalIndicators, indicatorValues);
    const completed =
      regionalIndicators.length > 0 &&
      regionalIndicators.every(ind => items[ind.id]?.ruleId);

    const nextRecord: RegionalPreventionRecord = editing
      ? {
          ...editing,
          configAt,
          label: values.label?.trim() || undefined,
          config: {
            ...editing.config,
            indicatorValues,
            assessmentStatus: completed ? 'completed' : 'draft',
            assessmentPayload: {
              ...editing.config.assessmentPayload,
              items,
              assessedAt: configAt,
            },
            updatedAt: configAt,
            updatedBy: values.updatedBy,
          },
        }
      : {
          ...emptyRegionalPreventionRecord(),
          id: `rp-${Date.now()}`,
          configAt,
          label: values.label?.trim() || undefined,
          activeForRating: records.length === 0,
          config: {
            ...emptyRegionalPreventionRecord().config,
            indicatorValues,
            assessmentStatus: completed ? 'completed' : 'draft',
            assessmentPayload: {
              ...emptyRegionalPreventionRecord().config.assessmentPayload,
              items,
              assessedAt: configAt,
            },
            updatedAt: configAt,
            updatedBy: values.updatedBy,
          },
        };

    patchRecords(
      editing
        ? records.map(r => (r.id === editing.id ? nextRecord : r))
        : [nextRecord, ...records],
    );

    if (!completed) {
      message.warning('请补全指标配置，确保每项均能自动匹配赋分档');
    } else {
      message.success(
        `已保存（V₄≈${liveDerived.v4 != null ? liveDerived.v4.toFixed(4) : '—'}）${
          nextRecord.activeForRating ? '，当前为数据引用版本' : ''
        }`,
      );
      setModalOpen(false);
    }
  };

  const columns: ColumnsType<RegionalPreventionRecord> = [
    {
      title: '配置时间',
      dataIndex: 'configAt',
      width: 168,
      render: (v: string, row) => (
        <Space direction="vertical" size={0}>
          <span>{v}</span>
          {row.label ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {row.label}
            </Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: '数据完整度',
      width: 120,
      render: (_, row) => {
        const s = summarizeRegionalPreventionRecord(indicators, row);
        return <Progress percent={s.percent} size="small" />;
      },
    },
    {
      title: 'V₄',
      width: 88,
      render: (_, row) => {
        const v4 = summarizeRegionalPreventionRecord(indicators, row).v4;
        return v4 != null ? v4.toFixed(4) : '—';
      },
    },
    {
      title: '状态',
      width: 90,
      render: (_, row) => (
        <Tag color={row.config.assessmentStatus === 'completed' ? 'success' : 'default'}>
          {row.config.assessmentStatus === 'completed' ? '已完成' : '草稿'}
        </Tag>
      ),
    },
    {
      title: (
        <span>
          数据引用
          <Tooltip title="易涝点定级计算 V₄ 以该条全县防灾减灾指标为准">
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
      title: '填报人',
      dataIndex: ['config', 'updatedBy'],
      width: 88,
      ellipsis: true,
      render: (v: string | undefined) => v || '—',
    },
    {
      title: '操作',
      width: 200,
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
          {!row.activeForRating && row.config.assessmentStatus === 'completed' ? (
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
          <Popconfirm title="确定删除该条配置？" onConfirm={() => handleDelete(row.id)}>
            <Button type="link" size="small" danger className="action-btn">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const modalTitle = detailOnly
    ? '防灾减灾指标信息详情'
    : editing
      ? '编辑防灾减灾指标信息'
      : '新增防灾减灾指标信息';

  return (
    <div className="dq-risk-page dq-prevention-timeline-page">
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
              placeholder="填报人"
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
                新增配置
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card bordered={false} style={{ marginTop: 12 }}>
        <Table<RegionalPreventionRecord>
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={filtered}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          scroll={{ x: 960 }}
        />
      </Card>

      <Modal
        title={modalTitle}
        open={modalOpen}
        className="dq-prevention-config-modal"
        onCancel={() => setModalOpen(false)}
        width={900}
        onOk={detailOnly ? undefined : handleSave}
        okText="保存"
        footer={
          detailOnly
            ? [<Button key="close" onClick={() => setModalOpen(false)}>关闭</Button>]
            : undefined
        }
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          disabled={detailOnly}
          className={`${SURVEY_MODAL_FORM_CLASS}${detailOnly ? ' dq-form-detail-view' : ''}`}
        >
          {editing ? (
            <Space style={{ marginBottom: 12 }} wrap align="center">
              {editing.activeForRating ? <Tag color="blue">数据引用版本</Tag> : null}
              <Tag color={editing.config.assessmentStatus === 'completed' ? 'success' : 'default'}>
                {editing.config.assessmentStatus === 'completed' ? '已完成' : '草稿'}
              </Tag>
              {detailOnly && detailV4 != null ? (
                <Tag color="processing">V₄ ≈ {detailV4.toFixed(4)}</Tag>
              ) : null}
              {!detailOnly && liveDerived.v4 != null ? (
                <Tag color="processing">预览 V₄ ≈ {liveDerived.v4.toFixed(4)}</Tag>
              ) : null}
              {detailOnly ? (
                <Text type="secondary">
                  {editing.configAt}
                  {editing.label ? ` · ${editing.label}` : ''}
                  {editing.config.updatedBy ? ` · ${editing.config.updatedBy}` : ''}
                </Text>
              ) : null}
            </Space>
          ) : null}

          <Row
            {...surveyFieldGridRow}
            className={`${SURVEY_FIELD_GRID_CLASS} dq-survey-meta-fields`}
          >
            <Col xs={24} sm={8}>
              <Form.Item
                name="configAt"
                label="配置时间"
                rules={detailOnly ? undefined : [{ required: true, message: '请选择配置时间' }]}
              >
                <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm:ss" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="label" label="批次说明">
                <Input placeholder={detailOnly ? undefined : '如 2026 年上半年更新'} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="updatedBy" label="填报人">
                <Input placeholder={detailOnly ? undefined : '可选'} />
              </Form.Item>
            </Col>
          </Row>

          <Divider className="dq-survey-meta-divider" />

          <SurveyFormSection
            title={LEVEL1_FACTOR_LABEL.PREVENTION}
            hint={
              detailOnly
                ? undefined
                : '德清县全域统一填报；填写后保存时自动匹配赋分档。'
            }
          >
            {renderSurveyFieldGrid(regionalIndicators, ind => (
              <Form.Item
                name={['indicatorValues', ind.survey.fieldKey]}
                label={
                  <SurveyFieldLabel
                    ind={ind}
                    valueNamePath={['indicatorValues', ind.survey.fieldKey]}
                    showMatchedScoreTag={false}
                  />
                }
                extra={
                  detailOnly ? null : (
                    <SurveyFieldRangeError
                      ind={ind}
                      valueNamePath={['indicatorValues', ind.survey.fieldKey]}
                    />
                  )
                }
                rules={detailOnly ? undefined : createNumericSurveyFormRules(ind)}
              >
                <SurveyValueInput
                  ind={ind}
                  formVariant="prevention"
                  allIndicators={indicators}
                  valueNamePath={['indicatorValues', ind.survey.fieldKey]}
                  disabled={detailOnly}
                />
              </Form.Item>
            ))}
          </SurveyFormSection>

          {!detailOnly && editing && !editing.activeForRating && editing.config.assessmentStatus === 'completed' ? (
            <div style={{ marginTop: 8 }}>
              <Button icon={<StarOutlined />} onClick={() => handleSetActive(editing.id)}>
                设为数据引用
              </Button>
            </div>
          ) : null}
        </Form>
      </Modal>
    </div>
  );
};
