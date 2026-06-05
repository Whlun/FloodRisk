/**
 * 设施管理 · 排口管理 · 入河排口核查列表
 * 列表能力与「责任主体信息」一致：查询、字段管理、导入/导出占位、新增、编辑、详情。
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Form,
  Image,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tooltip,
  TreeSelect,
  Typography,
  Upload,
  message,
} from 'antd';
import type { DescriptionsProps } from 'antd';
import type { FormInstance } from 'antd/es/form';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  AddrWgs84DetailMap,
  AddrWgs84MapPicker,
  ADDR_MAP_FORM_ITEM_EXTRA,
  ADDR_MAP_INPUT_PLACEHOLDER,
} from '../shared/addrWgs84MapFormBridge';
import { DownloadOutlined, EditOutlined, EyeOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import {
  getDefaultVisibleColumnKeys,
  getFacilityTableScrollX,
  PipeLineColumnManager,
  type ColumnConfig,
} from './pipe-line-table-kit';
import { downloadFacilityListExcel } from './facility-list-xlsx-export';
import {
  buildReceiveWaterBodySelectOptions,
  formatReceiveWaterObjectIdDisplay,
  formatShaoshanAdminDivisionDisplay,
  SHAOSHAN_ADMIN_TREE_TO_VILLAGE,
} from '../生态整治/riverChiefDb4401';
import { outletResponsiblePartyInitial } from './facility-outlet-responsible-data';
import { OUTLET_ACTION_TEAM_GROUP_INITIAL } from './facility-outlet-action-team-group-view';
import {
  RIVER_OUTLET_TYPE_TREE_DATA,
  RIVER_VERIFY_CHECKBOX_周边环境,
  RIVER_VERIFY_CHECKBOX_污水疑似来源,
  RIVER_VERIFY_GK_OTHER_VALUE,
  RIVER_VERIFY_GK_PRESET_VALUES,
  RIVER_VERIFY_OPTIONS_口门形态,
  RIVER_VERIFY_OPTIONS_入河方式,
  RIVER_VERIFY_OPTIONS_排放方式,
  RIVER_VERIFY_OPTIONS_排放状态,
  RIVER_VERIFY_OPTIONS_排污口规模,
  RIVER_VERIFY_OPTIONS_手动检测点,
  RIVER_VERIFY_OPTIONS_标志牌,
  RIVER_VERIFY_OPTIONS_视频监控,
  RIVER_VERIFY_OPTIONS_水质自动监测,
  RIVER_VERIFY_OPTIONS_计量设施,
  collectRiverOutletTypeLeafValues,
  createEmptyRiverOutletVerificationFormValues,
  riverOutletVerificationInitial,
  type RiverOutletVerificationRecord,
} from './facility-river-outlet-verification-data';
import { outletIssueInitial } from './facility-outlet-issue-data';

const { Search } = Input;

const PHOTO_FAR_KEY = '排污口特性照片（远景）' as const;

const genOutletNo = () => `RHHC-${Date.now()}`;

/** 表单扩展字段：归口单位选「其他」时标记 1 */
const FORM_META_GK_OTHER = '_gkOtherMode';

/** 入河排口核查表单值（台账字段 + 仅表单使用的元数据） */
type RiverOutletVerificationFormValues = RiverOutletVerificationRecord &
  Partial<Record<typeof FORM_META_GK_OTHER, number>>;

const RESPONSIBLE_PARTY_SELECT_OPTIONS = outletResponsiblePartyInitial.map(r => ({
  value: r.责任主体名称,
  label: r.责任主体名称,
}));
const OUTLET_ACTION_TEAM_GROUP_OPTIONS = OUTLET_ACTION_TEAM_GROUP_INITIAL.map(r => ({
  value: r.小组编号,
  label: `${r.小组编号}（${r.组长名称}）`,
}));

function stripRiverVerifyFormMeta(raw: Record<string, unknown>): Record<string, unknown> {
  const { [FORM_META_GK_OTHER]: _x, ...rest } = raw;
  return rest;
}

function isGkPresetValue(v: string): boolean {
  return (RIVER_VERIFY_GK_PRESET_VALUES as readonly string[]).includes(v);
}

/** 收集韶山市—村/社区级区划编码供筛选 */
function collectShaoshanVillageCodes(nodes: typeof SHAOSHAN_ADMIN_TREE_TO_VILLAGE): string[] {
  const out: string[] = [];
  const walk = (list: typeof SHAOSHAN_ADMIN_TREE_TO_VILLAGE) => {
    for (const n of list) {
      if (n.children?.length) walk(n.children);
      else if (n.value) out.push(String(n.value));
    }
  };
  walk(nodes);
  return out;
}

/** 多选字段：台账存「、」分隔，表单用 Checkbox 数组 */
function splitMulti(s: string): string[] {
  return String(s || '')
    .split(/[、,，]/)
    .map(x => x.trim())
    .filter(Boolean);
}

