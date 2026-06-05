import React from 'react';
import { Form, Tag, Tooltip, Typography } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import type { AreaImportance, RiskIndicatorRow } from './types';
import { getNumericConstraint } from './numericIndicatorConstraints';
import {
  formatDesignPeriodThresholdHintForIndicator,
  getDesignPeriodAreaMissingMessage,
  isDesignReturnPeriodCode,
} from './designReturnPeriod';
import {
  formatBranchIndicatorValueMatch,
  formatConditionalScoringSummary,
  getConditionMissingMessage,
  getExtraWatchPathsForConditional,
  isConditionalScoringEnabled,
  resolveActiveBranch,
  resolveBranchIndicatorValueMatch,
} from './conditionalScoring';
import { PREVENTION_VALUE_FIELD_EXTRA } from './preventionFieldHints';
import {
  getScoreExplanationTooltipLines,
  parseScoreExplanationLines,
  resolveScoreExplanation,
} from './scoreExplanation';
import { MatchedScoreTag } from './MatchedScoreTag';
import {
  formatAuxiliaryValueSurveyHint,
  getAuxiliaryNumericFromValues,
  hasAuxiliaryConditionSurvey,
} from './compositeConditionalSurvey';

const { Text } = Typography;

/** 架构图未启用时提示：可填报，定级暂不参与计分 */
export function SurveyScoringDisabledTag({ ind }: { ind: RiskIndicatorRow }) {
  if (ind.enabled) return null;
  return (
    <Tag color="default" style={{ marginLeft: 8, fontWeight: 400, verticalAlign: 'middle' }}>
      未启用·暂不计分
    </Tag>
  );
}

const tooltipBodyStyle: React.CSSProperties = {
  maxWidth: 360,
  fontSize: 12,
  lineHeight: 1.55,
};

function TooltipLines({ lines }: { lines: string[] }) {
  return (
    <div style={tooltipBodyStyle}>
      {lines.map((line, i) => (
        <div key={i} style={{ marginBottom: i < lines.length - 1 ? 6 : 0 }}>
          {line}
        </div>
      ))}
    </div>
  );
}

export interface SurveyFieldTooltipContext {
  areaImportance?: AreaImportance;
  slopePct?: number;
  indicatorValues?: Record<string, string | number | boolean | null>;
}

/** 标签旁 ?：优先展示「赋分规则 → 赋分说明」；填报场景可追加动态行（地区重要程度、当前纵坡等） */
export function buildSurveyFieldTooltipContent(
  ind: RiskIndicatorRow,
  ctx?: SurveyFieldTooltipContext,
): React.ReactNode | undefined {
  const areaImportance = ctx?.areaImportance;
  const slopePct = ctx?.slopePct;
  const explained = parseScoreExplanationLines(resolveScoreExplanation(ind));
  if (explained.length > 0) {
    const lines = [...explained];
    if (isDesignReturnPeriodCode(ind.code)) {
      if (areaImportance) {
        const dynamic = formatDesignPeriodThresholdHintForIndicator(ind, areaImportance);
        if (!lines.some(l => l.includes('年为低风险'))) {
          lines.splice(Math.max(0, lines.length - 1), 0, dynamic);
        }
      } else if (!isConditionalScoringEnabled(ind)) {
        const missing = getDesignPeriodAreaMissingMessage(ind);
        if (!lines.includes(missing)) {
          lines.splice(Math.max(0, lines.length - 1), 0, missing);
        }
      }
    }
    if (isConditionalScoringEnabled(ind)) {
      const cfg = ind.conditionalScoring!;
      const branch = resolveActiveBranch(cfg, {
        areaImportance,
        indicatorValues: ctx?.indicatorValues,
      });
      if (branch && cfg.mode === 'branch_threshold') {
        const valueMatch = resolveBranchIndicatorValueMatch(branch);
        if (valueMatch) {
          lines.push(`当前分支：${branch.label}，${formatBranchIndicatorValueMatch(valueMatch)}`);
        }
      }
    }
    if (hasAuxiliaryConditionSurvey(ind) && slopePct !== undefined && !Number.isNaN(slopePct)) {
      const dynamic = formatAuxiliaryValueSurveyHint(ind, slopePct);
      if (dynamic && !lines.includes(dynamic)) {
        lines.push(dynamic);
      }
    }
    return <TooltipLines lines={lines} />;
  }

  if (isConditionalScoringEnabled(ind)) {
    const lines = [
      ...formatConditionalScoringSummary(ind),
      '须先满足条件来源后再填报本指标。',
    ];
    return <TooltipLines lines={lines} />;
  }

  if (isDesignReturnPeriodCode(ind.code)) {
    const lines = ['须先在「基本信息」中填写「地区重要程度」。'];
    if (areaImportance) {
      lines.unshift(formatDesignPeriodThresholdHintForIndicator(ind, areaImportance));
    } else {
      lines.push(getDesignPeriodAreaMissingMessage(ind));
    }
    const c = getNumericConstraint(ind.code);
    if (c) lines.push(c.hint, c.rangeLabel);
    lines.push('填写 P 后系统自动匹配低/高档与评估指标分数。');
    return <TooltipLines lines={lines} />;
  }

  const numeric = getNumericConstraint(ind.code);
  if (numeric) {
    return (
      <TooltipLines
        lines={[numeric.hint, numeric.rangeLabel, '填写后系统自动匹配赋分档与评估指标分数。']}
      />
    );
  }

  const prevention = PREVENTION_VALUE_FIELD_EXTRA[ind.code];
  if (prevention) {
    return <TooltipLines lines={[prevention, '填写后系统自动匹配赋分档与评估指标分数。']} />;
  }

  if (ind.valueType === 'enum' || ind.valueType === 'boolean') {
    return <TooltipLines lines={getScoreExplanationTooltipLines(ind)} />;
  }

  return undefined;
}

