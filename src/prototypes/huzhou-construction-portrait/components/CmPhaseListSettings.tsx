/**
 * 事项阶段分布 · 展示阶段筛选
 */
import React, { useState } from 'react';
import { Button, Checkbox, Popover, Tooltip, Typography, message } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import type { PhaseKey } from '../types';

const { Text } = Typography;

export type CmPhaseListSettingsOption = {
  key: PhaseKey;
  label: string;
};

export type CmPhaseListSettingsProps = {
  options: CmPhaseListSettingsOption[];
  visibleKeys: PhaseKey[];
  onChange: (keys: PhaseKey[]) => void;
};

export const CmPhaseListSettings: React.FC<CmPhaseListSettingsProps> = ({
  options,
  visibleKeys,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const defaultKeys = options.map(option => option.key);

  const content = (
    <div className="hz-cm-phase-list-settings">
      <Text type="secondary" className="hz-cm-phase-list-settings__hint">
        勾选要在列表中展示的阶段
      </Text>
      <Checkbox.Group
        className="hz-cm-phase-list-settings__group"
        value={visibleKeys}
        onChange={vals => {
          const keys = vals as PhaseKey[];
          if (keys.length === 0) {
            message.warning('至少保留一个阶段');
            return;
          }
          onChange(keys);
        }}
      >
        {options.map(option => (
          <Checkbox key={option.key} value={option.key}>
            {option.label}
          </Checkbox>
        ))}
      </Checkbox.Group>
      <Button
        type="link"
        size="small"
        className="hz-cm-phase-list-settings__reset"
        onClick={() => {
          onChange(defaultKeys);
          message.success('已恢复默认阶段');
        }}
      >
        恢复默认
      </Button>
    </div>
  );

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomRight"
      content={content}
    >
      <Tooltip title="筛选展示阶段">
        <Button
          type="text"
          className={`hz-cm-phase-list__settings-btn${open ? ' hz-cm-phase-list__settings-btn--on' : ''}`}
          aria-label="筛选展示阶段"
          aria-expanded={open}
          icon={<SettingOutlined />}
        />
      </Tooltip>
    </Popover>
  );
};
