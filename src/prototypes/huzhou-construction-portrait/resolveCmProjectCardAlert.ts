/**
 * 项目卡预警展示 · 仅前三未（批而未供 / 供而未用 / 用而未尽），与预警工程画像一致
 */
import {
  CM_ALERT_TYPE_LABEL,
  formatCmIndustrialLandAlertTimelineMessage,
  getCmIndustrialLandAlert,
  getCmIndustrialLandAlertLevelTone,
  type CmIndustrialLandAlert,
} from './cmIndustrialLandAlert';
import type { CmPhaseAlert, ConstructionProject } from './types';
import type {
  HzPhaseAlertData,
  HzPhaseAlertLevelTone,
} from '../huzhou-lifecycle-shared/components/HzPhaseAlertLine';

export type CmProjectCardAlertDisplay = {
  message: string;
  enteredAt: string;
  levelTone: HzPhaseAlertLevelTone;
  /** 前三未类型标签：批而未供 / 供而未用 / 用而未尽 */
  alertTypeLabel: string;
  alertTypeClass: string;
  phaseAlert: CmPhaseAlert;
  industrialAlert: CmIndustrialLandAlert;
};

function industrialToPhaseAlert(alert: CmIndustrialLandAlert): CmPhaseAlert {
  return {
    projectId: alert.projectId,
    phaseKey: alert.phaseKey,
    level: alert.level,
    enteredAt: alert.referenceDate,
    daysInPhase: alert.delayDays ?? 0,
    message: alert.message,
  };
}

export function resolveCmProjectCardAlert(
  project: ConstructionProject,
): CmProjectCardAlertDisplay | null {
  const industrial = getCmIndustrialLandAlert(project);
  if (!industrial) return null;

  return {
    message: industrial.message,
    enteredAt: industrial.referenceDate,
    levelTone: getCmIndustrialLandAlertLevelTone(industrial.level),
    alertTypeLabel: CM_ALERT_TYPE_LABEL[industrial.alertType],
    alertTypeClass: `hz-cm-alert-card--type-${industrial.alertType}`,
    phaseAlert: industrialToPhaseAlert(industrial),
    industrialAlert: industrial,
  };
}

export function resolveCmProjectCardTimelineMessage(
  display: CmProjectCardAlertDisplay,
): string {
  return formatCmIndustrialLandAlertTimelineMessage(display.industrialAlert);
}

/** 详情弹窗时间轴预警 · 与项目卡 / 预警工程画像同源（仅前三未、三固定节点） */
export function resolveCmDetailPhaseAlert(
  project: ConstructionProject,
): HzPhaseAlertData | null {
  const card = resolveCmProjectCardAlert(project);
  if (!card) return null;

  return {
    message: card.message,
    enteredAt: card.enteredAt,
    levelTone: card.levelTone,
    phaseKey: card.industrialAlert.phaseKey,
    typeTag: card.alertTypeLabel,
    typeTagClassName: card.alertTypeClass,
  };
}
