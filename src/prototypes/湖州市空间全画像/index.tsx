/**
 * @name 湖州市空间全画像（系统壳）
 * @description 单入口顶栏（视觉与韶山系统壳一致：湘潭蓝 #1E5BB5 + 左标题 / 中导航 / 右用户）；子路径嵌套各业务子页面。默认「工作台」。
 *
 * 参考资料：
 * - src/prototypes/韶山高新区水环境综合整治一张图/（壳结构、顶栏样式与路由模式）
 * - src/prototypes/huzhou-spatial-portrait/、huzhou-construction-portrait/、huzhou-alert-portrait/
 */
import './style.css';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Badge, Select, Tooltip } from 'antd';
import AppConfigProvider from '../../common/AppConfigProvider';
import { HZ_REGION_OPTIONS } from '../huzhou-lifecycle-shared/hzRegionScope';
import { HzShellRegionProvider, useHzShellRegion } from './hzShellRegionContext';
import { HzShellNavProvider } from './hzShellNavContext';
import {
  BuildOutlined,
  GlobalOutlined,
  PieChartOutlined,
  BellOutlined,
  ProjectOutlined,
  AreaChartOutlined,
} from '@ant-design/icons';
import { ShellUserMenu } from '../../common/ShellUserMenu';
import zhCN from 'antd/locale/zh_CN';
import { PlaceholderPage } from './components/PlaceholderPage';

/** 与目录名一致，供路径解析 */
const SHELL_BUNDLE_NAME = '湖州市空间全画像';

const ROUTE_LIYONG = 'liyong';
const ROUTE_JIANGUAN = 'jianguan';
const ROUTE_ZHONGDA = 'zhongda';
const ROUTE_DIXIAO = 'dixiao';
const ROUTE_YIZHANGTU = 'yizhangtu';

const SUB_KEYS = [
  ROUTE_LIYONG,
  ROUTE_JIANGUAN,
  ROUTE_ZHONGDA,
  ROUTE_DIXIAO,
  ROUTE_YIZHANGTU,
] as const;

type SubKey = (typeof SUB_KEYS)[number];

function isSubKey(x: string): x is SubKey {
  return (SUB_KEYS as readonly string[]).includes(x);
}

/** 进入壳地址未带子路径、或子路径非法时，落到工作台 */
const DEFAULT_SUB: SubKey = ROUTE_YIZHANGTU;

import { countCmProjectAlerts } from '../huzhou-construction-portrait/cmProjectPhaseAlert';
import { getRegionAlertProjects } from '../huzhou-construction-portrait/mock/regionAlertProjects';
import SpatialPortraitPage from '../huzhou-spatial-portrait/index';
import ConstructionPortraitPage from '../huzhou-construction-portrait/index';
import AlertPortraitPage from '../huzhou-alert-portrait/index';
import WorkbenchPage from '../huzhou-workbench/index';

const MENU: Array<{ key: SubKey; label: string; icon: React.ReactNode }> = [
  { key: ROUTE_YIZHANGTU, label: '工作台', icon: <PieChartOutlined /> },
  { key: ROUTE_LIYONG, label: '空间利用画像', icon: <GlobalOutlined /> },
  { key: ROUTE_JIANGUAN, label: '建设工程画像', icon: <BuildOutlined /> },
  { key: ROUTE_ZHONGDA, label: '预警工程画像', icon: <ProjectOutlined /> },
  { key: ROUTE_DIXIAO, label: '低效用地分析', icon: <AreaChartOutlined /> },
];

function getShellPathPrefixFromLocation(): string {
  const segs = window.location.pathname.split('/').filter(Boolean);
  const pi = segs.indexOf('prototypes');
  if (pi < 0) {
    return `/${['prototypes', SHELL_BUNDLE_NAME].join('/')}/`;
  }
  if (segs[pi + 1] === SHELL_BUNDLE_NAME) {
    return `/${segs.slice(0, pi + 2).join('/')}/`;
  }
  if (segs[pi + 1]) {
    return `/${segs.slice(0, pi + 2).join('/')}/`;
  }
  return `/${segs.join('/')}/`;
}

function readKeyAndFixUrlIfNeeded(): SubKey {
  const segs = window.location.pathname.split('/').filter(Boolean);
  const pi = segs.indexOf('prototypes');
  if (pi < 0 || segs[pi + 1] !== SHELL_BUNDLE_NAME) {
    return DEFAULT_SUB;
  }
  const sub = segs[pi + 2];
  if (sub && isSubKey(sub)) {
    return sub;
  }
  const newPath = `/${[...segs.slice(0, pi + 2), DEFAULT_SUB].join('/')}`;
  if (window.location.pathname !== newPath) {
    history.replaceState(null, '', newPath);
  }
  return DEFAULT_SUB;
}

