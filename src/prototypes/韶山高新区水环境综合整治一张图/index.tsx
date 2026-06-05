/**
 * @name 韶山水环境综合整治一张图（系统壳）
 * @description 单入口：顶栏展示「韶山市水环境综合整治一张图」；子路径下嵌套各业务子页面；首次进入主内容区预拉取全部分包并显示加载提示。默认「综合态势」。
 */
import './style.css';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Badge, Tooltip, Typography } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import AppConfigProvider from '../../common/AppConfigProvider';
import {
  DashboardOutlined,
  BuildOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { ShellUserMenu } from '../../common/ShellUserMenu';
import { Leaf, Mountain } from 'lucide-react';
import { ShellAlarmRailBridgeProvider, useShellAlarmRailBridge } from './shellAlarmRailBridge';

const { Text } = Typography;

/** 与 `src/prototypes/韶山高新区水环境综合整治一张图` 目录名一致，供路径解析 */
const SHELL_BUNDLE_NAME = '韶山高新区水环境综合整治一张图';

const ROUTE_ZONGHE = 'zonghe';
const ROUTE_SHESHI = 'sheshi';
const ROUTE_SHENGTAI = 'shengtai';
const ROUTE_YAOGAN = 'yaogan';
const ROUTE_YINGJI = 'yingji';
const ROUTE_XITONG = 'xitong';

const SUB_KEYS = [
  ROUTE_ZONGHE,
  ROUTE_SHESHI,
  ROUTE_SHENGTAI,
  ROUTE_YAOGAN,
  ROUTE_YINGJI,
  ROUTE_XITONG,
] as const;

type SubKey = (typeof SUB_KEYS)[number];

function isSubKey(x: string): x is SubKey {
  return (SUB_KEYS as readonly string[]).includes(x);
}

/** 进入壳地址未带子路径、或子路径非法时，落到综合态势 */
const DEFAULT_SUB: SubKey = ROUTE_ZONGHE;

/**
 * 子页面静态导入：`vite build` 单入口 IIFE 不允许分包动态 import（与 Rollup 冲突）。
 * 代价为首屏 JS 较大；开发态仍按需编译模块。
 */
import ZonghePage from '../zonghe-taishi/index';
import SheshiPage from '../韶山水环境设施管理系统/index';
import ShengtaiPage from '../生态整治/index';
import YaoganPage from '../遥感监测/index';
import YingjiPage from '../应急协同/index';
import XitongPage from '../韶山水环境系统管理/index';

/**
 * 当前 URL 在壳下的路径前缀，形如 `/prototypes/韶山高新区水环境综合整治一张图/`
 *（依赖浏览器对 pathname 的已解码段）
 */
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

/** 从路径读取子段；缺省或非法时 `replaceState` 并返回默认子页 */
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

const MENU: Array<{
  key: SubKey;
  label: string;
  icon: React.ReactNode;
}> = [
  { key: ROUTE_ZONGHE, label: '综合态势', icon: <DashboardOutlined /> },
  { key: ROUTE_SHESHI, label: '设施管理', icon: <BuildOutlined /> },
  { key: ROUTE_SHENGTAI, label: '生态整治', icon: <span className="ss-one-map-shell__nav-ico" aria-hidden><Leaf className="ss-one-map-shell__nav-ico--lucide" strokeWidth={1.8} /></span> },
  { key: ROUTE_YAOGAN, label: '遥感监测', icon: <span className="ss-one-map-shell__nav-ico" aria-hidden><Mountain className="ss-one-map-shell__nav-ico--lucide" strokeWidth={1.8} /></span> },
  { key: ROUTE_YINGJI, label: '应急协同', icon: <SafetyCertificateOutlined /> },
  { key: ROUTE_XITONG, label: '系统管理', icon: <SettingOutlined /> },
];

const ShellInner: React.FC = () => {
  const [subKey, setSubKey] = useState<SubKey>(DEFAULT_SUB);
  const { requestAlarmRail } = useShellAlarmRailBridge();

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
      const prefix = pi >= 0 && segs[pi + 1] === SHELL_BUNDLE_NAME
        ? `/${segs.slice(0, pi + 2).join('/')}/`
        : getShellPathPrefixFromLocation();
      const url = prefix + next;
      history.pushState(null, '', url);
      setSubKey(next);
    },
    [subKey],
  );

  /** 顶栏报警：切换至综合态势并由该页将右侧栏换为报警列表（与地图同屏联动）；非综合态势时先跳转 */
  const onHeaderAlarmClick = useCallback(() => {
    if (subKey !== ROUTE_ZONGHE) {
      sessionStorage.setItem('ss-shell-pending-alarm-rail', '1');
      pushSub(ROUTE_ZONGHE);
      return;
    }
    requestAlarmRail();
  }, [subKey, pushSub, requestAlarmRail]);

  const main = useMemo(() => {
    switch (subKey) {
      case ROUTE_ZONGHE:
        return <ZonghePage key="zonghe" />;
      case ROUTE_SHESHI:
        return <SheshiPage key="sheshi" />;
      case ROUTE_SHENGTAI:
        return <ShengtaiPage key="shengtai" />;
      case ROUTE_YAOGAN:
        return <YaoganPage key="yaogan" />;
      case ROUTE_YINGJI:
        return <YingjiPage key="yingji" />;
      case ROUTE_XITONG:
        return <XitongPage key="xitong" />;
      default:
        return null;
    }
  }, [subKey]);

  return (
    <div className="ss-one-map-shell">
      <header className="ss-one-map-shell__header" role="banner">
        <h1 className="ss-one-map-shell__title" title="韶山市水环境综合整治一张图">
          韶山市水环境综合整治一张图
        </h1>
        <nav className="ss-one-map-shell__nav" aria-label="系统一级导航">
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
          <button type="button" className="ss-one-map-shell__alarm-trigger" aria-label="打开报警信息" onClick={onHeaderAlarmClick}>
            <Badge count={3} size="small" offset={[-2, 2]}>
              <BellOutlined className="ss-one-map-shell__bell" aria-hidden />
            </Badge>
            <span className="ss-one-map-shell__alarm-trigger-label">报警</span>
          </button>
          <ShellUserMenu />
        </div>
      </header>
      <main className="ss-one-map-shell__body">
        <div className="ss-one-map-shell__embed--fill">{main}</div>
      </main>
    </div>
  );
};

const Shell: React.FC = () => (
  <AppConfigProvider
    locale={zhCN}
    theme={{
      token: { colorPrimary: '#1e5bb5', borderRadius: 4, fontFamily: 'inherit' },
      components: { Table: { cellFontSize: 12 } },
    }}
  >
    <ShellAlarmRailBridgeProvider>
      <ShellInner />
    </ShellAlarmRailBridgeProvider>
  </AppConfigProvider>
);

export default Shell;