interface SurveyFieldLabelProps {
  ind: RiskIndicatorRow;
  /** 指标值表单路径，默认风险普查 */
  valueNamePath?: (string | number)[];
  areaNamePath?: (string | number)[];
  /** 是否在标签旁展示实时赋分 Tag（新增配置等场景可关闭） */
  showMatchedScoreTag?: boolean;
  /** 赋分 Tag 展示：试算页等用 scoreOnly 避免与下拉选项重复 */
  matchedTagDisplay?: 'full' | 'scoreOnly';
}

function renderSurveyFieldLabelBody(
  ind: RiskIndicatorRow,
  ctx: {
    raw?: string | number | boolean | null;
    area?: AreaImportance;
    indicatorValues?: Record<string, string | number | boolean | null>;
    showMatchedScoreTag: boolean;
    matchedTagDisplay: 'full' | 'scoreOnly';
  },
): React.ReactNode {
  const { raw, area, indicatorValues, showMatchedScoreTag, matchedTagDisplay } = ctx;
  const slope = getAuxiliaryNumericFromValues(indicatorValues, ind);
  const tooltip = buildSurveyFieldTooltipContent(ind, {
    areaImportance: area,
    slopePct: slope,
    indicatorValues,
  });

  const title = (
    <span className="dq-survey-field-label-text">
      {ind.name}
      {ind.unit && (
        <Text type="secondary" style={{ fontWeight: 400 }}>
          {' '}
          ({ind.unit})
        </Text>
      )}
      {tooltip ? (
        <Tooltip title={tooltip} placement="topLeft">
          <QuestionCircleOutlined
            style={{
              marginLeft: 6,
              color: 'rgba(0,0,0,0.45)',
              fontSize: 13,
              cursor: 'help',
            }}
          />
        </Tooltip>
      ) : null}
      <SurveyScoringDisabledTag ind={ind} />
    </span>
  );

  if (!showMatchedScoreTag) return title;

  return (
    <>
      {title}
      <MatchedScoreTag
        ind={ind}
        raw={raw}
        areaImportance={area}
        indicatorValues={indicatorValues}
        displayMode={matchedTagDisplay}
      />
    </>
  );
}

