import React from 'react';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { CaretDownOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';

import { isClientDevAuthEnabled, navigateToAuthLogout } from './authLogout';

export const ShellUserMenu: React.FC<{ className?: string }> = ({
  className = 'ss-one-map-shell__user',
}) => {
  const authEnabled = isClientDevAuthEnabled();

  if (!authEnabled) {
    return (
      <span className={className} title="演示用户">
        <UserOutlined style={{ fontSize: 16 }} aria-hidden />
        管理员
      </span>
    );
  }

  const items: MenuProps['items'] = [
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
      danger: true,
    },
  ];

  return (
    <Dropdown
      menu={{
        items,
        onClick: ({ key, domEvent }) => {
          if (key === 'logout') {
            domEvent?.preventDefault?.();
            domEvent?.stopPropagation?.();
            navigateToAuthLogout();
          }
        },
      }}
      trigger={['click']}
      placement="bottomRight"
    >
      <span
        className={className}
        role="button"
        tabIndex={0}
        aria-haspopup="menu"
        title="点击可退出登录"
      >
        <UserOutlined style={{ fontSize: 16 }} aria-hidden />
        管理员
        <CaretDownOutlined style={{ fontSize: 10, marginLeft: 4 }} aria-hidden />
      </span>
    </Dropdown>
  );
};
