import React from 'react';
import { Col, Row } from 'antd';
import type { RiskIndicatorRow } from './types';
import { hasAuxiliaryConditionSurvey } from './compositeConditionalSurvey';
import { surveyFieldGridRow } from './surveyFormLayout';

/** 双列栅格中独占整行的指标（标题较长或禁用态占位较长） */
export const SURVEY_FIELD_FULL_ROW_CODES = new Set<string>([
  'PR_PUMP_CAPACITY',
  'HZ_BACKWATER',
  'BR_HIST_LOSS',
  'FM_SK_DESIGN_P',
  'FM_LL_DESIGN_P',
]);

/** 同一行并排展示的指标组 */
export const SURVEY_FIELD_PAIR_GROUPS: string[][] = [['PR_RESPONSE_6H', 'PR_DISPOSE_2H']];

export function getSurveyFieldColSpan(ind: RiskIndicatorRow): { xs: number; sm: number } {
  if (SURVEY_FIELD_FULL_ROW_CODES.has(ind.code) || hasAuxiliaryConditionSurvey(ind)) {
    return { xs: 24, sm: 24 };
  }
  return { xs: 24, sm: 12 };
}

type RenderFieldItem = (ind: RiskIndicatorRow) => React.ReactNode;

/**
 * 按业务规则排列表单项：指定指标整行；指定成对指标同一行两列。
 */
export function renderSurveyFieldGrid(
  list: RiskIndicatorRow[],
  renderItem: RenderFieldItem,
): React.ReactNode {
  const rendered = new Set<string>();
  const nodes: React.ReactNode[] = [];

  const findByCode = (code: string) => list.find(i => i.code === code);

  for (const ind of list) {
    if (rendered.has(ind.code)) continue;

    const pairGroup = SURVEY_FIELD_PAIR_GROUPS.find(g => g.includes(ind.code));
    if (pairGroup) {
      const pair = pairGroup.map(findByCode).filter((x): x is RiskIndicatorRow => Boolean(x));
      if (pair.length === pairGroup.length) {
        nodes.push(
          <Col xs={24} key={`pair-${pairGroup.join('-')}`} className="dq-survey-field-pair-row">
            <Row {...surveyFieldGridRow}>
              {pair.map(p => (
                <Col xs={24} sm={12} key={p.id}>
                  {renderItem(p)}
                </Col>
              ))}
            </Row>
          </Col>,
        );
        pair.forEach(p => rendered.add(p.code));
        continue;
      }
    }

    const span = getSurveyFieldColSpan(ind);
    nodes.push(
      <Col
        xs={span.xs}
        sm={span.sm}
        key={ind.id}
        className={span.sm === 24 ? 'dq-survey-field-col-full' : undefined}
      >
        {renderItem(ind)}
      </Col>,
    );
    rendered.add(ind.code);
  }

  return <Row {...surveyFieldGridRow}>{nodes}</Row>;
}
