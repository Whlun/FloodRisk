/**
 * 设施管理 · 排口管理 · 问题列表
 * 支持问题上报：行政区划（到乡镇）→ 关联排口、状态、问题类型、图片/视频上传、上报人、上报时间。
 */
import React, { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Checkbox,
  DatePicker,
  Descriptions,
  Divider,
  Dropdown,
  Form,
  Input,
  MenuProps,
  Modal,
  Row,
  Col,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  TreeSelect,
  Upload,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import { DownloadOutlined, EditOutlined, EyeOutlined, PlusOutlined, SearchOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { SHAOSHAN_ADMIN_TREE_TO_VILLAGE, formatShaoshanAdminDivisionDisplay } from '../生态整治/riverChiefDb4401';
import { outletData } from './facility-points-data';
import { normalizeResponsiblePartyOutletCodes, outletResponsiblePartyInitial } from './facility-outlet-responsible-data';
import {
  outletIssueInitial,
  type IssuePriority,
  type IssueStatus,
  type OutletIssueRecord,
  type RectifyStatus,
} from './facility-outlet-issue-data';
import { downloadTableFullExcel } from '../shared/facilityTableXlsxExport';

type IssueRecord = OutletIssueRecord;

type IssueFormValues = {
  行政区划?: string;
  关联排口编码?: string;
  责任主体?: string;
  整改优先级?: IssuePriority;
  状态?: IssueStatus;
  问题类型?: string[];
  问题类型预设?: string[];
  问题类型自定义?: string;
  整改建议?: string;
  整改状态?: RectifyStatus;
  整改完成时间?: Dayjs;
  整改负责人?: string;
  联系电话?: string;
  整改描述?: string;
  整改媒体文件?: string;
  整改附件?: string;
  媒体文件?: string;
  上报人?: string;
  上报时间?: Dayjs;
};

const ISSUE_STATUS_OPTIONS: { value: IssueStatus; label: IssueStatus }[] = [
  { value: '待整治', label: '待整治' },
  { value: '待验收', label: '待验收' },
  { value: '待审核', label: '待审核' },
  { value: '已整治', label: '已整治' },
];

const ISSUE_PRIORITY_OPTIONS: { value: '紧急' | '普通'; label: '紧急' | '普通' }[] = [
  { value: '紧急', label: '紧急' },
  { value: '普通', label: '普通' },
];

const RECTIFY_STATUS_OPTIONS: { value: RectifyStatus; label: RectifyStatus }[] = [
  { value: '待整改', label: '待整改' },
  { value: '已完成', label: '已完成' },
  { value: '终止', label: '终止' },
];

type IssueColumnKey =
  | 'id'
  | '行政区划'
  | '关联排口编码'
  | '关联排口名称'
  | '责任主体'
  | '整改优先级'
  | '状态'
  | '问题类型'
  | '上报人'
  | '上报时间'
  | 'operation';

const ISSUE_TYPE_PRESET: string[] = [
  '在饮用水水源保护区、自然保护地及其他需要特殊保护区域内设置排污口',
  '经溯源发现为企业偷排或未经审批的工业排污口',
  '待清理合并（应纳管而未纳管）的排污口',
  '排污口未设置标识牌',
  '排污口和排污管线布局不合理、设施老化破损、排水不畅、检修维护难等问题',
  '排污口排水（污）水质感官差，超标排放',
  '经确认为仅有取水功能的口门',
  '雨洪排口晴天排水',
];

function getTownTreeData() {
  return SHAOSHAN_ADMIN_TREE_TO_VILLAGE.flatMap(city =>
    (city.children || []).map(town => ({
      title: town.title,
      value: String(town.value),
      key: String(town.value),
    })),
  );
}

function splitTextList(v?: string): string[] {
  return String(v || '')
    .split(/[;,，、\n]/)
    .map(x => x.trim())
    .filter(Boolean);
}

function genIssueId() {
  return `WT-${Date.now()}`;
}

function normalizeIssueTypes(presetValues: string[] = [], customText?: string): string[] {
  const customValues = String(customText || '')
    .split(/[;,，、\n]/)
    .map(x => x.trim())
    .filter(Boolean);
  return Array.from(new Set([...presetValues, ...customValues]));
}

function hasRectifyInfo(record: IssueRecord): boolean {
  return (
    String(record.整改完成时间 || '').trim().length > 0
    || String(record.整改负责人 || '').trim().length > 0
    || String(record.联系电话 || '').trim().length > 0
    || String(record.整改描述 || '').trim().length > 0
    || (record.整改媒体文件?.length || 0) > 0
    || (record.整改附件?.length || 0) > 0
    || String(record.整改状态 || '待整改') !== '待整改'
  );
}

function resolveResponsibleNameByOutletCode(outletCode?: string): string {
  const code = String(outletCode || '').trim();
  if (!code) return '';
  const linked = outletResponsiblePartyInitial.filter(item =>
    normalizeResponsiblePartyOutletCodes(item.关联排口编码列表).includes(code),
  );
  if (!linked.length) return '';
  const primary = linked.find(item => String(item.是否为主要责任主体 || '').trim() === '是');
  return String((primary || linked[0]).责任主体名称 || '').trim();
}

export const OutletIssueListView: React.FC<{
  onDetail: (title: string, content: React.ReactNode, modalWidth?: number | string) => void;
}> = ({ onDetail }) => {
  const [form] = Form.useForm<IssueFormValues>();
  const [filterForm] = Form.useForm<{
    status?: IssueStatus;
    issueType?: string;
    priority?: IssuePriority;
    responsible?: string;
    outletCode?: string;
    outletName?: string;
    reporterName?: string;
  }>();
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeFormTab, setActiveFormTab] = useState<'report' | 'rectify'>('report');
  const [statusFilter, setStatusFilter] = useState<IssueStatus | undefined>();
  const [outletNameFilter, setOutletNameFilter] = useState('');
  const [reporterNameFilter, setReporterNameFilter] = useState('');
  const [issueTypeFilter, setIssueTypeFilter] = useState<string | undefined>();
  const [priorityFilter, setPriorityFilter] = useState<IssuePriority | undefined>();
  const [responsibleFilter, setResponsibleFilter] = useState<string | undefined>();
  /** 排口编号关键字（输入框，包含匹配） */
  const [outletCodeFilter, setOutletCodeFilter] = useState<string | undefined>();
  const [visibleColumns, setVisibleColumns] = useState<IssueColumnKey[]>([
    'id',
    '行政区划',
    '关联排口编码',
    '关联排口名称',
    '责任主体',
    '整改优先级',
    '状态',
    '问题类型',
    '上报人',
    '上报时间',
    'operation',
  ]);
  const [data, setData] = useState<IssueRecord[]>([
    ...outletIssueInitial,
  ]);

  const townTreeData = useMemo(() => getTownTreeData(), []);
  const selectedTownCode = Form.useWatch('行政区划', form);

  const outletOptions = useMemo(() => {
    const townCode = String(selectedTownCode || '').trim();
    return outletData
      .filter(item => {
        if (!townCode) return true;
        const code = String(item.行政区划代码 || '');
        if (code.startsWith(townCode)) return true;
        const townLabel = formatShaoshanAdminDivisionDisplay(townCode);
        return townLabel ? String(item.所在行政区域 || '').includes(townLabel.replace('韶山市', '')) : false;
      })
      .map(item => ({
        value: item.入河入海排污口编码,
        label: `${item.入河入海排污口名称}（${item.入河入海排污口编码}）`,
      }));
  }, [selectedTownCode]);

  const filteredData = useMemo(() => {
    const outletNameKw = outletNameFilter.trim();
    const reporterNameKw = reporterNameFilter.trim();
    const outletCodeKw = (outletCodeFilter ?? '').trim();
    return data.filter(item => {
      if (statusFilter && item.状态 !== statusFilter) return false;
      if (issueTypeFilter && !item.问题类型.includes(issueTypeFilter)) return false;
      if (priorityFilter && item.整改优先级 !== priorityFilter) return false;
      if (responsibleFilter && item.责任主体 !== responsibleFilter) return false;
      if (outletCodeKw && !String(item.关联排口编码 ?? '').includes(outletCodeKw)) return false;
      if (outletNameKw && !String(item.关联排口名称 ?? '').includes(outletNameKw)) return false;
      if (reporterNameKw && !String(item.上报人 ?? '').includes(reporterNameKw)) return false;
      return true;
    });
  }, [data, issueTypeFilter, outletCodeFilter, outletNameFilter, priorityFilter, reporterNameFilter, responsibleFilter, statusFilter]);

  const issueTypeOptions = useMemo(
    () =>
      Array.from(new Set(data.flatMap(item => item.问题类型)))
        .filter(Boolean)
        .map(v => ({ value: v, label: v })),
    [data],
  );

  const responsibleOptions = useMemo(
    () =>
      Array.from(new Set(outletResponsiblePartyInitial.map(item => String(item.责任主体名称 || '').trim())))
        .filter(Boolean)
        .map(v => ({ value: v, label: v })),
    [],
  );

  const allColumns: ColumnsType<IssueRecord> = [
    { title: '问题编号', dataIndex: 'id', key: 'id', width: 180 },
    {
      title: '行政区划',
      dataIndex: '行政区划',
      key: '行政区划',
      width: 180,
      render: (v: string) => formatShaoshanAdminDivisionDisplay(v) || v,
    },
    { title: '排口编号', dataIndex: '关联排口编码', key: '关联排口编码', width: 180 },
    { title: '关联排口', dataIndex: '关联排口名称', key: '关联排口名称', width: 260 },
    { title: '责任主体', dataIndex: '责任主体', key: '责任主体', width: 220 },
    { title: '整改优先级', dataIndex: '整改优先级', key: '整改优先级', width: 120 },
    {
      title: '状态',
      dataIndex: '状态',
      key: '状态',
      width: 110,
      render: (v: IssueStatus) => {
        const color = v === '已整治' ? 'success' : v === '待审核' ? 'processing' : 'warning';
        return <Tag color={color}>{v}</Tag>;
      },
    },
    {
      title: '问题类型',
      dataIndex: '问题类型',
      key: '问题类型',
      width: 360,
      render: (v: string[]) => v.join('、'),
    },
    { title: '上报人', dataIndex: '上报人', key: '上报人', width: 110 },
    { title: '上报时间', dataIndex: '上报时间', key: '上报时间', width: 180 },
    {
      title: '操作',
      key: 'operation',
      fixed: 'right',
      width: 220,
      render: (_, r) => (
        <Space size={2}>
          <Button
            type="link"
            size="small"
            className="action-btn detail"
            icon={<EyeOutlined />}
            onClick={() =>
              onDetail(
                `问题详情 - ${r.id}`,
                <Tabs
                  defaultActiveKey="report"
                  items={[
                    {
                      key: 'report',
                      label: '问题上报',
                      children: (
                        <Descriptions bordered column={1} size="small">
                          <Descriptions.Item label="问题编号">{r.id}</Descriptions.Item>
                          <Descriptions.Item label="行政区划">{formatShaoshanAdminDivisionDisplay(r.行政区划) || r.行政区划}</Descriptions.Item>
                          <Descriptions.Item label="关联排口">
                            {`${r.关联排口名称}（${r.关联排口编码}）`}
                          </Descriptions.Item>
                          <Descriptions.Item label="责任主体">{r.责任主体 || '—'}</Descriptions.Item>
                          <Descriptions.Item label="整改优先级">{r.整改优先级}</Descriptions.Item>
                          <Descriptions.Item label="状态">{r.状态}</Descriptions.Item>
                          <Descriptions.Item label="问题类型">{r.问题类型.join('、')}</Descriptions.Item>
                          <Descriptions.Item label="整改建议">{r.整改建议 || '—'}</Descriptions.Item>
                          <Descriptions.Item label="上报人">{r.上报人}</Descriptions.Item>
                          <Descriptions.Item label="上报时间">{r.上报时间}</Descriptions.Item>
                          <Descriptions.Item label="图片/视频">{r.媒体文件.join('；') || '—'}</Descriptions.Item>
                        </Descriptions>
                      ),
                    },
                    {
                      key: 'rectify',
                      label: '整改信息',
                      children: (
                        <Descriptions bordered column={1} size="small">
                          <Descriptions.Item label="整改状态">{r.整改状态 || '待整改'}</Descriptions.Item>
                          <Descriptions.Item label="整改完成时间">{r.整改完成时间 || '—'}</Descriptions.Item>
                          <Descriptions.Item label="整改负责人">{r.整改负责人 || '—'}</Descriptions.Item>
                          <Descriptions.Item label="联系电话">{r.联系电话 || '—'}</Descriptions.Item>
                          <Descriptions.Item label="整改描述">{r.整改描述 || '—'}</Descriptions.Item>
                          <Descriptions.Item label="图片或视频上传">{r.整改媒体文件?.join('；') || '—'}</Descriptions.Item>
                          <Descriptions.Item label="整改附件">{r.整改附件?.join('；') || '—'}</Descriptions.Item>
                        </Descriptions>
                      ),
                    },
                  ]}
                />,
                900,
              )
            }
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            className="action-btn"
            onClick={() => {
              setEditingId(r.id);
              form.setFieldsValue({
                行政区划: r.行政区划,
                关联排口编码: r.关联排口编码,
                责任主体: r.责任主体,
                整改优先级: r.整改优先级,
                状态: r.状态,
                问题类型预设: r.问题类型.filter(v => ISSUE_TYPE_PRESET.includes(v)),
                问题类型自定义: r.问题类型.filter(v => !ISSUE_TYPE_PRESET.includes(v)).join('；'),
                整改建议: r.整改建议,
                整改状态: r.整改状态 || '待整改',
                整改完成时间: r.整改完成时间 ? dayjs(r.整改完成时间) : undefined,
                整改负责人: r.整改负责人,
                联系电话: r.联系电话,
                整改描述: r.整改描述,
                整改媒体文件: r.整改媒体文件?.join(';'),
                整改附件: r.整改附件?.join(';'),
                媒体文件: r.媒体文件.join(';'),
                上报人: r.上报人,
                上报时间: dayjs(r.上报时间),
              });
              setActiveFormTab('rectify');
              setAddOpen(true);
            }}
          >
            {hasRectifyInfo(r) ? '整改信息' : '整改填报'}
          </Button>
          <Button
            type="link"
            size="small"
            className="action-btn edit"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingId(r.id);
              form.setFieldsValue({
                行政区划: r.行政区划,
                关联排口编码: r.关联排口编码,
                责任主体: r.责任主体,
                整改优先级: r.整改优先级,
                状态: r.状态,
                问题类型预设: r.问题类型.filter(v => ISSUE_TYPE_PRESET.includes(v)),
                问题类型自定义: r.问题类型.filter(v => !ISSUE_TYPE_PRESET.includes(v)).join('；'),
                整改建议: r.整改建议,
                整改状态: r.整改状态 || '待整改',
                整改完成时间: r.整改完成时间 ? dayjs(r.整改完成时间) : undefined,
                整改负责人: r.整改负责人,
                联系电话: r.联系电话,
                整改描述: r.整改描述,
                整改媒体文件: r.整改媒体文件?.join(';'),
                整改附件: r.整改附件?.join(';'),
                媒体文件: r.媒体文件.join(';'),
                上报人: r.上报人,
                上报时间: dayjs(r.上报时间),
              });
              setActiveFormTab('report');
              setAddOpen(true);
            }}
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  const columnOptions: { key: IssueColumnKey; label: string; fixed?: boolean }[] = [
    { key: 'id', label: '问题编号' },
    { key: '行政区划', label: '行政区划' },
    { key: '关联排口编码', label: '排口编号' },
    { key: '关联排口名称', label: '关联排口' },
    { key: '责任主体', label: '责任主体' },
    { key: '整改优先级', label: '整改优先级' },
    { key: '状态', label: '状态' },
    { key: '问题类型', label: '问题类型' },
    { key: '上报人', label: '上报人' },
    { key: '上报时间', label: '上报时间' },
    { key: 'operation', label: '操作', fixed: true },
  ];
  const columns = allColumns.filter(col => visibleColumns.includes(col.key as IssueColumnKey));
  const fieldMenuItems: MenuProps['items'] = [
    {
      key: 'fields-panel',
      label: (
        <div style={{ width: 260 }} onClick={e => e.stopPropagation()}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>字段管理</div>
          <Divider style={{ margin: '8px 0' }} />
          <Checkbox.Group
            value={visibleColumns}
            onChange={vals => {
              const incoming = vals as IssueColumnKey[];
              const withOperation = incoming.includes('operation') ? incoming : [...incoming, 'operation'];
              setVisibleColumns(withOperation as any);
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            {columnOptions.map(opt => (
              <Checkbox key={opt.key} value={opt.key} disabled={opt.fixed}>
                {opt.label}
              </Checkbox>
            ))}
          </Checkbox.Group>
        </div>
      ),
    },
  ];

  const handleSave = () => {
    form.validateFields().then(vals => {
      const normalizedIssueTypes = normalizeIssueTypes(vals.问题类型预设, vals.问题类型自定义);
      if (!normalizedIssueTypes.length) {
        message.warning('请至少选择或输入一个问题类型');
        return;
      }
      const outletCode = String(vals.关联排口编码 || '');
      const outlet = outletData.find(item => item.入河入海排污口编码 === outletCode);
      if (!outlet) {
        message.warning('未找到关联排口，请重新选择');
        return;
      }
      const next: IssueRecord = {
        id: editingId || genIssueId(),
        行政区划: String(vals.行政区划 || ''),
        关联排口编码: outletCode,
        关联排口名称: outlet.入河入海排污口名称,
        责任主体: String(vals.责任主体 || ''),
        整改优先级: vals.整改优先级 || '普通',
        状态: vals.状态 || '待整治',
        问题类型: normalizedIssueTypes,
        整改建议: String(vals.整改建议 || '').trim(),
        整改状态: vals.整改状态 || '待整改',
        整改完成时间: vals.整改完成时间 ? vals.整改完成时间.format('YYYY-MM-DD HH:mm:ss') : '',
        整改负责人: String(vals.整改负责人 || '').trim(),
        联系电话: String(vals.联系电话 || '').trim(),
        整改描述: String(vals.整改描述 || '').trim(),
        整改媒体文件: splitTextList(vals.整改媒体文件),
        整改附件: splitTextList(vals.整改附件),
        媒体文件: splitTextList(vals.媒体文件),
        上报人: String(vals.上报人 || ''),
        上报时间: (vals.上报时间 || dayjs()).format('YYYY-MM-DD HH:mm:ss'),
      };
      setData(prev => (editingId ? prev.map(item => (item.id === editingId ? next : item)) : [next, ...prev]));
      message.success(editingId ? '问题编辑成功' : '问题上报成功');
      setAddOpen(false);
      setEditingId(null);
      setActiveFormTab('report');
      form.resetFields();
    });
  };

  const handleSearch = () => {
    const values = filterForm.getFieldsValue();
    setStatusFilter(values.status);
    setIssueTypeFilter(values.issueType);
    setPriorityFilter(values.priority);
    setResponsibleFilter(values.responsible);
    const oc = String(values.outletCode ?? '').trim();
    setOutletCodeFilter(oc || undefined);
    setOutletNameFilter(String(values.outletName || '').trim());
    setReporterNameFilter(String(values.reporterName || '').trim());
  };

  const handleReset = () => {
    filterForm.resetFields();
    setStatusFilter(undefined);
    setIssueTypeFilter(undefined);
    setPriorityFilter(undefined);
    setResponsibleFilter(undefined);
    setOutletCodeFilter(undefined);
    setOutletNameFilter('');
    setReporterNameFilter('');
  };

  const handleExport = () => {
    if (!filteredData.length) {
      message.warning('当前筛选条件下无数据可导出');
      return;
    }
    downloadTableFullExcel(
      filteredData as unknown as Record<string, unknown>[],
      [
        { key: 'id', title: '问题编号', dataIndex: 'id' },
        { key: '行政区划', title: '行政区划', dataIndex: '行政区划' },
        { key: '关联排口编码', title: '排口编号', dataIndex: '关联排口编码' },
        { key: '关联排口名称', title: '关联排口', dataIndex: '关联排口名称' },
        { key: '责任主体', title: '责任主体', dataIndex: '责任主体' },
        { key: '整改优先级', title: '整改优先级', dataIndex: '整改优先级' },
        { key: '状态', title: '状态', dataIndex: '状态' },
        { key: '问题类型', title: '问题类型', dataIndex: '问题类型' },
        { key: '上报人', title: '上报人', dataIndex: '上报人' },
        { key: '上报时间', title: '上报时间', dataIndex: '上报时间' },
        { key: '媒体文件', title: '图片/视频', dataIndex: '媒体文件' },
      ],
      '排口管理_问题列表',
      '问题列表',
      {
        formatByKey: {
          行政区划: v => formatShaoshanAdminDivisionDisplay(String(v ?? '')) || String(v ?? ''),
          问题类型: v => (Array.isArray(v) ? v.join('、') : ''),
          媒体文件: v => (Array.isArray(v) ? v.join('；') : ''),
        },
      },
    );
    message.success('已导出 Excel（全量字段）');
  };

  return (
    <Card
      title="问题列表"
      extra={
        <Space>
          <Button icon={<DownloadOutlined />} className="export-btn" onClick={handleExport}>
            导出Excel
          </Button>
          <Button icon={<UploadOutlined />} onClick={() => message.success('已导入问题列表（原型示意）')}>
            导入
          </Button>
          <Dropdown menu={{ items: fieldMenuItems }} trigger={['click']}>
            <Button>字段管理</Button>
          </Dropdown>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="add-btn"
            onClick={() => {
              form.setFieldsValue({
                状态: '待整治',
                整改优先级: '普通',
                整改状态: '待整改',
                上报时间: dayjs(),
              });
              setEditingId(null);
              setActiveFormTab('report');
              setAddOpen(true);
            }}
          >
            问题上报
          </Button>
        </Space>
      }
    >
      <Form form={filterForm}>
        <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Form.Item name="issueType" style={{ marginBottom: 0 }}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                style={{ width: '100%' }}
                placeholder="问题类型"
                options={issueTypeOptions}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Form.Item name="priority" style={{ marginBottom: 0 }}>
              <Select allowClear style={{ width: '100%' }} placeholder="整改优先级" options={ISSUE_PRIORITY_OPTIONS} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Form.Item name="responsible" style={{ marginBottom: 0 }}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                style={{ width: '100%' }}
                placeholder="责任主体"
                options={responsibleOptions}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Form.Item name="status" style={{ marginBottom: 0 }}>
              <Select allowClear style={{ width: '100%' }} placeholder="状态" options={ISSUE_STATUS_OPTIONS} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Form.Item name="outletName" style={{ marginBottom: 0 }}>
              <Input allowClear placeholder="关联排口名称" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Form.Item name="reporterName" style={{ marginBottom: 0 }}>
              <Input allowClear placeholder="上报人" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Form.Item name="outletCode" style={{ marginBottom: 0 }}>
              <Input allowClear placeholder="排口编号" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={24} lg={6} style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start' }}>
            <Form.Item style={{ marginBottom: 0 }}>
              <Space>
                <Button type="primary" className="search-btn" icon={<SearchOutlined />} onClick={handleSearch}>
                  查询
                </Button>
                <Button onClick={handleReset}>重置</Button>
              </Space>
            </Form.Item>
          </Col>
        </Row>
      </Form>

      <Table<IssueRecord>
        rowKey="id"
        size="middle"
        columns={columns}
        dataSource={filteredData}
        pagination={{ defaultPageSize: 10 }}
        scroll={{ x: 1890 }}
      />

      <Modal
        title={editingId ? '编辑问题' : '问题上报'}
        open={addOpen}
        onCancel={() => {
          setAddOpen(false);
          setEditingId(null);
          setActiveFormTab('report');
        }}
        onOk={handleSave}
        okText={editingId ? '保存' : '上报'}
        cancelText="取消"
        width={840}
        styles={{ body: { maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' } }}
      >
        <Form<IssueFormValues> layout="vertical" form={form}>
          <Tabs
            activeKey={activeFormTab}
            onChange={key => setActiveFormTab(key as 'report' | 'rectify')}
            items={[
              {
                key: 'report',
                label: '问题上报',
                children: (
                  <>
                    <Form.Item
                      name="行政区划"
                      label="行政区划（到乡镇）"
                      rules={[{ required: true, message: '请选择行政区划（乡镇）' }]}
                    >
                      <TreeSelect
                        allowClear
                        showSearch
                        treeData={townTreeData}
                        treeNodeFilterProp="title"
                        placeholder="请选择乡镇"
                        dropdownStyle={{ maxHeight: 320, overflow: 'auto' }}
                        onChange={() => form.setFieldsValue({ 关联排口编码: undefined, 责任主体: undefined })}
                      />
                    </Form.Item>
                    <Form.Item
                      name="关联排口编码"
                      label="关联排口（下拉单选）"
                      dependencies={['行政区划']}
                      rules={[{ required: true, message: '请选择关联排口' }]}
                    >
                      <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        options={outletOptions}
                        onChange={v => {
                          form.setFieldValue('责任主体', resolveResponsibleNameByOutletCode(String(v || '')));
                        }}
                        placeholder={
                          selectedTownCode
                            ? outletOptions.length
                              ? '请选择入河排口'
                              : '该乡镇暂无关联排口数据'
                            : '请先选择乡镇'
                        }
                        disabled={!selectedTownCode}
                      />
                    </Form.Item>
                    <Form.Item name="责任主体" label="责任主体（自动带入）" rules={[{ required: true, message: '请先选择关联排口' }]}>
                      <Input readOnly placeholder="选择关联排口后自动带入责任主体" />
                    </Form.Item>
                    <Form.Item name="整改优先级" label="整改优先级" rules={[{ required: true, message: '请选择整改优先级' }]}>
                      <Select allowClear options={ISSUE_PRIORITY_OPTIONS} placeholder="请选择整改优先级" />
                    </Form.Item>
                    <Form.Item name="状态" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
                      <Select allowClear options={ISSUE_STATUS_OPTIONS} placeholder="请选择状态" />
                    </Form.Item>
                    <Form.Item
                      label="问题类型"
                      tooltip="支持默认勾选，也可直接输入自定义类型"
                      required
                    >
                      <Space direction="vertical" style={{ width: '100%' }} size={8}>
                        <Form.Item
                          name="问题类型预设"
                          noStyle
                          dependencies={['问题类型自定义']}
                          rules={[
                            ({ getFieldValue }) => ({
                              validator: async (_, value) => {
                                const merged = normalizeIssueTypes(value || [], getFieldValue('问题类型自定义'));
                                if (merged.length) return;
                                throw new Error('请至少选择或输入一个问题类型');
                              },
                            }),
                          ]}
                        >
                          <Checkbox.Group
                            options={ISSUE_TYPE_PRESET.map(v => ({ label: v, value: v }))}
                            style={{ display: 'flex', flexWrap: 'wrap', rowGap: 8, columnGap: 16 }}
                          />
                        </Form.Item>
                        <Form.Item name="问题类型自定义" noStyle dependencies={['问题类型预设']}>
                          <Input placeholder="可输入自定义问题类型（可用逗号或分号分隔多个）" maxLength={200} />
                        </Form.Item>
                      </Space>
                    </Form.Item>
                    <Form.Item name="整改建议" label="整改建议">
                      <Input.TextArea
                        placeholder="请输入整改建议"
                        maxLength={500}
                        showCount
                        autoSize={{ minRows: 3, maxRows: 6 }}
                      />
                    </Form.Item>
                    <Form.Item label="图片/视频上传">
                      <Space direction="vertical" style={{ width: '100%' }} size={8}>
                        <Upload
                          beforeUpload={() => false}
                          multiple
                          accept="image/*,video/*"
                          fileList={splitTextList(form.getFieldValue('媒体文件')).map((name, idx) => ({
                            uid: `${name}-${idx}`,
                            name,
                            status: 'done',
                          })) as UploadFile[]}
                          onChange={info => {
                            const names = info.fileList.map(file => file.name).filter(Boolean);
                            form.setFieldValue('媒体文件', names.join(';'));
                          }}
                        >
                          <Button icon={<UploadOutlined />}>上传图片或视频</Button>
                        </Upload>
                        <Form.Item name="媒体文件" noStyle>
                          <Input placeholder="支持手动填写多个文件名或链接，使用分号分隔" maxLength={4000} />
                        </Form.Item>
                      </Space>
                    </Form.Item>
                    <Form.Item name="上报人" label="上报人" rules={[{ required: true, message: '请输入上报人' }]}>
                      <Input placeholder="请输入上报人" maxLength={30} />
                    </Form.Item>
                    <Form.Item name="上报时间" label="上报时间" rules={[{ required: true, message: '请选择上报时间' }]}>
                      <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm:ss" />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: 'rectify',
                label: '整改填报',
                children: (
                  <>
                    <Form.Item name="整改状态" label="整改状态" rules={[{ required: true, message: '请选择整改状态' }]}>
                      <Select allowClear options={RECTIFY_STATUS_OPTIONS} placeholder="请选择整改状态" />
                    </Form.Item>
                    <Form.Item name="整改完成时间" label="整改完成时间">
                      <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm:ss" />
                    </Form.Item>
                    <Form.Item name="整改负责人" label="整改负责人">
                      <Input placeholder="请输入整改负责人" maxLength={30} />
                    </Form.Item>
                    <Form.Item name="联系电话" label="联系电话">
                      <Input placeholder="请输入联系电话" maxLength={20} />
                    </Form.Item>
                    <Form.Item name="整改描述" label="整改描述">
                      <Input.TextArea
                        placeholder="请输入整改描述"
                        maxLength={1000}
                        showCount
                        autoSize={{ minRows: 4, maxRows: 8 }}
                      />
                    </Form.Item>
                    <Form.Item label="图片或者视频上传">
                      <Space direction="vertical" style={{ width: '100%' }} size={8}>
                        <Upload
                          beforeUpload={() => false}
                          multiple
                          accept="image/*,video/*"
                          fileList={splitTextList(form.getFieldValue('整改媒体文件')).map((name, idx) => ({
                            uid: `rectify-media-${name}-${idx}`,
                            name,
                            status: 'done',
                          })) as UploadFile[]}
                          onChange={info => {
                            const names = info.fileList.map(file => file.name).filter(Boolean);
                            form.setFieldValue('整改媒体文件', names.join(';'));
                          }}
                        >
                          <Button icon={<UploadOutlined />}>上传图片或视频</Button>
                        </Upload>
                        <Form.Item name="整改媒体文件" noStyle>
                          <Input placeholder="支持手动填写多个文件名或链接，使用分号分隔" maxLength={4000} />
                        </Form.Item>
                      </Space>
                    </Form.Item>
                    <Form.Item label="整改附件">
                      <Space direction="vertical" style={{ width: '100%' }} size={8}>
                        <Upload
                          beforeUpload={() => false}
                          multiple
                          fileList={splitTextList(form.getFieldValue('整改附件')).map((name, idx) => ({
                            uid: `rectify-file-${name}-${idx}`,
                            name,
                            status: 'done',
                          })) as UploadFile[]}
                          onChange={info => {
                            const names = info.fileList.map(file => file.name).filter(Boolean);
                            form.setFieldValue('整改附件', names.join(';'));
                          }}
                        >
                          <Button icon={<UploadOutlined />}>上传附件</Button>
                        </Upload>
                        <Form.Item name="整改附件" noStyle>
                          <Input placeholder="支持手动填写多个附件名或链接，使用分号分隔" maxLength={4000} />
                        </Form.Item>
                      </Space>
                    </Form.Item>
                  </>
                ),
              },
            ]}
          />
        </Form>
      </Modal>
    </Card>
  );
};
