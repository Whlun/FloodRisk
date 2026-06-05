import React, { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { initialIndicatorRiskLevels } from '../../database/deqing-waterlogging-risk-indicators';
import type { IndicatorRiskLevelRow } from './types';
import {
  createEmptyRiskLevel,
  hasEnabledScoreRangeOverlap,
  isBuiltinRiskLevel,
  isDuplicateLevelCode,
} from './riskLevelUtils';

interface Props {
  indicatorLevels: IndicatorRiskLevelRow[];
  onIndicatorLevelsChange: (rows: IndicatorRiskLevelRow[]) => void;
}

export const RiskLevelPage: React.FC<Props> = ({ indicatorLevels, onIndicatorLevelsChange }) => {
  const [indModal, setIndModal] = useState(false);
  const [editingInd, setEditingInd] = useState<IndicatorRiskLevelRow | null>(null);
  const [indForm] = Form.useForm();

  const sortedLevels = useMemo(
    () => [...indicatorLevels].sort((a, b) => a.sort - b.sort),
    [indicatorLevels],
  );

  const openIndAdd = () => {
    const row = createEmptyRiskLevel(indicatorLevels);
    setEditingInd(row);
    indForm.resetFields();
    indForm.setFieldsValue(row);
    setIndModal(true);
  };

  const openIndEdit = (row: IndicatorRiskLevelRow) => {
    setEditingInd(row);
    indForm.resetFields();
    indForm.setFieldsValue(row);
    setIndModal(true);
  };

  const closeIndModal = () => {
    setIndModal(false);
    setEditingInd(null);
    indForm.resetFields();
  };

  const saveInd = async () => {
    const v = await indForm.validateFields();
    const isNew = !indicatorLevels.some(l => l.id === editingInd!.id);
    const row: IndicatorRiskLevelRow = {
      ...editingInd!,
      ...v,
      levelCode: String(v.levelCode).trim().toUpperCase(),
      color: typeof v.color === 'string' ? v.color : v.color?.toHexString?.() ?? editingInd!.color,
      builtin: isNew ? false : editingInd!.builtin,
    };

    if (row.scoreMin >= row.scoreMax) {
      message.error('分数下限须小于分数上限');
      return;
    }
    if (isDuplicateLevelCode(row.levelCode, indicatorLevels, row.id)) {
      message.error('等级编码已存在，请更换');
      return;
    }
    const nextLevels = isNew
      ? [...indicatorLevels, row]
      : indicatorLevels.map(l => (l.id === row.id ? row : l));
    if (hasEnabledScoreRangeOverlap(row, nextLevels)) {
      message.error('分数区间与其他启用等级重叠，请调整');
      return;
    }
    const enabledCount = nextLevels.filter(l => l.enabled).length;
    if (enabledCount === 0) {
      message.error('至少保留一个启用的风险等级');
      return;
    }

    onIndicatorLevelsChange(nextLevels);
    message.success(isNew ? '新增成功' : '更新成功');
    closeIndModal();
  };

  const deleteInd = () => {
    if (!editingInd) return;
    if (isBuiltinRiskLevel(editingInd)) {
      message.warning('系统预置等级不可删除');
      return;
    }
    if (editingInd.enabled) {
      message.warning('请先停用该等级后再删除');
      return;
    }
    const next = indicatorLevels.filter(l => l.id !== editingInd.id);
    if (next.filter(l => l.enabled).length === 0) {
      message.error('删除后无启用等级，请先启用其他等级');
      return;
    }
    onIndicatorLevelsChange(next);
    message.success('删除成功');
    closeIndModal();
  };

  const resetIndDefaults = () => {
    onIndicatorLevelsChange(initialIndicatorRiskLevels.map(row => ({ ...row })));
    message.success('已恢复默认');
  };

  const toggleIndEnabled = (row: IndicatorRiskLevelRow) => {
    const next = indicatorLevels.map(l => (l.id === row.id ? { ...l, enabled: !l.enabled } : l));
    if (!row.enabled) {
      const candidate = next.find(l => l.id === row.id)!;
      if (hasEnabledScoreRangeOverlap(candidate, next)) {
        message.error('启用后分数区间与其他启用等级重叠，请先编辑区间');
        return;
      }
    }
    if (next.filter(l => l.enabled).length === 0) {
      message.error('至少保留一个启用的风险等级');
      return;
    }
    onIndicatorLevelsChange(next);
    message.success(row.enabled ? '已停用' : '已启用');
  };

  const renderModalDelete = () => {
    if (!editingInd || isBuiltinRiskLevel(editingInd)) return null;
    if (editingInd.enabled) {
      return (
        <Tooltip title="请先停用该等级">
          <Button danger disabled>
            删除等级
          </Button>
        </Tooltip>
      );
    }
    return (
      <Popconfirm
        title="确认删除该等级？"
        description="删除后不可恢复，且不再参与综合分 V 的等级映射。"
        onConfirm={deleteInd}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <Button danger>删除等级</Button>
      </Popconfirm>
    );
  };

  const indColumns: ColumnsType<IndicatorRiskLevelRow> = [
    { title: '排序', dataIndex: 'sort', width: 64, align: 'center' },
    { title: '等级编码', dataIndex: 'levelCode', width: 110 },
    { title: '等级名称', dataIndex: 'levelName', width: 120 },
    {
      title: '标签色',
      dataIndex: 'color',
      width: 100,
      render: (c: string, r) => (
        <Tag color={c}>{r.levelName}</Tag>
      ),
    },
    {
      title: '分数区间',
      width: 160,
      render: (_, r) => `[${r.scoreMin}, ${r.scoreMax})`,
    },
    { title: '说明', dataIndex: 'description', ellipsis: true },
    {
      title: '启用状态',
      dataIndex: 'enabled',
      width: 88,
      render: (enabled: boolean) =>
        enabled ? <Tag color="success">启用</Tag> : <Tag color="warning">停用</Tag>,
    },
    {
      title: '来源',
      width: 72,
      render: (_, row) =>
        isBuiltinRiskLevel(row) ? (
          <Tag bordered={false}>预置</Tag>
        ) : (
          <Tag color="processing" bordered={false}>
            自定义
          </Tag>
        ),
    },
    {
      title: '操作',
      width: 140,
      fixed: 'right',
      render: (_, row) => (
        <Space size={4}>
          <Button type="link" size="small" className="action-btn" onClick={() => openIndEdit(row)}>
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            className={`action-btn ${row.enabled ? 'dq-action-disable' : 'dq-action-enable'}`}
            onClick={() => toggleIndEnabled(row)}
          >
            {row.enabled ? '停用' : '启用'}
          </Button>
        </Space>
      ),
    },
  ];

  const editingBuiltin = editingInd ? isBuiltinRiskLevel(editingInd) : false;

  return (
    <div className="dq-risk-page">
      <Card
        bordered={false}
        title="风险等级管理"
        extra={
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={openIndAdd}>
              新增等级
            </Button>
            <Button onClick={resetIndDefaults}>恢复默认</Button>
          </Space>
        }
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          配置综合分 V 与风险等级的映射区间；系统预置三档可编辑区间与展示，不可删除；自定义等级须先停用后方可删除。配置保存至本地，刷新后仍生效。
        </Typography.Paragraph>
        <Table
          rowKey="id"
          size="small"
          columns={indColumns}
          dataSource={sortedLevels}
          pagination={false}
          scroll={{ x: 960 }}
        />
      </Card>

      <Modal
        title={editingInd && indicatorLevels.some(l => l.id === editingInd.id) ? '编辑风险等级' : '新增风险等级'}
        open={indModal}
        onCancel={closeIndModal}
        destroyOnClose
        width={520}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <Space>
              {renderModalDelete()}
              <Button type="primary" onClick={saveInd}>
                保存
              </Button>
              <Button onClick={closeIndModal}>取消</Button>
            </Space>
          </div>
        }
      >
        <Form form={indForm} layout="vertical">
          <Form.Item
            name="levelCode"
            label="等级编码"
            rules={[
              { required: true, message: '请输入等级编码' },
              { pattern: /^[A-Z0-9_]+$/, message: '仅支持大写字母、数字与下划线' },
            ]}
          >
            <Input disabled={editingBuiltin} placeholder="如 LOW、CUSTOM_1" />
          </Form.Item>
          <Form.Item name="levelName" label="等级名称" rules={[{ required: true, message: '请输入等级名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="sort" label="排序（越大风险越高）" rules={[{ required: true, message: '请输入排序' }]}>
            <InputNumber min={1} max={99} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="scoreMin" label="分数下限（含）" rules={[{ required: true }]}>
                <InputNumber min={0} max={1} step={0.05} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="scoreMax" label="分数上限（不含）" rules={[{ required: true }]}>
                <InputNumber min={0} max={1.01} step={0.05} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="color" label="标签颜色" rules={[{ required: true, message: '请输入颜色' }]}>
            <Input placeholder="#f5222d" />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={2} placeholder="如 V≥0.6" />
          </Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
