/**
 * 地块详情 · 当前事项属性（产品展示字段或 schema 全量）
 */
import React, { useMemo, useState } from 'react';
import { Button, Collapse, Descriptions } from 'antd';
import {
  formatMatterDisplayValue,
  getMatterDisplayColumns,
  getMatterDisplayFields,
  type MatterDisplayField,
} from '../matterDisplayFields';
import type { MatterStageKey } from '../parcelMatterStages';
import {
  getFieldsByGroup,
  getTableSchemaForMatter,
  orderedFieldGroups,
  type FieldGroup,
  type ParcelFieldDef,
  type ParcelTableSchema,
} from '../parcelFieldSchema';
import type { MatterStageRecord } from '../types';

const SUMMARY_LIMIT = 8;

export type MatterFieldPanelMode = 'all' | 'attr' | 'identifier';

function formatValue(v: string | number | null | undefined): string {
  if (v == null || v === '') return '—';
  return String(v);
}

function fieldsForMode(schema: ParcelTableSchema, mode: MatterFieldPanelMode): ParcelFieldDef[] {
  if (mode === 'identifier') {
    return schema.fields.filter(f => f.group === '标识关联');
  }
  if (mode === 'attr') {
    return schema.fields.filter(f => f.group !== '标识关联');
  }
  return schema.fields;
}

function MatterDisplayGrid({
  fields,
  data,
  columns,
  emptyLayout,
}: {
  fields: MatterDisplayField[];
  data: MatterStageRecord;
  columns: number;
  emptyLayout?: boolean;
}) {
  const rows = useMemo(() => {
    const out: MatterDisplayField[][] = [];
    for (let i = 0; i < fields.length; i += columns) {
      out.push(fields.slice(i, i + columns));
    }
    return out;
  }, [fields, columns]);

  return (
    <div className="hz-lifecycle-detail__matter-scroll">
      <div
        className={[
          'hz-lifecycle-detail__matter-grid',
          `hz-lifecycle-detail__matter-grid--cols-${columns}`,
          emptyLayout ? 'hz-lifecycle-detail__matter-grid--empty' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role="table"
      >
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="hz-lifecycle-detail__matter-grid-row" role="row">
          {row.map(f => (
            <div key={f.code} className="hz-lifecycle-detail__matter-grid-cell" role="cell">
              <div className="hz-lifecycle-detail__matter-grid-label">{f.label}</div>
              <div className="hz-lifecycle-detail__matter-grid-value">
                {formatMatterDisplayValue(f, data)}
              </div>
            </div>
          ))}
          {row.length < columns
            ? Array.from({ length: columns - row.length }, (_, i) => (
                <div
                  key={`pad-${rowIndex}-${i}`}
                  className="hz-lifecycle-detail__matter-grid-cell hz-lifecycle-detail__matter-grid-cell--pad"
                  aria-hidden
                />
              ))
            : null}
        </div>
      ))}
      </div>
    </div>
  );
}

function FieldGroupPanel({
  fields,
  data,
  expandedAll,
  denseGrid,
  columns = 3,
  emptyLayout,
}: {
  fields: ParcelFieldDef[];
  data: MatterStageRecord;
  expandedAll: boolean;
  denseGrid?: boolean;
  columns?: number;
  emptyLayout?: boolean;
}) {
  const summaryFields = fields.filter(f => f.summary);
  const restFields = fields.filter(f => !f.summary);
  const show = expandedAll
    ? fields
    : summaryFields.length > 0
      ? summaryFields
      : fields.slice(0, SUMMARY_LIMIT);
  const hasMore =
    !expandedAll &&
    !denseGrid &&
    (restFields.length > 0 || (summaryFields.length === 0 && fields.length > SUMMARY_LIMIT));

  const colClass = [
    denseGrid
      ? columns >= 4
        ? 'hz-lifecycle-detail__matter-desc hz-lifecycle-detail__matter-desc--dense hz-lifecycle-detail__matter-desc--dense-4'
        : 'hz-lifecycle-detail__matter-desc hz-lifecycle-detail__matter-desc--dense'
      : 'hz-lifecycle-detail__matter-desc',
    emptyLayout ? 'hz-lifecycle-detail__matter-desc--empty' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <Descriptions bordered size="small" column={denseGrid ? columns : 2} className={colClass}>
        {show.map(f => (
          <Descriptions.Item key={f.code} label={f.label} span={f.label.length > 12 ? 2 : 1}>
            {formatValue(data[f.code])}
          </Descriptions.Item>
        ))}
      </Descriptions>
      {hasMore && (
        <p className="hz-lifecycle-detail__expand-hint" style={{ margin: '8px 0 0', fontSize: 12, color: '#888' }}>
          另有 {fields.length - show.length} 项字段，请点击下方「展开全部字段」
        </p>
      )}
    </>
  );
}