function joinMulti(v: unknown): string {
  if (Array.isArray(v)) return v.filter(Boolean).join('、');
  return String(v ?? '').trim();
}

function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test((s || '').trim());
}

function UrlOrDash(props: { value?: string; label?: string }) {
  const v = (props.value ?? '').trim();
  if (!v) return <Typography.Text type="secondary">—</Typography.Text>;
  if (isHttpUrl(v)) {
    return (
      <Typography.Link href={v} target="_blank" rel="noreferrer">
        {props.label ?? '打开链接'}
      </Typography.Link>
    );
  }
  return <span>{v}</span>;
}

function tableUrlEllipsis(text: string) {
  const t = (text ?? '').trim();
  if (!t) return '—';
  if (t.length <= 24) return t;
  return (
    <Tooltip title={t}>
      <span>{`${t.slice(0, 12)}…${t.slice(-8)}`}</span>
    </Tooltip>
  );
}

function GuiKouUnitBlock({ form }: { form: FormInstance<RiverOutletVerificationFormValues> }) {
  const gk = Form.useWatch('归口单位', form) as string | undefined;
  const otherMode = Number(Form.useWatch(FORM_META_GK_OTHER, form) ?? 0);
  const preset = gk != null && gk !== '' && isGkPresetValue(gk);
  let selectVal: string | undefined;
  if (preset) selectVal = gk;
  else if (otherMode === 1 || (gk != null && gk !== '' && !isGkPresetValue(gk))) {
    selectVal = RIVER_VERIFY_GK_OTHER_VALUE;
  } else selectVal = undefined;

  return (
    <>
      <Form.Item name={FORM_META_GK_OTHER} hidden initialValue={0}>
        <Input type="hidden" />
      </Form.Item>
      <Form.Item label="归口单位">
        <Select
          allowClear
          placeholder="请选择归口单位"
          value={selectVal}
          onChange={v => {
            if (!v) {
              form.setFieldsValue({ 归口单位: '', [FORM_META_GK_OTHER]: 0 });
              return;
            }
            if (v === RIVER_VERIFY_GK_OTHER_VALUE) {
              form.setFieldsValue({ 归口单位: '', [FORM_META_GK_OTHER]: 1 });
            } else {
              form.setFieldsValue({ 归口单位: v, [FORM_META_GK_OTHER]: 0 });
            }
          }}
          options={[
            ...RIVER_VERIFY_GK_PRESET_VALUES.map(p => ({ value: p, label: p })),
            { value: RIVER_VERIFY_GK_OTHER_VALUE, label: '其他（手动输入）' },
          ]}
        />
      </Form.Item>
      {selectVal === RIVER_VERIFY_GK_OTHER_VALUE && (
        <Form.Item label="归口单位补充">
          <Input
            placeholder="请输入归口单位"
            value={preset ? '' : gk ?? ''}
            onChange={e => form.setFieldsValue({ 归口单位: e.target.value })}
          />
        </Form.Item>
      )}
    </>
  );
}

function ImageUploadRow(props: {
  form: FormInstance<RiverOutletVerificationFormValues>;
  field: keyof RiverOutletVerificationRecord;
  label: string;
}) {
  const { form, field, label } = props;
  const value = (Form.useWatch(field, form) as string | undefined) ?? '';
  const fileList: UploadFile[] = value
    .split(/[;,，、\n]/)
    .map(x => x.trim())
    .filter(Boolean)
    .map((name, idx) => ({
      uid: `${String(field)}-${idx}-${name}`,
      name,
      status: 'done',
    }));
  return (
    <Form.Item label={label}>
      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        <Upload
          beforeUpload={() => false}
          multiple
          fileList={fileList}
          listType="text"
          onChange={info => {
            const names = info.fileList.map(file => file.name).filter(Boolean);
            form.setFieldValue(field, names.join(';'));
          }}
        >
          <Button icon={<UploadOutlined />}>上传图片</Button>
        </Upload>
        <Form.Item name={field} noStyle>
          <Input placeholder="可手动填写多个图片链接或文件名（用分号分隔）" maxLength={4000} />
        </Form.Item>
      </Space>
    </Form.Item>
  );
}

