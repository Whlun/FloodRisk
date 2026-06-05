/**
 * 建设工程画像 · 详情弹窗连续横向时间轴（顶行 5 大阶段标签 + 9 细项节点）
 */
import React, { useCallback, useMemo } from 'react';
import { ExclamationCircleFilled } from '@ant-design/icons';
import { Tooltip } from 'antd';
import {
  CM_PHASE_MACRO_GROUPS,
  CM_PHASES,
  cmPhaseButtonState,
  cmPhaseHasData,
  formatCmPhaseAcceptTime,
  getCmPhaseConfig,
  resolveCmPhaseNavDate,
  type CmPhaseAccentKey,
  type CmPhaseButtonState,
  type CmPhaseMacroKey,
} from '../cmPhaseAccent';
import type { ParcelLifecycle } from '../types';
import { HzPhaseAlertLine, type HzPhaseAlertData } from './HzPhaseAlertLine';

export type CmPhaseLifecycleNavProps = {
  parcel: ParcelLifecycle;
  activePhaseKey: CmPhaseAccentKey;
  onPhaseChange: (key: CmPhaseAccentKey) => void;
  phaseAlert?: HzPhaseAlertData | null;
};

function CmPhaseNavDot({
  state,
  selected,
  alertMessage,
}: {
  state: CmPhaseButtonState;
  selected: boolean;
  alertMessage?: string;
}) {
  const done = state === 'done';
  const hasAlert = Boolean(alertMessage);
  const dot = (
    <span
      className={[
        'hz-lc-cm-nav__dot',
        done ? 'hz-lc-cm-nav__dot--done' : '',
        state === 'active' ? 'hz-lc-cm-nav__dot--active' : '',
        state === 'disabled' ? 'hz-lc-cm-nav__dot--empty' : '',
        selected ? 'hz-lc-cm-nav__dot--selected' : '',
        hasAlert ? 'hz-lc-cm-nav__dot--alert' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden={!hasAlert}
      aria-label={hasAlert ? '阶段滞留预警' : undefined}
    >
      {hasAlert ? (
        <ExclamationCircleFilled className="hz-lc-cm-nav__dot-alert-ico" aria-hidden />
      ) : done ? (
        <svg
          className="hz-lc-cm-nav__dot-check"
          viewBox="0 0 16 16"
          aria-hidden
        >
          <path
            d="M3.5 8.2 6.4 11.1 12.5 4.9"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </span>
  );

  if (hasAlert) {
    return (
      <Tooltip title={alertMessage} placement="top" mouseEnterDelay={0.35}>
        {dot}
      </Tooltip>
    );
  }

  return dot;
}

function macroGroupTitle(key: CmPhaseMacroKey): string {
  const titles: Record<CmPhaseMacroKey, string> = {
    approve: '批 · 预审与选址、农转用报批',
    supply: '供 · 土地供应',
    use: '用 · 用地规划许可、土地首次登记',
    build: '建 · 工程规划许可、工程施工许可',
    verify: '验 · 用地复核验收、规划核实',
  };
  return titles[key];
}

export const CmPhaseLifecycleNav: React.FC<CmPhaseLifecycleNavProps> = ({
  parcel,
  activePhaseKey,
  onPhaseChange,
  phaseAlert = null,
}) => {
  const phaseKeys = useMemo(
    () => CM_PHASE_MACRO_GROUPS.flatMap(group => group.phaseKeys),
    [],
  );

  const renderPhaseStep = useCallback(
    (phaseKey: CmPhaseAccentKey, index: number) => {
      const phase = getCmPhaseConfig(phaseKey);
      const state = cmPhaseButtonState(parcel, phase.key);
      const hasData = cmPhaseHasData(parcel, phase.key);
      const selected = phase.key === activePhaseKey;
      const navDate = resolveCmPhaseNavDate(parcel, phase.key);
      const nextPhaseKey = phaseKeys[index + 1];
      const connectorDone =
        state === 'done' &&
        nextPhaseKey != null &&
        cmPhaseButtonState(parcel, nextPhaseKey) === 'done';
      const stepAlertText =
        phaseAlert?.phaseKey === phase.key
          ? phaseAlert.timelineMessage ?? phaseAlert.message
          : undefined;
      const showStepAlert = phaseAlert?.phaseKey === phase.key;

      return (
        <div
          key={phase.key}
          className={[
            'hz-lc-cm-nav__step',
            hasData ? `hz-cm-phase-card--phase-${phase.key}` : '',
            selected ? 'hz-lc-cm-nav__step--selected' : '',
            state === 'done' ? 'hz-lc-cm-nav__step--done' : '',
            state === 'active' ? 'hz-lc-cm-nav__step--stage-active' : '',
            !hasData ? 'hz-lc-cm-nav__step--empty' : '',
            connectorDone ? 'hz-lc-cm-nav__step--connector-done' : '',
            showStepAlert ? 'hz-lc-cm-nav__step--has-alert' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="hz-lc-cm-nav__step-head">
            <CmPhaseNavDot state={state} selected={selected} alertMessage={stepAlertText} />
          </div>
          <button
            type="button"
            className={[
              'hz-lc-cm-nav__entry',
              selected ? 'hz-lc-cm-nav__entry--selected' : '',
              !hasData ? 'hz-lc-cm-nav__entry--empty' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-current={selected ? 'step' : undefined}
            onClick={() => onPhaseChange(phase.key)}
          >
            <span className="hz-lc-cm-nav__phase-label">{phase.label}</span>
            <div className="hz-lc-cm-nav__time-block">
              <span className="hz-lc-cm-nav__time-label">{navDate.label}</span>
              <span className="hz-lc-cm-nav__time-value">
                {!hasData ? '—' : formatCmPhaseAcceptTime(navDate.value)}
              </span>
            </div>
          </button>
          {showStepAlert && phaseAlert ? (
            <HzPhaseAlertLine
              compact
              showIcon={false}
              className="hz-lc-cm-nav__step-alert"
              message={phaseAlert.timelineMessage ?? phaseAlert.message}
              enteredAt={phaseAlert.enteredAt}
              levelTone={phaseAlert.levelTone}
              phaseKey={phaseAlert.phaseKey}
            />
          ) : null}
        </div>
      );
    },
    [parcel, activePhaseKey, onPhaseChange, phaseAlert, phaseKeys],
  );

  return (
    <nav
      className="hz-lc-cm-nav hz-lc-cm-nav--horizontal"
      aria-label="事项阶段"
      style={{ '--hz-lc-cm-step-count': phaseKeys.length } as React.CSSProperties}
    >
      <div className="hz-lc-cm-nav__macro-row">
        {CM_PHASE_MACRO_GROUPS.map(group => (
          <div
            key={group.key}
            className={[
              'hz-lc-cm-nav__macro-slot',
              `hz-lc-cm-nav__macro-slot--span-${group.phaseKeys.length}`,
              group.phaseKeys.includes(activePhaseKey)
                ? 'hz-lc-cm-nav__macro-slot--active'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span
              id={`hz-lc-cm-macro-${group.key}`}
              className="hz-lc-cm-nav__macro-badge"
              title={macroGroupTitle(group.key)}
            >
              {group.label}
            </span>
          </div>
        ))}
      </div>
      <div className="hz-lc-cm-nav__steps-row">
        {phaseKeys.map((phaseKey, index) => renderPhaseStep(phaseKey, index))}
      </div>
    </nav>
  );
};

/** 当前阶段中文名（右侧标题区用） */
export function cmPhaseLabelOf(key: CmPhaseAccentKey): string {
  return CM_PHASES.find(p => p.key === key)?.label ?? key;
}
