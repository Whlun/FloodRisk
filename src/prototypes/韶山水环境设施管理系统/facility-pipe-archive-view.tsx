import React, { useMemo, useRef, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  Empty,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  ImportOutlined,
  PlusOutlined,
  PrinterOutlined,
  SearchOutlined,
  SettingOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { downloadTableFullExcel } from '../shared/facilityTableXlsxExport';

type PipeArchiveType =
  | 'design'
  | 'cad'
  | 'ledger'
  | 'shp'
  | 'completion'
  | 'supervision'
  | 'maintenance'
  | 'inspection';

type PipeArchiveFormat = 'PDF' | 'JPG' | 'PNG' | 'CAD' | 'XLSX' | 'SHP' | 'DOCX';

interface PipeArchiveRecord {
  id: string;
  name: string;
  type: PipeArchiveType;
  format: PipeArchiveFormat;
  uploadTime: string;
  uploader: string;
  remark: string;
}

type PipeProjectType = 'renovation' | 'new';

interface PipeProjectRecord {
  id: string;
  projectName: string;
  projectType: PipeProjectType;
  district: string;
  location: string;
  planDuration: string;
  description: string;
  documents: PipeArchiveRecord[];
  updatedAt: string;
}

const PIPE_PROJECT_TYPE_OPTIONS: { value: PipeProjectType; label: string; color: string }[] = [
  { value: 'renovation', label: '改造', color: 'orange' },
  { value: 'new', label: '新增', color: 'green' },
];
const PIPE_PROJECT_DATA: PipeProjectRecord[] = [
  {
    id: 'PJ-2026-001',
    projectName: '清溪片区老旧管网改造工程',
    projectType: 'renovation',
    district: '韶山市-清溪镇',
    location: '韶山市清溪片区',
    planDuration: '2026-03 至 2026-09',
    description: '完成老旧混接管网改造，降低溢流风险',
    updatedAt: '2026-04-16 17:10',
  },
  {
    id: 'PJ-2026-002',
    projectName: '高新区东部新增污水支线工程',
    projectType: 'new',
    district: '韶山市-高新区',
    location: '高新区东部产业园',
    planDuration: '2026-05 至 2026-12',
    description: '新增支线接驳能力，提升园区纳管覆盖率',
    updatedAt: '2026-04-15 11:30',
  },
  {
    id: 'PJ-2026-003',
    projectName: '北城主干管扩容改造工程',
    projectType: 'renovation',
    district: '韶山市-北城街道',
    location: '北城老城区',
    planDuration: '2025-10 至 2026-04',
    description: '扩容主干管，缓解汛期排水压力',
    updatedAt: '2026-04-12 09:05',
  },
];

const PIPE_ARCHIVE_TYPE_OPTIONS: { value: PipeArchiveType; label: string; color: string }[] = [
  { value: 'design', label: '设计图纸', color: 'green' },
  { value: 'cad', label: 'CAD文件', color: 'blue' },
  { value: 'ledger', label: '管线台账表', color: 'purple' },
  { value: 'shp', label: '管线SHP文件', color: 'cyan' },
  { value: 'completion', label: '竣工验收报告', color: 'gold' },
  { value: 'supervision', label: '监理资料', color: 'orange' },
  { value: 'maintenance', label: '维修记录', color: 'red' },
  { value: 'inspection', label: '检测报告', color: 'magenta' },
];

const PIPE_ARCHIVE_TEMPLATE: PipeArchiveRecord[] = [
  {
    id: 'PA-202604-001',
    name: '清溪主干管设计总图',
    type: 'design',
    format: 'PDF',
    uploadTime: '2026-04-02 09:20',
    uploader: '张工',
    remark: '主干管一期设计总图（审定版）',
  },
  {
    id: 'PA-202604-002',
    name: '清溪片区雨污分流CAD底图',
    type: 'cad',
    format: 'CAD',
    uploadTime: '2026-04-03 15:10',
    uploader: '李工',
    remark: '用于施工交底与放样',
  },
  {
    id: 'PA-202604-003',
    name: '排水管线台账2026Q1',
    type: 'ledger',
    format: 'XLSX',
    uploadTime: '2026-04-05 10:02',
    uploader: '王静',
    remark: '含管径、材质、埋深、起终点信息',
  },
  {
    id: 'PA-202604-004',
    name: '城区污水主干管SHP',
    type: 'shp',
    format: 'SHP',
    uploadTime: '2026-04-08 14:36',
    uploader: '赵工',
    remark: 'GIS入库使用，坐标系CGCS2000',
  },
  {
    id: 'PA-202604-005',
    name: '二期管网竣工验收报告',
    type: 'completion',
    format: 'PDF',
    uploadTime: '2026-04-11 11:08',
    uploader: '陈工',
    remark: '含验收结论、问题清单、整改闭环',
  },
  {
    id: 'PA-202604-006',
    name: '监理旁站记录汇编',
    type: 'supervision',
    format: 'DOCX',
    uploadTime: '2026-04-12 16:20',
    uploader: '刘监理',
    remark: '关键节点旁站记录与签认',
  },
  {
    id: 'PA-202604-007',
    name: '北区管线抢修记录2026-03',
    type: 'maintenance',
    format: 'PDF',
    uploadTime: '2026-04-15 09:45',
    uploader: '运维中心',
    remark: '含抢修照片、影响范围与恢复时间',
  },
  {
    id: 'PA-202604-008',
    name: '重点断面CCTV检测报告',
    type: 'inspection',
    format: 'PDF',
    uploadTime: '2026-04-16 17:11',
    uploader: '第三方检测',
    remark: '包含缺陷分级与修复建议',
  },
];

const seedProjectDocuments = (projectId: string, indices: number[]): PipeArchiveRecord[] =>
  indices.map(i => ({
    ...PIPE_ARCHIVE_TEMPLATE[i],
    id: `${PIPE_ARCHIVE_TEMPLATE[i].id}-${projectId}`,
  }));

const INITIAL_PIPE_PROJECT_DATA: PipeProjectRecord[] = [
  {
    id: 'PJ-2026-001',
    projectName: '清溪片区老旧管网改造工程',
    projectType: 'renovation',
    district: '韶山市-清溪镇',
    location: '韶山市清溪片区',
    planDuration: '2026-03 至 2026-09',
    description: '完成老旧混接管网改造，降低溢流风险',
    updatedAt: '2026-04-16 17:10',
    documents: seedProjectDocuments('PJ-2026-001', [0, 1, 2]),
  },
  {
    id: 'PJ-2026-002',
    projectName: '高新区东部新增污水支线工程',
    projectType: 'new',
    district: '韶山市-高新区',
    location: '高新区东部产业园',
    planDuration: '2026-05 至 2026-12',
    description: '新增支线接驳能力，提升园区纳管覆盖率',
    updatedAt: '2026-04-15 11:30',
    documents: seedProjectDocuments('PJ-2026-002', [3, 4]),
  },
  {
    id: 'PJ-2026-003',
    projectName: '北城主干管扩容改造工程',
    projectType: 'renovation',
    district: '韶山市-北城街道',
    location: '北城老城区',
    planDuration: '2025-10 至 2026-04',
    description: '扩容主干管，缓解汛期排水压力',
    updatedAt: '2026-04-12 09:05',
    documents: seedProjectDocuments('PJ-2026-003', [5, 6, 7]),
  },
];

const getTypeMeta = (type: PipeArchiveType) =>
  PIPE_ARCHIVE_TYPE_OPTIONS.find(item => item.value === type) ?? PIPE_ARCHIVE_TYPE_OPTIONS[0];
const getProjectTypeMeta = (type: PipeProjectType) =>
  PIPE_PROJECT_TYPE_OPTIONS.find(item => item.value === type) ?? PIPE_PROJECT_TYPE_OPTIONS[0];

const buildPreviewContent = (record: PipeArchiveRecord) => {
  if (record.format === 'JPG' || record.format === 'PNG') {
    return (
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            height: 360,
            border: '1px dashed #d9d9d9',
            borderRadius: 8,
            background: '#fafafa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#8c8c8c',
          }}
        >
          图片预览占位（原型）
        </div>
      </div>
    );
  }
  if (record.format === 'PDF') {
    return (
      <div
        style={{
          height: 420,
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          padding: 16,
          background: '#fff',
          overflow: 'auto',
        }}
      >
        <Typography.Paragraph>
          这是「{record.name}」的在线查阅占位页面（PDF 预览）。
        </Typography.Paragraph>
        <Typography.Paragraph type="secondary">
          原型阶段仅展示流程：点击下载或打印可触发对应操作提示；正式接入时替换为真实文档预览组件。
        </Typography.Paragraph>
      </div>
    );
  }
  return (
    <div
      style={{
        height: 240,
        border: '1px dashed #d9d9d9',
        borderRadius: 8,
        background: '#fafafa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#595959',
        padding: 24,
        textAlign: 'center',
      }}
    >
      当前文件格式（{record.format}）支持流程化在线查阅，原型阶段以说明占位替代实际渲染。
    </div>
  );
};

