/**
 * 排水户台账视图：列表/字段管理与污水厂一致；每户主表关联一条排水许可证（非列表）
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Empty,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Upload,
  message,
} from 'antd';
import type { DescriptionsProps } from 'antd';
import type { UploadFile, UploadProps } from 'antd/es/upload';
import {
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { SHAOSHAN_SUB_REGION_OPTIONS } from '../应急协同/riskIdentification';
import { DetailTabsIfMultiple } from '../shared/detailTabsIfMultiple';
import { padDescriptionsItemsForFullWidthRow } from '../shared/descriptionsPadForFullSpanItems';
import {
  AddrWgs84MapPicker,
  AddrWgs84DetailMap,
  ADDR_MAP_FORM_ITEM_EXTRA,
  ADDR_MAP_INPUT_PLACEHOLDER,
} from '../shared/addrWgs84MapFormBridge';
import {
  getDefaultVisibleColumnKeys,
  getFacilityTableScrollX,
  PipeLineColumnManager,
  type ColumnConfig,
} from './pipe-line-table-kit';
import { buildManholePipeNodeSelectOptions, formatManholePipeNodeLabel } from './pipe-network-demo-data';
import { downloadFacilityListExcel, dischargerListExportFormatByKey } from './facility-list-xlsx-export';
import { buildLinkedOutletSelectOptions, formatLinkedOutletCodeDisplay } from './facility-points-data';
import {
  DISCHARGER_DATA_SOURCE_OPTIONS,
  DISCHARGER_TYPE_OPTIONS,
  YES_NO_01_OPTIONS,
  type PsDischLicRecord,
  type PsDischargerRecord,
  dischargerDemoData,
  dischargerLabelDataSource,
  dischargerLabelYesNo,
} from './facility-discharger-data';

/** 关联排口下拉（与排口台账同源，模块级缓存） */
const LINKED_OUTLET_SELECT_OPTIONS = buildLinkedOutletSelectOptions();

/** 接驳点：仅检查井管点（pipeNodeData · nodeType=1） */
const MANHOLE_PIPE_NODE_OPTIONS = buildManholePipeNodeSelectOptions();

/** 韶山市辖乡镇（街道），与污水厂「所属区划」同源 */
const SHAOSHAN_ADDV_SELECT_OPTIONS = [...SHAOSHAN_SUB_REGION_OPTIONS].map((x) => ({ value: x, label: x }));

/** 本地选图（原型不上传服务器），表单字段仍为分号分隔的文件名列表以兼容 pic_ids 语义 */
function fileListFromPicIds(picIds?: string): UploadFile[] {
  if (!picIds?.trim()) return [];
  return picIds.split(';').map((name, i) => ({
    uid: `saved-${i}-${name.trim()}`,
    name: name.trim(),
    status: 'done' as const,
  }));
}

const PicIdsLocalUpload: React.FC<{ value?: string; onChange?: (v: string) => void }> = ({ value, onChange }) => {
  const [fileList, setFileList] = useState<UploadFile[]>(() => fileListFromPicIds(value));
  useEffect(() => {
    setFileList(fileListFromPicIds(value));
  }, [value]);

  const handleChange: UploadProps['onChange'] = ({ fileList: fl }) => {
    const next = fl.map((f) => {
      if (f.originFileObj && !f.thumbUrl) {
        return { ...f, thumbUrl: URL.createObjectURL(f.originFileObj) };
      }
      return f;
    });
    setFileList(next);
    const names = next
      .map((f) => (f.originFileObj ? (f.originFileObj as File).name : f.name))
      .filter(Boolean) as string[];
    onChange?.(names.length ? names.join(';') : '');
  };

  return (
    <Upload
      listType="picture-card"
      multiple
      accept="image/*"
      beforeUpload={() => false}
      fileList={fileList}
      onChange={handleChange}
      onPreview={() => message.info('本地预览演示，未上传服务器')}
    >
      {fileList.length >= 8 ? null : (
        <div>
          <PlusOutlined />
          <div style={{ marginTop: 8 }}>上传</div>
        </div>
      )}
    </Upload>
  );
};

const formModalStyles = {
  body: {
    maxHeight: 'calc(100vh - 240px)',
    overflowY: 'auto' as const,
    overflowX: 'hidden' as const,
    minWidth: 0,
  },
};

function generateId(prefix: string): string {
  const date = new Date();
  const timestamp =
    date.getFullYear().toString() +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  return `${prefix}${timestamp}${random}`;
}

