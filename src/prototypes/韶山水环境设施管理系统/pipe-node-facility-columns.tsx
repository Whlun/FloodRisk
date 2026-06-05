/**
 * 排水管点列表列定义（设施管理 / 综合态势·检查井 共用，与 `PipeNodeView` 台账字段一致）
 */
import React from 'react';
import { EyeOutlined, EditOutlined } from '@ant-design/icons';
import { Badge, Button, Space, Tag } from 'antd';
import type { PipeNodeDemoRow } from './pipe-network-demo-data';
import { getDefaultVisibleColumnKeys, type ColumnConfig } from './pipe-line-table-kit';

/** 管点类型名（与设施管理管点表一致） */
function getNodeTypeName(type: string) {
  const typeMap: Record<string, string> = {
    '1': '检查井',
    '2': '雨水口',
    '3': '交汇井',
    '4': '阀门井',
    '5': '溢流井',
  };
  return typeMap[type] || '未知';
}

function getNodeTypeColor(type: string) {
  const colorMap: Record<string, string> = {
    '1': 'blue',
    '2': 'green',
    '3': 'orange',
    '4': 'purple',
    '5': 'cyan',
  };
  return colorMap[type] || 'default';
}

/** 设施状态列：与设施管理管点表 StatusTag 一致 */
function PipeNodeLedgerStatusTag({ status }: { status: string }) {
  const config: Record<string, { color: string; text: string }> = {
    '1': { color: 'success', text: '正常' },
    '2': { color: 'warning', text: '检修' },
    '3': { color: 'error', text: '故障' },
    '4': { color: 'default', text: '在建' },
    '0': { color: 'default', text: '废弃' },
    normal: { color: 'success', text: '正常' },
    warning: { color: 'warning', text: '预警' },
    error: { color: 'error', text: '超标' },
    达标: { color: 'success', text: '达标' },
    超标: { color: 'error', text: '超标' },
  };
  const cfg = config[status] || { color: 'default', text: status };
  return <Badge status={cfg.color as 'success' | 'processing' | 'default' | 'error' | 'warning'} text={cfg.text} />;
}

export type BuildPipeNodeColumnsFacility = {
  mode: 'facility';
  onDetail: (record: PipeNodeDemoRow) => void;
  onEdit: (record: PipeNodeDemoRow) => void;
};

export type BuildPipeNodeColumnsZht = {
  mode: 'zht';
  onDetail: (record: PipeNodeDemoRow) => void;
  onLocate: (record: PipeNodeDemoRow) => void;
};

const dataPart: ColumnConfig[] = [
  { key: 'nodeId', title: '管点标识码', dataIndex: 'nodeId', width: 160, defaultVisible: false },
  { key: 'systemId', title: '排水系统标识码', dataIndex: 'systemId', width: 150, defaultVisible: false },
  {
    key: 'nodeType',
    title: '管点类型',
    dataIndex: 'nodeType',
    width: 120,
    defaultVisible: true,
    render: (v: unknown) => (
      <Tag color={getNodeTypeColor(String(v ?? ''))}>{getNodeTypeName(String(v ?? ''))}</Tag>
    ),
  },
  { key: 'x', title: '坐标X', dataIndex: 'x', width: 110, defaultVisible: true, render: (v: unknown) => Number(v).toFixed(3) },
  { key: 'y', title: '坐标Y', dataIndex: 'y', width: 110, defaultVisible: true, render: (v: unknown) => Number(v).toFixed(3) },
  { key: 'roadName', title: '所在道路', dataIndex: 'roadName', width: 140, defaultVisible: true },
  { key: 'surfaceElev', title: '地面高程(m)', dataIndex: 'surfaceElev', width: 110, defaultVisible: true },
  {
    key: 'status',
    title: '设施状态',
    dataIndex: 'status',
    width: 100,
    defaultVisible: true,
    render: (v: unknown) => <PipeNodeLedgerStatusTag status={String(v ?? '')} />,
  },
  { key: 'ownership', title: '权属单位', dataIndex: 'ownership', width: 140, defaultVisible: true },
  { key: 'maintainCompany', title: '养护单位', dataIndex: 'maintainCompany', width: 140, defaultVisible: true },
  { key: 'dataSource', title: '数据来源', dataIndex: 'dataSource', width: 110, defaultVisible: true },
  { key: 'reportUnit', title: '填报单位', dataIndex: 'reportUnit', width: 140, defaultVisible: true },
  { key: 'reportDate', title: '填报日期', dataIndex: 'reportDate', width: 110, defaultVisible: true },
];

function operationFacility(onDetail: (r: PipeNodeDemoRow) => void, onEdit: (r: PipeNodeDemoRow) => void): ColumnConfig {
  return {
    key: 'operation',
    title: '操作',
    width: 180,
    defaultVisible: true,
    render: (_: unknown, record: unknown) => {
      const r = record as PipeNodeDemoRow;
      return (
        <Space size="small">
          <Button
            type="link"
            size="small"
            className="action-btn detail"
            icon={<EyeOutlined />}
            onClick={() => onDetail(r)}
          >
            详情
          </Button>
          <Button type="link" size="small" className="action-btn edit" icon={<EditOutlined />} onClick={() => onEdit(r)}>
            编辑
          </Button>
        </Space>
      );
    },
  };
}

function operationZht(
  onDetail: (r: PipeNodeDemoRow) => void,
  onLocate: (r: PipeNodeDemoRow) => void,
): ColumnConfig {
  return {
    key: 'operation',
    title: '操作',
    width: 140,
    defaultVisible: true,
    fixed: 'right',
    render: (_: unknown, record: unknown) => {
      const r = record as PipeNodeDemoRow;
      return (
        <Space size="small">
          <Button type="link" size="small" onClick={() => onDetail(r)}>
            详情
          </Button>
          <Button type="link" size="small" onClick={() => onLocate(r)}>
            定位
          </Button>
        </Space>
      );
    },
  };
}

/** 生成排水管点全量列（含操作列；设施为详情+编辑，综合态势为详情+定位） */
export function buildPipeNodeAllColumnConfigs(opts: BuildPipeNodeColumnsFacility | BuildPipeNodeColumnsZht): ColumnConfig[] {
  const op =
    opts.mode === 'facility' ? operationFacility(opts.onDetail, opts.onEdit) : operationZht(opts.onDetail, opts.onLocate);
  return dataPart.map(c => ({ ...c })).concat([op]);
}

export function getPipeNodeTableDefaultVisibleColumnKeys(): string[] {
  return getDefaultVisibleColumnKeys(
    buildPipeNodeAllColumnConfigs({
      mode: 'facility',
      onDetail: () => {},
      onEdit: () => {},
    }),
  );
}
