/**
 * 地块全生命周期详情 · 左时间轴 + 右内容（对齐湖州市空间全画像 docx 项目画像）
 */
import React, { useEffect, useMemo, useState } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import { Button, Modal, Tabs, Typography } from 'antd';
import {
  zhtDetailModalStyles,
  zhtResolveDetailModalContainer,
} from '../../zonghe-taishi/zhtDetailModalShared';

/** 地块详情弹窗宽度（左右分栏，略宽于综合态势设施台账） */
const HZ_LIFECYCLE_DETAIL_MODAL_WIDTH = 'min(1600px, 98vw)' as const;
import { getParcelById } from '../mock/demoParcels';
import type { Feature } from 'geojson';
import type { MatterStageRecord, ParcelLifecycle } from '../types';
import {
  CM_PHASE_LABELS,
  matterStageToCmPhaseAccentKey,
  resolveMatterForCmPhase,
  type CmPhaseAccentKey,
} from '../cmPhaseAccent';
import { getMatterDisplayFields } from '../matterDisplayFields';
import type { ConstructionProjectBasicInfoSnapshot } from '../cmProjectBasicInfo';
import type { MatterStageKey } from '../parcelMatterStages';
import { formatHuzhouDistrictDisplay } from '../huzhouDistricts';
import { CmDistrictTag } from './CmDistrictTag';
import { CmPhaseStageTag } from './CmPhaseStageTag';
import { CmPhaseLifecycleNav, cmPhaseLabelOf } from './CmPhaseLifecycleNav';
import { ParcelBasicInfoSection } from './ParcelBasicInfoSection';
import { ParcelArchiveDocumentsPanel } from './ParcelArchiveDocumentsPanel';
import { ParcelMatterGeoMap } from './ParcelMatterGeoMap';
import { ParcelMatterFieldPanel } from './ParcelMatterFieldPanel';
import { matterLabelOf, ParcelLifecycleNav } from './ParcelLifecycleNav';
import {
  getMatterStageRecords,
  matterRecordTabLabel,
} from '../matterStageData';
import { MATTER_STAGE_BY_KEY } from '../parcelMatterStages';
import '../lifecycle-detail.css';

import type { HzPhaseAlertData } from './HzPhaseAlertLine';

const { Text, Title } = Typography;

export type ParcelDetailPhaseAlert = HzPhaseAlertData;

export type ParcelDetailModalProps = {
  open: boolean;
  /** 已合并的建设项目地块（建管画像优先传入） */
  parcel?: ParcelLifecycle;
  /** 未传 parcel 时按 id 读取演示台账 */
  parcelId?: string | null;
  onClose: () => void;
  onLocateOnMap?: (parcel: ParcelLifecycle) => void;
  getModalContainer?: () => HTMLElement;
  /** 建管画像：与来源项目卡阶段标签同色 */
  stageAccentPhaseKey?: CmPhaseAccentKey;
  /** 建管画像：与列表表格同源的项目字段 */
  constructionProject?: ConstructionProjectBasicInfoSnapshot;
  /** 建管画像：阶段滞留预警（与项目卡同源） */
  phaseAlert?: ParcelDetailPhaseAlert | null;
  /** 建管画像：默认右上角关闭钮左侧（项目收藏星标） */
  headerExtra?: React.ReactNode;
  /** 关闭动画结束后再清理外部状态，避免顶栏在动画中重排 */
  afterClose?: () => void;
  /** 图形 Tab：真实土地利用面（由 huzhou-spatial-portrait 注入） */
  resolveParcelLanduseFeature?: (parcel: ParcelLifecycle) => Feature | null;
};

