/**
 * @name 预警工程画像
 *
 * 三栏：左预警统计看板 + 中地图（与空间利用/建设工程画像同源）+ 右项目阶段预警列表（复用建管 CmProjectAlertRailPanel）。
 *
 * 参考资料：
 * - src/prototypes/huzhou-construction-portrait/
 * - src/prototypes/huzhou-spatial-portrait/
 * - src/prototypes/湖州市空间全画像/
 */
import './style.css';
import React from 'react';
import zhCN from 'antd/locale/zh_CN';
import AppConfigProvider from '../../common/AppConfigProvider';
import { CmProjectExportRecordsProvider } from '../huzhou-construction-portrait/useCmProjectExportRecords';
import { AlertHomeView } from './AlertHomeView';

const App: React.FC = () => (
  <div className="zht-root hz-cm-root hz-alert-root">
    <CmProjectExportRecordsProvider>
      <AlertHomeView />
    </CmProjectExportRecordsProvider>
  </div>
);

export default function HuzhouAlertPortraitPage() {
  return (
    <AppConfigProvider locale={zhCN}>
      <App />
    </AppConfigProvider>
  );
}
