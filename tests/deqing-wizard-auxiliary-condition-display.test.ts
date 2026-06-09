import { describe, expect, it } from 'vitest';
import {
  applyIndicatorConfigTemplate,
} from '../src/prototypes/deqing-waterlogging-risk/indicatorConfigTemplates';
import { resolveConditionFieldLabel } from '../src/prototypes/deqing-waterlogging-risk/conditionalScoring';
import {
  isSelfAuxiliaryConditionFieldKey,
  resolveAuxiliaryDisplayLabel,
} from '../src/prototypes/deqing-waterlogging-risk/compositeConditionalSurvey';
import { syncAuxiliaryConditionalToForm } from '../src/prototypes/deqing-waterlogging-risk/auxiliaryIndicatorDefaults';
import type { FormInstance } from 'antd';
import type { Level1Factor, RiskIndicatorRow } from '../src/prototypes/deqing-waterlogging-risk/types';

function createMockForm(initial: Record<string, unknown> = {}): FormInstance {
  const store: Record<string, unknown> = { ...initial };
  return {
    getFieldValue: (name: string | string[]) => {
      if (Array.isArray(name)) {
        let cur: unknown = store;
        for (const k of name) {
          if (cur == null || typeof cur !== 'object') return undefined;
          cur = (cur as Record<string, unknown>)[k];
        }
        return cur;
      }
      return store[name];
    },
    setFieldValue: (name: string | string[], value: unknown) => {
      if (Array.isArray(name)) {
        let cur = store;
        for (let i = 0; i < name.length - 1; i++) {
          const k = name[i];
          const next = (cur[k] as Record<string, unknown> | undefined) ?? {};
          cur[k] = next;
          cur = next;
        }
        cur[name[name.length - 1]] = value;
        return;
      }
      store[name] = value;
    },
    setFieldsValue: (values: Record<string, unknown>) => {
      Object.assign(store, values);
    },
    getFieldsValue: () => ({ ...store }),
  } as unknown as FormInstance;
}

describe('新建向导 · 辅助条件字段展示', () => {
  it('条件赋分模板不自动写入 auxiliaryCondition', () => {
    const form = createMockForm({
      level1: 'FORMATION' as Level1Factor,
      code: 'FM_U002',
      applicableTypes: ['SUNKEN'],
      valueType: 'enum',
      survey: { collectInSurvey: true, surveyRequired: false, fieldKey: 'FM_U002' },
    });
    applyIndicatorConfigTemplate(form, 'auxiliary_conditional', {
      code: 'FM_U002',
      idPrefix: 'new',
      contentMode: 'structure',
      valueType: 'enum',
    });
    const survey = form.getFieldValue('survey') as RiskIndicatorRow['survey'];
    expect(survey?.inputVariant).toBe('default');
    expect(survey?.auxiliaryCondition).toBeUndefined();
    const condKey = (
      form.getFieldValue('conditionalScoring') as { source?: { key?: string; type?: string } } | undefined
    )?.source;
    expect(condKey?.type).toBe('appendix_b');
    expect(condKey?.key).toBe('areaImportance');
  });

  it('isSelfAuxiliaryConditionFieldKey 识别 {code}_COND', () => {
    expect(isSelfAuxiliaryConditionFieldKey('FM_U002_COND', 'FM_U002')).toBe(true);
    expect(isSelfAuxiliaryConditionFieldKey('FM_U002', 'FM_U002')).toBe(false);
  });

  it('survey 未挂载 auxiliaryCondition 时仍按编码解析展示名', () => {
    const draftOnly = {
      code: 'FM_U002',
      survey: { collectInSurvey: true, surveyRequired: false, fieldKey: 'FM_U002' },
    };
    expect(
      resolveConditionFieldLabel('FM_U002_COND', 'point', [], 'FM_U002', draftOnly),
    ).toBe('辅助条件');
  });

  it('显式 auxiliary_then_select：syncAuxiliaryConditionalToForm 写入 fieldKey 与中文 label 分离', () => {
    const form = createMockForm({
      level1: 'FORMATION' as Level1Factor,
      code: 'FM_U002',
      applicableTypes: ['SUNKEN'],
      valueType: 'enum',
      survey: { collectInSurvey: true, surveyRequired: false, fieldKey: 'FM_U002' },
    });
    syncAuxiliaryConditionalToForm(form, {
      code: 'FM_U002',
      id: 'new',
      level1: 'FORMATION',
      applicableTypes: ['SUNKEN'],
      valueType: 'enum',
    });
    const survey = form.getFieldValue('survey') as RiskIndicatorRow['survey'];
    expect(survey?.auxiliaryCondition?.fieldKey).toBe('FM_U002_COND');
    expect(survey?.auxiliaryCondition?.label).toBe('辅助条件');
    expect(
      resolveAuxiliaryDisplayLabel(survey!.auxiliaryCondition!, ['SUNKEN']),
    ).toBe('辅助条件');
    const condKey = (
      form.getFieldValue('conditionalScoring') as { source?: { key?: string } } | undefined
    )?.source?.key;
    expect(condKey).toBe('FM_U002_COND');
    expect(resolveConditionFieldLabel(condKey!, 'point', [], 'FM_U002', { code: 'FM_U002', survey })).toBe(
      '辅助条件',
    );
  });
});
