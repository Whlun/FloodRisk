/**
 * @name 空间全画像
 *
 * 一期：空间利用画像（综合态势三栏布局 + 湖州土地利用面 GeoJSON + 韶山视觉，无顶栏）。
 *
 * 参考资料：
 * - /Volumes/公司/项目/2026/湖州工业用地项目/湖州市空间全画像.docx
 * - src/prototypes/zonghe-taishi/（布局与地图工具条）
 * - assets/geojson/huzhou-landuse-test-data.geojson、huzhou-admin-boundary.geojson
 */
import './style.css';
import React from 'react';
import zhCN from 'antd/locale/zh_CN';
import AppConfigProvider from '../../common/AppConfigProvider';
import { SpatialUtilizationView } from './components/spatial/SpatialUtilizationView';

const App: React.FC = () => (
  <div className="zht-root hz-root">
    <SpatialUtilizationView />
  </div>
);

export default function HuzhouSpatialPortraitPage() {
  return (
    <AppConfigProvider locale={zhCN}>
      <App />
    </AppConfigProvider>
  );
}
