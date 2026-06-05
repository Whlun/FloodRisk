/**
 * 项目画像完整页（表 9–24 演示）
 */
import React, { useState } from 'react';
import { Button, Descriptions, Tabs, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { getProjectById } from '../mock/projects';
import { MATTER_CONFIGS } from '../matterConfigs';

const { Title, Paragraph } = Typography;

const LIFECYCLE = [
  { key: 'batch', label: '批' },
  { key: 'supply', label: '供' },
  { key: 'use', label: '用' },
  { key: 'build', label: '建' },
];

export type ProjectPortraitDetailPageProps = {
  projectId: string;
  onBack: () => void;
};

export const ProjectPortraitDetailPage: React.FC<ProjectPortraitDetailPageProps> = ({ projectId, onBack }) => {
  const project = getProjectById(projectId) ?? getProjectById('p1');
  const [activeMatter, setActiveMatter] = useState(MATTER_CONFIGS[0].key);

  if (!project) {
    return (
      <div className="hz-cm-subpage">
        <Button onClick={onBack}>返回</Button>
        <p>未找到项目</p>
      </div>
    );
  }

  const matterLabel = MATTER_CONFIGS.find(m => m.key === activeMatter)?.label ?? '';

  return (
    <div className="hz-cm-subpage hz-cm-portrait">
      <header className="hz-cm-subpage__hd">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack}>
          返回
        </Button>
        <Title level={4}>项目画像</Title>
      </header>

      <section className="hz-cm-portrait__basic">
        <Title level={5}>基本信息</Title>
        <Descriptions bordered size="small" column={3}>
          <Descriptions.Item label="项目名称" span={2}>
            {project.name}
          </Descriptions.Item>
          <Descriptions.Item label="项目代码">{project.unifiedCode}</Descriptions.Item>
          <Descriptions.Item label="建设性质">新建</Descriptions.Item>
          <Descriptions.Item label="项目类型">其他企业投资项目</Descriptions.Item>
          <Descriptions.Item label="所在区县">{project.region}</Descriptions.Item>
          <Descriptions.Item label="详细地址" span={3}>
            {project.address}
          </Descriptions.Item>
          <Descriptions.Item label="建设规模与内容" span={3}>
            <Paragraph ellipsis={{ rows: 2, expandable: true }}>
              演示建设规模与建设内容说明，用于原型走查展示。
            </Paragraph>
          </Descriptions.Item>
        </Descriptions>
      </section>

      <div className="hz-cm-portrait__timeline">
        {LIFECYCLE.map(s => (
          <span key={s.key} className="hz-cm-portrait__lifecycle-node">
            {s.label}
          </span>
        ))}
        <div className="hz-cm-portrait__matter-tabs">
          {MATTER_CONFIGS.map(m => (
            <Button
              key={m.key}
              size="small"
              type={activeMatter === m.key ? 'primary' : 'default'}
              onClick={() => setActiveMatter(m.key)}
            >
              {m.label}
            </Button>
          ))}
        </div>
      </div>

      <Tabs
        items={[
          {
            key: 'attr',
            label: '属性',
            children: (
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="事项">{matterLabel}</Descriptions.Item>
                <Descriptions.Item label="申请单位">演示申请单位</Descriptions.Item>
                <Descriptions.Item label="申请日期">2018-11-01</Descriptions.Item>
                <Descriptions.Item label="地块面积">0.7056 m²</Descriptions.Item>
                <Descriptions.Item label="农用地面积">0.5587 m²</Descriptions.Item>
                <Descriptions.Item label="批次号">演示批次-{project.id}</Descriptions.Item>
              </Descriptions>
            ),
          },
          {
            key: 'geo',
            label: '图形',
            children: <div className="hz-cm-portrait__placeholder">图形占位（演示）</div>,
          },
          {
            key: 'archive',
            label: '档案',
            children: (
              <ul className="hz-cm-portrait__archive-list">
                <li>预审与选址意见书.pdf</li>
                <li>农转用批复文件.pdf</li>
                <li>土地供应合同.pdf</li>
              </ul>
            ),
          },
        ]}
      />
    </div>
  );
};
