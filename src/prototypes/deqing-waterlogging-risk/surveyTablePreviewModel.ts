import { AREA_IMPORTANCE_LABEL, HAZARD_POINT_TYPE_LABEL, LEVEL1_FACTOR_LABEL } from './types';
import type { Level1Factor, RiskIndicatorRow, SurveyPointType } from './types';
import {
  getAuxiliaryCondition,
  listAppendixAuxiliarySurveyFields,
  shouldCollectAuxiliaryInIndicatorCensus,
} from './compositeConditionalSurvey';
import {
  COMMON_APPENDIX_CONDITION_FIELDS,
  HISTORICAL_DISASTER_SECTION_LABEL,
  listAppendixBConditionFieldsForPointType,
} from './appendixBConditionFields';
import { getPointSurveyIndicatorsForPoint } from './indicatorSurveyUtils';
import { getSurveyPreviewIndicatorHintLines } from './scoreExplanation';

/** 四种易涝点类型（附录 B 信息采集表） */
export const SURVEY_TABLE_POINT_TYPES: SurveyPointType[] = [
  'SUNKEN',
  'TUNNEL',
  'UNDERGROUND',
  'LOW_LYING',
];

export type PreviewCellKind =
  | 'blank'
  | 'text'
  | 'address'
  | 'number'
  | 'yesno'
  | 'yesno_with_extra'
  | 'enum_checkboxes'
  | 'note'
  | 'indicator';

export interface PreviewTableRow {
  no?: string;
  label: string;
  kind: PreviewCellKind;
  unit?: string;
  extraLabel?: string;
  extraUnit?: string;
  /** enum_checkboxes 选项文案 */
  options?: string[];
  /** 指标行：填报说明（与赋分说明一致，多行） */
  indicatorHintLines?: string[];
  colspan?: 1 | 2;
}

export interface PreviewTableSection {
  /** 一级序号（表头展示，与行内 x.y 的 x 一致） */
  sectionNo: number;
  title: string;
  rows: PreviewTableRow[];
}

export interface SurveyTablePreviewModel {
  pointType: SurveyPointType;
  typeLabel: string;
  sections: PreviewTableSection[];
  indicatorCount: number;
}

export interface SurveyTablePreviewOptions {
  /** 为 true 时仅展示架构中已启用的普查指标 */
  architectureScoped?: boolean;
}

const AREA_IMPORTANCE_OPTIONS = Object.values(AREA_IMPORTANCE_LABEL);

function surveyScopeOptions(
  options?: SurveyTablePreviewOptions,
): { architectureScoped: true } | undefined {
  return options?.architectureScoped ? { architectureScoped: true } : undefined;
}

function appendixBasicRows(
  pointType: SurveyPointType,
  indicators: RiskIndicatorRow[],
  sectionNo: number,
  options?: SurveyTablePreviewOptions,
): PreviewTableRow[] {
  const rows: PreviewTableRow[] = [
    { no: `${sectionNo}.1`, label: '名称', kind: 'text' },
    { no: `${sectionNo}.2`, label: '地址', kind: 'address' },
  ];

  if (pointType === 'SUNKEN') {
    rows.push(
      { no: `${sectionNo}.3`, label: '高程', kind: 'number', unit: 'm' },
      { no: `${sectionNo}.4`, label: '下凹深度', kind: 'number', unit: 'cm' },
      { no: `${sectionNo}.5`, label: '汇水面积', kind: 'number', unit: 'm²' },
      { no: `${sectionNo}.6`, label: '最大历史积水深度', kind: 'number', unit: 'cm' },
      { no: `${sectionNo}.7`, label: '雨水口/沟布置是否满足规范要求', kind: 'yesno' },
      {
        no: `${sectionNo}.8`,
        label: '是否有调蓄池',
        kind: 'yesno_with_extra',
        extraLabel: '有效容积',
        extraUnit: 'm³',
      },
      {
        no: `${sectionNo}.9`,
        label: '是否有排涝泵站',
        kind: 'yesno_with_extra',
        extraLabel: '泵排能力',
        extraUnit: 'm³/h',
      },
      { no: `${sectionNo}.10`, label: '是否有监测设施', kind: 'yesno' },
      { no: `${sectionNo}.11`, label: '积水报警装置是否运行正常', kind: 'yesno' },
      { no: `${sectionNo}.12`, label: '是否有内涝应急预案', kind: 'yesno' },
    );
  } else {
    rows.push(
      { no: `${sectionNo}.3`, label: '最大历史积水深度', kind: 'number', unit: 'cm' },
      {
        no: `${sectionNo}.4`,
        label: '是否有调蓄池',
        kind: 'yesno_with_extra',
        extraLabel: '有效容积',
        extraUnit: 'm³',
      },
      {
        no: `${sectionNo}.5`,
        label: '是否有排涝泵站',
        kind: 'yesno_with_extra',
        extraLabel: '泵排能力',
        extraUnit: 'm³/h',
      },
      { no: `${sectionNo}.6`, label: '是否有监测设施', kind: 'yesno' },
      { no: `${sectionNo}.7`, label: '积水报警装置是否运行正常', kind: 'yesno' },
      { no: `${sectionNo}.8`, label: '是否有内涝应急预案', kind: 'yesno' },
    );
    let seq = 9;
    const commonKeys = new Set(COMMON_APPENDIX_CONDITION_FIELDS.map(f => f.key));
    for (const field of listAppendixBConditionFieldsForPointType(pointType, indicators, {
      onlyEnabledIndicators: options?.architectureScoped,
    })) {
      if (pointType === 'SUNKEN') continue;
      if (commonKeys.has(field.key)) continue;
      rows.push({
        no: `${sectionNo}.${seq}`,
        label: field.label,
        kind: 'number',
        unit: field.unit ?? (field.kind === 'numeric' ? 'm' : undefined),
      });
      seq += 1;
    }
    for (const { owner, config } of listAppendixAuxiliarySurveyFields(indicators, pointType)) {
      rows.push({
        no: `${sectionNo}.${seq}`,
        label: config.label,
        kind: 'number',
        unit: config.unit,
        indicatorHintLines: [config.hint, owner.remark].filter(Boolean) as string[],
      });
      seq += 1;
    }
    if (seq === 9) {
      rows.push({
        no: '',
        label: `「${HAZARD_POINT_TYPE_LABEL[pointType]}」无附录 B 专用扩展项，类型相关指标见下方各因子章节`,
        kind: 'note',
        colspan: 2,
      });
    }
  }

  return rows;
}

