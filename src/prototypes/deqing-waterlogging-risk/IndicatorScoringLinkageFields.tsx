import React from 'react';
import { Checkbox, Divider, Space, Typography } from 'antd';
import type { IndicatorScoringLinkage } from './indicatorScoringProfile';

const { Text } = Typography;

interface Props {
  linkage: IndicatorScoringLinkage;
  profileLabel: string;
  mainIndicatorName?: string;
}

/** 导则预置指标的定级关联条件（只读勾选，说明系统如何判定） */
export const IndicatorScoringLinkageFields: React.FC<Props> = ({
  linkage,
  profileLabel,
  mainIndicatorName,
}) => {
  const hasAny = linkage.dependsOnAppendixBAreaImportance || linkage.dependsOnAuxiliaryCondition;
  if (!hasAny) return null;

  const auxLabel = linkage.auxiliaryConditionLabel ?? '条件指标';
  const mainName = mainIndicatorName ?? '本指标';

  return (
    <>
      <Divider plain style={{ margin: '8px 0 12px' }}>
        定级关联条件
      </Divider>
      <div style={{ marginBottom: 12 }}>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
          {profileLabel}：以下为系统固定关联，不可取消。
        </Text>
        <Space direction="vertical" size={6}>
          {linkage.dependsOnAppendixBAreaImportance ? (
            <Checkbox checked disabled>
              结合内涝基本信息「地区重要程度」判定 P 阈值
            </Checkbox>
          ) : null}
          {linkage.dependsOnAuxiliaryCondition ? (
            <Checkbox checked disabled>
              须在指标普查中先填写「{auxLabel}」，再选择「{mainName}」分档（非架构图二级指标）
            </Checkbox>
          ) : null}
        </Space>
      </div>
    </>
  );
};
