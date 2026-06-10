/**
 * 设施管理 · 排口管理 · 排口核查行动小组库
 * 交互对齐「应急协同-应急队伍信息」：查询、字段管理、导入/导出占位、新增、编辑、详情。
 */
import React, { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  TreeSelect,
  Upload,
  message,
} from 'antd';
import { DownloadOutlined, EditOutlined, EyeOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import {
  getDefaultVisibleColumnKeys,
  getFacilityTableScrollX,
  PipeLineColumnManager,
  type ColumnConfig,
} from './pipe-line-table-kit';
import { downloadFacilityListExcel } from './facility-list-xlsx-export';
import { SHAOSHAN_ADMIN_TREE_TO_VILLAGE, formatShaoshanAdminDivisionDisplay } from '../生态整治/riverChiefDb4401';

type OutletActionTeamGroupRecord = {
  小组编号: string;
  组长名称: string;
  组长手机: string;
  所属区划: string;
};

export const OUTLET_ACTION_TEAM_GROUP_INITIAL: OutletActionTeamGroupRecord[] = [
  { 小组编号: 'PKHC-2026-001', 组长名称: '周建军', 组长手机: '13800010001', 所属区划: '430382100002' },
  { 小组编号: 'PKHC-2026-002', 组长名称: '刘晓明', 组长手机: '13800010002', 所属区划: '430382101001' },
  { 小组编号: 'PKHC-2026-003', 组长名称: '彭志勇', 组长手机: '13800010003', 所属区划: '430382102001' },
];

function genTeamGroupCode(rows: OutletActionTeamGroupRecord[]): string {
  const year = new Date().getFullYear();
  const prefix = `PKHC-${year}-`;
  let max = 0;
  for (const row of rows) {
    if (!row.小组编号.startsWith(prefix)) continue;
    const num = Number(row.小组编号.slice(prefix.length));
    if (Number.isFinite(num)) max = Math.max(max, num);
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

export const OutletActionTeamGroupView: React.FC<{
  onDetail: (title: string, content: React.ReactNode, modalWidth?: number | string) => void;
}> = ({ onDetail }) => {
  const [data, setData] = useState<OutletActionTeamGroupRecord[]>(() => [...OUTLET_ACTION_TEAM_GROUP_INITIAL]);
  const [filterGroupCode, setFilterGroupCode] = useState('');
  const [filterLeaderName, setFilterLeaderName] = useState('');
  const [filterAdminDivision, setFilterAdminDivision] = useState<string | undefined>();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<OutletActionTeamGroupRecord | null>(null);
  const [addForm] = Form.useForm<OutletActionTeamGroupRecord>();
  const [editForm] = Form.useForm<OutletActionTeamGroupRecord>();

  const allColumns: ColumnConfig[] = useMemo(
    () => [
      { key: '小组编号', title: '小组编号', dataIndex: '小组编号', width: 180, defaultVisible: true },
      { key: '组长名称', title: '组长名称', dataIndex: '组长名称', width: 140, defaultVisible: true },
      { key: '组长手机', title: '组长手机', dataIndex: '组长手机', width: 150, defaultVisible: true },
      {
        key: '所属区划',
        title: '所属区划',
        dataIndex: '所属区划',
        width: 260,
        defaultVisible: true,
        render: (v: unknown) => formatShaoshanAdminDivisionDisplay(String(v ?? '').trim()),
      },
      { key: 'operation', title: '操作', width: 180, defaultVisible: true },
    ],
    [],
  );

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => getDefaultVisibleColumnKeys(allColumns));

  const filtered = useMemo(() => {
    const groupCode = filterGroupCode.trim();
    const leaderName = filterLeaderName.trim();
    return data.filter(row => {
      if (groupCode && !row.小组编号.includes(groupCode)) return false;
      if (leaderName && !row.组长名称.includes(leaderName)) return false;
      if (filterAdminDivision && row.所属区划 !== filterAdminDivision) return false;
      return true;
    });
  }, [data, filterGroupCode, filterLeaderName, filterAdminDivision]);

  const openDetail = (row: OutletActionTeamGroupRecord) => {
    onDetail(
      `排口核查行动小组详情 - ${row.小组编号}`,
      (
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="小组编号" span={2}>
            {row.小组编号}
          </Descriptions.Item>
          <Descriptions.Item label="组长名称">{row.组长名称 || '—'}</Descriptions.Item>
          <Descriptions.Item label="组长手机">{row.组长手机 || '—'}</Descriptions.Item>
          <Descriptions.Item label="所属区划" span={2}>
            {formatShaoshanAdminDivisionDisplay(row.所属区划)}
          </Descriptions.Item>
        </Descriptions>
      ),
      800,
    );
  };

  const openEdit = (row: OutletActionTeamGroupRecord) => {
    setEditing(row);
    editForm.setFieldsValue(row);
    setEditOpen(true);
  };

  const handleDelete = () => {
    if (!editing) return;
    setData(prev => prev.filter(x => x.小组编号 !== editing.小组编号));
    message.success('删除成功');
    setEditOpen(false);
  };

  const handleSaveEdit = () => {
    editForm.validateFields().then(vals => {
      if (!editing) return;
      const next: OutletActionTeamGroupRecord = { ...editing, ...vals, 小组编号: editing.小组编号 };
      setData(prev => prev.map(x => (x.小组编号 === editing.小组编号 ? next : x)));
      message.success('保存成功');
      setEditOpen(false);
    });
  };

  const handleSaveAdd = () => {
    addForm.validateFields().then(vals => {
      const next: OutletActionTeamGroupRecord = { ...vals, 小组编号: genTeamGroupCode(data) };
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
          render: (_: unknown, record: OutletActionTeamGroupRecord) => (
            <Space size="small">
              <Button type="link" size="small" className="action-btn detail" icon={<EyeOutlined />} onClick={() => openDetail(record)}>
                详情
              </Button>
              <Button type="link" size="small" className="action-btn edit" icon={<EditOutlined />} onClick={() => openEdit(record)}>
                编辑
              </Button>
            </Space>
          ),
        };
      }
      return col;
    });

  const scrollX = getFacilityTableScrollX(allColumns.filter(c => visibleColumns.includes(c.key) || c.key === 'operation'));

  return (
    <div className="facility-view">
      <Card
        title="排口核查行动小组库"
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
                downloadFacilityListExcel(filtered as unknown as Record<string, unknown>[], allColumns, '排口核查行动小组库', '排口核查行动小组');
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
                addForm.setFieldsValue({ 小组编号: '', 组长名称: '', 组长手机: '', 所属区划: undefined as unknown as string });
                setAddOpen(true);
              }}
            >
              新增
            </Button>
          </Space>
        }
      >
        <Row gutter={16} align="middle" style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="所属区划"
              style={{ width: '100%' }}
              value={filterAdminDivision}
              onChange={v => setFilterAdminDivision(v)}
              options={SHAOSHAN_ADMIN_TREE_TO_VILLAGE.flatMap(city =>
                (city.children ?? []).flatMap(town =>
                  (town.children ?? []).map(village => ({
                    value: village.value,
                    label: `${town.title} / ${village.title}`,
                  })),
                ),
              )}
            />
          </Col>
          <Col span={6}>
            <Input
              allowClear
              placeholder="小组编号"
              value={filterGroupCode}
              onChange={e => setFilterGroupCode(e.target.value)}
            />
          </Col>
          <Col span={6}>
            <Input
              allowClear
              placeholder="组长名称"
              value={filterLeaderName}
              onChange={e => setFilterLeaderName(e.target.value)}
            />
          </Col>
          <Col span={6}>
            <Space>
              <Button type="primary" className="search-btn">查询</Button>
              <Button
                onClick={() => {
                  setFilterGroupCode('');
                  setFilterLeaderName('');
                  setFilterAdminDivision(undefined);
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
            rowKey="小组编号"
            dataSource={filtered}
            columns={columns}
            scroll={{ x: scrollX }}
            pagination={{ defaultPageSize: 10, showTotal: t => `共 ${t} 条` }}
          />
        </div>
      </Card>

      <Modal
        title="新增排口核查行动小组"
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        width={800}
        destroyOnClose
        footer={
          <Space>
            <Button onClick={() => setAddOpen(false)}>取消</Button>
            <Button type="primary" onClick={handleSaveAdd}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={addForm} layout="vertical">
          <Form.Item label="小组编号">
            <Input readOnly placeholder="保存时自动生成" />
          </Form.Item>
          <Form.Item name="组长名称" label="组长名称" rules={[{ required: true, message: '请输入组长名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="组长手机"
            label="组长手机"
            rules={[
              { required: true, message: '请输入组长手机' },
              { pattern: /^1\d{10}$/, message: '请输入 11 位手机号' },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="所属区划"
            label="所属区划"
            rules={[{ required: true, message: '请选择所属区划（至村/社区级）' }]}
            tooltip="请选择到村（社区）级节点"
          >
            <TreeSelect
              treeData={SHAOSHAN_ADMIN_TREE_TO_VILLAGE}
              showSearch
              treeNodeFilterProp="title"
              placeholder="请选择韶山市所属区划（至村/社区级）"
              style={{ width: '100%' }}
              treeDefaultExpandAll
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`编辑排口核查行动小组 - ${editing?.小组编号 ?? ''}`}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        width={800}
        destroyOnClose
        footer={
          <Space>
            <Button danger onClick={handleDelete}>删除</Button>
            <Button onClick={() => setEditOpen(false)}>取消</Button>
            <Button type="primary" onClick={handleSaveEdit}>
              保存
            </Button>
          </Space>
        }
      >
        {editing && (
          <Form form={editForm} layout="vertical" key={editing.小组编号}>
            <Form.Item label="小组编号">
              <Input readOnly value={editing.小组编号} />
            </Form.Item>
            <Form.Item name="组长名称" label="组长名称" rules={[{ required: true, message: '请输入组长名称' }]}>
              <Input />
            </Form.Item>
            <Form.Item
              name="组长手机"
              label="组长手机"
              rules={[
                { required: true, message: '请输入组长手机' },
                { pattern: /^1\d{10}$/, message: '请输入 11 位手机号' },
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="所属区划"
              label="所属区划"
              rules={[{ required: true, message: '请选择所属区划（至村/社区级）' }]}
              tooltip="请选择到村（社区）级节点"
            >
              <TreeSelect
                treeData={SHAOSHAN_ADMIN_TREE_TO_VILLAGE}
                showSearch
                treeNodeFilterProp="title"
                placeholder="请选择韶山市所属区划（至村/社区级）"
                style={{ width: '100%' }}
                treeDefaultExpandAll
              />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};
