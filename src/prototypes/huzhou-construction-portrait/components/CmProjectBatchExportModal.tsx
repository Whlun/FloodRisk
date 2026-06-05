/**
 * 建设工程画像 · 批量导出字段选择与确认
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Collapse, Modal, Space, Typography, message } from 'antd';
import {
  downloadCmProjectBatchExportZip,
  getCmProjectExportDefaultFieldKeys,
  getCmProjectExportFieldGroups,
} from '../cmProjectBatchExport';
import type { CmProjectExportFieldGroup, CmProjectExportFieldOption } from '../cmProjectExportSchema';
import { CM_PROJECT_EXPORT_USER_NAME, type CmProjectExportRecordInput } from '../cmProjectExportRecords';
import type { ConstructionProject } from '../types';
import { CmProjectExportSuccessModal } from './CmProjectExportSuccessModal';

const { Text } = Typography;

export type CmProjectBatchExportModalProps = {
  open: boolean;
  projects: ConstructionProject[];
  onClose: () => void;
  onExported?: () => void;
  onRecordCreated?: (record: CmProjectExportRecordInput) => void;
};

function groupCheckState(groupKeys: string[], checkedKeys: string[]) {
  const checkedInGroup = groupKeys.filter(k => checkedKeys.includes(k));
  return {
    checkedInGroup,
    groupAll: checkedInGroup.length === groupKeys.length,
    groupIndeterminate:
      checkedInGroup.length > 0 && checkedInGroup.length < groupKeys.length,
  };
}

function splitGroupFields(fields: CmProjectExportFieldOption[]) {
  const attributeFields = fields.filter(f => !f.isPhaseAttachment);
  const attachmentFields = fields.filter(f => f.isPhaseAttachment);
  return { attributeFields, attachmentFields };
}

type ExportGroupPanelProps = {
  group: CmProjectExportFieldGroup;
  checkedKeys: string[];
  onGroupFieldChange: (groupKeys: string[], nextInGroup: string[]) => void;
};

const ExportGroupPanel: React.FC<ExportGroupPanelProps> = ({
  group,
  checkedKeys,
  onGroupFieldChange,
}) => {
  const groupKeys = useMemo(() => group.fields.map(f => f.key), [group.fields]);
  const { attributeFields, attachmentFields } = useMemo(
    () => splitGroupFields(group.fields),
    [group.fields],
  );

  return (
    <>
      {attributeFields.length > 0 ? (
        <Checkbox.Group
          className="hz-cm-batch-export-fields__grid hz-cm-batch-export-fields__grid--collapse"
          value={checkedKeys}
          onChange={vals => {
            const attachmentKeys = attachmentFields.map(f => f.key);
            const selectedAttachments = checkedKeys.filter(k => attachmentKeys.includes(k));
            onGroupFieldChange(groupKeys, [...(vals as string[]), ...selectedAttachments]);
          }}
        >
          {attributeFields.map(opt => (
            <Checkbox key={opt.key} value={opt.key}>
              {opt.label}
            </Checkbox>
          ))}
        </Checkbox.Group>
      ) : null}
      {attachmentFields.length > 0 ? (
        <div className="hz-cm-batch-export-fields__attachments">
          <Checkbox.Group
            value={checkedKeys}
            onChange={vals => {
              const attributeKeys = attributeFields.map(f => f.key);
              const selectedAttributes = checkedKeys.filter(k => attributeKeys.includes(k));
              onGroupFieldChange(groupKeys, [...selectedAttributes, ...(vals as string[])]);
            }}
          >
            {attachmentFields.map(opt => (
              <Checkbox key={opt.key} value={opt.key} className="hz-cm-batch-export-fields__attachment-option">
                {opt.label}
              </Checkbox>
            ))}
          </Checkbox.Group>
        </div>
      ) : null}
    </>
  );
};

export const CmProjectBatchExportModal: React.FC<CmProjectBatchExportModalProps> = ({
  open,
  projects,
  onClose,
  onExported,
  onRecordCreated,
}) => {
  const fieldGroups = useMemo(() => getCmProjectExportFieldGroups(), []);
  const allKeys = useMemo(
    () => fieldGroups.flatMap(g => g.fields.map(f => f.key)),
    [fieldGroups],
  );
  const [checkedKeys, setCheckedKeys] = useState<string[]>(() => getCmProjectExportDefaultFieldKeys());
  const [exporting, setExporting] = useState(false);
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<string[]>([]);
  const [successOpen, setSuccessOpen] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [exportFileName, setExportFileName] = useState('');

  useEffect(() => {
    if (open) {
      setCheckedKeys(getCmProjectExportDefaultFieldKeys());
      setExpandedGroupKeys([]);
      setSuccessOpen(false);
      setExportPassword('');
      setExportFileName('');
    }
  }, [open]);

  const allChecked = checkedKeys.length === allKeys.length;
  const indeterminate = checkedKeys.length > 0 && !allChecked;

  const toggleAll = useCallback(
    (checked: boolean) => {
      setCheckedKeys(checked ? [...allKeys] : []);
    },
    [allKeys],
  );

  const toggleGroup = useCallback((groupKeys: string[], checked: boolean) => {
    setCheckedKeys(prev => {
      const rest = prev.filter(k => !groupKeys.includes(k));
      return checked ? [...rest, ...groupKeys] : rest;
    });
  }, []);

  const onGroupFieldChange = useCallback((groupKeys: string[], nextInGroup: string[]) => {
    setCheckedKeys(prev => {
      const rest = prev.filter(k => !groupKeys.includes(k));
      return [...rest, ...nextInGroup];
    });
  }, []);

  const handleExport = useCallback(async () => {
    if (projects.length === 0 || checkedKeys.length === 0) return;
    setExporting(true);
    try {
      const { password, fileName } = await downloadCmProjectBatchExportZip(projects, checkedKeys);
      onRecordCreated?.({
        exportedBy: CM_PROJECT_EXPORT_USER_NAME,
        fileName,
        password,
        projectCount: projects.length,
        fieldCount: checkedKeys.length,
        fieldKeys: checkedKeys,
        projectIds: projects.map(p => p.id),
        projectNames: projects.map(p => p.name),
      });
      setExportPassword(password);
      setExportFileName(fileName);
      setSuccessOpen(true);
      onClose();
    } catch {
      message.error('导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  }, [checkedKeys, onClose, onRecordCreated, projects]);

  const handleSuccessClose = useCallback(() => {
    setSuccessOpen(false);
    (onExported ?? (() => undefined))();
  }, [onExported]);

  const collapseItems = useMemo(
    () =>
      fieldGroups.map(group => {
        const groupKeys = group.fields.map(f => f.key);
        const { checkedInGroup, groupAll, groupIndeterminate } = groupCheckState(groupKeys, checkedKeys);
        return {
          key: group.key,
          label: (
            <div className="hz-cm-batch-export-fields__collapse-label">
              <Checkbox
                indeterminate={groupIndeterminate}
                checked={groupAll}
                onClick={e => e.stopPropagation()}
                onChange={e => toggleGroup(groupKeys, e.target.checked)}
              >
                {group.title}
              </Checkbox>
              <Text type="secondary" className="hz-cm-batch-export-fields__collapse-count">
                {checkedInGroup.length}/{groupKeys.length}
              </Text>
            </div>
          ),
          children: (
            <ExportGroupPanel
              group={group}
              checkedKeys={checkedKeys}
              onGroupFieldChange={onGroupFieldChange}
            />
          ),
        };
      }),
    [checkedKeys, fieldGroups, onGroupFieldChange, toggleGroup],
  );

  return (
    <>
      <Modal
        title="批量导出"
        open={open}
        width={640}
        destroyOnClose
        onCancel={onClose}
        footer={
          <Space>
            <Button onClick={onClose}>取消</Button>
            <Button
              type="primary"
              loading={exporting}
              disabled={projects.length === 0 || checkedKeys.length === 0}
              onClick={() => void handleExport()}
            >
              开始导出
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Text type="secondary">
            已选 <Text strong>{projects.length}</Text> 个项目。Excel 含<strong>主标题行</strong>
            （基本信息、各阶段同级）与<strong>副标题行</strong>（字段名）；将打包为<strong>加密 zip</strong>
            ，含<strong>地块矢量数据.geojson</strong>及所选<strong>阶段资料</strong>附件。
          </Text>
          <div className="hz-cm-batch-export-fields">
            <div className="hz-cm-batch-export-fields__head">
              <Checkbox
                indeterminate={indeterminate}
                checked={allChecked}
                onChange={e => toggleAll(e.target.checked)}
              >
                导出字段（默认全量）
              </Checkbox>
              <Text type="secondary">
                {checkedKeys.length}/{allKeys.length}
              </Text>
            </div>
            <Collapse
              bordered={false}
              collapsible="icon"
              className="hz-cm-batch-export-fields__collapse"
              activeKey={expandedGroupKeys}
              onChange={keys => setExpandedGroupKeys(keys as string[])}
              items={collapseItems}
            />
          </div>
        </Space>
      </Modal>
      <CmProjectExportSuccessModal
        open={successOpen}
        password={exportPassword}
        projectCount={projects.length}
        fileName={exportFileName}
        onClose={handleSuccessClose}
      />
    </>
  );
};
