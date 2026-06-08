import React from 'react';
import { Card, Empty, List, Tag } from 'antd';
import {
  CM_ALERT_TYPE_LABEL,
  CM_INDUSTRIAL_LEVEL_LABEL,
  type CmProjectWithIndustrialLandAlert,
} from '../../huzhou-construction-portrait/cmIndustrialLandAlert';
import type { ConstructionProject } from '../../huzhou-construction-portrait/types';

type WorkbenchAlertListProps = {
  rows: CmProjectWithIndustrialLandAlert[];
  onViewAll: () => void;
  onProjectClick: (project: ConstructionProject) => void;
};

export const WorkbenchAlertList: React.FC<WorkbenchAlertListProps> = ({
  rows,
  onViewAll,
  onProjectClick,
}) => (
  <Card
    className="hz-wb-list-card"
    title="预警信息"
    size="small"
    bordered
    extra={
      <button type="button" className="hz-wb-link-btn" onClick={onViewAll}>
        查看全部 →
      </button>
    }
  >
    {rows.length === 0 ? (
      <Empty description="暂无预警项目" image={Empty.PRESENTED_IMAGE_SIMPLE} />
    ) : (
      <List
        dataSource={rows}
        renderItem={({ project, alert }) => (
          <List.Item className="hz-wb-list-row" onClick={() => onProjectClick(project)}>
            <div className="hz-wb-list-row__main">
              <div className="hz-wb-list-row__head">
                <span className="hz-wb-list-row__title">{project.name}</span>
                <div className="hz-wb-list-row__tags">
                  <Tag className={`hz-wb-alert-type-tag hz-wb-alert-type-tag--${alert.alertType}`}>
                    {CM_ALERT_TYPE_LABEL[alert.alertType]}
                  </Tag>
                  <Tag className={`hz-wb-alert-tag--${alert.level}`}>
                    {CM_INDUSTRIAL_LEVEL_LABEL[alert.level]}
                  </Tag>
                </div>
              </div>
              <div className="hz-wb-list-row__meta">
                {alert.delayDays != null ? `超期 ${alert.delayDays} 天` : ''}
                {alert.delayDays != null && alert.unusedAreaMu != null ? ' · ' : ''}
                {alert.unusedAreaMu != null ? `未开发 ${alert.unusedAreaMu.toFixed(1)} 亩` : ''}
              </div>
            </div>
          </List.Item>
        )}
      />
    )}
  </Card>
);
