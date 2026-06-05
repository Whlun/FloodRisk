import React from 'react';
import { Alert, List, Typography } from 'antd';
import type { RiskIndicatorRow } from './types';
import {
  validateIndicatorConfig,
  type IndicatorConfigReadinessResult,
} from './indicatorConfigReadiness';

const { Text } = Typography;

interface Props {
  ind: RiskIndicatorRow;
  allIndicators?: RiskIndicatorRow[];
  /** 外部已算好的结果可传入，避免重复计算 */
  result?: IndicatorConfigReadinessResult;
  compact?: boolean;
}

/** 配置就绪清单：保存前展示 blocker / warning */
export const IndicatorConfigReadinessAlert: React.FC<Props> = ({
  ind,
  allIndicators = [],
  result: resultProp,
  compact,
}) => {
  const result = resultProp ?? validateIndicatorConfig(ind, allIndicators);

  if (result.ok) {
    return null;
  }

  const type = result.blockers.length > 0 ? 'error' : 'warning';
  const message = result.blockers.length > 0 ? '须完善以下项后方可正常计算' : '可保存，建议完善以下项';

  if (compact) {
    const lines = [...result.blockers, ...result.warnings];
    return (
      <Alert
        type={type}
        showIcon
        message={message}
        description={lines.slice(0, 4).join('；')}
        style={{ marginBottom: 12 }}
      />
    );
  }

  return (
    <Alert
      type={type}
      showIcon
      message={message}
      style={{ marginBottom: 12 }}
      description={
        <List
          size="small"
          dataSource={[
            ...result.blockers.map(t => ({ kind: 'blocker' as const, text: t })),
            ...result.warnings.map(t => ({ kind: 'warning' as const, text: t })),
          ]}
          renderItem={item => (
            <List.Item style={{ padding: '2px 0', border: 'none' }}>
              <Text type={item.kind === 'blocker' ? 'danger' : 'secondary'}>
                {item.kind === 'blocker' ? '· ' : '○ '}
                {item.text}
              </Text>
            </List.Item>
          )}
        />
      }
    />
  );
};
