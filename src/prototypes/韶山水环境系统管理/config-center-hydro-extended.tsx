/**
 * 水利工程扩展子页：水闸、圩区、堰坝、山塘、河流（字段对齐 SL/T 809原型裁剪，交互同 config-center-views）
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Divider, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Table, Typography, Upload, message } from 'antd';
import { DownloadOutlined, EditOutlined, EyeOutlined, PlusOutlined, SearchOutlined, UploadOutlined } from '@ant-design/icons';
import {
  ADM_DEP_OPTIONS,
  BANK_OPTIONS,
  CR_OVER_TYPE_OPTIONS,
  ENG_GRAD_OPTIONS,
  ENG_SCAL_OPTIONS,
  ENG_STAT_OPTIONS,
  MAIN_BUILD_GRAD_OPTIONS,
  POLD_CLAS_OPTIONS,
  POLD_PROP_OPTIONS,
  POND_ENG_SCAL_OPTIONS,
  RV_STREAM_GRAD_OPTIONS,
  RV_TYPE_OPTIONS,
  WAG_TYPE_OPTIONS,
  WFW_TYPE_OPTIONS,
  waterGateInitial,
  sluiceInitial,
  weirInitial,
  polderInitial,
  hillpondInitial,
  riverInitial,
  type SluiceRecord,
  type WeirRecord,
  type PolderRecord,
  type HillpondRecord,
  type RiverRecord
} from './config-center-data';
import {
  ConfigCenterDetailTabs,
  configCenterDetailNum,
  configCenterDetailText,
  configCenterOptLabel
} from './config-center-detail-eco';
import {
  AddrWgs84MapPicker,
  AddrWgs84DetailMap,
  ADDR_MAP_FORM_ITEM_EXTRA,
  ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP,
  ADDR_MAP_INPUT_PLACEHOLDER,
  ADDR_MAP_POI_COORD_TOOLTIP,
} from '../shared/addrWgs84MapFormBridge';
import { ColumnManager, getDefaultVisibleColumnKeys, buildTableColumnsFromConfig, type ColumnConfig } from './config-center-column-manager';
import { downloadTableFullExcel, exportOptLabel } from '../shared/facilityTableXlsxExport';

const { Title } = Typography;

const genId = (prefix: string) => `${prefix}-${Date.now()}`;

const CFG_FILTER_COL_FIELD = { xs: { flex: '1 1 100%' }, sm: { flex: '0 0 200px' } };
const CFG_FILTER_COL_QUERY = { xs: { flex: '1 1 100%' }, sm: { flex: 'none' } };
const formModalStyles = {
  body: {
    maxHeight: 'calc(100vh - 240px)',
    overflowY: 'auto' as const,
    overflowX: 'hidden' as const,
    minWidth: 0
  }
};
const CONFIG_CENTER_MODAL_WRAP_CLASS = 'facility-crud-modal-wrap';
/** 弹窗表单 Row 栅格间距（与韶山水环境设施管理系统管点/管线等表单 gutter=16 一致） */
const CFG_FORM_GUTTER: [number, number] = [16, 16];
/** 配置中心弹窗：窄屏整行，sm 双列，lg 起三列 */
const CFG_FORM_COL_THIRD = { xs: 24, sm: 12, lg: 8 } as const;
const CFG_FORM_COL_HALF = { xs: 24, sm: 12 } as const;
const CFG_FORM_COL_FULL = { xs: 24, sm: 24 } as const;

const HYDRO_WATER_GATE_COLUMN_DEFS: ColumnConfig[] = [
  { key: 'wagCode', title: '水闸代码', dataIndex: 'wagCode', width: 180, defaultVisible: true },
  { key: 'wagName', title: '水闸名称', dataIndex: 'wagName', width: 140, defaultVisible: true },
  { key: 'wagLoc', title: '所在位置', dataIndex: 'wagLoc', defaultVisible: true },
  {
    key: 'wagType',
    title: '水闸类型',
    dataIndex: 'wagType',
    width: 100,
    defaultVisible: true,
    render: v => WAG_TYPE_OPTIONS.find(o => o.value === v)?.label ?? String(v ?? '')
  },
  {
    key: 'engGrad',
    title: '工程等别',
    dataIndex: 'engGrad',
    width: 90,
    defaultVisible: true,
    render: v => ENG_GRAD_OPTIONS.find(o => o.value === v)?.label ?? String(v ?? '')
  },
  { key: 'desLockDisc', title: '设计最大过闸流量(m³/s)', dataIndex: 'desLockDisc', width: 168, defaultVisible: true },
  { key: 'gaorNum', title: '闸孔数量', dataIndex: 'gaorNum', width: 88, defaultVisible: true },
  { key: 'gaorTotNetWid', title: '闸孔总净宽(m)', dataIndex: 'gaorTotNetWid', width: 120, defaultVisible: false },
  { key: 'compDate', title: '建成时间', dataIndex: 'compDate', width: 110, defaultVisible: true },
  { key: 'operation', title: '操作', width: 168, fixed: 'right', defaultVisible: true }
];

const HYDRO_WEIR_COLUMN_DEFS: ColumnConfig[] = [
  { key: 'wfwCode', title: '堰代码', dataIndex: 'wfwCode', width: 180, defaultVisible: true },
  { key: 'wfwName', title: '堰名称', dataIndex: 'wfwName', width: 140, defaultVisible: true },
  { key: 'wfwLoc', title: '所在位置', dataIndex: 'wfwLoc', defaultVisible: true },
  {
    key: 'wfwType',
    title: '堰型',
    dataIndex: 'wfwType',
    width: 110,
    defaultVisible: true,
    render: v => WFW_TYPE_OPTIONS.find(o => o.value === v)?.label ?? String(v ?? '')
  },
  { key: 'crestElev', title: '堰顶高程(m)', dataIndex: 'crestElev', width: 110, defaultVisible: true },
  { key: 'weirWidth', title: '净宽(m)', dataIndex: 'weirWidth', width: 90, defaultVisible: true },
  { key: 'desFlow', title: '设计泄流(m³/s)', dataIndex: 'desFlow', width: 120, defaultVisible: true },
  {
    key: 'engStat',
    title: '建设情况',
    dataIndex: 'engStat',
    width: 96,
    defaultVisible: false,
    render: v => ENG_STAT_OPTIONS.find(o => o.value === v)?.label ?? String(v ?? '')
  },
  { key: 'operation', title: '操作', width: 168, fixed: 'right', defaultVisible: true }
];

const HYDRO_POLDER_COLUMN_DEFS: ColumnConfig[] = [
  { key: 'plsCode', title: '圩区代码', dataIndex: 'plsCode', width: 180, defaultVisible: true },
  { key: 'plsName', title: '圩区名称', dataIndex: 'plsName', width: 140, defaultVisible: true },
  { key: 'plsLoc', title: '所在位置', dataIndex: 'plsLoc', defaultVisible: true },
  {
    key: 'poldClas',
    title: '圩垸分类',
    dataIndex: 'poldClas',
    width: 110,
    defaultVisible: true,
    render: v => POLD_CLAS_OPTIONS.find(o => o.value === v)?.label ?? String(v ?? '')
  },
  {
    key: 'poldProp',
    title: '平垸性质',
    dataIndex: 'poldProp',
    width: 100,
    defaultVisible: false,
    render: v => POLD_PROP_OPTIONS.find(o => o.value === v)?.label ?? String(v ?? '')
  },
  { key: 'desFlFlow', title: '设计排涝流量(m³/s)', dataIndex: 'desFlFlow', width: 150, defaultVisible: false },
  { key: 'desStorCap', title: '设计蓄滞容积(10⁴m³)', dataIndex: 'desStorCap', width: 150, defaultVisible: false },
  { key: 'protectStd', title: '防洪标准', dataIndex: 'protectStd', width: 120, defaultVisible: true },
  { key: 'polderArea', title: '圩区面积(km²)', dataIndex: 'polderArea', width: 120, defaultVisible: true },
  { key: 'drainCap', title: '排涝能力(m³/s)', dataIndex: 'drainCap', width: 130, defaultVisible: true },
  { key: 'operation', title: '操作', width: 168, fixed: 'right', defaultVisible: true }
];

const HYDRO_HILLPOND_COLUMN_DEFS: ColumnConfig[] = [
  { key: 'stuCode', title: '山塘代码', dataIndex: 'stuCode', width: 180, defaultVisible: true },
  { key: 'stuName', title: '山塘名称', dataIndex: 'stuName', width: 140, defaultVisible: true },
  { key: 'stuLoc', title: '所在位置', dataIndex: 'stuLoc', defaultVisible: true },
  {
    key: 'engScal',
    title: '塘坝规模',
    dataIndex: 'engScal',
    width: 110,
    defaultVisible: true,
    render: v => POND_ENG_SCAL_OPTIONS.find(o => o.value === v)?.label ?? String(v ?? '')
  },
  { key: 'watShedArea', title: '集雨面积(km²)', dataIndex: 'watShedArea', width: 120, defaultVisible: true },
  { key: 'normWatLev', title: '正常水位(m)', dataIndex: 'normWatLev', width: 110, defaultVisible: true },
  { key: 'totVol', title: '总容积(10⁴m³)', dataIndex: 'totVol', width: 110, defaultVisible: true },
  {
    key: 'engStat',
    title: '建设情况',
    dataIndex: 'engStat',
    width: 96,
    defaultVisible: false,
    render: v => ENG_STAT_OPTIONS.find(o => o.value === v)?.label ?? String(v ?? '')
  },
  { key: 'operation', title: '操作', width: 168, fixed: 'right', defaultVisible: true }
];

