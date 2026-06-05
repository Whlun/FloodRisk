/**
 * @name 内涝风险指数
 *
 * 德清城市内涝系统：基于积水点物联监测预警，按预警发布后 12h/24h 统计并计算内涝风险指数。
 */
import '../deqing-waterlogging-risk/style.css';
import './style.css';
import '../shared/ant-table-text-no-overlap.css';
import React from 'react';
import { Layout } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import AppConfigProvider from '../../common/AppConfigProvider';
import { RiskIndexPage } from './riskIndexPage';

const { Content } = Layout;

const App: React.FC = () => (
  <AppConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#1e5bb5', borderRadius: 4 } }}>
    <Layout className="water-env-dashboard facility-mgmt-standalone">
      <div className="main-layout">
        <div className="main-content-area">
          <Content className="main-content with-sidebar">
            <div className="content-wrapper">
              <RiskIndexPage />
            </div>
          </Content>
        </div>
      </div>
    </Layout>
  </AppConfigProvider>
);

export default App;
