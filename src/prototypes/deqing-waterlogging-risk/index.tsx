/**
 * @name 风险自动定级
 *
 * 德清城市内涝系统扩充：风险指标/等级管理、易涝点普查与定级。
 * 依据《重庆市城市内涝风险评估技术导则》指标体系法（附录 E/F、表 5.6.1）。
 */
import './style.css';
import React, { useMemo, useState } from 'react';
import { Alert, Button, Layout, Modal, Space, Spin, Tag, message } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import AppConfigProvider from '../../common/AppConfigProvider';
import { DownOutlined, SafetyOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { getActiveRegionalPreventionRecord, getRegionalPreventionForRating } from './regionalPreventionUtils';
import { waterloggingPointRegistry } from '../../database/deqing-waterlogging-point-registry';
import type { MenuKey } from './types';
import { enrichIndicatorsWithBaseline } from './indicatorSurveyUtils';
import {
  configToMergedIndicators,
  getArchitectureForRating,
  getRatingLevel1Weights,
} from './indicatorArchitectureUtils';
import {
  getLevelsFromRecord,
  getRiskLevelForRating,
} from './riskLevelVersionUtils';
import { useDeqingWorkspace } from './useDeqingWorkspace';
import { RiskIndicatorPage } from './riskIndicatorPage';
import { RiskLevelPage } from './riskLevelPage';
import { IndicatorArchitectureVersionsPage } from './indicatorArchitectureVersionsPage';
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
      { key: 'indicator-architecture-versions', label: '指标评价管理' },
      { key: 'risk-levels', label: '风险等级管理' },
    ],
  },
];

