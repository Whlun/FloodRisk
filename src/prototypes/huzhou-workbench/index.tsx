/**
 * @name 湖州市空间全画像 · 工作台
 * @description 无地图数据工作台：汇总空间利用、建设工程、预警工程核心指标与列表，支持跳转各业务 Tab。
 *
 * 参考资料：
 * - src/prototypes/湖州市空间全画像/（系统壳、区县 Context、Tab 导航）
 * - src/prototypes/huzhou-spatial-portrait/mock/regionScopedSpatialStats.ts
 * - src/prototypes/huzhou-construction-portrait/mock/regionScopedData.ts
 * - src/prototypes/huzhou-construction-portrait/cmAlertStats.ts
 */
import './style.css';
import React, { useMemo, useState } from 'react';
import { Col, Row } from 'antd';
import type { ConstructionProject } from '../huzhou-construction-portrait/types';
import { useCmProjectFavorites } from '../huzhou-construction-portrait/useCmProjectFavorites';
import { useHzShellRegion } from '../湖州市空间全画像/hzShellRegionContext';
import { useHzShellNav } from '../湖州市空间全画像/hzShellNavContext';
import { WorkbenchKpiRow } from './components/WorkbenchKpiRow';
import { WorkbenchChartPanel } from './components/WorkbenchChartPanel';
import { WorkbenchAlertList } from './components/WorkbenchAlertList';
import { WorkbenchProjectList } from './components/WorkbenchProjectList';
import { WorkbenchQuickLinks } from './components/WorkbenchQuickLinks';
import { WorkbenchProjectDetailModal } from './components/WorkbenchProjectDetailModal';
import { WorkbenchFavoriteList } from './components/WorkbenchFavoriteList';
import { useWorkbenchData } from './useWorkbenchData';
import { resolveFavoriteProjects } from './workbenchFavorites';

const WorkbenchPage: React.FC = () => {
  const { regionKey } = useHzShellRegion();
  const { navigateSub } = useHzShellNav();
  const data = useWorkbenchData(regionKey);
  const { favoriteIds, isFavorite, toggleFavorite } = useCmProjectFavorites();
  const favoriteProjects = useMemo(
    () => resolveFavoriteProjects(favoriteIds),
    [favoriteIds],
  );
  const [detailProject, setDetailProject] = useState<ConstructionProject | null>(null);

  const goZhongda = () => navigateSub('zhongda');
  const goJianguan = () => navigateSub('jianguan');
  const openProjectDetail = (project: ConstructionProject) => setDetailProject(project);

  return (
    <div className="hz-wb-root">
      <div className="hz-wb-inner">
        <WorkbenchKpiRow kpis={data.kpis} onNavigate={navigateSub} />
        <WorkbenchChartPanel
          supplyTrendYears={data.supplyTrendYears}
          supplyTrendValues={data.supplyTrendValues}
          phaseMetrics={data.phaseMetrics}
        />
        <section className="hz-wb-section">
          <Row gutter={[12, 12]}>
            <Col xs={24} lg={12}>
              <WorkbenchAlertList
                rows={data.alertRows}
                onViewAll={goZhongda}
                onProjectClick={openProjectDetail}
              />
            </Col>
            <Col xs={24} lg={12}>
              <WorkbenchProjectList
                projects={data.recentProjects}
                onViewAll={goJianguan}
                onProjectClick={openProjectDetail}
              />
            </Col>
          </Row>
        </section>
        <section className="hz-wb-section">
          <WorkbenchFavoriteList
            projects={favoriteProjects}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
            onViewAll={goJianguan}
            onProjectClick={openProjectDetail}
          />
        </section>
        <WorkbenchQuickLinks onNavigate={navigateSub} />
      </div>
      <WorkbenchProjectDetailModal
        project={detailProject}
        onClose={() => setDetailProject(null)}
        isFavorite={isFavorite}
        onToggleFavorite={toggleFavorite}
      />
    </div>
  );
};

export default WorkbenchPage;
