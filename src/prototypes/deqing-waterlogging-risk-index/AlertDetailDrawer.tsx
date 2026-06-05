import React from 'react';
import { Drawer, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { waterloggingPointRegistry } from '../../database/deqing-waterlogging-point-registry';
import type { WaterloggingIotAlert } from './types';
import { ALERT_LEVEL_COLOR } from './types';
import { formatDateTime, getAlertsForRegistry } from './riskIndexUtils';

type Props = {
  open: boolean;
  registryId: string | null;
  alerts: WaterloggingIotAlert[];
  onClose: () => void;
};

export const AlertDetailDrawer: React.FC<Props> = ({ open, registryId, alerts, onClose }) => {
  const reg = waterloggingPointRegistry.find(r => r.id === registryId);
  const rows = registryId ? getAlertsForRegistry(alerts, registryId) : [];

  const columns: ColumnsType<WaterloggingIotAlert> = [
    {
      title: '级别',
      dataIndex: 'levelLabel',
      width: 88,
      render: (_, row) => (
        <Tag color={ALERT_LEVEL_COLOR[row.level]}>{row.levelLabel}</Tag>
      ),
    },
    {
      title: '触发水深',
      width: 100,
      render: (_, row) => `${row.triggerDepthCm} cm`,
    },
    {
      title: '阈值',
      width: 80,
      render: (_, row) => `${row.thresholdCm} cm`,
    },
    {
      title: '触发时间',
      dataIndex: 'startedAt',
      width: 170,
      render: v => formatDateTime(v),
    },
    {
      title: '累计触发',
      dataIndex: 'alertCount',
      width: 90,
    },
  ];

  return (
    <Drawer
      title={reg ? `${reg.name} · 预警流水` : '预警流水'}
      width={640}
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        locale={{ emptyText: '该积水点暂无预警记录' }}
      />
    </Drawer>
  );
};
