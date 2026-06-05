/**
 * 设施详情 —「视频监控」标签页：与「实时监测」一致的关联逻辑（多选物联视频通道、可修改、未关联空态）。
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Space, Typography, Button, Modal, Form, Checkbox, Empty, Alert, message, Input, Tree } from 'antd';
import { VideoCameraOutlined, PlayCircleOutlined } from '@ant-design/icons';
import type { Key } from 'react';
import type { DataNode } from 'antd/es/tree';

import type { FacilityMonitoringScene } from './pipe-node-monitoring';

const { Text } = Typography;
const MAX_VIDEO_PREVIEW = 4;

function normalizeCameraName(name: string): string {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return '摄像头';
  return trimmed.replace(/^\d+#/, '').trim() || '摄像头';
}

const VIDEO_TONES = ['pink', 'orange', 'yellow', 'blue', 'green'] as const;

export interface MockVideoChannel {
  key: string;
  name: string;
  /** 通道编号，仅弹窗勾选列表展示 */
  channelId: string;
  tone: (typeof VIDEO_TONES)[number];
  /** 为 false 时预览区为无画面空占位 */
  hasStream: boolean;
}

const MOCK_VIDEO_POOL = (facilityId: string): MockVideoChannel[] => {
  const id = facilityId.replace(/\D/g, '').slice(-6) || '000001';
  const main = [1, 2, 3, 4, 5].map((n, i) => ({
    key: `v${n}`,
    name: `${n}#摄像头`,
    channelId: `CAM-${id}-${n}`,
    tone: VIDEO_TONES[i % VIDEO_TONES.length],
    hasStream: true,
  }));
  const empty: MockVideoChannel[] = [
    {
      key: 'v6',
      name: '备用通道（空占位）',
      channelId: `CAM-${id}-6`,
      tone: 'blue',
      hasStream: false,
    },
    {
      key: 'v7',
      name: '未接入画面（空占位）',
      channelId: `CAM-${id}-7`,
      tone: 'green',
      hasStream: false,
    },
  ];
  return [...main, ...empty];
};

function getInitialLinkedVideoKeys(record: Record<string, unknown>, pool: MockVideoChannel[]): string[] {
  const raw = record.iotLinkedVideoKeys;
  if (Array.isArray(raw)) {
    const keys = (raw as unknown[]).filter((x): x is string => typeof x === 'string');
    return keys.filter((k) => pool.some((p) => p.key === k));
  }
  return pool.map((p) => p.key);
}

const VIDEO_SCENE_LABEL: Record<FacilityMonitoringScene, { toolbarHint: string }> = {
  pump: { toolbarHint: '泵站视频通道' },
  outlet: { toolbarHint: '排口视频通道' },
  plant: { toolbarHint: '厂区视频通道' },
};

