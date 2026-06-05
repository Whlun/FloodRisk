/**
 * 建设工程画像 · 业务流程图（表 4）
 */
import React from 'react';
import { Button, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { MATTER_CONFIGS } from '../matterConfigs';
import type { MatterKey } from '../types';

const { Title, Text } = Typography;

const UPSTREAM = [
  '基层「地管家」场景',
  '自然资源行政审批系统',
  '建设用地动态监管系统',
  '不动产登记管理系统',
  '投资在线平台 3.0',
];

export type ProcessFlowDiagramProps = {
  onBack: () => void;
  onOpenMatter: (key: MatterKey) => void;
};

export const ProcessFlowDiagram: React.FC<ProcessFlowDiagramProps> = ({ onBack, onOpenMatter }) => {
  return (
    <div className="hz-cm-subpage hz-cm-flow">
      <header className="hz-cm-subpage__hd">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack}>
          返回首页
        </Button>
        <Title level={4}>业务流程</Title>
      </header>

      <div className="hz-cm-flow__layer">
        <Text type="secondary">上游系统</Text>
        <div className="hz-cm-flow__nodes">
          {UPSTREAM.map(name => (
            <div key={name} className="hz-cm-flow__node">
              {name}
            </div>
          ))}
        </div>
      </div>

      <div className="hz-cm-flow__layer">
        <Text type="secondary">事项环节（点击跳转台账）</Text>
        <div className="hz-cm-flow__nodes hz-cm-flow__nodes--wrap">
          {MATTER_CONFIGS.map(m => (
            <button
              key={m.key}
              type="button"
              className="hz-cm-flow__node hz-cm-flow__node--btn"
              onClick={() => onOpenMatter(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="hz-cm-flow__layer">
        <div className="hz-cm-flow__node hz-cm-flow__node--outcome">工程建设项目</div>
      </div>
    </div>
  );
};
