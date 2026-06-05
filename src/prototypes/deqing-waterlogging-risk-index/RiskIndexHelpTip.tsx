import React from 'react';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { Popover, Typography } from 'antd';

function RiskIndexHelpContent() {
  return (
    <div className="dq-risk-index-help-content">
      <Typography.Paragraph className="dq-risk-index-help-section dq-risk-index-help-section--last">
        针对<strong>一次内涝预警从发布到结束</strong>（一期）内的物联报警数据统计，并开展风险指数评估。
        <br />
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          按内涝点去重（同一点位多次采集只计 1 个），等级取期内最高；12h/24h 指<strong>本期预警发布后</strong>
          12/24 小时内，综合指数以整期为准。
        </Typography.Text>
      </Typography.Paragraph>
    </div>
  );
}

type Props = {
  /** 仅用于页面主标题旁 */
  compact?: boolean;
};

/** 内涝风险指数统计范围说明 */
export const RiskIndexHelpTip: React.FC<Props> = ({ compact = false }) => (
  <Popover
    title="统计范围"
    content={<RiskIndexHelpContent />}
    trigger="hover"
    placement={compact ? 'bottom' : 'bottomLeft'}
    overlayClassName="dq-risk-index-help-popover"
  >
    <QuestionCircleOutlined
      className={`dq-risk-index-help-icon${compact ? ' dq-risk-index-help-icon--compact' : ''}`}
      onClick={e => e.stopPropagation()}
    />
  </Popover>
);
