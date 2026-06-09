import { describe, expect, it } from 'vitest';
import type { FormInstance } from 'antd';
import {
  applyIndicatorConfigTemplate,
  listTemplatesForValueType,
} from '../src/prototypes/deqing-waterlogging-risk/indicatorConfigTemplates';
import {
  DEFAULT_WIZARD_DRAFT,
  resolveWizardScoringFromValueType,
} from '../src/prototypes/deqing-waterlogging-risk/indicatorWizardDraft';

function createMockForm(initial: Record<string, unknown> = {}): FormInstance {
  const store: Record<string, unknown> = { ...initial };
  return {
    getFieldValue: (name: string | string[]) => {
      if (Array.isArray(name)) {
        const out: Record<string, unknown> = {};
        for (const k of name) out[k] = store[k];
        return out;
      }
      return store[name];
    },
    setFieldValue: (name: string, value: unknown) => {
      store[name] = value;
    },
    setFieldsValue: (values: Record<string, unknown>) => {
      Object.assign(store, values);
    },
    getFieldsValue: () => ({ ...store }),
  } as unknown as FormInstance;
}

describe('新建向导 · 普查填报方式与赋分场景', () => {
  it('填数值 → 默认数值分档，且不展示下拉选档场景', () => {
    const draft = resolveWizardScoringFromValueType('numeric');
    expect(draft).toEqual({ valueType: 'numeric', templateId: 'numeric_uniform' });

    const enumScenes = listTemplatesForValueType('enum').map(t => t.id);
    const numericScenes = listTemplatesForValueType('numeric').map(t => t.id);
    expect(enumScenes).not.toContain('numeric_uniform');
    expect(numericScenes).toContain('numeric_uniform');
    expect(numericScenes).not.toContain('enum_uniform');
  });

  it('离开基本信息步：apply 模板后表单 valueType 仍为 numeric', () => {
    const form = createMockForm({
      valueType: 'numeric',
      code: 'HZ_U004',
      name: '纵坡度S',
      level1: 'HAZARD',
      applicableTypes: ['GLOBAL'],
      survey: { collectInSurvey: true, surveyRequired: false, fieldKey: 'HZ_U004' },
    });

    const draft = resolveWizardScoringFromValueType('numeric');
    applyIndicatorConfigTemplate(form, draft.templateId, {
      code: 'HZ_U004',
      idPrefix: 'new',
      contentMode: 'structure',
      valueType: draft.valueType,
    });
    form.setFieldsValue({
      valueType: draft.valueType,
      configTemplateId: draft.templateId,
    });

    expect(form.getFieldValue('valueType')).toBe('numeric');
    expect(form.getFieldValue('configTemplateId')).toBe('numeric_uniform');
    expect((form.getFieldValue('survey') as { collectInSurvey?: boolean }).collectInSurvey).toBe(true);
  });

  it('DEFAULT_WIZARD_DRAFT 与 enum 一致', () => {
    expect(DEFAULT_WIZARD_DRAFT).toEqual(resolveWizardScoringFromValueType('enum'));
  });

  it('条件赋分场景：仅开启 conditional，不注入 auxiliary_then_select', () => {
    const form = createMockForm({
      valueType: 'enum',
      code: 'FM_U002',
      name: '测试条件赋分',
      level1: 'FORMATION',
      applicableTypes: ['LOW_LYING'],
      survey: { collectInSurvey: true, surveyRequired: false, fieldKey: 'FM_U002' },
    });

    applyIndicatorConfigTemplate(form, 'auxiliary_conditional', {
      code: 'FM_U002',
      idPrefix: 'new',
      contentMode: 'structure',
      valueType: 'enum',
    });

    const survey = form.getFieldValue('survey') as { inputVariant?: string; auxiliaryCondition?: unknown };
    expect(survey?.inputVariant).toBe('default');
    expect(survey?.auxiliaryCondition).toBeUndefined();
    expect(form.getFieldValue('scoringRuleMode')).toBe('conditional');
    expect(form.getFieldValue('configTemplateId')).toBe('auxiliary_conditional');
  });
});