function getCurrentDate(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** 新增/未办证时：许可证表单初值（证号为空则整户视为暂无许可证） */
function createEmptyLicenseFormValues(
  main: Pick<PsDischargerRecord, 'dischargerCode' | 'dischargerName' | 'addr' | 'systemCode' | 'reportUnit' | 'reportDate'> & {
    licenceId?: string;
  },
): PsDischLicRecord {
  return {
    id: generateId('LIC'),
    dischargerCode: main.dischargerCode,
    name: main.dischargerName,
    contactName: '',
    contactTel: '',
    drainageCode: main.licenceId ?? '',
    wastewaterDrainageType: '',
    polluType: '',
    drainagePermitKind: '',
    validStartTime: '',
    licenceExpdate: '',
    effectiveState: '',
    state: '',
    isTemporary: '0',
    addr: main.addr ?? '',
    systemCode: main.systemCode ?? '',
    supervisoryAuthorityName: '',
    isCredentials: '1',
    hasBusinessLicense: '1',
    reportUnit: main.reportUnit ?? '',
    reportDate: main.reportDate ?? getCurrentDate(),
  };
}

function parseLicenseFormToRecord(vals: Record<string, unknown>, main: Pick<PsDischargerRecord, 'dischargerCode' | 'dischargerName'>): PsDischLicRecord {
  const n = (v: unknown) => (v === '' || v === undefined || v === null ? undefined : Number(v));
  return {
    ...(vals as unknown as PsDischLicRecord),
    dischargerCode: main.dischargerCode,
    name: main.dischargerName,
    area: n(vals.area),
  };
}

/** 内嵌编辑时：地址、排水系统、填报与照片等与排水户主表同源，保存时从主表写入许可证对象 */
function mergeLicenseFromDischargerMain(lic: PsDischLicRecord, main: PsDischargerRecord): PsDischLicRecord {
  return {
    ...lic,
    dischargerCode: main.dischargerCode,
    name: main.dischargerName,
    addr: main.addr,
    systemCode: main.systemCode ?? lic.systemCode,
    recordDate: main.recordDate,
    reportUnit: main.reportUnit,
    reportDate: main.reportDate,
    picIds: main.picIds,
    remark: main.remark ?? lic.remark,
  };
}

/** 排水许可证详情：单条 Descriptions（与「基本信息」Tab 重复的项不重复展示） */
function buildLicenseDetailItems(lic: PsDischLicRecord): NonNullable<DescriptionsProps['items']> {
  const pairs: { label: string; value: React.ReactNode; span?: number }[] = [
    { label: '许可证主键', value: lic.id },
    { label: '排水许准证证号', value: lic.drainageCode },
    { label: '办证人', value: lic.contactName },
    { label: '联系电话', value: lic.contactTel },
    { label: '排水类型', value: lic.wastewaterDrainageType },
    { label: '行业分类', value: lic.polluType },
    { label: '排水许可类型', value: lic.drainagePermitKind },
    { label: '有效开始时间', value: lic.validStartTime },
    { label: '有效截至时间', value: lic.licenceExpdate },
    { label: '证照状态', value: lic.effectiveState },
    { label: '许可证入库状态', value: lic.state },
    { label: '是否临牌', value: dischargerLabelYesNo(lic.isTemporary) },
    { label: '原许可证号', value: lic.origPermitCode },
    { label: '污水最终去向', value: lic.sewageFinalDestination },
    { label: '工商营业执照号', value: lic.businessLicenseNo },
    { label: '监管单位名称', value: lic.supervisoryAuthorityName },
    { label: '水表号', value: lic.meterId },
    { label: '月用水量', value: lic.monthAmount },
    { label: '占地面积（㎡）', value: lic.area != null ? String(lic.area) : '—' },
    { label: '产权人姓名', value: lic.ownName },
    { label: '产权人联系电话', value: lic.ownTel },
    { label: '经营人', value: lic.operator },
    { label: '经营人联系电话', value: lic.operatorTel },
    { label: '是否办证', value: dischargerLabelYesNo(lic.isCredentials) },
    { label: '受理号', value: lic.acceptanceNumber },
    { label: '施工单位名称', value: lic.constructUnit },
    { label: '是否有工商营业执照', value: dischargerLabelYesNo(lic.hasBusinessLicense) },
    { label: '接驳核准意见书', value: dischargerLabelYesNo(lic.hasConnectionApproval) },
    { label: '排水管网图', value: dischargerLabelYesNo(lic.hasDrainageNetworkDiagram) },
    { label: '排污许可证', value: dischargerLabelYesNo(lic.hasDischargePermit) },
    { label: '是否有排水许可证', value: dischargerLabelYesNo(lic.hasDrainagePermit) },
    { label: '是否删除', value: dischargerLabelYesNo(lic.isDelete) },
  ];
  return padDescriptionsItemsForFullWidthRow(toDescItems(pairs), 2);
}

function renderDetailEmpty(value: React.ReactNode): React.ReactNode {
  if (value == null || value === '') return <span className="detail-value-empty">—</span>;
  if (typeof value === 'string' && (value.trim() === '' || value === '-' || value === '—')) {
    return <span className="detail-value-empty">—</span>;
  }
  return value;
}

function toDescItems(pairs: { label: string; value: React.ReactNode; span?: number }[]): NonNullable<DescriptionsProps['items']> {
  return pairs.map((p, i) => ({
    key: `${p.label}-${i}`,
    label: p.label,
    children: renderDetailEmpty(p.value),
    span: p.span === 2 ? 2 : 1,
  }));
}

/** 排水户主表表单（新增/编辑） */
const DischargerMainForm: React.FC<{ form: any; initialValues?: Partial<PsDischargerRecord>; isEdit?: boolean }> = ({
  form,
  initialValues,
  isEdit,
}) => (
  <Form form={form} layout="vertical" initialValues={initialValues}>
    <Divider titlePlacement="start">基础数据</Divider>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="主键" name="id" rules={[{ required: true }]}>
          <Input disabled={isEdit} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="排水户标识码" name="dischargerCode" rules={[{ required: true }]}>
          <Input disabled={isEdit} placeholder="唯一编码" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="排水户名称" name="dischargerName" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="排水系统编码" name="systemCode">
          <Input placeholder="所属排水系统编码" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="所属行政区划" name="manageCode" tooltip="韶山市辖乡镇（街道）">
          <Select allowClear showSearch optionFilterProp="label" placeholder="请选择乡镇（街道）" options={SHAOSHAN_ADDV_SELECT_OPTIONS} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="排水户类型" name="dischargerType">
          <Select allowClear placeholder="请选择排水户类型" options={DISCHARGER_TYPE_OPTIONS} />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16} className="facility-form-coord-row">
      <Col xs={24} sm={12}>
        <Form.Item label="坐标 X" name="coordX" tooltip="与主要排放口中心点坐标一致">
          <Input type="number" step="0.001" />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item label="坐标 Y" name="coordY" tooltip="与主要排放口中心点坐标一致">
          <Input type="number" step="0.001" />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={24}>
        <Form.Item
          label="排水户地址"
          name="addr"
          rules={[{ required: true, message: '请填写排水户地址' }]}
          extra={ADDR_MAP_FORM_ITEM_EXTRA}
        >
          <Input placeholder={ADDR_MAP_INPUT_PLACEHOLDER} />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={24}>
        <Form.Item label="地图选点" colon={false}>
          <AddrWgs84MapPicker
            form={form}
            addrField="addr"
            lngField="coordX"
            latField="coordY"
            mapAriaLabel="排水户位置地图"
            hintAddressLabel="排水户地址"
            lngLatValueMode="number"
          />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="组织机构代码/有效证件号" name="codeId" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="法人代表" name="legalPerson" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="联系电话" name="tel">
          <Input />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="主管单位" name="manageDept">
          <Input />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="是否为重点排水户" name="keyDischarger" rules={[{ required: true }]}>
          <Select options={YES_NO_01_OPTIONS} placeholder="0 否 / 1 是" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="是否属水源保护区" name="isProtect" rules={[{ required: true }]}>
          <Select options={YES_NO_01_OPTIONS} />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item
          label="是否关联物联监测"
          name="linkedIot"
          rules={[{ required: true }]}
          tooltip="未关联时综合态势地图为信息点蓝，提示板不展示物联水质演示项"
        >
          <Select options={YES_NO_01_OPTIONS} placeholder="0 否 / 1 是" />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item name="linkedOutletCode" label="关联排口" tooltip="与设施管理「排口」台账入河入海排污口编码同源">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="选择入河入海排污口"
            options={LINKED_OUTLET_SELECT_OPTIONS}
          />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={24}>
        <Form.Item label="主要生产工艺" name="process">
          <Input.TextArea rows={2} placeholder="工艺及污染物产生过程" />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="排水许可证编号" name="licenceId" rules={[{ required: true }]}>
          <Input placeholder="主证编号，与许可证子表证号对应" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="许可证颁发日期" name="licenceIssueDate" rules={[{ required: true }]}>
          <Input type="date" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="排污许可证号码" name="licenceCode" rules={[{ required: true }]} tooltip="无证填「无证」">
          <Input />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item
          label="接入接驳点"
          name="connManholeId"
          tooltip="与排水管点台账同源，仅管点特种为检查井的管点"
        >
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="请选择接入接驳点（检查井）"
            options={MANHOLE_PIPE_NODE_OPTIONS}
          />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item
          label="接驳点"
          name="jbdId"
          tooltip="与排水管点台账同源，仅管点特种为检查井的管点"
        >
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="请选择检查井接驳点"
            options={MANHOLE_PIPE_NODE_OPTIONS}
          />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="是否排入城镇污水" name="townSewage" rules={[{ required: true }]}>
          <Select options={YES_NO_01_OPTIONS} />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={24}>
        <Form.Item label="污水处理方式" name="treatmentMethod" rules={[{ required: true }]}>
          <Input.TextArea rows={2} />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="污水处理规模 m³/d" name="treatmentCapa">
          <Input type="number" step="0.01" min={0} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="用水总量 m³/d" name="totalQuant">
          <Input type="number" step="0.01" min={0} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="自备水量 m³/d" name="selfSupplyQuant">
          <Input type="number" step="0.01" min={0} />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="总排水量 m³/d" name="dischargeQuant">
          <Input type="number" step="0.01" min={0} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="生产污水量 m³/d" name="prodSewaQuant">
          <Input type="number" step="0.01" min={0} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="生活污水量 m³/d" name="domeSewaQuant">
          <Input type="number" step="0.01" min={0} />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="第一类污染物名称" name="grade1Pollutant">
          <Input />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="第二类污染物名称" name="grade2Pollutant">
          <Input />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="排污主要成分" name="material">
          <Input />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="技术资料文件编码" name="dataListId">
          <Input />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="预处理设施规模" name="prefacsca">
          <Input placeholder="m³/d" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="预处理设施类型" name="sewplatyp">
          <Input />
        </Form.Item>
      </Col>
    </Row>
    <Divider titlePlacement="start">扩展数据与元数据</Divider>
    <Row gutter={16}>
      <Col span={24}>
        <Form.Item
          label="现场照片"
          name="picIds"
          extra="本地选图演示，最多 8 张；保存为文件名列表（分号分隔），未实际上传服务器"
        >
          <PicIdsLocalUpload />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="数据来源" name="dataSource" rules={[{ required: true }]}>
          <Select options={DISCHARGER_DATA_SOURCE_OPTIONS} placeholder="1—现场探测…" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="数据获取日期" name="recordDate">
          <Input type="date" />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="填报单位" name="reportUnit" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="填报日期" name="reportDate" rules={[{ required: true }]}>
          <Input type="date" />
        </Form.Item>
      </Col>
      <Col span={8} />
    </Row>
    <Row gutter={16}>
      <Col span={24}>
        <Form.Item label="备注" name="remark">
          <Input.TextArea rows={2} maxLength={500} />
        </Form.Item>
      </Col>
    </Row>
  </Form>
);

