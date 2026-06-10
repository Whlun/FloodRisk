/**
 * 配置中心 · 污染源三级子页：农村污水及集中处理设施、农业农村源、工业企业污染源
 * 列表支持字段管理；详情为 Descriptions（仅一块内容时不展示 Tab 顶栏；多 Tab 时与生态整治风格一致）；表单字段参照二污普表结构裁剪
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Typography,
  Upload,
  message
} from 'antd';
import {
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
  UploadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  YES_NO_OPTIONS,
  ruralSewageTreatmentInitial,
  agriRuralPollutionInitial,
  industryPollutionInitial,
  type RuralSewageTreatmentRecord,
  type AgriRuralPollutionRecord,
  type IndustryPollutionRecord
} from './config-center-data';
import { buildLinkedOutletSelectOptions, formatLinkedOutletCodeDisplay } from '../韶山水环境设施管理系统/facility-points-data';
import {
  getShaoshanAddvcdLabel,
  SHAOSHAN_ADDVCD_OPTIONS,
  shaoshanAddvcdSelectOptionsWithLegacy,
} from '../生态整治/riverChiefDb4401';
import { ConfigCenterDetailTabs, configCenterDetailText } from './config-center-detail-eco';
import { ColumnManager, getDefaultVisibleColumnKeys, buildTableColumnsFromConfig, type ColumnConfig } from './config-center-column-manager';
import { formModalStyles, CONFIG_CENTER_MODAL_WRAP_CLASS } from './config-center-views';
import {
  AddrWgs84MapPicker,
  AddrWgs84DetailMap,
  ADDR_MAP_FORM_ITEM_EXTRA,
  ADDR_MAP_INPUT_PLACEHOLDER,
} from '../shared/addrWgs84MapFormBridge';
import { downloadTableFullExcel, exportOptLabel } from '../shared/facilityTableXlsxExport';

const { Text } = Typography;

/** 关联排口：与设施管理排口台账同源 */
const LINKED_OUTLET_FORM_OPTIONS = buildLinkedOutletSelectOptions();

const genId = (prefix: string) => `${prefix}-${Date.now()}`;

const CFG_FILTER_COL_FIELD = { xs: { flex: '1 1 100%' }, sm: { flex: '0 0 200px' } };
const CFG_FILTER_COL_QUERY = { xs: { flex: '1 1 100%' }, sm: { flex: 'none' } };
const CFG_FORM_GUTTER: [number, number] = [16, 16];
const CFG_FORM_COL_HALF = { xs: 24 as const, sm: 12 as const };
const CFG_FORM_COL_FULL = { xs: 24 as const, sm: 24 as const };
const CFG_FORM_COL_QUARTER = { xs: 24 as const, sm: 12 as const, lg: 6 as const };

/** 宽表弹窗（字段较多） */
const POLLUTION_WIDE_MODAL_WIDTH = 1080;

function yesNoLabel(v: string): React.ReactNode {
  const o = YES_NO_OPTIONS.find(x => x.value === v);
  return o ? o.label : configCenterDetailText(v);
}

/** 列表筛选：字段值包含查询子串（空则不过滤） */
function matchField(v: unknown, q: string) {
  const s = String(q ?? '').trim();
  if (!s) return true;
  if (v == null || v === '') return false;
  return String(v).includes(s);
}

function pollutionAdmDivExcel(v: unknown): string {
  const s = typeof v === 'string' ? v.trim() : '';
  return s ? getShaoshanAddvcdLabel(s) : '';
}

const pollutionYnFmt = (v: unknown) => exportOptLabel(YES_NO_OPTIONS, v);

// ---------- 农村污水及集中处理设施 ----------

const RURAL_META_RAW = [
  ['creditCode', '统一社会信用代码', 190, true],
  ['orgCode', '组织机构代码', 130, true],
  ['unitName', '单位详细名称', 200, true],
  ['operatorName', '运营单位名称', 180, true],
  ['legalRep', '法定代表人', 100, false],
  ['admDivCode', '所属区划', 140, true],
  ['township', '乡(镇)', 100, false],
  ['streetAddr', '街(村)、门牌号', 160, false],
  ['contactPerson', '联系人', 90, false],
  ['phone', '电话号码', 120, false],
  ['entLng', '企业经度', 110, false],
  ['entLat', '企业纬度', 110, false],
  ['facilityType', '污水处理设施类型', 200, true],
  ['builtYear', '建成时间(年)', 100, false],
  ['builtMonth', '建成时间(月)', 100, false],
  ['treatMethodName1', '污水处理方法名称(1)', 160, false],
  ['treatMethodCode1', '污水处理方法代码(1)', 140, false],
  ['treatMethodName2', '污水处理方法名称(2)', 160, false],
  ['treatMethodCode2', '污水处理方法代码(2)', 140, false],
  ['treatMethodName3', '污水处理方法名称(3)', 160, false],
  ['treatMethodCode3', '污水处理方法代码(3)', 140, false],
  ['reclaimProcess', '再生水处理工艺', 140, false],
  ['drainDestType', '排水去向类型', 180, false],
  ['drainLngDeg', '排水经度-度', 90, false],
  ['drainLngMin', '排水经度-分', 90, false],
  ['drainLngSec', '排水经度-秒', 90, false],
  ['drainLatDeg', '排水纬度-度', 90, false],
  ['drainLatMin', '排水纬度-分', 90, false],
  ['drainLatSec', '排水纬度-秒', 90, false],
  ['recvWaterName', '受纳水体名称', 120, true],
  ['recvWaterCode', '受纳水体代码', 140, false],
  ['onlineIn', '在线监测-进', 110, false],
  ['onlineOut', '在线监测-出', 110, false],
  ['sludgeStableSelf', '污泥稳定化(自建)', 140, false],
  ['sludgeDigest', '污泥厌氧消化装置', 150, false],
  ['sludgeStableMethod', '污泥稳定化处理方法', 170, false],
  ['hasBoiler', '厂区内是否有锅炉', 150, false],
  ['linkedOutletCode', '关联排口', 200, false],
  ['reportDate', '报出日期', 120, true],
  ['annualRunDays', '年运行天数(天)', 120, false],
  ['elecConsumption', '用电量(万千瓦时)', 140, false]
] as const;

const RURAL_META: { k: keyof RuralSewageTreatmentRecord; t: string; w?: number; def?: boolean }[] = RURAL_META_RAW.map(
  ([k, t, w, def]) => ({ k: k as keyof RuralSewageTreatmentRecord, t, w, def: def ?? false })
);

const ruralAllColumnDefs: ColumnConfig[] = [
  ...RURAL_META.map(({ k, t, w, def }) => ({
    key: k as string,
    title: t,
    dataIndex: k as string,
    width: w,
    defaultVisible: def,
    ...(k === 'admDivCode' ?
      {
        render: (v: unknown) => {
          const s = typeof v === 'string' ? v.trim() : '';
          return s ? getShaoshanAddvcdLabel(s) : '—';
        },
      }
    : {}),
    ...(k === 'linkedOutletCode' ? { render: (v: unknown) => formatLinkedOutletCodeDisplay(v) } : {}),
  })),
  { key: 'operation', title: '操作', width: 168, fixed: 'right' as const, defaultVisible: true },
];

const RURAL_POLLUTION_EXPORT_FMT: Record<string, (raw: unknown) => string | number> = {
  admDivCode: pollutionAdmDivExcel,
  linkedOutletCode: (v: unknown) => formatLinkedOutletCodeDisplay(v),
  onlineIn: pollutionYnFmt,
  onlineOut: pollutionYnFmt,
  hasBoiler: pollutionYnFmt,
};

function runRuralPollutionListExport(rows: RuralSewageTreatmentRecord[]) {
  const recs = rows as unknown as Record<string, unknown>[];
  if (!recs.length) {
    message.warning('当前筛选条件下无数据可导出');
    return;
  }
  downloadTableFullExcel(recs, ruralAllColumnDefs, '配置中心_污染源_农村污水', '农村污水及集中处理设施', {
    formatByKey: RURAL_POLLUTION_EXPORT_FMT,
  });
  message.success('已导出 Excel（全量字段）');
}