function RiverOutletVerificationFormFields(props: {
  form: FormInstance<RiverOutletVerificationFormValues>;
  waterBodyOptions: { value: string; label: string }[];
}) {
  const { form, waterBodyOptions } = props;
  const envOptions = RIVER_VERIFY_CHECKBOX_周边环境.map(v => ({ label: v, value: v }));
  const srcOptions = RIVER_VERIFY_CHECKBOX_污水疑似来源.map(v => ({ label: v, value: v }));

  const basicTab = (
    <>
      <Divider titlePlacement="left">基本信息</Divider>
      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item name="排口名称" label="排口名称" rules={[{ required: true, message: '请输入排口名称' }]}>
            <Input maxLength={500} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="排污口类型" label="排污口类型" tooltip="三级分类，请选择最末级类型">
            <TreeSelect
              allowClear
              showSearch
              placeholder="请选择排污口类型"
              treeData={RIVER_OUTLET_TYPE_TREE_DATA}
              treeNodeFilterProp="title"
              dropdownStyle={{ maxHeight: 420, overflow: 'auto' }}
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item name="国标编号" label="国标编号">
            <Input maxLength={100} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="国标名称" label="国标名称">
            <Input maxLength={200} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} sm={8}>
          <Form.Item name="所在乡镇" label="所在乡镇">
            <TreeSelect
              showSearch
              allowClear
              treeDefaultExpandAll
              placeholder="请选择韶山市所属区划（至村/社区级）"
              treeData={SHAOSHAN_ADMIN_TREE_TO_VILLAGE}
              treeNodeFilterProp="title"
              dropdownStyle={{ maxHeight: 360, overflow: 'auto' }}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item name="受纳水体（下拉单选）" label="受纳水体">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="河流/湖泊主数据（与生态整治一致）"
              options={waterBodyOptions}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item name="入河方式（平铺单选）" label="入河方式">
            <Select allowClear showSearch optionFilterProp="label" placeholder="请选择" options={RIVER_VERIFY_OPTIONS_入河方式} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} sm={8}>
          <Form.Item name="排放方式（平铺单选）" label="排放方式">
            <Select allowClear placeholder="请选择" options={RIVER_VERIFY_OPTIONS_排放方式} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item name="排放状态（下拉单选）" label="排放状态">
            <Select allowClear placeholder="请选择" options={RIVER_VERIFY_OPTIONS_排放状态} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item name="口门形态（平铺单选）" label="口门形态">
            <Select allowClear placeholder="请选择" options={RIVER_VERIFY_OPTIONS_口门形态} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} sm={8}>
          <GuiKouUnitBlock form={form} />
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item name="责任主体（下拉单选）" label="责任主体">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="请选择责任主体（与责任主体台账一致）"
              options={RESPONSIBLE_PARTY_SELECT_OPTIONS}
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} sm={24}>
          <Form.Item
            name="周边环境（平铺勾选多选）"
            label="周边环境"
            normalize={v => {
              if (Array.isArray(v)) return v;
              return splitMulti(String(v ?? ''));
            }}
          >
            <Select mode="multiple" allowClear placeholder="下拉多选" maxTagCount="responsive" options={envOptions} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} sm={24}>
          <Form.Item
            name="污水疑似来源（平铺勾选多选）"
            label="污水疑似来源"
            normalize={v => {
              if (Array.isArray(v)) return v;
              return splitMulti(String(v ?? ''));
            }}
          >
            <Select mode="multiple" allowClear placeholder="下拉多选" maxTagCount="responsive" options={srcOptions} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} sm={24}>
          <Form.Item
            name="详细地址"
            label="详细地址"
            extra={ADDR_MAP_FORM_ITEM_EXTRA}
            rules={[{ required: true, message: '请填写详细地址' }]}
          >
            <Input maxLength={500} placeholder={ADDR_MAP_INPUT_PLACEHOLDER} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} sm={24}>
          <Form.Item label="地图选点" tooltip="与详细地址、经纬度联动">
            <AddrWgs84MapPicker
              form={form as FormInstance<RiverOutletVerificationRecord>}
              addrField="详细地址"
              lngField="经度"
              latField="纬度"
              mapAriaLabel="入河排口详细地址地图"
              hintAddressLabel="详细地址"
              lngLatValueMode="string"
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item name="经度" label="经度">
            <Input maxLength={32} placeholder="°，与地图联动" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="纬度" label="纬度">
            <Input maxLength={32} placeholder="°，与地图联动" />
          </Form.Item>
        </Col>
      </Row>

      <Divider titlePlacement="left">拓展信息</Divider>
      <Row gutter={16}>
        <Col xs={24} sm={8}>
          <Form.Item name="水质自动监测（平铺勾选单选）" label="水质自动监测">
            <Select allowClear placeholder="请选择" options={RIVER_VERIFY_OPTIONS_水质自动监测} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item name="视频监控（平铺单选）" label="视频监控">
            <Select allowClear placeholder="请选择" options={RIVER_VERIFY_OPTIONS_视频监控} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item name="排污口规模（平铺勾选单选）" label="排污口规模">
            <Select allowClear placeholder="请选择" options={RIVER_VERIFY_OPTIONS_排污口规模} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} sm={8}>
          <Form.Item name="计量设施" label="计量设施">
            <Select allowClear placeholder="请选择" options={RIVER_VERIFY_OPTIONS_计量设施} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item name="手动检测点" label="手动检测点">
            <Select allowClear placeholder="请选择" options={RIVER_VERIFY_OPTIONS_手动检测点} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item name="标志牌" label="标志牌">
            <Select allowClear placeholder="请选择" options={RIVER_VERIFY_OPTIONS_标志牌} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 8 }}>
        <Col xs={24} sm={8}>
          <Form.Item name="核查行动小组" label="核查行动小组">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="请选择关联行动小组"
              options={OUTLET_ACTION_TEAM_GROUP_OPTIONS}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item name="创建人" label="创建人">
            <Input maxLength={64} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item name="更新时间" label="更新时间">
            <Input maxLength={32} placeholder="如 2026-04-28 14:00:00" />
          </Form.Item>
        </Col>
      </Row>
    </>
  );

  const imageTab = (
    <>
      <Divider titlePlacement="left">图片</Divider>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
        支持本地上传（原型写入文件名）或直接粘贴访问链接。
      </Typography.Text>
      <Row gutter={[16, 8]}>
        <Col span={24}>
          <ImageUploadRow form={form} field="排口特征图片" label="排口特征图片" />
        </Col>
        <Col span={24}>
          <ImageUploadRow form={form} field="排水去向图片" label="排水去向图片" />
        </Col>
        <Col span={24}>
          <ImageUploadRow form={form} field="周边环境图片" label="周边环境图片" />
        </Col>
        <Col span={24}>
          <ImageUploadRow form={form} field={PHOTO_FAR_KEY} label="排污口特性照片（远景）" />
        </Col>
        <Col span={24}>
          <ImageUploadRow form={form} field="排口标志牌照片" label="排口标志牌照片" />
        </Col>
      </Row>
    </>
  );

  return (
    <Tabs
      defaultActiveKey="basic"
      items={[
        { key: 'basic', label: '基本信息', children: basicTab },
        { key: 'images', label: '图片资料', children: imageTab },
      ]}
    />
  );
}
function detailItems(r: RiverOutletVerificationRecord): DescriptionsProps['items'] {
  const rows: { label: string; key: string; children: React.ReactNode }[] = [
    { key: '1', label: '排口编号', children: r.排口编号 || '—' },
    { key: '2', label: '排口名称', children: r.排口名称 || '—' },
    { key: '3', label: '国标编号', children: r.国标编号 || '—' },
    { key: '4', label: '国标名称', children: r.国标名称 || '—' },
    { key: '5', label: '排污口类型', children: r.排污口类型 || '—' },
    { key: '6', label: '所在乡镇', children: formatShaoshanAdminDivisionDisplay(r.所在乡镇) },
    {
      key: '7',
      label: '受纳水体（下拉单选）',
      children: formatReceiveWaterObjectIdDisplay(r['受纳水体（下拉单选）']),
    },
    { key: '8', label: '入河方式（平铺单选）', children: r['入河方式（平铺单选）'] || '—' },
    { key: '9', label: '归口单位', children: r.归口单位 || '—' },
    { key: '10', label: '排放状态（下拉单选）', children: r['排放状态（下拉单选）'] || '—' },
    { key: '11', label: '口门形态（平铺单选）', children: r['口门形态（平铺单选）'] || '—' },
    { key: '12', label: '排放方式（平铺单选）', children: r['排放方式（平铺单选）'] || '—' },
    { key: '13', label: '责任主体（下拉单选）', children: r['责任主体（下拉单选）'] || '—' },
    {
      key: '14',
      label: '详细地址',
      children: r.详细地址 || '—',
    },
    { key: '15', label: '经度', children: r.经度 || '—' },
    { key: '16', label: '纬度', children: r.纬度 || '—' },
    { key: '17', label: '联系人', children: r.联系人 || '—' },
    { key: '18', label: '联系电话', children: r.联系电话 || '—' },
    { key: '19', label: '周边环境（平铺勾选多选）', children: r['周边环境（平铺勾选多选）'] || '—' },
    { key: '20', label: '污水疑似来源（平铺勾选多选）', children: r['污水疑似来源（平铺勾选多选）'] || '—' },
    { key: '21', label: '水质自动监测（平铺勾选单选）', children: r['水质自动监测（平铺勾选单选）'] || '—' },
    { key: '22', label: '视频监控（平铺单选）', children: r['视频监控（平铺单选）'] || '—' },
    { key: '23', label: '排污口规模（平铺勾选单选）', children: r['排污口规模（平铺勾选单选）'] || '—' },
    { key: '24', label: '计量设施', children: r.计量设施 || '—' },
    { key: '25', label: '手动检测点', children: r.手动检测点 || '—' },
    { key: '26', label: '标志牌', children: r.标志牌 || '—' },
    { key: '27', label: '核查行动小组', children: r.核查行动小组 || '—' },
    { key: '28', label: '创建人', children: r.创建人 || '—' },
    { key: '29', label: '更新时间', children: r.更新时间 || '—' },
    {
      key: '30',
      label: '排口特征图片',
      children: <UrlOrDash value={r.排口特征图片} />,
    },
    {
      key: '31',
      label: '排水去向图片',
      children: <UrlOrDash value={r.排水去向图片} />,
    },
    {
      key: '32',
      label: '周边环境图片',
      children: <UrlOrDash value={r.周边环境图片} />,
    },
    {
      key: '33',
      label: '排污口特性照片（远景）',
      children: <UrlOrDash value={r[PHOTO_FAR_KEY]} />,
    },
    {
      key: '34',
      label: '排口标志牌照片',
      children: <UrlOrDash value={r.排口标志牌照片} />,
    },
  ];
  return rows.map(({ label, key, children }) => ({ key, label, children }));
}