/** 试算等无赋分 Tag：用 useWatch 刷新 ? 说明，避免 label 内嵌 Form.Item 撑高 */
function PlainSurveyFieldLabel({
  ind,
  valuePath,
  areaPath,
  watchArea,
}: {
  ind: RiskIndicatorRow;
  valuePath: (string | number)[];
  areaPath: (string | number)[];
  watchArea: boolean;
}) {
  const form = Form.useFormInstance();
  const needsIndicatorValues =
    isConditionalScoringEnabled(ind) || hasAuxiliaryConditionSurvey(ind);
  const indicatorValuesPath =
    valuePath[0] === 'indicatorValues'
      ? (['indicatorValues'] as const)
      : (['surveyPayload', 'indicatorValues'] as const);

  Form.useWatch(valuePath, form);
  if (watchArea) Form.useWatch(areaPath, form);
  if (needsIndicatorValues) Form.useWatch(indicatorValuesPath, form);
  getExtraWatchPathsForConditional(ind).forEach(p => Form.useWatch(p, form));

  const raw = form.getFieldValue(valuePath) as string | number | boolean | null | undefined;
  const indicatorValues = form.getFieldValue(indicatorValuesPath) as
    | Record<string, string | number | boolean | null>
    | undefined;
  const area = watchArea ? (form.getFieldValue(areaPath) as AreaImportance | undefined) : undefined;

  return (
    <span className="dq-survey-field-label--plain">
      {renderSurveyFieldLabelBody(ind, {
        raw,
        area: watchArea ? area : undefined,
        indicatorValues,
        showMatchedScoreTag: false,
        matchedTagDisplay: 'full',
      })}
    </span>
  );
}

/** 带实时赋分 Tag 的标签（须在 Form 上下文中渲染） */
function MatchedSurveyFieldLabel({
  ind,
  valuePath,
  areaPath,
  watchArea,
  extraWatchPaths,
  matchedTagDisplay,
}: {
  ind: RiskIndicatorRow;
  valuePath: (string | number)[];
  areaPath: (string | number)[];
  watchArea: boolean;
  extraWatchPaths: (string | number)[][];
  matchedTagDisplay: 'full' | 'score';
}) {
  const form = Form.useFormInstance();
  Form.useWatch(valuePath, form);
  if (watchArea) Form.useWatch(areaPath, form);
  Form.useWatch(['surveyPayload', 'indicatorValues'], form);
  extraWatchPaths.forEach(p => Form.useWatch(p, form));

  const raw = form.getFieldValue(valuePath) as string | number | boolean | null | undefined;
  const indicatorValues = form.getFieldValue(['surveyPayload', 'indicatorValues']) as
    | Record<string, string | number | boolean | null>
    | undefined;
  const area = watchArea ? (form.getFieldValue(areaPath) as AreaImportance | undefined) : undefined;

  return (
    <span className="dq-survey-field-label">
      {renderSurveyFieldLabelBody(ind, {
        raw,
        area: watchArea ? area : undefined,
        indicatorValues,
        showMatchedScoreTag: true,
        matchedTagDisplay,
      })}
    </span>
  );
}

/** 普查/防灾减灾表单项标签：名称 + ? + 实时赋分标签 */
export const SurveyFieldLabel: React.FC<SurveyFieldLabelProps> = ({
  ind,
  valueNamePath,
  areaNamePath,
  showMatchedScoreTag = true,
  matchedTagDisplay = 'full',
}) => {
  const valuePath =
    valueNamePath ?? ['surveyPayload', 'indicatorValues', ind.survey.fieldKey];
  const areaPath = areaNamePath ?? ['surveyPayload', 'appendixB', 'areaImportance'];
  const watchArea =
    isDesignReturnPeriodCode(ind.code) ||
    (isConditionalScoringEnabled(ind) &&
      ind.conditionalScoring?.source.type === 'appendix_b' &&
      ind.conditionalScoring.source.key === 'areaImportance');

  if (!showMatchedScoreTag) {
    return (
      <PlainSurveyFieldLabel
        ind={ind}
        valuePath={valuePath}
        areaPath={areaPath}
        watchArea={watchArea}
      />
    );
  }

  const extraWatchPaths = getExtraWatchPathsForConditional(ind);

  return (
    <MatchedSurveyFieldLabel
      ind={ind}
      valuePath={valuePath}
      areaPath={areaPath}
      watchArea={watchArea}
      extraWatchPaths={extraWatchPaths}
      matchedTagDisplay={matchedTagDisplay}
    />
  );
};