/** 供排口「关联信息」等复用：农村污水设施只读详情体 */
export function RuralSewageDetail({ r }: { r: RuralSewageTreatmentRecord }) {
  const item = (label: string, v: string) => (
    <Descriptions.Item key={label} label={label}>
      {configCenterDetailText(v)}
    </Descriptions.Item>
  );
  const yn = (label: string, v: string) => (
    <Descriptions.Item key={label} label={label}>
      {yesNoLabel(v)}
    </Descriptions.Item>
  );
  return (
    <ConfigCenterDetailTabs>
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="内部编号" span={2}>
          {configCenterDetailText(r.id)}
        </Descriptions.Item>
        {item('统一社会信用代码', r.creditCode)}
        {item('组织机构代码', r.orgCode)}
        {item('单位详细名称', r.unitName)}
        {item('运营单位名称', r.operatorName)}
        {item('法定代表人', r.legalRep)}
        {item('所属区划', r.admDivCode ? getShaoshanAddvcdLabel(r.admDivCode) : '')}
        {item('乡(镇)', r.township)}
        {item('街(村)、门牌号', r.streetAddr)}
        {item('联系人', r.contactPerson)}
        {item('电话号码', r.phone)}
        {item('企业地理坐标-经度', r.entLng)}
        {item('企业地理坐标-纬度', r.entLat)}
        <Descriptions.Item label="企业位置地图" span={2}>
          <AddrWgs84DetailMap
            title={r.unitName}
            location={[r.township, r.streetAddr].filter(Boolean).join(' ') || r.streetAddr}
            lng={r.entLng}
            lat={r.entLat}
            mapAriaLabel="农村污水设施位置地图"
          />
        </Descriptions.Item>
        {item('污水处理设施类型', r.facilityType)}
        {item('建成时间(年)', r.builtYear)}
        {item('建成时间(月)', r.builtMonth)}
        {item('污水处理方法名称(1)', r.treatMethodName1)}
        {item('污水处理方法代码(1)', r.treatMethodCode1)}
        {item('污水处理方法名称(2)', r.treatMethodName2)}
        {item('污水处理方法代码(2)', r.treatMethodCode2)}
        {item('污水处理方法名称(3)', r.treatMethodName3)}
        {item('污水处理方法代码(3)', r.treatMethodCode3)}
        {item('再生水处理工艺', r.reclaimProcess)}
        {item('排水去向类型', r.drainDestType)}
        {item('排水进入环境经度(度/分/秒)', `${r.drainLngDeg}° ${r.drainLngMin}′ ${r.drainLngSec}″`)}
        {item('排水进入环境纬度(度/分/秒)', `${r.drainLatDeg}° ${r.drainLatMin}′ ${r.drainLatSec}″`)}
        {item('受纳水体名称', r.recvWaterName)}
        {item('受纳水体代码', r.recvWaterCode)}
        <Descriptions.Item label="关联排口">{formatLinkedOutletCodeDisplay(r.linkedOutletCode)}</Descriptions.Item>
        {yn('是否安装在线监测-进', r.onlineIn)}
        {yn('是否安装在线监测-出', r.onlineOut)}
        {item('污泥稳定化处理(自建)', r.sludgeStableSelf)}
        {item('污泥厌氧消化装置', r.sludgeDigest)}
        {item('污泥稳定化处理方法', r.sludgeStableMethod)}
        {yn('厂区内是否有锅炉', r.hasBoiler)}
        {item('报出日期', r.reportDate)}
        {item('年运行天数(天)', r.annualRunDays)}
        {item('用电量(万千瓦时)', r.elecConsumption)}
      </Descriptions>
    </ConfigCenterDetailTabs>
  );
}

const ruralEmpty: RuralSewageTreatmentRecord = {
  id: '',
  creditCode: '',
  orgCode: '',
  unitName: '',
  operatorName: '',
  legalRep: '',
  admDivCode: '',
  township: '',
  streetAddr: '',
  contactPerson: '',
  phone: '',
  entLng: '',
  entLat: '',
  facilityType: '',
  builtYear: '',
  builtMonth: '',
  treatMethodName1: '',
  treatMethodCode1: '',
  treatMethodName2: '',
  treatMethodCode2: '',
  treatMethodName3: '',
  treatMethodCode3: '',
  reclaimProcess: '',
  drainDestType: '',
  drainLngDeg: '',
  drainLngMin: '',
  drainLngSec: '',
  drainLatDeg: '',
  drainLatMin: '',
  drainLatSec: '',
  recvWaterName: '',
  recvWaterCode: '',
  onlineIn: 'no',
  onlineOut: 'no',
  sludgeStableSelf: '',
  sludgeDigest: '',
  sludgeStableMethod: '',
  hasBoiler: 'no',
  reportDate: '',
  annualRunDays: '',
  elecConsumption: '',
  linkedOutletCode: '',
};