/** 单条排水许可证表单（独立弹窗或排水户编辑内嵌；内嵌时隐藏与主表重复的户标识行） */
const LicenseFormInner: React.FC<{
  form: any;
  dischargerCode: string;
  dischargerName: string;
  /** 为 true 时不展示排水户编码/名称（由主表「排水户信息」Tab 维护，保存时自动回填） */
  embedded?: boolean;
}> = ({ form, dischargerCode, dischargerName, embedded }) => (
  <Form form={form} layout="vertical" preserve={false}>
    {!embedded && (
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="排水户唯一标识" name="dischargerCode" initialValue={dischargerCode}>
            <Input disabled />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="排水户名称" name="name" initialValue={dischargerName} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Col>
      </Row>
    )}
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="主键" name="id" rules={[{ required: true }]}>
          <Input disabled />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="排水许准证证号" name="drainageCode" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="是否临牌" name="isTemporary" rules={[{ required: true }]}>
          <Select options={YES_NO_01_OPTIONS} />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="办证人" name="contactName" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="联系电话" name="contactTel" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="行业分类" name="polluType" rules={[{ required: true }]}>
          <Input placeholder="工业、建筑、餐饮…" />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="排水类型" name="wastewaterDrainageType">
          <Input placeholder="生活污水/工业废水…" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="排水许可类型" name="drainagePermitKind" rules={[{ required: true }]}>
          <Input placeholder="重点一类、一般…" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="证照状态" name="effectiveState" rules={[{ required: true }]}>
          <Input placeholder="到期/有效/…" />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="有效开始时间" name="validStartTime" rules={[{ required: true }]}>
          <Input type="date" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="有效截至时间" name="licenceExpdate" rules={[{ required: true }]}>
          <Input type="date" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="许可证入库状态" name="state">
          <Input placeholder="注销/正常/新办…" />
        </Form.Item>
      </Col>
    </Row>
    {!embedded && (
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item label="排水户地址" name="addr" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Col>
      </Row>
    )}
    {embedded ? (
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="监管单位名称" name="supervisoryAuthorityName" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="污水最终去向" name="sewageFinalDestination">
            <Input />
          </Form.Item>
        </Col>
      </Row>
    ) : (
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="所在污水系统" name="systemCode" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="监管单位名称" name="supervisoryAuthorityName" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="污水最终去向" name="sewageFinalDestination">
            <Input />
          </Form.Item>
        </Col>
      </Row>
    )}
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="工商营业执照号" name="businessLicenseNo">
          <Input />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="原许可证号" name="origPermitCode">
          <Input />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="水表号" name="meterId">
          <Input />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="月用水量 t" name="monthAmount">
          <Input />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="占地面积 m²" name="area">
          <Input type="number" step="0.001" min={0} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="是否办证" name="isCredentials" rules={[{ required: true }]}>
          <Select options={YES_NO_01_OPTIONS} />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="产权人姓名" name="ownName">
          <Input />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="产权人联系电话" name="ownTel">
          <Input />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="经营人" name="operator">
          <Input />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="经营人联系电话" name="operatorTel">
          <Input />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="受理号" name="acceptanceNumber">
          <Input />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="施工单位名称" name="constructUnit">
          <Input />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={6}>
        <Form.Item label="是否有工商营业执照" name="hasBusinessLicense" rules={[{ required: true }]}>
          <Select options={YES_NO_01_OPTIONS} />
        </Form.Item>
      </Col>
      <Col span={6}>
        <Form.Item label="接驳核准意见书" name="hasConnectionApproval">
          <Select allowClear options={YES_NO_01_OPTIONS} />
        </Form.Item>
      </Col>
      <Col span={6}>
        <Form.Item label="排水管网图" name="hasDrainageNetworkDiagram">
          <Select allowClear options={YES_NO_01_OPTIONS} />
        </Form.Item>
      </Col>
      <Col span={6}>
        <Form.Item label="排污许可证" name="hasDischargePermit">
          <Select allowClear options={YES_NO_01_OPTIONS} />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={embedded ? 12 : 8}>
        <Form.Item label="是否有排水许可证" name="hasDrainagePermit">
          <Select allowClear options={YES_NO_01_OPTIONS} />
        </Form.Item>
      </Col>
      <Col span={embedded ? 12 : 8}>
        <Form.Item label="是否删除" name="isDelete">
          <Select allowClear options={YES_NO_01_OPTIONS} />
        </Form.Item>
      </Col>
      {!embedded && (
        <Col span={8}>
          <Form.Item label="数据获取日期" name="recordDate">
            <Input type="date" />
          </Form.Item>
        </Col>
      )}
    </Row>
    {!embedded && (
      <>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="填报单位" name="reportUnit" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="填报日期" name="reportDate" rules={[{ required: true }]}>
              <Input type="date" />
            </Form.Item>
          </Col>
          <Col span={8} />
        </Row>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label="现场照片"
              name="picIds"
              extra="本地选图演示，最多 8 张；未实际上传服务器"
            >
              <PicIdsLocalUpload />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item label="备注" name="remark">
              <Input.TextArea rows={2} />
            </Form.Item>
          </Col>
        </Row>
      </>
    )}
  </Form>
);

