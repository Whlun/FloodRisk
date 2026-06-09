import React, { useMemo } from 'react';
import { Alert, Form, Typography } from 'antd';
import type { RiskIndicatorRow } from './types';
import { LEVEL1_FACTOR_LABEL, type Level1Factor } from './types';
import {
  getPointSurveyIndicatorsForPoint,
  getPointSurveyVisibilityDiagnostics,
  type PointSurveyVisibilityBlockReason,
} from './indicatorSurveyUtils';
import type { SurveyPointType } from './types';
import { SurveyFormSection } from './SurveyFormSection';
import { renderPointSurveyFieldGrid } from './pointSurveyFields';

const { Text } = Typography;

const BLOCK_REASON_HINT: Record<PointSurveyVisibilityBlockReason, string> = {
  not_collect: '以下指标未参与单点普查（未开启「参与内涝普查定级」且未勾选「普查时必填」）：',
  not_enabled_in_architecture:
    '以下指标在本普查采用的考核方案中未启用，不在本次须填报范围（可在「指标评价管理」中启用）：',
  appendix_b_only:
    '以下指标绑定「内涝基本信息」附录 B 字段，请在上方「基本信息」Tab 的类型专用信息中填写，不在本 Tab 重复展示：',
  region_scope:
    '防灾减灾救灾类全县指标请在「内涝定级 → 防灾减灾指标信息」维护，不在单点指标普查中展示：',
  point_type_mismatch: '以下指标不适用当前易涝点类型，本页不展示：',
};

const POINT_LEVEL1_ORDER: Level1Factor[] = ['HAZARD', 'FORMATION', 'BEARING'];

interface Props {
  pointType: SurveyPointType;
  indicators: RiskIndicatorRow[];
  /** 详情只读：指标控件不可编辑 */
  readOnly?: boolean;
  /** 按考核架构启用状态过滤须填报指标 */
  architectureScoped?: boolean;
}

/** 易涝点指标普查（不含全县统一的防灾减灾因子） */
export const DynamicSurveyFields: React.FC<Props> = ({
  pointType,
  indicators,
  readOnly,
  architectureScoped = true,
}) => {
  const form = Form.useFormInstance();
  const scopeOpts = architectureScoped ? { architectureScoped: true as const } : undefined;
  const list = getPointSurveyIndicatorsForPoint(indicators, pointType, scopeOpts);
  const { blocked } = useMemo(
    () => getPointSurveyVisibilityDiagnostics(indicators, pointType, scopeOpts),
    [indicators, pointType, architectureScoped],
  );

  const blockedByReason = useMemo(() => {
    const map = new Map<PointSurveyVisibilityBlockReason, RiskIndicatorRow[]>();
    for (const item of blocked) {
      const arr = map.get(item.reason) ?? [];
      arr.push(item.indicator);
      map.set(item.reason, arr);
    }
    return map;
  }, [blocked]);

  const renderBlockedNames = (rows: RiskIndicatorRow[]) =>
    rows
      .slice(0, 8)
      .map(i => i.name)
      .join('、') + (rows.length > 8 ? ` 等 ${rows.length} 项` : '');

  return (
    <div>
      <Text type="secondary" className="dq-survey-intro">
        致灾、孕灾、承灾类指标按易涝点填报；防灾减灾救灾因子请在「内涝定级 / 防灾减灾指标信息」中全县统一维护。
        须填报项由<strong>本普查绑定的考核方案</strong>（评价版本）中已启用且参与普查的指标确定。
      </Text>
      {!list.length && !readOnly ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="当前没有可在本页填写的指标"
          description={
            <div className="dq-survey-empty-hints">
              {(
                [
                  'not_collect',
                  'not_enabled_in_architecture',
                  'appendix_b_only',
                  'point_type_mismatch',
                  'region_scope',
                ] as const
              ).map(
                reason => {
                  const rows = blockedByReason.get(reason);
                  if (!rows?.length) return null;
                  return (
                    <p key={reason} style={{ margin: '0 0 8px' }}>
                      {BLOCK_REASON_HINT[reason]}
                      {reason !== 'region_scope' ? (
                        <Text type="secondary"> {renderBlockedNames(rows)}</Text>
                      ) : null}
                    </p>
                  );
                },
              )}
              {!blocked.length ? (
                <p style={{ margin: 0 }}>
                  请先在「风险指标管理」中新增指标，并开启「参与内涝普查定级」或勾选「普查时必填」。
                </p>
              ) : null}
            </div>
          }
        />
      ) : null}
      {POINT_LEVEL1_ORDER.map(l1 => {
        const group = list.filter(i => i.level1 === l1);
        if (!group.length) return null;
        return (
          <SurveyFormSection key={l1} title={LEVEL1_FACTOR_LABEL[l1]}>
            {renderPointSurveyFieldGrid(group, indicators, readOnly, form)}
          </SurveyFormSection>
        );
      })}
    </div>
  );
};
