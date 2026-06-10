/**
 * 设施管理 · 排口管理 · 责任主体信息（HJ 1314—2023 表 A.2）
 * 列表能力与「排口信息」一致：查询、字段管理、导入/导出占位、新增、编辑、详情（无英文、无实时监测）。
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  InputNumber,
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
import type { UploadFile } from 'antd/es/upload/interface';
import type { DescriptionsProps } from 'antd';
import type { FormInstance } from 'antd/es/form';
import {
  AddrWgs84MapPicker,
  ADDR_MAP_FORM_ITEM_EXTRA,
  ADDR_MAP_INPUT_PLACEHOLDER,
} from '../shared/addrWgs84MapFormBridge';
import { LinkedOutletsWgs84DetailMap } from '../shared/linkedOutletsWgs84DetailMap';
import {
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  getDefaultVisibleColumnKeys,
  getFacilityTableScrollX,
  PipeLineColumnManager,
  type ColumnConfig,
} from './pipe-line-table-kit';
import { downloadFacilityListExcel } from './facility-list-xlsx-export';
import {
  buildLinkedOutletSelectOptions,
  formatLinkedOutletCodesListDisplay,
  outletData,
} from './facility-points-data';
import {
  OUTFALL_APP_APPLY_TYPE_LABEL,
  OUTFALL_APP_APPROVAL_TYPE_LABEL,
  OUTFALL_APP_SECTION_TYPE_LABEL,
  formatResponsiblePartyType,
  getLinkedOutletMapPoints,
  normalizeResponsiblePartyOutletCodes,
  outletResponsiblePartyInitial,
  OUTLET_RESPONSIBLE_PARTY_TYPE_LABEL,
  type OutletResponsiblePartyRecord,
  type ResponsiblePartyPollutantEmissionRow,
  type RiverOutfallSettingApplicationInfo,
} from './facility-outlet-responsible-data';
import { outletIssueInitial } from './facility-outlet-issue-data';
import { getShaoshanAddvcdLabel, SHAOSHAN_ADMIN_TREE_TO_VILLAGE } from '../生态整治/riverChiefDb4401';

const LINKED_OUTLET_OPTIONS = buildLinkedOutletSelectOptions();

const RESPONSIBLE_TYPE_SELECT_OPTIONS = Object.entries(OUTLET_RESPONSIBLE_PARTY_TYPE_LABEL).map(([value, label]) => ({
  value,
  label: `${value} ${label}`,
}));

const YES_NO_MAIN = [
  { value: '是', label: '是' },
  { value: '否', label: '否' },
];

/** 表 A.5：是否类字段（HJ 1314 口径 Y/N） */
const YES_NO_YN = [
  { value: 'Y', label: 'Y 是' },
  { value: 'N', label: 'N 否' },
];

const OUTFALL_APPLY_TYPE_OPTIONS = Object.entries(OUTFALL_APP_APPLY_TYPE_LABEL).map(([value, label]) => ({
  value,
  label: `${value} ${label}`,
}));

const OUTFALL_APPROVAL_TYPE_OPTIONS = Object.entries(OUTFALL_APP_APPROVAL_TYPE_LABEL).map(([value, label]) => ({
  value,
  label: `${value} ${label}`,
}));

const OUTFALL_SECTION_TYPE_OPTIONS = Object.entries(OUTFALL_APP_SECTION_TYPE_LABEL).map(([value, label]) => ({
  value,
  label: `${value} ${label}`,
}));

const genResponsibleId = () => `ZTZT-430382-${Date.now()}`;

function buildOutletOccupiedOwnerMap(data: OutletResponsiblePartyRecord[], excludeResponsibleId?: string) {
  const occupied = new Map<string, string>();
  data.forEach(row => {
    if (excludeResponsibleId && row.责任主体内码 === excludeResponsibleId) return;
    const ownerName = String(row.责任主体名称 || '').trim() || '其他责任主体';
    normalizeResponsiblePartyOutletCodes(row.关联排口编码列表).forEach(code => {
      if (!occupied.has(code)) occupied.set(code, ownerName);
    });
  });
  return occupied;
}

function findLinkedOutletConflict(
  data: OutletResponsiblePartyRecord[],
  outletCodes: string[] | undefined,
  excludeResponsibleId?: string,
) {
  const occupied = buildOutletOccupiedOwnerMap(data, excludeResponsibleId);
  const nextCodes = normalizeResponsiblePartyOutletCodes(outletCodes);
  for (const code of nextCodes) {
    const ownerName = occupied.get(code);
    if (ownerName) return { code, ownerName };
  }
  return null;
}

/** 表 A.3 附件：布局对齐排口资料「快速上传」（Card + 说明 + 只读文件名 + 选择文件） */
function ApplicationAttachmentRow(props: {
  value?: string;
  onChange?: (v: string) => void;
  accept: string;
  /** 行末格式提示，如 jpg / pdf、word */
  hint: string;
  /** 与泵站/排口资料面板一致的灰色说明行 */
  description: string;
}) {
  const { value, onChange, accept, hint, description } = props;
  return (
    <div>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
        {description}
      </Typography.Text>
      <Space wrap align="center" style={{ width: '100%' }}>
        <Input
          readOnly
          value={value ?? ''}
          placeholder="未选择文件"
          style={{ flex: '1 1 240px', minWidth: 180, maxWidth: 480 }}
        />
        <Upload
          beforeUpload={() => false}
          maxCount={1}
          showUploadList={false}
          accept={accept}
          onChange={info => {
            const n = info.file?.name;
            if (n) onChange?.(n);
          }}
        >
          <Button icon={<UploadOutlined />}>选择文件</Button>
        </Upload>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {hint}
        </Typography.Text>
      </Space>
    </div>
  );
}

/** 多文件上传：仅存文件名列表（原型不落盘），与排口资料交互一致 */
function MultiFileNamesUploader({
  value,
  onChange,
  accept,
}: {
  value?: string[];
  onChange?: (v: string[]) => void;
  accept: string;
}) {
  const list = Array.isArray(value) ? value : [];
  const fileList: UploadFile[] = list.map((name, i) => ({
    uid: `f-${i}-${name}`,
    name,
    status: 'done',
  }));
  return (
    <Upload
      multiple
      fileList={fileList}
      beforeUpload={file => {
        onChange?.([...list, file.name]);
        return false;
      }}
      onRemove={file => {
        const rm = file.name;
        onChange?.(list.filter(n => n !== rm));
      }}
      accept={accept}
    >
      <Button icon={<UploadOutlined />}>选择文件（可多选）</Button>
    </Upload>
  );
}

