/**
 * 建设工程画像 · 选中项目后右侧 drawer（交互对齐 ZhtLeftStatDrawer）
 */
import React, { useMemo, useState } from 'react';
import { Button, Input, Select, Tag, Typography } from 'antd';
import { CloseOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { getProjectById } from '../mock/projects';
import { getProjectDrawerCards } from '../mock/projectDrawerCards';

const { Text } = Typography;

export type CmProjectDrawerVariant = 'rail' | 'overlay';

export type CmProjectDrawerProps = {
  variant: CmProjectDrawerVariant;
  projectId: string;
  onClose: () => void;
  onMapExpand?: () => void;
  onMapCollapse?: () => void;
  onOpenPortrait?: (projectId: string) => void;
};

export const CmProjectDrawer: React.FC<CmProjectDrawerProps> = ({
  variant,
  projectId,
  onClose,
  onMapExpand,
  onMapCollapse,
  onOpenPortrait,
}) => {
  const [region, setRegion] = useState<string | undefined>();
  const [matter, setMatter] = useState<string | undefined>();
  const [nameKw, setNameKw] = useState('');

  const project = getProjectById(projectId);
  const allCards = useMemo(() => getProjectDrawerCards(projectId), [projectId]);

  const regionOptions = useMemo(() => {
    const set = new Set(allCards.flatMap(c => c.tags.slice(0, 1)));
    return [...set].map(v => ({ value: v, label: v }));
  }, [allCards]);

  const matterOptions = useMemo(() => {
    const set = new Set(allCards.map(c => c.matterName));
    return [...set].map(v => ({ value: v, label: v }));
  }, [allCards]);

  const filtered = useMemo(() => {
    const nk = nameKw.trim().toLowerCase();
    return allCards.filter(c => {
      if (region && c.tags[0] !== region) return false;
      if (matter && c.matterName !== matter) return false;
      if (nk && !c.title.toLowerCase().includes(nk)) return false;
      return true;
    });
  }, [allCards, region, matter, nameKw]);

  const heading = project?.name ?? '项目事项明细';

  const inner = (
    <>
      <header className="zht-stat-drawer__hd">
        <div className="zht-stat-drawer__hd-top">
          {variant === 'rail' && onMapExpand && (
            <Button
              type="text"
              className="zht-stat-drawer__expand"
              icon={<MenuFoldOutlined />}
              onClick={onMapExpand}
              aria-label="铺满地图区域"
            />
          )}
          {variant === 'overlay' && onMapCollapse && (
            <Button
              type="text"
              className="zht-stat-drawer__expand"
              icon={<MenuUnfoldOutlined />}
              onClick={onMapCollapse}
              aria-label="收回侧栏"
            />
          )}
          <h2 className="zht-stat-drawer__title">
            <span className="zht-stat-drawer__pipe">|</span>
            {heading.length > 18 ? `${heading.slice(0, 18)}…` : heading}
          </h2>
          <Button type="text" className="zht-stat-drawer__close" icon={<CloseOutlined />} onClick={onClose} />
        </div>
      </header>

      <div className="zht-stat-drawer__filters">
        <div className="zht-stat-drawer__filters-grid">
          <Select allowClear placeholder="区域" options={regionOptions} value={region} onChange={setRegion} />
          <Select allowClear placeholder="事项" options={matterOptions} value={matter} onChange={setMatter} />
          <Input allowClear placeholder="名称关键词" value={nameKw} onChange={e => setNameKw(e.target.value)} />
        </div>
      </div>

      <div className="zht-stat-drawer__body">
        {filtered.length === 0 ? (
          <div className="zht-stat-drawer__empty">暂无符合条件的数据（演示）</div>
        ) : (
          <div className="zht-stat-drawer__grid">
            {filtered.map(c => (
              <div key={c.id} className="zht-stat-drawer-card hz-cm-drawer-card">
                <div className="zht-stat-drawer-card__title">{c.title}</div>
                <div className="zht-stat-drawer-card__tags">
                  {c.tags.map(t => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                  <Tag color="processing">{c.matterName}</Tag>
                </div>
                <Text type="secondary">
                  {c.status} {c.date ? `· ${c.date}` : ''}
                </Text>
                {onOpenPortrait && (
                  <Button
                    type="link"
                    size="small"
                    className="hz-cm-drawer-card__link"
                    onClick={() => onOpenPortrait(projectId)}
                  >
                    查看项目画像
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  if (variant === 'overlay') {
    return (
      <div className="zht-stat-drawer zht-stat-drawer--overlay" role="dialog" aria-modal="true">
        {inner}
      </div>
    );
  }

  return (
    <aside className="zht-right-rail zht-right-rail--stat-drawer" aria-label="项目事项明细">
      <div className="zht-stat-drawer zht-stat-drawer--rail" role="region">
        {inner}
      </div>
    </aside>
  );
};