export const ConfigRuralSewagePollutionView: React.FC = () => {
  const [data, setData] = useState<RuralSewageTreatmentRecord[]>(() => [...ruralSewageTreatmentInitial]);
  const [q, setQ] = useState({
    creditCode: '',
    orgCode: '',
    unitName: '',
    operatorName: '',
    township: '',
    facilityType: '',
    recvWaterName: '',
    admDivCode: ''
  });
  const [modal, setModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit' | 'detail';
    record?: RuralSewageTreatmentRecord;
  }>({ open: false, mode: 'create' });
  const ruralAdmDivSelectOptions = useMemo(
    () => shaoshanAddvcdSelectOptionsWithLegacy(modal.record?.admDivCode),
    [modal.record?.admDivCode],
  );
  const [form] = Form.useForm<RuralSewageTreatmentRecord>();
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  useEffect(() => {
    setVisibleColumns(getDefaultVisibleColumnKeys(ruralAllColumnDefs));
  }, []);

  const filtered = useMemo(() => {
    return data.filter(
      r =>
        matchField(r.creditCode, q.creditCode) &&
        matchField(r.orgCode, q.orgCode) &&
        matchField(r.unitName, q.unitName) &&
        matchField(r.operatorName, q.operatorName) &&
        matchField(r.township, q.township) &&
        matchField(r.facilityType, q.facilityType) &&
        matchField(r.recvWaterName, q.recvWaterName) &&
        matchField(r.admDivCode, q.admDivCode)
    );
  }, [data, q]);

  const tableColumns = useMemo(
    () =>
      buildTableColumnsFromConfig<RuralSewageTreatmentRecord>(ruralAllColumnDefs, visibleColumns, record => (
        <Space size={4} wrap={false} className="system-mgmt-table-op">
          <Button type="link" className="action-btn detail" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>
            详情
          </Button>
          <Button type="link" className="action-btn edit" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
            编辑
          </Button>
        </Space>
      )),
    [visibleColumns, data]
  );

  const closeModal = () => {
    setModal({ open: false, mode: 'create' });
    form.resetFields();
  };

  const openDetail = (record: RuralSewageTreatmentRecord) => {
    form.setFieldsValue(record);
    setModal({ open: true, mode: 'detail', record });
  };

  const openEdit = (record: RuralSewageTreatmentRecord) => {
    form.setFieldsValue(record);
    setModal({ open: true, mode: 'edit', record });
  };

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({ ...ruralEmpty, reportDate: dayjs().format('YYYY-MM-DD') });
    setModal({ open: true, mode: 'create' });
  };

  const handleDelete = () => {
    if (modal.record) {
      setData(data.filter(d => d.id !== modal.record!.id));
      message.success('已删除（原型）');
      closeModal();
    }
  };

  const submit = async () => {
    const v = await form.validateFields();
    const payload = v as RuralSewageTreatmentRecord;
    if (modal.mode === 'create') {
      setData([...data, { ...payload, id: genId('RSEW') }]);
      message.success('已新增（原型）');
    } else if (modal.mode === 'edit' && modal.record) {
      setData(data.map(d => (d.id === modal.record!.id ? { ...d, ...payload, id: d.id } : d)));
      message.success('已保存（原型）');
    }
    closeModal();
  };

  const formFields = (
    <>
      {modal.mode === 'edit' && (
        <Row gutter={CFG_FORM_GUTTER}>
          <Col {...CFG_FORM_COL_QUARTER}>
            <Form.Item name="id" label="内部编号">
              <Input disabled />
            </Form.Item>
          </Col>
        </Row>
      )}
      <Row gutter={CFG_FORM_GUTTER}>
        <Col {...CFG_FORM_COL_QUARTER}>
          <Form.Item name="creditCode" label="统一社会信用代码" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Col>
        <Col {...CFG_FORM_COL_QUARTER}>
          <Form.Item name="orgCode" label="组织机构代码" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Col>
        <Col {...CFG_FORM_COL_QUARTER}>
          <Form.Item name="unitName" label="单位详细名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Col>
        <Col {...CFG_FORM_COL_QUARTER}>
          <Form.Item name="operatorName" label="运营单位名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={CFG_FORM_GUTTER}>
        <Col {...CFG_FORM_COL_QUARTER}>
          <Form.Item name="legalRep" label="法定代表人">
            <Input />
          </Form.Item>
        </Col>
        <Col {...CFG_FORM_COL_QUARTER}>
          <Form.Item name="admDivCode" label="所属区划" rules={[{ required: true, message: '请选择所属区划' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="韶山市及下辖乡镇（街道）"
              options={ruralAdmDivSelectOptions}
            />
          </Form.Item>
        </Col>
        <Col {...CFG_FORM_COL_QUARTER}>
          <Form.Item name="township" label="乡(镇)">
            <Input />
          </Form.Item>
        </Col>
        <Col {...CFG_FORM_COL_QUARTER}>
          <Form.Item name="streetAddr" label="街(村)、门牌号" extra={ADDR_MAP_FORM_ITEM_EXTRA}>
            <Input placeholder={ADDR_MAP_INPUT_PLACEHOLDER} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={CFG_FORM_GUTTER}>
        <Col {...CFG_FORM_COL_FULL}>
          <Form.Item label="设施位置地图" colon={false}>
            <AddrWgs84MapPicker
              form={form}
              addrField="streetAddr"
              lngField="entLng"
              latField="entLat"
              mapAriaLabel="农村污水设施位置地图"
              hintAddressLabel="街(村)、门牌号"
              lngLatValueMode="string"
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={CFG_FORM_GUTTER}>
        <Col {...CFG_FORM_COL_QUARTER}>
          <Form.Item name="contactPerson" label="联系人">
            <Input />
          </Form.Item>
        </Col>
        <Col {...CFG_FORM_COL_QUARTER}>
          <Form.Item name="phone" label="电话号码">
            <Input />
          </Form.Item>
        </Col>
        <Col {...CFG_FORM_COL_QUARTER}>
          <Form.Item name="entLng" label="企业经度" tooltip="可与地图选点同步">
            <Input placeholder="选填，地图选点后自动回填" />
          </Form.Item>
        </Col>
        <Col {...CFG_FORM_COL_QUARTER}>
          <Form.Item name="entLat" label="企业纬度" tooltip="可与地图选点同步">
            <Input placeholder="选填，地图选点后自动回填" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={CFG_FORM_GUTTER}>
        <Col {...CFG_FORM_COL_HALF}>
          <Form.Item name="facilityType" label="污水处理设施类型" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Col>
        <Col {...CFG_FORM_COL_QUARTER}>
          <Form.Item name="builtYear" label="建成时间(年)">
            <Input />
          </Form.Item>
        </Col>
        <Col {...CFG_FORM_COL_QUARTER}>
          <Form.Item name="builtMonth" label="建成时间(月)">
            <Input />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={CFG_FORM_GUTTER}>
        <Col {...CFG_FORM_COL_HALF}>
          <Form.Item name="treatMethodName1" label="污水处理方法名称(1)">
            <Input />
          </Form.Item>
        </Col>
        <Col {...CFG_FORM_COL_HALF}>
          <Form.Item name="treatMethodCode1" label="污水处理方法代码(1)">
            <Input />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={CFG_FORM_GUTTER}>
        <Col {...CFG_FORM_COL_HALF}>
          <Form.Item name="treatMethodName2" label="污水处理方法名称(2)">
            <Input />
          </Form.Item>
        </Col>
        <Col {...CFG_FORM_COL_HALF}>
          <Form.Item name="treatMethodCode2" label="污水处理方法代码(2)">
            <Input />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={CFG_FORM_GUTTER}>
        <Col {...CFG_FORM_COL_HALF}>
          <Form.Item name="treatMethodName3" label="污水处理方法名称(3)">
            <Input />
          </Form.Item>
        </Col>
        <Col {...CFG_FORM_COL_HALF}>
          <Form.Item name="treatMethodCode3" label="污水处理方法代码(3)">
            <Input />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={CFG_FORM_GUTTER}>
        <Col {...CFG_FORM_COL_HALF}>
          <Form.Item name="reclaimProcess" label="再生水处理工艺">
            <Input />
          </Form.Item>
        </Col>
        <Col {...CFG_FORM_COL_HALF}>
          <Form.Item name="drainDestType" label="排水去向类型">
            <Input />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={CFG_FORM_GUTTER}>
        <Col {...CFG_FORM_COL_QUARTER}>
          <Form.Item name="drainLngDeg" label="排水经度-度">
            <Input />
          </Form.Item>
        </Col>
        <Col {...CFG_FORM_COL_QUARTER}>
          <Form.Item name="drainLngMin" label="排水经度-分">
            <Input />
          </Form.Item>
        </Col>
        <Col {...CFG_FORM_COL_QUARTER}>
          <Form.Item name="drainLngSec" label="排水经度-秒">
            <Input />
          </Form.Item>
        </Col>
        <Col {...CFG_FORM_COL_QUARTER}>
          <Form.Item name="drainLatDeg" label="排水纬度-度">
            <Input />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={CFG_FORM_GUTTER}>
        <Col {...CFG_FORM_COL_QUARTER}>
          <Form.Item name="drainLatMin" label="排水纬度-分">
            <Input />
          </Form.Item>
        </Col>
        <Col {...CFG_FORM_COL_QUARTER}>
          <Form.Item name="drainLatSec" label="排水纬度-秒">
            <Input />
          </Form.Item>
        </Col>
        <Col {...CFG_FORM_COL_QUARTER}>
          <Form.Item name="recvWaterName" label="受纳水体名称">
            <Input />
          </Form.Item>
        </Col>
        <Col {...CFG_FORM_COL_QUARTER}>
          <Form.Item name="recvWaterCode" label="受纳水体代码">
            <Input />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={CFG_FORM_GUTTER}>
        <Col {...CFG_FORM_COL_HALF}>
          <Form.Item name="linkedOutletCode" label="关联排口" tooltip="与设施管理「排口」台账入河入海排污口编码同源">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="选择入河入海排污口"
              options={LINKED_OUTLET_FORM_OPTIONS}
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={CFG_FORM_GUTTER}>
        <Col {...CFG_FORM_COL_QUARTER}>
          <Form.Item name="onlineIn" label="是否安装在线监测-进">
            <Select options={YES_NO_OPTIONS} />
          </Form.Item>
        </Col>
        <Col {...CFG_FORM_COL_QUARTER}>
          <Form.Item name="onlineOut" label="是否安装在线监测-出">
            <Select options={YES_NO_OPTIONS} />
          </Form.Item>
        </Col>
        <Col {...CFG_FORM_COL_QUARTER}>
          <Form.Item name="sludgeStableSelf" label="污泥稳定化处理(自建)">
            <Input />
          </Form.Item>
        </Col>
        <Col {...CFG_FORM_COL_QUARTER}>
          <Form.Item name="sludgeDigest" label="污泥厌氧消化装置">
            <Input />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={CFG_FORM_GUTTER}>
        <Col {...CFG_FORM_COL_HALF}>
          <Form.Item name="sludgeStableMethod" label="污泥稳定化处理方法">
            <Input />
          </Form.Item>
        </Col>
        <Col {...CFG_FORM_COL_QUARTER}>
          <Form.Item name="hasBoiler" label="厂区内是否有锅炉">
            <Select options={YES_NO_OPTIONS} />
          </Form.Item>
        </Col>
        <Col {...CFG_FORM_COL_QUARTER}>
          <Form.Item name="reportDate" label="报出日期">
            <Input placeholder="YYYY-MM-DD" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={CFG_FORM_GUTTER}>
        <Col {...CFG_FORM_COL_QUARTER}>
          <Form.Item name="annualRunDays" label="年运行天数(天)">
            <Input />
          </Form.Item>
        </Col>
        <Col {...CFG_FORM_COL_QUARTER}>
          <Form.Item name="elecConsumption" label="用电量(万千瓦时)">
            <Input />
          </Form.Item>
        </Col>
      </Row>
    </>
  );

  return (
    <div className="facility-view">
      <Card
        title="污染源信息（农村污水及集中处理设施）"
        extra={
          <Space wrap size={[8, 8]} align="center">
            <Button icon={<DownloadOutlined />} className="export-btn" onClick={() => runRuralPollutionListExport(filtered)}>
              导出Excel
            </Button>
            <Upload beforeUpload={() => { message.success('已导入（原型）'); return false; }} showUploadList={false}>
              <Button icon={<UploadOutlined />}>导入</Button>
            </Upload>
            <Button type="primary" className="add-btn" icon={<PlusOutlined />} onClick={openCreate}>
              新增
            </Button>
          </Space>
        }
      >
        <div className="filter-bar config-center-filter-bar">
          <Row className="config-center-filter-row" gutter={[12, 12]} align="bottom">
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input placeholder="统一社会信用代码" value={q.creditCode} onChange={e => setQ({ ...q, creditCode: e.target.value })} allowClear />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input placeholder="组织机构代码" value={q.orgCode} onChange={e => setQ({ ...q, orgCode: e.target.value })} allowClear />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input placeholder="单位详细名称" value={q.unitName} onChange={e => setQ({ ...q, unitName: e.target.value })} allowClear />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input placeholder="运营单位名称" value={q.operatorName} onChange={e => setQ({ ...q, operatorName: e.target.value })} allowClear />
            </Col>
          </Row>
          <Row className="config-center-filter-row" gutter={[12, 12]} align="bottom" style={{ marginTop: 4 }}>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input placeholder="乡(镇)" value={q.township} onChange={e => setQ({ ...q, township: e.target.value })} allowClear />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input placeholder="污水处理设施类型" value={q.facilityType} onChange={e => setQ({ ...q, facilityType: e.target.value })} allowClear />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input placeholder="受纳水体名称" value={q.recvWaterName} onChange={e => setQ({ ...q, recvWaterName: e.target.value })} allowClear />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="所属区划"
                style={{ width: '100%' }}
                value={q.admDivCode || undefined}
                onChange={v => setQ({ ...q, admDivCode: v ?? '' })}
                options={SHAOSHAN_ADDVCD_OPTIONS}
              />
            </Col>
            <Col {...CFG_FILTER_COL_QUERY}>
              <Space>
                <Button type="primary" className="search-btn" icon={<SearchOutlined />} onClick={() => message.success('已查询')}>
                  查询
                </Button>
                <Button onClick={() => setQ({})}>重置</Button>
              </Space>
            </Col>
          </Row>
        </div>
        <div className="report-table-toolbar">
          <Text strong>数据明细</Text>
          <div className="report-table-toolbar-actions">
            <ColumnManager columns={ruralAllColumnDefs} visibleColumns={visibleColumns} onChange={setVisibleColumns} />
          </div>
        </div>
        <div className="facility-table-wrap">
          <Table
            size="small"
            rowKey="id"
            scroll={{ x: 'max-content' }}
            columns={tableColumns}
            dataSource={filtered}
            pagination={{ defaultPageSize: 10, showTotal: t => `共 ${t} 条` }}
          />
        </div>
        <Modal
          styles={formModalStyles}
          wrapClassName={CONFIG_CENTER_MODAL_WRAP_CLASS}
          title={
            modal.mode === 'create'
              ? '新增·农村污水及集中处理设施'
              : modal.mode === 'detail'
                ? '详情·农村污水及集中处理设施'
                : '编辑·农村污水及集中处理设施'
          }
          open={modal.open}
          onCancel={closeModal}
          width={POLLUTION_WIDE_MODAL_WIDTH}
          destroyOnClose
          footer={
            modal.mode === 'detail' ? null : (
              <Space>
                {modal.mode === 'edit' && (
                  <Popconfirm title="确认删除该条记录？" onConfirm={handleDelete}>
                    <Button danger>删除</Button>
                  </Popconfirm>
                )}
                <Button onClick={closeModal}>取消</Button>
                <Button type="primary" onClick={submit}>
                  {modal.mode === 'create' ? '确定' : '保存'}
                </Button>
              </Space>
            )
          }
        >
          {modal.mode === 'detail' && modal.record ? (
            <RuralSewageDetail r={modal.record} />
          ) : (
            <Form form={form} layout="vertical" className="config-center-modal-form">
              {formFields}
            </Form>
          )}
        </Modal>
      </Card>
    </div>
  );
};

// ---------- 农业农村源 ----------

const AGRI_META_RAW = [
  ['censusDistCode', '普查小区代码', 160, true],
  ['creditCode', '统一社会信用代码', 190, true],
  ['orgCode', '组织机构代码', 130, false],
  ['farmName', '养殖场名称', 200, true],
  ['legalRep', '法定代表人', 100, false],
  ['admDivCode', '所属区划', 140, true],
  ['address', '地址', 200, false],
  ['centerLng', '中心经度', 110, false],
  ['centerLat', '中心纬度', 110, false],
  ['contactPerson', '联系人', 90, false],
  ['contactPhone', '电话号码', 120, false],
  ['breedSpecies', '养殖种类', 120, true],
  ['penCleanMethod', '圈舍清粪方式', 140, false],
  ['penVentMethod', '圈舍通风方式', 140, false],
  ['urineTreatProcess', '尿液废水处理工艺', 180, false],
  ['manureStoreSeepproof', '粪便存储设施是否防渗', 170, false],
  ['manureStoreRainproof', '粪便存储设施是否防雨', 170, false],
  ['manureStoreVol', '粪便存储设施容积(m³)', 160, false],
  ['manureTreatProcess', '粪便处理工艺', 140, false],
  ['manureTreatOther', '粪便处理工艺其他', 160, false],
  ['manureUseMethodRatio', '粪便处理利用方式及比例', 200, false],
  ['hasBoiler', '养殖场是否有锅炉', 140, false],
  ['linkedOutletCode', '关联排口', 200, false],
  ['reportDate', '报出日期', 120, true],
  ['farmNameStamp', '养殖场名称(盖章)', 200, false],
  ['penArea', '圈舍建筑面积(㎡)', 140, false],
  ['manureCollectYear', '粪便收集量(吨/年)', 150, false],
  ['manureUseYear', '粪便利用量(吨/年)', 150, false]
] as const;

const AGRI_META: { k: keyof AgriRuralPollutionRecord; t: string; w?: number; def?: boolean }[] = AGRI_META_RAW.map(
  ([k, t, w, def]) => ({ k: k as keyof AgriRuralPollutionRecord, t, w, def: def ?? false })
);

const agriAllColumnDefs: ColumnConfig[] = [
  ...AGRI_META.map(({ k, t, w, def }) => ({
    key: k as string,
    title: t,
    dataIndex: k as string,
    width: w,
    defaultVisible: def,
    ...(k === 'admDivCode' ?
      {
        render: (v: unknown) => {
          const s = typeof v === 'string' ? v.trim() : '';
          return s ? getShaoshanAddvcdLabel(s) : '—';
        },
      }
    : {}),
    ...(k === 'linkedOutletCode' ? { render: (v: unknown) => formatLinkedOutletCodeDisplay(v) } : {}),
  })),
  { key: 'operation', title: '操作', width: 168, fixed: 'right' as const, defaultVisible: true },
];

const AGRI_POLLUTION_EXPORT_FMT: Record<string, (raw: unknown) => string | number> = {
  admDivCode: pollutionAdmDivExcel,
  linkedOutletCode: (v: unknown) => formatLinkedOutletCodeDisplay(v),
  manureStoreSeepproof: pollutionYnFmt,
  manureStoreRainproof: pollutionYnFmt,
  hasBoiler: pollutionYnFmt,
};

function runAgriPollutionListExport(rows: AgriRuralPollutionRecord[]) {
  const recs = rows as unknown as Record<string, unknown>[];
  if (!recs.length) {
    message.warning('当前筛选条件下无数据可导出');
    return;
  }
  downloadTableFullExcel(recs, agriAllColumnDefs, '配置中心_污染源_农业农村源', '农业农村源', { formatByKey: AGRI_POLLUTION_EXPORT_FMT });
  message.success('已导出 Excel（全量字段）');
}

/** 供排口「关联信息」等复用：农业农村源只读详情体 */
export function AgriDetail({ r }: { r: AgriRuralPollutionRecord }) {
  const item = (label: string, v: string) => (
    <Descriptions.Item key={label} label={label}>
      {configCenterDetailText(v)}
    </Descriptions.Item>
  );
  return (
    <ConfigCenterDetailTabs>
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="内部编号" span={2}>
          {configCenterDetailText(r.id)}
        </Descriptions.Item>
        {item('普查小区代码', r.censusDistCode)}
        {item('统一社会信用代码', r.creditCode)}
        {item('组织机构代码', r.orgCode)}
        {item('养殖场名称', r.farmName)}
        {item('法定代表人', r.legalRep)}
        {item('所属区划', r.admDivCode ? getShaoshanAddvcdLabel(r.admDivCode) : '')}
        {/* 与水利工程详情一致：地址、地图各占整行，避免与经纬度同排挤压 */}
        <Descriptions.Item label="地址" span={2}>
          {configCenterDetailText(r.address)}
        </Descriptions.Item>
        {item('中心经度', r.centerLng)}
        {item('中心纬度', r.centerLat)}
        <Descriptions.Item
          label="养殖场位置地图"
          span={2}
          styles={{ label: { verticalAlign: 'top', width: 160 }, content: { width: '100%', maxWidth: '100%' } }}
        >
          <AddrWgs84DetailMap
            title={r.farmName}
            location={r.address}
            lng={r.centerLng}
            lat={r.centerLat}
            mapAriaLabel="养殖场位置地图"
          />
        </Descriptions.Item>
        {item('联系方式-联系人', r.contactPerson)}
        {item('联系方式-电话号码', r.contactPhone)}
        {item('养殖种类', r.breedSpecies)}
        {item('圈舍清粪方式', r.penCleanMethod)}
        {item('圈舍通风方式', r.penVentMethod)}
        {item('尿液废水处理工艺', r.urineTreatProcess)}
        <Descriptions.Item label="粪便存储设施是否防渗">{yesNoLabel(r.manureStoreSeepproof)}</Descriptions.Item>
        <Descriptions.Item label="粪便存储设施是否防雨">{yesNoLabel(r.manureStoreRainproof)}</Descriptions.Item>
        {item('粪便存储设施容积(立方米)', r.manureStoreVol)}
        {item('粪便处理工艺', r.manureTreatProcess)}
        {item('粪便处理工艺其他', r.manureTreatOther)}
        {item('粪便处理利用方式及比例', r.manureUseMethodRatio)}
        <Descriptions.Item label="养殖场是否有锅炉">{yesNoLabel(r.hasBoiler)}</Descriptions.Item>
        {item('报出日期', r.reportDate)}
        {item('养殖场名称(盖章)', r.farmNameStamp)}
        {item('圈舍建筑面积(平方米)', r.penArea)}
        {item('粪便收集量(吨/年)', r.manureCollectYear)}
        {item('粪便利用量(吨/年)', r.manureUseYear)}
        <Descriptions.Item label="关联排口">{formatLinkedOutletCodeDisplay(r.linkedOutletCode)}</Descriptions.Item>
      </Descriptions>
    </ConfigCenterDetailTabs>
  );
}

const agriEmpty: AgriRuralPollutionRecord = {
  id: '',
  censusDistCode: '',
  creditCode: '',
  orgCode: '',
  farmName: '',
  legalRep: '',
  admDivCode: '',
  address: '',
  centerLng: '',
  centerLat: '',
  contactPerson: '',
  contactPhone: '',
  breedSpecies: '',
  penCleanMethod: '',
  penVentMethod: '',
  urineTreatProcess: '',
  manureStoreSeepproof: 'no',
  manureStoreRainproof: 'no',
  manureStoreVol: '',
  manureTreatProcess: '',
  manureTreatOther: '',
  manureUseMethodRatio: '',
  hasBoiler: 'no',
  reportDate: '',
  farmNameStamp: '',
  penArea: '',
  manureCollectYear: '',
  manureUseYear: '',
  linkedOutletCode: '',
};

export const ConfigAgriRuralPollutionView: React.FC = () => {
  const [data, setData] = useState<AgriRuralPollutionRecord[]>(() => [...agriRuralPollutionInitial]);
  const [q, setQ] = useState({
    censusDistCode: '',
    creditCode: '',
    orgCode: '',
    farmName: '',
    admDivCode: '',
    address: '',
    breedSpecies: ''
  });
  const [modal, setModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit' | 'detail';
    record?: AgriRuralPollutionRecord;
  }>({ open: false, mode: 'create' });
  const agriAdmDivSelectOptions = useMemo(
    () => shaoshanAddvcdSelectOptionsWithLegacy(modal.record?.admDivCode),
    [modal.record?.admDivCode],
  );
  const [form] = Form.useForm<AgriRuralPollutionRecord>();
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  useEffect(() => {
    setVisibleColumns(getDefaultVisibleColumnKeys(agriAllColumnDefs));
  }, []);

  const filtered = useMemo(() => {
    return data.filter(
      r =>
        matchField(r.censusDistCode, q.censusDistCode) &&
        matchField(r.creditCode, q.creditCode) &&
        matchField(r.orgCode, q.orgCode) &&
        matchField(r.farmName, q.farmName) &&
        matchField(r.admDivCode, q.admDivCode) &&
        matchField(r.address, q.address) &&
        matchField(r.breedSpecies, q.breedSpecies)
    );
  }, [data, q]);

  const tableColumns = useMemo(
    () =>
      buildTableColumnsFromConfig<AgriRuralPollutionRecord>(agriAllColumnDefs, visibleColumns, record => (
        <Space size={4} wrap={false} className="system-mgmt-table-op">
          <Button type="link" className="action-btn detail" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>
            详情
          </Button>
          <Button type="link" className="action-btn edit" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
            编辑
          </Button>
        </Space>
      )),
    [visibleColumns, data]
  );

  const closeModal = () => {
    setModal({ open: false, mode: 'create' });
    form.resetFields();
  };

  const openDetail = (record: AgriRuralPollutionRecord) => {
    setModal({ open: true, mode: 'detail', record });
  };

  const openEdit = (record: AgriRuralPollutionRecord) => {
    form.setFieldsValue(record);
    setModal({ open: true, mode: 'edit', record });
  };

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({ ...agriEmpty, reportDate: dayjs().format('YYYY-MM-DD') });
    setModal({ open: true, mode: 'create' });
  };

  const handleDelete = () => {
    if (modal.record) {
      setData(data.filter(d => d.id !== modal.record!.id));
      message.success('已删除（原型）');
      closeModal();
    }
  };

  const submit = async () => {
    const v = await form.validateFields();
    const payload = v as AgriRuralPollutionRecord;
    if (modal.mode === 'create') {
      setData([...data, { ...payload, id: genId('AGRI') }]);
      message.success('已新增（原型）');
    } else if (modal.mode === 'edit' && modal.record) {
      setData(data.map(d => (d.id === modal.record!.id ? { ...d, ...payload, id: d.id } : d)));
      message.success('已保存（原型）');
    }
    closeModal();
  };

  return (
    <div className="facility-view">
      <Card
        title="污染源信息（农业农村源）"
        extra={
          <Space wrap size={[8, 8]} align="center">
            <Button icon={<DownloadOutlined />} className="export-btn" onClick={() => runAgriPollutionListExport(filtered)}>
              导出Excel
            </Button>
            <Upload beforeUpload={() => { message.success('已导入（原型）'); return false; }} showUploadList={false}>
              <Button icon={<UploadOutlined />}>导入</Button>
            </Upload>
            <Button type="primary" className="add-btn" icon={<PlusOutlined />} onClick={openCreate}>
              新增
            </Button>
          </Space>
        }
      >
        <div className="filter-bar config-center-filter-bar">
          <Row className="config-center-filter-row" gutter={[12, 12]} align="bottom">
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input placeholder="普查小区代码" value={q.censusDistCode} onChange={e => setQ({ ...q, censusDistCode: e.target.value })} allowClear />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input placeholder="统一社会信用代码" value={q.creditCode} onChange={e => setQ({ ...q, creditCode: e.target.value })} allowClear />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input placeholder="组织机构代码" value={q.orgCode} onChange={e => setQ({ ...q, orgCode: e.target.value })} allowClear />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input placeholder="养殖场名称" value={q.farmName} onChange={e => setQ({ ...q, farmName: e.target.value })} allowClear />
            </Col>
          </Row>
          <Row className="config-center-filter-row" gutter={[12, 12]} align="bottom" style={{ marginTop: 4 }}>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="所属区划"
                style={{ width: '100%' }}
                value={q.admDivCode || undefined}
                onChange={v => setQ({ ...q, admDivCode: v ?? '' })}
                options={SHAOSHAN_ADDVCD_OPTIONS}
              />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input placeholder="地址" value={q.address} onChange={e => setQ({ ...q, address: e.target.value })} allowClear />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input placeholder="养殖种类" value={q.breedSpecies} onChange={e => setQ({ ...q, breedSpecies: e.target.value })} allowClear />
            </Col>
            <Col {...CFG_FILTER_COL_QUERY}>
              <Space>
                <Button type="primary" className="search-btn" icon={<SearchOutlined />} onClick={() => message.success('已查询')}>
                  查询
                </Button>
                <Button onClick={() => setQ({})}>重置</Button>
              </Space>
            </Col>
          </Row>
        </div>
        <div className="report-table-toolbar">
          <Text strong>数据明细</Text>
          <div className="report-table-toolbar-actions">
            <ColumnManager columns={agriAllColumnDefs} visibleColumns={visibleColumns} onChange={setVisibleColumns} />
          </div>
        </div>
        <div className="facility-table-wrap">
          <Table
            size="small"
            rowKey="id"
            scroll={{ x: 'max-content' }}
            columns={tableColumns}
            dataSource={filtered}
            pagination={{ defaultPageSize: 10, showTotal: t => `共 ${t} 条` }}
          />
        </div>
        <Modal
          styles={formModalStyles}
          wrapClassName={CONFIG_CENTER_MODAL_WRAP_CLASS}
          title={
            modal.mode === 'create' ? '新增·农业农村源' : modal.mode === 'detail' ? '详情·农业农村源' : '编辑·农业农村源'
          }
          open={modal.open}
          onCancel={closeModal}
          width={POLLUTION_WIDE_MODAL_WIDTH}
          destroyOnClose
          footer={
            modal.mode === 'detail' ? null : (
              <Space>
                {modal.mode === 'edit' && (
                  <Popconfirm title="确认删除？" onConfirm={handleDelete}>
                    <Button danger>删除</Button>
                  </Popconfirm>
                )}
                <Button onClick={closeModal}>取消</Button>
                <Button type="primary" onClick={submit}>
                  {modal.mode === 'create' ? '确定' : '保存'}
                </Button>
              </Space>
            )
          }
        >
          {modal.mode === 'detail' && modal.record ? (
            <AgriDetail r={modal.record} />
          ) : (
            <Form form={form} layout="vertical" className="config-center-modal-form">
              {modal.mode === 'edit' && (
                <Row gutter={CFG_FORM_GUTTER}>
                  <Col {...CFG_FORM_COL_QUARTER}>
                    <Form.Item name="id" label="内部编号">
                      <Input disabled />
                    </Form.Item>
                  </Col>
                </Row>
              )}
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="censusDistCode" label="普查小区代码" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="creditCode" label="统一社会信用代码" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="orgCode" label="组织机构代码">
                    <Input />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="farmName" label="养殖场名称" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="legalRep" label="法定代表人">
                    <Input />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="admDivCode" label="所属区划" rules={[{ required: true, message: '请选择所属区划' }]}>
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder="韶山市及下辖乡镇（街道）"
                      options={agriAdmDivSelectOptions}
                    />
                  </Form.Item>
                </Col>
              </Row>
              {/* 与农村污水设施、水利台账一致：地址整行 → 地图整行 → 经纬度与联系人 */}
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_FULL}>
                  <Form.Item name="address" label="地址" extra={ADDR_MAP_FORM_ITEM_EXTRA}>
                    <Input placeholder={ADDR_MAP_INPUT_PLACEHOLDER} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_FULL}>
                  <Form.Item label="养殖场位置地图" colon={false}>
                    <AddrWgs84MapPicker
                      form={form}
                      addrField="address"
                      lngField="centerLng"
                      latField="centerLat"
                      mapAriaLabel="农业农村源位置地图"
                      hintAddressLabel="地址"
                      lngLatValueMode="string"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="centerLng" label="中心经度" tooltip="可与地图选点同步">
                    <Input placeholder="选填，地图选点后自动回填" />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="centerLat" label="中心纬度" tooltip="可与地图选点同步">
                    <Input placeholder="选填，地图选点后自动回填" />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="contactPerson" label="联系人">
                    <Input />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="contactPhone" label="电话号码">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_HALF}>
                  <Form.Item name="linkedOutletCode" label="关联排口" tooltip="与设施管理「排口」台账同源">
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      placeholder="选择入河入海排污口"
                      options={LINKED_OUTLET_FORM_OPTIONS}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="breedSpecies" label="养殖种类" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="penCleanMethod" label="圈舍清粪方式">
                    <Input />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="penVentMethod" label="圈舍通风方式">
                    <Input />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="urineTreatProcess" label="尿液废水处理工艺">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="manureStoreSeepproof" label="粪便存储设施是否防渗">
                    <Select options={YES_NO_OPTIONS} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="manureStoreRainproof" label="粪便存储设施是否防雨">
                    <Select options={YES_NO_OPTIONS} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="manureStoreVol" label="粪便存储设施容积(立方米)">
                    <Input />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="hasBoiler" label="养殖场是否有锅炉">
                    <Select options={YES_NO_OPTIONS} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_HALF}>
                  <Form.Item name="manureTreatProcess" label="粪便处理工艺">
                    <Input />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_HALF}>
                  <Form.Item name="manureTreatOther" label="粪便处理工艺其他">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_FULL}>
                  <Form.Item name="manureUseMethodRatio" label="粪便处理利用方式及比例">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="reportDate" label="报出日期" rules={[{ required: true }]}>
                    <Input placeholder="YYYY-MM-DD" />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_HALF}>
                  <Form.Item name="farmNameStamp" label="养殖场名称(盖章)">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="penArea" label="圈舍建筑面积(平方米)">
                    <Input />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="manureCollectYear" label="粪便收集量(吨/年)">
                    <Input />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="manureUseYear" label="粪便利用量(吨/年)">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          )}
        </Modal>
      </Card>
    </div>
  );
};

