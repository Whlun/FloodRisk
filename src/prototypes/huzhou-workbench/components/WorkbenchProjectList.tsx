import React from 'react';
import { Card, Empty, List } from 'antd';
import type { ConstructionProject } from '../../huzhou-construction-portrait/types';
import { getPhaseMetric } from '../../huzhou-construction-portrait/mock/phaseDistribution';
import { CmPhaseStageTag } from '../../huzhou-lifecycle-shared/components/CmPhaseStageTag';

type WorkbenchProjectListProps = {
  projects: ConstructionProject[];
  onViewAll: () => void;
  onProjectClick: (project: ConstructionProject) => void;
};

export const WorkbenchProjectList: React.FC<WorkbenchProjectListProps> = ({
  projects,
  onViewAll,
  onProjectClick,
}) => (
  <Card
    className="hz-wb-list-card"
    title="近期建设项目"
    size="small"
    bordered
    extra={
      <button type="button" className="hz-wb-link-btn" onClick={onViewAll}>
        查看全部 →
      </button>
    }
  >
    {projects.length === 0 ? (
      <Empty description="暂无项目" image={Empty.PRESENTED_IMAGE_SIMPLE} />
    ) : (
      <List
        dataSource={projects}
        renderItem={project => (
          <List.Item className="hz-wb-list-row" onClick={() => onProjectClick(project)}>
            <div className="hz-wb-list-row__main">
              <div className="hz-wb-list-row__head">
                <span className="hz-wb-list-row__title">{project.name}</span>
                <CmPhaseStageTag phaseKey={project.phaseKey}>
                  {getPhaseMetric(project.phaseKey).label}
                </CmPhaseStageTag>
              </div>
              <div className="hz-wb-list-row__meta">{project.region}</div>
            </div>
          </List.Item>
        )}
      />
    )}
  </Card>
);
