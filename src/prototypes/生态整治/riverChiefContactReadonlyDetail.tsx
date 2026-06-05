/**
 * 河长通讯录 · 联系人详情 · 与 `index.tsx` 中 `RiverChiefContactsPage` 详情弹窗 1:1
 */
import React from 'react';
import { Descriptions, Tag, Typography } from 'antd';
import {
  CONTACT_ROLE_LABEL,
  getShaoshanAddvcdLabel,
  USER_TYPE_LABEL,
  type ContactRoleCategory,
  type RiverChiefContactRow,
} from './riverChiefDb4401';

const { Text } = Typography;

const CONTACT_ROLE_TAG_COLOR: Record<ContactRoleCategory, string> = {
  chief: 'blue',
  custodian: 'green',
  department: 'orange',
};

export type RiverChiefContactReadonlyDetailContentProps = { detail: RiverChiefContactRow };

export function RiverChiefContactReadonlyDetailContent({ detail }: RiverChiefContactReadonlyDetailContentProps) {
  return (
    <Descriptions bordered column={2} size="small" style={{ marginTop: 8 }}>
      <Descriptions.Item label="姓名" span={2}>
        <Text strong>{detail.name}</Text>
      </Descriptions.Item>
      <Descriptions.Item label="用户编号" span={2}>
        {detail.userId ?? '—'}
      </Descriptions.Item>
      <Descriptions.Item label="所属区划" span={2}>
        {detail.addvcd ? getShaoshanAddvcdLabel(detail.addvcd) : '—'}
      </Descriptions.Item>
      <Descriptions.Item label="人员类型">
        <Tag color={CONTACT_ROLE_TAG_COLOR[detail.roleCategory]}>{CONTACT_ROLE_LABEL[detail.roleCategory]}</Tag>
      </Descriptions.Item>
      <Descriptions.Item label="河长级别">
        {detail.userType != null ? USER_TYPE_LABEL[detail.userType] : '—'}
      </Descriptions.Item>
      <Descriptions.Item label="责任区域" span={2}>
        {detail.areaName}
      </Descriptions.Item>
      <Descriptions.Item label="部门类型">{detail.deptType}</Descriptions.Item>
      <Descriptions.Item label="职务">{detail.title}</Descriptions.Item>
      <Descriptions.Item label="单位" span={2}>
        {detail.orgName}
      </Descriptions.Item>
      <Descriptions.Item label="手机">
        <Text copyable={{ text: detail.mobile, tooltips: ['点击复制手机号', '已复制'] }}>{detail.mobile}</Text>
      </Descriptions.Item>
      <Descriptions.Item label="固话">{detail.tel}</Descriptions.Item>
      <Descriptions.Item label="关联河段编码" span={2}>
        {detail.sectionId ?? '—'}
      </Descriptions.Item>
      <Descriptions.Item label="电子邮箱" span={2}>
        {detail.email ?? '—'}
      </Descriptions.Item>
      <Descriptions.Item label="办公地址" span={2}>
        {detail.officeAddr ?? '—'}
      </Descriptions.Item>
      <Descriptions.Item label="备注" span={2}>
        {detail.remarks ?? '—'}
      </Descriptions.Item>
    </Descriptions>
  );
}