// ---------- 工业企业污染源 ----------

const IND_META_RAW = [
  ['creditCode', '统一社会信用代码', 190, true],
  ['orgCode', '组织机构代码', 130, false],
  ['unitName', '单位详细名称', 200, true],
  ['industryCode1', '行业代码1', 100, true],
  ['industryName1', '行业名称1', 140, true],
  ['industryCode2', '行业代码2', 100, false],
  ['industryName2', '行业名称2', 140, false],
  ['industryCode3', '行业代码3', 100, false],
  ['industryName3', '行业名称3', 140, false],
  ['township', '乡镇', 100, false],
  ['streetAddr', '街道村、门牌号', 180, false],
  ['admDivCode', '所属区划', 140, true],
  ['lng', '经度', 110, false],
  ['lat', '纬度', 110, false],
  ['enterpriseScale', '企业规模', 100, false],
  ['legalRep', '法定代表人', 100, false],
  ['openDate', '开业时间', 120, false],
  ['contactPerson', '联系人', 90, false],
  ['phone', '电话号码', 120, false],
  ['regType', '登记注册类型', 180, false],
  ['recvWaterName', '受纳水体名称', 120, false],
  ['recvWaterCode', '受纳水体编码', 140, false],
  ['linkedOutletCode', '关联排口', 200, false],
  ['permitNo', '排污许可证编号', 160, false],
  ['runStatus', '企业运行状态', 120, true],
  ['normalProdHours', '正常生产时间(小时)', 150, false],
  ['industrialOutput', '工业总产值(千元)', 140, false],
  ['hasIndWastewater', '是否产生工业废水', 150, false],
  ['hasBoilerTurbine', '是否有锅炉/燃气轮机', 170, false],
  ['hasIndustrialKiln', '是否有工业炉窑', 130, false],
  ['hasCoking', '是否有炼焦工序', 130, false],
  ['hasSinterPellet', '是否有烧结/球团工序', 170, false],
  ['hasIronmaking', '是否有炼铁工序', 130, false],
  ['hasSteelmaking', '是否有炼钢工序', 130, false],
  ['hasClinker', '是否有熟料生产', 130, false],
  ['isPetrochemical', '是否为石化企业', 130, false],
  ['hasOrganicTank', '是否有有机液体储罐/装载', 200, false],
  ['usesVocs', '是否使用含挥发性有机物', 190, false],
  ['hasIndustrialSolidMaterial', '是否有工业固体物料', 170, false],
  ['hasOtherWasteGas', '是否有其他生产废气', 160, false],
  ['hasGeneralSolidWaste', '是否有一般工业固体废物', 190, false]
] as const;

