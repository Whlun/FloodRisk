/**
 * 配置中心各子页：表单字段对齐 DB4401/T 138—2021、SL/T 809—2021（含 ATT_WAG / ATT_DKE / ATT_RES 等裁剪），具备增删查改（原型级）。水闸/圩区/堰坝/山塘/河流见 `config-center-hydro-extended.tsx`。
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Radio,
  Tag,
  Typography,
  Upload,
  message
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  PictureOutlined,
  PlusOutlined,
  SearchOutlined,
  TeamOutlined,
  UploadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  AddrWgs84MapPicker,
  AddrWgs84DetailMap,
  ADDR_MAP_FORM_ITEM_EXTRA,
  ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP,
  ADDR_MAP_INPUT_PLACEHOLDER,
  ADDR_MAP_POI_COORD_TOOLTIP,
} from '../shared/addrWgs84MapFormBridge';
import {
  ADM_DEP_OPTIONS,
  DIKE_ENG_TASK_OPTIONS,
  DIKE_PATT_OPTIONS,
  DIKE_TYPE_OPTIONS,
  coerceDikePattToSingleCode,
  coerceEngTaskToSingleCode,
  ELEV_SYS_OPTIONS,
  ENG_GRAD_OPTIONS,
  ENG_SCAL_OPTIONS,
  ENG_STAT_OPTIONS,
  RES_TYPE_OPTIONS,
  DKE_GRAD_OPTIONS,
  hydroInitial,
  leveeInitial,
  rsInitial,
  RS_COVER_AREA_OPTIONS,
  RS_SERVICE_TYPE_OPTIONS,
  parkInitial,
  FACILITY_SEWAGE_OPTIONS,
  PARK_LINKED_ENTERPRISE_OPTIONS,
  SHAOSHAN_PARK_ADDV_OPTIONS,
  getParkFunctionalZonePalette,
  unitInitial,
  type HydroRecord,
  type SluiceRecord,
  type LeveeRecord,
  type RsRecord,
  type ParkRecord,
  type UnitRecord,
  type FacilitySewageOption,
  type ParkLinkedEnterpriseOption
} from './config-center-data';
import { ParkFunctionalZonesEditorTrigger, ParkFunctionalZonesMapInput, validateParkFunctionalZones } from './park-functional-zones-map';
import {
  ConfigCenterDetailTabs,
  configCenterDetailNum,
  configCenterDetailText,
  configCenterOptLabel,
  configCenterOptLabelNum
} from './config-center-detail-eco';
import {
  ColumnManager,
  getDefaultVisibleColumnKeys,
  buildTableColumnsFromConfig,
  type ColumnConfig
} from './config-center-column-manager';
import { DetailTabsIfMultiple } from '../shared/detailTabsIfMultiple';
import { downloadTableFullExcel, exportOptLabel } from '../shared/facilityTableXlsxExport';

const { Text, Title } = Typography;

/** 配置中心列表：与水利扩展页一致的导出提示与全量列 Excel */
function runConfigTableExport(
  rows: Record<string, unknown>[],
  cols: ColumnConfig[],
  filePrefix: string,
  sheet: string,
  formatByKey?: Record<string, (raw: unknown) => string | number>,
) {
  if (!rows.length) {
    message.warning('当前筛选条件下无数据可导出');
    return;
  }
  downloadTableFullExcel(rows, cols, filePrefix, sheet, { formatByKey });
  message.success('已导出 Excel（全量字段）');
}

const genId = (prefix: string) => `${prefix}-${Date.now()}`;

function parkFacilityTags(ids: string[] | undefined) {
  const list = (ids || []).map(id => FACILITY_SEWAGE_OPTIONS.find(f => f.id === id)).filter(Boolean);
  if (!list.length) return <Text type="secondary">—</Text>;
  return (
    <Space size={[4, 4]} wrap>
      {list.map(f => (
        <Tag key={f!.id} color="blue">
          {f!.name}
        </Tag>
      ))}
    </Space>
  );
}

function parkEnterpriseTags(ids: string[] | undefined) {
  const list = (ids || []).map(id => PARK_LINKED_ENTERPRISE_OPTIONS.find(e => e.id === id)).filter(Boolean);
  if (!list.length) return <Text type="secondary">—</Text>;
  return (
    <Space size={[4, 4]} wrap>
      {list.map(e => (
        <Tag key={e!.id} color="green">
          {e!.name}
        </Tag>
      ))}
    </Space>
  );
}

/** 配置中心筛选：小屏整行，≥sm 时控件固定 200px，查询按钮随内容宽 */
const CFG_FILTER_COL_FIELD = { xs: { flex: '1 1 100%' }, sm: { flex: '0 0 200px' } };
const CFG_FILTER_COL_QUERY = { xs: { flex: '1 1 100%' }, sm: { flex: 'none' } };

/** 新增/编辑/详情弹窗：与韶山水环境设施管理系统 `formModalStyles` 一致（内容区可纵向滚动、禁止横向溢出）；报表中心与配置中心共用 */
export const formModalStyles = {
  body: {
    maxHeight: 'calc(100vh - 240px)',
    overflowY: 'auto' as const,
    overflowX: 'hidden' as const,
    minWidth: 0,
  },
};

/** 外层 wrap 类名，与 `style.css` 中脚部分隔、内容区内边距等规则对应（对齐设施管理表单弹窗） */
export const CONFIG_CENTER_MODAL_WRAP_CLASS = 'facility-crud-modal-wrap';

/** 弹窗内表单 Row 栅格间距（与设施管理管点等表单 gutter=16 一致） */
const CFG_FORM_GUTTER: [number, number] = [16, 16];
/** 弹窗表单字段：窄屏整行，≥sm 双列 */
const CFG_FORM_COL_HALF = { xs: 24 as const, sm: 12 as const };
/** 水利工程等长表单：sm 双列，lg 起三列 */
const CFG_FORM_COL_THIRD = { xs: 24 as const, sm: 12 as const, lg: 8 as const };
const CFG_FORM_COL_FULL = { xs: 24 as const, sm: 24 as const };

const HYDRO_RESERVOIR_COLUMN_DEFS: ColumnConfig[] = [
  { key: 'resCode', title: '水库代码', dataIndex: 'resCode', width: 180, defaultVisible: true },
  { key: 'resName', title: '水库名称', dataIndex: 'resName', width: 140, defaultVisible: true },
  { key: 'resLoc', title: '所在位置', dataIndex: 'resLoc', defaultVisible: true },
  {
    key: 'resType',
    title: '水库类型',
    dataIndex: 'resType',
    width: 100,
    defaultVisible: true,
    render: v => RES_TYPE_OPTIONS.find(o => o.value === v)?.label ?? String(v ?? '')
  },
  {
    key: 'engGrad',
    title: '工程等别',
    dataIndex: 'engGrad',
    width: 90,
    defaultVisible: true,
    render: v => ENG_GRAD_OPTIONS.find(o => o.value === v)?.label ?? String(v ?? '')
  },
  {
    key: 'engScal',
    title: '工程规模',
    dataIndex: 'engScal',
    width: 100,
    defaultVisible: true,
    render: v => ENG_SCAL_OPTIONS.find(o => o.value === v)?.label ?? String(v ?? '')
  },
  { key: 'normWatLev', title: '正常蓄水位(m)', dataIndex: 'normWatLev', width: 110, defaultVisible: true },
  { key: 'totCap', title: '总库容(10⁴m³)', dataIndex: 'totCap', width: 110, defaultVisible: true },
  {
    key: 'engStat',
    title: '建设情况',
    dataIndex: 'engStat',
    width: 96,
    defaultVisible: true,
    render: v => ENG_STAT_OPTIONS.find(o => o.value === v)?.label ?? String(v ?? '')
  },
  {
    key: 'admDep',
    title: '归口部门',
    dataIndex: 'admDep',
    width: 108,
    defaultVisible: false,
    render: v => ADM_DEP_OPTIONS.find(o => o.value === v)?.label ?? String(v ?? '')
  },
  { key: 'watShedArea', title: '坝址流域面积(km²)', dataIndex: 'watShedArea', width: 130, defaultVisible: false },
  { key: 'operation', title: '操作', width: 168, fixed: 'right', defaultVisible: true }
];

const HYDRO_RES_EXPORT_FMT: Record<string, (raw: unknown) => string | number> = {
  resType: v => exportOptLabel(RES_TYPE_OPTIONS, v),
  engGrad: v => exportOptLabel(ENG_GRAD_OPTIONS, v),
  engScal: v => exportOptLabel(ENG_SCAL_OPTIONS, v),
  engStat: v => exportOptLabel(ENG_STAT_OPTIONS, v),
  admDep: v => exportOptLabel(ADM_DEP_OPTIONS, v),
};

const HYDRO_LEVEE_COLUMN_DEFS: ColumnConfig[] = [
  { key: 'dkeCode', title: '堤防代码', dataIndex: 'dkeCode', width: 180, defaultVisible: true },
  { key: 'dkeName', title: '堤防名称', dataIndex: 'dkeName', width: 160, defaultVisible: true },
  { key: 'dkeLoc', title: '所在位置', dataIndex: 'dkeLoc', defaultVisible: true },
  {
    key: 'dkeGrad',
    title: '级别',
    dataIndex: 'dkeGrad',
    width: 100,
    defaultVisible: true,
    render: v => DKE_GRAD_OPTIONS.find(o => o.value === v)?.label ?? String(v ?? '')
  },
  {
    key: 'dikeType',
    title: '堤防类型',
    dataIndex: 'dikeType',
    width: 120,
    defaultVisible: true,
    render: v => DIKE_TYPE_OPTIONS.find(o => o.value === v)?.label ?? String(v ?? '')
  },
  { key: 'dkeLen', title: '堤长(m)', dataIndex: 'dkeLen', width: 96, defaultVisible: true },
  { key: 'topWidth', title: '堤顶宽(m)', dataIndex: 'topWidth', width: 90, defaultVisible: true },
  { key: 'defSta', title: '防洪标准', dataIndex: 'defSta', width: 110, defaultVisible: true },
  {
    key: 'engStat',
    title: '建设情况',
    dataIndex: 'engStat',
    width: 96,
    defaultVisible: false,
    render: v => ENG_STAT_OPTIONS.find(o => o.value === v)?.label ?? String(v ?? '')
  },
  { key: 'compDate', title: '建成时间', dataIndex: 'compDate', width: 110, defaultVisible: true },
  { key: 'operation', title: '操作', width: 168, fixed: 'right', defaultVisible: true }
];

const HYDRO_LEVEE_EXPORT_FMT: Record<string, (raw: unknown) => string | number> = {
  dkeGrad: v => exportOptLabel(DKE_GRAD_OPTIONS, v),
  dikeType: v => exportOptLabel(DIKE_TYPE_OPTIONS, v),
  engStat: v => exportOptLabel(ENG_STAT_OPTIONS, v),
};

// ==================== 水利工程·水库（SL/T 809 ATT_RES_BASE） ====================

