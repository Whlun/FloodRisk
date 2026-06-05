import React from 'react';
import { Typography } from 'antd';

const { Title, Paragraph } = Typography;

type PlaceholderPageProps = {
  title: string;
};

/** 未实现模块 · 空白占位页 */
export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title }) => (
  <div className="hz-spatial-shell__placeholder">
    <Title level={3} className="hz-spatial-shell__placeholder-title">
      {title}
    </Title>
    <Paragraph type="secondary" className="hz-spatial-shell__placeholder-desc">
      功能建设中，敬请期待
    </Paragraph>
  </div>
);
