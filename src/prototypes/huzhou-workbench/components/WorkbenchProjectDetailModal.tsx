/**
 * 工作台 · 建设项目详情弹窗（与建管画像同源 ParcelDetailModal）
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ParcelDetailModal } from '../../huzhou-lifecycle-shared/components/ParcelDetailModal';
import type { OpenParcelDetailOptions } from '../../huzhou-spatial-portrait/components/HuzhouMapWithParcelDetail';
import { getLanduseFeatureByOsmId } from '../../huzhou-spatial-portrait/huzhouMapConstants';
import {
  buildConstructionOpenOptions,
  resolveCmDetailParcel,
} from '../../huzhou-construction-portrait/cmParcelDetailResolution';
import { resolveProjectParcelId } from '../../huzhou-construction-portrait/mock/projects';
import { CmProjectFavoriteStar } from '../../huzhou-construction-portrait/components/CmProjectFavoriteStar';
import type { ConstructionProject } from '../../huzhou-construction-portrait/types';

type WorkbenchProjectDetailModalProps = {
  project: ConstructionProject | null;
  onClose: () => void;
  isFavorite: (projectId: string) => boolean;
  onToggleFavorite: (projectId: string) => void;
};

export const WorkbenchProjectDetailModal: React.FC<WorkbenchProjectDetailModalProps> = ({
  project,
  onClose,
  isFavorite,
  onToggleFavorite,
}) => {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<{
    parcelId: string;
    options: OpenParcelDetailOptions;
  } | null>(null);
  const headerExtraProjectIdRef = useRef<string | undefined>();

  React.useEffect(() => {
    if (!project) {
      setOpen(false);
      return;
    }
    const options = buildConstructionOpenOptions(project);
    setDetail({ parcelId: resolveProjectParcelId(project), options });
    setOpen(true);
    headerExtraProjectIdRef.current = options.constructionProjectId;
  }, [project]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleAfterClose = useCallback(() => {
    setDetail(null);
    headerExtraProjectIdRef.current = undefined;
    onClose();
  }, [onClose]);

  const detailParcel = useMemo(() => {
    if (!detail) return undefined;
    return resolveCmDetailParcel(detail.parcelId, detail.options);
  }, [detail]);

  const headerExtraProjectId = open ? detail?.options.constructionProjectId : headerExtraProjectIdRef.current;

  const headerExtra = useMemo(() => {
    if (!headerExtraProjectId) return null;
    return (
      <CmProjectFavoriteStar
        active={isFavorite(headerExtraProjectId)}
        onToggle={() => onToggleFavorite(headerExtraProjectId)}
      />
    );
  }, [headerExtraProjectId, isFavorite, onToggleFavorite]);

  return (
    <ParcelDetailModal
      open={open}
      parcel={detailParcel}
      parcelId={detail?.parcelId ?? null}
      onClose={handleClose}
      afterClose={handleAfterClose}
      stageAccentPhaseKey={detail?.options.stageAccentPhaseKey}
      constructionProject={detail?.options.constructionProject}
      phaseAlert={detail?.options.phaseAlert ?? null}
      headerExtra={headerExtra}
      resolveParcelLanduseFeature={parcel =>
        parcel.mapFeatureId ? getLanduseFeatureByOsmId(parcel.mapFeatureId) : null
      }
    />
  );
};
