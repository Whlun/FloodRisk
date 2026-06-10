/**
 * 配置中心 · 流域信息（ATT_BAS_BASE / sl_att_bas_base）
 * 交互对齐水资源类配置子页：筛选、全量字段 Excel 导出、导入占位、字段管理、详情/编辑、编辑内删除
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
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
import {
  BAS_GRAD_OPTIONS,
  BAS_TYPE_OPTIONS,
  CR_OVER_TYPE_OPTIONS,
  watershedInitial,
  type WatershedRecord
} from './config-center-data';
import { parseBoundaryFileToCorners } from './watershed-boundary-parse';
import { RIVER_FLOW_AREA_ADDVCD_OPTIONS } from '../生态整治/riverChiefDb4401';
import {
  ConfigCenterDetailTabs,
  configCenterDetailNum,
  configCenterDetailText,
  configCenterOptLabel
} from './config-center-detail-eco';
import {
  ColumnManager,
  buildTableColumnsFromConfig,
  getDefaultVisibleColumnKeys,
  type ColumnConfig
} from './config-center-column-manager';
import { formModalStyles, CONFIG_CENTER_MODAL_WRAP_CLASS } from './config-center-views';
import { downloadTableFullExcel, exportOptLabel } from '../shared/facilityTableXlsxExport';

const { Title, Text } = Typography;

const FLOW_ADM_LABEL = new Map(RIVER_FLOW_AREA_ADDVCD_OPTIONS.map(o => [o.value, o.label] as const));

function formatFlowAdmRegDisplay(codes: string[] | undefined): string {
  if (!codes?.length) return '—';
  return codes.map(c => FLOW_ADM_LABEL.get(c) ?? c).join('、');
}

/** 导出：空为空白，与列表「涉及行政区」文案一致（顿号分隔） */
function formatFlowAdmRegExcel(codes: unknown): string {
  if (!Array.isArray(codes) || codes.length === 0) return '';
  return codes.map(c => FLOW_ADM_LABEL.get(String(c)) ?? String(c)).join('、');
}

const WATERSHED_EXPORT_FMT: Record<string, (raw: unknown) => string | number> = {
  basType: v => exportOptLabel(BAS_TYPE_OPTIONS, v),
  basGrad: v => exportOptLabel(BAS_GRAD_OPTIONS, v),
  crOverType: v => exportOptLabel(CR_OVER_TYPE_OPTIONS, v),
  flowAdmReg: formatFlowAdmRegExcel,
};

const genId = (prefix: string) => `${prefix}-${Date.now()}`;

const CFG_FILTER_COL_FIELD = { xs: { flex: '1 1 100%' }, sm: { flex: '0 0 200px' } };
const CFG_FILTER_COL_QUERY = { xs: { flex: '1 1 100%' }, sm: { flex: 'none' } };
const CFG_FORM_GUTTER: [number, number] = [16, 16];
const CFG_FORM_COL_THIRD = { xs: 24 as const, sm: 12 as const, lg: 8 as const };
const CFG_FORM_COL_FULL = { xs: 24 as const, sm: 24 as const };

const WATERSHED_COLUMN_DEFS: ColumnConfig[] = [
  { key: 'basCode', title: '流域代码', dataIndex: 'basCode', width: 190, defaultVisible: true },
  { key: 'basName', title: '流域名称', dataIndex: 'basName', width: 200, defaultVisible: true },
  {
    key: 'basType',
    title: '流域类型',
    dataIndex: 'basType',
    width: 140,
    defaultVisible: true,
    render: (v: unknown) => BAS_TYPE_OPTIONS.find(o => o.value === String(v ?? ''))?.label ?? String(v ?? '')
  },
  {
    key: 'basGrad',
    title: '流域级别',
    dataIndex: 'basGrad',
    width: 110,
    defaultVisible: true,
    render: (v: unknown) => BAS_GRAD_OPTIONS.find(o => o.value === String(v ?? ''))?.label ?? String(v ?? '')
  },
  { key: 'basArea', title: '流域面积(km²)', dataIndex: 'basArea', width: 120, defaultVisible: true },
  {
    key: 'crOverType',
    title: '跨界类型',
    dataIndex: 'crOverType',
    width: 120,
    defaultVisible: false,
    render: (v: unknown) => CR_OVER_TYPE_OPTIONS.find(o => o.value === String(v ?? ''))?.label ?? String(v ?? '')
  },
  {
    key: 'flowAdmReg',
    title: '涉及行政区',
    dataIndex: 'flowAdmReg',
    width: 220,
    defaultVisible: true,
    render: (_: unknown, r: Record<string, unknown>) =>
      formatFlowAdmRegDisplay((r as unknown as WatershedRecord).flowAdmReg)
  },
  { key: 'note', title: '备注', dataIndex: 'note', defaultVisible: false },
  { key: 'operation', title: '操作', width: 168, fixed: 'right', defaultVisible: true }
];