const FacilityVideoPanel: React.FC<{
  record: Record<string, unknown>;
  scene: FacilityMonitoringScene;
}> = ({ record, scene }) => {
  const nodeId = String(record.id ?? '');
  const sceneHint = VIDEO_SCENE_LABEL[scene];

  const allChannels = useMemo(() => MOCK_VIDEO_POOL(nodeId), [nodeId]);

  const [linkedKeys, setLinkedKeys] = useState<string[]>(() => getInitialLinkedVideoKeys(record, MOCK_VIDEO_POOL(nodeId)));
  const [selectedViewKeys, setSelectedViewKeys] = useState<string[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<{ keys: string[] }>();

  useEffect(() => {
    setLinkedKeys(getInitialLinkedVideoKeys(record, allChannels));
  }, [nodeId, allChannels]);

  const linkedChannels = useMemo(() => {
    const map = new Map(allChannels.map((c) => [c.key, c]));
    return linkedKeys.map((k) => map.get(k)).filter(Boolean) as MockVideoChannel[];
  }, [allChannels, linkedKeys]);

  useEffect(() => {
    setSelectedViewKeys((prev) => {
      const linkedSet = new Set(linkedChannels.map((c) => c.key));
      const kept = prev.filter((k) => linkedSet.has(k));
      if (kept.length > 0) return kept.slice(0, MAX_VIDEO_PREVIEW);
      return linkedChannels.slice(0, MAX_VIDEO_PREVIEW).map((c) => c.key);
    });
  }, [linkedChannels]);

  const filteredChannels = useMemo(() => {
    const kw = searchKeyword.trim().toLowerCase();
    if (!kw) return linkedChannels;
    return linkedChannels.filter(
      (c) => c.name.toLowerCase().includes(kw) || c.channelId.toLowerCase().includes(kw),
    );
  }, [linkedChannels, searchKeyword]);

  const treeData = useMemo<DataNode[]>(() => {
    const cameraNodes: DataNode[] = filteredChannels.map((c) => ({
      key: c.key,
      title: (
        <span
          className="facility-video-tree-node"
          title={`${normalizeCameraName(c.name)} ${c.channelId}`}
        >
          {normalizeCameraName(c.name)} {c.channelId}
        </span>
      ),
    }));
    return [
      {
        key: 'all',
        title: `全部摄像头（${filteredChannels.length}）`,
        selectable: false,
        children: cameraNodes,
      },
    ];
  }, [filteredChannels]);

  const selectedChannels = useMemo(() => {
    const map = new Map(linkedChannels.map((c) => [c.key, c]));
    return selectedViewKeys.map((k) => map.get(k)).filter(Boolean) as MockVideoChannel[];
  }, [linkedChannels, selectedViewKeys]);

  const previewSlots = useMemo(
    () => Array.from({ length: MAX_VIDEO_PREVIEW }, (_, idx) => selectedChannels[idx] ?? null),
    [selectedChannels],
  );

  const openModal = useCallback(() => {
    form.setFieldsValue({ keys: linkedKeys });
    setModalOpen(true);
  }, [form, linkedKeys]);

  const handleOk = useCallback(() => {
    form.validateFields().then((values) => {
      setLinkedKeys(values.keys ?? []);
      setModalOpen(false);
      message.success('视频监控关联已更新（原型仅本地状态，对接后写入台账/视频平台）');
    });
  }, [form]);

  const handleTreeCheck = useCallback((checked: Key[] | { checked: Key[] }) => {
    const checkedKeys = Array.isArray(checked) ? checked : checked.checked;
    const next = checkedKeys
      .map((k) => String(k))
      .filter((k) => k !== 'all')
      .slice(0, MAX_VIDEO_PREVIEW);
    if ((Array.isArray(checked) ? checked : checked.checked).length > MAX_VIDEO_PREVIEW) {
      message.warning(`最多勾选 ${MAX_VIDEO_PREVIEW} 路摄像头`);
    }
    setSelectedViewKeys(next);
  }, []);

  return (
    <div className="facility-video-tab-root">
      <div className="facility-video-section">
        {linkedChannels.length === 0 ? (
          <Empty
            className="facility-video-empty"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span>
                尚未关联视频监控通道。请点击「关联视频设备」从平台清单中多选绑定，
                <br />
                保存后展示各路预览占位；支持随时增删、修改关联。
              </span>
            }
          />
        ) : (
          <div className="facility-video-layout">
            <aside className="facility-video-tree-panel">
              <div className="facility-video-tree-panel__search">
                <Input.Search
                  placeholder="搜索摄像头名称/通道编码"
                  allowClear
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
              </div>
              <div className="facility-video-tree-panel__hint">
                最多勾选 {MAX_VIDEO_PREVIEW} 路用于右侧预览
              </div>
              <div className="facility-video-tree-panel__tree">
                <Tree
                  checkable
                  defaultExpandAll
                  checkedKeys={selectedViewKeys}
                  onCheck={handleTreeCheck}
                  treeData={treeData}
                />
              </div>
            </aside>
            <div className="facility-video-preview-grid">
              {previewSlots.map((ch, idx) => (
                <div key={ch?.key ?? `empty-${idx}`} className="facility-video-card">
                  <div
                    className={`facility-video-placeholder ${ch?.hasStream === false || !ch ? 'facility-video-placeholder--empty' : ''}`}
                    title={ch ? normalizeCameraName(ch.name) : `预览窗口 ${idx + 1}`}
                  >
                    <PlayCircleOutlined className="facility-video-placeholder-ico" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {linkedChannels.length === 0 ? (
        <Alert
          type="info"
          showIcon
          message="完成视频通道关联后，将展示各路预览画面（当前为占位，无实时流）。"
          className="facility-video-alert"
        />
      ) : null}

      <div className="facility-video-toolbar">
        <Space align="center" wrap style={{ width: '100%', justifyContent: 'space-between' }}>
          <Text type="secondary">
            已关联 <Text strong>{linkedChannels.length}</Text> 路{sceneHint.toolbarHint}；非全部设施默认接入，可自行配置。
          </Text>
          <Button type="primary" icon={<VideoCameraOutlined />} onClick={openModal}>
            关联视频设备
          </Button>
        </Space>
      </div>

      <Modal
        title="关联视频设备"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleOk}
        width={520}
        destroyOnClose
        okText="保存"
        cancelText="取消"
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          从视频云平台 / 物联网平台已入网通道清单中勾选与本设施绑定的摄像头；支持多选，保存后仅展示已关联路数。可随时再次打开本窗口增删或调整。
        </Text>
        <Form form={form} layout="vertical">
          <Form.Item name="keys" label="视频通道">
            <Checkbox.Group style={{ width: '100%' }}>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {allChannels.map((c) => (
                  <Checkbox key={c.key} value={c.key}>
                    <span>
                      <Text strong>{c.name}</Text>
                      <Text type="secondary" style={{ marginLeft: 8 }}>
                        {c.channelId}
                      </Text>
                    </span>
                  </Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export const PumpStationVideoTabContent: React.FC<{ record: Record<string, unknown> }> = ({ record }) => (
  <FacilityVideoPanel record={record} scene="pump" />
);

export const OutletVideoTabContent: React.FC<{ record: Record<string, unknown> }> = ({ record }) => (
  <FacilityVideoPanel record={record} scene="outlet" />
);

export const PlantVideoTabContent: React.FC<{ record: Record<string, unknown> }> = ({ record }) => (
  <FacilityVideoPanel record={record} scene="plant" />
);