/** 详情：区划代码 + 名称 */
function formatResponsiblePartyAddvcdDetail(code?: string | null): string {
  const c = String(code ?? '').trim();
  if (!c) return '—';
  const lb = getShaoshanAddvcdLabel(c);
  return lb && lb !== '—' ? `${lb}（${c}）` : c;
}

function formatMediaFileList(names?: string[] | null): string {
  const arr = Array.isArray(names) ? names.map(x => String(x).trim()).filter(Boolean) : [];
  if (!arr.length) return '—';
  return arr.join('、');
}

/** 列表查询：关联排口名称包含关键字（按台账编码反查排口名称） */
function rowMatchesLinkedOutletNameKeyword(row: OutletResponsiblePartyRecord, keyword: string): boolean {
  const q = keyword.trim();
  if (!q) return true;
  const codes = normalizeResponsiblePartyOutletCodes(row.关联排口编码列表);
  for (const code of codes) {
    const rec = outletData.find(o => o['入河入海排污口编码'] === code);
    const nm = String(rec?.['入河入海排污口名称'] ?? '');
    if (nm.includes(q)) return true;
  }
  return false;
}

const emptyPollutantRow = (): ResponsiblePartyPollutantEmissionRow => ({
  污染物名称: '',
  是否为主要污染物: undefined,
  是否为特征污染物: undefined,
  执行排放标准: '',
  许可排放浓度: undefined,
  许可排放量: undefined,
  实际排放浓度: undefined,
  实际排放量: undefined,
});