function RiverOutletVerificationDetailContent({ r }: { r: RiverOutletVerificationRecord }) {
  const imgs = [
    { label: '排口特征图片', url: r.排口特征图片 },
    { label: '排水去向图片', url: r.排水去向图片 },
    { label: '周边环境图片', url: r.周边环境图片 },
    { label: '排污口特性照片（远景）', url: r[PHOTO_FAR_KEY] },
    { label: '排口标志牌照片', url: r.排口标志牌照片 },
  ].filter(x => isHttpUrl(x.url));

  const issueRows = useMemo(
    () => outletIssueInitial.filter(item => String(item.关联排口编码) === String(r.排口编号)),
    [r.排口编号],
  );
  return (
    <Tabs
      defaultActiveKey="basic"
      items={[
        {
          key: 'basic',
          label: '基本信息',
          children: (
            <div>
              <Descriptions bordered size="small" column={2} items={detailItems(r)} />
              <div style={{ marginTop: 16 }}>
                <AddrWgs84DetailMap
                  title={r.排口名称 || '排口位置'}
                  location={r.详细地址}
                  lng={r.经度}
                  lat={r.纬度}
                  mapAriaLabel="入河排口位置地图"
                />
              </div>
              {imgs.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <Typography.Text strong>图片预览</Typography.Text>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
                    {imgs.map(({ label, url }) => (
                      <div key={label} style={{ width: 160 }}>
                        <div style={{ fontSize: 12, marginBottom: 4, color: '#666' }}>{label}</div>
                        <Image src={url} alt={label} style={{ maxHeight: 120, objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ),
        },
        {
          key: 'issues',
          label: issueRows.length ? `问题列表（${issueRows.length}）` : '问题列表',
          children: (
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              locale={{ emptyText: '暂无关联问题' }}
              dataSource={issueRows}
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
          ),
        },
      ]}
    />
  );
}

export const RiverOutletVerificationView: React.FC<{
  onDetail: (title: string, content: React.ReactNode, modalWidth?: number | string) => void;
}> = ({ onDetail }) => {
  const [data, setData] = useState<RiverOutletVerificationRecord[]>(() => [...riverOutletVerificationInitial]);
  const [filterText, setFilterText] = useState('');
  const [filterType, setFilterType] = useState<string | undefined>();
  const [filterTown, setFilterTown] = useState<string | undefined>();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<RiverOutletVerificationRecord | null>(null);
  const [addForm] = Form.useForm<RiverOutletVerificationFormValues>();
  const [editForm] = Form.useForm<RiverOutletVerificationFormValues>();

  const waterBodyOptions = useMemo(() => {
    const base = buildReceiveWaterBodySelectOptions();
    const known = new Set(base.map(o => o.value));
    const extra: { value: string; label: string }[] = [];
    for (const row of data) {
      const w = row['受纳水体（下拉单选）']?.trim();
      if (w && !known.has(w)) {
        known.add(w);
        extra.push({ value: w, label: formatReceiveWaterObjectIdDisplay(w) });
      }
    }
    return [...base, ...extra];
  }, [data]);

  const typeOptions = useMemo(() => {
    const set = new Set<string>(collectRiverOutletTypeLeafValues());
    for (const row of data) {
      const t = (row.排污口类型 || '').trim();
      if (t) set.add(t);
    }
    return [...set].sort().map(v => ({ value: v, label: v }));
  }, [data]);

  const townOptions = useMemo(() => {
    const set = new Set<string>(collectShaoshanVillageCodes(SHAOSHAN_ADMIN_TREE_TO_VILLAGE));
    for (const row of data) {
      const t = (row.所在乡镇 || '').trim();
      if (t) set.add(t);
    }
    return [...set]
      .sort()
      .map(v => ({ value: v, label: formatShaoshanAdminDivisionDisplay(v) || v }));
  }, [data]);

  const allColumns: ColumnConfig[] = useMemo(
    () => [
      { key: '排口编号', title: '排口编号', dataIndex: '排口编号', width: 160, defaultVisible: true },
      { key: '排口名称', title: '排口名称', dataIndex: '排口名称', width: 280, defaultVisible: true },
      { key: '排污口类型', title: '排污口类型', dataIndex: '排污口类型', width: 140, defaultVisible: true },
      { key: '国标编号', title: '国标编号', dataIndex: '国标编号', width: 120, defaultVisible: false },
      { key: '国标名称', title: '国标名称', dataIndex: '国标名称', width: 140, defaultVisible: false },
      {
        key: '所在乡镇',
        title: '所在乡镇',
        dataIndex: '所在乡镇',
        width: 160,
        defaultVisible: true,
        render: (v: string) => formatShaoshanAdminDivisionDisplay(v),
      },
      {
        key: '受纳水体（下拉单选）',
        title: '受纳水体（下拉单选）',
        dataIndex: '受纳水体（下拉单选）',
        width: 220,
        defaultVisible: true,
        render: (v: string) => formatReceiveWaterObjectIdDisplay(v),
      },
      {
        key: '入河方式（平铺单选）',
        title: '入河方式（平铺单选）',
        dataIndex: '入河方式（平铺单选）',
        width: 200,
        defaultVisible: true,
      },
      { key: '归口单位', title: '归口单位', dataIndex: '归口单位', width: 140, defaultVisible: true },
      {
        key: '排放状态（下拉单选）',
        title: '排放状态（下拉单选）',
        dataIndex: '排放状态（下拉单选）',
        width: 130,
        defaultVisible: true,
      },
      {
        key: '口门形态（平铺单选）',
        title: '口门形态（平铺单选）',
        dataIndex: '口门形态（平铺单选）',
        width: 140,
        defaultVisible: true,
      },
      {
        key: '排放方式（平铺单选）',
        title: '排放方式（平铺单选）',
        dataIndex: '排放方式（平铺单选）',
        width: 120,
        defaultVisible: true,
      },
      {
        key: '责任主体（下拉单选）',
        title: '责任主体（下拉单选）',
        dataIndex: '责任主体（下拉单选）',
        width: 220,
        defaultVisible: true,
      },
      {
        key: '周边环境（平铺勾选多选）',
        title: '周边环境（平铺勾选多选）',
        dataIndex: '周边环境（平铺勾选多选）',
        width: 180,
        defaultVisible: true,
      },
      {
        key: '污水疑似来源（平铺勾选多选）',
        title: '污水疑似来源（平铺勾选多选）',
        dataIndex: '污水疑似来源（平铺勾选多选）',
        width: 200,
        defaultVisible: true,
      },
      { key: '详细地址', title: '详细地址', dataIndex: '详细地址', width: 220, defaultVisible: true },
      { key: '经度', title: '经度', dataIndex: '经度', width: 110, defaultVisible: false },
      { key: '纬度', title: '纬度', dataIndex: '纬度', width: 110, defaultVisible: false },
      { key: '核查行动小组', title: '核查行动小组', dataIndex: '核查行动小组', width: 180, defaultVisible: true },
      { key: '创建人', title: '创建人', dataIndex: '创建人', width: 100, defaultVisible: true },
      { key: '更新时间', title: '更新时间', dataIndex: '更新时间', width: 160, defaultVisible: true },
      { key: '联系人', title: '联系人', dataIndex: '联系人', width: 100, defaultVisible: false },
      { key: '联系电话', title: '联系电话', dataIndex: '联系电话', width: 130, defaultVisible: false },
      {
        key: '水质自动监测（平铺勾选单选）',
        title: '水质自动监测（平铺勾选单选）',
        dataIndex: '水质自动监测（平铺勾选单选）',
        width: 200,
        defaultVisible: false,
      },
      {
        key: '视频监控（平铺单选）',
        title: '视频监控（平铺单选）',
        dataIndex: '视频监控（平铺单选）',
        width: 140,
        defaultVisible: false,
      },
      {
        key: '排污口规模（平铺勾选单选）',
        title: '排污口规模（平铺勾选单选）',
        dataIndex: '排污口规模（平铺勾选单选）',
        width: 220,
        defaultVisible: false,
      },
      { key: '计量设施', title: '计量设施', dataIndex: '计量设施', width: 200, defaultVisible: false },
      { key: '手动检测点', title: '手动检测点', dataIndex: '手动检测点', width: 120, defaultVisible: false },
      { key: '标志牌', title: '标志牌', dataIndex: '标志牌', width: 100, defaultVisible: false },
      {
        key: '排口特征图片',
        title: '排口特征图片',
        dataIndex: '排口特征图片',
        width: 140,
        defaultVisible: false,
        render: (v: string) => tableUrlEllipsis(v),
      },
      {
        key: '排水去向图片',
        title: '排水去向图片',
        dataIndex: '排水去向图片',
        width: 140,
        defaultVisible: false,
        render: (v: string) => tableUrlEllipsis(v),
      },
      {
        key: '周边环境图片',
        title: '周边环境图片',
        dataIndex: '周边环境图片',
        width: 140,
        defaultVisible: false,
        render: (v: string) => tableUrlEllipsis(v),
      },
      {
        key: PHOTO_FAR_KEY,
        title: '排污口特性照片（远景）',
        dataIndex: PHOTO_FAR_KEY,
        width: 160,
        defaultVisible: false,
        render: (v: string) => tableUrlEllipsis(v),
      },
      {
        key: '排口标志牌照片',
        title: '排口标志牌照片',
        dataIndex: '排口标志牌照片',
        width: 140,
        defaultVisible: false,
        render: (v: string) => tableUrlEllipsis(v),
      },
      { key: 'operation', title: '操作', width: 180, defaultVisible: true },
    ],
    [],
  );

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => getDefaultVisibleColumnKeys(allColumns));

  useEffect(() => {
    setVisibleColumns(getDefaultVisibleColumnKeys(allColumns));
  }, [allColumns]);

  const filtered = useMemo(() => {
    const q = filterText.trim();
    return data.filter(row => {
      if (q) {
        const blob = [
          row.排口编号,
          row.排口名称,
          row['责任主体（下拉单选）'],
          row.详细地址,
          row.联系人,
          row.联系电话,
          row['受纳水体（下拉单选）'],
          formatReceiveWaterObjectIdDisplay(row['受纳水体（下拉单选）']),
          row.所在乡镇,
          formatShaoshanAdminDivisionDisplay(row.所在乡镇),
        ]
          .map(x => String(x ?? ''))
          .join(' ');
        if (!blob.includes(q)) return false;
      }
      if (filterType && String(row.排污口类型) !== filterType) return false;
      if (filterTown && String(row.所在乡镇) !== filterTown) return false;
      return true;
    });
  }, [data, filterText, filterType, filterTown]);

  const openDetail = (r: RiverOutletVerificationRecord) => {
    onDetail(`入河排口核查详情 - ${r.排口名称}`, <RiverOutletVerificationDetailContent r={r} />, 920);
  };

  const openEdit = (r: RiverOutletVerificationRecord) => {
    setEditing(r);
    const gk = (r.归口单位 || '').trim();
    const gkOther = gk !== '' && !isGkPresetValue(gk) ? 1 : 0;
    editForm.setFieldsValue({
      ...r,
      [FORM_META_GK_OTHER]: gkOther,
      '周边环境（平铺勾选多选）': splitMulti(r['周边环境（平铺勾选多选）']) as unknown as string,
      '污水疑似来源（平铺勾选多选）': splitMulti(r['污水疑似来源（平铺勾选多选）']) as unknown as string,
    } as RiverOutletVerificationFormValues);
    setEditOpen(true);
  };

  const handleDelete = () => {
    if (!editing) return;
    setData(prev => prev.filter(x => x.排口编号 !== editing.排口编号));
    message.success('删除成功');
    setEditOpen(false);
  };

  const handleSaveEdit = () => {
    editForm.validateFields().then((vals: RiverOutletVerificationFormValues) => {
      if (!editing) return;
      const raw = vals as unknown as Record<string, unknown>;
      const cleaned = stripRiverVerifyFormMeta(raw) as unknown as RiverOutletVerificationRecord;
      const next: RiverOutletVerificationRecord = {
        ...editing,
        ...cleaned,
        排口编号: editing.排口编号,
        '周边环境（平铺勾选多选）': joinMulti(raw['周边环境（平铺勾选多选）']),
        '污水疑似来源（平铺勾选多选）': joinMulti(raw['污水疑似来源（平铺勾选多选）']),
      };
      setData(prev => prev.map(x => (x.排口编号 === editing.排口编号 ? next : x)));
      message.success('保存成功');
      setEditOpen(false);
    });
  };

  const handleAddSave = () => {
    addForm.validateFields().then((vals: RiverOutletVerificationFormValues) => {
      const raw = vals as unknown as Record<string, unknown>;
      const cleaned = stripRiverVerifyFormMeta(raw) as unknown as RiverOutletVerificationRecord;
      const next: RiverOutletVerificationRecord = {
        ...cleaned,
        排口编号: genOutletNo(),
        '周边环境（平铺勾选多选）': joinMulti(raw['周边环境（平铺勾选多选）']),
        '污水疑似来源（平铺勾选多选）': joinMulti(raw['污水疑似来源（平铺勾选多选）']),
      };
      setData(prev => [next, ...prev]);
      message.success('新增成功');
      setAddOpen(false);
    });
  };

  const columns = allColumns
    .filter(col => visibleColumns.includes(col.key) || col.key === 'operation')
    .sort((a, b) => {
      if (a.key === 'operation') return 1;
      if (b.key === 'operation') return -1;
      return visibleColumns.indexOf(a.key) - visibleColumns.indexOf(b.key);
    })
    .map(col => {
      if (col.key === 'operation') {
        return {
          ...col,
          fixed: 'right' as const,
          render: (_: unknown, record: RiverOutletVerificationRecord) => (
            <Space size="small">
              <Button
                type="link"
                size="small"
                className="action-btn detail"
                icon={<EyeOutlined />}
                onClick={() => openDetail(record)}
              >
                详情
              </Button>
              <Button
                type="link"
                size="small"
                className="action-btn edit"
                icon={<EditOutlined />}
                onClick={() => openEdit(record)}
              >
                编辑
              </Button>
            </Space>
          ),
        };
      }
      return col;
    });

  const scrollX = getFacilityTableScrollX(
    allColumns.filter(c => visibleColumns.includes(c.key) || c.key === 'operation'),
  );

  const formModalStyles = {
    body: {
      maxHeight: 'calc(100vh - 240px)',
      overflowY: 'auto' as const,
      overflowX: 'hidden' as const,
      minWidth: 0,
    },
  };

  return (
    <div className="facility-view">
      <Card
        title="入河排口核查列表"
        extra={
          <Space wrap size={[8, 8]} align="center">
            <Button
              icon={<DownloadOutlined />}
              className="export-btn"
              onClick={() => {
                if (filtered.length === 0) {
                  message.warning('当前筛选条件下无数据可导出');
                  return;
                }
                downloadFacilityListExcel(
                  filtered as unknown as Record<string, unknown>[],
                  allColumns,
                  '入河排口核查列表',
                  '入河排口核查',
                );
                message.success('已导出 Excel（全量字段）');
              }}
            >
              导出Excel
            </Button>
            <Upload beforeUpload={() => { message.success('已导入（原型）'); return false; }} showUploadList={false}>
              <Button icon={<UploadOutlined />}>导入</Button>
            </Upload>
            <PipeLineColumnManager columns={allColumns} visibleColumns={visibleColumns} onChange={setVisibleColumns} />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              className="add-btn"
              onClick={() => {
                addForm.resetFields();
                const init = createEmptyRiverOutletVerificationFormValues();
                addForm.setFieldsValue({
                  ...init,
                  [FORM_META_GK_OTHER]: 0,
                  '周边环境（平铺勾选多选）': splitMulti(init['周边环境（平铺勾选多选）']) as unknown as string,
                  '污水疑似来源（平铺勾选多选）': splitMulti(
                    init['污水疑似来源（平铺勾选多选）'],
                  ) as unknown as string,
                });
                setAddOpen(true);
              }}
            >
              入河排污口排查登记
            </Button>
          </Space>
        }
      >
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={8}>
            <Search
              allowClear
              placeholder="搜索排口编号、名称、责任主体、地址、联系人等"
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
            />
          </Col>
          <Col xs={24} sm={8}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="排污口类型"
              style={{ width: '100%' }}
              value={filterType}
              onChange={v => setFilterType(v)}
              options={typeOptions}
            />
          </Col>
          <Col xs={24} sm={8}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="所在乡镇"
              style={{ width: '100%' }}
              value={filterTown}
              onChange={v => setFilterTown(v)}
              options={townOptions}
            />
          </Col>
        </Row>
        <div className="facility-table-wrap">
          <Table
            size="small"
            rowKey="排口编号"
            dataSource={filtered}
            columns={columns}
            scroll={{ x: scrollX }}
            pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }}
          />
        </div>
      </Card>

      <Modal
        styles={formModalStyles}
        title="新增入河排口核查"
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        width={960}
        destroyOnClose
        footer={
          <Space>
            <Button onClick={() => setAddOpen(false)}>取消</Button>
            <Button type="primary" onClick={handleAddSave}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={addForm} layout="vertical">
          <RiverOutletVerificationFormFields form={addForm} waterBodyOptions={waterBodyOptions} />
        </Form>
      </Modal>

      <Modal
        styles={formModalStyles}
        title={`编辑入河排口核查 - ${editing?.排口名称 ?? ''}`}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        width={960}
        destroyOnClose
        footer={
          <Space>
            <Button danger onClick={handleDelete}>
              删除
            </Button>
            <Button onClick={() => setEditOpen(false)}>取消</Button>
            <Button type="primary" onClick={handleSaveEdit}>
              保存
            </Button>
          </Space>
        }
      >
        {editing && (
          <Form form={editForm} layout="vertical" key={editing.排口编号}>
            <Form.Item label="排口编号">
              <Input value={editing.排口编号} disabled />
            </Form.Item>
            <RiverOutletVerificationFormFields form={editForm} waterBodyOptions={waterBodyOptions} />
          </Form>
        )}
      </Modal>
    </div>
  );
};
