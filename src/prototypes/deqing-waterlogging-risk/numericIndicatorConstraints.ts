import type { Rule } from 'antd/es/form';
import type {
  AuxiliaryNumericRange,
  IndicatorAuxiliaryConditionField,
  RiskIndicatorRow,
  ScoreConditionSource,
} from './types';
import { getIndicatorSurveyValue } from './indicatorSurveyUtils';

export interface NumericIndicatorConstraint {
  min: number;
  max: number;
  step?: number;
  precision?: number;
  /** 标签旁问号：正常范围 + 赋分档参考 */
  hint: string;
  /** 表单项下方简要说明 */
  rangeLabel: string;
}

/** 导则附录 F 及业务合理取值区间（超出则标红且不可保存） */
export const NUMERIC_INDICATOR_CONSTRAINTS: Record<string, NumericIndicatorConstraint> = {
  HZ_RAIN_ALERT_FREQ: {
    min: 0,
    max: 60,
    step: 1,
    precision: 0,
    rangeLabel: '合理范围 0～60 次/年',
    hint: '正常范围 0～60 次/年。赋分档：N≤8（低）、8<N≤16（中）、16<N≤24（较高）、N>24（高）。超出范围不可保存。',
  },
  FM_SK_LONG_SLOPE: {
    min: 0,
    max: 20,
    step: 0.1,
    precision: 2,
    rangeLabel: '合理范围 0～20 %',
    hint: '正常范围 0～20 %。赋分档：S<5%（低）、5%≤S<7%（中）、7%≤S<10%（较高）、S≥10%（高）。',
  },
  FM_TN_LONG_SLOPE: {
    min: 0,
    max: 15,
    step: 0.1,
    precision: 2,
    rangeLabel: '合理范围 0～15 %',
    hint: '正常范围 0～15 %。赋分档：S<1%（低）、1%≤S<4%（中）、S≥4%（高）。',
  },
  roadLongitudinalSlope: {
    min: 0,
    max: 20,
    step: 0.1,
    precision: 2,
    rangeLabel: '合理范围 0～20 %',
    hint: '表 5.3.11：道路纵坡 S（%）；用于雨水收集设施收水能力等条件判定（常见分界 S=7%）。',
  },
  historicalDeathCount: {
    min: 0,
    max: 9999,
    step: 1,
    precision: 0,
    rangeLabel: '合理范围 0～9999 人',
    hint: '历史内涝灾情损失分级参考：人员死亡（伤亡）人数。',
  },
  historicalSeriousInjuryCount: {
    min: 0,
    max: 9999,
    step: 1,
    precision: 0,
    rangeLabel: '合理范围 0～9999 人',
    hint: '历史内涝灾情损失分级参考：人员重伤人数。',
  },
  historicalTrappedCount: {
    min: 0,
    max: 99999,
    step: 1,
    precision: 0,
    rangeLabel: '合理范围 0～99999 人',
    hint: '历史内涝灾情损失分级参考：人员被困人数。',
  },
  historicalDirectEconomicLossWan: {
    min: 0,
    max: 999999,
    step: 0.01,
    precision: 2,
    rangeLabel: '合理范围 0～999999 万元',
    hint: '历史内涝灾情损失分级参考：直接经济损失（万元）。',
  },
  FM_UG_ENTRANCE_H_PED: {
    min: 0,
    max: 3,
    step: 0.01,
    precision: 2,
    rangeLabel: '合理范围 0～3 m',
    hint: '人行出入口：H>0.45m（低）、0.3≤H≤0.45m（中）、H<0.3m（高）。定级取人行/车行不利档。',
  },
  FM_UG_ENTRANCE_H_VEH: {
    min: 0,
    max: 3,
    step: 0.01,
    precision: 2,
    rangeLabel: '合理范围 0～3 m',
    hint: '车行出入口：H>0.3m（低）、0.15≤H≤0.3m（中）、H<0.15m（高）。定级取人行/车行不利档。',
  },
  FM_LL_RUNOFF_COEF: {
    min: 0,
    max: 1,
    step: 0.01,
    precision: 2,
    rangeLabel: '合理范围 0～1',
    hint: '正常范围 0～1（无量纲）。赋分档：Ψ≤0.45（低）、0.45<Ψ≤0.6（中）、Ψ>0.6（高）。',
  },
  FM_SK_DESIGN_P: {
    min: 1,
    max: 100,
    step: 1,
    precision: 0,
    rangeLabel: '合理范围 1～100 年',
    hint: '填重现期年数 P（年）。按附录 B 地区重要程度自动判定（中心城区 P≥30，其他区县 P≥10）。',
  },
  FM_LL_DESIGN_P: {
    min: 1,
    max: 100,
    step: 1,
    precision: 0,
    rangeLabel: '合理范围 1～100 年',
    hint: '填重现期年数 P（年）。按附录 B 地区重要程度（中心城区 P≥10，其他乡镇 P≥5）。',
  },
  PR_PUMP_CAPACITY: {
    min: 0,
    max: 150,
    step: 0.1,
    precision: 1,
    rangeLabel: '合理范围 0～150 m³/h/km²',
    hint: '正常范围 0～150 m³/h/km²。赋分档：B≥60（低）、20≤B<60（中）、B<20（高）。数据来源可来自泵站台账，支持手工修正。',
  },
  PR_RESPONSE_6H: {
    min: 0,
    max: 100,
    step: 0.1,
    precision: 1,
    rangeLabel: '合理范围 0～100 %',
    hint: '正常范围 0～100 %。赋分档：R≥90%（低）、R<90%（高）。',
  },
  PR_DISPOSE_2H: {
    min: 0,
    max: 100,
    step: 0.1,
    precision: 1,
    rangeLabel: '合理范围 0～100 %',
    hint: '正常范围 0～100 %。赋分档：D≥90%（低）、D<90%（高）。',
  },
};