/** 单位基本信息（不含关联排口，排口在独立 Tab 维护） */
function ResponsiblePartyUnitFormFields({ form }: { form: FormInstance<OutletResponsiblePartyRecord> }) {
  return (
    <>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="责任主体类型" label="责任主体类型" rules={[{ required: true, message: '请选择类型' }]}>
            <Select placeholder="请选择" options={RESPONSIBLE_TYPE_SELECT_OPTIONS} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="责任主体名称" label="责任主体名称" rules={[{ required: true }]}>
            <Input maxLength={200} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="责任主体行政区划"
            label="责任主体行政区划"
            tooltip="按 GB／T 2260、GB／T 10114；选至韶山市村/社区级"
            rules={[{ required: true, message: '请选择责任主体行政区划' }]}
          >
            <TreeSelect
              showSearch
              allowClear
              treeDefaultExpandAll
              treeNodeFilterProp="title"
              placeholder="韶山市—村/社区级区划"
              treeData={SHAOSHAN_ADMIN_TREE_TO_VILLAGE}
              dropdownStyle={{ maxHeight: 360, overflow: 'auto' }}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="责任主体行业类别" label="责任主体行业类别" tooltip="GB/T 4754—2017">
            <Input maxLength={120} placeholder="门类及大类或代码（示例）" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="统一社会信用代码" label="统一社会信用代码">
            <Input maxLength={32} placeholder="无则填「—」或留空" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="责任主体排污许可证编号" label="责任主体排污许可证编号" tooltip="无许可证可留空">
            <Input maxLength={64} placeholder="排污许可证编号" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="法定代表人或负责人" label="法定代表人或负责人" rules={[{ required: true }]}>
            <Input maxLength={100} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="是否为主要责任主体" label="是否为主要责任主体" rules={[{ required: true }]}>
            <Select placeholder="请选择" options={YES_NO_MAIN} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="联系人" label="联系人">
            <Input maxLength={100} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="联系电话" label="联系电话">
            <Input maxLength={32} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            name="联系地址"
            label="联系地址"
            extra={ADDR_MAP_FORM_ITEM_EXTRA}
            rules={[{ required: true, message: '请填写联系地址' }]}
          >
            <Input maxLength={300} placeholder={ADDR_MAP_INPUT_PLACEHOLDER} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item label="联系地址地图定位" tooltip="在地图上选点将写入经纬度并与联系地址联动（与综合态势责任主体 POI 同源）">
            <AddrWgs84MapPicker
              form={form}
              addrField="联系地址"
              lngField="联系地址经度"
              latField="联系地址纬度"
              mapAriaLabel="责任主体联系地址地图"
              hintAddressLabel="联系地址"
              lngLatValueMode="number"
            />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name="联系地址经度" hidden>
        <InputNumber />
      </Form.Item>
      <Form.Item name="联系地址纬度" hidden>
        <InputNumber />
      </Form.Item>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="责任开始日期" label="责任开始日期" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="责任结束日期" label="责任结束日期" tooltip="无固定期限可留空">
            <Input type="date" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="填报单位" label="填报单位">
            <Input maxLength={200} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="填报日期" label="填报日期">
            <Input type="date" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            name="责任主体照片列表"
            label="责任主体照片"
            extra="可多图；溯源阶段照片存储地址或文件名，原型仅存文件名、不落盘"
          >
            <MultiFileNamesUploader accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            name="主要责任主体视频列表"
            label="主要责任主体视频"
            extra="MP4/AVI 等；可多文件，原型仅存文件名"
          >
            <MultiFileNamesUploader accept="video/*,.mp4,.avi,.mov,.mkv,.wmv" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item name="备注" label="备注">
            <Input.TextArea rows={2} maxLength={500} />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
}

/** 关联排口：多选 + 已选表可移除（对齐生态整治「河长责任区域」责任段交互） */
function ResponsiblePartyLinkedOutletsFormFields({
  form,
  occupiedOutletOwnerMap,
}: {
  form: FormInstance<OutletResponsiblePartyRecord>;
  occupiedOutletOwnerMap: Map<string, string>;
}) {
  const selectedCodes = normalizeResponsiblePartyOutletCodes(
    Form.useWatch('关联排口编码列表', form) as string[] | undefined,
  );
  const selectedCodeSet = new Set(selectedCodes);
  const linkedOutletOptions = useMemo(
    () =>
      LINKED_OUTLET_OPTIONS.map(option => {
        const code = String(option.value);
        const occupiedBy = occupiedOutletOwnerMap.get(code);
        const disabled = Boolean(occupiedBy) && !selectedCodeSet.has(code);
        const label = disabled ? `${option.label}（已关联责任主体：${occupiedBy}）` : option.label;
        return {
          ...option,
          label,
          disabled,
          title: label,
        };
      }),
    [occupiedOutletOwnerMap, selectedCodeSet],
  );
  return (
    <>
      <Form.Item
        name="关联排口编码列表"
        label="关联排口"
        rules={[
          { required: true, message: '请至少选择一个排口' },
          { type: 'array', min: 1, message: '请至少选择一个排口' },
        ]}
        extra="与「排口信息」台账同源；支持多选。已被其他责任主体关联的排口不可选择。下方已选列表可单行移除。"
      >
        <Select
          mode="multiple"
          showSearch
          allowClear
          optionFilterProp="label"
          placeholder="请选择入河入海排污口（可多选）"
          options={linkedOutletOptions}
          maxTagCount="responsive"
        />
      </Form.Item>
      <Form.Item dependencies={['关联排口编码列表']} noStyle>
        {() => {
          const keys = normalizeResponsiblePartyOutletCodes(form.getFieldValue('关联排口编码列表') as string[] | undefined);
          const rows = keys.map(code => {
            const o = outletData.find(x => x['入河入海排污口编码'] === code);
            return {
              key: code,
              enc: code,
              name: o?.['入河入海排污口名称'] ?? '—',
              addr: o?.['入河入海排污口详细地址']?.trim() ?? '—',
            };
          });
          return (
            <Card size="small" title="已选排口">
              <Table
                size="small"
                rowKey="key"
                pagination={false}
                locale={{ emptyText: '暂未选择排口，请在上方搜索并多选' }}
                dataSource={rows}
                scroll={{ x: 720 }}
                columns={[
                  { title: '入河入海排污口编码', dataIndex: 'enc', width: 200, ellipsis: true },
                  { title: '入河入海排污口名称', dataIndex: 'name', ellipsis: true },
                  { title: '排口详细地址', dataIndex: 'addr', ellipsis: true },
                  {
                    title: '操作',
                    key: 'rm',
                    width: 72,
                    fixed: 'right' as const,
                    render: (_: unknown, rec: { key: string }) => (
                      <Button
                        type="link"
                        size="small"
                        className="action-btn edit"
                        onClick={() => {
                          const cur = normalizeResponsiblePartyOutletCodes(
                            form.getFieldValue('关联排口编码列表') as string[] | undefined,
                          );
                          form.setFieldsValue({ 关联排口编码列表: cur.filter(k => k !== rec.key) });
                        }}
                      >
                        移除
                      </Button>
                    ),
                  },
                ]}
              />
            </Card>
          );
        }}
      </Form.Item>
    </>
  );
}

/** 表 A.5：污染物排放信息，多行可增删 */
function ResponsiblePartyPollutantsFormFields() {
  return (
    <>
      <Form.List name="污染物排放信息列表">
        {(fields, { add, remove }) => (
          <>
            <Space style={{ marginBottom: 12 }} wrap>
              <Button type="primary" icon={<PlusOutlined />} className="add-btn" onClick={() => add(emptyPollutantRow())}>
                增加一行
              </Button>
              <Typography.Text type="secondary">支持按行维护污染物信息，可随时新增或删除</Typography.Text>
            </Space>
            <Table
              size="small"
              pagination={false}
              rowKey="key"
              dataSource={fields}
              locale={{ emptyText: '暂无数据' }}
              scroll={{ x: 1280 }}
              columns={[
                {
                  title: '污染物名称',
                  key: '污染物名称',
                  width: 120,
                  render: (_, field) => (
                    <Form.Item name={[field.name, '污染物名称']} noStyle>
                      <Input placeholder="按 HJ 525" maxLength={64} />
                    </Form.Item>
                  ),
                },
                {
                  title: '主要污染物',
                  key: '是否为主要污染物',
                  width: 108,
                  render: (_, field) => (
                    <Form.Item name={[field.name, '是否为主要污染物']} noStyle>
                      <Select placeholder="Y/N" options={YES_NO_YN} allowClear />
                    </Form.Item>
                  ),
                },
                {
                  title: '特征污染物',
                  key: '是否为特征污染物',
                  width: 108,
                  render: (_, field) => (
                    <Form.Item name={[field.name, '是否为特征污染物']} noStyle>
                      <Select placeholder="Y/N" options={YES_NO_YN} allowClear />
                    </Form.Item>
                  ),
                },
                {
                  title: '执行排放标准',
                  key: '执行排放标准',
                  width: 200,
                  render: (_, field) => (
                    <Form.Item name={[field.name, '执行排放标准']} noStyle>
                      <Input placeholder="标准名称及号" />
                    </Form.Item>
                  ),
                },
                {
                  title: '许可排放浓度 (mg/L)',
                  key: '许可排放浓度',
                  width: 130,
                  render: (_, field) => (
                    <Form.Item name={[field.name, '许可排放浓度']} noStyle>
                      <InputNumber min={0} precision={4} style={{ width: '100%' }} placeholder="D(8,4)" />
                    </Form.Item>
                  ),
                },
                {
                  title: '许可排放量 (t/a)',
                  key: '许可排放量',
                  width: 120,
                  render: (_, field) => (
                    <Form.Item name={[field.name, '许可排放量']} noStyle>
                      <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="D(12,2)" />
                    </Form.Item>
                  ),
                },
                {
                  title: '实际排放浓度 (mg/L，年均)',
                  key: '实际排放浓度',
                  width: 150,
                  render: (_, field) => (
                    <Form.Item name={[field.name, '实际排放浓度']} noStyle>
                      <InputNumber min={0} precision={4} style={{ width: '100%' }} title="按年均值统计（mg/L）" />
                    </Form.Item>
                  ),
                },
                {
                  title: '实际排放量 (t/a)',
                  key: '实际排放量',
                  width: 120,
                  render: (_, field) => (
                    <Form.Item name={[field.name, '实际排放量']} noStyle>
                      <InputNumber min={0} precision={2} style={{ width: '100%' }} />
                    </Form.Item>
                  ),
                },
                {
                  title: '操作',
                  key: 'op',
                  width: 72,
                  fixed: 'right' as const,
                  render: (_, field) => (
                    <Button type="link" danger size="small" icon={<MinusCircleOutlined />} onClick={() => remove(field.name)}>
                      删除
                    </Button>
                  ),
                },
              ]}
            />
          </>
        )}
      </Form.List>
    </>
  );
}

/** 表 A.3：入河排污口设置申请信息（单份表单） */
function ResponsiblePartyApplicationFormFields() {
  return (
    <>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name={['申请信息', '设置申请入河排污口类型']} label="设置申请入河排污口类型">
            <Select allowClear placeholder="C(2)" options={OUTFALL_APPLY_TYPE_OPTIONS} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name={['申请信息', '设置审批类型']} label="设置审批类型">
            <Select allowClear placeholder="C(2)" options={OUTFALL_APPROVAL_TYPE_OPTIONS} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name={['申请信息', '建成时间']} label="建成时间">
            <Input type="date" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name={['申请信息', '入河排污口截面类型']} label="入河排污口截面类型">
            <Select allowClear placeholder="C(2)" options={OUTFALL_SECTION_TYPE_OPTIONS} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name={['申请信息', '截面面积']} label="截面面积 (m²)">
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="D(6,2)" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name={['申请信息', '截面长直径']} label="截面长（直径）(m)">
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="D(4,2)" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name={['申请信息', '截面宽']} label="截面宽 (m)">
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="D(4,2)" />
          </Form.Item>
        </Col>
      </Row>
      <Card size="small" title="受纳水体—排污通道—排污走向示意图" style={{ marginBottom: 16 }}>
        <Form.Item name={['申请信息', '排污走向图说明']} noStyle>
          <ApplicationAttachmentRow
            accept=".jpg,.jpeg"
            hint="jpg"
            description="调起本机文件选择器，仅将文件名写入表单（原型不落盘）。HJ1314：jpg 图片。"
          />
        </Form.Item>
      </Card>
      <Card size="small" title="设置论证报告" style={{ marginBottom: 16 }}>
        <Form.Item name={['申请信息', '设置论证报告说明']} noStyle>
          <ApplicationAttachmentRow
            accept=".pdf,.doc,.docx"
            hint="pdf、word"
            description="调起本机文件选择器，仅将文件名写入表单（原型不落盘）。格式：pdf / word。"
          />
        </Form.Item>
      </Card>
      <Card size="small" title="第三方的承诺书" style={{ marginBottom: 16 }}>
        <Form.Item name={['申请信息', '第三方承诺书说明']} noStyle>
          <ApplicationAttachmentRow
            accept=".pdf,.doc,.docx"
            hint="pdf、word"
            description="调起本机文件选择器，仅将文件名写入表单（原型不落盘）。格式：pdf / word。"
          />
        </Form.Item>
      </Card>
      <Card size="small" title="设置简要分析材料" style={{ marginBottom: 16 }}>
        <Form.Item name={['申请信息', '设置简要分析材料说明']} noStyle>
          <ApplicationAttachmentRow
            accept=".pdf,.doc,.docx"
            hint="pdf、word"
            description="调起本机文件选择器，仅将文件名写入表单（原型不落盘）。格式：pdf / word。"
          />
        </Form.Item>
      </Card>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name={['申请信息', '申请单位']} label="申请单位">
            <Input maxLength={200} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name={['申请信息', '申请时间']} label="申请时间">
            <Input type="date" />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
}

function ResponsiblePartyFormFields({
  form,
  occupiedOutletOwnerMap,
}: {
  form: FormInstance<OutletResponsiblePartyRecord>;
  occupiedOutletOwnerMap: Map<string, string>;
}) {
  const rawList = Form.useWatch('关联排口编码列表', form);
  const cnt = normalizeResponsiblePartyOutletCodes(rawList as string[] | undefined).length;
  const pollutantList = Form.useWatch('污染物排放信息列表', form) as ResponsiblePartyPollutantEmissionRow[] | undefined;
  const pn = Array.isArray(pollutantList) ? pollutantList.length : 0;
  return (
    <Tabs
      defaultActiveKey="unit"
      items={[
        { key: 'unit', label: '基本信息', children: <ResponsiblePartyUnitFormFields form={form} /> },
        {
          key: 'outlets',
          label: cnt ? `关联排口（${cnt}）` : '关联排口',
          children: <ResponsiblePartyLinkedOutletsFormFields form={form} occupiedOutletOwnerMap={occupiedOutletOwnerMap} />,
        },
        {
          key: 'pollutants',
          label: pn ? `污染物排放信息（${pn}）` : '污染物排放信息',
          children: <ResponsiblePartyPollutantsFormFields />,
        },
        { key: 'application', label: '申请信息', children: <ResponsiblePartyApplicationFormFields /> },
      ]}
    />
  );
}

function fmtLonLatCoord(v: unknown): string {
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : '—';
}

/** 基本信息详情：经纬度 + 地图嵌在描述列表内（对齐生态整治「项目档案」建设地点地图） */
function ResponsiblePartyDetailReadonly({
  r,
  showLocationMiniMap = true,
}: {
  r: OutletResponsiblePartyRecord;
  showLocationMiniMap?: boolean;
}) {
  const responsibleMapPoints = useMemo(() => {
    const lng = Number(r.联系地址经度);
    const lat = Number(r.联系地址纬度);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return [];
    return [
      {
        lng,
        lat,
        title: r.责任主体名称 || '责任主体',
        subtitle: r.联系地址?.trim() || '联系地址',
      },
    ];
  }, [r.责任主体名称, r.联系地址, r.联系地址经度, r.联系地址纬度]);

  const items: DescriptionsProps['items'] = [
    { key: '1', label: '责任主体内码', children: r.责任主体内码 || '—' },
    { key: '2', label: '责任主体名称', children: r.责任主体名称 || '—' },
    { key: '3', label: '责任主体类型', children: formatResponsiblePartyType(r.责任主体类型) },
    { key: '4', label: '责任主体行政区划', children: formatResponsiblePartyAddvcdDetail(r.责任主体行政区划) },
    { key: '5', label: '责任主体行业类别', children: r.责任主体行业类别?.trim() || '—' },
    { key: '6', label: '统一社会信用代码', children: r.统一社会信用代码?.trim() || '—' },
    { key: '6p', label: '责任主体排污许可证编号', children: r.责任主体排污许可证编号?.trim() || '—' },
    { key: '7', label: '法定代表人或负责人', children: r.法定代表人或负责人 || '—' },
    { key: '8', label: '联系人', children: r.联系人?.trim() || '—' },
    { key: '9', label: '联系电话', children: r.联系电话?.trim() || '—' },
    { key: '10', label: '联系地址', children: r.联系地址?.trim() || '—', span: 2 },
    { key: '10lng', label: '联系地址经度（度）', children: fmtLonLatCoord(r.联系地址经度) },
    { key: '10lat', label: '联系地址纬度（度）', children: fmtLonLatCoord(r.联系地址纬度) },
    ...(showLocationMiniMap
      ? ([
          {
            key: '10map',
            label: '责任主体地图位置',
            span: 2,
            children:
              responsibleMapPoints.length > 0 ? (
                <LinkedOutletsWgs84DetailMap points={responsibleMapPoints} mapAriaLabel="责任主体地图位置" />
              ) : (
                <Typography.Text type="secondary">暂无联系地址经纬度，无法在地图上展示。</Typography.Text>
              ),
          },
        ] satisfies DescriptionsProps['items'])
      : []),
    { key: '11', label: '是否为主要责任主体', children: r.是否为主要责任主体 || '—' },
    { key: '12', label: '责任开始日期', children: r.责任开始日期 || '—' },
    { key: '13', label: '责任结束日期', children: r.责任结束日期?.trim() || '—' },
    { key: '14', label: '填报单位', children: r.填报单位?.trim() || '—' },
    { key: '15', label: '填报日期', children: r.填报日期?.trim() || '—' },
    { key: '16', label: '责任主体照片', children: formatMediaFileList(r.责任主体照片列表), span: 2 },
    { key: '17', label: '主要责任主体视频', children: formatMediaFileList(r.主要责任主体视频列表), span: 2 },
    { key: '18', label: '备注', children: r.备注?.trim() || '—', span: 2 },
  ];
  return <Descriptions bordered column={2} size="small" items={items} />;
}

function fmtApplyType(code?: string) {
  const k = String(code ?? '').trim();
  if (!k) return '—';
  const lb = OUTFALL_APP_APPLY_TYPE_LABEL[k];
  return lb ? `${k} ${lb}` : k;
}

function fmtApprovalType(code?: string) {
  const k = String(code ?? '').trim();
  if (!k) return '—';
  const lb = OUTFALL_APP_APPROVAL_TYPE_LABEL[k];
  return lb ? `${k} ${lb}` : k;
}

function fmtSectionType(code?: string) {
  const k = String(code ?? '').trim();
  if (!k) return '—';
  const lb = OUTFALL_APP_SECTION_TYPE_LABEL[k];
  return lb ? `${k} ${lb}` : k;
}

function ResponsiblePartyPollutantsDetailTable({ r }: { r: OutletResponsiblePartyRecord }) {
  const rows = useMemo(() => {
    const list = r.污染物排放信息列表 ?? [];
    return list.map((row, i) => ({ ...row, key: `p-${i}` }));
  }, [r.污染物排放信息列表]);
  const n = rows.length;
  return (
    <Card size="small" title={n ? `污染物排放（${n} 条）` : '污染物排放信息'}>
      <Table
        size="small"
        rowKey="key"
        pagination={false}
        locale={{ emptyText: '暂无数据，请在编辑中「增加一行」维护表 A.5' }}
        dataSource={rows}
        scroll={{ x: 1100 }}
        columns={[
          { title: '污染物名称', dataIndex: '污染物名称', width: 120, ellipsis: true, render: v => v || '—' },
          {
            title: '主要污染物',
            dataIndex: '是否为主要污染物',
            width: 100,
            render: v => (v === 'Y' ? 'Y 是' : v === 'N' ? 'N 否' : '—'),
          },
          {
            title: '特征污染物',
            dataIndex: '是否为特征污染物',
            width: 100,
            render: v => (v === 'Y' ? 'Y 是' : v === 'N' ? 'N 否' : '—'),
          },
          { title: '执行排放标准', dataIndex: '执行排放标准', ellipsis: true, render: v => v || '—' },
          { title: '许可排放浓度 (mg/L)', dataIndex: '许可排放浓度', width: 130, render: v => (v != null && v !== '' ? v : '—') },
          { title: '许可排放量 (t/a)', dataIndex: '许可排放量', width: 120, render: v => (v != null && v !== '' ? v : '—') },
          { title: '实际排放浓度 (mg/L)', dataIndex: '实际排放浓度', width: 140, render: v => (v != null && v !== '' ? v : '—') },
          { title: '实际排放量 (t/a)', dataIndex: '实际排放量', width: 120, render: v => (v != null && v !== '' ? v : '—') },
        ]}
      />
    </Card>
  );
}

function ResponsiblePartyApplicationDetailReadonly({ r }: { r: OutletResponsiblePartyRecord }) {
  const a: RiverOutfallSettingApplicationInfo = r.申请信息 ?? {};
  const items: DescriptionsProps['items'] = [
    { key: '1', label: '设置申请入河排污口类型', children: fmtApplyType(a.设置申请入河排污口类型) },
    { key: '2', label: '设置审批类型', children: fmtApprovalType(a.设置审批类型) },
    { key: '3', label: '建成时间', children: a.建成时间?.trim() || '—' },
    { key: '4', label: '入河排污口截面类型', children: fmtSectionType(a.入河排污口截面类型) },
    { key: '5', label: '截面面积 (m²)', children: a.截面面积 != null ? String(a.截面面积) : '—' },
    { key: '6', label: '截面长（直径）(m)', children: a.截面长直径 != null ? String(a.截面长直径) : '—' },
    { key: '7', label: '截面宽 (m)', children: a.截面宽 != null ? String(a.截面宽) : '—' },
    { key: '8', label: '排污走向示意图', children: a.排污走向图说明?.trim() || '—', span: 2 },
    { key: '9', label: '设置论证报告', children: a.设置论证报告说明?.trim() || '—', span: 2 },
    { key: '10', label: '第三方的承诺书', children: a.第三方承诺书说明?.trim() || '—', span: 2 },
    { key: '11', label: '设置简要分析材料', children: a.设置简要分析材料说明?.trim() || '—', span: 2 },
    { key: '12', label: '申请单位', children: a.申请单位?.trim() || '—' },
    { key: '13', label: '申请时间', children: a.申请时间?.trim() || '—' },
  ];
  return <Descriptions bordered column={2} size="small" items={items} />;
}

function ResponsiblePartyLinkedOutletsDetailTable({ r }: { r: OutletResponsiblePartyRecord }) {
  const rows = useMemo(() => {
    return normalizeResponsiblePartyOutletCodes(r.关联排口编码列表).map(code => {
      const o = outletData.find(x => x['入河入海排污口编码'] === code);
      return {
        key: code,
        enc: code,
        name: o?.['入河入海排污口名称'] ?? '—',
        addr: o?.['入河入海排污口详细地址']?.trim() ?? '—',
      };
    });
  }, [r.关联排口编码列表]);
  const n = rows.length;
  return (
    <Card size="small" title={n ? `已关联排口（${n}）` : '已关联排口'}>
      <Table
        size="small"
        rowKey="key"
        pagination={false}
        locale={{ emptyText: '未关联排口' }}
        dataSource={rows}
        scroll={{ x: 720 }}
        columns={[
          { title: '入河入海排污口编码', dataIndex: 'enc', width: 200, ellipsis: true },
          { title: '入河入海排污口名称', dataIndex: 'name', ellipsis: true },
          { title: '排口详细地址', dataIndex: 'addr', ellipsis: true },
        ]}
      />
    </Card>
  );
}

/** 关联排口 Tab：表格下方内嵌位置地图（不再置于 Tab 外） */
function ResponsiblePartyLinkedOutletsDetailWithMap({
  r,
  showLocationMiniMap = true,
}: {
  r: OutletResponsiblePartyRecord;
  showLocationMiniMap?: boolean;
}) {
  const outletPoints = useMemo(() => getLinkedOutletMapPoints(r), [r]);
  return (
    <>
      <ResponsiblePartyLinkedOutletsDetailTable r={r} />
      {showLocationMiniMap ? (
        <Card
          size="small"
          title="关联排口位置"
          className="facility-outlet-responsible-map-card"
          style={{ marginTop: 16 }}
        >
          <LinkedOutletsWgs84DetailMap points={outletPoints} mapAriaLabel="关联排口位置地图" />
        </Card>
      ) : null}
    </>
  );
}

/** 详情弹窗：多 Tab；地图嵌入各自 Tab 内容区（基本信息见描述列表内嵌地图，与「项目档案」建设地点地图一致） */
export function OutletResponsiblePartyDetailContent({
  r,
  showLocationMiniMap = true,
}: {
  r: OutletResponsiblePartyRecord;
  showLocationMiniMap?: boolean;
}) {
  const cnt = normalizeResponsiblePartyOutletCodes(r.关联排口编码列表).length;
  const pn = (r.污染物排放信息列表 ?? []).length;
  const linkedIssues = useMemo(
    () => outletIssueInitial.filter(item => String(item.责任主体) === String(r.责任主体名称)),
    [r.责任主体名称],
  );
  return (
    <div>
      <Tabs
        defaultActiveKey="unit"
        items={[
          {
            key: 'unit',
            label: '基本信息',
            children: <ResponsiblePartyDetailReadonly r={r} showLocationMiniMap={showLocationMiniMap} />,
          },
          {
            key: 'outlets',
            label: cnt ? `关联排口（${cnt}）` : '关联排口',
            children: (
              <ResponsiblePartyLinkedOutletsDetailWithMap
                r={r}
                showLocationMiniMap={showLocationMiniMap}
              />
            ),
          },
          {
            key: 'pollutants',
            label: pn ? `污染物排放信息（${pn}）` : '污染物排放信息',
            children: <ResponsiblePartyPollutantsDetailTable r={r} />,
          },
          {
            key: 'issues',
            label: linkedIssues.length ? `问题列表（${linkedIssues.length}）` : '问题列表',
            children: (
              <Table
                size="small"
                rowKey="id"
                pagination={false}
                locale={{ emptyText: '暂无关联问题' }}
                dataSource={linkedIssues}
                scroll={{ x: 980 }}
                columns={[
                  { title: '问题编号', dataIndex: 'id', width: 160 },
                  { title: '关联排口编码', dataIndex: '关联排口编码', width: 180 },
                  { title: '问题类型', dataIndex: '问题类型', render: (v: string[]) => v.join('、'), width: 260 },
                  { title: '整改优先级', dataIndex: '整改优先级', width: 110 },
                  { title: '状态', dataIndex: '状态', width: 100 },
                  { title: '上报时间', dataIndex: '上报时间', width: 180 },
                ]}
              />
            ),
          },
          { key: 'application', label: '申请信息', children: <ResponsiblePartyApplicationDetailReadonly r={r} /> },
        ]}
      />
    </div>
  );
}

export const OutletResponsiblePartyView: React.FC<{
  onDetail: (title: string, content: React.ReactNode, modalWidth?: number | string) => void;
  dataSource?: OutletResponsiblePartyRecord[];
  onDataChange?: (next: OutletResponsiblePartyRecord[]) => void;
}> = ({ onDetail, dataSource, onDataChange }) => {
  const [data, setData] = useState<OutletResponsiblePartyRecord[]>(() =>
    Array.isArray(dataSource) ? [...dataSource] : [...outletResponsiblePartyInitial],
  );
  const [filterName, setFilterName] = useState('');
  /** 责任主体行政区划（韶山市—村/社区代码） */
  const [filterAddvcd, setFilterAddvcd] = useState<string | undefined>();
  const [filterType, setFilterType] = useState<string | undefined>();
  /** 是否为主要责任主体 */
  const [filterMainResponsible, setFilterMainResponsible] = useState<string | undefined>();
  /** 关联排口名称（模糊） */
  const [filterOutletNameKw, setFilterOutletNameKw] = useState('');
  /** 责任主体统一社会信用代码（模糊），台账字段仍为 `统一社会信用代码` */
  const [filterCreditCode, setFilterCreditCode] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<OutletResponsiblePartyRecord | null>(null);
  const [addForm] = Form.useForm<OutletResponsiblePartyRecord>();
  const [editForm] = Form.useForm<OutletResponsiblePartyRecord>();
  useEffect(() => {
    if (!Array.isArray(dataSource)) return;
    setData([...dataSource]);
  }, [dataSource]);

  const applyDataUpdate = (updater: (prev: OutletResponsiblePartyRecord[]) => OutletResponsiblePartyRecord[]) => {
    setData(prev => {
      const next = updater(prev);
      onDataChange?.(next);
      return next;
    });
  };

  const addOccupiedOutletOwnerMap = useMemo(() => buildOutletOccupiedOwnerMap(data), [data]);
  const editOccupiedOutletOwnerMap = useMemo(
    () => buildOutletOccupiedOwnerMap(data, editing?.责任主体内码),
    [data, editing?.责任主体内码],
  );

  const allColumns: ColumnConfig[] = useMemo(
    () => [
      { key: '责任主体内码', title: '责任主体内码', dataIndex: '责任主体内码', width: 200, defaultVisible: true },
      {
        key: '关联排口编码列表',
        title: '关联排口',
        dataIndex: '关联排口编码列表',
        width: 120,
        defaultVisible: true,
        render: (_: unknown, record: OutletResponsiblePartyRecord) => {
          const n = normalizeResponsiblePartyOutletCodes(record.关联排口编码列表).length;
          const tip = n ? formatLinkedOutletCodesListDisplay(record.关联排口编码列表) : '未关联排口';
          return (
            <Tooltip title={tip}>
              <span>{n} 个</span>
            </Tooltip>
          );
        },
      },
      { key: '责任主体名称', title: '责任主体名称', dataIndex: '责任主体名称', width: 200, defaultVisible: true },
      {
        key: '责任主体类型',
        title: '责任主体类型',
        dataIndex: '责任主体类型',
        width: 160,
        defaultVisible: true,
        render: (v: unknown) => formatResponsiblePartyType(v as string),
      },
      {
        key: '责任主体行政区划',
        title: '责任主体行政区划',
        dataIndex: '责任主体行政区划',
        width: 220,
        defaultVisible: false,
        ellipsis: true,
        render: (v: unknown) => formatResponsiblePartyAddvcdDetail(v as string),
      },
      {
        key: '责任主体行业类别',
        title: '责任主体行业类别',
        dataIndex: '责任主体行业类别',
        width: 168,
        defaultVisible: false,
        ellipsis: true,
      },
      { key: '统一社会信用代码', title: '统一社会信用代码', dataIndex: '统一社会信用代码', width: 180, defaultVisible: false },
      {
        key: '责任主体排污许可证编号',
        title: '责任主体排污许可证编号',
        dataIndex: '责任主体排污许可证编号',
        width: 200,
        defaultVisible: false,
        ellipsis: true,
      },
      {
        key: '法定代表人或负责人',
        title: '法定代表人或负责人',
        dataIndex: '法定代表人或负责人',
        width: 140,
        defaultVisible: true,
      },
      { key: '联系人', title: '联系人', dataIndex: '联系人', width: 100, defaultVisible: false },
      { key: '联系电话', title: '联系电话', dataIndex: '联系电话', width: 130, defaultVisible: true },
      { key: '联系地址', title: '联系地址', dataIndex: '联系地址', width: 260, defaultVisible: false },
      { key: '是否为主要责任主体', title: '是否为主要责任主体', dataIndex: '是否为主要责任主体', width: 130, defaultVisible: true },
      { key: '责任开始日期', title: '责任开始日期', dataIndex: '责任开始日期', width: 120, defaultVisible: true },
      { key: '责任结束日期', title: '责任结束日期', dataIndex: '责任结束日期', width: 120, defaultVisible: false },
      { key: '填报单位', title: '填报单位', dataIndex: '填报单位', width: 160, defaultVisible: false },
      { key: '填报日期', title: '填报日期', dataIndex: '填报日期', width: 112, defaultVisible: false },
      { key: '备注', title: '备注', dataIndex: '备注', width: 200, defaultVisible: false },
      { key: 'operation', title: '操作', width: 180, defaultVisible: true },
    ],
    [],
  );

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => getDefaultVisibleColumnKeys(allColumns));

  useEffect(() => {
    setVisibleColumns(getDefaultVisibleColumnKeys(allColumns));
  }, [allColumns]);

  const filtered = useMemo(() => {
    const nameKw = filterName.trim();
    const creditKw = filterCreditCode.trim();
    return data.filter(row => {
      if (filterAddvcd && String(row.责任主体行政区划 ?? '').trim() !== filterAddvcd) return false;
      if (filterType && String(row.责任主体类型) !== filterType) return false;
      if (filterMainResponsible && String(row.是否为主要责任主体 ?? '') !== filterMainResponsible) return false;
      if (nameKw && !String(row.责任主体名称 ?? '').includes(nameKw)) return false;
      if (!rowMatchesLinkedOutletNameKeyword(row, filterOutletNameKw)) return false;
      if (creditKw && !String(row.统一社会信用代码 ?? '').includes(creditKw)) return false;
      return true;
    });
  }, [
    data,
    filterAddvcd,
    filterCreditCode,
    filterMainResponsible,
    filterName,
    filterOutletNameKw,
    filterType,
  ]);

  const openDetail = (r: OutletResponsiblePartyRecord) => {
    onDetail(
      `责任主体详情 - ${r.责任主体名称}`,
      <OutletResponsiblePartyDetailContent r={r} />,
      'min(1200px, 96vw)',
    );
  };

  const openEdit = (r: OutletResponsiblePartyRecord) => {
    setEditing(r);
    editForm.setFieldsValue({
      ...r,
      责任主体照片列表: r.责任主体照片列表 ?? [],
      主要责任主体视频列表: r.主要责任主体视频列表 ?? [],
    });
    setEditOpen(true);
  };

  const handleDelete = () => {
    if (!editing) return;
    applyDataUpdate(prev => prev.filter(x => x.责任主体内码 !== editing.责任主体内码));
    message.success('删除成功');
    setEditOpen(false);
  };

  const handleSaveEdit = () => {
    editForm.validateFields().then((vals: OutletResponsiblePartyRecord) => {
      if (!editing) return;
      const conflict = findLinkedOutletConflict(data, vals.关联排口编码列表, editing.责任主体内码);
      if (conflict) {
        message.error(`排口 ${conflict.code} 已关联责任主体「${conflict.ownerName}」，请先解除后再选择`);
        return;
      }
      const next: OutletResponsiblePartyRecord = {
        ...editing,
        ...vals,
        责任主体内码: editing.责任主体内码,
        关联排口编码列表: normalizeResponsiblePartyOutletCodes(vals.关联排口编码列表),
        责任主体照片列表: Array.isArray(vals.责任主体照片列表)
          ? vals.责任主体照片列表.filter(Boolean)
          : [],
        主要责任主体视频列表: Array.isArray(vals.主要责任主体视频列表)
          ? vals.主要责任主体视频列表.filter(Boolean)
          : [],
        污染物排放信息列表: Array.isArray(vals.污染物排放信息列表)
          ? vals.污染物排放信息列表
          : (editing.污染物排放信息列表 ?? []),
        申请信息: {
          ...(editing.申请信息 ?? {}),
          ...(vals.申请信息 && typeof vals.申请信息 === 'object' ? vals.申请信息 : {}),
        },
      };
      applyDataUpdate(prev => prev.map(x => (x.责任主体内码 === editing.责任主体内码 ? next : x)));
      message.success('保存成功');
      setEditOpen(false);
    });
  };

  const handleAddSave = () => {
    addForm.validateFields().then((vals: OutletResponsiblePartyRecord) => {
      const conflict = findLinkedOutletConflict(data, vals.关联排口编码列表);
      if (conflict) {
        message.error(`排口 ${conflict.code} 已关联责任主体「${conflict.ownerName}」，请先解除后再选择`);
        return;
      }
      const next: OutletResponsiblePartyRecord = {
        ...vals,
        责任主体内码: genResponsibleId(),
        关联排口编码列表: normalizeResponsiblePartyOutletCodes(vals.关联排口编码列表),
        责任主体照片列表: Array.isArray(vals.责任主体照片列表) ? vals.责任主体照片列表.filter(Boolean) : [],
        主要责任主体视频列表: Array.isArray(vals.主要责任主体视频列表)
          ? vals.主要责任主体视频列表.filter(Boolean)
          : [],
        污染物排放信息列表: Array.isArray(vals.污染物排放信息列表) ? vals.污染物排放信息列表 : [],
        申请信息: vals.申请信息 && typeof vals.申请信息 === 'object' ? vals.申请信息 : {},
      };
      applyDataUpdate(prev => [next, ...prev]);
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
          render: (_: unknown, record: OutletResponsiblePartyRecord) => (
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

  const getCurrentDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="facility-view">
      <Card
        title="责任主体信息"
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
                downloadFacilityListExcel(filtered as unknown as Record<string, unknown>[], allColumns, '责任主体信息', '责任主体');
                message.success('已导出 Excel（全量字段）');
              }}
            >
              导出Excel
            </Button>
            <Upload beforeUpload={() => { message.success('已导入（原型）'); return false; }} showUploadList={false}>
              <Button icon={<UploadOutlined />}>导入</Button>
            </Upload>
            <PipeLineColumnManager columns={allColumns} visibleColumns={visibleColumns} onChange={setVisibleColumns} />
            <Button type="primary" icon={<PlusOutlined />} className="add-btn" onClick={() => {
              addForm.resetFields();
              addForm.setFieldsValue({
                是否为主要责任主体: '否',
                责任开始日期: getCurrentDate(),
                填报日期: getCurrentDate(),
                关联排口编码列表: [],
                污染物排放信息列表: [],
                责任主体照片列表: [],
                主要责任主体视频列表: [],
                申请信息: {},
              } as Partial<OutletResponsiblePartyRecord>);
              setAddOpen(true);
            }}
            >
              新增
            </Button>
          </Space>
        }
      >
        <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8} lg={4}>
            <TreeSelect
              allowClear
              showSearch
              treeDefaultExpandAll
              treeNodeFilterProp="title"
              placeholder="责任主体行政区划"
              style={{ width: '100%' }}
              value={filterAddvcd}
              onChange={v => setFilterAddvcd(v)}
              treeData={SHAOSHAN_ADMIN_TREE_TO_VILLAGE}
              dropdownStyle={{ maxHeight: 360, overflow: 'auto' }}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="责任主体类型"
              style={{ width: '100%' }}
              value={filterType}
              onChange={v => setFilterType(v)}
              options={RESPONSIBLE_TYPE_SELECT_OPTIONS}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Select
              allowClear
              placeholder="是否为主要责任主体"
              style={{ width: '100%' }}
              value={filterMainResponsible}
              onChange={v => setFilterMainResponsible(v)}
              options={YES_NO_MAIN}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Input
              allowClear
              placeholder="责任主体名称"
              value={filterName}
              onChange={e => setFilterName(e.target.value)}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Input
              allowClear
              placeholder="关联排口名称"
              value={filterOutletNameKw}
              onChange={e => setFilterOutletNameKw(e.target.value)}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Input
              allowClear
              placeholder="责任主体统一社会信用代码"
              value={filterCreditCode}
              onChange={e => setFilterCreditCode(e.target.value)}
            />
          </Col>
        </Row>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={24} style={{ textAlign: 'right' }}>
            <Space>
              <Button type="primary" className="search-btn">
                查询
              </Button>
              <Button
                onClick={() => {
                  setFilterAddvcd(undefined);
                  setFilterType(undefined);
                  setFilterMainResponsible(undefined);
                  setFilterName('');
                  setFilterOutletNameKw('');
                  setFilterCreditCode('');
                }}
              >
                重置
              </Button>
            </Space>
          </Col>
        </Row>
        <div className="facility-table-wrap">
          <Table
            size="small"
            rowKey="责任主体内码"
            dataSource={filtered}
            columns={columns}
            scroll={{ x: scrollX }}
            pagination={{ defaultPageSize: 10, showTotal: t => `共 ${t} 条` }}
          />
        </div>
      </Card>

      <Modal
        title="新增责任主体"
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        width={1080}
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
          <ResponsiblePartyFormFields form={addForm} occupiedOutletOwnerMap={addOccupiedOutletOwnerMap} />
        </Form>
      </Modal>

      <Modal
        title={`编辑责任主体 - ${editing?.责任主体名称 ?? ''}`}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        width={1080}
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
          <Form form={editForm} layout="vertical" key={editing.责任主体内码}>
            <Form.Item name="责任主体内码" label="责任主体内码" hidden>
              <Input />
            </Form.Item>
            <ResponsiblePartyFormFields form={editForm} occupiedOutletOwnerMap={editOccupiedOutletOwnerMap} />
          </Form>
        )}
      </Modal>
    </div>
  );
};