function buildDischargerDetailItems(r: PsDischargerRecord): NonNullable<DescriptionsProps['items']> {
  const pairs: { label: string; value: React.ReactNode; span?: number }[] = [
    { label: '主键', value: r.id },
    { label: '排水户标识码', value: r.dischargerCode },
    { label: '排水户名称', value: r.dischargerName },
    { label: '排水系统编码', value: r.systemCode },
    { label: '所属行政区划', value: r.manageCode },
    {
      label: '坐标 X/Y',
      value:
        r.coordX != null && r.coordY != null
          ? `${Number(r.coordX).toFixed(3)} / ${Number(r.coordY).toFixed(3)}`
          : '—',
    },
    { label: '排水户类型', value: r.dischargerType },
    { label: '排水户地址', value: r.addr, span: 2 },
    {
      label: '位置地图',
      span: 2,
      value: (
        <AddrWgs84DetailMap
          title={String(r.dischargerName ?? '排水户')}
          location={String(r.addr ?? '')}
          lng={r.coordX}
          lat={r.coordY}
          mapAriaLabel="排水户位置地图"
        />
      ),
    },
    { label: '组织机构代码', value: r.codeId },
    { label: '法人代表', value: r.legalPerson },
    { label: '联系电话', value: r.tel },
    { label: '主管单位', value: r.manageDept },
    { label: '重点排水户', value: dischargerLabelYesNo(r.keyDischarger) },
    { label: '关联物联监测', value: dischargerLabelYesNo(r.linkedIot ?? '0') },
    { label: '关联排口', value: formatLinkedOutletCodeDisplay(r.linkedOutletCode) },
    { label: '主要生产工艺', value: r.process, span: 2 },
    { label: '排水许可证编号', value: r.licenceId },
    { label: '许可证颁发日期', value: r.licenceIssueDate },
    { label: '排污许可证号码', value: r.licenceCode },
    { label: '接入接驳点', value: formatManholePipeNodeLabel(r.connManholeId) },
    { label: '接驳点', value: formatManholePipeNodeLabel(r.jbdId) },
    { label: '污水处理方式', value: r.treatmentMethod, span: 2 },
    { label: '污水处理规模 m³/d', value: r.treatmentCapa },
    { label: '用水总量', value: r.totalQuant },
    { label: '自备水量', value: r.selfSupplyQuant },
    { label: '总排水量', value: r.dischargeQuant },
    { label: '生产污水量', value: r.prodSewaQuant },
    { label: '生活污水量', value: r.domeSewaQuant },
    { label: '第一类污染物', value: r.grade1Pollutant },
    { label: '第二类污染物', value: r.grade2Pollutant },
    { label: '排污主要成分', value: r.material },
    { label: '水源保护区', value: dischargerLabelYesNo(r.isProtect) },
    { label: '排入城镇污水', value: dischargerLabelYesNo(r.townSewage) },
    { label: '预处理设施规模', value: r.prefacsca },
    { label: '预处理设施类型', value: r.sewplatyp, span: 2 },
    { label: '数据来源', value: dischargerLabelDataSource(r.dataSource) },
    { label: '数据获取日期', value: r.recordDate },
    { label: '填报单位', value: r.reportUnit },
    { label: '填报日期', value: r.reportDate },
    { label: '现场照片', value: r.picIds?.trim() ? r.picIds.split(';').join('、') : '—', span: 2 },
    { label: '备注', value: r.remark, span: 2 },
  ];
  return padDescriptionsItemsForFullWidthRow(toDescItems(pairs), 2);
}

