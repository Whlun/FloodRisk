import React from 'react';
import { Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';

const DEFAULT_EMPTY_HINT =
  '暂无说明，可在「风险指标管理」→ 基本信息 Tab 中维护「说明」字段。';

type Props = {
  remark?: string;
};

/** 指标名称旁 ?：展示风险指标管理「说明」字段 */
export const IndicatorRemarkHelpTip: React.FC<Props> = ({ remark }) => {
  const text = remark?.trim() || DEFAULT_EMPTY_HINT;

  return (
    <Tooltip title={text} placement="topLeft">
      <QuestionCircleOutlined
        className="dq-indicator-remark-help"
        aria-label="指标说明"
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      />
    </Tooltip>
  );
};