const IND_META: { k: keyof IndustryPollutionRecord; t: string; w?: number; def?: boolean }[] = IND_META_RAW.map(
  ([k, t, w, def]) => ({ k: k as keyof IndustryPollutionRecord, t, w, def: def ?? false })
);

const indAllColumnDefs: ColumnConfig[] = [
  ...IND_META.map(({ k, t, w, def }) => ({
    key: k as string,
    title: t,
    dataIndex: k as string,
    width: w,
    defaultVisible: def,
    ...(k === 'admDivCode' ?
      {
        render: (v: unknown) => {
          const s = typeof v === 'string' ? v.trim() : '';
          return s ? getShaoshanAddvcdLabel(s) : '—';
        },
      }
    : {}),
    ...(k === 'linkedOutletCode' ? { render: (v: unknown) => formatLinkedOutletCodeDisplay(v) } : {}),
  })),
  { key: 'operation', title: '操作', width: 168, fixed: 'right' as const, defaultVisible: true },
];

const IND_POLLUTION_YN_KEYS = [
  'hasIndWastewater',
  'hasBoilerTurbine',
  'hasIndustrialKiln',
  'hasCoking',
  'hasSinterPellet',
  'hasIronmaking',
  'hasSteelmaking',
  'hasClinker',
  'isPetrochemical',
  'hasOrganicTank',
  'usesVocs',
  'hasIndustrialSolidMaterial',
  'hasOtherWasteGas',
  'hasGeneralSolidWaste',
] as const;