/** 附录 B 固定字段键 → indicatorValues 存储键（与指标 code 对齐） */
export const APPENDIX_B_VALUE_FIELD_KEY_BY_SURVEY_KEY: Record<string, string> = {
  pedestrianEntranceElevationDiffM: 'FM_UG_ENTRANCE_H_PED',
  vehicleEntranceElevationDiffM: 'FM_UG_ENTRANCE_H_VEH',
};

/** 复合子项：由附录 B 普查项推导 indicatorValues 键 */
export function resolveAppendixBValueFieldKey(
  appendixBFieldKey: string,
  indicatorCode: string,
  partIndex: number,
): string {
  const key = appendixBFieldKey.trim();
  const mapped = APPENDIX_B_VALUE_FIELD_KEY_BY_SURVEY_KEY[key];
  if (mapped) return mapped;
  const code = indicatorCode.trim() || 'IND';
  const partNum = /^appendixPart(\d+)$/i.exec(key);
  if (partNum) return `${code}_PART${partNum[1]}`;
  return `${code}_P${partIndex + 1}`;
}

type NumericRangeSource = Pick<IndicatorAuxiliaryConditionField, 'fieldKey' | 'numericRange'> | {
  numericRange?: AuxiliaryNumericRange;
};

export function getNumericConstraint(
  key: string,
  aux?: NumericRangeSource,
): NumericIndicatorConstraint | undefined {
  if (aux?.numericRange && (!('fieldKey' in aux) || !aux.fieldKey || aux.fieldKey === key)) {
    return aux.numericRange;
  }
  const resolved = APPENDIX_B_VALUE_FIELD_KEY_BY_SURVEY_KEY[key] ?? key;
  return NUMERIC_INDICATOR_CONSTRAINTS[resolved];
}

export function numericConstraintToAuxiliaryRange(
  c: NumericIndicatorConstraint,
): AuxiliaryNumericRange {
  return {
    min: c.min,
    max: c.max,
    step: c.step,
    precision: c.precision,
    rangeLabel: c.rangeLabel,
    hint: c.hint,
  };
}

