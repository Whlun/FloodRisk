/**
 * @name 建设工程画像
 *
 * 首页：克隆韶山综合态势三栏交互；地图与空间利用画像同源（HuzhouMapBoard + 土地利用 GeoJSON）。
 *
 * 参考资料：
 * - /Volumes/公司/项目/2026/湖州工业用地项目/湖州市空间全画像.docx
 * - src/prototypes/zonghe-taishi/
 * - src/prototypes/huzhou-spatial-portrait/
 */
import './style.css';
import React, { useCallback, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import zhCN from 'antd/locale/zh_CN';

dayjs.locale('zh-cn');
import AppConfigProvider from '../../common/AppConfigProvider';
import { CmProjectExportRecordsProvider } from './useCmProjectExportRecords';
import { ConstructionHomeView } from './ConstructionHomeView';
import { ProjectListFullPage } from './components/ProjectListFullPage';
import { ProcessFlowDiagram } from './components/ProcessFlowDiagram';
import { MatterListPage } from './components/MatterListPage';
import { ProjectPortraitDetailPage } from './components/ProjectPortraitDetailPage';
import type { ConstructionView, MatterKey } from './types';

function parseView(view: ConstructionView): { base: string; matterKey?: MatterKey } {
  if (view.startsWith('matter-')) {
    return { base: 'matter', matterKey: view.replace('matter-', '') as MatterKey };
  }
  return { base: view };
}

const App: React.FC = () => {
  const [view, setView] = useState<ConstructionView>('home');
  const [portraitProjectId, setPortraitProjectId] = useState('p1');

  const goHome = useCallback(() => setView('home'), []);
  const openPortrait = useCallback((id: string) => {
    setPortraitProjectId(id);
    setView('portrait-full');
  }, []);
  const openMatter = useCallback((key: MatterKey) => setView(`matter-${key}`), []);

  const parsed = parseView(view);

  if (parsed.base === 'project-list-full') {
    return <ProjectListFullPage onBack={goHome} onViewPortrait={openPortrait} />;
  }
  if (parsed.base === 'process-flow') {
    return <ProcessFlowDiagram onBack={goHome} onOpenMatter={openMatter} />;
  }
  if (parsed.base === 'portrait-full') {
    return <ProjectPortraitDetailPage projectId={portraitProjectId} onBack={goHome} />;
  }
  if (parsed.base === 'matter' && parsed.matterKey) {
    return (
      <MatterListPage
        matterKey={parsed.matterKey}
        onBack={goHome}
        onSwitchMatter={openMatter}
        onViewPortrait={openPortrait}
      />
    );
  }

  return (
    <div className="zht-root hz-cm-root">
      <CmProjectExportRecordsProvider>
        <ConstructionHomeView />
      </CmProjectExportRecordsProvider>
    </div>
  );
};

export default function HuzhouConstructionPortraitPage() {
  return (
    <AppConfigProvider locale={zhCN}>
      <App />
    </AppConfigProvider>
  );
}
