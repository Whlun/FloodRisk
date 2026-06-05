import React from 'react';
import { Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import {
  HAZARD_POINT_TYPE_DESCRIPTION,
  HAZARD_POINT_TYPE_LABEL,
  type SurveyPointType,
} from './types';

const tooltipBodyStyle: React.CSSProperties = {
  maxWidth: 360,
  fontSize: 12,
  lineHeight: 1.55,
};

type Props = {
  pointType: SurveyPointType;
};

/** 孕灾因子类型徽章旁 ?：展示导则 2.0.5–2.0.8 等类型释义 */
export const HazardPointTypeHelpTip: React.FC<Props> = ({ pointType }) => {
  const lines = HAZARD_POINT_TYPE_DESCRIPTION[pointType];
  if (!lines.length) {
    return null;
  }

  const title = (
    <div style={tooltipBodyStyle}>
      {lines.map((line, i) => (
        <div key={i} style={{ marginBottom: i < lines.length - 1 ? 6 : 0 }}>
          {line}
        </div>
      ))}
    </div>
  );

  return (
    <Tooltip title={title} placement="topLeft">
      <QuestionCircleOutlined
        className="dq-indicator-remark-help"
        aria-label={`${HAZARD_POINT_TYPE_LABEL[pointType]}说明`}
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      />
    </Tooltip>
  );
};