const App: React.FC = () => {
  const [expandedKeys, setExpandedKeys] = useState<string[]>(['point-risk', 'risk-mgmt']);
  const [activeSubMenu, setActiveSubMenu] = useState<MenuKey>('point-survey');
  const [openArchVersionsEdit, setOpenArchVersionsEdit] = useState(false);
  const [openArchVersionsDetailId, setOpenArchVersionsDetailId] = useState<string | null>(null);
  const [openRiskLevelDetailId, setOpenRiskLevelDetailId] = useState<string | null>(null);

  const {
    ready,
    loadError,
    saveStatus,
    saveError,
    state,
    setIndicators,
    setRiskLevelRecords,
    setPoints,
    setRegionalPreventionRecords,
    setRiskChangeLogs,
    setArchitectureRecords,
    flushWorkspaceSave,
    retryLoad,
    reloadWorkspace,
    exportConflict,
  } = useDeqingWorkspace();

  const persistenceBlocked = saveStatus === 'error' || saveStatus === 'conflict';

  const commitWorkspaceChange = async (apply: () => void) => {
    if (persistenceBlocked) {
      throw new Error('工作区保存尚未恢复，请先在顶部处理保存失败或并发冲突');
    }
    apply();
    await flushWorkspaceSave();
  };

  const downloadConflictCopy = () => {
    const content = exportConflict();
    if (!content) {
      message.warning('当前没有可导出的本地工作区副本');
      return;
    }
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `deqing-waterlogging-workspace-local-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const confirmReloadWorkspace = () => {
    Modal.confirm({
      title: '重新加载服务器版本？',
      content: '这会放弃当前尚未成功保存的本地修改。建议先下载本地副本留存。',
      okText: '重新加载',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await reloadWorkspace();
        message.success('已重新加载服务器版本');
      },
    });
  };

  const indicators = state?.indicators ?? [];
  const indicatorLevels = state?.indicatorLevels ?? [];
  const riskLevelRecords = state?.riskLevelRecords ?? [];
  const points = state?.points ?? [];
  const regionalPreventionRecords = state?.regionalPreventionRecords ?? [];
  const riskChangeLogs = state?.riskChangeLogs ?? [];
  const architectureRecords = state?.architectureRecords ?? [];

  const ratingArchitectureRecord = useMemo(
    () => getArchitectureForRating(architectureRecords),
    [architectureRecords],
  );

  const ratingRiskLevelRecord = useMemo(
    () => getRiskLevelForRating(riskLevelRecords),
    [riskLevelRecords],
  );
  const ratingRiskLevels = useMemo(
    () => getLevelsFromRecord(ratingRiskLevelRecord),
    [ratingRiskLevelRecord],
  );
  const effectiveIndicatorLevels = useMemo(
    () => (ratingRiskLevels.length > 0 ? ratingRiskLevels : indicatorLevels),
    [ratingRiskLevels, indicatorLevels],
  );

  const ratingLevel1Weights = useMemo(
    () => getRatingLevel1Weights(ratingArchitectureRecord),
    [ratingArchitectureRecord],
  );

  const ratingIndicators = useMemo(() => {
    if (!ratingArchitectureRecord) {
      return indicators.map(i => ({ ...i, enabled: false }));
    }
    return configToMergedIndicators(indicators, ratingArchitectureRecord.config);
  }, [indicators, ratingArchitectureRecord]);

  const regionalPreventionForRating = useMemo(
    () => getRegionalPreventionForRating(regionalPreventionRecords, ratingArchitectureRecord),
    [regionalPreventionRecords, ratingArchitectureRecord],
  );
  const activePreventionRecord = useMemo(
    () => getActiveRegionalPreventionRecord(regionalPreventionRecords, ratingArchitectureRecord),
    [regionalPreventionRecords, ratingArchitectureRecord],
  );

  const enrichedIndicators = useMemo(
    () => enrichIndicatorsWithBaseline(indicators, []),
    [indicators],
  );
  const enrichedRatingIndicators = useMemo(
    () => enrichIndicatorsWithBaseline(ratingIndicators, []),
    [ratingIndicators],
  );
  const defaultIndicators = useMemo(() => [] as typeof indicators, []);

  const viewArchitectureDetail = (recordId: string) => {
    setOpenArchVersionsDetailId(recordId);
    setExpandedKeys(prev => (prev.includes('risk-mgmt') ? prev : [...prev, 'risk-mgmt']));
    setActiveSubMenu('indicator-architecture-versions');
  };

  const viewRiskLevelDetail = (recordId: string) => {
    setOpenRiskLevelDetailId(recordId);
    setExpandedKeys(prev => (prev.includes('risk-mgmt') ? prev : [...prev, 'risk-mgmt']));
    setActiveSubMenu('risk-levels');
  };

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
            onChange={next => commitWorkspaceChange(() => setPoints(next))}
            baseIndicators={enrichedIndicators}
            architectureRecords={architectureRecords}
            ratingArchitectureRecord={ratingArchitectureRecord}
            ratingIndicators={enrichedRatingIndicators}
            pointRegistry={waterloggingPointRegistry}
            indicatorLevels={effectiveIndicatorLevels}
            ratingLevel1Weights={ratingLevel1Weights}
            regionalPrevention={regionalPreventionForRating}
            regionalPreventionRecords={regionalPreventionRecords}
            activeArchitectureRecord={ratingArchitectureRecord}
            activeRiskLevelRecord={ratingRiskLevelRecord}
            riskLevelRecords={riskLevelRecords}
            riskChangeLogs={riskChangeLogs}
            onAppendRiskChangeLog={entry =>
              commitWorkspaceChange(() => setRiskChangeLogs(prev => [entry, ...prev]))
            }
            onViewArchitectureDetail={record => viewArchitectureDetail(record.id)}
            onViewRiskLevelDetail={record => viewRiskLevelDetail(record.id)}
          />
        );
      case 'point-rating':
        return (
          <HazardPointRatingPage
            riskChangeLogs={riskChangeLogs}
            indicatorLevels={effectiveIndicatorLevels}
          />
        );
      case 'prevention-config':
        return (
          <PreventionConfigPage
            records={regionalPreventionRecords}
            onChange={next =>
              commitWorkspaceChange(() => setRegionalPreventionRecords(next))
            }
            baseIndicators={enrichedIndicators}
            architectureRecords={architectureRecords}
            ratingArchitectureRecord={ratingArchitectureRecord}
            points={points}
            riskChangeLogs={riskChangeLogs}
            onViewArchitectureDetail={record => viewArchitectureDetail(record.id)}
          />
        );
      case 'risk-indicators':
        return (
          <RiskIndicatorPage
            indicators={enrichedIndicators}
            defaultIndicators={defaultIndicators}
            architectureRecords={architectureRecords}
            onChange={next => commitWorkspaceChange(() => setIndicators(next))}
            onOpenArchitecture={options => {
              setActiveSubMenu('indicator-architecture-versions');
              if (options?.editMode) {
                setOpenArchVersionsEdit(true);
              }
            }}
          />
        );
      case 'indicator-architecture-versions':
        return (
          <IndicatorArchitectureVersionsPage
            records={architectureRecords}
            onChange={next =>
              commitWorkspaceChange(() => setArchitectureRecords(next))
            }
            baseIndicators={enrichedIndicators}
            defaultIndicators={defaultIndicators}
            indicatorLevels={effectiveIndicatorLevels}
            activeRiskLevelRecord={ratingRiskLevelRecord}
            regionalPreventionRecords={regionalPreventionRecords}
            points={points}
            riskChangeLogs={riskChangeLogs}
            openEditOnMount={openArchVersionsEdit}
            onEditMountHandled={() => setOpenArchVersionsEdit(false)}
            openDetailRecordIdOnMount={openArchVersionsDetailId}
            onDetailMountHandled={() => setOpenArchVersionsDetailId(null)}
          />
        );
      case 'risk-levels':
        return (
          <RiskLevelPage
            records={riskLevelRecords}
            onChange={next =>
              commitWorkspaceChange(() => setRiskLevelRecords(next))
            }
            points={points}
            riskChangeLogs={riskChangeLogs}
            openDetailRecordIdOnMount={openRiskLevelDetailId}
            onDetailMountHandled={() => setOpenRiskLevelDetailId(null)}
          />
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

  if (!state) {
    return (
      <AppConfigProvider locale={zhCN}>
        <div className="dq-workspace-blocked">
          <Alert
            type="error"
            showIcon
            message="工作区加载失败，已阻止进入编辑"
            description={loadError ?? '无法读取工作区数据，请检查本地服务后重试。'}
            action={
              <Button type="primary" danger onClick={() => void retryLoad().catch(() => undefined)}>
                重试
              </Button>
            }
          />
        </div>
      </AppConfigProvider>
    );
  }

  return (
    <AppConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#1e5bb5', borderRadius: 4 } }}>
      <Layout className="water-env-dashboard facility-mgmt-standalone">
        {persistenceBlocked && (
          <Alert
            type="error"
            showIcon
            banner
            message={saveStatus === 'conflict' ? '工作区存在并发冲突，已停止自动保存' : '工作区保存失败'}
            description={saveError ?? '本地修改仍保留，请先处理后再继续引用或定级。'}
            action={
              <Space wrap>
                <Button onClick={() => void flushWorkspaceSave().catch(() => undefined)}>
                  重试保存
                </Button>
                <Button onClick={downloadConflictCopy}>下载本地副本</Button>
                {saveStatus === 'conflict' ? (
                  <Button danger onClick={confirmReloadWorkspace}>
                    重新加载服务器版本
                  </Button>
                ) : null}
              </Space>
            }
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
              <span className="dq-workspace-save-state" aria-live="polite">
                {saveStatus === 'saving' ? <Tag color="processing">保存中</Tag> : null}
                {saveStatus === 'saved' ? <Tag color="success">已保存</Tag> : null}
                {saveStatus === 'error' ? <Tag color="error">保存失败</Tag> : null}
                {saveStatus === 'conflict' ? <Tag color="error">并发冲突</Tag> : null}
              </span>
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
