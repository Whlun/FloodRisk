import React from 'react';
import { Form, InputNumber, Select, Space } from 'antd';
import type { FormListFieldData } from 'antd/es/form';
import type { BranchNumericMatch } from './types';
import { NUMERIC_MATCH_KIND_SELECT_OPTIONS } from './branchNumericMatch';

interface Props {
  field: FormListFieldData;
  disabled?: boolean;
  /** 保留以兼容调用方；区间由 Form.List 相对路径 [field.name, matchKey] 注册 */
  listPath?: (string | number)[];
  /** 区间字段名：统一赋分 numericMatch；复合子项 tierBands 为 match */
  matchKey?: 'numericMatch' | 'match';
  /** 区间字段变更后回调（用于同步分档描述） */
  onMatchChange?: () => void;
  /** 阈值展示单位（来自指标或普查字段） */
  unit?: string;
}

function buildMatchForKind(
  next: BranchNumericMatch['kind'],
  prev?: BranchNumericMatch,
): BranchNumericMatch {
  if (next === 'between') {
    return {
      kind: 'between',
      min: prev?.kind === 'between' ? prev.min : 0,
      max: prev?.kind === 'between' ? prev.max : 1,
      minInclusive: prev?.kind === 'between' ? prev.minInclusive !== false : true,
      maxInclusive: prev?.kind === 'between' ? prev.maxInclusive === true : false,
    };
  }
  return {
    kind: next,
    value: prev && prev.kind !== 'between' && 'value' in prev ? prev.value : 0,
  };
}

type MatchEditorProps = {
  value?: BranchNumericMatch;
  onChange?: (value: BranchNumericMatch | undefined) => void;
  disabled?: boolean;
  unit?: string;
  onMatchChange?: () => void;
};

/** 单档匹配区间编辑器（由 Form.Item 注入 value/onChange） */
function NumericMatchEditor({
  value,
  onChange,
  disabled,
  unit,
  onMatchChange,
}: MatchEditorProps) {
  const kind = value?.kind;
  const unitSuffix = unit?.trim() || undefined;

  const emit = (next: BranchNumericMatch | undefined) => {
    onChange?.(next);
    queueMicrotask(() => onMatchChange?.());
  };

  const applyKind = (next: BranchNumericMatch['kind']) => {
    emit(buildMatchForKind(next, value));
  };

  return (
    <Space size={4} wrap={false} style={{ width: '100%', flexWrap: 'nowrap' }}>
      <Select
        size="small"
        disabled={disabled}
        placeholder="匹配"
        value={kind}
        options={NUMERIC_MATCH_KIND_SELECT_OPTIONS}
        onChange={v => applyKind(v as BranchNumericMatch['kind'])}
        style={{ width: 80, flexShrink: 0 }}
      />
      {kind === 'between' && value?.kind === 'between' ? (
        <>
          <InputNumber
            size="small"
            disabled={disabled}
            placeholder="下限"
            style={{ width: 84, flexShrink: 0 }}
            value={value.min}
            onChange={min =>
              emit({
                ...value,
                min: typeof min === 'number' ? min : 0,
              })
            }
          />
          <span
            style={{
              fontSize: 12,
              color: 'var(--ant-color-text-secondary)',
              flexShrink: 0,
            }}
          >
            ～
          </span>
          <InputNumber
            size="small"
            disabled={disabled}
            placeholder="上限"
            style={{ width: 84, flexShrink: 0 }}
            value={value.max}
            onChange={max =>
              emit({
                ...value,
                max: typeof max === 'number' ? max : 0,
              })
            }
          />
          {unitSuffix ? (
            <span
              style={{
                fontSize: 12,
                color: 'var(--ant-color-text-secondary)',
                flexShrink: 0,
                paddingRight: 2,
              }}
            >
              {unitSuffix}
            </span>
          ) : null}
        </>
      ) : kind && value && value.kind !== 'between' ? (
        <InputNumber
          size="small"
          disabled={disabled}
          placeholder="阈值"
          style={{ width: 92, flexShrink: 0 }}
          value={value.value}
          addonAfter={unitSuffix}
          onChange={v =>
            emit({
              kind: value.kind,
              value: typeof v === 'number' ? v : 0,
            } as BranchNumericMatch)
          }
        />
      ) : null}
    </Space>
  );
}

/** 数值统一赋分 / 条件分支内数值分档 / 复合子项分档：单档匹配区间 */
export const NumericScoreRuleMatchFields: React.FC<Props> = ({
  field,
  disabled,
  matchKey = 'numericMatch',
  onMatchChange,
  unit,
}) => (
  <Form.Item
    {...field}
    name={[field.name, matchKey]}
    style={{ marginBottom: 0 }}
    rules={[
      {
        validator: async (_, v: BranchNumericMatch | undefined) => {
          if (!v?.kind) throw new Error('请选择匹配区间');
          if (v.kind === 'between') {
            if (v.min === undefined || v.max === undefined) throw new Error('请填写区间上下限');
            return;
          }
          if (v.value === undefined || v.value === null || Number.isNaN(v.value)) {
            throw new Error('请填写阈值');
          }
        },
      },
    ]}
  >
    <NumericMatchEditor disabled={disabled} unit={unit} onMatchChange={onMatchChange} />
  </Form.Item>
);
