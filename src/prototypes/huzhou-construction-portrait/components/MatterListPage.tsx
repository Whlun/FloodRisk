/**
 * 事项台账全屏页（配置驱动）
 */
import React, { useMemo, useState } from 'react';
import { Button, Form, Input, Layout, Menu, Space, Table, Typography } from 'antd';
import { ArrowLeftOutlined, EyeOutlined } from '@ant-design/icons';
import * as echarts from 'echarts';
import { useEffect, useRef } from 'react';
import { setChartOptionWithAnimation, withChartAnimation } from '../../../common/chartAnimation';
import { AnimatedNumber } from '../../../common/AnimatedNumber';
import { buildMatterTableRows, MATTER_CONFIGS, getMatterConfig } from '../matterConfigs';
import type { MatterKey } from '../types';

const { Sider, Content } = Layout;
const { Title } = Typography;

export type MatterListPageProps = {
  matterKey: MatterKey;
  onBack: () => void;
  onSwitchMatter: (key: MatterKey) => void;
  onViewPortrait: (projectId: string) => void;
};

export const MatterListPage: React.FC<MatterListPageProps> = ({
  matterKey,
  onBack,
  onSwitchMatter,
  onViewPortrait,
}) => {
  const config = getMatterConfig(matterKey);
  const [form] = Form.useForm();
  const chartRef = useRef<HTMLDivElement>(null);
  const rows = useMemo(() => buildMatterTableRows(config), [config]);

  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const chart = echarts.init(el);
    setChartOptionWithAnimation(chart, withChartAnimation({
      grid: { left: 48, right: 12, top: 12, bottom: 28 },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: config.districtBars.map(d => d.name), axisLabel: { fontSize: 10 } },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: config.districtBars.map(d => d.value), itemStyle: { color: '#d4a017' } }],
    }));
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el);
    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [config]);

  return (
    <Layout className="water-env-dashboard facility-mgmt-standalone hz-cm-matter-page">
      <Sider width={200} className="hz-cm-matter-sider">
        <Button type="link" icon={<ArrowLeftOutlined />} onClick={onBack} className="hz-cm-matter-back">
          返回首页
        </Button>
        <Menu
          mode="inline"
          selectedKeys={[matterKey]}
          items={MATTER_CONFIGS.map(m => ({ key: m.key, label: m.label }))}
          onClick={({ key }) => onSwitchMatter(key as MatterKey)}
        />
      </Sider>
      <Content className="hz-cm-matter-content">
        <div className="hz-cm-matter-kpi">
          <div className="hz-cm-matter-kpi__card">
            <div className="hz-cm-matter-kpi__value">
              <AnimatedNumber
                value={config.caseCount}
                formatter={n => Math.round(n).toLocaleString('zh-CN')}
              />
            </div>
            <div>办件个数（个）</div>
          </div>
          <div className="hz-cm-matter-kpi__card">
            <div className="hz-cm-matter-kpi__value">
              <AnimatedNumber
                value={config.areaHa}
                formatter={n => Math.round(n).toLocaleString('zh-CN')}
              />
            </div>
            <div>用地面积（公顷）</div>
          </div>
          <div ref={chartRef} className="hz-cm-matter-chart" />
        </div>

        <Title level={5}>查询条件</Title>
        <Form form={form} layout="inline" className="hz-cm-matter-form">
          {config.searchFields.map(f => (
            <Form.Item key={f.key} name={f.key}>
              <Input placeholder={f.placeholder} allowClear />
            </Form.Item>
          ))}
          <Form.Item>
            <Space>
              <Button type="primary">搜索</Button>
              <Button onClick={() => form.resetFields()}>重置</Button>
            </Space>
          </Form.Item>
        </Form>

        <Table
          size="small"
          rowKey="key"
          dataSource={rows}
          pagination={{ total: config.caseCount, defaultPageSize: 10, showTotal: t => `共 ${t} 条` }}
          columns={[
            ...config.columns.map(col => ({
              title: col.title,
              dataIndex: col.key,
              width: col.width,
              ellipsis: col.key !== 'no',
            })),
            {
              title: '操作',
              width: 100,
              render: () => (
                <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => onViewPortrait('p1')}>
                  查看
                </Button>
              ),
            },
          ]}
        />
      </Content>
    </Layout>
  );
};