export type ParcelMatterFieldPanelProps = {
  matterKey: MatterStageKey;
  data: MatterStageRecord;
  fieldMode?: MatterFieldPanelMode;
  /** 建管阶段详情：按 matterDisplayFields 平铺 */
  denseGrid?: boolean;
  /** 无填报数据：仍展示字段表骨架，灰态、值为 — */
  emptyLayout?: boolean;
};

export const ParcelMatterFieldPanel: React.FC<ParcelMatterFieldPanelProps> = ({
  matterKey,
  data,
  fieldMode = 'all',
  denseGrid = false,
  emptyLayout = false,
}) => {
  const [expandedAll, setExpandedAll] = useState(false);
  const schema = getTableSchemaForMatter(matterKey);
  const displayFields = denseGrid ? getMatterDisplayFields(matterKey) : undefined;
  const displayColumns = getMatterDisplayColumns(matterKey);

  const fields = useMemo(() => {
    if (!schema) return [] as ParcelFieldDef[];
    return fieldsForMode(schema, fieldMode);
  }, [schema, fieldMode]);

  const groups = useMemo(() => {
    if (!schema) return [] as FieldGroup[];
    return orderedFieldGroups(schema);
  }, [schema]);

  if (displayFields?.length) {
    return (
      <MatterDisplayGrid
        fields={displayFields}
        data={data}
        columns={displayColumns}
        emptyLayout={emptyLayout}
      />
    );
  }

  if (!schema || fields.length === 0) {
    return <div className="hz-lifecycle-detail__empty">该阶段暂无数据</div>;
  }

  const byGroup = getFieldsByGroup(schema);
  const scopedByGroup = (g: FieldGroup) =>
    fieldsForMode({ ...schema, fields: byGroup[g] }, fieldMode);

  if (denseGrid || fieldMode !== 'all') {
    const showAll = denseGrid || expandedAll;
    const panel = (
      <>
        <FieldGroupPanel
          fields={fields}
          data={data}
          expandedAll={showAll}
          denseGrid={denseGrid}
          columns={displayColumns}
          emptyLayout={emptyLayout}
        />
        {!denseGrid && fields.length > SUMMARY_LIMIT && (
          <Button
            type="link"
            size="small"
            className="hz-lifecycle-detail__expand-all"
            onClick={() => setExpandedAll(v => !v)}
          >
            {expandedAll ? '收起字段' : '展开全部字段'}
          </Button>
        )}
      </>
    );
    return denseGrid ? (
      <div className="hz-lifecycle-detail__matter-scroll">{panel}</div>
    ) : (
      <div>{panel}</div>
    );
  }

  const totalFields = schema.fields.length;
  const useCollapse = totalFields > 15;

  if (!useCollapse) {
    return (
      <div>
        <FieldGroupPanel fields={fields} data={data} expandedAll={expandedAll} />
        {totalFields > SUMMARY_LIMIT && (
          <Button
            type="link"
            size="small"
            className="hz-lifecycle-detail__expand-all"
            onClick={() => setExpandedAll(v => !v)}
          >
            {expandedAll ? '收起字段' : '展开全部字段'}
          </Button>
        )}
      </div>
    );
  }

  const collapseItems = groups
    .map(g => {
      const groupFields = scopedByGroup(g);
      if (groupFields.length === 0) return null;
      return {
        key: g,
        label: `${g}（${groupFields.length}）`,
        children: <FieldGroupPanel fields={groupFields} data={data} expandedAll={expandedAll} />,
      };
    })
    .filter(Boolean) as { key: string; label: string; children: React.ReactNode }[];

  return (
    <div className="hz-lifecycle-detail__field-collapse">
      <Collapse size="small" defaultActiveKey={groups.slice(0, 2)} items={collapseItems} />
      <Button
        type="link"
        size="small"
        className="hz-lifecycle-detail__expand-all"
        onClick={() => setExpandedAll(v => !v)}
      >
        {expandedAll ? '各组仅显示摘要字段' : '展开全部字段'}
      </Button>
    </div>
  );
};
