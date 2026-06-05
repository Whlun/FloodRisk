import React from 'react';
import { ConfigProvider, type ConfigProviderProps } from 'antd';

export type AppConfigProviderProps = ConfigProviderProps;

/** 项目默认 Ant Design 配置：Modal 默认垂直居中等。 */
export const AppConfigProvider: React.FC<AppConfigProviderProps> = ({ modal, ...rest }) => (
  <ConfigProvider modal={{ centered: true, ...modal }} {...rest} />
);

export default AppConfigProvider;
