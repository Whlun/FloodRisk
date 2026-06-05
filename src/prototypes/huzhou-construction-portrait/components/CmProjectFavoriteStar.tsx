/**
 * 建设工程画像 · 项目收藏五角星（卡片 / 列表 / 详情弹窗共用）
 */
import React from 'react';
import { StarFilled, StarOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';

export type CmProjectFavoriteStarProps = {
  active: boolean;
  onToggle: () => void;
  className?: string;
  size?: 'small' | 'middle';
  /** icon：卡片/弹窗仅图标；link：列表操作列与「定位」「查看」同款 */
  variant?: 'icon' | 'link';
  /** link 模式下是否显示 Tooltip（列表有文案时可关闭） */
  showTooltip?: boolean;
};

export const CmProjectFavoriteStar: React.FC<CmProjectFavoriteStarProps> = ({
  active,
  onToggle,
  className = '',
  size = 'small',
  variant = 'icon',
  showTooltip = true,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggle();
  };

  const starIcon = active ? (
    <StarFilled style={{ color: '#faad14' }} />
  ) : (
    <StarOutlined />
  );

  if (variant === 'link') {
    const linkBtn = (
      <Button
        type="link"
        size={size}
        className={`action-btn detail hz-cm-project-favorite-star hz-cm-project-favorite-star--link${active ? ' hz-cm-project-favorite-star--active' : ''}${className ? ` ${className}` : ''}`}
        icon={starIcon}
        onClick={handleClick}
      >
        {active ? '已收藏' : '收藏'}
      </Button>
    );
    if (!showTooltip) return linkBtn;
    return <Tooltip title={active ? '取消收藏' : '收藏项目'}>{linkBtn}</Tooltip>;
  }

  return (
    <Tooltip title={active ? '取消收藏' : '收藏项目'}>
      <Button
        type="text"
        size={size}
        className={`hz-cm-project-favorite-star${active ? ' hz-cm-project-favorite-star--active' : ''}${className ? ` ${className}` : ''}`}
        aria-label={active ? '取消收藏' : '收藏项目'}
        icon={starIcon}
        onClick={handleClick}
      />
    </Tooltip>
  );
};
