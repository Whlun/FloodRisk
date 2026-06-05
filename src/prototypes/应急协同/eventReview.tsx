/**
 * 事件复盘：基于应急事件 + 事件评估，全生命周期展示（列表、查询、字段管理、导入导出示意、增删改查、详情）
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import * as echarts from 'echarts';
import {
  Card,
  Row,
  Col,
  Table,
  Tag,
  Button,
  Input,
  Select,
  Space,
  Typography,
  Modal,
  Form,
  message,
  Descriptions,
  DatePicker,
  Divider,
  Timeline,
  Statistic,
  Empty,
  Upload,
  Alert,
} from 'antd';
import type { FormInstance } from 'antd/es/form';
import {
  ColumnHeightOutlined,
  SearchOutlined,
  PlusOutlined,
  DownloadOutlined,
  UploadOutlined,
  EditOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { EmergencyEventRow, EventAssessmentRow } from './index';
import type { EmergencySupplyRow, EmergencyTeamRow, ExpertRow, SocialSupplyPointRow, TeamMemberRow } from './riskIdentification';
import { SHAOSHAN_ADDVCD_OPTIONS } from '../生态整治/riverChiefDb4401';
import {
  type EcoColumnConfig,
  RiskEcoColumnManager,
  getEcoDefaultVisibleColumnKeys,
  getEcoTableScrollX,
  buildTableColumnsFromEcoConfig,
} from './riskIdentification';
import { downloadTableFullExcel, getExportFieldLabel } from '../shared/facilityTableXlsxExport';

const { Text, Paragraph, Title } = Typography;
const { TextArea } = Input;

const formModalStyles = {
  body: {
    maxHeight: 'calc(100vh - 240px)',
    overflowY: 'auto' as const,
    overflowX: 'hidden' as const,
    minWidth: 0,
  },
};

const detailModalStyles = {
  ...formModalStyles,
  body: { ...formModalStyles.body, maxHeight: 'min(85vh, 900px)', overflowY: 'auto' as const },
};

const EcoProtoExportBtn = ({ onClick }: { onClick?: () => void }) => (
  <Button icon={<DownloadOutlined />} className="export-btn" onClick={onClick ?? (() => message.success('已导出'))}>
    导出Excel
  </Button>
);

function exportEventReviewExcel(
  rows: Record<string, unknown>[],
  columns: EcoColumnConfig[],
  filePrefix: string,
  sheetName: string,
) {
  if (!rows.length) {
    message.warning('当前筛选条件下无数据可导出');
    return;
  }
  const baseCols = columns
    .filter(c => c.key !== 'operation')
    .map(c => ({ key: c.key, title: String(c.title), dataIndex: String(c.dataIndex ?? c.key) }));
  const EXCLUDE_KEYS = new Set(['key']);
  const allRowKeys = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const missingKeys = allRowKeys.filter(
    k => !EXCLUDE_KEYS.has(k) && !baseCols.some(c => c.dataIndex === k || c.key === k),
  );
  const exportCols = [
    ...baseCols,
    ...missingKeys.map(k => ({ key: k, title: getExportFieldLabel(k), dataIndex: k })),
  ];
  downloadTableFullExcel(rows, exportCols, filePrefix, sheetName);
  message.success('已导出 Excel（全量字段）');
}

const EcoProtoImportBtn = () => (
  <Upload beforeUpload={() => { message.success('已导入'); return false; }} showUploadList={false}>
    <Button icon={<UploadOutlined />} className="secondary-btn">导入</Button>
  </Upload>
);

/** 过程时间线节点 */
export interface EventReviewTimelineNode {
  id: string;
  time: string;
  title: string;
  description: string;
}

/** 复盘中的队伍人员行（从风险库队伍点选） */
export interface EventReviewTeamPerson {
  id: string;
  teamId: string;
  teamName: string;
  memberName: string;
  role: string;
  phone: string;
}

/** 复盘物资行（来自社会物资点下的应急物资主数据） */
export interface EventReviewMaterialRow {
  id: string;
  /** 社会物资点 */
  socialPointId: string;
  /** 应急物资主数据 id */
  supplyId: string;
  materialType: string;
  name: string;
  /** 数量（数值或说明性填写） */
  quantity: string;
  /** 计量单位，如 ㎡、m、卷、台 */
  unit?: string;
}

