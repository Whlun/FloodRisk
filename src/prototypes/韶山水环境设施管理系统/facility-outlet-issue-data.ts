/**
 * 设施管理 · 排口管理 · 问题列表共享数据
 * 供「问题列表」「入河排口核查详情」「责任主体详情」复用同一来源。
 */

export type IssueStatus = '待整治' | '待验收' | '待审核' | '已整治';
export type IssuePriority = '紧急' | '普通';
export type RectifyStatus = '待整改' | '已完成' | '终止';

export type OutletIssueRecord = {
  id: string;
  行政区划: string;
  关联排口编码: string;
  关联排口名称: string;
  责任主体: string;
  整改优先级: IssuePriority;
  状态: IssueStatus;
  问题类型: string[];
  整改建议?: string;
  整改状态?: RectifyStatus;
  整改完成时间?: string;
  整改负责人?: string;
  联系电话?: string;
  整改描述?: string;
  整改媒体文件?: string[];
  整改附件?: string[];
  媒体文件: string[];
  上报人: string;
  上报时间: string;
};

export const outletIssueInitial: OutletIssueRecord[] = [
  {
    id: 'WT-202604280001',
    行政区划: '430382101000',
    关联排口编码: 'AH43038226040101',
    关联排口名称: '清溪镇韶河路北雨洪排口',
    责任主体: '韶山市清溪镇人民政府',
    整改优先级: '紧急',
    状态: '待整治',
    问题类型: ['雨洪排口晴天排水', '排污口未设置标识牌'],
    整改建议: '增设排口标识牌，并排查晴天排水原因后限期整改。',
    整改状态: '待整改',
    整改完成时间: '',
    整改负责人: '李工',
    联系电话: '13800001111',
    整改描述: '已安排现场核查并制定临时截污方案，计划一周内完成。',
    整改媒体文件: ['整改现场图1.jpg'],
    整改附件: ['整改方案.docx'],
    媒体文件: ['问题现场1.jpg', '问题现场2.jpg'],
    上报人: '王小明',
    上报时间: '2026-04-28 09:30:00',
  },
];
