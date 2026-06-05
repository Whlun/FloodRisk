import type { IndicatorAppendixBTierBand } from './types';
import {
  GUIDELINE_537_PEDESTRIAN_APPENDIX_KEY,
  GUIDELINE_537_VEHICLE_APPENDIX_KEY,
  GUIDELINE_HISTORICAL_DEATH_KEY,
  GUIDELINE_HISTORICAL_ECONOMIC_KEY,
  GUIDELINE_HISTORICAL_SERIOUS_INJURY_KEY,
  GUIDELINE_HISTORICAL_TRAPPED_KEY,
  TEMPLATE_HISTORICAL_DEATH_TIER_BANDS,
  TEMPLATE_HISTORICAL_ECONOMIC_LOSS_TIER_BANDS,
  TEMPLATE_HISTORICAL_SERIOUS_INJURY_TIER_BANDS,
  TEMPLATE_HISTORICAL_TRAPPED_TIER_BANDS,
  TEMPLATE_PEDESTRIAN_ENTRANCE_TIER_BANDS,
  TEMPLATE_VEHICLE_ENTRANCE_TIER_BANDS,
} from './surveyTemplates';

/** 导则分档模板（按附录 B 普查项索引，供复合子项编辑器选用） */
export interface GuidelineTierBandTemplate {
  id: string;
  label: string;
  appendixBFieldKey: string;
  tierBands: IndicatorAppendixBTierBand[];
}

export const GUIDELINE_TIER_BAND_TEMPLATES: GuidelineTierBandTemplate[] = [
  {
    id: 'guideline-537-pedestrian',
    label: '人行出入口标准分档',
    appendixBFieldKey: GUIDELINE_537_PEDESTRIAN_APPENDIX_KEY,
    tierBands: TEMPLATE_PEDESTRIAN_ENTRANCE_TIER_BANDS,
  },
  {
    id: 'guideline-537-vehicle',
    label: '车行出入口标准分档',
    appendixBFieldKey: GUIDELINE_537_VEHICLE_APPENDIX_KEY,
    tierBands: TEMPLATE_VEHICLE_ENTRANCE_TIER_BANDS,
  },
  {
    id: 'guideline-543-death',
    label: '表5.4.3 人员死亡分档',
    appendixBFieldKey: GUIDELINE_HISTORICAL_DEATH_KEY,
    tierBands: TEMPLATE_HISTORICAL_DEATH_TIER_BANDS,
  },
  {
    id: 'guideline-543-serious-injury',
    label: '表5.4.3 人员重伤分档',
    appendixBFieldKey: GUIDELINE_HISTORICAL_SERIOUS_INJURY_KEY,
    tierBands: TEMPLATE_HISTORICAL_SERIOUS_INJURY_TIER_BANDS,
  },
  {
    id: 'guideline-543-trapped',
    label: '表5.4.3 人员被困分档',
    appendixBFieldKey: GUIDELINE_HISTORICAL_TRAPPED_KEY,
    tierBands: TEMPLATE_HISTORICAL_TRAPPED_TIER_BANDS,
  },
  {
    id: 'guideline-543-economic',
    label: '表5.4.3 直接经济损失分档',
    appendixBFieldKey: GUIDELINE_HISTORICAL_ECONOMIC_KEY,
    tierBands: TEMPLATE_HISTORICAL_ECONOMIC_LOSS_TIER_BANDS,
  },
];

const TEMPLATE_BY_APPENDIX_KEY = new Map(
  GUIDELINE_TIER_BAND_TEMPLATES.map(t => [t.appendixBFieldKey, t]),
);

export function getGuidelineTierBandTemplate(
  appendixBFieldKey?: string,
): GuidelineTierBandTemplate | undefined {
  const key = appendixBFieldKey?.trim();
  if (!key) return undefined;
  return TEMPLATE_BY_APPENDIX_KEY.get(key);
}

export function listGuidelineTierBandTemplatesForPart(
  appendixBFieldKey?: string,
): GuidelineTierBandTemplate[] {
  const hit = getGuidelineTierBandTemplate(appendixBFieldKey);
  return hit ? [hit] : [];
}
