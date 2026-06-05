/**
 * 工程项目列表详情（全屏）
 */
import React, { useMemo, useState } from 'react';
import { Button, DatePicker, Input, Space, Table, Typography } from 'antd';
import { ArrowLeftOutlined, EyeOutlined } from '@ant-design/icons';
import { paginateProjects } from '../mock/projects';

const { Title } = Typography;
const { RangePicker } = DatePicker;

export type ProjectListFullPageProps = {
  onBack: () => void;
  onViewPortrait: (projectId: string) => void;
};

export const ProjectListFullPage: React.FC<ProjectListFullPageProps> = ({ onBack, onViewPortrait }) => {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const pageSize = 10;

  const { rows, total } = useMemo(
    () => paginateProjects(page, pageSize, keyword),
    [page, pageSize, keyword],
  );

  return (
    <div className="hz-cm-subpage">
      <header className="hz-cm-subpage__hd">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack}>
          返回首页
        </Button>
        <Title level={4} className="hz-cm-subpage__title">
          工程项目列表
        </Title>
      </header>

      <div className="hz-cm-subpage__filters">
        <Space wrap>
          <Input
            placeholder="项目名称、项目统一代码、地址等"
            style={{ width: 280 }}
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
          />
          <RangePicker placeholder={['开始日期', '结束日期']} />
          <Button type="primary" onClick={() => setPage(1)}>
            查询
          </Button>
          <Button onClick={() => { setKeyword(''); setPage(1); }}>重置</Button>
        </Space>
      </div>

      <Table
        size="small"
        rowKey="id"
        dataSource={rows}
        pagination={{
          current: page,
          pageSize,
          total,
          showTotal: t => `共 ${t} 条`,
          onChange: setPage,
        }}
        columns={[
          { title: '序号', width: 56, render: (_, __, i) => (page - 1) * pageSize + i + 1 },
          { title: '项目名称', dataIndex: 'name', ellipsis: true },
          { title: '项目统一代码', dataIndex: 'unifiedCode', width: 180, ellipsis: true },
          { title: '申报日期', dataIndex: 'applyDate', width: 110 },
          { title: '地址', dataIndex: 'address', ellipsis: true },
          {
            title: '操作',
            width: 80,
            render: (_, row) => (
              <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => onViewPortrait(row.id)}>
                查看
              </Button>
            ),
          },
        ]}
      />
    </div>
  );
};