const IND_POLLUTION_EXPORT_FMT: Record<string, (raw: unknown) => string | number> = {
  admDivCode: pollutionAdmDivExcel,
  linkedOutletCode: (v: unknown) => formatLinkedOutletCodeDisplay(v),
  ...Object.fromEntries(IND_POLLUTION_YN_KEYS.map(k => [k, pollutionYnFmt] as const)),
};

function runIndPollutionListExport(rows: IndustryPollutionRecord[]) {
  const recs = rows as unknown as Record<string, unknown>[];
  if (!recs.length) {
    message.warning('当前筛选条件下无数据可导出');
    return;
  }
  downloadTableFullExcel(recs, indAllColumnDefs, '配置中心_污染源_工业企业', '工业企业污染源', { formatByKey: IND_POLLUTION_EXPORT_FMT });
  message.success('已导出 Excel（全量字段）');
}

/** 供排口「关联信息」等复用：工业企业污染源只读详情体 */
export function IndDetail({ r }: { r: IndustryPollutionRecord }) {
  const item = (label: string, v: string) => (
    <Descriptions.Item key={label} label={label}>
      {configCenterDetailText(v)}
    </Descriptions.Item>
  );
  const yn = (label: string, v: string) => (
    <Descriptions.Item key={label} label={label}>
      {yesNoLabel(v)}
    </Descriptions.Item>
  );
  return (
    <ConfigCenterDetailTabs>
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="内部编号" span={2}>
          {configCenterDetailText(r.id)}
        </Descriptions.Item>
        {item('统一社会信用代码', r.creditCode)}
        {item('组织机构代码', r.orgCode)}
        {item('单位详细名称', r.unitName)}
        {item('行业代码1', r.industryCode1)}
        {item('行业名称1', r.industryName1)}
        {item('行业代码2', r.industryCode2)}
        {item('行业名称2', r.industryName2)}
        {item('行业代码3', r.industryCode3)}
        {item('行业名称3', r.industryName3)}
        {item('乡镇', r.township)}
        {item('街道村，门牌号', r.streetAddr)}
        {item('所属区划', r.admDivCode ? getShaoshanAddvcdLabel(r.admDivCode) : '')}
        {item('经度', r.lng)}
        {item('纬度', r.lat)}
        <Descriptions.Item label="企业位置地图" span={2}>
          <AddrWgs84DetailMap
            title={r.unitName}
            location={[r.township, r.streetAddr].filter(Boolean).join(' ') || r.streetAddr}
            lng={r.lng}
            lat={r.lat}
            mapAriaLabel="工业企业位置地图"
          />
        </Descriptions.Item>
        {item('企业规模', r.enterpriseScale)}
        {item('法定代表人', r.legalRep)}
        {item('开业时间', r.openDate)}
        {item('联系人', r.contactPerson)}
        {item('电话号码', r.phone)}
        {item('登记注册类型', r.regType)}
        {item('受纳水体名称', r.recvWaterName)}
        {item('受纳水体编码', r.recvWaterCode)}
        <Descriptions.Item label="关联排口">{formatLinkedOutletCodeDisplay(r.linkedOutletCode)}</Descriptions.Item>
        {item('排污许可证编号', r.permitNo)}
        {item('企业运行状态', r.runStatus)}
        {item('正常生产时间(小时)', r.normalProdHours)}
        {item('工业总产值(当年价格)(千元)', r.industrialOutput)}
        {yn('是否产生工业废水', r.hasIndWastewater)}
        {yn('是否有锅炉/燃气轮机', r.hasBoilerTurbine)}
        {yn('是否有工业炉窑', r.hasIndustrialKiln)}
        {yn('是否有炼焦工序', r.hasCoking)}
        {yn('是否有烧结/球团工序', r.hasSinterPellet)}
        {yn('是否有炼铁工序', r.hasIronmaking)}
        {yn('是否有炼钢工序', r.hasSteelmaking)}
        {yn('是否有熟料生产', r.hasClinker)}
        {yn('是否为石化企业', r.isPetrochemical)}
        {yn('是否有有机液体储罐/装载', r.hasOrganicTank)}
        {yn('是否使用含挥发性有机物原辅材料', r.usesVocs)}
        {yn('是否有工业固体物料堆场', r.hasIndustrialSolidMaterial)}
        {yn('是否有其他生产废气', r.hasOtherWasteGas)}
        {yn('是否有一般工业固体废物', r.hasGeneralSolidWaste)}
      </Descriptions>
    </ConfigCenterDetailTabs>
  );
}

