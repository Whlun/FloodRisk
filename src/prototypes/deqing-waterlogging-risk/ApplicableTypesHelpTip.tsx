import React from 'react';
import { Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { getApplicableTypesHint } from './indicatorApplicableTypes';
import type { Level1Factor } from './types';

type Props = {
  level1: Level1Factor;
};

/** 适用隐患点类型标签旁 ?：展示孕灾/通用范围说明 */
export const ApplicableTypesHelpTip: React.FC<Props> = ({ level1 }) => {
  const hint = getApplicableTypesHint(level1);
  if (!hint) return null;

  return (
    <Tooltip title={hint} placement="topLeft">
      <QuestionCircleOutlined
        className="dq-indicator-remark-help"
        style={{ marginLeft: 6, color: 'rgba(0,0,0,0.45)', fontSize: 13, cursor: 'help' }}
        aria-label="适用隐患点类型说明"
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      />
    </Tooltip>
  );
};
