/**
 * 污水厂新增/编辑 · Tab「关键处理设施」：清单表格 + 底图总览上直接单击选点（无二次弹窗地图）
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Button, Card, Form, Input, InputNumber, Space, Table, Typography, message } from 'antd';
import type { FormInstance } from 'antd/es/form';
import { AimOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { LinkedOutletsWgs84DetailMap } from '../shared/linkedOutletsWgs84DetailMap';
import type { PlantKeyFacilityItem } from './facility-points-data';

const { Text } = Typography;

function num(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export const PlantKeyFacilitiesFormSection: React.FC<{ form: FormInstance }> = ({ form }) => {
  const cx = num(Form.useWatch('x', form));
  const cy = num(Form.useWatch('y', form));
  const list = Form.useWatch('关键处理设施列表', form) as PlantKeyFacilityItem[] | undefined;
  /** 当前在底图上单击要更新经纬度的行下标；null 表示仅浏览 */
  const [activePickRowIndex, setActivePickRowIndex] = useState<number | null>(null);

  const listLen = Array.isArray(list) ? list.length : 0;
  useEffect(() => {
    setActivePickRowIndex(prev => (prev != null && prev >= listLen ? null : prev));
  }, [listLen]);

  const mapPoints = useMemo(() => {
    const rows = Array.isArray(list) ? list : [];
    return rows
      .map((r, i) => {
        const lng = num(r?.lng);
        const lat = num(r?.lat);
        if (lng == null || lat == null) return null;
        const title = String(r?.name ?? '').trim() || `设施${i + 1}`;
        const subtitle = String(r?.functionDesc ?? '').trim() || '—';
        return { lng, lat, title, subtitle };
      })
      .filter(Boolean) as { lng: number; lat: number; title: string; subtitle: string }[];
  }, [list]);

  const onMapPick = useCallback(
    (rowIndex: number, lng: number, lat: number) => {
      const rows = [...((form.getFieldValue('关键处理设施列表') as PlantKeyFacilityItem[] | undefined) ?? [])];
      if (!rows[rowIndex]) return;
      rows[rowIndex] = { ...rows[rowIndex], lng, lat };
      form.setFieldsValue({ 关键处理设施列表: rows });
      const nm = String(rows[rowIndex]?.name ?? '').trim();
      message.success(nm ? `已更新「${nm}」坐标` : '已更新该设施坐标');
    },
    [form],
  );

  const interactivePick =
    activePickRowIndex != null &&
    activePickRowIndex >= 0 &&
    activePickRowIndex < (Array.isArray(list) ? list.length : 0)
      ? { rowIndex: activePickRowIndex, onPick: onMapPick }
      : null;

  const togglePickRow = (fieldIndex: number) => {
    setActivePickRowIndex(prev => (prev === fieldIndex ? null : fieldIndex));
  };

  return (
    <>
      <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
        在表格中维护设施名称与功能说明；经纬度可手填。需要地图定点时：先点某行「在图上定点」，再<strong>在下方地图任意处单击</strong>将该行经纬度更新为落点（当前行圆点为橙色）；再次点击同一按钮可取消定点。
      </Text>
      <Form.List name="关键处理设施列表">
        {(fields, { add, remove }) => (
          <>
            <Table
              size="small"
              pagination={false}
              rowKey="key"
              dataSource={fields}
              scroll={{ x: 920 }}
              columns={[
                {
                  title: '设施名称',
                  key: 'name',
                  width: 140,
                  render: (_, field) => (
                    <Form.Item name={[field.name, 'name']} rules={[{ required: true, message: '必填' }]} noStyle>
                      <Input placeholder="如：粗格栅" />
                    </Form.Item>
                  ),
                },
                {
                  title: '功能说明',
                  key: 'functionDesc',
                  width: 220,
                  render: (_, field) => (
                    <Form.Item name={[field.name, 'functionDesc']} noStyle>
                      <Input placeholder="规格、工艺段、容积等" />
                    </Form.Item>
                  ),
                },
                {
                  title: '地图定点',
                  key: 'mapPick',
                  width: 108,
                  render: (_, field) => {
                    const on = activePickRowIndex === field.name;
                    return (
                      <Button
                        type={on ? 'primary' : 'link'}
                        size="small"
                        icon={<AimOutlined />}
                        onClick={() => togglePickRow(field.name as number)}
                      >
                        {on ? '取消定点' : '在图上定点'}
                      </Button>
                    );
                  },
                },
                {
                  title: '经度',
                  key: 'lng',
                  width: 118,
                  render: (_, field) => (
                    <Form.Item name={[field.name, 'lng']} rules={[{ required: true }]} noStyle>
                      <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="度" />
                    </Form.Item>
                  ),
                },
                {
                  title: '纬度',
                  key: 'lat',
                  width: 118,
                  render: (_, field) => (
                    <Form.Item name={[field.name, 'lat']} rules={[{ required: true }]} noStyle>
                      <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="度" />
                    </Form.Item>
                  ),
                },
                {
                  title: '操作',
                  key: 'op',
                  width: 72,
                  render: (_, field) => (
                    <Button
                      type="link"
                      danger
                      icon={<MinusCircleOutlined />}
                      onClick={() => {
                        remove(field.name);
                        setActivePickRowIndex(prev => (prev === field.name ? null : prev));
                      }}
                    >
                      删除
                    </Button>
                  ),
                },
              ]}
            />
            <Space style={{ marginTop: 8 }}>
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => {
                  const baseLng = cx ?? 112.528;
                  const baseLat = cy ?? 27.908;
                  add({
                    id: `kf-${Date.now()}`,
                    name: '',
                    functionDesc: '',
                    lng: baseLng + 0.0002,
                    lat: baseLat + 0.0001,
                  });
                }}
              >
                添加设施
              </Button>
            </Space>
          </>
        )}
      </Form.List>
      <Card
        size="small"
        title={activePickRowIndex != null ? '关键设施位置（定点模式：单击地图更新橙色设施坐标）' : '关键设施位置总览'}
        style={{ marginTop: 16 }}
      >
        <LinkedOutletsWgs84DetailMap
          points={mapPoints}
          mapAriaLabel="污水处理厂关键处理设施位置地图"
          interactivePick={interactivePick}
        />
      </Card>
    </>
  );
};