export const ParcelDetailModal: React.FC<ParcelDetailModalProps> = ({
  open,
  parcel: parcelProp,
  parcelId = null,
  onClose,
  onLocateOnMap,
  getModalContainer,
  stageAccentPhaseKey,
  constructionProject,
  phaseAlert = null,
  headerExtra,
  afterClose,
  resolveParcelLanduseFeature,
}) => {
  const parcel =
    parcelProp ?? (parcelId ? getParcelById(parcelId) : undefined);
  const isConstructionContext = stageAccentPhaseKey != null;
  const [activeMatter, setActiveMatter] = useState<MatterStageKey>('pre-review');
  const [activeCmPhaseKey, setActiveCmPhaseKey] = useState<CmPhaseAccentKey>('pre-review');
  const [contentTab, setContentTab] = useState('attr');
  const [activeRecordIndex, setActiveRecordIndex] = useState(0);

  const resolvedMatterKey =
    isConstructionContext && parcel
      ? resolveMatterForCmPhase(parcel, activeCmPhaseKey)
      : activeMatter;

  const matterLabel = isConstructionContext
    ? cmPhaseLabelOf(activeCmPhaseKey)
    : matterLabelOf(activeMatter);
  const useCmMatterLayout = isConstructionContext;

  const matterRecords = parcel ? getMatterStageRecords(parcel, resolvedMatterKey) : [];
  const cmDisplayFields =
    useCmMatterLayout && parcel ? getMatterDisplayFields(resolvedMatterKey) : undefined;
  const matterPanelEmpty = useCmMatterLayout && matterRecords.length === 0;
  const activeRecord: MatterStageRecord | undefined =
    matterRecords[activeRecordIndex] ??
    matterRecords[0] ??
    (cmDisplayFields?.length ? ({} as MatterStageRecord) : undefined);
  const recordTabLabel = MATTER_STAGE_BY_KEY[resolvedMatterKey]?.label ?? matterLabel;

  useEffect(() => {
    if (!parcel) return;
    if (isConstructionContext && stageAccentPhaseKey) {
      setActiveCmPhaseKey(stageAccentPhaseKey);
      setActiveMatter(resolveMatterForCmPhase(parcel, stageAccentPhaseKey));
    } else {
      setActiveMatter(parcel.currentStageKey);
    }
    setContentTab('attr');
    setActiveRecordIndex(0);
  }, [parcel?.id, isConstructionContext, stageAccentPhaseKey]);

  useEffect(() => {
    setActiveRecordIndex(0);
    setContentTab('attr');
  }, [resolvedMatterKey]);

  const headerPhaseKey = parcel
    ? stageAccentPhaseKey ?? matterStageToCmPhaseAccentKey(parcel.currentStageKey)
    : 'pre-review';
  const headerPhaseLabel =
    parcel && isConstructionContext
      ? CM_PHASE_LABELS[headerPhaseKey]
      : parcel
        ? (MATTER_STAGE_BY_KEY[parcel.currentStageKey]?.label ?? '—')
        : '—';
  const headerRegionValue = constructionProject?.region ?? parcel?.region;
  const showHeaderDistrictTag =
    headerRegionValue != null && formatHuzhouDistrictDisplay(headerRegionValue) !== '—';

  const headerTitle = constructionProject?.name ?? parcel?.name ?? '地块详情';

  const title = parcel ? (
    <div className="hz-lifecycle-modal__header-bar">
      <div className="hz-lifecycle-modal__title-group">
        <span className="hz-lifecycle-modal__title">
          <Text ellipsis={{ tooltip: headerTitle }}>{headerTitle}</Text>
        </span>
        <span className="hz-lifecycle-modal__header-tags">
          {showHeaderDistrictTag ? <CmDistrictTag value={headerRegionValue} /> : null}
          <CmPhaseStageTag phaseKey={headerPhaseKey}>{headerPhaseLabel}</CmPhaseStageTag>
        </span>
      </div>
      {headerExtra ? (
        <div className="hz-lifecycle-modal__header-trailing">
          {headerExtra}
          <button
            type="button"
            className="hz-lifecycle-modal__close-btn"
            aria-label="Close"
            onClick={onClose}
          >
            <span className="hz-lifecycle-modal__close-btn-x">
              <CloseOutlined />
            </span>
          </button>
        </div>
      ) : null}
    </div>
  ) : (
    '地块详情'
  );

  const geoPhaseKey: CmPhaseAccentKey = parcel
    ? isConstructionContext
      ? activeCmPhaseKey
      : matterStageToCmPhaseAccentKey(activeMatter)
    : 'pre-review';

  const tabItems = useMemo(() => {
    if (!parcel || !activeRecord) return [];
    const fieldPanelProps = {
      matterKey: resolvedMatterKey,
      data: activeRecord,
      denseGrid: useCmMatterLayout,
      emptyLayout: matterPanelEmpty,
    };
    const items = [
      {
        key: 'attr',
        label: '属性',
        children: <ParcelMatterFieldPanel {...fieldPanelProps} fieldMode="all" />,
      },
      {
        key: 'geo',
        label: '图形',
        children: (
          <ParcelMatterGeoMap
            parcel={parcel}
            phaseKey={geoPhaseKey}
            landuseFeature={resolveParcelLanduseFeature?.(parcel) ?? null}
            onLocateOnMap={onLocateOnMap}
          />
        ),
      },
      {
        key: 'archive',
        label: '档案',
        children: (
          <ParcelArchiveDocumentsPanel
            attachments={parcel.attachments}
            matterLabel={MATTER_STAGE_BY_KEY[resolvedMatterKey]?.label ?? matterLabel}
            filterByMatter={useCmMatterLayout}
          />
        ),
      },
    ];
    return items;
  }, [
    parcel,
    activeRecord,
    resolvedMatterKey,
    useCmMatterLayout,
    matterPanelEmpty,
    matterLabel,
    onLocateOnMap,
    resolveParcelLanduseFeature,
    geoPhaseKey,
  ]);

  const modalStyles = {
    ...zhtDetailModalStyles,
    body: {
      ...zhtDetailModalStyles.body,
      maxHeight: 'min(88vh, 920px)',
      paddingTop: 8,
      overflowY: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    },
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      afterClose={afterClose}
      footer={null}
      centered
      width={HZ_LIFECYCLE_DETAIL_MODAL_WIDTH}
      styles={modalStyles}
      className={`hz-lifecycle-modal${headerExtra ? ' hz-lifecycle-modal--has-header-extra' : ''}`}
      closable={!headerExtra}
      destroyOnClose
      zIndex={2200}
      getContainer={() => {
        if (getModalContainer) return getModalContainer();
        return zhtResolveDetailModalContainer(
          document.querySelector('.hz-maplibre-stack') as HTMLElement | null,
        );
      }}
    >
      {!parcel ? (
        <div className="hz-lifecycle-detail__empty">未找到地块数据</div>
      ) : (
        <div className="hz-lifecycle-layout">
          <ParcelBasicInfoSection
            parcel={parcel}
            stageAccentPhaseKey={stageAccentPhaseKey}
            constructionProject={constructionProject}
          />

          <div className="hz-lifecycle-layout__split">
            <div className="hz-lifecycle-layout__timeline">
              {isConstructionContext ? (
                <CmPhaseLifecycleNav
                  parcel={parcel}
                  activePhaseKey={activeCmPhaseKey}
                  phaseAlert={phaseAlert}
                  onPhaseChange={key => {
                    setActiveCmPhaseKey(key);
                    setActiveMatter(resolveMatterForCmPhase(parcel, key));
                    setContentTab('attr');
                    setActiveRecordIndex(0);
                  }}
                />
              ) : (
                <ParcelLifecycleNav
                  parcel={parcel}
                  activeMatter={activeMatter}
                  onMatterChange={key => {
                    setActiveMatter(key);
                    setContentTab('attr');
                  }}
                />
              )}
            </div>
            <main className="hz-lifecycle-layout__main">
              {useCmMatterLayout && matterRecords.length > 1 ? (
                <div className="hz-lifecycle-layout__main-hd">
                  <Tabs
                    className="hz-lifecycle-layout__record-tabs"
                    size="small"
                    activeKey={String(activeRecordIndex)}
                    onChange={key => {
                      setActiveRecordIndex(Number(key));
                      setContentTab('attr');
                    }}
                    items={matterRecords.map((_, i) => ({
                      key: String(i),
                      label: matterRecordTabLabel(recordTabLabel, i),
                    }))}
                  />
                </div>
              ) : !useCmMatterLayout ? (
                <div className="hz-lifecycle-layout__main-hd">
                  <Title level={5} className="hz-lifecycle-layout__matter-title">
                    {matterLabel}
                  </Title>
                </div>
              ) : null}
              <Tabs
                className="facility-detail-tabs facility-mgmt-detail-tabs hz-lifecycle-layout__tabs"
                activeKey={contentTab}
                onChange={setContentTab}
                destroyOnHidden
                items={tabItems}
              />
            </main>
          </div>
        </div>
      )}
    </Modal>
  );
};
