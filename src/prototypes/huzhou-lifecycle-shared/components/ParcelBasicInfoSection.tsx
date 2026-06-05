/**
 * 地块详情 · 基本信息（左栏键值列表 + 纵向滚动）
 */
import React, { useMemo } from 'react';
import { Typography } from 'antd';
import {
  formatParcelBasicInfoValue,
  BASIC_INFO_ROW_CURRENT_STAGE,
  BASIC_INFO_ROW_LEGAL_PERSON,
  getBasicInfoDescriptionFields,
  getBasicInfoLegalPersonField,
  resolveParcelBasicInfoValue,
  type ParcelBasicInfoFieldDef,
} from '../parcelBasicInfo';
import { CM_PHASE_LABELS, matterStageToCmPhaseAccentKey, type CmPhaseAccentKey } from '../cmPhaseAccent';
import {
  resolveCmBasicInfoCellText,
  type ConstructionProjectBasicInfoSnapshot,
} from '../cmProjectBasicInfo';
import { MATTER_STAGE_BY_KEY } from '../parcelMatterStages';
import type { ParcelLifecycle } from '../types';
import { CmDistrictTag } from './CmDistrictTag';
import { CmPhaseStageTag } from './CmPhaseStageTag';

const { Text, Paragraph } = Typography;

function renderFieldValue(
  parcel: ParcelLifecycle,
  field: ParcelBasicInfoFieldDef,
  constructionProject?: ConstructionProjectBasicInfoSnapshot,
): React.ReactNode {
  if (field.districtTag) {
    const raw = resolveParcelBasicInfoValue(parcel, field);
    const snapRegion =
      field.parcelKey === 'region' && constructionProject?.region
        ? constructionProject.region
        : undefined;
    return <CmDistrictTag value={snapRegion ?? raw} />;
  }
  const text = constructionProject
    ? resolveCmBasicInfoCellText(parcel, field, constructionProject)
    : formatParcelBasicInfoValue(resolveParcelBasicInfoValue(parcel, field), field);
  if (field.multiline && text !== '—') {
    return (
      <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: '更多' }} style={{ margin: 0 }}>
        {text}
      </Paragraph>
    );
  }
  if (field.ellipsis && text !== '—') {
    return <Text ellipsis={{ tooltip: text }}>{text}</Text>;
  }
  return text;
}

function resolveFieldLabel(field: ParcelBasicInfoFieldDef): string {
  if (field.stageCode === BASIC_INFO_ROW_CURRENT_STAGE) return '当前阶段';
  if (field.stageCode === BASIC_INFO_ROW_LEGAL_PERSON) {
    return getBasicInfoLegalPersonField().label;
  }
  return field.label;
}

function resolveFieldContent(
  parcel: ParcelLifecycle,
  field: ParcelBasicInfoFieldDef,
  stageAccentPhaseKey: CmPhaseAccentKey,
  stageLabel: string | undefined,
  constructionProject?: ConstructionProjectBasicInfoSnapshot,
): React.ReactNode {
  if (field.stageCode === BASIC_INFO_ROW_CURRENT_STAGE) {
    const phaseText =
      stageLabel ?? MATTER_STAGE_BY_KEY[parcel.currentStageKey]?.label ?? '—';
    return (
      <CmPhaseStageTag phaseKey={stageAccentPhaseKey}>{phaseText}</CmPhaseStageTag>
    );
  }
  if (field.stageCode === BASIC_INFO_ROW_LEGAL_PERSON) {
    return renderFieldValue(parcel, getBasicInfoLegalPersonField(), constructionProject);
  }
  return renderFieldValue(parcel, field, constructionProject);
}

export type ParcelBasicInfoSectionProps = {
  parcel: ParcelLifecycle;
  stageAccentPhaseKey?: CmPhaseAccentKey;
  constructionProject?: ConstructionProjectBasicInfoSnapshot;
};

export const ParcelBasicInfoSection: React.FC<ParcelBasicInfoSectionProps> = ({
  parcel,
  stageAccentPhaseKey: stageAccentPhaseKeyProp,
  constructionProject,
}) => {
  const isConstructionContext = stageAccentPhaseKeyProp != null;
  const stageAccentPhaseKey =
    stageAccentPhaseKeyProp ?? matterStageToCmPhaseAccentKey(parcel.currentStageKey);

  const stageLabel = isConstructionContext
    ? CM_PHASE_LABELS[stageAccentPhaseKey]
    : undefined;

  const rows = useMemo(() => {
    const fields = getBasicInfoDescriptionFields();
    return fields.map(field => ({
      key: field.stageCode ?? field.label,
      label: resolveFieldLabel(field),
      value: resolveFieldContent(
        parcel,
        field,
        stageAccentPhaseKey,
        stageLabel,
        constructionProject,
      ),
    }));
  }, [constructionProject, parcel, stageAccentPhaseKey, stageLabel]);

  return (
    <section className="hz-lifecycle-layout__basic">
      <div className="hz-lifecycle-basic__hd">
        <span className="hz-lifecycle-basic__hd-title">
          <span className="hz-lifecycle-basic__hd-mark">»</span>
          基本信息
        </span>
      </div>
      <dl className="hz-lifecycle-basic__list hz-lifecycle-layout__basic-scroll">
        {rows.map(row => (
          <div key={row.key} className="hz-lifecycle-basic__row">
            <dt className="hz-lifecycle-basic__label">{row.label}</dt>
            <dd className="hz-lifecycle-basic__value">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};
