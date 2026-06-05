import React from 'react';
import { Card, Col, Row, Statistic } from 'antd';
import {
  AlertOutlined,
  AreaChartOutlined,
  BuildOutlined,
  DatabaseOutlined,
  FieldTimeOutlined,
  PieChartOutlined,
} from '@ant-design/icons';
import type { HzShellSubKey } from '../../湖州市空间全画像/hzShellNavContext';

type WorkbenchKpiRowProps = {
  kpis: {
    availableTotal: number;
    inefficientArea: number;
    projectCount: number;
    projectAreaHa: number;
    alertCount: number;
    maxDaysInPhase: number;
  };
  onNavigate: (key: HzShellSubKey) => void;
};

const KPI_ITEMS: Array<{
  key: keyof WorkbenchKpiRowProps['kpis'];
  title: string;
  unit: string;
  icon: React.ReactNode;
  nav: HzShellSubKey;
  precision?: number;
}> = [
  {
    key: 'availableTotal',
    title: '可利用空间',
    unit: '公顷',
    icon: <DatabaseOutlined />,
    nav: 'liyong',
    precision: 2,
  },
  {
    key: 'inefficientArea',
    title: '低效用地',
    unit: '公顷',
    icon: <AreaChartOutlined />,
    nav: 'liyong',
    precision: 2,
  },
  {
    key: 'projectCount',
    title: '建设项目',
    unit: '个',
    icon: <BuildOutlined />,
    nav: 'jianguan',
    precision: 0,
  },
  {
    key: 'projectAreaHa',
    title: '建设面积',
    unit: '公顷',
    icon: <PieChartOutlined />,
    nav: 'jianguan',
    precision: 2,
  },
  {
    key: 'alertCount',
    title: '预警项目',
    unit: '个',
    icon: <AlertOutlined />,
    nav: 'zhongda',
    precision: 0,
  },
  {
    key: 'maxDaysInPhase',
    title: '最长滞留',
    unit: '天',
    icon: <FieldTimeOutlined />,
    nav: 'zhongda',
    precision: 0,
  },
];

export const WorkbenchKpiRow: React.FC<WorkbenchKpiRowProps> = ({ kpis, onNavigate }) => (
  <section className="hz-wb-section">
    <Row gutter={[12, 12]}>
      {KPI_ITEMS.map(item => (
        <Col key={item.key} xs={24} sm={12} lg={8} xl={4}>
          <Card
            className="hz-wb-kpi-card"
            size="small"
            bordered
            onClick={() => onNavigate(item.nav)}
          >
            <Statistic
              title={`${item.title}(${item.unit})`}
              value={kpis[item.key]}
              precision={item.precision}
              prefix={item.icon}
            />
          </Card>
        </Col>
      ))}
    </Row>
  </section>
);