/** 按复盘日期生成下一复盘编号：FP-年-MMDD-序号（同日递增） */
export function generateNextReviewCode(reviews: EventReviewRow[], date: dayjs.Dayjs): string {
  const prefix = `FP-${date.format('YYYY')}-${date.format('MMDD')}`;
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const suffixRe = new RegExp(`^${escaped}-(\\d{2})$`);
  let max = 0;
  for (const r of reviews) {
    const m = r.reviewCode.match(suffixRe);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}-${String(max + 1).padStart(2, '0')}`;
}

export interface EventReviewRow {
  id: string;
  reviewCode: string;
  linkedEventId: string;
  linkedAssessmentId: string;
  reviewTime: string;
  leadOrg: string;
  reviewSummary: string;
  expertIds: string[];
  teamPersonnel: EventReviewTeamPerson[];
  materials: EventReviewMaterialRow[];
  /** 图表用：各阶段耗时（小时，演示） */
  phaseHours: { name: string; value: number }[];
}

/** 仅允许已办结（处置完成）的事件发起复盘 */
export function isEventEligibleForReview(e: EmergencyEventRow): boolean {
  return Boolean(e.endDate?.trim());
}

/** 详情页专用：过程时间线仅含三节点，数据来自应急事件与事件评估，不在复盘中编辑 */
function buildDetailLifecycleTimeline(
  event: EmergencyEventRow,
  assessment: EventAssessmentRow | null,
): EventReviewTimelineNode[] {
  const nodes: EventReviewTimelineNode[] = [
    {
      id: 'tl-report',
      time: event.reportTime,
      title: '应急事件上报',
      description: `${event.eventTitle}；信息来源：${event.problemSource}；上报人：${event.reporterName || '—'}`,
    },
    {
      id: 'tl-disposal',
      time: event.eventDisposal?.completedTime || (event.endDate ? `${event.endDate}` : '—'),
      title: '事件处置',
      description:
        event.eventDisposal?.disposalDescribe?.trim() ||
        event.disposalProgress ||
        event.measuresTaken ||
        '—',
    },
  ];
  if (assessment) {
    nodes.push({
      id: 'tl-assess',
      time: assessment.assessTime,
      title: '事件评估',
      description: `${assessment.assessmentCode} · ${assessment.assessOrg}；${assessment.overallAssessment}`,
    });
  }
  return nodes;
}

function buildPhaseHoursDemo(event: EmergencyEventRow): { name: string; value: number }[] {
  const t0 = dayjs(event.occurTime);
  const t1 = event.eventDisposal?.completedTime ? dayjs(event.eventDisposal.completedTime) : t0.add(8, 'hour');
  const respond = Math.max(0.5, t1.diff(t0, 'hour', true));
  return [
    { name: '接报响应', value: Number(respond.toFixed(1)) },
    { name: '现场处置', value: 6.2 },
    { name: '监测加密', value: 4.0 },
    { name: '评估归档', value: 2.5 },
  ];
}

/** 同一事件多条评估时取评估日期最新的一条 */
function pickPrimaryAssessmentForEvent(assessments: EventAssessmentRow[], eventId: string): EventAssessmentRow | undefined {
  const list = assessments.filter(a => a.linkedEventId === eventId);
  if (list.length === 0) return undefined;
  return [...list].sort((a, b) => (b.assessTime || '').localeCompare(a.assessTime || ''))[0];
}

/** 编辑弹窗：展示根据关联事件自动解析的评估（只读） */
const EditLinkedAssessmentHint: React.FC<{
  form: FormInstance;
  assessments: EventAssessmentRow[];
}> = ({ form, assessments }) => {
  const eventId = Form.useWatch('linkedEventId', form);
  const assessmentId = Form.useWatch('linkedAssessmentId', form);
  if (!eventId) return null;
  const a = assessmentId ? assessments.find(x => x.id === assessmentId) : undefined;
  if (!a) {
    return (
      <Alert
        type="warning"
        showIcon
        message="该事件暂无关联评估"
        description="请先在「事件评估」中完成登记后，再发起复盘。"
        style={{ marginBottom: 16 }}
      />
    );
  }
  return (
    <div style={{ marginBottom: 16 }}>
      <Text type="secondary">已自动关联评估：</Text>
      <Text strong>{a.assessmentCode}</Text>
      <Text type="secondary">（{a.assessTime} · {a.assessOrg}）</Text>
    </div>
  );
};

/** 按复盘登记物资的「物资类型」汇总行数（用于详情统计图） */
function aggregateMaterialTypeCounts(materials: EventReviewMaterialRow[]): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const m of materials) {
    const t = m.materialType?.trim() || '未分类';
    map.set(t, (map.get(t) ?? 0) + 1);
  }
  return [...map.entries()].map(([name, value]) => ({ name, value }));
}

/** 详情页：物资类型统计（柱状图） */
const MaterialTypeBarChart: React.FC<{ materials: EventReviewMaterialRow[] }> = ({ materials }) => {
  const data = useMemo(() => aggregateMaterialTypeCounts(materials), [materials]);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || data.length === 0) return;
    const chart = echarts.init(ref.current);
    chart.setOption({
      color: ['#1e5bb5', '#1890ff', '#52c41a', '#faad14', '#722ed1'],
      tooltip: { trigger: 'axis' },
      grid: { left: 48, right: 24, bottom: 40, top: 28 },
      xAxis: {
        type: 'category',
        data: data.map(d => d.name),
        axisLabel: { fontSize: 11, interval: 0, rotate: data.length > 4 ? 20 : 0 },
      },
      yAxis: {
        type: 'value',
        name: '登记条数',
        minInterval: 1,
        splitLine: { lineStyle: { type: 'dashed' } },
      },
      series: [{ type: 'bar', data: data.map(d => d.value), barMaxWidth: 56 }],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [data]);
  if (data.length === 0) {
    return <Empty description="暂无物资登记，无法统计" />;
  }
  return <div ref={ref} style={{ height: 280, width: '100%' }} />;
};

/** 应急队伍多选；下方为所选队伍人员的统一列表，默认勾选该队伍全部人员，可取消勾选 */
const TeamPersonnelPicker: React.FC<{
  value?: EventReviewTeamPerson[];
  onChange?: (v: EventReviewTeamPerson[]) => void;
  teams: EmergencyTeamRow[];
}> = ({ value = [], onChange, teams }) => {
  const pickedTeamIds = useMemo(() => [...new Set(value.map(v => v.teamId))], [value]);

  const flatRows = useMemo(() => {
    const rows: { key: string; team: EmergencyTeamRow; member: TeamMemberRow }[] = [];
    for (const tid of pickedTeamIds) {
      const t = teams.find(x => x.id === tid);
      if (!t) continue;
      for (const m of t.members) {
        rows.push({ key: `tp-${tid}-${m.id}`, team: t, member: m });
      }
    }
    return rows;
  }, [pickedTeamIds, teams]);

  const handleTeamIdsChange = (ids: string[]) => {
    const prev = pickedTeamIds;
    const added = ids.filter(id => !prev.includes(id));
    const removed = prev.filter(id => !ids.includes(id));
    let next = value.filter(v => !removed.includes(v.teamId));
    for (const tid of added) {
      const t = teams.find(x => x.id === tid);
      if (!t) continue;
      for (const m of t.members) {
        const id = `tp-${tid}-${m.id}`;
        if (!next.some(x => x.id === id)) {
          next.push({
            id,
            teamId: tid,
            teamName: t.name,
            memberName: m.name,
            role: m.role,
            phone: m.phone,
          });
        }
      }
    }
    onChange?.(next);
  };

  const selectedRowKeys = value.map(v => v.id).filter(id => flatRows.some(r => r.key === id));

  return (
    <div>
      <Space wrap style={{ marginBottom: 8 }}>
        <Text type="secondary">选择队伍（可多选）：</Text>
        <Select
          mode="multiple"
          allowClear
          style={{ minWidth: 400 }}
          placeholder="选择队伍后默认纳入该队伍全部人员，可在下方表格中取消勾选"
          value={pickedTeamIds}
          onChange={handleTeamIdsChange}
          options={teams.map(t => ({ value: t.id, label: t.name }))}
        />
      </Space>
      <Table
        rowKey="key"
        size="small"
        pagination={false}
        locale={{ emptyText: '请先选择应急队伍' }}
        dataSource={flatRows}
        rowSelection={{
          selectedRowKeys,
          onChange: keys => {
            const keySet = new Set(keys as string[]);
            const next = flatRows
              .filter(r => keySet.has(r.key))
              .map(r => ({
                id: r.key,
                teamId: r.team.id,
                teamName: r.team.name,
                memberName: r.member.name,
                role: r.member.role,
                phone: r.member.phone,
              }));
            onChange?.(next);
          },
        }}
        columns={[
          { title: '队伍', width: 200, ellipsis: true, render: (_, r) => (r as (typeof flatRows)[0]).team.name },
          { title: '姓名', width: 100, render: (_, r) => (r as (typeof flatRows)[0]).member.name },
          { title: '岗位', width: 120, render: (_, r) => (r as (typeof flatRows)[0]).member.role },
          { title: '电话', width: 140, render: (_, r) => (r as (typeof flatRows)[0]).member.phone },
        ]}
      />
    </div>
  );
};

/** 新增复盘：展示将自动生成的编号（随复盘日期变化） */
const ReviewCodeAutoHint: React.FC<{ form: FormInstance; reviews: EventReviewRow[] }> = ({ form, reviews }) => {
  const rt = Form.useWatch('reviewTime', form);
  const text = useMemo(() => {
    if (!rt) return '请选择复盘日期后，系统将按「FP-年-MMDD-序号」规则自动生成编号';
    return `保存时将自动生成：${generateNextReviewCode(reviews, rt as dayjs.Dayjs)}`;
  }, [rt, reviews]);
  return (
    <div>
      <Text type="secondary">{text}</Text>
    </div>
  );
};

/** 物资：先选社会物资点，从该点下应急物资选品；支持多选批量改数量、批量删除 */
const MaterialsReviewEditor: React.FC<{
  supplies: EmergencySupplyRow[];
  socialPoints: SocialSupplyPointRow[];
  /** 编辑回填：首行物资点 */
  materialsPointSeed?: string;
}> = ({ supplies, socialPoints, materialsPointSeed }) => {
  const form = Form.useFormInstance();
  const [activePointId, setActivePointId] = useState<string | undefined>(materialsPointSeed);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [batchQty, setBatchQty] = useState('');

  useEffect(() => {
    setActivePointId(materialsPointSeed);
    setSelectedRowKeys([]);
    setBatchQty('');
  }, [materialsPointSeed]);

  const suppliesAtPoint = useMemo(
    () => (activePointId ? supplies.filter(s => s.socialPointId === activePointId) : []),
    [supplies, activePointId],
  );

  return (
    <Form.List name="materials">
      {(fields, { add, remove }) => {
        const onAddRow = () => {
          if (!activePointId) {
            message.warning('请先选择社会物资点');
            return;
          }
          add({
            id: `m-${Date.now()}`,
            socialPointId: activePointId,
            supplyId: '',
            materialType: '',
            name: '',
            quantity: '',
            unit: '',
          });
        };

        const applyPointChange = (id: string | undefined) => {
          if (fields.length > 0) {
            Modal.confirm({
              title: '更换物资点',
              content: '将清空当前物资列表，是否继续？',
              okText: '继续',
              cancelText: '取消',
              onOk: () => {
                setActivePointId(id);
                form.setFieldValue('materials', []);
                setSelectedRowKeys([]);
              },
            });
          } else {
            setActivePointId(id);
            setSelectedRowKeys([]);
          }
        };

        const applyBatchQuantity = () => {
          if (selectedRowKeys.length === 0) {
            message.warning('请先勾选表格中的行');
            return;
          }
          if (!batchQty.trim()) {
            message.warning('请填写要批量应用的数量');
            return;
          }
          const q = batchQty.trim();
          fields.forEach(f => {
            if (selectedRowKeys.includes(f.key)) {
              form.setFieldValue(['materials', f.name, 'quantity'], q);
            }
          });
          message.success('已更新选中行的数量');
        };

        const batchRemove = () => {
          if (selectedRowKeys.length === 0) {
            message.warning('请先勾选要删除的行');
            return;
          }
          const indices = fields
            .filter(f => selectedRowKeys.includes(f.key))
            .map(f => f.name as number)
            .sort((a, b) => b - a);
          indices.forEach(i => remove(i));
          setSelectedRowKeys([]);
          message.success('已删除选中行');
        };

        return (
          <>
            {/* 单行排列，窄屏时整行横向滚动不换行 */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'nowrap',
                gap: 8,
                marginBottom: 8,
                alignItems: 'center',
                width: '100%',
                overflowX: 'auto',
                paddingBottom: 2,
              }}
            >
              <Text type="secondary" style={{ flexShrink: 0 }}>
                社会物资点
              </Text>
              <Select
                allowClear
                placeholder="请选择物资点"
                style={{ minWidth: 200, flexShrink: 0 }}
                value={activePointId}
                onChange={v => applyPointChange(v)}
                options={socialPoints.map(p => ({ value: p.id, label: p.name }))}
              />
              <Button type="dashed" icon={<PlusOutlined />} onClick={onAddRow} style={{ flexShrink: 0 }}>
                添加物资行
              </Button>
              <Input
                placeholder="批量填写数量"
                value={batchQty}
                onChange={e => setBatchQty(e.target.value)}
                style={{ width: 140, flexShrink: 0 }}
                allowClear
              />
              <Button onClick={applyBatchQuantity} style={{ flexShrink: 0 }}>
                应用至选中
              </Button>
              <Button danger onClick={batchRemove} style={{ flexShrink: 0 }}>
                批量删除
              </Button>
            </div>
            <Table
              size="small"
              pagination={false}
              locale={{ emptyText: activePointId ? '请点击「添加物资行」' : '请先选择社会物资点' }}
              dataSource={fields}
              rowSelection={{
                selectedRowKeys,
                onChange: keys => setSelectedRowKeys(keys),
              }}
              columns={[
                {
                  title: '应急物资',
                  width: 280,
                  render: (_, field) => (
                    <Form.Item name={[field.name, 'supplyId']} rules={[{ required: true, message: '请选择' }]} style={{ marginBottom: 0 }}>
                      <Select
                        showSearch
                        optionFilterProp="label"
                        placeholder="选择物资点下的应急物资"
                        disabled={!activePointId}
                        options={suppliesAtPoint.map(s => ({
                          value: s.id,
                          label: `${s.name}（${s.materialType}）`,
                        }))}
                        onChange={(sid: string) => {
                          const s = supplies.find(x => x.id === sid);
                          if (!s) return;
                          form.setFieldValue(['materials', field.name, 'socialPointId'], s.socialPointId);
                          form.setFieldValue(['materials', field.name, 'supplyId'], s.id);
                          form.setFieldValue(['materials', field.name, 'materialType'], s.materialType);
                          form.setFieldValue(['materials', field.name, 'name'], s.name);
                          form.setFieldValue(['materials', field.name, 'unit'], '');
                        }}
                      />
                    </Form.Item>
                  ),
                },
                {
                  title: '物资类型',
                  width: 100,
                  render: (_, field) => (
                    <Form.Item name={[field.name, 'materialType']} style={{ marginBottom: 0 }}>
                      <Input readOnly placeholder="自动带出" />
                    </Form.Item>
                  ),
                },
                {
                  title: '物资名称',
                  width: 140,
                  render: (_, field) => (
                    <Form.Item name={[field.name, 'name']} style={{ marginBottom: 0 }}>
                      <Input readOnly placeholder="自动带出" />
                    </Form.Item>
                  ),
                },
                {
                  title: '数量',
                  width: 100,
                  render: (_, field) => (
                    <Form.Item name={[field.name, 'quantity']} rules={[{ required: true, message: '请填写' }]} style={{ marginBottom: 0 }}>
                      <Input placeholder="如 120" />
                    </Form.Item>
                  ),
                },
                {
                  title: '单位',
                  width: 88,
                  render: (_, field) => (
                    <Form.Item name={[field.name, 'unit']} rules={[{ required: true, message: '请填写' }]} style={{ marginBottom: 0 }}>
                      <Input placeholder="㎡、m、卷" />
                    </Form.Item>
                  ),
                },
                {
                  title: '操作',
                  width: 72,
                  render: (_, field) => (
                    <Button type="link" danger size="small" onClick={() => remove(field.name)}>
                      删除
                    </Button>
                  ),
                },
              ]}
              rowKey="key"
            />
          </>
        );
      }}
    </Form.List>
  );
};

/** 复盘详情只读内容：与「事件复盘」列表详情弹窗一致，供应急事件详情页 Tab 复用 */
export interface EventReviewDetailBodyProps {
  detail: EventReviewRow;
  linkedEvent: EmergencyEventRow;
  linkedAssessment: EventAssessmentRow | null | undefined;
  experts: ExpertRow[];
  socialPoints: SocialSupplyPointRow[];
}

export const EventReviewDetailBody: React.FC<EventReviewDetailBodyProps> = ({
  detail,
  linkedEvent,
  linkedAssessment,
  experts,
  socialPoints,
}) => {
  const detailTimeline = useMemo(
    () => buildDetailLifecycleTimeline(linkedEvent, linkedAssessment ?? null),
    [linkedEvent, linkedAssessment],
  );
  const detailPhases = useMemo(
    () => (detail.phaseHours?.length ? detail.phaseHours : buildPhaseHoursDemo(linkedEvent)),
    [detail.phaseHours, linkedEvent],
  );

  return (
    <div className="event-review-detail-onepage" style={{ paddingBottom: 8 }}>
      {/* 单页纵向滚动：登记信息 → 结论与指标 → 原事件 → 时间线 → 评估 → 队伍/物资/专家 → 图表 */}
      <Descriptions size="small" column={{ xs: 1, sm: 2 }} bordered style={{ marginBottom: 16 }}>
        <Descriptions.Item label="复盘编号">{detail.reviewCode}</Descriptions.Item>
        <Descriptions.Item label="复盘日期">{detail.reviewTime}</Descriptions.Item>
        <Descriptions.Item label="牵头单位" span={2}>
          {detail.leadOrg}
        </Descriptions.Item>
        <Descriptions.Item label="关联应急事件" span={2}>
          <Text strong>{linkedEvent.eventCode}</Text> {linkedEvent.eventTitle}
        </Descriptions.Item>
      </Descriptions>

      <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
        复盘结论与关键指标
      </Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 8 }}>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic title="阶段耗时合计（演示）" value={detailPhases.reduce((s, p) => s + p.value, 0)} suffix="h" />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic title="选用专家" value={detail.expertIds.length} suffix="人" />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic title="统计人员数量" value={detail.teamPersonnel.length} suffix="人" />
          </Card>
        </Col>
      </Row>
      <Card size="small" title="结论摘要" style={{ marginBottom: 16 }}>
        <Paragraph style={{ marginBottom: 0 }}>{detail.reviewSummary}</Paragraph>
      </Card>

      <Divider style={{ margin: '16px 0' }} />

      <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
        关联应急事件信息
      </Title>
      <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="事件编号" span={2}>
          <Text strong>{linkedEvent.eventCode}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="事件名称" span={2}>
          {linkedEvent.eventTitle}
        </Descriptions.Item>
        <Descriptions.Item label="事发时间">{linkedEvent.occurTime}</Descriptions.Item>
        <Descriptions.Item label="接报时间">{linkedEvent.reportTime}</Descriptions.Item>
        <Descriptions.Item label="事发地点" span={2}>
          {linkedEvent.location}
        </Descriptions.Item>
        <Descriptions.Item label="处置状态">
          <Tag>{linkedEvent.disposalStatus}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="办结日期">{linkedEvent.endDate || '—'}</Descriptions.Item>
        <Descriptions.Item label="事件结果" span={2}>
          {linkedEvent.eventResult}
        </Descriptions.Item>
      </Descriptions>

      <Divider style={{ margin: '16px 0' }} />

      <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
        全生命周期过程时间线
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
        节点由「应急事件上报 → 事件处置 → 事件评估」构成，数据来源于应急事件与事件评估，不在复盘中编辑。
      </Text>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Timeline
          items={detailTimeline.map(n => ({
            color: 'blue',
            children: (
              <div>
                <Text strong>{n.title}</Text>
                <div style={{ fontSize: 12, color: '#666' }}>{n.time}</div>
                <div>{n.description}</div>
              </div>
            ),
          }))}
        />
      </Card>

      <Divider style={{ margin: '16px 0' }} />

      <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
        事件评估
      </Title>
      {linkedAssessment ? (
        <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label="评估编号" span={2}>
            {linkedAssessment.assessmentCode}
          </Descriptions.Item>
          <Descriptions.Item label="评估日期">{linkedAssessment.assessTime}</Descriptions.Item>
          <Descriptions.Item label="评估单位">{linkedAssessment.assessOrg}</Descriptions.Item>
          <Descriptions.Item label="总体评估" span={2}>
            {linkedAssessment.overallAssessment}
          </Descriptions.Item>
          <Descriptions.Item label="污染损害评估" span={2}>
            {linkedAssessment.pollutionDamageAssessment}
          </Descriptions.Item>
        </Descriptions>
      ) : (
        <Empty description="未关联评估记录" style={{ marginBottom: 16 }} />
      )}

      <Divider style={{ margin: '16px 0' }} />

      <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
        队伍、物资与专家
      </Title>
      <Space direction="vertical" size="middle" style={{ width: '100%', marginBottom: 16 }}>
        <Card size="small" title="应急队伍人员">
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={detail.teamPersonnel}
            columns={[
              { title: '队伍', dataIndex: 'teamName', width: 180 },
              { title: '姓名', dataIndex: 'memberName', width: 100 },
              { title: '岗位/角色', dataIndex: 'role', width: 120 },
              { title: '联系电话', dataIndex: 'phone', width: 140 },
            ]}
          />
        </Card>
        <Card size="small" title="物资使用（复盘登记）">
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={detail.materials}
            columns={[
              {
                title: '物资点',
                width: 200,
                ellipsis: true,
                render: (_, row) => {
                  const r = row as EventReviewMaterialRow;
                  return socialPoints.find(p => p.id === r.socialPointId)?.name ?? r.socialPointId ?? '—';
                },
              },
              { title: '物资类型', dataIndex: 'materialType', width: 120 },
              { title: '物资名称', dataIndex: 'name', width: 160 },
              { title: '数量', dataIndex: 'quantity', width: 100 },
              { title: '单位', dataIndex: 'unit', width: 80 },
            ]}
          />
        </Card>
        <Card size="small" title="选用专家">
          <Space wrap>
            {detail.expertIds.map(eid => {
              const ex = experts.find(e => e.id === eid);
              return ex ? <Tag key={eid}>{ex.name}（{ex.title}）</Tag> : <Tag key={eid}>{eid}</Tag>;
            })}
          </Space>
        </Card>
      </Space>

      <Divider style={{ margin: '16px 0' }} />

      <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
        物资类型统计
      </Title>
      <Card size="small" title="按登记物资类型汇总（条数）">
        <MaterialTypeBarChart materials={detail.materials} />
      </Card>
    </div>
  );
};

export const initialEventReviews: EventReviewRow[] = [
  {
    id: 'rev-1',
    reviewCode: 'FP-2025-0320-01',
    linkedEventId: 'evt-1',
    linkedAssessmentId: 'asr-1',
    reviewTime: '2025-03-20',
    leadOrg: '市应急指挥部办公室',
    reviewSummary: '响应及时，敏感目标未受影响；建议加强通航密集区联合巡查与油类溯源演练。',
    expertIds: ['ex-1'],
    teamPersonnel: [
      {
        id: 'tp-1',
        teamId: 'et-1',
        teamName: '市生态环境应急救援一队',
        memberName: '周某',
        role: '现场指挥',
        phone: '138****1001',
      },
    ],
    materials: [
      { id: 'm1', socialPointId: 'ss-1', supplyId: 'es-1', materialType: '吸附类', name: '吸油毡', quantity: '120', unit: '㎡' },
      { id: 'm2', socialPointId: 'ss-1', supplyId: 'es-2', materialType: '围控类', name: '围油栏', quantity: '800', unit: 'm' },
    ],
    phaseHours: [],
  },
];

export interface EventReviewPageProps {
  events: EmergencyEventRow[];
  assessments: EventAssessmentRow[];
  teams: EmergencyTeamRow[];
  experts: ExpertRow[];
  /** 风险库 · 应急物资主数据（类型/名称选项来源） */
  supplies: EmergencySupplyRow[];
  /** 风险库 · 社会物资点（复盘物资先选点再选品） */
  socialPoints: SocialSupplyPointRow[];
  reviews: EventReviewRow[];
  onReviewsChange: React.Dispatch<React.SetStateAction<EventReviewRow[]>>;
}

export const EventReviewPage: React.FC<EventReviewPageProps> = ({
  events,
  assessments,
  teams,
  experts,
  supplies,
  socialPoints,
  reviews,
  onReviewsChange,
}) => {
  const [filterForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [query, setQuery] = useState<Record<string, unknown>>({});
  const [detail, setDetail] = useState<EventReviewRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<EventReviewRow | null>(null);

  const openEdit = useCallback((row: EventReviewRow | null) => {
    if (row) {
      setEditing(row);
      editForm.setFieldsValue({
        ...row,
        reviewTime: dayjs(row.reviewTime),
        materials: row.materials.map(m => ({ ...m, unit: m.unit ?? '' })),
      });
    } else {
      setEditing(null);
      editForm.resetFields();
      editForm.setFieldsValue({
        reviewTime: dayjs(),
        expertIds: [],
        teamPersonnel: [],
        materials: [],
      });
    }
    setEditOpen(true);
  }, [editForm]);

  const eligibleEvents = useMemo(() => events.filter(isEventEligibleForReview), [events]);

  const filtered = useMemo(() => {
    const region = String(query.region ?? '').trim();
    const leadOrg = String(query.leadOrg ?? '').trim();
    const eventTitle = String(query.eventTitle ?? '').trim();
    const reviewCode = String(query.reviewCode ?? '').trim();
    const eventCode = String(query.eventCode ?? '').trim();
    const t0 = query.reviewTimeStart as string | undefined;
    const t1 = query.reviewTimeEnd as string | undefined;
    return reviews.filter(r => {
      const ev = events.find(e => e.id === r.linkedEventId);
      if (region && String(ev?.addvcd ?? '').trim() !== region) return false;
      if (leadOrg && r.leadOrg !== leadOrg) return false;
      if (eventTitle && !(ev?.eventTitle ?? '').includes(eventTitle)) return false;
      if (reviewCode && !r.reviewCode.includes(reviewCode)) return false;
      if (eventCode && !(ev?.eventCode ?? '').includes(eventCode)) return false;
      if (t0 && dayjs(r.reviewTime).isBefore(dayjs(t0))) return false;
      if (t1 && dayjs(r.reviewTime).isAfter(dayjs(t1))) return false;
      return true;
    });
  }, [reviews, query, events]);

  const allCols: EcoColumnConfig[] = useMemo(
    () => [
      { key: 'reviewCode', title: '复盘编号', dataIndex: 'reviewCode', width: 150, fixed: 'left' },
      {
        key: 'linkedEvent',
        title: '关联事件',
        width: 200,
        ellipsis: true,
        render: (_: unknown, record: unknown) => {
          const row = record as EventReviewRow;
          const ev = events.find(e => e.id === row.linkedEventId);
          return ev ? `${ev.eventCode} ${ev.eventTitle}` : row.linkedEventId;
        },
      },
      { key: 'reviewTime', title: '复盘日期', dataIndex: 'reviewTime', width: 120 },
      { key: 'leadOrg', title: '牵头单位', dataIndex: 'leadOrg', width: 180, ellipsis: true },
      {
        key: 'experts',
        title: '选用专家',
        width: 160,
        ellipsis: true,
        render: (_: unknown, record: unknown) => {
          const row = record as EventReviewRow;
          const names = row.expertIds.map(id => experts.find(e => e.id === id)?.name ?? id).join('、');
          return names || '—';
        },
      },
      { key: 'operation', title: '操作', width: 148, defaultVisible: true },
    ],
    [events, experts],
  );
  const [visibleCols, setVisibleCols] = useState(() => getEcoDefaultVisibleColumnKeys(allCols));
  const columns = useMemo(
    () =>
      buildTableColumnsFromEcoConfig(allCols, visibleCols, record => {
        const row = record as EventReviewRow;
        return (
          <Space size="small">
            <Button
              type="link"
              size="small"
              className="action-btn detail"
              icon={<EyeOutlined />}
              onClick={() => {
                setDetail(row);
                setDetailOpen(true);
              }}
            >
              详情
            </Button>
            <Button
              type="link"
              size="small"
              className="action-btn edit"
              icon={<EditOutlined />}
              onClick={() => openEdit(row)}
            >
              编辑
            </Button>
          </Space>
        );
      }),
    [allCols, visibleCols, openEdit],
  );

  const leadOrgOptions = useMemo(
    () =>
      [...new Set(reviews.map(r => r.leadOrg).filter(x => String(x).trim()))].map(x => ({
        value: x,
        label: x,
      })),
    [reviews],
  );

  const handleSearch = () => {
    const v = filterForm.getFieldsValue() as {
      region?: string;
      leadOrg?: string;
      eventTitle?: string;
      reviewCode?: string;
      eventCode?: string;
      reviewTimeRange?: [dayjs.Dayjs, dayjs.Dayjs] | null;
    };
    const range = v.reviewTimeRange;
    setQuery({
      region: v.region,
      leadOrg: v.leadOrg,
      eventTitle: (v.eventTitle ?? '').trim(),
      reviewCode: (v.reviewCode ?? '').trim(),
      eventCode: (v.eventCode ?? '').trim(),
      reviewTimeStart: range?.[0]?.format('YYYY-MM-DD'),
      reviewTimeEnd: range?.[1]?.format('YYYY-MM-DD'),
    });
    message.success('已查询');
  };

  const handleReset = () => {
    filterForm.resetFields();
    setQuery({});
    message.info('已重置');
  };

  const save = async () => {
    const v = await editForm.validateFields();
    const linkedEventId = v.linkedEventId as string;
    const linkedAssessmentId = v.linkedAssessmentId as string;
    const ev = events.find(e => e.id === linkedEventId);
    if (!ev) {
      message.error('未找到关联事件');
      return;
    }
    const rt = (v.reviewTime as dayjs.Dayjs).format('YYYY-MM-DD');
    const teamPersonnel = (v.teamPersonnel as EventReviewTeamPerson[]) ?? [];
    const materials = (v.materials as EventReviewMaterialRow[]) ?? [];
    const phaseHours = buildPhaseHoursDemo(ev);

    const payload: EventReviewRow = {
      id: editing?.id ?? `rev-${Date.now()}`,
      reviewCode: editing ? editing.reviewCode : generateNextReviewCode(reviews, v.reviewTime as dayjs.Dayjs),
      linkedEventId,
      linkedAssessmentId,
      reviewTime: rt,
      leadOrg: v.leadOrg as string,
      reviewSummary: v.reviewSummary as string,
      expertIds: (v.expertIds as string[]) ?? [],
      teamPersonnel,
      materials,
      phaseHours,
    };

    if (editing) onReviewsChange(prev => prev.map(x => (x.id === editing.id ? payload : x)));
    else onReviewsChange(prev => [...prev, payload]);
    message.success(editing ? '已保存' : '已新增');
    setEditOpen(false);
    setEditing(null);
    editForm.resetFields();
  };

  const linkedEvent = detail ? events.find(e => e.id === detail.linkedEventId) : null;
  const linkedAssessment = detail ? assessments.find(a => a.id === detail.linkedAssessmentId) : null;

  return (
    <div className="facility-view">
      <Card
        title="事件复盘"
        extra={
          <Space wrap>
            <EcoProtoExportBtn
              onClick={() =>
                exportEventReviewExcel(
                  filtered as unknown as Record<string, unknown>[],
                  allCols,
                  '应急协同_事件复盘',
                  '事件复盘',
                )
              }
            />
            <EcoProtoImportBtn />
            <RiskEcoColumnManager columns={allCols} visibleColumns={visibleCols} onChange={setVisibleCols} />
            <Button type="primary" icon={<PlusOutlined />} className="add-btn" onClick={() => openEdit(null)}>
              新增
            </Button>
          </Space>
        }
      >
        <Form form={filterForm} style={{ marginBottom: 12 }}>
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="region" style={{ marginBottom: 0 }}>
                <Select
                  allowClear
                  placeholder="所属区域"
                  optionFilterProp="label"
                  showSearch
                  style={{ width: '100%' }}
                  options={SHAOSHAN_ADDVCD_OPTIONS}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="leadOrg" style={{ marginBottom: 0 }}>
                <Select allowClear placeholder="牵头单位" optionFilterProp="label" showSearch style={{ width: '100%' }} options={leadOrgOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="eventTitle" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="事件名称" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="reviewCode" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="复盘编号" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="eventCode" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="事件编号" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={16} lg={8}>
              <Form.Item name="reviewTimeRange" style={{ marginBottom: 0 }}>
                <DatePicker.RangePicker style={{ width: '100%' }} placeholder={['复盘日期起', '复盘日期止']} />
              </Form.Item>
            </Col>
            <Col xs={24} style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Space>
                <Button type="primary" className="search-btn" icon={<SearchOutlined />} onClick={handleSearch}>
                  查询
                </Button>
                <Button className="secondary-btn" onClick={handleReset}>
                  重置
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
        <div className="facility-table-wrap">
          <Table
            rowKey="id"
            size="small"
            scroll={{ x: getEcoTableScrollX(allCols.filter(c => visibleCols.includes(c.key) || c.key === 'operation')) }}
            pagination={{ pageSize: 10, showTotal: t => `共 ${t} 条` }}
            columns={columns}
            dataSource={filtered}
          />
        </div>
      </Card>

      <Modal
        title={detail ? `复盘详情 — ${detail.reviewCode}` : '复盘详情'}
        open={detailOpen}
        onCancel={() => { setDetailOpen(false); setDetail(null); }}
        footer={null}
        width={1040}
        destroyOnClose
        styles={detailModalStyles}
      >
        {detail && linkedEvent ? (
          <EventReviewDetailBody
            detail={detail}
            linkedEvent={linkedEvent}
            linkedAssessment={linkedAssessment}
            experts={experts}
            socialPoints={socialPoints}
          />
        ) : null}
      </Modal>

      <Modal
        title={editing ? '编辑复盘' : '新增复盘'}
        open={editOpen}
        onCancel={() => { setEditOpen(false); setEditing(null); editForm.resetFields(); }}
        width={920}
        destroyOnClose
        styles={formModalStyles}
        onOk={() => void save()}
      >
        <Form form={editForm} layout="vertical">
          {editing ? (
            <Form.Item label="复盘编号">
              <Input readOnly value={editing.reviewCode} />
            </Form.Item>
          ) : null}
          <Form.Item name="linkedEventId" label="关联应急事件（须已办结）" rules={[{ required: true, message: '请选择已处置完成的事件' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="仅可选择已填写办结日期的事件"
              options={eligibleEvents.map(e => ({
                value: e.id,
                label: `${e.eventCode} ${e.eventTitle}（办结：${e.endDate || '—'}）`,
              }))}
              onChange={evId => {
                const asr = pickPrimaryAssessmentForEvent(assessments, evId);
                editForm.setFieldsValue({
                  linkedAssessmentId: asr?.id,
                });
              }}
            />
          </Form.Item>
          <EditLinkedAssessmentHint form={editForm} assessments={assessments} />
          <Form.Item
            name="linkedAssessmentId"
            hidden
            rules={[{ required: true, message: '该事件暂无评估记录，请先在「事件评估」中完成登记' }]}
          >
            <Input type="hidden" />
          </Form.Item>
          <Form.Item name="reviewTime" label="复盘日期" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          {!editing ? (
            <Form.Item label="复盘编号（自动生成）">
              <ReviewCodeAutoHint form={editForm} reviews={reviews} />
            </Form.Item>
          ) : null}
          <Form.Item name="leadOrg" label="牵头单位" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="reviewSummary" label="复盘结论摘要" rules={[{ required: true }]}><TextArea rows={4} /></Form.Item>

          <Card size="small" title="选用专家（来自风险识别 · 专家库）" style={{ marginBottom: 12 }}>
            <Form.Item name="expertIds" label="专家" rules={[{ required: true, message: '至少选择一名专家' }]}>
              <Select mode="multiple" placeholder="多选" options={experts.map(e => ({ value: e.id, label: `${e.name} · ${e.expertise}` }))} />
            </Form.Item>
          </Card>

          <Card size="small" title="应急队伍与人员" style={{ marginBottom: 12 }}>
            <Form.Item
              name="teamPersonnel"
              label="队伍与人员"
              rules={[{ required: true, message: '请选择队伍并至少保留一名人员' }]}
            >
              <TeamPersonnelPicker teams={teams} />
            </Form.Item>
          </Card>

          <Card size="small" title="物资列表" style={{ marginBottom: 12 }}>
            <MaterialsReviewEditor
              supplies={supplies}
              socialPoints={socialPoints}
              materialsPointSeed={editing?.materials?.[0]?.socialPointId}
            />
          </Card>
        </Form>
      </Modal>
    </div>
  );
};