function runWatershedExport(rows: WatershedRecord[]) {
  const recs = rows as unknown as Record<string, unknown>[];
  if (!recs.length) {
    message.warning('当前筛选条件下无数据可导出');
    return;
  }
  downloadTableFullExcel(recs, WATERSHED_COLUMN_DEFS, '配置中心_流域信息', '流域信息', { formatByKey: WATERSHED_EXPORT_FMT });
  message.success('已导出 Excel（全量字段）');
}

export const ConfigWatershedView: React.FC = () => {
  const [data, setData] = useState<WatershedRecord[]>(() => [...watershedInitial]);
  const [q, setQ] = useState<{ basCode: string; basName: string; basType: string | undefined; basGrad: string | undefined }>(
    { basCode: '', basName: '', basType: undefined, basGrad: undefined }
  );
  const [modal, setModal] = useState<{ open: boolean; mode: 'create' | 'edit' | 'detail'; record?: WatershedRecord }>({
    open: false,
    mode: 'create'
  });
  const [form] = Form.useForm<WatershedRecord>();
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  useEffect(() => {
    setVisibleColumns(getDefaultVisibleColumnKeys(WATERSHED_COLUMN_DEFS));
  }, []);

  const closeModal = () => {
    setModal({ open: false, mode: 'create' });
    form.resetFields();
  };

  const filtered = useMemo(
    () =>
      data.filter(r => {
        const c = q.basCode.trim();
        const n = q.basName.trim();
        if (c && !r.basCode.includes(c)) return false;
        if (n && !r.basName.includes(n)) return false;
        if (q.basType && r.basType !== q.basType) return false;
        if (q.basGrad && r.basGrad !== q.basGrad) return false;
        return true;
      }),
    [data, q]
  );

  const submit = async () => {
    const v = await form.validateFields();
    if (modal.mode === 'create') {
      setData([...data, { ...v, id: genId('BAS') }]);
      message.success('已新增流域（原型）');
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
      buildTableColumnsFromConfig<WatershedRecord>(WATERSHED_COLUMN_DEFS, visibleColumns, record => (
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
        title="流域信息"
        extra={
          <Space wrap size={[8, 8]} align="center">
            <Button icon={<DownloadOutlined />} className="export-btn" onClick={() => runWatershedExport(filtered)}>
              导出Excel
            </Button>
            <Upload beforeUpload={() => { message.success('已导入（原型）'); return false; }} showUploadList={false}>
              <Button icon={<UploadOutlined />}>导入</Button>
            </Upload>
            <ColumnManager columns={WATERSHED_COLUMN_DEFS} visibleColumns={visibleColumns} onChange={setVisibleColumns} />
            <Button
              type="primary"
              className="add-btn"
              icon={<PlusOutlined />}
              onClick={() => {
                form.resetFields();
                form.setFieldsValue({
                  basCode: '',
                  basName: '',
                  basType: '1',
                  basGrad: '3',
                  basArea: null,
                  crOverType: '6',
                  flowAdmReg: [],
                  extentNeLng: null,
                  extentNeLat: null,
                  extentSwLng: null,
                  extentSwLat: null,
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
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input placeholder="流域代码" value={q.basCode} onChange={e => setQ({ ...q, basCode: e.target.value })} allowClear />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Input placeholder="流域名称" value={q.basName} onChange={e => setQ({ ...q, basName: e.target.value })} allowClear />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Select
                placeholder="流域类型"
                allowClear
                style={{ width: '100%' }}
                options={BAS_TYPE_OPTIONS}
                value={q.basType}
                onChange={v => setQ({ ...q, basType: v })}
              />
            </Col>
            <Col {...CFG_FILTER_COL_FIELD}>
              <Select
                placeholder="流域级别"
                allowClear
                style={{ width: '100%' }}
                options={BAS_GRAD_OPTIONS}
                value={q.basGrad}
                onChange={v => setQ({ ...q, basGrad: v })}
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
          title={
            modal.mode === 'create' ? '新增流域' : modal.mode === 'detail' ? '流域详情' : '编辑流域'
          }
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
                <Descriptions.Item label="流域代码">{configCenterDetailText(modal.record.basCode)}</Descriptions.Item>
                <Descriptions.Item label="流域名称">{configCenterDetailText(modal.record.basName)}</Descriptions.Item>
                <Descriptions.Item label="流域类型">{configCenterOptLabel(BAS_TYPE_OPTIONS, modal.record.basType)}</Descriptions.Item>
                <Descriptions.Item label="流域级别">{configCenterOptLabel(BAS_GRAD_OPTIONS, modal.record.basGrad)}</Descriptions.Item>
                <Descriptions.Item label="流域面积（km²）">{configCenterDetailNum(modal.record.basArea)}</Descriptions.Item>
                <Descriptions.Item label="跨界类型">{configCenterOptLabel(CR_OVER_TYPE_OPTIONS, modal.record.crOverType)}</Descriptions.Item>
                <Descriptions.Item label="涉及行政区划" span={2}>
                  {formatFlowAdmRegDisplay(modal.record.flowAdmReg)}
                </Descriptions.Item>
                <Descriptions.Item label="右上角经度">{configCenterDetailNum(modal.record.extentNeLng, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="右上角纬度">{configCenterDetailNum(modal.record.extentNeLat, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="左下角经度">{configCenterDetailNum(modal.record.extentSwLng, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="左下角纬度">{configCenterDetailNum(modal.record.extentSwLat, '°', { digits: 6 })}</Descriptions.Item>
                <Descriptions.Item label="备注" span={2}>
                  {configCenterDetailText(modal.record.note)}
                </Descriptions.Item>
              </Descriptions>
            </ConfigCenterDetailTabs>
          ) : (
            <Form className="config-center-modal-form" form={form} layout="vertical">
              <Title level={5}>基本信息</Title>
              <Divider style={{ margin: '8px 0 16px' }} />
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="流域代码" name="basCode" rules={[{ required: true, message: '请填写流域代码' }]}>
                    <Input placeholder="BAS_CODE" />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="流域名称" name="basName" rules={[{ required: true, message: '请填写流域名称' }]}>
                    <Input placeholder="BAS_NAME" />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="流域类型" name="basType" rules={[{ required: true }]}>
                    <Select placeholder="BAS_TYPE" options={BAS_TYPE_OPTIONS} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="流域级别" name="basGrad" rules={[{ required: true }]}>
                    <Select placeholder="BAS_GRAD" options={BAS_GRAD_OPTIONS} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="流域面积（km²）" name="basArea">
                    <InputNumber style={{ width: '100%' }} min={0} placeholder="BAS_AREA" />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="跨界类型" name="crOverType" rules={[{ required: true }]}>
                    <Select placeholder="CR_OVER_TYPE" options={CR_OVER_TYPE_OPTIONS} />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_FULL}>
                  <Form.Item label="涉及行政区划" name="flowAdmReg" rules={[{ required: true, message: '请选择涉及行政区划' }]}>
                    <Select
                      mode="multiple"
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      placeholder="请选择涉及行政区划（可多选）"
                      options={RIVER_FLOW_AREA_ADDVCD_OPTIONS}
                      maxTagCount="responsive"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Title level={5} style={{ marginTop: 8 }}>
                空间位置
              </Title>
              <Divider style={{ margin: '8px 0 16px' }} />
              <Text type="secondary">
                支持上传流域边界 <strong>GeoJSON</strong>（.geojson / .json）或 <strong>Shapefile 压缩包</strong>
                （.zip，内含 .shp 等）；解析后按外包矩形自动填充 <strong>右上角、左下角</strong> 共四个经纬度（WGS84）；亦可手改。
              </Text>
              <Row gutter={CFG_FORM_GUTTER} style={{ marginTop: 12 }}>
                <Col {...CFG_FORM_COL_FULL}>
                  <Form.Item label="流域边界矢量" required={false}>
                    <Upload
                      accept=".geojson,.json,.zip,application/json,application/zip"
                      showUploadList={false}
                      beforeUpload={async file => {
                        try {
                          const r = await parseBoundaryFileToCorners(file);
                          form.setFieldsValue({
                            extentNeLng: r.extentNeLng,
                            extentNeLat: r.extentNeLat,
                            extentSwLng: r.extentSwLng,
                            extentSwLat: r.extentSwLat
                          });
                          message.success('已从边界文件解析右上、左下坐标（可继续手调）');
                        } catch (e) {
                          message.error(e instanceof Error ? e.message : '边界文件解析失败');
                        }
                        return false;
                      }}
                    >
                      <Button icon={<UploadOutlined />}>上传流域边界 GeoJSON / Shapefile（zip）</Button>
                    </Upload>
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="右上角经度" name="extentNeLng">
                    <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="右上角纬度" name="extentNeLat">
                    <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="左下角经度" name="extentSwLng">
                    <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
                  </Form.Item>
                </Col>
                <Col {...CFG_FORM_COL_THIRD}>
                  <Form.Item label="左下角纬度" name="extentSwLat">
                    <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="°" />
                  </Form.Item>
                </Col>
              </Row>

              <Title level={5} style={{ marginTop: 8 }}>
                其他
              </Title>
              <Divider style={{ margin: '8px 0 16px' }} />
              <Row gutter={CFG_FORM_GUTTER}>
                <Col {...CFG_FORM_COL_FULL}>
                  <Form.Item label="备注" name="note">
                    <Input.TextArea rows={2} placeholder="NOTE" />
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
