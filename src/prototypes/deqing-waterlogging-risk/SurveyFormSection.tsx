import React from 'react';
import { Typography } from 'antd';

const { Text } = Typography;

export interface SurveyFormSectionProps {
  /** 二级分区标题（弱于 Card 标题） */
  title: React.ReactNode;
  /** 紧跟标题后的附加信息（如引用 Tag） */
  titleExtra?: React.ReactNode;
  /** 标题行右侧操作（如恢复引用按钮），靠右对齐 */
  headActions?: React.ReactNode;
  /** 分区说明，显示在标题下方 */
  hint?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

/** 普查/试算/防灾减灾表单内的二级分区（致灾因子、内涝基本信息等） */
export function SurveyFormSection({
  title,
  titleExtra,
  headActions,
  hint,
  className,
  children,
}: SurveyFormSectionProps) {
  const rootClass = ['dq-survey-factor-group', className].filter(Boolean).join(' ');

  return (
    <div className={rootClass}>
      <div className="dq-survey-section-head">
        <div className="dq-survey-section-head-main">
          <div className="dq-survey-section-title">{title}</div>
          {titleExtra ? <div className="dq-survey-section-title-extra">{titleExtra}</div> : null}
        </div>
        {headActions ? <div className="dq-survey-section-actions">{headActions}</div> : null}
      </div>
      {hint ? (
        typeof hint === 'string' ? (
          <Text type="secondary" className="dq-survey-section-hint">
            {hint}
          </Text>
        ) : (
          hint
        )
      ) : null}
      {children}
    </div>
  );
}
