import React, { useEffect, useMemo, useState } from 'react';
import { Button, Form, Segmented, Typography, message } from 'antd';
import { EditOutlined, NodeIndexOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';
import type { IndicatorAppendixBSurveyPart, RiskIndicatorRow } from './types';
import { CompositeAppendixSurveyConfigFields } from './CompositeAppendixSurveyConfigFields';
import { CompositeScoringFlowView } from './CompositeScoringFlowView';
import { syncCompositeAggregateScoreRules } from './compositeAggregateScoreRules';
import { syncCompositeFormAggregateScoreRules } from './compositeFormAggregateSync';
import {
  buildCompositeScoringFlowModel,
  resolveCompositeIndicatorForFlow,
} from './compositeScoringFlow';
import { hydrateCompositeIndicatorFromSeed } from './compositeSurveyHydration';
import { canEditCompositeSurveyParts } from './scoringRuleMode';

const { Text } = Typography;

interface Props {
  form: FormInstance;
  defaultIndicators: RiskIndicatorRow[];
  allIndicators: RiskIndicatorRow[];
  code?: string;
  detailOnly?: boolean;
  /** 打开弹窗时的指标快照，流程预览在表单未完整挂载时回退 */
  editingSnapshot?: Pick<RiskIndicatorRow, 'code' | 'survey' | 'scoreRules'> | null;
}

/** 赋分规则 Tab：复合数值配置（表单 / 流程预览切换） */
export const CompositeAppendixRulesPanel: React.FC<Props> = ({
  form,
  defaultIndicators,
  allIndicators,
  code,
  detailOnly,
  editingSnapshot,
}) => {
  const editable = canEditCompositeSurveyParts(detailOnly);
  const [editorView, setEditorView] = useState<'form' | 'flow'>(detailOnly ? 'flow' : 'form');

  useEffect(() => {
    if (detailOnly) setEditorView('flow');
  }, [detailOnly]);

  const seed = code ? defaultIndicators.find(i => i.code === code) : undefined;
  const canRestoreFromSeed = Boolean(seed?.survey?.inputVariant === 'composite_appendix_numeric');
  const partsWatch = Form.useWatch(['survey', 'appendixBSurveyParts'], form) as
    | IndicatorAppendixBSurveyPart[]
    | undefined;
  const codeWatch = Form.useWatch('code', form) as string | undefined;
  const surveyWatch = Form.useWatch('survey', form);
  const scoreRulesWatch = Form.useWatch('scoreRules', form);

  const flowModel = useMemo(() => {
    const row = resolveCompositeIndicatorForFlow(
      {
        code: codeWatch ?? code,
        survey: surveyWatch,
        scoreRules: scoreRulesWatch,
      },
      editingSnapshot,
    );
    return buildCompositeScoringFlowModel(row, allIndicators);
  }, [
    codeWatch,
    code,
    surveyWatch,
    scoreRulesWatch,
    editingSnapshot,
    allIndicators,
    partsWatch,
  ]);

  useEffect(() => {
    if (detailOnly) return;
    const timer = window.setTimeout(() => syncCompositeFormAggregateScoreRules(form), 280);
    return () => window.clearTimeout(timer);
  }, [partsWatch, detailOnly, form]);

  const handleRestoreFromSeed = () => {
    if (!seed || !code) return;
    const row = {
      code,
      scoringRuleMode: 'composite' as const,
      survey: form.getFieldValue('survey'),
      scoreRules: form.getFieldValue('scoreRules'),
      conditionalScoring: form.getFieldValue('conditionalScoring'),
      valueType: form.getFieldValue('valueType'),
    } as RiskIndicatorRow;
    const patch = hydrateCompositeIndicatorFromSeed(row, seed);
    const synced = syncCompositeAggregateScoreRules({
      ...row,
      ...patch,
      scoringRuleMode: 'composite',
    } as RiskIndicatorRow);
    form.setFieldsValue({
      ...synced,
      scoringRuleMode: 'composite',
    });
    message.success('已恢复默认复合子项与分档配置');
  };

  return (
    <>
      <div className="dq-conditional-scoring-editor__toolbar">
        <Segmented
          value={editorView}
          onChange={v => setEditorView(v as 'form' | 'flow')}
          options={[
            { value: 'form', label: '表单配置', icon: <EditOutlined /> },
            { value: 'flow', label: '流程预览', icon: <NodeIndexOutlined /> },
          ]}
        />
        <Text type="secondary" style={{ fontSize: 12 }}>
          {editorView === 'flow'
            ? '只读总览；修改子项与分档请切换到「表单配置」'
            : '逐步填写各字段'}
        </Text>
      </div>

      {editorView === 'flow' ? <CompositeScoringFlowView model={flowModel} /> : null}

      <div
        className={
          editorView === 'flow' ? 'dq-conditional-scoring-editor__form-panel--hidden' : undefined
        }
        aria-hidden={editorView === 'flow'}
      >
        {canRestoreFromSeed && editable ? (
          <Button size="small" style={{ marginBottom: 8 }} onClick={handleRestoreFromSeed}>
            恢复默认复合配置
          </Button>
        ) : null}
        <CompositeAppendixSurveyConfigFields
          form={form}
          disabled={!editable}
          allIndicators={allIndicators}
          defaultIndicators={defaultIndicators}
          selfCode={code}
        />
      </div>
    </>
  );
};
