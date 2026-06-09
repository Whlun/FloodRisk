import React from 'react';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { Tooltip, Typography } from 'antd';
import { SurveyScoringDisabledTag } from './SurveyFieldLabel';
import type { RiskIndicatorRow } from './types';
import { getAuxiliaryCondition } from './compositeConditionalSurvey';
import { getNumericConstraint } from './numericIndicatorConstraints';

const { Text } = Typography;

interface Props {
  owner: RiskIndicatorRow;
}

/** 指标普查中单独占一行的辅助条件字段标签 */
export const AuxiliarySurveyFieldLabel: React.FC<Props> = ({ owner }) => {
  const aux = getAuxiliaryCondition(owner);
  if (!aux) return null;

  const constraint = getNumericConstraint(aux.fieldKey, aux);
  const lines = [
    aux.hint,
    constraint?.hint,
    constraint?.rangeLabel,
    owner.remark,
    `用于「${owner.name}」条件赋分分档判定。`,
    '不参与架构图权重汇总。',
  ].filter(Boolean) as string[];

  return (
    <span>
      {aux.label}
      {aux.unit ? (
        <Text type="secondary" style={{ fontWeight: 400 }}>
          {' '}
          ({aux.unit})
        </Text>
      ) : null}
      <Tooltip
        title={
          <div style={{ maxWidth: 360 }}>
            {lines.map((line, i) => (
              <div key={i} style={{ marginBottom: i < lines.length - 1 ? 4 : 0 }}>
                {line}
              </div>
            ))}
          </div>
        }
        placement="topLeft"
      >
        <QuestionCircleOutlined
          style={{
            marginLeft: 6,
            color: 'rgba(0,0,0,0.45)',
            fontSize: 13,
            cursor: 'help',
          }}
        />
      </Tooltip>
      <SurveyScoringDisabledTag ind={owner} />
    </span>
  );
};