/** 详情：基本信息 + 排水许可证单条档案（与污水厂详情 Tab 结构一致） */
export const DischargerDetailContent: React.FC<{ record: PsDischargerRecord }> = ({ record }) => {
  const tabs = [
    {
      key: 'basic',
      label: '基本信息',
      children: (
        <div className="detail-section">
          <div className="detail-section-content">
            <Descriptions bordered column={2} size="small" items={buildDischargerDetailItems(record)} />
          </div>
        </div>
      ),
    },
    {
      key: 'license',
      label: '排水许可证',
      children: (
        <div className="detail-section">
          <div className="detail-section-title">排水许可证</div>
          <div className="detail-section-content">
            {record.license ? (
              <Descriptions bordered column={2} size="small" items={buildLicenseDetailItems(record.license)} />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无排水许可证档案" />
            )}
          </div>
        </div>
      ),
    },
  ];

  return (
    <DetailTabsIfMultiple
      className="facility-detail-tabs facility-mgmt-detail-tabs"
      size="small"
      style={{ marginTop: 8 }}
      items={tabs.map(t => ({ key: t.key, label: t.label, children: t.children }))}
    />
  );
};

function parseDischargerNums(values: Record<string, unknown>): Partial<PsDischargerRecord> {
  const n = (v: unknown) => (v === '' || v === undefined || v === null ? undefined : Number(v));
  return {
    ...values,
    coordX: n(values.coordX),
    coordY: n(values.coordY),
    treatmentCapa: n(values.treatmentCapa),
    totalQuant: n(values.totalQuant),
    selfSupplyQuant: n(values.selfSupplyQuant),
    dischargeQuant: n(values.dischargeQuant),
    prodSewaQuant: n(values.prodSewaQuant),
    domeSewaQuant: n(values.domeSewaQuant),
  } as Partial<PsDischargerRecord>;
}