function historicalDisasterRows(sectionNo: number): PreviewTableRow[] {
  return [
    { no: `${sectionNo}.1`, label: '有历史灾情', kind: 'yesno' },
    ...COMMON_APPENDIX_CONDITION_FIELDS.map((field, i) => ({
      no: `${sectionNo}.${i + 2}`,
      label: field.label,
      kind: 'number' as const,
      unit: field.unit,
    })),
  ];
}

function surroundingRows(sectionNo: number): PreviewTableRow[] {
  return [
    {
      no: `${sectionNo}.1`,
      label: '地区重要程度',
      kind: 'enum_checkboxes',
      options: AREA_IMPORTANCE_OPTIONS,
    },
  ];
}

/** 致灾 / 孕灾 / 承灾因子各为独立一级章节 */
function indicatorSectionsByLevel1(
  indicators: RiskIndicatorRow[],
  pointType: SurveyPointType,
  startSectionNo: number,
  options?: SurveyTablePreviewOptions,
): PreviewTableSection[] {
  const list = getPointSurveyIndicatorsForPoint(indicators, pointType, surveyScopeOptions(options));
  const order: Level1Factor[] = ['HAZARD', 'FORMATION', 'BEARING'];
  const sections: PreviewTableSection[] = [];
  let sectionNo = startSectionNo;

  for (const l1 of order) {
    const group = list.filter(i => i.level1 === l1);
    if (!group.length) continue;

    const rows: PreviewTableRow[] = [];
    let seq = 0;

    for (const ind of group) {
      const aux = getAuxiliaryCondition(ind);
      if (shouldCollectAuxiliaryInIndicatorCensus(ind) && aux) {
        seq += 1;
        const auxHints = [aux.hint, ind.remark].filter(Boolean) as string[];
        rows.push({
          no: `${sectionNo}.${seq}`,
          label: aux.label,
          kind: 'indicator',
          unit: aux.unit,
          indicatorHintLines: auxHints,
        });
      }

      seq += 1;
      const base = {
        no: `${sectionNo}.${seq}`,
        label: ind.name,
      };
      const hintLines = getSurveyPreviewIndicatorHintLines(ind);
      const hintProps = hintLines.length ? { indicatorHintLines: hintLines } : {};

      if (ind.valueType === 'boolean') {
        rows.push({ ...base, kind: 'yesno', ...hintProps });
      } else if (ind.valueType === 'enum') {
        rows.push({
          ...base,
          kind: 'enum_checkboxes',
          options: ind.scoreRules.map(r => r.label).filter(Boolean),
          ...hintProps,
        });
      } else {
        rows.push({
          ...base,
          kind: 'indicator',
          unit: ind.unit,
          ...hintProps,
        });
      }
    }

    sections.push({
      sectionNo,
      title: LEVEL1_FACTOR_LABEL[l1],
      rows,
    });
    sectionNo += 1;
  }

  if (!sections.length) {
    sections.push({
      sectionNo: startSectionNo,
      title: '指标项',
      rows: [
        {
          label: '当前无启用且纳入普查的指标（请在指标管理中启用并勾选「纳入普查」）',
          kind: 'note',
          colspan: 2,
        },
      ],
    });
  }

  return sections;
}

/** 根据当前指标配置生成某类型的附录 B + 指标普查预览结构 */
export function buildSurveyTablePreview(
  pointType: SurveyPointType,
  indicators: RiskIndicatorRow[],
  options?: SurveyTablePreviewOptions,
): SurveyTablePreviewModel {
  const pointList = getPointSurveyIndicatorsForPoint(
    indicators,
    pointType,
    surveyScopeOptions(options),
  );
  const indicatorCount =
    pointList.length + pointList.filter(i => shouldCollectAuxiliaryInIndicatorCensus(i)).length;

  return {
    pointType,
    typeLabel: HAZARD_POINT_TYPE_LABEL[pointType],
    indicatorCount,
    sections: [
      {
        sectionNo: 1,
        title: '基本信息',
        rows: appendixBasicRows(pointType, indicators, 1, options),
      },
      {
        sectionNo: 2,
        title: HISTORICAL_DISASTER_SECTION_LABEL,
        rows: historicalDisasterRows(2),
      },
      {
        sectionNo: 3,
        title: '隐患点周边情况',
        rows: surroundingRows(3),
      },
      ...indicatorSectionsByLevel1(indicators, pointType, 4, options),
    ],
  };
}

export function buildAllSurveyTablePreviews(
  indicators: RiskIndicatorRow[],
  options?: SurveyTablePreviewOptions,
): SurveyTablePreviewModel[] {
  return SURVEY_TABLE_POINT_TYPES.map(pt => buildSurveyTablePreview(pt, indicators, options));
}
