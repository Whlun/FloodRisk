/**
 * 建设工程画像 · 批量导出字段 schema（基本信息 + 9 阶段属性，与详情同源）
 */
import {
  basicInfoFieldToTableColumnKey,
  CM_PROJECT_TABLE_PHASE_KEY,
} from '../huzhou-lifecycle-shared/cmProjectBasicInfo';
import { CM_PHASES, type CmPhaseAccentKey } from '../huzhou-lifecycle-shared/cmPhaseAccent';
import { getMatterDisplayFields } from '../huzhou-lifecycle-shared/matterDisplayFields';
import { getBasicInfoDescriptionFields } from '../huzhou-lifecycle-shared/parcelBasicInfo';
import type { MatterStageKey } from '../huzhou-lifecycle-shared/parcelMatterStages';

export const CM_EXPORT_BASIC_GROUP_KEY = 'basic';
export const CM_EXPORT_ATTACHMENT_KEY_PREFIX = 'attachments:phase:';

export type CmProjectExportFieldOption = {
  key: string;
  label: string;
  groupKey: string;
  groupTitle: string;
  /** 阶段档案附件（不进 Excel，仅 zip） */
  isPhaseAttachment?: boolean;
};

export type CmProjectExportFieldGroup = {
  key: string;
  title: string;
  fields: CmProjectExportFieldOption[];
};

function primaryMatterKeyForExportPhase(phaseKey: CmPhaseAccentKey): MatterStageKey {
  const phase = CM_PHASES.find(p => p.key === phaseKey);
  if (!phase) return 'pre-review';
  const withDisplay = phase.matterKeys.find(k => getMatterDisplayFields(k) != null);
  return withDisplay ?? phase.matterKeys[0];
}

export function buildPhaseExportFieldKey(phaseKey: CmPhaseAccentKey, fieldCode: string): string {
  return `phase:${phaseKey}:${fieldCode}`;
}

export function buildPhaseAttachmentExportFieldKey(phaseKey: CmPhaseAccentKey): string {
  return `${CM_EXPORT_ATTACHMENT_KEY_PREFIX}${phaseKey}`;
}

export function isPhaseAttachmentExportKey(fieldKey: string): boolean {
  return fieldKey.startsWith(CM_EXPORT_ATTACHMENT_KEY_PREFIX);
}

export function parsePhaseAttachmentExportFieldKey(fieldKey: string): CmPhaseAccentKey | null {
  if (!isPhaseAttachmentExportKey(fieldKey)) return null;
  return fieldKey.slice(CM_EXPORT_ATTACHMENT_KEY_PREFIX.length) as CmPhaseAccentKey;
}

export function parsePhaseExportFieldKey(
  fieldKey: string,
): { phaseKey: CmPhaseAccentKey; fieldCode: string } | null {
  const match = /^phase:([^:]+):(.+)$/.exec(fieldKey);
  if (!match) return null;
  return { phaseKey: match[1] as CmPhaseAccentKey, fieldCode: match[2] };
}

function buildBasicExportFields(): CmProjectExportFieldOption[] {
  return getBasicInfoDescriptionFields().flatMap(field => {
    const key = basicInfoFieldToTableColumnKey(field);
    if (!key) return [];
    return [
      {
        key,
        label: field.label,
        groupKey: CM_EXPORT_BASIC_GROUP_KEY,
        groupTitle: '基本信息',
      },
    ];
  });
}

function buildPhaseExportFields(phaseKey: CmPhaseAccentKey, phaseLabel: string): CmProjectExportFieldOption[] {
  const matterKey = primaryMatterKeyForExportPhase(phaseKey);
  const displayFields = getMatterDisplayFields(matterKey);
  if (!displayFields?.length) return [];
  const groupKey = `phase:${phaseKey}`;
  return displayFields.map(field => ({
    key: buildPhaseExportFieldKey(phaseKey, field.code),
    label: field.label,
    groupKey,
    groupTitle: phaseLabel,
  }));
}

export function getCmProjectExportFieldGroups(): CmProjectExportFieldGroup[] {
  const basicFields = buildBasicExportFields();
  const groups: CmProjectExportFieldGroup[] = [
    {
      key: CM_EXPORT_BASIC_GROUP_KEY,
      title: '基本信息',
      fields: basicFields,
    },
  ];

  for (const phase of CM_PHASES) {
    const fields = buildPhaseExportFields(phase.key, phase.label);
    if (fields.length === 0) continue;
    groups.push({
      key: `phase:${phase.key}`,
      title: phase.label,
      fields: [
        ...fields,
        {
          key: buildPhaseAttachmentExportFieldKey(phase.key),
          label: '阶段资料',
          groupKey: `phase:${phase.key}`,
          groupTitle: phase.label,
          isPhaseAttachment: true,
        },
      ],
    });
  }

  return groups;
}

export function getCmProjectExportFieldOptions(): CmProjectExportFieldOption[] {
  return getCmProjectExportFieldGroups().flatMap(g => g.fields);
}

export function getCmProjectExportDefaultFieldKeys(): string[] {
  return getCmProjectExportFieldOptions().map(f => f.key);
}

/** 按分组顺序排列已选 Excel 字段（排除阶段资料项） */
export function orderSelectedExportFields(selectedKeys: string[]): CmProjectExportFieldOption[] {
  const selected = new Set(selectedKeys);
  return getCmProjectExportFieldOptions().filter(f => selected.has(f.key) && !f.isPhaseAttachment);
}

export function getSelectedPhaseAttachmentKeys(selectedKeys: string[]): CmPhaseAccentKey[] {
  return selectedKeys
    .map(parsePhaseAttachmentExportFieldKey)
    .filter((k): k is CmPhaseAccentKey => k != null);
}

export { CM_PROJECT_TABLE_PHASE_KEY };