export const PipeArchiveView: React.FC = () => {
  const [projectData, setProjectData] = useState<PipeProjectRecord[]>(INITIAL_PIPE_PROJECT_DATA);
  const [form] = Form.useForm();
  const [projectModalForm] = Form.useForm();
  const [filters, setFilters] = useState<{
    district?: string;
    projectType?: PipeProjectType;
    projectName?: string;
    projectId?: string;
  }>({});
  const [editingProject, setEditingProject] = useState<PipeProjectRecord | null>(null);
  const [viewProject, setViewProject] = useState<PipeProjectRecord | null>(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectModalTab, setProjectModalTab] = useState<'basic' | 'docs'>('basic');
  const [projectDraftDocuments, setProjectDraftDocuments] = useState<PipeArchiveRecord[]>([]);
  const [projectForDocs, setProjectForDocs] = useState<PipeProjectRecord | null>(null);
  const [docFilters, setDocFilters] = useState<{ keyword?: string; type?: PipeArchiveType }>({});
  const [previewRecord, setPreviewRecord] = useState<PipeArchiveRecord | null>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const pendingDocTypeRef = useRef<PipeArchiveType | null>(null);

  const triggerLocalDocPick = (type: PipeArchiveType) => {
    pendingDocTypeRef.current = type;
    docFileInputRef.current?.click();
  };

  const handleLocalDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    const pendingType = pendingDocTypeRef.current;
    pendingDocTypeRef.current = null;
    input.value = '';
    if (!file || !pendingType) return;
    const newDoc: PipeArchiveRecord = {
      id: `PA-${Date.now()}`,
      name: file.name.replace(/\.[^.]+$/, ''),
      type: pendingType,
      format: (file.name.split('.').pop()?.toUpperCase() as PipeArchiveFormat) || 'PDF',
      uploadTime: new Date().toISOString().slice(0, 16).replace('T', ' '),
      uploader: '当前用户',
      remark: '本机选择上传（原型仅保存元数据）',
    };
    if (editingProject) {
      setProjectDraftDocuments(prev => [...prev, newDoc]);
    } else {
      setProjectDraftDocuments(prev => [...prev, newDoc]);
    }
    message.success(`已选择「${file.name}」并加入资料列表`);
  };

  const districtOptions = useMemo(() => {
    const unique = Array.from(new Set(projectData.map(item => item.district).filter(Boolean)));
    return unique.map(value => ({ value, label: value }));
  }, [projectData]);

  const filteredProjects = useMemo(() => {
    return projectData.filter(item => {
      const districtMatch = !filters.district || item.district === filters.district;
      const typeMatch = !filters.projectType || item.projectType === filters.projectType;
      const nameKeyword = (filters.projectName ?? '').trim();
      const idKeyword = (filters.projectId ?? '').trim();
      const nameMatch = !nameKeyword || item.projectName.includes(nameKeyword);
      const idMatch = !idKeyword || item.id.includes(idKeyword);
      return districtMatch && typeMatch && nameMatch && idMatch;
    });
  }, [filters, projectData]);

  const handleExportExcel = () => {
    if (filteredProjects.length === 0) {
      message.warning('当前筛选条件下无数据可导出');
      return;
    }
    const exportRows = filteredProjects.map(item => ({
      projectName: item.projectName,
      projectCode: item.id,
      projectType: getProjectTypeMeta(item.projectType).label,
      district: item.district,
      location: item.location,
      planDuration: item.planDuration,
      description: item.description,
      documents: item.documents,
    }));
    const exportCols = [
      { key: 'projectName', title: '管线工程名称', dataIndex: 'projectName' },
      { key: 'projectCode', title: '工程编号', dataIndex: 'projectCode' },
      { key: 'projectType', title: '工程类型', dataIndex: 'projectType' },
      { key: 'district', title: '所属区划', dataIndex: 'district' },
      { key: 'location', title: '建设范围', dataIndex: 'location' },
      { key: 'planDuration', title: '规划工期', dataIndex: 'planDuration' },
      { key: 'description', title: '工程描述', dataIndex: 'description' },
      { key: 'documents', title: '项目资料', dataIndex: 'documents' },
    ];
    downloadTableFullExcel(exportRows, exportCols, '管线工程档案', '项目档案');
    message.success('已导出 Excel');
  };

  const filteredProjectDocs = useMemo(() => {
    if (!projectForDocs) return [];
    return projectForDocs.documents.filter(item => {
      const typeMatch = !docFilters.type || item.type === docFilters.type;
      const kw = (docFilters.keyword ?? '').trim();
      const keywordMatch =
        !kw ||
        item.name.includes(kw) ||
        item.id.includes(kw) ||
        item.remark.includes(kw) ||
        item.uploader.includes(kw);
      return typeMatch && keywordMatch;
    });
  }, [docFilters, projectForDocs]);

  const projectColumns: ColumnsType<PipeProjectRecord> = [
    { title: '管线工程名称', dataIndex: 'projectName', width: 220 },
    { title: '工程编号', dataIndex: 'id', width: 140 },
    {
      title: '工程类型',
      dataIndex: 'projectType',
      width: 120,
      render: (value: PipeProjectType) => {
        const meta = getProjectTypeMeta(value);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    { title: '所属区划', dataIndex: 'district', width: 170 },
    { title: '建设范围', dataIndex: 'location', width: 170 },
    { title: '规划工期', dataIndex: 'planDuration', width: 170 },
    { title: '工程描述', dataIndex: 'description', width: 240 },
    {
      title: '项目资料',
      key: 'projectDocEntry',
      width: 120,
      render: (_, record) => {
        const count = record.documents.length;
        return (
          <Badge count={count} size="small" color="#1890ff">
            <Button
              type="link"
              className="action-btn detail"
              icon={<FileTextOutlined />}
              onClick={() => {
                setProjectForDocs(record);
                setDocFilters({});
              }}
            >
              资料
            </Button>
          </Badge>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 150,
      render: (_, record) => (
        <Space size={0}>
          <Button
            type="link"
            size="small"
            className="action-btn detail"
            icon={<EyeOutlined />}
            onClick={() => setViewProject(record)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            className="action-btn edit"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingProject(record);
              setProjectDraftDocuments([...record.documents]);
              projectModalForm.setFieldsValue({
                projectName: record.projectName,
                projectType: record.projectType,
                district: record.district,
                location: record.location,
                planDuration: record.planDuration,
                description: record.description,
              });
              setProjectModalTab('basic');
              setProjectModalOpen(true);
            }}
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  const projectDocColumns: ColumnsType<PipeArchiveRecord> = [
    { title: '档案名称', dataIndex: 'name', width: 240 },
    {
      title: '档案类型',
      dataIndex: 'type',
      width: 130,
      render: (value: PipeArchiveType) => <Tag color={getTypeMeta(value).color}>{getTypeMeta(value).label}</Tag>,
    },
    { title: '文件格式', dataIndex: 'format', width: 100 },
    { title: '上传时间', dataIndex: 'uploadTime', width: 170 },
    { title: '上传人', dataIndex: 'uploader', width: 120 },
    { title: '备注', dataIndex: 'remark', width: 220 },
    {
      title: '操作',
      key: 'op',
      width: 110,
      render: (_, record) => (
        <Button
          type="link"
          className="action-btn delete"
          icon={<DeleteOutlined />}
          onClick={() => setProjectDraftDocuments(prev => prev.filter(item => item.id !== record.id))}
        >
          删除
        </Button>
      ),
    },
  ];

  const openAddModal = () => {
    setEditingProject(null);
    setProjectDraftDocuments([]);
    projectModalForm.resetFields();
    setProjectModalTab('basic');
    setProjectModalOpen(true);
  };

  const saveProject = async () => {
    const values = await projectModalForm.validateFields();
    if (editingProject) {
      const next = projectData.map(item =>
        item.id === editingProject.id
          ? {
              ...item,
              ...values,
              documents: [...projectDraftDocuments],
              updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
            }
          : item,
      );
      setProjectData(next);
      message.success('修改成功');
    } else {
      const newId = `PJ-${new Date().getFullYear()}-${String(projectData.length + 1).padStart(3, '0')}`;
      setProjectData(prev => [
        ...prev,
        {
          id: newId,
          ...values,
          documents: [...projectDraftDocuments],
          updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        },
      ]);
      message.success('新增成功');
    }
    setProjectModalOpen(false);
  };

  const docColumns: ColumnsType<PipeArchiveRecord> = [
    { title: '档案编号', dataIndex: 'id', width: 140 },
    { title: '档案名称', dataIndex: 'name', width: 240 },
    {
      title: '档案类型',
      dataIndex: 'type',
      width: 140,
      render: (value: PipeArchiveType) => {
        const meta = getTypeMeta(value);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    { title: '文件格式', dataIndex: 'format', width: 110 },
    { title: '上传时间', dataIndex: 'uploadTime', width: 170 },
    { title: '上传人', dataIndex: 'uploader', width: 120 },
    { title: '备注', dataIndex: 'remark', width: 240 },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 220,
      render: (_, record) => (
        <Space size={0}>
          <Button
            type="link"
            size="small"
            className="action-btn detail"
            icon={<EyeOutlined />}
            onClick={() => setPreviewRecord(record)}
          >
            查阅
          </Button>
          <Button
            type="link"
            size="small"
            className="action-btn detail"
            icon={<DownloadOutlined />}
            onClick={() => message.success(`已触发下载：${record.name}`)}
          >
            下载
          </Button>
          <Button
            type="link"
            size="small"
            className="action-btn detail"
            icon={<PrinterOutlined />}
            onClick={() => message.success(`已触发打印流程：${record.name}`)}
          >
            打印
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="facility-view facility-pipe-archive-view">
      <Card
        title="项目档案"
        extra={
          <Space wrap size={[8, 8]} align="center">
            <Button
              icon={<DownloadOutlined />}
              className="export-btn"
              onClick={handleExportExcel}
            >
              导出Excel
            </Button>
            <Button icon={<ImportOutlined />} onClick={() => message.success('已触发导入流程（原型占位）')}>
              导入
            </Button>
            <Button icon={<SettingOutlined />} className="secondary-btn" onClick={() => message.info('字段管理功能开发中（原型占位）')}>
              字段
            </Button>
            <Button type="primary" icon={<PlusOutlined />} className="add-btn" onClick={openAddModal}>
              新增
            </Button>
          </Space>
        }
      >
        <input ref={docFileInputRef} type="file" style={{ display: 'none' }} onChange={handleLocalDocFileChange} />
        <Form form={form} onFinish={values => setFilters(values)} style={{ marginBottom: 16 }}>
          <Row gutter={[16, 12]}>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="district" style={{ marginBottom: 0 }}>
                <Select
                  allowClear
                  placeholder="所属区划"
                  style={{ width: '100%' }}
                  options={districtOptions}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="projectType" style={{ marginBottom: 0 }}>
                <Select
                  allowClear
                  placeholder="项目类型"
                  style={{ width: '100%' }}
                  options={PIPE_PROJECT_TYPE_OPTIONS.map(item => ({ value: item.value, label: item.label }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={5}>
              <Form.Item name="projectName" style={{ marginBottom: 0 }}>
                <Input placeholder="项目名称" prefix={<SearchOutlined />} allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={5}>
              <Form.Item name="projectId" style={{ marginBottom: 0 }}>
                <Input placeholder="项目编号" prefix={<SearchOutlined />} allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Space>
                <Button type="primary" htmlType="submit" className="search-btn" icon={<SearchOutlined />}>
                  查询
                </Button>
                <Button
                  onClick={() => {
                    form.resetFields();
                    setFilters({});
                  }}
                >
                  重置
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>

        <div className="facility-table-wrap">
          <Table<PipeProjectRecord>
            size="small"
            rowKey="id"
            columns={projectColumns}
            dataSource={filteredProjects}
            pagination={{ defaultPageSize: 10, showSizeChanger: false }}
            scroll={{ x: 2200 }}
            tableLayout="fixed"
          />
        </div>
      </Card>

      <Modal
        title={editingProject ? '编辑项目' : '新增项目'}
        open={projectModalOpen}
        onCancel={() => setProjectModalOpen(false)}
        onOk={saveProject}
        width={980}
        destroyOnClose
        footer={
          <Space>
            {editingProject ? (
              <Popconfirm
                title="确认删除该项目？"
                onConfirm={() => {
                  setProjectData(prev => prev.filter(item => item.id !== editingProject.id));
                  setProjectModalOpen(false);
                  message.success('删除成功');
                }}
              >
                <Button danger>删除</Button>
              </Popconfirm>
            ) : null}
            <Button onClick={() => setProjectModalOpen(false)}>取消</Button>
            <Button type="primary" onClick={saveProject}>
              保存
            </Button>
          </Space>
        }
      >
        <Tabs
          activeKey={projectModalTab}
          onChange={key => setProjectModalTab(key as 'basic' | 'docs')}
          items={[
            {
              key: 'basic',
              label: '基本信息',
              children: (
                <Form form={projectModalForm} layout="vertical">
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="projectName" label="管线工程名称" rules={[{ required: true, message: '请输入工程名称' }]}>
                        <Input placeholder="请输入管线工程名称" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="projectType" label="工程类型" rules={[{ required: true, message: '请选择工程类型' }]}>
                        <Select
                          placeholder="请选择工程类型"
                          options={PIPE_PROJECT_TYPE_OPTIONS.map(item => ({ value: item.value, label: item.label }))}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="district" label="所属区划" rules={[{ required: true, message: '请输入所属区划' }]}>
                        <Input placeholder="如：韶山市-清溪镇" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="location" label="建设范围" rules={[{ required: true, message: '请输入建设范围' }]}>
                        <Input placeholder="请输入建设范围" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="planDuration" label="规划工期" rules={[{ required: true, message: '请输入规划工期' }]}>
                        <Input placeholder="如：2026-03 至 2026-09" />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="description" label="工程描述" rules={[{ required: true, message: '请输入工程描述' }]}>
                        <Input.TextArea rows={3} placeholder="请输入工程描述" />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              ),
            },
            {
              key: 'docs',
              label: `项目资料 (${projectDraftDocuments.length})`,
              children: (
                <div>
                  <Card size="small" title="快速上传" style={{ marginBottom: 12 }}>
                    <Space wrap>
                      {PIPE_ARCHIVE_TYPE_OPTIONS.map(item => (
                        <Button key={item.value} icon={<UploadOutlined />} onClick={() => triggerLocalDocPick(item.value)}>
                          {item.label}
                        </Button>
                      ))}
                    </Space>
                  </Card>
                  <Table<PipeArchiveRecord>
                    rowKey="id"
                    size="small"
                    columns={projectDocColumns}
                    dataSource={projectDraftDocuments}
                    pagination={{ defaultPageSize: 5, showSizeChanger: false }}
                    scroll={{ x: 1200 }}
                  />
                </div>
              ),
            },
          ]}
        />
      </Modal>

      <Modal title={viewProject ? `${viewProject.projectName} - 项目详情` : '项目详情'} open={!!viewProject} onCancel={() => setViewProject(null)} footer={null} width={920}>
        {viewProject ? (
          <Tabs
            items={[
              {
                key: 'basic',
                label: '基本信息',
                children: (
                  <Descriptions bordered size="small" column={2}>
                    <Descriptions.Item label="管线工程名称">{viewProject.projectName}</Descriptions.Item>
                    <Descriptions.Item label="工程编号">{viewProject.id}</Descriptions.Item>
                    <Descriptions.Item label="工程类型">{getProjectTypeMeta(viewProject.projectType).label}</Descriptions.Item>
                    <Descriptions.Item label="所属区划">{viewProject.district}</Descriptions.Item>
                    <Descriptions.Item label="建设范围">{viewProject.location}</Descriptions.Item>
                    <Descriptions.Item label="规划工期">{viewProject.planDuration}</Descriptions.Item>
                    <Descriptions.Item label="工程描述" span={2}>
                      {viewProject.description}
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: 'docs',
                label: `项目资料 (${viewProject.documents.length})`,
                children: (
                  <Table<PipeArchiveRecord>
                    rowKey="id"
                    size="small"
                    columns={docColumns}
                    dataSource={viewProject.documents}
                    pagination={{ defaultPageSize: 5, showSizeChanger: false }}
                    scroll={{ x: 1200 }}
                  />
                ),
              },
            ]}
          />
        ) : null}
      </Modal>

      <Modal
        title={projectForDocs ? `${projectForDocs.projectName} - 档案资料` : '档案资料'}
        open={!!projectForDocs}
        onCancel={() => setProjectForDocs(null)}
        width={900}
        footer={null}
        destroyOnClose
      >
        <Form
          layout="inline"
          style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12 }}
          onFinish={values => {
            setDocFilters({
              keyword: values.keyword,
              type: values.type,
            });
          }}
        >
          <Form.Item name="type" style={{ marginBottom: 0 }}>
            <Select
              allowClear
              placeholder="档案类型"
              style={{ width: 220 }}
              options={PIPE_ARCHIVE_TYPE_OPTIONS.map(item => ({ value: item.value, label: item.label }))}
            />
          </Form.Item>
          <Form.Item name="keyword" style={{ marginBottom: 0 }}>
            <Input placeholder="搜索档案名称/编号/备注/上传人" style={{ width: 300 }} />
          </Form.Item>
          <Space size={8}>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />} className="search-btn">
              查询
            </Button>
            <Button onClick={() => setDocFilters({})}>重置</Button>
          </Space>
        </Form>
        <Card size="small" title="档案资料">
          {filteredProjectDocs.length === 0 ? (
            <Empty description="暂无档案资料" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <List
              dataSource={filteredProjectDocs}
              pagination={{ defaultPageSize: 4, size: 'small' }}
              renderItem={doc => (
                <List.Item
                  actions={[
                    <Button
                      key="view"
                      type="link"
                      className="action-btn detail"
                      icon={<EyeOutlined />}
                      onClick={() => setPreviewRecord(doc)}
                    >
                      详情
                    </Button>,
                    <Button
                      key="download"
                      type="link"
                      className="action-btn detail"
                      icon={<DownloadOutlined />}
                      onClick={() => message.success(`已触发下载：${doc.name}`)}
                    >
                      下载
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <span style={{ fontWeight: 600 }}>{doc.name}</span>
                        <Tag color={getTypeMeta(doc.type).color}>{getTypeMeta(doc.type).label}</Tag>
                      </Space>
                    }
                    description={
                      <Space size={12} wrap>
                        <Typography.Text type="secondary">{doc.name}.{doc.format.toLowerCase()}</Typography.Text>
                        <Typography.Text type="secondary">上传时间: {doc.uploadTime}</Typography.Text>
                        <Typography.Text type="secondary">上传人: {doc.uploader}</Typography.Text>
                        <Typography.Text type="secondary">{doc.remark}</Typography.Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </Modal>

      <Modal
        title={previewRecord ? `在线查阅 - ${previewRecord.name}` : '在线查阅'}
        open={!!previewRecord}
        onCancel={() => setPreviewRecord(null)}
        width={960}
        footer={
          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => previewRecord && message.success(`已触发下载：${previewRecord.name}`)}
            >
              下载
            </Button>
            <Button
              icon={<PrinterOutlined />}
              onClick={() => previewRecord && message.success(`已触发打印流程：${previewRecord.name}`)}
            >
              打印
            </Button>
            <Button type="primary" onClick={() => setPreviewRecord(null)}>
              关闭
            </Button>
          </Space>
        }
        destroyOnClose
      >
        {previewRecord ? buildPreviewContent(previewRecord) : null}
      </Modal>
    </div>
  );
};
