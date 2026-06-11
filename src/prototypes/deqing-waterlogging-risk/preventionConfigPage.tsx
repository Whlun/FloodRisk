import React, { useCallback, useMemo, useState } from 'react';
import {
  Button,
  Alert,
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
  type IndicatorArchitectureRecord,
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
  hasCompletedPreventionRefForArchitecture,
  setActiveRegionalPreventionRecord,
  sortRegionalPreventionRecords,
  summarizeRegionalPreventionRecord,
  validatePreventionArchitectureMatch,
} from './regionalPreventionUtils';
import {
  mergeIndicatorsForArchitectureRecord,
  resolveSurveyArchitectureRecord,
} from './indicatorArchitectureUtils';
import {
  ArchitectureVersionSelect,
  resolveSelectedArchitectureRecord,
} from './ArchitectureVersionSelect';
import { ArchitectureVersionRefTag } from './ArchitectureVersionRefTag';
import { ArchitectureVersionTag } from './ArchitectureVersionTag';
import { ArchitectureVersionRefAlert } from './ArchitectureVersionRefAlert';
import { PreventionVersionTag } from './PreventionVersionTag';
import {
  ensurePreventionVersionNos,
  nextPreventionVersionNo,
} from './preventionVersionUtils';

const { Text } = Typography;
const { RangePicker } = DatePicker;

