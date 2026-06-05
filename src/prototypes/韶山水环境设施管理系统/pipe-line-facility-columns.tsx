/**
 * 排水管线列表列定义（设施管理 / 综合态势共用，与台账字段一致）
 */
import React from 'react';
import { Badge, Button, Space } from 'antd';
import { EditOutlined, EyeOutlined } from '@ant-design/icons';
import { getDefaultVisibleColumnKeys, type ColumnConfig } from './pipe-line-table-kit';
import type { PipeLineDemoRow } from './pipe-network-demo-data';

/** 管线状态码 → 与设施管理 StatusTag 一致 */
function PipeLineLedgerStatusTag({ status }: { status: string }) {
  const config: Record<string, { color: string; text: string }> = {
    '1': { color: 'success', text: '正常' },
    '2': { color: 'warning', text: '检修' },
    '3': { color: 'error', text: '故障' },
    '4': { color: 'default', text: '在建' },
    normal: { color: 'success', text: '正常' },
    warning: { color: 'warning', text: '预警' },
    error: { color: 'error', text: '超标' },
    达标: { color: 'success', text: '达标' },
    超标: { color: 'error', text: '超标' },
  };
  const cfg = config[status] || { color: 'default', text: status };
  return <Badge status={cfg.color as 'success' | 'processing' | 'default' | 'error' | 'warning'} text={cfg.text} />;
}

export type BuildPipeLineColumnsFacility = {
  mode: 'facility';
  onDetail: (record: PipeLineDemoRow) => void;
  onEdit: (record: PipeLineDemoRow) => void;
};

export type BuildPipeLineColumnsZht = {
  mode: 'zht';
  onDetail: (record: PipeLineDemoRow) => void;
  onLocate: (record: PipeLineDemoRow) => void;
};

/** 生成排水管线全量列配置（含操作列；设施管理与综合态势分支） */
export function buildPipeLineAllColumnConfigs(opts: BuildPipeLineColumnsFacility | BuildPipeLineColumnsZht): ColumnConfig[] {
  const dataCols: ColumnConfig[] = [
    { key: 'lineId', title: '管线标识码', dataIndex: 'lineId', width: 160, defaultVisible: false },
    { key: 'systemId', title: '排水系统标识码', dataIndex: 'systemId', width: 150, defaultVisible: false },
    { key: 'fromNodeId', title: '起点管点', dataIndex: 'fromNodeId', width: 140, defaultVisible: false },
    { key: 'toNodeId', title: '终点管点', dataIndex: 'toNodeId', width: 140, defaultVisible: false },
    {
      key: 'lineCategory',
      title: '管线类别',
      dataIndex: 'lineCategory',
      width: 100,
      defaultVisible: true,
      render: (v: unknown) => {
        const s = String(v ?? '');
        return s === '1' ? '雨水' : s === '2' ? '污水' : s === '3' ? '合流' : '其他';
      },
    },
    {
      key: 'lineType',
      title: '管线类型',
      dataIndex: 'lineType',
      width: 100,
      defaultVisible: true,
      render: (v: unknown) => {
        const s = String(v ?? '');
        return s === '1' ? '主管' : s === '2' ? '支管' : '接户管';
      },
    },
    { key: 'material', title: '材质', dataIndex: 'material', width: 100, defaultVisible: true },
    { key: 'diameter', title: '管径(mm)', dataIndex: 'diameter', width: 90, defaultVisible: true },
    { key: 'lineLength', title: '管长(m)', dataIndex: 'lineLength', width: 90, defaultVisible: true },
    { key: 'startDepth', title: '起点埋深(m)', dataIndex: 'startDepth', width: 100, defaultVisible: true },
    { key: 'endDepth', title: '终点埋深(m)', dataIndex: 'endDepth', width: 100, defaultVisible: true },
    { key: 'startElev', title: '起点高程(m)', dataIndex: 'startElev', width: 100, defaultVisible: true },
    { key: 'endElev', title: '终点高程(m)', dataIndex: 'endElev', width: 100, defaultVisible: true },
    {
      key: 'section',
      title: '断面形式',
      dataIndex: 'section',
      width: 90,
      defaultVisible: true,
      render: (v: unknown) => {
        const s = String(v ?? '');
        return s === '1' ? '圆形' : s === '2' ? '矩形' : '梯形';
      },
    },
    {
      key: 'lineMode',
      title: '敷设方式',
      dataIndex: 'lineMode',
      width: 90,
      defaultVisible: true,
      render: (v: unknown) => {
        const s = String(v ?? '');
        return s === '1' ? '直埋' : s === '2' ? '顶管' : '盾构';
      },
    },
    { key: 'buildDate', title: '敷设日期', dataIndex: 'buildDate', width: 100, defaultVisible: true },
    {
      key: 'useLife',
      title: '使用年限',
      dataIndex: 'useLife',
      width: 90,
      defaultVisible: true,
      render: (v: unknown) => `${v}年`,
    },
    {
      key: 'status',
      title: '管线状态',
      dataIndex: 'status',
      width: 90,
      defaultVisible: true,
      render: (v: unknown) => <PipeLineLedgerStatusTag status={String(v ?? '')} />,
    },
    { key: 'ownership', title: '权属单位', dataIndex: 'ownership', width: 130, defaultVisible: true },
    { key: 'maintainCompany', title: '养护单位', dataIndex: 'maintainCompany', width: 130, defaultVisible: true },
    { key: 'dataSource', title: '数据来源', dataIndex: 'dataSource', width: 100, defaultVisible: true },
  ];

  const operationCol: ColumnConfig =
    opts.mode === 'facility'
      ? {
          key: 'operation',
          title: '操作',
          width: 180,
          defaultVisible: true,
          render: (_: unknown, record: unknown) => {
            const r = record as PipeLineDemoRow;
            return (
              <Space size="small">
                <Button
                  type="link"
                  size="small"
                  className="action-btn detail"
                  icon={<EyeOutlined />}
                  onClick={() => opts.onDetail(r)}
                >
                  详情
                </Button>
                <Button type="link" size="small" className="action-btn edit" icon={<EditOutlined />} onClick={() => opts.onEdit(r)}>
                  编辑
                </Button>
              </Space>
            );
          },
        }
      : {
          key: 'operation',
          title: '操作',
          width: 140,
          defaultVisible: true,
          fixed: 'right',
          render: (_: unknown, record: unknown) => {
            const r = record as PipeLineDemoRow;
            return (
              <Space size="small">
                <Button type="link" size="small" onClick={() => opts.onDetail(r)}>
                  详情
                </Button>
                <Button type="link" size="small" onClick={() => opts.onLocate(r)}>
                  定位
                </Button>
              </Space>
            );
          },
        };

  return [...dataCols, operationCol];
}

/** 字段管理初始勾选（与设施管理列表首次进入一致，不依赖回调引用） */
export function getPipeLineTableDefaultVisibleColumnKeys(): string[] {
  return getDefaultVisibleColumnKeys(
    buildPipeLineAllColumnConfigs({
      mode: 'facility',
      onDetail: () => {},
      onEdit: () => {},
    }),
  );
}
