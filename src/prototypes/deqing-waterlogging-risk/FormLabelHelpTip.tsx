import React from 'react';
import { Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';

type Props = {
  title: string;
  ariaLabel?: string;
};

/** 表单项标签旁 ?：悬停展示说明 */
export const FormLabelHelpTip: React.FC<Props> = ({ title, ariaLabel }) => (
  <Tooltip title={title} placement="topLeft">
    <QuestionCircleOutlined
      className="dq-indicator-remark-help"
      style={{ marginLeft: 6, color: 'rgba(0,0,0,0.45)', fontSize: 13, cursor: 'help' }}
      aria-label={ariaLabel ?? '字段说明'}
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    />
  </Tooltip>
);

export function formLabelWithHelp(label: React.ReactNode, help?: string, ariaLabel?: string): React.ReactNode {
  if (!help) return label;
  return (
    <span>
      {label}
      <FormLabelHelpTip title={help} ariaLabel={ariaLabel} />
    </span>
  );
}

/** 指标编码说明（新建向导） */
export const INDICATOR_CODE_HELP_WIZARD = '系统根据一级因子自动生成（如 HZ_U001）';

/** 指标编码说明（编辑已有指标） */
export const INDICATOR_CODE_HELP_EDIT = '系统根据一级因子自动生成，保存后不可修改';

/** 普查字段键说明 */
export const SURVEY_FIELD_KEY_HELP = '默认与系统自动指标编码一致，一般无需修改';

/** 条件分支 · 匹配取值排他说明（接在字段释义后） */
export const MATCH_VALUES_EXCLUSIVE_HELP =
  '各分支匹配取值不可重复；其它分支已选用的项不会出现在本分支下拉中。';
