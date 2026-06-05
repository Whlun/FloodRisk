/**
 * @name 风险自动定级
 *
 * 德清城市内涝系统扩充：风险指标/等级管理、易涝点普查与定级。
 * 依据《重庆市城市内涝风险评估技术导则》指标体系法（附录 E/F、表 5.6.1）。
 */
import './style.css';
import '../shared/ant-table-text-no-overlap.css';
import React, { useMemo, useState } from 'react';
import { Alert, Layout, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import AppConfigProvider from '../../common/AppConfigProvider';
import { DownOutlined, SafetyOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { getActiveRegionalPreventionRecord, getRegionalPreventionForRating } from './regionalPreventionUtils';
import { waterloggingPointRegistry } from '../../database/deqing-waterlogging-point-registry';
import type { MenuKey } from './types';
import { cloneLevel1Weights } from './types';
import { enrichIndicatorsWithBaseline } from './indicatorSurveyUtils';
import { useDeqingWorkspace } from './useDeqingWorkspace';
import { RiskIndicatorPage } from './riskIndicatorPage';
import { RiskLevelPage } from './riskLevelPage';
import { IndicatorArchitecturePage } from './indicatorArchitecturePage';
import { HazardPointSurveyPage } from './hazardPointSurveyPage';
import { HazardPointRatingPage } from './hazardPointRatingPage';
import { PreventionConfigPage } from './preventionConfigPage';

const { Content } = Layout;

const SIDEBAR_MENUS: {
  key: string;
  label: string;
  icon: React.ReactNode;
  children: { key: MenuKey; label: string }[];
}[] = [
  {
    key: 'point-risk',
    label: '内涝定级',
    icon: <EnvironmentOutlined />,
    children: [
      { key: 'point-survey', label: '内涝普查定级' },
      { key: 'prevention-config', label: '防灾减灾指标信息' },
      { key: 'point-rating', label: '风险变更记录' },
    ],
  },
  {
    key: 'risk-mgmt',
    label: '风险自动定级',
    icon: <SafetyOutlined />,
    children: [
      { key: 'risk-indicators', label: '风险指标管理' },
      { key: 'indicator-architecture', label: '指标架构图' },
      { key: 'risk-levels', label: '风险等级管理' },
    ],
  },
];

const App: React.FC = () => {
  const [expandedKeys, setExpandedKeys] = useState<string[]>(['point-risk', 'risk-mgmt']);
  const [activeSubMenu, setActiveSubMenu] = useState<MenuKey>('point-survey');
  const [archStartInEditMode, setArchStartInEditMode] = useState(false);

  const {
    ready,
    loadError,
    state,
    setIndicators,
    setIndicatorLevels,
    setPoints,
    setRegionalPreventionRecords,
    setRiskChangeLogs,
    setLevel1Weights,
    setWeightSource,
  } = useDeqingWorkspace();

  const indicators = state?.indicators ?? [];
  const indicatorLevels = state?.indicatorLevels ?? [];
  const points = state?.points ?? [];
  const regionalPreventionRecords = state?.regionalPreventionRecords ?? [];
  const riskChangeLogs = state?.riskChangeLogs ?? [];
  const level1Weights = state?.level1Weights ?? cloneLevel1Weights();
  const weightSource = state?.weightSource ?? 'appendix_e';

  const regionalPreventionForRating = useMemo(
    () => getRegionalPreventionForRating(regionalPreventionRecords),
    [regionalPreventionRecords],
  );
  const activePreventionRecord = useMemo(
    () => getActiveRegionalPreventionRecord(regionalPreventionRecords),
    [regionalPreventionRecords],
  );

  const enrichedIndicators = useMemo(
    () => enrichIndicatorsWithBaseline(indicators, []),
    [indicators],
  );
  const defaultIndicators = useMemo(() => [] as typeof indicators, []);
  const defaultLevel1Weights = useMemo(() => cloneLevel1Weights(), []);

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
  };

  const getBreadcrumbPath = () => {
    for (const m of SIDEBAR_MENUS) {
      const c = m.children.find(x => x.key === activeSubMenu);
      if (c) return `${m.label} / ${c.label}`;
    }
    return '风险自动定级';
  };

  const renderContent = () => {
    switch (activeSubMenu) {
      case 'point-survey':
        return (
          <HazardPointSurveyPage
            points={points}
            onChange={setPoints}
            indicators={enrichedIndicators}
            pointRegistry={waterloggingPointRegistry}
            indicatorLevels={indicatorLevels}
            level1Weights={level1Weights}
            regionalPrevention={regionalPreventionForRating}
            regionalPreventionRecords={regionalPreventionRecords}
            onAppendRiskChangeLog={entry => setRiskChangeLogs(prev => [entry, ...prev])}
          />
        );
      case 'point-rating':
        return (
          <HazardPointRatingPage riskChangeLogs={riskChangeLogs} indicatorLevels={indicatorLevels} />
        );
      case 'prevention-config':
        return (
          <PreventionConfigPage
            records={regionalPreventionRecords}
            onChange={setRegionalPreventionRecords}
            indicators={enrichedIndicators}
          />
        );
      case 'risk-indicators':
        return (
          <RiskIndicatorPage
            indicators={enrichedIndicators}
            defaultIndicators={defaultIndicators}
            onChange={setIndicators}
            indicatorLevels={indicatorLevels}
            level1Weights={level1Weights}
            regionalPrevention={regionalPreventionForRating}
            activePreventionRecord={activePreventionRecord}
            onOpenArchitecture={options => {
              setArchStartInEditMode(Boolean(options?.editMode));
              setActiveSubMenu('indicator-architecture');
            }}
          />
        );
      case 'indicator-architecture':
        return (
          <IndicatorArchitecturePage
            indicators={enrichedIndicators}
            defaultIndicators={defaultIndicators}
            onChange={setIndicators}
            level1Weights={level1Weights}
            defaultLevel1Weights={defaultLevel1Weights}
            onLevel1WeightsChange={setLevel1Weights}
            startInEditMode={archStartInEditMode}
            onEditModeEntered={() => setArchStartInEditMode(false)}
            weightSource={weightSource}
            onWeightSourceChange={setWeightSource}
          />
        );
      case 'risk-levels':
        return (
          <RiskLevelPage indicatorLevels={indicatorLevels} onIndicatorLevelsChange={setIndicatorLevels} />
        );
      default:
        return null;
    }
  };

  if (!ready) {
    return (
      <AppConfigProvider locale={zhCN}>
        <div className="dq-workspace-loading" style={{ padding: 48, textAlign: 'center' }}>
          <Spin size="large" tip="正在加载工作区数据…" />
        </div>
      </AppConfigProvider>
    );
  }

  return (
    <AppConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#1e5bb5', borderRadius: 4 } }}>
      <Layout className="water-env-dashboard facility-mgmt-standalone">
        {loadError && (
          <Alert
            type="warning"
            showIcon
            banner
            message="工作区从本地服务加载失败，已使用默认数据"
            description={loadError}
          />
        )}
        <div className="main-layout with-sidebar">
          <div className="sidebar-menu">
            <div className="sidebar-menu-title">风险自动定级</div>
            <div className="sidebar-menu-list">
              {SIDEBAR_MENUS.map(menu => {
                const isExpanded = expandedKeys.includes(menu.key);
                return (
                  <div key={menu.key} className="sidebar-menu-item-wrapper">
                    <div
                      className={`sidebar-menu-item ${isExpanded ? 'active' : ''}`}
                      onClick={() => toggleExpand(menu.key)}
                      role="button"
                      tabIndex={0}
                    >
                      <span className="sidebar-menu-icon">{menu.icon}</span>
                      <span className="sidebar-menu-label">{menu.label}</span>
                      <span className={`sidebar-menu-arrow ${isExpanded ? 'expanded' : ''}`}>
                        <DownOutlined />
                      </span>
                    </div>
                    {isExpanded && (
                      <div className="sidebar-submenu">
                        {menu.children.map(child => (
                          <div
                            key={child.key}
                            className={`sidebar-submenu-item ${activeSubMenu === child.key ? 'active' : ''}`}
                            onClick={() => setActiveSubMenu(child.key)}
                            role="button"
                            tabIndex={0}
                          >
                            {child.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="main-content-area">
            <div className="breadcrumb-bar">
              <span className="breadcrumb-current">{getBreadcrumbPath()}</span>
            </div>
            <Content className="main-content with-sidebar">
              <div className="content-wrapper">{renderContent()}</div>
            </Content>
          </div>
        </div>
      </Layout>
    </AppConfigProvider>
  );
};

export default App;
