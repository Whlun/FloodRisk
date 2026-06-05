import React from 'react';
import { Card, Col, Row } from 'antd';
import {
  AreaChartOutlined,
  BuildOutlined,
  GlobalOutlined,
  ProjectOutlined,
} from '@ant-design/icons';
import type { HzShellSubKey } from '../../湖州市空间全画像/hzShellNavContext';

const QUICK_LINKS: Array<{
  key: HzShellSubKey;
  title: string;
  desc: string;
  icon: React.ReactNode;
}> = [
  {
    key: 'liyong',
    title: '空间利用画像',
    desc: '供地分布、用地状态与可利用空间分析',
    icon: <GlobalOutlined className="hz-wb-quick-card__icon" />,
  },
  {
    key: 'jianguan',
    title: '建设工程画像',
    desc: '事项阶段分布与建设项目全生命周期管理',
    icon: <BuildOutlined className="hz-wb-quick-card__icon" />,
  },
  {
    key: 'zhongda',
    title: '预警工程画像',
    desc: '阶段滞留预警统计与预警项目列表',
    icon: <ProjectOutlined className="hz-wb-quick-card__icon" />,
  },
  {
    key: 'dixiao',
    title: '低效用地分析',
    desc: '低效用地识别、整治进度与空间挖潜',
    icon: <AreaChartOutlined className="hz-wb-quick-card__icon" />,
  },
];

type WorkbenchQuickLinksProps = {
  onNavigate: (key: HzShellSubKey) => void;
};

export const WorkbenchQuickLinks: React.FC<WorkbenchQuickLinksProps> = ({ onNavigate }) => (
  <section className="hz-wb-section">
    <h3 className="hz-wb-section-title">快捷入口</h3>
    <Row gutter={[12, 12]}>
      {QUICK_LINKS.map(link => (
        <Col key={link.key} xs={24} sm={12} lg={6}>
          <Card
            className="hz-wb-quick-card"
            size="small"
            bordered
            onClick={() => onNavigate(link.key)}
          >
            {link.icon}
            <div className="hz-wb-quick-card__title">{link.title}</div>
            <div className="hz-wb-quick-card__desc">{link.desc}</div>
            <div className="hz-wb-quick-card__action">进入 →</div>
          </Card>
        </Col>
      ))}
    </Row>
  </section>
);
