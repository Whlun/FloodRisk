import React from 'react';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { Popover, Typography } from 'antd';

/** 指数变化趋势图说明 */
export const RiskIndexTrendHelpTip: React.FC = () => (
  <Popover
    title="指数变化趋势"
    content={
      <Typography.Paragraph className="dq-risk-index-help-section dq-risk-index-help-section--last" style={{ marginBottom: 0 }}>
        横轴延伸至 <strong>24h</strong>，标注 12h/24h 持续加重；<strong>「当前 X.Xh」</strong>与左侧仪表盘时刻对齐。
        <br />
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          纵轴为<strong>综合指数</strong>（含 12h/24h 持续加重）。<strong>蓝实线</strong>为本期已发生过程；<strong>蓝虚线</strong>为<strong>推算段</strong>，根据<strong>未来降雨数据</strong>对各内涝点水位进行预测，再按预警阈值换算等级并汇总，计算未来各时刻的综合指数；<strong>灰实线</strong>为上期（平滑曲线）。
        </Typography.Text>
      </Typography.Paragraph>
    }
    trigger="hover"
    placement="bottom"
    overlayClassName="dq-risk-index-help-popover"
  >
    <QuestionCircleOutlined
      className="dq-risk-index-help-icon dq-risk-index-help-icon--compact"
      onClick={e => e.stopPropagation()}
    />
  </Popover>
);