const indEmpty: IndustryPollutionRecord = {
  id: '',
  creditCode: '',
  orgCode: '',
  unitName: '',
  industryCode1: '',
  industryName1: '',
  industryCode2: '',
  industryName2: '',
  industryCode3: '',
  industryName3: '',
  township: '',
  streetAddr: '',
  admDivCode: '',
  lng: '',
  lat: '',
  enterpriseScale: '',
  legalRep: '',
  openDate: '',
  contactPerson: '',
  phone: '',
  regType: '',
  recvWaterName: '',
  recvWaterCode: '',
  permitNo: '',
  runStatus: '',
  normalProdHours: '',
  industrialOutput: '',
  hasIndWastewater: 'no',
  hasBoilerTurbine: 'no',
  hasIndustrialKiln: 'no',
  hasCoking: 'no',
  hasSinterPellet: 'no',
  hasIronmaking: 'no',
  hasSteelmaking: 'no',
  hasClinker: 'no',
  isPetrochemical: 'no',
  hasOrganicTank: 'no',
  usesVocs: 'no',
  hasIndustrialSolidMaterial: 'no',
  hasOtherWasteGas: 'no',
  hasGeneralSolidWaste: 'no',
  linkedOutletCode: '',
};

export const ConfigIndustryPollutionView: React.FC = () => {
  const [data, setData] = useState<IndustryPollutionRecord[]>(() => [...industryPollutionInitial]);
  const [q, setQ] = useState({
    creditCode: '',
    orgCode: '',
    unitName: '',
    industryName1: '',
    admDivCode: '',
    township: '',
    recvWaterName: '',
    runStatus: ''
  });
  const [modal, setModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit' | 'detail';
    record?: IndustryPollutionRecord;
  }>({ open: false, mode: 'create' });
  const indAdmDivSelectOptions = useMemo(
    () => shaoshanAddvcdSelectOptionsWithLegacy(modal.record?.admDivCode),
    [modal.record?.admDivCode],
  );
  const [form] = Form.useForm<IndustryPollutionRecord>();
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  useEffect(() => {
    setVisibleColumns(getDefaultVisibleColumnKeys(indAllColumnDefs));
  }, []);

  const filtered = useMemo(() => {
    return data.filter(
      r =>
        matchField(r.creditCode, q.creditCode) &&
        matchField(r.orgCode, q.orgCode) &&
        matchField(r.unitName, q.unitName) &&
        matchField(r.industryName1, q.industryName1) &&
        matchField(r.admDivCode, q.admDivCode) &&
        matchField(r.township, q.township) &&
        matchField(r.recvWaterName, q.recvWaterName) &&
        matchField(r.runStatus, q.runStatus)
    );
  }, [data, q]);

  const tableColumns = useMemo(
    () =>
      buildTableColumnsFromConfig<IndustryPollutionRecord>(indAllColumnDefs, visibleColumns, record => (
        <Space size={4} wrap={false} className="system-mgmt-table-op">
          <Button type="link" className="action-btn detail" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>
            详情
          </Button>
          <Button type="link" className="action-btn edit" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
            编辑
          </Button>
        </Space>
      )),
    [visibleColumns, data]
  );

  const closeModal = () => {
    setModal({ open: false, mode: 'create' });
    form.resetFields();
  };

  const openDetail = (record: IndustryPollutionRecord) => {
    setModal({ open: true, mode: 'detail', record });
  };

  const openEdit = (record: IndustryPollutionRecord) => {
    form.setFieldsValue(record);
    setModal({ open: true, mode: 'edit', record });
  };

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({ ...indEmpty });
    setModal({ open: true, mode: 'create' });
  };

  const handleDelete = () => {
    if (modal.record) {
      setData(data.filter(d => d.id !== modal.record!.id));
      message.success('已删除（原型）');
      closeModal();
    }
  };

  const submit = async () => {
    const v = await form.validateFields();
    const payload = v as IndustryPollutionRecord;
    if (modal.mode === 'create') {
      setData([...data, { ...payload, id: genId('IND') }]);
      message.success('已新增（原型）');
    } else if (modal.mode === 'edit' && modal.record) {
      setData(data.map(d => (d.id === modal.record!.id ? { ...d, ...payload, id: d.id } : d)));
      message.success('已保存（原型）');
    }
    closeModal();
  };

  const ynSelect = (name: keyof IndustryPollutionRecord, label: string) => (
    <Col {...CFG_FORM_COL_QUARTER} key={name as string}>
      <Form.Item name={name} label={label}>
        <Select options={YES_NO_OPTIONS} />
      </Form.Item>
    </Col>
  );

  return (
    <div className="facility-view">
      <Card
        title="污染源信息（工业企业污染源）"
        extra={
          <Space wrap size={[8, 8]} align="center">
            <Button icon={<DownloadOutlined />} className="export-btn" onClick={() => runIndPollutionListExport(filtered)}>
              导出Excel
            </Button>
            <Upload beforeUpload={() => { message.success('已导入（原型）'); return false; }} showUploadList={false}>
              <Button icon={<UploadOutlined />}>导入</Button>
            </Upload>
            <Button type="primary" className="add-btn" icon={<PlusOutlined />} onClick={openCreate}>
              新增
            </Button>
          </Space>
        }
      >
        <div className="filter-bar config-center-filter-bar">
          <Row className="config-center-filter-row" gutter={[12, 12]} align="bottom">
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input placeholder="统一社会信用代码" value={q.creditCode} onChange={e => setQ({ ...q, creditCode: e.target.value })} allowClear />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input placeholder="组织机构代码" value={q.orgCode} onChange={e => setQ({ ...q, orgCode: e.target.value })} allowClear />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input placeholder="单位详细名称" value={q.unitName} onChange={e => setQ({ ...q, unitName: e.target.value })} allowClear />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input placeholder="行业名称1" value={q.industryName1} onChange={e => setQ({ ...q, industryName1: e.target.value })} allowClear />
            </Col>
          </Row>
          <Row className="config-center-filter-row" gutter={[12, 12]} align="bottom" style={{ marginTop: 4 }}>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="所属区划"
                style={{ width: '100%' }}
                value={q.admDivCode || undefined}
                onChange={v => setQ({ ...q, admDivCode: v ?? '' })}
                options={SHAOSHAN_ADDVCD_OPTIONS}
              />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input placeholder="乡镇" value={q.township} onChange={e => setQ({ ...q, township: e.target.value })} allowClear />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input placeholder="受纳水体名称" value={q.recvWaterName} onChange={e => setQ({ ...q, recvWaterName: e.target.value })} allowClear />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input placeholder="企业运行状态" value={q.runStatus} onChange={e => setQ({ ...q, runStatus: e.target.value })} allowClear />
            </Col>
            <Col {...CFG_FILTER_COL_QUERY}>
              <Space>
                <Button type="primary" className="search-btn" icon={<SearchOutlined />} onClick={() => message.success('已查询')}>
                  查询
                </Button>
                <Button onClick={() => setQ({})}>重置</Button>
              </Space>
            </Col>
          </Row>
        </div>
        <div className="report-table-toolbar">
          <Text strong>数据明细</Text>
          <div className="report-table-toolbar-actions">
            <ColumnManager columns={indAllColumnDefs} visibleColumns={visibleColumns} onChange={setVisibleColumns} />
          </div>
        </div>
        <div className="facility-table-wrap">
          <Table
            size="small"
            rowKey="id"
            scroll={{ x: 'max-content' }}
            columns={tableColumns}
            dataSource={filtered}
            pagination={{ defaultPageSize: 10, showTotal: t => `共 ${t} 条` }}
          />
        </div>
        <Modal
          styles={formModalStyles}
          wrapClassName={CONFIG_CENTER_MODAL_WRAP_CLASS}
          title={
            modal.mode === 'create'
              ? '新增·工业企业污染源'
              : modal.mode === 'detail'
                ? '详情·工业企业污染源'
                : '编辑·工业企业污染源'
          }
          open={modal.open}
          onCancel={closeModal}
          width={POLLUTION_WIDE_MODAL_WIDTH}
          destroyOnClose
          footer={
            modal.mode === 'detail' ? null : (
              <Space>
                {modal.mode === 'edit' && (
                  <Popconfirm title="确认删除？" onConfirm={handleDelete}>
                    <Button danger>删除</Button>
                  </Popconfirm>
                )}
                <Button onClick={closeModal}>取消</Button>
                <Button type="primary" onClick={submit}>
                  {modal.mode === 'create' ? '确定' : '保存'}
                </Button>
              </Space>
            )
          }
        >
          {modal.mode === 'detail' && modal.record ? (
            <IndDetail r={modal.record} />
          ) : (
            <Form form={form} layout="vertical" className="config-center-modal-form">
              {modal.mode === 'edit' && (
                <Row gutter={CFG_FORM_GUTTER}>
                  <Col {...CFG_FORM_COL_QUARTER}>
                    <Form.Item name="id" label="内部编号">
                      <Input disabled />
                    </Form.Item>
                  </Col>
                </Row>
              )}
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="creditCode" label="统一社会信用代码" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="orgCode" label="组织机构代码">
                    <Input />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_HALF}>
                  <Form.Item name="unitName" label="单位详细名称" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="industryCode1" label="行业代码1">
                    <Input />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="industryName1" label="行业名称1">
                    <Input />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="industryCode2" label="行业代码2">
                    <Input />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="industryName2" label="行业名称2">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="industryCode3" label="行业代码3">
                    <Input />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="industryName3" label="行业名称3">
                    <Input />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="township" label="乡镇">
                    <Input />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="streetAddr" label="街道村、门牌号" extra={ADDR_MAP_FORM_ITEM_EXTRA}>
                    <Input placeholder={ADDR_MAP_INPUT_PLACEHOLDER} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_FULL}>
                  <Form.Item label="企业位置地图" colon={false}>
                    <AddrWgs84MapPicker
                      form={form}
                      addrField="streetAddr"
                      lngField="lng"
                      latField="lat"
                      mapAriaLabel="工业企业污染源位置地图"
                      hintAddressLabel="街道村、门牌号"
                      lngLatValueMode="string"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="admDivCode" label="所属区划" rules={[{ required: true, message: '请选择所属区划' }]}>
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder="韶山市及下辖乡镇（街道）"
                      options={indAdmDivSelectOptions}
                    />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="lng" label="经度" tooltip="可与地图选点同步">
                    <Input placeholder="选填，地图选点后自动回填" />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="lat" label="纬度" tooltip="可与地图选点同步">
                    <Input placeholder="选填，地图选点后自动回填" />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="enterpriseScale" label="企业规模">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="legalRep" label="法定代表人">
                    <Input />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="openDate" label="开业时间">
                    <Input placeholder="YYYY-MM-DD" />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="contactPerson" label="联系人">
                    <Input />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="phone" label="电话号码">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_HALF}>
                  <Form.Item name="regType" label="登记注册类型">
                    <Input />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="recvWaterName" label="受纳水体名称">
                    <Input />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="recvWaterCode" label="受纳水体编码">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_HALF}>
                  <Form.Item name="linkedOutletCode" label="关联排口" tooltip="与设施管理「排口」台账同源">
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      placeholder="选择入河入海排污口"
                      options={LINKED_OUTLET_FORM_OPTIONS}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_HALF}>
                  <Form.Item name="permitNo" label="排污许可证编号">
                    <Input />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="runStatus" label="企业运行状态">
                    <Input />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="normalProdHours" label="正常生产时间(小时)">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_QUARTER}>
                  <Form.Item name="industrialOutput" label="工业总产值(千元)">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                {ynSelect('hasIndWastewater', '是否产生工业废水')}
                {ynSelect('hasBoilerTurbine', '是否有锅炉/燃气轮机')}
                {ynSelect('hasIndustrialKiln', '是否有工业炉窑')}
                {ynSelect('hasCoking', '是否有炼焦工序')}
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                {ynSelect('hasSinterPellet', '是否有烧结/球团工序')}
                {ynSelect('hasIronmaking', '是否有炼铁工序')}
                {ynSelect('hasSteelmaking', '是否有炼钢工序')}
                {ynSelect('hasClinker', '是否有熟料生产')}
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                {ynSelect('isPetrochemical', '是否为石化企业')}
                {ynSelect('hasOrganicTank', '有机液体储罐/装载')}
                {ynSelect('usesVocs', '使用含挥发性有机物')}
                {ynSelect('hasIndustrialSolidMaterial', '工业固体物料堆场')}
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                {ynSelect('hasOtherWasteGas', '其他生产废气')}
                {ynSelect('hasGeneralSolidWaste', '一般工业固体废物')}
              </Row>
            </Form>
          )}
        </Modal>
      </Card>
    </div>
  );
};
