/**
 * 前三未预警 · 等级构成说明（等级构成标题旁 ?）
 */
import React from 'react';
import { Popover } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { CM_INDUSTRIAL_ALERT_AS_OF } from '../cmIndustrialLandAlert';

const LEVEL_HELP_CONTENT = (
  <div className="hz-cm-alert-level-help">
    <p className="hz-cm-alert-level-help__intro">
      基准日 <strong>{CM_INDUSTRIAL_ALERT_AS_OF.format('YYYY-MM-DD')}</strong>
      。单项目多类型命中时取 <strong>I级 &gt; II级 &gt; III级</strong> 最严重一条。
    </p>
    <table className="hz-cm-alert-level-help__table">
      <thead>
        <tr>
          <th>类型</th>
          <th>III级</th>
          <th>II级</th>
          <th>I级</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">批而未供</th>
          <td>滞留 90–179 天</td>
          <td>180–364 天</td>
          <td>≥365 天</td>
        </tr>
        <tr>
          <th scope="row">供而未用</th>
          <td>30–89 天</td>
          <td>90–364 天</td>
          <td>≥365 天</td>
        </tr>
        <tr>
          <th scope="row">用而未尽</th>
          <td>比例合规且未开发 &lt;20 亩</td>
          <td>未开发 ≥20 亩且比例 &gt;33%</td>
          <td>未开发 ≥50 亩且比例 &lt;50%</td>
        </tr>
      </tbody>
    </table>
    <p className="hz-cm-alert-level-help__note">
      批而未供：农转用日期有、供地日期无；供而未用：供地日期有、开工许可日期无（超期自合同约定开工日）；用而未尽：已开工、未规划核实。
    </p>
  </div>
);

export const CmAlertLevelHelpTip: React.FC = () => (
  <Popover
    content={LEVEL_HELP_CONTENT}
    title="前三未等级说明"
    trigger="hover"
    placement="rightTop"
    overlayClassName="hz-cm-alert-level-help-popover"
  >
    <QuestionCircleOutlined
      className="hz-cm-alert-panel__chart-help"
      aria-label="前三未等级说明"
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    />
  </Popover>
);