interface Props {
  records: RegionalPreventionRecord[];
  onChange: (records: RegionalPreventionRecord[]) => void;
  /** 指标定义层 */
  baseIndicators: RiskIndicatorRow[];
  architectureRecords: IndicatorArchitectureRecord[];
  /** 定级引用的指标架构（下拉默认值） */
  ratingArchitectureRecord?: IndicatorArchitectureRecord | null;
  onViewArchitectureDetail?: (record: IndicatorArchitectureRecord) => void;
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
export const PreventionConfigPage: React.FC<Props> = ({
  records,
  onChange,
  baseIndicators,
  architectureRecords,
  ratingArchitectureRecord = null,
  onViewArchitectureDetail,
}) => {
  const [selectedArchitectureId, setSelectedArchitectureId] = useState('');
  const [configDateRange, setConfigDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [labelKeyword, setLabelKeyword] = useState('');
  const [reporterKeyword, setReporterKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'completed' | 'draft'>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOnly, setDetailOnly] = useState(false);
  const [editing, setEditing] = useState<RegionalPreventionRecord | null>(null);
  const [form] = Form.useForm();

  const resolveRecordArchitecture = (record: RegionalPreventionRecord | null) =>
    resolveSurveyArchitectureRecord(
      architectureRecords,
      record?.architectureRefId,
      ratingArchitectureRecord,
    );

  const formArchitectureRecord = useMemo(() => {
    if (editing) return resolveRecordArchitecture(editing);
    return resolveSelectedArchitectureRecord(
      architectureRecords,
      selectedArchitectureId,
      ratingArchitectureRecord,
    );
  }, [editing, architectureRecords, selectedArchitectureId, ratingArchitectureRecord]);

  const formIndicators = useMemo(
    () => mergeIndicatorsForArchitectureRecord(baseIndicators, formArchitectureRecord),
    [baseIndicators, formArchitectureRecord],
  );

  const indicatorsForRecord = useCallback(
    (record: RegionalPreventionRecord) =>
      mergeIndicatorsForArchitectureRecord(baseIndicators, resolveRecordArchitecture(record)),
    [baseIndicators, architectureRecords, ratingArchitectureRecord],
  );

  const regionalIndicators = useMemo(
    () => getRegionalPreventionIndicators(formIndicators),
    [formIndicators],
  );
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
      mapped > 0 ? calcTotalScorePartial(formIndicators, 'SUNKEN', selections).v4 : null;
    return { mapped, v4, complete: mapped >= regionalIndicators.length && regionalIndicators.length > 0 };
  }, [indicatorValuesWatch, regionalIndicators, formIndicators]);

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
    const rowIndicators = indicatorsForRecord(editing);
    return calcTotalScorePartial(rowIndicators, 'SUNKEN', selections).v4;
  }, [detailOnly, editing, regionalIndicators, indicatorsForRecord]);

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
      if (selectedArchitectureId && r.architectureRefId !== selectedArchitectureId) return false;
      return true;
    });
  }, [sorted, configDateRange, labelKeyword, reporterKeyword, statusFilter, selectedArchitectureId]);

  const resetFilters = () => {
    setConfigDateRange(null);
    setLabelKeyword('');
    setReporterKeyword('');
    setStatusFilter('');
    setSelectedArchitectureId('');
  };

  const patchRecords = (next: RegionalPreventionRecord[]) => {
    onChange(sortRegionalPreventionRecords(ensurePreventionVersionNos(next)));
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
    if (!target) return;
    if (target.config.assessmentStatus !== 'completed') {
      message.warning('请先保存并确保配置完整后再设为 V₄ 数据引用');
      return;
    }
    const archCheck = validatePreventionArchitectureMatch(target, ratingArchitectureRecord);
    if (!archCheck.ok) {
      message.warning(archCheck.message);
      return;
    }
    patchRecords(setActiveRegionalPreventionRecord(records, id));
    message.success('已设为 V₄ 数据引用（全县防灾减灾计分版本）');
  };

  const canSetPreventionRef = (row: RegionalPreventionRecord) => {
    if (row.config.assessmentStatus !== 'completed') return false;
    return validatePreventionArchitectureMatch(row, ratingArchitectureRecord).ok;
  };

  const preventionRefDisabledReason = (row: RegionalPreventionRecord) => {
    if (row.config.assessmentStatus !== 'completed') {
      return '须先完成配置并保存';
    }
    return validatePreventionArchitectureMatch(row, ratingArchitectureRecord).message;
  };

  const handleDelete = (id: string) => {
    const deleted = records.find(r => r.id === id);
    const next = records.filter(r => r.id !== id);
    if (!next.length) {
      patchRecords([]);
      return;
    }
    let patched = next;
    if (
      deleted?.activeForRating &&
      deleted.architectureRefId &&
      !next.some(r => r.activeForRating && r.architectureRefId === deleted.architectureRefId)
    ) {
      const latest = sortRegionalPreventionRecords(next).find(
        r =>
          r.config.assessmentStatus === 'completed' &&
          r.architectureRefId === deleted.architectureRefId,
      );
      if (latest) patched = setActiveRegionalPreventionRecord(next, latest.id);
    }
    patchRecords(patched);
    message.success('已删除');
    setModalOpen(false);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    const configAt = (values.configAt as Dayjs).format('YYYY-MM-DD HH:mm:ss');
    const indicatorValues = values.indicatorValues ?? {};
    const items = deriveAssessmentItemsFromIndicatorValues(regionalIndicators, indicatorValues);
    const completed =
      regionalIndicators.length > 0 &&
      regionalIndicators.every(ind => items[ind.id]?.ruleId);

    const bindArch = editing
      ? resolveRecordArchitecture(editing)
      : resolveSelectedArchitectureRecord(
          architectureRecords,
          selectedArchitectureId,
          ratingArchitectureRecord,
        );

    const nextRecord: RegionalPreventionRecord = editing
      ? {
          ...editing,
          configAt,
          label: values.label?.trim() || undefined,
          architectureRefId: editing.architectureRefId ?? bindArch?.id,
          architectureRefAt: editing.architectureRefAt ?? bindArch?.configAt,
          architectureVersionNo: editing.architectureVersionNo ?? bindArch?.versionNo,
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
          versionNo: nextPreventionVersionNo(records),
          configAt,
          label: values.label?.trim() || undefined,
          activeForRating: bindArch?.id
            ? !records.some(r => r.activeForRating && r.architectureRefId === bindArch.id)
            : records.length === 0,
          architectureRefId: bindArch?.id,
          architectureRefAt: bindArch?.configAt,
          architectureVersionNo: bindArch?.versionNo,
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
          nextRecord.activeForRating ? '，当前为 V₄ 数据引用' : ''
        }`,
      );
      setModalOpen(false);
    }
  };

  const columns: ColumnsType<RegionalPreventionRecord> = [
    {
      title: '防灾减灾版本',
      dataIndex: 'versionNo',
      width: 130,
      render: (v: string) => (
        <PreventionVersionTag variant="plain" versionNo={v || undefined} />
      ),
    },
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
      title: '绑定评价版本',
      width: 110,
      render: (_, row) =>
        row.architectureVersionNo ? (
          <ArchitectureVersionTag versionNo={row.architectureVersionNo} />
        ) : (
          '—'
        ),
    },
    {
      title: '数据完整度',
      width: 120,
      render: (_, row) => {
        const s = summarizeRegionalPreventionRecord(indicatorsForRecord(row), row);
        return <Progress percent={s.percent} size="small" />;
      },
    },
    {
      title: 'V₄',
      width: 88,
      render: (_, row) => {
        const v4 = summarizeRegionalPreventionRecord(indicatorsForRecord(row), row).v4;
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
          V₄ 数据引用
          <Tooltip title="定级计分 V₄ 以当前定级引用架构下、标记为 V₄ 数据引用的全县防灾减灾记录为准">
            <QuestionCircleOutlined
              style={{ marginLeft: 4, color: 'rgba(0,0,0,0.45)', fontSize: 13, cursor: 'help' }}
            />
          </Tooltip>
        </span>
      ),
      width: 120,
      render: (_, row) =>
        row.activeForRating ? (
          <Tag color="blue" icon={<StarFilled />}>
            V₄ 数据引用
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
      width: 168,
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
            canSetPreventionRef(row) ? (
              <Button
                type="link"
                size="small"
                icon={<StarOutlined />}
                className="action-btn"
                onClick={e => handleSetActive(row.id, e)}
              >
                引用
              </Button>
            ) : (
              <Tooltip title={preventionRefDisabledReason(row)}>
                <Button type="link" size="small" icon={<StarOutlined />} className="action-btn" disabled>
                  引用
                </Button>
              </Tooltip>
            )
          ) : null}
        </Space>
      ),
    },
  ];

  const modalTitleText = detailOnly
    ? '防灾减灾指标信息详情'
    : editing
      ? '编辑防灾减灾指标信息'
      : '新增防灾减灾指标信息';

  const modalTitle = (
    <Space align="center" size="small" wrap>
      <span>{modalTitleText}</span>
      {editing?.versionNo ? (
        <PreventionVersionTag versionNo={editing.versionNo} />
      ) : null}
      <ArchitectureVersionRefTag record={formArchitectureRecord} />
      {!editing ? <Text type="secondary">新建将绑定上述评价版本</Text> : null}
    </Space>
  );

  return (
    <div className="dq-risk-page dq-prevention-timeline-page">
      {ratingArchitectureRecord &&
      !hasCompletedPreventionRefForArchitecture(records, ratingArchitectureRecord) ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message={`当前定级引用架构 ${ratingArchitectureRecord.versionNo} 下尚无 V₄ 数据引用`}
          description="请在本架构下新建并完成防灾减灾指标信息填报，再「设为 V₄ 数据引用」，否则无法进行内涝定级。"
        />
      ) : null}

      <ArchitectureVersionRefAlert
        record={ratingArchitectureRecord}
        onViewDetail={onViewArchitectureDetail}
      />

      <Card bordered={false} className="filter-card">
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={6}>
            <ArchitectureVersionSelect
              records={architectureRecords}
              activeRecord={ratingArchitectureRecord}
              value={selectedArchitectureId}
              onChange={setSelectedArchitectureId}
              allowAll
            />
          </Col>
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
          pagination={{ defaultPageSize: 8, showSizeChanger: false }}
          scroll={{ x: 1040 }}
        />
      </Card>

      <Modal
        title={modalTitle}
        open={modalOpen}
        className="dq-prevention-config-modal"
        onCancel={() => setModalOpen(false)}
        width={900}
        footer={
          detailOnly ? (
            <Button onClick={() => setModalOpen(false)}>关闭</Button>
          ) : (
            <Space>
              <Button onClick={() => setModalOpen(false)}>取消</Button>
              {editing ? (
                <Popconfirm title="确定删除该条配置？" onConfirm={() => handleDelete(editing.id)}>
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
        <Form
          form={form}
          layout="vertical"
          disabled={detailOnly}
          className={`${SURVEY_MODAL_FORM_CLASS}${detailOnly ? ' dq-form-detail-view' : ''}`}
        >
          {editing ? (
            <Space style={{ marginBottom: 12 }} wrap align="center">
              {editing.activeForRating ? <Tag color="blue">V₄ 数据引用</Tag> : null}
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
                  allIndicators={formIndicators}
                  valueNamePath={['indicatorValues', ind.survey.fieldKey]}
                  disabled={detailOnly}
                />
              </Form.Item>
            ))}
          </SurveyFormSection>

          {!detailOnly && editing && !editing.activeForRating && editing.config.assessmentStatus === 'completed' ? (
            <div style={{ marginTop: 8 }}>
              {canSetPreventionRef(editing) ? (
                <Button icon={<StarOutlined />} onClick={() => handleSetActive(editing.id)}>
                  设为 V₄ 数据引用
                </Button>
              ) : (
                <Tooltip title={preventionRefDisabledReason(editing)}>
                  <Button icon={<StarOutlined />} disabled>
                    设为 V₄ 数据引用
                  </Button>
                </Tooltip>
              )}
            </div>
          ) : null}
        </Form>
      </Modal>
    </div>
  );
};
