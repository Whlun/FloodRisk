import type { CmProjectCardMetric, ConstructionProject } from '../types';
import { resolveCmBasicInfoCellText } from '../../huzhou-lifecycle-shared/cmProjectBasicInfo';
import { getParcelById } from '../../huzhou-lifecycle-shared/mock/demoParcels';
import { getBasicInfoDescriptionFields } from '../../huzhou-lifecycle-shared/parcelBasicInfo';
import { buildConstructionProjectSnapshot } from './constructionProjectParcel';
import { resolveProjectParcelId } from './projects';

/** 项目卡 KPI：与 ParcelDetailModal 基本信息同源（总用地 / 总投资 / 建设性质） */
const CARD_BASIC_INFO_METRICS = [
  { code: 'total_land_area', label: '总用地', kind: 'stat' as const, unit: 'm²' },
  { code: 'total_fund', label: '总投资', kind: 'stat' as const, unit: '万元' },
  { code: 'construct_nature', label: '建设性质', kind: 'enum' as const },
] as const;

function formatCardMetricLabel(label: string, unit?: string): string {
  return unit ? `${label}(${unit})` : label;
}

/** 首页右栏项目卡 · 基本信息三项 KPI（与详情 / 列表同源） */
export function getProjectCardMetrics(project: ConstructionProject): CmProjectCardMetric[] {
  const parcel = getParcelById(resolveProjectParcelId(project));
  const snapshot = buildConstructionProjectSnapshot(project);
  const fields = getBasicInfoDescriptionFields();

  return CARD_BASIC_INFO_METRICS.map(({ code, label, kind, ...rest }) => {
    const unit = 'unit' in rest ? rest.unit : undefined;
    const field = fields.find(f => f.stageCode === code);
    const raw = field ? resolveCmBasicInfoCellText(parcel, field, snapshot) : '—';
    return {
      label: formatCardMetricLabel(label, unit),
      value: raw,
      kind,
    };
  });
}