const HYDRO_RIVER_COLUMN_DEFS: ColumnConfig[] = [
  { key: 'rvCode', title: '河流代码', dataIndex: 'rvCode', width: 180, defaultVisible: true },
  { key: 'rvName', title: '河流名称', dataIndex: 'rvName', width: 160, defaultVisible: true },
  {
    key: 'crOverType',
    title: '跨界类型',
    dataIndex: 'crOverType',
    width: 120,
    defaultVisible: false,
    render: v => CR_OVER_TYPE_OPTIONS.find(o => o.value === v)?.label ?? String(v ?? '')
  },
  {
    key: 'rvType',
    title: '河流类型',
    dataIndex: 'rvType',
    width: 120,
    defaultVisible: true,
    render: v => RV_TYPE_OPTIONS.find(o => o.value === v)?.label ?? String(v ?? '')
  },
  {
    key: 'rvGrad',
    title: '河流级别',
    dataIndex: 'rvGrad',
    width: 120,
    defaultVisible: true,
    render: v => RV_STREAM_GRAD_OPTIONS.find(o => o.value === v)?.label ?? String(v ?? '')
  },
  {
    key: 'bank',
    title: '岸别',
    dataIndex: 'bank',
    width: 80,
    defaultVisible: false,
    render: v => BANK_OPTIONS.find(o => o.value === v)?.label ?? String(v ?? '')
  },
  { key: 'rvLen', title: '河长(km)', dataIndex: 'rvLen', width: 90, defaultVisible: true },
  { key: 'rvBasArea', title: '流域面积(km²)', dataIndex: 'rvBasArea', width: 120, defaultVisible: true },
  { key: 'operation', title: '操作', width: 168, fixed: 'right', defaultVisible: true }
];