const ShellInnerContent: React.FC = () => {
  const [subKey, setSubKey] = useState<SubKey>(DEFAULT_SUB);
  const { regionKey, setRegionKey } = useHzShellRegion();
  /** 全画像公共预警角标：当前壳顶栏区县下建管项目阶段滞留数（与各 Tab 无关） */
  const projectAlertCount = useMemo(
    () => countCmProjectAlerts(getRegionAlertProjects(regionKey)),
    [regionKey],
  );

  const syncFromUrl = useCallback(() => {
    setSubKey(readKeyAndFixUrlIfNeeded());
  }, []);

  useLayoutEffect(() => {
    syncFromUrl();
  }, [syncFromUrl]);

  useEffect(() => {
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, [syncFromUrl]);

  const pushSub = useCallback(
    (next: SubKey) => {
      if (next === subKey) return;
      const segs = window.location.pathname.split('/').filter(Boolean);
      const pi = segs.indexOf('prototypes');
      const prefix =
        pi >= 0 && segs[pi + 1] === SHELL_BUNDLE_NAME
          ? `/${segs.slice(0, pi + 2).join('/')}/`
          : getShellPathPrefixFromLocation();
      history.pushState(null, '', prefix + next);
      setSubKey(next);
    },
    [subKey],
  );

  const handleShellAlertClick = useCallback(() => {
    pushSub(ROUTE_ZHONGDA);
  }, [pushSub]);

  const main = useMemo(() => {
    switch (subKey) {
      case ROUTE_LIYONG:
        return <SpatialPortraitPage key="liyong" />;
      case ROUTE_JIANGUAN:
        return <ConstructionPortraitPage key="jianguan" />;
      case ROUTE_ZHONGDA:
        return <AlertPortraitPage key="zhongda" />;
      case ROUTE_DIXIAO:
        return <PlaceholderPage key="dixiao" title="低效用地分析" />;
      case ROUTE_YIZHANGTU:
        return <WorkbenchPage key="yizhangtu" />;
      default:
        return null;
    }
  }, [subKey]);

  return (
    <HzShellNavProvider navigateSub={pushSub}>
      <div className="ss-one-map-shell">
        <header className="ss-one-map-shell__header hz-spatial-shell__header" role="banner">
          <h1 className="ss-one-map-shell__title" title="湖州市工业用地全画像">
            湖州市工业用地全画像
          </h1>
          <nav className="ss-one-map-shell__nav hz-spatial-shell__nav" aria-label="空间全画像一级导航">
            {MENU.map(m => {
              const active = subKey === m.key;
              return (
                <Tooltip key={m.key} title={m.label} mouseEnterDelay={0.3}>
                  <button
                    type="button"
                    className={
                      'ss-one-map-shell__nav-item' + (active ? ' ss-one-map-shell__nav-item--active' : '')
                    }
                    onClick={() => pushSub(m.key)}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span className="ss-one-map-shell__nav-ico" aria-hidden>
                      {m.icon}
                    </span>
                    {m.label}
                  </button>
                </Tooltip>
              );
            })}
          </nav>
          <div className="ss-one-map-shell__right">
            <button
              type="button"
              className="ss-one-map-shell__alarm-trigger"
              aria-label="跳转到预警工程画像"
              onClick={handleShellAlertClick}
            >
              <Badge dot={projectAlertCount > 0} offset={[2, 0]}>
                <BellOutlined className="ss-one-map-shell__bell" aria-hidden />
              </Badge>
              <span className="ss-one-map-shell__alarm-trigger-label">预警</span>
            </button>
            <ShellUserMenu />
            <Select
              size="small"
              className="hz-shell-region-select"
              value={regionKey}
              options={HZ_REGION_OPTIONS}
              onChange={setRegionKey}
              popupMatchSelectWidth={false}
              aria-label="行政区划"
            />
          </div>
        </header>
        <main className="ss-one-map-shell__body">
          <div className="ss-one-map-shell__embed--fill">{main}</div>
        </main>
      </div>
    </HzShellNavProvider>
  );
};

const ShellInner: React.FC = () => (
  <HzShellRegionProvider>
    <ShellInnerContent />
  </HzShellRegionProvider>
);

const Shell: React.FC = () => (
  <AppConfigProvider
    locale={zhCN}
    theme={{
      token: { colorPrimary: '#1e5bb5', borderRadius: 4, fontFamily: 'inherit' },
      components: { Table: { cellFontSize: 12 } },
    }}
  >
    <ShellInner />
  </AppConfigProvider>
);

export default Shell;