export const ConfigHydroReservoirView: React.FC = () => {
  const [data, setData] = useState<HydroRecord[]>(() => [...hydroInitial]);
  const [q, setQ] = useState<{
    resCode: string;
    resName: string;
    resLoc: string;
    resType: string | undefined;
    engGrad: string | undefined;
    engScal: string | undefined;
    engStat: string | undefined;
    admDep: string | undefined;
  }>({
    resCode: '',
    resName: '',
    resLoc: '',
    resType: undefined,
    engGrad: undefined,
    engScal: undefined,
    engStat: undefined,
    admDep: undefined
  });
  const [modal, setModal] = useState<{ open: boolean; mode: 'create' | 'edit' | 'detail'; record?: HydroRecord }>({
    open: false,
    mode: 'create'
  });
  const [form] = Form.useForm<HydroRecord>();
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  useEffect(() => {
    setVisibleColumns(getDefaultVisibleColumnKeys(HYDRO_RESERVOIR_COLUMN_DEFS));
  }, []);

  const closeModal = () => {
    setModal({ open: false, mode: 'create' });
    form.resetFields();
  };

  const filtered = useMemo(() => {
    return data.filter(r => {
      const rc = q.resCode.trim();
      const rn = q.resName.trim();
      const rl = q.resLoc.trim();
      if (rc && !r.resCode.includes(rc)) return false;
      if (rn && !r.resName.includes(rn)) return false;
      if (rl && !r.resLoc.includes(rl)) return false;
      if (q.resType && r.resType !== q.resType) return false;
      if (q.engGrad && r.engGrad !== q.engGrad) return false;
      if (q.engScal && r.engScal !== q.engScal) return false;
      if (q.engStat && r.engStat !== q.engStat) return false;
      if (q.admDep && r.admDep !== q.admDep) return false;
      return true;
    });
  }, [data, q]);

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({
      resType: '1',
      engGrad: '3',
      engScal: '3',
      poiLong: null,
      poiLat: null,
      lowLeftLong: null,
      lowLeftLat: null,
      upRightLong: null,
      upRightLat: null,
      watShedArea: null,
      uppLevFlco: null,
      normWatLev: null,
      normPoolStagArea: null,
      normPoolStagCap: null,
      flLowLimLev: null,
      flLowLimLevCap: null,
      deadLev: null,
      totCap: null,
      benResCap: null,
      deadCap: null,
      storFlCap: null,
      flcoCap: null,
      engStat: '1',
      admDep: '1',
      startDate: '',
      compDate: '',
      note: ''
    });
    setModal({ open: true, mode: 'create' });
  };

  const openDetail = (record: HydroRecord) => {
    form.setFieldsValue(record);
    setModal({ open: true, mode: 'detail', record });
  };

  const openEdit = (record: HydroRecord) => {
    form.setFieldsValue(record);
    setModal({ open: true, mode: 'edit', record });
  };

  const handleDeleteHydro = () => {
    if (modal.record) {
      setData(data.filter(d => d.id !== modal.record!.id));
      message.success('已删除（原型）');
      closeModal();
    }
  };

  const submit = async () => {
    const v = await form.validateFields();
    if (modal.mode === 'create') {
      setData([...data, { ...v, id: genId('RES') }]);
      message.success('已新增水库对象（原型）');
    } else if (modal.mode === 'edit' && modal.record) {
      setData(data.map(d => (d.id === modal.record!.id ? { ...d, ...v } : d)));
      message.success('已保存（原型）');
    }
    closeModal();
  };

  const tableColumns = useMemo(
    () =>
      buildTableColumnsFromConfig<HydroRecord>(HYDRO_RESERVOIR_COLUMN_DEFS, visibleColumns, record => (
        <Space size={4} wrap={false} className="system-mgmt-table-op">
          <Button type="link" className="action-btn detail" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>
            详情
          </Button>
          <Button type="link" className="action-btn edit" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
            编辑
          </Button>
        </Space>
      )),
    [visibleColumns]
  );

  return (
    <div className="facility-view">
      <Card
      title="水利工程信息（水库）"
      extra={
        <Space wrap size={[8, 8]} align="center">
          <Button
            icon={<DownloadOutlined />}
            className="export-btn"
            onClick={() =>
              runConfigTableExport(
                filtered as unknown as Record<string, unknown>[],
                HYDRO_RESERVOIR_COLUMN_DEFS,
                '配置中心_水利工程_水库',
                '水库',
                HYDRO_RES_EXPORT_FMT,
              )
            }
          >
            导出Excel
          </Button>
          <Upload beforeUpload={() => { message.success('已导入（原型）'); return false; }} showUploadList={false}>
            <Button icon={<UploadOutlined />}>导入</Button>
          </Upload>
          <ColumnManager columns={HYDRO_RESERVOIR_COLUMN_DEFS} visibleColumns={visibleColumns} onChange={setVisibleColumns} />
          <Button type="primary" className="add-btn" icon={<PlusOutlined />} onClick={openCreate}>
            新增
          </Button>
        </Space>
      }
    >
      <div className="filter-bar config-center-filter-bar">
        <Row className="config-center-filter-row" gutter={[12, 12]} align="bottom">
          <Col {...CFG_FILTER_COL_FIELD}>
            <Input placeholder="水库代码" value={q.resCode} onChange={e => setQ({ ...q, resCode: e.target.value })} allowClear />
          </Col>
          <Col {...CFG_FILTER_COL_FIELD}>
            <Input placeholder="水库名称" value={q.resName} onChange={e => setQ({ ...q, resName: e.target.value })} allowClear />
          </Col>
          <Col {...CFG_FILTER_COL_FIELD}>
            <Input placeholder="所在位置" value={q.resLoc} onChange={e => setQ({ ...q, resLoc: e.target.value })} allowClear />
          </Col>
          <Col {...CFG_FILTER_COL_FIELD}>
            <Select
              placeholder="水库类型"
              allowClear
              style={{ width: '100%' }}
              options={RES_TYPE_OPTIONS}
              value={q.resType}
              onChange={v => setQ({ ...q, resType: v })}
            />
          </Col>
        </Row>
        <Row className="config-center-filter-row" gutter={[12, 12]} align="bottom" style={{ marginTop: 4 }}>
          <Col {...CFG_FILTER_COL_FIELD}>
            <Select
              placeholder="工程等别"
              allowClear
              style={{ width: '100%' }}
              options={ENG_GRAD_OPTIONS}
              value={q.engGrad}
              onChange={v => setQ({ ...q, engGrad: v })}
            />
          </Col>
          <Col {...CFG_FILTER_COL_FIELD}>
            <Select
              placeholder="工程规模"
              allowClear
              style={{ width: '100%' }}
              options={ENG_SCAL_OPTIONS}
              value={q.engScal}
              onChange={v => setQ({ ...q, engScal: v })}
            />
          </Col>
          <Col {...CFG_FILTER_COL_FIELD}>
            <Select
              placeholder="建设情况"
              allowClear
              style={{ width: '100%' }}
              options={ENG_STAT_OPTIONS}
              value={q.engStat}
              onChange={v => setQ({ ...q, engStat: v })}
            />
          </Col>
          <Col {...CFG_FILTER_COL_FIELD}>
            <Select
              placeholder="归口部门"
              allowClear
              style={{ width: '100%' }}
              options={ADM_DEP_OPTIONS}
              value={q.admDep}
              onChange={v => setQ({ ...q, admDep: v })}
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
      <div className="facility-table-wrap">
        <Table
          size="small"
          rowKey="id"
          scroll={{ x: 'max-content' }}
          dataSource={filtered}
          columns={tableColumns}
          pagination={{ defaultPageSize: 10, showTotal: t => `共 ${t} 条` }}
        />
      </div>

      <Modal
        styles={formModalStyles}
        wrapClassName={CONFIG_CENTER_MODAL_WRAP_CLASS}
        title={modal.mode === 'create' ? '新增水库' : modal.mode === 'detail' ? '水库详情' : '编辑水库'}
        open={modal.open}
        onCancel={closeModal}
        width={1000}
        destroyOnClose
        footer={
          modal.mode === 'detail' ? null : (
            <Space>
              {modal.mode === 'edit' && (
                <Popconfirm title="确认删除该条记录？" onConfirm={handleDeleteHydro}>
                  <Button danger>删除</Button>
                </Popconfirm>
              )}
              <Button onClick={closeModal}>取消</Button>
              <Button type="primary" onClick={submit}>
                保存
              </Button>
            </Space>
          )
        }
      >
        {modal.mode === 'detail' && modal.record ? (
          <ConfigCenterDetailTabs>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="内部编号" span={2}>
                {configCenterDetailText(modal.record.id)}
              </Descriptions.Item>
              <Descriptions.Item label="水库代码">{configCenterDetailText(modal.record.resCode)}</Descriptions.Item>
              <Descriptions.Item label="水库名称">{configCenterDetailText(modal.record.resName)}</Descriptions.Item>
              <Descriptions.Item label="水库所在位置" span={2}>
                {configCenterDetailText(modal.record.resLoc)}
              </Descriptions.Item>
              <Descriptions.Item label="地图经度（POI）">{configCenterDetailNum(modal.record.poiLong, '°', { digits: 6 })}</Descriptions.Item>
              <Descriptions.Item label="地图纬度（POI）">{configCenterDetailNum(modal.record.poiLat, '°', { digits: 6 })}</Descriptions.Item>
              <Descriptions.Item label="所在位置地图（POI）" span={2}>
                <AddrWgs84DetailMap
                  title={String(modal.record.resName ?? '水库')}
                  location={modal.record.resLoc}
                  lng={modal.record.poiLong}
                  lat={modal.record.poiLat}
                  mapAriaLabel="水库位置地图"
                />
              </Descriptions.Item>
              <Descriptions.Item label="左下角经度">{configCenterDetailNum(modal.record.lowLeftLong, '°', { digits: 6 })}</Descriptions.Item>
              <Descriptions.Item label="左下角纬度">{configCenterDetailNum(modal.record.lowLeftLat, '°', { digits: 6 })}</Descriptions.Item>
              <Descriptions.Item label="右上角经度">{configCenterDetailNum(modal.record.upRightLong, '°', { digits: 6 })}</Descriptions.Item>
              <Descriptions.Item label="右上角纬度">{configCenterDetailNum(modal.record.upRightLat, '°', { digits: 6 })}</Descriptions.Item>
              <Descriptions.Item label="工程规模">{configCenterOptLabel(ENG_SCAL_OPTIONS, modal.record.engScal)}</Descriptions.Item>
              <Descriptions.Item label="坝址控制流域面积（km²）">{configCenterDetailNum(modal.record.watShedArea)}</Descriptions.Item>
              <Descriptions.Item label="防洪高水位（m）">{configCenterDetailNum(modal.record.uppLevFlco)}</Descriptions.Item>
              <Descriptions.Item label="正常蓄水位（m）">{configCenterDetailNum(modal.record.normWatLev)}</Descriptions.Item>
              <Descriptions.Item label="正常蓄水位相应水面面积（km²）">{configCenterDetailNum(modal.record.normPoolStagArea)}</Descriptions.Item>
              <Descriptions.Item label="正常蓄水位相应库容（10⁴m³）">{configCenterDetailNum(modal.record.normPoolStagCap)}</Descriptions.Item>
              <Descriptions.Item label="主汛期防洪限制水位（m）">{configCenterDetailNum(modal.record.flLowLimLev)}</Descriptions.Item>
              <Descriptions.Item label="防洪限制水位库容（10⁴m³）">{configCenterDetailNum(modal.record.flLowLimLevCap)}</Descriptions.Item>
              <Descriptions.Item label="死水位（m）">{configCenterDetailNum(modal.record.deadLev)}</Descriptions.Item>
              <Descriptions.Item label="总库容（10⁴m³）">{configCenterDetailNum(modal.record.totCap)}</Descriptions.Item>
              <Descriptions.Item label="兴利库容（10⁴m³）">{configCenterDetailNum(modal.record.benResCap)}</Descriptions.Item>
              <Descriptions.Item label="死库容（10⁴m³）">{configCenterDetailNum(modal.record.deadCap)}</Descriptions.Item>
              <Descriptions.Item label="调洪库容（10⁴m³）">{configCenterDetailNum(modal.record.storFlCap)}</Descriptions.Item>
              <Descriptions.Item label="防洪库容（10⁴m³）">{configCenterDetailNum(modal.record.flcoCap)}</Descriptions.Item>
              <Descriptions.Item label="工程建设情况">{configCenterOptLabel(ENG_STAT_OPTIONS, modal.record.engStat)}</Descriptions.Item>
              <Descriptions.Item label="归口管理部门">{configCenterOptLabel(ADM_DEP_OPTIONS, modal.record.admDep)}</Descriptions.Item>
              <Descriptions.Item label="开工时间">{configCenterDetailText(modal.record.startDate)}</Descriptions.Item>
              <Descriptions.Item label="建成时间">{configCenterDetailText(modal.record.compDate)}</Descriptions.Item>
              <Descriptions.Item label="水库类型">{configCenterOptLabel(RES_TYPE_OPTIONS, modal.record.resType)}</Descriptions.Item>
              <Descriptions.Item label="工程等别">{configCenterOptLabel(ENG_GRAD_OPTIONS, modal.record.engGrad)}</Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>
                {configCenterDetailText(modal.record.note)}
              </Descriptions.Item>
            </Descriptions>
          </ConfigCenterDetailTabs>
        ) : (
          <Form form={form} layout="vertical" className="config-center-modal-form">
            {modal.mode === 'edit' && (
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_FULL}>
                  <Form.Item name="id" label="内部编号">
                    <Input disabled />
                  </Form.Item>
                </Col>
              </Row>
            )}
            <Title level={5}>基础信息</Title>
            <Row gutter={CFG_FORM_GUTTER}>
              <Col {...CFG_FORM_COL_THIRD}>
                <Form.Item label="水库代码" name="resCode" rules={[{ required: true }]}>
                  <Input maxLength={18} placeholder="对象代码" />
                </Form.Item>
              </Col>
              <Col {...CFG_FORM_COL_THIRD}>
                <Form.Item label="水库名称" name="resName" rules={[{ required: true }]}>
                  <Input maxLength={100} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={CFG_FORM_GUTTER}>
              <Col {...CFG_FORM_COL_FULL}>
                <Form.Item label="水库所在位置" name="resLoc" rules={[{ required: true }]} extra={ADDR_MAP_FORM_ITEM_EXTRA}>
                  <Input.TextArea rows={1} maxLength={256} placeholder={ADDR_MAP_INPUT_PLACEHOLDER} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={CFG_FORM_GUTTER}>
              <Col {...CFG_FORM_COL_FULL}>
                <Form.Item label="水库位置地图（POI）" colon={false}>
                  <AddrWgs84MapPicker
                    form={form}
                    addrField="resLoc"
                    lngField="poiLong"
                    latField="poiLat"
                    mapAriaLabel="水库位置地图"
                    hintAddressLabel="水库所在位置"
                    lngLatValueMode="number"
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={CFG_FORM_GUTTER}>
              <Col {...CFG_FORM_COL_THIRD}>
                <Form.Item label="地图经度（POI）" name="poiLong" tooltip={ADDR_MAP_POI_COORD_TOOLTIP}>
                  <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
                </Form.Item>
              </Col>
              <Col {...CFG_FORM_COL_THIRD}>
                <Form.Item label="地图纬度（POI）" name="poiLat" tooltip={ADDR_MAP_POI_COORD_TOOLTIP}>
                  <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={CFG_FORM_GUTTER}>
              <Col {...CFG_FORM_COL_THIRD}>
                <Form.Item label="左下角经度" name="lowLeftLong" tooltip={ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP}>
                  <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
                </Form.Item>
              </Col>
              <Col {...CFG_FORM_COL_THIRD}>
                <Form.Item label="左下角纬度" name="lowLeftLat" tooltip={ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP}>
                  <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={CFG_FORM_GUTTER}>
              <Col {...CFG_FORM_COL_THIRD}>
                <Form.Item label="右上角经度" name="upRightLong" tooltip={ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP}>
                  <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
                </Form.Item>
              </Col>
              <Col {...CFG_FORM_COL_THIRD}>
                <Form.Item label="右上角纬度" name="upRightLat" tooltip={ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP}>
                  <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={CFG_FORM_GUTTER}>
              <Col {...CFG_FORM_COL_THIRD}>
                <Form.Item label="工程规模" name="engScal" rules={[{ required: true }]}>
                  <Select options={ENG_SCAL_OPTIONS} />
                </Form.Item>
              </Col>
              <Col {...CFG_FORM_COL_THIRD}>
                <Form.Item label="坝址控制流域面积（km²）" name="watShedArea">
                  <InputNumber style={{ width: '100%' }} min={0} step={0.001} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={CFG_FORM_GUTTER}>
              <Col {...CFG_FORM_COL_THIRD}>
                <Form.Item label="防洪高水位（m）" name="uppLevFlco">
                  <InputNumber style={{ width: '100%' }} step={0.001} />
                </Form.Item>
              </Col>
              <Col {...CFG_FORM_COL_THIRD}>
                <Form.Item label="正常蓄水位（m）" name="normWatLev">
                  <InputNumber style={{ width: '100%' }} step={0.001} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={CFG_FORM_GUTTER}>
              <Col {...CFG_FORM_COL_THIRD}>
                <Form.Item label="正常蓄水位相应水面面积（km²）" name="normPoolStagArea">
                  <InputNumber style={{ width: '100%' }} min={0} step={0.001} />
                </Form.Item>
              </Col>
              <Col {...CFG_FORM_COL_THIRD}>
                <Form.Item label="正常蓄水位相应库容（10⁴m³）" name="normPoolStagCap">
                  <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={CFG_FORM_GUTTER}>
              <Col {...CFG_FORM_COL_THIRD}>
                <Form.Item label="主汛期防洪限制水位（m）" name="flLowLimLev">
                  <InputNumber style={{ width: '100%' }} step={0.001} />
                </Form.Item>
              </Col>
              <Col {...CFG_FORM_COL_THIRD}>
                <Form.Item label="防洪限制水位库容（10⁴m³）" name="flLowLimLevCap">
                  <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={CFG_FORM_GUTTER}>
              <Col {...CFG_FORM_COL_THIRD}>
                <Form.Item label="死水位（m）" name="deadLev">
                  <InputNumber style={{ width: '100%' }} step={0.001} />
                </Form.Item>
              </Col>
              <Col {...CFG_FORM_COL_THIRD}>
                <Form.Item label="总库容（10⁴m³）" name="totCap">
                  <InputNumber style={{ width: '100%' }} step={0.01} min={0} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={CFG_FORM_GUTTER}>
              <Col {...CFG_FORM_COL_THIRD}>
                <Form.Item label="兴利库容（10⁴m³）" name="benResCap">
                  <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                </Form.Item>
              </Col>
              <Col {...CFG_FORM_COL_THIRD}>
                <Form.Item label="死库容（10⁴m³）" name="deadCap">
                  <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={CFG_FORM_GUTTER}>
              <Col {...CFG_FORM_COL_THIRD}>
                <Form.Item label="调洪库容（10⁴m³）" name="storFlCap">
                  <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                </Form.Item>
              </Col>
              <Col {...CFG_FORM_COL_THIRD}>
                <Form.Item label="防洪库容（10⁴m³）" name="flcoCap">
                  <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={CFG_FORM_GUTTER}>
              <Col {...CFG_FORM_COL_THIRD}>
                <Form.Item label="工程建设情况" name="engStat">
                  <Select options={ENG_STAT_OPTIONS} allowClear />
                </Form.Item>
              </Col>
              <Col {...CFG_FORM_COL_THIRD}>
                <Form.Item label="归口管理部门" name="admDep">
                  <Select options={ADM_DEP_OPTIONS} allowClear />
                </Form.Item>
              </Col>
            </Row>
            <Divider style={{ margin: '16px 0' }} />
            <Title level={5}>建设管理</Title>
            <Row gutter={CFG_FORM_GUTTER}>
              <Col {...CFG_FORM_COL_THIRD}>
                <Form.Item label="开工时间" name="startDate">
                  <Input placeholder="YYYY-MM-DD" />
                </Form.Item>
              </Col>
              <Col {...CFG_FORM_COL_THIRD}>
                <Form.Item label="建成时间" name="compDate">
                  <Input placeholder="YYYY-MM-DD" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={CFG_FORM_GUTTER}>
              <Col {...CFG_FORM_COL_THIRD}>
                <Form.Item label="水库类型" name="resType" rules={[{ required: true }]}>
                  <Select options={RES_TYPE_OPTIONS} />
                </Form.Item>
              </Col>
              <Col {...CFG_FORM_COL_THIRD}>
                <Form.Item label="工程等别" name="engGrad" rules={[{ required: true }]}>
                  <Select options={ENG_GRAD_OPTIONS} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={CFG_FORM_GUTTER}>
              <Col {...CFG_FORM_COL_FULL}>
                <Form.Item label="备注" name="note">
                  <Input.TextArea rows={1} maxLength={256} />
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

// ==================== 水利工程·堤防（SL/T 809 ATT_DKE_BASE） ====================

export const ConfigHydroLeveeView: React.FC = () => {
  const [data, setData] = useState<LeveeRecord[]>(() => [...leveeInitial]);
  const [q, setQ] = useState<{
    dkeCode: string;
    dkeName: string;
    dkeLoc: string;
    dkeGrad: string | undefined;
    dikeType: string | undefined;
    engStat: string | undefined;
    defSta: string;
  }>({
    dkeCode: '',
    dkeName: '',
    dkeLoc: '',
    dkeGrad: undefined,
    dikeType: undefined,
    engStat: undefined,
    defSta: ''
  });
  const [modal, setModal] = useState<{ open: boolean; mode: 'create' | 'edit' | 'detail'; record?: LeveeRecord }>({
    open: false,
    mode: 'create'
  });
  const [form] = Form.useForm<LeveeRecord>();
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  useEffect(() => {
    setVisibleColumns(getDefaultVisibleColumnKeys(HYDRO_LEVEE_COLUMN_DEFS));
  }, []);

  const closeModal = () => {
    setModal({ open: false, mode: 'create' });
    form.resetFields();
  };

  const filtered = useMemo(
    () =>
      data.filter(r => {
        const c = q.dkeCode.trim();
        const n = q.dkeName.trim();
        const loc = q.dkeLoc.trim();
        const ds = q.defSta.trim();
        if (c && !r.dkeCode.includes(c)) return false;
        if (n && !r.dkeName.includes(n)) return false;
        if (loc && !r.dkeLoc.includes(loc)) return false;
        if (ds && !String(r.defSta ?? '').includes(ds)) return false;
        if (q.dkeGrad && r.dkeGrad !== q.dkeGrad) return false;
        if (q.dikeType && r.dikeType !== q.dikeType) return false;
        if (q.engStat && r.engStat !== q.engStat) return false;
        return true;
      }),
    [data, q]
  );

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({
      dkeGrad: '4',
      poiLong: null,
      poiLat: null,
      startLong: null,
      startLat: null,
      endLong: null,
      endLat: null,
      startLoc: '',
      endLoc: '',
      dikeType: '1',
      dikePatt: '1',
      dkeLen: null,
      dikeStartNum: '',
      dikeEndNum: '',
      elevSys: '02',
      startDikeTopEl: null,
      endDikeTopEl: null,
      dikeHeigMin: null,
      dikeHeigMax: null,
      dikeTopWidMin: null,
      dikeTopWidMax: null,
      engTask: '1',
      engStat: '1',
      admDep: '1',
      topWidth: null,
      defSta: '',
      startDate: '',
      compDate: '',
      note: ''
    });
    setModal({ open: true, mode: 'create' });
  };

  const openDetail = (record: LeveeRecord) => {
    form.setFieldsValue({
      ...record,
      dikePatt: coerceDikePattToSingleCode(record.dikePatt),
      engTask: coerceEngTaskToSingleCode(record.engTask),
    });
    setModal({ open: true, mode: 'detail', record });
  };

  const openEdit = (record: LeveeRecord) => {
    form.setFieldsValue({
      ...record,
      dikePatt: coerceDikePattToSingleCode(record.dikePatt),
      engTask: coerceEngTaskToSingleCode(record.engTask),
    });
    setModal({ open: true, mode: 'edit', record });
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
    const payload = {
      ...v,
      dikePatt: coerceDikePattToSingleCode(v.dikePatt),
      engTask: coerceEngTaskToSingleCode(v.engTask),
    };
    if (modal.mode === 'create') {
      setData([...data, { ...payload, id: genId('DKE') }]);
      message.success('已新增堤防对象（原型）');
    } else if (modal.mode === 'edit' && modal.record) {
      setData(data.map(d => (d.id === modal.record!.id ? { ...d, ...payload } : d)));
      message.success('已保存（原型）');
    }
    closeModal();
  };

  const tableColumns = useMemo(
    () =>
      buildTableColumnsFromConfig<LeveeRecord>(HYDRO_LEVEE_COLUMN_DEFS, visibleColumns, record => (
        <Space size={4} wrap={false} className="system-mgmt-table-op">
          <Button type="link" className="action-btn detail" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>
            详情
          </Button>
          <Button type="link" className="action-btn edit" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
            编辑
          </Button>
        </Space>
      )),
    [visibleColumns]
  );

  return (
    <div className="facility-view">
      <Card
        title="水利工程信息（堤防）"
        extra={
          <Space wrap size={[8, 8]} align="center">
            <Button
              icon={<DownloadOutlined />}
              className="export-btn"
              onClick={() =>
                runConfigTableExport(
                  filtered as unknown as Record<string, unknown>[],
                  HYDRO_LEVEE_COLUMN_DEFS,
                  '配置中心_水利工程_堤防',
                  '堤防',
                  HYDRO_LEVEE_EXPORT_FMT,
                )
              }
            >
              导出Excel
            </Button>
            <Upload beforeUpload={() => { message.success('已导入（原型）'); return false; }} showUploadList={false}>
              <Button icon={<UploadOutlined />}>导入</Button>
            </Upload>
            <ColumnManager columns={HYDRO_LEVEE_COLUMN_DEFS} visibleColumns={visibleColumns} onChange={setVisibleColumns} />
            <Button type="primary" className="add-btn" icon={<PlusOutlined />} onClick={openCreate}>
              新增
            </Button>
          </Space>
        }
      >
        <div className="filter-bar config-center-filter-bar">
          <Row className="config-center-filter-row" gutter={[12, 12]} align="bottom">
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input placeholder="堤防代码" value={q.dkeCode} onChange={e => setQ({ ...q, dkeCode: e.target.value })} allowClear />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input placeholder="堤防名称" value={q.dkeName} onChange={e => setQ({ ...q, dkeName: e.target.value })} allowClear />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input placeholder="所在位置" value={q.dkeLoc} onChange={e => setQ({ ...q, dkeLoc: e.target.value })} allowClear />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input placeholder="防洪标准" value={q.defSta} onChange={e => setQ({ ...q, defSta: e.target.value })} allowClear />
            </Col>
          </Row>
          <Row className="config-center-filter-row" gutter={[12, 12]} align="bottom" style={{ marginTop: 4 }}>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Select
                placeholder="级别"
                allowClear
                style={{ width: '100%' }}
                options={DKE_GRAD_OPTIONS}
                value={q.dkeGrad}
                onChange={v => setQ({ ...q, dkeGrad: v })}
              />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Select
                placeholder="堤防类型"
                allowClear
                style={{ width: '100%' }}
                options={DIKE_TYPE_OPTIONS}
                value={q.dikeType}
                onChange={v => setQ({ ...q, dikeType: v })}
              />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Select
                placeholder="建设情况"
                allowClear
                style={{ width: '100%' }}
                options={ENG_STAT_OPTIONS}
                value={q.engStat}
                onChange={v => setQ({ ...q, engStat: v })}
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
        <div className="facility-table-wrap">
          <Table
            size="small"
            rowKey="id"
            scroll={{ x: 'max-content' }}
            dataSource={filtered}
            columns={tableColumns}
            pagination={{ defaultPageSize: 10, showTotal: t => `共 ${t} 条` }}
          />
        </div>

        <Modal
          styles={formModalStyles}
          wrapClassName={CONFIG_CENTER_MODAL_WRAP_CLASS}
          title={modal.mode === 'create' ? '新增堤防' : modal.mode === 'detail' ? '堤防详情' : '编辑堤防'}
          open={modal.open}
          onCancel={closeModal}
          width={1000}
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
                  保存
                </Button>
              </Space>
            )
          }
        >
          {modal.mode === 'detail' && modal.record ? (
            <ConfigCenterDetailTabs>
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="内部编号" span={2}>
                  {configCenterDetailText(modal.record.id)}
                </Descriptions.Item>
                <Descriptions.Item label="堤防代码">{configCenterDetailText(modal.record.dkeCode)}</Descriptions.Item>
                <Descriptions.Item label="堤防名称">{configCenterDetailText(modal.record.dkeName)}</Descriptions.Item>
                <Descriptions.Item label="所在位置" span={2}>
                  {configCenterDetailText(modal.record.dkeLoc)}
                </Descriptions.Item>
                <Descriptions.Item label="地图经度（POI）">{configCenterDetailNum(modal.record.poiLong, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="地图纬度（POI）">{configCenterDetailNum(modal.record.poiLat, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="所在位置地图（POI）" span={2}>
                  <AddrWgs84DetailMap
                    title={String(modal.record.dkeName ?? '堤防')}
                    location={modal.record.dkeLoc}
                    lng={modal.record.poiLong}
                    lat={modal.record.poiLat}
                    mapAriaLabel="堤防位置地图"
                  />
                </Descriptions.Item>
                <Descriptions.Item label="起点经度">{configCenterDetailNum(modal.record.startLong, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="起点纬度">{configCenterDetailNum(modal.record.startLat, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="终点经度">{configCenterDetailNum(modal.record.endLong, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="终点纬度">{configCenterDetailNum(modal.record.endLat, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="起点位置" span={2}>
                  {configCenterDetailText(modal.record.startLoc)}
                </Descriptions.Item>
                <Descriptions.Item label="终点位置" span={2}>
                  {configCenterDetailText(modal.record.endLoc)}
                </Descriptions.Item>
                <Descriptions.Item label="堤防级别">{configCenterOptLabel(DKE_GRAD_OPTIONS, modal.record.dkeGrad)}</Descriptions.Item>
                <Descriptions.Item label="堤防类型">{configCenterOptLabel(DIKE_TYPE_OPTIONS, modal.record.dikeType)}</Descriptions.Item>
                <Descriptions.Item label="堤防型式">{configCenterDetailText(modal.record.dikePatt)}</Descriptions.Item>
                <Descriptions.Item label="堤长（m）">{configCenterDetailNum(modal.record.dkeLen)}</Descriptions.Item>
                <Descriptions.Item label="起点桩号">{configCenterDetailText(modal.record.dikeStartNum)}</Descriptions.Item>
                <Descriptions.Item label="终点桩号">{configCenterDetailText(modal.record.dikeEndNum)}</Descriptions.Item>
                <Descriptions.Item label="高程系统">{configCenterOptLabel(ELEV_SYS_OPTIONS, modal.record.elevSys)}</Descriptions.Item>
                <Descriptions.Item label="起点堤顶高程（m）">{configCenterDetailNum(modal.record.startDikeTopEl)}</Descriptions.Item>
                <Descriptions.Item label="终点堤顶高程（m）">{configCenterDetailNum(modal.record.endDikeTopEl)}</Descriptions.Item>
                <Descriptions.Item label="堤高最小（m）">{configCenterDetailNum(modal.record.dikeHeigMin)}</Descriptions.Item>
                <Descriptions.Item label="堤高最大（m）">{configCenterDetailNum(modal.record.dikeHeigMax)}</Descriptions.Item>
                <Descriptions.Item label="堤顶宽最小（m）">{configCenterDetailNum(modal.record.dikeTopWidMin)}</Descriptions.Item>
                <Descriptions.Item label="堤顶宽最大（m）">{configCenterDetailNum(modal.record.dikeTopWidMax)}</Descriptions.Item>
                <Descriptions.Item label="工程任务">{configCenterDetailText(modal.record.engTask)}</Descriptions.Item>
                <Descriptions.Item label="工程建设情况">{configCenterOptLabel(ENG_STAT_OPTIONS, modal.record.engStat)}</Descriptions.Item>
                <Descriptions.Item label="归口管理部门">{configCenterOptLabel(ADM_DEP_OPTIONS, modal.record.admDep)}</Descriptions.Item>
                <Descriptions.Item label="堤顶宽（原型平均，m）">{configCenterDetailNum(modal.record.topWidth)}</Descriptions.Item>
                <Descriptions.Item label="防洪（潮）标准">{configCenterDetailText(modal.record.defSta)}</Descriptions.Item>
                <Descriptions.Item label="开工时间">{configCenterDetailText(modal.record.startDate)}</Descriptions.Item>
                <Descriptions.Item label="建成时间">{configCenterDetailText(modal.record.compDate)}</Descriptions.Item>
                <Descriptions.Item label="备注" span={2}>
                  {configCenterDetailText(modal.record.note)}
                </Descriptions.Item>
              </Descriptions>
            </ConfigCenterDetailTabs>
          ) : (
            <Form form={form} layout="vertical" className="config-center-modal-form">
              {modal.mode === 'edit' && (
                <Row gutter={CFG_FORM_GUTTER}>
                  <Col {...CFG_FORM_COL_FULL}>
                    <Form.Item name="id" label="内部编号">
                      <Input disabled />
                    </Form.Item>
                  </Col>
                </Row>
              )}
              <Title level={5}>基础信息</Title>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="堤防代码" name="dkeCode" rules={[{ required: true }]}>
                    <Input maxLength={18} placeholder="DKE_CODE" />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="堤防名称" name="dkeName" rules={[{ required: true }]}>
                    <Input maxLength={100} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_FULL}>
                  <Form.Item label="所在位置" name="dkeLoc" rules={[{ required: true }]} extra={ADDR_MAP_FORM_ITEM_EXTRA}>
                    <Input.TextArea rows={1} maxLength={256} placeholder={ADDR_MAP_INPUT_PLACEHOLDER} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_FULL}>
                  <Form.Item label="堤防位置地图（POI）" colon={false}>
                    <AddrWgs84MapPicker
                      form={form}
                      addrField="dkeLoc"
                      lngField="poiLong"
                      latField="poiLat"
                      mapAriaLabel="堤防位置地图"
                      hintAddressLabel="所在位置"
                      lngLatValueMode="number"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="地图经度（POI）" name="poiLong" tooltip={ADDR_MAP_POI_COORD_TOOLTIP}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="地图纬度（POI）" name="poiLat" tooltip={ADDR_MAP_POI_COORD_TOOLTIP}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="起点经度" name="startLong" tooltip={ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="起点纬度" name="startLat" tooltip={ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="终点经度" name="endLong" tooltip={ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="终点纬度" name="endLat" tooltip={ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_FULL}>
                  <Form.Item label="起点位置" name="startLoc" rules={[{ required: true }]}>
                    <Input.TextArea rows={1} maxLength={256} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_FULL}>
                  <Form.Item label="终点位置" name="endLoc" rules={[{ required: true }]}>
                    <Input.TextArea rows={1} maxLength={256} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="堤防级别" name="dkeGrad" rules={[{ required: true }]}>
                    <Select options={DKE_GRAD_OPTIONS} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="堤防类型" name="dikeType" rules={[{ required: true }]}>
                    <Select options={DIKE_TYPE_OPTIONS} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="堤防型式" name="dikePatt" tooltip="SL/T 809 表64；单选">
                    <Select allowClear placeholder="请选择堤防型式" options={DIKE_PATT_OPTIONS} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="高程系统" name="elevSys" rules={[{ required: true }]}>
                    <Select options={ELEV_SYS_OPTIONS} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="堤长（m）" name="dkeLen">
                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="起点桩号" name="dikeStartNum">
                    <Input maxLength={32} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="终点桩号" name="dikeEndNum">
                    <Input maxLength={32} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="工程任务" name="engTask" tooltip="SL/T 809 表65；单选">
                    <Select allowClear placeholder="请选择工程任务" options={DIKE_ENG_TASK_OPTIONS} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="起点堤顶高程（m）" name="startDikeTopEl">
                    <InputNumber style={{ width: '100%' }} step={0.01} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="终点堤顶高程（m）" name="endDikeTopEl">
                    <InputNumber style={{ width: '100%' }} step={0.01} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="堤高最小（m）" name="dikeHeigMin">
                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="堤高最大（m）" name="dikeHeigMax">
                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="堤顶宽最小（m）" name="dikeTopWidMin">
                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="堤顶宽最大（m）" name="dikeTopWidMax">
                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="工程建设情况" name="engStat">
                    <Select options={ENG_STAT_OPTIONS} allowClear />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="归口管理部门" name="admDep">
                    <Select options={ADM_DEP_OPTIONS} allowClear />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="堤顶宽（原型平均，m）" name="topWidth">
                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="防洪（潮）标准" name="defSta">
                    <Input maxLength={64} placeholder="如：50 年一遇" />
                  </Form.Item>
                </Col>
              </Row>
              <Divider style={{ margin: '16px 0' }} />
              <Title level={5}>建设管理</Title>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="开工时间" name="startDate">
                    <Input placeholder="YYYY-MM-DD" />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="建成时间" name="compDate">
                    <Input placeholder="YYYY-MM-DD" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_FULL}>
                  <Form.Item label="备注" name="note">
                    <Input.TextArea rows={1} maxLength={256} />
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

// ==================== 遥感 ====================

const rsAllColumnDefs: ColumnConfig[] = [
  { key: 'code', title: '编码', dataIndex: 'code', width: 130, defaultVisible: true },
  {
    key: 'coverAreaNames',
    title: '覆盖区域名称',
    dataIndex: 'coverAreaNames',
    width: 220,
    defaultVisible: true,
    ellipsis: false,
    render: (_v, r) => {
      const names = (r.coverAreaNames as string[]) || [];
      if (!names.length) return <Text type="secondary">—</Text>;
      return (
        <Space size={[4, 4]} wrap>
          {names.map(a => (
            <Tag key={a}>{a}</Tag>
          ))}
        </Space>
      );
    }
  },
  { key: 'updatedAt', title: '更新时间', dataIndex: 'updatedAt', width: 158, defaultVisible: true },
  { key: 'rsServiceType', title: '遥感服务类型', dataIndex: 'rsServiceType', width: 128, defaultVisible: true },
  { key: 'serviceUrl', title: '服务地址', dataIndex: 'serviceUrl', width: 200, defaultVisible: true },
  { key: 'operation', title: '操作', width: 248, fixed: 'right' as const, defaultVisible: true }
];

const RS_EXPORT_FMT: Record<string, (raw: unknown) => string | number> = {
  coverAreaNames: v =>
    Array.isArray(v) && v.length ? (v as string[]).map(s => String(s).trim()).filter(Boolean).join('、') : '',
};

/** 打开编辑/详情前写入表单（时间与多选字段与控件类型对齐） */
function setRsFormFromRecord(form: ReturnType<typeof Form.useForm>[0], record: RsRecord) {
  form.setFieldsValue({
    ...record,
    updatedAt: dayjs(record.updatedAt)
  });
}

export const ConfigRsView: React.FC = () => {
  const [data, setData] = useState<RsRecord[]>(() => [...rsInitial]);
  const [q, setQ] = useState<{
    code: string;
    areaKw: string;
    serviceType: string | undefined;
    serviceUrlKw: string;
    updatedAtKw: string;
  }>({
    code: '',
    areaKw: '',
    serviceType: undefined,
    serviceUrlKw: '',
    updatedAtKw: ''
  });
  const [modal, setModal] = useState<{ open: boolean; mode: 'create' | 'edit' | 'detail'; record?: RsRecord }>({
    open: false,
    mode: 'create'
  });
  const [imageryRecord, setImageryRecord] = useState<RsRecord | null>(null);
  const [form] = Form.useForm();
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  useEffect(() => {
    setVisibleColumns(getDefaultVisibleColumnKeys(rsAllColumnDefs));
  }, []);

  const closeModal = () => {
    setModal({ open: false, mode: 'create' });
    form.resetFields();
  };

  const filtered = useMemo(() => {
    return data.filter(r => {
      if (q.code.trim() && !r.code.includes(q.code.trim())) return false;
      if (q.serviceType && r.rsServiceType !== q.serviceType) return false;
      if (q.areaKw.trim()) {
        const k = q.areaKw.trim();
        const hit = r.coverAreaNames.some(a => a.includes(k));
        if (!hit) return false;
      }
      if (q.serviceUrlKw.trim() && !r.serviceUrl.includes(q.serviceUrlKw.trim())) return false;
      if (q.updatedAtKw.trim() && !r.updatedAt.includes(q.updatedAtKw.trim())) return false;
      return true;
    });
  }, [data, q]);

  const tableColumns = useMemo(
    () =>
      buildTableColumnsFromConfig<RsRecord>(rsAllColumnDefs, visibleColumns, record => (
        <Space size={4} wrap={false} className="system-mgmt-table-op">
          <Button
            type="link"
            className="action-btn detail"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setRsFormFromRecord(form, record);
              setModal({ open: true, mode: 'detail', record });
            }}
          >
            详情
          </Button>
          <Button
            type="link"
            className="action-btn edit"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setRsFormFromRecord(form, record);
              setModal({ open: true, mode: 'edit', record });
            }}
          >
            编辑
          </Button>
          <Button
            type="link"
            className="action-btn"
            size="small"
            icon={<PictureOutlined />}
            onClick={() => setImageryRecord(record)}
          >
            遥感图
          </Button>
        </Space>
      )),
    [visibleColumns]
  );

  const handleDeleteRs = () => {
    if (modal.record) {
      setData(data.filter(d => d.id !== modal.record!.id));
      message.success('已删除（原型）');
      closeModal();
    }
  };

  const submit = async () => {
    const raw = await form.validateFields();
    const updatedAt = dayjs(raw.updatedAt as dayjs.Dayjs).format('YYYY-MM-DD HH:mm');
    const base: Omit<RsRecord, 'id'> = {
      code: raw.code as string,
      coverAreaNames: (raw.coverAreaNames as string[]) || [],
      updatedAt,
      rsServiceType: raw.rsServiceType as string,
      serviceUrl: raw.serviceUrl as string
    };
    if (modal.mode === 'create') {
      setData([...data, { ...base, id: genId('RS') }]);
      message.success('已新增（原型）');
    } else if (modal.mode === 'edit' && modal.record) {
      setData(data.map(d => (d.id === modal.record!.id ? { ...d, ...base } : d)));
      message.success('已保存（原型）');
    }
    closeModal();
  };

  return (
    <div className="facility-view">
      <Card
        title="遥感监测情况"
        extra={
          <Space wrap size={[8, 8]} align="center">
            <Button
              icon={<DownloadOutlined />}
              className="export-btn"
              onClick={() =>
                runConfigTableExport(
                  filtered as unknown as Record<string, unknown>[],
                  rsAllColumnDefs,
                  '配置中心_遥感监测',
                  '遥感监测',
                  RS_EXPORT_FMT,
                )
              }
            >
              导出Excel
            </Button>
            <Upload beforeUpload={() => { message.success('已导入（原型）'); return false; }} showUploadList={false}>
              <Button icon={<UploadOutlined />}>导入</Button>
            </Upload>
            <ColumnManager columns={rsAllColumnDefs} visibleColumns={visibleColumns} onChange={setVisibleColumns} />
            <Button
              type="primary"
              className="add-btn"
              icon={<PlusOutlined />}
              onClick={() => {
                form.resetFields();
                form.setFieldsValue({
                  coverAreaNames: [],
                  updatedAt: dayjs()
                });
                setModal({ open: true, mode: 'create' });
              }}
            >
              新增
            </Button>
          </Space>
        }
      >
        <div className="filter-bar config-center-filter-bar">
          <Row className="config-center-filter-row" gutter={[12, 12]} align="bottom">
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input placeholder="编码" value={q.code} onChange={e => setQ({ ...q, code: e.target.value })} allowClear />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Select
                placeholder="遥感服务类型"
                allowClear
                style={{ width: '100%' }}
                options={RS_SERVICE_TYPE_OPTIONS}
                value={q.serviceType}
                onChange={v => setQ({ ...q, serviceType: v })}
              />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input
                placeholder="覆盖区域名称"
                value={q.areaKw}
                onChange={e => setQ({ ...q, areaKw: e.target.value })}
                allowClear
              />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input
                placeholder="更新时间"
                value={q.updatedAtKw}
                onChange={e => setQ({ ...q, updatedAtKw: e.target.value })}
                allowClear
              />
            </Col>
          </Row>
          <Row className="config-center-filter-row" gutter={[12, 12]} align="bottom" style={{ marginTop: 4 }}>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input
                placeholder="服务地址"
                value={q.serviceUrlKw}
                onChange={e => setQ({ ...q, serviceUrlKw: e.target.value })}
                allowClear
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
        <div className="facility-table-wrap">
          <Table
            size="small"
            rowKey="id"
            dataSource={filtered}
            columns={tableColumns}
            scroll={{ x: 'max-content' }}
            pagination={{ defaultPageSize: 10, showTotal: t => `共 ${t} 条` }}
          />
        </div>

        <Modal
          styles={formModalStyles}
          wrapClassName={CONFIG_CENTER_MODAL_WRAP_CLASS}
          title={
            modal.mode === 'create'
              ? '新增遥感监测'
              : modal.mode === 'detail'
                ? '遥感监测详情'
                : '编辑遥感监测'
          }
          open={modal.open}
          onCancel={closeModal}
          width={720}
          destroyOnClose
          footer={
            modal.mode === 'detail' ? null : (
              <Space>
                {modal.mode === 'edit' && (
                  <Popconfirm title="确认删除该条记录？" onConfirm={handleDeleteRs}>
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
            <ConfigCenterDetailTabs>
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="编码">{configCenterDetailText(modal.record.code)}</Descriptions.Item>
                <Descriptions.Item label="遥感服务类型">{configCenterDetailText(modal.record.rsServiceType)}</Descriptions.Item>
                <Descriptions.Item label="更新时间">{configCenterDetailText(modal.record.updatedAt)}</Descriptions.Item>
                <Descriptions.Item label="覆盖区域名称" span={2}>
                  {modal.record.coverAreaNames?.length ? (
                    <Space size={[4, 4]} wrap>
                      {modal.record.coverAreaNames.map(a => (
                        <Tag key={a}>{a}</Tag>
                      ))}
                    </Space>
                  ) : (
                    configCenterDetailText('')
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="服务地址" span={2}>
                  {configCenterDetailText(modal.record.serviceUrl)}
                </Descriptions.Item>
              </Descriptions>
            </ConfigCenterDetailTabs>
          ) : (
            <Form form={form} layout="vertical" className="config-center-modal-form">
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_HALF}>
                  <Form.Item label="编码" name="code" rules={[{ required: true }]}>
                    <Input placeholder="业务编码" />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_HALF}>
                  <Form.Item label="遥感服务类型" name="rsServiceType" rules={[{ required: true }]}>
                    <Select placeholder="请选择" options={RS_SERVICE_TYPE_OPTIONS} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_HALF}>
                  <Form.Item label="更新时间" name="updatedAt" rules={[{ required: true }]}>
                    <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_FULL}>
                  <Form.Item label="覆盖区域名称" name="coverAreaNames" rules={[{ required: true, message: '请选择至少一个区域' }]}>
                    <Select mode="multiple" allowClear placeholder="可多选" options={RS_COVER_AREA_OPTIONS} maxTagCount="responsive" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_FULL}>
                  <Form.Item label="服务地址" name="serviceUrl" rules={[{ required: true }]}>
                    <Input placeholder="影像或切片、WMS 等服务 URL" />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          )}
        </Modal>

        <Modal
          title={imageryRecord ? `遥感影像 — ${imageryRecord.code}` : '遥感影像'}
          open={!!imageryRecord}
          onCancel={() => setImageryRecord(null)}
          footer={null}
          width={960}
          wrapClassName={CONFIG_CENTER_MODAL_WRAP_CLASS}
          styles={{ body: { maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' } }}
          destroyOnClose
        >
          {imageryRecord && (
            <div className="rs-imagery-preview">
              <div className="rs-imagery-map-placeholder">
                <PictureOutlined style={{ fontSize: 36, opacity: 0.9 }} />
                <div>遥感影像浏览区（原型示意，实际可对接下列服务地址加载图层）</div>
                <div className="rs-imagery-sub">
                  服务类型：<Tag color="blue">{imageryRecord.rsServiceType}</Tag>
                </div>
                <Typography.Paragraph copyable className="rs-imagery-url" style={{ marginBottom: 0 }}>
                  {imageryRecord.serviceUrl}
                </Typography.Paragraph>
              </div>
            </div>
          )}
        </Modal>
      </Card>
    </div>
  );
};

// ==================== 工业园区 ====================

/** 污水设施 / 关联企业：详情与勾选列表共用列定义 */
const PARK_SEWAGE_LINK_COLUMNS: ColumnsType<FacilitySewageOption> = [
  { title: '设施编号', dataIndex: 'id', width: 148, ellipsis: true },
  { title: '设施名称', dataIndex: 'name', ellipsis: true },
  { title: '设施类型', dataIndex: 'facilityType', width: 120 }
];

const PARK_ENTERPRISE_LINK_COLUMNS: ColumnsType<ParkLinkedEnterpriseOption> = [
  { title: '企业编号', dataIndex: 'id', width: 132, ellipsis: true },
  { title: '企业名称', dataIndex: 'name', ellipsis: true },
  { title: '行业', dataIndex: 'industry', width: 108 }
];

/** 下拉选项：与生态整治「河长责任区域 ·责任段」多选交互一致 */
const PARK_SEWAGE_SELECT_OPTIONS = FACILITY_SEWAGE_OPTIONS.map(f => ({
  value: f.id,
  label: `${f.name}（${f.facilityType}）`
}));

const PARK_ENTERPRISE_SELECT_OPTIONS = PARK_LINKED_ENTERPRISE_OPTIONS.map(e => ({
  value: e.id,
  label: `${e.name}（${e.industry}）`
}));

/** 工业园区弹窗：基本信息 / 污水设施 / 关联企业 三级 Tab 统一样式 */
const PARK_MODAL_TABS_CLASS = 'detail-tabs facility-detail-tabs park-config-modal-tabs';

/** 导出：与表格可读文案一致（设施/企业名称+类型或行业），并含备注与功能分区类型汇总 */
const PARK_EXPORT_COLUMN_DEFS: ColumnConfig[] = [
  { key: 'parkName', title: '园区名称', dataIndex: 'parkName' },
  { key: 'addvName', title: '所属区划', dataIndex: 'addvName' },
  { key: 'areaHa', title: '面积约(公顷)', dataIndex: 'areaHa' },
  { key: 'firms', title: '企业数', dataIndex: 'firms' },
  { key: 'linkedSewageFacilityIds', title: '污水设施配置', dataIndex: 'linkedSewageFacilityIds' },
  { key: 'linkedEnterpriseIds', title: '配置企业', dataIndex: 'linkedEnterpriseIds' },
  { key: 'functionalZones', title: '功能分区', dataIndex: 'functionalZones' },
  { key: 'note', title: '备注', dataIndex: 'note' },
];

function parkSewageIdsExcel(v: unknown): string {
  if (!Array.isArray(v) || !v.length) return '';
  return v
    .map(id => {
      const f = FACILITY_SEWAGE_OPTIONS.find(x => x.id === id);
      return f ? `${f.name}（${f.facilityType}）` : String(id);
    })
    .join('；');
}

function parkEnterpriseIdsExcel(v: unknown): string {
  if (!Array.isArray(v) || !v.length) return '';
  return v
    .map(id => {
      const e = PARK_LINKED_ENTERPRISE_OPTIONS.find(x => x.id === id);
      return e ? `${e.name}（${e.industry}）` : String(id);
    })
    .join('；');
}

function parkFunctionalZonesExcel(v: unknown): string {
  if (!Array.isArray(v) || !v.length) return '';
  return (v as { zoneType?: string }[]).map(z => z.zoneType).filter(Boolean).join('、');
}

const PARK_EXPORT_FMT: Record<string, (raw: unknown) => string | number> = {
  linkedSewageFacilityIds: parkSewageIdsExcel,
  linkedEnterpriseIds: parkEnterpriseIdsExcel,
  functionalZones: parkFunctionalZonesExcel,
};

export const ConfigParkView: React.FC = () => {
  const [data, setData] = useState<ParkRecord[]>(() => [...parkInitial]);
  const [q, setQ] = useState<{
    parkName: string;
    addvName: string;
    firmsKw: string;
    areaHaMin: number | null;
    areaHaMax: number | null;
  }>({ parkName: '', addvName: '', firmsKw: '', areaHaMin: null, areaHaMax: null });
  const [modal, setModal] = useState<{ open: boolean; mode: 'create' | 'edit' | 'detail'; record?: ParkRecord }>({
    open: false,
    mode: 'create'
  });
  const [form] = Form.useForm<ParkRecord>();

  const closeModal = () => {
    setModal({ open: false, mode: 'create' });
    form.resetFields();
  };

  const filtered = useMemo(() => {
    return data.filter(r => {
      const pn = q.parkName.trim();
      const fk = q.firmsKw.trim();
      if (pn && !r.parkName.includes(pn)) return false;
      if (q.addvName && r.addvName !== q.addvName) return false;
      if (fk && !String(r.firms).includes(fk)) return false;
      if (q.areaHaMin != null && r.areaHa < q.areaHaMin) return false;
      if (q.areaHaMax != null && r.areaHa > q.areaHaMax) return false;
      return true;
    });
  }, [data, q]);

  const columns: ColumnsType<ParkRecord> = [
    { title: '园区名称', dataIndex: 'parkName', width: 160 },
    { title: '所属区划', dataIndex: 'addvName', width: 220, ellipsis: true },
       { title: '面积约(公顷)', dataIndex: 'areaHa', width: 110 },
    { title: '企业数', dataIndex: 'firms', width: 80 },
    {
      title: '污水设施配置',
      dataIndex: 'linkedSewageFacilityIds',
      width: 220,
      render: (ids: string[]) => parkFacilityTags(ids)
    },
    {
      title: '配置企业',
      dataIndex: 'linkedEnterpriseIds',
      width: 220,
      render: (ids: string[]) => parkEnterpriseTags(ids)
    },
    {
      title: '操作',
      key: 'op',
      width: 168,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4} wrap={false} className="system-mgmt-table-op">
          <Button
            type="link"
            className="action-btn detail"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              form.setFieldsValue(record);
              setModal({ open: true, mode: 'detail', record });
            }}
          >
            详情
          </Button>
          <Button
            type="link"
            className="action-btn edit"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              form.setFieldsValue(record);
              setModal({ open: true, mode: 'edit', record });
            }}
          >
            编辑
          </Button>
        </Space>
      )
    }
  ];

  const handleDeletePark = () => {
    if (modal.record) {
      setData(data.filter(d => d.id !== modal.record!.id));
      message.success('已删除（原型）');
      closeModal();
    }
  };

  const submit = async () => {
    const v = await form.validateFields();
    const payload: ParkRecord = {
      ...v,
      linkedSewageFacilityIds: Array.isArray(v.linkedSewageFacilityIds) ? v.linkedSewageFacilityIds : [],
      linkedEnterpriseIds: Array.isArray(v.linkedEnterpriseIds) ? v.linkedEnterpriseIds : [],
      functionalZones: Array.isArray(v.functionalZones) ? v.functionalZones : []
    };
    if (modal.mode === 'create') {
      setData([...data, { ...payload, id: genId('K') }]);
      message.success('已新增园区（原型）');
    } else if (modal.mode === 'edit' && modal.record) {
      setData(data.map(d => (d.id === modal.record!.id ? { ...d, ...payload, id: d.id } : d)));
      message.success('已保存（原型）');
    }
    closeModal();
  };

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({
      linkedSewageFacilityIds: [],
      linkedEnterpriseIds: [],
      functionalZones: []
    });
    setModal({ open: true, mode: 'create' });
  };

  return (
    <div className="facility-view">
      <Card
        title="工业园区信息"
        extra={
          <Space wrap size={[8, 8]} align="center">
            <Button
              icon={<DownloadOutlined />}
              className="export-btn"
              onClick={() =>
                runConfigTableExport(
                  filtered as unknown as Record<string, unknown>[],
                  PARK_EXPORT_COLUMN_DEFS,
                  '配置中心_工业园区',
                  '工业园区',
                  PARK_EXPORT_FMT,
                )
              }
            >
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
              <Input placeholder="园区名称" value={q.parkName} onChange={e => setQ({ ...q, parkName: e.target.value })} allowClear />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Select
                placeholder="所属区划"
                allowClear
                options={SHAOSHAN_PARK_ADDV_OPTIONS}
                value={q.addvName || undefined}
                onChange={v => setQ({ ...q, addvName: v ?? '' })}
                optionFilterProp="label"
              />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input
                placeholder="入驻企业数"
                value={q.firmsKw}
                onChange={e => setQ({ ...q, firmsKw: e.target.value })}
                allowClear
              />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <InputNumber
                style={{ width: '100%' }}
                placeholder="面积约≥(公顷)"
                min={0}
                value={q.areaHaMin ?? undefined}
                onChange={v => setQ({ ...q, areaHaMin: v ?? null })}
              />
            </Col>
          </Row>
          <Row className="config-center-filter-row" gutter={[12, 12]} align="bottom" style={{ marginTop: 4 }}>
            <Col {...CFG_FILTER_COL_FIELD}>
              <InputNumber
                style={{ width: '100%' }}
                placeholder="面积约≤(公顷)"
                min={0}
                value={q.areaHaMax ?? undefined}
                onChange={v => setQ({ ...q, areaHaMax: v ?? null })}
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
        <div className="facility-table-wrap">
          <Table size="small" rowKey="id" scroll={{ x: 1180 }} dataSource={filtered} columns={columns} pagination={{ defaultPageSize: 10 }} />
        </div>

        <Modal
          styles={formModalStyles}
          wrapClassName={CONFIG_CENTER_MODAL_WRAP_CLASS}
          title={modal.mode === 'create' ? '新增园区' : modal.mode === 'detail' ? '园区详情' : '编辑园区'}
          open={modal.open}
          onCancel={closeModal}
          width="min(1100px, 96vw)"
          destroyOnClose
          footer={
            modal.mode === 'detail' ? null : (
              <Space>
                {modal.mode === 'edit' && (
                  <Popconfirm title="确认删除该条记录？" onConfirm={handleDeletePark}>
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
            <DetailTabsIfMultiple
              className={PARK_MODAL_TABS_CLASS}
              style={{ marginTop: 8 }}
              items={[
                {
                  key: 'basic',
                  label: '基本信息',
                  children: (
                    <>
                      <Descriptions bordered column={2} size="small">
                        <Descriptions.Item label="园区名称">{configCenterDetailText(modal.record.parkName)}</Descriptions.Item>
                        <Descriptions.Item label="所属区划">{configCenterDetailText(modal.record.addvName)}</Descriptions.Item>
                        <Descriptions.Item label="面积约(公顷)">{configCenterDetailNum(modal.record.areaHa)}</Descriptions.Item>
                        <Descriptions.Item label="入驻企业数">{configCenterDetailNum(modal.record.firms)}</Descriptions.Item>
                        <Descriptions.Item label="功能分区（地图绘制）" span={2}>
                          {(modal.record.functionalZones || []).length ? (
                            <ul className="park-facility-detail-list">
                              {modal.record.functionalZones.map(z => {
                                const pal = getParkFunctionalZonePalette(z.zoneType);
                                return (
                                  <li key={z.id}>
                                    <Tag
                                      style={
                                        pal
                                          ? {
                                              color: pal.stroke,
                                              background: `${pal.fill}1f`,
                                              borderColor: pal.fill
                                            }
                                          : undefined
                                      }
                                    >
                                      {z.zoneType}
                                    </Tag>
                                    <Text type="secondary"> · 已保存多边形（GeoJSON）</Text>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : (
                            <Text type="secondary">—</Text>
                          )}
                        </Descriptions.Item>
                      </Descriptions>
                      <Divider titlePlacement="left">功能分区地图</Divider>
                      <ParkFunctionalZonesMapInput
                        value={modal.record.functionalZones}
                        readOnly
                        linkedEnterpriseIds={modal.record.linkedEnterpriseIds}
                      />
                      <Descriptions bordered column={2} size="small" style={{ marginTop: 16 }}>
                        <Descriptions.Item label="备注" span={2}>
                          {configCenterDetailText(modal.record.note)}
                        </Descriptions.Item>
                      </Descriptions>
                    </>
                  )
                },
                {
                  key: 'sewage',
                  label: '污水设施配置',
                  children: (
                    <Card size="small" title="已选设施" className="park-linked-pick-card">
                      <Table<FacilitySewageOption>
                        size="small"
                        rowKey="id"
                        pagination={false}
                        dataSource={FACILITY_SEWAGE_OPTIONS.filter(f =>
                          (modal.record!.linkedSewageFacilityIds || []).includes(f.id)
                        )}
                        columns={PARK_SEWAGE_LINK_COLUMNS}
                        locale={{ emptyText: '暂无关联设施' }}
                        className="park-link-readonly-table"
                      />
                    </Card>
                  )
                },
                {
                  key: 'enterprise',
                  label: '关联企业',
                  children: (
                    <Card size="small" title="已选企业" className="park-linked-pick-card">
                      <Table<ParkLinkedEnterpriseOption>
                        size="small"
                        rowKey="id"
                        pagination={false}
                        dataSource={PARK_LINKED_ENTERPRISE_OPTIONS.filter(e =>
                          (modal.record!.linkedEnterpriseIds || []).includes(e.id)
                        )}
                        columns={PARK_ENTERPRISE_LINK_COLUMNS}
                        locale={{ emptyText: '暂无关联企业' }}
                        className="park-link-readonly-table"
                      />
                    </Card>
                  )
                }
              ]}
            />
          ) : (
            <Form form={form} layout="vertical" className="config-center-modal-form">
              <DetailTabsIfMultiple
                className={PARK_MODAL_TABS_CLASS}
                style={{ marginTop: 8 }}
                items={[
                  {
                    key: 'basic',
                    label: '基本信息',
                    children: (
                      <>
                        <Row gutter={CFG_FORM_GUTTER}>
                          <Col {...CFG_FORM_COL_HALF}>
                            <Form.Item label="园区名称" name="parkName" rules={[{ required: true }]}>
                              <Input />
                            </Form.Item>
                          </Col>
                          <Col {...CFG_FORM_COL_HALF}>
                            <Form.Item label="所属区划" name="addvName" rules={[{ required: true, message: '请选择所属区划' }]}>
                              <Select
                                placeholder="请选择韶山市辖乡镇"
                                options={SHAOSHAN_PARK_ADDV_OPTIONS}
                                optionFilterProp="label"
                                showSearch
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={CFG_FORM_GUTTER}>
                          <Col {...CFG_FORM_COL_HALF}>
                            <Form.Item label="面积约(公顷)" name="areaHa" rules={[{ required: true }]}>
                              <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                          </Col>
                          <Col {...CFG_FORM_COL_HALF}>
                            <Form.Item label="入驻企业数" name="firms" rules={[{ required: true }]}>
                              <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Divider titlePlacement="left">功能分区（地图绘制）</Divider>
                        <Form.Item
                          name="functionalZones"
                          label="分区范围"
                          rules={[
                            {
                              validator: async (_, val) => {
                                if (!validateParkFunctionalZones(val)) {
                                  return Promise.reject(
                                    new Error('请至少添加一个功能分区：点击「全屏绘制分区」，在地图中绘制多边形（≥3 点）并保存。')
                                  );
                                }
                              }
                            }
                          ]}
                        >
                          <ParkFunctionalZonesEditorTrigger />
                        </Form.Item>
                        <Row gutter={CFG_FORM_GUTTER}>
                          <Col {...CFG_FORM_COL_FULL}>
                            <Form.Item label="备注" name="note">
                              <Input.TextArea rows={2} />
                            </Form.Item>
                          </Col>
                        </Row>
                      </>
                    )
                  },
                  {
                    key: 'sewage',
                    label: '污水设施配置',
                    children: (
                      <>
                        <Form.Item
                          name="linkedSewageFacilityIds"
                          label="关联设施"
                          rules={[
                            { required: true, message: '请至少选择一项污水类设施' },
                            { type: 'array', min: 1, message: '请至少选择一项污水类设施' }
                          ]}
                        >
                          <Select
                            mode="multiple"
                            placeholder="请选择污水类设施（可多选，与设施管理台账一致）"
                            style={{ width: '100%' }}
                            options={PARK_SEWAGE_SELECT_OPTIONS}
                            showSearch
                            optionFilterProp="label"
                            maxTagCount="responsive"
                            allowClear
                          />
                        </Form.Item>
                        <Form.Item dependencies={['linkedSewageFacilityIds']} noStyle>
                          {() => {
                            const ids = (form.getFieldValue('linkedSewageFacilityIds') as string[] | undefined) ?? [];
                            const rows = FACILITY_SEWAGE_OPTIONS.filter(f => ids.includes(f.id));
                            return (
                              <Card size="small" title="已选设施" className="park-linked-pick-card">
                                <Table<FacilitySewageOption>
                                  size="small"
                                  rowKey="id"
                                  pagination={false}
                                  locale={{ emptyText: '暂未选择设施，请在上方搜索并多选' }}
                                  dataSource={rows}
                                  scroll={{ x: 640 }}
                                  columns={[
                                    ...PARK_SEWAGE_LINK_COLUMNS,
                                    {
                                      title: '操作',
                                      key: 'rm',
                                      width: 72,
                                      fixed: 'right' as const,
                                      render: (_: unknown, r: FacilitySewageOption) => (
                                        <Button
                                          type="link"
                                          size="small"
                                          danger
                                          className="action-btn edit"
                                          onClick={() => {
                                            const cur = (form.getFieldValue('linkedSewageFacilityIds') as string[]) ?? [];
                                            form.setFieldsValue({
                                              linkedSewageFacilityIds: cur.filter(id => id !== r.id)
                                            });
                                          }}
                                        >
                                          移除
                                        </Button>
                                      )
                                    }
                                  ]}
                                />
                              </Card>
                            );
                          }}
                        </Form.Item>
                      </>
                    )
                  },
                  {
                    key: 'enterprise',
                    label: '关联企业',
                    children: (
                      <>
                        <Form.Item
                          name="linkedEnterpriseIds"
                          label="关联企业"
                          rules={[
                            { required: true, message: '请至少选择一家入驻企业' },
                            { type: 'array', min: 1, message: '请至少选择一家入驻企业' }
                          ]}
                        >
                          <Select
                            mode="multiple"
                            placeholder="请选择入驻企业（可多选，与污染源/企业台账一致）"
                            style={{ width: '100%' }}
                            options={PARK_ENTERPRISE_SELECT_OPTIONS}
                            showSearch
                            optionFilterProp="label"
                            maxTagCount="responsive"
                            allowClear
                          />
                        </Form.Item>
                        <Form.Item dependencies={['linkedEnterpriseIds']} noStyle>
                          {() => {
                            const ids = (form.getFieldValue('linkedEnterpriseIds') as string[] | undefined) ?? [];
                            const rows = PARK_LINKED_ENTERPRISE_OPTIONS.filter(e => ids.includes(e.id));
                            return (
                              <Card size="small" title="已选企业" className="park-linked-pick-card">
                                <Table<ParkLinkedEnterpriseOption>
                                  size="small"
                                  rowKey="id"
                                  pagination={false}
                                  locale={{ emptyText: '暂未选择企业，请在上方搜索并多选' }}
                                  dataSource={rows}
                                  scroll={{ x: 560 }}
                                  columns={[
                                    ...PARK_ENTERPRISE_LINK_COLUMNS,
                                    {
                                      title: '操作',
                                      key: 'rm',
                                      width: 72,
                                      fixed: 'right' as const,
                                      render: (_: unknown, r: ParkLinkedEnterpriseOption) => (
                                        <Button
                                          type="link"
                                          size="small"
                                          danger
                                          className="action-btn edit"
                                          onClick={() => {
                                            const cur = (form.getFieldValue('linkedEnterpriseIds') as string[]) ?? [];
                                            form.setFieldsValue({
                                              linkedEnterpriseIds: cur.filter(id => id !== r.id)
                                            });
                                          }}
                                        >
                                          移除
                                        </Button>
                                      )
                                    }
                                  ]}
                                />
                              </Card>
                            );
                          }}
                        </Form.Item>
                      </>
                    )
                  }
                ]}
              />
            </Form>
          )}
        </Modal>
      </Card>
    </div>
  );
};

// ==================== 单位信息（扩展组织代码，支撑与河长对象关联） ====================

const UNIT_EXPORT_COLUMN_DEFS: ColumnConfig[] = [
  { key: 'orgCode', title: '组织编码', dataIndex: 'orgCode' },
  { key: 'name', title: '单位名称', dataIndex: 'name' },
  { key: 'type', title: '类型', dataIndex: 'type' },
  { key: 'phone', title: '联系方式', dataIndex: 'phone' },
  { key: 'creditCode', title: '统一社会信用代码', dataIndex: 'creditCode' },
  { key: 'scope', title: '责任范围', dataIndex: 'scope' },
];

export const ConfigUnitView: React.FC = () => {
  const [data, setData] = useState<UnitRecord[]>(() => [...unitInitial]);
  const [q, setQ] = useState({
    name: '',
    type: '',
    orgCode: '',
    phone: '',
    creditCode: '',
    scope: ''
  });
  const [modal, setModal] = useState<{ open: boolean; mode: 'create' | 'edit' | 'detail'; record?: UnitRecord }>({
    open: false,
    mode: 'create'
  });
  const [form] = Form.useForm<UnitRecord>();

  const closeModal = () => {
    setModal({ open: false, mode: 'create' });
    form.resetFields();
  };

  const filtered = useMemo(() => {
    return data.filter(r => {
      if (q.name.trim() && !r.name.includes(q.name.trim())) return false;
      if (q.type.trim() && !r.type.includes(q.type.trim())) return false;
      if (q.orgCode.trim() && !r.orgCode.includes(q.orgCode.trim())) return false;
      if (q.phone.trim() && !r.phone.includes(q.phone.trim())) return false;
      if (q.creditCode.trim() && !r.creditCode.includes(q.creditCode.trim())) return false;
      if (q.scope.trim() && !r.scope.includes(q.scope.trim())) return false;
      return true;
    });
  }, [data, q]);

  const columns: ColumnsType<UnitRecord> = [
    { title: '组织编码', dataIndex: 'orgCode', width: 200, ellipsis: true },
    { title: '单位名称', dataIndex: 'name', width: 180 },
    { title: '类型', dataIndex: 'type', width: 100 },
    { title: '联系方式', dataIndex: 'phone', width: 140 },
    { title: '统一社会信用代码', dataIndex: 'creditCode', ellipsis: true },
    { title: '责任范围', dataIndex: 'scope', ellipsis: true },
    {
      title: '操作',
      key: 'op',
      width: 168,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4} wrap={false} className="system-mgmt-table-op">
          <Button
            type="link"
            className="action-btn detail"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              form.setFieldsValue(record);
              setModal({ open: true, mode: 'detail', record });
            }}
          >
            详情
          </Button>
          <Button
            type="link"
            className="action-btn edit"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              form.setFieldsValue(record);
              setModal({ open: true, mode: 'edit', record });
            }}
          >
            编辑
          </Button>
        </Space>
      )
    }
  ];

  const handleDeleteUnit = () => {
    if (modal.record) {
      setData(data.filter(d => d.id !== modal.record!.id));
      message.success('已删除（原型）');
      closeModal();
    }
  };

  const submit = async () => {
    const v = await form.validateFields();
    if (modal.mode === 'create') {
      setData([...data, { ...v, id: genId('U') }]);
      message.success('单位已创建（原型）');
    } else if (modal.mode === 'edit' && modal.record) {
      setData(data.map(d => (d.id === modal.record!.id ? { ...d, ...v } : d)));
      message.success('单位信息已更新（原型）');
    }
    closeModal();
  };

  return (
    <div className="facility-view">
      <Card
      title="单位信息"
      extra={
        <Space wrap size={[8, 8]} align="center">
          <Button
            icon={<DownloadOutlined />}
            className="export-btn"
            onClick={() =>
              runConfigTableExport(filtered as unknown as Record<string, unknown>[], UNIT_EXPORT_COLUMN_DEFS, '配置中心_单位信息', '单位信息')
            }
          >
            导出Excel
          </Button>
          <Upload beforeUpload={() => { message.success('已导入（原型）'); return false; }} showUploadList={false}>
            <Button icon={<UploadOutlined />}>导入</Button>
          </Upload>
          <Button type="primary" className="add-btn" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModal({ open: true, mode: 'create' }); }}>
            新建单位
          </Button>
        </Space>
      }
    >
      <div className="filter-bar config-center-filter-bar">
        <Row className="config-center-filter-row" gutter={[12, 12]} align="bottom">
          <Col {...CFG_FILTER_COL_FIELD}>
            <Input placeholder="组织编码" value={q.orgCode} onChange={e => setQ({ ...q, orgCode: e.target.value })} allowClear />
          </Col>
          <Col {...CFG_FILTER_COL_FIELD}>
            <Input placeholder="单位名称" value={q.name} onChange={e => setQ({ ...q, name: e.target.value })} allowClear prefix={<TeamOutlined />} />
          </Col>
          <Col {...CFG_FILTER_COL_FIELD}>
            <Input placeholder="类型" value={q.type} onChange={e => setQ({ ...q, type: e.target.value })} allowClear />
          </Col>
          <Col {...CFG_FILTER_COL_FIELD}>
            <Input placeholder="联系方式" value={q.phone} onChange={e => setQ({ ...q, phone: e.target.value })} allowClear />
          </Col>
        </Row>
        <Row className="config-center-filter-row" gutter={[12, 12]} align="bottom" style={{ marginTop: 4 }}>
          <Col {...CFG_FILTER_COL_FIELD}>
            <Input placeholder="统一社会信用代码" value={q.creditCode} onChange={e => setQ({ ...q, creditCode: e.target.value })} allowClear />
          </Col>
          <Col {...CFG_FILTER_COL_FIELD}>
            <Input placeholder="责任范围" value={q.scope} onChange={e => setQ({ ...q, scope: e.target.value })} allowClear />
          </Col>
          <Col {...CFG_FILTER_COL_QUERY}>
            <Space>
              <Button type="primary" className="search-btn" icon={<SearchOutlined />} onClick={() => message.success('已筛选')}>
                查询
              </Button>
              <Button onClick={() => setQ({})}>重置</Button>
            </Space>
          </Col>
        </Row>
      </div>
      <div className="facility-table-wrap">
        <Table size="small" rowKey="id" scroll={{ x: 1100 }} dataSource={filtered} columns={columns} pagination={{ defaultPageSize: 10 }} />
      </div>

      <Modal
        styles={formModalStyles}
        wrapClassName={CONFIG_CENTER_MODAL_WRAP_CLASS}
        title={modal.mode === 'create' ? '创建单位' : modal.mode === 'detail' ? '单位详情' : '编辑单位'}
        open={modal.open}
        onCancel={closeModal}
        width={640}
        destroyOnClose
        footer={
          modal.mode === 'detail' ? null : (
            <Space>
              {modal.mode === 'edit' && (
                <Popconfirm title="确认删除该单位？" onConfirm={handleDeleteUnit}>
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
          <ConfigCenterDetailTabs>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="组织编码">{configCenterDetailText(modal.record.orgCode)}</Descriptions.Item>
              <Descriptions.Item label="单位名称">{configCenterDetailText(modal.record.name)}</Descriptions.Item>
              <Descriptions.Item label="类型">{configCenterDetailText(modal.record.type)}</Descriptions.Item>
              <Descriptions.Item label="联系方式">{configCenterDetailText(modal.record.phone)}</Descriptions.Item>
              <Descriptions.Item label="统一社会信用代码" span={2}>
                {configCenterDetailText(modal.record.creditCode)}
              </Descriptions.Item>
              <Descriptions.Item label="责任范围" span={2}>
                {configCenterDetailText(modal.record.scope)}
              </Descriptions.Item>
            </Descriptions>
          </ConfigCenterDetailTabs>
        ) : (
          <Form form={form} layout="vertical" className="config-center-modal-form">
            <Row gutter={CFG_FORM_GUTTER}>
              <Col {...CFG_FORM_COL_HALF}>
                <Form.Item label="组织编码" name="orgCode" rules={[{ required: true }]}>
                  <Input placeholder="单位内部唯一编码" />
                </Form.Item>
              </Col>
              <Col {...CFG_FORM_COL_HALF}>
                <Form.Item label="单位名称" name="name" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={CFG_FORM_GUTTER}>
              <Col {...CFG_FORM_COL_FULL}>
                <Form.Item label="类型" name="type" rules={[{ required: true }]}>
                  <Radio.Group>
                    <Radio value="政府部门">政府部门</Radio>
                    <Radio value="企业">企业</Radio>
                    <Radio value="运维机构">运维机构</Radio>
                  </Radio.Group>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={CFG_FORM_GUTTER}>
              <Col {...CFG_FORM_COL_HALF}>
                <Form.Item label="联系方式" name="phone" rules={[{ required: true }]}>
                  <Input placeholder="电话 / 邮箱" />
                </Form.Item>
              </Col>
              <Col {...CFG_FORM_COL_HALF}>
                <Form.Item label="统一社会信用代码" name="creditCode" rules={[{ required: true }]}>
                  <Input maxLength={18} placeholder="18 位" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={CFG_FORM_GUTTER}>
              <Col {...CFG_FORM_COL_FULL}>
                <Form.Item label="责任范围" name="scope" rules={[{ required: true }]}>
                  <Input.TextArea rows={2} />
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
