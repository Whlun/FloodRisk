import React from 'react';
import { Card, Empty, List, Tag } from 'antd';
import type { CmProjectWithPhaseAlert } from '../../huzhou-construction-portrait/cmProjectPhaseAlert';
import { getPhaseMetric } from '../../huzhou-construction-portrait/mock/phaseDistribution';

const LEVEL_LABEL: Record<string, string> = {
  serious: '长期滞留',
  warning: '阶段滞留',
  hint: '停留偏久',
};

import type { ConstructionProject } from '../../huzhou-construction-portrait/types';

type WorkbenchAlertListProps = {
  rows: CmProjectWithPhaseAlert[];
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
    title="阶段滞留预警"
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
                <Tag className={`hz-wb-alert-tag--${alert.level}`}>
                  {LEVEL_LABEL[alert.level]}
                </Tag>
              </div>
              <div className="hz-wb-list-row__meta">
                {getPhaseMetric(project.phaseKey).label} · 已停留 {alert.daysInPhase} 天
              </div>
            </div>
          </List.Item>
        )}
      />
    )}
  </Card>
);
