/**
 * 建设工程画像 · 建设工程项目列表字段配置（overlay 列表视图「字段」管理）
 * 数据列与 ParcelDetailModal 基本信息同源（收起 9 项 / 展开 24 项）
 */
import React from 'react';
import { Button, Tooltip, Typography } from 'antd';
import { EnvironmentOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnConfig } from '../韶山水环境设施管理系统/pipe-line-table-kit';
import { getDefaultVisibleColumnKeys } from '../韶山水环境设施管理系统/pipe-line-table-kit';
import {
  basicInfoFieldToTableColumnKey,
  CM_PROJECT_TABLE_PHASE_KEY,
  getCmProjectTableDefaultVisibleColumnKeys as getCmProjectTableDefaultDataColumnKeys,
  resolveCmBasicInfoCellText,
  type ConstructionProjectBasicInfoSnapshot,
} from '../huzhou-lifecycle-shared/cmProjectBasicInfo';
import {
  BASIC_INFO_ROW_CURRENT_STAGE,
  getBasicInfoDescriptionFields,
  resolveParcelBasicInfoValue,
} from '../huzhou-lifecycle-shared/parcelBasicInfo';
import { getParcelById } from '../huzhou-lifecycle-shared/mock/demoParcels';
import { getPhaseMetric } from './mock/phaseDistribution';
import { buildConstructionProjectSnapshot } from './mock/constructionProjectParcel';
import { resolveProjectParcelId } from './mock/projects';
import type { ConstructionProject } from './types';
import { CmDistrictTag } from '../huzhou-lifecycle-shared/components/CmDistrictTag';
import { CmProjectFavoriteStar } from './components/CmProjectFavoriteStar';

const { Text } = Typography;

type CmProjectColumnConfig = ColumnConfig & {
  ellipsis?: boolean;
  align?: 'left' | 'center' | 'right';
};

/** 各基本信息字段列宽（演示） */
const TABLE_COLUMN_WIDTH: Partial<Record<string, number>> = {
  apply_project_name: 220,
  project_code: 180,
  project_class: 140,
  construct_nature: 88,
  industry: 120,
  owner_name: 180,
  total_fund: 120,
  scale_content: 240,
  address_detial: 200,
  [CM_PROJECT_TABLE_PHASE_KEY]: 128,
  owner_legalperson_name: 100,
  total_land_area: 120,
  total_build_area: 140,
  over_build_area: 140,
  fund_source: 120,
  the_industry: 120,
  place_code_detail: 108,
  apply_time: 160,
  plan_starttime: 120,
  plan_endtime: 120,
  owner_address: 200,
  owner_legaperson_certno: 180,
  owner_legaperson_certtype: 120,
};

function toProjectSnapshot(project: ConstructionProject): ConstructionProjectBasicInfoSnapshot {
  return buildConstructionProjectSnapshot(project);
}

export type CmProjectTableColumnOptions = {
  onOpenParcelDetail: (project: ConstructionProject) => void;
  onLocateProjectOnMap?: (project: ConstructionProject) => void;
  isFavorite: (projectId: string) => boolean;
  onToggleFavorite: (projectId: string) => void;
  /** 导出模式下隐藏定位操作 */
  exportMode?: boolean;
};

function buildDataColumns(defaultDataKeys: Set<string>): CmProjectColumnConfig[] {
  return getBasicInfoDescriptionFields().flatMap(field => {
    const key = basicInfoFieldToTableColumnKey(field);
    if (!key) return [];

    if (field.stageCode === BASIC_INFO_ROW_CURRENT_STAGE) {
      return [
        {
          key: CM_PROJECT_TABLE_PHASE_KEY,
          title: '当前阶段',
          width: TABLE_COLUMN_WIDTH[CM_PROJECT_TABLE_PHASE_KEY] ?? 128,
          defaultVisible: defaultDataKeys.has(CM_PROJECT_TABLE_PHASE_KEY),
          render: (_: unknown, row: ConstructionProject) => {
            const phaseLabel = getPhaseMetric(row.phaseKey).label;
            return (
              <Tooltip title={`当前阶段：${phaseLabel}`} placement="top" mouseEnterDelay={0.35}>
                <span
                  className={`zht-stat-drawer-card__tag hz-cm-project-table__tag hz-cm-project-table__phase-tag hz-cm-phase-card--phase-${row.phaseKey}`}
                >
                  {phaseLabel}
                </span>
              </Tooltip>
            );
          },
        },
      ];
    }

    return [
      {
        key,
        title: field.label,
        width: TABLE_COLUMN_WIDTH[key] ?? 120,
        defaultVisible: defaultDataKeys.has(key),
        ellipsis: Boolean(field.ellipsis),
        render: (_: unknown, row: ConstructionProject) => {
          const parcel = getParcelById(resolveProjectParcelId(row));
          const snapshot = toProjectSnapshot(row);
          if (field.districtTag) {
            const raw =
              field.parcelKey === 'region' && snapshot.region
                ? snapshot.region
                : parcel
                  ? resolveParcelBasicInfoValue(parcel, field)
                  : undefined;
            return <CmDistrictTag value={raw} />;
          }
          const text = resolveCmBasicInfoCellText(parcel, field, snapshot);
          if (field.ellipsis && text !== '—') {
            return (
              <Text ellipsis={{ tooltip: text }} style={{ maxWidth: '100%' }}>
                {text}
              </Text>
            );
          }
          return text;
        },
      },
    ];
  });
}

/** 全部可配置列（含操作列） */
export function buildCmProjectAllColumnConfigs(
  options: CmProjectTableColumnOptions,
): CmProjectColumnConfig[] {
  const { onOpenParcelDetail, onLocateProjectOnMap, isFavorite, onToggleFavorite, exportMode = false } =
    options;
  const hasLocate = Boolean(onLocateProjectOnMap) && !exportMode;
  const defaultDataKeys = new Set(getCmProjectTableDefaultDataColumnKeys());

  return [
    {
      key: 'no',
      title: '序号',
      width: 56,
      defaultVisible: true,
      render: (_: unknown, __: ConstructionProject, i?: number) => (i ?? 0) + 1,
    },
    ...buildDataColumns(defaultDataKeys),
    {
      key: 'operation',
      title: '操作',
      width: hasLocate ? 228 : 156,
      fixed: 'right',
      align: 'center',
      defaultVisible: true,
      render: (_: unknown, row: ConstructionProject) => (
        <div className="zht-alarm-rail__table-actions hz-cm-project-table-actions">
          {hasLocate ? (
            <Button
              type="link"
              size="small"
              className="zht-alarm-rail-table__loc-link action-btn detail"
              icon={<EnvironmentOutlined />}
              onClick={e => {
                e.stopPropagation();
                onLocateProjectOnMap?.(row);
              }}
            >
              定位
            </Button>
          ) : null}
          <Button
            type="link"
            size="small"
            className="action-btn detail"
            icon={<EyeOutlined />}
            onClick={e => {
              e.stopPropagation();
              onOpenParcelDetail(row);
            }}
          >
            查看
          </Button>
          <CmProjectFavoriteStar
            active={isFavorite(row.id)}
            onToggle={() => onToggleFavorite(row.id)}
            variant="link"
            showTooltip={false}
          />
        </div>
      ),
    },
  ];
}

export function getCmProjectTableDefaultVisibleColumnKeys(): string[] {
  return getDefaultVisibleColumnKeys(
    buildCmProjectAllColumnConfigs({
      onOpenParcelDetail: () => {},
      isFavorite: () => false,
      onToggleFavorite: () => {},
    }),
  );
}