function runHydroListExport(
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

const HYDRO_GATE_EXPORT_FMT: Record<string, (raw: unknown) => string | number> = {
  wagType: v => exportOptLabel(WAG_TYPE_OPTIONS, v),
  engGrad: v => exportOptLabel(ENG_GRAD_OPTIONS, v),
};
const HYDRO_WEIR_EXPORT_FMT: Record<string, (raw: unknown) => string | number> = {
  wfwType: v => exportOptLabel(WFW_TYPE_OPTIONS, v),
  engStat: v => exportOptLabel(ENG_STAT_OPTIONS, v),
};
const HYDRO_POLDER_EXPORT_FMT: Record<string, (raw: unknown) => string | number> = {
  poldClas: v => exportOptLabel(POLD_CLAS_OPTIONS, v),
  poldProp: v => exportOptLabel(POLD_PROP_OPTIONS, v),
};
const HYDRO_HILL_EXPORT_FMT: Record<string, (raw: unknown) => string | number> = {
  engScal: v => exportOptLabel(POND_ENG_SCAL_OPTIONS, v),
  engStat: v => exportOptLabel(ENG_STAT_OPTIONS, v),
};
const HYDRO_RIVER_EXPORT_FMT: Record<string, (raw: unknown) => string | number> = {
  crOverType: v => exportOptLabel(CR_OVER_TYPE_OPTIONS, v),
  rvType: v => exportOptLabel(RV_TYPE_OPTIONS, v),
  rvGrad: v => exportOptLabel(RV_STREAM_GRAD_OPTIONS, v),
  bank: v => exportOptLabel(BANK_OPTIONS, v),
};

// ==================== 水闸（ATT_WAG_BASE，与闸坝字段一致、独立台账） ====================

export const ConfigHydroWaterGateView: React.FC = () => {
  const [data, setData] = useState<SluiceRecord[]>(() => [...waterGateInitial]);
  const [q, setQ] = useState<{
    wagCode: string;
    wagName: string;
    wagLoc: string;
    wagType: string | undefined;
    engGrad: string | undefined;
    engStat: string | undefined;
  }>({ wagCode: '', wagName: '', wagLoc: '', wagType: undefined, engGrad: undefined, engStat: undefined });
  const [modal, setModal] = useState<{ open: boolean; mode: 'create' | 'edit' | 'detail'; record?: SluiceRecord }>({
    open: false,
    mode: 'create'
  });
  const [form] = Form.useForm<SluiceRecord>();
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  useEffect(() => {
    setVisibleColumns(getDefaultVisibleColumnKeys(HYDRO_WATER_GATE_COLUMN_DEFS));
  }, []);

  const closeModal = () => {
    setModal({ open: false, mode: 'create' });
    form.resetFields();
  };

  const filtered = useMemo(
    () =>
      data.filter(r => {
        const c = q.wagCode.trim();
        const n = q.wagName.trim();
        const loc = q.wagLoc.trim();
        if (c && !r.wagCode.includes(c)) return false;
        if (n && !r.wagName.includes(n)) return false;
        if (loc && !r.wagLoc.includes(loc)) return false;
        if (q.wagType && r.wagType !== q.wagType) return false;
        if (q.engGrad && r.engGrad !== q.engGrad) return false;
        if (q.engStat && r.engStat !== q.engStat) return false;
        return true;
      }),
    [data, q]
  );

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({
      wagType: '5',
      engGrad: '4',
      engScal: '4',
      poiLong: null,
      poiLat: null,
      startLong: null,
      startLat: null,
      endLong: null,
      endLat: null,
      wagUse: '',
      mainBuildGrad: '4',
      desLockDisc: null,
      gaorNum: null,
      gaorTotNetWid: null,
      engStat: '1',
      admDep: '1',
      startDate: '',
      compDate: '',
      note: ''
    });
    setModal({ open: true, mode: 'create' });
  };

  const openDetail = (record: SluiceRecord) => {
    form.setFieldsValue(record);
    setModal({ open: true, mode: 'detail', record });
  };

  const openEdit = (record: SluiceRecord) => {
    form.setFieldsValue(record);
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
    if (modal.mode === 'create') {
      setData([...data, { ...v, id: genId('WGS') }]);
      message.success('已新增水闸对象（原型）');
    } else if (modal.mode === 'edit' && modal.record) {
      setData(data.map(d => (d.id === modal.record!.id ? { ...d, ...v } : d)));
      message.success('已保存（原型）');
    }
    closeModal();
  };

  const tableColumns = useMemo(
    () =>
      buildTableColumnsFromConfig<SluiceRecord>(HYDRO_WATER_GATE_COLUMN_DEFS, visibleColumns, record => (
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
        title="水利工程信息（水闸）"
        extra={
          <Space wrap size={[8, 8]} align="center">
            <Button
              icon={<DownloadOutlined />}
              className="export-btn"
              onClick={() =>
                runHydroListExport(
                  filtered as unknown as Record<string, unknown>[],
                  HYDRO_WATER_GATE_COLUMN_DEFS,
                  '水利工程_水闸',
                  '水闸',
                  HYDRO_GATE_EXPORT_FMT,
                )
              }
            >
              导出Excel
            </Button>
            <Upload beforeUpload={() => { message.success('已导入（原型）'); return false; }} showUploadList={false}>
              <Button icon={<UploadOutlined />}>导入</Button>
            </Upload>
            <ColumnManager columns={HYDRO_WATER_GATE_COLUMN_DEFS} visibleColumns={visibleColumns} onChange={setVisibleColumns} />
            <Button type="primary" className="add-btn" icon={<PlusOutlined />} onClick={openCreate}>
              新增
            </Button>
          </Space>
        }
      >
        <div className="filter-bar config-center-filter-bar">
          <Row className="config-center-filter-row" gutter={[12, 12]} align="bottom">
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input placeholder="水闸代码" value={q.wagCode} onChange={e => setQ({ ...q, wagCode: e.target.value })} allowClear />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input placeholder="水闸名称" value={q.wagName} onChange={e => setQ({ ...q, wagName: e.target.value })} allowClear />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input placeholder="所在位置" value={q.wagLoc} onChange={e => setQ({ ...q, wagLoc: e.target.value })} allowClear />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Select
                placeholder="水闸类型"
                allowClear
                style={{ width: '100%' }}
                options={WAG_TYPE_OPTIONS}
                value={q.wagType}
                onChange={v => setQ({ ...q, wagType: v })}
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
            pagination={{ pageSize: 10, showTotal: t => `共 ${t} 条` }}
          />
        </div>

        <Modal
          styles={formModalStyles}
          wrapClassName={CONFIG_CENTER_MODAL_WRAP_CLASS}
          title={modal.mode === 'create' ? '新增水闸' : modal.mode === 'detail' ? '水闸详情' : '编辑水闸'}
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
                <Descriptions.Item label="水闸代码">{configCenterDetailText(modal.record.wagCode)}</Descriptions.Item>
                <Descriptions.Item label="水闸名称">{configCenterDetailText(modal.record.wagName)}</Descriptions.Item>
                <Descriptions.Item label="所在位置" span={2}>
                  {configCenterDetailText(modal.record.wagLoc)}
                </Descriptions.Item>
                <Descriptions.Item label="地图经度（POI）">{configCenterDetailNum(modal.record.poiLong, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="地图纬度（POI）">{configCenterDetailNum(modal.record.poiLat, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="所在位置地图（POI）" span={2}>
                  <AddrWgs84DetailMap
                    title={String(modal.record.wagName ?? '')}
                    location={modal.record.wagLoc}
                    lng={modal.record.poiLong}
                    lat={modal.record.poiLat}
                    mapAriaLabel="水闸位置地图"
                  />
                </Descriptions.Item>
                <Descriptions.Item label="轴线起点经度">{configCenterDetailNum(modal.record.startLong, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="轴线起点纬度">{configCenterDetailNum(modal.record.startLat, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="轴线终点经度">{configCenterDetailNum(modal.record.endLong, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="轴线终点纬度">{configCenterDetailNum(modal.record.endLat, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="水闸类型">{configCenterOptLabel(WAG_TYPE_OPTIONS, modal.record.wagType)}</Descriptions.Item>
                <Descriptions.Item label="水闸用途" span={2}>
                  {configCenterDetailText(modal.record.wagUse)}
                </Descriptions.Item>
                <Descriptions.Item label="工程等别">{configCenterOptLabel(ENG_GRAD_OPTIONS, modal.record.engGrad)}</Descriptions.Item>
                <Descriptions.Item label="工程规模">{configCenterOptLabel(ENG_SCAL_OPTIONS, modal.record.engScal)}</Descriptions.Item>
                <Descriptions.Item label="主要建筑物级别">{configCenterOptLabel(MAIN_BUILD_GRAD_OPTIONS, modal.record.mainBuildGrad)}</Descriptions.Item>
                <Descriptions.Item label="设计最大过闸流量（m³/s）">{configCenterDetailNum(modal.record.desLockDisc)}</Descriptions.Item>
                <Descriptions.Item label="闸孔数量">{configCenterDetailNum(modal.record.gaorNum)}</Descriptions.Item>
                <Descriptions.Item label="闸孔总净宽（m）">{configCenterDetailNum(modal.record.gaorTotNetWid)}</Descriptions.Item>
                <Descriptions.Item label="工程建设情况">{configCenterOptLabel(ENG_STAT_OPTIONS, modal.record.engStat)}</Descriptions.Item>
                <Descriptions.Item label="归口管理部门">{configCenterOptLabel(ADM_DEP_OPTIONS, modal.record.admDep)}</Descriptions.Item>
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

              <Title level={5} style={{ marginTop: 0 }}>基础信息</Title>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="水闸代码" name="wagCode" rules={[{ required: true }]}>
                    <Input maxLength={18} placeholder="WAG_CODE" />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="水闸名称" name="wagName" rules={[{ required: true }]}>
                    <Input maxLength={100} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_FULL}>
                  <Form.Item label="所在位置" name="wagLoc" rules={[{ required: true }]} extra={ADDR_MAP_FORM_ITEM_EXTRA}>
                    <Input.TextArea rows={1} maxLength={256} placeholder={ADDR_MAP_INPUT_PLACEHOLDER} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_FULL}>
                  <Form.Item label="水闸位置地图（POI）" colon={false}>
                    <AddrWgs84MapPicker
                      form={form}
                      addrField="wagLoc"
                      lngField="poiLong"
                      latField="poiLat"
                      mapAriaLabel="水闸位置地图"
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
                  <Form.Item label="轴线起点经度" name="startLong" tooltip={ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="轴线起点纬度" name="startLat" tooltip={ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="轴线终点经度" name="endLong" tooltip={ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="轴线终点纬度" name="endLat" tooltip={ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
                  </Form.Item>
                </Col>
              </Row>
              <Divider style={{ margin: '16px 0' }} />
              <Title level={5}>工程特征</Title>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="水闸类型" name="wagType" rules={[{ required: true }]}>
                    <Select options={WAG_TYPE_OPTIONS} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="工程等别" name="engGrad" rules={[{ required: true }]}>
                    <Select options={ENG_GRAD_OPTIONS} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="工程规模" name="engScal" rules={[{ required: true }]}>
                    <Select options={ENG_SCAL_OPTIONS} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_FULL}>
                  <Form.Item label="水闸用途（引进水闸等填写）" name="wagUse">
                    <Input.TextArea rows={1} maxLength={256} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="主要建筑物级别" name="mainBuildGrad">
                    <Select options={MAIN_BUILD_GRAD_OPTIONS} allowClear />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="设计最大过闸流量（m³/s）" name="desLockDisc">
                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="闸孔数量" name="gaorNum">
                    <InputNumber style={{ width: '100%' }} min={0} precision={0} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="闸孔总净宽（m）" name="gaorTotNetWid">
                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                  </Form.Item>
                </Col>
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


// ==================== 闸坝（与 index 导入 ConfigHydroSluiceView 对齐，ATT_WAGA_BASE） ====================

export const ConfigHydroSluiceView: React.FC = () => {
  const [data, setData] = useState<SluiceRecord[]>(() => [...sluiceInitial]);
  const [q, setQ] = useState<{
    wagCode: string;
    wagName: string;
    wagLoc: string;
    wagType: string | undefined;
    engGrad: string | undefined;
    engStat: string | undefined;
  }>({ wagCode: '', wagName: '', wagLoc: '', wagType: undefined, engGrad: undefined, engStat: undefined });
  const [modal, setModal] = useState<{ open: boolean; mode: 'create' | 'edit' | 'detail'; record?: SluiceRecord }>({
    open: false,
    mode: 'create'
  });
  const [form] = Form.useForm<SluiceRecord>();
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  useEffect(() => {
    setVisibleColumns(getDefaultVisibleColumnKeys(HYDRO_WATER_GATE_COLUMN_DEFS));
  }, []);

  const closeModal = () => {
    setModal({ open: false, mode: 'create' });
    form.resetFields();
  };

  const filtered = useMemo(
    () =>
      data.filter(r => {
        const c = q.wagCode.trim();
        const n = q.wagName.trim();
        const loc = q.wagLoc.trim();
        if (c && !r.wagCode.includes(c)) return false;
        if (n && !r.wagName.includes(n)) return false;
        if (loc && !r.wagLoc.includes(loc)) return false;
        if (q.wagType && r.wagType !== q.wagType) return false;
        if (q.engGrad && r.engGrad !== q.engGrad) return false;
        if (q.engStat && r.engStat !== q.engStat) return false;
        return true;
      }),
    [data, q]
  );

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({
      wagType: '2',
      engGrad: '4',
      engScal: '4',
      poiLong: null,
      poiLat: null,
      startLong: null,
      startLat: null,
      endLong: null,
      endLat: null,
      wagUse: '',
      mainBuildGrad: '4',
      desLockDisc: null,
      gaorNum: null,
      gaorTotNetWid: null,
      engStat: '1',
      admDep: '1',
      startDate: '',
      compDate: '',
      note: ''
    });
    setModal({ open: true, mode: 'create' });
  };

  const openDetail = (record: SluiceRecord) => {
    form.setFieldsValue(record);
    setModal({ open: true, mode: 'detail', record });
  };

  const openEdit = (record: SluiceRecord) => {
    form.setFieldsValue(record);
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
    if (modal.mode === 'create') {
      setData([...data, { ...v, id: genId('WAG') }]);
      message.success('已新增闸坝对象（原型）');
    } else if (modal.mode === 'edit' && modal.record) {
      setData(data.map(d => (d.id === modal.record!.id ? { ...d, ...v } : d)));
      message.success('已保存（原型）');
    }
    closeModal();
  };

  const tableColumns = useMemo(
    () =>
      buildTableColumnsFromConfig<SluiceRecord>(HYDRO_WATER_GATE_COLUMN_DEFS, visibleColumns, record => (
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
        title="水利工程信息（闸坝）"
        extra={
          <Space wrap size={[8, 8]} align="center">
            <Button
              icon={<DownloadOutlined />}
              className="export-btn"
              onClick={() =>
                runHydroListExport(
                  filtered as unknown as Record<string, unknown>[],
                  HYDRO_WATER_GATE_COLUMN_DEFS,
                  '水利工程_闸坝',
                  '闸坝',
                  HYDRO_GATE_EXPORT_FMT,
                )
              }
            >
              导出Excel
            </Button>
            <Upload beforeUpload={() => { message.success('已导入（原型）'); return false; }} showUploadList={false}>
              <Button icon={<UploadOutlined />}>导入</Button>
            </Upload>
            <ColumnManager columns={HYDRO_WATER_GATE_COLUMN_DEFS} visibleColumns={visibleColumns} onChange={setVisibleColumns} />
            <Button type="primary" className="add-btn" icon={<PlusOutlined />} onClick={openCreate}>
              新增
            </Button>
          </Space>
        }
      >
        <div className="filter-bar config-center-filter-bar">
          <Row className="config-center-filter-row" gutter={[12, 12]} align="bottom">
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input placeholder="闸坝代码" value={q.wagCode} onChange={e => setQ({ ...q, wagCode: e.target.value })} allowClear />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input placeholder="闸坝名称" value={q.wagName} onChange={e => setQ({ ...q, wagName: e.target.value })} allowClear />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input placeholder="所在位置" value={q.wagLoc} onChange={e => setQ({ ...q, wagLoc: e.target.value })} allowClear />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Select
                placeholder="水闸类型"
                allowClear
                style={{ width: '100%' }}
                options={WAG_TYPE_OPTIONS}
                value={q.wagType}
                onChange={v => setQ({ ...q, wagType: v })}
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
            pagination={{ pageSize: 10, showTotal: t => `共 ${t} 条` }}
          />
        </div>

        <Modal
          styles={formModalStyles}
          wrapClassName={CONFIG_CENTER_MODAL_WRAP_CLASS}
          title={modal.mode === 'create' ? '新增闸坝' : modal.mode === 'detail' ? '闸坝详情' : '编辑闸坝'}
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
                <Descriptions.Item label="水闸代码">{configCenterDetailText(modal.record.wagCode)}</Descriptions.Item>
                <Descriptions.Item label="水闸名称">{configCenterDetailText(modal.record.wagName)}</Descriptions.Item>
                <Descriptions.Item label="所在位置" span={2}>
                  {configCenterDetailText(modal.record.wagLoc)}
                </Descriptions.Item>
                <Descriptions.Item label="地图经度（POI）">{configCenterDetailNum(modal.record.poiLong, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="地图纬度（POI）">{configCenterDetailNum(modal.record.poiLat, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="所在位置地图（POI）" span={2}>
                  <AddrWgs84DetailMap
                    title={String(modal.record.wagName ?? '')}
                    location={modal.record.wagLoc}
                    lng={modal.record.poiLong}
                    lat={modal.record.poiLat}
                    mapAriaLabel="闸坝位置地图"
                  />
                </Descriptions.Item>
                <Descriptions.Item label="轴线起点经度">{configCenterDetailNum(modal.record.startLong, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="轴线起点纬度">{configCenterDetailNum(modal.record.startLat, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="轴线终点经度">{configCenterDetailNum(modal.record.endLong, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="轴线终点纬度">{configCenterDetailNum(modal.record.endLat, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="水闸类型">{configCenterOptLabel(WAG_TYPE_OPTIONS, modal.record.wagType)}</Descriptions.Item>
                <Descriptions.Item label="水闸用途" span={2}>
                  {configCenterDetailText(modal.record.wagUse)}
                </Descriptions.Item>
                <Descriptions.Item label="工程等别">{configCenterOptLabel(ENG_GRAD_OPTIONS, modal.record.engGrad)}</Descriptions.Item>
                <Descriptions.Item label="工程规模">{configCenterOptLabel(ENG_SCAL_OPTIONS, modal.record.engScal)}</Descriptions.Item>
                <Descriptions.Item label="主要建筑物级别">{configCenterOptLabel(MAIN_BUILD_GRAD_OPTIONS, modal.record.mainBuildGrad)}</Descriptions.Item>
                <Descriptions.Item label="设计最大过闸流量（m³/s）">{configCenterDetailNum(modal.record.desLockDisc)}</Descriptions.Item>
                <Descriptions.Item label="闸孔数量">{configCenterDetailNum(modal.record.gaorNum)}</Descriptions.Item>
                <Descriptions.Item label="闸孔总净宽（m）">{configCenterDetailNum(modal.record.gaorTotNetWid)}</Descriptions.Item>
                <Descriptions.Item label="工程建设情况">{configCenterOptLabel(ENG_STAT_OPTIONS, modal.record.engStat)}</Descriptions.Item>
                <Descriptions.Item label="归口管理部门">{configCenterOptLabel(ADM_DEP_OPTIONS, modal.record.admDep)}</Descriptions.Item>
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

              <Title level={5} style={{ marginTop: 0 }}>基础信息</Title>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="水闸代码" name="wagCode" rules={[{ required: true }]}>
                    <Input maxLength={18} placeholder="WAG_CODE" />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="水闸名称" name="wagName" rules={[{ required: true }]}>
                    <Input maxLength={100} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_FULL}>
                  <Form.Item label="所在位置" name="wagLoc" rules={[{ required: true }]} extra={ADDR_MAP_FORM_ITEM_EXTRA}>
                    <Input.TextArea rows={1} maxLength={256} placeholder={ADDR_MAP_INPUT_PLACEHOLDER} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_FULL}>
                  <Form.Item label="闸坝位置地图（POI）" colon={false}>
                    <AddrWgs84MapPicker
                      form={form}
                      addrField="wagLoc"
                      lngField="poiLong"
                      latField="poiLat"
                      mapAriaLabel="闸坝位置地图"
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
                  <Form.Item label="轴线起点经度" name="startLong" tooltip={ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="轴线起点纬度" name="startLat" tooltip={ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="轴线终点经度" name="endLong" tooltip={ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="轴线终点纬度" name="endLat" tooltip={ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
                  </Form.Item>
                </Col>
              </Row>
              <Divider style={{ margin: '16px 0' }} />
              <Title level={5}>工程特征</Title>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="水闸类型" name="wagType" rules={[{ required: true }]}>
                    <Select options={WAG_TYPE_OPTIONS} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="工程等别" name="engGrad" rules={[{ required: true }]}>
                    <Select options={ENG_GRAD_OPTIONS} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="工程规模" name="engScal" rules={[{ required: true }]}>
                    <Select options={ENG_SCAL_OPTIONS} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_FULL}>
                  <Form.Item label="水闸用途（引进水闸等填写）" name="wagUse">
                    <Input.TextArea rows={1} maxLength={256} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="主要建筑物级别" name="mainBuildGrad">
                    <Select options={MAIN_BUILD_GRAD_OPTIONS} allowClear />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="设计最大过闸流量（m³/s）" name="desLockDisc">
                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="闸孔数量" name="gaorNum">
                    <InputNumber style={{ width: '100%' }} min={0} precision={0} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="闸孔总净宽（m）" name="gaorTotNetWid">
                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                  </Form.Item>
                </Col>
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


// ==================== 堰坝 ATT_WFW_BASE ====================

export const ConfigHydroWeirView: React.FC = () => {
  const [data, setData] = useState<WeirRecord[]>(() => [...weirInitial]);
  const [q, setQ] = useState<{
    wfwCode: string;
    wfwName: string;
    wfwLoc: string;
    wfwType: string | undefined;
    engStat: string | undefined;
  }>({ wfwCode: '', wfwName: '', wfwLoc: '', wfwType: undefined, engStat: undefined });
  const [modal, setModal] = useState<{ open: boolean; mode: 'create' | 'edit' | 'detail'; record?: WeirRecord }>({
    open: false,
    mode: 'create'
  });
  const [form] = Form.useForm<WeirRecord>();
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  useEffect(() => {
    setVisibleColumns(getDefaultVisibleColumnKeys(HYDRO_WEIR_COLUMN_DEFS));
  }, []);

  const closeModal = () => {
    setModal({ open: false, mode: 'create' });
    form.resetFields();
  };

  const filtered = useMemo(
    () =>
      data.filter(r => {
        const c = q.wfwCode.trim();
        const n = q.wfwName.trim();
        const loc = q.wfwLoc.trim();
        if (c && !r.wfwCode.includes(c)) return false;
        if (n && !r.wfwName.includes(n)) return false;
        if (loc && !r.wfwLoc.includes(loc)) return false;
        if (q.wfwType && r.wfwType !== q.wfwType) return false;
        if (q.engStat && r.engStat !== q.engStat) return false;
        return true;
      }),
    [data, q]
  );

  const submit = async () => {
    const v = await form.validateFields();
    if (modal.mode === 'create') {
      setData([...data, { ...v, id: genId('WFW') }]);
      message.success('已新增堰坝（原型）');
    } else if (modal.mode === 'edit' && modal.record) {
      setData(data.map(d => (d.id === modal.record!.id ? { ...d, ...v } : d)));
      message.success('已保存（原型）');
    }
    closeModal();
  };

  const handleDelete = () => {
    if (modal.record) {
      setData(data.filter(d => d.id !== modal.record!.id));
      message.success('已删除（原型）');
      closeModal();
    }
  };

  const tableColumns = useMemo(
    () =>
      buildTableColumnsFromConfig<WeirRecord>(HYDRO_WEIR_COLUMN_DEFS, visibleColumns, record => (
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
      )),
    [visibleColumns]
  );

  return (
    <div className="facility-view">
      <Card
        title="水利工程信息（堰坝）"
        extra={
          <Space wrap size={[8, 8]} align="center">
            <Button
              icon={<DownloadOutlined />}
              className="export-btn"
              onClick={() =>
                runHydroListExport(
                  filtered as unknown as Record<string, unknown>[],
                  HYDRO_WEIR_COLUMN_DEFS,
                  '水利工程_堰坝',
                  '堰坝',
                  HYDRO_WEIR_EXPORT_FMT,
                )
              }
            >
              导出Excel
            </Button>
            <Upload beforeUpload={() => { message.success('已导入（原型）'); return false; }} showUploadList={false}>
              <Button icon={<UploadOutlined />}>导入</Button>
            </Upload>
            <ColumnManager columns={HYDRO_WEIR_COLUMN_DEFS} visibleColumns={visibleColumns} onChange={setVisibleColumns} />
            <Button
              type="primary"
              className="add-btn"
              icon={<PlusOutlined />}
              onClick={() => {
                form.resetFields();
                form.setFieldsValue({
                  wfwType: '1',
                  engGrad: '5',
                  engScal: '5',
                  poiLong: null,
                  poiLat: null,
                  lowLeftLong: null,
                  lowLeftLat: null,
                  crestElev: null,
                  weirWidth: null,
                  desFlow: null,
                  engStat: '1',
                  admDep: '1',
                  startDate: '',
                  compDate: '',
                  note: ''
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
            <Col {...CFG_FILTER_COL_FIELD}><Input placeholder="堰代码" value={q.wfwCode} onChange={e => setQ({ ...q, wfwCode: e.target.value })} allowClear /></Col>
            <Col {...CFG_FILTER_COL_FIELD}><Input placeholder="堰名称" value={q.wfwName} onChange={e => setQ({ ...q, wfwName: e.target.value })} allowClear /></Col>
            <Col {...CFG_FILTER_COL_FIELD}><Input placeholder="所在位置" value={q.wfwLoc} onChange={e => setQ({ ...q, wfwLoc: e.target.value })} allowClear /></Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Select
                placeholder="堰型"
                allowClear
                style={{ width: '100%' }}
                options={WFW_TYPE_OPTIONS}
                value={q.wfwType}
                onChange={v => setQ({ ...q, wfwType: v })}
              />
            </Col>
          </Row>
          <Row className="config-center-filter-row" gutter={[12, 12]} align="bottom" style={{ marginTop: 4 }}>
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
                <Button type="primary" className="search-btn" icon={<SearchOutlined />} onClick={() => message.success('已查询')}>查询</Button>
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
            pagination={{ pageSize: 10, showTotal: t => `共 ${t} 条` }}
          />
        </div>
        <Modal styles={formModalStyles} wrapClassName={CONFIG_CENTER_MODAL_WRAP_CLASS} title={modal.mode === 'create' ? '新增堰坝' : modal.mode === 'detail' ? '堰坝详情' : '编辑堰坝'} open={modal.open} onCancel={closeModal} width={1000} destroyOnClose
          footer={modal.mode === 'detail' ? null : <Space>{modal.mode === 'edit' && <Popconfirm title="确认删除该条记录？" onConfirm={handleDelete}><Button danger>删除</Button></Popconfirm>}<Button onClick={closeModal}>取消</Button><Button type="primary" onClick={submit}>保存</Button></Space>}
        >
          {modal.mode === 'detail' && modal.record ? (
            <ConfigCenterDetailTabs>
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="内部编号" span={2}>
                  {configCenterDetailText(modal.record.id)}
                </Descriptions.Item>
                <Descriptions.Item label="堰代码">{configCenterDetailText(modal.record.wfwCode)}</Descriptions.Item>
                <Descriptions.Item label="堰名称">{configCenterDetailText(modal.record.wfwName)}</Descriptions.Item>
                <Descriptions.Item label="所在位置" span={2}>
                  {configCenterDetailText(modal.record.wfwLoc)}
                </Descriptions.Item>
                <Descriptions.Item label="地图经度（POI）">{configCenterDetailNum(modal.record.poiLong, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="地图纬度（POI）">{configCenterDetailNum(modal.record.poiLat, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="所在位置地图（POI）" span={2}>
                  <AddrWgs84DetailMap
                    title={String(modal.record.wfwName ?? '')}
                    location={modal.record.wfwLoc}
                    lng={modal.record.poiLong}
                    lat={modal.record.poiLat}
                    mapAriaLabel="堰坝位置地图"
                  />
                </Descriptions.Item>
                <Descriptions.Item label="左下角经度">{configCenterDetailNum(modal.record.lowLeftLong, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="左下角纬度">{configCenterDetailNum(modal.record.lowLeftLat, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="堰型">{configCenterOptLabel(WFW_TYPE_OPTIONS, modal.record.wfwType)}</Descriptions.Item>
                <Descriptions.Item label="工程等别">{configCenterOptLabel(ENG_GRAD_OPTIONS, modal.record.engGrad)}</Descriptions.Item>
                <Descriptions.Item label="工程规模">{configCenterOptLabel(ENG_SCAL_OPTIONS, modal.record.engScal)}</Descriptions.Item>
                <Descriptions.Item label="堰顶高程（m）">{configCenterDetailNum(modal.record.crestElev)}</Descriptions.Item>
                <Descriptions.Item label="净宽（m）">{configCenterDetailNum(modal.record.weirWidth)}</Descriptions.Item>
                <Descriptions.Item label="设计泄流（m³/s）">{configCenterDetailNum(modal.record.desFlow)}</Descriptions.Item>
                <Descriptions.Item label="工程建设情况">{configCenterOptLabel(ENG_STAT_OPTIONS, modal.record.engStat)}</Descriptions.Item>
                <Descriptions.Item label="归口管理部门">{configCenterOptLabel(ADM_DEP_OPTIONS, modal.record.admDep)}</Descriptions.Item>
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

              <Title level={5} style={{ marginTop: 0 }}>基础信息</Title>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="堰代码" name="wfwCode" rules={[{ required: true }]}>
                    <Input maxLength={18} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="堰名称" name="wfwName" rules={[{ required: true }]}>
                    <Input maxLength={100} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_FULL}>
                  <Form.Item label="所在位置" name="wfwLoc" rules={[{ required: true }]} extra={ADDR_MAP_FORM_ITEM_EXTRA}>
                    <Input.TextArea rows={1} maxLength={256} placeholder={ADDR_MAP_INPUT_PLACEHOLDER} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_FULL}>
                  <Form.Item label="堰坝位置地图（POI）" colon={false}>
                    <AddrWgs84MapPicker
                      form={form}
                      addrField="wfwLoc"
                      lngField="poiLong"
                      latField="poiLat"
                      mapAriaLabel="堰坝位置地图"
                      hintAddressLabel="所在位置"
                      lngLatValueMode="number"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="地图经度（POI）" name="poiLong" tooltip={ADDR_MAP_POI_COORD_TOOLTIP}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="地图纬度（POI）" name="poiLat" tooltip={ADDR_MAP_POI_COORD_TOOLTIP}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="左下角经度" name="lowLeftLong" tooltip={ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="左下角纬度" name="lowLeftLat" tooltip={ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} />
                  </Form.Item>
                </Col>
              </Row>
              <Divider style={{ margin: '16px 0' }} />
              <Title level={5}>工程特征</Title>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="堰型" name="wfwType" rules={[{ required: true }]}>
                    <Select options={WFW_TYPE_OPTIONS} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="工程等别" name="engGrad" rules={[{ required: true }]}>
                    <Select options={ENG_GRAD_OPTIONS} />
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
                  <Form.Item label="堰顶高程（m）" name="crestElev">
                    <InputNumber style={{ width: '100%' }} step={0.01} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="净宽（m）" name="weirWidth">
                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="设计泄流（m³/s）" name="desFlow">
                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                  </Form.Item>
                </Col>
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

// ==================== 圩区 ====================

export const ConfigHydroPolderView: React.FC = () => {
  const [data, setData] = useState<PolderRecord[]>(() => [...polderInitial]);
  const [q, setQ] = useState<{
    plsCode: string;
    plsName: string;
    plsLoc: string;
    poldClas: string | undefined;
    poldProp: string | undefined;
    protectStd: string;
  }>({ plsCode: '', plsName: '', plsLoc: '', poldClas: undefined, poldProp: undefined, protectStd: '' });
  const [modal, setModal] = useState<{ open: boolean; mode: 'create' | 'edit' | 'detail'; record?: PolderRecord }>({ open: false, mode: 'create' });
  const [form] = Form.useForm<PolderRecord>();
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  useEffect(() => {
    setVisibleColumns(getDefaultVisibleColumnKeys(HYDRO_POLDER_COLUMN_DEFS));
  }, []);

  const closeModal = () => {
    setModal({ open: false, mode: 'create' });
    form.resetFields();
  };

  const filtered = useMemo(
    () =>
      data.filter(r => {
        const c = q.plsCode.trim();
        const n = q.plsName.trim();
        const loc = q.plsLoc.trim();
        const ps = q.protectStd.trim();
        if (c && !r.plsCode.includes(c)) return false;
        if (n && !r.plsName.includes(n)) return false;
        if (loc && !r.plsLoc.includes(loc)) return false;
        if (ps && !String(r.protectStd ?? '').includes(ps)) return false;
        if (q.poldClas && r.poldClas !== q.poldClas) return false;
        if (q.poldProp && r.poldProp !== q.poldProp) return false;
        return true;
      }),
    [data, q]
  );

  const submit = async () => {
    const v = await form.validateFields();
    if (modal.mode === 'create') {
      setData([...data, { ...v, id: genId('PLS') }]);
      message.success('已新增圩区（原型）');
    } else if (modal.mode === 'edit' && modal.record) {
      setData(data.map(d => (d.id === modal.record!.id ? { ...d, ...v } : d)));
      message.success('已保存（原型）');
    }
    closeModal();
  };

  const handleDelete = () => {
    if (modal.record) {
      setData(data.filter(d => d.id !== modal.record!.id));
      message.success('已删除（原型）');
      closeModal();
    }
  };

  const tableColumns = useMemo(
    () =>
      buildTableColumnsFromConfig<PolderRecord>(HYDRO_POLDER_COLUMN_DEFS, visibleColumns, record => (
        <Space size={4} wrap={false} className="system-mgmt-table-op">
          <Button type="link" className="action-btn detail" size="small" icon={<EyeOutlined />} onClick={() => { form.setFieldsValue(record); setModal({ open: true, mode: 'detail', record }); }}>详情</Button>
          <Button type="link" className="action-btn edit" size="small" icon={<EditOutlined />} onClick={() => { form.setFieldsValue(record); setModal({ open: true, mode: 'edit', record }); }}>编辑</Button>
        </Space>
      )),
    [visibleColumns]
  );

  return (
    <div className="facility-view">
      <Card
        title="水利工程信息（圩区）"
        extra={
          <Space wrap size={[8, 8]} align="center">
            <Button
              icon={<DownloadOutlined />}
              className="export-btn"
              onClick={() =>
                runHydroListExport(
                  filtered as unknown as Record<string, unknown>[],
                  HYDRO_POLDER_COLUMN_DEFS,
                  '水利工程_圩区',
                  '圩区',
                  HYDRO_POLDER_EXPORT_FMT,
                )
              }
            >
              导出Excel
            </Button>
            <Upload beforeUpload={() => { message.success('已导入（原型）'); return false; }} showUploadList={false}><Button icon={<UploadOutlined />}>导入</Button></Upload>
            <ColumnManager columns={HYDRO_POLDER_COLUMN_DEFS} visibleColumns={visibleColumns} onChange={setVisibleColumns} />
            <Button
              type="primary"
              className="add-btn"
              icon={<PlusOutlined />}
              onClick={() => {
                form.resetFields();
                form.setFieldsValue({
                  poiLong: null,
                  poiLat: null,
                  lowLeftLong: null,
                  lowLeftLat: null,
                  upRightLong: null,
                  upRightLat: null,
                  poldClas: '3',
                  poldProp: '1',
                  desFlFlow: null,
                  desStorCap: null,
                  opPr: '',
                  protectStd: '',
                  polderArea: null,
                  cultArea: null,
                  drainCap: null,
                  pumpNum: null,
                  startDate: '',
                  compDate: '',
                  note: ''
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
            <Col {...CFG_FILTER_COL_FIELD}><Input placeholder="圩区代码" value={q.plsCode} onChange={e => setQ({ ...q, plsCode: e.target.value })} allowClear /></Col>
            <Col {...CFG_FILTER_COL_FIELD}><Input placeholder="圩区名称" value={q.plsName} onChange={e => setQ({ ...q, plsName: e.target.value })} allowClear /></Col>
            <Col {...CFG_FILTER_COL_FIELD}><Input placeholder="所在位置" value={q.plsLoc} onChange={e => setQ({ ...q, plsLoc: e.target.value })} allowClear /></Col>
            <Col {...CFG_FILTER_COL_FIELD}><Input placeholder="防洪标准" value={q.protectStd} onChange={e => setQ({ ...q, protectStd: e.target.value })} allowClear /></Col>
          </Row>
          <Row className="config-center-filter-row" gutter={[12, 12]} align="bottom" style={{ marginTop: 4 }}>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Select
                placeholder="圩垸分类"
                allowClear
                style={{ width: '100%' }}
                options={POLD_CLAS_OPTIONS}
                value={q.poldClas}
                onChange={v => setQ({ ...q, poldClas: v })}
              />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Select
                placeholder="平垸性质"
                allowClear
                style={{ width: '100%' }}
                options={POLD_PROP_OPTIONS}
                value={q.poldProp}
                onChange={v => setQ({ ...q, poldProp: v })}
              />
            </Col>
            <Col {...CFG_FILTER_COL_QUERY}>
              <Space>
                <Button type="primary" className="search-btn" icon={<SearchOutlined />} onClick={() => message.success('已查询')}>查询</Button>
                <Button onClick={() => setQ({})}>重置</Button>
              </Space>
            </Col>
          </Row>
        </div>
        <div className="facility-table-wrap">
          <Table size="small" rowKey="id" scroll={{ x: 'max-content' }} dataSource={filtered} columns={tableColumns} pagination={{ pageSize: 10, showTotal: t => `共 ${t} 条` }} />
        </div>
        <Modal styles={formModalStyles} wrapClassName={CONFIG_CENTER_MODAL_WRAP_CLASS} title={modal.mode === 'create' ? '新增圩区' : modal.mode === 'detail' ? '圩区详情' : '编辑圩区'} open={modal.open} onCancel={closeModal} width={1000} destroyOnClose
          footer={modal.mode === 'detail' ? null : <Space>{modal.mode === 'edit' && <Popconfirm title="确认删除该条记录？" onConfirm={handleDelete}><Button danger>删除</Button></Popconfirm>}<Button onClick={closeModal}>取消</Button><Button type="primary" onClick={submit}>保存</Button></Space>}
        >
          {modal.mode === 'detail' && modal.record ? (
            <ConfigCenterDetailTabs>
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="内部编号" span={2}>
                  {configCenterDetailText(modal.record.id)}
                </Descriptions.Item>
                <Descriptions.Item label="圩区代码">{configCenterDetailText(modal.record.plsCode)}</Descriptions.Item>
                <Descriptions.Item label="圩区名称">{configCenterDetailText(modal.record.plsName)}</Descriptions.Item>
                <Descriptions.Item label="所在位置" span={2}>
                  {configCenterDetailText(modal.record.plsLoc)}
                </Descriptions.Item>
                <Descriptions.Item label="地图经度（POI）">{configCenterDetailNum(modal.record.poiLong, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="地图纬度（POI）">{configCenterDetailNum(modal.record.poiLat, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="所在位置地图（POI）" span={2}>
                  <AddrWgs84DetailMap
                    title={String(modal.record.plsName ?? '')}
                    location={modal.record.plsLoc}
                    lng={modal.record.poiLong}
                    lat={modal.record.poiLat}
                    mapAriaLabel="圩区位置地图"
                  />
                </Descriptions.Item>
                <Descriptions.Item label="左下角经度">{configCenterDetailNum(modal.record.lowLeftLong, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="左下角纬度">{configCenterDetailNum(modal.record.lowLeftLat, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="右上角经度">{configCenterDetailNum(modal.record.upRightLong, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="右上角纬度">{configCenterDetailNum(modal.record.upRightLat, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="圩垸分类">{configCenterOptLabel(POLD_CLAS_OPTIONS, modal.record.poldClas)}</Descriptions.Item>
                <Descriptions.Item label="平垸性质">{configCenterOptLabel(POLD_PROP_OPTIONS, modal.record.poldProp)}</Descriptions.Item>
                <Descriptions.Item label="设计排涝流量（m³/s）">{configCenterDetailNum(modal.record.desFlFlow)}</Descriptions.Item>
                <Descriptions.Item label="设计蓄滞容积（10⁴m³）">{configCenterDetailNum(modal.record.desStorCap)}</Descriptions.Item>
                <Descriptions.Item label="运用原则" span={2}>
                  {configCenterDetailText(modal.record.opPr)}
                </Descriptions.Item>
                <Descriptions.Item label="防洪（潮）标准">{configCenterDetailText(modal.record.protectStd)}</Descriptions.Item>
                <Descriptions.Item label="圩区面积（km²）">{configCenterDetailNum(modal.record.polderArea)}</Descriptions.Item>
                <Descriptions.Item label="耕园面积（km²）">{configCenterDetailNum(modal.record.cultArea)}</Descriptions.Item>
                <Descriptions.Item label="排涝能力（m³/s）">{configCenterDetailNum(modal.record.drainCap)}</Descriptions.Item>
                <Descriptions.Item label="排涝泵站台数">{configCenterDetailNum(modal.record.pumpNum)}</Descriptions.Item>
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

              <Title level={5} style={{ marginTop: 0 }}>基础信息</Title>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="圩区代码" name="plsCode" rules={[{ required: true }]}>
                    <Input maxLength={18} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="圩区名称" name="plsName" rules={[{ required: true }]}>
                    <Input maxLength={100} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_FULL}>
                  <Form.Item label="所在位置" name="plsLoc" rules={[{ required: true }]} extra={ADDR_MAP_FORM_ITEM_EXTRA}>
                    <Input.TextArea rows={1} maxLength={256} placeholder={ADDR_MAP_INPUT_PLACEHOLDER} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_FULL}>
                  <Form.Item label="圩区位置地图（POI）" colon={false}>
                    <AddrWgs84MapPicker
                      form={form}
                      addrField="plsLoc"
                      lngField="poiLong"
                      latField="poiLat"
                      mapAriaLabel="圩区位置地图"
                      hintAddressLabel="所在位置"
                      lngLatValueMode="number"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="地图经度（POI）" name="poiLong" tooltip={ADDR_MAP_POI_COORD_TOOLTIP}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="地图纬度（POI）" name="poiLat" tooltip={ADDR_MAP_POI_COORD_TOOLTIP}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="左下角经度" name="lowLeftLong" tooltip={ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="左下角纬度" name="lowLeftLat" tooltip={ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="右上角经度" name="upRightLong" tooltip={ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="右上角纬度" name="upRightLat" tooltip={ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} />
                  </Form.Item>
                </Col>
              </Row>
              <Divider style={{ margin: '16px 0' }} />
              <Title level={5}>工程与排涝</Title>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="圩垸分类" name="poldClas" rules={[{ required: true }]}>
                    <Select options={POLD_CLAS_OPTIONS} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="平垸性质" name="poldProp" rules={[{ required: true }]}>
                    <Select options={POLD_PROP_OPTIONS} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="设计排涝流量（m³/s）" name="desFlFlow">
                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="设计蓄滞容积（10⁴m³）" name="desStorCap">
                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="防洪（潮）标准" name="protectStd">
                    <Input maxLength={64} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="圩区面积（km²）" name="polderArea">
                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_FULL}>
                  <Form.Item label="运用原则" name="opPr">
                    <Input.TextArea rows={1} maxLength={512} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="耕园面积（km²）" name="cultArea">
                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="排涝能力（m³/s）" name="drainCap">
                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="排涝泵站台数" name="pumpNum">
                    <InputNumber style={{ width: '100%' }} min={0} precision={0} />
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

// ==================== 山塘 ====================

export const ConfigHydroHillpondView: React.FC = () => {
  const [data, setData] = useState<HillpondRecord[]>(() => [...hillpondInitial]);
  const [q, setQ] = useState<{
    stuCode: string;
    stuName: string;
    stuLoc: string;
    engScal: string | undefined;
    engStat: string | undefined;
  }>({ stuCode: '', stuName: '', stuLoc: '', engScal: undefined, engStat: undefined });
  const [modal, setModal] = useState<{ open: boolean; mode: 'create' | 'edit' | 'detail'; record?: HillpondRecord }>({ open: false, mode: 'create' });
  const [form] = Form.useForm<HillpondRecord>();
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  useEffect(() => {
    setVisibleColumns(getDefaultVisibleColumnKeys(HYDRO_HILLPOND_COLUMN_DEFS));
  }, []);

  const closeModal = () => {
    setModal({ open: false, mode: 'create' });
    form.resetFields();
  };

  const filtered = useMemo(
    () =>
      data.filter(r => {
        const c = q.stuCode.trim();
        const n = q.stuName.trim();
        const loc = q.stuLoc.trim();
        if (c && !r.stuCode.includes(c)) return false;
        if (n && !r.stuName.includes(n)) return false;
        if (loc && !r.stuLoc.includes(loc)) return false;
        if (q.engScal && r.engScal !== q.engScal) return false;
        if (q.engStat && r.engStat !== q.engStat) return false;
        return true;
      }),
    [data, q]
  );

  const submit = async () => {
    const v = await form.validateFields();
    if (modal.mode === 'create') {
      setData([...data, { ...v, id: genId('STU') }]);
      message.success('已新增山塘（原型）');
    } else if (modal.mode === 'edit' && modal.record) {
      setData(data.map(d => (d.id === modal.record!.id ? { ...d, ...v } : d)));
      message.success('已保存（原型）');
    }
    closeModal();
  };

  const handleDelete = () => {
    if (modal.record) {
      setData(data.filter(d => d.id !== modal.record!.id));
      message.success('已删除（原型）');
      closeModal();
    }
  };

  const tableColumns = useMemo(
    () =>
      buildTableColumnsFromConfig<HillpondRecord>(HYDRO_HILLPOND_COLUMN_DEFS, visibleColumns, record => (
        <Space size={4} wrap={false} className="system-mgmt-table-op">
          <Button type="link" className="action-btn detail" size="small" icon={<EyeOutlined />} onClick={() => { form.setFieldsValue(record); setModal({ open: true, mode: 'detail', record }); }}>详情</Button>
          <Button type="link" className="action-btn edit" size="small" icon={<EditOutlined />} onClick={() => { form.setFieldsValue(record); setModal({ open: true, mode: 'edit', record }); }}>编辑</Button>
        </Space>
      )),
    [visibleColumns]
  );

  return (
    <div className="facility-view">
      <Card
        title="水利工程信息（山塘）"
        extra={
          <Space wrap size={[8, 8]} align="center">
            <Button
              icon={<DownloadOutlined />}
              className="export-btn"
              onClick={() =>
                runHydroListExport(
                  filtered as unknown as Record<string, unknown>[],
                  HYDRO_HILLPOND_COLUMN_DEFS,
                  '水利工程_山塘',
                  '山塘',
                  HYDRO_HILL_EXPORT_FMT,
                )
              }
            >
              导出Excel
            </Button>
            <Upload beforeUpload={() => { message.success('已导入（原型）'); return false; }} showUploadList={false}><Button icon={<UploadOutlined />}>导入</Button></Upload>
            <ColumnManager columns={HYDRO_HILLPOND_COLUMN_DEFS} visibleColumns={visibleColumns} onChange={setVisibleColumns} />
            <Button
              type="primary"
              className="add-btn"
              icon={<PlusOutlined />}
              onClick={() => {
                form.resetFields();
                form.setFieldsValue({
                  engScal: '3',
                  poiLong: null,
                  poiLat: null,
                  lowLeftLong: null,
                  lowLeftLat: null,
                  upRightLong: null,
                  upRightLat: null,
                  watShedArea: null,
                  normWatLev: null,
                  totVol: null,
                  engStat: '1',
                  admDep: '1',
                  startDate: '',
                  compDate: '',
                  note: ''
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
            <Col {...CFG_FILTER_COL_FIELD}><Input placeholder="山塘代码" value={q.stuCode} onChange={e => setQ({ ...q, stuCode: e.target.value })} allowClear /></Col>
            <Col {...CFG_FILTER_COL_FIELD}><Input placeholder="山塘名称" value={q.stuName} onChange={e => setQ({ ...q, stuName: e.target.value })} allowClear /></Col>
            <Col {...CFG_FILTER_COL_FIELD}><Input placeholder="所在位置" value={q.stuLoc} onChange={e => setQ({ ...q, stuLoc: e.target.value })} allowClear /></Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Select
                placeholder="塘坝规模"
                allowClear
                style={{ width: '100%' }}
                options={POND_ENG_SCAL_OPTIONS}
                value={q.engScal}
                onChange={v => setQ({ ...q, engScal: v })}
              />
            </Col>
          </Row>
          <Row className="config-center-filter-row" gutter={[12, 12]} align="bottom" style={{ marginTop: 4 }}>
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
                <Button type="primary" className="search-btn" icon={<SearchOutlined />} onClick={() => message.success('已查询')}>查询</Button>
                <Button onClick={() => setQ({})}>重置</Button>
              </Space>
            </Col>
          </Row>
        </div>
        <div className="facility-table-wrap">
          <Table size="small" rowKey="id" scroll={{ x: 'max-content' }} dataSource={filtered} columns={tableColumns} pagination={{ pageSize: 10, showTotal: t => `共 ${t} 条` }} />
        </div>
        <Modal styles={formModalStyles} wrapClassName={CONFIG_CENTER_MODAL_WRAP_CLASS} title={modal.mode === 'create' ? '新增山塘' : modal.mode === 'detail' ? '山塘详情' : '编辑山塘'} open={modal.open} onCancel={closeModal} width={1000} destroyOnClose
          footer={modal.mode === 'detail' ? null : <Space>{modal.mode === 'edit' && <Popconfirm title="确认删除该条记录？" onConfirm={handleDelete}><Button danger>删除</Button></Popconfirm>}<Button onClick={closeModal}>取消</Button><Button type="primary" onClick={submit}>保存</Button></Space>}
        >
          {modal.mode === 'detail' && modal.record ? (
            <ConfigCenterDetailTabs>
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="内部编号" span={2}>
                  {configCenterDetailText(modal.record.id)}
                </Descriptions.Item>
                <Descriptions.Item label="山塘代码">{configCenterDetailText(modal.record.stuCode)}</Descriptions.Item>
                <Descriptions.Item label="山塘名称">{configCenterDetailText(modal.record.stuName)}</Descriptions.Item>
                <Descriptions.Item label="所在位置" span={2}>
                  {configCenterDetailText(modal.record.stuLoc)}
                </Descriptions.Item>
                <Descriptions.Item label="地图经度（POI）">{configCenterDetailNum(modal.record.poiLong, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="地图纬度（POI）">{configCenterDetailNum(modal.record.poiLat, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="所在位置地图（POI）" span={2}>
                  <AddrWgs84DetailMap
                    title={String(modal.record.stuName ?? '')}
                    location={modal.record.stuLoc}
                    lng={modal.record.poiLong}
                    lat={modal.record.poiLat}
                    mapAriaLabel="山塘位置地图"
                  />
                </Descriptions.Item>
                <Descriptions.Item label="左下角经度">{configCenterDetailNum(modal.record.lowLeftLong, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="左下角纬度">{configCenterDetailNum(modal.record.lowLeftLat, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="右上角经度">{configCenterDetailNum(modal.record.upRightLong, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="右上角纬度">{configCenterDetailNum(modal.record.upRightLat, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="塘坝规模">{configCenterOptLabel(POND_ENG_SCAL_OPTIONS, modal.record.engScal)}</Descriptions.Item>
                <Descriptions.Item label="集雨面积（km²）">{configCenterDetailNum(modal.record.watShedArea)}</Descriptions.Item>
                <Descriptions.Item label="正常水位（m）">{configCenterDetailNum(modal.record.normWatLev)}</Descriptions.Item>
                <Descriptions.Item label="总容积（10⁴m³）">{configCenterDetailNum(modal.record.totVol)}</Descriptions.Item>
                <Descriptions.Item label="工程建设情况">{configCenterOptLabel(ENG_STAT_OPTIONS, modal.record.engStat)}</Descriptions.Item>
                <Descriptions.Item label="归口管理部门">{configCenterOptLabel(ADM_DEP_OPTIONS, modal.record.admDep)}</Descriptions.Item>
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

              <Title level={5} style={{ marginTop: 0 }}>基础信息</Title>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="山塘代码" name="stuCode" rules={[{ required: true }]}>
                    <Input maxLength={18} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="山塘名称" name="stuName" rules={[{ required: true }]}>
                    <Input maxLength={100} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_FULL}>
                  <Form.Item label="所在位置" name="stuLoc" rules={[{ required: true }]} extra={ADDR_MAP_FORM_ITEM_EXTRA}>
                    <Input.TextArea rows={1} maxLength={256} placeholder={ADDR_MAP_INPUT_PLACEHOLDER} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_FULL}>
                  <Form.Item label="山塘位置地图（POI）" colon={false}>
                    <AddrWgs84MapPicker
                      form={form}
                      addrField="stuLoc"
                      lngField="poiLong"
                      latField="poiLat"
                      mapAriaLabel="山塘位置地图"
                      hintAddressLabel="所在位置"
                      lngLatValueMode="number"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="地图经度（POI）" name="poiLong" tooltip={ADDR_MAP_POI_COORD_TOOLTIP}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="地图纬度（POI）" name="poiLat" tooltip={ADDR_MAP_POI_COORD_TOOLTIP}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="左下角经度" name="lowLeftLong" tooltip={ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="左下角纬度" name="lowLeftLat" tooltip={ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="右上角经度" name="upRightLong" tooltip={ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="右上角纬度" name="upRightLat" tooltip={ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} />
                  </Form.Item>
                </Col>
              </Row>
              <Divider style={{ margin: '16px 0' }} />
              <Title level={5}>工程特征</Title>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="塘坝规模" name="engScal" rules={[{ required: true }]}>
                    <Select options={POND_ENG_SCAL_OPTIONS} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="集雨面积（km²）" name="watShedArea">
                    <InputNumber style={{ width: '100%' }} min={0} step={0.001} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="正常水位（m）" name="normWatLev">
                    <InputNumber style={{ width: '100%' }} step={0.01} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="总容积（10⁴m³）" name="totVol">
                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                  </Form.Item>
                </Col>
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

// ==================== 河流 ====================

export const ConfigHydroRiverView: React.FC = () => {
  const [data, setData] = useState<RiverRecord[]>(() => [...riverInitial]);
  const [q, setQ] = useState<{
    rvCode: string;
    rvName: string;
    crOverType: string | undefined;
    rvType: string | undefined;
    rvGrad: string | undefined;
  }>({ rvCode: '', rvName: '', crOverType: undefined, rvType: undefined, rvGrad: undefined });
  const [modal, setModal] = useState<{ open: boolean; mode: 'create' | 'edit' | 'detail'; record?: RiverRecord }>({ open: false, mode: 'create' });
  const [form] = Form.useForm<RiverRecord>();
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  useEffect(() => {
    setVisibleColumns(getDefaultVisibleColumnKeys(HYDRO_RIVER_COLUMN_DEFS));
  }, []);

  const closeModal = () => {
    setModal({ open: false, mode: 'create' });
    form.resetFields();
  };

  const filtered = useMemo(
    () =>
      data.filter(r => {
        const c = q.rvCode.trim();
        const n = q.rvName.trim();
        if (c && !r.rvCode.includes(c)) return false;
        if (n && !r.rvName.includes(n)) return false;
        if (q.crOverType && r.crOverType !== q.crOverType) return false;
        if (q.rvType && r.rvType !== q.rvType) return false;
        if (q.rvGrad && r.rvGrad !== q.rvGrad) return false;
        return true;
      }),
    [data, q]
  );

  const submit = async () => {
    const v = await form.validateFields();
    if (modal.mode === 'create') {
      setData([...data, { ...v, id: genId('RIV') }]);
      message.success('已新增河流（原型）');
    } else if (modal.mode === 'edit' && modal.record) {
      setData(data.map(d => (d.id === modal.record!.id ? { ...d, ...v } : d)));
      message.success('已保存（原型）');
    }
    closeModal();
  };

  const handleDelete = () => {
    if (modal.record) {
      setData(data.filter(d => d.id !== modal.record!.id));
      message.success('已删除（原型）');
      closeModal();
    }
  };

  const tableColumns = useMemo(
    () =>
      buildTableColumnsFromConfig<RiverRecord>(HYDRO_RIVER_COLUMN_DEFS, visibleColumns, record => (
        <Space size={4} wrap={false} className="system-mgmt-table-op">
          <Button type="link" className="action-btn detail" size="small" icon={<EyeOutlined />} onClick={() => { form.setFieldsValue(record); setModal({ open: true, mode: 'detail', record }); }}>详情</Button>
          <Button type="link" className="action-btn edit" size="small" icon={<EditOutlined />} onClick={() => { form.setFieldsValue(record); setModal({ open: true, mode: 'edit', record }); }}>编辑</Button>
        </Space>
      )),
    [visibleColumns]
  );

  return (
    <div className="facility-view">
      <Card
        title="水利工程信息（河流）"
        extra={
          <Space wrap size={[8, 8]} align="center">
            <Button
              icon={<DownloadOutlined />}
              className="export-btn"
              onClick={() =>
                runHydroListExport(
                  filtered as unknown as Record<string, unknown>[],
                  HYDRO_RIVER_COLUMN_DEFS,
                  '水利工程_河流',
                  '河流',
                  HYDRO_RIVER_EXPORT_FMT,
                )
              }
            >
              导出Excel
            </Button>
            <Upload beforeUpload={() => { message.success('已导入（原型）'); return false; }} showUploadList={false}><Button icon={<UploadOutlined />}>导入</Button></Upload>
            <ColumnManager columns={HYDRO_RIVER_COLUMN_DEFS} visibleColumns={visibleColumns} onChange={setVisibleColumns} />
            <Button
              type="primary"
              className="add-btn"
              icon={<PlusOutlined />}
              onClick={() => {
                form.resetFields();
                form.setFieldsValue({
                  rvSourLong: null,
                  rvSourLat: null,
                  rvMouLong: null,
                  rvMouLat: null,
                  rvSourLoc: '',
                  rvMouLoc: '',
                  crOverType: '6',
                  flowArea: '',
                  rvType: '1',
                  rvGrad: '3',
                  bank: '0',
                  rvLen: null,
                  rvBasArea: null,
                  averSlop: null,
                  note: ''
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
            <Col {...CFG_FILTER_COL_FIELD}><Input placeholder="河流代码" value={q.rvCode} onChange={e => setQ({ ...q, rvCode: e.target.value })} allowClear /></Col>
            <Col {...CFG_FILTER_COL_FIELD}><Input placeholder="河流名称" value={q.rvName} onChange={e => setQ({ ...q, rvName: e.target.value })} allowClear /></Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Select
                placeholder="跨界类型"
                allowClear
                style={{ width: '100%' }}
                options={CR_OVER_TYPE_OPTIONS}
                value={q.crOverType}
                onChange={v => setQ({ ...q, crOverType: v })}
              />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Select
                placeholder="河流类型"
                allowClear
                style={{ width: '100%' }}
                options={RV_TYPE_OPTIONS}
                value={q.rvType}
                onChange={v => setQ({ ...q, rvType: v })}
              />
            </Col>
          </Row>
          <Row className="config-center-filter-row" gutter={[12, 12]} align="bottom" style={{ marginTop: 4 }}>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Select
                placeholder="河流级别"
                allowClear
                style={{ width: '100%' }}
                options={RV_STREAM_GRAD_OPTIONS}
                value={q.rvGrad}
                onChange={v => setQ({ ...q, rvGrad: v })}
              />
            </Col>
            <Col {...CFG_FILTER_COL_QUERY}>
              <Space>
                <Button type="primary" className="search-btn" icon={<SearchOutlined />} onClick={() => message.success('已查询')}>查询</Button>
                <Button onClick={() => setQ({})}>重置</Button>
              </Space>
            </Col>
          </Row>
        </div>
        <div className="facility-table-wrap">
          <Table size="small" rowKey="id" scroll={{ x: 'max-content' }} dataSource={filtered} columns={tableColumns} pagination={{ pageSize: 10, showTotal: t => `共 ${t} 条` }} />
        </div>
        <Modal styles={formModalStyles} wrapClassName={CONFIG_CENTER_MODAL_WRAP_CLASS} title={modal.mode === 'create' ? '新增河流' : modal.mode === 'detail' ? '河流详情' : '编辑河流'} open={modal.open} onCancel={closeModal} width={1000} destroyOnClose
          footer={modal.mode === 'detail' ? null : <Space>{modal.mode === 'edit' && <Popconfirm title="确认删除该条记录？" onConfirm={handleDelete}><Button danger>删除</Button></Popconfirm>}<Button onClick={closeModal}>取消</Button><Button type="primary" onClick={submit}>保存</Button></Space>}
        >
          {modal.mode === 'detail' && modal.record ? (
            <ConfigCenterDetailTabs>
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="内部编号" span={2}>
                  {configCenterDetailText(modal.record.id)}
                </Descriptions.Item>
                <Descriptions.Item label="河流代码">{configCenterDetailText(modal.record.rvCode)}</Descriptions.Item>
                <Descriptions.Item label="河流名称">{configCenterDetailText(modal.record.rvName)}</Descriptions.Item>
                <Descriptions.Item label="河源经度">{configCenterDetailNum(modal.record.rvSourLong, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="河源纬度">{configCenterDetailNum(modal.record.rvSourLat, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="河口经度">{configCenterDetailNum(modal.record.rvMouLong, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="河口纬度">{configCenterDetailNum(modal.record.rvMouLat, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="河源位置地图" span={2}>
                  <AddrWgs84DetailMap
                    title={String(modal.record.rvName ?? '')}
                    location={modal.record.rvSourLoc}
                    lng={modal.record.rvSourLong}
                    lat={modal.record.rvSourLat}
                    mapAriaLabel="河流河源位置地图"
                  />
                </Descriptions.Item>
                <Descriptions.Item label="河口位置地图" span={2}>
                  <AddrWgs84DetailMap
                    title={String(modal.record.rvName ?? '')}
                    location={modal.record.rvMouLoc}
                    lng={modal.record.rvMouLong}
                    lat={modal.record.rvMouLat}
                    mapAriaLabel="河流河口位置地图"
                  />
                </Descriptions.Item>
                <Descriptions.Item label="河源所在位置" span={2}>
                  {configCenterDetailText(modal.record.rvSourLoc)}
                </Descriptions.Item>
                <Descriptions.Item label="河口所在位置" span={2}>
                  {configCenterDetailText(modal.record.rvMouLoc)}
                </Descriptions.Item>
                <Descriptions.Item label="跨界类型">{configCenterOptLabel(CR_OVER_TYPE_OPTIONS, modal.record.crOverType)}</Descriptions.Item>
                <Descriptions.Item label="流经区域" span={2}>
                  {configCenterDetailText(modal.record.flowArea)}
                </Descriptions.Item>
                <Descriptions.Item label="河流类型">{configCenterOptLabel(RV_TYPE_OPTIONS, modal.record.rvType)}</Descriptions.Item>
                <Descriptions.Item label="河流级别">{configCenterOptLabel(RV_STREAM_GRAD_OPTIONS, modal.record.rvGrad)}</Descriptions.Item>
                <Descriptions.Item label="岸别">{configCenterOptLabel(BANK_OPTIONS, modal.record.bank)}</Descriptions.Item>
                <Descriptions.Item label="河长（km）">{configCenterDetailNum(modal.record.rvLen)}</Descriptions.Item>
                <Descriptions.Item label="流域面积（km²）">{configCenterDetailNum(modal.record.rvBasArea)}</Descriptions.Item>
                <Descriptions.Item label="平均比降（‰）">{configCenterDetailNum(modal.record.averSlop)}</Descriptions.Item>
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

              <Title level={5} style={{ marginTop: 0 }}>基础信息</Title>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="河流代码" name="rvCode" rules={[{ required: true }]}>
                    <Input maxLength={18} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="河流名称" name="rvName" rules={[{ required: true }]}>
                    <Input maxLength={100} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="跨界类型" name="crOverType" rules={[{ required: true }]}>
                    <Select options={CR_OVER_TYPE_OPTIONS} />
                  </Form.Item>
                </Col>
              </Row>
              <Divider style={{ margin: '16px 0' }} />
              <Title level={5}>位置与岸线</Title>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="河源经度" name="rvSourLong" tooltip="可与地图选点同步">
                    <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="河源纬度" name="rvSourLat" tooltip="可与地图选点同步">
                    <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="河口经度" name="rvMouLong">
                    <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="河口纬度" name="rvMouLat">
                    <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="河流类型" name="rvType" rules={[{ required: true }]}>
                    <Select options={RV_TYPE_OPTIONS} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="河流级别" name="rvGrad" rules={[{ required: true }]}>
                    <Select options={RV_STREAM_GRAD_OPTIONS} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_HALF}>
                  <Form.Item label="河源所在位置" name="rvSourLoc" rules={[{ required: true }]} extra={ADDR_MAP_FORM_ITEM_EXTRA}>
                    <Input.TextArea rows={1} maxLength={256} placeholder={ADDR_MAP_INPUT_PLACEHOLDER} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_HALF}>
                  <Form.Item label="河口所在位置" name="rvMouLoc" rules={[{ required: true }]}>
                    <Input.TextArea rows={1} maxLength={256} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_FULL}>
                  <Form.Item label="河源位置地图" colon={false}>
                    <AddrWgs84MapPicker
                      form={form}
                      addrField="rvSourLoc"
                      lngField="rvSourLong"
                      latField="rvSourLat"
                      mapAriaLabel="河流河源位置地图"
                      hintAddressLabel="河源所在位置"
                      lngLatValueMode="number"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_FULL}>
                  <Form.Item label="流经区域" name="flowArea" rules={[{ required: true }]}>
                    <Input.TextArea rows={1} maxLength={256} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="岸别" name="bank" rules={[{ required: true }]}>
                    <Select options={BANK_OPTIONS} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="河长（km）" name="rvLen">
                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="流域面积（km²）" name="rvBasArea">
                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="平均比降（‰）" name="averSlop">
                    <InputNumber style={{ width: '100%' }} min={0} step={0.001} />
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
