/**
 * 设施地址 / 地理位置 + WGS84 经纬：与「生态整治 · 项目档案」建设地点地图同源（EmergencyEventFormMap + 逆地理）
 */
import React from 'react';
import { Form, Typography } from 'antd';
import type { FormInstance } from 'antd/es/form';
import { EmergencyEventFormMap } from '../应急协同/emergencyEventFormMap';
import { EmergencyEventDetailMap } from '../应急协同/emergencyEventDetailMap';

const { Text } = Typography;

function watchCoordString(form: FormInstance, name: string): string {
  const v = Form.useWatch(name, form);
  if (v == null || v === '') return '';
  return String(v).trim();
}

export type AddrWgs84MapPickerProps = {
  form: FormInstance;
  /** 详细地址/位置描述字段名 */
  addrField: string;
  /** 经度（度）字段名 */
  lngField: string;
  /** 纬度（度）字段名 */
  latField: string;
  mapAriaLabel: string;
  /** 地图说明与逆地理写入目标的中文名，如「设施地址」「水库所在位置」 */
  hintAddressLabel: string;
  /** InputNumber 等数值控件用 number；普通 Input 用 string */
  lngLatValueMode?: 'number' | 'string';
};

/** 与项目档案建设地点一致的表单项辅助说明 */
export const ADDR_MAP_FORM_ITEM_EXTRA = (
  <Text type="secondary" style={{ fontSize: 12 }}>
    可点击地图选点，系统将尝试按坐标逆地理解析并自动填入；也可随时在本框手动输入或修改。
  </Text>
);

export const ADDR_MAP_INPUT_PLACEHOLDER = '地图选点自动解析，或手动输入';

/** 地图 POI 经纬度（与 AddrWgs84MapPicker、所在位置联动） */
export const ADDR_MAP_POI_COORD_TOOLTIP = '可与地图选点联动';

/** 水利工程台账：轴线起点终点、矩形角点等与地图 POI 无关，独立填报 */
export const ADDR_MAP_INDEP_GEOM_COORD_TOOLTIP = '轴线或范围角点坐标独立填报，与地图 POI 无联动';

function parseLngLatForForm(mode: 'number' | 'string', s: string): number | string | undefined {
  const t = s.trim();
  if (!t) return undefined;
  if (mode === 'string') return t;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

export const AddrWgs84MapPicker: React.FC<AddrWgs84MapPickerProps> = ({
  form,
  addrField,
  lngField,
  latField,
  mapAriaLabel,
  hintAddressLabel,
  lngLatValueMode = 'number',
}) => {
  const lngS = watchCoordString(form, lngField);
  const latS = watchCoordString(form, latField);
  const addrS = watchCoordString(form, addrField);
  const mapToolbarHint = `在地图上轻点选点或拖动图钉；在可覆盖前提下将尝试在线逆地理为具体地址并填入「${hintAddressLabel}」（需联网）。失败时使用不含坐标的中文示意门牌占位，请改为实际地址。若${hintAddressLabel}为手工录入，点选后只更新经纬度，不覆盖文字。`;
  return (
    <EmergencyEventFormMap
      longitude={lngS}
      latitude={latS}
      location={addrS}
      reverseGeocodeLocation
      mapAriaLabel={mapAriaLabel}
      mapToolbarHint={mapToolbarHint}
      onFormSync={patch => {
        const next: Record<string, unknown> = {};
        if (patch.longitude !== undefined) {
          next[lngField] = parseLngLatForForm(lngLatValueMode, patch.longitude);
        }
        if (patch.latitude !== undefined) {
          next[latField] = parseLngLatForForm(lngLatValueMode, patch.latitude);
        }
        if (patch.location !== undefined) {
          next[addrField] = patch.location;
        }
        form.setFieldsValue(next);
      }}
    />
  );
};

/** 详情只读：与编辑同源底图，展示单点位置（无坐标时占位说明） */
export type AddrWgs84DetailMapProps = {
  title: string;
  location?: string;
  lng?: string | number | null;
  lat?: string | number | null;
  mapAriaLabel?: string;
};

export const AddrWgs84DetailMap: React.FC<AddrWgs84DetailMapProps> = ({ title, location, lng, lat, mapAriaLabel }) => {
  const longitude = lng != null && lng !== '' ? String(lng).trim() : '';
  const latitude = lat != null && lat !== '' ? String(lat).trim() : '';
  return (
    <EmergencyEventDetailMap
      longitude={longitude}
      latitude={latitude}
      eventTitle={title}
      location={location}
      mapAriaLabel={mapAriaLabel}
    />
  );
};