/** 复合子项：仅说明取值量级，不预置低/中/高风险档（档位由本子项分档表定义） */
export function numericConstraintToCompositePartRange(
  c: NumericIndicatorConstraint,
): AuxiliaryNumericRange {
  const base = numericConstraintToAuxiliaryRange(c);
  return {
    ...base,
    hint: `${base.rangeLabel}。阈值与标准分 F 须在下文「本子项分档」中配置（至少 2 档）；「档位名称」可选，仅用于定级展示。`,
  };
}

export function findIndicatorBySurveyFieldKey(
  fieldKey: string,
  indicators: RiskIndicatorRow[],
): RiskIndicatorRow | undefined {
  const k = fieldKey.trim();
  if (!k) return undefined;
  return indicators.find(i => i.survey?.fieldKey === k || i.code === k);
}

/** 复合子项：按来源解析合理数值范围（供分档阈值配置参考） */
export function resolveCompositePartNumericRange(
  source: ScoreConditionSource,
  indicators: RiskIndicatorRow[],
  opts?: { indicatorCode?: string; partIndex?: number },
): AuxiliaryNumericRange | undefined {
  const key = source.key?.trim() ?? '';
  if (!key) return undefined;

  if (source.type === 'indicator') {
    const ind = findIndicatorBySurveyFieldKey(key, indicators);
    const code = ind?.code ?? key;
    const aux = ind?.survey?.auxiliaryCondition;
    const c = getNumericConstraint(code, aux);
    return c ? numericConstraintToCompositePartRange(c) : undefined;
  }

  const mapped = resolveAppendixBValueFieldKey(
    key,
    opts?.indicatorCode ?? 'IND',
    opts?.partIndex ?? 0,
  );
  const c = getNumericConstraint(key) ?? getNumericConstraint(mapped);
  return c ? numericConstraintToCompositePartRange(c) : undefined;
}

export function parseNumericSurveyValue(raw: string | number | boolean | null | undefined): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw === 'boolean') return null;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
  return Number.isNaN(n) ? null : n;
}

/** 超出合理范围时返回错误文案，否则 null */
export function getNumericRangeError(
  key: string,
  raw: string | number | boolean | null | undefined,
  aux?: Pick<IndicatorAuxiliaryConditionField, 'fieldKey' | 'numericRange'>,
): string | null {
  const c = getNumericConstraint(key, aux);
  if (!c) return null;
  const n = parseNumericSurveyValue(raw);
  if (n === null) return null;
  if (n < c.min || n > c.max) {
    return `超出合理范围（${c.rangeLabel}），请修正后再保存`;
  }
  return null;
}

export function createNumericSurveyFormRulesByFieldKey(
  fieldKey: string,
  aux?: Pick<IndicatorAuxiliaryConditionField, 'fieldKey' | 'numericRange'>,
): Rule[] {
  if (!getNumericConstraint(fieldKey, aux)) return [];
  return [
    {
      validateTrigger: ['onChange', 'onBlur'],
      validator: async (_, value) => {
        if (value === undefined || value === null || value === '') return;
        const err = getNumericRangeError(fieldKey, value, aux);
        if (err) throw new Error(err);
      },
    },
  ];
}

export function createNumericSurveyFormRules(ind: RiskIndicatorRow): Rule[] {
  if (ind.valueType !== 'numeric' || !getNumericConstraint(ind.code)) return [];
  if (ind.code.endsWith('_DESIGN_P')) return [];
  return createNumericSurveyFormRulesByFieldKey(ind.code);
}

/** 批量校验已填数值指标（保存前兜底） */
export function collectNumericRangeErrors(
  indicators: RiskIndicatorRow[],
  values: Record<string, string | number | boolean | null> | undefined,
): string[] {
  const errors: string[] = [];
  if (!values) return errors;
  for (const ind of indicators) {
    if (ind.valueType !== 'numeric') continue;
    const raw = getIndicatorSurveyValue(values, ind.survey.fieldKey);
    if (raw === undefined || raw === null || raw === '') continue;
    const err = getNumericRangeError(ind.code, raw);
    if (err) errors.push(`${ind.name}：${err}`);
  }
  return errors;
}
