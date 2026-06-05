import React from 'react';
import { Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { LEVEL1_FACTOR_DESCRIPTION, LEVEL1_FACTOR_LABEL, type Level1Factor } from './types';

type Props = {
  level1: Level1Factor;
};

/** 一级因子名称旁 ?：展示导则 2.0.9–2.0.12 释义 */
export const Level1FactorHelpTip: React.FC<Props> = ({ level1 }) => (
  <Tooltip title={LEVEL1_FACTOR_DESCRIPTION[level1]} placement="topLeft">
    <QuestionCircleOutlined
      className="dq-indicator-remark-help"
      aria-label={`${LEVEL1_FACTOR_LABEL[level1]}说明`}
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    />
  </Tooltip>
);
