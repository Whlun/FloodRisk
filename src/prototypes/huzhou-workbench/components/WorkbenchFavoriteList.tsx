import React from 'react';
import { Card, Empty, List, Tag } from 'antd';
import type { ConstructionProject } from '../../huzhou-construction-portrait/types';
import {
  CM_ALERT_TYPE_LABEL,
  CM_INDUSTRIAL_LEVEL_LABEL,
  getCmIndustrialLandAlert,
} from '../../huzhou-construction-portrait/cmIndustrialLandAlert';
import { getPhaseMetric } from '../../huzhou-construction-portrait/mock/phaseDistribution';
import { CmPhaseStageTag } from '../../huzhou-lifecycle-shared/components/CmPhaseStageTag';
import { CmProjectFavoriteStar } from '../../huzhou-construction-portrait/components/CmProjectFavoriteStar';

type WorkbenchFavoriteListProps = {
  projects: ConstructionProject[];
  isFavorite: (projectId: string) => boolean;
  onToggleFavorite: (projectId: string) => void;
  onViewAll: () => void;
  onProjectClick: (project: ConstructionProject) => void;
};

export const WorkbenchFavoriteList: React.FC<WorkbenchFavoriteListProps> = ({
  projects,
  isFavorite,
  onToggleFavorite,
  onViewAll,
  onProjectClick,
}) => (
  <Card
    className="hz-wb-list-card hz-wb-list-card--favorite"
    title="我关注的项目"
    size="small"
    bordered
    extra={
      <button type="button" className="hz-wb-link-btn" onClick={onViewAll}>
        查看全部 →
      </button>
    }
  >
    {projects.length === 0 ? (
      <Empty
        description="暂无关注项目，可在项目详情或建设工程画像中收藏"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    ) : (
      <List
        dataSource={projects}
        renderItem={project => {
          const alert = getCmIndustrialLandAlert(project);
          return (
            <List.Item className="hz-wb-list-row">
              <div
                className="hz-wb-list-row__main hz-wb-list-row__main--clickable"
                onClick={() => onProjectClick(project)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onProjectClick(project);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="hz-wb-list-row__head">
                  <span className="hz-wb-list-row__title">{project.name}</span>
                  <div className="hz-wb-list-row__tags">
                    {alert ? (
                      <>
                        <Tag className={`hz-wb-alert-type-tag hz-wb-alert-type-tag--${alert.alertType}`}>
                          {CM_ALERT_TYPE_LABEL[alert.alertType]}
                        </Tag>
                        <Tag className={`hz-wb-alert-tag--${alert.level}`}>
                          {CM_INDUSTRIAL_LEVEL_LABEL[alert.level]}
                        </Tag>
                      </>
                    ) : null}
                    <CmPhaseStageTag phaseKey={project.phaseKey}>
                      {getPhaseMetric(project.phaseKey).label}
                    </CmPhaseStageTag>
                    <CmProjectFavoriteStar
                      active={isFavorite(project.id)}
                      onToggle={() => onToggleFavorite(project.id)}
                    />
                  </div>
                </div>
                <div className="hz-wb-list-row__meta">
                  {project.region}
                  {alert?.delayDays != null ? ` · 超期 ${alert.delayDays} 天` : ''}
                  {alert?.delayDays != null && alert.unusedAreaMu != null ? ' · ' : ''}
                  {alert?.unusedAreaMu != null ? `未开发 ${alert.unusedAreaMu.toFixed(1)} 亩` : ''}
                </div>
              </div>
            </List.Item>
          );
        }}
      />
    )}
  </Card>
);