export const DischargerView: React.FC<{
  onDetail: (title: string, content: React.ReactNode, modalWidth?: number | string) => void;
}> = ({ onDetail }) => {
  const [data, setData] = useState<PsDischargerRecord[]>(() =>
    dischargerDemoData.map((d) => ({ ...d, license: d.license ? { ...d.license } : null })),
  );
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PsDischargerRecord | null>(null);
  const [queryForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [addForm] = Form.useForm();
  const [licForm] = Form.useForm();
  const [query, setQuery] = useState<Record<string, unknown>>({});

  const allColumns: ColumnConfig[] = useMemo(
    () => [
      { key: 'id', title: '主键', dataIndex: 'id', width: 168, defaultVisible: false },
      { key: 'dischargerCode', title: '排水户标识码', dataIndex: 'dischargerCode', width: 200, defaultVisible: true },
      { key: 'dischargerName', title: '排水户名称', dataIndex: 'dischargerName', width: 200, defaultVisible: true },
      { key: 'addr', title: '排水户地址', dataIndex: 'addr', width: 260, defaultVisible: true },
      { key: 'keyDischarger', title: '重点排水户', dataIndex: 'keyDischarger', width: 100, defaultVisible: true },
      {
        key: 'linkedIot',
        title: '关联物联',
        dataIndex: 'linkedIot',
        width: 96,
        defaultVisible: true,
        render: (v: string | undefined) => dischargerLabelYesNo(v ?? '0'),
      },
      {
        key: 'linkedOutletCode',
        title: '关联排口',
        dataIndex: 'linkedOutletCode',
        width: 200,
        defaultVisible: true,
        render: (v: string | undefined) => formatLinkedOutletCodeDisplay(v),
      },
      { key: 'licenceId', title: '排水许可证编号', dataIndex: 'licenceId', width: 160, defaultVisible: true },
      { key: 'licenceCode', title: '排污许可证号码', dataIndex: 'licenceCode', width: 160, defaultVisible: true },
      { key: 'systemCode', title: '排水系统编码', dataIndex: 'systemCode', width: 150, defaultVisible: false },
      {
        key: 'coordX',
        title: '坐标 X',
        dataIndex: 'coordX',
        width: 110,
        defaultVisible: true,
        render: (v: unknown) => (v != null && v !== '' ? Number(v).toFixed(3) : '—'),
      },
      {
        key: 'coordY',
        title: '坐标 Y',
        dataIndex: 'coordY',
        width: 110,
        defaultVisible: true,
        render: (v: unknown) => (v != null && v !== '' ? Number(v).toFixed(3) : '—'),
      },
      { key: 'legalPerson', title: '法人代表', dataIndex: 'legalPerson', width: 88, defaultVisible: false },
      { key: 'codeId', title: '组织机构代码', dataIndex: 'codeId', width: 160, defaultVisible: false },
      { key: 'treatmentMethod', title: '污水处理方式', dataIndex: 'treatmentMethod', width: 180, defaultVisible: false },
      { key: 'dataSource', title: '数据来源', dataIndex: 'dataSource', width: 130, defaultVisible: true },
      { key: 'reportUnit', title: '填报单位', dataIndex: 'reportUnit', width: 140, defaultVisible: false },
      {
        key: 'licenseDrainageCode',
        title: '排水许准证证号',
        dataIndex: 'license',
        width: 168,
        defaultVisible: true,
        render: (lic: PsDischLicRecord | null | undefined) => (lic?.drainageCode ? lic.drainageCode : '—'),
      },
      { key: 'operation', title: '操作', width: 220, defaultVisible: true },
    ],
    [],
  );

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => getDefaultVisibleColumnKeys(allColumns));
  const dischargerRegionOptions = useMemo(() => {
    const names = Array.from(new Set(data.map(item => String(item.manageCode ?? '').trim()).filter(Boolean)));
    return names.map(name => ({ value: name, label: name }));
  }, [data]);

  const filteredData = useMemo(() => {
    const region = String(query.region ?? '').trim();
    const dischargerType = String(query.dischargerType ?? '').trim();
    const keyDischarger = String(query.keyDischarger ?? '').trim();
    const dischargerCodeKw = String(query.dischargerCodeKw ?? '').trim().toLowerCase();
    const dischargerNameKw = String(query.dischargerNameKw ?? '').trim().toLowerCase();
    const linkedOutletCodeKw = String(query.linkedOutletCodeKw ?? '').trim().toLowerCase();
    return data.filter((item) => {
      if (region && String(item.manageCode ?? '').trim() !== region) return false;
      if (dischargerType && String(item.dischargerType ?? '').trim() !== dischargerType) return false;
      if (keyDischarger && String(item.keyDischarger ?? '').trim() !== keyDischarger) return false;
      if (dischargerCodeKw && !String(item.dischargerCode ?? '').toLowerCase().includes(dischargerCodeKw)) return false;
      if (dischargerNameKw && !String(item.dischargerName ?? '').toLowerCase().includes(dischargerNameKw)) return false;
      if (linkedOutletCodeKw && !String(item.linkedOutletCode ?? '').toLowerCase().includes(linkedOutletCodeKw)) return false;
      return true;
    });
  }, [data, query]);

  const handleSearch = () => {
    setQuery(queryForm.getFieldsValue());
  };

  const handleReset = () => {
    queryForm.resetFields();
    setQuery({});
  };

  const handleDelete = (id: string) => {
    setData(prev => prev.filter(item => item.id !== id));
    message.success('删除成功');
    setEditModalVisible(false);
  };

  const handleEdit = (record: PsDischargerRecord) => {
    setEditingRecord(record);
    editForm.setFieldsValue({
      ...record,
      coordX: record.coordX,
      coordY: record.coordY,
      linkedIot: record.linkedIot ?? '0',
    });
    licForm.resetFields();
    if (record.license) {
      licForm.setFieldsValue({ ...record.license, area: record.license.area });
    } else {
      licForm.setFieldsValue(
        createEmptyLicenseFormValues({
          dischargerCode: record.dischargerCode,
          dischargerName: record.dischargerName,
          addr: record.addr,
          systemCode: record.systemCode,
          reportUnit: record.reportUnit,
          reportDate: record.reportDate,
          licenceId: record.licenceId,
        }),
      );
    }
    setEditModalVisible(true);
  };

  const handleEditSave = () => {
    editForm.validateFields().then((values) => {
      if (!editingRecord) return;
      const merged = parseDischargerNums(values) as PsDischargerRecord;
      const licVals = licForm.getFieldsValue();
      const hasLicense = String(licVals.drainageCode ?? '').trim() !== '';

      const apply = (license: PsDischLicRecord | null) => {
        const next: PsDischargerRecord = { ...editingRecord, ...merged, license };
        setData((prev) => prev.map((item) => (item.id === editingRecord.id ? next : item)));
        message.success('保存成功');
        setEditModalVisible(false);
      };

      if (!hasLicense) {
        apply(null);
        return;
      }
      licForm
        .validateFields()
        .then(() => {
          const mainRow: PsDischargerRecord = { ...editingRecord, ...merged };
          apply(
            mergeLicenseFromDischargerMain(
              parseLicenseFormToRecord(licForm.getFieldsValue(), {
                dischargerCode: String(mainRow.dischargerCode),
                dischargerName: String(mainRow.dischargerName),
              }),
              mainRow,
            ),
          );
        })
        .catch(() => message.warning('请补全「排水许可证」页签中的必填项，或清空证号以暂不建档'));
    });
  };

  const handleAdd = () => {
    setEditingRecord(null);
    addForm.resetFields();
    const id = generateId('DISC');
    const code = `PS430382${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}ABCDE`.slice(0, 17);
    addForm.setFieldsValue({
      id,
      dischargerCode: code,
      dischargerName: '新建排水户',
      systemCode: 'SYS43038200100001',
      addr: '湖南省湘潭市韶山市',
      keyDischarger: '0',
      linkedIot: '0',
      linkedOutletCode: undefined,
      isProtect: '0',
      townSewage: '1',
      licenceId: '',
      licenceIssueDate: getCurrentDate(),
      licenceCode: '无证',
      treatmentMethod: '化粪池',
      dataSource: '2',
      recordDate: getCurrentDate(),
      reportDate: getCurrentDate(),
      reportUnit: '高新区管委会',
      manageCode: '清溪镇',
    });
    licForm.resetFields();
    licForm.setFieldsValue(
      createEmptyLicenseFormValues({
        dischargerCode: code,
        dischargerName: '新建排水户',
        addr: '湖南省湘潭市韶山市',
        systemCode: 'SYS43038200100001',
        reportUnit: '高新区管委会',
        reportDate: getCurrentDate(),
        licenceId: '',
      }),
    );
    setAddModalVisible(true);
  };

  const handleAddSave = () => {
    addForm.validateFields().then((values) => {
      const merged = parseDischargerNums(values) as PsDischargerRecord;
      const licVals = licForm.getFieldsValue();
      const hasLicense = String(licVals.drainageCode ?? '').trim() !== '';

      const apply = (license: PsDischLicRecord | null) => {
        const next: PsDischargerRecord = { ...merged, license };
        setData((prev) => [next, ...prev]);
        message.success('新增成功');
        setAddModalVisible(false);
      };

      if (!hasLicense) {
        apply(null);
        return;
      }
      licForm
        .validateFields()
        .then(() =>
          apply(
            mergeLicenseFromDischargerMain(
              parseLicenseFormToRecord(licForm.getFieldsValue(), {
                dischargerCode: String(merged.dischargerCode),
                dischargerName: String(merged.dischargerName),
              }),
              merged as PsDischargerRecord,
            ),
          ),
        )
        .catch(() => message.warning('请补全「排水许可证」页签中的必填项，或清空证号以暂不建档'));
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
          render: (_: unknown, record: PsDischargerRecord) => (
            <Space size="small">
              <Button
                type="link"
                size="small"
                className="action-btn detail"
                icon={<EyeOutlined />}
                onClick={() =>
                  onDetail(`排水户详情 - ${record.dischargerName}`, <DischargerDetailContent record={record} />, 'min(1200px, 96vw)')
                }
              >
                详情
              </Button>
              <Button type="link" size="small" className="action-btn edit" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
                编辑
              </Button>
            </Space>
          ),
        };
      }
      return col;
    });

  const facilityTableScrollX = getFacilityTableScrollX(
    allColumns.filter(col => visibleColumns.includes(col.key) || col.key === 'operation'),
  );

  /** 编辑/新增弹窗内：每户一条许可证表单 */
  const licenseTabChildren = (
    <div style={{ marginTop: 8 }}>
      <LicenseFormInner form={licForm} embedded dischargerCode="" dischargerName="" />
    </div>
  );

  return (
    <div className="facility-view">
      <Card
        title="排水户管理"
        extra={
          <Space wrap size={[8, 8]} align="center">
            <Button
              icon={<DownloadOutlined />}
              className="export-btn"
              onClick={() => {
                if (filteredData.length === 0) {
                  message.warning('当前筛选条件下无数据可导出');
                  return;
                }
                downloadFacilityListExcel(
                  filteredData as unknown as Record<string, unknown>[],
                  allColumns,
                  '排水户',
                  '排水户',
                  dischargerListExportFormatByKey,
                );
                message.success('已导出 Excel（全量字段）');
              }}
            >
              导出Excel
            </Button>
            <Upload
              beforeUpload={() => {
                message.success('已导入（原型示意）');
                return false;
              }}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />}>导入</Button>
            </Upload>
            <PipeLineColumnManager columns={allColumns} visibleColumns={visibleColumns} onChange={setVisibleColumns} />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} className="add-btn">
              新增
            </Button>
          </Space>
        }
      >
        <Form form={queryForm} layout="inline" style={{ marginBottom: 16, rowGap: 12 }}>
          <Row gutter={16} style={{ width: '100%' }}>
            <Col span={5}>
              <Form.Item name="region" style={{ marginBottom: 0 }}>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="所属区划"
                  options={dischargerRegionOptions}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="dischargerType" style={{ marginBottom: 0 }}>
                <Select allowClear placeholder="排水户类型" options={DISCHARGER_TYPE_OPTIONS} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="keyDischarger" style={{ marginBottom: 0 }}>
                <Select allowClear placeholder="重点排水户" options={YES_NO_01_OPTIONS} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16} style={{ width: '100%' }}>
            <Col span={5}>
              <Form.Item name="dischargerNameKw" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="排水户名称" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="dischargerCodeKw" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="排水户标识码" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="linkedOutletCodeKw" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="关联排口编码" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={4}>
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
        <div className="facility-table-wrap">
          <Table
            dataSource={filteredData}
            columns={columns}
            rowKey="id"
            scroll={{ x: facilityTableScrollX }}
            pagination={{ pageSize: 10 }}
          />
        </div>
      </Card>

      <Modal
        styles={formModalStyles}
        title="新增排水户"
        open={addModalVisible}
        onCancel={() => setAddModalVisible(false)}
        width={880}
        footer={
          <Space>
            <Button onClick={() => setAddModalVisible(false)}>取消</Button>
            <Button type="primary" onClick={handleAddSave}>
              保存
            </Button>
          </Space>
        }
      >
        <Tabs
          items={[
            { key: 'main', label: '排水户信息', children: <DischargerMainForm form={addForm} /> },
            { key: 'lic', label: '排水许可证', children: licenseTabChildren },
          ]}
        />
      </Modal>

      <Modal
        styles={formModalStyles}
        title={`编辑排水户 - ${editingRecord?.dischargerName ?? ''}`}
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        width={880}
        footer={
          <Space>
            <Button danger onClick={() => editingRecord && handleDelete(editingRecord.id)}>
              删除
            </Button>
            <Button onClick={() => setEditModalVisible(false)}>取消</Button>
            <Button type="primary" onClick={handleEditSave}>
              保存
            </Button>
          </Space>
        }
      >
        {editingRecord && (
          <Tabs
            items={[
              {
                key: 'main',
                label: '排水户信息',
                children: <DischargerMainForm form={editForm} initialValues={editingRecord} isEdit />,
              },
              { key: 'lic', label: '排水许可证', children: licenseTabChildren },
            ]}
          />
        )}
      </Modal>
    </div>
  );
};
