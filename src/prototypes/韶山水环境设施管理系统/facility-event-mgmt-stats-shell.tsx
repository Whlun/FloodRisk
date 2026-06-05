/**
 * 设施管理 · 事件管理 · 事件统计（公用入口）
 * 按点位类型分 Tab；统计与事件列表共用 eventRows 台账。
 */
import React, { useEffect, useState } from 'react';
import { Tabs } from 'antd';
import type { UnifiedFacilityEventRecord } from './facility-unified-event-data';
import { FacilityUnifiedEventStatsView } from './facility-unified-event-stats-view';

export type FacilityEventMgmtStatsShellProps = {
  eventRows: UnifiedFacilityEventRecord[];
  defaultTab?: 'pump' | 'plant' | 'monitor';
};

export const FacilityEventMgmtStatsShell: React.FC<FacilityEventMgmtStatsShellProps> = ({
  eventRows,
  defaultTab = 'pump',
}) => {
  const [activeKey, setActiveKey] = useState<string>(defaultTab);

  useEffect(() => {
    setActiveKey(defaultTab);
  }, [defaultTab]);

  return (
    <Tabs
      activeKey={activeKey}
      onChange={setActiveKey}
      destroyInactiveTabPane
      items={[
        {
          key: 'pump',
          label: '泵站事件',
          children: (
            <FacilityUnifiedEventStatsView
              eventRows={eventRows}
              pointKind="泵站"
              facilityPlaceholder="全部泵站"
            />
          ),
        },
        {
          key: 'plant',
          label: '污水厂事件',
          children: (
            <FacilityUnifiedEventStatsView
              eventRows={eventRows}
              pointKind="污水厂"
              facilityPlaceholder="全部污水厂"
            />
          ),
        },
        {
          key: 'monitor',
          label: '监测点事件',
          children: (
            <FacilityUnifiedEventStatsView
              eventRows={eventRows}
              pointKind="监测点"
              facilityPlaceholder="全部监测点"
            />
          ),
        },
      ]}
    />
  );
};
